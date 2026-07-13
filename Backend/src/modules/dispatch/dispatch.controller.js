const DispatchRecord = require('../../models/DispatchRecord');
const Order = require('../../models/Order');
const Lead = require('../../models/Lead');
const User = require('../../models/User');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const Transport = require('../../models/Transport');
const PickupOrder = require('../../models/PickupOrder');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyMany } = require('../../utils/notify');
const { sendMessage } = require('../../services/whatsAppService');
const { resolveOrderPaymentStatus } = require('../../utils/syncOrderPayment');

// Sends the "Dispatch Notify" WhatsApp template (configured in Integrations → WhatsApp →
// Event Mapping) to both the order's sales person and the customer, with the confirmed
// dispatch's invoice file attached as a document. Silently no-ops if the event has no
// enabled template mapping yet, so an unconfigured integration never blocks dispatch confirm.
async function sendDispatchNotifyWhatsApp(orderDoc, dispatch) {
  try {
    const event = await WhatsAppEvent.findOne({ key: 'dispatch-notify' }).lean();
    if (!event) return;
    const mapping = await WhatsAppEventMapping.findOne({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();
    if (!mapping?.templateId) return;

    const { name: templateName, language = 'en' } = mapping.templateId;
    const fieldValues = {
      orderCode: orderDoc?.orderCode || dispatch.dispatchCode || '',
      customerName: orderDoc?.clientName || '',
      salesPersonName: orderDoc?.salesPerson || '',
      invoiceNumber: dispatch.invoiceNumber || '',
      companyName: process.env.COMPANY_NAME || 'HNG',
    };
    const parameters = {};
    (mapping.variables || []).forEach((v) => {
      if (v.templateVariable && v.eventField) parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
    });

    // The configured template requires a document header — without a real link the
    // WhatsApp API rejects the send with "Link to the media file is absent", so skip
    // sending entirely rather than firing a message that's guaranteed to fail.
    const documentUrl = dispatch.invoiceFileUrl || '';
    if (!documentUrl) {
      console.warn('[dispatch-notify] Skipped — no invoice document URL available to attach.');
      return;
    }
    const documentFilename = dispatch.invoiceDocumentFilename || `invoice-${dispatch.invoiceNumber || dispatch.dispatchCode}.pdf`;

    const recipients = [];
    if (orderDoc?.clientPhone) recipients.push({ label: orderDoc.clientName || 'Customer', phone: orderDoc.clientPhone });
    if (orderDoc?.salesPerson) {
      const salesUser = await User.findOne({ fullName: orderDoc.salesPerson }).select('mobile').lean();
      if (salesUser?.mobile) recipients.push({ label: orderDoc.salesPerson, phone: salesUser.mobile });
    }

    for (const r of recipients) {
      const result = await sendMessage({ to: r.phone, templateName, language, parameters, documentUrl, documentFilename });
      if (result.success) {
        console.log(`[dispatch-notify] Sent to ${r.label} (${r.phone})`);
      } else {
        console.warn(`[dispatch-notify] Failed for ${r.label} (${r.phone}): ${result.error}`);
      }
    }
  } catch (err) {
    console.error('[dispatch-notify] error:', err.message);
  }
}

exports.getDispatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [dispatches, total] = await Promise.all([
    DispatchRecord.find(filter)
      .populate({
        path: 'orderId',
        select: 'orderCode clientName total orderCategory isEmergency paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode leadId assignedTo expectedDeliveryDate kitOrders items',
        populate: [
          { path: 'leadId', select: 'leadType' },
          { path: 'assignedTo', select: 'fullName' },
        ],
      })
      .populate('pickupEmpId', 'fullName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DispatchRecord.countDocuments(filter),
  ]);
  // Resolve each order's live payment status (invoices → order collection) so the
  // Dispatch list reflects payments recorded in Billing or Sales, not a static term.
  await Promise.all(dispatches.map(async (d) => {
    d.orderPaymentStatus = d.orderId?._id
      ? await resolveOrderPaymentStatus(d.orderId._id).catch(() => 'Pending')
      : 'Pending';
  }));
  res.status(200).json({ success: true, total, page, data: dispatches });
});

// Today's dispatches — dispatch records whose linked order has expectedDeliveryDate = today.
exports.getTodaysDispatches = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  // Find all orders whose expected delivery date falls today.
  const todayOrderIds = await Order.find({
    expectedDeliveryDate: { $gte: start, $lte: end },
  }).distinct('_id');
  const dispatches = await DispatchRecord.find({ orderId: { $in: todayOrderIds } })
    .populate({
      path: 'orderId',
      select: 'orderCode clientName expectedDeliveryDate orderCategory isEmergency paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode leadId assignedTo kitOrders items',
      populate: [
        { path: 'leadId', select: 'leadType' },
        { path: 'assignedTo', select: 'fullName' },
      ],
    })
    .sort('orderId')
    .lean();
  await Promise.all(dispatches.map(async (d) => {
    d.orderPaymentStatus = d.orderId?._id
      ? await resolveOrderPaymentStatus(d.orderId._id).catch(() => 'Pending')
      : 'Pending';
  }));
  res.status(200).json({ success: true, total: dispatches.length, data: dispatches });
});

