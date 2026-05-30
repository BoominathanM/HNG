const express = require('express');
const router = express.Router();
const ctrl = require('./dispatch.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/', ctrl.getDispatches);
router.post('/', ctrl.createDispatch);
router.get('/:id', ctrl.getDispatch);
router.patch('/:id/draft', ctrl.saveAsDraft);
router.post('/:id/upload-invoice', upload.single('invoice'), ctrl.uploadInvoice);
router.post('/:id/confirm', upload.single('invoice'), ctrl.confirmDispatch);
router.patch('/:id/lr', upload.single('lr'), ctrl.uploadLR);
router.patch('/:id/items/:itemId/verify', upload.single('photo'), ctrl.verifyItem);

module.exports = router;
