import React from 'react';

const COMPANY = {
  name: 'HealNGlow.Pvt.Ltd',
  address: 'TR IT Park, palani road, Dindigul, Tamil Nadu, 624001',
  mobile: '8248093571',
  gstin: '33AAHCH2128J1ZR',
  pan: 'AAHCH2128J',
  email: 'admin@healnNglow.co.in',
};

const BANK = {
  name: 'Heal n Glow',
  ifsc: 'KK8K0008716',
  account: '8056766743',
  bank: 'Kotak Mahindra Bank, MADURAI',
};

const DEFAULT_LOGO = '/hng logo new.png';

// When true, the per-line AMOUNT values inside each category section (kit-level,
// component, and product line rows) are hidden in quotations & invoices. Only the
// section header total, "Total (A/B/C)" footer, and the document subtotal/total
// remain visible — so the customer sees the bundle price, not the internal breakdown.
const HIDE_LINE_AMOUNTS = true;

// When true, the per-line RATE (unit price) values inside each category section
// (kit-level price, component rows, and product line rows) are hidden in quotations
// & invoices — so the customer never sees the individual product prices, only the
// bundle/section totals. The RATE column header is kept for column alignment.
const HIDE_LINE_RATES = true;

const SAMPLE_ITEMS = [
  { name: 'ROOM FRESHNER LAVENDER 5 LITRE', qty: 5, unit: 'PCS', rate: 680, taxRate: 18, taxAmt: 612, amount: 4012 },
  { name: 'ROOM FRESHNER BRUTE 5 LITRE', qty: 1, unit: 'PCS', rate: 1500, taxRate: 18, taxAmt: 270, amount: 1770 },
  { name: 'TOILET BOWL CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 500, taxRate: 18, taxAmt: 450, amount: 2950 },
  { name: 'FLOOR CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 450, taxRate: 18, taxAmt: 405, amount: 2655 },
  { name: 'GLASS CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 650, taxRate: 25, taxAmt: 585, amount: 3835 },
  { name: 'TOILET CLEANER FLOOR 5LITRE', qty: 5, unit: 'PCS', rate: 650, taxRate: 25, taxAmt: 585, amount: 3835 },
  { name: 'STAINLESS STEEL POLISH GRADE 2 (5LITRE)', qty: 3, unit: 'PCS', rate: 2500, taxRate: 0, taxAmt: 0, amount: 7500 },
];

const THEME_MAP = {
  classic:      { accent: '#1a1a2e', light: '#f4f4f7', border: '#d9d9e3' },
  brand:        { accent: '#B11E6A', light: '#fbeef5', border: '#eccdde' },
  professional: { accent: '#16213e', light: '#eef0f6', border: '#cdd2e0' },
  ocean:        { accent: '#1e3a5f', light: '#eef2f7', border: '#c8d4e2' },
  forest:       { accent: '#1a4731', light: '#eef4ef', border: '#c5d8c9' },
  minimal:      { accent: '#555555', light: '#fafafa', border: '#e2e2e2' },
};

// Category colour palette (shared between HTML and React renderers)
const CAT_STYLE = {
  personalized: { header: '#ede9fe', text: '#5b21b6', sub: '#f5f3ff' },
  separate_kit: { header: '#e0f2fe', text: '#0369a1', sub: '#f0f9ff' },
  separate_product: { header: '#fce7f3', text: '#9d174d', sub: '#fdf2f8' },
};

const r2d = (n) => Math.round((Number(n) || 0) * 100) / 100;

function asPlainObject(maybeMap) {
  if (!maybeMap) return {};
  if (maybeMap instanceof Map) return Object.fromEntries(maybeMap);
  return maybeMap;
}

function resolveConfig(settings = {}, data = {}) {
  const theme = THEME_MAP[settings.invoiceTheme] || THEME_MAP.classic;
  const font = settings.invoiceFontStyle
    ? `${settings.invoiceFontStyle}, Arial, sans-serif`
    : 'Arial, sans-serif';
  const t = asPlainObject(settings.invoiceToggles);
  const show = {
    logo:    t.logo    !== false,
    gstin:   t.gstin   !== false,
    taxRate: t.taxRate !== false,
    bank:    t.bank    !== false,
    terms:   t.terms   !== false,
    sign:    t.sign    === true,
  };
  const gstMode = settings.gstComponent || 'cgst_sgst';
  const terms = settings.invoiceTerms || '';
  const footer = settings.invoiceFooter || '';
  const company = {
    ...COMPANY,
    name: settings.companyName || COMPANY.name,
    gstin: settings.gstNumber || COMPANY.gstin,
    address: settings.address || COMPANY.address,
    mobile: settings.mobile || COMPANY.mobile,
    pan: settings.panNumber || COMPANY.pan,
    email: settings.email || COMPANY.email,
  };
  const logoUrl = settings.logoUrl || data.logoUrl || DEFAULT_LOGO;
  const rawBank = asPlainObject(settings.bankDetails);
  const bank = {
    name: rawBank.name || BANK.name,
    ifsc: rawBank.ifsc || BANK.ifsc,
    account: rawBank.account || BANK.account,
    bank: rawBank.bank || BANK.bank,
    upiId: rawBank.upiId || '',
    qrCodeUrl: rawBank.qrCodeUrl || '',
  };
  const signatureUrl = settings.signatureUrl || null;
  return { theme, font, show, gstMode, terms, footer, company, logoUrl, bank, signatureUrl };
}

// Groups the taxable line items by their GST rate so CGST/SGST can be shown split per
// rate (e.g. 5% items → 2.5% CGST + 2.5% SGST, 18% items → 9% CGST + 9% SGST) instead of
// one flat half-of-aggregate number. Walks the same source `computeModel` already used
// for `totalTax` (sections when it carries its own totalTax, otherwise the flat items[]),
// so the sum of the returned groups' tax always equals the existing totalTax exactly.
function computeTaxByRate(sections, items) {
  const map = {};
  const add = (rate, tax) => {
    if (!rate || !tax) return;
    const key = String(rate);
    if (!map[key]) map[key] = { rate, tax: 0 };
    map[key].tax += tax;
  };
  const rowTax = (row) => {
    const rate = Number(row.gstRate ?? row.taxRate ?? row.gst) || 0;
    if (!rate) return;
    const qty = Number(row.qty) || 0;
    const rate$ = Number(row.rate) || 0;
    const taxAmt = row.taxAmt != null ? Number(row.taxAmt) : r2d(qty * rate$ * rate / 100);
    add(rate, taxAmt);
  };
  if (sections) {
    const walkKits = (kits) => (kits || []).forEach(ko => (ko.components || []).forEach(rowTax));
    walkKits(sections.persKits);
    walkKits(sections.sepKits);
    (sections.persProdRows || []).forEach(rowTax);
    (sections.sepProdRows || []).forEach(rowTax);
  } else {
    (items || []).forEach(rowTax);
  }
  return Object.values(map)
    .map(g => ({ rate: g.rate, tax: r2d(g.tax) }))
    .filter(g => g.tax > 0)
    .sort((a, b) => a.rate - b.rate);
}

function resolveTaxRows(gstMode, taxableAmount, data, taxGroups) {
  if (gstMode === 'none') return [];

  // Preferred path: per-rate breakdown derived from the actual line items, so mixed-rate
  // documents (e.g. 5% + 18% items) show each rate's CGST/SGST separately instead of one
  // blended number. The grouped totals still sum to the same CGST/SGST/IGST as before.
  if (taxGroups && taxGroups.length) {
    const rows = [];
    taxGroups.forEach(({ rate, tax }) => {
      const half = r2d(tax / 2);
      const halfRate = r2d(rate / 2);
      switch (gstMode) {
        case 'cgst': rows.push([`CGST @${halfRate}%`, half]); break;
        case 'sgst': rows.push([`SGST @${halfRate}%`, half]); break;
        case 'igst': rows.push([`IGST @${rate}%`, r2d(tax)]); break;
        case 'all':
          rows.push([`CGST @${halfRate}%`, half]);
          rows.push([`SGST @${halfRate}%`, half]);
          rows.push([`IGST @${rate}%`, r2d(tax)]);
          break;
        case 'cgst_sgst':
        default:
          rows.push([`CGST @${halfRate}%`, half]);
          rows.push([`SGST @${halfRate}%`, half]);
          break;
      }
    });
    return rows;
  }

  // Fallback (no per-rate breakdown available, e.g. sample/legacy data): previous flat
  // half-of-aggregate behaviour.
  const half = data.cgst !== undefined || data.sgst !== undefined
    ? null
    : Math.round(taxableAmount * 9) / 100;
  const cgstVal = data.cgst !== undefined ? data.cgst : (half ?? Math.round(taxableAmount * 9) / 100);
  const sgstVal = data.sgst !== undefined ? data.sgst : (half ?? Math.round(taxableAmount * 9) / 100);
  const igstVal = data.igst !== undefined ? data.igst : Math.round(taxableAmount * 18) / 100;
  switch (gstMode) {
    case 'cgst':      return [['CGST', cgstVal]];
    case 'sgst':      return [['SGST', sgstVal]];
    case 'igst':      return [['IGST', igstVal]];
    case 'all':       return [['CGST', cgstVal], ['SGST', sgstVal], ['IGST', igstVal]];
    case 'cgst_sgst':
    default:          return [['CGST', cgstVal], ['SGST', sgstVal]];
  }
}

function toWords(n) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function h(num) {
    if (!num) return '';
    if (num < 20) return a[num] + ' ';
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '') + ' ';
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred ' + h(num % 100);
    if (num < 100000) return h(Math.floor(num / 1000)) + 'Thousand ' + h(num % 1000);
    if (num < 10000000) return h(Math.floor(num / 100000)) + 'Lakh ' + h(num % 100000);
    return h(Math.floor(num / 10000000)) + 'Crore ' + h(num % 10000000);
  }
  return h(Math.round(n)).trim() + ' Rupees';
}

// ─── Category-aware section builder ─────────────────────────────────────────
// Returns structured sections (A/B/C) from products + kitOrders when the
// order has a kit composition. Returns null when there is no kit data so the
// caller falls back to the flat items[] rendering.
function computeDocSections(data) {
  const products = (data.products || []).filter(Boolean);
  const kitOrders = (data.kitOrders || []).filter(Boolean);
  if (!products.length && !kitOrders.length) return null;

  const catOf = (p) => {
    if (p.category) return p.category;
    if (p.isKit || p.kitType) return 'separate_kit';
    return 'separate_product';
  };

  const kitRows = products.filter(p => p.isKit || p.kitType);
  const nonKitProds = products.filter(p => !(p.isKit || p.kitType));
  const persProds = nonKitProds.filter(p => catOf(p) === 'personalized');
  const sepProds = nonKitProds.filter(p => catOf(p) === 'separate_product');

  const toRow = (p) => {
    const qty = Number(p.qty) || 0;
    const rate = r2d(Number(p.price || p.rate) || 0);
    const gstRate = Number(p.gst || p.taxRate || 0);
    const taxAmt = r2d(qty * rate * gstRate / 100);
    const amount = r2d(qty * rate + taxAmt);
    return { name: p.itemName || p.name || '—', qty, unit: p.unit || 'PCS', rate, gstRate, taxAmt, amount, size: p.size || p.defaultSize || '' };
  };

  // Enrich a kit order with its component rows from products[] and compute kitTotal.
  // Mirrors Sales kitOrderValue: component rows store PER-KIT qty, so multiply qty &
  // amount by overallQty for display; total = component-sum × overallQty (or kitPrice × qty
  // when a kit price is explicitly set). Duplicate rows (one per kit unit) are aggregated.
  const enrichKit = (ko) => {
    const qty = Number(ko.overallQty || ko.qty) || 1;
    const price = Number(ko.kitPrice) || 0;
    const rawRows = kitRows.filter(r => r.kitId && String(r.kitId) === String(ko.kitId || ''));
    // Aggregate duplicate rows by product name (sum per-kit qty)
    const agg = {};
    rawRows.forEach(r => {
      const key = (r.itemName || r.name || '').trim();
      if (!key) return;
      if (agg[key]) agg[key]._q += Number(r.qty) || 0;
      else agg[key] = { ...r, _q: Number(r.qty) || 0 };
    });
    // Build display rows: per-kit qty × overallQty so the doc shows TOTAL quantities
    const components = Object.values(agg).map((r) => {
      const totalQty = r._q * qty;
      const rate = r2d(Number(r.price || r.rate) || 0);
      const gstRate = Number(r.gst || r.taxRate || 0);
      const taxAmt = r2d(totalQty * rate * gstRate / 100);
      const amount = r2d(totalQty * rate + taxAmt);
      return { name: r.itemName || r.name || '—', perKit: r._q, qty: totalQty, unit: r.unit || 'PCS', rate, gstRate, taxAmt, amount };
    });
    const kitName = ko.kitName || rawRows[0]?.kitName || rawRows[0]?.kitType || '—';
    // kitPrice (when set) wins; otherwise sum the (already qty-scaled) component amounts
    const kitTotal = price > 0
      ? r2d(price * qty)
      : r2d(components.reduce((s, r) => s + r.amount, 0));
    return { ...ko, qty, price, kitName, components, kitTotal };
  };

  let persKits = [], sepKits = [];
  if (kitOrders.length) {
    persKits = kitOrders.filter(ko => (ko.category || 'separate_kit') === 'personalized').map(enrichKit);
    sepKits  = kitOrders.filter(ko => (ko.category || 'separate_kit') === 'separate_kit').map(enrichKit);
  } else {
    // Legacy: no kitOrders — synthesise from top-level kit rows
    const mapKit = (k) => enrichKit({
      kitId: k.kitId, kitName: k.kitName || k.itemName || '—',
      kitPrice: Number(k.kitPrice || k.price || k.rate) || 0,
      overallQty: Number(k.overallQty || k.qty) || 0,
      category: catOf(k),
    });
    persKits = kitRows.filter(k => catOf(k) === 'personalized').map(mapKit);
    sepKits  = kitRows.filter(k => catOf(k) === 'separate_kit').map(mapKit);
  }

  // PER KIT for a (personalized or separate) product = its qty ÷ number of personalized kits.
  const persKitCnt = persKits.reduce((s, ko) => s + (ko.qty || 0), 0);
  const withPerKit = (row) => ({ ...row, perKit: persKitCnt > 0 ? r2d(row.qty / persKitCnt) : null });

  const persKitTotal = r2d(persKits.reduce((s, ko) => s + ko.kitTotal, 0));
  const persProdRows = persProds.map(p => withPerKit(toRow(p)));
  const persProdTotal = r2d(persProdRows.reduce((s, r) => s + r.amount, 0));
  const personalized = r2d(persKitTotal + persProdTotal);

  const separateKit = r2d(sepKits.reduce((s, ko) => s + ko.kitTotal, 0));
  const sepProdRows = sepProds.map(p => withPerKit(toRow(p)));
  const separateProduct = r2d(sepProdRows.reduce((s, r) => s + r.amount, 0));

  if (personalized === 0 && separateKit === 0 && separateProduct === 0) return null;

  const persKitCount = persKits.reduce((s, ko) => s + (ko.qty || 0), 0);
  const sepKitCount  = sepKits.reduce((s, ko) => s + (ko.qty || 0), 0);
  const totalSectionsQty = (
    persKitCount + persProdRows.reduce((s, r) => s + r.qty, 0) +
    sepKitCount  + sepProdRows.reduce((s, r) => s + r.qty, 0)
  );

  return {
    persKits, persProdRows, persKitTotal, persProdTotal, persKitCount, personalized,
    sepKits, sepProdRows, separateKit, sepKitCount, separateProduct,
    totalSectionsAmt: r2d(personalized + separateKit + separateProduct),
    totalSectionsQty,
    isCategorized: true,
  };
}

// ─── Shared computation ───────────────────────────────────────────────────────
function computeModel(type, data, settings) {
  const cfg = resolveConfig(settings, data);
  const isQuotation = type === 'quotation';
  const items = (data.items || SAMPLE_ITEMS).filter(Boolean);
  // A pre-built composition (from Billing) takes precedence over the template's own
  // kitPrice×qty computation so the items table matches the Sales composition breakdown.
  const sections = data.composition || computeDocSections(data);

  const totalQty = sections ? sections.totalSectionsQty : items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalTax = sections && sections.totalTax !== undefined
    ? sections.totalTax
    : items.reduce((s, i) => s + (i.taxAmt || 0), 0);
  const subtotalAmt = sections
    ? sections.totalSectionsAmt
    : items.reduce((s, i) => s + (i.amount || 0), 0);

  const taxableAmount = data.taxableAmount || (subtotalAmt - totalTax);

  // Support both the boolean+amount pattern (order/quotation model) and a legacy number
  const fwdEnabled = data.forwardingCharge === true;
  const forwardingCharge = fwdEnabled
    ? r2d(Number(data.forwardingChargeAmount) || 0)
    : (typeof data.forwardingCharge === 'number' && data.forwardingCharge > 0
        ? data.forwardingCharge : 0);
  // Courier Charge / Round Off recorded via Billing's Record Payment In — shown as their
  // own line rows directly below Forwarding Charge, same as forwardingCharge above.
  const courierCharge = r2d(Number(data.courierCharge) || 0);
  const roundOff = r2d(Number(data.roundOff) || 0);

  // Mirror the same `sections` source used for totalTax above (only sections with their own
  // totalTax carry rate-level detail worth walking — local computeDocSections falls back to
  // flat items, same as totalTax does) so the per-rate groups always sum to totalTax exactly.
  const taxGroups = computeTaxByRate(sections && sections.totalTax !== undefined ? sections : null, items);
  const taxRows = resolveTaxRows(cfg.gstMode, taxableAmount, data, taxGroups);
  const taxRowsTotal = taxRows.reduce((s, [, v]) => s + (v || 0), 0);
  const totalAmount = data.total !== undefined
    ? data.total
    : (taxableAmount + taxRowsTotal + forwardingCharge + courierCharge + roundOff);

  const customer = data.customer || {
    name: data.client || 'SDA SHOPPEE',
    address: '12, Ground Floor, Freshmint, Nageswaran North Street, Kumbakonam',
    city: 'Thanjavur, Tamil Nadu, 612001',
    mobile: '9952808787',
    gstin: '33AKHPD6797L1ZO',
    pan: 'AKHPD6797L',
    placeOfSupply: 'Tamil Nadu',
  };

  const docNumber = isQuotation ? (data.quot || data.number || '2122') : (data.inv || data.number || 'INV-001');
  const docDate = data.date || '08/05/2026';
  // Expected Delivery Date is shown next to the Quotation Date only — invoices show no second date.
  const secondDate = isQuotation ? (data.expectedDeliveryDate || '') : '';

  return {
    cfg, isQuotation, items, sections, totalQty, totalTax, subtotalAmt, taxableAmount,
    forwardingCharge, courierCharge, roundOff, taxRows, totalAmount, customer, docNumber, docDate, secondDate,
  };
}

// ─── HTML generation helpers ─────────────────────────────────────────────────
function buildSectionRowsHtml(sections, ACCENT, LIGHT, BORDER, cfg) {
  const rs = (v) => `&#x20B9;${r2d(v).toLocaleString()}`;
  const taxPct = (g) => (cfg.show.taxRate ? `${Number(g) || 0}%` : '');
  // 1-kit price = kit price + included-products price, i.e. section total ÷ kit count.
  const persKitRate = sections.persKitCount > 0 ? r2d(sections.persKitTotal / sections.persKitCount) : 0;
  const sepKitRate = sections.sepKitCount > 0 ? r2d(sections.separateKit / sections.sepKitCount) : 0;
  let html = '';

  // ── Section A: Personalized Kit ──
  if (sections.personalized > 0) {
    const cs = CAT_STYLE.personalized;
    const kitLabel = sections.persKitCount
      ? ` — ${sections.persKitCount} kit${sections.persKitCount !== 1 ? 's' : ''}`
      : '';
    html += `
      <tr>
        <td colspan="3" style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;letter-spacing:0.5px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          A &nbsp;&mdash;&nbsp; PERSONALIZED KIT${kitLabel}
        </td>
        <td style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          ${persKitRate > 0 ? persKitRate.toLocaleString() : ''}
        </td>
        <td style="padding:8px 10px;background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};"></td>
        <td style="padding:8px 10px;background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};"></td>
        <td style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;text-align:right;border-bottom:1px solid ${BORDER};">
          ${rs(sections.personalized)}
        </td>
      </tr>`;

    sections.persKits.forEach(ko => {
      const qty = ko.qty;
      const price = ko.price;
      const hasComponents = ko.components && ko.components.length > 0;
      if (hasComponents) {
        // Kit sub-header + indented component rows
        html += `
          <tr style="background:${cs.sub};">
            <td colspan="6" style="padding:6px 10px 6px 24px;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
              ${ko.kitName || '—'} &times; ${qty} kit${qty !== 1 ? 's' : ''}${!HIDE_LINE_RATES && price > 0 ? ` &mdash; ${rs(price)}/kit` : ''}
            </td>
            <td style="padding:6px 10px;text-align:right;font-weight:700;border-bottom:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
          </tr>`;
        ko.components.forEach(comp => {
          html += `
            <tr style="background:#fff;">
              <td style="padding:5px 10px 5px 40px;font-size:10px;color:#555;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
                &ndash;&nbsp;${comp.name}
              </td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;font-weight:700;">${comp.perKit != null ? comp.perKit : ''}</td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;"></td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;"></td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;">${HIDE_LINE_RATES ? '' : comp.rate.toLocaleString()}</td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;">${taxPct(comp.gstRate != null ? comp.gstRate : comp.gst)}</td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:10px;color:#555;">${HIDE_LINE_AMOUNTS ? '' : rs(comp.amount)}</td>
            </tr>`;
        });
      } else {
        html += `
          <tr style="background:${cs.sub};">
            <td style="padding:6px 10px 6px 24px;font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
              ${ko.kitName || '—'} &times; ${qty} kit${qty !== 1 ? 's' : ''}
            </td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_RATES ? '' : (price > 0 ? price.toLocaleString() : '')}</td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
          </tr>`;
      }
    });

    sections.persProdRows.forEach(p => {
      html += `
        <tr style="background:#fff;">
          <td style="padding:6px 10px 6px 24px;font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">${p.name}</td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${p.perKit != null ? p.perKit : ''}</td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_RATES ? '' : p.rate.toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${taxPct(p.gstRate)}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_AMOUNTS ? '' : rs(p.amount)}</td>
        </tr>`;
    });

    html += `
      <tr style="background:${cs.header};">
        <td colspan="6" style="padding:6px 10px;font-size:11px;font-weight:700;color:${cs.text};font-style:italic;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">Total Personalized (A)</td>
        <td style="padding:6px 10px;text-align:right;font-weight:800;color:${cs.text};font-size:11px;border-bottom:1px solid ${BORDER};">${rs(sections.personalized)}</td>
      </tr>`;
  }

  // ── Section B: Separate Kit ──
  if (sections.separateKit > 0) {
    const cs = CAT_STYLE.separate_kit;
    html += `
      <tr>
        <td colspan="3" style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          B &nbsp;&mdash;&nbsp; SEPARATE KIT${sections.sepKitCount ? ` — ${sections.sepKitCount} kit${sections.sepKitCount !== 1 ? 's' : ''}` : ''}
        </td>
        <td style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          ${sepKitRate > 0 ? sepKitRate.toLocaleString() : ''}
        </td>
        <td style="padding:8px 10px;background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};"></td>
        <td style="padding:8px 10px;background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};"></td>
        <td style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;text-align:right;border-bottom:1px solid ${BORDER};">
          ${rs(sections.separateKit)}
        </td>
      </tr>`;

    sections.sepKits.forEach(ko => {
      const qty = ko.qty;
      const price = ko.price;
      const hasComponents = ko.components && ko.components.length > 0;
      if (hasComponents) {
        html += `
          <tr style="background:${cs.sub};">
            <td colspan="6" style="padding:6px 10px 6px 24px;font-size:11px;font-weight:700;color:#333;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
              ${ko.kitName || '—'} &times; ${qty} kit${qty !== 1 ? 's' : ''}${!HIDE_LINE_RATES && price > 0 ? ` &mdash; ${rs(price)}/kit` : ''}
            </td>
            <td style="padding:6px 10px;text-align:right;font-weight:700;border-bottom:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
          </tr>`;
        ko.components.forEach(comp => {
          html += `
            <tr style="background:#fff;">
              <td style="padding:5px 10px 5px 40px;font-size:10px;color:#555;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
                &ndash;&nbsp;${comp.name}
              </td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;font-weight:700;">${comp.perKit != null ? comp.perKit : ''}</td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;"></td>
              <td style="padding:5px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;"></td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;">${HIDE_LINE_RATES ? '' : comp.rate.toLocaleString()}</td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:10px;color:#555;">${taxPct(comp.gstRate != null ? comp.gstRate : comp.gst)}</td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:10px;color:#555;">${HIDE_LINE_AMOUNTS ? '' : rs(comp.amount)}</td>
            </tr>`;
        });
      } else {
        html += `
          <tr style="background:${cs.sub};">
            <td style="padding:6px 10px 6px 24px;font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
              ${ko.kitName || '—'} &times; ${qty} kit${qty !== 1 ? 's' : ''}
            </td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_RATES ? '' : (price > 0 ? price.toLocaleString() : '')}</td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
            <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:11px;">${HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
          </tr>`;
      }
    });
  }

  // ── Section C: Separate Products ──
  if (sections.separateProduct > 0) {
    const cs = CAT_STYLE.separate_product;
    html += `
      <tr>
        <td colspan="6" style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">
          C &nbsp;&mdash;&nbsp; SEPARATE PRODUCTS
        </td>
        <td style="padding:8px 10px;font-weight:800;color:${cs.text};background:${cs.header};font-size:11px;text-align:right;border-bottom:1px solid ${BORDER};">
        </td>
      </tr>`;

    sections.sepProdRows.forEach(p => {
      html += `
        <tr style="background:${cs.sub};">
          <td style="padding:6px 10px 6px 24px;font-size:11px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};">${p.name}${p.size ? ` (${p.size})` : ''}</td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;font-weight:700;">${p.qty != null ? p.qty : ''}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${p.rate.toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${r2d((p.qty || 0) * p.rate).toLocaleString()}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${taxPct(p.gstRate)}</td>
          <td style="padding:6px 10px;text-align:right;border-bottom:1px solid ${BORDER};font-size:11px;">${rs(p.amount)}</td>
        </tr>`;
    });
  }

  return html;
}

// ─── HTML print generation ────────────────────────────────────────────────────
export function generatePrintHTML(type, data = {}, settings = {}) {
  const m = computeModel(type, data, settings);
  const { cfg, isQuotation, items, sections, totalQty, totalTax, subtotalAmt, taxableAmount,
    forwardingCharge, courierCharge, roundOff, taxRows, totalAmount, customer, docNumber, docDate, secondDate } = m;
  const ACCENT = cfg.theme.accent;
  const LIGHT = cfg.theme.light;
  const BORDER = cfg.theme.border;

  // Items table body — categorized or flat
  const itemRows = sections
    ? buildSectionRowsHtml(sections, ACCENT, LIGHT, BORDER, cfg)
    : items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : LIGHT}">
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">
          ${item.name}
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:center;">${item.perKit != null ? item.perKit : ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:center;"></td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:right;"></td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:right;">${HIDE_LINE_RATES ? '' : (item.rate || 0).toLocaleString()}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:right;">${cfg.show.taxRate ? `${item.taxRate || 0}%` : ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};font-size:11px;text-align:right;">${(item.amount || 0).toLocaleString()}</td>
      </tr>`).join('');

  const taxRowsHtml = taxRows.map(([label, val]) => `
    <tr>
      <td style="padding:4px 0;font-size:11px;color:#333;">${label}</td>
      <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${r2d(val).toLocaleString()}</td>
    </tr>`).join('');

  const showTermsBlock = cfg.show.terms && cfg.terms;
  const showSignBlock = cfg.show.sign;

  const termsColHtml = showTermsBlock ? `
    <div style="flex:1;padding:12px 16px;${showSignBlock ? `border-right:1px solid ${BORDER};` : ''}font-size:11px;">
      <div style="font-weight:800;color:${ACCENT};margin-bottom:6px;letter-spacing:1px;">TERMS &amp; CONDITIONS</div>
      <div style="color:#444;line-height:1.7;white-space:pre-wrap;">${cfg.terms}</div>
    </div>` : (showSignBlock ? `<div style="flex:1;"></div>` : '');

  const signColHtml = showSignBlock ? `
    <div style="flex:0 0 220px;padding:16px 20px;text-align:center;">
      <div style="display:inline-block;min-width:180px;">
        ${cfg.signatureUrl
          ? `<img src="${cfg.signatureUrl}" alt="signature" style="height:56px;max-width:180px;object-fit:contain;margin-bottom:8px;"/>`
          : `<div style="height:56px;border-bottom:1px solid #ccc;margin-bottom:8px;"></div>`}
        <div style="font-weight:700;font-size:11px;color:#333;">AUTHORISED SIGNATORY FOR</div>
        <div style="font-weight:700;font-size:11px;color:${ACCENT};">${cfg.company.name}</div>
      </div>
    </div>` : '';

  const termsSignBlockHtml = (showTermsBlock || showSignBlock) ? `
    <div style="display:flex;border-bottom:1px solid ${BORDER};">
      ${termsColHtml}
      ${signColHtml}
    </div>` : '';

  const bankHtml = cfg.show.bank ? `
      <div style="flex:1;padding:12px 16px;border-right:1px solid ${BORDER};">
        <div style="font-weight:800;color:${ACCENT};margin-bottom:8px;font-size:11px;letter-spacing:1px;">BANK DETAILS</div>
        <div style="display:flex;gap:14px;align-items:flex-start;">
          <table style="border-collapse:collapse;flex:1;">
            <tr><td style="padding:3px 0;font-weight:600;font-size:11px;width:100px;color:#555;">Name:</td><td style="padding:3px 0;font-size:11px;">${cfg.bank.name}</td></tr>
            <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">IFSC Code:</td><td style="padding:3px 0;font-size:11px;">${cfg.bank.ifsc}</td></tr>
            <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">Account No:</td><td style="padding:3px 0;font-size:11px;">${cfg.bank.account}</td></tr>
            <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">Bank:</td><td style="padding:3px 0;font-size:11px;">${cfg.bank.bank}</td></tr>
            ${cfg.bank.upiId ? `<tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">UPI ID:</td><td style="padding:3px 0;font-size:11px;">${cfg.bank.upiId}</td></tr>` : ''}
          </table>
          ${cfg.bank.qrCodeUrl ? `
          <div style="flex-shrink:0;text-align:center;">
            <img src="${cfg.bank.qrCodeUrl}" alt="UPI QR" style="width:72px;height:72px;object-fit:contain;border:1px solid ${BORDER};border-radius:4px;padding:2px;"/>
            <div style="font-size:9px;color:#888;margin-top:2px;">Scan to Pay</div>
          </div>` : ''}
        </div>
      </div>` : '';

  const footerHtml = cfg.footer ? `
    <div style="padding:12px 16px;text-align:center;font-size:11px;color:#666;border-top:1px solid ${BORDER};">${cfg.footer}</div>` : '';

  const logoHtml = cfg.show.logo ? `
      <div style="width:64px;height:64px;border:2px solid ${ACCENT};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
        <img src="${cfg.logoUrl}" alt="logo" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=font-size:18px;font-weight:900;color:${ACCENT}>HNG</span>'"/>
      </div>` : '';

  // Forwarding charge row (only if non-zero)
  const fwdRow = `
    <tr>
      <td style="padding:4px 0;font-size:11px;color:#333;">FORWARDING CHARGE</td>
      <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${forwardingCharge.toLocaleString()}</td>
    </tr>`;

  // Courier Charge / Round Off rows — shown directly below Forwarding Charge, only when
  // a value was recorded via Billing's Record Payment In (Courier Charge / Round Off).
  const courierRow = courierCharge > 0 ? `
    <tr>
      <td style="padding:4px 0;font-size:11px;color:#333;">COURIER CHARGE</td>
      <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${courierCharge.toLocaleString()}</td>
    </tr>` : '';
  const roundOffRow = roundOff !== 0 ? `
    <tr>
      <td style="padding:4px 0;font-size:11px;color:#333;">ROUND OFF</td>
      <td style="padding:4px 0;font-size:11px;text-align:right;">${roundOff < 0 ? '&minus; ' : ''}&#x20B9;${Math.abs(roundOff).toLocaleString()}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${isQuotation ? 'Quotation' : 'Tax Invoice'} - ${docNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${cfg.font}; font-size: 12px; color: #000; background: #fff; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 10mm; }
    }
    .doc { max-width: 820px; margin: 0 auto; border: 1px solid ${BORDER}; }
    .btn-bar { max-width: 820px; margin: 0 auto 12px; display: flex; gap: 10px; justify-content: flex-end; padding: 10px 0; }
    button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .btn-print { background: ${ACCENT}; color: #fff; }
    .btn-close { background: #f0f0f0; color: #333; }
  </style>
</head>
<body style="padding:20px;">
  <div class="btn-bar no-print">
    <button class="btn-close" onclick="window.close()">Close</button>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="doc">
    <!-- Header -->
    <div style="display:flex;padding:16px 20px;border-bottom:2px solid ${ACCENT};align-items:flex-start;gap:16px;">
      ${logoHtml}
      <div style="flex:1;">
        <div style="font-size:22px;font-weight:900;color:${ACCENT};letter-spacing:0.5px;">${cfg.company.name}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#333;line-height:1.8;">
        <div>${cfg.company.address}</div>
        <div>Mobile: ${cfg.company.mobile}${cfg.show.gstin ? ` &nbsp;&nbsp; GSTIN: ${cfg.company.gstin}` : ''}</div>
        <div>PAN Number: ${cfg.company.pan}</div>
        <div>Email: ${cfg.company.email}</div>
      </div>
    </div>

    <!-- Document type bar -->
    <div style="background:${ACCENT};padding:9px 20px;">
      <span style="color:#fff;font-weight:900;font-size:15px;letter-spacing:4px;">${isQuotation ? 'QUOTATION' : 'TAX INVOICE'}</span>
    </div>

    <!-- Document details row -->
    <div style="display:flex;padding:10px 20px;border-bottom:1px solid ${BORDER};background:${LIGHT};gap:40px;font-size:11px;flex-wrap:wrap;">
      <div><strong>${isQuotation ? 'Quotation No.:' : 'Invoice No.:'}</strong> ${docNumber}</div>
      <div><strong>${isQuotation ? 'Quotation Date:' : 'Invoice Date:'}</strong> ${docDate}</div>
      ${isQuotation && secondDate ? `<div><strong>Expected Delivery Date:</strong> ${secondDate}</div>` : ''}
    </div>

    <!-- Bill To / Ship To -->
    <div style="display:flex;border-bottom:1px solid ${BORDER};">
      <div style="flex:1;padding:12px 16px;border-right:1px solid ${BORDER};">
        <div style="font-weight:800;color:${ACCENT};margin-bottom:7px;font-size:11px;letter-spacing:1px;">BILL TO</div>
        <div style="font-weight:700;font-size:12px;margin-bottom:5px;">${customer.name}</div>
        <div style="color:#444;font-size:11px;line-height:1.8;">
          <div>${customer.address}</div>
          <div>${customer.city}</div>
          <div>Mobile: ${customer.mobile}</div>
          ${cfg.show.gstin ? `<div>GSTIN: ${customer.gstin}</div>` : ''}
          <div>Place of Supply: ${customer.placeOfSupply}</div>
        </div>
      </div>
      <div style="flex:1;padding:12px 16px;">
        <div style="font-weight:800;color:${ACCENT};margin-bottom:7px;font-size:11px;letter-spacing:1px;">SHIP TO</div>
        <div style="font-weight:700;font-size:12px;margin-bottom:5px;">${customer.name}</div>
        <div style="color:#444;font-size:11px;line-height:1.8;">
          <div>${customer.address}</div>
          <div>${customer.city}</div>
        </div>
      </div>
    </div>

    <!-- Items table -->
    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid ${BORDER};">
      <thead>
        <tr>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:left;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:26%;">ITEMS</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:center;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:9%;">PER KIT</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:center;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:10%;">OVERALL QTY</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:11%;">UNIT PRICE</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:11%;">RATE</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:10%;">TAX</th>
          <th style="background:${ACCENT};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;width:19%;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr style="background:${LIGHT};">
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-weight:800;color:${ACCENT};font-size:11px;">SUBTOTAL</td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-weight:700;text-align:right;font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};font-weight:800;color:${ACCENT};text-align:right;font-size:11px;">&#x20B9;${r2d(subtotalAmt).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bank Details + Summary -->
    <div style="display:flex;border-bottom:1px solid ${BORDER};">
      ${bankHtml}
      <div style="flex:1;padding:12px 16px;">
        <table style="border-collapse:collapse;width:100%;">
          ${fwdRow}
          ${courierRow}
          ${roundOffRow}
          <tr>
            <td style="padding:4px 0;font-size:11px;color:#333;">Taxable Amount</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${r2d(taxableAmount).toLocaleString()}</td>
          </tr>
          ${taxRowsHtml}
          <tr style="border-top:1px solid ${BORDER};">
            <td style="padding:7px 0 4px;font-size:12px;font-weight:800;color:${ACCENT};">Total Amount</td>
            <td style="padding:7px 0 4px;font-size:12px;font-weight:800;color:${ACCENT};text-align:right;">&#x20B9;${r2d(totalAmount).toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Total in words -->
    <div style="padding:10px 16px;border-bottom:1px solid ${BORDER};font-size:11px;">
      <span style="font-weight:700;">Total Amount (in words): </span>
      <span style="font-style:italic;">${toWords(totalAmount)}</span>
    </div>

    ${termsSignBlockHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}

// ─── React preview component ──────────────────────────────────────────────────
function SectionRowsReact({ sections, ACCENT, LIGHT, BORDER, cfg, td }) {
  const rs = (v) => `₹${r2d(v).toLocaleString()}`;
  const taxPct = (g) => (cfg.show.taxRate ? `${Number(g) || 0}%` : '');
  // 1-kit price = kit price + included-products price, i.e. section total ÷ kit count.
  const persKitRate = sections.persKitCount > 0 ? r2d(sections.persKitTotal / sections.persKitCount) : 0;
  const sepKitRate = sections.sepKitCount > 0 ? r2d(sections.separateKit / sections.sepKitCount) : 0;

  return (
    <>
      {/* ── Section A: Personalized Kit ── */}
      {sections.personalized > 0 && (() => {
        const cs = CAT_STYLE.personalized;
        const kitLabel = sections.persKitCount
          ? ` — ${sections.persKitCount} kit${sections.persKitCount !== 1 ? 's' : ''}`
          : '';
        return (
          <>
            <tr>
              <td colSpan={3} style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, letterSpacing: 0.5, borderRight: `1px solid ${BORDER}` }}>
                A &nbsp;—&nbsp; PERSONALIZED KIT{kitLabel}
              </td>
              <td style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, textAlign: 'right' }}>
                {persKitRate > 0 ? persKitRate.toLocaleString() : ''}
              </td>
              <td style={{ ...td, background: cs.header }} />
              <td style={{ ...td, background: cs.header }} />
              <td style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, textAlign: 'right', borderRight: 'none' }}>
                {rs(sections.personalized)}
              </td>
            </tr>
            {sections.persKits.map((ko, i) => {
              const qty = ko.qty;
              const price = ko.price;
              const hasComponents = ko.components && ko.components.length > 0;
              return (
                <React.Fragment key={`pkit-${i}`}>
                  {hasComponents ? (
                    <tr style={{ background: cs.sub }}>
                      <td colSpan={6} style={{ ...td, paddingLeft: 24, fontWeight: 700, color: '#333', borderRight: `1px solid ${BORDER}` }}>
                        {ko.kitName || '—'} × {qty} kit{qty !== 1 ? 's' : ''}{!HIDE_LINE_RATES && price > 0 ? ` — ${rs(price)}/kit` : ''}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
                    </tr>
                  ) : (
                    <tr style={{ background: cs.sub }}>
                      <td style={{ ...td, paddingLeft: 24 }}>{ko.kitName || '—'} × {qty} kit{qty !== 1 ? 's' : ''}</td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'right' }}>{HIDE_LINE_RATES ? '' : (price > 0 ? price.toLocaleString() : '')}</td>
                      <td style={{ ...td, textAlign: 'right' }}></td>
                      <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
                    </tr>
                  )}
                  {hasComponents && ko.components.map((comp, j) => (
                    <tr key={`pkit-${i}-comp-${j}`} style={{ background: '#fff' }}>
                      <td style={{ ...td, paddingLeft: 40, fontSize: 10, color: '#555' }}>–&nbsp;{comp.name}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555', fontWeight: 700 }}>{comp.perKit != null ? comp.perKit : ''}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555' }}></td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555' }}></td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555' }}>{HIDE_LINE_RATES ? '' : comp.rate.toLocaleString()}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555' }}>{taxPct(comp.gstRate != null ? comp.gstRate : comp.gst)}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555', borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(comp.amount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {sections.persProdRows.map((p, i) => (
              <tr key={`pprod-${i}`} style={{ background: '#fff' }}>
                <td style={{ ...td, paddingLeft: 24 }}>{p.name}</td>
                <td style={{ ...td, textAlign: 'center' }}>{p.perKit != null ? p.perKit : ''}</td>
                <td style={{ ...td, textAlign: 'center' }}></td>
                <td style={{ ...td, textAlign: 'center' }}></td>
                <td style={{ ...td, textAlign: 'right' }}>{HIDE_LINE_RATES ? '' : p.rate.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right' }}>{taxPct(p.gstRate)}</td>
                <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(p.amount)}</td>
              </tr>
            ))}
            <tr style={{ background: cs.header }}>
              <td colSpan={6} style={{ ...td, color: cs.text, fontWeight: 700, fontStyle: 'italic', borderRight: `1px solid ${BORDER}` }}>Total Personalized (A)</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: cs.text, borderRight: 'none' }}>{rs(sections.personalized)}</td>
            </tr>
          </>
        );
      })()}

      {/* ── Section B: Separate Kit ── */}
      {sections.separateKit > 0 && (() => {
        const cs = CAT_STYLE.separate_kit;
        return (
          <>
            <tr>
              <td colSpan={3} style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, borderRight: `1px solid ${BORDER}` }}>
                B &nbsp;—&nbsp; SEPARATE KIT{sections.sepKitCount ? ` — ${sections.sepKitCount} kit${sections.sepKitCount !== 1 ? 's' : ''}` : ''}
              </td>
              <td style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, textAlign: 'right' }}>
                {sepKitRate > 0 ? sepKitRate.toLocaleString() : ''}
              </td>
              <td style={{ ...td, background: cs.header }} />
              <td style={{ ...td, background: cs.header }} />
              <td style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, textAlign: 'right', borderRight: 'none' }}>
                {rs(sections.separateKit)}
              </td>
            </tr>
            {sections.sepKits.map((ko, i) => {
              const qty = ko.qty;
              const price = ko.price;
              const hasComponents = ko.components && ko.components.length > 0;
              return (
                <React.Fragment key={`skit-${i}`}>
                  {hasComponents ? (
                    <tr style={{ background: cs.sub }}>
                      <td colSpan={6} style={{ ...td, paddingLeft: 24, fontWeight: 700, color: '#333', borderRight: `1px solid ${BORDER}` }}>
                        {ko.kitName || '—'} × {qty} kit{qty !== 1 ? 's' : ''}{!HIDE_LINE_RATES && price > 0 ? ` — ${rs(price)}/kit` : ''}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
                    </tr>
                  ) : (
                    <tr style={{ background: cs.sub }}>
                      <td style={{ ...td, paddingLeft: 24 }}>{ko.kitName || '—'} × {qty} kit{qty !== 1 ? 's' : ''}</td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'center' }}></td>
                      <td style={{ ...td, textAlign: 'right' }}>{HIDE_LINE_RATES ? '' : (price > 0 ? price.toLocaleString() : '')}</td>
                      <td style={{ ...td, textAlign: 'right' }}></td>
                      <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(ko.kitTotal)}</td>
                    </tr>
                  )}
                  {hasComponents && ko.components.map((comp, j) => (
                    <tr key={`skit-${i}-comp-${j}`} style={{ background: '#fff' }}>
                      <td style={{ ...td, paddingLeft: 40, fontSize: 10, color: '#555' }}>–&nbsp;{comp.name}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555', fontWeight: 700 }}>{comp.perKit != null ? comp.perKit : ''}</td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555' }}></td>
                      <td style={{ ...td, textAlign: 'center', fontSize: 10, color: '#555' }}></td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555' }}>{HIDE_LINE_RATES ? '' : comp.rate.toLocaleString()}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555' }}>{taxPct(comp.gstRate != null ? comp.gstRate : comp.gst)}</td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 10, color: '#555', borderRight: 'none' }}>{HIDE_LINE_AMOUNTS ? '' : rs(comp.amount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </>
        );
      })()}

      {/* ── Section C: Separate Products ── */}
      {sections.separateProduct > 0 && (() => {
        const cs = CAT_STYLE.separate_product;
        return (
          <>
            <tr>
              <td colSpan={6} style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, borderRight: `1px solid ${BORDER}` }}>
                C &nbsp;—&nbsp; SEPARATE PRODUCTS
              </td>
              <td style={{ ...td, background: cs.header, color: cs.text, fontWeight: 800, fontSize: 11, textAlign: 'right', borderRight: 'none' }}>
              </td>
            </tr>
            {sections.sepProdRows.map((p, i) => (
              <tr key={`sprod-${i}`} style={{ background: cs.sub }}>
                <td style={{ ...td, paddingLeft: 24 }}>{p.name}{p.size ? ` (${p.size})` : ''}</td>
                <td style={{ ...td, textAlign: 'center' }}></td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{p.qty != null ? p.qty : ''}</td>
                <td style={{ ...td, textAlign: 'right' }}>{p.rate.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r2d((p.qty || 0) * p.rate).toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right' }}>{taxPct(p.gstRate)}</td>
                <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{rs(p.amount)}</td>
              </tr>
            ))}
          </>
        );
      })()}
    </>
  );
}

