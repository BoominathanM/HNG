export const SIZE_MAP = {
  Soap: '2.5cm x 2.5cm',
  Shampoo: '2cm x 3cm',
  'Coconut Oil': '2cm x 3cm',
  Conditioner: '2cm x 3cm',
  'Shower Gel': '2cm x 3cm',
  'Dental Kit': '3cm x 2cm',
};

export const PAYMENT_LABELS = {
  BEFORE_100: '100% Payment Before Dispatch',
  ON_DISPATCH: '50% Advance, 50% on Dispatch',
  '50_ADVANCE_50_AFTER': '50% adv 50% on delivery',
  CREDIT_10_30: 'Credit (10days to 1 month)',
};

export const DESIGN_FLOW = [
  'Sent', 'Design Confirmation', 'In Process', 'Dispatch',
  'Received', 'Pending Approval', 'Design Change', 'Approved', 'Printing', 'Completed',
];

export const designColor = {
  Sent: 'blue', 'Design Confirmation': 'cyan', 'In Process': 'orange',
  Dispatch: 'purple', Received: 'geekblue', 'Pending Approval': 'gold',
  'Design Change': 'red', Approved: 'green', Printing: 'magenta', Completed: 'success',
};

export const statusPill = {
  Approved: 'green', Waiting: 'gold', Partial: 'orange', Received: 'green',
  'Not Received': 'default', Printing: 'magenta', 'In Process': 'orange',
  'Not Started': 'default', Available: 'success', Busy: 'warning',
};

export const FLOW_STAGES = [
  'Order Received', 'Sent To Design', 'Client Approved', 'Printing', 'Stock Received', 'Task Assigned',
];

export const designerCredentials = {
  username: 'designops@healnglow.com',
  password: 'HNG@Design2024',
  portal: 'Internal design portal — share only with authorized design staff',
};

export const getDefaultSize = (product) => {
  const key = Object.keys(SIZE_MAP).find((item) => product.toLowerCase().includes(item.toLowerCase()));
  return key ? SIZE_MAP[key] : '2cm x 3cm';
};

export const getProgressFromChecks = (checks) => {
  if (!checks) return 0;
  const keys = ['designRequired', 'pdfReady', 'designSent', 'clientApproved', 'printingStarted', 'stockReceived', 'operationApproved'];
  const done = keys.filter((k) => checks[k]).length;
  return Math.round((done / keys.length) * 100);
};

export const canAssignTaskFromChecks = (checks) => {
  if (!checks) return false;
  return checks.pdfReady && checks.designSent && checks.clientApproved &&
    checks.printingStarted && checks.stockReceived && checks.operationApproved;
};

export const getFlowStep = (order) => {
  const r = order.readiness || {};
  if (order.taskStatus === 'Full') return 5;
  if (r.stockReceived && r.operationApproved) return 4;
  if (order.printingStatus === 'In Process' || order.printingStatus === 'Printing') return 3;
  if (r.clientApproved) return 2;
  if (r.designSent) return 1;
  return 0;
};

// Returns true when the item's physical packaging is frosted/ziplock/pouch —
// regardless of whether the item also needs sticker printing.
// Priority order: (1) explicit displayUnitTab from config, (2) logoType field,
// (3) string-match fallback on display unit / packing material names.
const hasFrostedPackaging = (item, order) => {
  // Explicit config-resolved tab wins first
  if (order.displayUnitTab === 'Ziplock') return true;
  // Config-resolved packingMaterial tab (set from Inventory Packing Config tabMapping)
  if (item.packingMaterialTab === 'Ziplock') return true;
  if (item.logoType === 'Frosted Ziplock') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('ziplock') || pm.includes('frosted') || pm.includes('pouch')) return true;
  const du = (order.kitDisplayUnit || order.displayUnit || '').toLowerCase();
  return du.includes('ziplock') || du.includes('frosted') || du.includes('pouch');
};

// Returns true when routing the item to the sticker queue — sticker printing takes priority
// over packaging type inference UNLESS the order's packing material is explicitly configured
// as Box or Ziplock via displayUnitTab, in which case packing material wins.
const isFrostedZiplock = (item, order) => {
  // Explicit packing config wins over sticker flag — Ziplock orders go to the Frosted
  // Ziplock tab directly, even when sticker=YES is also set on the item.
  if (order.displayUnitTab === 'Ziplock') return true;
  if (item.sticker === 'YES') return false;
  return hasFrostedPackaging(item, order);
};

