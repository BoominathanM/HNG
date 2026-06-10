const mongoose = require('mongoose');

const whatsAppConfigSchema = new mongoose.Schema({
  backendUrl:               { type: String, default: '' },
  apiToken:                 { type: String, select: false },
  sendTemplatePath:         { type: String, default: '' },
  isEnabled:                { type: Boolean, default: false },
  isConnected:              { type: Boolean, default: false },
  connectionError:          { type: String, default: '' },
  lastVerifiedAt:           { type: Date },
  lastSyncedAt:             { type: Date },
  lastSyncCount:            { type: Number, default: 0 },
  syncStatus:               { type: String, enum: ['idle', 'syncing', 'success', 'error'], default: 'idle' },
  lastTemplatesListEndpoint: { type: String, default: '' },
  createdBy:                { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:                { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppConfig', whatsAppConfigSchema);
