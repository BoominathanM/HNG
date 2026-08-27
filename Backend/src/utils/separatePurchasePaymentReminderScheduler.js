const cron = require('node-cron');
const PurchaseRequest = require('../models/PurchaseRequest');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');
// Business-timezone clock — send times / day ranges are configured in IST and
// must not be read off the server's local clock. See utils/businessTime.js.
const { businessParts, businessDayRange } = require('./businessTime');
const { slog, swarn, serror, sbeat } = require('./schedulerLog');

const TAG = 'separate-purchase-payment-reminder';

// Tracks "purchaseRequestId:today:userId" triples already sent today.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping) {
  const { todayStart, todayEnd } = businessDayRange();

  // secondReminderDate is set from the individual ("Raise Request" / Separate) modal for
  // payment terms other than "100% Payment". This is the Separate-flow counterpart to
  // purchasePaymentReminderScheduler.js's Bulk-only reminder — kept as its own WhatsApp
  // event so recipients/schedule can be configured independently per flow.
  const requests = await PurchaseRequest.find({
    secondReminderDate: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'Rejected' },
    requestType: 'individual',
  }).populate('vendorId', 'name').lean();

  if (!requests.length) {
    slog(TAG, 'sendTime matched — 0 individual requests with a payment reminder due today');
    return;
  }

  const recipients = (mapping.recipientUserIds || []).filter((u) => u?.mobile);
  if (!recipients.length) {
    swarn(TAG, `sendTime matched, ${requests.length} request(s) due — but this mapping has no recipients with a mobile number`);
    return;
  }
  slog(TAG, `sendTime matched — ${requests.length} individual request(s) due, ${recipients.length} recipient(s)`);

  const { name: templateName, language = 'en' } = mapping.templateId;
  const variables = mapping.variables || [];
  const today = todayKey();

  for (const pr of requests) {
    const fieldValues = {
      requestCode: pr.requestCode || '',
      itemName:    pr.itemName || '',
      qty:         `${pr.qty} ${pr.unit || ''}`.trim(),
      vendorName:  pr.vendorId?.name || '',
      dueDate:     formatDate(pr.secondReminderDate),
      companyName: process.env.COMPANY_NAME || 'HNG',
    };
    const parameters = {};
    for (const v of variables) {
      if (v.templateVariable && v.eventField) {
        parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
      }
    }

    for (const user of recipients) {
      const guardKey = `${pr._id}:${today}:${user._id}`;
      if (guard.has(guardKey)) continue;
      guard.mark(guardKey);

      const result = await sendMessage({ to: user.mobile, templateName, language, parameters });
      if (result.success) {
        slog(TAG, `✅ sent to ${user.fullName} (${user.mobile}) — request: ${pr.requestCode}`);
      } else {
        swarn(TAG, `send failed for ${user.fullName} (${user.mobile}) — request: ${pr.requestCode}: ${result.error}`);
      }
    }
  }
}

async function checkAndSend() {
  try {
    const { hh: currentHH, mm: currentMM } = businessParts();
    guard.purgeStale(todayKey());

    const event = await WhatsAppEvent.findOne({ key: 'separate-purchase-payment-reminder' }).lean();
    if (!event) { sbeat(TAG, `tick ${currentHH}:${currentMM} IST — event 'separate-purchase-payment-reminder' not configured`); return; }

    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .populate('recipientUserIds', 'fullName mobile')
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

function startSeparatePurchasePaymentReminderScheduler() {
  slog(TAG, 'scheduler started — checks DB sendTime every minute');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startSeparatePurchasePaymentReminderScheduler, checkAndSend };
