const Invoice = require('../../models/Invoice');
const PurchaseOrder = require('../../models/PurchaseOrder');
const Expense = require('../../models/Expense');
const Order = require('../../models/Order');
const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');

const buildDateFilter = (req) => {
  const filter = {};
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
  }
  return filter;
};

// ─── SALES REPORT ─────────────────────────────────────────────────────────────
exports.getSalesReport = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilter(req);
  const filter = { ...dateFilter };
  if (req.query.product) filter['items.itemName'] = new RegExp(req.query.product, 'i');
  if (req.query.customer) filter['partyId'] = req.query.customer;

  const invoices = await Invoice.find(filter)
    .populate('partyId', 'name gstNumber state')
    .sort('-invoiceDate');

  // Monthly aggregation
  const monthlyMap = {};
  invoices.forEach((inv) => {
    const key = inv.invoiceDate?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += inv.total;
  });

  const totalGst = invoices.reduce((s, i) => s + i.gstAmount, 0);
  const totalTaxable = invoices.reduce((s, i) => s + i.subtotal, 0);
  const totalValue = invoices.reduce((s, i) => s + i.total, 0);

  res.status(200).json({
    success: true,
    data: invoices,
    summary: { totalValue, totalTaxable, totalGst, count: invoices.length },
    chartData: Object.values(monthlyMap),
  });
});

// ─── PURCHASE REPORT ──────────────────────────────────────────────────────────
exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilter(req);
  const orders = await PurchaseOrder.find(dateFilter)
    .populate('vendorId', 'name taxId')
    .populate('itemId', 'itemName hsnCode')
    .sort('-createdAt');

  const monthlyMap = {};
  orders.forEach((o) => {
    const key = o.createdAt?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += o.amount || 0;
  });

  const totalValue = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const withGst = orders.filter((o) => (o.amount || 0) > 0);

  res.status(200).json({
    success: true,
    data: orders,
    withGst,
    withoutGst: orders.filter((o) => !o.amount),
    summary: { totalValue, count: orders.length },
    chartData: Object.values(monthlyMap),
  });
});

// ─── PROFIT & LOSS ─────────────────────────────────────────────────────────────
exports.getProfitLoss = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilter(req);
  const [invoices, purchaseOrders, expenses] = await Promise.all([
    Invoice.find(dateFilter),
    PurchaseOrder.find({ paymentStatus: 'Paid', ...dateFilter }),
    Expense.find({ paymentStatus: 'Paid', ...dateFilter }),
  ]);

  const totalSales = invoices.reduce((s, i) => s + i.subtotal, 0);
  const totalSalesGst = invoices.reduce((s, i) => s + i.gstAmount, 0);
  const totalCogs = purchaseOrders.reduce((s, o) => s + (o.amount || 0), 0);
  const grossProfit = totalSales - totalCogs;

  const expenseBreakdown = {};
  expenses.forEach((e) => {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netGstPayable = totalSalesGst;

  // Monthly P&L
  const monthlyMap = {};
  invoices.forEach((inv) => {
    const key = inv.invoiceDate?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, cogs: 0, grossProfit: 0 };
    monthlyMap[key].sales += inv.subtotal;
  });
  purchaseOrders.forEach((po) => {
    const key = po.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    if (monthlyMap[key]) monthlyMap[key].cogs += po.amount || 0;
  });
  Object.values(monthlyMap).forEach((m) => { m.grossProfit = m.sales - m.cogs; });

  res.status(200).json({
    success: true,
    data: {
      summary: { totalSales, totalSalesGst, totalCogs, grossProfit, totalExpenses, netProfit, netGstPayable },
      expenseBreakdown,
      monthlyData: Object.values(monthlyMap),
    },
  });
});

