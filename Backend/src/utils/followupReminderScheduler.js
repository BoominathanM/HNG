const cron = require('node-cron');
const Lead = require('../models/Lead');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');
// Business-timezone clock — send times / day ranges are configured in IST and
// must not be read off the server's local clock. See utils/businessTime.js.
const { businessParts, businessDayRange } = require('./businessTime');
const { slog, swarn, serror, sbeat } = require('./schedulerLog');

const TAG = 'followup-reminder';

// Tracks "leadId:YYYY-MM-DD" pairs already sent today — prevents double-sends per lead.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping, { currentHH, currentMM, mappingTimeMatches }) {
  const { todayStart, todayEnd } = businessDayRange();

  // Fetch leads whose follow-up date is today, with the creator's mobile from User collection
  const leads = await Lead.find({
    $or: [
      { followupDate: { $gte: todayStart, $lte: todayEnd } },
      { followUpDate: { $gte: todayStart, $lte: todayEnd } },
    ],
    deletedAt: null,
    createdBy: { $exists: true, $ne: null },
  }).populate('createdBy', 'name mobile').lean();

  if (!leads.length) {
    if (mappingTimeMatches) slog(TAG, 'sendTime matched — 0 leads with a follow-up due today');
    return;
  }

  const { name: templateName, language = 'en' } = mapping.templateId;
  const variables = mapping.variables || [];
  const today = todayKey();

  for (const lead of leads) {
    const salesperson = lead.createdBy;

    if (!salesperson?.mobile) {
      continue;
    }

    // Two independent triggers can fire a send: the lead's own follow-up time
    // (set while adding the lead) or the event mapping's global daily send time.
    const leadTime = lead.followupTime || lead.followUpTime || '';
    const [leadHH, leadMM] = leadTime.split(':');
    const leadTimeMatches = Boolean(leadTime) && leadHH === currentHH && leadMM === currentMM;
    if (!mappingTimeMatches && !leadTimeMatches) continue;

    // Per-lead daily guard — whichever trigger fires first wins, no double-send
    const guardKey = `${lead._id}:${today}`;
    if (guard.has(guardKey)) continue;
    guard.mark(guardKey);

    const fieldValues = {
      salesPersonName: salesperson.name       || '',
      customerName:    lead.hotelName         || '',
      followupDate:    formatDate(lead.followupDate || lead.followUpDate),
      followupTime:    lead.followupTime || lead.followUpTime || '',
      leadStatus:      lead.status            || '',
      companyName:     process.env.COMPANY_NAME || 'HNG',
    };

    const parameters = {};
    for (const v of variables) {
      if (v.templateVariable && v.eventField) {
        parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
      }
    }

    const result = await sendMessage({ to: salesperson.mobile, templateName, language, parameters });
    if (result.success) {
      slog(TAG, `✅ sent to ${salesperson.name} (${salesperson.mobile}) — lead: ${lead.hotelName}`);
    } else {
      swarn(TAG, `send failed for ${salesperson.name} (${salesperson.mobile}) — lead: ${lead.hotelName}: ${result.error}`);
    }
  }
}

async function checkAndSend() {
  try {
    const { hh: currentHH, mm: currentMM } = businessParts();
    const today = todayKey();

    guard.purgeStale(today);

    const event = await WhatsAppEvent.findOne({ key: 'follow-up-reminder' }).lean();
    if (!event) { sbeat(TAG, `tick ${currentHH}:${currentMM} IST — event 'follow-up-reminder' not configured`); return; }

    // Always read sendTime fresh from DB — no static value anywhere
    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();

    const sendTimes = mappings.map((m) => m.sendTime || '08:00');
    sbeat(TAG, `tick ${currentHH}:${currentMM} IST — ${mappings.length} enabled mapping(s), sendTime(s): ${sendTimes.join(', ') || 'none'}`);

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');
      const mappingTimeMatches = hh === currentHH && mm === currentMM;

      if (mappingTimeMatches) slog(TAG, `sendTime ${hh}:${mm} matched — running reminders`);

      // Always run — a lead's own follow-up time can fire independently of the
      // mapping's global sendTime; sendRemindersForMapping checks both per-lead.
      await sendRemindersForMapping(mapping, { currentHH, currentMM, mappingTimeMatches });
    }
  } catch (err) {
    serror(TAG, `check error: ${err.message}`);
  }
}

function startFollowUpReminderScheduler() {
  slog(TAG, 'scheduler started — checks DB sendTime + per-lead follow-up time every minute');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startFollowUpReminderScheduler, checkAndSend };
