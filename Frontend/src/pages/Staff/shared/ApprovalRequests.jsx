// Request list (+ optional calendar) for one EktaHR approval type, read from
// GET /admin/approvals/{type}. With a `staffId` it's a staff detail tab;
// without one it's the org-wide Approvals page (header card + Staff column).
import React, { useMemo, useState } from 'react';
import { Button, Dropdown, Input, Modal, Select, Table, Tabs, Typography, DatePicker, Descriptions } from 'antd';
import {
  SearchOutlined, EyeOutlined, ScheduleOutlined, KeyOutlined, WalletOutlined, FileTextOutlined,
  PaperClipOutlined, CalendarOutlined, ClockCircleOutlined, MoreOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useGetHrApprovalsQuery } from '../../../store/api/apiSlice';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { canViewTab } from '../../../utils/access';
import {
  pick, asText, fmtDate, fmtDateRange, fmtMoney, fmtHrs, toList, statusColor, staffName, STAFF_FIELDS, isBlank, BRAND,
} from './hrUtils';
import {
  PanelCard, PanelTitle, PageHeaderCard, EmptyBlock, StatusTag, DotTag, StaffCell, LoadError,
  FiltersButton, FilterField, CalendarHeader, CalendarGrid,
} from './StaffUi';
import useSurface from './useSurface';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Cancelled'].map((v) => ({ value: v, label: v }));
const STATUS_PATHS = ['status', 'approvalStatus'];
const REVIEWER_PATHS = ['approvedBy', 'reviewedBy', 'actionBy', 'approver'];
const REVIEWED_AT_PATHS = ['approvedAt', 'reviewedAt', 'actionAt', 'approvedDate', 'remarksDate'];
const REMARK_PATHS = ['remarks', 'adminRemarks', 'reviewRemarks', 'comment', 'rejectionReason'];
const LEAVE_TYPE_PATHS = ['leaveType', 'leaveTypeName', 'leaveTemplate', 'type'];
const STAFF_REF_PATHS = ['staffId', 'staff', 'employee', 'user'];

// ── Column builders ───────────────────────────────────────────────────────
const dash = <Text type="secondary">—</Text>;
const show = (v) => (isBlank(v) ? dash : v);
const fileUrl = (v) => (typeof v === 'string' ? v : pick(v, ['url', 'fileUrl', 'secure_url', 'path']));

// Attachments arrive as URLs, inline base64 images (browsers refuse to open
// those in a new tab, so they preview in a modal) or a bare file name.
function FileLink({ value, label }) {
  const [open, setOpen] = useState(false);
  const linkStyle = { marginRight: 8, whiteSpace: 'nowrap', fontWeight: 600 };
  if (/^https?:\/\//i.test(value)) {
    return <a href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={linkStyle}><PaperClipOutlined /> {label}</a>;
  }
  if (/^data:image\//i.test(value)) {
    return (
      <>
        <a onClick={(e) => { e.stopPropagation(); setOpen(true); }} style={linkStyle}><PaperClipOutlined /> {label}</a>
        <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={label} width={560}>
          <img src={value} alt={label} style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
        </Modal>
      </>
    );
  }
  return <Text type="secondary" style={{ fontSize: 12 }}>{value}</Text>;
}

const col = {
  text: (key, title, paths, extra) => ({ key, title, render: (r) => show(asText(pick(r, paths))), ...extra }),
  bold: (key, title, paths, extra) => ({ key, title, render: (r) => show(asText(pick(r, paths)) && <Text strong>{asText(pick(r, paths))}</Text>), ...extra }),
  date: (key, title, paths) => ({ key, title, render: (r) => show(fmtDate(pick(r, paths))) }),
  money: (key, title, paths) => ({ key, title, render: (r) => show(fmtMoney(pick(r, paths)) && <Text strong>{fmtMoney(pick(r, paths))}</Text>) }),
  tag: (key, title, paths, color) => ({ key, title, render: (r) => <DotTag color={color}>{asText(pick(r, paths))}</DotTag> }),
  status: () => ({ key: 'status', title: 'Status', render: (r) => <StatusTag status={pick(r, STATUS_PATHS)} /> }),
  file: (key, title, paths, label) => ({
    key,
    title,
    render: (r) => {
      const urls = [].concat(pick(r, paths) || []).map(fileUrl).filter(Boolean);
      if (!urls.length) return dash;
      return urls.map((url, i) => <FileLink key={i} value={url} label={urls.length > 1 ? `${label} ${i + 1}` : label} />);
    },
  }),
  // "Admin" — or, with a prefix, "Approved by: Admin" + the review date.
  reviewer: (title, prefix) => ({
    key: 'reviewedBy',
    title,
    render: (r) => {
      const name = asText(pick(r, REVIEWER_PATHS));
      if (!name) return dash;
      const at = fmtDate(pick(r, REVIEWED_AT_PATHS));
      return prefix ? (
        <div>
          <Text style={{ color: BRAND, fontWeight: 600, fontSize: 12.5 }}>{prefix}: {name}</Text>
          {at && <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>{at}</Text>}
        </div>
      ) : <Text strong>{name}</Text>;
    },
  }),
};

