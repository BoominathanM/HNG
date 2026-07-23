const Lead = require('../../models/Lead');
const Quotation = require('../../models/Quotation');
const Negotiation = require('../../models/Negotiation');
const Order = require('../../models/Order');
const Complaint = require('../../models/Complaint');
const Party = require('../../models/Party');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const MaterialStock = require('../../models/MaterialStock');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { cloudinary } = require('../../config/cloudinary');
const { notifyRoles } = require('../../utils/notify');
const { syncOrderTasksPayment, syncOrderPaymentCollection } = require('../../utils/syncOrderPayment');

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

// Deduct ordered quantities from Inventory when an Order is created (both lead→order
// conversion and direct/sample orders), so stock reflects goods committed to the order.
// Kit items: `item.qty` on a kit row is the component qty PER KIT (see Kit.products), so the
// actual quantity consumed is item.qty × (number of kits ordered), taken from the matching
// order.kitOrders[].overallQty (per kitId) or the legacy single-kit order.kitOverallQty.
async function deductInventoryForOrder(order, userId) {
  const items = Array.isArray(order.items) ? order.items : [];
  const kitOrders = Array.isArray(order.kitOrders) ? order.kitOrders : [];
  for (const it of items) {
    const perUnitQty = Number(it.qty) || 0;
    if (perUnitQty <= 0) continue;
    let qty = perUnitQty;
    if (it.isKit) {
      // Sample orders (convertLeadToSample / convertOrderToSample on the frontend) force every
      // product row's qty to 1 ("one sample unit") but still carry over the source order/lead's
      // original kitOrders/kitOverallQty — so the multiplier must NOT apply here, or a 1-unit
      // sample would wrongly deduct the full original kit-count worth of components.
      const kitCount = order.orderCategory === 'SAMPLE'
        ? 1
        : (Number(kitOrders.find((o) => o && o.kitId && o.kitId === it.kitId)?.overallQty) || Number(order.kitOverallQty) || 0);
      if (kitCount <= 0) continue; // unknown kit count — skip rather than guess
      qty = perUnitQty * kitCount;
    }
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
      item.currentStock = Math.max(0, qtyBefore - qty);

      // Draw down the oldest purchaseDate batches first (FIFO across vendors), so an older
      // vendor's stock is always used up before a newer purchase — one StockMovement per
      // vendor batch touched, so Stock History shows the correct vendor next to each qty.
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
      // No batch history (legacy stock) or batches ran short — attribute the rest to the
      // item's current vendor with no specific purchase date, same as pre-batch behavior.
      if (remaining > 0) segments.push({ qty: remaining, vendorId: item.vendorId });
      item.markModified('purchaseBatches');
      await item.save({ validateBeforeSave: false });

      let runningAfter = qtyBefore;
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
          vendorId: seg.vendorId || undefined,
          vendorName: seg.vendorName,
          purchaseDate: seg.purchaseDate,
          approvalStatus: 'Approved',
          approvedBy: userId,
          createdBy: userId,
        });
      }
      if (item.minStock > 0 && item.currentStock < item.minStock) {
        const isOut = item.currentStock === 0;
        notifyRoles({ modules: ['Inventory', 'Purchase'], type: 'low_stock', title: isOut ? 'Out of Stock' : 'Low Stock Alert', message: `${item.itemName} — ${item.currentStock}/${item.minStock} ${item.unit || 'units'} remaining (Order ${order.orderCode})`, link: '/inventory' }).catch(() => {});
      }
    } catch (err) {
      console.error(`Inventory deduction failed for order ${order.orderCode}, item "${it.itemName || it.name}":`, err.message);
    }
  }
}

// ─── MATERIAL STOCK DEDUCTION (packing materials tracked in Inventory > Material Stocks) ──
// Resolve a packing-material string to a stock category by keyword match (mirrors
// Frontend/src/pages/Operations/data.js packTabFromString). Only used to keep the
// Box/Butter Paper category-fallback and the Ziplock exclusion working exactly as before —
// everything else is matched generically by name+size (see below), not by keyword.
function materialStockCategoryOf(pmRaw) {
  const p = (pmRaw || '').toLowerCase();
  if (p.includes('butter') || p.includes('paper')) return 'butterPaper';
  if (p.includes('ziplock') || p.includes('frosted') || p.includes('pouch')) return 'ziplock';
  if (p.includes('box')) return 'box';
  return '';
}
// Ziplock items never auto-deduct material stock (unchanged existing behavior).
const KEYWORD_CATEGORY_EXCLUDED = new Set(['ziplock']);
// Box/Butter Paper additionally get the legacy category-keyword fallback below (unchanged).
const KEYWORD_CATEGORY_FALLBACK = new Set(['box', 'butterPaper']);

