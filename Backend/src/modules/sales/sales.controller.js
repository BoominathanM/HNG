const Lead = require('../../models/Lead');
const Quotation = require('../../models/Quotation');
const Negotiation = require('../../models/Negotiation');
const Order = require('../../models/Order');
const Complaint = require('../../models/Complaint');
const Party = require('../../models/Party');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { cloudinary } = require('../../config/cloudinary');
const { notifyRoles } = require('../../utils/notify');

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
    filter.status = { $nin: ['Dispatched', 'Delivered'] };
    if (dispatchedLeadIds.length) {
      filter._id = { $nin: dispatchedLeadIds };
    }
  }
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
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
  const leadCode = await generateCode('LEAD');
  const initialStatus = req.body.status || 'Cold';
  const lead = await Lead.create({
    ...req.body,
    leadCode,
    createdBy: req.user._id,
    statusHistory: [{ status: initialStatus, changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Lead created' }],
  });
  notifyRoles({ modules: ['Sales Team'], userIds: [lead.assignedTo], type: 'system', title: 'New Lead Created', message: `New lead: ${lead.hotelName} (${lead.leadCode}) — Status: ${initialStatus}`, link: '/sales' }).catch(() => {});
  res.status(201).json({ success: true, data: lead });
});

exports.updateLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: req.body },
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
exports.getHotelByName = asyncHandler(async (req, res) => {
  const name = req.query.name;
  const branch = req.query.branch;
  if (!name) return res.status(200).json({ success: true, data: null });
  const nameRe = new RegExp(`^${name.trim()}$`, 'i');
  // Prefer the most recent matching lead (richest detail); fall back to a party record.
  const leadFilter = { hotelName: nameRe, deletedAt: null };
  if (branch) leadFilter.branch = new RegExp(`^${branch.trim()}$`, 'i');
  let lead = await Lead.findOne(leadFilter).sort('-createdAt').lean();
  if (!lead) lead = await Lead.findOne({ hotelName: nameRe, deletedAt: null }).sort('-createdAt').lean();
  let party = null;
  if (!lead) party = await Party.findOne({ name: nameRe, deletedAt: null }).lean();
  const source = lead || party;
  if (!source) return res.status(200).json({ success: true, data: null });
  res.status(200).json({ success: true, data: source, matchedOn: lead ? 'lead' : 'party' });
});

// Distinct existing hotel names (for the Old-Hotel selector).
exports.getHotelNames = asyncHandler(async (req, res) => {
  const names = await Lead.distinct('hotelName', { deletedAt: null });
  res.status(200).json({ success: true, data: names.filter(Boolean).sort() });
});

