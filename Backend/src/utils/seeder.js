require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Import every model so its schema is registered before we clear collections.
const User               = require('../models/User');
const CompanySettings    = require('../models/CompanySettings');
const InventoryItem      = require('../models/InventoryItem');
const Vendor             = require('../models/Vendor');
const Party              = require('../models/Party');
const Order              = require('../models/Order');
const Invoice            = require('../models/Invoice');
const Lead               = require('../models/Lead');
const Quotation          = require('../models/Quotation');
const Negotiation        = require('../models/Negotiation');
const Task               = require('../models/Task');
const Expense            = require('../models/Expense');
const Notification       = require('../models/Notification');
const StockMovement      = require('../models/StockMovement');
const PurchaseRequest    = require('../models/PurchaseRequest');
const PurchaseOrder      = require('../models/PurchaseOrder');
const LocalPurchase      = require('../models/LocalPurchase');
const DispatchRecord     = require('../models/DispatchRecord');
const Staff              = require('../models/Staff');
const Complaint          = require('../models/Complaint');
const Payment            = require('../models/Payment');
const LedgerEntry        = require('../models/LedgerEntry');
const StickerRequest     = require('../models/StickerRequest');
const ReimbursementClaim = require('../models/ReimbursementClaim');

const { ADMIN_DATA } = require('./autoSeed');

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

  // Seed the admin user with full page + tab access (sourced from autoSeed so it stays in sync).
  await User.create(ADMIN_DATA);

  console.log('✅ Seed complete — database contains only the admin user.');
  console.log('   Admin Login → email: superadmin@gmail.com | password: Hng@123');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
