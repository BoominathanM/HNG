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

// Finds the MaterialStock row (if any) this item's packaging resolves to. Returns null
// when the item carries no packing-material attribute at all, when it's Ziplock (never
// tracked via Material Stock, unchanged historical deduction behavior), or when nothing
// in stock matches by name+size (nor the Box/Butter Paper category fallback) — callers
// treat null as "not tracked here", not as "zero in stock".
function resolveMaterialStock(it, stocks) {
  const nameCandidates = nameCandidatesOf(it);
  if (!nameCandidates.length) return null;
  const category = materialStockCategoryOf(nameCandidates.join(' '));
  if (KEYWORD_CATEGORY_EXCLUDED.has(category)) return null;

  const itemSize = normalizeSize(it.size);
  for (const name of nameCandidates) {
    const match = stocks.find((s) => String(s.packingMaterial || '').trim().toLowerCase() === name
      && normalizeSize(s.size) === itemSize);
    if (match) return match;
  }

  if (KEYWORD_CATEGORY_FALLBACK.has(category)) {
    const matches = stocks.filter((s) => materialStockCategoryOf(s.packingMaterial) === category);
    if (matches.length) return (itemSize && matches.find((s) => normalizeSize(s.size) === itemSize)) || matches[0];
  }
  return null;
}

module.exports = { materialStockCategoryOf, normalizeSize, nameCandidatesOf, resolveMaterialStock };
