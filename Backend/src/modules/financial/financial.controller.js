const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const PickupOrder = require('../../models/PickupOrder');
const Expense = require('../../models/Expense');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { syncOrderItemFromRequest, upsertOrderForApprovedRequest } = require('../../utils/purchaseOrderSync');

// ─── QUOTATION REQUESTS ────────────────────────────────────────────────────────

exports.getPendingRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ itemName: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [requests, total] = await Promise.all([
    PurchaseRequest.find(filter)
      .populate('vendorId', 'name phone email address bankDetails')
      .populate('itemId', 'itemName unit currentStock minStock')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    PurchaseRequest.countDocuments(filter),
  ]);

  const withOrders = await Promise.all(requests.map(async (r) => {
    const key = r.batchId || `SOLO-${r._id}`;
    const order = (await PurchaseOrder.findOne({ batchId: key }))
      || (await PurchaseOrder.findOne({ requestId: r._id })); // safety net: orders created before this migration have no batchId at all
    return { ...r.toObject(), linkedOrder: order || null };
  }));

  res.status(200).json({ success: true, total, page, data: withOrders });
});

exports.approveRequest = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  if (request.status !== 'Pending') return next(new AppError('Request already processed', 400));

  request.status = 'Approved';
  request.approvedBy = req.user._id;
  request.approvedAt = Date.now();
  await request.save({ validateBeforeSave: false });

  const order = await upsertOrderForApprovedRequest(request, req.user._id);

  notifyRoles({ modules: ['Purchase'], userIds: [request.createdBy], type: 'purchase', title: 'Purchase Request Approved', message: `PR ${request.requestCode} (${request.itemName}) approved — PO ${order.poCode} created`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: { request, order }, message: 'Request approved and PO created' });
});

exports.rejectRequest = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  request.status = 'Rejected';
  request.financeNote = req.body.reason || '';
  await request.save({ validateBeforeSave: false });
  notifyRoles({ modules: ['Purchase'], userIds: [request.createdBy], type: 'purchase', title: 'Purchase Request Rejected', message: `PR ${request.requestCode} (${request.itemName}) rejected${req.body.reason ? `: ${req.body.reason}` : ''}`, link: '/purchase' }).catch(() => {});
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
  notifyRoles({ modules: ['Purchase'], userIds: [request.createdBy], type: 'purchase', title: 'Quotation Modification Requested', message: `Finance needs changes for PR ${request.requestCode} (${request.itemName})${note ? `: ${note}` : ''}`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: request, message: 'Quotation sent back for modification' });
});

exports.batchApproveRequests = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  if (!batchId) return next(new AppError('batchId is required', 400));
  const requests = await PurchaseRequest.find({ batchId, status: 'Pending' });
  if (requests.length === 0) return res.status(200).json({ success: true, data: [], message: 'No pending requests in this batch' });
  const results = [];
  for (const request of requests) {
    request.status = 'Approved';
    request.approvedBy = req.user._id;
    request.approvedAt = Date.now();
    await request.save({ validateBeforeSave: false });
    const order = await upsertOrderForApprovedRequest(request, req.user._id);
    results.push({ request, order });
  }
  res.status(200).json({ success: true, data: results, message: `${results.length} request(s) approved` });
});

exports.updateQuotationDetails = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));

  if (req.body.qty !== undefined && req.body.qty !== '') request.qty = req.body.qty;
  if (req.body.paymentTerms !== undefined && req.body.paymentTerms !== '') request.paymentTerms = req.body.paymentTerms;
  if (req.body.amount !== undefined && req.body.amount !== '') {
    const amt = Number(req.body.amount);
    if (!Number.isNaN(amt) && amt >= 0) request.amount = amt;
  }
  await request.save({ validateBeforeSave: false });

  // This edits a request directly, at ANY status — including one that's already
  // Approved and has a live PurchaseOrder. Without re-syncing here, a correction
  // made through this screen (e.g. fixing a wrong AI-scanned amount) never reaches
  // the order: its cached item amount/total stays on the old wrong value forever,
  // since approval is otherwise the only thing that ever writes it.
  if (request.status === 'Approved') await syncOrderItemFromRequest(request);

  res.status(200).json({ success: true, data: request });
});

