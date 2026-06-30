const mongoose = require('mongoose');

const stickerRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  hotelLogo: String,
  hotelName: String,
  product: String,
  // Order-composition category this approval belongs to (personalized | separate_kit | separate_product).
  // Lets the SAME product in the SAME tab carry SEPARATE approvals when it shows twice — once as a
  // Separate Kit and once as Personalized (a separate kit packed inside a personalized outer unit).
  category: { type: String, default: '' },
  // queue this request belongs to ('Display Unit' = kit packaging approval, not a sticker)
  stickerType: { type: String, enum: ['Product', 'Sticker', 'Box', 'Frosted Ziplock', 'Butter Paper', 'Display Unit'], default: 'Sticker' },
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
  // Invoice uploaded by the design team after printing (shown in Operations product spec table)
  invoiceFile: {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  // Kit context: which kit this approval covers and what products are packed inside
  kitType: { type: String, default: '' },
  kitProducts: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('StickerRequest', stickerRequestSchema);
