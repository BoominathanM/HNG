const AiConfig = require('../models/AiConfig');
const { encrypt, decrypt } = require('../utils/encryption');

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5.5';
const SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const SUPPORTED_PDF_MIMES = ['application/pdf'];

// ─── Config helpers ────────────────────────────────────────────────────────

// Singleton fetch — creates the doc on first access, same pattern as WhatsAppConfig usage.
async function getAiConfig({ withKey = false } = {}) {
  const query = AiConfig.findOne();
  if (withKey) query.select('+apiKey');
  let config = await query;
  if (!config) config = await AiConfig.create({});
  return config;
}

// DB key (decrypted) takes priority; .env is a deployment-level fallback — same
// override rule as GST's callGstApi/settings.controller.js.
function resolveApiKey(config) {
  const dbKey = config?.apiKey ? decrypt(config.apiKey) : '';
  return dbKey || process.env.OPENAI_API_KEY || '';
}

function encryptApiKey(rawKey) {
  return encrypt(rawKey);
}

// Invoices spell the same unit a dozen different ways ("Ltr", "LTRS", "liter", "L") —
// canonicalize the common ones to what Inventory's own unit fields/dropdowns expect
// (see InventoryItem.js unit, and the Litres/Kg options on bulk items) so a scanned
// line matches an existing item's unit instead of silently drifting into a near-duplicate.
const UNIT_ALIASES = {
  ltr: 'Litres', ltrs: 'Litres', liter: 'Litres', liters: 'Litres', litre: 'Litres', litres: 'Litres', l: 'Litres',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml', mls: 'ml',
  kg: 'Kg', kgs: 'Kg', kilogram: 'Kg', kilograms: 'Kg',
  gm: 'Gram', gms: 'Gram', gram: 'Gram', grams: 'Gram', g: 'Gram',
  pc: 'Pcs', pcs: 'Pcs', piece: 'Pcs', pieces: 'Pcs', no: 'Pcs', nos: 'Pcs', unit: 'Pcs', units: 'Pcs',
  box: 'Box', boxes: 'Box',
  btl: 'Bottle', bottle: 'Bottle', bottles: 'Bottle',
  pkt: 'Packet', packet: 'Packet', packets: 'Packet',
  dz: 'Dozen', dzn: 'Dozen', dozen: 'Dozen',
};
function normalizeUnit(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase().replace(/[.\s]/g, '');
  return UNIT_ALIASES[key] || trimmed;
}

// Some invoices print two phone numbers (landline + mobile, or owner + shop)
// separated by "|", "/", "," or "and"/"or". Only one number belongs in a
// single phone field, so keep just the first one the model returned.
function pickPrimaryPhone(raw) {
  if (!raw) return '';
  const first = String(raw).split(/\s*(?:\||\/|,|&|\band\b|\bor\b)\s*/i)[0];
  return first.trim();
}

// ─── OpenAI HTTP calls (native fetch — Node 18+, same approach as callGstApi) ──

async function openAiRequest(path, { apiKey, method = 'GET', body, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${OPENAI_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    let json;
    try { json = await res.json(); } catch { json = {}; }
    return { statusCode: res.status, body: json };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('OpenAI API request timed out');
    throw err;
  }
}

// Validates the key with a free/cheap call (list models) rather than spending
// tokens on a completion. Also checks the configured model id is actually
// available on this account and reports that as a soft warning.
async function testConnection(apiKey, model) {
  const result = await openAiRequest('/models', { apiKey, timeoutMs: 15000 });
  if (result.statusCode === 401) {
    throw Object.assign(new Error('Invalid API key — authentication rejected by OpenAI'), { statusCode: 401 });
  }
  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: 502 });
  }
  const modelIds = (result.body?.data || []).map((m) => m.id);
  const modelAvailable = model ? modelIds.includes(model) : true;
  return { modelIds, modelAvailable };
}

// ─── Quotation comparison ──────────────────────────────────────────────────