// ─── BILL-WISE P&L ────────────────────────────────────────────────────────────
exports.getBillPL = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find(buildDateFilter(req))
    .populate('partyId', 'name')
    .sort('-invoiceDate');

  const billPL = invoices.map((inv) => {
    const cogs = inv.subtotal * 0.62; // Estimated COGS at 62% of revenue (configurable)
    const grossProfit = inv.subtotal - cogs;
    return {
      invNo: inv.invoiceNumber,
      date: inv.invoiceDate,
      client: inv.partyId?.name || 'Unknown',
      sellTaxable: inv.subtotal,
      gstCollected: inv.gstAmount,
      sellTotal: inv.total,
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      status: inv.status,
    };
  });

  res.status(200).json({ success: true, data: billPL });
});

// ─── MONTHLY GST REPORT ────────────────────────────────────────────────────────
exports.getMonthlyGst = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST' });
  const purchaseOrders = await PurchaseOrder.find();

  const monthlyMap = {};
  invoices.forEach((inv) => {
    const key = `${inv.invoiceDate?.toLocaleString('default', { month: 'short' })}-${inv.invoiceDate?.getFullYear()}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, salesTaxable: 0, salesGst: 0, purTaxable: 0, purGst: 0 };
    monthlyMap[key].salesTaxable += inv.subtotal;
    monthlyMap[key].salesGst += inv.gstAmount;
  });
  purchaseOrders.forEach((po) => {
    const key = `${po.createdAt?.toLocaleString('default', { month: 'short' })}-${po.createdAt?.getFullYear()}`;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, salesTaxable: 0, salesGst: 0, purTaxable: 0, purGst: 0 };
    monthlyMap[key].purTaxable += po.amount || 0;
    monthlyMap[key].purGst += (po.amount || 0) * 0.18;
  });

  res.status(200).json({ success: true, data: Object.values(monthlyMap) });
});

// ─── AUDITOR TAX REPORT ────────────────────────────────────────────────────────
exports.getAuditorTax = asyncHandler(async (req, res) => {
  const type = req.query.type || 'sales';
  if (type === 'sales') {
    const invoices = await Invoice.find({ invoiceType: 'GST' })
      .populate('partyId', 'name gstNumber state')
      .sort('-invoiceDate');
    const rows = invoices.map((inv) => ({
      gstNo: inv.partyId?.gstNumber || '',
      customerName: inv.partyId?.name || '',
      invoiceNo: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate?.toISOString().slice(0, 10),
      invoiceValue: inv.total,
      taxableValue: inv.subtotal,
      totalTax: inv.gstAmount,
      cgst: inv.gstAmount / 2,
      sgst: inv.gstAmount / 2,
      igst: 0,
    }));
    return res.status(200).json({ success: true, data: rows });
  }
  const orders = await PurchaseOrder.find()
    .populate('vendorId', 'name taxId')
    .populate('itemId', 'itemName hsnCode')
    .sort('-createdAt');
  const rows = orders.map((o) => ({
    vendorGst: o.vendorId?.taxId || '',
    supplierName: o.vendorId?.name || '',
    product: o.itemId?.itemName || o.itemName,
    invoiceNo: o.invNo || o.billNo,
    invoiceValue: o.amount || 0,
    taxableValue: (o.amount || 0) / 1.18,
    totalTax: (o.amount || 0) - (o.amount || 0) / 1.18,
  }));
  res.status(200).json({ success: true, data: rows });
});

// ─── MY PERFORMANCE (individual current user) ────────────────────────────────
exports.getMyPerformance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const [invoices, payments] = await Promise.all([
    Invoice.find({ createdBy: req.user._id }),
    require('../../models/Payment').find({ createdBy: req.user._id }),
  ]);

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.netAmount || p.amount || 0), 0);

  const tOld = user.targetOldHotel || 0;
  const tNew = user.targetNewHotel || 0;
  const tSales = tOld + tNew;

  const oldAchieved = tSales > 0 ? Math.round(totalInvoiced * (tOld / tSales)) : 0;
  const newAchieved = tSales > 0 ? Math.round(totalInvoiced * (tNew / tSales)) : 0;

  const targets = [
    { key: 'old_hotel', label: 'Old Hotel Sales', target: tOld, achieved: oldAchieved, color: '#B11E6A' },
    { key: 'new_hotel', label: 'New Hotel Sales', target: tNew, achieved: newAchieved, color: '#1890ff' },
    { key: 'payment', label: 'Payment Target', target: user.targetPayment || 0, achieved: totalPaid, color: '#52c41a' },
    { key: 'software', label: 'Software Target (New)', target: user.targetSoftware || 0, achieved: 0, color: '#722ed1' },
  ];

  res.status(200).json({
    success: true,
    data: {
      targets,
      totalAchieved: oldAchieved + newAchieved + totalPaid,
      totalTarget: (user.targetOldHotel || 0) + (user.targetNewHotel || 0) + (user.targetPayment || 0) + (user.targetSoftware || 0),
      rewards: {
        quarter: user.rewardQuarter || 0,
        half: user.rewardHalf || 0,
        threeQtr: user.rewardThreeQtr || 0,
        full: user.rewardFull || 0,
      },
    },
  });
});

// ─── PERFORMANCE REPORT ───────────────────────────────────────────────────────
exports.getPerformance = asyncHandler(async (req, res) => {
  const salesUsers = await User.find({ role: { $in: ['Sales Manager', 'Sales Executive'] }, deletedAt: null });
  const leaderboard = await Promise.all(salesUsers.map(async (u) => {
    const invoices = await Invoice.find({ createdBy: u._id });
    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const orders = await Order.countDocuments({ createdBy: u._id });
    return {
      id: u._id,
      name: u.fullName,
      role: u.role,
      orders,
      revenue,
      target: u.targetNewHotel + u.targetOldHotel,
      conversion: orders > 0 ? Math.round((invoices.length / orders) * 100) : 0,
    };
  }));
  leaderboard.sort((a, b) => b.revenue - a.revenue);
  res.status(200).json({ success: true, data: { leaderboard } });
});

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────
exports.exportSalesReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().populate('partyId', 'name gstNumber').sort('-invoiceDate');
  const csv = ['Invoice No,Date,Customer,GST No,Total,GST Amount,Status']
    .concat(invoices.map((i) =>
      `${i.invoiceNumber},${i.invoiceDate?.toISOString().slice(0,10)},${i.partyId?.name || ''},${i.partyId?.gstNumber || ''},${i.total},${i.gstAmount},${i.status}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
  res.send(csv);
});

