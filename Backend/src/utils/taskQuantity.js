const Task = require('../models/Task');
const Order = require('../models/Order');

// Resolves how many units a task-name group is allowed to cover for a given
// order line item. Prefers an explicit value from the caller (the frontend
// already derives this per-item — kit lines report their count via overallQty,
// see OperationDetail.jsx's `requiredQty` calc); falls back to looking the
// order line item up directly when the caller didn't send one.
async function resolveRequiredQty(orderId, productIndex, explicitRequiredQty) {
  const explicit = Number(explicitRequiredQty);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (productIndex === undefined || productIndex === null || isNaN(productIndex)) return null;
  const order = await Order.findById(orderId).select('items').lean();
  const item = order?.items?.[Number(productIndex)];
  if (!item) return null;
  if (item.isKit) return Number(item.overallQty) || Number(item.qty) || null;
  return Number(item.qty) || null;
}

// Same-name tasks for a product slot are allowed to stack (e.g. two "Sticker
// placing" tasks assigned to different staff) as long as their combined qty
// doesn't exceed the line item's required quantity. Only a genuine quantity
// overflow is rejected now — a bare task-name repeat used to be rejected
// outright, which blocked splitting one product's work across assignees.
// Returns an error message string if the assignment should be blocked, else null.
async function checkTaskQuantityOverflow({ orderId, productIndex, product, taskName, qty, requiredQty }) {
  if (!taskName || !orderId) return null;
  const dupFilter = { orderId };
  if (productIndex !== undefined && productIndex !== null && !isNaN(productIndex)) {
    dupFilter.productIndex = Number(productIndex);
  } else if (product) {
    dupFilter.product = product;
  } else {
    return null;
  }
  dupFilter.taskName = taskName;

  const existingTasks = await Task.find(dupFilter).select('qty taskCode').lean();
  if (existingTasks.length === 0) return null;

  const existingQty = existingTasks.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
  const newQty = Number(qty) || 0;
  const required = await resolveRequiredQty(orderId, productIndex, requiredQty);
  const productLabel = product || `product #${productIndex}`;

  if (required && required > 0) {
    if (existingQty + newQty > required) {
      return `A "${taskName}" task for "${productLabel}" already covers ${existingQty}/${required} units — adding ${newQty} more would exceed the required quantity. Reduce the quantity or delete an existing task first.`;
    }
    return null;
  }

  // No known required quantity to validate the split against — fall back to the
  // original exact-duplicate guard so tasks can't stack unbounded.
  return `A "${taskName}" task for "${productLabel}" on this order already exists (${existingTasks[0].taskCode}). Delete the existing task first if you need to reassign.`;
}

module.exports = { checkTaskQuantityOverflow };
