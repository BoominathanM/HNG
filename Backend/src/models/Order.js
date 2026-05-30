const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  negotiationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negotiation' },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  clientName: { type: String, required: true },
  clientPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  product: String,
  qty: Number,
  amount: Number,
  gstAmount: { type: Number, default: 0 },
  total: Number,
  advancePaid: { type: Number, default: 0 },
  balance: Number,
  type: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  status: {
    type: String,
    enum: ['In Production', 'Dispatch Ready', 'Dispatched', 'Payment Pending', 'Completed', 'Closed', 'Cancelled'],
    default: 'In Production',
  },
  paymentTerms: String,
  paymentReminderDate: Date,
  advancePaidAmount: { type: Number, default: 0 },
  expectedDeliveryDate: Date,
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    unit: String,
    price: Number,
    qty: Number,
    lineTotal: Number,
  }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

orderSchema.index({ status: 1, deletedAt: 1 });
orderSchema.index({ clientPartyId: 1 });

module.exports = mongoose.model('Order', orderSchema);
