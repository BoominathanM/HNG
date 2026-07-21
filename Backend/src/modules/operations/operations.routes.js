const express = require('express');
const router = express.Router();
const ctrl = require('./operations.controller');
const invoiceCtrl = require('./packagingInvoices.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/orders', ctrl.getOrders);
router.get('/orders/today', ctrl.getTodaysOrders);
router.get('/orders/today-dispatch', ctrl.getTodaysDispatch);
router.patch('/orders/:id/status', ctrl.updateOrderStatus);
router.post('/orders/:id/assign-task', ctrl.assignTask);
router.post('/orders/:id/assign-tasks-per-product', ctrl.assignTasksPerProduct);
router.patch('/orders/:id/emergency', ctrl.setOrderEmergency);
router.patch('/orders/:id/items/:itemKey/printing-status', ctrl.updateItemPrintingStatus);
router.post('/orders/:id/partial-split', ctrl.splitPartialDelivery);

router.get('/stickers', ctrl.getStickerRequests);
router.post('/stickers', ctrl.createStickerRequest);
router.post('/stickers/:id/upload-design', upload.single('design'), ctrl.uploadStickerDesign);
router.post('/stickers/:id/upload-invoice', upload.single('invoice'), ctrl.uploadStickerInvoice);
router.patch('/stickers/:id/status', ctrl.updateStickerStatus);
router.patch('/stickers/:id/approve', ctrl.approveStickerRequest);
router.post('/stickers/send-to-team', ctrl.sendToStickerTeam);
router.post('/stickers/:id/send-design-confirmation', ctrl.sendDesignConfirmationWhatsApp);

// Approved designs per hotel (reuse in future orders)
router.get('/hotel-designs', ctrl.getHotelDesigns);
router.post('/hotel-designs', ctrl.saveHotelDesign);

// Packaging tab invoices (Sticker/Box/Ziplock/Butter Paper) — each :type is backed by its
// own model/collection (see packagingInvoices.controller.js MODELS map).
router.get('/invoices/:type', invoiceCtrl.getPackagingInvoices);
router.post('/invoices/:type', upload.single('invoice'), invoiceCtrl.uploadPackagingInvoice);

module.exports = router;
