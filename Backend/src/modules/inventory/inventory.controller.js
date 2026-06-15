const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const Kit = require('../../models/Kit');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');

exports.getItems = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.search) filter.itemName = new RegExp(req.query.search, 'i');
  if (req.query.category) filter.category = req.query.category;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort('itemName').skip((page - 1) * limit).limit(limit),
    InventoryItem.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: items });
});

exports.getItem = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return next(new AppError('Item not found', 404));
  res.status(200).json({ success: true, data: item });
});

exports.createItem = asyncHandler(async (req, res) => {
  const itemCode = await generateCode('ITEM');
  const item = await InventoryItem.create({
    ...req.body,
    itemCode,
    currentStock: req.body.openingStock || 0,
    createdBy: req.user._id,
  });
  if (item.openingStock > 0) {
    await StockMovement.create({
      itemId: item._id,
      movementType: 'IN',
      qty: item.openingStock,
      qtyBefore: 0,
      qtyAfter: item.openingStock,
      referenceType: 'Opening',
      approvalStatus: 'Approved',
      approvedBy: req.user._id,
      approvedAt: Date.now(),
      createdBy: req.user._id,
    });
  }
  res.status(201).json({ success: true, data: item });
});

exports.updateItem = asyncHandler(async (req, res, next) => {
  const item = await InventoryItem.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!item) return next(new AppError('Item not found', 404));
  res.status(200).json({ success: true, data: item });
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
  const movement = await StockMovement.create({
    itemId: item._id,
    movementType: 'OUT',
    qty: req.body.qty,
    qtyBefore: item.currentStock,
    qtyAfter: item.currentStock - req.body.qty,
    referenceType: 'Sale',
    sellPrice: req.body.sellPrice,
    departureDate: req.body.departureDate,
    partyId: req.body.partyId,
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
  } else {
    item.currentStock = Math.max(0, item.currentStock - movement.qty);
  }
  await item.save({ validateBeforeSave: false });

  notifyRoles({ modules: ['Inventory'], userIds: [movement.createdBy], type: 'low_stock', title: 'Stock Movement Approved', message: `${movement.movementType === 'IN' ? '+' : '-'}${movement.qty} ${item.unit || 'units'} of ${item.itemName} approved (current: ${item.currentStock})`, link: '/inventory' }).catch(() => {});
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [movements, total] = await Promise.all([
    StockMovement.find(filter).populate('itemId', 'itemName unit').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    StockMovement.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: movements });
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
  const { items } = req.body; // [{itemId, actualCount, reasonType, reason}]
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
        referenceType: 'Check',
        approvalStatus: 'Pending',
        createdBy: req.user._id,
      });
      results.push(movement);
    }
  }
  res.status(201).json({ success: true, data: results, message: 'Stock check submitted for approval' });
});
