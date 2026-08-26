/**
 * One-time migration: assign materialCode to existing MaterialStock docs that predate
 * the field, so the "pick a code to merge into" dropdown (Inventory + Local Purchase)
 * has data for every row, not just newly-created ones.
 *
 * Run from the backend directory:
 *   node src/utils/backfillMaterialStockCode.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MaterialStock = require('../models/MaterialStock');
const generateCode = require('./codeGenerator');

const run = async () => {
  await connectDB();

  const uncoded = await MaterialStock.find({ $or: [{ materialCode: null }, { materialCode: '' }, { materialCode: { $exists: false } }] });

  let coded = 0;
  for (const stock of uncoded) {
    stock.materialCode = await generateCode('MS');
    await stock.save({ validateBeforeSave: false });
    coded += 1;
  }

  console.log(`Checked ${uncoded.length} material stock row(s), assigned a code to ${coded}.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