// Unified reminders feed: lead follow-ups, order status, and payment-due reminders.
exports.getReminders = asyncHandler(async (req, res) => {
  const now = new Date();
  // Same visibility scope as getLeads: non-admins only see follow-ups for leads
  // they created or that are assigned to them.
  const leadFilter = { deletedAt: null, followupDate: { $ne: null } };
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const visibility = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    const myName = req.user.fullName || req.user.name;
    if (myName) visibility.push({ salesPerson: myName });
    leadFilter.$or = visibility;
  }
  const [leads, orders] = await Promise.all([
    Lead.find(leadFilter)
      .select('hotelName followupDate followupTime status assignedTo leadCode')
      .populate('assignedTo', 'fullName').sort('followupDate').limit(100).lean(),
    Order.find({ deletedAt: null }).select('orderCode clientName status balance total amount gstAmount paidAmount advancePaidAmount advancePaid paymentCollection paymentReminderDate expectedDeliveryDate items products').sort('-createdAt').limit(200).lean(),
  ]);

  const reminders = [];
  leads.forEach((l) => {
    reminders.push({
      id: `lead-${l._id}`, kind: 'Lead Follow-up', refCode: l.leadCode,
      title: `Follow up: ${l.hotelName}`, status: l.status,
      dueDate: l.followupDate, time: l.followupTime,
      owner: l.assignedTo?.fullName || '—',
      overdue: l.followupDate && new Date(l.followupDate) < now,
    });
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
  const quotation = await Quotation.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: false }
  );
  if (!quotation) return next(new AppError('Quotation not found', 404));
  res.status(200).json({ success: true, data: quotation });
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
    products: req.body.products || lead.products || [],
    kitOrders: req.body.kitOrders || lead.kitOrders || [],
    selectedKits: req.body.selectedKits || lead.selectedKits || [],
    productType: req.body.productType || lead.productType,
    kitDisplayUnit: req.body.kitDisplayUnit || lead.kitDisplayUnit || lead.displayUnit || '',
    displayUnit: req.body.displayUnit || lead.displayUnit || lead.kitDisplayUnit || '',
    kitSize: req.body.kitSize || lead.kitSize || '',
    kitSticker: req.body.kitSticker || lead.kitSticker || undefined,
    kitLogo: req.body.kitLogo || lead.kitLogo || undefined,
    kitPrinting: req.body.kitPrinting || lead.kitPrinting || undefined,
    kitPrice: req.body.kitPrice != null ? Number(req.body.kitPrice) : (lead.kitPrice != null ? Number(lead.kitPrice) : undefined),
    kitOverallQty: req.body.kitOverallQty != null ? Number(req.body.kitOverallQty) : (lead.kitOverallQty != null ? Number(lead.kitOverallQty) : undefined),
    // Copy lead contact details so they flow through to the eventual order
    hotelName: req.body.hotelName || lead.hotelName || '',
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

exports.getNegotiations = asyncHandler(async (req, res) => {
  const filter = {};
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
    products: negObj.products || lead?.products || [],
    kitOrders: negObj.kitOrders || lead?.kitOrders || [],
    selectedKits: negObj.selectedKits || lead?.selectedKits || [],
    productType: resolveField(negObj.productType, lead?.productType),
    kitSticker: resolveField(negObj.kitSticker, lead?.kitSticker),
    kitLogo: resolveField(negObj.kitLogo, lead?.kitLogo),
    kitPrinting: resolveField(negObj.kitPrinting, lead?.kitPrinting),
    kitPrice: negObj.kitPrice != null ? negObj.kitPrice : (lead?.kitPrice != null ? lead.kitPrice : undefined),
    kitOverallQty: negObj.kitOverallQty != null ? negObj.kitOverallQty : (lead?.kitOverallQty != null ? lead.kitOverallQty : undefined),
    hotelName: resolveField(negObj.hotelName, lead?.hotelName, negotiation.clientName),
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
    // Display/kit fields chosen during lead creation
    displayUnit: resolveField(negObj.displayUnit, lead?.displayUnit),
    kitDisplayUnit: resolveField(negObj.kitDisplayUnit, lead?.kitDisplayUnit),
    kitSize: resolveField(negObj.kitSize, lead?.kitSize),
    selectedKit: resolveField(negObj.selectedKit, lead?.selectedKit),
    orderCategory,
    assignedTo: req.user._id,
    createdBy: req.user._id,
    statusHistory: [{ status: 'In Production', changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created' }],
  });
  if (negotiation.leadId) {
    await Lead.findByIdAndUpdate(negotiation.leadId, {
      $set: { status: 'Converted' },
      $push: { statusHistory: { status: 'Converted', changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created from negotiation' } },
    });
  }
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
  const order = await Order.create({
    ...req.body,
    orderCode,
    clientPartyId,
    assignedTo: req.user._id,
    createdBy: req.user._id,
    statusHistory: [{ status: initialStatus, changedAt: new Date(), byName: req.user?.fullName || req.user?.name || 'System', note: 'Order created' }],
  });
  notifyRoles({ modules: ['Operations', 'Dispatch Team', 'Sales Team'], type: 'order', title: 'New Order Created', message: `Order ${order.orderCode} for ${order.clientName} — ₹${order.total?.toLocaleString() || 0} created directly`, link: '/operations' }).catch(() => {});
  res.status(201).json({ success: true, data: order });
});

exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ orderCode: re }, { clientName: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('clientPartyId', 'name phone').populate('assignedTo', 'fullName').populate('leadId', 'leadType hotelName phone email contactPerson alternativeName alternativeRole alternativePhone location locationCity billingName gstNumber gstPercent salesPerson billType detailedAddress city state pincode destination deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms orderDeliveryDate hotelLogoUrl displayUnit displayUnitTab kitDisplayUnit kitSize selectedKit selectedKits kitOrders kitSticker kitLogo kitPrinting kitPrice kitOverallQty productType splitDates isEmergency isUrgent').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clientPartyId')
    .populate('assignedTo', 'fullName email')
    .populate('leadId', 'leadCode hotelName phone email contactPerson alternativeName alternativeRole alternativePhone location locationCity billingName gstNumber gstPercent salesPerson billType detailedAddress city state pincode destination hotelType rooms occupancy deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms orderDeliveryDate paymentProofs hotelLogoUrl displayUnit displayUnitTab kitDisplayUnit kitSize selectedKit selectedKits kitOrders splitDates isEmergency isUrgent leadType')
    .populate('negotiationId', 'negCode')
    .populate('quotationId', 'quotCode');
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
});

exports.updateOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
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

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
exports.getComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.orderId) filter.orderId = req.query.orderId;
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
