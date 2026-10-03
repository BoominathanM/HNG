// Staff List — EktaHR staff (GET /admin/staff), split into Active / Deactive.
import React, { useMemo, useState } from 'react';
import { Avatar, Button, Input, Select, Table, Tabs, Typography } from 'antd';
import { EyeOutlined, MailOutlined, PhoneOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetHrStaffListQuery } from '../../store/api/apiSlice';
import { normalizeStaff, toList, fmtDate, typeColor, initials, BRAND } from './shared/hrUtils';
import { PanelCard, DotTag, EmptyBlock, LoadError, FiltersButton, FilterField } from './shared/StaffUi';
import useSurface from './shared/useSurface';

const { Text } = Typography;

const optionsOf = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))]
  .sort()
  .map((v) => ({ value: v, label: v }));

const CountChip = ({ n, active }) => (
  <span style={{
    marginLeft: 6, padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
    background: active ? 'rgba(177,30,106,0.14)' : 'rgba(0,0,0,0.06)', color: active ? BRAND : '#888',
  }}>
    {n}
  </span>
);

export default function StaffList() {
  const navigate = useNavigate();
  const s = useSurface();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState();
  const [designation, setDesignation] = useState();
  const [employmentType, setEmploymentType] = useState();
  const [page, setPage] = useState({ current: 1, pageSize: 10 });

  const { data, isFetching, error, refetch } = useGetHrStaffListQuery();
  const staff = useMemo(() => toList(data).map(normalizeStaff), [data]);
  const activeCount = staff.filter((r) => r.active).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((r) => (tab === 'active' ? r.active : !r.active)
      && (!department || r.department === department)
      && (!designation || r.designation === designation)
      && (!employmentType || r.employmentType === employmentType)
      && (!q || [r.employeeId, r.name, r.email, r.phone].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [staff, tab, search, department, designation, employmentType]);

  const filterCount = [department, designation, employmentType].filter(Boolean).length;
  const clearFilters = () => { setDepartment(undefined); setDesignation(undefined); setEmploymentType(undefined); };
  const openStaff = (r) => r.id && navigate(`/staff/list/${r.id}`);

  const columns = [
    {
      title: 'S.No', key: 'sno', width: 70,
      render: (_, __, i) => (page.current - 1) * page.pageSize + i + 1,
    },
    {
      title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId',
      render: (v) => <Text style={{ fontFamily: 'monospace', fontSize: 12, color: s.muted }}>{v || '—'}</Text>,
    },
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={30}
            src={r.photo || undefined}
            style={{ background: 'rgba(177,30,106,0.12)', color: BRAND, fontWeight: 600, fontSize: 12, flexShrink: 0 }}
          >
            {initials(v, 1)}
          </Avatar>
          <Text strong style={{ fontSize: 14 }}>{v}</Text>
        </div>
      ),
    },
    { title: 'Designation', dataIndex: 'designation', key: 'designation', render: (v) => v || '—' },
    { title: 'Department', dataIndex: 'department', key: 'department', render: (v) => v || '—' },
    {
      title: 'Type', dataIndex: 'employmentType', key: 'employmentType',
      render: (v) => <DotTag color={typeColor(v)}>{v}</DotTag>,
    },
    {
      title: 'Contact', key: 'contact',
      render: (_, r) => {
        if (!r.email && !r.phone) return '—';
        return (
          <Text style={{ fontSize: 12.5, fontFamily: r.email ? 'monospace' : undefined, color: s.muted, whiteSpace: 'nowrap' }}>
            {r.email ? <MailOutlined style={{ marginRight: 6 }} /> : <PhoneOutlined style={{ marginRight: 6 }} />}
            {r.email || r.phone}
          </Text>
        );
      },
    },
    {
      title: 'Joining Date', dataIndex: 'joiningDate', key: 'joiningDate',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDate(v) || '—'}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) => <DotTag color={r.active ? '#52c41a' : '#8c8c8c'}>{r.active ? 'Active' : 'Deactive'}</DotTag>,
    },
    {
      title: 'Actions', key: 'actions', align: 'center', width: 80,
      render: (_, r) => (
        <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openStaff(r); }} />
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Staff List" items={[{ label: 'Staff Management', path: '/staff/list' }, { label: 'Staff List' }]} />

      <PanelCard bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '4px 16px 0' }}>
          <Tabs
            activeKey={tab}
            onChange={(k) => { setTab(k); setPage((p) => ({ ...p, current: 1 })); }}
            items={[
              { key: 'active', label: <span>Active<CountChip n={activeCount} active={tab === 'active'} /></span> },
              { key: 'deactive', label: <span>Deactive<CountChip n={staff.length - activeCount} active={tab === 'deactive'} /></span> },
            ]}
            style={{ marginBottom: 0 }}
          />
        </div>

        <div className="resp-toolbar" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Search by employee ID, name, contact..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage((p) => ({ ...p, current: 1 })); }}
            style={{ width: 300, maxWidth: '100%', borderRadius: 999 }}
          />
          <FiltersButton count={filterCount} onClear={clearFilters}>
            <FilterField label="Department">
              <Select allowClear placeholder="All departments" options={optionsOf(staff, 'department')} value={department} onChange={setDepartment} style={{ width: '100%' }} />
            </FilterField>
            <FilterField label="Designation">
              <Select allowClear placeholder="All designations" options={optionsOf(staff, 'designation')} value={designation} onChange={setDesignation} style={{ width: '100%' }} />
            </FilterField>
            <FilterField label="Type">
              <Select allowClear placeholder="All types" options={optionsOf(staff, 'employmentType')} value={employmentType} onChange={setEmploymentType} style={{ width: '100%' }} />
            </FilterField>
          </FiltersButton>
        </div>

        {error ? (
          <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div>
        ) : (
          <div className="table-responsive">
            <Table
              className="staff-table"
              rowKey={(r) => r.id || r.employeeId}
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              size="middle"
              onRow={(r) => ({ onClick: () => openStaff(r), style: { cursor: 'pointer' } })}
              pagination={{
                ...page,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries`,
                onChange: (current, pageSize) => setPage({ current, pageSize }),
              }}
              locale={{ emptyText: <EmptyBlock icon={<TeamOutlined />} text={`No ${tab === 'active' ? 'active' : 'deactivated'} staff found.`} /> }}
            />
          </div>
        )}
      </PanelCard>
    </div>
  );
}
