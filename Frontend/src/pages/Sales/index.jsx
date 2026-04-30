import React, { useState, useEffect } from 'react';
import {
  Tabs, Card, Table, Button, Tag, Space, Input, Select, Modal,
  Form, Row, Col, Typography, Drawer, Steps, Divider, Badge,
  InputNumber, Tooltip, Checkbox, message,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  FileTextOutlined, PhoneOutlined, MailOutlined, UserOutlined,
  WhatsAppOutlined, MinusCircleOutlined, CheckOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// ─── Constants ────────────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  { value: 'AFTER_DISPATCH', label: 'Payment After Dispatch' },
  { value: '30_DAYS_CREDIT', label: 'Payment 30 Days Credit' },
  { value: '50_50', label: 'Payment Before 50 After 50' },
  { value: 'BEFORE_100', label: 'Payment Before 100%' },
];

const PAYMENT_LABELS = {
  AFTER_DISPATCH: 'PAYMENT AFTER DISPATCH',
  '30_DAYS_CREDIT': 'PAYMENT 30 DAYS CREDIT',
  '50_50': 'PAYMENT BEFORE 50 AFTER 50',
  BEFORE_100: 'PAYMENT BEFORE 100%',
};

const STATUS_COLORS = {
  New: '#C94F8A', Interested: '#D85C9E', 'Quotation Sent': '#B11E6A', Converted: '#52c41a',
  Draft: '#aaa', Sent: '#C94F8A', Approved: '#52c41a', Rejected: '#ff4d4f',
  'In Production': '#B11E6A', 'Dispatch Ready': '#8a1652', 'Payment Pending': '#fa8c16', Completed: '#52c41a',
};

// ─── Sample data ──────────────────────────────────────────────────────
const INIT_LEADS = [
  {
    key: 1, hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', status: 'Quotation Sent', followUp: '2024-01-20',
    salesPerson: 'Priya', createdAt: '2024-01-15T10:30:00Z',
    products: [
      { name: 'Soap 15grm', qty: 500, rate: 3.6 }, { name: 'Single Brush', qty: 200, rate: 4 },
      { name: 'Shampoo 15ml', qty: 250, rate: 4.25 }, { name: 'Shaving Kit', qty: 300, rate: 10.5 },
      { name: 'Dental Kit (1+1)', qty: 300, rate: 10.5 }, { name: 'Comb', qty: 250, rate: 4.1 },
    ],
    forwardingCharge: true, deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: '30_DAYS_CREDIT',
    logoNeeded: true, logoProducts: 'Soap15grm, Shampoo 10ml, Dental Kit, Shaving kit, Comb',
    specifications: [
      { product: 'Shampoo 15ml', spec: 'Black Screw type bottle needed', rate: 0 },
      { product: 'Soap 15grm', spec: 'Large Square type needed', rate: 0 },
      { product: 'Single Brush', spec: 'Transparent cover needed', rate: 0 },
      { product: 'Dental Kit (1+1)', spec: 'Promise paste needed', rate: 0 }
    ],
  },
  {
    key: 2, hotelName: 'Saravana Bhavan Namakkal', billingName: 'Saravana Bhavan Namakkal', location: 'Namakkal',
    contactPerson: 'Manager', phone: '+91 63741 15883', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AABCS1234D1Z2', status: 'New', followUp: '2024-01-22',
    salesPerson: 'Arun', createdAt: '2024-01-18T14:45:00Z',
    products: [{ name: 'Promise Paste', qty: 500, rate: 4.5 }, { name: 'Brush', qty: 1000, rate: 4.5 }],
    forwardingCharge: true, deliveryBy: 'CLIENT', transportationBy: 'CLIENT', paymentTerms: 'AFTER_DISPATCH',
    logoNeeded: false, logoProducts: '',
    specifications: [
      { product: 'Brush', spec: 'Transparent cover needed', rate: 0 },
      { product: 'Promise Paste', spec: 'needed', rate: 0 }
    ],
  },
  {
    key: 3, hotelName: 'Grand Inn', billingName: 'GRAND INN', location: 'Thiruvanamalai',
    contactPerson: 'Reception', phone: '9443039517', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33ABDFG4567H1Z3', status: 'Interested', followUp: '2024-01-18',
    salesPerson: 'Priya', createdAt: '2024-01-12T09:15:00Z',
    products: [{ name: 'Soap 15grm', qty: 1000, rate: 3.65 }],
    forwardingCharge: true, deliveryBy: 'CLIENT', transportationBy: 'CLIENT', paymentTerms: 'AFTER_DISPATCH',
    logoNeeded: true, logoProducts: 'Soap15grm',
    specifications: [
      { product: 'Soap 15grm', spec: 'Square Type needed', rate: 0 }
    ],
  },
  {
    key: 4, hotelName: 'TTDC Yercaud', billingName: 'Yercaud TTDC', location: 'Yercaud',
    contactPerson: 'Manager', phone: '', email: '',
    hotelType: 'OLD', billType: 'NON_GST', gstNumber: '', status: 'New', followUp: '2024-01-25',
    salesPerson: 'Karthik', createdAt: '2024-01-20T11:20:00Z',
    products: [{ name: 'Laundry Liquid 50 Litre', qty: 2, rate: 4500 }],
    forwardingCharge: false, deliveryBy: 'TTDC', transportationBy: 'TTDC', paymentTerms: 'AFTER_DISPATCH',
    logoNeeded: false, logoProducts: '',
    specifications: [
      { product: 'Laundry Liquid 50 Litre', spec: 'Full fragrance needed', rate: 0 }
    ],
  },
];

