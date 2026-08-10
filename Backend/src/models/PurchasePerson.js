const mongoose = require('mongoose');

const purchasePersonSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Purchase person name is required'], trim: true },
  phone: String,
  gPayNumber: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PurchasePerson', purchasePersonSchema);
