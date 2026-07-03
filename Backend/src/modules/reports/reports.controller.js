const Invoice = require('../../models/Invoice');
const PurchaseOrder = require('../../models/PurchaseOrder');
const Expense = require('../../models/Expense');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Complaint = require('../../models/Complaint');
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
  const filter = { deletedAt: null, status: { $ne: 'Cancelled' }, ...dateFilter };
  if (req.query.product) filter['items.itemName'] = new RegExp(req.query.product, 'i');
  if (req.query.customer) filter.clientName = new RegExp(req.query.customer, 'i');

  const orders = await Order.find(filter)
    .populate('clientPartyId', 'name gstNumber state')
    .sort('-createdAt');

  const monthlyMap = {};
  orders.forEach((o) => {
    const key = o.createdAt?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += Number(o.total) || Number(o.amount) || 0;
  });

  const totalGst = orders.reduce((s, o) => s + (Number(o.gstAmount) || 0), 0);
  const totalTaxable = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalValue = orders.reduce((s, o) => s + (Number(o.total) || Number(o.amount) || 0), 0);

  const data = orders.map((o) => {
    const gstAmt = Number(o.gstAmount) || 0;
    const taxable = Number(o.amount) || 0;
    const invValue = Number(o.total) || (taxable + gstAmt);
    const mainProduct = o.items?.[0]?.itemName || o.product || '';

    return {
      key: String(o._id),
      gst_no: o.gstNumber || o.clientPartyId?.gstNumber || '',
      customer: o.clientName || o.clientPartyId?.name || '',
      product: mainProduct,
      state_code: '',
      state_name: o.state || o.clientPartyId?.state || '',
      inv_no: o.orderCode || '',
      orig_inv_no: '',
      inv_date: o.createdAt?.toISOString().slice(0, 10) || '',
      inv_value: invValue,
      total_tax: gstAmt,
      taxable,
      cgst: Math.round(gstAmt / 2),
      sgst: Math.round(gstAmt / 2),
      igst: 0,
    };
  });

  res.status(200).json({
    success: true,
    data,
    summary: { totalValue, totalTaxable, totalGst, count: orders.length },
    chartData: Object.values(monthlyMap),
  });
});

// ─── PURCHASE REPORT ──────────────────────────────────────────────────────────
exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilter(req);
  const orders = await PurchaseOrder.find(dateFilter)
    .populate('vendorId', 'name taxId')
    .populate('itemId', 'itemName hsnCode gstPercent')
    .sort('-createdAt');

  const monthlyMap = {};
  orders.forEach((o) => {
    const key = o.createdAt?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += o.amount || 0;
  });

  const data = orders.map((o) => {
    const amt = Number(o.amount) || 0;
    const gstRate = o.itemId?.gstPercent ?? 18;
    const taxable = gstRate > 0 ? amt / (1 + gstRate / 100) : amt;
    const totalTax = amt - taxable;

    return {
      key: String(o._id),
      vendor_gst: o.vendorId?.taxId || '',
      supplier: o.vendorId?.name || '',
      product: o.itemId?.itemName || o.itemName || '',
      hsn: o.itemId?.hsnCode || '',
      gst_rate: gstRate,
      qty: o.qty || 0,
      unit_price: o.qty ? Math.round((taxable / o.qty) * 100) / 100 : 0,
      state_code: '',
      state_name: '',
      inv_no: o.invNo || o.billNo || o.poCode || '',
      orig_inv_no: '',
      inv_date: o.createdAt?.toISOString().slice(0, 10) || '',
      taxable: Math.round(taxable),
      cgst: Math.round(totalTax / 2),
      sgst: Math.round(totalTax / 2),
      igst: 0,
      total_tax: Math.round(totalTax),
      inv_value: amt,
    };
  });

  const totalValue = data.reduce((s, r) => s + r.inv_value, 0);

  res.status(200).json({
    success: true,
    data,
    withGst: data.filter((r) => r.total_tax > 0),
    withoutGst: data.filter((r) => r.total_tax === 0),
    summary: { totalValue, count: orders.length },
    chartData: Object.values(monthlyMap),
  });
});

// Expense category → P&L bucket mapping
const EXPENSE_CAT_MAP = {
  'Raw Material': 'other',
  'Shipping / Transportation': 'transport',
  'Utilities (Rent/Elec)': 'utilities',
  'Other': 'other',
  'Purchase': 'other',
};
const emptyExpenses = () => ({ rent: 0, salary: 0, utilities: 0, transport: 0, marketing: 0, other: 0 });

