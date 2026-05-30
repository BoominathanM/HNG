const DispatchRecord = require('../../models/DispatchRecord');
const Order = require('../../models/Order');
const InventoryItem = require('../../models/InventoryItem');
const StockMovement = require('../../models/StockMovement');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

exports.getDispatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const dispatches = await DispatchRecord.find(filter)
    .populate('orderId', 'orderCode clientName total')
    .populate('pickupEmpId', 'fullName')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: dispatches });
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
    { invoiceFileUrl: `/uploads/${req.file.filename}` },
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
  dispatch.autoNotify = req.body.autoNotify !== false;
  dispatch.sendWhatsapp = req.body.sendWhatsapp !== false;
  if (req.file) dispatch.invoiceFileUrl = `/uploads/${req.file.filename}`;
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
  if (dispatch.orderId) {
    await Order.findByIdAndUpdate(dispatch.orderId._id || dispatch.orderId, { status: 'Dispatched' });
  }

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
    lrNumber: req.body.lrNumber,
    trackingUrl: req.body.trackingUrl,
    status: 'Dispatched',
  };
  if (req.file) update.lrFileUrl = `/uploads/${req.file.filename}`;
  const dispatch = await DispatchRecord.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  res.status(200).json({ success: true, data: dispatch });
});

exports.verifyItem = asyncHandler(async (req, res, next) => {
  const dispatch = await DispatchRecord.findById(req.params.id);
  if (!dispatch) return next(new AppError('Dispatch not found', 404));
  const item = dispatch.items.id(req.params.itemId);
  if (item) {
    item.verified = true;
    if (req.file) item.boxPhotoUrl = `/uploads/${req.file.filename}`;
  }
  await dispatch.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: dispatch });
});
