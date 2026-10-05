// Geo Customers — GET /admin/hrms-geo/customer (newest first); staff names
// for the export come from GET /admin/hrms-geo/settings/employee-access.
import React, { useMemo, useState } from 'react';
import { Button, Dropdown, Input, Select, Table, Typography } from 'antd';
import {
  DownloadOutlined, SearchOutlined, MoreOutlined, EyeOutlined, BankOutlined, EnvironmentOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetGeoCustomersQuery, useGetGeoEmployeeAccessQuery } from '../../store/api/apiSlice';
import { toList, downloadCsv } from '../Staff/shared/hrUtils';
import { PanelCard, PageHeaderCard, EmptyBlock, LoadError, FiltersButton, FilterField } from '../Staff/shared/StaffUi';
import useSurface from '../Staff/shared/useSurface';

const { Text } = Typography;

const optionsOf = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

export default function GeoCustomers() {
  const s = useSurface();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState();
  const [city, setCity] = useState();

  const { data, isFetching, error, refetch } = useGetGeoCustomersQuery();
  const { data: staffRes } = useGetGeoEmployeeAccessQuery();
  const customers = useMemo(() => toList(data), [data]);
  const staffName = useMemo(() => Object.fromEntries(toList(staffRes).map((e) => [e.id, e.name])), [staffRes]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => (!status || c.status === status) && (!city || c.city === city)
      && (!q || [c.name, c.companyName, c.mobile, c.email].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [customers, search, status, city]);

  const open = (c) => navigate(`/hrms-geo/customer/${c.id}`);

  const columns = [
    {
      title: 'Customer Details', key: 'customer',
      render: (_, c) => (
        <div>
          <Text strong style={{ color: s.text }}>{c.name}</Text>
          <Text style={{ display: 'block', fontSize: 12, color: s.muted }}>{[c.mobile, c.email].filter(Boolean).join(' • ') || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Company Info', key: 'company',
      render: (_, c) => (c.companyName ? <Text strong><BankOutlined style={{ marginRight: 6, color: s.muted }} />{c.companyName}</Text> : '—'),
    },
    {
      title: 'Address', key: 'address',
      render: (_, c) => {
        const place = [c.city, c.state].filter(Boolean).join(', ');
        return place ? <Text style={{ color: s.muted }}><EnvironmentOutlined style={{ marginRight: 6 }} />{place}</Text> : '—';
      },
    },
    {
      title: 'Assigned Access', key: 'access',
      render: (_, c) => {
        const n = (c.assignedEmployees || []).length;
        return (
          <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#d48806', background: '#faad1414', border: '1px solid #faad1455' }}>
            {n} Employee{n === 1 ? '' : 's'}
          </span>
        );
      },
    },
    {
      title: 'Actions', key: 'actions', align: 'right', width: 80,
      render: (_, c) => (
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'view', icon: <EyeOutlined />, label: 'View details' }], onClick: ({ domEvent }) => { domEvent.stopPropagation(); open(c); } }}>
          <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

  const exportCsv = () => downloadCsv('geo-customers.csv', [
    { title: 'Name', value: (c) => c.name },
    { title: 'Mobile', value: (c) => c.mobile },
    { title: 'Email', value: (c) => c.email },
    { title: 'Company', value: (c) => c.companyName },
    { title: 'Address', value: (c) => c.address },
    { title: 'City', value: (c) => c.city },
    { title: 'State', value: (c) => c.state },
    { title: 'Pincode', value: (c) => c.pinCode },
    { title: 'Latitude', value: (c) => c.latitude },
    { title: 'Longitude', value: (c) => c.longitude },
    { title: 'Radius (m)', value: (c) => c.radius },
    { title: 'Assigned Staff', value: (c) => (c.assignedEmployees || []).map((id) => staffName[id] || id).join('; ') },
    { title: 'Status', value: (c) => c.status },
    { title: 'Created', value: (c) => c.createdDate },
  ], rows);

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Customer' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          icon={<TeamOutlined />}
          title="Geo Customers"
          subtitle="Manage customer geofence profiles and control employee dispatch visibility settings"
          extra={<Button shape="round" icon={<DownloadOutlined />} disabled={!rows.length} onClick={exportCsv}>Export CSV</Button>}
        />
        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Search by name, company, mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280, maxWidth: '100%', borderRadius: 999 }}
            />
            <FiltersButton count={[status, city].filter(Boolean).length} onClear={() => { setStatus(undefined); setCity(undefined); }}>
              <FilterField label="Status">
                <Select allowClear placeholder="All statuses" style={{ width: '100%' }} value={status} onChange={setStatus} options={optionsOf(customers, 'status')} />
              </FilterField>
              <FilterField label="City">
                <Select allowClear showSearch placeholder="All cities" style={{ width: '100%' }} value={city} onChange={setCity} options={optionsOf(customers, 'city')} />
              </FilterField>
            </FiltersButton>
          </div>
          {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
            <div className="table-responsive">
              <Table
                className="staff-table"
                size="middle"
                rowKey="id"
                dataSource={rows}
                columns={columns}
                loading={isFetching}
                onRow={(c) => ({ onClick: () => open(c), style: { cursor: 'pointer' } })}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
                locale={{ emptyText: <EmptyBlock icon={<TeamOutlined />} text="No customers found." /> }}
              />
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
