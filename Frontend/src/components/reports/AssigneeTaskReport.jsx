import { useState, useRef, useImperativeHandle } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Tag, Empty, DatePicker, Tooltip, Timeline } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined, ReloadOutlined, ClearOutlined, BellOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import { useGetAssigneeTaskReportQuery } from '../../store/api/apiSlice';
import { ASSIGNEE_TASK_STATUSES, assigneeStatusColor, deadlineColor, pillStyle } from '../../utils/assigneeTask';

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
const alertColor = {
  Ringing: '#B11E6A', Waiting: '#fa8c16', Snoozed: '#faad14', Resolved: '#52c41a', 'Alert Off': '#8c8c8c',
};
const ALERT_STATUSES = Object.keys(alertColor);
const DEADLINES = ['Overdue', 'Due Today', 'On Track', 'On Time', 'Late'];

const fmtAt = (d) => (d ? dayjs(d).format('DD MMM YYYY, hh:mm A') : '');
const fmtDay = (ymd) => (ymd ? dayjs(ymd).format('DD MMM YYYY') : '—');

const rowSearchText = (r) => [
  r.taskCode, r.description, r.assignedBy, r.assignee, r.assigneeRole, r.assigneeDepartment,
  r.status, r.remarks, r.closedBy, r.deadline, r.alertStatus, ...(r.coAssignees || []),
].map((v) => String(v ?? '')).join(' ').toLowerCase();

