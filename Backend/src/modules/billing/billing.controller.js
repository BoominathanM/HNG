const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Quotation = require('../../models/Quotation');
const Order = require('../../models/Order');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { syncOrderTasksPayment, syncOrderPaymentCollection } = require('../../utils/syncOrderPayment');
const { computeRecordBuckets, computeCompositionGrandTotal, r2 } = require('../../utils/orderCalc');
const { buildOrderEditHistory } = require('../../utils/orderEditHistory');
const { syncDispatchRecordQuantities, deductInventoryDeltaForOrder, deductMaterialStockDeltaForOrder } = require('../sales/sales.controller');
const Kit = require('../../models/Kit');

// ─── Price/GST edit helpers (updateInvoicePricing) ────────────────────────────
// Identity key for matching "the same product/kit line" across the order's products[]/
// items[] arrays and the invoice's own items[] snapshot. products[] rows key their inventory
// reference off `inventoryItemId`, items[] rows off `itemId` (see Frontend/src/pages/Sales/
// index.jsx's mapOrderItem comment) — accept either. Falls back to a name+kit+category
// composite, mirroring sales.controller.js's own orderItemKey guard.
const itemMatchKey = (row = {}) => {
  const id = row.inventoryItemId || row.itemId;
  if (id) return `id:${id}`;
  const name = String(row.itemName || row.name || '').trim().toLowerCase();
  return `nc:${row.kitId || ''}|${name}|${row.category || ''}`;
};

// Backend port of Frontend/src/pages/Billing/index.jsx's itemsToProducts — converts a flat
// items[] row into the products[] shape (price → rate) so orders that only ever populated
// items[] (no products[] array) can still be priced through the same floor-check loop.
// Deliberately NOT filtering falsy entries (unlike the frontend version) — the caller indexes
// straight into order.items[i] alongside this, so the two arrays must stay index-parallel.
const itemsToProducts = (items = []) =>
  (items || []).map((i) => ({
    ...(i || {}),
    name: i?.name || i?.itemName || '',
    rate: Number(i?.rate ?? i?.price) || 0,
    gst: Number(i?.gst) || 0,
  }));

