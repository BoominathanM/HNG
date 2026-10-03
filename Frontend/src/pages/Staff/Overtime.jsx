// Overtime Management — scheduled overtime requests across staff
// (GET /admin/staff/overtime/list → data.requests[], staffId populated).
import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Descriptions, Input, Modal, Row, Select, Table } from 'antd';
import {
  ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, EyeOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetHrOvertimeListQuery } from '../../store/api/apiSlice';
import { pick, asText, fmtDate, fmtDateRange, toList, STAFF_FIELDS, staffName } from './shared/hrUtils';
import {
  PanelCard, PageHeaderCard, MetricCard, StaffCell, StatusTag, EmptyBlock, FiltersButton, FilterField, LoadError,
} from './shared/StaffUi';
import useSurface from './shared/useSurface';

const STATUSES = ['Pending', 'Accepted', 'Rejected', 'Expired'];

const staffOf = (r) => {
  const ref = pick(r, ['staffId', 'staff', 'employee']);
  return ref && typeof ref === 'object' ? ref : r;
};
const statusOf = (r) => String(asText(pick(r, ['status'])) || '').toLowerCase();
const optionsOf = (rows, get) => [...new Set(rows.map(get).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));
// Single-date schedules carry `date`; ranges carry startDate/endDate.
const scheduledOf = (r) => fmtDate(pick(r, ['date'])) || fmtDateRange(pick(r, ['startDate']), pick(r, ['endDate']));
const hrs = (v) => (v == null ? undefined : `${v} hrs`);

export default function Overtime() {
  const s = useSurface();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState(null);
  const [department, setDepartment] = useState();
  const [type, setType] = useState();
  const [selected, setSelected] = useState(null);

  const { data, isFetching, error, refetch } = useGetHrOvertimeListQuery();
  const records = useMemo(() => toList(data), [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const staff = staffOf(r);
      return (status === 'all' || statusOf(r) === status)
        && (!date || dayjs(pick(r, ['date', 'startDate'])).isSame(date, 'day'))
        && (!department || asText(pick(staff, STAFF_FIELDS.department)) === department)
        && (!type || asText(pick(r, ['scheduleType'])) === type)
        && (!q || [staffName(staff), pick(staff, STAFF_FIELDS.employeeId), pick(staff, STAFF_FIELDS.designation)]
          .some((v) => String(asText(v) || '').toLowerCase().includes(q)));
    });
  }, [records, search, status, date, department, type]);

  const count = (st) => records.filter((r) => statusOf(r) === st).length;

  const columns = [
    {
      title: 'Employee', key: 'employee',
      render: (_, r) => <StaffCell name={staffName(staffOf(r))} employeeId={asText(pick(staffOf(r), STAFF_FIELDS.employeeId))} />,
    },
    { title: 'Department', key: 'department', render: (_, r) => asText(pick(staffOf(r), STAFF_FIELDS.department)) || '—' },
    { title: 'Scheduled Date', key: 'date', render: (_, r) => scheduledOf(r) || '—' },
    { title: 'Type', key: 'type', render: (_, r) => asText(pick(r, ['scheduleType'])) || '—' },
    { title: 'Notes', key: 'notes', ellipsis: true, render: (_, r) => asText(pick(r, ['notes', 'note'])) || '—' },
    { title: 'Status', key: 'status', render: (_, r) => <StatusTag status={pick(r, ['status'])} /> },
    { title: 'Actions', key: 'actions', align: 'right', render: (_, r) => <Button type="text" icon={<EyeOutlined />} onClick={() => setSelected(r)} /> },
  ];

  const detailItems = selected ? [
    ['Employee', staffName(staffOf(selected))],
    ['Employee ID', asText(pick(staffOf(selected), STAFF_FIELDS.employeeId))],
    ['Department', asText(pick(staffOf(selected), STAFF_FIELDS.department))],
    ['Scheduled Date', scheduledOf(selected)],
    ['Type', asText(selected.scheduleType)],
    ['Notes', asText(selected.notes)],
    ['Status', <StatusTag key="st" status={selected.status} />],
    ['Requested By', asText(selected.requestedBy)],
    ['Requested At', fmtDate(selected.requestedAt, 'MMM D, YYYY hh:mm A')],
    ['Responded On', fmtDate(selected.responseDate, 'MMM D, YYYY hh:mm A')],
    ['Configured Work Hours', hrs(selected.configuredWorkHours)],
    ['Actual Work Hours', hrs(selected.actualWorkHours)],
    ['OT Hours Worked', hrs(selected.otHoursWorked)],
    ['OT Rate', selected.otRateMultiplier != null ? `${selected.otRateMultiplier}×` : undefined],
  ].filter(([, v]) => v != null && v !== '').map(([label, children]) => ({ key: label, label, children })) : [];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Overtime' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          title="Overtime Management"
          subtitle="Schedule and track employee overtime requests. Requests require employee acceptance to take effect."
          extra={<Button shape="round" icon={<ReloadOutlined />} loading={isFetching} onClick={refetch}>Refresh</Button>}
        />

        <Row gutter={[14, 14]}>
          <Col xs={12} lg={6}><MetricCard label="Total Requests" value={records.length} icon={<ClockCircleOutlined />} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Pending" value={count('pending')} icon={<ExclamationCircleOutlined />} color="#d48806" /></Col>
          <Col xs={12} lg={6}><MetricCard label="Accepted" value={count('accepted')} icon={<CheckCircleOutlined />} color="#389e0d" /></Col>
          <Col xs={12} lg={6}><MetricCard label="Rejected" value={count('rejected')} icon={<CloseCircleOutlined />} color="#cf1322" /></Col>
        </Row>

        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="Search by name, ID or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280, maxWidth: '100%', borderRadius: 999 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Select
                value={status}
                onChange={setStatus}
                style={{ width: 140 }}
                options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map((v) => ({ value: v.toLowerCase(), label: v }))]}
              />
              <DatePicker value={date} onChange={setDate} format="DD-MM-YYYY" placeholder="dd-mm-yyyy" />
              <FiltersButton count={[department, type].filter(Boolean).length} onClear={() => { setDepartment(undefined); setType(undefined); }}>
                <FilterField label="Department">
                  <Select allowClear placeholder="All departments" style={{ width: '100%' }} value={department} onChange={setDepartment}
                    options={optionsOf(records, (r) => asText(pick(staffOf(r), STAFF_FIELDS.department)))} />
                </FilterField>
                <FilterField label="Type">
                  <Select allowClear placeholder="All types" style={{ width: '100%' }} value={type} onChange={setType}
                    options={optionsOf(records, (r) => asText(pick(r, ['scheduleType'])))} />
                </FilterField>
              </FiltersButton>
            </div>
          </div>
          {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
            <div className="table-responsive">
              <Table
                className="staff-table"
                size="middle"
                rowKey={(r, i) => r._id || i}
                dataSource={visible}
                columns={columns}
                loading={isFetching}
                onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
                locale={{ emptyText: <EmptyBlock icon={<ClockCircleOutlined />} title="No overtime requests found" text="Try adjusting your search criteria." /> }}
              />
            </div>
          )}
        </PanelCard>
      </div>

      <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={520} title="Overtime Request">
        <Descriptions bordered size="small" column={1} items={detailItems} style={{ marginTop: 12 }} />
      </Modal>
    </div>
  );
}
