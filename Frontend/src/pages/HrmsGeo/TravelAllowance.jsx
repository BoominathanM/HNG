// Travel Allowance — claims from GET /admin/hrms-geo/travel-allowance
// (optional ?staffId&date). With both a staff member and a date picked, the
// day's distance calculation comes from GET /admin/hrms-geo/task/travel-allowance.
import React, { useMemo, useState } from 'react';
import { Button, Col, DatePicker, Descriptions, Modal, Row, Select, Skeleton, Table, Typography } from 'antd';
import { DownloadOutlined, EyeOutlined, NodeIndexOutlined } from '@ant-design/icons';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetGeoTravelAllowancesQuery, useGetGeoEmployeeAccessQuery, useGetGeoTaskTravelAllowanceQuery,
} from '../../store/api/apiSlice';
import { asText, fmtMoney, fmtDate, toList, downloadCsv } from '../Staff/shared/hrUtils';
import {
  PanelCard, PanelTitle, PageHeaderCard, MetricCard, StatusTag, EmptyBlock, LoadError, FiltersButton, FilterField,
} from '../Staff/shared/StaffUi';
import useSurface from '../Staff/shared/useSurface';
import { kmText } from './shared/geoUtils';

const { Text } = Typography;

const money1 = (v) => (v == null ? undefined : `₹${(Math.round(Number(v) * 100) / 100).toFixed(2)}`);
const transportOf = (r) => asText(r.transport?.name) || r.transportName;
const rateOf = (r) => r.ratePerKm ?? r.transport?.rate;
const isUrl = (v) => typeof v === 'string' && /^(https?:|data:image\/)/i.test(v);

function DistanceCalc({ staffId, date }) {
  const s = useSurface();
  const { data, isFetching, error, refetch } = useGetGeoTaskTravelAllowanceQuery({ staffId, date });
  if (isFetching) return <PanelCard><Skeleton active paragraph={{ rows: 2 }} /></PanelCard>;
  if (error) return <LoadError error={error} onRetry={refetch} />;
  const tasks = data?.tasks || [];
  return (
    <PanelCard bodyStyle={{ padding: 16 }}>
      <PanelTitle
        icon={<NodeIndexOutlined />}
        title={`Distance Calculation · ${asText(data?.staff?.name) || ''}`}
        subtitle={`Completed geofenced tasks on ${fmtDate(date)}`}
        extra={<Text strong style={{ color: s.text }}>{kmText(data?.totalDistanceKm ?? 0)} · <span style={{ color: '#389e0d' }}>{fmtMoney(data?.totalGeneratedAmount ?? 0)}</span></Text>}
      />
      <div style={{ marginTop: 10 }}>
        {!tasks.length ? <Text style={{ color: s.muted, fontSize: 13 }}>No completed tasks on this date.</Text> : (
          <Table
            size="small"
            pagination={false}
            rowKey={(t, i) => t._id || t.taskId || i}
            dataSource={tasks}
            columns={[
              { title: 'Task', render: (_, t) => asText(t.title || t.taskNumber || t.id || t.taskId) || '—' },
              { title: 'Customer / Branch', render: (_, t) => asText(t.customerName || t.branch || t.locationName) || '—' },
              { title: 'Distance', align: 'right', render: (_, t) => kmText(t.distanceKm) || '—' },
            ]}
          />
        )}
      </div>
    </PanelCard>
  );
}

