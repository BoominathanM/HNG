const Task = require('../../models/Task');
const Order = require('../../models/Order');
const Lead = require('../../models/Lead');
const DispatchRecord = require('../../models/DispatchRecord');
const StickerRequest = require('../../models/StickerRequest');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');
const { computeTaskEstimate, computeRating } = require('../../utils/taskTime');
const { resolveOrderPaymentStatus } = require('../../utils/syncOrderPayment');
const { checkTaskQuantityOverflow } = require('../../utils/taskQuantity');
const aiService = require('../../services/aiService');

// Notification recipients for a task — every assignee when it has multiple
// (Personalized/Separate Kit Packing tasks), else just the single assignedTo.
function taskRecipients(task) {
  return (task.assignedToMany && task.assignedToMany.length) ? task.assignedToMany : [task.assignedTo].filter(Boolean);
}

// Resolve the time-management fields for a task being created, from its configured
// per-unit time × qty. plannedStartTime defaults to now (the assignment time);
// plannedEndTime is start + estimate. Returns only the fields we want to set.
async function buildTimeFields(body = {}) {
  const plannedStartTime = body.plannedStartTime ? new Date(body.plannedStartTime) : new Date();
  const fields = { plannedStartTime };
  // The Assign Task modals now compute the estimate client-side by summing each
  // sub-task's own task-name × qty (a single parent taskName lookup can't reproduce
  // that aggregate), so trust an explicitly-sent estimate instead of recomputing it.
  if (body.estimatedDurationSec !== undefined) {
    if (body.timePerUnitSec !== undefined) fields.timePerUnitSec = body.timePerUnitSec;
    fields.estimatedDurationSec = body.estimatedDurationSec;
    fields.plannedEndTime = body.plannedEndTime
      ? new Date(body.plannedEndTime)
      : new Date(plannedStartTime.getTime() + body.estimatedDurationSec * 1000);
    return fields;
  }
  const { taskName, taskType, product, qty } = body;
  const { timePerUnitSec, estimatedDurationSec } = await computeTaskEstimate({ taskName, taskType, product, qty });
  if (timePerUnitSec > 0) {
    fields.timePerUnitSec = timePerUnitSec;
    fields.estimatedDurationSec = estimatedDurationSec;
    fields.plannedEndTime = new Date(plannedStartTime.getTime() + estimatedDurationSec * 1000);
  } else if (body.plannedEndTime) {
    fields.plannedEndTime = new Date(body.plannedEndTime);
  }
  return fields;
}

// Forward an order to Dispatch: mark it Dispatch Ready and create its DispatchRecord
// (idempotent). Used both when all sibling tasks finish normally, and when an emergency
// dispatch is fully approved (Sales Head + Ops Head) — which intentionally bypasses the
// "every task Done" requirement, since that's the whole point of an emergency dispatch.
async function forwardOrderToDispatch(orderId, userId) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: 'Dispatch Ready', taskStatus: 'Completed' },
    { new: true }
  );
  if (!order) return null;
  const existing = await DispatchRecord.findOne({ orderId: order._id });
  if (!existing) {
    const dispatchCode = await generateCode('DISP');
    await DispatchRecord.create({
      dispatchCode,
      orderId: order._id,
      status: 'Draft',
      dispatchType: order.deliveryType === 'Partial' ? 'Partial Dispatch' : 'Full Dispatch',
      items: (order.items || []).map((it) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        qtyOrdered: it.qty,
        // Dispatch now starts fully pending — the dispatcher enters how many actually
        // go out per round (see dispatch.controller.js confirmDispatch), instead of the
        // old all-or-nothing model where the full qty was marked dispatched immediately.
        qtyDispatched: 0,
        boxes: it.boxes,
        isKit: it.isKit,
        kitId: it.kitId,
        kitName: it.kitName,
        kitType: it.kitType,
        category: it.category,
      })),
      // Personalized Kit / Separate Kit are dispatched as one unit — seed a progress
      // tracker per kit from the order's static kitOrders definition.
      kitDispatch: (order.kitOrders || []).map((ko) => ({
        kitId: ko.kitId,
        kitName: ko.kitName || ko.kitType,
        category: ko.category || 'separate_kit',
        overallQty: Number(ko.overallQty) || 0,
        dispatchedQty: 0,
      })),
      createdBy: userId,
    });
  }
  return order;
}

exports.getTasks = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.orderId) filter.orderId = req.query.orderId;
  // Visibility scoping (same rule as Sales getLeads/getOrders):
  // - Admin / Super Admin / Manager / Head: all tasks
  // - Everyone else (Executive, etc.): only tasks they created or are assigned to
  if (req.user && req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
    const role = req.user.role || '';
    const isManagerOrHead = /manager|head/i.test(role);
    if (!isManagerOrHead) {
      filter.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
        { assignedToMany: req.user._id },
        { 'subTasks.assignedTo': req.user._id },
      ];
    }
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate({
        path: 'orderId',
        select: 'orderCode clientName orderCategory leadId items status expectedDeliveryDate',
        populate: { path: 'leadId', select: 'leadType' },
      })
      .populate('assignedTo', 'fullName role')
      .populate('assignedToMany', 'fullName role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  // The cached Task.paymentStatus field only gets refreshed by code paths that
  // remember to call syncOrderTasksPayment — resolve it live per order here so
  // Task Management always matches what Sales/Billing show for the same order,
  // instead of occasionally lagging behind a payment recorded elsewhere.
  const orderIds = [...new Set(tasks.filter((t) => t.orderId?._id).map((t) => String(t.orderId._id)))];
  const statusByOrder = {};
  await Promise.all(orderIds.map(async (id) => {
    statusByOrder[id] = await resolveOrderPaymentStatus(id).catch(() => null);
  }));
  tasks.forEach((t) => {
    const oid = t.orderId?._id && String(t.orderId._id);
    if (oid && statusByOrder[oid]) t.paymentStatus = statusByOrder[oid];
  });

  res.status(200).json({ success: true, total, page, data: tasks });
});

// Map a kit's resolved display-unit tab (or legacy logoType) to the StickerRequest
// stickerType queue it is actually tracked under (mirrors Operations/data.js kit routing).
const KIT_TAB_TO_STICKER_TYPE = { Box: 'Box', Ziplock: 'Frosted Ziplock', 'Butter Paper': 'Butter Paper', Sticker: 'Sticker' };
const normYN = (v) => { const s = String(v ?? '').trim().toUpperCase(); return s === 'YES' || s === 'NO' ? s : ''; };
const DESIGN_READY_STATUSES = ['Approved', 'Done', 'In Process', 'Received'];

// Which design queue (Sticker | Box | Frosted Ziplock | Butter Paper) this order line is
// actually tracked under, so its readiness is checked against the RIGHT StickerRequest —
// not just any request for the same product name. '' = no design step required.
function resolveDesignType(it, order) {
  const isKitItem = !!(it.isKit || it.kitType || it.kitName);
  if (isKitItem) {
    const tab = it.displayUnitTab || order.displayUnitTab || '';
    if (KIT_TAB_TO_STICKER_TYPE[tab]) return KIT_TAB_TO_STICKER_TYPE[tab];
    if (['Box', 'Frosted Ziplock', 'Butter Paper', 'Sticker'].includes(it.logoType)) return it.logoType;
    return '';
  }
  if (normYN(it.sticker) === 'YES') return 'Sticker';
  if (it.logoType && it.logoType !== 'None') return it.logoType;
  return '';
}

