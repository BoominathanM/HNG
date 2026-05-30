const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  entryDate: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ['Invoice', 'Payment', 'Credit Note', 'Debit Note', 'Opening Balance'],
    required: true,
  },
  docRef: String,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: Number,
  note: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ledgerEntrySchema.index({ partyId: 1, entryDate: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
