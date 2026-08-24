const Order = require('../../models/Order');
const Lead = require('../../models/Lead');
const StickerRequest = require('../../models/StickerRequest');
const Task = require('../../models/Task');
const User = require('../../models/User');
const CompanySettings = require('../../models/CompanySettings');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const MaterialStock = require('../../models/MaterialStock');
const { notifyRoles } = require('../../utils/notify');
const { ROLE_TO_STICKER_TYPE } = require('../../utils/alertConfigQueries');
const { findHotelMaterialStock } = require('../../utils/materialStockMatch');
const { sendMessage } = require('../../services/whatsAppService');
const { computeTaskEstimate } = require('../../utils/taskTime');
const { resolveOrderPaymentStatus } = require('../../utils/syncOrderPayment');
const { checkTaskQuantityOverflow, checkStockDeductionGate } = require('../../utils/taskQuantity');
const { resolveItemConsumedQty } = require('../sales/sales.controller');

// ─── ORDER MANAGEMENT ─────────────────────────────────────────────────────────
// Visibility scoping (same rule as Sales getLeads/Task Management getTasks):
// - Admin / Super Admin / Manager / Head (role contains 'Manager' or 'Head'): all orders
// - Everyone else (Executive, etc.): only orders they created, are assigned to, or are the salesPerson on
async function applyOrderVisibility(user, filter) {
  if (user && user.role !== 'Super Admin' && user.role !== 'Admin') {
    const role = user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
      const myStickerType = ROLE_TO_STICKER_TYPE[role];
      if (user.department === 'Vendors' && myStickerType) {
        // Design/Vendor Team Members (Sticker/Box/Ziplock/Butter Paper) are never the
        // order's createdBy/assignedTo/salesPerson, so the createdBy/assignedTo/
        // salesPerson visibility rule below doesn't apply to them — but restricting
        // the order LIST itself to orders with an already-existing StickerRequest of
        // their type (the previous approach) is wrong: an item only gets a
        // StickerRequest doc once it's actually acted on (e.g. "Send for Approval"),
        // so a brand-new order whose Box item hasn't been touched yet, or one still
        // waiting on an upstream Sticker-print step, has no 'Box' StickerRequest yet
        // and was silently excluded — whole orders vanishing from the Box vendor's
        // queue. Which items/rows within an order route to which vendor tab (and to
        // which teammate) is a multi-field decision the frontend's queue builder
        // (Operations/data.js buildProductionQueues) already computes correctly and
        // is the only place that logic should live, so leave the order list
        // unrestricted here — same as Admin — and let that per-tab/per-row gating
        // (plus getStickerRequests' per-teammate redaction) narrow it down instead.
      } else {
        const visibility = [{ createdBy: user._id }, { assignedTo: user._id }];
        const myName = user.fullName || user.name;
        if (myName) visibility.push({ salesPerson: myName });
        filter.$or = visibility;
      }
    }
  }
  return filter;
}

exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  await applyOrderVisibility(req.user, filter);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('assignedTo', 'fullName')
      .populate('items.itemId', 'sellingPrice hsnCode discountPercent packingMaterial materialCategory brand currentStock defaultSize')
      .populate('leadId', 'products packagingIncludes packagingIncludesQty paymentProofs orderDeliveryDate hotelLogoUrl logoNeeded splitDates isEmergency isUrgent kitDisplayUnit kitDisplayUnitType displayUnit displayUnitTab kitSize kitOrders kitOverallQty selectedKits kitSticker kitLogo kitPrinting leadType contactPerson phone email alternativeName alternativeRole alternativePhone gstNumber gstPercent billingName salesPerson location locationCity deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms billType detailedAddress city state pincode destination hotelType rooms occupancy')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Resolve each order's live payment status from the same source Sales/Billing/
  // Task Management use (invoices first, then order payment collection) so
  // Operations always shows Paid/Partial/Pending in sync with those modules.
  await Promise.all(orders.map(async (o) => {
    o.paymentStatus = await resolveOrderPaymentStatus(o._id).catch(() => 'Pending');
  }));

  await backfillLogoUrlByHotelName(orders);

  res.status(200).json({ success: true, total, page, data: orders });
});

