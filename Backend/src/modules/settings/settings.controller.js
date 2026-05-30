const User = require('../../models/User');
const CompanySettings = require('../../models/CompanySettings');
const Party = require('../../models/Party');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');

// ─── Company Settings ───────────────────────────────────────────────────────
exports.getCompanySettings = asyncHandler(async (req, res) => {
  let settings = await CompanySettings.findOne();
  if (!settings) settings = await CompanySettings.create({});
  res.status(200).json({ success: true, data: settings });
});

exports.updateCompanySettings = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOneAndUpdate(
    {},
    { ...req.body, updatedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(200).json({ success: true, data: settings });
});

exports.uploadLogo = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a file', 400));
  const logoUrl = `/uploads/${req.file.filename}`;
  const settings = await CompanySettings.findOneAndUpdate(
    {},
    { logoUrl },
    { new: true, upsert: true }
  );
  res.status(200).json({ success: true, logoUrl, data: settings });
});

// ─── User Management ────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ deletedAt: null }).sort('-createdAt');
  res.status(200).json({ success: true, total: users.length, data: users });
});

exports.createUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, mobile, department, role, status, password, permissions, ...targets } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('Email already in use', 400));

  const user = await User.create({
    fullName, email, mobile, department, role,
    status: status || 'Active',
    password,
    permissions,
    ...targets,
    createdBy: req.user._id,
  });
  const out = user.toObject();
  delete out.password;
  res.status(201).json({ success: true, data: out });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const { password, ...rest } = req.body;
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));

  Object.assign(user, rest);
  if (password) user.password = password;
  await user.save();
  const out = user.toObject();
  delete out.password;
  res.status(200).json({ success: true, data: out });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));
  user.deletedAt = Date.now();
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'User deleted' });
});

exports.updatePermissions = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));
  const { permissions } = req.body;
  if (permissions) {
    Object.entries(permissions).forEach(([module, perm]) => {
      user.permissions.set(module, perm);
    });
  }
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: { permissions: Object.fromEntries(user.permissions) } });
});

// ─── Deleted Records ─────────────────────────────────────────────────────────
exports.getDeletedRecords = asyncHandler(async (req, res) => {
  const parties = await Party.find({ deletedAt: { $ne: null } }).select('name type phone deletedAt');
  res.status(200).json({ success: true, data: { parties } });
});

exports.restoreRecord = asyncHandler(async (req, res, next) => {
  const { type, id } = req.params;
  let doc;
  if (type === 'parties') doc = await Party.findById(id);
  if (!doc) return next(new AppError('Record not found', 404));
  doc.deletedAt = undefined;
  await doc.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Record restored successfully' });
});
