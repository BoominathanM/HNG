const mongoose = require('mongoose');

// One document per line-item quantity REDUCTION ("less") made through Billing's Edit Pricing
// modal (billing.controller.js applyOrderPriceEdit / applyOrphanItemsPriceEdit). Decoupled
// from Invoice/Quotation.priceEditHistory on purpose: the Damaged Report and Profit & Loss
// both read this as a flat `find(dateFilter)` instead of scanning every invoice's history
// array, and each reduction carries its OWN free-text reason (priceEditHistory has one reason
// per edit batch).
//
// amountReduced* / costBasisLoss / revenueBasisLoss are all snapshotted at write time —
// unitCost from InventoryItem.purchasePrice as it stood then (same primary source
// reports.controller's buildItemCostIndex prefers), so a later cost-price change doesn't
// silently rewrite historical P&L.
const damageLogSchema = new mongoose.Schema({
  docType: { type: String, enum: ['Invoice', 'Quotation'], required: true },

  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: String,
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  quotCode: String,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderCode: String,

  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  clientName: String,

  itemName: { type: String, required: true },
  isKit: { type: Boolean, default: false },
  kitId: String,
  kitName: String,
  category: String,

  oldQty: { type: Number, default: 0 },
  newQty: { type: Number, default: 0 },
  qtyReduced: { type: Number, default: 0 },

  rate: { type: Number, default: 0 },
  gstPct: { type: Number, default: 0 },
  amountReducedExclGst: { type: Number, default: 0 },
  amountReducedInclGst: { type: Number, default: 0 },

  unitCost: { type: Number, default: 0 },
  costBasisLoss: { type: Number, default: 0 },
  revenueBasisLoss: { type: Number, default: 0 },

  reason: { type: String, required: true },
  damageDate: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

damageLogSchema.index({ damageDate: -1 });
damageLogSchema.index({ invoiceId: 1 });
damageLogSchema.index({ quotationId: 1 });

module.exports = mongoose.model('DamageLog', damageLogSchema);
