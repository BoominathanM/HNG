const mongoose = require('mongoose');

// Singleton config (findOne()/upsert, same pattern as CompanySettings) for the
// sound the navbar bell plays when a new Notification document is created.
// Kept in its own schema — not a CompanySettings field — since it belongs to
// the Notifications module specifically, not general company/invoice settings.
const notificationSoundConfigSchema = new mongoose.Schema({
  audioUrl: String,
  audioPublicId: String,
  audioName: String,
  isEnabled: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('NotificationSoundConfig', notificationSoundConfigSchema);
