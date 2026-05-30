const mongoose = require('mongoose');

const localPurchaseSchema = new mongoose.Schema({
  lpCode: { type: String, unique: true },
  invoiceNo: { type: String, required: true },
  invoiceFileUrl: String,
  vendorName: String,
  vendorPhone: String,
  items: [{
    itemName: String,
    qty: Number,
    unit: String,
    amount: Number,
  }],
  totalAmount: { type: Number, required: true },
  paymentType: { type: String, enum: ['instant', 'credit'], default: 'credit' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentProofUrl: String,
  gPayNumber: String,
  paidDate: Date,
  paidBy: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LocalPurchase', localPurchaseSchema);
