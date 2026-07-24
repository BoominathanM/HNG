const express = require('express');
const router = express.Router();
const ctrl = require('./tasks.controller');
const timeConfigCtrl = require('./taskTimeConfig.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getTasks);
router.get('/suggested', ctrl.getSuggestedTasks);
router.get('/suggested/insight', ctrl.getSuggestedTasksInsight);
router.get('/emergency-requests', ctrl.getEmergencyRequests);

// ── Time Management config (must precede '/:id' so the literal isn't captured) ──
router.get('/time-config', timeConfigCtrl.getAll);
router.post('/time-config', timeConfigCtrl.create);
router.put('/time-config/:id', timeConfigCtrl.update);
router.delete('/time-config/:id', timeConfigCtrl.remove);

router.post('/', ctrl.createTask);
router.get('/:id', ctrl.getTask);
router.patch('/:id/status', ctrl.updateTaskStatus);
router.patch('/:id/dispatch', ctrl.dispatchOrder);
router.patch('/:id/approve-emergency', ctrl.approveEmergency);
router.patch('/:id/request-emergency', ctrl.requestEmergencyDispatch);
router.patch('/order/:orderId/request-emergency', ctrl.requestEmergencyDispatchForOrder);
router.patch('/:id/approve-emergency/sales', ctrl.approveEmergencySales);
router.patch('/:id/approve-emergency/ops', ctrl.approveEmergencyOps);
router.delete('/:id', ctrl.deleteTask);

module.exports = router;
