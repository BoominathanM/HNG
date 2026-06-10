const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const DispatchRecord = require('../../models/DispatchRecord');
const Expense = require('../../models/Expense');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

// ─── QUOTATION REQUESTS ────────────────────────────────────────────────────────
exports.getPendingRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ itemName: re }];
  }
  const requests = await PurchaseRequest.find(filter)
    .populate('vendorId', 'name phone email address bankDetails')
    .populate('itemId', 'itemName unit currentStock minStock')
    .sort('-createdAt');

  const withOrders = await Promise.all(requests.map(async (r) => {
    const order = await PurchaseOrder.findOne({ requestId: r._id });
    return { ...r.toObject(), linkedOrder: order || null };
  }));

  res.status(200).json({ success: true, data: withOrders });
});

exports.approveRequest = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  if (request.status !== 'Pending') return next(new AppError('Request already processed', 400));

  request.status = 'Approved';
  request.approvedBy = req.user._id;
  request.approvedAt = Date.now();
  await request.save({ validateBeforeSave: false });

  // Create Purchase Order
  const poCode = await generateCode('PO');
  const order = await PurchaseOrder.create({
    poCode,
    requestId: request._id,
    vendorId: request.vendorId,
    itemId: request.itemId,
    itemName: request.itemName,
    qty: request.qty,
    unit: request.unit,
    paymentTerms: request.paymentTerms,
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: { request, order }, message: 'Request approved and PO created' });
});

exports.rejectRequest = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  request.status = 'Rejected';
  request.financeNote = req.body.reason || '';
  await request.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: request });
});

// Finance sends the quotation back to the Purchase team for corrections / more info
exports.requestModification = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  if (request.status === 'Approved') return next(new AppError('Approved request cannot be sent back', 400));

  request.status = 'Modification';
  const note = req.body.note || req.body.reason || '';
  request.financeNote = note;
  if (note) request.notes.push({ text: note, createdBy: req.user._id });
  await request.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, data: request, message: 'Quotation sent back for modification' });
});

exports.updateQuotationDetails = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findByIdAndUpdate(
    req.params.id,
    { qty: req.body.qty, paymentTerms: req.body.paymentTerms },
    { new: true }
  );
  if (!request) return next(new AppError('Request not found', 404));
  res.status(200).json({ success: true, data: request });
});

// ─── PURCHASE ORDER PAYMENTS ──────────────────────────────────────────────────
exports.payPurchaseOrder = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError('Purchase order not found', 404));

  const amountPaid = req.body.amountPaid || order.amount;
  order.paidAmount = (order.paidAmount || 0) + amountPaid;
  order.paymentProofUrl = req.file?.path || req.body.proofUrl || order.paymentProofUrl;

  const remaining = (order.amount || 0) - order.paidAmount;
  if (remaining <= 0) order.paymentStatus = 'Paid';
  else if (order.paidAmount > 0) order.paymentStatus = 'Partial Paid';

  await order.save({ validateBeforeSave: false });

  // Create expense record
  const expCode = await generateCode('EXP');
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Purchase',
    description: `Payment for PO: ${order.poCode} — ${order.itemName}`,
    amount: amountPaid,
    proofUrl: order.paymentProofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy: req.user.fullName,
    expenseSource: 'purchase',
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: order });
});

// ─── EXPENSE PAYMENTS ─────────────────────────────────────────────────────────
exports.getExpensePayments = asyncHandler(async (req, res) => {
  const filter = { expenseSource: 'manual' };
  if (req.query.status) filter.paymentStatus = req.query.status;
  const expenses = await Expense.find(filter).sort('-createdAt');
  res.status(200).json({ success: true, data: expenses });
});

exports.payExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return next(new AppError('Expense not found', 404));

  const amountPaid = parseFloat(req.body.amountPaid) || 0;
  const paymentProofUrl = req.file?.path || req.body.proofUrl || undefined;
  const paidBy = req.body.paidBy || req.user.fullName;

  expense.paidAmount = (expense.paidAmount || 0) + amountPaid;
  expense.paidBy = paidBy;
  expense.paidDate = new Date();

  expense.paymentHistory.push({
    amount: amountPaid,
    paidBy,
    paidDate: new Date(),
    proofUrl: paymentProofUrl,
    note: req.body.note || 'Paid via Financial module',
  });

  const remaining = expense.amount - expense.paidAmount;
  if (remaining <= 0) expense.paymentStatus = 'Paid';
  else if (expense.paidAmount > 0) expense.paymentStatus = 'Partially Paid';

  await expense.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: expense });
});

// ─── REIMBURSEMENT — PICKUP ───────────────────────────────────────────────────
exports.getPickupExpenses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const records = await DispatchRecord.find({ pickupAmount: { $gt: 0 }, ...filter })
    .populate('orderId', 'orderCode clientName')
    .populate('pickupEmpId', 'fullName staffCode')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: records });
});

exports.payPickupExpense = asyncHandler(async (req, res, next) => {
  const record = await DispatchRecord.findById(req.params.id).populate('orderId', 'orderCode');
  if (!record) return next(new AppError('Dispatch record not found', 404));
  record.paymentProofUrl = req.file?.path || req.body.proofUrl || record.paymentProofUrl;
  record.paymentStatus = 'Paid';
  record.paidDate = new Date();
  record.paidBy = req.body.paidBy || req.body.paid_by || req.user.fullName;
  await record.save({ validateBeforeSave: false });

  // Create expense record so the Expenses module reflects this payment
  const expCode = await generateCode('EXP');
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Shipping / Transportation',
    description: `Pickup reimbursement paid — Order: ${record.orderId?.orderCode || 'N/A'}`,
    amount: record.pickupAmount || 0,
    proofUrl: record.paymentProofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy: record.paidBy,
    expenseSource: 'reimbursement',
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: record });
});

// ─── REIMBURSEMENT — LOCAL PURCHASE ──────────────────────────────────────────
exports.getLocalPurchaseExpenses = asyncHandler(async (req, res) => {
  const filter = { paymentType: 'credit' };
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const localPurchases = await LocalPurchase.find(filter).sort('-createdAt');
  res.status(200).json({ success: true, data: localPurchases });
});

exports.payLocalPurchase = asyncHandler(async (req, res, next) => {
  const lp = await LocalPurchase.findById(req.params.id);
  if (!lp) return next(new AppError('Local purchase not found', 404));
  lp.paymentProofUrl = req.file?.path || req.body.proofUrl || lp.paymentProofUrl;
  lp.paymentStatus = 'Paid';
  lp.paidDate = new Date();
  lp.paidBy = req.body.paidBy || req.body.paid_by || req.user.fullName;
  await lp.save({ validateBeforeSave: false });

  // Create expense record so the Expenses module reflects this payment
  const expCode = await generateCode('EXP');
  const itemNames = (lp.items || []).map(i => i.itemName || i.name).filter(Boolean).join(', ');
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Raw Material',
    description: `Local purchase paid — Invoice: ${lp.invoiceNo || 'N/A'}${itemNames ? ` (${itemNames})` : ''}`,
    amount: lp.totalAmount || 0,
    vendorPayee: lp.vendorName,
    proofUrl: lp.paymentProofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy: lp.paidBy,
    expenseSource: 'reimbursement',
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: lp });
});
