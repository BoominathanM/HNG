const Invoice = require('../../models/Invoice');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const Expense = require('../../models/Expense');
const Order = require('../../models/Order');
const InventoryItem = require('../../models/InventoryItem');
const User = require('../../models/User');
const Complaint = require('../../models/Complaint');
const asyncHandler = require('../../utils/asyncHandler');

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Invoice.subtotal/gstAmount can go stale relative to Invoice.total for kit-priced orders
// (the quotation the invoice was created from stores a non-kit-aware subtotal/gstAmount —
// see billing.controller convertQuotationToInvoice) or when an invoice amount was edited
// during conversion. `total` is always the real billed value, so when the stored split
// doesn't add up to it, gstAmount (computed from real per-item GST rates) is trusted and
// taxable is derived as total - gstAmount — guaranteeing every report row satisfies
// taxable + CGST + SGST === invoice value exactly instead of silently under-reporting both.
const reconcileTaxable = (subtotal, gstAmount, total) => {
  const sub = Number(subtotal) || 0;
  const gst = Number(gstAmount) || 0;
  const tot = Number(total) || (sub + gst);
  if (Math.abs((sub + gst) - tot) < 1) return { taxable: r2(sub), gstAmt: r2(gst) };
  return { taxable: r2(Math.max(tot - gst, 0)), gstAmt: r2(Math.min(gst, tot)) };
};

// A kit's product rows (Order/Quotation/Invoice `items[]` with isKit:true) store `qty` as the
// component quantity PER KIT (see Kit.products), not the order's total — the real quantity
// consumed/sold is item.qty × (number of kits ordered), which lives separately on
// order.kitOrders[].overallQty (per kitId) or the legacy order.kitOverallQty (mirrors the same
// multiplier used by sales.controller's deductInventoryForOrder). Sample orders force every
// row's qty to 1 real unit regardless of the source order's kit count, so no multiplier applies.
const kitMultiplier = (item, kitOrders = [], legacyOverallQty, orderCategory) => {
  if (!item?.isKit) return 1;
  if (orderCategory === 'SAMPLE') return 1;
  const match = (kitOrders || []).find((o) => o && o.kitId && o.kitId === item.kitId);
  return Number(match?.overallQty) || Number(legacyOverallQty) || 1;
};

// Expand a doc's items[] to their real (kit-aware) qty/lineTotal, so per-product revenue/COGS
// aggregation isn't silently under-counted for kit orders (see kitMultiplier above).
const applyKitMultiplier = (items = [], kitOrders = [], legacyOverallQty, orderCategory) =>
  items.map((i) => {
    const it = i.toObject ? i.toObject() : { ...i };
    const mult = kitMultiplier(it, kitOrders, legacyOverallQty, orderCategory);
    const qty = (Number(it.qty) || 0) * mult;
    const price = Number(it.price) || 0;
    return { ...it, qty, lineTotal: r2(price * qty) };
  });

// Date filter on an arbitrary field (defaults to createdAt) — each model's report-relevant
// date field differs (Invoice → invoiceDate, Expense → expenseDate, PO/LocalPurchase → createdAt).
const buildDateFilterOn = (req, field = 'createdAt') => {
  const filter = {};
  if (req.query.startDate || req.query.endDate) {
    filter[field] = {};
    if (req.query.startDate) filter[field].$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter[field].$lte = new Date(req.query.endDate);
  }
  return filter;
};

// Break a (possibly consolidated/batch) PurchaseOrder into one row per line item.
// Older single-item POs have no items[] and fall back to their own top-level itemId/qty.
// Batched POs record qty per item but only one combined `amount` for the whole batch (no
// per-item price is stored), so each item's share of that amount is allocated proportionally
// by quantity — the best approximation the schema supports.
const explodePurchaseOrderItems = (po) => {
  const amount = Number(po.amount) || 0;
  if (po.items?.length) {
    const totalQty = po.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    return po.items.map((it) => {
      const share = totalQty > 0 ? (Number(it.qty) || 0) / totalQty : 1 / po.items.length;
      return {
        itemName: it.itemId?.itemName || it.itemName || '',
        hsnCode: it.itemId?.hsnCode || '',
        gstPercent: it.itemId?.gstPercent ?? 18,
        qty: Number(it.qty) || 0,
        amount: r2(amount * share),
      };
    });
  }
  return [{
    itemName: po.itemId?.itemName || po.itemName || '',
    hsnCode: po.itemId?.hsnCode || '',
    gstPercent: po.itemId?.gstPercent ?? 18,
    qty: Number(po.qty) || 0,
    amount,
  }];
};

