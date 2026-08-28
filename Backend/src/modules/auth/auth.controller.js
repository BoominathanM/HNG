const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

// Session length: 24h by default, 30d when the user checked "Remember Me" at
// login. This is a SLIDING window — Frontend/src/api/axios.js proactively
// refreshes the access token in the background a few minutes before it expires
// (and again on tab-focus if it was throttled while backgrounded), so an
// actively-open tab keeps rotating both tokens and never actually hits the
// wall. The window only lapses for real once the tab has been closed/idle
// (no refresh call made) for the full duration.
const DURATION_UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };
const parseDurationSeconds = (str, fallbackSeconds) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(String(str || '').trim());
  return match ? Number(match[1]) * DURATION_UNIT_SECONDS[match[2]] : fallbackSeconds;
};

const sessionTTLSeconds = (rememberMe) =>
  rememberMe
    ? parseDurationSeconds(process.env.JWT_EXPIRES_IN_REMEMBER, 30 * 86400)
    : parseDurationSeconds(process.env.JWT_EXPIRES_IN, 24 * 3600);

// The refresh token must outlive the access token, otherwise a proactive
// refresh that fires slightly late (background-tab timer throttling, a slow
// network) races its own expiry and fails, forcing an unwanted logout even
// though the tab was open and active the whole time.
const REFRESH_TOKEN_BUFFER_SECONDS = 15 * 60;

const createSessionId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

const signToken = (id, rememberMe, sessionId) =>
  jwt.sign({ id, sid: sessionId }, process.env.JWT_SECRET, { expiresIn: sessionTTLSeconds(rememberMe) });

// rememberMe travels inside the refresh token itself so /auth/refresh can mint
// a new pair from the verified JWT alone, with no DB read before the write —
// that read-then-write gap was the other half of the lost-update race below.
const signRefreshToken = (id, rememberMe, sessionId) =>
  jwt.sign({ id, rememberMe, sid: sessionId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: sessionTTLSeconds(rememberMe) + REFRESH_TOKEN_BUFFER_SECONDS,
  });

const REFRESH_GRACE_MS = 15 * 1000;

const refreshTokenTTLSeconds = (rememberMe) => sessionTTLSeconds(rememberMe) + REFRESH_TOKEN_BUFFER_SECONDS;

const serializeUser = (user) => {
  const userObj = user.toObject({ flattenMaps: true });
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.previousRefreshToken;
  delete userObj.previousRefreshTokenExpires;
  delete userObj.refreshSessions;
  return userObj;
};

const sendTokens = async (user, statusCode, res, rememberMe = user.rememberMe || false, existingSessionId = null) => {
  const sessionId = existingSessionId || createSessionId();
  const token = signToken(user._id, rememberMe, sessionId);
  const refreshToken = signRefreshToken(user._id, rememberMe, sessionId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + refreshTokenTTLSeconds(rememberMe) * 1000);

  // Keep the just-superseded refresh token valid for a short grace window. Each
  // browser tab dedupes its own concurrent 401s (see Frontend/src/api/axios.js)
  // but has no visibility into other tabs, so two tabs 401-ing around the same
  // moment can both call /auth/refresh with the same (still-current) token —
  // the loser would otherwise be hard-rejected and force-logged-out for simply
  // losing a race, not because its session was actually invalid.
  const legacyUpdate = { refreshToken, rememberMe };
  if (user.refreshToken) {
    legacyUpdate.previousRefreshToken = user.refreshToken;
    legacyUpdate.previousRefreshTokenExpires = new Date(Date.now() + REFRESH_GRACE_MS);
  }
  // findByIdAndUpdate instead of user.save(): an atomic write, not a
  // read-then-write on the in-memory `user` doc, so this can't lose an update
  // to a concurrent write on the same document (see exports.refresh for the
  // case that actually races: two /auth/refresh calls at once).
  await User.updateOne(
    { _id: user._id },
    {
      $pull: {
        refreshSessions: {
          $or: [
            { sid: sessionId },
            { expiresAt: { $lte: now } },
          ],
        },
      },
    }
  );
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: legacyUpdate,
      $push: {
        refreshSessions: {
          sid: sessionId,
          refreshToken,
          rememberMe,
          expiresAt,
          createdAt: now,
          lastUsedAt: now,
        },
      },
    },
    { runValidators: false }
  );

  // flattenMaps: true converts Mongoose Map fields (permissions, tabAccess) to plain JS objects
  // so they serialize correctly in JSON (without it, Maps become "{}")
  const userObj = serializeUser(user);

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    data: { user: userObj },
  });
};

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email, deletedAt: null }).select('+password');
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  if (user.status === 'Inactive') return next(new AppError('Your account is inactive. Contact admin.', 403));

  await sendTokens(user, 200, res, !!rememberMe);
});

