// Canonical product-type classification + size-field unit, shared across Inventory, Sales and
// Operations so all three read the exact same mapping instead of each guessing independently.
//
// Background: Inventory's "Sizes (…)" spec dropdown (see PRODUCT_FIELD_DEFS in
// Frontend/src/pages/Inventory/index.jsx) stores only the bare number a user picks (e.g. "15")
// — the unit shown alongside it ("15g", "15ml") lives purely in that field's static option
// label, keyed off the product's type. It is never persisted on the item/order record itself
// (InventoryItem.unit is the stock-COUNTING unit — Pcs/Box/Pack — not the size's unit). Sales'
// PRODUCT_FIELD_DEFS_LEAD mirrors this exact same per-type labeling. This module is that
// definition, extracted once, so Operations (which has no dropdown of its own to read a label
// off of) can resolve the same unit for a plain stored number instead of showing it bare.
export const getProductTypeKey = (name) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('soap')) return 'soap';
  if (n.includes('shampoo')) return 'shampoo';
  if (n.includes('moisturizer') || n.includes('moisturiser')) return 'moisturizer';
  if (n.includes('shower gel') || n.includes('showergel') || n.includes('shower_gel')) return 'shower_gel';
  if (n.includes('razor')) return 'razor';
  if (n.includes('shower') && n.includes('gel')) return 'shower_gel';
  if (n.includes('gel')) return 'gel';
  if (n.includes('brush')) return 'brush';
  if (n.includes('paste')) return 'paste';
  if (n.includes('medkit') || n.includes('med kit')) return 'med_kit';
  if (n.includes('sweing') || n.includes('sewing')) return 'sewing';
  if (n.includes('vanitykit') || n.includes('vanity kit') || n.includes('vanity')) return 'vanity_item';
  return null;
};

// Mirrors the "Sizes (gram)" / "Sizes (ml)" field labels in Inventory's PRODUCT_FIELD_DEFS —
// only product types that actually have a Sizes spec field carry an entry here.
export const SIZE_UNIT_BY_PRODUCT_TYPE = {
  soap: 'g',
  paste: 'g',
  shampoo: 'ml',
  moisturizer: 'ml',
  shower_gel: 'ml',
};

export const getProductSizeUnit = (name) => SIZE_UNIT_BY_PRODUCT_TYPE[getProductTypeKey(name)] || '';
