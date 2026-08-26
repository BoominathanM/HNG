const mongoose = require('mongoose');

const materialStockSchema = new mongoose.Schema({
  // Auto-generated (generateCode('MS')) on every create path — Inventory's own "Add Packing
  // Material Purchase" modal and Local Purchase's Material Stocks target — so the "pick a
  // code to merge into" dropdown always has data regardless of where a row originated.
  materialCode: { type: String, unique: true, sparse: true },
  packingMaterial: { type: String, required: true },
  size: { type: String, default: '' },
  stockCount: { type: Number, required: true, default: 0 },
  // 0 = no low-stock alert, same convention as InventoryItem.minStock.
  minStock: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  vendor: { type: String, default: '' },
  hotelName: { type: String, default: '' },
  notes: { type: String, default: '' },
  invoiceFile: {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MaterialStock', materialStockSchema);
