const DispatchRecord = require('../../models/DispatchRecord');
const Order = require('../../models/Order');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const Transport = require('../../models/Transport');
const PickupOrder = require('../../models/PickupOrder');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyMany } = require('../../utils/notify');

exports.getDispatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const dispatches = await DispatchRecord.find(filter)
    .populate({ path: 'orderId', select: 'orderCode clientName total orderCategory isEmergency leadId', populate: { path: 'leadId', select: 'leadType' } })
    .populate('pickupEmpId', 'fullName')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: dispatches });
});

// Today's dispatches — orders scheduled for today (by expected delivery / dispatch day), not creation date.
exports.getTodaysDispatches = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const dispatches = await DispatchRecord.find({
    $or: [
      { dispatchedAt: { $gte: start, $lte: end } },
      { updatedAt: { $gte: start, $lte: end }, status: { $in: ['Draft', 'Confirmed'] } },
    ],
  }).populate({ path: 'orderId', select: 'orderCode clientName expectedDeliveryDate orderCategory isEmergency leadId', populate: { path: 'leadId', select: 'leadType' } }).sort('-updatedAt').lean();
  res.status(200).json({ success: true, total: dispatches.length, data: dispatches });
});

exports.getDispatch = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id)
    .populate('orderId')
    .populate('pickupEmpId', 'fullName phone');
  if (!dispatch) return next(new AppError('Dispatch record not found', 404));
  res.status(200).json({ success: true, data: dispatch });
});

exports.createDispatch = asyncHandler(async (req, res) => {
  const dispatchCode = await generateCode('DISP');
  const dispatch = await DispatchRecord.create({
    ...req.body,
    dispatchCode,
    status: 'Draft',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: dispatch });
});

exports.uploadInvoice = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload invoice file', 400));
  const dispatch = await DispatchRecord.findByIdAndUpdate(
    req.params.id,
    { invoiceFileUrl: req.file.path },
    { new: true }
  );
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  res.status(200).json({ success: true, data: dispatch });
});

exports.confirmDispatch = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id).populate('orderId');
  if (!dispatch) return next(new AppError('Dispatch not found', 404));

  dispatch.status = 'Confirmed';
  dispatch.invoiceNumber = req.body.invoiceNumber;
  dispatch.invoiceDate = req.body.invoiceDate;
  dispatch.dispatchType = req.body.dispatchType;
  // FormData sends booleans as strings; treat 'false' (string or boolean) as disabled.
  dispatch.autoNotify = req.body.autoNotify !== false && req.body.autoNotify !== 'false';
  dispatch.sendWhatsapp = req.body.sendWhatsapp !== false && req.body.sendWhatsapp !== 'false';
  if (req.file) dispatch.invoiceFileUrl = req.file.path;
  dispatch.dispatchedAt = Date.now();
  await dispatch.save({ validateBeforeSave: false });

  // Decrement inventory for each dispatched item
  for (const item of dispatch.items || []) {
    if (item.itemId && item.qtyDispatched) {
      const invItem = await InventoryItem.findById(item.itemId);
      if (invItem) {
        const before = invItem.currentStock;
        invItem.currentStock = Math.max(0, invItem.currentStock - item.qtyDispatched);
        await invItem.save({ validateBeforeSave: false });
        await StockMovement.create({
          itemId: item.itemId,
          movementType: 'OUT',
          qty: item.qtyDispatched,
          qtyBefore: before,
          qtyAfter: invItem.currentStock,
          referenceType: 'Order',
          referenceId: dispatch.orderId?._id,
          approvalStatus: 'Approved',
          approvedBy: req.user._id,
          approvedAt: Date.now(),
          createdBy: req.user._id,
        });
      }
    }
  }

  // Update order status
  const orderDoc = dispatch.orderId && (dispatch.orderId._id ? dispatch.orderId : await Order.findById(dispatch.orderId));
  if (orderDoc) {
    await Order.findByIdAndUpdate(orderDoc._id, { status: 'Dispatched' });
  }

  // Notify sales person + customer (in-app + WhatsApp when enabled).
  if (dispatch.autoNotify || dispatch.sendWhatsapp) {
    const msg = `Order ${orderDoc?.orderCode || dispatch.dispatchCode} for ${orderDoc?.clientName || ''} has been dispatched.`;
    await notifyMany([
      { userId: orderDoc?.assignedTo, type: 'dispatch', title: 'Order Dispatched', message: msg, whatsapp: dispatch.sendWhatsapp, phone: orderDoc?.clientPhone },
      { type: 'dispatch', title: 'Order Dispatched', message: msg, whatsapp: dispatch.sendWhatsapp, phone: orderDoc?.clientPhone },
    ]);
  }

  res.status(200).json({ success: true, data: dispatch });
});

