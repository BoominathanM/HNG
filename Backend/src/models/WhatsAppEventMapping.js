const mongoose = require('mongoose');

const variableSchema = new mongoose.Schema({
  templateVariable: { type: String },
  eventField:       { type: String },
}, { _id: false });

const whatsAppEventMappingSchema = new mongoose.Schema({
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppEvent', required: true, unique: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppTemplate', required: true },
  isEnabled:  { type: Boolean, default: true },
  variables:  [variableSchema],
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppEventMapping', whatsAppEventMappingSchema);
