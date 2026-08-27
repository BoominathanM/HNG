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

const TAG = 'order-delivery-reminder';

// Tracks "leadId:YYYY-MM-DD" pairs already sent today — prevents double-sends per lead.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping) {
  const { todayStart, todayEnd } = businessDayRange();

  // Fetch leads whose tentative order delivery date is today, with the creator's mobile from User collection
  const leads = await Lead.find({
    orderDeliveryDate: { $gte: todayStart, $lte: todayEnd },
    deletedAt: null,
    createdBy: { $exists: true, $ne: null },
  }).populate('createdBy', 'name mobile').lean();

  if (!leads.length) {
    slog(TAG, 'sendTime matched — 0 leads with a tentative delivery today');
    return;
  }
  slog(TAG, `sendTime matched — ${leads.length} lead(s) with a tentative delivery today`);

  const { name: templateName, language = 'en' } = mapping.templateId;
  const variables = mapping.variables || [];
  const today = todayKey();

  for (const lead of leads) {
    const salesperson = lead.createdBy;

    if (!salesperson?.mobile) {
      continue;
    }

    // Per-lead daily guard — one send per lead per day
    const guardKey = `${lead._id}:${today}`;
    if (guard.has(guardKey)) continue;
    guard.mark(guardKey);

    const fieldValues = {
      salesPersonName: salesperson.name       || '',
      customerName:    lead.hotelName         || '',
      deliveryDate:    formatDate(lead.orderDeliveryDate),
      leadStatus:      lead.status             || '',
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

    const event = await WhatsAppEvent.findOne({ key: 'order-delivery-reminder' }).lean();
    if (!event) { sbeat(TAG, `tick ${currentHH}:${currentMM} IST — event 'order-delivery-reminder' not configured`); return; }

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
      if (!mappingTimeMatches) continue;

      await sendRemindersForMapping(mapping);
    }
  } catch (err) {
    serror(TAG, `check error: ${err.message}`);
  }
}

function startOrderDeliveryReminderScheduler() {
  slog(TAG, 'scheduler started — checks DB sendTime every minute');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startOrderDeliveryReminderScheduler, checkAndSend };
