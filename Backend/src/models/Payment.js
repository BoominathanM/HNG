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
    // Record Payment In now offers only Cash / Bank Account (the account itself is bankAccountId);
    // the older modes stay valid for payments recorded before that.
    enum: ['Cash', 'Bank Account', 'UPI', 'Card', 'Cheque', 'Bank Transfer'],
    required: true,
  },
  bankAccount: String,
  // Which of CompanySettings.bankAccounts received the money (accountId), plus its label at the
  // time of payment so the Payment Bank Details report can still name it if it is later removed.
  bankAccountId: String,
  bankAccountName: String,
  // Client-generated timestamp shared with the copies of this payment written onto the linked
  // Order/Lead/Quotation paymentCollection — lets the bank report count the payment once.
  recordedAt: String,
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
