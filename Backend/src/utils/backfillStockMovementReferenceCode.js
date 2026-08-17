/**
 * One-time migration: StockMovement gained a `referenceCode` snapshot field (Order.orderCode /
 * PurchaseOrder.poCode / LocalPurchase.lpCode) so Stock History can show an Order ID next to
 * Hotel/Party. Existing movements created before this change have no referenceCode stored, so
 * this backfills it from the still-live referenced document (rows whose source document was
 * since deleted are left as-is — the UI already falls back to "—" for those).
 *
 * Run from the backend directory:
 *   node src/utils/backfillStockMovementReferenceCode.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const StockMovement = require('../models/StockMovement');
const Order = require('../models/Order');
const PurchaseOrder = require('../models/PurchaseOrder');
const LocalPurchase = require('../models/LocalPurchase');

const run = async () => {
  await connectDB();

  const pending = await StockMovement.find({
    referenceType: { $in: ['Order', 'Purchase'] },
    referenceId: { $ne: null },
    $or: [{ referenceCode: null }, { referenceCode: { $exists: false } }],
  }).select('referenceType referenceId').lean();

  const orderIds = [...new Set(pending.filter(m => m.referenceType === 'Order').map(m => String(m.referenceId)))];
  const purchaseIds = [...new Set(pending.filter(m => m.referenceType === 'Purchase').map(m => String(m.referenceId)))];

  const orders = await Order.find({ _id: { $in: orderIds } }).select('orderCode').lean();
  const orderCodeById = new Map(orders.map(o => [String(o._id), o.orderCode]));

  const purchaseOrders = await PurchaseOrder.find({ _id: { $in: purchaseIds } }).select('poCode').lean();
  const localPurchases = await LocalPurchase.find({ _id: { $in: purchaseIds } }).select('lpCode').lean();
  const purchaseCodeById = new Map([
    ...purchaseOrders.map(p => [String(p._id), p.poCode]),
    ...localPurchases.map(p => [String(p._id), p.lpCode]),
  ]);

  const ops = [];
  for (const m of pending) {
    const code = m.referenceType === 'Order'
      ? orderCodeById.get(String(m.referenceId))
      : purchaseCodeById.get(String(m.referenceId));
    if (code) ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: { referenceCode: code } } } });
  }

  const result = ops.length ? await StockMovement.bulkWrite(ops) : { modifiedCount: 0 };

  console.log(`StockMovement rows scanned: ${pending.length}`);
  console.log(`StockMovement rows updated: ${result.modifiedCount}`);
  console.log(`Rows left as-is (source document no longer exists): ${pending.length - ops.length}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Backfill failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