// A hotel's logo is only ever captured once, on whichever Lead happened to have it
// uploaded (or via the "Old Hotel" lookup at lead-creation time, sales.controller.js
// getHotelByName). A repeat hotel that gets a fresh Lead/Order created WITHOUT going
// through that lookup (e.g. picked "New Hotel" again, or its own leadId never had the
// upload) still has no logo of its own, so o.logoUrl and o.leadId?.hotelLogoUrl are
// both empty even though the hotel's logo already exists on another Lead — leaving
// the vendor tabs' (Sticker/Box/Ziplock/Butter Paper/Wooden Brush/Other) Logo column
// blank for no real reason. Backfill from the most recent Lead sharing that hotel
// name so any order for a hotel whose logo is on record anywhere shows it.
async function backfillLogoUrlByHotelName(orders) {
  const missingNames = [...new Set(
    orders
      .filter((o) => !o.logoUrl && !o.leadId?.hotelLogoUrl)
      .map((o) => (o.hotelName || o.clientName || '').trim())
      .filter(Boolean)
  )];
  if (!missingNames.length) return;
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fallbackLeads = await Lead.find({
    hotelName: { $in: missingNames.map((n) => new RegExp(`^${escapeRegex(n)}$`, 'i')) },
    hotelLogoUrl: { $exists: true, $ne: '' },
    deletedAt: null,
  }).sort('-createdAt').select('hotelName hotelLogoUrl').lean();
  const logoByHotel = new Map();
  for (const l of fallbackLeads) {
    const key = (l.hotelName || '').trim().toLowerCase();
    if (key && !logoByHotel.has(key)) logoByHotel.set(key, l.hotelLogoUrl);
  }
  if (!logoByHotel.size) return;
  orders.forEach((o) => {
    if (o.logoUrl || o.leadId?.hotelLogoUrl) return;
    const key = (o.hotelName || o.clientName || '').trim().toLowerCase();
    const fallback = logoByHotel.get(key);
    if (fallback) o.logoUrl = fallback;
  });
}

exports.getTodaysOrders = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const filter = await applyOrderVisibility(req.user, { createdAt: { $gte: start, $lte: end }, deletedAt: null });
  const orders = await Order.find(filter);
  res.status(200).json({ success: true, data: orders });
});

exports.getTodaysDispatch = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const filter = await applyOrderVisibility(req.user, {
    status: { $in: ['Dispatch Ready', 'Dispatched'] },
    updatedAt: { $gte: start, $lte: end },
    deletedAt: null,
  });
  const orders = await Order.find(filter);
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
  const { hotelName, product, type } = req.body;
  const design = await HotelDesign.findOneAndUpdate(
    { hotelName, product, type: type || 'Sticker' },
    { ...req.body, approved: true, createdBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({ success: true, data: design });
});

