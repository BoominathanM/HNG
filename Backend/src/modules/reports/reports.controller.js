const Invoice = require('../../models/Invoice');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const Expense = require('../../models/Expense');
const Order = require('../../models/Order');
const Task = require('../../models/Task');
const StickerRequest = require('../../models/StickerRequest');
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

// Invoice.total itself can go stale relative to the linked Order's real billed total —
// Order.paymentCollection entries carrying a courierCharge/roundOff (pushed by Sales' own
// payment-entry flow via syncOrderPaymentCollection, e.g. from a Quotation-stage payment)
// only raise the ORDER's total; only a payment recorded through Billing's own recordPayment
// bumps Invoice.total (`invoice.total += courierCharge/roundOff`, billing.controller.js).
// So an invoice paid partly via Billing and partly via Sales/Negotiation ends up with
// Invoice.total under-reporting real Order.total by whatever courier/round-off went through
// the non-Billing path — same reconciliation gap already fixed for pending-due in
// parties.controller's getHotelPendingDue (paid = max(Invoice, Order), total = max(Invoice,
// Order)), applied here to "Invoice Value" too.
//
// Forwarding charge + courier charge + round-off are real money billed on the invoice but
// are NOT part of the taxable supply (DocumentTemplate.jsx's computeModel keeps them as
// separate rows outside taxable/tax, and toWords/GST filing shouldn't count them as taxable
// turnover) — so they're subtracted back out before handing the "core" total to
// reconcileTaxable, otherwise a courier charge added after the sale would silently inflate
// the reported Taxable Value for GST purposes.
const resolveInvoiceMoney = (inv, order) => {
  const invValue = Math.max(Number(inv.total) || 0, Number(order?.total) || Number(order?.amount) || 0);
  let extras = 0;
  if (order) {
    const fwd = order.forwardingCharge ? (Number(order.forwardingChargeAmount) || 0) : 0;
    const courierRoundOff = (order.paymentCollection || []).reduce(
      (s, e) => s + (Number(e?.courierCharge) || 0) + (Number(e?.roundOff) || 0), 0
    );
    extras = r2(fwd + courierRoundOff);
  }
  const coreTotal = Math.max(0, invValue - extras);
  const { taxable, gstAmt } = reconcileTaxable(inv.subtotal, inv.gstAmount, coreTotal);
  return { invValue: r2(invValue), taxable, gstAmt, extras };
};
const ORDER_MONEY_FIELDS = 'total amount gstAmount forwardingCharge forwardingChargeAmount paymentCollection paidAmount';

// Real paid amount for an invoice: the larger of Invoice.advanceAmount vs the linked Order's
// own paymentCollection/paidAmount total. A payment recorded straight onto the Order (e.g.
// Sales/Negotiation's own payment-entry flow, syncOrderPaymentCollection) does not always sync
// back onto Invoice.advanceAmount, so trusting inv.advanceAmount alone understates what was
// really paid — the exact reconciliation resolveOrderPaymentStatus (utils/syncOrderPayment.js)
// and getHotelPendingDue (parties.controller) already do for Billing/Parties' own Paid/Pending
// display; shared here so every consumer of "how much of this invoice is paid" agrees.
const resolveInvoicePaid = (inv, order) => {
  if (inv.isComplementary) return Number(inv.total) || 0;
  const orderPaid = order
    ? ((order.paymentCollection || []).reduce((s, e) => s + (Number(e?.paidAmount) || 0), 0) || Number(order.paidAmount) || 0)
    : 0;
  return Math.max(Number(inv.advanceAmount) || 0, orderPaid);
};

