const mongoose = require('mongoose');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const Vendor = require('../../models/Vendor');
const Party = require('../../models/Party');
const Kit = require('../../models/Kit');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { sendMessage, ensureDefaultWhatsAppEvents } = require('../../services/whatsAppService');
const { backfillPendingDeductionsForItem } = require('../sales/sales.controller');

// Bulk item's tracking unit → the fill units its linked "filled" (per-piece) items may use —
// either the bulk unit's own metric sub-unit (small per-piece fills, e.g. a 10ml bottle) or
// the bulk unit itself (large per-piece fills, e.g. a 1 Litre jug). Only these four metric
// units are supported by the fill conversion (see UNIT_TO_BULK_FACTOR below).
const BULK_FILL_UNITS = { Litres: ['ml', 'Litres'], Kg: ['gram', 'Kg'] };
// Fill unit → how many of it make up 1 unit of its bulk item (ml/gram are sub-units of
// Litres/Kg respectively; Litres/Kg fills draw 1:1 from a same-unit bulk item).
const UNIT_TO_BULK_FACTOR = { ml: 1000, Litres: 1, gram: 1000, Kg: 1 };

// Dividing by UNIT_TO_BULK_FACTOR (e.g. /1000 for ml→Litres) routinely leaves floating-point
// noise like 0.00999999999999787 instead of 0.01 — round every fill-math result to 6 decimals
// before it's assigned to currentStock/remainingQty and persisted, so the noise never reaches
// the database (the frontend also rounds for display, but that can't fix values already saved).
const round6 = (n) => Math.round((Number(n) || 0) * 1e6) / 1e6;