// Determine an item's ultimate packaging destination (after sticker step completes).
const getItemPackagingType = (item, order) => {
  // Explicit config-resolved tab wins first
  if (order.displayUnitTab === 'Ziplock') return 'frosted';
  if (order.displayUnitTab === 'Box') return 'box';
  // Config-resolved packingMaterial tab (set from Inventory Packing Config tabMapping)
  if (item.packingMaterialTab === 'Ziplock') return 'frosted';
  if (item.packingMaterialTab === 'Box') return 'box';
  if (hasFrostedPackaging(item, order)) return 'frosted';
  if (item.logoType === 'Box') return 'box';
  const du = (order.kitDisplayUnit || order.displayUnit || '').toLowerCase();
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (du.includes('box') || pm.includes('box')) return 'box';
  return 'sticker';
};

// Labels shown in the queue table for the packaging destination column.
export const PACKAGING_TYPE_LABELS = {
  sticker: 'Sticker Only',
  box: 'Box',
  frosted: 'Frosted Ziplock',
};

// Statuses that indicate the item has moved ON from sticker to box/frosted manufacturing.
// The move happens AFTER the sticker is printed (Print button → status 'In Process'),
// not at Approved. Items with these statuses and a box/frosted destination are removed
// from the sticker queue and, in lockstep, added to the box/frosted queue.
const STICKER_MOVED_ON_STATUSES = new Set(['In Process', 'Printing', 'Dispatch', 'Received', 'Done']);

// Statuses that mean an emergency item's production is fully complete.
const EMERGENCY_COMPLETE_STATUSES = new Set(['Done', 'Received', 'Closed']);

// Returns a Map of lowercase product name → emergency qty (number) or null if no qty specified.
// When qty is present, only the order item with that exact qty should be marked emergency.
// When qty is null, all items with that product name are emergency (legacy / no-qty entries).
export const getEmergencyProductQtyMap = (order) => {
  const map = new Map();
  (order.splitDates || []).forEach((sd) => {
    (sd.products || []).forEach((ep) => {
      if (ep.product) {
        const key = ep.product.toLowerCase();
        if (!map.has(key)) map.set(key, ep.qty != null ? Number(ep.qty) : null);
      }
    });
    if (sd.product) {
      const key = sd.product.toLowerCase();
      if (!map.has(key)) map.set(key, sd.qty != null ? Number(sd.qty) : null);
    }
  });
  return map;
};

// Returns a Set of lowercase product names that have an emergency delivery date in splitDates.
export const getEmergencyProductSet = (order) => new Set(getEmergencyProductQtyMap(order).keys());

