/**
 * One-time migration: link existing LocalPurchase docs to a Vendor by matching
 * vendorPhone/vendorName, so vendor purchase history/ledger picks up local
 * purchases that were entered before vendorId existed on the schema.
 *
 * Run from the backend directory:
 *   node src/utils/backfillLocalPurchaseVendor.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const LocalPurchase = require('../models/LocalPurchase');
const Vendor = require('../models/Vendor');

const run = async () => {
  await connectDB();

  const unlinked = await LocalPurchase.find({ vendorId: null });
  const vendors = await Vendor.find({ deletedAt: null });

  let linked = 0;
  for (const lp of unlinked) {
    const match = vendors.find((v) =>
      (lp.vendorPhone && v.phone === lp.vendorPhone) ||
      (lp.vendorName && v.name.trim().toLowerCase() === lp.vendorName.trim().toLowerCase())
    );
    if (match) {
      lp.vendorId = match._id;
      await lp.save({ validateBeforeSave: false });
      linked += 1;
    }
  }

  console.log(`Checked ${unlinked.length} unlinked local purchase(s), linked ${linked} to a vendor.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
