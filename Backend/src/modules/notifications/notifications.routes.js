const express = require('express');
const router = express.Router();
const ctrl = require('./notifications.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getNotifications);
router.get('/stock-alerts', ctrl.getStockAlerts);
router.get('/payment-alerts', ctrl.getPaymentAlerts);
router.post('/', ctrl.createNotification);
router.patch('/mark-all-read', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
