const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const Vendor = require('../../models/Vendor');
const PurchasePerson = require('../../models/PurchasePerson');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const PickupOrder = require('../../models/PickupOrder');
const QuotationComparison = require('../../models/QuotationComparison');
const QuotationRequest = require('../../models/QuotationRequest');
const MaterialStock = require('../../models/MaterialStock');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const upload = require('../../config/multer');
const { notifyRoles } = require('../../utils/notify');
const aiService = require('../../services/aiService');
const { backfillPendingDeductionsForItem } = require('../sales/sales.controller');
const { normalizeSize } = require('../../utils/materialStockMatch');

// ─── PURCHASE REQUESTS ────────────────────────────────────────────────────────
exports.getRequests = asyncHandler(async (req, res) => {
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
      .populate('itemId', 'itemName unit currentStock minStock category')
      .populate('vendorId', 'name phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    PurchaseRequest.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: requests });
});

// Marks any outstanding ('asked') QuotationRequest for these items as resolved once a real
// PurchaseRequest exists — this is what stops the Quotation Request Alert from continuing
// to ring for them. Matched by itemId (+ vendorId when the raised request specifies one);
// best-effort within the caller's own flow, not wrapped separately since a failure here
// should surface the same way the rest of the raise/create call would.
async function resolveQuotationRequests(itemIds, vendorId, purchaseRequestId) {
  if (!itemIds.length) return;
  const filter = { itemId: { $in: itemIds }, status: 'asked' };
  if (vendorId) filter.vendorId = vendorId;
  await QuotationRequest.updateMany(filter, { status: 'raised', purchaseRequestId, raisedAt: new Date() });
}

exports.createBulkRequest = asyncHandler(async (req, res) => {
  const { vendorId, items, paymentTerms, firstReminderDate } = req.body;
  const batchId = 'BATCH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const created = [];
  for (const it of items) {
    const code = await generateCode('PR');
    const req_ = await PurchaseRequest.create({
      requestCode: code,
      vendorId,
      itemId: it.itemId,
      itemName: it.itemName,
      qty: it.qty,
      unit: it.unit,
      category: it.category || 'Other',
      paymentTerms,
      // Set only for payment terms other than "100% Payment" — drives the
      // "Purchase Payment Reminder" WhatsApp event (purchasePaymentReminderScheduler.js).
      ...(firstReminderDate ? { firstReminderDate } : {}),
      requestType: 'bulk',
      batchId,
      createdBy: req.user._id,
    });
    created.push(req_);
  }
  resolveQuotationRequests(items.map((it) => it.itemId).filter(Boolean), vendorId, null).catch(() => {});
  notifyRoles({ modules: ['Purchase', 'Financial'], type: 'purchase', title: 'Bulk Purchase Request', message: `${created.length} item(s) requested in batch — pending Finance approval`, link: '/purchase' }).catch(() => {});
  res.status(201).json({ success: true, data: created });
});

exports.raiseRequest = asyncHandler(async (req, res) => {
  const { items, vendorId, paymentTerms, firstReminderDate, secondReminderDate } = req.body;

  // New path: main item + any "also raise for" extra products submitted together.
  // Always assign a shared batchId — even a lone item is treated as a "batch of one" —
  // so Financial's batch-grouping/consolidated-order logic applies uniformly to both
  // the Bulk and the Separate ("Raise Request") flows with no special-casing.
  if (Array.isArray(items) && items.length) {
    const batchId = 'BATCH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const created = [];
    for (const it of items) {
      const code = await generateCode('PR');
      const doc = await PurchaseRequest.create({
        requestCode: code,
        vendorId,
        itemId: it.itemId,
        itemName: it.itemName,
        qty: it.qty,
        unit: it.unit,
        category: it.category || 'Other',
        paymentTerms,
        ...(firstReminderDate ? { firstReminderDate } : {}),
        ...(secondReminderDate ? { secondReminderDate } : {}),
        requestType: 'individual',
        batchId,
        createdBy: req.user._id,
      });
      created.push(doc);
    }
    resolveQuotationRequests(items.map((it) => it.itemId).filter(Boolean), vendorId, created[0]?._id || null).catch(() => {});
    notifyRoles({ modules: ['Purchase', 'Financial'], type: 'purchase', title: 'Purchase Request Raised', message: `${created.length} item(s) requested — pending Finance approval`, link: '/purchase' }).catch(() => {});
    return res.status(201).json({ success: true, data: created });
  }

  // Legacy flat-body path — unchanged, for any other caller.
  const code = await generateCode('PR');
  const request = await PurchaseRequest.create({
    ...req.body,
    requestCode: code,
    createdBy: req.user._id,
  });
  if (request.itemId) resolveQuotationRequests([request.itemId], request.vendorId, request._id).catch(() => {});
  notifyRoles({ modules: ['Purchase', 'Financial'], type: 'purchase', title: 'Purchase Request Raised', message: `PR ${request.requestCode} — ${request.itemName} (${request.qty} ${request.unit || 'units'}) needs Finance approval`, link: '/purchase' }).catch(() => {});
  res.status(201).json({ success: true, data: request });
});

// POST /api/purchase/quotation-requests — records that "Ask Quotation"/"Re-Ask Quotation"
// was sent to a vendor for an item, so the Quotation Request Alert (Settings → Alert
// Configuration) has a real anchor timestamp to measure its configured grace period from.
// Upserts onto any already-outstanding ('asked') record for the same item+vendor — a
// re-ask bumps reAskedAt (restarting the alert's countdown) and askCount instead of
// creating a second parallel record.
exports.recordQuotationAsk = asyncHandler(async (req, res, next) => {
  const { itemId, itemName, vendorId, vendorName } = req.body;
  if (!itemId || !itemName) return next(new AppError('itemId and itemName are required', 400));

  const existing = await QuotationRequest.findOne({ itemId, vendorId: vendorId || null, status: 'asked' });
  if (existing) {
    existing.reAskedAt = new Date();
    existing.askCount = (existing.askCount || 1) + 1;
    if (vendorName) existing.vendorName = vendorName;
    await existing.save();
    return res.status(200).json({ success: true, data: existing });
  }

  const created = await QuotationRequest.create({
    itemId, itemName, vendorId: vendorId || undefined, vendorName,
    askedAt: new Date(), createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: created });
});

exports.uploadQuotationFile = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a file', 400));
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  request.quotationFileUrl = req.file.path;
  request.quotationFiles = request.quotationFiles || [];
  request.quotationFiles.push({ url: req.file.path, uploadedAt: new Date() });
  if (req.body.amount !== undefined && req.body.amount !== '') {
    const amt = Number(req.body.amount);
    if (!Number.isNaN(amt) && amt >= 0) request.amount = amt;
  }
  // AI-verified GST amount for this quotation — set on both the initial raise and any
  // later re-submit, same optional/best-effort pattern as `amount` above.
  if (req.body.gstAmount !== undefined && req.body.gstAmount !== '') {
    const gst = Number(req.body.gstAmount);
    if (!Number.isNaN(gst) && gst >= 0) request.gstAmount = gst;
  }
  if (req.body.qty !== undefined && req.body.qty !== '') {
    const qty = Number(req.body.qty);
    if (!Number.isNaN(qty) && qty > 0) request.qty = qty;
  }
  // Re-uploading after a Finance modification request, or re-requesting after a
  // rejection, sends it back to Pending for review
  if (request.status === 'Modification' || request.status === 'Rejected') request.status = 'Pending';
  await request.save({ validateBeforeSave: false });
  // Resolves whatever QuotationRequest the "Re-Ask Quotation" action started for this
  // item+vendor while it sat in Modification — this upload is what fulfills it.
  if (request.itemId) resolveQuotationRequests([request.itemId], request.vendorId, request._id).catch(() => {});
  notifyRoles({ modules: ['Financial'], userIds: [request.createdBy], type: 'purchase', title: 'Quotation File Uploaded', message: `Quotation uploaded for PR ${request.requestCode} (${request.itemName}) — ready for Finance review`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: request });
});

