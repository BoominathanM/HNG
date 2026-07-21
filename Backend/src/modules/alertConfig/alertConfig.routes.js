const express = require('express');
const router = express.Router();
const ctrl = require('./alertConfig.controller');
const { protect } = require('../../middleware/auth');
const { uploadAudio } = require('../../config/audioCloudinary');

router.use(protect);

router.get('/', ctrl.getAlertConfigs);
router.post('/', ctrl.saveAlertConfig);
router.post('/upload-audio', uploadAudio.single('audio'), ctrl.uploadAlertAudio);

module.exports = router;