exports.assignTask = asyncHandler(async (req, res, next) => {
  const { productIndex, product } = req.body;
  const orderId = req.params.id;

  // Same task name can be assigned more than once for the same product slot (e.g.
  // split across two staff) as long as the combined qty doesn't exceed the line
  // item's required quantity — only a genuine quantity overflow is blocked.
  const overflowMsg = await checkTaskQuantityOverflow({
    orderId, productIndex, product,
    taskName: req.body.taskName,
    qty: req.body.qty,
    requiredQty: req.body.requiredQty,
  });
  if (overflowMsg) return next(new AppError(overflowMsg, 409));

  const stockMsg = await checkStockDeductionGate({ orderId, productIndex });
  if (stockMsg) return next(new AppError(stockMsg, 409));

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
  // The Assign Task modals now compute the estimate client-side by summing each
  // sub-task's own task-name × qty (a single parent taskName lookup can't reproduce
  // that aggregate), so trust an explicitly-sent estimate instead of recomputing it.
  const plannedStartTime = req.body.plannedStartTime ? new Date(req.body.plannedStartTime) : new Date();
  const timeFields = { plannedStartTime };
  if (req.body.estimatedDurationSec !== undefined) {
    if (req.body.timePerUnitSec !== undefined) timeFields.timePerUnitSec = req.body.timePerUnitSec;
    timeFields.estimatedDurationSec = req.body.estimatedDurationSec;
    timeFields.plannedEndTime = req.body.plannedEndTime
      ? new Date(req.body.plannedEndTime)
      : new Date(plannedStartTime.getTime() + req.body.estimatedDurationSec * 1000);
  } else {
    const { timePerUnitSec, estimatedDurationSec } = await computeTaskEstimate({
      taskName: req.body.taskName, taskType: req.body.taskType, product: req.body.product, qty: req.body.qty,
    });
    if (timePerUnitSec > 0) {
      timeFields.timePerUnitSec = timePerUnitSec;
      timeFields.estimatedDurationSec = estimatedDurationSec;
      timeFields.plannedEndTime = new Date(plannedStartTime.getTime() + estimatedDurationSec * 1000);
    } else if (req.body.plannedEndTime) {
      timeFields.plannedEndTime = new Date(req.body.plannedEndTime);
    }
  }
  // Inherit the order's live payment status so a task assigned after payment was
  // already collected isn't stuck on 'Pending' (which would hide the Dispatch button
  // in Task Management). Mirrors tasks.controller.js createTask.
  const paymentFields = (req.body.paymentStatus === undefined)
    ? { paymentStatus: await resolveOrderPaymentStatus(orderId).catch(() => 'Pending') }
    : {};
  const task = await Task.create({
    ...req.body,
    ...timeFields,
    ...paymentFields,
    taskCode,
    orderId,
    createdBy: req.user._id,
  });
  const recipients = (task.assignedToMany && task.assignedToMany.length) ? task.assignedToMany : [task.assignedTo].filter(Boolean);
  notifyRoles({ modules: ['Task Management'], userIds: recipients, type: 'task', title: 'Task Assigned', message: `Task ${task.taskCode}: ${task.taskName || task.product || 'Task'} assigned`, link: '/tasks' }).catch(() => {});
  res.status(201).json({ success: true, data: task });
});

// Per-product task fan-out: create one task per order line item in a single call.
exports.assignTasksPerProduct = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));

  // Sum already-assigned qty per product index (any status — a Pending task still
  // reserves that qty, same reasoning as utils/taskQuantity.js's checkTaskQuantityOverflow)
  // rather than a boolean "has any task" — so a product whose order qty grew AFTER it was
  // fully tasked (e.g. 500 done, then +500 added to the order) isn't skipped forever, and
  // one only partially covered gets a follow-up task for just its true remaining qty.
  const existingTasks = await Task.find({ orderId: order._id }).select('productIndex qty').lean();
  const assignedQtyByIndex = new Map();
  existingTasks.forEach((t) => {
    if (t.productIndex === undefined || t.productIndex === null) return;
    assignedQtyByIndex.set(t.productIndex, (assignedQtyByIndex.get(t.productIndex) || 0) + (Number(t.qty) || 0));
  });

  const baseType = req.body.taskType || 'Production';
  const tasks = [];
  const skippedProducts = [];
  const stockPendingProducts = [];
  // Optional per-product assignee, e.g. [{ productIndex, assignedTo, assigneeName }] —
  // lets one bulk call assign each product to a different Task Management staff member.
  const assignmentByIndex = new Map(
    (req.body.assignments || [])
      .filter((a) => a && a.productIndex !== undefined && a.productIndex !== null)
      .map((a) => [Number(a.productIndex), a])
  );
  // Resolve the order's live payment status once so each fanned-out task inherits it
  // (otherwise the Dispatch button stays hidden in Task Management on paid orders).
  const orderPaymentStatus = await resolveOrderPaymentStatus(order._id).catch(() => 'Pending');

  for (let i = 0; i < (order.items || []).length; i++) {
    const it = order.items[i];
    const required = it.isKit ? (Number(it.overallQty) || Number(it.qty) || 0) : (Number(it.qty) || 0);
    const pending = Math.max(0, required - (assignedQtyByIndex.get(i) || 0));
    if (pending <= 0) {
      skippedProducts.push(it.itemName);
      continue;
    }
    // Physical stock not yet deducted for this line (order was taken/edited while short) —
    // skip it here rather than hard-failing the whole bulk call; it'll unlock automatically
    // once backfillPendingDeductionsForItem pays off the shortfall on restock.
    const consumedRequired = resolveItemConsumedQty(it, order);
    if (consumedRequired > (Number(it.deductedQty) || 0)) {
      stockPendingProducts.push(it.itemName);
      continue;
    }
    const taskCode = await generateCode('TASK');
    const assignment = assignmentByIndex.get(i);
    tasks.push(await Task.create({
      taskCode,
      orderId: order._id,
      taskType: baseType,
      taskName: `${baseType} — ${it.itemName}`,
      product: it.itemName,
      productIndex: i,
      qty: pending,
      clientName: order.clientName,
      status: 'Pending',
      paymentStatus: orderPaymentStatus,
      assignedTo: assignment?.assignedTo || undefined,
      assigneeName: assignment?.assigneeName || undefined,
      createdBy: req.user._id,
    }));
  }

  if (tasks.length === 0) {
    const reasons = [];
    if (skippedProducts.length) reasons.push(`already assigned (${skippedProducts.join(', ')})`);
    if (stockPendingProducts.length) reasons.push(`stock not yet deducted (${stockPendingProducts.join(', ')})`);
    return next(new AppError(
      `No tasks were assigned — all products for this order are ${reasons.join('; ') || 'unavailable'}.`,
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
    ...(stockPendingProducts.length > 0 && { stockPendingProducts }),
  });
});