// MaterialStock.size is free text (e.g. "15ml") while an item's size may just be the raw
// number (e.g. "15"). Compare on the leading numeric value so unit-suffix differences don't
// block an otherwise-correct match, for any material — not just one hardcoded category.
function normalizeSize(v) {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/^[\d.]+/);
  return m ? m[0] : s;
}

async function deductMaterialStockForOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const kitOrders = Array.isArray(order.kitOrders) ? order.kitOrders : [];
  for (const it of items) {
    if (String(it.sticker || '').trim().toUpperCase() !== 'YES') continue;
    // Whichever field the chosen packing material/attribute actually lives in for this
    // product type (Box/Butter Paper use packingMaterial; bottles use bottleType; other
    // product types may use material/displayUnit) — try them all, no hardcoded material list.
    const nameCandidates = [it.packingMaterial, it.bottleType, it.material, it.displayUnit]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());
    const category = materialStockCategoryOf(nameCandidates.join(' '));
    if (KEYWORD_CATEGORY_EXCLUDED.has(category)) continue; // Ziplock: unchanged, never auto-deducts

    const perUnitQty = Number(it.qty) || 0;
    if (perUnitQty <= 0) continue;
    let qty = perUnitQty;
    if (it.isKit) {
      const kitCount = order.orderCategory === 'SAMPLE'
        ? 1
        : (Number(kitOrders.find((o) => o && o.kitId && o.kitId === it.kitId)?.overallQty) || Number(order.kitOverallQty) || 0);
      if (kitCount <= 0) continue; // unknown kit count — skip rather than guess
      qty = perUnitQty * kitCount;
    }

    try {
      const stocks = await MaterialStock.find().sort('purchaseDate');
      const itemSize = normalizeSize(it.size);

      // Exact name + size match (oldest purchase first) — this is the general path that
      // covers ANY material stocked in Inventory > Material Stocks (bottles, caps, or any
      // future material), matched purely on what's actually in stock, no keyword needed.
      let target = null;
      for (const name of nameCandidates) {
        target = stocks.find((s) =>
          String(s.packingMaterial || '').trim().toLowerCase() === name &&
          normalizeSize(s.size) === itemSize
        );
        if (target) break;
      }

      // Box/Butter Paper only: legacy category-keyword fallback, unchanged from before.
      if (!target && KEYWORD_CATEGORY_FALLBACK.has(category)) {
        const matches = stocks.filter((s) => materialStockCategoryOf(s.packingMaterial) === category);
        if (matches.length) {
          target = (itemSize && matches.find((s) => normalizeSize(s.size) === itemSize)) || matches[0];
        }
      }

      if (!target) continue; // no matching stock entry — skip rather than guess

      target.stockCount = Math.max(0, (target.stockCount || 0) - qty);
      await target.save();
    } catch (err) {
      console.error(`Material stock deduction failed for order ${order.orderCode}, item "${it.itemName || it.name}":`, err.message);
    }
  }
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

exports.getOrders = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ orderCode: re }, { clientName: re }];
  }
  // Visibility scoping (same rule as getLeads):
  // - Admin / Super Admin / Manager / Head: all orders
  // - Everyone else (Executive, etc.): only orders they created or are assigned to
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const role = req.user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
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
  res.status(200).json({ success: true, total, page, data: orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clientPartyId')
    .populate('assignedTo', 'fullName email')
    .populate('leadId', 'leadCode hotelName phone email contactPerson alternativeName alternativeRole alternativePhone location locationCity billingName gstNumber gstPercent salesPerson billType detailedAddress city state pincode destination hotelType rowsInHotel generalOccupancy branch pocDesignation deliveryBy transportationBy forwardingCharge forwardingChargeAmount paymentTerms orderDeliveryDate paymentProofs hotelLogoUrl displayUnit displayUnitTab kitDisplayUnit kitSize selectedKit selectedKits kitOrders packagingIncludes packagingIncludesQty products items splitDates isEmergency isUrgent leadType status paymentCollection paidAmount advancePaid')
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
