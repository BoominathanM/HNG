const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.getParties = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const parties = await Party.find(filter).sort('name');

  // Attach totals
  const withTotals = await Promise.all(parties.map(async (p) => {
    const invoices = await Invoice.find({ partyId: p._id });
    const totalSales = invoices.reduce((s, i) => s + i.total, 0);
    const received = invoices.reduce((s, i) => s + (i.total - (i.balanceDue || 0)), 0);
    const pending = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
    return { ...p.toObject(), totalSales, received, pending };
  }));

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
