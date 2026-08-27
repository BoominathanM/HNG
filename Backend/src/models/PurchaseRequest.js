const mongoose = require('mongoose');

const purchaseRequestSchema = new mongoose.Schema({
  requestCode: { type: String, unique: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  itemName: String,
  category: String,
  qty: { type: Number, required: true },
  unit: String,
  paymentTerms: String,
  firstReminderDate: Date,
  secondReminderDate: Date,
  quotationFileUrl: String,
  quotationFiles: [{
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
  amount: Number,
  gstAmount: Number,
  // CGST/SGST/IGST split as printed on the AI-scanned supplier quotation (set alongside
  // gstAmount by uploadQuotationFile / the Raise Request + Ask Quotation scan flows). An
  // inter-state quotation prints IGST only; intra-state prints CGST+SGST — never both.
  // Carried onto the PurchaseOrder at approval (purchaseOrderSync) so the GST / Purchase
  // reports have a real Input-GST split even before the goods invoice is scanned at receiving.
  cgstAmount: Number,
  sgstAmount: Number,
  igstAmount: Number,
  requestType: { type: String, enum: ['individual', 'bulk'], default: 'individual' },
  batchId: { type: String, default: null },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Modification'], default: 'Pending' },
  financeNote: String,
  notes: [{
    text: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseRequestSchema.index({ status: 1 });

module.exports = mongoose.model('PurchaseRequest', purchaseRequestSchema);
