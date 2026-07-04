const cron = require('node-cron');
const Lead = require('../models/Lead');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');

// Tracks "leadId:YYYY-MM-DD" pairs already sent today — prevents double-sends per lead.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Fetch leads whose tentative order delivery date is today, with the creator's mobile from User collection
  const leads = await Lead.find({
    orderDeliveryDate: { $gte: todayStart, $lte: todayEnd },
    deletedAt: null,
    createdBy: { $exists: true, $ne: null },
  }).populate('createdBy', 'name mobile').lean();

  if (!leads.length) {
    console.log('[order-delivery-reminder] No leads with tentative delivery today.');
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
      console.log(`[order-delivery-reminder] ✅ Sent to ${salesperson.name} (${salesperson.mobile}) for lead: ${lead.hotelName}`);
    } else {
      console.warn(`[order-delivery-reminder] ⚠️  Failed for ${salesperson.name} (${salesperson.mobile}): ${result.error}`);
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

    const event = await WhatsAppEvent.findOne({ key: 'order-delivery-reminder' }).lean();
    if (!event) return;

    // Always read sendTime fresh from DB — no static value anywhere
    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');
      const mappingTimeMatches = hh === currentHH && mm === currentMM;
      if (!mappingTimeMatches) continue;

      console.log(`[order-delivery-reminder] ⏰ sendTime ${hh}:${mm} matched — running reminders`);
      await sendRemindersForMapping(mapping);
    }
  } catch (err) {
    console.error('[order-delivery-reminder] check error:', err.message);
  }
}

function startOrderDeliveryReminderScheduler() {
  console.log('[order-delivery-reminder] Scheduler started — every minute checks DB sendTime from event mapping');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startOrderDeliveryReminderScheduler, checkAndSend };
