const cron = require('node-cron');
const LocalPurchase = require('../models/LocalPurchase');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { formatDate } = require('./reminderSchedulerCommon');

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Tracks the last time each (localPurchaseId:userId) pair was sent, so the
// escalation loop only re-sends once `delayMinutes` have actually elapsed —
// reset whenever the calendar day rolls over.
const lastSentAt = new Map();
let guardDay = '';

function purgeIfNewDay(todayKey) {
  if (guardDay !== todayKey) {
    lastSentAt.clear();
    guardDay = todayKey;
  }
}

function formatBalance(lp) {
  const balance = Math.max(0, (lp.totalAmount || 0) - (lp.paidAmount || 0));
  return `Rs. ${balance.toFixed(2)}`;
}

function minutesSinceMidnight(hh, mm) {
  return Number(hh) * 60 + Number(mm);
}

async function runEscalation(mapping) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  purgeIfNewDay(todayKey);

  const todayAbbr = DAY_ABBR[now.getDay()];
  if (Array.isArray(mapping.days) && mapping.days.length && !mapping.days.includes(todayAbbr)) {
    return; // not one of the configured days
  }

  const [startHH, startMM] = (mapping.startTime || '00:00').split(':');
  const [endHH, endMM] = (mapping.endTime || '23:59').split(':');
  const nowMinutes = minutesSinceMidnight(now.getHours(), now.getMinutes());
  const startMinutes = minutesSinceMidnight(startHH, startMM);
  const endMinutes = minutesSinceMidnight(endHH, endMM);
  if (nowMinutes < startMinutes || nowMinutes > endMinutes) return;

  const recipients = (mapping.recipientUserIds || []).filter((u) => u?.mobile);
  if (!recipients.length) return;

  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const localPurchases = await LocalPurchase.find({
    paymentType: 'credit',
    paymentStatus: { $ne: 'Paid' },
    dueDate: { $lte: todayEnd, $ne: null },
  }).lean();

  if (!localPurchases.length) return;

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
        console.log(`[local-purchase-credit-due] ✅ Sent to ${user.fullName} (${user.mobile}) re: ${lp.lpCode}`);
      } else {
        console.warn(`[local-purchase-credit-due] ⚠️  Failed for ${user.fullName} (${user.mobile}): ${result.error}`);
      }
    }
  }
}

async function checkAndSend() {
  try {
    const event = await WhatsAppEvent.findOne({ key: 'local-purchase-credit-due' }).lean();
    if (!event) return;

    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .populate('recipientUserIds', 'fullName mobile')
      .lean();

    for (const mapping of mappings) {
      if (!mapping.startTime || !mapping.endTime) continue; // escalation not configured yet
      await runEscalation(mapping);
    }
  } catch (err) {
    console.error('[local-purchase-credit-due] check error:', err.message);
  }
}

function startLocalPurchaseCreditDueScheduler() {
  console.log('[local-purchase-credit-due] Scheduler started — every minute checks the escalation window/delay from event mapping');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startLocalPurchaseCreditDueScheduler, checkAndSend };
