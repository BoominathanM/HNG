const Lead = require('../../models/Lead');
const Quotation = require('../../models/Quotation');
const Negotiation = require('../../models/Negotiation');
const Order = require('../../models/Order');
const Complaint = require('../../models/Complaint');
const Party = require('../../models/Party');
const User = require('../../models/User');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const MaterialStock = require('../../models/MaterialStock');
const DispatchRecord = require('../../models/DispatchRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { cloudinary } = require('../../config/cloudinary');
const { notifyRoles } = require('../../utils/notify');
const { resolveMaterialStock } = require('../../utils/materialStockMatch');
const { syncOrderTasksPayment, syncOrderPaymentCollection } = require('../../utils/syncOrderPayment');
const { buildOrderEditHistory } = require('../../utils/orderEditHistory');
const { buildLeadEditHistory } = require('../../utils/leadEditHistory');

// Lead.category defaults to 'Hotel' but leads created before this field existed have no
// `category` stored in Mongo at all — a raw { category: 'Hotel' } match would wrongly
// exclude them, so 'Hotel' also matches missing/null.
function categoryMatch(category) {
  return category === 'Hotel'
    ? { $or: [{ category: 'Hotel' }, { category: { $exists: false } }, { category: null }] }
    : { category };
}

// The "Assign Lead To" field on the Lead form only stores the sales person's display name
// (salesPerson); safety net so assignedTo (used by Order/Lead visibility scoping and by
// convertToOrder's assignedTo fallback) stays populated even if a caller omits it.
async function resolveAssignedTo(body) {
  if (body.assignedTo || !body.salesPerson) return body.assignedTo;
  const match = await User.findOne({ fullName: body.salesPerson }).select('_id');
  return match?._id;
}

// ─── LEADS ───────────────────────────────────────────────────────────────────
exports.getLeads = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  const andConds = [];
  if (req.query.status) {
    filter.status = req.query.status;
  } else {
    // Cross-reference orders: exclude any lead whose linked order is dispatched/delivered
    const dispatchedLeadIds = await Order.distinct('leadId', {
      deletedAt: null,
      status: { $in: ['Dispatched', 'Delivered'] },
      leadId: { $ne: null },
    });
    // Also exclude 'Converted' here so a lead that already became an order doesn't
    // linger in the Leads list for roles whose Orders view is scoped by assignedTo.
    filter.status = { $nin: ['Dispatched', 'Delivered', 'Converted'] };
    if (dispatchedLeadIds.length) {
      filter._id = { $nin: dispatchedLeadIds };
    }
  }
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.category) {
    const cm = categoryMatch(req.query.category);
    if (cm.$or) andConds.push(cm); else Object.assign(filter, cm);
  }
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    andConds.push({ $or: [{ hotelName: re }, { phone: re }, { locationCity: re }] });
  }
  // Visibility scoping:
  // - Admin / Super Admin: all leads
  // - Manager or Head (role contains 'Manager' or 'Head'): all leads
  // - Everyone else (Executive, etc.): only leads they created, are assigned to, or are named as salesPerson
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const role = req.user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
      const visibility = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
      const myName = req.user.fullName || req.user.name;
      if (myName) visibility.push({ salesPerson: myName });
      andConds.push({ $or: visibility });
    }
  }
  if (andConds.length) filter.$and = andConds;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [leads, total] = await Promise.all([
    Lead.find(filter).populate('assignedTo', 'fullName email').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Lead.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: leads });
});

exports.getLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null }).populate('assignedTo', 'fullName email');
  if (!lead) return next(new AppError('Lead not found', 404));
  res.status(200).json({ success: true, data: lead });
});

exports.createLead = asyncHandler(async (req, res) => {
  const initialStatus = req.body.status || 'Cold';
  const [leadCode, assignedTo] = await Promise.all([generateCode('LEAD'), resolveAssignedTo(req.body)]);
  const lead = await Lead.create({
    ...req.body,
    assignedTo,
    leadCode,
    createdBy: req.user._id,
    statusHistory: [{ status: initialStatus, changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Lead created' }],
  });
  notifyRoles({ modules: ['Sales Team'], userIds: [lead.assignedTo], type: 'system', title: 'New Lead Created', message: `New lead: ${lead.hotelName} (${lead.leadCode}) — Status: ${initialStatus}`, link: '/sales' }).catch(() => {});
  res.status(201).json({ success: true, data: lead });
});

exports.updateLead = asyncHandler(async (req, res, next) => {
  const [existingLead, assignedTo] = await Promise.all([
    Lead.findOne({ _id: req.params.id, deletedAt: null }).lean(),
    resolveAssignedTo(req.body),
  ]);
  if (!existingLead) return next(new AppError('Lead not found', 404));

  const patch = { ...req.body, ...(assignedTo ? { assignedTo } : {}) };
  const editHistoryEntries = buildLeadEditHistory(existingLead, patch, req.user);

  const update = { $set: patch };
  if (editHistoryEntries.length) update.$push = { editHistory: { $each: editHistoryEntries } };

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    update,
    { new: true, runValidators: false }
  );
  if (!lead) return next(new AppError('Lead not found', 404));
  res.status(200).json({ success: true, data: lead });
});

exports.deleteLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
  if (!lead) return next(new AppError('Lead not found', 404));
  lead.deletedAt = Date.now();
  await lead.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Lead deleted' });
});

exports.updateLeadStatus = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      $set: { status: req.body.status },
      $push: {
        statusHistory: {
          status: req.body.status,
          changedAt: new Date(),
          by: req.user?._id,
          byName: req.user?.fullName || req.user?.name || 'System',
          note: req.body.note || '',
        },
      },
    },
    { new: true }
  );
  if (!lead) return next(new AppError('Lead not found', 404));
  const notableStatuses = ['Negotiation', 'Converted', 'Dispatched', 'Delivered', 'Complaint'];
  if (notableStatuses.includes(req.body.status)) {
    notifyRoles({ modules: ['Sales Team'], userIds: [lead.assignedTo], type: 'system', title: 'Lead Status Updated', message: `${lead.hotelName} (${lead.leadCode}) moved to ${req.body.status}`, link: '/sales' }).catch(() => {});
  }
  res.status(200).json({ success: true, data: lead });
});

// Auto-fetch existing hotel details for "Old Hotel" lead creation (by name + optional branch).
// Scoped to `category` when provided so a same-named Hotel and Hospital lead never cross-fill.
exports.getHotelByName = asyncHandler(async (req, res) => {
  const name = req.query.name;
  const branch = req.query.branch;
  const category = req.query.category;
  if (!name) return res.status(200).json({ success: true, data: null });
  const nameRe = new RegExp(`^${name.trim()}$`, 'i');
  // Prefer the most recent matching lead (richest detail); fall back to a party record.
  const leadFilter = { hotelName: nameRe, deletedAt: null };
  if (branch) leadFilter.branch = new RegExp(`^${branch.trim()}$`, 'i');
  if (category) Object.assign(leadFilter, categoryMatch(category));
  let lead = await Lead.findOne(leadFilter).sort('-createdAt').lean();
  if (!lead) {
    const fallbackFilter = { hotelName: nameRe, deletedAt: null };
    if (category) Object.assign(fallbackFilter, categoryMatch(category));
    lead = await Lead.findOne(fallbackFilter).sort('-createdAt').lean();
  }
  let party = null;
  if (!lead) party = await Party.findOne({ name: nameRe, deletedAt: null }).lean();
  const source = lead || party;
  if (!source) return res.status(200).json({ success: true, data: null });
  res.status(200).json({ success: true, data: source, matchedOn: lead ? 'lead' : 'party' });
});

// Distinct existing hotel names (for the Old-Hotel selector), scoped to the selected
// Category so a Hospital search never surfaces Hotel names and vice versa.
exports.getHotelNames = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.category) Object.assign(filter, categoryMatch(req.query.category));
  const names = await Lead.distinct('hotelName', filter);
  res.status(200).json({ success: true, data: names.filter(Boolean).sort() });
});