// ─── PROFIT & LOSS ─────────────────────────────────────────────────────────────
exports.getProfitLoss = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilter(req);
  const [orders, purchaseOrders, expenses] = await Promise.all([
    Order.find({ deletedAt: null, status: { $ne: 'Cancelled' }, ...dateFilter }),
    PurchaseOrder.find(dateFilter),
    Expense.find(dateFilter),
  ]);

  const totalSales = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalSalesGst = orders.reduce((s, o) => s + (Number(o.gstAmount) || 0), 0);
  const totalCogs = purchaseOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const grossProfit = totalSales - totalCogs;

  const expenseBreakdown = emptyExpenses();
  expenses.forEach((e) => {
    const cat = EXPENSE_CAT_MAP[e.category] || 'other';
    expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + e.amount;
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netGstPayable = totalSalesGst;

  // Monthly P&L with per-category expense breakdown
  const monthlyMap = {};
  orders.forEach((o) => {
    const key = o.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, expenses: emptyExpenses() };
    monthlyMap[key].sales += Number(o.amount) || 0;
    monthlyMap[key].salesGst += Number(o.gstAmount) || 0;
  });
  purchaseOrders.forEach((po) => {
    const key = po.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, expenses: emptyExpenses() };
    const amt = Number(po.amount) || 0;
    monthlyMap[key].cogs += amt;
    monthlyMap[key].cogsGst += Math.round(amt - amt / 1.18);
  });
  Object.values(monthlyMap).forEach((m) => { m.grossProfit = m.sales - m.cogs; });
  expenses.forEach((e) => {
    const key = e.expenseDate?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, expenses: emptyExpenses() };
    const cat = EXPENSE_CAT_MAP[e.category] || 'other';
    monthlyMap[key].expenses[cat] = (monthlyMap[key].expenses[cat] || 0) + e.amount;
  });

  // Product-wise P&L (from order items)
  const productMap = {};
  orders.forEach((o) => {
    const items = o.items?.length
      ? o.items
      : [{ itemName: o.product || 'Unknown', lineTotal: Number(o.amount) || 0, qty: Number(o.qty) || 0 }];
    items.forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMap[name]) productMap[name] = { product: name, sales: 0, cogs: 0, grossProfit: 0, soldQty: 0, stockQty: 0 };
      const itemSales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMap[name].sales += itemSales;
      productMap[name].soldQty += Number(item.qty) || 0;
    });
  });
  Object.values(productMap).forEach((p) => {
    p.cogs = Math.round(p.sales * 0.65);
    p.grossProfit = p.sales - p.cogs;
  });

  // Per-product monthly breakdown
  const productMonthlyData = {};
  orders.forEach((o) => {
    const month = o.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    const items = o.items?.length
      ? o.items
      : [{ itemName: o.product || 'Unknown', lineTotal: Number(o.amount) || 0, qty: Number(o.qty) || 0 }];
    items.forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMonthlyData[name]) productMonthlyData[name] = {};
      if (!productMonthlyData[name][month]) productMonthlyData[name][month] = { month, sales: 0, cogs: 0, grossProfit: 0 };
      const sales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMonthlyData[name][month].sales += sales;
    });
  });
  Object.keys(productMonthlyData).forEach((prod) => {
    const byMonth = Object.values(productMonthlyData[prod]);
    byMonth.forEach((m) => { m.cogs = Math.round(m.sales * 0.65); m.grossProfit = m.sales - m.cogs; });
    productMonthlyData[prod] = byMonth;
  });

  res.status(200).json({
    success: true,
    data: {
      summary: { totalSales, totalSalesGst, totalCogs, grossProfit, totalExpenses, netProfit, netGstPayable },
      expenseBreakdown,
      monthlyData: Object.values(monthlyMap),
      productData: Object.values(productMap),
      productMonthlyData,
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
    const inputGst = cogs - cogs / 1.18;
    return {
      key: String(inv._id),
      inv_no: inv.invoiceNumber,
      date: inv.invoiceDate?.toISOString().slice(0, 10) || '',
      client: inv.partyId?.name || 'Unknown',
      product: inv.items?.[0]?.itemName || 'General',
      sell_taxable: inv.subtotal,
      gst_collected: inv.gstAmount,
      sell_total: inv.total,
      cogs: Math.round(cogs),
      input_gst: Math.round(inputGst),
      gross_profit: Math.round(grossProfit),
      status: inv.status,
    };
  });

  res.status(200).json({ success: true, data: billPL });
});