async function fetchAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file (HTTP ${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// Chat Completions content-part shape confirmed against OpenAI's file-inputs
// guide: images go through "image_url" with a data: URL; PDFs go through a
// "file" part with inline base64 file_data (no separate Files API upload needed).
function buildFileContentPart(file, base64) {
  if (SUPPORTED_IMAGE_MIMES.includes(file.mimetype)) {
    return { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64}` } };
  }
  if (SUPPORTED_PDF_MIMES.includes(file.mimetype)) {
    return {
      type: 'file',
      file: { filename: file.originalName || 'quotation.pdf', file_data: `data:application/pdf;base64,${base64}` },
    };
  }
  return null;
}

const SYSTEM_PROMPT = `You are a procurement analyst for a manufacturing company. You will be shown several supplier quotation/invoice documents submitted for the same purchase requirement. For EACH document (in the order given), extract:
- name: the supplier/vendor name printed on the document (if truly unreadable, use "Quotation <fileIndex+1>")
- price: the total quoted amount as a plain number (no currency symbols/commas). Assume INR unless another currency is clearly printed.
- delivery: the delivery/lead timeframe as a short phrase (e.g. "5-7 days")
- quality: exactly one of "Premium", "Standard", or "Basic", judged from stated specs/materials/certifications/brand (default "Standard" if unclear)
- terms: the payment terms as a short phrase (e.g. "50% advance, balance on delivery")
- score: an integer 0-100 reflecting overall procurement value — weigh price most heavily, then delivery speed, then payment-term favorability, then quality
- pros: 1-3 short bullet strings
- cons: 1-3 short bullet strings
- items: EVERY line item printed on that document, as { "name": "...", "qty": 0, "unitPrice": 0, "totalPrice": 0 }. Read the actual printed line-item name — do not invent items.

Then pick the single best document overall by index.

Then build a PRODUCT-WISE comparison across all documents, so the same physical product can be compared line-by-line even when each supplier names it slightly differently. Group line items from different documents together when they refer to the same real-world product — match on meaning, not just exact text: treat singular/plural, abbreviations, brand-vs-generic naming, and closely related/synonymous terms as the same product (for example "Soap" and "Bar" both refer to bar soap; "Ziplock" and "Pouch" both refer to a ziplock pouch). Do not merge genuinely different products just because they share a category. For each product group, report:
- productName: a clean, human-readable canonical name for the group
- aliases: the different names each supplier actually printed for this same product
- entries: one entry per document that quotes this product — { "fileIndex": 0, "matchedName": "the exact name that document used", "qty": 0, "unitPrice": 0, "totalPrice": 0 }. Omit documents that don't quote this product at all.
- bestFileIndex: the fileIndex with the best (lowest, all else equal) unit price for this specific product
- note: one short sentence on why that document is the best choice for this specific product (e.g. lowest unit price, or a meaningful tradeoff)

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{
  "suppliers": [
    { "fileIndex": 0, "name": "...", "price": 0, "currency": "INR", "delivery": "...", "quality": "Standard", "terms": "...", "score": 0, "pros": ["..."], "cons": ["..."], "items": [ { "name": "...", "qty": 0, "unitPrice": 0, "totalPrice": 0 } ] }
  ],
  "bestIndex": 0,
  "summary": "2-3 sentence explanation of why bestIndex was chosen over the others",
  "productComparison": [
    { "productName": "...", "aliases": ["..."], "entries": [ { "fileIndex": 0, "matchedName": "...", "qty": 0, "unitPrice": 0, "totalPrice": 0 } ], "bestFileIndex": 0, "note": "..." }
  ]
}
If a document is unreadable, blurry, or not actually a quotation, still include an entry for it with your best-effort guess, a low score, and "Could not fully read this document" as a con (and an empty items array).`;

// files: [{ url, originalName, mimetype }] — Cloudinary-hosted, already uploaded by multer.
async function compareQuotationFiles({ apiKey, model, files }) {
  const contentParts = [{ type: 'text', text: `Compare these ${files.length} supplier quotations for the same purchase and recommend the best one.` }];
  const usableFiles = [];
  const skipped = [];

  for (const file of files) {
    const isSupported = SUPPORTED_IMAGE_MIMES.includes(file.mimetype) || SUPPORTED_PDF_MIMES.includes(file.mimetype);
    if (!isSupported) { skipped.push(file); continue; }
    const base64 = await fetchAsBase64(file.url);
    const part = buildFileContentPart(file, base64);
    if (part) {
      contentParts.push(part);
      usableFiles.push(file);
    } else {
      skipped.push(file);
    }
  }

  if (usableFiles.length < 2) {
    throw Object.assign(
      new Error('At least 2 readable quotation files (PDF or image) are required to compare. Word/Excel files are not supported yet.'),
      { statusCode: 400 }
    );
  }

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    // Up to 5 large/multi-page quotation documents go into one vision request —
    // give OpenAI generous headroom rather than risk killing a call that was
    // still going to succeed.
    timeoutMs: 300000,
    body: {
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: contentParts },
      ],
      response_format: { type: 'json_object' },
      // Newer reasoning-oriented models (o-series, GPT-5.x) reject any explicit
      // temperature other than their default (1) — so it's simply omitted here
      // rather than hardcoding a value that only some models accept.
    },
  });

  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: result.statusCode === 401 ? 401 : 502 });
  }

  const raw = result.body?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse the AI response as JSON');
  }
  if (!Array.isArray(parsed.suppliers) || !parsed.suppliers.length) {
    throw new Error('AI response did not include any comparison results');
  }

  return { parsed, usableFiles, skipped };
}

// ─── Vendor/supplier document field extraction ─────────────────────────────

const VENDOR_EXTRACTION_PROMPT = `You are a data-entry assistant extracting vendor/supplier onboarding details from an uploaded document (invoice, letterhead, business card, GST certificate, cancelled cheque, or bank passbook page). Extract:
- name: the vendor/company name printed on the document
- phone: contact phone number (include country code if printed) — if more than one number is printed, return only the primary one (the first, or the one labelled mobile/contact), never both
- email: contact email address
- taxId: GST number or PAN, whichever is printed
- address: postal address (include city/state/pincode if available)
- bankDetails: { accountHolderName, accountNo, ifsc, bankName } — bank account details if this document shows any (cheque, passbook, invoice footer, etc.)
- notes: one short sentence of useful context about this vendor from the document (e.g. what they supply, payment terms mentioned), or "" if nothing relevant

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "name": "", "phone": "", "email": "", "taxId": "", "address": "", "bankDetails": { "accountHolderName": "", "accountNo": "", "ifsc": "", "bankName": "" }, "notes": "" }
If a field cannot be determined from the document, use an empty string for it — do not guess or invent data.`;

// file: { url, originalName, mimetype } — Cloudinary-hosted, already uploaded by multer.
async function extractVendorFields({ apiKey, model, file }) {
  const isSupported = SUPPORTED_IMAGE_MIMES.includes(file.mimetype) || SUPPORTED_PDF_MIMES.includes(file.mimetype);
  if (!isSupported) {
    throw Object.assign(new Error('Unsupported file type — upload a PDF or image (JPG/PNG/WEBP).'), { statusCode: 400 });
  }

  const base64 = await fetchAsBase64(file.url);
  const part = buildFileContentPart(file, base64);
  if (!part) throw Object.assign(new Error('Could not process this file type'), { statusCode: 400 });

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    // Scanned vendor documents can be large multi-page PDFs — generous headroom
    // so a slow-but-successful extraction isn't killed mid-flight.
    timeoutMs: 180000,
    body: {
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: VENDOR_EXTRACTION_PROMPT },
        { role: 'user', content: [{ type: 'text', text: 'Extract the vendor/supplier onboarding details from this document.' }, part] },
      ],
      response_format: { type: 'json_object' },
    },
  });

  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: result.statusCode === 401 ? 401 : 502 });
  }

  const raw = result.body?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse the AI response as JSON');
  }

  return {
    name: parsed.name || '',
    phone: pickPrimaryPhone(parsed.phone),
    email: parsed.email || '',
    taxId: parsed.taxId || '',
    address: parsed.address || '',
    bankDetails: {
      accountHolderName: parsed.bankDetails?.accountHolderName || '',
      accountNo: parsed.bankDetails?.accountNo || '',
      ifsc: parsed.bankDetails?.ifsc || '',
      bankName: parsed.bankDetails?.bankName || '',
    },
    notes: parsed.notes || '',
  };
}

// ─── Local purchase invoice field + line-item extraction ───────────────────

const INVOICE_EXTRACTION_PROMPT = `You are a data-entry assistant extracting details from a local purchase invoice/bill (image or PDF). Extract:
- invoiceNo: the invoice/bill number printed on the document
- invoiceDate: the invoice/bill date printed on the document, formatted YYYY-MM-DD if a date is present, else ""
- vendorName: the seller/vendor/shop name printed on the document
- vendorPhone: the vendor's contact phone number, if printed — if more than one number is printed, return only the primary one (the first, or the one labelled mobile/contact), never both
- vendorAddress: the vendor's postal address, if printed
- vendorGST: the vendor's GST number or PAN, if printed
- items: an array of every line item on the invoice, each as { name, qty, unit, rate, amount, hsn, gst } — name is the item/product description, qty is the quantity as a plain number, unit is the unit of measure exactly as printed for that line — read it from a dedicated Unit/UOM column if present, or from an abbreviation next to the quantity/description (e.g. "10 Ltr", "5 Kg", "500 ml", "20 Nos", "3 Box", "2 Dozen"); common units include Pcs, Nos, Kg, Gram, Litres, ml, Box, Bottle, Packet, Dozen, Set, Bag, Roll, Meter — only use "Pcs" as a last resort when the invoice truly gives no unit information anywhere on that line, never as a default guess for liquids/oils/weighed goods, rate is the per-unit price/rate printed for that line item as a plain number (no currency symbols/commas) — if no rate column is printed but amount and qty are, leave rate as 0 (it will be derived from amount/qty), amount is the line total for that item as a plain number (no currency symbols/commas), hsn is the HSN/SAC code printed for that line item if present else "", gst is the GST rate/tax percentage printed for that line item if present (e.g. "18%") else ""
- cgstAmount: the CGST amount printed on the invoice as a plain number (no currency symbols/commas), 0 if not printed
- sgstAmount: the SGST amount printed on the invoice as a plain number (no currency symbols/commas), 0 if not printed
- igstAmount: the IGST amount printed on the invoice as a plain number (no currency symbols/commas), 0 if not printed — invoices print either CGST+SGST (same state) or IGST (inter-state), never both
- gstAmount: the total GST/tax amount printed on the invoice as a plain number (no currency symbols/commas) — this should equal cgstAmount+sgstAmount+igstAmount; if the invoice only prints a single combined GST/tax total line (no CGST/SGST/IGST breakdown), put that value here and leave cgstAmount/sgstAmount/igstAmount as 0
- totalAmount: the grand total amount of the invoice as a plain number (no currency symbols/commas)

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "invoiceNo": "", "invoiceDate": "", "vendorName": "", "vendorPhone": "", "vendorAddress": "", "vendorGST": "", "items": [ { "name": "", "qty": 0, "unit": "Pcs", "rate": 0, "amount": 0, "hsn": "", "gst": "" } ], "cgstAmount": 0, "sgstAmount": 0, "igstAmount": 0, "gstAmount": 0, "totalAmount": 0 }
If a field cannot be determined from the document, use an empty string ("" ), 0 for numeric fields, or [] for items — do not guess or invent data.`;

// file: { url, originalName, mimetype } — Cloudinary-hosted, already uploaded by multer.
async function extractInvoiceFields({ apiKey, model, file }) {
  const isSupported = SUPPORTED_IMAGE_MIMES.includes(file.mimetype) || SUPPORTED_PDF_MIMES.includes(file.mimetype);
  if (!isSupported) {
    throw Object.assign(new Error('Unsupported file type — upload a PDF or image (JPG/PNG/WEBP).'), { statusCode: 400 });
  }

  const base64 = await fetchAsBase64(file.url);
  const part = buildFileContentPart(file, base64);
  if (!part) throw Object.assign(new Error('Could not process this file type'), { statusCode: 400 });

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    // Scanned invoices can be large multi-page PDFs — generous headroom so a
    // slow-but-successful extraction isn't killed mid-flight.
    timeoutMs: 180000,
    body: {
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: INVOICE_EXTRACTION_PROMPT },
        { role: 'user', content: [{ type: 'text', text: 'Extract the invoice, vendor, and line-item details from this local purchase document.' }, part] },
      ],
      response_format: { type: 'json_object' },
    },
  });

  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: result.statusCode === 401 ? 401 : 502 });
  }

  const raw = result.body?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse the AI response as JSON');
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((it) => {
          const qty = Number(it.qty) || 0;
          const amount = Number(it.amount) || 0;
          // Fall back to amount/qty when the invoice has no explicit per-unit rate column.
          const rate = Number(it.rate) || (qty ? amount / qty : 0);
          return {
            name: it.name || it.itemName || '',
            qty,
            unit: normalizeUnit(it.unit) || 'Pcs',
            rate,
            amount,
            hsn: it.hsn || it.hsnCode || '',
            gst: it.gst || it.gstRate || '',
          };
        })
        .filter((it) => it.name)
    : [];

  const cgstAmount = Number(parsed.cgstAmount) || 0;
  const sgstAmount = Number(parsed.sgstAmount) || 0;
  const igstAmount = Number(parsed.igstAmount) || 0;
  const breakdownTotal = cgstAmount + sgstAmount + igstAmount;
  // Prefer the CGST+SGST/IGST breakdown when the invoice printed one — more reliable than
  // trusting the AI's own addition on the single combined "gstAmount" line.
  const gstAmount = breakdownTotal > 0 ? breakdownTotal : (Number(parsed.gstAmount) || 0);

  return {
    invoiceNo: parsed.invoiceNo || '',
    invoiceDate: parsed.invoiceDate || '',
    vendorName: parsed.vendorName || '',
    vendorPhone: pickPrimaryPhone(parsed.vendorPhone),
    vendorAddress: parsed.vendorAddress || '',
    vendorGST: parsed.vendorGST || '',
    items,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    totalAmount: Number(parsed.totalAmount) || items.reduce((s, it) => s + it.amount, 0),
  };
}

// ─── Lorry Receipt (LR) field extraction ───────────────────────────────────

const LORRY_RECEIPT_EXTRACTION_PROMPT = `You are a data-entry assistant extracting details from a Lorry Receipt (LR) / transport consignment note (image or PDF). Extract:
- lrNumber: the LR/consignment/GC number printed on the document
- lrDate: the LR date, formatted YYYY-MM-DD if a date is present
- transportName: the transport company/carrier name printed on the document
- fromCity: the origin/consignor city
- toCity: the destination/consignee city
- weight: the total weight as printed (include unit, e.g. "45.5 Kg")
- freight: ONLY the freight/carriage line item, as printed (include currency symbol if shown) — do NOT include loading, unloading, hamali, GST, or any other charge line, and do NOT use the grand total for this field
- otherCharges: any charges printed separately from freight — loading, unloading, hamali, handling, etc. — summed together as a plain number (e.g. "78"), or "" if none are printed
- cgstAmount: the CGST amount printed on the LR as a plain number (e.g. "21.5"), or "" if not printed — an LR prints either CGST+SGST (intra-state transport) or IGST (inter-state transport), never both
- sgstAmount: the SGST amount printed on the LR as a plain number, or "" if not printed
- igstAmount: the IGST amount printed on the LR as a plain number, or "" if not printed
- gstAmount: the total GST/tax amount printed, as a plain number (e.g. "43") — this should equal cgstAmount+sgstAmount+igstAmount; if the LR only prints a single combined GST/tax line with no CGST/SGST/IGST breakdown, put that value here and leave cgstAmount/sgstAmount/igstAmount as ""; "" if no GST is printed at all
- totalAmount: the FINAL total/grand-total amount payable for this LR, as a plain number (e.g. "901"). Look for the bottom-most summary row on the charges block, usually labeled "Total", "Grand Total", "Net Amount", "To Pay", "Topay", or "Amount Payable" — this is normally freight + otherCharges + gstAmount added together, and is almost always a larger number than freight alone. If no such total row is printed anywhere on the document, compute it yourself as freight + otherCharges + gstAmount. Never leave this blank if freight is present — at minimum it should equal the freight amount.
- packages: the number of packages/boxes as printed (plain number as a string, e.g. "30")
- estimatedDelivery: the estimated delivery date, formatted YYYY-MM-DD if present, else ""
- trackingUrl: a web tracking URL/link printed on the document (e.g. next to a QR code or as "Track your shipment at ..."), else ""

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "lrNumber": "", "lrDate": "", "transportName": "", "fromCity": "", "toCity": "", "weight": "", "freight": "", "otherCharges": "", "cgstAmount": "", "sgstAmount": "", "igstAmount": "", "gstAmount": "", "totalAmount": "", "packages": "", "estimatedDelivery": "", "trackingUrl": "" }
If a field cannot be determined from the document, use an empty string for it — do not guess or invent data (totalAmount is the one exception: compute it from the other charge fields if it isn't printed directly).`;

// file: { url, originalName, mimetype } — Cloudinary-hosted, already uploaded by multer.
async function extractLorryReceiptFields({ apiKey, model, file }) {
  const isSupported = SUPPORTED_IMAGE_MIMES.includes(file.mimetype) || SUPPORTED_PDF_MIMES.includes(file.mimetype);
  if (!isSupported) {
    throw Object.assign(new Error('Unsupported file type — upload a PDF or image (JPG/PNG/WEBP).'), { statusCode: 400 });
  }

  const base64 = await fetchAsBase64(file.url);
  const part = buildFileContentPart(file, base64);
  if (!part) throw Object.assign(new Error('Could not process this file type'), { statusCode: 400 });

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    // Scanned LR documents can be large multi-page PDFs — generous headroom so a
    // slow-but-successful extraction isn't killed mid-flight.
    timeoutMs: 180000,
    body: {
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: LORRY_RECEIPT_EXTRACTION_PROMPT },
        { role: 'user', content: [{ type: 'text', text: 'Extract the lorry receipt / transport details from this document.' }, part] },
      ],
      response_format: { type: 'json_object' },
    },
  });

  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: result.statusCode === 401 ? 401 : 502 });
  }

  const raw = result.body?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse the AI response as JSON');
  }

  // Prefer the CGST+SGST/IGST breakdown when the LR printed one — same rule as
  // extractInvoiceFields — over trusting the AI's own addition on a single combined line.
  const toNum = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0;
  const cgstAmount = toNum(parsed.cgstAmount);
  const sgstAmount = toNum(parsed.sgstAmount);
  const igstAmount = toNum(parsed.igstAmount);
  const breakdownTotal = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;
  const gstAmount = breakdownTotal > 0
    ? String(breakdownTotal)
    : (parsed.gstAmount || '');

  return {
    lrNumber: parsed.lrNumber || '',
    lrDate: parsed.lrDate || '',
    transportName: parsed.transportName || '',
    fromCity: parsed.fromCity || '',
    toCity: parsed.toCity || '',
    weight: parsed.weight || '',
    freight: parsed.freight || '',
    otherCharges: parsed.otherCharges || '',
    // CGST/SGST/IGST split off the LR — inter-state transport prints IGST only, intra-state
    // prints CGST+SGST. Kept as plain numbers ('' when the LR printed no such line) so the
    // frontend can auto-fill a dedicated IGST field, same as the invoice/local-purchase scans.
    cgstAmount: cgstAmount ? String(cgstAmount) : '',
    sgstAmount: sgstAmount ? String(sgstAmount) : '',
    igstAmount: igstAmount ? String(igstAmount) : '',
    gstAmount,
    totalAmount: parsed.totalAmount || '',
    packages: parsed.packages || '',
    estimatedDelivery: parsed.estimatedDelivery || '',
    trackingUrl: parsed.trackingUrl || '',
  };
}

