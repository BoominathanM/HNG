const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');
const Task = require('../../models/Task');
const Complaint = require('../../models/Complaint');
const Lead = require('../../models/Lead');
const Party = require('../../models/Party');
const InventoryItem = require('../../models/InventoryItem');
const asyncHandler = require('../../utils/asyncHandler');

const getDateRange = (filter) => {
  const now = new Date();
  switch (filter) {
    case 'Today': { const s = new Date(now); s.setHours(0,0,0,0); return { $gte: s, $lte: now }; }
    case 'This Week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return { $gte: s, $lte: now }; }
    case 'This Month': { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { $gte: s, $lte: now }; }
    default: return null;
  }
};

exports.getKPIs = asyncHandler(async (req, res) => {
  const range = req.query.filter && req.query.filter !== 'All Time' ? getDateRange(req.query.filter) : null;
  const dateFilter = range ? { createdAt: range } : {};

  const [
    totalOrders,
    revenue,
    dispatchReady,
    activeClients,
    totalTasks,
    activeComplaints,
    pendingTasks,
    completedTasks,
    pendingInvoices,
    lowStockItems,
  ] = await Promise.all([
    Order.countDocuments({ ...dateFilter, deletedAt: null }),
    Invoice.aggregate([
      { $match: { status: { $in: ['Paid', 'Partially Paid'] }, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ status: 'Dispatch Ready', deletedAt: null }),
    Party.countDocuments({ type: 'Customer', deletedAt: null }),
    Task.countDocuments(dateFilter),
    Complaint.countDocuments({ status: 'Open' }),
    Task.countDocuments({ status: 'Pending' }),
    Task.countDocuments({ status: 'Done', ...dateFilter }),
    Invoice.countDocuments({ status: { $in: ['Pending', 'Overdue'] } }),
    InventoryItem.countDocuments({ $expr: { $lt: ['$currentStock', '$minStock'] }, deletedAt: null }),
  ]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 8);
  const upcomingReminders = await Lead.countDocuments({
    followupDate: { $gte: today, $lte: tomorrow },
    deletedAt: null,
  });

  res.status(200).json({
    success: true,
    data: {
      totalOrders,
      monthlyRevenue: revenue[0]?.total || 0,
      dispatchReady,
      activeClients,
      totalTasks,
      activeComplaints,
      upcomingReminders,
      todaysTasks: await Task.countDocuments({ createdAt: { $gte: today } }),
      pendingTasks,
      completedTasks,
      pendingInvoices,
      lowStockItems,
    },
  });
});

exports.getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ deletedAt: null })
    .populate('clientPartyId', 'name')
    .sort('-createdAt')
    .limit(10);
  res.status(200).json({ success: true, data: orders });
});

exports.getLowStockAlerts = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({
    $expr: { $lt: ['$currentStock', '$minStock'] },
    deletedAt: null,
  });
  res.status(200).json({ success: true, data: items });
});

exports.getRevenueTrend = asyncHandler(async (req, res) => {
  const months = 7;
  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const [revenueAgg, orderCount] = await Promise.all([
      Invoice.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $in: ['Paid', 'Partially Paid'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: start, $lte: end }, deletedAt: null }),
    ]);
    data.push({
      month: start.toLocaleString('default', { month: 'short' }),
      revenue: revenueAgg[0]?.total || 0,
      orders: orderCount,
    });
  }
  res.status(200).json({ success: true, data });
});

exports.getOrderStatusDistribution = asyncHandler(async (req, res) => {
  const agg = await Order.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.status(200).json({ success: true, data: agg });
});

exports.getTopProducts = asyncHandler(async (req, res) => {
  const agg = await Invoice.aggregate([
    { $unwind: '$items' },
    { $group: { _id: '$items.itemName', qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
  ]);
  res.status(200).json({ success: true, data: agg });
});
