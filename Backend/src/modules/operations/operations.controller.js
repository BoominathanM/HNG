const Order = require('../../models/Order');
const StickerRequest = require('../../models/StickerRequest');
const Task = require('../../models/Task');
const User = require('../../models/User');
const CompanySettings = require('../../models/CompanySettings');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { ROLE_TO_STICKER_TYPE } = require('../../utils/alertConfigQueries');
const { sendMessage } = require('../../services/whatsAppService');
const { computeTaskEstimate } = require('../../utils/taskTime');
const { resolveOrderPaymentStatus } = require('../../utils/syncOrderPayment');
const { checkTaskQuantityOverflow } = require('../../utils/taskQuantity');

// ─── ORDER MANAGEMENT ─────────────────────────────────────────────────────────
// Visibility scoping (same rule as Sales getLeads/Task Management getTasks):
// - Admin / Super Admin / Manager / Head (role contains 'Manager' or 'Head'): all orders
// - Everyone else (Executive, etc.): only orders they created, are assigned to, or are the salesPerson on
function applyOrderVisibility(user, filter) {
  if (user && user.role !== 'Super Admin' && user.role !== 'Admin') {
    const role = user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
      const visibility = [{ createdBy: user._id }, { assignedTo: user._id }];
      const myName = user.fullName || user.name;
      if (myName) visibility.push({ salesPerson: myName });
      filter.$or = visibility;
    }
  }
  return filter;
}

exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  applyOrderVisibility(req.user, filter);
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

  res.status(200).json({ success: true, total, page, data: orders });
});

exports.getTodaysOrders = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const filter = applyOrderVisibility(req.user, { createdAt: { $gte: start, $lte: end }, deletedAt: null });
  const orders = await Order.find(filter);
  res.status(200).json({ success: true, data: orders });
});

exports.getTodaysDispatch = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const filter = applyOrderVisibility(req.user, {
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
    if (taskedIndices.has(i)) {
      skippedProducts.push(it.itemName);
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
      qty: it.qty,
      clientName: order.clientName,
      status: 'Pending',
      paymentStatus: orderPaymentStatus,
      assignedTo: assignment?.assignedTo || undefined,
      assigneeName: assignment?.assigneeName || undefined,
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
  // only see requests routed to them personally — not every teammate sharing their
  // role — so switching who's marked "Auto" actually redirects the work, not just
  // the badge. Legacy requests created before this existed (vendorId still null)
  // stay visible to any teammate of that role so nothing already in flight vanishes.
  const myStickerType = req.user && ROLE_TO_STICKER_TYPE[req.user.role];
  if (req.user?.department === 'Vendors' && myStickerType) {
    filter.$or = [
      { vendorId: req.user._id },
      { vendorId: null, stickerType: myStickerType },
    ];
  }
  const stickers = await StickerRequest.find(filter)
    .populate('orderId', 'orderCode clientName')
    .populate('salesApprovedBy', 'fullName')
    .populate('opsHeadApprovedBy', 'fullName')
    .populate('vendorId', 'fullName email')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: stickers });
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
