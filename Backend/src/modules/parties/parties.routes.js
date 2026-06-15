const express = require('express');
const router = express.Router();
const ctrl = require('./parties.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.post('/', ctrl.createParty);
router.get('/', ctrl.getParties);
router.get('/customers-ledger', ctrl.getCustomersLedger);
router.get('/vendors-ledger', ctrl.getVendorsLedger);
router.delete('/:id', ctrl.deleteParty);
router.get('/:id/orders', ctrl.getPartyOrders);
router.get('/:id/ledger', ctrl.getPartyLedger);
router.get('/:id/ledger/download', ctrl.downloadLedgerCsv);

module.exports = router;