const INIT_QUOTATIONS = [
  {
    key: 1, qid: 'QT-1001', leadKey: 1,
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1',
    products: [{ name: 'Soap 15grm', qty: 500, rate: 3.6 }, { name: 'Single Brush', qty: 200, rate: 4 }, { name: 'Shampoo 15ml', qty: 250, rate: 4.25 }],
    forwardingCharge: true, deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: '30_DAYS_CREDIT',
    logoNeeded: true, logoProducts: 'Soap15grm, Shampoo 10ml, Dental Kit',
    specifications: [
      { product: 'Shampoo 15ml', spec: 'Black Screw type bottle needed', rate: 0 },
      { product: 'Dental Kit', spec: 'Promise paste needed', rate: 0 }
    ],
    status: 'Sent', date: '2024-01-18', totalAmount: 4825,
    salesPerson: 'Priya', createdAt: '2024-01-18T10:00:00Z',
  },
];

const INIT_ORDERS = [
  {
    key: 1, oid: 'ORD-2401', quotationId: 'QT-1001',
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    billType: 'GST', gstNumber: '33AAACC1206D1Z1', paymentTerms: '30_DAYS_CREDIT',
    products: [{ name: 'Soap 15grm', qty: 500, rate: 3.6 }],
    totalAmount: 1800, advance: 900, status: 'In Production', date: '2024-01-20',
    expectedDelivery: '2024-02-10', notes: '',
    salesPerson: 'Priya', createdAt: '2024-01-20T14:30:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function calcTotal(products = []) {
  return products.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0), 0);
}

function generateWhatsAppText(data) {
  const lines = (data.products || []).map(p => `${p.name} - ${p.qty}(${p.rate})`).join('\n');
  const hotelTypeLine = data.hotelType === 'OLD' ? 'OLD HOTEL' : 'NEW HOTEL';
  const billLine = data.billType === 'GST' ? 'GST BILL' : 'NON GST BILL';
  const fwdLine = data.forwardingCharge ? 'FORWARDING CHARGE IS THERE' : 'NO FORWARDING CHARGE';
  const payLine = PAYMENT_LABELS[data.paymentTerms] || data.paymentTerms || '';
  let deliveryLine = '';
  if (data.deliveryBy === 'HNG' && data.transportationBy === 'CLIENT') {
    deliveryLine = 'Delivery done by HNG and Transportation Charge taken care by the Client';
  } else if (data.deliveryBy === 'CLIENT' && data.transportationBy === 'CLIENT') {
    deliveryLine = 'Delivery and Transportation Charge taken care by the Client';
  } else if (data.deliveryBy === 'TTDC' || data.transportationBy === 'TTDC') {
    deliveryLine = 'Delivery and Transportation Charge taken care by the TTDC';
  } else {
    deliveryLine = `Delivery by ${data.deliveryBy}, Transportation by ${data.transportationBy}`;
  }
  let specSection = '';
  if (data.logoNeeded) specSection += `Logo Needed\n${data.logoProducts || ''}\n`;
  if (data.specifications?.length) specSection += data.specifications.filter(Boolean).map(s => typeof s === 'string' ? s : `${s.product || ''} - ${s.spec || ''} (₹${s.rate || 0})`).join('\n');

  return `Hotel Name ${data.billingName || data.hotelName}
Location ${data.location}
Order Details
${lines}
Orders Confirmed
${hotelTypeLine}
${billLine}


Specification
${specSection}
${fwdLine}
${payLine}


${deliveryLine}
After Your Logo Confirmation your order will be Process So kindly Confirm ASAP

our Operation Team
Miss. Priya will Contact you
+91 63741 15883`;
}

const SelectWithAdd = ({ defaultOptions = [], placeholder, ...props }) => {
  const [items, setItems] = React.useState(defaultOptions);
  const [name, setName] = React.useState('');
  const inputRef = React.useRef(null);
  
  const addItem = (e) => {
    e.preventDefault();
    if (!name || items.some(i => i.value === name)) return;
    setItems([...items, { value: name, label: name }]);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  return (
    <Select
      {...props}
      placeholder={placeholder}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Space style={{ padding: '0 8px 4px' }}>
            <Input
              placeholder="Add item"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
              Add
            </Button>
          </Space>
        </>
      )}
      options={items}
    />
  );
};

