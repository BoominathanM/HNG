const express = require('express');
const router = express.Router();
const ctrl = require('./reports.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/sales', ctrl.getSalesReport);
router.get('/sales/export', ctrl.exportSalesReport);
router.get('/purchase', ctrl.getPurchaseReport);
router.get('/purchase/export', ctrl.exportPurchaseReport);
router.get('/local-purchase', ctrl.getLocalPurchaseReport);
router.get('/local-purchase/export', ctrl.exportLocalPurchaseReport);
router.get('/profit-loss', ctrl.getProfitLoss);
router.get('/bill-wise-pl', ctrl.getBillPL);
router.get('/monthly-gst', ctrl.getMonthlyGst);
router.get('/monthly-gst/export', ctrl.exportGstReport);
router.get('/auditor-tax', ctrl.getAuditorTax);
router.get('/auditor-tax/export', ctrl.exportSalesReport);
router.get('/forwarding-courier', ctrl.getForwardingCourierReport);
router.get('/transportation-charge', ctrl.getTransportationChargeReport);
router.get('/my-performance', ctrl.getMyPerformance);
router.get('/performance', ctrl.getPerformance);
router.get('/emergency-approvals', ctrl.getEmergencyApprovalsReport);
router.get('/switches', ctrl.getSwitchReport);

module.exports = router;
