const mongoose = require('mongoose');

const boxInvoiceSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileName: String,
  notes: { type: String, default: '' },
  // Uploader identity captured server-side from the authenticated user at upload time.
  uploadedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    role: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('BoxInvoice', boxInvoiceSchema);
