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
    // ─── Operations / packaging fields ───
    logoType: { type: String, enum: ['Sticker', 'Box', 'Frosted Ziplock', 'None', ''], default: '' },
    size: String,
    packaging: String,
    material: String,
    rate: Number,
    boxes: Number,
    inventoryStock: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ─── Operations workflow tracking ───
  isUrgent: { type: Boolean, default: false },
  isEmergency: { type: Boolean, default: false },
  deliveryType: { type: String, enum: ['Full', 'Partial', ''], default: '' },
  // Partial-delivery tracking: partial qty processed now, balance as a follow-on entry (same order ID).
  partialQty: { type: Number, default: 0 },
  balanceQty: { type: Number, default: 0 },
  partialDeliveries: [{
    qty: Number,
    balanceQty: Number,
    note: String,
    status: { type: String, default: 'Pending' },
    at: { type: Date, default: Date.now },
  }],
  designStatus: { type: String, default: '' },
  printingStatus: { type: String, enum: ['Yet to Receive', 'Received', 'Closed', ''], default: '' },
  stockStatus: { type: String, default: '' },
  operationStage: { type: String, default: '' },
  taskStatus: { type: String, default: '' },
  orderCategory: { type: String, enum: ['ORDER', 'SAMPLE'], default: 'ORDER' },
  location: String,
  clientPhone: String,
  paymentProofs: [mongoose.Schema.Types.Mixed],
  splitDates: [mongoose.Schema.Types.Mixed],
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

orderSchema.index({ status: 1, deletedAt: 1 });
orderSchema.index({ clientPartyId: 1 });

module.exports = mongoose.model('Order', orderSchema);
