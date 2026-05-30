const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseCode: { type: String, unique: true },
  expenseDate: { type: Date, required: true },
  category: {
    type: String,
    enum: ['Shipping / Transportation', 'Utility', 'Rent', 'Salary & Wages', 'Marketing', 'Other', 'Purchase'],
    required: true,
  },
  vendorPayee: String,
  description: { type: String, required: [true, 'Description is required'] },
  amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
  proofUrl: String,
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Partial Paid'], default: 'Unpaid' },
  paidBy: String,
  paidDate: Date,
  expenseSource: { type: String, enum: ['manual', 'purchase', 'reimbursement'], default: 'manual' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.index({ expenseDate: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
