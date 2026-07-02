// Shared category-aware document composition builder.
//
// `buildDocComposition` produces the exact same A/B/C "Order Composition" sections object
// that DocumentTemplate renders verbatim when passed as `data.composition`. Centralising it
// here means the Billing invoice, the Sales order/quotation/negotiation downloads, and the
// Dispatch print invoice all render an IDENTICAL items table (outer personalized packaging
// folded into Section A's total, included kits/products shown with their breakdown, and only
// the REMAINING kits/products in Sections B/C).
//
// The standalone "Personalized Packaging × N kits" line is intentionally NOT emitted — its
// value is still counted in the Section A total (taxable/GST), but the bare row (which showed
// only dashes) is omitted from every invoice.

// Round money to 2 decimals (strip float noise) without collapsing genuine paise to whole rupees.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// GST-inclusive amount → { taxable, gst } split at rate g (%).
export const splitGst = (amount, g) => {
  const a = Number(amount) || 0;
  const rate = Number(g) || 0;
  if (rate <= 0) return { taxable: r2(a), gst: 0 };
  const taxable = r2(a / (1 + rate / 100));
  return { taxable, gst: r2(a - taxable) };
};

export function computePersonalizedComposition(formData = {}, kitsData = []) {
  const piRaw = formData.packagingIncludes || [];
  let piIds, piQtyMap;
  if (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null) {
    piIds = piRaw.map(p => p.id);
    piQtyMap = Object.fromEntries(piRaw.map(p => [p.id, Number(p.qty) || 1]));
  } else {
    piIds = piRaw;
    piQtyMap = formData.packagingIncludesQty || {};
  }

  const persQty = Number(formData.kitOverallQty) || 1;
  const persPrice = Number(formData.kitPrice) || 0;
  const pkgTotal = persPrice * persQty;
  const allProds = (formData.products || []).filter(Boolean);
  const kitOrders = (formData.kitOrders || []).filter(Boolean);
  const kitUsage = {};
  const prodUsage = {};

  const includedKits = piIds.map(id => {
    const kDef = kitsData.find(k => String(k._id) === String(id));
    if (!kDef) return null;
    const totalConsumed = Number(piQtyMap[id]) || 1;
    kitUsage[id] = totalConsumed;
    const kOrder = kitOrders.find(ko => String(ko.kitId) === String(id)) || {};
    const kitPkgPrice = Number(kOrder.kitPrice) || 0;
    const kitOrderQty = Number(kOrder.overallQty) || 0;
    const kitProds = allProds.filter(p => (p.isKit || p.kitType) && String(p.kitId) === String(id));
    const prodLines = kitProds.map(p => {
      const qPerKit = Number(p.qty) || 0;
      const rate = Number(p.rate || p.price) || 0;
      const gst = Number(p.gst || p.taxRate) || 0;
      const subtotalPerKit = r2(qPerKit * rate * (1 + gst / 100));
      return { name: p.name || p.itemName || p.kitType || '—', unit: p.unit || 'PCS', gst, rate, qtyPerKit: qPerKit, totalQty: qPerKit * totalConsumed, totalValue: r2(subtotalPerKit * totalConsumed) };
    });
    const prodsTotalPerKit = prodLines.reduce((s, pl) => s + r2(pl.totalValue / totalConsumed), 0);
    const kitValuePerKit = kitPkgPrice + prodsTotalPerKit;
    const kitTotal = r2(kitValuePerKit * totalConsumed);
    return { kitId: id, kitName: kDef.kitName || kDef.name || id, totalConsumed, kitPkgPrice, kitPkgTotal: r2(kitPkgPrice * totalConsumed), kitOrderQty, prodLines, kitTotal };
  }).filter(Boolean);

  const includedSepProds = piIds.map(id => {
    const p = allProds.find(pp => !pp.isKit && !pp.kitType && (pp.name || pp.itemName) === id);
    if (!p) return null;
    const totalConsumed = Number(piQtyMap[id]) || 1;
    prodUsage[id] = totalConsumed;
    const rate = Number(p.rate || p.price) || 0;
    const gst = Number(p.gst || p.taxRate) || 0;
    const unitRate = rate * (1 + gst / 100);
    return { name: id, unit: p.unit || 'PCS', rate, gst, totalConsumed, unitRate, totalValue: r2(totalConsumed * unitRate) };
  }).filter(Boolean);

  const inclKitTotal = includedKits.reduce((s, ik) => s + ik.kitTotal, 0);
  const inclSepTotal = includedSepProds.reduce((s, sp) => s + sp.totalValue, 0);
  const ownKitProdsPerPers = piIds.length > 0
    ? allProds
        .filter(p => (p.isKit || p.kitType) && p.kitId && !piIds.map(String).includes(String(p.kitId)))
        .reduce((s, p) => s + r2((Number(p.qty) || 0) * (Number(p.rate || p.price) || 0) * (1 + (Number(p.gst || p.taxRate) || 0) / 100)), 0)
    : 0;
  const ownKitProdsTotal = ownKitProdsPerPers * persQty;
  const totalPersonalized = r2(pkgTotal + ownKitProdsTotal + inclKitTotal + inclSepTotal);

  const separateKits = kitOrders.map(ko => {
    if (!ko || !ko.kitId) return null;
    const kDef = kitsData.find(k => String(k._id) === String(ko.kitId));
    const origQty = Number(ko.overallQty) || 0;
    const consumed = kitUsage[ko.kitId] || 0;
    const remaining = Math.max(0, origQty - consumed);
    const kitProds = allProds.filter(p => (p.isKit || p.kitType) && String(p.kitId) === String(ko.kitId));
    const prodsSub = kitProds.reduce((s, p) => s + r2((Number(p.qty) || 0) * (Number(p.rate || p.price) || 0) * (1 + (Number(p.gst || p.taxRate) || 0) / 100)), 0);
    const kitPkgPrice = Number(ko.kitPrice) || 0;
    const valuePerKit = kitPkgPrice + prodsSub;
    return { kitId: ko.kitId, kitName: kDef?.kitName || kDef?.name || ko.kitId, remaining, kitPkgPrice, valuePerKit, remainingValue: r2(remaining * valuePerKit) };
  }).filter(Boolean);

  const sepProdsList = allProds.filter(p => p && !p.isKit && !p.kitType).map(p => {
    const name = p.name || p.itemName || '';
    const consumed = prodUsage[name] || 0;
    const remaining = Math.max(0, (Number(p.qty) || 0) - consumed);
    const rate = Number(p.rate || p.price) || 0;
    const gst = Number(p.gst || p.taxRate) || 0;
    const unitRate = rate * (1 + gst / 100);
    return { name, unit: p.unit || 'PCS', rate, gst, remaining, unitRate, remainingValue: r2(remaining * unitRate) };
  });

  return { persQty, persPrice, pkgTotal, includedKits, includedSepProds, totalPersonalized, separateKits, sepProdsList };
}

