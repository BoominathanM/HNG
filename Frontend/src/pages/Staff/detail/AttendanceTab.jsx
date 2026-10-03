// Attendances tab. Main data: GET /admin/staff/attendance/staff/{id}?year&month,
// merged with the month's shift roster (calendar days + assigned shifts) and the
// active shift. Fine / Overtime / Leave popups load only when a chip is clicked.
import React, { useMemo, useState } from 'react';
import { DatePicker, Descriptions, Modal, Segmented, Skeleton, Table, Typography } from 'antd';
import { CalendarOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useGetHrAttendanceQuery, useGetHrShiftScheduleQuery, useGetHrActiveShiftQuery,
  useGetHrAttendanceFineQuery, useGetHrAttendanceOvertimeQuery, useGetHrLeaveBalancesQuery,
} from '../../../store/api/apiSlice';
import {
  pick, asText, fmtMoney, fmtHrs, toList, toRecord, toScheduleDays, activeShiftOf, statusColor, isBlank, BRAND,
} from '../shared/hrUtils';
import { PanelCard, EmptyBlock, LoadError, CalendarGrid, ObjectDetails } from '../shared/StaffUi';
import AttendanceRow from '../shared/AttendanceRow';
import { CODES, DATE_PATHS, buildDay, dayKey, isLit, norm } from '../shared/attendanceUtils';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

// Month totals sit beside data.attendances (presentCount, absentCount, …);
// totalPayableDays is the month's working days.
const STATS = [
  { key: 'workingDays', label: 'Working Days', paths: ['totalPayableDays', 'workingDays', 'totalWorkingDays'] },
  { key: 'payableDays', label: 'Payable Days', paths: ['payableDays'], dot: '#faad14' },
  { key: 'present', label: 'Present', paths: ['presentCount', 'presentDays'], dot: '#52c41a', code: 'P' },
  { key: 'halfDay', label: 'Half Day', paths: ['halfDayCount', 'halfDays'], dot: '#fa8c16', code: 'HD' },
  { key: 'leaves', label: 'Total Leaves', paths: ['leaveCount', 'totalLeaves'], dot: '#1677ff', code: 'L', balances: true },
  { key: 'holiday', label: 'Holiday', paths: ['holidayCount', 'holidays'], dot: '#722ed1', code: 'H' },
  { key: 'absent', label: 'Absent', paths: ['absentCount', 'absentDays'], dot: '#ff4d4f', code: 'A' },
  { key: 'weekOff', label: 'Weekly Off', paths: ['weeklyOffCount', 'weekOffs'], dot: '#8c8c8c', code: 'WO' },
];

function LeaveBalances({ staffId }) {
  const { data, isFetching, error, refetch } = useGetHrLeaveBalancesQuery(staffId);
  if (isFetching) return <Skeleton active />;
  if (error) return <LoadError error={error} onRetry={refetch} />;
  const rows = toList(data);
  if (!rows.length) return <ObjectDetails data={toRecord(data)} emptyText="No leave balances found." />;
  return (
    <Table
      size="small"
      pagination={false}
      rowKey={(r, i) => r._id || i}
      dataSource={rows}
      columns={[
        { title: 'Leave Type', render: (_, r) => <span style={{ textTransform: 'capitalize' }}>{asText(pick(r, ['leaveTypeName', 'leaveType', 'name', 'type'])) || '—'}</span> },
        { title: 'Allowed', align: 'center', render: (_, r) => asText(pick(r, ['allowed', 'total', 'totalLeaves', 'entitled', 'allocated'])) ?? '—' },
        { title: 'Used', align: 'center', render: (_, r) => asText(pick(r, ['used', 'taken', 'availed', 'usedLeaves'])) ?? '—' },
        { title: 'Carry Forward', align: 'center', render: (_, r) => asText(pick(r, ['carryForward'])) ?? '—' },
        { title: 'Balance', align: 'center', render: (_, r) => <b>{asText(pick(r, ['balance', 'remaining', 'available', 'balanceLeaves'])) ?? '—'}</b> },
      ]}
    />
  );
}

const hm = (o) => (o && (o.hours != null || o.minutes != null) ? `${o.hours || 0}h ${o.minutes || 0}m` : undefined);

