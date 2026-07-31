const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

// Session length is controlled by the refresh token: 24h by default, 30d when
// the user checked "Remember Me" at login. The short-lived access token above
// is silently renewed off this one (see Frontend/src/api/axios.js), so once
// the refresh token itself expires the user is forced back to /login.
const signRefreshToken = (id, rememberMe) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: rememberMe
      ? process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER || '30d'
      : process.env.JWT_REFRESH_EXPIRES_IN || '24h',
  });

const sendTokens = async (user, statusCode, res, rememberMe = user.rememberMe || false) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id, rememberMe);

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

  const user = await User.findById(decoded.id).select('+refreshToken +rememberMe');
  if (!user || user.refreshToken !== refreshToken) {
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
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.correctPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }
  user.password = newPassword;
  await user.save();
  await sendTokens(user, 200, res);
});
