const Order = require('../../models/Order');
const StickerRequest = require('../../models/StickerRequest');
const Task = require('../../models/Task');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { computeTaskEstimate } = require('../../utils/taskTime');

// ─── ORDER MANAGEMENT ─────────────────────────────────────────────────────────
exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('assignedTo', 'fullName')
      .populate('items.itemId', 'sellingPrice hsnCode discountPercent packingMaterial materialCategory brand currentStock defaultSize')
      .populate('leadId', 'products packagingIncludes packagingIncludesQty paymentProofs orderDeliveryDate hotelLogoUrl logoNeeded splitDates isEmergency isUrgent kitDisplayUnit displayUnit displayUnitTab kitSize kitOrders selectedKits kitSticker kitLogo kitPrinting leadType contactPerson phone email alternativeName alternativeRole alternativePhone gstNumber gstPercent billingName salesPerson location locationCity deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms billType detailedAddress city state pincode destination hotelType rooms occupancy')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: orders });
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

exports.assignTask = asyncHandler(async (req, res, next) => {
  const { productIndex, product } = req.body;
  const orderId = req.params.id;

  // Prevent duplicate: same product slot on the same order already has a task
  const dupFilter = { orderId };
  if (productIndex !== undefined && productIndex !== null && !isNaN(productIndex)) {
    dupFilter.productIndex = Number(productIndex);
  } else if (product) {
    dupFilter.product = product;
  }
  if (Object.keys(dupFilter).length > 1) {
    const existing = await Task.findOne(dupFilter);
    if (existing) {
      return next(new AppError(
        `A task for "${product || `product #${productIndex}`}" on this order already exists (${existing.taskCode}). Delete the existing task first if you need to reassign.`,
        409
      ));
    }
  }

  // Prevent duplicate Kit Packing task per order
  if (req.body.taskType === 'Kit Packing') {
    const existingKitPacking = await Task.findOne({ orderId, taskType: 'Kit Packing' });
    if (existingKitPacking) {
      return next(new AppError('A Kit Packing task already exists for this order.', 409));
    }
  }

  const taskCode = await generateCode('TASK');
  // Estimate from the configured per-unit time × qty. plannedStartTime = assignment
  // time (or the start time picked in the modal); plannedEndTime = start + estimate.
  const { timePerUnitSec, estimatedDurationSec } = await computeTaskEstimate({
    taskName: req.body.taskName, taskType: req.body.taskType, product: req.body.product, qty: req.body.qty,
  });
  const plannedStartTime = req.body.plannedStartTime ? new Date(req.body.plannedStartTime) : new Date();
  const timeFields = { plannedStartTime };
  if (timePerUnitSec > 0) {
    timeFields.timePerUnitSec = timePerUnitSec;
    timeFields.estimatedDurationSec = estimatedDurationSec;
    timeFields.plannedEndTime = new Date(plannedStartTime.getTime() + estimatedDurationSec * 1000);
  } else if (req.body.plannedEndTime) {
    timeFields.plannedEndTime = new Date(req.body.plannedEndTime);
  }
  const task = await Task.create({
    ...req.body,
    ...timeFields,
    taskCode,
    orderId,
    createdBy: req.user._id,
  });
  notifyRoles({ modules: ['Task Management'], userIds: [task.assignedTo], type: 'task', title: 'Task Assigned', message: `Task ${task.taskCode}: ${task.taskName || task.product || 'Task'} assigned`, link: '/tasks' }).catch(() => {});
  res.status(201).json({ success: true, data: task });
});

// Per-product task fan-out: create one task per order line item in a single call.
exports.assignTasksPerProduct = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));

  // Build set of product indices that already have tasks for this order
  const existingTasks = await Task.find({ orderId: order._id }).select('productIndex').lean();
  const taskedIndices = new Set(
    existingTasks
      .filter((t) => t.productIndex !== undefined && t.productIndex !== null)
      .map((t) => t.productIndex)
  );

  const baseType = req.body.taskType || 'Production';
  const tasks = [];
  const skippedProducts = [];

  for (let i = 0; i < (order.items || []).length; i++) {
    const it = order.items[i];
    if (taskedIndices.has(i)) {
      skippedProducts.push(it.itemName);
      continue;
    }
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

  if (tasks.length === 0) {
    return next(new AppError(
      `All products for this order already have tasks assigned (${skippedProducts.join(', ')}).`,
      409
    ));
  }

  if (tasks.length > 0) {
    notifyRoles({ modules: ['Task Management'], type: 'task', title: 'Tasks Assigned', message: `${tasks.length} task(s) assigned for order ${order.orderCode} (${order.clientName})`, link: '/tasks' }).catch(() => {});
  }
  res.status(201).json({
    success: true,
    total: tasks.length,
    data: tasks,
    ...(skippedProducts.length > 0 && { skippedProducts }),
  });
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
  const stickers = await StickerRequest.find(filter)
    .populate('orderId', 'orderCode clientName')
    .populate('salesApprovedBy', 'fullName')
    .populate('opsHeadApprovedBy', 'fullName')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: stickers });
});

exports.createStickerRequest = asyncHandler(async (req, res) => {
  const sticker = await StickerRequest.create({ ...req.body, createdBy: req.user._id });
  notifyRoles({ modules: ['Operations', 'Sales Team'], type: 'task', title: 'Sticker/Design Request Created', message: `${sticker.stickerType || 'Sticker'} request for "${sticker.product || 'product'}" pending approval`, link: '/operations' }).catch(() => {});
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
  const now = new Date();
  const userId = req.user?._id;
  if (role === 'sales') {
    sticker.salesApproved = true;
    sticker.salesApprovedAt = now;
    sticker.salesApprovedBy = userId;
  } else if (role === 'opsHead') {
    sticker.opsHeadApproved = true;
    sticker.opsHeadApprovedAt = now;
    sticker.opsHeadApprovedBy = userId;
  } else {
    // admin: approve both simultaneously
    sticker.salesApproved = true; sticker.salesApprovedAt = now; sticker.salesApprovedBy = userId;
    sticker.opsHeadApproved = true; sticker.opsHeadApprovedAt = now; sticker.opsHeadApprovedBy = userId;
  }
  if (sticker.salesApproved && sticker.opsHeadApproved) {
    sticker.status = 'Approved';
    notifyRoles({ modules: ['Operations', 'Sales Team'], type: 'task', title: 'Sticker/Design Approved', message: `${sticker.stickerType || 'Sticker'} for "${sticker.product || 'product'}" fully approved — ready to print`, link: '/operations' }).catch(() => {});
  } else {
    sticker.status = 'Waiting for Approval';
    notifyRoles({ modules: ['Operations', 'Sales Team'], type: 'task', title: 'Sticker Approval Pending', message: `${sticker.stickerType || 'Sticker'} for "${sticker.product || 'product'}" — waiting for ${!sticker.salesApproved ? 'Sales' : 'Operations'} approval`, link: '/operations' }).catch(() => {});
  }
  await sticker.save({ validateBeforeSave: false });
  await sticker.populate('salesApprovedBy', 'fullName');
  await sticker.populate('opsHeadApprovedBy', 'fullName');
  res.status(200).json({ success: true, data: sticker });
});