// Live Paid/Partially Paid/Pending status for an invoice, reconciled against its linked
// order (see resolveInvoicePaid above). `invValue` is already the larger of Invoice vs Order
// total, from resolveInvoiceMoney.
const resolveInvoiceStatus = (inv, order, invValue) => {
  if (inv.isComplementary) return 'Paid';
  const paid = resolveInvoicePaid(inv, order);
  if (invValue <= 0) return inv.status || 'Pending';
  if (paid >= invValue) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  return 'Pending';
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

// Break a (possibly consolidated/batch) PurchaseOrder into one row per line item, with each
// row's real GST rate + CGST/SGST/IGST split sourced from the ACTUAL purchase invoice wherever
// that's known, instead of guessing:
//   1. order.receivedInvoice{Cgst,Sgst,Igst,Gst}Amount — the invoice's own printed CGST/SGST/
//      IGST breakdown (captured at receiving, see purchase.controller.receiveOrder), allocated
//      across items by each item's share of the order amount. This is why an inter-state,
//      IGST-only bill reports as IGST here instead of being force-split 50/50 into CGST/SGST.
//   2. order.receivedItems[].gstPercent — the per-line GST rate read off that same invoice
//      (AI-scanned or manually entered at receiving), matched by itemId/name, used when no
//      order-level breakdown was captured.
//   3. InventoryItem.gstPercent (master default) — InventoryItem.gstPercent defaults to 0 and
//      is frequently never set on Add Item, so a literal 0 here is treated as "unset" (not a
//      real zero-rated item) and falls through to the flat 18% assumption every other GST
//      estimate in this file already uses (see buildItemCostIndex's gstIndex).
// Older single-item POs have no items[] and fall back to their own top-level itemId/qty.
// Batched POs record qty per item but only one combined `amount` for the whole batch (no
// per-item price is stored), so each item's share of that amount is allocated proportionally
// by quantity — the best approximation the schema supports.
const explodePurchaseOrderItems = (po) => {
  const amount = Number(po.amount) || 0;

  const receivedGstByKey = {};
  (po.receivedItems || []).forEach((ri) => {
    if (ri.gstPercent == null || ri.gstPercent <= 0) return;
    if (ri.itemId) receivedGstByKey[String(ri.itemId)] = Number(ri.gstPercent);
    const nameKey = (ri.itemName || '').trim().toLowerCase();
    if (nameKey) receivedGstByKey[nameKey] = Number(ri.gstPercent);
  });
  const resolveGstPercent = (idKey, nameKey, masterGst) => {
    if (idKey && receivedGstByKey[idKey] != null) return receivedGstByKey[idKey];
    if (nameKey && receivedGstByKey[nameKey] != null) return receivedGstByKey[nameKey];
    return masterGst > 0 ? masterGst : 18;
  };

  const invCgst = Number(po.receivedInvoiceCgstAmount) || 0;
  const invSgst = Number(po.receivedInvoiceSgstAmount) || 0;
  const invIgst = Number(po.receivedInvoiceIgstAmount) || 0;
  const invGstTotal = Number(po.receivedInvoiceGstAmount) || (invCgst + invSgst + invIgst);
  const hasInvoiceBreakdown = invGstTotal > 0 && amount > 0;

  const splitTax = (itemAmount, gstRate) => {
    if (hasInvoiceBreakdown) {
      const share = itemAmount / amount;
      return {
        taxable: r2(itemAmount - invGstTotal * share),
        cgst: r2(invCgst * share),
        sgst: r2(invSgst * share),
        igst: r2(invIgst * share),
      };
    }
    const taxable = gstRate > 0 ? itemAmount / (1 + gstRate / 100) : itemAmount;
    const totalTax = itemAmount - taxable;
    return { taxable: r2(taxable), cgst: r2(totalTax / 2), sgst: r2(totalTax / 2), igst: 0 };
  };

  // Extra lines (goods the vendor's invoice included that weren't part of this PO at all —
  // see purchase.controller.receiveOrder) are never in `po.items` and carry no share of
  // `po.amount`, so they'd otherwise vanish from every report that reads this function. They
  // DO carry their own per-line purchasePrice (already GST-exclusive/taxable, same convention
  // as every other purchaseBatches.purchasePrice in this codebase) and gstPercent captured at
  // receiving, so they're priced off THAT instead of being allocated a share of `amount` —
  // deliberately not folded into the invoice-level CGST/SGST/IGST proportional split above
  // (that split's denominator is `amount`, which never included these lines' value, so
  // reusing it here would misallocate tax); a flat 50/50 CGST/SGST off their own gstPercent
  // is used instead, same fallback convention explodeLocalPurchaseItems uses below for bills
  // with no separate CGST/SGST/IGST breakdown.
  const extraRows = (po.receivedItems || [])
    .filter((ri) => ri.extra && (Number(ri.receivedQty) || 0) > 0)
    .map((ri) => {
      const qty = Number(ri.receivedQty) || 0;
      const taxable = r2((Number(ri.purchasePrice) || 0) * qty);
      const gstRate = Number(ri.gstPercent) || 0;
      const gstAmt = r2(taxable * gstRate / 100);
      return {
        itemName: ri.itemName || '',
        hsnCode: ri.hsn || '',
        gstPercent: gstRate,
        qty,
        amount: r2(taxable + gstAmt),
        taxable,
        cgst: r2(gstAmt / 2),
        sgst: r2(gstAmt / 2),
        igst: 0,
      };
    });

  if (po.items?.length) {
    const totalQty = po.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    return po.items.map((it) => {
      const share = totalQty > 0 ? (Number(it.qty) || 0) / totalQty : 1 / po.items.length;
      const itemAmount = r2(amount * share);
      const idKey = it.itemId?._id ? String(it.itemId._id) : (it.itemId ? String(it.itemId) : '');
      const nameKey = (it.itemName || it.itemId?.itemName || '').trim().toLowerCase();
      const gstRate = resolveGstPercent(idKey, nameKey, Number(it.itemId?.gstPercent) || 0);
      return {
        itemName: it.itemId?.itemName || it.itemName || '',
        hsnCode: it.itemId?.hsnCode || '',
        gstPercent: gstRate,
        qty: Number(it.qty) || 0,
        amount: itemAmount,
        ...splitTax(itemAmount, gstRate),
      };
    }).concat(extraRows);
  }
  const idKey = po.itemId?._id ? String(po.itemId._id) : (po.itemId ? String(po.itemId) : '');
  const nameKey = (po.itemName || po.itemId?.itemName || '').trim().toLowerCase();
  const gstRate = resolveGstPercent(idKey, nameKey, Number(po.itemId?.gstPercent) || 0);
  return [{
    itemName: po.itemId?.itemName || po.itemName || '',
    hsnCode: po.itemId?.hsnCode || '',
    gstPercent: gstRate,
    qty: Number(po.qty) || 0,
    amount: r2(amount),
    ...splitTax(amount, gstRate),
  }].concat(extraRows);
};

// LocalPurchase entries DO carry their own GST data (lp.gstAmount total + per-line
// items[].gstPercent, set on the Add Local Purchase form) — each line's own gstPercent is
// preferred when set; otherwise the invoice's single combined gstAmount is allocated across
// lines by their share of the line total (same convention explodePurchaseOrderItems uses for
// a PurchaseOrder's own header-level breakdown). No CGST/SGST/IGST split is captured
// separately on these informal bills, so the resulting GST is divided evenly CGST/SGST.
const explodeLocalPurchaseItems = (lp) => {
  const totalAmount = Number(lp.totalAmount) || 0;
  const totalGst = Number(lp.gstAmount) || 0;
  const rows = lp.items?.length ? lp.items : [{ itemName: 'Local Purchase', qty: 0, amount: totalAmount, gstPercent: 0 }];
  const itemsTotal = rows.reduce((s, it) => s + (Number(it.amount) || 0), 0) || totalAmount;
  return rows.map((it) => {
    const amount = Number(it.amount) || 0;
    const linePercent = Number(it.gstPercent) || 0;
    let taxable;
    let gstAmt;
    if (linePercent > 0) {
      taxable = amount / (1 + linePercent / 100);
      gstAmt = amount - taxable;
    } else if (totalGst > 0 && itemsTotal > 0) {
      const share = amount / itemsTotal;
      gstAmt = totalGst * share;
      taxable = amount - gstAmt;
    } else {
      taxable = amount;
      gstAmt = 0;
    }
    return {
      itemName: it.itemName || 'Local Purchase',
      hsnCode: '',
      gstPercent: linePercent,
      qty: Number(it.qty) || 0,
      amount: r2(amount),
      taxable: r2(taxable),
      cgst: r2(gstAmt / 2),
      sgst: r2(gstAmt / 2),
      igst: 0,
    };
  });
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
      rows.push({
        key: `po-${o._id}-${idx}`,
        vendor_gst: o.vendorId?.taxId || '',
        supplier: o.vendorId?.name || '',
        product: it.itemName,
        hsn: it.hsnCode,
        gst_rate: it.gstPercent,
        qty: it.qty,
        unit_price: it.qty ? r2(it.taxable / it.qty) : 0,
        state_code: '',
        state_name: '',
        inv_no: o.invNo || o.billNo || o.poCode || '',
        orig_inv_no: '',
        inv_date: o.createdAt?.toISOString().slice(0, 10) || '',
        taxable: it.taxable,
        cgst: it.cgst,
        sgst: it.sgst,
        igst: it.igst,
        total_tax: r2(it.cgst + it.sgst + it.igst),
        inv_value: it.amount,
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
        gst_rate: it.gstPercent,
        qty: it.qty,
        unit_price: it.qty ? r2(it.taxable / it.qty) : it.taxable,
        state_code: '',
        state_name: '',
        inv_no: l.invoiceNo || l.lpCode || '',
        orig_inv_no: '',
        inv_date: l.createdAt?.toISOString().slice(0, 10) || '',
        taxable: it.taxable,
        cgst: it.cgst,
        sgst: it.sgst,
        igst: it.igst,
        total_tax: r2(it.cgst + it.sgst + it.igst),
        inv_value: it.amount,
      });
    });
  });

  return { rows, orderCount: orders.length, localPurchaseCount: localPurchases.length, orders, localPurchases };
};