// POST /api/purchase/scan-quotation — AI-scan a supplier quotation/invoice file and
// return its extracted line items, GST amount, and total amount. Standalone (no
// PurchaseRequest id) because it's used both before a request exists yet (Raise
// Request modal) and when re-submitting a revised quotation for an existing one —
// the caller matches the returned items against the item it cares about.
exports.scanQuotationFile = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload the quotation file', 400));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  const file = { url: req.file.path, originalName: req.file.originalname, mimetype: req.file.mimetype };
  try {
    const extracted = await aiService.extractInvoiceFields({ apiKey, model: config.model, file });
    res.status(200).json({ success: true, data: extracted });
  } catch (err) {
    return next(new AppError(`AI extraction failed: ${err.message}`, err.statusCode || 502));
  }
});

// Purchase edits an already-Approved request's order details (qty/unit/paymentTerms/
// amount) and resends it to Finance for re-approval — mirrors the Modification/Rejected
// resubmit-to-Pending pattern in uploadQuotationFile, but for requests Finance already
// signed off on (so the PO Finance created stays in sync once they re-approve).
exports.updateRequestDetails = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  if (request.status !== 'Approved') return next(new AppError('Only an approved request can be updated and resent for approval', 400));

  const changes = [];
  if (req.body.qty !== undefined && req.body.qty !== '' && Number(req.body.qty) !== request.qty) {
    changes.push(`Qty: ${request.qty} → ${req.body.qty}`);
    request.qty = Number(req.body.qty);
  }
  if (req.body.unit !== undefined && req.body.unit !== '' && req.body.unit !== request.unit) {
    changes.push(`Unit: ${request.unit || '-'} → ${req.body.unit}`);
    request.unit = req.body.unit;
  }
  if (req.body.paymentTerms !== undefined && req.body.paymentTerms !== '' && req.body.paymentTerms !== request.paymentTerms) {
    changes.push(`Payment Terms: ${request.paymentTerms || '-'} → ${req.body.paymentTerms}`);
    request.paymentTerms = req.body.paymentTerms;
  }
  if (req.body.amount !== undefined && req.body.amount !== '') {
    const amt = Number(req.body.amount);
    if (!Number.isNaN(amt) && amt >= 0 && amt !== request.amount) {
      changes.push(`Amount: ₹${request.amount ?? 0} → ₹${amt}`);
      request.amount = amt;
    }
  }

  if (changes.length === 0) return next(new AppError('No changes to update', 400));

  request.notes.push({ text: `Order details updated by Purchase — resent for approval (${changes.join(', ')})`, createdBy: req.user._id });
  request.status = 'Pending';
  request.approvedBy = undefined;
  request.approvedAt = undefined;
  request.financeNote = '';
  await request.save({ validateBeforeSave: false });

  notifyRoles({ modules: ['Financial'], type: 'purchase', title: 'Purchase Request Updated', message: `PR ${request.requestCode} (${request.itemName}) updated by Purchase — needs re-approval`, link: '/financial' }).catch(() => {});
  res.status(200).json({ success: true, data: request, message: 'Order details updated — sent to Finance for re-approval' });
});

exports.addNote = asyncHandler(async (req, res, next) => {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found', 404));
  request.notes.push({ text: req.body.text, createdBy: req.user._id });
  await request.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: request });
});

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────
exports.getPurchaseOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.dispatchStatus) {
    const statuses = req.query.dispatchStatus.split(',').map((s) => s.trim()).filter(Boolean);
    filter.dispatchStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate('vendorId', 'name phone')
      .populate('itemId', 'itemName unit')
      .populate('requestId')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: orders });
});

