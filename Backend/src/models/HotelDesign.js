const mongoose = require('mongoose');

// Stores approved packaging/sticker designs per hotel for reuse in future orders.
const hotelDesignSchema = new mongoose.Schema({
  hotelName: { type: String, required: true, index: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  product: String,
  type: { type: String, enum: ['Sticker', 'Box', 'Frosted Ziplock', 'Butter Paper'], default: 'Sticker' },
  designFileUrl: String,
  approved: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('HotelDesign', hotelDesignSchema);
