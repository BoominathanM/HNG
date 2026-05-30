const Staff = require('../../models/Staff');
const ReimbursementClaim = require('../../models/ReimbursementClaim');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const upload = require('../../config/multer');

exports.getStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.find({ deletedAt: null }).sort('fullName');
  res.status(200).json({ success: true, total: staff.length, data: staff });
});

exports.getStaffMember = asyncHandler(async (req, res, next) => {
  const member = await Staff.findOne({ _id: req.params.id, deletedAt: null });
  if (!member) return next(new AppError('Staff not found', 404));
  res.status(200).json({ success: true, data: member });
});

exports.createStaff = asyncHandler(async (req, res) => {
  const staffCode = await generateCode('STAFF');
  const staff = await Staff.create({ ...req.body, staffCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: staff });
});

exports.updateStaff = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!staff) return next(new AppError('Staff not found', 404));
  res.status(200).json({ success: true, data: staff });
});

exports.deleteStaff = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOne({ _id: req.params.id, deletedAt: null });
  if (!staff) return next(new AppError('Staff not found', 404));
  staff.deletedAt = Date.now();
  await staff.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Staff deleted' });
});

exports.updateCredentials = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOne({ _id: req.params.id, deletedAt: null }).select('+loginPasswordHash');
  if (!staff) return next(new AppError('Staff not found', 404));
  if (req.body.password) {
    staff.loginPasswordHash = await bcrypt.hash(req.body.password, 12);
  }
  if (req.body.accessDescription !== undefined) staff.accessDescription = req.body.accessDescription;
  await staff.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Credentials updated' });
});

exports.toggleLogin = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { loginEnabled: req.body.loginEnabled },
    { new: true }
  );
  if (!staff) return next(new AppError('Staff not found', 404));
  res.status(200).json({ success: true, data: { loginEnabled: staff.loginEnabled } });
});

// ─── REIMBURSEMENT CLAIMS ─────────────────────────────────────────────────────
exports.getClaims = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.staffId) filter.staffId = req.query.staffId;
  if (req.query.status) filter.status = req.query.status;
  const claims = await ReimbursementClaim.find(filter).populate('staffId', 'fullName staffCode').sort('-createdAt');
  res.status(200).json({ success: true, data: claims });
});

exports.createClaim = asyncHandler(async (req, res) => {
  const claim = await ReimbursementClaim.create(req.body);
  res.status(201).json({ success: true, data: claim });
});

exports.updateClaimStatus = asyncHandler(async (req, res, next) => {
  const claim = await ReimbursementClaim.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, paidBy: req.body.paidBy, paidDate: req.body.status === 'Paid' ? Date.now() : undefined },
    { new: true }
  );
  if (!claim) return next(new AppError('Claim not found', 404));
  res.status(200).json({ success: true, data: claim });
});
