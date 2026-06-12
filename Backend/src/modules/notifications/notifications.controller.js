const Notification = require('../../models/Notification');
const InventoryItem = require('../../models/InventoryItem');
const Invoice = require('../../models/Invoice');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.getNotifications = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.unread === 'true') filter.isRead = false;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const notifications = await Notification.find(filter).sort('-createdAt').limit(limit);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.status(200).json({ success: true, data: notifications, unreadCount });
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.status(200).json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.status(200).json({ success: true });
});

exports.getStockAlerts = asyncHandler(async (req, res) => {
  const lowStock = await InventoryItem.find({
    $expr: { $lt: ['$currentStock', '$minStock'] },
    deletedAt: null,
  });
  res.status(200).json({ success: true, data: lowStock });
});

exports.getPaymentAlerts = asyncHandler(async (req, res) => {
  const overdue = await Invoice.find({ status: 'Overdue' }).populate('partyId', 'name phone');
  const dueSoon = await Invoice.find({
    status: { $in: ['Pending', 'Partially Paid'] },
    dueDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), $gte: new Date() },
  }).populate('partyId', 'name phone');
  res.status(200).json({ success: true, data: { overdue, dueSoon } });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create({ ...req.body, userId: req.user._id });
  res.status(201).json({ success: true, data: notification });
});

exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const n = await Notification.findByIdAndDelete(req.params.id);
  if (!n) return next(new AppError('Notification not found', 404));
  res.status(200).json({ success: true });
});

exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.status(200).json({ success: true });
});
