// ─── Item normalization helpers ────────────────────────────────────────────────
// Exported so both Operations/index.jsx and OperationDetail.jsx can use them.

// Normalize any yes/no-ish value to uppercase enum ('YES'|'NO'|'').
// Old DB records may store lowercase 'yes'/'no' — the sticker-queue checks
// (item.sticker === 'YES') and enum validators require uppercase.
export const normYNOps = (v) => { const s = String(v ?? '').trim().toLowerCase(); return s === 'yes' ? 'YES' : s === 'no' ? 'NO' : ''; };

// Resolve a packing material string → Operations tab ('Box'|'Ziplock'|'Butter Paper'|'') by keyword match.
// Used as a fallback when the item has no config-map entry (old orders, unregistered names).
export const packTabFromString = (pm) => {
  const p = (pm || '').toLowerCase();
  // 'paper' is checked alongside 'butter' because "butter paper pouch" is sometimes
  // typed with a typo (e.g. "butte paper pouch") — without this, the typo falls through
  // to the 'pouch' match below and misroutes to Ziplock instead of Butter Paper.
  if (p.includes('butter') || p.includes('paper')) return 'Butter Paper';
  if (p.includes('ziplock') || p.includes('frosted') || p.includes('pouch')) return 'Ziplock';
  if (p.includes('box')) return 'Box';
  if (p.includes('wooden') || p.includes('brush')) return 'Wooden Brush';
  // 'Other' is deliberately NOT keyword-matched here — "other" is a substring of many
  // unrelated words (another, brother, mother…) and would misroute free-text packing
  // material names. It's reachable only via an explicit tabMapping/displayUnitTab selection.
  return '';
};

// Resolve a KIT item's packaging tab + display-unit NAME, preferring the item's OWN
// per-kit value so a multi-kit order (e.g. dental=Ziplock, shaving=Box, bath=Pouch) routes
// each kit to its respective tab. Falls back to the single order-level display unit when the
// item carries no per-kit value — so single-kit and legacy orders behave exactly as before.
export const kitTabOf = (item, order) => (item && item.displayUnitTab) || (order && order.displayUnitTab) || '';
export const kitDuNameOf = (item, order) =>
  (item && item.displayUnit) || (order && (order.kitDisplayUnit || order.displayUnit)) || '';

// Infer logoType for items saved before mapOrderItem started computing it.
// existing: the currently stored logoType (returned as-is when truthy so we never overwrite data).
export const inferItemLogoType = (sticker, printing, pmRaw, packingMaterialTab, existing) => {
  if (existing) return existing;
  // Sticker=Yes is always a sticker job → Sticker tab.
  if (sticker === 'YES') return 'Sticker';
  const hay = (pmRaw || '').toLowerCase();
  // Packing material decides the destination for everything else (incl. Printing=Yes items, which
  // go DIRECTLY to their box/ziplock/butter packaging tab rather than the Sticker tab).
  if (hay.includes('butter') || hay.includes('paper')) return 'Butter Paper';
  if (hay.includes('frosted') || hay.includes('ziplock') || hay.includes('pouch')) return 'Frosted Ziplock';
  if (hay.includes('box')) return 'Box';
  if (hay.includes('wooden') || hay.includes('brush')) return 'Wooden Brush';
  if (packingMaterialTab === 'Butter Paper') return 'Butter Paper';
  if (packingMaterialTab === 'Ziplock') return 'Frosted Ziplock';
  if (packingMaterialTab === 'Box') return 'Box';
  if (packingMaterialTab === 'Wooden Brush') return 'Wooden Brush';
  if (packingMaterialTab === 'Other') return 'Other';
  // Printing=Yes with no resolvable packaging destination → print/sticker tab.
  if (printing === 'YES') return 'Sticker';
  if (sticker !== 'NO' && hay.includes('sticker')) return 'Sticker';
  return '';
};

// Order-composition category of an order item, inferring for legacy items that predate the field.
//  personalized = kit + extra products; separate_kit = kit as-is; separate_product = individual item.
export const ORDER_CATEGORY_META = {
  personalized: { label: 'Personalized', color: '#7c3aed' },
  separate_kit: { label: 'Separate Kit', color: '#0ea5e9' },
  separate_product: { label: 'Separate Product', color: '#ec4899' },
};
export const itemCategoryOf = (item) =>
  item?.category || ((item?.isKit || item?.kitType) ? 'separate_kit' : 'separate_product');

// ──────────────────────────────────────────────────────────────────────────────

export const SIZE_MAP = {
  Soap: '2.5cm x 2.5cm',
  Shampoo: '2cm x 3cm',
  'Coconut Oil': '2cm x 3cm',
  Conditioner: '2cm x 3cm',
  'Shower Gel': '2cm x 3cm',
  'Dental Kit': '3cm x 2cm',
};

export const PAYMENT_LABELS = {
  BEFORE_100: '100% Payment Before Dispatch',
  ON_DISPATCH: '50% Advance, 50% on Dispatch',
  '50_ADVANCE_50_AFTER': '50% adv 50% on delivery',
  CREDIT_10_30: 'Credit (10days to 1 month)',
};

// Matches StickerRequest.status exactly (Backend/src/models/StickerRequest.js) so rows
// built from a live StickerRequest — see buildProductionQueues below — always land in a
// real bucket here instead of a renamed one that no longer exists on the record.
export const DESIGN_FLOW = [
  'Pending', 'Waiting for Approval', 'Design Confirmation', 'Approved', 'In Process',
  'Printing', 'Dispatch', 'Received', 'Design Change', 'Done',
];

export const designColor = {
  Pending: 'blue', 'Waiting for Approval': 'gold', 'Design Confirmation': 'cyan',
  Approved: 'green', 'In Process': 'orange', Printing: 'magenta', Dispatch: 'purple',
  Received: 'geekblue', 'Design Change': 'red', Done: 'success',
};

export const statusPill = {
  Approved: 'green', Waiting: 'gold', Partial: 'orange', Received: 'green',
  'Not Received': 'default', Printing: 'magenta', 'In Process': 'orange',
  'Not Started': 'default', Available: 'success', Busy: 'warning',
};

// Same Paid/Partial/Pending enum used by Sales, Billing and Task Management, so
// the order's live payment status reads identically wherever it's shown.
export const paymentStatusColor = { Paid: 'success', Partial: 'orange', Pending: 'warning' };

export const FLOW_STAGES = [
  'Order Received', 'Sent To Design', 'Client Approved', 'Printing', 'Stock Received', 'Task Assigned',
];

export const designerCredentials = {
  username: 'designops@healnglow.com',
  password: 'HNG@Design2024',
  portal: 'Internal design portal — share only with authorized design staff',
};

