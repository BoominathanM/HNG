const express = require('express');
const router = express.Router();
const ctrl = require('./operations.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/orders', ctrl.getOrders);
router.get('/orders/today', ctrl.getTodaysOrders);
router.get('/orders/today-dispatch', ctrl.getTodaysDispatch);
router.patch('/orders/:id/status', ctrl.updateOrderStatus);
router.post('/orders/:id/assign-task', ctrl.assignTask);

router.get('/stickers', ctrl.getStickerRequests);
router.post('/stickers', ctrl.createStickerRequest);
router.post('/stickers/:id/upload-design', upload.single('design'), ctrl.uploadStickerDesign);
router.patch('/stickers/:id/status', ctrl.updateStickerStatus);
router.post('/stickers/send-to-team', ctrl.sendToStickerTeam);

module.exports = router;
