import React, { useState, useEffect } from 'react';
import {
  Tabs, Card, Table, Button, Tag, Space, Input, Select, Modal,
  Form, Row, Col, Typography, Drawer, Steps, Divider, Badge,
  InputNumber, Tooltip, Checkbox, message, DatePicker,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  FileTextOutlined, PhoneOutlined, MailOutlined, UserOutlined,
  WhatsAppOutlined, MinusCircleOutlined, CheckOutlined,
  DownloadOutlined, UploadOutlined, FilterOutlined, ArrowRightOutlined,
  BankOutlined, EnvironmentOutlined, TeamOutlined, CalendarOutlined,
  ShoppingCartOutlined, SettingOutlined, CarOutlined, CreditCardOutlined,
  HistoryOutlined, StarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

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
  Hot: '#ff4d4f', Warm: '#fa8c16', Cold: '#1890ff',
};

const LEAD_STEPS = [
  { title: 'Follow up 1', description: 'Initial Contact' },
  { title: 'Follow up 2', description: 'Requirement' },
  { title: 'Follow up 3', description: 'Sample Sent' },
  { title: 'Follow up 4', description: 'Feedback' },
  { title: 'Follow up 5', description: 'Closing' },
];

// ─── Sample data ──────────────────────────────────────────────────────
const INIT_LEADS = [
  {
    key: 1, leadId: 'LEAD-1001', hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', status: 'Warm', followUpDate: '2024-01-20',
    salesPerson: 'Priya', source: 'Google', createdAt: '2024-01-15T10:30:00Z',
    products: [
      { name: 'Soap 15grm', qty: 500, rate: 3.6 }, { name: 'Single Brush', qty: 200, rate: 4 },
    ],
    forwardingCharge: true, deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: '30_DAYS_CREDIT',
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

const INIT_CUSTOMERS = [
  {
    key: 1, customerId: 'CUST-1001', leadId: 'LEAD-1001', hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', salesPerson: 'Priya',
    createdAt: '2024-01-20T14:30:00Z',
  }
];

const INIT_NEGOTIATIONS = [];

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
function ProductFormList({ fieldName = 'products', disabled = false }) {
  return (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rest }) => (
            <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col flex="auto">
                <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Product name required' }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="Product name (e.g. Soap 15grm)" disabled={disabled} />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'qty']} rules={[{ required: true, message: 'Qty' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Qty" style={{ width: '100%' }} min={0} disabled={disabled} />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'rate']} rules={[{ required: true, message: 'Rate' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={0} step={0.01} disabled={disabled} />
                </Form.Item>
              </Col>
              {!disabled && (
                <Col flex="none">
                  <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                </Col>
              )}
            </Row>
          ))}
          {!disabled && (
            <Button type="dashed" onClick={() => add({ name: '', qty: undefined, rate: undefined })} icon={<PlusOutlined />} block>
              Add Product
            </Button>
          )}
        </>
      )}
    </Form.List>
  );
}

function SpecFormList({ form, disabled = false }) {
  const products = Form.useWatch('products', form) || [];
  return (
    <Form.List name="specifications">
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...rest }) => (
            <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
              <Col span={8}>
                <Form.Item {...rest} name={[name, 'product']} style={{ marginBottom: 0 }}>
                  <Select placeholder="Select Product" disabled={disabled}>
                    {products.filter(p => p && p.name).map(p => <Option key={p.name} value={p.name}>{p.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col flex="auto">
                <Form.Item {...rest} name={[name, 'spec']} style={{ marginBottom: 0 }}>
                  <Input placeholder="Specification..." disabled={disabled} />
                </Form.Item>
              </Col>
              <Col style={{ width: 100 }}>
                <Form.Item {...rest} name={[name, 'rate']} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={0} disabled={disabled} />
                </Form.Item>
              </Col>
              {!disabled && (
                <Col flex="none">
                  <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                </Col>
              )}
            </Row>
          ))}
          {!disabled && (
            <Button type="dashed" onClick={() => add({ product: undefined, spec: '', rate: undefined })} icon={<PlusOutlined />} block>
              Add Specification
            </Button>
          )}
        </>
      )}
    </Form.List>
  );
}

