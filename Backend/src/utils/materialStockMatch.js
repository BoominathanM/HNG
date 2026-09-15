// Resolve which Inventory > Material Stock entry (if any) backs a given order item's
// packing material. Shared by sales.controller.js's post-order-creation deduction and
// tasks.controller.js's Today's Checklist readiness check, so both always agree on
// which MaterialStock row a product's packaging maps to — if they used separate copies
// of this matching logic, a small drift between them would make a product look
// packable on the checklist while deduction silently found a different (or no) row.

// Keyword categories, used only for the legacy Box/Butter Paper fallback-by-category
// and the Ziplock exclusion — every other match is by exact name+size (see below).
function materialStockCategoryOf(pmRaw) {
  const p = (pmRaw || '').toLowerCase();
  if (p.includes('butter') || p.includes('paper')) return 'butterPaper';
  if (p.includes('ziplock') || p.includes('frosted') || p.includes('pouch')) return 'ziplock';
  if (p.includes('box')) return 'box';
  if (p.includes('wooden') || p.includes('wood')) return 'woodenBrush';
  return '';
}

// MaterialStock.size is free text (e.g. "15ml", "2.3 cm x 2.6cm") while an item's size may be
// the raw number ("15") or a partly-formatted dimension ("2.3x2.6"). Normalize so unit text
// and spacing — even a unit BETWEEN the two dimensions — don't block an otherwise-correct
// match, while keeping genuinely different dimensions apart:
//   "15ml" / "15 ml" / "15"                         -> "15"
//   "2.3 cm x 2.6cm" / "2.3x2.6" / "2.3 X 2.6 CM" / "2.3*2.6"  -> "2.3x2.6"
//   "30x25"                                         -> "30x25"   (≠ "30x20")
//   "30x20x10"                                      -> "30x20x10"
//   "Large" / "A4"                                  -> "large" / "a4"  (label, matched whole)
function normalizeSize(v) {
  const compact = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  // Dimensional: 2+ numbers joined by x / * / × — drop any unit text between/after them.
  if (/^[\d.]/.test(compact) && /[x*×]/.test(compact)) {
    const nums = compact.match(/[\d.]+/g);
    if (nums && nums.length >= 2) return nums.join('x');
  }
  // Plain leading number (+ optional unit): "15ml" -> "15".
  if (/^[\d.]/.test(compact)) {
    const m = compact.match(/^[\d.]+/);
    if (m) return m[0];
  }
  // Non-numeric label — compare the whole thing, punctuation-insensitive.
  return compact.replace(/[^a-z0-9.]/g, '');
}

// Normalize a packing-material name for comparison: lower-case, and treat _ / - / runs of
// whitespace as a single space, so a dropdown value like "white_box" matches free-text
// "White box".
function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/[_\-\s]+/g, ' ');
}

// Whichever field the chosen packing material/attribute actually lives in for this
// product type (Box/Butter Paper use packingMaterial/packaging; bottles use bottleType;
// other product types may use material/displayUnit) — try them all, no hardcoded list.
function nameCandidatesOf(it) {
  return [it.packingMaterial, it.packaging, it.bottleType, it.material, it.displayUnit]
    .filter(Boolean)
    .map(normName);
}

const KEYWORD_CATEGORY_EXCLUDED = new Set(['ziplock']);
const KEYWORD_CATEGORY_FALLBACK = new Set(['box', 'butterPaper']);

// The size a line's packing material is matched against a MaterialStock row's size — the
// PACKING size (the box/pouch/sheet's own physical dimensions), NOT the product's fill size
// (`it.size`, e.g. "30" grams). Sticker / sticker size are stored on the line for the design
// & print flow but are NOT used for Material Stock matching.
// Resolution per line:  packingSize  |  kit config size  |  order kitSize.
// Empty string when the line has no packing size — the matcher then only lines up with
// blank-size stock rows, i.e. "not tracked here" (never a wrong-size deduction).
function effectivePackingSize(it, order) {
  const i = it || {};
  const ord = order || {};
  const kitOrders = Array.isArray(ord.kitOrders) ? ord.kitOrders : [];
  const isKit = !!(i.isKit || i.kitType || i.kitId);
  const kc = (isKit
    && (kitOrders.find((k) => k && k.kitId && String(k.kitId) === String(i.kitId))
        || (kitOrders.length === 1 ? kitOrders[0] : null))) || {};

  const packingSize = i.packingSize || (isKit ? (kc.size || ord.kitSize) : '') || '';
  return String(packingSize);
}

