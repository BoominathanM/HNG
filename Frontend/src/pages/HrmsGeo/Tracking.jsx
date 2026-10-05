// Geo Tracking Logs — Dashboard / Live Tracking / Timeline View tabs
// (active tab kept in ?tab= so links like "Open Live Tracking" land on it).
import React from 'react';
import { Tabs } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { PageHeaderCard } from '../Staff/shared/StaffUi';
import TrackingDashboardTab from './tracking/TrackingDashboardTab';
import LiveTrackingTab from './tracking/LiveTrackingTab';
import TimelineTab from './tracking/TimelineTab';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', Component: TrackingDashboardTab },
  { key: 'live', label: 'Live Tracking', Component: LiveTrackingTab },
  { key: 'timeline', label: 'Timeline View', Component: TimelineTab },
];

export default function GeoTracking() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.key === params.get('tab')) || TABS[0];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Tracking' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PageHeaderCard
          icon={<CompassOutlined />}
          title="Geo Tracking Logs"
          subtitle="Monitor daily routes, geofence check-ins, timeline logs and calculate travel allowances."
        />
        <Tabs
          activeKey={active.key}
          onChange={(k) => setParams(k === 'dashboard' ? {} : { tab: k }, { replace: true })}
          items={TABS.map((t) => ({ key: t.key, label: t.label }))}
          style={{ marginBottom: -8 }}
        />
        <active.Component />
      </div>
    </div>
  );
}
