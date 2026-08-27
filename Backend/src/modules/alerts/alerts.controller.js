const AlertConfig = require('../../models/AlertConfig');
const AlertFireLog = require('../../models/AlertFireLog');
const AlertSnooze = require('../../models/AlertSnooze');
const AlertLog = require('../../models/AlertLog');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { getPendingRecordsForConfig } = require('../../utils/alertConfigQueries');
// Business-timezone-aware day/time gate — must NOT use the server's local clock,
// or every window breaks on a UTC production host. See utils/businessTime.js.
const { isWithinWindow } = require('../../utils/businessTime');
const { slog, serror } = require('../../utils/schedulerLog');

const TAG = 'alerts';

// Best-effort audit write, same fire-and-forget contract as the scheduler's own
// logAlertEvent (utils/alertConfigScheduler.js) — a logging failure must never
// break the actual snooze/stop/clear action it's attached to.
const logAlertEvent = async (event, fields) => {
  try {
    await AlertLog.create({ event, ...fields });
  } catch (err) {
    serror(TAG, `failed to write AlertLog: ${err.message}`);
  }
};

// Real admin-gate idiom used elsewhere in this codebase (operations.controller.js
// hideQueueRow, tasks.controller.js task delete) — authorize()/checkPermission()
// middleware is unused everywhere, so admin-only endpoints check inline instead.
const isAdminOrManagement = (user) =>
  !!user && (user.role === 'Super Admin' || user.department === 'Admin' || user.department === 'Management');

// GET /api/alerts/active — polled every ~20s by the logged-in user's browser.
// Returns only alerts that have already been "fired" by the scheduler (i.e. an
// AlertFireLog row exists) so a brand-new record only appears once the next
// cron tick has evaluated it — same latency as the scheduler's own cadence.
exports.getActiveAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  // 'task', 'dispatch_reason' and 'sample_followup' configs apply ONLY to whichever
  // record's dynamic recipient (task assignee / order's assigned sales person) matches
  // this user (checked per-item below), not to a fixed recipientUserIds list.
  const DYNAMIC_ONLY_GROUPS = ['task', 'dispatch_reason', 'sample_followup'];
  // 'dispatch_status' is hybrid — a record's dynamic recipient (order's assigned sales
  // person) is notified, AND separately any user in config.recipientUserIds (Finance,
  // picked by an admin) is notified too. Both checks run per-item below.
  const HYBRID_GROUPS = ['dispatch_status'];
  const DYNAMIC_RECIPIENT_GROUPS = [...DYNAMIC_ONLY_GROUPS, ...HYBRID_GROUPS];
  const configs = await AlertConfig.find({
    isEnabled: true,
    $or: [{ recipientUserIds: req.user._id }, { group: { $in: DYNAMIC_RECIPIENT_GROUPS } }],
  });

  // Per-user snooze/stop overlay — checked on top of the scheduler's global cadence.
  const snoozes = await AlertSnooze.find({ userId: req.user._id }).lean();
  const snoozeByKey = new Map(snoozes.map((s) => [s.alertKey, s]));

  const results = [];
  for (const config of configs) {
    if (!isWithinWindow(config, now)) continue;

    const pending = await getPendingRecordsForConfig(config);
    if (!pending.length) continue;

    const logs = await AlertFireLog.find({
      configId: config._id,
      recordId: { $in: pending.map((p) => p.recordId) },
    }).lean();
    const logByRecord = new Map(logs.map((l) => [String(l.recordId), l]));

    for (const item of pending) {
      if (DYNAMIC_ONLY_GROUPS.includes(config.group) && String(item.recipientUserId || '') !== String(req.user._id)) continue;
      if (HYBRID_GROUPS.includes(config.group)) {
        const isDynamicMatch = String(item.recipientUserId || '') === String(req.user._id);
        const isFixedMatch = (config.recipientUserIds || []).some((id) => String(id) === String(req.user._id));
        if (!isDynamicMatch && !isFixedMatch) continue;
      }
      const log = logByRecord.get(String(item.recordId));
      if (!log) continue; // not yet evaluated by the scheduler

      const alertKey = `${config._id}:${item.recordType}:${item.recordId}`;
      const snooze = snoozeByKey.get(alertKey);
      let firedAt = log.lastFiredAt;
      if (snooze) {
        if (snooze.action === 'stop') continue;
        if (snooze.action === 'snooze') {
          if (new Date(snooze.snoozedUntil) > now) continue;
          // Snooze just expired. AlertFireLog.lastFiredAt is untouched by
          // snoozing (the scheduler's cadence is global, not per-user), so
          // without bumping it here the frontend's playedRef guard (keyed on
          // firedAt) would recognize this exact timestamp as "already rung"
          // from before the snooze and silently swallow the re-ring. Bump it
          // once, on the first poll after expiry, and drop the now-stale
          // snooze row so this only fires once, not on every 20s poll.
          firedAt = now;
          await AlertFireLog.updateOne({ _id: log._id }, { lastFiredAt: now });
          await AlertSnooze.deleteOne({ _id: snooze._id });
          snoozeByKey.delete(alertKey);
          await logAlertEvent('expired', {
            configId: config._id, recordType: item.recordType, recordId: item.recordId,
            group: config.group, role: config.role, title: item.title, userId: req.user._id,
          });
          slog(TAG, `⏰ snooze expired → re-ringing ${config.group}${config.role ? '/' + config.role : ''} for ${req.user.fullName || req.user._id} — ${item.title}`);
        }
      }

      results.push({
        alertKey,
        group: config.group,
        role: config.role,
        title: item.title,
        link: item.link,
        audioUrl: config.audioUrl,
        firedAt,
      });
    }
  }

  res.status(200).json({ success: true, data: results });
});

