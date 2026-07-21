const mongoose = require('mongoose');

// Persisted cadence guard — one row per (config, record). Tracks the last time
// an alert was "rung" for a pending record so the scheduler only bumps it once
// `durationMinutes` has elapsed, and so the frontend's active-alerts poll has a
// stable `firedAt` to diff against instead of re-playing the sound every tick.
//
// Deliberately persisted rather than an in-memory Map (contrast with
// utils/localPurchaseCreditDueScheduler.js's guard): a server restart resetting
// an in-memory guard would make every still-pending record look "brand new" on
// the next cron tick, bursting every recipient's audio alert simultaneously.
const alertFireLogSchema = new mongoose.Schema({
  configId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertConfig', required: true },
  recordType: { type: String, enum: ['StickerRequest', 'Order'], required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lastFiredAt: { type: Date, required: true },
}, { timestamps: true });

alertFireLogSchema.index({ configId: 1, recordType: 1, recordId: 1 }, { unique: true });
// Belt-and-suspenders cleanup — rows for long-resolved records self-expire
// even if a delete was ever missed by the scheduler's own reconciliation.
alertFireLogSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('AlertFireLog', alertFireLogSchema);