exports.getDispatch = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id)
    .populate({
      path: 'orderId',
      populate: [
        { path: 'leadId', select: 'leadType hotelName contactPerson phone email destination detailedAddress address city state pincode salesPerson products' },
        { path: 'assignedTo', select: 'fullName' },
      ],
    })
    .populate('pickupEmpId', 'fullName phone');
  if (!dispatch) return next(new AppError('Dispatch record not found', 404));
  const plain = dispatch.toObject();
  const ordObjectId = plain.orderId?._id;
  plain.orderPaymentStatus = ordObjectId
    ? await resolveOrderPaymentStatus(ordObjectId).catch(() => 'Pending')
    : 'Pending';
  res.status(200).json({ success: true, data: plain });
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
  // Single checkbox on the frontend now governs the WhatsApp dispatch notification.
  // FormData sends booleans as strings; treat 'false' (string or boolean) as disabled.
  const sendWhatsapp = req.body.sendWhatsapp !== false && req.body.sendWhatsapp !== 'false';
  dispatch.autoNotify = sendWhatsapp;
  dispatch.sendWhatsapp = sendWhatsapp;
  if (req.body.transport) dispatch.transportName = req.body.transport;
  if (req.body.weight !== undefined && req.body.weight !== '') dispatch.weight = req.body.weight;
  if (req.body.boxes !== undefined) dispatch.boxes = Number(req.body.boxes) || 0;
  // A manually-attached invoice file (upload.single('invoice')) wins if present; otherwise
  // fall back to the invoice PDF the frontend generated from Billing's invoice and uploaded
  // ahead of this request — either way this is what gets attached to the WhatsApp message.
  if (req.file) dispatch.invoiceFileUrl = req.file.path;
  else if (req.body.invoiceDocumentUrl) dispatch.invoiceFileUrl = req.body.invoiceDocumentUrl;
  // Not a schema field — only needed transiently below to name the WhatsApp attachment.
  if (req.body.invoiceDocumentFilename) dispatch.invoiceDocumentFilename = req.body.invoiceDocumentFilename;
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

  // Update order status and mark linked lead as Dispatched
  const orderDoc = dispatch.orderId && (dispatch.orderId._id ? dispatch.orderId : await Order.findById(dispatch.orderId));
  if (orderDoc) {
    const orderUpdate = { status: 'Dispatched' };
    // A dispatcher-raised forwarding charge lives in the Order (source of truth for
    // Sales/Billing), not the DispatchRecord — otherwise the edit is UI-only and
    // reverts to the original amount on reload.
    if (req.body.forwardingChargeAmount !== undefined) {
      orderUpdate.forwardingChargeAmount = Number(req.body.forwardingChargeAmount) || 0;
    }
    await Order.findByIdAndUpdate(orderDoc._id, orderUpdate);
    if (orderDoc.leadId) {
      await Lead.findByIdAndUpdate(orderDoc.leadId, { status: 'Dispatched' });
    }
  }

  // In-app notification always fires; the WhatsApp "Dispatch Notify" message (to sales
  // person + customer, with the invoice attached) only fires when the checkbox was checked.
  const msg = `Order ${orderDoc?.orderCode || dispatch.dispatchCode} for ${orderDoc?.clientName || ''} has been dispatched.`;
  await notifyMany([
    { userId: orderDoc?.assignedTo, type: 'dispatch', title: 'Order Dispatched', message: msg },
    { type: 'dispatch', title: 'Order Dispatched', message: msg },
  ]);
  if (sendWhatsapp) {
    await sendDispatchNotifyWhatsApp(orderDoc, dispatch);
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
  const urls = (req.files || []).map((f) => f.path);
  const type = req.body.type || req.query.type;
  if (type === 'close') dispatch.closeBoxPhotos = [...(dispatch.closeBoxPhotos || []), ...urls];
  else dispatch.openBoxPhotos = [...(dispatch.openBoxPhotos || []), ...urls];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});