// Core name+size (with a Box/Butter Paper category fallback) matching, run against whatever
// pool of stock rows is handed in.
//
// SIZE IS ALWAYS ENFORCED. The primary match needs exact packing-material name AND an
// equal normalized size. The Box/Butter Paper category fallback (for items whose generic
// "Box" name never equals a free-text stock name like "Kraft Box 3-ply") still requires
// an equal normalized size — it just relaxes the exact-name requirement to same-category.
// If nothing matches by size, this returns null (item treated as "not tracked here", the
// same posture deductMaterialStockForOrder already takes) rather than draining an
// arbitrary wrong-size row.
function matchNamesSizeInPool(names, sizeStr, pool) {
  const nameCandidates = [...new Set((names || []).filter(Boolean).map(normName))];
  if (!nameCandidates.length) return null;
  const category = materialStockCategoryOf(nameCandidates.join(' '));
  if (KEYWORD_CATEGORY_EXCLUDED.has(category)) return null;

  const itemSize = normalizeSize(sizeStr);
  for (const name of nameCandidates) {
    const match = (pool || []).find((s) => normName(s.packingMaterial) === name
      && normalizeSize(s.size) === itemSize);
    if (match) return match;
  }
  if (KEYWORD_CATEGORY_FALLBACK.has(category)) {
    // Same category AND same size — never "first row of this category regardless of size".
    return (pool || []).find((s) => materialStockCategoryOf(s.packingMaterial) === category
      && normalizeSize(s.size) === itemSize) || null;
  }
  return null;
}

// Raw-item convenience — resolves name candidates from the item's fields and size from
// `effSize` (falls back to the item's raw size for legacy callers that pass none).
function matchInPool(it, pool, effSize) {
  return matchNamesSizeInPool(nameCandidatesOf(it), effSize !== undefined ? effSize : it.size, pool);
}

// Finds the generic-pool MaterialStock row (if any) this item's packaging resolves to for
// the AUTOMATIC order-creation / qty-raise deduction. Returns null when the item carries no
// packing-material attribute, when it's Ziplock (never tracked via Material Stock), or when
// nothing matches by name+size.
//
// HARD RESERVE: rows carrying a hotelName are a hotel's own reserved / pre-printed stock and
// are NEVER touched by this automatic deduction — not even for that same hotel's order. They
// are only ever drawn down by the explicit "Use Existing" action in Operations > Order
// Management (see buildHotelStockGroups + operations.controller.useExistingMaterialStock).
function resolveMaterialStock(it, stocks, effSize) {
  const genericPool = (stocks || []).filter((s) => !String(s.hotelName || '').trim());
  return matchInPool(it, genericPool, effSize);
}

// View-based generic match — `view` from packagingViewOfItem (kit-aware name candidates + the
// packing size). Only the non-hotelName pool.
function resolveGenericStockForView(view, stocks) {
  const genericPool = (stocks || []).filter((s) => !String(s.hotelName || '').trim());
  return matchNamesSizeInPool(view && view.names, view && view.size, genericPool);
}

// The hotel-reserved MaterialStock rows for `order`'s hotel that match this packing view by
// name + packing size. Used by deductMaterialStockQty to SKIP the generic-pool deduction for
// a line (a reserved row exists → leave it for Operations "Use Existing"). Same name/category
// rule as matchHotelStockRows.
function findReservedRowsForView(view, order, stocks) {
  const hotel = String((order && (order.hotelName || order.clientName)) || '').trim().toLowerCase();
  if (!hotel || !Array.isArray(stocks)) return [];
  const names = [...new Set(((view && view.names) || []).filter(Boolean).map(normName))];
  if (!names.length) return [];
  const size = normalizeSize(view && view.size);
  const category = materialStockCategoryOf(names[0]);
  return stocks.filter((s) => {
    if (String(s.hotelName || '').trim().toLowerCase() !== hotel) return false;
    if (normalizeSize(s.size) !== size) return false;
    if (names.includes(normName(s.packingMaterial))) return true;
    return KEYWORD_CATEGORY_FALLBACK.has(category)
      && materialStockCategoryOf(s.packingMaterial) === category;
  });
}

