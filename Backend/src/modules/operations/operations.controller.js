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
  const orders = await Order.find(filter)
    .populate('assignedTo', 'fullName')
    .populate('items.itemId', 'sellingPrice hsnCode discountPercent packingMaterial materialCategory brand currentStock defaultSize')
    .populate('leadId', 'paymentProofs orderDeliveryDate')
    .sort('-createdAt');
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
  // Whitelist the operations workflow fields the UI updates (previously only `status` persisted)
  const allowed = ['status', 'printingStatus', 'designStatus', 'stockStatus', 'operationStage', 'taskStatus', 'isUrgent', 'isEmergency', 'deliveryType'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    update,
    { new: true, runValidators: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  // When printing status is Closed, signal the client to redirect to task assignment
  const redirectToTasks = req.body.printingStatus === 'Closed';
  res.status(200).json({ success: true, data: order, redirectToTasks });
});

// Save approved packaging design for a hotel (reuse in future orders)
exports.getHotelDesigns = asyncHandler(async (req, res) => {
  const HotelDesign = require('../../models/HotelDesign');
  const filter = {};
  if (req.query.hotelName) filter.hotelName = req.query.hotelName;
  if (req.query.type) filter.type = req.query.type;
  const designs = await HotelDesign.find(filter).sort('-createdAt');
  res.status(200).json({ success: true, data: designs });
});

exports.saveHotelDesign = asyncHandler(async (req, res) => {
  const HotelDesign = require('../../models/HotelDesign');
  const design = await HotelDesign.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: design });
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

// Per-product task fan-out: create one task per order line item in a single call.
exports.assignTasksPerProduct = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  const baseType = req.body.taskType || 'Production';
  const tasks = [];
  for (let i = 0; i < (order.items || []).length; i++) {
    const it = order.items[i];
    const taskCode = await generateCode('TASK');
    tasks.push(await Task.create({
      taskCode,
      orderId: order._id,
      taskType: baseType,
      taskName: `${baseType} — ${it.itemName}`,
      product: it.itemName,
      productIndex: i,
      qty: it.qty,
      clientName: order.clientName,
      status: 'Pending',
      createdBy: req.user._id,
    }));
  }
  res.status(201).json({ success: true, total: tasks.length, data: tasks });
});

// Mark / unmark an order as emergency (top-of-list priority in Operations).
exports.setOrderEmergency = asyncHandler(async (req, res, next) => {
  const isEmergency = req.body.isEmergency !== false && req.body.isEmergency !== 'false';
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { isEmergency, isUrgent: isEmergency },
    { new: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// Partial-delivery split: record a partial qty now; the balance becomes a follow-on entry (same order ID).
exports.splitPartialDelivery = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  const totalQty = order.qty || (order.items || []).reduce((s, it) => s + (it.qty || 0), 0);
  const partialQty = Number(req.body.partialQty) || 0;
  const alreadyDone = (order.partialDeliveries || []).reduce((s, p) => s + (p.qty || 0), 0);
  const balanceQty = Math.max(0, totalQty - alreadyDone - partialQty);
  order.deliveryType = 'Partial';
  order.partialQty = partialQty;
  order.balanceQty = balanceQty;
  order.partialDeliveries = order.partialDeliveries || [];
  order.partialDeliveries.push({ qty: partialQty, balanceQty, note: req.body.note, status: 'Pending' });
  await order.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: order });
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
    { designFileUrl: req.file.path },
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

// Dual approval: sales person and operations head must both approve before printing.
// When both are in, status auto-advances to 'Approved'.
exports.approveStickerRequest = asyncHandler(async (req, res, next) => {
  const sticker = await StickerRequest.findById(req.params.id);
  if (!sticker) return next(new AppError('Sticker request not found', 404));
  const role = req.body.role; // 'sales' | 'opsHead'
  if (role === 'sales') sticker.salesApproved = true;
  else if (role === 'opsHead') sticker.opsHeadApproved = true;
  else { sticker.salesApproved = true; sticker.opsHeadApproved = true; } // both (e.g. admin)
  if (sticker.salesApproved && sticker.opsHeadApproved) sticker.status = 'Approved';
  else sticker.status = 'Waiting for Approval';
  await sticker.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: sticker });
});