// Returns a product-specific default size ONLY when the product name matches a known
// SIZE_MAP entry. Returns '' (no fabricated value) for unrecognized products (e.g. Comb)
// so the Sticker Queue shows the item's real (blank) size instead of a coincidental
// hardcoded default that reads like leaked data from an unrelated product.
export const getDefaultSize = (product) => {
  const key = Object.keys(SIZE_MAP).find((item) => product.toLowerCase().includes(item.toLowerCase()));
  return key ? SIZE_MAP[key] : '';
};

export const getProgressFromChecks = (checks) => {
  if (!checks) return 0;
  const keys = ['designRequired', 'pdfReady', 'designSent', 'clientApproved', 'printingStarted', 'stockReceived', 'operationApproved'];
  const done = keys.filter((k) => checks[k]).length;
  return Math.round((done / keys.length) * 100);
};

export const canAssignTaskFromChecks = (checks) => {
  if (!checks) return false;
  return checks.pdfReady && checks.designSent && checks.clientApproved &&
    checks.printingStarted && checks.stockReceived && checks.operationApproved;
};

export const getFlowStep = (order) => {
  const r = order.readiness || {};
  if (order.taskStatus === 'Full') return 5;
  if (r.stockReceived && r.operationApproved) return 4;
  if (order.printingStatus === 'In Process' || order.printingStatus === 'Printing') return 3;
  if (r.clientApproved) return 2;
  if (r.designSent) return 1;
  return 0;
};

// Returns true when the item's physical packaging is frosted/ziplock/pouch —
// regardless of whether the item also needs sticker printing.
// Priority order: (1) explicit displayUnitTab from config, (2) logoType field,
// (3) string-match fallback on display unit / packing material names.
const hasFrostedPackaging = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  // Kit items: display unit tab determines their packaging — packing material is irrelevant.
  if (isKitItem && kitTabOf(item, order) === 'Ziplock') return true;
  // Standalone products: use their own config-resolved packingMaterial tab.
  if (item.packingMaterialTab === 'Ziplock') return true;
  if (item.logoType === 'Frosted Ziplock') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  // Exclude 'paper' so a "Butter (paper) pouch" packing material isn't misread as ziplock
  // just because it also contains "pouch" — mirrors the duNameLc guard below.
  if (!pm.includes('paper') && (pm.includes('ziplock') || pm.includes('frosted') || pm.includes('pouch'))) return true;
  // Kit items only: fall back to display unit name when displayUnitTab not yet stored.
  if (isKitItem) {
    const du = kitDuNameOf(item, order).toLowerCase();
    return du.includes('ziplock') || du.includes('frosted') || du.includes('pouch');
  }
  return false;
};

// Returns true when the item's physical packaging is butter paper — regardless of whether
// the item also needs sticker printing. Mirrors hasFrostedPackaging.
// Priority: (1) explicit displayUnitTab from config, (2) packingMaterialTab, (3) logoType,
// (4) string-match fallback on display unit / packing material names.
const hasButterPaperPackaging = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  if (isKitItem && kitTabOf(item, order) === 'Butter Paper') return true;
  if (item.packingMaterialTab === 'Butter Paper') return true;
  if (item.logoType === 'Butter Paper') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('butter')) return true;
  if (isKitItem) {
    const du = kitDuNameOf(item, order).toLowerCase();
    return du.includes('butter');
  }
  return false;
};

// Returns true when the item's physical packaging is wooden brush — regardless of whether
// the item also needs sticker printing. Mirrors hasButterPaperPackaging.
const hasWoodenBrushPackaging = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  if (isKitItem && kitTabOf(item, order) === 'Wooden Brush') return true;
  if (item.packingMaterialTab === 'Wooden Brush') return true;
  if (item.logoType === 'Wooden Brush') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('wooden') || pm.includes('brush')) return true;
  if (isKitItem) {
    const du = kitDuNameOf(item, order).toLowerCase();
    return du.includes('wooden') || du.includes('brush');
  }
  return false;
};

// Returns true when the item's packaging is explicitly "Other" — deliberately NO keyword/
// string matching (see packTabFromString comment above), only explicit config selections.
const hasOtherPackaging = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  if (isKitItem && kitTabOf(item, order) === 'Other') return true;
  if (item.packingMaterialTab === 'Other') return true;
  if (item.logoType === 'Other') return true;
  return false;
};

const isFrostedZiplock = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  // Kit items: display unit determines final tab; sticker flag still respected
  // (sticker=YES kit items go to Sticker tab first, then Frosted after).
  if (isKitItem && kitTabOf(item, order) === 'Ziplock') {
    if (item.sticker === 'YES') return false;
    return true;
  }
  if (item.sticker === 'YES') return false;
  return hasFrostedPackaging(item, order);
};

// Returns true when an item requires sticker printing.
// Only an explicit sticker='YES' (normalized) qualifies — unset/empty/'NO' all return false.
// This prevents items where sticker was never selected from leaking into the Sticker tab
// via old logoType='Sticker' inferences stored on legacy records.
const itemNeedsSticker = (item) => normYNOps(item.sticker) === 'YES';

// Returns true when an item needs a direct printing step (Printing = Yes on the product/kit).
const itemNeedsPrinting = (item) => String(item.printing ?? '').trim().toUpperCase() === 'YES';

// Combined "has print/sticker work" check (sticker OR printing) — used for the queue note,
// the stickerPrinting flag, and the "no reason to be in this packaging tab" exclusion.
const itemNeedsPrintStep = (item) => itemNeedsSticker(item) || itemNeedsPrinting(item);

// Whether an item must pass through the Sticker/Print tab BEFORE it appears in its
// box/ziplock/butter packaging tab.
//   • GENUINE KITS (separate + personalized): NEVER — a kit always routes DIRECTLY to its
//     display-unit tab (Box/Ziplock/Butter); any sticker/printing is a sub-step done within
//     that tab.
//   • Standalone products (including a standalone product's synthesized "personalized packing"
//     copy — see isPersonalizedPacking/underlyingIsKit in index.jsx): only Sticker=Yes routes
//     through the Sticker tab — but a Sticker=Yes product's destination IS the sticker tab (it
//     never reaches a packaging queue), so in the packaging queues this is effectively always
//     false. A Printing=Yes (Sticker=No) product with box/ziplock/butter packing goes DIRECTLY
//     to that packaging tab.
// A "personalized packing" copy has isKit forced to true so it routes by the outer unit's
// display-unit tab (see index.jsx), regardless of whether the underlying included item is
// itself a kit or a standalone product — so that forced flag alone can't be used here to
// decide gate-exemption. underlyingIsKit records the item's REAL kind before that override,
// so a bundled standalone product (e.g. a Comb with its own sticker=YES) still has to clear
// its own sticker step before its personalized-packing copy shows in the packaging tab,
// instead of leaking into Box/Ziplock/Butter at the same time it's awaiting sticker approval.
const mustPrintBeforePackaging = (item) => {
  const isGenuineKit = item.isPersonalizedPacking
    ? !!item.underlyingIsKit
    : !!(item.isKit || item.kitType);
  if (isGenuineKit) return false;
  return itemNeedsSticker(item);
};