// ─── Sub-components (defined outside to prevent remount) ──────────────
function ProductFormList({ fieldName = 'products' }) {
  return (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rest }) => (
            <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col flex="auto">
                <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Product name required' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="Product name (e.g. Soap 15grm)" />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'qty']} rules={[{ required: true, message: 'Qty' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Qty" style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'rate']} rules={[{ required: true, message: 'Rate' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={0} step={0.01} />
                </Form.Item>
              </Col>
              <Col flex="none">
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" onClick={() => add({ name: '', qty: undefined, rate: undefined })} icon={<PlusOutlined />} block>
            Add Product
          </Button>
        </>
      )}
    </Form.List>
  );
}

function SpecFormList({ form }) {
  const products = Form.useWatch('products', form) || [];
  return (
    <Form.List name="specifications">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rest }) => (
            <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col span={8}>
                <Form.Item {...rest} name={[name, 'product']} style={{ marginBottom: 0 }}>
                  <Select placeholder="Select Product">
                    {products.filter(p => p && p.name).map(p => <Option key={p.name} value={p.name}>{p.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col flex="auto">
                <Form.Item {...rest} name={[name, 'spec']} style={{ marginBottom: 0 }}>
                  <Input placeholder="Specification..." />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'rate']} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col flex="none">
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" onClick={() => add({ product: undefined, spec: '', rate: undefined })} icon={<PlusOutlined />} block>
            Add Specification
          </Button>
        </>
      )}
    </Form.List>
  );
}

