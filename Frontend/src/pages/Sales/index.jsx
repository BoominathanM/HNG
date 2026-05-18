import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Tabs, Card, Table, Button, Tag, Space, Input, Select, Modal,
  Form, Row, Col, Typography, Drawer, Steps, Divider, Badge,
  InputNumber, Tooltip, Checkbox, message, Slider, Upload, Progress, DatePicker, Descriptions, Timeline, Spin,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  FileTextOutlined, PhoneOutlined, MailOutlined, UserOutlined,
  WhatsAppOutlined, MinusCircleOutlined, CheckOutlined,
  DownloadOutlined, UploadOutlined, ArrowRightOutlined,
  BankOutlined, EnvironmentOutlined, TeamOutlined, CalendarOutlined,
  ShoppingCartOutlined, SettingOutlined, CarOutlined, CreditCardOutlined,
  HistoryOutlined, StarOutlined, SaveOutlined, GiftOutlined, TrophyOutlined,
  WarningOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { addNewProductRequest } from '../../store/slices/purchaseSlice';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Text, Title } = Typography;
const { Option } = Select;
// const { RangePicker } = DatePicker;


// ─── Constants ────────────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  { value: 'BEFORE_100', label: '100% Payment' },
  { value: 'ON_DISPATCH', label: '50% Advance, 50% on Dispatch' },
  { value: '50_ADVANCE_50_AFTER', label: '50% Advance, 50% After Delivery (Max 15 days)' },
];

const PAYMENT_LABELS = {
  BEFORE_100: 'PAYMENT BEFORE 100%',
  ON_DISPATCH: 'ON THE DATE OF DISPATCH',
  '50_ADVANCE_50_AFTER': '50 ADVANCE 50% AFTER DISPATCH',
};

const STATUS_COLORS = {
  New: '#C94F8A', Interested: '#D85C9E', 'Quotation Sent': '#B11E6A', Converted: '#52c41a',
  Draft: '#aaa', Sent: '#C94F8A', Approved: '#52c41a', Rejected: '#ff4d4f',
  'In Production': '#B11E6A', 'Dispatch Ready': '#8a1652', 'Payment Pending': '#fa8c16', Completed: '#52c41a',
  'Partially Completed': '#faad14',
  Hot: '#ff4d4f', Warm: '#fa8c16', Cold: '#1890ff', 'Managers Help': '#722ed1',
  'Need manager help': '#722ed1',
  'Warm(In discussion)': '#fa8c16',
  'Hot(Going to close soon)': '#ff4d4f',
  'Cold(First Intro)': '#1890ff',
  'Quotation (Sent)': '#B11E6A',
  'Quotation (Not Sent)': '#d9d9d9',
  Negotiation: '#fa8c16',
  Invoiced: '#722ed1',
  Rejected: '#ff4d4f',
};

const LEAD_STEPS = [
  { title: 'Follow up 1', description: 'Initial Contact' },
  { title: 'Follow up 2', description: 'Requirement' },
  { title: 'Follow up 3', description: 'Sample Sent' },
  { title: 'Follow up 4', description: 'Feedback' },
  { title: 'Follow up 5', description: 'Closing' },
];

const NEG_STEPS = [
  { title: 'Initial', description: 'Quotation reviewed' },
  { title: 'Counter Offer', description: 'Terms proposed' },
  { title: 'Final Terms', description: 'Near agreement' },
  { title: 'Approved', description: 'Deal closed' },
];

const ORDER_STEPS = [
  { title: 'Confirmed', description: 'Order received' },
  { title: 'In Production', description: 'Manufacturing' },
  { title: 'Dispatch Ready', description: 'Quality checked' },
  { title: 'Dispatched', description: 'On the way' },
  { title: 'Delivered', description: 'Reached destination' },
];

const PERSONALIZATION_OPTIONS = [
  { value: 'PERSONALIZED_KIT', label: 'Personalized Kit' },
  { value: 'SEPARATE_PRODUCT', label: 'Separate Product' },
];

const DISPLAY_UNIT_OPTIONS = [
  { value: 'ZIPLOCK_POUCH', label: 'Ziplock Pouch' },
  { value: 'STICKY_POUCH', label: 'Sticky Pouch' },
  { value: 'Rexine _BAG', label: 'Rexine  Bag' },
  { value: 'TDDC_SLICE_BOX', label: 'TDDC Size Box' },
  { value: 'PVK_SIZE_BOX', label: 'PVK Size Box' },
];

const ALTERNATIVE_PERSON_OPTIONS = [
  { value: 'Finance', label: 'Finance' },
  { value: 'GM', label: 'GM' },
  { value: 'Managers', label: 'Managers' },
];

const PACKING_MATERIAL_OPTIONS = [
  { value: 'Plastic Box', label: 'Plastic Box' },
  { value: 'Paper Box', label: 'Paper Box' },
  { value: 'Pouch', label: 'Pouch' },
  { value: 'Wrapper', label: 'Wrapper' },
];

const MATERIAL_CATEGORY_OPTIONS = [
  { value: 'Eco Friendly', label: 'Eco Friendly' },
  { value: 'Plastic', label: 'Plastic' },
  { value: 'Wooden', label: 'Wooden' },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: 'Soap', label: 'Soap' },
  { value: 'Paste', label: 'Paste' },
  { value: 'Brush', label: 'Brush' },
  { value: 'Raizer', label: 'Raizer' },
  { value: 'Gel', label: 'Gel' },
  { value: 'Face Kit Combo', label: 'Face Kit Combo' },
  { value: 'Body Kit Combo', label: 'Body Kit Combo' },
];

const KIT_CATEGORIES = [
  { value: 'DENTAL_KIT', label: 'Dental Kit' },
  { value: 'SHAVING_KIT', label: 'Shaving Kit' },
  { value: 'CARE_KIT', label: 'For Your Care Kit (PVK)' },
];

const DENTAL_KIT_PRODUCTS = {
  bases: ['Box', 'Cover', 'Frosted Paper'],
  brushes: ['Plastic (Anqour)', 'Plastic (Promise)', 'Ecofriendly', 'Wooden'],
  pastes: ['Promise (8g)', 'Meshwak (8g)', 'Colgate (8g)'],
  pasteTypes: ['Tube', 'Sachet'],
};

const SHAVING_KIT_PRODUCTS = {
  bases: ['Box', 'Cover', 'Frosted Paper'],
  razors: [
    { name: 'Darco (Plastic)', cat: 'Plastic' },
    { name: 'Gillet (Plastic)', cat: 'Plastic' },
    { name: 'Darco (Biodegradable)', cat: 'Biodegradable' },
    { name: 'Gillet (Biodegradable)', cat: 'Biodegradable' },
  ],
  gels: [
    { name: 'Oxilife (Plastic)', cat: 'Plastic' },
    { name: 'Gillet (Plastic)', cat: 'Plastic' },
    { name: 'Oxilife (Biodegradable)', cat: 'Biodegradable' },
    { name: 'Gillet (Biodegradable)', cat: 'Biodegradable' },
  ],
};

const CARE_KIT_PRODUCTS = {
  bases: ['Box', 'Cover', 'Frosted Paper'],
  products: ['Medi Kit', 'Sewing Kit', 'Vanity Kit'],
};

const PERFORMANCE_TARGETS = [
  {
    key: 'old_hotel', label: 'Old Hotel Sales', target: 500000, achieved: 320000, color: '#B11E6A',
    milestones: { q1: 'Gift Card', q2: 'Smart Watch', q3: 'Bonus ₹5k', full: 'Family Vacation' }
  },
  {
    key: 'new_hotel', label: 'New Hotel Sales', target: 1000000, achieved: 450000, color: '#1890ff',
    milestones: { q1: 'Dinner Coupon', q2: 'Wireless Buds', q3: 'Bonus ₹10k', full: 'iPhone 15 Pro' }
  },
  {
    key: 'payment', label: 'Payment Target', target: 800000, achieved: 680000, color: '#52c41a',
    milestones: { q1: 'Cinema Tickets', q2: 'Shopping Voucher', q3: 'Bonus ₹7k', full: 'Luxury Weekend' }
  },
  {
    key: 'software', label: 'Software Target (New)', target: 200000, achieved: 45000, color: '#722ed1',
    milestones: { q1: 'Coffee Mug', q2: 'Power Bank', q3: 'Kindle', full: 'Tech Gadget Set' }
  },
];

const SALES_PERSONS = [
  { value: 'Priya', label: 'Priya (Sales)' },
  { value: 'Rahul', label: 'Rahul (Sales)' },
  { value: 'Lakshmi', label: 'Lakshmi (Sales)' },
  { value: 'Suresh', label: 'Suresh (Sales)' },
];

const REMINDERS_DATA = [
  { key: 1, leadId: 'LEAD-1001', type: 'Delayed Payment', customer: 'Hotel Blue Star', amount: 25000, daysDelayed: 12, salesPerson: 'Priya', reminderDate: '2024-05-06', reminderTime: '10:00 AM' },
  { key: 2, leadId: 'LEAD-1002', type: 'Follow-up', customer: 'Grand Regency', topic: 'Quotation Review', dueDate: '2024-05-05', salesPerson: 'Priya', reminderDate: '2024-05-05', reminderTime: '02:30 PM' },
  { key: 3, leadId: 'LEAD-1003', type: 'Occupancy Alert', customer: 'Sea View Stay', rooms: 80, occupancy: '85%', action: 'Check next order', salesPerson: 'Priya', reminderDate: '2024-05-07', reminderTime: '11:00 AM' },
];

const fmtDateTime = (v) =>
  v ? dayjs(v).toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtDateTimeShort = (v) =>
  v ? dayjs(v).toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// ─── Sample data ──────────────────────────────────────────────────────
const INIT_LEADS = [
  {
    key: 1, leadId: 'LEAD-1001', hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517', email: '',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', gstPercent: 18,
    status: 'Warm', followUpDate: '2024-01-20',
    salesPerson: 'Priya', source: 'Google', createdAt: '2024-01-15T10:30:00Z',
    statusHistory: [{ status: 'Warm', changedAt: '2024-01-15T10:30:00Z' }],
    products: [
      { name: 'Soap 15grm', qty: 500, rate: 3.6 }, { name: 'Single Brush', qty: 200, rate: 4 },
    ],
    forwardingCharge: true, deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: 'ON_DISPATCH',
    priority: 0, rowsInHotel: 50, generalOccupancy: 1000,
    alternativePerson: ['Managers'], alternativeName: 'John Doe', alternativePhone: '+91 94000 00001',
  },
];

const SHARED_PRODUCTS = [
  { name: 'Soap 15grm', qty: 500, rate: 3.4, specs: { logo: 'YES', sticker: 'YES', packingMaterial: 'Pouch', materialCategory: 'Eco Friendly', brand: 'HNG Care', product: 'Soap' } },
  { name: 'Single Brush', qty: 200, rate: 3.8, specs: { logo: 'NO', sticker: 'NO', packingMaterial: 'Wrapper', materialCategory: 'Plastic', brand: 'DentCare', product: 'Brush' } },
  { name: 'Shampoo 15ml', qty: 300, rate: 4.0, specs: { logo: 'YES', sticker: 'YES', packingMaterial: 'Plastic Box', materialCategory: 'Plastic', brand: 'HNG Care', product: 'Gel' } },
];

const INIT_QUOTATIONS = [
  {
    key: 1, qid: 'QT-1001', customerId: 'CUST-1001', leadKey: 1,
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', gstPercent: 18,
    salesPerson: 'Priya',
    city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001',
    detailedAddress: '12, Avinashi Road, Near Gandhipuram Bus Stand, Coimbatore - 641001',
    products: [
      { name: 'Soap 15grm', qty: 500, rate: 3.6, specs: { logo: 'YES', sticker: 'YES', packingMaterial: 'Pouch', materialCategory: 'Eco Friendly', brand: 'HNG Care', product: 'Soap' } },
      { name: 'Single Brush', qty: 200, rate: 4.0, specs: { logo: 'NO', sticker: 'NO', packingMaterial: 'Wrapper', materialCategory: 'Plastic', brand: 'DentCare', product: 'Brush' } },
      { name: 'Shampoo 15ml', qty: 300, rate: 4.25, specs: { logo: 'YES', sticker: 'YES', packingMaterial: 'Plastic Box', materialCategory: 'Plastic', brand: 'HNG Care', product: 'Gel' } },
    ],
    forwardingCharge: true, deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: 'ON_DISPATCH',
    status: 'Negotiation', flowStep: 2, date: '2024-01-18', totalAmount: 5075,
    salesPerson: 'Priya', createdAt: '2024-01-18T10:00:00Z',
    revisionHistory: [
      { version: 'v1', date: '2024-01-18', by: 'Priya', note: 'Initial quotation — Soap ₹3.6, Brush ₹4.0, Shampoo ₹4.25. Forwarding charge included.' },
      { version: 'v2', date: '2024-01-20', by: 'Priya', note: 'Customer requested rate review on Soap and Brush. Moved to Negotiation.' },
    ],
    notes: 'Logo required on Soap and Shampoo only. Forwarding charge applied at initial stage.',
  },
];

const INIT_ORDERS = [
  {
    key: 1, oid: 'ORD-2401', quotationId: 'QT-1001', negotiationId: 'NEG-1001',
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517',
    billType: 'GST', gstNumber: '33AAACC1206D1Z1', gstPercent: 18,
    paymentTerms: '50_ADVANCE_50_AFTER',
    salesPerson: 'Priya',
    products: SHARED_PRODUCTS,
    totalAmount: 4100, advance: 2050, status: 'In Production',
    date: '2024-01-25', expectedDelivery: '2024-02-10',
    forwardingCharge: false, deliveryBy: 'HNG', transportationBy: 'CLIENT',
    createdAt: '2024-01-25T10:00:00Z',
    notes: 'Advance of ₹2,050 received on 25-Jan-2024. Production commenced. Delivery expected by 10-Feb-2024.',
    orderStepFlow: 1,
  },
];

const INIT_CUSTOMERS = [
  {
    key: 1, customerId: 'CUST-1001', leadId: 'LEAD-1001',
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517', email: 'bluestar@hotel.in',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', gstPercent: 18,
    salesPerson: 'Priya', source: 'Google',
    city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001',
    detailedAddress: '12, Avinashi Road, Near Gandhipuram Bus Stand, Coimbatore - 641001',
    alternativePerson: ['Managers', 'Finance'], alternativeName: 'Jane Smith', alternativePhone: '+91 94000 00001',
    rowsInHotel: 120, generalOccupancy: 3600,
    productType: 'PERSONALIZED_KIT', displayUnit: 'ZIPLOCK_POUCH',
    products: SHARED_PRODUCTS,
    forwardingCharge: false, deliveryBy: 'HNG', transportationBy: 'CLIENT',
    paymentTerms: '50_ADVANCE_50_AFTER', paymentReminderDate: '2024-03-15',
    priority: 70, mentionPriority: 'High-value repeat customer — ensure timely delivery before March 15.',
    followUpDate: '2024-02-10', followUpTime: '10:00', followUpName: 'Check on order production status',
    followUpStep: 4,
    createdAt: '2024-01-20T14:30:00Z',
    statusHistory: [
      { status: 'Warm', changedAt: '2024-01-15T10:30:00Z' },
      { status: 'Quotation Sent', changedAt: '2024-01-18T10:00:00Z' },
      { status: 'Converted', changedAt: '2024-01-20T14:30:00Z' },
    ],
    notes_history: [
      { date: '2024-01-15', time: '10:30 AM', person: 'Priya', text: 'Initial call done. Hotel Blue Star interested in Soap 15grm and Single Brush for all 120 rooms.' },
      { date: '2024-01-17', time: '03:00 PM', person: 'Priya', text: 'Sent sample photos via WhatsApp. Customer confirmed logo requirements on Soap and Shampoo only.' },
      { date: '2024-01-19', time: '11:00 AM', person: 'Priya', text: 'Quotation QT-1001 sent. Customer reviewing pricing. Added Shampoo 15ml to the order.' },
      { date: '2024-01-20', time: '02:00 PM', person: 'Priya', text: 'Negotiation completed. Final rates agreed. Advance ₹2,050 received. Converted to customer.' },
    ],
  },
];

