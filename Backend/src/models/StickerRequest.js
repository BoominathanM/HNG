const mongoose = require('mongoose');

const stickerRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  hotelLogo: String,
  hotelName: String,
  product: String,
  // queue this request belongs to ('Display Unit' = kit packaging approval, not a sticker)
  stickerType: { type: String, enum: ['Product', 'Sticker', 'Box', 'Frosted Ziplock', 'Display Unit'], default: 'Sticker' },
  quantity: Number,
  stickerSize: String,
  designFileUrl: String,
  status: {
    type: String,
    enum: [
      'Pending', 'Waiting for Approval', 'Design Confirmation', 'Approved',
      'In Process', 'Printing', 'Dispatch', 'Received', 'Design Change', 'Done',
    ],
    default: 'Pending',
  },
  // dual approval (sales person + operations head)
  salesApproved: { type: Boolean, default: false },
  salesApprovedAt: Date,
  salesApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  opsHeadApproved: { type: Boolean, default: false },
  opsHeadApprovedAt: Date,
  opsHeadApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isUrgent: { type: Boolean, default: false },
  dispatchedToOps: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('StickerRequest', stickerRequestSchema);
