const express = require('express');
const router = express.Router();
const ctrl = require('./hrms.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

// /api/hrms/<EktaHR path> → GET <EKTAHR_API_URL>/<EktaHR path>
router.get('/*', ctrl.proxyGet);

module.exports = router;
