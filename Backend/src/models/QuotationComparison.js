const mongoose = require('mongoose');

const quotationComparisonSchema = new mongoose.Schema({
  title:           { type: String, default: '' },
  linkedRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', default: null },
  files: [{
    url:          { type: String, required: true },
    originalName: String,
    mimetype:     String,
  }],
  status: { type: String, enum: ['Analyzing', 'Completed', 'Failed', 'Selected'], default: 'Analyzing' },
  results: [{
    fileIndex: Number,
    name:      String, // vendor/supplier name as read off the document (falls back to filename)
    price:     Number,
    currency:  { type: String, default: 'INR' },
    delivery:  String,
    quality:   String, // 'Premium' | 'Standard' | 'Basic'
    terms:     String,
    score:     Number, // 0-100
    pros:      [String],
    cons:      [String],
  }],
  recommendation: {
    bestIndex: Number,
    summary:   String,
  },
  error: String,

  selectedIndex: Number,
  selectedAt:    Date,
  selectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('QuotationComparison', quotationComparisonSchema);
