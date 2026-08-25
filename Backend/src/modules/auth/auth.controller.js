const jwt = require('jsonwebtoken');
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

const signToken = (id, rememberMe) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: sessionTTLSeconds(rememberMe) });

const signRefreshToken = (id, rememberMe) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: sessionTTLSeconds(rememberMe) + REFRESH_TOKEN_BUFFER_SECONDS,
  });

const REFRESH_GRACE_MS = 15 * 1000;

const sendTokens = async (user, statusCode, res, rememberMe = user.rememberMe || false) => {
  const token = signToken(user._id, rememberMe);
  const refreshToken = signRefreshToken(user._id, rememberMe);

  // Keep the just-superseded refresh token valid for a short grace window. Each
  // browser tab dedupes its own concurrent 401s (see Frontend/src/api/axios.js)
  // but has no visibility into other tabs, so two tabs 401-ing around the same
  // moment can both call /auth/refresh with the same (still-current) token —
  // the loser would otherwise be hard-rejected and force-logged-out for simply
  // losing a race, not because its session was actually invalid.
  if (user.refreshToken) {
    user.previousRefreshToken = user.refreshToken;
    user.previousRefreshTokenExpires = new Date(Date.now() + REFRESH_GRACE_MS);
  }
  user.refreshToken = refreshToken;
  user.rememberMe = rememberMe;
  await user.save({ validateBeforeSave: false });

  // flattenMaps: true converts Mongoose Map fields (permissions, tabAccess) to plain JS objects
  // so they serialize correctly in JSON (without it, Maps become "{}")
  const userObj = user.toObject({ flattenMaps: true });
  delete userObj.password;
  delete userObj.refreshToken;

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

exports.refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('Refresh token required', 400));

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return next(new AppError('Invalid or expired refresh token', 401));
  }

  const user = await User.findById(decoded.id)
    .select('+refreshToken +rememberMe +previousRefreshToken +previousRefreshTokenExpires');

  const isCurrent = user && user.refreshToken === refreshToken;
  const isRecentlyRotated =
    user && !isCurrent &&
    user.previousRefreshToken === refreshToken &&
    user.previousRefreshTokenExpires && user.previousRefreshTokenExpires > new Date();

  if (!user || (!isCurrent && !isRecentlyRotated)) {
    return next(new AppError('Invalid refresh token', 401));
  }

  await sendTokens(user, 200, res, user.rememberMe);
});

exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
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
  await sendTokens(user, 200, res, user.rememberMe);
});
