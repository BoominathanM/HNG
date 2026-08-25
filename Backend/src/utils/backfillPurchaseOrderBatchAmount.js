/**
 * One-time migration: PurchaseOrder.amount for a multi-item batch order used to be
 * stamped from whichever item's PurchaseRequest was approved FIRST and never
 * updated again (see upsertOrderForApprovedRequest in financial.controller.js) —
 * so a 2-product batch quoted at ₹787.5 + ₹525 showed a stuck ₹787.5 total on both
 * Purchase's Bulk Purchase Requests table and Financial's Amount column instead of
 * the real ₹1312.5. This backfills every existing multi-item order's `items[].amount`
 * from its linked PurchaseRequest and recomputes `amount` as their sum.
 *
 * Run once from the backend directory:
 *   node src/utils/backfillPurchaseOrderBatchAmount.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseRequest = require('../models/PurchaseRequest');

const run = async () => {
  await connectDB();

  const orders = await PurchaseOrder.find({ 'items.1': { $exists: true } });
  let touched = 0;
  for (const order of orders) {
    let changed = false;
    for (const it of order.items) {
      if (it.amount == null && it.requestId) {
        const request = await PurchaseRequest.findById(it.requestId).select('amount');
        if (request?.amount != null) {
          it.amount = request.amount;
          changed = true;
        }
      }
    }
    const total = order.items.reduce((s, it) => s + (it.amount || 0), 0);
    if (total !== (order.amount || 0)) {
      order.amount = total;
      changed = true;
    }
    if (changed) {
      order.markModified('items');
      await order.save({ validateBeforeSave: false });
      touched += 1;
    }
  }

  console.log(`Multi-item orders scanned: ${orders.length}`);
  console.log(`Orders updated: ${touched}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
