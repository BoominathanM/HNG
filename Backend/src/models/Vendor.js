const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  method: { type: String, enum: ['bank', 'upi'], default: 'bank' },
  accountHolderName: String,
  accountNo: String,
  ifsc: String,
  bankName: String,
  branchName: String,
  upiId: String,
  upiNumber: String,
  phone: String,
  email: String,
}, { _id: false, strict: false });

const vendorSchema = new mongoose.Schema({
  vendorCode: { type: String, unique: true },
  name: { type: String, required: [true, 'Vendor name is required'], trim: true },
  phone: String,
  email: { type: String, lowercase: true },
  taxId: String,
  address: String,
  bankDetails: bankDetailsSchema,
  vendorType: { type: String, enum: ['raw_material', 'printing'], default: 'raw_material' },
  supplierType: String,
  status: { type: String, enum: ['Active', 'Inactive', 'Blacklisted'], default: 'Active' },
  aiSummary: String,
  aiSummaryDate: Date,
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
