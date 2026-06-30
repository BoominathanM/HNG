const express = require('express');
const router = express.Router();
const ctrl = require('./inventory.controller');
const packingConfigCtrl = require('./packingConfig.controller');
const materialStockCtrl = require('./materialStock.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

// Material Stocks (packing materials purchased & stored)
router.get('/material-stocks', materialStockCtrl.getAll);
router.post('/material-stocks', materialStockCtrl.create);
router.put('/material-stocks/:id', materialStockCtrl.update);
router.delete('/material-stocks/:id', materialStockCtrl.remove);
router.post('/material-stocks/:id/upload-invoice', upload.single('invoice'), materialStockCtrl.uploadInvoice);

// Packing Material Configuration
router.get('/packing-config', packingConfigCtrl.getAll);
router.post('/packing-config', packingConfigCtrl.create);
router.put('/packing-config/:id', packingConfigCtrl.update);
router.delete('/packing-config/:id', packingConfigCtrl.remove);

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
