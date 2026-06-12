const User = require('../../models/User');
const CompanySettings = require('../../models/CompanySettings');
const Party = require('../../models/Party');
const DropdownOption = require('../../models/DropdownOption');
const DeletedRecord = require('../../models/DeletedRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');
const COUNTRY_CODES = require('./countrycodes');

// ─── GST API helper (uses native fetch — Node 18+) ───────────────────────────
const callGstApi = async (gstin, apiKey) => {
  const baseUrl = process.env.GST_API_URL || 'https://gstverify.co.in/api/v1/verify';
  const url = `${baseUrl}/${gstin}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'HNG-CRM/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    let body;
    try { body = await res.json(); } catch { body = {}; }
    return { statusCode: res.status, body };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('GST API request timed out after 15 s');
    throw err;
  }
};

// Normalize varied GST API response shapes to a consistent structure.
// gstverify.co.in (and other services) can return fields in multiple formats:
//   abbreviated (pradr/lgnm/stj) or readable (legalName/state/principalAddress)
// pradr itself may be a flat object OR have a nested .addr sub-object.
const normalizeGstResponse = (body) => {
  const raw = body?.data || body?.taxpayerInfo || body?.result || body;
  if (!raw || typeof raw !== 'object') return raw;

  // Resolve address: pradr.addr (nested) → pradr (flat) → principalAddress → address
  const pradr = raw.pradr;
  const address = (pradr?.addr && typeof pradr.addr === 'object')
    ? pradr.addr
    : (pradr && typeof pradr === 'object' ? pradr : null)
    || raw.principalAddress
    || raw.address
    || {};

  return {
    gstin:          raw.gstin        || raw.GSTIN,
    lgnm:           raw.lgnm         || raw.legalName       || raw.legal_name     || raw.LegalName,
    tradeNam:       raw.tradeNam     || raw.tradeName        || raw.trade_name     || raw.TradeName,
    sts:            raw.sts          || raw.status           || raw.gstStatus      || raw.Status,
    ctb:            raw.ctb          || raw.taxpayerType     || raw.taxPayerType   || raw.TaxpayerType,
    rgdt:           raw.rgdt         || raw.registrationDate || raw.registration_date,
    stj:            raw.stj          || raw.state            || raw.State,
    nba:            raw.nba          || raw.natureOfBusiness || [],  // Nature of business activities
    einvoiceStatus: raw.einvoiceStatus
                    || (raw.einvoiceEnabled === true  ? 'Yes'
                      : raw.einvoiceEnabled === false ? 'No'
                      : undefined),
    address,   // flat object: bnm/bno/flno/st/loc/dst/stcd/pncd
    _raw: raw, // full original payload — available for any extra fields
  };
};

exports.getCountryCodes = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: COUNTRY_CODES });
});

// ─── Dropdown Options (user-added select values) ─────────────────────────────
exports.getOptions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.field) filter.field = req.query.field;
  const options = await DropdownOption.find(filter).sort('value');
  res.status(200).json({ success: true, data: options });
});

exports.createOption = asyncHandler(async (req, res, next) => {
  const { field, value, label } = req.body;
  if (!field || !value) return next(new AppError('field and value are required', 400));
  // Upsert so duplicates are silently ignored instead of erroring.
  const option = await DropdownOption.findOneAndUpdate(
    { field, value },
    { field, value, label: label || value, createdBy: req.user._id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ success: true, data: option });
});

// ─── Public Branding (no auth — used by the login screen) ────────────────────
exports.getPublicBranding = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOne().select('logoUrl companyName');
  res.status(200).json({
    success: true,
    data: {
      logoUrl: settings?.logoUrl || null,
      companyName: settings?.companyName || 'Heal N Glow',
    },
  });
});

// ─── Company Settings ───────────────────────────────────────────────────────
exports.getCompanySettings = asyncHandler(async (req, res) => {
  let settings = await CompanySettings.findOne();
  if (!settings) settings = await CompanySettings.create({});
  res.status(200).json({ success: true, data: settings });
});

exports.updateCompanySettings = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOneAndUpdate(
    {},
    { ...req.body, updatedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.status(200).json({ success: true, data: settings });
});

exports.uploadLogo = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a file', 400));
  const logoUrl = req.file.path;
  const settings = await CompanySettings.findOneAndUpdate(
    {},
    { logoUrl },
    { new: true, upsert: true }
  );
  res.status(200).json({ success: true, logoUrl, data: settings });
});

// ─── User Management ────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ deletedAt: null }).sort('-createdAt');
  const data = users.map((u) => {
    const obj = u.toObject({ flattenMaps: true });
    delete obj.password;
    return obj;
  });
  res.status(200).json({ success: true, total: data.length, data });
});

exports.createUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, mobile, department, role, status, password, permissions, ...targets } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('Email already in use', 400));

  const user = await User.create({
    fullName, email, mobile, department, role,
    status: status || 'Active',
    password,
    permissions,
    ...targets,
    createdBy: req.user._id,
  });
  const out = user.toObject({ flattenMaps: true });
  delete out.password;
  res.status(201).json({ success: true, data: out });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const { password, permissions, tabAccess, ...rest } = req.body;
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));

  // Update simple scalar fields (fullName, email, mobile, role, status, department, targets…)
  Object.assign(user, rest);

  // Hash new password if provided
  if (password) user.password = password;

  // Permissions is a Mongoose Map — must use .set() per key, not direct assignment
  if (permissions && typeof permissions === 'object') {
    Object.entries(permissions).forEach(([mod, perm]) => {
      user.permissions.set(mod, perm);
    });
  }

  // tabAccess is Mixed — direct assignment requires markModified to trigger save
  if (tabAccess !== undefined) {
    user.tabAccess = tabAccess;
    user.markModified('tabAccess');
  }

  await user.save();
  const out = user.toObject({ flattenMaps: true });
  delete out.password;
  res.status(200).json({ success: true, data: out });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));
  user.deletedAt = Date.now();
  user.deletedBy = req.user._id;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'User deleted' });
});

exports.updatePermissions = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return next(new AppError('User not found', 404));
  const { permissions } = req.body;
  if (permissions) {
    Object.entries(permissions).forEach(([module, perm]) => {
      user.permissions.set(module, perm);
    });
  }
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: { permissions: Object.fromEntries(user.permissions) } });
});

// ─── Deleted Records (across all soft-deleted modules) ───────────────────────
// Map of restore "type" -> { model, module label, fields to surface, label resolver }
const DELETED_SOURCES = {
  parties: { model: 'Party', module: 'Parties & Ledger', label: (d) => d.name },
  leads: { model: 'Lead', module: 'Sales Team', label: (d) => d.hotelName || d.clientName },
  orders: { model: 'Order', module: 'Sales Team', label: (d) => d.orderCode || d.clientName },
  quotations: { model: 'Quotation', module: 'Sales Team', label: (d) => d.quotCode || d.clientName },
  inventory: { model: 'InventoryItem', module: 'Inventory', label: (d) => d.name },
  kits: { model: 'Kit', module: 'Inventory', label: (d) => d.name },
  vendors: { model: 'Vendor', module: 'Vendors', label: (d) => d.name },
  staff: { model: 'Staff', module: 'Staff Management', label: (d) => d.fullName || d.name },
  users: { model: 'User', module: 'Settings', label: (d) => d.fullName },
};

const getModel = (name) => {
  try { return require(`../../models/${name}`); } catch { return null; }
};

// Reconcile the DeletedRecord archive collection with the live soft-deleted docs
// across every module. This (a) backfills archive entries for records deleted
// before the collection existed, (b) refreshes their snapshot/deletedBy, and
// (c) drops archive entries whose original has since been restored. After this
// runs, the DeletedRecord collection is the single source of truth for the tab.
const syncDeletedRecords = async () => {
  const liveKeys = new Set();
  for (const [type, cfg] of Object.entries(DELETED_SOURCES)) {
    const Model = getModel(cfg.model);
    if (!Model) continue;
    const docs = await Model.find({ deletedAt: { $ne: null } })
      .populate({ path: 'deletedBy', select: 'fullName' })
      .lean();
    for (const d of docs) {
      liveKeys.add(`${type}:${d._id}`);
      await DeletedRecord.findOneAndUpdate(
        { type, refId: d._id },
        {
          type,
          module: cfg.module,
          name: cfg.label(d) || '—',
          refId: d._id,
          snapshot: d,
          deletedBy: d.deletedBy?._id || d.deletedBy || null,
          deletedAt: d.deletedAt || Date.now(),
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }
  // Purge archive entries whose original is no longer soft-deleted (restored).
  const archived = await DeletedRecord.find().select('type refId').lean();
  const stale = archived
    .filter((a) => !liveKeys.has(`${a.type}:${a.refId}`))
    .map((a) => a._id);
  if (stale.length) await DeletedRecord.deleteMany({ _id: { $in: stale } });
};

exports.getDeletedRecords = asyncHandler(async (req, res) => {
  await syncDeletedRecords();
  const docs = await DeletedRecord.find()
    .populate({ path: 'deletedBy', select: 'fullName' })
    .sort('-deletedAt')
    .lean();
  const records = docs.map((d) => ({
    _id: d.refId,           // original record id — used by restore
    type: d.type,
    module: d.module,
    name: d.name || '—',
    deletedAt: d.deletedAt,
    deletedBy: d.deletedBy?.fullName || 'System',
  }));
  res.status(200).json({ success: true, data: { records } });
});

exports.restoreRecord = asyncHandler(async (req, res, next) => {
  const { type, id } = req.params;
  const cfg = DELETED_SOURCES[type];
  if (!cfg) return next(new AppError(`Unknown record type: ${type}`, 400));
  const Model = getModel(cfg.model);
  if (!Model) return next(new AppError('Model not available', 400));
  const doc = await Model.findById(id);
  if (!doc) return next(new AppError('Record not found', 404));
  // Reliably clear the soft-delete flags. Assigning `undefined` + save() is
  // flaky in Mongoose (the field may not be unset), which leaves the record
  // filtered out of its module list. $unset guarantees the field is removed so
  // the record reappears in its original place with every detail intact.
  await Model.updateOne({ _id: id }, { $unset: { deletedAt: '', deletedBy: '' } });
  // Remove its entry from the archive collection now that it's live again.
  await DeletedRecord.deleteOne({ type, refId: id });
  res.status(200).json({ success: true, message: 'Record restored successfully' });
});

// ─── GST Integration ─────────────────────────────────────────────────────────

// GET /api/settings/gst-config — returns connection status (never exposes full key).
// "configured" is true ONLY when the user has explicitly saved a key via the UI (DB).
// The .env fallback is a server-level override and does not affect the UI status.
exports.getGstConfig = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOne().select('gstApiKey');
  const dbKey  = settings?.gstApiKey || '';
  const envKey = process.env.GST_API_KEY || '';
  const activeKey = dbKey || envKey;
  res.status(200).json({
    success: true,
    data: {
      configured:  !!dbKey,                                                          // only DB key counts as "user connected"
      keyPreview:  dbKey ? `${dbKey.slice(0, 8)}...${dbKey.slice(-4)}` : null,      // mask — never full key
      source:      dbKey ? 'database' : (envKey ? 'env' : 'none'),
      hasEnvKey:   !!envKey,                                                         // lets UI hint that a server default exists
    },
  });
});

// GET /api/settings/gst-config/credentials — returns the ACTUAL stored key for the edit flow.
// Only the DB-saved key is returned; the .env key is a deployment secret and stays server-side.
exports.getGstCredentials = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOne().select('gstApiKey');
  res.status(200).json({
    success: true,
    data: { apiKey: settings?.gstApiKey || '' },
  });
});

// PUT /api/settings/gst-config — save the API key into CompanySettings
exports.updateGstConfig = asyncHandler(async (req, res, next) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return next(new AppError('A valid API key is required', 400));
  }
  const trimmed = apiKey.trim();
  await CompanySettings.findOneAndUpdate(
    {},
    { gstApiKey: trimmed, updatedBy: req.user._id },
    { upsert: true }
  );
  res.status(200).json({
    success: true,
    message: 'GST API key saved successfully',
    data: {
      configured: true,
      keyPreview: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`,
      source: 'database',
    },
  });
});

