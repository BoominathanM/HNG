// Tracking → Live: punched-in staff at their last location today
// (GET /admin/hrms-geo/tracking/live, refreshed every 15s).
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Input, Row, Select, Skeleton, Typography } from 'antd';
import {
  SearchOutlined, DownloadOutlined, LoginOutlined, EnvironmentOutlined, ClockCircleOutlined, AimOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useGetGeoLiveQuery } from '../../../store/api/apiSlice';
import { toList, downloadCsv } from '../../Staff/shared/hrUtils';
import { PanelCard, EmptyBlock, LoadError, FiltersButton, FilterField } from '../../Staff/shared/StaffUi';
import useSurface from '../../Staff/shared/useSurface';
import GeoMap, { MapLegend } from '../shared/GeoMap';
import {
  latLng, fmtLatLng, mapsLink, geoInitials, timeAgo, markerColor, locationLabel, MARKER,
} from '../shared/geoUtils';

const { Text } = Typography;

const SOURCES = [
  { value: 'tracked', label: 'Last tracked location' },
  { value: 'punch_in', label: 'Punch-in location' },
  { value: 'none', label: 'No location today' },
];
const sourceOf = (e) => (e.locationSource === 'punch_in' || e.locationSource === 'none' ? e.locationSource : 'tracked');

function Line({ label, value, mono }) {
  const s = useSurface();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: s.muted }}>{label}</span>
      <span style={{ fontWeight: 600, color: s.text, fontFamily: mono ? 'monospace' : undefined, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function LiveTrackingTab() {
  const s = useSurface();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState();
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, error, refetch } = useGetGeoLiveQuery(undefined, { pollingInterval: 15000 });
  const live = useMemo(() => toList(data), [data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter((e) => (!source || sourceOf(e) === source)
      && (!q || [e.staffName, e.employeeId, e.address].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [live, search, source]);

  const markers = useMemo(() => rows.map((e) => ({
    id: e.staffId,
    pos: latLng(e),
    label: geoInitials(e.staffName),
    color: markerColor(e, e.staffId === selected),
    title: `${e.staffName} · ${locationLabel(e)}`,
    z: e.staffId === selected ? 1000 : 0,
  })), [rows, selected]);
  const focus = latLng(rows.find((e) => e.staffId === selected));

  const exportCsv = () => downloadCsv('live-locations.csv', [
    { title: 'Staff', value: (e) => e.staffName },
    { title: 'Employee ID', value: (e) => e.employeeId },
    { title: 'Designation', value: (e) => e.designation },
    { title: 'Punched In', value: (e) => e.punchInTime },
    { title: 'Location Source', value: locationLabel },
    { title: 'Location Time', value: (e) => (e.timestamp ? new Date(e.timestamp).toLocaleString() : '') },
    { title: 'Latitude', value: (e) => e.latitude },
    { title: 'Longitude', value: (e) => e.longitude },
    { title: 'Movement', value: (e) => e.movementType },
    { title: 'Battery %', value: (e) => e.batteryPercent },
    { title: 'Current Task', value: (e) => e.taskTitle || e.taskIdStr },
    { title: 'Address', value: (e) => e.address },
  ], rows);

  if (error) return <LoadError error={error} onRetry={refetch} />;

  return (
    <Row gutter={[14, 14]}>
      <Col xs={24} lg={16}>
        <PanelCard bodyStyle={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Search staff name, ID, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260, maxWidth: '100%', borderRadius: 999 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <FiltersButton count={source ? 1 : 0} onClear={() => setSource(undefined)}>
                <FilterField label="Location">
                  <Select allowClear placeholder="All" style={{ width: '100%' }} value={source} onChange={setSource} options={SOURCES} />
                </FilterField>
              </FiltersButton>
              <Button type="primary" shape="round" icon={<DownloadOutlined />} disabled={!rows.length} onClick={exportCsv}>Export Locations</Button>
            </div>
          </div>
          <GeoMap
            height={460}
            markers={markers}
            focus={focus}
            fitLabel="Fit All Staff"
            onMarkerClick={setSelected}
            overlay={<MapLegend items={[{ label: 'Tracked location', color: MARKER.tracked }, { label: 'Punch-in location', color: MARKER.punchIn }]} />}
          />
        </PanelCard>
      </Col>
      <Col xs={24} lg={8}>
        <PanelCard bodyStyle={{ padding: 14 }}>
          <Text strong style={{ fontSize: 15, color: s.text }}><TeamOutlined style={{ color: '#d48806' }} /> Punched In ({rows.length})</Text>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
            {isLoading ? <Skeleton active /> : !rows.length ? (
              <EmptyBlock icon={<ClockCircleOutlined />} text="No staff are punched in right now." compact />
            ) : rows.map((e) => {
              const on = e.staffId === selected;
              const pos = latLng(e);
              return (
                <div
                  key={e.staffId}
                  onClick={() => setSelected(on ? null : e.staffId)}
                  style={{ padding: 12, borderRadius: 12, cursor: 'pointer', border: `1px solid ${on ? 'rgba(177,30,106,0.4)' : s.fieldBorder}`, background: on ? 'rgba(177,30,106,0.05)' : s.card }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: markerColor(e) }}>
                        {geoInitials(e.staffName)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ display: 'block', color: s.text }}>{e.staffName}</Text>
                        <Text style={{ fontSize: 11.5, color: s.muted }}><span style={{ fontFamily: 'monospace' }}>{e.employeeId}</span>{e.designation ? ` • ${e.designation}` : ''}</Text>
                      </div>
                    </div>
                    {e.timestamp && (
                      <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 600, padding: '1px 8px', borderRadius: 999, border: `1px solid ${s.fieldBorder}`, color: s.muted, whiteSpace: 'nowrap' }}>
                        <ClockCircleOutlined /> {(timeAgo(e.timestamp, now) || '').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {e.punchInTime && <Line label={<><LoginOutlined /> Punched in</>} value={e.punchInTime} />}
                    {pos ? (
                      <>
                        <Line label={<><AimOutlined /> {locationLabel(e)}</>} value={e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—'} />
                        <Line label="Lat, Lng" value={<a href={mapsLink(pos)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>{fmtLatLng(pos)}</a>} mono />
                      </>
                    ) : <Text style={{ fontSize: 11.5, color: s.muted }}>No location has been recorded for this staff member today.</Text>}
                    {(e.movementType || e.batteryPercent != null) && (
                      <Line
                        label="Movement / Battery"
                        value={(
                          <span style={{ textTransform: 'capitalize' }}>
                            {e.movementType || '—'}
                            {e.batteryPercent != null && <span style={{ color: e.batteryPercent < 20 ? '#ff4d4f' : '#389e0d' }}> • {e.batteryPercent}%</span>}
                          </span>
                        )}
                      />
                    )}
                    {(e.taskTitle || e.taskIdStr) && <Line label="On task" value={e.taskTitle || e.taskIdStr} />}
                    {e.address && (
                      <Text style={{ fontSize: 11.5, color: s.muted, marginTop: 4 }}><EnvironmentOutlined style={{ color: '#d48806', marginRight: 4 }} />{e.address}</Text>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </Col>
    </Row>
  );
}
