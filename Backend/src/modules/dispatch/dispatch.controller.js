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
const aiService = require('../../services/aiService');

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

// The Dispatch UI's Status filter shows display labels, but DispatchRecord.status only
// ever stores 'Draft' | 'Confirmed' | 'Dispatched' — translate before querying so the
// filter actually matches instead of silently returning zero results.
const STATUS_LABEL_TO_DB = { 'Ready to Dispatch': 'Confirmed', 'Packing': 'Draft', 'Dispatched': 'Dispatched' };

// Visibility scoping (same rule as Sales getLeads/Operations getOrders):
// - Admin / Super Admin / Manager / Head: all orders
// - Everyone else (Executive, etc.): only orders they created, are assigned to, or are the salesPerson on
// DispatchRecord/PickupOrder don't carry these fields themselves — they're resolved
// via their linked Order, so this returns the visible Order _ids to filter `orderId` by
// (null = unrestricted, no filtering needed).
async function visibleOrderIds(user) {
  if (!user || user.role === 'Super Admin' || user.role === 'Admin') return null;
  const role = user.role || '';
  if (/manager|head/i.test(role)) return null;
  const visibility = [{ createdBy: user._id }, { assignedTo: user._id }];
  const myName = user.fullName || user.name;
  if (myName) visibility.push({ salesPerson: myName });
  return Order.distinct('_id', { $or: visibility });
}

exports.getDispatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && STATUS_LABEL_TO_DB[req.query.status]) filter.status = STATUS_LABEL_TO_DB[req.query.status];
  const visibleIds = await visibleOrderIds(req.user);
  if (visibleIds) filter.orderId = { $in: visibleIds };
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // A dispatch's urgency lives on the populated Order, not on the DispatchRecord
  // itself, so it can't be sorted with a plain `.sort()` on this collection. Pull
  // just the id/isEmergency for every matching record (already sorted by recency),
  // then stable-sort emergency-first — this keeps recency order within each bucket —
  // and only paginate the ordered id list before running the full populate below.
  let allMatching = await DispatchRecord.find(filter)
    .select('orderId createdAt')
    .populate({ path: 'orderId', select: 'isEmergency' })
    .sort('-createdAt')
    .lean();

  // Payment status isn't stored on DispatchRecord — it's resolved live from the linked
  // order/invoices — so it can't be part of the Mongo `filter` above. Only pay the extra
  // resolve cost when this filter is actually requested.
  if (req.query.paymentStatus) {
    const withPayment = await Promise.all(allMatching.map(async (d) => ({
      d,
      paymentStatus: d.orderId?._id ? await resolveOrderPaymentStatus(d.orderId._id).catch(() => 'Pending') : 'Pending',
    })));
    allMatching = withPayment.filter((x) => x.paymentStatus === req.query.paymentStatus).map((x) => x.d);
  }

  const emergencyCount = allMatching.filter((d) => d.orderId?.isEmergency).length;
  const sortedIds = [...allMatching]
    .sort((a, b) => (b.orderId?.isEmergency ? 1 : 0) - (a.orderId?.isEmergency ? 1 : 0))
    .map((d) => String(d._id));
  const pageIds = sortedIds.slice((page - 1) * limit, (page - 1) * limit + limit);

  const dispatchesRaw = await DispatchRecord.find({ _id: { $in: pageIds } })
    .populate({
      path: 'orderId',
      select: 'orderCode clientName total orderCategory isEmergency emergencyApproved paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode shippingAddress shippingCity shippingState shippingPincode leadId assignedTo expectedDeliveryDate kitOrders items packagingIncludes',
      populate: [
        { path: 'leadId', select: 'leadType' },
        { path: 'assignedTo', select: 'fullName' },
      ],
    })
    .populate('pickupEmpId', 'fullName')
    .lean();
  // $in doesn't preserve order, so re-order the fetched page to match sortedIds.
  const byId = new Map(dispatchesRaw.map((d) => [String(d._id), d]));
  const dispatches = pageIds.map((id) => byId.get(id)).filter(Boolean);

  // Resolve each order's live payment status (invoices → order collection) so the
  // Dispatch list reflects payments recorded in Billing or Sales, not a static term.
  await Promise.all(dispatches.map(async (d) => {
    d.orderPaymentStatus = d.orderId?._id
      ? await resolveOrderPaymentStatus(d.orderId._id).catch(() => 'Pending')
      : 'Pending';
  }));
  res.status(200).json({ success: true, total: sortedIds.length, emergencyCount, page, data: dispatches });
});

