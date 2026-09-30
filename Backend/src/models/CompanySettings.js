const mongoose = require('mongoose');

// One of the company's receiving bank accounts (Settings → Invoice Settings). accountId is a
// stable client-minted key rather than Mongo's _id so payment entries can reference it and
// Settings can pick a brand-new, not-yet-saved account as the one printed on invoices.
// An inactive account is hidden from every payment dropdown but kept so the Payment Bank
// Details report can still name the payments already recorded against it.
const bankAccountSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  label: String,
  name: String,
  bank: String,
  account: String,
  ifsc: String,
  upiId: String,
  qrCodeUrl: String,
  active: { type: Boolean, default: true },
}, { _id: false });

const companySettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Heal N Glow Pvt Ltd' },
  logoUrl: String,
  currency: { type: String, default: 'INR' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  address: String,
  gstNumber: String,
  panNumber: String,
  mobile: String,
  email: String,
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
  bankDetails: {
    name: String,
    ifsc: String,
    account: String,
    bank: String,
    upiId: String,
    qrCodeUrl: String,
  },
  // Every receiving bank account. bankDetails above is kept as a mirror of the one chosen by
  // invoiceBankAccountId (see settings.controller syncInvoiceBank) so anything still reading
  // the single legacy object prints the selected account.
  bankAccounts: { type: [bankAccountSchema], default: [] },
  invoiceBankAccountId: String,
  signatureUrl: String,
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
