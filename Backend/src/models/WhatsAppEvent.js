const mongoose = require('mongoose');

const whatsAppEventSchema = new mongoose.Schema({
  key:             { type: String, required: true, unique: true },
  label:           { type: String, required: true },
  description:     { type: String, default: '' },
  availableFields: [{ type: String }],
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppEvent', whatsAppEventSchema);
