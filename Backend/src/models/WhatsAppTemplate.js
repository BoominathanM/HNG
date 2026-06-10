const mongoose = require('mongoose');

const whatsAppTemplateSchema = new mongoose.Schema({
  externalId:   { type: String, default: '' },
  name:         { type: String, required: true },
  language:     { type: String, default: 'en' },
  status:       { type: String, default: 'APPROVED' },
  category:     { type: String, default: 'UTILITY' },
  components:   [{ type: mongoose.Schema.Types.Mixed }],
  variables:    [{ type: String }],
  rawPayload:   { type: mongoose.Schema.Types.Mixed },
  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

whatsAppTemplateSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
