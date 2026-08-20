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
  // 'standard' (default): a normal stocked item, unchanged behavior.
  // 'bulk': raw liquid/powder tracked in Litres/Kg (e.g. "Coconut Oil - Bulk") — behaves
  // exactly like a standard item (currentStock/purchaseBatches work as-is); its stock is
  // only ever consumed via the /fill action below, never directly by an order.
  // 'filled': a sellable per-piece SKU (e.g. "Coconut Oil 10ml") packed from a bulk item.
  // unit/unitValue are repurposed to describe the fill size (e.g. unit='ml', unitValue=10 —
  // matches the existing "quantity per unit" meaning of unitValue). Once filled it has its
  // own real currentStock/purchaseBatches and is deducted by orders like any other item —
  // only the act of filling (POST /inventory/:id/fill) draws down the linked bulk item.
  itemType: { type: String, enum: ['standard', 'bulk', 'filled'], default: 'standard' },
  bulkSourceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  // % of bulk material lost to spillage/waste while filling — inflates how much bulk stock
  // a fill run consumes for the same number of good pieces produced.
  fillWastagePercent: { type: Number, default: 0 },
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
    // Per-batch cost captured from the purchase invoice at receive time — always the taxable
    // (GST-exclusive) unit price, regardless of how the invoice quoted it (see priceType).
    // Distinct from the item-level `purchasePrice` above, which only mirrors the most recent
    // batch for list/detail display; full price-per-vendor history lives here.
    purchasePrice: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    // How the purchasePrice was entered on the source invoice — 'exclusive' (rate excl. GST,
    // the normal case) or 'inclusive' (rate already includes GST, backed out before saving
    // the taxable base above). Kept for audit/display only.
    priceType: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
  }],
  productAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
