const mongoose = require('mongoose');

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
  items: [{
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
  }],
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Negotiation', negotiationSchema);
