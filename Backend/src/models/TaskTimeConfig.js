const mongoose = require('mongoose');

// Per-task time standard: how long ONE unit of a given task takes.
// Scope is per task NAME (global). An optional `product` allows a future
// product-specific override; '' (default) is the global value that the
// estimate lookup falls back to.
const taskTimeConfigSchema = new mongoose.Schema({
  taskName: { type: String, required: true, trim: true }, // e.g. "Sticker placing", "Packing"
  product: { type: String, trim: true, default: '' },     // '' = global default
  // Canonical time per 1 unit, in seconds — the single value the estimate math uses.
  timePerUnitSec: { type: Number, required: true, min: 0 },
  // Round-trip of what the user actually typed, so the config UI re-shows it in their unit.
  inputValue: { type: Number, default: 0 },
  inputUnit: { type: String, enum: ['sec', 'min', 'hr'], default: 'min' },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// One time standard per (taskName, product) — global and per-product overrides coexist.
taskTimeConfigSchema.index({ taskName: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('TaskTimeConfig', taskTimeConfigSchema);
