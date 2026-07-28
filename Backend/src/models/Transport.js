const mongoose = require('mongoose');

// Transport / freight record for a dispatched order (lorry service tracking).
const transportSchema = new mongoose.Schema({
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchRecord' },
  // Index of this shipment's round within the DispatchRecord's dispatchHistory (0-based) —
  // an order shipped across several Partial/Full Dispatch rounds gets ONE DispatchRecord but
  // a separate Transport doc per round, keyed on (dispatchId, roundIndex), so every round's own
  // LR/transport/invoice details keep their own row in the Transport tab instead of later
  // rounds overwriting earlier ones.
  roundIndex: { type: Number, default: 0 },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderCode: String,
  clientName: String,
  transportCompany: String,
  lrNumber: String,
  trackingUrl: String,
  fromCity: String,
  toCity: String,
  boxes: Number,
  weight: String,
  freight: Number,
  dispatchedAt: Date,
  estimatedDelivery: String,
  status: { type: String, enum: ['In Transit', 'Delivered', 'Pending'], default: 'In Transit' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Transport', transportSchema);
