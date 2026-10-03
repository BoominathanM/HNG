// Fine approvals — "Review Fine" for one day, grouped by shift, with each
// staff member's late / early-exit fine breakdown.
// GET /admin/approvals/fine?date=YYYY-MM-DD (flat rows: employeeName,
// employeeId, shiftName, shiftTime, punchIn/Out, late…/early… fine fields,
// fineAmountCurrent, status).
import React, { useMemo, useState } from 'react';
import { Col, DatePicker, Input, Row, Skeleton, Typography } from 'antd';
import { ClockCircleOutlined, MoneyCollectOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../../components/common/PageBreadcrumb';
import { useGetHrApprovalsQuery } from '../../../store/api/apiSlice';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import {
  pick, asText, fmtTime, fmtHrs, fmtMoney, toList, groupByShift, STAFF_FIELDS, staffName, isBlank, BRAND,
} from '../shared/hrUtils';
import { PanelCard, PageHeaderCard, EmptyBlock, LoadError, StatusTag, IconBadge } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

// Each kind's fields are flat: <prefix>ActualHrs ("03:11"),
// <prefix>UpdatedHrsHour / <prefix>UpdatedHrsMin, <prefix>FineOption,
// <prefix>FineAmount.
const FINE_KINDS = [
  { key: 'late', label: 'Late Fine', dot: '#faad14', prefix: 'late' },
  { key: 'early', label: 'Early Exit Fine', dot: '#1677ff', prefix: 'early' },
];

const pad2 = (n) => String(Number(n) || 0).padStart(2, '0');

const fineParts = (r, { prefix }) => {
  const h = r[`${prefix}UpdatedHrsHour`];
  const m = r[`${prefix}UpdatedHrsMin`];
  return {
    actual: r[`${prefix}ActualHrs`],
    updated: h == null && m == null ? undefined : `${pad2(h)}:${pad2(m)}`,
    option: r[`${prefix}FineOption`],
    amount: Number(r[`${prefix}FineAmount`]) || 0,
  };
};

const staffOf = (r) => {
  const ref = pick(r, ['staffId', 'staff', 'employee', 'user']);
  return ref && typeof ref === 'object' ? ref : r;
};

function Box({ children, tone }) {
  const s = useSurface();
  const tint = tone === 'bad' ? '#ff4d4f' : tone === 'good' ? '#52c41a' : null;
  return (
    <div style={{
      padding: '7px 12px', borderRadius: 8, fontSize: 13.5, minHeight: 36,
      background: tint ? `${tint}10` : s.field, border: `1px solid ${tint ? `${tint}55` : s.fieldBorder}`,
      color: tint || s.text, fontWeight: tint ? 600 : 400,
    }}>
      {isBlank(children) ? '—' : children}
    </div>
  );
}

function Labeled({ label, children }) {
  const s = useSurface();
  return (
    <div>
      <Text style={{ fontSize: 12, color: s.muted, display: 'block', marginBottom: 4 }}>{label}</Text>
      {children}
    </div>
  );
}

function FineCard({ record }) {
  const s = useSurface();
  const staff = staffOf(record);
  const parts = FINE_KINDS.map((k) => ({ ...k, ...fineParts(record, k) }));
  const total = Number(pick(record, ['fineAmountCurrent', 'totalFine', 'fineAmount'])) || parts.reduce((t, p) => t + p.amount, 0);
  const punchIn = fmtTime(pick(record, ['punchIn.time', 'punchInTime', 'checkInTime', 'punchIn', 'checkIn']));
  const punchOut = fmtTime(pick(record, ['punchOut.time', 'punchOutTime', 'checkOutTime', 'punchOut', 'checkOut']));

  return (
    <PanelCard bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
        <div>
          <Text strong style={{ color: s.text }}>{staffName(staff)}</Text>
          {asText(pick(staff, STAFF_FIELDS.employeeId)) && (
            <Text style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: s.muted }}>{asText(pick(staff, STAFF_FIELDS.employeeId))}</Text>
          )}
        </div>
        <StatusTag status={pick(record, ['status', 'approvalStatus']) || 'Approval Pending'} />
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={12}><Labeled label="Punch In Time"><Box><ClockCircleOutlined style={{ marginRight: 6 }} />{punchIn || '—'}</Box></Labeled></Col>
          <Col xs={24} md={12}><Labeled label="Punch Out Time"><Box><ClockCircleOutlined style={{ marginRight: 6 }} />{punchOut || '—'}</Box></Labeled></Col>
        </Row>

        <div style={{ border: `1px solid ${s.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: s.head, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconBadge icon={<span style={{ fontWeight: 700 }}>₹</span>} size={22} />
            <Text style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, color: s.muted }}>FINE ADJUSTMENT</Text>
          </div>
          {parts.map((p) => (
            <div key={p.key} style={{ padding: '12px 14px', borderTop: `1px solid ${s.border}` }}>
              <Text strong style={{ fontSize: 13, color: s.text, display: 'block', marginBottom: 8 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: p.dot, marginRight: 6, verticalAlign: 'middle' }} />
                {p.label}
              </Text>
              <Row gutter={[12, 10]}>
                <Col xs={12} md={6}><Labeled label="Actual Hrs"><Box>{fmtHrs(p.actual)}</Box></Labeled></Col>
                <Col xs={12} md={6}><Labeled label="Updated Hrs"><Box>{fmtHrs(p.updated)}</Box></Labeled></Col>
                <Col xs={12} md={6}><Labeled label="Fine Option"><Box>{asText(p.option)}</Box></Labeled></Col>
                <Col xs={12} md={6}><Labeled label="Fine Amount"><Box tone={p.amount > 0 ? 'bad' : 'good'}>{fmtMoney(p.amount)}</Box></Labeled></Col>
              </Row>
            </div>
          ))}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${s.border}`, background: s.head }}>
            <Text strong>Total Fine: <span style={{ color: '#ff4d4f' }}>{fmtMoney(total)}</span></Text>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 16px', borderTop: `1px solid ${s.border}` }}>
        <Text style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, color: s.muted }}>TOTAL FINE: </Text>
        <Text strong style={{ fontSize: 16, color: s.text }}>{fmtMoney(total)}</Text>
      </div>
    </PanelCard>
  );
}