// Sends the "Stock Checking" WhatsApp template (configured in Integrations → WhatsApp →
// Event Mapping) whenever a Live Staff Check records a discrepancy — for both Known and
// Unknown reasons. Recipients come from the mapping's own `recipientUserIds` (selectable
// in the Integration UI, scoped to Admin-department users — see RECIPIENT_ONLY_EVENT_KEYS
// in whatsapp.controller.js/WhatsAppIntegration.jsx) when configured; if none are picked
// yet, it falls back to every Super Admin/Admin so the feature still works out of the box.
// Silently no-ops if the event has no enabled template mapping yet, so an unconfigured
// integration never blocks the check submit.
async function sendStockCheckingWhatsApp(item, movement, checkedByUser) {
  try {
    // Self-heal: the event doc is normally seeded when the Integration → WhatsApp page
    // loads its event dropdown — ensure it exists here too so a first-ever check right
    // after deploy (before anyone has opened that page) doesn't silently find nothing.
    await ensureDefaultWhatsAppEvents();
    const event = await WhatsAppEvent.findOne({ key: 'stock-checking' }).lean();
    if (!event) return;
    const mapping = await WhatsAppEventMapping.findOne({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .populate('recipientUserIds', 'mobile fullName')
      .lean();
    if (!mapping?.templateId) return;

    const { name: templateName, language = 'en' } = mapping.templateId;
    const checkedAt = movement.createdAt || new Date();
    const fieldValues = {
      itemName: item.itemName || '',
      reasonType: movement.reasonType || '',
      reason: movement.reason || '',
      checkedBy: checkedByUser?.fullName || '',
      checkedAt: `${checkedAt.toLocaleDateString('en-IN')} ${checkedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      companyName: process.env.COMPANY_NAME || 'HNG',
    };
    const parameters = {};
    (mapping.variables || []).forEach((v) => {
      if (v.templateVariable && v.eventField) parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
    });

    let recipients = (mapping.recipientUserIds || []).filter((u) => u?.mobile);
    if (!recipients.length) {
      recipients = await User.find({
        status: 'Active',
        deletedAt: null,
        role: { $in: ['Super Admin', 'Admin'] },
        mobile: { $exists: true, $ne: '' },
      }).select('mobile fullName').lean();
    }
    for (const r of recipients) {
      const result = await sendMessage({ to: r.mobile, templateName, language, parameters });
      if (result.success) {
        console.log(`[stock-checking] Sent to ${r.fullName} (${r.mobile})`);
      } else {
        console.warn(`[stock-checking] Failed for ${r.fullName} (${r.mobile}): ${result.error}`);
      }
    }
  } catch (err) {
    console.error('[stock-checking] error:', err.message);
  }
}

exports.getItems = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.search) filter.itemName = new RegExp(req.query.search, 'i');
  if (req.query.category) filter.category = req.query.category;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).populate('vendorId', 'name vendorCode phone').sort('itemName').skip((page - 1) * limit).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: items });
});

exports.getItem = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null }).populate('vendorId', 'name vendorCode phone');
  if (!item) return next(new AppError('Item not found', 404));
  res.status(200).json({ success: true, data: item });
});

exports.createItem = asyncHandler(async (req, res, next) => {
  const { mergeItemCode, itemType, bulkSourceItemId, ...body } = req.body;

  // 'filled' items are packed from a linked bulk item's stock via the /fill action — validate
  // the link and unit compatibility up front so a mismatched pair can never be created.
  if (itemType === 'filled') {
    if (!bulkSourceItemId) return next(new AppError('Select which bulk item this is filled from', 400));
    const bulkSource = await InventoryItem.findOne({ _id: bulkSourceItemId, deletedAt: null, itemType: 'bulk' });
    if (!bulkSource) return next(new AppError('Bulk source item not found', 404));
    const expectedUnits = BULK_FILL_UNITS[bulkSource.unit];
    if (!expectedUnits) return next(new AppError(`Bulk item "${bulkSource.itemName}" must be tracked in Litres or Kg before it can be filled from`, 400));
    if (!expectedUnits.includes(body.unit)) return next(new AppError(`Fill unit must be ${expectedUnits.join(' or ')} to match "${bulkSource.itemName}"'s bulk unit (${bulkSource.unit})`, 400));
  }

  // Merge into an existing item (matched by item code) instead of creating a duplicate —
  // e.g. this is really more stock of a product already catalogued under a different name.
  if (mergeItemCode) {
    const existing = await InventoryItem.findOne({ itemCode: mergeItemCode, deletedAt: null });
    if (!existing) return next(new AppError(`No item found with code "${mergeItemCode}"`, 404));
    const qtyToAdd = Number(body.openingStock) || 0;
    const qtyBefore = existing.currentStock;
    const vendorId = body.vendorId || existing.vendorId;
    let vendorName;
    if (vendorId) vendorName = (await Vendor.findById(vendorId))?.name;
    if (body.vendorId) existing.vendorId = body.vendorId;
    if (body.purchasePrice != null) existing.purchasePrice = body.purchasePrice;
    if (body.sellingPrice != null) existing.sellingPrice = body.sellingPrice;
    const batchDate = body.purchaseDate || Date.now();
    if (qtyToAdd > 0) {
      existing.purchaseBatches.push({
        vendorId: vendorId || undefined, vendorName, purchaseDate: batchDate, qty: qtyToAdd, remainingQty: qtyToAdd,
        purchasePrice: existing.purchasePrice || 0, gstPercent: existing.gstPercent || 0,
      });
      existing.currentStock = qtyBefore + qtyToAdd;
    }
    await existing.save({ validateBeforeSave: false });
    if (qtyToAdd > 0) {
      await StockMovement.create({
        itemId: existing._id,
        movementType: 'IN',
        qty: qtyToAdd,
        qtyBefore,
        qtyAfter: existing.currentStock,
        referenceType: 'Purchase',
        vendorId: vendorId || undefined,
        vendorName,
        purchaseDate: batchDate,
        approvalStatus: 'Approved',
        approvedBy: req.user._id,
        approvedAt: Date.now(),
        createdBy: req.user._id,
      });
      // Pay off any orders that were placed/edited while this item was short of stock.
      backfillPendingDeductionsForItem(existing._id, req.user._id).catch((err) => {
        console.error(`Backorder backfill failed for item "${existing.itemName}" after item merge:`, err.message);
      });
    }
    return res.status(200).json({ success: true, merged: true, data: existing });
  }

  const itemCode = await generateCode('ITEM');
  // Filled items start empty — stock only enters them via the /fill action, which draws
  // proportionally from the linked bulk item.
  const openingStock = itemType === 'filled' ? 0 : (body.openingStock || 0);
  const purchaseDate = body.purchaseDate || Date.now();
  let vendorName;
  if (body.vendorId) {
    const vendor = await Vendor.findById(body.vendorId);
    vendorName = vendor?.name;
  }
  const item = await InventoryItem.create({
    ...body,
    itemType: itemType || 'standard',
    bulkSourceItemId: itemType === 'filled' ? bulkSourceItemId : undefined,
    itemCode,
    currentStock: openingStock,
    purchaseBatches: openingStock > 0
      ? [{
          vendorId: body.vendorId || undefined, vendorName, purchaseDate, qty: openingStock, remainingQty: openingStock,
          purchasePrice: body.purchasePrice || 0, gstPercent: body.gstPercent || 0,
        }]
      : [],
    createdBy: req.user._id,
  });
  if (openingStock > 0) {
    await StockMovement.create({
      itemId: item._id,
      movementType: 'IN',
      qty: openingStock,
      qtyBefore: 0,
      qtyAfter: openingStock,
      referenceType: 'Opening',
      vendorId: body.vendorId || undefined,
      vendorName,
      purchaseDate,
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      approvedAt: Date.now(),
      createdBy: req.user._id,
    });
  }
  res.status(201).json({ success: true, data: item });
});

exports.updateItem = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return next(new AppError('Item not found', 404));
  const { productAttributes, addStockQty, purchaseDate, ...rest } = req.body;
  if (item.itemType === 'filled' && (Number(addStockQty) || 0) > 0) {
    return next(new AppError('Filled items are stocked via "Fill Stock", not Add Stock', 400));
  }
  Object.assign(item, rest);
  if (productAttributes !== undefined) {
    item.productAttributes = productAttributes;
    item.markModified('productAttributes');
  }
  // A new purchase of this same product from the (possibly different) vendor selected above —
  // recorded as its own batch so FIFO deduction can draw down older vendors' stock first.
  const qtyToAdd = Number(addStockQty) || 0;
  if (qtyToAdd > 0) {
    const qtyBefore = item.currentStock;
    let vendorName;
    if (item.vendorId) {
      const vendor = await Vendor.findById(item.vendorId);
      vendorName = vendor?.name;
    }
    const batchDate = purchaseDate || Date.now();
    item.purchaseBatches.push({
      vendorId: item.vendorId || undefined, vendorName, purchaseDate: batchDate, qty: qtyToAdd, remainingQty: qtyToAdd,
      purchasePrice: item.purchasePrice || 0, gstPercent: item.gstPercent || 0,
    });
    item.currentStock = qtyBefore + qtyToAdd;
    await item.save({ validateBeforeSave: false });
    await StockMovement.create({
      itemId: item._id,
      movementType: 'IN',
      qty: qtyToAdd,
      qtyBefore,
      qtyAfter: item.currentStock,
      referenceType: 'Purchase',
      vendorId: item.vendorId || undefined,
      vendorName,
      purchaseDate: batchDate,
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      approvedAt: Date.now(),
      createdBy: req.user._id,
    });
    // Pay off any orders that were placed/edited while this item was short of stock.
    backfillPendingDeductionsForItem(item._id, req.user._id).catch((err) => {
      console.error(`Backorder backfill failed for item "${item.itemName}" after add-stock edit:`, err.message);
    });
  } else {
    await item.save({ validateBeforeSave: false });
  }
  res.status(200).json({ success: true, data: item });
});

