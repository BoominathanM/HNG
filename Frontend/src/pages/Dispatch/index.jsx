import React, { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Upload, Typography, Space, Steps, Descriptions, Alert } from 'antd';
import { CarOutlined, CameraOutlined, CheckCircleOutlined, UploadOutlined, EyeOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;

const dispatchOrders = [
  { key: 1, id: 'ORD-2402', client: 'Marriott Mumbai', contactPerson: 'Raju', phone: '+91 9876543210', email: 'raju@marriott.com', product: 'Shampoo 30ml', qty: 1500, boxes: 30, weight: '45 Kg', payment: 'Confirmed', address: 'Mumbai, MH', detailedAddress: 'Marine Drive, Nariman Point', city: 'Mumbai', state: 'MH', pincode: '400021', transport: 'Fast Cargo', status: 'Ready to Dispatch' },
  { key: 2, id: 'ORD-2403', client: 'Taj Hotels Delhi', contactPerson: 'Raman', phone: '+91 9123456780', email: 'raman@taj.com', product: 'Dental Kit', qty: 3000, boxes: 60, weight: '90 Kg', payment: 'Pending', address: 'Delhi, DL', detailedAddress: 'Sardar Patel Marg', city: 'New Delhi', state: 'DL', pincode: '110021', transport: '-', status: 'Payment Pending' },
  { key: 3, id: 'ORD-2404', client: 'ITC Grand', contactPerson: 'Sonia', phone: '+91 9988776655', email: 'sonia@itc.com', product: 'Soap + Shampoo Kit', qty: 5000, boxes: 100, weight: '200 Kg', payment: 'Confirmed', address: 'Kolkata, WB', detailedAddress: 'JBS Haldane Avenue', city: 'Kolkata', state: 'WB', pincode: '700046', transport: 'Blue Dart', status: 'Dispatched' },
  { key: 4, id: 'ORD-2406', client: 'Hyatt Chennai', contactPerson: 'Arun', phone: '+91 9876512345', email: 'arun@hyatt.com', product: 'Conditioner 30ml', qty: 2000, boxes: 40, weight: '60 Kg', payment: 'Confirmed', address: 'Chennai, TN', detailedAddress: '365 Anna Salai, Teynampet', city: 'Chennai', state: 'TN', pincode: '600018', transport: '-', status: 'Packing' },
];

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

export default function Dispatch() {
  const isDark = useSelector((s) => s.theme.isDark);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const columns = [
    { title: 'Order', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Product', dataIndex: 'product', responsive: ['md'] },
    { title: 'Boxes', dataIndex: 'boxes', responsive: ['sm'] },
    { title: 'Weight', dataIndex: 'weight', responsive: ['lg'] },
    { title: 'Payment', dataIndex: 'payment', render: (v) => <Tag style={{ borderRadius: 20, background: v === 'Confirmed' ? '#6b124022' : '#B11E6A22', color: v === 'Confirmed' ? '#6b1240' : '#B11E6A', border: `1px solid ${v === 'Confirmed' ? '#6b124044' : '#B11E6A44'}` }}>{v}</Tag> },
    { title: 'Transport', dataIndex: 'transport', responsive: ['lg'] },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag style={{ borderRadius: 20, fontWeight: 500, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedOrder(r); setModalOpen(true); }} />
          {r.status === 'Ready to Dispatch' && (
            <Button size="small" type="primary" icon={<CarOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Dispatch</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Dispatch Team" items={[{ label: 'Dispatch Team' }]} />

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Ready to Dispatch', count: 1, color: '#B11E6A' },
          { label: 'Packing in Progress', count: 1, color: '#8a1652' },
          { label: 'Dispatched Today', count: 1, color: '#C94F8A' },
          { label: 'Payment Pending', count: 1, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} bodyStyle={{ padding: '16px 8px' }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.count}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={dispatchOrders} columns={columns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
        </div>
      </Card>

      {/* Dispatch Modal */}
      <Modal
        title={`Dispatch: ${selectedOrder?.id}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={Math.min(800, window.innerWidth - 32)}
        footer={[
          <Button key="close" onClick={() => setModalOpen(false)}>Close</Button>,
          <Button key="confirm" type="primary" icon={<CarOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            disabled={selectedOrder?.payment !== 'Confirmed'}>
            Confirm Dispatch
          </Button>,
        ]}
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedOrder.payment !== 'Confirmed' && (
              <Alert type="error" message="Payment not confirmed. Dispatch not allowed until payment is received." showIcon />
            )}

            <Descriptions bordered size="small" layout="vertical" column={2}>
              <Descriptions.Item label="Client">{selectedOrder.client}</Descriptions.Item>
              <Descriptions.Item label="Contact Person">{selectedOrder.contactPerson || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone"><a href={`tel:${selectedOrder.phone}`}>{selectedOrder.phone || '—'}</a></Descriptions.Item>
              <Descriptions.Item label="Email">{selectedOrder.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Address"><EnvironmentOutlined /> {selectedOrder.detailedAddress ? `${selectedOrder.detailedAddress}, ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.pincode}` : selectedOrder.address}</Descriptions.Item>
              <Descriptions.Item label="Boxes">{selectedOrder.boxes}</Descriptions.Item>
              <Descriptions.Item label="Weight">{selectedOrder.weight}</Descriptions.Item>
              <Descriptions.Item label="Transport">{selectedOrder.transport || '—'}</Descriptions.Item>
              <Descriptions.Item label="Payment"><Tag color={selectedOrder.payment === 'Confirmed' ? 'green' : 'red'}>{selectedOrder.payment}</Tag></Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Row gutter={12}>
                <Col xs={24} sm={12}><Form.Item label="Transport Name"><Input placeholder="e.g. Fast Cargo" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Box Count (Verify)"><Input type="number" defaultValue={selectedOrder.boxes} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Weight (Verify)"><Input placeholder="kg" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Dispatch Type">
                  <select style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #d9d9d9' }}>
                    <option>Full Dispatch</option>
                    <option>Partial Dispatch</option>
                  </select>
                </Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item label="Open Box Photo">
                    <Upload listType="picture" maxCount={1}><Button icon={<CameraOutlined />} block>Upload</Button></Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Closed Box Photo">
                    <Upload listType="picture" maxCount={1}><Button icon={<CameraOutlined />} block>Upload</Button></Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label="Lorry Receipt">
                    <Upload listType="picture" maxCount={1}><Button icon={<UploadOutlined />} block>Upload</Button></Upload>
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Steps size="small" current={selectedOrder.status === 'Dispatched' ? 4 : selectedOrder.status === 'Ready to Dispatch' ? 2 : 1}
              items={[
                { title: 'Packing' },
                { title: 'Payment' },
                { title: 'Verified' },
                { title: 'Dispatched' },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
