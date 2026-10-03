// Employee Attendance — every staff member's attendance for one day
// (GET /admin/staff/attendance/all-staff?date=YYYY-MM-DD).
import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Skeleton, Typography } from 'antd';
import {
  LeftOutlined, RightOutlined, SearchOutlined, UserOutlined, UserDeleteOutlined, LoginOutlined,
  LogoutOutlined, ClockCircleOutlined, CalendarOutlined, ExclamationCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetHrAllStaffAttendanceQuery } from '../../store/api/apiSlice';
import { pick, asText, toList, STAFF_FIELDS, staffName } from './shared/hrUtils';
import { buildDay, norm } from './shared/attendanceUtils';
import { PanelCard, PageHeaderCard, StatPill, PillTabs, EmptyBlock, LoadError } from './shared/StaffUi';
import AttendanceRow from './shared/AttendanceRow';
import useSurface from './shared/useSurface';

const { Text } = Typography;

// Status-based counts; late arrivals are "Late" in EktaHR but still present.
// Punched In / Out count actual punches (a half-day leave can have one).
const is = {
  present: (d) => /^(present|late|on time)$/.test(norm(d.status)),
  halfDay: (d) => /^half ?day$/.test(norm(d.status)),
  absent: (d) => /absent/.test(norm(d.status)),
  leave: (d) => /leave/.test(norm(d.status)),
  holiday: (d) => /holiday/.test(norm(d.status)),
  weekOff: (d) => /week ?off/.test(norm(d.status)),
  pending: (d) => d.approvalPending,
};

const STATS = [
  { key: 'present', label: 'Present', icon: <UserOutlined />, color: '#52c41a', test: is.present },
  { key: 'absent', label: 'Absent', icon: <UserDeleteOutlined />, color: '#ff4d4f', test: is.absent },
  { key: 'punchedIn', label: 'Punched In', icon: <LoginOutlined />, test: (d) => !!d.punchIn },
  { key: 'punchedOut', label: 'Punched Out', icon: <LogoutOutlined />, test: (d) => !!d.punchOut },
  { key: 'leave', label: 'On Leave', icon: <ClockCircleOutlined />, test: is.leave },
  { key: 'holiday', label: 'Holiday', icon: <CalendarOutlined />, test: is.holiday },
  { key: 'notMarked', label: 'Not Marked', icon: <UserOutlined />, test: (d) => !d.punchIn && !is.present(d) && !is.halfDay(d) && !is.leave(d) && !is.holiday(d) && !is.weekOff(d) },
  { key: 'pending', label: 'Pending', icon: <ExclamationCircleOutlined />, test: is.pending },
];

const TABS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'pending', label: 'Pending', test: is.pending },
  { key: 'present', label: 'Present', test: is.present },
  { key: 'halfDay', label: 'Half Day', test: is.halfDay },
  { key: 'absent', label: 'Absent', test: is.absent },
  { key: 'leave', label: 'On Leave', test: is.leave },
  { key: 'holiday', label: 'Holiday', test: is.holiday },
];

const staffOf = (r) => {
  const ref = pick(r, ['staffId', 'staff', 'employee', 'user']);
  return ref && typeof ref === 'object' ? ref : r;
};

export default function Attendance() {
  const s = useSurface();
  const [date, setDate] = useState(() => dayjs());
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { data, isFetching, error, refetch } = useGetHrAllStaffAttendanceQuery(date.format('YYYY-MM-DD'));
  const records = useMemo(() => toList(data), [data]);

  const days = useMemo(() => records.map((r) => {
    const staff = staffOf(r);
    return {
      ...buildDay(date, r),
      staffName: staffName(staff),
      employeeId: asText(pick(staff, STAFF_FIELDS.employeeId)),
      department: asText(pick(staff, STAFF_FIELDS.department)),
    };
  }), [records, date]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const test = TABS.find((t) => t.key === tab).test;
    return days.filter((d) => test(d)
      && (!q || [d.staffName, d.employeeId, d.department].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [days, tab, search]);

  const isToday = date.isSame(dayjs(), 'day');

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Attendance' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          title="Employee Attendance"
          extra={(
            <>
              <Button shape="circle" icon={<LeftOutlined />} onClick={() => setDate(date.subtract(1, 'day'))} />
              <DatePicker
                value={date}
                onChange={(v) => v && setDate(v)}
                allowClear={false}
                format="MMMM D, YYYY"
                disabledDate={(d) => d.isAfter(dayjs(), 'day')}
                style={{ borderRadius: 999 }}
              />
              <Button shape="circle" icon={<RightOutlined />} disabled={isToday} onClick={() => setDate(date.add(1, 'day'))} />
            </>
          )}
        />

        <PanelCard bodyStyle={{ padding: 16 }}>
          <Text strong style={{ fontSize: 14, color: s.text, display: 'block', marginBottom: 10 }}>Statistics</Text>
          <div className="staff-stat-pills">
            {STATS.map((st) => (
              <StatPill key={st.key} icon={st.icon} label={st.label} value={days.filter(st.test).length} color={st.color} />
            ))}
          </div>
        </PanelCard>

        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: `1px solid ${s.border}` }}>
            <PillTabs
              value={tab}
              onChange={setTab}
              items={TABS.map((t) => ({ key: t.key, label: t.label, count: days.filter(t.test).length }))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                placeholder="Search employee attendance..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280, maxWidth: '100%', borderRadius: 999 }}
              />
              <Button shape="circle" icon={<ReloadOutlined />} loading={isFetching} onClick={refetch} title="Refresh" />
            </div>
          </div>
          {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div>
          : isFetching && !records.length ? <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
          : visible.length ? visible.map((d, i) => (
            <AttendanceRow
              key={`${d.employeeId || d.staffName}-${i}`}
              day={d}
              staff={(
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text strong style={{ color: s.text }}>{d.staffName}</Text>
                  {d.department && (
                    <span style={{ padding: '0 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', background: s.field, border: `1px solid ${s.fieldBorder}`, color: s.muted }}>
                      {d.department}
                    </span>
                  )}
                </div>
              )}
            />
          )) : (
            <EmptyBlock icon={<CalendarOutlined />} text={`No attendance records for ${date.format('MMMM D, YYYY')}.`} />
          )}
        </PanelCard>
      </div>
    </div>
  );
}