// Which configured task names actually apply to a given order line item — mirrors the
// frontend's getRelevantTaskOptions (Tasks/index.jsx) so the backend can tell whether a
// product still needs MORE task types assigned, not just whether it has ANY task at all.
function relevantTaskNamesFor(it, timeConfigs, designType, needsPrinting) {
  const productKey = (it.product || it.itemName || it.kitName || '').toLowerCase();
  const productWords = productKey.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const isStickerRouted = designType === 'Sticker';
  const isPackRouted = !isStickerRouted;
  const seen = new Set();
  timeConfigs.forEach((c) => {
    if (!c.taskName || c.active === false || seen.has(c.taskName)) return;
    const name = c.taskName.toLowerCase();
    const cfgProduct = (c.product || '').trim().toLowerCase();
    let relevant;
    if (cfgProduct) {
      relevant = cfgProduct === productKey;
    } else {
      const mentionsProduct = productWords.some((w) => name.includes(w));
      // A blank-product config named e.g. "Personalized Kit Packing"/"Personalized Kit
      // Stickering" is a KIT-LEVEL task type (assigned with no productIndex at all via the
      // Kit Packing Task Assignment flow — see submitKitPackingTask), not a per-product
      // production step. Without this exclusion its generic "pack"/"stick" substring matches
      // every Box/Ziplock/Sticker-routed product's relevantNames, but Done qty for it can
      // never be recorded against any single productIndex — making that product's coverage
      // permanently unsatisfiable regardless of how much real per-product work is completed.
      const isKitLevelName = /kit/.test(name);
      const isStickerTask = !isKitLevelName && /stick|label/.test(name);
      const isPrintTask = !isKitLevelName && /print/.test(name);
      const isPackTask = !isKitLevelName && /pack/.test(name);
      relevant = mentionsProduct
        || (isStickerRouted && isStickerTask)
        || (needsPrinting && isPrintTask)
        || (isPackRouted && isPackTask);
    }
    if (relevant) seen.add(c.taskName);
  });
  return seen;
}

// Whether EVERY product in this order has enough Done-status task coverage for its full
// required qty — i.e. real work is actually finished, not merely "every task document that
// happens to exist is Done". Mirrors computeSuggestedTasks' own per-item
// relevantTaskNamesFor/requiredQty coverage check below, but scoped to one order and
// counting only Done tasks (dispatch readiness needs the work finished, not just assigned).
//
// This replaces the old "siblings.length > 0 && siblings.every(t => t.status === 'Done')"
// check used by updateTaskStatus/dispatchOrder, which was vacuously true whenever a product
// never got ANY task assigned at all — an order with 3 products but tasks created for only
// 2 of them would forward to Dispatch the moment those 2 were marked Done, silently leaving
// the 3rd product's work undone. Once forwarded, that order also drops out of
// computeSuggestedTasks' `status: 'In Production'` filter, so the undone product vanished
// from Today's Checklist too, with no path back onto it.
// Same computation as isOrderReadyForDispatch, but returns WHICH product lines are still
// missing their Done-status task coverage instead of collapsing straight to a boolean —
// lets a readiness preview (e.g. the Task Management "Verify" modal) show the same specific
// products the dispatch gate below will actually block on, instead of a naive "all existing
// task documents are Completed" check that stays green for a product with zero tasks at all.
async function computeOrderDispatchReadiness(orderId) {
  const TaskTimeConfig = require('../../models/TaskTimeConfig');
  const order = await Order.findById(orderId)
    .select('items kitOrders displayUnitTab').lean();
  if (!order || !(order.items || []).length) return { ready: false, missingProducts: [] };

  const tasks = await Task.find({ orderId }).select('productIndex taskName qty status').lean();
  const doneQtyByKey = new Map();
  const doneQtyByProduct = new Map();
  const anyDoneSet = new Set();
  tasks.forEach((t) => {
    if (t.status !== 'Done') return;
    const idxKey = `${t.productIndex ?? 'x'}`;
    anyDoneSet.add(idxKey);
    const key = `${idxKey}-${(t.taskName || '').trim().toLowerCase()}`;
    doneQtyByKey.set(key, (doneQtyByKey.get(key) || 0) + (Number(t.qty) || 0));
    // Total Done qty for this product regardless of which task name it was filed under —
    // used below only as a single-task-type fallback (see productReady), so a task assigned
    // under a name that doesn't exactly match the product's configured task name can't leave
    // real, completed, full-qty work permanently invisible to the dispatch gate.
    doneQtyByProduct.set(idxKey, (doneQtyByProduct.get(idxKey) || 0) + (Number(t.qty) || 0));
  });

  const timeConfigs = await TaskTimeConfig.find({ active: true }).select('taskName product active').lean();

  const missingProducts = [];
  order.items.forEach((it, idx) => {
    const isKitItem = !!(it.isKit || it.kitType || it.kitName);
    const kitOrderMatch = isKitItem
      ? (order.kitOrders || []).find((k) =>
          (it.kitId && k.kitId && String(k.kitId) === String(it.kitId))
          || (k.kitName && it.kitName && k.kitName.toLowerCase() === it.kitName.toLowerCase())
          || (k.kitType && it.kitType && k.kitType.toLowerCase() === it.kitType.toLowerCase()))
      : null;
    const kitOverallQty = Number(kitOrderMatch?.overallQty) || Number(it.overallQty) || 0;
    const requiredQty = isKitItem && kitOverallQty > 0
      ? (Number(it.qty) || 0) * kitOverallQty
      : (Number(it.overallQty) || Number(it.qty) || 0);
    if (requiredQty <= 0) return; // nothing required from this line — can't block on it

    const designType = resolveDesignType(it, order);
    const needsPrintStep = normYN(it.printing) === 'YES';
    const relevantNames = relevantTaskNamesFor(it, timeConfigs, designType, needsPrintStep);
    let productReady;
    if (relevantNames.size > 0) {
      productReady = [...relevantNames].every((name) => {
        const key = `${idx}-${name.trim().toLowerCase()}`;
        return (doneQtyByKey.get(key) || 0) >= requiredQty;
      });
      // Single-step products (exactly one relevant task name) get one more chance before
      // being called missing: if this product's task was assigned via a picker that wasn't
      // scoped to the relevant list (older tasks, or the New Task modal) the taskName on the
      // Task doc can legitimately differ from the configured one even though the qty is real,
      // Done work for THIS exact product. Sum Done qty across every task name for this
      // productIndex and accept that instead. Left OFF for 2+ relevant names — there we can't
      // tell which physical step a mismatched name represents, and each step still needs its
      // own independent coverage (see relevantTaskNamesFor's comment above).
      if (!productReady && relevantNames.size === 1) {
        productReady = (doneQtyByProduct.get(`${idx}`) || 0) >= requiredQty;
      }
    } else {
      // No configured task name matches this product — fall back to "at least one Done task
      // exists for it", matching computeSuggestedTasks' own any-task-exists fallback.
      productReady = anyDoneSet.has(`${idx}`);
    }

    if (!productReady) {
      missingProducts.push({ productIndex: idx, product: it.product || it.itemName || it.kitName || `Item ${idx + 1}` });
    }
  });

  return { ready: missingProducts.length === 0, missingProducts };
}