// ─── RECEIVE ORDER ────────────────────────────────────────────────────────────
// POST /api/purchase/orders/:id/scan-invoice — AI-scan a receiving invoice
// (already Cloudinary-hosted via the frontend's upload/camera-capture step) and
// match its line items against this PO's ordered items, so the Received Order
// modal can pre-fill actual-vs-ordered quantities instead of assuming full receipt.
exports.scanReceivedInvoice = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an invoice file', 400));

  const order = await PurchaseOrder.findById(req.params.id).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  const file = { url: req.file.path, originalName: req.file.originalname, mimetype: req.file.mimetype };
  let extracted;
  try {
    extracted = await aiService.extractInvoiceFields({ apiKey, model: config.model, file });
  } catch (err) {
    return next(new AppError(`AI extraction failed: ${err.message}`, err.statusCode || 502));
  }

  // Ordered lines: multi-item PO uses `items[]`, single-item PO uses the top-level fields.
  const orderedLines = (order.items && order.items.length)
    ? order.items.map((it) => ({ itemId: it.itemId, itemName: it.itemName, orderedQty: it.qty, unit: it.unit }))
    : [{ itemId: order.itemId, itemName: order.itemName, orderedQty: order.qty, unit: order.unit }];

  const norm = (s) => (s || '').toLowerCase().trim();
  const scannedItems = extracted.items || [];
  // `invoiceQty` is the raw, untouched quantity the AI read off the invoice for this line —
  // kept separate from `receivedQty` (which the frontend pre-fills from it, but the user can
  // then hand-adjust) so the ordered-vs-invoice mismatch check below stays accurate even after
  // manual edits in the modal.
  const matchedScannedItems = new Set();
  const items = orderedLines.map((line) => {
    const match = scannedItems.find((si) => norm(si.name).includes(norm(line.itemName)) || norm(line.itemName).includes(norm(si.name)));
    if (match) matchedScannedItems.add(match);
    const invoiceQty = match ? Number(match.qty) || 0 : 0;
    // GST rate as a plain number (e.g. "18%" -> 18) so the frontend can compute the
    // GST-exclusive base price without re-parsing the tag string.
    const gstPercent = match?.gst ? Number(String(match.gst).replace(/[^0-9.]/g, '')) || 0 : 0;
    return {
      itemId: line.itemId,
      itemName: line.itemName,
      orderedQty: line.orderedQty,
      receivedQty: invoiceQty,
      invoiceQty,
      unit: line.unit,
      hsn: match?.hsn || '',
      gst: match?.gst || '',
      // Per-unit purchase price read off the invoice for this line (rate, or amount/qty when
      // no rate column was printed) — pre-fills the Received Order modal's editable Purchase
      // Price column so the batch can be costed without retyping it.
      price: match ? (Number(match.rate) || 0) : 0,
      // This line's own taxable amount as printed on the invoice (qty × rate) — kept
      // separate from the document-wide `amount`/`totalAmount` below so this order's own
      // total can be computed by summing just its own matched lines when the invoice
      // also quotes other products that aren't part of this PO (see scopedToOrder below).
      amount: match ? (Number(match.amount) || 0) : 0,
      gstPercent,
      matched: !!match,
    };
  });

  // Invoice lines that don't correspond to anything on this PO at all (e.g. the vendor bundled
  // an extra product into the same delivery/invoice) were previously dropped on the floor —
  // never shown, never stocked. Surface them separately, attempting an exact-name Inventory
  // match so the frontend can show "matches existing item" vs. "needs an Item Code" the same
  // way Local Purchase's invoice-scan flow already does.
  const unmatchedScanned = scannedItems.filter((si) => !matchedScannedItems.has(si));
  const extraItems = await Promise.all(unmatchedScanned.map(async (si, idx) => {
    const name = (si.name || '').trim();
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inventoryMatch = name
      ? await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null }).select('itemCode itemName itemType currentStock unit')
      : null;
    const gstPercent = si.gst ? Number(String(si.gst).replace(/[^0-9.]/g, '')) || 0 : 0;
    return {
      key: `extra-${idx}`,
      itemName: name,
      qty: Number(si.qty) || 0,
      unit: si.unit || '',
      hsn: si.hsn || '',
      gst: si.gst || '',
      gstPercent,
      price: Number(si.rate) || 0,
      matchedItemId: inventoryMatch ? String(inventoryMatch._id) : null,
      matchedItemCode: inventoryMatch ? inventoryMatch.itemCode : null,
      matchedItemName: inventoryMatch ? inventoryMatch.itemName : null,
    };
  }));

  // Flag when the invoice's printed vendor doesn't look like the vendor this PO was raised
  // against — e.g. a mixed-up delivery — so Purchase can catch it before confirming receipt.
  const poVendorName = order.vendorId?.name;
  const scannedVendorName = extracted.vendorName;
  const vendorMismatch = !!(scannedVendorName && poVendorName
    && !norm(scannedVendorName).includes(norm(poVendorName)) && !norm(poVendorName).includes(norm(scannedVendorName)));

  // Line-level ordered-vs-invoice quantity check, per product name (the `items` match above is
  // already done by matching order-line itemName against the invoice's scanned item names).
  // `mismatchCount` is any difference either direction (short OR over); `missing*` is narrowed
  // to shortfalls only (invoice qty < ordered qty, including items the AI never found at all —
  // those are fully missing) since that's the number Purchase actually needs to act on.
  const qtyMismatchCount = items.filter((it) => !it.matched || it.orderedQty !== it.invoiceQty).length;
  const missingLines = items.filter((it) => it.invoiceQty < it.orderedQty);
  const missingItemsCount = missingLines.length;
  const missingQtyTotal = missingLines.reduce((s, it) => s + (it.orderedQty - it.invoiceQty), 0);
  const totalOrderedQty = items.reduce((s, it) => s + (it.orderedQty || 0), 0);
  const totalInvoiceQty = items.reduce((s, it) => s + (it.invoiceQty || 0), 0);

  // Whole-invoice figures as the AI read them off the document (taxable amount = grand
  // total minus GST, since the document only prints the grand total directly).
  const docTaxable = Math.max((Number(extracted.totalAmount) || 0) - (Number(extracted.gstAmount) || 0), 0);
  const docGst = Number(extracted.gstAmount) || 0;
  const docTotal = Number(extracted.totalAmount) || 0;

  // When the vendor's invoice bundles OTHER products alongside this PO's own items (the
  // `extraItems` above), the document's printed grand total covers those extra products
  // too — using it as-is would overstate what THIS order actually cost. So once every
  // matched line is verified by product name, sum only THIS order's own line amounts
  // (and their own line GST%, since GST is only ever printed as one combined breakdown at
  // the bottom, never split out per product) instead of the shared document total. A
  // single-product invoice, or one that exactly matches this PO with nothing extra, has
  // no bundled cost to strip out, so it keeps using the document total exactly as before.
  const hasExtraItems = unmatchedScanned.length > 0;
  const matchedItemsTaxable = items.reduce((s, it) => s + (it.matched ? it.amount : 0), 0);
  const matchedItemsGst = items.reduce((s, it) => s + (it.matched ? it.amount * (it.gstPercent / 100) : 0), 0);

  let scopedTaxable = docTaxable;
  let scopedGst = docGst;
  let scopedTotal = docTotal;
  let scopedCgst = Number(extracted.cgstAmount) || 0;
  let scopedSgst = Number(extracted.sgstAmount) || 0;
  let scopedIgst = Number(extracted.igstAmount) || 0;
  let scopedToOrder = false;

  if (hasExtraItems && matchedItemsTaxable > 0) {
    scopedTaxable = matchedItemsTaxable;
    scopedGst = matchedItemsGst;
    scopedTotal = matchedItemsTaxable + matchedItemsGst;
    // Split this order's own GST the same way the document itself split it — intra-state
    // (CGST+SGST) invoices divide evenly, inter-state (IGST) invoices keep it all on IGST.
    if (scopedIgst > 0 && scopedCgst <= 0 && scopedSgst <= 0) {
      scopedIgst = scopedGst;
    } else {
      scopedCgst = scopedGst / 2;
      scopedSgst = scopedGst / 2;
      scopedIgst = 0;
    }
    scopedToOrder = true;
  }

  res.status(200).json({
    success: true,
    data: {
      items,
      extraItems,
      vendorName: scannedVendorName || poVendorName,
      vendorPhone: extracted.vendorPhone,
      vendorAddress: extracted.vendorAddress,
      vendorGST: extracted.vendorGST,
      invoiceNo: extracted.invoiceNo,
      // Taxable amount (before GST) + CGST/SGST/IGST breakdown + combined GST + grand total —
      // scoped to just THIS order's own products (see scopedToOrder above) whenever the
      // invoice bundles extra products beyond this PO; otherwise identical to the document's
      // own printed figures, same as before.
      amount: scopedTaxable,
      cgstAmount: scopedCgst,
      sgstAmount: scopedSgst,
      igstAmount: scopedIgst,
      gstAmount: scopedGst,
      totalAmount: scopedTotal,
      // Kept so the frontend can show what was excluded when the invoice bundled other
      // products — the raw whole-invoice grand total, unscoped.
      scopedToOrder,
      invoiceGrandTotal: docTotal,
      vendorMismatch,
      poVendorName,
      qtyVerification: {
        totalOrderedQty, totalInvoiceQty,
        mismatchCount: qtyMismatchCount,
        missingItemsCount, missingQtyTotal,
      },
    },
  });
});

