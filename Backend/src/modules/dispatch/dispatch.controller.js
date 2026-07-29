const DispatchRecord = require('../../models/DispatchRecord');
const Order = require('../../models/Order');
const Lead = require('../../models/Lead');
const User = require('../../models/User');
const Task = require('../../models/Task');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const Transport = require('../../models/Transport');
const PickupOrder = require('../../models/PickupOrder');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyMany, notifyRoles } = require('../../utils/notify');
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

// Attaches each dispatch's order-level packing Tasks (productIndex/taskType/assignedTo)
// so the frontend can tell an assigned product/kit apart from one nobody's been
// assigned to yet (see dispatchGrouping.js `assigned` flag) — Task itself only links
// to Order, not DispatchRecord, so this has to be joined in manually per orderId.
async function attachOrderTasks(dispatches) {
  const orderIds = [...new Set(dispatches.map((d) => d.orderId?._id || d.orderId).filter(Boolean).map(String))];
  if (orderIds.length === 0) return;
  const tasks = await Task.find({ orderId: { $in: orderIds } })
    .select('orderId productIndex taskType assignedTo assignedToMany')
    .lean();
  const tasksByOrder = new Map();
  tasks.forEach((t) => {
    const key = String(t.orderId);
    if (!tasksByOrder.has(key)) tasksByOrder.set(key, []);
    tasksByOrder.get(key).push(t);
  });
  dispatches.forEach((d) => {
    const key = String(d.orderId?._id || d.orderId || '');
    d.tasks = tasksByOrder.get(key) || [];
  });
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
      select: 'orderCode clientName total orderCategory isEmergency emergencyApproved paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode shippingAddress shippingCity shippingState shippingPincode leadId assignedTo expectedDeliveryDate kitOrders items packagingIncludes splitDates kitOverallQty',
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
  await attachOrderTasks(dispatches);
  res.status(200).json({ success: true, total: sortedIds.length, emergencyCount, page, data: dispatches });
});

