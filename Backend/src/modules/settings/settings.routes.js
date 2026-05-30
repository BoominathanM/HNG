const express = require('express');
const router = express.Router();
const ctrl = require('./settings.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/company', ctrl.getCompanySettings);
router.put('/company', ctrl.updateCompanySettings);
router.post('/company/logo', upload.single('logo'), ctrl.uploadLogo);

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.put('/users/:id/permissions', ctrl.updatePermissions);

router.get('/deleted-records', ctrl.getDeletedRecords);
router.post('/deleted-records/:type/:id/restore', ctrl.restoreRecord);

module.exports = router;