function DeliveryPaymentFields() {
  return (
    <Row gutter={12}>
      <Col xs={24} sm={12}>
        <Form.Item label="Delivery By" name="deliveryBy" initialValue="HNG">
          <SelectWithAdd defaultOptions={[{ value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Transportation By" name="transportationBy">
          <SelectWithAdd defaultOptions={[{ value: 'CLIENT', label: 'Client' }, { value: 'TTDC', label: 'TTDC' }]} placeholder="Select or Add" />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="forwardingCharge" valuePropName="checked">
          <Checkbox>Forwarding charge applicable</Checkbox>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Payment Terms" name="paymentTerms" rules={[{ required: true }]}>
          <Select>
            {PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        </Form.Item>
      </Col>
    </Row>
  );
}

const SectionDivider = ({ title }) => (
  <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', margin: '8px 0 12px' }}>{title}</Divider>
);

const ProductHeaders = () => (
  <Row gutter={8} style={{ marginBottom: 4 }}>
    <Col flex="auto"><Text style={{ fontSize: 12, color: '#999' }}>Product Name</Text></Col>
    <Col style={{ width: 90 }}><Text style={{ fontSize: 12, color: '#999' }}>Qty</Text></Col>
    <Col style={{ width: 90 }}><Text style={{ fontSize: 12, color: '#999' }}>Rate (₹)</Text></Col>
    <Col style={{ width: 32 }} />
  </Row>
);

// ─── Main Component ────────────────────────────────────────────────────
export default function Sales() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [leadsData, setLeadsData] = useState(INIT_LEADS);
  const [quotationsData, setQuotationsData] = useState(INIT_QUOTATIONS);
  const [ordersData, setOrdersData] = useState(INIT_ORDERS);
  const [activeTab, setActiveTab] = useState('leads');
  const [searchText, setSearchText] = useState('');

  // Lead state
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm] = Form.useForm();

  // Quotation state
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [quotationFromLead, setQuotationFromLead] = useState(null);
  const [viewQuotationOpen, setViewQuotationOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quotationForm] = Form.useForm();

  // Order state
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderFromQuotation, setOrderFromQuotation] = useState(null);
  const [orderForm] = Form.useForm();

  const newLeadDefaults = {
    hotelType: 'OLD', billType: 'GST', forwardingCharge: false,
    deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: 'AFTER_DISPATCH',
    logoNeeded: false,
    products: [{ name: '', qty: undefined, rate: undefined }],
    specifications: [],
  };

  // ─── Lead handlers ────────────────────────────────────────────────
  const openAddLead = (lead = null) => {
    setEditingLead(lead);
    leadForm.resetFields();
    leadForm.setFieldsValue(lead ? { ...lead } : newLeadDefaults);
    setAddLeadOpen(true);
  };

  const saveLead = async () => {
    try {
      const values = await leadForm.validateFields();
      if (editingLead) {
        setLeadsData(prev => prev.map(l => l.key === editingLead.key ? { ...l, ...values } : l));
        message.success('Lead updated');
      } else {
        setLeadsData(prev => [...prev, { key: Date.now(), status: 'New', followUp: '', createdAt: new Date().toISOString(), salesPerson: 'Current User', ...values }]);
        message.success('Lead added');
      }
      setAddLeadOpen(false);
    } catch (_) {}
  };

  const openLeadDrawer = (lead) => { setSelectedLead(lead); setLeadDrawerOpen(true); };

  const startQuotationFromLead = (lead) => {
    setLeadDrawerOpen(false);
    setQuotationFromLead(lead);
    quotationForm.resetFields();
    quotationForm.setFieldsValue({ ...lead });
    setQuotationOpen(true);
  };

  // ─── Quotation handlers ───────────────────────────────────────────
  const saveQuotation = async () => {
    try {
      const values = await quotationForm.validateFields();
      const total = calcTotal(values.products);
      const newQ = {
        key: Date.now(),
        qid: `QT-${1000 + quotationsData.length + 1}`,
        leadKey: quotationFromLead?.key,
        status: 'Draft',
        date: new Date().toISOString().split('T')[0],
        totalAmount: total,
        createdAt: new Date().toISOString(),
        salesPerson: quotationFromLead?.salesPerson || 'Current User',
        ...values,
      };
      setQuotationsData(prev => [...prev, newQ]);
      if (quotationFromLead) {
        setLeadsData(prev => prev.map(l => l.key === quotationFromLead.key ? { ...l, status: 'Quotation Sent' } : l));
      }
      message.success('Quotation created');
      setQuotationOpen(false);
      setQuotationFromLead(null);
      setActiveTab('quotations');
    } catch (_) {}
  };

  const sendViaWhatsApp = (data) => {
    const text = generateWhatsAppText(data);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    if (data.qid) {
      setQuotationsData(prev => prev.map(q => q.key === data.key ? { ...q, status: 'Sent' } : q));
    }
  };

  const startOrderFromQuotation = (q) => {
    setViewQuotationOpen(false);
    setOrderFromQuotation(q);
    orderForm.resetFields();
    orderForm.setFieldsValue({
      hotelName: q.hotelName, billingName: q.billingName, location: q.location,
      detailedAddress: q.detailedAddress, city: q.city, state: q.state, pincode: q.pincode,
      billType: q.billType, paymentTerms: q.paymentTerms,
      products: q.products, totalAmount: q.totalAmount, advance: 0,
    });
    setOrderOpen(true);
  };

  const saveOrder = async () => {
    try {
      const values = await orderForm.validateFields();
      const newOrder = {
        key: Date.now(),
        oid: `ORD-${2400 + ordersData.length + 1}`,
        quotationId: orderFromQuotation?.qid,
        status: 'In Production',
        date: new Date().toISOString().split('T')[0],
        totalAmount: calcTotal(values.products),
        createdAt: new Date().toISOString(),
        salesPerson: orderFromQuotation?.salesPerson || 'Current User',
        ...values,
      };
      setOrdersData(prev => [...prev, newOrder]);
      if (orderFromQuotation) {
        setQuotationsData(prev => prev.map(q => q.key === orderFromQuotation.key ? { ...q, status: 'Approved' } : q));
      }
      message.success('Order confirmed!');
      setOrderOpen(false);
      setOrderFromQuotation(null);
      setActiveTab('orders');
    } catch (_) {}
  };

  // ─── Table columns ────────────────────────────────────────────────
  const leadColumns = [
    {
      title: 'Hotel / Company', dataIndex: 'hotelName',
      render: (v) => <Text strong style={{ color: textColor }}>{v}</Text>,
    },
    { title: 'Location', dataIndex: 'location' },
    { title: 'GST Number', dataIndex: 'gstNumber', render: (v) => v || '—' },
    {
      title: 'Phone', dataIndex: 'phone', responsive: ['md'],
      render: (v) => v ? <a href={`tel:${v}`} style={{ color: '#B11E6A' }}>{v}</a> : '—',
    },
    {
      title: 'Type', key: 'type', responsive: ['sm'],
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag style={{ fontSize: 11 }}>{r.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}</Tag>
          <Tag color={r.billType === 'GST' ? '#B11E6A' : '#fa8c16'} style={{ fontSize: 11 }}>{r.billType === 'GST' ? 'GST' : 'Non-GST'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Products', key: 'products', responsive: ['lg'],
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>{r.products?.length || 0} items · ₹{calcTotal(r.products).toLocaleString()}</Text>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'],
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'], render: (v) => v || '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Details"><Button size="small" icon={<EyeOutlined />} onClick={() => openLeadDrawer(r)} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openAddLead(r)} /></Tooltip>
          <Tooltip title="Generate Quotation">
            <Button size="small" type="primary" style={{ background: '#B11E6A', border: 'none', fontSize: 11 }} onClick={() => startQuotationFromLead(r)}>
              Quotation
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const quotationColumns = [
    { title: 'Quote ID', dataIndex: 'qid', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Hotel', dataIndex: 'hotelName', render: (v) => <Text strong>{v}</Text> },
    { title: 'Location', dataIndex: 'location' },
    { title: 'GST Number', dataIndex: 'gstNumber', render: (v) => v || '—' },
    {
      title: 'Items / Amount', key: 'amt', responsive: ['sm'],
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.products?.length || 0} items</Text><br />
          <Text strong style={{ color: '#B11E6A' }}>₹{(r.totalAmount || calcTotal(r.products)).toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: 'Bill', dataIndex: 'billType', responsive: ['md'],
      render: (v) => <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 11 }}>{v === 'GST' ? 'GST' : 'Non-GST'}</Tag>,
    },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'],
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'], render: (v) => v || '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuotation(r); setViewQuotationOpen(true); }} />
          </Tooltip>
          <Tooltip title="Send via WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => sendViaWhatsApp(r)} />
          </Tooltip>
          <Tooltip title="Convert to Order">
            <Button size="small" style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => startOrderFromQuotation(r)}>
              → Order
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const orderColumns = [
    { title: 'Order ID', dataIndex: 'oid', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Hotel', dataIndex: 'hotelName', render: (v) => <Text strong>{v}</Text> },
    { title: 'Location', dataIndex: 'location' },
    { title: 'GST Number', dataIndex: 'gstNumber', render: (v) => v || '—' },
    {
      title: 'Amount', dataIndex: 'totalAmount', responsive: ['sm'],
      render: (v) => <Text strong>₹{(v || 0).toLocaleString()}</Text>,
    },
    {
      title: 'Advance', dataIndex: 'advance', responsive: ['md'],
      render: (v) => <Text style={{ color: '#52c41a' }}>₹{(v || 0).toLocaleString()}</Text>,
    },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'],
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'], render: (v) => v || '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} />
          <Button size="small" icon={<FileTextOutlined />} />
          <Tooltip title="Send via WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => sendViaWhatsApp(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filtered = (arr, keys = ['hotelName', 'location']) =>
    !searchText ? arr : arr.filter(item => keys.some(k => (item[k] || '').toLowerCase().includes(searchText.toLowerCase())));

  // ─── Lead form modal ───────────────────────────────────────────────
  const LeadModal = (
    <Modal
      title={editingLead ? 'Edit Customer' : 'Add New Customer'}
      open={addLeadOpen}
      onCancel={() => setAddLeadOpen(false)}
      onOk={saveLead}
      okText={editingLead ? 'Update' : 'Save Customer'}
      okButtonProps={{ style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } }}
      width={Math.min(700, window.innerWidth - 32)}
    >
      <Form form={leadForm} layout="vertical" style={{ marginTop: 12, maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        <SectionDivider title="Hotel / Customer Info" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item label="Hotel Name" name="hotelName" rules={[{ required: true }]}>
              <Input placeholder="e.g. Hotel Blue Star" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Billing Name (on invoice)" name="billingName">
              <Input placeholder="e.g. HOTEL BLUESTAR" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Location / City" name="location" rules={[{ required: true }]}>
              <Input placeholder="e.g. Coimbatore" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true, message: 'Detailed Address is required' }]}>
              <Input.TextArea rows={1} placeholder="Full Address" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="City" name="city">
              <Input placeholder="City" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="State" name="state">
              <Input placeholder="State" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Pincode" name="pincode">
              <Input placeholder="Pincode" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Contact Person" name="contactPerson">
              <Input placeholder="Name" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Phone required' }]}>
              <Input placeholder="+91 XXXXX XXXXX" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Email" name="email">
              <Input placeholder="optional" prefix={<MailOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Hotel Type" name="hotelType" rules={[{ required: true }]}>
              <Select>
                <Option value="OLD">Old Hotel</Option>
                <Option value="NEW">New Hotel</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Bill Type" name="billType" rules={[{ required: true }]}>
              <Select>
                <Option value="GST">GST Bill</Option>
                <Option value="NON_GST">Non-GST Bill</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="GST Number" name="gstNumber">
              <Input placeholder="GSTIN (if GST)" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Follow-up Date" name="followUp">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Customer Status" name="status">
              <Select>
                <Option value="New">New</Option>
                <Option value="Interested">Interested</Option>
                <Option value="Quotation Sent">Quotation Sent</Option>
                <Option value="Converted">Converted</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <SectionDivider title="Order Details (Products)" />
        <ProductHeaders />
        <ProductFormList fieldName="products" />

        <SectionDivider title="Specifications" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="logoNeeded" valuePropName="checked">
              <Checkbox>Logo Needed</Checkbox>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Logo on Products" name="logoProducts">
              <Input placeholder="e.g. Soap15grm, Shampoo, Dental Kit" />
            </Form.Item>
          </Col>
        </Row>
        <SpecFormList form={leadForm} />

        <SectionDivider title="Delivery & Payment" />
        <DeliveryPaymentFields />
      </Form>
    </Modal>
  );

  // ─── Lead detail drawer ────────────────────────────────────────────
  const LeadDrawer = (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>Customer Details</span>
          {selectedLead && (
            <Button type="primary" icon={<FileTextOutlined />} size="small"
              style={{ background: '#B11E6A', border: 'none' }}
              onClick={() => startQuotationFromLead(selectedLead)}
            >
              Generate Quotation
            </Button>
          )}
        </div>
      }
      open={leadDrawerOpen}
      onClose={() => setLeadDrawerOpen(false)}
      width={Math.min(500, window.innerWidth - 32)}
    >
      {selectedLead && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" style={{ borderRadius: 10, background: 'rgba(177,30,106,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>{selectedLead.hotelName}</Text>
                {selectedLead.billingName && selectedLead.billingName !== selectedLead.hotelName && (
                  <><br /><Text style={{ fontSize: 12, color: '#888' }}>Bill as: {selectedLead.billingName}</Text></>
                )}
                <br /><Text style={{ color: '#666' }}>{selectedLead.location}</Text>
              </div>
              <Space direction="vertical" size={2}>
                <Tag>{selectedLead.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}</Tag>
                <Tag color={selectedLead.billType === 'GST' ? '#B11E6A' : '#fa8c16'}>{selectedLead.billType === 'GST' ? 'GST Bill' : 'Non-GST Bill'}</Tag>
              </Space>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedLead.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PhoneOutlined style={{ color: '#B11E6A' }} />
                  <a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a>
                </div>
              )}
              {selectedLead.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MailOutlined style={{ color: '#B11E6A' }} /><Text>{selectedLead.email}</Text>
                </div>
              )}
            </div>
          </Card>

          {selectedLead.billType === 'GST' && selectedLead.gstNumber && selectedLead.gstNumber !== '—' && (
            <Card size="small" style={{ borderRadius: 10, border: '1px solid #e0e0e0' }}>
              <Text strong style={{ fontSize: 13, color: '#B11E6A' }}>GST Details</Text>
              <Row style={{ marginTop: 8 }} gutter={[8, 8]}>
                <Col span={12}><Text style={{ color: '#666', fontSize: 12 }}>Customer Name:</Text><br /><Text strong>{selectedLead.hotelName}</Text></Col>
                <Col span={12}><Text style={{ color: '#666', fontSize: 12 }}>Phone Number:</Text><br /><Text strong>{selectedLead.phone || '—'}</Text></Col>
                <Col span={12}><Text style={{ color: '#666', fontSize: 12 }}>PAN Number:</Text><br /><Text strong>{selectedLead.gstNumber.substring(2, 12)}</Text></Col>
                <Col span={12}><Text style={{ color: '#666', fontSize: 12 }}>GSTIN:</Text><br /><Text strong>{selectedLead.gstNumber}</Text></Col>
                <Col span={24}><Text style={{ color: '#666', fontSize: 12 }}>Address:</Text><br /><Text strong>{selectedLead.detailedAddress || selectedLead.location}</Text></Col>
              </Row>
            </Card>
          )}

          <div>
            <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Order Details</Text>
            {selectedLead.products?.map((p, i) => {
              const productSpecs = selectedLead.specifications?.filter(s => typeof s === 'object' && s.product === p.name) || [];
              return (
                <div key={i} style={{ padding: '8px', background: i % 2 === 0 ? 'rgba(177,30,106,0.04)' : 'transparent', borderRadius: 6, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>{p.name} — {p.qty} pcs @ ₹{p.rate}</Text>
                    <Text strong>₹{((p.qty || 0) * (p.rate || 0)).toLocaleString()}</Text>
                  </div>
                  {productSpecs.length > 0 && (
                    <div style={{ marginTop: 6, paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {productSpecs.map((s, idx) => (
                         <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <CheckOutlined style={{ color: '#B11E6A', fontSize: 10 }} />
                           <Text style={{ fontSize: 12, color: '#666' }}>{s.spec} {s.rate ? `(+₹${s.rate})` : ''}</Text>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 15, color: '#B11E6A' }}>Total: ₹{calcTotal(selectedLead.products).toLocaleString()}</Text>
            </div>
          </div>

          {(() => {
            const unmappedSpecs = selectedLead.specifications?.filter(s => typeof s === 'string' || (typeof s === 'object' && !s.product)) || [];
            if (!selectedLead.logoNeeded && unmappedSpecs.length === 0) return null;
            return (
              <div>
                <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8, marginTop: 12 }}>Additional Requirements</Text>
                {selectedLead.logoNeeded && (
                  <Tag color="#B11E6A" style={{ marginBottom: 8, whiteSpace: 'normal' }}>Logo Needed: {selectedLead.logoProducts}</Tag>
                )}
                {unmappedSpecs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <CheckOutlined style={{ color: '#B11E6A', fontSize: 11, marginTop: 3 }} />
                    <Text style={{ fontSize: 13 }}>{typeof s === 'string' ? s : `${s.spec || ''} (₹${s.rate || 0})`}</Text>
                  </div>
                ))}
              </div>
            );
          })()}

          <div>
            <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Delivery & Payment</Text>
            <Space wrap>
              <Tag>{selectedLead.forwardingCharge ? 'Forwarding Charge: YES' : 'No Forwarding Charge'}</Tag>
              <Tag>Delivery: {selectedLead.deliveryBy}</Tag>
              <Tag>Transport: {selectedLead.transportationBy}</Tag>
              <Tag color="#B11E6A">{PAYMENT_LABELS[selectedLead.paymentTerms] || selectedLead.paymentTerms}</Tag>
            </Space>
          </div>

          <Steps direction="vertical" size="small"
            current={['New', 'Interested', 'Quotation Sent', 'Converted'].indexOf(selectedLead.status)}
            items={[
              { title: 'Customer Created' }, { title: 'Interested' },
              { title: 'Quotation Sent' }, { title: 'Order Confirmed' },
            ]}
          />

          <Button icon={<WhatsAppOutlined />}
            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }}
            block onClick={() => sendViaWhatsApp(selectedLead)}
          >
            Send via WhatsApp
          </Button>
          <Button type="primary" icon={<FileTextOutlined />}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8 }}
            block onClick={() => startQuotationFromLead(selectedLead)}
          >
            Generate Quotation
          </Button>
        </div>
      )}
    </Drawer>
  );

  // ─── Quotation form modal ──────────────────────────────────────────
  const QuotationModal = (
    <Modal
      title={quotationFromLead ? `New Quotation — ${quotationFromLead.hotelName}` : 'New Quotation'}
      open={quotationOpen}
      onCancel={() => { setQuotationOpen(false); setQuotationFromLead(null); }}
      onOk={saveQuotation}
      okText="Save Quotation"
      okButtonProps={{ style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } }}
      width={Math.min(700, window.innerWidth - 32)}
    >
      <Form form={quotationForm} layout="vertical" style={{ marginTop: 12, maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        <SectionDivider title="Hotel Info" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item label="Hotel Name" name="hotelName" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Billing Name" name="billingName"><Input placeholder="Name on quotation" /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true, message: 'Detailed Address is required' }]}><Input.TextArea rows={1} /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="City" name="city"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="State" name="state"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Pincode" name="pincode"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Hotel Type" name="hotelType">
              <Select><Option value="OLD">Old Hotel</Option><Option value="NEW">New Hotel</Option></Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Bill Type" name="billType">
              <Select><Option value="GST">GST Bill</Option><Option value="NON_GST">Non-GST Bill</Option></Select>
            </Form.Item>
          </Col>
        </Row>

        <SectionDivider title="Products" />
        <ProductHeaders />
        <ProductFormList fieldName="products" />

        <SectionDivider title="Specifications" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="logoNeeded" valuePropName="checked"><Checkbox>Logo Needed</Checkbox></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Logo on Products" name="logoProducts"><Input placeholder="e.g. Soap15grm, Shampoo" /></Form.Item>
          </Col>
        </Row>
        <SpecFormList form={quotationForm} />

        <SectionDivider title="Delivery & Payment" />
        <DeliveryPaymentFields />
      </Form>
    </Modal>
  );

  // ─── View quotation drawer ─────────────────────────────────────────
  const ViewQuotationDrawer = (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span>{selectedQuotation?.qid} — {selectedQuotation?.hotelName}</span>
          <Button icon={<WhatsAppOutlined />} size="small"
            style={{ background: '#25D366', color: '#fff', border: 'none' }}
            onClick={() => selectedQuotation && sendViaWhatsApp(selectedQuotation)}
          >
            WhatsApp
          </Button>
        </div>
      }
      open={viewQuotationOpen}
      onClose={() => setViewQuotationOpen(false)}
      width={Math.min(500, window.innerWidth - 32)}
    >
      {selectedQuotation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" style={{ borderRadius: 10, background: 'rgba(177,30,106,0.05)' }}>
            <Text strong style={{ fontSize: 16 }}>{selectedQuotation.billingName || selectedQuotation.hotelName}</Text><br />
            <Text style={{ color: '#666' }}>{selectedQuotation.location}</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Tag>{selectedQuotation.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}</Tag>
                <Tag color={selectedQuotation.billType === 'GST' ? '#B11E6A' : '#fa8c16'}>{selectedQuotation.billType === 'GST' ? 'GST' : 'Non-GST'}</Tag>
                <Tag color={STATUS_COLORS[selectedQuotation.status]}>{selectedQuotation.status}</Tag>
              </Space>
            </div>
          </Card>

          <div>
            <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Products</Text>
            {selectedQuotation.products?.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: i % 2 === 0 ? 'rgba(177,30,106,0.04)' : 'transparent', borderRadius: 6 }}>
                <Text>{p.name} × {p.qty} @ ₹{p.rate}</Text>
                <Text strong>₹{((p.qty || 0) * (p.rate || 0)).toLocaleString()}</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <Text strong style={{ fontSize: 15, color: '#B11E6A' }}>
                Total: ₹{calcTotal(selectedQuotation.products).toLocaleString()}
              </Text>
            </div>
          </div>

          {(selectedQuotation.logoNeeded || selectedQuotation.specifications?.length > 0) && (
            <div>
              <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Specifications</Text>
              {selectedQuotation.logoNeeded && (
                <Tag color="#B11E6A" style={{ marginBottom: 8, whiteSpace: 'normal' }}>Logo: {selectedQuotation.logoProducts}</Tag>
              )}
              {selectedQuotation.specifications?.filter(Boolean).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <CheckOutlined style={{ color: '#B11E6A', fontSize: 11, marginTop: 3 }} />
                  <Text style={{ fontSize: 13 }}>{typeof s === 'string' ? s : `${s.product || ''} - ${s.spec || ''} (₹${s.rate || 0})`}</Text>
                </div>
              ))}
            </div>
          )}

          <Space wrap>
            <Tag>{selectedQuotation.forwardingCharge ? 'Forwarding Charge: YES' : 'No Forwarding Charge'}</Tag>
            <Tag color="#B11E6A">{PAYMENT_LABELS[selectedQuotation.paymentTerms]}</Tag>
          </Space>

          <Button icon={<WhatsAppOutlined />}
            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }}
            block size="large" onClick={() => sendViaWhatsApp(selectedQuotation)}
          >
            Send via WhatsApp
          </Button>
          <Button type="primary"
            style={{ background: '#52c41a', border: 'none', borderRadius: 8 }}
            block onClick={() => startOrderFromQuotation(selectedQuotation)}
          >
            Convert to Order
          </Button>
        </div>
      )}
    </Drawer>
  );

  // ─── Order confirm modal ───────────────────────────────────────────
  const OrderModal = (
    <Modal
      title={orderFromQuotation ? `Confirm Order — ${orderFromQuotation.hotelName}` : 'New Order'}
      open={orderOpen}
      onCancel={() => { setOrderOpen(false); setOrderFromQuotation(null); }}
      onOk={saveOrder}
      okText="Confirm Order"
      okButtonProps={{ style: { background: '#52c41a', border: 'none' } }}
      width={Math.min(700, window.innerWidth - 32)}
    >
      <Form form={orderForm} layout="vertical" style={{ marginTop: 12, maxHeight: '65vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        <SectionDivider title="Order Info" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item label="Hotel Name" name="hotelName" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Billing Name" name="billingName"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true, message: 'Detailed Address is required' }]}><Input.TextArea rows={1} /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="City" name="city"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="State" name="state"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="Pincode" name="pincode"><Input /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Bill Type" name="billType">
              <Select><Option value="GST">GST Bill</Option><Option value="NON_GST">Non-GST Bill</Option></Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Payment Terms" name="paymentTerms">
              <Select>{PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Order Date" name="orderDate"><Input type="date" /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Expected Delivery Date" name="expectedDelivery"><Input type="date" /></Form.Item>
          </Col>
        </Row>

        <SectionDivider title="Products" />
        <ProductHeaders />
        <ProductFormList fieldName="products" />

        <SectionDivider title="Payment" />
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item label="Advance Paid (₹)" name="advance" rules={[{ required: true, message: 'Enter advance amount' }]}>
              <InputNumber style={{ width: '100%' }} prefix="₹" min={0} placeholder="0" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Notes / Special Instructions" name="notes">
              <Input.TextArea rows={2} placeholder="Any notes..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Sales Team" items={[{ label: 'Sales Team' }]} style={{ marginBottom: 0 }} />
        <Button type="primary" icon={<PlusOutlined />}
          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
          onClick={() => {
            if (activeTab === 'leads') openAddLead();
            else { setOrderFromQuotation(null); orderForm.resetFields(); setOrderOpen(true); }
          }}
        >
          {activeTab === 'leads' ? 'Add Customer' : 'New Order'}
        </Button>
      </div>

      {/* Flow progress bar */}
      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, marginBottom: 16, boxShadow: '0 2px 12px rgba(177,30,106,0.05)' }} bodyStyle={{ padding: '14px 24px' }}>
        <Steps size="small"
          current={activeTab === 'leads' ? 0 : 1}
          onChange={(i) => setActiveTab(['leads', 'orders'][i])}
          style={{ cursor: 'pointer' }}
          items={[
            { title: 'Customers', description: `${leadsData.length} total` },
            { title: 'Orders', description: `${ordersData.length} total` },
          ]}
        />
      </Card>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 16px' }}
          tabBarExtraContent={
            <Input prefix={<SearchOutlined />} placeholder="Search..." value={searchText}
              onChange={(e) => setSearchText(e.target.value)} allowClear
              style={{ width: 200, borderRadius: 8 }}
            />
          }
        >
          <TabPane tab={<span><Badge count={leadsData.filter(l => l.status === 'New').length} size="small" offset={[6, 0]}>Customers</Badge></span>} key="leads">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table dataSource={filtered(leadsData)} columns={leadColumns} pagination={{ pageSize: 8, size: 'small' }} size="small" rowKey="key" />
            </div>
          </TabPane>
          <TabPane tab="Orders" key="orders">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table dataSource={filtered(ordersData)} columns={orderColumns} pagination={{ pageSize: 8, size: 'small' }} size="small" rowKey="key" />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {LeadModal}
      {LeadDrawer}
      {QuotationModal}
      {ViewQuotationDrawer}
      {OrderModal}
    </div>
  );
}
