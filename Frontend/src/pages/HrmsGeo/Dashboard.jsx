// HRMS Geo Dashboard — today's field activity.
// GET /admin/hrms-geo/tracking/dashboard (refreshed every 60s) and
// GET /admin/hrms-geo/tracking/live (punched-in staff, refreshed every 15s).
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Row, Skeleton, Typography } from 'antd';
import {
  ArrowRightOutlined, LoginOutlined, LogoutOutlined, EnvironmentOutlined, FlagOutlined, ClockCircleOutlined,
  TeamOutlined, UnorderedListOutlined, NodeIndexOutlined, WalletOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetGeoDashboardQuery, useGetGeoLiveQuery } from '../../store/api/apiSlice';
import { canViewTab } from '../../utils/access';
import { toList, toRecord } from '../Staff/shared/hrUtils';
import { PanelCard, PanelTitle, MetricCard, EmptyBlock, LoadError } from '../Staff/shared/StaffUi';
import useSurface from '../Staff/shared/useSurface';
import GeoMap, { MapLegend } from './shared/GeoMap';
import { latLng, geoInitials, timeAgo, clockTime, markerColor, locationLabel, MARKER } from './shared/geoUtils';

const { Text } = Typography;

const TASK_STATUSES = [
  { key: 'assigned', label: 'Assigned', color: '#1a1a2e' },
  { key: 'inProgress', label: 'In Progress', color: '#faad14' },
  { key: 'hold', label: 'Hold', color: '#bfbfbf' },
  { key: 'completed', label: 'Completed', color: '#52c41a' },
  { key: 'exited', label: 'Exited', color: '#ff4d4f' },
];

const ACTIVITY_ICONS = {
  punch_in: { icon: <LoginOutlined />, color: '#52c41a' },
  punch_out: { icon: <LogoutOutlined />, color: '#ff4d4f' },
  field_in: { icon: <EnvironmentOutlined />, color: '#1677ff' },
  field_out: { icon: <FlagOutlined />, color: '#1a1a2e' },
  task_exit: { icon: <FlagOutlined />, color: '#ff4d4f' },
};

const Chip = ({ children, s }) => (
  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5, padding: '2px 10px', borderRadius: 999, background: s.field, border: `1px solid ${s.fieldBorder}`, color: s.muted, whiteSpace: 'nowrap' }}>
    {children}
  </span>
);