// Fill Stock — packs `fillQty` pieces of a 'filled' item, drawing the equivalent amount
// (plus wastage) from its linked bulk item's stock. Once filled, the item's own
// currentStock/purchaseBatches carry the pieces forward exactly like any standard item —
// order deduction never needs to know it was ever "filled".
exports.fillStock = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null, itemType: 'filled' });
  if (!item) return next(new AppError('Filled item not found', 404));

  const bulk = await InventoryItem.findOne({ _id: item.bulkSourceItemId, deletedAt: null, itemType: 'bulk' });
  if (!bulk) return next(new AppError('Linked bulk item not found', 404));

  const fillSize = Number(item.unitValue) || 0;
  if (fillSize <= 0) return next(new AppError(`"${item.itemName}" has no fill size set (Unit Value)`, 400));
  const wastage = Math.min(Number(item.fillWastagePercent) || 0, 99);
  // Fill-unit quantity needed per good piece, inflated to cover spillage, converted to the
  // bulk item's own unit (Litres/Kg) via the fill unit's factor — 1000 for a sub-unit fill
  // (ml/gram), 1:1 when the fill unit already matches the bulk unit (Litres/Kg). Same formula
  // both directions: fillQty → bulk needed, and (below) bulk on hand → max whole pieces.
  const fillUnitFactor = UNIT_TO_BULK_FACTOR[item.unit] || 1000;

  // fillQty is optional — the UI auto-fills it from live bulk stock, but if it's omitted (or
  // 0) here, compute the maximum whole pieces fillable from all bulk currently on hand
  // ourselves, so the piece count never has to be worked out manually for either Litres or Kg
  // bulk items.
  let fillQty = Number(req.body.fillQty) || 0;
  if (fillQty <= 0) {
    fillQty = Math.floor((bulk.currentStock * fillUnitFactor * (1 - wastage / 100)) / fillSize);
  }
  if (fillQty <= 0) {
    return next(new AppError(`Not enough bulk stock — "${bulk.itemName}" has ${bulk.currentStock} ${bulk.unit}, not enough for even 1 piece of "${item.itemName}"`, 400));
  }

  const rawNeeded = (fillQty * fillSize) / (1 - wastage / 100);
  const bulkQtyNeeded = round6(rawNeeded / fillUnitFactor);

  if (bulk.currentStock < bulkQtyNeeded) {
    return next(new AppError(`Not enough bulk stock — need ${bulkQtyNeeded.toFixed(3)} ${bulk.unit} of "${bulk.itemName}", only ${bulk.currentStock} ${bulk.unit} available`, 400));
  }

  const bulkQtyBefore = bulk.currentStock;
  bulk.currentStock = round6(Math.max(0, bulkQtyBefore - bulkQtyNeeded));

  // Draw down oldest purchaseDate batches first, same FIFO convention used when an order
  // deducts a standard item — one StockMovement per vendor batch touched.
  const segments = [];
  let remaining = bulkQtyNeeded;
  const batches = (bulk.purchaseBatches || [])
    .filter((b) => b.remainingQty > 0)
    .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remainingQty, remaining);
    batch.remainingQty = round6(batch.remainingQty - take);
    remaining = round6(remaining - take);
    segments.push({ qty: take, vendorId: batch.vendorId, vendorName: batch.vendorName, purchaseDate: batch.purchaseDate });
  }
  if (remaining > 0) segments.push({ qty: remaining, vendorId: bulk.vendorId });
  bulk.markModified('purchaseBatches');
  await bulk.save({ validateBeforeSave: false });

  let runningAfter = bulkQtyBefore;
  for (const seg of segments) {
    runningAfter -= seg.qty;
    await StockMovement.create({
      itemId: bulk._id,
      movementType: 'OUT',
      qty: seg.qty,
      qtyBefore: runningAfter + seg.qty,
      qtyAfter: Math.max(0, runningAfter),
      referenceType: 'Manual',
      reason: `Filled into ${item.itemName} (${fillQty} ${item.unit})`,
      vendorId: seg.vendorId || undefined,
      vendorName: seg.vendorName,
      purchaseDate: seg.purchaseDate,
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      createdBy: req.user._id,
    });
  }
  if (bulk.minStock > 0 && bulk.currentStock < bulk.minStock) {
    const isOut = bulk.currentStock === 0;
    notifyRoles({ modules: ['Inventory', 'Purchase'], type: 'low_stock', title: isOut ? 'Out of Stock' : 'Low Stock Alert', message: `${bulk.itemName} — ${bulk.currentStock}/${bulk.minStock} ${bulk.unit} remaining`, link: '/inventory' }).catch(() => {});
  }

  // Credit the filled item — from here on it's a normal stocked item with its own batch.
  const itemQtyBefore = item.currentStock;
  const fillVendorName = bulk.vendorId ? (await Vendor.findById(bulk.vendorId))?.name : undefined;
  item.currentStock = itemQtyBefore + fillQty;
  item.purchaseBatches.push({
    vendorId: bulk.vendorId || undefined,
    vendorName: fillVendorName,
    purchaseDate: Date.now(),
    qty: fillQty,
    remainingQty: fillQty,
  });
  await item.save({ validateBeforeSave: false });
  await StockMovement.create({
    itemId: item._id,
    movementType: 'IN',
    qty: fillQty,
    qtyBefore: itemQtyBefore,
    qtyAfter: item.currentStock,
    referenceType: 'Manual',
    reason: `Filled from bulk item "${bulk.itemName}" (${bulkQtyNeeded.toFixed(3)} ${bulk.unit} used${wastage ? `, ${wastage}% wastage` : ''})`,
    vendorId: bulk.vendorId || undefined,
    vendorName: fillVendorName,
    approvalStatus: 'Approved',
    approvedBy: req.user._id,
    createdBy: req.user._id,
  });

  // Pay off any orders that were placed/edited while the FILLED item was short of stock
  // (the bulk item just went down, not up — only the filled item's own stock arrived).
  backfillPendingDeductionsForItem(item._id, req.user._id).catch((err) => {
    console.error(`Backorder backfill failed for item "${item.itemName}" after fill:`, err.message);
  });

  res.status(200).json({ success: true, data: { item, bulk, fillQty } });
});