// Raw-item convenience (kit-aware via packagingViewOfItem).
function findReservedRowsForLine(it, order, stocks) {
  return findReservedRowsForView(packagingViewOfItem(it, order), order, stocks);
}

// The rows the GENERIC Material Stock deduction processes for an order:
//   • one row per non-kit packing line   → qty = its consumed qty
//   • one row per KIT (by kitId)          → qty = the kit count (the outer box is ONE per
//                                            kit, never one per component)
// Each row carries the kit-aware packing `view` (name candidates + packing size) and points
// at a real order item for bookkeeping writes (a kit's row points at its first component).
// Lines with no packing name or no packing size are dropped ("not tracked here").
function buildPackingRows(order, items, resolveConsumedQty) {
  const ord = order || {};
  const kitOrders = Array.isArray(ord.kitOrders) ? ord.kitOrders : [];
  const rows = [];
  const kitSeen = new Set();
  (items || []).forEach((it, idx) => {
    const isKit = !!(it.isKit || it.kitType || it.kitId);
    const view = packagingViewOfItem(it, order);
    if (!view.names.length || !String(view.size || '').trim()) return;
    if (isKit) {
      const kid = String(it.kitId || '');
      if (kitSeen.has(kid)) return;
      kitSeen.add(kid);
      const kc = kitOrders.find((k) => k && k.kitId && String(k.kitId) === kid)
        || (kitOrders.length === 1 ? kitOrders[0] : null) || {};
      const kitCount = Number(kc.overallQty) || Number(ord.kitOverallQty) || 0;
      if (kitCount <= 0) return;
      rows.push({ item: it, idx, qty: kitCount, view, isKit: true, kitId: kid });
    } else {
      const qty = Math.max(0, Number(resolveConsumedQty ? resolveConsumedQty(it) : it.qty) || 0);
      if (qty <= 0) return;
      rows.push({ item: it, idx, qty, view, isKit: false });
    }
  });
  return rows;
}

// Which packaging-design stickerType (Operations > Box/Ziplock/Butter Paper/Wooden
// Brush/Other) each Material Stock "category" corresponds to. 'Other' has no keyword
// of its own — it's whatever doesn't fall into a named category (mirrors how the
// Operations "Other" packaging tab is explicit-only, never a keyword fallback).
const STICKER_TYPE_TO_CATEGORY = {
  Box: 'box',
  'Frosted Ziplock': 'ziplock',
  'Butter Paper': 'butterPaper',
  'Wooden Brush': 'woodenBrush',
  Other: 'other',
};

// A hotel commonly has its own pre-printed/pre-designed packing material sitting in
// Material Stock (scoped by hotelName) from an earlier order. When a NEW design/print
// request comes in for that same hotel + packing material, this surfaces any such
// existing stock so the design team can reuse it instead of starting a fresh print run.
// Independent of resolveMaterialStock() above (which is hotel-agnostic, used for the
// generic sticker-material deduction/readiness flows) — this one is hotel-scoped and
// includes Ziplock, since a hotel's own stocked ziplocks are exactly what this check
// is meant to catch.
function findHotelMaterialStock(hotelName, stickerType, stocks) {
  const category = STICKER_TYPE_TO_CATEGORY[stickerType];
  const hotel = String(hotelName || '').trim().toLowerCase();
  if (!hotel || !category || !Array.isArray(stocks)) return [];

  const hotelStocks = stocks.filter((s) => String(s.hotelName || '').trim().toLowerCase() === hotel
    && Number(s.stockCount || 0) > 0);

  if (category === 'other') return hotelStocks.filter((s) => !materialStockCategoryOf(s.packingMaterial));
  return hotelStocks.filter((s) => materialStockCategoryOf(s.packingMaterial) === category);
}

// ─── Hotel reserved-stock matching for Operations > Order Management ──────────────────

