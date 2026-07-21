// Shared "what counts as pending" logic for Alert Configuration — used by both
// the scheduler (utils/alertConfigScheduler.js) and the active-alerts endpoint
// (modules/alerts/alerts.controller.js) so the two never drift out of sync.
const StickerRequest = require('../models/StickerRequest');
const Order = require('../models/Order');

// AlertConfig.role matches User.role ('Ziplock'), but StickerRequest.stickerType
// uses the longer label ('Frosted Ziplock') — translate before querying the queue.
const ROLE_TO_STICKER_TYPE = {
  Sticker: 'Sticker',
  Box: 'Box',
  Ziplock: 'Frosted Ziplock',
  'Butter Paper': 'Butter Paper',
};

// A design item keeps alerting until it's actually dispatched. 'Design Change'
// is deliberately NOT terminal — it loops back into active work.
const TERMINAL_DESIGN_STATUSES = ['Dispatch', 'Received', 'Done'];

function titleFor(config, recordType, record) {
  if (config.group === 'design') {
    return `New ${config.role === 'Ziplock' ? 'Frosted Ziplock' : config.role} order pending — ${record.hotelName || record.product || 'item'}`;
  }
  const who = config.group === 'sales_approval' ? 'Sales' : 'Operations';
  if (recordType === 'Order') {
    return `${who} approval pending — emergency dispatch (${record.orderCode || record._id})`;
  }
  return `${who} approval pending — ${record.hotelName || record.product || 'item'}`;
}

function linkFor(recordType, record) {
  if (recordType === 'Order') {
    // Emergency-dispatch approval is actioned from the Task, not a dedicated order page.
    return record.emergencyTaskId ? `/tasks/${record.emergencyTaskId}` : '/tasks';
  }
  // StickerRequest queue items are actioned from the order's Operations detail page.
  return record.orderId ? `/operations/${record.orderId}` : '/operations';
}

// Returns [{ recordType, recordId, record, title, link }] currently pending for this config.
async function getPendingRecordsForConfig(config) {
  if (config.group === 'design') {
    const stickerType = ROLE_TO_STICKER_TYPE[config.role];
    if (!stickerType) return [];
    const items = await StickerRequest.find({
      stickerType,
      status: { $nin: TERMINAL_DESIGN_STATUSES },
    }).lean();
    return items.map((r) => ({
      recordType: 'StickerRequest',
      recordId: r._id,
      record: r,
      title: titleFor(config, 'StickerRequest', r),
      link: linkFor('StickerRequest', r),
    }));
  }

  if (config.group === 'sales_approval' || config.group === 'operations_approval') {
    const approvedField = config.group === 'sales_approval' ? 'salesApproved' : 'opsHeadApproved';
    const emergencyField = config.group === 'sales_approval' ? 'emergencySalesApproved' : 'emergencyOpsApproved';

    const [stickerPending, orderPending] = await Promise.all([
      StickerRequest.find({ status: 'Waiting for Approval', [approvedField]: false }).lean(),
      Order.find({ emergencyDispatchRequested: true, [emergencyField]: false }).lean(),
    ]);

    return [
      ...stickerPending.map((r) => ({
        recordType: 'StickerRequest',
        recordId: r._id,
        record: r,
        title: titleFor(config, 'StickerRequest', r),
        link: linkFor('StickerRequest', r),
      })),
      ...orderPending.map((r) => ({
        recordType: 'Order',
        recordId: r._id,
        record: r,
        title: titleFor(config, 'Order', r),
        link: linkFor('Order', r),
      })),
    ];
  }

  return [];
}

module.exports = { getPendingRecordsForConfig, ROLE_TO_STICKER_TYPE, TERMINAL_DESIGN_STATUSES };
