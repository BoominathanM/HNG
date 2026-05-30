const Order = require('../../models/Order');
const StickerRequest = require('../../models/StickerRequest');
const Task = require('../../models/Task');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

// ─── ORDER MANAGEMENT ─────────────────────────────────────────────────────────
exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter).populate('assignedTo', 'fullName').sort('-createdAt');
  res.status(200).json({ success: true, data: orders });
});

exports.getTodaysOrders = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const orders = await Order.find({ createdAt: { $gte: start, $lte: end }, deletedAt: null });
  res.status(200).json({ success: true, data: orders });
});

exports.getTodaysDispatch = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const orders = await Order.find({
    status: { $in: ['Dispatch Ready', 'Dispatched'] },
    updatedAt: { $gte: start, $lte: end },
    deletedAt: null,
  });
  res.status(200).json({ success: true, data: orders });
});

exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { status: req.body.status },
    { new: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
});

exports.assignTask = asyncHandler(async (req, res) => {
  const taskCode = await generateCode('TASK');
  const task = await Task.create({
    ...req.body,
    taskCode,
    orderId: req.params.id,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: task });
});

// ─── STICKER REQUESTS ─────────────────────────────────────────────────────────
exports.getStickerRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.stickerType = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const stickers = await StickerRequest.find(filter).populate('orderId', 'orderCode clientName').sort('-createdAt');
  res.status(200).json({ success: true, data: stickers });
});

exports.createStickerRequest = asyncHandler(async (req, res) => {
  const sticker = await StickerRequest.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: sticker });
});

exports.uploadStickerDesign = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a design file', 400));
  const sticker = await StickerRequest.findByIdAndUpdate(
    req.params.id,
    { designFileUrl: `/uploads/${req.file.filename}` },
    { new: true }
  );
  if (!sticker) return next(new AppError('Sticker request not found', 404));
  res.status(200).json({ success: true, data: sticker });
});

exports.updateStickerStatus = asyncHandler(async (req, res, next) => {
  const sticker = await StickerRequest.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, dispatchedToOps: req.body.dispatchedToOps },
    { new: true }
  );
  if (!sticker) return next(new AppError('Sticker request not found', 404));
  res.status(200).json({ success: true, data: sticker });
});

exports.sendToStickerTeam = asyncHandler(async (req, res) => {
  await StickerRequest.updateMany(
    { _id: { $in: req.body.ids } },
    { dispatchedToOps: true }
  );
  res.status(200).json({ success: true, message: 'Sent to sticker team' });
});
