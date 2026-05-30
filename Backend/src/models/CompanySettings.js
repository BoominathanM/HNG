const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Heal N Glow' },
  logoUrl: String,
  currency: { type: String, default: 'INR' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  address: String,
  gstNumber: String,
  panNumber: String,
  invoicePrefix: { type: String, default: 'INV-' },
  defaultGst: { type: Number, default: 18 },
  customGstSlabs: [{ label: String, value: Number }],
  invoiceTheme: { type: String, default: 'classic' },
  invoiceFontSize: { type: String, default: 'medium' },
  invoiceFontStyle: String,
  gstComponent: { type: String, default: 'both' },
  invoiceToggles: { type: Map, of: Boolean },
  invoiceTerms: String,
  invoiceFooter: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
