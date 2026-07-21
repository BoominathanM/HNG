const mongoose = require('mongoose');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// One doc per alert group — 4 fixed for `design` (one per vendor role) + 1 for
// `sales_approval` + 1 for `operations_approval` + 1 for `task`. Seeded
// idempotently at startup (see utils/autoSeed.js) so the Settings UI always
// edits known rows.
const alertConfigSchema = new mongoose.Schema({
  group: { type: String, enum: ['design', 'sales_approval', 'operations_approval', 'task'], required: true },
  // Only set (and only meaningful) for group:'design'. Matches User.role values
  // (e.g. 'Ziplock'), NOT StickerRequest.stickerType (e.g. 'Frosted Ziplock') —
  // see ROLE_TO_STICKER_TYPE in utils/alertConfigQueries.js for the translation.
  role: { type: String, enum: ['Sticker', 'Box', 'Ziplock', 'Butter Paper', null], default: null },
  recipientUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startTime: { type: String, default: '09:00' }, // HH:mm
  endTime: { type: String, default: '18:00' },   // HH:mm
  days: { type: [{ type: String, enum: DAYS }], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  durationMinutes: { type: Number, default: 30 }, // repeat cadence while still pending
  audioUrl: String,
  audioPublicId: String,
  audioName: String,
  isEnabled: { type: Boolean, default: false }, // off until an admin sets recipients + audio
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

alertConfigSchema.index({ group: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('AlertConfig', alertConfigSchema);
