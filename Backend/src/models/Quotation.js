const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  quotCode: { type: String, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  clientName: { type: String, required: true },
  quoteDate: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  advancePaid: { type: Number, default: 0 },
  balance: Number,
  type: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid', 'In Process'],
    default: 'Unpaid',
  },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    unit: String,
    price: Number,
    qty: Number,
    lineTotal: Number,
  }],
  note: String,
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);