// Determine an item's ultimate packaging destination (after sticker step completes).
const getItemPackagingType = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  // ── KIT ITEMS: the DISPLAY UNIT is the single source of routing truth. ──
  // A kit's packaging destination is its display unit (Box/Ziplock/Butter Paper) and NOTHING
  // else — the kit's packing material describes the INDIVIDUAL products packed inside it, which
  // is a separate (personalized-only) sub-step handled in buildProductionQueues, NOT the kit's
  // own destination. Resolving the display unit fully here (config tab first, then the display
  // unit NAME) BEFORE any packingMaterial / pm-string / logoType guess prevents a separate kit
  // whose display unit is e.g. Ziplock from leaking into the Box tab just because its packing
  // material string happens to contain "box". Uses the item's OWN per-kit display unit (kitTabOf)
  // so each kit in a multi-kit order routes to its respective tab; falls back to the order-level
  // display unit for single-kit orders.
  if (isKitItem) {
    const tab = kitTabOf(item, order);
    if (tab === 'Butter Paper') return 'butter';
    if (tab === 'Ziplock') return 'frosted';
    if (tab === 'Box') return 'box';
    if (tab === 'Wooden Brush') return 'wooden_brush';
    if (tab === 'Other') return 'other';
    // displayUnitTab not resolved (legacy / unregistered display unit) → fall back to the
    // display unit NAME before considering any packing-material signal.
    const du = kitDuNameOf(item, order).toLowerCase();
    if (du.includes('butter')) return 'butter';
    if (du.includes('ziplock') || du.includes('frosted') || du.includes('pouch')) return 'frosted';
    if (du.includes('box')) return 'box';
    if (du.includes('wooden') || du.includes('brush')) return 'wooden_brush';
    // Display unit entirely unresolvable → fall through to the generic fallbacks below so the
    // kit still lands somewhere (legacy orders with no display unit at all).
  }
  // Standalone products with sticker=YES stay in the Sticker tab after printing — they do
  // NOT move on to a Box/Ziplock/Butter Paper tab regardless of packingMaterialTab.
  if (!isKitItem && itemNeedsSticker(item)) return 'sticker';
  // Standalone products (and display-unit-less legacy kits): config-resolved packingMaterial tab.
  if (item.packingMaterialTab === 'Butter Paper') return 'butter';
  if (item.packingMaterialTab === 'Ziplock') return 'frosted';
  if (item.packingMaterialTab === 'Box') return 'box';
  if (item.packingMaterialTab === 'Wooden Brush') return 'wooden_brush';
  if (item.packingMaterialTab === 'Other') return 'other';
  if (hasButterPaperPackaging(item, order)) return 'butter';
  if (hasFrostedPackaging(item, order)) return 'frosted';
  if (hasWoodenBrushPackaging(item, order)) return 'wooden_brush';
  if (hasOtherPackaging(item, order)) return 'other';
  if (item.logoType === 'Box') return 'box';
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('butter')) return 'butter';
  if (pm.includes('box')) return 'box';
  if (pm.includes('wooden') || pm.includes('brush')) return 'wooden_brush';
  return 'sticker';
};

// Labels shown in the queue table for the packaging destination column.
export const PACKAGING_TYPE_LABELS = {
  sticker: 'Sticker Only',
  box: 'Box',
  frosted: 'Frosted Ziplock',
  butter: 'Butter Paper',
  wooden_brush: 'Wooden Brush',
  other: 'Other',
};

// Statuses that indicate the item has moved ON from sticker to box/frosted manufacturing.
// The move happens AFTER the sticker is printed (Print button → status 'In Process'),
// not at Approved. Items with these statuses and a box/frosted destination are removed
// from the sticker queue and, in lockstep, added to the box/frosted queue.
const STICKER_MOVED_ON_STATUSES = new Set(['In Process', 'Printing', 'Dispatch', 'Received', 'Done']);

// Statuses that mean an emergency item's production is fully complete.
const EMERGENCY_COMPLETE_STATUSES = new Set(['Done', 'Received', 'Closed']);

// Effective TOTAL quantity of an order item. Kit-component items (Paste/Brush inside a Dental
// kit, etc.) store their PER-KIT RATIO in `qty` (e.g. 1 paste + 2 brushes per kit — NOT
// necessarily 1) — the true total is that ratio × however many kits were ordered (kitOrders[]'s
// overallQty, or the order-level kitOverallQty fallback). This is the exact same formula
// Backend sales.controller.js's deductInventoryForOrder uses to decide how much stock a kit
// order actually consumes (`qty = perUnitQty * kitCount`), so Operations' counts never disagree
// with what was actually deducted. Standalone (non-kit) items already store their real total
// directly in `qty`. A prior version of this helper returned the kit count alone (or a stray
// `it.overallQty`) without multiplying by the ratio — correct only for kits whose every
// component happened to be exactly 1-per-kit, wrong the moment any component's ratio differs
// (e.g. 2 brushes/kit showed as if it needed only 1× the kit count, not 2×).
const effectiveItemQty = (it, order, kitCfgById) => {
  if (!(it.isKit || it.kitType)) return Number(it.qty) || 0;
  const perUnitQty = Number(it.qty) || 0;
  const kitCfg = kitCfgById[String(it.kitId)] || null;
  const kitCount = Number(kitCfg?.overallQty) || Number(order.kitOverallQty) || 0;
  if (kitCount > 0) return perUnitQty * kitCount;
  // No resolvable kit count — fall back to a legacy per-item overallQty override, if present.
  return Number(it.overallQty) || perUnitQty || 0;
};

// Number of KITS ordered (NOT the per-product total) for a kit-flagged item — the shared
// "how many kits" denominator a splitDate's emergency qty is expressed against (e.g. "50 of
// the 100 kits are emergency"). Resolves the same way effectiveItemQty resolves it internally,
// but returns the count itself rather than qty × count, since the proportional split below
// needs kitEmergencyQty and groupTotalQty in the SAME unit (kits, not multiplied product units).
const resolveKitCount = (it, order, kitCfgById) => {
  const kitCfg = kitCfgById[String(it.kitId)] || null;
  return Number(kitCfg?.overallQty) || Number(order.kitOverallQty) || 0;
};