// ─── PURCHASE ORDER PAYMENTS ──────────────────────────────────────────────────
exports.updateOrderAmount = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError('Purchase order not found', 404));
  const amt = Number(req.body.amount);
  if (Number.isNaN(amt) || amt < 0) return next(new AppError('Invalid amount', 400));
  order.amount = amt;
  const remaining = amt - (order.paidAmount || 0);
  order.paymentStatus = remaining <= 0 ? 'Paid' : (order.paidAmount > 0 ? 'Partial Paid' : 'Unpaid');
  await order.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: order });
});

exports.payPurchaseOrder = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError('Purchase order not found', 404));

  const proofUrl = req.file?.path || req.body.proofUrl || order.paymentProofUrl;
  const paidBy = req.body.paidBy || req.user.fullName;
  const remaining = Math.max(0, (order.amount || 0) - (order.paidAmount || 0));
  const rawAmount = req.body.amountPaid ?? req.body.amount;
  const payAmount = rawAmount !== undefined ? Math.min(Math.max(0, Number(rawAmount) || 0), remaining) : remaining;

  order.paidAmount = (order.paidAmount || 0) + payAmount;
  order.paymentProofUrl = proofUrl;
  order.paymentHistory = order.paymentHistory || [];
  order.paymentHistory.push({ amount: payAmount, paidBy, paidDate: new Date(), proofUrl, note: req.body.note || '' });

  const remainingAfter = (order.amount || 0) - order.paidAmount;
  order.paymentStatus = remainingAfter <= 0 ? 'Paid' : (order.paidAmount > 0 ? 'Partial Paid' : 'Unpaid');

  await order.save({ validateBeforeSave: false });

  // Create expense record
  const expCode = await generateCode('EXP');
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Purchase',
    description: `Payment for PO: ${order.poCode} — ${order.itemName}`,
    amount: payAmount,
    proofUrl: order.paymentProofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy: req.user.fullName,
    expenseSource: 'purchase',
    createdBy: req.user._id,
  });

  notifyRoles({ modules: ['Purchase', 'Inventory'], type: 'purchase', title: 'Purchase Order Payment', message: `Payment of ₹${payAmount?.toLocaleString()} recorded for PO ${order.poCode} (${order.itemName})`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: order });
});

// ─── EXPENSE PAYMENTS ─────────────────────────────────────────────────────────
exports.getExpensePayments = asyncHandler(async (req, res) => {
  const filter = { expenseSource: 'manual' };
  if (req.query.status) filter.paymentStatus = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Expense.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: expenses });
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
  notifyRoles({ modules: ['Financial', 'Expenses'], type: 'purchase', title: 'Expense Payment Recorded', message: `Payment of ₹${amountPaid?.toLocaleString()} recorded for expense ${expense.expenseCode || ''}`, link: '/financial' }).catch(() => {});
  res.status(200).json({ success: true, data: expense });
});

// ─── REIMBURSEMENT — PICKUP ───────────────────────────────────────────────────
// Reimbursement claims — a PickupOrder becomes a claim once a Pickup Team member (not
// Finance) settled it out of pocket; that's what Dispatch's "Reimbursement Claims" tab
// and this Financial tab both read, so a payment recorded here shows up there live.
exports.getPickupExpenses = asyncHandler(async (req, res) => {
  const filter = { paymentBy: 'Pickup Team' };
  if (req.query.paymentStatus) filter.reimbursementStatus = req.query.paymentStatus;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [records, total] = await Promise.all([
    PickupOrder.find(filter)
      .populate('pickupEmpId', 'fullName staffCode')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    PickupOrder.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: records });
});