// ─── MONTHLY GST REPORT ────────────────────────────────────────────────────────
const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getMonthlyGst = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST' });
  const purchaseOrders = await PurchaseOrder.find().populate('itemId', 'gstPercent');

  const monthlyMap = {};
  const ensureRow = (date) => {
    const month = date?.toLocaleString('default', { month: 'short' }) || '';
    const year = date?.getFullYear() || '';
    const key = `${month}-${year}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        key, month, year,
        sales_taxable: 0, sales_cgst: 0, sales_sgst: 0, sales_igst: 0, sales_total_gst: 0,
        pur_taxable: 0, pur_cgst: 0, pur_sgst: 0, pur_igst: 0, pur_total_gst: 0,
      };
    }
    return monthlyMap[key];
  };

  invoices.forEach((inv) => {
    const row = ensureRow(inv.invoiceDate);
    const gstAmt = inv.gstAmount || 0;
    row.sales_taxable += inv.subtotal || 0;
    row.sales_cgst += gstAmt / 2;
    row.sales_sgst += gstAmt / 2;
    row.sales_total_gst += gstAmt;
  });

  purchaseOrders.forEach((po) => {
    const row = ensureRow(po.createdAt);
    const amt = po.amount || 0;
    const gstRate = po.itemId?.gstPercent ?? 18;
    const taxable = gstRate > 0 ? amt / (1 + gstRate / 100) : amt;
    const gstAmt = amt - taxable;
    row.pur_taxable += taxable;
    row.pur_cgst += gstAmt / 2;
    row.pur_sgst += gstAmt / 2;
    row.pur_total_gst += gstAmt;
  });

  const data = Object.values(monthlyMap)
    .map((r) => ({
      ...r,
      sales_taxable: Math.round(r.sales_taxable),
      sales_cgst: Math.round(r.sales_cgst),
      sales_sgst: Math.round(r.sales_sgst),
      sales_igst: Math.round(r.sales_igst),
      sales_total_gst: Math.round(r.sales_total_gst),
      pur_taxable: Math.round(r.pur_taxable),
      pur_cgst: Math.round(r.pur_cgst),
      pur_sgst: Math.round(r.pur_sgst),
      pur_igst: Math.round(r.pur_igst),
      pur_total_gst: Math.round(r.pur_total_gst),
    }))
    .sort((a, b) => (a.year - b.year) || (MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)));

  res.status(200).json({ success: true, data });
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
const PERFORMANCE_PALETTE = ['#B11E6A', '#1890ff', '#52c41a', '#fa8c16', '#7c3aed', '#eb2f96', '#13c2c2', '#faad14'];

exports.getPerformance = asyncHandler(async (req, res) => {
  const salesUsers = await User.find({ role: { $in: ['Sales Manager', 'Sales Executive'] }, deletedAt: null });

  const complaints = await Complaint.find().populate('orderId', 'createdBy');
  const complaintCountByUser = {};
  complaints.forEach((c) => {
    const uid = c.orderId?.createdBy ? String(c.orderId.createdBy) : null;
    if (uid) complaintCountByUser[uid] = (complaintCountByUser[uid] || 0) + 1;
  });

  const monthlyByUser = {};

  const leaderboard = await Promise.all(salesUsers.map(async (u, idx) => {
    const invoices = await Invoice.find({ createdBy: u._id });
    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const orders = await Order.countDocuments({ createdBy: u._id });

    invoices.forEach((inv) => {
      const month = inv.invoiceDate?.toLocaleString('default', { month: 'short' });
      if (!month) return;
      if (!monthlyByUser[month]) monthlyByUser[month] = { month };
      monthlyByUser[month][u.fullName] = (monthlyByUser[month][u.fullName] || 0) + (inv.total || 0);
    });

    return {
      key: String(u._id),
      id: u._id,
      name: u.fullName,
      role: u.role,
      orders,
      revenue,
      target: u.targetNewHotel + u.targetOldHotel,
      conversion: orders > 0 ? Math.round((invoices.length / orders) * 100) : 0,
      complaints: complaintCountByUser[String(u._id)] || 0,
      color: PERFORMANCE_PALETTE[idx % PERFORMANCE_PALETTE.length],
    };
  }));
  leaderboard.sort((a, b) => b.revenue - a.revenue);

  const monthlyData = Object.values(monthlyByUser)
    .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

  res.status(200).json({ success: true, data: { leaderboard, monthlyData } });
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