// Build a category-aware sections object (same shape DocumentTemplate's computeDocSections
// returns) from a personalized composition, so the invoice/quotation items table matches the
// Sales "Order Composition Breakdown" exactly: outer packaging + included kits/products in
// Section A (Personalized) and only the REMAINING kits/products in Sections B/C.
// Returns null when there is no personalized-packaging consumption (caller falls back to
// DocumentTemplate's own kitPrice×qty rendering).
export function buildDocComposition(rec = {}, kitsData = []) {
  if (!(rec.packagingIncludes || []).length || !kitsData.length) return null;
  const comp = computePersonalizedComposition(rec, kitsData);
  let taxableSum = 0, gstSum = 0;
  const acc = (amount, g) => { const s = splitGst(amount, g); taxableSum += s.taxable; gstSum += s.gst; };

  // ── Section A rows ──
  const persKits = [];
  if (comp.persPrice > 0) {
    // Outer personalized packaging: still counted in the Section A total (taxable/GST),
    // but the standalone "Personalized Packaging × N kits" line is intentionally hidden
    // from the invoice/quotation items table.
    acc(comp.pkgTotal, 0);
  }
  comp.includedKits.forEach(ik => {
    const components = [];
    // Kit packaging: still counted in the Section A total (taxable/GST), but the
    // standalone "Kit packaging" row is intentionally hidden from the items table
    // (same treatment as the outer "Personalized Packaging" line above).
    if (ik.kitPkgPrice > 0) { acc(ik.kitPkgTotal, 0); }
    ik.prodLines.forEach(pl => { acc(pl.totalValue, pl.gst); components.push({ name: pl.name, perKit: pl.qtyPerKit, qty: pl.totalQty, unit: pl.unit, rate: pl.rate, gstRate: pl.gst, amount: pl.totalValue }); });
    persKits.push({ kitName: `${ik.kitName} (in personalized)`, qty: ik.totalConsumed, price: 0, components, kitTotal: ik.kitTotal });
  });
  const persProdRows = comp.includedSepProds.map(sp => {
    acc(sp.totalValue, sp.gst);
    const split = splitGst(sp.totalValue, sp.gst);
    // PER KIT = total consumed inside personalized ÷ number of personalized kits.
    return { name: `${sp.name} (in personalized)`, perKit: comp.persQty > 0 ? r2(sp.totalConsumed / comp.persQty) : null, qty: sp.totalConsumed, unit: sp.unit, rate: sp.rate, gstRate: sp.gst, taxAmt: split.gst, amount: sp.totalValue };
  });

  // ── Section B/C rows (remaining only) ──
  const sepKits = comp.separateKits.filter(sk => sk.remaining > 0).map(sk => {
    acc(sk.remainingValue, 0);
    return { kitName: sk.kitName, qty: sk.remaining, price: sk.valuePerKit, components: [], kitTotal: sk.remainingValue };
  });
  // PER KIT for a separate product = its shown quantity ÷ number of personalized kits
  // (e.g. Shampoo 8 PCS ÷ 4 kits = 2 per kit). Blank when there are no personalized kits.
  const sepProdRows = comp.sepProdsList.filter(sp => sp.remaining > 0).map(sp => {
    acc(sp.remainingValue, sp.gst);
    const split = splitGst(sp.remainingValue, sp.gst);
    return { name: sp.name, perKit: comp.persQty > 0 ? r2(sp.remaining / comp.persQty) : null, qty: sp.remaining, unit: sp.unit, rate: sp.rate, gstRate: sp.gst, taxAmt: split.gst, amount: sp.remainingValue };
  });

  const personalized = r2(comp.totalPersonalized);
  const separateKit = r2(sepKits.reduce((s, k) => s + k.kitTotal, 0));
  const separateProduct = r2(sepProdRows.reduce((s, p) => s + p.amount, 0));
  if (personalized === 0 && separateKit === 0 && separateProduct === 0) return null;

  const persKitCount = comp.persQty;
  const sepKitCount = sepKits.reduce((s, k) => s + (k.qty || 0), 0);
  const totalSectionsQty = (
    persKitCount +
    persProdRows.reduce((s, p) => s + (p.qty || 0), 0) +
    sepKitCount +
    sepProdRows.reduce((s, p) => s + (p.qty || 0), 0)
  );

  return {
    persKits, persProdRows, persKitTotal: personalized, persProdTotal: 0, persKitCount, personalized,
    sepKits, sepProdRows, separateKit, sepKitCount, separateProduct,
    totalSectionsAmt: r2(personalized + separateKit + separateProduct),
    totalSectionsQty,
    totalTax: r2(gstSum),
    taxable: r2(taxableSum),
    gst: r2(gstSum),
    isCategorized: true,
  };
}
