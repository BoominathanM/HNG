// Groups a dispatch's line items into the same three buckets Sales/Operations use:
//   personalizedKit   — a kit + extras customized as one unit (verified as a single unit)
//   separateKit       — a kit purchased as-is (each component item verified individually)
//   separateProduct   — an individual non-kit product
//
// DispatchRecord.items is the source of truth for verification (verifyItem looks up
// itemId there), but older dispatch records were created before kit fields (kitId/
// kitName/kitType/category/boxes) were copied onto them — so we fall back to the
// order's own item at the same array position (orderItems), which has always carried
// those fields, to recover kit grouping for those legacy records.
export function buildDispatchGroupedProducts({ items, kitOrders, orderItems, boxes }) {
  const dispatchItems = items || [];
  const sourceOrderItems = orderItems || [];

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
    type,
    ...extra,
  });

  // No kit info anywhere — flat product list (unchanged from before).
  if (!kitOrdersList.length && !hasKitMeta) {
    const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct' }));
    return { products: flat, groupedProducts: flat };
  }

  const rows = [];
  const verifiable = [];
  const matchedItemIds = new Set();

  if (kitOrdersList.length > 0) {
    kitOrdersList.forEach((ko, ki) => {
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

      const headerRow = {
        key: headerKey,
        type: 'kit_header',
        kitName,
        qty: overallQty,
        boxes: isPersonalized ? orderBoxes : kitItems.reduce((s, it) => s + (Number(it.boxes) || 0), 0),
        category: ko.category || 'separate_kit',
        isPersonalized,
        verified: kitItems.length > 0 && kitItems.every((it) => it.verified),
        childItemIds: kitItemIds,
        bucket: isPersonalized ? 'personalizedKit' : null,
      };
      rows.push(headerRow);
      if (isPersonalized) verifiable.push(headerRow);

      kitItems.forEach((item, ii) => {
        const totalQty = Number(item.qty || item.qtyOrdered) || 0;
        const perKitQty = overallQty > 0 ? Math.round(totalQty / overallQty) : null;
        const itemType = isPersonalized ? 'personalized_item' : 'kit_item';
        const row = toRow(item, ii, itemType, { perKitQty, boxes: item.boxes || 0, bucket: isPersonalized ? null : 'separateKit' });
        rows.push(row);
        if (!isPersonalized) verifiable.push(row);
      });
    });

    const sepItems = rawItems.filter((it) => !(it._id && matchedItemIds.has(it._id)));
    if (sepItems.length > 0) {
      rows.push({ key: '_sep_hdr', type: 'kit_header', kitName: 'Separate Products', qty: null, boxes: 0, category: 'separate_product' });
      sepItems.forEach((item, i) => {
        const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct' });
        rows.push(row);
        verifiable.push(row);
      });
    }
  } else {
    // No kitOrders header data, but items carry their own kitId/kitType — group locally.
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
        const row = toRow(item, ii, 'kit_item', { bucket: isPersonalized ? 'personalizedKit' : 'separateKit' });
        rows.push(row);
        verifiable.push(row);
      });
    });
    rawItems.filter((it) => !it.kitId && !it.kitType).forEach((item, i) => {
      const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct' });
      rows.push(row);
      verifiable.push(row);
    });
  }

  if (verifiable.length === 0) {
    const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: item.boxes || orderBoxes, bucket: 'separateProduct' }));
    return { products: flat, groupedProducts: flat };
  }

  return { products: verifiable, groupedProducts: rows };
}

// Given the verifiable units (each tagged with `bucket`) and a live-verified check
// function, returns per-category verified/total counts for the summary header.
export function summarizeDispatchVerification(products, isVerifiedFn) {
  const buckets = {
    personalizedKit: { label: 'Personalized Kit', verified: 0, total: 0 },
    separateKit: { label: 'Separate Kits', verified: 0, total: 0 },
    separateProduct: { label: 'Separate Products', verified: 0, total: 0 },
  };
  products.forEach((p) => {
    const bucket = buckets[p.bucket];
    if (!bucket) return;
    bucket.total += 1;
    if (isVerifiedFn(p)) bucket.verified += 1;
  });
  const overall = {
    verified: products.filter(isVerifiedFn).length,
    total: products.length,
  };
  return { ...buckets, overall };
}
