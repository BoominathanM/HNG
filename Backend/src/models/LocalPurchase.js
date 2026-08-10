const mongoose = require('mongoose');

const localPurchaseSchema = new mongoose.Schema({
  lpCode: { type: String, unique: true },
  invoiceNo: { type: String, required: true },
  invoiceFileUrl: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: String,
  vendorPhone: String,
  items: [{
    itemName: String,
    qty: Number,
    unit: String,
    amount: Number,
  }],
  totalAmount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['instant', 'credit'], default: 'credit' },
  paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid'], default: 'Pending' },
  paymentProofUrl: String,
  gPayNumber: String,
  paidDate: Date,
  paidBy: String,
  // Only set when paidBy === 'Purchase Person' — links to the PurchasePerson master record
  // plus a point-in-time snapshot of name/phone (so history reads correctly even if the
  // person record is later edited).
  purchasePersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchasePerson' },
  purchasePersonName: String,
  purchasePersonPhone: String,
  // Credit ("Pay Later") reminder — when the vendor should be paid; the escalation
  // window/frequency itself is configured on the WhatsAppEventMapping, not per-record.
  dueDate: Date,
  paymentHistory: [{
    amount: { type: Number, required: true },
    paidBy: String,
    paidDate: { type: Date, default: Date.now },
    proofUrl: String,
    note: String,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LocalPurchase', localPurchaseSchema);