exports.receiveOrder = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));
  if (order.stockUpdated) return next(new AppError('Stock already updated for this order', 400));

  if (req.file) order.invoiceFileUrl = req.file.path;
  if (req.body.invoiceNo) order.receivedInvoiceNo = req.body.invoiceNo;
  if (req.body.vendorName) order.receivedInvoiceVendorName = req.body.vendorName;
  if (req.body.totalAmount) order.receivedInvoiceTotalAmount = Number(req.body.totalAmount) || undefined;
  if (req.body.vendorGST) order.receivedInvoiceVendorGST = req.body.vendorGST;
  if (req.body.vendorAddress) order.receivedInvoiceVendorAddress = req.body.vendorAddress;
  // Real CGST/SGST/IGST breakdown printed on the invoice (see scanInvoice above) — persisted
  // so the GST Report can use the invoice's actual tax split instead of assuming a flat 50/50
  // CGST/SGST divide with no IGST at all.
  if (req.body.cgstAmount !== undefined && req.body.cgstAmount !== '') order.receivedInvoiceCgstAmount = Number(req.body.cgstAmount) || 0;
  if (req.body.sgstAmount !== undefined && req.body.sgstAmount !== '') order.receivedInvoiceSgstAmount = Number(req.body.sgstAmount) || 0;
  if (req.body.igstAmount !== undefined && req.body.igstAmount !== '') order.receivedInvoiceIgstAmount = Number(req.body.igstAmount) || 0;
  if (req.body.gstAmount !== undefined && req.body.gstAmount !== '') order.receivedInvoiceGstAmount = Number(req.body.gstAmount) || 0;

  let lines;
  try {
    lines = req.body.items ? JSON.parse(req.body.items) : null;
  } catch {
    return next(new AppError('Invalid items payload', 400));
  }
  if (!lines || !lines.length) {
    lines = [{ itemId: order.itemId, itemName: order.itemName, orderedQty: order.qty, receivedQty: order.qty }];
  }

  let extraLines;
  try {
    extraLines = req.body.extraItems ? JSON.parse(req.body.extraItems) : [];
  } catch {
    return next(new AppError('Invalid extra items payload', 400));
  }

  // Extra invoice lines (products the vendor's invoice listed that weren't part of this PO)
  // resolve the same way Local Purchase resolves its free-text items: an explicit Item Code
  // merges into that exact Inventory item (validated up front so a typo'd code never silently
  // fails to merge instead of creating a duplicate); no code falls back to an exact
  // case-insensitive name match; no match at all creates a brand-new Inventory item so the
  // goods still "arrive" in stock instead of being silently dropped, mirroring
  // addLocalPurchaseStock above.
  if (extraLines.length) {
    const codesEntered = [...new Set(extraLines.map((li) => String(li.itemCode || '').trim().toUpperCase()).filter(Boolean))];
    if (codesEntered.length) {
      const found = await InventoryItem.find({ itemCode: { $in: codesEntered }, deletedAt: null }).select('itemCode');
      const foundCodes = new Set(found.map((f) => f.itemCode));
      const missing = codesEntered.filter((c) => !foundCodes.has(c));
      if (missing.length) return next(new AppError(`No item found with code(s): ${missing.join(', ')}`, 400));
    }

    for (const li of extraLines) {
      const name = String(li.itemName || '').trim();
      const qty = Number(li.receivedQty) || 0;
      if (!name || qty <= 0) continue;
      const codeRaw = String(li.itemCode || '').trim().toUpperCase();
      let item = codeRaw ? await InventoryItem.findOne({ itemCode: codeRaw, deletedAt: null }) : null;
      if (!item) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        item = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null });
      }
      if (!item) {
        const itemCode = await generateCode('ITEM');
        item = await InventoryItem.create({
          itemCode,
          itemName: name,
          itemType: 'standard',
          unit: aiService.normalizeUnit(li.unit) || 'Pcs',
          currentStock: 0,
          createdBy: req.user._id,
        });
      }
      lines.push({
        itemId: item._id,
        itemName: item.itemName,
        orderedQty: 0,
        receivedQty: qty,
        reason: li.reason || '',
        hsn: li.hsn || '',
        gst: li.gst || '',
        purchasePrice: li.purchasePrice,
        gstPercent: li.gstPercent,
        priceType: li.priceType,
        extra: true,
      });
    }
  }

  const missedBy = ['vendor', 'lorry'].includes(req.body.missedBy) ? req.body.missedBy : null;
  const vendorMissedAction = ['new_order', 'attach_upcoming'].includes(req.body.vendorMissedAction) ? req.body.vendorMissedAction : null;

  // Back out the taxable (GST-exclusive) unit cost regardless of how the user marked this
  // line's price — 'inclusive' means the entered purchasePrice already has GST baked in.
  const toBasePrice = (rawPrice, gstPercent, priceType) => {
    const price = Number(rawPrice) || 0;
    const gst = Number(gstPercent) || 0;
    return priceType === 'inclusive' && gst > 0 ? price / (1 + gst / 100) : price;
  };

  order.receivedItems = lines.map((li) => {
    const priceType = li.priceType === 'inclusive' ? 'inclusive' : 'exclusive';
    const gstPercent = Number(li.gstPercent) || 0;
    const purchasePrice = toBasePrice(li.purchasePrice, gstPercent, priceType);
    return {
      itemId: li.itemId || undefined,
      itemName: li.itemName,
      orderedQty: Number(li.orderedQty) || 0,
      receivedQty: Number(li.receivedQty) || 0,
      missingQty: Math.max(0, (Number(li.orderedQty) || 0) - (Number(li.receivedQty) || 0)),
      reason: li.reason || '',
      hsn: li.hsn || '',
      gst: li.gst || '',
      purchasePrice,
      gstPercent,
      priceType,
      extra: !!li.extra,
    };
  });
  const isPartial = order.receivedItems.some((li) => li.missingQty > 0);

  order.dispatchStatus = isPartial ? 'Partially Received' : 'Received';
  order.receivedAt = Date.now();
  order.stockUpdated = true;
  order.missedBy = isPartial ? missedBy : null;
  order.vendorMissedAction = isPartial ? vendorMissedAction : null;
  await order.save({ validateBeforeSave: false });

  // Credit inventory for whatever actually arrived, attributed to this vendor as its own
  // purchase batch — same FIFO batch convention used everywhere else in Inventory, so a
  // partially-short delivery doesn't get blended anonymously into currentStock.
  const vendorId = order.vendorId?._id || order.vendorId;
  const vendorName = order.vendorId?.name;
  for (const li of order.receivedItems) {
    if (!li.itemId || !li.receivedQty) continue;
    const item = await InventoryItem.findById(li.itemId);
    if (!item) continue;
    const before = item.currentStock;
    item.purchaseBatches.push({
      vendorId: vendorId || undefined,
      vendorName,
      purchaseDate: Date.now(),
      qty: li.receivedQty,
      remainingQty: li.receivedQty,
      purchasePrice: li.purchasePrice || 0,
      gstPercent: li.gstPercent || 0,
      priceType: li.priceType || 'exclusive',
    });
    item.currentStock = before + li.receivedQty;
    // Mirror the latest batch's cost/GST onto the item for list/detail display — full
    // per-vendor price history stays on purchaseBatches above.
    if (li.purchasePrice) item.purchasePrice = li.purchasePrice;
    if (li.gstPercent) item.gstPercent = li.gstPercent;
    await item.save({ validateBeforeSave: false });
    await StockMovement.create({
      itemId: item._id,
      movementType: 'IN',
      qty: li.receivedQty,
      qtyBefore: before,
      qtyAfter: item.currentStock,
      referenceType: 'Purchase',
      referenceId: order._id,
      referenceCode: order.poCode,
      vendorId: vendorId || undefined,
      vendorName,
      purchaseDate: Date.now(),
      supplyPrice: li.purchasePrice || (li.orderedQty ? order.amount / li.orderedQty : undefined),
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      approvedAt: Date.now(),
      createdBy: req.user._id,
    });
    // Pay off any orders that were placed/edited while this item was short of stock,
    // oldest first, now that fresh stock has arrived.
    backfillPendingDeductionsForItem(item._id, req.user._id).catch((err) => {
      console.error(`Backorder backfill failed for item "${item.itemName}" after PO receive:`, err.message);
    });
  }

  if (isPartial) {
    const missingSummary = order.receivedItems.filter((li) => li.missingQty > 0)
      .map((li) => `${li.itemName}: ${li.missingQty} short`).join(', ');

    if (missedBy === 'vendor' && vendorMissedAction === 'new_order') {
      notifyRoles({
        modules: ['Purchase'],
        type: 'purchase',
        title: `Missing Stock — Send Immediately (${order.poCode})`,
        message: `Order ${order.poCode} from ${vendorName || 'vendor'} is short: ${missingSummary}. Raise/send a replacement immediately.`,
        link: '/purchase',
        data: { purchaseOrderId: order._id.toString(), poCode: order.poCode },
      }).catch(() => {});
    } else if (missedBy === 'vendor' && vendorMissedAction === 'attach_upcoming') {
      notifyRoles({
        modules: ['Purchase'],
        type: 'purchase',
        title: `Missing Stock — Attach to Next Order (${order.poCode})`,
        message: `Order ${order.poCode} from ${vendorName || 'vendor'} is short: ${missingSummary}. This will be flagged on the vendor's next order.`,
        link: '/purchase',
        data: { purchaseOrderId: order._id.toString(), poCode: order.poCode },
      }).catch(() => {});
    } else if (missedBy === 'lorry') {
      // notifyRoles always includes every Admin/Super Admin regardless of `modules`.
      notifyRoles({
        modules: ['Purchase'],
        type: 'purchase',
        title: `Lorry Short-Delivery (${order.poCode})`,
        message: `Order ${order.poCode} from ${vendorName || 'vendor'} was short-delivered by the lorry/transporter: ${missingSummary}.`,
        link: '/purchase',
        data: { purchaseOrderId: order._id.toString(), poCode: order.poCode },
      }).catch(() => {});
    }
  }

  res.status(200).json({ success: true, data: order, message: isPartial ? 'Partial receipt recorded and stock updated' : 'Order received and stock updated' });
});

