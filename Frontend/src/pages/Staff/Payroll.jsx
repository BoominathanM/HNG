// Payroll Management — the month's payroll run across staff
// (GET /admin/staff/payroll?month=October 2026 → flat rows: name, employeeId,
// department, designation, gross, deductions, netPay, status).
import React, { useMemo, useState } from 'react';
import { Button, Col, Descriptions, Input, Modal, Row, Select, Table, Typography } from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetHrPayrollQuery } from '../../store/api/apiSlice';
import { pick, asText, fmtMoney, toList, STAFF_FIELDS, staffName } from './shared/hrUtils';
import { PanelCard, PageHeaderCard, MetricCard, StaffCell, StatusTag, EmptyBlock, LoadError } from './shared/StaffUi';
import useSurface from './shared/useSurface';

const { Text } = Typography;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: dayjs().month(i).format('MMMM') }));
const YEARS = Array.from({ length: 6 }, (_, i) => dayjs().year() - 4 + i).map((y) => ({ value: y, label: String(y) }));

const num = (r, paths) => Number(pick(r, paths)) || 0;
const grossOf = (r) => num(r, ['gross', 'grossSalary']);
const deductionsOf = (r) => num(r, ['deductions', 'totalDeductions']);
const netOf = (r) => num(r, ['netPay', 'netSalary', 'net']);
const statusOf = (r) => asText(pick(r, ['status', 'payrollStatus']));
const isProcessed = (r) => /processed|approved|paid/i.test(statusOf(r) || '');

function Filter({ label, children }) {
  const s = useSurface();
  return (
    <div>
      <Text strong style={{ fontSize: 12.5, color: s.text, display: 'block', marginBottom: 6 }}>{label}</Text>
      {children}
    </div>
  );
}

