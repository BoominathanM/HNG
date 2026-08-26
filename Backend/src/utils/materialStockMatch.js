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

// MaterialStock.size is free text (e.g. "15ml") while an item's size may just be the raw
// number (e.g. "15") — compare on the leading numeric value so unit-suffix differences
// don't block an otherwise-correct match.
function normalizeSize(v) {
  const s = String(v || '').trim().toLowerCase();
  const m = s.match(/^[\d.]+/);
  return m ? m[0] : s;
}

// Whichever field the chosen packing material/attribute actually lives in for this
// product type (Box/Butter Paper use packingMaterial; bottles use bottleType; other
// product types may use material/displayUnit) — try them all, no hardcoded material list.
function nameCandidatesOf(it) {
  return [it.packingMaterial, it.bottleType, it.material, it.displayUnit]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());
}

const KEYWORD_CATEGORY_EXCLUDED = new Set(['ziplock']);
const KEYWORD_CATEGORY_FALLBACK = new Set(['box', 'butterPaper']);

// Core name+size (with Box/Butter Paper category fallback) matching, run against whatever
// pool of stock rows is handed in — factored out so resolveMaterialStock can try a
// hotel-scoped pool first before falling back to the full one (see below).
function matchInPool(it, pool) {
  const nameCandidates = nameCandidatesOf(it);
  if (!nameCandidates.length) return null;
  const category = materialStockCategoryOf(nameCandidates.join(' '));
  if (KEYWORD_CATEGORY_EXCLUDED.has(category)) return null;

  const itemSize = normalizeSize(it.size);
  for (const name of nameCandidates) {
    const match = pool.find((s) => String(s.packingMaterial || '').trim().toLowerCase() === name
      && normalizeSize(s.size) === itemSize);
    if (match) return match;
  }

  if (KEYWORD_CATEGORY_FALLBACK.has(category)) {
    const matches = pool.filter((s) => materialStockCategoryOf(s.packingMaterial) === category);
    if (matches.length) return (itemSize && matches.find((s) => normalizeSize(s.size) === itemSize)) || matches[0];
  }
  return null;
}

// Finds the MaterialStock row (if any) this item's packaging resolves to. Returns null
// when the item carries no packing-material attribute at all, when it's Ziplock (never
// tracked via Material Stock, unchanged historical deduction behavior), or when nothing
// in stock matches by name+size (nor the Box/Butter Paper category fallback) — callers
// treat null as "not tracked here", not as "zero in stock".
//
// `hotelName`, when given, makes this a soft preference, not a hard restriction: a
// same-hotel match is preferred over one from a different hotel (or the hotel-agnostic
// pool), but if no hotel-scoped match exists this still falls back to matching across
// every row exactly like before — so hotels/materials that never got hotel-tagged keep
// working unchanged. Omitting hotelName reproduces the old (fully hotel-agnostic) behavior.
function resolveMaterialStock(it, stocks, hotelName = '') {
  const hotel = String(hotelName || '').trim().toLowerCase();
  if (hotel) {
    const hotelPool = stocks.filter((s) => String(s.hotelName || '').trim().toLowerCase() === hotel);
    const hotelMatch = matchInPool(it, hotelPool);
    if (hotelMatch) return hotelMatch;
  }
  return matchInPool(it, stocks);
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

module.exports = {
  materialStockCategoryOf, normalizeSize, nameCandidatesOf, resolveMaterialStock, findHotelMaterialStock,
};
