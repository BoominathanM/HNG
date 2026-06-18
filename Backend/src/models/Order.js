const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  negotiationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negotiation' },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  clientName: { type: String, required: true },
  clientPartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  product: String,
  qty: Number,
  amount: Number,
  gstAmount: { type: Number, default: 0 },
  total: Number,
  advancePaid: { type: Number, default: 0 },
  balance: Number,
  type: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  status: {
    type: String,
    enum: ['In Production', 'Dispatch Ready', 'Dispatched', 'Payment Pending', 'Completed', 'Closed', 'Cancelled'],
    default: 'In Production',
  },
  paymentTerms: String,
  paymentReminderDate: Date,
  advancePaidAmount: { type: Number, default: 0 },
  expectedDeliveryDate: Date,
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: String,
    unit: String,
    price: Number,
    qty: Number,
    lineTotal: Number,
    // ─── Operations / packaging fields ───
    logoType: { type: String, enum: ['Sticker', 'Box', 'Frosted Ziplock', 'None', ''], default: '' },
    // Normalize legacy/lowercase values (e.g. 'yes'/'no') to the enum BEFORE validation runs,
    // so converting older quotations/negotiations whose items stored 'yes' doesn't 500.
    sticker: {
      type: String,
      enum: ['YES', 'NO', ''],
      default: '',
      set: (v) => {
        const s = String(v ?? '').trim().toUpperCase();
        return s === 'YES' || s === 'NO' ? s : '';
      },
    },
    // Direct printing flag (separate from sticker). Drives Operations routing: a printing item
    // goes through the Sticker/Print tab first, then to its Box/Ziplock packaging tab.
    printing: {
      type: String,
      enum: ['YES', 'NO', ''],
      default: '',
      set: (v) => {
        const s = String(v ?? '').trim().toUpperCase();
        return s === 'YES' || s === 'NO' ? s : '';
      },
    },
    size: String,
    packaging: String,
    packingMaterial: String,
    material: String,
    rate: Number,
    gst: Number,
    boxes: Number,
    inventoryStock: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    // ─── Order-composition category (drives 3-bucket totals + Operations grouping) ───
    // 'personalized'  = kit + extra products customized together as one unit
    // 'separate_kit'  = a kit purchased as-is, standalone
    // 'separate_product' = an individual non-kit product
    category: { type: String, default: '' },
    // Kit identity — kept on order items so Operations can group/route kit vs. separate.
    isKit: { type: Boolean, default: false },
    kitId: String,
    kitName: String,
    kitType: String,
  }],
  // Resolved from selected display unit's tabMapping (Box | Ziplock | Sticker)
  displayUnitTab: { type: String, enum: ['Box', 'Ziplock', 'Sticker', ''], default: '' },
  // Logo branding
  logoRequired: { type: Boolean, default: false },
  logoUrl: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ─── Operations workflow tracking ───
  isUrgent: { type: Boolean, default: false },
  isEmergency: { type: Boolean, default: false },
  // Emergency dispatch request + dual approval (sales head + ops head). Previously persisted
  // only via strict:false; made explicit so they reliably round-trip on fetch.
  emergencyDispatchRequested: { type: Boolean, default: false },
  emergencySalesApproved: { type: Boolean, default: false },
  emergencyOpsApproved: { type: Boolean, default: false },
  emergencyApproved: { type: Boolean, default: false },
  emergencyTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  emergencyReason: String,
  // Delivery routing (copied from the originating lead/negotiation at conversion).
  deliveryBy: String,
  transportationBy: String,
  forwardingCharge: { type: Boolean, default: false },
  deliveryType: { type: String, enum: ['Full', 'Partial', ''], default: '' },
  // Partial-delivery tracking: partial qty processed now, balance as a follow-on entry (same order ID).
  partialQty: { type: Number, default: 0 },
  balanceQty: { type: Number, default: 0 },
  partialDeliveries: [{
    qty: Number,
    balanceQty: Number,
    note: String,
    status: { type: String, default: 'Pending' },
    at: { type: Date, default: Date.now },
  }],
  designStatus: { type: String, default: '' },
  printingStatus: { type: String, enum: ['Yet to Receive', 'Received', 'Closed', ''], default: '' },
  stockStatus: { type: String, default: '' },
  operationStage: { type: String, default: '' },
  taskStatus: { type: String, default: '' },
  orderCategory: { type: String, enum: ['ORDER', 'SAMPLE'], default: 'ORDER' },
  location: String,
  clientPhone: String,
  contactPerson: String,
  billingName: String,
  gstNumber: String,
  gstPercent: { type: Number, default: 18 },
  salesPerson: String,
  billType: { type: String, enum: ['GST', 'NON_GST'], default: 'GST' },
  detailedAddress: String,
  city: String,
  state: String,
  pincode: String,
  forwardingChargeAmount: { type: Number, default: 0 },
  paymentProofs: [mongoose.Schema.Types.Mixed],
  splitDates: [mongoose.Schema.Types.Mixed],
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false });

orderSchema.index({ status: 1, deletedAt: 1 });
orderSchema.index({ clientPartyId: 1 });

module.exports = mongoose.model('Order', orderSchema);
