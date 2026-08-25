// Shared "what counts as pending" logic for Alert Configuration — used by both
// the scheduler (utils/alertConfigScheduler.js) and the active-alerts endpoint
// (modules/alerts/alerts.controller.js) so the two never drift out of sync.
const StickerRequest = require('../models/StickerRequest');
const Order = require('../models/Order');
const Task = require('../models/Task');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryItem = require('../models/InventoryItem');
const QuotationRequest = require('../models/QuotationRequest');
const DispatchRecord = require('../models/DispatchRecord');

// Grace period ('low_stock'/'quotation_request' only) — how long a record must stay
// pending before the FIRST alert fires, in milliseconds. Every other group has no grace
// period (graceValue stays null) and fires immediately on first-seen-pending.
function graceMs(config) {
  const val = Number(config.graceValue) || 0;
  if (val <= 0) return 0;
  return config.graceUnit === 'hours' ? val * 60 * 60 * 1000 : val * 24 * 60 * 60 * 1000;
}

// AlertConfig.role matches User.role ('Ziplock'), but StickerRequest.stickerType
// uses the longer label ('Frosted Ziplock') — translate before querying the queue.
const ROLE_TO_STICKER_TYPE = {
  Sticker: 'Sticker',
  Box: 'Box',
  Ziplock: 'Frosted Ziplock',
  'Butter Paper': 'Butter Paper',
  'Wooden Brush': 'Wooden Brush',
  Other: 'Other',
};

// A design item keeps alerting until it's actually dispatched. 'Design Change'
// is deliberately NOT terminal — it loops back into active work.
const TERMINAL_DESIGN_STATUSES = ['Dispatch', 'Received', 'Done'];

function titleFor(config, recordType, record) {
  if (config.group === 'design') {
    return `New ${config.role === 'Ziplock' ? 'Frosted Ziplock' : config.role} order pending — ${record.hotelName || record.product || 'item'}`;
  }
  if (config.group === 'task') {
    return `Task pending — ${record.taskName || record.product || 'Task'} (${record.taskCode || record._id})`;
  }
  const who = config.group === 'sales_approval' ? 'Sales' : 'Operations';
  if (recordType === 'Order') {
    return `${who} approval pending — emergency dispatch (${record.orderCode || record._id})`;
  }
  return `${who} approval pending — ${record.hotelName || record.product || 'item'}`;
}

function linkFor(recordType, record) {
  if (recordType === 'Task') {
    return `/tasks/${record._id}`;
  }
  if (recordType === 'Order') {
    // Emergency-dispatch approval is actioned from the Task, not a dedicated order page.
    return record.emergencyTaskId ? `/tasks/${record.emergencyTaskId}` : '/tasks';
  }
  // StickerRequest queue items are actioned from the order's Operations detail page.
  // OperationDetail.jsx (and every other "view order" link in Operations) matches by
  // the order's orderCode, not its raw _id — `allOrders` there normalizes each order's
  // route id as `o.orderCode || o._id`. `record.orderId` needs to be populated with
  // { orderCode } (see getPendingRecordsForConfig below) for this to resolve correctly;
  // an un-populated ObjectId falls through to the `_id` fallback below, which still
  // matches OperationDetail's own fallback for orders that lack a code.
  if (!record.orderId) return '/operations';
  const orderCode = record.orderId?.orderCode;
  const orderRef = orderCode || record.orderId?._id || record.orderId;
  return `/operations/${orderRef}`;
}

