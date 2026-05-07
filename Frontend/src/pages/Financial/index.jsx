import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Typography, Space, Select, message, Tabs, Statistic, List, Divider, Modal, Descriptions, Upload, InputNumber, Form
} from 'antd';
import {
  WhatsAppOutlined, ShopOutlined, CheckCircleOutlined, WalletOutlined,
  ContainerOutlined, ArrowUpOutlined, ClockCircleOutlined, EyeOutlined, InfoCircleOutlined, UploadOutlined, DollarCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Financial() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [viewRequest, setViewRequest] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [paymentForm] = Form.useForm();

  // State for Purchase Requests
  const [purchaseRequests, setPurchaseRequests] = useState([
    { 
      key: 1, 
      item: 'Soap Base (Transparent)', 
      qty: 100, 
      unit: 'Kg', 
      date: '2024-05-07', 
      status: 'Unpaid', 
      amount: 8500,
      bill_no: 'PUR-8821',
      inv_no: 'INV-CHEM-101',
      payment_terms: '50% Advance, 50% on Dispatch',
      stock_context: { current: 45, min: 100, category: 'Raw Materials' }
    },
    { 
      key: 2, 
      item: 'Shampoo Bottles (Flip 30ml)', 
      qty: 500, 
      unit: 'Pcs', 
      date: '2024-05-07', 
      status: 'Unpaid', 
      amount: 2250,
      bill_no: 'PUR-8825',
      inv_no: 'INV-BIO-452',
      payment_terms: '100% Payment',
      stock_context: { current: 120, min: 500, category: 'Packaging' }
    },
  ]);

  const [expenseRequests, setExpenseRequests] = useState([
    { key: 1, date: '2024-05-06', category: 'SHIPPING', desc: 'Logistics to Bangalore', amount: 5500, status: 'Unpaid', vendor: 'DTDC', bill_no: 'EXP-101' },
    { key: 2, date: '2024-05-07', category: 'UTILITY', desc: 'Electricity Bill', amount: 12400, status: 'Unpaid', vendor: 'TNEB', bill_no: 'EXP-102' },
  ]);

  const vendorsList = [
    { key: 1, name: 'ChemCo India', phone: '+91 98765 43210' },
    { key: 2, name: 'BioLife Ltd', phone: '+91 87654 32109' },
  ];

  const handleProcessPayment = (values) => {
    const paidAmt = values.amount_paid || selectedForPayment.amount;
    const remaining = selectedForPayment.amount - paidAmt;
    const finalStatus = values.status === 'Partial Paid' && remaining > 0 ? 'Partial Paid' : 'Paid';

    message.success(`Payment of ₹${paidAmt.toLocaleString()} processed. Status: ${finalStatus}`);
    
    const updateList = selectedForPayment.bill_no.startsWith('EXP') ? setExpenseRequests : setPurchaseRequests;
    updateList(prev => prev.map(r => r.key === selectedForPayment.key ? { 
      ...r, 
      status: finalStatus, 
      paid_amount: (r.paid_amount || 0) + paidAmt,
      payment_proof: 'uploaded' 
    } : r));
    setShowPaymentModal(false);
    setSelectedForPayment(null);
    paymentForm.resetFields();
  };

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'success';
    if (status === 'Partial Paid') return 'warning';
    return 'error';
  };

  const stats = [
    { label: 'Pending Payments', value: purchaseRequests.filter(r => r.status !== 'Paid').length + expenseRequests.filter(r => r.status !== 'Paid').length, color: '#B11E6A', icon: <ClockCircleOutlined /> },
    { label: 'Unpaid Purchases', value: purchaseRequests.filter(r => r.status === 'Unpaid').length, color: '#1890ff', icon: <ShopOutlined /> },
    { label: 'Unpaid Expenses', value: expenseRequests.filter(r => r.status === 'Unpaid').length, color: '#fa8c16', icon: <WalletOutlined /> },
    { label: 'Total Paid (MTD)', value: '₹1,24,500', color: '#52c41a', icon: <ArrowUpOutlined /> },
  ];

  const purchaseColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Bill / Inv No', key: 'nos', render: (_, r) => (
      <Space direction="vertical" size={0}>
        <Text size="small" type="secondary">{r.bill_no}</Text>
        <Text size="small" style={{ color: '#B11E6A', fontSize: 11 }}>{r.inv_no}</Text>
      </Space>
    )},
    { title: 'Item Name', dataIndex: 'item', key: 'item', render: (v) => <Text strong>{v}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#B11E6A' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Payment Terms', dataIndex: 'payment_terms', key: 'terms', render: (v) => <Text style={{ fontSize: 11 }}>{v}</Text> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (v) => <Tag color={getStatusColor(v)}>{v}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewRequest(r)}>Details</Button>
          <Button size="small" type="primary" icon={<DollarCircleOutlined />} onClick={() => { setSelectedForPayment(r); setShowPaymentModal(true); }} style={{ background: '#B11E6A', border: 'none' }}>Pay</Button>
        </Space>
      )
    }
  ];

  const expenseColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Bill No', dataIndex: 'bill_no' },
    { title: 'Description', dataIndex: 'desc', key: 'desc' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#B11E6A' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={getStatusColor(v)}>{v}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Button size="small" type="primary" icon={<DollarCircleOutlined />} onClick={() => { setSelectedForPayment(r); setShowPaymentModal(true); }} style={{ background: '#B11E6A', border: 'none' }}>Pay Now</Button>
      )
    }
  ];

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Financial & Payments" items={[{ label: 'Financial' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '16px' } }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>}
                  value={s.value}
                  prefix={s.icon}
                  valueStyle={{ color: s.color, fontWeight: 700, fontSize: 24 }}
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card 
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: '8px 16px 16px' } }}
      >
        <Tabs
          defaultActiveKey="purchase"
          items={[
            {
              key: 'purchase',
              label: <Space><ShopOutlined /> Purchase Payments</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <Table size="small" dataSource={purchaseRequests} columns={purchaseColumns} pagination={{ pageSize: 8 }} />
                </div>
              )
            },
            {
              key: 'expenses',
              label: <Space><ContainerOutlined /> Expense Payments</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <Table size="small" dataSource={expenseRequests} columns={expenseColumns} pagination={{ pageSize: 8 }} />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Payment Proof Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 18 }}>Process Payment & Upload Proof</Text>}
        open={showPaymentModal}
        onCancel={() => { setShowPaymentModal(false); paymentForm.resetFields(); }}
        footer={null}
        width={500}
        centered
      >
        {selectedForPayment && (
          <Form form={paymentForm} layout="vertical" onFinish={handleProcessPayment} initialValues={{ status: 'Paid', amount_paid: selectedForPayment.amount }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Payee">{selectedForPayment.item || selectedForPayment.desc}</Descriptions.Item>
              <Descriptions.Item label="Total Amount Due"><Text strong style={{ color: '#B11E6A', fontSize: 18 }}>₹{selectedForPayment.amount.toLocaleString()}</Text></Descriptions.Item>
              <Descriptions.Item label="Paid Till Now">₹{(selectedForPayment.paid_amount || 0).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 20 }}>
              <Form.Item label="Update Payment Status" name="status" rules={[{ required: true }]}>
                <Select style={{ width: '100%' }}>
                  <Option value="Paid">100% Full Payment (Paid)</Option>
                  <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                  <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
                  <Option value="Partial Paid">Other Partial Payment</Option>
                </Select>
              </Form.Item>
            </div>

            <Row gutter={12}>
              <Col span={24}>
                <Form.Item 
                  label="Enter Amount to Pay Now" 
                  name="amount_paid" 
                  rules={[{ required: true, message: 'Please enter amount' }]}
                >
                  <InputNumber 
                    prefix="₹" 
                    style={{ width: '100%' }} 
                    placeholder="0.00"
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Upload Payment Proof (Receipt/Screenshot)" name="proof">
              <Upload.Dragger 
                style={{ background: isDark ? '#1a1a2e' : '#fafafa' }}
                maxCount={1}
                beforeUpload={() => false}
              >
                <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#B11E6A' }} /></p>
                <p className="ant-upload-text">Click or drag payment receipt</p>
              </Upload.Dragger>
            </Form.Item>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button onClick={() => { setShowPaymentModal(false); paymentForm.resetFields(); }} style={{ flex: 1 }}>Cancel</Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              >
                Submit Payment Proof
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Details Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 18 }}>Order & Payment Details</Text>}
        open={!!viewRequest}
        onCancel={() => setViewRequest(null)}
        footer={null}
        width={600}
        centered
      >
        {viewRequest && (
          <div style={{ marginTop: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Date">{viewRequest.date}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={getStatusColor(viewRequest.status)}>{viewRequest.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Bill No">{viewRequest.bill_no}</Descriptions.Item>
              <Descriptions.Item label="Payment Terms" span={2}>{viewRequest.payment_terms || 'N/A'}</Descriptions.Item>
            </Descriptions>
            {viewRequest.stock_context && (
               <>
                 <Divider orientation="left">Inventory Impact</Divider>
                 <Descriptions size="small" column={2}>
                   <Descriptions.Item label="Current Stock">{viewRequest.stock_context.current} {viewRequest.unit}</Descriptions.Item>
                   <Descriptions.Item label="Min. Requirement">{viewRequest.stock_context.min} {viewRequest.unit}</Descriptions.Item>
                 </Descriptions>
               </>
            )}
            <Divider />
            <Button block type="primary" onClick={() => setViewRequest(null)}>Close</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
