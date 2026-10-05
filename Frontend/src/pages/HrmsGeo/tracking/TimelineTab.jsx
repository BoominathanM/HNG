// Tracking → Timeline: one staff member's day — punches, travel segments and
// tasks (GET /admin/hrms-geo/tracking/timeline/{staffId}?date=). Only staff with
// timeline tracking enabled (per the tracking summary) can be selected.
import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Row, Select, Skeleton, Typography } from 'antd';
import {
  ReloadOutlined, CalendarOutlined, LoginOutlined, LogoutOutlined, EnvironmentOutlined, CarOutlined, ClockCircleOutlined,
  ExportOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useGetGeoTrackingSummaryQuery, useGetGeoTimelineQuery } from '../../../store/api/apiSlice';
import { asText, toList } from '../../Staff/shared/hrUtils';
import { PanelCard, StatusTag, EmptyBlock, LoadError } from '../../Staff/shared/StaffUi';
import useSurface from '../../Staff/shared/useSurface';
import GeoMap, { MapLegend } from '../shared/GeoMap';
import LocationRecords from '../shared/LocationRecords';
import { latLng, fmtLatLng, mapsLink, geoInitials, kmText, isoAt, durationText } from '../shared/geoUtils';

const { Text } = Typography;

const TASK_COLORS = ['#2F6FE0', '#B11E6A', '#13a8a8', '#d48806', '#722ed1', '#389e0d'];
const EVENT_META = {
  punch_in: { icon: <LoginOutlined />, color: '#52c41a', label: 'Punched in' },
  punch_out: { icon: <LogoutOutlined />, color: '#ff4d4f', label: 'Punched out' },
};
const ptsOf = (list) => (list || []).map(latLng).filter(Boolean);

function Place({ title, loc, time, s }) {
  const pos = latLng(loc);
  return (
    <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(250,173,20,0.06)', border: '1px solid rgba(250,173,20,0.25)' }}>
      <Text strong style={{ display: 'block', fontSize: 12.5, color: s.text }}><EnvironmentOutlined style={{ color: '#2F6FE0' }} /> {title}</Text>
      <Text style={{ fontSize: 11.5, color: s.muted }}>
        {pos && <>Lat, Lng: <span style={{ fontFamily: 'monospace' }}>{fmtLatLng(pos)}</span></>}
        {time && <> · <ClockCircleOutlined /> {time}</>}
        {pos && <> · <a href={mapsLink(pos)} target="_blank" rel="noreferrer">Google Maps <ExportOutlined /></a></>}
      </Text>
      {loc?.address && <Text style={{ display: 'block', fontSize: 11.5, color: s.muted }}><EnvironmentOutlined style={{ color: '#d48806' }} /> {loc.address}</Text>}
    </div>
  );
}