// Store a pre-uploaded Cloudinary URL for an open/close box photo.
// Called by the frontend after it uploads the file directly to Cloudinary.
exports.addBoxPhotoUrl = asyncHandler(async (req, res, next) => {
  const { type, url } = req.body;
  if (!url) return next(new AppError('url is required', 400));
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  if (type === 'close') dispatch.closeBoxPhotos = [...(dispatch.closeBoxPhotos || []), url];
  else dispatch.openBoxPhotos = [...(dispatch.openBoxPhotos || []), url];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});

exports.saveAsDraft = asyncHandler(async (req, res, next) => {
  const existing = await DispatchRecord.findById(req.params.id);
  if (!existing) return next(new AppError('Dispatch not found', 404));
  // Never downgrade a Confirmed or Dispatched record back to Draft.
  // forwardingChargeAmount belongs to the Order (source of truth for Sales/Billing),
  // not the DispatchRecord — pull it out and save it there separately.
  const { status: _ignored, forwardingChargeAmount, ...safeBody } = req.body;
  const keepStatus = existing.status === 'Confirmed' || existing.status === 'Dispatched'
    ? existing.status
    : 'Draft';
  if (forwardingChargeAmount !== undefined && existing.orderId) {
    await Order.findByIdAndUpdate(existing.orderId, { forwardingChargeAmount: Number(forwardingChargeAmount) || 0 });
  }
  const dispatch = await DispatchRecord.findByIdAndUpdate(
    req.params.id,
    { ...safeBody, status: keepStatus },
    { new: true }
  );
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
  else if (req.body.lrFileUrl) update.lrFileUrl = req.body.lrFileUrl;
  const dispatch = await DispatchRecord.findByIdAndUpdate(req.params.id, update, { new: true }).populate('orderId', 'orderCode clientName assignedTo clientPhone');
  if (!dispatch) return next(new AppError('Dispatch not found', 404));

  // Create/refresh a Transport record for the Transport tab.
  const o = dispatch.orderId;
  await Transport.findOneAndUpdate(
    { dispatchId: dispatch._id },
    {
      dispatchId: dispatch._id, orderId: o?._id, orderCode: o?.orderCode, clientName: o?.clientName,
      transportCompany: update.transportName, lrNumber: update.lrNumber, trackingUrl: update.trackingUrl,
      fromCity: update.fromCity, toCity: update.toCity, weight: dispatch.weight || update.weight,
      boxes: dispatch.boxes || Number(update.packages) || undefined,
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
// "All Orders" — every pickup job regardless of scheduled date.
exports.getPickupOrders = asyncHandler(async (req, res) => {
  const list = await PickupOrder.find().populate('pickupEmpId', 'fullName phone').sort('-createdAt').lean();
  res.status(200).json({ success: true, total: list.length, data: list });
});

// "Today's Pickup Orders" — scheduledDate (Expected Delivery Date) falls today.
exports.getTodaysPickupOrders = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const list = await PickupOrder.find({ scheduledDate: { $gte: start, $lte: end } })
    .populate('pickupEmpId', 'fullName phone')
    .sort('-createdAt')
    .lean();
  res.status(200).json({ success: true, total: list.length, data: list });
});

exports.createPickupOrder = asyncHandler(async (req, res) => {
  const pickup = await PickupOrder.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: pickup });
});

// Handles both the "who picks up" choice (Finance settles it directly — treated as Paid
// immediately, no reimbursement needed — vs Pickup Team pays out of pocket with
// GPay/amount/proof and opens a reimbursement claim for Finance to pay back) and any
// other field update (taken status, assigned pickup person, etc).
exports.updatePickupOrder = asyncHandler(async (req, res, next) => {
  const update = { ...req.body };
  if (update.takenStatus && update.takenStatus !== 'Pending') update.taken = true;
  if (update.paymentBy === 'Finance') {
    update.paymentStatus = 'Paid';
    update.reimbursementStatus = 'Not Applicable';
  } else if (update.paymentBy === 'Pickup Team') {
    update.paymentStatus = 'Paid';
    update.reimbursementStatus = 'Pending';
  }
  const pickup = await PickupOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!pickup) return next(new AppError('Pickup order not found', 404));
  res.status(200).json({ success: true, data: pickup });
});

exports.verifyItem = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const item = dispatch.items.id(req.params.itemId);
  if (item) {
    // Defaults to true (existing verify behavior); pass verified:false to unverify.
    item.verified = req.body.verified === undefined ? true : (req.body.verified === true || req.body.verified === 'true');
    if (req.file) item.boxPhotoUrl = req.file.path;
  }
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});