// Unified reminders feed: lead follow-ups, order status, and payment-due reminders.
exports.getReminders = asyncHandler(async (req, res) => {
  const now = new Date();
  // Same visibility scope as getLeads: non-admins only see follow-ups for leads
  // they created or that are assigned to them.
  const leadFilter = {
    deletedAt: null,
    $or: [
      { followupDate: { $ne: null } },
      // Payment Due only surfaces for leads where the user opted in via
      // "Set reminder for payment terms" on that lead.
      { paymentReminderDate: { $ne: null }, paymentTermsReminder: true },
    ],
  };
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const visibility = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    const myName = req.user.fullName || req.user.name;
    if (myName) visibility.push({ salesPerson: myName });
    leadFilter.$and = [{ $or: leadFilter.$or }, { $or: visibility }];
    delete leadFilter.$or;
  }
  const [leads, orders] = await Promise.all([
    Lead.find(leadFilter)
      .select('hotelName followupDate followupTime status assignedTo leadCode paymentReminderDate paymentTermsReminder paymentTerms')
      .populate('assignedTo', 'fullName').sort('followupDate').limit(100).lean(),
    Order.find({ deletedAt: null }).select('orderCode clientName status balance total amount gstAmount paidAmount advancePaidAmount advancePaid paymentCollection paymentReminderDate expectedDeliveryDate items products').sort('-createdAt').limit(200).lean(),
  ]);

  const reminders = [];
  leads.forEach((l) => {
    if (l.followupDate) {
      reminders.push({
        id: `lead-${l._id}`, kind: 'Lead Follow-up', refCode: l.leadCode,
        title: `Follow up: ${l.hotelName}`, status: l.status,
        dueDate: l.followupDate, time: l.followupTime,
        owner: l.assignedTo?.fullName || '—',
        overdue: l.followupDate && new Date(l.followupDate) < now,
      });
    }
    if (l.paymentReminderDate && l.paymentTermsReminder) {
      reminders.push({
        id: `lead-pay-${l._id}`, kind: 'Payment Due', refCode: l.leadCode,
        title: `Payment reminder: ${l.hotelName}`, status: l.status,
        dueDate: l.paymentReminderDate,
        owner: l.assignedTo?.fullName || '—',
        overdue: new Date(l.paymentReminderDate) < now,
      });
    }
  });
  orders.forEach((o) => {
    // Compute total from items so a stale/double-counted stored total is ignored
    const _items = (o.items?.length ? o.items : (o.products || []));
    const _subtotal = _items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0), 0);
    const _gstFromItems = _items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
    const _gst = _gstFromItems > 0 ? _gstFromItems : (Number(o.gstAmount) || 0);
    const orderTotal = _subtotal > 0 ? Math.round((_subtotal + _gst) * 100) / 100 : (Number(o.total) || Number(o.amount) || 0);
    const collTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const paidAmt = collTotal > 0 ? collTotal : (Number(o.paidAmount) || Number(o.advancePaidAmount) || Number(o.advancePaid) || 0);
    const liveBalance = Math.max(0, orderTotal - paidAmt);
    if (['Payment Pending'].includes(o.status) || liveBalance > 0) {
      reminders.push({
        id: `pay-${o._id}`, kind: 'Payment Due', refCode: o.orderCode,
        title: `Payment pending: ${o.clientName}`, status: o.status,
        dueDate: o.paymentReminderDate || o.expectedDeliveryDate, amount: liveBalance,
        overdue: o.paymentReminderDate && new Date(o.paymentReminderDate) < now,
      });
    }
    if (['In Production', 'Dispatch Ready'].includes(o.status)) {
      reminders.push({
        id: `ord-${o._id}`, kind: 'Order Status', refCode: o.orderCode,
        title: `${o.clientName} — ${o.status}`, status: o.status,
        dueDate: o.expectedDeliveryDate,
        overdue: o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < now,
      });
    }
  });
  reminders.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));
  res.status(200).json({ success: true, total: reminders.length, data: reminders });
});

exports.assignLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { assignedTo: req.body.assignedTo },
    { new: true }
  ).populate('assignedTo', 'fullName email');
  if (!lead) return next(new AppError('Lead not found', 404));
  res.status(200).json({ success: true, data: lead });
});

// ─── QUOTATIONS ───────────────────────────────────────────────────────────────
exports.getQuotations = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.status) filter.status = req.query.status;
  const quotations = await Quotation.find(filter).populate('leadId', 'hotelName leadType').sort('-createdAt');
  const convertedQuotIds = await Order.distinct('quotationId', { deletedAt: null, quotationId: { $ne: null } });
  const convertedSet = new Set(convertedQuotIds.map(id => String(id)));
  const active = quotations.filter(q => !convertedSet.has(String(q._id)));
  res.status(200).json({ success: true, total: active.length, data: active });
});

exports.createQuotation = asyncHandler(async (req, res) => {
  const quotCode = await generateCode('QT');
  const q = await Quotation.create({ ...req.body, quotCode, createdBy: req.user._id });
  notifyRoles({ modules: ['Sales Team'], type: 'system', title: 'Quotation Created', message: `Quotation ${q.quotCode} created for ${q.clientName}`, link: '/sales' }).catch(() => {});
  res.status(201).json({ success: true, data: q });
});

exports.updateQuotation = asyncHandler(async (req, res, next) => {
  // newPaymentEntry is an out-of-band signal (not a Quotation schema field) the client
  // sends alongside a payment save so we know exactly which entry is new — diffing
  // req.body.paymentCollection against the stored array doesn't work because the client
  // sometimes rebuilds that array from whichever of order/lead/quotation has the fullest
  // history (see Billing's `sumPaid`), which isn't reliably the quotation's own array.
  const { newPaymentEntry, ...body } = req.body;

  const quotation = await Quotation.findByIdAndUpdate(
    req.params.id,
    { $set: body },
    { new: true, runValidators: false }
  );
  if (!quotation) return next(new AppError('Quotation not found', 404));

  // If this update recorded a payment (Billing's Quotation-in-Process tab), mirror the
  // new entry onto the linked Order so Sales — which reads Order.paymentCollection
  // directly, independent of the quotation — reflects it without depending on the
  // frontend to find and patch the right order itself.
  if (newPaymentEntry) {
    const linkedOrder = await Order.findOne({
      $or: [{ quotationId: quotation._id }, ...(quotation.leadId ? [{ leadId: quotation.leadId }] : [])],
      deletedAt: null,
    }).sort('-createdAt');
    if (linkedOrder) {
      await syncOrderPaymentCollection(linkedOrder._id, newPaymentEntry).catch(() => {});
      await syncOrderTasksPayment(linkedOrder._id).catch(() => {});
    }
  }

  res.status(200).json({ success: true, data: quotation });
});

exports.deleteQuotation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findOne({ _id: req.params.id, deletedAt: null });
  if (!quotation) return next(new AppError('Quotation not found', 404));
  quotation.deletedAt = Date.now();
  quotation.deletedBy = req.user._id;
  await quotation.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Quotation deleted' });
});

exports.convertToNegotiation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return next(new AppError('Quotation not found', 404));
  const negCode = await generateCode('NEG');
  const qObj = quotation.toObject ? quotation.toObject() : { ...quotation._doc };
  // Copy all non-schema fields stored on the quotation (location, contactPerson, phone, etc.)
  const extraFields = {};
  const knownFields = ['_id','__v','quotCode','leadId','clientName','quoteDate','amount','gstAmount','total','advancePaid','balance','type','status','items','note','deletedAt','createdBy','createdAt','updatedAt'];
  Object.keys(qObj).forEach(k => { if (!knownFields.includes(k)) extraFields[k] = qObj[k]; });
  // Resolve kit/product details from the quotation, falling back to the originating lead, so the
  // negotiation never loses the kit summary (display unit, kit price, kit orders, …) even when the
  // quotation was created before these fields were captured. Mirrors convertToOrder's mapping.
  let lead = null;
  if (quotation.leadId) lead = await Lead.findById(quotation.leadId).lean();
  const resolveField = (...sources) => sources.find(v => v != null && v !== '');
  const negotiation = await Negotiation.create({
    ...extraFields,
    negCode,
    quotationId: quotation._id,
    leadId: quotation.leadId,
    clientName: quotation.clientName,
    amount: req.body.amount || quotation.amount,
    gstAmount: req.body.gstAmount || quotation.gstAmount,
    total: req.body.total || quotation.total,
    advancePaid: req.body.advancePaid || quotation.advancePaid || 0,
    // Recompute balance from the effective total so kit-aware totals propagate correctly.
    balance: (req.body.total || quotation.total || 0) - (req.body.advancePaid || quotation.advancePaid || 0),
    type: quotation.type,
    items: quotation.items,
    // ─── Kit / product composition (explicit so it survives even if not on the quotation) ───
    products: (qObj.products && qObj.products.length ? qObj.products : lead?.products) || [],
    kitOrders: (qObj.kitOrders && qObj.kitOrders.length ? qObj.kitOrders : lead?.kitOrders) || [],
    selectedKits: (qObj.selectedKits && qObj.selectedKits.length ? qObj.selectedKits : lead?.selectedKits) || [],
    selectedKit: resolveField(qObj.selectedKit, lead?.selectedKit),
    productType: resolveField(qObj.productType, lead?.productType),
    displayUnit: resolveField(qObj.displayUnit, lead?.displayUnit, qObj.kitDisplayUnit, lead?.kitDisplayUnit),
    kitDisplayUnit: resolveField(qObj.kitDisplayUnit, lead?.kitDisplayUnit, qObj.displayUnit, lead?.displayUnit),
    kitDisplayUnitType: resolveField(qObj.kitDisplayUnitType, lead?.kitDisplayUnitType),
    kitSize: resolveField(qObj.kitSize, lead?.kitSize),
    kitSticker: resolveField(qObj.kitSticker, lead?.kitSticker),
    kitLogo: resolveField(qObj.kitLogo, lead?.kitLogo),
    kitPrinting: resolveField(qObj.kitPrinting, lead?.kitPrinting),
    kitPrice: qObj.kitPrice != null ? qObj.kitPrice : (lead?.kitPrice != null ? lead.kitPrice : undefined),
    kitOverallQty: qObj.kitOverallQty != null ? qObj.kitOverallQty : (lead?.kitOverallQty != null ? lead.kitOverallQty : undefined),
    packagingIncludes: resolveField(qObj.packagingIncludes, lead?.packagingIncludes),
    packagingIncludesQty: resolveField(qObj.packagingIncludesQty, lead?.packagingIncludesQty),
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: negotiation });
});

