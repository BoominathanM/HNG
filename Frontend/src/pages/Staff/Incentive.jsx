// Incentive Management — per-staff incentive eligibility, target vs achieved
// (GET /admin/staff/incentive?month=October 2026 → data.eligible[] /
// data.notEligible[] / data.departments[]).
import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Modal, Row, Select, Table, Tabs } from 'antd';
import { RiseOutlined, UserAddOutlined, CheckOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useGetHrIncentivesQuery } from '../../store/api/apiSlice';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { pick, asText, fmtMoney, downloadCsv, STAFF_FIELDS, staffName, BRAND } from './shared/hrUtils';
import {
  PanelCard, PageHeaderCard, MetricCard, StaffCell, StatusTag, EmptyBlock, FiltersButton, FilterField, ObjectDetails, LoadError,
} from './shared/StaffUi';
import useSurface from './shared/useSurface';

const NONE = [];

const STATUS_PATHS = ['status', 'incentiveStatus'];
const BRANCH_PATHS = ['branch', 'branchName', 'branchId'];
const TARGET_PATHS = ['target', 'targetValue'];
const ACHIEVED_PATHS = ['achieved', 'achievedValue', 'actual'];
const INCENTIVE_PATHS = ['incentiveAmount', 'incentive', 'amount'];

const staffOf = (r) => {
  const ref = pick(r, ['staffId', 'staff', 'employee', 'user']);
  return ref && typeof ref === 'object' ? ref : r;
};
// EktaHR reports "No Data" until target/achieved are entered — its own UI
// shows that as "Awaiting Data". Not-eligible rows carry no status.
const statusText = (r) => {
  const st = asText(pick(r, STATUS_PATHS));
  if (!st) return r.eligible === false ? 'Not Eligible' : 'Awaiting Data';
  return /^no data$/i.test(st) ? 'Awaiting Data' : st;
};
const branchOf = (r) => asText(pick(r, BRANCH_PATHS)) || asText(pick(staffOf(r), BRANCH_PATHS));
const optionsOf = (rows, get) => [...new Set(rows.map(get).filter(Boolean))].sort().map((v) => ({ value: v, label: v }));

const TabLabel = ({ dot, text, n, on }) => (
  <span>
    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: dot, marginRight: 6, verticalAlign: 'middle' }} />
    {text}
    <span style={{ marginLeft: 6, padding: '0 7px', borderRadius: 999, fontSize: 11, background: on ? 'rgba(177,30,106,0.14)' : 'rgba(0,0,0,0.06)', color: on ? BRAND : '#888' }}>{n}</span>
  </span>
);

