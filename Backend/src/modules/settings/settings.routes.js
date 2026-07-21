const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

// Public — must be registered before the auth gate so the login page can fetch it.
router.get('/public-branding', ctrl.getPublicBranding);

router.use(protect);

router.get('/country-codes', ctrl.getCountryCodes);
router.get('/company', ctrl.getCompanySettings);
router.put('/company', ctrl.updateCompanySettings);
router.post('/company/logo', upload.single('logo'), ctrl.uploadLogo);
router.post('/company/signature', upload.single('signature'), ctrl.uploadSignature);
router.post('/company/qrcode', upload.single('qrcode'), ctrl.uploadQrCode);

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.put('/users/:id/permissions', ctrl.updatePermissions);

router.get('/deleted-records', ctrl.getDeletedRecords);
router.post('/deleted-records/:type/:id/restore', ctrl.restoreRecord);

// Dropdown options (user-added select values)
router.get('/options', ctrl.getOptions);
router.post('/options', ctrl.createOption);

// GST Integration
router.get('/gst-config', ctrl.getGstConfig);
router.get('/gst-config/credentials', ctrl.getGstCredentials);   // returns actual key for edit flow
router.put('/gst-config', ctrl.updateGstConfig);
router.delete('/gst-config', ctrl.deleteGstConfig);
router.post('/gst-config/test', ctrl.testGstConnection);
router.get('/gst/verify/:gstin', ctrl.verifyGstin);

// AI Integration (OpenAI)
router.get('/ai-config', ctrl.getAiConfig);
router.get('/ai-config/credentials', ctrl.getAiCredentials);   // returns actual key for edit flow
router.put('/ai-config', ctrl.updateAiConfig);
router.delete('/ai-config', ctrl.deleteAiConfig);
router.post('/ai-config/test', ctrl.testAiConnection);

module.exports = router;
