const PurchaseRequest = require('../../models/PurchaseRequest');
const PurchaseOrder = require('../../models/PurchaseOrder');
const LocalPurchase = require('../../models/LocalPurchase');
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
  const requests = await PurchaseRequest.find(filter)
    .populate('itemId', 'itemName unit currentStock minStock category')
    .populate('vendorId', 'name phone')
    .sort('-createdAt');
  res.status(200).json({ success: true, total: requests.length, data: requests });
});

exports.createBulkRequest = asyncHandler(async (req, res) => {
  const { vendorId, items, paymentTerms } = req.body;
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
  // Re-uploading after a Finance modification request sends it back for review
  if (request.status === 'Modification') request.status = 'Pending';
  await request.save({ validateBeforeSave: false });
  notifyRoles({ modules: ['Financial'], userIds: [request.createdBy], type: 'purchase', title: 'Quotation File Uploaded', message: `Quotation uploaded for PR ${request.requestCode} (${request.itemName}) — ready for Finance review`, link: '/purchase' }).catch(() => {});
  res.status(200).json({ success: true, data: request });
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
  const orders = await PurchaseOrder.find(filter)
    .populate('vendorId', 'name phone')
    .populate('itemId', 'itemName unit')
    .populate('requestId')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: orders });
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
  const lp = await LocalPurchase.create({ ...req.body, lpCode, createdBy: req.user._id });
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