// Whether EVERY product in this order has enough Done-status task coverage for its full
// required qty — thin boolean wrapper around computeOrderDispatchReadiness, kept so the
// dispatch gate / updateTaskStatus call sites below don't need to change.
async function isOrderReadyForDispatch(orderId) {
  return (await computeOrderDispatchReadiness(orderId)).ready;
}

// Effective TOTAL quantity of an order item. Kit-component items (Paste/Brush inside a Dental
// kit) store their PER-KIT RATIO in `qty` (e.g. 1 paste + 2 brushes per kit — not necessarily
// 1); the true total is that ratio × how many kits were ordered (kitOrders[]'s overallQty, or
// the order-level kitOverallQty fallback) — the exact same formula deductInventoryForOrder
// (above, sales.controller.js) uses to decide how much stock a kit order consumes, and the same
// one this file's own computeSuggestedTasks/computeOrderDispatchReadiness already use for
// `requiredQty`. Standalone (non-kit) items already store their real total directly in `qty`.
function effectiveItemQty(it, order, kitCfgById) {
  if (!(it.isKit || it.kitType)) return Number(it.qty) || 0;
  const perUnitQty = Number(it.qty) || 0;
  const kitCfg = kitCfgById[String(it.kitId)] || null;
  const kitCount = Number(kitCfg?.overallQty) || Number(order.kitOverallQty) || 0;
  if (kitCount > 0) return perUnitQty * kitCount;
  // No resolvable kit count — fall back to a legacy per-item overallQty override, if present.
  return Number(it.overallQty) || perUnitQty || 0;
}

// Returns a Map of lowercase product name -> emergency qty (number) or null (all of that
// product is emergency) for products named in this order's splitDates. Mirrors Operations/
// data.js's getEmergencyProductQtyMap (Frontend) so Today's Checklist reports the exact same
// per-product emergency counts Operations does, instead of only the order-level isUrgent
// boolean it had before. See that file for the fuller comment on the three synthetic
// '__kit__' / '__personalized__' / '__sepkit__:<key>' splitDates product values.
function buildEmergencyQtyMap(order) {
  const map = new Map();
  const kitCfgById = Object.fromEntries(
    (order.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]),
  );
  const includeSet = new Set((order.packagingIncludes || []).map(String));
  const isBundled = (it) => includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName));

  const expandGroup = (items, groupTotalQty, kitEmergencyQty) => {
    if (items.length === 0) return;
    if (kitEmergencyQty === null) {
      items.forEach((it) => {
        const key = (it.product || it.itemName || '').toLowerCase();
        if (key && !map.has(key)) map.set(key, null);
      });
      return;
    }
    if (!groupTotalQty) return;
    items.forEach((it) => {
      const key = (it.product || it.itemName || '').toLowerCase();
      if (!key || map.has(key)) return;
      const itemQty = effectiveItemQty(it, order, kitCfgById);
      const qty = Math.min(Math.round((kitEmergencyQty / groupTotalQty) * itemQty), itemQty);
      map.set(key, qty);
    });
  };

  // Number of KITS ordered (NOT the per-product total) for a kit-flagged item — the shared
  // denominator a splitDate's emergency qty is expressed against (e.g. "50 of the 100 kits").
  // Using Math.max(...effectiveItemQty(...)) here (as a prior version of this did) only
  // happened to equal the real kit count when every component in the kit has a 1-per-kit
  // ratio — a kit with e.g. 2 brushes/kit inflated the denominator to the brush's own
  // multiplied total (200) instead of the real kit count (100), understating every
  // component's proportional emergency share.
  const resolveKitCount = (it) => {
    const kitCfg = kitCfgById[String(it.kitId)] || null;
    return Number(kitCfg?.overallQty) || Number(order.kitOverallQty) || 0;
  };

  const expandLegacyKit = (kitEmergencyQty) => {
    const items = (order.items || []).filter((it) => it.isKit || it.kitType);
    const groupTotalQty = items.length ? Math.max(...items.map(resolveKitCount)) : 0;
    expandGroup(items, groupTotalQty, kitEmergencyQty);
  };

  const expandPersonalized = (kitEmergencyQty) => {
    const items = (order.items || []).filter((it) => it.category === 'personalized' || isBundled(it));
    const kitItemsInGroup = items.filter((it) => it.isKit || it.kitType);
    const groupTotalQty = kitItemsInGroup.length
      ? Math.max(...kitItemsInGroup.map(resolveKitCount))
      : (Number(order.kitOverallQty) || 0);
    expandGroup(items, groupTotalQty, kitEmergencyQty);
  };

  const expandSeparateKit = (kitKey, kitEmergencyQty) => {
    const items = (order.items || []).filter(
      (it) => !isBundled(it) && String(it.kitId || it.kitName || it.kitType) === kitKey,
    );
    const groupTotalQty = items.length ? Math.max(...items.map(resolveKitCount)) : 0;
    expandGroup(items, groupTotalQty, kitEmergencyQty);
  };

  const handleEntry = (product, qty) => {
    if (!product) return;
    if (product === '__kit__') { expandLegacyKit(qty); return; }
    if (product === '__personalized__') { expandPersonalized(qty); return; }
    if (typeof product === 'string' && product.startsWith('__sepkit__:')) {
      expandSeparateKit(product.slice('__sepkit__:'.length), qty);
      return;
    }
    const key = product.toLowerCase();
    if (!map.has(key)) map.set(key, qty);
  };

  (order.splitDates || []).forEach((sd) => {
    (sd.products || []).forEach((ep) => handleEntry(ep.product, ep.qty != null ? Number(ep.qty) : null));
    handleEntry(sd.product, sd.qty != null ? Number(sd.qty) : null);
  });
  return map;
}

