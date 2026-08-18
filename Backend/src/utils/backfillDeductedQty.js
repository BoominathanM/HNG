/**
 * One-time migration: Order.items[].deductedQty and Order.hasPendingStockDeduction are new
 * fields introduced to track per-order-item inventory shortfalls (see
 * sales.controller.js's deductInventoryQty / backfillPendingDeductionsForItem and
 * utils/taskQuantity.js's checkStockDeductionGate). Every order created before this change
 * defaults to deductedQty: 0 on all items even though its stock was, in fact, already pulled
 * from Inventory under the old logic (just not tracked per-order) — without this migration,
 * the new Task Management gate would immediately block assignment on the ENTIRE existing
 * order backlog. This treats every pre-existing order as fully deducted (matching the old
 * behavior's real-world effect), so only orders placed/edited AFTER this deploy can ever show
 * a genuine pending shortfall.
 *
 * Run once from the backend directory:
 *   node src/utils/backfillDeductedQty.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const { resolveItemConsumedQty } = require('../modules/sales/sales.controller');

const run = async () => {
  await connectDB();

  const orders = await Order.find({ deletedAt: null });
  let touched = 0;
  for (const order of orders) {
    let changed = false;
    for (const it of order.items || []) {
      const required = resolveItemConsumedQty(it, order);
      if ((Number(it.deductedQty) || 0) !== required) {
        it.deductedQty = required;
        changed = true;
      }
    }
    if (order.hasPendingStockDeduction) {
      order.hasPendingStockDeduction = false;
      changed = true;
    }
    if (changed) {
      order.markModified('items');
      await order.save({ validateBeforeSave: false });
      touched += 1;
    }
  }

  console.log(`Orders scanned: ${orders.length}`);
  console.log(`Orders updated: ${touched}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
