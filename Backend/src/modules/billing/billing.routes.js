const express = require('express');
const router = express.Router();
const ctrl = require('./billing.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

// Parties
router.get('/parties', ctrl.getParties);
router.post('/parties', ctrl.createParty);
router.put('/parties/:id', ctrl.updateParty);
router.delete('/parties/:id', ctrl.deleteParty);
router.get('/parties/:id/ledger', ctrl.getPartyLedger);

// Invoices
router.get('/invoices', ctrl.getInvoices);
router.post('/invoices', ctrl.createInvoice);
router.get('/invoices/:id', ctrl.getInvoice);
router.patch('/invoices/:id/gst', ctrl.updateInvoiceGst);
router.post('/invoices/:id/payment', ctrl.recordPayment);
router.get('/invoices/:id/payments', ctrl.getInvoicePayments);
router.post('/invoices/convert-quotation', ctrl.convertQuotationToInvoice);

// Quotations in process
router.get('/quotations-in-process', ctrl.getQuotationsInProcess);

module.exports = router;
