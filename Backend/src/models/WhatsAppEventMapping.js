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
  sendTime:   { type: String, default: '08:00' },
  // Escalation config (currently used by the Local Purchase Credit Due event) —
  // repeats the send every `delayMinutes` between startTime/endTime, on the given
  // days, to a fixed list of internal recipients rather than the daily-once sendTime.
  recipientUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startTime:    String,
  endTime:      String,
  delayMinutes: Number,
  days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppEventMapping', whatsAppEventMappingSchema);
