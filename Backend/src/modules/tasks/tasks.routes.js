const express = require('express');
const router = express.Router();
const ctrl = require('./tasks.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getTasks);
router.post('/', ctrl.createTask);
router.get('/:id', ctrl.getTask);
router.patch('/:id/status', ctrl.updateTaskStatus);
router.patch('/:id/approve-emergency', ctrl.approveEmergency);
router.delete('/:id', ctrl.deleteTask);

module.exports = router;
