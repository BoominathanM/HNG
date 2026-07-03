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
  // Extra lorry-receipt / transport tracking details
  lrDate: String,
  transportName: String,
  fromCity: String,
  toCity: String,
  weight: String,
  freight: String,
  packages: String,
  estimatedDelivery: String,
  boxes: { type: Number, default: 0 },
  // Open/Close box verification photos (multiple allowed)
  openBoxPhotos: [String],
  closeBoxPhotos: [String],
  status: { type: String, enum: ['Draft', 'Confirmed', 'Dispatched'], default: 'Draft' },
  dispatchedAt: Date,
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    qtyOrdered: Number,
    qtyDispatched: Number,
    verified: { type: Boolean, default: false },
    boxPhotoUrl: String,
    boxes: Number,
    // Kit identity — copied from the order item at dispatch creation so the
    // verification table can group Personalized Kit / Separate Kit / Separate
    // Product the same way Sales/Operations does (see order.items.kitId etc).
    isKit: { type: Boolean, default: false },
    kitId: String,
    kitName: String,
    kitType: String,
    category: String,
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