// Assignee Task Report — every "Task to Assignee" task (Task Management → New Task → Task for =
// Task to Assignee), one row per assignee: status, End Date standing, the Completed/Closed
// remarks, full status history (expand a row) and where the Task to Assignee alert (Settings →
// Alert Configuration) stands for it. Date range = this tab's picker, else the Reports header's
// range; it filters by the assigned date. Backend: reports.controller getAssigneeTaskReport.
export default function AssigneeTaskReport({ headerDateRange = null, ref }) {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const mutedColor = isDark ? '#aaa' : '#888';

  const [dateRange, setDateRange] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assignerFilter, setAssignerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, pageSize: 10 });
  const contentRef = useRef(null);

  const effectiveRange = dateRange?.[0] && dateRange?.[1] ? dateRange : (headerDateRange?.[0] && headerDateRange?.[1] ? headerDateRange : null);
  const dateParams = effectiveRange
    ? { startDate: effectiveRange[0].startOf('day').toISOString(), endDate: effectiveRange[1].endOf('day').toISOString() }
    : undefined;

  // Alert status (ringing / snoozed) and deadlines move on their own, so refetch on open.
  const { data: raw, isFetching, refetch } = useGetAssigneeTaskReportQuery(dateParams, { refetchOnMountOrArgChange: true });
  const rows = raw?.data || [];
  const alertConfig = raw?.alertConfig || null;

  const resetPage = () => setPage((p) => ({ ...p, current: 1 }));
  const changeFilter = (setter) => (v) => { setter(v); resetPage(); };

  const q = search.trim().toLowerCase();
  // Every filter except Status — feeds the stat cards, so clicking one card doesn't zero the others.
  const rowsNoStatus = rows.filter((r) => (deadlineFilter === 'all' || r.deadline === deadlineFilter)
    && (alertFilter === 'all' || r.alertStatus === alertFilter)
    && (assigneeFilter === 'all' || r.assignee === assigneeFilter)
    && (assignerFilter === 'all' || r.assignedBy === assignerFilter)
    && (!q || rowSearchText(r).includes(q)));
  const filtered = rowsNoStatus.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const assigneeOptions = Array.from(new Set(rows.map((r) => r.assignee).filter(Boolean))).sort();
  const assignerOptions = Array.from(new Set(rows.map((r) => r.assignedBy).filter(Boolean))).sort();
  const filtersActive = statusFilter !== 'all' || deadlineFilter !== 'all' || alertFilter !== 'all'
    || assigneeFilter !== 'all' || assignerFilter !== 'all' || !!q || !!(dateRange?.[0] && dateRange?.[1]);
  const clearFilters = () => {
    setStatusFilter('all'); setDeadlineFilter('all'); setAlertFilter('all');
    setAssigneeFilter('all'); setAssignerFilter('all'); setSearch(''); setDateRange(null); resetPage();
  };

  const exportExcel = () => {
    const headers = ['Task ID', 'Assigned On', 'Description', 'Assigned By', 'Assignee', 'Role', 'Department', 'Also Assigned To', 'End Date', 'Deadline', 'Status', 'Status Updated', 'Updated By', 'Started At', 'Completed/Closed At', 'Completed/Closed By', 'Remarks', 'Alert Status', 'Alert Note', 'Status History'];
    const data = filtered.map((r) => [
      r.taskCode, fmtAt(r.assignedAt), r.description, r.assignedBy, r.assignee, r.assigneeRole, r.assigneeDepartment,
      (r.coAssignees || []).join(', '), r.endDate ? fmtDay(r.endDate) : '', r.deadline, r.status, fmtAt(r.statusUpdatedAt), r.statusUpdatedBy,
      fmtAt(r.startedAt), fmtAt(r.closedAt), r.closedBy, r.remarks, r.alertStatus, r.alertNote,
      (r.history || []).map((h) => `${fmtAt(h.at)} ${h.status} (${h.byName || '—'})${h.remarks ? `: ${h.remarks}` : ''}`).join(' | '),
    ]);
    exportToExcel(headers, data, 'Assignee_Task_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Assignee_Task_Report.pdf');
  // Lets the Reports page header's Excel / PDF buttons export this tab too.
  useImperativeHandle(ref, () => ({ excel: exportExcel, pdf: exportPdf }));

  const statCards = [
    { key: 'all', label: 'Total Tasks', value: rowsNoStatus.length, color: '#B11E6A', sub: effectiveRange ? `${effectiveRange[0].format('DD MMM')} – ${effectiveRange[1].format('DD MMM YYYY')}` : 'All assigned dates' },
    ...ASSIGNEE_TASK_STATUSES.map((s) => ({ key: s, label: s, value: rowsNoStatus.filter((r) => r.status === s).length, color: assigneeStatusColor[s], sub: s === 'Completed' || s === 'Closed' ? 'Alert stopped' : 'Alert keeps ringing' })),
  ];
  const overdueCount = rowsNoStatus.filter((r) => r.deadline === 'Overdue').length;

  const alertSummary = (() => {
    if (!alertConfig) return null;
    if (!alertConfig.isEnabled) return { on: false, text: 'Task to Assignee alert is OFF — turn it on in Settings → Alert Configuration.' };
    if (!alertConfig.hasAudio) return { on: false, text: 'Task to Assignee alert is ON but has no audio uploaded — it will not ring until one is added in Settings → Alert Configuration.' };
    return {
      on: true,
      text: `Task to Assignee alert is ON — rings each assignee ${alertConfig.startTime}–${alertConfig.endTime} on ${(alertConfig.days || []).join(', ') || 'every day'}, repeating every ${alertConfig.durationMinutes} min, until they mark the task Completed or Closed with remarks.`,
    };
  })();

  const columns = [
    {
      title: 'Task', key: 'task', width: 150, fixed: 'left',
      sorter: (a, b) => new Date(a.assignedAt) - new Date(b.assignedAt),
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12, color: '#B11E6A', fontFamily: 'monospace' }}>{r.taskCode}</Text>
          <div style={{ fontSize: 11, color: mutedColor }}>{fmtAt(r.assignedAt)}</div>
        </div>
      ),
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description', width: 260,
      render: (v) => <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{v}</Text>,
    },
    { title: 'Assigned By', dataIndex: 'assignedBy', key: 'assignedBy', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Assignee', key: 'assignee', width: 180,
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.assignee || '—'}</Text>
          <div style={{ fontSize: 11, color: mutedColor }}>{[r.assigneeRole, r.assigneeDepartment].filter(Boolean).join(' · ')}</div>
          {r.coAssignees?.length > 0 && (
            <div style={{ fontSize: 10, color: mutedColor }}>Also: {r.coAssignees.join(', ')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status', key: 'status', width: 160,
      render: (_, r) => (
        <div>
          <Tag style={pillStyle(assigneeStatusColor[r.status] || '#888')}>{r.status}</Tag>
          <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{fmtAt(r.statusUpdatedAt)}{r.statusUpdatedBy ? ` · ${r.statusUpdatedBy}` : ''}</div>
        </div>
      ),
    },
    {
      title: 'End Date', key: 'endDate', width: 130,
      sorter: (a, b) => String(a.endDate || '').localeCompare(String(b.endDate || '')),
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{fmtDay(r.endDate)}</Text>
          {r.deadline && <div><Tag style={{ ...pillStyle(deadlineColor[r.deadline] || '#888'), marginTop: 2 }}>{r.deadline}</Tag></div>}
        </div>
      ),
    },
    {
      title: 'Remarks', key: 'remarks', width: 240,
      render: (_, r) => (r.remarks ? (
        <div>
          <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{r.remarks}</Text>
          {r.closedAt && <div style={{ fontSize: 11, color: mutedColor }}>{r.closedBy || '—'} · {fmtAt(r.closedAt)}</div>}
        </div>
      ) : <Text style={{ fontSize: 12, color: mutedColor }}>—</Text>),
    },
    {
      title: 'Alert', key: 'alert', width: 190, fixed: 'right',
      render: (_, r) => {
        const c = alertColor[r.alertStatus] || '#888';
        return (
          <div>
            <Tag style={pillStyle(c)}>{r.alertStatus}</Tag>
            {r.alertAt && (
              <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                {r.alertStatus === 'Snoozed' ? 'Until ' : r.alertStatus === 'Ringing' ? 'Last rang ' : ''}{fmtAt(r.alertAt)}
              </div>
            )}
            {r.alertNote && <div style={{ fontSize: 11, color: mutedColor, whiteSpace: 'normal', maxWidth: 180 }}>{r.alertNote}</div>}
          </div>
        );
      },
    },
  ];

  const renderHistory = (r) => (
    <div style={{ padding: '4px 12px' }}>
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>Status History — {r.taskCode}</Text>
      <Timeline
        items={(r.history || []).map((h, i) => ({
          key: i,
          color: assigneeStatusColor[h.status] || 'gray',
          content: (
            <div style={{ fontSize: 12 }}>
              <Text strong style={{ fontSize: 12 }}>{h.status}</Text>
              <span style={{ color: mutedColor }}> · {h.byName || '—'} · {fmtAt(h.at)}</span>
              {h.remarks && <div style={{ whiteSpace: 'pre-wrap' }}>{h.remarks}</div>}
            </div>
          ),
        }))}
      />
    </div>
  );

  return (
    <div>
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Tooltip title="Filters">
            <FilterOutlined style={{ color: '#B11E6A', fontSize: 16, flex: '0 0 auto' }} />
          </Tooltip>
          <Tooltip title="Filters by assigned date">
            <RangePicker
              value={dateRange}
              onChange={changeFilter(setDateRange)}
              placeholder={headerDateRange?.[0] && headerDateRange?.[1]
                ? [headerDateRange[0].format('DD MMM YYYY'), headerDateRange[1].format('DD MMM YYYY')]
                : ['Assigned from', 'Assigned to']}
              style={{ flex: '1 1 215px', maxWidth: 280, minWidth: 0, borderRadius: 8 }}
              allowClear
            />
          </Tooltip>
          <Select
            value={statusFilter}
            onChange={changeFilter(setStatusFilter)}
            options={[{ value: 'all', label: 'All Statuses' }, ...ASSIGNEE_TASK_STATUSES.map((s) => ({ value: s, label: s }))]}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 130px', minWidth: 0 }}
          />
          <Select
            value={deadlineFilter}
            onChange={changeFilter(setDeadlineFilter)}
            options={[{ value: 'all', label: 'All Deadlines' }, ...DEADLINES.map((s) => ({ value: s, label: s }))]}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 130px', minWidth: 0 }}
          />
          <Select
            value={alertFilter}
            onChange={changeFilter(setAlertFilter)}
            options={[{ value: 'all', label: 'All Alert Statuses' }, ...ALERT_STATUSES.map((s) => ({ value: s, label: s }))]}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 150px', minWidth: 0 }}
          />
          <Select
            value={assigneeFilter}
            onChange={changeFilter(setAssigneeFilter)}
            options={[{ value: 'all', label: 'All Assignees' }, ...assigneeOptions.map((p) => ({ value: p, label: p }))]}
            popupMatchSelectWidth={false}
            showSearch
            style={{ flex: '1 1 140px', maxWidth: 200, minWidth: 0 }}
          />
          <Select
            value={assignerFilter}
            onChange={changeFilter(setAssignerFilter)}
            options={[{ value: 'all', label: 'All Assigned By' }, ...assignerOptions.map((p) => ({ value: p, label: p }))]}
            popupMatchSelectWidth={false}
            showSearch
            style={{ flex: '1 1 140px', maxWidth: 200, minWidth: 0 }}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
            placeholder="Search task, description, person, remarks…"
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            style={{ flex: '2 1 150px', minWidth: 0, borderRadius: 8 }}
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
            const selected = statusFilter === s.key;
            return (
              <Col xs={12} sm={8} md={4} key={s.key} style={{ flex: '1 1 150px' }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card
                    hoverable
                    onClick={() => { setStatusFilter(selected && s.key !== 'all' ? 'all' : s.key); resetPage(); }}
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
            <Text strong style={{ color: textColor, fontSize: 15 }}>Assignee Tasks</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtered.length} task{filtered.length === 1 ? '' : 's'} · {overdueCount} overdue · {filtered.filter((r) => r.alertStatus === 'Ringing').length} ringing now
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
            expandable={{ expandedRowRender: renderHistory, rowExpandable: (r) => (r.history || []).length > 0 }}
            pagination={{
              current: page.current,
              pageSize: page.pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZES,
              showTotal: (t) => `${t} records`,
              onChange: (current, pageSize) => setPage({ current, pageSize }),
            }}
            locale={{ emptyText: <Empty description="No assignee tasks for this filter" /> }}
          />
        </Card>
      </div>
    </div>
  );
}
