// Shared Consumption Forecast logic — used by both the Sales "Consumption Forecast"
// tab endpoint (modules/parties/parties.controller.js getConsumptionForecast) and the
// Alert Configuration 'consumption_forecast' group (utils/alertConfigQueries.js) so the
// "Reorder Now" status the alert fires on is computed exactly the same way the UI shows it.
const Party = require('../models/Party');
const Order = require('../models/Order');
const Lead = require('../models/Lead');

// One unit consumed per occupied room per day — the standard hotel-amenity assumption used
// ONLY as a bootstrap when a product has fewer than 2 orders to derive a real rate from.
const DEFAULT_USAGE_PER_ROOM_PER_DAY = 1;
const REORDER_SOON_THRESHOLD_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Estimates per-product consumption for a hotel from its own order history, falling back to a
// Rooms × Occupancy% bootstrap only when there isn't enough order history to derive a real rate.
const computeForecastForOrders = (orders, numRooms, generalOccupancy) => {
  const byProduct = new Map(); // normalized name -> { displayName, entries: [{date, qty}] }

  orders.forEach((o) => {
    const items = o.items?.length ? o.items : (o.product ? [{ itemName: o.product, qty: o.qty }] : []);
    const date = o.createdAt;
    if (!date) return;
    items.forEach((it) => {
      const name = (it.itemName || '').trim();
      const qty = Number(it.qty) || 0;
      if (!name || qty <= 0) return;
      const key = name.toLowerCase();
      if (!byProduct.has(key)) byProduct.set(key, { displayName: name, entries: [] });
      byProduct.get(key).entries.push({ date, qty });
    });
  });

  const today = Date.now();
  const products = [];
  byProduct.forEach(({ displayName, entries }) => {
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = entries[entries.length - 1];
    const lastOrderQty = last.qty;
    const lastOrderDate = last.date;

    let dailyRate = null;
    if (entries.length >= 2) {
      const first = entries[0];
      const spanDays = (new Date(last.date) - new Date(first.date)) / MS_PER_DAY;
      const qtyAfterFirst = entries.slice(1).reduce((s, e) => s + e.qty, 0);
      if (spanDays > 0) dailyRate = qtyAfterFirst / spanDays;
    }
    if (dailyRate === null && numRooms && generalOccupancy) {
      dailyRate = numRooms * (generalOccupancy / 100) * DEFAULT_USAGE_PER_ROOM_PER_DAY;
    }

    const daysSinceLastOrder = (today - new Date(lastOrderDate).getTime()) / MS_PER_DAY;
    let daysRemaining = null;
    let estimatedStockOutDate = null;
    let status = 'Insufficient Data';
    if (dailyRate > 0) {
      const estimatedQtyRemaining = Math.max(0, lastOrderQty - dailyRate * daysSinceLastOrder);
      daysRemaining = estimatedQtyRemaining / dailyRate;
      estimatedStockOutDate = new Date(today + daysRemaining * MS_PER_DAY);
      status = daysRemaining <= 0 ? 'Reorder Now' : daysRemaining <= REORDER_SOON_THRESHOLD_DAYS ? 'Reorder Soon' : 'Sufficient Stock';
    }

    products.push({
      itemName: displayName,
      orderCount: entries.length,
      lastOrderQty,
      lastOrderDate,
      estimatedDailyConsumption: dailyRate,
      estimatedMonthlyConsumption: dailyRate !== null ? dailyRate * 30 : null,
      daysRemaining,
      estimatedStockOutDate,
      status,
    });
  });

  products.sort((a, b) => {
    if (a.daysRemaining === null) return 1;
    if (b.daysRemaining === null) return -1;
    return a.daysRemaining - b.daysRemaining;
  });
  return products;
};

// Returns the unsorted/unfiltered per-hotel forecast rows:
//   [{ partyId, hotelName, numRooms, generalOccupancy, salesPerson, lastOrderDate, products, mostUrgent }]
// Callers filter (drop empty `products`) and sort as they need.
const getConsumptionForecastData = async () => {
  const parties = await Party.find({ type: 'Customer', deletedAt: null }).sort('name').lean();

  return Promise.all(parties.map(async (party) => {
    const escaped = party.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRe = new RegExp(`^${escaped}$`, 'i');

    const [orders, lead] = await Promise.all([
      Order.find({ $or: [{ clientPartyId: party._id }, { clientName: nameRe }], deletedAt: null })
        .select('items product qty createdAt salesPerson')
        .lean(),
      Lead.findOne({ hotelName: nameRe, deletedAt: null }).sort('-createdAt').select('numRooms generalOccupancy salesPerson').lean(),
    ]);

    const numRooms = lead?.numRooms || null;
    const generalOccupancy = lead?.generalOccupancy || null;
    const products = computeForecastForOrders(orders, numRooms, generalOccupancy);
    const mostUrgent = products[0] || null;
    const mostRecentOrder = orders.length
      ? orders.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b))
      : null;
    const salesPerson = mostRecentOrder?.salesPerson || lead?.salesPerson || null;
    const lastOrderDate = mostRecentOrder?.createdAt || null;

    return {
      partyId: party._id,
      hotelName: party.name,
      numRooms,
      generalOccupancy,
      salesPerson,
      lastOrderDate,
      products,
      mostUrgent,
    };
  }));
};

module.exports = {
  computeForecastForOrders,
  getConsumptionForecastData,
  REORDER_SOON_THRESHOLD_DAYS,
  MS_PER_DAY,
};