// POST /api/alerts/snooze — body { alertKey, minutes }. Upserts a per-user
// suppression so getActiveAlerts stops returning this exact alert instance
// until `minutes` elapse.
exports.snoozeAlert = asyncHandler(async (req, res, next) => {
  const { alertKey, minutes } = req.body;
  if (!alertKey || typeof alertKey !== 'string') return next(new AppError('alertKey is required', 400));
  const mins = Math.min(Math.max(Number(minutes) || 0, 1), 1440); // clamp 1 min – 24 hr
  const [configId, recordType, recordId] = alertKey.split(':');
  if (!configId || !recordType || !recordId) return next(new AppError('Invalid alertKey', 400));

  const config = await AlertConfig.findById(configId).lean();
  if (!config) return next(new AppError('Alert config not found', 404));

  // Title isn't known here without re-deriving pending records — accept it
  // optionally from the client (AlertListener already has it from the toast).
  const { title } = req.body;
  const now = new Date();

  const snooze = await AlertSnooze.findOneAndUpdate(
    { userId: req.user._id, alertKey },
    {
      userId: req.user._id, alertKey, configId, recordType, recordId,
      group: config.group, role: config.role, title: title || undefined,
      action: 'snooze', snoozeMinutes: mins, snoozedUntil: new Date(now.getTime() + mins * 60 * 1000),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await logAlertEvent('snoozed', {
    configId, recordType, recordId, group: config.group, role: config.role,
    title: title || snooze.title, userId: req.user._id, minutes: mins,
  });
  slog(TAG, `😴 snoozed ${config.group}${config.role ? '/' + config.role : ''} for ${mins}m by ${req.user.fullName || req.user._id} — ${title || snooze.title || alertKey}`);
  res.status(200).json({ success: true, data: snooze });
});

// POST /api/alerts/stop — body { alertKey }. Same upsert as snooze but permanent
// (until the underlying record resolves and ages out, or an admin clears it).
exports.stopAlert = asyncHandler(async (req, res, next) => {
  const { alertKey, title } = req.body;
  if (!alertKey || typeof alertKey !== 'string') return next(new AppError('alertKey is required', 400));
  const [configId, recordType, recordId] = alertKey.split(':');
  if (!configId || !recordType || !recordId) return next(new AppError('Invalid alertKey', 400));

  const config = await AlertConfig.findById(configId).lean();
  if (!config) return next(new AppError('Alert config not found', 404));

  const snooze = await AlertSnooze.findOneAndUpdate(
    { userId: req.user._id, alertKey },
    {
      $set: {
        userId: req.user._id, alertKey, configId, recordType, recordId,
        group: config.group, role: config.role, title: title || undefined,
        action: 'stop',
      },
      $unset: { snoozeMinutes: '', snoozedUntil: '' },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await logAlertEvent('stopped', {
    configId, recordType, recordId, group: config.group, role: config.role,
    title: title || snooze.title, userId: req.user._id,
  });
  slog(TAG, `🛑 stopped ${config.group}${config.role ? '/' + config.role : ''} by ${req.user.fullName || req.user._id} — ${title || snooze.title || alertKey}`);
  res.status(200).json({ success: true, data: snooze });
});

// GET /api/alerts/snoozed — admin/management listing of every user's snoozed/stopped alerts.
exports.getSnoozedAlerts = asyncHandler(async (req, res, next) => {
  if (!isAdminOrManagement(req.user)) return next(new AppError('Only Admin/Management department or Super Admin can view snoozed alerts', 403));
  const rows = await AlertSnooze.find()
    .populate('userId', 'fullName email department role')
    .sort('-createdAt')
    .lean();
  res.status(200).json({ success: true, data: rows });
});

// POST /api/alerts/snoozed/:id/clear — admin resume action, alert can ring again immediately.
exports.clearSnoozedAlert = asyncHandler(async (req, res, next) => {
  if (!isAdminOrManagement(req.user)) return next(new AppError('Only Admin/Management department or Super Admin can clear snoozed alerts', 403));
  const row = await AlertSnooze.findByIdAndDelete(req.params.id);
  if (!row) return next(new AppError('Snoozed alert not found', 404));
  // Deleting the AlertSnooze row alone stops getActiveAlerts from filtering the
  // alert out on the affected user's next poll, but AlertFireLog.lastFiredAt is
  // untouched by snoozing/stopping — without bumping it here the frontend's
  // playedRef guard (keyed on firedAt) would recognize the unchanged timestamp
  // as "already rung" from before the snooze/stop and silently swallow the
  // re-ring, so Clear would look like it did nothing. Bump it so the alert
  // rings again on the user's very next poll (within ~20s).
  await AlertFireLog.updateOne(
    { configId: row.configId, recordType: row.recordType, recordId: row.recordId },
    { lastFiredAt: new Date() }
  );
  await logAlertEvent('cleared', {
    configId: row.configId, recordType: row.recordType, recordId: row.recordId,
    group: row.group, role: row.role, title: row.title,
    userId: req.user._id, targetUserId: row.userId,
  });
  slog(TAG, `🧹 cleared ${row.action} on ${row.group}${row.role ? '/' + row.role : ''} by admin ${req.user.fullName || req.user._id} — ${row.title || ''}`);
  res.status(200).json({ success: true, message: 'Cleared' });
});

// GET /api/alerts/logs — admin/management full history of every alert event
// (fired/snoozed/stopped/cleared/expired), unlike /snoozed which only shows
// currently-active suppressions.
exports.getAlertLogs = asyncHandler(async (req, res, next) => {
  if (!isAdminOrManagement(req.user)) return next(new AppError('Only Admin/Management department or Super Admin can view alert logs', 403));
  const rows = await AlertLog.find()
    .populate('userId', 'fullName email department role')
    .populate('targetUserId', 'fullName email department role')
    .sort('-createdAt')
    .limit(1000)
    .lean();
  res.status(200).json({ success: true, data: rows });
});
