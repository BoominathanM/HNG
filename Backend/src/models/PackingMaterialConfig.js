const mongoose = require('mongoose');

const subtypeSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  size: { type: String, trim: true, default: '' },
  sticker: { type: String, enum: ['YES', 'NO', ''], default: '' },
  logo: { type: String, enum: ['YES', 'NO', ''], default: '' },
  printing: { type: String, enum: ['YES', 'NO', ''], default: '' },
  lamination: { type: String, enum: ['YES', 'NO', ''], default: '' },
  purchasePrice: { type: Number, default: 0 },
  marginAmount: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
}, { _id: false });

const packingMaterialConfigSchema = new mongoose.Schema({
  type: { type: String, enum: ['displayUnit', 'packingMaterial'], required: true },
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  // Only for displayUnit entries: which Operations tab this unit maps to
  tabMapping: { type: String, enum: ['Box', 'Ziplock', 'Sticker', null], default: null },
  subtypes: [subtypeSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

packingMaterialConfigSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('PackingMaterialConfig', packingMaterialConfigSchema);