export default function GeoDashboard() {
  const s = useSurface();
  const navigate = useNavigate();
  const user = useSelector((st) => st.auth.user);
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: dashRes, isLoading: dashLoading, error: dashError, refetch: refetchDash } = useGetGeoDashboardQuery(undefined, { pollingInterval: 60000 });
  const { data: liveRes, isLoading: liveLoading, error: liveError, refetch: refetchLive } = useGetGeoLiveQuery(undefined, { pollingInterval: 15000 });
  const dash = toRecord(dashRes) || {};
  const live = useMemo(() => toList(liveRes), [liveRes]);
  const perStaff = dash.perStaff || {};

  const markers = useMemo(() => live.map((e) => ({
    id: e.staffId,
    pos: latLng(e),
    label: geoInitials(e.staffName),
    color: markerColor(e, e.staffId === selected),
    title: `${e.staffName} · ${locationLabel(e)}`,
    z: e.staffId === selected ? 1000 : 0,
  })), [live, selected]);

  const status = dash.taskStatus || {};
  const totalTasks = dash.totalTasksToday ?? TASK_STATUSES.reduce((t, x) => t + (status[x.key] || 0), 0);
  const canOpenTracking = canViewTab(user, 'HRMS Geo', 'tracking');

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Dashboard' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {dashError && <LoadError error={dashError} onRetry={refetchDash} />}

        <Row gutter={[14, 14]}>
          <Col xs={12} lg={6}><MetricCard label="Field Employees" value={dash.totalFieldEmployees ?? '—'} icon={<TeamOutlined />} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Tasks Today" value={totalTasks} hint={`${dash.pendingTasks ?? 0} pending`} icon={<UnorderedListOutlined />} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Distance Today" value={`${dash.totalDistanceKm ?? 0} km`} icon={<NodeIndexOutlined />} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Pending Claims" value={dash.pendingClaims ?? 0} icon={<WalletOutlined />} color="#d48806" /></Col>
        </Row>

        <Row gutter={[14, 14]}>
          <Col xs={24} lg={16}>
            <PanelCard bodyStyle={{ padding: 14 }} style={{ height: '100%' }}>
              <div style={{ marginBottom: 10 }}>
                <PanelTitle
                  title="Live Tracking Map"
                  extra={(
                    <>
                      <Chip s={s}>{live.length} PUNCHED IN • LAST LOCATION TODAY</Chip>
                      {canOpenTracking && (
                        <Button size="small" shape="round" onClick={() => navigate('/hrms-geo/tracking?tab=live')}>
                          Open Live Tracking <ArrowRightOutlined />
                        </Button>
                      )}
                    </>
                  )}
                />
              </div>
              {liveError ? <LoadError error={liveError} onRetry={refetchLive} /> : (
                <GeoMap
                  height={330}
                  markers={markers}
                  fitLabel="Fit All Staff"
                  onMarkerClick={setSelected}
                  overlay={<MapLegend items={[{ label: 'Tracked', color: MARKER.tracked }, { label: 'Punch-in location', color: MARKER.punchIn }]} />}
                />
              )}
            </PanelCard>
          </Col>

          <Col xs={24} lg={8}>
            <PanelCard bodyStyle={{ padding: 14 }} style={{ height: '100%' }}>
              <Text strong style={{ fontSize: 15, color: s.text, display: 'block' }}>Punched In ({live.length})</Text>
              <Text style={{ fontSize: 12, color: s.muted }}>Staff currently punched in, at their last location today</Text>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 340, overflowY: 'auto' }}>
                {liveLoading ? <Skeleton active /> : !live.length ? (
                  <EmptyBlock icon={<ClockCircleOutlined />} text="No staff are punched in right now." compact />
                ) : live.map((e) => {
                  const ps = perStaff[e.staffId] || {};
                  const on = e.staffId === selected;
                  return (
                    <div
                      key={e.staffId}
                      onClick={() => setSelected(on ? null : e.staffId)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${on ? 'rgba(177,30,106,0.35)' : 'transparent'}`, background: on ? 'rgba(177,30,106,0.06)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                        <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', background: markerColor(e) }}>
                          {geoInitials(e.staffName)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ display: 'block', color: s.text, fontSize: 13.5 }}>{e.staffName}</Text>
                          <Chip s={s}>
                            {e.locationSource === 'punch_in' ? 'PUNCH-IN' : 'LAST SEEN'} {clockTime(e.timestamp) || e.punchInTime} • {(timeAgo(e.timestamp, now) || '').toUpperCase()}
                          </Chip>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11.5, color: s.muted, flexShrink: 0 }}>
                        <div><b style={{ color: s.text }}>Dist: {ps.distanceKm ?? 0} km</b></div>
                        <div>Tasks: {ps.tasksToday ?? 0}</div>
                        {e.punchInTime && <div><ClockCircleOutlined /> In {e.punchInTime}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </Col>
        </Row>

        <Row gutter={[14, 14]}>
          <Col xs={24} lg={12}>
            <PanelCard bodyStyle={{ padding: 16 }} style={{ height: '100%' }}>
              <PanelTitle title="Task Status Chart" extra={<Chip s={s}>{totalTasks} tasks today</Chip>} />
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: s.field, margin: '14px 0' }}>
                {TASK_STATUSES.map((x) => (status[x.key] ? <div key={x.key} style={{ flex: status[x.key], background: x.color }} title={`${x.label}: ${status[x.key]}`} /> : null))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {dashLoading ? <Skeleton active /> : TASK_STATUSES.map((x) => (
                  <div key={x.key} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${s.fieldBorder}`, background: s.field }}>
                    <Text style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, color: s.muted, display: 'block' }}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: x.color, marginRight: 6 }} />
                      {x.label.toUpperCase()}
                    </Text>
                    <Text strong style={{ fontSize: 15, color: s.text }}>{status[x.key] || 0} Tasks</Text>
                  </div>
                ))}
              </div>
            </PanelCard>
          </Col>
          <Col xs={24} lg={12}>
            <PanelCard bodyStyle={{ padding: 16 }} style={{ height: '100%' }}>
              <PanelTitle title="Recent Activities" extra={<Chip s={s}>Today</Chip>} />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
                {dashLoading ? <Skeleton active /> : !(dash.activities || []).length ? (
                  <EmptyBlock icon={<ClockCircleOutlined />} text="No activity recorded today yet." compact />
                ) : dash.activities.map((a, i) => {
                  const ic = ACTIVITY_ICONS[a.type] || { icon: <ClockCircleOutlined />, color: '#8c8c8c' };
                  return (
                    <div key={`${a.at}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: ic.color, background: `${ic.color}18` }}>
                        {ic.icon}
                      </span>
                      <Text strong style={{ flex: 1, color: s.text, fontSize: 13 }}>{a.text}</Text>
                      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>{clockTime(a.at)}</Text>
                    </div>
                  );
                })}
              </div>
            </PanelCard>
          </Col>
        </Row>
      </div>
    </div>
  );
}