// Convert a lead directly into a negotiation (skips the quotation step).
exports.convertLeadToNegotiation = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
  if (!lead) return next(new AppError('Lead not found', 404));
  const negCode = await generateCode('NEG');
  const items = (req.body.items || req.body.products || []).map((p) => ({
    // Spread the full product first so dynamic specs (shape, fragrance, stickerShape,
    // productAttributes, attachments, specification, …) survive the conversion. The
    // negotiation item sub-schema is strict:false, so everything round-trips to the order
    // and on to Operations. (Previously this hand-picked map silently dropped them.)
    ...p,
    itemName: p.itemName || p.name,
    unit: p.unit,
    price: Number(p.price ?? p.rate) || 0,
    qty: Number(p.qty) || 0,
    lineTotal: Number(p.lineTotal) || (Number(p.qty) || 0) * (Number(p.price ?? p.rate) || 0),
    // Preserve packaging/logo fields so they survive the negotiation → order conversion
    logoType: p.logoType || '',
    packaging: p.packaging || p.packingMaterial || '',
    packingMaterial: p.packingMaterial || p.packaging || '',
    sticker: p.sticker || '',
    // Carry the printing flag so Operations can route the item (Print tab → packaging tab)
    printing: p.printing || '',
    size: p.size || '',
    material: p.material || p.materialCategory || '',
    gst: Number(p.gst ?? p.gstPercent) || 0,
    isKit: p.isKit || false,
    kitId: p.kitId || '',
    kitName: p.kitName || '',
    kitType: p.kitType || '',
    // Order-composition category (personalized | separate_kit | separate_product)
    category: p.category || '',
  }));
  const negotiation = await Negotiation.create({
    negCode,
    leadId: lead._id,
    clientName: req.body.clientName || lead.hotelName || lead.clientName || 'Client',
    amount: req.body.amount || req.body.totalAmount || 0,
    gstAmount: req.body.gstAmount || 0,
    total: req.body.total || req.body.totalAmount || 0,
    type: req.body.billType === 'GST' ? 'GST' : 'Non-GST',
    items,
    // Carry the full product composition (rich Sales UI + 3-bucket totals read these)
    // Use length check instead of || so an empty [] from a hotel-only lead doesn't win over
    // products that were added later (empty array is truthy, so `[] || lead.products` = []).
    products: (req.body.products?.length > 0 ? req.body.products : null) ?? (lead.products?.length > 0 ? lead.products : null) ?? [],
    kitOrders: (req.body.kitOrders?.length > 0 ? req.body.kitOrders : null) ?? (lead.kitOrders?.length > 0 ? lead.kitOrders : null) ?? [],
    selectedKits: (req.body.selectedKits?.length > 0 ? req.body.selectedKits : null) ?? (lead.selectedKits?.length > 0 ? lead.selectedKits : null) ?? [],
    productType: req.body.productType || lead.productType,
    kitDisplayUnit: req.body.kitDisplayUnit || lead.kitDisplayUnit || lead.displayUnit || '',
    displayUnit: req.body.displayUnit || lead.displayUnit || lead.kitDisplayUnit || '',
    kitDisplayUnitType: req.body.kitDisplayUnitType || lead.kitDisplayUnitType || '',
    kitSize: req.body.kitSize || lead.kitSize || '',
    kitSticker: req.body.kitSticker || lead.kitSticker || undefined,
    kitLogo: req.body.kitLogo || lead.kitLogo || undefined,
    kitPrinting: req.body.kitPrinting || lead.kitPrinting || undefined,
    kitPrice: req.body.kitPrice != null ? Number(req.body.kitPrice) : (lead.kitPrice != null ? Number(lead.kitPrice) : undefined),
    kitOverallQty: req.body.kitOverallQty != null ? Number(req.body.kitOverallQty) : (lead.kitOverallQty != null ? Number(lead.kitOverallQty) : undefined),
    // Copy lead contact details so they flow through to the eventual order
    hotelName: req.body.hotelName || lead.hotelName || '',
    category: req.body.category || lead.category || '',
    email: req.body.email || lead.email || '',
    location: lead.location || lead.locationCity,
    phone: lead.phone,
    contactPerson: lead.contactPerson,
    billingName: lead.billingName || lead.hotelName,
    gstNumber: lead.gstNumber,
    gstPercent: lead.gstPercent,
    salesPerson: lead.salesPerson,
    billType: lead.billType,
    detailedAddress: lead.detailedAddress || lead.address,
    city: lead.city,
    state: lead.state,
    pincode: lead.pincode,
    deliveryBy: lead.deliveryBy,
    transportationBy: lead.transportationBy,
    forwardingCharge: lead.forwardingCharge,
    forwardingChargeAmount: lead.forwardingChargeAmount || 0,
    paymentTerms: lead.paymentTerms,
    // Alternative contact details — Lead uses altName/altRole/altNumber; carry to negotiation
    alternativeName: lead.altName || lead.alternativeName || '',
    alternativeRole: lead.altRole || lead.alternativeRole || '',
    alternativePhone: lead.altNumber || lead.alternativePhone || '',
    pocDesignation: lead.pocDesignation || '',
    hotelType: lead.hotelType || '',
    rooms: lead.numRooms || lead.rowsInHotel,
    occupancy: lead.generalOccupancy,
    branch: lead.branch || '',
    destination: lead.destination || '',
    // Kit packaging includes — critical for personalized kit orders to survive to Order
    packagingIncludes: (req.body.packagingIncludes?.length > 0 ? req.body.packagingIncludes : null) ?? (lead.packagingIncludes?.length > 0 ? lead.packagingIncludes : null) ?? [],
    packagingIncludesQty: (Object.keys(req.body.packagingIncludesQty || {}).length > 0 ? req.body.packagingIncludesQty : null) ?? lead.packagingIncludesQty ?? {},
    // Emergency / partial-delivery data so it survives lead → negotiation → order
    splitDates: req.body.splitDates || lead.splitDates || [],
    isEmergency: !!(req.body.isEmergency) || !!(lead.isEmergency) || !!(lead.splitDates?.length),
    isUrgent: !!(req.body.isUrgent) || !!(lead.isUrgent) || !!(lead.splitDates?.length),
    createdBy: req.user._id,
  });
  await Lead.findByIdAndUpdate(lead._id, { status: 'Negotiation' });
  res.status(201).json({ success: true, data: negotiation });
});

// ─── NEGOTIATIONS ──────────────────────────────────────────────────────────────
exports.updateNegotiation = asyncHandler(async (req, res, next) => {
  const negotiation = await Negotiation.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: false }
  );
  if (!negotiation) return next(new AppError('Negotiation not found', 404));

  // Keep the linked Quotation in sync so negotiated pricing flows to Billing
  // (Billing's "Order in Process" tab reads from Quotation records).
  if (negotiation.quotationId) {
    const quotSync = {};
    if (req.body.amount !== undefined) quotSync.amount = req.body.amount;
    if (req.body.gstAmount !== undefined) quotSync.gstAmount = req.body.gstAmount;
    if (req.body.total !== undefined) {
      quotSync.total = req.body.total;
      const advance = req.body.advancePaid !== undefined ? req.body.advancePaid : negotiation.advancePaid || 0;
      quotSync.balance = req.body.total - advance;
    }
    if (req.body.advancePaid !== undefined) quotSync.advancePaid = req.body.advancePaid;
    if (req.body.items !== undefined) quotSync.items = req.body.items;
    if (Object.keys(quotSync).length) {
      await Quotation.findByIdAndUpdate(negotiation.quotationId, { $set: quotSync }, { runValidators: false });
    }
  }

  res.status(200).json({ success: true, data: negotiation });
});

exports.deleteNegotiation = asyncHandler(async (req, res, next) => {
  const negotiation = await Negotiation.findOne({ _id: req.params.id, deletedAt: null });
  if (!negotiation) return next(new AppError('Negotiation not found', 404));
  negotiation.deletedAt = Date.now();
  negotiation.deletedBy = req.user._id;
  await negotiation.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Negotiation deleted' });
});

exports.getNegotiations = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.leadId) filter.leadId = req.query.leadId;
  const negotiations = await Negotiation.find(filter).sort('-createdAt');
  const convertedNegIds = await Order.distinct('negotiationId', { deletedAt: null, negotiationId: { $ne: null } });
  const convertedSet = new Set(convertedNegIds.map(id => String(id)));
  const active = negotiations.filter(n => !convertedSet.has(String(n._id)));
  res.status(200).json({ success: true, total: active.length, data: active });
});

// Finds or creates a Customer party by name; returns its _id.
async function upsertPartyByName(clientName, createdBy) {
  if (!clientName) return null;
  const nameRe = new RegExp(`^${clientName.trim()}$`, 'i');
  let party = await Party.findOne({ name: nameRe, deletedAt: null });
  if (!party) {
    party = await Party.create({ name: clientName.trim(), type: 'Customer', createdBy });
  }
  return party._id;
}