const INIT_NEGOTIATIONS = [
  {
    key: 1, nid: 'NEG-1001', quotationId: 'QT-1001', customerId: 'CUST-1001',
    hotelName: 'Hotel Blue Star', billingName: 'HOTEL BLUESTAR', location: 'Coimbatore',
    contactPerson: 'Reception', phone: '+91 94430 39517',
    hotelType: 'OLD', billType: 'GST', gstNumber: '33AAACC1206D1Z1', gstPercent: 18,
    salesPerson: 'Priya',
    products: SHARED_PRODUCTS,
    forwardingCharge: false, deliveryBy: 'HNG', transportationBy: 'CLIENT',
    paymentTerms: '50_ADVANCE_50_AFTER',
    status: 'Final Terms', flowStep: 2, date: '2024-01-22', totalAmount: 4100,
    createdAt: '2024-01-20T15:00:00Z',
    rounds: [
      { round: 1, date: '2024-01-18', by: 'Priya (Sales)', type: 'Quotation', totalAmount: 5075, note: 'Original quotation — Soap ₹3.6, Brush ₹4.0, Shampoo ₹4.25. Forwarding charge included.' },
      { round: 2, date: '2024-01-20', by: 'Reception (Hotel)', type: 'Counter Offer', totalAmount: 4100, note: 'Requesting rate reduction on all items. Willing to waive forwarding charge.' },
      { round: 3, date: '2024-01-22', by: 'Priya (Sales)', type: 'Final Terms', totalAmount: 4100, note: 'Rates revised: Soap ₹3.4, Brush ₹3.8, Shampoo ₹4.0. Forwarding charge waived. Payment: 50% advance.' },
    ],
    notes: 'Customer requested bulk discount. Final rates agreed after 2 rounds. Forwarding charge waived as goodwill gesture.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function prepareFormValues(data) {
  if (!data) return data;
  const processed = { ...data };
  const dateFields = [
    'followUpDate', 'orderDeliveryDate', 'quotationDate',
    'paymentReminderDate', 'date', 'expectedDelivery',
    'raisedDate', 'quotationDate'
  ];

  dateFields.forEach(field => {
    if (processed[field] && typeof processed[field] === 'string') {
      processed[field] = dayjs(processed[field]);
    }
  });

  if (processed.partialDates && Array.isArray(processed.partialDates)) {
    processed.partialDates = processed.partialDates.map(pd => ({
      ...pd,
      date: pd.date && typeof pd.date === 'string' ? dayjs(pd.date) : pd.date
    }));
  }

  if (processed.splitDates && Array.isArray(processed.splitDates)) {
    processed.splitDates = processed.splitDates.map(sd => ({
      ...sd,
      date: sd.date && typeof sd.date === 'string' ? dayjs(sd.date) : sd.date
    }));
  }

  return processed;
}

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

// ─── SelectWithAdd — dropdown with inline add ──────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────
function ProductItem({ field, index, remove, disabled, fieldName, showSpecs, isDark }) {
  const { name, key, ...rest } = field;
  const isKit = Form.useWatch([fieldName, name, 'isKit']);
  const kitType = Form.useWatch([fieldName, name, 'kitType']);
  const qty = Form.useWatch([fieldName, name, 'qty']);
  const rate = Form.useWatch([fieldName, name, 'rate']);

  const form = Form.useFormInstance();
  const initQty = form?.getFieldValue([fieldName, name, 'qty']);
  const initRate = form?.getFieldValue([fieldName, name, 'rate']);
  const [isLocalEdit, setIsLocalEdit] = React.useState(initQty === undefined && initRate === undefined);
  const isItemDisabled = disabled || !isLocalEdit;

  return (
    <div
      key={key}
      style={{
        marginBottom: 16,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(177,30,106,0.12)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: isDark ? '#1a1a2e' : '#fff',
      }}
    >
      {/* Card Header (Editable) */}
      <div style={{
        background: isDark ? 'rgba(177,30,106,0.1)' : 'rgba(177,30,106,0.04)',
        padding: '12px 16px',
      }}>
        <Row gutter={[12, 12]} align="middle">
          {/* Index Circle */}
          <Col flex="none">
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{index + 1}</span>
            </div>
          </Col>

          {/* Name / Kit Type Select */}
          <Col flex="none" style={{ width: 220 }}>
            <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>PRODUCT</Text>
            {!isKit ? (
              <Form.Item {...rest} name={[name, 'name']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={PRODUCT_TYPE_OPTIONS} placeholder="Select Product" disabled={isItemDisabled} size="small" />
              </Form.Item>
            ) : (
              <Form.Item {...rest} name={[name, 'kitType']} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={KIT_CATEGORIES} placeholder="Select Kit Type" disabled={isItemDisabled} size="small" />
              </Form.Item>
            )}
          </Col>

          {/* Qty, Rate, GST & Sticker/Printing */}
          <Col flex="auto">
            <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>QTY / RATE / GST / STICKER/PRINTING</Text>
            <Row gutter={8}>
              <Col span={5}>
                <Form.Item {...rest} name={[name, 'qty']} rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Qty" style={{ width: '100%' }} min={0} disabled={isItemDisabled} size="small" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item {...rest} name={[name, 'rate']} rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={0} step={0.01} disabled={isItemDisabled} size="small" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item {...rest} name={[name, 'gst']} style={{ marginBottom: 0 }}>
                  <InputNumber placeholder="GST %" style={{ width: '100%' }} min={0} disabled={isItemDisabled} size="small" />
                </Form.Item>
              </Col>
              <Col span={7}>
                <Form.Item {...rest} name={[name, 'sticker']} style={{ marginBottom: 0 }}>
                  <Select size="small" placeholder="Sticker/Printing" disabled={isItemDisabled}>
                    <Option value="YES">Yes</Option>
                    <Option value="NO">No</Option>
                    <Option value="PRINTING">Printing</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Col>

          {/* Subtotal Display */}
          <Col flex="none" style={{ textAlign: 'right', minWidth: 100 }}>
            <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>SUBTOTAL</Text>
            <Text strong style={{ display: 'block', fontSize: 16, color: '#B11E6A', lineHeight: 1.2 }}>
              ₹{((qty || 0) * (rate || 0)).toLocaleString()}
            </Text>
          </Col>

          {/* Action Buttons */}
          {!disabled && (
            <Col flex="none">
              <Space>
                {!isLocalEdit ? (
                  <Button type="text" icon={<EditOutlined />} onClick={() => setIsLocalEdit(true)} size="small" />
                ) : (
                  <Button type="text" icon={<CheckOutlined />} onClick={() => setIsLocalEdit(false)} size="small" style={{ color: '#52c41a' }} />
                )}
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} size="small" />
              </Space>
            </Col>
          )}
        </Row>
      </div>

      {/* Specifications / Kit Options (Sub-section) */}
      {(isKit || showSpecs) && (
        <div style={{ padding: '16px 20px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.1)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888' }}>SPECIFICATIONS</Text>
            {isKit && <Tag color="magenta" style={{ fontSize: 10, borderRadius: 4 }}>KIT MODE</Tag>}
          </div>

          <Row gutter={[16, 16]}>
            {/* Row 1: Display Unit, Logo, Sticker / Printing, Packing Material */}
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'unit']} label={<span style={{ fontSize: 11 }}>Display Unit</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={DISPLAY_UNIT_OPTIONS} placeholder="Unit" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'logo']} label={<span style={{ fontSize: 11 }}>Logo</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={[{ value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }]} placeholder="Logo?" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'sticker']} label={<span style={{ fontSize: 11 }}>Sticker / Printing</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={[{ value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }, { value: 'PRINTING', label: 'Printing' }]} placeholder="Sticker / Printing?" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>

            {/* Row 2: Packing Material, Material Category, Brand, Product */}
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'packingMaterial']} label={<span style={{ fontSize: 11 }}>Packing Material</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={PACKING_MATERIAL_OPTIONS} placeholder="Select / Add" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'materialCategory']} label={<span style={{ fontSize: 11 }}>Material Category</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={MATERIAL_CATEGORY_OPTIONS} placeholder="Eco / Plastic / Wooden" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'brand']} label={<span style={{ fontSize: 11 }}>Brand</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={[]} placeholder="Select / Add brand" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'productType']} label={<span style={{ fontSize: 11 }}>Product</span>} rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={[]} placeholder="Select / Add product" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </Col>

            {/* Row 3: Other Specs */}
            <Col xs={24} sm={6}>
              <Form.Item {...rest} name={[name, 'otherSpecs']} label={<span style={{ fontSize: 11 }}>Other Specs</span>} style={{ marginBottom: 0 }}>
                <Input placeholder="e.g. Special handle" size="small" disabled={isItemDisabled} />
              </Form.Item>
            </Col>

            {isKit && (
              <Col xs={24}>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9f9f9', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.03)' }}>
                  <Text strong style={{ fontSize: 11, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Kit Contents:</Text>
                  {kitType === 'DENTAL_KIT' && (
                    <Row gutter={8}>
                      <Col span={8}><Form.Item {...rest} name={[name, 'brush']} style={{ marginBottom: 0 }}><Select placeholder="Brush" size="small" disabled={isItemDisabled}>{DENTAL_KIT_PRODUCTS.brushes.map(b => <Option key={b} value={b}>{b}</Option>)}</Select></Form.Item></Col>
                      <Col span={8}><Form.Item {...rest} name={[name, 'paste']} style={{ marginBottom: 0 }}><Select placeholder="Paste" size="small" disabled={isItemDisabled}>{DENTAL_KIT_PRODUCTS.pastes.map(p => <Option key={p} value={p}>{p}</Option>)}</Select></Form.Item></Col>
                      <Col span={8}><Form.Item {...rest} name={[name, 'pasteType']} style={{ marginBottom: 0 }}><Select placeholder="Type" size="small" disabled={isItemDisabled}>{DENTAL_KIT_PRODUCTS.pasteTypes.map(t => <Option key={t} value={t}>{t}</Option>)}</Select></Form.Item></Col>
                    </Row>
                  )}
                  {kitType === 'SHAVING_KIT' && (
                    <Row gutter={8}>
                      <Col span={12}><Form.Item {...rest} name={[name, 'razor']} style={{ marginBottom: 0 }}><Select placeholder="Razor" size="small" disabled={isItemDisabled}>{SHAVING_KIT_PRODUCTS.razors.map(r => <Option key={r.name} value={r.name}>{r.name}</Option>)}</Select></Form.Item></Col>
                      <Col span={12}><Form.Item {...rest} name={[name, 'gel']} style={{ marginBottom: 0 }}><Select placeholder="Gel" size="small" disabled={isItemDisabled}>{SHAVING_KIT_PRODUCTS.gels.map(g => <Option key={g.name} value={g.name}>{g.name}</Option>)}</Select></Form.Item></Col>
                    </Row>
                  )}
                  {kitType === 'CARE_KIT' && (
                    <Form.Item {...rest} name={[name, 'careProducts']} style={{ marginBottom: 0 }}>
                      <Select mode="multiple" placeholder="Select Products" size="small" disabled={isItemDisabled}>{CARE_KIT_PRODUCTS.products.map(p => <Option key={p} value={p}>{p}</Option>)}</Select>
                    </Form.Item>
                  )}
                </div>
              </Col>
            )}

          </Row>
        </div>
      )}
    </div>
  );
}

