const MaterialStock = require('../../models/MaterialStock');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.getAll = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) filter.packingMaterial = new RegExp(req.query.search, 'i');
  const stocks = await MaterialStock.find(filter).sort('-createdAt').populate('createdBy', 'fullName');
  res.status(200).json({ success: true, data: stocks });
});

exports.create = asyncHandler(async (req, res) => {
  const stock = await MaterialStock.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: stock });
});

exports.update = asyncHandler(async (req, res, next) => {
  const stock = await MaterialStock.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!stock) return next(new AppError('Material stock not found', 404));
  res.status(200).json({ success: true, data: stock });
});

exports.remove = asyncHandler(async (req, res, next) => {
  const stock = await MaterialStock.findByIdAndDelete(req.params.id);
  if (!stock) return next(new AppError('Material stock not found', 404));
  res.status(200).json({ success: true, data: {} });
});

exports.uploadInvoice = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an invoice file', 400));
  const stock = await MaterialStock.findByIdAndUpdate(
    req.params.id,
    {
      invoiceFile: {
        name: req.file.originalname || req.file.filename || 'invoice',
        url: req.file.path,
        public_id: req.file.filename || '',
      },
    },
    { new: true }
  );
  if (!stock) return next(new AppError('Material stock not found', 404));
  res.status(200).json({ success: true, data: stock });
});
