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
  dispatchStatus: { type: String, enum: ['Pending', 'In Transit', 'Received', 'Partially Received'], default: 'Pending' },
  receivedAt: Date,
  stockUpdated: { type: Boolean, default: false },
  invoiceFileUrl: String,
  // Header fields AI-extracted from the receiving invoice (scan-invoice) and confirmed by the
  // user on receive — kept separate from `invNo`/`amount` (the PO's own values at order time)
  // so Purchase can compare what was ordered against what the vendor's invoice actually says.
  receivedInvoiceNo: String,
  receivedInvoiceVendorName: String,
  receivedInvoiceTotalAmount: Number,
  receivedInvoiceVendorGST: String,
  receivedInvoiceVendorAddress: String,
  // Per-line-item breakdown captured at receiving time (from AI invoice scan + manual
  // adjustment) — persists what the frontend previously only tracked in local React state.
  receivedItems: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    orderedQty: Number,
    receivedQty: Number,
    missingQty: Number,
    reason: String,
    hsn: String,
    gst: String,
  }],
  // Only set when a shortfall was recorded (dispatchStatus === 'Partially Received').
  missedBy: { type: String, enum: ['vendor', 'lorry', null], default: null },
  vendorMissedAction: { type: String, enum: ['new_order', 'attach_upcoming', null], default: null },
  // Set once the "attach to upcoming order" shortfall has been checked/actioned by Purchase,
  // so the info banner on the vendor's next order stops showing it.
  missingResolved: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
