const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const Order = require('../models/Order');

// Resolve an order's overall payment status.
// Reconciles the order's OWN total/paid (kit-aware total is computed live in the
// frontend and only gets written back to Order.total when Sales re-saves it) against
// any linked Billing invoice (whose total is frozen at conversion time and can go
// stale if pricing changes afterwards). Neither source alone is reliably current, so
// we take the larger total (never understate what's owed) and the larger paid amount
// (a payment recorded on either side counts) — this keeps Operations/Dispatch/Task
// Management in agreement with what Sales shows instead of one of them going stale.
// Returns one of Task.paymentStatus enum values: 'Paid' | 'Partial' | 'Pending'.
async function resolveOrderPaymentStatus(orderId) {
  if (!orderId) return 'Pending';

  const [order, invoices] = await Promise.all([
    Order.findById(orderId).select('total amount paidAmount balance paymentCollection'),
    Invoice.find({ orderId }).select('total advanceAmount balanceDue status'),
  ]);

  const orderTotal = order ? Number(order.total || order.amount || 0) : 0;
  const orderPaid = order
    ? ((order.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0) || Number(order.paidAmount || 0))
    : 0;

  const invTotal = invoices.reduce((max, i) => Math.max(max, Number(i.total || 0)), 0);
  const invPaid = invoices.reduce((s, i) => s + Number(i.advanceAmount || 0), 0);

  const total = Math.max(orderTotal, invTotal);
  const paid = Math.max(orderPaid, invPaid);

  if (total > 0 && paid >= total) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
}

// Push the resolved payment status onto every task of the order so the
// Task Management + Dispatch screens reflect Billing-tab payments. Dispatch is
// gated on Task.paymentStatus === 'Paid', so this is what unblocks dispatch.
async function syncOrderTasksPayment(orderId) {
  if (!orderId) return null;
  const paymentStatus = await resolveOrderPaymentStatus(orderId);
  await Task.updateMany({ orderId }, { paymentStatus });
  return paymentStatus;
}

// Append a payment entry directly onto the linked Order so Sales (which computes its
// own paid/total off Order.paymentCollection, independent of resolveOrderPaymentStatus)
// reflects payments recorded elsewhere — Billing's Invoice tab or a Quotation-in-Process
// record — without depending on the frontend to find and patch the right order itself.
// Server-side and idempotent-by-construction: it always adds the given entry once, from
// the single call site that recorded the money.
//
// Uses findByIdAndUpdate (not findById + mutate + .save()) deliberately: paymentCollection/
// paidAmount/advancePaid/balance are NOT declared in the (strict:false) Order schema, and
// Mongoose does not track plain property assignment as "modified" for undeclared paths —
// `order.paymentCollection = [...]; await order.save()` silently persists nothing for them.
// findByIdAndUpdate builds the update document directly and always writes.
async function syncOrderPaymentCollection(orderId, entry) {
  if (!orderId || !entry) return null;
  const order = await Order.findById(orderId).select('paymentCollection paidAmount total amount');
  if (!order) return null;
  const priorCollectionSum = (order.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
  // order.paidAmount may already carry an advance that was never pushed as its own
  // paymentCollection entry (e.g. a Lead-stage advance carried onto the order at
  // conversion). Math.max(paidAmount, newTotal) would silently drop that advance the
  // moment cumulative collection entries exceed it — add it once as a baseline instead,
  // then let the new entry add on top, mirroring the frontend's own extraAdvance logic.
  const extraAdvance = Math.max(0, (Number(order.paidAmount) || 0) - priorCollectionSum);
  const paidAmount = priorCollectionSum + extraAdvance + Number(entry.paidAmount || 0);
  const total = Number(order.total || order.amount || 0);
  const balance = Math.max(0, total - paidAmount);
  return Order.findByIdAndUpdate(
    orderId,
    {
      $push: { paymentCollection: entry },
      $set: { paidAmount, advancePaid: paidAmount, balance },
    },
    { new: true }
  );
}

module.exports = { resolveOrderPaymentStatus, syncOrderTasksPayment, syncOrderPaymentCollection };
