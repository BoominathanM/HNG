// Backend port of Frontend/src/utils/orderCalc.js — same kit-aware grand-total math, kept
// in sync deliberately. Order.total/Quotation.total are written by the frontend at save time
// and can go stale (e.g. a payment-only update, or an older save that predates a pricing fix),
// so backend code that needs a guaranteed-current total (ledger, invoice creation) recomputes
// it directly from the record's own products/kitOrders/forwardingCharge/paymentCollection
// fields instead of trusting whatever was last persisted.

const ORDER_CATEGORIES = {
  PERSONALIZED: 'personalized',
  SEPARATE_KIT: 'separate_kit',
  SEPARATE_PRODUCT: 'separate_product',
};

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function rowCategory(p, kitOrders = []) {
  if (!p) return ORDER_CATEGORIES.SEPARATE_PRODUCT;
  if (p.category) return p.category;
  if (p.isKit || p.kitType) {
    const ko = (kitOrders || []).find((o) => o && o.kitId && o.kitId === p.kitId);
    if (ko?.category) return ko.category;
    return ORDER_CATEGORIES.SEPARATE_KIT;
  }
  return ORDER_CATEGORIES.SEPARATE_PRODUCT;
}

const koCategory = (ko) => (ko && ko.category) || ORDER_CATEGORIES.SEPARATE_KIT;

// A product/item row may carry its unit price as `rate` (Sales form field) or `price`
// (Order/Invoice item schema field) — accept either.
const rowRate = (p) => Number(p.rate ?? p.price) || 0;

// GST-inclusive value of one kit: kitPrice × overallQty, falling back to component rows.
// Separate Kit (category B) always counts BOTH the kit's own price AND its included products'
// price (kitPrice + rows sum) — neither is skipped. Personalized (A) keeps the original
// behavior: trust a stored kitPrice, falling back to rows sum only when it's empty.
function kitOrderValue(ko, kitRows = []) {
  const price = Number(ko?.kitPrice) || 0;
  const qty = Number(ko?.overallQty) || 0;
  const rows = kitRows.filter((p) => p && p.kitId === ko?.kitId);
  const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p) * ((Number(p.gst) || 0) / 100), 0);
  const rowsSum = sub + gst;
  if (koCategory(ko) === ORDER_CATEGORIES.SEPARATE_KIT) {
    return r2((price + rowsSum) * (qty || 1));
  }
  if (price > 0) return r2(price * (qty || 1));
  return r2(rowsSum * (qty || 1));
}

// GST-inclusive subtotal of a set of (non-kit) product rows.
function sumProductRows(rows = []) {
  const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p) * ((Number(p.gst) || 0) / 100), 0);
  return r2(sub + gst);
}

// taxable/GST split for one kit order — mirrors kitOrderValue's category rule exactly, but
// keeps the pre-tax base and the tax amount separate instead of summing them.
function kitOrderTaxSplit(ko, kitRows = []) {
  const price = Number(ko?.kitPrice) || 0;
  const qty = Number(ko?.overallQty) || 0;
  const priceGstPct = Number(ko?.gst || ko?.gstPercent || ko?.taxRate) || 0;
  const priceTaxable = priceGstPct > 0 ? price / (1 + priceGstPct / 100) : price;
  const priceGst = price - priceTaxable;

  const rows = kitRows.filter((p) => p && p.kitId === ko?.kitId);
  const rowsTaxable = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p), 0);
  const rowsGst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p) * ((Number(p.gst) || 0) / 100), 0);

  if (koCategory(ko) === ORDER_CATEGORIES.SEPARATE_KIT) {
    return { taxable: r2((priceTaxable + rowsTaxable) * (qty || 1)), gst: r2((priceGst + rowsGst) * (qty || 1)) };
  }
  if (price > 0) return { taxable: r2(priceTaxable * (qty || 1)), gst: r2(priceGst * (qty || 1)) };
  return { taxable: r2(rowsTaxable * (qty || 1)), gst: r2(rowsGst * (qty || 1)) };
}

function taxSplitProductRows(rows = []) {
  const taxable = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * rowRate(p) * ((Number(p.gst) || 0) / 100), 0);
  return { taxable: r2(taxable), gst: r2(gst) };
}

function sumCourierCharges(rec = {}) {
  return r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
}

function sumRoundOff(rec = {}) {
  return r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
}