// Returns a Map of lowercase product name → emergency qty (number) or null if no qty specified.
// When qty is present, only the order item with that exact qty should be marked emergency.
// When qty is null, all items with that product name are emergency (legacy / no-qty entries).
// Three split-date "product" values expand to more than one order item:
//  '__kit__'         legacy "Kit (All Products)" — every kit-flagged item in the order, scoped to
//                     the largest kit's overallQty. Kept for orders saved before the category split
//                     below existed; new selections use the more precise keys.
//  '__personalized__' the Personalized Kit bundle — every item categorised 'personalized' PLUS
//                     anything packed inside it via packagingIncludes (a Separate Kit/Product bundled
//                     into the personalized outer unit is part of the SAME physical unit).
//  '__sepkit__:<key>' a single standalone kit (kitId, or kitName/kitType as fallback) that is NOT
//                     bundled into a personalized order, scoped to that kit's own overallQty.
// mirrors OperationDetail.jsx's expandKit so Personalized Kit orders get the same per-product
// emergency/gating treatment in the shared Sticker/Box/Frosted/Butter queues (previously '__kit__'
// never matched any real product name, so every item silently stayed isEmergencyGated=true forever).
export const getEmergencyProductQtyMap = (order) => {
  const map = new Map();
  const kitCfgById = Object.fromEntries(
    (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
  );
  const includeSet = new Set((order.packagingIncludes || []).map(String));
  const isBundled = (it) => includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName));
  // How much of a bundled row is actually packed INSIDE the personalized kit — e.g. a Separate
  // Product ordered at qty 20 but only 5 of those units packed into the kit (packagingIncludesQty
  // holds that 5). Used to cap a bundled item's contribution to the personalized-kit emergency
  // split at the bundled amount, not its full standalone order qty (see expandPersonalized).
  const piQty = order.packagingIncludesQty || {};
  const bundledQtyFor = (it) => {
    // Non-kit items carry `kitId: ''` (empty string, not null/undefined) — `it.kitId != null`
    // was true for that empty string, so `key` locked onto '' and never fell back to the name
    // key, and `includeSet.has('')` is always false. That silently made bundledQtyFor return
    // null for every Separate Product (Soap/Comb), letting expandPersonalized fall through to
    // effectiveItemQty (the item's FULL order qty) instead of its bundled portion — inflating
    // the emergency split. Try the kitId key only when it's actually truthy, same as isBundled above.
    const kitKey = it.kitId ? String(it.kitId) : '';
    if (kitKey && includeSet.has(kitKey)) return Number(piQty[kitKey]) || 0;
    const nameKey = String(it.name || it.itemName || '');
    return includeSet.has(nameKey) ? (Number(piQty[nameKey]) || 0) : null;
  };

  // Proportionally splits `kitEmergencyQty` KITS of demand across `items`, whose shared "kit
  // count" denominator is `groupTotalQty` — each item's share is (kitEmergencyQty / groupTotalQty)
  // times that item's OWN effective total, capped at its own total so rounding can't over-allocate.
  // kitEmergencyQty/groupTotalQty MUST both be in kit-count units, not per-product multiplied
  // units — a splitDate of "50" means "50 of the kits", and each component's own ratio (1 paste,
  // 2 brushes per kit) is what turns that shared 50-kit figure into a different absolute number
  // per product (50 paste, 100 brushes) via the itemQty multiplication below. `qtyResolver`
  // overrides how an item's own total is resolved (default effectiveItemQty) — expandPersonalized
  // uses it to cap a partially-bundled Separate Kit/Product at its bundled qty instead of its
  // full standalone order qty.
  const expandGroup = (items, groupTotalQty, kitEmergencyQty, qtyResolver) => {
    const resolveQty = qtyResolver || ((it) => effectiveItemQty(it, order, kitCfgById));
    if (items.length === 0) return;
    if (kitEmergencyQty === null) {
      items.forEach((it) => {
        const key = (it.product || it.itemName || '').toLowerCase();
        if (key && !map.has(key)) map.set(key, null);
      });
      return;
    }
    if (!groupTotalQty) return;
    items.forEach((it) => {
      const key = (it.product || it.itemName || '').toLowerCase();
      if (!key || map.has(key)) return;
      const itemQty = resolveQty(it);
      const qty = Math.min(Math.round((kitEmergencyQty / groupTotalQty) * itemQty), itemQty);
      map.set(key, qty);
    });
  };

  const expandLegacyKit = (kitEmergencyQty) => {
    const items = (order.items || []).filter((it) => it.isKit || it.kitType);
    // '__kit__' can span several distinct kits at once — scope the shared denominator to the
    // LARGEST kit's own count (a real kit count, not Math.max of already-multiplied product
    // totals, which would wrongly inflate the denominator for any kit whose per-item ratio > 1).
    const groupTotalQty = items.length ? Math.max(...items.map((it) => resolveKitCount(it, order, kitCfgById))) : 0;
    expandGroup(items, groupTotalQty, kitEmergencyQty);
  };

  const expandPersonalized = (kitEmergencyQty) => {
    const items = (order.items || []).filter((it) => it.category === 'personalized' || isBundled(it));
    const kitItemsInGroup = items.filter((it) => it.isKit || it.kitType);
    const groupTotalQty = kitItemsInGroup.length
      ? Math.max(...kitItemsInGroup.map((it) => resolveKitCount(it, order, kitCfgById)))
      : (Number(order.kitOverallQty) || 0);
    // A row pulled into this group only because it's PARTIALLY bundled into the personalized
    // kit (not itself a personalized-category component) must contribute only its bundled
    // portion — otherwise a Separate Product ordered at 20 with just 5 packed into the kit
    // has its FULL 20 marked emergency the moment any of the kit is, instead of just the 5
    // that actually ship inside it (the other 15 ship separately and aren't emergency).
    const qtyResolver = (it) => {
      if (it.category !== 'personalized') {
        const bundled = bundledQtyFor(it);
        if (bundled != null) return bundled;
      }
      return effectiveItemQty(it, order, kitCfgById);
    };
    expandGroup(items, groupTotalQty, kitEmergencyQty, qtyResolver);
  };

  const expandSeparateKit = (kitKey, kitEmergencyQty) => {
    const items = (order.items || []).filter(
      (it) => !isBundled(it) && String(it.kitId || it.kitName || it.kitType) === kitKey,
    );
    const groupTotalQty = items.length ? Math.max(...items.map((it) => resolveKitCount(it, order, kitCfgById))) : 0;
    expandGroup(items, groupTotalQty, kitEmergencyQty);
  };

  const handleEntry = (product, qty) => {
    if (!product) return;
    if (product === '__kit__') { expandLegacyKit(qty); return; }
    if (product === '__personalized__') { expandPersonalized(qty); return; }
    if (typeof product === 'string' && product.startsWith('__sepkit__:')) {
      expandSeparateKit(product.slice('__sepkit__:'.length), qty);
      return;
    }
    const key = product.toLowerCase();
    if (!map.has(key)) map.set(key, qty);
  };

  (order.splitDates || []).forEach((sd) => {
    (sd.products || []).forEach((ep) => handleEntry(ep.product, ep.qty != null ? Number(ep.qty) : null));
    handleEntry(sd.product, sd.qty != null ? Number(sd.qty) : null);
  });
  return map;
};