// LocalPurchase invoices carry no HSN/GST breakdown at all (informal vendor bill) — every
// row is reported taxable-only, with 0% GST rather than fabricating a rate.
const explodeLocalPurchaseItems = (lp) => {
  const rows = lp.items?.length ? lp.items : [{ itemName: 'Local Purchase', qty: 0, amount: lp.totalAmount }];
  return rows.map((it) => ({
    itemName: it.itemName || 'Local Purchase',
    hsnCode: '',
    gstPercent: 0,
    qty: Number(it.qty) || 0,
    amount: Number(it.amount) || 0,
  }));
};

// Shared purchase-side rows for Purchase Report / Auditor Tax / CSV export — merges
// PurchaseOrder (vendor POs) and LocalPurchase (informal/local vendor bills), which used to
// be reported separately (LocalPurchase wasn't reported at all).
const buildPurchaseRows = async (dateFilter) => {
  const [orders, localPurchases] = await Promise.all([
    PurchaseOrder.find(dateFilter)
      .populate('vendorId', 'name taxId')
      .populate('itemId', 'itemName hsnCode gstPercent')
      .populate('items.itemId', 'itemName hsnCode gstPercent')
      .sort('-createdAt'),
    LocalPurchase.find(dateFilter).populate('vendorId', 'name taxId').sort('-createdAt'),
  ]);

  const rows = [];
  orders.forEach((o) => {
    explodePurchaseOrderItems(o).forEach((it, idx) => {
      const gstRate = it.gstPercent ?? 18;
      const taxable = gstRate > 0 ? it.amount / (1 + gstRate / 100) : it.amount;
      const totalTax = it.amount - taxable;
      rows.push({
        key: `po-${o._id}-${idx}`,
        vendor_gst: o.vendorId?.taxId || '',
        supplier: o.vendorId?.name || '',
        product: it.itemName,
        hsn: it.hsnCode,
        gst_rate: gstRate,
        qty: it.qty,
        unit_price: it.qty ? r2(taxable / it.qty) : 0,
        state_code: '',
        state_name: '',
        inv_no: o.invNo || o.billNo || o.poCode || '',
        orig_inv_no: '',
        inv_date: o.createdAt?.toISOString().slice(0, 10) || '',
        taxable: r2(taxable),
        cgst: r2(totalTax / 2),
        sgst: r2(totalTax / 2),
        igst: 0,
        total_tax: r2(totalTax),
        inv_value: r2(it.amount),
      });
    });
  });
  localPurchases.forEach((l) => {
    explodeLocalPurchaseItems(l).forEach((it, idx) => {
      rows.push({
        key: `lp-${l._id}-${idx}`,
        vendor_gst: l.vendorId?.taxId || '',
        supplier: l.vendorId?.name || l.vendorName || '',
        product: it.itemName,
        hsn: '',
        gst_rate: 0,
        qty: it.qty,
        unit_price: it.qty ? r2(it.amount / it.qty) : it.amount,
        state_code: '',
        state_name: '',
        inv_no: l.invoiceNo || l.lpCode || '',
        orig_inv_no: '',
        inv_date: l.createdAt?.toISOString().slice(0, 10) || '',
        taxable: r2(it.amount),
        cgst: 0,
        sgst: 0,
        igst: 0,
        total_tax: 0,
        inv_value: r2(it.amount),
      });
    });
  });

  return { rows, orderCount: orders.length, localPurchaseCount: localPurchases.length, orders, localPurchases };
};

// Real average unit purchase cost per item name, from actual PurchaseOrder + LocalPurchase
// records — replaces the flat 62%/65%-of-revenue COGS guesswork in Bill-wise/Product P&L
// with real cost where purchase history exists for that item.
const buildItemCostIndex = async (dateFilter = {}) => {
  const { rows } = await buildPurchaseRows(dateFilter);
  const acc = {};
  rows.forEach((r) => {
    if (!r.product || !r.qty) return;
    const key = r.product.trim().toLowerCase();
    if (!acc[key]) acc[key] = { amount: 0, qty: 0 };
    acc[key].amount += r.inv_value;
    acc[key].qty += r.qty;
  });
  const index = {};
  Object.entries(acc).forEach(([k, v]) => { index[k] = v.qty > 0 ? v.amount / v.qty : 0; });
  return index;
};

