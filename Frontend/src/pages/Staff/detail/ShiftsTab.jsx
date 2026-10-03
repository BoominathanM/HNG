// Shifts tab — GET /admin/settings/shift-roster/schedule/{id}?year&month for the
// calendar (data.days keyed by date), GET /admin/settings/shift-roster/active/{id}
// for today's shift.
import React, { useMemo, useState } from 'react';
import { Button, Col, Row, Typography } from 'antd';
import { ReloadOutlined, InfoCircleOutlined, ScheduleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGetHrShiftScheduleQuery, useGetHrActiveShiftQuery } from '../../../store/api/apiSlice';
import { pick, fmtDate, toScheduleDays, scheduleShift, activeShiftOf, isBlank, BRAND } from '../shared/hrUtils';
import { PanelCard, IconBadge, LoadError, CalendarHeader, CalendarGrid } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

const Badge = ({ color, children }) => (
  <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 8px', borderRadius: 6, letterSpacing: 0.4, textTransform: 'uppercase', color, background: `${color}14`, border: `1px solid ${color}40`, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
    {children}
  </span>
);

export default function ShiftsTab({ staffId }) {
  const s = useSurface();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState(() => dayjs());

  const { data, isFetching, error, refetch } = useGetHrShiftScheduleQuery({ staffId, year: month.year(), month: month.month() + 1 });
  const { data: activeRes, refetch: refetchActive } = useGetHrActiveShiftQuery(staffId);

  const byDay = useMemo(() => {
    const map = {};
    toScheduleDays(data).forEach((d) => {
      const date = pick(d, ['date', 'day']);
      if (!isBlank(date)) map[dayjs(date).format('YYYY-MM-DD')] = scheduleShift(d);
    });
    return map;
  }, [data]);
  const loaded = !isFetching && !error && Object.keys(byDay).length > 0;

  const active = activeShiftOf(activeRes);
  const sel = byDay[selected.format('YYYY-MM-DD')];
  const selShift = !sel ? undefined
    : sel.noShift ? 'Not assigned'
    : sel.weekOff ? 'Week Off'
    : sel.holiday ? (sel.holidayName || 'Holiday')
    : sel.name;

  const detailRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: `1px dashed ${s.fieldBorder}` }}>
      <Text style={{ fontSize: 12.5, color: s.muted }}>{label}</Text>
      <Text strong style={{ fontSize: 12.5, color: s.text, textAlign: 'right', textTransform: 'capitalize' }}>{isBlank(value) ? '—' : value}</Text>
    </div>
  );

  return (
    <Row gutter={[14, 14]}>
      <Col xs={24} lg={16}>
        <CalendarHeader month={month} onChange={setMonth} title="Shift Calendar" subtitle="Click any date to view its shift assignment." showToday={false} />
      </Col>
      <Col xs={24} lg={8}>
        <PanelCard bodyStyle={{ padding: '12px 16px' }} style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconBadge icon={<ScheduleOutlined />} size={38} soft />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 1, color: s.muted }}>ACTIVE SHIFT TODAY</Text>
                {active?.source && <Badge color="#d48806">{active.source}</Badge>}
              </div>
              <Text strong style={{ fontSize: 15, color: s.text, display: 'block', textTransform: 'capitalize' }}>{active?.name || 'No active shift'}</Text>
              {active?.time && <Text style={{ fontSize: 12, color: s.muted }}>{active.time}</Text>}
            </div>
          </div>
        </PanelCard>
      </Col>

      <Col xs={24} lg={17}>
        {error ? <LoadError error={error} onRetry={refetch} /> : (
          <CalendarGrid
            month={month}
            selectedDate={selected}
            onSelect={setSelected}
            renderBadge={(date) => byDay[date.format('YYYY-MM-DD')]?.override && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fa8c16' }} title="Overridden" />}
            renderCell={(date) => {
              const d = byDay[date.format('YYYY-MM-DD')];
              if (!loaded) return null;
              if (!d || d.noShift) return <Badge color="#d48806">No shift</Badge>;
              if (d.weekOff) return <Badge color="#8c8c8c">Off</Badge>;
              if (d.holiday) return <Badge color="#722ed1">{d.holidayName || 'Holiday'}</Badge>;
              return (
                <>
                  <Text style={{ fontSize: 11.5, fontWeight: 600, color: BRAND, lineHeight: 1.2, textTransform: 'capitalize' }}>{d.name}</Text>
                  {d.time && <Text style={{ fontSize: 10.5, color: s.muted, lineHeight: 1.2 }}>{d.time}</Text>}
                </>
              );
            }}
          />
        )}
      </Col>

      <Col xs={24} lg={7}>
        <PanelCard bodyStyle={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <IconBadge icon={<InfoCircleOutlined />} size={26} soft />
            <Text strong style={{ color: s.text }}>Day Details</Text>
          </div>
          <Text style={{ fontSize: 12, color: s.muted }}>Date</Text>
          <Text strong style={{ display: 'block', fontSize: 14.5, color: s.text, marginBottom: 10 }}>{selected.format('dddd, MMMM D, YYYY')}</Text>
          <div style={{ border: `1px solid ${s.fieldBorder}`, borderRadius: 10, padding: '4px 12px', marginBottom: 12, background: s.field }}>
            {detailRow('Shift', selShift)}
            {detailRow(<><ClockCircleOutlined /> Time</>, sel?.time)}
            {detailRow('Source', sel?.override ? 'Override' : sel?.source !== 'none' ? sel?.source : undefined)}
            {detailRow('From', fmtDate(sel?.from))}
          </div>
          <Button block icon={<ReloadOutlined />} loading={isFetching} onClick={() => { refetch(); refetchActive(); }}>
            Refresh
          </Button>
        </PanelCard>
      </Col>
    </Row>
  );
}
