const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const Order = require('../models/Order');

// Resolve an order's overall payment status.
// Priority: linked invoices (Billing tab) → order's own payment collection.
// Returns one of Task.paymentStatus enum values: 'Paid' | 'Partial' | 'Pending'.
async function resolveOrderPaymentStatus(orderId) {
  if (!orderId) return 'Pending';

  const invoices = await Invoice.find({ orderId }).select('total advanceAmount balanceDue status');
  if (invoices.length) {
    const allPaid = invoices.every((i) => (i.balanceDue || 0) <= 0);
    if (allPaid) return 'Paid';
    const anyPaid = invoices.some((i) => (i.advanceAmount || 0) > 0);
    return anyPaid ? 'Partial' : 'Pending';
  }

  // No invoice yet — fall back to payment recorded directly on the order.
  const order = await Order.findById(orderId).select('total amount paidAmount balance paymentCollection');
  if (order) {
    const total = Number(order.total || order.amount || 0);
    const paid = (order.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0)
      || Number(order.paidAmount || 0);
    if (total > 0 && paid >= total) return 'Paid';
    if (paid > 0) return 'Partial';
  }
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

module.exports = { resolveOrderPaymentStatus, syncOrderTasksPayment };
