import { useState, useRef, useImperativeHandle } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Tag, Empty, DatePicker, Tooltip } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined, ReloadOutlined, ClearOutlined, BellOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import { useGetLeadFollowupReportQuery } from '../../store/api/apiSlice';

const { Text } = Typography;
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

const PAGE_SIZES = ['10', '20', '50', '100'];
const stateColor = { 'Due Today': '#fa8c16', Overdue: '#ff4d4f', Upcoming: '#1890ff', Closed: '#52c41a' };
const alertColor = {
  Ringing: '#B11E6A', Scheduled: '#1890ff', Waiting: '#fa8c16', Snoozed: '#faad14', Stopped: '#ff4d4f',
  Expired: '#8c8c8c', Resolved: '#52c41a', 'Alert Off': '#8c8c8c', 'No Recipient': '#ff4d4f',
};
const ALERT_STATUSES = Object.keys(alertColor);
const UNIT_LABEL = { minutes: 'min', hours: 'hr', days: 'day' };

// Follow-up date/time as the server computed it (business-local IST), e.g. "05 Oct 2026 · 15:30".
const fmtFollowup = (r) => `${r.followUpDate ? dayjs(r.followUpDate).format('DD MMM YYYY') : '—'}${r.followUpTime ? ` · ${r.followUpTime}` : ''}`;
const fmtAt = (d) => (d ? dayjs(d).format('DD MMM, hh:mm A') : '');

const rowSearchText = (r) => [
  r.leadCode, r.hotelName, r.category, r.leadStatus, r.contactPerson, r.phone, r.salesPerson,
  r.createdBy, r.recipient, r.notes, r.state, r.alertStatus, r.alertNote, fmtFollowup(r),
].map((v) => String(v ?? '')).join(' ').toLowerCase();