// Today's dispatches — dispatch records whose linked order has expectedDeliveryDate = today,
// PLUS any order actually dispatched (fully or partially, any round) today regardless of its
// tentative delivery date — e.g. tentative date is tomorrow but the team ships it today, so it
// still needs to show up here rather than only surfacing in "All Orders".
exports.getTodaysDispatches = asyncHandler(async (req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const todayRange = { $gte: start, $lte: end };
  const visibleIds = await visibleOrderIds(req.user);

  // Orders whose tentative delivery date falls today.
  const tentativeFilter = { expectedDeliveryDate: todayRange };
  if (visibleIds) tentativeFilter._id = { $in: visibleIds };
  const tentativeTodayIds = await Order.find(tentativeFilter).distinct('_id');

  // Orders with a dispatch round (full confirm, partial checkpoint, or a finished
  // dispatchHistory round) that happened today, regardless of tentative delivery date.
  const dispatchedTodayIds = await DispatchRecord.find({
    $or: [
      { dispatchedAt: todayRange },
      { partialDispatchAt: todayRange },
      { 'dispatchHistory.date': todayRange },
    ],
  }).distinct('orderId');

  const idMap = new Map();
  [...tentativeTodayIds, ...dispatchedTodayIds].forEach((id) => { if (id) idMap.set(String(id), id); });
  let todayOrderIds = [...idMap.values()];
  if (visibleIds) {
    const visibleSet = new Set(visibleIds.map(String));
    todayOrderIds = todayOrderIds.filter((id) => visibleSet.has(String(id)));
  }

  const dispatches = await DispatchRecord.find({ orderId: { $in: todayOrderIds } })
    .populate({
      path: 'orderId',
      select: 'orderCode clientName expectedDeliveryDate orderCategory isEmergency emergencyApproved paymentTerms destination product contactPerson clientPhone email detailedAddress city state pincode shippingAddress shippingCity shippingState shippingPincode leadId assignedTo kitOrders items packagingIncludes splitDates kitOverallQty',
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
  await attachOrderTasks(dispatches);
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
  await attachOrderTasks([plain]);
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
  // Guard against blanking an already-stored invoice number/date on a later round (e.g. a
  // Full Dispatch confirm that follows an earlier Partial Dispatch round) when this
  // particular request doesn't carry one.
  if (req.body.invoiceNumber) dispatch.invoiceNumber = req.body.invoiceNumber;
  if (req.body.invoiceDate) dispatch.invoiceDate = req.body.invoiceDate;
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
    // Snapshot whatever open/close photos are on file for this kit AT THIS ROUND — the
    // fields on kd itself keep accumulating across rounds, so without a snapshot here a
    // later round's history entry would have no way to show what evidence existed when
    // THIS round was confirmed.
    historyKits.push({
      kitName: kd.kitName, category: kd.category, dispatchedQty: delta,
      openBoxPhotos: [...(kd.openBoxPhotos || [])], closeBoxPhotos: [...(kd.closeBoxPhotos || [])],
    });
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
    historyProducts.push({
      itemName: item.itemName, dispatchedQty: delta,
      openBoxPhotos: [...(item.openBoxPhotos || [])], closeBoxPhotos: [...(item.closeBoxPhotos || [])],
    });
    await decrementStock(item.itemId, delta);
  }

  // Kits/products packed INSIDE a Personalized Kit's box ("Select Kit(s) to Include" on the
  // order) ship as part of that kit's single dispatch unit. A whole Separate KIT folded in
  // this way still has NO independent Dispatch Now input in the UI (dispatchGrouping.js
  // fully absorbs its components into the personalized kit's children either way) — so it
  // stays fully excluded here exactly as before, regardless of packagingIncludesQty; there's
  // no way for the dispatcher to satisfy a partial requirement for it, and requiring one
  // would strand the order permanently in Partial Dispatch. A Separate PRODUCT is different:
  // dispatchGrouping.js now (see that file) keeps its REMAINING unbundled qty as its own
  // dispatchable Separate Product row, so a product's required qty CAN correctly be reduced
  // to just that remainder instead of excluded wholesale — e.g. a Separate Product ordered
  // at 20 with only 5 packed into the kit still needs its other 15 units confirmed via their
  // own Dispatch Now count; a prior version excluded it entirely the moment it appeared
  // anywhere in packagingIncludes, so those 15 units could never be required and an order
  // could be marked "fully dispatched" without ever confirming they'd actually shipped.
  // packagingIncludesQty holds the bundled qty (product qty, keyed by name); a name present
  // in packagingIncludes but with NO packagingIncludesQty entry predates that field and is
  // treated as fully bundled (0 required), preserving prior behavior for legacy records
  // instead of retroactively demanding a dispatch count no UI was ever built to collect.
  const orderKitOrders = orderDoc?.kitOrders || [];
  const personalizedKitOrder = orderKitOrders.find((ko) => (ko?.category || 'separate_kit') === 'personalized');
  const piRaw = orderDoc?.packagingIncludes || [];
  const includedIds = new Set(
    (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null)
      ? piRaw.map((p) => String(p.id))
      : piRaw.map((id) => String(id))
  );
  const piQty = orderDoc?.packagingIncludesQty || {};
  const bundledQtyForItemName = (name, fullQty) => {
    if (!includedIds.has(String(name))) return 0;
    const explicit = piQty[name];
    return explicit != null ? Number(explicit) || 0 : fullQty;
  };
  const includedKitIds = new Set();
  if (personalizedKitOrder && includedIds.size > 0) {
    orderKitOrders.forEach((ko) => {
      if (!ko || ko === personalizedKitOrder) return;
      if ((ko.category || 'separate_kit') === 'personalized') return;
      if (ko.kitId && includedIds.has(String(ko.kitId))) includedKitIds.add(String(ko.kitId));
    });
  }

  // ─── Determine completion — server-computed from actual progress, not the client's
  // say-so — so it can't be spoofed and always matches what's really been dispatched.
  const fullyDispatched = dispatch.kitDispatch
    .filter((kd) => !includedKitIds.has(String(kd.kitId)))
    .every((kd) => kd.dispatchedQty >= kd.overallQty)
    && dispatch.items
      .filter((it) => !it.isKit)
      .every((it) => {
        const bundled = personalizedKitOrder ? bundledQtyForItemName(it.itemName, it.qtyOrdered) : 0;
        const required = Math.max(0, (it.qtyOrdered || 0) - bundled);
        return (it.qtyDispatched || 0) >= required;
      });
  dispatch.dispatchType = fullyDispatched ? 'Full Dispatch' : 'Partial Dispatch';
  // A fresh round (partial or full) just got confirmed — it hasn't had its own
  // "Finished Dispatch" LR/notify step yet, even if a PREVIOUS round already did.
  dispatch.lastRoundFinished = false;

  // Log this round in the history trail — only when something was actually dispatched
  // (an empty/no-op confirm shouldn't clutter the log).
  const dispatchedSomethingThisRound = historyKits.length || historyProducts.length;
  if (dispatchedSomethingThisRound) {
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

  // Give THIS round its own Transport row the moment it's confirmed — not only when
  // "Finished Dispatch" (uploadLR) is later clicked for it. A dispatcher can confirm
  // several rounds back-to-back (Partial, Partial, Full) without ever clicking "Finished
  // Dispatch" in between each one — the Confirm button isn't gated on the previous
  // round being finished — so relying solely on uploadLR to create the Transport doc
  // meant only whichever round eventually got "Finished Dispatch" clicked ever got a row;
  // every earlier round's shipment silently never appeared in the Transport tab. Keyed on
  // (dispatchId, roundIndex) — same key uploadLR uses — so uploadLR later just adds
  // LR/tracking details on top of this row instead of creating a duplicate.
  if (dispatchedSomethingThisRound) {
    const roundIndex = dispatch.dispatchHistory.length - 1;
    await Transport.findOneAndUpdate(
      { dispatchId: dispatch._id, roundIndex },
      {
        dispatchId: dispatch._id, roundIndex, orderId: orderDoc?._id, orderCode: orderDoc?.orderCode,
        clientName: orderDoc?.clientName, transportCompany: dispatch.transportName,
        weight: dispatch.weight, boxes: dispatch.boxes,
        dispatchedAt: Date.now(), status: 'In Transit', createdBy: req.user._id,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
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
  const dispatch = await DispatchRecord.findById(req.params.id).populate('orderId', 'orderCode clientName assignedTo clientPhone');
  if (!dispatch) return next(new AppError('Dispatch not found', 404));

  // A full confirm round (dispatchedAt set in confirmDispatch) makes THIS finish the
  // real "Fully Finished" close-out; otherwise it's finishing a Partial Dispatch round
  // that still leaves items pending for a later round.
  const finishedType = dispatch.dispatchedAt ? 'Fully Finished' : 'Partial Finished';

  dispatch.lrNumber = req.body.lrNumber || req.body.trackingLR;
  dispatch.trackingUrl = req.body.trackingUrl;
  // Only the real Full Dispatch close-out should flip the record to 'Dispatched' —
  // finishing a Partial round keeps it 'Confirmed' since items are still pending.
  if (finishedType === 'Fully Finished') dispatch.status = 'Dispatched';
  // Carry through any extra tracking details the client provides.
  ['lrDate', 'transportName', 'fromCity', 'toCity', 'weight', 'freight', 'packages', 'estimatedDelivery'].forEach((k) => {
    if (req.body[k] !== undefined && req.body[k] !== '') dispatch[k] = req.body[k];
  });
  if (req.file) dispatch.lrFileUrl = req.file.path;
  else if (req.body.lrFileUrl) dispatch.lrFileUrl = req.body.lrFileUrl;
  dispatch.lastRoundFinished = true;

  // Stamp the most recent dispatchHistory entry (this round's confirm) with the LR/notify
  // details, so the history trail shows exactly which round was Partial vs Fully Finished.
  const latestRound = dispatch.dispatchHistory[dispatch.dispatchHistory.length - 1];
  if (latestRound) {
    latestRound.finishedType = finishedType;
    latestRound.finishedAt = Date.now();
    latestRound.lrNumber = dispatch.lrNumber;
    latestRound.trackingUrl = dispatch.trackingUrl;
    latestRound.lrFileUrl = dispatch.lrFileUrl;
  }

  await dispatch.save({ validateBeforeSave: false });

  // Create/refresh a Transport record for the Transport tab — keyed on (dispatchId,
  // roundIndex) rather than dispatchId alone, so an order shipped across several rounds
  // (Partial Dispatch finished, then later Full Dispatch finished) gets its OWN Transport
  // row per round instead of the later round's LR/transport details silently overwriting
  // the earlier round's row (same dispatchId, single upsert target). roundIndex mirrors
  // the dispatchHistory entry this round just stamped above.
  const o = dispatch.orderId;
  const roundIndex = Math.max(0, dispatch.dispatchHistory.length - 1);
  await Transport.findOneAndUpdate(
    { dispatchId: dispatch._id, roundIndex },
    {
      dispatchId: dispatch._id, roundIndex, orderId: o?._id, orderCode: o?.orderCode, clientName: o?.clientName,
      transportCompany: dispatch.transportName, lrNumber: dispatch.lrNumber, trackingUrl: dispatch.trackingUrl,
      fromCity: dispatch.fromCity, toCity: dispatch.toCity, weight: dispatch.weight,
      boxes: dispatch.boxes || Number(dispatch.packages) || undefined,
      freight: Number(dispatch.freight) || undefined, estimatedDelivery: dispatch.estimatedDelivery,
      dispatchedAt: Date.now(), status: 'In Transit', createdBy: req.user._id,
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Finished-dispatch notification to sales + customer — wording reflects whether this
  // shipment closes out the whole order or is one of several partial rounds.
  const title = finishedType === 'Fully Finished' ? 'Dispatch Finished' : 'Partial Shipment Dispatched';
  const msg = `Order ${o?.orderCode || dispatch.dispatchCode} ${finishedType === 'Fully Finished' ? 'is on the way' : 'has a partial shipment on the way'}. LR ${dispatch.lrNumber || ''}${dispatch.trackingUrl ? ` — track: ${dispatch.trackingUrl}` : ''}`;
  await notifyMany([
    { userId: o?.assignedTo, type: 'dispatch', title, message: msg, whatsapp: true, phone: o?.clientPhone },
    { type: 'dispatch', title, message: msg, whatsapp: true, phone: o?.clientPhone },
  ]);

  res.status(200).json({ success: true, data: dispatch, finishedType });
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
  const existing = await PickupOrder.findById(req.params.id);
  if (!existing) return next(new AppError('Pickup order not found', 404));

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

  // Vendor shipment just dropped off — nudge Purchase to go verify/receive it.
  if (
    update.takenStatus === 'Pickup Dropped' &&
    existing.takenStatus !== 'Pickup Dropped' &&
    pickup.purchaseOrderId
  ) {
    notifyRoles({
      modules: ['Purchase'],
      type: 'purchase',
      title: 'Shipment Dropped — Ready to Receive',
      message: `Pickup order ${pickup.orderCode || pickup._id} has been dropped off — verify and mark as received in Dispatch Order Tracking.`,
      link: '/purchase',
      data: { pickupOrderId: pickup._id.toString(), purchaseOrderId: pickup.purchaseOrderId.toString() },
    }).catch(() => {});
  }

  res.status(200).json({ success: true, data: pickup });
});

// Upload open/close box photos for a single dispatch line item (field 'photos',
// body/query ?type=open|close). Capped at 20 photos per field per item — same
// generous ceiling as the order-level "All Closed Box Photos" upload — so a second
// (Full Dispatch) round can always add fresh evidence on top of what a prior
// Partial Dispatch round already uploaded, rather than getting stuck once a photo
// exists. Only the first N files that fit under the remaining slots are accepted.
exports.uploadItemBoxPhotos = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const item = dispatch.items.id(req.params.itemId);
  if (!item) return next(new AppError('Dispatch item not found', 404));
  const type = req.body.type || req.query.type;
  const field = type === 'close' ? 'closeBoxPhotos' : 'openBoxPhotos';
  const existing = item[field] || [];
  const remaining = Math.max(0, 20 - existing.length);
  const urls = (req.files || []).slice(0, remaining).map((f) => f.path);
  item[field] = [...existing, ...urls];
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});

// Upload open/close box photos for a single kit (Personalized Kit / Separate Kit are
// dispatched — and photographed — as one unit, not per component). Capped at 20 photos
// per field, same as uploadItemBoxPhotos — a kit that ships across a Partial Dispatch
// round and then a Full Dispatch round needs fresh evidence for each round, not just
// the single "one common photo" the original cap of 1 allowed.
exports.uploadKitBoxPhotos = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const kit = dispatch.kitDispatch.id(req.params.kitDispatchId);
  if (!kit) return next(new AppError('Kit dispatch entry not found', 404));
  const type = req.body.type || req.query.type;
  const field = type === 'close' ? 'closeBoxPhotos' : 'openBoxPhotos';
  const existing = kit[field] || [];
  const remaining = Math.max(0, 20 - existing.length);
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