exports.deleteItem = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return next(new AppError('Item not found', 404));
  item.deletedAt = Date.now();
  await item.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Item deleted' });
});

// Sell Stock — creates pending movement
exports.sellStockRequest = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return next(new AppError('Item not found', 404));
  // Snapshot the party's name at the time of the request (same reasoning as vendorName on
  // purchase movements) so Stock History still shows it even if the Party is later renamed.
  let partyName = req.body.partyName;
  if (!partyName && req.body.partyId) {
    const party = await Party.findById(req.body.partyId).select('name').lean();
    partyName = party?.name;
  }
  const movement = await StockMovement.create({
    itemId: item._id,
    movementType: 'OUT',
    qty: req.body.qty,
    qtyBefore: item.currentStock,
    qtyAfter: item.currentStock - req.body.qty,
    referenceType: 'Sale',
    sellPrice: req.body.sellPrice,
    departureDate: req.body.departureDate,
    partyId: req.body.partyId || undefined,
    partyName,
    approvalStatus: 'Pending',
    createdBy: req.user._id,
  });
  notifyRoles({ modules: ['Inventory'], type: 'low_stock', title: 'Sell Stock Request', message: `Sell ${req.body.qty} ${item.unit || 'units'} of ${item.itemName} — pending approval`, link: '/inventory' }).catch(() => {});
  res.status(201).json({ success: true, data: movement, message: 'Sell request raised — pending approval' });
});

