const express = require('express');
const router = express.Router();
const ctrl = require('./purchase.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/requests', ctrl.getRequests);
router.post('/requests/bulk', ctrl.createBulkRequest);
router.post('/requests', ctrl.raiseRequest);
router.post('/requests/:id/upload-quotation', upload.single('quotation'), ctrl.uploadQuotationFile);
router.patch('/requests/:id/update-details', ctrl.updateRequestDetails);
router.patch('/requests/:id/notes', ctrl.addNote);

router.get('/orders', ctrl.getPurchaseOrders);
router.post('/orders/:id/receive', upload.single('invoice'), ctrl.receiveOrder);
router.patch('/orders/:id/lr', upload.single('lr'), ctrl.uploadLR);

router.get('/local', ctrl.getLocalPurchases);
router.post('/local', upload.single('invoice'), ctrl.createLocalPurchase);
router.get('/local/:id', ctrl.getLocalPurchase);

router.get('/history', ctrl.getPurchaseHistory);

// AI Quotation Comparison
router.post('/quotation-comparison', upload.array('files', 5), ctrl.compareQuotations);
router.get('/quotation-comparison', ctrl.getQuotationComparisons);
router.get('/quotation-comparison/:id', ctrl.getQuotationComparison);
router.post('/quotation-comparison/:id/select', ctrl.selectBestQuotation);

module.exports = router;