// Applies a floor-checked price/GST edit to a linked Order's products[]/kitOrders[]/kitPrice —
// the actual source every total computation (Sales/Operations/Dispatch/Reports, and Billing's
// own invoice/quotation lists) reads from, via orderCalc.js's computeRecordBuckets/
// computeCompositionGrandTotal — recomputes order.total/gstAmount, logs it to order.editHistory
// (+ the given reason), and saves the order. Shared by updateInvoicePricing and
// updateQuotationPricing: both ultimately just push a price edit through to whichever Order
// backs the record (a Quotation "in process" very often already has one via Negotiation
// conversion — see updateQuotation's own linked-order resolution). Throws AppError on
// validation failure; nothing here persists until order.save() at the end, so a mid-loop
// failure leaves no partial write. Returns { buckets, grandTotal, editedByKey } for the caller
// to re-derive its own document's totals from the SAME recompute.
async function applyOrderPriceEdit(order, { products: reqProducts, kitOrders: reqKitOrders, kitPackagePrice, reason, user }) {
  const existingPlain = order.toObject();
  const usingProductsArray = Array.isArray(existingPlain.products) && existingPlain.products.length > 0;
  const existingRows = usingProductsArray ? existingPlain.products : itemsToProducts(existingPlain.items || []);
  const existingKitOrders = Array.isArray(existingPlain.kitOrders) ? existingPlain.kitOrders : [];

  if (reqProducts.length !== existingRows.length) {
    throw new AppError('Product list does not match the order — cannot add or remove products here', 400);
  }

  const editedByKey = new Map();
  let qtyChanged = false;
  for (let i = 0; i < existingRows.length; i++) {
    const oldRow = existingRows[i];
    const newRow = reqProducts[i] || {};
    const oldRate = Number(oldRow.rate ?? oldRow.price) || 0;
    const oldGst = Number(oldRow.gst) || 0;
    const oldQty = Number(oldRow.qty) || 0;
    const newRate = Number(newRow.rate);
    const newGst = Number(newRow.gst);
    const label = oldRow.itemName || oldRow.name || `Product ${i + 1}`;
    if (!Number.isFinite(newRate) || newRate < 0) throw new AppError(`Invalid price for "${label}"`, 400);
    if (!Number.isFinite(newGst) || newGst < 0) throw new AppError(`Invalid GST% for "${label}"`, 400);
    if (newRate < oldRate) throw new AppError(`Price for "${label}" cannot be reduced below ₹${oldRate}`, 400);
    if (newGst < oldGst) throw new AppError(`GST% for "${label}" cannot be reduced below ${oldGst}%`, 400);

    // Quantity is optional per row (existing price-only callers never send it) and, once
    // present, can only be raised — never lowered — mirroring sales.controller.js's own
    // findOrderQuantityDecreases philosophy ("once placed, values only increase"). A row not
    // touching qty simply keeps its current value.
    let newQty = oldQty;
    if (newRow.qty !== undefined) {
      newQty = Number(newRow.qty);
      if (!Number.isFinite(newQty) || newQty < 0) throw new AppError(`Invalid quantity for "${label}"`, 400);
      if (newQty < oldQty) throw new AppError(`Quantity for "${label}" cannot be reduced below ${oldQty}`, 400);
      if (newQty !== oldQty) qtyChanged = true;
    }

    editedByKey.set(itemMatchKey(oldRow), { rate: newRate, gst: newGst, qty: newQty });
    if (usingProductsArray) {
      order.products[i].rate = newRate;
      if (order.products[i].price !== undefined) order.products[i].price = newRate;
      order.products[i].gst = newGst;
      order.products[i].qty = newQty;
    } else if (order.items[i]) {
      order.items[i].price = newRate;
      order.items[i].rate = newRate;
      order.items[i].gst = newGst;
      order.items[i].qty = newQty;
      order.items[i].lineTotal = newQty * newRate;
    }
  }

  // Same floor rule on kitOrders[] (the kit's own package price + overall qty), matched by kitId.
  for (const newKit of reqKitOrders) {
    if (!newKit || !newKit.kitId) continue;
    const oldKit = existingKitOrders.find((k) => k && k.kitId === newKit.kitId);
    if (!oldKit) continue;
    const oldKitPrice = Number(oldKit.kitPrice) || 0;
    const oldKitGst = Number(oldKit.gst ?? oldKit.gstPercent ?? oldKit.taxRate) || 0;
    const oldKitQty = Number(oldKit.overallQty) || 0;
    const newKitPrice = Number(newKit.kitPrice);
    const newKitGst = newKit.gst !== undefined ? Number(newKit.gst) : oldKitGst;
    const label = oldKit.kitName || oldKit.kitType || newKit.kitId;
    if (!Number.isFinite(newKitPrice) || newKitPrice < 0) throw new AppError(`Invalid price for kit "${label}"`, 400);
    if (newKitPrice < oldKitPrice) throw new AppError(`Price for kit "${label}" cannot be reduced below ₹${oldKitPrice}`, 400);
    if (!Number.isFinite(newKitGst) || newKitGst < 0) throw new AppError(`Invalid GST% for kit "${label}"`, 400);
    if (newKitGst < oldKitGst) throw new AppError(`GST% for kit "${label}" cannot be reduced below ${oldKitGst}%`, 400);

    let newKitQty = oldKitQty;
    if (newKit.overallQty !== undefined) {
      newKitQty = Number(newKit.overallQty);
      if (!Number.isFinite(newKitQty) || newKitQty < 0) throw new AppError(`Invalid quantity for kit "${label}"`, 400);
      if (newKitQty < oldKitQty) throw new AppError(`Quantity for kit "${label}" cannot be reduced below ${oldKitQty}`, 400);
      if (newKitQty !== oldKitQty) qtyChanged = true;
    }

    const kitOrderDoc = order.kitOrders.find((k) => k && k.kitId === newKit.kitId);
    if (kitOrderDoc) {
      kitOrderDoc.kitPrice = newKitPrice;
      kitOrderDoc.gst = newKitGst;
      kitOrderDoc.overallQty = newKitQty;
    }
  }

  // Outer "personalized package" fee (order.kitPrice/kitOverallQty) — a THIRD price surface
  // distinct from products[]/kitOrders[], used when packagingIncludes ("Select Kit(s) to
  // Include") bundles other kits/products inside this outer packaging. Optional: only applied
  // when the caller actually sends it (orders without this feature have no such fee).
  if (kitPackagePrice !== undefined) {
    const oldKitPackagePrice = Number(existingPlain.kitPrice) || 0;
    const newKitPackagePrice = Number(kitPackagePrice);
    if (!Number.isFinite(newKitPackagePrice) || newKitPackagePrice < 0) throw new AppError('Invalid personalized package price', 400);
    if (newKitPackagePrice < oldKitPackagePrice) throw new AppError(`Personalized package price cannot be reduced below ₹${oldKitPackagePrice}`, 400);
    order.kitPrice = newKitPackagePrice;
  }

  // Best-effort mirror onto order.items[] — only needed when the primary edit above landed on
  // products[]; products[]/kitOrders[] are what orderCalc.js actually reads for money, so a
  // row that can't be confidently matched here is skipped rather than failing the request.
  // Also carries qty, since Operations/Task Management/Dispatch resolve required qty straight
  // off order.items (see Backend/src/utils/taskQuantity.js resolveRequiredQty) — items[]
  // staying stale here would leave those reading the old ceiling even though products[] (and
  // the order total) already reflect the increase.
  if (usingProductsArray && Array.isArray(order.items)) {
    order.items.forEach((item) => {
      const edit = editedByKey.get(itemMatchKey(item));
      if (!edit) return;
      item.price = edit.rate;
      item.rate = edit.rate;
      item.gst = edit.gst;
      item.qty = edit.qty;
      item.lineTotal = edit.qty * edit.rate;
    });
  }

  const kitsData = (order.packagingIncludes || []).length > 0 ? await Kit.find().lean() : [];
  const orderPlainForCalc = order.toObject();
  const buckets = computeRecordBuckets(orderPlainForCalc);
  const grandTotal = computeCompositionGrandTotal(orderPlainForCalc, kitsData);

  order.total = grandTotal;
  order.gstAmount = r2(buckets.gst);

  const changedByName = user.fullName || user.name || user.email || 'System';
  const editHistoryEntries = buildOrderEditHistory(
    existingPlain,
    { products: order.products, kitOrders: order.kitOrders, total: order.total, gstAmount: order.gstAmount, kitPrice: order.kitPrice },
    user,
  );
  editHistoryEntries.push({
    field: 'Price Revision Reason',
    oldValue: '—',
    newValue: reason,
    changedAt: new Date(),
    changedBy: user._id,
    changedByName,
  });
  order.editHistory.push(...editHistoryEntries);

  // products[]/kitOrders[] are undeclared (strict:false) paths — nested in-place mutation on
  // them isn't guaranteed to be picked up by Mongoose's dirty-checking, unlike items[] (a real
  // DocumentArray). markModified is a safe, idempotent way to force all three.
  order.markModified('products');
  order.markModified('kitOrders');
  order.markModified('items');
  await order.save({ validateBeforeSave: false });

  // A DispatchRecord already forwarded for this order snapshots qtyOrdered/overallQty ONCE at
  // forward time and never revisits it — without this resync, Dispatch's "X of Y" would
  // silently undercount a quantity raised after dispatch started. Mirrors exactly what
  // sales.controller.js's own updateOrder does on a qty-increasing edit; order.items/kitOrders
  // are already index/kitId-aligned with existingPlain at this point (only field values were
  // mutated above, nothing added/removed/reordered), so they're safe to pass directly as the
  // "patch". No-ops (and reads no DispatchRecord) when qty wasn't touched.
  if (qtyChanged) {
    await syncDispatchRecordQuantities(order._id, existingPlain, { items: order.items, kitOrders: order.kitOrders }).catch((err) => {
      console.error(`Dispatch qty resync failed for order ${order.orderCode}:`, err.message);
    });
    // Inventory/material stock is only ever deducted ONCE, in full, at order creation — raising
    // a qty afterward (here, via Billing) previously left the increase completely undeducted,
    // same gap sales.controller.js's own updateOrder had until it got the identical fix. Only
    // the DELTA is deducted (neither function has an "already deducted" flag to guard a re-run
    // of the full amount).
    await deductInventoryDeltaForOrder(existingPlain, order, user._id).catch((err) => {
      console.error(`Inventory delta deduction failed for order ${order.orderCode}:`, err.message);
    });
    await deductMaterialStockDeltaForOrder(existingPlain, order).catch((err) => {
      console.error(`Material stock delta deduction failed for order ${order.orderCode}:`, err.message);
    });
  }

  return { buckets, grandTotal, editedByKey };
}

