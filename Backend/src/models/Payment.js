const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentRef: { type: String, unique: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  netAmount: Number,
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'],
    required: true,
  },
  bankAccount: String,
  upiReference: String,
  cardLast4: String,
  transactionRef: String,
  chequeNumber: String,
  chequeBank: String,
  chequeDate: Date,
  note: String,
  paymentDate: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paymentSchema.pre('save', function (next) {
  this.netAmount = this.amount - (this.discount || 0);
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