// Today's dispatches — dispatch records whose linked order has expectedDeliveryDate = today.
exports.getTodaysDispatches = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  // Find all orders whose expected delivery date falls today.
  const todayFilter = { expectedDeliveryDate: { $gte: start, $lte: end } };
  const visibleIds = await visibleOrderIds(req.user);
  if (visibleIds) todayFilter._id = { $in: visibleIds };
  const todayOrderIds = await Order.find(todayFilter).distinct('_id');
  const dispatches = await DispatchRecord.find({ orderId: { $in: todayOrderIds } })
    .populate({
      path: 'orderId',
      select: 'orderCode clientName expectedDeliveryDate orderCategory isEmergency emergencyApproved paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode shippingAddress shippingCity shippingState shippingPincode leadId assignedTo kitOrders items packagingIncludes',
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
        { path: 'leadId', select: 'leadType hotelName contactPerson phone email destination detailedAddress address city state pincode shippingAddress shippingCity shippingState shippingPincode salesPerson products' },
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

  const orderDoc = dispatch.orderId && (dispatch.orderId._id ? dispatch.orderId : await Order.findById(dispatch.orderId));
  const orderItems = orderDoc?.items || [];

  const decrementStock = async (itemId, qty) => {
    if (!itemId || !qty) return;
    const invItem = await InventoryItem.findById(itemId);
    if (!invItem) return;
    const before = invItem.currentStock;
    invItem.currentStock = Math.max(0, invItem.currentStock - qty);
    await invItem.save({ validateBeforeSave: false });
    await StockMovement.create({
      itemId,
      movementType: 'OUT',
      qty,
      qtyBefore: before,
      qtyAfter: invItem.currentStock,
      referenceType: 'Order',
      referenceId: orderDoc?._id,
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      approvedAt: Date.now(),
      createdBy: req.user._id,
    });
  };

  // ─── Apply this round's dispatch counts ───────────────────────────────────
  // kitCounts/productCounts are JSON-stringified arrays of { id, dispatchNow } sent from
  // the Dispatch Verification table — id is the kitDispatch subdoc _id (kits, dispatched
  // as one unit) or the dispatch item's own _id (separate products). Every delta is
  // clamped server-side to what's actually still pending, so a stale/duplicate submit can
  // never over-dispatch or double-decrement stock.
  const parseCounts = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };
  const kitCounts = parseCounts(req.body.kitCounts);
  const productCounts = parseCounts(req.body.productCounts);

  // This round's actual movement, for the dispatch history log below — only rows with a
  // real delta (not just whatever was requested) are recorded.
  const historyKits = [];
  const historyProducts = [];

  for (const entry of kitCounts) {
    const dispatchNow = Number(entry?.dispatchNow) || 0;
    if (dispatchNow <= 0) continue;
    const kd = dispatch.kitDispatch.id(entry.id) || dispatch.kitDispatch.find((k) => String(k.kitId) === String(entry.id));
    if (!kd) continue;
    const delta = Math.max(0, Math.min(dispatchNow, kd.overallQty - kd.dispatchedQty));
    if (delta <= 0) continue;
    kd.dispatchedQty += delta;
    historyKits.push({ kitName: kd.kitName, category: kd.category, dispatchedQty: delta });
    // Every component of this kit ships proportionally — decrement each by its
    // per-kit-unit share (component's total ordered qty / kit's overall qty) × delta.
    const components = orderItems.filter((it) => it.kitId && String(it.kitId) === String(kd.kitId));
    for (const comp of components) {
      const perKitQty = kd.overallQty > 0 ? (Number(comp.qty) || 0) / kd.overallQty : 0;
      await decrementStock(comp.itemId, Math.round(perKitQty * delta * 100) / 100);
    }
  }

  for (const entry of productCounts) {
    const dispatchNow = Number(entry?.dispatchNow) || 0;
    if (dispatchNow <= 0) continue;
    const item = dispatch.items.id(entry.id);
    if (!item) continue;
    const delta = Math.max(0, Math.min(dispatchNow, (item.qtyOrdered || 0) - (item.qtyDispatched || 0)));
    if (delta <= 0) continue;
    item.qtyDispatched = (item.qtyDispatched || 0) + delta;
    historyProducts.push({ itemName: item.itemName, dispatchedQty: delta });
    await decrementStock(item.itemId, delta);
  }

  // ─── Determine completion — server-computed from actual progress, not the client's
  // say-so — so it can't be spoofed and always matches what's really been dispatched.
  const fullyDispatched = dispatch.kitDispatch.every((kd) => kd.dispatchedQty >= kd.overallQty)
    && dispatch.items.filter((it) => !it.isKit).every((it) => (it.qtyDispatched || 0) >= (it.qtyOrdered || 0));
  dispatch.dispatchType = fullyDispatched ? 'Full Dispatch' : 'Partial Dispatch';

  // Log this round in the history trail — only when something was actually dispatched
  // (an empty/no-op confirm shouldn't clutter the log).
  if (historyKits.length || historyProducts.length) {
    dispatch.dispatchHistory.push({
      date: Date.now(),
      dispatchType: dispatch.dispatchType,
      transportName: dispatch.transportName,
      weight: dispatch.weight,
      boxes: dispatch.boxes,
      kits: historyKits,
      products: historyProducts,
      confirmedByName: req.user?.fullName || req.user?.name || '',
    });
  }

  // "Partial Dispatch" is a checkpoint, not a completion: stock for whatever was entered
  // this round has already been decremented above, but the record stays open — no
  // Order/Lead status change, no dispatch notification — so the dispatcher can come back
  // and confirm the remaining items later, which is what actually finalizes the order.
  if (!fullyDispatched) {
    dispatch.partialDispatchConfirmed = true;
    dispatch.partialDispatchAt = Date.now();
    // Snapshot now, before a later Full Dispatch confirm overwrites transportName/weight/boxes.
    dispatch.partialTransportName = dispatch.transportName;
    dispatch.partialWeight = dispatch.weight;
    dispatch.partialBoxes = dispatch.boxes;
    await dispatch.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, data: dispatch, partial: true });
  }

  dispatch.dispatchedAt = Date.now();
  await dispatch.save({ validateBeforeSave: false });

  // Update order status and mark linked lead as Dispatched
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