// Curated rows for the day popups (the raw payloads are mostly calculation
// internals such as per-minute salary).
const FINE_ROWS = (d) => {
  const fa = d.fineAdjustment || {};
  return [
    ['Shift', [d.shiftStartTime, d.shiftEndTime].filter(Boolean).join(' – ')],
    ['Check In / Out', [d.checkInTime, d.checkOutTime].filter(Boolean).join(' – ')],
    ['Grace Period', d.gracePeriodMinutes != null ? `${d.gracePeriodMinutes} min` : undefined],
    ['Late By', fmtHrs(fa.lateFine?.actualHours ?? d.lateActualHours)],
    ['Late Fine', fmtMoney(fa.lateFine?.amount ?? d.fineAmount)],
    ['Early Exit By', fmtHrs(fa.earlyExitFine?.actualHours ?? d.earlyExitActualHours)],
    ['Early Exit Fine', fmtMoney(fa.earlyExitFine?.amount ?? d.earlyExitFineAmount)],
    ['Break Fine', fa.breakFine?.amount ? fmtMoney(fa.breakFine.amount) : undefined],
    ['Calculation', asText(fa.lateFine?.option)],
    ['Total Fine', fa.totalFine != null ? <b key="t" style={{ color: '#ff4d4f' }}>{fmtMoney(fa.totalFine)}</b> : undefined],
    ['Status', asText(fa.status)],
  ];
};
const OVERTIME_ROWS = (d) => {
  const oa = d.overtimeAdjustment || {};
  return [
    ['Actual Overtime', asText(d.actualOvertimeHoursStr)],
    ['Updated Overtime', hm(oa.updatedOvertime)],
    ['Hourly Rate', fmtMoney(d.hourlyBaseRate)],
    ['Calculation', asText(oa.option)],
    ['Overtime Amount', fmtMoney(oa.amount)],
    ['Status', asText(oa.status)],
  ];
};

function DayDetail({ staffId, kind, date }) {
  const fine = useGetHrAttendanceFineQuery({ staffId, date }, { skip: kind !== 'fine' });
  const ot = useGetHrAttendanceOvertimeQuery({ staffId, date }, { skip: kind !== 'overtime' });
  if (kind === 'leave') return <LeaveBalances staffId={staffId} />;
  const q = kind === 'fine' ? fine : ot;
  if (q.isFetching) return <Skeleton active />;
  if (q.error) return <LoadError error={q.error} onRetry={q.refetch} />;
  const rec = toRecord(q.data) || {};
  const items = (kind === 'fine' ? FINE_ROWS(rec) : OVERTIME_ROWS(rec))
    .filter(([, v]) => !isBlank(v))
    .map(([label, children]) => ({ key: label, label, children }));
  if (!items.length) return <ObjectDetails data={rec} emptyText={`No ${kind} details for this day.`} />;
  return <Descriptions bordered size="small" column={1} items={items} />;
}

