const Task = require('../../models/Task');
const Order = require('../../models/Order');
const Lead = require('../../models/Lead');
const DispatchRecord = require('../../models/DispatchRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { computeTaskEstimate, computeRating } = require('../../utils/taskTime');
const { resolveOrderPaymentStatus } = require('../../utils/syncOrderPayment');
const { checkTaskQuantityOverflow } = require('../../utils/taskQuantity');

// Resolve the time-management fields for a task being created, from its configured
// per-unit time × qty. plannedStartTime defaults to now (the assignment time);
// plannedEndTime is start + estimate. Returns only the fields we want to set.
async function buildTimeFields(body = {}) {
  const plannedStartTime = body.plannedStartTime ? new Date(body.plannedStartTime) : new Date();
  const fields = { plannedStartTime };
  // The Assign Task modals now compute the estimate client-side by summing each
  // sub-task's own task-name × qty (a single parent taskName lookup can't reproduce
  // that aggregate), so trust an explicitly-sent estimate instead of recomputing it.
  if (body.estimatedDurationSec !== undefined) {
    if (body.timePerUnitSec !== undefined) fields.timePerUnitSec = body.timePerUnitSec;
    fields.estimatedDurationSec = body.estimatedDurationSec;
    fields.plannedEndTime = body.plannedEndTime
      ? new Date(body.plannedEndTime)
      : new Date(plannedStartTime.getTime() + body.estimatedDurationSec * 1000);
    return fields;
  }
  const { taskName, taskType, product, qty } = body;
  const { timePerUnitSec, estimatedDurationSec } = await computeTaskEstimate({ taskName, taskType, product, qty });
  if (timePerUnitSec > 0) {
    fields.timePerUnitSec = timePerUnitSec;
    fields.estimatedDurationSec = estimatedDurationSec;
    fields.plannedEndTime = new Date(plannedStartTime.getTime() + estimatedDurationSec * 1000);
  } else if (body.plannedEndTime) {
    fields.plannedEndTime = new Date(body.plannedEndTime);
  }
  return fields;
}

// Forward an order to Dispatch: mark it Dispatch Ready and create its DispatchRecord
// (idempotent). Used both when all sibling tasks finish normally, and when an emergency
// dispatch is fully approved (Sales Head + Ops Head) — which intentionally bypasses the
// "every task Done" requirement, since that's the whole point of an emergency dispatch.
async function forwardOrderToDispatch(orderId, userId) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: 'Dispatch Ready', taskStatus: 'Completed' },
    { new: true }
  );
  if (!order) return null;
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
      createdBy: userId,
    });
  }
  return order;
}

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  // Visibility scoping (same rule as Sales getLeads/getOrders):
  // - Admin / Super Admin / Manager / Head: all tasks
  // - Everyone else (Executive, etc.): only tasks they created or are assigned to
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const role = req.user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
      filter.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
        { 'subTasks.assignedTo': req.user._id },
      ];
    }
  }
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
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  // The cached Task.paymentStatus field only gets refreshed by code paths that
  // remember to call syncOrderTasksPayment — resolve it live per order here so
  // Task Management always matches what Sales/Billing show for the same order,
  // instead of occasionally lagging behind a payment recorded elsewhere.
  const orderIds = [...new Set(tasks.filter((t) => t.orderId?._id).map((t) => String(t.orderId._id)))];
  const statusByOrder = {};
  await Promise.all(orderIds.map(async (id) => {
    statusByOrder[id] = await resolveOrderPaymentStatus(id).catch(() => null);
  }));
  tasks.forEach((t) => {
    const oid = t.orderId?._id && String(t.orderId._id);
    if (oid && statusByOrder[oid]) t.paymentStatus = statusByOrder[oid];
  });

  res.status(200).json({ success: true, total, page, data: tasks });
});

// Map a kit's resolved display-unit tab (or legacy logoType) to the StickerRequest
// stickerType queue it is actually tracked under (mirrors Operations/data.js kit routing).
const KIT_TAB_TO_STICKER_TYPE = { Box: 'Box', Ziplock: 'Frosted Ziplock', 'Butter Paper': 'Butter Paper', Sticker: 'Sticker' };
const normYN = (v) => { const s = String(v ?? '').trim().toUpperCase(); return s === 'YES' || s === 'NO' ? s : ''; };
const DESIGN_READY_STATUSES = ['Approved', 'Done', 'In Process', 'Received'];