exports.payPickupExpense = asyncHandler(async (req, res, next) => {
  const pickup = await PickupOrder.findById(req.params.id);
  if (!pickup) return next(new AppError('Pickup order not found', 404));

  const proofUrl = req.file?.path || req.body.proofUrl || pickup.reimbursementProofUrl;
  const paidBy = req.body.paidBy || req.body.paid_by || req.user.fullName;
  const remaining = Math.max(0, (pickup.amount || 0) - (pickup.reimbursedAmount || 0));
  const rawAmount = req.body.amount ?? req.body.paidAmount;
  const payAmount = rawAmount !== undefined ? Math.min(Math.max(0, Number(rawAmount) || 0), remaining) : remaining;

  pickup.reimbursedAmount = (pickup.reimbursedAmount || 0) + payAmount;
  pickup.reimbursementProofUrl = proofUrl;
  pickup.paidDate = new Date();
  pickup.paidBy = paidBy;
  pickup.reimbursementStatus = pickup.reimbursedAmount >= (pickup.amount || 0) ? 'Paid' : (pickup.reimbursedAmount > 0 ? 'Partial' : 'Pending');
  await pickup.save({ validateBeforeSave: false });

  // Create expense record so the Expenses module reflects this payment
  const expCode = await generateCode('EXP');
  const balanceAfter = Math.max(0, (pickup.amount || 0) - pickup.reimbursedAmount);
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Shipping / Transportation',
    description: `Pickup reimbursement ${pickup.reimbursementStatus === 'Paid' ? 'paid in full' : 'part-paid'} — Order: ${pickup.orderCode || 'N/A'}${balanceAfter > 0 ? ` — Balance: Rs.${balanceAfter.toFixed(2)}` : ''}`,
    amount: payAmount,
    paidAmount: payAmount,
    proofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy,
    expenseSource: 'reimbursement',
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: pickup });
});

// ─── REIMBURSEMENT — LOCAL PURCHASE ──────────────────────────────────────────
exports.getLocalPurchaseExpenses = asyncHandler(async (req, res) => {
  // Show ALL local purchases (Credit, and Instant paid by either Finance Team or
  // Purchase Person) — Instant/Finance Team entries are already Paid and just
  // logged here for tracking; Credit and Instant/Purchase Person entries are
  // Pending and need Finance to settle via the Pay Now action.
  const filter = {};
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [localPurchases, total] = await Promise.all([
    LocalPurchase.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    LocalPurchase.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: localPurchases });
});

exports.payLocalPurchase = asyncHandler(async (req, res, next) => {
  const lp = await LocalPurchase.findById(req.params.id);
  if (!lp) return next(new AppError('Local purchase not found', 404));

  const proofUrl = req.file?.path || req.body.proofUrl || lp.paymentProofUrl;
  const paidBy = req.body.paidBy || req.body.paid_by || req.user.fullName;
  const remaining = Math.max(0, (lp.totalAmount || 0) - (lp.paidAmount || 0));
  const rawAmount = req.body.amount ?? req.body.paidAmount;
  const payAmount = rawAmount !== undefined ? Math.min(Math.max(0, Number(rawAmount) || 0), remaining) : remaining;

  lp.paidAmount = (lp.paidAmount || 0) + payAmount;
  lp.paymentProofUrl = proofUrl;
  lp.paidDate = new Date();
  lp.paidBy = paidBy;
  lp.paymentStatus = lp.paidAmount >= lp.totalAmount ? 'Paid' : (lp.paidAmount > 0 ? 'Partially Paid' : 'Pending');
  lp.paymentHistory = lp.paymentHistory || [];
  lp.paymentHistory.push({ amount: payAmount, paidBy, paidDate: new Date(), proofUrl });
  await lp.save({ validateBeforeSave: false });

  // Create expense record so the Expenses module reflects this payment
  const expCode = await generateCode('EXP');
  const itemNames = (lp.items || []).map(i => i.itemName || i.name).filter(Boolean).join(', ');
  const balanceAfter = Math.max(0, lp.totalAmount - lp.paidAmount);
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Raw Material',
    description: `Local purchase ${lp.paymentStatus === 'Paid' ? 'paid in full' : 'part-paid'} — Invoice: ${lp.invoiceNo || 'N/A'}${itemNames ? ` (${itemNames})` : ''}${balanceAfter > 0 ? ` — Balance: Rs.${balanceAfter.toFixed(2)}` : ''}`,
    amount: payAmount,
    paidAmount: payAmount,
    vendorPayee: lp.vendorName,
    proofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy,
    expenseSource: 'reimbursement',
    createdBy: req.user._id,
  });

  res.status(200).json({ success: true, data: lp });
});

