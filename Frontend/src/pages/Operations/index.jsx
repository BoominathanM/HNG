import React, { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Steps, Descriptions, Progress, Select, Typography, Space, Badge, Tooltip, Form, Input } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, TeamOutlined, ToolOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const orders = [
  { key: 1, id: 'ORD-2401', client: 'The Grand Hotel', product: 'Soap Round 50g', qty: 2000, stockAvail: 2000, status: 'Ready', approvals: { sales: true, ops: false, finance: false } },
  { key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', product: 'Shampoo 30ml Flip', qty: 3000, stockAvail: 1500, status: 'Partial', approvals: { sales: true, ops: true, finance: false } },
  { key: 3, id: 'ORD-2403', client: 'Taj Hotels', product: 'Dental Kit', qty: 3000, stockAvail: 3000, status: 'Ready', approvals: { sales: true, ops: true, finance: true } },
  { key: 4, id: 'ORD-2404', client: 'ITC Grand', product: 'Conditioner 30ml', qty: 1000, stockAvail: 0, status: 'No Stock', approvals: { sales: false, ops: false, finance: false } },
];

const employees = [
  { key: 1, name: 'Ramesh Kumar', role: 'Production Lead', tasks: 3, available: true },
  { key: 2, name: 'Meena Devi', role: 'Packing Staff', tasks: 1, available: true },
  { key: 3, name: 'Suresh T', role: 'Quality Check', tasks: 2, available: false },
  { key: 4, name: 'Kavitha S', role: 'Sticker Work', tasks: 4, available: true },
];

const stockStatus = { Ready: '#6b1240', Partial: '#C94F8A', 'No Stock': '#B11E6A' };

export default function Operations() {
  const isDark = useSelector((s) => s.theme.isDark);
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
    { title: 'Product', dataIndex: 'product', responsive: ['md'] },
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
    { title: 'Stock Status', dataIndex: 'status', render: (v) => <Tag color={stockStatus[v]}>{v}</Tag> },
    {
      title: 'Approvals', dataIndex: 'approvals',
      render: (a) => (
        <Space size={4}>
          <Tooltip title="Sales Manager"><Tag style={{ margin: 0, borderRadius: 6, background: a.sales ? '#6b124022' : '#f0f0f0', color: a.sales ? '#6b1240' : '#aaa', border: `1px solid ${a.sales ? '#6b124044' : '#ddd'}` }}>{a.sales ? '✓' : '○'} SM</Tag></Tooltip>
          <Tooltip title="Ops Head"><Tag style={{ margin: 0, borderRadius: 6, background: a.ops ? '#B11E6A22' : '#f0f0f0', color: a.ops ? '#B11E6A' : '#aaa', border: `1px solid ${a.ops ? '#B11E6A44' : '#ddd'}` }}>{a.ops ? '✓' : '○'} OH</Tag></Tooltip>
          <Tooltip title="Finance"><Tag style={{ margin: 0, borderRadius: 6, background: a.finance ? '#C94F8A22' : '#f0f0f0', color: a.finance ? '#C94F8A' : '#aaa', border: `1px solid ${a.finance ? '#C94F8A44' : '#ddd'}` }}>{a.finance ? '✓' : '○'} FIN</Tag></Tooltip>
        </Space>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedOrder(r); setModalOpen(true); }} />
          <Button size="small" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} icon={<CheckOutlined />}>Approve</Button>
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
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} bodyStyle={{ padding: '16px 12px' }}>
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
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={orders} columns={columns} pagination={{ pageSize: 6, size: 'small' }} size="small" />
        </div>
      </Card>

      {/* Employee Assignment */}
      <Card
        title={<Text strong style={{ color: textColor }}>Employee Assignment</Text>}
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={employees} columns={empColumns} pagination={false} size="small" />
        </div>
      </Card>

      {/* Order Detail Modal */}
      <Modal
        title={`Order Details: ${selectedOrder?.id}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={Math.min(800, window.innerWidth - 32)}
        footer={[
          <Button key="reject" danger icon={<CloseOutlined />}>Reject</Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Approve All</Button>,
        ]}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered size="small" layout="vertical" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order ID">{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="Client">{selectedOrder.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{selectedOrder.product}</Descriptions.Item>
              <Descriptions.Item label="Quantity">{selectedOrder.qty.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Stock Available">{selectedOrder.stockAvail.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Stock Status"><Tag style={{ borderRadius: 20, background: `${stockStatus[selectedOrder.status]}22`, color: stockStatus[selectedOrder.status], border: `1px solid ${stockStatus[selectedOrder.status]}44` }}>{selectedOrder.status}</Tag></Descriptions.Item>
            </Descriptions>
            <Steps
              current={Object.values(selectedOrder.approvals).filter(Boolean).length}
              items={[
                { title: 'Sales Manager', status: selectedOrder.approvals.sales ? 'finish' : 'wait' },
                { title: 'Operations Head', status: selectedOrder.approvals.ops ? 'finish' : selectedOrder.approvals.sales ? 'process' : 'wait' },
                { title: 'Finance', status: selectedOrder.approvals.finance ? 'finish' : selectedOrder.approvals.ops ? 'process' : 'wait' },
              ]}
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