// Current on-hand stock per item name, from InventoryItem.currentStock — the same running
// total the Inventory page displays. Keyed by trimmed-lowercased item name, matching the
// itemCostIndex convention above.
const buildStockIndex = async () => {
  const items = await InventoryItem.find({ deletedAt: null }, 'itemName currentStock');
  const index = {};
  items.forEach((it) => { index[(it.itemName || '').trim().toLowerCase()] = Number(it.currentStock) || 0; });
  return index;
};

// ─── SALES REPORT ─────────────────────────────────────────────────────────────
// Sourced from Invoice (the actual billed document), not Order — an order isn't
// a sale for GST/reporting purposes until it has been converted to an invoice in
// Billing, and only the invoice carries the real invoice number/date/value.
exports.getSalesReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.startDate || req.query.endDate) {
    filter.invoiceDate = {};
    if (req.query.startDate) filter.invoiceDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.invoiceDate.$lte = new Date(req.query.endDate);
  }
  if (req.query.product) filter['items.itemName'] = new RegExp(req.query.product, 'i');
  if (req.query.customer) {
    const Party = require('../../models/Party');
    const partyIds = await Party.find({ name: new RegExp(req.query.customer, 'i') }).distinct('_id');
    filter.partyId = { $in: partyIds };
  }

  const invoices = await Invoice.find(filter)
    .populate('partyId', 'name gstNumber state')
    .populate('orderId', 'orderCode state')
    .sort('-invoiceDate');

  const monthlyMap = {};
  invoices.forEach((inv) => {
    const key = inv.invoiceDate?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += Number(inv.total) || 0;
  });

  const data = invoices.map((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const invValue = Number(inv.total) || ((Number(inv.subtotal) || 0) + (Number(inv.gstAmount) || 0));
    const { taxable, gstAmt } = reconcileTaxable(inv.subtotal, inv.gstAmount, invValue);
    const allProducts = (inv.items || []).map((it) => it.itemName).filter(Boolean).join(', ');

    return {
      key: String(inv._id),
      gst_no: inv.partyId?.gstNumber || '',
      customer: inv.partyId?.name || '',
      product: allProducts,
      state_code: '',
      state_name: order?.state || inv.partyId?.state || '',
      inv_no: inv.invoiceNumber || '',
      orig_inv_no: '',
      inv_date: inv.invoiceDate?.toISOString().slice(0, 10) || '',
      inv_value: invValue,
      total_tax: gstAmt,
      taxable,
      cgst: r2(gstAmt / 2),
      sgst: r2(gstAmt / 2),
      igst: 0,
    };
  });

  const totalGst = data.reduce((s, r) => s + r.total_tax, 0);
  const totalTaxable = data.reduce((s, r) => s + r.taxable, 0);
  const totalValue = data.reduce((s, r) => s + r.inv_value, 0);

  res.status(200).json({
    success: true,
    data,
    summary: { totalValue, totalTaxable, totalGst, count: invoices.length },
    chartData: Object.values(monthlyMap),
  });
});

