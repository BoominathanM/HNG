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
    // This item's own quoted amount — the order-level `amount` for a multi-item
    // batch is the sum of these, not any single item's value.
    amount: Number,
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
  // Bill Total Amount as printed on the uploaded LR copy (AI-extracted, or entered
  // manually as a fallback) — this is what Finance/Pickup Team actually owe the
  // transporter, distinct from `amount` (the vendor's goods invoice value) which must
  // never be used as the LR payable amount.
  billTotalAmount: { type: Number, default: 0 },
  expectedDeliveryDate: Date,
  // Purchase's own Paid/Not Paid toggle captured at LR-upload time, later refined to
  // 'Partial Paid'/'Paid' by Finance settling it in amounts (see lrPaidAmount) — kept
  // separate from `paymentStatus` above (which tracks the vendor invoice amount paid).
  lrPaymentStatus: { type: String, enum: ['Paid', 'Partial Paid', 'Not Paid'] },
  // How much of `amount` Finance has settled against the LR/freight so far — drives
  // lrPaymentStatus once Finance starts paying in parts (Financial → Reimbursement
  // Expense → LR Payment tab).
  lrPaidAmount: { type: Number, default: 0 },
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
  // CGST/SGST/IGST breakdown as printed on the received invoice (AI-scanned at scanInvoice,
  // confirmed by the user on receive) — the GST Report/Purchase Report previously had no real
  // Input GST source at all beyond guessing a flat 50/50 CGST/SGST split off InventoryItem's
  // master gstPercent (which defaults to 0 and is rarely set), so Purchase GST always showed
  // ₹0. These carry the invoice's ACTUAL tax split (including inter-state IGST-only bills)
  // through to reports.controller.js's explodePurchaseOrderItems.
  receivedInvoiceCgstAmount: Number,
  receivedInvoiceSgstAmount: Number,
  receivedInvoiceIgstAmount: Number,
  receivedInvoiceGstAmount: Number,
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
    // Taxable (GST-exclusive) per-unit purchase price actually credited to this item's
    // purchaseBatches — see InventoryItem.purchaseBatches.purchasePrice.
    purchasePrice: Number,
    gstPercent: Number,
    // How the user entered purchasePrice on this line — 'exclusive' or 'inclusive' of GST.
    priceType: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
    // True when this line was found on the invoice but wasn't part of the original PO —
    // resolved to an Inventory item (by Item Code, name match, or created new) and credited
    // to stock same as any ordered line, just flagged here for reporting/audit purposes.
    extra: { type: Boolean, default: false },
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