// Resolves the ACTUAL total quantity a single order item row consumes from inventory —
// item.qty × (kit count), or just item.qty for a non-kit row. Kit items: item.qty on a kit
// row is the component qty PER KIT (see Kit.products), so the real consumption is item.qty ×
// (number of kits ordered), taken from the matching order.kitOrders[].overallQty (per kitId)
// or the legacy single-kit order.kitOverallQty. Factored out so both a full order-creation
// deduction and a delta-only re-deduction (qty raised after creation — see
// deductInventoryDeltaForOrder) use the exact identical formula.
function resolveItemConsumedQty(it, order) {
  const perUnitQty = Number(it.qty) || 0;
  if (perUnitQty <= 0) return 0;
  if (!it.isKit) return perUnitQty;
  // Sample orders (convertLeadToSample / convertOrderToSample on the frontend) force every
  // product row's qty to 1 ("one sample unit") but still carry over the source order/lead's
  // original kitOrders/kitOverallQty — so the multiplier must NOT apply here, or a 1-unit
  // sample would wrongly deduct the full original kit-count worth of components.
  if (order.orderCategory === 'SAMPLE') return perUnitQty;
  const kitOrders = Array.isArray(order.kitOrders) ? order.kitOrders : [];
  const kitCount = Number(kitOrders.find((o) => o && o.kitId && o.kitId === it.kitId)?.overallQty) || Number(order.kitOverallQty) || 0;
  if (kitCount <= 0) return 0; // unknown kit count — skip rather than guess
  return perUnitQty * kitCount;
}

// Draws down up to `qty` units from an item's FIFO purchase-batch ledger (oldest
// purchaseDate first), mutating batch.remainingQty in place. Returns the StockMovement
// segments actually consumed (sums to exactly `qty`, since callers never pass more than
// item.currentStock). Any amount not covered by batch history (legacy stock never recorded
// as a batch) is attributed to the item's current vendor with no specific purchase date,
// same convention as before. Shared by deductInventoryQty (order deduction) and
// backfillPendingDeductionsForItem (auto-payoff on restock) so this FIFO logic lives in
// exactly one place.
function consumeFromBatches(item, qty) {
  const segments = [];
  let remaining = qty;
  const batches = (item.purchaseBatches || [])
    .filter((b) => b.remainingQty > 0)
    .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remainingQty, remaining);
    batch.remainingQty -= take;
    remaining -= take;
    segments.push({ qty: take, vendorId: batch.vendorId, vendorName: batch.vendorName, purchaseDate: batch.purchaseDate });
  }
  if (remaining > 0) segments.push({ qty: remaining, vendorId: item.vendorId });
  item.markModified('purchaseBatches');
  return segments;
}

// Writes one StockMovement OUT row per FIFO segment consumed (see consumeFromBatches),
// running qtyBefore/qtyAfter down from the item's stock level immediately before this
// particular deduction started.
async function writeOutMovements(item, qtyBeforeDeduction, segments, order, userId) {
  let runningAfter = qtyBeforeDeduction;
  for (const seg of segments) {
    runningAfter -= seg.qty;
    await StockMovement.create({
      itemId: item._id,
      movementType: 'OUT',
      qty: seg.qty,
      qtyBefore: runningAfter + seg.qty,
      qtyAfter: Math.max(0, runningAfter),
      referenceType: 'Order',
      referenceId: order._id,
      referenceCode: order.orderCode,
      vendorId: seg.vendorId || undefined,
      vendorName: seg.vendorName,
      purchaseDate: seg.purchaseDate,
      partyId: order.clientPartyId || undefined,
      partyName: order.clientName,
      approvalStatus: 'Approved',
      approvedBy: userId,
      createdBy: userId,
    });
  }
}

// Recomputes and persists order.hasPendingStockDeduction from its items' deductedQty vs
// what they actually require (resolveItemConsumedQty) — called after any deduction (full,
// delta, or restock backfill) touches an item's deductedQty.
async function recomputeOrderStockPendingFlag(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  order.hasPendingStockDeduction = items.some((it) => resolveItemConsumedQty(it, order) > (Number(it.deductedQty) || 0));
  order.markModified('items');
  await order.save({ validateBeforeSave: false });
}

// Core FIFO deduction + StockMovement + low-stock-notify logic, shared by full order-creation
// deduction (deductInventoryForOrder) and delta-only re-deduction (deductInventoryDeltaForOrder,
// for when an already-created order's qty is raised later). `rows` is [{ item: <order item
// row>, qty: <exact amount to deduct for this row> }] — qty is already resolved by the caller
// (full consumed qty at creation, or just the increase on a later edit) so this function
// doesn't need to know which case it's in.
//
// Insufficient-stock orders are still allowed through: only what's actually available is
// deducted now (deductNow = min(qty, currentStock)); any shortfall is tracked on the order
// item's deductedQty (which stays below what resolveItemConsumedQty says is required) rather
// than being silently absorbed. backfillPendingDeductionsForItem pays the shortfall off later,
// the moment this item is restocked from any source.
async function deductInventoryQty(rows, order, userId) {
  let orderItemsChanged = false;
  for (const row of rows) {
    const it = row.item;
    const qty = row.qty;
    if (!(qty > 0)) continue;
    try {
      let item = null;
      if (it.itemId) item = await InventoryItem.findOne({ _id: it.itemId, deletedAt: null });
      if (!item) {
        const name = it.itemName || it.name;
        if (name) {
          const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          item = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null });
        }
      }
      if (!item) continue;
      const qtyBefore = item.currentStock;
      const deductNow = Math.min(qty, qtyBefore);
      if (deductNow > 0) {
        item.currentStock = qtyBefore - deductNow;
        const segments = consumeFromBatches(item, deductNow);
        await item.save({ validateBeforeSave: false });
        await writeOutMovements(item, qtyBefore, segments, order, userId);

        if (item.minStock > 0 && item.currentStock < item.minStock) {
          const isOut = item.currentStock === 0;
          notifyRoles({ modules: ['Inventory', 'Purchase'], type: 'low_stock', title: isOut ? 'Out of Stock' : 'Low Stock Alert', message: `${item.itemName} — ${item.currentStock}/${item.minStock} ${item.unit || 'units'} remaining (Order ${order.orderCode})`, link: '/inventory' }).catch(() => {});
        }
      }
      row.item.deductedQty = (Number(row.item.deductedQty) || 0) + deductNow;
      orderItemsChanged = true;

      if (deductNow < qty) {
        notifyRoles({ modules: ['Inventory', 'Purchase'], type: 'low_stock', title: 'Order Stock Shortfall', message: `${item.itemName} — order ${order.orderCode} is short ${qty - deductNow} ${item.unit || 'units'}. Will auto-deduct once restocked; task assignment is blocked for this product until then.`, link: '/inventory' }).catch(() => {});
      }
    } catch (err) {
      console.error(`Inventory deduction failed for order ${order.orderCode}, item "${it.itemName || it.name}":`, err.message);
    }
  }
  if (orderItemsChanged) {
    await recomputeOrderStockPendingFlag(order).catch((err) => {
      console.error(`Failed to update hasPendingStockDeduction for order ${order.orderCode}:`, err.message);
    });
  }
}

// Deduct ordered quantities from Inventory when an Order is created (both lead→order
// conversion and direct/sample orders), so stock reflects goods committed to the order.
async function deductInventoryForOrder(order, userId) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((it) => ({ item: it, qty: resolveItemConsumedQty(it, order) }));
  await deductInventoryQty(rows, order, userId);
}

// Deducts only the INCREASE in consumed qty per item between the order's pre-edit and
// post-edit state — for when an already-created order's quantity is raised later (Sales'
// own order-edit form, or Billing's Edit Pricing). Never called for a decrease: qty can only
// go up (findOrderQuantityDecreases / applyOrderPriceEdit's own floor checks already reject
// any request that would lower it), so every delta here is >= 0. Items are matched by array
// position — both callers only mutate qty/price/gst on existing rows in place, never
// add/remove/reorder, so old/new items stay index-parallel. Neither deduction function has an
// "already deducted" flag, so this must compute the DELTA, never re-run the full amount.
async function deductInventoryDeltaForOrder(existingOrder, updatedOrder, userId) {
  const oldItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
  const newItems = Array.isArray(updatedOrder.items) ? updatedOrder.items : [];
  // Matched by orderItemKey (itemId, falling back to name+category) — the SAME business key
  // findOrderQuantityDecreases already matches on — rather than array index. Billing's Edit
  // Pricing never adds/removes/reorders rows, so index would work there, but Sales' own
  // order-edit form CAN (product list is fully rebuilt on save), and this function is shared
  // by both callers. Getting inventory wrong is worse than the cosmetic risk syncDispatch-
  // RecordQuantities already accepts by matching on index.
  const oldQtyByKey = new Map(oldItems.map((it) => [orderItemKey(it), resolveItemConsumedQty(it, existingOrder)]));
  const rows = [];
  newItems.forEach((newIt) => {
    const oldQty = oldQtyByKey.get(orderItemKey(newIt)) || 0;
    const newQty = resolveItemConsumedQty(newIt, updatedOrder);
    const delta = newQty - oldQty;
    if (delta > 0) rows.push({ item: newIt, qty: delta });
  });
  await deductInventoryQty(rows, updatedOrder, userId);
}

// ─── MATERIAL STOCK DEDUCTION (packing materials tracked in Inventory > Material Stocks) ──
// Name/size resolution lives in utils/materialStockMatch.js, shared with
// tasks.controller.js's Today's Checklist readiness check, so "is this in stock" can never
// disagree with what actually gets deducted here. Same full/delta split as inventory above.
async function deductMaterialStockQty(rows, order) {
  for (const row of rows) {
    const it = row.item;
    const qty = row.qty;
    if (String(it.sticker || '').trim().toUpperCase() !== 'YES') continue;
    if (!(qty > 0)) continue;
    try {
      const stocks = await MaterialStock.find().sort('purchaseDate');
      const target = resolveMaterialStock(it, stocks);
      if (!target) continue; // no matching stock entry (or Ziplock/no packing attribute) — skip rather than guess

      target.stockCount = Math.max(0, (target.stockCount || 0) - qty);
      await target.save();
    } catch (err) {
      console.error(`Material stock deduction failed for order ${order.orderCode}, item "${it.itemName || it.name}":`, err.message);
    }
  }
}

