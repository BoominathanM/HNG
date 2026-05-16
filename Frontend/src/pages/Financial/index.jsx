import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Typography, Space, Select, message, Tabs, Statistic, List, Divider, Modal, Descriptions, Upload, InputNumber, Form, Input, DatePicker, Badge, Tooltip
} from 'antd';
import {
  WhatsAppOutlined, ShopOutlined, CheckCircleOutlined, CloseCircleOutlined, WalletOutlined,
  ContainerOutlined, ArrowUpOutlined, ClockCircleOutlined, EyeOutlined, InfoCircleOutlined, UploadOutlined, DollarCircleOutlined, AuditOutlined, FileTextOutlined,
  TeamOutlined, BookOutlined, SearchOutlined, MessageOutlined, EditOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestStatus, updateOrderPaymentStatus, addRequestNote, addOrderNote, updateQuotationDetails } from '../../store/slices/purchaseSlice';
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

  /* ── Notes: Quotation Requests table (uses Redux raisedRequests.notes) ── */
  const [openReqNotes, setOpenReqNotes] = useState(null);
  const [reqNoteInput, setReqNoteInput] = useState('');

  /* ── Notes: Purchase Payments table (Redux purchaseOrders.notes) ── */
  const [openOrderNotes, setOpenOrderNotes] = useState(null);
  const [orderNoteInput, setOrderNoteInput] = useState({});

  /* ── Edit Quotation modal (Finance can edit & resend) ── */
  const [showEditReqModal, setShowEditReqModal] = useState(false);
  const [editReqTarget, setEditReqTarget] = useState(null);
  const [editReqForm] = Form.useForm();

  const handleAddReqNote = (key) => {
    const text = reqNoteInput.trim();
    if (!text) return;
    const ts = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    dispatch(addRequestNote({ key, text, timestamp: ts }));
    setReqNoteInput('');
  };

  const handleAddOrderNote = (orderKey) => {
    const text = (orderNoteInput[orderKey] || '').trim();
    if (!text) return;
    const ts = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    dispatch(addOrderNote({ key: orderKey, text, timestamp: ts }));
    setOrderNoteInput(prev => ({ ...prev, [orderKey]: '' }));
  };


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

  const suppliersData = {
    'ChemCo India': { phone: '+91 98765 43210', email: 'info@chemco.in', address: 'Mumbai, MH', bank: 'HDFC Bank — A/C 50100123456789 | IFSC HDFC0001234' },
    'BioLife Ltd': { phone: '+91 87654 32109', email: 'contact@biolife.in', address: 'Chennai, TN', bank: 'SBI — A/C 30112345678 | IFSC SBIN0001234' },
    'PlastiPack': { phone: '+91 76543 21098', email: 'sales@plastipack.com', address: 'Delhi, DL', bank: 'ICICI — A/C 007601234567 | IFSC ICIC0000076' },
    'BoxWorld': { phone: '+91 65432 10987', email: 'info@boxworld.in', address: 'Bengaluru, KA', bank: 'Axis Bank — A/C 912010012345678 | IFSC UTIB0000001' },
  };

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
                    rowKey="key"
                    scroll={{ x: 1400 }}
                    locale={{ emptyText: 'No quotation requests yet.' }}
                    expandable={{
                      expandedRowKeys: openReqNotes ? [openReqNotes] : [],
                      onExpand: () => {},
                      showExpandColumn: false,
                      expandedRowRender: (r) => {
                        const notes = r.notes || [];
                        const linkedOrder = purchaseOrders.find(o => o.requestKey === r.key);
                        const orderNotes = linkedOrder?.notes || [];
                        return (
                          <div style={{ padding: '12px 16px', background: isDark ? '#16192a' : '#fafcff', borderRadius: 8, margin: '4px 0' }}>
                            <Row gutter={16}>
                              <Col xs={24} md={linkedOrder ? 12 : 24}>
                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#B11E6A', display: 'block', marginBottom: 8 }}>
                                  <MessageOutlined style={{ marginRight: 4 }} />Quotation Notes
                                </Text>
                                {notes.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>No notes yet.</Text>}
                                {notes.map((n, i) => (
                                  <div key={i} style={{ padding: '5px 10px', marginBottom: 5, borderRadius: 6, background: isDark ? '#1e2235' : '#f0f4ff', border: `1px solid ${isDark ? '#2a2d40' : '#d6e4ff'}` }}>
                                    <Text style={{ fontSize: 12 }}>{n.text}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 10 }}><ClockCircleOutlined style={{ marginRight: 3 }} />{n.timestamp}</Text>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                  <Input size="small" placeholder="Add a note..." value={reqNoteInput}
                                    onChange={e => setReqNoteInput(e.target.value)}
                                    onPressEnter={() => handleAddReqNote(r.key)}
                                    style={{ flex: 1, borderRadius: 6 }} />
                                  <Button size="small" type="primary" onClick={() => handleAddReqNote(r.key)}
                                    style={{ background: '#B11E6A', border: 'none', borderRadius: 6 }}>Add</Button>
                                </div>
                              </Col>
                              {linkedOrder && (
                                <Col xs={24} md={12}>
                                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#1890ff', display: 'block', marginBottom: 8 }}>
                                    <MessageOutlined style={{ marginRight: 4 }} />Order Notes — <Text style={{ fontSize: 11, color: '#888' }}>{linkedOrder.bill_no}</Text>
                                  </Text>
                                  {orderNotes.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>No order notes yet.</Text>}
                                  {orderNotes.map((n, i) => (
                                    <div key={i} style={{ padding: '5px 10px', marginBottom: 5, borderRadius: 6, background: isDark ? '#1e2535' : '#f0f7ff', border: `1px solid ${isDark ? '#2a3040' : '#bae0ff'}` }}>
                                      <Text style={{ fontSize: 12 }}>{n.text}</Text>
                                      <br />
                                      <Text type="secondary" style={{ fontSize: 10 }}><ClockCircleOutlined style={{ marginRight: 3 }} />{n.timestamp}</Text>
                                    </div>
                                  ))}
                                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <Input size="small" placeholder="Add order note..."
                                      value={orderNoteInput[linkedOrder.key] || ''}
                                      onChange={e => setOrderNoteInput(prev => ({ ...prev, [linkedOrder.key]: e.target.value }))}
                                      onPressEnter={() => handleAddOrderNote(linkedOrder.key)}
                                      style={{ flex: 1, borderRadius: 6 }} />
                                    <Button size="small" type="primary" onClick={() => handleAddOrderNote(linkedOrder.key)}
                                      style={{ background: '#1890ff', border: 'none', borderRadius: 6 }}>Add</Button>
                                  </div>
                                </Col>
                              )}
                            </Row>
                          </div>
                        );
                      },
                    }}
                    columns={[
                      {
                        title: 'Date', dataIndex: 'date', key: 'date', width: 95,
                        render: v => <Text type="secondary">{v}</Text>
                      },
                      {
                        title: 'Item & Supplier', key: 'item_sup', width: 190,
                        render: (_, r) => (
                          <Space direction="vertical" size={1}>
                            <Text strong>{r.item}</Text>
                            <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{r.supplier}</Text>
                          </Space>
                        )
                      },
                      {
                        title: 'Qty', key: 'qty', width: 80, align: 'center',
                        render: (_, r) => (
                          <Space direction="vertical" size={0}>
                            <Text strong>{r.qty}</Text>
                            <Text type="secondary">{r.unit}</Text>
                          </Space>
                        )
                      },
                      {
                        title: 'Payment Terms', dataIndex: 'payment_terms', key: 'payment_terms', width: 160,
                        render: v => <Text>{v}</Text>
                      },
                      {
                        title: 'Bill / Inv No', key: 'bill_inv', width: 130,
                        render: (_, r) => {
                          const order = purchaseOrders.find(o => o.requestKey === r.key);
                          if (!order) return <Text type="secondary">—</Text>;
                          return (
                            <Space direction="vertical" size={1}>
                              <Text strong>{order.bill_no}</Text>
                              <Text style={{ color: '#B11E6A' }}>{order.inv_no}</Text>
                            </Space>
                          );
                        }
                      },
                      {
                        title: 'Amount', key: 'order_amount', width: 100, align: 'right',
                        render: (_, r) => {
                          const order = purchaseOrders.find(o => o.requestKey === r.key);
                          if (!order) return <Text type="secondary">—</Text>;
                          return <Text strong style={{ color: '#B11E6A' }}>₹{order.amount?.toLocaleString()}</Text>;
                        }
                      },
                      {
                        title: 'Pay Status', key: 'payment_status', width: 110, align: 'center',
                        render: (_, r) => {
                          const order = purchaseOrders.find(o => o.requestKey === r.key);
                          if (!order) return <Text type="secondary">—</Text>;
                          return <Tag color={getStatusColor(order.status)} style={{ borderRadius: 10, margin: 0 }}>{order.status}</Tag>;
                        }
                      },
                      {
                        title: 'Quotation Status', dataIndex: 'status', key: 'status', width: 120, align: 'center',
                        render: v => {
                          const colorMap = { Approved: 'success', Rejected: 'error', Pending: 'processing' };
                          return <Tag color={colorMap[v]} style={{ borderRadius: 12, margin: 0 }}>{v}</Tag>;
                        }
                      },
                      {
                        title: 'Actions', key: 'actions', width: 220, fixed: 'right',
                        render: (_, r) => {
                          const noteCount = (r.notes || []).length;
                          const noteBtn = (
                            <Badge count={noteCount} size="small" offset={[-2, 2]}>
                              <Button size="small" icon={<MessageOutlined />}
                                onClick={() => { setOpenReqNotes(openReqNotes === r.key ? null : r.key); setReqNoteInput(''); }}
                                style={{ color: openReqNotes === r.key ? '#fff' : '#B11E6A', background: openReqNotes === r.key ? '#B11E6A' : 'transparent', borderColor: '#B11E6A55' }}
                              />
                            </Badge>
                          );
                          const supPhone = (suppliersData[r.supplier]?.phone || '').replace(/\D/g, '');
                          const latestNote = (r.notes || []).at(-1);
                          const waMsg = `*Quotation Request*\n\n*Item:* ${r.item}\n*Quantity:* ${r.qty} ${r.unit}\n*Payment Terms:* ${r.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nPlease provide a quotation at the earliest.`;
                          const order = purchaseOrders.find(o => o.requestKey === r.key);
                          return (
                            <Space wrap size={[4, 4]}>
                              {r.quotation_file && (
                                <Button size="small" icon={<FileTextOutlined />} onClick={() => setViewQuotationFile(r)}
                                  style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>File</Button>
                              )}
                              {r.status === 'Pending' && (
                                <>
                                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                    onClick={() => { dispatch(updateRequestStatus({ key: r.key, status: 'Approved' })); message.success(`Approved`); }}
                                    style={{ background: '#52c41a', border: 'none' }}>Approve</Button>
                                  <Button size="small" danger icon={<CloseCircleOutlined />}
                                    onClick={() => { dispatch(updateRequestStatus({ key: r.key, status: 'Rejected' })); message.warning(`Rejected`); }}>Reject</Button>
                                  <Button size="small" icon={<EditOutlined />}
                                    onClick={() => { setEditReqTarget(r); editReqForm.setFieldsValue({ qty: r.qty, payment_terms: r.payment_terms }); setShowEditReqModal(true); }}
                                    style={{ borderColor: '#722ed1', color: '#722ed1' }}>Edit</Button>
                                </>
                              )}
                              {noteCount > 0 && (
                                <Button size="small" icon={<WhatsAppOutlined />}
                                  style={{ borderColor: '#25D366', color: '#25D366' }}
                                  onClick={() => window.open(`https://wa.me/${supPhone}?text=${encodeURIComponent(waMsg)}`, '_blank')}>
                                  Ask
                                </Button>
                              )}
                              {order && (
                                <>
                                  <Button size="small" icon={<EyeOutlined />} onClick={() => setViewRequest(order)}
                                    style={{ fontSize: 11 }}>Details</Button>
                                  {order.status !== 'Paid' && (
                                    <Button size="small" type="primary" icon={<DollarCircleOutlined />}
                                      onClick={() => { setSelectedForPayment(order); setShowPaymentModal(true); }}
                                      style={{ background: '#B11E6A', border: 'none', fontSize: 11 }}>Pay Now</Button>
                                  )}
                                </>
                              )}
                              {noteBtn}
                            </Space>
                          );
                        }
                      }
                    ]}
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

      {/* Edit Quotation & Resend Modal (Finance) */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#722ed1' }} />
            <Text strong style={{ fontSize: 15 }}>Edit Quotation & Resend</Text>
          </Space>
        }
        open={showEditReqModal}
        onCancel={() => { setShowEditReqModal(false); setEditReqTarget(null); editReqForm.resetFields(); }}
        footer={null}
        width={480}
        centered
        destroyOnClose
      >
        {editReqTarget && (
          <Form form={editReqForm} layout="vertical" style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: isDark ? '#16192a' : '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>ITEM</Text>
              <div><Text strong style={{ fontSize: 14 }}>{editReqTarget.item}</Text></div>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                Supplier: <Text strong style={{ color: '#B11E6A' }}>{editReqTarget.supplier}</Text>
              </Text>
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Quantity" name="qty" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} addonAfter={editReqTarget.unit} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Payment Terms" name="payment_terms" rules={[{ required: true }]}>
                  <Select>
                    <Option value="100% Payment">100% Payment</Option>
                    <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                    <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery</Option>
                    <Option value="Credit 30 Days">Credit 30 Days</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {(editReqTarget.notes || []).length > 0 && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: isDark ? '#1e2235' : '#f0f4ff', borderRadius: 8, border: '1px solid #d6e4ff' }}>
                <Text style={{ fontSize: 11, color: '#722ed1', fontWeight: 600 }}>Latest Note:</Text>
                <Text style={{ fontSize: 12, display: 'block' }}>{(editReqTarget.notes || []).at(-1)?.text}</Text>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button style={{ flex: 1, height: 40, borderRadius: 8 }} onClick={() => { setShowEditReqModal(false); editReqForm.resetFields(); }}>Cancel</Button>
              <Button style={{ flex: 1, height: 40, borderRadius: 8, borderColor: '#722ed1', color: '#722ed1' }}
                onClick={() => {
                  editReqForm.validateFields().then(vals => {
                    dispatch(updateQuotationDetails({ key: editReqTarget.key, qty: vals.qty, payment_terms: vals.payment_terms }));
                    message.success('Quotation details updated.');
                    setShowEditReqModal(false); editReqForm.resetFields();
                  });
                }}>Save Only</Button>
              <Button type="primary" style={{ flex: 2, height: 40, borderRadius: 8, background: '#25D366', border: 'none', fontWeight: 700 }}
                icon={<WhatsAppOutlined />}
                onClick={() => {
                  editReqForm.validateFields().then(vals => {
                    dispatch(updateQuotationDetails({ key: editReqTarget.key, qty: vals.qty, payment_terms: vals.payment_terms }));
                    const phone = (suppliersData[editReqTarget.supplier]?.phone || '').replace(/\D/g, '');
                    const latestNote = (editReqTarget.notes || []).at(-1);
                    const msg = `*Updated Quotation Request*\n\n*Item:* ${editReqTarget.item}\n*Quantity:* ${vals.qty} ${editReqTarget.unit}\n*Payment Terms:* ${vals.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nKindly provide an updated quotation at the earliest.`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    message.success('Updated quotation sent via WhatsApp!');
                    setShowEditReqModal(false); editReqForm.resetFields();
                  });
                }}>Save & Send via WhatsApp</Button>
            </div>
          </Form>
        )}
      </Modal>

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
        {viewRequest && (() => {
          const sup = suppliersData[viewRequest.supplier] || null;
          return (
            <div style={{ marginTop: 16 }}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Date">{viewRequest.date}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={getStatusColor(viewRequest.status)}>{viewRequest.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="Bill No">{viewRequest.bill_no}</Descriptions.Item>
                <Descriptions.Item label="Payment Terms" span={2}>{viewRequest.payment_terms || 'N/A'}</Descriptions.Item>
              </Descriptions>
              {viewRequest.supplier && (
                <>
                  <Divider orientation="left" style={{ marginTop: 16 }}>Supplier / Vendor Details</Divider>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Name"><Text strong style={{ color: '#B11E6A' }}>{viewRequest.supplier}</Text></Descriptions.Item>
                    <Descriptions.Item label="Phone">{sup?.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{sup?.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Address" span={2}>{sup?.address || '—'}</Descriptions.Item>
                  </Descriptions>
                  <Divider orientation="left" style={{ marginTop: 16 }}>Bank Details</Divider>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Bank / A/C">{sup?.bank || '—'}</Descriptions.Item>
                  </Descriptions>
                </>
              )}
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
          );
        })()}
      </Modal>
    </div>
  );
}
