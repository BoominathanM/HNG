const mongoose = require('mongoose');

const kitItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  qty: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  unit: String,
}, { _id: false });

const kitSchema = new mongoose.Schema({
  kitCode: { type: String, unique: true },
  kitName: { type: String, required: [true, 'Kit name is required'], trim: true },
  displayUnit: String,
  size: String,
  products: [kitItemSchema],
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Kit', kitSchema);
