// Salary Overview tab — one row per month since joining; "View Breakdown"
// loads GET /admin/staff/overview/detail/{id}?month=<Month YYYY> for that month.
import React, { useMemo, useState } from 'react';
import { Modal, Skeleton, Typography } from 'antd';
import { FileTextOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGetHrSalaryOverviewQuery } from '../../../store/api/apiSlice';
import { asText, fmtMoney, toRecord, isBlank, BRAND } from '../shared/hrUtils';
import { PanelCard, IconBadge, EmptyBlock, LoadError, ObjectDetails, StatusTag } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

// overview/detail rows: earningsBreakdown[{ label, fixed, earned }],
// deductionsBreakdown[{ label, value }], gross / deductions / net, day counts.
const DAY_STATS = [
  { label: 'Payable Days', key: 'payableDays' },
  { label: 'Present', key: 'presentDays' },
  { label: 'Half Days', key: 'halfDays' },
  { label: 'Absent', key: 'absentDays' },
  { label: 'Leaves', key: 'leaves' },
  { label: 'Hours Worked', key: 'hoursWorked' },
  { label: 'OT', key: 'otHours' },
  { label: 'Fine Hours', key: 'totalFineHours' },
];

function Breakdown({ staffId, month }) {
  const s = useSurface();
  const { data, isFetching, error, refetch } = useGetHrSalaryOverviewQuery({ staffId, month });
  if (isFetching) return <Skeleton active paragraph={{ rows: 8 }} />;
  // EktaHR answers 404 "No Salary Structure" for staff without one.
  if (error?.status === 404) return <EmptyBlock icon={<FileTextOutlined />} text={typeof error.data === 'string' ? error.data : 'No salary breakdown for this month.'} compact />;
  if (error) return <LoadError error={error} onRetry={refetch} />;
  const rec = toRecord(data) || {};
  const earnings = Array.isArray(rec.earningsBreakdown) ? rec.earningsBreakdown : [];
  const deductions = Array.isArray(rec.deductionsBreakdown) ? rec.deductionsBreakdown : [];
  if (!earnings.length && !deductions.length) return <ObjectDetails data={rec} emptyText="No salary breakdown for this month." />;

  const stats = DAY_STATS.map((d) => ({ ...d, value: asText(rec[d.key]) })).filter((d) => !isBlank(d.value));
  const cell = { padding: '8px 12px', borderBottom: `1px solid ${s.border}`, fontSize: 13, color: s.text };
  const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };
  const head = { ...cell, fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: s.muted, background: s.head };
  const total = { fontWeight: 700, background: s.field };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 12.5, color: s.muted }}>{asText(rec.duration)}</Text>
        <StatusTag status={rec.status} />
      </div>
      {stats.length > 0 && (
        <div className="staff-overview-stats" style={{ border: `1px solid ${s.border}`, borderRadius: 10 }}>
          {stats.map((d) => (
            <div key={d.label} style={{ padding: '8px 6px', textAlign: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: s.muted, display: 'block' }}>{d.label.toUpperCase()}</Text>
              <Text strong style={{ fontSize: 15, color: s.text }}>{d.value}</Text>
            </div>
          ))}
        </div>
      )}
      <div className="table-responsive" style={{ border: `1px solid ${s.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
          <thead>
            <tr><th style={{ ...head, textAlign: 'left' }}>EARNINGS</th><th style={{ ...head, textAlign: 'right' }}>FIXED</th><th style={{ ...head, textAlign: 'right' }}>EARNED</th></tr>
          </thead>
          <tbody>
            {earnings.map((l, i) => (
              <tr key={l._id || i}><td style={cell}>{asText(l.label)}</td><td style={num}>{fmtMoney(l.fixed) || '—'}</td><td style={num}>{fmtMoney(l.earned) || '—'}</td></tr>
            ))}
            <tr><td style={{ ...cell, ...total }}>Gross Earned</td><td style={{ ...num, ...total }} /><td style={{ ...num, ...total }}>{fmtMoney(rec.gross)}</td></tr>
            {deductions.length > 0 && <tr><th colSpan={3} style={{ ...head, textAlign: 'left' }}>DEDUCTIONS</th></tr>}
            {deductions.map((l, i) => (
              <tr key={l._id || i}><td style={cell}>{asText(l.label)}</td><td style={num} /><td style={num}>{fmtMoney(l.value) || '—'}</td></tr>
            ))}
            <tr><td style={{ ...cell, ...total }}>Total Deductions</td><td style={{ ...num, ...total }} /><td style={{ ...num, ...total }}>{fmtMoney(rec.deductions)}</td></tr>
            <tr style={{ background: 'rgba(177,30,106,0.05)' }}>
              <td style={{ ...cell, fontWeight: 700, borderBottom: 'none' }}>Net Pay</td>
              <td style={{ ...num, borderBottom: 'none' }} />
              <td style={{ ...num, fontWeight: 700, color: BRAND, borderBottom: 'none' }}>{fmtMoney(rec.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SalaryOverviewTab({ staffId, staff }) {
  const s = useSurface();
  const [selected, setSelected] = useState(null);

  // Months from the joining month up to the current month, newest first.
  const months = useMemo(() => {
    const now = dayjs().startOf('month');
    const join = staff.joiningDate ? dayjs(staff.joiningDate) : null;
    const start = join?.isValid() ? join.startOf('month') : now.startOf('year');
    const out = [];
    for (let m = now; !m.isBefore(start, 'month') && out.length < 120; m = m.subtract(1, 'month')) out.push(m);
    return out;
  }, [staff.joiningDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1px solid ${s.border}` }}>
        <Text strong style={{ fontSize: 15, color: s.text }}>Salary History</Text>
        <Text style={{ fontSize: 12, color: s.muted }}>Showing {months.length} record{months.length === 1 ? '' : 's'}</Text>
      </div>

      {months.length === 0 ? (
        <PanelCard><EmptyBlock icon={<FileTextOutlined />} text="No salary months yet — the joining date is in the future." /></PanelCard>
      ) : months.map((m) => (
        <PanelCard key={m.format('YYYY-MM')} bodyStyle={{ padding: '12px 16px' }}>
          <div
            onClick={() => setSelected(m)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconBadge icon={<FileTextOutlined />} size={34} soft />
              <div>
                <Text strong style={{ fontSize: 14.5, color: s.text, display: 'block' }}>{m.format('MMMM YYYY')}</Text>
                <Text style={{ fontSize: 12, color: s.muted }}>
                  Duration: {m.startOf('month').format('DD MMMM YYYY')} - {m.endOf('month').format('DD MMMM YYYY')}
                </Text>
              </div>
            </div>
            <Text style={{ color: BRAND, fontWeight: 600, fontSize: 13 }}>View Breakdown <ArrowRightOutlined /></Text>
          </div>
        </PanelCard>
      ))}

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={640}
        destroyOnHidden
        title={selected ? `Salary Breakdown · ${selected.format('MMMM YYYY')}` : ''}
      >
        {selected && (
          <div style={{ marginTop: 12 }}>
            <Breakdown staffId={staffId} month={selected.format('MMMM YYYY')} />
          </div>
        )}
      </Modal>
    </div>
  );
}
