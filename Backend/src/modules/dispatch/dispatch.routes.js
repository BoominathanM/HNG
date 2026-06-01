const express = require('express');
const router = express.Router();
const ctrl = require('./dispatch.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/', ctrl.getDispatches);
router.get('/today', ctrl.getTodaysDispatches);
router.get('/transports', ctrl.getTransports);
router.patch('/transports/:id/status', ctrl.updateTransportStatus);
router.get('/pickups', ctrl.getPickupOrders);
router.post('/pickups', ctrl.createPickupOrder);
router.patch('/pickups/:id', ctrl.updatePickupOrder);
router.post('/', ctrl.createDispatch);
router.get('/:id', ctrl.getDispatch);
router.patch('/:id/draft', ctrl.saveAsDraft);
router.post('/:id/upload-invoice', upload.single('invoice'), ctrl.uploadInvoice);
router.post('/:id/verify-invoice', ctrl.verifyInvoice);
router.post('/:id/box-photos', upload.array('photos', 10), ctrl.uploadBoxPhotos);
router.post('/:id/confirm', upload.single('invoice'), ctrl.confirmDispatch);
router.patch('/:id/lr', upload.single('lr'), ctrl.uploadLR);
router.patch('/:id/items/:itemId/verify', upload.single('photo'), ctrl.verifyItem);

module.exports = router;