export default function Incentive() {
  const s = useSurface();
  const [tab, setTab] = useState('yes');
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [department, setDepartment] = useState();
  const [branch, setBranch] = useState();
  const [selected, setSelected] = useState(null);
  const { data, isFetching, error, refetch } = useGetHrIncentivesQuery(month.format('MMMM YYYY'));
  const eligible = data?.data?.eligible || NONE;
  const notEligible = data?.data?.notEligible || NONE;
  const records = useMemo(() => [...eligible, ...notEligible], [eligible, notEligible]);
  const departmentOptions = (data?.data?.departments || []).map((d) => ({ value: d, label: d }));

  const visible = useMemo(() => (tab === 'yes' ? eligible : notEligible).filter((r) => (!department || asText(pick(staffOf(r), STAFF_FIELDS.department)) === department)
    && (!branch || branchOf(r) === branch)), [eligible, notEligible, tab, department, branch]);

  const approvedTotal = eligible
    .filter((r) => /approved/i.test(statusText(r)))
    .reduce((t, r) => t + (Number(pick(r, INCENTIVE_PATHS)) || 0), 0);

  const columns = [
    { title: 'Employee', key: 'employee', render: (_, r) => <StaffCell name={staffName(staffOf(r))} employeeId={asText(pick(staffOf(r), STAFF_FIELDS.employeeId))} /> },
    { title: 'Department', key: 'department', render: (_, r) => asText(pick(staffOf(r), STAFF_FIELDS.department)) || '—' },
    { title: 'Branch', key: 'branch', render: (_, r) => branchOf(r) || '—' },
    { title: 'Target', key: 'target', align: 'center', render: (_, r) => asText(pick(r, TARGET_PATHS)) || '—' },
    { title: 'Achieved', key: 'achieved', align: 'center', render: (_, r) => asText(pick(r, ACHIEVED_PATHS)) || '—' },
    { title: 'Incentive', key: 'incentive', align: 'center', render: (_, r) => fmtMoney(pick(r, INCENTIVE_PATHS)) || '—' },
    { title: 'Status', key: 'status', align: 'center', render: (_, r) => <StatusTag status={statusText(r)} /> },
    { title: 'Action', key: 'action', align: 'right', render: (_, r) => <Button type="text" icon={<EyeOutlined />} onClick={() => setSelected(r)} /> },
  ];

  const exportCsv = () => downloadCsv(`incentives-${month.format('YYYY-MM')}-${tab === 'yes' ? 'eligible' : 'not-eligible'}.csv`, [
    { title: 'Employee', value: (r) => staffName(staffOf(r)) },
    { title: 'Employee ID', value: (r) => asText(pick(staffOf(r), STAFF_FIELDS.employeeId)) },
    { title: 'Department', value: (r) => asText(pick(staffOf(r), STAFF_FIELDS.department)) },
    { title: 'Branch', value: branchOf },
    { title: 'Target', value: (r) => asText(pick(r, TARGET_PATHS)) },
    { title: 'Achieved', value: (r) => asText(pick(r, ACHIEVED_PATHS)) },
    { title: 'Incentive', value: (r) => asText(pick(r, INCENTIVE_PATHS)) },
    { title: 'Status', value: statusText },
  ], visible);

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Incentive' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          icon={<RiseOutlined />}
          title="Incentive Management"
          extra={<Button type="primary" shape="round" icon={<DownloadOutlined />} disabled={!visible.length} onClick={exportCsv}>Export</Button>}
        />

        <Row gutter={[14, 14]}>
          <Col xs={24} md={8}>
            <MetricCard label="Eligible Employees" value={eligible.length} hint={`${notEligible.length} not eligible`} icon={<UserAddOutlined />} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard label="Pending Approval" value={eligible.filter((r) => /pending/i.test(statusText(r))).length} hint={month.format('MMMM YYYY')} icon={<RiseOutlined />} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard label="Approved for Payroll" value={fmtMoney(approvedTotal)} hint="Added as an earning" icon={<CheckOutlined />} color="#389e0d" />
          </Col>
        </Row>

        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '4px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${s.border}` }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              style={{ marginBottom: -1 }}
              items={[
                { key: 'yes', label: <TabLabel dot="#52c41a" text="Incentive Eligible — Yes" n={eligible.length} on={tab === 'yes'} /> },
                { key: 'no', label: <TabLabel dot="#bfbfbf" text="Incentive Eligible — No" n={notEligible.length} on={tab === 'no'} /> },
              ]}
            />
            <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
              <FiltersButton count={[department, branch].filter(Boolean).length} onClear={() => { setDepartment(undefined); setBranch(undefined); }}>
                <FilterField label="Department">
                  <Select allowClear placeholder="All departments" style={{ width: '100%' }} value={department} onChange={setDepartment}
                    options={departmentOptions.length ? departmentOptions : optionsOf(records, (r) => asText(pick(staffOf(r), STAFF_FIELDS.department)))} />
                </FilterField>
                <FilterField label="Branch">
                  <Select allowClear placeholder="All branches" style={{ width: '100%' }} value={branch} onChange={setBranch} options={optionsOf(records, branchOf)} />
                </FilterField>
              </FiltersButton>
              <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} format="MMMM YYYY" style={{ borderRadius: 999 }} />
            </div>
          </div>
          {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
          <div className="table-responsive">
            <Table
              className="staff-table"
              size="middle"
              rowKey={(r, i) => r.staffId || r.id || i}
              dataSource={visible}
              columns={columns}
              loading={isFetching}
              pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
              locale={{ emptyText: <EmptyBlock icon={<RiseOutlined />} text={`No ${tab === 'yes' ? 'eligible' : 'non-eligible'} employees for ${month.format('MMMM YYYY')}.`} /> }}
            />
          </div>
          )}
        </PanelCard>
      </div>

      <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={520} title={selected ? `Incentive · ${staffName(staffOf(selected))}` : ''}>
        <div style={{ marginTop: 12 }}><ObjectDetails data={selected} /></div>
      </Modal>
    </div>
  );
}