const monthYear = (r) => {
  const v = asText(pick(r, ['targetMonth', 'monthYear', 'period', 'payslipMonth']));
  if (v) return v;
  const m = pick(r, ['month']);
  const y = pick(r, ['year']);
  const mText = Number.isInteger(Number(m)) && Number(m) >= 1 && Number(m) <= 12 ? dayjs().month(Number(m) - 1).format('MMMM') : asText(m);
  return [mText, asText(y)].filter(Boolean).join(' ') || undefined;
};

// "1 day", "2 days", "0.5 day · 1st Half".
const daysText = (r) => {
  const n = pick(r, ['totalDays', 'days', 'noOfDays', 'numberOfDays']);
  if (isBlank(n)) return undefined;
  const base = Number.isNaN(Number(n)) ? asText(n) : `${n} day${Number(n) <= 1 ? '' : 's'}`;
  const session = r.isHalfDay ? asText(r.halfDaySession) : undefined;
  return session ? `${base} · ${session}` : base;
};

// EktaHR stores leave types bare ("casual", "Unpaid") — show "Casual Leave".
const leaveTypeText = (r) => {
  const t = asText(pick(r, LEAVE_TYPE_PATHS));
  if (!t) return undefined;
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /leave/i.test(cap) ? cap : `${cap} Leave`;
};

// Permission "Late 1h 10m" / "Early 0h 30m" from the hour/minute fields.
const lateEarlyText = (r) => [['Late', r.lateHours, r.lateMinutes], ['Early', r.earlyHours, r.earlyMinutes]]
  .filter(([, h, m]) => Number(h) || Number(m))
  .map(([label, h, m]) => `${label} ${Number(h) || 0}h ${Number(m) || 0}m`)
  .join(' · ') || undefined;

