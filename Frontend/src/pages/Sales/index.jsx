import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Tabs, Card, Table, Button, Tag, Space, Input, Select, Modal, Form, Row, Col, Typography,
  Drawer, Steps, Divider, Badge, InputNumber, Tooltip, Checkbox, Slider, Upload, Progress,
  DatePicker, Descriptions, Timeline, AutoComplete, Switch,
  Spin,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  FileTextOutlined, PhoneOutlined, MailOutlined, UserOutlined,
  WhatsAppOutlined, MinusCircleOutlined, CheckOutlined,
  DownloadOutlined, UploadOutlined, ArrowRightOutlined,
  BankOutlined, EnvironmentOutlined, TeamOutlined, CalendarOutlined,
  ShoppingCartOutlined, SettingOutlined, CarOutlined, CreditCardOutlined,
  HistoryOutlined, StarOutlined, SaveOutlined, GiftOutlined, TrophyOutlined,
  WarningOutlined, ExclamationCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  useGetLeadsQuery,
  useGetSalesQuotationsQuery,
  useGetNegotiationsQuery,
  useUpdateNegotiationMutation,
  useGetSalesOrdersQuery,
  useGetSalesOrderQuery,
  useGetComplaintsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStatusMutation,
  useDeleteLeadMutation,
  useAssignLeadMutation,
  useCreateSalesQuotationMutation,
  useUpdateSalesQuotationMutation,
  useConvertToNegotiationMutation,
  useConvertLeadToNegotiationMutation,
  useConvertToOrderMutation,
  useCreateSalesOrderMutation,
  useUpdateSalesOrderMutation,
  useUpdateSalesOrderStatusMutation,
  useCreateComplaintMutation,
  useUpdateComplaintStatusMutation,
  useGetMyPerformanceQuery,
  useGetStaffQuery,
  useGetUsersQuery,
  useGetKitsQuery,
  useGetPartiesQuery,
  useGetPartyOrdersQuery,
  useGetOrdersByHotelNameQuery,
  useGetRemindersQuery,
  useGetHotelNamesQuery,
  useLazyLookupHotelQuery,
  useGetComplaintHistoryQuery,
  useGetItemsQuery,
  useUploadFilesMutation,
} from '../../store/api/apiSlice';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import SelectWithAdd from '../../components/common/SelectWithAdd';

const { Text, Title } = Typography;
const { Option } = Select;
// const { RangePicker } = DatePicker;


// ─── Constants ────────────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  { value: 'BEFORE_100', label: '100% Payment' },
  { value: 'ON_DISPATCH', label: '50% Advance, 50% on Dispatch' },
  { value: '50_ADVANCE_50_AFTER', label: '50% adv 50% on delivery' },
  { value: 'CREDIT_10_30', label: 'Credit (10days to 1 month)' },
];

const PAYMENT_LABELS = {
  BEFORE_100: 'PAYMENT BEFORE 100%',
  ON_DISPATCH: 'ON THE DATE OF DISPATCH',
  '50_ADVANCE_50_AFTER': '50% ADV 50% ON DELIVERY',
  CREDIT_10_30: 'CREDIT (10 DAYS TO 1 MONTH)',
};

const COLLECTION_METHODS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'NEFT_RTGS', label: 'NEFT / RTGS' },
  { value: 'OTHER', label: 'Other' },
];

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
  // Payment statuses
  Paid: '#52c41a',
  'Partially Paid': '#fa8c16',
  Unpaid: '#ff4d4f',
  'In Process': '#1890ff',
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


const REMINDERS_DATA = [];

const fmtDateTime = (v) =>
  v ? dayjs(v).toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fmtDateTimeShort = (v) =>
  v ? dayjs(v).toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—';



// ─── Helpers ──────────────────────────────────────────────────────────
// Unwrap products stored as [{"0":{...}}] (index-keyed objects) back to [{...}]
function normalizeProducts(products) {
  if (!Array.isArray(products)) return products;
  return products.flatMap((p) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return [p];
    const keys = Object.keys(p);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => p[k]);
    }
    return [p];
  });
}

function prepareFormValues(data) {
  if (!data) return data;
  const processed = { ...data };
  // Map backend field names → form field names for alt contact
  if (processed.altRole !== undefined && processed.alternativeRole === undefined) processed.alternativeRole = processed.altRole;
  if (processed.altName !== undefined && processed.alternativeName === undefined) processed.alternativeName = processed.altName;
  if (processed.altNumber !== undefined && processed.alternativePhone === undefined) processed.alternativePhone = processed.altNumber;
  // Map backend priorityNote → form mentionPriority
  if (processed.priorityNote !== undefined && processed.mentionPriority === undefined) processed.mentionPriority = processed.priorityNote;
  const dateFields = [
    'followUpDate', 'orderDeliveryDate', 'quotationDate',
    'paymentReminderDate', 'creditDueDate', 'date', 'expectedDelivery',
    'raisedDate', 'softwareExpiryDate', 'negDate', 'quoteDate',
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

  if (processed.products) processed.products = normalizeProducts(processed.products);

  return processed;
}

function calcTotal(products = []) {
  return products.filter(Boolean).reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0), 0);
}

function calcGrandTotal(products = []) {
  return products.filter(Boolean).reduce((s, p) => {
    const base = (Number(p.qty) || 0) * (Number(p.rate) || 0);
    return s + base + base * ((Number(p.gst) || 0) / 100);
  }, 0);
}

