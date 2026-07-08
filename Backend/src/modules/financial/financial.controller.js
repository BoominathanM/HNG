const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const PickupOrder = require('../../models/PickupOrder');
const Expense = require('../../models/Expense');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');

// ─── QUOTATION REQUESTS ────────────────────────────────────────────────────────

// A batch's PurchaseOrder is consolidated into ONE document keyed by batchId.
// Legacy/lone requests (no batchId) get a synthesized, globally-unique
// `SOLO-<requestId>` key backfilled onto the request — never match on a bare
// null/absent batchId, since that would match every legacy order at once and
// silently fold unrelated approvals together.
async function resolveBatchKey(request) {
  if (request.batchId) return request.batchId;
  const soloKey = `SOLO-${request._id}`;
  request.batchId = soloKey;
  await request.save({ validateBeforeSave: false });
  return soloKey;
}

async function upsertOrderForApprovedRequest(request, userId) {
  const batchKey = await resolveBatchKey(request);
  let order = await PurchaseOrder.findOne({ batchId: batchKey });

  const itemEntry = {
    requestId: request._id,
    itemId: request.itemId,
    itemName: request.itemName,
    qty: request.qty,
    unit: request.unit,
  };

  if (!order) {
    const poCode = await generateCode('PO');
    order = await PurchaseOrder.create({
      poCode,
      requestId: request._id,
      vendorId: request.vendorId,
      itemId: request.itemId,
      itemName: request.itemName,
      qty: request.qty,
      unit: request.unit,
      paymentTerms: request.paymentTerms,
      batchId: batchKey,
      amount: request.amount,
      items: [itemEntry],
      createdBy: userId,
    });
  } else {
    const existingItem = (order.items || []).find((it) => String(it.requestId) === String(request._id));
    if (existingItem) {
      // Re-approval after Purchase edited & resent the request (see updateRequestDetails)
      // — sync the item's latest qty/unit instead of leaving the order stale.
      existingItem.qty = request.qty;
      existingItem.unit = request.unit;
      existingItem.itemName = request.itemName;
    } else {
      order.items.push(itemEntry);
    }
    // Single-item orders (solo requests, or the only item in a batch) mirror the
    // request 1:1 — safe to re-sync on every (re-)approval. Multi-item batch totals
    // stay untouched here; Finance manages those separately via updateOrderAmount.
    if (order.items.length === 1) {
      order.qty = request.qty;
      order.unit = request.unit;
      order.paymentTerms = request.paymentTerms;
      if (request.amount != null) order.amount = request.amount;
    } else if (order.amount == null && request.amount != null) {
      order.amount = request.amount;
    }
    await order.save({ validateBeforeSave: false });
  }
  return order;
}

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
  const update = { qty: req.body.qty, paymentTerms: req.body.paymentTerms };
  if (req.body.amount !== undefined && req.body.amount !== '') {
    const amt = Number(req.body.amount);
    if (!Number.isNaN(amt) && amt >= 0) update.amount = amt;
  }
  const request = await PurchaseRequest.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!request) return next(new AppError('Request not found', 404));
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