// ─── Task Management: Today's Checklist AI insight ──────────────────────────

const TASK_INSIGHT_PROMPT = `You are a production floor planner for a manufacturing company. You will be given: (1) a list of the factory's configured production task names (the actual, real steps its floor staff assign, e.g. "Filling", "Packing", "Sealing"), and (2) a JSON list of today's suggested checklist items, each with: orderCode, client (hotel), product, qty, isEmergency, stockReady (whether there's enough PRODUCT inventory to produce it), materialStockReady (whether the PACKING MATERIAL this item needs — box/ziplock/bottle/etc — has enough stock; materialShortfall gives {material, size, available, needed} when it's false), pending (the specific shortfall reasons present — "Inventory stock" and/or "Packing material" — empty when nothing's short), orderPlacedAt (when the order was placed).

Readiness on this checklist is driven by PRODUCT stock and PACKING-MATERIAL stock ONLY — every item listed is already clear to produce as far as design/artwork/sticker-printing status go, so do NOT mention design, artwork, sticker, or printing status anywhere in your answer; talk only about product stock, packing-material stock, and the actual production steps.

Write a short, prioritized action plan for the floor supervisor:
- Call out emergency orders first, then the oldest non-emergency orders (first placed, first processed).
- For items with enough product stock AND enough packing-material stock, recommend which of the factory's configured task names to assign first (e.g. "Filling" then "Packing") — pick only from the task name list given, never invent a step that isn't in it.
- Name specific orders/products blocked by insufficient PRODUCT stock, and separately name any blocked by insufficient PACKING-MATERIAL stock (cite the specifics from materialShortfall, e.g. "Box 15ml: only 3 in stock, 15 needed") — these are two different blockers, don't conflate them.
- If the same or a closely related product repeats across multiple orders/hotels, suggest batching them into one production run.
- Keep it concise and actionable: 3-6 short bullet points, each one sentence, plain language.

You must ALSO return a per-product breakdown so the recommendation can be shown directly on
that product's own card, not just in the summary text. For EVERY item in the checklist you
were given (use its orderCode and product exactly as given, one entry per item, do not skip
any), list which of the factory's configured task names should be assigned to it, in the
order they should be done (e.g. ["Filling", "Packing"]). Pick only from the given task name
vocabulary. If an item is blocked by product stock or packing-material stock, still list the
tasks it will need once ready — the checklist UI enforces the actual block separately, this
list is only the recommended ORDER of steps. If nothing in the vocabulary applies to an item,
return an empty array for it.

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{
  "insight": "• bullet one\\n• bullet two\\n...",
  "productTasks": [
    { "orderCode": "ORD-1", "product": "Soap", "tasks": ["Filling", "Packing"] }
  ]
}`;

