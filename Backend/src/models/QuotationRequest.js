const mongoose = require('mongoose');

// Tracks the "asked a vendor for a quotation" step of the Purchase flow — a step that,
// until now, only existed client-side (see Purchase/index.jsx's WHATSAPP_SENT_ITEMS
// localStorage set). Exists purely so the Quotation Request Alert (AlertConfig
// group:'quotation_request') has a real anchor timestamp to measure its configured
// grace period from, and so "Ask Quotation"/"Re-Ask Quotation" share one record instead
// of each maintaining its own separate reminder state.
const quotationRequestSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  itemName: { type: String, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: String,
  askedAt: { type: Date, required: true, default: Date.now },
  // Bumped on every "Re-Ask Quotation" — the alert's grace period is measured from
  // whichever of askedAt/reAskedAt is most recent, so a re-ask restarts the countdown.
  reAskedAt: { type: Date, default: null },
  askCount: { type: Number, default: 1 },
  status: { type: String, enum: ['asked', 'raised', 'cancelled'], default: 'asked' },
  // Set once Purchase actually raises a request for this item (raiseRequest) — the event
  // that resolves this record and stops it alerting.
  purchaseRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', default: null },
  raisedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

quotationRequestSchema.index({ itemId: 1, status: 1 });

module.exports = mongoose.model('QuotationRequest', quotationRequestSchema);
