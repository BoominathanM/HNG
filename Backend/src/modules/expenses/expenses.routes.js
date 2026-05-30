const express = require('express');
const router = express.Router();
const ctrl = require('./expenses.controller');
const { protect } = require('../../middleware/auth');
const upload = require('../../config/multer');

router.use(protect);

router.get('/', ctrl.getExpenses);
router.post('/', upload.single('proof'), ctrl.createExpense);
router.get('/history', ctrl.getExpenseHistory);
router.get('/export', ctrl.exportExpenses);
router.put('/:id', ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

module.exports = router;
