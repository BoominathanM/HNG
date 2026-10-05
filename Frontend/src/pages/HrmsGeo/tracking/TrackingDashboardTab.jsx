// Tracking → Dashboard: staff with work mode, distance and locations visited
// (GET /admin/hrms-geo/tracking/summary). A row opens the staff's tracking details.
import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Table, Typography } from 'antd';
import { SearchOutlined, RightOutlined, DownloadOutlined, CompassOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGetGeoTrackingSummaryQuery } from '../../../store/api/apiSlice';
import { toList, downloadCsv } from '../../Staff/shared/hrUtils';
import { PanelCard, EmptyBlock, LoadError, FiltersButton, FilterField } from '../../Staff/shared/StaffUi';
import useSurface from '../../Staff/shared/useSurface';
import { kmText } from '../shared/geoUtils';

const { Text } = Typography;

export default function TrackingDashboardTab() {
  const s = useSurface();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState();
  const { data, isFetching, error, refetch } = useGetGeoTrackingSummaryQuery();
  const staff = useMemo(() => toList(data), [data]);
  const modes = useMemo(() => [...new Set(staff.map((r) => r.type).filter(Boolean))].map((v) => ({ value: v, label: v })), [staff]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((r) => (!mode || r.type === mode) && (!q || [r.name, r.id].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [staff, search, mode]);

  const open = (r) => navigate(`/hrms-geo/tracking/${r._id}`);

  const columns = [
    { title: 'Employee Name', key: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
    { title: 'Employee ID', key: 'id', render: (_, r) => <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>{r.id}</Text> },
    { title: 'Work Mode', key: 'mode', render: (_, r) => r.type || '—' },
    { title: 'Total Distance', key: 'distance', render: (_, r) => <Text strong>{kmText(r.totalDistance ?? 0)}</Text> },
    { title: 'No. of Locations', key: 'locations', render: (_, r) => <Text strong>{r.numLocations ?? 0} completed</Text> },
    { title: 'Actions', key: 'actions', align: 'right', width: 80, render: (_, r) => <Button type="text" icon={<RightOutlined />} onClick={(e) => { e.stopPropagation(); open(r); }} /> },
  ];

  const exportCsv = () => downloadCsv('geo-tracking-summary.csv', [
    { title: 'Employee Name', value: (r) => r.name },
    { title: 'Employee ID', value: (r) => r.id },
    { title: 'Work Mode', value: (r) => r.type },
    { title: 'Total Distance (km)', value: (r) => r.totalDistance },
    { title: 'Locations Completed', value: (r) => r.numLocations },
    { title: 'Timeline Tracking', value: (r) => (r.timelineTracking ? 'Enabled' : 'Disabled') },
  ], rows);

  return (
    <PanelCard bodyStyle={{ padding: 0 }}>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          placeholder="Search employee name, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280, maxWidth: '100%', borderRadius: 999 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button shape="round" icon={<DownloadOutlined />} disabled={!rows.length} onClick={exportCsv}>Export</Button>
          <FiltersButton count={mode ? 1 : 0} onClear={() => setMode(undefined)}>
            <FilterField label="Work Mode">
              <Select allowClear placeholder="All modes" style={{ width: '100%' }} value={mode} onChange={setMode} options={modes} />
            </FilterField>
          </FiltersButton>
        </div>
      </div>
      {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
        <div className="table-responsive">
          <Table
            className="staff-table"
            size="middle"
            rowKey="_id"
            dataSource={rows}
            columns={columns}
            loading={isFetching}
            onRow={(r) => ({ onClick: () => open(r), style: { cursor: 'pointer' } })}
            pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
            locale={{ emptyText: <EmptyBlock icon={<CompassOutlined />} text="No staff found." /> }}
          />
        </div>
      )}
    </PanelCard>
  );
}