// Persist the per-row Printing Status (Yet to Receive / Received / Closed) shown in the
// Operations product spec table. Rows key by item._id when present, else by array index
// (mirrors the frontend's `key: it._id ? String(it._id) : String(idx)`). printingStatus
// isn't declared on the item sub-schema — it survives via strict:false, but ONLY when set
// through subdoc.set(); plain `subdoc.printingStatus = x` assignment is invisible to
// Mongoose for undeclared paths (never reaches _doc), so it silently fails to save.
exports.updateItemPrintingStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  const { itemKey } = req.params;
  const { printingStatus, product } = req.body;
  const byId = order.items.findIndex((it) => String(it._id) === String(itemKey));
  const targetIdx = byId !== -1 ? byId : Number(itemKey);
  if (Number.isInteger(targetIdx) && order.items[targetIdx]) {
    order.items[targetIdx].set('printingStatus', printingStatus);
    order.markModified('items');
  } else if (product) {
    // No matching entry in order.items (legacy/sample orders whose product list lives on the
    // Lead instead) — record it by product name rather than pushing a synthetic items entry,
    // which would break the items?.length fallback used elsewhere to show the full product list.
    order.printingStatusOverrides.set(String(product).trim().toLowerCase(), printingStatus);
  } else {
    return next(new AppError('Order item not found', 404));
  }
  await order.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: order });
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

