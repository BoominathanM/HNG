const Lead = require('../../models/Lead');
const Quotation = require('../../models/Quotation');
const Negotiation = require('../../models/Negotiation');
const Order = require('../../models/Order');
const Complaint = require('../../models/Complaint');
const Party = require('../../models/Party');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

// ─── LEADS ───────────────────────────────────────────────────────────────────
exports.getLeads = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ hotelName: re }, { phone: re }, { locationCity: re }];
  }
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
  const lead = await Lead.create({ ...req.body, leadCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: lead });
});

exports.updateLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
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
    { status: req.body.status },
    { new: true }
  );
  if (!lead) return next(new AppError('Lead not found', 404));
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
  const [leads, orders] = await Promise.all([
    Lead.find({ deletedAt: null, followupDate: { $ne: null } })
      .select('hotelName followupDate followupTime status assignedTo leadCode')
      .populate('assignedTo', 'fullName').sort('followupDate').limit(100).lean(),
    Order.find({ deletedAt: null }).select('orderCode clientName status balance paymentReminderDate total expectedDeliveryDate').sort('-createdAt').limit(200).lean(),
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
    if (['Payment Pending'].includes(o.status) || (o.balance && o.balance > 0)) {
      reminders.push({
        id: `pay-${o._id}`, kind: 'Payment Due', refCode: o.orderCode,
        title: `Payment pending: ${o.clientName}`, status: o.status,
        dueDate: o.paymentReminderDate || o.expectedDeliveryDate, amount: o.balance,
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
  const quotations = await Quotation.find(filter).populate('leadId', 'hotelName').sort('-createdAt');
  res.status(200).json({ success: true, total: quotations.length, data: quotations });
});

exports.createQuotation = asyncHandler(async (req, res) => {
  const quotCode = await generateCode('QT');
  const q = await Quotation.create({ ...req.body, quotCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: q });
});

exports.convertToNegotiation = asyncHandler(async (req, res, next) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return next(new AppError('Quotation not found', 404));
  const negCode = await generateCode('NEG');
  const negotiation = await Negotiation.create({
    negCode,
    quotationId: quotation._id,
    leadId: quotation.leadId,
    clientName: quotation.clientName,
    amount: req.body.amount || quotation.amount,
    gstAmount: req.body.gstAmount || quotation.gstAmount,
    total: req.body.total || quotation.total,
    advancePaid: req.body.advancePaid || quotation.advancePaid,
    balance: req.body.balance || quotation.balance,
    type: quotation.type,
    items: quotation.items,
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
    itemName: p.itemName || p.name,
    unit: p.unit,
    price: Number(p.price ?? p.rate) || 0,
    qty: Number(p.qty) || 0,
    lineTotal: Number(p.lineTotal) || (Number(p.qty) || 0) * (Number(p.price ?? p.rate) || 0),
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
    createdBy: req.user._id,
  });
  await Lead.findByIdAndUpdate(lead._id, { status: 'Negotiation' });
  res.status(201).json({ success: true, data: negotiation });
});

// ─── NEGOTIATIONS ──────────────────────────────────────────────────────────────
exports.getNegotiations = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.leadId) filter.leadId = req.query.leadId;
  const negotiations = await Negotiation.find(filter).sort('-createdAt');
  res.status(200).json({ success: true, total: negotiations.length, data: negotiations });
});

exports.convertToOrder = asyncHandler(async (req, res, next) => {
  const negotiation = await Negotiation.findById(req.params.id);
  if (!negotiation) return next(new AppError('Negotiation not found', 404));
  const orderCode = await generateCode('ORD');
  const order = await Order.create({
    orderCode,
    leadId: negotiation.leadId,
    negotiationId: negotiation._id,
    quotationId: negotiation.quotationId,
    clientName: negotiation.clientName,
    amount: negotiation.amount,
    gstAmount: negotiation.gstAmount,
    total: negotiation.total,
    advancePaid: negotiation.advancePaid,
    balance: negotiation.balance,
    type: negotiation.type,
    items: negotiation.items,
    assignedTo: req.user._id,
    createdBy: req.user._id,
  });
  if (negotiation.leadId) {
    await Lead.findByIdAndUpdate(negotiation.leadId, { status: 'Converted' });
  }
  res.status(201).json({ success: true, data: order });
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
exports.createDirectOrder = asyncHandler(async (req, res) => {
  const orderCode = await generateCode('ORD');
  const order = await Order.create({
    ...req.body,
    orderCode,
    assignedTo: req.user._id,
    createdBy: req.user._id,
  });
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
    Order.find(filter).populate('clientPartyId', 'name phone').populate('assignedTo', 'fullName').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clientPartyId').populate('assignedTo', 'fullName email');
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
    { status: req.body.status },
    { new: true }
  );
  if (!order) return next(new AppError('Order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// ─── COMPLAINTS ───────────────────────────────────────────────────────────────
exports.getComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  const complaints = await Complaint.find(filter).populate('orderId', 'orderCode clientName').sort('-createdAt');
  res.status(200).json({ success: true, total: complaints.length, data: complaints });
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
