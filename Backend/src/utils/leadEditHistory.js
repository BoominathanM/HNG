// Diffs a Lead update patch against its pre-edit state to build editHistory entries
// (field, old value, new value, who, when) for the Parties tab's "Hotel / Company
// Information" view modal Change Timeline — same pattern as utils/orderEditHistory.js,
// scoped to the Hotel/Company Information + Billing & Address fields.

const SCALAR_FIELDS = {
  category: 'Category',
  hotelName: 'Hotel / Company Name',
  billingName: 'Billing Name',
  hotelType: 'Hotel Type',
  branch: 'Branch',
  numRooms: 'No. of Rooms',
  generalOccupancy: 'Occupancy (%)',
  contactPerson: 'Contact Person',
  pocDesignation: 'POC Designation',
  phone: 'Phone',
  email: 'Email',
  altRole: 'Alt. Role',
  altName: 'Alt. Name',
  altNumber: 'Alt. Number',
  location: 'Location / City',
  destination: 'Destination',
  gstNumber: 'GSTIN',
  gstPhone: 'GST Phone',
  billType: 'Bill Type',
  detailedAddress: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode',
  hotelLogoUrl: 'Hotel Logo',
};

const fmt = (v) => {
  if (v === undefined || v === null || v === '') return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

const normalize = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  return v;
};

function buildLeadEditHistory(existingLead, patch, user) {
  const entries = [];
  const now = new Date();
  const changedBy = user?._id;
  const changedByName = user?.fullName || user?.name || 'System';

  Object.keys(SCALAR_FIELDS).forEach((field) => {
    if (!(field in patch)) return;
    const oldVal = normalize(existingLead[field]);
    const newVal = normalize(patch[field]);
    if (String(oldVal) === String(newVal)) return;
    entries.push({
      field: SCALAR_FIELDS[field],
      oldValue: fmt(existingLead[field]),
      newValue: fmt(patch[field]),
      changedAt: now,
      changedBy,
      changedByName,
    });
  });

  return entries;
}

module.exports = { buildLeadEditHistory };