// PATCH /api/purchase/orders/:id/resolve-missing — mark a vendor's "attach to
// upcoming order" shortfall as checked/handled, so the info banner shown when
// opening the vendor's next order stops surfacing it.
exports.resolveMissingOrder = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findByIdAndUpdate(req.params.id, { missingResolved: true }, { new: true });
  if (!order) return next(new AppError('Purchase order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// PATCH /api/purchase/orders/:id/action-taken — persists the Missing/Short-Received
// Orders table's "Action Taken" dropdown (previously local-only React state, lost on
// every refetch). Setting it to 'Completely Received' additionally credits whatever
// quantity is still short on each line to inventory (mirrors the stock-crediting loop
// in receiveOrder above, sized to the missing qty instead of the received qty) and
// closes the order out — this is the only value with side effects; every other
// (including custom, admin-added) status is just a follow-up note with no side effects.
exports.markActionTaken = asyncHandler(async (req, res, next) => {
  const { actionTakenStatus } = req.body;
  if (!actionTakenStatus || typeof actionTakenStatus !== 'string') {
    return next(new AppError('actionTakenStatus is required', 400));
  }
  const order = await PurchaseOrder.findById(req.params.id).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));

  order.actionTakenStatus = actionTakenStatus;

  if (actionTakenStatus === 'Completely Received') {
    const vendorId = order.vendorId?._id || order.vendorId;
    const vendorName = order.vendorId?.name;
    for (const li of order.receivedItems) {
      if (!li.itemId || !li.missingQty) continue;
      const item = await InventoryItem.findById(li.itemId);
      if (!item) continue;
      const before = item.currentStock;
      const qty = li.missingQty;
      item.purchaseBatches.push({
        vendorId: vendorId || undefined,
        vendorName,
        purchaseDate: Date.now(),
        qty,
        remainingQty: qty,
        purchasePrice: li.purchasePrice || 0,
        gstPercent: li.gstPercent || 0,
        priceType: li.priceType || 'exclusive',
      });
      item.currentStock = before + qty;
      await item.save({ validateBeforeSave: false });
      await StockMovement.create({
        itemId: item._id,
        movementType: 'IN',
        qty,
        qtyBefore: before,
        qtyAfter: item.currentStock,
        referenceType: 'Purchase',
        referenceId: order._id,
        referenceCode: order.poCode,
        vendorId: vendorId || undefined,
        vendorName,
        purchaseDate: Date.now(),
        supplyPrice: li.purchasePrice || (li.orderedQty ? order.amount / li.orderedQty : undefined),
        approvalStatus: 'Approved',
        approvedBy: req.user._id,
        approvedAt: Date.now(),
        createdBy: req.user._id,
      });
      li.receivedQty = (li.receivedQty || 0) + qty;
      li.missingQty = 0;
      // Pay off any orders that were placed/edited while this item was short of stock,
      // oldest first, now that the remaining short-received qty has arrived.
      backfillPendingDeductionsForItem(item._id, req.user._id).catch((err) => {
        console.error(`Backorder backfill failed for item "${item.itemName}" after short-received completion:`, err.message);
      });
    }
    // Every line is now fully accounted for — the order no longer belongs in the
    // Missing/Short-Received table or the 'short_received' alert's pending set.
    order.dispatchStatus = 'Received';
  }

  await order.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: order });
});

// POST /api/purchase/orders/:id/scan-lr — the lorry receipt file is already on Cloudinary
// (uploaded via the LR Dragger); scan it with AI to extract LR number, transport, and the
// Bill Total Amount so Purchase doesn't have to key them in by hand.
exports.scanLR = asyncHandler(async (req, res, next) => {
  const { fileUrl, mimetype, originalName } = req.body;
  if (!fileUrl) return next(new AppError('fileUrl is required', 400));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) return next(new AppError('AI is not configured — add an API key in Settings', 400));

  let extracted;
  try {
    extracted = await aiService.extractLorryReceiptFields({
      apiKey,
      model: config.model,
      file: { url: fileUrl, mimetype: mimetype || 'application/pdf', originalName: originalName || 'lr.pdf' },
    });
  } catch (err) {
    return next(new AppError(err.message || 'AI extraction failed', err.statusCode || 502));
  }

  // Bill Total Amount is the LR's final payable total (freight + loading/unloading +
  // GST etc.), NOT the bare freight line — an LR often prints freight, other charges,
  // and GST as separate rows with the grand total at the bottom. Prefer the AI's
  // extracted total; fall back to summing the parts if it couldn't find a total row.
  const parseAmount = (v) => Number(String(v || '').replace(/[^0-9.]/g, '')) || 0;
  const billTotalAmount = parseAmount(extracted.totalAmount)
    || (parseAmount(extracted.freight) + parseAmount(extracted.otherCharges) + parseAmount(extracted.gstAmount));

  res.status(200).json({ success: true, data: { ...extracted, billTotalAmount } });
});

exports.uploadLR = asyncHandler(async (req, res, next) => {
  const { lrNumber, trackingUrl, expectedDeliveryDate, paymentStatus, proofUrl, billTotalAmount } = req.body;
  const order = await PurchaseOrder.findByIdAndUpdate(
    req.params.id,
    {
      lrNumber,
      trackingUrl,
      ...(req.file && { lrFileUrl: req.file.path }),
      ...(!req.file && proofUrl && { lrFileUrl: proofUrl }),
      ...(expectedDeliveryDate && { expectedDeliveryDate }),
      ...(paymentStatus && { lrPaymentStatus: paymentStatus }),
      // Bill Total Amount from the LR copy — this, not the vendor's goods `amount`, is
      // what's payable to the transporter (see PurchaseOrder.billTotalAmount).
      ...(billTotalAmount !== undefined && billTotalAmount !== '' && { billTotalAmount: Number(billTotalAmount) || 0 }),
      dispatchStatus: 'In Transit',
    },
    { new: true }
  ).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));

  // Purchase's Paid/Not-Paid toggle here is a manual, non-amount override — keep
  // lrPaidAmount consistent with it so Finance's later partial-payment math
  // (financial.controller.js payLrPayment) doesn't inherit a stale balance. A
  // resubmit that leaves the field on 'Partial Paid' (Finance already part-paid it
  // via that same screen) intentionally skips this and leaves lrPaidAmount as-is.
  if (paymentStatus === 'Paid' && order.lrPaidAmount !== order.billTotalAmount) {
    order.lrPaidAmount = order.billTotalAmount || 0;
    await order.save({ validateBeforeSave: false });
  } else if (paymentStatus === 'Not Paid' && order.lrPaidAmount) {
    order.lrPaidAmount = 0;
    await order.save({ validateBeforeSave: false });
  }

  // Raise/refresh the matching Dispatch "Pick Up Order" entry — this is what makes the
  // shipment show up in Dispatch's Pick Up Order / Today's Pickup Orders / All Orders
  // tabs, keyed off this LR's expected delivery date. `amount` here is the LR copy's Bill
  // Total Amount, not the vendor's goods amount — that's what the pickup person/Finance
  // actually pays out at pickup time.
  const commonFields = {
    purchaseOrderId: order._id,
    orderCode: order.poCode,
    clientName: order.vendorId?.name || '-',
    destination: order.vendorId?.name ? `${order.vendorId.name} (Vendor)` : '-',
    scheduledDate: order.expectedDeliveryDate || undefined,
    amount: order.billTotalAmount || 0,
  };
  const existingPickup = await PickupOrder.findOne({ purchaseOrderId: order._id });
  if (existingPickup) {
    Object.assign(existingPickup, commonFields);
    // Once Dispatch has picked a payer (Finance/Pickup Team) for this pickup, further LR
    // edits from Purchase must not clobber that progress back to Unpaid — only follow
    // the LR's own status here while Dispatch hasn't touched it yet. PickupOrder's
    // paymentStatus is binary, so only 'Paid' (fully settled) maps to 'Paid' — both
    // 'Not Paid' and 'Partial Paid' mean it still needs settling, i.e. 'Unpaid'.
    if (!existingPickup.paymentBy) existingPickup.paymentStatus = order.lrPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    await existingPickup.save({ validateBeforeSave: false });
  } else {
    await PickupOrder.create({
      ...commonFields,
      paymentStatus: order.lrPaymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
      createdBy: req.user._id,
    });
  }

  res.status(200).json({ success: true, data: order });
});

