const mongoose = require('mongoose');

const dispatchRecordSchema = new mongoose.Schema({
  dispatchCode: { type: String, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  dispatchType: { type: String, enum: ['Full Dispatch', 'Partial Dispatch'] },
  invoiceNumber: String,
  invoiceDate: Date,
  invoiceFileUrl: String,
  autoNotify: { type: Boolean, default: true },
  sendWhatsapp: { type: Boolean, default: true },
  lrNumber: String,
  trackingUrl: String,
  lrFileUrl: String,
  status: { type: String, enum: ['Draft', 'Confirmed', 'Dispatched'], default: 'Draft' },
  dispatchedAt: Date,
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    qtyOrdered: Number,
    qtyDispatched: Number,
    verified: { type: Boolean, default: false },
    boxPhotoUrl: String,
  }],
  // Pickup reimbursement
  pickupEmpId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  pickupAmount: Number,
  pickupProofUrl: String,
  pickupGPayNumber: String,
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paymentProofUrl: String,
  paidDate: Date,
  paidBy: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('DispatchRecord', dispatchRecordSchema);
