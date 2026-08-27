const cron = require('node-cron');
const AlertConfig = require('../models/AlertConfig');
const AlertFireLog = require('../models/AlertFireLog');
const AlertLog = require('../models/AlertLog');
const AlertSnooze = require('../models/AlertSnooze');
const { getPendingRecordsForConfig } = require('./alertConfigQueries');
// Business-timezone-aware day/time gate — must NOT use the server's local clock,
// or every window breaks on a UTC production host. See utils/businessTime.js.
const { isWithinWindow } = require('./businessTime');
const { slog, swarn, serror, sbeat } = require('./schedulerLog');

const TAG = 'alert-config';

// Best-effort audit write — a logging failure must never break the actual
// alert-firing flow, so this is fire-and-forget from the caller's perspective.
async function logAlertEvent(event, config, item, now, extra = {}) {
  try {
    await AlertLog.create({
      event,
      configId: config._id, recordType: item.recordType, recordId: item.recordId,
      group: config.group, role: config.role, title: item.title,
      createdAt: now,
      ...extra,
    });
  } catch (err) {
    serror(TAG, `failed to write AlertLog: ${err.message}`);
  }
}

async function processConfig(config) {
  const now = new Date();
  const label = `${config.group}${config.role ? '/' + config.role : ''}`;
  if (!config.audioUrl) return { label, skipped: 'no audio uploaded' };
  // 'task' and 'dispatch_reason' have no fixed recipientUserIds — their recipient is
  // resolved per-record (task assignee / order's assigned sales person) in
  // alertConfigQueries/alerts.controller.js instead. 'dispatch_status' is hybrid — it
  // always has the order's assigned sales person as a per-record recipient even when
  // no fixed Finance recipientUserIds have been picked yet.
  if (!['task', 'dispatch_reason', 'dispatch_status'].includes(config.group) && !config.recipientUserIds?.length) {
    return { label, skipped: 'no recipients' };
  }
  if (!isWithinWindow(config, now)) return { label, skipped: 'outside window', inWindow: false };

  const pending = await getPendingRecordsForConfig(config);
  const pendingIds = new Set(pending.map((p) => String(p.recordId)));
  const cadenceMs = Math.max(1, config.durationMinutes || 30) * 60 * 1000;

  let fired = 0;
  for (const item of pending) {
    const log = await AlertFireLog.findOne({
      configId: config._id, recordType: item.recordType, recordId: item.recordId,
    });
    if (!log) {
      await AlertFireLog.create({
        configId: config._id, recordType: item.recordType, recordId: item.recordId, lastFiredAt: now,
      });
      await logAlertEvent('fired', config, item, now);
      fired += 1;
      slog(TAG, `🔔 FIRED ${label} — ${item.title}`);
    } else if (now.getTime() - log.lastFiredAt.getTime() >= cadenceMs) {
      log.lastFiredAt = now;
      await log.save();
      await logAlertEvent('fired', config, item, now);
      fired += 1;
      slog(TAG, `🔔 RE-FIRED ${label} (repeat every ${config.durationMinutes || 30}m) — ${item.title}`);
    }
  }

  // Reconciliation — drop guard rows for records that resolved (dispatched/approved)
  // since the last tick, so a re-arrival can't inherit a stale lastFiredAt.
  await AlertFireLog.deleteMany({
    configId: config._id,
    recordId: { $nin: [...pendingIds] },
  });

  // Same reconciliation for the per-user snooze/stop overlay — otherwise a user's
  // "Stop" (or an unexpired snooze) on an alert whose record later resolves would
  // keep suppressing that alert if the SAME record id re-enters the pending set
  // within AlertSnooze's 30-day TTL (e.g. a dispatch_reason order going pending →
  // approved → pending again on invoice re-upload, or a StickerRequest looping
  // back through 'Design Change' → 'Waiting for Approval'). Clearing it here means
  // a genuinely new occurrence rings again instead of staying silently muted.
  await AlertSnooze.deleteMany({
    configId: config._id,
    recordId: { $nin: [...pendingIds] },
  });

  return { label, inWindow: true, pendingCount: pending.length, firedCount: fired };
}

async function checkAndFire() {
  try {
    const configs = await AlertConfig.find({ isEnabled: true });
    let inWindow = 0;
    let pending = 0;
    let fired = 0;
    // Each config is isolated in its own try/catch — one config throwing (e.g. an
    // unexpected recordType, a bad query) must never abort the remaining configs
    // in this tick, or every alert after it in the list silently stops repeating.
    for (const config of configs) {
      try {
        const r = await processConfig(config);
        if (r?.inWindow) inWindow += 1;
        pending += r?.pendingCount || 0;
        fired += r?.firedCount || 0;
      } catch (err) {
        serror(TAG, `config ${config._id} (${config.group}/${config.role || ''}): ${err.message}`);
      }
    }
    const summary = `tick — ${configs.length} enabled, ${inWindow} in-window, ${pending} pending, ${fired} fired`;
    if (fired > 0) slog(TAG, summary);
    else sbeat(TAG, summary);
  } catch (err) {
    serror(TAG, `check error: ${err.message}`);
  }
}

function startAlertConfigScheduler() {
  slog(TAG, 'scheduler started — evaluates every alert config once a minute');
  checkAndFire();
  cron.schedule('* * * * *', checkAndFire);
}

module.exports = { startAlertConfigScheduler, checkAndFire };
