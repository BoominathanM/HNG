const mongoose = require('mongoose');

// Append-only audit trail for every alert-related event — unlike AlertFireLog
// (a per-record "last fired" gate, overwritten in place) and AlertSnooze (a
// per-user "current state" row, deleted on clear), this never gets overwritten
// or deleted by the normal alert flow, so Settings > Alert Logs can show the
// full history of what happened to an alert, not just its current state.
const alertLogSchema = new mongoose.Schema({
  event: { type: String, enum: ['fired', 'snoozed', 'stopped', 'cleared', 'expired'], required: true },
  configId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertConfig', required: true },
  recordType: { type: String, required: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  group: String,
  role: String,
  title: String,
  // The user who acted (snoozed/stopped it themselves, or the admin who cleared
  // someone else's). Null for 'fired' — that's the scheduler, not a person.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // 'cleared' only — whose snooze/stop was cleared (may differ from `userId`,
  // the admin who did the clearing).
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  minutes: Number, // 'snoozed' only
}, { timestamps: true });

alertLogSchema.index({ createdAt: -1 });
// 90-day retention — longer than AlertFireLog/AlertSnooze's 30d since this is
// the actual audit trail, not a live-state guard row.
alertLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('AlertLog', alertLogSchema);
