import { kitsReadyForNextStep } from './kitPackingProgress';

// Groups a dispatch's line items into the same three buckets Sales/Operations use:
//   personalizedKit   — a kit + extras customized as one unit (dispatched as ONE unit —
//                        one count, one open/close photo pair, regardless of how many
//                        components it contains)
//   separateKit       — a kit purchased as-is (also dispatched as one unit, same as above)
//   separateProduct   — an individual non-kit product (dispatched — and photographed —
//                        per line item)
//
// DispatchRecord.items is the source of truth for per-product qty (qtyOrdered/
// qtyDispatched), but older dispatch records were created before kit fields (kitId/
// kitName/kitType/category/boxes) were copied onto them — so we fall back to the
// order's own item at the same array position (orderItems), which has always carried
// those fields, to recover kit grouping for those legacy records.
//
// `kitDispatch` (DispatchRecord.kitDispatch) is the per-kit dispatch-progress tracker —
// overallQty/dispatchedQty/openBoxPhotos/closeBoxPhotos for the kit AS A WHOLE. It's
// matched to each kitOrders entry by kitId. Legacy records created before this field
// existed have no kitDispatch entries — those kits are treated as already fully
// dispatched (matching the old all-dispatched-on-creation behavior they were built
// under), so they show 0 pending and no photo action is needed.
//
// Each dispatchable row also gets `completedQty` (when `tasks` is passed): how many of its
// units are FINISHED in Task Management (Done tasks). "Dispatch Now" is capped at that minus
// what's already dispatched (getRowDispatchableQty) — ORD-260042 had every task Done at 500
// of 1000 personalized kits and Dispatch still accepted 1000. Backend confirmDispatch
// enforces the same cap via utils/dispatchTaskProgress.js — keep the two in sync.
const KIT_PACKING_TASK_TYPES = ['Kit Packing', 'Separate Kit Packing', 'Personalized Kit Packing'];

// Units of one order line finished in Task Management. Each task name is its own step
// (e.g. "Soap packing" + "Soap stickering"), so the line is only as far along as its
// least-done step. A name holding a task saved without a qty can't be counted — it counts
// as fully done once every task under it is Done. `fullQty` = the line's total qty.
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

