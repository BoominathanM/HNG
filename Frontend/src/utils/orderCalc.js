// Shared order-calculation helpers used by Sales, Billing, and OperationDetail.
// Single source of truth for all kit-aware grand-total computation.

export const ORDER_CATEGORIES = {
  PERSONALIZED: 'personalized',
  SEPARATE_KIT: 'separate_kit',
  SEPARATE_PRODUCT: 'separate_product',
};

// Round money to 2 decimals — strips floating-point noise without collapsing genuine decimals.
export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function calcTotal(products = []) {
  return products.filter(Boolean).reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0), 0);
}

export function calcGstAmount(products = []) {
  return products.filter(Boolean).reduce((s, p) =>
    s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
}

// Resolve a product row's order-composition category, inferring for legacy rows
// that predate the `category` field.
export function rowCategory(p, kitOrders = []) {
  if (!p) return ORDER_CATEGORIES.SEPARATE_PRODUCT;
  if (p.category) return p.category;
  if (p.isKit || p.kitType) {
    const ko = (kitOrders || []).find(o => o && o.kitId && o.kitId === p.kitId);
    if (ko?.category) return ko.category;
    return ORDER_CATEGORIES.SEPARATE_KIT;
  }
  return ORDER_CATEGORIES.SEPARATE_PRODUCT;
}

export const koCategory = (ko) => (ko && ko.category) || ORDER_CATEGORIES.SEPARATE_KIT;

// GST-inclusive value of one kit: kitPrice × overallQty, falling back to component rows.
// Separate Kit (category B) always counts BOTH the kit's own price AND its included products'
// price (kitPrice + rows sum) — neither is skipped. Personalized (A) keeps the original
// behavior: trust a stored kitPrice, falling back to rows sum only when it's empty.
export function kitOrderValue(ko, kitRows = []) {
  const price = Number(ko?.kitPrice) || 0;
  const qty = Number(ko?.overallQty) || 0;
  const rows = kitRows.filter(p => p && p.kitId === ko?.kitId);
  const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
  const rowsSum = r2(sub + gst);
  if (koCategory(ko) === ORDER_CATEGORIES.SEPARATE_KIT) {
    return r2((price + rowsSum) * (qty || 1));
  }
  if (price > 0) return r2(price * (qty || 1));
  return r2(rowsSum * (qty || 1));
}

// GST-inclusive subtotal of a set of (non-kit) product rows.
export function sumProductRows(rows = []) {
  const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
  return r2(sub + gst);
}

// Single source of truth for category buckets.
// Returns { personalized (A), separateKit (B), separateProduct (C), fwd, grand }.
export function computeRecordBuckets(rec = {}) {
  const prods = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  const cat = (p) => rowCategory(p, kitOrders);

  const kitRows = prods.filter(p => p.isKit || p.kitType);
  const persProdRows = prods.filter(p => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.PERSONALIZED);
  const sepProdRows = prods.filter(p => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.SEPARATE_PRODUCT);

  let personalizedKit = 0;
  let separateKit = 0;
  if (kitOrders.length) {
    kitOrders.forEach(ko => {
      const val = kitOrderValue(ko, kitRows);
      if (koCategory(ko) === ORDER_CATEGORIES.PERSONALIZED) personalizedKit += val;
      else separateKit += val;
    });
  } else if (kitRows.length) {
    // Legacy records (no kitOrders): value kit rows as one standalone-kit bucket.
    const topPrice = Number(rec.kitPrice) || 0;
    const topQty = Number(rec.kitOverallQty) || 0;
    separateKit += topPrice > 0 ? r2(topPrice * (topQty || 1)) : sumProductRows(kitRows);
  }

  const personalized = personalizedKit + sumProductRows(persProdRows);
  const separateProduct = sumProductRows(sepProdRows);
  const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
  const grand = r2(personalized + separateKit + separateProduct + fwd);
  return { personalized, separateKit, separateProduct, fwd, grand };
}

// Backward-compatible scalar grand total.
export function computeRecordGrandTotal(rec = {}) {
  return computeRecordBuckets(rec).grand;
}
