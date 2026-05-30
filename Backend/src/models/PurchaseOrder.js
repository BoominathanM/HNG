const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poCode: { type: String, unique: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  itemName: String,
  qty: Number,
  unit: String,
  amount: Number,
  billNo: String,
  invNo: String,
  paymentTerms: String,
  paymentStatus: { type: String, enum: ['Unpaid', 'Partial Paid', 'Paid'], default: 'Unpaid' },
  paidAmount: { type: Number, default: 0 },
  paymentProofUrl: String,
  lrNumber: String,
  trackingUrl: String,
  lrFileUrl: String,
  dispatchStatus: { type: String, enum: ['Pending', 'In Transit', 'Received'], default: 'Pending' },
  receivedAt: Date,
  stockUpdated: { type: Boolean, default: false },
  invoiceFileUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