async function deductMaterialStockForOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((it) => ({ item: it, qty: resolveItemConsumedQty(it, order) }));
  await deductMaterialStockQty(rows, order);
}

// Delta counterpart of deductMaterialStockForOrder — same reasoning as deductInventoryDeltaForOrder.
async function deductMaterialStockDeltaForOrder(existingOrder, updatedOrder) {
  const oldItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
  const newItems = Array.isArray(updatedOrder.items) ? updatedOrder.items : [];
  // Same orderItemKey matching as deductInventoryDeltaForOrder — see its comment.
  const oldQtyByKey = new Map(oldItems.map((it) => [orderItemKey(it), resolveItemConsumedQty(it, existingOrder)]));
  const rows = [];
  newItems.forEach((newIt) => {
    const oldQty = oldQtyByKey.get(orderItemKey(newIt)) || 0;
    const newQty = resolveItemConsumedQty(newIt, updatedOrder);
    const delta = newQty - oldQty;
    if (delta > 0) rows.push({ item: newIt, qty: delta });
  });
  await deductMaterialStockQty(rows, updatedOrder);
}
// Exported for reuse by billing.controller.js's applyOrderPriceEdit (Billing's "Edit Pricing"
// quantity-increase support) — same delta deduction needed regardless of which module
// triggered the qty change.
exports.deductInventoryDeltaForOrder = deductInventoryDeltaForOrder;
exports.deductMaterialStockDeltaForOrder = deductMaterialStockDeltaForOrder;
// Exported so utils/taskQuantity.js's checkStockDeductionGate can compute "how much does this
// order item actually require" with the EXACT same formula deductedQty is measured against —
// using a different formula there would make the gate's pending math disagree with reality.
exports.resolveItemConsumedQty = resolveItemConsumedQty;

// Returns true if `it` (an order item row) refers to the given InventoryItem — same matching
// rule deductInventoryQty itself uses when resolving an item (itemId first, else exact
// case-insensitive name match), kept in sync so backfill pays off the same rows deduction drew from.
function orderItemMatchesInventoryItem(it, item) {
  if (it.itemId) return String(it.itemId) === String(item._id);
  const name = (it.itemName || it.name || '').trim().toLowerCase();
  return !!name && name === (item.itemName || '').trim().toLowerCase();
}

// Auto-payoff: called after ANY stock-increasing event (Purchase receive, Local Purchase,
// Inventory Add-Item merge, Bulk→Filled conversion, Stock Movement/Stock-Check approval).
// Finds orders still owed inventory for this item (hasPendingStockDeduction, oldest order
// first — first-come-first-served) and deducts as much of their shortfall as the newly
// arrived stock allows, exactly like a normal order deduction (same FIFO batches, same
// StockMovement trail), just retroactive. Safe to call after every restock even when there's
// nothing pending — it's a no-op query in that case.
async function backfillPendingDeductionsForItem(itemId, userId) {
  const item = await InventoryItem.findOne({ _id: itemId, deletedAt: null });
  if (!item || !(item.currentStock > 0)) return;

  const pendingOrders = await Order.find({
    deletedAt: null,
    hasPendingStockDeduction: true,
    status: { $ne: 'Cancelled' },
  }).sort({ createdAt: 1 });

  for (const order of pendingOrders) {
    if (!(item.currentStock > 0)) break;
    try {
      let orderChanged = false;
      for (const it of order.items || []) {
        if (!(item.currentStock > 0)) break;
        if (!orderItemMatchesInventoryItem(it, item)) continue;
        const required = resolveItemConsumedQty(it, order);
        const pending = required - (Number(it.deductedQty) || 0);
        if (pending <= 0) continue;

        const take = Math.min(pending, item.currentStock);
        if (take <= 0) break;
        const qtyBefore = item.currentStock;
        item.currentStock = qtyBefore - take;
        const segments = consumeFromBatches(item, take);
        await writeOutMovements(item, qtyBefore, segments, order, userId);
        it.deductedQty = (Number(it.deductedQty) || 0) + take;
        orderChanged = true;
      }
      if (orderChanged) {
        await recomputeOrderStockPendingFlag(order);
      }
    } catch (err) {
      console.error(`Backfill deduction failed for order ${order.orderCode}, item "${item.itemName}":`, err.message);
    }
  }

  await item.save({ validateBeforeSave: false });
}
exports.backfillPendingDeductionsForItem = backfillPendingDeductionsForItem;

