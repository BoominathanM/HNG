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
 * Default-allow semantics (keeps existing users unaffected):
 *   - Super Admin / Admin see every tab.
 *   - If the module has no tabAccess configured, every tab is visible.
 *   - A tab is hidden ONLY when the admin explicitly unchecked it
 *     (its key maps to an entry that is `=== false`).
 *   - Tabs whose key isn't part of the configurable list stay visible.
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
      // Whitelist semantics: tab access only restricts when the admin granted
      // at least one tab (some key === true). If nothing is granted (e.g. the
      // module was expanded only to set CRUD perms), don't restrict tabs at all.
      const granted = modAccess && typeof modAccess === 'object'
        ? Object.values(modAccess).some((v) => v === true)
        : false;
      if (granted) {
        visible = items.filter((item) => {
          if (!item) return false;
          const k = item.key;
          if (k == null) return true; // no key to match — keep it
          // Tabs the admin can't control (not in the config) stay visible;
          // controllable tabs show only when granted (true).
          return k in modAccess ? modAccess[k] === true : true;
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
