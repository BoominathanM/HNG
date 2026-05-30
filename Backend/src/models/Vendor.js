const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorCode: { type: String, unique: true },
  name: { type: String, required: [true, 'Vendor name is required'], trim: true },
  phone: String,
  email: { type: String, lowercase: true },
  taxId: String,
  address: String,
  bankDetails: String,
  discountPercent: { type: Number, default: 0 },
  vendorType: { type: String, enum: ['raw_material', 'printing'], default: 'raw_material' },
  supplierType: String,
  status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active' },
  aiSummary: String,
  aiSummaryDate: Date,
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
