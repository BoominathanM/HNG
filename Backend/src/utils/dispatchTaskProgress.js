// How many units of each dispatchable Dispatch row are FINISHED in Task Management (Done
// tasks), so confirmDispatch can refuse a "Dispatch Now" count above it. ORD-260042: 1000
// personalized kits ordered, every task Done at 500, and Dispatch still accepted 1000.
//
// Server-side twin of Frontend utils/dispatchGrouping.js (`completedQty` /
// getRowDispatchableQty) — same rows, same task matching, same counts. Keep the two in sync.
//   Personalized / Separate Kit header → kits its kit-level packing step has Done (batch by
//     batch), or — with no kit-level task — the fewest kits its components' own tasks cover.
//   Separate Product → units its per-product tasks have Done, less the portion bundled into
//     the personalized kit.

const KIT_PACKING_TASK_TYPES = ['Kit Packing', 'Separate Kit Packing', 'Personalized Kit Packing'];

// Units of one order line finished. Each task name is its own step, so the line is only as
// far along as its least-done step; a name holding a task saved without a qty counts as
// fully done once every task under it is Done.
function lineDoneQty(tasks, fullQty) {
  if (!tasks || !tasks.length) return 0;
  const byName = new Map();
  tasks.forEach((t) => {
    const name = (t.taskName || '').trim().toLowerCase();
    const g = byName.get(name) || { doneQty: 0, hasUnsized: false, allDone: true };
    const qty = Number(t.qty) || 0;
    const done = t.status === 'Done';
    if (qty > 0) { if (done) g.doneQty += qty; } else g.hasUnsized = true;
    if (!done) g.allDone = false;
    byName.set(name, g);
  });
  const perName = [...byName.values()].map((g) => (g.hasUnsized && g.allDone ? fullQty : g.doneQty));
  return Math.max(0, Math.min(fullQty, ...perName));
}

// Kits a kit-level packing step has finished — mirrors Frontend utils/kitPackingProgress.js
// kitsReadyForNextStep: fully done → the kit count; otherwise the fewest Done kits across
// task names; uncountable (a task saved without a qty) → 0 until all are Done.
function kitsDoneByKitTasks(tasks, kitCount) {
  const count = Number(kitCount) || 0;
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'Done');
  const byName = new Map();
  tasks.forEach((t) => {
    const name = (t.taskName || '').trim().toLowerCase();
    const g = byName.get(name) || { qty: 0, doneQty: 0, hasUnsized: false };
    const qty = Number(t.qty) || 0;
    if (qty > 0) {
      g.qty += qty;
      if (t.status === 'Done') g.doneQty += qty;
    } else g.hasUnsized = true;
    byName.set(name, g);
  });
  const groups = [...byName.values()];
  const sized = groups.filter((g) => !g.hasUnsized);
  const short = count > 0 && sized.some((g) => g.qty < count);
  if (allDone && !short) return count > 0 ? count : Infinity;
  if (!groups.length || sized.length !== groups.length) return 0;
  const doneKits = Math.min(...sized.map((g) => g.doneQty));
  return count > 0 ? Math.min(doneKits, count) : doneKits;
}

