const cron = require('node-cron');
const AlertConfig = require('../models/AlertConfig');
const AlertFireLog = require('../models/AlertFireLog');
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

async function processConfig(config) {
  const now = new Date();
  if (!config.recipientUserIds?.length || !config.audioUrl) return;
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
    } else if (now.getTime() - log.lastFiredAt.getTime() >= cadenceMs) {
      log.lastFiredAt = now;
      await log.save();
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
    for (const config of configs) {
      await processConfig(config);
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
