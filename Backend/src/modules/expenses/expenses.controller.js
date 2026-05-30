const Expense = require('../../models/Expense');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

exports.getExpenses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.source) filter.expenseSource = req.query.source;
  if (req.query.status) filter.paymentStatus = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    filter.expenseDate = {};
    if (req.query.startDate) filter.expenseDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.expenseDate.$lte = new Date(req.query.endDate);
  }
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ description: re }, { vendorPayee: re }, { expenseCode: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort('-expenseDate').skip((page - 1) * limit).limit(limit),
    Expense.countDocuments(filter),
  ]);
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  res.status(200).json({ success: true, total, totalAmount, page, data: expenses });
});

exports.createExpense = asyncHandler(async (req, res) => {
  const expenseCode = await generateCode('EXP');
  const expense = await Expense.create({
    ...req.body,
    expenseCode,
    ...(req.file && { proofUrl: `/uploads/${req.file.filename}` }),
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: expense });
});

exports.updateExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!expense) return next(new AppError('Expense not found', 404));
  res.status(200).json({ success: true, data: expense });
});

exports.deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return next(new AppError('Expense not found', 404));
  res.status(200).json({ success: true, message: 'Expense deleted' });
});

exports.getExpenseHistory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.startDate) filter.expenseDate = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.expenseDate = { ...filter.expenseDate, $lte: new Date(req.query.endDate) };
  const expenses = await Expense.find(filter).sort('-expenseDate');
  const summary = {};
  expenses.forEach((e) => {
    summary[e.category] = (summary[e.category] || 0) + e.amount;
  });
  res.status(200).json({ success: true, data: expenses, summary, total: expenses.length });
});

exports.exportExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find().sort('-expenseDate');
  const csv = ['Date,Code,Category,Description,Vendor,Amount,Status']
    .concat(expenses.map((e) =>
      `${e.expenseDate.toISOString().slice(0,10)},${e.expenseCode},${e.category},"${e.description}","${e.vendorPayee || ''}",${e.amount},${e.paymentStatus}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
  res.send(csv);
});