// Lead Follow-up Report — every lead with a Follow-up Date (Sales → Lead → Lead Status card),
// its follow-up state (Due Today / Overdue / Upcoming / Closed) and where the Lead Follow-up
// alert (Settings → Alert Configuration) stands for it, incl. who it rings — the lead's
// assigned person, else whoever created the lead. Date range = this tab's picker, else the
// Reports header's range; it filters by follow-up date. Backend: reports.controller
// getLeadFollowupReport (same due-time/recipient code as the alert, utils/leadFollowup.js).
export default function LeadFollowupReport({ headerDateRange = null, ref }) {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const mutedColor = isDark ? '#aaa' : '#888';

  const [dateRange, setDateRange] = useState(null);
  const [stateFilter, setStateFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, pageSize: 10 });
  const contentRef = useRef(null);

  // This tab's own picker wins; otherwise the header's range (same rule as the other tabs).
  const effectiveRange = dateRange?.[0] && dateRange?.[1] ? dateRange : (headerDateRange?.[0] && headerDateRange?.[1] ? headerDateRange : null);
  const dateParams = effectiveRange
    ? { startDate: effectiveRange[0].startOf('day').toISOString(), endDate: effectiveRange[1].endOf('day').toISOString() }
    : undefined;

  // Alert status (ringing / snoozed / stopped) moves on its own between lead edits, so refetch
  // whenever the tab is opened or the range changes.
  const { data: raw, isFetching, refetch } = useGetLeadFollowupReportQuery(dateParams, { refetchOnMountOrArgChange: true });
  const rows = raw?.data || [];
  const alertConfig = raw?.alertConfig || null;

  const resetPage = () => setPage((p) => ({ ...p, current: 1 }));
  const changeFilter = (setter) => (v) => { setter(v); resetPage(); };

  const q = search.trim().toLowerCase();
  // Every filter except State — feeds the stat cards, so clicking one card doesn't zero the others.
  const rowsNoState = rows.filter((r) => (alertFilter === 'all' || r.alertStatus === alertFilter)
    && (personFilter === 'all' || r.recipient === personFilter)
    && (!q || rowSearchText(r).includes(q)));
  const filtered = rowsNoState.filter((r) => stateFilter === 'all' || r.state === stateFilter);

  const personOptions = Array.from(new Set(rows.map((r) => r.recipient).filter(Boolean))).sort();
  const filtersActive = stateFilter !== 'all' || alertFilter !== 'all' || personFilter !== 'all' || !!q || !!(dateRange?.[0] && dateRange?.[1]);
  const clearFilters = () => { setStateFilter('all'); setAlertFilter('all'); setPersonFilter('all'); setSearch(''); setDateRange(null); resetPage(); };

  const exportExcel = () => {
    const headers = ['Follow-up Date', 'Follow-up Time', 'Lead ID', 'Hotel / Company', 'Category', 'Lead Status', 'Contact Person', 'Phone', 'Assigned To', 'Created By', 'Alert Recipient', 'Recipient Basis', 'Follow-up Notes', 'Follow-up State', 'Alert Status', 'Alert Time', 'Alert Note'];
    const data = filtered.map((r) => [
      r.followUpDate ? dayjs(r.followUpDate).format('DD MMM YYYY') : '', r.followUpTime, r.leadCode, r.hotelName, r.category, r.leadStatus,
      r.contactPerson, r.phone, r.salesPerson, r.createdBy, r.recipient, r.recipientBasis, r.notes, r.state, r.alertStatus, fmtAt(r.alertAt), r.alertNote,
    ]);
    exportToExcel(headers, data, 'Lead_Followup_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Lead_Followup_Report.pdf');
  // Lets the Reports page header's Excel / PDF buttons export this tab too.
  useImperativeHandle(ref, () => ({ excel: exportExcel, pdf: exportPdf }));

  const countState = (s) => rowsNoState.filter((r) => r.state === s).length;
  const statCards = [
    { key: 'all', label: 'Total Follow-ups', value: rowsNoState.length, color: '#B11E6A', sub: effectiveRange ? `${effectiveRange[0].format('DD MMM')} – ${effectiveRange[1].format('DD MMM YYYY')}` : 'All follow-up dates' },
    { key: 'Due Today', label: 'Due Today', value: countState('Due Today'), color: stateColor['Due Today'], sub: 'Follow-up date is today' },
    { key: 'Overdue', label: 'Overdue', value: countState('Overdue'), color: stateColor.Overdue, sub: 'Date passed, lead still open' },
    { key: 'Upcoming', label: 'Upcoming', value: countState('Upcoming'), color: stateColor.Upcoming, sub: 'Scheduled for a later day' },
    { key: 'Closed', label: 'Closed', value: countState('Closed'), color: stateColor.Closed, sub: 'Converted / rejected / ordered' },
  ];

  const alertSummary = (() => {
    if (!alertConfig) return null;
    if (!alertConfig.isEnabled) return { on: false, text: 'Lead Follow-up alert is OFF — turn it on in Settings → Alert Configuration.' };
    const before = alertConfig.beforeValue > 0
      ? `${alertConfig.beforeValue} ${UNIT_LABEL[alertConfig.beforeUnit] || alertConfig.beforeUnit}${alertConfig.beforeValue === 1 ? '' : 's'} before the follow-up time`
      : 'at the follow-up time';
    return {
      on: true,
      text: `Lead Follow-up alert is ON — rings ${before}, ${alertConfig.startTime}–${alertConfig.endTime} on ${(alertConfig.days || []).join(', ') || 'every day'}, repeating every ${alertConfig.durationMinutes} min until the follow-up is rescheduled or the lead is closed (stops ${alertConfig.capDays} days after the follow-up time).`,
    };
  })();

  const columns = [
    {
      title: 'Follow-up', key: 'followup', width: 150, fixed: 'left',
      sorter: (a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0),
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.followUpDate ? dayjs(r.followUpDate).format('DD MMM YYYY') : '—'}</Text>
          <div style={{ fontSize: 11, color: mutedColor }}>{r.followUpTime || 'No time set'}</div>
        </div>
      ),
    },
    {
      title: 'Lead', key: 'lead', width: 200,
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12, color: '#B11E6A', fontFamily: 'monospace' }}>{r.leadCode || '—'}</Text>
          <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{r.hotelName || '—'}</div>
          <div style={{ fontSize: 11, color: mutedColor }}>{r.category}</div>
        </div>
      ),
    },
    { title: 'Lead Status', dataIndex: 'leadStatus', key: 'leadStatus', width: 120, render: (v) => (v ? <Tag style={{ borderRadius: 20, fontSize: 11 }}>{v}</Tag> : '—') },
    {
      title: 'Contact', key: 'contact', width: 150,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.contactPerson || '—'}</Text>
          {r.phone && <div style={{ fontSize: 11, color: mutedColor }}>{r.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Alert Recipient', key: 'recipient', width: 170,
      render: (_, r) => (r.recipient ? (
        <div>
          <Text style={{ fontSize: 12 }}>{r.recipient}</Text>
          <div>
            <Tag style={{ marginTop: 2, fontSize: 10, borderRadius: 10, background: r.recipientBasis === 'Created By' ? '#fa8c1618' : '#1890ff18', color: r.recipientBasis === 'Created By' ? '#fa8c16' : '#1890ff', border: 'none' }}>
              {r.recipientBasis === 'Created By' ? 'Lead creator (no assignee)' : 'Assigned person'}
            </Tag>
          </div>
        </div>
      ) : <Text style={{ fontSize: 12, color: '#ff4d4f' }}>No active user</Text>),
    },
    { title: 'Assigned To', dataIndex: 'salesPerson', key: 'salesPerson', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Follow-up Notes', dataIndex: 'notes', key: 'notes', width: 220, render: (v) => <Text style={{ fontSize: 12, whiteSpace: 'normal' }}>{v || '—'}</Text> },
    {
      title: 'State', dataIndex: 'state', key: 'state', width: 110,
      render: (v) => <Tag style={{ background: `${stateColor[v]}18`, color: stateColor[v], border: `1px solid ${stateColor[v]}44`, borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Alert', key: 'alert', width: 210, fixed: 'right',
      render: (_, r) => {
        const c = alertColor[r.alertStatus] || '#888';
        return (
          <div>
            <Tag style={{ background: `${c}18`, color: c, border: `1px solid ${c}44`, borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{r.alertStatus}</Tag>
            {r.alertAt && (
              <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                {r.alertStatus === 'Scheduled' ? 'Rings at ' : r.alertStatus === 'Snoozed' ? 'Until ' : r.alertStatus === 'Ringing' ? 'Last rang ' : ''}{fmtAt(r.alertAt)}
              </div>
            )}
            {r.alertNote && <div style={{ fontSize: 11, color: mutedColor, whiteSpace: 'normal', maxWidth: 200 }}>{r.alertNote}</div>}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Tooltip title="Filters">
            <FilterOutlined style={{ color: '#B11E6A', fontSize: 16, flex: '0 0 auto' }} />
          </Tooltip>
          <Tooltip title="Filters by follow-up date">
            <RangePicker
              value={dateRange}
              onChange={changeFilter(setDateRange)}
              placeholder={headerDateRange?.[0] && headerDateRange?.[1]
                ? [headerDateRange[0].format('DD MMM YYYY'), headerDateRange[1].format('DD MMM YYYY')]
                : ['Follow-up from', 'Follow-up to']}
              style={{ flex: '1 1 215px', maxWidth: 280, minWidth: 0, borderRadius: 8 }}
              allowClear
            />
          </Tooltip>
          <Select
            value={stateFilter}
            onChange={changeFilter(setStateFilter)}
            options={[{ value: 'all', label: 'All States' }, ...Object.keys(stateColor).map((s) => ({ value: s, label: s }))]}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 130px', minWidth: 0 }}
          />
          <Select
            value={alertFilter}
            onChange={changeFilter(setAlertFilter)}
            options={[{ value: 'all', label: 'All Alert Statuses' }, ...ALERT_STATUSES.map((s) => ({ value: s, label: s }))]}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 160px', minWidth: 0 }}
          />
          <Select
            value={personFilter}
            onChange={changeFilter(setPersonFilter)}
            options={[{ value: 'all', label: 'All Recipients' }, ...personOptions.map((p) => ({ value: p, label: p }))]}
            popupMatchSelectWidth={false}
            showSearch
            style={{ flex: '1 1 140px', maxWidth: 220, minWidth: 0 }}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
            placeholder="Search lead, hotel, person, notes…"
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
        {alertSummary && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, padding: '8px 12px', borderRadius: 10, background: alertSummary.on ? 'rgba(177,30,106,0.06)' : 'rgba(140,140,140,0.10)', border: `1px solid ${alertSummary.on ? 'rgba(177,30,106,0.2)' : 'rgba(140,140,140,0.25)'}` }}>
            <BellOutlined style={{ color: alertSummary.on ? '#B11E6A' : mutedColor, marginTop: 3 }} />
            <Text style={{ fontSize: 12, color: alertSummary.on ? textColor : mutedColor }}>{alertSummary.text}</Text>
          </div>
        )}

        <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
          {statCards.map((s, i) => {
            const selected = stateFilter === s.key;
            return (
              <Col xs={12} sm={8} md={5} key={s.key} style={{ flex: '1 1 160px' }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card
                    hoverable
                    onClick={() => { setStateFilter(selected && s.key !== 'all' ? 'all' : s.key); resetPage(); }}
                    style={{ borderRadius: 12, border: `1px solid ${selected ? s.color : `${s.color}22`}`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)`, boxShadow: selected ? `0 0 0 2px ${s.color}33` : undefined }}
                    styles={{ body: { padding: '12px 14px' } }}
                  >
                    <Text style={{ fontSize: 10, color: mutedColor, display: 'block', marginBottom: 3 }}>{s.label}</Text>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                  </Card>
                </motion.div>
              </Col>
            );
          })}
        </Row>

        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Text strong style={{ color: textColor, fontSize: 15 }}>Lead Follow-ups</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.length} follow-up{filtered.length === 1 ? '' : 's'} · {filtered.filter((r) => r.alertStatus === 'Ringing').length} ringing now
            </Text>
          </div>
          <Table
            size="small"
            bordered
            loading={isFetching}
            scroll={{ x: 'max-content' }}
            rowKey="key"
            dataSource={filtered}
            columns={columns}
            pagination={{
              current: page.current,
              pageSize: page.pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZES,
              showTotal: (t) => `${t} records`,
              onChange: (current, pageSize) => setPage({ current, pageSize }),
            }}
            locale={{ emptyText: <Empty description="No lead follow-ups for this filter" /> }}
          />
        </Card>
      </div>
    </div>
  );
}