// Applies the same floor-checked price/GST edit directly to a document's own items[] — used
// when there's no linked Order yet (an orphan Invoice/Quotation). Does not save; the caller
// still needs to mirror the edit + push its own priceEditHistory entry and save. Throws
// AppError on validation failure. Returns the recomputed subtotal/GST (unrounded).
function applyOrphanItemsPriceEdit(items, reqProducts, label404 = 'record') {
  const existingItems = (items || []).map((it) => it.toObject());
  if (reqProducts.length !== existingItems.length) {
    throw new AppError(`Product list does not match the ${label404} — cannot add or remove products here`, 400);
  }
  for (let i = 0; i < existingItems.length; i++) {
    const oldRow = existingItems[i];
    const newRow = reqProducts[i] || {};
    const oldRate = Number(oldRow.price) || 0;
    const oldGst = Number(oldRow.gst) || 0;
    const oldQty = Number(oldRow.qty) || 0;
    const newRate = Number(newRow.rate);
    const newGst = Number(newRow.gst);
    const label = oldRow.itemName || `Product ${i + 1}`;
    if (!Number.isFinite(newRate) || newRate < 0) throw new AppError(`Invalid price for "${label}"`, 400);
    if (!Number.isFinite(newGst) || newGst < 0) throw new AppError(`Invalid GST% for "${label}"`, 400);
    if (newRate < oldRate) throw new AppError(`Price for "${label}" cannot be reduced below ₹${oldRate}`, 400);
    if (newGst < oldGst) throw new AppError(`GST% for "${label}" cannot be reduced below ${oldGst}%`, 400);
    items[i].price = newRate;
    items[i].gst = newGst;

    // No linked Order to sync here (that's what makes this the orphan branch), so there's no
    // Dispatch/Operations/Tasks concern — quantity is still increase-only for consistency.
    if (newRow.qty !== undefined) {
      const newQty = Number(newRow.qty);
      if (!Number.isFinite(newQty) || newQty < 0) throw new AppError(`Invalid quantity for "${label}"`, 400);
      if (newQty < oldQty) throw new AppError(`Quantity for "${label}" cannot be reduced below ${oldQty}`, 400);
      items[i].qty = newQty;
      items[i].lineTotal = newQty * newRate;
    }
  }
  const newSubtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const newGstAmount = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0) * ((Number(it.gst) || 0) / 100), 0);
  return { newSubtotal, newGstAmount };
}

