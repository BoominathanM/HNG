const mongoose = require('mongoose');

const materialStockSchema = new mongoose.Schema({
  packingMaterial: { type: String, required: true },
  size: { type: String, default: '' },
  stockCount: { type: Number, required: true, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  vendor: { type: String, default: '' },
  notes: { type: String, default: '' },
  invoiceFile: {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MaterialStock', materialStockSchema);