export default function TimelineTab() {
  const s = useSurface();
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState(() => dayjs());
  const [focus, setFocus] = useState(null);
  const [fitKey, setFitKey] = useState(0);

  const { data: summaryRes } = useGetGeoTrackingSummaryQuery();
  const staffList = useMemo(() => toList(summaryRes), [summaryRes]);
  const staffId = params.get('staff') || staffList.find((x) => x.timelineTracking)?._id;
  const day = date.format('YYYY-MM-DD');

  const { data, isFetching, error, refetch } = useGetGeoTimelineQuery({ staffId, date: day }, { skip: !staffId });
  // Not toRecord(): that unwraps a nested `staff` key, and this payload has one.
  const tl = data?.data || {};
  const staff = tl.staff || staffList.find((x) => x._id === staffId);
  const tasks = useMemo(() => tl.tasks || [], [tl.tasks]);
  const events = useMemo(() => tl.activity?.events || [], [tl.activity]);
  const segments = useMemo(() => tl.activity?.segments || [], [tl.activity]);

  const setStaff = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set('staff', id); return n; }, { replace: true });

  // Chronological items: punch events, travel segments, tasks.
  const items = useMemo(() => {
    const at = (time) => dayjs(`${day} ${time}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm']).valueOf();
    return [
      ...events.filter((e) => EVENT_META[e.type]).map((e) => ({ kind: 'event', ts: new Date(e.at).getTime(), e })),
      ...segments.map((g, i) => ({ kind: 'segment', ts: new Date(g.startAt).getTime(), g, i })),
      ...tasks.map((t, i) => ({ kind: 'task', ts: at(t.startTime) || i, t, n: i + 1 })),
    ].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }, [events, segments, tasks, day]);

  const { markers, lines } = useMemo(() => {
    const m = [];
    const l = [];
    events.forEach((e, i) => {
      const meta = EVENT_META[e.type];
      const pos = latLng(e);
      if (meta && pos) m.push({ id: `e${i}`, pos, label: e.type === 'punch_in' ? 'IN' : 'OUT', color: meta.color, title: `${meta.label} ${dayjs(e.at).format('hh:mm A')}`, size: 30 });
    });
    segments.forEach((g, i) => l.push({ id: `g${i}`, points: ptsOf(g.points), color: '#1a1a2e' }));
    tasks.forEach((t, i) => {
      const color = TASK_COLORS[i % TASK_COLORS.length];
      const a = latLng(t.startLocation);
      const b = latLng(t.endLocation);
      if (a) m.push({ id: `s${i}`, pos: a, label: `${i + 1}`, color, title: `Task ${i + 1} start · ${t.startTime || ''}` });
      if (b) m.push({ id: `x${i}`, pos: b, label: `${i + 1}`, color: '#1a1a2e', title: `Task ${i + 1} end · ${t.endTime || ''}` });
      l.push({ id: `t${i}`, points: [a, ...ptsOf(t.trackingPoints), b].filter(Boolean), color, weight: 4 });
    });
    const last = latLng(tl.activity?.lastPoint);
    if (last) m.push({ id: 'last', pos: last, label: geoInitials(staff?.name), color: '#B11E6A', title: 'Last location', z: 500 });
    if (focus) m.push({ id: 'focus', pos: focus, label: '•', color: '#faad14', size: 18, z: 1000, title: 'Selected location record' });
    return { markers: m, lines: l };
  }, [events, segments, tasks, tl.activity, staff?.name, focus]);

  const enabledOptions = staffList.map((x) => ({
    value: x._id,
    label: `${x.name} (${x.id})${x.timelineTracking ? '' : ' · timeline off'}`,
    disabled: !x.timelineTracking,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelCard bodyStyle={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text strong style={{ color: s.text }}>Timeline</Text>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select staff with timeline tracking"
              value={staffId}
              onChange={(id) => { setStaff(id); setFocus(null); }}
              options={enabledOptions}
              style={{ width: 280 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <DatePicker value={date} onChange={(v) => { if (v) { setDate(v); setFocus(null); } }} allowClear={false} format="[Date: ]YYYY-MM-DD" suffixIcon={<CalendarOutlined />} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
            <Button shape="round" icon={<ReloadOutlined />} loading={isFetching} onClick={refetch} disabled={!staffId}>Refresh</Button>
          </div>
        </div>
      </PanelCard>

      {!staffId ? (
        <PanelCard><EmptyBlock icon={<FieldTimeOutlined />} text="No staff have timeline tracking enabled." /></PanelCard>
      ) : error ? <LoadError error={error} onRetry={refetch} /> : (
        <>
          {staff && (
            <PanelCard bodyStyle={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', background: '#d48806' }}>{geoInitials(staff.name)}</span>
                  <div>
                    <Text strong style={{ color: s.text }}>{staff.name} <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: s.muted }}>({staff.employeeId || staff.id})</span></Text>
                    <Text style={{ display: 'block', fontSize: 12, color: s.muted }}>Mode: <b>{staff.type || '—'}</b>{staff.email ? ` • ${staff.email}` : ''}</Text>
                  </div>
                </div>
                {tl.activeTask && <StatusTag status="Active task in progress" />}
              </div>
            </PanelCard>
          )}

          <Row gutter={[14, 14]}>
            <Col xs={24} lg={13}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: s.muted }}>{day} ACTIVITY TIMELINE</Text>
                <Text style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: '#d48806' }}>
                  {tasks.length} TASK{tasks.length === 1 ? '' : 'S'} • {kmText(tl.activity?.totalKm ?? 0).toUpperCase()} TRACKED
                </Text>
              </div>
              {isFetching && !tasks.length ? <PanelCard><Skeleton active /></PanelCard> : !items.length ? (
                <PanelCard><EmptyBlock icon={<FieldTimeOutlined />} text="No activity recorded for this day." compact /></PanelCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflowY: 'auto', paddingRight: 4 }}>
                  {items.map((it) => {
                    if (it.kind === 'event') {
                      const meta = EVENT_META[it.e.type];
                      return (
                        <PanelCard key={`e${it.ts}`} bodyStyle={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: meta.color }}>{meta.icon}</span>
                            <Text strong style={{ flex: 1, color: s.text }}>{asText(it.e.label) || meta.label}</Text>
                            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>{dayjs(it.e.at).format('hh:mm A')}</Text>
                          </div>
                        </PanelCard>
                      );
                    }
                    if (it.kind === 'segment') {
                      return (
                        <PanelCard key={`g${it.i}`} bodyStyle={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CarOutlined style={{ color: s.muted }} />
                            <Text strong style={{ flex: 1, color: s.text, textTransform: 'capitalize' }}>{asText(it.g.label || it.g.kind) || 'Travel'}{it.g.distanceKm != null ? ` · ${kmText(it.g.distanceKm)}` : ''}</Text>
                            <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>
                              {it.g.startAt && dayjs(it.g.startAt).format('HH:mm')}{it.g.endAt && ` → ${dayjs(it.g.endAt).format('HH:mm')}`}
                            </Text>
                          </div>
                          <LocationRecords staffId={staffId} from={it.g.startAt} to={it.g.endAt} onSelect={setFocus} selected={focus} />
                        </PanelCard>
                      );
                    }
                    const { t, n } = it;
                    const color = TASK_COLORS[(n - 1) % TASK_COLORS.length];
                    return (
                      <PanelCard key={t.taskId || n} style={{ borderLeft: `4px solid ${color}` }} bodyStyle={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '1px 8px', borderRadius: 6, background: 'rgba(250,173,20,0.12)', color: '#d48806' }}>
                              <ClockCircleOutlined /> {t.startTime || '—'} → {t.endTime || '—'}
                            </span>
                            <Text strong style={{ color }}>Task {n}</Text>
                            {t.taskType && <span style={{ fontSize: 11, padding: '0 8px', borderRadius: 6, border: `1px solid ${s.fieldBorder}` }}>{t.taskType}</span>}
                          </div>
                          <StatusTag status={t.status} />
                        </div>
                        <div>
                          <Text strong style={{ color: s.text }}>{t.title}</Text>
                          <Text style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: s.muted }}>#{t.taskIdStr}</Text>
                          {t.description && <Text style={{ display: 'block', fontSize: 12, color: s.muted }}>{t.description}</Text>}
                        </div>
                        <Place title="Start" loc={t.startLocation} time={t.startTime} s={s} />
                        {(t.endLocation?.latitude || t.endLocation?.address) && <Place title={`End${t.status ? ` (${t.status})` : ''}`} loc={t.endLocation} time={t.endTime} s={s} />}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, padding: '8px 12px', borderRadius: 10, background: s.field }}>
                          <div><Text style={{ fontSize: 11, color: s.muted, display: 'block' }}>Time at task</Text><Text strong>{durationText(day, t.startTime, t.endTime) || '—'}</Text></div>
                          <div><Text style={{ fontSize: 11, color: s.muted, display: 'block' }}>Moved during task</Text><Text strong>{kmText(t.distanceKm ?? 0)}</Text></div>
                          <div><Text style={{ fontSize: 11, color: s.muted, display: 'block' }}>Tracked points</Text><Text strong>{(t.trackingPoints || []).length}</Text></div>
                        </div>
                        <LocationRecords staffId={staffId} from={isoAt(day, t.startTime)} to={isoAt(day, t.endTime) || dayjs(`${day}`).endOf('day').toISOString()} onSelect={setFocus} selected={focus} />
                      </PanelCard>
                    );
                  })}
                </div>
              )}
            </Col>
            <Col xs={24} lg={11}>
              <PanelCard bodyStyle={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15, color: s.text }}>Route Map</Text>
                  <Button size="small" shape="round" onClick={() => { setFocus(null); setFitKey((k) => k + 1); }}>Whole Day</Button>
                </div>
                <GeoMap
                  height={560}
                  markers={markers}
                  lines={lines}
                  fitKey={`${staffId}-${day}-${fitKey}-${tasks.length + segments.length}`}
                  focus={focus}
                  overlay={<MapLegend items={[
                    { label: 'Punch In', color: EVENT_META.punch_in.color },
                    { label: 'Punch Out', color: EVENT_META.punch_out.color },
                    { label: 'Task start', color: TASK_COLORS[0] },
                    { label: 'Task end', color: '#1a1a2e' },
                    { label: 'Travel', color: '#1a1a2e', line: true },
                  ]} />}
                />
              </PanelCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