// ─── PURCHASE REPORT ──────────────────────────────────────────────────────────
// Merges vendor PurchaseOrders and informal LocalPurchase bills (previously excluded
// entirely) into one report, exploding consolidated/batched POs into one row per item.
exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilterOn(req, 'createdAt');
  const { rows: data, orders, localPurchases } = await buildPurchaseRows(dateFilter);

  const monthlyMap = {};
  const bump = (date, amt) => {
    const key = date?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += amt;
  };
  orders.forEach((o) => bump(o.createdAt, Number(o.amount) || 0));
  localPurchases.forEach((l) => bump(l.createdAt, Number(l.totalAmount) || 0));

  const totalValue = data.reduce((s, r) => s + r.inv_value, 0);

  res.status(200).json({
    success: true,
    data,
    withGst: data.filter((r) => r.total_tax > 0),
    withoutGst: data.filter((r) => r.total_tax === 0),
    summary: { totalValue, count: orders.length + localPurchases.length },
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
  const poDateFilter = buildDateFilterOn(req, 'createdAt');
  const [orders, purchaseOrders, localPurchases, expenses, itemCostIndex, stockIndex] = await Promise.all([
    Order.find({ deletedAt: null, status: { $ne: 'Cancelled' }, ...poDateFilter }),
    PurchaseOrder.find(poDateFilter),
    LocalPurchase.find(poDateFilter),
    // Expenses are dated by expenseDate, not createdAt — filtering by createdAt would
    // exclude/include the wrong entries whenever an expense is backdated.
    Expense.find(buildDateFilterOn(req, 'expenseDate')),
    buildItemCostIndex(poDateFilter),
    buildStockIndex(),
  ]);

  const totalSales = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const totalSalesGst = orders.reduce((s, o) => s + (Number(o.gstAmount) || 0), 0);
  const totalCogs = purchaseOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0)
    + localPurchases.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);
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
    monthlyMap[key].cogsGst += r2(amt - amt / 1.18);
  });
  localPurchases.forEach((lp) => {
    const key = lp.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, expenses: emptyExpenses() };
    // No GST captured on local purchases — counts toward COGS but not input-GST credit.
    monthlyMap[key].cogs += Number(lp.totalAmount) || 0;
  });
  Object.values(monthlyMap).forEach((m) => { m.grossProfit = m.sales - m.cogs; });
  expenses.forEach((e) => {
    const key = e.expenseDate?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, expenses: emptyExpenses() };
    const cat = EXPENSE_CAT_MAP[e.category] || 'other';
    monthlyMap[key].expenses[cat] = (monthlyMap[key].expenses[cat] || 0) + e.amount;
  });

  // Product-wise P&L (from order items) — COGS uses the real average purchase cost for that
  // item when we have purchase history for it, falling back to a flat 65%-of-sales estimate
  // only for items with no PurchaseOrder/LocalPurchase record at all.
  const productMap = {};
  orders.forEach((o) => {
    const rawItems = o.items?.length
      ? o.items
      : [{ itemName: o.product || 'Unknown', lineTotal: Number(o.amount) || 0, qty: Number(o.qty) || 0 }];
    const items = applyKitMultiplier(rawItems, o.kitOrders, o.kitOverallQty, o.orderCategory);
    items.forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMap[name]) productMap[name] = { product: name, sales: 0, cogs: 0, grossProfit: 0, soldQty: 0, stockQty: 0 };
      const itemSales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMap[name].sales += itemSales;
      productMap[name].soldQty += Number(item.qty) || 0;
    });
  });
  Object.values(productMap).forEach((p) => {
    const key = p.product.trim().toLowerCase();
    const rate = itemCostIndex[key];
    p.cogs = rate != null && rate > 0 ? r2(rate * p.soldQty) : r2(p.sales * 0.65);
    p.grossProfit = p.sales - p.cogs;
    p.stockQty = stockIndex[key] ?? 0;
  });

  // Per-product monthly breakdown
  const productMonthlyData = {};
  orders.forEach((o) => {
    const month = o.createdAt?.toLocaleString('default', { month: 'short' }) || '';
    const rawItems = o.items?.length
      ? o.items
      : [{ itemName: o.product || 'Unknown', lineTotal: Number(o.amount) || 0, qty: Number(o.qty) || 0 }];
    const items = applyKitMultiplier(rawItems, o.kitOrders, o.kitOverallQty, o.orderCategory);
    items.forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMonthlyData[name]) productMonthlyData[name] = {};
      if (!productMonthlyData[name][month]) productMonthlyData[name][month] = { month, sales: 0, cogs: 0, grossProfit: 0, qty: 0 };
      const sales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMonthlyData[name][month].sales += sales;
      productMonthlyData[name][month].qty += Number(item.qty) || 0;
    });
  });
  Object.keys(productMonthlyData).forEach((prod) => {
    const rate = itemCostIndex[prod.trim().toLowerCase()];
    const byMonth = Object.values(productMonthlyData[prod]);
    byMonth.forEach((m) => {
      m.cogs = rate != null && rate > 0 ? r2(rate * m.qty) : r2(m.sales * 0.65);
      m.grossProfit = m.sales - m.cogs;
    });
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
  const invoices = await Invoice.find(buildDateFilterOn(req, 'invoiceDate'))
    .populate('partyId', 'name')
    .populate('orderId', 'kitOrders kitOverallQty orderCategory')
    .populate('quotationId', 'kitOrders kitOverallQty')
    .sort('-invoiceDate');
  const itemCostIndex = await buildItemCostIndex();

  const billPL = invoices.map((inv) => {
    // Kit rows on the invoice store qty PER KIT — the linked order (or quotation, when the
    // order was deleted/unlinked) carries the real kit count needed to multiply it up to the
    // true quantity billed (see kitMultiplier above).
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const quotation = inv.quotationId && typeof inv.quotationId === 'object' ? inv.quotationId : null;
    const kitOrders = order?.kitOrders?.length ? order.kitOrders : (quotation?.kitOrders || []);
    const legacyOverallQty = order?.kitOverallQty ?? quotation?.kitOverallQty;
    const items = applyKitMultiplier(inv.items || [], kitOrders, legacyOverallQty, order?.orderCategory);

    // Real cost per line item where we have purchase history for it; only items with no
    // matching PurchaseOrder/LocalPurchase record fall back to the 62%-of-line estimate.
    // `breakdown` exposes each product's own sale price/qty and purchase cost — a kit's Brush
    // and Paste are reported as separate rows (their real per-kit qty × kit count), not folded
    // into one opaque "kit" line — so the report shows exactly what was billed vs. what it cost.
    let cogs = 0;
    const breakdown = [];
    if (items.length) {
      items.forEach((it) => {
        const rate = itemCostIndex[(it.itemName || '').trim().toLowerCase()];
        const qty = Number(it.qty) || 0;
        const price = Number(it.price) || 0;
        const lineTotal = Number(it.lineTotal) || price * qty;
        const costRate = rate != null && rate > 0 ? rate : price * 0.62;
        const costAmount = r2(costRate * qty);
        cogs += costAmount;
        breakdown.push({
          name: it.itemName || 'Unknown',
          qty,
          price: r2(price),
          lineTotal: r2(lineTotal),
          costRate: r2(costRate),
          costAmount,
        });
      });
    } else {
      cogs = (inv.subtotal || 0) * 0.62;
    }
    const { taxable, gstAmt } = reconcileTaxable(inv.subtotal, inv.gstAmount, inv.total);
    const grossProfit = taxable - cogs;
    const inputGst = cogs - cogs / 1.18;
    return {
      key: String(inv._id),
      inv_no: inv.invoiceNumber,
      date: inv.invoiceDate?.toISOString().slice(0, 10) || '',
      client: inv.partyId?.name || 'Unknown',
      product: items.map((it) => it.itemName).filter(Boolean).join(', ') || 'General',
      breakdown,
      sell_taxable: taxable,
      gst_collected: gstAmt,
      cgst: r2(gstAmt / 2),
      sgst: r2(gstAmt / 2),
      sell_total: inv.total,
      cogs: r2(cogs),
      input_gst: r2(inputGst),
      gross_profit: r2(grossProfit),
      status: inv.status,
    };
  });

  res.status(200).json({ success: true, data: billPL });
});

