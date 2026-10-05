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
  stickerType: { type: String, enum: ['Product', 'Sticker', 'Box', 'Frosted Ziplock', 'Butter Paper', 'Wooden Brush', 'Other', 'Display Unit'], default: 'Sticker' },
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
  // Either side can reject the uploaded design instead of approving it — sends it back to
  // the design vendor (status → 'Design Change') with a reason. Rejecting resets BOTH
  // salesApproved/opsHeadApproved so the reworked design needs fresh sign-off from both
  // sides once the vendor re-sends it for approval (see updateStickerStatus).
  salesRejected: { type: Boolean, default: false },
  salesRejectedAt: Date,
  salesRejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  salesRejectReason: { type: String, default: '' },
  opsHeadRejected: { type: Boolean, default: false },
  opsHeadRejectedAt: Date,
  opsHeadRejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  opsHeadRejectReason: { type: String, default: '' },
  // When the current design round was sent for approval (status → 'Waiting for Approval').
  sentForApprovalAt: Date,
  // One entry per REJECTED approval round, for Reports > Approval Report and Operations >
  // Approved/Rejected Report. The live *Rejected fields above are wiped when the vendor
  // re-sends a reworked design, so this append-only log is what keeps past rejections
  // visible. A round stays open (resentAt unset) until that re-send, so a second rejection
  // from the other side in the same round updates the open entry instead of adding one.
  rejectionHistory: [{
    sentAt: Date,
    designFileUrl: { type: String, default: '' },
    salesDecision: { type: String, enum: ['Approved', 'Rejected', 'Pending'], default: 'Pending' },
    salesBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    salesAt: Date,
    salesReason: { type: String, default: '' },
    opsDecision: { type: String, enum: ['Approved', 'Rejected', 'Pending'], default: 'Pending' },
    opsBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    opsAt: Date,
    opsReason: { type: String, default: '' },
    resentAt: Date,
  }],
  isUrgent: { type: Boolean, default: false },
  dispatchedToOps: { type: Boolean, default: false },
  // Set when this request was raised by "Use Existing Design" (Operations queue) — the artwork
  // is copied from an already-approved HotelDesign and the request is AUTO-APPROVED (Sales +
  // Ops Head) on creation, so it goes straight to printing. Kept as an audit link to the
  // source design; the design is reviewable in Sales > Parties > eye-view. See createStickerRequest.
  reusedFromDesignId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelDesign', default: null },
  // Invoice uploaded by the design team after printing (shown in Operations product spec table)
  invoiceFile: {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  // Kit context: which kit this approval covers and what products are packed inside
  kitType: { type: String, default: '' },
  kitProducts: [{ type: String }],
  // Vendor / Team Member (User) this request is routed to — defaults to whichever
  // team member is currently marked "Auto" for this stickerType on the Vendors &
  // Suppliers page (CompanySettings.automationVendors), unless manually overridden.
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Full history of "Printing Supplier" switches (Operations > Design/Vendors reassign
  // dropdown), for the Reports > Switch Report tab. Separate from the live vendorId field
  // above so past switches remain visible after a later reassignment overwrites it.
  switchHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromName: String,
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toName: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Effective Sales / Ops Head decision on a request (document or lean object), in the flat
// shape of a rejectionHistory entry. Rejecting resets both approval flags, so an approval
// flag that is still set is always newer than any leftover rejection flag.
stickerRequestSchema.statics.approvalSnapshot = function approvalSnapshot(s) {
  const side = (approved, approvedBy, approvedAt, rejected, rejectedBy, rejectedAt, reason) => {
    if (approved) return { decision: 'Approved', by: approvedBy || null, at: approvedAt || null, reason: '' };
    if (rejected) return { decision: 'Rejected', by: rejectedBy || null, at: rejectedAt || null, reason: reason || '' };
    return { decision: 'Pending', by: null, at: null, reason: '' };
  };
  const sales = side(s.salesApproved, s.salesApprovedBy, s.salesApprovedAt, s.salesRejected, s.salesRejectedBy, s.salesRejectedAt, s.salesRejectReason);
  const ops = side(s.opsHeadApproved, s.opsHeadApprovedBy, s.opsHeadApprovedAt, s.opsHeadRejected, s.opsHeadRejectedBy, s.opsHeadRejectedAt, s.opsHeadRejectReason);
  return {
    salesDecision: sales.decision, salesBy: sales.by, salesAt: sales.at, salesReason: sales.reason,
    opsDecision: ops.decision, opsBy: ops.by, opsAt: ops.at, opsReason: ops.reason,
  };
};

module.exports = mongoose.model('StickerRequest', stickerRequestSchema);
