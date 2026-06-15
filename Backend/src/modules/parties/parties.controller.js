const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Order = require('../../models/Order');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.createParty = asyncHandler(async (req, res) => {
  const { name, phone, type = 'Customer', gstNumber, panNumber, contactPerson, city, state, pincode, street } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Party name is required' });
  // Upsert: match by phone (if provided) OR name to avoid duplicates
  const filter = phone
    ? { $or: [{ phone }, { name: new RegExp(`^${name.trim()}$`, 'i') }], deletedAt: null }
    : { name: new RegExp(`^${name.trim()}$`, 'i'), deletedAt: null };
  const update = { $setOnInsert: { name, phone, type, gstNumber, panNumber, contactPerson, city, state, pincode, street, createdBy: req.user?._id } };
  const party = await Party.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(200).json({ success: true, data: party });
});

exports.getParties = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const parties = await Party.find(filter).sort('name').lean();

  // Load all orders once and group by partyId + clientName for O(n) lookup
  const allOrders = await Order.find({ deletedAt: null })
    .select('clientPartyId clientName total amount gstAmount paidAmount advancePaidAmount advancePaid paymentCollection items products')
    .lean();

  const ordersByPartyId = {};
  const ordersByName = {};
  allOrders.forEach((o) => {
    if (o.clientPartyId) {
      const id = o.clientPartyId.toString();
      if (!ordersByPartyId[id]) ordersByPartyId[id] = [];
      ordersByPartyId[id].push(o);
    }
    const name = (o.clientName || '').toLowerCase().trim();
    if (name) {
      if (!ordersByName[name]) ordersByName[name] = [];
      ordersByName[name].push(o);
    }
  });

  const withTotals = parties.map((p) => {
    const pId = p._id.toString();
    const pName = (p.name || '').toLowerCase().trim();

    // Merge orders matched by DB ref and by name (dedupe: skip name-match if already has partyId ref)
    const byId = ordersByPartyId[pId] || [];
    const byNameOnly = (ordersByName[pName] || []).filter((o) => !o.clientPartyId);
    const partyOrders = [...byId, ...byNameOnly];

    if (partyOrders.length > 0) {
      // Customer party: derive amounts from Sales Orders
      const totalSales = partyOrders.reduce((s, o) => {
        const _items = o.items?.length ? o.items : (o.products || []);
        const _sub = _items.reduce((acc, p) => acc + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0), 0);
        const _gstFromItems = _items.reduce((acc, p) => acc + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
        const _gst = _gstFromItems > 0 ? _gstFromItems : (Number(o.gstAmount) || 0);
        const t = _sub > 0 ? Math.round(_sub + _gst) : (Number(o.total) || Number(o.amount) || 0);
        return s + t;
      }, 0);
      const received = partyOrders.reduce((s, o) => {
        const collTotal = (o.paymentCollection || []).reduce((cs, e) => cs + Number(e.paidAmount || 0), 0);
        const paid = collTotal > 0 ? collTotal : (Number(o.paidAmount) || Number(o.advancePaidAmount) || Number(o.advancePaid) || 0);
        return s + paid;
      }, 0);
      const pending = Math.max(0, totalSales - received);
      return { ...p, totalSales, received, pending };
    }

    // Supplier / no-order party: fall back to Invoice-based totals
    return { ...p, totalSales: 0, received: 0, pending: 0 };
  });

  // For supplier-type parties still at 0, load invoice totals in bulk
  const zeroPartyIds = withTotals
    .filter((p) => p.totalSales === 0 && p.type === 'Supplier')
    .map((p) => p._id);

  if (zeroPartyIds.length > 0) {
    const invoices = await Invoice.find({ partyId: { $in: zeroPartyIds } }).lean();
    const invByParty = {};
    invoices.forEach((inv) => {
      const id = inv.partyId.toString();
      if (!invByParty[id]) invByParty[id] = [];
      invByParty[id].push(inv);
    });
    withTotals.forEach((p) => {
      const id = p._id.toString();
      if (invByParty[id]) {
        const invs = invByParty[id];
        p.totalSales = invs.reduce((s, i) => s + (i.total || 0), 0);
        p.received   = invs.reduce((s, i) => s + ((i.total || 0) - (i.balanceDue || 0)), 0);
        p.pending    = invs.reduce((s, i) => s + (i.balanceDue || 0), 0);
      }
    });
  }

  res.status(200).json({ success: true, total: parties.length, data: withTotals });
});

exports.getPartyLedger = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const entries = await LedgerEntry.find({ partyId: party._id }).sort('entryDate');
  const runningBalance = entries.length ? entries[entries.length - 1].balance : 0;
  res.status(200).json({ success: true, data: entries, runningBalance, party });
});

exports.getCustomersLedger = asyncHandler(async (req, res) => {
  const parties = await Party.find({ type: 'Customer', deletedAt: null });
  const data = await Promise.all(parties.map(async (p) => {
    const entries = await LedgerEntry.find({ partyId: p._id }).sort('-entryDate').limit(10);
    const balance = entries.length ? entries[0].balance : 0;
    return { party: p, recentEntries: entries, balance };
  }));
  res.status(200).json({ success: true, data });
});

exports.getVendorsLedger = asyncHandler(async (req, res) => {
  const parties = await Party.find({ type: 'Supplier', deletedAt: null });
  const data = await Promise.all(parties.map(async (p) => {
    const entries = await LedgerEntry.find({ partyId: p._id }).sort('-entryDate').limit(10);
    const balance = entries.length ? entries[0].balance : 0;
    return { party: p, recentEntries: entries, balance };
  }));
  res.status(200).json({ success: true, data });
});

exports.getPartyOrders = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const nameRe = new RegExp(`^${party.name.trim()}$`, 'i');
  const orders = await Order.find({
    $or: [{ clientPartyId: party._id }, { clientName: nameRe }],
    deletedAt: null,
  }).populate('assignedTo', 'fullName').sort('-createdAt');
  res.status(200).json({ success: true, total: orders.length, data: orders });
});

exports.deleteParty = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  party.deletedAt = Date.now();
  await party.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Party moved to deleted records' });
});

exports.downloadLedgerCsv = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const entries = await LedgerEntry.find({ partyId: party._id }).sort('entryDate');
  const csv = ['Date,Type,Document,Debit,Credit,Balance']
    .concat(entries.map((e) =>
      `${e.entryDate?.toISOString().slice(0,10)},${e.type},${e.docRef},${e.debit},${e.credit},${e.balance}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=ledger-${party.name}.csv`);
  res.send(csv);
});
