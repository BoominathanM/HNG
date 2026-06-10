const WhatsAppConfig = require('../models/WhatsAppConfig');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const { decrypt } = require('../utils/encryption');

const DEFAULT_BACKEND_URL = 'https://backend.askeva.io';
const DEFAULT_SEND_PATH = '/v1/message/send-message';

const TEMPLATE_LIST_PATHS = [
  '/v1/message/template-list',
  '/v1/message/templates',
  '/v1/templates',
];

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function buildUrl(base, path, params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  return `${base}${path}?${qs}`;
}

/**
 * Extract templates array from any known response shape.
 * Covers common field names returned by various WhatsApp API providers.
 */
function extractTemplates(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // Try all common field names used by different providers
  const candidates = [
    data.templates, data.data?.templates, data.data,
    data.waba_templates, data.messageTemplates, data.template_list,
    data.result, data.results, data.items, data.list,
    data.rows, data.records, data.content, data.payload,
    data.templateList, data.response?.templates, data.response,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }

  // Last resort: if data has a single array property, use it
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

function extractPaginationMeta(data) {
  if (!data) return { total: 0, pages: 0, page: 1, hasMore: false, nextCursor: null };
  const pg = data.pagination || data.meta || data.paging || {};
  return {
    total:      Number(data.total    || data.totalCount || data.total_count || data.count || pg.total     || 0),
    pages:      Number(data.pages    || data.totalPages || data.total_pages || pg.pages   || pg.totalPages || 0),
    page:       Number(data.page     || data.currentPage || data.current_page || pg.page  || 1),
    hasMore:    Boolean(data.hasMore || data.has_more || data.hasNext || data.next || pg.hasMore),
    nextCursor: data.nextCursor || data.next_cursor || data.cursor || data.nextToken || data.next_token || null,
  };
}

async function httpGet(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  const data = await res.json().catch(() => null);
  return { ok: true, status: res.status, data };
}

/**
 * Fetch ALL templates from one external endpoint.
 *
 * Strategy (in order):
 *  1. One-shot with huge limit  → if API returns everything at once, done
 *  2. Page-based loop           → page=1,2,3… + offset/skip for APIs using either
 *  3. Cursor-based              → uses nextCursor/nextToken returned in each response
 *  4. Dedup guard               → stops if a page returns only already-seen items
 *
 * Returns: array of raw template objects, or null if the endpoint is unreachable.
 */
async function fetchAllTemplatesFromExternalApi(base, path, token) {
  const PAGE_SIZE  = 100;
  const MAX_PAGES  = 500;  // safety: up to 50 000 templates

  const all      = [];
  const seenKeys = new Set();

  // ── Strategy 1: Try a huge one-shot request first ──────────────────────────
  // Many APIs will honour a large limit and return everything at once.
  const bigUrl = buildUrl(base, path, { token, limit: 10000 });
  const bigRes = await httpGet(bigUrl).catch(() => ({ ok: false }));

  if (bigRes.ok && bigRes.data) {
    const bigBatch = extractTemplates(bigRes.data);
    const meta     = extractPaginationMeta(bigRes.data);

    if (bigBatch.length > 0) {
      bigBatch.forEach((t) => {
        const key = String(t.name || t.id || '').trim();
        if (key) { seenKeys.add(key); all.push(t); }
      });

      // If total is unknown or we have it all — return immediately
      if (!meta.total || all.length >= meta.total) return all;

      // If meta says there's more, fall through to page loop below
      // (this handles APIs that cap at e.g. 100 even when limit=10000)
      if (all.length >= meta.total) return all;
    }
  }

  // Reset for page loop (start fresh — some APIs may have returned partial data above)
  all.length = 0;
  seenKeys.clear();
  let nextCursor = null;

  // ── Strategy 2 & 3: Page + offset + cursor loop ────────────────────────────
  for (let page = 1; page <= MAX_PAGES; page++) {
    const offset = (page - 1) * PAGE_SIZE;

    // Build params: send every common pagination param simultaneously.
    // The API will use whichever it recognises and ignore the rest.
    const params = {
      token,
      limit:     PAGE_SIZE,
      count:     PAGE_SIZE,
      page_size: PAGE_SIZE,
      pageSize:  PAGE_SIZE,
      page,
      pageNo:    page,
      pageNumber: page,
      pageIndex: page - 1,   // some APIs are 0-based
      offset,
      skip:      offset,
      start:     offset,
      from:      offset,
    };
    if (nextCursor) {
      params.cursor     = nextCursor;
      params.nextCursor = nextCursor;
      params.nextToken  = nextCursor;
      params.after      = nextCursor;
    }

    let result;
    try {
      result = await httpGet(buildUrl(base, path, params));
    } catch {
      if (page === 1) return null;
      break;
    }

    if (!result.ok) {
      if (page === 1) return null;
      break;
    }
    if (!result.data) {
      if (page === 1) return null;
      break;
    }

    const batch = extractTemplates(result.data);
    if (batch.length === 0) break; // empty → done

    // De-duplicate
    const newItems = [];
    for (const t of batch) {
      const key = String(t.name || t.id || '').trim();
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      newItems.push(t);
    }

    // All duplicates → API doesn't advance, stop
    if (newItems.length === 0) break;

    all.push(...newItems);

    const meta = extractPaginationMeta(result.data);

    // Metadata stop signals
    if (meta.total  && all.length >= meta.total)  break;
    if (meta.pages  && page       >= meta.pages)  break;
    if (meta.hasMore === false && !meta.nextCursor) break;

    // Cursor advance
    nextCursor = meta.nextCursor || null;

    // Short batch → last page
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

function extractVariables(components = []) {
  const vars = new Set();
  for (const comp of components) {
    const text = comp?.text || comp?.body?.text || comp?.example?.body_text?.[0]?.join(' ') || '';
    const matches = String(text).match(/\{\{\d+\}\}/g) || [];
    matches.forEach((m) => vars.add(m));
    if (Array.isArray(comp?.parameters)) {
      comp.parameters.forEach((_, i) => vars.add(`{{${i + 1}}}`));
    }
    if (Array.isArray(comp?.example?.body_text?.[0])) {
      comp.example.body_text[0].forEach((_, i) => vars.add(`{{${i + 1}}}`));
    }
  }
  return [...vars];
}

async function testWhatsAppConnection({ backendUrl, apiToken }) {
  const base = normalizeUrl(backendUrl || DEFAULT_BACKEND_URL);

  for (const path of TEMPLATE_LIST_PATHS) {
    try {
      const url = buildUrl(base, path, { token: apiToken, limit: 10, page: 1 });
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 401 || res.status === 403) {
        return { success: false, error: 'Invalid API token — unauthorized', statusCode: res.status };
      }

      if (res.ok) {
        const data  = await res.json().catch(() => ({}));
        const meta  = extractPaginationMeta(data);
        const batch = extractTemplates(data);
        return {
          success: true,
          endpoint: path,
          templateCount: meta.total || batch.length,
        };
      }
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        return { success: false, error: 'Connection timed out — check your backend URL' };
      }
    }
  }

  return { success: false, error: 'Could not reach the WhatsApp backend. Verify the backend URL and try again.' };
}

function buildTemplateOp(t) {
  const name = String(t.name || t.id || '').trim() || 'unnamed';
  return {
    updateOne: {
      filter: { name },
      update: {
        $set: {
          name,
          language:   t.language   || 'en',
          status:     (t.status    || 'APPROVED').toUpperCase(),
          category:   (t.category  || 'UTILITY').toUpperCase(),
          components: Array.isArray(t.components) ? t.components : [],
          variables:  extractVariables(Array.isArray(t.components) ? t.components : []),
          rawPayload: t,
          lastSyncedAt: new Date(),
          externalId: String(t.id  || t._id || t.name || ''),
        },
      },
      upsert: true,
    },
  };
}

async function syncTemplatesFromConfig(config) {
  if (!config?.backendUrl || !config?.apiToken) {
    return { success: false, skipped: true, error: 'No WhatsApp configuration found' };
  }

  const base  = normalizeUrl(config.backendUrl);
  const token = decrypt(config.apiToken);

  const ordered = config.lastTemplatesListEndpoint
    ? [config.lastTemplatesListEndpoint, ...TEMPLATE_LIST_PATHS.filter((p) => p !== config.lastTemplatesListEndpoint)]
    : TEMPLATE_LIST_PATHS;

  for (const path of ordered) {
    const allTemplates = await fetchAllTemplatesFromExternalApi(base, path, token);
    if (allTemplates === null) continue;

    if (allTemplates.length > 0) {
      const ops = allTemplates.map(buildTemplateOp);
      await WhatsAppTemplate.bulkWrite(ops);
    }

    await WhatsAppConfig.findByIdAndUpdate(config._id, {
      lastSyncedAt:              new Date(),
      lastSyncCount:             allTemplates.length,
      syncStatus:                'success',
      lastTemplatesListEndpoint: path,
    });

    return { success: true, synced: allTemplates.length, endpoint: path };
  }

  await WhatsAppConfig.findByIdAndUpdate(config._id, { syncStatus: 'error' });
  return { success: false, error: 'Template sync failed — no valid endpoint responded' };
}

async function syncTemplatesByStoredConfig() {
  const config = await WhatsAppConfig.findOne().select('+apiToken');
  if (!config) return { success: false, skipped: true, error: 'No configuration found' };
  return syncTemplatesFromConfig(config);
}

async function sendMessage({ to, templateName, language = 'en', parameters = {}, components = null }) {
  const config = await WhatsAppConfig.findOne().select('+apiToken');
  if (!config?.backendUrl || !config?.apiToken) {
    return { success: false, error: 'WhatsApp not configured' };
  }

  const base     = normalizeUrl(config.backendUrl);
  const token    = decrypt(config.apiToken);
  const sendPath = config.sendTemplatePath || DEFAULT_SEND_PATH;
  const url      = buildUrl(base, sendPath, { token });

  let msgComponents = components;
  if (!msgComponents) {
    const vals = Object.values(parameters);
    msgComponents = vals.length
      ? [{ type: 'body', parameters: vals.map((v) => ({ type: 'text', text: String(v) })) }]
      : [];
  }

  const payload = {
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: msgComponents,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success:    false,
        error:      responseData?.message || responseData?.error || `HTTP ${res.status}`,
        statusCode: res.status,
        payload:    responseData,
      };
    }

    return {
      success:   true,
      messageId: responseData?.messages?.[0]?.id || responseData?.id || responseData?.messageId || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Default events ────────────────────────────────────────────────────────────

const DEFAULT_EVENTS = [
  { key: 'order-placed',      label: 'Order Placed',      description: 'Triggered when a new order is placed',            availableFields: ['orderCode', 'customerName', 'totalAmount', 'deliveryDate', 'companyName'] },
  { key: 'order-shipped',     label: 'Order Shipped',     description: 'Triggered when an order is dispatched',           availableFields: ['orderCode', 'customerName', 'lrNumber', 'trackingUrl', 'companyName'] },
  { key: 'order-delivered',   label: 'Order Delivered',   description: 'Triggered when an order is delivered',            availableFields: ['orderCode', 'customerName', 'deliveryDate', 'companyName'] },
  { key: 'payment-due',       label: 'Payment Due',       description: 'Triggered when a payment is due',                 availableFields: ['customerName', 'amount', 'dueDate', 'invoiceNumber', 'companyName'] },
  { key: 'payment-received',  label: 'Payment Received',  description: 'Triggered when payment is received',              availableFields: ['customerName', 'amount', 'paymentDate', 'invoiceNumber', 'companyName'] },
  { key: 'new-customer',      label: 'New Customer',      description: 'Triggered when a new customer is added',          availableFields: ['customerName', 'email', 'phone', 'companyName'] },
  { key: 'low-stock-alert',   label: 'Low Stock Alert',   description: 'Triggered when inventory falls below minimum',    availableFields: ['productName', 'currentStock', 'minimumStock', 'companyName'] },
  { key: 'dispatch-update',   label: 'Dispatch Update',   description: 'Triggered on dispatch confirmation or LR upload', availableFields: ['orderCode', 'customerName', 'lrNumber', 'trackingUrl', 'companyName'] },
  { key: 'generate-report',   label: 'Generate Report',   description: 'Triggered when a scheduled report is generated',  availableFields: ['reportDate', 'totalOrders', 'totalRevenue', 'companyName'] },
];

const ACCOUNT_VERIFICATION_EVENT = {
  key: 'account-verification', label: 'Account Verification',
  description: 'OTP sent to accounts user. Use an AUTHENTICATION template.',
  availableFields: ['otp', 'customerName', 'companyName'], isActive: true,
};

async function ensureDefaultWhatsAppEvents() {
  for (const ev of DEFAULT_EVENTS) {
    await WhatsAppEvent.findOneAndUpdate({ key: ev.key }, { $setOnInsert: ev }, { upsert: true });
  }
}

async function ensureAccountVerificationEvent() {
  await WhatsAppEvent.findOneAndUpdate(
    { key: ACCOUNT_VERIFICATION_EVENT.key },
    { $setOnInsert: ACCOUNT_VERIFICATION_EVENT },
    { upsert: true }
  );
}

async function ensureGenerateReportMappingFromBackup() {}

module.exports = {
  DEFAULT_BACKEND_URL,
  normalizeUrl,
  testWhatsAppConnection,
  syncTemplatesFromConfig,
  syncTemplatesByStoredConfig,
  sendMessage,
  ensureDefaultWhatsAppEvents,
  ensureAccountVerificationEvent,
  ensureGenerateReportMappingFromBackup,
};
