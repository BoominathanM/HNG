import { useSelector } from 'react-redux';
import { enqueueSnackbar } from 'notistack';

const ACTION_LABELS = {
  add: 'add records',
  edit: 'edit records',
  delete: 'delete records',
  read: 'view this module',
};

/**
 * Per-module CRUD access for the logged-in user.
 *
 * Admin / Super Admin bypass all checks and always get true.
 *
 * Usage:
 *   const { canAdd, canEdit, canDelete, requireAccess } = usePageAccess('Sales Team');
 *
 *   // Gate a button click:
 *   onClick={() => { if (!requireAccess('add')) return; setModalOpen(true); }}
 *
 * requireAccess(action) returns true if allowed; otherwise shows a warning
 * snackbar ("You don't have permission to …") and returns false.
 */
export default function usePageAccess(module) {
  const user = useSelector((s) => s.auth.user);

  const bypass = !user || user.role === 'Super Admin' || user.role === 'Admin';
  if (bypass) {
    return {
      canRead: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      requireAccess: () => true,
    };
  }

  const rawPerms = user.permissions;
  const perms =
    rawPerms instanceof Map
      ? Object.fromEntries(rawPerms)
      : rawPerms && typeof rawPerms === 'object'
      ? rawPerms
      : {};
  const perm = perms[module] || {};

  const canRead   = perm.read   === true;
  const canAdd    = perm.add    === true;
  const canEdit   = perm.edit   === true;
  const canDelete = perm.delete === true;

  const requireAccess = (action) => {
    const allowed = { read: canRead, add: canAdd, edit: canEdit, delete: canDelete };
    if (!allowed[action]) {
      enqueueSnackbar(
        `You don't have permission to ${ACTION_LABELS[action] || action} in this module.`,
        { variant: 'warning' },
      );
      return false;
    }
    return true;
  };

  return { canRead, canAdd, canEdit, canDelete, requireAccess };
}
