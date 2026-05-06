import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, Upload, Typography, Space,
  Steps, Descriptions, Alert, Collapse, Tag, DatePicker,
} from 'antd';
import {
  CarOutlined, CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;

// Shared data (would be an API call in production)
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

const MOCK_PARSED = {
  lrNumber: 'LR-78921', date: '2024-01-25', transportName: 'Fast Cargo Pvt Ltd',
  fromCity: 'Coimbatore', toCity: 'Mumbai', weight: '45.5 Kg',
  freight: '₹2,100', packages: '30', deliveryDate: '2024-01-28',
};

const stepIndex = (status) => {
  if (status === 'Dispatched') return 3;
  if (status === 'Ready to Dispatch') return 2;
  if (status === 'Payment Pending') return 1;
  return 0;
};

export default function DispatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const order = dispatchOrders.find((o) => o.id === id);

  const [form] = Form.useForm();
  const [aiForm] = Form.useForm();
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [notifyState, setNotifyState] = useState(false);
  const [counts, setCounts] = useState({ sticker: 0, box: 0, ziplock: 0 });

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      setAiParsed(MOCK_PARSED);
      aiForm.setFieldsValue(MOCK_PARSED);
      setAiParsing(false);
      // Simulate verification logic
      setNotifyState(true);
      message.success('AI Verified: All 3 receipts match box counts. Notify checkbox updated.');
    }, 1800);
  };

  const handleConfirmDispatch = () => {
    message.loading('Confirming dispatch and sending notifications...', 1.5).then(() => {
      message.success(`Receipt sent to Sales (${order.salesPerson}) and Customer (${order.client}) via WhatsApp!`);
      navigate('/dispatch');
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

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')} style={{ flexShrink: 0 }}>
          Back
        </Button>
        <PageBreadcrumb
          title={`Dispatch: ${order.id}`}
          items={[{ label: 'Dispatch', link: '/dispatch' }, { label: order.id }]}
        />
      </div>

      {/* Payment blocked alert */}
      {order.payment !== 'Confirmed' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert
            type="error" showIcon
            message="Dispatch Blocked — Payment Not Confirmed"
            description="This order cannot be dispatched until full payment is received. Contact the sales person to follow up."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}

      <Row gutter={[16, 16]}>
        {/* ── Left: Order Details ─────────────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Order Details</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
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
                <Descriptions.Item label="Address">
                  <Space align="start">
                    <EnvironmentOutlined style={{ color: '#B11E6A', marginTop: 2 }} />
                    <span>
                      {order.detailedAddress},<br />
                      {order.city}, {order.state} — {order.pincode}
                    </span>
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

              {/* Workflow */}
              <div style={{ marginTop: 20, padding: '12px 0', borderTop: `1px solid ${borderColor}` }}>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Dispatch Progress</Text>
                <Steps
                  size="small"
                  current={stepIndex(order.status)}
                  items={[
                    { title: 'Packing' },
                    { title: 'Payment' },
                    { title: 'Verified' },
                    { title: 'Dispatched' },
                  ]}
                />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* ── Right: Dispatch Form ────────────────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Dispatch Verification</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Form form={form} layout="vertical" size="small">
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
                      <select style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9', background: isDark ? '#1E1E2E' : '#fff', color: textColor }}>
                        <option>Full Dispatch</option>
                        <option>Partial Dispatch</option>
                      </select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Box photos */}
                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Open Box Photo">
                      <Upload listType="picture" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<CameraOutlined />} block>Open Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Close Box Photo">
                      <Upload listType="picture" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<CameraOutlined />} block>Close Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Lorry Receipt (Manual)">
                      <Upload listType="picture" maxCount={1} beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />} block>Upload</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>

              </Form>

              {/* AI Receipt Parser */}
              <Collapse
                size="small"
                style={{ borderRadius: 8, border: '1px solid #B11E6A30', marginBottom: 16 }}
                items={[
                  {
                    key: 'ai',
                    label: (
                      <Space>
                        <ThunderboltOutlined style={{ color: '#B11E6A' }} />
                        <Text strong>AI Receipt Parser</Text>
                        <Tag color="purple" style={{ fontSize: 10 }}>Auto-extract from lorry receipt</Tag>
                      </Space>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Button type="primary" icon={<ThunderboltOutlined />}
                            loading={aiParsing}
                            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                            onClick={handleAIParse}>
                            {aiParsing ? 'Verifying Counts…' : 'AI Verify All Uploaded Receipts'}
                          </Button>
                        </div>

                        {aiParsed && (
                          <div style={{ marginTop: 4, padding: 12, background: isDark ? '#161622' : '#f9f9f9', borderRadius: 8 }}>
                            <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                              <CheckCircleOutlined /> AI Verification Results
                            </Text>
                            <Descriptions size="small" column={3} bordered>
                              <Descriptions.Item label="Sticker Box Count">10</Descriptions.Item>
                              <Descriptions.Item label="Box Count">15</Descriptions.Item>
                              <Descriptions.Item label="Ziplock Count">5</Descriptions.Item>
                              <Descriptions.Item label="Total Parsed" span={3}><Text strong>30 / 30 Boxes</Text></Descriptions.Item>
                            </Descriptions>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space>
                  <Text style={{ fontSize: 12 }}>Auto-Notify Status:</Text>
                  <Tag color={notifyState ? 'success' : 'default'}>{notifyState ? 'READY' : 'WAITING'}</Tag>
                  <input type="checkbox" checked={notifyState} onChange={(e) => setNotifyState(e.target.checked)} />
                </Space>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button icon={<PrinterOutlined />} onClick={() => navigate('/dispatch')}>
                    Print Label
                  </Button>
                  <Button icon={<SaveOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>
                    Save as Draft
                  </Button>
                  <Button
                    type="primary"
                    disabled={order.payment !== 'Confirmed'}
                    style={{ background: order.payment === 'Confirmed' ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none' }}
                    onClick={handleConfirmDispatch}
                  >
                    Confirm Dispatch
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
