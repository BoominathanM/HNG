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
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Quotation', quotationSchema);