// Returns a Set of lowercase product names that have an emergency delivery date in splitDates.
export const getEmergencyProductSet = (order) => new Set(getEmergencyProductQtyMap(order).keys());

export const buildProductionQueues = (orders = [], stickerRequests = [], queueSteps = {}) => {
  // Find the StickerRequest document for a given order + product combination.
  // Case-insensitive product match to guard against minor name inconsistencies.
  // Pass stickerType to restrict the search to a specific queue type (e.g. 'Sticker').
  const findSR = (orderId, product, stickerType = null, category = null) => {
    const pLower = (product || '').toLowerCase();
    const matches = stickerRequests.filter(
      (s) =>
        (s.orderId?.orderCode === orderId || s.orderId === orderId) &&
        (s.product || '').toLowerCase() === pLower &&
        (stickerType === null || s.stickerType === stickerType),
    );
    if (category === null) return matches[0];
    // Category-scoped: when the same product appears twice in one order (once as
    // Separate Kit, once as Personalized), each gets its OWN StickerRequest/approval —
    // mirrors findStickerReq in index.jsx. Prefer the matching category; fall back to a
    // legacy request with no category (orders created before this existed).
    return matches.find((s) => (s.category || '') === category) || matches.find((s) => !s.category);
  };

  // Returns true when every emergency product for the order has a completed StickerRequest.
  // Used to determine whether non-emergency items can advance ("emergency phase done").
  const areAllEmergencyItemsDone = (order) => {
    const emergencySet = getEmergencyProductSet(order);
    if (emergencySet.size === 0) return true;
    for (const product of emergencySet) {
      const sr = findSR(order.id, product);
      if (!sr || !EMERGENCY_COMPLETE_STATUSES.has(sr.status)) return false;
    }
    return true;
  };

  // Returns the local queue step for a sticker-queue item (orderId + item index).
  const localStickerStep = (orderId, itemIdx) =>
    queueSteps[`${orderId}-${itemIdx}-sticker`] ?? 0;

  // True once the item's sticker has been PRINTED — only then does it move on to the
  // box/frosted manufacturing queue (mirrors the sticker-queue removal threshold so the
  // item is never shown in two tabs at once).
  // Only checks Sticker-type SRs so that a Box/Frosted SR created within those tabs
  // does not falsely report the sticker step as complete.
  const isStickerPrinted = (orderId, product, itemIdx) => {
    const sr = findSR(orderId, product, 'Sticker');
    if (sr && STICKER_MOVED_ON_STATUSES.has(sr.status)) return true;
    // Fallback: local state shows printing started (handles items where Print was
    // clicked this session but the RTK refetch hasn't completed yet).
    if (itemIdx !== undefined && localStickerStep(orderId, itemIdx) >= 3) return true;
    return false;
  };

  return {
    // Sticker queue: all items that need sticker printing (logoType=Sticker or sticker=YES),
    // excluding pure frosted/ziplock items that don't need sticker printing.
    // Also excludes items that have already moved on to box/frosted manufacturing.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    sticker: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const items = (order.items || []).map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          // Sticker tab shows ONLY items where sticker printing was explicitly requested.
          // sticker='NO' or sticker unset (empty/undefined) → never route to Sticker tab,
          // regardless of logoType inference or getItemPackagingType fallback.
          if (normYNOps(item.sticker) !== 'YES') return false;
          if (getItemPackagingType(item, order) !== 'sticker') return false;
          return itemNeedsPrintStep(item);
        })
        .flatMap(({ item, idx }) => {
          const packagingType = getItemPackagingType(item, order);
          const productName = item.product || item.itemName;
          const pKey = (productName || '').toLowerCase();
          const eQty = emergencyQtyMap.get(pKey);
          // Kit-component items (Paste/Brush) store their PER-KIT qty in `item.qty` (~1), not
          // the true order total — must resolve the same way getEmergencyProductQtyMap's eQty
          // was computed, or a fully-emergency kit component (eQty=true total) always looks
          // "itemQty <= eQty" true against the raw per-kit qty and renders qty=1 instead of
          // the real total.
          const itemQty = effectiveItemQty(item, order, kitCfgById);

          const makeRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
            key: `${order.id}-${idx}-sticker${keySuffix}`,
            orderId: order.id,
            orderCategory: order.orderCategory || 'ORDER',
            category: itemCategoryOf(item),
            hotelLogo: order.hotelLogo || order.clientName,
            product: productName,
            qty,
            size: item.size || getDefaultSize(productName),
            status: findSR(order.id, productName, 'Sticker')?.status || 'Pending',
            sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.7),
            verified: order.stockStatus === 'Received',
            note: (order.notifications || [])[0] || '',
            stickerPrinting: 'Yes',
            packagingType,
            isUrgent: order.isUrgent || false,
            isEmergencyProduct,
            isEmergencyGated,
            logoRequired: order.logoRequired || false,
            logoUrl: order.logoUrl || '',
            // Detail fields surfaced in the queue table
            isKit: !!(item.isKit || item.kitType),
            displayUnit: item.displayUnit || kitDuNameOf(item, order) || '',
            sticker: item.sticker || '',
            stickerSize: item.stickerSize || '',
            printing: item.printing || '',
            packingMaterial: item.packingMaterial || item.packaging || '',
          });

          if (eQty !== undefined) {
            if (eQty === null || itemQty <= eQty) {
              return [makeRow(itemQty, '', true, false)];
            }
            // Partial emergency: split into emergency qty + remaining qty
            return [
              makeRow(eQty, '-emg', true, false),
              makeRow(itemQty - eQty, '-rem', false, !emergencyAllDone),
            ];
          }
          return [makeRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone)];
        });
      // Emergency products first within this order
      return items.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Box queue: items with box packaging.
    // If sticker printing is also needed (sticker=YES), the item only appears here
    // AFTER its sticker has been printed — preventing premature box-queue entry and
    // keeping it out of the sticker tab and box tab simultaneously.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    box: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // Kit items can appear in BOTH Box and Frosted tabs simultaneously:
        //   - displayUnitTab drives the KIT ASSEMBLY step (e.g. Frosted for a Ziplock kit)
        //   - packingMaterialTab drives the INDIVIDUAL PRODUCT PACKING step (e.g. Box for paper-box products)
        // When a PERSONALIZED kit item has packingMaterialTab='Box' but the display unit routes
        // to Frosted, include it here for the individual packing step — independent of the kit
        // assembly step. Restricted to personalized kits: a SEPARATE kit has no inner/outer split,
        // so it is routed SOLELY by its display unit and must never leak into a different tab.
        const needsBoxPacking = packType === 'box' ||
          (isKitItem && itemCategoryOf(item) === 'personalized'
            && item.packingMaterialTab === 'Box' && kitTabOf(item, order) !== 'Box');
        if (!needsBoxPacking) return;
        const product = item.product || item.itemName;
        // "Has print/sticker work" — drives the queue note + the no-reason exclusion below.
        const needsPrint = itemNeedsPrintStep(item);
        // "Must clear the Sticker/Print tab first" — Sticker=Yes (any item) or any print step on a
        // KIT. A standalone Printing=Yes (Sticker=No) product goes DIRECTLY to box (no print-first hold).
        const mustClearSticker = mustPrintBeforePackaging(item);
        // "Belongs in Box" — used for the no-logo exclusion check. Recognize the kit's display
        // unit by NAME too (mirrors getItemPackagingType's fallback) so kit orders route even
        // when the display unit has no packing-config tabMapping (displayUnitTab unresolved).
        const duNameLc = kitDuNameOf(item, order).toLowerCase();
        const hasExplicitBoxTab = (isKitItem && (kitTabOf(item, order) === 'Box' || duNameLc.includes('box'))) || item.packingMaterialTab === 'Box';
        // "Can bypass the sticker-first gate" — standalone items that don't need the sticker step.
        const canBypassBoxSticker = !isKitItem && hasExplicitBoxTab && !mustClearSticker;
        if (mustClearSticker && !canBypassBoxSticker && !isStickerPrinted(order.id, product, idx)) return;
        // No print step, Logo Required = No → no routing to Box tab, unless explicit Box tab.
        if (!needsPrint && !order.logoRequired && !hasExplicitBoxTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        // See sticker queue above: kit-component items store per-kit qty in item.qty (~1),
        // not the true order total — must match the basis emergencyQtyMap's eQty used.
        const itemQty = effectiveItemQty(item, order, kitCfgById);
        const boxNote = mustClearSticker
          ? 'Print approved — now in box manufacturing queue'
          : needsPrint ? 'Box manufacturing (printing at packaging stage)' : 'Box manufacturing';

        const makeBoxRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-box${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          category: itemCategoryOf(item),
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: findSR(order.id, product, 'Box', itemCategoryOf(item))?.status || 'Pending',
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.65),
          verified: false,
          note: boxNote,
          stickerPrinting: needsPrint ? 'Yes' : 'No',
          packagingType: 'box',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
          isKit: isKitItem,
          // Which SPECIFIC kit this row belongs to (Dental Kit vs Shaving Kit, say) — without
          // this, two different kits of the same category sharing this tab were indistinguishable
          // to the grouping/gkey logic below, which merged them into ONE shared "kit parent" row
          // (one shared design/print approval) instead of one each.
          kitId: item.kitId || '',
          kitName: item.kitName || item.kitType || '',
          // item.displayUnit/displayUnitType are almost never populated on the item itself (the
          // per-kit "Order Details" card writes them onto kitOrders[i], not onto the individual
          // product rows) — fall back to THIS item's own kit config via kitId before falling back
          // to the order-level singular displayUnit, so multi-kit orders don't leak one kit's
          // display unit onto another's rows.
          displayUnit: item.displayUnit || kitCfgById[String(item.kitId)]?.displayUnit || kitDuNameOf(item, order) || '',
          displayUnitType: item.displayUnitType || (isKitItem ? kitCfgById[String(item.kitId)]?.displayUnitType : '') || '',
          lamination: item.lamination || '',
          sticker: item.sticker || '',
          stickerSize: item.stickerSize || '',
          printing: item.printing || '',
          packingMaterial: item.packingMaterial || item.packaging || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeBoxRow(itemQty, '', true, false));
          } else {
            result.push(makeBoxRow(eQty, '-emg', true, false));
            result.push(makeBoxRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeBoxRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Frosted Ziplock queue: items with frosted/ziplock/pouch packaging.
    // Same sticker-first rule applies — only appears here after the sticker is printed.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    frosted: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // Kit items can appear in BOTH Box and Frosted tabs simultaneously (dual-step flow).
        // When a PERSONALIZED kit item has packingMaterialTab='Ziplock' but the display unit
        // routes to Box, include it here for the individual packing step — independent of the kit
        // assembly step. Restricted to personalized kits: a SEPARATE kit is routed SOLELY by its
        // display unit and must never leak into a different tab.
        // Non-kit items: still use the single-source-of-truth packType so sticker=YES items
        // never leak into Frosted even if their packing material string contains 'ziplock'.
        const needsFrostedPacking = packType === 'frosted' ||
          (isKitItem && itemCategoryOf(item) === 'personalized'
            && item.packingMaterialTab === 'Ziplock' && kitTabOf(item, order) !== 'Ziplock');
        if (!needsFrostedPacking) return;
        const product = item.product || item.itemName;
        // "Has print/sticker work" — drives the queue note + the no-reason exclusion below.
        const needsPrint = itemNeedsPrintStep(item);
        // "Must clear the Sticker/Print tab first" — Sticker=Yes (any item) or any print step on a
        // KIT. A standalone Printing=Yes (Sticker=No) ziplock product goes DIRECTLY here.
        const mustClearSticker = mustPrintBeforePackaging(item);
        // "Belongs in Frosted" — used for the no-logo exclusion check and active-SR gate.
        // Recognize the kit's display unit by NAME too (mirrors getItemPackagingType's fallback)
        // so kit orders route even when the display unit has no packing-config tabMapping.
        // Exclude 'butter' so a "Butter paper pouch" display unit isn't misread as ziplock.
        const duNameLc = kitDuNameOf(item, order).toLowerCase();
        const duIsZiplockName = !duNameLc.includes('butter') &&
          (duNameLc.includes('ziplock') || duNameLc.includes('frosted') || duNameLc.includes('pouch'));
        const hasExplicitZiplockTab = (isKitItem && (kitTabOf(item, order) === 'Ziplock' || duIsZiplockName)) || item.packingMaterialTab === 'Ziplock';
        // "Can bypass the sticker-first gate" — standalone items that don't need the sticker step.
        const canBypassZiplockSticker = !isKitItem && item.packingMaterialTab === 'Ziplock' && !mustClearSticker;
        // Gate on an active Sticker-type SR so that sticker items alongside frosted packaging
        // still wait in the print tab until printed (only stickerType='Sticker' to avoid
        // false matches from a Frosted Ziplock SR created within this tab).
        const sr = findSR(order.id, product, 'Sticker');
        const hasActiveSR = sr && !STICKER_MOVED_ON_STATUSES.has(sr.status);
        if (mustClearSticker && !canBypassZiplockSticker && !isStickerPrinted(order.id, product, idx)) return;
        // Active SR from the print tab blocks display even when no print step is explicitly set.
        if (!needsPrint && hasActiveSR && !hasExplicitZiplockTab && !isStickerPrinted(order.id, product, idx)) return;
        // No print step, Logo Required = No → no routing to Frosted tab, unless explicit Ziplock tab is set.
        if (!needsPrint && !order.logoRequired && !hasExplicitZiplockTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        // See sticker queue above: kit-component items store per-kit qty in item.qty (~1),
        // not the true order total — must match the basis emergencyQtyMap's eQty used.
        const itemQty = effectiveItemQty(item, order, kitCfgById);
        const frostedNote = mustClearSticker
          ? 'Print approved — now in frosted ziplock queue'
          : needsPrint ? 'Frosted ziplock (printing at packaging stage)' : 'Dispatch and received updates should be verified by operations';

        const makeFrostedRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-frosted${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          category: itemCategoryOf(item),
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: findSR(order.id, product, 'Frosted Ziplock', itemCategoryOf(item))?.status || 'Pending',
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.5),
          verified: order.stockStatus === 'Received',
          note: frostedNote,
          stickerPrinting: needsPrint ? 'Yes' : 'No',
          packagingType: 'frosted',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
          isKit: isKitItem,
          // See makeBoxRow's comment — which specific kit this row belongs to.
          kitId: item.kitId || '',
          kitName: item.kitName || item.kitType || '',
          // See makeBoxRow's comment — fall back to this item's OWN kit config (by kitId) before
          // the order-level singular displayUnit/Type.
          displayUnit: item.displayUnit || kitCfgById[String(item.kitId)]?.displayUnit || kitDuNameOf(item, order) || '',
          displayUnitType: item.displayUnitType || (isKitItem ? kitCfgById[String(item.kitId)]?.displayUnitType : '') || '',
          sticker: item.sticker || '',
          stickerSize: item.stickerSize || '',
          printing: item.printing || '',
          packingMaterial: item.packingMaterial || item.packaging || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeFrostedRow(itemQty, '', true, false));
          } else {
            result.push(makeFrostedRow(eQty, '-emg', true, false));
            result.push(makeFrostedRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeFrostedRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Butter Paper queue: items wrapped in butter paper.
    // Same sticker-first rule applies — only appears here after the sticker is printed.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    butter: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // PERSONALIZED kit items can appear in multiple packaging tabs simultaneously (dual-step
        // flow): when such a kit has packingMaterialTab='Butter Paper' but the display unit routes
        // elsewhere, include it here for the individual packing step. Restricted to personalized
        // kits: a SEPARATE kit is routed SOLELY by its display unit and must never leak into a
        // different tab.
        const needsButterPacking = packType === 'butter' ||
          (isKitItem && itemCategoryOf(item) === 'personalized'
            && item.packingMaterialTab === 'Butter Paper' && kitTabOf(item, order) !== 'Butter Paper');
        if (!needsButterPacking) return;
        const product = item.product || item.itemName;
        // "Has print/sticker work" — drives the queue note + the no-reason exclusion below.
        const needsPrint = itemNeedsPrintStep(item);
        // "Must clear the Sticker/Print tab first" — Sticker=Yes (any item) or any print step on a
        // KIT. A standalone Printing=Yes (Sticker=No) butter-paper product goes DIRECTLY here.
        const mustClearSticker = mustPrintBeforePackaging(item);
        // "Belongs in Butter Paper" — used for the no-logo exclusion check and active-SR gate.
        // Recognize the kit's display unit by NAME too (mirrors getItemPackagingType's fallback)
        // so kit orders route even when the display unit has no packing-config tabMapping.
        const duNameLc = kitDuNameOf(item, order).toLowerCase();
        const hasExplicitButterTab = (isKitItem && (kitTabOf(item, order) === 'Butter Paper' || duNameLc.includes('butter'))) || item.packingMaterialTab === 'Butter Paper';
        // "Can bypass the sticker-first gate" — standalone items that don't need the sticker step.
        const canBypassButterSticker = !isKitItem && item.packingMaterialTab === 'Butter Paper' && !mustClearSticker;
        // Gate on an active Sticker-type SR so that sticker items alongside butter packaging
        // still wait in the print tab until printed.
        const sr = findSR(order.id, product, 'Sticker');
        const hasActiveSR = sr && !STICKER_MOVED_ON_STATUSES.has(sr.status);
        if (mustClearSticker && !canBypassButterSticker && !isStickerPrinted(order.id, product, idx)) return;
        // Active SR from the print tab blocks display even when no print step is explicitly set.
        if (!needsPrint && hasActiveSR && !hasExplicitButterTab && !isStickerPrinted(order.id, product, idx)) return;
        // No print step, Logo Required = No → no routing to Butter Paper tab, unless explicit Butter Paper tab is set.
        if (!needsPrint && !order.logoRequired && !hasExplicitButterTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        // See sticker queue above: kit-component items store per-kit qty in item.qty (~1),
        // not the true order total — must match the basis emergencyQtyMap's eQty used.
        const itemQty = effectiveItemQty(item, order, kitCfgById);
        const butterNote = mustClearSticker
          ? 'Print approved — now in butter paper queue'
          : needsPrint ? 'Butter paper packing (printing at packaging stage)' : 'Butter paper packing';

        const makeButterRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-butter${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          category: itemCategoryOf(item),
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: findSR(order.id, product, 'Butter Paper', itemCategoryOf(item))?.status || 'Pending',
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.5),
          verified: order.stockStatus === 'Received',
          note: butterNote,
          stickerPrinting: needsPrint ? 'Yes' : 'No',
          packagingType: 'butter',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
          isKit: isKitItem,
          // See makeBoxRow's comment — which specific kit this row belongs to.
          kitId: item.kitId || '',
          kitName: item.kitName || item.kitType || '',
          // See makeBoxRow's comment — fall back to this item's OWN kit config (by kitId) before
          // the order-level singular displayUnit/Type.
          displayUnit: item.displayUnit || kitCfgById[String(item.kitId)]?.displayUnit || kitDuNameOf(item, order) || '',
          displayUnitType: item.displayUnitType || (isKitItem ? kitCfgById[String(item.kitId)]?.displayUnitType : '') || '',
          sticker: item.sticker || '',
          stickerSize: item.stickerSize || '',
          printing: item.printing || '',
          packingMaterial: item.packingMaterial || item.packaging || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeButterRow(itemQty, '', true, false));
          } else {
            result.push(makeButterRow(eQty, '-emg', true, false));
            result.push(makeButterRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeButterRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Wooden Brush queue: items with wooden brush packaging.
    // If sticker printing is also needed (sticker=YES), the item only appears here
    // AFTER its sticker has been printed — preventing premature queue entry and
    // keeping it out of the sticker tab and this tab simultaneously.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    wooden_brush: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // Kit items can appear in BOTH this tab and another packaging tab simultaneously:
        //   - displayUnitTab drives the KIT ASSEMBLY step
        //   - packingMaterialTab drives the INDIVIDUAL PRODUCT PACKING step
        // When a PERSONALIZED kit item has packingMaterialTab='Wooden Brush' but the display unit
        // routes elsewhere, include it here for the individual packing step — independent of the
        // kit assembly step. Restricted to personalized kits: a SEPARATE kit has no inner/outer
        // split, so it is routed SOLELY by its display unit and must never leak into a different tab.
        const needsWoodenBrushPacking = packType === 'wooden_brush' ||
          (isKitItem && itemCategoryOf(item) === 'personalized'
            && item.packingMaterialTab === 'Wooden Brush' && kitTabOf(item, order) !== 'Wooden Brush');
        if (!needsWoodenBrushPacking) return;
        const product = item.product || item.itemName;
        // "Has print/sticker work" — drives the queue note + the no-reason exclusion below.
        const needsPrint = itemNeedsPrintStep(item);
        // "Must clear the Sticker/Print tab first" — Sticker=Yes (any item) or any print step on a
        // KIT. A standalone Printing=Yes (Sticker=No) product goes DIRECTLY here (no print-first hold).
        const mustClearSticker = mustPrintBeforePackaging(item);
        // "Belongs in Wooden Brush" — used for the no-logo exclusion check. Recognize the kit's
        // display unit by NAME too (mirrors getItemPackagingType's fallback) so kit orders route
        // even when the display unit has no packing-config tabMapping (displayUnitTab unresolved).
        const duNameLc = kitDuNameOf(item, order).toLowerCase();
        const hasExplicitWoodenBrushTab = (isKitItem && (kitTabOf(item, order) === 'Wooden Brush' || duNameLc.includes('wooden') || duNameLc.includes('brush'))) || item.packingMaterialTab === 'Wooden Brush';
        // "Can bypass the sticker-first gate" — standalone items that don't need the sticker step.
        const canBypassWoodenBrushSticker = !isKitItem && hasExplicitWoodenBrushTab && !mustClearSticker;
        if (mustClearSticker && !canBypassWoodenBrushSticker && !isStickerPrinted(order.id, product, idx)) return;
        // No print step, Logo Required = No → no routing to this tab, unless explicit tab.
        if (!needsPrint && !order.logoRequired && !hasExplicitWoodenBrushTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        // See sticker queue above: kit-component items store per-kit qty in item.qty (~1),
        // not the true order total — must match the basis emergencyQtyMap's eQty used.
        const itemQty = effectiveItemQty(item, order, kitCfgById);
        const woodenBrushNote = mustClearSticker
          ? 'Print approved — now in wooden brush manufacturing queue'
          : needsPrint ? 'Wooden brush manufacturing (printing at packaging stage)' : 'Wooden brush manufacturing';

        const makeWoodenBrushRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-wooden_brush${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          category: itemCategoryOf(item),
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: findSR(order.id, product, 'Wooden Brush', itemCategoryOf(item))?.status || 'Pending',
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.65),
          verified: false,
          note: woodenBrushNote,
          stickerPrinting: needsPrint ? 'Yes' : 'No',
          packagingType: 'wooden_brush',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
          isKit: isKitItem,
          kitId: item.kitId || '',
          kitName: item.kitName || item.kitType || '',
          displayUnit: item.displayUnit || kitCfgById[String(item.kitId)]?.displayUnit || kitDuNameOf(item, order) || '',
          displayUnitType: item.displayUnitType || (isKitItem ? kitCfgById[String(item.kitId)]?.displayUnitType : '') || '',
          lamination: item.lamination || '',
          sticker: item.sticker || '',
          stickerSize: item.stickerSize || '',
          printing: item.printing || '',
          packingMaterial: item.packingMaterial || item.packaging || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeWoodenBrushRow(itemQty, '', true, false));
          } else {
            result.push(makeWoodenBrushRow(eQty, '-emg', true, false));
            result.push(makeWoodenBrushRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeWoodenBrushRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Other queue: items with an explicitly-selected "Other" packing material/display unit.
    // Deliberately NO keyword/string-match fallback here (see hasOtherPackaging/packTabFromString
    // comments above) — an item only lands here via an explicit packingMaterialTab/displayUnitTab
    // = 'Other' selection, never guessed from free text, so unrelated legacy orders can't misroute.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    other: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const kitCfgById = Object.fromEntries(
        (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
      );
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        const needsOtherPacking = packType === 'other' ||
          (isKitItem && itemCategoryOf(item) === 'personalized'
            && item.packingMaterialTab === 'Other' && kitTabOf(item, order) !== 'Other');
        if (!needsOtherPacking) return;
        const product = item.product || item.itemName;
        const needsPrint = itemNeedsPrintStep(item);
        const mustClearSticker = mustPrintBeforePackaging(item);
        const hasExplicitOtherTab = (isKitItem && kitTabOf(item, order) === 'Other') || item.packingMaterialTab === 'Other';
        const canBypassOtherSticker = !isKitItem && hasExplicitOtherTab && !mustClearSticker;
        if (mustClearSticker && !canBypassOtherSticker && !isStickerPrinted(order.id, product, idx)) return;
        if (!needsPrint && !order.logoRequired && !hasExplicitOtherTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        const itemQty = effectiveItemQty(item, order, kitCfgById);
        const otherNote = mustClearSticker
          ? 'Print approved — now in packing queue'
          : needsPrint ? 'Packing (printing at packaging stage)' : 'Packing';

        const makeOtherRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-other${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          category: itemCategoryOf(item),
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: findSR(order.id, product, 'Other', itemCategoryOf(item))?.status || 'Pending',
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.65),
          verified: false,
          note: otherNote,
          stickerPrinting: needsPrint ? 'Yes' : 'No',
          packagingType: 'other',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
          isKit: isKitItem,
          kitId: item.kitId || '',
          kitName: item.kitName || item.kitType || '',
          displayUnit: item.displayUnit || kitCfgById[String(item.kitId)]?.displayUnit || kitDuNameOf(item, order) || '',
          displayUnitType: item.displayUnitType || (isKitItem ? kitCfgById[String(item.kitId)]?.displayUnitType : '') || '',
          lamination: item.lamination || '',
          sticker: item.sticker || '',
          stickerSize: item.stickerSize || '',
          printing: item.printing || '',
          packingMaterial: item.packingMaterial || item.packaging || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeOtherRow(itemQty, '', true, false));
          } else {
            result.push(makeOtherRow(eQty, '-emg', true, false));
            result.push(makeOtherRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeOtherRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),
  };
};

export const getCheckStateMap = (orders = []) =>
  Object.fromEntries(orders.map((order) => [order.id || order._id, { ...(order.readiness || {}) }]));