// Single source of truth for category buckets. rec accepts `products` (Sales/Order shape) or
// `items` (Invoice/Quotation item shape) — whichever is populated.
// Returns { personalized (A), separateKit (B), separateProduct (C), fwd, courier, roundOff,
// taxable, gst, grand }.
function computeRecordBuckets(rec = {}) {
  const prods = (rec.products?.length ? rec.products : rec.items || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  const cat = (p) => rowCategory(p, kitOrders);

  const kitRows = prods.filter((p) => p.isKit || p.kitType);
  const persProdRows = prods.filter((p) => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.PERSONALIZED);
  const sepProdRows = prods.filter((p) => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.SEPARATE_PRODUCT);

  let personalizedKit = 0;
  let separateKit = 0;
  let taxable = 0;
  let gst = 0;
  if (kitOrders.length) {
    kitOrders.forEach((ko) => {
      const val = kitOrderValue(ko, kitRows);
      const split = kitOrderTaxSplit(ko, kitRows);
      taxable += split.taxable;
      gst += split.gst;
      if (koCategory(ko) === ORDER_CATEGORIES.PERSONALIZED) personalizedKit += val;
      else separateKit += val;
    });
  } else if (kitRows.length) {
    // Legacy records (no kitOrders): value kit rows as one standalone-kit bucket.
    const topPrice = Number(rec.kitPrice) || 0;
    const topQty = Number(rec.kitOverallQty) || 0;
    if (topPrice > 0) {
      separateKit += r2(topPrice * (topQty || 1));
      taxable += r2(topPrice * (topQty || 1));
    } else {
      separateKit += sumProductRows(kitRows);
      const split = taxSplitProductRows(kitRows);
      taxable += split.taxable;
      gst += split.gst;
    }
  }

  const persSplit = taxSplitProductRows(persProdRows);
  const sepSplit = taxSplitProductRows(sepProdRows);
  taxable = r2(taxable + persSplit.taxable + sepSplit.taxable);
  gst = r2(gst + persSplit.gst + sepSplit.gst);

  const personalized = personalizedKit + sumProductRows(persProdRows);
  const separateProduct = sumProductRows(sepProdRows);
  const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
  const courier = sumCourierCharges(rec);
  const roundOff = sumRoundOff(rec);
  const grand = r2(personalized + separateKit + separateProduct + fwd + courier + roundOff);
  return { personalized, separateKit, separateProduct, fwd, courier, roundOff, taxable, gst, grand };
}

function computeRecordGrandTotal(rec = {}) {
  return computeRecordBuckets(rec).grand;
}

// Port of Frontend/src/utils/docComposition.js's computePersonalizedComposition — needed
// whenever `packagingIncludes` is non-empty (the "Select Kit(s) to Include" feature): a
// personalized outer packaging is charged its own price on top of whatever kits/products are
// packed inside it, and only the REMAINING (non-consumed) kit/product quantity is billed
// separately. computeRecordBuckets alone has no concept of this nesting — it prices every
// kitOrder as if it were sold standalone — so it silently omits the outer-packaging charge and
// gives the wrong grand total for any order using this feature.
// kitsData: array of Kit documents; a referenced kit is skipped (matching the frontend's own
// `if (!kDef) return null` gate) if it isn't found here.
function computePersonalizedComposition(rec = {}, kitsData = []) {
  const piRaw = rec.packagingIncludes || [];
  let piIds, piQtyMap;
  if (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null) {
    piIds = piRaw.map((p) => p.id);
    piQtyMap = Object.fromEntries(piRaw.map((p) => [p.id, Number(p.qty) || 1]));
  } else {
    piIds = piRaw;
    piQtyMap = rec.packagingIncludesQty || {};
  }

  const persQty = Number(rec.kitOverallQty) || 1;
  const persPrice = Number(rec.kitPrice) || 0;
  const pkgTotal = persPrice * persQty;
  const allProds = (rec.products?.length ? rec.products : rec.items || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  const kitUsage = {};
  const prodUsage = {};

  const includedKits = piIds.map((id) => {
    const kDef = kitsData.find((k) => String(k._id) === String(id));
    if (!kDef) return null;
    const totalConsumed = Number(piQtyMap[id]) || 1;
    kitUsage[id] = totalConsumed;
    const kOrder = kitOrders.find((ko) => String(ko.kitId) === String(id)) || {};
    const kitPkgPrice = Number(kOrder.kitPrice) || 0;
    const kitProds = allProds.filter((p) => (p.isKit || p.kitType) && String(p.kitId) === String(id));
    const prodLines = kitProds.map((p) => {
      const qPerKit = Number(p.qty) || 0;
      const rate = rowRate(p);
      const gst = Number(p.gst ?? p.taxRate) || 0;
      const subtotalPerKit = r2(qPerKit * rate * (1 + gst / 100));
      return { totalValue: r2(subtotalPerKit * totalConsumed) };
    });
    const prodsTotalPerKit = prodLines.reduce((s, pl) => s + r2(pl.totalValue / totalConsumed), 0);
    const kitValuePerKit = kitPkgPrice + prodsTotalPerKit;
    return { kitTotal: r2(kitValuePerKit * totalConsumed) };
  }).filter(Boolean);

  const includedSepProds = piIds.map((id) => {
    const p = allProds.find((pp) => !pp.isKit && !pp.kitType && (pp.name || pp.itemName) === id);
    if (!p) return null;
    const totalConsumed = Number(piQtyMap[id]) || 1;
    prodUsage[id] = totalConsumed;
    const rate = rowRate(p);
    const gst = Number(p.gst ?? p.taxRate) || 0;
    const unitRate = rate * (1 + gst / 100);
    return { totalValue: r2(totalConsumed * unitRate) };
  }).filter(Boolean);

  const inclKitTotal = includedKits.reduce((s, ik) => s + ik.kitTotal, 0);
  const inclSepTotal = includedSepProds.reduce((s, sp) => s + sp.totalValue, 0);
  const ownKitProdsPerPers = piIds.length > 0
    ? allProds
        .filter((p) => (p.isKit || p.kitType) && p.kitId && !piIds.map(String).includes(String(p.kitId)))
        .reduce((s, p) => s + r2((Number(p.qty) || 0) * rowRate(p) * (1 + (Number(p.gst ?? p.taxRate) || 0) / 100)), 0)
    : 0;
  const ownKitProdsTotal = ownKitProdsPerPers * persQty;
  const totalPersonalized = r2(pkgTotal + ownKitProdsTotal + inclKitTotal + inclSepTotal);

  const separateKits = kitOrders.map((ko) => {
    if (!ko || !ko.kitId) return null;
    const origQty = Number(ko.overallQty) || 0;
    const consumed = kitUsage[ko.kitId] || 0;
    const remaining = Math.max(0, origQty - consumed);
    const kitProds = allProds.filter((p) => (p.isKit || p.kitType) && String(p.kitId) === String(ko.kitId));
    const prodsSub = kitProds.reduce((s, p) => s + r2((Number(p.qty) || 0) * rowRate(p) * (1 + (Number(p.gst ?? p.taxRate) || 0) / 100)), 0);
    const kitPkgPrice = Number(ko.kitPrice) || 0;
    const valuePerKit = kitPkgPrice + prodsSub;
    return { remainingValue: r2(remaining * valuePerKit) };
  }).filter(Boolean);

  const sepProdsList = allProds.filter((p) => p && !p.isKit && !p.kitType).map((p) => {
    const name = p.name || p.itemName || '';
    const consumed = prodUsage[name] || 0;
    const remaining = Math.max(0, (Number(p.qty) || 0) - consumed);
    const rate = rowRate(p);
    const gst = Number(p.gst ?? p.taxRate) || 0;
    const unitRate = rate * (1 + gst / 100);
    return { remainingValue: r2(remaining * unitRate) };
  });

  return { totalPersonalized, separateKits, sepProdsList };
}

// Backend port of Frontend's computeCompositionGrandTotal — branches to the packaging-aware
// composition when packagingIncludes is used, else falls back to the plain category buckets.
// kitsData: Kit documents (only needed when rec.packagingIncludes is non-empty).
function computeCompositionGrandTotal(rec = {}, kitsData = []) {
  if ((rec.packagingIncludes || []).length > 0 && kitsData.length > 0) {
    const comp = computePersonalizedComposition(rec, kitsData);
    const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
    const courier = sumCourierCharges(rec);
    const roundOff = sumRoundOff(rec);
    const separateKit = comp.separateKits.reduce((s, sk) => s + (sk.remainingValue || 0), 0);
    const separateProduct = comp.sepProdsList.reduce((s, sp) => s + (sp.remainingValue || 0), 0);
    return r2(comp.totalPersonalized + separateKit + separateProduct + fwd + courier + roundOff);
  }
  return computeRecordGrandTotal(rec);
}

module.exports = {
  ORDER_CATEGORIES,
  r2,
  rowCategory,
  koCategory,
  kitOrderValue,
  sumProductRows,
  computeRecordBuckets,
  computeRecordGrandTotal,
  computePersonalizedComposition,
  computeCompositionGrandTotal,
};
