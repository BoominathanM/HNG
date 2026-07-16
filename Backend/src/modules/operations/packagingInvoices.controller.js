const StickerInvoice = require('../../models/StickerInvoice');
const BoxInvoice = require('../../models/BoxInvoice');
const ZiplockInvoice = require('../../models/ZiplockInvoice');
const ButterPaperInvoice = require('../../models/ButterPaperInvoice');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

// Each packaging tab stores its uploaded invoices in its OWN model/collection —
// this map just resolves the URL's :type segment to the right one.
const MODELS = {
  sticker: StickerInvoice,
  box: BoxInvoice,
  ziplock: ZiplockInvoice,
  butter: ButterPaperInvoice,
};

exports.getPackagingInvoices = asyncHandler(async (req, res, next) => {
  const Model = MODELS[req.params.type];
  if (!Model) return next(new AppError('Invalid invoice type', 400));
  const items = await Model.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: items });
});

exports.uploadPackagingInvoice = asyncHandler(async (req, res, next) => {
  const Model = MODELS[req.params.type];
  if (!Model) return next(new AppError('Invalid invoice type', 400));
  if (!req.file) return next(new AppError('Please upload an invoice file', 400));
  const doc = await Model.create({
    fileUrl: req.file.path,
    fileName: req.file.originalname || req.file.filename || 'invoice',
    notes: req.body.notes || '',
    uploadedBy: {
      userId: req.user._id,
      name: req.user.fullName,
      email: req.user.email,
      phone: req.user.mobile,
      role: req.user.role,
    },
  });
  res.status(201).json({ success: true, data: doc });
});
