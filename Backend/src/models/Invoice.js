const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  dueDays: Number,
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  invoiceType: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  subtotal: { type: Number, required: true },
  gstPercent: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  advanceAmount: { type: Number, default: 0 },
  balanceDue: Number,
  previousBalance: { type: Number, default: 0 },
  isComplementary: { type: Boolean, default: false },
  complementaryNote: String,
  note: String,
  status: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Paid', 'Overdue'],
    default: 'Pending',
  },
  items: [new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    itemName: { type: String, required: true },
    unit: String,
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    lineTotal: Number,
    rate: Number,
    gst: Number,
    taxRate: Number,
    isKit: Boolean,
    kitId: String,
    kitName: String,
    kitType: String,
    category: String,
    kitPrice: Number,
    overallQty: Number,
    displayUnit: String,
    kitIncludes: [mongoose.Schema.Types.Mixed],
  }, { strict: false })],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ partyId: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

invoiceSchema.pre('save', function (next) {
  if (this.items) {
    this.items.forEach((item) => {
      item.lineTotal = item.price * item.qty;
    });
  }
  this.balanceDue = Math.max(0, this.total - this.advanceAmount);
  if (this.isComplementary) {
    this.total = 0;
    this.balanceDue = 0;
    this.status = 'Paid';
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