// PATCH /api/operations/orders/:id/lr-mismatch-decision — Operations side of the dual
// (Sales + Operations) sign-off on an LR mismatch flagged by Dispatch for fields other
// than Weight/Transport Name (see dispatch.controller.js requestLrMismatchApproval /
// sales.controller.js decideLrMismatchSales). A reject from either side kills the
// request immediately; an approve only flips the overall status to 'approved' once
// Sales has approved too.
exports.decideLrMismatchOps = asyncHandler(async (req, res, next) => {
  const { decision } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return next(new AppError('decision must be "approved" or "rejected"', 400));
  }
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  if (order.dispatchLrMismatchStatus !== 'pending') {
    return next(new AppError('No pending LR mismatch approval for this order', 400));
  }

  if (decision === 'rejected') {
    order.dispatchLrMismatchStatus = 'rejected';
  } else {
    order.dispatchLrMismatchOpsApproved = true;
    order.dispatchLrMismatchOpsApprovedBy = req.user._id;
    order.dispatchLrMismatchOpsApprovedAt = Date.now();
    if (order.dispatchLrMismatchSalesApproved) order.dispatchLrMismatchStatus = 'approved';
  }
  await order.save({ validateBeforeSave: false });

  if (decision === 'approved' && order.dispatchLrMismatchStatus === 'pending') {
    await notifyRoles({
      modules: ['Sales Team'],
      type: 'dispatch',
      title: 'LR Mismatch — Operations Approved, Awaiting Sales',
      message: `Order ${order.orderCode}: Operations has approved the LR mismatch. Sales approval is still required before dispatch can proceed.`,
    });
  }

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
  // Vendor Team Members (Sticker/Box/Ziplock/Butter Paper role, department 'Vendors')
  // only see full details for requests routed to them personally — not every teammate
  // sharing their role — so switching who's marked "Auto" (or a per-order reassign)
  // actually redirects the work, not just the badge. Legacy requests created before
  // this existed (vendorId still null) stay visible to any teammate of that role so
  // nothing already in flight vanishes.
  const myStickerType = req.user && ROLE_TO_STICKER_TYPE[req.user.role];
  const isVendorScoped = !!(req.user?.department === 'Vendors' && myStickerType);
  if (isVendorScoped) {
    // Fetch every request of MY type (not just mine/unassigned) so one already
    // reassigned to a teammate is recognized as claimed below, instead of the old
    // vendor's own request list simply omitting it — which is indistinguishable from
    // "never assigned" and made a reassigned-away row silently reappear for them
    // whenever they're still the type's configured Auto default.
    // Also always include 'Sticker'-type requests (unless that IS my own type):
    // every packaging tab's queue-visibility gate (isStickerPrinted in
    // Operations/data.js) needs to read the upstream Sticker-print step's status
    // for an item before showing it in my tab, even though that step belongs to a
    // different vendor team — narrowing to only myStickerType made those requests
    // invisible to me entirely, so items still needing that check silently vanished.
    filter.stickerType = myStickerType === 'Sticker' ? myStickerType : { $in: [myStickerType, 'Sticker'] };
  }
  const stickers = await StickerRequest.find(filter)
    .populate('orderId', 'orderCode clientName')
    .populate('salesApprovedBy', 'fullName')
    .populate('opsHeadApprovedBy', 'fullName')
    .populate('salesRejectedBy', 'fullName')
    .populate('opsHeadRejectedBy', 'fullName')
    .populate('vendorId', 'fullName email')
    .sort('-createdAt');

  let data = stickers;
  if (isVendorScoped) {
    data = stickers.map((s) => {
      // Only redact requests of MY OWN type routed to a teammate — a cross-type
      // request (e.g. the upstream 'Sticker' step, fetched above purely so other
      // tabs' gates can read its status) isn't "mine to claim" at all, so it's
      // never redacted here.
      if (s.stickerType !== myStickerType) return s;
      const isMine = s.vendorId && String(s.vendorId._id) === String(req.user._id);
      if (isMine || !s.vendorId) return s;
      // Routed to a different teammate of the same type — expose only enough to mark
      // the row claimed (so it stops showing under my login); hide their design,
      // approval and invoice detail, which isn't mine to see.
      return {
        _id: s._id,
        orderId: s.orderId,
        product: s.product,
        category: s.category,
        stickerType: s.stickerType,
        assignedElsewhere: true,
      };
    });
  }
  res.status(200).json({ success: true, data });
});