// POST /api/dispatch/:id/scan-lr — the lorry receipt file is already on Cloudinary
// (uploaded via the LR Upload control's own customRequest), so this just runs the
// stored URL through OpenAI and returns extracted fields to prefill the LR form
// (same wiring as purchase.scanLocalPurchaseInvoice / vendors.scanDocument).
exports.scanLorryReceipt = asyncHandler(async (req, res, next) => {
  const { fileUrl, mimetype, originalName } = req.body;
  if (!fileUrl) return next(new AppError('No lorry receipt file to scan — upload one first', 400));

  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  const file = { url: fileUrl, originalName: originalName || 'lorry-receipt', mimetype };
  try {
    const extracted = await aiService.extractLorryReceiptFields({ apiKey, model: config.model, file });
    res.status(200).json({ success: true, data: extracted });
  } catch (err) {
    return next(new AppError(`AI extraction failed: ${err.message}`, err.statusCode || 502));
  }
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
// The Transport tab table previously only showed the handful of fields stored
// directly on the Transport doc itself (LR/boxes/weight/freight) — destination,
// contact, sales person, payment status, emergency, and invoice number all live on
// the linked Order/DispatchRecord and were never joined in, so those columns had
// nothing to render. Populate both links here so the frontend can show them.
exports.getTransports = asyncHandler(async (req, res) => {
  const transports = await Transport.find()
    .populate({
      path: 'orderId',
      select: 'destination detailedAddress city state pincode shippingAddress shippingCity shippingState shippingPincode contactPerson clientPhone email salesPerson assignedTo isEmergency emergencyApproved paymentTerms',
      populate: [{ path: 'assignedTo', select: 'fullName' }],
    })
    .populate({ path: 'dispatchId', select: 'invoiceNumber invoiceDate dispatchType' })
    .sort('-dispatchedAt')
    .lean();
  await Promise.all(transports.map(async (t) => {
    t.orderPaymentStatus = t.orderId?._id
      ? await resolveOrderPaymentStatus(t.orderId._id).catch(() => 'Pending')
      : 'Pending';
  }));
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
  const filter = {};
  const visibleIds = await visibleOrderIds(req.user);
  if (visibleIds) filter.orderId = { $in: visibleIds };
  const list = await PickupOrder.find(filter).populate('pickupEmpId', 'fullName phone').sort('-createdAt').lean();
  res.status(200).json({ success: true, total: list.length, data: list });
});

// "Today's Pickup Orders" — scheduledDate (Expected Delivery Date) falls today.
exports.getTodaysPickupOrders = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const filter = { scheduledDate: { $gte: start, $lte: end } };
  const visibleIds = await visibleOrderIds(req.user);
  if (visibleIds) filter.orderId = { $in: visibleIds };
  const list = await PickupOrder.find(filter)
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

// Upload open/close box photos for a single dispatch line item (field 'photos',
// body/query ?type=open|close). Capped at 5 photos per field per item — only the
// first N files that fit under the remaining slots are accepted.
exports.uploadItemBoxPhotos = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const item = dispatch.items.id(req.params.itemId);
  if (!item) return next(new AppError('Dispatch item not found', 404));
  const type = req.body.type || req.query.type;
  const field = type === 'close' ? 'closeBoxPhotos' : 'openBoxPhotos';
  const existing = item[field] || [];
  const remaining = Math.max(0, 5 - existing.length);
  const urls = (req.files || []).slice(0, remaining).map((f) => f.path);
  item[field] = [...existing, ...urls];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});

// Upload open/close box photos for a single kit (Personalized Kit / Separate Kit are
// dispatched — and photographed — as one unit, not per component). Capped at 1 photo
// per field: "one common photo is enough" for the whole kit.
exports.uploadKitBoxPhotos = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const kit = dispatch.kitDispatch.id(req.params.kitDispatchId);
  if (!kit) return next(new AppError('Kit dispatch entry not found', 404));
  const type = req.body.type || req.query.type;
  const field = type === 'close' ? 'closeBoxPhotos' : 'openBoxPhotos';
  const existing = kit[field] || [];
  const remaining = Math.max(0, 1 - existing.length);
  const urls = (req.files || []).slice(0, remaining).map((f) => f.path);
  kit[field] = [...existing, ...urls];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
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
