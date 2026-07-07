const express = require('express');
const router = express.Router();
const ctrl = require('./vendors.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getVendors);
router.post('/', ctrl.createVendor);
router.get('/:id', ctrl.getVendor);
router.put('/:id', ctrl.updateVendor);
router.delete('/:id', ctrl.deleteVendor);
router.get('/:id/history', ctrl.getVendorHistory);
router.get('/:id/ledger', ctrl.getVendorLedger);
router.patch('/:id/status', ctrl.updateVendorStatus);
router.post('/:id/ai-summary', ctrl.generateAiSummary);

module.exports = router;
