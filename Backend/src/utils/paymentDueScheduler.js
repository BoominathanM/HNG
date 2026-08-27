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

const TAG = 'payment-due';

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
    slog(TAG, `✅ sent to ${recipientLabel} (${phone}) — lead: ${lead.hotelName}`);
  } else {
    swarn(TAG, `send failed for ${recipientLabel} (${phone}) — lead: ${lead.hotelName}: ${result.error}`);
  }
}

async function sendRemindersForMapping(mapping) {
  const { todayStart, todayEnd } = businessDayRange();

  // Payment due date is set on the lead at creation time (paymentReminderDate),
  // required for every payment term except 100% Payment. Only sent when the user
  // ticked "Set reminder for payment terms" on that specific lead.
  const leads = await Lead.find({
    paymentReminderDate: { $gte: todayStart, $lte: todayEnd },
    paymentTermsReminder: true,
    deletedAt: null,
  }).populate('createdBy', 'name mobile').lean();

  if (!leads.length) {
    slog(TAG, 'sendTime matched — 0 leads with a payment due today');
    return;
  }
  slog(TAG, `sendTime matched — ${leads.length} lead(s) with a payment due today`);

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
    const { hh: currentHH, mm: currentMM } = businessParts();
    const today = todayKey();

    guard.purgeStale(today);

    const event = await WhatsAppEvent.findOne({ key: 'payment-due' }).lean();
    if (!event) { sbeat(TAG, `tick ${currentHH}:${currentMM} IST — event 'payment-due' not configured`); return; }

    // Always read sendTime fresh from DB — no static value anywhere
    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .lean();

    const sendTimes = mappings.map((m) => m.sendTime || '08:00');
    sbeat(TAG, `tick ${currentHH}:${currentMM} IST — ${mappings.length} enabled mapping(s), sendTime(s): ${sendTimes.join(', ') || 'none'}`);

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');

      if (hh !== currentHH || mm !== currentMM) continue;

      await sendRemindersForMapping(mapping);
    }
  } catch (err) {
    serror(TAG, `check error: ${err.message}`);
  }
}

function startPaymentDueScheduler() {
  slog(TAG, 'scheduler started — checks DB sendTime every minute');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startPaymentDueScheduler, checkAndSend };
