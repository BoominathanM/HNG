const express = require('express');
const router = express.Router();
const ctrl = require('./financial.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

// Quotation Requests
router.get('/requests', ctrl.getPendingRequests);
router.patch('/requests/:id/approve', ctrl.approveRequest);
router.patch('/requests/:id/reject', ctrl.rejectRequest);
router.put('/requests/:id/quotation', ctrl.updateQuotationDetails);

// Purchase Order Payments
router.post('/pay/:id', upload.single('proof'), ctrl.payPurchaseOrder);

// Expense Payments
router.get('/expense-payments', ctrl.getExpensePayments);
router.post('/expense-payments/:id/pay', upload.single('proof'), ctrl.payExpense);

// Reimbursements — Pickup
router.get('/reimbursements/pickup', ctrl.getPickupExpenses);
router.post('/reimbursements/pickup/:id/pay', upload.single('proof'), ctrl.payPickupExpense);

// Reimbursements — Local Purchase
router.get('/reimbursements/local-purchase', ctrl.getLocalPurchaseExpenses);
router.post('/reimbursements/local-purchase/:id/pay', upload.single('proof'), ctrl.payLocalPurchase);

module.exports = router;
