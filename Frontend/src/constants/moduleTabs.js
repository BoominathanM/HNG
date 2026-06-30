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
// without primary tabs (e.g. Staff, Integration) are intentionally omitted.
export const MODULE_TAB_DEFS = {
  'Sales Team': [
    { key: 'performance', label: 'Performance' },
    { key: 'leads', label: 'Leads' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'quotations', label: 'Quotations & Negotiations' },
    { key: 'orders', label: 'Orders' },
    { key: 'customers', label: 'Parties' },
    { key: 'complaints', label: 'Complaints' },
  ],
  Operations: [
    { key: 'orders', label: 'Order Management' },
    { key: 'sticker', label: 'Sticker Printing' },
    { key: 'box', label: 'Box' },
    { key: 'frosted', label: 'Frosted Ziplock' },
    { key: 'butter_paper', label: 'Butter Paper' },
  ],
  'Task Management': [
    { key: 'current', label: 'Current Task' },
    { key: 'suggested', label: 'Suggested Task' },
    { key: 'timeconfig', label: 'Time Management' },
  ],
  'Dispatch Team': [
    { key: 'dispatch', label: 'Dispatch Orders' },
    { key: 'pickup', label: 'Pick Up Order' },
    { key: 'transport', label: 'Transport' },
  ],
  Inventory: [
    { key: 'stock', label: 'Stock Inventory' },
    { key: 'approvals', label: 'Approvals' },
    { key: 'history', label: 'Stock History' },
    { key: 'livecheck', label: 'Live Staff Checking' },
    { key: 'kit', label: 'Kit' },
    { key: 'material_stocks', label: 'Material Stocks' },
    { key: 'packing_config', label: 'Packing Material Configuration' },
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
  'Parties & Ledger': [
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
    { key: 'other', label: 'Other Expenses' },
    { key: 'purchase', label: 'Purchase Expenses' },
  ],
  Reports: [
    { key: 'sales_report', label: 'Sales Report' },
    { key: 'purchase_report', label: 'Purchase Report' },
    { key: 'pl', label: 'Profit & Loss' },
    { key: 'bill_pl', label: 'Bill-wise P&L' },
    { key: 'performance', label: 'Performance' },
    { key: 'monthly_gst', label: 'Monthly GST' },
    { key: 'auditor_tax', label: 'Auditor Tax Report' },
  ],
  Settings: [
    { key: 'general', label: 'General' },
    { key: 'users', label: 'User Management' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'gst', label: 'GST & Tax' },
    { key: 'invoice_settings', label: 'Invoice Settings' },
    { key: 'deleted_records', label: 'Deleted Records' },
  ],
};

export default MODULE_TAB_DEFS;