// ─── LOCAL PURCHASE ───────────────────────────────────────────────────────────
exports.getLocalPurchases = asyncHandler(async (req, res) => {
  const localPurchases = await LocalPurchase.find().sort('-createdAt');
  res.status(200).json({ success: true, data: localPurchases });
});

// A local purchase means goods are physically in hand right away (unlike a PurchaseOrder,
// which needs a separate "receive" step) — so stock goes into Inventory as soon as the
// record is created. Items are free-text (scanned invoice, no item picker), so each line
// is matched against Inventory by exact item name (case-insensitive); if nothing matches,
// a new Inventory item is created for it so it still "arrives" in Stock Inventory rather
// than being silently dropped. Wrapped per-item so one bad line can't block the others or
// the Local Purchase record itself from saving.
async function addLocalPurchaseStock(lp, userId) {
  for (const it of lp.items || []) {
    const name = (it.itemName || '').trim();
    const qty = Number(it.qty) || 0;
    if (!name || qty <= 0) continue;
    try {
      // Each line picks Bulk Raw Material or Direct (standard) stock — Bulk lands on
      // Inventory's Bulk tab (fillable from there like any other Bulk item), Direct lands
      // in Stock Inventory as usual.
      const itemType = it.itemType === 'bulk' ? 'bulk' : 'standard';
      // Prefer an explicit item code (validated up front in createLocalPurchase, including
      // that its type matches this line) — falls back to an exact-name match restricted to
      // the same type, so a same-named Bulk and Direct item never merge into one another.
      const codeRaw = String(it.itemCode || '').trim().toUpperCase();
      let item = codeRaw ? await InventoryItem.findOne({ itemCode: codeRaw, deletedAt: null }) : null;
      if (!item) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        item = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), itemType, deletedAt: null });
      }
      const purchaseDate = lp.invoiceDate || lp.createdAt || Date.now();
      const lineRate = (Number(it.amount) || 0) / qty;
      const gstPercent = Number(it.gstPercent) || 0;
      const priceType = it.priceType === 'inclusive' ? 'inclusive' : 'exclusive';
      // Taxable (GST-exclusive) unit cost credited to the batch — back it out of the line
      // total when the amount was entered/scanned as GST-inclusive.
      const supplyPrice = priceType === 'inclusive' && gstPercent > 0 ? lineRate / (1 + gstPercent / 100) : lineRate;
      const batch = {
        vendorId: lp.vendorId || undefined, vendorName: lp.vendorName, purchaseDate, qty, remainingQty: qty,
        purchasePrice: supplyPrice, gstPercent, priceType,
      };
      const qtyBefore = item ? item.currentStock : 0;

      if (item) {
        item.purchaseBatches.push(batch);
        item.currentStock = qtyBefore + qty;
        // Mirror the latest batch's cost/GST onto the item for list/detail display.
        if (supplyPrice) item.purchasePrice = supplyPrice;
        if (gstPercent) item.gstPercent = gstPercent;
        await item.save({ validateBeforeSave: false });
      } else {
        const itemCode = await generateCode('ITEM');
        item = await InventoryItem.create({
          itemCode,
          itemName: name,
          itemType,
          unit: aiService.normalizeUnit(it.unit) || (itemType === 'bulk' ? 'Litres' : 'Pcs'),
          purchasePrice: supplyPrice,
          gstPercent,
          currentStock: qty,
          vendorId: lp.vendorId || undefined,
          purchaseBatches: [batch],
          createdBy: userId,
        });
      }

      await StockMovement.create({
        itemId: item._id,
        movementType: 'IN',
        qty,
        qtyBefore,
        qtyAfter: item.currentStock,
        referenceType: 'Purchase',
        referenceId: lp._id,
        referenceCode: lp.lpCode,
        supplyPrice,
        vendorId: lp.vendorId || undefined,
        vendorName: lp.vendorName,
        purchaseDate,
        approvalStatus: 'Approved',
        approvedBy: userId,
        approvedAt: Date.now(),
        createdBy: userId,
      });
      // Pay off any orders that were placed/edited while this item was short of stock.
      backfillPendingDeductionsForItem(item._id, userId).catch((err) => {
        console.error(`Backorder backfill failed for item "${item.itemName}" after local purchase:`, err.message);
      });
    } catch (err) {
      console.error(`[local-purchase] stock sync failed for "${name}":`, err.message);
    }
  }
}

// Material Stocks counterpart of addLocalPurchaseStock above — used instead of it when
// lp.purchaseTarget === 'material_stock'. Items are packing materials (Box/Ziplock/Bottle/…)
// rather than InventoryItems: each line merges into an existing MaterialStock row by
// materialCode (it.itemCode, validated up front in createLocalPurchase) if given, else by
// packing-material name+size (same matching rule resolveMaterialStock uses everywhere else),
// preferring a match scoped to the line's own hotelName if one was entered — else a brand
// new MaterialStock row is created so the purchase still "arrives" rather than being dropped.
// Wrapped per-item so one bad line can't block the others or the Local Purchase record itself.
async function addLocalPurchaseMaterialStock(lp, userId) {
  for (const it of lp.items || []) {
    const name = (it.itemName || '').trim();
    const qty = Number(it.qty) || 0;
    if (!name || qty <= 0) continue;
    try {
      const codeRaw = String(it.itemCode || '').trim().toUpperCase();
      let stock = codeRaw ? await MaterialStock.findOne({ materialCode: codeRaw }) : null;

      if (!stock) {
        const size = normalizeSize(it.size);
        const hotel = String(it.hotelName || '').trim().toLowerCase();
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRe = new RegExp(`^${escaped}$`, 'i');
        const candidates = await MaterialStock.find({ packingMaterial: nameRe });
        const sameSize = candidates.filter((s) => normalizeSize(s.size) === size);
        stock = (hotel && sameSize.find((s) => String(s.hotelName || '').trim().toLowerCase() === hotel))
          || sameSize[0]
          || null;
      }

      if (stock) {
        stock.stockCount = (stock.stockCount || 0) + qty;
        await stock.save();
      } else {
        await MaterialStock.create({
          materialCode: await generateCode('MS'),
          packingMaterial: name,
          size: it.size || '',
          stockCount: qty,
          vendor: lp.vendorName || '',
          hotelName: it.hotelName || '',
          purchaseDate: lp.invoiceDate || lp.createdAt || Date.now(),
          createdBy: userId,
        });
      }
    } catch (err) {
      console.error(`[local-purchase] material stock sync failed for "${name}":`, err.message);
    }
  }
}

