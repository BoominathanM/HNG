const cron = require('node-cron');
const PurchaseRequest = require('../models/PurchaseRequest');
const WhatsAppEvent = require('../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../models/WhatsAppEventMapping');
const { sendMessage } = require('../services/whatsAppService');
const { todayKey, formatDate, createDailyGuard } = require('./reminderSchedulerCommon');

// Tracks "purchaseRequestId:today:userId" triples already sent today.
const guard = createDailyGuard();

async function sendRemindersForMapping(mapping) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // secondReminderDate is set from the individual ("Raise Request" / Separate) modal for
  // payment terms other than "100% Payment". This is the Separate-flow counterpart to
  // purchasePaymentReminderScheduler.js's Bulk-only reminder — kept as its own WhatsApp
  // event so recipients/schedule can be configured independently per flow.
  const requests = await PurchaseRequest.find({
    secondReminderDate: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'Rejected' },
    requestType: 'individual',
  }).populate('vendorId', 'name').lean();

  if (!requests.length) return;

  const recipients = (mapping.recipientUserIds || []).filter((u) => u?.mobile);
  if (!recipients.length) return;

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
        console.log(`[separate-purchase-payment-reminder] ✅ Sent to ${user.fullName} (${user.mobile}) re: ${pr.requestCode}`);
      } else {
        console.warn(`[separate-purchase-payment-reminder] ⚠️  Failed for ${user.fullName} (${user.mobile}): ${result.error}`);
      }
    }
  }
}

async function checkAndSend() {
  try {
    const now = new Date();
    const currentHH = String(now.getHours()).padStart(2, '0');
    const currentMM = String(now.getMinutes()).padStart(2, '0');
    guard.purgeStale(todayKey());

    const event = await WhatsAppEvent.findOne({ key: 'separate-purchase-payment-reminder' }).lean();
    if (!event) return;

    const mappings = await WhatsAppEventMapping
      .find({ eventId: event._id, isEnabled: true })
      .populate('templateId', 'name language')
      .populate('recipientUserIds', 'fullName mobile')
      .lean();

    for (const mapping of mappings) {
      const [hh, mm] = (mapping.sendTime || '08:00').split(':');
      if (hh !== currentHH || mm !== currentMM) continue;
      await sendRemindersForMapping(mapping);
    }
  } catch (err) {
    console.error('[separate-purchase-payment-reminder] check error:', err.message);
  }
}

function startSeparatePurchasePaymentReminderScheduler() {
  console.log('[separate-purchase-payment-reminder] Scheduler started — every minute checks DB sendTime from event mapping');
  checkAndSend();
  cron.schedule('* * * * *', checkAndSend);
}

module.exports = { startSeparatePurchasePaymentReminderScheduler, checkAndSend };
