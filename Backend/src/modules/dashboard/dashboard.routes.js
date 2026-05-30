const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/kpis', ctrl.getKPIs);
router.get('/recent-orders', ctrl.getRecentOrders);
router.get('/low-stock', ctrl.getLowStockAlerts);
router.get('/revenue-trend', ctrl.getRevenueTrend);
router.get('/order-status', ctrl.getOrderStatusDistribution);
router.get('/top-products', ctrl.getTopProducts);

module.exports = router;
