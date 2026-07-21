const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const Vendor = require('../../models/Vendor');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const PickupOrder = require('../../models/PickupOrder');
const QuotationComparison = require('../../models/QuotationComparison');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const upload = require('../../config/multer');
const { notifyRoles } = require('../../utils/notify');
const aiService = require('../../services/aiService');

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
  notifyRoles({ modules: ['Purchase', 'Financial'], type: 'purchase', title: 'Purchase Request Raised', message: `PR ${request.requestCode} — ${request.itemName} (${request.qty} ${request.unit || 'units'}) needs Finance approval`, link: '/purchase' }).catch(() => {});
  res.status(201).json({ success: true, data: request });
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
  // Re-uploading after a Finance modification request, or re-requesting after a
  // rejection, sends it back to Pending for review
  if (request.status === 'Modification' || request.status === 'Rejected') request.status = 'Pending';
  await request.save({ validateBeforeSave: false });
  notifyRoles({ modules: ['Financial'], userIds: [request.createdBy], type: 'purchase', title: 'Quotation File Uploaded', message: `Quotation uploaded for PR ${request.requestCode} (${request.itemName}) — ready for Finance review`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: request });
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
  if (req.query.dispatchStatus) filter.dispatchStatus = req.query.dispatchStatus;
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
exports.receiveOrder = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError('Purchase order not found', 404));
  if (order.stockUpdated) return next(new AppError('Stock already updated for this order', 400));

  if (req.file) order.invoiceFileUrl = req.file.path;
  order.dispatchStatus = 'Received';
  order.receivedAt = Date.now();
  order.stockUpdated = true;
  await order.save({ validateBeforeSave: false });

  // Update inventory stock
  if (order.itemId && order.qty) {
    const item = await InventoryItem.findById(order.itemId);
    if (item) {
      const before = item.currentStock;
      item.currentStock += order.qty;
      await item.save({ validateBeforeSave: false });
      await StockMovement.create({
        itemId: item._id,
        movementType: 'IN',
        qty: order.qty,
        qtyBefore: before,
        qtyAfter: item.currentStock,
        referenceType: 'Purchase',
        referenceId: order._id,
        supplyPrice: order.amount / order.qty,
        approvalStatus: 'Approved',
        approvedBy: req.user._id,
        approvedAt: Date.now(),
        createdBy: req.user._id,
      });
    }
  }

  res.status(200).json({ success: true, data: order, message: 'Order received and stock updated' });
});

exports.uploadLR = asyncHandler(async (req, res, next) => {
  const { lrNumber, trackingUrl, expectedDeliveryDate, paymentStatus, proofUrl } = req.body;
  const order = await PurchaseOrder.findByIdAndUpdate(
    req.params.id,
    {
      lrNumber,
      trackingUrl,
      ...(req.file && { lrFileUrl: req.file.path }),
      ...(!req.file && proofUrl && { lrFileUrl: proofUrl }),
      ...(expectedDeliveryDate && { expectedDeliveryDate }),
      ...(paymentStatus && { lrPaymentStatus: paymentStatus }),
      dispatchStatus: 'In Transit',
    },
    { new: true }
  ).populate('vendorId', 'name');
  if (!order) return next(new AppError('Purchase order not found', 404));

  // Raise/refresh the matching Dispatch "Pick Up Order" entry — this is what makes the
  // shipment show up in Dispatch's Pick Up Order / Today's Pickup Orders / All Orders
  // tabs, keyed off this LR's expected delivery date.
  const commonFields = {
    purchaseOrderId: order._id,
    orderCode: order.poCode,
    clientName: order.vendorId?.name || '-',
    destination: order.vendorId?.name ? `${order.vendorId.name} (Vendor)` : '-',
    scheduledDate: order.expectedDeliveryDate || undefined,
    amount: order.amount,
  };
  const existingPickup = await PickupOrder.findOne({ purchaseOrderId: order._id });
  if (existingPickup) {
    Object.assign(existingPickup, commonFields);
    // Once Dispatch has picked a payer (Finance/Pickup Team) for this pickup, further LR
    // edits from Purchase must not clobber that progress back to Unpaid — only follow
    // Purchase's Paid/Not-Paid toggle here while Dispatch hasn't touched it yet.
    if (!existingPickup.paymentBy) existingPickup.paymentStatus = paymentStatus === 'Not Paid' ? 'Unpaid' : 'Paid';
    await existingPickup.save({ validateBeforeSave: false });
  } else {
    await PickupOrder.create({
      ...commonFields,
      paymentStatus: paymentStatus === 'Not Paid' ? 'Unpaid' : 'Paid',
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
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let item = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null });
      const purchaseDate = lp.createdAt || Date.now();
      const supplyPrice = (Number(it.amount) || 0) / qty;
      const batch = { vendorId: lp.vendorId || undefined, vendorName: lp.vendorName, purchaseDate, qty, remainingQty: qty };
      const qtyBefore = item ? item.currentStock : 0;

      if (item) {
        item.purchaseBatches.push(batch);
        item.currentStock = qtyBefore + qty;
        await item.save({ validateBeforeSave: false });
      } else {
        const itemCode = await generateCode('ITEM');
        item = await InventoryItem.create({
          itemCode,
          itemName: name,
          unit: it.unit || 'Pcs',
          purchasePrice: supplyPrice,
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
        supplyPrice,
        vendorId: lp.vendorId || undefined,
        vendorName: lp.vendorName,
        purchaseDate,
        approvalStatus: 'Approved',
        approvedBy: userId,
        approvedAt: Date.now(),
        createdBy: userId,
      });
    } catch (err) {
      console.error(`[local-purchase] stock sync failed for "${name}":`, err.message);
    }
  }
}

exports.createLocalPurchase = asyncHandler(async (req, res) => {
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
  const lp = await LocalPurchase.create({ ...req.body, ...(vendorId ? { vendorId } : {}), lpCode, createdBy: req.user._id });
  await addLocalPurchaseStock(lp, req.user._id);
  res.status(201).json({ success: true, data: lp });
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
    const results = [];
    for (let i = 0; i < n; i++) {
      const s = parsed.suppliers[i] || {};
      const originalIndex = fileDocs.findIndex((f) => f.url === usableFiles[i].url);
      results.push({
        fileIndex: originalIndex >= 0 ? originalIndex : i,
        name: s.name || usableFiles[i].originalName || `Quotation ${i + 1}`,
        price: Number(s.price) || 0,
        currency: s.currency || 'INR',
        delivery: s.delivery || '-',
        quality: ['Premium', 'Standard', 'Basic'].includes(s.quality) ? s.quality : 'Standard',
        terms: s.terms || '-',
        score: Math.max(0, Math.min(100, Math.round(Number(s.score)) || 0)),
        pros: Array.isArray(s.pros) ? s.pros.slice(0, 5) : [],
        cons: Array.isArray(s.cons) ? s.cons.slice(0, 5) : [],
      });
    }

    if (!results.length) throw new Error('AI did not return any usable comparison results');

    const bestIndex = Number.isInteger(parsed.bestIndex) && parsed.bestIndex >= 0 && parsed.bestIndex < n
      ? parsed.bestIndex
      : results.reduce((bestI, r, i, arr) => (r.score > arr[bestI].score ? i : bestI), 0);

    comparison.results = results;
    comparison.recommendation = { bestIndex, summary: parsed.summary || '' };
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
