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
  hotelName: { type: String, required: [true, 'Hotel/Company name is required'], trim: true },
  branch: String,
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
  destination: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  source: { type: String },
  isPriority: { type: Boolean, default: false },
  priorityNote: String,
  interestedSoftware: { type: Boolean, default: false },
  previousSoftware: String,
  prevSoftwarePrice: Number,
  softwareExpiryDate: Date,
  address: String,
  city: String,
  state: String,
  pincode: String,
  gstNumber: String,
  gstPercent: { type: Number, default: 18 },
  status: {
    type: String,
    default: 'Cold',
  },
  followupDate: Date,
  followupTime: String,
  kitProducts: [kitProductSchema],
  // Order/personalization products entered in the lead form (free shape).
  products: [mongoose.Schema.Types.Mixed],
  specifications: [mongoose.Schema.Types.Mixed],
  productType: mongoose.Schema.Types.Mixed,
  displayUnit: String,
  // Follow-up notes posted from the lead detail view.
  notesHistory: [followupNoteSchema],
  statusHistory: [mongoose.Schema.Types.Mixed],
  leadType: { type: String, enum: ['ORDER', 'SAMPLE'], default: 'ORDER' },
  notes: String,
  paidAmount: { type: Number, default: 0 },
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, strict: false, minimize: false });

leadSchema.index({ status: 1, deletedAt: 1 });
leadSchema.index({ assignedTo: 1, deletedAt: 1 });

module.exports = mongoose.model('Lead', leadSchema);
