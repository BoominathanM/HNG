import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, Upload, Typography, Space,
  Steps, Descriptions, Alert, Tag, DatePicker, message, Checkbox,
  Select, Table, Divider,
} from 'antd';
import {
  CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined, FileDoneOutlined, CheckSquareOutlined,
  LinkOutlined, BellOutlined, CarOutlined, WhatsAppOutlined, EditOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Shared data ───────────────────────────────────────────────────────────────
const dispatchOrders = [
  { key: 1, id: 'ORD-2402', client: 'Marriott Mumbai', contactPerson: 'Raju', phone: '+91 9876543210', email: 'raju@marriott.com', product: 'Shampoo 30ml', qty: 1500, boxes: 30, weight: '45 Kg', payment: 'Confirmed', address: 'Mumbai, MH', destination: 'Mumbai', detailedAddress: 'Marine Drive, Nariman Point', city: 'Mumbai', state: 'MH', pincode: '400021', transport: 'Fast Cargo', status: 'Ready to Dispatch', salesPerson: 'Arun', createdAt: '2024-01-21T11:30:00Z' },
  { key: 2, id: 'ORD-2403', client: 'Taj Hotels Delhi', contactPerson: 'Raman', phone: '+91 9123456780', email: 'raman@taj.com', product: 'Dental Kit', qty: 3000, boxes: 60, weight: '90 Kg', payment: 'Pending', address: 'Delhi, DL', destination: 'New Delhi', detailedAddress: 'Sardar Patel Marg', city: 'New Delhi', state: 'DL', pincode: '110021', transport: '-', status: 'Payment Pending', salesPerson: 'Priya', createdAt: '2024-01-22T14:15:00Z' },
  { key: 3, id: 'ORD-2404', client: 'ITC Grand', contactPerson: 'Sonia', phone: '+91 9988776655', email: 'sonia@itc.com', product: 'Soap + Shampoo Kit', qty: 5000, boxes: 100, weight: '200 Kg', payment: 'Confirmed', address: 'Kolkata, WB', destination: 'Kolkata', detailedAddress: 'JBS Haldane Avenue', city: 'Kolkata', state: 'WB', pincode: '700046', transport: 'Blue Dart', status: 'Dispatched', salesPerson: 'Karthik', createdAt: '2024-01-23T09:45:00Z' },
  { key: 4, id: 'ORD-2406', client: 'Hyatt Chennai', contactPerson: 'Arun', phone: '+91 9876512345', email: 'arun@hyatt.com', product: 'Conditioner 30ml', qty: 2000, boxes: 40, weight: '60 Kg', payment: 'Confirmed', address: 'Chennai, TN', destination: 'Chennai', detailedAddress: '365 Anna Salai, Teynampet', city: 'Chennai', state: 'TN', pincode: '600018', transport: '-', status: 'Packing', salesPerson: 'Arun', createdAt: '2024-01-24T10:20:00Z' },
];

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

const ORDER_PRODUCTS = {
  'ORD-2402': [
    { key: 1, name: 'Shampoo 30ml', qty: 1000, rate: 5.5, boxes: 20 },
    { key: 2, name: 'Shampoo 50ml', qty: 500, rate: 7.0, boxes: 10 },
  ],
  'ORD-2403': [{ key: 1, name: 'Dental Kit', qty: 3000, rate: 12.0, boxes: 60 }],
  'ORD-2404': [
    { key: 1, name: 'Soap 30g', qty: 2500, rate: 3.5, boxes: 50 },
    { key: 2, name: 'Shampoo 30ml', qty: 2500, rate: 5.5, boxes: 50 },
  ],
  'ORD-2406': [{ key: 1, name: 'Conditioner 30ml', qty: 2000, rate: 6.0, boxes: 40 }],
};

const MOCK_PARSED = {
  lrNumber: 'LR-78921',
  lrDate: '2024-01-25',
  transportName: 'Fast Cargo Pvt Ltd',
  fromCity: 'Coimbatore',
  toCity: 'Mumbai',
  weight: '45.5 Kg',
  freight: '₹2,100',
  packages: '30',
  estimatedDelivery: '2024-01-28',
};

const stepIndex = (status) => {
  if (status === 'Dispatched') return 3;
  if (status === 'Ready to Dispatch') return 2;
  if (status === 'Payment Pending') return 1;
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const order = dispatchOrders.find((o) => o.id === id);

  const [form] = Form.useForm();
  const [lrForm] = Form.useForm();

  // Dispatch verification state
  const [dispatchType, setDispatchType] = useState(null);
  const [verifiedProducts, setVerifiedProducts] = useState(new Set());
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyAuto, setNotifyAuto] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  // Post-dispatch state (lorry receipt section)
  const [lrFileList, setLrFileList] = useState([]);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [lrEditMode, setLrEditMode] = useState(false);
  const [finishedDispatch, setFinishedDispatch] = useState(false);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#161622' : '#fafbff';

  const toggleVerify = (productKey) => {
    setVerifiedProducts(prev => {
      const next = new Set(prev);
      next.has(productKey) ? next.delete(productKey) : next.add(productKey);
      return next;
    });
  };

  const handlePrintDispatchDetails = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Details — ${order.id}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; font-size: 13px; color: #111; }
  h2 { color: #B11E6A; margin-bottom: 4px; }
  .badge { background: #B11E6A; color: #fff; display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
</style></head><body>
<div class="badge">HEAL N GLOW — DISPATCH DETAILS</div>
<h2>${order.id} — ${order.client}</h2>
<table>
  <tr><th>Client</th><td>${order.client}</td><th>Contact</th><td>${order.contactPerson}</td></tr>
  <tr><th>Phone</th><td>${order.phone}</td><th>Email</th><td>${order.email}</td></tr>
  <tr><th>Destination</th><td>${order.destination || '—'}</td><th>Address</th><td>${order.detailedAddress}, ${order.city}, ${order.state} — ${order.pincode}</td></tr>
  <tr><th>Product</th><td>${order.product}</td><th>Quantity</th><td>${order.qty.toLocaleString()} units</td></tr>
  <tr><th>Boxes</th><td>${order.boxes}</td><th>Weight</th><td>${order.weight}</td></tr>
  <tr><th>Transport</th><td>${order.transport || '—'}</td><th>Sales Person</th><td>${order.salesPerson}</td></tr>
  <tr><th>Payment</th><td>${order.payment}</td><th>Status</th><td>${order.status}</td></tr>
</table>
</body></html>`);
    win.document.close();
    win.print();
  };

  const handleConfirmDispatch = async () => {
    message.loading('Confirming dispatch...', 1.2).then(() => {
      setDispatched(true);
      const notifyParts = [notifyAuto && 'Sales & Customer', notifyWhatsApp && 'WhatsApp'].filter(Boolean).join(', ');
      message.success(`Dispatch confirmed! Notifications sent via: ${notifyParts || 'none'}.`);
    });
  };

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      setAiParsed(MOCK_PARSED);
      lrForm.setFieldsValue(MOCK_PARSED);
      setAiParsing(false);
      setLrEditMode(true);
      message.success('AI extracted lorry receipt details. Review and confirm below.');
    }, 1800);
  };

  const handleFinishedDispatch = () => {
    message.loading('Sending notifications...', 1.5).then(() => {
      setFinishedDispatch(true);
      message.success({
        content: (
          <span>
            <strong>Dispatch Finished!</strong> Notifications sent to Sales ({order.salesPerson}) and Customer ({order.client}) via WhatsApp.
          </span>
        ),
        duration: 4,
      });
    });
  };

  if (!order) {
    return (
      <div className="page-container">
        <Alert type="error" message={`Order "${id}" not found.`} showIcon style={{ borderRadius: 8 }} />
        <Button style={{ marginTop: 12 }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')}>Back to Dispatch</Button>
      </div>
    );
  }

  const products = ORDER_PRODUCTS[order.id] || [];
  const lrUploaded = lrFileList.length > 0;

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')} style={{ flexShrink: 0 }}>Back</Button>
        <PageBreadcrumb
          title={`Dispatch: ${order.id}`}
          items={[{ label: 'Dispatch', link: '/dispatch' }, { label: order.id }]}
        />
        {dispatched && (
          <Tag color="success" style={{ borderRadius: 20, fontSize: 12, padding: '2px 12px' }}>
            <CheckCircleOutlined /> Dispatched
          </Tag>
        )}
      </div>

      {order.payment !== 'Confirmed' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="error" showIcon
            message="Dispatch Blocked — Payment Not Confirmed"
            description="This order cannot be dispatched until full payment is received."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}

      <Row gutter={[16, 16]}>
        {/* ── Left: Order Details ─────────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Order Details</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Descriptions bordered size="small" column={1} labelStyle={{ width: 130 }}>
                <Descriptions.Item label="Order ID">
                  <Text strong style={{ color: '#B11E6A' }}>{order.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Client"><Text strong>{order.client}</Text></Descriptions.Item>
                <Descriptions.Item label="Contact Person">{order.contactPerson}</Descriptions.Item>
                <Descriptions.Item label="Phone">
                  <a href={`tel:${order.phone}`} style={{ color: '#B11E6A' }}>{order.phone}</a>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{order.email}</Descriptions.Item>
                <Descriptions.Item label="Destination">
                  <Space size={4}><EnvironmentOutlined style={{ color: '#B11E6A' }} /><Text strong>{order.destination || '—'}</Text></Space>
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <Space align="start">
                    <EnvironmentOutlined style={{ color: '#B11E6A', marginTop: 2 }} />
                    <span>{order.detailedAddress},<br />{order.city}, {order.state} — {order.pincode}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Product">{order.product}</Descriptions.Item>
                <Descriptions.Item label="Quantity">{order.qty.toLocaleString()} units</Descriptions.Item>
                <Descriptions.Item label="Boxes">
                  <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong>{order.boxes}</Text></Space>
                </Descriptions.Item>
                <Descriptions.Item label="Weight">{order.weight}</Descriptions.Item>
                <Descriptions.Item label="Transport">{order.transport || '—'}</Descriptions.Item>
                <Descriptions.Item label="Sales Person">{order.salesPerson}</Descriptions.Item>
                <Descriptions.Item label="Payment">
                  <Tag color={order.payment === 'Confirmed' ? 'success' : 'error'}>{order.payment}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag style={{ borderRadius: 20, background: `${statusColor[order.status]}22`, color: statusColor[order.status], border: `1px solid ${statusColor[order.status]}44` }}>
                    {order.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 20, padding: '12px 0', borderTop: `1px solid ${borderColor}` }}>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Dispatch Progress</Text>
                <Steps size="small" current={dispatched ? 3 : stepIndex(order.status)}
                  items={[{ title: 'Packing' }, { title: 'Payment' }, { title: 'Verified' }, { title: 'Dispatched' }]}
                />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* ── Right: Dispatch Verification ────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Dispatch Verification</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Form form={form} layout="vertical" size="small">
                {/* Row 1: Transport, Boxes, Weight, Dispatch Type */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Transport Name" name="transport">
                      <Input placeholder="e.g. Fast Cargo" defaultValue={order.transport !== '-' ? order.transport : ''} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Box Count (Verify)" name="boxes">
                      <Input type="number" defaultValue={order.boxes} prefix={<InboxOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Weight (Verify)" name="weight">
                      <Input placeholder="kg" defaultValue={order.weight} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Dispatch Type" name="dispatchType">
                      <Select
                        placeholder="Select dispatch type"
                        value={dispatchType}
                        onChange={(v) => { setDispatchType(v); setVerifiedProducts(new Set()); }}
                      >
                        <Option value="Full Dispatch">Full Dispatch</Option>
                        <Option value="Partial Dispatch">Partial Dispatch</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Product Details table — shows when dispatch type selected */}
                {dispatchType && (
                  <div style={{ marginBottom: 16, border: `1px solid #B11E6A33`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}>
                        <InboxOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>Product Details — {order.id}</Text>
                        <Tag color={dispatchType === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12, fontSize: 11 }}>
                          {dispatchType}
                        </Tag>
                      </Space>
                      <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                        {verifiedProducts.size} / {products.length} verified
                      </Text>
                    </div>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={products}
                      style={{ borderRadius: 0 }}
                      columns={[
                        { title: 'Product Name', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
                        { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
                        { title: 'Rate (₹)', dataIndex: 'rate', render: (v) => `₹${v}` },
                        { title: 'Boxes', dataIndex: 'boxes', render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space> },
                        {
                          title: 'Status', key: 'status',
                          render: (_, row) => verifiedProducts.has(row.key)
                            ? <Tag color="success" style={{ borderRadius: 20 }}>Verified</Tag>
                            : <Tag color="default" style={{ borderRadius: 20 }}>Pending</Tag>,
                        },
                        {
                          title: 'Action', key: 'action',
                          render: (_, row) => (
                            <Button size="small" icon={<CheckSquareOutlined />}
                              style={verifiedProducts.has(row.key) ? { borderColor: '#52c41a', color: '#52c41a' } : { background: '#B11E6A', border: 'none', color: '#fff' }}
                              onClick={() => toggleVerify(row.key)}
                            >
                              {verifiedProducts.has(row.key) ? 'Unverify' : 'Verify'}
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Box Photos */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Open Box Photo">
                      <Upload listType="picture" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<CameraOutlined />} block>Open Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Close Box Photo">
                      <Upload listType="picture" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<CameraOutlined />} block>Close Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Invoice */}
                <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FileDoneOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Invoice</Text>
                  </div>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Invoice Number" name="invoiceNumber" style={{ marginBottom: 8 }}>
                        <Input placeholder="e.g. INV-2024-001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Invoice Date" name="invoiceDate" style={{ marginBottom: 8 }}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Upload Invoice" name="invoiceFile" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList} style={{ marginBottom: 0 }}>
                        <Upload listType="picture" maxCount={3} beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png">
                          <Button icon={<UploadOutlined />} block style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                            Upload Invoice (PDF / Image)
                          </Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                {/* Notify Options */}
                <div style={{ background: isDark ? '#161622' : '#fffaf8', border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <Text strong style={{ color: textColor, fontSize: 13, display: 'block', marginBottom: 10 }}>
                    <BellOutlined style={{ color: '#B11E6A', marginRight: 6 }} />Notify on Dispatch
                  </Text>
                  <Space direction="vertical" size={8}>
                    <Checkbox checked={notifyAuto} onChange={(e) => setNotifyAuto(e.target.checked)} style={{ color: textColor }}>
                      Auto-notify Sales person &amp; Customer
                    </Checkbox>
                    <Checkbox checked={notifyWhatsApp} onChange={(e) => setNotifyWhatsApp(e.target.checked)} style={{ color: textColor }}>
                      <WhatsAppOutlined style={{ color: '#25D366', marginRight: 4 }} />Send WhatsApp notification
                    </Checkbox>
                  </Space>
                </div>
              </Form>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Button icon={<PrinterOutlined />} onClick={handlePrintDispatchDetails}>
                  Print Dispatch Details
                </Button>
                <Button icon={<SaveOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>
                  Save as Draft
                </Button>
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  disabled={order.payment !== 'Confirmed' || dispatched}
                  style={{ background: (order.payment === 'Confirmed' && !dispatched) ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none' }}
                  onClick={handleConfirmDispatch}
                >
                  {dispatched ? 'Dispatched ✓' : 'Confirm Dispatch'}
                </Button>
              </div>

              {/* ════════════════════════════════════════════════════════════
                  POST-DISPATCH SECTION — Lorry Receipt + Tracking
                  Shown always; prominently after Confirm Dispatch
              ═══════════════════════════════════════════════════════════════ */}
              <Divider style={{ margin: '20px 0 16px' }}>
                <Text style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>
                  After Dispatch — Lorry Receipt &amp; Tracking
                </Text>
              </Divider>

              {/* Lorry Receipt Upload */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A33`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <UploadOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Lorry Receipt (Manual Upload)</Text>
                  {lrUploaded && <Tag color="success" style={{ borderRadius: 12 }}>Uploaded</Tag>}
                </div>

                <Upload
                  listType="picture"
                  fileList={lrFileList}
                  maxCount={3}
                  beforeUpload={() => false}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={({ fileList }) => {
                    setLrFileList(fileList);
                    if (fileList.length > 0 && !aiParsed) {
                      // Auto-trigger AI parse hint
                      message.info('Lorry receipt uploaded. Click "AI Parse Receipt" to extract details automatically.');
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />} block style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                    Upload Lorry Receipt (PDF / Image)
                  </Button>
                </Upload>

                {/* AI Parse — shown once receipt is uploaded */}
                {lrUploaded && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Space>
                        <ThunderboltOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>AI Receipt Parser</Text>
                        <Tag color="purple" style={{ fontSize: 10 }}>Auto-extract details</Tag>
                      </Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        loading={aiParsing}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                        onClick={handleAIParse}
                      >
                        {aiParsing ? 'Parsing…' : 'AI Parse Receipt'}
                      </Button>
                    </div>

                    {/* Extracted / Editable Fields */}
                    {aiParsed && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                            <CheckCircleOutlined style={{ marginRight: 4 }} />AI extracted details — review &amp; edit if needed
                          </Text>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setLrEditMode(!lrEditMode)}
                            style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}
                          >
                            {lrEditMode ? 'View Summary' : 'Edit Details'}
                          </Button>
                        </div>

                        <Form form={lrForm} layout="vertical" size="small">
                          {lrEditMode ? (
                            <Row gutter={12}>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Number" name="lrNumber">
                                  <Input placeholder="e.g. LR-78921" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Date" name="lrDate">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Transport Name" name="transportName">
                                  <Input placeholder="e.g. Fast Cargo Pvt Ltd" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="No. of Packages" name="packages">
                                  <Input placeholder="30" prefix={<InboxOutlined />} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="From City" name="fromCity">
                                  <Input placeholder="Coimbatore" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="To City" name="toCity">
                                  <Input placeholder="Mumbai" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Weight" name="weight">
                                  <Input placeholder="45.5 Kg" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Freight Amount" name="freight">
                                  <Input placeholder="₹2,100" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Estimated Delivery" name="estimatedDelivery">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                            </Row>
                          ) : (
                            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                              <Descriptions.Item label="LR Number"><Text strong style={{ color: '#B11E6A' }}>{aiParsed.lrNumber}</Text></Descriptions.Item>
                              <Descriptions.Item label="LR Date">{aiParsed.lrDate}</Descriptions.Item>
                              <Descriptions.Item label="Transport">{aiParsed.transportName}</Descriptions.Item>
                              <Descriptions.Item label="Packages"><Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} />{aiParsed.packages}</Space></Descriptions.Item>
                              <Descriptions.Item label="From → To">{aiParsed.fromCity} → {aiParsed.toCity}</Descriptions.Item>
                              <Descriptions.Item label="Weight">{aiParsed.weight}</Descriptions.Item>
                              <Descriptions.Item label="Freight">{aiParsed.freight}</Descriptions.Item>
                              <Descriptions.Item label="Est. Delivery">{aiParsed.estimatedDelivery}</Descriptions.Item>
                            </Descriptions>
                          )}
                        </Form>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Tracking via Lorry Service */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <LinkOutlined style={{ color: '#B11E6A', fontSize: 15 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Tracking via Lorry Service</Text>
                </div>
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <Form.Item label="Tracking URL (from lorry service web app)" name="trackingUrl" style={{ marginBottom: 8 }}>
                        <Input
                          placeholder="https://fastcargo.in/track/LR-78921"
                          prefix={<LinkOutlined style={{ color: '#B11E6A' }} />}
                          addonAfter={
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, color: '#B11E6A' }}
                              onClick={() => {
                                const url = document.querySelector('input[placeholder*="track"]')?.value;
                                if (url) window.open(url, '_blank');
                              }}
                            >
                              Open
                            </Button>
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item label="LR / Tracking Number" name="trackingLR" style={{ marginBottom: 8 }}>
                        <Input placeholder="e.g. LR-78921" defaultValue={aiParsed?.lrNumber || ''} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>

              {/* ── Finished Dispatch ── */}
              <div style={{ background: finishedDispatch ? '#52c41a15' : isDark ? '#1a1a2a' : '#fff9fb', border: `1.5px solid ${finishedDispatch ? '#52c41a44' : '#B11E6A44'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <Text strong style={{ color: textColor, fontSize: 13 }}>
                    <BellOutlined style={{ color: finishedDispatch ? '#52c41a' : '#B11E6A', marginRight: 6 }} />
                    Finished Dispatch — Final Notification
                  </Text>
                  <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
                    Clicking this will notify <strong>{order.salesPerson}</strong> (Sales) and <strong>{order.client}</strong> (Customer) that the order has been dispatched and is on the way.
                  </div>
                </div>
                {finishedDispatch ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a', fontWeight: 600 }}>
                    <CheckCircleOutlined />
                    Notifications sent to Sales ({order.salesPerson}) &amp; Customer ({order.client})
                  </div>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<WhatsAppOutlined />}
                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
                    onClick={handleFinishedDispatch}
                  >
                    Finished Dispatch — Notify Sales &amp; Customer
                  </Button>
                )}
              </div>

            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
