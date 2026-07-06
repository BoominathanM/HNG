const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  movementType: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'CHECK'], required: true },
  qty: { type: Number, required: true },
  qtyBefore: Number,
  qtyAfter: Number,
  reason: String,
  reasonType: { type: String, enum: ['Known', 'Unknown'] },
  // Session-level "Additional Notes" typed once in the Live Staff Check submit modal —
  // shared across every discrepancy created by that same submission (distinct from
  // `reason`, which is the per-item Known/Unknown explanation).
  notes: String,
  referenceType: { type: String, enum: ['Order', 'Purchase', 'Sale', 'Check', 'Opening', 'Manual'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  supplyPrice: Number,
  sellPrice: Number,
  departureDate: Date,
  // Which vendor batch this movement drew from/added to — vendorName is a point-in-time snapshot
  // (kept even if the vendor is later renamed/deleted) so Stock History always shows a vendor.
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: String,
  purchaseDate: Date,
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockMovementSchema.index({ itemId: 1, createdAt: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