// -> { kitCaps: Map(kitDispatch _id -> { completed, name }), itemCaps: Map(dispatch item _id -> { completed, name }) }
function computeDispatchCompletedCaps(dispatch, order, tasks) {
  const kitCaps = new Map();
  const itemCaps = new Map();
  const taskList = (tasks || []).filter((t) => !t.deletedAt);
  const orderItems = order?.items || [];

  // Same item shape as dispatchGrouping.js rawItems — kit fields fall back to the order's
  // own item at the same index (older DispatchRecords lack them).
  const rawItems = (dispatch.items || []).map((it, i) => {
    const fb = orderItems[i] || {};
    return {
      _id: String(it._id),
      name: it.itemName || it.product || fb.product || fb.itemName || fb.name || '',
      isKit: it.isKit ?? fb.isKit ?? false,
      kitId: String(it.kitId || fb.kitId || ''),
      kitName: it.kitName || fb.kitName || '',
      kitType: it.kitType || fb.kitType || '',
      qtyOrdered: Number(it.qtyOrdered ?? fb.qty) || 0,
      productIndex: i,
    };
  });

  const productTasksByIndex = new Map();
  taskList.forEach((t) => {
    if (KIT_PACKING_TASK_TYPES.includes(t.taskType) || t.productIndex === undefined || t.productIndex === null) return;
    const idx = Number(t.productIndex);
    if (!productTasksByIndex.has(idx)) productTasksByIndex.set(idx, []);
    productTasksByIndex.get(idx).push(t);
  });

  const kitOrdersList = order?.kitOrders || [];
  const piRaw = order?.packagingIncludes || [];
  const includedIds = new Set(
    (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null)
      ? piRaw.map((p) => String(p.id))
      : piRaw.map((id) => String(id))
  );
  const piQty = order?.packagingIncludesQty || {};
  const personalizedIndex = kitOrdersList.findIndex((ko) => (ko?.category || 'separate_kit') === 'personalized');
  const includedKitOrderIndices = new Set();
  if (personalizedIndex !== -1 && includedIds.size > 0) {
    kitOrdersList.forEach((ko, ki) => {
      if (ki === personalizedIndex) return;
      if (ko?.kitId && includedIds.has(String(ko.kitId))) includedKitOrderIndices.add(ki);
    });
  }
  // Bundled qty of a Separate Product packed into the personalized kit (by name); no
  // packagingIncludesQty entry = legacy, fully bundled.
  const bundledQtyFor = (it) => {
    if (personalizedIndex === -1 || it.kitId || it.isKit || !includedIds.has(it.name)) return 0;
    const explicit = piQty[it.name];
    return explicit != null ? Number(explicit) || 0 : it.qtyOrdered;
  };

  const personalizedHeaderNames = kitOrdersList
    .filter((ko, ki) => (ko?.category || 'separate_kit') === 'personalized' && !includedKitOrderIndices.has(ki))
    .map((ko) => (rawItems.find((it) => ko.kitId && it.kitId === String(ko.kitId) && it.kitName)?.kitName
      || ko.kitName || ko.kitType || '').trim().toLowerCase());

  const matched = new Set();
  kitOrdersList.forEach((ko, ki) => {
    if (!ko || includedKitOrderIndices.has(ki)) return;
    const kitId = String(ko.kitId || '');
    const overallQty = Number(ko.overallQty) || 0;
    const isPersonalized = (ko.category || 'separate_kit') === 'personalized';

    const kitItems = rawItems.filter((it) => {
      if (matched.has(it._id)) return false;
      if (kitId && it.kitId) return it.kitId === kitId;
      const refLow = (it.kitType || it.kitName || '').toLowerCase();
      const koLow = (ko.kitName || ko.kitType || '').toLowerCase();
      return !!refLow && !!koLow && refLow === koLow;
    });
    kitItems.forEach((it) => matched.add(it._id));
    const kitName = ko.kitName || ko.kitType || `Kit ${ki + 1}`;
    const realKitName = kitItems.find((it) => it.kitName)?.kitName || kitName;

    const incNames = [];
    let components = [...kitItems];
    if (ki === personalizedIndex) {
      includedKitOrderIndices.forEach((incKi) => {
        const incKo = kitOrdersList[incKi];
        const incKitId = String(incKo.kitId || '');
        const incItems = rawItems.filter((it) => !matched.has(it._id) && !!incKitId && it.kitId === incKitId);
        incItems.forEach((it) => matched.add(it._id));
        if (incItems.length) {
          incNames.push(incItems.find((it) => it.kitName)?.kitName || incKo.kitName || incKo.kitType || `Kit ${incKi + 1}`);
          components = components.concat(incItems);
        }
      });
      if (includedIds.size > 0) {
        components = components.concat(rawItems.filter((it) => !matched.has(it._id) && !it.kitId && !it.isKit && !!it.name && includedIds.has(it.name)));
      }
    }
    const bundlesOthers = components.length > kitItems.length;

    const realKitLow = realKitName.trim().toLowerCase();
    const takesUnclaimed = isPersonalized && (bundlesOthers || personalizedHeaderNames.length === 1);
    const kitLevelTasks = taskList.filter((t) => {
      const product = (t.product || '').trim().toLowerCase();
      if (!isPersonalized) return (t.taskType === 'Separate Kit Packing' || t.taskType === 'Kit Packing') && product === realKitLow;
      if (t.taskType !== 'Personalized Kit Packing') return false;
      return product === realKitLow || (takesUnclaimed && !personalizedHeaderNames.includes(product));
    });

    const componentKitsDone = (it) => {
      const lineTasks = productTasksByIndex.get(it.productIndex);
      if (it.kitId || it.isKit) {
        const perKit = it.qtyOrdered || 1;
        return Math.floor(lineDoneQty(lineTasks, perKit * overallQty) / perKit);
      }
      const bundled = bundledQtyFor(it);
      if (bundled <= 0 || overallQty <= 0) return overallQty;
      return Math.floor((Math.min(lineDoneQty(lineTasks, it.qtyOrdered), bundled) * overallQty) / bundled);
    };
    let completed = kitLevelTasks.length
      ? kitsDoneByKitTasks(kitLevelTasks, overallQty)
      : (components.length ? Math.min(...components.map(componentKitsDone)) : 0);
    if (overallQty > 0) completed = Math.min(completed, overallQty);

    const kd = (dispatch.kitDispatch || []).find((k) => String(k.kitId) === kitId);
    if (kd) kitCaps.set(String(kd._id), { completed, name: [realKitName, ...incNames].join(' + ') });
  });

  // Separate Product rows — every item no kit header took. Dispatch Now posts these by
  // dispatch item _id.
  rawItems.forEach((it) => {
    if (matched.has(it._id)) return;
    const bundled = bundledQtyFor(it);
    const completed = Math.max(0, lineDoneQty(productTasksByIndex.get(it.productIndex), it.qtyOrdered) - bundled);
    itemCaps.set(it._id, { completed, name: it.name || 'Product' });
  });

  return { kitCaps, itemCaps };
}

module.exports = { computeDispatchCompletedCaps };