exports.convertToOrder = asyncHandler(async (req, res, next) => {
  const negotiation = await Negotiation.findById(req.params.id);
  if (!negotiation) return next(new AppError('Negotiation not found', 404));
  const clientPartyId = await upsertPartyByName(negotiation.clientName, req.user._id);

  // Resolve contact details: negotiation extras (strict:false) → lead fallback
  const negObj = negotiation.toObject();
  let lead = null;
  if (negotiation.leadId) {
    lead = await Lead.findById(negotiation.leadId).lean();
  }
  const resolveField = (...sources) => sources.find(v => v != null && v !== '');
  const orderCategory = resolveField(lead?.leadType, 'ORDER');
  const orderCode = await generateCode(orderCategory === 'SAMPLE' ? 'SAM' : 'ORD');

  const order = await Order.create({
    orderCode,
    leadId: negotiation.leadId,
    negotiationId: negotiation._id,
    quotationId: negotiation.quotationId,
    clientName: negotiation.clientName,
    clientPartyId,
    amount: negotiation.amount,
    gstAmount: negotiation.gstAmount,
    total: negotiation.total,
    advancePaid: resolveField(negObj.advancePaid, 0),
    // Recompute balance from total so it stays consistent even when the stored
    // negotiation balance was calculated from the items-only subtotal.
    balance: negotiation.total - resolveField(negObj.paidAmount, negObj.advancePaid, 0),
    paidAmount: resolveField(negObj.paidAmount, negObj.advancePaid, 0),
    paymentCollection: negObj.paymentCollection || [],
    paymentStatus: negObj.paymentStatus || 'Unpaid',
    type: negotiation.type,
    items: negotiation.items,
    // Use length check: empty [] from a hotel-only negotiation must fall back to the lead's
    // products (which may have been added after the negotiation was created). [] is truthy so
    // `[] || lead.products` would return [] — length check avoids that trap.
    products: (negObj.products?.length > 0 ? negObj.products : null) ?? (lead?.products?.length > 0 ? lead?.products : null) ?? [],
    kitOrders: (negObj.kitOrders?.length > 0 ? negObj.kitOrders : null) ?? (lead?.kitOrders?.length > 0 ? lead?.kitOrders : null) ?? [],
    selectedKits: (negObj.selectedKits?.length > 0 ? negObj.selectedKits : null) ?? (lead?.selectedKits?.length > 0 ? lead?.selectedKits : null) ?? [],
    productType: resolveField(negObj.productType, lead?.productType),
    kitSticker: resolveField(negObj.kitSticker, lead?.kitSticker),
    kitLogo: resolveField(negObj.kitLogo, lead?.kitLogo),
    kitPrinting: resolveField(negObj.kitPrinting, lead?.kitPrinting),
    kitPrice: negObj.kitPrice != null ? negObj.kitPrice : (lead?.kitPrice != null ? lead.kitPrice : undefined),
    kitOverallQty: negObj.kitOverallQty != null ? negObj.kitOverallQty : (lead?.kitOverallQty != null ? lead.kitOverallQty : undefined),
    hotelName: resolveField(negObj.hotelName, lead?.hotelName, negotiation.clientName),
    category: resolveField(negObj.category, lead?.category),
    email: resolveField(negObj.email, lead?.email),
    // Contact & billing details copied from negotiation extras or lead
    location: resolveField(negObj.location, lead?.location, lead?.locationCity),
    clientPhone: resolveField(negObj.phone, negObj.clientPhone, lead?.phone),
    contactPerson: resolveField(negObj.contactPerson, lead?.contactPerson),
    billingName: resolveField(negObj.billingName, lead?.billingName, negotiation.clientName),
    gstNumber: resolveField(negObj.gstNumber, lead?.gstNumber),
    gstPercent: resolveField(negObj.gstPercent, lead?.gstPercent),
    salesPerson: resolveField(negObj.salesPerson, lead?.salesPerson),
    billType: resolveField(negObj.billType, lead?.billType, negotiation.type === 'GST' ? 'GST' : 'NON_GST'),
    detailedAddress: resolveField(negObj.detailedAddress, lead?.detailedAddress, lead?.address),
    city: resolveField(negObj.city, lead?.city),
    state: resolveField(negObj.state, lead?.state),
    pincode: resolveField(negObj.pincode, lead?.pincode),
    shippingAddress: resolveField(negObj.shippingAddress, lead?.shippingAddress),
    shippingCity: resolveField(negObj.shippingCity, lead?.shippingCity),
    shippingState: resolveField(negObj.shippingState, lead?.shippingState),
    shippingPincode: resolveField(negObj.shippingPincode, lead?.shippingPincode),
    deliveryBy: resolveField(negObj.deliveryBy, lead?.deliveryBy),
    transportationBy: resolveField(negObj.transportationBy, lead?.transportationBy),
    forwardingCharge: resolveField(negObj.forwardingCharge, lead?.forwardingCharge),
    forwardingChargeAmount: resolveField(negObj.forwardingChargeAmount, lead?.forwardingChargeAmount, 0),
    paymentTerms: resolveField(negObj.paymentTerms, lead?.paymentTerms),
    paymentReminderDate: resolveField(negObj.paymentReminderDate, negObj.creditDueDate, lead?.paymentReminderDate, lead?.creditDueDate),
    // Tentative delivery date flows from negotiation/quotation extras or the originating lead
    expectedDeliveryDate: resolveField(negObj.expectedDeliveryDate, negObj.orderDeliveryDate, lead?.orderDeliveryDate),
    // Emergency / partial delivery data from the originating lead
    splitDates: lead?.splitDates || [],
    isEmergency: !!(lead?.isEmergency) || !!(lead?.splitDates?.length),
    isUrgent: !!(lead?.isUrgent) || !!(lead?.splitDates?.length),
    deliveryType: lead?.splitDates?.length ? 'Partial' : resolveField(negObj.deliveryType, 'Full'),
    // Alternative contact details — Lead uses altName/altRole/altNumber; negotiation uses alternativeName/Role/Phone
    alternativeName: resolveField(negObj.alternativeName, lead?.altName, lead?.alternativeName),
    alternativeRole: resolveField(negObj.alternativeRole, lead?.altRole, lead?.alternativeRole),
    alternativePhone: resolveField(negObj.alternativePhone, lead?.altNumber, lead?.alternativePhone),
    pocDesignation: resolveField(negObj.pocDesignation, lead?.pocDesignation),
    hotelType: resolveField(negObj.hotelType, lead?.hotelType),
    rooms: resolveField(negObj.rooms, lead?.numRooms, lead?.rowsInHotel),
    occupancy: resolveField(negObj.occupancy, lead?.generalOccupancy),
    branch: resolveField(negObj.branch, lead?.branch),
    destination: resolveField(negObj.destination, lead?.destination),
    // Kit packaging includes (top-level, across all kits in a personalized order)
    packagingIncludes: (negObj.packagingIncludes?.length > 0 ? negObj.packagingIncludes : null) ?? (lead?.packagingIncludes?.length > 0 ? lead?.packagingIncludes : null) ?? [],
    packagingIncludesQty: (Object.keys(negObj.packagingIncludesQty || {}).length > 0 ? negObj.packagingIncludesQty : null) ?? lead?.packagingIncludesQty ?? {},
    // Display/kit fields chosen during lead creation
    displayUnit: resolveField(negObj.displayUnit, lead?.displayUnit),
    kitDisplayUnit: resolveField(negObj.kitDisplayUnit, lead?.kitDisplayUnit),
    kitDisplayUnitType: resolveField(negObj.kitDisplayUnitType, lead?.kitDisplayUnitType),
    kitSize: resolveField(negObj.kitSize, lead?.kitSize),
    selectedKit: resolveField(negObj.selectedKit, lead?.selectedKit),
    logoUrl: resolveField(negObj.logoUrl, lead?.hotelLogoUrl),
    logoRequired: resolveField(negObj.logoRequired, lead?.logoNeeded, false),
    orderCategory,
    // Keep the order assigned to the lead's sales exec, not whoever clicks "Convert to Order"
    // (e.g. an admin converting on their behalf) — otherwise the order becomes invisible to
    // that sales exec's role-scoped Orders query.
    assignedTo: resolveField(lead?.assignedTo, req.user._id),
    createdBy: req.user._id,
    statusHistory: [{ status: 'In Production', changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created' }],
  });
  if (negotiation.leadId) {
    await Lead.findByIdAndUpdate(negotiation.leadId, {
      $set: { status: 'Converted' },
      $push: { statusHistory: { status: 'Converted', changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created from negotiation' } },
    });
  }
  await deductInventoryForOrder(order, req.user._id);
  await deductMaterialStockForOrder(order);
  notifyRoles({ modules: ['Operations', 'Dispatch Team', 'Sales Team'], type: 'order', title: 'New Order Created', message: `Order ${order.orderCode} for ${order.clientName} — ₹${order.total?.toLocaleString() || 0} is now In Production`, link: '/operations' }).catch(() => {});
  res.status(201).json({ success: true, data: order });
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
exports.getOrdersByHotelName = asyncHandler(async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ success: false, message: 'name query param required' });
  const nameRe = new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const orders = await Order.find({ clientName: nameRe, deletedAt: null })
    .populate('assignedTo', 'fullName')
    .sort('-createdAt');
  res.status(200).json({ success: true, total: orders.length, data: orders });
});

exports.createDirectOrder = asyncHandler(async (req, res) => {
  const prefix = req.body.orderCategory === 'SAMPLE' ? 'SAM' : 'ORD';
  const orderCode = await generateCode(prefix);
  const clientPartyId = req.body.clientPartyId || await upsertPartyByName(req.body.clientName, req.user._id);
  const initialStatus = req.body.status || 'In Production';
  // Same reasoning as convertToOrder: fall back to the originating lead's assigned sales
  // exec so the order stays visible to them, not just to whoever created it (e.g. an admin).
  let leadAssignedTo;
  if (req.body.leadId) {
    const leadForAssignment = await Lead.findById(req.body.leadId).select('assignedTo').lean();
    leadAssignedTo = leadForAssignment?.assignedTo;
  }
  const order = await Order.create({
    ...req.body,
    orderCode,
    clientPartyId,
    assignedTo: req.body.assignedTo || leadAssignedTo || req.user._id,
    createdBy: req.user._id,
    statusHistory: [{ status: initialStatus, changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created' }],
  });
  await deductInventoryForOrder(order, req.user._id);
  await deductMaterialStockForOrder(order);
  notifyRoles({ modules: ['Operations', 'Dispatch Team', 'Sales Team'], type: 'order', title: 'New Order Created', message: `Order ${order.orderCode} for ${order.clientName} — ₹${order.total?.toLocaleString() || 0} created directly`, link: '/operations' }).catch(() => {});
  res.status(201).json({ success: true, data: order });
});

// An order's `status` never records the in-between "some items already went out,
// some haven't" state — the Dispatch module deliberately leaves it untouched on a
// Partial Dispatch checkpoint and only flips it to 'Dispatched' once everything has
// shipped (see dispatch.controller.js confirmDispatch). Sales still needs to show
// that in-progress state on the Orders tab, so resolve it here as a read-only
// `dispatchStage` field (not persisted on Order) from the linked DispatchRecord,
// instead of repurposing `status` itself and risking every place that keys off it
// (Task Management's dispatch gating, Sales' lead-exclusion filters, Operations, etc).
async function attachDispatchStage(orders) {
  const ids = orders.map((o) => o._id).filter(Boolean);
  // { flattenMaps: true } is required here — Order.printingStatusOverrides is a Mongoose Map,
  // and toObject() without this option leaves it as a real Map instance. JSON.stringify (what
  // res.json() uses to send the response) silently serializes a bare Map to `{}`, so every
  // order returned by getOrders/getOrder always looked like it had NO printing-status
  // overrides regardless of what was actually saved — breaking Task Management's Today's
  // Checklist kit-display-unit print gate (which reads this exact field), while
  // Operations stayed correct only because operations.controller.js queries with .lean()
  // (which never wraps Map fields in the Mongoose class in the first place).
  if (!ids.length) return orders.map((o) => (o.toObject ? o.toObject({ flattenMaps: true }) : o));
  const dispatches = await DispatchRecord.find({ orderId: { $in: ids } })
    .select('orderId dispatchType')
    .lean();
  const stageByOrder = new Map(dispatches.map((d) => [String(d.orderId), d.dispatchType]));
  return orders.map((o) => {
    const obj = o.toObject ? o.toObject({ flattenMaps: true }) : o;
    obj.dispatchStage = stageByOrder.get(String(o._id)) === 'Partial Dispatch' ? 'Partial Dispatch' : null;
    return obj;
  });
}

exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ orderCode: re }, { clientName: re }];
  }
  // Visibility scoping (same rule as getLeads):
  // - Admin / Super Admin / Manager / Head: all orders
  // - Task Management: all orders too — they assign packing/production tasks (including
  //   Personalized/Separate Kit Packing) across every sales rep's orders, never just their
  //   own, so scoping them to createdBy/assignedTo silently hid every other rep's order from
  //   Task Management's Today's Checklist (and its Kit Packing Task Assignment card/New Task
  //   order dropdown) even though those orders were fully in production.
  // - Everyone else (Executive, etc.): only orders they created or are assigned to
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const role = req.user.role || '';
    const hasFullOrderVisibility = /manager|head/i.test(role) || req.user.department === 'Task Management';
    if (!hasFullOrderVisibility) {
      const visibility = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
      filter.$and = (filter.$and || []).concat([{ $or: visibility }]);
    }
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('clientPartyId', 'name phone').populate('assignedTo', 'fullName').populate('leadId', 'leadType hotelName phone email contactPerson alternativeName alternativeRole alternativePhone location locationCity billingName gstNumber gstPercent salesPerson billType detailedAddress city state pincode destination hotelType rowsInHotel generalOccupancy branch pocDesignation deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms orderDeliveryDate hotelLogoUrl displayUnit displayUnitTab kitDisplayUnit kitSize selectedKit selectedKits kitOrders packagingIncludes packagingIncludesQty kitSticker kitLogo kitPrinting kitPrice kitOverallQty productType products items splitDates isEmergency isUrgent status paymentCollection paidAmount advancePaid').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  const data = await attachDispatchStage(orders);
  res.status(200).json({ success: true, total, page, data });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clientPartyId')
    .populate('assignedTo', 'fullName email')
    .populate('leadId', 'leadCode hotelName phone email contactPerson alternativeName alternativeRole alternativePhone location locationCity billingName gstNumber gstPercent salesPerson billType detailedAddress city state pincode destination hotelType rowsInHotel generalOccupancy branch pocDesignation deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms orderDeliveryDate paymentProofs hotelLogoUrl displayUnit displayUnitTab kitDisplayUnit kitSize selectedKit selectedKits kitOrders packagingIncludes packagingIncludesQty products items splitDates isEmergency isUrgent leadType status paymentCollection paidAmount advancePaid')
    .populate('negotiationId', 'negCode')
    .populate('quotationId', 'quotCode');
  if (!order) return next(new AppError('Order not found', 404));
  const [data] = await attachDispatchStage([order]);
  res.status(200).json({ success: true, data });
});