export default function DocumentTemplate({ type = 'quotation', data = {}, settings = {} }) {
  const m = computeModel(type, data, settings);
  const { cfg, isQuotation, items, sections, totalQty, totalTax, subtotalAmt, taxableAmount,
    forwardingCharge, courierCharge, roundOff, taxRows, totalAmount, customer, docNumber, docDate, secondDate } = m;
  const ACCENT = cfg.theme.accent;
  const LIGHT = cfg.theme.light;
  const BORDER = cfg.theme.border;

  const th = {
    background: ACCENT, color: '#fff', padding: '9px 10px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.2)',
  };
  const td = {
    padding: '7px 10px', borderBottom: `1px solid ${BORDER}`,
    borderRight: `1px solid ${BORDER}`, fontSize: 11, verticalAlign: 'top',
  };

  return (
    <div style={{ fontFamily: cfg.font, fontSize: 12, color: '#000', background: '#fff', border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '16px 20px', borderBottom: `2px solid ${ACCENT}`, alignItems: 'flex-start', gap: 16 }}>
        {cfg.show.logo && (
          <div style={{ width: 64, height: 64, border: `2px solid ${ACCENT}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <img
              src={cfg.logoUrl} alt="logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = `<span style="font-size:18px;font-weight:900;color:${ACCENT}">HNG</span>`; }}
            />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT, letterSpacing: 0.5 }}>{cfg.company.name}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#333', lineHeight: 1.8 }}>
          <div>{cfg.company.address}</div>
          <div>Mobile: {cfg.company.mobile}{cfg.show.gstin ? <> &nbsp;&nbsp; GSTIN: {cfg.company.gstin}</> : null}</div>
          <div>PAN Number: {cfg.company.pan}</div>
          <div>Email: {cfg.company.email}</div>
        </div>
      </div>

      {/* Document type bar */}
      <div style={{ background: ACCENT, padding: '9px 20px' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 4 }}>
          {isQuotation ? 'QUOTATION' : 'TAX INVOICE'}
        </span>
      </div>

      {/* Document details row */}
      <div style={{ display: 'flex', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: LIGHT, gap: 40, fontSize: 11, flexWrap: 'wrap' }}>
        <div><strong>{isQuotation ? 'Quotation No.:' : 'Invoice No.:'}</strong> {docNumber}</div>
        <div><strong>{isQuotation ? 'Quotation Date:' : 'Invoice Date:'}</strong> {docDate}</div>
        {isQuotation && secondDate && <div><strong>Expected Delivery Date:</strong> {secondDate}</div>}
      </div>

      {/* Bill To / Ship To */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 800, color: ACCENT, marginBottom: 7, fontSize: 11, letterSpacing: 1 }}>BILL TO</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{customer.name}</div>
          <div style={{ color: '#444', fontSize: 11, lineHeight: 1.8 }}>
            <div>{customer.address}</div>
            <div>{customer.city}</div>
            <div>Mobile: {customer.mobile}</div>
            {cfg.show.gstin && <div>GSTIN: {customer.gstin}</div>}
            <div>Place of Supply: {customer.placeOfSupply}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ fontWeight: 800, color: ACCENT, marginBottom: 7, fontSize: 11, letterSpacing: 1 }}>SHIP TO</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{customer.name}</div>
          <div style={{ color: '#444', fontSize: 11, lineHeight: 1.8 }}>
            <div>{customer.address}</div>
            <div>{customer.city}</div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `1px solid ${BORDER}` }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '26%' }}>ITEMS</th>
            <th style={{ ...th, width: '9%', textAlign: 'center' }}>PER KIT</th>
            <th style={{ ...th, width: '10%', textAlign: 'center' }}>OVERALL QTY</th>
            <th style={{ ...th, width: '11%', textAlign: 'right' }}>UNIT PRICE</th>
            <th style={{ ...th, width: '11%', textAlign: 'right' }}>RATE</th>
            <th style={{ ...th, width: '10%', textAlign: 'right' }}>TAX</th>
            <th style={{ ...th, width: '19%', textAlign: 'right', borderRight: 'none' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {sections ? (
            <SectionRowsReact sections={sections} ACCENT={ACCENT} LIGHT={LIGHT} BORDER={BORDER} cfg={cfg} td={td} />
          ) : (
            items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : LIGHT }}>
                <td style={td}>
                  {item.name}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>{item.perKit != null ? item.perKit : ''}</td>
                <td style={{ ...td, textAlign: 'center' }}></td>
                <td style={{ ...td, textAlign: 'right' }}></td>
                <td style={{ ...td, textAlign: 'right' }}>{HIDE_LINE_RATES ? '' : (item.rate || 0).toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {cfg.show.taxRate ? `${item.taxRate || 0}%` : ''}
                </td>
                <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{(item.amount || 0).toLocaleString()}</td>
              </tr>
            ))
          )}
          <tr style={{ background: LIGHT }}>
            <td style={{ ...td, fontWeight: 800, color: ACCENT }}>SUBTOTAL</td>
            <td style={td} />
            <td style={td} />
            <td style={td} />
            <td style={td} />
            {/* TAX total hidden (cell kept for column alignment) */}
            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }} />
            <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: ACCENT, borderRight: 'none' }}>₹{r2d(subtotalAmt).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Bank Details + Summary */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        {cfg.show.bank && (
          <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 800, color: ACCENT, marginBottom: 8, fontSize: 11, letterSpacing: 1 }}>BANK DETAILS</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <table style={{ borderCollapse: 'collapse', flex: 1 }}>
                <tbody>
                  {[['Name:', cfg.bank.name], ['IFSC Code:', cfg.bank.ifsc], ['Account No:', cfg.bank.account], ['Bank:', cfg.bank.bank], ...(cfg.bank.upiId ? [['UPI ID:', cfg.bank.upiId]] : [])].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '3px 0', fontWeight: 600, fontSize: 11, width: 96, color: '#555' }}>{k}</td>
                      <td style={{ padding: '3px 0', fontSize: 11 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cfg.bank.qrCodeUrl && (
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <img src={cfg.bank.qrCodeUrl} alt="UPI QR" style={{ width: 72, height: 72, objectFit: 'contain', border: `1px solid ${BORDER}`, borderRadius: 4, padding: 2 }} />
                  <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>Scan to Pay</div>
                </div>
              )}
            </div>
          </div>
        )}
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>FORWARDING CHARGE</td>
                <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>₹{r2d(forwardingCharge).toLocaleString()}</td>
              </tr>
              {courierCharge > 0 && (
                <tr>
                  <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>COURIER CHARGE</td>
                  <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>₹{courierCharge.toLocaleString()}</td>
                </tr>
              )}
              {roundOff !== 0 && (
                <tr>
                  <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>ROUND OFF</td>
                  <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>{roundOff < 0 ? '− ' : ''}₹{Math.abs(roundOff).toLocaleString()}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>Taxable Amount</td>
                <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>₹{r2d(taxableAmount).toLocaleString()}</td>
              </tr>
              {taxRows.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>{k}</td>
                  <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>₹{r2d(v).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: '7px 0 4px', fontSize: 12, fontWeight: 800, color: ACCENT }}>Total Amount</td>
                <td style={{ padding: '7px 0 4px', fontSize: 12, fontWeight: 800, color: ACCENT, textAlign: 'right' }}>₹{r2d(totalAmount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Total in words */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
        <strong>Total Amount (in words): </strong>
        <em>{toWords(totalAmount)}</em>
      </div>

      {/* Terms & Conditions (left) + Authorized signatory (right) */}
      {(() => {
        const showTermsBlock = cfg.show.terms && cfg.terms;
        const showSignBlock = cfg.show.sign;
        if (!showTermsBlock && !showSignBlock) return null;
        return (
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
            {showTermsBlock ? (
              <div style={{ flex: 1, padding: '12px 16px', borderRight: showSignBlock ? `1px solid ${BORDER}` : 'none', fontSize: 11 }}>
                <div style={{ fontWeight: 800, color: ACCENT, marginBottom: 6, letterSpacing: 1 }}>TERMS &amp; CONDITIONS</div>
                <div style={{ color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{cfg.terms}</div>
              </div>
            ) : (showSignBlock ? <div style={{ flex: 1 }} /> : null)}
            {showSignBlock && (
              <div style={{ flex: '0 0 220px', padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', minWidth: 180 }}>
                  {cfg.signatureUrl ? (
                    <img src={cfg.signatureUrl} alt="signature" style={{ height: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 8 }} />
                  ) : (
                    <div style={{ height: 56, borderBottom: '1px solid #ccc', marginBottom: 8 }} />
                  )}
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#333' }}>AUTHORISED SIGNATORY FOR</div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: ACCENT }}>{cfg.company.name}</div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Footer note */}
      {cfg.footer && (
        <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, color: '#666', borderTop: `1px solid ${BORDER}` }}>
          {cfg.footer}
        </div>
      )}
    </div>
  );
}
