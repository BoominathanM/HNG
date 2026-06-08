const User = require('../models/User');

const MODULES = [
  'Dashboard', 'Sales Team', 'Operations', 'Task Management', 'Dispatch Team',
  'Staff Management', 'Inventory', 'Purchase', 'Vendors & Suppliers', 'Billing',
  'Parties & Ledger', 'Financial', 'Expenses', 'Reports', 'Notifications',
  'Integration', 'Settings',
];

const MODULE_TABS = {
  'Sales Team':       ['Leads', 'Quotations', 'Orders', 'Negotiations', 'Follow-ups'],
  'Operations':       ['Orders', 'Queue', 'Design', 'Tasks'],
  'Task Management':  ['All Tasks', 'In Progress', 'Done'],
  'Dispatch Team':    ['Active', 'History'],
  'Staff Management': ['Staff', 'Attendance'],
  'Inventory':        ['Products', 'Kits'],
  'Purchase':         ['Purchase Orders', 'History'],
  'Vendors & Suppliers': ['Vendors', 'Printing Suppliers'],
  'Billing':          ['Invoices', 'Order in Process'],
  'Parties & Ledger': ['Parties', 'Ledger'],
  'Financial':        ["P&L", 'Balance Sheet'],
  'Expenses':         ['All Expenses', 'Categories'],
  'Reports':          ['Sales', 'Operations', 'Financial'],
  'Integration':      ['WhatsApp', 'AI Integration'],
  'Settings':         ['General', 'Users', 'Notifications', 'GST & Tax', 'Invoice', 'Deleted Records'],
};

// Full permissions — every module read/add/edit/delete = true
const adminPermissions = {};
MODULES.forEach((m) => { adminPermissions[m] = { read: true, add: true, edit: true, delete: true }; });

// Full tab access — every tab true for every module that has tabs
const adminTabAccess = {};
MODULES.forEach((m) => {
  if (MODULE_TABS[m]?.length) {
    adminTabAccess[m] = {};
    MODULE_TABS[m].forEach((tab) => { adminTabAccess[m][tab] = true; });
  }
});

const ADMIN_DATA = {
  fullName:   'HNG Admin',
  email:      'superadmin@gmail.com',
  mobile:     '9000000000',
  password:   'Hng@123',
  role:       'Admin',
  department: 'Management',
  status:     'Active',
  permissions: adminPermissions,
  tabAccess:   adminTabAccess,
};

/**
 * Creates the admin user only when the users collection is empty.
 * Safe to call on every server start — no-op when users already exist.
 */
const seedAdminIfEmpty = async () => {
  const count = await User.countDocuments({ deletedAt: null });
  if (count === 0) {
    await User.create(ADMIN_DATA);
    console.log('✅  Auto-seed: admin user created.');
    console.log('    Login → email: superadmin@gmail.com | password: Hng@123');
  }
};

module.exports = { seedAdminIfEmpty, ADMIN_DATA, adminPermissions, adminTabAccess, MODULES };
