const express = require('express');
const router = express.Router();
const { login, refresh, logout, getMe, changePassword } = require('./auth.controller');
const { protect } = require('../../middleware/auth');

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePassword);

module.exports = router;