// Best-effort mirror of an edited price/gst onto a document's own items[] (print/PDF line
// items) — keyed by product identity (itemMatchKey), not by which array supplied the edit, so
// it's safe to call uniformly regardless of whether the edit landed on a linked Order or on
// the document's own items[] directly (in the latter case every key simply misses, a no-op).
function mirrorPriceOntoItems(items, editedByKey) {
  if (!Array.isArray(items)) return;
  items.forEach((item) => {
    const edit = editedByKey.get(itemMatchKey(item));
    if (!edit) return;
    item.price = edit.rate;
    item.gst = edit.gst;
  });
}

// ─── PARTIES ─────────────────────────────────────────────────────────────────
exports.getParties = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [parties, total] = await Promise.all([
    Party.find(filter).sort('name').skip((page - 1) * limit).limit(limit),
    Party.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: parties });
});

exports.createParty = asyncHandler(async (req, res) => {
  const party = await Party.create({ ...req.body, createdBy: req.user._id });

  if (req.body.openingBalance && req.body.openingBalance !== 0) {
    const isDebit = req.body.openingBalDir === 'receive';
    const lastEntry = await LedgerEntry.findOne({ partyId: party._id }).sort('-createdAt');
    const prevBal = lastEntry ? lastEntry.balance : 0;
    const balance = isDebit ? prevBal + req.body.openingBalance : prevBal - req.body.openingBalance;
    await LedgerEntry.create({
      partyId: party._id,
      type: 'Opening Balance',
      docRef: 'OB',
      debit: isDebit ? req.body.openingBalance : 0,
      credit: isDebit ? 0 : req.body.openingBalance,
      balance,
      createdBy: req.user._id,
    });
    party.runningBalance = balance;
    await party.save({ validateBeforeSave: false });
  }

  res.status(201).json({ success: true, data: party });
});

exports.updateParty = asyncHandler(async (req, res, next) => {
  const party = await Party.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!party) return next(new AppError('Party not found', 404));
  res.status(200).json({ success: true, data: party });
});

exports.deleteParty = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  party.deletedAt = Date.now();
  await party.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Party deleted' });
});

exports.getPartyLedger = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const entries = await LedgerEntry.find({ partyId: party._id }).sort('entryDate');
  const runningBalance = entries.length ? entries[entries.length - 1].balance : 0;
  res.status(200).json({ success: true, data: entries, runningBalance, party });
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────
exports.getInvoices = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.partyId) filter.partyId = req.query.partyId;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ invoiceNumber: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('partyId', 'name phone gstNumber address city state panNumber')
      .populate({
        path: 'orderId',
        select: 'orderCode orderCategory isEmergency leadId products kitOrders forwardingCharge forwardingChargeAmount items total amount gstAmount paymentCollection paidAmount advancePaid advancePaidAmount billType type clientName billingName clientPhone phone gstNumber detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType',
        populate: { path: 'leadId', select: 'leadType products kitOrders forwardingCharge forwardingChargeAmount total paymentCollection paidAmount advancePaid items hotelName billingName phone gstNumber locationCity detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType' },
      })
      .populate({
        path: 'quotationId',
        select: 'quotCode leadId products kitOrders forwardingCharge forwardingChargeAmount items total amount gstAmount advancePaid type paymentCollection paidAmount kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType',
        populate: { path: 'leadId', select: 'leadType products kitOrders forwardingCharge forwardingChargeAmount total paymentCollection paidAmount advancePaid items hotelName billingName phone gstNumber locationCity detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType' },
      })
      .sort('-invoiceDate').skip((page - 1) * limit).limit(limit),
    Invoice.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: invoices });
});

exports.getInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null }).populate('partyId').populate('orderId');
  if (!invoice) return next(new AppError('Invoice not found', 404));
  res.status(200).json({ success: true, data: invoice });
});

exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null });
  if (!invoice) return next(new AppError('Invoice not found', 404));
  invoice.deletedAt = Date.now();
  invoice.deletedBy = req.user._id;
  await invoice.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Invoice deleted' });
});

