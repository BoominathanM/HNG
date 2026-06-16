const mongoose = require('mongoose');

const kitItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  category: String,
  qty: { type: Number, default: 1 },
  unit: String,
  defaultSize: String,
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  gst: String,
  hsnCode: String,
  discountPercent: { type: Number, default: 0 },
  packingMaterial: String,
  materialCategory: String,
  brand: String,
  rate: { type: Number, default: 0 },
}, { _id: false });

const kitSchema = new mongoose.Schema({
  kitCode: { type: String, unique: true },
  kitName: { type: String, required: [true, 'Kit name is required'], trim: true },
  displayUnit: String,
  size: String,
  kitAttributes: { type: mongoose.Schema.Types.Mixed, default: {} },
  products: [kitItemSchema],
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Kit', kitSchema);
