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
    items: [{ // line items as read off this document, for the product-wise comparison below
      name:       String,
      qty:        Number,
      unitPrice:  Number,
      totalPrice: Number,
    }],
  }],
  recommendation: {
    bestIndex: Number,
    summary:   String,
  },
  // Cross-quotation, product-wise breakdown: the same real-world product matched across
  // documents even when each supplier names it differently (e.g. "Soap" vs "Bar"), so the
  // best price can be picked per-product rather than only by whole-quotation total.
  productComparison: [{
    productName: String, // canonical name for the matched product group
    aliases:     [String], // the different names each supplier actually printed
    entries: [{
      fileIndex:   Number, // index into `files`/`results` above
      name:        String, // supplier name, denormalized for display
      matchedName: String, // the name that supplier's document used for this product
      qty:         Number,
      unitPrice:   Number,
      totalPrice:  Number,
    }],
    bestFileIndex: Number, // entry with the lowest unit price for this specific product
    bestPrice:     Number,
    note:          String,
  }],
  error: String,

  selectedIndex: Number,
  selectedAt:    Date,
  selectedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('QuotationComparison', quotationComparisonSchema);
