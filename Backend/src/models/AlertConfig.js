const mongoose = require('mongoose');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// One doc per alert group — 4 fixed for `design` (one per vendor role) + 1 for
// `sales_approval` + 1 for `operations_approval` + 1 for `task` + 1 for
// `dispatch_reason` + 1 for `dispatch_status` + 1 for `lr_payment` + 1 for
// `low_stock` + 1 for `quotation_request` + 1 for `short_received`. Seeded
// idempotently at startup (see utils/autoSeed.js) so the Settings UI always edits
// known rows.
const alertConfigSchema = new mongoose.Schema({
  group: { type: String, enum: ['design', 'sales_approval', 'operations_approval', 'task', 'dispatch_reason', 'dispatch_status', 'lr_payment', 'low_stock', 'quotation_request', 'short_received'], required: true },
  // Only set (and only meaningful) for group:'design'. Matches User.role values
  // (e.g. 'Ziplock'), NOT StickerRequest.stickerType (e.g. 'Frosted Ziplock') —
  // see ROLE_TO_STICKER_TYPE in utils/alertConfigQueries.js for the translation.
  role: { type: String, enum: ['Sticker', 'Box', 'Ziplock', 'Butter Paper', 'Wooden Brush', 'Other', null], default: null },
  recipientUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startTime: { type: String, default: '09:00' }, // HH:mm
  endTime: { type: String, default: '18:00' },   // HH:mm
  days: { type: [{ type: String, enum: DAYS }], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  durationMinutes: { type: Number, default: 30 }, // repeat cadence while still pending
  // Only set (and only meaningful) for group:'low_stock'/'quotation_request' — how long a
  // record must stay pending (stock still short / quotation still not raised) before the
  // FIRST alert fires. Every other group fires immediately on first-seen-pending.
  graceValue: { type: Number, default: null },
  graceUnit: { type: String, enum: ['hours', 'days'], default: 'days' },
  audioUrl: String,
  audioPublicId: String,    
  audioName: String,
  isEnabled: { type: Boolean, default: false }, // off until an admin sets recipients + audio
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

alertConfigSchema.index({ group: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('AlertConfig', alertConfigSchema);
