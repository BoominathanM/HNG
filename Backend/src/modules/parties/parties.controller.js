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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const [parties, total] = await Promise.all([
    Party.find(filter).sort('name').skip((page - 1) * limit).limit(limit).lean(),
    Party.countDocuments(filter),
  ]);

  const partyIds = parties.map((p) => p._id);
  const partyNames = parties.map((p) => (p.name || '').toLowerCase().trim()).filter(Boolean);

  // Load only orders relevant to this page's parties
  const allOrders = await Order.find({
    deletedAt: null,
    $or: [
      { clientPartyId: { $in: partyIds } },
      { clientName: { $in: partyNames.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
    ],
  })
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
        const t = _sub > 0 ? Math.round((_sub + _gst) * 100) / 100 : (Number(o.total) || Number(o.amount) || 0);
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

  res.status(200).json({ success: true, total, page, data: withTotals });
});

// Same kit-aware-ish total/paid calc used by getParties, kept identical so the
// party list totals and the ledger detail totals never disagree.
const computeOrderTotal = (o) => {
  const items = o.items?.length ? o.items : (o.products || []);
  const sub = items.reduce((acc, p) => acc + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0), 0);
  const gstFromItems = items.reduce((acc, p) => acc + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
  const gst = gstFromItems > 0 ? gstFromItems : (Number(o.gstAmount) || 0);
  return sub > 0 ? Math.round((sub + gst) * 100) / 100 : (Number(o.total) || Number(o.amount) || 0);
};
const computeOrderPaid = (o) => {
  const collTotal = (o.paymentCollection || []).reduce((cs, e) => cs + Number(e.paidAmount || 0), 0);
  return collTotal > 0 ? collTotal : (Number(o.paidAmount) || Number(o.advancePaidAmount) || Number(o.advancePaid) || 0);
};

