const express = require('express');
const router = express.Router();
const ctrl = require('./staff.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

router.get('/', ctrl.getStaff);
router.post('/', ctrl.createStaff);
router.get('/claims', ctrl.getClaims);
router.post('/claims', ctrl.createClaim);
router.patch('/claims/:id/status', ctrl.updateClaimStatus);
router.get('/:id', ctrl.getStaffMember);
router.put('/:id', ctrl.updateStaff);
router.delete('/:id', ctrl.deleteStaff);
router.patch('/:id/credentials', ctrl.updateCredentials);
router.patch('/:id/toggle-login', ctrl.toggleLogin);

module.exports = router;
