/**
 * One-time migration: update the seeded admin user's email and role
 * WITHOUT wiping any other data in the database.
 *
 * Run from the backend directory:
 *   node src/utils/updateAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { adminPermissions, adminTabAccess } = require('./autoSeed');

const run = async () => {
  await connectDB();

  // Find the admin by either the old or new email
  const admin = await User.findOne({
    email: { $in: ['admin@gmail.com', 'superadmin@gmail.com'] },
    deletedAt: null,
  });

  if (!admin) {
    console.log('❌  No matching admin user found (tried admin@gmail.com and superadmin@gmail.com).');
    await mongoose.disconnect();
    process.exit(1);
  }

  admin.email      = 'superadmin@gmail.com';
  admin.role       = 'Admin';
  admin.password   = 'Hng@123'; // will be re-hashed by the pre-save hook
  admin.status     = 'Active';

  // Restore full permissions using .set() so Mongoose Map is updated correctly
  Object.entries(adminPermissions).forEach(([mod, perm]) => {
    admin.permissions.set(mod, perm);
  });

  // Restore full tab access (Mixed field — must markModified)
  admin.tabAccess = adminTabAccess;
  admin.markModified('tabAccess');

  await admin.save();

  console.log('✅  Admin user updated successfully.');
  console.log('    Email    : superadmin@gmail.com');
  console.log('    Password : Hng@123');
  console.log('    Role     : Admin');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