// Total outstanding due for a hotel/party across its UNPAID INVOICES (Invoice.balanceDue,
// kept authoritative by Invoice's own pre-save hook: total - advanceAmount). Deliberately
// reads Invoice documents rather than Order documents — Order.total is not reliably kept in
// sync with the final kit-aware total (a real case: an order's stored `total` was ₹60,030
// while its actual Invoice.total was ₹78,930, because kit pricing was folded in at invoice
// time but the Order.total field was never re-saved), so summing Order totals silently
// undercounts. Invoice.total/balanceDue is always the correct, final figure.
// Matches by partyId when given, else resolves the Party by case-insensitive exact name —
// Invoice.partyId is a required reference (unlike Order.clientName, which is free text), so
// once the party is resolved the match is a direct partyId lookup, no OR-matching needed.
// excludeInvoiceId keeps the invoice currently being viewed/printed/downloaded out of its own
// "other pending" total — excluding by INVOICE, not by order, matters when one order has more
// than one invoice against it (e.g. a re-issued invoice): excluding the whole order would hide
// a sibling invoice's genuine outstanding balance from the other.
//
// A payment recorded straight onto the linked Order does NOT always sync back onto the
// Invoice — e.g. syncOrderPaymentCollection (fired from a Quotation-stage payment via
// updateQuotation) writes only to Order.paymentCollection/paidAmount via findByIdAndUpdate,
// bypassing the Invoice-sync block that only lives in Sales' own updateOrder handler. Left
// unchecked, Invoice.advanceAmount can under-report a payment that Sales/Operations/Dispatch
// already show as received, making an ALREADY-PAID invoice look pending here. So for every
// invoice with a linked order, reconcile against that order the same way the codebase's own
// resolveOrderPaymentStatus already does (utils/syncOrderPayment.js): take the larger of
// Invoice vs Order paid, and the larger of Invoice vs Order total, before computing the due.
exports.getHotelPendingDue = asyncHandler(async (req, res) => {
  const { partyId: partyIdParam, clientName, excludeInvoiceId } = req.query;
  let partyId = partyIdParam;
  if (!partyId && clientName && clientName.trim()) {
    const nameRe = new RegExp(`^${clientName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const party = await Party.findOne({ name: nameRe, deletedAt: null }).select('_id').lean();
    partyId = party?._id;
  }
  if (!partyId) {
    return res.status(200).json({ success: true, data: { pending: 0, hotelName: clientName || null, invoiceCount: 0 } });
  }

  const filter = { partyId };
  if (excludeInvoiceId) filter._id = { $ne: excludeInvoiceId };

  const invoices = await Invoice.find(filter).select('total advanceAmount balanceDue isComplementary orderId').lean();

  const orderIds = invoices.map((inv) => inv.orderId).filter(Boolean);
  const orders = orderIds.length
    ? await Order.find({ _id: { $in: orderIds } })
        .select('paymentCollection paidAmount advancePaidAmount advancePaid total amount')
        .lean()
    : [];
  const orderById = new Map(orders.map((o) => [o._id.toString(), o]));

  const pending = invoices.reduce((s, inv) => {
    if (inv.isComplementary) return s;
    let paid = Number(inv.advanceAmount) || 0;
    let total = Number(inv.total) || 0;
    const order = inv.orderId ? orderById.get(inv.orderId.toString()) : null;
    if (order) {
      paid = Math.max(paid, computeOrderPaid(order));
      total = Math.max(total, Number(order.total) || Number(order.amount) || 0);
    }
    return s + Math.max(0, total - paid);
  }, 0);

  res.status(200).json({
    success: true,
    data: { pending: Math.round(pending * 100) / 100, hotelName: clientName || null, invoiceCount: invoices.length },
  });
});

// Builds the full ledger for a party: real LedgerEntry rows (Invoice/Payment/
// Credit/Debit Note/Opening Balance) PLUS a synthetic Bill/Payment row for every
// order that isn't already backed by a real ledger entry — so "paid and unpaid
// history" covers every order under the party, not just the ones Billing wrote a
// LedgerEntry for. An Invoice *document* existing isn't enough to skip an order:
// some historical invoices never got a LedgerEntry written (a gap in the billing
// flow that predates this), which would otherwise hide that order's amount
// entirely — so the check is against real 'Invoice' ledger rows, not Invoice docs.
const buildPartyLedger = async (party) => {
  const entries = await LedgerEntry.find({ partyId: party._id }).sort('entryDate').lean();
  const invoicedNumbersInLedger = new Set(entries.filter((e) => e.type === 'Invoice' && e.docRef).map((e) => e.docRef));

  const nameRe = new RegExp(`^${party.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const [orders, invoices] = await Promise.all([
    Order.find({ $or: [{ clientPartyId: party._id }, { clientName: nameRe }], deletedAt: null }).lean(),
    Invoice.find({ partyId: party._id }).select('orderId invoiceNumber').lean(),
  ]);
  const invoiceByOrderId = new Map(invoices.filter((i) => i.orderId).map((i) => [i.orderId.toString(), i]));
  const unbilledOrders = orders.filter((o) => {
    const inv = invoiceByOrderId.get(o._id.toString());
    return !(inv && invoicedNumbersInLedger.has(inv.invoiceNumber));
  });

  const synthetic = [];
  unbilledOrders.forEach((o) => {
    const total = computeOrderTotal(o);
    const paid = computeOrderPaid(o);
    if (total > 0) synthetic.push({ entryDate: o.createdAt, type: 'Order', docRef: o.orderCode, debit: total, credit: 0 });
    if (paid > 0) synthetic.push({ entryDate: o.updatedAt || o.createdAt, type: 'Payment', docRef: o.orderCode, debit: 0, credit: paid });
  });

  const merged = [...entries, ...synthetic].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  let running = 0;
  return merged.map((e) => {
    running += (e.debit || 0) - (e.credit || 0);
    return { ...e, balance: running };
  });
};

exports.getPartyLedger = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const entries = await buildPartyLedger(party);
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
  const entries = await buildPartyLedger(party);
  const csv = ['Date,Type,Document,Debit,Credit,Balance']
    .concat(entries.map((e) =>
      `${e.entryDate?.toISOString().slice(0,10)},${e.type},${e.docRef},${e.debit},${e.credit},${e.balance}`
    ))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=ledger-${party.name}.csv`);
  res.send(csv);
});
