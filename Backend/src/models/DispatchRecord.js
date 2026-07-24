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
  // "Partial Dispatch" checkpoint — set when the emergency/first portion of the order has
  // been confirmed as sent but the record is intentionally left open for the remaining
  // items to go out later as "Full Dispatch" (which is what actually finalizes the order).
  partialDispatchConfirmed: { type: Boolean, default: false },
  partialDispatchAt: Date,
  // Snapshot of transport/weight/boxes AT THE MOMENT the Partial Dispatch checkpoint was
  // confirmed — the main transportName/weight/boxes fields get overwritten when the
  // second Full Dispatch confirm happens, so without this snapshot the partial round's
  // values would be lost and couldn't be shown back to the dispatcher.
  partialTransportName: String,
  partialWeight: String,
  partialBoxes: Number,
  // Per-kit dispatch progress — Personalized Kit / Separate Kit are dispatched as one
  // unit (one count, one open/close photo pair), separate from Order.kitOrders which is
  // just the static order-time definition (kitId/kitName/category/overallQty). Seeded
  // from order.kitOrders when the DispatchRecord is created (see tasks.controller.js
  // forwardOrderToDispatch); dispatchedQty accumulates across partial/full confirm rounds.
  kitDispatch: [{
    kitId: String,
    kitName: String,
    category: String,
    overallQty: { type: Number, default: 0 },
    dispatchedQty: { type: Number, default: 0 },
    openBoxPhotos: { type: [String], default: [] },
    closeBoxPhotos: { type: [String], default: [] },
  }],
  // One entry per confirm action that actually dispatched something — preserves what
  // happened each round (unlike transportName/weight/boxes, which get overwritten on
  // every confirm), so an order shipped across many partial rounds keeps a full trail.
  dispatchHistory: [{
    date: { type: Date, default: Date.now },
    dispatchType: String, // 'Full Dispatch' | 'Partial Dispatch' — this round's outcome
    transportName: String,
    weight: String,
    boxes: Number,
    kits: [{ kitName: String, category: String, dispatchedQty: Number }],
    products: [{ itemName: String, dispatchedQty: Number }],
    confirmedByName: String,
  }],
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    qtyOrdered: Number,
    qtyDispatched: Number,
    verified: { type: Boolean, default: false },
    boxPhotoUrl: String,
    // Per-product open/closed box photos — required before this item can be
    // verified (max 5 each, enforced in uploadItemBoxPhotos).
    openBoxPhotos: { type: [String], default: [] },
    closeBoxPhotos: { type: [String], default: [] },
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
