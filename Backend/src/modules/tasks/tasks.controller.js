const Task = require('../../models/Task');
const Order = require('../../models/Order');
const DispatchRecord = require('../../models/DispatchRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  const tasks = await Task.find(filter)
    .populate({
      path: 'orderId',
      select: 'orderCode clientName orderCategory leadId',
      populate: { path: 'leadId', select: 'leadType' },
    })
    .populate('assignedTo', 'fullName role')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: tasks });
});

// Suggested Tasks: orders ready (or partially ready) for production but not yet fully tasked.
// Readiness is computed from inventory stock + packaging/sticker design status per the doc.
exports.getSuggestedTasks = asyncHandler(async (req, res) => {
  const InventoryItem = require('../../models/InventoryItem');
  const StickerRequest = require('../../models/StickerRequest');
  const Order = require('../../models/Order');

  const orders = await Order.find({ deletedAt: null, status: { $in: ['In Production', 'Dispatch Ready'] } })
    .select('orderCode clientName items printingStatus isUrgent').lean();
  const existingTasks = await Task.find({ orderId: { $ne: null } }).select('orderId productIndex').lean();
  const taskedSet = new Set(existingTasks.map((t) => `${t.orderId}-${t.productIndex ?? 'x'}`));

  // Build a stock lookup by item name (case-insensitive).
  const stockItems = await InventoryItem.find({ deletedAt: null }).select('name currentStock').lean();
  const stockByName = {};
  stockItems.forEach((s) => { stockByName[(s.name || '').toLowerCase()] = s.currentStock; });

  const suggestions = [];
  for (const o of orders) {
    const stickerReqs = await StickerRequest.find({ orderId: o._id }).select('product status').lean();
    (o.items || []).forEach((it, idx) => {
      if (taskedSet.has(`${o._id}-${idx}`)) return; // already has a task
      const stock = stockByName[(it.itemName || '').toLowerCase()] ?? 0;
      const stockReady = stock >= (it.qty || 0);
      const sticker = stickerReqs.find((s) => (s.product || '').toLowerCase() === (it.itemName || '').toLowerCase());
      const stickerReady = !it.logoType || it.logoType === 'None' || (sticker && ['Approved', 'Done', 'In Process', 'Received'].includes(sticker.status));
      const printingReady = !o.printingStatus || o.printingStatus === 'Closed' || o.printingStatus === 'Received';
      const pending = [];
      if (!stockReady) pending.push('Inventory stock');
      if (!stickerReady) pending.push('Sticker/printing');
      if (!printingReady) pending.push('Printing approval');
      suggestions.push({
        id: `${o._id}-${idx}`,
        orderId: o._id, orderCode: o.orderCode, client: o.clientName,
        product: it.itemName, qty: it.qty, logoType: it.logoType,
        isUrgent: o.isUrgent,
        inventoryStock: stock,
        stockReady, stickerReady, printingReady,
        fullyReady: stockReady && stickerReady && printingReady,
        pending, // components still pending (task still shown to help planning)
      });
    });
  }
  // Fully-ready first, then urgent.
  suggestions.sort((a, b) => (b.fullyReady - a.fullyReady) || (b.isUrgent - a.isUrgent));
  res.status(200).json({ success: true, total: suggestions.length, data: suggestions });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('orderId').populate('assignedTo', 'fullName');
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, data: task });
});

exports.createTask = asyncHandler(async (req, res) => {
  const taskCode = await generateCode('TASK');
  const task = await Task.create({ ...req.body, taskCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: task });
});

exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const update = { status };
  if (status === 'In Progress') update.startedAt = Date.now();
  if (status === 'Done') update.completedAt = Date.now();
  if (status === 'Emergency') update.isEmergency = true;

  const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!task) return next(new AppError('Task not found', 404));

  // Automation: when ALL tasks under the same order are Done, forward the order to Dispatch.
  let orderForwarded = false;
  if (status === 'Done' && task.orderId) {
    const siblings = await Task.find({ orderId: task.orderId });
    const allDone = siblings.length > 0 && siblings.every((t) => t.status === 'Done');
    if (allDone) {
      const order = await Order.findByIdAndUpdate(
        task.orderId,
        { status: 'Dispatch Ready', taskStatus: 'Completed' },
        { new: true }
      );
      orderForwarded = true;
      // Create a DispatchRecord so the order surfaces in the Dispatch UI (idempotent).
      if (order) {
        const existing = await DispatchRecord.findOne({ orderId: order._id });
        if (!existing) {
          const dispatchCode = await generateCode('DISP');
          await DispatchRecord.create({
            dispatchCode,
            orderId: order._id,
            status: 'Draft',
            dispatchType: order.deliveryType === 'Partial' ? 'Partial Dispatch' : 'Full Dispatch',
            items: (order.items || []).map((it) => ({
              itemId: it.itemId,
              itemName: it.itemName,
              qtyOrdered: it.qty,
              qtyDispatched: it.qty,
            })),
            createdBy: req.user._id,
          });
        }
      }
    }
  }
  res.status(200).json({ success: true, data: task, orderForwarded });
});

exports.approveEmergency = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { emergencyApproved: true, emergencyApprovedBy: req.user._id },
    { new: true }
  );
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, message: 'Task deleted' });
});