// DELETE /api/settings/gst-config — remove saved API key (disconnect)
exports.deleteGstConfig = asyncHandler(async (req, res) => {
  await CompanySettings.findOneAndUpdate({}, { $unset: { gstApiKey: '' } });
  res.status(200).json({
    success: true,
    message: 'GST API key removed',
    data: { configured: false, keyPreview: null, source: 'none' },
  });
});

// POST /api/settings/gst-config/test — test the provided (or saved) API key
exports.testGstConnection = asyncHandler(async (req, res, next) => {
  const { apiKey: bodyKey } = req.body;
  const settings = await CompanySettings.findOne().select('gstApiKey');
  const apiKey = bodyKey?.trim() || settings?.gstApiKey || process.env.GST_API_KEY;
  if (!apiKey) return next(new AppError('No GST API key provided or configured', 400));

  // Sample GSTIN from gstverify.co.in docs (used for reachability check only)
  const TEST_GSTIN = '27AAAAA0000A1Z5';
  try {
    const result = await callGstApi(TEST_GSTIN, apiKey);

    // Clear auth failure → key is definitely wrong
    if (result.statusCode === 401 || result.statusCode === 403) {
      return next(new AppError('Invalid API key — authentication rejected by GST API', 401));
    }

    // Any other response (200 / 4xx / 5xx) means we reached the server.
    // A 5xx here usually means the test GSTIN isn't in their DB, not that
    // the key is wrong — so we still treat it as "connected".
    const message =
      result.statusCode === 200
        ? 'GST API connection successful!'
        : result.statusCode < 500
          ? 'GST API is reachable and the API key is valid.'
          : 'GST API is reachable. Server returned an error for the sample GSTIN — the key is likely valid. Try verifying a real GSTIN.';

    res.status(200).json({
      success: true,
      message,
      statusCode: result.statusCode,
      data: result.body,
    });
  } catch (err) {
    return next(new AppError(`Unable to reach GST API: ${err.message}`, 502));
  }
});