// Suggested Tasks: orders ready (or partially ready) for production but not yet fully tasked.
// Readiness is computed from inventory stock + packaging/sticker design status per the doc.
// Shared by GET /suggested (the checklist itself) and GET /suggested/insight (the AI summary
// on top of it), so both always reason about the exact same list.
async function computeSuggestedTasks() {
  const InventoryItem = require('../../models/InventoryItem');
  const StickerRequest = require('../../models/StickerRequest');
  const Kit = require('../../models/Kit');
  const Order = require('../../models/Order');
  const TaskTimeConfig = require('../../models/TaskTimeConfig');
  const MaterialStock = require('../../models/MaterialStock');
  const { resolveMaterialStock } = require('../../utils/materialStockMatch');

  // Only orders still awaiting production — once forwarded to Dispatch Ready the order
  // has already left this workflow, so it shouldn't keep resurfacing here.
  const orders = await Order.find({ deletedAt: null, status: 'In Production' })
    .select('orderCode clientName items kitOrders printingStatus printingStatusOverrides isUrgent isEmergency emergencyApproved displayUnitTab createdAt splitDates packagingIncludes kitOverallQty').lean();
  // Same task NAME can be split across multiple tasks (different assignees), and a product
  // can independently need SEVERAL different task names (e.g. "Filling" then "Packing"),
  // each covering the full required qty on its own — see checkTaskQuantityOverflow /
  // normTaskName in Tasks/index.jsx. So a product only fully leaves this checklist once
  // EVERY relevant task name for it is qty-complete, not the moment a single task exists.
  const existingTasks = await Task.find({ orderId: { $ne: null } }).select('orderId productIndex taskName qty').lean();
  const qtyByKey = new Map(); // `${orderId}-${productIndex}-${normalizedTaskName}` -> summed qty
  existingTasks.forEach((t) => {
    const key = `${t.orderId}-${t.productIndex ?? 'x'}-${(t.taskName || '').trim().toLowerCase()}`;
    qtyByKey.set(key, (qtyByKey.get(key) || 0) + (Number(t.qty) || 0));
  });
  const anyTaskSet = new Set(existingTasks.map((t) => `${t.orderId}-${t.productIndex ?? 'x'}`));
  const timeConfigs = await TaskTimeConfig.find({ active: true }).select('taskName product active').lean();

  // Build a stock lookup by item name (case-insensitive). NOTE: the field is `itemName`,
  // not `name` — selecting/reading `name` silently returned undefined for every item,
  // which meant EVERY product here always showed "Stock 0" regardless of real inventory.
  const stockItems = await InventoryItem.find({ deletedAt: null }).select('itemName currentStock').lean();
  const stockByName = {};
  stockItems.forEach((s) => { stockByName[(s.itemName || '').toLowerCase()] = s.currentStock; });

  // Kits aren't InventoryItems — they're a Kit (components list). Build a lookup so kit
  // line items report real component-stock readiness instead of a false "no match → 0".
  const kits = await Kit.find({ deletedAt: null }).select('kitName products').lean();
  const kitByName = {};
  kits.forEach((k) => { kitByName[(k.kitName || '').toLowerCase()] = k.products || []; });

  // Packing material stock (Box/Ziplock/Butter Paper/Bottle/etc., tracked in Inventory >
  // Material Stocks by name+size) — fetched once and matched per item below via the same
  // resolveMaterialStock helper sales.controller.js's deductMaterialStockForOrder uses, so
  // "is this in stock" here can never disagree with what actually gets deducted on order creation.
  const materialStocks = await MaterialStock.find().select('packingMaterial size stockCount').lean();

  const suggestions = [];
  for (const o of orders) {
    const stickerReqs = await StickerRequest.find({ orderId: o._id }).select('product status stickerType category').lean();
    const emergencyQtyMap = buildEmergencyQtyMap(o);
    (o.items || []).forEach((it, idx) => {
      const productKey = it.product || it.itemName || it.kitName || '';
      const isKitItem = !!(it.isKit || it.kitType || it.kitName);
      // A kit-component item's own `qty` (e.g. Brush/Paste inside "Dental kit") is only the
      // PER-KIT ratio — Sales' applyKitsToForm seeds it straight from the Kit catalog
      // definition ("1 brush per kit") and never multiplies it by the overall kit quantity
      // chosen for this order. The real production requirement is that ratio × however many
      // kits this order actually needs (order.kitOrders[].overallQty), same total the
      // frontend's Kit Packing Task Assignment card computes. Without this, a 10-kit order
      // shows "1" for Brush/Paste instead of "10".
      const kitOrderMatch = isKitItem
        ? (o.kitOrders || []).find((k) =>
            (it.kitId && k.kitId && String(k.kitId) === String(it.kitId))
            || (k.kitName && it.kitName && k.kitName.toLowerCase() === it.kitName.toLowerCase())
            || (k.kitType && it.kitType && k.kitType.toLowerCase() === it.kitType.toLowerCase()))
        : null;
      const kitOverallQty = Number(kitOrderMatch?.overallQty) || Number(it.overallQty) || 0;
      const requiredQty = isKitItem && kitOverallQty > 0
        ? (Number(it.qty) || 0) * kitOverallQty
        : (Number(it.overallQty) || Number(it.qty) || 0);

      // ── Stock readiness ──
      let stock;
      let stockReady;
      if (isKitItem) {
        const components = kitByName[(it.kitName || '').toLowerCase()];
        if (components && components.length) {
          // How many full kits can be assembled right now, limited by the scarcest component.
          stock = Math.min(...components.map((c) => {
            const compStock = stockByName[(c.productName || '').toLowerCase()] ?? 0;
            return Math.floor(compStock / (c.qty || 1));
          }));
          // `stock` is a count of KITS buildable, so it must be compared against kits
          // NEEDED (kitOverallQty), not the per-product unit total in `requiredQty` — a
          // >1 per-kit ratio would otherwise compare mismatched units.
          stockReady = stock >= (kitOverallQty || requiredQty);
        } else {
          // Kit not found in the Kit catalog (legacy/unregistered) — can't verify components,
          // so don't falsely block on an unrelated/zero match.
          stock = null;
          stockReady = true;
        }
      } else {
        stock = stockByName[(it.itemName || '').toLowerCase()] ?? 0;
        stockReady = stock >= requiredQty;
      }

      // ── Design (Sticker / Box / Frosted Ziplock / Butter Paper) readiness ──
      const designType = resolveDesignType(it, o);
      let stickerReady = true;
      if (designType) {
        const match = stickerReqs.find((s) => (s.product || '').toLowerCase() === productKey.toLowerCase()
          && s.stickerType === designType
          && (!it.category || !s.category || s.category === it.category));
        stickerReady = !!match && DESIGN_READY_STATUSES.includes(match.status);
      }

      // ── Printing readiness — only gate items that actually need a print step. ──
      // Sticker-routed items are exempted here: they get their OWN soft gate below
      // (stickerPrintingReady, keyed off this item's own printingStatus/override) which
      // shows the card with just the Stickering chip red-marked until Received/Closed.
      // Hard-hiding them here too (via the order-level printingStatus field) made them
      // disappear from the checklist entirely instead of showing red as intended.
      const needsPrintStep = normYN(it.printing) === 'YES';
      const printingReady = designType === 'Sticker' || !needsPrintStep || !o.printingStatus || ['Closed', 'Received'].includes(o.printingStatus);

      // ── Stickering readiness — a Sticker-routed product can only have its Stickering
      // task assigned once THIS product's own Printing Status (the same value shown in
      // Operations' Product Specifications table) reaches Received/Closed. This is a
      // separate field from `it.printing`/`printingReady` above (that gate covers a
      // different print-step flag and hides the card entirely) — this one is per-item,
      // doesn't hide the card, and only applies when the product is Sticker-routed.
      // Resolution mirrors OperationDetail.jsx's Product Specifications column: the
      // item's own `printingStatus` first, then the order-level override map by product name.
      const overridesMap = o.printingStatusOverrides || {};
      const itemPrintingStatus = it.printingStatus || overridesMap[productKey.toLowerCase()] || '';
      const isStickerRouted = designType === 'Sticker';
      const stickerPrintingReady = !isStickerRouted || ['Closed', 'Received'].includes(itemPrintingStatus);

      // ── Packing material readiness — Personalized Kit Packing needs enough Box/Ziplock/
      // Butter Paper, Shampoo Filling needs enough Bottles, etc. Same soft-gate shape as
      // stickerPrintingReady above: doesn't hide the card, only blocks the matching
      // pack/fill chip (frontend matches on task name). Only gates when a MaterialStock
      // row was actually found for this item's packing material+size — an item whose
      // packaging was never entered into Material Stocks isn't treated as "out of stock",
      // just as "not tracked here" (same posture deductMaterialStockForOrder already takes).
      const materialStockMatch = resolveMaterialStock(it, materialStocks);
      const materialStockReady = !materialStockMatch || (materialStockMatch.stockCount || 0) >= requiredQty;
      const materialShortfall = materialStockReady ? null : {
        material: materialStockMatch.packingMaterial,
        size: materialStockMatch.size,
        available: materialStockMatch.stockCount || 0,
        needed: requiredQty,
      };

      // Printing completion is a hard blocker — there is no physical task to assign until
      // the print step is actually done, so those items don't belong on today's checklist
      // at all (they'll reappear here once printing closes).
      if (!printingReady) return;

      // Only drop this product off the checklist once every task NAME relevant to it
      // (Filling, Packing, etc. — see relevantTaskNamesFor) has been assigned enough qty
      // to cover the full required quantity. Each task name needs the full qty independently
      // (they don't split it between them — see normTaskName in Tasks/index.jsx), so
      // assigning just one of several needed task types must NOT hide the card — the user
      // still needs to come back and assign the others.
      const relevantNames = relevantTaskNamesFor(it, timeConfigs, designType, needsPrintStep);
      if (relevantNames.size > 0) {
        const fullyCovered = [...relevantNames].every((name) => {
          const key = `${o._id}-${idx}-${name.trim().toLowerCase()}`;
          return (qtyByKey.get(key) || 0) >= requiredQty;
        });
        if (fullyCovered) return;
      } else if (anyTaskSet.has(`${o._id}-${idx}`)) {
        // No configured task name matches this product — fall back to the original
        // any-task-exists rule so the card doesn't linger forever with nothing to clear it.
        return;
      }

      // Readiness on this checklist is purely stock-driven now — design/sticker status is
      // tracked separately in Operations and is NOT a "pending" reason here (most orders
      // reach production before a StickerRequest is even raised, and that's still real,
      // assignable work). `designType`/`stickerReady` are kept on the payload as passive
      // metadata only, never surfaced as a blocker or counted in `pending`.
      const pending = [];
      if (!stockReady) pending.push('Inventory stock');
      if (!materialStockReady) pending.push('Packing material');
      // "Emergency" folds every flag the app uses for it elsewhere: `isEmergency` is what
      // the Dispatch queue's own emergency-first sort actually keys on, `isUrgent` is set
      // alongside it on most creation paths, and `emergencyApproved` covers the dual-approval
      // emergency-dispatch flow — an order can arrive via any one of the three.
      const isEmergencyOrder = !!(o.isUrgent || o.isEmergency || o.emergencyApproved);
      // Per-product emergency count from splitDates (kit-aware — see buildEmergencyQtyMap),
      // matching what Operations' production queues show for the same product. `undefined`
      // means this product has no emergency split at all; `null` in the map means the whole
      // requiredQty is emergency (no explicit partial qty was set on the split date).
      const emergencyQtyRaw = emergencyQtyMap.get(productKey.toLowerCase());
      const isEmergencyProduct = emergencyQtyRaw !== undefined;
      const emergencyQty = isEmergencyProduct ? (emergencyQtyRaw === null ? requiredQty : emergencyQtyRaw) : 0;
      suggestions.push({
        id: `${o._id}-${idx}`,
        orderId: o._id, orderCode: o.orderCode, client: o.clientName,
        // `qty` is the real production total (requiredQty), not the raw per-kit ratio
        // stored on kit-component items — see the requiredQty comment above.
        product: it.itemName, qty: requiredQty, logoType: it.logoType,
        isUrgent: isEmergencyOrder,
        emergencyApproved: !!o.emergencyApproved,
        // Per-product emergency qty (of the `qty` total above) — 0 when this specific
        // product has no emergency split, even if the order itself is flagged urgent.
        isEmergencyProduct,
        emergencyQty,
        orderCreatedAt: o.createdAt,
        inventoryStock: stock,
        designType,
        // Passive metadata for the frontend's "Suggested Tasks" chip relevance filter —
        // needsDesign/needsPrinting tell it which task-name keywords actually apply to
        // THIS product (e.g. don't offer a Filling task to a Brush that needs neither
        // a sticker/box design step nor a print step, only Packing).
        needsDesign: !!designType,
        needsPrinting: needsPrintStep,
        stockReady, stickerReady, printingReady,
        // Stickering-only gate — see stickerPrintingReady comment above. itemPrintingStatus
        // is passed through so the UI can show the actual status in its red indicator.
        itemPrintingStatus,
        stickerPrintingReady,
        // Packing/filling-only gate — see materialStockReady comment above. materialShortfall
        // (null when ready) carries the actual material/size/available/needed so the UI can
        // show a specific "Box 15ml: 3 available, 15 needed" message, not just a generic block.
        materialStockReady,
        materialShortfall,
        fullyReady: stockReady, // ready-to-assign now means "stock available" — design/print no longer factor in
        pending, // stock/packing-material shortfall only (task is still shown either way)
      });
    });
  }
  // Emergency orders first, then FIFO by when the order was placed — matches the Dispatch
  // queue's own sort-first-for-emergency rule so Task Management prioritizes the same way.
  suggestions.sort((a, b) => {
    const aEmergency = a.isUrgent || a.emergencyApproved;
    const bEmergency = b.isUrgent || b.emergencyApproved;
    if (aEmergency !== bEmergency) return (bEmergency ? 1 : 0) - (aEmergency ? 1 : 0);
    return new Date(a.orderCreatedAt) - new Date(b.orderCreatedAt);
  });
  return suggestions;
}

