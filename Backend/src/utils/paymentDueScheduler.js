const cron = require('node-cron');
const Lead = require('../models/Lead');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');

// Tracks "leadId:YYYY-MM-DD" pairs already sent today — prevents double-sends per lead.
const guard = createDailyGuard();

function formatAmount(lead) {
  const total = Number(lead.totalAmount || lead.total || 0);
  if (!total) return '';
  const due = Math.max(0, total - Number(lead.paidAmount || 0));
  return `Rs. ${due.toFixed(2)}`;
}

async function sendTo(recipientLabel, phone, lead, templateName, language, parameters) {
  const result = await sendMessage({ to: phone, templateName, language, parameters });
  if (result.success) {
    console.log(`[payment-due] ✅ Sent to ${recipientLabel} (${phone}) for lead: ${lead.hotelName}`);
  } else {
    console.warn(`[payment-due] ⚠️  Failed for ${recipientLabel} (${phone}): ${result.error}`);
  }
}

async function sendRemindersForMapping(mapping) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Payment due date is set on the lead at creation time (paymentReminderDate),
  // required for every payment term except 100% Payment. Only sent when the user
  // ticked "Set reminder for payment terms" on that specific lead.
  const leads = await Lead.find({
    paymentReminderDate: { $gte: todayStart, $lte: todayEnd },
    paymentTermsReminder: true,
    deletedAt: null,
  }).populate('createdBy', 'name mobile').lean();

  if (!leads.length) {
    console.log('[payment-due] No leads with payment due today.');
    return;
  }

  const { name: templateName, language = 'en' } = mapping.templateId;
  const variables = mapping.variables || [];
  const today = todayKey();

  for (const lead of leads) {
    const salesperson = lead.createdBy;

    const fieldValues = {
      customerName:   lead.hotelName || lead.contactPerson || '',
      amount:         formatAmount(lead),
      dueDate:        formatDate(lead.paymentReminderDate),
      invoiceNumber:  lead.leadCode || '',
      companyName:    process.env.COMPANY_NAME || 'HNG',
    };

    const parameters = {};
    for (const v of variables) {
      if (v.templateVariable && v.eventField) {
        parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
      }
    }

    // Send to the customer (phone captured on the lead)
    if (lead.phone) {
      const guardKey = `${lead._id}:${today}:customer`;
      if (!guard.has(guardKey)) {
        guard.mark(guardKey);
        await sendTo(lead.hotelName, lead.phone, lead, templateName, language, parameters);
      }
    }

    // Send to the salesperson who created the lead (mobile from User collection)
    if (salesperson?.mobile) {
      const guardKey = `${lead._id}:${today}:salesperson`;
      if (!guard.has(guardKey)) {
        guard.mark(guardKey);
        await sendTo(salesperson.name, salesperson.mobile, lead, templateName, language, parameters);
      }
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

    const event = await WhatsAppEvent.findOne({ key: 'payment-due' }).lean();
    if (!event) return;

    // Always read sendTime fresh from DB — no static value anywhere
    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');

      if (hh !== currentHH || mm !== currentMM) continue;

      console.log(`[payment-due] ⏰ sendTime ${hh}:${mm} matched — running reminders`);
      await sendRemindersForMapping(mapping);
    }
  } catch (err) {
    console.error('[payment-due] check error:', err.message);
  }
}

function startPaymentDueScheduler() {
  console.log('[payment-due] Scheduler started — every minute checks DB sendTime from event mapping');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startPaymentDueScheduler, checkAndSend };