exports.createInvoice = asyncHandler(async (req, res, next) => {
  const settings = await require('../../models/CompanySettings').findOne();
  const prefix = settings?.invoicePrefix || 'INV-';
  const invCode = await generateCode(prefix.replace('-', ''));

  // Check previous balance for party
  let previousBalance = 0;
  if (req.body.partyId) {
    const lastEntry = await LedgerEntry.findOne({ partyId: req.body.partyId }).sort('-createdAt');
    previousBalance = lastEntry ? lastEntry.balance : 0;
  }

  const invoice = await Invoice.create({
    ...req.body,
    invoiceNumber: invCode,
    previousBalance,
    createdBy: req.user._id,
  });

  // Create ledger entry (debit)
  if (req.body.partyId) {
    const newBalance = previousBalance + invoice.total;
    await LedgerEntry.create({
      partyId: req.body.partyId,
      type: 'Invoice',
      docRef: invoice.invoiceNumber,
      debit: invoice.total,
      credit: 0,
      balance: newBalance,
      createdBy: req.user._id,
    });
    await Party.findByIdAndUpdate(req.body.partyId, { runningBalance: newBalance });
  }

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Invoice Created', message: `Invoice ${invoice.invoiceNumber} — ₹${invoice.total?.toLocaleString()} created`, link: '/billing' }).catch(() => {});
  res.status(201).json({ success: true, data: invoice });
});

// Full price + GST + quantity editor for an invoice (replaces the old GST-only editor). Edits
// land on the linked ORDER's products[]/kitOrders[] — the actual source of truth every total
// computation (Sales, Operations, Dispatch, Billing's own invoice list) reads from, via
// orderCalc.js's computeRecordBuckets/computeCompositionGrandTotal — and the Invoice is then
// re-derived from that SAME recompute so the two documents stay mathematically identical.
// Price/GST/quantity can only be revised UPWARD from their current value, mirroring
// sales.controller.js's existing findOrderQuantityDecreases philosophy ("once placed, values
// only increase") — quantity increases are also resynced to any already-forwarded
// DispatchRecord (see applyOrderPriceEdit) exactly like a qty-increasing Sales order edit does.
exports.updateInvoicePricing = asyncHandler(async (req, res, next) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) return next(new AppError('A reason is required to modify invoice pricing', 400));

  const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null });
  if (!invoice) return next(new AppError('Invoice not found', 404));

  const reqProducts = Array.isArray(req.body.products) ? req.body.products : [];
  const reqKitOrders = Array.isArray(req.body.kitOrders) ? req.body.kitOrders : [];
  const changedByName = req.user.fullName || req.user.name || req.user.email || 'System';

  const oldSubtotal = invoice.subtotal;
  const oldGstAmount = invoice.gstAmount;
  const oldTotal = invoice.total;
  let editedByKey = new Map();

  if (invoice.orderId) {
    const order = await Order.findOne({ _id: invoice.orderId, deletedAt: null });
    if (!order) return next(new AppError('Linked order not found', 404));
    const { buckets, grandTotal, editedByKey: eb } = await applyOrderPriceEdit(order, {
      products: reqProducts, kitOrders: reqKitOrders, kitPackagePrice: req.body.kitPackagePrice, reason, user: req.user,
    });
    editedByKey = eb;

    // Resync Invoice from the SAME buckets/grandTotal just computed for the order, rather
    // than recomputing independently — keeps the two documents mathematically identical.
    invoice.subtotal = buckets.taxable;
    invoice.gstAmount = r2(buckets.gst);
    invoice.total = grandTotal;
    invoice.balanceDue = Math.max(0, invoice.total - invoice.advanceAmount);
  } else {
    // Orphan invoice — no linked order to sync. Apply the same floor rule directly to the
    // invoice's own items[].
    const { newSubtotal, newGstAmount } = applyOrphanItemsPriceEdit(invoice.items, reqProducts, 'invoice');
    invoice.subtotal = r2(newSubtotal);
    invoice.gstAmount = r2(newGstAmount);
    invoice.total = r2(newSubtotal + newGstAmount);
    invoice.balanceDue = Math.max(0, invoice.total - invoice.advanceAmount);
  }

  mirrorPriceOntoItems(invoice.items, editedByKey);

  invoice.priceEditHistory.push({
    reason,
    oldSubtotal, newSubtotal: invoice.subtotal,
    oldGstAmount, newGstAmount: invoice.gstAmount,
    oldTotal, newTotal: invoice.total,
    changedAt: new Date(),
    changedBy: req.user._id,
    changedByName,
  });
  await invoice.save({ validateBeforeSave: false });

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Invoice Pricing Updated', message: `Invoice ${invoice.invoiceNumber} pricing revised — ${reason}`, link: '/billing' }).catch(() => {});

  res.status(200).json({ success: true, data: invoice });
});

