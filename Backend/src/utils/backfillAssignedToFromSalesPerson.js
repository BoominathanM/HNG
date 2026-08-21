/**
 * One-time migration: for existing Lead/Order docs, resolve salesPerson (a display-name
 * string) to the matching User's _id and set/correct assignedTo — so the sales exec's own
 * Leads/Orders tabs (which scope visibility by assignedTo, not the name string) pick up
 * records created before the "Assign Lead To" field started writing assignedTo directly.
 *
 * Handles two cases:
 *  - assignedTo missing entirely (lead never had it set at all).
 *  - assignedTo set but wrong (e.g. a lead converted to an Order by an Admin fell back to
 *    the admin's own id instead of the lead's assigned sales person, per the Jul 22 2026 fix
 *    — that fallback is only correct once Lead.assignedTo is itself populated).
 *
 * Run from the backend directory:
 *   node src/utils/backfillAssignedToFromSalesPerson.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  const users = await User.find({}).select('_id fullName');
  const byName = new Map(users.filter(u => u.fullName).map(u => [u.fullName.trim().toLowerCase(), u._id]));

  const backfill = async (Model, label) => {
    const docs = await Model.find({ salesPerson: { $exists: true, $ne: null, $nin: [''] } }).select('assignedTo salesPerson');
    let fixed = 0;
    for (const doc of docs) {
      const match = byName.get(doc.salesPerson.trim().toLowerCase());
      if (match && String(doc.assignedTo || '') !== String(match)) {
        doc.assignedTo = match;
        await doc.save({ validateBeforeSave: false });
        fixed += 1;
      }
    }
    console.log(`${label}: checked ${docs.length} doc(s) with a salesPerson name, fixed assignedTo on ${fixed}.`);
  };

  await backfill(Lead, 'Lead');
  await backfill(Order, 'Order');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