// Which design queue (Sticker | Box | Frosted Ziplock | Butter Paper) this order line is
// actually tracked under, so its readiness is checked against the RIGHT StickerRequest —
// not just any request for the same product name. '' = no design step required.
function resolveDesignType(it, order) {
  const isKitItem = !!(it.isKit || it.kitType || it.kitName);
  if (isKitItem) {
    const tab = it.displayUnitTab || order.displayUnitTab || '';
    if (KIT_TAB_TO_STICKER_TYPE[tab]) return KIT_TAB_TO_STICKER_TYPE[tab];
    if (['Box', 'Frosted Ziplock', 'Butter Paper', 'Sticker'].includes(it.logoType)) return it.logoType;
    return '';
  }
  if (normYN(it.sticker) === 'YES') return 'Sticker';
  if (it.logoType && it.logoType !== 'None') return it.logoType;
  return '';
}

// Suggested Tasks: orders ready (or partially ready) for production but not yet fully tasked.
// Readiness is computed from inventory stock + packaging/sticker design status per the doc.
exports.getSuggestedTasks = asyncHandler(async (req, res) => {
  const InventoryItem = require('../../models/InventoryItem');
  const StickerRequest = require('../../models/StickerRequest');
  const Kit = require('../../models/Kit');
  const Order = require('../../models/Order');

  // Only orders still awaiting production — once forwarded to Dispatch Ready the order
  // has already left this workflow, so it shouldn't keep resurfacing here.
  const orders = await Order.find({ deletedAt: null, status: 'In Production' })
    .select('orderCode clientName items printingStatus isUrgent displayUnitTab').lean();
  const existingTasks = await Task.find({ orderId: { $ne: null } }).select('orderId productIndex').lean();
  const taskedSet = new Set(existingTasks.map((t) => `${t.orderId}-${t.productIndex ?? 'x'}`));

  // Build a stock lookup by item name (case-insensitive). NOTE: the field is `itemName`,
  // not `name` — selecting/reading `name` silently returned undefined for every item,
  // which meant EVERY product here always showed "Stock 0" regardless of real inventory.
  const stockItems = await InventoryItem.find({ deletedAt: null }).select('itemName currentStock').lean();
  const stockByName = {};
  stockItems.forEach((s) => { stockByName[(s.itemName || '').toLowerCase()] = s.currentStock; });

  // Kits aren't InventoryItems — they're a Kit (components list). Build a lookup so kit
  // line items report real component-stock readiness instead of a false "no match → 0".
  const kits = await Kit.find({ deletedAt: null }).select('kitName products').lean();
  const kitByName = {};
  kits.forEach((k) => { kitByName[(k.kitName || '').toLowerCase()] = k.products || []; });

  const suggestions = [];
  for (const o of orders) {
    const stickerReqs = await StickerRequest.find({ orderId: o._id }).select('product status stickerType category').lean();
    (o.items || []).forEach((it, idx) => {
      if (taskedSet.has(`${o._id}-${idx}`)) return; // already has a task
      const productKey = it.product || it.itemName || it.kitName || '';
      const isKitItem = !!(it.isKit || it.kitType || it.kitName);
      const requiredQty = it.overallQty || it.qty || 0;

      // ── Stock readiness ──
      let stock;
      let stockReady;
      if (isKitItem) {
        const components = kitByName[(it.kitName || '').toLowerCase()];
        if (components && components.length) {
          // How many full kits can be assembled right now, limited by the scarcest component.
          stock = Math.min(...components.map((c) => {
            const compStock = stockByName[(c.productName || '').toLowerCase()] ?? 0;
            return Math.floor(compStock / (c.qty || 1));
          }));
          stockReady = stock >= requiredQty;
        } else {
          // Kit not found in the Kit catalog (legacy/unregistered) — can't verify components,
          // so don't falsely block on an unrelated/zero match.
          stock = null;
          stockReady = true;
        }
      } else {
        stock = stockByName[(it.itemName || '').toLowerCase()] ?? 0;
        stockReady = stock >= requiredQty;
      }

      // ── Design (Sticker / Box / Frosted Ziplock / Butter Paper) readiness ──
      const designType = resolveDesignType(it, o);
      let stickerReady = true;
      if (designType) {
        const match = stickerReqs.find((s) => (s.product || '').toLowerCase() === productKey.toLowerCase()
          && s.stickerType === designType
          && (!it.category || !s.category || s.category === it.category));
        stickerReady = !!match && DESIGN_READY_STATUSES.includes(match.status);
      }

      // ── Printing readiness — only gate items that actually need a print step. ──
      const needsPrintStep = normYN(it.printing) === 'YES';
      const printingReady = !needsPrintStep || !o.printingStatus || ['Closed', 'Received'].includes(o.printingStatus);

      const pending = [];
      if (!stockReady) pending.push('Inventory stock');
      if (!stickerReady) pending.push(designType ? `${designType} design` : 'Sticker/printing');
      if (!printingReady) pending.push('Printing approval');
      suggestions.push({
        id: `${o._id}-${idx}`,
        orderId: o._id, orderCode: o.orderCode, client: o.clientName,
        product: it.itemName, qty: it.qty, logoType: it.logoType,
        isUrgent: o.isUrgent,
        inventoryStock: stock,
        designType,
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

  // Resolve payment status live (see getTasks) so this view matches Sales/Billing
  // even if the cached field wasn't refreshed by whichever path last touched payment.
  if (result.orderId?._id) {
    const livePaymentStatus = await resolveOrderPaymentStatus(result.orderId._id).catch(() => null);
    if (livePaymentStatus) result.paymentStatus = livePaymentStatus;
  }

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
  // productAttributes is the nested spec bag; top-level fields are preferred but fall through.
  const attrs = lineItem?.productAttributes || {};
  result.productDetails = {
    brand: inv?.brand || lineItem?.brand || attrs.brand || lineItem?.material || '',
    packingMaterial: inv?.packingMaterial || lineItem?.packingMaterial || attrs.packingMaterial || lineItem?.packaging || '',
    materialCategory: inv?.materialCategory || inv?.category || lineItem?.materialCategory || attrs.materialCategory || '',
    category: inv?.category || lineItem?.category || '',
    unit: inv?.unit || lineItem?.unit || '',
    size: lineItem?.size || inv?.defaultSize || '',
    hsnCode: inv?.hsnCode || lineItem?.hsnCode || '',
    source: inv ? 'inventory' : (lineItem ? 'order' : 'none'),
  };

  res.status(200).json({ success: true, data: result });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const { orderId, productIndex, product } = req.body;

  // Same task name can be assigned more than once for the same product slot (e.g.
  // split across two staff) as long as the combined qty doesn't exceed the line
  // item's required quantity — only a genuine quantity overflow is blocked.
  if (orderId) {
    const overflowMsg = await checkTaskQuantityOverflow({
      orderId, productIndex, product,
      taskName: req.body.taskName,
      qty: req.body.qty,
      requiredQty: req.body.requiredQty,
    });
    if (overflowMsg) return next(new AppError(overflowMsg, 409));
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
  // Inherit the order's current paid status if the caller didn't set one — so a
  // task created after payment was already recorded isn't stuck on 'Pending'.
  const paymentFields = (orderId && req.body.paymentStatus === undefined)
    ? { paymentStatus: await resolveOrderPaymentStatus(orderId).catch(() => 'Pending') }
    : {};
  const task = await Task.create({ ...req.body, ...timeFields, ...paymentFields, taskCode, createdBy: req.user._id });
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
        await forwardOrderToDispatch(task.orderId, req.user._id);
        orderForwarded = true;
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

// Forward the order linked to a task from Task Management into the Dispatch queue.
// Requires every sibling task on the order to be Done and (unless it's a sample
// order) the order to be fully paid. This only makes the order Dispatch Ready and
// ensures its DispatchRecord exists — it does NOT mark the order/lead as Dispatched.
// The actual "Dispatched" status is only set from the Dispatch module itself
// (dispatch.controller.js confirmDispatch/uploadLR), so Sales/Dispatch don't show
// an order as dispatched just because it was handed off from Task Management.
exports.dispatchOrder = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.orderId) return next(new AppError('This task is not linked to an order', 400));

  // Gate 1 — all tasks for the order must be completed (bypassed for an approved Emergency Dispatch).
  const siblings = await Task.find({ orderId: task.orderId });
  const allDone = siblings.length > 0 && siblings.every((t) => t.status === 'Done');
  if (!allDone && !task.emergencyApproved) {
    const pending = siblings.filter((t) => t.status !== 'Done').length;
    return next(new AppError(`${pending} task(s) on this order are not yet completed. Complete all tasks before dispatch.`, 400));
  }

  const order = await Order.findById(task.orderId).populate('leadId', 'leadType');
  if (!order) return next(new AppError('Order not found', 404));
  if (order.status === 'Dispatched') {
    return next(new AppError('This order has already been dispatched.', 400));
  }
  // Order was already forwarded (either by this same action or by the "all tasks Done"
  // automation in updateTaskStatus) — its DispatchRecord already exists, so re-forwarding
  // here would just be a redundant no-op that re-fires notifications. Block it outright.
  if (order.status === 'Dispatch Ready') {
    return next(new AppError('This order has already been sent to Dispatch.', 400));
  }

  // Gate 2 — payment must be settled, unless this is a sample order or an approved Emergency Dispatch.
  const isSample = order.orderCategory === 'SAMPLE' || order.leadId?.leadType === 'SAMPLE';
  if (!isSample && !task.emergencyApproved) {
    const payStatus = await resolveOrderPaymentStatus(order._id).catch(() => 'Pending');
    if (payStatus !== 'Paid') {
      return next(new AppError(`Payment is "${payStatus}". Dispatch requires full payment or an approved Emergency Dispatch.`, 400));
    }
  }

  // Forward the order into the Dispatch queue (Dispatch Ready + a Draft DispatchRecord).
  // Do NOT mark it Dispatched here — that only happens from an explicit action inside
  // the Dispatch module itself, so this hand-off doesn't prematurely flip Sales/Dispatch status.
  await forwardOrderToDispatch(order._id, req.user._id);
  const dispatch = await DispatchRecord.findOne({ orderId: order._id });

  notifyRoles({ modules: ['Dispatch Team', 'Operations', 'Task Management'], type: 'dispatch', title: 'Order Ready for Dispatch', message: `Order ${order.orderCode || ''} sent to Dispatch from Task Management`, link: '/dispatch' }).catch(() => {});

  res.status(200).json({ success: true, data: { order, dispatch } });
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

// List every task with an active emergency-dispatch request, most recent first.
// An order can have several products (= several tasks), each raised as its own
// emergency request — Sales/Operations need one row per task, not a single
// order-level snapshot, or requests raised after the first one get hidden.
exports.getEmergencyRequests = asyncHandler(async (req, res) => {
  const filter = { emergencyRequested: true };
  if (req.query.orderId) filter.orderId = req.query.orderId;
  const tasks = await Task.find(filter)
    .sort('-emergencyRequestedAt')
    .populate('orderId', 'orderCode clientName hotelName')
    .lean();
  res.status(200).json({ success: true, data: tasks });
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

// Request emergency dispatch for every task under an order at once — the "Full Order"
// scope option in the Task Management request modal (as opposed to the single-task
// "This product/kit only" scope handled by requestEmergencyDispatch above). Sales/Ops
// Head still approve one product/task at a time via the existing per-task endpoints —
// this only fans the *request* out across every sibling task.
exports.requestEmergencyDispatchForOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const tasks = await Task.find({ orderId });
  if (!tasks.length) return next(new AppError('No tasks found for this order', 404));

  const reason = req.body.reason || '';
  const requestedAt = new Date();
  await Promise.all(tasks.map((task) => {
    task.emergencyRequested = true;
    task.emergencyRequestedAt = requestedAt;
    task.emergencyReason = reason;
    task.isEmergency = true;
    return task.save();
  }));

  await Order.findByIdAndUpdate(orderId, {
    $set: { emergencyDispatchRequested: true, emergencyTaskId: tasks[0]._id, isEmergency: true },
  });

  notifyRoles({
    modules: ['Sales', 'Operations'],
    type: 'task',
    title: 'Emergency Dispatch Requested — Full Order',
    message: `${tasks.length} task(s) on this order flagged for emergency dispatch. Sales Head + Ops Head approval needed for each.`,
    link: '/sales',
  }).catch(() => {});

  res.status(200).json({ success: true, data: tasks });
});

// Sales Head approval — step 1 of the two-stage emergency approval chain
exports.approveEmergencySales = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.emergencyRequested) return next(new AppError('Emergency dispatch not requested for this task', 400));

  const approvedAt = new Date();
  task.emergencySalesApproved = true;
  task.emergencySalesApprovedBy = req.user._id;
  task.emergencySalesApprovedAt = approvedAt;

  const bothApproved = task.emergencyOpsApproved;
  if (bothApproved) {
    task.emergencyApproved = true;
    task.emergencyApprovedBy = req.user._id;
    task.emergencyApprovedAt = approvedAt;
  }
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: {
        emergencySalesApproved: true,
        emergencySalesApprovedBy: req.user._id,
        emergencySalesApprovedAt: approvedAt,
        ...(bothApproved ? { emergencyApproved: true, emergencyApprovedBy: req.user._id, emergencyApprovedAt: approvedAt } : {}),
      },
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

  const approvedAt = new Date();
  task.emergencyOpsApproved = true;
  task.emergencyOpsApprovedBy = req.user._id;
  task.emergencyOpsApprovedAt = approvedAt;
  task.emergencyApproved = true;
  task.emergencyApprovedBy = req.user._id;
  task.emergencyApprovedAt = approvedAt;
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: {
        emergencyOpsApproved: true,
        emergencyOpsApprovedBy: req.user._id,
        emergencyOpsApprovedAt: approvedAt,
        emergencyApproved: true,
        emergencyApprovedBy: req.user._id,
        emergencyApprovedAt: approvedAt,
      },
    });
    // Fully-approved emergency dispatch skips the "every task Done" wait — forward the
    // order to the Dispatch queue right away so it shows up in the Dispatch module.
    await forwardOrderToDispatch(task.orderId, req.user._id);
  }

  notifyRoles({
    modules: ['Task Management', 'Operations', 'Dispatch'],
    userIds: [task.assignedTo],
    type: 'task',
    title: 'Emergency Dispatch Fully Approved',
    message: `Task ${task.taskCode} — Sales + Ops approved. Order forwarded to Dispatch.`,
    link: '/dispatch',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, message: 'Task deleted' });
});
