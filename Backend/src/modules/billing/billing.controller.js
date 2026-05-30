const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Quotation = require('../../models/Quotation');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');

// ─── PARTIES ─────────────────────────────────────────────────────────────────
exports.getParties = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  const parties = await Party.find(filter).sort('name');
  res.status(200).json({ success: true, total: parties.length, data: parties });
});

exports.createParty = asyncHandler(async (req, res) => {
  const party = await Party.create({ ...req.body, createdBy: req.user._id });

  if (req.body.openingBalance && req.body.openingBalance !== 0) {
    const isDebit = req.body.openingBalDir === 'receive';
    const lastEntry = await LedgerEntry.findOne({ partyId: party._id }).sort('-createdAt');
    const prevBal = lastEntry ? lastEntry.balance : 0;
    const balance = isDebit ? prevBal + req.body.openingBalance : prevBal - req.body.openingBalance;
    await LedgerEntry.create({
      partyId: party._id,
      type: 'Opening Balance',
      docRef: 'OB',
      debit: isDebit ? req.body.openingBalance : 0,
      credit: isDebit ? 0 : req.body.openingBalance,
      balance,
      createdBy: req.user._id,
    });
    party.runningBalance = balance;
    await party.save({ validateBeforeSave: false });
  }

  res.status(201).json({ success: true, data: party });
});

exports.updateParty = asyncHandler(async (req, res, next) => {
  const party = await Party.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!party) return next(new AppError('Party not found', 404));
  res.status(200).json({ success: true, data: party });
});

exports.deleteParty = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  party.deletedAt = Date.now();
  await party.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Party deleted' });
});

exports.getPartyLedger = asyncHandler(async (req, res, next) => {
  const party = await Party.findOne({ _id: req.params.id, deletedAt: null });
  if (!party) return next(new AppError('Party not found', 404));
  const entries = await LedgerEntry.find({ partyId: party._id }).sort('entryDate');
  const runningBalance = entries.length ? entries[entries.length - 1].balance : 0;
  res.status(200).json({ success: true, data: entries, runningBalance, party });
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────
exports.getInvoices = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.partyId) filter.partyId = req.query.partyId;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ invoiceNumber: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).populate('partyId', 'name phone').populate('orderId', 'orderCode').sort('-invoiceDate').skip((page - 1) * limit).limit(limit),
    Invoice.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: invoices });
});

exports.getInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id).populate('partyId').populate('orderId');
  if (!invoice) return next(new AppError('Invoice not found', 404));
  res.status(200).json({ success: true, data: invoice });
});

exports.createInvoice = asyncHandler(async (req, res, next) => {
  const settings = await require('../../models/CompanySettings').findOne();
  const prefix = settings?.invoicePrefix || 'INV-';
  const invCode = await generateCode(prefix.replace('-', ''));

  // Check previous balance for party
  let previousBalance = 0;
  if (req.body.partyId) {
    const lastEntry = await LedgerEntry.findOne({ partyId: req.body.partyId }).sort('-createdAt');
    previousBalance = lastEntry ? lastEntry.balance : 0;
  }

  const invoice = await Invoice.create({
    ...req.body,
    invoiceNumber: invCode,
    previousBalance,
    createdBy: req.user._id,
  });

  // Create ledger entry (debit)
  if (req.body.partyId) {
    const newBalance = previousBalance + invoice.total;
    await LedgerEntry.create({
      partyId: req.body.partyId,
      type: 'Invoice',
      docRef: invoice.invoiceNumber,
      debit: invoice.total,
      credit: 0,
      balance: newBalance,
      createdBy: req.user._id,
    });
    await Party.findByIdAndUpdate(req.body.partyId, { runningBalance: newBalance });
  }

  res.status(201).json({ success: true, data: invoice });
});

exports.updateInvoiceGst = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found', 404));
  invoice.gstAmount = req.body.gstAmount;
  invoice.total = invoice.subtotal + invoice.gstAmount;
  invoice.balanceDue = Math.max(0, invoice.total - invoice.advanceAmount);
  await invoice.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, data: invoice });
});

exports.convertQuotationToInvoice = asyncHandler(async (req, res, next) => {
  const { quotationId, amount, includePreviousDue } = req.body;
  const quotation = await Quotation.findById(quotationId);
  if (!quotation) return next(new AppError('Quotation not found', 404));

  const settings = await require('../../models/CompanySettings').findOne();
  const prefix = settings?.invoicePrefix || 'INV-';
  const invCode = await generateCode(prefix.replace('-', ''));

  let previousBalance = 0;
  if (includePreviousDue && quotation.leadId) {
    const lastEntry = await LedgerEntry.findOne({ partyId: req.body.partyId }).sort('-createdAt');
    previousBalance = lastEntry ? lastEntry.balance : 0;
  }

  const invoiceTotal = amount || quotation.total;
  const invoice = await Invoice.create({
    invoiceNumber: invCode,
    partyId: req.body.partyId,
    orderId: req.body.orderId,
    quotationId: quotation._id,
    invoiceType: quotation.type,
    subtotal: quotation.amount,
    gstAmount: quotation.gstAmount,
    total: invoiceTotal,
    advanceAmount: quotation.advancePaid,
    balanceDue: invoiceTotal - quotation.advancePaid,
    previousBalance,
    items: quotation.items,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: invoice });
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found', 404));

  const payRef = await generateCode('REC');
  const netAmount = (req.body.amount || 0) - (req.body.discount || 0);

  const payment = await Payment.create({
    ...req.body,
    paymentRef: payRef,
    netAmount,
    invoiceId: invoice._id,
    createdBy: req.user._id,
  });

  // Update invoice balance
  invoice.advanceAmount = (invoice.advanceAmount || 0) + netAmount;
  invoice.balanceDue = Math.max(0, invoice.total - invoice.advanceAmount);
  if (invoice.balanceDue === 0) invoice.status = 'Paid';
  else if (invoice.advanceAmount > 0) invoice.status = 'Partially Paid';
  await invoice.save({ validateBeforeSave: false });

  // Create ledger entry (credit)
  if (req.body.partyId || invoice.partyId) {
    const pId = req.body.partyId || invoice.partyId;
    const lastEntry = await LedgerEntry.findOne({ partyId: pId }).sort('-createdAt');
    const prevBal = lastEntry ? lastEntry.balance : 0;
    const newBalance = Math.max(0, prevBal - netAmount);
    await LedgerEntry.create({
      partyId: pId,
      type: 'Payment',
      docRef: payRef,
      debit: 0,
      credit: netAmount,
      balance: newBalance,
      createdBy: req.user._id,
    });
    await Party.findByIdAndUpdate(pId, { runningBalance: newBalance });
  }

  res.status(201).json({ success: true, data: { payment, invoice } });
});

// ─── QUOTATIONS in process (for Billing tab) ───────────────────────────────
exports.getQuotationsInProcess = asyncHandler(async (req, res) => {
  const quotations = await Quotation.find({
    status: { $in: ['Paid', 'Partially Paid'] },
    deletedAt: null,
  }).sort('-createdAt');
  res.status(200).json({ success: true, data: quotations });
});