export default function Payroll() {
  const s = useSurface();
  const [month, setMonth] = useState(() => dayjs().month());
  const [year, setYear] = useState(() => dayjs().year());
  const [status, setStatus] = useState('All');
  const [department, setDepartment] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const period = `${MONTHS[month].label} ${year}`;
  const { data, isFetching, error, refetch } = useGetHrPayrollQuery(period);
  const records = useMemo(() => toList(data), [data]);

  const optionsFrom = (get) => ['All', ...new Set(records.map(get).filter(Boolean))].map((v) => ({ value: v, label: v }));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => (status === 'All' || statusOf(r) === status)
      && (department === 'All' || asText(pick(r, STAFF_FIELDS.department)) === department)
      && (!q || [staffName(r), asText(pick(r, STAFF_FIELDS.employeeId))].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [records, status, department, search]);

  const totals = useMemo(() => visible.reduce((t, r) => ({
    gross: t.gross + grossOf(r), deductions: t.deductions + deductionsOf(r), net: t.net + netOf(r),
  }), { gross: 0, deductions: 0, net: 0 }), [visible]);
  const money = (n) => `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const columns = [
    { title: 'Employee', key: 'employee', render: (_, r) => <StaffCell name={staffName(r)} employeeId={asText(pick(r, STAFF_FIELDS.employeeId))} /> },
    { title: 'Department', key: 'department', render: (_, r) => asText(pick(r, STAFF_FIELDS.department)) || '—' },
    { title: 'Designation', key: 'designation', render: (_, r) => asText(pick(r, STAFF_FIELDS.designation)) || '—' },
    { title: 'Gross', key: 'gross', align: 'right', render: (_, r) => fmtMoney(grossOf(r)) },
    { title: 'Deductions', key: 'deductions', align: 'right', render: (_, r) => fmtMoney(deductionsOf(r)) },
    { title: 'Net Pay', key: 'net', align: 'right', render: (_, r) => <Text strong>{fmtMoney(netOf(r))}</Text> },
    { title: 'Status', key: 'status', render: (_, r) => <StatusTag status={statusOf(r)} /> },
    { title: 'Actions', key: 'actions', align: 'right', render: (_, r) => <Button type="text" icon={<EyeOutlined />} onClick={() => setSelected(r)} /> },
  ];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Payroll' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          icon={<span style={{ fontWeight: 700 }}>₹</span>}
          title="Payroll Management"
          extra={<Button shape="round" icon={<ReloadOutlined />} loading={isFetching} onClick={refetch}>Refresh</Button>}
        />

        <PanelCard bodyStyle={{ padding: 16 }}>
          <Row gutter={[14, 12]}>
            <Col xs={12} md={8} lg={4}><Filter label="Month"><Select value={month} onChange={setMonth} options={MONTHS} style={{ width: '100%' }} /></Filter></Col>
            <Col xs={12} md={8} lg={4}><Filter label="Year"><Select value={year} onChange={setYear} options={YEARS} style={{ width: '100%' }} /></Filter></Col>
            <Col xs={12} md={8} lg={5}><Filter label="Status"><Select value={status} onChange={setStatus} options={optionsFrom(statusOf)} style={{ width: '100%' }} /></Filter></Col>
            <Col xs={12} md={8} lg={5}>
              <Filter label="Department">
                <Select value={department} onChange={setDepartment} options={optionsFrom((r) => asText(pick(r, STAFF_FIELDS.department)))} style={{ width: '100%' }} />
              </Filter>
            </Col>
            <Col xs={24} md={16} lg={6}>
              <Filter label="Search">
                <Input allowClear prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Search by employee name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </Filter>
            </Col>
          </Row>
        </PanelCard>

        <Row gutter={[14, 14]}>
          <Col xs={12} lg={6}><MetricCard label="Gross Salary" value={money(totals.gross)} hint={period} icon={<span style={{ fontWeight: 700 }}>₹</span>} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Deductions" value={money(totals.deductions)} hint="PF, ESI, Tax" icon={<span style={{ fontWeight: 700 }}>₹</span>} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Net Payable" value={money(totals.net)} hint="Ready to disburse" icon={<CheckCircleOutlined />} /></Col>
          <Col xs={12} lg={6}><MetricCard label="Processed" value={visible.filter(isProcessed).length} hint={`Out of ${visible.length}`} icon={<ClockCircleOutlined />} /></Col>
        </Row>

        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${s.border}` }}>
            <Text strong style={{ fontSize: 15, color: s.text }}>Employee Payroll Details</Text>
          </div>
          {error ? <div style={{ padding: 16 }}><LoadError error={error} onRetry={refetch} /></div> : (
            <div className="table-responsive">
              <Table
                className="staff-table"
                size="middle"
                rowKey={(r, i) => r.id || r._id || i}
                dataSource={visible}
                columns={columns}
                loading={isFetching}
                onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
                pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
                locale={{ emptyText: <EmptyBlock text={records.length ? 'No payroll entries match the active search and filter settings.' : `No payroll generated for ${period}.`} /> }}
              />
            </div>
          )}
        </PanelCard>
      </div>

      <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={480} title={selected ? `Payroll · ${period}` : ''}>
        {selected && (
          <Descriptions
            bordered
            size="small"
            column={1}
            style={{ marginTop: 12 }}
            items={[
              ['Employee', staffName(selected)],
              ['Employee ID', asText(pick(selected, STAFF_FIELDS.employeeId)) || '—'],
              ['Department', asText(pick(selected, STAFF_FIELDS.department)) || '—'],
              ['Designation', asText(pick(selected, STAFF_FIELDS.designation)) || '—'],
              ['Gross', fmtMoney(grossOf(selected))],
              ['Deductions', fmtMoney(deductionsOf(selected))],
              ['Net Pay', <Text strong key="net">{fmtMoney(netOf(selected))}</Text>],
              ['Status', <StatusTag key="st" status={statusOf(selected)} />],
            ].map(([label, children]) => ({ key: label, label, children }))}
          />
        )}
      </Modal>
    </div>
  );
}