export default function GeoTravelAllowance() {
  const s = useSurface();
  const [staffId, setStaffId] = useState();
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState();
  const [selected, setSelected] = useState(null);

  const day = date?.format('YYYY-MM-DD');
  const { data, isFetching, error, refetch } = useGetGeoTravelAllowancesQuery({ staffId, date: day });
  const { data: staffRes } = useGetGeoEmployeeAccessQuery();
  const claims = useMemo(() => toList(data), [data]);
  const staffOptions = useMemo(() => toList(staffRes).map((e) => ({ value: e.id, label: `${e.name} (${e.employeeId})` })), [staffRes]);
  const statusOptions = useMemo(() => [...new Set(claims.map((c) => c.status).filter(Boolean))].map((v) => ({ value: v, label: v })), [claims]);

  const rows = useMemo(() => claims.filter((c) => !status || c.status === status), [claims, status]);
  const totalKm = rows.reduce((t, c) => t + (Number(c.totalDistanceKm) || 0), 0);
  const totalGenerated = rows.reduce((t, c) => t + (Number(c.generatedAmount) || 0), 0);

  const columns = [
    { title: 'Staff Member', key: 'staff', render: (_, r) => <Text strong>{r.staffName || '—'}</Text> },
    { title: 'Reimbursement Date', key: 'date', render: (_, r) => r.date || '—' },
    { title: 'Transport', key: 'transport', render: (_, r) => <Text strong>{transportOf(r) || '—'}</Text> },
    { title: 'Total Distance', key: 'distance', render: (_, r) => <Text strong>{kmText(r.totalDistanceKm) || '—'}</Text> },
    { title: 'Rate', key: 'rate', render: (_, r) => (rateOf(r) != null ? `₹${rateOf(r)}/km` : '—') },
    { title: 'Generated Amount', key: 'generated', render: (_, r) => <Text strong style={{ color: '#389e0d' }}>{money1(r.generatedAmount) || '—'}</Text> },
    { title: 'Revised Amount', key: 'revised', render: (_, r) => (r.revisedAmount != null ? <Text strong style={{ color: '#d48806' }}>{money1(r.revisedAmount)}</Text> : '—') },
    { title: 'Status', key: 'status', render: (_, r) => <StatusTag status={r.status} /> },
    { title: 'Actions', key: 'actions', align: 'right', render: (_, r) => <Button size="small" shape="round" icon={<EyeOutlined />} onClick={() => setSelected(r)}>View Details</Button> },
  ];

  const exportCsv = () => downloadCsv('travel-allowance.csv', [
    { title: 'Staff Member', value: (r) => r.staffName },
    { title: 'Date', value: (r) => r.date },
    { title: 'Transport', value: transportOf },
    { title: 'Total Distance (km)', value: (r) => r.totalDistanceKm },
    { title: 'Rate (₹/km)', value: rateOf },
    { title: 'Generated Amount', value: (r) => r.generatedAmount },
    { title: 'Revised Amount', value: (r) => r.revisedAmount },
    { title: 'Status', value: (r) => r.status },
    { title: 'Payment Route', value: (r) => r.paymentRoute },
    { title: 'Payroll Month', value: (r) => r.payrollMonth },
  ], rows);

  const detailItems = selected ? [
    ['Staff Member', selected.staffName],
    ['Date', selected.date],
    ['Transport', [transportOf(selected), rateOf(selected) != null && `₹${rateOf(selected)}/km`].filter(Boolean).join(' · ')],
    ['Total Distance', kmText(selected.totalDistanceKm)],
    ['Generated Amount', money1(selected.generatedAmount)],
    ['Revised Amount', money1(selected.revisedAmount)],
    ['Status', <StatusTag key="s" status={selected.status} />],
    ['Payment Route', [selected.paymentRoute, selected.payrollMonth].filter(Boolean).join(' · ')],
    ['Description', selected.description],
    ['Tasks', (selected.tasks || []).map((t) => `${t.taskNumber || t.taskId} (${kmText(t.distanceKm)})`).join(', ')],
    ['Proof', isUrl(selected.proofImg) ? <a key="p" href={selected.proofImg} target="_blank" rel="noreferrer">View proof</a> : selected.proofImg],
  ].filter(([, v]) => v != null && v !== '' && v !== false).map(([label, children]) => ({ key: label, label, children })) : [];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'HRMS Geo', path: '/hrms-geo' }, { label: 'Travel Allowance' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          icon={<span style={{ fontWeight: 700 }}>₹</span>}
          title="Travel Allowance"
          subtitle="Review geofenced completed tasks travel allowance records and historical transport rates."
        />
        <Row gutter={[14, 14]}>
          <Col xs={24} md={12}><MetricCard label="Total Distance (All Claims)" value={kmText(totalKm)} icon={<NodeIndexOutlined />} /></Col>
          <Col xs={24} md={12}><MetricCard label="Total Generated (All Claims)" value={money1(totalGenerated)} icon={<span style={{ fontWeight: 700 }}>₹</span>} color="#389e0d" /></Col>
        </Row>

        {staffId && day && <DistanceCalc staffId={staffId} date={day} />}

        <PanelCard bodyStyle={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${s.border}` }}>
            <PanelTitle
              title="Travel Allowance Records"
              extra={(
                <>
                  <FiltersButton count={[staffId, date, status].filter(Boolean).length} onClear={() => { setStaffId(undefined); setDate(null); setStatus(undefined); }}>
                    <FilterField label="Staff">
                      <Select allowClear showSearch optionFilterProp="label" placeholder="All staff" style={{ width: '100%' }} value={staffId} onChange={setStaffId} options={staffOptions} />
                    </FilterField>
                    <FilterField label="Date">
                      <DatePicker value={date} onChange={setDate} style={{ width: '100%' }} />
                    </FilterField>
                    <FilterField label="Status">
                      <Select allowClear placeholder="All statuses" style={{ width: '100%' }} value={status} onChange={setStatus} options={statusOptions} />
                    </FilterField>
                  </FiltersButton>
                  <Button type="primary" shape="round" icon={<DownloadOutlined />} disabled={!rows.length} onClick={exportCsv}>Export CSV</Button>
                </>
              )}
            />
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
                pagination={{ defaultPageSize: 10, showSizeChanger: true, showTotal: (t, [a, b]) => `Showing ${a} to ${b} of ${t} entries` }}
                locale={{ emptyText: <EmptyBlock icon={<NodeIndexOutlined />} text="No travel allowance claims found." /> }}
              />
            </div>
          )}
        </PanelCard>
      </div>

      <Modal open={!!selected} onCancel={() => setSelected(null)} footer={null} width={560} title="Travel Allowance Claim">
        <Descriptions bordered size="small" column={1} items={detailItems} style={{ marginTop: 12 }} />
      </Modal>
    </div>
  );
}
