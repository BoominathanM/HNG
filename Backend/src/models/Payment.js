const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentRef: { type: String, unique: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  amount: { type: Number, required: true },
  courierCharge: { type: Number, default: 0 },
  // true (default, the original behaviour): the courier charge is collected with this payment, so
  // it is credited as received. false ("Unpaid"): the charge only raises the invoice total — nothing
  // is credited for it, so it stays due until it is paid in a later payment.
  courierPaid: { type: Boolean, default: true },
  roundOff: { type: Number, default: 0 },
  // true (default, the original behaviour): round off is credited as received, so it never
  // moves the balance. false ("Unpaid"): round off only adjusts the invoice total — nothing is
  // credited for it, so an Addition raises the balance due and a Discount lowers it.
  roundOffPaid: { type: Boolean, default: true },
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
  // Courier charge and round off are each credited toward the invoice (the courier is collected
  // with the payment; the round off is the paise-level gap the business forgives, so it counts as
  // paid, not a deduction) unless that one was recorded as Unpaid — then it only moves the invoice
  // total, never the amount paid. An absent flag means Paid, exactly as before the switches existed.
  this.netAmount = (this.amount || 0)
    + (this.courierPaid === false ? 0 : (this.courierCharge || 0))
    + (this.roundOffPaid === false ? 0 : (this.roundOff || 0));
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