function calcGstAmount(products = []) {
  return products.filter(Boolean).reduce((s, p) =>
    s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
}

function generateWhatsAppText(data) {
  const lines = (data.products || []).filter(Boolean).map(p => `${p.name} - ${p.qty}(${p.rate})`).join('\n');
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

// ─── Sub-components ───────────────────────────────────────────────────
function ProductItem({ field, index, remove, disabled, fieldName, showSpecs, isDark, inventoryItems = [], inventoryItemsData = [], kits = [] }) {
  const { name, key, ...rest } = field;
  const isKit = Form.useWatch([fieldName, name, 'isKit']);
  const kitType = Form.useWatch([fieldName, name, 'kitType']);
  const qty = Form.useWatch([fieldName, name, 'qty']);
  const rate = Form.useWatch([fieldName, name, 'rate']);
  const gst = Form.useWatch([fieldName, name, 'gst']);
  const selectedName = Form.useWatch([fieldName, name, 'name']);

  const form = Form.useFormInstance();
  const [isLocalEdit, setIsLocalEdit] = React.useState(true);
  const isItemDisabled = disabled || !isLocalEdit;

  // For kit items, kitType is the registered Form.Item field; selectedName (name field) can get
  // cleared when the conditional Form.Item switches from non-kit to kit mode on first render.
  // Use kitType as primary lookup for kit items to avoid that stale-undefined issue.
  const invItem = React.useMemo(
    () => {
      const lookupKey = isKit ? kitType : selectedName;
      return lookupKey ? inventoryItemsData.find((i) => i.itemName === lookupKey) : undefined;
    },
    [isKit, kitType, selectedName, inventoryItemsData],
  );

  const handleProductSelect = (value) => {
    const item = inventoryItemsData.find((i) => i.itemName === value);
    if (!item) return;
    if (item.sellingPrice) form.setFieldValue([fieldName, name, 'rate'], item.sellingPrice);
    if (item.packingMaterial) form.setFieldValue([fieldName, name, 'packingMaterial'], item.packingMaterial);
    if (item.materialCategory) form.setFieldValue([fieldName, name, 'materialCategory'], item.materialCategory);
    if (item.brand) form.setFieldValue([fieldName, name, 'brand'], item.brand);
  };

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
      {/* Hidden fields to register so Form can read them */}
      <Form.Item {...rest} name={[name, 'isKit']} hidden noStyle><Input /></Form.Item>
      <Form.Item {...rest} name={[name, 'kitName']} hidden noStyle><Input /></Form.Item>
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
              <Form.Item {...rest} name={[name, 'name']} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Product required' }]}>
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  placeholder="Select Product"
                  disabled={isItemDisabled}
                  size="small"
                  style={{ width: '100%' }}
                  options={inventoryItems}
                  onSelect={handleProductSelect}
                  notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No items in inventory</span>}
                />
              </Form.Item>
            ) : (
              <>
                {/* Keep 'name' registered in kit mode so it isn't cleared when the non-kit branch unmounts */}
                <Form.Item {...rest} name={[name, 'name']} hidden noStyle><Input /></Form.Item>
                <Form.Item {...rest} name={[name, 'kitType']} style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Kit required' }]}>
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder="Select Product"
                    disabled={isItemDisabled}
                    size="small"
                    style={{ width: '100%' }}
                    options={inventoryItems}
                    onSelect={(val) => {
                      form.setFieldValue([fieldName, name, 'name'], val);
                      const item = inventoryItemsData.find((i) => i.itemName === val);
                      if (!item) return;
                      if (item.sellingPrice) form.setFieldValue([fieldName, name, 'rate'], item.sellingPrice);
                      if (item.packingMaterial) form.setFieldValue([fieldName, name, 'packingMaterial'], item.packingMaterial);
                      if (item.materialCategory) form.setFieldValue([fieldName, name, 'materialCategory'], item.materialCategory);
                      if (item.brand) form.setFieldValue([fieldName, name, 'brand'], item.brand);
                    }}
                    onClear={() => {
                      form.setFieldValue([fieldName, name, 'name'], undefined);
                    }}
                    notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No items in inventory</span>}
                  />
                </Form.Item>
              </>
            )}
            {invItem && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                <Tag
                  color={invItem.currentStock <= 0 ? 'red' : invItem.currentStock <= invItem.minStock ? 'orange' : 'green'}
                  style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 5px' }}
                >
                  Stock: {invItem.currentStock} {invItem.unit}
                </Tag>
                {invItem.category && (
                  <Tag style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 5px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: isDark ? '#aaa' : '#666' }}>
                    {invItem.category}
                  </Tag>
                )}
              </div>
            )}
          </Col>

          {/* Display Unit & Size now live once at the kit-card header (see kit card) */}

          {/* Qty, Rate, GST & Sticker/Printing */}
          <Col flex="auto">
              <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>QTY / RATE / GST</Text>
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
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Col>

          {/* Subtotal Display */}
          <Col flex="none" style={{ textAlign: 'right', minWidth: 100 }}>
            <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>SUBTOTAL</Text>
            <Text strong style={{ display: 'block', fontSize: 16, color: '#B11E6A', lineHeight: 1.2 }}>
              ₹{(Math.round((qty || 0) * (rate || 0) * (1 + (gst || 0) / 100))).toLocaleString()}
            </Text>
            {(gst || 0) > 0 && (
              <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                incl. {gst}% GST
              </Text>
            )}
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

          <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item {...rest} name={[name, 'logo']} label={<span style={{ fontSize: 11 }}>Logo</span>} style={{ marginBottom: 0 }}>
                <SelectWithAdd defaultOptions={[{ value: 'YES', label: 'YES' }, { value: 'NO', label: 'NO' }]} placeholder="Logo?" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item {...rest} name={[name, 'packingMaterial']} label={<span style={{ fontSize: 11 }}>Packing Material</span>} style={{ marginBottom: 0 }}>
                <SelectWithAdd field="packingMaterial" defaultOptions={PACKING_MATERIAL_OPTIONS} placeholder="Select / Add" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item {...rest} name={[name, 'materialCategory']} label={<span style={{ fontSize: 11 }}>Material Category</span>} style={{ marginBottom: 0 }}>
                <SelectWithAdd field="materialCategory" defaultOptions={MATERIAL_CATEGORY_OPTIONS} placeholder="Eco / Plastic / Wooden" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item {...rest} name={[name, 'brand']} label={<span style={{ fontSize: 11 }}>Brand</span>} style={{ marginBottom: 0 }}>
                <SelectWithAdd field="brand" defaultOptions={[]} placeholder="Select / Add brand" disabled={isItemDisabled} size="small" />
              </Form.Item>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Form.Item {...rest} name={[name, 'otherSpecs']} label={<span style={{ fontSize: 11 }}>Other Specs</span>} style={{ marginBottom: 0 }}>
                <Input placeholder="e.g. Special handle" size="small" disabled={isItemDisabled} />
              </Form.Item>
            </div>
          </div>

          {isKit && (() => {
            const kitNameFromRow = form.getFieldValue([fieldName, name, 'kitName']);
            const selectedKit = kits.find((k) => k.kitName === (kitNameFromRow || kitType));
            const kitProducts = selectedKit?.products || [];
            return (
              <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9f9f9', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.03)', marginTop: 8 }}>
                <Text strong style={{ fontSize: 11, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Kit Contents:</Text>
                {kitProducts.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {kitType ? 'No products in this kit' : 'Select a kit to see its contents'}
                  </Text>
                ) : (
                  <Space wrap size={6}>
                    {kitProducts.map((p, i) => (
                      <Tag key={i} style={{ borderRadius: 12, fontSize: 11, background: isDark ? 'rgba(177,30,106,0.15)' : 'rgba(177,30,106,0.08)', border: '1px solid rgba(177,30,106,0.2)', color: '#B11E6A' }}>
                        {p.productName} ×{p.qty}{p.unit ? ` ${p.unit}` : ''}
                      </Tag>
                    ))}
                  </Space>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function ProductFormList({ fieldName = 'products', disabled = false, showSpecs = false, inventoryItems = [], inventoryItemsData = [], kits = [] }) {
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
              inventoryItems={inventoryItems}
              inventoryItemsData={inventoryItemsData}
              kits={kits}
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
  const leadType = Form.useWatch('leadType');
  const [uploadFilesMutation] = useUploadFilesMutation();
  const makeCloudinaryRequest = (folder) => async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('files', file);
    try {
      const res = await uploadFilesMutation({ formData, folder }).unwrap();
      const uploaded = res.data?.[0];
      if (uploaded) { file.url = uploaded.url; file.cloudPublicId = uploaded.public_id; file.thumbUrl = uploaded.url; onSuccess(uploaded, file); }
      else onError(new Error('Upload failed'));
    } catch (err) { onError(err); }
  };
  const is5050 = paymentTerms === '50_ADVANCE_50_AFTER';
  const isCredit = paymentTerms === 'CREDIT_10_30';

  if (leadType === 'SAMPLE') return null;

  return (
    <Row gutter={12}>
      <Col xs={24} sm={12}>
        <Form.Item label="Delivery By" name="deliveryBy" initialValue="HNG">
          <SelectWithAdd field="deliveryBy" defaultOptions={[{ value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Transport Cost Scope" name="transportationBy">
          <SelectWithAdd field="transportationBy" defaultOptions={[{ value: 'CLIENT', label: 'Client' }, { value: 'TTDC', label: 'TTDC' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="forwardingCharge" valuePropName="checked">
          <Checkbox disabled={disabled}>Forwarding charge applicable</Checkbox>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label="Payment Terms" name="paymentTerms">
          <Select disabled={disabled} allowClear>
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

      {/* Date picker for Credit (10days to 1 month) */}
      {isCredit && !disabled && (
        <Col xs={24} sm={12}>
          <Form.Item
            label="Credit Due Date"
            name="creditDueDate"
            rules={[{ required: true, message: 'Select credit due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      )}
      {isCredit && disabled && (
        <Col xs={24} sm={12}>
          <Form.Item label="Credit Due Date" name="creditDueDate">
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
              customRequest={makeCloudinaryRequest('payment-proofs')}
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
// Export an array of plain rows to a CSV file. Headers are derived from the
// scalar (non-object) keys of the rows so it adapts to whatever shape the data has.
const exportRowsToCSV = (rows, filename) => {
  if (!rows || rows.length === 0) return false;
  const skip = new Set(['key', '_id', '__v', 'products', 'items', 'rounds', 'revisionHistory', 'partialDates', 'splitDates']);
  const headers = Object.keys(rows[0]).filter(
    (k) => !skip.has(k) && rows.every((r) => r[k] == null || typeof r[k] !== 'object'),
  );
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

// Minimal CSV parser → array of objects keyed by the header row. Handles
// quoted fields, escaped quotes ("") and commas/newlines inside quotes.
const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') pushField();
    else if (c === '\n') pushRow();
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) =>
    headers.reduce((obj, h, idx) => { obj[h] = (r[idx] ?? '').trim(); return obj; }, {}),
  );
};

const LEAD_CSV_FIELDS = ['hotelName', 'phone', 'billingName', 'contactPerson', 'pocDesignation', 'email', 'location', 'source', 'status', 'gstNumber', 'city', 'state', 'pincode', 'notes'];

const KNOWN_PRODUCT_NAMES = new Set([
  'Soap', 'Paste', 'Brush', 'Raizer', 'Gel', 'Face Kit Combo', 'Body Kit Combo',
  'Soap 15grm', 'Single Brush', 'Shampoo 15ml',
  'DENTAL_KIT', 'SHAVING_KIT', 'CARE_KIT',
]);

export default function Sales() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth?.user);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [leadsData, setLeadsData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [quotationsData, setQuotationsData] = useState([]);
  const [negotiationsData, setNegotiationsData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [activeTab, setActiveTab] = useState('performance');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [leadStatusFilter, setLeadStatusFilter] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);
  const [quotStatusFilter, setQuotStatusFilter] = useState(null);
  const [reminderTypeFilter, setReminderTypeFilter] = useState(null);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Complaint state
  const [complaintsData, setComplaintsData] = useState([]);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintOrder, setComplaintOrder] = useState(null);
  const [complaintForm] = Form.useForm();

  // Lead state
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm] = Form.useForm();
  const [editingSection, setEditingSection] = useState(null);
  const [followupNote, setFollowupNote] = useState('');

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

  // Order quick-edit modal (delivery date + payment)
  const [orderEditModalOpen, setOrderEditModalOpen] = useState(false);
  const [orderEditTarget, setOrderEditTarget] = useState(null);
  const [orderEditForm] = Form.useForm();

  const openOrderEditModal = (order) => {
    setOrderEditTarget(order);
    orderEditForm.setFieldsValue({
      expectedDelivery: order.expectedDelivery ? dayjs(order.expectedDelivery) : null,
      advance: order.advance || 0,
      paymentTerms: order.paymentTerms,
      paymentReminderDate: order.paymentReminderDate ? dayjs(order.paymentReminderDate) : null,
      paymentCollection: order.paymentCollection || [],
    });
    setOrderEditModalOpen(true);
  };

  const saveOrderEdit = () => {
    orderEditForm.validateFields().then(async vals => {
      const newAdvance = vals.advance ?? orderEditTarget.advance ?? 0;
      const newCollection = (vals.paymentCollection || []).filter(e => e.paymentMethod);
      const collTotal = newCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const newPaidAmount = collTotal > 0 ? collTotal : newAdvance;
      const orderTotal = orderEditTarget.total || orderEditTarget.totalAmount || 0;
      const paymentStatus = orderTotal > 0 && newPaidAmount >= orderTotal
        ? 'Paid'
        : newPaidAmount > 0
        ? 'Partially Paid'
        : 'Unpaid';
      const updated = {
        ...orderEditTarget,
        expectedDelivery: vals.expectedDelivery ? vals.expectedDelivery.format('YYYY-MM-DD') : orderEditTarget.expectedDelivery,
        advance: newAdvance,
        paidAmount: newPaidAmount,
        balance: Math.max(0, orderTotal - newPaidAmount),
        paymentTerms: vals.paymentTerms || orderEditTarget.paymentTerms,
        paymentReminderDate: vals.paymentReminderDate ? vals.paymentReminderDate.format('YYYY-MM-DD') : orderEditTarget.paymentReminderDate,
        paymentCollection: newCollection,
        paymentStatus,
      };
      try {
        const backendPatch = {
          id: orderEditTarget._id || orderEditTarget.key,
          expectedDeliveryDate: updated.expectedDelivery || undefined,
          advancePaidAmount: updated.advance,
          advancePaid: updated.advance,
          paidAmount: updated.paidAmount,
          balance: updated.balance,
          paymentTerms: updated.paymentTerms,
          paymentReminderDate: updated.paymentReminderDate || undefined,
          paymentCollection: newCollection,
          paymentStatus,
        };
        await updateSalesOrderMutation(backendPatch).unwrap();
        setOrdersData(prev => prev.map(o => o.key === orderEditTarget.key ? updated : o));
        enqueueSnackbar('Order updated successfully', { variant: 'success' });
        setOrderEditModalOpen(false);
        setOrderEditTarget(null);
      } catch (err) {
        enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update order', { variant: 'error' });
      }
    }).catch(validationErr => {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
    });
  };

  // Watched values for conditional rendering
  const watchedBillType = Form.useWatch('billType', leadForm);
  const watchedHotelType = Form.useWatch('hotelType', leadForm);
  const watchedLeadType = Form.useWatch('leadType', leadForm);
  const watchedProductType = Form.useWatch('productType', leadForm);
  const watchedPriority = Form.useWatch('priority', leadForm);
  const watchedStatus = Form.useWatch('status', leadForm);
  const watchedSoftwareInterest = Form.useWatch('interestedInSoftware', leadForm);
  const watchedOrderProducts = Form.useWatch('products', orderForm);
  const watchedLeadProducts = Form.useWatch('products', leadForm);
  const watchedNegotiationProducts = Form.useWatch('products', negotiationForm);
  const watchedNegRoundValue = Form.useWatch('useRoundedTotal', negotiationForm);
  const watchedLeadPaymentTerms = Form.useWatch('paymentTerms', leadForm);
  const watchedLeadPaymentCollection = Form.useWatch('paymentCollection', leadForm);

  const [gstApiData, setGstApiData] = useState(null);
  const [gstApiLoading, setGstApiLoading] = useState(false);
  const [gstApiError, setGstApiError] = useState(null);
  const [expandedPartyKeys, setExpandedPartyKeys] = useState([]);

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

  const { data: leadsRaw } = useGetLeadsQuery();
  const { data: quotationsRaw } = useGetSalesQuotationsQuery();
  const { data: negotiationsRaw } = useGetNegotiationsQuery();
  const { data: ordersRaw } = useGetSalesOrdersQuery();
  const { data: singleOrderRaw } = useGetSalesOrderQuery(
    selectedRecord?._id,
    { skip: viewMode !== 'order-detail' || !selectedRecord?._id }
  );
  const { data: complaintsRaw } = useGetComplaintsQuery();
  const { data: partiesRaw } = useGetPartiesQuery();
  const { data: remindersRaw } = useGetRemindersQuery();
  const { data: hotelNamesRaw } = useGetHotelNamesQuery();
  const [lookupHotel] = useLazyLookupHotelQuery();
  const remindersData = remindersRaw?.data || [];
  const hotelNameOptions = (hotelNamesRaw?.data || []).map((n) => ({ value: n, label: n }));
  const { data: perfRaw, isLoading: perfLoading } = useGetMyPerformanceQuery();
  const { data: staffRaw } = useGetStaffQuery();
  const { data: usersRaw } = useGetUsersQuery();
  const { data: kitsRaw } = useGetKitsQuery();

  const performanceTargets = perfRaw?.data?.targets || [];
  const performanceRewards = perfRaw?.data?.rewards || {};
  const salesPersonOptions = (usersRaw?.data || [])
    .filter((u) => u.fullName)
    .map((u) => ({ value: u.fullName, label: u.fullName }));
  const kits = kitsRaw?.data || [];
  const kitOptions = kits.map((k) => ({ value: k._id, label: k.kitName }));
  const { data: itemsRaw } = useGetItemsQuery();
  const inventoryItemsRaw = itemsRaw?.data || [];
  const inventoryItems = React.useMemo(
    () => inventoryItemsRaw.map((i) => ({ value: i.itemName, label: i.itemName })),
    [itemsRaw],
  );

  // When a kit is picked in the "Products adding" card, auto-fill its products
  // into the kit product list and set the kit-level display unit & size.
  const applyKitToForm = (kitId) => {
    const kit = kits.find((k) => k._id === kitId);
    if (!kit) return;
    const existing = leadForm.getFieldValue('products') || [];
    const nonKit = existing.filter((p) => p && !(p.isKit || p.kitType));
    // One row per kit product. Marked isKit so they render in the kit card
    // (which carries the shared Display Unit & Size header). The product field
    // shown in the kit card is `kitType`, so we put the product name there.
    // Fall back to inventory item specs when the kit definition has them empty.
    const kitRows = (kit.products || []).map((p) => {
      const invItem = inventoryItemsRaw.find((i) => i.itemName === p.productName);
      return {
        isKit: true,
        kitType: p.productName,
        name: p.productName,
        qty: p.qty,
        rate: p.rate || invItem?.sellingPrice || 0,
        unit: p.unit || invItem?.unit,
        kitName: kit.kitName,
        packingMaterial: p.packingMaterial || invItem?.packingMaterial || '',
        materialCategory: p.materialCategory || invItem?.materialCategory || '',
        brand: p.brand || invItem?.brand || '',
        gst: p.gst || invItem?.gst || 0,
      };
    });
    const pt = leadForm.getFieldValue('productType') || [];
    const nextPt = Array.isArray(pt) ? Array.from(new Set([...pt, 'PERSONALIZED_KIT'])) : ['PERSONALIZED_KIT'];
    leadForm.setFieldsValue({
      productType: nextPt,
      selectedKit: kitId,
      kitDisplayUnit: kit.displayUnit,
      kitSize: kit.size,
      products: [...kitRows, ...nonKit],
    });
  };

  const [createLeadMutation] = useCreateLeadMutation();
  const [updateLeadMutation] = useUpdateLeadMutation();
  const [updateLeadStatusMutation] = useUpdateLeadStatusMutation();
  const [deleteLeadMutation] = useDeleteLeadMutation();
  const [assignLeadMutation] = useAssignLeadMutation();
  const [createSalesQuotationMutation] = useCreateSalesQuotationMutation();
  const [updateSalesQuotationMutation] = useUpdateSalesQuotationMutation();
  const [convertToNegotiationMutation] = useConvertToNegotiationMutation();
  const [convertLeadToNegotiationMutation] = useConvertLeadToNegotiationMutation();
  const [updateNegotiationMutation] = useUpdateNegotiationMutation();
  const [convertToOrderMutation] = useConvertToOrderMutation();
  const [createSalesOrderMutation] = useCreateSalesOrderMutation();
  const [updateSalesOrderMutation] = useUpdateSalesOrderMutation();
  const [updateSalesOrderStatusMutation] = useUpdateSalesOrderStatusMutation();
  const [createComplaintMutation] = useCreateComplaintMutation();
  const [updateComplaintStatusMutation] = useUpdateComplaintStatusMutation();
  const [uploadFilesMutation] = useUploadFilesMutation();

  // Reusable Cloudinary upload handler for AntD Upload components.
  const makeCloudinaryRequest = (folder) => async ({ file, onSuccess, onError, onProgress }) => {
    const formData = new FormData();
    formData.append('files', file);
    try {
      const res = await uploadFilesMutation({ formData, folder }).unwrap();
      const uploaded = res.data?.[0];
      if (uploaded) {
        file.url = uploaded.url;
        file.cloudPublicId = uploaded.public_id;
        file.thumbUrl = uploaded.url;
        onSuccess(uploaded, file);
      } else {
        onError(new Error('Upload failed'));
      }
    } catch (err) {
      onError(err);
      enqueueSnackbar('File upload failed', { variant: 'error' });
    }
  };

  // Helper to normalize backend `items` → frontend `products` (name/qty/rate shape)
  const itemsToProducts = (items = []) =>
    items.map((i) => ({
      name: i.name || i.itemName || '',
      qty: i.qty,
      rate: i.price || i.rate || 0,
      unit: i.unit,
      lineTotal: i.lineTotal,
      logoType: i.logoType,
      size: i.size,
      gst: i.gst || 0,
      boxes: i.boxes || 0,
      packaging: i.packaging || i.packingMaterial || '',
      packingMaterial: i.packingMaterial || i.packaging || '',
      material: i.material || i.materialCategory || '',
      materialCategory: i.materialCategory || i.material || '',
      logo: i.logo,
      sticker: i.sticker,
      brand: i.brand,
      otherSpecs: i.otherSpecs,
      isKit: i.isKit || false,
      kitName: i.kitName || '',
      kitType: i.kitType || '',
    }));

  useEffect(() => {
    if (leadsRaw?.data) setLeadsData((leadsRaw.data).map((l) => {
      const hasProof = (l.paymentProofs || []).length > 0;
      const paymentStatus = !hasProof ? 'Unpaid' : l.paymentTerms === 'BEFORE_100' ? 'Paid' : 'Partially Paid';
      return { ...l, key: l._id, leadId: l.leadCode, hotelName: l.hotelName, status: l.status, salesPerson: l.salesPerson, createdAt: l.createdAt, paymentStatus };
    }));
  }, [leadsRaw]);
  useEffect(() => {
    if (quotationsRaw?.data) setQuotationsData((quotationsRaw.data).map((q) => {
      const collected = (q.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const backendPaid = Number(q.paidAmount) || Number(q.totalPaid) || 0;
      const paidTotal = collected > 0 ? collected : (backendPaid || Number(q.advancePaid || 0));
      const total = Number(q.total || 0);
      const computedStatus = total > 0
        ? (paidTotal >= total ? 'Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid')
        : (q.status || 'Unpaid');
      const paymentStatus = (computedStatus !== 'Unpaid') ? computedStatus
        : (q.paymentStatus === 'Paid' || q.paymentStatus === 'Partially Paid') ? q.paymentStatus
        : 'Unpaid';
      return {
        ...q,
        key: q._id,
        qid: q.quotCode,
        hotelName: q.clientName,
        status: paymentStatus,
        location: q.location || q.locationCity,
        salesPerson: q.salesPerson || q.assignedTo?.fullName,
        totalAmount: total,
        paidAmount: paidTotal,
        balance: total - paidTotal,
        date: q.createdAt?.slice(0, 10),
        billType: q.billType || (q.type === 'GST' ? 'GST' : q.type === 'Non-GST' ? 'NON_GST' : q.type),
        products: q.products?.length ? q.products : itemsToProducts(q.items),
        itemCount: (q.products?.length || q.items?.length || 0),
      };
    }));
  }, [quotationsRaw]);
  useEffect(() => {
    if (negotiationsRaw?.data) setNegotiationsData((negotiationsRaw.data).map((n) => {
      const collected = (n.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const backendPaid = Number(n.paidAmount) || Number(n.totalPaid) || 0;
      const paidTotal = collected > 0 ? collected : (backendPaid || Number(n.advancePaid || 0));
      const total = Number(n.total || 0);
      const computedStatus = total > 0
        ? (paidTotal >= total ? 'Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid')
        : (n.status || 'Unpaid');
      const paymentStatus = (computedStatus !== 'Unpaid') ? computedStatus
        : (n.paymentStatus === 'Paid' || n.paymentStatus === 'Partially Paid') ? n.paymentStatus
        : 'Unpaid';
      return {
        ...n,
        key: n._id,
        nid: n.negCode,
        hotelName: n.clientName,
        status: paymentStatus,
        location: n.location || n.locationCity,
        salesPerson: n.salesPerson || n.assignedTo?.fullName,
        totalAmount: total,
        paidAmount: paidTotal,
        balance: total - paidTotal,
        date: n.createdAt?.slice(0, 10),
        billType: n.billType || (n.type === 'GST' ? 'GST' : n.type === 'Non-GST' ? 'NON_GST' : n.type),
        products: n.products?.length ? n.products : itemsToProducts(n.items),
        itemCount: (n.products?.length || n.items?.length || 0),
      };
    }));
  }, [negotiationsRaw]);
  useEffect(() => {
    if (ordersRaw?.data) setOrdersData((ordersRaw.data).map((o) => {
      const normalizedProducts = o.products?.length ? o.products : itemsToProducts(o.items);
      const advance = o.advancePaidAmount ?? o.advancePaid ?? (typeof o.advance === 'number' ? o.advance : 0);
      const collectionTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      // paidAmount from backend is the authoritative total collected; use it when collection entries aren't in list response
      const backendPaid = Number(o.paidAmount) || Number(o.totalPaid) || Number(o.amountCollected) || 0;
      const paidTotal = collectionTotal > 0 ? collectionTotal : (backendPaid || advance);
      // Compute subtotal from products (qty*rate, always reliable).
      // For GST: prefer per-product % if set; fall back to stored gstAmount (handles converted/legacy orders).
      const subtotal = Math.round(calcTotal(normalizedProducts));
      const gstFromProducts = Math.round(calcGstAmount(normalizedProducts));
      const storedGst = Number(o.gstAmount) || 0;
      const effectiveGst = gstFromProducts > 0 ? gstFromProducts : storedGst;
      const total = subtotal + effectiveGst;
      // Compute from what we have; if list API omits paymentCollection, fall back to backend status
      const computedStatus = total > 0
        ? (paidTotal >= total ? 'Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid')
        : (advance > 0 ? 'Partially Paid' : 'Unpaid');
      // Trust backend paymentStatus when our computed value is Unpaid but backend says otherwise
      const paymentStatus = (computedStatus !== 'Unpaid')
        ? computedStatus
        : (o.paymentStatus === 'Paid' || o.paymentStatus === 'Partially Paid')
          ? o.paymentStatus
          : 'Unpaid';
      return {
        ...o,
        key: o._id,
        oid: o.orderCode,
        hotelName: o.clientName,
        status: o.status,
        paymentStatus,
        location: o.location || o.locationCity,
        phone: o.clientPhone || o.phone,
        contactPerson: o.contactPerson,
        billingName: o.billingName || o.clientName,
        gstNumber: o.gstNumber,
        gstPercent: o.gstPercent,
        salesPerson: o.salesPerson || o.assignedTo?.fullName,
        detailedAddress: o.detailedAddress,
        city: o.city,
        state: o.state,
        pincode: o.pincode,
        totalAmount: total,
        gstAmount: effectiveGst,
        paidAmount: paidTotal,
        balance: total - paidTotal,
        date: o.createdAt?.slice(0, 10),
        expectedDelivery: o.expectedDeliveryDate ? o.expectedDeliveryDate.slice(0, 10) : o.expectedDelivery,
        advance,
        billType: o.billType || (o.type === 'GST' ? 'GST' : o.type === 'Non-GST' ? 'NON_GST' : o.type),
        products: normalizedProducts,
        itemCount: (normalizedProducts.length || 0),
      };
    }));
  }, [ordersRaw]);

  // When a single order is fetched (order-detail view), sync its accurate payment data back
  // into the list state so the table shows the correct status without a full page reload.
  useEffect(() => {
    const full = singleOrderRaw?.data;
    if (!full?._id) return;
    const prods = full.products?.length ? full.products : itemsToProducts(full.items || []);
    const collTotal = (full.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const adv = Number(full.advancePaidAmount ?? full.advancePaid ?? 0);
    const paidTotal = collTotal > 0 ? collTotal : (Number(full.paidAmount) || adv);
    if (paidTotal <= 0) return;
    const subtotalFull = Math.round(calcTotal(prods));
    const gstFromProdsFull = Math.round(calcGstAmount(prods));
    const storedGstFull = Number(full.gstAmount) || 0;
    const effectiveGstFull = gstFromProdsFull > 0 ? gstFromProdsFull : storedGstFull;
    const total = subtotalFull + effectiveGstFull;
    const newStatus = total > 0 ? (paidTotal >= total ? 'Paid' : 'Partially Paid') : 'Unpaid';
    const orderId = full._id;
    const quotCode = full.quotationId?.quotCode || full.quotationCode;
    setOrdersData(prev => prev.map(o =>
      (o._id === orderId || o.key === orderId)
        ? { ...o, paidAmount: paidTotal, paymentStatus: newStatus, balance: Math.max(0, total - paidTotal) }
        : o
    ));
    if (quotCode) {
      setQuotationsData(prev => prev.map(q =>
        q.qid === quotCode
          ? { ...q, paidAmount: paidTotal, status: newStatus, balance: Math.max(0, (q.totalAmount || 0) - paidTotal) }
          : q
      ));
    }
  }, [singleOrderRaw?.data?._id]);

  useEffect(() => {
    if (complaintsRaw?.data) setComplaintsData((complaintsRaw.data).map((c) => ({ ...c, key: c._id, orderId: c.orderId?.orderCode || c.orderId, hotelName: c.clientName, description: c.description, raisedAt: c.createdAt, salesPerson: c.salesPerson, status: c.status })));
  }, [complaintsRaw]);
  // Derive one row per unique hotel from leads (most-recent lead wins)
  useEffect(() => {
    if (!leadsData.length) return;
    const map = new Map();
    [...leadsData]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(lead => {
        const key = (lead.hotelName || '').toLowerCase().trim();
        if (key && !map.has(key)) map.set(key, lead);
      });
    setCustomersData(Array.from(map.values()).map((lead, i) => ({
      ...lead,
      key: lead.key || lead._id || i,
      customerId: lead.customerId || `HOTEL-${String(lead._id || i).slice(-5)}`,
      hotelName: lead.hotelName,
      location: lead.location || lead.locationCity || '—',
      phone: lead.phone,
      salesPerson: lead.salesPerson || '—',
      createdAt: lead.createdAt,
    })));
  }, [leadsData]);

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
    products: [],
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


  // Build the payload sent to the API. The Lead schema is permissive, so we
  // persist every raw form field (products, productType, kit info, follow-ups,
  // delivery, etc.) AND a few canonical mappings used by listings/search and
  // other modules. This is what makes "fetch all details on edit" work.
  const buildLeadPayload = (values) => {
    const toStr = (v) => (v && v.format ? v.format('YYYY-MM-DD') : v);
    // Get billing fields explicitly from the form store to ensure they're captured
    // even when the billing section card is in read/collapsed mode
    const formStore = leadForm.getFieldsValue(true);
    const billType = values.billType || formStore.billType || 'GST';
    const detailedAddress = values.detailedAddress || formStore.detailedAddress;
    const city = values.city || formStore.city;
    const state = values.state || formStore.state;
    const pincode = values.pincode || formStore.pincode;
    // Extract Cloudinary URLs from file list fields
    const hotelLogoUrl = (values.hotelLogo || []).find(f => f.url)?.url || undefined;
    const paymentProofFiles = (values.paymentProofs || []).map(f => ({
      name: f.name || f.originFileObj?.name,
      url: f.url || f.response?.url,
      public_id: f.cloudPublicId || f.response?.public_id,
      uid: f.uid,
    })).filter(f => f.url);
    return {
      ...values,
      products: normalizeProducts(values.products || []),
      billType,
      detailedAddress,
      city,
      state,
      pincode,
      address: detailedAddress,
      locationCity: values.location,
      location: values.location,
      salesPerson: values.salesPerson,
      hotelType: values.hotelType,
      numRooms: Number(values.rowsInHotel) || undefined,
      generalOccupancy: Number(values.generalOccupancy) || undefined,
      altRole: values.alternativeRole,
      altName: values.alternativeName,
      altNumber: values.alternativePhone,
      interestedSoftware: values.interestedInSoftware === 'YES' || values.interestedInSoftware === true,
      interestedInSoftware: values.interestedInSoftware,
      prevSoftwarePrice: Number(values.previousSoftwarePrice) || undefined,
      previousSoftwarePrice: Number(values.previousSoftwarePrice) || undefined,
      followupDate: toStr(values.followUpDate),
      followupTime: values.followUpTime,
      followUpDate: toStr(values.followUpDate),
      followUpTime: values.followUpTime,
      displayUnit: values.kitDisplayUnit || values.displayUnit,
      hotelLogoUrl: hotelLogoUrl || undefined,
      paymentProofs: paymentProofFiles.length ? paymentProofFiles : (values.paymentProofs || []),
      paymentCollection: (values.paymentCollection || []).filter(e => e.paymentMethod),
      paymentStatus: (() => {
        const collectionEntries = (values.paymentCollection || []).filter(e => Number(e.paidAmount) > 0);
        const collectionTotal = collectionEntries.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        if (collectionTotal > 0) {
          const recordTotal = Math.round(calcGrandTotal(values.products || formStore.products || []));
          return recordTotal > 0 && collectionTotal >= recordTotal ? 'Paid' : 'Partially Paid';
        }
        const proofs = paymentProofFiles.length ? paymentProofFiles : (values.paymentProofs || []);
        if (!proofs.length) return 'Unpaid';
        return values.paymentTerms === 'BEFORE_100' ? 'Paid' : 'Partially Paid';
      })(),
      advancePaid: (() => {
        const collectionTotal = (values.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        return collectionTotal || undefined;
      })(),
      paidAmount: (() => {
        const collectionTotal = (values.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        return collectionTotal || undefined;
      })(),
      priority: Number(values.priority) || 0,
      isPriority: Number(values.priority) > 0,
      priorityNote: values.mentionPriority,
    };
  };

  // Append a follow-up note to the selected lead and persist it.
  const postFollowupNote = async () => {
    const text = (followupNote || '').trim();
    if (!text || !selectedRecord) return;
    const now = dayjs();
    const note = {
      date: now.format('YYYY-MM-DD'),
      time: now.format('hh:mm A'),
      person: currentUser?.fullName || 'Me',
      text,
    };
    const nextHistory = [...(selectedRecord.notesHistory || []), note];
    const updated = { ...selectedRecord, notesHistory: nextHistory };
    try {
      await updateLeadMutation({ id: selectedRecord._id || selectedRecord.key, notesHistory: nextHistory }).unwrap();
      setSelectedRecord(updated);
      setLeadsData(prev => prev.map(l => l.key === updated.key ? updated : l));
      setCustomersData(prev => prev.map(c => c.key === updated.key ? updated : c));
      setFollowupNote('');
      enqueueSnackbar('Follow-up note added', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to add note', { variant: 'error' });
    }
  };

  // ─── Import / Export / Sample CSV ─────────────────────────────────
  const importInputRef = React.useRef(null);

  const handleExport = () => {
    const byTab = {
      leads: leadsData, customers: customersData, quotations: quotationsData,
      negotiations: negotiationsData, orders: ordersData, complaints: complaintsData,
    };
    const rows = byTab[activeTab] || leadsData;
    if (exportRowsToCSV(rows, `${activeTab}-${dayjs().format('YYYY-MM-DD')}.csv`)) {
      enqueueSnackbar(`Exported ${rows.length} record(s) to CSV`, { variant: 'success' });
    } else {
      enqueueSnackbar('Nothing to export in this tab', { variant: 'warning' });
    }
  };

  const downloadSampleCSV = () => {
    const sampleRow = ['Grand Palace Hotel', '9876543210', 'Grand Palace', 'Rajesh Kumar', 'Manager', 'rajesh@example.com', 'Chennai', 'Direct', 'Warm', '33ABCDE1234F1Z5', 'Chennai', 'Tamil Nadu', '600001', 'Sample imported lead'];
    const csv = [
      LEAD_CSV_FIELDS.join(','),
      sampleRow.map((v) => `"${v}"`).join(','),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-leads.csv';
    link.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar('Sample CSV downloaded', { variant: 'info' });
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        enqueueSnackbar('CSV is empty or has no data rows', { variant: 'warning' });
        e.target.value = '';
        return;
      }
      let ok = 0, skipped = 0;
      for (const r of rows) {
        if (!r.hotelName || !r.phone) { skipped++; continue; }
        try {
          await createLeadMutation({
            ...r,
            locationCity: r.location,
            status: r.status || 'Warm',
          }).unwrap();
          ok++;
        } catch { skipped++; }
      }
      enqueueSnackbar(`Imported ${ok} lead(s)${skipped ? `, ${skipped} skipped` : ''}`, { variant: ok ? 'success' : 'warning' });
    } catch (err) {
      enqueueSnackbar('Failed to read CSV file', { variant: 'error' });
    } finally {
      e.target.value = '';
    }
  };

  // Null-out every date field so resetFields never restores an ISO string to a DatePicker
  const DATE_FIELD_NULLS = {
    followUpDate: null, quotationDate: null, paymentReminderDate: null,
    creditDueDate: null, softwareExpiryDate: null, orderDeliveryDate: null,
    negDate: null, quoteDate: null,
  };

  // ─── Lead handlers ────────────────────────────────────────────────
  const openAddLead = (lead = null) => {
    setEditingLead(lead);
    setSelectedRecord(lead);
    leadForm.resetFields();
    if (lead) {
      leadForm.setFieldsValue(prepareFormValues({ ...lead }));
    } else {
      // Explicitly reset every field that appears in the form so no old lead data bleeds through
      leadForm.setFieldsValue({
        ...newLeadDefaults,
        ...DATE_FIELD_NULLS,
        salesPerson: currentUser?.fullName || currentUser?.name || '',
        hotelName: undefined, billingName: undefined, branch: undefined,
        rowsInHotel: undefined, generalOccupancy: undefined,
        contactPerson: undefined, pocDesignation: undefined,
        phone: undefined, email: undefined,
        alternativeRole: undefined, alternativeName: undefined, alternativePhone: undefined,
        location: undefined, destination: undefined, source: undefined,
        gstNumber: undefined, gstPercent: undefined,
        detailedAddress: undefined, city: undefined, state: undefined, pincode: undefined,
        status: undefined, quotationNo: undefined, followUpName: undefined, followUpTime: undefined, followUpStep: undefined,
        interestedInSoftware: undefined, previousSoftware: undefined, previousSoftwarePrice: undefined,
        mentionPriority: undefined, notes: undefined,
        selectedKit: undefined, kitDisplayUnit: undefined, kitSize: undefined,
        specifications: [],
        notesHistory: [],
        hotelLogo: [],
        paymentProofs: [],
        splitDates: [],
        partialDates: [],
      });
    }
    setViewMode(lead?.customerId ? 'add-customer' : 'add-lead');
  };

  const saveLead = async () => {
    try {
      const values = await leadForm.validateFields();
      const now = new Date().toISOString();
      if (editingLead) {
        const prevStatus = editingLead.status;
        const statusChanged = values.status && values.status !== prevStatus;
        const builtPayload = buildLeadPayload(values);
        const updated = {
          ...editingLead,
          ...values,
          paymentStatus: builtPayload.paymentStatus,
          statusHistory: statusChanged
            ? [...(editingLead.statusHistory || []), { status: values.status, changedAt: now }]
            : (editingLead.statusHistory || []),
        };
        try {
          await updateLeadMutation({ id: editingLead._id || editingLead.key, ...builtPayload }).unwrap();
          if (statusChanged) {
            await updateLeadStatusMutation({ id: editingLead._id || editingLead.key, status: values.status }).unwrap();
          }
          if (editingLead.customerId) {
            setCustomersData(prev => prev.map(c => c.key === editingLead.key ? updated : c));
            enqueueSnackbar('Customer updated', { variant: 'success' });
          } else {
            setLeadsData(prev => prev.map(l => l.key === editingLead.key ? updated : l));
            enqueueSnackbar('Lead updated', { variant: 'success' });
          }
          setEditingLead(null);
          setSelectedRecord(null);
          setViewMode('table');
        } catch (err) {
          enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update lead', { variant: 'error' });
        }
      } else {
        const payload = { ...buildLeadPayload(values), status: values.status || 'Warm' };
        try {
          await createLeadMutation(payload).unwrap();
          enqueueSnackbar('Lead added', { variant: 'success' });
          setEditingLead(null);
          setSelectedRecord(null);
          setViewMode('table');
        } catch (err) {
          enqueueSnackbar(err?.data?.message || err?.data || 'Failed to add lead', { variant: 'error' });
        }
      }
    } catch (validationErr) {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
    }
  };

  const saveSectionEdit = async (section) => {
    const now = new Date().toISOString();
    const toStr = (v) => (v && v.format ? v.format('YYYY-MM-DD') : v);
    const fieldsBySection = {
      hotel: ['hotelName', 'rowsInHotel', 'generalOccupancy', 'hotelType', 'billingName', 'contactPerson', 'pocDesignation', 'phone', 'alternativeRole', 'alternativeName', 'alternativePhone', 'email', 'location', 'salesPerson', 'source', 'priority', 'mentionPriority', 'interestedInSoftware', 'previousSoftware', 'previousSoftwarePrice', 'softwareExpiryDate'],
      billing: ['detailedAddress', 'city', 'state', 'pincode', 'billType', 'gstNumber', 'gstPercent'],
      leadStatus: ['status', 'quotationNo', 'quotationDate', 'followUpDate', 'followUpTime', 'followUpName'],
      leadJourney: ['followUpStep'],
      personalization: ['productType', 'displayUnit'],
      delivery: ['orderDeliveryDate', 'splitDates', 'forwardingCharge', 'deliveryBy', 'transportationBy', 'paymentTerms', 'paymentReminderDate', 'paymentProofs', 'paymentCollection'],
      products: ['products', 'selectedKit', 'kitDisplayUnit', 'kitSize', 'productType'],
    };
    const rawValues = leadForm.getFieldsValue(fieldsBySection[section]);
    const values = { ...rawValues };
    ['followUpDate', 'quotationDate', 'softwareExpiryDate', 'orderDeliveryDate', 'paymentReminderDate'].forEach(f => {
      if (values[f]) values[f] = toStr(values[f]);
    });
    if (values.splitDates) {
      values.splitDates = values.splitDates.map(sd => ({ ...sd, date: toStr(sd.date) }));
    }
    if (section === 'delivery') {
      const collectionEntries = (values.paymentCollection || []).filter(e => Number(e.paidAmount) > 0);
      const collectionTotal = collectionEntries.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const recordTotal = Math.round(calcGrandTotal(selectedRecord.products || []));
      if (collectionTotal > 0) {
        values.advancePaid = collectionTotal;
        values.paidAmount = collectionTotal;
        values.paymentStatus = recordTotal > 0 && collectionTotal >= recordTotal ? 'Paid' : 'Partially Paid';
      } else {
        const proofs = (values.paymentProofs || []).filter(f => f.url || f.response?.url);
        values.paymentStatus = proofs.length
          ? (values.paymentTerms === 'BEFORE_100' ? 'Paid' : 'Partially Paid')
          : 'Unpaid';
      }
    }
    const updated = { ...selectedRecord, ...values };
    if (section === 'leadStatus' && values.status && values.status !== selectedRecord.status) {
      updated.statusHistory = [...(selectedRecord.statusHistory || []), { status: values.status, changedAt: now }];
    }
    try {
      await updateLeadMutation({ id: updated._id || updated.key, ...values }).unwrap();
      if (section === 'leadStatus' && values.status && values.status !== selectedRecord.status) {
        await updateLeadStatusMutation({ id: updated._id || updated.key, status: values.status }).unwrap();
      }
      setSelectedRecord(updated);
      if (updated.customerId) {
        setCustomersData(prev => prev.map(c => c.key === updated.key ? updated : c));
      } else if (updated.leadId) {
        setLeadsData(prev => prev.map(l => l.key === updated.key ? updated : l));
      }
      setEditingSection(null);
      enqueueSnackbar('Section updated successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update section', { variant: 'error' });
    }
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
    enqueueSnackbar('Lead saved as Draft', { variant: 'info' });
  };



  const convertToCustomer = (lead) => {
    const newCustomer = {
      ...lead,
      customerId: `CUST-${1000 + customersData.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    setCustomersData(prev => [...prev, newCustomer]);
    setLeadsData(prev => prev.filter(l => l.key !== lead.key));
    enqueueSnackbar(`${lead.hotelName} converted to Customer`, { variant: 'success' });
    setActiveTab('customers');
  };

  const convertLeadToNegotiation = async (lead) => {
    const validProducts = (lead.products || []).filter(p => p.name && Number(p.qty) > 0 && Number(p.rate) > 0);
    if (!validProducts.length) {
      enqueueSnackbar('Please add at least one product with quantity and rate before converting to Negotiation', { variant: 'warning' });
      return;
    }
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
    try {
      await convertLeadToNegotiationMutation({
        id: lead._id || lead.key,
        clientName: lead.hotelName || lead.billingName,
        billType: lead.billType,
        type: lead.billType === 'GST' ? 'GST' : 'Non-GST',
        gstAmount: lead.gstAmount || 0,
        totalAmount: calcTotal(lead.products),
        total: calcTotal(lead.products),
        items: (lead.products || []).map(mapOrderItem),
        products: lead.products || [],
        // Contact + billing fields
        hotelName: lead.hotelName,
        billingName: lead.billingName,
        location: lead.location,
        detailedAddress: lead.detailedAddress,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        email: lead.email,
        salesPerson: lead.salesPerson,
        hotelType: lead.hotelType,
        gstNumber: lead.gstNumber,
        gstPercent: lead.gstPercent,
        forwardingCharge: lead.forwardingCharge,
        deliveryBy: lead.deliveryBy,
        transportationBy: lead.transportationBy,
        paymentTerms: lead.paymentTerms,
      }).unwrap();
      enqueueSnackbar(`${lead.hotelName} converted to Negotiation (${newNeg.nid})`, { variant: 'success' });
      setActiveTab('quotations');
      setViewMode('table');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert to Negotiation', { variant: 'error' });
    }
  };

  const startQuotationFromLead = (lead) => {
    setEditingQuotation(null);
    setQuotationFromLead(lead);
    quotationForm.resetFields();
    quotationForm.setFieldsValue({
      ...prepareFormValues(lead),
      location: lead.location || lead.locationCity,
      billType: lead.billType || 'GST',
    });
    setViewMode('quotation-form');
  };

  // ─── Quotation handlers ───────────────────────────────────────────
  const saveQuotation = async () => {
    try {
      const values = await quotationForm.validateFields();
      const total = calcTotal(values.products);
      const now = new Date().toISOString().split('T')[0];
      if (editingQuotation) {
        const newRevision = { version: `v${(editingQuotation.revisionHistory?.length || 0) + 1}`, date: now, by: 'Sales Team', note: 'Products / terms updated' };
        const updated = {
          ...editingQuotation,
          ...values,
          totalAmount: total,
          revisionHistory: [...(editingQuotation.revisionHistory || []), newRevision],
        };
        try {
          await updateSalesQuotationMutation({
            id: editingQuotation._id || editingQuotation.key,
            ...values,
            totalAmount: total,
            items: (values.products || []).map((p) => ({
              itemName: p.name,
              unit: p.unit,
              price: Number(p.rate) || 0,
              qty: Number(p.qty) || 0,
              lineTotal: (Number(p.qty) || 0) * (Number(p.rate) || 0),
            })),
            revisionHistory: updated.revisionHistory,
          }).unwrap();
          setQuotationsData(prev => prev.map(q => q.key === editingQuotation.key ? updated : q));
          setSelectedRecord(updated);
          enqueueSnackbar('Quotation updated', { variant: 'success' });
          setEditingQuotation(null);
        } catch (err) {
          enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update quotation', { variant: 'error' });
          return;
        }
      } else {
        const subtotal = calcTotal(values.products);
        const gstAmount = (values.products || []).reduce(
          (s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
        const grandTotal = subtotal + gstAmount;
        const src = quotationFromLead || {};
        const effectiveBillType = values.billType || src.billType || 'GST';
        const advancePaid = Number(src.paidAmount || src.advancePaid) || 0;
        const balance = grandTotal - advancePaid;
        const payStatus = advancePaid >= grandTotal && grandTotal > 0 ? 'Paid'
          : advancePaid > 0 ? 'Partially Paid'
          : 'Unpaid';
        const payload = {
          clientName: values.hotelName || src.hotelName || 'Client',
          amount: subtotal,
          gstAmount,
          total: grandTotal,
          advancePaid,
          balance,
          status: payStatus,
          type: effectiveBillType === 'GST' ? 'GST' : 'Non-GST',
          billType: effectiveBillType,
          items: (values.products || []).map((p) => ({
            itemName: p.name,
            unit: p.unit,
            price: Number(p.rate) || 0,
            qty: Number(p.qty) || 0,
            lineTotal: (Number(p.qty) || 0) * (Number(p.rate) || 0),
          })),
          products: values.products || [],
          note: values.note,
          // Contact + billing fields carried forward from the lead
          hotelName: values.hotelName || src.hotelName,
          billingName: values.billingName || src.billingName,
          location: values.location || src.location || src.locationCity,
          detailedAddress: values.detailedAddress || src.detailedAddress,
          city: values.city || src.city,
          state: values.state || src.state,
          pincode: values.pincode || src.pincode,
          contactPerson: src.contactPerson,
          phone: src.phone,
          email: src.email,
          salesPerson: src.salesPerson || src.assignedTo?.fullName,
          hotelType: values.hotelType || src.hotelType,
          gstNumber: src.gstNumber,
          gstPercent: src.gstPercent,
          // Order details
          specifications: src.specifications || [],
          logoNeeded: src.logoNeeded,
          logoProducts: src.logoProducts,
          orderDeliveryDate: src.orderDeliveryDate,
          splitDates: src.splitDates || [],
          // Delivery & payment
          forwardingCharge: values.forwardingCharge ?? src.forwardingCharge,
          deliveryBy: values.deliveryBy || src.deliveryBy,
          transportationBy: values.transportationBy || src.transportationBy,
          paymentTerms: values.paymentTerms || src.paymentTerms,
        };
        if (src.key || src._id) payload.leadId = src._id || src.key;
        try {
          await createSalesQuotationMutation(payload).unwrap();
          setQuotationFromLead(null);
          setActiveTab('quotations');
          enqueueSnackbar('Quotation created', { variant: 'success' });
        } catch (err) {
          enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create quotation', { variant: 'error' });
        }
      }
      setViewMode('table');
      setActiveTab('quotations');
    } catch (validationErr) {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
    }
  };

  const sendViaWhatsApp = (data) => {
    const text = generateWhatsAppText(data);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    if (data.qid) {
      setQuotationsData(prev => prev.map(q => q.key === data.key ? { ...q, status: 'Sent' } : q));
    }
  };

  // Infer which packaging queue (Sticker / Box / Frosted Ziplock) a product belongs to.
  // Operations builds its Sticker/Box/Frosted queues by filtering order items on logoType.
  const inferLogoType = (p) => {
    const hay = `${p?.printing || ''} ${p?.sticker || ''} ${p?.packingMaterial || ''} ${p?.materialCategory || ''} ${p?.logoType || ''}`.toLowerCase();
    if (hay.includes('frosted') || hay.includes('ziplock')) return 'Frosted Ziplock';
    if (hay.includes('box')) return 'Box';
    if (hay.includes('sticker')) return 'Sticker';
    return p?.logoType || 'Sticker';
  };

  // Build an order item, carrying the operations/packaging fields the Operations module reads.
  const mapOrderItem = (p) => ({
    itemName: p.name || p.kitType || '',
    name: p.name || p.kitType || '',
    unit: p.unit,
    price: Number(p.rate) || 0,
    rate: Number(p.rate) || 0,
    qty: Number(p.qty) || 0,
    gst: Number(p.gst) || 0,
    lineTotal: (Number(p.qty) || 0) * (Number(p.rate) || 0),
    logoType: inferLogoType(p),
    size: p.size,
    boxes: Number(p.boxes) || 0,
    packaging: p.packingMaterial || p.packaging || '',
    packingMaterial: p.packingMaterial || p.packaging || '',
    material: p.materialCategory || p.material || '',
    materialCategory: p.materialCategory || p.material || '',
    logo: p.logo,
    sticker: p.sticker,
    brand: p.brand,
    otherSpecs: p.otherSpecs,
    isKit: p.isKit || false,
    kitName: p.kitName || '',
    kitType: p.kitType || '',
  });

  // Old Hotel: auto-fetch existing hotel details (by name + branch) and prefill the lead form.
  const handleOldHotelLookup = async () => {
    const hotelType = leadForm.getFieldValue('hotelType');
    if (hotelType !== 'OLD') return;
    const name = leadForm.getFieldValue('hotelName');
    const branch = leadForm.getFieldValue('branch');
    if (!name) return;
    try {
      const res = await lookupHotel({ name, branch }).unwrap();
      const d = res?.data;
      if (d) {
        leadForm.setFieldsValue({
          billingName: d.billingName, contactPerson: d.contactPerson, pocDesignation: d.pocDesignation,
          phone: d.phone, email: d.email, locationCity: d.locationCity || d.city, destination: d.destination,
          gstNumber: d.gstNumber, gstPercent: d.gstPercent, branch: d.branch || branch,
          altRole: d.altRole, altName: d.altName, altNumber: d.altNumber,
          generalOccupancy: d.generalOccupancy, numRooms: d.numRooms || d.rowsInHotel,
        });
        enqueueSnackbar(`Auto-filled details for ${name}`, { variant: 'success' });
      } else {
        enqueueSnackbar(`No existing record found for ${name}`, { variant: 'info' });
      }
    } catch { /* lookup is best-effort */ }
  };

  // Doc: when a new order is placed for a customer with a prior complaint, surface an alert.
  const alertPriorComplaint = (clientName) => {
    if (!clientName) return;
    const prior = complaintsData.filter((c) => (c.hotelName || '').toLowerCase() === clientName.toLowerCase());
    if (prior.length) {
      enqueueSnackbar(`Note: ${clientName} has ${prior.length} previous complaint(s). Review before proceeding.`, { variant: 'warning', autoHideDuration: 6000 });
    }
  };

  const buildOrderPayloadFromQuotation = (q, status) => {
    // Always compute from products so we never double-count GST when q.amount stores
    // the grand total instead of the subtotal.
    const subtotal = calcTotal(q.products) || Number(q.amount) || 0;
    const gstFromProducts = (q.products || []).reduce(
      (s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
    const gstAmount = gstFromProducts > 0
      ? gstFromProducts
      : (Number(q.gstAmount) || Math.max(0, Number(q.totalAmount || q.total) - subtotal) || 0);
    const grandTotal = subtotal + gstAmount;
    return {
      clientName: q.hotelName || q.billingName || q.clientName || 'Client',
      amount: subtotal,
      gstAmount,
      total: grandTotal,
      advancePaid: 0,
      balance: grandTotal,
      type: q.billType === 'GST' ? 'GST' : 'Non-GST',
      billType: q.billType,
      paymentTerms: q.paymentTerms,
      status,
      items: (q.products || []).map(mapOrderItem),
      products: q.products || [],
      // Kit / product type info
      productType: q.productType,
      selectedKit: q.selectedKit,
      kitDisplayUnit: q.kitDisplayUnit || q.displayUnit,
      kitSize: q.kitSize,
      // Carry all contact + billing + delivery fields through
      hotelName: q.hotelName || q.clientName,
      billingName: q.billingName,
      location: q.location,
      clientPhone: q.phone,
      contactPerson: q.contactPerson,
      phone: q.phone,
      email: q.email,
      salesPerson: q.salesPerson,
      hotelType: q.hotelType,
      gstNumber: q.gstNumber,
      gstPercent: q.gstPercent,
      detailedAddress: q.detailedAddress,
      city: q.city,
      state: q.state,
      pincode: q.pincode,
      forwardingCharge: q.forwardingCharge,
      deliveryBy: q.deliveryBy,
      transportationBy: q.transportationBy,
    };
  };

  const convertToInvoice = async (q) => {
    try {
      await createSalesOrderMutation(buildOrderPayloadFromQuotation(q, 'Payment Pending')).unwrap();
      enqueueSnackbar('Converted to Invoice successfully! Order is now pending payment.', { variant: 'success' });
      setActiveTab('orders');
      setViewMode('table');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert to invoice', { variant: 'error' });
    }
  };

  const recordPayment = async (order) => {
    try {
      await updateSalesOrderStatusMutation({ id: order.key, status: 'In Production' }).unwrap();
      enqueueSnackbar('Payment recorded and Order is now in production!', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to record payment', { variant: 'error' });
    }
  };

  const convertOrderToInvoice = async (order) => {
    try {
      await updateSalesOrderStatusMutation({ id: order.key, status: 'Payment Pending' }).unwrap();
      enqueueSnackbar('Invoice generated successfully! Order is now pending payment.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to generate invoice', { variant: 'error' });
    }
  };

  const startOrderFromQuotation = async (q) => {
    const validProducts = (q.products || []).filter(p => p.name && Number(p.qty) > 0);
    if (!validProducts.length) {
      enqueueSnackbar('Please add product details to the quotation before converting to Order', { variant: 'warning' });
      return;
    }
    alertPriorComplaint(q.hotelName || q.billingName || q.clientName);
    try {
      await createSalesOrderMutation(buildOrderPayloadFromQuotation(q, 'In Production')).unwrap();
      enqueueSnackbar('Order confirmed successfully!', { variant: 'success' });
      setActiveTab('orders');
      setViewMode('table');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to confirm order', { variant: 'error' });
    }
  };

  const saveOrder = async () => {
    let values;
    try {
      values = await orderForm.validateFields();
    } catch (validationErr) {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
      return;
    }
    const validProds = (values.products || []).filter(p => (p.name || p.kitType) && Number(p.qty) > 0);
    if (!validProds.length) {
      enqueueSnackbar('Please add at least one product with a name and quantity before confirming the order', { variant: 'error' });
      return;
    }
    const subtotal = calcTotal(values.products);
    const gstAmount = (values.products || []).reduce(
      (s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
    const total = subtotal + gstAmount;
    const newCollection = (values.paymentCollection || []).filter(e => e.paymentMethod);
    const collTotal = newCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const advancePaid = collTotal > 0 ? collTotal : (Number(values.advance) || 0);
    const paymentStatus = total > 0 && advancePaid >= total
      ? 'Paid'
      : advancePaid > 0
      ? 'Partially Paid'
      : 'Unpaid';
    const hasPartial = Array.isArray(values.splitDates) && values.splitDates.length > 0;
    const proofMeta = (values.paymentProofs || []).map((f) => ({ name: f.name || f.fileName, uid: f.uid }));
    const payload = {
      clientName: values.hotelName || values.billingName || orderFromQuotation?.hotelName || 'Client',
      amount: subtotal,
      gstAmount,
      total,
      advancePaid,
      balance: Math.max(0, total - advancePaid),
      type: values.billType === 'GST' ? 'GST' : 'Non-GST',
      paymentTerms: values.paymentTerms,
      paymentReminderDate: values.paymentReminderDate ? (values.paymentReminderDate.format ? values.paymentReminderDate.format('YYYY-MM-DD') : values.paymentReminderDate) : undefined,
      paymentCollection: newCollection,
      paymentStatus,
      paidAmount: advancePaid,
      status: 'In Production',
      items: (values.products || []).map(mapOrderItem),
      products: values.products || [],
      productType: values.productType,
      selectedKit: values.selectedKit,
      kitDisplayUnit: values.kitDisplayUnit || values.displayUnit,
      kitSize: values.kitSize,
      deliveryType: hasPartial ? 'Partial' : 'Full',
      isEmergency: hasPartial,
      isUrgent: hasPartial,
      splitDates: values.splitDates || [],
      paymentProofs: proofMeta,
      expectedDeliveryDate: values.orderDeliveryDate ? (values.orderDeliveryDate.format ? values.orderDeliveryDate.format('YYYY-MM-DD') : values.orderDeliveryDate) : undefined,
    };
    alertPriorComplaint(payload.clientName);
    try {
      await createSalesOrderMutation(payload).unwrap();
      enqueueSnackbar('Order confirmed!', { variant: 'success' });
      setViewMode('table');
      setActiveTab('orders');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to confirm order', { variant: 'error' });
    }
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
    complaintForm.validateFields().then(async vals => {
      const { orderId, description, files } = vals;
      const resolvedOrder = complaintOrder
        || ordersData.find(o => o.key === orderId || o.oid === orderId);
      const orderObjectId = resolvedOrder?.key || resolvedOrder?._id;
      if (!orderObjectId) {
        enqueueSnackbar('Please select a valid order for this complaint', { variant: 'error' });
        return;
      }
      const clientName = resolvedOrder?.hotelName || resolvedOrder?.clientName || resolvedOrder?.billingName || '';
      const evidenceUrls = (files || [])
        .map(f => f?.url || f?.response?.url || f?.response?.secure_url || null)
        .filter(Boolean);
      try {
        await createComplaintMutation({
          orderId: orderObjectId,
          description,
          clientName,
          ...(evidenceUrls.length ? { evidenceUrls } : {}),
        }).unwrap();
        enqueueSnackbar('Complaint raised successfully', { variant: 'success' });
        setComplaintModalOpen(false);
        complaintForm.resetFields();
      } catch (err) {
        enqueueSnackbar(err?.data?.message || err?.data || 'Failed to raise complaint', { variant: 'error' });
      }
    }).catch(validationErr => {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
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

  const convertToNegotiation = async (q) => {
    const validProducts = (q.products || []).filter(p => p.name && Number(p.qty) > 0);
    if (!validProducts.length) {
      enqueueSnackbar('Please add product details to the quotation before converting to Negotiation', { variant: 'warning' });
      return;
    }
    try {
      await convertToNegotiationMutation({
        id: q.key,
        amount: q.amount ?? q.totalAmount,
        gstAmount: q.gstAmount,
        total: q.totalAmount ?? calcTotal(q.products),
      }).unwrap();
      enqueueSnackbar('Moved to Negotiation', { variant: 'success' });
      setViewMode('table');
      setActiveTab('quotations');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to move to negotiation', { variant: 'error' });
    }
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
      const subtotal = calcTotal(values.products);
      const gstAmt = calcGstAmount(values.products);
      const exactTotal = subtotal + gstAmt;
      const roundedTotal = Math.round(exactTotal / 100) * 100;
      const total = values.useRoundedTotal ? roundedTotal : exactTotal;
      const nextStep = Math.min((editingNegotiation.flowStep || 0) + 1, 3);
      const nextStatus = ['Initial', 'Counter Offer', 'Final Terms', 'Approved'][nextStep] || 'Final Terms';
      const updatedRounds = [
        ...(editingNegotiation.rounds || []),
        {
          round: (editingNegotiation.rounds?.length || 0) + 1,
          date: new Date().toISOString().split('T')[0],
          by: 'Sales Team',
          type: 'Counter Offer',
          totalAmount: total,
          note: values.negotiationNote || 'Terms updated',
        },
      ];
      const toDateStr = (v) => (v && v.format ? v.format('YYYY-MM-DD') : v);
      // Strip form-only fields that must not reach the backend payload
      const { useRoundedTotal: _round, negotiationNote: _note, ...patchValues } = values;
      const patch = {
        ...patchValues,
        total,
        amount: subtotal,
        gstAmount: gstAmt,
        totalAmount: total,
        flowStep: nextStep,
        status: nextStatus,
        rounds: updatedRounds,
        items: (values.products || []).map(mapOrderItem),
        // dayjs objects from form DatePickers must be converted to strings before
        // going into local state — React can't render Date/dayjs objects directly
        paymentReminderDate: toDateStr(values.paymentReminderDate),
        creditDueDate: toDateStr(values.creditDueDate),
        orderDeliveryDate: toDateStr(values.orderDeliveryDate),
        followUpDate: toDateStr(values.followUpDate),
      };
      const updated = { ...editingNegotiation, ...patch };
      try {
        await updateNegotiationMutation({ id: editingNegotiation._id || editingNegotiation.key, ...patch }).unwrap();
      } catch (apiErr) {
        enqueueSnackbar(apiErr?.data?.message || 'Failed to save negotiation', { variant: 'error' });
        return;
      }
      setNegotiationsData(prev => prev.map(n => n.key === editingNegotiation.key ? updated : n));
      setSelectedRecord(updated);
      enqueueSnackbar('Negotiation updated', { variant: 'success' });
      setViewMode('negotiation-detail');
      setEditingNegotiation(null);
    } catch (validationErr) {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fill required fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
    }
  };

  const convertNegotiationToOrder = async (n) => {
    const validProducts = (n.items || n.products || []).filter(p => (p.name || p.itemName) && Number(p.qty) > 0);
    if (!validProducts.length) {
      enqueueSnackbar('Please add product details to the negotiation before converting to Order', { variant: 'warning' });
      return;
    }
    alertPriorComplaint(n.hotelName || n.clientName);
    try {
      await convertToOrderMutation({ id: n.key }).unwrap();
      enqueueSnackbar('Order confirmed successfully!', { variant: 'success' });
      setActiveTab('orders');
      setViewMode('table');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert to order', { variant: 'error' });
    }
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
      render: (v, r) => <Text style={{ fontSize: 13 }}>{v ? `${dayjs(v).format('DD MMM YYYY')}${r.followUpTime ? ' ' + r.followUpTime : ''}` : '—'}</Text>,
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
    {
      title: 'Amount', key: 'negAmt', width: 120, responsive: ['sm'],
      render: (_, r) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{(r.totalAmount || 0).toLocaleString()}</Text>,
    },
    {
      title: 'Payment Status', key: 'payStatus', width: 150,
      render: (_, r) => {
        const linkedOrder = ordersData.find(o => o.negotiationCode === r.nid || o.hotelName === r.hotelName);
        const effectiveStatus = (r.status && r.status !== 'Unpaid') ? r.status
          : (linkedOrder?.paymentStatus && linkedOrder.paymentStatus !== 'Unpaid') ? linkedOrder.paymentStatus
          : 'Unpaid';
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedOrder?.paidAmount || 0);
        const effectiveTotal = r.totalAmount || linkedOrder?.totalAmount || 0;
        const color = effectiveStatus === 'Paid' ? 'success' : effectiveStatus === 'Partially Paid' ? 'warning' : 'error';
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color} style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, margin: 0 }}>{effectiveStatus}</Tag>
            {effectivePaid > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>₹{effectivePaid.toLocaleString()} / ₹{effectiveTotal.toLocaleString()}</Text>
            )}
            {effectivePaid > 0 && effectivePaid < effectiveTotal && (
              <Text style={{ fontSize: 10, color: '#fa8c16' }}>₹{(effectiveTotal - effectivePaid).toLocaleString()} due</Text>
            )}
          </Space>
        );
      },
    },
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
      title: 'Items / Amount', key: 'amt', width: 160, responsive: ['sm'],
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 13 }}>{r.itemCount ?? r.products?.length ?? 0} items</Text><br />
          <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{(r.totalAmount || calcTotal(r.products)).toLocaleString()}</Text>
        </div>
      ),
    },
    {
      title: 'Bill', dataIndex: 'billType', width: 90, responsive: ['md'],
      render: (v) => <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 13 }}>{v === 'GST' ? 'GST' : 'Non-GST'}</Tag>,
    },
    {
      title: 'Payment Status', key: 'payStatus', width: 150,
      render: (_, r) => {
        const linkedOrder = ordersData.find(o => o.quotationCode === r.qid || o.hotelName === r.hotelName);
        const effectiveStatus = (r.status && r.status !== 'Unpaid') ? r.status
          : (linkedOrder?.paymentStatus && linkedOrder.paymentStatus !== 'Unpaid') ? linkedOrder.paymentStatus
          : 'Unpaid';
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedOrder?.paidAmount || 0);
        const effectiveTotal = r.totalAmount || linkedOrder?.totalAmount || 0;
        const color = effectiveStatus === 'Paid' ? 'success' : effectiveStatus === 'Partially Paid' ? 'warning' : 'error';
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color} style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, margin: 0 }}>{effectiveStatus}</Tag>
            {effectivePaid > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                ₹{effectivePaid.toLocaleString()} / ₹{effectiveTotal.toLocaleString()}
              </Text>
            )}
            {effectivePaid > 0 && effectivePaid < effectiveTotal && (
              <Text style={{ fontSize: 10, color: '#fa8c16' }}>₹{(effectiveTotal - effectivePaid).toLocaleString()} due</Text>
            )}
          </Space>
        );
      },
    },
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
      title: 'Collected', key: 'collected', width: 110, responsive: ['sm'],
      render: (_, r) => {
        const linkedNeg = negotiationsData.find(n => String(n.key) === String(r.negotiationId));
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedNeg?.paidAmount || 0);
        return (
          <div>
            <Text strong style={{ fontSize: 13, color: effectivePaid > 0 ? '#52c41a' : textColor }}>₹{effectivePaid.toLocaleString()}</Text>
            {r.advance > 0 && effectivePaid !== r.advance && (
              <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Adv: ₹{r.advance.toLocaleString()}</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Payment', key: 'payStatus', width: 155,
      render: (_, r) => {
        const linkedNeg = negotiationsData.find(n => String(n.key) === String(r.negotiationId));
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedNeg?.paidAmount || 0);
        const effectiveTotal = r.totalAmount || 0;
        const effectiveStatus = effectiveTotal > 0 && effectivePaid >= effectiveTotal ? 'Paid'
          : effectivePaid > 0 ? 'Partially Paid'
          : (r.paymentStatus && r.paymentStatus !== 'Unpaid' ? r.paymentStatus : 'Unpaid');
        const color = effectiveStatus === 'Paid' ? 'success' : effectiveStatus === 'Partially Paid' ? 'warning' : 'error';
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color} style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, margin: 0 }}>{effectiveStatus}</Tag>
            {effectivePaid > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>₹{effectivePaid.toLocaleString()} / ₹{effectiveTotal.toLocaleString()}</Text>
            )}
            {effectivePaid > 0 && effectivePaid < effectiveTotal && (
              <Text style={{ fontSize: 10, color: '#fa8c16' }}>₹{(effectiveTotal - effectivePaid).toLocaleString()} due</Text>
            )}
          </Space>
        );
      },
    },
    { title: 'Order Status', dataIndex: 'status', width: 130, render: (v) => <Tag color={STATUS_COLORS[v]} style={{ fontSize: 13 }}>{v}</Tag> },
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
          <Tooltip title="Download Quotation">
            <Button size="small" icon={<DownloadOutlined />} />
          </Tooltip>
          <Tooltip title="Edit Delivery & Payment">
            <Button size="small" icon={<EditOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A55' }} onClick={(e) => { e.stopPropagation(); openOrderEditModal(r); }} />
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
        </Space>
      ),
    },
  ];

  const handleComplaintStatus = async (r, status) => {
    try {
      await updateComplaintStatusMutation({ id: r._id || r.key, status }).unwrap();
      setComplaintsData(prev => prev.map(c => (c.key === r.key ? { ...c, status } : c)));
      enqueueSnackbar(`Complaint marked ${status}`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data || 'Failed to update complaint', { variant: 'error' });
    }
  };

  const complaintColumns = [
    { title: 'Complaint ID', dataIndex: 'key', width: 120, render: (v) => <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>CMP-{v.toString().slice(-4)}</Text> },
    { title: 'Order ID', dataIndex: 'orderId', width: 105, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Hotel / Company', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Description', dataIndex: 'description', ellipsis: true, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Raised At', dataIndex: 'raisedAt', width: 145, render: (v) => <Text style={{ fontSize: 13 }}>{fmtDateTimeShort(v)}</Text> },
    { title: 'Sales Person', dataIndex: 'salesPerson', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v, r) => (
        <Select
          size="small"
          value={v}
          style={{ width: 120 }}
          onClick={(e) => e.stopPropagation()}
          onChange={(val) => handleComplaintStatus(r, val)}
          options={[
            { value: 'Open', label: 'Open' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Resolved', label: 'Resolved' },
            { value: 'Closed', label: 'Closed' },
          ]}
        />
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="View Details"><Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); Modal.info({ title: `Complaint CMP-${r.key.toString().slice(-4)}`, width: 560, content: (<div><p><b>Hotel:</b> {r.hotelName}</p><p><b>Order:</b> {r.orderId || '—'}</p><p><b>Status:</b> {r.status}</p><p><b>Raised:</b> {fmtDateTimeShort(r.raisedAt)}</p><p><b>Description:</b></p><p>{r.description}</p>{(r.statusHistory && r.statusHistory.length > 0) && (<><Divider style={{ margin: '12px 0' }} /><p><b>History</b></p><Timeline items={r.statusHistory.map((h) => ({ color: h.status === 'Resolved' ? 'green' : h.status === 'Closed' ? 'gray' : 'blue', children: (<div><Text strong>{h.status}</Text> <Text type="secondary" style={{ fontSize: 11 }}>{h.at ? new Date(h.at).toLocaleString('en-IN') : ''}{h.byName ? ` · ${h.byName}` : ''}</Text>{h.note && <div style={{ fontSize: 12 }}>{h.note}</div>}</div>) }))} /></>)}</div>) }); }} /></Tooltip>
          <Tooltip title="Mark Resolved"><Button size="small" icon={<CheckOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }} onClick={(e) => { e.stopPropagation(); handleComplaintStatus(r, 'Resolved'); }} /></Tooltip>
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
        {products.map((p, i) => {
          // Normalize: fields may be top-level OR nested under p.specs (legacy)
          const logo            = p.logo            || p.specs?.logo;
          const sticker         = p.sticker         || p.specs?.sticker;
          const packingMaterial = p.packingMaterial || p.packaging || p.specs?.packingMaterial;
          const materialCategory= p.materialCategory|| p.material  || p.specs?.materialCategory;
          const brand           = p.brand           || p.specs?.brand;
          const otherSpecs      = p.otherSpecs      || p.specs?.otherSpecs;
          const productName     = p.name || p.itemName || p.kitType || '—';
          const isKitItem       = p.isKit || !!p.kitType;
          const kitLabel        = p.kitName || p.kitType || '';
          const unitLabel       = p.unit || '';
          const sizeLabel       = p.size || '';
          const gstVal          = Number(p.gst) || 0;
          const lineTotal       = Math.round((p.qty || 0) * (p.rate || 0) * (1 + gstVal / 100));
          const hasSpecs        = logo || sticker || packingMaterial || materialCategory || brand || otherSpecs || unitLabel || sizeLabel;
          return (
            <div key={i} style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(177,30,106,0.12)'}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* ── Header row ── */}
              <div style={{ background: isDark ? 'rgba(177,30,106,0.1)' : 'rgba(177,30,106,0.04)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 10 }}>{isKitItem ? 'KIT PRODUCT' : 'PRODUCT'}</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 14 }}>{productName}</Text>
                      {isKitItem && <Tag color="magenta" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>KIT</Tag>}
                    </div>
                    {kitLabel && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Kit: {kitLabel}</Text>}
                  </div>
                </div>
                <Space size={4} wrap>
                  {unitLabel && <Tag color="blue" style={{ borderRadius: 12, fontSize: 11 }}>{unitLabel}</Tag>}
                  {sizeLabel && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{sizeLabel}</Tag>}
                </Space>
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ display: 'block', fontSize: 18, color: '#B11E6A', lineHeight: 1.2 }}>₹{lineTotal.toLocaleString()}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{p.qty} {unitLabel || 'pcs'} × ₹{p.rate}{gstVal > 0 ? ` + ${gstVal}% GST` : ''}</Text>
                </div>
              </div>
              {/* ── Specs section ── */}
              {hasSpecs && (
                <div style={{ padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.1)'}` }}>
                  <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 10 }}>SPECIFICATIONS</Text>
                  <Row gutter={[12, 10]}>
                    {logo && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Logo</Text>
                        <Tag color={logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 20, fontSize: 11 }}>{logo === 'YES' ? '✓ Logo' : '✗ No Logo'}</Tag>
                      </Col>
                    )}
                    {sticker && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Sticker / Printing</Text>
                        <Tag color={sticker === 'YES' ? 'blue' : sticker === 'PRINTING' ? 'purple' : 'default'} style={{ borderRadius: 20, fontSize: 11 }}>
                          {sticker === 'YES' ? '✓ Yes' : sticker === 'PRINTING' ? 'Printing' : sticker}
                        </Tag>
                      </Col>
                    )}
                    {packingMaterial && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Packing Material</Text>
                        <Text strong style={{ fontSize: 12 }}>{packingMaterial}</Text>
                      </Col>
                    )}
                    {materialCategory && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Material Category</Text>
                        <Tag color={materialCategory === 'Eco Friendly' ? 'green' : materialCategory === 'Wooden' ? 'orange' : 'blue'} style={{ borderRadius: 20, fontSize: 11 }}>{materialCategory}</Tag>
                      </Col>
                    )}
                    {brand && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Brand</Text>
                        <Text strong style={{ fontSize: 12 }}>{brand}</Text>
                      </Col>
                    )}
                    {unitLabel && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Unit</Text>
                        <Text strong style={{ fontSize: 12 }}>{unitLabel}</Text>
                      </Col>
                    )}
                    {sizeLabel && (
                      <Col xs={12} sm={8}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>Size</Text>
                        <Text strong style={{ fontSize: 12 }}>{sizeLabel}</Text>
                      </Col>
                    )}
                    {otherSpecs && (
                      <Col xs={24} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Other Specifications</Text>
                        <div style={{ padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fa', borderRadius: 8, fontSize: 12, color: isDark ? '#ccc' : '#444' }}>
                          {otherSpecs}
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              )}
            </div>
          );
        })}
        {(() => {
          const subtot = Math.round(calcTotal(products));
          const gstFromProds = Math.round(products.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0));
          // When per-product gst% is 0 but totalAmount is known, infer GST from the stored total
          const inferredGst = Math.max(0, Math.round(totalAmount || 0) - subtot);
          const gstAmt = gstFromProds > 0 ? gstFromProds : inferredGst;
          const grandTot = subtot + gstAmt;
          return (
            <div style={{ padding: '12px 16px', background: 'rgba(177,30,106,0.06)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.14)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{products.length} product{products.length !== 1 ? 's' : ''}</Text>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>WITHOUT GST: ₹{subtot.toLocaleString()}{gstAmt > 0 ? `  |  GST: ₹${gstAmt.toLocaleString()}` : ''}</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>TOTAL (WITH GST)</Text>
                  <Text strong style={{ fontSize: 20, color: '#B11E6A' }}>₹{grandTot.toLocaleString()}</Text>
                </div>
              </div>
            </div>
          );
        })()}
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
                <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{rec.paymentReminderDate ? (rec.paymentReminderDate.format ? rec.paymentReminderDate.format('DD MMM YYYY') : dayjs(rec.paymentReminderDate).format('DD MMM YYYY')) : '—'}</Text>
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
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>{q.date ? (q.date.format ? q.date.format('YYYY-MM-DD') : String(q.date).slice(0, 10)) : '—'}</Tag>
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
                            <Text style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#ccc' : '#444', display: 'block' }}>{r.date ? (r.date.format ? r.date.format('YYYY-MM-DD') : String(r.date).slice(0, 10)) : '—'}</Text>
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
      const base = selectedRecord || {};
      const full = singleOrderRaw?.data || {};
      // Merge list record with populated single-order fetch
      const lead = full.leadId || {};
      const o = {
        ...base,
        phone: base.phone || full.clientPhone || full.phone || lead.phone,
        contactPerson: base.contactPerson || full.contactPerson || lead.contactPerson,
        billingName: base.billingName || full.billingName || lead.billingName || base.hotelName,
        gstNumber: base.gstNumber || full.gstNumber || lead.gstNumber,
        gstPercent: base.gstPercent ?? full.gstPercent ?? lead.gstPercent,
        billType: base.billType || full.billType || lead.billType,
        salesPerson: base.salesPerson || full.salesPerson || full.assignedTo?.fullName || lead.salesPerson,
        detailedAddress: base.detailedAddress || full.detailedAddress || lead.detailedAddress,
        city: base.city || full.city || lead.city,
        state: base.state || full.state || lead.state,
        pincode: base.pincode || full.pincode || lead.pincode,
        location: base.location || full.location || lead.location || lead.locationCity,
        deliveryBy: base.deliveryBy || full.deliveryBy || lead.deliveryBy,
        transportationBy: base.transportationBy || full.transportationBy || lead.transportationBy,
        forwardingCharge: base.forwardingCharge ?? full.forwardingCharge ?? lead.forwardingCharge,
        paymentTerms: base.paymentTerms || full.paymentTerms || lead.paymentTerms,
        // Readable linked codes from populated references
        leadCode: full.leadId?.leadCode || base.leadCode,
        leadName: full.leadId?.hotelName || base.leadName || base.hotelName,
        quotationCode: full.quotationId?.quotCode || base.quotationCode,
        negotiationCode: full.negotiationId?.negCode || base.negotiationCode,
        statusHistory: full.statusHistory || base.statusHistory || [],
        // Always carry paymentCollection from the richest source available
        paymentCollection: (full.paymentCollection?.length ? full.paymentCollection : null)
          || (base.paymentCollection?.length ? base.paymentCollection : null)
          || [],
        paymentProofs: (full.paymentProofs?.length ? full.paymentProofs : null)
          || (base.paymentProofs?.length ? base.paymentProofs : null)
          || [],
      };
      const ORDER_STEPS = [
        { title: 'Confirmed', description: 'Order placed' },
        { title: 'In Production', description: 'Manufacturing' },
        { title: 'Quality Check', description: 'QC & packing' },
        { title: 'Dispatch Ready', description: 'Ready to ship' },
        { title: 'Delivered', description: 'Completed' },
      ];
      const orderStepMap = { 'In Production': 1, 'Quality Check': 2, 'Dispatch Ready': 3, 'Delivered': 4 };
      const orderCurrentStep = orderStepMap[o.status] ?? 0;
      const oSubtotal = Math.round(calcTotal(o.products));
      const oGstFromProducts = Math.round(calcGstAmount(o.products));
      // Prefer per-product GST if set; fall back to backend-stored gstAmount (for converted/legacy orders)
      const oBackendGst = Number(full.gstAmount ?? base.gstAmount ?? o.gstAmount) || 0;
      const oGstAmount = oGstFromProducts > 0 ? oGstFromProducts : oBackendGst;
      const oTotal = oSubtotal + oGstAmount;
      // o.paymentCollection is now the best-available source (merged above)
      const detailCollectionTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const detailAdvance = Number(full.advancePaidAmount ?? full.advancePaid ?? base.advance ?? 0);
      // Fall back to the linked negotiation's paid amount if the order has no payment data yet
      const linkedNegForDetail = negotiationsData.find(n => String(n.key) === String(base.negotiationId || full.negotiationId?._id || full.negotiationId));
      const negFallbackPaid = linkedNegForDetail?.paidAmount || 0;
      const totalCollected = detailCollectionTotal > 0
        ? detailCollectionTotal
        : (Number(full.paidAmount) || detailAdvance || Number(base.paidAmount) || negFallbackPaid || 0);
      const toCollect = Math.max(0, oTotal - totalCollected);
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('orders'); }} style={{ borderRadius: 8 }}>Back to Orders</Button>
            <Space wrap>
              <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => sendViaWhatsApp(o)}>WhatsApp</Button>
              <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>Download Quotation</Button>
              <Button icon={<EditOutlined />} style={{ borderRadius: 8, color: '#B11E6A', borderColor: '#B11E6A55' }} onClick={() => openOrderEditModal(o)}>Edit Delivery & Payment</Button>
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
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CreditCardOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>Order Value</Text></div>
                <Text strong style={{ fontSize: 14, color: textColor, display: 'block' }}>₹{oTotal.toLocaleString()}</Text>
                {oGstAmount > 0 && (
                  <div style={{ marginTop: 3 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Without GST: ₹{oSubtotal.toLocaleString()}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 10 }}>GST: ₹{oGstAmount.toLocaleString()}</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CheckOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>Collected</Text></div>
                <Text strong style={{ fontSize: 14, color: '#52c41a', display: 'block' }}>₹{totalCollected.toLocaleString()}</Text>
                {o.advance > 0 && o.paidAmount !== o.advance && (
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>Advance: ₹{(o.advance || 0).toLocaleString()}</Text>
                )}
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CalendarOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>To Collect</Text></div>
                <Text strong style={{ fontSize: 14, color: toCollect > 0 ? '#fa8c16' : '#52c41a', display: 'block' }}>₹{toCollect.toLocaleString()}</Text>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CarOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>Expected Delivery</Text></div>
                <Text strong style={{ fontSize: 14, color: textColor, display: 'block' }}>{o.expectedDelivery || '—'}</Text>
              </Card>
            </Col>
          </Row>

          {/* Order Progress Steps */}
          <Card style={{ borderRadius: 14, marginBottom: 20, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }} styles={{ body: { padding: '16px 24px' } }}>
            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 14 }}>ORDER PROGRESS</Text>
            <Steps current={orderCurrentStep} items={ORDER_STEPS} />
          </Card>

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
                  <Col xs={24} sm={6}>
                    <div style={{ padding: '14px 16px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(24,144,255,0.06)', borderRadius: 10, border: '1px solid rgba(24,144,255,0.2)', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>WITHOUT GST</Text>
                      <Text strong style={{ fontSize: 18, color: '#1890ff' }}>₹{oSubtotal.toLocaleString()}</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={6}>
                    <div style={{ padding: '14px 16px', background: 'rgba(82,196,26,0.06)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>WITH GST (TOTAL)</Text>
                      <Text strong style={{ fontSize: 18, color: '#52c41a' }}>₹{oTotal.toLocaleString()}</Text>
                      {oGstAmount > 0 && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>GST: ₹{oGstAmount.toLocaleString()}</Text>}
                    </div>
                  </Col>
                  <Col xs={24} sm={6}>
                    <div style={{ padding: '14px 16px', background: 'rgba(82,196,26,0.06)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>COLLECTED</Text>
                      <Text strong style={{ fontSize: 18, color: '#52c41a' }}>₹{totalCollected.toLocaleString()}</Text>
                      {o.advance > 0 && o.paidAmount !== o.advance && (
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>Advance: ₹{(o.advance || 0).toLocaleString()}</Text>
                      )}
                    </div>
                  </Col>
                  <Col xs={24} sm={6}>
                    <div style={{ padding: '14px 16px', background: toCollect > 0 ? 'rgba(250,140,22,0.06)' : 'rgba(82,196,26,0.06)', borderRadius: 10, border: `1px solid ${toCollect > 0 ? 'rgba(250,140,22,0.2)' : 'rgba(82,196,26,0.2)'}`, textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>TO COLLECT</Text>
                      <Text strong style={{ fontSize: 18, color: toCollect > 0 ? '#fa8c16' : '#52c41a' }}>₹{toCollect.toLocaleString()}</Text>
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
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1e3799', borderRadius: 2, display: 'inline-block' }} /><FileTextOutlined style={{ color: '#1e3799' }} /><span>Linked Documents</span></Space>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(o.leadCode || o.leadName) && (
                    <div style={{ padding: '8px 12px', background: isDark ? 'rgba(177,30,106,0.08)' : 'rgba(177,30,106,0.04)', borderRadius: 8, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>LEAD</Text>
                      <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{o.leadCode || o.leadName || '—'}</Text>
                      {o.leadCode && o.leadName && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{o.leadName}</Text>}
                    </div>
                  )}
                  {o.quotationCode && (
                    <div style={{ padding: '8px 12px', background: isDark ? 'rgba(30,55,153,0.08)' : 'rgba(30,55,153,0.04)', borderRadius: 8, border: '1px solid rgba(30,55,153,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>QUOTATION</Text>
                      <Text strong style={{ color: '#1e3799', fontSize: 13 }}>{o.quotationCode}</Text>
                    </div>
                  )}
                  {o.negotiationCode && (
                    <div style={{ padding: '8px 12px', background: isDark ? 'rgba(250,140,22,0.08)' : 'rgba(250,140,22,0.04)', borderRadius: 8, border: '1px solid rgba(250,140,22,0.2)' }}>
                      <Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>NEGOTIATION</Text>
                      <Text strong style={{ color: '#fa8c16', fontSize: 13 }}>{o.negotiationCode}</Text>
                    </div>
                  )}
                  <div style={{ padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fc', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>ORDER DATE</Text>
                    <Text strong style={{ fontSize: 13 }}>{o.date || '—'}</Text>
                  </div>
                  {/* Uploaded files / payment proofs */}
                  {(() => {
                    const allFiles = [
                      ...(full.paymentProofs || base.paymentProofs || []).map(f => ({ ...f, category: 'Payment Proof' })),
                      ...(full.documents || base.documents || []).map(f => ({ ...f, category: 'Document' })),
                      ...(full.lrFiles || base.lrFiles || []).map(f => ({ ...f, category: 'LR / Dispatch' })),
                    ].filter(f => f.url || f.name);
                    if (!allFiles.length) return null;
                    return (
                      <div style={{ padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fc', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e8e8e8'}` }}>
                        <Text type="secondary" style={{ fontSize: 10, letterSpacing: 0.5, display: 'block', marginBottom: 8, fontWeight: 700 }}>
                          UPLOADED FILES ({allFiles.length})
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {allFiles.map((file, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderRadius: 6, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                <FileTextOutlined style={{ color: '#1e3799', fontSize: 13, flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <Text strong style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name || file.fileName || `File ${idx + 1}`}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 10 }}>{file.category}</Text>
                                  {file.uploadedAt && (
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{fmtDateTimeShort(file.uploadedAt)}</Text>
                                  )}
                                </div>
                              </div>
                              {file.url && (
                                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                                  View ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Status Timeline */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><HistoryOutlined style={{ color: '#fa8c16' }} /><span>Status Timeline</span></Space>}>
                {(o.statusHistory || []).length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>No status history yet.</Text>
                ) : (
                  <Timeline
                    mode="left"
                    items={[...(o.statusHistory || [])].reverse().map((h, i) => ({
                      color: STATUS_COLORS[h.status] || '#ccc',
                      dot: i === 0 ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLORS[h.status] || '#ccc', border: '2px solid #fff', boxShadow: `0 0 0 3px ${STATUS_COLORS[h.status] || '#ccc'}55` }} /> : undefined,
                      label: <Text style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? (isDark ? '#fff' : '#222') : (isDark ? '#aaa' : '#666') }}>{fmtDateTimeShort(h.changedAt || h.at)}</Text>,
                      children: <Tag color={STATUS_COLORS[h.status] || 'default'} style={{ borderRadius: 20, fontSize: 12, padding: '1px 10px', fontWeight: i === 0 ? 700 : 400 }}>{h.status}</Tag>,
                    }))}
                  />
                )}
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
                  <ProductFormList fieldName="products" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} />
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
                  <ProductFormList fieldName="products" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} />
                </Card>

                {/* Live total summary + Round Value switch */}
                {(() => {
                  const prods = watchedNegotiationProducts || [];
                  const sub = calcTotal(prods);
                  const gst = calcGstAmount(prods);
                  const exact = sub + gst;
                  const rounded = Math.round(exact / 100) * 100;
                  const displayTotal = watchedNegRoundValue ? rounded : exact;
                  return (
                    <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                      title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><span>Order Total</span></Space>}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>Subtotal</Text>
                          <Text style={{ fontSize: 13 }}>₹{sub.toLocaleString()}</Text>
                        </div>
                        {gst > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>GST</Text>
                            <Text style={{ fontSize: 13 }}>₹{gst.toLocaleString()}</Text>
                          </div>
                        )}
                        <Divider style={{ margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 15 }}>Grand Total</Text>
                          <Text strong style={{ fontSize: 16, color: '#52c41a' }}>₹{displayTotal.toLocaleString()}</Text>
                        </div>
                        {watchedNegRoundValue && exact !== rounded && (
                          <Text type="secondary" style={{ fontSize: 11 }}>Exact: ₹{exact.toLocaleString()} → Rounded: ₹{rounded.toLocaleString()}</Text>
                        )}
                        <Divider style={{ margin: '6px 0' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13 }}>Round Total</Text>
                          <Form.Item name="useRoundedTotal" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Switch
                              checkedChildren="Yes"
                              unCheckedChildren="No"
                              onChange={(checked) => {
                                if (checked && exact !== rounded) {
                                  Modal.confirm({
                                    title: 'Round Total?',
                                    content: `Round ₹${exact.toLocaleString()} to ₹${rounded.toLocaleString()}?`,
                                    okText: 'Yes, Round',
                                    cancelText: 'No, Keep Exact',
                                    onOk() {},
                                    onCancel() {
                                      negotiationForm.setFieldsValue({ useRoundedTotal: false });
                                    },
                                  });
                                }
                              }}
                            />
                          </Form.Item>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

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
                  <ProductFormList fieldName="products" inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} />
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
                                    {(Array.isArray(watchedOrderProducts) ? watchedOrderProducts : []).filter(p => p?.name || p?.kitType).map((p, i) => (
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
                    <Select onChange={(val) => {
                      const prods = watchedOrderProducts || [];
                      const subtot = calcTotal(prods);
                      const gstAmt = prods.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
                      const total = subtot + gstAmt;
                      let adv = 0;
                      if (val === 'BEFORE_100') adv = total;
                      else if (val === 'ON_DISPATCH' || val === '50_ADVANCE_50_AFTER') adv = Math.round(total * 0.5);
                      orderForm.setFieldValue('advance', adv);
                    }}>{PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select>
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms || prev.products !== cur.products}>
                    {({ getFieldValue }) => {
                      const pt = getFieldValue('paymentTerms');
                      const prods = watchedOrderProducts || [];
                      const subtot = calcTotal(prods);
                      const gstAmt = prods.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
                      const total = subtot + gstAmt;
                      let adviceText = '';
                      if (pt === 'BEFORE_100') adviceText = `100% — expected: ₹${total.toLocaleString()}`;
                      else if (pt === 'ON_DISPATCH') adviceText = `50% advance — expected: ₹${Math.round(total * 0.5).toLocaleString()}`;
                      else if (pt === '50_ADVANCE_50_AFTER') adviceText = `50% advance — expected: ₹${Math.round(total * 0.5).toLocaleString()}`;
                      else if (pt === 'CREDIT_10_30') adviceText = 'Credit terms — advance: ₹0';
                      return adviceText ? (
                        <div style={{ marginTop: -10, marginBottom: 12, padding: '6px 10px', background: 'rgba(82,196,26,0.06)', borderRadius: 6, border: '1px solid rgba(82,196,26,0.2)' }}>
                          <Text type="secondary" style={{ fontSize: 12, color: '#52c41a' }}>{adviceText}</Text>
                        </div>
                      ) : null;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms}>
                    {({ getFieldValue }) => {
                      const pt = getFieldValue('paymentTerms');
                      if (pt === '50_ADVANCE_50_AFTER') return (
                        <Form.Item label="Payment Reminder Date (50% balance)" name="paymentReminderDate" rules={[{ required: true, message: 'Select reminder date' }]}>
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      );
                      if (pt === 'CREDIT_10_30') return (
                        <Form.Item label="Credit Due Date" name="paymentReminderDate" rules={[{ required: true, message: 'Select credit due date' }]}>
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      );
                      return null;
                    }}
                  </Form.Item>

                  <Divider style={{ margin: '10px 0 8px', fontSize: 12, color: '#B11E6A', borderColor: 'rgba(177,30,106,0.2)' }}>
                    <Space><DollarOutlined style={{ color: '#B11E6A' }} /><span style={{ color: '#B11E6A', fontWeight: 600, fontSize: 12 }}>Payment Collection</span></Space>
                  </Divider>
                  <Form.List name="paymentCollection">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={10}>
                                <Form.Item {...rest} name={[name, 'paymentMethod']} label="Method" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Select method' }]}>
                                  <Select placeholder="Select method" size="small">
                                    {COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={10}>
                                <Form.Item {...rest} name={[name, 'paidAmount']} label="Amount (₹)" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="e.g. 5000" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                              <Col xs={24}>
                                <Form.Item {...rest} name={[name, 'notes']} label="Notes" style={{ marginBottom: 0 }}>
                                  <Input size="small" placeholder="UPI ref / cheque no. etc." />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 10 }}>
                          + Add Payment Entry
                        </Button>
                      </>
                    )}
                  </Form.List>

                  {/* Auto-computed payment status */}
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const rawCollection = getFieldValue('paymentCollection');
                      const collection = Array.isArray(rawCollection) ? rawCollection : [];
                      const collTotal = collection.reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                      const prods = Array.isArray(watchedOrderProducts) ? watchedOrderProducts : [];
                      const subtot = calcTotal(prods);
                      const gstAmt = prods.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
                      const orderTotal = subtot + gstAmt;
                      const status = orderTotal > 0 && collTotal >= orderTotal
                        ? 'Paid'
                        : collTotal > 0
                        ? 'Partially Paid'
                        : 'Unpaid';
                      const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                      const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                      return (
                        <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                          <Space size={12}>
                            {collTotal > 0 && orderTotal > 0 && (
                              <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                                ₹{collTotal.toLocaleString()} / ₹{orderTotal.toLocaleString()}
                              </Text>
                            )}
                            <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                          </Space>
                        </div>
                      );
                    }}
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
    const record = selectedRecord ? { ...selectedRecord, products: normalizeProducts(selectedRecord.products || []) } : {};
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
              {isDetail && record.hotelLogoUrl && (
                <img src={record.hotelLogoUrl} alt="Hotel Logo" style={{ height: 48, maxWidth: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid #B11E6A22', padding: 4, background: '#fff' }} />
              )}
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
              { label: 'Next Follow-up', value: record.followUpDate ? `${dayjs(record.followUpDate).format('DD MMM YYYY')}${record.followUpTime ? ' · ' + record.followUpTime : ''}` : 'Not set', icon: <HistoryOutlined /> },
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

        <Form form={leadForm} layout="vertical">
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
                      <Descriptions.Item label="Billing Name" span={1}>{record.billingName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Hotel Type" span={1}>
                        <Tag color={record.hotelType === 'OLD' ? 'blue' : 'green'}>{record.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}</Tag>
                        {record.hotelType === 'NEW' && record.leadType && (
                          <Tag color="orange" style={{ marginLeft: 4 }}>{record.leadType}</Tag>
                        )}
                      </Descriptions.Item>
                      {record.branch && <Descriptions.Item label="Branch">{record.branch}</Descriptions.Item>}
                      <Descriptions.Item label="No. of Rooms">{record.numRooms || record.rowsInHotel || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Occupancy (%)">{record.generalOccupancy ? `${record.generalOccupancy}%` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="Contact Person">{record.contactPerson || '—'}</Descriptions.Item>
                      <Descriptions.Item label="POC Designation">{record.pocDesignation || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{record.phone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{record.email || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alt. Name">{record.alternativeName || record.altName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alt. Role">{record.alternativeRole || record.altRole || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Alt. Number">{record.alternativePhone || record.altNumber || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Location">{record.location || record.locationCity || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Destination">{record.destination || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Assigned To">{record.salesPerson || '—'}</Descriptions.Item>
                      {record.source && <Descriptions.Item label="Source">{record.source}</Descriptions.Item>}
                    </Descriptions>
                    {/* Software Interest */}
                    {record.interestedInSoftware && (
                      <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }} style={{ background: isDark ? 'transparent' : '#fff' }}
                        title={<Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 700 }}>Software Interest</Text>}
                      >
                        <Descriptions.Item label="Interested in Software">
                          <Tag color={record.interestedInSoftware === 'YES' ? 'green' : 'default'}>{record.interestedInSoftware}</Tag>
                        </Descriptions.Item>
                        {record.interestedInSoftware === 'YES' && (
                          <>
                            <Descriptions.Item label="Previous Software">{record.previousSoftware || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Previous Price">
                              {record.previousSoftwarePrice || record.prevSoftwarePrice ? `₹${(record.previousSoftwarePrice || record.prevSoftwarePrice).toLocaleString()}` : '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Expiry Date">
                              {record.softwareExpiryDate ? new Date(record.softwareExpiryDate).toLocaleDateString('en-IN') : '—'}
                            </Descriptions.Item>
                          </>
                        )}
                      </Descriptions>
                    )}
                  </div>
                ) : (
                  <Row gutter={16}>
                    <Col xs={24} sm={6}>
                      <Form.Item label="Hotel Type" name="hotelType" rules={[{ required: true }]}>
                        <Select
                          placeholder="Select hotel type"
                          onChange={(val) => { if (val !== 'NEW') leadForm.setFieldValue('leadType', undefined); }}
                        >
                          <Option value="OLD">Old Hotel</Option>
                          <Option value="NEW">New Hotel</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    {watchedHotelType === 'NEW' && (
                      <Col xs={24} sm={6}>
                        <Form.Item label="Order / Sample" name="leadType">
                          <Select placeholder="Select type" allowClear>
                            <Option value="ORDER">Order</Option>
                            <Option value="SAMPLE">Sample</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    )}
                    <Col xs={24} sm={6}>
                      <Form.Item label="Hotel / Company Name" name="hotelName" rules={[{ required: true }]}>
                        {watchedHotelType === 'NEW' ? (
                          <Input placeholder="Enter new hotel / company name" />
                        ) : (
                          <AutoComplete
                            options={hotelNameOptions}
                            placeholder="Search existing hotel..."
                            filterOption={(input, option) => (option?.value || '').toLowerCase().includes(input.toLowerCase())}
                            onSelect={() => setTimeout(handleOldHotelLookup, 0)}
                            onBlur={handleOldHotelLookup}
                            style={{ width: '100%' }}
                          />
                        )}
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item label="Branch" name="branch">
                        <Input placeholder="e.g. Main Branch" onBlur={handleOldHotelLookup} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={6}>
                      <Form.Item label="Hotel Logo" name="hotelLogo" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}>
                        <Upload
                          customRequest={makeCloudinaryRequest('logos')}
                          accept="image/*,.pdf,.svg,.ai"
                          maxCount={1}
                          listType="picture"
                        >
                          <Button icon={<UploadOutlined />} style={{ borderColor: '#B11E6A55', color: '#B11E6A', width: '100%' }}>Upload Logo</Button>
                        </Upload>
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="No. of Rooms" name="rowsInHotel">
                        <InputNumber placeholder="50" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="General Occupancy (%)" name="generalOccupancy">
                        <InputNumber placeholder="e.g. 75" style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
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
                      <Form.Item label="Alternative Role" name="alternativeRole">
                        <SelectWithAdd field="alternativeRole" defaultOptions={ALTERNATIVE_PERSON_OPTIONS} placeholder="Select / Add Role" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Name" name="alternativeName">
                        <Input placeholder="Full Name" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Number" name="alternativePhone">
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
                        <Select
                          showSearch
                          placeholder="Select sales person"
                          optionFilterProp="label"
                          options={
                            currentUser?.fullName || currentUser?.name
                              ? [
                                  { value: currentUser.fullName || currentUser.name, label: `${currentUser.fullName || currentUser.name} (Me)` },
                                  ...salesPersonOptions.filter((o) => o.value !== (currentUser.fullName || currentUser.name)),
                                ]
                              : salesPersonOptions
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Source" name="source">
                        <SelectWithAdd field="source" defaultOptions={[{ value: 'Direct', label: 'Direct' }, { value: 'Referral', label: 'Referral' }]} placeholder="Select source" />
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
                      <Form.Item label="Interested in Software" name="interestedInSoftware">
                        <Select placeholder="Select Yes / No" allowClear>
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
                        <Col xs={24}><InfoRow label="Detailed Address" value={record.detailedAddress || record.address} /></Col>
                      </Row>
                    ) : (
                      <Row gutter={12}>
                        <Col xs={24}><Form.Item label="Detailed Address" name="detailedAddress"><Input.TextArea rows={2} placeholder="Full address" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="City" name="city"><Input placeholder="City" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="State" name="state"><Input placeholder="State" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Pincode" name="pincode"><Input placeholder="Pincode" /></Form.Item></Col>
                        {watchedLeadType !== 'SAMPLE' && (
                          <Col xs={24} sm={12}><Form.Item label="Bill Type" name="billType"><Select placeholder="Select Bill Type" allowClear><Option value="GST">GST Bill</Option><Option value="NON_GST">Without GST</Option></Select></Form.Item></Col>
                        )}
                        {watchedLeadType !== 'SAMPLE' && watchedBillType === 'GST' && (
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
                            field="status"
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
                        <Form.Item label="Follow-up Notes" name="followUpName"><Input.TextArea rows={2} placeholder="e.g. Call back, discuss pricing, send sample..." /></Form.Item>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <InfoRow label="Current Status" value={<Tag color={STATUS_COLORS[record.status]}>{record.status}</Tag>} />
                        {record.followUpDate && (
                          <div style={{ padding: '10px', background: 'rgba(82,196,26,0.08)', borderRadius: 10, border: '1px solid rgba(82,196,26,0.2)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>NEXT FOLLOW-UP</Text>
                            <Text strong style={{ color: '#52c41a', fontSize: 13 }}>{record.followUpDate ? dayjs(record.followUpDate).format('DD MMM YYYY') : ''} {record.followUpTime}</Text>
                          </div>
                        )}
                        {/* Current follow-up note */}
                        {(record.followUpName || record.notes) && (
                          <div style={{ padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#fffbe6', borderRadius: 10, border: '1px solid rgba(250,173,20,0.3)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>FOLLOW-UP NOTE</Text>
                            <Text style={{ fontSize: 13 }}>{record.followUpName || record.notes}</Text>
                          </div>
                        )}
                        {/* Notes history */}
                        {(record.notesHistory || []).length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>NOTES HISTORY</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {[...(record.notesHistory || [])].reverse().map((n, i) => (
                                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 11, color: '#B11E6A', fontWeight: 600 }}>{n.person || 'Team'}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{n.date} {n.time}</Text>
                                  </div>
                                  <Text style={{ fontSize: 12 }}>{n.text}</Text>
                                </div>
                              ))}
                            </div>
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
                      <span>Products adding</span>
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
                  {usePerCardEdit && editingSection !== 'personalization' ? (() => {
                    const kitName = record.selectedKit
                      ? kits.find((k) => k._id === record.selectedKit)?.kitName || record.selectedKit
                      : null;
                    const isKitType = Array.isArray(record.productType)
                      ? record.productType.includes('PERSONALIZED_KIT')
                      : record.productType === 'PERSONALIZED_KIT';
                    // Derive kit products: prefer dedicated kitProducts field, fall back to isKit products in
                    // the products array (set by applyKitToForm), then fall back to the kit definition itself.
                    const kitProductsToShow = (() => {
                      if ((record.kitProducts || []).length > 0) return record.kitProducts;
                      const fromProds = (record.products || []).filter(p => p.isKit || p.kitType);
                      if (fromProds.length > 0) return fromProds.map(p => ({
                        productName: p.name || p.kitType || p.itemName || '',
                        displayType: p.displayType || '',
                        qty: p.qty,
                        rate: p.rate || 0,
                        gstPercent: p.gst || p.gstPercent || 0,
                      }));
                      const kitDef = record.selectedKit ? kits.find(k => k._id === record.selectedKit) : null;
                      return (kitDef?.products || []).map(p => ({
                        productName: p.productName || '',
                        displayType: '',
                        qty: p.qty,
                        rate: p.rate || 0,
                        gstPercent: 0,
                      }));
                    })();
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Row gutter={[16, 12]}>
                          <Col xs={24} sm={12}>
                            <InfoRow label="Product Selection" value={
                              record.productType
                                ? (Array.isArray(record.productType)
                                  ? record.productType.map(pt => PERSONALIZATION_OPTIONS.find(o => o.value === pt)?.label || pt).join(', ')
                                  : PERSONALIZATION_OPTIONS.find(o => o.value === record.productType)?.label || record.productType)
                                : '—'
                            } />
                          </Col>
                          {kitName && (
                            <Col xs={24} sm={12}>
                              <InfoRow label="Kit Selected" value={kitName} />
                            </Col>
                          )}
                          {(record.kitDisplayUnit || record.displayUnit) && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Display Unit" value={(record.kitDisplayUnit || record.displayUnit || '').replace(/_/g, ' ')} />
                            </Col>
                          )}
                          {record.kitSize && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Kit Size" value={record.kitSize} />
                            </Col>
                          )}
                        </Row>
                        {isKitType && kitProductsToShow.length > 0 && (
                          <div>
                            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#722ed1', display: 'block', marginBottom: 8 }}>
                              KIT CONTENTS ({kitProductsToShow.length} items)
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {kitProductsToShow.map((kp, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.12)' }}>
                                  <div>
                                    <Text strong style={{ fontSize: 13 }}>{kp.productName || kp.kitType || '—'}</Text>
                                    {kp.displayType && <Tag color="purple" style={{ marginLeft: 8, borderRadius: 12, fontSize: 10 }}>{kp.displayType}</Tag>}
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <Text strong style={{ color: '#722ed1', fontSize: 14 }}>₹{((kp.qty || 0) * (kp.rate || 0)).toLocaleString()}</Text>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{kp.qty} × ₹{kp.rate}{kp.gstPercent ? ` (+${kp.gstPercent}% GST)` : ''}</Text>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isKitType && kitProductsToShow.length === 0 && kitName && (
                          <div style={{ padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 8, border: '1px dashed rgba(114,46,209,0.2)' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Kit: <Text strong style={{ color: '#722ed1' }}>{kitName}</Text> — products listed below in Order Details</Text>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Product Selection" name="productType">
                          <SelectWithAdd
                            mode="multiple"
                            defaultOptions={PERSONALIZATION_OPTIONS}
                            placeholder="Select product types"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Select Kit" name="selectedKit" tooltip="Pick a kit defined in Inventory → Kit. Its products auto-fill below.">
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder={kitOptions.length ? 'Select a kit to load its products' : 'No kits yet — add in Inventory → Kit'}
                            options={kitOptions}
                            onChange={(val) => { if (val) applyKitToForm(val); }}
                          />
                        </Form.Item>
                      </Col>
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
                      extra={
                        editingSection === 'products' ? (
                          <Space size="small">
                            <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('products')} style={{ background: '#1890ff', border: 'none', borderRadius: 6 }}>Save</Button>
                            <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                          </Space>
                        ) : (
                          <Button size="small" icon={<EditOutlined />} onClick={() => setEditingSection('products')} style={{ borderRadius: 6 }}>Edit</Button>
                        )
                      }
                    >
                      {editingSection === 'products' ? (
                        /* ── Inline product edit ── */
                        <Form.List name="products">
                          {(fields, { add, remove }) => (
                            <>
                              <ProductHeaders />
                              {fields.map((field, index) => (
                                <ProductItem
                                  key={field.key}
                                  field={field}
                                  index={index}
                                  remove={remove}
                                  disabled={false}
                                  fieldName="products"
                                  showSpecs={true}
                                  isDark={isDark}
                                  inventoryItems={inventoryItems}
                                  inventoryItemsData={inventoryItemsRaw}
                                  kits={kits}
                                />
                              ))}
                              <Button
                                type="dashed"
                                onClick={() => add({ qty: undefined, rate: undefined, isKit: false })}
                                icon={<PlusOutlined />}
                                block
                                style={{ borderRadius: 10, height: 40, marginTop: 8 }}
                              >
                                Add Product
                              </Button>
                            </>
                          )}
                        </Form.List>
                      ) : (
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

                        {/* Per-product cards — kit items shown with kit badge */}
                        {(() => {
                          const allProds = normalizeProducts(record.products || []).filter(Boolean);
                          const kitProds = allProds.filter(p => p.isKit || p.kitType);
                          const sepProds = allProds.filter(p => !p.isKit && !p.kitType);
                          const kitNameLabel = record.selectedKit
                            ? kits.find((k) => k._id === record.selectedKit)?.kitName || 'Personalized Kit'
                            : (kitProds.length > 0 ? 'Personalized Kit' : null);
                          const renderProductCard = (p, i, globalIndex) => (
                            <div key={globalIndex} style={{ border: `1px solid ${isDark ? (p.isKit || p.kitType ? 'rgba(114,46,209,0.3)' : 'rgba(255,255,255,0.08)') : (p.isKit || p.kitType ? 'rgba(114,46,209,0.2)' : 'rgba(177,30,106,0.12)')}`, borderRadius: 12, overflow: 'hidden' }}>
                              <div style={{ background: isDark ? (p.isKit || p.kitType ? 'rgba(114,46,209,0.12)' : 'rgba(177,30,106,0.1)') : (p.isKit || p.kitType ? 'rgba(114,46,209,0.06)' : 'rgba(177,30,106,0.04)'), padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.isKit || p.kitType ? 'linear-gradient(135deg,#722ed1,#9254de)' : 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{globalIndex + 1}</span>
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{p.isKit || p.kitType ? 'KIT ITEM' : 'PRODUCT'}</Text>
                                      {(p.isKit || p.kitType) && <Tag color="purple" style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: '0 5px' }}>KIT</Tag>}
                                    </div>
                                    <Text strong style={{ display: 'block', fontSize: 15 }}>{p.name || p.kitType || '—'}</Text>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <Text strong style={{ display: 'block', fontSize: 20, color: '#B11E6A', lineHeight: 1.2 }}>
                                    ₹{Math.round((p.qty || 0) * (p.rate || 0) * (1 + (Number(p.gst) || 0) / 100)).toLocaleString()}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {p.qty || 0} pcs × ₹{p.rate || 0}{(Number(p.gst) || 0) > 0 ? ` +${p.gst}% GST` : ''}
                                  </Text>
                                </div>
                              </div>

                              {/* Specifications — read from flat fields (logo, sticker, etc.) */}
                              {(p.logo || p.sticker || p.packingMaterial || p.materialCategory || p.brand || p.gst || p.otherSpecs) && (
                                <div style={{ padding: '14px 18px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.1)'}` }}>
                                  <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 12 }}>SPECIFICATIONS</Text>
                                  <Row gutter={[12, 14]}>
                                    {p.logo && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Logo</Text>
                                        <Tag color={p.logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 20, fontSize: 12 }}>
                                          {p.logo === 'YES' ? '✓ Logo' : '✗ No Logo'}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.sticker && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Sticker / Printing</Text>
                                        <Tag color={p.sticker === 'YES' ? 'blue' : p.sticker === 'PRINTING' ? 'purple' : 'default'} style={{ borderRadius: 20, fontSize: 12 }}>
                                          {p.sticker === 'YES' ? '✓ Yes' : p.sticker === 'PRINTING' ? 'Printing' : '✗ No'}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.gst && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>GST %</Text>
                                        <Text strong style={{ fontSize: 13 }}>{p.gst}%</Text>
                                      </Col>
                                    )}
                                    {p.packingMaterial && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Packing Material</Text>
                                        <Text strong style={{ fontSize: 13 }}>{p.packingMaterial}</Text>
                                      </Col>
                                    )}
                                    {p.materialCategory && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Material Category</Text>
                                        <Tag
                                          color={p.materialCategory === 'Eco Friendly' ? 'green' : p.materialCategory === 'Wooden' ? 'orange' : 'blue'}
                                          style={{ borderRadius: 20, fontSize: 12 }}
                                        >
                                          {p.materialCategory}
                                        </Tag>
                                      </Col>
                                    )}
                                    {p.brand && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Brand</Text>
                                        <Text strong style={{ fontSize: 13 }}>{p.brand}</Text>
                                      </Col>
                                    )}
                                    {p.otherSpecs && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Other Specs</Text>
                                        <Text style={{ fontSize: 13 }}>{p.otherSpecs}</Text>
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              )}
                            </div>
                          );
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              {kitNameLabel && kitProds.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.18)' }}>
                                  <GiftOutlined style={{ color: '#722ed1' }} />
                                  <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Kit: {kitNameLabel}</Text>
                                  {(record.kitDisplayUnit || record.displayUnit) && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{(record.kitDisplayUnit || record.displayUnit || '').replace(/_/g, ' ')}</Tag>}
                                  {record.kitSize && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{record.kitSize}</Tag>}
                                </div>
                              )}
                              {kitProds.map((p, i) => renderProductCard(p, i, i))}
                              {sepProds.length > 0 && kitProds.length > 0 && (
                                <div style={{ padding: '6px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', borderRadius: 6 }}>
                                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>SEPARATE PRODUCTS</Text>
                                </div>
                              )}
                              {sepProds.map((p, i) => renderProductCard(p, i, kitProds.length + i))}
                            </div>
                          );
                        })()}

                        {/* Total footer */}
                        {(() => {
                          const prods = record.products || [];
                          const leadSubtotal = calcTotal(prods);
                          const leadGstAmt = prods.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
                          const leadGrandTotal = leadSubtotal + leadGstAmt;
                          return (
                            <div style={{ marginTop: 14, padding: '14px 18px', background: 'rgba(177,30,106,0.06)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.14)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{prods.length} product{prods.length !== 1 ? 's' : ''}</Text>
                                <div style={{ textAlign: 'right' }}>
                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>WITHOUT GST: ₹{leadSubtotal.toLocaleString()}{leadGstAmt > 0 ? `  |  GST: ₹${Math.round(leadGstAmt).toLocaleString()}` : ''}</Text>
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>TOTAL ORDER VALUE (WITH GST)</Text>
                                  <Text strong style={{ fontSize: 22, color: '#B11E6A' }}>₹{Math.round(leadGrandTotal).toLocaleString()}</Text>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                      )}
                    </Card>
                  );
                }

                // EDIT MODE
                // kitDisplayUnit and kitSize must live OUTSIDE any Form.List so they
                // register at the top level of the form. Ant Design prefixes every
                // Form.Item name with the enclosing Form.List path, so placing them
                // inside Form.List name="products" would register them as
                // products.kitDisplayUnit / products.kitSize instead of top-level.
                return (
                  <>
                    {showKitCard && (
                      <Card
                        style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                        title={
                          <Space>
                            <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                            <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                            <span>{hasKit ? 'Personalized Kit — Order Details' : 'Order Details — Products'}</span>
                          </Space>
                        }
                      >
                        {/* Kit-level Display Unit & Size — outside Form.List so they bind to top-level form fields */}
                        <Row gutter={12} align="bottom" style={{ marginBottom: 14 }}>
                          <Col xs={12} sm={8}>
                            <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                              <SelectWithAdd field="displayUnit" defaultOptions={DISPLAY_UNIT_OPTIONS} placeholder="Select / Add unit" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={8}>
                            <Form.Item label="Size" name="kitSize" style={{ marginBottom: 0 }}>
                              <Input placeholder="e.g. 2.5cm x 2.5cm" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.List name="products">
                          {(fields, { add, remove }) => {
                            const kitFields = fields.filter(f => {
                              const isKit = leadForm.getFieldValue(['products', f.name, 'isKit']);
                              const kitType = leadForm.getFieldValue(['products', f.name, 'kitType']);
                              return isKit || kitType;
                            });
                            return (
                              <>
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
                                    inventoryItems={inventoryItems}
                                    inventoryItemsData={inventoryItemsRaw}
                                    kits={kits}
                                  />
                                ))}
                                <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined, isKit: true })} icon={<PlusOutlined />} block
                                  style={{ borderRadius: 10, height: 45, borderDashOffset: 4, marginTop: 8 }}>
                                  Add Kit Product
                                </Button>
                              </>
                            );
                          }}
                        </Form.List>
                      </Card>
                    )}

                    {showSeparateCard && (
                      <Card
                        style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                        title={
                          <Space>
                            <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                            <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                            <span>{hasSeparate ? 'Separate Product — Order Details' : 'Order Details — Products'}</span>
                          </Space>
                        }
                      >
                        <Form.List name="products">
                          {(fields, { add, remove }) => {
                            const separateFields = fields.filter(f => {
                              const isKit = leadForm.getFieldValue(['products', f.name, 'isKit']);
                              const kitType = leadForm.getFieldValue(['products', f.name, 'kitType']);
                              return !(isKit || kitType);
                            });
                            return (
                              <>
                                <ProductHeaders />
                                {separateFields.map((field, index) => (
                                  <ProductItem
                                    key={field.key}
                                    field={field}
                                    index={index}
                                    remove={remove}
                                    disabled={false}
                                    fieldName="products"
                                    showSpecs={isAddLead || isAddCustomer}
                                    isDark={isDark}
                                    inventoryItems={inventoryItems}
                                    inventoryItemsData={inventoryItemsRaw}
                                    kits={kits}
                                  />
                                ))}
                                <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined, isKit: false })} icon={<PlusOutlined />} block
                                  style={{ borderRadius: 10, height: 45, borderDashOffset: 4, marginTop: 8 }}>
                                  Add Separate Product
                                </Button>
                              </>
                            );
                          }}
                        </Form.List>
                      </Card>
                    )}
                  </>
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
                        {(sd.products || (sd.product ? [{ product: sd.product, qty: sd.qty, notes: sd.note }] : [])).filter(Boolean).map((p, pi) => (
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
                          {(() => {
                            const ps = record.paymentStatus || 'Unpaid';
                            const psColor = ps === 'Paid' ? '#52c41a' : ps === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                            const psBg = ps === 'Paid' ? 'rgba(82,196,26,0.08)' : ps === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                            const psBorder = ps === 'Paid' ? 'rgba(82,196,26,0.2)' : ps === 'Partially Paid' ? 'rgba(250,140,22,0.2)' : 'rgba(255,77,79,0.2)';
                            return (
                              <div style={{ marginTop: 8, padding: '6px 10px', background: psBg, borderRadius: 8, border: `1px solid ${psBorder}`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>PAYMENT STATUS:</Text>
                                <Text strong style={{ color: psColor, fontSize: 12 }}>{ps}</Text>
                              </div>
                            );
                          })()}
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
                      {(record.paymentCollection || []).length > 0 && (
                        <Col xs={24} style={{ marginTop: 12 }}>
                          <div style={{ padding: '14px 16px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                              PAYMENT COLLECTION ({record.paymentCollection.length} entr{record.paymentCollection.length > 1 ? 'ies' : 'y'})
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {record.paymentCollection.map((entry, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <DollarOutlined style={{ color: '#B11E6A', fontSize: 14 }} />
                                    <Text style={{ fontSize: 13, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                  </div>
                                  <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 12 }}>{entry.notes}</Text>}
                                </div>
                              ))}
                              <div style={{ padding: '8px 12px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                                <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                                  ₹{(record.paymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}
                                </Text>
                              </div>
                            </div>
                          </div>
                        </Col>
                      )}
                      {(record.paymentProofs || []).length > 0 && (
                        <Col xs={24} style={{ marginTop: 12 }}>
                          <div style={{ padding: '14px 16px', background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                              PAYMENT PROOF ({record.paymentProofs.length} file{record.paymentProofs.length > 1 ? 's' : ''})
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {record.paymentProofs.map((file, idx) => (
                                <a key={idx} href={file.url || '#'} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fff', textDecoration: 'none' }}>
                                  <FileTextOutlined style={{ color: '#B11E6A', fontSize: 14 }} />
                                  <Text style={{ fontSize: 12 }}>{file.name || `Proof ${idx + 1}`}</Text>
                                  {file.url && <Text type="secondary" style={{ fontSize: 11, color: '#1890ff' }}>↗ View</Text>}
                                </a>
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
                                              {(Array.isArray(watchedLeadProducts) ? watchedLeadProducts : []).filter(p => p?.name || p?.kitType).map((p, pi) => (
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

                  {watchedLeadType !== 'SAMPLE' && <>
                  <Divider style={{ margin: '16px 0 10px', fontSize: 12, color: '#B11E6A', borderColor: 'rgba(177,30,106,0.2)' }}>
                    <Space><DollarOutlined style={{ color: '#B11E6A' }} /><span style={{ color: '#B11E6A', fontWeight: 600 }}>Payment Collection</span></Space>
                  </Divider>
                  {watchedLeadPaymentTerms === 'CREDIT_10_30' && (
                    <div style={{ padding: '8px 12px', background: 'rgba(24,144,255,0.06)', borderRadius: 8, border: '1px solid rgba(24,144,255,0.2)', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, color: '#1890ff' }}>Credit terms selected — no advance required. You can still record any upfront payment below.</Text>
                    </div>
                  )}
                  <Form.List name="paymentCollection">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'paymentMethod']} label="Payment Method" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Select method' }]}>
                                  <Select placeholder="Select method" size="small">
                                    {COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'paidAmount']} label="Paid Amount (₹)" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="e.g. 5000" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={8}>
                                <Form.Item {...rest} name={[name, 'notes']} label="Notes" style={{ marginBottom: 0 }}>
                                  <Input size="small" placeholder="e.g. UPI ref no." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 12 }}>
                          + Add Payment Entry
                        </Button>
                      </>
                    )}
                  </Form.List>

                  {/* Auto-computed payment status from collection entries vs product total */}
                  {(() => {
                    const safeCollection = Array.isArray(watchedLeadPaymentCollection) ? watchedLeadPaymentCollection : [];
                    const safeProducts = Array.isArray(watchedLeadProducts) ? watchedLeadProducts : [];
                    const collTotal = safeCollection.reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                    const recordTotal = Math.round(calcGrandTotal(safeProducts));
                    const status = recordTotal > 0 && collTotal >= recordTotal
                      ? 'Paid'
                      : collTotal > 0
                      ? 'Partially Paid'
                      : 'Unpaid';
                    const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                    const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                    return (
                      <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                        <Space size={12}>
                          {collTotal > 0 && recordTotal > 0 && (
                            <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                              ₹{collTotal.toLocaleString()} / ₹{recordTotal.toLocaleString()}
                            </Text>
                          )}
                          <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                        </Space>
                      </div>
                    );
                  })()}
                  </>}
                  </>
                  )}
                </Card>
              )}

              {/* ── Orders & Payment History — customer detail only ───────── */}
              {isDetail && record.customerId && (() => {
                const hotelOrders = ordersData.filter(o => o.hotelName === record.hotelName);
                const latestOrder = hotelOrders.length > 0 ? hotelOrders[hotelOrders.length - 1] : null;
                const totalOrders = hotelOrders.length;
                const totalPaid = hotelOrders.reduce((s, o) => s + (o.paidAmount || o.advance || 0), 0);
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
                                  {(r.products || []).filter(Boolean).map(p => p.name).join(', ') || '—'}
                                </Text>
                              </div>
                            )
                          },
                          { title: 'Date', dataIndex: 'date', render: v => v || '—' },
                          { title: 'Total', dataIndex: 'totalAmount', render: v => <Text strong>₹{(v || 0).toLocaleString()}</Text> },
                          { title: 'Collected', key: 'collected', render: (_, r) => <Text style={{ color: '#52c41a' }}>₹{(r.paidAmount || r.advance || 0).toLocaleString()}</Text> },
                          { title: 'To Collect', key: 'balance', render: (_, r) => <Text style={{ color: '#fa8c16' }}>₹{((r.totalAmount || 0) - (r.paidAmount || r.advance || 0)).toLocaleString()}</Text> },
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
                    {(record.notesHistory || []).length === 0 && (
                      <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
                        No follow-up notes yet. Add the first one below.
                      </Text>
                    )}
                    {(record.notesHistory || []).map((note, idx) => (
                      <div key={idx} style={{
                        padding: '12px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f9fc',
                        borderRadius: 10, borderLeft: '3px solid #B11E6A',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{(note.person || '?')[0]}</span>
                            </div>
                            <Text strong style={{ fontSize: 13 }}>{note.person}</Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>{note.date} · {note.time}</Text>
                        </div>
                        <Text style={{ fontSize: 13, paddingLeft: 34, display: 'block' }}>{note.text}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <Input.TextArea placeholder="Write a note..." rows={2} style={{ flex: 1, borderRadius: 8 }}
                        value={followupNote} onChange={(e) => setFollowupNote(e.target.value)} />
                      <Button type="primary" onClick={postFollowupNote} disabled={!followupNote.trim()}
                        style={{ background: '#B11E6A', border: 'none', borderRadius: 8, alignSelf: 'flex-end', height: 36 }}>Post</Button>
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
          <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleImportFile} />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
          <Tooltip title="Import leads from a CSV that follows the sample format">
            <Button icon={<UploadOutlined />} onClick={() => importInputRef.current?.click()}>Import</Button>
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={downloadSampleCSV}>Sample CSV</Button>
          {(activeTab === 'leads' || activeTab === 'customers') && (
            <Button type="primary" icon={<PlusOutlined />}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
              onClick={() => {
                setEditingLead(null);
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
          const totalTarget = perfRaw?.data?.totalTarget || 0;
          const totalAchieved = perfRaw?.data?.totalAchieved || 0;
          const totalPercent = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

          const milestones = [
            { percent: 25, label: '1/4', reward: performanceRewards.quarter ? `₹${performanceRewards.quarter.toLocaleString()} Bonus` : 'Q1 Reward' },
            { percent: 50, label: '1/2', reward: performanceRewards.half ? `₹${performanceRewards.half.toLocaleString()} Bonus` : 'Q2 Reward' },
            { percent: 75, label: '3/4', reward: performanceRewards.threeQtr ? `₹${performanceRewards.threeQtr.toLocaleString()} Bonus` : 'Q3 Reward' },
            { percent: 100, label: 'Full', reward: performanceRewards.full ? `₹${performanceRewards.full.toLocaleString()} Bonus` : 'Full Reward' },
          ];

          return (
            <Card style={{ borderRadius: 16, border: '1px solid #B11E6A22', background: isDark ? '#1E1E2E' : '#fff', boxShadow: '0 4px 20px rgba(177,30,106,0.06)', padding: '10px 20px', margin: '0 0 16px' }}>
              <Spin spinning={perfLoading}>
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
              </Spin>
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
                    {performanceTargets.map((t, i) => {
                      const pct = t.target > 0 ? Math.round((t.achieved / t.target) * 100) : 0;
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Select
                      allowClear
                      placeholder="Lead Status"
                      value={leadStatusFilter}
                      onChange={setLeadStatusFilter}
                      style={{ width: 200, borderRadius: 8 }}
                    >
                      {['Cold', 'Warm', 'Hot', 'Quotation (Sent)', 'Quotation (Not Sent)', 'Negotiation', 'Need manager help', 'Converted', 'Rejected'].map(s => (
                        <Option key={s} value={s}>{s}</Option>
                      ))}
                    </Select>
                    <DatePicker.RangePicker
                      style={{ borderRadius: 8 }}
                      onChange={(dates) => setDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                      allowClear
                    />
                  </div>
                  <Table
                    dataSource={filtered(leadsData)
                      .filter(r => !leadStatusFilter || r.status === leadStatusFilter)
                      .filter(r => {
                        if (!dateRange) return true;
                        const d = r.createdAt ? r.createdAt.slice(0, 10) : '';
                        return d >= dateRange[0] && d <= dateRange[1];
                      })}
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search lead, party..."
                      allowClear
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 220, borderRadius: 8 }}
                    />
                    <Select
                      allowClear
                      placeholder="Reminder Type"
                      value={reminderTypeFilter}
                      onChange={setReminderTypeFilter}
                      style={{ width: 200, borderRadius: 8 }}
                    >
                      {['Lead Follow-up', 'Payment Due', 'Order Status'].map(t => (
                        <Option key={t} value={t}>{t}</Option>
                      ))}
                    </Select>
                  </div>
                  <Table
                    dataSource={remindersData.filter(r => {
                      const q = searchText.toLowerCase();
                      const matchSearch = !q || (r.title || '').toLowerCase().includes(q) || (r.refCode || '').toLowerCase().includes(q);
                      const matchType = !reminderTypeFilter || r.kind === reminderTypeFilter;
                      return matchSearch && matchType;
                    })}
                    columns={[
                      { title: 'Ref', dataIndex: 'refCode', key: 'refCode', width: 110, render: (v) => <Text strong style={{ color: '#B11E6A', fontFamily: 'monospace' }}>{v || '—'}</Text> },
                      { title: 'Type', dataIndex: 'kind', key: 'kind', width: 150, render: (t) => <Tag color={(t || '').includes('Payment') ? 'error' : (t || '').includes('Order') ? 'processing' : 'warning'}>{t}</Tag> },
                      { title: 'Reminder', dataIndex: 'title', key: 'title', render: (v) => <Text>{v}</Text> },
                      { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
                      {
                        title: 'Details', key: 'details', width: 160, render: (_, r) => (
                          <Text>{r.amount ? `₹${Number(r.amount).toLocaleString()} due` : (r.owner || '—')}</Text>
                        )
                      },
                      {
                        title: 'Due', key: 'due', width: 150, render: (_, r) => (
                          <Space direction="vertical" size={0}>
                            <Text strong style={{ color: r.overdue ? '#ff4d4f' : '#B11E6A' }}>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : '—'}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{r.time || (r.overdue ? 'Overdue' : '')}</Text>
                          </Space>
                        )
                      },
                    ]}
                    pagination={{ pageSize: 10, size: 'small' }}
                    size="small"
                    rowKey="id"
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
                  <div style={{ padding: '12px 4px 0' }}>
                    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <Select
                        allowClear
                        placeholder="Quotation Status"
                        value={quotStatusFilter}
                        onChange={setQuotStatusFilter}
                        style={{ width: 190, borderRadius: 8 }}
                      >
                        {['Draft', 'Sent', 'Approved', 'Rejected', 'Negotiation', 'Quotation (Sent)', 'Quotation (Not Sent)'].map(s => (
                          <Option key={s} value={s}>{s}</Option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                    <SectionDivider title="Current Quotations" />
                    <Table dataSource={filtered(quotationsData).filter(r => !quotStatusFilter || r.status === quotStatusFilter)} columns={quotationColumns} pagination={{ pageSize: 5, size: 'small' }} size="small" rowKey="key"
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Select
                      allowClear
                      placeholder="Order Status"
                      value={orderStatusFilter}
                      onChange={setOrderStatusFilter}
                      style={{ width: 190, borderRadius: 8 }}
                    >
                      {['In Production', 'Dispatch Ready', 'Payment Pending', 'Completed', 'Partially Completed', 'Invoiced'].map(s => (
                        <Option key={s} value={s}>{s}</Option>
                      ))}
                    </Select>
                  </div>
                  <Table
                    dataSource={filtered(ordersData).filter(r => !orderStatusFilter || r.status === orderStatusFilter)}
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
                    style={{ cursor: 'pointer' }}
                    expandable={{
                      expandedRowKeys: expandedPartyKeys,
                      onExpandedRowsChange: setExpandedPartyKeys,
                      expandRowByClick: true,
                      showExpandColumn: false,
                      expandedRowRender: (record) => (
                        <ExpandedPartyOrders hotelName={record.hotelName} />
                      ),
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'complaints',
              label: 'Complaints',
              children: (
                <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Select
                      allowClear
                      placeholder="Complaint Status"
                      value={complaintStatusFilter}
                      onChange={setComplaintStatusFilter}
                      style={{ width: 160, borderRadius: 8 }}
                    >
                      <Option value="Open">Open</Option>
                      <Option value="Resolved">Resolved</Option>
                      <Option value="In Progress">In Progress</Option>
                    </Select>
                    <Button
                      icon={<WarningOutlined />}
                      style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => openComplaintModal(null)}
                    >
                      Raise Complaint
                    </Button>
                  </div>
                  <Table
                    dataSource={filtered(complaintsData).filter(r => !complaintStatusFilter || r.status === complaintStatusFilter)}
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
                <Upload customRequest={makeCloudinaryRequest('complaints')} multiple accept="image/*,.pdf,.doc,.docx" listType="picture">
                  <Button icon={<UploadOutlined />} style={{ borderColor: '#ff4d4f55', color: '#ff4d4f' }}>Upload Files</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Order Edit Modal (Delivery Date & Payment) ─────────────────────── */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#B11E6A' }} />
            <span>Edit Order — {orderEditTarget?.oid}</span>
          </Space>
        }
        open={orderEditModalOpen}
        onCancel={() => { setOrderEditModalOpen(false); orderEditForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setOrderEditModalOpen(false); orderEditForm.resetFields(); }}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: '#B11E6A', border: 'none' }} onClick={saveOrderEdit}>Save Changes</Button>,
        ]}
        width={Math.min(500, window.innerWidth - 32)}
      >
        <Form form={orderEditForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Expected Delivery Date" name="expectedDelivery" rules={[{ required: true, message: 'Select delivery date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Payment Terms" name="paymentTerms" rules={[{ required: true }]}>
            <Select onChange={(val) => {
              const orderTotal = orderEditTarget?.total || orderEditTarget?.totalAmount || 0;
              let suggestedAdvance = 0;
              if (val === 'BEFORE_100') suggestedAdvance = orderTotal;
              else if (val === 'ON_DISPATCH' || val === '50_ADVANCE_50_AFTER') suggestedAdvance = Math.round(orderTotal * 0.5);
              else if (val === 'CREDIT_10_30') suggestedAdvance = 0;
              orderEditForm.setFieldValue('advance', suggestedAdvance);
            }}>
              {PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms}>
            {({ getFieldValue }) => {
              const pt = getFieldValue('paymentTerms');
              const orderTotal = orderEditTarget?.total || orderEditTarget?.totalAmount || 0;
              let adviceText = '';
              if (pt === 'BEFORE_100') adviceText = `Full payment — expected: ₹${orderTotal.toLocaleString()}`;
              else if (pt === 'ON_DISPATCH') adviceText = `50% advance — expected: ₹${Math.round(orderTotal * 0.5).toLocaleString()}`;
              else if (pt === '50_ADVANCE_50_AFTER') adviceText = `50% advance — expected: ₹${Math.round(orderTotal * 0.5).toLocaleString()}`;
              else if (pt === 'CREDIT_10_30') adviceText = 'Credit terms — advance: ₹0';
              return adviceText ? (
                <div style={{ marginTop: -10, marginBottom: 12, padding: '6px 10px', background: 'rgba(177,30,106,0.06)', borderRadius: 6, border: '1px solid rgba(177,30,106,0.15)' }}>
                  <Text type="secondary" style={{ fontSize: 12, color: '#B11E6A' }}>{adviceText}</Text>
                </div>
              ) : null;
            }}
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms}>
            {({ getFieldValue }) => {
              const pt = getFieldValue('paymentTerms');
              if (pt === '50_ADVANCE_50_AFTER') {
                return (
                  <Form.Item label="Payment Reminder Date" name="paymentReminderDate" rules={[{ required: true, message: 'Select reminder date' }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                );
              }
              if (pt === 'CREDIT_10_30') {
                return (
                  <Form.Item label="Credit Due Date" name="paymentReminderDate" rules={[{ required: true, message: 'Select credit due date' }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Divider style={{ margin: '12px 0 10px', fontSize: 12, color: '#B11E6A', borderColor: 'rgba(177,30,106,0.2)' }}>
            <Space><DollarOutlined style={{ color: '#B11E6A' }} /><span style={{ color: '#B11E6A', fontWeight: 600 }}>Payment Collection</span></Space>
          </Divider>
          <Form.List name="paymentCollection">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} style={{ background: 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <Row gutter={[8, 0]} align="middle">
                      <Col xs={24} sm={8}>
                        <Form.Item {...rest} name={[name, 'paymentMethod']} label="Method" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Select method' }]}>
                          <Select placeholder="Select method" size="small">
                            {COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item {...rest} name={[name, 'paidAmount']} label="Amount (₹)" style={{ marginBottom: 0 }}>
                          <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="e.g. 5000" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={6}>
                        <Form.Item {...rest} name={[name, 'notes']} label="Notes" style={{ marginBottom: 0 }}>
                          <Input size="small" placeholder="Ref / notes" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                        <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 8 }}>
                  + Add Payment Entry
                </Button>
              </>
            )}
          </Form.List>

          {/* Auto-computed payment status based on collection entries vs order total */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const rawColl = getFieldValue('paymentCollection');
              const collection = Array.isArray(rawColl) ? rawColl : [];
              const collTotal = collection.reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
              const orderTotal = orderEditTarget?.total || orderEditTarget?.totalAmount || 0;
              const status = orderTotal > 0 && collTotal >= orderTotal
                ? 'Paid'
                : collTotal > 0
                ? 'Partially Paid'
                : 'Unpaid';
              const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
              const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
              return (
                <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                  <Space size={12}>
                    {collTotal > 0 && (
                      <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                        Collected: ₹{collTotal.toLocaleString()} / ₹{orderTotal.toLocaleString()}
                      </Text>
                    )}
                    <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                  </Space>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}

const ORDER_STATUS_COLORS = {
  'In Production': '#B11E6A', 'Dispatch Ready': '#8a1652',
  'Payment Pending': '#fa8c16', Completed: '#52c41a',
  Dispatched: '#1890ff', Closed: '#aaa', Cancelled: '#ff4d4f',
};

function ExpandedPartyOrders({ hotelName }) {
  const { data, isLoading } = useGetOrdersByHotelNameQuery(hotelName, { skip: !hotelName });
  const orders = data?.data || [];

  if (isLoading) {
    return <div style={{ padding: '16px 24px' }}><Spin size="small" /> Loading orders…</div>;
  }

  if (!orders.length) {
    return (
      <div style={{ padding: '16px 24px', color: '#aaa', fontSize: 13 }}>
        No orders found for this hotel.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 24px 16px', background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600, letterSpacing: 0.3 }}>
        {orders.length} ORDER{orders.length !== 1 ? 'S' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {orders.map((order, i) => {
          const items = order.items?.length ? order.items : (order.products || []);
          // Compute total from per-item gst% to avoid trusting a potentially double-counted stored total
          const _subtotal = items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0), 0);
          const _gstFromItems = items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
          const _gst = _gstFromItems > 0 ? _gstFromItems : (Number(order.gstAmount) || 0);
          const amount = _subtotal > 0 ? Math.round(_subtotal + _gst) : (Number(order.total) || Number(order.amount) || 0);
          return (
            <div
              key={order._id || i}
              style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                background: '#fff', borderRadius: 8, padding: '10px 14px',
                border: '1px solid #f0f0f0', fontSize: 13,
              }}
            >
              <Text strong style={{ color: '#B11E6A', width: 110, flexShrink: 0 }}>
                {order.orderCode || `#${i + 1}`}
              </Text>
              <div style={{ flex: '1 1 160px', minWidth: 120 }}>
                {items.length ? (
                  items.map((it, j) => (
                    <div key={j} style={{ fontSize: 12, lineHeight: '18px' }}>
                      {it.itemName || it.name || '—'}{it.qty ? ` × ${it.qty}` : ''}
                    </div>
                  ))
                ) : (
                  <Text style={{ color: '#aaa' }}>—</Text>
                )}
              </div>
              <Text strong style={{ width: 90, flexShrink: 0 }}>
                ₹{amount.toLocaleString()}
              </Text>
              <div style={{ width: 130, flexShrink: 0 }}>
                <Tag color={ORDER_STATUS_COLORS[order.status] || '#ccc'} style={{ fontSize: 12 }}>
                  {order.status || '—'}
                </Tag>
              </div>
              <Text style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}
