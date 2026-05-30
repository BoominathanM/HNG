const express = require('express');
const router = express.Router();
const ctrl = require('./inventory.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getItems);
router.post('/', ctrl.createItem);
router.get('/history', ctrl.getStockHistory);
router.get('/approvals', ctrl.getApprovals);
router.post('/stock-check', ctrl.submitStockCheck);

// Kits
router.get('/kits', ctrl.getKits);
router.post('/kits', ctrl.createKit);
router.put('/kits/:id', ctrl.updateKit);
router.delete('/kits/:id', ctrl.deleteKit);

router.get('/:id', ctrl.getItem);
router.put('/:id', ctrl.updateItem);
router.delete('/:id', ctrl.deleteItem);
router.post('/:id/sell-request', ctrl.sellStockRequest);
router.post('/:id/add-request', ctrl.addStockRequest);
router.patch('/approvals/:id/approve', ctrl.approveMovement);
router.patch('/approvals/:id/reject', ctrl.rejectMovement);

module.exports = router;
