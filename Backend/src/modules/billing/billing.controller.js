const Invoice = require('../../models/Invoice');
const Payment = require('../../models/Payment');
const Party = require('../../models/Party');
const LedgerEntry = require('../../models/LedgerEntry');
const Quotation = require('../../models/Quotation');
const Order = require('../../models/Order');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notifyRoles } = require('../../utils/notify');

// ─── PARTIES ─────────────────────────────────────────────────────────────────
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
    Party.find(filter).sort('name').skip((page - 1) * limit).limit(limit),
    Party.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, total, page, data: parties });
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
  if (req.query.orderId) filter.orderId = req.query.orderId;
  if (req.query.search) {
    const re = new RegExp(req.query.search, 'i');
    filter.$or = [{ invoiceNumber: re }];
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('partyId', 'name phone gstNumber address city state panNumber')
      .populate({
        path: 'orderId',
        select: 'orderCode orderCategory isEmergency leadId products kitOrders forwardingCharge forwardingChargeAmount items total amount gstAmount paymentCollection paidAmount advancePaid advancePaidAmount billType type clientName billingName clientPhone phone gstNumber detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType',
        populate: { path: 'leadId', select: 'leadType products kitOrders forwardingCharge forwardingChargeAmount total paymentCollection paidAmount advancePaid items hotelName billingName phone gstNumber locationCity detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType' },
      })
      .populate({
        path: 'quotationId',
        select: 'quotCode leadId products kitOrders forwardingCharge forwardingChargeAmount items total amount gstAmount advancePaid type paymentCollection paidAmount kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType',
        populate: { path: 'leadId', select: 'leadType products kitOrders forwardingCharge forwardingChargeAmount total paymentCollection paidAmount advancePaid items hotelName billingName phone gstNumber locationCity detailedAddress city state pincode kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType' },
      })
      .sort('-invoiceDate').skip((page - 1) * limit).limit(limit),
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

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Invoice Created', message: `Invoice ${invoice.invoiceNumber} — ₹${invoice.total?.toLocaleString()} created`, link: '/billing' }).catch(() => {});
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
  const linkedOrder = req.body.orderId
    ? await Order.findById(req.body.orderId)
    : await Order.findOne({
        $or: [
          { quotationId: quotation._id },
          ...(quotation.leadId ? [{ leadId: quotation.leadId }] : []),
        ],
        deletedAt: null,
      }).sort('-createdAt');

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
    orderId: req.body.orderId || linkedOrder?._id,
    quotationId: quotation._id,
    invoiceType: quotation.type,
    subtotal: quotation.amount,
    gstAmount: quotation.gstAmount,
    total: invoiceTotal,
    advanceAmount: (quotation.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0) || quotation.paidAmount || quotation.advancePaid,
    balanceDue: invoiceTotal - ((quotation.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0) || quotation.paidAmount || quotation.advancePaid || 0),
    previousBalance,
    items: quotation.items,
    createdBy: req.user._id,
  });

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Invoice Converted from Quotation', message: `Invoice ${invoice.invoiceNumber} — ₹${invoice.total?.toLocaleString()} (Balance: ₹${invoice.balanceDue?.toLocaleString()})`, link: '/billing' }).catch(() => {});
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

  notifyRoles({ modules: ['Billing', 'Financial', 'Sales Team'], type: 'payment_due', title: 'Payment Received', message: `Payment of ₹${netAmount?.toLocaleString()} received — Invoice ${invoice.invoiceNumber} (Balance: ₹${invoice.balanceDue?.toLocaleString()})`, link: '/billing' }).catch(() => {});
  res.status(201).json({ success: true, data: { payment, invoice } });
});

// ─── QUOTATIONS in process (for Billing tab) ───────────────────────────────
exports.getQuotationsInProcess = asyncHandler(async (req, res) => {
  // Return all non-deleted quotations regardless of status so newly created
  // (Unpaid / In Process) quotations appear immediately in the Billing tab.
  const quotations = await Quotation.find({ deletedAt: null })
    .populate('leadId', 'hotelName contactPerson phone locationCity gstNumber leadType products kitOrders forwardingCharge forwardingChargeAmount paymentCollection paidAmount advancePaid total kitPrice kitOverallQty packagingIncludes packagingIncludesQty selectedKits selectedKit productType items')
    .sort('-createdAt');

  // Exclude quotations already converted to a billing invoice.
  const convertedIds = await Invoice.distinct('quotationId', { quotationId: { $ne: null } });
  const convertedSet = new Set(convertedIds.map(id => String(id)));
  const active = quotations.filter(q => !convertedSet.has(String(q._id)));

  res.status(200).json({ success: true, data: active });
});