// ─── REIMBURSEMENT — LR PAYMENT ──────────────────────────────────────────────
// Purchase's LR Upload marks a shipment's freight/LR as 'Paid' or 'Not Paid' at
// upload time (PurchaseOrder.lrPaymentStatus). A "Not Paid"/"Partial Paid" LR needs
// Finance to settle it directly with the vendor/transporter, so it's listed here
// instead of under Pickup Expense (which is reserved for Pickup Team out-of-pocket
// claims — see getPickupExpenses above). alertConfigQueries.js rings Finance
// automatically once the expected delivery date arrives, until this is fully Paid.
exports.getLrPayments = asyncHandler(async (req, res) => {
  const filter = { lrPaymentStatus: { $ne: null } };
  if (req.query.paymentStatus) filter.lrPaymentStatus = req.query.paymentStatus;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [records, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate('vendorId', 'name phone')
      .sort('expectedDeliveryDate')
      .skip((page - 1) * limit)
      .limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: records });
});

exports.payLrPayment = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));

  const proofUrl = req.file?.path || req.body.proofUrl;
  const paidBy = req.body.paidBy || req.body.paid_by || req.user.fullName;
  // Payable is the LR copy's Bill Total Amount, not the vendor's goods `amount` — see
  // PurchaseOrder.billTotalAmount.
  const remaining = Math.max(0, (order.billTotalAmount || 0) - (order.lrPaidAmount || 0));
  const rawAmount = req.body.amount ?? req.body.paidAmount;
  const payAmount = rawAmount !== undefined ? Math.min(Math.max(0, Number(rawAmount) || 0), remaining) : remaining;

  order.lrPaidAmount = (order.lrPaidAmount || 0) + payAmount;
  order.lrPaymentStatus = order.lrPaidAmount >= (order.billTotalAmount || 0) ? 'Paid' : (order.lrPaidAmount > 0 ? 'Partial Paid' : 'Not Paid');
  await order.save({ validateBeforeSave: false });

  // Keep the linked Dispatch "Pick Up Order" entry in sync — its paymentStatus is
  // binary (Unpaid/Paid), so only flip it once the LR is fully settled.
  await PickupOrder.findOneAndUpdate(
    { purchaseOrderId: order._id },
    { paymentStatus: order.lrPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid' }
  );

  const expCode = await generateCode('EXP');
  const balanceAfter = Math.max(0, (order.billTotalAmount || 0) - order.lrPaidAmount);
  await Expense.create({
    expenseCode: expCode,
    expenseDate: new Date(),
    category: 'Shipping / Transportation',
    description: `LR payment ${order.lrPaymentStatus === 'Paid' ? 'paid in full' : 'part-paid'} — ${order.itemName || order.poCode}${order.lrNumber ? ` (LR ${order.lrNumber})` : ''} — ${order.vendorId?.name || 'Vendor'}${balanceAfter > 0 ? ` — Balance: Rs.${balanceAfter.toFixed(2)}` : ''}`,
    amount: payAmount,
    paidAmount: payAmount,
    vendorPayee: order.vendorId?.name,
    proofUrl,
    paymentStatus: 'Paid',
    paidDate: new Date(),
    paidBy,
    expenseSource: 'reimbursement',
    createdBy: req.user._id,
  });

  notifyRoles({ modules: ['Financial', 'Purchase'], type: 'purchase', title: 'LR Payment Settled', message: `LR payment of ₹${payAmount?.toLocaleString()} recorded for ${order.itemName || order.poCode} (LR ${order.lrNumber || 'N/A'}) — now ${order.lrPaymentStatus}.`, link: '/financial' }).catch(() => {});
  res.status(200).json({ success: true, data: order });
});
