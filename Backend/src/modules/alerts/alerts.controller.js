const AlertConfig = require('../../models/AlertConfig');
const AlertFireLog = require('../../models/AlertFireLog');
const asyncHandler = require('../../utils/asyncHandler');
const { getPendingRecordsForConfig } = require('../../utils/alertConfigQueries');

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minutesSinceMidnight(hh, mm) {
  return Number(hh) * 60 + Number(mm);
}

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

// GET /api/alerts/active — polled every ~20s by the logged-in user's browser.
// Returns only alerts that have already been "fired" by the scheduler (i.e. an
// AlertFireLog row exists) so a brand-new record only appears once the next
// cron tick has evaluated it — same latency as the scheduler's own cadence.
exports.getActiveAlerts = asyncHandler(async (req, res) => {
  const now = new Date();
  const configs = await AlertConfig.find({ isEnabled: true, recipientUserIds: req.user._id });

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
      const log = logByRecord.get(String(item.recordId));
      if (!log) continue; // not yet evaluated by the scheduler
      results.push({
        alertKey: `${config._id}:${item.recordType}:${item.recordId}`,
        group: config.group,
        role: config.role,
        title: item.title,
        link: item.link,
        audioUrl: config.audioUrl,
        firedAt: log.lastFiredAt,
      });
    }
  }

  res.status(200).json({ success: true, data: results });
});
