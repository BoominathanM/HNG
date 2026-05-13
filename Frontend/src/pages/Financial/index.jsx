import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Typography, Space, Select, message, Tabs, Statistic, List, Divider, Modal, Descriptions, Upload, InputNumber, Form, Input, DatePicker
} from 'antd';
import {
  WhatsAppOutlined, ShopOutlined, CheckCircleOutlined, CloseCircleOutlined, WalletOutlined,
  ContainerOutlined, ArrowUpOutlined, ClockCircleOutlined, EyeOutlined, InfoCircleOutlined, UploadOutlined, DollarCircleOutlined, AuditOutlined, FileTextOutlined,
  TeamOutlined, BookOutlined, SearchOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestStatus, updateOrderPaymentStatus } from '../../store/slices/purchaseSlice';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Financial() {
  const isDark = useSelector((s) => s.theme.isDark);
  const dispatch = useDispatch();
  const raisedRequests = useSelector((s) => s.purchase.raisedRequests);
  const purchaseOrders = useSelector((s) => s.purchase.purchaseOrders);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [viewRequest, setViewRequest] = useState(null);
  const [viewQuotationFile, setViewQuotationFile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [paymentForm] = Form.useForm();


  // Parties & Ledgers tab state
  const [partiesSearch, setPartiesSearch] = useState('');
  const [viewPartyLedger, setViewPartyLedger] = useState(null);

  const partiesData = [
    { key: 1, name: 'ChemCo India', type: 'Supplier', totalPurchase: 125000, paid: 80000, pending: 45000 },
    { key: 2, name: 'BioLife Ltd', type: 'Supplier', totalPurchase: 88000, paid: 88000, pending: 0 },
    { key: 3, name: 'Marriott Mumbai', type: 'Customer', totalSales: 95000, received: 70000, pending: 25000 },
    { key: 4, name: 'Taj Hotels Delhi', type: 'Customer', totalSales: 141600, received: 60000, pending: 81600 },
  ];

  const partyLedgerData = [
    { key: 1, date: '2024-05-01', type: 'Purchase', doc: 'INV-CHEM-101', debit: 85000, credit: 0, balance: 85000 },
    { key: 2, date: '2024-05-10', type: 'Payment', doc: 'PAY-001', debit: 0, credit: 40000, balance: 45000 },
    { key: 3, date: '2024-05-15', type: 'Purchase', doc: 'INV-CHEM-109', debit: 40000, credit: 0, balance: 85000 },
    { key: 4, date: '2024-05-20', type: 'Payment', doc: 'PAY-002', debit: 0, credit: 40000, balance: 45000 },
  ];

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
    const proofFileName = values.proof?.fileList?.[0]?.name || null;

    message.success(`Payment of ₹${paidAmt.toLocaleString()} processed. Status: ${finalStatus}`);

    if (selectedForPayment.bill_no?.startsWith('EXP')) {
      setExpenseRequests(prev => prev.map(r => r.key === selectedForPayment.key ? {
        ...r,
        status: finalStatus,
        paid_amount: (r.paid_amount || 0) + paidAmt,
      } : r));
    } else {
      dispatch(updateOrderPaymentStatus({
        key: selectedForPayment.key,
        status: finalStatus,
        paid_amount: (selectedForPayment.paid_amount || 0) + paidAmt,
        payment_proof: proofFileName,
      }));
    }
    setShowPaymentModal(false);
    setSelectedForPayment(null);
    paymentForm.resetFields();
  };

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'success';
    if (status === 'Partial Paid') return 'warning';
    return 'error';
  };

  const pendingRequests = raisedRequests.filter(r => r.status === 'Pending').length;
  const stats = [
    { label: 'Pending Approvals', value: pendingRequests, color: '#B11E6A', icon: <ClockCircleOutlined /> },
    { label: 'Unpaid Orders', value: purchaseOrders.filter(r => r.status === 'Unpaid').length, color: '#1890ff', icon: <ShopOutlined /> },
    { label: 'Unpaid Expenses', value: expenseRequests.filter(r => r.status === 'Unpaid').length, color: '#fa8c16', icon: <WalletOutlined /> },
    { label: 'Total Paid (MTD)', value: '₹1,24,500', color: '#52c41a', icon: <ArrowUpOutlined /> },
  ];

  const purchaseColumns = [
    { title: 'Order Date', dataIndex: 'date', key: 'date' },
    { title: 'Bill / Inv No', key: 'nos', render: (_, r) => (
      <Space direction="vertical" size={0}>
        <Text size="small" type="secondary">{r.bill_no}</Text>
        <Text size="small" style={{ color: '#B11E6A', fontSize: 11 }}>{r.inv_no}</Text>
      </Space>
    )},
    { title: 'Item', dataIndex: 'item', key: 'item', render: (v) => <Text strong>{v}</Text> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#B11E6A' }}>₹{v?.toLocaleString()}</Text> },
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
          {r.status !== 'Paid' && (
            <Button size="small" type="primary" icon={<DollarCircleOutlined />} onClick={() => { setSelectedForPayment(r); setShowPaymentModal(true); }} style={{ background: '#B11E6A', border: 'none' }}>Pay</Button>
          )}
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
          defaultActiveKey="purchase_requests"
          items={[
            {
              key: 'purchase_requests',
              label: <Space><AuditOutlined /> Quotation Requests</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0, color: textColor }}>Quotation Requests — Approve / Reject</Title>
                    <Text type="secondary">Review quotation requests raised by the procurement team and approve or reject them</Text>
                  </div>
                  <Table
                    size="small"
                    dataSource={raisedRequests}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'No quotation requests yet. Requests raised from the Purchase module will appear here.' }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'date' },
                      { title: 'Item', dataIndex: 'item', key: 'item', render: v => <Text strong>{v}</Text> },
                      { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                      { title: 'Qty', key: 'qty', render: (_, r) => `${r.qty} ${r.unit}` },
                      { title: 'Payment Terms', dataIndex: 'payment_terms', key: 'payment_terms', render: v => <Text style={{ fontSize: 11 }}>{v}</Text> },
                      {
                        title: 'Status', dataIndex: 'status', key: 'status',
                        render: v => {
                          const colorMap = { Approved: 'success', Rejected: 'error', Pending: 'processing' };
                          return <Tag color={colorMap[v]} style={{ borderRadius: 12 }}>{v}</Tag>;
                        }
                      },
                      {
                        title: 'Actions', key: 'actions',
                        render: (_, r) => (
                          <Space>
                            {r.quotation_file && (
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={() => setViewQuotationFile(r)}
                                style={{ borderColor: '#B11E6A', color: '#B11E6A' }}
                              >
                                View File
                              </Button>
                            )}
                            {r.status === 'Pending' ? (
                              <>
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => {
                                    dispatch(updateRequestStatus({ key: r.key, status: 'Approved' }));
                                    message.success(`Request for ${r.item} approved`);
                                  }}
                                  style={{ background: '#52c41a', border: 'none', color: '#fff' }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseCircleOutlined />}
                                  onClick={() => {
                                    dispatch(updateRequestStatus({ key: r.key, status: 'Rejected' }));
                                    message.warning(`Request for ${r.item} rejected`);
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Tag color={r.status === 'Approved' ? 'success' : 'error'} style={{ borderRadius: 12 }}>{r.status}</Tag>
                            )}
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'purchase',
              label: <Space><ShopOutlined /> Purchase Payments</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">Purchase orders raised after approval — process payments here</Text>
                  </div>
                  <Table
                    size="small"
                    dataSource={purchaseOrders}
                    columns={purchaseColumns}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'No purchase orders yet. Approve a request and raise an order from the Purchase module.' }}
                  />
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
            },
            {
              key: 'parties_ledger',
              label: <Space><BookOutlined /> Parties & Ledgers</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  {viewPartyLedger ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <Space>
                          <Button icon={<CloseCircleOutlined />} onClick={() => setViewPartyLedger(null)}>Back to Parties</Button>
                          <Text strong style={{ color: '#B11E6A', fontSize: 15 }}>{viewPartyLedger.name} — Ledger</Text>
                        </Space>
                        <DatePicker.RangePicker style={{ width: 260 }} />
                      </div>
                      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                          { label: 'Total Debit (We Owe)', val: `₹${partyLedgerData.reduce((s, r) => s + r.debit, 0).toLocaleString()}`, color: '#ff4d4f' },
                          { label: 'Total Credit (They Paid)', val: `₹${partyLedgerData.reduce((s, r) => s + r.credit, 0).toLocaleString()}`, color: '#52c41a' },
                          { label: 'Net Balance', val: `₹${partyLedgerData.at(-1)?.balance.toLocaleString() || '0'}`, color: '#B11E6A' },
                        ].map(s => (
                          <Col xs={8} key={s.label}>
                            <Card style={{ borderRadius: 10, border: 'none', background: `${s.color}10` }} styles={{ body: { padding: '10px 14px' } }}>
                              <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                              <Text strong style={{ color: s.color, fontSize: 16 }}>{s.val}</Text>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                      <Table
                        size="small"
                        dataSource={partyLedgerData}
                        pagination={{ pageSize: 10 }}
                        columns={[
                          { title: 'Date', dataIndex: 'date' },
                          { title: 'Type', dataIndex: 'type', render: t => <Tag color={t === 'Purchase' ? 'blue' : 'green'}>{t}</Tag> },
                          { title: 'Document #', dataIndex: 'doc', render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                          { title: 'Debit (Dr)', dataIndex: 'debit', render: v => v > 0 ? <Text style={{ color: '#ff4d4f' }}>₹{v.toLocaleString()}</Text> : <Text type="secondary">—</Text> },
                          { title: 'Credit (Cr)', dataIndex: 'credit', render: v => v > 0 ? <Text style={{ color: '#52c41a' }}>₹{v.toLocaleString()}</Text> : <Text type="secondary">—</Text> },
                          { title: 'Running Balance', dataIndex: 'balance', render: v => <Text strong style={{ color: '#B11E6A' }}>₹{v.toLocaleString()}</Text> },
                        ]}
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <Text type="secondary">Credit and Debit ledger per party — click a party to view full history</Text>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search parties..."
                          value={partiesSearch}
                          onChange={e => setPartiesSearch(e.target.value)}
                          style={{ width: 220, borderRadius: 8 }}
                          allowClear
                        />
                      </div>
                      <Table
                        size="small"
                        dataSource={partiesData.filter(p => !partiesSearch || p.name.toLowerCase().includes(partiesSearch.toLowerCase()))}
                        pagination={{ pageSize: 8 }}
                        columns={[
                          { title: 'Party Name', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
                          { title: 'Type', dataIndex: 'type', render: v => <Tag color={v === 'Supplier' ? 'blue' : 'purple'} style={{ borderRadius: 10 }}>{v}</Tag> },
                          {
                            title: 'Total Transaction', key: 'total',
                            render: (_, r) => <Text strong>₹{(r.totalPurchase || r.totalSales || 0).toLocaleString()}</Text>
                          },
                          {
                            title: 'Paid / Received', key: 'paid',
                            render: (_, r) => <Text style={{ color: '#52c41a', fontWeight: 600 }}>₹{(r.paid || r.received || 0).toLocaleString()}</Text>
                          },
                          {
                            title: 'Pending', dataIndex: 'pending',
                            render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>₹{v.toLocaleString()}</Text>
                          },
                          {
                            title: 'Action', key: 'action',
                            render: (_, r) => (
                              <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setViewPartyLedger(r)} style={{ color: '#B11E6A' }}>
                                View Ledger
                              </Button>
                            )
                          }
                        ]}
                      />
                    </div>
                  )}
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

      {/* Quotation File View Modal */}
      <Modal
        title={
          <Space>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileTextOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block' }}>Uploaded Quotation File</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>File attached with purchase request</Text>
            </div>
          </Space>
        }
        open={!!viewQuotationFile}
        onCancel={() => setViewQuotationFile(null)}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => setViewQuotationFile(null)}>Close</Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              onClick={() => { message.success('File downloaded'); }}
            >
              Download File
            </Button>
          </div>
        }
        width={500}
        centered
      >
        {viewQuotationFile && (
          <div style={{ marginTop: 16 }}>
            {/* File banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A12,#D85C9E08)', border: '1.5px solid #B11E6A33', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileTextOutlined style={{ color: '#fff', fontSize: 22 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ color: '#B11E6A', fontSize: 13, display: 'block', wordBreak: 'break-all' }}>{viewQuotationFile.quotation_file}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>Uploaded via AI Quotation Scanner</Text>
              </div>
            </div>

            {/* Request summary */}
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Item" span={2}><Text strong>{viewQuotationFile.item}</Text></Descriptions.Item>
              <Descriptions.Item label="Supplier"><Text style={{ color: '#B11E6A', fontWeight: 600 }}>{viewQuotationFile.supplier}</Text></Descriptions.Item>
              <Descriptions.Item label="Qty"><Text strong>{viewQuotationFile.qty} {viewQuotationFile.unit}</Text></Descriptions.Item>
              <Descriptions.Item label="Payment Terms" span={2}><Text style={{ fontSize: 11 }}>{viewQuotationFile.payment_terms}</Text></Descriptions.Item>
              <Descriptions.Item label="Date">{viewQuotationFile.date}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={viewQuotationFile.status === 'Approved' ? 'success' : viewQuotationFile.status === 'Rejected' ? 'error' : 'processing'} style={{ borderRadius: 10 }}>
                  {viewQuotationFile.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
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
