const mongoose = require('mongoose');

// Generic store for user-added dropdown values so newly added options
// (product types, kit types, display units, sources, brands, etc.) persist.
const dropdownOptionSchema = new mongoose.Schema({
  field: { type: String, required: true, index: true },
  value: { type: String, required: true },
  label: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dropdownOptionSchema.index({ field: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('DropdownOption', dropdownOptionSchema);