function ProductFormList({ fieldName = 'products', disabled = false, showSpecs = false }) {
  const isDark = useSelector((s) => s.theme.isDark);
  return (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <>
          {fields.map((field, index) => (
            <ProductItem
              key={field.key}
              field={field}
              index={index}
              remove={remove}
              disabled={disabled}
              fieldName={fieldName}
              showSpecs={showSpecs}
              isDark={isDark}
            />
          ))}
          {!disabled && (
            <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined })} icon={<PlusOutlined />} block
              style={{ borderRadius: 10, height: 45, borderDashOffset: 4 }}>
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

function DeliveryPaymentFields({ disabled = false, showUpload = false }) {
  const isDark = useSelector((s) => s.theme.isDark);
  const paymentTerms = Form.useWatch('paymentTerms');
  const is5050 = paymentTerms === '50_ADVANCE_50_AFTER';

  return (
    <Row gutter={12}>
      <Col xs={24} sm={12}>
        <Form.Item label="Delivery By" name="deliveryBy" initialValue="HNG">
          <SelectWithAdd defaultOptions={[{ value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Transport Cost Scope" name="transportationBy">
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
        {!disabled && (
          <Form.Item name="paymentTermsReminder" valuePropName="checked" style={{ marginTop: -8, marginBottom: 0 }}>
            <Checkbox>Set reminder for payment terms</Checkbox>
          </Form.Item>
        )}
      </Col>

      {/* Date picker for 50 Advance 50% After Dispatch */}
      {is5050 && !disabled && (
        <Col xs={24} sm={12}>
          <Form.Item
            label="Payment Reminder Date (50% balance)"
            name="paymentReminderDate"
            rules={[{ required: true, message: 'Select a reminder date for the balance payment' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      )}
      {is5050 && disabled && (
        <Col xs={24} sm={12}>
          <Form.Item label="Payment Reminder Date" name="paymentReminderDate">
            <DatePicker style={{ width: '100%' }} disabled />
          </Form.Item>
        </Col>
      )}

      {/* Payment proof upload — customer edit only */}
      {showUpload && !disabled && (
        <Col xs={24}>
          <Form.Item
            label="Payment Proof"
            name="paymentProofs"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          >
            <Upload
              multiple
              listType="picture"
              beforeUpload={() => false}
              accept="image/*,.pdf"
            >
              <Button icon={<UploadOutlined />}>Upload Payment Proof (multiple files allowed)</Button>
            </Upload>
          </Form.Item>
        </Col>
      )}
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
const KNOWN_PRODUCT_NAMES = new Set([
  'Soap', 'Paste', 'Brush', 'Raizer', 'Gel', 'Face Kit Combo', 'Body Kit Combo',
  'Soap 15grm', 'Single Brush', 'Shampoo 15ml',
  'DENTAL_KIT', 'SHAVING_KIT', 'CARE_KIT',
]);

export default function Sales() {
  const isDark = useSelector((s) => s.theme.isDark);
  const dispatch = useDispatch();
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [leadsData, setLeadsData] = useState(INIT_LEADS);
  const [customersData, setCustomersData] = useState(INIT_CUSTOMERS);
  const [quotationsData, setQuotationsData] = useState(INIT_QUOTATIONS);
  const [negotiationsData, setNegotiationsData] = useState(INIT_NEGOTIATIONS);
  const [ordersData, setOrdersData] = useState(INIT_ORDERS);
  const [activeTab, setActiveTab] = useState('performance');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Complaint state
  const [complaintsData, setComplaintsData] = useState([
    { key: 1, orderId: 'ORD-2401', hotelName: 'Hotel Blue Star', description: 'Delay in delivery', raisedAt: '2024-05-01T10:00:00Z', salesPerson: 'Priya', status: 'Open' },
    { key: 2, orderId: 'ORD-2402', hotelName: 'Marriott Mumbai', description: 'Missing items in package', raisedAt: '2024-05-03T14:30:00Z', salesPerson: 'Rahul', status: 'Resolved' },
  ]);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintOrder, setComplaintOrder] = useState(null);
  const [complaintForm] = Form.useForm();

  // Lead state
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm] = Form.useForm();
  const [editingSection, setEditingSection] = useState(null);

  // Quotation state
  const [quotationFromLead, setQuotationFromLead] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [quotationForm] = Form.useForm();

  // Negotiation state
  const [negotiationForm] = Form.useForm();
  const [editingNegotiation, setEditingNegotiation] = useState(null);

  // Order state
  const [orderFromQuotation, setOrderFromQuotation] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderForm] = Form.useForm();

  // Watched values for conditional rendering
  const watchedBillType = Form.useWatch('billType', leadForm);
  const watchedProductType = Form.useWatch('productType', leadForm);
  const watchedPriority = Form.useWatch('priority', leadForm);
  const watchedStatus = Form.useWatch('status', leadForm);
  const watchedSoftwareInterest = Form.useWatch('interestedInSoftware', leadForm);
  const watchedOrderProducts = Form.useWatch('products', orderForm);
  const watchedLeadProducts = Form.useWatch('products', leadForm);

  const [gstApiData, setGstApiData] = useState(null);
  const [gstApiLoading, setGstApiLoading] = useState(false);
  const [gstApiError, setGstApiError] = useState(null);

  const fetchGstDetails = async (gstin) => {
    if (!gstin) return;
    setGstApiLoading(true);
    setGstApiData(null);
    setGstApiError(null);
    try {
      const res = await fetch(`https://api.gst-return-status.app/taxpayerApi/search/${gstin}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGstApiData(json.taxpayerInfo || json);
    } catch (err) {
      setGstApiError('Unable to fetch GST details. Please verify GSTIN manually.');
    } finally {
      setGstApiLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'order-detail' && selectedRecord?.gstNumber) {
      fetchGstDetails(selectedRecord.gstNumber);
    } else {
      setGstApiData(null);
      setGstApiError(null);
    }
  }, [viewMode, selectedRecord?.gstNumber]);

  const newLeadDefaults = {
    hotelType: 'OLD', billType: 'GST', forwardingCharge: false,
    deliveryBy: 'HNG', transportationBy: 'CLIENT', paymentTerms: 'BEFORE_100',
    logoNeeded: false,
    products: [{ name: '', qty: undefined, rate: undefined }],
    specifications: [],
    priority: 0,
    productType: undefined,
  };

  const openDetailNextScreen = (record) => {
    setEditingLead(null);
    setSelectedRecord(record);
    setEditingSection(null);
    leadForm.resetFields();
    leadForm.setFieldsValue(prepareFormValues(record));
    setViewMode('detail');
  };

  // ─── Lead handlers ────────────────────────────────────────────────
  const openAddLead = (lead = null) => {
    setEditingLead(lead);
    setSelectedRecord(lead);
    leadForm.resetFields();
    const defaults = lead ? { ...lead } : newLeadDefaults;
    leadForm.setFieldsValue(prepareFormValues(defaults));
    setViewMode(lead?.customerId ? 'add-customer' : 'add-lead');
  };

  const saveLead = async () => {
    try {
      const values = await leadForm.validateFields();
      const now = new Date().toISOString();
      if (editingLead) {
        const prevStatus = editingLead.status;
        const statusChanged = values.status && values.status !== prevStatus;
        const updated = {
          ...editingLead,
          ...values,
          statusHistory: statusChanged
            ? [...(editingLead.statusHistory || []), { status: values.status, changedAt: now }]
            : (editingLead.statusHistory || []),
        };
        if (editingLead.customerId) {
          setCustomersData(prev => prev.map(c => c.key === editingLead.key ? updated : c));
          message.success('Customer updated');
        } else {
          setLeadsData(prev => prev.map(l => l.key === editingLead.key ? updated : l));
          message.success('Lead updated');
        }
        setEditingLead(null);
        setSelectedRecord(null);
        setViewMode('table');
      } else {
        const newKey = Date.now();
        const initialStatus = values.status || 'Warm';
        const newLead = {
          key: newKey,
          leadId: `LEAD-${1000 + leadsData.length + 1}`,
          status: initialStatus,
          createdAt: now,
          salesPerson: values.salesPerson || 'Current User',
          statusHistory: [{ status: initialStatus, changedAt: now }],
          ...values,
        };
        setLeadsData(prev => [...prev, newLead]);
        setEditingLead(null);
        setSelectedRecord(null);
        setViewMode('table');
      }
    } catch (_) { }
  };

  const saveSectionEdit = (section) => {
    const now = new Date().toISOString();
    const fieldsBySection = {
      hotel: ['hotelName', 'rowsInHotel', 'generalOccupancy', 'hotelType', 'billingName', 'contactPerson', 'pocDesignation', 'phone', 'alternativeRole', 'alternativeName', 'alternativePhone', 'email', 'location', 'salesPerson', 'source', 'priority', 'mentionPriority', 'interestedInSoftware', 'previousSoftware', 'previousSoftwarePrice', 'softwareExpiryDate'],
      billing: ['detailedAddress', 'city', 'state', 'pincode', 'billType', 'gstNumber', 'gstPercent'],
      leadStatus: ['status', 'quotationNo', 'quotationDate', 'followUpDate', 'followUpTime', 'followUpName'],
      leadJourney: ['followUpStep'],
      personalization: ['productType', 'displayUnit'],
      delivery: ['orderDeliveryDate', 'splitDates', 'forwardingCharge', 'deliveryBy', 'transportationBy', 'paymentTerms', 'paymentReminderDate', 'paymentProofs'],
    };
    const values = leadForm.getFieldsValue(fieldsBySection[section]);
    const updated = { ...selectedRecord, ...values };
    if (section === 'leadStatus' && values.status && values.status !== selectedRecord.status) {
      updated.statusHistory = [...(selectedRecord.statusHistory || []), { status: values.status, changedAt: now }];
    }
    setSelectedRecord(updated);
    if (updated.customerId) {
      setCustomersData(prev => prev.map(c => c.key === updated.key ? updated : c));
    } else if (updated.leadId) {
      setLeadsData(prev => prev.map(l => l.key === updated.key ? updated : l));
    }
    setEditingSection(null);
    message.success('Section updated successfully');
  };

  const saveDraft = (lead) => {
    const now = new Date().toISOString();
    setLeadsData(prev => prev.map(l =>
      l.key === lead.key
        ? {
          ...l,
          status: 'Draft',
          statusHistory: [...(l.statusHistory || []), { status: 'Draft', changedAt: now }],
        }
        : l
    ));
    message.info('Lead saved as Draft');
  };



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

  const convertLeadToNegotiation = (lead) => {
    const newNeg = {
      key: Date.now(),
      nid: `NEG-${1000 + negotiationsData.length + 1}`,
      leadId: lead.leadId,
      quotationId: null,
      customerId: null,
      hotelName: lead.hotelName, billingName: lead.billingName, location: lead.location,
      contactPerson: lead.contactPerson, phone: lead.phone,
      hotelType: lead.hotelType, billType: lead.billType, gstNumber: lead.gstNumber, gstPercent: lead.gstPercent,
      salesPerson: lead.salesPerson,
      products: (lead.products || []).map(p => ({ ...p })),
      forwardingCharge: lead.forwardingCharge, deliveryBy: lead.deliveryBy, transportationBy: lead.transportationBy,
      paymentTerms: lead.paymentTerms,
      status: 'Initial', flowStep: 0,
      date: new Date().toISOString().split('T')[0],
      totalAmount: calcTotal(lead.products),
      createdAt: new Date().toISOString(),
      rounds: [
        {
          round: 1,
          date: new Date().toISOString().split('T')[0],
          by: lead.salesPerson || 'Sales',
          type: 'Initial',
          totalAmount: calcTotal(lead.products),
          note: `Negotiation initiated from lead ${lead.leadId}. Products and initial rates as per lead discussion.`,
        },
      ],
    };
    setNegotiationsData(prev => [...prev, newNeg]);
    message.success(`${lead.hotelName} converted to Negotiation (${newNeg.nid})`);
    setActiveTab('quotations');
    setViewMode('table');
  };

  const startQuotationFromLead = (lead) => {
    setEditingQuotation(null);
    setQuotationFromLead(lead);
    quotationForm.resetFields();
    quotationForm.setFieldsValue(prepareFormValues(lead));
    setViewMode('quotation-form');
  };

  // ─── Quotation handlers ───────────────────────────────────────────
  const saveQuotation = async () => {
    try {
      const values = await quotationForm.validateFields();
      const total = calcTotal(values.products);
      const now = new Date().toISOString().split('T')[0];
      if (editingQuotation) {
        const updated = {
          ...editingQuotation,
          ...values,
          totalAmount: total,
          revisionHistory: [
            ...(editingQuotation.revisionHistory || []),
            { version: `v${(editingQuotation.revisionHistory?.length || 0) + 1}`, date: now, by: 'Sales Team', note: 'Products / terms updated' },
          ],
        };
        setQuotationsData(prev => prev.map(q => q.key === editingQuotation.key ? updated : q));
        setSelectedRecord(updated);
        message.success('Quotation updated');
        setEditingQuotation(null);
      } else {
        const newQ = {
          key: Date.now(),
          qid: `QT-${1000 + quotationsData.length + 1}`,
          leadKey: quotationFromLead?.key,
          customerId: quotationFromLead?.customerId,
          status: 'Draft', flowStep: 0,
          date: now, totalAmount: total,
          createdAt: new Date().toISOString(),
          salesPerson: quotationFromLead?.salesPerson || 'Current User',
          revisionHistory: [{ version: 'v1', date: now, by: quotationFromLead?.salesPerson || 'Sales', note: 'Initial quotation created' }],
          ...values,
        };
        setQuotationsData(prev => [...prev, newQ]);
        if (quotationFromLead) {
          setLeadsData(prev => prev.map(l => l.key === quotationFromLead.key ? { ...l, status: 'Quotation Sent' } : l));
        }
        // Auto-create purchase requests for new products not in standard catalog
        (values.products || []).forEach(p => {
          const pName = p?.name || p?.kitType;
          if (pName && !KNOWN_PRODUCT_NAMES.has(pName)) {
            dispatch(addNewProductRequest({
              productName: pName,
              qty: p.qty || 0,
              fromOrder: newQ.qid,
              hotelName: values.hotelName || quotationFromLead?.hotelName || '',
              salesPerson: newQ.salesPerson,
            }));
          }
        });
        setQuotationFromLead(null);
        setActiveTab('quotations');
        message.success('Quotation created');
      }
      setViewMode('table');
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

  const convertToInvoice = (q) => {
    const newOrder = {
      key: Date.now(),
      oid: `ORD-${2400 + ordersData.length + 1}`,
      invId: `INV-${3000 + ordersData.length + 1}`,
      quotationId: q.qid,
      negotiationId: q.nid,
      status: 'Payment Pending',
      date: new Date().toISOString().split('T')[0],
      totalAmount: q.totalAmount || calcTotal(q.products),
      createdAt: new Date().toISOString(),
      salesPerson: q.salesPerson || 'Current User',
      hotelName: q.hotelName, billingName: q.billingName, location: q.location,
      detailedAddress: q.detailedAddress, city: q.city, state: q.state, pincode: q.pincode,
      billType: q.billType, paymentTerms: q.paymentTerms,
      products: q.products, advance: 0,
    };
    setOrdersData(prev => [...prev, newOrder]);
    if (q.qid) {
      setQuotationsData(prev => prev.map(qt => qt.key === q.key ? { ...qt, status: 'Invoiced' } : qt));
    }
    if (q.nid) {
      setNegotiationsData(prev => prev.map(n => n.key === q.key ? { ...n, status: 'Invoiced' } : n));
    }
    message.success('Converted to Invoice successfully! Order is now pending payment.');
    setActiveTab('orders');
    setViewMode('table');
  };

  const recordPayment = (order) => {
    setOrdersData(prev => prev.map(o => o.key === order.key ? { ...o, status: 'In Production', advance: o.totalAmount } : o));
    message.success('Payment recorded and Order is now in production!');
  };

  const convertOrderToInvoice = (order) => {
    const invId = `INV-${3000 + ordersData.length + 1}`;
    setOrdersData(prev => prev.map(o => o.key === order.key ? { ...o, invId, status: 'Payment Pending' } : o));
    message.success('Invoice generated successfully! Order is now pending payment.');
  };

  const startOrderFromQuotation = (q) => {
    const newOrder = {
      key: Date.now(),
      oid: `ORD-${2400 + ordersData.length + 1}`,
      quotationId: q.qid,
      status: 'In Production',
      date: new Date().toISOString().split('T')[0],
      totalAmount: q.totalAmount || calcTotal(q.products),
      createdAt: new Date().toISOString(),
      salesPerson: q.salesPerson || 'Current User',
      hotelName: q.hotelName, billingName: q.billingName, location: q.location,
      detailedAddress: q.detailedAddress, city: q.city, state: q.state, pincode: q.pincode,
      billType: q.billType, paymentTerms: q.paymentTerms,
      products: q.products, advance: 0,
    };
    setOrdersData(prev => [...prev, newOrder]);
    setQuotationsData(prev => prev.map(qt => qt.key === q.key ? { ...qt, status: 'Approved' } : qt));
    setNegotiationsData(prev => prev.map(n => n.quotationId === q.qid ? { ...n, status: 'Approved' } : n));
    message.success('Order confirmed successfully!');
    setActiveTab('orders');
    setViewMode('table');
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
        setNegotiationsData(prev => prev.map(n => n.key === orderFromQuotation.key ? { ...n, status: 'Approved' } : n));
      }
      message.success('Order confirmed!');
      setViewMode('table');
      setActiveTab('orders');
    } catch (_) { }
  };

  // ─── Complaint handlers ───────────────────────────────────────────
  const openComplaintModal = (order) => {
    setComplaintOrder(order || null);
    complaintForm.resetFields();
    complaintForm.setFieldsValue({
      raisedDate: dayjs(),
      raisedTime: dayjs().format('HH:mm'),
      ...(order ? { orderId: order.oid } : {}),
    });
    setComplaintModalOpen(true);
  };

  const submitComplaint = () => {
    complaintForm.validateFields().then(vals => {
      const { raisedDate, raisedTime, orderId, ...rest } = vals;
      let finalRaisedAt = dayjs().toISOString();
      if (raisedDate && raisedTime) {
        const [h, m] = raisedTime.split(':').map(Number);
        finalRaisedAt = dayjs(raisedDate).hour(h).minute(m).second(0).toISOString();
      }
      const resolvedOrderId = complaintOrder?.oid || orderId;
      const resolvedOrder = complaintOrder || ordersData.find(o => o.oid === resolvedOrderId);
      const newComplaint = {
        key: Date.now(),
        orderId: resolvedOrderId,
        hotelName: resolvedOrder?.hotelName || '—',
        salesPerson: resolvedOrder?.salesPerson || '—',
        raisedAt: finalRaisedAt,
        ...rest,
        status: 'Open',
      };
      setComplaintsData(prev => [...prev, newComplaint]);
      message.success('Complaint raised successfully');
      setComplaintModalOpen(false);
      complaintForm.resetFields();
    });
  };

  // ─── Detail view openers ──────────────────────────────────────────
  const openQuotationDetail = (q) => {
    setSelectedRecord(q);
    setViewMode('quotation-detail');
  };
  const openNegotiationDetail = (n) => { setSelectedRecord(n); setViewMode('negotiation-detail'); };
  const openOrderDetail = (o) => { setSelectedRecord(o); setViewMode('order-detail'); };

  const editExistingQuotation = (q) => {
    setEditingQuotation(q);
    quotationForm.resetFields();
    quotationForm.setFieldsValue(prepareFormValues(q));
    setViewMode('quotation-form');
  };

  const convertToNegotiation = (q) => {
    const newNeg = {
      key: Date.now(),
      nid: `NEG-${1000 + negotiationsData.length + 1}`,
      quotationId: q.qid, customerId: q.customerId,
      hotelName: q.hotelName, billingName: q.billingName, location: q.location,
      contactPerson: q.contactPerson, phone: q.phone,
      hotelType: q.hotelType, billType: q.billType, gstNumber: q.gstNumber, gstPercent: q.gstPercent,
      salesPerson: q.salesPerson,
      products: (q.products || []).map(p => ({ ...p })),
      forwardingCharge: q.forwardingCharge, deliveryBy: q.deliveryBy, transportationBy: q.transportationBy,
      paymentTerms: q.paymentTerms,
      status: 'Initial', flowStep: 0,
      date: new Date().toISOString().split('T')[0],
      totalAmount: calcTotal(q.products),
      createdAt: new Date().toISOString(),
      rounds: [{ round: 1, date: q.date, by: q.salesPerson || 'Sales', type: 'Quotation', totalAmount: calcTotal(q.products), note: 'Moved from quotation to negotiation stage.' }],
      notes: '',
    };
    setNegotiationsData(prev => [...prev, newNeg]);
    setQuotationsData(prev => prev.map(qt => qt.key === q.key ? { ...qt, status: 'Negotiation', flowStep: 2 } : qt));
    message.success('Moved to Negotiation');
    setViewMode('table');
    setActiveTab('quotations');
  };

  const editNegotiation = (n) => {
    setEditingNegotiation(n);
    negotiationForm.resetFields();
    negotiationForm.setFieldsValue({ ...prepareFormValues(n), negotiationNote: '' });
    setViewMode('negotiation-form');
  };

  const saveNegotiation = async () => {
    try {
      const values = await negotiationForm.validateFields();
      const total = calcTotal(values.products);
      const updated = {
        ...editingNegotiation,
        ...values,
        totalAmount: total,
        flowStep: Math.min((editingNegotiation.flowStep || 0) + 1, 3),
        status: ['Initial', 'Counter Offer', 'Final Terms', 'Approved'][(editingNegotiation.flowStep || 0) + 1] || 'Final Terms',
        rounds: [
          ...(editingNegotiation.rounds || []),
          {
            round: (editingNegotiation.rounds?.length || 0) + 1,
            date: new Date().toISOString().split('T')[0],
            by: 'Sales Team',
            type: 'Counter Offer',
            totalAmount: total,
            note: values.negotiationNote || 'Terms updated',
          },
        ],
      };
      setNegotiationsData(prev => prev.map(n => n.key === editingNegotiation.key ? updated : n));
      setSelectedRecord(updated);
      message.success('Negotiation updated');
      setViewMode('table');
      setActiveTab('quotations');
      setEditingNegotiation(null);
    } catch (_) { }
  };

  const convertNegotiationToOrder = (n) => {
    const newOrder = {
      key: Date.now(),
      oid: `ORD-${2400 + ordersData.length + 1}`,
      quotationId: n.quotationId,
      negotiationId: n.nid,
      status: 'In Production',
      date: new Date().toISOString().split('T')[0],
      totalAmount: n.totalAmount || calcTotal(n.products),
      createdAt: new Date().toISOString(),
      salesPerson: n.salesPerson || 'Current User',
      hotelName: n.hotelName, billingName: n.billingName, location: n.location,
      detailedAddress: n.detailedAddress, city: n.city, state: n.state, pincode: n.pincode,
      billType: n.billType, paymentTerms: n.paymentTerms,
      products: n.products, advance: 0,
    };
    setOrdersData(prev => [...prev, newOrder]);
    setNegotiationsData(prev => prev.map(neg => neg.key === n.key ? { ...neg, status: 'Approved' } : neg));
    setQuotationsData(prev => prev.map(qt => qt.qid === n.quotationId ? { ...qt, status: 'Approved' } : qt));
    message.success('Order confirmed successfully!');
    setActiveTab('orders');
    setViewMode('table');
  };

  // ─── Table columns ────────────────────────────────────────────────
  const leadColumns = [
    {
      title: 'Lead ID', dataIndex: 'leadId', width: 105,
      render: (v) => <Text strong style={{ color: '#B11E6A', fontFamily: 'monospace', fontSize: 13 }}>{v || '—'}</Text>,
    },
    {
      title: 'Hotel / Company', dataIndex: 'hotelName', width: 175,
      render: (v) => <Text strong style={{ color: textColor, fontSize: 13 }}>{v}</Text>,
    },
    { title: 'Source', dataIndex: 'source', width: 110, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 115, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    { title: 'Follow Up Name', dataIndex: 'followUpName', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Follow Up Date/Time', dataIndex: 'followUpDate', width: 165,
      render: (v, r) => <Text style={{ fontSize: 13 }}>{v ? `${v} ${r.followUpTime || ''}` : '—'}</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v] || '#ccc'} style={{ fontSize: 13 }}>{v}</Tag>
    },
    {
      title: 'Created At', dataIndex: 'createdAt', width: 140,
      render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTimeShort(v)}</Text>,
    },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Detail">
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openDetailNextScreen(r); }} />
          </Tooltip>
          <Tooltip title="Save as Draft">
            <Button size="small" icon={<SaveOutlined />} style={{ color: '#aaa', borderColor: '#d9d9d9' }}
              onClick={(e) => { e.stopPropagation(); saveDraft(r); }} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openAddLead(r); }} />
          </Tooltip>
          <Tooltip title="Convert to Quotation">
            <Button size="small" style={{ background: '#B11E6A', color: '#fff', border: 'none', fontSize: 13 }}
              onClick={(e) => { e.stopPropagation(); startQuotationFromLead(r); }}>→ Quotation</Button>
          </Tooltip>
          <Tooltip title="Convert to Negotiation">
            <Button size="small" style={{ background: '#722ed1', color: '#fff', border: 'none', fontSize: 13 }}
              onClick={(e) => { e.stopPropagation(); convertLeadToNegotiation(r); }}>→ Negotiation</Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const customerColumns = [
    { title: 'Customer ID', dataIndex: 'customerId', width: 115, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Hotel / Company', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Phone', dataIndex: 'phone', width: 130, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Created At', dataIndex: 'createdAt', width: 145, render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTimeShort(v)}</Text> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Detail"><Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openDetailNextScreen(r); }} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openAddLead(r); }} /></Tooltip>
          <Tooltip title="Get Order & Send Quotation">
            <Button size="small" icon={<FileTextOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }}
              onClick={(e) => { e.stopPropagation(); startQuotationFromLead(r); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const negotiationColumns = [
    { title: 'Hotel', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <Tag color={STATUS_COLORS[v] || 'orange'} style={{ fontSize: 13 }}>{v}</Tag> },
    { title: 'Created At', dataIndex: 'createdAt', width: 145, render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTimeShort(v)}</Text> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRecord(r); setViewMode('negotiation-detail'); }} /></Tooltip>
          <Tooltip title="Convert to Order">
            <Button size="small" style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => convertNegotiationToOrder(r)}>
              → Order
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const quotationColumns = [
    { title: 'Quote ID', dataIndex: 'qid', width: 105, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Hotel', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'GST Number', dataIndex: 'gstNumber', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Items / Amount', key: 'amt', width: 140, responsive: ['sm'],
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 13 }}>{r.products?.length || 0} items</Text><br />
          <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{(r.totalAmount || calcTotal(r.products)).toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: 'Bill', dataIndex: 'billType', width: 90, responsive: ['md'],
      render: (v) => <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 13 }}>{v === 'GST' ? 'GST' : 'Non-GST'}</Tag>,
    },
    { title: 'Status', dataIndex: 'status', width: 120, render: (v) => <Tag color={STATUS_COLORS[v]} style={{ fontSize: 13 }}>{v}</Tag> },
    {
      title: 'Created At', dataIndex: 'createdAt', width: 145, responsive: ['md'],
      render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTime(v)}</Text>,
    },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 120, responsive: ['lg'], render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openQuotationDetail(r)} />
          </Tooltip>
          <Tooltip title="Send via WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => sendViaWhatsApp(r)} />
          </Tooltip>
          <Tooltip title="Convert to Negotiation">
            <Button size="small" style={{ background: '#722ed1', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => convertToNegotiation(r)}>
              → Negotiation
            </Button>
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
    { title: 'Order ID', dataIndex: 'oid', width: 105, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Hotel', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'GST Number', dataIndex: 'gstNumber', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Amount', dataIndex: 'totalAmount', width: 120, responsive: ['sm'],
      render: (v) => <Text strong style={{ fontSize: 13 }}>₹{(v || 0).toLocaleString()}</Text>,
    },
    {
      title: 'Advance', dataIndex: 'advance', width: 115, responsive: ['md'],
      render: (v) => <Text style={{ color: '#52c41a', fontSize: 13 }}>₹{(v || 0).toLocaleString()}</Text>,
    },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <Tag color={STATUS_COLORS[v]} style={{ fontSize: 13 }}>{v}</Tag> },
    {
      title: 'Created At', dataIndex: 'createdAt', width: 145, responsive: ['md'],
      render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTime(v)}</Text>,
    },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 120, responsive: ['lg'], render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openOrderDetail(r)} />
          </Tooltip>
          <Tooltip title="Download Invoice">
            <Button size="small" icon={<FileTextOutlined />} />
          </Tooltip>
          <Tooltip title="Send via WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => sendViaWhatsApp(r)} />
          </Tooltip>
          {r.status === 'Payment Pending' && (
            <Tooltip title="Record Payment">
              <Button size="small" style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => recordPayment(r)}>
                Record Payment
              </Button>
            </Tooltip>
          )}
          {!r.invId && (
            <Tooltip title="Convert to Invoice">
              <Button size="small" style={{ background: '#B11E6A', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => convertOrderToInvoice(r)}>
                → Invoice
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const complaintColumns = [
    { title: 'Complaint ID', dataIndex: 'key', width: 120, render: (v) => <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>CMP-{v.toString().slice(-4)}</Text> },
    { title: 'Order ID', dataIndex: 'orderId', width: 105, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Hotel / Company', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Description', dataIndex: 'description', ellipsis: true, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Raised At', dataIndex: 'raisedAt', width: 145, render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTimeShort(v)}</Text> },
    { title: 'Sales Person', dataIndex: 'salesPerson', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Status', dataIndex: 'status', width: 95, render: (v) => <Tag color={v === 'Open' ? 'error' : 'success'} style={{ fontSize: 13 }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Details"><Button size="small" icon={<EyeOutlined />} /></Tooltip>
          <Tooltip title="Mark Resolved"><Button size="small" icon={<CheckOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} /></Tooltip>
        </Space>
      ),
    },
  ];

  const filtered = (arr, keys = ['hotelName', 'location']) =>
    !searchText ? arr : arr.filter(item => keys.some(k => (item[k] || '').toLowerCase().includes(searchText.toLowerCase())));




  // ─── Render ────────────────────────────────────────────────────────
  if (viewMode !== 'table') {

    // ── Shared helpers for detail views ────────────────────────────
    const DetailProductCards = ({ products = [], totalAmount }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {products.map((p, i) => (
          <div key={i} style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(177,30,106,0.12)'}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: isDark ? 'rgba(177,30,106,0.1)' : 'rgba(177,30,106,0.04)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 10 }}>PRODUCT</Text>
                  <Text strong style={{ display: 'block', fontSize: 14 }}>{p.name || '—'}</Text>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{ display: 'block', fontSize: 18, color: '#B11E6A', lineHeight: 1.2 }}>₹{((p.qty || 0) * (p.rate || 0)).toLocaleString()}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{p.qty} pcs × ₹{p.rate}</Text>
              </div>
            </div>
            {p.specs && typeof p.specs === 'object' && Object.values(p.specs).some(Boolean) && (
              <div style={{ padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.1)'}` }}>
                <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 10 }}>SPECIFICATIONS</Text>
                <Row gutter={[12, 10]}>
                  {p.specs.logo && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Logo</Text><Tag color={p.specs.logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 20, fontSize: 11 }}>{p.specs.logo === 'YES' ? '✓ Logo' : '✗ No Logo'}</Tag></Col>}
                  {p.specs.sticker && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Sticker / Printing</Text><Tag color={p.specs.sticker === 'YES' ? 'blue' : p.specs.sticker === 'PRINTING' ? 'purple' : 'default'} style={{ borderRadius: 20, fontSize: 11 }}>{p.specs.sticker === 'YES' ? '✓ Yes' : p.specs.sticker === 'PRINTING' ? 'Printing' : '✗ No'}</Tag></Col>}
                  {p.specs.packingMaterial && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Packing Material</Text><Text strong style={{ fontSize: 12 }}>{p.specs.packingMaterial}</Text></Col>}
                  {p.specs.materialCategory && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Material Category</Text><Tag color={p.specs.materialCategory === 'Eco Friendly' ? 'green' : p.specs.materialCategory === 'Wooden' ? 'orange' : 'blue'} style={{ borderRadius: 20, fontSize: 11 }}>{p.specs.materialCategory}</Tag></Col>}
                  {p.specs.brand && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Brand</Text><Text strong style={{ fontSize: 12 }}>{p.specs.brand}</Text></Col>}
                  {p.specs.productType && <Col xs={12} sm={8}><Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Product</Text><Tag color="orange" style={{ borderRadius: 20, fontSize: 11 }}>{p.specs.productType}</Tag></Col>}
                  {p.specs.otherSpecs && (
                    <Col xs={24} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Other Specifications</Text>
                      <div style={{ padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fa', borderRadius: 8, fontSize: 12, color: isDark ? '#ccc' : '#444' }}>
                        {p.specs.otherSpecs}
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(177,30,106,0.06)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.14)' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{products.length} product{products.length !== 1 ? 's' : ''}</Text>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>TOTAL</Text>
            <Text strong style={{ fontSize: 20, color: '#B11E6A' }}>₹{(totalAmount || calcTotal(products)).toLocaleString()}</Text>
          </div>
        </div>
      </div>
    );

    const DetailDeliveryPayment = ({ rec }) => (
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <div style={{ padding: '14px 16px', background: 'rgba(250,140,22,0.06)', borderRadius: 10, border: '1px solid rgba(250,140,22,0.15)', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 10, letterSpacing: 0.5 }}>DELIVERY INFO</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>Delivery By</Text><Text strong>{rec.deliveryBy || '—'}</Text></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><Text type="secondary" style={{ fontSize: 12 }}>Transport Cost Scope</Text><Text strong>{rec.transportationBy || '—'}</Text></div>
            <Tag color={rec.forwardingCharge ? 'orange' : 'default'} style={{ borderRadius: 20 }}>{rec.forwardingCharge ? 'Forwarding Charge Applied' : 'No Forwarding Charge'}</Tag>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ padding: '14px 16px', background: 'rgba(177,30,106,0.05)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.12)', height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 10, letterSpacing: 0.5 }}>PAYMENT TERMS</Text>
            <Text strong style={{ color: '#B11E6A', fontSize: 14 }}>{PAYMENT_LABELS[rec.paymentTerms] || rec.paymentTerms || '—'}</Text>
            {rec.paymentTerms === '50_ADVANCE_50_AFTER' && rec.paymentReminderDate && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(177,30,106,0.08)', borderRadius: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>BALANCE DUE DATE</Text>
                <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{rec.paymentReminderDate}</Text>
              </div>
            )}
          </div>
        </Col>
      </Row>
    );

    // ── Quotation detail ───────────────────────────────────────────
    if (viewMode === 'quotation-detail') {
      const q = selectedRecord || {};
      const QUOT_STEPS = [
        { title: 'Draft', description: 'Created' },
        { title: 'Sent', description: 'Sent to client' },
        { title: 'Negotiation', description: 'Under review' },
        { title: 'Approved', description: 'Confirmed' },
      ];
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('quotations'); }} style={{ borderRadius: 8 }}>Back to Quotations</Button>
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => editExistingQuotation(q)} style={{ borderRadius: 8 }}>Edit Products</Button>
              <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => sendViaWhatsApp(q)}>WhatsApp</Button>
              <Button style={{ background: '#722ed1', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => convertToNegotiation(q)}>Convert to Negotiation</Button>
              <Button style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => startOrderFromQuotation(q)}>Convert to Order</Button>
            </Space>
          </div>

          {/* Hero */}
          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Quotation</Text>
                <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>{q.hotelName || 'Hotel'}</Title>
                <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13, display: 'block', marginTop: 4 }}>{q.location} · {q.billingName}</Text>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {q.contactPerson && <span style={{ color: '#B11E6A', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><UserOutlined />{q.contactPerson}</span>}
                  {q.phone && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><PhoneOutlined style={{ color: '#B11E6A' }} />{q.phone}</span>}
                  {q.salesPerson && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><TeamOutlined style={{ color: '#B11E6A' }} />{q.salesPerson}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{q.qid}</Tag>
                <Tag color={STATUS_COLORS[q.status]} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>{q.status}</Tag>
                <Space>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>{q.billType === 'GST' ? 'GST Bill' : 'Non-GST'}</Tag>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>{q.date}</Tag>
                </Space>
              </div>
            </div>
          </div>

          {/* Flow steps */}
          <Card style={{ borderRadius: 14, marginBottom: 20, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }} styles={{ body: { padding: '16px 24px' } }}>
            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 14 }}>QUOTATION PROGRESS</Text>
            <Steps current={q.flowStep || 0} items={QUOT_STEPS} />
          </Card>

          {/* Stats */}
          <Row gutter={12} style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Value', value: `₹${(q.totalAmount || calcTotal(q.products)).toLocaleString()}`, color: '#B11E6A', icon: <CreditCardOutlined /> },
              { label: 'Products', value: `${q.products?.length || 0} items`, color: '#1890ff', icon: <ShoppingCartOutlined /> },
              { label: 'Payment Terms', value: PAYMENT_LABELS[q.paymentTerms]?.split(' ').slice(0, 2).join(' ') || '—', color: '#fa8c16', icon: <CalendarOutlined /> },
              { label: 'Quote Date', value: q.date || '—', color: '#52c41a', icon: <HistoryOutlined /> },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card size="small" style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: isDark ? '#1E1E2E' : `${s.color}08` }} styles={{ body: { padding: '12px 14px' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: s.color, fontSize: 15 }}>{s.icon}</span><Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text></div>
                  <Text strong style={{ fontSize: 14, color: s.color, display: 'block' }}>{s.value}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={20}>
            <Col xs={24} lg={16}>
              {/* Customer info */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1e3799', borderRadius: 2, display: 'inline-block' }} /><BankOutlined style={{ color: '#1e3799' }} /><span>Customer Information</span></Space>}>
                <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 2 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }}>
                  <Descriptions.Item label="Hotel / Company">{q.hotelName}</Descriptions.Item>
                  <Descriptions.Item label="Billing Name">{q.billingName || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Location">{q.location}</Descriptions.Item>
                  <Descriptions.Item label="Contact Person">{q.contactPerson || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Phone"><a href={`tel:${q.phone}`}>{q.phone || '—'}</a></Descriptions.Item>
                  <Descriptions.Item label="Assigned To">{q.salesPerson}</Descriptions.Item>
                  {q.billType === 'GST' && (
                    <>
                      <Descriptions.Item label="GSTIN"><Text fontFamily="monospace">{q.gstNumber || '—'}</Text></Descriptions.Item>
                      <Descriptions.Item label="GST Rate"><Text style={{ color: '#B11E6A', margin: 0 }}>{q.gstPercent ? `${q.gstPercent}%` : '—'}</Text></Descriptions.Item>
                    </>
                  )}
                </Descriptions>
              </Card>

              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Order Details — Products</span></Space>}>
                <DetailProductCards products={q.products} totalAmount={q.totalAmount} />
              </Card>

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                <DetailDeliveryPayment rec={q} />
              </Card>

              {/* Revision History */}
              {(q.revisionHistory || []).length > 0 && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><HistoryOutlined style={{ color: '#722ed1' }} /><span>Revision History</span></Space>}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...(q.revisionHistory || [])].reverse().map((r, i) => (
                      <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc', borderLeft: '3px solid #722ed1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Tag color="purple" style={{ borderRadius: 20 }}>{r.version}</Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>{r.date} · {r.by}</Text>
                        </div>
                        <Text style={{ fontSize: 13 }}>{r.note}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Notes */}
              {q.notes && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Notes</span></Space>}>
                  <Text style={{ fontSize: 13 }}>{q.notes}</Text>
                </Card>
              )}
            </Col>

            <Col xs={24} lg={8}>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><StarOutlined style={{ color: '#B11E6A' }} /><span>Quotation Status</span></Space>}>
                <Tag color={STATUS_COLORS[q.status]} style={{ borderRadius: 20, fontSize: 14, padding: '6px 18px', fontWeight: 600 }}>{q.status}</Tag>
              </Card>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Quick Actions</span></Space>}>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button icon={<EditOutlined />} block size="large" style={{ borderRadius: 10, height: 44 }} onClick={() => editExistingQuotation(q)}>Edit Products / Rates</Button>
                  <Button icon={<WhatsAppOutlined />} block size="large" style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => sendViaWhatsApp(q)}>Send via WhatsApp</Button>
                  <Button block size="large" style={{ background: '#722ed1', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => convertToNegotiation(q)}>Convert to Negotiation</Button>
                  <Button block size="large" style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => startOrderFromQuotation(q)}>Convert to Order</Button>
                </Space>
              </Card>
              {q.customerId && (
                <Card size="small" style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>CUSTOMER ID</Text>
                  <Text strong style={{ display: 'block', color: '#B11E6A' }}>{q.customerId}</Text>
                </Card>
              )}
            </Col>
          </Row>
        </motion.div>
      );
    }

    // ── Negotiation detail ─────────────────────────────────────────
    if (viewMode === 'negotiation-detail') {
      const n = selectedRecord || {};
      const NEG_STEPS = [
        { title: 'Initial', description: 'Quotation reviewed' },
        { title: 'Counter Offer', description: 'Terms proposed' },
        { title: 'Final Terms', description: 'Near agreement' },
        { title: 'Approved', description: 'Deal closed' },
      ];
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('quotations'); }} style={{ borderRadius: 8 }}>Back to Quotations & Negotiations</Button>
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => editNegotiation(n)} style={{ borderRadius: 8, background: '#fa8c16', color: '#fff', border: 'none' }}>Submit Counter Offer</Button>
              <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => sendViaWhatsApp(n)}>WhatsApp</Button>
              {(n.flowStep || 0) >= 2 && (
                <Button style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => convertNegotiationToOrder(n)}>Convert to Order</Button>
              )}
            </Space>
          </div>

          {/* Hero */}
          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: `2px solid #B11E6A33`, boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Negotiation</Text>
                <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>{n.hotelName || 'Hotel'}</Title>
                <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13, display: 'block', marginTop: 4 }}>{n.location} · {n.billingName}</Text>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {n.contactPerson && <span style={{ color: '#B11E6A', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><UserOutlined />{n.contactPerson}</span>}
                  {n.phone && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><PhoneOutlined style={{ color: '#B11E6A' }} />{n.phone}</span>}
                  {n.salesPerson && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><TeamOutlined style={{ color: '#B11E6A' }} />{n.salesPerson}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{n.nid}</Tag>
                <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>from {n.quotationId}</Tag>
                <Tag color={STATUS_COLORS[n.status] || 'orange'} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>{n.status}</Tag>
              </div>
            </div>
          </div>

          {/* Flow steps */}
          <Card style={{ borderRadius: 14, marginBottom: 20, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }} styles={{ body: { padding: '16px 24px' } }}>
            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 14 }}>NEGOTIATION PROGRESS</Text>
            <Steps current={n.flowStep || 0} items={NEG_STEPS} />
          </Card>

          {/* Stats */}
          <Row gutter={12} style={{ marginBottom: 20 }}>
            {[
              { label: 'Current Value', value: `₹${(n.totalAmount || calcTotal(n.products)).toLocaleString()}`, color: '#fa8c16', icon: <CreditCardOutlined /> },
              { label: 'Products', value: `${n.products?.length || 0} items`, color: '#1890ff', icon: <ShoppingCartOutlined /> },
              { label: 'Rounds', value: `${n.rounds?.length || 0} round${n.rounds?.length !== 1 ? 's' : ''}`, color: '#722ed1', icon: <HistoryOutlined /> },
              { label: 'Date', value: n.date || '—', color: '#52c41a', icon: <CalendarOutlined /> },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card size="small" style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: isDark ? '#1E1E2E' : `${s.color}08` }} styles={{ body: { padding: '12px 14px' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: s.color, fontSize: 15 }}>{s.icon}</span><Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text></div>
                  <Text strong style={{ fontSize: 14, color: s.color, display: 'block' }}>{s.value}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={20}>
            <Col xs={24} lg={16}>
              {/* Negotiation rounds — Timeline UI */}
              {(n.rounds || []).length > 0 && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} />
                      <HistoryOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
                      <span style={{ fontSize: 16, fontWeight: 700 }}>Negotiation Rounds</span>
                      <Tag color="orange" style={{ borderRadius: 20, fontSize: 13 }}>{n.rounds.length} Round{n.rounds.length !== 1 ? 's' : ''}</Tag>
                    </Space>
                  }
                >
                  <Timeline
                    mode="left"
                    style={{ padding: '12px 0 4px' }}
                    items={(n.rounds || []).map((r, i) => {
                      const roundColor = r.type === 'Quotation' || r.type === 'Initial' ? '#1890ff' : r.type === 'Counter Offer' ? '#fa8c16' : '#52c41a';
                      const isLast = i === (n.rounds.length - 1);
                      return {
                        color: roundColor,
                        dot: (
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${roundColor}, ${roundColor}cc)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isLast ? `0 0 0 4px ${roundColor}33` : 'none',
                            border: isLast ? `2px solid ${roundColor}` : 'none',
                          }}>
                            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{r.round}</span>
                          </div>
                        ),
                        label: (
                          <div style={{ textAlign: 'right', paddingRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#ccc' : '#444', display: 'block' }}>{r.date}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{r.by}</Text>
                          </div>
                        ),
                        children: (
                          <div style={{
                            marginBottom: 8,
                            padding: '16px 20px',
                            borderRadius: 12,
                            background: isDark ? `rgba(${roundColor === '#1890ff' ? '24,144,255' : roundColor === '#fa8c16' ? '250,140,22' : '82,196,26'},0.08)` : `${roundColor}0d`,
                            border: `1.5px solid ${roundColor}33`,
                            boxShadow: isLast ? `0 4px 16px ${roundColor}22` : 'none',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Tag
                                  color={r.type === 'Quotation' || r.type === 'Initial' ? 'blue' : r.type === 'Counter Offer' ? 'orange' : 'green'}
                                  style={{ borderRadius: 20, fontSize: 14, padding: '3px 14px', fontWeight: 700, margin: 0 }}
                                >
                                  {r.type}
                                </Tag>
                                {isLast && <Tag color="gold" style={{ borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Latest</Tag>}
                              </div>
                              <div style={{
                                background: `linear-gradient(135deg, ${roundColor}22, ${roundColor}11)`,
                                border: `1.5px solid ${roundColor}44`,
                                borderRadius: 10, padding: '6px 14px', textAlign: 'center',
                              }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', fontWeight: 600, letterSpacing: 0.5 }}>ROUND VALUE</Text>
                                <Text style={{ fontSize: 20, fontWeight: 800, color: roundColor, display: 'block', lineHeight: 1.2 }}>
                                  ₹{(r.totalAmount || 0).toLocaleString()}
                                </Text>
                              </div>
                            </div>
                            <Text style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.8)' : '#444', lineHeight: 1.6, display: 'block' }}>
                              {r.note}
                            </Text>
                          </div>
                        ),
                      };
                    })}
                  />
                </Card>
              )}

              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Agreed Products & Rates</span></Space>}>
                <DetailProductCards products={n.products} totalAmount={n.totalAmount} />
              </Card>

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                <DetailDeliveryPayment rec={n} />
              </Card>

              {n.notes && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Notes</span></Space>}>
                  <Text style={{ fontSize: 13 }}>{n.notes}</Text>
                </Card>
              )}
            </Col>

            <Col xs={24} lg={8}>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><StarOutlined style={{ color: '#fa8c16' }} /><span>Status</span></Space>}>
                <Tag color={STATUS_COLORS[n.status] || 'orange'} style={{ borderRadius: 20, fontSize: 14, padding: '6px 18px', fontWeight: 600 }}>{n.status}</Tag>
              </Card>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Quick Actions</span></Space>}>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <Button icon={<EditOutlined />} block size="large" style={{ background: '#fa8c16', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => editNegotiation(n)}>Submit Counter Offer</Button>
                  <Button icon={<WhatsAppOutlined />} block size="large" style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => sendViaWhatsApp(n)}>Send via WhatsApp</Button>
                  <Button block size="large" style={{ background: '#52c41a', color: '#fff', border: 'none', borderRadius: 10, height: 44 }} onClick={() => convertNegotiationToOrder(n)}>Convert to Order</Button>
                </Space>
              </Card>
              <Card size="small" style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}>
                <Text type="secondary" style={{ fontSize: 11 }}>LINKED TO</Text>
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Quotation: </Text><Text strong style={{ color: '#1e3799' }}>{n.quotationId}</Text>
                </div>
                {n.customerId && <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11 }}>Customer: </Text><Text strong style={{ color: '#B11E6A' }}>{n.customerId}</Text></div>}
              </Card>
            </Col>
          </Row>
        </motion.div>
      );
    }

    // ── Order detail ───────────────────────────────────────────────
    if (viewMode === 'order-detail') {
      const o = selectedRecord || {};
      const ORDER_STEPS = [
        { title: 'Confirmed', description: 'Order placed' },
        { title: 'In Production', description: 'Manufacturing' },
        { title: 'Quality Check', description: 'QC & packing' },
        { title: 'Dispatch Ready', description: 'Ready to ship' },
        { title: 'Delivered', description: 'Completed' },
      ];
      const orderStepMap = { 'In Production': 1, 'Quality Check': 2, 'Dispatch Ready': 3, 'Delivered': 4 };
      const orderCurrentStep = orderStepMap[o.status] ?? 0;
      const oTotal = calcTotal(o.products);
      const balance = oTotal - (o.advance || 0);
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('orders'); }} style={{ borderRadius: 8 }}>Back to Orders</Button>
            <Space wrap>
              <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => sendViaWhatsApp(o)}>WhatsApp</Button>
              <Button icon={<FileTextOutlined />} style={{ borderRadius: 8 }}>Download Invoice</Button>
              {!o.invId && (
                <Button icon={<FileTextOutlined />} style={{ background: '#B11E6A', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => convertOrderToInvoice(o)}>
                  Convert to Invoice
                </Button>
              )}
              <Button
                icon={<WarningOutlined />}
                style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8 }}
                onClick={() => openComplaintModal(o)}
              >
                Raise Complaint
              </Button>
            </Space>
          </div>

          {/* Hero */}
          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: `2px solid #B11E6A33`, boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Confirmed Order</Text>
                <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>{o.hotelName || 'Hotel'}</Title>
                <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13, display: 'block', marginTop: 4 }}>
                  {[o.location, o.city, o.state].filter(Boolean).join(' · ')}
                </Text>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {o.contactPerson && <span style={{ color: '#B11E6A', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><UserOutlined />{o.contactPerson}</span>}
                  {o.phone && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><PhoneOutlined style={{ color: '#B11E6A' }} />{o.phone}</span>}
                  {o.salesPerson && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><TeamOutlined style={{ color: '#B11E6A' }} />{o.salesPerson}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{o.oid}</Tag>
                <Tag color={STATUS_COLORS[o.status] || 'blue'} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>{o.status}</Tag>
                <Space>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>{o.billType === 'GST' ? 'GST Bill' : 'Non-GST'}</Tag>
                  {o.expectedDelivery && <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>Delivery: {o.expectedDelivery}</Tag>}
                </Space>
              </div>
            </div>
          </div>

          {/* Stats */}
          <Row gutter={12} style={{ marginBottom: 20 }}>
            {[
              { label: 'Order Value', value: `₹${oTotal.toLocaleString()}`, icon: <CreditCardOutlined /> },
              { label: 'Advance Paid', value: `₹${(o.advance || 0).toLocaleString()}`, icon: <CheckOutlined /> },
              { label: 'Balance Due', value: `₹${balance.toLocaleString()}`, icon: <CalendarOutlined /> },
              { label: 'Expected Delivery', value: o.expectedDelivery || '—', icon: <CarOutlined /> },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}>{s.icon}</span><Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text></div>
                  <Text strong style={{ fontSize: 14, color: textColor, display: 'block' }}>{s.value}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={20}>
            <Col xs={24} lg={16}>
              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Order Products & Specifications</span></Space>}>
                <DetailProductCards products={o.products} totalAmount={o.totalAmount} />
              </Card>

              {/* Urgent / Emergency Deliveries (Partial) */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span>Urgent / Emergency Deliveries (Partial)</span></Space>}>
                {(o.splitDates || []).length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 13 }}>No urgent / emergency deliveries added.</Text>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(o.splitDates || []).map((sd, i) => (
                      <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                        <Row gutter={[16, 8]} align="middle">
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>PARTIAL DATE</Text>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>
                              {sd.date ? (typeof sd.date === 'string' ? sd.date : sd.date.format?.('YYYY-MM-DD') || String(sd.date)) : '—'}
                            </Text>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>PRODUCT</Text>
                            <Text strong style={{ fontSize: 13 }}>{sd.product || '—'}</Text>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>NOTE</Text>
                            <Text style={{ fontSize: 13 }}>{sd.note || '—'}</Text>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                <DetailDeliveryPayment rec={o} />
              </Card>

              {/* Payment summary */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><CreditCardOutlined style={{ color: '#52c41a' }} /><span>Payment Summary</span></Space>}>
                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '14px 16px', background: 'rgba(82,196,26,0.06)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>ORDER TOTAL</Text>
                      <Text strong style={{ fontSize: 20, color: '#52c41a' }}>₹{oTotal.toLocaleString()}</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '14px 16px', background: 'rgba(177,30,106,0.06)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.2)', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>ADVANCE PAID</Text>
                      <Text strong style={{ fontSize: 20, color: '#B11E6A' }}>₹{(o.advance || 0).toLocaleString()}</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ padding: '14px 16px', background: balance > 0 ? 'rgba(250,140,22,0.06)' : 'rgba(82,196,26,0.06)', borderRadius: 10, border: `1px solid ${balance > 0 ? 'rgba(250,140,22,0.2)' : 'rgba(82,196,26,0.2)'}`, textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>BALANCE DUE</Text>
                      <Text strong style={{ fontSize: 20, color: balance > 0 ? '#fa8c16' : '#52c41a' }}>₹{balance.toLocaleString()}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* Compliance — visible if status is Completed or Partially Completed */}
              {(o.status === 'Completed' || o.status === 'Partially Completed') && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><CheckOutlined style={{ color: '#722ed1' }} /><span>Compliance Details</span></Space>}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Product Invoice</Text>
                      <div style={{ marginTop: 6 }}>
                        <Button icon={<DownloadOutlined />} size="small">Download Invoice</Button>
                        <Tag color="success" style={{ marginLeft: 8 }}>Verified</Tag>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Compliance Status</Text>
                      <Text strong style={{ display: 'block', color: '#52c41a' }}>ALL CLEAR</Text>
                    </Col>
                  </Row>
                </Card>
              )}

              {/* Delivery Address */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><EnvironmentOutlined style={{ color: '#52c41a' }} /><span>Delivery Address</span></Space>}>
                <div style={{ padding: '4px 0' }}>
                  <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>{o.billingName || o.hotelName}</Text>
                  <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.65)' : '#555', display: 'block', lineHeight: 1.6 }}>
                    {o.detailedAddress || 'No detailed address provided'}<br />
                    {[o.city, o.state, o.pincode].filter(Boolean).join(', ')}
                  </Text>
                </div>
              </Card>

              {o.notes && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Order Notes</span></Space>}>
                  <Text style={{ fontSize: 13 }}>{o.notes}</Text>
                </Card>
              )}
            </Col>

            <Col xs={24} lg={8}>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><StarOutlined style={{ color: '#52c41a' }} /><span>Order Status</span></Space>}>
                <Tag color={STATUS_COLORS[o.status] || 'blue'} style={{ borderRadius: 20, fontSize: 14, padding: '6px 18px', fontWeight: 600 }}>{o.status}</Tag>
              </Card>
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><BankOutlined style={{ color: '#1890ff' }} /><span>Billing Details</span></Space>}>
                <Descriptions bordered size="small" column={1} labelStyle={{ fontSize: 12, width: '35%' }} contentStyle={{ fontSize: 13, fontWeight: 500 }}>
                  <Descriptions.Item label="Billing Name">{o.billingName || o.hotelName}</Descriptions.Item>
                  <Descriptions.Item label="Bill Type">
                    <Tag color={o.billType === 'GST' ? 'volcano' : 'default'} style={{ borderRadius: 12, margin: 0 }}>
                      {o.billType === 'GST' ? 'GST Invoice' : 'Non-GST'}
                    </Tag>
                  </Descriptions.Item>
                  {o.billType === 'GST' && (
                    <>
                      <Descriptions.Item label="GSTIN"><Text fontFamily="monospace">{o.gstNumber || '—'}</Text></Descriptions.Item>
                      <Descriptions.Item label="GST Rate"><Text style={{ color: '#B11E6A', margin: 0 }}>{o.gstPercent ? `${o.gstPercent}%` : '—'}</Text></Descriptions.Item>
                    </>
                  )}
                </Descriptions>
              </Card>
              <Card size="small" style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}>
                <Text type="secondary" style={{ fontSize: 11 }}>LINKED TO</Text>
                <div style={{ marginTop: 6 }}><Text type="secondary" style={{ fontSize: 11 }}>Quotation: </Text><Text strong style={{ color: '#1e3799' }}>{o.quotationId || '—'}</Text></div>
                {o.negotiationId && <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11 }}>Negotiation: </Text><Text strong style={{ color: '#fa8c16' }}>{o.negotiationId}</Text></div>}
                <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 11 }}>Order Date: </Text><Text strong>{o.date || '—'}</Text></div>
              </Card>

              {/* GST API Details Card */}
              {o.billType === 'GST' && o.gstNumber && (
                <Card
                  style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <BankOutlined style={{ color: '#722ed1' }} />
                      <span>GST API Details</span>
                      {!gstApiLoading && (
                        <Button size="small" type="text" icon={<HistoryOutlined />} style={{ color: '#722ed1' }} onClick={() => fetchGstDetails(o.gstNumber)}>
                          Refresh
                        </Button>
                      )}
                    </Space>
                  }
                >
                  {gstApiLoading && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Spin size="small" />
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Fetching GST details…</Text>
                    </div>
                  )}
                  {gstApiError && !gstApiLoading && (
                    <div style={{ padding: '10px 12px', background: 'rgba(255,77,79,0.06)', borderRadius: 8, border: '1px solid rgba(255,77,79,0.2)' }}>
                      <Text style={{ color: '#ff4d4f', fontSize: 12 }}>{gstApiError}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>GSTIN on file: </Text>
                        <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{o.gstNumber}</Text>
                      </div>
                    </div>
                  )}
                  {gstApiData && !gstApiLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'GSTIN', value: gstApiData.gstin || o.gstNumber, mono: true },
                        { label: 'Legal Name', value: gstApiData.lgnm },
                        { label: 'Trade Name', value: gstApiData.tradeNam },
                        { label: 'Status', value: gstApiData.sts, tag: true, color: gstApiData.sts === 'Active' ? 'success' : 'error' },
                        { label: 'Taxpayer Type', value: gstApiData.ctb || gstApiData.dty },
                        { label: 'Registration Date', value: gstApiData.rgdt },
                        { label: 'State', value: gstApiData.stj },
                        { label: 'e-Invoice', value: gstApiData.einvoiceStatus },
                      ].filter(f => f.value).map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}` }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{f.label}</Text>
                          {f.tag ? (
                            <Tag color={f.color} style={{ borderRadius: 12, margin: 0, fontSize: 11 }}>{f.value}</Tag>
                          ) : (
                            <Text strong style={{ fontSize: 12, fontFamily: f.mono ? 'monospace' : undefined, color: f.mono ? '#722ed1' : undefined }}>{f.value}</Text>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!gstApiData && !gstApiLoading && !gstApiError && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Click Refresh to load GST details</Text>
                    </div>
                  )}
                </Card>
              )}
            </Col>
          </Row>

          {/* Raise Complaint Modal — handled via shared modal at end of file */}

        </motion.div>
      );
    }

    // ── Quotation form ─────────────────────────────────────────────
    if (viewMode === 'quotation-form') {
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => setViewMode('table')} style={{ borderRadius: 8 }}>Back to List</Button>
            <Button type="primary" size="large" icon={<SaveOutlined />}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)' }}
              onClick={saveQuotation}
            >
              {editingQuotation ? 'Update Quotation' : 'Save Quotation'}
            </Button>
          </div>

          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              {editingQuotation ? 'Edit Quotation' : 'New Quotation'}
            </Text>
            <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>
              {editingQuotation ? editingQuotation.qid : (quotationFromLead?.hotelName || 'Draft Quotation')}
            </Title>
          </div>

          <Form form={quotationForm} layout="vertical">
            <Row gutter={20}>
              <Col xs={24} lg={16}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><span>Quotation Information</span></Space>}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}><Form.Item label="Hotel Name" name="hotelName" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Billing Name" name="billingName"><Input placeholder="Name on quotation" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true, message: 'Detailed Address is required' }]}><Input.TextArea rows={1} /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Pincode" name="pincode"><Input /></Form.Item></Col>
                  </Row>
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Products & Specifications</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" showSpecs={true} />
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><span>Terms & Settings</span></Space>}>
                  <Form.Item label="Hotel Type" name="hotelType"><Select><Option value="OLD">Old Hotel</Option><Option value="NEW">New Hotel</Option></Select></Form.Item>
                  <Form.Item label="Bill Type" name="billType"><Select><Option value="GST">GST Bill</Option><Option value="NON_GST">Without GST</Option></Select></Form.Item>
                  <Divider style={{ margin: '12px 0' }} />
                  <DeliveryPaymentFields />
                </Card>
              </Col>
            </Row>
          </Form>
        </motion.div>
      );
    }

    // ── Negotiation form ───────────────────────────────────────────
    if (viewMode === 'negotiation-form') {
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => setViewMode('table')} style={{ borderRadius: 8 }}>Back to List</Button>
            <Button type="primary" size="large" icon={<SaveOutlined />}
              style={{ background: 'linear-gradient(135deg,#fa8c16,#ffa940)', border: 'none', borderRadius: 8 }}
              onClick={saveNegotiation}
            >
              Submit Counter Offer
            </Button>
          </div>

          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Negotiation</Text>
            <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>{editingNegotiation?.hotelName}</Title>
          </div>

          <Form form={negotiationForm} layout="vertical">
            <Row gutter={20}>
              <Col xs={24} lg={16}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><span>Products & Revised Rates</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" showSpecs={true} />
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Negotiation Note</span></Space>}>
                  <Form.Item label="Note for this round" name="negotiationNote">
                    <Input.TextArea rows={3} placeholder="e.g. Agreed to reduce Soap rate by 5%, waiving forwarding charge..." />
                  </Form.Item>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><span>Payment & Delivery</span></Space>}>
                  <DeliveryPaymentFields />
                </Card>
              </Col>
            </Row>
          </Form>
        </motion.div>
      );
    }

    // ── Order form ─────────────────────────────────────────────
    if (viewMode === 'order-form') {
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => setViewMode('table')} style={{ borderRadius: 8 }}>Back to List</Button>
            <Button type="primary" size="large" icon={<SaveOutlined />}
              style={{ background: '#52c41a', border: 'none', borderRadius: 8 }}
              onClick={saveOrder}
            >
              Update Order
            </Button>
          </div>

          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Edit Order</Text>
            <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>{editingOrder?.oid} — {editingOrder?.hotelName}</Title>
          </div>

          <Form form={orderForm} layout="vertical">
            <Row gutter={20}>
              <Col xs={24} lg={16}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><span>Order Details</span></Space>}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}><Form.Item label="Hotel Name" name="hotelName" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Billing Name" name="billingName"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true }]}><Input.TextArea rows={1} /></Form.Item></Col>
                  </Row>
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Products & Quantities</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" />
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span>Urgent / Emergency Deliveries (Partial)</span></Space>}>
                  <Form.List name="splitDates">
                    {(fields, { add, remove }) => (
                      <div>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #ff4d4f33' }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'date']} label="Partial Date" style={{ marginBottom: 6 }}>
                                  <DatePicker style={{ width: '100%' }} size="small" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={8}>
                                <Form.Item {...rest} name={[name, 'product']} label="Product" style={{ marginBottom: 6 }}>
                                  <Select size="small" placeholder="Select product" allowClear>
                                    {(watchedOrderProducts || []).filter(p => p?.name || p?.kitType).map((p, i) => (
                                      <Option key={i} value={p.name || p.kitType}>{p.name || p.kitType}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'note']} label="Note" style={{ marginBottom: 6 }}>
                                  <Input size="small" placeholder="e.g. First batch 500 units" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 20 }}>
                                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ marginTop: 4, borderColor: '#ff4d4f55', color: '#ff4d4f' }}>
                          Add Urgent / Emergency Delivery (Partial)
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Payment & Delivery</span></Space>}>
                  <Form.Item label="Payment Terms" name="paymentTerms">
                    <Select>{PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select>
                  </Form.Item>
                  <Form.Item label="Advance Paid (₹)" name="advance" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} prefix="₹" min={0} />
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={12}><Form.Item label="Order Date" name="date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={12}>
                      <Form.Item label="Delivery Date(s)" name="expectedDelivery">
                        <Input placeholder="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Order Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
                </Card>
              </Col>
            </Row>
          </Form>
        </motion.div>
      );
    }

    const isDetail = viewMode === 'detail';
    const isAddLead = viewMode === 'add-lead';
    const isAddCustomer = viewMode === 'add-customer';
    const record = selectedRecord || {};
    const totalValue = calcTotal(record.products);
    // Show per-card edit buttons in both detail view AND when editing an existing record
    const usePerCardEdit = isDetail || !!editingLead;

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

    // Products card: show for both leads and customers in add/edit mode
    const isLeadDetail = isDetail && !record.customerId;
    const showProductsCard = isDetail || isAddLead || isAddCustomer;

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
                  <>
                    <Button icon={<FileTextOutlined />}
                      style={{ background: '#B11E6A', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => startQuotationFromLead(record)}
                    >Convert to Quotation</Button>
                    <Button icon={<ArrowRightOutlined />}
                      style={{ background: '#722ed1', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => convertLeadToNegotiation(record)}
                    >Convert to Negotiation</Button>
                  </>
                )}
              </>
            )}
            {!isDetail && (
              <Button type="primary" size="large" icon={editingLead ? <SaveOutlined /> : <PlusOutlined />}
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)' }}
                onClick={saveLead}
              >
                {editingLead ? 'Update Record' : (isAddLead ? 'Save Lead' : 'Save Customer')}
              </Button>
            )}
          </Space>
        </div>

        {/* Hero Banner */}
        <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                {isDetail ? (record.qid ? 'Quotation Profile' : record.customerId ? 'Customer Profile' : 'Lead Profile') : (editingLead ? 'Edit Record' : isAddLead ? 'New Lead' : 'New Customer')}
              </Text>
              <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700, lineHeight: 1.2 }}>
                {isDetail ? (record.hotelName || 'Hotel') : (editingLead ? `Edit ${editingLead.hotelName}` : isAddLead ? 'Add New Lead' : 'Add New Customer')}
              </Title>
              {isDetail && (
                <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13, display: 'block', marginTop: 4 }}>
                  {[record.location, record.billingName && record.billingName !== record.hotelName ? record.billingName : null].filter(Boolean).join(' · ')}
                </Text>
              )}
              {!isDetail && (
                <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13, display: 'block', marginTop: 6 }}>
                  {isAddLead ? 'Fill in the details to create a new sales lead' : 'Register a new customer in the system'}
                </Text>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {isDetail && (
                <Space>
                  {record.qid && <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{record.qid}</Tag>}
                  {record.leadId && <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{record.leadId}</Tag>}
                  {record.customerId && <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{record.customerId}</Tag>}
                </Space>
              )}
              {isDetail && record.status && (
                <Tag color={STATUS_COLORS[record.status]} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>
                  {record.status}
                </Tag>
              )}
              {isDetail && (
                <Space>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>
                    {record.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}
                  </Tag>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>
                    {record.billType === 'GST' ? 'GST Bill' : 'Non-GST'}
                  </Tag>
                </Space>
              )}
            </div>
          </div>

          {isDetail && (record.phone || record.email || record.contactPerson || record.salesPerson) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #B11E6A22', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {record.contactPerson && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B11E6A', fontSize: 13 }}>
                  <UserOutlined />{record.contactPerson}
                </span>
              )}
              {record.phone && (
                <a href={`tel:${record.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: isDark ? '#ccc' : '#555', fontSize: 13, textDecoration: 'none' }}>
                  <PhoneOutlined style={{ color: '#B11E6A' }} />{record.phone}
                </a>
              )}
              {record.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: isDark ? '#ccc' : '#555', fontSize: 13 }}>
                  <MailOutlined style={{ color: '#B11E6A' }} />{record.email}
                </span>
              )}
              {record.salesPerson && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: isDark ? '#ccc' : '#555', fontSize: 13 }}>
                  <TeamOutlined style={{ color: '#B11E6A' }} />{record.salesPerson}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats row — detail only */}
        {isDetail && (
          <Row gutter={12} style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Value', value: `₹${totalValue.toLocaleString()}`, icon: <CreditCardOutlined /> },
              { label: 'Products', value: `${record.products?.length || 0} items`, icon: <ShoppingCartOutlined /> },
              { label: 'Hotel Type', value: record.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel', icon: <BankOutlined /> },
              { label: 'Next Follow-up', value: record.followUpDate || 'Not set', icon: <HistoryOutlined /> },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card size="small" style={{ borderRadius: 12, border: '1px solid #B11E6A22', background: isDark ? '#1E1E2E' : '#fff' }} styles={{ body: { padding: '12px 14px' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#B11E6A', fontSize: 15 }}>{s.icon}</span><Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text></div>
                  <Text strong style={{ fontSize: 15, color: '#B11E6A', display: 'block' }}>{s.value}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <Form form={leadForm} layout="vertical" initialValues={isDetail ? record : undefined}>
          <Row gutter={20}>
            <Col span={24}>
              <Card
                style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={
                  <Space>
                    <div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} />
                    <BankOutlined style={{ color: '#B11E6A' }} />
                    <span>Hotel / Company Information</span>
                  </Space>
                }
                extra={usePerCardEdit && (
                  editingSection === 'hotel' ? (
                    <Space size="small">
                      <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('hotel')} style={{ background: '#B11E6A', border: 'none', borderRadius: 6 }}>Save</Button>
                      <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                    </Space>
                  ) : (
                    <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('hotel')} style={{ borderRadius: 6 }}>Edit</Button>
                  )
                )}
              >
                {usePerCardEdit && editingSection !== 'hotel' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }} style={{ background: isDark ? 'transparent' : '#fff' }}>
                      <Descriptions.Item label="Hotel / Company" span={1}>{record.hotelName}</Descriptions.Item>
                      <Descriptions.Item label="Billing Name" span={2}>{record.billingName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="No. of Rooms">{record.rowsInHotel}</Descriptions.Item>
                      <Descriptions.Item label="Occupancy (%)">{record.generalOccupancy ? `${record.generalOccupancy}%` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="Hotel Type">{record.hotelType}</Descriptions.Item>
                      <Descriptions.Item label="POC Designation">{record.pocDesignation || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{record.phone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alternative Name">{record.alternativeName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alternative Role">{record.alternativeRole || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alternative Number" span={1}>{record.alternativePhone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{record.email || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Assigned To">{record.salesPerson}</Descriptions.Item>
                      <Descriptions.Item label="Location">{record.location}</Descriptions.Item>
                      <Descriptions.Item label="Destination">{record.destination || '—'}</Descriptions.Item>
                    </Descriptions>
                  </div>
                ) : (
                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Hotel / Company Name" name="hotelName" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Hotel Blue Star" prefix={<BankOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="No. of Rooms" name="rowsInHotel" rules={[{ required: true }]}>
                        <InputNumber placeholder="50" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="General Occupancy (%)" name="generalOccupancy" rules={[{ required: true }]}>
                        <InputNumber placeholder="e.g. 75" style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Hotel Logo" name="hotelLogo" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}>
                        <Upload beforeUpload={() => false} accept="image/*,.pdf,.svg,.ai" maxCount={1} listType="picture">
                          <Button icon={<UploadOutlined />} style={{ borderColor: '#B11E6A55', color: '#B11E6A', width: '100%' }}>Upload Logo</Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Hotel Type" name="hotelType" rules={[{ required: true }]}>
                        <Select placeholder="Select hotel type">
                          <Option value="OLD">Old Hotel</Option>
                          <Option value="NEW">New Hotel</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Billing Name" name="billingName">
                        <Input placeholder="e.g. HOTEL BLUESTAR" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Contact Person" name="contactPerson">
                        <Input placeholder="Reception / Manager" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="POC Designation" name="pocDesignation">
                        <Input placeholder="GM, Manager" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Phone" name="phone" rules={[{ required: true }]}>
                        <Input placeholder="+91 XXXXX XXXXX" prefix={<PhoneOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Role" name="alternativeRole" rules={[{ required: true, message: 'Alternative contact role is required' }]}>
                        <SelectWithAdd defaultOptions={ALTERNATIVE_PERSON_OPTIONS} placeholder="Select / Add Role" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Name" name="alternativeName">
                        <Input placeholder="Full Name" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Number" name="alternativePhone" rules={[{ required: true, message: 'Alternative phone is required' }]}>
                        <Input placeholder="+91 XXXXX XXXXX" prefix={<PhoneOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Email" name="email">
                        <Input placeholder="optional" prefix={<MailOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Location / City" name="location" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Coimbatore" prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Destination" name="destination">
                        <Input placeholder="e.g. Chennai, Delhi" prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Assign Lead To" name="salesPerson" rules={[{ required: true, message: 'Please assign this lead' }]}>
                        <SelectWithAdd defaultOptions={SALES_PERSONS} placeholder="Select / Add Sales Person" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Source" name="source">
                        <SelectWithAdd defaultOptions={[{ value: 'Direct', label: 'Direct' }, { value: 'Referral', label: 'Referral' }]} placeholder="Select source" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label={`Priority Level (${watchedPriority || 0}%)`} name="priority">
                        <Slider min={0} max={100} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      {watchedPriority > 0 && (
                        <Form.Item label="Priority Note" name="mentionPriority" rules={[{ required: true }]}>
                          <Input placeholder="Why is this high priority?" />
                        </Form.Item>
                      )}
                    </Col>

                    {/* Software Interest */}
                    <Col xs={24}>
                      <Divider style={{ margin: '16px 0 12px', fontSize: 12, color: '#722ed1' }}>Software Interest</Divider>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Interested in Software" name="interestedInSoftware" rules={[{ required: true, message: 'Please select' }]}>
                        <Select placeholder="Select Yes / No">
                          <Option value="YES">Yes</Option>
                          <Option value="NO">No</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Previous Software" name="previousSoftware" rules={[{ required: watchedSoftwareInterest === 'YES', message: 'Required' }]}>
                        <Input placeholder="e.g. TallySoft, Zoho" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Previous Software Price (₹)" name="previousSoftwarePrice" rules={[{ required: watchedSoftwareInterest === 'YES', message: 'Required' }]}>
                        <InputNumber placeholder="e.g. 12000" style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Software Expiry Date" name="softwareExpiryDate" rules={[{ required: watchedSoftwareInterest === 'YES', message: 'Required' }]}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select expiry date" />
                      </Form.Item>
                    </Col>

                  </Row>
                )}
              </Card>
              {/* Consolidated Row: Billing, Status, Progress */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                {/* Billing & Address */}
                <Col xs={24} lg={12}>
                  <Card
                    style={{ borderRadius: 14, height: '100%', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><EnvironmentOutlined style={{ color: '#52c41a' }} /><span>Billing & Address</span></Space>}
                    extra={usePerCardEdit && (
                      editingSection === 'billing' ? (
                        <Space size="small">
                          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('billing')} style={{ background: '#52c41a', border: 'none', borderRadius: 6 }}>Save</Button>
                          <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                        </Space>
                      ) : (
                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('billing')} style={{ borderRadius: 6 }}>Edit</Button>
                      )
                    )}
                  >
                    {usePerCardEdit && editingSection !== 'billing' ? (
                      <Row gutter={[24, 12]}>
                        <Col xs={24} sm={12}><InfoRow label="Bill Type" value={record.billType === 'GST' ? 'GST Bill' : 'Non-GST'} /></Col>
                        {record.billType === 'GST' && (
                          <>
                            <Col xs={24} sm={12}><InfoRow label="GSTIN" value={record.gstNumber} /></Col>
                            <Col xs={24} sm={12}><InfoRow label="GST Rate" value={`${record.gstPercent}%`} /></Col>
                          </>
                        )}
                        <Col xs={24} sm={12}><InfoRow label="City" value={record.city} /></Col>
                        <Col xs={24} sm={12}><InfoRow label="State" value={record.state} /></Col>
                        <Col xs={24} sm={12}><InfoRow label="Pincode" value={record.pincode} /></Col>
                        <Col xs={24}><InfoRow label="Detailed Address" value={record.detailedAddress} /></Col>
                      </Row>
                    ) : (
                      <Row gutter={12}>
                        <Col xs={24}><Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="Full address" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="City" name="city"><Input placeholder="City" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="State" name="state"><Input placeholder="State" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Pincode" name="pincode"><Input placeholder="Pincode" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Bill Type" name="billType" rules={[{ required: true }]}><Select placeholder="Select Bill Type"><Option value="GST">GST Bill</Option><Option value="NON_GST">Without GST</Option></Select></Form.Item></Col>
                        {watchedBillType === 'GST' && (
                          <>
                            <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item label="GST %" name="gstPercent"><InputNumber style={{ width: '100%' }} placeholder="18" /></Form.Item></Col>
                          </>
                        )}
                      </Row>
                    )}
                  </Card>
                </Col>

                {/* Lead Status / Customer Type */}
                <Col xs={24} lg={6}>
                  <Card
                    style={{ borderRadius: 14, height: '100%', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><StarOutlined style={{ color: '#B11E6A' }} /><span>{isAddCustomer ? 'Customer Settings' : 'Lead Status'}</span></Space>}
                    extra={usePerCardEdit && (
                      editingSection === 'leadStatus' ? (
                        <Space size="small">
                          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('leadStatus')} style={{ background: '#B11E6A', border: 'none', borderRadius: 6 }}>Save</Button>
                          <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                        </Space>
                      ) : (
                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('leadStatus')} style={{ borderRadius: 6 }}>Edit</Button>
                      )
                    )}
                  >
                    {!usePerCardEdit || editingSection === 'leadStatus' ? (
                      <>
                        <Form.Item name="status" label="Status">
                          <SelectWithAdd
                            defaultOptions={[
                              { value: 'Cold', label: '🔵 Cold' },
                              { value: 'Warm', label: '🟡 Warm' },
                              { value: 'Quotation (Sent)', label: '📄 Quotation (Sent)' },
                              { value: 'Quotation (Not Sent)', label: '📄 Quotation (Not Sent)' },
                              { value: 'Hot', label: '🔴 Hot' },
                              { value: 'Negotiation', label: '🤝 Negotiation' },
                              { value: 'Need manager help', label: '🟣 Need manager help' },
                              { value: 'Converted', label: '✅ Converted' },
                              { value: 'Rejected', label: '❌ Rejected' },
                            ]}
                            placeholder="Select status"
                          />
                        </Form.Item>
                        {watchedStatus === 'Quotation (Sent)' && (
                          <Row gutter={8}>
                            <Col span={12}>
                              <Form.Item label="Quotation No" name="quotationNo" rules={[{ required: true }]}>
                                <Input placeholder="Q-101" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="Quotation Date" name="quotationDate" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>
                          </Row>
                        )}
                        <Form.Item label="Follow-up Date" name="followUpDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
                        <Form.Item label="Time" name="followUpTime"><Input type="time" /></Form.Item>
                        <Form.Item label="Task" name="followUpName"><Input placeholder="e.g. Call back" /></Form.Item>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <InfoRow label="Current Status" value={<Tag color={STATUS_COLORS[record.status]}>{record.status}</Tag>} />
                        {record.followUpDate && (
                          <div style={{ padding: '10px', background: 'rgba(82,196,26,0.08)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>NEXT FOLLOW-UP</Text>
                            <Text strong style={{ color: '#52c41a', fontSize: 13 }}>{record.followUpDate} {record.followUpTime}</Text>
                          </div>
                        )}
                        {(record.statusHistory || []).length > 1 && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10 }}>STATUS HISTORY</Text>
                            <Timeline
                              mode="left"
                              style={{ marginLeft: -8 }}
                              items={[...record.statusHistory].reverse().slice(0, 5).map((h, i) => ({
                                color: STATUS_COLORS[h.status] || '#ccc',
                                label: (
                                  <Text style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? (isDark ? '#fff' : '#333') : (isDark ? '#aaa' : '#666') }}>
                                    {fmtDateTimeShort(h.changedAt)}
                                  </Text>
                                ),
                                children: <Tag color={STATUS_COLORS[h.status] || 'default'} style={{ borderRadius: 20, fontSize: 12, padding: '1px 10px', fontWeight: i === 0 ? 700 : 400 }}>{h.status}</Tag>,
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </Col>

                {/* Follow-up Progress (Steps) */}
                <Col xs={24} lg={6}>
                  <Card
                    style={{ borderRadius: 14, height: '100%', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><CalendarOutlined style={{ color: '#722ed1' }} /><span>Lead Journey</span></Space>}
                    extra={usePerCardEdit && (
                      editingSection === 'leadJourney' ? (
                        <Space size="small">
                          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('leadJourney')} style={{ background: '#722ed1', border: 'none', borderRadius: 6 }}>Save</Button>
                          <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                        </Space>
                      ) : (
                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('leadJourney')} style={{ borderRadius: 6 }}>Edit</Button>
                      )
                    )}
                  >
                    {usePerCardEdit && editingSection === 'leadJourney' ? (
                      <Form.Item name="followUpStep" label="Current Step">
                        <Select style={{ width: '100%' }}>
                          {LEAD_STEPS.map((step, idx) => (
                            <Option key={idx} value={idx}>{step.title} — {step.description}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    ) : (
                      <Steps direction="vertical" size="small" current={record.followUpStep || 0} items={LEAD_STEPS} />
                    )}
                  </Card>
                </Col>
              </Row>

              {/* ── Personalization card — show for both ──────────── */}
              {(isAddLead || isAddCustomer || isDetail) && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <GiftOutlined style={{ color: '#722ed1' }} />
                      <span>Personalization</span>
                    </Space>
                  }
                  extra={usePerCardEdit && (
                    editingSection === 'personalization' ? (
                      <Space size="small">
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('personalization')} style={{ background: '#722ed1', border: 'none', borderRadius: 6 }}>Save</Button>
                        <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                      </Space>
                    ) : (
                      <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('personalization')} style={{ borderRadius: 6 }}>Edit</Button>
                    )
                  )}
                >
                  {usePerCardEdit && editingSection !== 'personalization' ? (
                    <Row gutter={[24, 12]}>
                      <Col xs={24} sm={12}>
                        <InfoRow label="Product Selection" value={
                          record.productType
                            ? (Array.isArray(record.productType)
                              ? record.productType.map(pt => PERSONALIZATION_OPTIONS.find(o => o.value === pt)?.label || pt).join(', ')
                              : PERSONALIZATION_OPTIONS.find(o => o.value === record.productType)?.label || record.productType)
                            : '—'
                        } />
                      </Col>
                      <Col xs={24} sm={12}>
                        <InfoRow label="Display Unit" value={
                          record.displayUnit
                            ? (DISPLAY_UNIT_OPTIONS.find(o => o.value === record.displayUnit)?.label || record.displayUnit)
                            : '—'
                        } />
                      </Col>
                    </Row>
                  ) : (
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Product Selection" name="productType" rules={[{ required: true, message: 'Select product type' }]}>
                          <SelectWithAdd
                            mode="multiple"
                            defaultOptions={PERSONALIZATION_OPTIONS}
                            placeholder="Select product types"
                          />
                        </Form.Item>
                      </Col>
                      {watchedProductType?.includes('PERSONALIZED_KIT') && (
                        <Col xs={24} sm={12}>
                          <Form.Item label="Display Unit" name="displayUnit" rules={[{ required: true, message: 'Select display unit' }]}>
                            <SelectWithAdd
                              defaultOptions={DISPLAY_UNIT_OPTIONS}
                              placeholder="Select display unit"
                            />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                  )}
                </Card>
              )}

              {/* ── Order Details Products ────────────────────────────── */}
              {showProductsCard && (() => {
                const latestCustomerOrder = (isDetail && record.customerId)
                  ? ordersData.filter(o => o.hotelName === record.hotelName).slice(-1)[0]
                  : null;

                const hasKit = watchedProductType?.includes('PERSONALIZED_KIT');
                const hasSeparate = watchedProductType?.includes('SEPARATE_PRODUCT');
                const showKitCard = hasKit || (!hasKit && !hasSeparate);
                const showSeparateCard = hasSeparate || (!hasKit && !hasSeparate);

                if (isDetail) {
                  return (
                    <Card
                      style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                      title={
                        <Space>
                          <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                          <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                          {(record.customerId) ? (
                            <>
                              <span>Latest Order Details</span>
                              {latestCustomerOrder && (
                                <Tag style={{ background: '#1890ff18', color: '#1890ff', border: '1px solid #1890ff44', borderRadius: 20, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                                  {latestCustomerOrder.oid}
                                </Tag>
                              )}
                            </>
                          ) : (
                            <span>Order Details — Products</span>
                          )}
                        </Space>
                      }
                    >
                      <>
                        {/* Personalization badge */}
                        {record.productType && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: 'rgba(114,46,209,0.06)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.12)' }}>
                            <GiftOutlined style={{ color: '#722ed1' }} />
                            <Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 600 }}>
                              {Array.isArray(record.productType)
                                ? record.productType.map(pt => pt === 'PERSONALIZED_KIT' ? 'Personalized Kit' : 'Separate Product').join(' & ')
                                : (record.productType === 'PERSONALIZED_KIT' ? 'Personalized Kit' : 'Separate Product')}
                            </Text>
                            {record.displayUnit && (
                              <>
                                <span style={{ color: '#ccc' }}>·</span>
                                <Text style={{ fontSize: 12, color: '#722ed1' }}>Display Unit: {record.displayUnit.replace(/_/g, ' ')}</Text>
                              </>
                            )}
                          </div>
                        )}

                        {/* Per-product cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {(record.products || []).map((p, i) => (
                            <div key={i} style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(177,30,106,0.12)'}`, borderRadius: 12, overflow: 'hidden' }}>
                              {/* Product header row */}
                              <div style={{ background: isDark ? 'rgba(177,30,106,0.1)' : 'rgba(177,30,106,0.04)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                                  </div>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>PRODUCT</Text>
                                    <Text strong style={{ display: 'block', fontSize: 15 }}>{p.name || '—'}</Text>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <Text strong style={{ display: 'block', fontSize: 20, color: '#B11E6A', lineHeight: 1.2 }}>
                                    ₹{((p.qty || 0) * (p.rate || 0)).toLocaleString()}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {p.qty || 0} pcs × ₹{p.rate || 0}
                                  </Text>
                                </div>
                              </div>

                              {/* Specifications */}
                              {p.specs && typeof p.specs === 'object' && Object.values(p.specs).some(Boolean) && (
                                <div style={{ padding: '14px 18px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.1)'}` }}>
                                  <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 12 }}>SPECIFICATIONS</Text>
                                  <Row gutter={[12, 14]}>
                                    {p.specs.logo && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Logo</Text>
                                        <Tag color={p.specs.logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 20, fontSize: 12 }}>
                                          {p.specs.logo === 'YES' ? '✓ Logo' : '✗ No Logo'}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.specs.sticker && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Sticker / Printing</Text>
                                        <Tag color={p.specs.sticker === 'YES' ? 'blue' : p.specs.sticker === 'PRINTING' ? 'purple' : 'default'} style={{ borderRadius: 20, fontSize: 12 }}>
                                          {p.specs.sticker === 'YES' ? '✓ Yes' : p.specs.sticker === 'PRINTING' ? 'Printing' : '✗ No'}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.specs.packingMaterial && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Packing Material</Text>
                                        <Text strong style={{ fontSize: 13 }}>{p.specs.packingMaterial}</Text>
                                      </Col>
                                    )}
                                    {p.specs.materialCategory && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Material Category</Text>
                                        <Tag
                                          color={p.specs.materialCategory === 'Eco Friendly' ? 'green' : p.specs.materialCategory === 'Wooden' ? 'orange' : 'blue'}
                                          style={{ borderRadius: 20, fontSize: 12 }}
                                        >
                                          {p.specs.materialCategory}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.specs.brand && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Brand</Text>
                                        <Text strong style={{ fontSize: 13 }}>{p.specs.brand}</Text>
                                      </Col>
                                    )}
                                    {p.specs.product && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Product Type</Text>
                                        <Tag color="orange" style={{ borderRadius: 20, fontSize: 12 }}>{p.specs.product}</Tag>
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '14px 18px', background: 'rgba(177,30,106,0.06)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.14)' }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{(record.products || []).length} product{(record.products || []).length !== 1 ? 's' : ''}</Text>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>TOTAL ORDER VALUE</Text>
                            <Text strong style={{ fontSize: 22, color: '#B11E6A' }}>₹{totalValue.toLocaleString()}</Text>
                          </div>
                        </div>
                      </>
                    </Card>
                  );
                }

                // EDIT MODE
                return (
                  <Form.List name="products">
                    {(fields, { add, remove }) => {
                      const kitFields = fields.filter(f => {
                        const isKit = leadForm.getFieldValue(['products', f.name, 'isKit']);
                        const kitType = leadForm.getFieldValue(['products', f.name, 'kitType']);
                        return isKit || kitType;
                      });
                      const separateFields = fields.filter(f => {
                        const isKit = leadForm.getFieldValue(['products', f.name, 'isKit']);
                        const kitType = leadForm.getFieldValue(['products', f.name, 'kitType']);
                        return !(isKit || kitType);
                      });

                      return (
                        <>
                          {showKitCard && (
                            <Card
                              style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                              title={
                                <Space>
                                  <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                                  <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                                  <span>{hasKit && hasSeparate ? 'Personalized Kit Order Details' : 'Order Details — Products'}</span>
                                </Space>
                              }
                            >
                              <ProductHeaders />
                              {kitFields.map((field, index) => (
                                <ProductItem
                                  key={field.key}
                                  field={field}
                                  index={index}
                                  remove={remove}
                                  disabled={false}
                                  fieldName="products"
                                  showSpecs={isAddLead || isAddCustomer}
                                  isDark={isDark}
                                />
                              ))}
                              <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined, isKit: true })} icon={<PlusOutlined />} block
                                style={{ borderRadius: 10, height: 45, borderDashOffset: 4, marginTop: 8 }}>
                                Add Kit Product
                              </Button>
                            </Card>
                          )}

                          {showSeparateCard && (
                            <Card
                              style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                              title={
                                <Space>
                                  <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                                  <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                                  <span>{hasKit && hasSeparate ? 'Separate Products Order Details' : 'Order Details — Products'}</span>
                                </Space>
                              }
                            >
                              <ProductHeaders />
                              {separateFields.map((field, index) => (
                                <ProductItem
                                  key={field.key}
                                  field={field}
                                  index={index + kitFields.length}
                                  remove={remove}
                                  disabled={false}
                                  fieldName="products"
                                  showSpecs={isAddLead || isAddCustomer}
                                  isDark={isDark}
                                />
                              ))}
                              <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined, isKit: false })} icon={<PlusOutlined />} block
                                style={{ borderRadius: 10, height: 45, borderDashOffset: 4, marginTop: 8 }}>
                                Add Separate Product
                              </Button>
                            </Card>
                          )}
                        </>
                      );
                    }}
                  </Form.List>
                );
              })()}

              {/* ── Urgent / Emergency Deliveries (Partial) — detail only ─────────── */}
              {isDetail && (record.splitDates || []).length > 0 && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span>Urgent / Emergency Deliveries (Partial)</span></Space>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(record.splitDates || []).map((sd, i) => (
                      <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                        <Text strong style={{ fontSize: 13, color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                          {sd.date ? (typeof sd.date === 'string' ? sd.date : sd.date.format?.('YYYY-MM-DD') || String(sd.date)) : '—'}
                        </Text>
                        {(sd.products || (sd.product ? [{ product: sd.product, qty: sd.qty, notes: sd.note }] : [])).map((p, pi) => (
                          <Row key={pi} gutter={[16, 4]} style={{ marginBottom: 4 }}>
                            <Col xs={24} sm={8}>
                              <Text type="secondary" style={{ fontSize: 11 }}>Product: </Text>
                              <Text strong style={{ fontSize: 13 }}>{p.product || '—'}</Text>
                            </Col>
                            <Col xs={24} sm={6}>
                              <Text type="secondary" style={{ fontSize: 11 }}>Qty: </Text>
                              <Text strong style={{ fontSize: 13 }}>{p.qty || '—'}</Text>
                            </Col>
                            <Col xs={24} sm={10}>
                              <Text type="secondary" style={{ fontSize: 11 }}>Notes: </Text>
                              <Text style={{ fontSize: 13 }}>{p.notes || p.note || '—'}</Text>
                            </Col>
                          </Row>
                        ))}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── Delivery & Payment — unified card ────────── */}
              {(isAddLead || isAddCustomer || isDetail) && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} />
                      <CarOutlined style={{ color: '#fa8c16' }} />
                      <span>Delivery & Payment Details</span>
                    </Space>
                  }
                  extra={usePerCardEdit && (
                    editingSection === 'delivery' ? (
                      <Space size="small">
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('delivery')} style={{ background: '#fa8c16', border: 'none', borderRadius: 6 }}>Save</Button>
                        <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                      </Space>
                    ) : (
                      <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('delivery')} style={{ borderRadius: 6 }}>Edit</Button>
                    )
                  )}
                >
                  {usePerCardEdit && editingSection !== 'delivery' ? (
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <div style={{ padding: '14px 16px', background: 'rgba(250,140,22,0.06)', borderRadius: 10, border: '1px solid rgba(250,140,22,0.15)', height: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>DELIVERY INFO</Text>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Delivery By</Text>
                            <Text strong>{record.deliveryBy || '—'}</Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Transport Cost Scope</Text>
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
                          {record.paymentTerms === '50_ADVANCE_50_AFTER' && record.paymentReminderDate && (
                            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(177,30,106,0.08)', borderRadius: 8 }}>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>BALANCE PAYMENT DUE</Text>
                              <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>
                                {typeof record.paymentReminderDate === 'string'
                                  ? record.paymentReminderDate
                                  : record.paymentReminderDate?.format?.('DD/MM/YYYY') || '—'}
                              </Text>
                            </div>
                          )}
                        </div>
                      </Col>
                      {(record.paymentProofs || []).length > 0 && (
                        <Col xs={24} style={{ marginTop: 12 }}>
                          <div style={{ padding: '14px 16px', background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                              PAYMENT PROOF ({record.paymentProofs.length} file{record.paymentProofs.length > 1 ? 's' : ''})
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {record.paymentProofs.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fff', cursor: 'pointer' }}>
                                  <FileTextOutlined style={{ color: '#B11E6A', fontSize: 14 }} />
                                  <Text style={{ fontSize: 12 }}>{file.name || `Proof ${idx + 1}`}</Text>
                                  {file.size && <Text type="secondary" style={{ fontSize: 11 }}>({(file.size / 1024).toFixed(0)} KB)</Text>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Col>
                      )}
                    </Row>
                  ) : (
                    <>
                  {/* Tentative Date */}
                  <Row gutter={12} style={{ marginBottom: 4 }}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Tentative Date" name="orderDeliveryDate">
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Urgent / Emergency Deliveries (Partial) */}
                  <Divider style={{ margin: '16px 0 12px', fontSize: 12, color: '#ff4d4f', borderColor: 'rgba(255,77,79,0.2)' }}>
                    <Space>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Urgent / Emergency Deliveries (Partial)</span>
                    </Space>
                  </Divider>
                  <Form.List name="splitDates">
                    {(dateFields, { add: addDate, remove: removeDate }) => (
                      <div>
                        {dateFields.map(({ key: dateKey, name: dateName, ...dateRest }) => (
                          <div key={dateKey} style={{ background: isDark ? 'rgba(255,77,79,0.05)' : 'rgba(255,77,79,0.03)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                            <Row gutter={[8, 0]} align="middle" style={{ marginBottom: 8 }}>
                              <Col xs={24} sm={10}>
                                <Form.Item {...dateRest} name={[dateName, 'date']} label="Partial Delivery Date" style={{ marginBottom: 0 }}>
                                  <DatePicker style={{ width: '100%' }} size="small" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={14} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 2 }}>
                                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeDate(dateName)}>
                                  Remove Entry
                                </Button>
                              </Col>
                            </Row>

                            <Form.List name={[dateName, 'products']}>
                              {(prodFields, { add: addProd, remove: removeProd }) => (
                                <div>
                                  {prodFields.map(({ key: prodKey, name: prodName, ...prodRest }) => (
                                    <div key={prodKey} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1px solid rgba(255,77,79,0.12)' }}>
                                      <Row gutter={[8, 0]} align="middle">
                                        <Col xs={24} sm={8}>
                                          <Form.Item {...prodRest} name={[prodName, 'product']} label="Product" style={{ marginBottom: 0 }}>
                                            <Select size="small" placeholder="Select product" allowClear>
                                              {(watchedLeadProducts || []).filter(p => p?.name || p?.kitType).map((p, pi) => (
                                                <Option key={pi} value={p.name || p.kitType}>{p.name || p.kitType}</Option>
                                              ))}
                                            </Select>
                                          </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={4}>
                                          <Form.Item {...prodRest} name={[prodName, 'qty']} label="Qty" style={{ marginBottom: 0 }}>
                                            <InputNumber size="small" style={{ width: '100%' }} min={1} placeholder="Qty" />
                                          </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={9}>
                                          <Form.Item {...prodRest} name={[prodName, 'notes']} label="Notes" style={{ marginBottom: 0 }}>
                                            <Input size="small" placeholder="e.g. First batch 500 units" />
                                          </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={3} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20 }}>
                                          <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => addProd()} style={{ color: '#ff4d4f', padding: '0 4px' }} title="Add product row" />
                                          <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeProd(prodName)} style={{ padding: '0 4px' }} />
                                        </Col>
                                      </Row>
                                    </div>
                                  ))}
                                  {prodFields.length === 0 && (
                                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addProd()} block style={{ borderColor: '#ff4d4f55', color: '#ff4d4f', marginBottom: 4 }}>
                                      + Add Product
                                    </Button>
                                  )}
                                </div>
                              )}
                            </Form.List>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addDate({ products: [{}] })} block style={{ borderColor: '#ff4d4f55', color: '#ff4d4f' }}>
                          Add Urgent / Emergency Delivery (Partial)
                        </Button>
                      </div>
                    )}
                  </Form.List>

                  <DeliveryPaymentFields showUpload />
                  </>
                  )}
                </Card>
              )}

              {/* ── Orders & Payment History — customer detail only ───────── */}
              {isDetail && record.customerId && (() => {
                const hotelOrders = ordersData.filter(o => o.hotelName === record.hotelName);
                const latestOrder = hotelOrders.length > 0 ? hotelOrders[hotelOrders.length - 1] : null;
                const totalOrders = hotelOrders.length;
                const totalPaid = hotelOrders.reduce((s, o) => s + (o.advance || 0), 0);
                const totalAmount = hotelOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
                return (
                  <Card
                    style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#B11E6A' }} /><span>All Order History</span><Tag color="pink" style={{ borderRadius: 20, fontSize: 12 }}>{hotelOrders.length} Order{hotelOrders.length !== 1 ? 's' : ''}</Tag></Space>}
                  >
                    <Row gutter={12} style={{ marginBottom: 16 }}>
                      {[
                        { label: 'Total Orders', value: totalOrders },
                        { label: 'Total Order Value', value: `₹${totalAmount.toLocaleString()}` },
                        { label: 'Total Amount Paid', value: `₹${totalPaid.toLocaleString()}` },
                        { label: 'Balance Due', value: `₹${(totalAmount - totalPaid).toLocaleString()}` },
                      ].map((s, i) => (
                        <Col xs={12} sm={6} key={i}>
                          <div style={{ padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(177,30,106,0.04)', borderRadius: 10, border: '1px solid #B11E6A22', textAlign: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{s.label}</Text>
                            <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>{s.value}</Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    {hotelOrders.length > 0 ? (
                      <Table
                        dataSource={hotelOrders}
                        size="small"
                        pagination={false}
                        columns={[
                          {
                            title: 'Order ID — Products', key: 'oid_products',
                            render: (_, r) => (
                              <div>
                                <Text strong style={{ color: '#B11E6A', fontFamily: 'monospace', fontSize: 13, display: 'block' }}>{r.oid}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {(r.products || []).map(p => p.name).join(', ') || '—'}
                                </Text>
                              </div>
                            )
                          },
                          { title: 'Date', dataIndex: 'date', render: v => v || '—' },
                          { title: 'Total', dataIndex: 'totalAmount', render: v => <Text strong>₹{(v || 0).toLocaleString()}</Text> },
                          { title: 'Advance Paid', dataIndex: 'advance', render: v => <Text style={{ color: '#52c41a' }}>₹{(v || 0).toLocaleString()}</Text> },
                          { title: 'Balance', key: 'balance', render: (_, r) => <Text style={{ color: '#fa8c16' }}>₹{((r.totalAmount || 0) - (r.advance || 0)).toLocaleString()}</Text> },
                          { title: 'Status', dataIndex: 'status', render: v => <Tag color={STATUS_COLORS[v] || 'blue'} style={{ borderRadius: 12 }}>{v}</Tag> },
                          {
                            title: 'Action', key: 'actions', render: (_, r) => (
                              <Button size="small" icon={<WarningOutlined />} style={{ color: '#ff4d4f', borderColor: '#ff4d4f55', fontSize: 11 }} onClick={() => openComplaintModal(r)}>
                                Complaint
                              </Button>
                            )
                          },
                        ]}
                      />
                    ) : (
                      <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>No orders yet for this customer.</Text>
                    )}
                  </Card>
                );
              })()}

              {/* ── Complaints tab — detail only ─────────────────────── */}
              {isDetail && (() => {
                const hotelComplaints = complaintsData.filter(c => c.hotelName === record.hotelName);
                return (
                  <Card
                    style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /><span>Complaints</span><Tag color="red" style={{ borderRadius: 20 }}>{hotelComplaints.length}</Tag></Space>}
                  >
                    {hotelComplaints.length > 0 ? (
                      <Table
                        dataSource={hotelComplaints}
                        size="small"
                        pagination={false}
                        columns={[
                          { title: 'Order ID', dataIndex: 'orderId', render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                          { title: 'Description', dataIndex: 'description', ellipsis: true },
                          { title: 'Raised At', dataIndex: 'raisedAt', render: v => fmtDateTimeShort(v) },
                          { title: 'Status', dataIndex: 'status', render: v => <Tag color={v === 'Open' ? 'red' : 'green'} style={{ borderRadius: 12 }}>{v}</Tag> },
                        ]}
                      />
                    ) : (
                      <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>No complaints raised.</Text>
                    )}
                  </Card>
                );
              })()}

              {/* ── Follow-up History — detail only ──────────────────── */}
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
                        padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc',
                        borderRadius: 10, borderLeft: '3px solid #B11E6A',
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

            {/* Quick Actions & History — detail only */}
            {isDetail && (
              <Col span={24}>
                <Row gutter={16}>
                  <Col xs={24} lg={12}>
                    <Card
                      style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                      title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Quick Actions</span></Space>}
                    >
                      <Row gutter={12}>
                        <Col span={12}>
                          <Button icon={<WhatsAppOutlined />} block
                            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                            onClick={() => sendViaWhatsApp(record)}
                          >WhatsApp</Button>
                        </Col>
                        <Col span={12}>
                          <Button icon={<EditOutlined />} block
                            style={{ borderRadius: 10, height: 44 }}
                            onClick={() => openAddLead(record)}
                          >Edit Details</Button>
                        </Col>
                        {(record.leadId && !record.customerId) && (
                          <>
                            <Col span={12} style={{ marginTop: 12 }}>
                              <Button icon={<FileTextOutlined />} block
                                style={{ background: '#B11E6A', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                                onClick={() => startQuotationFromLead(record)}
                              >Convert to Quotation</Button>
                            </Col>
                            <Col span={12} style={{ marginTop: 12 }}>
                              <Button icon={<ArrowRightOutlined />} block
                                style={{ background: '#722ed1', color: '#fff', border: 'none', borderRadius: 10, height: 44 }}
                                onClick={() => convertLeadToNegotiation(record)}
                              >Convert to Negotiation</Button>
                            </Col>
                          </>
                        )}
                      </Row>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card
                      style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                      title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><HistoryOutlined style={{ color: '#fa8c16' }} /><span>Status Timeline</span></Space>}
                    >
                      {(record.statusHistory || []).length === 0 ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>No history yet.</Text>
                      ) : (
                        <Timeline
                          mode="left"
                          items={[...(record.statusHistory || [])].reverse().map((h, i) => ({
                            color: STATUS_COLORS[h.status] || '#ccc',
                            dot: i === 0 ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLORS[h.status] || '#ccc', border: '2px solid #fff', boxShadow: `0 0 0 3px ${STATUS_COLORS[h.status] || '#ccc'}` }} /> : undefined,
                            label: (
                              <Text style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? (isDark ? '#fff' : '#222') : (isDark ? '#aaa' : '#555') }}>
                                {fmtDateTimeShort(h.changedAt)}
                              </Text>
                            ),
                            children: (
                              <Tag color={STATUS_COLORS[h.status] || 'default'} style={{ borderRadius: 20, fontSize: 13, padding: '2px 12px', fontWeight: i === 0 ? 700 : 400 }}>
                                {h.status}
                              </Tag>
                            ),
                          }))}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
        </Form>
        {/* Raise Complaint Modal — handled via shared modal at end of file */}
      </motion.div>
    );
  }

  // ─── Table view ────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Sales Team" items={[{ label: 'Sales Team' }]} style={{ marginBottom: 0 }} />
        <Space size={8}>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Tooltip title="Ensure CSV follows sample format">
            <Button icon={<UploadOutlined />}>Import</Button>
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={() => message.info('Sample CSV download started...')}>Sample CSV</Button>
          {(activeTab === 'leads' || activeTab === 'customers') && (
            <Button type="primary" icon={<PlusOutlined />}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
              onClick={() => {
                setSelectedRecord(null);
                leadForm.resetFields();
                leadForm.setFieldsValue(newLeadDefaults);
                if (activeTab === 'leads') setViewMode('add-lead');
                else if (activeTab === 'customers') setViewMode('add-customer');
              }}
            >
              {activeTab === 'leads' ? 'Add Lead' : 'Add Party'}
            </Button>
          )}
        </Space>
      </div>




      {/* Individual Overall Performance Summary */}
      <div style={{ marginBottom: 16 }}>
        {(() => {
          const totalTarget = PERFORMANCE_TARGETS.reduce((s, t) => s + t.target, 0);
          const totalAchieved = PERFORMANCE_TARGETS.reduce((s, t) => s + t.achieved, 0);
          const totalPercent = (totalAchieved / totalTarget) * 100;

          const milestones = [
            { percent: 25, label: '1/4', reward: PERFORMANCE_TARGETS.map(t => t.milestones.q1).join(' + ') },
            { percent: 50, label: '1/2', reward: PERFORMANCE_TARGETS.map(t => t.milestones.q2).join(' + ') },
            { percent: 75, label: '3/4', reward: PERFORMANCE_TARGETS.map(t => t.milestones.q3).join(' + ') },
            { percent: 100, label: 'Full', reward: PERFORMANCE_TARGETS.map(t => t.milestones.full).join(' + ') },
          ];

          return (
            <Card style={{ borderRadius: 16, border: '1px solid #B11E6A22', background: isDark ? '#1E1E2E' : '#fff', boxShadow: '0 4px 20px rgba(177,30,106,0.06)', padding: '10px 20px', margin: '0 0 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Individual Overall Performance</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                    <Title level={2} style={{ margin: 0, color: '#B11E6A' }}>₹{totalAchieved.toLocaleString()}</Title>
                    <Text type="secondary">of ₹{totalTarget.toLocaleString()}</Text>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Title level={3} style={{ margin: 0, color: '#B11E6A' }}>{totalPercent.toFixed(1)}%</Title>
                </div>
              </div>




              <div style={{ position: 'relative', padding: '0 0 95px', width: '100%' }}>
                <div style={{ padding: '15px 0' }}>
                  <Progress
                    percent={Math.round(totalPercent)}
                    strokeColor="#B11E6A"
                    trailColor={isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'}
                    strokeWidth={10}
                    showInfo={false}
                    status="active"
                  />
                </div>
                {milestones.map((m) => {
                  const isReached = totalPercent >= m.percent;
                  return (
                    <div key={m.percent} style={{ position: 'absolute', left: `${m.percent}%`, top: 22, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 160 }}>
                      <div style={{ width: 2, height: 20, background: isReached ? '#B11E6A' : (isDark ? '#444' : '#ddd'), borderRadius: 1, marginBottom: 4 }} />
                      <div style={{ padding: '2px 10px', borderRadius: 10, background: isReached ? '#B11E6A' : (isDark ? '#222' : '#f5f5f5'), color: isReached ? '#fff' : '#888', fontSize: 9, fontWeight: 700, boxShadow: isReached ? '0 2px 8px rgba(177,30,106,0.2)' : 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        {isReached ? <CheckOutlined style={{ fontSize: 9 }} /> : null}
                        {m.label} REACHED
                      </div>
                      <div style={{ marginTop: 6, textAlign: 'center', width: '100%' }}>
                        <Tooltip title={m.reward}>
                          <Tag color={isReached ? 'magenta' : 'default'} style={{ margin: '0 0 4px', fontSize: 9, borderRadius: 4, maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <GiftOutlined style={{ marginRight: 3 }} />
                            {isReached ? 'CLAIMED' : 'LOCKED'}
                          </Tag>
                        </Tooltip>
                        <div style={{ fontSize: 9, color: isReached ? '#B11E6A' : '#aaa', lineHeight: 1.2, height: 32, overflow: 'hidden', padding: '0 4px' }}>
                          {m.reward}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}
      </div>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 16px' }}
          tabBarExtraContent={
            <Space size={8}>
              <div style={{ display: 'flex', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5', padding: '4px 8px', borderRadius: 8, border: `1px solid ${borderColor}` }}>
                <DatePicker.RangePicker
                  bordered={false}
                  style={{ width: 260, background: 'transparent' }}
                  onChange={(dates) => {
                    if (dates) {
                      setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                    } else {
                      setDateRange(null);
                    }
                  }}
                />
              </div>
              <Input prefix={<SearchOutlined />} placeholder="Search..." value={searchText}
                onChange={(e) => setSearchText(e.target.value)} allowClear
                style={{ width: 200, borderRadius: 8 }}
              />
            </Space>
          }
          items={[
            {
              key: 'performance',
              label: 'Performance',
              children: (
                <div style={{ padding: '16px 8px' }}>
                  <Title level={4} style={{ marginBottom: 16 }}>Individual Target Progression</Title>

                  {/* Per-target stats cards */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    {PERFORMANCE_TARGETS.map((t, i) => {
                      const pct = Math.round((t.achieved / t.target) * 100);
                      return (
                        <Col xs={24} sm={12} lg={6} key={t.key}>
                          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                            <Card
                              style={{ borderRadius: 14, border: `1px solid #B11E6A22`, background: isDark ? '#1E1E2E' : '#fff', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                              styles={{ body: { padding: '16px 18px' } }}
                            >
                              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{t.label}</Text>
                              <Text strong style={{ fontSize: 22, color: '#B11E6A', display: 'block', lineHeight: 1.2 }}>₹{t.achieved.toLocaleString()}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>of ₹{t.target.toLocaleString()}</Text>
                              <Progress percent={pct} size="small" strokeColor="#B11E6A" trailColor={isDark ? '#333' : '#f0f0f0'} showInfo={false} style={{ marginTop: 10, marginBottom: 4 }} />
                              <Text style={{ fontSize: 11, color: '#B11E6A', fontWeight: 600 }}>{pct}% achieved</Text>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>


                </div>
              ),
            },
            {
              key: 'leads',
              label: 'Leads',
              children: (
                <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                  <Table
                    dataSource={filtered(leadsData)}
                    columns={leadColumns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                    onRow={(record) => ({ onClick: () => openDetailNextScreen(record) })}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ),
            },
            {
              key: 'reminders',
              label: 'Reminders',
              children: (
                <div className="table-responsive" style={{ padding: '16px 4px 4px' }}>
                  <Table
                    dataSource={REMINDERS_DATA}
                    columns={[
                      { title: 'Lead ID', dataIndex: 'leadId', key: 'leadId', width: 110, render: (v) => <Text strong style={{ color: '#B11E6A', fontFamily: 'monospace', fontSize: 13 }}>{v || '—'}</Text> },
                      { title: 'Type', dataIndex: 'type', key: 'type', width: 150, render: (t) => <Tag color={t.includes('Payment') ? 'error' : t.includes('Alert') ? 'warning' : 'processing'} style={{ fontSize: 13 }}>{t}</Tag> },
                      { title: 'Party', dataIndex: 'customer', key: 'customer', width: 150, render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text> },
                      {
                        title: 'Details', key: 'details', width: 200, render: (_, r) => (
                          <Text style={{ fontSize: 13 }}>{r.amount ? `₹${r.amount.toLocaleString()} (${r.daysDelayed} days overdue)` : r.topic || `${r.occupancy} occupancy`}</Text>
                        )
                      },
                      {
                        title: 'Reminder Date & Time', key: 'reminderDateTime', width: 160, render: (_, r) => (
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ fontSize: 13, color: '#B11E6A' }}>{r.reminderDate || r.dueDate || '—'}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{r.reminderTime || '—'}</Text>
                          </Space>
                        )
                      },
                      { title: 'Action', key: 'action', width: 140, render: (_, r) => <Text style={{ fontSize: 13 }}>{r.dueDate ? 'Review Quotation' : r.action || 'Follow Up'}</Text> },
                      { title: 'Sales Person', dataIndex: 'salesPerson', key: 'salesPerson', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text> },
                    ]}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
            {
              key: 'quotations',
              label: 'Quotations & Negotiations',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                    <SectionDivider title="Current Quotations" />
                    <Table dataSource={filtered(quotationsData)} columns={quotationColumns} pagination={{ pageSize: 5, size: 'small' }} size="small" rowKey="key"
                      scroll={{ x: 'max-content' }} onRow={(record) => ({ onClick: () => openQuotationDetail(record) })} style={{ cursor: 'pointer' }} />
                  </div>
                  <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                    <SectionDivider title="Negotiations In Progress" />
                    <Table dataSource={filtered(negotiationsData)} columns={negotiationColumns} pagination={{ pageSize: 5, size: 'small' }} size="small" rowKey="key"
                      scroll={{ x: 'max-content' }} onRow={(record) => ({ onClick: () => openNegotiationDetail(record) })} style={{ cursor: 'pointer' }} />
                  </div>
                </div>
              ),
            },
            {
              key: 'orders',
              label: 'Orders',
              children: (
                <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                  <Table
                    dataSource={filtered(ordersData)}
                    columns={orderColumns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                    onRow={(record) => ({ onClick: () => openOrderDetail(record) })}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ),
            },
            {
              key: 'customers',
              label: 'Parties',
              children: (
                <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                  <Table
                    dataSource={filtered(customersData)}
                    columns={customerColumns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                    onRow={(record) => ({ onClick: () => openDetailNextScreen(record) })}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              ),
            },
            {
              key: 'complaints',
              label: 'Complaints',
              children: (
                <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button
                      icon={<WarningOutlined />}
                      style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => openComplaintModal(null)}
                    >
                      Raise Complaint
                    </Button>
                  </div>
                  <Table
                    dataSource={filtered(complaintsData)}
                    columns={complaintColumns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ── Raise Complaint Modal ─────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>{complaintOrder ? `Raise Complaint — ${complaintOrder.oid}` : 'Raise Complaint'}</span>
          </Space>
        }
        open={complaintModalOpen}
        onCancel={() => { setComplaintModalOpen(false); complaintForm.resetFields(); }}
        width={Math.min(580, window.innerWidth - 32)}
        footer={[
          <Button key="cancel" onClick={() => { setComplaintModalOpen(false); complaintForm.resetFields(); }}>Cancel</Button>,
          <Button key="submit" type="primary" style={{ background: '#ff4d4f', border: 'none' }} onClick={submitComplaint}>Submit Complaint</Button>,
        ]}
      >
        <Form form={complaintForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Order ID" name="orderId" rules={[{ required: true, message: 'Please select an Order ID' }]}>
                {complaintOrder ? (
                  <Input disabled value={complaintOrder.oid} />
                ) : (
                  <Select placeholder="Select Order ID" showSearch optionFilterProp="children">
                    {ordersData.map(o => (
                      <Option key={o.oid} value={o.oid}>{o.oid} — {o.hotelName}</Option>
                    ))}
                  </Select>
                )}
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Raised Date" name="raisedDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Raised Time" name="raisedTime">
                <Input type="time" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Complaint Description" name="description" rules={[{ required: true, message: 'Please describe the complaint' }]}>
                <Input.TextArea rows={4} placeholder="E.g., Missing items in the last delivery" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                label="Attach Evidence (Optional)"
                name="files"
                valuePropName="fileList"
                getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
              >
                <Upload beforeUpload={() => false} multiple accept="image/*,.pdf,.doc,.docx" listType="picture">
                  <Button icon={<UploadOutlined />} style={{ borderColor: '#ff4d4f55', color: '#ff4d4f' }}>Upload Files</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

    </div>
  );
}
