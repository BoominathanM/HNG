const User = require('../../models/User');
const CompanySettings = require('../../models/CompanySettings');
const Party = require('../../models/Party');
const DropdownOption = require('../../models/DropdownOption');
const DeletedRecord = require('../../models/DeletedRecord');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');
const COUNTRY_CODES = require('./countrycodes');

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
