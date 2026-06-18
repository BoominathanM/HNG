const mongoose = require('mongoose');

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
  items: [{
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
  }],
  note: String,
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('Quotation', quotationSchema);