// Same feature as updateInvoicePricing, for a Quotation still sitting in "Quotation in
// Process" (not yet converted to an Invoice). A quotation here VERY OFTEN already has a
// linked Order underneath it — getQuotationsInProcess only excludes quotations that already
// have an Invoice, not ones already converted onward to a Negotiation/Order — and once that
// conversion has happened, editing only the Quotation's own fields would be a silent no-op:
// convertQuotationToInvoice and the Negotiation/Order chain both read the Order's data, not
// the Quotation's, once an Order exists (see sales.controller.js convertToOrder). So this
// resolves the linked Order the SAME way updateQuotation/convertQuotationToInvoice already do
// — by quotationId first, falling back to leadId — before deciding which document to edit.
exports.updateQuotationPricing = asyncHandler(async (req, res, next) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) return next(new AppError('A reason is required to modify quotation pricing', 400));

  const quotation = await Quotation.findOne({ _id: req.params.id, deletedAt: null });
  if (!quotation) return next(new AppError('Quotation not found', 404));

  const reqProducts = Array.isArray(req.body.products) ? req.body.products : [];
  const reqKitOrders = Array.isArray(req.body.kitOrders) ? req.body.kitOrders : [];
  const changedByName = req.user.fullName || req.user.name || req.user.email || 'System';

  const oldSubtotal = quotation.amount;
  const oldGstAmount = quotation.gstAmount;
  const oldTotal = quotation.total;
  let editedByKey = new Map();

  const linkedOrder = await Order.findOne({
    $or: [{ quotationId: quotation._id }, ...(quotation.leadId ? [{ leadId: quotation.leadId }] : [])],
    deletedAt: null,
  }).sort('-createdAt');

  if (linkedOrder) {
    const { buckets, grandTotal, editedByKey: eb } = await applyOrderPriceEdit(linkedOrder, {
      products: reqProducts, kitOrders: reqKitOrders, kitPackagePrice: req.body.kitPackagePrice, reason, user: req.user,
    });
    editedByKey = eb;

    // Resync the Quotation's own summary fields from the SAME buckets/grandTotal, same
    // reasoning as the Invoice branch above — keeps both documents mathematically identical.
    quotation.amount = buckets.taxable;
    quotation.gstAmount = r2(buckets.gst);
    quotation.total = grandTotal;
    quotation.balance = Math.max(0, quotation.total - (Number(quotation.advancePaid) || 0));
  } else {
    // Orphan quotation — no linked order yet. Apply the same floor rule directly to the
    // quotation's own items[].
    const { newSubtotal, newGstAmount } = applyOrphanItemsPriceEdit(quotation.items, reqProducts, 'quotation');
    quotation.amount = r2(newSubtotal);
    quotation.gstAmount = r2(newGstAmount);
    quotation.total = r2(newSubtotal + newGstAmount);
    quotation.balance = Math.max(0, quotation.total - (Number(quotation.advancePaid) || 0));
  }

  mirrorPriceOntoItems(quotation.items, editedByKey);

  quotation.priceEditHistory.push({
    reason,
    oldSubtotal, newSubtotal: quotation.amount,
    oldGstAmount, newGstAmount: quotation.gstAmount,
    oldTotal, newTotal: quotation.total,
    changedAt: new Date(),
    changedBy: req.user._id,
    changedByName,
  });
  await quotation.save({ validateBeforeSave: false });

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Quotation Pricing Updated', message: `Quotation ${quotation.quotCode} pricing revised — ${reason}`, link: '/billing' }).catch(() => {});

  res.status(200).json({ success: true, data: quotation });
});

