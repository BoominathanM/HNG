const Lead = require('../models/Lead');
const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const Negotiation = require('../models/Negotiation');
const escapeRegex = require('./escapeRegex');

// The hotel logo lives on the Lead (hotelLogoUrl). Orders keep their own copy (logoUrl,
// frozen at convertToOrder), and every screen reads `order.logoUrl || order.leadId.hotelLogoUrl`.

/** The logo to show for an order (plain object; leadId may be populated or a bare id). */
const resolveOrderLogoUrl = (o) => (o && (o.logoUrl || (o.leadId && typeof o.leadId === 'object' ? o.leadId.hotelLogoUrl : ''))) || '';

// A hotel's logo is only ever captured once, on whichever Lead happened to have it
// uploaded (or via the "Old Hotel" lookup at lead-creation time, sales.controller.js
// getHotelByName). A repeat hotel that gets a fresh Lead/Order created WITHOUT going
// through that lookup (e.g. picked "New Hotel" again, or its own leadId never had the
// upload) still has no logo of its own, so o.logoUrl and o.leadId?.hotelLogoUrl are
// both empty even though the hotel's logo already exists on another Lead. Backfill from
// the most recent Lead sharing that hotel name so any order for a hotel whose logo is on
// record anywhere shows it. Mutates the given plain order objects (o.logoUrl); nothing
// is written to the DB.
async function backfillLogoUrlByHotelName(orders) {
  const list = (orders || []).filter((o) => o && typeof o === 'object');
  const missingNames = [...new Set(
    list
      .filter((o) => !resolveOrderLogoUrl(o))
      .map((o) => (o.hotelName || o.clientName || '').trim())
      .filter(Boolean)
  )];
  if (!missingNames.length) return;
  const fallbackLeads = await Lead.find({
    // Allow stray leading/trailing spaces on the Lead's saved hotelName so "ESSENCE " still
    // matches an order for "ESSENCE" (the key below is trimmed the same way on both sides).
    hotelName: { $in: missingNames.map((n) => new RegExp(`^\\s*${escapeRegex(n)}\\s*$`, 'i')) },
    hotelLogoUrl: { $exists: true, $ne: '' },
    deletedAt: null,
  }).sort('-createdAt').select('hotelName hotelLogoUrl').lean();
  const logoByHotel = new Map();
  for (const l of fallbackLeads) {
    const key = (l.hotelName || '').trim().toLowerCase();
    if (key && !logoByHotel.has(key)) logoByHotel.set(key, l.hotelLogoUrl);
  }
  if (!logoByHotel.size) return;
  list.forEach((o) => {
    if (resolveOrderLogoUrl(o)) return;
    const key = (o.hotelName || o.clientName || '').trim().toLowerCase();
    const fallback = logoByHotel.get(key);
    if (fallback) o.logoUrl = fallback;
  });
}

// Orders/quotations/negotiations freeze a copy of the hotel logo when they're created, and
// every module reads that copy first. A logo added or replaced afterwards (on the Lead, or
// from Sales → Orders → Edit Order) must reach all of them, or records raised before the
// change keep showing no logo / the old one.
async function syncLeadLogoCopies(leadId, newLogo) {
  if (!leadId) return;
  const logo = newLogo || '';
  await Promise.all([
    Order.updateMany({ leadId, deletedAt: null }, { $set: { logoUrl: logo } }),
    Quotation.updateMany({ leadId }, { $set: { logoUrl: logo, hotelLogoUrl: logo } }),
    Negotiation.updateMany({ leadId }, { $set: { logoUrl: logo, hotelLogoUrl: logo } }),
  ]);
}

module.exports = { resolveOrderLogoUrl, backfillLogoUrlByHotelName, syncLeadLogoCopies };
