const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
const Vendor = require('../../models/Vendor');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const upload = require('../../config/multer');
const { notifyRoles } = require('../../utils/notify');

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
  const order = await PurchaseOrder.findByIdAndUpdate(
    req.params.id,
    {
      lrNumber: req.body.lrNumber,
      trackingUrl: req.body.trackingUrl,
      ...(req.file && { lrFileUrl: req.file.path }),
      dispatchStatus: 'In Transit',
    },
    { new: true }
  );
  if (!order) return next(new AppError('Purchase order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// ─── LOCAL PURCHASE ───────────────────────────────────────────────────────────
exports.getLocalPurchases = asyncHandler(async (req, res) => {
  const localPurchases = await LocalPurchase.find().sort('-createdAt');
  res.status(200).json({ success: true, data: localPurchases });
});

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
