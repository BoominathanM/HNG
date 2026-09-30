import { useState, useRef, useImperativeHandle } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Space, Tag, Empty, DatePicker, Segmented, Tooltip } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined, BankOutlined, InfoCircleOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import { useGetPaymentBankReportQuery } from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const exportToExcel = (headers, rows, filename) => {
  const bom = '﻿';
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportRefToPdf = async (ref, filename) => {
  if (!ref?.current) return;
  await html2pdf()
    .from(ref.current)
    .set({
      margin: 6,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .save();
};

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? dayjs(d).format('DD MMM YYYY') : '—');
const docTypeColor = { Invoice: '#B11E6A', Order: '#1890ff', Quotation: '#7c3aed', Negotiation: '#fa8c16', Lead: '#13c2c2' };
const kindColor = { account: '#B11E6A', cash: '#52c41a', unassigned: '#fa8c16' };
const CASH_KEY = '__cash__';
const UNASSIGNED_KEY = '__unassigned__';
const PAGE_SIZES = ['10', '20', '50', '100'];

// Every text a row can be found by (amount too, so "12025" or "12,025" matches).
const rowSearchText = (r) => [
  r.client, r.docType, r.docRef, r.invoiceNo, r.reference, r.bankLabel, r.mode, r.recordedBy, r.basis,
  r.amount ?? r.pending, fmtDate(r.date),
].map((v) => String(v ?? '')).join(' ').toLowerCase();

// Payment Bank Details — per receiving bank account (Settings → Invoice Settings): how much has
// been received into it and how much is still pending on the orders/invoices expected to pay
// into it. Every filter (date range, bank account, mode, search) drives the totals, the bank
// cards and both tables alike. The date range comes from this tab's own picker, else the Reports
// header's range. Backend: reports.controller getPaymentBankReport.
export default function PaymentBankReport({ headerDateRange = null, ref }) {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const mutedColor = isDark ? '#aaa' : '#888';

  const [dateRange, setDateRange] = useState(null);
  const [bankFilter, setBankFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('received');
  const [page, setPage] = useState({ current: 1, pageSize: 10 });
  const contentRef = useRef(null);

  // This tab's own picker wins; otherwise the header's range (same rule as the other tabs).
  const effectiveRange = dateRange?.[0] && dateRange?.[1] ? dateRange : (headerDateRange?.[0] && headerDateRange?.[1] ? headerDateRange : null);
  const rangeStart = effectiveRange ? effectiveRange[0].startOf('day') : null;
  const rangeEnd = effectiveRange ? effectiveRange[1].endOf('day') : null;
  const startIso = rangeStart ? rangeStart.toISOString() : null;
  const endIso = rangeEnd ? rangeEnd.toISOString() : null;
  // RTK Query keys its cache on the serialized args, so a fresh object each render is fine.
  const dateParams = startIso && endIso ? { startDate: startIso, endDate: endIso } : undefined;

  // Payments are recorded from Sales and Billing screens whose mutations don't all invalidate
  // Reports, so refetch whenever the tab is opened or the range changes.
  const { data: raw, isFetching, refetch } = useGetPaymentBankReportQuery(dateParams, { refetchOnMountOrArgChange: true });
  const report = raw?.data || {};
  const accountMeta = report.accounts || [];
  const payments = report.payments || [];
  const pending = report.pending || [];

  // Any filter change goes back to page 1 so a narrowed result is never hidden on a later page.
  const resetPage = () => setPage((p) => ({ ...p, current: 1 }));
  const changeFilter = (setter) => (v) => { setter(v); resetPage(); };

  const q = search.trim().toLowerCase();
  const matchesSearch = (r) => !q || rowSearchText(r).includes(q) || rowSearchText(r).replace(/,/g, '').includes(q.replace(/,/g, ''));
  // Pending is a live balance; with a date range it is limited to orders/invoices dated in it.
  const inRange = (d) => !rangeStart || (d && !dayjs(d).isBefore(rangeStart) && !dayjs(d).isAfter(rangeEnd));

  // Rows matching every filter except the bank account — they feed the per-bank cards, so
  // clicking one card doesn't zero out the others.
  const paymentsNoBank = payments.filter((p) => (modeFilter === 'all' || p.mode === modeFilter) && matchesSearch(p));
  const pendingNoBank = pending.filter((p) => inRange(p.date) && matchesSearch(p));
  const filteredPayments = paymentsNoBank.filter((p) => bankFilter === 'all' || p.bankKey === bankFilter);
  const filteredPending = pendingNoBank.filter((p) => bankFilter === 'all' || p.bankKey === bankFilter);

  const accounts = accountMeta.map((a) => {
    const rec = paymentsNoBank.filter((p) => p.bankKey === a.key);
    const pen = pendingNoBank.filter((p) => p.bankKey === a.key);
    const modes = {};
    rec.forEach((p) => { modes[p.mode] = r2((modes[p.mode] || 0) + p.amount); });
    return {
      ...a,
      received: r2(rec.reduce((s, p) => s + p.amount, 0)),
      paymentCount: rec.length,
      lastPaymentDate: rec.reduce((m, p) => (!m || new Date(p.date) > new Date(m) ? p.date : m), null),
      modes,
      pending: r2(pen.reduce((s, p) => s + p.pending, 0)),
      pendingCount: pen.length,
    };
  });

  const sumBy = (rows, pred, field = 'amount') => r2(rows.filter(pred).reduce((s, r) => s + (Number(r[field]) || 0), 0));
  const totalReceived = sumBy(filteredPayments, () => true);
  const totalPending = sumBy(filteredPending, () => true, 'pending');
  const bankReceived = sumBy(filteredPayments, (p) => !String(p.bankKey).startsWith('__'));
  const cashReceived = sumBy(filteredPayments, (p) => p.bankKey === CASH_KEY);
  const unassignedReceived = sumBy(filteredPayments, (p) => p.bankKey === UNASSIGNED_KEY);

  const modeOptions = Array.from(new Set(payments.map((p) => p.mode))).sort();
  const bankOptions = [{ value: 'all', label: 'All Bank Accounts' }, ...accountMeta.map((a) => ({ value: a.key, label: a.label }))];
  // A bucket that dropped out of the data (e.g. after a date change) keeps a readable label.
  if (bankFilter !== 'all' && !bankOptions.some((o) => o.value === bankFilter)) {
    bankOptions.push({ value: bankFilter, label: bankFilter === CASH_KEY ? 'Cash — no bank account' : bankFilter === UNASSIGNED_KEY ? 'Bank not selected' : 'Selected account' });
  }
  const filtersActive = bankFilter !== 'all' || modeFilter !== 'all' || !!q || !!(dateRange?.[0] && dateRange?.[1]);
  const clearFilters = () => { setBankFilter('all'); setModeFilter('all'); setSearch(''); setDateRange(null); resetPage(); };

  const exportExcel = () => {
    const headers = ['Bank Account', 'Bank', 'IFSC', 'Received', 'Payments', 'Last Payment', 'Pending', 'Pending Orders/Invoices'];
    const rows = accounts
      .filter((a) => bankFilter === 'all' || a.key === bankFilter)
      .map((a) => [a.label, a.bank, a.ifsc, a.received, a.paymentCount, a.lastPaymentDate ? fmtDate(a.lastPaymentDate) : '', a.pending, a.pendingCount]);
    rows.push([], ['PAYMENTS RECEIVED'], ['Date', 'Client', 'Document', 'Doc No', 'Invoice No', 'Mode', 'Bank Account', 'Reference', 'Recorded By', 'Amount']);
    filteredPayments.forEach((p) => rows.push([fmtDate(p.date), p.client, p.docType, p.docRef, p.invoiceNo, p.mode, p.bankLabel, p.reference, p.recordedBy, p.amount]));
    rows.push([], ['PENDING COLLECTIONS'], ['Client', 'Type', 'Order / Invoice', 'Invoice No', 'Date', 'Total', 'Paid', 'Pending', 'Expected In', 'Basis']);
    filteredPending.forEach((p) => rows.push([p.client, p.docType, p.docRef, p.invoiceNo, fmtDate(p.date), p.total, p.paid, p.pending, p.bankLabel, p.basis]));
    exportToExcel(headers, rows, 'Payment_Bank_Details_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Payment_Bank_Details_Report.pdf');
  // Lets the Reports page header's Excel / PDF buttons export this tab too.
  useImperativeHandle(ref, () => ({ excel: exportExcel, pdf: exportPdf }));

  const rangeNote = effectiveRange ? ` · ${effectiveRange[0].format('DD MMM')} – ${effectiveRange[1].format('DD MMM YYYY')}` : '';
  const statCards = [
    { label: 'Total Received', value: inr(totalReceived), color: '#52c41a', sub: `${filteredPayments.length} payment${filteredPayments.length === 1 ? '' : 's'}${rangeNote}` },
    { label: 'Total Pending', value: inr(totalPending), color: '#fa541c', sub: `${filteredPending.length} order${filteredPending.length === 1 ? '' : 's'} / invoice${filteredPending.length === 1 ? '' : 's'} · balance as of today` },
    { label: 'Into Bank Accounts', value: inr(bankReceived), color: '#B11E6A', sub: 'Payments with a bank account' },
    { label: 'Cash', value: inr(cashReceived), color: '#13c2c2', sub: 'Cash payments' },
    { label: 'Bank Not Selected', value: inr(unassignedReceived), color: '#fa8c16', sub: 'Older UPI / card / cheque entries' },
  ];

  const docCell = (r, showInvoice) => (
    <div>
      <Tag style={{ background: `${docTypeColor[r.docType] || '#888'}18`, color: docTypeColor[r.docType] || '#888', border: `1px solid ${docTypeColor[r.docType] || '#888'}44`, borderRadius: 20, fontSize: 10 }}>{r.docType}</Tag>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#B11E6A' }}>{r.docRef || '—'}</div>
      {showInvoice && r.invoiceNo && r.invoiceNo !== r.docRef ? <div style={{ fontSize: 11, color: mutedColor }}>{r.invoiceNo}</div> : null}
    </div>
  );
  const bankCell = (v, r) => <Text style={{ fontSize: 12, color: String(r.bankKey).startsWith('__') ? mutedColor : undefined }}>{v}</Text>;

  const paymentColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => <Text style={{ fontSize: 12 }}>{fmtDate(v)}</Text>, sorter: (a, b) => new Date(a.date || 0) - new Date(b.date || 0), defaultSortOrder: 'descend' },
    { title: 'Client', dataIndex: 'client', key: 'client', width: 170, render: (v) => <Text strong style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Document', key: 'doc', width: 150, render: (_, r) => docCell(r, true) },
    { title: 'Mode', dataIndex: 'mode', key: 'mode', width: 120, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 11 }}>{v}</Tag> },
    { title: 'Bank Account', dataIndex: 'bankLabel', key: 'bankLabel', width: 210, render: bankCell },
    { title: 'Reference / Notes', dataIndex: 'reference', key: 'reference', width: 180, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Recorded By', dataIndex: 'recordedBy', key: 'recordedBy', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', fixed: 'right', sorter: (a, b) => a.amount - b.amount, render: (v) => <Text strong style={{ color: '#52c41a' }}>{inr(v)}</Text> },
  ];

  const pendingColumns = [
    { title: 'Client', dataIndex: 'client', key: 'client', width: 170, render: (v) => <Text strong style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Order / Invoice', key: 'doc', width: 160, render: (_, r) => docCell(r, true) },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => <Text style={{ fontSize: 12 }}>{fmtDate(v)}</Text>, sorter: (a, b) => new Date(a.date || 0) - new Date(b.date || 0) },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right', render: (v) => <Text style={{ fontSize: 12 }}>{inr(v)}</Text> },
    { title: 'Paid', dataIndex: 'paid', key: 'paid', width: 120, align: 'right', render: (v) => <Text style={{ fontSize: 12, color: '#52c41a' }}>{inr(v)}</Text> },
    { title: 'Pending', dataIndex: 'pending', key: 'pending', width: 120, align: 'right', sorter: (a, b) => a.pending - b.pending, defaultSortOrder: 'descend', render: (v) => <Text strong style={{ color: '#fa541c' }}>{inr(v)}</Text> },
    { title: 'Expected In', dataIndex: 'bankLabel', key: 'bankLabel', width: 210, render: bankCell },
    {
      title: (
        <Space size={4}>Basis
          <Tooltip title="Last payment account: where this customer's most recent bank payment went. Invoice bank account: no bank payment yet, so the account printed on invoices.">
            <InfoCircleOutlined style={{ color: mutedColor }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'basis', key: 'basis', width: 170, render: (v) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text>,
    },
  ];

  const tableProps = {
    size: 'small',
    bordered: true,
    loading: isFetching,
    scroll: { x: 'max-content' },
    rowKey: 'key',
    pagination: {
      current: page.current,
      pageSize: page.pageSize,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZES,
      showTotal: (t) => `${t} records`,
      onChange: (current, pageSize) => setPage({ current, pageSize }),
    },
  };

  return (
    <div>
      {/* Filter bar — one row: each control has a small base width and grows into the spare
          space, so all of them share a line on laptop widths and up; on a phone it wraps. */}
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Tooltip title="Filters">
            <FilterOutlined style={{ color: '#B11E6A', fontSize: 16, flex: '0 0 auto' }} />
          </Tooltip>
          <RangePicker
            value={dateRange}
            onChange={changeFilter(setDateRange)}
            placeholder={headerDateRange?.[0] && headerDateRange?.[1]
              ? [headerDateRange[0].format('DD MMM YYYY'), headerDateRange[1].format('DD MMM YYYY')]
              : ['Start date', 'End date']}
            style={{ flex: '1 1 215px', maxWidth: 280, minWidth: 0, borderRadius: 8 }}
            allowClear
          />
          <Select
            value={bankFilter}
            onChange={changeFilter(setBankFilter)}
            options={bankOptions}
            popupMatchSelectWidth={false}
            style={{ flex: '1 1 140px', maxWidth: 300, minWidth: 0 }}
          />
          <Tooltip title="Mode filters the payments received (pending balances have no mode)">
            <Select
              value={modeFilter}
              onChange={changeFilter(setModeFilter)}
              options={[{ value: 'all', label: 'All Modes' }, ...modeOptions.map((m) => ({ value: m, label: m }))]}
              popupMatchSelectWidth={false}
              style={{ flex: '0 1 130px', minWidth: 0 }}
            />
          </Tooltip>
          <Input
            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
            placeholder="Search client, order, invoice, bank, amount…"
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            style={{ flex: '2 1 130px', minWidth: 0, borderRadius: 8 }}
          />
          {filtersActive && (
            <Tooltip title="Clear filters">
              <Button icon={<ClearOutlined />} onClick={clearFilters} style={{ flex: '0 0 auto' }} />
            </Tooltip>
          )}
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching} style={{ flex: '0 0 auto' }} />
          </Tooltip>
          <Button icon={<FileExcelOutlined />} style={{ flex: '0 0 auto', color: '#52c41a', borderColor: '#52c41a44' }} onClick={exportExcel}>Excel</Button>
          <Button icon={<FilePdfOutlined />} style={{ flex: '0 0 auto', color: '#B11E6A', borderColor: '#B11E6A44' }} onClick={exportPdf}>PDF</Button>
        </div>
      </Card>

      <div ref={contentRef}>
        <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
          {statCards.map((s, i) => (
            <Col xs={12} sm={8} md={5} key={s.label} style={{ flex: '1 1 160px' }}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                  <Text style={{ fontSize: 10, color: mutedColor, display: 'block', marginBottom: 3 }}>{s.label}</Text>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* One card per bank account: received vs pending. Click a card to filter by it. */}
        <Title level={5} style={{ color: textColor, marginTop: 0, marginBottom: 10 }}>Bank Accounts</Title>
        {accounts.length === 0 ? (
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, marginBottom: 14 }}>
            <Empty description={isFetching ? 'Loading…' : 'No bank accounts yet — add them in Settings → Invoice Settings'} />
          </Card>
        ) : (
          <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
            {accounts.map((a) => {
              const color = kindColor[a.kind] || '#B11E6A';
              const selected = bankFilter === a.key;
              const dimmed = bankFilter !== 'all' && !selected;
              const modes = Object.entries(a.modes || {}).sort((x, y) => y[1] - x[1]);
              return (
                <Col xs={24} sm={12} lg={8} key={a.key}>
                  <Card
                    hoverable
                    onClick={() => { setBankFilter(selected ? 'all' : a.key); resetPage(); }}
                    style={{ borderRadius: 14, background: cardBg, height: '100%', opacity: dimmed ? 0.55 : 1, border: `1px solid ${selected ? color : `${color}33`}`, boxShadow: selected ? `0 0 0 2px ${color}33` : '0 4px 20px rgba(177,30,106,0.06)' }}
                    styles={{ body: { padding: 14 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BankOutlined style={{ color, fontSize: 16 }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text strong style={{ color: textColor, fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</Text>
                        {(a.bank || a.ifsc) && (
                          <Text style={{ fontSize: 11, color: mutedColor }}>{[a.bank, a.ifsc].filter(Boolean).join(' · ')}</Text>
                        )}
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {a.isInvoiceAccount && <Tag color="magenta" style={{ margin: 0, fontSize: 10 }}>On invoice</Tag>}
                          {a.kind === 'account' && !a.active && <Tag style={{ margin: 0, fontSize: 10 }}>{a.removed ? 'Removed' : 'Inactive'}</Tag>}
                          {selected && <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Filtered</Tag>}
                        </div>
                      </div>
                    </div>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Text style={{ fontSize: 10, color: mutedColor, display: 'block' }}>Received</Text>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#52c41a' }}>{inr(a.received)}</div>
                        <Text style={{ fontSize: 10, color: '#aaa' }}>{a.paymentCount} payment{a.paymentCount === 1 ? '' : 's'}</Text>
                      </Col>
                      <Col span={12}>
                        <Text style={{ fontSize: 10, color: mutedColor, display: 'block' }}>Pending</Text>
                        <div style={{ fontSize: 17, fontWeight: 800, color: a.pending > 0 ? '#fa541c' : mutedColor }}>{inr(a.pending)}</div>
                        <Text style={{ fontSize: 10, color: '#aaa' }}>{a.pendingCount} order{a.pendingCount === 1 ? '' : 's'} / invoice{a.pendingCount === 1 ? '' : 's'}</Text>
                      </Col>
                    </Row>
                    {(modes.length > 0 || a.lastPaymentDate) && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${isDark ? '#333' : '#eee'}`, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {modes.map(([m, amt]) => (
                          <Tag key={m} style={{ margin: 0, fontSize: 10, borderRadius: 20 }}>{m}: {inr(amt)}</Tag>
                        ))}
                        {a.lastPaymentDate && <Text style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>Last: {fmtDate(a.lastPaymentDate)}</Text>}
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Segmented
              value={view}
              onChange={(v) => { setView(v); resetPage(); }}
              options={[
                { value: 'received', label: `Payments Received (${filteredPayments.length})` },
                { value: 'pending', label: `Pending Collections (${filteredPending.length})` },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {view === 'received'
                ? `${inr(totalReceived)} received${rangeNote}`
                : `${inr(totalPending)} pending${effectiveRange ? ` on orders / invoices dated ${rangeNote.slice(3)}` : ' as of today'}`}
            </Text>
          </div>
          {view === 'received' ? (
            <Table
              {...tableProps}
              dataSource={filteredPayments}
              columns={paymentColumns}
              locale={{ emptyText: <Empty description="No payments for this filter" /> }}
            />
          ) : (
            <Table
              {...tableProps}
              dataSource={filteredPending}
              columns={pendingColumns}
              locale={{ emptyText: <Empty description="Nothing pending for this filter" /> }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
