const mongoose = require('mongoose');

// Transport / freight record for a dispatched order (lorry service tracking).
const transportSchema = new mongoose.Schema({
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchRecord' },
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