// Add Stock — creates pending movement
exports.addStockRequest = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return next(new AppError('Item not found', 404));
  const movement = await StockMovement.create({
    itemId: item._id,
    movementType: 'IN',
    qty: req.body.qty,
    qtyBefore: item.currentStock,
    qtyAfter: item.currentStock + req.body.qty,
    referenceType: 'Manual',
    supplyPrice: req.body.supplyPrice,
    approvalStatus: 'Pending',
    createdBy: req.user._id,
  });
  notifyRoles({ modules: ['Inventory'], type: 'low_stock', title: 'Add Stock Request', message: `Add ${req.body.qty} ${item.unit || 'units'} of ${item.itemName} — pending approval`, link: '/inventory' }).catch(() => {});
  res.status(201).json({ success: true, data: movement, message: 'Add stock request raised — pending approval' });
});

// Get approvals queue
exports.getApprovals = asyncHandler(async (req, res) => {
  const movements = await StockMovement.find({ approvalStatus: 'Pending' })
    .populate('itemId', 'itemName unit currentStock')
    .populate('createdBy', 'fullName')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: movements });
});

// Approve stock movement
exports.approveMovement = asyncHandler(async (req, res, next) => {
  const movement = await StockMovement.findById(req.params.id);
  if (!movement) return next(new AppError('Movement not found', 404));
  if (movement.approvalStatus !== 'Pending') return next(new AppError('Already processed', 400));

  movement.approvalStatus = 'Approved';
  movement.approvedBy = req.user._id;
  movement.approvedAt = Date.now();
  await movement.save({ validateBeforeSave: false });

  const item = await InventoryItem.findById(movement.itemId);
  if (movement.movementType === 'IN') {
    item.currentStock += movement.qty;
  } else if (movement.movementType === 'OUT') {
    item.currentStock = Math.max(0, item.currentStock - movement.qty);
  } else {
    // CHECK / ADJUSTMENT: qtyBefore/qtyAfter carry the real signed direction
    // (physical count vs system stock) — qty alone is an absolute value and
    // can't tell a surplus (add) from a shortage (deduct) apart.
    const delta = movement.qtyAfter - movement.qtyBefore;
    item.currentStock = Math.max(0, item.currentStock + delta);
  }
  await item.save({ validateBeforeSave: false });

  const isAddition = movement.movementType === 'IN' || (movement.movementType !== 'OUT' && movement.qtyAfter >= movement.qtyBefore);
  if (isAddition) {
    // Pay off any orders that were placed/edited while this item was short of stock —
    // covers both a plain Add-Stock-Request approval and a Stock-Check/reconciliation
    // approval that nets out to a surplus.
    backfillPendingDeductionsForItem(item._id, req.user._id).catch((err) => {
      console.error(`Backorder backfill failed for item "${item.itemName}" after movement approval:`, err.message);
    });
  }
  notifyRoles({ modules: ['Inventory'], userIds: [movement.createdBy], type: 'low_stock', title: 'Stock Movement Approved', message: `${isAddition ? '+' : '-'}${movement.qty} ${item.unit || 'units'} of ${item.itemName} approved (current: ${item.currentStock})`, link: '/inventory' }).catch(() => {});
  if (item.minStock > 0 && item.currentStock < item.minStock) {
    const isOut = item.currentStock === 0;
    notifyRoles({ modules: ['Inventory', 'Purchase'], type: 'low_stock', title: isOut ? 'Out of Stock' : 'Low Stock Alert', message: `${item.itemName} — ${item.currentStock}/${item.minStock} ${item.unit || 'units'} remaining`, link: '/inventory' }).catch(() => {});
  }
  res.status(200).json({ success: true, data: movement, currentStock: item.currentStock });
});

