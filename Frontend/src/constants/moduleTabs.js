// Single source of truth for per-module sub-tabs used by tab-access control.
//
// Each entry maps a sidebar module to the PRIMARY page-level tabs of that page,
// using the tab's real `key` (stable, matches the <Tabs> items) and a
// human-readable `label` shown to the admin in Settings > Users.
//
// Both sides rely on this:
//   - Settings renders a checkbox per { key, label } and stores the user's
//     choice as tabAccess[module][key] = true | false.
//   - useTabAccess() hides a tab whose key is explicitly set to false.
//
// Keep the `key`s in sync with each page's primary <Tabs> items. Modules
// without primary tabs (e.g. Integration) are intentionally omitted.

// Staff Management has no in-page <Tabs>: its "tabs" are the sidebar
// sub-modules, each its own route. The Sidebar, the routes in App.jsx and the
// /staff landing redirect all gate on these keys (utils/access.js canViewTab).
export const STAFF_SUBMODULES = [
  { key: 'staff_list', label: 'Staff List', path: '/staff/list' },
  { key: 'attendance', label: 'Attendance', path: '/staff/attendance' },
  { key: 'overtime', label: 'Overtime', path: '/staff/overtime' },
  { key: 'payroll', label: 'Payroll', path: '/staff/payroll' },
  { key: 'incentive', label: 'Incentive', path: '/staff/incentive' },
  { key: 'approvals_leave', label: 'Approvals – Leave', path: '/staff/approvals/leave' },
  { key: 'approvals_permission', label: 'Approvals – Permission', path: '/staff/approvals/permission' },
  { key: 'approvals_punch', label: 'Approvals – Punch', path: '/staff/approvals/punch' },
  { key: 'approvals_fine', label: 'Approvals – Fine', path: '/staff/approvals/fine' },
  { key: 'approvals_reimbursement', label: 'Approvals – Reimbursement', path: '/staff/approvals/reimbursement' },
  { key: 'approvals_payslip', label: 'Approvals – Payslip Requests', path: '/staff/approvals/payslip' },
];

export const MODULE_TAB_DEFS = {
  'Staff Management': STAFF_SUBMODULES,
  'Sales Team': [
    { key: 'performance', label: 'Performance' },
    { key: 'leads', label: 'Leads' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'quotations', label: 'Quotations & Negotiations' },
    { key: 'orders', label: 'Orders' },
    { key: 'customers', label: 'Parties' },
    { key: 'forecast', label: 'Consumption Forecast' },
    { key: 'complaints', label: 'Complaints' },
  ],
  Operations: [
    { key: 'orders', label: 'Order Management' },
    { key: 'sticker', label: 'Sticker Printing' },
    { key: 'box', label: 'Box' },
    { key: 'frosted', label: 'Frosted Ziplock' },
    { key: 'butter_paper', label: 'Butter Paper' },
    { key: 'wooden_brush', label: 'Wooden Brush' },
    { key: 'other', label: 'Other' },
    { key: 'approved_designs', label: 'Approved Designs' },
  ],
  'Task Management': [
    { key: 'current', label: 'Current Task' },
    { key: 'suggested', label: 'Suggested Task' },
    { key: 'pendingRemaining', label: 'Pending Remaining Qty' },
    { key: 'timeconfig', label: 'Time Management' },
    { key: 'task_performance', label: 'Performance Report' },
  ],
  'Dispatch Team': [
    { key: 'dispatch', label: 'Dispatch Orders' },
    { key: 'pending_dispatch', label: 'Pending Dispatches' },
    { key: 'pickup', label: 'Pick Up Order' },
    { key: 'transport', label: 'Transport' },
  ],
  Inventory: [
    { key: 'stock', label: 'Stock Inventory' },
    { key: 'bulk', label: 'Bulk Items' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'history', label: 'Stock History' },
    { key: 'livecheck', label: 'Live Staff Checking' },
    { key: 'kit', label: 'Kit' },
    { key: 'material_stocks', label: 'Material Stocks' },
    { key: 'packing_config', label: 'Packing Material Configuration' },
    { key: 'damaged_report', label: 'Damaged Report' },
  ],
  Purchase: [
    { key: 'stock_status', label: 'Quotation & Raise Request' },
    { key: 'order_tracking', label: 'Dispatch Order Tracking' },
    { key: 'local_purchase', label: 'Local Purchase' },
    { key: 'history', label: 'Purchase Order History' },
    { key: 'quotation_comparison', label: 'Quotation Comparison' },
  ],
  'Vendors & Suppliers': [
    { key: 'vendors', label: 'Vendors' },
    { key: 'printing_suppliers', label: 'Printing Suppliers' },
  ],
  Billing: [
    { key: 'quotation-in-process', label: 'Quotation in Process' },
    { key: 'invoices', label: 'Invoices' },
  ],
  'Ledgers': [
    { key: 'all', label: 'All Parties' },
    { key: 'suppliers', label: 'Vendors Ledger' },
    { key: 'customers', label: 'Customers Ledger' },
  ],
  Financial: [
    { key: 'purchase_requests', label: 'Quotation Requests' },
    { key: 'expenses', label: 'Expense Payments' },
    { key: 'reimbursement', label: 'Reimbursement Expense' },
  ],
  Expenses: [
    { key: 'all', label: 'All Expenses' },
  ],
  Reports: [
    { key: 'sales_report', label: 'Sales Report' },
    { key: 'purchase_report', label: 'Purchase Report' },
    { key: 'local_purchase_report', label: 'Local Purchase Report' },
    { key: 'pl', label: 'Profit & Loss' },
    { key: 'bill_pl', label: 'Bill-wise P&L' },
    { key: 'performance', label: 'Performance' },
    { key: 'monthly_gst', label: 'Monthly GST' },
    { key: 'forwarding_courier', label: 'Forwarding & Courier Charges' },
    { key: 'auditor_tax', label: 'Auditor Tax Report' },
    { key: 'emergency_approvals', label: 'Approval Report' },
    { key: 'switch_report', label: 'Switch Report' },
    { key: 'damaged_report', label: 'Damaged Report' },
    { key: 'task_performance', label: 'Task Management Performance' },
    { key: 'payment_bank_report', label: 'Payment Bank Details' },
  ],
  Settings: [
    { key: 'general', label: 'General' },
    { key: 'users', label: 'User Management' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'gst', label: 'GST & Tax' },
    { key: 'invoice_settings', label: 'Invoice Settings' },
    { key: 'alert_configuration', label: 'Alert Configuration' },
    { key: 'snoozed_alerts', label: 'Snoozed Alerts' },
    { key: 'deleted_records', label: 'Deleted Records' },
  ],
};

export default MODULE_TAB_DEFS;
