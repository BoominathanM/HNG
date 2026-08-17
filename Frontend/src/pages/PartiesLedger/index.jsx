import React, { useState, useMemo, useEffect } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Input, Select, Typography,
  Space, Tabs, DatePicker, Spin
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  SearchOutlined, EyeOutlined, LeftOutlined,
  BookOutlined, ShopOutlined, ArrowUpOutlined,
  WalletOutlined, TeamOutlined, DollarOutlined,
  PhoneOutlined, MailOutlined,
  PrinterOutlined, DownloadOutlined, DeleteOutlined, UserOutlined,
  BankOutlined, HistoryOutlined, FileExcelOutlined, FilePdfOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import dayjs from 'dayjs';
import {
  useGetPartiesQuery,
  useGetPartyLedgerQuery,
  useLazyGetPartyLedgerQuery,
  useDeletePartyMutation,
  useLazyVerifyGstinQuery,
  useGetVendorsQuery,
  useGetVendorLedgerQuery,
  useLazyGetVendorLedgerQuery,
  useDeleteVendorMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#B11E6A';
const FONT_SIZE = 13;

// Backend ledger rows (both /parties/:id/ledger and /vendors/:id/ledger) share the
// same shape — entryDate/type/docRef/debit/credit/balance — so one mapper covers
// customer and vendor ledgers alike, translating it into the Tally-style
// date/particulars/vch_type/vch_no columns the table below renders.
const mapLedgerEntry = (e) => ({
  rawDate: e.entryDate,
  date: e.entryDate ? dayjs(e.entryDate).format('DD/MM/YYYY') : '',
  particulars: e.type === 'Order' ? `Order ${e.docRef || ''}`.trim() : e.type === 'Bill' ? `Bill ${e.docRef || ''}`.trim() : (e.docRef || e.type),
  vch_type: e.type,
  vch_no: e.docRef || '—',
  debit: e.debit || 0,
  credit: e.credit || 0,
  balance: e.balance || 0,
});

// Turns a granularity ('date'/'month'/'year') + RangePicker value into concrete
// [start, end] dayjs bounds for filtering — 'date' snaps to day boundaries, 'month'/'year'
// widen to the full month/year regardless of which day-of-month the picker returned.
const dateFilterBounds = (range, granularity) => {
  if (!range || !range[0] || !range[1]) return null;
  const unit = granularity === 'date' ? 'day' : granularity;
  return [range[0].startOf(unit), range[1].endOf(unit)];
};

const withinDateBounds = (value, bounds) => {
  if (!bounds) return true;
  if (!value) return false;
  const d = dayjs(value);
  return !d.isBefore(bounds[0]) && !d.isAfter(bounds[1]);
};

// Compact Date/Month/Year granularity toggle + RangePicker, reused across the three list
// tabs and the party detail view so all four filters look and behave identically.
const DateGranularityFilter = ({ granularity, onGranularityChange, range, onRangeChange, width = 230 }) => (
  <Space.Compact>
    <Select
      value={granularity}
      onChange={(g) => { onGranularityChange(g); onRangeChange(null); }}
      style={{ width: 88 }}
    >
      <Option value="date">Date</Option>
      <Option value="month">Month</Option>
      <Option value="year">Year</Option>
    </Select>
    <DatePicker.RangePicker
      picker={granularity === 'date' ? undefined : granularity}
      value={range}
      onChange={onRangeChange}
      style={{ width }}
      allowClear
    />
  </Space.Compact>
);

const partiesListTitle = (type) => (type === 'Supplier' ? 'Vendors Ledger' : type === 'Customer' ? 'Customers Ledger' : 'All Parties');

// Runs `fn` over `items` with at most `limit` in flight at once — bulk exports trigger one
// ledger fetch per party, and an unbounded Promise.all would fire hundreds of requests at
// once for a large party list.
const mapWithConcurrency = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
};