// Reject stock movement
exports.rejectMovement = asyncHandler(async (req, res, next) => {
  const movement = await StockMovement.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: 'Rejected', approvedBy: req.user._id, approvedAt: Date.now() },
    { new: true }
  ).populate('itemId', 'itemName unit');
  if (!movement) return next(new AppError('Movement not found', 404));
  notifyRoles({ modules: ['Inventory'], userIds: [movement.createdBy], type: 'low_stock', title: 'Stock Movement Rejected', message: `Stock movement for ${movement.itemId?.itemName || 'item'} was rejected`, link: '/inventory' }).catch(() => {});
  res.status(200).json({ success: true, data: movement });
});

// Stock History
exports.getStockHistory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.itemId) filter.itemId = req.query.itemId;
  if (req.query.type) filter.movementType = req.query.type;
  if (req.query.partyId) filter.partyId = req.query.partyId;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(`${req.query.dateTo}T23:59:59.999Z`);
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).populate('itemId', 'itemName unit').populate('vendorId', 'name').populate('partyId', 'name').populate('createdBy', 'fullName').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: movements });
});

// Stock In vs Stock Out report, bucketed by week/month/year — powers the Weekly/Monthly/
// Yearly report chart on the per-item Stock In/Out History screen. Aggregated server-side
// (rather than summed on the frontend from a paginated list) so it stays correct regardless
// of how many movements an item has.
exports.getStockHistoryReport = asyncHandler(async (req, res) => {
  const unit = req.query.period === 'weekly' ? 'week' : req.query.period === 'yearly' ? 'year' : 'month';
  const match = { movementType: { $in: ['IN', 'OUT'] } };
  if (req.query.itemId) match.itemId = new mongoose.Types.ObjectId(req.query.itemId);
  if (req.query.partyId) match.partyId = new mongoose.Types.ObjectId(req.query.partyId);
  const rows = await StockMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          period: { $dateTrunc: { date: '$createdAt', unit, binSize: 1 } },
          type: '$movementType',
        },
        qty: { $sum: '$qty' },
      },
    },
    { $sort: { '_id.period': 1 } },
  ]);
  const byPeriod = new Map();
  for (const r of rows) {
    const key = r._id.period.toISOString();
    if (!byPeriod.has(key)) byPeriod.set(key, { period: r._id.period, stockIn: 0, stockOut: 0 });
    const bucket = byPeriod.get(key);
    if (r._id.type === 'IN') bucket.stockIn += r.qty;
    else bucket.stockOut += r.qty;
  }
  const data = [...byPeriod.values()].sort((a, b) => a.period - b.period);
  res.status(200).json({ success: true, data });
});

