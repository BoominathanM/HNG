const mongoose = require('mongoose');

// A self/3rd-party pickup job for a dispatched order (Dispatch → Pickup Orders tab).
const pickupOrderSchema = new mongoose.Schema({
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchRecord' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderCode: String,
  clientName: String,
  destination: String,
  pickupEmpId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  pickupPersonName: String,
  taken: { type: Boolean, default: false },
  scheduledDate: Date,
  amount: Number,
  paymentBy: { type: String, enum: ['Finance', 'Pickup Team', ''], default: '' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  proofUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PickupOrder', pickupOrderSchema);