// AI-style invoice verification: rule-based validation of invoice details against the order.
exports.verifyInvoice = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id).populate('orderId', 'orderCode total clientName');
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const order = dispatch.orderId;
  const invoiceNumber = req.body.invoiceNumber || dispatch.invoiceNumber;
  const invoiceTotal = Number(req.body.invoiceTotal);
  const checks = [];
  checks.push({ label: 'Invoice number present', pass: !!invoiceNumber });
  checks.push({ label: 'Invoice number format (PREFIX-NNNN)', pass: /^[A-Za-z]+-?\d{3,}$/.test(invoiceNumber || '') });
  if (!Number.isNaN(invoiceTotal) && order?.total) {
    const diff = Math.abs(invoiceTotal - order.total);
    checks.push({ label: `Invoice total matches order (₹${order.total})`, pass: diff <= Math.max(1, order.total * 0.01) });
  }
  checks.push({ label: 'Linked to a confirmed order', pass: !!order });
  const passed = checks.filter((c) => c.pass).length;
  const verdict = passed === checks.length ? 'verified' : passed >= checks.length - 1 ? 'warning' : 'failed';
  res.status(200).json({ success: true, data: { verdict, score: `${passed}/${checks.length}`, checks } });
});

// Upload open/close box photos (multiple). field 'photos', query/body ?type=open|close
exports.uploadBoxPhotos = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const urls = (req.files || []).map((f) => `f.path`);
  const type = req.body.type || req.query.type;
  if (type === 'close') dispatch.closeBoxPhotos = [...(dispatch.closeBoxPhotos || []), ...urls];
  else dispatch.openBoxPhotos = [...(dispatch.openBoxPhotos || []), ...urls];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});

exports.saveAsDraft = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findByIdAndUpdate(
    req.params.id,
    { ...req.body, status: 'Draft' },
    { new: true }
  );
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  res.status(200).json({ success: true, data: dispatch });
});

exports.uploadLR = asyncHandler(async (req, res, next) => {
  const update = {
    lrNumber: req.body.lrNumber || req.body.trackingLR,
    trackingUrl: req.body.trackingUrl,
    status: 'Dispatched',
  };
  // Carry through any extra tracking details the client provides.
  ['lrDate', 'transportName', 'fromCity', 'toCity', 'weight', 'freight', 'packages', 'estimatedDelivery'].forEach((k) => {
    if (req.body[k] !== undefined && req.body[k] !== '') update[k] = req.body[k];
  });
  if (req.file) update.lrFileUrl = req.file.path;
  const dispatch = await DispatchRecord.findByIdAndUpdate(req.params.id, update, { new: true }).populate('orderId', 'orderCode clientName assignedTo clientPhone');
  if (!dispatch) return next(new AppError('Dispatch not found', 404));

  // Create/refresh a Transport record for the Transport tab.
  const o = dispatch.orderId;
  await Transport.findOneAndUpdate(
    { dispatchId: dispatch._id },
    {
      dispatchId: dispatch._id, orderId: o?._id, orderCode: o?.orderCode, clientName: o?.clientName,
      transportCompany: update.transportName, lrNumber: update.lrNumber, trackingUrl: update.trackingUrl,
      fromCity: update.fromCity, toCity: update.toCity, weight: update.weight,
      freight: Number(update.freight) || undefined, estimatedDelivery: update.estimatedDelivery,
      dispatchedAt: Date.now(), status: 'In Transit', createdBy: req.user._id,
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Finished-dispatch notification to sales + customer.
  const msg = `Order ${o?.orderCode || dispatch.dispatchCode} is on the way. LR ${update.lrNumber || ''}${update.trackingUrl ? ` — track: ${update.trackingUrl}` : ''}`;
  await notifyMany([
    { userId: o?.assignedTo, type: 'dispatch', title: 'Dispatch Finished', message: msg, whatsapp: true, phone: o?.clientPhone },
    { type: 'dispatch', title: 'Dispatch Finished', message: msg, whatsapp: true, phone: o?.clientPhone },
  ]);

  res.status(200).json({ success: true, data: dispatch });
});

// ─── TRANSPORT ────────────────────────────────────────────────────────────────
exports.getTransports = asyncHandler(async (req, res) => {
  const transports = await Transport.find().sort('-dispatchedAt').lean();
  res.status(200).json({ success: true, total: transports.length, data: transports });
});

exports.updateTransportStatus = asyncHandler(async (req, res, next) => {
  const t = await Transport.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!t) return next(new AppError('Transport record not found', 404));
  res.status(200).json({ success: true, data: t });
});

// ─── PICKUP ORDERS ──────────────────────────────────────────────────────────
exports.getPickupOrders = asyncHandler(async (req, res) => {
  const list = await PickupOrder.find().populate('pickupEmpId', 'fullName phone').sort('-createdAt').lean();
  res.status(200).json({ success: true, total: list.length, data: list });
});

exports.createPickupOrder = asyncHandler(async (req, res) => {
  const pickup = await PickupOrder.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: pickup });
});

exports.updatePickupOrder = asyncHandler(async (req, res, next) => {
  const pickup = await PickupOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!pickup) return next(new AppError('Pickup order not found', 404));
  res.status(200).json({ success: true, data: pickup });
});

exports.verifyItem = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const item = dispatch.items.id(req.params.itemId);
  if (item) {
    item.verified = true;
    if (req.file) item.boxPhotoUrl = req.file.path;
  }
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});