export default function FineApprovals() {
  const s = useSurface();
  const [date, setDate] = useState(() => dayjs());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const day = date.format('YYYY-MM-DD');

  const { data, isFetching, error, refetch } = useGetHrApprovalsQuery({ type: 'fine', date: day });
  // The endpoint only filters by date — search is applied here.
  const rows = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return toList(data).filter((r) => !q || [staffName(staffOf(r)), asText(pick(staffOf(r), STAFF_FIELDS.employeeId))]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data, debouncedSearch]);
  const groups = useMemo(() => groupByShift(rows), [rows]);

  let body;
  if (error) body = <LoadError error={error} onRetry={refetch} />;
  else if (isFetching) body = <PanelCard><Skeleton active paragraph={{ rows: 6 }} /></PanelCard>;
  else if (!groups.length) body = <PanelCard><EmptyBlock icon={<MoneyCollectOutlined />} text="No fines to review for this date." /></PanelCard>;
  else {
    body = groups.map((g) => (
      <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PanelCard bodyStyle={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ color: s.text }}>{g.name}</Text>
              {g.time && <span style={{ padding: '1px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: BRAND, background: 'rgba(177,30,106,0.08)', border: '1px solid rgba(177,30,106,0.25)' }}>{g.time}</span>}
            </div>
            <Text style={{ fontSize: 12, color: s.muted }}>{g.rows.length} staff</Text>
          </div>
        </PanelCard>
        {g.rows.map((r, i) => <FineCard key={r._id || i} record={r} />)}
      </div>
    ));
  }

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Approvals' }, { label: 'Fine' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          title="Review Fine"
          extra={(
            <>
              <Input allowClear prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Search by employee name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220, borderRadius: 999 }} />
              <DatePicker value={date} onChange={(v) => v && setDate(v)} allowClear={false} format="DD MMM YYYY" />
            </>
          )}
        />
        {body}
      </div>
    </div>
  );
}
