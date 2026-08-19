const mongoose = require('mongoose');

// Per-user snooze/stop overlay on top of AlertConfig/AlertFireLog. The scheduler's
// cadence tracking (AlertFireLog) stays global and untouched — this is purely a
// per-user suppression checked by getActiveAlerts (modules/alerts/alerts.controller.js)
// before an alert is returned to that user's poll.
const alertSnoozeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Same `${configId}:${recordType}:${recordId}` key AlertListener already uses.
  alertKey: { type: String, required: true },
  configId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertConfig', required: true },
  recordType: { type: String, required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  // Denormalized at action time so the admin listing doesn't need to re-join
  // against records that may have since resolved/changed.
  group: String,
  role: String,
  title: String,
  action: { type: String, enum: ['snooze', 'stop'], required: true },
  snoozeMinutes: Number,   // only meaningful for action:'snooze'
  snoozedUntil: Date,      // only meaningful for action:'snooze'
}, { timestamps: true });

// One active snooze/stop per user per alert instance — re-snoozing/stopping upserts.
alertSnoozeSchema.index({ userId: 1, alertKey: 1 }, { unique: true });
// Belt-and-suspenders cleanup, same pattern as AlertFireLog — rows for
// long-resolved records self-expire even if nothing else ever clears them.
alertSnoozeSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('AlertSnooze', alertSnoozeSchema);
