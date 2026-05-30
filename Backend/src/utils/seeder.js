require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Import every model so its schema is registered before we clear collections.
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const InventoryItem = require('../models/InventoryItem');
const Vendor = require('../models/Vendor');
const Party = require('../models/Party');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const Negotiation = require('../models/Negotiation');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const StockMovement = require('../models/StockMovement');
const PurchaseRequest = require('../models/PurchaseRequest');
const PurchaseOrder = require('../models/PurchaseOrder');
const LocalPurchase = require('../models/LocalPurchase');
const DispatchRecord = require('../models/DispatchRecord');
const Staff = require('../models/Staff');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const LedgerEntry = require('../models/LedgerEntry');
const StickerRequest = require('../models/StickerRequest');
const ReimbursementClaim = require('../models/ReimbursementClaim');

const MODULES = [
  'Dashboard', 'Sales Team', 'Operations', 'Task Management', 'Dispatch Team',
  'Staff Management', 'Inventory', 'Purchase', 'Billing', 'Parties & Ledger',
  'Financial', 'Expenses', 'Reports', 'Notifications', 'Integration', 'Settings',
];

// Admin gets full read/add/edit/delete on every module.
const adminPerms = {};
MODULES.forEach((m) => { adminPerms[m] = { read: true, add: true, edit: true, delete: true }; });

const seed = async () => {
  await connectDB();
  console.log('Seeding database (admin-only, fresh start)...');

  // Wipe EVERY collection so the database starts completely empty.
  await Promise.all([
    User.deleteMany({}),
    CompanySettings.deleteMany({}),
    InventoryItem.deleteMany({}),
    Vendor.deleteMany({}),
    Party.deleteMany({}),
    Order.deleteMany({}),
    Invoice.deleteMany({}),
    Lead.deleteMany({}),
    Quotation.deleteMany({}),
    Negotiation.deleteMany({}),
    Task.deleteMany({}),
    Expense.deleteMany({}),
    Notification.deleteMany({}),
    StockMovement.deleteMany({}),
    PurchaseRequest.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    LocalPurchase.deleteMany({}),
    DispatchRecord.deleteMany({}),
    Staff.deleteMany({}),
    Complaint.deleteMany({}),
    Payment.deleteMany({}),
    LedgerEntry.deleteMany({}),
    StickerRequest.deleteMany({}),
    ReimbursementClaim.deleteMany({}),
  ]);

  // Reset the sequential-code counters so IDs start from 0001 again.
  try {
    await mongoose.connection.collection('counters').deleteMany({});
  } catch (_) { /* counters collection may not exist yet */ }

  console.log('✅ All collections cleared');

  // The ONLY record we seed is the admin user.
  // (Company settings auto-create on first GET /settings/company.)
  await User.create({
    fullName: 'HNG Admin',
    email: 'admin@gmail.com',
    mobile: '9000000000',
    password: 'Hng@123',
    role: 'Admin',
    department: 'Management',
    status: 'Active',
    permissions: adminPerms,
  });

  console.log('✅ Seed complete — database contains only the admin user.');
  console.log('   Admin Login → email: admin@gmail.com | password: Hng@123');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
