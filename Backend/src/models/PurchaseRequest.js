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
