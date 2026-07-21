const express = require('express');
const router = express.Router();
const ctrl = require('./alerts.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/active', ctrl.getActiveAlerts);

module.exports = router;
