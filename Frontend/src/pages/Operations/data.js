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
  const isKitItem = !!(item.isKit || item.kitType);
  // Kit items: display unit tab determines their packaging — packing material is irrelevant.
  if (isKitItem && order.displayUnitTab === 'Ziplock') return true;
  // Standalone products: use their own config-resolved packingMaterial tab.
  if (item.packingMaterialTab === 'Ziplock') return true;
  if (item.logoType === 'Frosted Ziplock') return true;
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('ziplock') || pm.includes('frosted') || pm.includes('pouch')) return true;
  // Kit items only: fall back to display unit name when displayUnitTab not yet stored.
  if (isKitItem) {
    const du = (order.kitDisplayUnit || order.displayUnit || '').toLowerCase();
    return du.includes('ziplock') || du.includes('frosted') || du.includes('pouch');
  }
  return false;
};

const isFrostedZiplock = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  // Kit items: display unit determines final tab; sticker flag still respected
  // (sticker=YES kit items go to Sticker tab first, then Frosted after).
  if (isKitItem && order.displayUnitTab === 'Ziplock') {
    if (item.sticker === 'YES') return false;
    return true;
  }
  if (item.sticker === 'YES') return false;
  return hasFrostedPackaging(item, order);
};

// Returns true when an item requires sticker printing.
// item.sticker='YES' is explicit intent; item.sticker='NO' overrides any logoType='Sticker'
// inference (handles orders where inferLogoType fell back to 'Sticker' for items with no
// keyword in their packing material name but sticker printing was explicitly set to No).
// When item.sticker is unset (legacy orders without the field), logoType='Sticker' still triggers.
const itemNeedsSticker = (item) =>
  item.sticker === 'YES' || (item.sticker !== 'NO' && item.logoType === 'Sticker');

// Determine an item's ultimate packaging destination (after sticker step completes).
const getItemPackagingType = (item, order) => {
  const isKitItem = !!(item.isKit || item.kitType);
  // Kit items: display unit tab is the final packaging destination (overrides packing material).
  if (isKitItem && order.displayUnitTab === 'Ziplock') return 'frosted';
  if (isKitItem && order.displayUnitTab === 'Box') return 'box';
  // Standalone products with sticker=YES stay in the Sticker tab after printing — they do
  // NOT move on to a Box/Ziplock tab regardless of packingMaterialTab.
  if (!isKitItem && itemNeedsSticker(item)) return 'sticker';
  // Standalone products without sticker: their own config-resolved packingMaterial tab.
  if (item.packingMaterialTab === 'Ziplock') return 'frosted';
  if (item.packingMaterialTab === 'Box') return 'box';
  if (hasFrostedPackaging(item, order)) return 'frosted';
  if (item.logoType === 'Box') return 'box';
  const pm = (item.packaging || item.packingMaterial || '').toLowerCase();
  if (pm.includes('box')) return 'box';
  // Kit items only: fall back to display unit name for box routing.
  if (isKitItem) {
    const du = (order.kitDisplayUnit || order.displayUnit || '').toLowerCase();
    if (du.includes('box')) return 'box';
    if (du.includes('ziplock') || du.includes('frosted') || du.includes('pouch')) return 'frosted';
  }
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
          const isKitItem = !!(item.isKit || item.kitType);
          if (!isKitItem) {
            // Standalone products with sticker=YES always go to Sticker tab — packingMaterialTab
            // does not bypass sticker for standalone items; they stay in Sticker after printing.
            // Only sticker=NO standalone items with explicit packing config skip sticker entirely.
            const needsStickerStandalone = itemNeedsSticker(item);
            if (!needsStickerStandalone && (item.packingMaterialTab === 'Box' || item.packingMaterialTab === 'Ziplock')) return false;
          } else {
            // Kit items: sticker=YES still goes through Sticker tab first even if
            // displayUnitTab is Box/Ziplock. Only sticker=NO kit items skip sticker.
            if ((order.displayUnitTab === 'Box' || order.displayUnitTab === 'Ziplock') &&
                !itemNeedsSticker(item)) return false;
          }
          // Sticker Printing = Yes → route to Sticker tab regardless of Logo Required or Packing Material.
          if (!itemNeedsSticker(item)) return false;
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
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // Kit items can appear in BOTH Box and Frosted tabs simultaneously:
        //   - displayUnitTab drives the KIT ASSEMBLY step (e.g. Frosted for a Ziplock kit)
        //   - packingMaterialTab drives the INDIVIDUAL PRODUCT PACKING step (e.g. Box for paper-box products)
        // When a kit item has packingMaterialTab='Box' but the display unit routes to Frosted,
        // include it here for the individual packing step — independent of the kit assembly step.
        const needsBoxPacking = packType === 'box' ||
          (isKitItem && item.packingMaterialTab === 'Box' && order.displayUnitTab !== 'Box');
        if (!needsBoxPacking) return;
        const product = item.product || item.itemName;
        const needsSticker = itemNeedsSticker(item);
        // "Belongs in Box" — used for the no-logo exclusion check.
        const hasExplicitBoxTab = (isKitItem && order.displayUnitTab === 'Box') || item.packingMaterialTab === 'Box';
        // "Can bypass sticker gate" — kit items must complete Sticker tab first even when
        // their display unit resolves to Box; only standalone packing-config items bypass.
        const canBypassBoxSticker = !isKitItem && hasExplicitBoxTab;
        if (needsSticker && !canBypassBoxSticker && !isStickerPrinted(order.id, product, idx)) return;
        // Sticker Printing = No, Logo Required = No → no routing to Box tab, unless explicit Box tab.
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
        const isKitItem = !!(item.isKit || item.kitType);
        const packType = getItemPackagingType(item, order);
        // Kit items can appear in BOTH Box and Frosted tabs simultaneously (dual-step flow).
        // When a kit item has packingMaterialTab='Ziplock' but the display unit routes to Box,
        // include it here for the individual packing step — independent of the kit assembly step.
        // Non-kit items: still use the single-source-of-truth packType so sticker=YES items
        // never leak into Frosted even if their packing material string contains 'ziplock'.
        const needsFrostedPacking = packType === 'frosted' ||
          (isKitItem && item.packingMaterialTab === 'Ziplock' && order.displayUnitTab !== 'Ziplock');
        if (!needsFrostedPacking) return;
        const product = item.product || item.itemName;
        const needsSticker = itemNeedsSticker(item);
        // "Belongs in Frosted" — used for the no-logo exclusion check and active-SR gate.
        const hasExplicitZiplockTab = (isKitItem && order.displayUnitTab === 'Ziplock') || item.packingMaterialTab === 'Ziplock';
        // "Can bypass sticker gate" — kit items must complete Sticker tab first even when
        // their display unit resolves to Ziplock; only standalone packing-config items bypass.
        const canBypassZiplockSticker = !isKitItem && item.packingMaterialTab === 'Ziplock';
        // Gate on an active Sticker-type SR so that sticker=YES items alongside frosted packaging
        // still wait in the sticker tab until printed (only stickerType='Sticker' to avoid
        // false matches from a Frosted Ziplock SR created within this tab).
        const sr = findSR(order.id, product, 'Sticker');
        const hasActiveSR = sr && !STICKER_MOVED_ON_STATUSES.has(sr.status);
        if (needsSticker && !canBypassZiplockSticker && !isStickerPrinted(order.id, product, idx)) return;
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
