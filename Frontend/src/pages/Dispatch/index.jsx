import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Typography, Space,
  Descriptions, Alert, Select, Tabs, Divider, Collapse,
} from 'antd';
import {
  CarOutlined, CheckCircleOutlined, UploadOutlined, EyeOutlined,
  SearchOutlined, PrinterOutlined, SaveOutlined, EditOutlined,
  ThunderboltOutlined, InboxOutlined, FilterOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Existing data (unchanged) ────────────────────────────────────────────
const dispatchOrders = [
  { key: 1, id: 'ORD-2402', client: 'Marriott Mumbai', contactPerson: 'Raju', phone: '+91 9876543210', email: 'raju@marriott.com', product: 'Shampoo 30ml', qty: 1500, boxes: 30, weight: '45 Kg', payment: 'Confirmed', address: 'Mumbai, MH', detailedAddress: 'Marine Drive, Nariman Point', city: 'Mumbai', state: 'MH', pincode: '400021', transport: 'Fast Cargo', status: 'Ready to Dispatch', salesPerson: 'Arun', createdAt: '2024-01-21T11:30:00Z' },
  { key: 2, id: 'ORD-2403', client: 'Taj Hotels Delhi', contactPerson: 'Raman', phone: '+91 9123456780', email: 'raman@taj.com', product: 'Dental Kit', qty: 3000, boxes: 60, weight: '90 Kg', payment: 'Pending', address: 'Delhi, DL', detailedAddress: 'Sardar Patel Marg', city: 'New Delhi', state: 'DL', pincode: '110021', transport: '-', status: 'Payment Pending', salesPerson: 'Priya', createdAt: '2024-01-22T14:15:00Z' },
  { key: 3, id: 'ORD-2404', client: 'ITC Grand', contactPerson: 'Sonia', phone: '+91 9988776655', email: 'sonia@itc.com', product: 'Soap + Shampoo Kit', qty: 5000, boxes: 100, weight: '200 Kg', payment: 'Confirmed', address: 'Kolkata, WB', detailedAddress: 'JBS Haldane Avenue', city: 'Kolkata', state: 'WB', pincode: '700046', transport: 'Blue Dart', status: 'Dispatched', salesPerson: 'Karthik', createdAt: '2024-01-23T09:45:00Z' },
  { key: 4, id: 'ORD-2406', client: 'Hyatt Chennai', contactPerson: 'Arun', phone: '+91 9876512345', email: 'arun@hyatt.com', product: 'Conditioner 30ml', qty: 2000, boxes: 40, weight: '60 Kg', payment: 'Confirmed', address: 'Chennai, TN', detailedAddress: '365 Anna Salai, Teynampet', city: 'Chennai', state: 'TN', pincode: '600018', transport: '-', status: 'Packing', salesPerson: 'Arun', createdAt: '2024-01-24T10:20:00Z' },
];

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

// ── New: Transport data ───────────────────────────────────────────────────
const initTransportData = [
  { key: 1, lrNumber: 'LR-4521', orderId: 'ORD-2402', client: 'Marriott Mumbai', transport: 'Fast Cargo', boxes: 30, weight: '45 Kg', freight: '₹2,100', dispatchDate: '2024-01-25', status: 'In Transit' },
  { key: 2, lrNumber: 'LR-4520', orderId: 'ORD-2404', client: 'ITC Grand', transport: 'Blue Dart', boxes: 100, weight: '200 Kg', freight: '₹8,500', dispatchDate: '2024-01-24', status: 'Delivered' },
  { key: 3, lrNumber: 'LR-4518', orderId: 'ORD-2401', client: 'The Grand Hotel', transport: 'VRL Logistics', boxes: 40, weight: '60 Kg', freight: '₹3,200', dispatchDate: '2024-01-23', status: 'Delivered' },
];

// ── Company info for FROM section ─────────────────────────────────────────
const HNG = {
  name: 'Heal N Glow',
  tagline: "Let Your Skin Breathe Organic",
  address: '24, Industrial Area Phase II',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641021',
  phone: '+91 98765 43210',
  gstin: '33AAACH1234B1Z5',
};

// ── Mock AI-parsed receipt fields ─────────────────────────────────────────
const MOCK_PARSED = {
  lrNumber: 'LR-78921',
  date: '2024-01-25',
  transportName: 'Fast Cargo Pvt Ltd',
  fromCity: 'Coimbatore',
  toCity: 'Mumbai',
  weight: '45.5 Kg',
  freight: '₹2,100',
  packages: '30',
  deliveryDate: '2024-01-28',
};

// ─────────────────────────────────────────────────────────────────────────
export default function Dispatch() {
  const isDark = useSelector((s) => s.theme.isDark);
  const navigate = useNavigate();

  // Existing state
  const [searchText, setSearchText] = useState('');

  // New state
  const [activeTab, setActiveTab] = useState('dispatch');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [printEditMode, setPrintEditMode] = useState(false);
  const [printForm] = Form.useForm();
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [aiForm] = Form.useForm();

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const labelBg = isDark ? '#16162A' : '#f8f9fc';

  // ── Handlers ─────────────────────────────────────────────────────────
  const openPrintModal = (order) => {
    setSelectedPrintOrder(order);
    printForm.setFieldsValue({
      toName: order.client,
      toContact: order.contactPerson,
      toPhone: order.phone,
      toAddress: order.detailedAddress,
      toCity: order.city,
      toState: order.state,
      toPincode: order.pincode,
      toLocation: order.address,
      orderRef: order.id,
      boxCount: order.boxes,
      weight: order.weight,
    });
    setPrintEditMode(false);
    setAiParsed(null);
    setPrintModalOpen(true);
  };

  const handlePrint = () => {
    const vals = printForm.getFieldsValue();
    const win = window.open('', '_blank', 'width=480,height=640');
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Label</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; font-size: 13px; color: #111; }
  .label { border: 2px solid #333; padding: 20px; width: 400px; border-radius: 4px; }
  .badge { background: #B11E6A; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 12px; }
  .section-title { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 6px; }
  .name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .line { margin: 2px 0; color: #333; }
  hr { border: none; border-top: 1px dashed #aaa; margin: 14px 0; }
  .order-ref { font-size: 11px; color: #555; margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px; }
  .barcode { font-family: monospace; font-size: 10px; letter-spacing: 4px; color: #333; margin-top: 4px; }
</style></head><body>
<div class="label">
  <div class="badge">HEAL N GLOW — DISPATCH LABEL</div>
  <div class="section-title">From</div>
  <div class="name">${HNG.name}</div>
  <div class="line">${HNG.address}</div>
  <div class="line">${HNG.city}, ${HNG.state} — ${HNG.pincode}</div>
  <div class="line">Ph: ${HNG.phone}</div>
  <div class="line">GSTIN: ${HNG.gstin}</div>
  <hr/>
  <div class="section-title">To</div>
  <div class="name">${vals.toName || ''}</div>
  <div class="line">Attn: ${vals.toContact || ''}</div>
  <div class="line">${vals.toAddress || ''}</div>
  <div class="line">${vals.toCity || ''}, ${vals.toState || ''} — ${vals.toPincode || ''}</div>
  <div class="line">Ph: ${vals.toPhone || ''}</div>
  <div class="order-ref">
    Order Ref: <b>${vals.orderRef || ''}</b> &nbsp;|&nbsp; Boxes: <b>${vals.boxCount || ''}</b> &nbsp;|&nbsp; Weight: <b>${vals.weight || ''}</b>
  </div>
  <div class="barcode">||| ${vals.orderRef || ''} |||</div>
</div>
</body></html>`);
    win.document.close();
    win.print();
  };

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      setAiParsed(MOCK_PARSED);
      aiForm.setFieldsValue(MOCK_PARSED);
      setAiParsing(false);
    }, 1800);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    { title: 'Order', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Location', dataIndex: 'address', responsive: ['md'] },
    { title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'], render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'] },
    { title: 'Product', dataIndex: 'product', responsive: ['md'] },
    {
      title: 'Boxes', dataIndex: 'boxes', responsive: ['sm'],
      render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong>{v}</Text></Space>,
    },
    { title: 'Weight', dataIndex: 'weight', responsive: ['lg'] },
    {
      title: 'Payment', dataIndex: 'payment',
      render: (v) => (
        <Tag style={{ borderRadius: 20, background: v === 'Confirmed' ? '#6b124022' : '#B11E6A22', color: v === 'Confirmed' ? '#6b1240' : '#B11E6A', border: `1px solid ${v === 'Confirmed' ? '#6b124044' : '#B11E6A44'}` }}>
          {v}
        </Tag>
      ),
    },
    { title: 'Transport', dataIndex: 'transport', responsive: ['lg'] },
    {
      title: 'Status', dataIndex: 'status',
      render: (v) => <Tag style={{ borderRadius: 20, fontWeight: 500, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/dispatch/${r.id}`)} />
          <Button size="small" icon={<PrinterOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }} onClick={() => openPrintModal(r)} />
        </Space>
      ),
    },
  ];

  const transportColumns = [
    { title: 'LR Number', dataIndex: 'lrNumber', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Order', dataIndex: 'orderId' },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Transport Co.', dataIndex: 'transport' },
    { title: 'Boxes', dataIndex: 'boxes', render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space> },
    { title: 'Weight', dataIndex: 'weight' },
    { title: 'Freight', dataIndex: 'freight' },
    { title: 'Dispatch Date', dataIndex: 'dispatchDate' },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'Delivered' ? 'success' : 'processing'}>{v}</Tag> },
  ];

  const filteredOrders = dispatchOrders.filter((o) => {
    const s = !searchText || o.id.toLowerCase().includes(searchText.toLowerCase()) || o.client.toLowerCase().includes(searchText.toLowerCase()) || o.address.toLowerCase().includes(searchText.toLowerCase());
    const p = paymentFilter === 'All' || o.payment === paymentFilter;
    return s && p;
  });

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Dispatch Team" items={[{ label: 'Dispatch Team' }]} />

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Ready to Dispatch', count: dispatchOrders.filter(o => o.status === 'Ready to Dispatch').length, color: '#B11E6A' },
          { label: 'Packing in Progress', count: dispatchOrders.filter(o => o.status === 'Packing').length, color: '#8a1652' },
          { label: 'Dispatched Today', count: dispatchOrders.filter(o => o.status === 'Dispatched').length, color: '#C94F8A' },
          { label: 'Payment Pending', count: dispatchOrders.filter(o => o.payment === 'Pending').length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.count}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card"
        items={[
          {
            key: 'dispatch',
            label: <Space><CarOutlined />Dispatch Orders</Space>,
            children: (
              <div>
                {/* Filters row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search orders, clients, locations..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    style={{ flex: 1, minWidth: 200, borderRadius: 8 }}
                  />
                  <Space>
                    <FilterOutlined style={{ color: '#B11E6A' }} />
                    <Select value={paymentFilter} onChange={setPaymentFilter} style={{ width: 160, borderRadius: 8 }}>
                      <Option value="All">All Payments</Option>
                      <Option value="Confirmed">Confirmed</Option>
                      <Option value="Pending">Pending</Option>
                    </Select>
                  </Space>
                </div>

                <Card
                  title={<Text strong style={{ color: textColor }}>Dispatch Orders</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: '4px' }}>
                    <Table
                      dataSource={filteredOrders}
                      columns={columns}
                      pagination={{ pageSize: 8, size: 'small' }}
                      size="small"
                      onRow={(record) => ({
                        onClick: () => navigate(`/dispatch/${record.id}`),
                        style: { cursor: 'pointer' },
                      })}
                    />
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'transport',
            label: <Space><GlobalOutlined />Transport</Space>,
            children: (
              <div>
                {/* Transport stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {[
                    { label: 'Total Dispatched', val: initTransportData.length, color: '#B11E6A' },
                    { label: 'In Transit', val: initTransportData.filter(t => t.status === 'In Transit').length, color: '#C94F8A' },
                    { label: 'Delivered', val: initTransportData.filter(t => t.status === 'Delivered').length, color: '#6b1240' },
                  ].map((s) => (
                    <Col xs={8} key={s.label}>
                      <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, textAlign: 'center' }} styles={{ body: { padding: '12px 8px' } }}>
                        <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card
                  title={<Text strong style={{ color: textColor }}>Transport Records</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: '4px' }}>
                    <Table dataSource={initTransportData} columns={transportColumns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* ── Hotel Details Printout Modal ──────────────────────────────────────── */}
      <Modal
        title={<Space><PrinterOutlined style={{ color: '#B11E6A' }} /><span>Hotel Details Printout — {selectedPrintOrder?.id}</span></Space>}
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        width={Math.min(640, window.innerWidth - 32)}
        footer={[
          <Button key="edit" icon={<EditOutlined />} onClick={() => setPrintEditMode(!printEditMode)}>
            {printEditMode ? 'View Preview' : 'Manual Entry'}
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={handlePrint}>
            Print Label
          </Button>,
          <Button key="close" onClick={() => setPrintModalOpen(false)}>Close</Button>,
        ]}
      >
        {selectedPrintOrder && (
          <div>
            <Tabs
              size="small"
              defaultActiveKey="preview"
              items={[
                {
                  key: 'preview',
                  label: 'Label Preview',
                  children: (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                      <div id="dispatch-label" style={{ border: '2px solid #333', borderRadius: 6, padding: 20, width: 380, background: '#fff', color: '#111', fontFamily: 'Arial, sans-serif' }}>
                        {/* HNG badge */}
                        <div style={{ background: '#B11E6A', color: '#fff', display: 'inline-block', padding: '2px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, marginBottom: 14, letterSpacing: 1 }}>
                          HEAL N GLOW — DISPATCH LABEL
                        </div>

                        {/* FROM */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 6 }}>From</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{HNG.name}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{HNG.address}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{HNG.city}, {HNG.state} — {HNG.pincode}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>Ph: {HNG.phone}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>GSTIN: {HNG.gstin}</div>
                        </div>

                        <div style={{ borderTop: '1px dashed #aaa', margin: '12px 0' }} />

                        {/* TO — reads from printForm live */}
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 6 }}>To</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{printForm.getFieldValue('toName') || selectedPrintOrder.client}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>Attn: {printForm.getFieldValue('toContact') || selectedPrintOrder.contactPerson}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{printForm.getFieldValue('toAddress') || selectedPrintOrder.detailedAddress}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>
                            {printForm.getFieldValue('toCity') || selectedPrintOrder.city},&nbsp;
                            {printForm.getFieldValue('toState') || selectedPrintOrder.state}&nbsp;—&nbsp;
                            {printForm.getFieldValue('toPincode') || selectedPrintOrder.pincode}
                          </div>
                          <div style={{ fontSize: 12, color: '#444' }}>Ph: {printForm.getFieldValue('toPhone') || selectedPrintOrder.phone}</div>
                        </div>

                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555' }}>
                            <span>Order: <b>{printForm.getFieldValue('orderRef') || selectedPrintOrder.id}</b></span>
                            <span>Boxes: <b>{printForm.getFieldValue('boxCount') || selectedPrintOrder.boxes}</b></span>
                            <span>Wt: <b>{printForm.getFieldValue('weight') || selectedPrintOrder.weight}</b></span>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, color: '#333', marginTop: 6, textAlign: 'center' }}>
                            ||| {selectedPrintOrder.id} |||
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'edit',
                  label: 'Manual Entry',
                  children: (
                    <Form form={printForm} layout="vertical" size="small" style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#B11E6A', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                        To (Recipient Details)
                      </Text>
                      <Row gutter={12}>
                        <Col xs={24} sm={12}><Form.Item label="Hotel / Company Name" name="toName"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Point of Contact" name="toContact"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Phone Number" name="toPhone"><Input /></Form.Item></Col>
                        <Col xs={24}><Form.Item label="Detailed Address" name="toAddress"><Input.TextArea rows={2} /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="City" name="toCity"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="State" name="toState"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Pincode" name="toPincode"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Location / Area" name="toLocation"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Box Count" name="boxCount"><Input type="number" prefix={<InboxOutlined />} /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Weight" name="weight"><Input suffix="Kg" /></Form.Item></Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8 }}>From (HNG — fixed)</Text>
                      <Descriptions size="small" column={2} style={{ borderRadius: 8 }}>
                        <Descriptions.Item label="Company">{HNG.name}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{HNG.phone}</Descriptions.Item>
                        <Descriptions.Item label="Address">{HNG.address}, {HNG.city} — {HNG.pincode}</Descriptions.Item>
                        <Descriptions.Item label="GSTIN">{HNG.gstin}</Descriptions.Item>
                      </Descriptions>
                    </Form>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
