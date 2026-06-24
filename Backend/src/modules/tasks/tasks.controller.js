const Task = require('../../models/Task');
const Order = require('../../models/Order');
const DispatchRecord = require('../../models/DispatchRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { computeTaskEstimate, computeRating } = require('../../utils/taskTime');

// Resolve the time-management fields for a task being created, from its configured
// per-unit time × qty. plannedStartTime defaults to now (the assignment time);
// plannedEndTime is start + estimate. Returns only the fields we want to set.
async function buildTimeFields(body = {}) {
  const { taskName, taskType, product, qty } = body;
  const { timePerUnitSec, estimatedDurationSec } = await computeTaskEstimate({ taskName, taskType, product, qty });
  const plannedStartTime = body.plannedStartTime ? new Date(body.plannedStartTime) : new Date();
  const fields = { plannedStartTime };
  if (timePerUnitSec > 0) {
    fields.timePerUnitSec = timePerUnitSec;
    fields.estimatedDurationSec = estimatedDurationSec;
    fields.plannedEndTime = new Date(plannedStartTime.getTime() + estimatedDurationSec * 1000);
  } else if (body.plannedEndTime) {
    fields.plannedEndTime = new Date(body.plannedEndTime);
  }
  return fields;
}

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate({
        path: 'orderId',
        select: 'orderCode clientName orderCategory leadId items status expectedDeliveryDate',
        populate: { path: 'leadId', select: 'leadType' },
      })
      .populate('assignedTo', 'fullName role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: tasks });
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
    .populate({
      path: 'orderId',
      select: 'orderCode clientName orderCategory leadId items status expectedDeliveryDate',
      populate: { path: 'leadId', select: 'leadType' },
    })
    .populate('assignedTo', 'fullName role');
  if (!task) return next(new AppError('Task not found', 404));

  // Enrich with the product master (Brand, Packing Material, Material Category) for this task's product.
  const InventoryItem = require('../../models/InventoryItem');
  const result = task.toObject();

  // Resolve the order line item this task corresponds to (by index first, then by name).
  let lineItem = null;
  const items = result.orderId?.items || [];
  if (result.productIndex !== undefined && result.productIndex !== null && items[result.productIndex]) {
    lineItem = items[result.productIndex];
  } else if (result.product) {
    lineItem = items.find((it) => (it.itemName || '').trim().toLowerCase() === (result.product || '').trim().toLowerCase());
  }

  // Look up the inventory master by id (preferred), falling back to an exact name match.
  let inv = null;
  const fields = 'itemName brand packingMaterial materialCategory category unit defaultSize hsnCode';
  if (lineItem?.itemId) inv = await InventoryItem.findById(lineItem.itemId).select(fields).lean();
  if (!inv && result.product) {
    const escaped = String(result.product).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inv = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null }).select(fields).lean();
  }

  // Merge inventory master with any packaging fields captured on the order line item.
  result.productDetails = {
    brand: inv?.brand || lineItem?.material || '',
    packingMaterial: inv?.packingMaterial || lineItem?.packaging || '',
    materialCategory: inv?.materialCategory || inv?.category || '',
    category: inv?.category || '',
    unit: inv?.unit || lineItem?.unit || '',
    size: lineItem?.size || inv?.defaultSize || '',
    hsnCode: inv?.hsnCode || '',
    source: inv ? 'inventory' : (lineItem ? 'order' : 'none'),
  };

  res.status(200).json({ success: true, data: result });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const { orderId, productIndex, product } = req.body;

  // Prevent duplicate when linked to an order + specific product slot
  if (orderId) {
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
  }

  // Prevent duplicate Kit Packing task per order
  if (orderId && req.body.taskType === 'Kit Packing') {
    const existingKitPacking = await Task.findOne({ orderId, taskType: 'Kit Packing' });
    if (existingKitPacking) {
      return next(new AppError('A Kit Packing task already exists for this order.', 409));
    }
  }

  const taskCode = await generateCode('TASK');
  const timeFields = await buildTimeFields(req.body);
  const task = await Task.create({ ...req.body, ...timeFields, taskCode, createdBy: req.user._id });
  notifyRoles({ modules: ['Task Management'], userIds: [task.assignedTo], type: 'task', title: 'New Task Assigned', message: `Task ${task.taskCode}: ${task.taskName || task.product || 'Task'} for ${task.clientName || 'order'}`, link: '/tasks' }).catch(() => {});
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

  // On completion: measure actual time (start → done) and auto-rate vs the estimate.
  if (status === 'Done') {
    const startMs = task.startedAt ? new Date(task.startedAt).getTime()
      : task.plannedStartTime ? new Date(task.plannedStartTime).getTime()
      : new Date(task.createdAt).getTime();
    const endMs = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    task.actualDurationSec = Math.max(0, Math.round((endMs - startMs) / 1000));
    const { rating, ratingReason, efficiencyPct } = computeRating(task.estimatedDurationSec, task.actualDurationSec);
    if (rating !== null) {
      task.rating = rating;
      task.ratingReason = ratingReason;
      task.efficiencyPct = efficiencyPct;
    }
    if (req.body.feedback !== undefined) task.feedback = req.body.feedback;
    await task.save();
  }

  // Automation: when ALL tasks under the same order are Done, forward the order to Dispatch.
  let orderForwarded = false;
  if (status === 'Done' && task.orderId) {
    const siblings = await Task.find({ orderId: task.orderId });
    const allDone = siblings.length > 0 && siblings.every((t) => t.status === 'Done');
    if (allDone) {
      // Kit orders require a Kit Packing task to be completed before forwarding.
      const orderDoc = await Order.findById(task.orderId).populate('leadId', 'kitDisplayUnit displayUnit');
      const kitDisplayUnit = orderDoc?.kitDisplayUnit || orderDoc?.displayUnit
        || orderDoc?.leadId?.kitDisplayUnit || orderDoc?.leadId?.displayUnit;
      const hasKitPackingTask = siblings.some((t) => t.taskType === 'Kit Packing');

      if (kitDisplayUnit && !hasKitPackingTask) {
        // All product tasks done but Kit Packing not yet assigned — signal the UI.
        await Order.findByIdAndUpdate(task.orderId, { taskStatus: 'Kit Packing Required' });
      } else {
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
  }
  if (status === 'Done') {
    notifyRoles({ modules: ['Task Management'], userIds: [task.assignedTo], type: 'task', title: 'Task Completed', message: `Task ${task.taskCode} (${task.taskName || task.product || 'Task'}) marked as Done`, link: '/tasks' }).catch(() => {});
  }
  if (status === 'Emergency') {
    notifyRoles({ modules: ['Task Management', 'Operations'], userIds: [task.assignedTo], type: 'task', title: 'Emergency Task', message: `Task ${task.taskCode} flagged as Emergency — needs approval`, link: '/tasks' }).catch(() => {});
  }
  if (orderForwarded) {
    notifyRoles({ modules: ['Dispatch Team', 'Operations'], type: 'dispatch', title: 'Order Ready for Dispatch', message: `All tasks complete — order is now Dispatch Ready`, link: '/dispatch' }).catch(() => {});
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
  notifyRoles({ modules: ['Task Management', 'Operations'], userIds: [task.assignedTo], type: 'task', title: 'Emergency Task Approved', message: `Task ${task.taskCode} emergency status approved — proceed immediately`, link: '/tasks' }).catch(() => {});
  res.status(200).json({ success: true, data: task });
});

// Request emergency dispatch — flags the task and linked order, notifies Sales + Ops heads
exports.requestEmergencyDispatch = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));

  task.emergencyRequested = true;
  task.emergencyRequestedAt = new Date();
  task.emergencyReason = req.body.reason || '';
  task.isEmergency = true;
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: { emergencyDispatchRequested: true, emergencyTaskId: task._id, isEmergency: true },
    });
  }

  notifyRoles({
    modules: ['Sales', 'Operations'],
    type: 'task',
    title: 'Emergency Dispatch Requested',
    message: `Task ${task.taskCode} — payment pending. Emergency dispatch needs Sales Head + Ops Head approval.`,
    link: '/sales',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

// Sales Head approval — step 1 of the two-stage emergency approval chain
exports.approveEmergencySales = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.emergencyRequested) return next(new AppError('Emergency dispatch not requested for this task', 400));

  task.emergencySalesApproved = true;
  task.emergencySalesApprovedBy = req.user._id;
  task.emergencySalesApprovedAt = new Date();

  const bothApproved = task.emergencyOpsApproved;
  if (bothApproved) {
    task.emergencyApproved = true;
    task.emergencyApprovedBy = req.user._id;
  }
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: { emergencySalesApproved: true, ...(bothApproved ? { emergencyApproved: true } : {}) },
    });
  }

  notifyRoles({
    modules: ['Operations'],
    type: 'task',
    title: 'Emergency Dispatch — Sales Head Approved',
    message: `Task ${task.taskCode} emergency dispatch approved by Sales Head. Ops Head approval needed.`,
    link: '/operations',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

// Ops Head approval — step 2 of the two-stage approval; requires Sales Head approval first
exports.approveEmergencyOps = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.emergencyRequested) return next(new AppError('Emergency dispatch not requested for this task', 400));
  if (!task.emergencySalesApproved) return next(new AppError('Sales Head must approve before Operations Head', 400));

  task.emergencyOpsApproved = true;
  task.emergencyOpsApprovedBy = req.user._id;
  task.emergencyOpsApprovedAt = new Date();
  task.emergencyApproved = true;
  task.emergencyApprovedBy = req.user._id;
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: { emergencyOpsApproved: true, emergencyApproved: true },
    });
  }

  notifyRoles({
    modules: ['Task Management', 'Operations', 'Dispatch'],
    userIds: [task.assignedTo],
    type: 'task',
    title: 'Emergency Dispatch Fully Approved',
    message: `Task ${task.taskCode} — Sales + Ops approved. Emergency dispatch can proceed immediately.`,
    link: '/tasks',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, message: 'Task deleted' });
});
