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
  defaultGst: { type: mongoose.Schema.Types.Mixed, default: 18 },
  cgst: String,
  sgst: String,
  igst: String,
  hsnCode: String,
  customGstSlabs: [{ label: String, value: Number }],
  invoiceTheme: { type: String, default: 'classic' },
  invoiceFontSize: { type: String, default: 'medium' },
  invoiceFontStyle: String,
  gstComponent: { type: String, default: 'both' },
  invoiceToggles: { type: Map, of: Boolean },
  invoiceTerms: String,
  invoiceFooter: String,
  // Notification preferences (enable/disable per event type)
  notifPrefs: {
    pay: { type: Boolean, default: true },
    stock: { type: Boolean, default: true },
    dispatch: { type: Boolean, default: true },
    task: { type: Boolean, default: true },
    wa: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
  },
  automationVendors: { type: mongoose.Schema.Types.Mixed, default: {} },
  // GST Verification API key (stored securely in DB, overrides .env fallback)
  gstApiKey: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
