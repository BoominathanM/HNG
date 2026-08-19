const cron = require('node-cron');
const AlertConfig = require('../models/AlertConfig');
const AlertFireLog = require('../models/AlertFireLog');
const AlertLog = require('../models/AlertLog');
const { getPendingRecordsForConfig } = require('./alertConfigQueries');

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minutesSinceMidnight(hh, mm) {
  return Number(hh) * 60 + Number(mm);
}

// Same day/window gate shape as utils/localPurchaseCreditDueScheduler.js.
function isWithinWindow(config, now) {
  const todayAbbr = DAY_ABBR[now.getDay()];
  if (Array.isArray(config.days) && config.days.length && !config.days.includes(todayAbbr)) return false;

  const [startHH, startMM] = (config.startTime || '00:00').split(':');
  const [endHH, endMM] = (config.endTime || '23:59').split(':');
  const nowMinutes = minutesSinceMidnight(now.getHours(), now.getMinutes());
  const startMinutes = minutesSinceMidnight(startHH, startMM);
  const endMinutes = minutesSinceMidnight(endHH, endMM);
  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

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
    console.error('[alert-config] failed to write AlertLog:', err.message);
  }
}

async function processConfig(config) {
  const now = new Date();
  if (!config.audioUrl) return;
  // 'task' and 'dispatch_reason' have no fixed recipientUserIds — their recipient is
  // resolved per-record (task assignee / order's assigned sales person) in
  // alertConfigQueries/alerts.controller.js instead.
  if (!['task', 'dispatch_reason'].includes(config.group) && !config.recipientUserIds?.length) return;
  if (!isWithinWindow(config, now)) return;

  const pending = await getPendingRecordsForConfig(config);
  const pendingIds = new Set(pending.map((p) => String(p.recordId)));
  const cadenceMs = Math.max(1, config.durationMinutes || 30) * 60 * 1000;

  for (const item of pending) {
    const log = await AlertFireLog.findOne({
      configId: config._id, recordType: item.recordType, recordId: item.recordId,
    });
    if (!log) {
      await AlertFireLog.create({
        configId: config._id, recordType: item.recordType, recordId: item.recordId, lastFiredAt: now,
      });
      await logAlertEvent('fired', config, item, now);
    } else if (now.getTime() - log.lastFiredAt.getTime() >= cadenceMs) {
      log.lastFiredAt = now;
      await log.save();
      await logAlertEvent('fired', config, item, now);
    }
  }

  // Reconciliation — drop guard rows for records that resolved (dispatched/approved)
  // since the last tick, so a re-arrival can't inherit a stale lastFiredAt.
  await AlertFireLog.deleteMany({
    configId: config._id,
    recordId: { $nin: [...pendingIds] },
  });
}

async function checkAndFire() {
  try {
    const configs = await AlertConfig.find({ isEnabled: true });
    // Each config is isolated in its own try/catch — one config throwing (e.g. an
    // unexpected recordType, a bad query) must never abort the remaining configs
    // in this tick, or every alert after it in the list silently stops repeating.
    for (const config of configs) {
      try {
        await processConfig(config);
      } catch (err) {
        console.error(`[alert-config] check error for config ${config._id} (${config.group}/${config.role || ''}):`, err.message);
      }
    }
  } catch (err) {
    console.error('[alert-config] check error:', err.message);
  }
}

function startAlertConfigScheduler() {
  console.log('[alert-config] Scheduler started — every minute checks design/approval alert configs');
  checkAndFire();
  cron.schedule('* * * * *', checkAndFire);
}

module.exports = { startAlertConfigScheduler, checkAndFire };
