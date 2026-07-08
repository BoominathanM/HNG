const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poCode: { type: String, unique: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  itemName: String,
  qty: Number,
  unit: String,
  batchId: { type: String, default: null },
  items: [{
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    qty: Number,
    unit: String,
  }],
  amount: Number,
  billNo: String,
  invNo: String,
  paymentTerms: String,
  paymentStatus: { type: String, enum: ['Unpaid', 'Partial Paid', 'Paid'], default: 'Unpaid' },
  paidAmount: { type: Number, default: 0 },
  paymentProofUrl: String,
  paymentHistory: [{
    amount: { type: Number, required: true },
    paidBy: String,
    paidDate: { type: Date, default: Date.now },
    proofUrl: String,
    note: String,
  }],
  lrNumber: String,
  trackingUrl: String,
  lrFileUrl: String,
  expectedDeliveryDate: Date,
  // Purchase's own Paid/Not Paid toggle captured at LR-upload time — separate from
  // `paymentStatus` above (which tracks the vendor invoice amount paid via Financial).
  lrPaymentStatus: { type: String, enum: ['Paid', 'Not Paid'] },
  dispatchStatus: { type: String, enum: ['Pending', 'In Transit', 'Received'], default: 'Pending' },
  receivedAt: Date,
  stockUpdated: { type: Boolean, default: false },
  invoiceFileUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
