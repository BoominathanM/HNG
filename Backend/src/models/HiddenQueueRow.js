const mongoose = require('mongoose');

// Represents one Operations packaging-queue row (Sticker/Box/Frosted Ziplock/Butter
// Paper/Wooden Brush/Other tab) that an Admin/Management login has removed from that
// queue view. This does NOT touch the underlying Order or its items — dispatch,
// Sales, and every other module are unaffected; only the row's visibility inside its
// Operations queue tab changes.
//
// Modeled as "soft-deleted from creation" (deletedAt is set the moment a row is
// hidden) so it plugs directly into the existing generic Deleted Records engine in
// settings.controller.js (DELETED_SOURCES/syncDeletedRecords/restoreRecord) with no
// custom sync/restore code: hiding a row = creating this doc; restoring it via
// Settings > Deleted Records just clears deletedAt, and the row reappears in its
// queue since getHiddenQueueRows only returns docs with deletedAt still set.
const hiddenQueueRowSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rowKey: { type: String, required: true }, // matches the frontend queue row's own `key`
  tab: String,     // 'Sticker' | 'Box' | 'Frosted Ziplock' | 'Butter Paper' | 'Wooden Brush' | 'Other'
  orderCode: String,
  product: String,
  qty: Number,
  deletedAt: { type: Date, default: Date.now },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

hiddenQueueRowSchema.index({ orderId: 1, rowKey: 1 }, { unique: true });

module.exports = mongoose.model('HiddenQueueRow', hiddenQueueRowSchema);