// Order edit: qty-decrease guard. Operations/Tasks/Dispatch all key their "required
// qty" off the live order (see resolveRequiredQty in utils/taskQuantity.js and
// forwardOrderToDispatch below), so once work has started against a quantity, reducing
// it here would silently orphan already-completed/dispatched units. Edits may only
// raise a quantity, never lower it. Only checked when the patch actually touches
// items/kitOrders/kitOverallQty — payment-only or status-only updates (Billing,
// Dispatch, etc.) never hit this.
function orderItemKey(it) {
  if (it.itemId) return `id:${it.itemId}`;
  return `nc:${String(it.itemName || it.name || '').trim().toLowerCase()}|${it.category || ''}`;
}

function findOrderQuantityDecreases(existing, patch) {
  const violations = [];

  if (Array.isArray(patch.items)) {
    const oldItems = Array.isArray(existing.items) ? existing.items : [];
    for (const oldItem of oldItems) {
      const key = orderItemKey(oldItem);
      const label = oldItem.itemName || oldItem.name || 'item';
      const newItem = patch.items.find((it) => orderItemKey(it) === key);
      if (!newItem) {
        if ((Number(oldItem.qty) || 0) > 0) violations.push(`"${label}" was removed (was qty ${oldItem.qty || 0})`);
        continue;
      }
      const oldQty = Number(oldItem.qty) || 0;
      const newQty = Number(newItem.qty) || 0;
      if (newQty < oldQty) violations.push(`"${label}" qty ${oldQty} → ${newQty}`);
      if (oldItem.isKit || newItem.isKit) {
        const oldOverall = Number(oldItem.overallQty) || 0;
        const newOverall = Number(newItem.overallQty) || 0;
        if (oldOverall > 0 && newOverall < oldOverall) violations.push(`"${label}" overall qty ${oldOverall} → ${newOverall}`);
      }
    }
  }

  if (Array.isArray(patch.kitOrders)) {
    const oldKitOrders = (Array.isArray(existing.kitOrders) ? existing.kitOrders : []).filter((k) => k && k.kitId);
    for (const oldKit of oldKitOrders) {
      const oldQty = Number(oldKit.overallQty) || 0;
      if (oldQty <= 0) continue;
      const newKit = patch.kitOrders.find((k) => k && k.kitId === oldKit.kitId);
      const label = oldKit.kitName || oldKit.kitId;
      if (!newKit) { violations.push(`Kit "${label}" was removed (was qty ${oldQty})`); continue; }
      const newQty = Number(newKit.overallQty) || 0;
      if (newQty < oldQty) violations.push(`Kit "${label}" overall qty ${oldQty} → ${newQty}`);
    }
  }

  if (patch.kitOverallQty !== undefined) {
    const oldQty = Number(existing.kitOverallQty) || 0;
    const newQty = Number(patch.kitOverallQty) || 0;
    if (oldQty > 0 && newQty < oldQty) violations.push(`Kit overall qty ${oldQty} → ${newQty}`);
  }

  return violations;
}

// Keeps an already-forwarded DispatchRecord's quantities in sync when the source order's
// qty is increased after dispatch started. DispatchRecord.items[].qtyOrdered and
// .kitDispatch[].overallQty are otherwise snapshotted ONCE at forward time
// (forwardOrderToDispatch, tasks.controller.js) and never revisited — without this, the
// Dispatch page's "X of Y" would silently undercount the increase. items[] is matched by
// array position (it's seeded 1:1 with order.items at forward time — see the comment in
// dispatchGrouping.js); kitOrders[] is matched by kitId, same key DispatchRecord.kitDispatch
// itself is keyed by. Decreases can't reach here — findOrderQuantityDecreases already
// rejects the request before this runs.
async function syncDispatchRecordQuantities(orderId, existingOrder, patch) {
  const dispatch = await DispatchRecord.findOne({ orderId });
  if (!dispatch) return; // not forwarded to Dispatch yet — nothing to resync

  let dirty = false;

  if (Array.isArray(patch.items)) {
    const oldItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
    oldItems.forEach((oldItem, i) => {
      const newItem = patch.items[i];
      if (!newItem || !dispatch.items[i]) return;
      const delta = (Number(newItem.qty) || 0) - (Number(oldItem.qty) || 0);
      if (delta > 0) {
        dispatch.items[i].qtyOrdered = (Number(dispatch.items[i].qtyOrdered) || 0) + delta;
        dirty = true;
      }
    });
    // Any item appended past the old array's length is a brand-new line added after this
    // order was already forwarded — seed a fresh dispatch row for it too.
    for (let i = oldItems.length; i < patch.items.length; i++) {
      const it = patch.items[i];
      if (it && !dispatch.items[i]) {
        dispatch.items.push({
          itemId: it.itemId, itemName: it.itemName, qtyOrdered: Number(it.qty) || 0, qtyDispatched: 0,
          boxes: it.boxes, isKit: it.isKit, kitId: it.kitId, kitName: it.kitName, kitType: it.kitType, category: it.category,
        });
        dirty = true;
      }
    }
  }

  if (Array.isArray(patch.kitOrders)) {
    const oldKitOrders = Array.isArray(existingOrder.kitOrders) ? existingOrder.kitOrders : [];
    patch.kitOrders.forEach((newKit) => {
      if (!newKit || !newKit.kitId) return;
      const oldKit = oldKitOrders.find((k) => k && k.kitId === newKit.kitId);
      const delta = (Number(newKit.overallQty) || 0) - (Number(oldKit?.overallQty) || 0);
      if (delta <= 0) return;
      const kd = dispatch.kitDispatch.find((k) => k.kitId === newKit.kitId);
      if (kd) {
        kd.overallQty = (Number(kd.overallQty) || 0) + delta;
        dirty = true;
      } else if (!oldKit) {
        dispatch.kitDispatch.push({
          kitId: newKit.kitId, kitName: newKit.kitName || newKit.kitType,
          category: newKit.category || 'separate_kit', overallQty: Number(newKit.overallQty) || 0, dispatchedQty: 0,
        });
        dirty = true;
      }
    });
  }

  if (dirty) await dispatch.save();
}
// Exported for reuse by billing.controller.js's applyOrderPriceEdit (Billing's "Edit Pricing"
// quantity-increase support) — same DispatchRecord resync needed whenever a linked order's
// qty is raised after dispatch started, regardless of which module triggered the qty change.
exports.syncDispatchRecordQuantities = syncDispatchRecordQuantities;

