const mongoose = require('mongoose');

const stickerRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  hotelLogo: String,
  stickerType: { type: String, enum: ['Product', 'Box'] },
  quantity: Number,
  stickerSize: String,
  designFileUrl: String,
  status: { type: String, enum: ['Pending', 'Printing', 'Done'], default: 'Pending' },
  dispatchedToOps: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('StickerRequest', stickerRequestSchema);
