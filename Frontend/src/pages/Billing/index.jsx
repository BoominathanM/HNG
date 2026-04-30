import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Drawer, Form, Input, Select,
  Typography, Space, Divider, DatePicker, TimePicker, Avatar, InputNumber, Collapse,
} from 'antd';
import {
  PlusOutlined, PrinterOutlined, DownloadOutlined, EyeOutlined,
  CheckCircleOutlined, LeftOutlined, CloseOutlined, UserOutlined,
  SearchOutlined, DeleteOutlined, CalendarOutlined, MinusOutlined,
  ShopOutlined, EnvironmentOutlined, BankOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const invoices = [
  { key: 1, inv: 'INV-2401', client: 'Marriott Mumbai', order: 'ORD-2402', date: '2024-01-18', amount: 38500, gst: 6930, total: 45430, advance: 19250, balance: 26180, type: 'GST', status: 'Partially Paid' },
  { key: 2, inv: 'INV-2402', client: 'Taj Hotels Delhi', order: 'ORD-2403', date: '2024-01-17', amount: 120000, gst: 21600, total: 141600, advance: 60000, balance: 81600, type: 'GST', status: 'Pending' },
  { key: 3, inv: 'INV-2403', client: 'ITC Grand Kolkata', order: 'ORD-2404', date: '2024-01-16', amount: 250000, gst: 0, total: 250000, advance: 250000, balance: 0, type: 'Non-GST', status: 'Paid' },
  { key: 4, inv: 'INV-2404', client: 'The Grand Hotel', order: 'ORD-2401', date: '2024-01-10', amount: 42000, gst: 7560, total: 49560, advance: 21000, balance: 28560, type: 'GST', status: 'Partially Paid' },
];

const statusColor = { Paid: '#6b1240', Pending: '#C94F8A', 'Partially Paid': '#B11E6A', Overdue: '#8a1652' };

const partiesList = [
  { key: 1, name: '3R GREEN CORPORATION', phone: '7417157859', type: 'Supplier', balance: 0 },
  { key: 2, name: 'A1 TRAVELS AND SPEED PARCEL SERVICE', phone: '9443021991', type: 'Customer', balance: 0 },
  { key: 3, name: 'ABC COMPUTERS', phone: '9842117951', type: 'Supplier', balance: 76 },
  { key: 4, name: 'Abirami Royal', type: 'Customer', balance: 0 },
  { key: 5, name: 'ABM Home Stay', type: 'Customer', balance: 0 },
  { key: 6, name: 'ADITYA HERITAGE HOMES', type: 'Customer', balance: 0 },
];

const itemsList = [
  { key: 1, name: 'KUTRALAM (2 SOAP 15G, 2 BRUSH, 1 PASTE, 1 COMB, 2 SHAMPOO, 1 OIL)', price: 30, unit: 'PCS', stock: -1.0, initials: 'K', color: '#B11E6A' },
  { key: 2, name: 'Morning Kit TTDC', price: 20, unit: 'PCS', stock: -2.0, initials: 'M', color: '#8a1652' },
  { key: 3, name: 'Soap (L) 15 gram', price: 3.65, unit: 'PCS', stock: 5.0, initials: 'S', color: '#C94F8A' },
];

const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir',
  'Ladakh','Puducherry','Chandigarh',
];

