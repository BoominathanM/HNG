const mongoose = require('mongoose');

const localPurchaseSchema = new mongoose.Schema({
  lpCode: { type: String, unique: true },
  // Which pool this purchase's items land in — 'inventory' (default, unchanged historical
  // behavior) adds to InventoryItem/Stock Inventory as always. 'material_stock' instead adds
  // to MaterialStock (Inventory > Material Stocks, packing materials tracked by name+size).
  purchaseTarget: { type: String, enum: ['inventory', 'material_stock'], default: 'inventory' },
  invoiceNo: { type: String, required: true },
  // Date printed on the invoice itself (from AI scan or manual entry) — used as the
  // purchaseDate on this purchase's InventoryItem.purchaseBatches, distinct from
  // createdAt/timestamps below which just tracks when this record was entered.
  invoiceDate: Date,
  invoiceFileUrl: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: String,
  vendorPhone: String,
  items: [{
    itemName: String,
    // Optional — set when the entered item should merge into an existing Inventory item
    // by code rather than being matched by name (same convention as Inventory's Add Item
    // mergeItemCode). Left blank, addLocalPurchaseStock falls back to matching by itemName.
    // When purchaseTarget === 'material_stock', this same field instead holds a MaterialStock
    // materialCode to merge into (addLocalPurchaseMaterialStock falls back to name+size match).
    itemCode: String,
    // Only meaningful when purchaseTarget === 'material_stock' — packing-material size (e.g.
    // "15ml"), part of the name+size match key used everywhere else Material Stock is matched.
    size: String,
    // Only meaningful when purchaseTarget === 'material_stock' — scopes the added/merged stock
    // to a hotel, same field as MaterialStock.hotelName. Left blank, the stock is generic/pooled.
    hotelName: String,
    qty: Number,
    unit: String,
    amount: Number,
    // GST rate for this line, if the invoice showed one — used with priceType to work out
    // the taxable (GST-exclusive) unit cost credited to InventoryItem.purchaseBatches.
    gstPercent: { type: Number, default: 0 },
    // Whether `amount` (the line total) was entered/scanned as GST-inclusive or -exclusive.
    priceType: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
    // 'standard': added straight to Stock Inventory as normal sellable/usable stock.
    // 'bulk': raw liquid/powder (unit must be Litres/Kg) — lands on Inventory's Bulk tab
    // instead, same as a Bulk item created directly there; filled from later via Fill Stock.
    itemType: { type: String, enum: ['standard', 'bulk'], default: 'standard' },
  }],
  totalAmount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['instant', 'credit'], default: 'credit' },
  paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid'], default: 'Pending' },
  paymentProofUrl: String,
  gPayNumber: String,
  paidDate: Date,
  paidBy: String,
  // Only set when paidBy === 'Purchase Person' — links to the PurchasePerson master record
  // plus a point-in-time snapshot of name/phone (so history reads correctly even if the
  // person record is later edited).
  purchasePersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchasePerson' },
  purchasePersonName: String,
  purchasePersonPhone: String,
  // Credit ("Pay Later") reminder — when the vendor should be paid; the escalation
  // window/frequency itself is configured on the WhatsAppEventMapping, not per-record.
  dueDate: Date,
  paymentHistory: [{
    amount: { type: Number, required: true },
    paidBy: String,
    paidDate: { type: Date, default: Date.now },
    proofUrl: String,
    note: String,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LocalPurchase', localPurchaseSchema);