// Real unit purchase cost per item name, keyed by lowercased item name. Prefers
// InventoryItem.purchasePrice — the same value shown on the Inventory page, and the
// currently-configured cost for that item — over the historical PurchaseOrder/LocalPurchase
// average, so Purchase Rate in reports always matches Inventory instead of drifting from it.
// Falls back to the purchase-history average (then to the 62%/65%-of-revenue guess at the
// call site) only for items with no InventoryItem record or no purchasePrice set.
// Also returns gstIndex (per-item GST %, from InventoryItem.gstPercent, default 18 — same
// default explodePurchaseOrderItems already uses) so callers costing a sold item can split its
// COGS into taxable + GST the same way Sales/Purchase reports already split invoice/PO amounts.
const buildItemCostIndex = async (dateFilter = {}) => {
  const [{ rows }, items] = await Promise.all([
    buildPurchaseRows(dateFilter),
    InventoryItem.find({ deletedAt: null }, 'itemName purchasePrice gstPercent'),
  ]);
  const acc = {};
  rows.forEach((r) => {
    if (!r.product || !r.qty) return;
    const key = r.product.trim().toLowerCase();
    if (!acc[key]) acc[key] = { amount: 0, qty: 0 };
    // Excl-GST (taxable), not inv_value (GST-inclusive) — this index is compared against
    // excl-GST product sales figures in Product-wise/Bill-wise P&L (Invoice.items prices are
    // taxable, pre-GST), so averaging in the GST-inclusive invoice value here previously
    // overstated per-unit COGS and understated Gross Profit for every item priced off history.
    acc[key].amount += r.taxable;
    acc[key].qty += r.qty;
  });
  const index = {};
  Object.entries(acc).forEach(([k, v]) => { index[k] = v.qty > 0 ? v.amount / v.qty : 0; });
  const gstIndex = {};
  items.forEach((it) => {
    const key = (it.itemName || '').trim().toLowerCase();
    if (!key) return;
    if (Number(it.purchasePrice) > 0) index[key] = Number(it.purchasePrice);
    gstIndex[key] = it.gstPercent != null ? Number(it.gstPercent) : 18;
  });
  return { index, gstIndex };
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
    .populate({
      path: 'orderId',
      select: `orderCode state salesPerson assignedTo ${ORDER_MONEY_FIELDS}`,
      populate: { path: 'assignedTo', select: 'fullName' },
    })
    .sort('-invoiceDate');

  const monthlyMap = {};
  invoices.forEach((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const key = inv.invoiceDate?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0 };
    monthlyMap[key].amount += resolveInvoiceMoney(inv, order).invValue;
  });

  const data = invoices.map((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const { invValue, taxable, gstAmt } = resolveInvoiceMoney(inv, order);
    const allProducts = (inv.items || []).map((it) => it.itemName).filter(Boolean).join(', ');

    return {
      key: String(inv._id),
      gst_no: inv.partyId?.gstNumber || '',
      customer: inv.partyId?.name || '',
      product: allProducts,
      // Same fallback chain used across Dispatch/Operations/Sales (Order.salesPerson is a
      // free-text "Assigned To (Sales)" field; assignedTo is the linked User when set instead).
      salesPerson: order?.salesPerson || order?.assignedTo?.fullName || '',
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
      invoiceType: inv.invoiceType || 'GST',
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

// ─── LOCAL PURCHASE REPORT ─────────────────────────────────────────────────────
// Standalone report for informal/local vendor bills (LocalPurchase) — kept separate from
// the merged Purchase Report above (which combines PurchaseOrder + LocalPurchase into one
// GST-format table) so local purchases can be reviewed/exported on their own, with their
// own payment status/paid-vs-pending tracking (fields PurchaseOrder doesn't carry).
exports.getLocalPurchaseReport = asyncHandler(async (req, res) => {
  const dateFilter = buildDateFilterOn(req, 'createdAt');
  const localPurchases = await LocalPurchase.find(dateFilter)
    .populate('vendorId', 'name phone taxId')
    .sort('-createdAt');

  const data = localPurchases.map((lp) => {
    const items = lp.items || [];
    const total = Number(lp.totalAmount) || 0;
    const paid = Number(lp.paidAmount) || 0;
    const pending = r2(Math.max(total - paid, 0));
    return {
      key: String(lp._id),
      lpCode: lp.lpCode || '',
      invoiceNo: lp.invoiceNo || '',
      date: lp.createdAt?.toISOString().slice(0, 10) || '',
      vendor: lp.vendorId?.name || lp.vendorName || '',
      vendorPhone: lp.vendorId?.phone || lp.vendorPhone || '',
      product: items.map((it) => it.itemName).filter(Boolean).join(', '),
      itemCount: items.length,
      qty: items.reduce((s, it) => s + (Number(it.qty) || 0), 0),
      totalAmount: r2(total),
      gstAmount: r2(Number(lp.gstAmount) || 0),
      paidAmount: r2(paid),
      pendingAmount: pending,
      paymentType: lp.paymentType || '',
      paymentStatus: lp.paymentStatus || 'Pending',
      paidBy: lp.paidBy || '',
      dueDate: lp.dueDate?.toISOString().slice(0, 10) || '',
    };
  });

  const monthlyMap = {};
  localPurchases.forEach((lp) => {
    const key = lp.createdAt?.toLocaleString('default', { month: 'short', year: '2-digit' }) || '';
    const total = Number(lp.totalAmount) || 0;
    const paid = Number(lp.paidAmount) || 0;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, amount: 0, paid: 0, pending: 0, count: 0 };
    monthlyMap[key].amount += total;
    monthlyMap[key].paid += paid;
    monthlyMap[key].pending += Math.max(total - paid, 0);
    monthlyMap[key].count += 1;
  });

  const totalAmount = r2(data.reduce((s, r) => s + r.totalAmount, 0));
  const totalPaid = r2(data.reduce((s, r) => s + r.paidAmount, 0));
  const totalPending = r2(data.reduce((s, r) => s + r.pendingAmount, 0));

  res.status(200).json({
    success: true,
    data,
    summary: { totalAmount, totalPaid, totalPending, count: data.length },
    chartData: Object.values(monthlyMap).map((m) => ({ ...m, amount: r2(m.amount), paid: r2(m.paid), pending: r2(m.pending) })),
  });
});

// Expense category → P&L bucket mapping — one bucket per real Expense.category enum value
// (Backend/src/models/Expense.js), so every category is independently selectable in the
// Reports UI instead of Raw Material/Other/Purchase all being silently lumped into "other".
const EXPENSE_CAT_MAP = {
  'Raw Material': 'raw_material',
  'Shipping / Transportation': 'transport',
  'Utilities (Rent/Elec)': 'utilities',
  'Other': 'other',
  'Purchase': 'purchase',
};
const emptyExpenses = () => ({ raw_material: 0, transport: 0, utilities: 0, purchase: 0, other: 0 });

// ─── PROFIT & LOSS ─────────────────────────────────────────────────────────────
exports.getProfitLoss = asyncHandler(async (req, res) => {
  const poDateFilter = buildDateFilterOn(req, 'createdAt');
  // Sales come from Invoice, same as Sales Report / Bill-wise P&L / Monthly GST (see
  // getSalesReport comment) — an order isn't revenue until it's been billed in Billing.
  // Previously this sourced totalSales/paid/pending from Order.amount/paymentCollection
  // directly, which double-counted un-invoiced orders as revenue and could disagree with
  // every other report tab whenever an invoice's amount was manually adjusted during
  // quotation→invoice conversion (billing.controller convertQuotationToInvoice).
  const [invoices, expenses, itemIndexes, stockIndex] = await Promise.all([
    Invoice.find(buildDateFilterOn(req, 'invoiceDate'))
      .populate('orderId', `kitOrders kitOverallQty orderCategory ${ORDER_MONEY_FIELDS}`)
      .populate('quotationId', 'kitOrders kitOverallQty'),
    // Expenses are dated by expenseDate, not createdAt — filtering by createdAt would
    // exclude/include the wrong entries whenever an expense is backdated.
    Expense.find(buildDateFilterOn(req, 'expenseDate')),
    buildItemCostIndex(poDateFilter),
    buildStockIndex(),
  ]);
  const { index: itemCostIndex, gstIndex: itemGstIndex } = itemIndexes;

  // Excl-GST taxable value and GST split per invoice, reconciled the same way as every
  // other Invoice-sourced report tab (see reconcileTaxable above).
  const invRows = invoices.map((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const { taxable, gstAmt, invValue } = resolveInvoiceMoney(inv, order);
    const paid = resolveInvoicePaid(inv, order);
    return { inv, taxable, gstAmt, invValue, paid };
  });

  const totalSales = invRows.reduce((s, r) => s + r.taxable, 0);
  const totalSalesGst = invRows.reduce((s, r) => s + r.gstAmt, 0);

  // Paid ratio off the reconciled paid/invValue (resolveInvoicePaid/resolveInvoiceMoney above)
  // instead of raw Invoice.advanceAmount/Invoice.total — a payment recorded via Sales/
  // Negotiation's own flow lands on Order.paymentCollection without always syncing back onto
  // Invoice.advanceAmount, so trusting the raw Invoice fields alone previously kept showing an
  // invoice as fully "Pending" here even after it was fully paid (and Billing/Parties already
  // showed it as Paid).
  const paidRatio = (r) => (r.invValue > 0 ? Math.min(1, r.paid / r.invValue) : 0);
  // Excl-GST paid/pending, applying each invoice's own paid ratio to its excl-GST taxable
  // figure so these reconcile exactly with `totalSales` above (also excl-GST).
  const totalPaid = invRows.reduce((s, r) => s + r2(r.taxable * paidRatio(r)), 0);
  const totalPending = invRows.reduce((s, r) => s + r2(r.taxable * (1 - paidRatio(r))), 0);

  const expenseBreakdown = emptyExpenses();
  expenses.forEach((e) => {
    const cat = EXPENSE_CAT_MAP[e.category] || 'other';
    expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + e.amount;
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netGstPayable = totalSalesGst;

  // Monthly sales/paid/pending (per-category expense breakdown added further below) —
  // COGS is filled in after Product-wise P&L (below) so it can be derived from the same
  // sales-matched per-product totals instead of a separate pass.
  const monthlyMap = {};
  invRows.forEach((r) => {
    const key = r.inv.invoiceDate?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, paid: 0, pending: 0, paidGst: 0, pendingGst: 0, expenses: emptyExpenses() };
    const ratio = paidRatio(r);
    monthlyMap[key].sales += r.taxable;
    monthlyMap[key].salesGst += r.gstAmt;
    // Split each invoice's excl-GST sales and its GST by the SAME paid ratio, so
    // paid+pending always reconciles exactly to sales (Excl. GST) or sales+salesGst
    // (Incl. GST) — whichever Total Sales figure the GST-mode toggle is showing.
    monthlyMap[key].paid += r2(r.taxable * ratio);
    monthlyMap[key].pending += r2(r.taxable * (1 - ratio));
    monthlyMap[key].paidGst += r2(r.gstAmt * ratio);
    monthlyMap[key].pendingGst += r2(r.gstAmt * (1 - ratio));
  });
  expenses.forEach((e) => {
    const key = e.expenseDate?.toLocaleString('default', { month: 'short' }) || '';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, paid: 0, pending: 0, paidGst: 0, pendingGst: 0, expenses: emptyExpenses() };
    const cat = EXPENSE_CAT_MAP[e.category] || 'other';
    monthlyMap[key].expenses[cat] = (monthlyMap[key].expenses[cat] || 0) + e.amount;
  });

  // Product-wise P&L (from invoice items, kit-multiplied via the linked order/quotation —
  // see kitMultiplier above) — COGS uses the real average purchase cost for that item when
  // we have purchase history for it, falling back to a flat 65%-of-sales estimate only for
  // items with no PurchaseOrder/LocalPurchase record at all.
  const invoiceItemRows = (inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const quotation = inv.quotationId && typeof inv.quotationId === 'object' ? inv.quotationId : null;
    const kitOrders = order?.kitOrders?.length ? order.kitOrders : (quotation?.kitOrders || []);
    const legacyOverallQty = order?.kitOverallQty ?? quotation?.kitOverallQty;
    const rawItems = inv.items?.length
      ? inv.items
      : [{ itemName: 'Unknown', lineTotal: Number(inv.subtotal) || 0, qty: 1 }];
    return applyKitMultiplier(rawItems, kitOrders, legacyOverallQty, order?.orderCategory);
  };

  const productMap = {};
  invoices.forEach((inv) => {
    invoiceItemRows(inv).forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMap[name]) productMap[name] = { product: name, sales: 0, cogs: 0, cogsGst: 0, grossProfit: 0, soldQty: 0, stockQty: 0 };
      const itemSales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMap[name].sales += itemSales;
      productMap[name].soldQty += Number(item.qty) || 0;
    });
  });
  Object.values(productMap).forEach((p) => {
    const key = p.product.trim().toLowerCase();
    const rate = itemCostIndex[key];
    p.cogs = rate != null && rate > 0 ? r2(rate * p.soldQty) : r2(p.sales * 0.65);
    p.cogsGst = r2(p.cogs * ((itemGstIndex[key] ?? 18) / 100));
    p.grossProfit = p.sales - p.cogs;
    p.stockQty = stockIndex[key] ?? 0;
  });

  // Summary COGS = cost of the units actually SOLD in this date range (same invoices/scope as
  // totalSales above) — the sum of Product-wise P&L's own per-product cogs, NOT independent
  // Purchase Order/Local Purchase activity in the same window. Those two used to disagree
  // whenever a period had sales but no fresh purchases (stock bought earlier) or purchases but
  // few sales (restocking): Total Sales and Total COGS came from two unrelated document sets,
  // so Gross Profit didn't reconcile with what the Product-wise P&L tab showed for the same
  // range. Deriving it from productMap instead guarantees the two tabs always agree.
  const totalCogs = r2(Object.values(productMap).reduce((s, p) => s + p.cogs, 0));
  const totalCogsGst = r2(Object.values(productMap).reduce((s, p) => s + p.cogsGst, 0));
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  // Per-product monthly breakdown
  const productMonthlyData = {};
  invoices.forEach((inv) => {
    const month = inv.invoiceDate?.toLocaleString('default', { month: 'short' }) || '';
    invoiceItemRows(inv).forEach((item) => {
      const name = item.itemName || 'Unknown';
      if (!productMonthlyData[name]) productMonthlyData[name] = {};
      if (!productMonthlyData[name][month]) productMonthlyData[name][month] = { month, sales: 0, cogs: 0, cogsGst: 0, grossProfit: 0, qty: 0 };
      const sales = Number(item.lineTotal) || (Number(item.price) * Number(item.qty)) || 0;
      productMonthlyData[name][month].sales += sales;
      productMonthlyData[name][month].qty += Number(item.qty) || 0;
    });
  });
  Object.keys(productMonthlyData).forEach((prod) => {
    const key = prod.trim().toLowerCase();
    const rate = itemCostIndex[key];
    const gstRate = itemGstIndex[key] ?? 18;
    const byMonth = Object.values(productMonthlyData[prod]);
    byMonth.forEach((m) => {
      m.cogs = rate != null && rate > 0 ? r2(rate * m.qty) : r2(m.sales * 0.65);
      m.cogsGst = r2(m.cogs * (gstRate / 100));
      m.grossProfit = m.sales - m.cogs;
    });
    productMonthlyData[prod] = byMonth;
  });
  // Monthly COGS bucketed by the SAME invoice month sales/paid/pending above are bucketed by
  // (see productMonthlyData) — not by unrelated purchase createdAt — so a month's COGS always
  // describes the cost of THAT month's sales, matching totalCogs' sales-matched basis.
  Object.values(productMonthlyData).forEach((byMonth) => {
    byMonth.forEach((m) => {
      if (!monthlyMap[m.month]) monthlyMap[m.month] = { month: m.month, sales: 0, salesGst: 0, cogs: 0, cogsGst: 0, grossProfit: 0, paid: 0, pending: 0, paidGst: 0, pendingGst: 0, expenses: emptyExpenses() };
      monthlyMap[m.month].cogs += m.cogs;
      monthlyMap[m.month].cogsGst += m.cogsGst;
    });
  });
  Object.values(monthlyMap).forEach((m) => { m.grossProfit = m.sales - m.cogs; });

  res.status(200).json({
    success: true,
    data: {
      summary: { totalSales, totalSalesGst, totalCogs, grossProfit, totalExpenses, netProfit, netGstPayable, totalPaid, totalPending },
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
    .populate('orderId', `kitOrders kitOverallQty orderCategory ${ORDER_MONEY_FIELDS}`)
    .populate('quotationId', 'kitOrders kitOverallQty')
    .sort('-invoiceDate');
  const { index: itemCostIndex } = await buildItemCostIndex();

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
    const { invValue, taxable, gstAmt } = resolveInvoiceMoney(inv, order);
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
      sell_total: invValue,
      cogs: r2(cogs),
      input_gst: r2(inputGst),
      gross_profit: r2(grossProfit),
      status: resolveInvoiceStatus(inv, order, invValue),
    };
  });

  res.status(200).json({ success: true, data: billPL });
});

