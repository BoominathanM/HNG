const cron = require('node-cron');
const LocalPurchase = require('../models/LocalPurchase');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { formatDate, todayKey } = require('./reminderSchedulerCommon');
// Business-timezone clock — the escalation window / working days are configured
// in IST and must not be read off the server's local clock. See utils/businessTime.js.
const { isWithinWindow, businessDayRange } = require('./businessTime');
const { slog, swarn, serror, sbeat } = require('./schedulerLog');

const TAG = 'local-purchase-credit-due';

// Tracks the last time each (localPurchaseId:userId) pair was sent, so the
// escalation loop only re-sends once `delayMinutes` have actually elapsed —
// reset whenever the calendar day rolls over.
const lastSentAt = new Map();
let guardDay = '';

function purgeIfNewDay(today) {
  if (guardDay !== today) {
    lastSentAt.clear();
    guardDay = today;
  }
}

function formatBalance(lp) {
  const balance = Math.max(0, (lp.totalAmount || 0) - (lp.paidAmount || 0));
  return `Rs. ${balance.toFixed(2)}`;
}

async function runEscalation(mapping) {
  const now = new Date();
  purgeIfNewDay(todayKey());

  // Configured working-days + [startTime, endTime] gate, evaluated in the
  // business timezone (mapping has the same { days, startTime, endTime } shape
  // as an AlertConfig doc).
  if (!isWithinWindow(mapping, now)) {
    sbeat(TAG, `outside escalation window (${mapping.startTime}-${mapping.endTime}, days: ${(mapping.days || []).join('/') || 'all'})`);
    return;
  }

  const recipients = (mapping.recipientUserIds || []).filter((u) => u?.mobile);
  if (!recipients.length) {
    swarn(TAG, 'inside escalation window but this mapping has no recipients with a mobile number');
    return;
  }

  const { todayEnd } = businessDayRange(now);
  const localPurchases = await LocalPurchase.find({
    paymentType: 'credit',
    paymentStatus: { $ne: 'Paid' },
    dueDate: { $lte: todayEnd, $ne: null },
  }).lean();

  if (!localPurchases.length) {
    sbeat(TAG, 'inside window — 0 unpaid credit purchases past due');
    return;
  }
  slog(TAG, `inside window — ${localPurchases.length} unpaid credit purchase(s) past due, ${recipients.length} recipient(s), re-send delay ${Math.max(1, mapping.delayMinutes || 30)}m`);

  const { name: templateName, language = 'en' } = mapping.templateId;
  const variables = mapping.variables || [];
  const delayMs = Math.max(1, mapping.delayMinutes || 30) * 60 * 1000;

  for (const lp of localPurchases) {
    const fieldValues = {
      vendorName:    lp.vendorName || '',
      amount:        formatBalance(lp),
      dueDate:       formatDate(lp.dueDate),
      invoiceNumber: lp.invoiceNo || lp.lpCode || '',
      companyName:   process.env.COMPANY_NAME || 'HNG',
    };
    const parameters = {};
    for (const v of variables) {
      if (v.templateVariable && v.eventField) {
        parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
      }
    }

    for (const user of recipients) {
      const guardKey = `${lp._id}:${user._id}`;
      const last = lastSentAt.get(guardKey);
      if (last && (now.getTime() - last) < delayMs) continue;

      const result = await sendMessage({ to: user.mobile, templateName, language, parameters });
      if (result.success) {
        lastSentAt.set(guardKey, now.getTime());
        slog(TAG, `✅ sent to ${user.fullName} (${user.mobile}) — local purchase: ${lp.lpCode}`);
      } else {
        swarn(TAG, `send failed for ${user.fullName} (${user.mobile}) — local purchase: ${lp.lpCode}: ${result.error}`);
      }
    }
  }
}

async function checkAndSend() {
  try {
    const event = await WhatsAppEvent.findOne({ key: 'local-purchase-credit-due' }).lean();
    if (!event) { sbeat(TAG, "tick — event 'local-purchase-credit-due' not configured"); return; }

    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .populate('recipientUserIds', 'fullName mobile')
      .lean();

    const configured = mappings.filter((m) => m.startTime && m.endTime);
    sbeat(TAG, `tick — ${mappings.length} enabled mapping(s), ${configured.length} with an escalation window set`);

    for (const mapping of mappings) {
      if (!mapping.startTime || !mapping.endTime) continue; // escalation not configured yet
      await runEscalation(mapping);
    }
  } catch (err) {
    serror(TAG, `check error: ${err.message}`);
  }
}

function startLocalPurchaseCreditDueScheduler() {
  slog(TAG, 'scheduler started — checks the escalation window/delay from event mapping every minute');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startLocalPurchaseCreditDueScheduler, checkAndSend };