exports.createStickerRequest = asyncHandler(async (req, res) => {
  let vendorId = req.body.vendorId || null;
  // The "Assign to Vendor / Team Member" field also lists external printing-supplier
  // companies alongside internal team-member Users — only a real Vendors-department
  // User is a valid routing target for task visibility/notifications below.
  if (vendorId) {
    const asTeamMember = await User.findOne({ _id: vendorId, department: 'Vendors' }).select('_id').lean();
    if (!asTeamMember) vendorId = null;
  }
  if (!vendorId) {
    // No team member picked explicitly — route to whichever teammate is currently
    // marked "Auto" for this stickerType (Vendors & Suppliers > Vendor Team Members).
    const vendorRole = Object.keys(ROLE_TO_STICKER_TYPE).find((role) => ROLE_TO_STICKER_TYPE[role] === req.body.stickerType);
    if (vendorRole) {
      const settings = await CompanySettings.findOne().lean();
      vendorId = settings?.automationVendors?.[vendorRole] || null;
    }
  }
  const sticker = await StickerRequest.create({ ...req.body, vendorId, createdBy: req.user._id });
  notifyRoles({
    modules: ['Operations', 'Sales Team'],
    userIds: vendorId ? [vendorId] : [],
    type: 'task',
    title: 'Sticker/Design Request Created',
    message: `${sticker.stickerType || 'Sticker'} request for "${sticker.product || 'product'}" pending approval`,
    link: '/operations',
  }).catch(() => {});

  // This hotel may already have this exact packing material sitting in Inventory >
  // Material Stocks from an earlier order (e.g. pre-printed boxes) — flag it so the
  // design team can reuse existing stock instead of starting a fresh print run.
  if (sticker.hotelName) {
    const stocks = await MaterialStock.find().select('packingMaterial size stockCount hotelName').lean();
    const matches = findHotelMaterialStock(sticker.hotelName, sticker.stickerType, stocks);
    if (matches.length) {
      const summary = matches.map((m) => `${m.packingMaterial}${m.size ? ` (${m.size})` : ''}: ${m.stockCount} in stock`).join(', ');
      notifyRoles({
        modules: ['Operations', 'Sales Team'],
        userIds: vendorId ? [vendorId] : [],
        type: 'material_stock',
        title: 'Existing Material Stock Available',
        message: `${sticker.hotelName} already has ${sticker.stickerType} material in Inventory — ${summary}. Check Material Stocks before starting a new design/print run.`,
        link: '/inventory',
      }).catch(() => {});
    }
  }

  res.status(201).json({ success: true, data: sticker });
});

// Move an existing design task to a different Vendor Team Member (e.g. the original
// vendor is unavailable, or work needs to move to whoever is now marked "Auto" for
// this type). Only vendorId changes — designFileUrl/status/approvals are untouched,
// so the new vendor immediately sees whatever design/approval state was already there
// (including a design already approved via HotelDesign reuse) instead of starting over.
exports.reassignStickerRequest = asyncHandler(async (req, res, next) => {
  const sticker = await StickerRequest.findById(req.params.id);
  if (!sticker) return next(new AppError('Sticker request not found', 404));

  let vendorId = req.body.vendorId || null;
  let newVendorName = '';
  if (vendorId) {
    const asTeamMember = await User.findOne({ _id: vendorId, department: 'Vendors' }).select('_id fullName').lean();
    if (!asTeamMember) return next(new AppError('Selected user is not a Vendor Team Member', 400));
    newVendorName = asTeamMember.fullName || '';
  }

  const previousVendorId = sticker.vendorId;
  let previousVendorName = '';
  if (previousVendorId) {
    const prevUser = await User.findById(previousVendorId).select('fullName').lean();
    previousVendorName = prevUser?.fullName || '';
  }

  sticker.vendorId = vendorId;
  sticker.switchHistory = sticker.switchHistory || [];
  sticker.switchHistory.push({
    from: previousVendorId || null,
    fromName: previousVendorName,
    to: vendorId || null,
    toName: newVendorName,
    by: req.user._id,
    byName: req.user.fullName,
    at: new Date(),
  });
  await sticker.save();

  notifyRoles({
    modules: ['Operations', 'Sales Team'],
    userIds: vendorId ? [vendorId] : [],
    type: 'task',
    title: 'Design Task Reassigned',
    message: `${sticker.stickerType || 'Sticker'} request for "${sticker.product || 'product'}" was reassigned to you`,
    link: '/operations',
  }).catch(() => {});

  res.status(200).json({ success: true, data: sticker });
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

exports.uploadStickerInvoice = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an invoice file', 400));
  const sticker = await StickerRequest.findByIdAndUpdate(
    req.params.id,
    {
      invoiceFile: {
        name: req.file.originalname || req.file.filename || 'invoice',
        url: req.file.path,
        public_id: req.file.filename || '',
      },
    },
    { new: true }
  );
  if (!sticker) return next(new AppError('Sticker request not found', 404));
  res.status(200).json({ success: true, data: sticker });
});