export function buildDispatchGroupedProducts({ items, kitOrders, orderItems, boxes, kitDispatch, packagingIncludes, packagingIncludesQty, tasks }) {
  const dispatchItems = items || [];
  const sourceOrderItems = orderItems || [];
  const kitDispatchByKitId = new Map((kitDispatch || []).map((kd) => [String(kd.kitId), kd]));

  // A Task is "assigned" once it has a single or multi assignee. Kit Packing tasks from
  // Operations (see OperationDetail.jsx submitKitPackingTask) are created per category —
  // taskType 'Personalized Kit Packing' or 'Separate Kit Packing' — not a single shared
  // 'Kit Packing' type, so each category's kit header rows must be gated by its OWN
  // matching task type (legacy 'Kit Packing' records are still honored for either, since
  // they predate the category split). Individual product tasks (assignTasksPerProduct)
  // each carry the order.items array index they were fanned out for — matched below via
  // each raw item's own position in that array.
  const isTaskAssigned = (t) => !!(t.assignedTo || (t.assignedToMany && t.assignedToMany.length));
  const taskList = tasks || [];
  // `tasks` omitted entirely (undefined) means the caller hasn't wired task data through
  // yet — keep their original unrestricted display rather than disabling everything.
  // Only a caller that explicitly passes an array (even an empty one, meaning genuinely
  // no tasks assigned yet) opts into gating rows by assignment.
  const gatingActive = tasks !== undefined;
  const assignedProductIndices = new Set(
    taskList
      .filter((t) => t.taskType !== 'Kit Packing' && t.productIndex !== undefined && t.productIndex !== null && isTaskAssigned(t))
      .map((t) => Number(t.productIndex))
  );
  // Per-product tasks (Suggested Tasks / assignTasksPerProduct) by order-line index — feeds
  // lineDoneQty for each row's completedQty.
  const productTasksByIndex = new Map();
  taskList.forEach((t) => {
    if (KIT_PACKING_TASK_TYPES.includes(t.taskType) || t.productIndex === undefined || t.productIndex === null) return;
    const idx = Number(t.productIndex);
    if (!productTasksByIndex.has(idx)) productTasksByIndex.set(idx, []);
    productTasksByIndex.get(idx).push(t);
  });

  // "Select Kit(s) to Include" (order.packagingIncludes) is Sales' physical packing
  // instruction — a separate kit's kitId, or a separate product's name, that's packed
  // INSIDE the personalized kit's box rather than shipped on its own (see docComposition.js
  // computePersonalizedComposition, which folds the same ids into the invoice's Section A).
  // Mirror that here: an included separate kit/product renders as extra child rows under
  // the Personalized Kit header instead of its own Separate Kit/Product row, since it ships
  // and gets photographed as part of the SAME box. Anything not listed here is completely
  // unaffected — same separate header + own dispatch count as before.
  const piRaw = packagingIncludes || [];
  const includedIds = new Set(
    (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null)
      ? piRaw.map((p) => String(p.id))
      : piRaw.map((id) => String(id))
  );
  // How much of a Separate PRODUCT (matched by name below) is actually packed inside the
  // personalized kit's box — a product is often only PARTIALLY bundled (e.g. ordered at 20,
  // only 5 packed into the kit), and the other 15 still ship as their own standalone
  // Separate Product with their own box/photo/count. A name with NO packagingIncludesQty
  // entry predates that field and is treated as fully bundled (matches the historical
  // all-or-nothing behavior for those legacy records).
  const piQty = packagingIncludesQty || {};

  // Note: `isKit` marks an item as belonging to a kit (every component of a
  // "Dental kit" carries isKit:true, kitId, etc) — it is NOT a "this is just a
  // kit summary row, skip it" flag, so it must NOT be filtered out here, or
  // every real kit component vanishes before grouping/matching even runs.
  const rawItems = dispatchItems.map((it, i) => {
    const fallback = sourceOrderItems[i] || {};
    return {
      ...it,
      isKit: it.isKit ?? fallback.isKit ?? false,
      kitId: it.kitId || fallback.kitId || '',
      kitName: it.kitName || fallback.kitName || '',
      kitType: it.kitType || fallback.kitType || '',
      category: it.category || fallback.category || '',
      boxes: it.boxes ?? fallback.boxes ?? 0,
      qtyOrdered: it.qtyOrdered ?? fallback.qty ?? 0,
      qtyDispatched: it.qtyDispatched ?? 0,
      // This item's own position in order.items — DispatchRecord.items is seeded 1:1
      // in the same order (see forwardOrderToDispatch), so it lines up with the
      // per-product Task.productIndex assignTasksPerProduct fanned out against.
      productIndex: i,
    };
  });

  const kitOrdersList = kitOrders || [];
  const hasKitMeta = rawItems.some((it) => it.kitId || it.kitType);
  const orderBoxes = boxes || 0;

  const toRow = (item, i, type = 'product', extra = {}) => ({
    key: item._id || `${type}_${i}`,
    itemId: item._id,
    name: item.product || item.name || item.itemName,
    boxes: item.boxes || 0,
    verified: item.verified,
    openBoxPhotos: item.openBoxPhotos || [],
    closeBoxPhotos: item.closeBoxPhotos || [],
    type,
    ...extra,
  });

  // `bundledQty` reduces what this row still needs shipped ON ITS OWN — a product
  // partially packed into the personalized kit only needs its REMAINING (unbundled) qty
  // dispatched independently; the bundled portion ships with, and is accounted for by,
  // the kit itself (mirrors the same reduction in Backend dispatch.controller.js's
  // confirmDispatch completion check, so the UI's Dispatch Now cap and the server's
  // "fully dispatched" requirement always agree on the same number).
  const productRowExtra = (item, bundledQty = 0) => {
    const orderedQty = Math.max(0, (item.qtyOrdered || 0) - bundledQty);
    return {
      qtyOrdered: orderedQty,
      qtyDispatched: item.qtyDispatched || 0,
      pendingQty: Math.max(0, orderedQty - (item.qtyDispatched || 0)),
      assigned: !gatingActive || assignedProductIndices.has(item.productIndex),
      // Finished units, less the bundled portion — that's reserved for the personalized kit.
      ...(gatingActive ? {
        completedQty: Math.max(0, lineDoneQty(productTasksByIndex.get(item.productIndex), item.qtyOrdered || 0) - bundledQty),
      } : {}),
    };
  };

  // No kit info anywhere — flat product list (unchanged from before).
  if (!kitOrdersList.length && !hasKitMeta) {
    const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct', ...productRowExtra(item) }));
    return { products: flat, groupedProducts: flat };
  }

  const rows = [];
  const verifiable = [];
  const matchedItemIds = new Set();
  // itemId -> bundled qty, for every Separate Product only PARTIALLY packed into the
  // personalized kit — populated below, read back when building its own Separate Product
  // row so that row's required qty is reduced by the bundled portion instead of its full
  // order qty.
  const partiallyBundledQtyByItemId = new Map();

  if (kitOrdersList.length > 0) {
    // Which OTHER kitOrders entries are packed inside the personalized kit (see comment
    // above) — these get folded into the personalized header's children below instead of
    // getting their own header. Only meaningful when a personalized kit actually exists in
    // this order; otherwise packagingIncludes is ignored entirely. A kit tagged
    // 'personalized' itself is folded too when it's listed — e.g. ORD-260042: Dental kit +
    // Shaving kit (both 'personalized') + Lilly soap + Shampoo all packed into ONE outer
    // box × 1000. Skipping those gave the Shaving kit its own Personalized header, so the
    // page showed "Kit 1" + "Kit 2" and 0/2000 instead of one package of 1000. A second
    // personalized kit NOT listed in packagingIncludes (ORD-260041) keeps its own header.
    const personalizedIndex = kitOrdersList.findIndex((ko) => (ko.category || 'separate_kit') === 'personalized');
    const includedKitOrderIndices = new Set();
    if (personalizedIndex !== -1 && includedIds.size > 0) {
      kitOrdersList.forEach((ko, ki) => {
        if (ki === personalizedIndex) return;
        if (ko.kitId && includedIds.has(String(ko.kitId))) includedKitOrderIndices.add(ki);
      });
    }
    // kitOrders entries don't carry a kitName — the real one ("Dental kit") lives on the
    // kit's own component items. Falls back to the generic label when none has it.
    const kitNameFromItems = (items, fallback) => items.find((it) => it.kitName)?.kitName || fallback;
    // Names of the personalized kits that get their own header — each claims the
    // Personalized Kit Packing tasks filed under its name (see kitLevelTasks below).
    const personalizedHeaderNames = kitOrdersList
      .filter((ko, ki) => (ko.category || 'separate_kit') === 'personalized' && !includedKitOrderIndices.has(ki))
      .map((ko) => (rawItems.find((it) => ko.kitId && String(it.kitId) === String(ko.kitId) && it.kitName)?.kitName
        || ko.kitName || ko.kitType || '').trim().toLowerCase());

    kitOrdersList.forEach((ko, ki) => {
      if (includedKitOrderIndices.has(ki)) return; // folded into the personalized kit below instead
      const kitId = String(ko.kitId || '');
      const kitName = ko.kitName || ko.kitType || `Kit ${ki + 1}`;
      const overallQty = Number(ko.overallQty) || 0;
      const isPersonalized = (ko.category || 'separate_kit') === 'personalized';
      const headerKey = `_kh_${kitId || ki}`;

      // Match this kit's component items by kitId first (reliable when present on
      // either the dispatch item or its order-item fallback), else by kit name/type.
      const kitItems = rawItems.filter((it) => {
        if (it._id && matchedItemIds.has(it._id)) return false;
        if (kitId && it.kitId) return String(it.kitId) === kitId;
        const refLow = (it.kitType || it.kitName || '').toLowerCase();
        const koLow = (ko.kitName || ko.kitType || '').toLowerCase();
        return !!refLow && !!koLow && refLow === koLow;
      });
      kitItems.forEach((it) => { if (it._id) matchedItemIds.add(it._id); });
      const kitItemIds = kitItems.map((it) => it._id).filter(Boolean);

      // kitOrders entries don't reliably carry their own kitName/kitType (`kitName` above
      // often falls back to the generic "Kit N" label) — the REAL kit name, the one a
      // "Separate/Personalized Kit Packing" task was actually filed under (Task.product,
      // set by OperationDetail.jsx's submitKitPackingTask), lives on this kit's own
      // component items. Resolve it from a matched component so the kit-level task lookup
      // below is scoped to THIS kit, not every kit in the order.
      const realKitName = kitNameFromItems(kitItems, kitName);

      // Any OTHER kit/products folded into this (personalized) kit's box — matched up
      // front so the header's completeness check below covers every component that will
      // actually ship and get photographed under this one header, not just kitItems.
      const incGroups = [];
      if (ki === personalizedIndex && includedKitOrderIndices.size > 0) {
        includedKitOrderIndices.forEach((incKi) => {
          const incKo = kitOrdersList[incKi];
          const incKitId = String(incKo.kitId || '');
          const incKitName = incKo.kitName || incKo.kitType || `Kit ${incKi + 1}`;
          const incItems = rawItems.filter((it) => {
            if (it._id && matchedItemIds.has(it._id)) return false;
            return !!incKitId && !!it.kitId && String(it.kitId) === incKitId;
          });
          incItems.forEach((it) => { if (it._id) matchedItemIds.add(it._id); });
          if (incItems.length) incGroups.push({ items: incItems, includedFrom: kitNameFromItems(incItems, incKitName) });
        });
      }
      let includedProdItems = [];
      if (ki === personalizedIndex && includedIds.size > 0) {
        includedProdItems = rawItems.filter((it) => {
          if (it._id && matchedItemIds.has(it._id)) return false;
          if (it.kitId || it.isKit) return false;
          const nm = it.product || it.name || it.itemName || '';
          return !!nm && includedIds.has(nm);
        });
        includedProdItems.forEach((it) => {
          const nm = it.product || it.name || it.itemName || '';
          const totalQty = Number(it.qtyOrdered ?? it.qty) || 0;
          const explicit = piQty[nm];
          const bundled = explicit != null ? (Number(explicit) || 0) : totalQty; // legacy: no qty recorded = fully bundled
          const remaining = Math.max(0, totalQty - bundled);
          // Only remove it from further matching (and so from ever getting its own
          // Separate Product row) once it's FULLY absorbed into the kit — a partially
          // bundled item's _id must stay available so the remaining unbundled qty still
          // surfaces as its own dispatchable row below.
          if (remaining <= 0) { if (it._id) matchedItemIds.add(it._id); }
          else if (it._id) partiallyBundledQtyByItemId.set(String(it._id), bundled);
        });
      }

      // This kit's own kit-level packing tasks — the step that finishes it as ONE unit.
      // Matched by kitName (each task's `product`, set to the kit group's kitName at creation
      // — same as OperationDetail.jsx's separateKitTasksFor/personalizedKitTasksFor), NOT
      // order-wide, so one kit's task can't unlock a sibling kit (Dental Kit's task opening
      // the Shaving Kit row). Exception: a personalized box holding other kits/products
      // (ORD-260042) is filed by Operations under the outer display unit ("box"), not a kit
      // name — so that box, like an order's only personalized kit, also takes every
      // Personalized Kit Packing task no other personalized kit claims by name.
      const realKitLow = realKitName.trim().toLowerCase();
      const takesUnclaimed = isPersonalized
        && (incGroups.length > 0 || includedProdItems.length > 0 || personalizedHeaderNames.length === 1);
      const kitLevelTasks = taskList.filter((t) => {
        const product = (t.product || '').trim().toLowerCase();
        if (!isPersonalized) return (t.taskType === 'Separate Kit Packing' || t.taskType === 'Kit Packing') && product === realKitLow;
        if (t.taskType !== 'Personalized Kit Packing') return false;
        return product === realKitLow || (takesUnclaimed && !personalizedHeaderNames.includes(product));
      });
      const kitLevelAssigned = !gatingActive || kitLevelTasks.some(isTaskAssigned);
      // A component is covered either by the shared kit-level task, or by its OWN
      // per-product task (Suggested Tasks / assignTasksPerProduct, matched via
      // productIndex) — so assigning every component individually is enough even if the
      // kit-level task was never created, and one truly unassigned component can't be
      // masked by an unrelated sibling's assignment.
      const componentAssigned = (item) => kitLevelAssigned || assignedProductIndices.has(item.productIndex);

      // The kit ships/photographs as ONE unit, so its header is only actionable once
      // every component actually inside the box is covered — one unassigned component
      // (no kit-level task AND no per-product task of its own) blocks the whole header.
      const allComponents = [...kitItems, ...incGroups.flatMap((g) => g.items), ...includedProdItems];
      const unassignedComponents = allComponents.filter((it) => !componentAssigned(it));
      const headerAssigned = allComponents.length === 0 ? kitLevelAssigned : unassignedComponents.length === 0;
      const unassignedNames = unassignedComponents.map((it) => it.product || it.name || it.itemName || 'item');

      // Kits a component's OWN per-product tasks have finished — the fallback when the kit
      // has no kit-level packing task. A kit component's qty is per kit; a Separate Product
      // packed into the box counts only its bundled portion.
      const componentKitsDone = (item) => {
        const lineTasks = productTasksByIndex.get(item.productIndex);
        if (item.kitId || item.isKit) {
          const perKit = Number(item.qtyOrdered) || 1;
          return Math.floor(lineDoneQty(lineTasks, perKit * overallQty) / perKit);
        }
        const totalQty = Number(item.qtyOrdered) || 0;
        const bundled = partiallyBundledQtyByItemId.get(String(item._id || '')) ?? totalQty;
        if (bundled <= 0 || overallQty <= 0) return overallQty;
        return Math.floor((Math.min(lineDoneQty(lineTasks, totalQty), bundled) * overallQty) / bundled);
      };
      // Kits finished in Task Management: the kit-level step's Done count, batch by batch
      // (kitsReadyForNextStep — 500 of 1000 Done → 500). With no kit-level task at all, the
      // fewest kits any component's own tasks cover.
      let completedQty;
      if (gatingActive) {
        if (kitLevelTasks.length) completedQty = kitsReadyForNextStep(kitLevelTasks, overallQty);
        else completedQty = allComponents.length ? Math.min(...allComponents.map(componentKitsDone)) : 0;
        if (overallQty > 0) completedQty = Math.min(completedQty, overallQty);
      }

      // Kit-level dispatch progress — the kit ships as ONE unit. Legacy records with no
      // kitDispatch entry for this kit are treated as already fully dispatched (see file
      // header comment), so they never show spurious "pending" or demand a photo re-upload.
      const kd = kitDispatchByKitId.get(kitId);
      const dispatchedQty = kd ? Number(kd.dispatchedQty) || 0 : overallQty;
      const pendingQty = Math.max(0, overallQty - dispatchedQty);
      // Show the real kit name, not "Kit 1". A personalized package holding other kits is
      // named after everything inside it ("Dental kit + Shaving kit"), and each component
      // row gets its own kit's name as a tag so the two kits stay distinguishable.
      const bundlesOtherKits = incGroups.length > 0;
      const headerName = bundlesOtherKits
        ? [realKitName, ...incGroups.map((g) => g.includedFrom)].join(' + ')
        : realKitName;

      const headerRow = {
        key: headerKey,
        type: 'kit_header',
        itemId: headerKey,
        kitDispatchId: kd?._id || null,
        kitId,
        name: headerName,
        kitName: headerName,
        qty: overallQty,
        overallQty,
        dispatchedQty,
        pendingQty,
        ...(completedQty !== undefined ? { completedQty } : {}),
        openBoxPhotos: kd?.openBoxPhotos || [],
        closeBoxPhotos: kd?.closeBoxPhotos || [],
        boxes: isPersonalized ? orderBoxes : kitItems.reduce((s, it) => s + (Number(it.boxes) || 0), 0),
        category: ko.category || 'separate_kit',
        isPersonalized,
        childItemIds: kitItemIds,
        bucket: isPersonalized ? 'personalizedKit' : 'separateKit',
        assigned: headerAssigned,
        unassignedNames,
      };
      rows.push(headerRow);
      verifiable.push(headerRow);

      // Component rows stay in the display list for transparency (what's actually in
      // this kit), but are NOT independently dispatchable — the kit header above is the
      // single unit that carries the count + photo controls. This is the fix for the bug
      // where every component demanded its own open/close photo pair. Each still carries
      // its OWN `assigned` (per componentAssigned above) so a specific unassigned product
      // can be called out on its own row instead of every sibling sharing one flag.
      // A kit component's qty is already PER KIT (see Sales "QTY / KIT") — dividing it by
      // the kit count again showed "(0/kit)" for every component.
      const perKitQtyOf = (item) => Number(item.qtyOrdered ?? item.qty) || null;
      kitItems.forEach((item, ii) => {
        const itemType = isPersonalized ? 'personalized_item' : 'kit_item';
        const row = toRow(item, ii, itemType, {
          perKitQty: perKitQtyOf(item), boxes: item.boxes || 0, bucket: null, assigned: componentAssigned(item),
          ...(bundlesOtherKits ? { includedFrom: realKitName } : {}),
        });
        rows.push(row);
      });

      // Fold in any other kits packed INSIDE this personalized kit's box (see comment
      // at the top of the function) — their own components render as more child rows
      // right here, with no header of their own and no independent dispatch count.
      incGroups.forEach(({ items, includedFrom }) => {
        items.forEach((item, ii) => {
          const row = toRow(item, ii, 'personalized_item', { perKitQty: perKitQtyOf(item), boxes: item.boxes || 0, bucket: null, includedFrom, assigned: componentAssigned(item) });
          rows.push(row);
        });
      });

      // Separate products packed INSIDE the personalized kit (packagingIncludes referencing
      // a product by name) — folded in as child rows here instead of under Separate Products.
      // When only PART of the product's qty is bundled, the label spells out how much (the
      // rest gets its own Separate Product row below, via partiallyBundledQtyByItemId).
      includedProdItems.forEach((item, ii) => {
        const bundledQty = item._id ? partiallyBundledQtyByItemId.get(String(item._id)) : undefined;
        const totalQty = Number(item.qtyOrdered ?? item.qty) || 0;
        const includedFrom = bundledQty != null
          ? `Included in kit packing (${bundledQty} of ${totalQty})`
          : 'Included in kit packing';
        const row = toRow(item, ii, 'personalized_item', { boxes: item.boxes || 0, bucket: null, includedFrom, assigned: componentAssigned(item) });
        rows.push(row);
      });
    });

    const sepItems = rawItems.filter((it) => !(it._id && matchedItemIds.has(it._id)));
    if (sepItems.length > 0) {
      rows.push({ key: '_sep_hdr', type: 'kit_header', kitName: 'Separate Products', qty: null, boxes: 0, category: 'separate_product' });
      sepItems.forEach((item, i) => {
        // A row that's ALSO partially bundled into the personalized kit (shows up above as
        // an informational child row too) only needs its remaining unbundled qty here.
        const bundled = item._id ? (partiallyBundledQtyByItemId.get(String(item._id)) || 0) : 0;
        const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct', ...productRowExtra(item, bundled) });
        rows.push(row);
        verifiable.push(row);
      });
    }
  } else {
    // No kitOrders header data, but items carry their own kitId/kitType — group locally.
    // There's no overallQty (kit count) available in this shape, so kit-as-one-unit
    // dispatch counts can't be anchored here — components stay individually dispatchable
    // by their own qtyOrdered/qtyDispatched, same as a Separate Product (rare legacy path).
    const kitGroups = {};
    const kitGroupOrder = [];
    rawItems.forEach((it) => {
      const gKey = String(it.kitId || it.kitType || '');
      if (gKey) {
        if (!kitGroups[gKey]) { kitGroups[gKey] = { items: [], name: it.kitType || it.kitName || gKey, category: it.category }; kitGroupOrder.push(gKey); }
        kitGroups[gKey].items.push(it);
      }
    });
    kitGroupOrder.forEach((gKey) => {
      const grp = kitGroups[gKey];
      const isPersonalized = grp.category === 'personalized';
      rows.push({ key: `_kh_${gKey}`, type: 'kit_header', kitName: grp.name, qty: null, boxes: 0, category: grp.category || 'separate_kit' });
      grp.items.forEach((item, ii) => {
        const row = toRow(item, ii, 'kit_item', { bucket: isPersonalized ? 'personalizedKit' : 'separateKit', ...productRowExtra(item) });
        rows.push(row);
        verifiable.push(row);
      });
    });
    rawItems.filter((it) => !it.kitId && !it.kitType).forEach((item, i) => {
      const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct', ...productRowExtra(item) });
      rows.push(row);
      verifiable.push(row);
    });
  }

  if (verifiable.length === 0) {
    const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct', ...productRowExtra(item) }));
    return { products: flat, groupedProducts: flat };
  }

  return { products: verifiable, groupedProducts: rows };
}