exports.createLocalPurchase = asyncHandler(async (req, res, next) => {
  const purchaseTarget = req.body.purchaseTarget === 'material_stock' ? 'material_stock' : 'inventory';

  // Item Code is optional per line (manual entry or typed in after an AI invoice scan) —
  // validate every code entered actually matches an existing item BEFORE the record is
  // created, so a typo never gets swallowed by addLocalPurchaseStock's per-item try/catch
  // and silently fails to merge (same "reject, don't silently duplicate/drop" rule as the
  // Inventory Add Item's mergeItemCode). Which model to validate against depends on
  // purchaseTarget — Inventory items and Material Stock codes are separate namespaces.
  const codesEntered = [...new Set((req.body.items || [])
    .map((it) => String(it.itemCode || '').trim().toUpperCase())
    .filter(Boolean))];
  if (codesEntered.length && purchaseTarget === 'material_stock') {
    const found = await MaterialStock.find({ materialCode: { $in: codesEntered } }).select('materialCode');
    const foundCodes = new Set(found.map((f) => f.materialCode));
    const missing = codesEntered.filter((c) => !foundCodes.has(c));
    if (missing.length) return next(new AppError(`No material stock found with code(s): ${missing.join(', ')}`, 400));
  } else if (codesEntered.length) {
    const found = await InventoryItem.find({ itemCode: { $in: codesEntered }, deletedAt: null }).select('itemCode itemType itemName');
    const foundByCode = new Map(found.map((f) => [f.itemCode, f]));
    const missing = codesEntered.filter((c) => !foundByCode.has(c));
    if (missing.length) return next(new AppError(`No item found with code(s): ${missing.join(', ')}`, 400));
    // Each code's item must be the same Bulk/Direct type as this line is marked — merging a
    // Bulk raw-material purchase into a Direct item's stock (or vice versa) would corrupt
    // both the Bulk tab and the fill conversion math.
    for (const it of req.body.items || []) {
      const code = String(it.itemCode || '').trim().toUpperCase();
      if (!code) continue;
      const existing = foundByCode.get(code);
      const requestedType = it.itemType === 'bulk' ? 'bulk' : 'standard';
      if (existing.itemType !== requestedType) {
        return next(new AppError(`Item code "${code}" (${existing.itemName}) is a ${existing.itemType === 'bulk' ? 'Bulk' : 'Direct'} item — set this line's stock type to match before merging`, 400));
      }
    }
  }

  // Bulk raw material must be tracked in Litres or Kg, same constraint as Inventory's Add Item.
  // Not applicable to Material Stocks lines (no Bulk/Direct concept there).
  if (purchaseTarget !== 'material_stock') {
    const badBulkUnit = (req.body.items || []).find((it) => it.itemType === 'bulk' && !['Litres', 'Kg'].includes(it.unit));
    if (badBulkUnit) return next(new AppError(`"${badBulkUnit.itemName}" is marked Bulk Raw Material — Unit must be Litres or Kg`, 400));
  }

  const lpCode = await generateCode('LP');
  let vendorId = req.body.vendorId || null;
  // Local purchases are entered by name/phone (scanned invoice, no vendor picker) — auto-link
  // to an existing Vendor by phone or exact name match so purchase history rolls up correctly,
  // same upsert-matching pattern used for Party.
  if (!vendorId && (req.body.vendorPhone || req.body.vendorName)) {
    const match = await Vendor.findOne({
      deletedAt: null,
      $or: [
        ...(req.body.vendorPhone ? [{ phone: req.body.vendorPhone }] : []),
        ...(req.body.vendorName ? [{ name: new RegExp(`^${req.body.vendorName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
      ],
    });
    if (match) vendorId = match._id;
  }

  let purchasePersonId = null;
  // Only relevant when paidBy is the Purchase Person — auto-link/create the same way as
  // Vendor above so the same person's history rolls up under one PurchasePerson record.
  if (req.body.paidBy === 'Purchase Person' && (req.body.purchasePersonName || req.body.purchasePersonPhone)) {
    const name = (req.body.purchasePersonName || '').trim();
    const phone = req.body.purchasePersonPhone || '';
    let person = await PurchasePerson.findOne({
      $or: [
        ...(phone ? [{ phone }] : []),
        ...(name ? [{ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
      ],
    });
    if (!person && name) {
      person = await PurchasePerson.create({ name, phone, gPayNumber: req.body.gPayNumber || '', createdBy: req.user._id });
    }
    if (person) purchasePersonId = person._id;
  }

  const lp = await LocalPurchase.create({
    ...req.body,
    purchaseTarget,
    ...(vendorId ? { vendorId } : {}),
    ...(purchasePersonId ? { purchasePersonId } : {}),
    lpCode,
    createdBy: req.user._id,
  });
  if (purchaseTarget === 'material_stock') {
    await addLocalPurchaseMaterialStock(lp, req.user._id);
  } else {
    await addLocalPurchaseStock(lp, req.user._id);
  }
  res.status(201).json({ success: true, data: lp });
});

// ─── PURCHASE PERSONS ─────────────────────────────────────────────────────────
// Lightweight master-data list so the "Paid By: Purchase Person" dropdown on Local
// Purchase can offer existing people and auto-fill their phone/GPay on selection.
exports.getPurchasePersons = asyncHandler(async (req, res) => {
  const purchasePersons = await PurchasePerson.find().sort('name');
  res.status(200).json({ success: true, data: purchasePersons });
});

exports.createPurchasePerson = asyncHandler(async (req, res, next) => {
  const name = (req.body.name || '').trim();
  if (!name) return next(new AppError('Purchase person name is required', 400));
  const purchasePerson = await PurchasePerson.create({
    name,
    phone: req.body.phone || '',
    gPayNumber: req.body.gPayNumber || '',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: purchasePerson });
});

// POST /api/purchase/local/scan-invoice — upload a local purchase invoice,
// run it through OpenAI, and return extracted vendor + line-item details to
// auto-fill the Add Local Purchase form (same wiring as vendors.scanDocument).
exports.scanLocalPurchaseInvoice = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an invoice file', 400));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  const file = { url: req.file.path, originalName: req.file.originalname, mimetype: req.file.mimetype };
  try {
    const extracted = await aiService.extractInvoiceFields({ apiKey, model: config.model, file });
    res.status(200).json({ success: true, data: extracted });
  } catch (err) {
    return next(new AppError(`AI extraction failed: ${err.message}`, err.statusCode || 502));
  }
});

exports.getLocalPurchase = asyncHandler(async (req, res, next) => {
  const lp = await LocalPurchase.findById(req.params.id);
  if (!lp) return next(new AppError('Local purchase not found', 404));
  res.status(200).json({ success: true, data: lp });
});

// ─── PURCHASE HISTORY ─────────────────────────────────────────────────────────
exports.getPurchaseHistory = asyncHandler(async (req, res) => {
  const [requests, orders] = await Promise.all([
    PurchaseRequest.find().populate('vendorId', 'name').populate('itemId', 'itemName').sort('-createdAt').limit(50),
    PurchaseOrder.find().populate('vendorId', 'name').populate('itemId', 'itemName').sort('-createdAt').limit(50),
  ]);
  res.status(200).json({ success: true, data: { requests, orders } });
});

// ─── AI QUOTATION COMPARISON ───────────────────────────────────────────────────
// POST /api/purchase/quotation-comparison — upload 2-5 supplier quotation files
// (PDF/image), run them through OpenAI, persist + return a ranked comparison.
exports.compareQuotations = asyncHandler(async (req, res, next) => {
  const files = req.files || [];
  if (files.length < 2) return next(new AppError('Upload at least 2 quotation files to compare', 400));
  if (files.length > 5) return next(new AppError('You can compare up to 5 quotation files at a time', 400));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  if (req.body.linkedRequestId) {
    const exists = await PurchaseRequest.findById(req.body.linkedRequestId);
    if (!exists) return next(new AppError('Linked purchase request not found', 404));
  }

  const fileDocs = files.map((f) => ({ url: f.path, originalName: f.originalname, mimetype: f.mimetype }));

  const comparison = await QuotationComparison.create({
    title: req.body.title || '',
    linkedRequestId: req.body.linkedRequestId || null,
    files: fileDocs,
    status: 'Analyzing',
    createdBy: req.user._id,
  });

  try {
    const { parsed, usableFiles, skipped } = await aiService.compareQuotationFiles({ apiKey, model: config.model, files: fileDocs });

    // Match AI response entries back to the ORIGINAL upload order positionally
    // (usableFiles[i] <-> parsed.suppliers[i]) rather than trusting the model's
    // self-reported fileIndex, which drifts as soon as any file gets skipped —
    // then resolve each to its true index in `fileDocs` via URL match so
    // `results[i].fileIndex` reliably points back into `comparison.files`.
    const n = Math.min(usableFiles.length, parsed.suppliers.length);
    // AI-facing fileIndex is positional within `usableFiles` (0..n-1) — this maps that
    // back to the true index in `fileDocs`, reused below for productComparison entries.
    const usableIdxToOriginal = usableFiles.map((f) => fileDocs.findIndex((fd) => fd.url === f.url));
    const results = [];
    for (let i = 0; i < n; i++) {
      const s = parsed.suppliers[i] || {};
      const originalIndex = usableIdxToOriginal[i] >= 0 ? usableIdxToOriginal[i] : i;
      results.push({
        fileIndex: originalIndex,
        name: s.name || usableFiles[i].originalName || `Quotation ${i + 1}`,
        price: Number(s.price) || 0,
        currency: s.currency || 'INR',
        delivery: s.delivery || '-',
        quality: ['Premium', 'Standard', 'Basic'].includes(s.quality) ? s.quality : 'Standard',
        terms: s.terms || '-',
        score: Math.max(0, Math.min(100, Math.round(Number(s.score)) || 0)),
        pros: Array.isArray(s.pros) ? s.pros.slice(0, 5) : [],
        cons: Array.isArray(s.cons) ? s.cons.slice(0, 5) : [],
        items: Array.isArray(s.items)
          ? s.items.slice(0, 40).map((it) => ({
              name: it.name || '',
              qty: Number(it.qty) || 0,
              unitPrice: Number(it.unitPrice) || 0,
              totalPrice: Number(it.totalPrice) || (Number(it.unitPrice) || 0) * (Number(it.qty) || 0),
            })).filter((it) => it.name)
          : [],
      });
    }

    if (!results.length) throw new Error('AI did not return any usable comparison results');

    const bestIndex = Number.isInteger(parsed.bestIndex) && parsed.bestIndex >= 0 && parsed.bestIndex < n
      ? parsed.bestIndex
      : results.reduce((bestI, r, i, arr) => (r.score > arr[bestI].score ? i : bestI), 0);

    // Product-wise comparison — same product matched across documents by the AI (handles
    // related/synonymous naming), best price per-product recomputed here from the entries
    // themselves rather than trusted from the model, so it can never point at a nonexistent
    // or unpriced entry.
    const nameByOriginalIndex = {};
    results.forEach((r) => { nameByOriginalIndex[r.fileIndex] = r.name; });
    const productComparison = Array.isArray(parsed.productComparison)
      ? parsed.productComparison.slice(0, 40).map((p) => {
          const entries = (Array.isArray(p.entries) ? p.entries : []).map((e) => {
            const usableIdx = Number(e.fileIndex);
            const originalIndex = Number.isInteger(usableIdx) && usableIdx >= 0 && usableIdx < usableIdxToOriginal.length
              ? usableIdxToOriginal[usableIdx]
              : -1;
            if (originalIndex < 0) return null;
            return {
              fileIndex: originalIndex,
              name: nameByOriginalIndex[originalIndex] || '',
              matchedName: e.matchedName || '',
              qty: Number(e.qty) || 0,
              unitPrice: Number(e.unitPrice) || 0,
              totalPrice: Number(e.totalPrice) || 0,
            };
          }).filter(Boolean);
          if (!entries.length) return null;
          const priced = entries.filter((e) => e.unitPrice > 0);
          const best = (priced.length ? priced : entries).reduce((a, b) => (b.unitPrice > 0 && (a.unitPrice === 0 || b.unitPrice < a.unitPrice) ? b : a));
          return {
            productName: p.productName || entries[0].matchedName || 'Unnamed product',
            aliases: Array.isArray(p.aliases) ? p.aliases.slice(0, 8).map(String) : [],
            entries,
            bestFileIndex: best.fileIndex,
            bestPrice: best.unitPrice,
            note: p.note || '',
          };
        }).filter(Boolean)
      : [];

    comparison.results = results;
    comparison.recommendation = { bestIndex, summary: parsed.summary || '' };
    comparison.productComparison = productComparison;
    comparison.status = 'Completed';
    if (skipped?.length) {
      comparison.error = `${skipped.length} file(s) skipped (unsupported type — only PDF/JPG/PNG/WEBP are analyzed): ${skipped.map((f) => f.originalName).join(', ')}`;
    }
    await comparison.save();

    // Shaped to match the existing Quotation Comparison tab's result table:
    // { best: {name, score}, suppliers: [{name, price, delivery, quality, terms, score}] }
    res.status(201).json({
      success: true,
      data: {
        id: comparison._id,
        best: { name: results[bestIndex]?.name, score: results[bestIndex]?.score },
        bestIndex,
        suppliers: results,
        productComparison,
        summary: comparison.recommendation.summary,
        warning: comparison.error || null,
      },
    });
  } catch (err) {
    comparison.status = 'Failed';
    comparison.error = err.message;
    await comparison.save();
    return next(new AppError(`AI comparison failed: ${err.message}`, err.statusCode || 502));
  }
});

// GET /api/purchase/quotation-comparison — history list
exports.getQuotationComparisons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [items, total] = await Promise.all([
    QuotationComparison.find()
      .populate('linkedRequestId', 'requestCode itemName')
      .populate('createdBy', 'fullName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    QuotationComparison.countDocuments(),
  ]);
  res.status(200).json({ success: true, total, page, data: items });
});

// GET /api/purchase/quotation-comparison/:id
exports.getQuotationComparison = asyncHandler(async (req, res, next) => {
  const item = await QuotationComparison.findById(req.params.id).populate('linkedRequestId');
  if (!item) return next(new AppError('Comparison not found', 404));
  res.status(200).json({ success: true, data: item });
});

// POST /api/purchase/quotation-comparison/:id/select — lock in the chosen quotation.
// If the comparison was started against a specific Purchase Request, that request
// is what actually gets "updated": vendor (matched by name if an existing Vendor
// record matches), amount, payment terms, and the winning quotation file are
// carried onto it, same as a normal quotation upload — so it flows straight into
// Finance's existing approval pipeline instead of being a dead-end record.
exports.selectBestQuotation = asyncHandler(async (req, res, next) => {
  const { selectedIndex } = req.body;
  const comparison = await QuotationComparison.findById(req.params.id);
  if (!comparison) return next(new AppError('Comparison not found', 404));

  const idx = Number(selectedIndex);
  const chosen = comparison.results[idx];
  if (!chosen) return next(new AppError('Invalid selection', 400));

  comparison.selectedIndex = idx;
  comparison.selectedAt = new Date();
  comparison.selectedBy = req.user._id;
  comparison.status = 'Selected';
  await comparison.save();

  let updatedRequest = null;
  if (comparison.linkedRequestId) {
    const request = await PurchaseRequest.findById(comparison.linkedRequestId);
    if (request) {
      const escaped = (chosen.name || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const vendorMatch = escaped
        ? await Vendor.findOne({ deletedAt: null, name: new RegExp(`^${escaped}$`, 'i') })
        : null;

      if (vendorMatch) request.vendorId = vendorMatch._id;
      if (chosen.price) request.amount = chosen.price;
      if (chosen.terms && chosen.terms !== '-') request.paymentTerms = chosen.terms;

      const sourceFile = comparison.files[chosen.fileIndex];
      if (sourceFile) {
        request.quotationFileUrl = sourceFile.url;
        request.quotationFiles = request.quotationFiles || [];
        request.quotationFiles.push({ url: sourceFile.url, uploadedAt: new Date() });
      }

      request.notes.push({
        text: `AI quotation comparison selected "${chosen.name}" as best (score ${chosen.score}/100)${vendorMatch ? '' : ' — vendor not matched to an existing record, please verify'}.`,
        createdBy: req.user._id,
      });
      if (request.status === 'Modification' || request.status === 'Rejected') request.status = 'Pending';
      await request.save({ validateBeforeSave: false });
      updatedRequest = request;

      notifyRoles({
        modules: ['Financial'],
        userIds: [request.createdBy],
        type: 'purchase',
        title: 'Quotation Selected via AI',
        message: `AI comparison selected "${chosen.name}" for PR ${request.requestCode} (${request.itemName})`,
        link: '/purchase',
      }).catch(() => {});
    }
  }

  res.status(200).json({
    success: true,
    message: updatedRequest ? `${chosen.name} selected — linked purchase request updated` : `${chosen.name} selected as the preferred quotation`,
    data: { comparison, updatedRequest },
  });
});