// A raw order item's own packingMaterial/size are frequently BLANK for kit / personalized
// lines — the real values live on the per-kit config (order.kitOrders[].displayUnit /
// .displayUnitType / .size) or the order-level kit fields (kitDisplayUnit / kitSize), the
// same way the Operations queue UI reconstructs them. This resolves the effective packing
// name candidates + size for hotel-stock matching from all of those.
function packagingViewOfItem(item, order) {
  const it = item || {};
  const ord = order || {};
  const kitOrders = Array.isArray(ord.kitOrders) ? ord.kitOrders : [];
  const isKit = !!(it.isKit || it.kitType || it.kitId);
  const kitCfg = isKit
    ? (kitOrders.find((k) => k && k.kitId && String(k.kitId) === String(it.kitId))
       || (kitOrders.length === 1 ? kitOrders[0] : null))
    : null;
  const kc = kitCfg || {};

  const nameParts = [
    it.packingMaterial, it.packaging, it.bottleType, it.material,
    it.displayUnit, it.displayUnitType,
    isKit ? kc.displayUnit : null, isKit ? kc.displayUnitType : null, isKit ? kc.packingMaterial : null,
    isKit ? (ord.kitDisplayUnit || ord.displayUnit) : null,
  ].filter(Boolean).map(normName);
  const names = [...new Set(nameParts)];

  // Packing size — the box/pouch dimensions (sticker size when Sticker=YES), NOT the
  // product fill size. See effectivePackingSize.
  const size = effectivePackingSize(it, order);
  // For a KIT, the outer packing unit (box/ziplock/…) is ONE per kit, so the packing qty is
  // the kit count — NOT the per-component qty × kit count that resolveItemConsumedQty gives
  // (that formula is for the components' own inventory, e.g. combs/pastes).
  const kitCount = isKit ? (Number(kc.overallQty) || Number(ord.kitOverallQty) || 0) : 0;
  return { names, size, label: nameParts[0] || '', isKit, kitId: isKit ? String(it.kitId || '') : '', kitCount };
}

// The hotel-reserved MaterialStock rows (hotelName == this order's hotel) whose size matches
// the line and whose name matches EXACTLY (underscore/space-insensitive), or — only for the
// Box / Butter Paper categories, the same posture the generic matchInPool takes — whose
// keyword-category matches. Exact-name still covers a hotel's own pre-printed ziplocks /
// wooden brushes; the loose category branch is NOT extended to them. Rows at 0 are kept so a
// fully-drawn group still shows its "used N".
function matchHotelStockRows(view, hotelPool) {
  const names = view.names || [];
  if (!names.length) return [];
  const size = normalizeSize(view.size);
  const category = materialStockCategoryOf(names[0]);
  return hotelPool.filter((s) => {
    if (normalizeSize(s.size) !== size) return false;
    if (names.includes(normName(s.packingMaterial))) return true;
    return KEYWORD_CATEGORY_FALLBACK.has(category)
      && materialStockCategoryOf(s.packingMaterial) === category;
  });
}

