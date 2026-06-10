const mongoose = require('mongoose');

// A dedicated archive collection. Every soft-deleted record across the app is
// mirrored here so the Settings → Deleted Records tab can read from a single
// place (instead of scanning every module) and always surface "deleted by".
// `refId` + `type` uniquely identify the original document so it can be
// restored, and `snapshot` keeps a full copy of the record at deletion time.
const deletedRecordSchema = new mongoose.Schema({
  type:     { type: String, required: true },   // restore key, e.g. 'parties', 'leads'
  module:   { type: String, required: true },   // human label, e.g. 'Parties & Ledger'
  name:     { type: String, default: '—' },     // display name of the record
  refId:    { type: mongoose.Schema.Types.ObjectId, required: true }, // original doc _id
  snapshot: { type: mongoose.Schema.Types.Mixed },                    // full doc at delete time
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One archive entry per original document.
deletedRecordSchema.index({ type: 1, refId: 1 }, { unique: true });

module.exports = mongoose.model('DeletedRecord', deletedRecordSchema);
