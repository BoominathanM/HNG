const Task = require('../models/Task');
const Order = require('../models/Order');
const InventoryItem = require('../models/InventoryItem');
const MaterialStock = require('../models/MaterialStock');
const {
  resolveItemConsumedQty, resolveInventoryAvailable, resolveMaterialStockAvailable,
  deductInventoryForTask, deductMaterialStockForTask, findInventoryItemForLine,
} = require('../modules/sales/sales.controller');
const { packagingViewOfItem, buildPackingRows } = require('./materialStockMatch');

// Resolves how many units a task-name group is allowed to cover for a given
// order line item. Prefers an explicit value from the caller (the frontend
// already derives this per-item — kit lines report their count via overallQty,
// see OperationDetail.jsx's `requiredQty` calc); falls back to looking the
// order line item up directly when the caller didn't send one.
//
// Kit-component rows (Razor inside "Shaving kit", etc.) store their PER-KIT
// RATIO in `item.qty` (e.g. 1 razor per kit), not the order's real total —
// `item.overallQty` is never actually populated on these rows, so the old
// `Number(item.overallQty) || Number(item.qty) || null` fallback silently
// resolved to the bare per-kit ratio (1) instead of ratio × kit count (100).
// That under-counted required qty only surfaced once a SECOND task for the
// same name/product existed (see checkTaskQuantityOverflow's early return
// below), which is why a first partial assignment succeeded but assigning
// the remaining qty afterwards wrongly reported "already covers 50/1 units".
// resolveItemConsumedQty (sales.controller.js) already has the correct ratio
// × kitOrders[].overallQty formula — reuse it instead of re-deriving it here.
async function resolveRequiredQty(orderId, productIndex, explicitRequiredQty) {
  const explicit = Number(explicitRequiredQty);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (productIndex === undefined || productIndex === null || isNaN(productIndex)) return null;
  const order = await Order.findById(orderId).select('items kitOrders kitOverallQty orderCategory').lean();
  const item = order?.items?.[Number(productIndex)];
  if (!item) return null;
  return resolveItemConsumedQty(item, order) || null;
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

// ─── STOCK DEDUCTION AT TASK-ASSIGNMENT TIME ──────────────────────────────────────────────
// Inventory/Material Stock are no longer deducted in bulk when an order is created — they're
// committed per task, the moment a task is actually assigned against a product line (see
// deductStockForTask below). checkLiveStockAvailability is the gate that runs first: unlike
// the old order-creation deduction (which always let an insufficient order through and
// tracked the shortfall for later auto-backfill via backfillPendingDeductionsForItem), a task
// can only be created once its stock is ACTUALLY on hand right now — there's no "create the
// task, deduct the rest whenever it's restocked" state the way there was for an order.
// Both are called from tasks.controller.js's createTask and operations.controller.js's
// assignTask/assignTasksPerProduct, right after checkTaskQuantityOverflow passes.

// Kit outer-packaging tasks are NOT one-task-per-kit: OperationDetail.jsx's Kit Packing modal
// lets a kit's assembly work be split into several labor sub-tasks (e.g. "Assembly" +
// "Sealing"), each its own Task, all sharing `product` = the kit's name/display label and
// NO productIndex ('Kit Packing' is a legacy taskType value from before the Separate/
// Personalized split — still honored for old records, see Frontend's dispatchGrouping.js).
// The outer box/ziplock/butter-paper is consumed ONCE per kit, not once per labor sub-task,
// so deduction here must be idempotent across however many of these get created for the same
// kit — see the materialDeductedQty guard in the two functions below.
const KIT_TASK_TYPES = new Set(['Kit Packing', 'Separate Kit Packing', 'Personalized Kit Packing']);

// Resolves the order + item a task targets. `forWrite` returns a live Mongoose document (so
// deductStockForTask can mutate/save it) instead of a lean object.
// Lean-mode field list must cover everything materialStockMatch.js's packagingViewOfItem /
// effectivePackingSize / findReservedRowsForView read off `order` (kitOrders/kitOverallQty
// for kit-count + component ratios, kitDisplayUnit/displayUnit/kitSize for the kit's outer
// packaging name+size, hotelName/clientName for the hotel-reserved-stock lookup) — missing
// one here would make the live-availability check resolve a different (or no) packing view
// than the real deduction does.
const TASK_TARGET_LEAN_FIELDS = 'items kitOrders kitOverallQty kitDisplayUnit displayUnit kitSize orderCategory orderCode hotelName clientName';

async function loadTaskTarget(orderId, productIndex, taskType, product, { forWrite = false } = {}) {
  if (!orderId) return null;
  const query = Order.findOne({ _id: orderId, deletedAt: null });
  const order = forWrite ? await query : await query.select(TASK_TARGET_LEAN_FIELDS).lean();
  if (!order) return null;
  const hasIndex = !(productIndex === undefined || productIndex === null || isNaN(productIndex));
  if (KIT_TASK_TYPES.has(taskType) && !hasIndex) return { order, isKitPacking: true, item: null, product };
  if (!hasIndex) return null;
  const item = order.items?.[Number(productIndex)];
  if (!item) return null;
  return { order, isKitPacking: false, item };
}

// The kit outer-packaging rows (buildPackingRows, isKit:true) for an order — the authoritative
// "how many packing units does the kit output actually need" (kit count, one per kit, never
// per component), same formula the (retired) order-creation deduction always used.
function kitPackingRows(order) {
  return buildPackingRows(order, order.items || [], (it) => resolveItemConsumedQty(it, order))
    .filter((r) => r.isKit);
}

// Picks the ONE kit-packaging row a kit task targets. Multi-kit orders route each kit's
// packaging to its own Operations destination, so tasks for different kits in the same order
// must not be conflated — matched by the kit component item's own kitName (the same label the
// frontend sends as `product`). Falls back to the order's only kit row when there's just one
// (mirrors materialStockMatch.js's own kitOrders.length===1 fallback), so single-kit orders
// still resolve even when the frontend had no kitCfg to read a name from (Personalized Kit
// tasks on a single-kit order send a generic `product` like "Personalized Kit").
function matchKitPackingRow(order, product) {
  const rows = kitPackingRows(order);
  if (rows.length <= 1) return rows[0] || null;
  const label = String(product || '').trim().toLowerCase();
  if (!label) return null;
  return rows.find((r) => String(r.item?.kitName || '').trim().toLowerCase() === label) || null;
}

// Returns an error message string if a task can't be backed by stock actually on hand right
// now, else null. Checks InventoryItem for the line's own item, and — for a non-kit line with
// a resolvable packing size — the generic MaterialStock pool too. A line that isn't tracked in
// a given pool at all (resolveInventoryAvailable/resolveMaterialStockAvailable returning null)
// is never treated as a shortfall in that pool, same "not tracked here" posture the retired
// order-creation deduction always took.
async function checkLiveStockAvailability({ orderId, productIndex, taskType, product, qty }) {
  const target = await loadTaskTarget(orderId, productIndex, taskType, product);
  if (!target) return null; // can't resolve a specific row — don't block

  if (target.isKitPacking) {
    const row = matchKitPackingRow(target.order, target.product);
    if (!row) return null; // no trackable/matching kit packaging for this task
    const stillNeeded = Math.max(0, row.qty - (Number(row.item.materialDeductedQty) || 0));
    if (stillNeeded <= 0) return null; // this kit's outer packaging is already fully committed
    const available = await resolveMaterialStockAvailable(row.view, target.order);
    if (available !== null && available < stillNeeded) {
      return `Cannot assign "${taskType}" — only ${available} of ${stillNeeded} unit(s) of ${row.view.label || 'the kit packing material'} are in stock right now.`;
    }
    return null;
  }

  const { item, order } = target;
  // A line can carry several tasks under DIFFERENT names (Filling, Capping, Packing…) —
  // checkTaskQuantityOverflow only caps SAME-name stacking (see its own comment), by design,
  // so a product can legitimately have "Filling" qty 100 AND "Packing" qty 100 both created
  // against a 100-unit line: two production steps on the SAME 100 physical units, not 200.
  // Stock must reflect that — capped at what this line still actually needs, not re-checked
  // per task name — or a later differently-named task would find (and reserve) a second,
  // phantom batch of the same material. `stillNeededInv`/`stillNeededMat` below are that cap.
  const requiredQty = resolveItemConsumedQty(item, order);
  const rawNeed = Number(qty) || 0;
  const stillNeededInv = Math.max(0, requiredQty - (Number(item.deductedQty) || 0));
  const need = Math.min(rawNeed, stillNeededInv);
  if (need > 0) {
    const available = await resolveInventoryAvailable(item);
    if (available !== null && available < need) {
      return `Cannot assign task for "${item.itemName || 'this product'}" — only ${available} of ${need} unit(s) are in stock right now.`;
    }
  }
  const isKitLine = !!(item.isKit || item.kitType || item.kitId);
  if (!isKitLine) {
    const view = packagingViewOfItem(item, order);
    if (view.names.length && String(view.size || '').trim()) {
      const stillNeededMat = Math.max(0, requiredQty - (Number(item.materialDeductedQty) || 0));
      const matNeed = Math.min(rawNeed, stillNeededMat);
      if (matNeed > 0) {
        const matAvailable = await resolveMaterialStockAvailable(view, order);
        if (matAvailable !== null && matAvailable < matNeed) {
          return `Cannot assign task for "${item.itemName || 'this product'}" — only ${matAvailable} of ${matNeed} unit(s) of ${view.label || 'its packing material'} are in stock right now.`;
        }
      }
    }
  }
  return null;
}

// Actually deducts the stock backing a newly-created task — call ONLY after
// checkLiveStockAvailability has returned null for the same arguments. Returns the combined
// stockDeductions array ([{ pool, refId, qtyDeducted, productIndex }]) to store on the Task
// doc, so tasks.controller.js's deleteTask can credit back exactly what this took.
async function deductStockForTask({ orderId, productIndex, taskType, product, qty, userId }) {
  const target = await loadTaskTarget(orderId, productIndex, taskType, product, { forWrite: true });
  if (!target) return [];

  if (target.isKitPacking) {
    const row = matchKitPackingRow(target.order, target.product);
    if (!row) return [];
    const stillNeeded = Math.max(0, row.qty - (Number(row.item.materialDeductedQty) || 0));
    if (stillNeeded <= 0) return []; // already fully committed by an earlier sub-task for this kit
    const d = await deductMaterialStockForTask(target.order, row.item, stillNeeded, row.view);
    return d.map((x) => ({ ...x, productIndex: row.idx }));
  }

  const { item, order } = target;
  const idx = Number(productIndex);
  // Mirrors checkLiveStockAvailability's cap above: several differently-named tasks can
  // legitimately target the same line, but must never each deduct the line's full qty — cap
  // at what this line still actually needs (requiredQty minus what's already deducted for
  // it), never the raw task qty on its own.
  const requiredQty = resolveItemConsumedQty(item, order);
  const rawNeed = Number(qty) || 0;
  const stillNeededInv = Math.max(0, requiredQty - (Number(item.deductedQty) || 0));
  const need = Math.min(rawNeed, stillNeededInv);
  const deductions = need > 0
    ? (await deductInventoryForTask(order, item, need, userId)).map((x) => ({ ...x, productIndex: idx }))
    : [];
  const isKitLine = !!(item.isKit || item.kitType || item.kitId);
  if (!isKitLine) {
    const view = packagingViewOfItem(item, order);
    if (view.names.length && String(view.size || '').trim()) {
      const stillNeededMat = Math.max(0, requiredQty - (Number(item.materialDeductedQty) || 0));
      const matNeed = Math.min(rawNeed, stillNeededMat);
      if (matNeed > 0) {
        const matDeductions = (await deductMaterialStockForTask(order, item, matNeed, view)).map((x) => ({ ...x, productIndex: idx }));
        deductions.push(...matDeductions);
      }
    }
  }
  return deductions;
}

// Whether any OTHER active (non-deleted) task still exists for the same line `task` targeted
// — same productIndex for a regular task, or same `product` (kit name) among the other
// KIT_TASK_TYPES for a kit-packaging task. Several differently-named tasks share ONE stock
// reservation for a line (see deductStockForTask's cap), so the reservation must survive as
// long as ANY of them does — only once every task for a line is gone should its stock
// actually go back. Returns false (nothing else claims the line) when the task carries
// neither a productIndex nor an identifiable kit `product` — conservative default so
// reversal is skipped rather than guessed at.
async function hasOtherActiveTaskForLine(task) {
  const hasIndex = task.productIndex !== undefined && task.productIndex !== null;
  if (!hasIndex && !(KIT_TASK_TYPES.has(task.taskType) && task.product)) return true;
  const filter = { orderId: task.orderId, deletedAt: null, _id: { $ne: task._id } };
  if (hasIndex) filter.productIndex = task.productIndex;
  else { filter.taskType = { $in: [...KIT_TASK_TYPES] }; filter.product = task.product; }
  return !!(await Task.exists(filter));
}

// Credits back the stock reserved for the line `task` belonged to — but ONLY once this was
// the LAST active task on that line (hasOtherActiveTaskForLine), and only for the pool(s)
// that task-group's own deduction path actually touches:
//   - a regular per-productIndex task: that item's own deductedQty (InventoryItem) and, only
//     for a non-kit line, materialDeductedQty (its own packing material) — mirrors
//     deductStockForTask's non-kit branch exactly.
//   - a kit-packaging task (Kit Packing / Separate / Personalized): only the kit's
//     representative item's materialDeductedQty (the outer box) — NEVER that same item's own
//     deductedQty, which belongs to a completely different task-group (that component's own
//     per-productIndex tasks) and must not be touched here.
// Reverses the LINE's current total, re-resolved from the order (via findInventoryItemForLine
// / materialDeductedFrom — the same sources deduction itself used), not from this specific
// task's own stockDeductions — the task that happens to be deleted last is often not the one
// whose creation originally triggered the deduction (see checkLiveStockAvailability's cap).
// Called by tasks.controller.js's deleteTask, only for a task that never reached 'Done' — a
// Done task's consumption is real/permanent (the goods were actually produced), so it's never
// reversed regardless of how many sibling tasks for the line remain.
async function reverseStockForTask(task) {
  if (!task.orderId) return;
  const hasIndex = task.productIndex !== undefined && task.productIndex !== null;
  const isKitTask = !hasIndex && KIT_TASK_TYPES.has(task.taskType) && task.product;
  if (!hasIndex && !isKitTask) return; // can't identify which line this task belonged to

  if (await hasOtherActiveTaskForLine(task)) return; // another task still claims this line

  const order = await Order.findOne({ _id: task.orderId, deletedAt: null });
  if (!order) return;
  const item = hasIndex ? order.items?.[Number(task.productIndex)] : matchKitPackingRow(order, task.product)?.item;
  if (!item) return;

  // A kit-packaging task's own reversal touches only materialDeductedQty (below); a regular
  // per-productIndex task reverses its InventoryItem deductedQty, plus — only for a non-kit
  // line — the same item's own materialDeductedQty, exactly mirroring which pool(s)
  // deductStockForTask's two branches each touch.
  const isKitLine = hasIndex && !!(item.isKit || item.kitType || item.kitId);
  let changed = false;
  try {
    if (hasIndex) {
      const invQty = Number(item.deductedQty) || 0;
      if (invQty > 0) {
        const src = await findInventoryItemForLine(item);
        if (src) {
          src.currentStock = (Number(src.currentStock) || 0) + invQty;
          await src.save({ validateBeforeSave: false });
        }
        item.deductedQty = 0;
        changed = true;
      }
    }
    if (!hasIndex || !isKitLine) {
      const matQty = Number(item.materialDeductedQty) || 0;
      if (matQty > 0 && item.materialDeductedFrom) {
        await MaterialStock.updateOne({ _id: item.materialDeductedFrom }, { $inc: { stockCount: matQty } });
        item.materialDeductedQty = 0;
        item.materialDeductedFrom = '';
        changed = true;
      }
    }
  } catch (err) {
    console.error(`Stock reversal failed for task ${task.taskCode}:`, err.message);
  }

  if (changed) {
    order.markModified('items');
    await order.save({ validateBeforeSave: false }).catch((err) => {
      console.error(`Failed to persist reversed deduction for order ${order.orderCode}:`, err.message);
    });
  }
}

module.exports = {
  checkTaskQuantityOverflow, checkLiveStockAvailability, deductStockForTask, reverseStockForTask,
};