export default function AttendanceTab({ staffId }) {
  const s = useSurface();
  const [period, setPeriod] = useState(() => dayjs().startOf('month'));
  const [view, setView] = useState('List');
  const [popup, setPopup] = useState(null); // { kind, date }

  const args = { staffId, year: period.year(), month: period.month() + 1 };
  const { data: attRes, isFetching, error, refetch } = useGetHrAttendanceQuery(args);
  const { data: schedRes } = useGetHrShiftScheduleQuery(args);
  const { data: shiftRes } = useGetHrActiveShiftQuery(staffId);

  const activeShift = activeShiftOf(shiftRes);
  const shiftLabel = [activeShift?.name, activeShift?.time].filter(Boolean).join(' · ');

  const days = useMemo(() => {
    const recs = {};
    toList(attRes).forEach((r) => { const k = dayKey(pick(r, DATE_PATHS)); if (k) recs[k] = r; });
    const sched = {};
    toScheduleDays(schedRes).forEach((d) => { const k = dayKey(pick(d, DATE_PATHS)); if (k) sched[k] = d; });
    // Only days up to today — future days have nothing to show yet.
    const today = dayjs();
    const last = period.endOf('month').isAfter(today) ? today : period.endOf('month');
    const out = [];
    for (let d = period.startOf('month'); !d.isAfter(last, 'day'); d = d.add(1, 'day')) {
      const k = d.format('YYYY-MM-DD');
      out.push(buildDay(d, recs[k], sched[k]));
    }
    return out;
  }, [attRes, schedRes, period]);

  const byKey = useMemo(() => Object.fromEntries(days.map((d) => [d.key, d])), [days]);

  // Prefer the API's own month totals; otherwise count the day rows.
  const summary = pick(toRecord(attRes), ['summary', 'stats', 'counts', 'totals']) || toRecord(attRes);
  const statValue = (st) => {
    const v = pick(summary, st.paths);
    if (!isBlank(v)) return asText(v);
    if (!st.code || error) return '—';
    const c = CODES.find((x) => x.code === st.code);
    return days.filter((d) => (c ? isLit(c, d) : norm(d.status) === 'holiday')).length;
  };

  const popupTitle = popup && {
    fine: 'Fine Details', overtime: 'Overtime Details', leave: 'Leave Balance',
  }[popup.kind];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelCard bodyStyle={{ padding: 0 }}>
        <div className="staff-att-stats" style={{ borderBottom: `1px solid ${s.border}` }}>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${s.fieldBorder}`, borderRadius: 10, padding: '4px 10px' }}>
              <CalendarOutlined style={{ color: BRAND }} />
              <div>
                <Text style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: s.muted, display: 'block', lineHeight: 1 }}>PERIOD</Text>
                <DatePicker
                  picker="month"
                  variant="borderless"
                  allowClear={false}
                  value={period}
                  onChange={(v) => v && setPeriod(v.startOf('month'))}
                  format="MMM YYYY"
                  suffixIcon={<DownOutlined style={{ fontSize: 10 }} />}
                  style={{ padding: 0, width: 96, fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
          {STATS.map((st) => (
            <div
              key={st.key}
              onClick={st.balances ? () => setPopup({ kind: 'leave' }) : undefined}
              style={{ padding: '10px 8px', textAlign: 'center', borderLeft: `1px solid ${s.border}`, cursor: st.balances ? 'pointer' : 'default' }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, color: s.muted, display: 'block', whiteSpace: 'nowrap' }}>
                {st.dot && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: st.dot, marginRight: 4, verticalAlign: 'middle' }} />}
                {st.label.toUpperCase()}
                {st.balances && <DownOutlined style={{ fontSize: 8, marginLeft: 3 }} />}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 700, color: st.dot || s.text }}>{isFetching ? '…' : statValue(st)}</Text>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: s.head }}>
          <Text style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.6, color: s.muted }}>
            ASSIGNED SHIFT {shiftLabel ? shiftLabel.toUpperCase() : '— NOT ASSIGNED'}
          </Text>
          <Segmented size="small" options={['List', 'Calendar']} value={view} onChange={setView} />
        </div>

        {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div>
          : isFetching ? <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
          : view === 'List' ? (
            days.length
              ? [...days].reverse().map((d) => <AttendanceRow key={d.key} day={d} onOpen={(kind, date) => setPopup({ kind, date })} />)
              : <EmptyBlock icon={<CalendarOutlined />} text="No attendance for this period yet." />
          ) : null}
      </PanelCard>

      {!error && !isFetching && view === 'Calendar' && (
        <CalendarGrid
          month={period}
          renderCell={(date) => {
            const d = byKey[date.format('YYYY-MM-DD')];
            if (!d?.status) return null;
            const color = statusColor(d.status);
            return (
              <>
                <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: `${color}18`, color, alignSelf: 'flex-start', textTransform: 'uppercase' }}>
                  {asText(d.status)}
                </span>
                {d.punchIn && <Text style={{ fontSize: 11, color: s.muted }}>{d.punchIn}{d.punchOut ? ` – ${d.punchOut}` : ''}</Text>}
                {d.fine > 0 && <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Fine {fmtMoney(d.fine)}</Text>}
              </>
            );
          }}
        />
      )}

      <Modal open={!!popup} onCancel={() => setPopup(null)} footer={null} width={520} title={popupTitle} destroyOnHidden>
        {popup && (
          <div style={{ marginTop: 12 }}>
            {popup.date && <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>{dayjs(popup.date).format('dddd, MMM D, YYYY')}</Text>}
            <DayDetail staffId={staffId} kind={popup.kind} date={popup.date} />
          </div>
        )}
      </Modal>
    </div>
  );
}
