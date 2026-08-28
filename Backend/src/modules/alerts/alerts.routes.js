const express = require('express');
const router = express.Router();
const ctrl = require('./alerts.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/active', ctrl.getActiveAlerts);
router.post('/snooze', ctrl.snoozeAlert);
router.post('/stop', ctrl.stopAlert);
router.get('/snoozed', ctrl.getSnoozedAlerts);
router.post('/snoozed/:id/clear', ctrl.clearSnoozedAlert);

module.exports = router;