// A party/vendor row only carries lifetime totals (see mapParty/mapVendor) — there's no
// per-transaction date on it. So a Date/Month/Year filter on the list tabs can't just check
// a field on the row; it has to fetch each party's real ledger and see which entries fall in
// the selected window. This hook does that fetch whenever `bounds` changes, keyed off
// millisecond timestamps (not the `bounds` array itself, which is a new reference every
// render) so it doesn't refire on every unrelated re-render. `fetchHistory` is intentionally
// left out of the dependency array — it closes over stable RTK Query trigger functions, so
// only bounds/baseList identity should ever restart the fetch.
const usePeriodParties = (baseList, bounds, fetchHistory) => {
  const [state, setState] = useState({ loading: false, rows: null });
  const startMs = bounds ? bounds[0].valueOf() : null;
  const endMs = bounds ? bounds[1].valueOf() : null;

  useEffect(() => {
    // No bounds: nothing to fetch. Callers (buildPeriodRows/tableLoading) already check
    // `bounds` before reading `state`, so stale rows/loading from a previous selection are
    // simply never looked at — no need to reset them here.
    if (startMs == null || endMs == null) return;
    let cancelled = false;
    setState({ loading: true, rows: null });
    (async () => {
      const enriched = await mapWithConcurrency(baseList, 6, (r) => fetchHistory(r, [dayjs(startMs), dayjs(endMs)]));
      if (!cancelled) setState({ loading: false, rows: enriched });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs, endMs, baseList]);

  return state;
};

// CSV export (Excel opens .csv natively) — same approach used by the Reports page.
// `rows` is an array of row-arrays; each cell is quoted/escaped, blank rows (`[]`) render
// as empty lines, used below to separate one party's block from the next.
const exportToExcel = (rows, filename) => {
  const bom = '﻿';
  const csv = rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// `partiesWithHistory` = list rows, each carrying an `entries` array (that party's full
// mapped ledger, already date-filtered to match whatever's on screen). Every party gets its
// own summary line followed by its own transaction table, one continuous sheet.
const downloadPartiesListExcel = (partiesWithHistory, type) => {
  const totalLabel = type === 'Supplier' ? 'Total Purchases' : type === 'Customer' ? 'Total Sales' : 'Total';
  const paidLabel = type === 'Supplier' ? 'Paid' : type === 'Customer' ? 'Received' : 'Paid / Received';
  const rows = [];
  partiesWithHistory.forEach((r) => {
    rows.push(['Party Name', 'Type', 'Phone', 'Address', totalLabel, paidLabel, 'Pending']);
    rows.push([r.name, r.type, r.phone || '', r.address || '', r.totalPurchase || r.totalSales || 0, r.paid || r.received || 0, r.pending || 0]);
    rows.push([]);
    if (r.entries?.length) {
      rows.push(['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance']);
      r.entries.forEach(e => rows.push([e.date, e.particulars, e.vch_type, e.vch_no, e.debit || 0, e.credit || 0, e.balance || 0]));
    } else {
      rows.push(['No transactions' + (r.entries ? ' in selected period' : '')]);
    }
    rows.push([]);
    rows.push([]);
  });
  exportToExcel(rows, `${partiesListTitle(type).replace(/\s+/g, '_')}_Full_History.csv`);
};

// Same data as downloadPartiesListExcel, rendered as a printable HTML document (opened in a
// new tab, auto-triggers window.print()) — one section per party: header block + summary +
// full ledger table, mirroring the single-party ledger PDF's layout.
const downloadPartiesListPdf = (partiesWithHistory, type) => {
  const title = partiesListTitle(type);
  const totalLabel = type === 'Supplier' ? 'Total Purchases' : type === 'Customer' ? 'Total Sales' : 'Total';
  const paidLabel = type === 'Supplier' ? 'Paid' : type === 'Customer' ? 'Received' : 'Paid / Received';
  const fmt = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const partySections = partiesWithHistory.map((r, i) => {
    const entries = r.entries || [];
    const entryRows = entries.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.particulars}</td>
        <td>${e.vch_type}</td>
        <td>${e.vch_no}</td>
        <td class="num">${e.debit > 0 ? fmt(e.debit) : ''}</td>
        <td class="num">${e.credit > 0 ? fmt(e.credit) : ''}</td>
        <td class="num">${fmt(Math.abs(e.balance))}${e.balance < 0 ? ' Cr' : ' Dr'}</td>
      </tr>`).join('');
    const entryTotalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const entryTotalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);

    return `
<div class="party-section"${i > 0 ? ' style="page-break-before: always;"' : ''}>
  <div class="party-block">
    <div class="pname">${r.name}</div>
    <div class="pdetail">${r.type}${r.phone ? ' · PH: ' + r.phone : ''}${r.address ? ' · ' + r.address : ''}</div>
  </div>
  <table class="summary-table">
    <thead><tr><th class="num">${totalLabel}</th><th class="num">${paidLabel}</th><th class="num">Pending</th></tr></thead>
    <tbody><tr>
      <td class="num">${fmt(r.totalPurchase || r.totalSales)}</td>
      <td class="num">${fmt(r.paid || r.received)}</td>
      <td class="num">${fmt(r.pending)}</td>
    </tr></tbody>
  </table>
  ${entries.length ? `
  <table>
    <thead>
      <tr>
        <th style="width:90px">Date</th>
        <th>Particulars</th>
        <th style="width:80px">Vch Type</th>
        <th style="width:70px">Vch No.</th>
        <th style="width:100px" class="num">Debit</th>
        <th style="width:100px" class="num">Credit</th>
        <th style="width:110px" class="num">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${entryRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right">Total</td>
        <td class="num">${fmt(entryTotalDebit)}</td>
        <td class="num">${fmt(entryTotalCredit)}</td>
        <td class="num"></td>
      </tr>
    </tbody>
  </table>` : '<div class="no-entries">No transactions in selected period.</div>'}
</div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${title} — Full History</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header .company { font-size: 15px; font-weight: bold; }
  .header .address { font-size: 10px; line-height: 1.6; }
  .divider { border-top: 1px solid #000; margin: 6px 0; }
  .title { text-align: center; font-size: 13px; font-weight: bold; margin: 12px 0; }
  .party-section { margin-top: 18px; }
  .party-block { text-align: center; margin: 10px 0; }
  .party-block .pname { font-size: 13px; font-weight: bold; color: #B11E6A; }
  .party-block .pdetail { font-size: 10px; line-height: 1.6; color: #444; }
  .summary-table { margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { border: 1px solid #000; padding: 5px 8px; background: #f5f5f5; font-size: 11px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10.5px; }
  .num { text-align: right; }
  .total-row td { border-top: 2px solid #000; font-weight: bold; background: #fafafa; }
  .no-entries { text-align: center; font-size: 11px; color: #888; padding: 10px 0; }
  @media print {
    body { padding: 12px; }
    @page { margin: 1cm; size: A4 landscape; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="company">HEAL N GLOW PRIVATE LIMITED</div>
  <div class="address">
    THADICOMBU ROAD, DINDIGUL - 624 001, TAMIL NADU<br/>
    PH NO : 82480 93571
  </div>
</div>
<div class="divider"></div>
<div class="title">${title} — Full Transaction History</div>
${partySections}
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export default function PartiesLedger() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin';
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [activeTab, setActiveTab] = useState('all');
  const { filterTabs, activeKeyFor } = useTabAccess('Ledgers');
  const { requireAccess } = usePageAccess('Ledgers');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [allSearch, setAllSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewParty, setViewParty] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [dateGranularity, setDateGranularity] = useState('date');
  const [bulkExportLoading, setBulkExportLoading] = useState(false);

  // Date/Month/Year filters for the three list tabs (filter on party createdAt, and drive
  // the Download Excel/PDF exports so exports match whatever's currently on screen).
  const [allDateRange, setAllDateRange] = useState(null);
  const [allDateGranularity, setAllDateGranularity] = useState('date');
  const [supplierDateRange, setSupplierDateRange] = useState(null);
  const [supplierDateGranularity, setSupplierDateGranularity] = useState('date');
  const [customerDateRange, setCustomerDateRange] = useState(null);
  const [customerDateGranularity, setCustomerDateGranularity] = useState('date');

  // GST verification state for party detail view
  const [gstPartyData, setGstPartyData] = useState(null);
  const [gstPartyLoading, setGstPartyLoading] = useState(false);
  const [gstPartyError, setGstPartyError] = useState(null);
  const [verifyGstinTrigger] = useLazyVerifyGstinQuery();

  // RTK Query — load customer parties + vendors (two separate collections — see mapVendor)
  const { data: partiesData, isLoading: partiesLoading } = useGetPartiesQuery({ type: 'Customer', limit: 500 });
  const { data: vendorsData, isLoading: vendorsLoading } = useGetVendorsQuery({ limit: 500 });
  const [deletePartyMutation] = useDeletePartyMutation();
  const [deleteVendorMutation] = useDeleteVendorMutation();
  // Lazy triggers used only by the bulk Excel/PDF exports below — they fetch each listed
  // party's full ledger on demand (list rows only carry lifetime totals, not entries).
  const [triggerPartyLedger] = useLazyGetPartyLedgerQuery();
  const [triggerVendorLedger] = useLazyGetVendorLedgerQuery();

  const mapParty = (p) => ({
    key: p._id,
    source: 'Party',
    createdAt: p.createdAt,
    name: p.name,
    type: p.type,
    phone: p.phone,
    email: p.email || '',
    address: [p.street, p.city, p.state, p.pincode].filter(Boolean).join(', '),
    gst: p.gstNumber,
    gstVerifiedData: p.gstVerifiedData || null,
    pan: p.panNumber,
    contactPerson: p.contactPerson,
    creditPeriod: p.creditPeriod,
    creditLimit: p.creditLimit,
    openingBalance: p.openingBalance || 0,
    openingBalDir: p.openingBalDir,
    totalPurchase: p.totalPurchases || p.totalSales || 0,
    totalSales: p.totalSales || 0,
    paid: p.paid || p.received || 0,
    received: p.received || p.paid || 0,
    pending: p.pending || 0,
    balance: p.runningBalance || 0,
  });

  // Vendors live in a separate collection from Party — purchase/payment history is
  // sourced from PurchaseOrder/LocalPurchase (see getVendorLedger), not LedgerEntry.
  const mapVendor = (v) => ({
    key: v._id,
    source: 'Vendor',
    createdAt: v.createdAt,
    name: v.name,
    type: 'Supplier',
    phone: v.phone,
    email: v.email || '',
    address: v.address || '',
    taxId: v.taxId,
    bankDetails: v.bankDetails,
    status: v.status,
    vendorType: v.vendorType,
    supplierType: v.supplierType,
    vendorCode: v.vendorCode,
    totalPurchase: v.totalBilled || 0,
    totalSales: 0,
    paid: v.totalPaid || 0,
    received: v.totalPaid || 0,
    pending: v.pending || 0,
    balance: v.pending || 0,
  });

  const customerList = useMemo(() => (partiesData?.data || []).map(mapParty), [partiesData]);
  const supplierList = useMemo(() => (vendorsData?.data || []).map(mapVendor), [vendorsData]);

  // Fetches one party/vendor's full ledger on demand — list rows only carry lifetime
  // totals (see mapParty/mapVendor above), not per-transaction dates, so both the list-tab
  // Date/Month/Year filters and the bulk Excel/PDF exports need this to see real activity.
  // `bounds`, if given, narrows the returned entries to that window.
  const fetchPartyHistory = async (party, bounds) => {
    try {
      let entries;
      if (party.source === 'Vendor') {
        const res = await triggerVendorLedger(party.key).unwrap();
        entries = (res.ledger || []).map(mapLedgerEntry);
      } else {
        const res = await triggerPartyLedger(party.key).unwrap();
        entries = (res.data || []).map(mapLedgerEntry);
      }
      if (bounds) entries = entries.filter(e => withinDateBounds(e.rawDate, bounds));
      return { ...party, entries };
    } catch {
      return { ...party, entries: [] };
    }
  };

  const isVendorView = viewParty?.source === 'Vendor';

  // RTK Query — load ledger for selected customer party (LedgerEntry + unbilled orders)
  const { data: ledgerData, isLoading: partyLedgerLoading } = useGetPartyLedgerQuery(
    viewParty?.key,
    { skip: !viewParty || isVendorView }
  );
  // RTK Query — load ledger for selected vendor (PurchaseOrder + LocalPurchase merged)
  const { data: vendorLedgerData, isLoading: vendorLedgerLoading } = useGetVendorLedgerQuery(
    viewParty?.key,
    { skip: !viewParty || !isVendorView }
  );
  const partyLedgerData = useMemo(() => {
    const raw = isVendorView ? (vendorLedgerData?.ledger || []) : (ledgerData?.data || []);
    return raw.map(mapLedgerEntry);
  }, [isVendorView, vendorLedgerData, ledgerData]);

  const deleteParty = async (party) => {
    try {
      if (party.source === 'Vendor') await deleteVendorMutation(party.key).unwrap();
      else await deletePartyMutation(party.key).unwrap();
      enqueueSnackbar(`${party.name} deleted`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to delete party', { variant: 'error' });
    }
  };

  const openParty = (party) => {
    setViewParty(party);
  };

  const fetchPartyGstDetails = async (gstin) => {
    if (!gstin) return;
    setGstPartyLoading(true);
    setGstPartyData(null);
    setGstPartyError(null);
    try {
      const result = await verifyGstinTrigger(gstin.trim().toUpperCase(), false).unwrap();
      setGstPartyData(result.data || result);
    } catch (err) {
      const msg = err?.data || err?.error || 'Unable to fetch GST details. Please verify GSTIN manually.';
      setGstPartyError(typeof msg === 'string' ? msg : 'Unable to fetch GST details.');
    } finally {
      setGstPartyLoading(false);
    }
  };

  useEffect(() => {
    if (!viewParty) {
      setGstPartyData(null);
      setGstPartyError(null);
      return;
    }
    if (viewParty.gstVerifiedData) {
      setGstPartyData(viewParty.gstVerifiedData);
      setGstPartyLoading(false);
      setGstPartyError(null);
    } else if (viewParty.gst) {
      fetchPartyGstDetails(viewParty.gst);
    }
  }, [viewParty?.key, viewParty?.gst]);

  const allParties = useMemo(() => [...supplierList, ...customerList], [supplierList, customerList]);

  // Date/Month/Year bounds for each of the three list tabs, and the real-ledger fetch that
  // backs them — a party row only has lifetime totals, so "filter by period" means fetching
  // each party's actual transactions and checking which ones fall in the window.
  const allDateBounds = dateFilterBounds(allDateRange, allDateGranularity);
  const supplierDateBounds = dateFilterBounds(supplierDateRange, supplierDateGranularity);
  const customerDateBounds = dateFilterBounds(customerDateRange, customerDateGranularity);

  const allPeriod = usePeriodParties(allParties, allDateBounds, fetchPartyHistory);
  const supplierPeriod = usePeriodParties(supplierList, supplierDateBounds, fetchPartyHistory);
  const customerPeriod = usePeriodParties(customerList, customerDateBounds, fetchPartyHistory);

  // With no date filter active, show the normal lifetime-totals rows (instant, no fetch).
  // With one active: once `period.rows` has loaded, keep only parties with at least one
  // transaction in the window, and swap Total/Paid to that window's actual debit/credit sums
  // — Pending is left as the live figure since "what's still owed" is inherently a
  // right-now number, not something a past date range should change.
  const buildPeriodRows = (baseList, bounds, period) => {
    if (!bounds) return baseList;
    if (period.loading || !period.rows) return [];
    return period.rows
      .filter(r => (r.entries || []).length > 0)
      .map(r => {
        const periodDebit = r.entries.reduce((s, e) => s + (e.debit || 0), 0);
        const periodCredit = r.entries.reduce((s, e) => s + (e.credit || 0), 0);
        return { ...r, totalPurchase: periodDebit, totalSales: periodDebit, paid: periodCredit, received: periodCredit };
      });
  };

  const filteredAllParties = buildPeriodRows(allParties, allDateBounds, allPeriod).filter(p =>
    (typeFilter === 'all' || p.type === typeFilter) &&
    (!allSearch || p.name.toLowerCase().includes(allSearch.toLowerCase()))
  );

  const totalSupplierPending = supplierList.reduce((s, p) => s + p.pending, 0);
  const totalCustomerPending = customerList.reduce((s, p) => s + p.pending, 0);
  const totalSupplierPaid = supplierList.reduce((s, p) => s + p.paid, 0);
  const totalCustomerReceived = customerList.reduce((s, p) => s + p.received, 0);

  const getLedger = () => {
    const bounds = dateFilterBounds(dateRange, dateGranularity);
    if (!bounds) return partyLedgerData;
    return partyLedgerData.filter(e => withinDateBounds(e.rawDate, bounds));
  };

  const downloadLedgerExcel = (party, entries) => {
    const rows = [
      ['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'],
      ...entries.map(e => [e.date, e.particulars, e.vch_type, e.vch_no, e.debit || 0, e.credit || 0, e.balance || 0]),
    ];
    exportToExcel(rows, `Ledger_${(party.name || 'party').replace(/\s+/g, '_')}.csv`);
  };

  const handleListExcelExport = async (rows, type, bounds) => {
    if (!rows.length) { enqueueSnackbar('No parties to export', { variant: 'info' }); return; }
    // Rows from a period-filtered table already carry their fetched `entries` — reuse them
    // instead of re-fetching the same ledgers a second time for the export.
    if (rows.every(r => Array.isArray(r.entries))) {
      downloadPartiesListExcel(rows, type);
      return;
    }
    setBulkExportLoading(true);
    try {
      const withHistory = await mapWithConcurrency(rows, 6, (r) => fetchPartyHistory(r, bounds));
      downloadPartiesListExcel(withHistory, type);
    } catch {
      enqueueSnackbar('Failed to export — could not load transaction history for one or more parties', { variant: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  };

  const handleListPdfExport = async (rows, type, bounds) => {
    if (!rows.length) { enqueueSnackbar('No parties to export', { variant: 'info' }); return; }
    if (rows.every(r => Array.isArray(r.entries))) {
      downloadPartiesListPdf(rows, type);
      return;
    }
    setBulkExportLoading(true);
    try {
      const withHistory = await mapWithConcurrency(rows, 6, (r) => fetchPartyHistory(r, bounds));
      downloadPartiesListPdf(withHistory, type);
    } catch {
      enqueueSnackbar('Failed to export — could not load transaction history for one or more parties', { variant: 'error' });
    } finally {
      setBulkExportLoading(false);
    }
  };

  const downloadLedger = (party, entries) => {
    const totalDebit = entries.reduce((s, r) => s + r.debit, 0);
    const totalCredit = entries.reduce((s, r) => s + r.credit, 0);
    const closingBalance = entries.at(-1)?.balance ?? 0;
    const dateFrom = entries[0]?.date || '';
    const dateTo = entries.at(-1)?.date || '';

    const rows = entries.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.particulars}</td>
        <td>${e.vch_type}</td>
        <td>${e.vch_no}</td>
        <td class="num">${e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
        <td class="num">${e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Ledger - ${party.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header .company { font-size: 15px; font-weight: bold; }
  .header .address { font-size: 10px; line-height: 1.6; }
  .divider { border-top: 1px solid #000; margin: 6px 0; }
  .party-block { text-align: center; margin: 12px 0; }
  .party-block .pname { font-size: 13px; font-weight: bold; }
  .party-block .pdetail { font-size: 10px; line-height: 1.6; }
  .date-range { text-align: center; font-size: 11px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #000; padding: 5px 8px; background: #f5f5f5; font-size: 11px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10.5px; }
  .num { text-align: right; }
  .total-row td { border-top: 2px solid #000; font-weight: bold; background: #fafafa; }
  .closing-row td { font-weight: bold; }
  .balance-row td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; }
  .page-title { text-align: right; font-size: 10px; margin-bottom: 4px; }
  @media print {
    body { padding: 12px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="company">HEAL N GLOW PRIVATE LIMITED</div>
  <div class="address">
    THADICOMBU ROAD, DINDIGUL - 624 001, TAMIL NADU<br/>
    PH NO : 82480 93571
  </div>
</div>
<div class="divider"></div>
<div class="party-block">
  <div class="pname">${party.name}</div>
  <div class="pdetail">Ledger Account</div>
  ${party.address ? `<div class="pdetail">${party.address}</div>` : ''}
  ${party.phone ? `<div class="pdetail">PH: ${party.phone}</div>` : ''}
  ${party.email ? `<div class="pdetail">Email: ${party.email}</div>` : ''}
  ${party.gst ? `<div class="pdetail">GST/Lic No: ${party.gst}</div>` : ''}
</div>
<div class="date-range">${dateFrom} to ${dateTo}</div>
<div class="page-title">Page 1</div>
<table>
  <thead>
    <tr>
      <th style="width:90px">Date</th>
      <th>Particulars</th>
      <th style="width:80px">Vch Type</th>
      <th style="width:70px">Vch No.</th>
      <th style="width:110px" class="num">Debit</th>
      <th style="width:110px" class="num">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Total</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="closing-row">
      <td colspan="4" style="text-align:right">By Closing Balance</td>
      <td class="num"></td>
      <td class="num">${Math.abs(closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="balance-row">
      <td colspan="4" style="text-align:right"></td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const renderPartyView = () => {
    if (!viewParty) return null;
    const ledger = getLedger();
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const netBalance = ledger.at(-1)?.balance ?? 0;
    const isSupplier = viewParty.type === 'Supplier';

    const ledgerColumns = [
      {
        title: 'Date', dataIndex: 'date', width: 100,
        render: v => <Text style={{ fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Particulars', dataIndex: 'particulars', width: 200,
        render: v => <Text style={{ fontSize: FONT_SIZE, color: textColor }}>{v}</Text>
      },
      {
        title: 'Vch Type', dataIndex: 'vch_type', width: 90,
        render: t => (
          <Tag
            style={{ borderRadius: 6, fontSize: FONT_SIZE - 1, border: `1px solid ${PRIMARY}22`, background: `${PRIMARY}10`, color: PRIMARY }}
          >
            {t}
          </Tag>
        )
      },
      {
        title: 'Vch No.', dataIndex: 'vch_no', width: 90,
        render: v => <Text style={{ color: PRIMARY, fontWeight: 600, fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Debit (Dr)', dataIndex: 'debit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Credit (Cr)', dataIndex: 'credit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Balance', dataIndex: 'balance', align: 'right', width: 120,
        render: v => (
          <Text strong style={{ color: v < 0 ? '#52c41a' : PRIMARY, fontSize: FONT_SIZE }}>
            ₹{Math.abs(v).toLocaleString()}{v < 0 ? ' Cr' : ' Dr'}
          </Text>
        )
      },
    ];

    return (
      <div>
        {/* Back + Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Button icon={<LeftOutlined />} onClick={() => { setViewParty(null); setDateRange(null); setDateGranularity('date'); }}>
            Back to Parties
          </Button>
          <Space wrap>
            <DateGranularityFilter
              granularity={dateGranularity}
              onGranularityChange={setDateGranularity}
              range={dateRange}
              onRangeChange={setDateRange}
              width={260}
            />
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => downloadLedgerExcel(viewParty, ledger)}
              style={{ borderColor: '#52c41a', color: '#52c41a', fontWeight: 600 }}
            >
              Download Excel
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadLedger(viewParty, ledger)}
              style={{ background: PRIMARY, border: 'none', color: '#fff', fontWeight: 600 }}
            >
              Download PDF
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ borderColor: PRIMARY, color: PRIMARY }}>
              Print
            </Button>
          </Space>
        </div>

        {/* Hero Banner */}
        <div style={{
          background: isDark ? '#1E1E2E' : '#fff',
          borderRadius: 16,
          border: `2px solid ${PRIMARY}22`,
          padding: '20px 24px',
          marginBottom: 16,
          boxShadow: '0 4px 20px rgba(177,30,106,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text strong style={{ fontSize: 22, color: PRIMARY, display: 'block', lineHeight: 1.2 }}>{viewParty.name}</Text>
              <Space size={8} style={{ marginTop: 8 }} wrap>
                <Tag style={{ borderRadius: 10, background: isSupplier ? 'rgba(24,144,255,0.1)' : 'rgba(114,46,209,0.1)', color: isSupplier ? '#1890ff' : '#722ed1', border: `1px solid ${isSupplier ? '#1890ff44' : '#722ed144'}`, fontWeight: 600 }}>
                  {viewParty.type}
                </Tag>
                {viewParty.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: textColor }}>
                    <PhoneOutlined style={{ color: PRIMARY }} />{viewParty.phone}
                  </span>
                )}
                {viewParty.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: textColor }}>
                    <MailOutlined style={{ color: PRIMARY }} /><a href={`mailto:${viewParty.email}`} style={{ color: PRIMARY }}>{viewParty.email}</a>
                  </span>
                )}
                {viewParty.contactPerson && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: textColor }}>
                    <UserOutlined style={{ color: '#888' }} />{viewParty.contactPerson}
                  </span>
                )}
              </Space>
            </div>
            <Space direction="vertical" size={4} style={{ textAlign: 'right' }}>
              <Tag style={{ borderRadius: 12, fontSize: 13, padding: '2px 12px', background: netBalance > 0 ? 'rgba(255,77,79,0.1)' : 'rgba(82,196,26,0.1)', color: netBalance > 0 ? '#ff4d4f' : '#52c41a', border: `1px solid ${netBalance > 0 ? '#ff4d4f44' : '#52c41a44'}`, fontWeight: 700 }}>
                ₹{Math.abs(netBalance).toLocaleString()} {netBalance < 0 ? 'Cr (Advance)' : 'Dr (Balance)'}
              </Tag>
              {(viewParty.creditLimit > 0) && (
                <Tag style={{ borderRadius: 12, fontSize: 12, padding: '2px 10px', background: 'rgba(250,140,22,0.1)', color: '#fa8c16', border: '1px solid rgba(250,140,22,0.3)' }}>
                  Credit Limit: ₹{Number(viewParty.creditLimit).toLocaleString()}
                </Tag>
              )}
              {(viewParty.creditPeriod) && (
                <Tag style={{ borderRadius: 12, fontSize: 12, padding: '2px 10px', background: 'rgba(250,140,22,0.08)', color: '#fa8c16', border: '1px solid rgba(250,140,22,0.2)' }}>
                  Credit Period: {viewParty.creditPeriod} days
                </Tag>
              )}
            </Space>
          </div>
        </div>

        {/* GST API Details Card */}
        {viewParty.gst && (
          <Card
            style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
            title={
              <Space>
                <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                <BankOutlined style={{ color: '#722ed1' }} />
                <span style={{ fontSize: FONT_SIZE }}>GST API Details</span>
                {!gstPartyLoading && (
                  <Button size="small" type="text" icon={<HistoryOutlined />} style={{ color: '#722ed1' }} onClick={() => fetchPartyGstDetails(viewParty.gst)}>Refresh</Button>
                )}
              </Space>
            }
          >
            {gstPartyLoading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Fetching GST details…</Text>
              </div>
            )}
            {gstPartyError && !gstPartyLoading && (
              <div style={{ padding: '10px 12px', background: 'rgba(255,77,79,0.06)', borderRadius: 8, border: '1px solid rgba(255,77,79,0.2)' }}>
                <Text style={{ color: '#ff4d4f', fontSize: 12 }}>{gstPartyError}</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>GSTIN on file: </Text>
                  <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{viewParty.gst}</Text>
                </div>
              </div>
            )}
            {gstPartyData && !gstPartyLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'GSTIN', value: gstPartyData.gstin || viewParty.gst, mono: true },
                  { label: 'Legal Name', value: gstPartyData.lgnm },
                  { label: 'Trade Name', value: gstPartyData.tradeNam },
                  { label: 'Status', value: gstPartyData.sts, tag: true, color: gstPartyData.sts === 'Active' ? 'success' : 'error' },
                  { label: 'Taxpayer Type', value: gstPartyData.ctb || gstPartyData.dty },
                  { label: 'Registration Date', value: gstPartyData.rgdt },
                  { label: 'State', value: gstPartyData.stj },
                  { label: 'e-Invoice', value: gstPartyData.einvoiceStatus },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{f.label}</Text>
                    {f.tag ? (
                      <Tag color={f.color} style={{ borderRadius: 12, margin: 0, fontSize: 11 }}>{f.value}</Tag>
                    ) : (
                      <Text strong style={{ fontSize: 12, fontFamily: f.mono ? 'monospace' : undefined, color: f.mono ? '#722ed1' : undefined }}>{f.value}</Text>
                    )}
                  </div>
                ))}
                {gstPartyData.address && typeof gstPartyData.address === 'object' && (
                  <div style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Registered Address</Text>
                    <Text style={{ fontSize: 12, lineHeight: 1.6, color: textColor }}>
                      {[
                        gstPartyData.address.bnm  || gstPartyData.address.building,
                        gstPartyData.address.bno  || gstPartyData.address.door,
                        gstPartyData.address.flno || gstPartyData.address.floor,
                        gstPartyData.address.st   || gstPartyData.address.street,
                        gstPartyData.address.loc  || gstPartyData.address.location,
                        gstPartyData.address.dst  || gstPartyData.address.district,
                        gstPartyData.address.stcd || gstPartyData.address.state,
                        gstPartyData.address.pncd || gstPartyData.address.pincode,
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </div>
                )}
              </div>
            )}
            {!gstPartyData && !gstPartyLoading && !gstPartyError && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>GST details load automatically.<br />Click Refresh to reload.</Text>
              </div>
            )}
          </Card>
        )}

        {/* Summary Stats */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { label: isSupplier ? 'Total Purchases (Dr)' : 'Total Invoiced (Dr)', val: `₹${totalDebit.toLocaleString()}`, color: '#ff4d4f', icon: <ArrowUpOutlined /> },
            { label: isSupplier ? 'Total Paid (Cr)' : 'Total Received (Cr)', val: `₹${totalCredit.toLocaleString()}`, color: '#52c41a', icon: <WalletOutlined /> },
            { label: 'Net Balance', val: `₹${Math.abs(netBalance).toLocaleString()}${netBalance < 0 ? ' (Adv)' : ''}`, color: PRIMARY, icon: <DollarOutlined /> },
          ].map(s => (
            <Col xs={8} key={s.label}>
              <Card style={{ borderRadius: 12, border: 'none', background: `${s.color}10`, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: s.color, fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#888', display: 'block', lineHeight: 1.3 }}>{s.label}</Text>
                    <Text strong style={{ color: s.color, fontSize: 16 }}>{s.val}</Text>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Table
          size="small"
          dataSource={ledger}
          pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
          locale={{ emptyText: 'No transactions in selected date range.' }}
          scroll={{ x: 'max-content' }}
          columns={ledgerColumns}
          summary={(pageData) => {
            const pgDebit = pageData.reduce((s, r) => s + r.debit, 0);
            const pgCredit = pageData.reduce((s, r) => s + r.credit, 0);
            return (
              <Table.Summary.Row style={{ background: isDark ? '#1a1a2e' : '#fafafa', fontWeight: 700 }}>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong style={{ fontSize: FONT_SIZE }}>Page Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text style={{ color: '#ff4d4f', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgDebit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text style={{ color: '#52c41a', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgCredit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>
                    ₹{Math.abs(ledger.at(-1)?.balance ?? 0).toLocaleString()} Dr
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </div>
    );
  };

  const partiesTableColumns = (type) => [
    {
      title: type === 'Supplier' ? 'Supplier Name' : type === 'Customer' ? 'Customer Name' : 'Party Name',
      dataIndex: 'name',
      render: v => <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>{v}</Text>
    },
    {
      title: 'Type', dataIndex: 'type', width: 100,
      render: v => (
        <Tag style={{ borderRadius: 10, border: `1px solid ${PRIMARY}33`, background: `${PRIMARY}10`, color: PRIMARY, fontSize: FONT_SIZE - 1 }}>
          {v}
        </Tag>
      )
    },
    {
      title: 'Phone', dataIndex: 'phone', width: 160,
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: 'Address', dataIndex: 'address',
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: type === 'Supplier' ? 'Total Purchases' : type === 'Customer' ? 'Total Sales' : 'Total',
      key: 'total', align: 'right', width: 140,
      render: (_, r) => <Text strong style={{ fontSize: FONT_SIZE }}>₹{(r.totalPurchase || r.totalSales || 0).toLocaleString()}</Text>
    },
    {
      title: type === 'Supplier' ? 'Paid' : type === 'Customer' ? 'Received' : 'Paid / Received',
      key: 'paid', align: 'right', width: 130,
      render: (_, r) => <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{(r.paid || r.received || 0).toLocaleString()}</Text>
    },
    {
      title: 'Pending', dataIndex: 'pending', align: 'right', width: 120,
      render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
    },
    {
      title: 'Paid %', key: 'balance_bar', width: 110,
      render: (_, r) => {
        const total = r.totalPurchase || r.totalSales || 1;
        const paidVal = r.paid || r.received || 0;
        const pct = Math.min(100, Math.round((paidVal / total) * 100));
        return (
          <div>
            <div style={{ background: borderColor, borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#52c41a' : PRIMARY, borderRadius: 4 }} />
            </div>
            <Text style={{ fontSize: 11, color: '#888' }}>{pct}% paid</Text>
          </div>
        );
      }
    },
    {
      title: 'Action', key: 'action', fixed: 'right', width: isSuperAdmin ? 160 : 100,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={e => { e.stopPropagation(); openParty(r); }} style={{ color: PRIMARY, padding: '0 4px', fontSize: FONT_SIZE }}>
            Ledger
          </Button>
          {isSuperAdmin && (
            <Button
              size="small"
              type="link"
              icon={<DeleteOutlined />}
              onClick={e => { e.stopPropagation(); deleteParty(r); }}
              style={{ color: '#ff4d4f', padding: '0 4px', fontSize: FONT_SIZE }}
            >
              Delete
            </Button>
          )}
        </Space>
      )
    }
  ];

  const renderPartiesTable = (parties, search, setSearch, type, dateGranularityVal, setDateGranularityVal, dateRangeVal, setDateRangeVal, bounds, period) => {
    const filtered = buildPeriodRows(parties, bounds, period).filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    );
    const tableLoading = !!bounds && (period.loading || !period.rows);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: FONT_SIZE }}>
            {bounds
              ? `Showing ${type === 'Supplier' ? 'suppliers' : 'customers'} with activity in the selected period — Total/Paid reflect that period, Pending is current`
              : `${type === 'Supplier' ? 'Purchase ledger per supplier' : 'Sales & invoice ledger per customer'} — click a row to view full transaction history`}
          </Text>
          <Space wrap>
            <Input
              prefix={<SearchOutlined />}
              placeholder={`Search ${type.toLowerCase()}s...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220, borderRadius: 8 }}
              allowClear
            />
            <DateGranularityFilter
              granularity={dateGranularityVal}
              onGranularityChange={setDateGranularityVal}
              range={dateRangeVal}
              onRangeChange={setDateRangeVal}
            />
            <Button icon={<FileExcelOutlined />} loading={bulkExportLoading} disabled={bulkExportLoading} onClick={() => handleListExcelExport(filtered, type, bounds)} style={{ borderColor: '#52c41a', color: '#52c41a' }}>
              Excel
            </Button>
            <Button icon={<FilePdfOutlined />} loading={bulkExportLoading} disabled={bulkExportLoading} onClick={() => handleListPdfExport(filtered, type, bounds)} style={{ background: PRIMARY, border: 'none', color: '#fff' }}>
              PDF
            </Button>
          </Space>
        </div>
        <Table
          size="small"
          loading={tableLoading}
          dataSource={filtered}
          rowKey="key"
          pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
          locale={{ emptyText: bounds ? 'No transactions in the selected period.' : 'No data' }}
          scroll={{ x: 'max-content' }}
          onRow={r => ({ onClick: () => openParty(r), style: { cursor: 'pointer' } })}
          columns={partiesTableColumns(type)}
        />
      </div>
    );
  };

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Ledgers" items={[{ label: 'Ledgers' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Supplier Pending', value: `₹${totalSupplierPending.toLocaleString()}`, icon: <ShopOutlined />, sub: `${supplierList.filter(p => p.pending > 0).length} suppliers with dues` },
          { label: 'Supplier Paid', value: `₹${totalSupplierPaid.toLocaleString()}`, icon: <WalletOutlined />, sub: 'Total paid to suppliers' },
          { label: 'Customer Pending', value: `₹${totalCustomerPending.toLocaleString()}`, icon: <TeamOutlined />, sub: `${customerList.filter(p => p.pending > 0).length} customers with dues` },
          { label: 'Customer Received', value: `₹${totalCustomerReceived.toLocaleString()}`, icon: <ArrowUpOutlined />, sub: 'Total received from customers' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PRIMARY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: PRIMARY, fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                    <Text strong style={{ color: PRIMARY, fontSize: 18 }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: '8px 16px 16px' } }}
      >
        {viewParty ? renderPartyView() : (
          <Tabs
            onChange={setActiveTab}
            items={filterTabs([
              {
                key: 'all',
                label: <Space><BookOutlined /> All Parties</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Text type="secondary" style={{ fontSize: FONT_SIZE }}>
                        {allDateBounds
                          ? 'Showing parties with activity in the selected period — Total/Paid reflect that period, Pending is current'
                          : 'All suppliers and customers in one view — click a row to view full transaction history'}
                      </Text>
                      <Space wrap>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search all parties..."
                          value={allSearch}
                          onChange={e => setAllSearch(e.target.value)}
                          style={{ width: 220, borderRadius: 8 }}
                          allowClear
                        />
                        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 130 }}>
                          <Option value="all">All Types</Option>
                          <Option value="Supplier">Suppliers</Option>
                          <Option value="Customer">Customers</Option>
                        </Select>
                        <DateGranularityFilter
                          granularity={allDateGranularity}
                          onGranularityChange={setAllDateGranularity}
                          range={allDateRange}
                          onRangeChange={setAllDateRange}
                        />
                        <Button icon={<FileExcelOutlined />} loading={bulkExportLoading} disabled={bulkExportLoading} onClick={() => handleListExcelExport(filteredAllParties, 'all', allDateBounds)} style={{ borderColor: '#52c41a', color: '#52c41a' }}>
                          Excel
                        </Button>
                        <Button icon={<FilePdfOutlined />} loading={bulkExportLoading} disabled={bulkExportLoading} onClick={() => handleListPdfExport(filteredAllParties, 'all', allDateBounds)} style={{ background: PRIMARY, border: 'none', color: '#fff' }}>
                          PDF
                        </Button>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      loading={!!allDateBounds && (allPeriod.loading || !allPeriod.rows)}
                      dataSource={filteredAllParties}
                      rowKey="key"
                      pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
                      locale={{ emptyText: allDateBounds ? 'No transactions in the selected period.' : 'No data' }}
                      scroll={{ x: 'max-content' }}
                      onRow={r => ({ onClick: () => openParty(r), style: { cursor: 'pointer' } })}
                      columns={partiesTableColumns('all')}
                    />
                  </div>
                )
              },
              {
                key: 'suppliers',
                label: <Space><ShopOutlined /> Vendors Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(supplierList, supplierSearch, setSupplierSearch, 'Supplier', supplierDateGranularity, setSupplierDateGranularity, supplierDateRange, setSupplierDateRange, supplierDateBounds, supplierPeriod)}
                  </div>
                )
              },
              {
                key: 'customers',
                label: <Space><TeamOutlined /> Customers Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(customerList, customerSearch, setCustomerSearch, 'Customer', customerDateGranularity, setCustomerDateGranularity, customerDateRange, setCustomerDateRange, customerDateBounds, customerPeriod)}
                  </div>
                )
              },
            ])}
            activeKey={activeKeyFor(activeTab)}
          />
        )}
      </Card>
    </div>
  );
}