exports.updateStickerStatus = asyncHandler(async (req, res, next) => {
  const update = { status: req.body.status, dispatchedToOps: req.body.dispatchedToOps };
  // Vendor re-sending a reworked design after a rejection — clear the old rejection
  // reason/flags so the (now stale) reason stops showing once a fresh approval round starts.
  if (req.body.status === 'Waiting for Approval') {
    update.salesRejected = false;
    update.salesRejectReason = '';
    update.opsHeadRejected = false;
    update.opsHeadRejectReason = '';
  }
  const sticker = await StickerRequest.findByIdAndUpdate(req.params.id, update, { new: true });
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

// Sends the "Design Confirmation" WhatsApp template (configured in Integrations →
// WhatsApp → Event Mapping) to both the order's sales person and the customer, with the
// uploaded design PDF attached — fired from the WhatsApp button shown after a Sticker/Box/
// Frosted Ziplock/Butter Paper design has been sent for approval. Same recipient-resolution
// pattern as dispatch.controller.js's sendDispatchNotifyWhatsApp.
exports.sendDesignConfirmationWhatsApp = asyncHandler(async (req, res, next) => {
  const sticker = await StickerRequest.findById(req.params.id).populate('orderId');
  if (!sticker) return next(new AppError('Sticker request not found', 404));

  const order = sticker.orderId;
  if (!order) return next(new AppError('Order not found for this design', 404));

  if (!sticker.designFileUrl) {
    return next(new AppError('Upload a design (PDF) before sending the confirmation', 400));
  }

  const event = await WhatsAppEvent.findOne({ key: 'design-confirmation' }).lean();
  const mapping = event
    ? await WhatsAppEventMapping.findOne({ eventId: event._id, isEnabled: true })
        .populate('templateId', 'name language')
        .lean()
    : null;
  if (!mapping?.templateId) {
    return next(new AppError('Set up the "Design Confirmation" WhatsApp template first (Integrations → WhatsApp → Event Mapping)', 400));
  }

  const { name: templateName, language = 'en' } = mapping.templateId;
  const fieldValues = {
    orderCode: order.orderCode || '',
    customerName: order.clientName || '',
    salesPersonName: order.salesPerson || '',
    productName: sticker.product || '',
    packagingType: sticker.stickerType || '',
    companyName: process.env.COMPANY_NAME || 'HNG',
  };
  const parameters = {};
  (mapping.variables || []).forEach((v) => {
    if (v.templateVariable && v.eventField) parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
  });

  const documentUrl = sticker.designFileUrl;
  const documentFilename = `design-${order.orderCode || sticker._id}.pdf`;

  const recipients = [];
  if (order.clientPhone) recipients.push({ label: order.clientName || 'Customer', phone: order.clientPhone });
  if (order.salesPerson) {
    const salesUser = await User.findOne({ fullName: order.salesPerson }).select('mobile').lean();
    if (salesUser?.mobile) recipients.push({ label: order.salesPerson, phone: salesUser.mobile });
  }
  if (!recipients.length) {
    return next(new AppError('No phone number found for the sales person or customer on this order', 400));
  }

  const results = [];
  for (const r of recipients) {
    const result = await sendMessage({ to: r.phone, templateName, language, parameters, documentUrl, documentFilename });
    results.push({ label: r.label, phone: r.phone, success: result.success, error: result.error });
  }

  const sent = results.filter((r) => r.success);
  if (!sent.length) {
    return next(new AppError(results[0]?.error || 'Failed to send WhatsApp message', 502));
  }

  res.status(200).json({
    success: true,
    message: `Design confirmation sent to ${sent.map((r) => r.label).join(' & ')}`,
    data: results,
  });
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
    // Auto-save approved design to HotelDesign for reuse in future orders
    if ((sticker.hotelLogo || sticker.hotelName) && sticker.designFileUrl) {
      const HotelDesign = require('../../models/HotelDesign');
      const designType = sticker.stickerType === 'Box' ? 'Box'
        : sticker.stickerType === 'Frosted Ziplock' ? 'Frosted Ziplock'
        : sticker.stickerType === 'Butter Paper' ? 'Butter Paper'
        : sticker.stickerType === 'Wooden Brush' ? 'Wooden Brush'
        : sticker.stickerType === 'Other' ? 'Other'
        : 'Sticker';
      HotelDesign.findOneAndUpdate(
        { hotelName: sticker.hotelLogo || sticker.hotelName, product: sticker.product, type: designType },
        { designFileUrl: sticker.designFileUrl, approved: true, createdBy: userId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch(() => {});
    }
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

// Either side (Sales or Ops Head) can reject the uploaded design instead of approving it.
// Sends it back to the design vendor with a reason — does NOT touch the other side's own
// approve/reject flow, but DOES reset both salesApproved/opsHeadApproved so the reworked
// design needs a fresh sign-off from both sides once re-sent for approval.
exports.rejectStickerRequest = asyncHandler(async (req, res, next) => {
  const sticker = await StickerRequest.findById(req.params.id);
  if (!sticker) return next(new AppError('Sticker request not found', 404));
  const role = req.body.role; // 'sales' | 'opsHead'
  const reason = (req.body.reason || '').trim();
  if (!reason) return next(new AppError('Please provide a reason for rejecting the design', 400));
  if (role !== 'sales' && role !== 'opsHead') return next(new AppError('role must be "sales" or "opsHead"', 400));
  const now = new Date();
  const userId = req.user?._id;

  if (role === 'sales') {
    sticker.salesRejected = true;
    sticker.salesRejectedAt = now;
    sticker.salesRejectedBy = userId;
    sticker.salesRejectReason = reason;
  } else {
    sticker.opsHeadRejected = true;
    sticker.opsHeadRejectedAt = now;
    sticker.opsHeadRejectedBy = userId;
    sticker.opsHeadRejectReason = reason;
  }
  // A rejected design is no longer approved by either side — the vendor's rework needs
  // fresh sign-off from both once it's re-sent, even if the other side had already OK'd
  // the version that just got rejected.
  sticker.salesApproved = false;
  sticker.opsHeadApproved = false;
  sticker.status = 'Design Change';
  await sticker.save({ validateBeforeSave: false });
  await sticker.populate('salesRejectedBy', 'fullName');
  await sticker.populate('opsHeadRejectedBy', 'fullName');

  notifyRoles({
    modules: ['Operations', 'Sales Team'],
    userIds: sticker.vendorId ? [sticker.vendorId] : [],
    type: 'task',
    title: 'Design Rejected — Rework Needed',
    message: `${sticker.stickerType || 'Sticker'} for "${sticker.product || 'product'}" rejected by ${role === 'sales' ? 'Sales' : 'Operations'}: ${reason}`,
    link: '/operations',
  }).catch(() => {});

  res.status(200).json({ success: true, data: sticker });
});

// ─── Queue row visibility (Sticker/Box/Ziplock/Butter Paper/Wooden Brush/Other tabs) ─────
// Hides a single order-line row from ONE packaging queue tab only — it does not touch
// the Order or its items, so dispatch/Sales/every other module is unaffected. Admin/
// Management department (or Super Admin role) only, mirroring the Task delete gate.
const HiddenQueueRow = require('../../models/HiddenQueueRow');

exports.getHiddenQueueRows = asyncHandler(async (req, res) => {
  const rows = await HiddenQueueRow.find({ deletedAt: { $ne: null } }).lean();
  res.status(200).json({ success: true, data: rows });
});

exports.hideQueueRow = asyncHandler(async (req, res, next) => {
  const canDelete = req.user && (
    req.user.department === 'Admin' ||
    req.user.department === 'Management' ||
    req.user.role === 'Super Admin'
  );
  if (!canDelete) {
    return next(new AppError('Only Admin/Management department or Super Admin can remove queue rows', 403));
  }
  const { orderId, rowKey, tab, orderCode, product, qty } = req.body;
  if (!orderId || !rowKey) return next(new AppError('orderId and rowKey are required', 400));
  const doc = await HiddenQueueRow.findOneAndUpdate(
    { orderId, rowKey },
    { orderId, rowKey, tab, orderCode, product, qty, deletedAt: Date.now(), deletedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({ success: true, data: doc });
});