// One entry per approval type. `page*` = org-wide page copy; the rest is shared
// with the staff detail tab.
const REQUEST_TYPES = {
  leave: {
    pageTitle: 'Leaves Approvals',
    pageSubtitle: 'Manage and review employee leave applications',
    tabTitle: 'Leave History & Requests',
    listTab: { page: 'Leave Requests', tab: 'Leave History & Requests' },
    calendarTab: 'Leave Calendar',
    listHeading: 'List of All & Past Leaves',
    noun: 'leave',
    icon: <ScheduleOutlined />,
    searchPlaceholder: { page: 'Search employee, leave type...', tab: 'Search reason or leave type...' },
    timeline: 'All Timeline',
    refresh: true,
    calendar: true,
    leaveTypeFilter: true,
    staffAvatar: true,
    badge: (n) => `${n} on leave`,
    span: (r) => [pick(r, ['startDate', 'fromDate', 'from', 'date']), pick(r, ['endDate', 'toDate', 'to', 'startDate', 'fromDate', 'date'])],
    chip: (r) => leaveTypeText(r) || 'Leave',
    columns: [
      { key: 'type', title: 'Type', render: (r) => <DotTag color="#52c41a">{leaveTypeText(r)}</DotTag> },
      { key: 'days', title: 'Days', render: (r) => show(daysText(r) && <Text strong>{daysText(r)}</Text>) },
      {
        key: 'dates',
        title: 'Leave Dates',
        render: (r) => show(fmtDateRange(pick(r, ['startDate', 'fromDate', 'from', 'date']), pick(r, ['endDate', 'toDate', 'to']))),
      },
      col.status(),
      col.reviewer('Reviewed By'),
      col.text('reason', 'Reason', ['reason', 'description', 'purpose'], { ellipsis: true }),
      col.text('remarks', 'Remarks', REMARK_PATHS, { ellipsis: true }),
    ],
  },
  permission: {
    pageTitle: 'Permission Requests',
    pageSubtitle: 'Review and manage employee break and arrival permission requests',
    tabTitle: 'Permission History & Requests',
    listTab: { page: 'All Requests', tab: 'Permission History & Requests' },
    calendarTab: 'Permission Calendar',
    noun: 'permission',
    icon: <KeyOutlined />,
    searchPlaceholder: { page: 'Search employee, ID, reason...', tab: 'Search reason or type...' },
    timeline: 'All Time',
    calendar: true,
    staffAvatar: true,
    badge: (n) => `${n} req`,
    span: (r) => {
      const d = pick(r, ['date', 'permissionDate', 'startDate', 'fromDate']);
      return [d, d];
    },
    chip: (r) => [asText(pick(r, ['type', 'permissionType'])), fmtHrs(pick(r, ['durationMins', 'duration']))].filter(Boolean).join(' · ') || 'Permission',
    columns: [
      col.tag('type', 'Type', ['permissionType', 'type', 'category'], '#1677ff'),
      col.date('date', 'Date', ['date', 'permissionDate', 'startDate', 'fromDate']),
      { key: 'lateEarly', title: 'Late / Early', render: (r) => show(lateEarlyText(r)) },
      { key: 'duration', title: 'Duration', render: (r) => show(fmtHrs(pick(r, ['durationMins', 'duration', 'totalMinutes', 'minutes']))) },
      col.status(),
      col.reviewer('Reviewed By'),
      col.text('reason', 'Reason', ['reason', 'description', 'purpose'], { ellipsis: true }),
      col.text('remarks', 'Remarks', REMARK_PATHS, { ellipsis: true }),
    ],
  },
  expense: {
    pageTitle: 'Reimbursement',
    tabTitle: 'All Reimbursement Claims',
    cardTitle: 'All Reimbursement Claims',
    noun: 'reimbursement',
    icon: <WalletOutlined />,
    searchPlaceholder: { page: 'Search (case-insensitive)...', tab: 'Search (case-insensitive)...' },
    columns: [
      col.bold('category', 'Category', ['category', 'expenseCategory', 'expenseType', 'claimType']),
      col.money('amount', 'Amount', ['amount', 'claimAmount', 'totalAmount']),
      col.date('claimDate', 'Claim Date', ['claimDate', 'expenseDate', 'date', 'createdAt']),
      col.text('description', 'Description', ['description', 'reason', 'remarks'], { ellipsis: true }),
      col.file('receipt', 'Receipt Attached', ['receiptName', 'receipt', 'receiptUrl', 'attachment', 'attachments', 'bill'], 'View Receipt'),
      {
        key: 'paymentType',
        title: 'Payment Type',
        render: (r) => {
          const type = asText(pick(r, ['paymentRoute', 'paymentType', 'paymentMode', 'paymentMethod']));
          const period = asText(pick(r, ['payrollMonth', 'payrollPeriod']));
          return <DotTag color="#1677ff">{type && (period ? `${type} (${period})` : type)}</DotTag>;
        },
      },
      col.file('paymentProof', 'Payment Proof', ['proofImg', 'paymentProof', 'paymentProofUrl', 'paymentReceipt'], 'View Proof'),
      col.status(),
      col.reviewer('Approved By', 'Approved by'),
    ],
  },
  payslip: {
    pageTitle: 'Payslip Requests',
    tabTitle: 'Payslip Requests & Downloads',
    noun: 'payslip',
    icon: <FileTextOutlined />,
    searchPlaceholder: { page: 'Search...', tab: 'Search request...' },
    columns: [
      { key: 'monthYear', title: 'Month/Year', render: (r) => show(monthYear(r)) },
      col.bold('reason', 'Purpose / Reason', ['purpose', 'reason', 'description']),
      col.status(),
      col.date('requestedOn', 'Requested Date', ['requestedOn', 'requestDate', 'createdAt']),
      col.reviewer('Approved By'),
      col.text('remarks', 'Remarks', REMARK_PATHS, { ellipsis: true }),
    ],
  },
};