// ─── MONTHLY GST REPORT ────────────────────────────────────────────────────────
const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getMonthlyGst = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST', ...buildDateFilterOn(req, 'invoiceDate') });
  const poDateFilter = buildDateFilterOn(req, 'createdAt');
  const purchaseOrders = await PurchaseOrder.find(poDateFilter)
    .populate('itemId', 'gstPercent')
    .populate('items.itemId', 'gstPercent');
  const localPurchases = await LocalPurchase.find(poDateFilter);

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
    const { taxable, gstAmt } = reconcileTaxable(inv.subtotal, inv.gstAmount, inv.total);
    row.sales_taxable += taxable;
    row.sales_cgst += gstAmt / 2;
    row.sales_sgst += gstAmt / 2;
    row.sales_total_gst += gstAmt;
  });

  purchaseOrders.forEach((po) => {
    const row = ensureRow(po.createdAt);
    explodePurchaseOrderItems(po).forEach((it) => {
      const gstRate = it.gstPercent ?? 18;
      const taxable = gstRate > 0 ? it.amount / (1 + gstRate / 100) : it.amount;
      const gstAmt = it.amount - taxable;
      row.pur_taxable += taxable;
      row.pur_cgst += gstAmt / 2;
      row.pur_sgst += gstAmt / 2;
      row.pur_total_gst += gstAmt;
    });
  });
  localPurchases.forEach((lp) => {
    const row = ensureRow(lp.createdAt);
    // No GST captured on local/informal purchases — taxable spend only, no input credit.
    row.pur_taxable += Number(lp.totalAmount) || 0;
  });

  const data = Object.values(monthlyMap)
    .map((r) => ({
      ...r,
      sales_taxable: r2(r.sales_taxable),
      sales_cgst: r2(r.sales_cgst),
      sales_sgst: r2(r.sales_sgst),
      sales_igst: r2(r.sales_igst),
      sales_total_gst: r2(r.sales_total_gst),
      pur_taxable: r2(r.pur_taxable),
      pur_cgst: r2(r.pur_cgst),
      pur_sgst: r2(r.pur_sgst),
      pur_igst: r2(r.pur_igst),
      pur_total_gst: r2(r.pur_total_gst),
    }))
    .sort((a, b) => (a.year - b.year) || (MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)));

  res.status(200).json({ success: true, data });
});

