const mongoose = require('mongoose');

const packingMaterialConfigSchema = new mongoose.Schema({
  type: { type: String, enum: ['displayUnit', 'packingMaterial'], required: true },
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  // Only for displayUnit entries: which Operations tab this unit maps to
  tabMapping: { type: String, enum: ['Box', 'Ziplock', 'Sticker', null], default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

packingMaterialConfigSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('PackingMaterialConfig', packingMaterialConfigSchema);
