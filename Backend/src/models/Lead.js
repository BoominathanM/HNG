const mongoose = require('mongoose');

const kitProductSchema = new mongoose.Schema({
  kitType: String,
  displayType: String,
  productName: String,
  qty: Number,
  rate: Number,
  gstPercent: Number,
}, { _id: false });

const followupNoteSchema = new mongoose.Schema({
  date: String,
  time: String,
  person: String,
  text: String,
}, { _id: false, timestamps: true });

const leadSchema = new mongoose.Schema({
  leadCode: { type: String, unique: true },

  // Hotel / Company info
  hotelName: { type: String, required: [true, 'Hotel/Company name is required'], trim: true },
  branch: String,
  hotelType: { type: String, enum: ['OLD', 'NEW'], default: 'OLD' },
  leadType: { type: String, enum: ['ORDER', 'SAMPLE'], default: 'ORDER' },
  numRooms: Number,
  generalOccupancy: Number,
  billingName: String,
  contactPerson: String,
  pocDesignation: String,
  phone: { type: String, required: [true, 'Phone is required'] },
  altRole: String,
  altName: String,
  altNumber: String,
  email: { type: String, lowercase: true },
  locationCity: String,
  location: String,
  destination: String,

  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  salesPerson: String,

  // Lead meta
  source: String,
  priority: { type: Number, default: 0 },
  mentionPriority: String,
  isPriority: { type: Boolean, default: false },
  priorityNote: String,

  // Software interest
  interestedSoftware: { type: Boolean, default: false },
  interestedInSoftware: String,
  previousSoftware: String,
  prevSoftwarePrice: Number,
  previousSoftwarePrice: Number,
  softwareExpiryDate: Date,

  // Billing & Address
  billType: { type: String, enum: ['GST', 'NON_GST'], default: 'GST' },
  gstNumber: String,
  gstPhone: String,
  gstVerifiedData: mongoose.Schema.Types.Mixed,
  detailedAddress: String,
  address: String,
  city: String,
  state: String,
  pincode: String,

  // Shipping address (defaults to billing unless overridden) — dispatch uses this,
  // while invoices continue to use the billing address above.
  shippingAddress: String,
  shippingCity: String,
  shippingState: String,
  shippingPincode: String,
  shippingSameAsBilling: { type: Boolean, default: true },

  // Lead status / journey
  status: { type: String, default: 'Cold' },
  statusHistory: [mongoose.Schema.Types.Mixed],
  quotationNo: String,
  quotationDate: Date,
  followupDate: Date,
  followupTime: String,
  followUpDate: Date,
  followUpTime: String,
  followUpName: String,
  followUpStep: String,
  notesHistory: [followupNoteSchema],
  notes: String,

  // Products / personalization
  products: [mongoose.Schema.Types.Mixed],
  specifications: [mongoose.Schema.Types.Mixed],
  productType: mongoose.Schema.Types.Mixed,
  displayUnit: String,
  displayUnitTab: { type: String, enum: ['Box', 'Ziplock', 'Sticker', 'Butter Paper', ''], default: '' },
  packingMaterial: String,
  kitDisplayUnit: String,
  kitSize: String,
  kitSticker: String,
  kitLogo: String,
  selectedKit: String,
  selectedKits: [String],
  kitOrders: [mongoose.Schema.Types.Mixed],
  kitInsideItems: [String],
  kitProducts: [kitProductSchema],
  logoNeeded: { type: Boolean, default: false },
  logoProducts: String,

  // Delivery & payment
  deliveryBy: String,
  transportationBy: String,
  forwardingCharge: { type: Boolean, default: false },
  forwardingChargeAmount: { type: Number, default: 0 },
  orderDeliveryDate: Date,
  splitDates: [mongoose.Schema.Types.Mixed],
  paymentTerms: String,
  paymentTermsReminder: { type: Boolean, default: false },
  paymentReminderDate: Date,
  creditDueDate: Date,
  paymentCollection: [mongoose.Schema.Types.Mixed],
  paymentProofs: [mongoose.Schema.Types.Mixed],
  paidAmount: { type: Number, default: 0 },

  // File uploads (Cloudinary URLs)
  hotelLogoUrl: String,

  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false, minimize: false });

leadSchema.index({ status: 1, deletedAt: 1 });
leadSchema.index({ assignedTo: 1, deletedAt: 1 });
leadSchema.index({ hotelName: 1, deletedAt: 1 });

module.exports = mongoose.model('Lead', leadSchema);
