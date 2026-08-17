// Diffs an Order update patch against its pre-edit state to build editHistory entries
// (field, old value, new value, who, when) for the Order Detail Activity Timeline.
//
// Scope is deliberately curated rather than exhaustive: simple business fields get a real
// old→new value comparison, while array/object fields (products, kitOrders, paymentCollection,
// etc.) only get a single "count changed" entry — diffing individual line items would make the
// timeline noisy without adding much the Products/Payment cards don't already show.

const SCALAR_FIELDS = {
  hotelName: 'Hotel / Company Name',
  billingName: 'Billing Name',
  contactPerson: 'Contact Person',
  pocDesignation: 'POC Designation',
  phone: 'Phone',
  clientPhone: 'Phone',
  email: 'Email',
  alternativeName: 'Alt. Name',
  alternativeRole: 'Alt. Role',
  alternativePhone: 'Alt. Number',
  detailedAddress: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  gstNumber: 'GSTIN',
  category: 'Category',
  hotelType: 'Hotel Type',
  branch: 'Branch',
  rooms: 'No. of Rooms',
  numRooms: 'No. of Rooms',
  occupancy: 'Occupancy (%)',
  generalOccupancy: 'Occupancy (%)',
  location: 'Location / City',
  destination: 'Destination',
  salesPerson: 'Assigned To',
  deliveryBy: 'Delivery By',
  transportationBy: 'Transportation By',
  forwardingCharge: 'Forwarding Charge',
  forwardingChargeAmount: 'Forwarding Charge Amount',
  expectedDeliveryDate: 'Expected Delivery Date',
  paymentTerms: 'Payment Terms',
  paymentReminderDate: 'Payment Reminder Date',
  status: 'Order Status',
  kitDisplayUnit: 'Kit Display Unit',
  displayUnit: 'Display Unit',
  kitSize: 'Kit Size',
  kitSticker: 'Kit Sticker',
  kitLogo: 'Kit Logo',
  kitPrinting: 'Kit Printing',
  kitOverallQty: 'Kit Overall Qty',
  kitPrice: 'Kit Price',
  productType: 'Product Type',
  deliveryType: 'Delivery Type',
  total: 'Total Amount',
  amount: 'Amount',
  advancePaid: 'Advance Paid',
  advancePaidAmount: 'Advance Paid Amount',
  paidAmount: 'Paid Amount',
  gstAmount: 'GST Amount',
};

const ARRAY_FIELDS = {
  items: 'Items',
  products: 'Products',
  kitOrders: 'Kit Orders',
  paymentCollection: 'Payment Collection',
  splitDates: 'Split Delivery Dates',
  packagingIncludes: 'Packaging Includes',
  packagingIncludesQty: 'Packaging Includes Qty',
  selectedKits: 'Selected Kits',
  paymentProofs: 'Payment Proofs',
};

const fmt = (v) => {
  if (v === undefined || v === null || v === '') return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

// Dates can arrive as an ISO string in the patch but live as a Date on the existing doc —
// normalize both to a comparable primitive before deciding whether a field actually changed.
const normalize = (v) => {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.trim();
  return v;
};

const countOf = (v) => (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0));
const plural = (n) => `${n} entr${n === 1 ? 'y' : 'ies'}`;

function buildOrderEditHistory(existingOrder, patch, user) {
  const entries = [];
  const now = new Date();
  const changedBy = user?._id;
  const changedByName = user?.fullName || user?.name || 'System';

  Object.keys(SCALAR_FIELDS).forEach((field) => {
    if (!(field in patch)) return;
    const oldVal = normalize(existingOrder[field]);
    const newVal = normalize(patch[field]);
    if (String(oldVal) === String(newVal)) return;
    entries.push({
      field: SCALAR_FIELDS[field],
      oldValue: fmt(existingOrder[field]),
      newValue: fmt(patch[field]),
      changedAt: now,
      changedBy,
      changedByName,
    });
  });

  Object.keys(ARRAY_FIELDS).forEach((field) => {
    if (!(field in patch)) return;
    const oldArr = existingOrder[field];
    const newArr = patch[field];
    if (JSON.stringify(oldArr ?? null) === JSON.stringify(newArr ?? null)) return;
    entries.push({
      field: ARRAY_FIELDS[field],
      oldValue: plural(countOf(oldArr)),
      newValue: plural(countOf(newArr)),
      changedAt: now,
      changedBy,
      changedByName,
    });
  });

  return entries;
}

module.exports = { buildOrderEditHistory };