exports.getSuggestedTasks = asyncHandler(async (req, res) => {
  const suggestions = await computeSuggestedTasks();
  res.status(200).json({ success: true, total: suggestions.length, data: suggestions });
});

// GET /api/tasks/order/:orderId/readiness — authoritative dispatch-readiness preview, so a
// "Verify" UI can show the exact same missing-product list the dispatch gate (dispatchOrder,
// below) would reject on, instead of a separate naive approximation drifting out of sync.
exports.getOrderDispatchReadiness = asyncHandler(async (req, res) => {
  const result = await computeOrderDispatchReadiness(req.params.orderId);
  res.status(200).json({ success: true, data: result });
});

// GET /api/tasks/suggested/insight — AI-generated prioritized action plan on top of the
// same Today's Checklist data (button-triggered, not auto-run on every poll, to avoid
// spending API credits on every fetch). Persisted to TaskInsight so it survives a page
// refresh — see getLatestTaskInsight below, which is what loads it back on mount.
exports.getSuggestedTasksInsight = asyncHandler(async (req, res, next) => {
  const TaskInsight = require('../../models/TaskInsight');
  const config = await aiService.getAiConfig({ withKey: true });
  const apiKey = aiService.resolveApiKey(config);
  if (!apiKey) {
    return next(new AppError('AI is not configured yet. Add your OpenAI API key under Integration → AI Integration.', 503));
  }

  const suggestions = await computeSuggestedTasks();
  if (!suggestions.length) {
    const insight = 'No pending suggested tasks right now — all caught up.';
    await TaskInsight.findOneAndUpdate({}, { insight, productTasks: {}, generatedAt: new Date() }, { upsert: true });
    return res.status(200).json({ success: true, data: { insight, productTasks: {} } });
  }

  // The org's own production step vocabulary (e.g. "Filling", "Packing", "Sealing") —
  // give the AI these so it recommends real, assignable task names instead of talking
  // about design/sticker status (which isn't tracked as a blocker on this checklist).
  const TaskTimeConfig = require('../../models/TaskTimeConfig');
  const taskNames = [...new Set((await TaskTimeConfig.find({ active: true }).select('taskName').lean()).map((c) => c.taskName).filter(Boolean))];

  try {
    const { insight, productTasks } = await aiService.generateTaskInsight({ apiKey, model: config.model, suggestions, taskNames });
    // Re-key the AI's per-product breakdown to `${orderCode}::${product}` (lowercased) so
    // the frontend can look up a suggestion card's recommendation by the same fields it
    // already has on hand (s.orderCode / s.product), no extra id plumbing required.
    const productTasksMap = {};
    productTasks.forEach((p) => {
      if (!p?.orderCode || !p?.product) return;
      const key = `${p.orderCode}::${p.product}`.toLowerCase();
      productTasksMap[key] = Array.isArray(p.tasks) ? p.tasks.filter(Boolean) : [];
    });
    await TaskInsight.findOneAndUpdate(
      {},
      { insight, productTasks: productTasksMap, generatedAt: new Date() },
      { upsert: true },
    );
    res.status(200).json({ success: true, data: { insight, productTasks: productTasksMap } });
  } catch (err) {
    return next(new AppError(`AI insight failed: ${err.message}`, err.statusCode || 502));
  }
});