exports.convertQuotationToInvoice = asyncHandler(async (req, res, next) => {
  const { quotationId, amount, includePreviousDue } = req.body;
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) return next(new AppError('Quotation not found', 404));
  const linkedOrder = req.body.orderId
    ? await Order.findById(req.body.orderId)
    : await Order.findOne({
        $or: [
          { quotationId: quotation._id },
          ...(quotation.leadId ? [{ leadId: quotation.leadId }] : []),
        ],
        deletedAt: null,
      }).sort('-createdAt');

  const settings = await require('../../models/CompanySettings').findOne();
  const prefix = settings?.invoicePrefix || 'INV-';
  const invCode = await generateCode(prefix.replace('-', ''));

  let previousBalance = 0;
  if (includePreviousDue && quotation.leadId) {
    const lastEntry = await LedgerEntry.findOne({ partyId: req.body.partyId }).sort('-createdAt');
    previousBalance = lastEntry ? lastEntry.balance : 0;
  }

  // Recompute the kit-aware total/subtotal/gst server-side from the linked order (preferred —
  // it carries the resolved kitPrice) or the quotation itself, rather than trusting
  // quotation.total/amount/gstAmount directly: those are snapshots taken at quotation-save
  // time and can predate a kit-price edit or pricing fix made afterwards. Explicit values in
  // the request body (Billing's own kit-aware display figures) still take priority when present.
  const calcSource = linkedOrder || quotation;
  const buckets = computeRecordBuckets(calcSource);
  // When "Select Kit(s) to Include" (packagingIncludes) is used, the plain category buckets
  // above don't understand the outer-packaging nesting and undercount the total — the
  // composition-aware total is the correct one in that case (falls back to the plain buckets'
  // grand total automatically when packagingIncludes is empty).
  const kitsData = (calcSource.packagingIncludes || []).length > 0 ? await Kit.find().lean() : [];
  const compositionTotal = computeCompositionGrandTotal(calcSource, kitsData);
  const invoiceTotal = amount || (compositionTotal > 0 ? compositionTotal : quotation.total);
  const advanceFromCollection = (quotation.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
  const advanceAmount = advanceFromCollection || Number(quotation.paidAmount) || Number(quotation.advancePaid) || 0;

  // Map quotation items safely: ensure each item has the required Invoice schema fields.
  // Kit orders may store itemName in kitName; price/qty might be 0 (valid) but must not be undefined.
  const mappedItems = (quotation.items || []).map((i) => {
    const raw = i.toObject ? i.toObject() : { ...i };
    return {
      ...raw,
      itemName: raw.itemName || raw.kitName || raw.name || 'Item',
      price: Number(raw.price ?? raw.kitPrice ?? 0),
      qty: Number(raw.qty ?? raw.overallQty ?? 1),
    };
  });

  // Prefer the caller's kit-aware subtotal/gstAmount (Billing already recomputes these from
  // the order/kit composition for display) over quotation.amount/gstAmount — those are set at
  // quotation-save time from the raw product rows only and don't include kit-price buckets,
  // so they routinely under-count taxable value and GST for kit orders and drift from
  // `invoiceTotal` (e.g. amount was manually adjusted, or previous due was folded in).
  const subtotal = req.body.subtotal !== undefined ? Number(req.body.subtotal) || 0 : (buckets.taxable > 0 ? buckets.taxable : Number(quotation.amount) || 0);
  const gstAmount = req.body.gstAmount !== undefined ? Number(req.body.gstAmount) || 0 : (buckets.gst > 0 ? buckets.gst : Number(quotation.gstAmount) || 0);

  const invoice = await Invoice.create({
    invoiceNumber: invCode,
    partyId: req.body.partyId,
    orderId: req.body.orderId || linkedOrder?._id,
    quotationId: quotation._id,
    invoiceType: quotation.type || 'GST',
    subtotal,
    gstAmount,
    total: invoiceTotal,
    advanceAmount,
    balanceDue: Math.max(0, invoiceTotal - advanceAmount),
    previousBalance,
    items: mappedItems,
    createdBy: req.user._id,
  });

  // Create ledger entry (debit) — mirrors createInvoice's block above. Without this,
  // buildPartyLedger (parties.controller.js) can't find a real 'Invoice' LedgerEntry for
  // this invoice's order and falls back to a synthetic Dr computed from the Order model,
  // which ignores kit pricing and can read a stale Order.total instead of the authoritative
  // Invoice.total. Re-reads the party's actual last ledger balance here rather than reusing
  // `previousBalance` above — that variable is only populated when includePreviousDue was
  // requested (it drives the invoice's displayed "previous due" line), so it's 0 in the
  // common case and would silently break the running-balance chain.
  if (req.body.partyId) {
    const lastLedgerEntry = await LedgerEntry.findOne({ partyId: req.body.partyId }).sort('-createdAt');
    const ledgerPreviousBalance = lastLedgerEntry ? lastLedgerEntry.balance : 0;
    const newBalance = ledgerPreviousBalance + invoice.total;
    await LedgerEntry.create({
      partyId: req.body.partyId,
      type: 'Invoice',
      docRef: invoice.invoiceNumber,
      debit: invoice.total,
      credit: 0,
      balance: newBalance,
      createdBy: req.user._id,
    });
    await Party.findByIdAndUpdate(req.body.partyId, { runningBalance: newBalance });
  }

  // Sync any carried-over advance/paid status onto the linked order's tasks.
  if (invoice.orderId || linkedOrder?._id) {
    await syncOrderTasksPayment(invoice.orderId || linkedOrder._id).catch(() => {});
  }

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Invoice Converted from Quotation', message: `Invoice ${invoice.invoiceNumber} — ₹${invoice.total?.toLocaleString()} (Balance: ₹${invoice.balanceDue?.toLocaleString()})`, link: '/billing' }).catch(() => {});
  res.status(201).json({ success: true, data: invoice });
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found', 404));

  const payRef = await generateCode('REC');
  // Courier charge and round off are both extra amounts owed on top of the invoice —
  // each raises the invoice total, then is collected (credited) here too.
  const courierCharge = Number(req.body.courierCharge) || 0;
  const roundOff = Number(req.body.roundOff) || 0;
  const netAmount = (req.body.amount || 0) + courierCharge + roundOff;

  const payment = await Payment.create({
    ...req.body,
    paymentRef: payRef,
    netAmount,
    invoiceId: invoice._id,
    createdBy: req.user._id,
  });

  // Courier charge and round off both raise what's actually owed on the invoice before
  // we credit the payment against it.
  if (courierCharge) invoice.total = (invoice.total || 0) + courierCharge;
  if (roundOff) invoice.total = (invoice.total || 0) + roundOff;

  // Update invoice balance
  invoice.advanceAmount = (invoice.advanceAmount || 0) + netAmount;
  invoice.balanceDue = Math.max(0, invoice.total - invoice.advanceAmount);
  if (invoice.balanceDue === 0) invoice.status = 'Paid';
  else if (invoice.advanceAmount > 0) invoice.status = 'Partially Paid';
  await invoice.save({ validateBeforeSave: false });

  // Create ledger entry (credit)
  if (req.body.partyId || invoice.partyId) {
    const pId = req.body.partyId || invoice.partyId;
    const lastEntry = await LedgerEntry.findOne({ partyId: pId }).sort('-createdAt');
    const prevBal = lastEntry ? lastEntry.balance : 0;
    const newBalance = Math.max(0, prevBal - netAmount);
    await LedgerEntry.create({
      partyId: pId,
      type: 'Payment',
      docRef: payRef,
      debit: 0,
      credit: netAmount,
      balance: newBalance,
      createdBy: req.user._id,
    });
    await Party.findByIdAndUpdate(pId, { runningBalance: newBalance });
  }

  // Propagate the payment to the linked order — both its own paymentCollection (so
  // Sales, which computes paid/total straight off the order, shows this payment
  // immediately without relying on the frontend to find and patch the right order)
  // and its tasks' paymentStatus (Task Management + Dispatch gate on that).
  let orderId = invoice.orderId;
  if (!orderId && invoice.quotationId) {
    const linkedOrder = await Order.findOne({ quotationId: invoice.quotationId, deletedAt: null }).sort('-createdAt');
    orderId = linkedOrder?._id;
  }
  if (orderId) {
    await syncOrderPaymentCollection(orderId, {
      paymentMethod: req.body.paymentMode || 'Cash',
      paymentMode: req.body.paymentMode || 'Cash',
      paidAmount: netAmount,
      // Carried onto the order's own paymentCollection so the kit-aware total (Sales/Billing/
      // Operations) can fold this payment's courier charge into the order's grand total too.
      courierCharge,
      roundOff,
      note: req.body.note || '',
      notes: req.body.note || '',
      paymentDate: new Date().toISOString(),
      // Reuse the client-generated recordedAt (if supplied) instead of minting a new one.
      // Billing's frontend also appends this same payment onto the linked Lead's own
      // paymentCollection (for the Leads tab's courier-charge sum) using its own client-side
      // timestamp. Sales' Orders tab merges Order + Lead paymentCollection and dedupes by
      // exact recordedAt+paidAmount match — a fresh server timestamp here would never match
      // that client one, so the same payment gets counted twice (once per side).
      recordedAt: req.body.recordedAt || new Date().toISOString(),
      recordedBy: req.user._id,
      recordedByName: req.user.fullName || req.user.name || req.user.email,
      source: 'Billing Invoice',
    }).catch(() => {});
  }
  let taskPaymentStatus = null;
  if (orderId) taskPaymentStatus = await syncOrderTasksPayment(orderId).catch(() => null);

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Payment Received', message: `Payment of ₹${netAmount?.toLocaleString()} received — Invoice ${invoice.invoiceNumber} (Balance: ₹${invoice.balanceDue?.toLocaleString()})`, link: '/billing' }).catch(() => {});
  if (taskPaymentStatus === 'Paid') {
    notifyRoles({ modules: ['Task Management', 'Dispatch Team', 'Operations'], type: 'task', title: 'Payment Cleared — Dispatch Unblocked', message: `Invoice ${invoice.invoiceNumber} fully paid — linked tasks marked Paid and cleared for dispatch`, link: '/tasks' }).catch(() => {});
  }
  res.status(201).json({ success: true, data: { payment, invoice } });
});

// Audit trail of every payment recorded against an invoice (who, when, and the
// courier charge / round off breakdown for each entry).
exports.getInvoicePayments = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found', 404));
  const payments = await Payment.find({ invoiceId: req.params.id })
    .populate('createdBy', 'fullName name email')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: payments });
});

// ─── QUOTATIONS in process (for Billing tab) ───────────────────────────────
exports.getQuotationsInProcess = asyncHandler(async (req, res) => {
  // Return all non-deleted quotations regardless of status so newly created
  // (Unpaid / In Process) quotations appear immediately in the Billing tab.
  const quotations = await Quotation.find({ deletedAt: null })
    .populate('leadId', 'hotelName contactPerson phone locationCity detailedAddress address city state pincode billingName gstNumber leadType products kitOrders forwardingCharge forwardingChargeAmount paymentCollection paidAmount advancePaid total kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType items')
    .sort('-createdAt');

  // Exclude quotations already converted to a billing invoice.
  const convertedIds = await Invoice.distinct('quotationId', { quotationId: { $ne: null } });
  const convertedSet = new Set(convertedIds.map(id => String(id)));
  const active = quotations.filter(q => !convertedSet.has(String(q._id)));

  res.status(200).json({ success: true, data: active });
});