exports.updateOrder = asyncHandler(async (req, res, next) => {
  const existingForQtyCheck = await Order.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!existingForQtyCheck) return next(new AppError('Order not found', 404));

  const qtyDecreases = findOrderQuantityDecreases(existingForQtyCheck, req.body);
  if (qtyDecreases.length) {
    return next(new AppError(`Order quantity cannot be reduced once placed — it can only be increased. ${qtyDecreases.join('; ')}`, 400));
  }

  // deductedQty is a backend-only bookkeeping field (utils/taskQuantity.js's
  // checkStockDeductionGate) — the Sales edit form doesn't know about it and always resends
  // the FULL items array on any edit (price change, adding a row, etc.), even for rows whose
  // qty didn't change. Without this, the $set below would blindly overwrite every item back
  // to its schema default (deductedQty: 0), making Task Management think stock was never
  // pulled for products that were already fully deducted at order creation — even though
  // nothing about them actually changed. Carry the prior value forward by the same
  // orderItemKey match deductInventoryDeltaForOrder uses, so only a genuine qty increase
  // (handled separately, below) adds to it.
  if (Array.isArray(req.body.items)) {
    const oldDeductedByKey = new Map(
      (existingForQtyCheck.items || []).map((it) => [orderItemKey(it), Number(it.deductedQty) || 0])
    );
    req.body.items = req.body.items.map((it) => ({
      ...it,
      deductedQty: it.deductedQty !== undefined ? it.deductedQty : (oldDeductedByKey.get(orderItemKey(it)) || 0),
    }));
  }

  const editHistoryEntries = buildOrderEditHistory(existingForQtyCheck, req.body, req.user);

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    editHistoryEntries.length
      ? { $set: req.body, $push: { editHistory: { $each: editHistoryEntries } } }
      : req.body,
    { new: true, runValidators: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  if (Array.isArray(req.body.items) || Array.isArray(req.body.kitOrders)) {
    await syncDispatchRecordQuantities(order._id, existingForQtyCheck, req.body).catch((err) => {
      console.error(`Dispatch qty resync failed for order ${order.orderCode}:`, err.message);
    });
    // Inventory/material stock is only ever deducted ONCE, in full, at order creation
    // (deductInventoryForOrder/deductMaterialStockForOrder) — raising a qty afterward
    // previously left the increase completely undeducted. Uses the freshly-saved `order`
    // (not req.body) as the "new" side so every field the qty formula needs (orderCategory,
    // kitOverallQty, etc.) is guaranteed present even if the patch didn't include it.
    await deductInventoryDeltaForOrder(existingForQtyCheck, order, req.user._id).catch((err) => {
      console.error(`Inventory delta deduction failed for order ${order.orderCode}:`, err.message);
    });
    await deductMaterialStockDeltaForOrder(existingForQtyCheck, order).catch((err) => {
      console.error(`Material stock delta deduction failed for order ${order.orderCode}:`, err.message);
    });
  }
  // If this update recorded a payment (paidAmount / balance / paymentCollection),
  // keep any linked Billing invoice's advance/balance in sync too. Sales's quick
  // "Add Payment Entry" writes straight onto the order — without this, the linked
  // invoice (and everything that trusts it as the source of truth: Billing,
  // Operations, Task Management via resolveOrderPaymentStatus) went stale and kept
  // showing Partial/Pending even after Sales showed the order as fully Paid.
  if (req.body.paidAmount !== undefined || req.body.balance !== undefined || req.body.paymentCollection !== undefined) {
    const paid = Number(order.paidAmount) || 0;
    const Invoice = require('../../models/Invoice');
    const invoices = await Invoice.find({ orderId: order._id });
    await Promise.all(invoices.map((inv) => {
      inv.advanceAmount = paid;
      inv.status = paid >= (inv.total || 0) ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending';
      return inv.save({ validateBeforeSave: false }).catch(() => {});
    }));
    await syncOrderTasksPayment(order._id).catch(() => {});
  }
  res.status(200).json({ success: true, data: order });
});

exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  order.deletedAt = Date.now();
  order.deletedBy = req.user._id;
  await order.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Order deleted' });
});

exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      $set: { status: req.body.status },
      $push: {
        statusHistory: {
          status: req.body.status,
          changedAt: new Date(),
          by: req.user?._id,
          byName: req.user?.fullName || req.user?.name || 'System',
          note: req.body.note || '',
        },
      },
    },
    { new: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  if (['Dispatched', 'Delivered'].includes(req.body.status) && order.leadId) {
    await Lead.findByIdAndUpdate(order.leadId, { status: req.body.status });
  }
  res.status(200).json({ success: true, data: order });
});

// PATCH /api/sales/orders/:id/transport-mismatch-decision — Sales approves or rejects a
// dispatch LR transport-name mismatch flagged by Dispatch (see dispatch.controller.js
// reportTransportMismatch). Approve/reject is purely a sign-off record; it doesn't alter
// the dispatch itself.
exports.decideTransportMismatch = asyncHandler(async (req, res, next) => {
  const { decision } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return next(new AppError('decision must be "approved" or "rejected"', 400));
  }
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      dispatchTransportMismatchStatus: decision,
      dispatchTransportMismatchDecidedBy: req.user._id,
      dispatchTransportMismatchDecidedAt: Date.now(),
    },
    { new: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// PATCH /api/sales/orders/:id/lr-mismatch-decision — Sales side of the dual (Sales +
// Operations) sign-off on an LR mismatch flagged by Dispatch for fields other than
// Weight/Transport Name (see dispatch.controller.js requestLrMismatchApproval). A reject
// from either side kills the request immediately; an approve only flips the overall status
// to 'approved' once Operations has approved too (see operations.controller.js
// decideLrMismatchOps).
exports.decideLrMismatchSales = asyncHandler(async (req, res, next) => {
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
    order.dispatchLrMismatchSalesApproved = true;
    order.dispatchLrMismatchSalesApprovedBy = req.user._id;
    order.dispatchLrMismatchSalesApprovedAt = Date.now();
    if (order.dispatchLrMismatchOpsApproved) order.dispatchLrMismatchStatus = 'approved';
  }
  await order.save({ validateBeforeSave: false });

  if (decision === 'approved' && order.dispatchLrMismatchStatus === 'pending') {
    await notifyRoles({
      modules: ['Operations'],
      type: 'dispatch',
      title: 'LR Mismatch — Sales Approved, Awaiting Operations',
      message: `Order ${order.orderCode}: Sales has approved the LR mismatch. Operations approval is still required before dispatch can proceed.`,
    });
  }

  res.status(200).json({ success: true, data: order });
});

// PATCH /api/sales/orders/:id/invoice-mismatch-decision — Sales decides on a general
// invoice/lorry-receipt mismatch reason raised by Dispatch (see dispatch.controller.js
// requestInvoiceMismatchApproval). Single-approval only, unlike the dual Sales+Operations
// LR mismatch above. Approving flips dispatchInvoiceMismatchAwaitingReupload so Dispatch
// can re-upload the corrected invoice and continue.
exports.decideInvoiceMismatch = asyncHandler(async (req, res, next) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return next(new AppError('decision must be "approved" or "rejected"', 400));
  }
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
  if (!order) return next(new AppError('Order not found', 404));
  if (order.dispatchInvoiceMismatchStatus !== 'pending') {
    return next(new AppError('No pending invoice mismatch approval for this order', 400));
  }

  order.dispatchInvoiceMismatchStatus = decision;
  order.dispatchInvoiceMismatchDecidedBy = req.user._id;
  order.dispatchInvoiceMismatchDecidedAt = Date.now();
  order.dispatchInvoiceMismatchDecisionNote = note || '';
  order.dispatchInvoiceMismatchAwaitingReupload = decision === 'approved';
  await order.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, data: order });
});

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
exports.getComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  // Date range filter on createdAt
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Search by complaintCode, clientName, or linked order's orderCode
  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i');
    const matchingOrders = await Order.find({ orderCode: rx }).select('_id');
    const orConditions = [{ complaintCode: rx }, { clientName: rx }];
    if (matchingOrders.length) orConditions.push({ orderId: { $in: matchingOrders.map(o => o._id) } });
    filter.$or = orConditions;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [complaints, total] = await Promise.all([
    Complaint.find(filter).populate('orderId', 'orderCode clientName').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Complaint.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: complaints });
});

exports.createComplaint = asyncHandler(async (req, res) => {
  const complaintCode = await generateCode('CMP');
  // Denormalize the client name (from the linked order) for per-customer history grouping.
  let clientName = req.body.clientName;
  if (!clientName && req.body.orderId) {
    const ord = await Order.findById(req.body.orderId).select('clientName').lean();
    clientName = ord?.clientName;
  }
  const complaint = await Complaint.create({
    ...req.body,
    clientName,
    complaintCode,
    statusHistory: [{ status: req.body.status || 'Open', note: 'Complaint raised', by: req.user._id, byName: req.user.fullName }],
    createdBy: req.user._id,
  });
  notifyRoles({ modules: ['Sales Team'], type: 'complaint', title: 'New Complaint Raised', message: `Complaint ${complaint.complaintCode}: ${complaint.issue || complaint.description || 'No description'} — ${complaint.clientName || 'N/A'}`, link: '/sales' }).catch(() => {});
  res.status(201).json({ success: true, data: complaint });
});

exports.updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found', 404));
  complaint.status = req.body.status;
  if (req.body.status === 'Resolved') {
    complaint.resolvedAt = Date.now();
    complaint.resolvedBy = req.user._id;
  }
  complaint.statusHistory = complaint.statusHistory || [];
  complaint.statusHistory.push({
    status: req.body.status,
    note: req.body.note || `Status changed to ${req.body.status}`,
    by: req.user._id, byName: req.user.fullName,
  });
  await complaint.save({ validateBeforeSave: false });
  notifyRoles({ modules: ['Sales Team'], type: 'complaint', title: `Complaint ${req.body.status}`, message: `${complaint.complaintCode} (${complaint.clientName || 'N/A'}) → ${req.body.status}`, link: '/sales' }).catch(() => {});
  res.status(200).json({ success: true, data: complaint });
});

// Full complaint history for a customer (all complaints + their status trails).
exports.getComplaintHistory = asyncHandler(async (req, res) => {
  const clientName = req.query.clientName;
  if (!clientName) return res.status(200).json({ success: true, data: [] });
  const complaints = await Complaint.find({ clientName: new RegExp(`^${clientName}$`, 'i') })
    .populate('orderId', 'orderCode')
    .sort('-createdAt').lean();
  res.status(200).json({ success: true, total: complaints.length, data: complaints });
});

// ─── FILE UPLOAD (Cloudinary) ─────────────────────────────────────────────────
// Receives files already uploaded by multer-storage-cloudinary middleware
// and returns their Cloudinary URLs.
exports.uploadFiles = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files provided', 400));
  }
  const files = req.files.map((f) => ({
    name: f.originalname,
    url: f.path,
    public_id: f.filename,
    size: f.size,
    mimetype: f.mimetype,
  }));
  res.status(200).json({ success: true, data: files });
});

// Delete a file from Cloudinary by public_id.
exports.deleteFile = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ success: false, message: 'publicId required' });
  await cloudinary.uploader.destroy(publicId);
  res.status(200).json({ success: true, message: 'File deleted' });
});