// Timeline presets → startDate/endDate query params.
const TIMELINES = {
  upcoming: { label: 'Upcoming', range: () => [dayjs(), null] },
  today: { label: 'Today', range: () => [dayjs(), dayjs()] },
  this_week: { label: 'This Week', range: () => [dayjs().startOf('week'), dayjs().endOf('week')] },
  this_month: { label: 'This Month', range: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  past: { label: 'Past', range: () => [null, dayjs().subtract(1, 'day')] },
};

const staffOf = (r) => {
  const ref = pick(r, STAFF_REF_PATHS);
  return ref && typeof ref === 'object' ? ref : null;
};
const staffIdOf = (r) => {
  const ref = pick(r, STAFF_REF_PATHS);
  return ref && typeof ref === 'object' ? ref._id : ref;
};
const staffLabel = (r) => {
  const ref = staffOf(r);
  return (ref && staffName(ref) !== '—' ? staffName(ref) : asText(pick(r, ['staffName', 'employeeName', 'name']))) || '—';
};

export default function ApprovalRequests({ type, staffId }) {
  const cfg = REQUEST_TYPES[type];
  const mode = staffId ? 'tab' : 'page';
  const navigate = useNavigate();
  const user = useSelector((st) => st.auth.user);
  const s = useSurface();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [status, setStatus] = useState();
  const [leaveType, setLeaveType] = useState();
  const [range, setRange] = useState(null);
  const [timeline, setTimeline] = useState('all');
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState(null);

  // Org-wide pages with a timeline select use it for dates; elsewhere the
  // Filters popover has a date range.
  const useTimeline = mode === 'page' && !!cfg.timeline;
  const [from, to] = useTimeline ? (TIMELINES[timeline]?.range() || []) : (range || []);

  const { data, isFetching, error, refetch } = useGetHrApprovalsQuery({
    type,
    staffId,
    search: debouncedSearch || undefined,
    status,
    leaveType,
    startDate: from?.format('YYYY-MM-DD'),
    endDate: to?.format('YYYY-MM-DD'),
  });
  const rows = useMemo(() => toList(data), [data]);

  // Leave-type options come from the records themselves (no separate lookup API).
  const leaveTypeOptions = useMemo(() => {
    if (!cfg.leaveTypeFilter) return [];
    const set = new Set(rows.map((r) => asText(pick(r, LEAVE_TYPE_PATHS))).filter(Boolean));
    if (leaveType) set.add(leaveType);
    return [...set].sort().map((v) => ({ value: v, label: v }));
  }, [rows, cfg, leaveType]);

  const filterCount = [status, leaveType, !useTimeline && range].filter(Boolean).length;
  const clearFilters = () => { setStatus(undefined); setLeaveType(undefined); setRange(null); };
  const canOpenStaff = canViewTab(user, 'Staff Management', 'staff_list');

  const staffColumn = {
    key: 'staff',
    title: mode === 'page' && cfg.staffAvatar ? 'Staff' : 'Employee Name',
    render: (r) => {
      const id = staffIdOf(r);
      return (
        <StaffCell
          name={staffLabel(r)}
          employeeId={asText(pick(staffOf(r) || r, STAFF_FIELDS.employeeId))}
          avatar={cfg.staffAvatar}
          onClick={id && canOpenStaff ? () => navigate(`/staff/list/${id}`) : undefined}
        />
      );
    },
  };

  const columns = [
    ...(mode === 'page' ? [staffColumn] : []),
    ...cfg.columns,
    {
      key: 'actions',
      title: 'Actions',
      align: 'center',
      width: 80,
      render: (r) => (
        <Dropdown
          trigger={['click']}
          menu={{ items: [{ key: 'view', icon: <EyeOutlined />, label: 'View details' }], onClick: ({ domEvent }) => { domEvent.stopPropagation(); setSelected(r); } }}
        >
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ].map((c) => ({ ...c, render: (_, r) => c.render(r) }));

  const toolbar = (
    <>
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        placeholder={cfg.searchPlaceholder[mode]}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 230, borderRadius: 999 }}
      />
      {useTimeline && (
        <Select
          value={timeline}
          onChange={setTimeline}
          style={{ width: 140 }}
          options={[{ value: 'all', label: cfg.timeline }, ...Object.entries(TIMELINES).map(([value, t]) => ({ value, label: t.label }))]}
        />
      )}
      <FiltersButton count={filterCount} onClear={clearFilters}>
        <FilterField label="Status">
          <Select allowClear placeholder="All statuses" options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ width: '100%' }} />
        </FilterField>
        {cfg.leaveTypeFilter && (
          <FilterField label="Leave Type">
            <Select allowClear placeholder="All leave types" options={leaveTypeOptions} value={leaveType} onChange={setLeaveType} style={{ width: '100%' }} />
          </FilterField>
        )}
        {!useTimeline && (
          <FilterField label="Date Range">
            <RangePicker value={range} onChange={setRange} style={{ width: '100%' }} format="DD MMM YYYY" />
          </FilterField>
        )}
      </FiltersButton>
      {mode === 'page' && cfg.refresh && (
        <Button shape="round" icon={<ReloadOutlined />} loading={isFetching} onClick={refetch}>Refresh</Button>
      )}
    </>
  );

  const table = error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
    <div className="table-responsive">
      <Table
        className="staff-table"
        rowKey={(r, i) => r._id || r.id || i}
        dataSource={rows}
        columns={columns}
        loading={isFetching}
        size="middle"
        onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
        pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
        locale={{ emptyText: <EmptyBlock icon={cfg.icon} text={`No ${cfg.noun} requests found matching filters.`} compact /> }}
      />
    </div>
  );

  // Requests spanning several days (leave) show on every day they cover.
  const byDay = useMemo(() => {
    if (!cfg.calendar) return {};
    const map = {};
    rows.forEach((r) => {
      const [a, b] = cfg.span(r);
      const start = dayjs(a);
      const end = b ? dayjs(b) : start;
      if (!start.isValid()) return;
      for (let d = start.startOf('day'); !d.isAfter(end, 'day') && d.diff(start, 'day') < 62; d = d.add(1, 'day')) {
        (map[d.format('YYYY-MM-DD')] ||= []).push(r);
      }
    });
    return map;
  }, [rows, cfg]);

  const calendar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CalendarHeader month={month} onChange={setMonth} title={cfg.calendarTab} subtitle="Click any request to view its full details." />
      {error ? <LoadError error={error} onRetry={refetch} /> : (
        <CalendarGrid
          month={month}
          renderBadge={(date) => {
            const n = (byDay[date.format('YYYY-MM-DD')] || []).length;
            return n > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#d48806', whiteSpace: 'nowrap' }}>{cfg.badge(n)}</span>;
          }}
          renderCell={(date) => {
            const list = byDay[date.format('YYYY-MM-DD')] || [];
            return (
              <>
                {list.slice(0, 3).map((r, i) => {
                  const color = statusColor(pick(r, STATUS_PATHS));
                  const label = mode === 'page' ? staffLabel(r) : cfg.chip(r);
                  return (
                    <div
                      key={i}
                      onClick={() => setSelected(r)}
                      title={`${label} · ${asText(pick(r, STATUS_PATHS)) || ''}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                        cursor: 'pointer', background: `${color}14`, color, border: `1px solid ${color}40`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {mode === 'page' && <span style={{ fontSize: 9.5, opacity: 0.8 }}>{label[0]}</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    </div>
                  );
                })}
                {list.length > 3 && <Text style={{ fontSize: 10.5, color: s.muted }}>+{list.length - 3} more</Text>}
              </>
            );
          }}
        />
      )}
    </div>
  );

  const detailItems = selected ? [
    ...(mode === 'page' ? [{ key: 'staff', label: 'Staff', children: staffLabel(selected) }] : []),
    ...cfg.columns.map((c) => ({ key: c.key, label: c.title, children: c.render(selected) })),
  ] : [];

  const modal = (
    <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={560} title={<span style={{ textTransform: 'capitalize' }}>{cfg.noun} request</span>}>
      <Descriptions bordered size="small" column={1} items={detailItems} style={{ marginTop: 12 }} />
    </Modal>
  );

  // ── Calendar types (Leave / Permission) ──
  if (cfg.calendar) {
    const listLabel = cfg.listTab[mode];
    const body = (
      <Tabs
        activeKey={view}
        onChange={setView}
        items={[
          {
            key: 'list',
            label: (
              <span><ClockCircleOutlined /> {listLabel}
                <span style={{ marginLeft: 6, padding: '0 7px', borderRadius: 999, fontSize: 11, background: 'rgba(177,30,106,0.12)', color: BRAND }}>{rows.length}</span>
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mode === 'page' && cfg.listHeading && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: s.text }}>{cfg.listHeading}</Text>
                    <Text style={{ fontSize: 12, color: s.muted }}>Showing {rows.length} record{rows.length === 1 ? '' : 's'}</Text>
                  </div>
                )}
                <PanelCard bodyStyle={{ padding: 0 }}>{table}</PanelCard>
              </div>
            ),
          },
          { key: 'calendar', label: <span><CalendarOutlined /> {cfg.calendarTab}</span>, children: calendar },
        ]}
      />
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'page'
          ? <PageHeaderCard title={cfg.pageTitle} subtitle={cfg.pageSubtitle} extra={toolbar} />
          : <PanelTitle icon={cfg.icon} title={cfg.tabTitle} extra={toolbar} />}
        {body}
        {modal}
      </div>
    );
  }

  // ── Table types (Reimbursement / Payslip) ──
  const cardTitle = mode === 'page' ? cfg.cardTitle : cfg.tabTitle;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {mode === 'page' && <PageHeaderCard title={cfg.pageTitle} />}
      <PanelCard bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${s.border}` }}>
          {cardTitle
            ? <PanelTitle icon={mode === 'tab' ? cfg.icon : undefined} title={cardTitle} extra={toolbar} />
            : <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>{toolbar}</div>}
        </div>
        {table}
      </PanelCard>
      {modal}
    </div>
  );
}
