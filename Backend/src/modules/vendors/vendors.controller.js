const Vendor = require('../../models/Vendor');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

exports.getVendors = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.vendorType = req.query.type;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort('name').skip((page - 1) * limit).limit(limit).lean(),
    Vendor.countDocuments(filter),
  ]);

  // Bulk-load every bill for this page's vendors so the list shows real
  // Total/Paid/Pending instead of hardcoded zeros.
  const vendorIds = vendors.map((v) => v._id);
  const [orders, localPurchases] = await Promise.all([
    PurchaseOrder.find({ vendorId: { $in: vendorIds } }).select('vendorId amount paidAmount').lean(),
    LocalPurchase.find({ vendorId: { $in: vendorIds } }).select('vendorId totalAmount paidAmount').lean(),
  ]);

  const totalsByVendor = {};
  const bump = (id, billed, paid) => {
    const key = id.toString();
    if (!totalsByVendor[key]) totalsByVendor[key] = { totalBilled: 0, totalPaid: 0 };
    totalsByVendor[key].totalBilled += billed;
    totalsByVendor[key].totalPaid += paid;
  };
  orders.forEach((o) => o.vendorId && bump(o.vendorId, Number(o.amount) || 0, Number(o.paidAmount) || 0));
  localPurchases.forEach((lp) => lp.vendorId && bump(lp.vendorId, Number(lp.totalAmount) || 0, Number(lp.paidAmount) || 0));

  const withTotals = vendors.map((v) => {
    const t = totalsByVendor[v._id.toString()] || { totalBilled: 0, totalPaid: 0 };
    return { ...v, totalBilled: t.totalBilled, totalPaid: t.totalPaid, pending: Math.max(0, t.totalBilled - t.totalPaid) };
  });

  res.status(200).json({ success: true, total, page, data: withTotals });
});

exports.getVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.createVendor = asyncHandler(async (req, res) => {
  const vendorCode = await generateCode('VEN');
  const vendor = await Vendor.create({ ...req.body, vendorCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: vendor });
});

exports.updateVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.deleteVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  vendor.deletedAt = Date.now();
  await vendor.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Vendor deleted' });
});

exports.getVendorHistory = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  const orders = await PurchaseOrder.find({ vendorId: vendor._id })
    .populate('itemId', 'itemName unit')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: orders, vendor });
});

// Unified vendor ledger — merges PurchaseOrder + LocalPurchase bills (the two
// separate collections vendor spend is split across) into one per-bill payment
// history, one chronological payment feed, and a Tally-style running-balance
// ledger, so a single vendor view shows everything owed/paid regardless of
// which purchase flow created the bill.
exports.getVendorLedger = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));

  const [orders, localPurchases] = await Promise.all([
    PurchaseOrder.find({ vendorId: vendor._id }).populate('itemId', 'itemName unit').sort('-createdAt').lean(),
    LocalPurchase.find({ vendorId: vendor._id }).sort('-createdAt').lean(),
  ]);

  const bills = [
    ...orders.map((o) => ({
      _id: o._id,
      source: 'PurchaseOrder',
      code: o.poCode,
      billNo: o.billNo || o.invNo || o.poCode,
      date: o.createdAt,
      items: (o.items && o.items.length ? o.items : [{ itemName: o.itemName, qty: o.qty, unit: o.unit }]).filter((i) => i.itemName),
      amount: Number(o.amount) || 0,
      paidAmount: Number(o.paidAmount) || 0,
      balance: Math.max(0, (Number(o.amount) || 0) - (Number(o.paidAmount) || 0)),
      status: o.paymentStatus,
      paymentHistory: o.paymentHistory || [],
      invoiceFileUrl: o.invoiceFileUrl,
      dispatchStatus: o.dispatchStatus,
    })),
    ...localPurchases.map((lp) => ({
      _id: lp._id,
      source: 'LocalPurchase',
      code: lp.lpCode,
      billNo: lp.invoiceNo,
      date: lp.createdAt,
      items: (lp.items || []).filter((i) => i.itemName),
      amount: Number(lp.totalAmount) || 0,
      paidAmount: Number(lp.paidAmount) || 0,
      balance: Math.max(0, (Number(lp.totalAmount) || 0) - (Number(lp.paidAmount) || 0)),
      status: lp.paymentStatus,
      paymentHistory: lp.paymentHistory || [],
      invoiceFileUrl: lp.invoiceFileUrl,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Flatten every payment across every bill into one chronological feed.
  const payments = bills
    .flatMap((b) => (b.paymentHistory || []).map((p) => ({
      billId: b._id,
      billCode: b.code,
      billSource: b.source,
      billNo: b.billNo,
      amount: p.amount,
      paidBy: p.paidBy,
      paidDate: p.paidDate,
      proofUrl: p.proofUrl,
      note: p.note,
    })))
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  // Tally-style ledger: one debit row per bill, one credit row per payment,
  // merged chronologically (ascending) with a running balance.
  const events = [
    ...bills.map((b) => ({ entryDate: b.date, type: 'Bill', docRef: b.billNo || b.code, debit: b.amount, credit: 0 })),
    ...payments.map((p) => ({ entryDate: p.paidDate, type: 'Payment', docRef: p.billNo || p.billCode, debit: 0, credit: p.amount })),
  ].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));

  let running = 0;
  const ledger = events.map((e) => {
    running += (e.debit || 0) - (e.credit || 0);
    return { ...e, balance: running };
  });

  const totalBilled = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);

  res.status(200).json({
    success: true,
    vendor,
    bills,
    payments,
    ledger,
    totals: { totalBilled, totalPaid, totalPending: Math.max(0, totalBilled - totalPaid) },
  });
});

exports.updateVendorStatus = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { status: req.body.status },
    { new: true }
  );
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.generateAiSummary = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  const orders = await PurchaseOrder.find({ vendorId: vendor._id }).populate('itemId', 'itemName');
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === 'Paid').length;
  const summary = `Vendor: ${vendor.name}\nTotal Orders: ${totalOrders}\nTotal Spent: ₹${totalSpent.toLocaleString()}\nPaid Orders: ${paidOrders}/${totalOrders}\nStatus: ${vendor.status}\nLast Active: ${orders[0]?.createdAt?.toISOString().slice(0, 10) || 'N/A'}`;
  vendor.aiSummary = summary;
  vendor.aiSummaryDate = Date.now();
  await vendor.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: { summary, vendor } });
});
