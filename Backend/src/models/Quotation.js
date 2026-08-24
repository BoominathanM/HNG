const mongoose = require('mongoose');

// Per-item sub-schema. strict:false so dynamic product specifications and any future
// field survive (an inline array sub-schema is implicitly strict:true even when the
// parent doc is strict:false, which previously stripped shape/fragrance/etc.).
const quotationItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  itemName: String,
  unit: String,
  price: Number,
  qty: Number,
  lineTotal: Number,
  // Operations/packaging + kit fields carried through so quotation → negotiation → order
  // keeps routing data and the order-composition category.
  logoType: String,
  packaging: String,
  packingMaterial: String,
  material: String,
  sticker: String,
  printing: String,
  size: String,
  stickerSize: String,
  gst: Number,
  isKit: Boolean,
  kitId: String,
  kitName: String,
  kitType: String,
  // Order-composition category: personalized | separate_kit | separate_product
  category: { type: String, default: '' },
  // ─── Dynamic product specifications ───
  shape: String,
  stickerShape: String,
  fragrance: String,
  stickerPrinting: String,
  color: String,
  bottleType: String,
  brand: String,
  hsnCode: String,
  discountPercent: Number,
  logo: String,
  materialCategory: String,
  specification: String,
  otherSpecs: mongoose.Schema.Types.Mixed,
  productAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  attachments: [mongoose.Schema.Types.Mixed],
  displayUnit: String,
  kitPrice: Number,
  overallQty: Number,
  kitIncludes: [mongoose.Schema.Types.Mixed],
}, { strict: false });

const quotationSchema = new mongoose.Schema({
  quotCode: { type: String, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  clientName: { type: String, required: true },
  quoteDate: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  balance: Number,
  type: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'In Process'],
    default: 'Unpaid',
  },
  items: [quotationItemSchema],
  note: String,
  // Audit trail for price/GST revisions made via updateQuotationPricing (Billing's "Edit
  // Pricing" modal) — mirrors Invoice.priceEditHistory's shape/purpose.
  priceEditHistory: [{
    reason: String,
    oldSubtotal: Number,
    newSubtotal: Number,
    oldGstAmount: Number,
    newGstAmount: Number,
    oldTotal: Number,
    newTotal: Number,
    // Human-readable summary of what kind of edit this was (e.g. "Price Edited, Quantity
    // Edited") — derived from priceChanged/qtyChanged/gstChanged, surfaced by the Billing
    // "Price Edit Logs" modal and the "Edited Invoice & Quotation Report".
    changeType: String,
    priceChanged: Boolean,
    qtyChanged: Boolean,
    gstChanged: Boolean,
    // Per-line-item breakdown of exactly what changed in this edit, for the report's detailed
    // view — a name-only snapshot (not itemId-linked) since the source row may since have moved.
    itemChanges: [{
      name: String,
      oldRate: Number,
      newRate: Number,
      oldQty: Number,
      newQty: Number,
      oldGst: Number,
      newGst: Number,
    }],
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
  }],
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Quotation', quotationSchema);
