const cron = require('node-cron');
const Lead = require('../models/Lead');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');

// Tracks "leadId:YYYY-MM-DD" pairs already sent today — prevents double-sends per lead.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping, { currentHH, currentMM, mappingTimeMatches }) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

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
    if (mappingTimeMatches) console.log('[followup-reminder] No leads with follow-up today.');
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
      console.log(`[followup-reminder] ✅ Sent to ${salesperson.name} (${salesperson.mobile}) for lead: ${lead.hotelName}`);
    } else {
      console.warn(`[followup-reminder] ⚠️  Failed for ${salesperson.name} (${salesperson.mobile}): ${result.error}`);
    }
  }
}

async function checkAndSend() {
  try {
    const now = new Date();
    const currentHH = String(now.getHours()).padStart(2, '0');
    const currentMM = String(now.getMinutes()).padStart(2, '0');
    const today = todayKey();

    guard.purgeStale(today);

    const event = await WhatsAppEvent.findOne({ key: 'follow-up-reminder' }).lean();
    if (!event) return;

    // Always read sendTime fresh from DB — no static value anywhere
    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');
      const mappingTimeMatches = hh === currentHH && mm === currentMM;

      if (mappingTimeMatches) console.log(`[followup-reminder] ⏰ sendTime ${hh}:${mm} matched — running reminders`);

      // Always run — a lead's own follow-up time can fire independently of the
      // mapping's global sendTime; sendRemindersForMapping checks both per-lead.
      await sendRemindersForMapping(mapping, { currentHH, currentMM, mappingTimeMatches });
    }
  } catch (err) {
    console.error('[followup-reminder] check error:', err.message);
  }
}

function startFollowUpReminderScheduler() {
  console.log('[followup-reminder] Scheduler started — every minute checks DB sendTime from event mapping');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startFollowUpReminderScheduler, checkAndSend };
