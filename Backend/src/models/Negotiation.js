const mongoose = require('mongoose');

// Per-item sub-schema. strict:false so dynamic product specifications and any future
// field survive (an inline array sub-schema is implicitly strict:true even when the
// parent doc is strict:false, which previously stripped shape/fragrance/etc.).
const negotiationItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  itemName: String,
  unit: String,
  price: Number,
  qty: Number,
  lineTotal: Number,
  // Operations/packaging fields carried through so negotiation → order keeps routing data
  logoType: String,
  packaging: String,
  packingMaterial: String,
  material: String,
  sticker: String,
  printing: String,
  size: String,
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

const negotiationSchema = new mongoose.Schema({
  negCode: { type: String, unique: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  clientName: { type: String, required: true },
  negDate: { type: Date, default: Date.now },
  amount: Number,
  gstAmount: { type: Number, default: 0 },
  total: Number,
  advancePaid: { type: Number, default: 0 },
  balance: Number,
  type: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid',
  },
  items: [negotiationItemSchema],
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Negotiation', negotiationSchema);
