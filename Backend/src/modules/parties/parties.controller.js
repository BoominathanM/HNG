const mongoose = require('mongoose');
const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Order = require('../../models/Order');
const Negotiation = require('../../models/Negotiation');
const Kit = require('../../models/Kit');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { computeCompositionGrandTotal, storedTotalWithRoundOff } = require('../../utils/orderCalc');
// Consumption Forecast math lives in utils/consumptionForecast.js so the Alert
// Configuration 'consumption_forecast' group fires on exactly the same "Reorder Now"
// status the getConsumptionForecast endpoint returns.
const { getConsumptionForecastData } = require('../../utils/consumptionForecast');

exports.createParty = asyncHandler(async (req, res) => {
  const { name, phone, type = 'Customer', gstNumber, panNumber, contactPerson, city, state, pincode, street, category } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Party name is required' });
  // Upsert: match by phone (if provided) OR name to avoid duplicates
  const filter = phone
    ? { $or: [{ phone }, { name: new RegExp(`^${name.trim()}$`, 'i') }], deletedAt: null }
    : { name: new RegExp(`^${name.trim()}$`, 'i'), deletedAt: null };
  const update = { $setOnInsert: { name, phone, type, gstNumber, panNumber, contactPerson, city, state, pincode, street, category, createdBy: req.user?._id } };
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
    .select('clientPartyId clientName total amount gstAmount paidAmount advancePaidAmount advancePaid paymentCollection items products kitOrders kitPrice kitOverallQty forwardingCharge forwardingChargeAmount packagingIncludes packagingIncludesQty transportationBy')
    .lean();

  // Only needed for orders using "Select Kit(s) to Include" (packagingIncludes) — fetched once
  // up front rather than per-order.
  const kitsData = allOrders.some((o) => (o.packagingIncludes || []).length > 0)
    ? await Kit.find().lean()
    : [];

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
      // Customer party: derive amounts from Sales Orders, recomputed via the same kit-aware
      // formula the frontend uses (computeCompositionGrandTotal, which itself falls back to
      // the plain computeRecordGrandTotal buckets when packagingIncludes isn't used) — see
      // computeOrderTotal below for why trusting the stored Order.total/amount fields directly
      // is unsafe (they're written at whatever save happened last, and can predate a pricing
      // fix or a payment-only update).
      const totalSales = partyOrders.reduce((s, o) => s + computeCompositionGrandTotal(o, kitsData), 0);
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

// Same kit-aware total/paid calc used by getParties, kept identical so the party list
// totals and the ledger detail totals never disagree.
//
// Recomputes from the order's own products/kitOrders/forwardingCharge/packagingIncludes via
// the backend port of the frontend's canonical computeCompositionGrandTotal (utils/orderCalc.js)
// rather than trusting the stored Order.total/amount fields — those are only as fresh as
// whatever save wrote them last (a payment-only update, or an older save that predates a
// pricing fix, can leave them stale/wrong), and this function is used specifically for orders
// that have no Invoice/LedgerEntry yet, so there's no other authoritative figure to fall back to.
const computeOrderTotal = (o, kitsData = []) => computeCompositionGrandTotal(o, kitsData);
const computeOrderPaid = (o) => {
  const collTotal = (o.paymentCollection || []).reduce((cs, e) => cs + Number(e.paidAmount || 0), 0);
  return collTotal > 0 ? collTotal : (Number(o.paidAmount) || Number(o.advancePaidAmount) || Number(o.advancePaid) || 0);
};

// Total outstanding due for a hotel/party across its OTHER SALES ORDERS only — the "Pending
// Amount (hotel)" line on every Billing / Sales / Dispatch invoice & quotation. Leads,
// negotiations and quotations are never counted (nothing is owed until the deal is a confirmed
// order), and invoices aren't the source either: an invoice is only the bill for an order, and
// an order is owed from the moment it's confirmed whether or not Billing has raised its invoice
// yet — summing invoices silently missed every hotel whose order was still waiting on one.
// Cancelled orders and Sample orders (no payment is expected for samples) are skipped.
//
// Per order: total = the kit-aware composition total (computeOrderTotal — the same figure the
// Billing invoice prints for that order), falling back to the stored Order.total only when
// there's nothing to compute from. The stored total goes stale: it can miss the forwarding
// charge or kit pricing, or still carry a courier charge whose Transport Cost Scope is HNG.
// paid = the order's own payment record (the larger of its paymentCollection sum and stored
// paid field, like Billing's sumPaid) — every Billing Record Payment In is pushed onto the
// order via syncOrderPaymentCollection, so the order alone has the full paid figure.
//
// Hotel match mirrors getParties: orders referencing the party, plus name-matched orders that
// carry no party reference at all. The document's OWN order is excluded so it never shows as
// its own "other" pending — by excludeOrderId directly, by excludeInvoiceId (→ that invoice's
// order / quotation), or by excludeQuotationId / excludeNegotiationId (→ the order converted
// from that quotation / negotiation, when it's been converted).
exports.getHotelPendingDue = asyncHandler(async (req, res) => {
  const { partyId: partyIdParam, clientName, excludeInvoiceId, excludeOrderId, excludeQuotationId, excludeNegotiationId } = req.query;
  const validId = (id) => (id && mongoose.isValidObjectId(id) ? id : null);
  let name = (clientName || '').trim();
  let partyId = validId(partyIdParam);
  if (partyId && !name) {
    const party = await Party.findById(partyId).select('name').lean();
    name = (party?.name || '').trim();
  }
  const nameRe = name ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
  if (!partyId && nameRe) {
    const party = await Party.findOne({ name: nameRe, deletedAt: null }).select('_id').lean();
    partyId = party?._id || null;
  }
  if (!partyId && !nameRe) {
    return res.status(200).json({ success: true, data: { pending: 0, hotelName: clientName || null, orderCount: 0 } });
  }

  const excludedOrderIds = [validId(excludeOrderId)].filter(Boolean);
  const excludedLinks = [];
  if (validId(excludeQuotationId)) excludedLinks.push({ quotationId: excludeQuotationId });
  if (validId(excludeNegotiationId)) {
    excludedLinks.push({ negotiationId: excludeNegotiationId });
    // Orders are converted from the quotation and carry only its quotationId — reach the
    // negotiation's order through the quotation it links to.
    const neg = await Negotiation.findById(excludeNegotiationId).select('quotationId').lean();
    if (neg?.quotationId) excludedLinks.push({ quotationId: neg.quotationId });
  }
  if (validId(excludeInvoiceId)) {
    const inv = await Invoice.findById(excludeInvoiceId).select('orderId quotationId').lean();
    if (inv?.orderId) excludedOrderIds.push(inv.orderId);
    if (inv?.quotationId) excludedLinks.push({ quotationId: inv.quotationId });
  }

  const filter = {
    deletedAt: null,
    status: { $ne: 'Cancelled' },
    orderCategory: { $ne: 'SAMPLE' },
    $or: partyId
      ? [{ clientPartyId: partyId }, ...(nameRe ? [{ clientPartyId: null, clientName: nameRe }] : [])]
      : [{ clientName: nameRe }],
  };
  if (excludedOrderIds.length) filter._id = { $nin: excludedOrderIds };
  if (excludedLinks.length) filter.$nor = excludedLinks;

  const orders = await Order.find(filter)
    .select('total amount paidAmount advancePaidAmount advancePaid paymentCollection items products kitOrders kitPrice kitOverallQty forwardingCharge forwardingChargeAmount packagingIncludes packagingIncludesQty transportationBy')
    .lean();
  // Only needed for orders using "Select Kit(s) to Include" (packagingIncludes).
  const kitsData = orders.some((o) => (o.packagingIncludes || []).length > 0)
    ? await Kit.find().lean()
    : [];

  const pending = orders.reduce((s, o) => {
    const computed = computeOrderTotal(o, kitsData);
    const total = computed > 0 ? computed : storedTotalWithRoundOff(o.total || o.amount, o, kitsData);
    const collTotal = (o.paymentCollection || []).reduce((cs, e) => cs + Number(e?.paidAmount || 0), 0);
    const paid = Math.max(collTotal, Number(o.paidAmount) || Number(o.advancePaidAmount) || Number(o.advancePaid) || 0);
    return s + Math.max(0, total - paid);
  }, 0);

  res.status(200).json({
    success: true,
    data: { pending: Math.round(pending * 100) / 100, hotelName: clientName || null, orderCount: orders.length },
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

  // Only needed for orders using "Select Kit(s) to Include" (packagingIncludes).
  const kitsData = unbilledOrders.some((o) => (o.packagingIncludes || []).length > 0)
    ? await Kit.find().lean()
    : [];

  const synthetic = [];
  unbilledOrders.forEach((o) => {
    const total = computeOrderTotal(o, kitsData);
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

exports.getConsumptionForecast = asyncHandler(async (req, res) => {
  const dataAll = await getConsumptionForecastData();

  // A hotel with no order history has nothing to forecast — drop it rather than show an
  // all-dashes row with no actionable information.
  const data = dataAll.filter((h) => h.products.length > 0);

  // Hotels with an urgent/soon product surface first, then by nearest days-remaining.
  const statusRank = { 'Reorder Now': 0, 'Reorder Soon': 1, 'Sufficient Stock': 2, 'Insufficient Data': 3 };
  data.sort((a, b) => {
    const ra = statusRank[a.mostUrgent?.status] ?? 4;
    const rb = statusRank[b.mostUrgent?.status] ?? 4;
    if (ra !== rb) return ra - rb;
    const da = a.mostUrgent?.daysRemaining;
    const db = b.mostUrgent?.daysRemaining;
    if (da === null || da === undefined) return 1;
    if (db === null || db === undefined) return -1;
    return da - db;
  });

  res.status(200).json({ success: true, total: data.length, data });
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