// This used to be: read the user, decide in JS whether `refreshToken` is
// current, then save() a rotated token. That read-then-write gap is a classic
// lost-update race — when two requests (two open tabs, or a proactive refresh
// racing a reactive 401-triggered one) present the same still-current token at
// nearly the same instant, BOTH reads see it as current, BOTH mint a fresh
// pair and get a 200, but only one save() actually persists. The other tab
// walks away holding tokens that were never written to the DB, and the next
// time IT tries to refresh, the token matches neither the current nor the
// previous slot, so it gets hard-rejected and force-logged-out — even though
// that tab was open and active the whole time. That's the exact "logout while
// actively clicking/navigating, never while idle" symptom this fixed.
//
// The fix: make the rotation itself the atomicity boundary via a single
// compare-and-swap write (findOneAndUpdate filtered on the CURRENT
// refreshToken value). MongoDB serializes concurrent writes to one document,
// so of two requests presenting the same current token, exactly one matches
// and rotates; the other's filter is stale by the time its write runs and
// simply fails to match — a clean "no-op", not a lost update. The loser then
// falls back to a read-only check against the (now up-to-date)
// previousRefreshToken grace slot and, if it lands within the grace window,
// is handed the SAME token pair the winner already established — never a
// second independent rotation, which is what would clobber the winner's pair.
exports.refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('Refresh token required', 400));

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const rememberMe = !!decoded.rememberMe;
  const sessionId = decoded.sid || null;
  const newToken = signToken(decoded.id, rememberMe, sessionId);
  const newRefreshToken = signRefreshToken(decoded.id, rememberMe, sessionId);
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + refreshTokenTTLSeconds(rememberMe) * 1000);

  if (sessionId) {
    await User.updateOne(
      { _id: decoded.id },
      { $pull: { refreshSessions: { expiresAt: { $lte: now } } } }
    );

    const rotatedSession = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        refreshSessions: {
          $elemMatch: {
            sid: sessionId,
            refreshToken,
            expiresAt: { $gt: now },
          },
        },
      },
      {
        $set: {
          'refreshSessions.$.refreshToken': newRefreshToken,
          'refreshSessions.$.previousRefreshToken': refreshToken,
          'refreshSessions.$.previousRefreshTokenExpires': new Date(Date.now() + REFRESH_GRACE_MS),
          'refreshSessions.$.rememberMe': rememberMe,
          'refreshSessions.$.expiresAt': sessionExpiresAt,
          'refreshSessions.$.lastUsedAt': now,
          refreshToken: newRefreshToken,
          rememberMe,
        },
      },
      { new: true }
    );

    if (rotatedSession) {
      return res.status(200).json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        data: { user: serializeUser(rotatedSession) },
      });
    }

    const current = await User.findById(decoded.id).select('+refreshSessions');
    const currentSession = current?.refreshSessions?.find((session) => session.sid === sessionId);
    const isRecentlyRotated =
      currentSession &&
      currentSession.previousRefreshToken === refreshToken &&
      currentSession.previousRefreshTokenExpires &&
      currentSession.previousRefreshTokenExpires > new Date() &&
      currentSession.expiresAt > new Date();

    if (!isRecentlyRotated) {
      return next(new AppError('Invalid refresh token', 401));
    }

    return res.status(200).json({
      success: true,
      token: signToken(current._id, currentSession.rememberMe, sessionId),
      refreshToken: currentSession.refreshToken,
      data: { user: serializeUser(current) },
    });
  }

  const rotated = await User.findOneAndUpdate(
    { _id: decoded.id, refreshToken },
    {
      $set: {
        refreshToken: newRefreshToken,
        previousRefreshToken: refreshToken,
        previousRefreshTokenExpires: new Date(Date.now() + REFRESH_GRACE_MS),
        rememberMe,
      },
    },
    { new: true }
  );

  if (rotated) {
    const userObj = rotated.toObject({ flattenMaps: true });
    delete userObj.password;
    delete userObj.refreshToken;
    return res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      data: { user: userObj },
    });
  }

  // Lost the CAS above — someone else just rotated this exact token (the CAS
  // filter already proved `refreshToken` wasn't current at write time). If
  // we're still inside that rotation's grace window, hand back the pair it
  // already established (a read, not another rotation) instead of
  // hard-rejecting a session that is, in fact, still perfectly valid.
  const current = await User.findById(decoded.id)
    .select('+refreshToken +rememberMe +previousRefreshToken +previousRefreshTokenExpires');

  const isRecentlyRotated =
    current &&
    current.previousRefreshToken === refreshToken &&
    current.previousRefreshTokenExpires && current.previousRefreshTokenExpires > new Date();

  if (!isRecentlyRotated) {
    return next(new AppError('Invalid refresh token', 401));
  }

  const userObj = current.toObject({ flattenMaps: true });
  delete userObj.password;
  delete userObj.refreshToken;
  res.status(200).json({
    success: true,
    token: signToken(current._id, current.rememberMe),
    refreshToken: current.refreshToken,
    data: { user: userObj },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.sessionId) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshSessions: { sid: req.sessionId } },
    });
  } else {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const userObj = user.toObject({ flattenMaps: true });
  delete userObj.password;
  delete userObj.refreshToken;
  res.status(200).json({ success: true, data: { user: userObj } });
});

exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password +rememberMe');
  if (!(await user.correctPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }
  user.password = newPassword;
  await user.save();
  await sendTokens(user, 200, res, user.rememberMe, req.sessionId);
});
