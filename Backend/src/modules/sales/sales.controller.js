const Lead = require('../../models/Lead');
const Quotation = require('../../models/Quotation');
const Negotiation = require('../../models/Negotiation');
const Order = require('../../models/Order');
const Complaint = require('../../models/Complaint');
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
  const complaint = await Complaint.create({ ...req.body, complaintCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: complaint });
});

exports.updateComplaintStatus = asyncHandler(async (req, res, next) => {
  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, ...(req.body.status === 'Resolved' ? { resolvedAt: Date.now(), resolvedBy: req.user._id } : {}) },
    { new: true }
  );
  if (!complaint) return next(new AppError('Complaint not found', 404));
  res.status(200).json({ success: true, data: complaint });
});