// ─── MONTHLY GST REPORT ────────────────────────────────────────────────────────
const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getMonthlyGst = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ invoiceType: 'GST', ...buildDateFilterOn(req, 'invoiceDate') })
    .populate('orderId', ORDER_MONEY_FIELDS);
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
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const { taxable, gstAmt } = resolveInvoiceMoney(inv, order);
    row.sales_taxable += taxable;
    row.sales_cgst += gstAmt / 2;
    row.sales_sgst += gstAmt / 2;
    row.sales_total_gst += gstAmt;
  });

  purchaseOrders.forEach((po) => {
    const row = ensureRow(po.createdAt);
    explodePurchaseOrderItems(po).forEach((it) => {
      row.pur_taxable += it.taxable;
      row.pur_cgst += it.cgst;
      row.pur_sgst += it.sgst;
      row.pur_igst += it.igst;
      row.pur_total_gst += it.cgst + it.sgst + it.igst;
    });
  });
  localPurchases.forEach((lp) => {
    const row = ensureRow(lp.createdAt);
    explodeLocalPurchaseItems(lp).forEach((it) => {
      row.pur_taxable += it.taxable;
      row.pur_cgst += it.cgst;
      row.pur_sgst += it.sgst;
      row.pur_igst += it.igst;
      row.pur_total_gst += it.cgst + it.sgst + it.igst;
    });
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
      .populate('orderId', ORDER_MONEY_FIELDS)
      .sort('-invoiceDate');
    const rows = invoices.map((inv) => {
      const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
      const { invValue, taxable, gstAmt } = resolveInvoiceMoney(inv, order);
      return {
        gstNo: inv.partyId?.gstNumber || '',
        customerName: inv.partyId?.name || '',
        invoiceNo: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate?.toISOString().slice(0, 10),
        invoiceValue: invValue,
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

// ─── FORWARDING & COURIER CHARGES REPORT ──────────────────────────────────────
// Forwarding charge is billed at the Order level (Order.forwardingChargeAmount). Courier
// charge used to be read from Payment.courierCharge alone — but Payment documents are only
// created by Billing's own recordPayment; a payment recorded through Sales/Negotiation's own
// flow (syncOrderPaymentCollection, e.g. a Quotation-stage payment) writes courierCharge
// straight onto Order.paymentCollection and never creates a Payment doc at all, so that
// courier charge was silently invisible here (same reconciliation gap as Invoice.total in
// resolveInvoiceMoney above — real live case: INV-260001 had zero Payment docs but ₹1,250 of
// courier charge sitting on its Order.paymentCollection). Order.paymentCollection is written
// by BOTH paths (Billing's recordPayment syncs onto it too, see billing.controller.js), so
// summing courierCharge from there alone captures every payment without double-counting.
// NOTE: paymentCollection lives on the Order, not per-invoice — if one order ever has two
// invoices against it (a documented edge case, see parties.controller's getHotelPendingDue),
// each invoice's row here would show that order's FULL courier total, not a per-invoice
// split; no per-invoice courier data exists on Order.paymentCollection to split it by.
exports.getForwardingCourierReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find(buildDateFilterOn(req, 'invoiceDate'))
    .populate('partyId', 'name')
    .populate('orderId', 'forwardingChargeAmount paymentCollection')
    .sort('-invoiceDate');

  const data = [];
  const monthlyHotelMap = {};

  invoices.forEach((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const forwardingCharge = Number(order?.forwardingChargeAmount) || 0;
    const courierCharge = r2((order?.paymentCollection || []).reduce(
      (s, e) => s + (Number(e?.courierCharge) || 0), 0
    ));
    if (!forwardingCharge && !courierCharge) return;

    const hotel = inv.partyId?.name || 'Unknown';
    const month = inv.invoiceDate?.toLocaleString('default', { month: 'short' }) || '';
    const year = inv.invoiceDate?.getFullYear() || '';

    data.push({
      key: String(inv._id),
      hotel,
      month,
      year,
      invoiceNo: inv.invoiceNumber || '',
      invoiceDate: inv.invoiceDate?.toISOString().slice(0, 10) || '',
      forwardingCharge: r2(forwardingCharge),
      courierCharge,
      totalCharge: r2(forwardingCharge + courierCharge),
    });

    const groupKey = `${month}-${year}|${hotel}`;
    if (!monthlyHotelMap[groupKey]) {
      monthlyHotelMap[groupKey] = { key: groupKey, month, year, hotel, forwardingCharge: 0, courierCharge: 0, totalCharge: 0, invoiceCount: 0 };
    }
    monthlyHotelMap[groupKey].forwardingCharge += forwardingCharge;
    monthlyHotelMap[groupKey].courierCharge += courierCharge;
    monthlyHotelMap[groupKey].totalCharge += forwardingCharge + courierCharge;
    monthlyHotelMap[groupKey].invoiceCount += 1;
  });

  const monthlyHotelData = Object.values(monthlyHotelMap)
    .map((r) => ({ ...r, forwardingCharge: r2(r.forwardingCharge), courierCharge: r2(r.courierCharge), totalCharge: r2(r.totalCharge) }))
    .sort((a, b) => (a.year - b.year) || (MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)) || a.hotel.localeCompare(b.hotel));

  const totalForwarding = data.reduce((s, r) => s + r.forwardingCharge, 0);
  const totalCourier = data.reduce((s, r) => s + r.courierCharge, 0);

  res.status(200).json({
    success: true,
    data,
    monthlyHotelData,
    summary: {
      totalForwarding: r2(totalForwarding),
      totalCourier: r2(totalCourier),
      totalCharges: r2(totalForwarding + totalCourier),
      count: data.length,
    },
  });
});

// ─── TRANSPORTATION CHARGE REPORT ─────────────────────────────────────────────
// Row-per-order forwarding-charge report scoped by "Transport Cost Scope"
// (Order.transportationBy, set on Lead/Order creation — 'CLIENT' or 'HNG') with each charge's
// live Paid/Partially Paid/Pending status, reconciled against its linked Invoice the same way
// Bill-wise P&L does (resolveInvoiceStatus/resolveInvoicePaid). Distinct from the existing
// Forwarding & Courier Charges report above (month+hotel aggregate, no scope or per-row
// payment-status breakdown) — this one keeps one row per order and adds those two facets.
exports.getTransportationChargeReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find(buildDateFilterOn(req, 'invoiceDate'))
    .populate('partyId', 'name')
    .populate({
      path: 'orderId',
      select: `orderCode transportationBy salesPerson assignedTo ${ORDER_MONEY_FIELDS}`,
      populate: { path: 'assignedTo', select: 'fullName' },
    })
    .sort('-invoiceDate');

  const data = [];
  invoices.forEach((inv) => {
    const order = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    // Only orders where "Forwarding charge applicable" was actually checked carry a real
    // transportation charge to report — same gate the Forwarding & Courier report uses.
    if (!order?.forwardingCharge) return;

    const forwardingChargeAmount = r2(Number(order.forwardingChargeAmount) || 0);
    const { invValue } = resolveInvoiceMoney(inv, order);
    const paid = resolveInvoicePaid(inv, order);
    // Same ratio Profit & Loss uses to split an invoice's excl-GST sales into paid/pending
    // (see paidRatio in getProfitLoss) — applied here to just the forwarding-charge slice of
    // the invoice, so a partially-paid invoice reports a partially-paid forwarding charge
    // instead of an all-or-nothing paid/pending flag.
    const ratio = invValue > 0 ? Math.min(1, paid / invValue) : 0;
    const paidAmount = r2(forwardingChargeAmount * ratio);
    const pendingAmount = r2(forwardingChargeAmount - paidAmount);

    data.push({
      key: String(inv._id),
      hotel: inv.partyId?.name || 'Unknown',
      orderCode: order.orderCode || '',
      invoiceNo: inv.invoiceNumber || '',
      invoiceDate: inv.invoiceDate?.toISOString().slice(0, 10) || '',
      salesPerson: order.salesPerson || order.assignedTo?.fullName || '',
      transportCostScope: order.transportationBy || 'Unspecified',
      forwardingChargeApplicable: 'Yes',
      forwardingChargeAmount,
      paidAmount,
      pendingAmount,
      paymentStatus: resolveInvoiceStatus(inv, order, invValue),
    });
  });

  // Detailed Scope × Payment-Status matrix — Transport Cost Scope (CLIENT/HNG/Unspecified) is
  // the invoice-independent order attribute; paymentStatus (Paid/Partially Paid/Pending) is the
  // reconciled invoice status (resolveInvoiceStatus above). Each row's own forwardingChargeAmount
  // is bucketed by its OWN status here (not the ratio-split paid/pending amounts used for the
  // per-row/summary financial totals below) so the matrix answers "how many Client orders are
  // still Pending" as a whole-charge count, matching how the Payment Status column/filter reads.
  const PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending'];
  const emptyStatusBucket = () => ({ Paid: { count: 0, amount: 0 }, 'Partially Paid': { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 } });

  const scopeMap = {};
  data.forEach((r) => {
    const key = r.transportCostScope;
    if (!scopeMap[key]) scopeMap[key] = { scope: key, totalAmount: 0, paid: 0, pending: 0, count: 0, statusBreakdown: emptyStatusBucket() };
    scopeMap[key].totalAmount += r.forwardingChargeAmount;
    scopeMap[key].paid += r.paidAmount;
    scopeMap[key].pending += r.pendingAmount;
    scopeMap[key].count += 1;
    const bucket = scopeMap[key].statusBreakdown[r.paymentStatus] || (scopeMap[key].statusBreakdown[r.paymentStatus] = { count: 0, amount: 0 });
    bucket.count += 1;
    bucket.amount += r.forwardingChargeAmount;
  });
  const scopeData = Object.values(scopeMap).map((s) => ({
    ...s,
    totalAmount: r2(s.totalAmount),
    paid: r2(s.paid),
    pending: r2(s.pending),
    statusBreakdown: Object.fromEntries(
      Object.entries(s.statusBreakdown).map(([status, b]) => [status, { count: b.count, amount: r2(b.amount) }])
    ),
  }));

  // Overall Paid/Partially Paid/Pending totals (by real order-count and charge amount, not the
  // ratio-split paid/pending money split) — the KPI-card-level view of the same matrix.
  const statusSummary = PAYMENT_STATUSES.map((status) => {
    const rows = data.filter((r) => r.paymentStatus === status);
    return { status, count: rows.length, amount: r2(rows.reduce((s, r) => s + r.forwardingChargeAmount, 0)) };
  });

  const totalAmount = r2(data.reduce((s, r) => s + r.forwardingChargeAmount, 0));
  const totalPaid = r2(data.reduce((s, r) => s + r.paidAmount, 0));
  const totalPending = r2(data.reduce((s, r) => s + r.pendingAmount, 0));

  res.status(200).json({
    success: true,
    data,
    scopeData,
    statusSummary,
    summary: { totalAmount, totalPaid, totalPending, count: data.length },
  });
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
  // Previously ignored req.query.startDate/endDate entirely, unlike every other report tab
  // (Sales/Purchase/P&L/Bill-wise P&L/Monthly GST/Forwarding & Courier all respect a date
  // range) — leaderboard revenue was always all-time regardless of the page's date filter.
  const dateFilter = buildDateFilterOn(req, 'invoiceDate');
  const orderDateFilter = buildDateFilterOn(req, 'createdAt');
  const salesUsers = await User.find({ role: { $in: ['Sales Manager', 'Sales Executive'] }, deletedAt: null });

  const complaints = await Complaint.find().populate('orderId', 'createdBy');
  const complaintCountByUser = {};
  complaints.forEach((c) => {
    const uid = c.orderId?.createdBy ? String(c.orderId.createdBy) : null;
    if (uid) complaintCountByUser[uid] = (complaintCountByUser[uid] || 0) + 1;
  });

  const monthlyByUser = {};

  const leaderboard = await Promise.all(salesUsers.map(async (u, idx) => {
    const invoices = await Invoice.find({ createdBy: u._id, ...dateFilter });
    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const orders = await Order.countDocuments({ createdBy: u._id, ...orderDateFilter });

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

// ─── TASK MANAGEMENT PERFORMANCE REPORT ───────────────────────────────────────
// Per-user (User.department === 'Task Management') completion analytics — completion
// rate, on-time rate (Task.completedAt vs Task.dueDate), avg auto-rating and avg
// efficiency% (both computed on Done by tasks.controller.updateTaskStatus, see
// utils/taskTime.computeRating) — ranked into a leaderboard. Mirrors getPerformance's
// per-user aggregation shape (leaderboard + monthlyData) so the frontend can reuse the
// same KPI-cards + leaderboard-table + chart layout for a different department.
exports.getTaskPerformanceReport = asyncHandler(async (req, res) => {
  // completedAt drives "how did they perform in this window" (mirrors getPerformance's
  // invoiceDate filter); createdAt drives "how much work landed on them in this window"
  // — a task can be assigned in-range but still open, or completed in-range but assigned
  // earlier, so these are deliberately two separate filters rather than one shared one.
  const completedDateFilter = buildDateFilterOn(req, 'completedAt');
  const assignedDateFilter = buildDateFilterOn(req, 'createdAt');
  const taskUsers = await User.find({ department: 'Task Management', deletedAt: null });

  const monthlyByUser = {};

  const leaderboard = await Promise.all(taskUsers.map(async (u, idx) => {
    const userMatch = { $or: [{ assignedTo: u._id }, { assignedToMany: u._id }] };

    const [assignedTasks, doneTasks] = await Promise.all([
      Task.find({ ...userMatch, deletedAt: null, ...assignedDateFilter }).select('status'),
      Task.find({ ...userMatch, status: 'Done', deletedAt: null, ...completedDateFilter })
        .select('completedAt dueDate rating efficiencyPct isEmergency'),
    ]);

    const totalAssigned = assignedTasks.length;
    const pending = assignedTasks.filter((t) => t.status !== 'Done').length;
    const completed = doneTasks.length;

    const withDueDate = doneTasks.filter((t) => t.dueDate);
    const onTime = withDueDate.filter((t) => new Date(t.completedAt) <= new Date(t.dueDate)).length;
    const late = withDueDate.length - onTime;

    const ratedTasks = doneTasks.filter((t) => typeof t.rating === 'number');
    const avgRating = ratedTasks.length
      ? r2(ratedTasks.reduce((s, t) => s + t.rating, 0) / ratedTasks.length)
      : 0;

    const effTasks = doneTasks.filter((t) => typeof t.efficiencyPct === 'number');
    const avgEfficiencyPct = effTasks.length
      ? Math.round(effTasks.reduce((s, t) => s + t.efficiencyPct, 0) / effTasks.length)
      : 0;

    const emergencyHandled = doneTasks.filter((t) => t.isEmergency).length;

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
    const onTimeRate = withDueDate.length > 0 ? Math.round((onTime / withDueDate.length) * 100) : 0;
    const ratingPct = Math.round((avgRating / 5) * 100);
    const efficiencyScorePct = Math.min(avgEfficiencyPct, 100);

    // Equal-weighted composite (completion rate / on-time rate / rating / efficiency) so
    // ranking rewards reliability and quality, not just raw task volume.
    const score = completed > 0
      ? Math.round((completionRate + onTimeRate + ratingPct + efficiencyScorePct) / 4)
      : 0;

    doneTasks.forEach((t) => {
      const month = t.completedAt?.toLocaleString('default', { month: 'short' });
      if (!month) return;
      if (!monthlyByUser[month]) monthlyByUser[month] = { month };
      monthlyByUser[month][u.fullName] = (monthlyByUser[month][u.fullName] || 0) + 1;
    });

    return {
      key: String(u._id),
      id: u._id,
      name: u.fullName,
      role: u.role,
      totalAssigned,
      pending,
      completed,
      onTime,
      late,
      completionRate,
      onTimeRate,
      avgRating,
      avgEfficiencyPct,
      emergencyHandled,
      score,
      color: PERFORMANCE_PALETTE[idx % PERFORMANCE_PALETTE.length],
    };
  }));

  leaderboard.sort((a, b) => b.score - a.score || b.completed - a.completed);
  leaderboard.forEach((row, idx) => { row.rank = idx + 1; });

  const monthlyData = Object.values(monthlyByUser)
    .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

  res.status(200).json({ success: true, data: { leaderboard, monthlyData } });
});

// ─── EMERGENCY / PAYMENT / DESIGN / DISPATCH APPROVALS REPORT ─────────────────
// There is no single shared "Approval" collection in this app — every approval-with-reason
// workflow bolts its own fields onto its own model:
//   • Emergency Dispatch (Sales Head + Ops Head dual approval)     → Task
//   • Design / Sticker / Printing (Sales + Ops Head dual approval) → StickerRequest
//   • Dispatch mismatches (Transport name / Packages+Destination / Invoice) → Order
// This report queries all three sources and normalizes them into one row shape so every
// approval — both the "sent/requested" and the "approved/rejected" side — can be reviewed
// together, filtered by order, date range, or approval type.
//
// "Payment Approval" has no dedicated workflow of its own anywhere in the app — the
// Emergency Dispatch dual-approval IS the mechanism that bypasses the payment-pending
// dispatch gate (see tasks.controller.js dispatchOrder), so it is surfaced under the
// 'emergency' bucket rather than invented as a separate empty category.
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const fmtTime = (d) => (d ? new Date(d).toISOString().slice(11, 16) : '');
const userName = (u) => (u && typeof u === 'object' ? (u.fullName || '') : '');
const userRole = (u) => (u && typeof u === 'object' ? (u.role || '') : '');
// Later of two (possibly absent) decision timestamps — used for dual-approval types where
// either Sales or Ops may have signed off last, so the row's overall "Approved" timestamp
// isn't tied to one fixed field.
const maxDate = (a, b) => {
  const da = a ? new Date(a) : null;
  const db = b ? new Date(b) : null;
  if (da && db) return da > db ? da : db;
  return da || db || null;
};

const APPROVAL_MODULES = ['emergency', 'design', 'transport_mismatch', 'lr_mismatch', 'invoice_mismatch'];

exports.getEmergencyApprovalsReport = asyncHandler(async (req, res) => {
  const userSelect = 'fullName role';
  const orderSelect = { path: 'orderId', select: 'orderCode clientName salesPerson assignedTo', populate: { path: 'assignedTo', select: 'fullName' } };

  const [emergencyTasks, stickerRequests, mismatchOrders] = await Promise.all([
    Task.find({ emergencyRequested: true, deletedAt: null })
      .populate(orderSelect)
      .populate('emergencyRequestedBy', userSelect)
      .populate('emergencySalesApprovedBy', userSelect)
      .populate('emergencyOpsApprovedBy', userSelect),
    StickerRequest.find({})
      .populate(orderSelect)
      .populate('createdBy', userSelect)
      .populate('salesApprovedBy', userSelect)
      .populate('opsHeadApprovedBy', userSelect),
    Order.find({
      deletedAt: null,
      $or: [
        { dispatchTransportMismatchStatus: { $ne: 'none' } },
        { dispatchLrMismatchStatus: { $ne: 'none' } },
        { dispatchInvoiceMismatchStatus: { $ne: 'none' } },
      ],
    })
      .select([
        'orderCode', 'clientName', 'salesPerson', 'assignedTo',
        'dispatchTransportMismatchStatus', 'dispatchTransportMismatchExpected', 'dispatchTransportMismatchScanned',
        'dispatchTransportMismatchReportedAt', 'dispatchTransportMismatchRequestedBy', 'dispatchTransportMismatchDecidedBy', 'dispatchTransportMismatchDecidedAt',
        'dispatchLrMismatchStatus', 'dispatchLrMismatchReason', 'dispatchLrMismatchRequestedBy', 'dispatchLrMismatchRequestedAt',
        'dispatchLrMismatchSalesApproved', 'dispatchLrMismatchSalesApprovedBy', 'dispatchLrMismatchSalesApprovedAt',
        'dispatchLrMismatchOpsApproved', 'dispatchLrMismatchOpsApprovedBy', 'dispatchLrMismatchOpsApprovedAt',
        'dispatchInvoiceMismatchStatus', 'dispatchInvoiceMismatchReason', 'dispatchInvoiceMismatchRequestedBy',
        'dispatchInvoiceMismatchRequestedAt', 'dispatchInvoiceMismatchDecidedBy', 'dispatchInvoiceMismatchDecidedAt', 'dispatchInvoiceMismatchDecisionNote',
      ].join(' '))
      .populate('assignedTo', userSelect)
      .populate('dispatchTransportMismatchRequestedBy', userSelect)
      .populate('dispatchTransportMismatchDecidedBy', userSelect)
      .populate('dispatchLrMismatchRequestedBy', userSelect)
      .populate('dispatchLrMismatchSalesApprovedBy', userSelect)
      .populate('dispatchLrMismatchOpsApprovedBy', userSelect)
      .populate('dispatchInvoiceMismatchRequestedBy', userSelect)
      .populate('dispatchInvoiceMismatchDecidedBy', userSelect),
  ]);

  const rows = [];

  // ── Emergency Dispatch / Payment Approval (Sales Head → Ops Head) ──
  emergencyTasks.forEach((t) => {
    const order = t.orderId && typeof t.orderId === 'object' ? t.orderId : null;
    rows.push({
      key: `emergency-${t._id}`,
      module: 'emergency',
      type: 'Emergency Dispatch / Payment Approval',
      raisedByTeam: 'Task Management (Sales/Ops)',
      orderId: order?._id || t.orderId || '',
      orderCode: order?.orderCode || '',
      clientName: order?.clientName || '',
      salesPerson: order?.salesPerson || userName(order?.assignedTo) || '',
      reason: t.emergencyReason || '',
      sentAtRaw: t.emergencyRequestedAt,
      sentBy: userName(t.emergencyRequestedBy),
      sentByRole: userRole(t.emergencyRequestedBy),
      approver1Role: 'Sales Head',
      approver1Name: userName(t.emergencySalesApprovedBy),
      approver1At: t.emergencySalesApprovedAt,
      approver1Decision: t.emergencySalesApproved ? 'Approved' : 'Pending',
      approver2Role: 'Ops Head',
      approver2Name: userName(t.emergencyOpsApprovedBy),
      approver2At: t.emergencyOpsApprovedAt,
      approver2Decision: t.emergencyOpsApproved ? 'Approved' : 'Pending',
      status: t.emergencyApproved ? 'Approved' : 'Pending',
      approvedAtRaw: t.emergencyApproved ? t.emergencyApprovedAt : null,
      approvedReason: '',
    });
  });

  // ── Design / Sticker / Printing Approval (Sales + Ops Head dual) ──
  stickerRequests.forEach((s) => {
    const order = s.orderId && typeof s.orderId === 'object' ? s.orderId : null;
    const status = (s.salesApproved && s.opsHeadApproved) ? 'Approved'
      : s.status === 'Design Change' ? 'Sent Back for Change'
      : 'Pending';
    rows.push({
      key: `design-${s._id}`,
      module: 'design',
      type: 'Design / Sticker / Printing Approval',
      raisedByTeam: 'Operations (Design/Print)',
      orderId: order?._id || s.orderId || '',
      orderCode: order?.orderCode || '',
      clientName: order?.clientName || s.hotelName || '',
      salesPerson: order?.salesPerson || userName(order?.assignedTo) || '',
      reason: [s.stickerType, s.product, s.hotelName].filter(Boolean).join(' — '),
      sentAtRaw: s.createdAt,
      sentBy: userName(s.createdBy),
      sentByRole: userRole(s.createdBy),
      approver1Role: 'Sales',
      approver1Name: userName(s.salesApprovedBy),
      approver1At: s.salesApprovedAt,
      approver1Decision: s.salesApproved ? 'Approved' : 'Pending',
      approver2Role: 'Ops Head',
      approver2Name: userName(s.opsHeadApprovedBy),
      approver2At: s.opsHeadApprovedAt,
      approver2Decision: s.opsHeadApproved ? 'Approved' : 'Pending',
      status,
      approvedAtRaw: (s.salesApproved && s.opsHeadApproved) ? maxDate(s.salesApprovedAt, s.opsHeadApprovedAt) : null,
      approvedReason: '',
    });
  });

  // ── Dispatch mismatch flows (all three live on Order) ──
  mismatchOrders.forEach((o) => {
    const base = {
      orderId: o._id,
      orderCode: o.orderCode || '',
      clientName: o.clientName || '',
      salesPerson: o.salesPerson || userName(o.assignedTo) || '',
      raisedByTeam: 'Dispatch',
    };
    if (o.dispatchTransportMismatchStatus && o.dispatchTransportMismatchStatus !== 'none') {
      rows.push({
        ...base,
        key: `transport-${o._id}`,
        module: 'transport_mismatch',
        type: 'Transport Mismatch Approval',
        reason: `Expected "${o.dispatchTransportMismatchExpected || ''}" vs scanned "${o.dispatchTransportMismatchScanned || ''}"`,
        sentAtRaw: o.dispatchTransportMismatchReportedAt,
        sentBy: userName(o.dispatchTransportMismatchRequestedBy),
        sentByRole: userRole(o.dispatchTransportMismatchRequestedBy),
        approver1Role: 'Sales',
        approver1Name: userName(o.dispatchTransportMismatchDecidedBy),
        approver1At: o.dispatchTransportMismatchDecidedAt,
        approver1Decision: o.dispatchTransportMismatchStatus === 'approved' ? 'Approved' : o.dispatchTransportMismatchStatus === 'rejected' ? 'Rejected' : 'Pending',
        approver2Role: '', approver2Name: '', approver2At: null, approver2Decision: '',
        status: o.dispatchTransportMismatchStatus === 'approved' ? 'Approved' : o.dispatchTransportMismatchStatus === 'rejected' ? 'Rejected' : 'Pending',
        approvedAtRaw: ['approved', 'rejected'].includes(o.dispatchTransportMismatchStatus) ? o.dispatchTransportMismatchDecidedAt : null,
        approvedReason: '',
      });
    }
    if (o.dispatchLrMismatchStatus && o.dispatchLrMismatchStatus !== 'none') {
      rows.push({
        ...base,
        key: `lr-${o._id}`,
        module: 'lr_mismatch',
        type: 'Packages/Destination Mismatch Approval',
        reason: o.dispatchLrMismatchReason || '',
        sentAtRaw: o.dispatchLrMismatchRequestedAt,
        sentBy: userName(o.dispatchLrMismatchRequestedBy),
        sentByRole: userRole(o.dispatchLrMismatchRequestedBy),
        approver1Role: 'Sales',
        approver1Name: userName(o.dispatchLrMismatchSalesApprovedBy),
        approver1At: o.dispatchLrMismatchSalesApprovedAt,
        approver1Decision: o.dispatchLrMismatchSalesApproved ? 'Approved' : (o.dispatchLrMismatchStatus === 'rejected' ? 'Rejected' : 'Pending'),
        approver2Role: 'Ops',
        approver2Name: userName(o.dispatchLrMismatchOpsApprovedBy),
        approver2At: o.dispatchLrMismatchOpsApprovedAt,
        approver2Decision: o.dispatchLrMismatchOpsApproved ? 'Approved' : (o.dispatchLrMismatchStatus === 'rejected' ? 'Rejected' : 'Pending'),
        status: o.dispatchLrMismatchStatus === 'approved' ? 'Approved' : o.dispatchLrMismatchStatus === 'rejected' ? 'Rejected' : 'Pending',
        approvedAtRaw: ['approved', 'rejected'].includes(o.dispatchLrMismatchStatus)
          ? maxDate(o.dispatchLrMismatchSalesApprovedAt, o.dispatchLrMismatchOpsApprovedAt)
          : null,
        approvedReason: '',
      });
    }
    if (o.dispatchInvoiceMismatchStatus && o.dispatchInvoiceMismatchStatus !== 'none') {
      rows.push({
        ...base,
        key: `invoice-${o._id}`,
        module: 'invoice_mismatch',
        type: 'Dispatch Mismatch Approval (Report Mismatch)',
        reason: o.dispatchInvoiceMismatchReason || '',
        sentAtRaw: o.dispatchInvoiceMismatchRequestedAt,
        sentBy: userName(o.dispatchInvoiceMismatchRequestedBy),
        sentByRole: userRole(o.dispatchInvoiceMismatchRequestedBy),
        approver1Role: 'Sales (Order Owner)',
        approver1Name: userName(o.dispatchInvoiceMismatchDecidedBy),
        approver1At: o.dispatchInvoiceMismatchDecidedAt,
        approver1Decision: o.dispatchInvoiceMismatchStatus === 'approved' ? 'Approved' : o.dispatchInvoiceMismatchStatus === 'rejected' ? 'Rejected' : 'Pending',
        approver1Note: o.dispatchInvoiceMismatchDecisionNote || '',
        approver2Role: '', approver2Name: '', approver2At: null, approver2Decision: '',
        status: o.dispatchInvoiceMismatchStatus === 'approved' ? 'Approved' : o.dispatchInvoiceMismatchStatus === 'rejected' ? 'Rejected' : 'Pending',
        approvedAtRaw: ['approved', 'rejected'].includes(o.dispatchInvoiceMismatchStatus) ? o.dispatchInvoiceMismatchDecidedAt : null,
        approvedReason: o.dispatchInvoiceMismatchDecisionNote || '',
      });
    }
  });

  // Date filter applied uniformly across every source's own "sent/requested" timestamp,
  // and optional type/order filters — done row-side (not per-query) since the three
  // sources have different date fields and Order alone holds three of them at once.
  const start = req.query.startDate ? new Date(req.query.startDate) : null;
  const end = req.query.endDate ? new Date(req.query.endDate) : null;
  let filtered = rows.filter((r) => {
    if (start && (!r.sentAtRaw || new Date(r.sentAtRaw) < start)) return false;
    if (end && (!r.sentAtRaw || new Date(r.sentAtRaw) > end)) return false;
    return true;
  });
  if (req.query.type && APPROVAL_MODULES.includes(req.query.type)) {
    filtered = filtered.filter((r) => r.module === req.query.type);
  }
  if (req.query.orderId) {
    filtered = filtered.filter((r) => String(r.orderId) === String(req.query.orderId));
  }
  if (req.query.status) {
    filtered = filtered.filter((r) => r.status === req.query.status);
  }

  filtered.sort((a, b) => new Date(b.sentAtRaw || 0) - new Date(a.sentAtRaw || 0));

  const data = filtered.map((r) => ({
    ...r,
    sentDate: fmtDate(r.sentAtRaw),
    sentTime: fmtTime(r.sentAtRaw),
    sentReason: r.reason || '',
    approvedDate: fmtDate(r.approvedAtRaw),
    approvedTime: fmtTime(r.approvedAtRaw),
    approvedReason: r.approvedReason || '',
    approver1Date: fmtDate(r.approver1At),
    approver1Time: fmtTime(r.approver1At),
    approver2Date: fmtDate(r.approver2At),
    approver2Time: fmtTime(r.approver2At),
    sentAtRaw: undefined,
    approvedAtRaw: undefined,
    approver1At: undefined,
    approver2At: undefined,
  }));

  const monthlyMap = {};
  data.forEach((r) => {
    const key = r.sentDate ? r.sentDate.slice(0, 7) : 'Unknown';
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, count: 0 };
    monthlyMap[key].count += 1;
  });

  const summary = {
    total: data.length,
    pending: data.filter((r) => r.status === 'Pending').length,
    approved: data.filter((r) => r.status === 'Approved').length,
    rejected: data.filter((r) => r.status === 'Rejected').length,
    byType: APPROVAL_MODULES.map((m) => ({ module: m, count: data.filter((r) => r.module === m).length })),
  };

  res.status(200).json({
    success: true,
    data,
    summary,
    chartData: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
  });
});

// ─── SWITCH REPORT (Task reassignment + Vendor/Printing Supplier switch) ──────
// Two independent "switch" actions exist in the app, each logging its own history array
// (see Task.switchHistory / StickerRequest.switchHistory, populated by tasks.controller
// reassignTask and operations.controller reassignStickerRequest):
//   • Task Management > Reassign column — admin switches a Pending task's assignee
//   • Operations > Design/Vendors > Printing Supplier — switches a design/print request's vendor
// This report flattens both histories (one row per switch event, oldest actions are just as
// visible as the latest) into one shape: Switch From / Switch To / Switch Date & Time / Switch By.
const SWITCH_MODULES = ['task', 'vendor'];

exports.getSwitchReport = asyncHandler(async (req, res) => {
  const [tasks, stickerRequests] = await Promise.all([
    Task.find({ 'switchHistory.0': { $exists: true }, deletedAt: null })
      .select('taskCode taskName product orderId switchHistory')
      .populate({ path: 'orderId', select: 'orderCode clientName' }),
    StickerRequest.find({ 'switchHistory.0': { $exists: true } })
      .select('stickerType product hotelName orderId switchHistory')
      .populate({ path: 'orderId', select: 'orderCode clientName' }),
  ]);

  const rows = [];

  tasks.forEach((t) => {
    const order = t.orderId && typeof t.orderId === 'object' ? t.orderId : null;
    (t.switchHistory || []).forEach((h, i) => {
      rows.push({
        key: `task-${t._id}-${i}`,
        module: 'task',
        type: 'Task Reassignment',
        reference: t.taskName || t.product || t.taskCode || 'Task',
        taskCode: t.taskCode || '',
        orderCode: order?.orderCode || '',
        clientName: order?.clientName || '',
        switchFrom: h.fromName || '—',
        switchTo: h.toName || '—',
        switchBy: h.byName || '',
        switchAtRaw: h.at,
      });
    });
  });

  stickerRequests.forEach((s) => {
    const order = s.orderId && typeof s.orderId === 'object' ? s.orderId : null;
    (s.switchHistory || []).forEach((h, i) => {
      rows.push({
        key: `vendor-${s._id}-${i}`,
        module: 'vendor',
        type: 'Printing Supplier Switch',
        reference: [s.stickerType, s.product].filter(Boolean).join(' — ') || 'Design/Print Request',
        taskCode: '',
        orderCode: order?.orderCode || '',
        clientName: order?.clientName || s.hotelName || '',
        switchFrom: h.fromName || '—',
        switchTo: h.toName || '—',
        switchBy: h.byName || '',
        switchAtRaw: h.at,
      });
    });
  });

  const start = req.query.startDate ? new Date(req.query.startDate) : null;
  const end = req.query.endDate ? new Date(req.query.endDate) : null;
  let filtered = rows.filter((r) => {
    if (start && (!r.switchAtRaw || new Date(r.switchAtRaw) < start)) return false;
    if (end && (!r.switchAtRaw || new Date(r.switchAtRaw) > end)) return false;
    return true;
  });
  if (req.query.type && SWITCH_MODULES.includes(req.query.type)) {
    filtered = filtered.filter((r) => r.module === req.query.type);
  }

  filtered.sort((a, b) => new Date(b.switchAtRaw || 0) - new Date(a.switchAtRaw || 0));

  const data = filtered.map((r) => ({
    ...r,
    switchDate: fmtDate(r.switchAtRaw),
    switchTime: fmtTime(r.switchAtRaw),
    switchAtRaw: undefined,
  }));

  const summary = {
    total: data.length,
    byType: SWITCH_MODULES.map((m) => ({ module: m, count: data.filter((r) => r.module === m).length })),
  };

  res.status(200).json({ success: true, data, summary });
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

exports.exportLocalPurchaseReport = asyncHandler(async (req, res) => {
  const localPurchases = await LocalPurchase.find().populate('vendorId', 'name').sort('-createdAt');
  const csv = ['LP Code,Invoice No,Date,Vendor,Items,Qty,Total Amount,GST Amount,Paid Amount,Pending Amount,Payment Status,Due Date']
    .concat(localPurchases.map((lp) => {
      const items = lp.items || [];
      const total = Number(lp.totalAmount) || 0;
      const paid = Number(lp.paidAmount) || 0;
      const pending = Math.max(total - paid, 0);
      const productNames = items.map((it) => it.itemName).filter(Boolean).join('; ');
      const qty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      return `${lp.lpCode || ''},${lp.invoiceNo || ''},${lp.createdAt?.toISOString().slice(0, 10)},${lp.vendorId?.name || lp.vendorName || ''},"${productNames}",${qty},${total},${lp.gstAmount || 0},${paid},${pending},${lp.paymentStatus || ''},${lp.dueDate?.toISOString().slice(0, 10) || ''}`;
    }))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=local-purchase-report.csv');
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