// Groups an order's packing lines by (packing material category|size) and, for each group,
// the hotel-reserved MaterialStock rows that back it (oldest purchaseDate first, across
// every design vendor), the qty the order still needs from reserved stock, and how much has
// already been drawn. `resolveConsumedQty(it)` is passed in (sales.controller's
// resolveItemConsumedQty) so the required qty here is exactly what deduction would use.
// Each reserved row is CLAIMED by the first group that matches it, so a row whose stock the
// fuzzy name/category match pulls toward two different keys is only ever counted once.
// `order` should carry hotelName/clientName + the kit context (kitOrders, kitOverallQty,
// kitDisplayUnit, displayUnit, kitSize). Consumed by operations.controller: getOrders (the
// "Hotel Stock" column) and useExistingMaterialStock (the actual draw-down).
function buildHotelStockGroups(order, items, stocks, resolveConsumedQty) {
  const hotel = String((order && (order.hotelName || order.clientName)) || '').trim().toLowerCase();
  if (!hotel || !Array.isArray(items) || !Array.isArray(stocks)) return [];
  const hotelPool = stocks
    .filter((s) => String(s.hotelName || '').trim().toLowerCase() === hotel)
    .slice()
    .sort((a, b) => new Date(a.purchaseDate || 0) - new Date(b.purchaseDate || 0));
  if (!hotelPool.length) return [];

  const rowSnap = (r) => ({
    _id: String(r._id), vendor: r.vendor || '', packingMaterial: r.packingMaterial || '',
    size: r.size || '', stockCount: Number(r.stockCount || 0),
  });
  const groups = new Map();
  const claimed = new Set();
  const kitCounted = new Set(); // `${groupKey}::${kitId}` — a kit's outer unit is counted once per group

  items.forEach((it, idx) => {
    const view = packagingViewOfItem(it, order);
    const matched = matchHotelStockRows(view, hotelPool);
    const usedForLine = Math.max(0, Number(it.packingExistingStockQty) || 0);
    if (!matched.length && usedForLine <= 0) return;

    const category = materialStockCategoryOf(view.names[0]);
    const key = `${category || view.names[0] || ''}|${normalizeSize(view.size)}`;
    if (!groups.has(key)) {
      // Prefer the human name the buyer actually typed on the matched stock row.
      const label = (matched[0] && matched[0].packingMaterial)
        || it.packingMaterial || it.packaging
        || (view.label ? view.label.replace(/\b\w/g, (c) => c.toUpperCase()) : '')
        || category || 'Packing';
      groups.set(key, {
        key,
        // Keyword category ('box' | 'butterPaper' | 'ziplock' | 'woodenBrush' | '') so the
        // design-team queues can gate ONLY the matching tab (a reserved White box disables
        // the Box row, not the Sticker / Ziplock / Butter Paper rows for the same kit).
        category: category || '',
        label: String(label).trim(),
        size: String(view.size || (matched[0] && matched[0].size) || '').trim(),
        rowIds: [], rows: [], requiredQty: 0, usedQty: 0, outstandingQty: 0, itemIndexes: [], lineNeeds: [],
      });
    }
    const g = groups.get(key);

    // How many packing units this line needs. A kit's outer unit = one per kit (kitCount),
    // charged to the FIRST of that kit's lines in this group; its other component lines add 0.
    let need;
    if (view.isKit) {
      const kk = `${key}::${view.kitId}`;
      need = kitCounted.has(kk) ? 0 : Math.max(0, view.kitCount);
      kitCounted.add(kk);
    } else {
      need = Math.max(0, Number(resolveConsumedQty ? resolveConsumedQty(it) : it.qty) || 0);
    }

    g.requiredQty += need;
    g.usedQty += usedForLine;
    // Per-line outstanding, summed — so one line being over-covered (e.g. after a Billing
    // qty reduction) can't mask another line in the same group that still needs stock.
    g.outstandingQty += Math.max(0, need - usedForLine);
    g.itemIndexes.push(idx);
    g.lineNeeds.push({ idx, need });
    for (const r of matched) {
      const id = String(r._id);
      if (claimed.has(id) || g.rowIds.includes(id)) continue;
      claimed.add(id);
      g.rowIds.push(id);
      g.rows.push(rowSnap(r));
    }
  });

  return [...groups.values()].map((g) => {
    const availableQty = g.rows.reduce((s, r) => s + r.stockCount, 0);
    return {
      ...g,
      availableQty,
      // No resolvable required qty for any line in this group (e.g. an unpriced kit) but the
      // hotel DOES stock this material — surface it as info only: shown in the column, no
      // "Use Existing" button (nothing to size a draw against), doesn't block the "used" badge.
      infoOnly: g.outstandingQty === 0 && g.usedQty === 0,
      fulfilled: g.usedQty > 0 && g.outstandingQty === 0,
      sufficient: availableQty >= g.outstandingQty,
    };
  });
}

module.exports = {
  materialStockCategoryOf, normalizeSize, nameCandidatesOf, resolveMaterialStock, findHotelMaterialStock,
  matchHotelStockRows, buildHotelStockGroups, packagingViewOfItem, normName,
  effectivePackingSize, findReservedRowsForLine,
  matchNamesSizeInPool, resolveGenericStockForView, findReservedRowsForView, buildPackingRows,
};