// A dispatchable row's remaining count — works for both kit-header rows (overallQty/
// dispatchedQty) and product rows (qtyOrdered/qtyDispatched).
export function getRowPendingQty(row) {
  const total = row.overallQty ?? row.qtyOrdered ?? 0;
  const done = row.dispatchedQty ?? row.qtyDispatched ?? 0;
  return Math.max(0, total - done);
}

// The most "Dispatch Now" may send for `row` this round: its pending qty, further capped at
// what Task Management has finished (row.completedQty) minus what's already gone out. Rows
// built without task data carry no completedQty and stay capped at pending only.
export function getRowDispatchableQty(row) {
  const pending = getRowPendingQty(row);
  if (row.completedQty == null) return pending;
  const done = row.dispatchedQty ?? row.qtyDispatched ?? 0;
  return Math.max(0, Math.min(pending, row.completedQty - done));
}

// Given the verifiable units (each tagged with `bucket`), returns per-category
// dispatched/total/pending qty totals for the summary header and the list-page balance
// column. Replaces the old verified-boolean summary now that dispatch is count-based.
export function summarizeDispatchVerification(products) {
  const buckets = {
    personalizedKit: { label: 'Personalized Kit', dispatched: 0, total: 0, pending: 0 },
    separateKit: { label: 'Separate Kits', dispatched: 0, total: 0, pending: 0 },
    separateProduct: { label: 'Separate Products', dispatched: 0, total: 0, pending: 0 },
  };
  products.forEach((p) => {
    const bucket = buckets[p.bucket];
    if (!bucket) return;
    const total = p.overallQty ?? p.qtyOrdered ?? 0;
    const done = Math.min(total, p.dispatchedQty ?? p.qtyDispatched ?? 0);
    bucket.total += total;
    bucket.dispatched += done;
  });
  Object.values(buckets).forEach((b) => { b.pending = Math.max(0, b.total - b.dispatched); });
  const overall = {
    dispatched: Object.values(buckets).reduce((s, b) => s + b.dispatched, 0),
    total: Object.values(buckets).reduce((s, b) => s + b.total, 0),
  };
  overall.pending = Math.max(0, overall.total - overall.dispatched);
  return { ...buckets, overall };
}
