import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Steps, Descriptions, Progress, Select,
  Typography, Space, Badge, Tooltip, Form, Input, Alert, Tabs, Divider, Upload, DatePicker,
} from 'antd';
import {
  CheckOutlined, PlusOutlined, EyeOutlined, TeamOutlined, ToolOutlined, SearchOutlined,
  PrinterOutlined, FilePdfOutlined, MessageOutlined, BoxPlotOutlined, InboxOutlined,
  FileImageOutlined, TagsOutlined, UploadOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Existing data (unchanged) ────────────────────────────────────────────
const orders = [
  {
    key: 1, id: 'ORD-2401', client: 'The Grand Hotel', address: 'Coimbatore, TN', salesPerson: 'Priya',
    createdAt: '2024-01-20T10:00:00Z', product: 'Soap Round 50g', qty: 2000, stockAvail: 2000,
    orderStatus: 'Ready', phases: { completed: 4, total: 4 },
    phasesList: [
      { phase: 1, qty: 500, status: 'Delivered', date: '2024-01-22' },
      { phase: 2, qty: 500, status: 'Delivered', date: '2024-01-24' },
      { phase: 3, qty: 500, status: 'Delivered', date: '2024-01-26' },
      { phase: 4, qty: 500, status: 'Delivered', date: '2024-01-28' },
    ],
  },
  {
    key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', address: 'Mumbai, MH', salesPerson: 'Arun',
    createdAt: '2024-01-21T11:30:00Z', product: 'Shampoo 30ml Flip', qty: 3000, stockAvail: 1500,
    orderStatus: 'Draft', phases: { completed: 2, total: 4 },
    phasesList: [
      { phase: 1, qty: 750, status: 'Delivered', date: '2024-01-25' },
      { phase: 2, qty: 750, status: 'Delivered', date: '2024-01-27' },
      { phase: 3, qty: 750, status: 'Pending', date: '' },
      { phase: 4, qty: 750, status: 'Pending', date: '' },
    ],
  },
  {
    key: 3, id: 'ORD-2403', client: 'Taj Hotels', address: 'Delhi, DL', salesPerson: 'Priya',
    createdAt: '2024-01-22T14:15:00Z', product: 'Dental Kit', qty: 3000, stockAvail: 3000,
    orderStatus: 'Draft', phases: { completed: 0, total: 3 },
    phasesList: [
      { phase: 1, qty: 1000, status: 'Pending', date: '' },
      { phase: 2, qty: 1000, status: 'Pending', date: '' },
      { phase: 3, qty: 1000, status: 'Pending', date: '' },
    ],
  },
  {
    key: 4, id: 'ORD-2404', client: 'ITC Grand', address: 'Kolkata, WB', salesPerson: 'Karthik',
    createdAt: '2024-01-23T09:45:00Z', product: 'Conditioner 30ml', qty: 1000, stockAvail: 0,
    orderStatus: 'Draft', phases: { completed: 0, total: 1 },
    phasesList: [{ phase: 1, qty: 1000, status: 'Pending', date: '' }],
  },
];

const employees = [
  { key: 1, name: 'Ramesh Kumar', role: 'Production Lead', tasks: 3, available: true },
  { key: 2, name: 'Meena Devi', role: 'Packing Staff', tasks: 1, available: true },
  { key: 3, name: 'Suresh T', role: 'Quality Check', tasks: 2, available: false },
  { key: 4, name: 'Kavitha S', role: 'Sticker Work', tasks: 4, available: true },
];

const stockStatus = { Ready: '#6b1240', Partial: '#C94F8A', 'No Stock': '#B11E6A', Draft: '#888' };

// ── New constants ────────────────────────────────────────────────────────
const STICKER_SIZES = {
  Soap: '2.5cm × 2.5cm',
  Shampoo: '2cm × 3cm',
  'Coconut Oil': '2cm × 3cm',
  Conditioner: '2cm × 3cm',
  'Dental Kit': '3cm × 2cm',
};

const getDefaultSize = (product = '') => {
  const match = Object.keys(STICKER_SIZES).find((k) =>
    product.toLowerCase().includes(k.toLowerCase())
  );
  return match ? STICKER_SIZES[match] : '2cm × 3cm';
};

const DESIGN_STATUS_COLOR = {
  Sent: 'blue',
  'Design Confirmation': 'cyan',
  'In Process': 'orange',
  Dispatch: 'purple',
  Received: 'geekblue',
  'Pending Approval': 'gold',
  'Design Change': 'red',
  Approved: 'green',
  Printing: '#B11E6A',
  Completed: 'green',
};

const DESIGN_STEP_KEYS = [
  'Sent', 'Design Confirmation', 'In Process', 'Dispatch',
  'Received', 'Pending Approval', 'Design Change',
];

const TASK_TYPES = [
  'Shampoo Filling',
  'Sticker Placing – Shampoo',
  'Sticker Placing – Soap',
  'Sticker Placing – Dental Kit',
  'Dental Kit Sealing',
  'Box Filling',
  'Box Manufacturing',
  'Frosted Ziplock Packing',
  'Quality Check',
];

// ── New sticker / box / frosted data ─────────────────────────────────────
const initStickerOrders = [
  {
    key: 1, id: 'ORD-2401', client: 'The Grand Hotel', product: 'Soap Round 50g',
    qty: 2000, logo: 'Grand Hotel', designStatus: 'Printing', workflowStep: 6,
    printerSent: 1800, printerVerified: true,
    items: [{ product: 'Soap Round 50g', logo: 'Grand Hotel', qty: 2000, size: '2.5cm × 2.5cm' }],
  },
  {
    key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', product: 'Shampoo 30ml Flip',
    qty: 3000, logo: 'Marriott', designStatus: 'Pending Approval', workflowStep: 4,
    printerSent: 0, printerVerified: false,
    items: [{ product: 'Shampoo 30ml Flip', logo: 'Marriott', qty: 3000, size: '2cm × 3cm' }],
  },
  {
    key: 3, id: 'ORD-2403', client: 'Taj Hotels', product: 'Dental Kit',
    qty: 3000, logo: 'Taj Hotels', designStatus: 'Design Change', workflowStep: 2,
    printerSent: 0, printerVerified: false,
    items: [{ product: 'Dental Kit', logo: 'Taj Hotels', qty: 3000, size: '3cm × 2cm' }],
  },
  {
    key: 4, id: 'ORD-2404', client: 'ITC Grand', product: 'Conditioner 30ml',
    qty: 1000, logo: 'ITC Grand', designStatus: 'Received', workflowStep: 4,
    printerSent: 0, printerVerified: false,
    items: [{ product: 'Conditioner 30ml', logo: 'ITC Grand', qty: 1000, size: '2cm × 3cm' }],
  },
];

const initBoxOrders = [
  {
    key: 1, id: 'ORD-2401', client: 'The Grand Hotel', product: 'Soap Round 50g',
    qty: 2000, logo: 'Grand Hotel', designStatus: 'Received', workflowStep: 4,
    printerSent: 2000, printerVerified: true, material: 'PVC',
    items: [{ product: 'Soap Round 50g', logo: 'Grand Hotel', qty: 2000, size: '10cm × 8cm × 5cm', material: 'PVC' }],
  },
  {
    key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', product: 'Shampoo 30ml Flip',
    qty: 3000, logo: 'Marriott', designStatus: 'In Process', workflowStep: 2,
    printerSent: 0, printerVerified: false, material: 'PVC',
    items: [{ product: 'Shampoo 30ml Flip', logo: 'Marriott', qty: 3000, size: '12cm × 6cm × 6cm', material: 'PVC' }],
  },
];

const initFrostedOrders = [
  {
    key: 1, id: 'ORD-2403', client: 'Taj Hotels', product: 'Dental Kit',
    qty: 3000, logo: 'Taj Hotels', designStatus: 'Sent', workflowStep: 0,
    printerSent: 0, printerVerified: false,
    items: [{ product: 'Dental Kit', logo: 'Taj Hotels', qty: 3000, size: '15cm × 10cm' }],
  },
];

// ─────────────────────────────────────────────────────────────────────────
export default function Operations() {
  const isDark = useSelector((s) => s.theme.isDark);

  // Existing state
  const [searchText, setSearchText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignForm] = Form.useForm();

  // New state
  const [activeTab, setActiveTab] = useState('orders');
  const [stickerOrders] = useState(initStickerOrders);
  const [boxOrders] = useState(initBoxOrders);
  const [frostedOrders] = useState(initFrostedOrders);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [stickerDetailOpen, setStickerDetailOpen] = useState(false);
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [printerUpdateOpen, setPrinterUpdateOpen] = useState(false);
  const [printerForm] = Form.useForm();
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newRequestType, setNewRequestType] = useState('sticker');
  const [newRequestForm] = Form.useForm();

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  // ── Existing columns (unchanged) ────────────────────────────────────────
  const columns = [
    { title: 'Order', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Location', dataIndex: 'address', responsive: ['md'] },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'],
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'] },
    { title: 'Product', dataIndex: 'product', responsive: ['lg'] },
    { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString(), responsive: ['lg'] },
    {
      title: 'Stock', key: 'stock',
      render: (_, r) => (
        <div>
          <Progress percent={Math.round((r.stockAvail / r.qty) * 100)} size="small" strokeColor={stockStatus[r.status]} showInfo={false} style={{ marginBottom: 2 }} />
          <Text style={{ fontSize: 11, color: '#999' }}>{r.stockAvail.toLocaleString()}/{r.qty.toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: 'Phases', key: 'phases',
      render: (_, r) => (
        <div>
          <Progress percent={Math.round((r.phases.completed / r.phases.total) * 100)} size="small" strokeColor="#B11E6A" status={r.phases.completed === r.phases.total ? 'success' : 'active'} />
          <Text style={{ fontSize: 11 }}>{r.phases.completed}/{r.phases.total} Phases Done</Text>
        </div>
      ),
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
    {
      title: 'Status', dataIndex: 'available',
      render: (v) => (
        <Tag style={{ borderRadius: 20, background: v ? '#6b124022' : '#B11E6A22', color: v ? '#6b1240' : '#B11E6A', border: `1px solid ${v ? '#6b124044' : '#B11E6A44'}` }}>
          {v ? 'Available' : 'Busy'}
        </Tag>
      ),
    },
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

  // ── New: print tab columns factory ────────────────────────────────────
  const makePrintColumns = (isBox = false) => [
    { title: 'Order', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Product', dataIndex: 'product', responsive: ['md'] },
    {
      title: 'Hotel Logo', dataIndex: 'logo',
      render: (v) => (
        <Space>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#B11E6A15', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #B11E6A30' }}>
            <FileImageOutlined style={{ color: '#B11E6A', fontSize: 13 }} />
          </div>
          <Text style={{ fontSize: 12 }}>{v}</Text>
        </Space>
      ),
    },
    { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
    isBox
      ? { title: 'Material', dataIndex: 'material', render: (v) => <Tag color="purple">{v || 'PVC'}</Tag> }
      : { title: 'Sticker Size', key: 'size', render: (_, r) => <Tag color="geekblue">{getDefaultSize(r.product)}</Tag> },
    {
      title: 'Design Status', dataIndex: 'designStatus',
      render: (v) => <Tag color={DESIGN_STATUS_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Printer', key: 'printer',
      render: (_, r) => r.printerSent > 0
        ? (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 11 }}>Sent: {r.printerSent.toLocaleString()}</Text>
            <Tag color={r.printerVerified ? 'success' : 'warning'} style={{ fontSize: 10 }}>
              {r.printerVerified ? 'Verified ✓' : 'Verify Pending'}
            </Tag>
          </Space>
        )
        : <Tag color="default" style={{ fontSize: 10 }}>Not Sent</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedPrintOrder(r); setStickerDetailOpen(true); }} />
          </Tooltip>
          <Tooltip title="Design Workflow">
            <Button size="small" icon={<FileImageOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }} onClick={() => { setSelectedPrintOrder(r); setDesignModalOpen(true); }} />
          </Tooltip>
          <Tooltip title="Printer Update">
            <Button size="small" icon={<PrinterOutlined />} onClick={() => { setSelectedPrintOrder(r); setPrinterUpdateOpen(true); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Printing tab renderer (shared for sticker / box / frosted) ─────────
  const renderPrintTab = (data, type) => {
    const label = type === 'sticker' ? 'Sticker Printing' : type === 'box' ? 'Box Manufacturing' : 'Frosted Ziplock';

    return (
      <div>
        {/* Orders table */}
        <Card
          title={<Space><TagsOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>{label} Orders</Text></Space>}
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} onClick={() => { setNewRequestType(type); setNewRequestOpen(true); }}>
              New Request
            </Button>
          }
          style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
          styles={{ body: { padding: 0 } }}
        >
          <div className="table-responsive" style={{ padding: 4 }}>
            <Table dataSource={data} columns={makePrintColumns(type === 'box')} pagination={{ pageSize: 5, size: 'small' }} size="small" />
          </div>
        </Card>
      </div>
    );
  };

  // ── Top-level stats (updated) ─────────────────────────────────────────
  const topStats = [
    { label: 'Order Pending', val: orders.filter((o) => o.orderStatus === 'Draft').length, color: '#C94F8A' },
    { label: 'In Production', val: 14, color: '#B11E6A' },
    { label: 'Sticker: Ongoing', val: stickerOrders.filter((o) => ['In Process', 'Printing'].includes(o.designStatus)).length, color: '#8a1652' },
    { label: 'Sticker: Approval', val: stickerOrders.filter((o) => o.designStatus === 'Pending Approval').length, color: '#D85C9E' },
    { label: 'Box Pending', val: boxOrders.filter((o) => !['Received', 'Completed'].includes(o.designStatus)).length, color: '#6b1240' },
    { label: 'Frosted Pending', val: frostedOrders.filter((o) => !['Received', 'Completed'].includes(o.designStatus)).length, color: '#a01055' },
  ];

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Operations" items={[{ label: 'Operations' }]} />

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {topStats.map((s, i) => (
          <Col xs={12} sm={8} md={4} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 12px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'orders',
            label: <Space><ToolOutlined />Order Management</Space>,
            children: (
              <div>
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
                      dataSource={orders.filter((o) =>
                        !searchText ||
                        o.id.toLowerCase().includes(searchText.toLowerCase()) ||
                        o.client.toLowerCase().includes(searchText.toLowerCase()) ||
                        o.address.toLowerCase().includes(searchText.toLowerCase())
                      )}
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
              </div>
            ),
          },
          {
            key: 'sticker',
            label: <Space><TagsOutlined />Sticker Printing</Space>,
            children: renderPrintTab(stickerOrders, 'sticker'),
          },
          {
            key: 'box',
            label: <Space><BoxPlotOutlined />Box</Space>,
            children: renderPrintTab(boxOrders, 'box'),
          },
          {
            key: 'frosted',
            label: <Space><InboxOutlined />Frosted Ziplock</Space>,
            children: renderPrintTab(frostedOrders, 'frosted'),
          },
        ]}
      />

      {/* ── Existing Modals (unchanged) ─────────────────────────────────────── */}
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
                  { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
                  { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'Delivered' ? 'success' : 'processing'}>{s}</Tag> },
                  { title: 'Delivery Date', dataIndex: 'date', render: (d) => d || '—' },
                  {
                    title: 'Action',
                    render: (_, p) => p.status !== 'Delivered' && (
                      <Space>
                        <Button size="small" type="primary" style={{ background: '#B11E6A', border: 'none' }} onClick={() => setAssignModalOpen(true)}>Assign Task</Button>
                        <Button size="small" icon={<CheckOutlined />}>Mark Delivered</Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>

            <Alert
              message="Partial Assignment Logic"
              description={`Currently you have ${selectedOrder.stockAvail.toLocaleString()} units in stock. You can fulfill ${Math.min(selectedOrder.qty, selectedOrder.stockAvail).toLocaleString()} units out of ${selectedOrder.qty.toLocaleString()}.`}
              type={selectedOrder.stockAvail >= selectedOrder.qty ? 'success' : 'warning'}
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* Assign Task Modal — updated: task type + hotel logo instead of hotel/company */}
      <Modal
        title={`Assign Task to ${selectedEmployee?.name}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignModalOpen(false)}>Cancel</Button>,
          <Button key="assign" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} onClick={() => setAssignModalOpen(false)}>Assign Task</Button>,
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
              <Form.Item label="Task Type" name="taskType" rules={[{ required: true }]}>
                <Select placeholder="Select Task Type" allowClear>
                  {TASK_TYPES.map((t) => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Order ID" name="orderId">
                <Select placeholder="Select Order" allowClear>
                  {['ORD-2401', 'ORD-2402', 'ORD-2403', 'ORD-2404', 'ORD-2406'].map((o) => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Hotel Logo" name="logo">
                <Select placeholder="Select Hotel Logo" allowClear>
                  {['Grand Hotel', 'Marriott', 'Taj Hotels', 'ITC Grand', 'Hotel Blue Star'].map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Due Date" name="due"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="End Time" name="endTime"><Input type="time" /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── New: Sticker / Box / Frosted Detail Modal ───────────────────────── */}
      <Modal
        title={<Space><TagsOutlined style={{ color: '#B11E6A' }} /><span>Print Details: {selectedPrintOrder?.id}</span></Space>}
        open={stickerDetailOpen}
        onCancel={() => setStickerDetailOpen(false)}
        width={Math.min(700, window.innerWidth - 32)}
        footer={[
          <Button key="pdf" icon={<FilePdfOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Download Logo PDF</Button>,
          <Button key="close" onClick={() => setStickerDetailOpen(false)}>Close</Button>,
        ]}
      >
        {selectedPrintOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Hotel logo card */}
            <div style={{ background: isDark ? '#16162A' : '#f8f9fc', borderRadius: 12, padding: 20, textAlign: 'center', border: '2px dashed #B11E6A40' }}>
              <div style={{ width: 80, height: 80, borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A20,#D85C9E20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid #B11E6A30' }}>
                <FileImageOutlined style={{ fontSize: 36, color: '#B11E6A' }} />
              </div>
              <Text strong style={{ fontSize: 16, display: 'block' }}>{selectedPrintOrder.logo}</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Hotel / Company Logo</Text>
              <div style={{ marginTop: 12 }}>
                <Button icon={<FilePdfOutlined />} size="small" style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Download PDF</Button>
              </div>
            </div>

            {/* Order overview */}
            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
              <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{selectedPrintOrder.id}</Text></Descriptions.Item>
              <Descriptions.Item label="Client">{selectedPrintOrder.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{selectedPrintOrder.product}</Descriptions.Item>
              <Descriptions.Item label="Total Qty">{selectedPrintOrder.qty.toLocaleString()} units</Descriptions.Item>
              <Descriptions.Item label="Design Status"><Tag color={DESIGN_STATUS_COLOR[selectedPrintOrder.designStatus] || 'default'}>{selectedPrintOrder.designStatus}</Tag></Descriptions.Item>
              <Descriptions.Item label="Printer">
                {selectedPrintOrder.printerSent > 0
                  ? <Space><Text style={{ fontSize: 12 }}>{selectedPrintOrder.printerSent.toLocaleString()} sent</Text><Tag color={selectedPrintOrder.printerVerified ? 'success' : 'warning'}>{selectedPrintOrder.printerVerified ? 'Verified' : 'Pending'}</Tag></Space>
                  : <Tag color="default">Not Sent</Tag>}
              </Descriptions.Item>
            </Descriptions>

            {/* Logo | Qty | Size table */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Specification Details</Text>
              <Table
                dataSource={selectedPrintOrder.items}
                pagination={false}
                size="small"
                style={{ borderRadius: 8 }}
                columns={[
                  {
                    title: 'Logo', dataIndex: 'logo',
                    render: (v) => <Space><FileImageOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space>,
                  },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Quantity', dataIndex: 'qty', render: (v) => <Text strong>{v.toLocaleString()}</Text> },
                  {
                    title: 'Size (Default)', dataIndex: 'size',
                    render: (v, r) => (
                      <Space direction="vertical" size={0}>
                        <Tag color="geekblue">{v || getDefaultSize(r.product)}</Tag>
                        <Text style={{ fontSize: 10, color: '#999' }}>Default</Text>
                      </Space>
                    ),
                  },
                  ...(selectedPrintOrder.items[0]?.material
                    ? [{ title: 'Material', dataIndex: 'material', render: (v) => <Tag color="purple">{v}</Tag> }]
                    : []),
                ]}
              />
            </div>

            {/* Size reference */}
            <Card size="small" style={{ borderRadius: 8, background: isDark ? '#16162A' : '#f8f9fc', border: 'none' }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8, color: '#B11E6A' }}>Standard Sticker Size Reference</Text>
              <Row gutter={[8, 4]}>
                {Object.entries(STICKER_SIZES).map(([prod, size]) => (
                  <Col xs={12} sm={8} key={prod}>
                    <Space size={4}>
                      <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}>{size}</Tag>
                      <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>{prod}</Text>
                    </Space>
                  </Col>
                ))}
              </Row>
            </Card>
          </div>
        )}
      </Modal>

      {/* ── New: Design Workflow Modal ───────────────────────────────────────── */}
      <Modal
        title={<Space><FileImageOutlined style={{ color: '#B11E6A' }} /><span>Design Workflow: {selectedPrintOrder?.id}</span></Space>}
        open={designModalOpen}
        onCancel={() => setDesignModalOpen(false)}
        width={Math.min(660, window.innerWidth - 32)}
        footer={[
          <Button key="wa" icon={<MessageOutlined />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}>Send via WhatsApp</Button>,
          <Button key="approve" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Approve & Start Printing</Button>,
          <Button key="close" onClick={() => setDesignModalOpen(false)}>Close</Button>,
        ]}
      >
        {selectedPrintOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Stage stepper */}
            <Steps
              current={DESIGN_STEP_KEYS.indexOf(selectedPrintOrder.designStatus)}
              size="small"
              direction="vertical"
              items={[
                { title: 'Sent to Design Team', description: 'Design request sent to team' },
                { title: 'Design Confirmation', description: 'Design team confirmed receipt' },
                { title: 'In Process', description: 'Design work in progress' },
                { title: 'Dispatch to Client', description: 'Design sent for client review' },
                { title: 'Received by Client', description: 'Client received the design' },
                { title: 'Pending Client Approval', description: 'Awaiting final approval' },
                {
                  title: 'Design Change Requested',
                  description: 'Client requested corrections',
                  status: selectedPrintOrder.designStatus === 'Design Change' ? 'error' : undefined,
                },
              ]}
            />

            <Divider style={{ margin: '4px 0' }} />

            {/* Send to customer */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Send Design to Customer</Text>
              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <Input placeholder="WhatsApp / Phone number" prefix={<MessageOutlined />} />
                </Col>
                <Col>
                  <Button style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} icon={<MessageOutlined />}>WhatsApp</Button>
                </Col>
              </Row>
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4, display: 'block' }}>
                Design will be shared with customer and sales person
              </Text>
            </div>

            {/* Printer verification */}
            <Card size="small" style={{ borderRadius: 8, background: isDark ? '#16162A' : '#f8f9fc', border: '1px solid #B11E6A20' }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                <PrinterOutlined style={{ color: '#B11E6A', marginRight: 4 }} />Printer Dispatch Verification
              </Text>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Order Qty">{selectedPrintOrder.qty.toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Printer Sent">
                  {selectedPrintOrder.printerSent > 0 ? selectedPrintOrder.printerSent.toLocaleString() : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Verified">
                  {selectedPrintOrder.printerVerified
                    ? <Tag color="success">Verified</Tag>
                    : <Tag color="warning">Pending</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Balance">
                  {selectedPrintOrder.printerSent > 0
                    ? (
                      <Text style={{ color: selectedPrintOrder.qty - selectedPrintOrder.printerSent === 0 ? '#52c41a' : '#fa8c16' }}>
                        {(selectedPrintOrder.qty - selectedPrintOrder.printerSent).toLocaleString()} remaining
                      </Text>
                    )
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Modal>

      {/* ── New: New Request Modal (with Upload) ─────────────────────────────── */}
      <Modal
        title={`New ${newRequestType === 'sticker' ? 'Sticker' : newRequestType === 'box' ? 'Box' : 'Frosted Ziplock'} Request`}
        open={newRequestOpen}
        onCancel={() => { setNewRequestOpen(false); newRequestForm.resetFields(); }}
        width={Math.min(620, window.innerWidth - 32)}
        footer={[
          <Button key="cancel" onClick={() => { setNewRequestOpen(false); newRequestForm.resetFields(); }}>Cancel</Button>,
          <Button key="submit" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Submit Request</Button>,
        ]}
      >
        <Form form={newRequestForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Order ID" name="orderId" rules={[{ required: true }]}>
                <Select placeholder="Select Order" allowClear>
                  {['ORD-2401', 'ORD-2402', 'ORD-2403', 'ORD-2404'].map((o) => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Hotel / Client" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select Client" allowClear>
                  {['The Grand Hotel', 'Marriott Mumbai', 'Taj Hotels', 'ITC Grand'].map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="product">
                <Select placeholder="Select Product">
                  {['Soap Round 50g', 'Shampoo 30ml Flip', 'Dental Kit', 'Conditioner 30ml', 'Coconut Oil 30ml'].map((p) => <Option key={p} value={p}>{p}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Quantity" name="qty">
                <Input type="number" placeholder="Enter quantity" suffix="units" />
              </Form.Item>
            </Col>
            {newRequestType !== 'frosted' && (
              <Col xs={24} sm={12}>
                <Form.Item label={newRequestType === 'box' ? 'Box Size' : 'Sticker Size'} name="size">
                  <Input placeholder={newRequestType === 'box' ? '10cm × 8cm × 5cm' : '2cm × 3cm'} />
                </Form.Item>
              </Col>
            )}
            {newRequestType === 'box' && (
              <Col xs={24} sm={12}>
                <Form.Item label="Material" name="material">
                  <Select defaultValue="PVC">
                    <Option value="PVC">PVC</Option>
                    <Option value="Cardboard">Cardboard</Option>
                    <Option value="Kraft">Kraft</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col xs={24}>
              <Form.Item label="Hotel Logo (Upload)" name="logo" rules={[{ required: true, message: 'Please upload hotel logo' }]}>
                <Upload.Dragger beforeUpload={() => false} accept=".jpg,.jpeg,.png,.pdf,.ai,.svg" maxCount={1}>
                  <div style={{ padding: '8px 0' }}>
                    <UploadOutlined style={{ fontSize: 28, color: '#B11E6A' }} />
                    <p style={{ margin: '8px 0 4px', fontWeight: 600 }}>Click or drag logo file here</p>
                    <p style={{ margin: 0, color: '#999', fontSize: 12 }}>Supports: JPG, PNG, PDF, AI, SVG</p>
                  </div>
                </Upload.Dragger>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Special Instructions" name="notes">
                <Input.TextArea rows={2} placeholder="Any special instructions for design team..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── New: Printer Update Modal ────────────────────────────────────────── */}
      <Modal
        title={<Space><PrinterOutlined style={{ color: '#B11E6A' }} /><span>Printer Update: {selectedPrintOrder?.id}</span></Space>}
        open={printerUpdateOpen}
        onCancel={() => setPrinterUpdateOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setPrinterUpdateOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} onClick={() => setPrinterUpdateOpen(false)}>
            Update & Verify
          </Button>,
        ]}
      >
        <Form form={printerForm} layout="vertical" style={{ marginTop: 16 }}>
          <Alert
            type="info" showIcon
            message={`Order Qty: ${selectedPrintOrder?.qty?.toLocaleString()} units`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Quantity Sent by Printer" name="printerSent" rules={[{ required: true }]}>
                <Input type="number" placeholder="Enter quantity" suffix="units" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Dispatch Date" name="dispatchDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Remarks" name="remarks">
                <Input.TextArea rows={2} placeholder="Any notes from printer..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
