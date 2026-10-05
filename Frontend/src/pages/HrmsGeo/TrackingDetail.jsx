// Staff tracking details — GET /admin/hrms-geo/tracking/{staffId}?startDate&endDate
// → visits/tasks (with map data), assigned transport and travel allowances.
import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Descriptions, Modal, Row, Skeleton, Typography } from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, ClockCircleOutlined, EyeOutlined, NodeIndexOutlined, HistoryOutlined,
  EnvironmentOutlined, SwapOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetGeoTrackingDetailsQuery } from '../../store/api/apiSlice';
import { asText, fmtDate, toRecord, downloadCsv } from '../Staff/shared/hrUtils';
import { PanelCard, PanelTitle, StatusTag, EmptyBlock, LoadError, FiltersButton, FilterField } from '../Staff/shared/StaffUi';
import useSurface from '../Staff/shared/useSurface';
import GeoMap, { MapLegend } from './shared/GeoMap';
import { latLng, fmtLatLng, mapsLink, kmText } from './shared/geoUtils';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const TASK_COLORS = ['#2F6FE0', '#B11E6A', '#13a8a8', '#d48806', '#722ed1', '#389e0d'];
const timeKey = (t) => dayjs(`2000-01-01 ${t.timeIn || '00:00 AM'}`, 'YYYY-MM-DD hh:mm A').valueOf() || 0;
const isUrl = (v) => typeof v === 'string' && /^(https?:|data:image\/)/i.test(v);

// Task route: start point → GPS points → task location.
const routeOf = (t) => [latLng(t.mapData?.startPoint), ...(t.mapData?.trackingPoints || []).map(latLng), latLng(t.mapData?.taskLocation) || latLng(t)].filter(Boolean);

