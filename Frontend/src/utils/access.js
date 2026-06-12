// Shared page/module access helpers.
//
// These mirror the deny-by-default permission logic used by PermissionRoute
// (src/App.jsx) and the Sidebar so the post-login landing page respects the
// access an admin has actually granted a user.

// Ordered module → landing route map. Order mirrors the sidebar so a user lands
// on the first module they can see, top-to-bottom.
export const MODULE_ROUTES = [
  { module: 'Dashboard', path: '/' },
  { module: 'Sales Team', path: '/sales' },
  { module: 'Operations', path: '/operations' },
  { module: 'Task Management', path: '/tasks' },
  { module: 'Dispatch Team', path: '/dispatch' },
  { module: 'Staff Management', path: '/staff' },
  { module: 'Inventory', path: '/inventory' },
  { module: 'Purchase', path: '/purchase' },
  { module: 'Vendors & Suppliers', path: '/vendors-suppliers' },
  { module: 'Billing', path: '/billing' },
  { module: 'Parties & Ledger', path: '/parties-ledger' },
  { module: 'Financial', path: '/financial' },
  { module: 'Expenses', path: '/expenses' },
  { module: 'Reports', path: '/reports' },
  { module: 'Notifications', path: '/notifications' },
  { module: 'Integration', path: '/integration/whatsapp' },
  { module: 'Settings', path: '/settings' },
];

// Mongoose Map fields serialize to plain objects, but normalize defensively in
// case a Map instance ever reaches the client.
const normalizePerms = (raw) =>
  raw instanceof Map
    ? Object.fromEntries(raw)
    : raw && typeof raw === 'object'
    ? raw
    : {};

// Whether the user may read (open) the given module. Super Admin / Admin always can.
export const canViewModule = (user, module) => {
  if (!user) return false;
  if (user.role === 'Super Admin' || user.role === 'Admin') return true;
  return normalizePerms(user.permissions)[module]?.read === true;
};

// First route the user is allowed to open. Used as the post-login landing page
// so a user without Dashboard access isn't dropped on the "Access Restricted"
// screen. Admins (and the no-permission edge case) fall back to Dashboard.
export const firstAccessiblePath = (user) => {
  if (!user || user.role === 'Super Admin' || user.role === 'Admin') return '/';
  const hit = MODULE_ROUTES.find((r) => canViewModule(user, r.module));
  return hit ? hit.path : '/';
};
