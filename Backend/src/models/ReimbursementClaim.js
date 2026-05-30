const mongoose = require('mongoose');

const reimbursementClaimSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  claimType: { type: String, enum: ['Transport', 'Food', 'Other'] },
  amount: { type: Number, required: true },
  description: String,
  proofUrl: String,
  status: { type: String, enum: ['Pending', 'Paid', 'Rejected'], default: 'Pending' },
  paidDate: Date,
  paidBy: String,
}, { timestamps: true });

module.exports = mongoose.model('ReimbursementClaim', reimbursementClaimSchema);
