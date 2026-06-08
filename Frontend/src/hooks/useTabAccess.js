import { useSelector } from 'react-redux';

// Mongoose Map fields serialize to plain objects, but normalize defensively
// in case a Map instance ever reaches the client.
const normalizeMap = (m) =>
  m instanceof Map ? Object.fromEntries(m) : (m && typeof m === 'object' ? m : {});

/**
 * Per-module tab access for the logged-in user.
 *
 * The admin configures which sub-tabs a user may see under Settings > Users
 * ("Page & Tab Access"). Those choices are stored on the user as
 * `tabAccess[module][<tab label>] = true | false`.
 *
 * Whitelist semantics:
 *   - Super Admin / Admin see every tab.
 *   - If a module has no tabAccess configured (empty or missing), every tab
 *     is visible (no restriction applied).
 *   - Once the admin grants at least one tab (any key === true), ONLY the
 *     explicitly-true tabs are shown. Every other tab — including ones whose
 *     key is absent from the config — is hidden.
 *   - This means the admin configures access by CHECKING what the user may
 *     see; unchecked/unconfigured tabs are hidden once any grant exists.
 *
 * Matching is done by the tab's stable `key` (e.g. 'order-in-process'), which
 * is what Settings stores in tabAccess (see src/constants/moduleTabs.js). This
 * is robust even when a tab's visible label is JSX (icons/badges/counts).
 *
 * Usage in a page with a controlled <Tabs>:
 *   const { filterTabs, activeKeyFor } = useTabAccess('Billing');
 *   <Tabs
 *     onChange={setActiveTab}
 *     items={filterTabs([...])}            // evaluate items first so the active
 *     activeKey={activeKeyFor(activeTab)}  // key can fall back to a visible tab
 *   />
 *
 * Uncontrolled <Tabs defaultActiveKey="x"> only needs items={filterTabs([...])};
 * rc-tabs auto-selects a visible tab when the default one is hidden.
 */
export default function useTabAccess(module) {
  const user = useSelector((s) => s.auth.user);

  // Stash the most recent filter result so activeKeyFor() can fall back to a
  // visible tab. Within a single render the items prop (filterTabs) is
  // evaluated before the activeKey prop, so this is populated in time.
  const stash = { visible: null };

  const filterTabs = (items) => {
    if (!Array.isArray(items)) return items;

    let visible = items;
    if (user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      const modAccess = normalizeMap(user.tabAccess)[module];
      // Whitelist: restrict ONLY when the admin has explicitly granted ≥1 tab.
      // When restricted, ONLY tabs with key === true are shown — tabs missing
      // from the config are also hidden, so the admin controls access by
      // checking what the user may see (not by unchecking what they can't).
      const granted = modAccess && typeof modAccess === 'object'
        ? Object.values(modAccess).some((v) => v === true)
        : false;
      if (granted) {
        visible = items.filter((item) => {
          if (!item) return false;
          const k = item.key;
          if (k == null) return true;
          return modAccess[k] === true;
        });
      }
    }
    stash.visible = visible;
    return visible;
  };

  // For controlled <Tabs>: keep the active key valid when the current tab was
  // filtered out, falling back to the first visible tab.
  const activeKeyFor = (current) => {
    const visible = stash.visible;
    if (!Array.isArray(visible)) return current;
    if (visible.some((i) => i && i.key === current)) return current;
    return visible[0]?.key;
  };

  return { filterTabs, activeKeyFor };
}