// Returns [{ recordType, recordId, record, title, link }] currently pending for this config.
async function getPendingRecordsForConfig(config) {
  if (config.group === 'design') {
    const stickerType = ROLE_TO_STICKER_TYPE[config.role];
    if (!stickerType) return [];
    const items = await StickerRequest.find({
      stickerType,
      status: { $nin: TERMINAL_DESIGN_STATUSES },
    }).populate('orderId', 'orderCode').lean();
    return items.map((r) => ({
      recordType: 'StickerRequest',
      recordId: r._id,
      record: r,
      title: titleFor(config, 'StickerRequest', r),
      link: linkFor('StickerRequest', r),
    }));
  }

  if (config.group === 'task') {
    // Unlike the other groups (fixed recipientUserIds picked by an admin), a
    // task's recipient is whoever it's assigned to — carried per-item as
    // `recipientUserId` and matched against the logged-in user in
    // modules/alerts/alerts.controller.js instead of against config.recipientUserIds.
    const items = await Task.find({
      assignedTo: { $ne: null },
      status: { $ne: 'Done' },
      deletedAt: null,
    }).lean();
    return items.map((r) => ({
      recordType: 'Task',
      recordId: r._id,
      record: r,
      recipientUserId: r.assignedTo,
      title: titleFor(config, 'Task', r),
      link: linkFor('Task', r),
    }));
  }

  if (config.group === 'dispatch_reason') {
    // Like 'task', the recipient is dynamic — the order's own assigned sales person,
    // not a fixed admin-picked recipientUserIds list — resolved per-record here and
    // matched against the logged-in user in modules/alerts/alerts.controller.js.
    const items = await Order.find({
      dispatchInvoiceMismatchStatus: 'pending',
      assignedTo: { $ne: null },
      deletedAt: null,
    }).lean();
    return items.map((r) => ({
      recordType: 'Order',
      recordId: r._id,
      record: r,
      recipientUserId: r.assignedTo,
      title: `Invoice mismatch pending — Order ${r.orderCode || r._id}`,
      link: '/sales',
    }));
  }

  if (config.group === 'dispatch_status') {
    // Hybrid recipient group — unlike every other group here, this one notifies TWO
    // audiences at once: the order's own assigned sales person (dynamic, resolved
    // per-record exactly like 'dispatch_reason' via recipientUserId) AND the fixed
    // Finance users an admin picks in config.recipientUserIds (like 'lr_payment'). The
    // per-item vs. per-config recipient matching is done in
    // modules/alerts/alerts.controller.js's HYBRID_RECIPIENT_GROUPS handling.
    const RECENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
    const recentCutoff = new Date(Date.now() - RECENT_WINDOW_MS);

    const [partialRounds, completedRounds] = await Promise.all([
      // "Order goes for partial dispatch" — naturally bounded, same as
      // getPendingDispatches: drops out the moment the final round flips
      // dispatchType to 'Full Dispatch' (status leaves 'Confirmed').
      DispatchRecord.find({ status: 'Confirmed', dispatchType: 'Partial Dispatch' })
        .populate('orderId', 'orderCode assignedTo').lean(),
      // "Complete the dispatch process" — the order's final round is fully dispatched.
      // Unlike every other pending set here, 'Dispatched' has no further terminal
      // transition to age it out naturally, so this is capped to a recent window
      // (per-user snooze/stop can dismiss sooner) to keep it from growing without
      // bound over the app's lifetime.
      DispatchRecord.find({ status: 'Dispatched', dispatchedAt: { $gte: recentCutoff } })
        .populate('orderId', 'orderCode assignedTo').lean(),
    ]);

    const toItem = (r, label) => {
      const o = r.orderId;
      if (!o?.assignedTo) return null; // no assigned sales person to notify — nothing to alert on
      return {
        recordType: 'DispatchRecord',
        recordId: r._id,
        record: r,
        recipientUserId: o.assignedTo,
        title: `${label} — Order ${o.orderCode || r.dispatchCode}`,
        link: '/dispatch',
      };
    };

    return [
      ...partialRounds.map((r) => toItem(r, 'Partial dispatch confirmed')),
      ...completedRounds.map((r) => toItem(r, 'Dispatch completed')),
    ].filter(Boolean);
  }

  if (config.group === 'lr_payment') {
    // A vendor LR marked "Not Paid" at upload time starts alerting Finance once its
    // expected delivery date arrives (matches the "Finance will be notified on
    // receiving date" promise shown at LR-upload time) and keeps ringing — through
    // "Partial Paid" — until Finance fully settles it from the Financial →
    // Reimbursement Expense → LR Payment tab.
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const items = await PurchaseOrder.find({
      lrPaymentStatus: { $in: ['Not Paid', 'Partial Paid'] },
      expectedDeliveryDate: { $ne: null, $lte: todayEnd },
    }).lean();
    return items.map((r) => ({
      recordType: 'PurchaseOrder',
      recordId: r._id,
      record: r,
      title: `LR payment due — ${r.itemName || r.poCode}${r.lrNumber ? ` (LR ${r.lrNumber})` : ''}${r.lrPaymentStatus === 'Partial Paid' ? ' (Partially Paid)' : ''}`,
      link: '/financial',
    }));
  }

  if (config.group === 'short_received') {
    // A purchase order the lorry/vendor short-delivered keeps alerting Dispatch, Financial
    // and Purchase (fixed recipientUserIds, admin-picked, same as 'lr_payment') every
    // config.durationMinutes until Purchase marks it 'Completely Received' in the
    // Missing/Short-Received Orders table's Action Taken dropdown — see
    // modules/purchase/purchase.controller.js markActionTaken, which both persists that
    // status and credits the remaining qty to inventory.
    const items = await PurchaseOrder.find({
      dispatchStatus: 'Partially Received',
      actionTakenStatus: { $ne: 'Completely Received' },
    }).lean();
    return items.map((r) => ({
      recordType: 'PurchaseOrder',
      recordId: r._id,
      record: r,
      title: `Short-received order pending — ${r.poCode}${r.missedBy ? ` (missed by ${r.missedBy})` : ''}`,
      link: '/purchase',
    }));
  }

  if (config.group === 'low_stock') {
    // Sync each item's lowStockSince flag before evaluating the grace period — set the
    // moment it's first seen below minStock, cleared once it's back to/above minStock
    // (per product decision: a partial restock that's still below minStock does NOT
    // reset the timer, only crossing back above minStock does). Lazily kept in sync here
    // (this branch runs every scheduler tick) rather than at every stock-mutating call
    // site scattered across inventory/purchase/sales controllers.
    const now = new Date();
    const items = await InventoryItem.find({ deletedAt: null, minStock: { $gt: 0 } });
    for (const item of items) {
      const isLow = item.currentStock < item.minStock;
      if (isLow && !item.lowStockSince) {
        item.lowStockSince = now;
        await item.save({ validateBeforeSave: false });
      } else if (!isLow && item.lowStockSince) {
        item.lowStockSince = null;
        await item.save({ validateBeforeSave: false });
      }
    }

    const grace = graceMs(config);
    return items
      .filter((item) => item.lowStockSince && now.getTime() - new Date(item.lowStockSince).getTime() >= grace)
      .map((item) => ({
        recordType: 'InventoryItem',
        recordId: item._id,
        record: item,
        title: `Low Stock — ${item.itemName} (${item.currentStock}/${item.minStock} ${item.unit || 'units'} remaining, not purchased yet)`,
        link: '/purchase',
      }));
  }

  if (config.group === 'quotation_request') {
    const now = new Date();
    const grace = graceMs(config);
    const items = await QuotationRequest.find({ status: 'asked' }).lean();
    return items
      .filter((r) => {
        const anchor = r.reAskedAt || r.askedAt;
        return anchor && now.getTime() - new Date(anchor).getTime() >= grace;
      })
      .map((r) => ({
        recordType: 'QuotationRequest',
        recordId: r._id,
        record: r,
        title: `Quotation not raised — ${r.itemName}${r.vendorName ? ` (${r.vendorName})` : ''}${r.askCount > 1 ? `, asked ${r.askCount}x` : ''}`,
        link: '/purchase',
      }));
  }

  if (config.group === 'sales_approval' || config.group === 'operations_approval') {
    const approvedField = config.group === 'sales_approval' ? 'salesApproved' : 'opsHeadApproved';
    const emergencyField = config.group === 'sales_approval' ? 'emergencySalesApproved' : 'emergencyOpsApproved';

    const [stickerPending, orderPending] = await Promise.all([
      StickerRequest.find({ status: 'Waiting for Approval', [approvedField]: false }).populate('orderId', 'orderCode').lean(),
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