// GET /api/settings/gst/verify/:gstin — proxy GSTIN lookup using stored key
exports.verifyGstin = asyncHandler(async (req, res, next) => {
  const { gstin } = req.params;
  const cleaned = (gstin || '').trim().toUpperCase();
  if (!cleaned || cleaned.length !== 15) {
    return next(new AppError('GSTIN must be exactly 15 characters', 400));
  }

  const settings = await CompanySettings.findOne().select('gstApiKey');
  const apiKey = settings?.gstApiKey || process.env.GST_API_KEY;
  if (!apiKey) {
    return next(new AppError(
      'GST verification is not configured. Please add your API key in Integration → GST Verification.',
      503
    ));
  }

  try {
    const result = await callGstApi(cleaned, apiKey);
    if (result.statusCode === 404) {
      return next(new AppError('GSTIN not found in GST database', 404));
    }
    if (result.statusCode === 401 || result.statusCode === 403) {
      return next(new AppError('GST API key is invalid or expired', 401));
    }
    if (result.statusCode !== 200) {
      return next(new AppError(`GST API returned status ${result.statusCode}`, result.statusCode));
    }
    const normalized = normalizeGstResponse(result.body);
    res.status(200).json({ success: true, data: normalized, raw: result.body });
  } catch (err) {
    return next(new AppError(`GST lookup failed: ${err.message}`, 502));
  }
});
