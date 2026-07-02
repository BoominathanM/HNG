const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemCode: { type: String, unique: true },
  itemName: { type: String, required: [true, 'Item name is required'], trim: true },
  category: String,
  unit: { type: String, default: 'Pcs' },
  unitValue: { type: Number, default: 0 },
  defaultSize: String,
  openingStock: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  marginAmount: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  hsnCode: String,
  gstPercent: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  packingMaterial: String,
  materialCategory: String,
  brand: String,
  // Vendor this item is purchased from — set when the item is added/edited in Inventory.
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  productAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
