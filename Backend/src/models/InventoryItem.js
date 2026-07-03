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
  // Reflects the most recent purchase; full per-vendor purchase history lives in purchaseBatches below.
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  // One entry per purchase (vendor + date + qty). Lets the same product be bought from different
  // vendors over time; remainingQty is drawn down oldest-purchaseDate-first when orders deduct stock,
  // so an older vendor's batch is always used up before a newer one.
  purchaseBatches: [{
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorName: String,
    purchaseDate: { type: Date, default: Date.now },
    qty: { type: Number, default: 0 },
    remainingQty: { type: Number, default: 0 },
  }],
  productAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