// GET /api/tasks/suggested/insight/latest — the last persisted AI insight run (if any),
// with no AI call and no cost. Lets the Today's Checklist tab restore the last analysis
// on page load/refresh instead of showing nothing until "Get AI Insight" is clicked again.
exports.getLatestTaskInsight = asyncHandler(async (req, res) => {
  const TaskInsight = require('../../models/TaskInsight');
  const doc = await TaskInsight.findOne().lean();
  res.status(200).json({
    success: true,
    data: doc ? { insight: doc.insight || '', productTasks: doc.productTasks || {}, generatedAt: doc.generatedAt } : null,
  });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate({
      path: 'orderId',
      select: 'orderCode clientName orderCategory leadId items status expectedDeliveryDate',
      populate: { path: 'leadId', select: 'leadType' },
    })
    .populate('assignedTo', 'fullName role')
    .populate('assignedToMany', 'fullName role');
  if (!task) return next(new AppError('Task not found', 404));

  // Enrich with the product master (Brand, Packing Material, Material Category) for this task's product.
  const InventoryItem = require('../../models/InventoryItem');
  const result = task.toObject();

  // Resolve payment status live (see getTasks) so this view matches Sales/Billing
  // even if the cached field wasn't refreshed by whichever path last touched payment.
  if (result.orderId?._id) {
    const livePaymentStatus = await resolveOrderPaymentStatus(result.orderId._id).catch(() => null);
    if (livePaymentStatus) result.paymentStatus = livePaymentStatus;
  }

  // Resolve the order line item this task corresponds to (by index first, then by name).
  let lineItem = null;
  const items = result.orderId?.items || [];
  if (result.productIndex !== undefined && result.productIndex !== null && items[result.productIndex]) {
    lineItem = items[result.productIndex];
  } else if (result.product) {
    lineItem = items.find((it) => (it.itemName || '').trim().toLowerCase() === (result.product || '').trim().toLowerCase());
  }

  // Look up the inventory master by id (preferred), falling back to an exact name match.
  let inv = null;
  const fields = 'itemName brand packingMaterial materialCategory category unit defaultSize hsnCode';
  if (lineItem?.itemId) inv = await InventoryItem.findById(lineItem.itemId).select(fields).lean();
  if (!inv && result.product) {
    const escaped = String(result.product).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inv = await InventoryItem.findOne({ itemName: new RegExp(`^${escaped}$`, 'i'), deletedAt: null }).select(fields).lean();
  }

  // Merge inventory master with any packaging fields captured on the order line item.
  // productAttributes is the nested spec bag; top-level fields are preferred but fall through.
  const attrs = lineItem?.productAttributes || {};
  result.productDetails = {
    brand: inv?.brand || lineItem?.brand || attrs.brand || lineItem?.material || '',
    packingMaterial: inv?.packingMaterial || lineItem?.packingMaterial || attrs.packingMaterial || lineItem?.packaging || '',
    materialCategory: inv?.materialCategory || inv?.category || lineItem?.materialCategory || attrs.materialCategory || '',
    category: inv?.category || lineItem?.category || '',
    unit: inv?.unit || lineItem?.unit || '',
    size: lineItem?.size || inv?.defaultSize || '',
    hsnCode: inv?.hsnCode || lineItem?.hsnCode || '',
    source: inv ? 'inventory' : (lineItem ? 'order' : 'none'),
  };

  res.status(200).json({ success: true, data: result });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const { orderId, productIndex, product } = req.body;

  // Same task name can be assigned more than once for the same product slot (e.g.
  // split across two staff) as long as the combined qty doesn't exceed the line
  // item's required quantity — only a genuine quantity overflow is blocked.
  if (orderId) {
    const overflowMsg = await checkTaskQuantityOverflow({
      orderId, productIndex, product,
      taskName: req.body.taskName,
      qty: req.body.qty,
      requiredQty: req.body.requiredQty,
    });
    if (overflowMsg) return next(new AppError(overflowMsg, 409));
  }

  // Prevent duplicate Kit Packing task per order
  if (orderId && req.body.taskType === 'Kit Packing') {
    const existingKitPacking = await Task.findOne({ orderId, taskType: 'Kit Packing' });
    if (existingKitPacking) {
      return next(new AppError('A Kit Packing task already exists for this order.', 409));
    }
  }

  const taskCode = await generateCode('TASK');
  const timeFields = await buildTimeFields(req.body);
  // Inherit the order's current paid status if the caller didn't set one — so a
  // task created after payment was already recorded isn't stuck on 'Pending'.
  const paymentFields = (orderId && req.body.paymentStatus === undefined)
    ? { paymentStatus: await resolveOrderPaymentStatus(orderId).catch(() => 'Pending') }
    : {};
  const task = await Task.create({ ...req.body, ...timeFields, ...paymentFields, taskCode, createdBy: req.user._id });
  notifyRoles({ modules: ['Task Management'], userIds: taskRecipients(task), type: 'task', title: 'New Task Assigned', message: `Task ${task.taskCode}: ${task.taskName || task.product || 'Task'} for ${task.clientName || 'order'}`, link: '/tasks' }).catch(() => {});
  res.status(201).json({ success: true, data: task });
});

exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const update = { status };
  if (status === 'In Progress') update.startedAt = Date.now();
  if (status === 'Done') update.completedAt = Date.now();
  if (status === 'Emergency') update.isEmergency = true;

  const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!task) return next(new AppError('Task not found', 404));

  // On completion: measure actual time (start → done) and auto-rate vs the estimate.
  if (status === 'Done') {
    const startMs = task.startedAt ? new Date(task.startedAt).getTime()
      : task.plannedStartTime ? new Date(task.plannedStartTime).getTime()
      : new Date(task.createdAt).getTime();
    const endMs = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    task.actualDurationSec = Math.max(0, Math.round((endMs - startMs) / 1000));
    const { rating, ratingReason, efficiencyPct } = computeRating(task.estimatedDurationSec, task.actualDurationSec);
    if (rating !== null) {
      task.rating = rating;
      task.ratingReason = ratingReason;
      task.efficiencyPct = efficiencyPct;
    }
    if (req.body.feedback !== undefined) task.feedback = req.body.feedback;
    await task.save();
  }

  // Sync to Operations: the emergency-gate check (areAllEmergencyItemsDone in
  // Frontend/Operations/data.js) reads StickerRequest.status, but staff mark work
  // complete here via Task.status — without this sync that gate can never lift.
  // Case-insensitive product match mirrors data.js's findSR(); skip requests already
  // at 'Received' so we don't regress a further-along Operations step.
  if (status === 'Done' && task.orderId && task.product) {
    const escapedProduct = task.product.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await StickerRequest.updateMany(
      {
        orderId: task.orderId,
        product: { $regex: `^${escapedProduct}$`, $options: 'i' },
        status: { $ne: 'Received' },
      },
      { status: 'Done' },
    ).catch(() => {});
  }

  // Automation: when every product on the order has full Done-status task coverage,
  // forward the order to Dispatch — see isOrderReadyForDispatch for why this is NOT simply
  // "every task document that exists is Done" (that was vacuously true for a product that
  // never got any task assigned at all).
  let orderForwarded = false;
  if (status === 'Done' && task.orderId) {
    const siblings = await Task.find({ orderId: task.orderId });
    const allDone = await isOrderReadyForDispatch(task.orderId);
    if (allDone) {
      // Kit orders require a Kit Packing task to be completed before forwarding.
      const orderDoc = await Order.findById(task.orderId).populate('leadId', 'kitDisplayUnit displayUnit');
      const kitDisplayUnit = orderDoc?.kitDisplayUnit || orderDoc?.displayUnit
        || orderDoc?.leadId?.kitDisplayUnit || orderDoc?.leadId?.displayUnit;
      const hasKitPackingTask = siblings.some((t) => t.taskType === 'Kit Packing');

      if (kitDisplayUnit && !hasKitPackingTask) {
        // All product tasks done but Kit Packing not yet assigned — signal the UI.
        await Order.findByIdAndUpdate(task.orderId, { taskStatus: 'Kit Packing Required' });
      } else {
        await forwardOrderToDispatch(task.orderId, req.user._id);
        orderForwarded = true;
      }
    }
  }
  if (status === 'Done') {
    notifyRoles({ modules: ['Task Management'], userIds: taskRecipients(task), type: 'task', title: 'Task Completed', message: `Task ${task.taskCode} (${task.taskName || task.product || 'Task'}) marked as Done`, link: '/tasks' }).catch(() => {});
  }
  if (status === 'Emergency') {
    notifyRoles({ modules: ['Task Management', 'Operations'], userIds: taskRecipients(task), type: 'task', title: 'Emergency Task', message: `Task ${task.taskCode} flagged as Emergency — needs approval`, link: '/tasks' }).catch(() => {});
  }
  if (orderForwarded) {
    notifyRoles({ modules: ['Dispatch Team', 'Operations'], type: 'dispatch', title: 'Order Ready for Dispatch', message: `All tasks complete — order is now Dispatch Ready`, link: '/dispatch' }).catch(() => {});
  }
  res.status(200).json({ success: true, data: task, orderForwarded });
});

// Forward the order linked to a task from Task Management into the Dispatch queue.
// Requires every sibling task on the order to be Done and (unless it's a sample
// order) the order to be fully paid. This only makes the order Dispatch Ready and
// ensures its DispatchRecord exists — it does NOT mark the order/lead as Dispatched.
// The actual "Dispatched" status is only set from the Dispatch module itself
// (dispatch.controller.js confirmDispatch/uploadLR), so Sales/Dispatch don't show
// an order as dispatched just because it was handed off from Task Management.
exports.dispatchOrder = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.orderId) return next(new AppError('This task is not linked to an order', 400));

  const order = await Order.findById(task.orderId).populate('leadId', 'leadType');
  if (!order) return next(new AppError('Order not found', 404));
  // A sibling task's emergency approval already flips this at the order level (see
  // approveEmergencyOps) — fall back to it so every task on the order, not just the one
  // that was individually approved, can bypass gates 1/2 below.
  const emergencyApproved = !!(task.emergencyApproved || order.emergencyApproved);

  // Gate 1 — every product on the order needs full Done-status task coverage, not merely
  // every task document that happens to exist (see isOrderReadyForDispatch) — a product
  // with zero tasks assigned must still block dispatch, not slip through silently.
  // Bypassed for an approved Emergency Dispatch, same as before.
  const siblings = await Task.find({ orderId: task.orderId });
  const allDone = await isOrderReadyForDispatch(task.orderId);
  if (!allDone && !emergencyApproved) {
    const pending = siblings.filter((t) => t.status !== 'Done').length;
    return next(new AppError(
      pending > 0
        ? `${pending} task(s) on this order are not yet completed. Complete all tasks before dispatch.`
        : 'Some products on this order don\'t have a completed task yet. Assign and complete a task for every product before dispatch.',
      400,
    ));
  }

  if (order.status === 'Dispatched') {
    return next(new AppError('This order has already been dispatched.', 400));
  }
  // Order was already forwarded (either by this same action or by the "all tasks Done"
  // automation in updateTaskStatus) — its DispatchRecord already exists, so re-forwarding
  // here would just be a redundant no-op that re-fires notifications. Block it outright.
  if (order.status === 'Dispatch Ready') {
    return next(new AppError('This order has already been sent to Dispatch.', 400));
  }

  // Gate 2 — payment must be settled, unless this is a sample order or an approved Emergency Dispatch.
  const isSample = order.orderCategory === 'SAMPLE' || order.leadId?.leadType === 'SAMPLE';
  if (!isSample && !emergencyApproved) {
    const payStatus = await resolveOrderPaymentStatus(order._id).catch(() => 'Pending');
    if (payStatus !== 'Paid') {
      return next(new AppError(`Payment is "${payStatus}". Dispatch requires full payment or an approved Emergency Dispatch.`, 400));
    }
  }

  // Forward the order into the Dispatch queue (Dispatch Ready + a Draft DispatchRecord).
  // Do NOT mark it Dispatched here — that only happens from an explicit action inside
  // the Dispatch module itself, so this hand-off doesn't prematurely flip Sales/Dispatch status.
  await forwardOrderToDispatch(order._id, req.user._id);
  const dispatch = await DispatchRecord.findOne({ orderId: order._id });

  notifyRoles({ modules: ['Dispatch Team', 'Operations', 'Task Management'], type: 'dispatch', title: 'Order Ready for Dispatch', message: `Order ${order.orderCode || ''} sent to Dispatch from Task Management`, link: '/dispatch' }).catch(() => {});

  res.status(200).json({ success: true, data: { order, dispatch } });
});

