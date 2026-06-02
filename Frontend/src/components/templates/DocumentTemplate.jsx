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

const SAMPLE_ITEMS = [
  { name: 'ROOM FRESHNER LAVENDER 5 LITRE', qty: 5, unit: 'PCS', rate: 680, taxRate: 18, taxAmt: 612, amount: 4012 },
  { name: 'ROOM FRESHNER BRUTE 5 LITRE', qty: 1, unit: 'PCS', rate: 1500, taxRate: 18, taxAmt: 270, amount: 1770 },
  { name: 'TOILET BOWL CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 500, taxRate: 18, taxAmt: 450, amount: 2950 },
  { name: 'FLOOR CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 450, taxRate: 18, taxAmt: 405, amount: 2655 },
  { name: 'GLASS CLEANER 5 LITRE', qty: 5, unit: 'PCS', rate: 650, taxRate: 25, taxAmt: 585, amount: 3835 },
  { name: 'TOILET CLEANER FLOOR 5LITRE', qty: 5, unit: 'PCS', rate: 650, taxRate: 25, taxAmt: 585, amount: 3835 },
  { name: 'STAINLESS STEEL POLISH GRADE 2 (5LITRE)', qty: 3, unit: 'PCS', rate: 2500, taxRate: 0, taxAmt: 0, amount: 7500 },
];

const DARK_GREEN = '#2d5016';
const LIGHT_GREEN = '#f5f9f0';
const BORDER = '#c8d9b8';

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

export function generatePrintHTML(type, data) {
  const isQuotation = type === 'quotation';
  const items = (data.items || SAMPLE_ITEMS).filter(Boolean);
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalTax = items.reduce((s, i) => s + (i.taxAmt || 0), 0);
  const subtotalAmt = items.reduce((s, i) => s + (i.amount || 0), 0);
  const taxableAmount = data.taxableAmount || (subtotalAmt - totalTax);
  const forwardingCharge = data.forwardingCharge !== undefined ? data.forwardingCharge : 330;
  const cgst = data.cgst !== undefined ? data.cgst : Math.round(taxableAmount * 9) / 100;
  const sgst = data.sgst !== undefined ? data.sgst : Math.round(taxableAmount * 9) / 100;
  const totalAmount = data.total || (taxableAmount + cgst + sgst + forwardingCharge);

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
  const secondDate = isQuotation
    ? (data.expiryDate || '15/05/2026')
    : (data.dueDate || '15/05/2026');

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_GREEN}">
      <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;">${item.name}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:center;">${item.qty} ${item.unit}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:right;">${item.rate.toLocaleString()}</td>
      <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;text-align:right;">${item.taxAmt.toLocaleString()}<br/><span style="color:#666;font-size:10px;">(${item.taxRate}%)</span></td>
      <td style="padding:7px 10px;border-bottom:1px solid ${BORDER};font-size:11px;text-align:right;">${item.amount.toLocaleString()}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${isQuotation ? 'Quotation' : 'Tax Invoice'} - ${docNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 10mm; }
    }
    .doc { max-width: 820px; margin: 0 auto; border: 1px solid ${BORDER}; }
    .btn-bar { max-width: 820px; margin: 0 auto 12px; display: flex; gap: 10px; justify-content: flex-end; padding: 10px 0; }
    button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .btn-print { background: #2d5016; color: #fff; }
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
    <div style="display:flex;padding:16px 20px;border-bottom:2px solid ${DARK_GREEN};align-items:flex-start;gap:16px;">
      <div style="width:64px;height:64px;border:2px solid ${DARK_GREEN};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
        <img src="/hng logo new.png" alt="HNG" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=font-size:18px;font-weight:900;color:${DARK_GREEN}>HNG</span>'"/>
      </div>
      <div style="flex:1;">
        <div style="font-size:22px;font-weight:900;color:${DARK_GREEN};letter-spacing:0.5px;">${COMPANY.name}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#333;line-height:1.8;">
        <div>${COMPANY.address}</div>
        <div>Mobile: ${COMPANY.mobile} &nbsp;&nbsp; GSTIN: ${COMPANY.gstin}</div>
        <div>PAN Number: ${COMPANY.pan}</div>
        <div>Email: ${COMPANY.email}</div>
      </div>
    </div>

    <!-- Document type bar -->
    <div style="background:${DARK_GREEN};padding:9px 20px;">
      <span style="color:#fff;font-weight:900;font-size:15px;letter-spacing:4px;">${isQuotation ? 'QUOTATION' : 'TAX INVOICE'}</span>
    </div>

    <!-- Document details row -->
    <div style="display:flex;padding:10px 20px;border-bottom:1px solid ${BORDER};background:${LIGHT_GREEN};gap:40px;font-size:11px;flex-wrap:wrap;">
      <div><strong>${isQuotation ? 'Quotation No.:' : 'Invoice No.:'}</strong> ${docNumber}</div>
      <div><strong>${isQuotation ? 'Quotation Date:' : 'Invoice Date:'}</strong> ${docDate}</div>
      <div><strong>${isQuotation ? 'Expiry Date:' : 'Due Date:'}</strong> ${secondDate}</div>
    </div>

    <!-- Bill To / Ship To -->
    <div style="display:flex;border-bottom:1px solid ${BORDER};">
      <div style="flex:1;padding:12px 16px;border-right:1px solid ${BORDER};">
        <div style="font-weight:800;color:${DARK_GREEN};margin-bottom:7px;font-size:11px;letter-spacing:1px;">BILL TO</div>
        <div style="font-weight:700;font-size:12px;margin-bottom:5px;">${customer.name}</div>
        <div style="color:#444;font-size:11px;line-height:1.8;">
          <div>${customer.address}</div>
          <div>${customer.city}</div>
          <div>Mobile: ${customer.mobile}</div>
          <div>GSTIN: ${customer.gstin}</div>
          <div>PAN Number: ${customer.pan}</div>
          <div>Place of Supply: ${customer.placeOfSupply}</div>
        </div>
      </div>
      <div style="flex:1;padding:12px 16px;">
        <div style="font-weight:800;color:${DARK_GREEN};margin-bottom:7px;font-size:11px;letter-spacing:1px;">SHIP TO</div>
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
          <th style="background:${DARK_GREEN};color:#fff;padding:9px 10px;text-align:left;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:44%;">ITEMS</th>
          <th style="background:${DARK_GREEN};color:#fff;padding:9px 10px;text-align:center;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:11%;">QTY.</th>
          <th style="background:${DARK_GREEN};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:12%;">RATE</th>
          <th style="background:${DARK_GREEN};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);width:14%;">TAX</th>
          <th style="background:${DARK_GREEN};color:#fff;padding:9px 10px;text-align:right;font-size:11px;font-weight:700;width:19%;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr style="background:${LIGHT_GREEN};">
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-weight:800;color:${DARK_GREEN};font-size:11px;">SUBTOTAL</td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-weight:700;text-align:center;font-size:11px;">${totalQty}</td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-size:11px;"></td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};border-right:1px solid ${BORDER};font-weight:700;text-align:right;font-size:11px;">&#x20B9;${totalTax.toLocaleString()}</td>
          <td style="padding:9px 10px;border-bottom:1px solid ${BORDER};font-weight:800;color:${DARK_GREEN};text-align:right;font-size:11px;">&#x20B9;${subtotalAmt.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bank Details + Summary -->
    <div style="display:flex;border-bottom:1px solid ${BORDER};">
      <div style="flex:1;padding:12px 16px;border-right:1px solid ${BORDER};">
        <div style="font-weight:800;color:${DARK_GREEN};margin-bottom:8px;font-size:11px;letter-spacing:1px;">BANK DETAILS</div>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:3px 0;font-weight:600;font-size:11px;width:100px;color:#555;">Name:</td><td style="padding:3px 0;font-size:11px;">${BANK.name}</td></tr>
          <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">IFSC Code:</td><td style="padding:3px 0;font-size:11px;">${BANK.ifsc}</td></tr>
          <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">Account No:</td><td style="padding:3px 0;font-size:11px;">${BANK.account}</td></tr>
          <tr><td style="padding:3px 0;font-weight:600;font-size:11px;color:#555;">Bank:</td><td style="padding:3px 0;font-size:11px;">${BANK.bank}</td></tr>
        </table>
      </div>
      <div style="flex:1;padding:12px 16px;">
        <table style="border-collapse:collapse;width:100%;">
          <tr>
            <td style="padding:4px 0;font-size:11px;color:#333;">FORWARDING CHARGE</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${forwardingCharge.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:11px;color:#333;">Taxable Amount</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${taxableAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:11px;color:#333;">CGST @9%</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${cgst.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:11px;color:#333;">SGST @9%</td>
            <td style="padding:4px 0;font-size:11px;text-align:right;">&#x20B9;${sgst.toLocaleString()}</td>
          </tr>
          <tr style="border-top:1px solid ${BORDER};">
            <td style="padding:7px 0 4px;font-size:12px;font-weight:800;color:${DARK_GREEN};">Total Amount</td>
            <td style="padding:7px 0 4px;font-size:12px;font-weight:800;color:${DARK_GREEN};text-align:right;">&#x20B9;${totalAmount.toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Total in words -->
    <div style="padding:10px 16px;border-bottom:1px solid ${BORDER};font-size:11px;">
      <span style="font-weight:700;">Total Amount (in words): </span>
      <span style="font-style:italic;">${toWords(totalAmount)}</span>
    </div>

    <!-- Authorized signatory -->
    <div style="display:flex;justify-content:flex-end;padding:24px 28px 20px;">
      <div style="text-align:center;min-width:180px;">
        <div style="height:56px;border-bottom:1px solid #ccc;margin-bottom:8px;"></div>
        <div style="font-weight:700;font-size:11px;color:#333;">AUTHORISED SIGNATORY FOR</div>
        <div style="font-weight:700;font-size:11px;color:${DARK_GREEN};">${COMPANY.name}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function DocumentTemplate({ type = 'quotation', data = {} }) {
  const isQuotation = type === 'quotation';
  const items = (data.items || SAMPLE_ITEMS).filter(Boolean);
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalTax = items.reduce((s, i) => s + (i.taxAmt || 0), 0);
  const subtotalAmt = items.reduce((s, i) => s + (i.amount || 0), 0);
  const taxableAmount = data.taxableAmount || (subtotalAmt - totalTax);
  const forwardingCharge = data.forwardingCharge !== undefined ? data.forwardingCharge : 330;
  const cgst = data.cgst !== undefined ? data.cgst : Math.round(taxableAmount * 9) / 100;
  const sgst = data.sgst !== undefined ? data.sgst : Math.round(taxableAmount * 9) / 100;
  const totalAmount = data.total || (taxableAmount + cgst + sgst + forwardingCharge);

  const customer = data.customer || {
    name: data.client || 'SDA SHOPPEE',
    address: '12, Ground Floor, Freshmint, Nageswaran North Street, Kumbakonam',
    city: 'Thanjavur, Tamil Nadu, 612001',
    mobile: '9952808787',
    gstin: '33AKHPD6797L1ZO',
    pan: 'AKHPD6797L',
    placeOfSupply: 'Tamil Nadu',
  };

  const docNumber = isQuotation
    ? (data.quot || data.number || '2122')
    : (data.inv || data.number || 'INV-001');
  const docDate = data.date || '08/05/2026';
  const secondDate = isQuotation
    ? (data.expiryDate || '15/05/2026')
    : (data.dueDate || '15/05/2026');

  const th = {
    background: DARK_GREEN,
    color: '#fff',
    padding: '9px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    borderRight: '1px solid rgba(255,255,255,0.2)',
  };

  const td = {
    padding: '7px 10px',
    borderBottom: `1px solid ${BORDER}`,
    borderRight: `1px solid ${BORDER}`,
    fontSize: 11,
    verticalAlign: 'top',
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#000', background: '#fff', border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div style={{ display: 'flex', padding: '16px 20px', borderBottom: `2px solid ${DARK_GREEN}`, alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 64, height: 64, border: `2px solid ${DARK_GREEN}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          <img
            src="/hng logo new.png"
            alt="HNG"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = `<span style="font-size:18px;font-weight:900;color:${DARK_GREEN}">HNG</span>`; }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: DARK_GREEN, letterSpacing: 0.5 }}>{COMPANY.name}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#333', lineHeight: 1.8 }}>
          <div>{COMPANY.address}</div>
          <div>Mobile: {COMPANY.mobile} &nbsp;&nbsp; GSTIN: {COMPANY.gstin}</div>
          <div>PAN Number: {COMPANY.pan}</div>
          <div>Email: {COMPANY.email}</div>
        </div>
      </div>

      {/* Document type bar */}
      <div style={{ background: DARK_GREEN, padding: '9px 20px' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 4 }}>
          {isQuotation ? 'QUOTATION' : 'TAX INVOICE'}
        </span>
      </div>

      {/* Document details row */}
      <div style={{ display: 'flex', padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, background: LIGHT_GREEN, gap: 40, fontSize: 11, flexWrap: 'wrap' }}>
        <div><strong>{isQuotation ? 'Quotation No.:' : 'Invoice No.:'}</strong> {docNumber}</div>
        <div><strong>{isQuotation ? 'Quotation Date:' : 'Invoice Date:'}</strong> {docDate}</div>
        <div><strong>{isQuotation ? 'Expiry Date:' : 'Due Date:'}</strong> {secondDate}</div>
      </div>

      {/* Bill To / Ship To */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 800, color: DARK_GREEN, marginBottom: 7, fontSize: 11, letterSpacing: 1 }}>BILL TO</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{customer.name}</div>
          <div style={{ color: '#444', fontSize: 11, lineHeight: 1.8 }}>
            <div>{customer.address}</div>
            <div>{customer.city}</div>
            <div>Mobile: {customer.mobile}</div>
            <div>GSTIN: {customer.gstin}</div>
            <div>PAN Number: {customer.pan}</div>
            <div>Place of Supply: {customer.placeOfSupply}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ fontWeight: 800, color: DARK_GREEN, marginBottom: 7, fontSize: 11, letterSpacing: 1 }}>SHIP TO</div>
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
            <th style={{ ...th, width: '44%' }}>ITEMS</th>
            <th style={{ ...th, width: '11%', textAlign: 'center' }}>QTY.</th>
            <th style={{ ...th, width: '12%', textAlign: 'right' }}>RATE</th>
            <th style={{ ...th, width: '14%', textAlign: 'right' }}>TAX</th>
            <th style={{ ...th, width: '19%', textAlign: 'right', borderRight: 'none' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : LIGHT_GREEN }}>
              <td style={td}>{item.name}</td>
              <td style={{ ...td, textAlign: 'center' }}>{item.qty} {item.unit}</td>
              <td style={{ ...td, textAlign: 'right' }}>{item.rate.toLocaleString()}</td>
              <td style={{ ...td, textAlign: 'right' }}>
                {item.taxAmt.toLocaleString()}
                <div style={{ color: '#666', fontSize: 10 }}>({item.taxRate}%)</div>
              </td>
              <td style={{ ...td, textAlign: 'right', borderRight: 'none' }}>{item.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr style={{ background: LIGHT_GREEN }}>
            <td style={{ ...td, fontWeight: 800, color: DARK_GREEN }}>SUBTOTAL</td>
            <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{totalQty}</td>
            <td style={td} />
            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>₹{totalTax.toLocaleString()}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: DARK_GREEN, borderRight: 'none' }}>₹{subtotalAmt.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Bank Details + Summary */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 800, color: DARK_GREEN, marginBottom: 8, fontSize: 11, letterSpacing: 1 }}>BANK DETAILS</div>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {[['Name:', BANK.name], ['IFSC Code:', BANK.ifsc], ['Account No:', BANK.account], ['Bank:', BANK.bank]].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 0', fontWeight: 600, fontSize: 11, width: 96, color: '#555' }}>{k}</td>
                  <td style={{ padding: '3px 0', fontSize: 11 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {[
                ['FORWARDING CHARGE', `₹${forwardingCharge.toLocaleString()}`],
                ['Taxable Amount', `₹${taxableAmount.toLocaleString()}`],
                ['CGST @9%', `₹${cgst.toLocaleString()}`],
                ['SGST @9%', `₹${sgst.toLocaleString()}`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '4px 0', fontSize: 11, color: '#333' }}>{k}</td>
                  <td style={{ padding: '4px 0', fontSize: 11, textAlign: 'right' }}>{v}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: '7px 0 4px', fontSize: 12, fontWeight: 800, color: DARK_GREEN }}>Total Amount</td>
                <td style={{ padding: '7px 0 4px', fontSize: 12, fontWeight: 800, color: DARK_GREEN, textAlign: 'right' }}>₹{totalAmount.toLocaleString()}</td>
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

      {/* Authorized signatory */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 28px 20px' }}>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div style={{ height: 56, borderBottom: '1px solid #ccc', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 11, color: '#333' }}>AUTHORISED SIGNATORY FOR</div>
          <div style={{ fontWeight: 700, fontSize: 11, color: DARK_GREEN }}>{COMPANY.name}</div>
        </div>
      </div>
    </div>
  );
}