function DeliveryPaymentFields({ disabled = false }) {
  return (
    <Row gutter={12}>
      <Col xs={24} sm={12}>
        <Form.Item label="Delivery By" name="deliveryBy" initialValue="HNG">
          <SelectWithAdd defaultOptions={[{ value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Transportation By" name="transportationBy">
          <SelectWithAdd defaultOptions={[{ value: 'CLIENT', label: 'Client' }, { value: 'TTDC', label: 'TTDC' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="forwardingCharge" valuePropName="checked">
          <Checkbox disabled={disabled}>Forwarding charge applicable</Checkbox>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Payment Terms" name="paymentTerms" rules={[{ required: true }]}>
          <Select disabled={disabled}>
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
  const [customersData, setCustomersData] = useState(INIT_CUSTOMERS);
  const [quotationsData, setQuotationsData] = useState(INIT_QUOTATIONS);
  const [negotiationsData, setNegotiationsData] = useState(INIT_NEGOTIATIONS);
  const [ordersData, setOrdersData] = useState(INIT_ORDERS);
  const [activeTab, setActiveTab] = useState('leads');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'add-lead', 'add-customer', 'detail'
  const [selectedRecord, setSelectedRecord] = useState(null);

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
        const newKey = Date.now();
        const newLead = {
          key: newKey,
          leadId: `LEAD-${1000 + leadsData.length + 1}`,
          status: 'Warm',
          createdAt: new Date().toISOString(),
          salesPerson: values.salesPerson || 'Current User',
          ...values
        };
        setLeadsData(prev => [...prev, newLead]);
        message.success('Lead added');
      }
      setAddLeadOpen(false);
      setViewMode('table');
    } catch (_) { }
  };

  const openDetailNextScreen = (record) => {
    setSelectedRecord(record);
    leadForm.resetFields();
    leadForm.setFieldsValue(record);
    setViewMode('detail');
  };

  const openLeadDrawer = (lead) => { setSelectedLead(lead); setLeadDrawerOpen(true); };

  const convertToCustomer = (lead) => {
    const newCustomer = {
      ...lead,
      customerId: `CUST-${1000 + customersData.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    setCustomersData(prev => [...prev, newCustomer]);
    setLeadsData(prev => prev.filter(l => l.key !== lead.key));
    message.success(`${lead.hotelName} converted to Customer`);
    setActiveTab('customers');
  };

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
    } catch (_) { }
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
    } catch (_) { }
  };

  // ─── Table columns ────────────────────────────────────────────────
  const leadColumns = [
    {
      title: 'Hotel / Company', dataIndex: 'hotelName',
      render: (v) => <Text strong style={{ color: textColor }}>{v}</Text>,
    },
    { title: 'Source', dataIndex: 'source', render: (v) => v || '—' },
    { title: 'Sales Person', dataIndex: 'salesPerson', render: (v) => v || '—' },
    { title: 'Follow Up Name', dataIndex: 'followUpName', render: (v) => v || '—' },
    {
      title: 'Follow Up Date/Time', dataIndex: 'followUpDate',
      render: (v, r) => v ? `${v} ${r.followUpTime || ''}` : '—',
    },
    {
      title: 'Status', dataIndex: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || '#ccc'}>{v}</Tag>
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Drawer"><Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openLeadDrawer(r); }} /></Tooltip>
          <Tooltip title="Convert to Customer">
            <Button size="small" icon={<ArrowRightOutlined />} style={{ color: '#52c41a' }} onClick={(e) => { e.stopPropagation(); convertToCustomer(r); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const customerColumns = [
    { title: 'Customer ID', dataIndex: 'customerId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Hotel / Company', dataIndex: 'hotelName', render: (v) => <Text strong>{v}</Text> },
    { title: 'Location', dataIndex: 'location' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Sales Person', dataIndex: 'salesPerson' },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Drawer"><Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openLeadDrawer(r); }} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openAddLead(r); }} /></Tooltip>
        </Space>
      ),
    },
  ];

  const negotiationColumns = [
    { title: 'Hotel', dataIndex: 'hotelName', render: (v) => <Text strong>{v}</Text> },
    { title: 'Location', dataIndex: 'location' },
    { title: 'Sales Person', dataIndex: 'salesPerson' },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLORS[v] || 'orange'}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} />
          <Button size="small" type="primary" style={{ fontSize: 11 }}>Order</Button>
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
            <Form.Item label="Source" name="source">
              <SelectWithAdd defaultOptions={[{ value: 'Direct', label: 'Direct' }, { value: 'Referral', label: 'Referral' }, { value: 'Google', label: 'Google' }]} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Sales Person" name="salesPerson">
              <Input placeholder="Sales person name" />
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
            <Form.Item label="Follow-up Date" name="followUpDate">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Follow-up Time" name="followUpTime">
              <Input type="time" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Follow-up Name" name="followUpName">
              <Input placeholder="Next follow-up task" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Lead Status" name="status">
              <Select>
                <Option value="Hot">Hot</Option>
                <Option value="Warm">Warm</Option>
                <Option value="Cold">Cold</Option>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Lead ID:</Text> <Text strong>{selectedLead.leadId || '—'}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Customer ID:</Text> <Text strong>{selectedLead.customerId || '—'}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Source:</Text> <Text strong>{selectedLead.source || '—'}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Sales Person:</Text> <Text strong>{selectedLead.salesPerson || '—'}</Text>
              </div>
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

          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Follow-up Progress</Text>
            <Steps direction="vertical" size="small"
              current={selectedLead.followUpStep || 0}
              items={LEAD_STEPS}
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#B11E6A' }}>Notes & History</Text>
              <Button type="link" size="small" icon={<PlusOutlined />}>Add Note</Button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(selectedLead.notes_history || [
                { date: '2024-05-01', time: '10:30 AM', person: 'Priya', text: 'Initial call done. Interested in Soap 15grm.' },
                { date: '2024-05-01', time: '02:15 PM', person: 'Priya', text: 'Sent sample photos via WhatsApp.' }
              ]).map((note, idx) => (
                <div key={idx} style={{ padding: '8px', background: '#f9f9f9', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 11 }}>{note.person}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{note.date} {note.time}</Text>
                  </div>
                  <Text>{note.text}</Text>
                </div>
              ))}
            </div>
          </div>

          <Button icon={<WhatsAppOutlined />}
            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }}
            block onClick={() => sendViaWhatsApp(selectedLead)}
          >
            Send via WhatsApp
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" icon={<FileTextOutlined />}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, flex: 1 }}
              onClick={() => startQuotationFromLead(selectedLead)}
            >
              Quotation
            </Button>
            {activeTab === 'leads' && (
              <Button
                icon={<ArrowRightOutlined />}
                style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8, flex: 1 }}
                onClick={() => convertToCustomer(selectedLead)}
              >
                Convert
              </Button>
            )}
          </div>
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
  if (viewMode !== 'table') {
    const isDetail = viewMode === 'detail';
    const isAddLead = viewMode === 'add-lead';
    const isAddCustomer = viewMode === 'add-customer';
    const record = selectedRecord || {};
    const totalValue = calcTotal(record.products);

    const InfoRow = ({ label, value }) => (
      <div style={{ padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
        <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
        <Text strong style={{ fontSize: 13, display: 'block', marginTop: 1 }}>{value || '—'}</Text>
      </div>
    );

    const SidebarCard = ({ accentColor, icon, title, children, extra }) => (
      <Card
        style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
        title={
          <Space>
            <div style={{ width: 4, height: 20, background: accentColor, borderRadius: 2, display: 'inline-block' }} />
            <span style={{ color: accentColor }}>{icon}</span>
            <span style={{ fontSize: 14 }}>{title}</span>
          </Space>
        }
        extra={extra}
      >
        {children}
      </Card>
    );

    return (
      <motion.div
        className="page-container"
        style={{ paddingBottom: 60 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => setViewMode('table')} style={{ borderRadius: 8 }}>
            Back to List
          </Button>
          <Space wrap>
            {isDetail && (
              <>
                <Button icon={<EditOutlined />} onClick={() => openAddLead(record)} style={{ borderRadius: 8 }}>Edit</Button>
                <Button icon={<WhatsAppOutlined />}
                  style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }}
                  onClick={() => sendViaWhatsApp(record)}
                >WhatsApp</Button>
                {record.leadId && !record.customerId && (
                  <Button icon={<ArrowRightOutlined />}
                    style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8 }}
                    onClick={() => convertToCustomer(record)}
                  >Convert to Customer</Button>
                )}
              </>
            )}
            {!isDetail && (
              <Button type="primary" size="large" icon={<PlusOutlined />}
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)' }}
                onClick={saveLead}
              >
                {isAddLead ? 'Save Lead' : 'Save Customer'}
              </Button>
            )}
          </Space>
        </div>

        {/* Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #8a1252 0%, #B11E6A 45%, #D85C9E 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 20,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 80, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative' }}>
            <div>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block' }}>
                {isDetail ? (record.customerId ? 'Customer Profile' : 'Lead Profile') : isAddLead ? 'New Lead' : 'New Customer'}
              </Text>
              <Title level={3} style={{ color: '#fff', margin: '4px 0 0', fontWeight: 700, lineHeight: 1.2 }}>
                {isDetail ? (record.hotelName || 'Hotel') : isAddLead ? 'Add New Lead' : 'Add New Customer'}
              </Title>
              {isDetail && (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'block', marginTop: 4 }}>
                  {[record.location, record.billingName && record.billingName !== record.hotelName ? record.billingName : null].filter(Boolean).join(' · ')}
                </Text>
              )}
              {!isDetail && (
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, display: 'block', marginTop: 6 }}>
                  {isAddLead ? 'Fill in the details to create a new sales lead' : 'Register a new customer in the system'}
                </Text>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {isDetail && (
                <Space>
                  {record.leadId && <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, fontSize: 12 }}>{record.leadId}</Tag>}
                  {record.customerId && <Tag style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, fontSize: 12 }}>{record.customerId}</Tag>}
                </Space>
              )}
              {isDetail && record.status && (
                <Tag color={STATUS_COLORS[record.status]} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>
                  {record.status}
                </Tag>
              )}
              {isDetail && (
                <Space>
                  <Tag style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, fontSize: 12 }}>
                    {record.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}
                  </Tag>
                  <Tag style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, fontSize: 12 }}>
                    {record.billType === 'GST' ? 'GST Bill' : 'Non-GST'}
                  </Tag>
                </Space>
              )}
            </div>
          </div>

          {isDetail && (record.phone || record.email || record.contactPerson || record.salesPerson) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {record.contactPerson && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13 }}>
                  <UserOutlined style={{ color: 'rgba(255,255,255,0.55)' }} />{record.contactPerson}
                </span>
              )}
              {record.phone && (
                <a href={`tel:${record.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13, textDecoration: 'none' }}>
                  <PhoneOutlined style={{ color: 'rgba(255,255,255,0.55)' }} />{record.phone}
                </a>
              )}
              {record.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13 }}>
                  <MailOutlined style={{ color: 'rgba(255,255,255,0.55)' }} />{record.email}
                </span>
              )}
              {record.salesPerson && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13 }}>
                  <TeamOutlined style={{ color: 'rgba(255,255,255,0.55)' }} />{record.salesPerson}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats row — detail only */}
        {isDetail && (
          <Row gutter={12} style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Value', value: `₹${totalValue.toLocaleString()}`, color: '#B11E6A', icon: <CreditCardOutlined /> },
              { label: 'Products', value: `${record.products?.length || 0} items`, color: '#1890ff', icon: <ShoppingCartOutlined /> },
              { label: 'Payment', value: PAYMENT_LABELS[record.paymentTerms]?.split(' ').slice(0, 2).join(' ') || '—', color: '#fa8c16', icon: <CalendarOutlined /> },
              { label: 'Next Follow-up', value: record.followUpDate || 'Not set', color: '#52c41a', icon: <HistoryOutlined /> },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card size="small" style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: isDark ? '#1E1E2E' : `${s.color}08` }} bodyStyle={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: s.color, fontSize: 15 }}>{s.icon}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                  </div>
                  <Text strong style={{ fontSize: 15, color: s.color, display: 'block' }}>{s.value}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Form form={leadForm} layout="vertical" initialValues={isDetail ? record : undefined}>
          <Row gutter={20}>

            {/* ── Main Column ─────────────────────────────────────────── */}
            <Col xs={24} lg={16}>

              {/* Hotel / Company Info */}
              <Card
                style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={
                  <Space>
                    <div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} />
                    <BankOutlined style={{ color: '#B11E6A' }} />
                    <span>Hotel / Company Information</span>
                  </Space>
                }
              >
                {isDetail ? (
                  <Row gutter={0}>
                    <Col xs={24} sm={12} style={{ paddingRight: 16 }}>
                      <InfoRow label="Hotel Name" value={record.hotelName} />
                      <InfoRow label="Billing Name" value={record.billingName} />
                      <InfoRow label="Contact Person" value={record.contactPerson} />
                      <InfoRow label="Phone" value={record.phone} />
                      <InfoRow label="Email" value={record.email} />
                      <InfoRow label="Source" value={record.source} />
                      <InfoRow label="Sales Person" value={record.salesPerson} />
                    </Col>
                    <Col xs={24} sm={12}>
                      <InfoRow label="Location" value={record.location} />
                      <InfoRow label="Detailed Address" value={record.detailedAddress} />
                      <InfoRow label="City / State / PIN" value={[record.city, record.state, record.pincode].filter(Boolean).join(', ')} />
                      <InfoRow label="Hotel Type" value={record.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'} />
                      <InfoRow label="Bill Type" value={record.billType === 'GST' ? 'GST Bill' : 'Non-GST Bill'} />
                      <InfoRow label="GST Number" value={record.gstNumber} />
                    </Col>
                    {record.billType === 'GST' && record.gstNumber && (
                      <Col span={24} style={{ marginTop: 14 }}>
                        <div style={{ padding: '14px 16px', background: 'rgba(177,30,106,0.05)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.1)' }}>
                          <Text strong style={{ color: '#B11E6A', fontSize: 13, display: 'block', marginBottom: 10 }}>GST Details</Text>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}><InfoRow label="GSTIN" value={record.gstNumber} /></Col>
                            <Col xs={24} sm={12}><InfoRow label="PAN Number" value={record.gstNumber.substring(2, 12)} /></Col>
                          </Row>
                        </div>
                      </Col>
                    )}
                  </Row>
                ) : (
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Hotel / Company Name" name="hotelName" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Hotel Blue Star" prefix={<BankOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Billing Name (on invoice)" name="billingName">
                        <Input placeholder="e.g. HOTEL BLUESTAR" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Contact Person" name="contactPerson">
                        <Input placeholder="Reception / Manager" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Phone" name="phone" rules={[{ required: true }]}>
                        <Input placeholder="+91 XXXXX XXXXX" prefix={<PhoneOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Email" name="email">
                        <Input placeholder="optional" prefix={<MailOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Sales Person" name="salesPerson">
                        <Input placeholder="Sales person name" prefix={<TeamOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Location / City" name="location" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Coimbatore" prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Source" name="source">
                        <SelectWithAdd defaultOptions={[{ value: 'Direct', label: 'Direct' }, { value: 'Referral', label: 'Referral' }, { value: 'Google', label: 'Google' }]} placeholder="Select source" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true }]}>
                        <Input.TextArea rows={2} placeholder="Full address with landmark" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="City" name="city"><Input placeholder="City" /></Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="State" name="state"><Input placeholder="State" /></Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Pincode" name="pincode"><Input placeholder="Pincode" /></Form.Item>
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
                        <Input placeholder="GSTIN (if applicable)" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </Card>

              {/* Products */}
              <Card
                style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={
                  <Space>
                    <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                    <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                    <span>Order Details — Products</span>
                  </Space>
                }
              >
                {isDetail ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 90px', gap: '0 8px', padding: '8px 10px', background: 'rgba(177,30,106,0.05)', borderRadius: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>PRODUCT</Text>
                      <Text style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>QTY</Text>
                      <Text style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>RATE</Text>
                      <Text style={{ fontSize: 11, color: '#999', fontWeight: 600, textAlign: 'right' }}>AMOUNT</Text>
                    </div>
                    {(record.products || []).map((p, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px 90px', gap: '0 8px', padding: '10px 10px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`, alignItems: 'start' }}>
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
                          {(record.specifications || []).filter(s => s?.product === p.name).map((s, si) => (
                            <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <CheckOutlined style={{ color: '#B11E6A', fontSize: 10 }} />
                              <Text style={{ fontSize: 11, color: '#888' }}>{s.spec}{s.rate ? ` +₹${s.rate}` : ''}</Text>
                            </div>
                          ))}
                        </div>
                        <Text style={{ fontSize: 13 }}>{p.qty}</Text>
                        <Text style={{ fontSize: 13 }}>₹{p.rate}</Text>
                        <Text strong style={{ textAlign: 'right', color: '#B11E6A', fontSize: 13 }}>₹{((p.qty || 0) * (p.rate || 0)).toLocaleString()}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 10px', borderTop: '2px solid rgba(177,30,106,0.12)', marginTop: 4 }}>
                      <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>Total: ₹{totalValue.toLocaleString()}</Text>
                    </div>
                    {(record.logoNeeded || (record.specifications || []).filter(s => typeof s === 'string' || (typeof s === 'object' && !s?.product)).length > 0) && (
                      <div style={{ marginTop: 12, padding: '14px', background: 'rgba(177,30,106,0.04)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.08)' }}>
                        <Text strong style={{ color: '#B11E6A', fontSize: 13, display: 'block', marginBottom: 8 }}>Additional Specifications</Text>
                        {record.logoNeeded && <Tag color="#B11E6A" style={{ marginBottom: 6 }}>Logo Needed: {record.logoProducts || '—'}</Tag>}
                        {(record.specifications || []).filter(Boolean).filter(s => typeof s === 'string' || (typeof s === 'object' && !s.product)).map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <CheckOutlined style={{ color: '#B11E6A', fontSize: 11, marginTop: 2 }} />
                            <Text style={{ fontSize: 12, color: textColor }}>{typeof s === 'string' ? s : `${s.spec} (₹${s.rate || 0})`}</Text>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ProductHeaders />
                    <ProductFormList fieldName="products" />
                  </>
                )}
              </Card>

              {/* Specifications — add mode only */}
              {!isDetail && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <SettingOutlined style={{ color: '#722ed1' }} />
                      <span>Specifications</span>
                    </Space>
                  }
                >
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
                </Card>
              )}

              {/* Delivery & Payment */}
              <Card
                style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={
                  <Space>
                    <div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} />
                    <CarOutlined style={{ color: '#fa8c16' }} />
                    <span>Delivery & Payment</span>
                  </Space>
                }
              >
                {isDetail ? (
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <div style={{ padding: '14px 16px', background: 'rgba(250,140,22,0.06)', borderRadius: 10, border: '1px solid rgba(250,140,22,0.15)', height: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>DELIVERY INFO</Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Delivery By</Text>
                          <Text strong>{record.deliveryBy || '—'}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Transport By</Text>
                          <Text strong>{record.transportationBy || '—'}</Text>
                        </div>
                        <Tag color={record.forwardingCharge ? 'orange' : 'default'} style={{ borderRadius: 20 }}>
                          {record.forwardingCharge ? 'Forwarding Charge Applied' : 'No Forwarding Charge'}
                        </Tag>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div style={{ padding: '14px 16px', background: 'rgba(177,30,106,0.05)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.12)', height: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>PAYMENT TERMS</Text>
                        <Text strong style={{ color: '#B11E6A', fontSize: 14 }}>{PAYMENT_LABELS[record.paymentTerms] || record.paymentTerms || '—'}</Text>
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <DeliveryPaymentFields />
                )}
              </Card>

              {/* Follow-up History — detail only */}
              {isDetail && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} />
                      <HistoryOutlined style={{ color: '#52c41a' }} />
                      <span>Follow-up History & Notes</span>
                    </Space>
                  }
                  extra={<Button type="link" size="small" icon={<PlusOutlined />} style={{ color: '#B11E6A' }}>Add Note</Button>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(record.notes_history || [
                      { date: '2024-05-01', time: '10:30 AM', person: 'Priya', text: 'Initial call done. Interested in Soap 15grm.' },
                      { date: '2024-05-01', time: '02:15 PM', person: 'Priya', text: 'Sent sample photos via WhatsApp.' }
                    ]).map((note, idx) => (
                      <div key={idx} style={{
                        padding: '12px 14px',
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc',
                        borderRadius: 10,
                        borderLeft: '3px solid #B11E6A',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{note.person[0]}</span>
                            </div>
                            <Text strong style={{ fontSize: 13 }}>{note.person}</Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>{note.date} · {note.time}</Text>
                        </div>
                        <Text style={{ fontSize: 13, paddingLeft: 34, display: 'block' }}>{note.text}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <Input.TextArea placeholder="Write a note..." rows={2} style={{ flex: 1, borderRadius: 8 }} />
                      <Button type="primary" style={{ background: '#B11E6A', border: 'none', borderRadius: 8, alignSelf: 'flex-end', height: 36 }}>Post</Button>
                    </div>
                  </div>
                </Card>
              )}
            </Col>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <Col xs={24} lg={8}>

              {/* Status Card */}
              <SidebarCard accentColor="#B11E6A" icon={<StarOutlined />} title={isAddCustomer ? 'Customer Type' : 'Lead Status'}>
                {isAddCustomer ? (
                  <>
                    <Form.Item label="Hotel Type" name="hotelType" rules={[{ required: true }]}>
                      <Select placeholder="Select hotel type">
                        <Option value="OLD">Old Hotel</Option>
                        <Option value="NEW">New Hotel</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label="Bill Type" name="billType" rules={[{ required: true }]}>
                      <Select placeholder="Select bill type">
                        <Option value="GST">GST Bill</Option>
                        <Option value="NON_GST">Non-GST Bill</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label="GST Number" name="gstNumber">
                      <Input placeholder="GSTIN (if GST)" />
                    </Form.Item>
                  </>
                ) : (
                  <>
                    <Form.Item name="status" label="Status">
                      <Select disabled={isDetail} placeholder="Select status">
                        <Option value="Hot">🔴 Hot</Option>
                        <Option value="Warm">🟡 Warm</Option>
                        <Option value="Cold">🔵 Cold</Option>
                        <Option value="Interested">🟣 Interested</Option>
                        <Option value="Quotation Sent">📄 Quotation Sent</Option>
                        <Option value="Converted">✅ Converted</Option>
                      </Select>
                    </Form.Item>

                    {isDetail && record.followUpDate && (
                      <div style={{ padding: '12px', background: 'rgba(82,196,26,0.08)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)', marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', letterSpacing: 0.5 }}>NEXT FOLLOW-UP</Text>
                        <Text strong style={{ display: 'block', marginTop: 4, color: '#52c41a', fontSize: 14 }}>
                          {record.followUpDate}{record.followUpTime ? ` · ${record.followUpTime}` : ''}
                        </Text>
                        {record.followUpName && <Text style={{ fontSize: 12, color: '#666', display: 'block', marginTop: 2 }}>{record.followUpName}</Text>}
                      </div>
                    )}

                    {isAddLead && (
                      <>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item label="Follow-up Date" name="followUpDate">
                              <Input type="date" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="Follow-up Time" name="followUpTime">
                              <Input type="time" />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item label="Follow-up Task" name="followUpName">
                              <Input placeholder="e.g. Send sample, Call back" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )}
                  </>
                )}
              </SidebarCard>

              {/* Follow-up Steps — leads only */}
              {(isDetail ? record.leadId : isAddLead) && (
                <SidebarCard accentColor="#722ed1" icon={<CalendarOutlined />} title="Follow-up Progress">
                  <Steps direction="vertical" size="small" current={record.followUpStep || 0} items={LEAD_STEPS} />
                </SidebarCard>
              )}

              {/* Quick Actions — detail only */}
              {isDetail && (
                <SidebarCard accentColor="#52c41a" icon={null} title="Quick Actions">
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    <Button icon={<WhatsAppOutlined />} block size="large"
                      style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                      onClick={() => sendViaWhatsApp(record)}
                    >Send via WhatsApp</Button>
                    <Button icon={<FileTextOutlined />} block size="large"
                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                      onClick={() => startQuotationFromLead(record)}
                    >Generate Quotation</Button>
                    {record.leadId && !record.customerId && (
                      <Button icon={<ArrowRightOutlined />} block size="large"
                        style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                        onClick={() => convertToCustomer(record)}
                      >Convert to Customer</Button>
                    )}
                    <Button icon={<EditOutlined />} block
                      style={{ borderRadius: 10, height: 40 }}
                      onClick={() => openAddLead(record)}
                    >Edit Details</Button>
                  </Space>
                </SidebarCard>
              )}
            </Col>
          </Row>
        </Form>
      </motion.div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Sales Team" items={[{ label: 'Sales Team' }]} style={{ marginBottom: 0 }} />
        <Space size={8}>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Button icon={<UploadOutlined />}>Import</Button>
          <Button type="primary" icon={<PlusOutlined />}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={() => {
              setSelectedRecord(null);
              if (activeTab === 'leads') setViewMode('add-lead');
              else if (activeTab === 'customers') setViewMode('add-customer');
              else { setOrderFromQuotation(null); orderForm.resetFields(); setOrderOpen(true); }
            }}
          >
            {activeTab === 'leads' ? 'Add Lead' : activeTab === 'customers' ? 'Add Customer' : 'New Order'}
          </Button>
        </Space>
      </div>

      {/* Flow progress bar */}
      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, marginBottom: 16, boxShadow: '0 2px 12px rgba(177,30,106,0.05)' }} bodyStyle={{ padding: '14px 24px' }}>
        <Steps size="small"
          current={['leads', 'customers', 'quotations', 'negotiations', 'orders'].indexOf(activeTab)}
          onChange={(i) => setActiveTab(['leads', 'customers', 'quotations', 'negotiations', 'orders'][i])}
          style={{ cursor: 'pointer' }}
          items={[
            { title: 'Leads', description: `${leadsData.length} total` },
            { title: 'Customers', description: `${customersData.length} total` },
            { title: 'Quotations', description: `${quotationsData.length} total` },
            { title: 'Negotiations', description: `${negotiationsData.length} total` },
            { title: 'Orders', description: `${ordersData.length} total` },
          ]}
        />
      </Card>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 16px' }}
          tabBarExtraContent={
            <Space size={8}>
              <RangePicker
                style={{ width: 250, borderRadius: 8 }}
                onChange={(dates) => setDateRange(dates)}
              />
              <Select placeholder="Filter" style={{ width: 120 }}>
                <Option value="all">All</Option>
                <Option value="hot">Hot</Option>
                <Option value="warm">Warm</Option>
                <Option value="cold">Cold</Option>
              </Select>
              <Input prefix={<SearchOutlined />} placeholder="Search..." value={searchText}
                onChange={(e) => setSearchText(e.target.value)} allowClear
                style={{ width: 200, borderRadius: 8 }}
              />
            </Space>
          }
        >
          <TabPane tab="Leads" key="leads">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table
                dataSource={filtered(leadsData)}
                columns={leadColumns}
                pagination={{ pageSize: 8, size: 'small' }}
                size="small"
                rowKey="key"
                onRow={(record) => ({ onClick: () => openDetailNextScreen(record) })}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </TabPane>
          <TabPane tab="Customers" key="customers">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table
                dataSource={filtered(customersData)}
                columns={customerColumns}
                pagination={{ pageSize: 8, size: 'small' }}
                size="small"
                rowKey="key"
                onRow={(record) => ({ onClick: () => openDetailNextScreen(record) })}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </TabPane>
          <TabPane tab="Quotations" key="quotations">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table dataSource={filtered(quotationsData)} columns={quotationColumns} pagination={{ pageSize: 8, size: 'small' }} size="small" rowKey="key" />
            </div>
          </TabPane>
          <TabPane tab="Negotiations" key="negotiations">
            <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
              <Table dataSource={filtered(negotiationsData)} columns={negotiationColumns} pagination={{ pageSize: 8, size: 'small' }} size="small" rowKey="key" />
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