export default function Billing() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const sectionBg = isDark ? '#16161e' : '#fafafa';
  const inputBg = isDark ? '#1a1a2a' : '#fff';

  // View invoice
  const [viewModal, setViewModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);

  // Drawer open
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Invoice meta
  const [invoiceNum, setInvoiceNum] = useState('118');
  const [invoiceDate, setInvoiceDate] = useState(dayjs());
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day'));
  const [dueDays, setDueDays] = useState('7');
  const [showDueDate, setShowDueDate] = useState(true);

  // Party
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [partyType, setPartyType] = useState('customer');
  const [openingBalType, setOpeningBalType] = useState('receive');
  const [showBillingAddr, setShowBillingAddr] = useState(false);
  const [partyForm] = Form.useForm();
  const [billingForm] = Form.useForm();

  // Items
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // Additional
  const [invoiceType, setInvoiceType] = useState('GST');
  const [noteText, setNoteText] = useState('');
  const [advanceAmt, setAdvanceAmt] = useState(0);

  const filteredParties = partiesList.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.phone || '').includes(partySearch)
  );

  const filteredItems = itemsList.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const subtotal = invoiceItems.reduce((s, i) => s + i.price * i.qty, 0);
  const gstAmt = invoiceType === 'GST' ? subtotal * 0.18 : 0;
  const total = subtotal + gstAmt;
  const balanceDue = Math.max(0, total - (advanceAmt || 0));

  const handleDueDays = (val) => {
    setDueDays(val);
    if (val !== 'custom') setDueDate(invoiceDate.add(parseInt(val), 'day'));
  };

  const handleAddItem = (item) => {
    setInvoiceItems(prev => {
      const ex = prev.find(i => i.key === item.key);
      if (ex) return prev.map(i => i.key === item.key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const handleQtyChange = (key, delta) => {
    setInvoiceItems(prev =>
      prev.map(i => i.key === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const handleRemoveItem = (key) => {
    setInvoiceItems(prev => prev.filter(i => i.key !== key));
  };

  const handleSelectParty = (party) => {
    setSelectedParty(party);
    setShowPartySearch(false);
    setShowCreateParty(false);
    setPartySearch('');
  };

  const handleSaveParty = () => {
    const vals = partyForm.getFieldsValue();
    const newParty = {
      key: Date.now(),
      name: vals.partyName || 'New Party',
      phone: vals.phone || '',
      type: partyType === 'customer' ? 'Customer' : 'Supplier',
      balance: parseFloat(vals.openingBal || 0),
    };
    handleSelectParty(newParty);
    partyForm.resetFields();
    billingForm.resetFields();
    setShowBillingAddr(false);
  };

  const handleSave = () => {
    setDrawerOpen(false);
    setInvoiceItems([]);
    setSelectedParty(null);
    setNoteText('');
    setAdvanceAmt(0);
    setShowPartySearch(false);
    setShowCreateParty(false);
    setShowItemSearch(false);
  };

  // Style helpers
  const sectionCard = {
    borderRadius: 14,
    border: `1px solid ${borderColor}`,
    background: cardBg,
    marginBottom: 12,
    overflow: 'hidden',
  };

  const sectionHeader = {
    padding: '12px 16px',
    background: sectionBg,
    borderBottom: `1px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const pill = (active) => ({
    padding: '5px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    border: `1.5px solid ${active ? '#B11E6A' : borderColor}`,
    background: active ? '#B11E6A15' : 'transparent',
    color: active ? '#B11E6A' : isDark ? '#aaa' : '#666',
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.15s',
  });

  const saveBtn = {
    background: 'linear-gradient(135deg,#B11E6A,#D85C9E)',
    border: 'none',
    height: 48,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.8,
  };

  const columns = [
    { title: 'Invoice', dataIndex: 'inv', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client' },
    { title: 'Order', dataIndex: 'order', responsive: ['md'], render: (v) => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', responsive: ['lg'], render: (v) => <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', render: (v) => <Text strong>₹{v.toLocaleString()}</Text> },
    { title: 'Advance', dataIndex: 'advance', responsive: ['md'], render: (v) => <Text style={{ color: '#8a1652' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Balance', dataIndex: 'balance', render: (v) => <Text style={{ color: v > 0 ? '#B11E6A' : '#52c41a' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag style={{ borderRadius: 20, fontWeight: 500, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedInv(r); setViewModal(true); }} />
          <Button size="small" icon={<PrinterOutlined />} />
          <Button size="small" icon={<DownloadOutlined />} />
          {r.balance > 0 && <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Pay</Button>}
        </Space>
      ),
    },
  ];

  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.reduce((s, i) => s + i.balance, 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Billing" items={[{ label: 'Billing' }]} style={{ marginBottom: 0 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced', val: `₹${(totalRevenue / 100000).toFixed(2)}L`, color: '#B11E6A' },
          { label: 'Paid', val: `₹${(totalPaid / 1000).toFixed(0)}K`, color: '#8a1652' },
          { label: 'Outstanding', val: `₹${(totalPending / 1000).toFixed(0)}K`, color: '#C94F8A' },
          { label: 'Invoices', val: invoices.length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, textAlign: 'center' }} bodyStyle={{ padding: '16px 8px' }}>
                <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={invoices} columns={columns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
        </div>
      </Card>

      {/* ───────────── VIEW INVOICE ───────────── */}
      <Drawer
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>Invoice: {selectedInv?.inv}</span>}
        open={viewModal}
        onClose={() => setViewModal(false)}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />}>Print</Button>
            <Button icon={<DownloadOutlined />} type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>PDF</Button>
          </Space>
        }
        width={Math.min(560, window.innerWidth)}
      >
        {selectedInv && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Title level={4} style={{ color: '#B11E6A', margin: 0 }}>HEAL N GLOW</Title>
              <Text style={{ color: '#999', fontSize: 12 }}>Tax Invoice | {selectedInv.inv}</Text>
            </div>
            <Divider />
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><Text strong>Bill To:</Text><br /><Text>{selectedInv.client}</Text></Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Text strong>Date:</Text><br /><Text>{selectedInv.date}</Text><br />
                <Text strong>Order:</Text> <Text style={{ color: '#B11E6A' }}>{selectedInv.order}</Text>
              </Col>
            </Row>
            <Divider />
            <Row><Col span={16}><Text>Subtotal</Text></Col><Col span={8} style={{ textAlign: 'right' }}><Text>₹{selectedInv.amount.toLocaleString()}</Text></Col></Row>
            {selectedInv.type === 'GST' && <Row style={{ marginTop: 6 }}><Col span={16}><Text>GST (18%)</Text></Col><Col span={8} style={{ textAlign: 'right' }}><Text>₹{selectedInv.gst.toLocaleString()}</Text></Col></Row>}
            <Divider />
            <Row><Col span={16}><Text strong>Total</Text></Col><Col span={8} style={{ textAlign: 'right' }}><Text strong style={{ color: '#B11E6A', fontSize: 16 }}>₹{selectedInv.total.toLocaleString()}</Text></Col></Row>
            <Row style={{ marginTop: 6 }}><Col span={16}><Text style={{ color: '#8a1652' }}>Advance</Text></Col><Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: '#8a1652' }}>- ₹{selectedInv.advance.toLocaleString()}</Text></Col></Row>
            <Row style={{ marginTop: 6 }}>
              <Col span={16}><Text strong style={{ color: selectedInv.balance > 0 ? '#B11E6A' : '#52c41a' }}>Balance Due</Text></Col>
              <Col span={8} style={{ textAlign: 'right' }}><Text strong style={{ color: selectedInv.balance > 0 ? '#B11E6A' : '#52c41a', fontSize: 16 }}>₹{selectedInv.balance.toLocaleString()}</Text></Col>
            </Row>
          </div>
        )}
      </Drawer>

      {/* ───────────── CREATE INVOICE DRAWER (single page, no sub-modals) ───────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={Math.min(560, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button type="primary" block style={saveBtn} onClick={handleSave}>
            SAVE INVOICE
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        {/* Sticky header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setDrawerOpen(false)} style={{ color: '#B11E6A', padding: 0, height: 'auto' }} />
          <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, flex: 1 }}>Create Invoice</Text>
          <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600, fontSize: 12 }}>
            #{invoiceNum}
          </Tag>
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Section 1: Invoice Details ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <CalendarOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Invoice Details</Text>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row gutter={10}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Invoice Number</Text>
                  <Input
                    value={invoiceNum}
                    onChange={(e) => setInvoiceNum(e.target.value)}
                    style={{ borderRadius: 8, height: 42, background: inputBg }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Invoice Date</Text>
                  <DatePicker
                    value={invoiceDate}
                    onChange={(d) => {
                      setInvoiceDate(d);
                      if (dueDays !== 'custom') setDueDate(d.add(parseInt(dueDays), 'day'));
                    }}
                    format="DD MMM YYYY"
                    style={{ width: '100%', borderRadius: 8, height: 42 }}
                  />
                </Col>
              </Row>

              {showDueDate && (
                <div>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Due Date</Text>
                  <Row gutter={8}>
                    <Col flex={1}>
                      <DatePicker
                        value={dueDate}
                        onChange={(d) => { setDueDate(d); setDueDays('custom'); }}
                        format="DD MMM YYYY"
                        style={{ width: '100%', borderRadius: 8, height: 42 }}
                      />
                    </Col>
                    <Col>
                      <Select value={dueDays} onChange={handleDueDays} style={{ width: 110, height: 42 }}>
                        {['7', '15', '30', '45', '60'].map(d => <Option key={d} value={d}>{d} Days</Option>)}
                        <Option value="custom">Custom</Option>
                      </Select>
                    </Col>
                  </Row>
                </div>
              )}

              <Button
                type="link"
                size="small"
                icon={showDueDate ? <CloseOutlined style={{ fontSize: 11 }} /> : <PlusOutlined style={{ fontSize: 11 }} />}
                onClick={() => {
                  setShowDueDate(!showDueDate);
                  if (!showDueDate) setDueDate(invoiceDate.add(7, 'day'));
                }}
                style={{ padding: 0, color: '#B11E6A', fontWeight: 600, height: 'auto', textAlign: 'left' }}
              >
                {showDueDate ? 'Remove Due Date' : 'Add Due Date'}
              </Button>
            </div>
          </div>

          {/* ── Section 2: Party / Bill To ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <UserOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Bill To <span style={{ color: '#ff4d4f' }}>*</span></Text>
            </div>

            <div style={{ padding: '14px 16px' }}>
              {/* Selected party card */}
              {selectedParty ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#B11E6A10', border: '1.5px solid #B11E6A44' }}>
                  <Avatar style={{ background: '#B11E6A', flexShrink: 0 }}>{selectedParty.name[0]}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{selectedParty.name}</Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>{[selectedParty.phone, selectedParty.type].filter(Boolean).join(' • ')}</Text>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => { setSelectedParty(null); setShowPartySearch(true); }}
                    style={{ color: '#aaa' }}
                  />
                </div>
              ) : (
                <>
                  {/* Search bar */}
                  <Input
                    prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                    placeholder="Search party by name or phone..."
                    value={partySearch}
                    onFocus={() => { setShowPartySearch(true); setShowCreateParty(false); }}
                    onChange={(e) => { setPartySearch(e.target.value); setShowPartySearch(true); }}
                    style={{ borderRadius: 24, height: 42, background: isDark ? '#2a2a3a' : '#f5f5f5', border: 'none' }}
                    allowClear
                  />

                  {/* Party search results */}
                  <AnimatePresence>
                    {showPartySearch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: 8 }}
                      >
                        <div style={{ borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                          {filteredParties.length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                              No parties found
                            </div>
                          )}
                          {filteredParties.map(party => (
                            <div
                              key={party.key}
                              onClick={() => handleSelectParty(party)}
                              style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', gap: 10, transition: 'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#B11E6A08'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Avatar size={34} style={{ background: '#B11E6A', flexShrink: 0, fontSize: 13 }}>{party.name[0]}</Avatar>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ fontWeight: 600, fontSize: 13, color: textColor, display: 'block' }}>{party.name}</Text>
                                <Text style={{ fontSize: 11, color: '#aaa' }}>{[party.phone, party.type].filter(Boolean).join(' • ')}</Text>
                              </div>
                              <Text style={{ fontSize: 12, color: party.balance > 0 ? '#f5222d' : '#52c41a', fontWeight: 600 }}>₹{party.balance}</Text>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Create new party toggle */}
                  {!showCreateParty && (
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => { setShowCreateParty(true); setShowPartySearch(false); partyForm.resetFields(); }}
                      style={{ marginTop: 10, width: '100%', borderColor: '#B11E6A66', color: '#B11E6A', borderRadius: 8, height: 40, fontWeight: 600, borderStyle: 'dashed' }}
                    >
                      Create New Party
                    </Button>
                  )}
                </>
              )}

              {/* Inline Create Party Form */}
              <AnimatePresence>
                {showCreateParty && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{ marginTop: 12, borderRadius: 10, border: `1.5px solid #B11E6A44`, background: isDark ? '#1a0f14' : '#fff8fb', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#B11E6A12', borderBottom: `1px solid #B11E6A22` }}>
                      <Text style={{ fontWeight: 700, color: '#B11E6A', fontSize: 13 }}>New Party</Text>
                      <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setShowCreateParty(false)} style={{ color: '#aaa' }} />
                    </div>

                    <Form form={partyForm} layout="vertical" style={{ padding: '12px 14px 0' }}>
                      <Form.Item
                        label={<Text style={{ fontWeight: 600, fontSize: 13 }}>Party Name <span style={{ color: '#ff4d4f' }}>*</span></Text>}
                        name="partyName"
                        style={{ marginBottom: 10 }}
                      >
                        <Input placeholder="e.g. Marriott Hotels" style={{ borderRadius: 8, height: 40 }} />
                      </Form.Item>

                      <Row gutter={10} style={{ marginBottom: 10 }}>
                        <Col span={14}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Contact Number</Text>} name="phone" style={{ marginBottom: 0 }}>
                            <Input placeholder="9876543210" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Text style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 5 }}>Party Type</Text>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[['customer', 'Customer'], ['supplier', 'Supplier']].map(([val, lbl]) => (
                              <button key={val} type="button" onClick={() => setPartyType(val)} style={{ ...pill(partyType === val), flex: 1, padding: '6px 4px', fontSize: 12 }}>{lbl}</button>
                            ))}
                          </div>
                        </Col>
                      </Row>

                      <Row gutter={10} style={{ marginBottom: 10 }}>
                        <Col span={12}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>GST Number</Text>} name="gst" style={{ marginBottom: 0 }}>
                            <Input placeholder="24AAACC1206D1ZM" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>PAN Number</Text>} name="pan" style={{ marginBottom: 0 }}>
                            <Input placeholder="AAACC1206D" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Opening Balance */}
                      <div style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 5 }}>Opening Balance</Text>
                        <Row gutter={8}>
                          <Col flex={1}>
                            <Form.Item name="openingBal" style={{ marginBottom: 0 }}>
                              <Input prefix="₹" placeholder="0.00" type="number" style={{ borderRadius: 8, height: 40 }} />
                            </Form.Item>
                          </Col>
                          <Col>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {[['receive', 'I Receive'], ['pay', 'I Pay']].map(([val, lbl]) => (
                                <button key={val} type="button" onClick={() => setOpeningBalType(val)} style={{ ...pill(openingBalType === val), padding: '5px 10px', fontSize: 12, height: 40 }}>{lbl}</button>
                              ))}
                            </div>
                          </Col>
                        </Row>
                      </div>

                      {/* Credit Period + Credit Limit */}
                      <Row gutter={10} style={{ marginBottom: 10 }}>
                        <Col span={12}>
                          <Text style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 5 }}>Credit Period</Text>
                          <Form.Item name="creditPeriod" style={{ marginBottom: 0 }} initialValue="7">
                            <Select style={{ width: '100%' }}>
                              {['7', '15', '30', '45', '60'].map(d => <Option key={d} value={d}>{d} Days</Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Credit Limit</Text>} name="creditLimit" style={{ marginBottom: 0 }}>
                            <Input prefix="₹" placeholder="500.00" type="number" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Party Category */}
                      <Form.Item label={<Text style={{ fontSize: 13 }}>Party Category</Text>} name="category" style={{ marginBottom: 10 }}>
                        <Select placeholder="Select category">
                          <Option value="vip">VIP</Option>
                          <Option value="regular">Regular</Option>
                          <Option value="wholesale">Wholesale</Option>
                        </Select>
                      </Form.Item>

                      {/* Contact Person */}
                      <Row gutter={10} style={{ marginBottom: 10 }}>
                        <Col span={14}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Contact Person Name</Text>} name="contactPerson" style={{ marginBottom: 0 }}>
                            <Input placeholder="e.g. Ankit Mishra" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col span={10}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Date of Birth</Text>} name="dob" style={{ marginBottom: 0 }}>
                            <DatePicker format="DD MMM YYYY" placeholder="25 Aug 1999" style={{ width: '100%', borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Billing Address toggle */}
                      <div
                        onClick={() => setShowBillingAddr(!showBillingAddr)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${borderColor}`, cursor: 'pointer', marginBottom: showBillingAddr ? 0 : 10 }}
                      >
                        <Space size={6}>
                          <EnvironmentOutlined style={{ color: '#B11E6A' }} />
                          <Text style={{ fontWeight: 600, color: textColor, fontSize: 13 }}>Billing Address</Text>
                        </Space>
                        <Text style={{ color: '#aaa', fontSize: 12 }}>{showBillingAddr ? '▲ Hide' : '▼ Add'}</Text>
                      </div>

                      {showBillingAddr && (
                        <Form form={billingForm} layout="vertical" style={{ paddingBottom: 4 }}>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Street Address</Text>} name="street" style={{ marginBottom: 10 }}>
                            <Input placeholder="15, Hill View Apt, LBS Marg" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                          <Row gutter={8} style={{ marginBottom: 10 }}>
                            <Col span={14}>
                              <Form.Item label={<Text style={{ fontSize: 13 }}>State</Text>} name="state" style={{ marginBottom: 0 }}>
                                <Select placeholder="Maharashtra" style={{ width: '100%' }} showSearch>
                                  {indianStates.map(s => <Option key={s} value={s}>{s}</Option>)}
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item label={<Text style={{ fontSize: 13 }}>Pincode</Text>} name="pincode" style={{ marginBottom: 0 }}>
                                <Input placeholder="560076" maxLength={6} style={{ borderRadius: 8, height: 40 }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item label={<Text style={{ fontSize: 13 }}>City</Text>} name="city" style={{ marginBottom: 10 }}>
                            <Input placeholder="Bengaluru" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Form>
                      )}
                    </Form>

                    <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8 }}>
                      <Button onClick={() => setShowCreateParty(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
                      <Button type="primary" onClick={handleSaveParty} style={{ flex: 2, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}>
                        Save Party
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Section 3: Items ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <ShopOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Items</Text>
              {invoiceItems.length > 0 && (
                <Tag style={{ marginLeft: 'auto', background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>
                  {invoiceItems.length} item{invoiceItems.length > 1 ? 's' : ''}
                </Tag>
              )}
            </div>

            <div style={{ padding: '10px 16px 14px' }}>
              {/* Items list */}
              {invoiceItems.map((item, idx) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${borderColor}` }}
                >
                  <Avatar size={32} style={{ background: item.color, flexShrink: 0, fontSize: 12 }}>{item.initials}</Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, color: textColor, display: 'block', fontWeight: 500, lineHeight: 1.3 }} ellipsis={{ tooltip: item.name }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 600 }}>₹{item.price}/{item.unit}</Text>
                  </div>
                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => handleQtyChange(item.key, -1)}
                      style={{ borderColor: '#B11E6A44', color: '#B11E6A', borderRadius: 6, width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                    <Text style={{ fontWeight: 700, minWidth: 24, textAlign: 'center', color: textColor }}>{item.qty}</Text>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleQtyChange(item.key, 1)}
                      style={{ borderColor: '#B11E6A44', color: '#B11E6A', borderRadius: 6, width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  </div>
                  <Text style={{ fontWeight: 700, color: textColor, minWidth: 60, textAlign: 'right', fontSize: 13 }}>
                    ₹{(item.price * item.qty).toFixed(2)}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveItem(item.key)}
                    style={{ color: '#ff4d4f', padding: 0, flexShrink: 0 }}
                  />
                </motion.div>
              ))}

              {/* Add item toggle */}
              {!showItemSearch && (
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => { setShowItemSearch(true); setItemSearch(''); }}
                  style={{ width: '100%', marginTop: invoiceItems.length ? 10 : 0, borderColor: '#B11E6A66', color: '#B11E6A', borderRadius: 8, height: 42, fontWeight: 600, borderStyle: 'dashed' }}
                >
                  Add Item
                </Button>
              )}

              {/* Inline item search */}
              <AnimatePresence>
                {showItemSearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: invoiceItems.length ? 10 : 0 }}
                  >
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Input
                        autoFocus
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        placeholder="Search items..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        style={{ borderRadius: 24, height: 40, background: isDark ? '#2a2a3a' : '#f5f5f5', border: 'none', flex: 1 }}
                      />
                      <Button type="text" icon={<CloseOutlined />} onClick={() => setShowItemSearch(false)} style={{ color: '#aaa' }} />
                    </div>
                    <div style={{ borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, overflow: 'hidden' }}>
                      {filteredItems.map(item => (
                        <div
                          key={item.key}
                          style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, gap: 10 }}
                        >
                          <Avatar size={34} style={{ background: item.color, flexShrink: 0, fontSize: 12 }}>{item.initials}</Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontWeight: 600, fontSize: 13, color: textColor, display: 'block', lineHeight: 1.3 }} ellipsis>{item.name}</Text>
                            <Space size={8}>
                              <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 600 }}>₹{item.price}/{item.unit}</Text>
                              <Text style={{ fontSize: 11, color: item.stock < 0 ? '#ff4d4f' : '#52c41a' }}>
                                Stock: {item.stock}{item.unit}
                              </Text>
                            </Space>
                          </div>
                          <Button
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => handleAddItem(item)}
                            style={{ borderColor: '#B11E6A55', color: '#B11E6A', borderRadius: 8, fontWeight: 700, flexShrink: 0 }}
                          >
                            ADD
                          </Button>
                        </div>
                      ))}
                      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'center' }}>
                        <Button
                          icon={<PlusOutlined />}
                          size="small"
                          style={{ color: '#B11E6A', borderColor: '#B11E6A44', borderRadius: 20 }}
                        >
                          Create New Item
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Section 4: Additional Info ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <BankOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Tax & Notes</Text>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 7 }}>Invoice Type</Text>
                <Space>
                  {[['GST', 'GST (18%)'], ['Non-GST', 'Non-GST']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setInvoiceType(val)} style={pill(invoiceType === val)}>{lbl}</button>
                  ))}
                </Space>
              </div>
              <div>
                <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Note (optional)</Text>
                <Input.TextArea
                  placeholder="Add a note to this invoice..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  style={{ borderRadius: 8 }}
                />
              </div>
            </div>
          </div>

          {/* ── Section 5: Summary ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Summary</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: isDark ? '#aaa' : '#666' }}>Subtotal</Text>
                  <Text style={{ fontWeight: 600, color: textColor }}>₹{subtotal.toFixed(2)}</Text>
                </div>
                {invoiceType === 'GST' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: isDark ? '#aaa' : '#666' }}>GST (18%)</Text>
                    <Text style={{ fontWeight: 600, color: textColor }}>₹{gstAmt.toFixed(2)}</Text>
                  </div>
                )}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: 700, fontSize: 15, color: textColor }}>Total</Text>
                  <Text style={{ fontWeight: 800, fontSize: 16, color: '#B11E6A' }}>₹{total.toFixed(2)}</Text>
                </div>
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: isDark ? '#aaa' : '#666' }}>Advance Payment</Text>
                  <InputNumber
                    prefix="₹"
                    placeholder="0.00"
                    value={advanceAmt || undefined}
                    onChange={(val) => setAdvanceAmt(val || 0)}
                    min={0}
                    max={total}
                    style={{ width: 130, borderRadius: 8 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: balanceDue > 0 ? '#B11E6A10' : '#52c41a10', border: `1.5px solid ${balanceDue > 0 ? '#B11E6A44' : '#52c41a44'}`, marginTop: 4 }}>
                  <Text style={{ fontWeight: 700, color: balanceDue > 0 ? '#B11E6A' : '#52c41a', fontSize: 14 }}>Balance Due</Text>
                  <Text style={{ fontWeight: 800, color: balanceDue > 0 ? '#B11E6A' : '#52c41a', fontSize: 16 }}>₹{balanceDue.toFixed(2)}</Text>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Drawer>
    </div>
  );
}