// ─── AUDITOR TAX REPORT ────────────────────────────────────────────────────────
exports.getAuditorTax = asyncHandler(async (req, res) => {
  const type = req.query.type || 'sales';
  if (type === 'sales') {
    const invoices = await Invoice.find({ invoiceType: 'GST', ...buildDateFilterOn(req, 'invoiceDate') })
      .populate('partyId', 'name gstNumber state')
      .sort('-invoiceDate');
    const rows = invoices.map((inv) => {
      const { taxable, gstAmt } = reconcileTaxable(inv.subtotal, inv.gstAmount, inv.total);
      return {
        gstNo: inv.partyId?.gstNumber || '',
        customerName: inv.partyId?.name || '',
        invoiceNo: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate?.toISOString().slice(0, 10),
        invoiceValue: inv.total,
        taxableValue: taxable,
        totalTax: gstAmt,
        cgst: r2(gstAmt / 2),
        sgst: r2(gstAmt / 2),
        igst: 0,
      };
    });
    return res.status(200).json({ success: true, data: rows });
  }
  // Purchase side — same PurchaseOrder + LocalPurchase merge, batched-item explosion, and
  // date filter as the Purchase Report (this used to be PurchaseOrder-only, HSN-populated
  // from the legacy single itemId, and ignored req.query.startDate/endDate entirely).
  const { rows: purchaseRows } = await buildPurchaseRows(buildDateFilterOn(req, 'createdAt'));
  const rows = purchaseRows.map((r) => ({
    vendorGst: r.vendor_gst,
    supplierName: r.supplier,
    product: r.product,
    hsn: r.hsn,
    invoiceNo: r.inv_no,
    invoiceDate: r.inv_date,
    invoiceValue: r.inv_value,
    taxableValue: r.taxable,
    totalTax: r.total_tax,
    cgst: r.cgst,
    sgst: r.sgst,
    igst: r.igst,
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

  const oldAchieved = tSales > 0 ? r2(totalInvoiced * (tOld / tSales)) : 0;
  const newAchieved = tSales > 0 ? r2(totalInvoiced * (tNew / tSales)) : 0;

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

// Shares buildPurchaseRows with getPurchaseReport so the CSV export always matches what the
// Purchase Report tab shows — previously this dumped PurchaseOrder only (no LocalPurchase,
// no batched-item breakdown), diverging from the on-screen report.
exports.exportPurchaseReport = asyncHandler(async (req, res) => {
  const { rows } = await buildPurchaseRows({});
  const csv = ['Invoice No,Date,Vendor,Item,HSN,GST %,Qty,Taxable,Total Tax,Amount']
    .concat(rows.map((r) =>
      `${r.inv_no},${r.inv_date},${r.supplier},${r.product},${r.hsn},${r.gst_rate},${r.qty},${r.taxable},${r.total_tax},${r.inv_value}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=purchase-report.csv');
  res.send(csv);
});

exports.exportGstReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST' }).populate('partyId', 'name gstNumber state').sort('-invoiceDate');
  const csv = ['GST No,Customer,State,Invoice No,Invoice Date,Invoice Value,Taxable Value,CGST,SGST,IGST,Total Tax']
    .concat(invoices.map((i) => {
      const { taxable, gstAmt } = reconcileTaxable(i.subtotal, i.gstAmount, i.total);
      return `${i.partyId?.gstNumber || ''},${i.partyId?.name || ''},${i.partyId?.state || ''},${i.invoiceNumber},${i.invoiceDate?.toISOString().slice(0,10)},${i.total},${taxable},${r2(gstAmt/2)},${r2(gstAmt/2)},0,${gstAmt}`;
    }))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=gst-report.csv');
  res.send(csv);
});
