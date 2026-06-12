const express = require('express');
const router = express.Router();
const ctrl = require('./tasks.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getTasks);
router.get('/suggested', ctrl.getSuggestedTasks);
router.post('/', ctrl.createTask);
router.get('/:id', ctrl.getTask);
router.patch('/:id/status', ctrl.updateTaskStatus);
router.patch('/:id/approve-emergency', ctrl.approveEmergency);
router.patch('/:id/request-emergency', ctrl.requestEmergencyDispatch);
router.patch('/:id/approve-emergency/sales', ctrl.approveEmergencySales);
router.patch('/:id/approve-emergency/ops', ctrl.approveEmergencyOps);
router.delete('/:id', ctrl.deleteTask);

module.exports = router;