// suggestions: the array returned by computeSuggestedTasks() in tasks.controller.js.
// taskNames: the factory's configured TaskTimeConfig names (e.g. ["Filling", "Packing"]).
async function generateTaskInsight({ apiKey, model, suggestions, taskNames }) {
  const compact = (suggestions || []).slice(0, 60).map((s) => ({
    orderCode: s.orderCode,
    client: s.client,
    product: s.product,
    qty: s.qty,
    isEmergency: !!(s.isUrgent || s.emergencyApproved),
    stockReady: s.stockReady,
    materialStockReady: s.materialStockReady,
    materialShortfall: s.materialShortfall || undefined,
    pending: s.pending,
    orderPlacedAt: s.orderCreatedAt,
  }));

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    timeoutMs: 120000,
    body: {
      model: model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: TASK_INSIGHT_PROMPT },
        {
          role: 'user',
          content: `Configured task names available to assign: ${JSON.stringify(taskNames || [])}\n\nToday's suggested tasks (${compact.length} items):\n${JSON.stringify(compact)}`,
        },
      ],
      response_format: { type: 'json_object' },
    },
  });

  if (result.statusCode !== 200) {
    const msg = result.body?.error?.message || `OpenAI API returned status ${result.statusCode}`;
    throw Object.assign(new Error(msg), { statusCode: result.statusCode === 401 ? 401 : 502 });
  }

  const raw = result.body?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse the AI response as JSON');
  }

  return {
    insight: parsed.insight || '',
    productTasks: Array.isArray(parsed.productTasks) ? parsed.productTasks : [],
  };
}

module.exports = {
  getAiConfig,
  resolveApiKey,
  encryptApiKey,
  testConnection,
  compareQuotationFiles,
  extractVendorFields,
  extractInvoiceFields,
  extractLorryReceiptFields,
  generateTaskInsight,
  normalizeUnit,
  DEFAULT_MODEL,
};
