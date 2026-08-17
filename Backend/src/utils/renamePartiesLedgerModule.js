/**
 * One-time migration: the "Parties & Ledger" permission module was renamed to
 * "Ledgers". Existing User.permissions / User.tabAccess map keys and
 * DeletedRecord.module values still hold the old name, so without this they'd
 * silently lose that module's saved permissions (Map.get('Ledgers') would miss).
 *
 * Run from the backend directory:
 *   node src/utils/renamePartiesLedgerModule.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const OLD_NAME = 'Parties & Ledger';
const NEW_NAME = 'Ledgers';

const run = async () => {
  await connectDB();

  const usersResult = await mongoose.connection.collection('users').updateMany(
    {},
    {
      $rename: {
        [`permissions.${OLD_NAME}`]: `permissions.${NEW_NAME}`,
        [`tabAccess.${OLD_NAME}`]: `tabAccess.${NEW_NAME}`,
      },
    }
  );

  const deletedRecordsResult = await mongoose.connection.collection('deletedrecords').updateMany(
    { module: OLD_NAME },
    { $set: { module: NEW_NAME } }
  );

  console.log(`Users touched: ${usersResult.modifiedCount}`);
  console.log(`DeletedRecord docs renamed: ${deletedRecordsResult.modifiedCount}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
