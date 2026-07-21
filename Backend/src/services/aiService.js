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

Then pick the single best document overall by index.

Respond with ONLY a JSON object of this exact shape — no markdown, no commentary, no code fences:
{
  "suppliers": [
    { "fileIndex": 0, "name": "...", "price": 0, "currency": "INR", "delivery": "...", "quality": "Standard", "terms": "...", "score": 0, "pros": ["..."], "cons": ["..."] }
  ],
  "bestIndex": 0,
  "summary": "2-3 sentence explanation of why bestIndex was chosen over the others"
}
If a document is unreadable, blurry, or not actually a quotation, still include an entry for it with your best-effort guess, a low score, and "Could not fully read this document" as a con.`;

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

module.exports = {
  getAiConfig,
  resolveApiKey,
  encryptApiKey,
  testConnection,
  compareQuotationFiles,
  DEFAULT_MODEL,
};
