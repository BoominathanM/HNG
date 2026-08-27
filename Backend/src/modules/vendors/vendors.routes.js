const express = require('express');
const router = express.Router();
const ctrl = require('./vendors.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/', ctrl.getVendors);
router.post('/', ctrl.createVendor);
router.post('/scan-document', upload.single('document'), ctrl.scanDocument);
router.post('/scan-bill', upload.single('bill'), ctrl.scanBill);
router.get('/:id', ctrl.getVendor);
router.put('/:id', ctrl.updateVendor);
router.delete('/:id', ctrl.deleteVendor);
router.get('/:id/history', ctrl.getVendorHistory);
router.get('/:id/ledger', ctrl.getVendorLedger);
router.patch('/:id/status', ctrl.updateVendorStatus);
router.post('/:id/ai-summary', ctrl.generateAiSummary);

module.exports = router;
