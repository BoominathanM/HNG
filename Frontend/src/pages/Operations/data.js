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
const hasFrostedPackaging = (item, order) => {
  if (item.logoType === 'Frosted Ziplock') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('ziplock') || pm.includes('frosted') || pm.includes('pouch')) return true;
  const du = (order.kitDisplayUnit || order.displayUnit || '').toLowerCase();
  return du.includes('ziplock') || du.includes('frosted') || du.includes('pouch');
};

// Returns true when routing the item to the sticker queue — sticker printing takes priority
// over packaging type inference (a box item with sticker=YES goes to sticker queue first).
const isFrostedZiplock = (item, order) => {
  if (item.sticker === 'YES') return false;
  return hasFrostedPackaging(item, order);
};

// Determine an item's ultimate packaging destination (after sticker step completes).
const getItemPackagingType = (item, order) => {
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

// Returns a Set of lowercase product names that have an emergency delivery date in splitDates.
// Handles both formats: new {products:[{product}]} and legacy {product} at sd level.
// Lowercase normalisation ensures matching is case-insensitive (item names are compared
// with .toLowerCase() at each call site).
export const getEmergencyProductSet = (order) => {
  const set = new Set();
  (order.splitDates || []).forEach((sd) => {
    (sd.products || []).forEach((ep) => { if (ep.product) set.add(ep.product.toLowerCase()); });
    if (sd.product) set.add(sd.product.toLowerCase());
  });
  return set;
};

export const buildProductionQueues = (orders = [], stickerRequests = [], queueSteps = {}) => {
  // Find the StickerRequest document for a given order + product combination.
  // Case-insensitive product match to guard against minor name inconsistencies.
  const findSR = (orderId, product) => {
    const pLower = (product || '').toLowerCase();
    return stickerRequests.find(
      (s) =>
        (s.orderId?.orderCode === orderId || s.orderId === orderId) &&
        (s.product || '').toLowerCase() === pLower,
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
  const isStickerPrinted = (orderId, product, itemIdx) => {
    const sr = findSR(orderId, product);
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
      const emergencySet = getEmergencyProductSet(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const items = (order.items || []).map((item, idx) => ({ item, idx }))
        .filter(({ item, idx }) => {
          if (!((item.logoType === 'Sticker' || item.sticker === 'YES') && !isFrostedZiplock(item, order))) return false;
          // Once the item's sticker is printed and it has a box/frosted destination,
          // remove it from the sticker queue — it now lives in the box/frosted tab.
          const packagingType = getItemPackagingType(item, order);
          if (packagingType !== 'sticker') {
            const product = item.product || item.itemName;
            const sr = findSR(order.id, product);
            if (sr && STICKER_MOVED_ON_STATUSES.has(sr.status)) return false;
            // Also hide when local state says printing has started (pre-refetch window)
            if (localStickerStep(order.id, idx) >= 3) return false;
          }
          return true;
        })
        .map(({ item, idx }) => {
          const packagingType = getItemPackagingType(item, order);
          const productName = item.product || item.itemName;
          const isEmergencyProduct = emergencySet.has((productName || '').toLowerCase());
          return {
            key: `${order.id}-${idx}-sticker`,
            orderId: order.id,
            hotelLogo: order.hotelLogo || order.clientName,
            product: productName,
            qty: item.qty,
            size: item.size || getDefaultSize(productName),
            status: order.designStatus,
            sent: order.printingStatus === 'Not Started' ? 0 : Math.round((item.qty || 0) * 0.7),
            verified: order.stockStatus === 'Received',
            note: (order.notifications || [])[0] || '',
            stickerPrinting: 'Yes',
            packagingType, // where this item moves after sticker approval
            isUrgent: order.isUrgent || false,
            isEmergencyProduct,
            // Non-emergency items of an emergency order are gated until emergency items are done
            isEmergencyGated: emergencySet.size > 0 && !isEmergencyProduct && !emergencyAllDone,
          };
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
      const emergencySet = getEmergencyProductSet(order);
      const emergencyAllDone = areAllEmergencyItemsDone(order);
      const result = [];
      (order.items || []).forEach((item, idx) => {
        const packType = getItemPackagingType(item, order);
        if (packType !== 'box') return;
        const product = item.product || item.itemName;
        const needsSticker = item.logoType === 'Sticker' || item.sticker === 'YES';
        if (needsSticker && !isStickerPrinted(order.id, product, idx)) return;
        const isEmergencyProduct = emergencySet.has((product || '').toLowerCase());
        result.push({
          key: `${order.id}-${idx}-box`,
          orderId: order.id,
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty: item.qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round((item.qty || 0) * 0.65),
          verified: false,
          note: needsSticker
            ? 'Sticker approved — now in box manufacturing queue'
            : 'Box manufacturing',
          stickerPrinting: needsSticker ? 'Yes' : 'No',
          packagingType: 'box',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated: emergencySet.size > 0 && !isEmergencyProduct && !emergencyAllDone,
        });
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),

    // Frosted Ziplock queue: items with frosted/ziplock/pouch packaging.
    // Same sticker-first rule applies — only appears here after the sticker is printed.
    // Within each order: emergency products (from splitDates) appear first; remaining items
    // carry isEmergencyGated=true until all emergency items for that order are done.
    frosted: orders.flatMap((order) => {
      const emergencySet = getEmergencyProductSet(order);
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
        const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
        const itemHasOwnFrostedPkg = pm.includes('ziplock') || pm.includes('frosted') || pm.includes('pouch');
        const needsSticker = item.logoType === 'Sticker' && !itemHasOwnFrostedPkg;
        // Also gate on an active StickerRequest that hasn't been printed yet — covers the
        // case where sticker=YES was selected alongside frosted packaging (the SR was created
        // in the sticker queue and must be printed before the item moves here).
        const sr = findSR(order.id, product);
        const hasActiveSR = sr && !STICKER_MOVED_ON_STATUSES.has(sr.status);
        if ((needsSticker || hasActiveSR) && !isStickerPrinted(order.id, product, idx)) return;
        const isEmergencyProduct = emergencySet.has((product || '').toLowerCase());
        result.push({
          key: `${order.id}-${idx}-frosted`,
          orderId: order.id,
          hotelLogo: order.hotelLogo || order.clientName,
          product,
          qty: item.qty,
          size: item.size,
          status: order.designStatus,
          sent: order.printingStatus === 'Not Started' ? 0 : Math.round((item.qty || 0) * 0.5),
          verified: order.stockStatus === 'Received',
          note: needsSticker
            ? 'Sticker approved — now in frosted ziplock queue'
            : 'Dispatch and received updates should be verified by operations',
          stickerPrinting: needsSticker ? 'Yes' : 'No',
          packagingType: 'frosted',
          isUrgent: order.isUrgent || false,
          isEmergencyProduct,
          isEmergencyGated: emergencySet.size > 0 && !isEmergencyProduct && !emergencyAllDone,
        });
      });
      // Emergency products first within this order
      return result.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
    }),
  };
};

export const getCheckStateMap = (orders = []) =>
  Object.fromEntries(orders.map((order) => [order.id || order._id, { ...(order.readiness || {}) }]));
