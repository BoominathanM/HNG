const mongoose = require('mongoose');

// Stores approved packaging/sticker designs per hotel for reuse in future orders.
// One record per hotel + product + packaging type + size (see the findOneAndUpdate
// upsert keys in operations.controller.js) so re-approving the same combination
// overwrites in place instead of piling up duplicates — the Parties > eye-view
// "Packaging Designs on File" list renders one row per record.
const hotelDesignSchema = new mongoose.Schema({
  hotelName: { type: String, required: true, index: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
  product: String,
  type: { type: String, enum: ['Sticker', 'Box', 'Frosted Ziplock', 'Butter Paper', 'Wooden Brush', 'Other'], default: 'Sticker' },
  // Packing size the approved design was made for (StickerRequest.stickerSize). Part of the
  // dedupe key so a product that ships in two box sizes keeps a design for each.
  size: { type: String, default: '' },
  // Order-composition category (personalized | separate_kit | separate_product) the design
  // was first approved under — informational only, not part of the dedupe key.
  category: { type: String, default: '' },
  designFileUrl: String,
  approved: { type: Boolean, default: true },
  // Design vendor (Vendors-department User) who produced the approved artwork, captured at
  // approval time so the Parties list can show "who made this" without walking StickerRequests.
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorName: { type: String, default: '' },
  // The StickerRequest whose approval last wrote this record.
  stickerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'StickerRequest' },
  // Last time the artwork was (re-)uploaded/approved for this hotel+product+type+size —
  // shown as "Uploaded On" in the Parties list (readers fall back to updatedAt/createdAt when
  // absent on legacy rows). Kept distinct from the Mongo timestamps so a future non-artwork
  // field change doesn't move the displayed date. No default — legacy rows stay honest.
  lastUploadedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('HotelDesign', hotelDesignSchema);
