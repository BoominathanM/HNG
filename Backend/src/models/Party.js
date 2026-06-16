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
  category: { type: String, enum: ['VIP', 'Regular', 'Wholesale', ''] },
  contactPerson: String,
  dob: Date,
  street: String,
  state: String,
  pincode: String,
  city: String,
  runningBalance: { type: Number, default: 0 },
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
