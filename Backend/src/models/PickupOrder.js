const mongoose = require('mongoose');

// A self/3rd-party pickup job — either a dispatched customer Order (Dispatch → Pickup
// Orders tab) or an incoming vendor shipment raised from Purchase's LR upload
// (purchaseOrderId set instead of orderId). scheduledDate drives the "Today's Pickup
// Orders" tab and comes from the customer's expectedDeliveryDate or the LR's
// expectedDeliveryDate respectively.
const pickupOrderSchema = new mongoose.Schema({
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchRecord' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  orderCode: String,
  clientName: String,
  destination: String,
  pickupEmpId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  pickupPersonName: String,
  taken: { type: Boolean, default: false },
  takenStatus: { type: String, enum: ['Pending', 'Taken', 'Pickup Dropped'], default: 'Pending' },
  scheduledDate: Date,
  amount: Number,
  // Who pays at pickup time — Finance pays the vendor/transporter directly (treated as
  // settled immediately); Pickup Team pays out of pocket and claims it back from Finance.
  paymentBy: { type: String, enum: ['Finance', 'Pickup Team', ''], default: '' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  gPayNumber: String,
  proofUrl: String,
  // Reimbursement to the Pickup Team employee (only relevant when paymentBy === 'Pickup Team').
  // Tracked separately from paymentStatus (which reflects whether the SHIPMENT was paid for).
  reimbursementStatus: { type: String, enum: ['Not Applicable', 'Pending', 'Partial', 'Paid'], default: 'Not Applicable' },
  reimbursedAmount: { type: Number, default: 0 },
  reimbursementProofUrl: String,
  paidBy: String,
  paidDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PickupOrder', pickupOrderSchema);
