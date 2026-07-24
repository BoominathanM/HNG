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
    timeoutMs: 120000,
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
- phone: contact phone number (include country code if printed)
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
    timeoutMs: 60000,
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
    phone: parsed.phone || '',
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
- vendorName: the seller/vendor/shop name printed on the document
- vendorPhone: the vendor's contact phone number, if printed
- vendorAddress: the vendor's postal address, if printed
- vendorGST: the vendor's GST number or PAN, if printed
- items: an array of every line item on the invoice, each as { name, qty, unit, amount } — name is the item/product description, qty is the quantity as a plain number, unit is the unit of measure (e.g. "Pcs", "Kg", "Box"), defaulting to "Pcs" if not stated, amount is the line total for that item as a plain number (no currency symbols/commas)
- totalAmount: the grand total amount of the invoice as a plain number (no currency symbols/commas)

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "invoiceNo": "", "vendorName": "", "vendorPhone": "", "vendorAddress": "", "vendorGST": "", "items": [ { "name": "", "qty": 0, "unit": "Pcs", "amount": 0 } ], "totalAmount": 0 }
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
    timeoutMs: 60000,
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
        .map((it) => ({
          name: it.name || it.itemName || '',
          qty: Number(it.qty) || 0,
          unit: it.unit || 'Pcs',
          amount: Number(it.amount) || 0,
        }))
        .filter((it) => it.name)
    : [];

  return {
    invoiceNo: parsed.invoiceNo || '',
    vendorName: parsed.vendorName || '',
    vendorPhone: parsed.vendorPhone || '',
    vendorAddress: parsed.vendorAddress || '',
    vendorGST: parsed.vendorGST || '',
    items,
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
- freight: the freight/amount charged, as printed (include currency symbol if shown)
- packages: the number of packages/boxes as printed (plain number as a string, e.g. "30")
- estimatedDelivery: the estimated delivery date, formatted YYYY-MM-DD if present, else ""
- trackingUrl: a web tracking URL/link printed on the document (e.g. next to a QR code or as "Track your shipment at ..."), else ""

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "lrNumber": "", "lrDate": "", "transportName": "", "fromCity": "", "toCity": "", "weight": "", "freight": "", "packages": "", "estimatedDelivery": "", "trackingUrl": "" }
If a field cannot be determined from the document, use an empty string for it — do not guess or invent data.`;

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
    timeoutMs: 60000,
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

  return {
    lrNumber: parsed.lrNumber || '',
    lrDate: parsed.lrDate || '',
    transportName: parsed.transportName || '',
    fromCity: parsed.fromCity || '',
    toCity: parsed.toCity || '',
    weight: parsed.weight || '',
    freight: parsed.freight || '',
    packages: parsed.packages || '',
    estimatedDelivery: parsed.estimatedDelivery || '',
    trackingUrl: parsed.trackingUrl || '',
  };
}

// ─── Task Management: Today's Checklist AI insight ──────────────────────────

const TASK_INSIGHT_PROMPT = `You are a production floor planner for a manufacturing company. You will be given: (1) a list of the factory's configured production task names (the actual, real steps its floor staff assign, e.g. "Filling", "Packing", "Sealing"), and (2) a JSON list of today's suggested checklist items, each with: orderCode, client (hotel), product, qty, isEmergency, stockReady (whether there's enough inventory to produce it), pending (non-empty only when stock is short), orderPlacedAt (when the order was placed).

Readiness on this checklist is driven ONLY by stock — every item listed is already clear to produce as far as design/artwork/printing go, so do NOT mention design, artwork, sticker, or printing status anywhere in your answer; talk only about stock and the actual production steps.

Write a short, prioritized action plan for the floor supervisor:
- Call out emergency orders first, then the oldest non-emergency orders (first placed, first processed).
- For items with enough stock, recommend which of the factory's configured task names to assign first (e.g. "Filling" then "Packing") — pick only from the task name list given, never invent a step that isn't in it.
- Name specific orders/products that are blocked by insufficient stock.
- If the same or a closely related product repeats across multiple orders/hotels, suggest batching them into one production run.
- Keep it concise and actionable: 3-6 short bullet points, each one sentence, plain language.

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{ "insight": "• bullet one\\n• bullet two\\n..." }`;

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
    pending: s.pending,
    orderPlacedAt: s.orderCreatedAt,
  }));

  const result = await openAiRequest('/chat/completions', {
    apiKey,
    method: 'POST',
    timeoutMs: 60000,
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

  return parsed.insight || '';
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
  DEFAULT_MODEL,
};
