import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, DatePicker, Upload, message, InputNumber, Divider, List, Descriptions, Tabs
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, ShoppingOutlined, SearchOutlined,
  UploadOutlined, EyeOutlined, EditOutlined, FileTextOutlined, WarningOutlined, InfoCircleOutlined, WhatsAppOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const INVENTORY_DATA = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', current: 450, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', current: 45, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 3, code: 'PK-010', name: 'Amber Bottles 100ml', current: 120, min: 500, unit: 'Pcs', category: 'Packaging' },
  { key: 4, code: 'PK-012', name: 'Flip Top Caps', current: 800, min: 1000, unit: 'Pcs', category: 'Packaging' },
];

export default function Purchase() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseForm] = Form.useForm();

  const purchases = [
    {
      key: 1,
      date: '2024-05-01',
      bill_no: 'PUR-8821',
      inv_no: 'INV-CHEM-101',
      items: [
        { name: 'Soap Base (White)', qty: '100 Kg', price: '₹85', total: '₹8,500' },
      ],
      entity: 'ChemCo India',
      amount: '₹8,500',
      status: 'Paid',
      req_status: 'Confirmed'
    },
    {
      key: 2,
      date: '2024-05-04',
      bill_no: 'PUR-8825',
      inv_no: 'INV-BIO-452',
      items: [
        { name: 'Shampoo Concentrate', qty: '200 Ltr', price: '₹220', total: '₹44,000' }
      ],
      entity: 'BioLife Ltd',
      amount: '₹44,000',
      status: 'Unpaid',
      req_status: 'Pending'
    },
  ];

  const handleOpenRequest = (product) => {
    setSelectedProduct(product);
    const suggestQty = product.min > product.current ? (product.min - product.current) * 2 : product.min;
    purchaseForm.setFieldsValue({
      product: product.name,
      qty: suggestQty,
      unit: product.unit
    });
    setShowAddPurchaseModal(true);
  };

  const handleRaiseRequest = (values) => {
    message.success(`Purchase request for ${values.product} raised successfully`);
    setShowAddPurchaseModal(false);
    purchaseForm.resetFields();
    setSelectedProduct(null);
  };

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Purchase Module" items={[{ label: 'Purchase' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <Tabs
              defaultActiveKey="stock_status"
              items={[
                {
                  key: 'stock_status',
                  label: <Space><WarningOutlined /> Stock Status & Raise Request</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Inventory Stock Availability</Title>
                        <Text type="secondary">Raise purchase requests directly for low stock products</Text>
                      </div>
                      <Table
                        size="small"
                        dataSource={INVENTORY_DATA}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: 'Item Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
                          { title: 'Category', dataIndex: 'category', key: 'category' },
                          { title: 'Current Stock', dataIndex: 'current', key: 'current', render: (v, r) => <Text style={{ color: v <= r.min ? '#ff4d4f' : 'inherit' }}>{v} {r.unit}</Text> },
                          { title: 'Min. Required', dataIndex: 'min', key: 'min', render: (v, r) => `${v} ${r.unit}` },
                          {
                            title: 'Status',
                            key: 'status',
                            render: (_, r) => (
                              <Tag color={r.current <= r.min ? 'error' : 'success'} style={{ borderRadius: 12 }}>
                                {r.current <= r.min ? 'Low Stock' : 'Healthy'}
                              </Tag>
                            )
                          },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, r) => (
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                style={{
                                  background: r.current <= r.min ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0',
                                  border: 'none',
                                  color: r.current <= r.min ? '#fff' : '#888'
                                }}
                                onClick={() => handleOpenRequest(r)}
                              >
                                Raise Request
                              </Button>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: 'history',
                  label: <Space><FileTextOutlined /> Purchase Order History</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Order History</Title>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                      </div>
                      <Table
                        size="small"
                        dataSource={purchases}
                        columns={[
                          { title: 'Date', dataIndex: 'date', key: 'date' },
                          {
                            title: 'Bill / Inv No', key: 'nos', render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Text size="small" type="secondary">{r.bill_no}</Text>
                                <Text size="small" style={{ color: '#B11E6A', fontSize: 11 }}>{r.inv_no}</Text>
                              </Space>
                            )
                          },
                          { title: 'Items', key: 'items', render: (_, r) => r.items.map(i => i.name).join(', ') },
                          { title: 'Supplier', dataIndex: 'entity', key: 'entity', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Total Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong>{v}</Text> },
                          { title: 'Status', dataIndex: 'req_status', key: 'status', render: (v) => <Tag color={v === 'Confirmed' ? 'success' : 'processing'}>{v}</Tag> },
                          {
                            title: 'Actions', key: 'actions',
                            render: () => <Button size="small" type="text" icon={<EyeOutlined />} />
                          }
                        ]}
                      />
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Raise Purchase Order Request</Text>}
        open={showAddPurchaseModal}
        onCancel={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); }}
        footer={null}
        width={700}
        centered
      >
        <Form form={purchaseForm} layout="vertical" onFinish={handleRaiseRequest} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Product" name="product" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplier" rules={[{ required: true }]}>
                <Select placeholder="Select supplier">
                  <Option value="ChemCo India">ChemCo India</Option>
                  <Option value="BioLife Ltd">BioLife Ltd</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {selectedProduct && (
            <div style={{ padding: '12px 16px', background: selectedProduct.current <= selectedProduct.min ? '#fffbe6' : '#e6f7ff', border: `1px solid ${selectedProduct.current <= selectedProduct.min ? '#ffe58f' : '#91d5ff'}`, marginBottom: 20, borderRadius: 8, display: 'flex', gap: 12 }}>
              <div style={{ color: selectedProduct.current <= selectedProduct.min ? '#856404' : '#0050b3', fontSize: 18 }}><InfoCircleOutlined /></div>
              <Descriptions size="small" column={3} title="Stock Status">
                <Descriptions.Item label="Current Stock"><Text strong>{selectedProduct.current} {selectedProduct.unit}</Text></Descriptions.Item>
                <Descriptions.Item label="Min. Required"><Text type="danger">{selectedProduct.min} {selectedProduct.unit}</Text></Descriptions.Item>
                <Descriptions.Item label="Gap"><Text strong style={{ color: '#ff4d4f' }}>{selectedProduct.min - selectedProduct.current} {selectedProduct.unit}</Text></Descriptions.Item>
              </Descriptions>
            </div>
          )}

          <Divider orientation="left" style={{ margin: '12px 0' }}>Order Details</Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Payment Terms" name="payment_terms" rules={[{ required: true }]}>
                <Select placeholder="Select payment terms">
                  <Option value="100% Payment">100% Payment</Option>
                  <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                  <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Quantity" name="qty" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Unit" name="unit">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Bill No" name="bill_no" rules={[{ required: true }]}>
                <Input placeholder="PUR-XXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Invoice No" name="inv_no">
                <Input placeholder="INV-XXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Order Date" name="date" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Unit Price" name="price" rules={[{ required: true }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Total Amount" name="amount" rules={[{ required: true }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Invoice Attachment" name="invoice">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload maxCount={1} beforeUpload={() => false}>
                <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Upload Invoice File</Button>
              </Upload>
              <Button
                block
                icon={<EyeOutlined />}
                onClick={() => {
                  message.loading('AI Scanning invoice...', 2).then(() => {
                    purchaseForm.setFieldsValue({
                      amount: 12500,
                      qty: 150,
                      price: 83.33,
                      date: dayjs(),
                      bill_no: 'PUR-' + Math.floor(Math.random() * 9000 + 1000)
                    });
                    message.success('AI extracted details successfully!');
                  });
                }}
                style={{ borderColor: '#B11E6A', color: '#B11E6A' }}
              >
                Scan Invoice with AI
              </Button>
            </Space>
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button
              icon={<WhatsAppOutlined />}
              onClick={() => {
                const values = purchaseForm.getFieldsValue();
                if (!values.product || !values.supplier) {
                  message.warning('Please select product and supplier first');
                  return;
                }
                const msg = `Hello, I would like to request a quotation for: ${values.product}. Quantity: ${values.qty || 'N/A'}. Payment Terms: ${values.payment_terms || 'TBD'}. Please advise.`;
                window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              style={{ flex: 1, height: 40, borderRadius: 8, borderColor: '#25D366', color: '#25D366' }}
            >
              Ask Quotation
            </Button>
            <Button onClick={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); }} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}>Raise Request</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
