import React, { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Steps, Descriptions, Progress, Select, Typography, Space, Badge, Tooltip, Form, Input, Alert } from 'antd';
import { CheckOutlined, PlusOutlined, EyeOutlined, TeamOutlined, ToolOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const orders = [
  {
    key: 1, id: 'ORD-2401', client: 'The Grand Hotel', address: 'Coimbatore, TN', salesPerson: 'Priya', createdAt: '2024-01-20T10:00:00Z',
    product: 'Soap Round 50g', qty: 2000, stockAvail: 2000, orderStatus: 'Ready',
    phases: { completed: 4, total: 4 },
    phasesList: [
      { phase: 1, qty: 500, status: 'Delivered', date: '2024-01-22' },
      { phase: 2, qty: 500, status: 'Delivered', date: '2024-01-24' },
      { phase: 3, qty: 500, status: 'Delivered', date: '2024-01-26' },
      { phase: 4, qty: 500, status: 'Delivered', date: '2024-01-28' },
    ]
  },
  {
    key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', address: 'Mumbai, MH', salesPerson: 'Arun', createdAt: '2024-01-21T11:30:00Z',
    product: 'Shampoo 30ml Flip', qty: 3000, stockAvail: 1500, orderStatus: 'Draft',
    phases: { completed: 2, total: 4 },
    phasesList: [
      { phase: 1, qty: 750, status: 'Delivered', date: '2024-01-25' },
      { phase: 2, qty: 750, status: 'Delivered', date: '2024-01-27' },
      { phase: 3, qty: 750, status: 'Pending', date: '' },
      { phase: 4, qty: 750, status: 'Pending', date: '' },
    ]
  },
  {
    key: 3, id: 'ORD-2403', client: 'Taj Hotels', address: 'Delhi, DL', salesPerson: 'Priya', createdAt: '2024-01-22T14:15:00Z',
    product: 'Dental Kit', qty: 3000, stockAvail: 3000, orderStatus: 'Draft',
    phases: { completed: 0, total: 3 },
    phasesList: [
      { phase: 1, qty: 1000, status: 'Pending', date: '' },
      { phase: 2, qty: 1000, status: 'Pending', date: '' },
      { phase: 3, qty: 1000, status: 'Pending', date: '' },
    ]
  },
  {
    key: 4, id: 'ORD-2404', client: 'ITC Grand', address: 'Kolkata, WB', salesPerson: 'Karthik', createdAt: '2024-01-23T09:45:00Z',
    product: 'Conditioner 30ml', qty: 1000, stockAvail: 0, orderStatus: 'Draft',
    phases: { completed: 0, total: 1 },
    phasesList: [
      { phase: 1, qty: 1000, status: 'Pending', date: '' },
    ]
  },
];

const employees = [
  { key: 1, name: 'Ramesh Kumar', role: 'Production Lead', tasks: 3, available: true },
  { key: 2, name: 'Meena Devi', role: 'Packing Staff', tasks: 1, available: true },
  { key: 3, name: 'Suresh T', role: 'Quality Check', tasks: 2, available: false },
  { key: 4, name: 'Kavitha S', role: 'Sticker Work', tasks: 4, available: true },
];

const stockStatus = { Ready: '#6b1240', Partial: '#C94F8A', 'No Stock': '#B11E6A', Draft: '#888' };

export default function Operations() {
  const isDark = useSelector((s) => s.theme.isDark);
  const [searchText, setSearchText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignForm] = Form.useForm();
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const columns = [
    { title: 'Order', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Location', dataIndex: 'address', responsive: ['md'] },
    { title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'], render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'] },
    { title: 'Product', dataIndex: 'product', responsive: ['lg'] },
    { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString(), responsive: ['lg'] },
    {
      title: 'Stock', key: 'stock',
      render: (_, r) => (
        <div>
          <Progress
            percent={Math.round((r.stockAvail / r.qty) * 100)}
            size="small"
            strokeColor={stockStatus[r.status]}
            showInfo={false}
            style={{ marginBottom: 2 }}
          />
          <Text style={{ fontSize: 11, color: '#999' }}>{r.stockAvail.toLocaleString()}/{r.qty.toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: 'Phases', key: 'phases',
      render: (_, r) => (
        <div>
          <Progress
            percent={Math.round((r.phases.completed / r.phases.total) * 100)}
            size="small"
            strokeColor="#B11E6A"
            status={r.phases.completed === r.phases.total ? 'success' : 'active'}
          />
          <Text style={{ fontSize: 11 }}>{r.phases.completed}/{r.phases.total} Phases Done</Text>
        </div>
      )
    },
    { title: 'Status', dataIndex: 'orderStatus', render: (v) => <Tag color={stockStatus[v]}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedOrder(r); setModalOpen(true); }} />
          <Tooltip title="Assign Task">
            <Button size="small" type="primary" icon={<TeamOutlined />} style={{ background: '#B11E6A', border: 'none' }} onClick={() => { setSelectedOrder(r); setModalOpen(true); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const empColumns = [
    { title: 'Employee', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: 'Role', dataIndex: 'role', responsive: ['sm'] },
    { title: 'Active Tasks', dataIndex: 'tasks', render: (v) => <Badge count={v} style={{ background: '#B11E6A' }} /> },
    { title: 'Status', dataIndex: 'available', render: (v) => <Tag style={{ borderRadius: 20, background: v ? '#6b124022' : '#B11E6A22', color: v ? '#6b1240' : '#B11E6A', border: `1px solid ${v ? '#6b124044' : '#B11E6A44'}` }}>{v ? 'Available' : 'Busy'}</Tag> },
    {
      title: 'Assign', key: 'assign',
      render: (_, r) => (
        <Button size="small" type="primary" icon={<TeamOutlined />}
          onClick={() => { setSelectedEmployee(r); setAssignModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
          Assign Task
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Operations" items={[{ label: 'Operations' }]} />

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending Approval', val: 8, color: '#C94F8A' },
          { label: 'In Production', val: 14, color: '#B11E6A' },
          { label: 'Partial Orders', val: 3, color: '#8a1652' },
          { label: 'Completed Today', val: 5, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 12px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Order Approval Table */}
      <Card
        title={<Text strong style={{ color: textColor }}>Order Approval Queue</Text>}
        extra={
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search orders, clients..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 250, borderRadius: 8 }}
          />
        }
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table
            dataSource={orders.filter(o => !searchText || o.id.toLowerCase().includes(searchText.toLowerCase()) || o.client.toLowerCase().includes(searchText.toLowerCase()) || o.address.toLowerCase().includes(searchText.toLowerCase()))}
            columns={columns}
            pagination={{ pageSize: 6, size: 'small' }}
            size="small"
          />
        </div>
      </Card>

      {/* Employee Assignment */}
      <Card
        title={<Text strong style={{ color: textColor }}>Employee Assignment</Text>}
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={employees} columns={empColumns} pagination={false} size="small" />
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Modal
        title={
          <Space>
            <ToolOutlined style={{ color: '#B11E6A' }} />
            <span>Operation Details: {selectedOrder?.id}</span>
            <Tag color={stockStatus[selectedOrder?.orderStatus]}>{selectedOrder?.orderStatus}</Tag>
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={Math.min(900, window.innerWidth - 32)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>Close</Button>,
          <Button key="split" icon={<PlusOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Add New Phase</Button>,
        ]}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions bordered size="small" layout="vertical" column={3} style={{ background: isDark ? '#1a1a2e' : '#fafafa', borderRadius: 8 }}>
              <Descriptions.Item label="Client">{selectedOrder.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{selectedOrder.product}</Descriptions.Item>
              <Descriptions.Item label="Sales Person">{selectedOrder.salesPerson}</Descriptions.Item>
              <Descriptions.Item label="Total Quantity">{selectedOrder.qty.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Stock Available">{selectedOrder.stockAvail.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Overall Progress">
                <Progress percent={Math.round((selectedOrder.phases.completed / selectedOrder.phases.total) * 100)} size="small" strokeColor="#B11E6A" />
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TeamOutlined style={{ color: '#B11E6A' }} /> Phase-wise Task Assignment
              </Title>
              <Table
                dataSource={selectedOrder.phasesList}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Phase', dataIndex: 'phase', render: (v) => <Text strong>Phase {v}</Text> },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => `${v.toLocaleString()}` },
                  { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'Delivered' ? 'success' : 'processing'}>{s}</Tag> },
                  { title: 'Delivery Date', dataIndex: 'date', render: (d) => d || '—' },
                  {
                    title: 'Action',
                    render: (_, p) => p.status !== 'Delivered' && (
                      <Space>
                        <Button size="small" type="primary" style={{ background: '#B11E6A', border: 'none' }} onClick={() => setAssignModalOpen(true)}>Assign Task</Button>
                        <Button size="small" icon={<CheckOutlined />} style={{ color: 'success' }}>Mark Delivered</Button>
                      </Space>
                    )
                  }
                ]}
              />
            </div>

            <Alert
              message="Partial Assignment Logic"
              description={`Currently you have ${selectedOrder.stockAvail.toLocaleString()} units in stock. You can fulfill ${Math.min(selectedOrder.qty, selectedOrder.stockAvail).toLocaleString()} units out of ${selectedOrder.qty.toLocaleString()}.`}
              type={selectedOrder.stockAvail >= selectedOrder.qty ? "success" : "warning"}
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* Assign Task Modal */}
      <Modal
        title={`Assign Task to ${selectedEmployee?.name}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignModalOpen(false)}>Cancel</Button>,
          <Button key="assign" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} onClick={() => setAssignModalOpen(false)}>Assign Task</Button>
        ]}
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Task Title" name="title" rules={[{ required: true }]}>
                <Input placeholder="e.g. Quality Check Phase 2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Related Order" name="orderId">
                <Select placeholder="Select Order" allowClear>
                  {['ORD-2401', 'ORD-2402', 'ORD-2403', 'ORD-2404', 'ORD-2406'].map((o) => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Hotel / Company" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select Client" allowClear>
                  {['The Grand Hotel', 'Marriott Mumbai', 'Taj Hotels', 'ITC Grand', 'Hotel Blue Star'].map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Due Date" name="due"><Input type="date" /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="End Time" name="endTime"><Input type="time" /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