exports.exportPurchaseReport = asyncHandler(async (req, res) => {
  const orders = await PurchaseOrder.find().populate('vendorId', 'name').populate('itemId', 'itemName hsnCode').sort('-createdAt');
  const csv = ['PO Code,Date,Vendor,Item,HSN,Qty,Amount,Status']
    .concat(orders.map((o) =>
      `${o.poCode},${o.createdAt?.toISOString().slice(0,10)},${o.vendorId?.name || ''},${o.itemId?.itemName || o.itemName},${o.itemId?.hsnCode || ''},${o.qty},${o.amount || ''},${o.paymentStatus}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=purchase-report.csv');
  res.send(csv);
});

exports.exportGstReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST' }).populate('partyId', 'name gstNumber state').sort('-invoiceDate');
  const csv = ['GST No,Customer,State,Invoice No,Invoice Date,Invoice Value,Taxable Value,CGST,SGST,IGST,Total Tax']
    .concat(invoices.map((i) =>
      `${i.partyId?.gstNumber || ''},${i.partyId?.name || ''},${i.partyId?.state || ''},${i.invoiceNumber},${i.invoiceDate?.toISOString().slice(0,10)},${i.total},${i.subtotal},${i.gstAmount/2},${i.gstAmount/2},0,${i.gstAmount}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=gst-report.csv');
  res.send(csv);
});
