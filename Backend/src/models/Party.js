const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Party name is required'], trim: true },
  phone: String,
  type: { type: String, enum: ['Customer', 'Supplier'], default: 'Customer' },
  gstNumber: String,
  gstVerifiedData: mongoose.Schema.Types.Mixed,
  panNumber: String,
  openingBalance: { type: Number, default: 0 },
  openingBalDir: { type: String, enum: ['receive', 'pay'], default: 'receive' },
  creditPeriod: { type: Number, default: 7 },
  creditLimit: Number,
  // Mirrors Lead.category (Hotel/Hospital/custom, free-text via the same DropdownOption
  // store) — set when a Customer party is auto-registered from a Lead. Absent/legacy
  // parties are treated as 'Hotel' by readers, matching Lead/Order's convention.
  category: String,
  // Audit log of Super Admin / Admin "Switch Category" corrections (Parties tab eye-view) — one entry
  // per switch, with how many Lead/Quotation/Negotiation/Order copies were rewritten.
  categoryHistory: [{
    from: String,
    to: String,
    reason: String,
    counts: { leads: Number, quotations: Number, negotiations: Number, orders: Number },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
  }],
  contactPerson: String,
  dob: Date,
  street: String,
  state: String,
  pincode: String,
  city: String,
  runningBalance: { type: Number, default: 0 },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
