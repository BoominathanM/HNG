const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new AppError('Not authenticated. Please log in.', 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return next(new AppError('User no longer exists.', 401));
  if (user.status === 'Inactive') return next(new AppError('Account is inactive.', 403));

  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

exports.checkPermission = (module, action) => (req, res, next) => {
  const perms = req.user.permissions || {};
  const modulePerm = perms[module];
  if (!modulePerm || !modulePerm[action]) {
    return next(new AppError(`Access denied: ${action} on ${module}`, 403));
  }
  next();
};
