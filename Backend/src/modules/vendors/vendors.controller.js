const Vendor = require('../../models/Vendor');
const PurchaseOrder = require('../../models/PurchaseOrder');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

exports.getVendors = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.vendorType = req.query.type;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');
  const vendors = await Vendor.find(filter).sort('name');
  res.status(200).json({ success: true, total: vendors.length, data: vendors });
});

exports.getVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.createVendor = asyncHandler(async (req, res) => {
  const vendorCode = await generateCode('VEN');
  const vendor = await Vendor.create({ ...req.body, vendorCode, createdBy: req.user._id });
  res.status(201).json({ success: true, data: vendor });
});

exports.updateVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.deleteVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  vendor.deletedAt = Date.now();
  await vendor.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Vendor deleted' });
});

exports.getVendorHistory = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  const orders = await PurchaseOrder.find({ vendorId: vendor._id })
    .populate('itemId', 'itemName unit')
    .sort('-createdAt');
  res.status(200).json({ success: true, data: orders, vendor });
});

exports.updateVendorStatus = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { status: req.body.status },
    { new: true }
  );
  if (!vendor) return next(new AppError('Vendor not found', 404));
  res.status(200).json({ success: true, data: vendor });
});

exports.generateAiSummary = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, deletedAt: null });
  if (!vendor) return next(new AppError('Vendor not found', 404));
  const orders = await PurchaseOrder.find({ vendorId: vendor._id }).populate('itemId', 'itemName');
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + (o.amount || 0), 0);
  const paidOrders = orders.filter((o) => o.paymentStatus === 'Paid').length;
  const summary = `Vendor: ${vendor.name}\nTotal Orders: ${totalOrders}\nTotal Spent: ₹${totalSpent.toLocaleString()}\nPaid Orders: ${paidOrders}/${totalOrders}\nStatus: ${vendor.status}\nLast Active: ${orders[0]?.createdAt?.toISOString().slice(0, 10) || 'N/A'}`;
  vendor.aiSummary = summary;
  vendor.aiSummaryDate = Date.now();
  await vendor.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: { summary, vendor } });
});