export const buildProductionQueues = (orders = [], stickerRequests = [], queueSteps = {}) => {
  // Find the StickerRequest document for a given order + product combination.
  // Case-insensitive product match to guard against minor name inconsistencies.
  // Pass stickerType to restrict the search to a specific queue type (e.g. 'Sticker').
  const findSR = (orderId, product, stickerType = null) => {
    const pLower = (product || '').toLowerCase();
    return stickerRequests.find(
      (s) =>
        (s.orderId?.orderCode === orderId || s.orderId === orderId) &&
        (s.product || '').toLowerCase() === pLower &&
        (stickerType === null || s.stickerType === stickerType),
    );
  };

  // Returns true when every emergency product for the order has a completed StickerRequest.
  // Used to determine whether non-emergency items can advance ("emergency phase done").
  const areAllEmergencyItemsDone = (order) => {
    const emergencySet = getEmergencyProductSet(order);
    if (emergencySet.size === 0) return true;
    for (const product of emergencySet) {
      const sr = findSR(order.id, product);
      if (!sr || !EMERGENCY_COMPLETE_STATUSES.has(sr.status)) return false;
    }
    return true;
  };

  // Returns the local queue step for a sticker-queue item (orderId + item index).
  const localStickerStep = (orderId, itemIdx) =>
    queueSteps[`${orderId}-${itemIdx}-sticker`] ?? 0;

  // True once the item's sticker has been PRINTED — only then does it move on to the
  // box/frosted manufacturing queue (mirrors the sticker-queue removal threshold so the
  // item is never shown in two tabs at once).
  // Only checks Sticker-type SRs so that a Box/Frosted SR created within those tabs
  // does not falsely report the sticker step as complete.
  const isStickerPrinted = (orderId, product, itemIdx) => {
    const sr = findSR(orderId, product, 'Sticker');
    if (sr && STICKER_MOVED_ON_STATUSES.has(sr.status)) return true;
    // Fallback: local state shows printing started (handles items where Print was
    // clicked this session but the RTK refetch hasn't completed yet).
    if (itemIdx !== undefined && localStickerStep(orderId, itemIdx) >= 3) return true;
    return false;
  };

  return {
    // Sticker queue: all items that need sticker printing (logoType=Sticker or sticker=YES),
    // excluding pure frosted/ziplock items that don't need sticker printing.
    // Also excludes items that have already moved on to box/frosted manufacturing.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    sticker: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const items = (order.items || []).map((item, idx) => ({ item, idx }))
        .filter(({ item, idx }) => {
          // Items with an explicit Box/Ziplock display-unit tab (from kit display unit or
          // packing material config) bypass the sticker queue entirely — they appear directly
          // in the Box or Frosted Ziplock tab regardless of the sticker flag.
          if (order.displayUnitTab === 'Box' || order.displayUnitTab === 'Ziplock') return false;
          if (item.packingMaterialTab === 'Box' || item.packingMaterialTab === 'Ziplock') return false;
          // Sticker Printing = Yes → route to Sticker tab regardless of Logo Required or Packing Material.
          if (!(item.sticker === 'YES' || item.logoType === 'Sticker')) return false;
          // Once the item's sticker is printed and it has a box/frosted destination,
          // remove it from the sticker queue — it now lives in the box/frosted tab.
          const packagingType = getItemPackagingType(item, order);
          if (packagingType !== 'sticker') {
            const product = item.product || item.itemName;
            const sr = findSR(order.id, product, 'Sticker');
            if (sr && STICKER_MOVED_ON_STATUSES.has(sr.status)) return false;
            // Also hide when local state says printing has started (pre-refetch window)
            if (localStickerStep(order.id, idx) >= 3) return false;
          }
          return true;
        })
        .flatMap(({ item, idx }) => {
          const packagingType = getItemPackagingType(item, order);
          const productName = item.product || item.itemName;
          const pKey = (productName || '').toLowerCase();
          const eQty = emergencyQtyMap.get(pKey);
          const itemQty = Number(item.qty) || 0;

          const makeRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
            key: `${order.id}-${idx}-sticker${keySuffix}`,
            orderId: order.id,
            orderCategory: order.orderCategory || 'ORDER',
            hotelLogo: order.hotelLogo || order.clientName,
            product: productName,
            qty,
            size: item.size || getDefaultSize(productName),
            status: order.designStatus,
            sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.7),
            verified: order.stockStatus === 'Received',
            note: (order.notifications || [])[0] || '',
            stickerPrinting: 'Yes',
            packagingType,
            isUrgent: order.isUrgent || false,
            isEmergencyProduct,
            isEmergencyGated,
            logoRequired: order.logoRequired || false,
            logoUrl: order.logoUrl || '',
          });

          if (eQty !== undefined) {
            if (eQty === null || itemQty <= eQty) {
              return [makeRow(itemQty, '', true, false)];
            }
            // Partial emergency: split into emergency qty + remaining qty
            return [
              makeRow(eQty, '-emg', true, false),
              makeRow(itemQty - eQty, '-rem', false, !emergencyAllDone),
            ];
          }
          return [makeRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone)];
        });
      // Emergency products first within this order
      return items.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Box queue: items with box packaging.
    // If sticker printing is also needed (sticker=YES), the item only appears here
    // AFTER its sticker has been printed — preventing premature box-queue entry and
    // keeping it out of the sticker tab and box tab simultaneously.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    box: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const packType = getItemPackagingType(item, order);
        if (packType !== 'box') return;
        const product = item.product || item.itemName;
        const needsSticker = item.sticker === 'YES' || item.logoType === 'Sticker';
        // Explicit Box tab from kit display unit or packing material config → show immediately.
        const hasExplicitBoxTab = order.displayUnitTab === 'Box' || item.packingMaterialTab === 'Box';
        // Sticker Printing = Yes → must complete Sticker tab first, unless explicit Box tab is set.
        if (needsSticker && !hasExplicitBoxTab && !isStickerPrinted(order.id, product, idx)) return;
        // Sticker Printing = No, Logo Required = No → no routing to Box tab, unless explicit Box tab is set.
        if (!needsSticker && !order.logoRequired && !hasExplicitBoxTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        const itemQty = Number(item.qty) || 0;
        const boxNote = needsSticker ? 'Sticker approved — now in box manufacturing queue' : 'Box manufacturing';

        const makeBoxRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-box${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.65),
          verified: false,
          note: boxNote,
          stickerPrinting: needsSticker ? 'Yes' : 'No',
          packagingType: 'box',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeBoxRow(itemQty, '', true, false));
          } else {
            result.push(makeBoxRow(eQty, '-emg', true, false));
            result.push(makeBoxRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeBoxRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Frosted Ziplock queue: items with frosted/ziplock/pouch packaging.
    // Same sticker-first rule applies — only appears here after the sticker is printed.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    frosted: orders.flatMap((order) => {
      const emergencyQtyMap = getEmergencyProductQtyMap(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const result = [];
      (order.items || []).forEach((item, idx) => {
        if (!hasFrostedPackaging(item, order)) return;
        const product = item.product || item.itemName;
        // An item needs sticker printing first only when its logoType is explicitly
        // 'Sticker' AND its own packaging field does NOT indicate frosted/ziplock/pouch.
        // This handles existing orders where logoType='Sticker' was saved as the default
        // fallback (e.g. for STICKY_POUCH display unit before the inferLogoType fix) —
        // the item.packaging field still carries the correct value and is the reliable signal.
        const needsSticker = item.sticker === 'YES' || item.logoType === 'Sticker';
        // Explicit Ziplock tab from kit display unit or packing material config → show immediately.
        const hasExplicitZiplockTab = order.displayUnitTab === 'Ziplock' || item.packingMaterialTab === 'Ziplock';
        // Gate on an active Sticker-type SR so that sticker=YES items alongside frosted packaging
        // still wait in the sticker tab until printed (only stickerType='Sticker' to avoid
        // false matches from a Frosted Ziplock SR created within this tab).
        const sr = findSR(order.id, product, 'Sticker');
        const hasActiveSR = sr && !STICKER_MOVED_ON_STATUSES.has(sr.status);
        // Sticker Printing = Yes → must complete Sticker tab first, unless explicit Ziplock tab is set.
        if (needsSticker && !hasExplicitZiplockTab && !isStickerPrinted(order.id, product, idx)) return;
        // Active SR from the sticker tab blocks display even when sticker is not explicitly set.
        if (!needsSticker && hasActiveSR && !hasExplicitZiplockTab && !isStickerPrinted(order.id, product, idx)) return;
        // Sticker Printing = No, Logo Required = No → no routing to Frosted tab, unless explicit Ziplock tab is set.
        if (!needsSticker && !order.logoRequired && !hasExplicitZiplockTab) return;
        const pKey = (product || '').toLowerCase();
        const eQty = emergencyQtyMap.get(pKey);
        const itemQty = Number(item.qty) || 0;
        const frostedNote = needsSticker ? 'Sticker approved — now in frosted ziplock queue' : 'Dispatch and received updates should be verified by operations';

        const makeFrostedRow = (qty, keySuffix, isEmergencyProduct, isEmergencyGated) => ({
          key: `${order.id}-${idx}-frosted${keySuffix}`,
          orderId: order.id,
          orderCategory: order.orderCategory || 'ORDER',
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round(qty * 0.5),
          verified: order.stockStatus === 'Received',
          note: frostedNote,
          stickerPrinting: needsSticker ? 'Yes' : 'No',
          packagingType: 'frosted',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated,
          logoRequired: order.logoRequired || false,
          logoUrl: order.logoUrl || '',
        });

        if (eQty !== undefined) {
          if (eQty === null || itemQty <= eQty) {
            result.push(makeFrostedRow(itemQty, '', true, false));
          } else {
            result.push(makeFrostedRow(eQty, '-emg', true, false));
            result.push(makeFrostedRow(itemQty - eQty, '-rem', false, !emergencyAllDone));
          }
        } else {
          result.push(makeFrostedRow(itemQty, '', false, emergencyQtyMap.size > 0 && !emergencyAllDone));
        }
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),
  };
};

export const getCheckStateMap = (orders = []) =>
  Object.fromEntries(orders.map((order) => [order.id || order._id, { ...(order.readiness || {}) }]));