exports.approveEmergency = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { emergencyApproved: true, emergencyApprovedBy: req.user._id },
    { new: true }
  );
  if (!task) return next(new AppError('Task not found', 404));
  notifyRoles({ modules: ['Task Management', 'Operations'], userIds: taskRecipients(task), type: 'task', title: 'Emergency Task Approved', message: `Task ${task.taskCode} emergency status approved — proceed immediately`, link: '/tasks' }).catch(() => {});
  res.status(200).json({ success: true, data: task });
});

// List every task with an active emergency-dispatch request, most recent first.
// An order can have several products (= several tasks), each raised as its own
// emergency request — Sales/Operations need one row per task, not a single
// order-level snapshot, or requests raised after the first one get hidden.
exports.getEmergencyRequests = asyncHandler(async (req, res) => {
  const filter = { emergencyRequested: true };
  if (req.query.orderId) filter.orderId = req.query.orderId;
  const tasks = await Task.find(filter)
    .sort('-emergencyRequestedAt')
    .populate('orderId', 'orderCode clientName hotelName')
    .lean();
  res.status(200).json({ success: true, data: tasks });
});

// Request emergency dispatch — flags the task and linked order, notifies Sales + Ops heads
exports.requestEmergencyDispatch = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));

  task.emergencyRequested = true;
  task.emergencyRequestedAt = new Date();
  task.emergencyReason = req.body.reason || '';
  task.isEmergency = true;
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: { emergencyDispatchRequested: true, emergencyTaskId: task._id, isEmergency: true },
    });
  }

  notifyRoles({
    modules: ['Sales', 'Operations'],
    type: 'task',
    title: 'Emergency Dispatch Requested',
    message: `Task ${task.taskCode} — payment pending. Emergency dispatch needs Sales Head + Ops Head approval.`,
    link: '/sales',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

// Request emergency dispatch for every task under an order at once — the "Full Order"
// scope option in the Task Management request modal (as opposed to the single-task
// "This product/kit only" scope handled by requestEmergencyDispatch above). Sales/Ops
// Head still approve one product/task at a time via the existing per-task endpoints —
// this only fans the *request* out across every sibling task.
exports.requestEmergencyDispatchForOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const tasks = await Task.find({ orderId });
  if (!tasks.length) return next(new AppError('No tasks found for this order', 404));

  const reason = req.body.reason || '';
  const requestedAt = new Date();
  await Promise.all(tasks.map((task) => {
    task.emergencyRequested = true;
    task.emergencyRequestedAt = requestedAt;
    task.emergencyReason = reason;
    task.isEmergency = true;
    return task.save();
  }));

  await Order.findByIdAndUpdate(orderId, {
    $set: { emergencyDispatchRequested: true, emergencyTaskId: tasks[0]._id, isEmergency: true },
  });

  notifyRoles({
    modules: ['Sales', 'Operations'],
    type: 'task',
    title: 'Emergency Dispatch Requested — Full Order',
    message: `${tasks.length} task(s) on this order flagged for emergency dispatch. Sales Head + Ops Head approval needed for each.`,
    link: '/sales',
  }).catch(() => {});

  res.status(200).json({ success: true, data: tasks });
});

// Sales Head approval — step 1 of the two-stage emergency approval chain
exports.approveEmergencySales = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.emergencyRequested) return next(new AppError('Emergency dispatch not requested for this task', 400));

  const approvedAt = new Date();
  task.emergencySalesApproved = true;
  task.emergencySalesApprovedBy = req.user._id;
  task.emergencySalesApprovedAt = approvedAt;

  const bothApproved = task.emergencyOpsApproved;
  if (bothApproved) {
    task.emergencyApproved = true;
    task.emergencyApprovedBy = req.user._id;
    task.emergencyApprovedAt = approvedAt;
  }
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: {
        emergencySalesApproved: true,
        emergencySalesApprovedBy: req.user._id,
        emergencySalesApprovedAt: approvedAt,
        ...(bothApproved ? { emergencyApproved: true, emergencyApprovedBy: req.user._id, emergencyApprovedAt: approvedAt } : {}),
      },
    });
  }

  notifyRoles({
    modules: ['Operations'],
    type: 'task',
    title: 'Emergency Dispatch — Sales Head Approved',
    message: `Task ${task.taskCode} emergency dispatch approved by Sales Head. Ops Head approval needed.`,
    link: '/operations',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

// Ops Head approval — step 2 of the two-stage approval; requires Sales Head approval first
exports.approveEmergencyOps = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  if (!task.emergencyRequested) return next(new AppError('Emergency dispatch not requested for this task', 400));
  if (!task.emergencySalesApproved) return next(new AppError('Sales Head must approve before Operations Head', 400));

  const approvedAt = new Date();
  task.emergencyOpsApproved = true;
  task.emergencyOpsApprovedBy = req.user._id;
  task.emergencyOpsApprovedAt = approvedAt;
  task.emergencyApproved = true;
  task.emergencyApprovedBy = req.user._id;
  task.emergencyApprovedAt = approvedAt;
  await task.save();

  if (task.orderId) {
    await Order.findByIdAndUpdate(task.orderId, {
      $set: {
        emergencyOpsApproved: true,
        emergencyOpsApprovedBy: req.user._id,
        emergencyOpsApprovedAt: approvedAt,
        emergencyApproved: true,
        emergencyApprovedBy: req.user._id,
        emergencyApprovedAt: approvedAt,
      },
    });
    // Fully-approved emergency dispatch skips the "every task Done" wait — forward the
    // order to the Dispatch queue right away so it shows up in the Dispatch module.
    await forwardOrderToDispatch(task.orderId, req.user._id);
  }

  notifyRoles({
    modules: ['Task Management', 'Operations', 'Dispatch'],
    userIds: taskRecipients(task),
    type: 'task',
    title: 'Emergency Dispatch Fully Approved',
    message: `Task ${task.taskCode} — Sales + Ops approved. Order forwarded to Dispatch.`,
    link: '/dispatch',
  }).catch(() => {});

  res.status(200).json({ success: true, data: task });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return next(new AppError('Task not found', 404));
  res.status(200).json({ success: true, message: 'Task deleted' });
});