// ─── KITS ──────────────────────────────────────────────────────────────────
exports.getKits = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.search) filter.kitName = new RegExp(req.query.search, 'i');
  const kits = await Kit.find(filter).sort('kitName');
  res.status(200).json({ success: true, total: kits.length, data: kits });
});

exports.createKit = asyncHandler(async (req, res) => {
  const kitCode = await generateCode('KIT');
  const kit = await Kit.create({ ...req.body, kitCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: kit });
});

exports.updateKit = asyncHandler(async (req, res, next) => {
  const kit = await Kit.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!kit) return next(new AppError('Kit not found', 404));
  res.status(200).json({ success: true, data: kit });
});

exports.deleteKit = asyncHandler(async (req, res, next) => {
  const kit = await Kit.findOne({ _id: req.params.id, deletedAt: null });
  if (!kit) return next(new AppError('Kit not found', 404));
  kit.deletedAt = Date.now();
  await kit.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Kit deleted' });
});

// Live Staff Stock Check
exports.submitStockCheck = asyncHandler(async (req, res) => {
  const { items, notes } = req.body; // [{itemId, actualCount, reasonType, reason}], notes: session-level text
  const results = [];
  for (const check of items) {
    const item = await InventoryItem.findById(check.itemId);
    if (!item) continue;
    const diff = check.actualCount - item.currentStock;
    if (diff !== 0) {
      const movement = await StockMovement.create({
        itemId: item._id,
        movementType: 'CHECK',
        qty: Math.abs(diff),
        qtyBefore: item.currentStock,
        qtyAfter: check.actualCount,
        reason: check.reason,
        reasonType: check.reasonType,
        notes: notes || undefined,
        referenceType: 'Check',
        approvalStatus: 'Pending',
        createdBy: req.user._id,
      });
      results.push(movement);

      if (check.reasonType) {
        const reasonLabel = check.reasonType === 'Unknown' ? 'Unknown' : 'Known';
        notifyRoles({
          modules: ['Inventory'],
          type: 'low_stock',
          title: `Stock Check — ${reasonLabel} Reason Reported`,
          message: `${req.user.fullName || 'A staff member'} reported ${Math.abs(diff)} ${item.unit || 'units'} of "${item.itemName}" missing (${reasonLabel} reason)${check.reason ? `: ${check.reason}` : ''} — pending approval`,
          link: '/inventory',
        }).catch(() => {});
        sendStockCheckingWhatsApp(item, movement, req.user).catch(() => {});
      }
    }
  }
  res.status(201).json({ success: true, data: results, message: 'Stock check submitted for approval' });
});
