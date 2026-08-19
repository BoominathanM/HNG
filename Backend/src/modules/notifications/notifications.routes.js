const express = require('express');
const router = express.Router();
const ctrl = require('./notifications.controller');
const { protect } = require('../../middleware/auth');
const { uploadNotifSound } = require('../../config/notifSoundCloudinary');

router.use(protect);

router.get('/', ctrl.getNotifications);
router.get('/stock-alerts', ctrl.getStockAlerts);
router.get('/payment-alerts', ctrl.getPaymentAlerts);
router.post('/', ctrl.createNotification);
router.patch('/mark-all-read', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
router.delete('/all', ctrl.deleteAllNotifications);
router.delete('/:id', ctrl.deleteNotification);

router.get('/sound-config', ctrl.getNotificationSoundConfig);
router.put('/sound-config', ctrl.updateNotificationSoundConfig);
router.post('/sound-config/upload-audio', uploadNotifSound.single('audio'), ctrl.uploadNotificationSound);

module.exports = router;
