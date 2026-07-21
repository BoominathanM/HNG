const mongoose = require('mongoose');

// Singleton document — mirrors WhatsAppConfig's pattern (encrypted secret,
// select:false so it's never accidentally returned by a plain .find()).
const aiConfigSchema = new mongoose.Schema({
  provider:        { type: String, default: 'openai' },
  apiKey:          { type: String, select: false }, // encrypted at rest, see utils/encryption.js
  model:           { type: String, default: 'gpt-5.5' },
  isEnabled:       { type: Boolean, default: false },
  isConnected:     { type: Boolean, default: false },
  connectionError: { type: String, default: '' },
  lastVerifiedAt:  Date,
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AiConfig', aiConfigSchema);