function TaCard({ ta, s }) {
  const route = asText(ta.payoutInfo?.paymentRoute);
  const amount = ta.revisedAmount ?? ta.generatedAmount;
  const box = (label, value, color, highlight) => (
    <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${highlight ? '#faad14' : s.fieldBorder}`, background: highlight ? 'rgba(250,173,20,0.06)' : s.field }}>
      <Text style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, color: s.muted, display: 'block' }}>{label}</Text>
      <Text strong style={{ fontSize: 17, color: color || s.text }}>{value}</Text>
    </div>
  );
  return (
    <PanelCard bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PanelTitle
        icon={<span style={{ fontWeight: 700 }}>₹</span>}
        title="Travel Allowance Calculation"
        subtitle={`Date: ${ta.date}`}
        extra={<span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6, background: s.field, border: `1px solid ${s.fieldBorder}` }}>{ta.transportName || 'Transport'}: ₹{ta.transportRate ?? ta.ratePerKm} / km</span>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {box('Distance Traveled', kmText(ta.totalDistanceKm ?? 0))}
        {box('Checkins Visited', `${ta.tasksCount ?? 0} visited`)}
        {box('Generated Amt', `₹${ta.generatedAmount ?? 0}`, '#389e0d')}
        {box('Revised Amt', ta.revisedAmount != null ? `₹${ta.revisedAmount}` : '—', '#d48806', ta.revisedAmount != null)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 10, background: s.field }}>
        <Text style={{ fontSize: 12.5, color: s.text }}>
          • Claim <b>{ta.status}</b>{route ? <> via <b style={{ color: '#389e0d' }}>{route}</b></> : ''}{amount != null ? ` (Amt: ₹${amount})` : ''}
          {ta.payoutInfo?.payrollMonth ? ` · ${ta.payoutInfo.payrollMonth}` : ''}
        </Text>
        <StatusTag status={ta.status} />
      </div>
    </PanelCard>
  );
}

export default function GeoTrackingDetail() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const s = useSurface();
  const [range, setRange] = useState(() => [dayjs().startOf('month'), dayjs()]);
  const [view, setView] = useState('history');
  const [selection, setSelection] = useState({ kind: 'all' }); // { kind: 'all' | 'day' | 'task', day?, id? }
  const [detail, setDetail] = useState(null);

  const startDate = range[0].format('YYYY-MM-DD');
  const endDate = range[1].format('YYYY-MM-DD');
  const { data, isFetching, error, refetch } = useGetGeoTrackingDetailsQuery({ staffId, startDate, endDate });
  const d = toRecord(data) || {};
  const tasks = useMemo(() => d.tasks || [], [d.tasks]);

  // Days (newest first), tasks within a day by time; numbering + colour per day.
  const days = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => { const k = t.date || 'Unknown'; if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, list]) => ({ day, tasks: [...list].sort((a, b) => timeKey(a) - timeKey(b)).map((t, i) => ({ ...t, n: i + 1, color: TASK_COLORS[i % TASK_COLORS.length] })) }));
  }, [tasks]);
  const numbered = useMemo(() => days.flatMap((g) => g.tasks), [days]);

  const shown = selection.kind === 'task' ? numbered.filter((t) => t._id === selection.id)
    : selection.kind === 'day' ? numbered.filter((t) => t.date === selection.day)
    : numbered;

  const { markers, lines, circles } = useMemo(() => {
    const m = [];
    const l = [];
    const c = [];
    shown.forEach((t) => {
      const pts = routeOf(t);
      if (pts.length > 1) l.push({ id: t._id, points: pts, color: t.color, weight: 4 });
      const start = latLng(t.mapData?.startPoint);
      const end = latLng(t.mapData?.taskLocation) || latLng(t);
      if (start) m.push({ id: `s${t._id}`, pos: start, label: 'S', color: '#52c41a', title: `Task ${t.n} start · ${t.timeIn || ''}` });
      if (end) {
        m.push({ id: `e${t._id}`, pos: end, label: `${t.n}`, color: t.color, title: `Task ${t.n} · ${t.businessName || t.title}`, z: 100 });
        if (t.mapData?.taskLocation?.radius) c.push({ id: `c${t._id}`, pos: end, radius: t.mapData.taskLocation.radius, color: t.color });
      }
    });
    return { markers: m, lines: l, circles: c };
  }, [shown]);

  const mapSubtitle = selection.kind === 'task' ? (shown[0] ? `Task ${shown[0].n} • ${shown[0].title}` : '')
    : selection.kind === 'day' ? `Day route • ${selection.day}` : `All tasks • ${startDate} → ${endDate}`;

  const exportCsv = () => downloadCsv(`tracking-${d.id || staffId}-${startDate}-${endDate}.csv`, [
    { title: 'Date', value: (t) => t.date },
    { title: 'Task ID', value: (t) => t.id },
    { title: 'Title', value: (t) => t.title },
    { title: 'Type', value: (t) => t.taskType },
    { title: 'Status', value: (t) => t.status },
    { title: 'Time In', value: (t) => t.timeIn },
    { title: 'Time Out', value: (t) => t.timeOut },
    { title: 'Distance', value: (t) => t.distanceFromPrev },
    { title: 'GPS Points', value: (t) => (t.mapData?.trackingPoints || []).length },
    { title: 'Business', value: (t) => t.businessName },
    { title: 'Latitude', value: (t) => t.lat },
    { title: 'Longitude', value: (t) => t.lng },
    { title: 'Address', value: (t) => t.address },
  ], numbered);

  const tas = useMemo(() => [...(d.travelAllowances || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))), [d.travelAllowances]);

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Tracking', path: '/hrms-geo/tracking' }, { label: d.name || 'Staff' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PanelCard bodyStyle={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate('/hrms-geo/tracking')} />
              <Title level={4} style={{ margin: 0 }}>{d.name || '…'}</Title>
              {d.id && <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>({d.id})</Text>}
              {d.type && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 10px', borderRadius: 999, color: '#722ed1', background: '#722ed114', border: '1px solid #722ed140', textTransform: 'uppercase' }}>• {d.type}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <FiltersButton count={1} onClear={() => setRange([dayjs().startOf('month'), dayjs()])}>
                <FilterField label="Date Range">
                  <RangePicker value={range} onChange={(v) => { if (v?.[0] && v?.[1]) { setRange(v); setSelection({ kind: 'all' }); } }} allowClear={false} style={{ width: '100%' }} format="DD MMM YYYY" />
                </FilterField>
              </FiltersButton>
              <Button type="primary" shape="round" icon={<DownloadOutlined />} disabled={!numbered.length} onClick={exportCsv}>Export Sheet</Button>
            </div>
          </div>
        </PanelCard>

        {error ? <LoadError error={error} onRetry={refetch} /> : (
          <Row gutter={[14, 14]}>
            <Col xs={24} lg={13}>
              <PanelCard bodyStyle={{ padding: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[['history', 'Tracking History'], ['ta', 'Travel Allowance']].map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setView(k)}
                      style={{
                        border: 'none', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                        background: view === k ? 'linear-gradient(90deg, #8e1450 0%, #B11E6A 45%, #D85C9E 100%)' : 'transparent',
                        color: view === k ? '#fff' : s.muted,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </PanelCard>

              <div style={{ marginTop: 14 }}>
                {isFetching && !tasks.length ? <PanelCard><Skeleton active paragraph={{ rows: 6 }} /></PanelCard> : view === 'history' ? (
                  <PanelCard bodyStyle={{ padding: 16 }}>
                    <PanelTitle
                      icon={<HistoryOutlined />}
                      title={<>Tracking History <span style={{ marginLeft: 6, fontSize: 11, padding: '0 8px', borderRadius: 999, background: s.field, border: `1px solid ${s.fieldBorder}` }}>{numbered.length} tasks</span></>}
                      extra={<Button type="primary" size="small" shape="round" icon={<DownloadOutlined />} disabled={!numbered.length} onClick={exportCsv}>Export</Button>}
                    />
                    {!days.length ? <EmptyBlock icon={<NodeIndexOutlined />} text="No tracked tasks in this date range." compact /> : days.map((g) => (
                      <div key={g.day} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: s.muted }}><span style={{ color: '#d48806', fontWeight: 700 }}>• {g.day}</span> • {g.tasks.length} task{g.tasks.length === 1 ? '' : 's'}</Text>
                          <Button size="small" shape="round" icon={<NodeIndexOutlined />} onClick={() => setSelection({ kind: 'day', day: g.day })}>Show Day Route</Button>
                        </div>
                        {g.tasks.map((t) => {
                          const on = selection.kind === 'task' && selection.id === t._id;
                          const pos = latLng(t);
                          return (
                            <div
                              key={t._id}
                              onClick={() => setSelection({ kind: 'task', id: t._id })}
                              style={{
                                padding: 12, borderRadius: 12, cursor: 'pointer',
                                border: `1px solid ${on ? '#faad14' : s.fieldBorder}`, borderLeftWidth: 4, borderLeftColor: t.color,
                                background: on ? 'rgba(250,173,20,0.06)' : s.card,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <Text strong style={{ color: t.color }}>Task {t.n}</Text>
                                  <Text strong style={{ color: s.text }}>{t.title}</Text>
                                  <StatusTag status={t.status} />
                                  {t.taskType && <span style={{ fontSize: 11, padding: '0 8px', borderRadius: 6, border: `1px solid ${s.fieldBorder}` }}>{t.taskType}</span>}
                                </div>
                                <Button size="small" shape="round" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); setDetail(t); }}>View Details</Button>
                              </div>
                              <Text style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: s.muted }}>#{t.id}</Text>
                              <Text style={{ display: 'block', fontSize: 12, color: s.muted, marginTop: 2 }}>
                                <ClockCircleOutlined /> {t.timeIn || '—'} - {t.timeOut || '—'}
                                {'  '}Distance: <b style={{ color: s.text }}>{kmText(t.distanceFromPrev) || '—'}</b>
                                {'  '}<SwapOutlined /> {(t.mapData?.trackingPoints || []).length} GPS points
                              </Text>
                              <Text strong style={{ display: 'block', fontSize: 12.5, color: s.text, marginTop: 4 }}>{t.businessName}</Text>
                              {pos && <Text style={{ display: 'block', fontSize: 11.5, fontFamily: 'monospace', color: s.muted }}>{fmtLatLng(pos)}</Text>}
                              <Text style={{ fontSize: 11.5, fontWeight: 600, color: '#d48806' }}>{on ? "Showing this task's route on the map" : "Click to show this task's route on the map"}</Text>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </PanelCard>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!tas.length ? <PanelCard><EmptyBlock icon={<span style={{ fontWeight: 700 }}>₹</span>} text="No travel allowance in this date range." compact /></PanelCard>
                      : tas.map((ta) => <TaCard key={ta._id} ta={ta} s={s} />)}
                  </div>
                )}
              </div>
            </Col>

            <Col xs={24} lg={11}>
              <PanelCard bodyStyle={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <PanelTitle icon={<EnvironmentOutlined />} title="Route Map View" subtitle={mapSubtitle} />
                  <Button size="small" shape="round" onClick={() => setSelection({ kind: 'all' })}>Show All Tasks</Button>
                </div>
                <GeoMap
                  height={520}
                  markers={markers}
                  lines={lines}
                  circles={circles}
                  fitKey={`${selection.kind}-${selection.day || ''}-${selection.id || ''}-${numbered.length}`}
                  overlay={<MapLegend items={[{ label: 'Start', color: '#52c41a' }, { label: 'Task site', color: TASK_COLORS[0] }, { label: 'Route', color: TASK_COLORS[1], line: true }]} />}
                />
              </PanelCard>
            </Col>
          </Row>
        )}
      </div>

      <Modal open={!!detail} onCancel={() => setDetail(null)} footer={null} width={580} title={detail ? `Task ${detail.n} · ${detail.title}` : ''}>
        {detail && (
          <Descriptions
            bordered
            size="small"
            column={1}
            style={{ marginTop: 12 }}
            items={[
              ['Task ID', detail.id],
              ['Status', <StatusTag key="s" status={detail.status} />],
              ['Type', detail.taskType],
              ['Date', detail.date],
              ['Time In / Out', [detail.timeIn, detail.timeOut].filter(Boolean).join(' – ')],
              ['Actual Field In', detail.actualFieldInTime],
              ['Completed', fmtDate(detail.completedDate, 'MMM D, YYYY hh:mm A')],
              ['Business', detail.businessName],
              ['Contact', [detail.contactPerson, detail.contactNumber].filter((v) => v && v !== 'N/A').join(' · ')],
              ['Designation', detail.designation !== 'N/A' ? detail.designation : undefined],
              ['Description', detail.description],
              ['Start Address', detail.startAddress],
              ['Task Address', detail.address],
              ['Task Location', latLng(detail) && <a key="l" href={mapsLink(latLng(detail))} target="_blank" rel="noreferrer">{fmtLatLng(latLng(detail))}</a>],
              ['Distance From Previous', kmText(detail.distanceFromPrev)],
              ['GPS Points', (detail.mapData?.trackingPoints || []).length],
              ['Proof', isUrl(detail.proofImg) ? <a key="p" href={detail.proofImg} target="_blank" rel="noreferrer">View proof</a> : undefined],
            ].filter(([, v]) => v != null && v !== '').map(([label, children]) => ({ key: label, label, children }))}
          />
        )}
      </Modal>
    </div>
  );
}
