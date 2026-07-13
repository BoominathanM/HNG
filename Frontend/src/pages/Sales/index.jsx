import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import dayjs from 'dayjs';
import {
  Tabs, Card, Table, Button, Tag, Space, Input, Select, Modal, Form, Row, Col, Typography,
  Drawer, Steps, Divider, Badge, InputNumber, Tooltip, Checkbox, Slider, Upload, Progress,
  DatePicker, Descriptions, Timeline, AutoComplete, Switch,
  Spin, Popconfirm, Alert,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined,
  FileTextOutlined, PhoneOutlined, MailOutlined, UserOutlined,
  WhatsAppOutlined, MinusCircleOutlined, CheckOutlined, CheckCircleOutlined,
  DownloadOutlined, UploadOutlined, ArrowRightOutlined, PrinterOutlined,
  BankOutlined, EnvironmentOutlined, TeamOutlined, CalendarOutlined,
  ShoppingCartOutlined, SettingOutlined, CarOutlined, CreditCardOutlined,
  HistoryOutlined, StarOutlined, SaveOutlined, GiftOutlined, TrophyOutlined,
  WarningOutlined, ExclamationCircleOutlined, DollarOutlined, AlertFilled, ExperimentOutlined,
  AppstoreOutlined, LoadingOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { generatePrintHTML } from '../../components/templates/DocumentTemplate';
import { buildDocComposition } from '../../utils/docComposition';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
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
  useCreatePartyMutation,
  useGetOrdersByHotelNameQuery,
  useGetRemindersQuery,
  useGetHotelNamesQuery,
  useLazyLookupHotelQuery,
  useGetComplaintHistoryQuery,
  useGetItemsQuery,
  useUploadFilesMutation,
  useGetStickerRequestsQuery,
  useApproveStickerRequestMutation,
  useGetCompanySettingsQuery,
  useGetPackingConfigQuery,
  useApproveEmergencySalesHeadMutation,
  useGetEmergencyRequestsQuery,
  useLazyVerifyGstinQuery,
} from '../../store/api/apiSlice';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import SelectWithAdd from '../../components/common/SelectWithAdd';
import PhoneInput from '../../components/common/PhoneInput';
import { emailRules, phoneValidator } from '../../utils/validation';

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

// ─── Order-composition categories ────────────────────────────────────────────
// A single order may mix all three; the grand total is A + B + C + forwarding.
//  • personalized      (A) = a kit + extra products customized together as one unit
//  • separate_kit      (B) = a kit purchased as-is, standalone
//  • separate_product  (C) = an individual non-kit product
const ORDER_CATEGORIES = {
  PERSONALIZED: 'personalized',
  SEPARATE_KIT: 'separate_kit',
  SEPARATE_PRODUCT: 'separate_product',
};

const PRODUCT_SELECTION_OPTIONS = [
  { value: ORDER_CATEGORIES.PERSONALIZED, label: 'Personalized (Kit + Products)' },
  { value: ORDER_CATEGORIES.SEPARATE_PRODUCT, label: 'Separate Product' },
];

const CATEGORY_META = {
  [ORDER_CATEGORIES.PERSONALIZED]: { label: 'Personalized', short: 'A', color: '#7c3aed' },
  [ORDER_CATEGORIES.SEPARATE_KIT]: { label: 'Separate Kit', short: 'B', color: '#0ea5e9' },
  [ORDER_CATEGORIES.SEPARATE_PRODUCT]: { label: 'Separate Product', short: 'C', color: '#ec4899' },
};

// productType may hold the new 3-category values, the legacy 2-value set, or a single string.
// These helpers normalize all of those so old records keep rendering and new ones drive the
// 3-category UI/totals. Legacy mapping: 'PERSONALIZED_KIT' → a kit, 'SEPARATE_PRODUCT' → C.
const ALL_PRODUCT_TYPE_OPTIONS = [...PRODUCT_SELECTION_OPTIONS, ...PERSONALIZATION_OPTIONS];
const productTypeLabel = (pt) => (ALL_PRODUCT_TYPE_OPTIONS.find(o => o.value === pt)?.label || pt);
const ptArr = (productType) => (Array.isArray(productType) ? productType : (productType ? [productType] : []));
const ptHasPersonalized = (pt) => ptArr(pt).includes(ORDER_CATEGORIES.PERSONALIZED);
const ptHasSeparateKit = (pt) => ptArr(pt).includes(ORDER_CATEGORIES.SEPARATE_KIT);
// Personalization/customization specs (display unit, size, sticker, logo, printing) only apply to a
// Personalized kit. A Separate Kit is bought as-is, so those fields are hidden for it. Legacy
// 'PERSONALIZED_KIT' records are treated as personalized.
const ptHasPersonalizedUI = (pt) => {
  const a = ptArr(pt);
  return a.includes(ORDER_CATEGORIES.PERSONALIZED) || a.includes('PERSONALIZED_KIT');
};
// Show the kit configuration UI when any kit-bearing category (new or legacy) is selected.
const ptHasKitUI = (pt) => {
  const a = ptArr(pt);
  return a.includes('PERSONALIZED_KIT') || a.includes(ORDER_CATEGORIES.PERSONALIZED) || a.includes(ORDER_CATEGORIES.SEPARATE_KIT);
};
// Show the separate-product UI when the separate-product category (new or legacy) is selected.
const ptHasSeparateUI = (pt) => {
  const a = ptArr(pt);
  return a.includes('SEPARATE_PRODUCT') || a.includes(ORDER_CATEGORIES.SEPARATE_PRODUCT);
};
// Default category for a newly-selected kit, based on which kit categories the user picked.
// If both personalized & separate-kit are selected we default each kit to personalized and let
// the user flip individual kits to separate-kit via the per-kit selector.
const defaultKitCategory = (pt) =>
  ptHasPersonalized(pt) ? ORDER_CATEGORIES.PERSONALIZED
    : ptHasSeparateKit(pt) ? ORDER_CATEGORIES.SEPARATE_KIT
      : ORDER_CATEGORIES.SEPARATE_KIT;

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
  { value: 'Ziplock', label: 'Ziplock' },
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

// ─── Per-product / per-kit file attachments ───────────────────────────
// Bridge AntD Upload fileList ↔ persisted [{ name, url, public_id, uid }].
// On save we strip File objects so only Cloudinary URLs persist; on edit/view we
// rehydrate to a "done" fileList so previously uploaded files show again.
function normalizeAttachments(fileList) {
  return (Array.isArray(fileList) ? fileList : [])
    .map((f) => (typeof f === 'string'
      ? { url: f, name: f.split('/').pop() }
      : {
          name: f.name || f.originFileObj?.name || f.fileName,
          url: f.url || f.response?.url,
          public_id: f.cloudPublicId || f.public_id || f.response?.public_id,
          uid: f.uid,
        }))
    .filter((f) => f.url);
}

function attachmentsToFileList(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter(Boolean)
    .map((f, i) => (typeof f === 'string'
      ? { uid: `att-${i}-${f}`, name: f.split('/').pop() || `Attachment ${i + 1}`, status: 'done', url: f, thumbUrl: f }
      : {
          uid: f.uid || `att-${i}-${f.url || f.name || ''}`,
          name: f.name || `Attachment ${i + 1}`,
          status: 'done',
          url: f.url,
          thumbUrl: f.url,
          cloudPublicId: f.public_id || f.cloudPublicId,
        }))
    .filter((f) => f.url);
}

// Render saved attachments as image thumbnails (images) or file-name tags (others), each
// linking to its Cloudinary URL. Reused across every product/kit detail view.
function AttachmentLinks({ files }) {
  const list = (Array.isArray(files) ? files : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
  if (!list.length) return null;
  return (
    <Space wrap size={8}>
      {list.map((a, i) => {
        const url = typeof a === 'string' ? a : a.url;
        const nm = typeof a === 'string' ? (url.split('/').pop()) : (a.name || `File ${i + 1}`);
        const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url || '');
        return (
          <a key={i} href={url} target="_blank" rel="noreferrer" title={nm} style={{ display: 'inline-block' }}>
            {isImg
              ? <img src={url} alt={nm} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
              : <Tag icon={<FileTextOutlined />} color="blue" style={{ borderRadius: 12, fontSize: 11, cursor: 'pointer', margin: 0 }}>{nm}</Tag>}
          </a>
        );
      })}
    </Space>
  );
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

  if (processed.products) processed.products = normalizeProducts(processed.products).map((p) =>
    (p && typeof p === 'object' && !Array.isArray(p)) ? { ...p, attachments: attachmentsToFileList(p.attachments) } : p);
  // Convert legacy single-kit format → multi-kit format
  if (processed.selectedKit && !processed.selectedKits) {
    processed.selectedKits = [processed.selectedKit];
  }

  // Reconcile the two Kit-Details surfaces so every field is populated on edit/view no
  // matter which surface it was originally entered on:
  //  • the top "Products adding" card binds the shared top-level fields (kitDisplayUnit, …)
  //  • each per-kit "Order Details" card binds kitOrders[i].{displayUnit,size,sticker,…}
  // We backfill in BOTH directions and keep kitOrders aligned (by kitId) with selectedKits
  // so the positional per-kit cards map to the right kit.
  const pickVal = (...vals) => {
    for (const v of vals) if (v != null && v !== '') return v;
    return undefined;
  };
  const selectedKits = Array.isArray(processed.selectedKits) ? processed.selectedKits : [];
  const existingKitOrders = Array.isArray(processed.kitOrders) ? processed.kitOrders : [];
  if (selectedKits.length > 0) {
    processed.kitOrders = selectedKits.map((kitId, i) => {
      const ko = existingKitOrders.find(o => o && o.kitId === kitId) || existingKitOrders[i] || {};
      // Normalize kitIncludes: backend stores [{id,qty}], form needs [id] + {id:qty} map
      const rawIncludes = ko.kitIncludes || [];
      const isObjFormat = rawIncludes.length > 0 && rawIncludes[0] != null && typeof rawIncludes[0] === 'object' && rawIncludes[0].id != null;
      const kitIncludes = isObjFormat ? rawIncludes.map(item => item.id) : rawIncludes;
      const kitIncludesQty = isObjFormat
        ? Object.fromEntries(rawIncludes.map(item => [item.id, item.qty || 1]))
        : {};
      return {
        ...ko,
        kitId,
        category: ko.category || defaultKitCategory(processed.productType),
        displayUnit: pickVal(ko.displayUnit, processed.kitDisplayUnit, processed.displayUnit) ?? '',
        size: pickVal(ko.size, processed.kitSize) ?? '',
        sticker: pickVal(ko.sticker, processed.kitSticker) ?? '',
        logo: pickVal(ko.logo, processed.kitLogo) ?? '',
        printing: pickVal(ko.printing, processed.kitPrinting) ?? '',
        overallQty: pickVal(ko.overallQty, processed.kitOverallQty),
        kitPrice: pickVal(ko.kitPrice, processed.kitPrice),
        kitIncludes,
        kitIncludesQty,
        attachments: attachmentsToFileList(ko.attachments),
      };
    });
    // Backfill the shared top-level fields from the first kit so the "Products adding" card
    // also shows values even when they were only entered in the per-kit Order Details cards.
    const first = processed.kitOrders[0] || {};
    processed.kitDisplayUnit = pickVal(processed.kitDisplayUnit, processed.displayUnit, first.displayUnit);
    processed.kitSize = pickVal(processed.kitSize, first.size);
    processed.kitSticker = pickVal(processed.kitSticker, first.sticker);
    processed.kitLogo = pickVal(processed.kitLogo, first.logo);
    processed.kitPrinting = pickVal(processed.kitPrinting, first.printing);
    processed.kitOverallQty = pickVal(processed.kitOverallQty, first.overallQty);
    processed.kitPrice = pickVal(processed.kitPrice, first.kitPrice);
  } else if (existingKitOrders.length > 0) {
    processed.kitOrders = existingKitOrders.map((ko) => ({ ...ko, attachments: attachmentsToFileList(ko.attachments) }));
  }

  // Normalize packagingIncludes: backend may store [{id,qty}] → convert to [id] + {id:qty}
  const rawPkg = processed.packagingIncludes;
  if (Array.isArray(rawPkg) && rawPkg.length > 0 && typeof rawPkg[0] === 'object' && rawPkg[0]?.id != null) {
    processed.packagingIncludesQty = Object.fromEntries(rawPkg.map(item => [item.id, item.qty || 1]));
    processed.packagingIncludes = rawPkg.map(item => item.id);
  }

  // Existing saved payment entries are shown as read-only display cards above the Form.List.
  // The Form.List itself starts empty so users only add NEW entries here.
  processed.paymentCollection = [];

  return processed;
}

// Round money to 2 decimals — strips floating-point noise (e.g. 35.400000001 → 35.4)
// WITHOUT collapsing genuine decimals to whole rupees. Used everywhere we previously
// did r2() on a currency value so prices/totals keep their exact decimal value.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

// Resolve a product row's order-composition category, inferring for legacy rows
// that predate the `category` field. Kit rows inherit their kit's category;
// everything else defaults to a standalone separate product.
function rowCategory(p, kitOrders = []) {
  if (!p) return ORDER_CATEGORIES.SEPARATE_PRODUCT;
  if (p.category) return p.category;
  if (p.isKit || p.kitType) {
    const ko = (kitOrders || []).find(o => o && o.kitId && o.kitId === p.kitId);
    if (ko?.category) return ko.category;
    return ORDER_CATEGORIES.SEPARATE_KIT;
  }
  return ORDER_CATEGORIES.SEPARATE_PRODUCT;
}

const koCategory = (ko) => (ko && ko.category) || ORDER_CATEGORIES.SEPARATE_KIT;

// GST-inclusive value of one kit: kitPrice × overallQty, falling back to the sum of
// its component product line subtotals (× qty) when a price hasn't been entered yet.
// Separate Kit (category B) always counts BOTH the kit's own price AND its included products'
// price (kitPrice + rows sum) — neither is skipped. Personalized (A) keeps the original
// behavior: trust a stored kitPrice, falling back to rows sum only when it's empty.
function kitOrderValue(ko, kitRows = []) {
  const price = Number(ko?.kitPrice) || 0;
  const qty = Number(ko?.overallQty) || 0;
  const rows = kitRows.filter(p => p && p.kitId === ko?.kitId);
  const sub = rows.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
  const rowsSum = r2(sub + gst);
  if (koCategory(ko) === ORDER_CATEGORIES.SEPARATE_KIT) {
    return r2((price + rowsSum) * (qty || 1));
  }
  if (price > 0) return r2(price * (qty || 1));
  return r2(rowsSum * (qty || 1));
}

// Stamp every product row with its order-composition category. Kit rows follow their
// kit's category (so flipping a kit between Personalized/Separate Kit propagates to its
// rows); non-kit rows default to a standalone separate product unless already tagged.
function tagProductCategories(products = [], kitOrders = []) {
  return (products || []).filter(Boolean).map(p => {
    if (p.isKit || p.kitType) {
      const ko = (kitOrders || []).find(o => o && o.kitId && o.kitId === p.kitId);
      return { ...p, category: ko?.category || p.category || ORDER_CATEGORIES.SEPARATE_KIT };
    }
    return { ...p, category: p.category || ORDER_CATEGORIES.SEPARATE_PRODUCT };
  });
}

// GST-inclusive subtotal of a set of (non-kit) product rows.
function sumProductRows(rows = []) {
  const sub = rows.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0), 0);
  const gst = rows.reduce((s, p) => s + (Number(p.qty)||0)*(Number(p.rate)||0)*((Number(p.gst)||0)/100), 0);
  return r2(sub + gst);
}

// Single source of truth for category buckets shown across detail/payment views.
// Returns { personalized (A), separateKit (B), separateProduct (C), fwd, grand }.
function computeRecordBuckets(rec = {}) {
  const prods = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  const cat = (p) => rowCategory(p, kitOrders);

  const kitRows = prods.filter(p => p.isKit || p.kitType);
  const persProdRows = prods.filter(p => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.PERSONALIZED);
  const sepProdRows = prods.filter(p => !(p.isKit || p.kitType) && cat(p) === ORDER_CATEGORIES.SEPARATE_PRODUCT);

  let personalizedKit = 0;
  let separateKit = 0;
  if (kitOrders.length) {
    kitOrders.forEach(ko => {
      const val = kitOrderValue(ko, kitRows);
      if (koCategory(ko) === ORDER_CATEGORIES.PERSONALIZED) personalizedKit += val;
      else separateKit += val;
    });
  } else if (kitRows.length) {
    // Legacy records (no kitOrders): value kit rows as one standalone-kit bucket.
    const topPrice = Number(rec.kitPrice) || 0;
    const topQty = Number(rec.kitOverallQty) || 0;
    separateKit += topPrice > 0 ? r2(topPrice * (topQty || 1)) : sumProductRows(kitRows);
  }

  const personalized = personalizedKit + sumProductRows(persProdRows);
  const separateProduct = sumProductRows(sepProdRows);
  const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
  // Courier/shipping charge recorded via Record Payment In (Billing) — extra amount owed
  // on top of the order, entered per-payment rather than stored on the record itself.
  const courier = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
  const grand = r2(personalized + separateKit + separateProduct + fwd + courier);
  return { personalized, separateKit, separateProduct, fwd, courier, grand };
}

// Backward-compatible scalar grand total (kept for existing call sites).
function computeRecordGrandTotal(rec = {}) {
  return computeRecordBuckets(rec).grand;
}

// Grand total = Personalized (A) + Separate Kit (B) + Separate Product (C) + forwarding, each
// billed at its OWN price × qty (via computeRecordBuckets / computeRecordGrandTotal).
//
// IMPORTANT: this must NOT subtract a "consumed/included" quantity. "Select Kit(s) to Include"
// (packagingIncludes) is a physical packing instruction — what physically goes inside the
// personalized kit — NOT a price discount, so included kits/products are still charged in full.
// The previous "remaining" math made B and C collapse to ₹0 once they were included in A, which
// is why the total read correctly on ADD (packagingIncludes still empty) but dropped to just
// A + forwarding on EDIT/VIEW (prepareFormValues repopulates packagingIncludes on reload).
// When packagingIncludes is non-empty (some kits/products are consumed inside a personalized
// outer packaging), computeRecordBuckets gives the wrong result because it doesn't understand
// partial consumption — it counts ALL kit quantity as either personalized or separate and skips
// the top-level kitPrice×kitOverallQty packaging cost entirely.
// In that case, delegate to computePersonalizedComposition which correctly computes:
//   A = outer packaging + consumed kit product costs (NOT per-kit packaging of included kits)
//   B = remaining kits × (kitPkgPrice + prodsSub) per kit
//   C = remaining separate products × unitRate
// + forwarding, giving a total that matches the ORDER COMPOSITION BREAKDOWN display.
function computeCompositionGrandTotal(formData = {}, kitsData = []) {
  if ((formData.packagingIncludes || []).length > 0 && kitsData.length > 0) {
    const comp = computePersonalizedComposition(formData, kitsData);
    const fwd = formData.forwardingCharge ? r2(Number(formData.forwardingChargeAmount) || 0) : 0;
    const courier = r2((formData.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    const B = comp.separateKits.reduce((s, sk) => s + (sk.remainingValue || 0), 0);
    const C = comp.sepProdsList.reduce((s, sp) => s + (sp.remainingValue || 0), 0);
    return r2(comp.totalPersonalized + B + C + fwd + courier);
  }
  return computeRecordGrandTotal(formData);
}

// Combine kitIncludes (id[]) + kitIncludesQty ({id:qty}) into [{id,qty}] for persistence.
// Handles both input formats: [id] strings (form format) and [{id,qty}] objects (backend format).
function normalizeKitOrdersForSave(kitOrders = [], productType) {
  return (kitOrders || []).map(o => {
    const rawIncludes = (o.kitIncludes || []);
    let combined;
    if (rawIncludes.length > 0) {
      const isObjFormat = rawIncludes[0] != null && typeof rawIncludes[0] === 'object' && rawIncludes[0].id != null;
      combined = isObjFormat
        ? rawIncludes.map(item => ({ id: item.id, qty: Number(item.qty) || 1 }))
        : rawIncludes.map(id => ({ id, qty: Number(o.kitIncludesQty?.[id]) || 1 }));
    }
    const { kitIncludesQty, ...rest } = o;
    return {
      ...rest,
      kitIncludes: combined,
      overallQty: Number(o.overallQty) || undefined,
      kitPrice: o.kitPrice != null ? Number(o.kitPrice) : undefined,
      category: o.category || defaultKitCategory(productType),
      attachments: normalizeAttachments(o.attachments),
    };
  });
}

const fmtINR = (n) => `₹${r2(Number(n) || 0).toLocaleString()}`;

function computePersonalizedComposition(formData = {}, kitsData = []) {
  const piRaw = formData.packagingIncludes || [];
  let piIds, piQtyMap;
  if (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null) {
    piIds = piRaw.map(p => p.id);
    piQtyMap = Object.fromEntries(piRaw.map(p => [p.id, Number(p.qty) || 1]));
  } else {
    piIds = piRaw;
    piQtyMap = formData.packagingIncludesQty || {};
  }

  const persQty = Number(formData.kitOverallQty) || 1;
  const persPrice = Number(formData.kitPrice) || 0;
  const pkgTotal = persPrice * persQty;
  const allProds = (formData.products || []).filter(Boolean);
  const kitOrders = (formData.kitOrders || []).filter(Boolean);
  const kitUsage = {};
  const prodUsage = {};

  const includedKits = piIds.map(id => {
    const kDef = kitsData.find(k => k._id === id);
    if (!kDef) return null;
    // totalConsumed = the exact count entered — total going into ALL personalized kits combined
    const totalConsumed = Number(piQtyMap[id]) || 1;
    kitUsage[id] = totalConsumed;
    const kOrder = kitOrders.find(ko => ko.kitId === id) || {};
    const kitPkgPrice = Number(kOrder.kitPrice) || 0;
    const kitOrderQty = Number(kOrder.overallQty) || 0;
    const kitProds = allProds.filter(p => (p.isKit || p.kitType) && p.kitId === id);
    const prodLines = kitProds.map(p => {
      const q = Number(p.qty) || 0;
      const r = Number(p.rate) || 0;
      const g = Number(p.gst) || 0;
      const subPer = r2(q * r * (1 + g / 100));
      return { name: p.name || p.kitType || '—', qtyPerKit: q, rate: r, subtotalPerKit: subPer, totalQty: q * totalConsumed, totalValue: subPer * totalConsumed };
    });
    const prodsTotalPerKit = prodLines.reduce((s, pl) => s + pl.subtotalPerKit, 0);
    const kitValuePerKit = kitPkgPrice + prodsTotalPerKit;
    const kitTotal = kitValuePerKit * totalConsumed;
    const remaining = Math.max(0, kitOrderQty - totalConsumed);
    const isOver = kitOrderQty > 0 && totalConsumed > kitOrderQty;
    return { kitId: id, kitName: kDef.kitName || id, totalConsumed, kitPkgPrice, kitPkgTotal: kitPkgPrice * totalConsumed, prodLines, prodsTotalPerKit, prodsTotal: prodsTotalPerKit * totalConsumed, kitValuePerKit, kitTotal, kitOrderQty, remaining, isOver };
  }).filter(Boolean);

  const includedSepProds = piIds.map(id => {
    const p = allProds.find(pp => !pp.isKit && !pp.kitType && (pp.name || pp.itemName) === id);
    if (!p) return null;
    // totalConsumed = exact count entered — total going into ALL personalized kits combined
    const totalConsumed = Number(piQtyMap[id]) || 1;
    prodUsage[id] = totalConsumed;
    const r = Number(p.rate) || 0;
    const g = Number(p.gst) || 0;
    const unitRate = r * (1 + g / 100);
    const totalOrderQty = Number(p.qty) || 0;
    const remaining = Math.max(0, totalOrderQty - totalConsumed);
    const isOver = totalOrderQty > 0 && totalConsumed > totalOrderQty;
    return { name: id, totalConsumed, rate: r, unitRate, totalValue: r2(totalConsumed * unitRate), totalOrderQty, remaining, remainingValue: r2(remaining * unitRate), isOver };
  }).filter(Boolean);

  const inclKitTotal = includedKits.reduce((s, ik) => s + ik.kitTotal, 0);
  const inclSepTotal = includedSepProds.reduce((s, sp) => s + sp.totalValue, 0);

  // Outer kit's own products — only computed when something IS selected in packagingIncludes,
  // so the PRODUCTS row only appears when there's an inclusion context to give it meaning.
  // When packagingIncludes is empty the per-kit "Order Details" card already covers the kit's products.
  const ownKitProdsPerPers = piIds.length > 0
    ? allProds
        .filter(p => (p.isKit || p.kitType) && p.kitId && !piIds.includes(p.kitId))
        .reduce((s, p) => s + r2((Number(p.qty)||0)*(Number(p.rate)||0)*(1+(Number(p.gst)||0)/100)), 0)
    : 0;
  const ownKitProdsTotal = ownKitProdsPerPers * persQty;

  const totalPersonalized = r2(pkgTotal + ownKitProdsTotal + inclKitTotal + inclSepTotal);
  const totalPerPersKit = persQty > 0 ? r2(totalPersonalized / persQty) : totalPersonalized;

  const separateKits = kitOrders.map(ko => {
    if (!ko || !ko.kitId) return null;
    const kDef = kitsData.find(k => k._id === ko.kitId);
    const origQty = Number(ko.overallQty) || 0;
    const consumed = kitUsage[ko.kitId] || 0;
    const remaining = Math.max(0, origQty - consumed);
    const isOver = origQty > 0 && consumed > origQty;
    const kitProds = allProds.filter(p => (p.isKit || p.kitType) && p.kitId === ko.kitId);
    const prodsSub = kitProds.reduce((s, p) => s + r2((Number(p.qty)||0)*(Number(p.rate)||0)*(1+(Number(p.gst)||0)/100)), 0);
    const kitPkgPrice = Number(ko.kitPrice) || 0;
    const valuePerKit = kitPkgPrice + prodsSub;
    return { kitId: ko.kitId, kitName: kDef?.kitName || ko.kitId, origQty, consumed, remaining, isOver, kitPkgPrice, prodsSub, valuePerKit, remainingValue: r2(remaining * valuePerKit), includedInPersonalized: piIds.includes(ko.kitId) };
  }).filter(Boolean);

  const sepProdsList = allProds.filter(p => p && !p.isKit && !p.kitType).map(p => {
    const name = p.name || p.itemName || '';
    const consumed = prodUsage[name] || 0;
    const origQty = Number(p.qty) || 0;
    const remaining = Math.max(0, origQty - consumed);
    const r = Number(p.rate) || 0;
    const g = Number(p.gst) || 0;
    const unitRate = r * (1 + g / 100);
    const isOver = origQty > 0 && consumed > origQty;
    return { name, origQty, consumed, remaining, isOver, rate: r, unitRate, origValue: r2(origQty * unitRate), remainingValue: r2(remaining * unitRate), includedInPersonalized: piIds.includes(name) };
  });

  return { persQty, persPrice, pkgTotal, includedKits, includedSepProds, inclKitTotal, inclSepTotal, ownKitProdsTotal, ownKitProdsPerPers, totalPerPersKit, totalPersonalized, separateKits, sepProdsList };
}

function PersonalizedCompositionPanel({ comp, isDark }) {
  if (!comp) return null;
  const { persQty, persPrice, pkgTotal, includedKits, includedSepProds, inclKitTotal, inclSepTotal, totalPersonalized, separateKits, sepProdsList } = comp;
  const hasPersonalized = includedKits.length > 0 || includedSepProds.length > 0 || persPrice > 0;
  const bdr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  return (
    <div style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, color: '#475569', display: 'block', marginBottom: 8 }}>ORDER COMPOSITION BREAKDOWN</Text>
      {hasPersonalized && (
        <div style={{ marginBottom: 10, padding: '10px 14px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#722ed1' }}>
              <span style={{ background: '#722ed1', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginRight: 6 }}>A</span>
              PERSONALIZED KIT &mdash; {persQty} kit{persQty > 1 ? 's' : ''}
            </Text>
            <Text strong style={{ color: '#722ed1', fontSize: 14 }}>&#8377;{totalPersonalized.toLocaleString()}</Text>
          </div>
          {persPrice > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
              <Text type="secondary">Packaging &times; {persQty}</Text>
              <Text>&#8377;{persPrice.toLocaleString()} &times; {persQty} = <Text strong>&#8377;{pkgTotal.toLocaleString()}</Text></Text>
            </div>
          )}
          {includedKits.map(ik => (
            <div key={ik.kitId} style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid rgba(114,46,209,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <Text strong>{ik.kitName} — {ik.totalConsumed} kit{ik.totalConsumed !== 1 ? 's' : ''} in personalized</Text>
                <Text strong style={{ color: '#722ed1' }}>&#8377;{ik.kitTotal.toLocaleString()}</Text>
              </div>
              {ik.kitPkgPrice > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', paddingLeft: 4 }}>
                  <span>Kit packaging &times; {ik.totalConsumed}</span>
                  <span>&#8377;{ik.kitPkgPrice.toLocaleString()} &times; {ik.totalConsumed} = &#8377;{ik.kitPkgTotal.toLocaleString()}</span>
                </div>
              )}
              {ik.prodLines.map((pl, pi) => (
                <div key={pi} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', paddingLeft: 4 }}>
                  <span>{pl.name} &times; {pl.totalQty} pcs</span>
                  <span>&#8377;{pl.subtotalPerKit} &times; {ik.totalConsumed} = &#8377;{pl.totalValue.toLocaleString()}</span>
                </div>
              ))}
              {ik.isOver && <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block', marginTop: 2 }}>&#9888; Over-allocated: needs {ik.totalConsumed}, only {ik.kitOrderQty} ordered</Text>}
              {!ik.isOver && ik.kitOrderQty > 0 && ik.remaining > 0 && (
                <Text style={{ fontSize: 11, color: '#52c41a', display: 'block', marginTop: 2 }}>Separate remaining: {ik.remaining} kit{ik.remaining !== 1 ? 's' : ''} &rarr; &#8377;{(ik.remaining * ik.kitValuePerKit).toLocaleString()}</Text>
              )}
            </div>
          ))}
          {includedSepProds.map(sp => (
            <div key={sp.name} style={{ marginTop: 4, paddingLeft: 10, borderLeft: '2px solid rgba(250,140,22,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <Text type="secondary">{sp.name} — {sp.totalConsumed} pcs in personalized</Text>
                <Text strong>&#8377;{sp.totalValue.toLocaleString()}</Text>
              </div>
              {sp.remaining > 0 && (
                <Text style={{ fontSize: 11, color: '#52c41a', display: 'block', paddingLeft: 4 }}>
                  Separate remaining: {sp.remaining} pcs &rarr; &#8377;{sp.remainingValue.toLocaleString()}
                </Text>
              )}
              {sp.isOver && <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block', paddingLeft: 4 }}>&#9888; Over by {sp.totalConsumed - sp.totalOrderQty} pcs</Text>}
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${bdr}` }}>
            {persPrice > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
              <span>Packaging ({persQty} kits)</span><span>&#8377;{pkgTotal.toLocaleString()}</span>
            </div>}
            {inclKitTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
              <span>Included kits</span><span>&#8377;{inclKitTotal.toLocaleString()}</span>
            </div>}
            {inclSepTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
              <span>Included products</span><span>&#8377;{inclSepTotal.toLocaleString()}</span>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
              <Text style={{ fontWeight: 700, color: '#722ed1' }}>TOTAL PERSONALIZED</Text>
              <Text strong style={{ fontSize: 15, color: '#52c41a' }}>&#8377;{totalPersonalized.toLocaleString()}</Text>
            </div>
          </div>
        </div>
      )}
      {separateKits.map(sk => (
        <div key={sk.kitId} style={{ marginBottom: 8, padding: '10px 14px', background: isDark ? 'rgba(24,144,255,0.06)' : 'rgba(24,144,255,0.04)', borderRadius: 10, border: `1px solid ${sk.isOver ? 'rgba(255,77,79,0.4)' : 'rgba(24,144,255,0.2)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#1890ff' }}>
              <span style={{ background: '#1890ff', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginRight: 6 }}>B</span>
              {sk.kitName}{sk.includedInPersonalized ? ' (Separate Remaining)' : ''}
            </Text>
            <Text strong style={{ fontSize: 13, color: sk.isOver ? '#ff4d4f' : '#1890ff' }}>
              {sk.isOver ? `⚠ Over by ${sk.consumed - sk.origQty}` : `${sk.remaining} kit${sk.remaining !== 1 ? 's' : ''}`}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#888' }}>
            {sk.includedInPersonalized
              ? <span>Total ordered: {sk.origQty} | Used in personalized: {sk.consumed} | Remaining: {sk.remaining}</span>
              : <span>Qty: {sk.origQty} | Per kit: &#8377;{sk.kitPkgPrice.toLocaleString()} + Products &#8377;{sk.prodsSub.toLocaleString()} = &#8377;{sk.valuePerKit.toLocaleString()}/kit</span>
            }
            <Text strong>&#8377;{sk.remainingValue.toLocaleString()}</Text>
          </div>
        </div>
      ))}
      {sepProdsList.filter(p => p.origQty > 0).map(sp => (
        <div key={sp.name} style={{ marginBottom: 6, padding: '8px 14px', background: isDark ? 'rgba(177,30,106,0.06)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: `1px solid ${sp.isOver ? 'rgba(255,77,79,0.4)' : 'rgba(177,30,106,0.15)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A' }}>
              <span style={{ background: '#B11E6A', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginRight: 6 }}>C</span>
              {sp.name}
            </Text>
            <Text strong style={{ fontSize: 13, color: sp.isOver ? '#ff4d4f' : '#B11E6A' }}>&#8377;{sp.remainingValue.toLocaleString()}</Text>
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
            {sp.includedInPersonalized
              ? <span>Total: {sp.origQty} | Used in personalized: {sp.consumed} | Remaining: {sp.remaining} pcs{sp.isOver ? <span style={{ color: '#ff4d4f' }}> &#9888; Over by {sp.consumed - sp.origQty}</span> : ''}</span>
              : <span>{sp.origQty} pcs &times; &#8377;{sp.rate.toLocaleString()} = &#8377;{sp.origValue.toLocaleString()}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// Reusable 3-bucket total panel: Personalized (A) + Separate Kit (B) + Separate Product (C)
// + Forwarding → Grand Total. Shown across lead/quotation/negotiation/order views & payment.
// kitsData must be passed for personalized-with-packagingIncludes orders so the composition-
// aware calculation (computePersonalizedComposition) is used instead of computeRecordBuckets,
// which miscounts the A bucket when some kits/products are consumed inside the outer packaging.
function CategoryTotalsBreakdown({ rec, isDark, kitsData = [] }) {
  let personalized, separateKit, separateProduct, fwd, courier, grand;
  if ((rec.packagingIncludes || []).length > 0 && kitsData.length > 0) {
    const comp = computePersonalizedComposition(rec, kitsData);
    const B = comp.separateKits.reduce((s, sk) => s + (sk.remainingValue || 0), 0);
    const C = comp.sepProdsList.reduce((s, sp) => s + (sp.remainingValue || 0), 0);
    fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
    courier = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    personalized = comp.totalPersonalized;
    separateKit = B;
    separateProduct = C;
    grand = r2(personalized + separateKit + separateProduct + fwd + courier);
  } else {
    const b = computeRecordBuckets(rec);
    personalized = b.personalized;
    separateKit = b.separateKit;
    separateProduct = b.separateProduct;
    fwd = b.fwd;
    courier = b.courier;
    grand = b.grand;
  }
  const rows = [
    { ...CATEGORY_META[ORDER_CATEGORIES.PERSONALIZED], val: personalized },
    { ...CATEGORY_META[ORDER_CATEGORIES.SEPARATE_KIT], val: separateKit },
    { ...CATEGORY_META[ORDER_CATEGORIES.SEPARATE_PRODUCT], val: separateProduct },
  ];
  const active = rows.filter(r => r.val > 0);
  const border = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #eef0f3';
  const labelColor = isDark ? '#cbd5e1' : '#475569';
  const sumTag = `${active.map(a => a.short).join('+')}${fwd > 0 ? '+Fwd' : ''}`;
  return (
    <div style={{ border, borderRadius: 12, padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fafbfc' }}>
      {active.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: labelColor }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: r.color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{r.short}</span>
            {r.label}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtINR(r.val)}</span>
        </div>
      ))}
      {fwd > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: labelColor }}>
          <span>Forwarding Charge</span><span style={{ fontWeight: 600 }}>{fmtINR(fwd)}</span>
        </div>
      )}
      {courier > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: labelColor }}>
          <span>Courier Charge</span><span style={{ fontWeight: 600 }}>{fmtINR(courier)}</span>
        </div>
      )}
      <div style={{ borderTop: border, marginTop: 6, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Grand Total{active.length > 1 ? ` (${sumTag})` : ''}</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#16a34a' }}>{fmtINR(grand)}</span>
      </div>
    </div>
  );
}

function generateWhatsAppText(data) {
  const lines = (data.products || []).filter(Boolean).map(p => `${p.name} - ${p.qty}(${p.rate})`).join('\n');
  const hotelTypeLine = data.hotelType === 'OLD' ? 'OLD HOTEL' : 'NEW HOTEL';
  const billLine = data.billType === 'GST' ? 'GST BILL' : 'NON GST BILL';
  const fwdLine = data.forwardingCharge ? `FORWARDING CHARGE: ₹${(data.forwardingChargeAmount || 0).toLocaleString()}` : 'NO FORWARDING CHARGE';
  const payLine = PAYMENT_LABELS[data.paymentTerms] || data.paymentTerms || '';
  let deliveryLine = '';
  if (data.deliveryBy === 'HNG' && data.transportationBy === 'CLIENT') {
    deliveryLine = 'Delivery done by HNG and Transportation Charge taken care by the Client';
  } else if (data.deliveryBy === 'CLIENT' && data.transportationBy === 'CLIENT') {
    deliveryLine = 'Delivery and Transportation Charge taken care by the Client';
  } else if (data.deliveryBy === 'HNG' && data.transportationBy === 'HNG') {
    deliveryLine = 'Delivery and Transportation Charge taken care by HNG';
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

// ─── Product-type helpers (mirrors Inventory dynamic-field system) ────────────
// Yes/No values are UPPERCASE to match the Order schema enum (items.sticker: 'YES'|'NO'|'')
// and the downstream checks in Operations (itemNeedsSticker, inferLogoType, DetailProductCards).
const _YES_NO = [{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }];
// Normalize any yes/no-ish value to the canonical enum value ('YES' | 'NO' | '').
const normYesNo = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'yes' ? 'YES' : s === 'no' ? 'NO' : '';
};
const _SOAP_SHAPES = [{ value: 'Square', label: 'Square' }, { value: 'Round', label: 'Round' }];
const _BOTTLE_TYPES = [{ value: 'Fliptop bottle', label: 'Fliptop bottle' }, { value: 'Screw type', label: 'Screw type' }];
const _CAP_TYPES = [{ value: 'Golden cap', label: 'Golden cap' }, { value: 'Normal cap', label: 'Normal cap' }];
const _BRUSH_TYPES = [{ value: 'Wooden', label: 'Wooden' }, { value: 'Plastic', label: 'Plastic' }];
const _SIZES_SOAP = ['15', '20', '30'].map(v => ({ value: v, label: `${v}g` }));
const _SIZES_LIQUID = ['15', '20', '25', '30'].map(v => ({ value: v, label: `${v}ml` }));

// Attribute keys that support multiple selection (both in Inventory add-item and Lead spec).
const MULTI_ATTR_KEYS = new Set(['fragrance', 'color', 'material', 'packingMaterial', 'brand']);
// Attribute keys that are always Yes/No decisions (both in Inventory add-item and Lead spec),
// used for generic/unrecognized product types whose attributes come straight from productAttributes.
const YES_NO_ATTR_KEYS = new Set(['sticker', 'logo', 'printing', 'stickerPrinting']);

// Per-product-type attribute fields — kept in sync with Inventory's PRODUCT_FIELD_DEFS so the
// lead form shows exactly the attributes that inventory collects for each product type. The
// `options` here are only fallbacks; at render time the dropdowns are populated from the actual
// values stored on the matching inventory items (see attrOptionsFor in ProductItem).
const PRODUCT_FIELD_DEFS_LEAD = {
  soap: [
    { key: 'shape', label: 'Shape', field: 'soap_shape', options: _SOAP_SHAPES },
    { key: 'size', label: 'Sizes (gram)', field: 'soap_size', options: _SIZES_SOAP },
    { key: 'stickerShape', label: 'Sticker Shape', field: 'soap_stickerShape', options: _SOAP_SHAPES },
    { key: 'fragrance', label: 'Fragrance', field: 'soap_fragrance', options: [] },
    { key: 'color', label: 'Color', field: 'soap_color', options: [] },
    { key: 'packingMaterial', label: 'Packing Material', field: 'soap_packingMaterial', options: [] },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'soap_stickerPrinting', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'soap_printing', options: _YES_NO },
  ],
  shampoo: [
    { key: 'bottleType', label: 'Bottle Type', field: 'shampoo_bottleType', options: _BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'shampoo_capType', options: _CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'shampoo_size', options: _SIZES_LIQUID },
    { key: 'fragrance', label: 'Fragrance', field: 'shampoo_fragrance', options: [] },
    { key: 'color', label: 'Color', field: 'shampoo_color', options: [] },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'shampoo_stickerPrinting', options: _YES_NO },
  ],
  moisturizer: [
    { key: 'bottleType', label: 'Bottle Type', field: 'moisturizer_bottleType', options: _BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'moisturizer_capType', options: _CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'moisturizer_size', options: _SIZES_LIQUID },
    { key: 'fragrance', label: 'Fragrance', field: 'moisturizer_fragrance', options: [] },
    { key: 'color', label: 'Color', field: 'moisturizer_color', options: [] },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'moisturizer_stickerPrinting', options: _YES_NO },
  ],
  shower_gel: [
    { key: 'bottleType', label: 'Bottle Type', field: 'shower_gel_bottleType', options: _BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'shower_gel_capType', options: _CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'shower_gel_size', options: _SIZES_LIQUID },
    { key: 'fragrance', label: 'Fragrance', field: 'shower_gel_fragrance', options: [] },
    { key: 'color', label: 'Color', field: 'shower_gel_color', options: [] },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'shower_gel_stickerPrinting', options: _YES_NO },
  ],
  brush: [
    { key: 'brushType', label: 'Brush Type', field: 'brush_brushType', options: _BRUSH_TYPES },
    { key: 'brand', label: 'Brand', field: 'brush_brand', options: [] },
    { key: 'packingMaterial', label: 'Packing Material', field: 'brush_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'brush_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'brush_printing', options: _YES_NO },
  ],
  paste: [
    { key: 'brand', label: 'Brand', field: 'paste_brand', options: [] },
    { key: 'size', label: 'Sizes (gram)', field: 'paste_size', options: _SIZES_SOAP },
    { key: 'packingMaterial', label: 'Packing Material', field: 'paste_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'paste_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'paste_printing', options: _YES_NO },
  ],
  razor: [
    { key: 'brand', label: 'Brand', field: 'razor_brand', options: [] },
    { key: 'packingMaterial', label: 'Packing Material', field: 'razor_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'razor_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'razor_printing', options: _YES_NO },
  ],
  gel: [
    { key: 'brand', label: 'Brand', field: 'gel_brand', options: [] },
    { key: 'packingMaterial', label: 'Packing Material', field: 'gel_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'gel_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'gel_printing', options: _YES_NO },
  ],
  vanity_item: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'vanity_item_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'vanity_item_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'vanity_item_printing', options: _YES_NO },
  ],
  med_kit: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'medkit_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'medkit_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'medkit_printing', options: _YES_NO },
  ],
  sewing: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'sewing_packingMaterial', options: [] },
    { key: 'sticker', label: 'Sticker', field: 'sewing_sticker', options: _YES_NO },
    { key: 'printing', label: 'Printing', field: 'sewing_printing', options: _YES_NO },
  ],
};

// camelCase / snake_case attribute key → readable label (for product types not in the map above).
const prettyAttrKeyLead = (k) =>
  String(k || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

const getLeadProductTypeKey = (name) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('soap')) return 'soap';
  if (n.includes('shampoo')) return 'shampoo';
  if (n.includes('moisturizer') || n.includes('moisturiser')) return 'moisturizer';
  if (n.includes('shower') && n.includes('gel')) return 'shower_gel';
  if (n.includes('showergel') || n.includes('shower_gel')) return 'shower_gel';
  if (n.includes('razor')) return 'razor';
  if (n.includes('gel')) return 'gel';
  if (n.includes('brush')) return 'brush';
  if (n.includes('paste')) return 'paste';
  if (n.includes('medkit') || n.includes('med kit')) return 'med_kit';
  if (n.includes('sweing') || n.includes('sewing')) return 'sewing';
  if (n.includes('vanitykit') || n.includes('vanity kit') || n.includes('vanity')) return 'vanity_item';
  return null;
};

// ─── Sub-components ───────────────────────────────────────────────────
// Reusable per-product / per-kit attachment uploader. Self-contained (owns its upload
// mutation) so it can be dropped into any product/kit form row without prop-drilling.
// Binds to a form path holding an AntD fileList; normalize/rehydrate via the helpers above.
function ItemAttachmentsUpload({ namePath, restField = {}, disabled = false, label = 'Attachments', folder = 'product-attachments' }) {
  const [uploadFilesMutation] = useUploadFilesMutation();
  const customRequest = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('files', file);
    try {
      const res = await uploadFilesMutation({ formData, folder }).unwrap();
      const uploaded = res.data?.[0];
      if (uploaded) { file.url = uploaded.url; file.cloudPublicId = uploaded.public_id; file.thumbUrl = uploaded.url; onSuccess(uploaded, file); }
      else onError(new Error('Upload failed'));
    } catch (err) { onError(err); }
  };
  return (
    <Form.Item
      {...restField}
      name={namePath}
      label={<span style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>{label}</span>}
      valuePropName="fileList"
      getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
      style={{ marginBottom: 0 }}
    >
      <Upload multiple listType="picture-card" customRequest={customRequest} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" disabled={disabled}>
        {!disabled && (
          <div style={{ fontSize: 11 }}>
            <UploadOutlined />
            <div style={{ marginTop: 2 }}>Upload</div>
          </div>
        )}
      </Upload>
    </Form.Item>
  );
}

function ProductItem({ field, index, remove, disabled, fieldName, showSpecs, isDark, inventoryItems = [], inventoryItemsData = [], kits = [], packingMaterialOptions = PACKING_MATERIAL_OPTIONS }) {
  const { name, key, ...rest } = field;
  const isKit = Form.useWatch([fieldName, name, 'isKit']);
  const kitType = Form.useWatch([fieldName, name, 'kitType']);
  const qty = Form.useWatch([fieldName, name, 'qty']);
  const rate = Form.useWatch([fieldName, name, 'rate']);
  const gst = Form.useWatch([fieldName, name, 'gst']);
  const selectedName = Form.useWatch([fieldName, name, 'name']);

  const form = Form.useFormInstance();
  const selectedKitIds = Form.useWatch('selectedKits', form) || [];
  const currentKitId = Form.useWatch([fieldName, name, 'kitId'], form);
  const [isLocalEdit, setIsLocalEdit] = React.useState(true);
  const isItemDisabled = disabled || !isLocalEdit;

  // When this row is a kit item, restrict the product dropdown to only the products
  // belonging to the selected kit. Derive the kit by row-level kitName first,
  // then fall back to the form-level selectedKit (_id).
  const kitInventoryItems = React.useMemo(() => {
    if (!isKit) return inventoryItems;
    const kitNameFromRow = form.getFieldValue([fieldName, name, 'kitName']);
    const formSelectedKitId = form.getFieldValue('selectedKit');
    const activeKit = kits.find((k) => k.kitName === kitNameFromRow)
      || kits.find((k) => k._id === formSelectedKitId);
    if (!activeKit) return inventoryItems;
    const kitProductNames = new Set((activeKit.products || []).map((p) => p.productName));
    return inventoryItems.filter((item) => kitProductNames.has(item.name ?? item.label ?? item.value));
  }, [isKit, kitType, inventoryItems, kits, form, fieldName, name]);

  // Stable _id of the selected inventory item — set on select and preserved as a hidden field.
  // When multiple inventory items share the same name (e.g. two "Soap" records), this is the
  // only reliable way to identify which one the user actually picked.
  const inventoryItemId = Form.useWatch([fieldName, name, 'inventoryItemId'], form);

  // For kit items, kitType is the registered Form.Item field; selectedName (name field) can get
  // cleared when the conditional Form.Item switches from non-kit to kit mode on first render.
  // Use inventoryItemId (precise) first, then fall back to name-match for legacy rows.
  const invItem = React.useMemo(
    () => {
      if (inventoryItemId) return inventoryItemsData.find((i) => i._id === inventoryItemId);
      const lookupKey = isKit ? kitType : selectedName;
      return lookupKey ? inventoryItemsData.find((i) => i.itemName === lookupKey) : undefined;
    },
    [inventoryItemId, isKit, kitType, selectedName, inventoryItemsData],
  );

  // An inventory item stores its allowed packing materials / material categories / brands
  // as comma-separated strings (e.g. "Paper Box, Plastic Box"). Split them into option lists
  // so the spec dropdowns can be restricted to just this product's values.
  const toOptionList = (raw) =>
    String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => ({ value: v, label: v }));
  // Product-type key for dynamic attribute fields (mirrors Inventory's add-item modal)
  const productTypeKey = React.useMemo(() => invItem ? getLeadProductTypeKey(invItem.itemName) : null, [invItem]);

  // All inventory items of the same product type as the selected one — used to source the
  // attribute dropdown options PURELY from inventory (e.g. every Shape any soap item has).
  const sameTypeItems = React.useMemo(() => {
    if (productTypeKey) return inventoryItemsData.filter((it) => getLeadProductTypeKey(it.itemName) === productTypeKey);
    return invItem ? [invItem] : [];
  }, [productTypeKey, inventoryItemsData, invItem]);

  // Union of stored values for an attribute key across same-type inventory items.
  const attrOptionsFor = (key) => {
    const vals = new Set();
    sameTypeItems.forEach((it) => {
      const v = it.productAttributes?.[key];
      (Array.isArray(v) ? v : (v != null && v !== '' ? [v] : [])).forEach((x) => vals.add(x));
    });
    return [...vals];
  };

  // Attribute fields to show: the product type's schema, or (for unrecognized types) whatever
  // attributes the selected inventory item actually stores. Nothing hardcoded/generic.
  const dynamicFieldDefs = React.useMemo(() => {
    if (productTypeKey && PRODUCT_FIELD_DEFS_LEAD[productTypeKey]) return PRODUCT_FIELD_DEFS_LEAD[productTypeKey];
    const attrs = invItem?.productAttributes || {};
    return Object.keys(attrs).map((k) => ({
      key: k,
      label: prettyAttrKeyLead(k),
      field: `product_attr_${k}`,
      // Sticker/Logo/Printing are per-order Yes/No decisions (same convention as the
      // per-product-type defs above) — always offer both choices, not just the value
      // that happens to be stored on this inventory item.
      options: YES_NO_ATTR_KEYS.has(k) ? _YES_NO : [],
    }));
  }, [productTypeKey, invItem]);

  // Pre-fill a spec field only when the inventory item defines a single value; when it offers
  // several, leave it blank so the user picks one from the (now restricted) dropdown.
  const applySpec = (key, raw) => {
    const opts = toOptionList(raw);
    form.setFieldValue([fieldName, name, key], opts.length === 1 ? opts[0].value : undefined);
  };

  const handleProductSelect = (value) => {
    const item = inventoryItemsData.find((i) => i._id === value);
    if (!item) return;
    // Persist the _id so duplicate-name lookups resolve to the exact chosen item.
    form.setFieldValue([fieldName, name, 'inventoryItemId'], item._id);
    // flushSync forces a synchronous React render so the InputNumber receives its
    // new value prop before the browser paints — prevents the "click to reveal" lag.
    flushSync(() => {
      form.setFieldValue([fieldName, name, 'rate'], item.sellingPrice ?? 0);
    });
    if (item.gstPercent != null && item.gstPercent > 0) form.setFieldValue([fieldName, name, 'gst'], item.gstPercent);
    if (item.unit) form.setFieldValue([fieldName, name, 'unit'], item.unit);
    if (item.hsnCode) form.setFieldValue([fieldName, name, 'hsnCode'], item.hsnCode);
    const sz = item.defaultSize || item.size;
    if (sz) {
      form.setFieldValue([fieldName, name, 'defaultSize'], sz);
      form.setFieldValue([fieldName, name, 'size'], sz);
    }
    // For attrs stored as arrays in inventory: pre-fill only when there's exactly one value
    const applyAttrSpec = (key, legacyVal) => {
      const v = item.productAttributes?.[key];
      if (Array.isArray(v) && v.length === 1) {
        form.setFieldValue([fieldName, name, key], v[0]);
      } else if (Array.isArray(v) && v.length > 1) {
        form.setFieldValue([fieldName, name, key], undefined);
      } else if (typeof v === 'string' && v) {
        form.setFieldValue([fieldName, name, key], v);
      } else {
        applySpec(key, legacyVal);
      }
    };
    applyAttrSpec('packingMaterial', item.packingMaterial);
    applySpec('materialCategory', item.materialCategory);
    applyAttrSpec('brand', item.brand);
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
      {/* Hidden fields to register so Form can read them — kitId MUST be registered
          so AntD Form.List preserves it in the store, enabling per-kit product filtering */}
      <Form.Item {...rest} name={[name, 'isKit']} hidden noStyle><Input /></Form.Item>
      <Form.Item {...rest} name={[name, 'kitName']} hidden noStyle><Input /></Form.Item>
      <Form.Item {...rest} name={[name, 'kitId']} hidden noStyle><Input /></Form.Item>
      {/* Stores the inventory _id so duplicate-name items can be distinguished precisely */}
      <Form.Item {...rest} name={[name, 'inventoryItemId']} hidden noStyle><Input /></Form.Item>
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
              <Form.Item
                {...rest}
                name={[name, 'name']}
                style={{ marginBottom: 0 }}
                rules={[{ required: true, message: 'Product required' }]}
                getValueProps={(val) => ({
                  value: inventoryItemId
                    ? inventoryItemId
                    : (inventoryItemsData.find(i => i.itemName === val)?._id ?? val),
                })}
                getValueFromEvent={(val) => {
                  const item = inventoryItemsData.find(i => i._id === val);
                  if (item) form.setFieldValue([fieldName, name, 'inventoryItemId'], item._id);
                  return item?.itemName ?? val;
                }}
              >
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
                  onClear={() => form.setFieldValue([fieldName, name, 'inventoryItemId'], undefined)}
                  notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No items in inventory</span>}
                  optionRender={(option) => {
                    const stock = option.data.currentStock ?? 0;
                    const minStock = option.data.minStock ?? 0;
                    const unit = option.data.unit || '';
                    const color = stock <= 0 ? '#f5222d' : stock <= minStock ? '#fa8c16' : '#52c41a';
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {option.label}
                          {option.data.category ? <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>· {option.data.category}</span> : null}
                        </span>
                        <span style={{ fontSize: 10, color, fontWeight: 600, background: `${color}20`, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {stock} {unit}
                        </span>
                      </div>
                    );
                  }}
                />
              </Form.Item>
            ) : (
              <>
                {/* Keep 'name' registered in kit mode so it isn't cleared when the non-kit branch unmounts */}
                <Form.Item {...rest} name={[name, 'name']} hidden noStyle><Input /></Form.Item>
                <Form.Item
                  {...rest}
                  name={[name, 'kitType']}
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true, message: 'Kit required' }]}
                  getValueProps={(val) => ({
                    value: inventoryItemId
                      ? inventoryItemId
                      : (inventoryItemsData.find(i => i.itemName === val)?._id ?? val),
                  })}
                  getValueFromEvent={(val) => {
                    const item = inventoryItemsData.find(i => i._id === val);
                    if (item) form.setFieldValue([fieldName, name, 'inventoryItemId'], item._id);
                    return item?.itemName ?? val;
                  }}
                >
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder="Select Product"
                    disabled={isItemDisabled}
                    size="small"
                    style={{ width: '100%' }}
                    options={kitInventoryItems}
                    onSelect={(selectedId) => {
                      const item = inventoryItemsData.find(i => i._id === selectedId);
                      form.setFieldValue([fieldName, name, 'name'], item?.itemName ?? selectedId);
                      if (item) form.setFieldValue([fieldName, name, 'inventoryItemId'], item._id);
                      if (!item) return;
                      flushSync(() => {
                        form.setFieldValue([fieldName, name, 'rate'], item.sellingPrice ?? 0);
                      });
                      if (item.gstPercent != null && item.gstPercent > 0) form.setFieldValue([fieldName, name, 'gst'], item.gstPercent);
                      if (item.unit) form.setFieldValue([fieldName, name, 'unit'], item.unit);
                      if (item.hsnCode) form.setFieldValue([fieldName, name, 'hsnCode'], item.hsnCode);
                      const sz = item.defaultSize || item.size;
                      if (sz) {
                        form.setFieldValue([fieldName, name, 'defaultSize'], sz);
                        form.setFieldValue([fieldName, name, 'size'], sz);
                      }
                      applySpec('packingMaterial', item.packingMaterial);
                      applySpec('materialCategory', item.materialCategory);
                      const attrBrand = item.productAttributes?.brand;
                      if (Array.isArray(attrBrand) && attrBrand.length === 1) {
                        form.setFieldValue([fieldName, name, 'brand'], attrBrand[0]);
                      } else if (typeof attrBrand === 'string' && attrBrand) {
                        form.setFieldValue([fieldName, name, 'brand'], attrBrand);
                      } else {
                        applySpec('brand', item.brand);
                      }
                    }}
                    onClear={() => {
                      form.setFieldValue([fieldName, name, 'name'], undefined);
                    }}
                    notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No products in this kit</span>}
                    optionRender={(option) => {
                      const stock = option.data.currentStock ?? 0;
                      const minStock = option.data.minStock ?? 0;
                      const unit = option.data.unit || '';
                      const color = stock <= 0 ? '#f5222d' : stock <= minStock ? '#fa8c16' : '#52c41a';
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {option.label}
                          {option.data.category ? <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>· {option.data.category}</span> : null}
                        </span>
                          <span style={{ fontSize: 10, color, fontWeight: 600, background: `${color}20`, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {stock} {unit}
                          </span>
                        </div>
                      );
                    }}
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

          {/* Kit assignment selector — shown for kit products when 2+ kits are in the order */}
          {isKit && selectedKitIds.length > 1 && (
            <Col flex="none" style={{ minWidth: 130 }}>
              <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>KIT</Text>
              <Select
                size="small"
                placeholder="Select Kit"
                disabled={isItemDisabled}
                value={currentKitId}
                style={{ width: '100%' }}
                options={kits.filter(k => selectedKitIds.includes(k._id)).map(k => ({ value: k._id, label: k.kitName }))}
                onChange={(val) => {
                  form.setFieldValue([fieldName, name, 'kitId'], val);
                  const kitDef = kits.find(k => k._id === val);
                  if (kitDef) form.setFieldValue([fieldName, name, 'kitName'], kitDef.kitName);
                }}
              />
            </Col>
          )}

          {/* Brand & other specs are now shown only as inventory-driven product attributes below */}

          {/* Display Unit & Size now live once at the kit-card header (see kit card) */}

          {/* Qty, Rate, GST & Sticker/Printing */}
          <Col flex="auto">
              <Row gutter={8}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>QTY</Text>
                  <Form.Item {...rest} name={[name, 'qty']} rules={[{ required: true, message: '!' }]} style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="Qty" style={{ width: '100%' }} min={0} disabled={isItemDisabled} size="small" />
                  </Form.Item>
                  {invItem && (
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      marginTop: 2,
                      color: (invItem.currentStock ?? 0) <= 0 ? '#f5222d' : (invItem.currentStock ?? 0) <= (invItem.minStock || 0) ? '#fa8c16' : '#52c41a',
                    }}>
                      Avail: {invItem.currentStock ?? 0} {invItem.unit || ''}
                    </div>
                  )}
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>RATE ₹</Text>
                  <Form.Item
                    {...rest}
                    name={[name, 'rate']}
                    style={{ marginBottom: 0 }}
                    tooltip={invItem?.purchasePrice > 0 ? `Min ₹${(Number(invItem.purchasePrice) || 0) + (Number(invItem.marginAmount) || 0)} (₹${invItem.purchasePrice} purchase + ₹${invItem.marginAmount || 0} margin)${invItem?.sellingPrice > 0 ? ` · Selling Price: ₹${invItem.sellingPrice}` : ''}` : undefined}
                    rules={[
                      { required: true, message: '!' },
                      {
                        validator: (_, val) => {
                          const minRate = invItem?.purchasePrice > 0 ? (Number(invItem.purchasePrice) || 0) + (Number(invItem.marginAmount) || 0) : 0;
                          if (minRate > 0 && (Number(val) || 0) < minRate) {
                            return Promise.reject(new Error(`Min ₹${minRate}`));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <InputNumber placeholder="Rate ₹" style={{ width: '100%' }} min={invItem?.purchasePrice > 0 ? (Number(invItem.purchasePrice) || 0) + (Number(invItem.marginAmount) || 0) : 0} step={0.01} disabled={isItemDisabled} size="small" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>GST %</Text>
                  <Form.Item
                    {...rest}
                    name={[name, 'gst']}
                    style={{ marginBottom: 0 }}
                    tooltip={invItem?.gstPercent > 0 ? `Product GST: ${invItem.gstPercent}% (min)` : undefined}
                    rules={[{
                      validator: (_, val) => {
                        const minGst = invItem?.gstPercent || 0;
                        if (minGst > 0 && (Number(val) || 0) < minGst) {
                          return Promise.reject(new Error(`Min ${minGst}%`));
                        }
                        return Promise.resolve();
                      }
                    }]}
                  >
                    <InputNumber
                      placeholder="GST %"
                      style={{ width: '100%' }}
                      min={invItem?.gstPercent || 0}
                      disabled={isItemDisabled}
                      size="small"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Col>

          {/* Subtotal Display */}
          <Col flex="none" style={{ textAlign: 'right', minWidth: 100 }}>
            <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>SUBTOTAL</Text>
            <Text strong style={{ display: 'block', fontSize: 16, color: '#B11E6A', lineHeight: 1.2 }}>
              ₹{(r2((qty || 0) * (rate || 0) * (1 + (gst || 0) / 100))).toLocaleString()}
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

          {/* Product attribute fields — driven entirely by the selected product's inventory
              attributes (no generic hardcoded fields). Each dropdown's options come from the
              values stored on matching inventory items. */}
          {dynamicFieldDefs.length > 0 ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {dynamicFieldDefs.map((fd) => {
                // Yes/No toggle fields (sticker, printing, …) always offer both choices — they're a
                // per-order decision, not a stored inventory value. Everything else is sourced from
                // the actual values stored on matching inventory items.
                const isYesNo = (fd.options || []).length === 2 && fd.options.every((o) => ['yes', 'no'].includes(String(o.value).toLowerCase()));
                const invOpts = attrOptionsFor(fd.key);
                const opts = isYesNo
                  ? fd.options
                  : (invOpts.length ? invOpts.map((v) => ({ value: v, label: v })) : (fd.options || []));
                return (
                  <div key={fd.key} style={{ flex: '1 1 120px', minWidth: 100 }}>
                    <Form.Item {...rest} name={[name, fd.key]} label={<span style={{ fontSize: 11 }}>{fd.label}</span>} style={{ marginBottom: 0 }}>
                      {/* Spec values come purely from inventory — no inline "Add" option here.
                          Yes/No toggles offer both choices; everything else lists only the values
                          stored on matching inventory items. */}
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={invItem ? fd.label : 'Select a product first'}
                        disabled={isItemDisabled || (!isYesNo && !invItem)}
                        size="small"
                        options={opts}

                        notFoundContent={isYesNo ? undefined : 'No values in inventory for this spec'}
                      />
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          ) : (
            !isKit && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {invItem ? 'No product attributes configured for this item in Inventory.' : 'Select a product to see its attributes.'}
              </Text>
            )
          )}

          {/* Free-text spec / instructions for this product — editable in every form (lead/quotation/negotiation/order) */}
          <Form.Item {...rest} name={[name, 'specification']} label={<span style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>Specification / Instructions</span>} style={{ marginTop: 12, marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Specification / instructions for this product..." disabled={isItemDisabled} />
          </Form.Item>

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

          {/* Per-product reference files (spec sheets, design images) — round-trip to view/edit + Operations */}
          <div style={{ marginTop: 14 }}>
            <ItemAttachmentsUpload namePath={[name, 'attachments']} restField={rest} disabled={isItemDisabled} label="Product Files / Attachments" />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductFormList({ fieldName = 'products', disabled = false, showSpecs = false, inventoryItems = [], inventoryItemsData = [], kits = [], packingMaterialOptions = PACKING_MATERIAL_OPTIONS }) {
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
              packingMaterialOptions={packingMaterialOptions}
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
  const forwardingChecked = Form.useWatch('forwardingCharge');
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
  const isOnDispatch = paymentTerms === 'ON_DISPATCH';

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
          <SelectWithAdd field="transportationBy" defaultOptions={[{ value: 'CLIENT', label: 'Client' }, { value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" disabled={disabled} />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item name="forwardingCharge" valuePropName="checked">
          <Checkbox disabled={disabled}>Forwarding charge applicable</Checkbox>
        </Form.Item>
        {forwardingChecked && (
          <Form.Item
            name="forwardingChargeAmount"
            label="Forwarding Charge Amount (₹)"
            style={{ marginTop: -8 }}
            rules={[{ required: true, message: 'Enter forwarding charge amount' }]}
          >
            <InputNumber
              min={0}
              disabled={disabled}
              style={{ width: '100%' }}
              placeholder="Enter amount"
              prefix="₹"
            />
          </Form.Item>
        )}
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

      {/* Payment Reminder Date — required for every payment term except 100% Payment.
          All three (On Dispatch / 50-50 / Credit) store into the same `paymentReminderDate`
          field so the Payment Due WhatsApp scheduler has a single, reliable date to poll. */}
      {isOnDispatch && !disabled && (
        <Col xs={24} sm={12}>
          <Form.Item
            label="Payment Reminder Date"
            name="paymentReminderDate"
            rules={[{ required: true, message: 'Select a payment reminder date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      )}
      {isOnDispatch && disabled && (
        <Col xs={24} sm={12}>
          <Form.Item label="Payment Reminder Date" name="paymentReminderDate">
            <DatePicker style={{ width: '100%' }} disabled />
          </Form.Item>
        </Col>
      )}

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

      {isCredit && !disabled && (
        <Col xs={24} sm={12}>
          <Form.Item
            label="Credit Due Date"
            name="paymentReminderDate"
            rules={[{ required: true, message: 'Select credit due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      )}
      {isCredit && disabled && (
        <Col xs={24} sm={12}>
          <Form.Item label="Credit Due Date" name="paymentReminderDate">
            <DatePicker style={{ width: '100%' }} disabled />
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
  const { filterTabs, activeKeyFor } = useTabAccess('Sales Team');
  const { requireAccess } = usePageAccess('Sales Team');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [leadStatusFilter, setLeadStatusFilter] = useState(null);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPageSize, setLeadsPageSize] = useState(10);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);
  const [quotStatusFilter, setQuotStatusFilter] = useState(null);
  const [reminderTypeFilter, setReminderTypeFilter] = useState(null);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState(null);
  const [complaintSearchText, setComplaintSearchText] = useState('');
  const [complaintDateRange, setComplaintDateRange] = useState(null);
  const [complaintsPage, setComplaintsPage] = useState(1);
  const [complaintsPageSize, setComplaintsPageSize] = useState(10);
  const [leadSearchText, setLeadSearchText] = useState('');
  const [leadDateRange, setLeadDateRange] = useState(null);
  const [orderSearchText, setOrderSearchText] = useState('');
  const [orderDateRange, setOrderDateRange] = useState(null);
  const [quotSearchText, setQuotSearchText] = useState('');
  const [quotDateRange, setQuotDateRange] = useState(null);
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

  // Order inline edit (within order-detail view)
  const [isOrderEditing, setIsOrderEditing] = useState(false);
  const [orderEditTarget, setOrderEditTarget] = useState(null);
  const [orderEditForm] = Form.useForm();
  const [orderEditPaymentProofs, setOrderEditPaymentProofs] = useState([]);

  // Quick Add Payment Entry modal — shared across lead/quotation/negotiation/order detail views
  const [payEntryTarget, setPayEntryTarget] = useState(null); // { type, record }
  const [payEntryForm] = Form.useForm();
  const [payEntrySaving, setPayEntrySaving] = useState(false);
  const [payEntryProof, setPayEntryProof] = useState(null); // { name, url } after upload
  const [payEntryProofUploading, setPayEntryProofUploading] = useState(false);
  const [leadPayEntryProofUploadingMap, setLeadPayEntryProofUploadingMap] = useState({});

  const handleDownloadQuotation = (order) => {
    // findLinkedQuotation handles both raw ObjectId and populated {_id, quotCode} objects
    const linkedQuot = findLinkedQuotation(order);
    const src = linkedQuot || order;
    // quotationId is a populated object when coming from the single-order detail API response
    const quotCodeFromPopulated = typeof order.quotationId === 'object'
      ? order.quotationId?.quotCode
      : null;
    const products = (src.products?.length ? src.products : order.products) || [];
    const kitOrders = (src.kitOrders?.length ? src.kitOrders : order.kitOrders) || [];
    // items[] is kept for tax computation fallback inside DocumentTemplate
    const items = products.filter(Boolean).map(p => {
      const qty = Number(p.qty) || 0;
      const rate = Number(p.rate) || Number(p.price) || 0;
      const taxRate = Number(p.gstPercent ?? p.gst ?? 0);
      const taxAmt = r2(qty * rate * taxRate / 100);
      return { name: p.name || p.itemName || '', qty, unit: p.unit || 'PCS', rate, taxRate, taxAmt, amount: r2(qty * rate + taxAmt) };
    });
    const gstAmt = r2(calcGstAmount(products));
    const fwdEnabled = !!(src.forwardingCharge ?? order.forwardingCharge);
    const fwdAmt = fwdEnabled ? r2(Number(src.forwardingChargeAmount ?? order.forwardingChargeAmount) || 0) : 0;
    // Pre-built personalized composition (outer packaging folded into Section A, included
    // kits/products broken out, remaining in B/C) so the downloaded invoice matches the
    // Billing invoice exactly. Null when there is no personalized packaging → flat fallback.
    const compRec = {
      products,
      kitOrders,
      kitPrice: src.kitPrice ?? order.kitPrice,
      kitOverallQty: src.kitOverallQty ?? order.kitOverallQty,
      packagingIncludes: src.packagingIncludes || order.packagingIncludes || [],
      packagingIncludesQty: src.packagingIncludesQty || order.packagingIncludesQty || {},
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
    };
    const composition = buildDocComposition(compRec, kits);
    const total = composition
      ? computeCompositionGrandTotal(compRec, kits)
      : (Number(src.totalAmount) || Number(order.totalAmount) || 0);
    const data = {
      items,
      products,
      kitOrders,
      composition,
      quot: linkedQuot?.qid || quotCodeFromPopulated || order.quotCode || src.qid || src.quotCode || order.oid,
      date: src.date ? dayjs(src.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'),
      taxableAmount: composition ? composition.taxable : r2(calcTotal(products)),
      cgst: composition ? r2(composition.gst / 2) : r2(gstAmt / 2),
      sgst: composition ? r2(composition.gst / 2) : r2(gstAmt / 2),
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      total,
      customer: {
        name: src.billingName || src.hotelName || src.clientName || '',
        address: src.detailedAddress || src.address || '',
        city: [src.city, src.state, src.pincode].filter(Boolean).join(', '),
        mobile: src.phone || src.clientPhone || '',
        gstin: src.gstNumber || '',
        pan: '',
        placeOfSupply: src.state || '',
      },
    };
    const html = generatePrintHTML('quotation', data, invoiceSettings);
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      enqueueSnackbar('Popup blocked — downloading as file instead.', { variant: 'info' });
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `quotation-${data.quot || 'doc'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  };

  // Download any record (quotation / negotiation) directly — no linked-quotation lookup.
  // Uses the record's own products/kitOrders so negotiated prices are shown as-is.
  const handleDownloadDirect = (rec, filename) => {
    const products = (rec.products || []).filter(Boolean);
    const kitOrders = (rec.kitOrders || []).filter(Boolean);
    const items = products.map(p => {
      const qty = Number(p.qty) || 0;
      const rate = Number(p.rate) || Number(p.price) || 0;
      const taxRate = Number(p.gstPercent ?? p.gst ?? 0);
      const taxAmt = r2(qty * rate * taxRate / 100);
      return { name: p.name || p.itemName || '', qty, unit: p.unit || 'PCS', rate, taxRate, taxAmt, amount: r2(qty * rate + taxAmt) };
    });
    const gstAmt = r2(calcGstAmount(products));
    const fwdEnabled = !!rec.forwardingCharge;
    const fwdAmt = fwdEnabled ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
    const docCode = rec.qid || rec.quotCode || rec.nid || rec.negCode || rec.oid || rec.orderCode;
    // Pre-built personalized composition so the downloaded quotation/negotiation matches the
    // Billing invoice exactly. Null when there is no personalized packaging → flat fallback.
    const compRec = {
      products,
      kitOrders,
      kitPrice: rec.kitPrice,
      kitOverallQty: rec.kitOverallQty,
      packagingIncludes: rec.packagingIncludes || [],
      packagingIncludesQty: rec.packagingIncludesQty || {},
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
    };
    const composition = buildDocComposition(compRec, kits);
    const data = {
      items,
      products,
      kitOrders,
      composition,
      quot: docCode,
      date: rec.date ? dayjs(rec.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'),
      taxableAmount: composition ? composition.taxable : r2(calcTotal(products)),
      cgst: composition ? r2(composition.gst / 2) : r2(gstAmt / 2),
      sgst: composition ? r2(composition.gst / 2) : r2(gstAmt / 2),
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      total: composition ? computeCompositionGrandTotal(compRec, kits) : (Number(rec.totalAmount) || 0),
      customer: {
        name: rec.billingName || rec.hotelName || rec.clientName || '',
        address: rec.detailedAddress || rec.address || '',
        city: [rec.city, rec.state, rec.pincode].filter(Boolean).join(', '),
        mobile: rec.phone || rec.clientPhone || '',
        gstin: rec.gstNumber || '',
        pan: '',
        placeOfSupply: rec.state || '',
      },
    };
    const html = generatePrintHTML('quotation', data, invoiceSettings);
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      enqueueSnackbar('Popup blocked — downloading as file instead.', { variant: 'info' });
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `quotation-${docCode || 'doc'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  };

  // Resolve an order's kit / composition fields, falling back to the linked
  // negotiation → quotation → lead. Orders created before kit fields were stored on the order
  // (or when an upstream conversion dropped them) otherwise show no kit details. This makes the
  // order edit/view surface the same kit info as the originating lead, per spec.
  const resolveOrderKitSource = (order) => {
    if (!order) return { lead: null, pick: () => undefined };
    const leadIdStr = String(order.leadId?._id || order.leadId || '');
    const lead = leadIdStr ? leadsData.find(l => String(l._id || l.key) === leadIdStr) : null;
    const negIdStr = String(order.negotiationId?._id || order.negotiationId || '');
    const neg = negIdStr ? negotiationsData.find(n => String(n._id || n.key) === negIdStr) : null;
    const quot = findLinkedQuotation({ quotationId: order.quotationId, quotationCode: order.quotationCode });
    const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
    // order is authoritative; fall back to negotiation → quotation → lead.
    const pick = (...keys) => {
      for (const src of [order, neg, quot, lead]) {
        if (!src) continue;
        for (const k of keys) { if (!isEmpty(src[k])) return src[k]; }
      }
      return undefined;
    };
    return { lead, neg, quot, pick };
  };

  const openOrderEditModal = (order) => {
    if (!requireAccess('edit')) return;
    setOrderEditTarget(order);
    const { pick: pickKit } = resolveOrderKitSource(order);
    // Resolve expected delivery date: use the order's own value first, then fall back to the
    // tentative date on the linked lead / quotation / negotiation (covers orders that predate
    // the expectedDeliveryDate field or were created without it being explicitly set).
    let resolvedDelivery = order.expectedDelivery || null;
    if (!resolvedDelivery) {
      const leadIdStr = String(order.leadId?._id || order.leadId || '');
      const linkedLead = leadIdStr ? leadsData.find(l => String(l._id || l.key) === leadIdStr) : null;
      const negIdStr = String(order.negotiationId?._id || order.negotiationId || '');
      const linkedNeg = negIdStr ? negotiationsData.find(n => String(n._id || n.key) === negIdStr) : null;
      const linkedQuot = findLinkedQuotation({ quotationId: order.quotationId, quotationCode: order.quotationCode });
      const raw = (linkedLead?.orderDeliveryDate) || (linkedNeg?.orderDeliveryDate) || (linkedQuot?.orderDeliveryDate) || null;
      resolvedDelivery = raw ? String(raw).slice(0, 10) : null;
    }
    orderEditForm.setFieldsValue({
      expectedDelivery: resolvedDelivery ? dayjs(resolvedDelivery) : null,
      advance: order.advance || 0,
      paymentTerms: order.paymentTerms,
      paymentReminderDate: (order.paymentReminderDate || order.creditDueDate) ? dayjs(order.paymentReminderDate || order.creditDueDate) : null,
      paymentCollection: order.paymentCollection || [],
      // Preserve EVERY product field (specs, kit flags, dynamic inventory attributes) so they
      // survive the edit round-trip and can be displayed — only the editable numerics are coerced.
      // Fall back to the linked lead's products when the order itself stored none.
      editProducts: ((order.products && order.products.length ? order.products : (order.items && order.items.length ? order.items : pickKit('products'))) || []).filter(Boolean).map(p => ({
        ...p,
        name: p.name || p.itemName || '',
        qty: Number(p.qty) || 0,
        rate: Number(p.rate || p.price) || 0,
        gst: Number(p.gst || p.gstPercent) || 0,
        // Flatten nested inventory attributes so the editable spec dropdowns (bound to flat
        // keys) show the saved values, mirroring how lead/quotation/negotiation round-trip.
        ...((p.productAttributes && typeof p.productAttributes === 'object' && !Array.isArray(p.productAttributes)) ? p.productAttributes : {}),
        // Rehydrate attachments to AntD fileList format so previously uploaded files show.
        attachments: attachmentsToFileList(p.attachments),
      })),
      // Carry kit display-unit details so the Kit Details block renders on edit, same as Add/Lead.
      // Each pulls from the order first, then the linked negotiation/quotation/lead.
      productType: pickKit('productType'),
      kitDisplayUnit: pickKit('kitDisplayUnit', 'displayUnit'),
      kitDisplayUnitType: pickKit('kitDisplayUnitType'),
      kitSize: pickKit('kitSize'),
      kitSticker: pickKit('kitSticker'),
      kitLogo: pickKit('kitLogo'),
      kitPrinting: pickKit('kitPrinting'),
      kitOverallQty: pickKit('kitOverallQty'),
      kitPrice: pickKit('kitPrice'),
      packagingIncludes: pickKit('packagingIncludes'),
      packagingIncludesQty: pickKit('packagingIncludesQty'),
      selectedKits: (() => {
        const sk = pickKit('selectedKits');
        if (Array.isArray(sk) && sk.length) return sk;
        const single = pickKit('selectedKit');
        return single ? [single] : [];
      })(),
      kitOrders: (pickKit('kitOrders') || []).map(ko => {
        const rawIncludes = ko.kitIncludes || [];
        const isObjFmt = rawIncludes.length > 0 && rawIncludes[0] != null && typeof rawIncludes[0] === 'object' && rawIncludes[0].id != null;
        return {
          ...ko,
          kitIncludes: isObjFmt ? rawIncludes.map(item => item.id) : rawIncludes,
          kitIncludesQty: isObjFmt
            ? Object.fromEntries(rawIncludes.map(item => [item.id, item.qty || 1]))
            : (ko.kitIncludesQty || {}),
        };
      }),
      hotelName: order.hotelName || order.clientName || '',
      billingName: order.billingName || order.clientName || '',
      contactPerson: order.contactPerson || '',
      pocDesignation: order.pocDesignation || '',
      phone: order.phone || '',
      email: order.email || '',
      alternativeName: order.alternativeName || '',
      alternativeRole: order.alternativeRole || '',
      alternativePhone: order.alternativePhone || '',
      detailedAddress: order.detailedAddress || '',
      city: order.city || '',
      state: order.state || '',
      pincode: order.pincode || '',
      gstNumber: order.gstNumber || '',
      hotelType: order.hotelType || undefined,
      rooms: order.rooms || order.numRooms || order.rowsInHotel || undefined,
      occupancy: order.occupancy || order.generalOccupancy || undefined,
      location: order.location || '',
      destination: order.destination || '',
      salesPerson: order.salesPerson || '',
      branch: order.branch || '',
      deliveryBy: order.deliveryBy || '',
      transportationBy: order.transportationBy || '',
      forwardingCharge: order.forwardingCharge || false,
      forwardingChargeAmount: order.forwardingChargeAmount || 0,
      splitDates: (order.splitDates || []).map(sd => ({
        ...sd,
        date: sd.date && typeof sd.date === 'string' ? dayjs(sd.date) : sd.date,
      })),
    });
    setOrderEditPaymentProofs(
      (order.paymentProofs || []).map((f, i) => ({
        uid: f.uid || f.cloudPublicId || `existing-proof-${i}`,
        name: f.name || f.fileName || `Proof ${i + 1}`,
        status: 'done',
        url: f.url || f.thumbUrl,
        thumbUrl: f.thumbUrl || f.url,
        cloudPublicId: f.cloudPublicId,
        uploadedAt: f.uploadedAt,
      }))
    );
    setIsOrderEditing(true);
    if (viewMode !== 'order-detail' || selectedRecord?.key !== order.key) {
      setSelectedRecord(order);
      setViewMode('order-detail');
    }
  };

  const saveOrderEdit = () => {
    orderEditForm.validateFields().then(async vals => {
      // Some kit fields (selectedKits, productType, kitOrders) aren't bound to a visible Form.Item,
      // so validateFields() omits them — read the full form store so values loaded into the edit
      // form (including those resolved from the linked lead) are persisted, not dropped.
      const editStore = orderEditForm.getFieldsValue(true);
      const newAdvance = vals.advance ?? orderEditTarget.advance ?? 0;
      const newCollection = (vals.paymentCollection || []).filter(e => e.paymentMethod).map(e => ({ ...e, recordedAt: e.recordedAt || new Date().toISOString() }));
      const collTotal = newCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);

      // Any amount already in paidAmount that wasn't backed by collection entries
      // (e.g. orders created before paymentCollection tracking, or lead advance not
      // carried to the order) must be preserved so we don't lose prior payments.
      const existingCollTotal = (orderEditTarget.paymentCollection || []).reduce(
        (s, e) => s + Number(e.paidAmount || 0), 0
      );
      // Check linked lead / quotation / negotiation in case the order's own paidAmount
      // is 0 (advance was stored on the lead but not propagated to the order document).
      const saveLeadIdStr = String(orderEditTarget.leadId?._id || orderEditTarget.leadId || '');
      const saveLinkedLead = saveLeadIdStr ? leadsData.find(l => String(l._id || l.key) === saveLeadIdStr || l.leadCode === orderEditTarget.leadCode) : null;
      const saveLinkedQuot = findLinkedQuotation({ quotationId: orderEditTarget.quotationId, quotationCode: orderEditTarget.quotationCode });
      const saveLinkedNeg = orderEditTarget.negotiationId ? negotiationsData.find(n => String(n._id || n.key) === String(orderEditTarget.negotiationId?._id || orderEditTarget.negotiationId)) : null;
      const saveLinkedPaid = Number(saveLinkedLead?.paidAmount) || Number(saveLinkedQuot?.paidAmount) || Number(saveLinkedNeg?.paidAmount) || 0;
      const saveBasePaid = Math.max(Number(orderEditTarget.paidAmount || 0), saveLinkedPaid);
      const uncapturedPaid = Math.max(0, saveBasePaid - existingCollTotal);
      const newPaidAmount = (collTotal + uncapturedPaid) > 0
        ? collTotal + uncapturedPaid
        : newAdvance;

      // Recalculate total from edited products if products were edited
      const editedProds = tagProductCategories(
        (vals.editProducts || []).filter(Boolean).map(p => ({
          ...p,
          name: p.name || '',
          qty: Number(p.qty) || 0,
          rate: Number(p.rate) || 0,
          gst: Number(p.gst) || 0,
          // Strip File objects so only persisted Cloudinary URLs are saved.
          attachments: normalizeAttachments(p.attachments),
        })),
        vals.kitOrders || orderEditTarget.kitOrders || [],
      );
      const newSubtotal = editedProds.reduce((s, p) => s + p.qty * p.rate, 0);
      const newGstAmount = editedProds.reduce((s, p) => s + p.qty * p.rate * (p.gst / 100), 0);
      const computedTotal = r2(newSubtotal + newGstAmount);
      // Kit-aware grand total so the balance/amount-to-pay accounts for kitPrice × overallQty + forwarding
      const kitAwareTotal = r2(computeRecordGrandTotal({
        ...orderEditTarget,
        products: editedProds.length > 0 ? editedProds : orderEditTarget.products,
      }));
      const orderTotal = kitAwareTotal > 0
        ? kitAwareTotal
        : (computedTotal > 0 ? computedTotal : (orderEditTarget.total || orderEditTarget.totalAmount || 0));

      const paymentStatus = orderTotal > 0 && newPaidAmount >= orderTotal
        ? 'Paid'
        : newPaidAmount > 0
        ? 'Partially Paid'
        : 'Unpaid';

      // Merge existing proofs with any newly uploaded ones from the edit session
      const mergedProofs = orderEditPaymentProofs
        .filter(f => f.status === 'done')
        .map(f => ({
          uid: f.uid,
          name: f.name || f.fileName || 'Payment Proof',
          url: f.url || f.response?.url,
          cloudPublicId: f.cloudPublicId,
          thumbUrl: f.thumbUrl || f.url || f.response?.url,
          uploadedAt: f.uploadedAt || new Date().toISOString(),
        }));

      const updated = {
        ...orderEditTarget,
        expectedDelivery: vals.expectedDelivery ? vals.expectedDelivery.format('YYYY-MM-DD') : orderEditTarget.expectedDelivery,
        advance: newAdvance,
        paidAmount: newPaidAmount,
        balance: Math.max(0, orderTotal - newPaidAmount),
        paymentTerms: vals.paymentTerms || orderEditTarget.paymentTerms,
        paymentReminderDate: vals.paymentReminderDate ? vals.paymentReminderDate.format('YYYY-MM-DD') : orderEditTarget.paymentReminderDate,
        paymentCollection: newCollection,
        paymentProofs: mergedProofs,
        paymentStatus,
        ...(editedProds.length > 0 && { products: editedProds, totalAmount: orderTotal, total: orderTotal, gstAmount: r2(newGstAmount) }),
        hotelName: vals.hotelName || orderEditTarget.hotelName,
        billingName: vals.billingName || orderEditTarget.billingName,
        contactPerson: vals.contactPerson || orderEditTarget.contactPerson,
        pocDesignation: vals.pocDesignation || orderEditTarget.pocDesignation,
        phone: vals.phone || orderEditTarget.phone,
        email: vals.email || orderEditTarget.email,
        alternativeName: vals.alternativeName || orderEditTarget.alternativeName,
        alternativeRole: vals.alternativeRole || orderEditTarget.alternativeRole,
        alternativePhone: vals.alternativePhone || orderEditTarget.alternativePhone,
        detailedAddress: vals.detailedAddress || orderEditTarget.detailedAddress,
        city: vals.city || orderEditTarget.city,
        state: vals.state || orderEditTarget.state,
        pincode: vals.pincode || orderEditTarget.pincode,
        gstNumber: vals.gstNumber || orderEditTarget.gstNumber,
        hotelType: vals.hotelType || orderEditTarget.hotelType,
        rooms: vals.rooms ?? orderEditTarget.rooms,
        occupancy: vals.occupancy ?? orderEditTarget.occupancy,
        location: vals.location || orderEditTarget.location,
        destination: vals.destination || orderEditTarget.destination,
        salesPerson: vals.salesPerson || orderEditTarget.salesPerson,
        branch: vals.branch || orderEditTarget.branch,
        deliveryBy: vals.deliveryBy || orderEditTarget.deliveryBy,
        transportationBy: vals.transportationBy || orderEditTarget.transportationBy,
        forwardingCharge: vals.forwardingCharge ?? orderEditTarget.forwardingCharge,
        forwardingChargeAmount: vals.forwardingChargeAmount ?? orderEditTarget.forwardingChargeAmount,
        kitDisplayUnit: editStore.kitDisplayUnit || orderEditTarget.kitDisplayUnit,
        kitDisplayUnitType: editStore.kitDisplayUnitType || orderEditTarget.kitDisplayUnitType,
        kitSize: editStore.kitSize || orderEditTarget.kitSize,
        kitSticker: editStore.kitSticker || orderEditTarget.kitSticker,
        kitLogo: editStore.kitLogo || orderEditTarget.kitLogo,
        kitPrinting: editStore.kitPrinting || orderEditTarget.kitPrinting,
        kitOverallQty: editStore.kitOverallQty || orderEditTarget.kitOverallQty,
        kitPrice: editStore.kitPrice || orderEditTarget.kitPrice,
        // Persist the kit composition (selection + type) so the order is self-contained and the
        // kit details survive without depending on the linked-lead fallback. These come from the
        // form store (editStore) since they have no visible Form.Item.
        productType: editStore.productType || orderEditTarget.productType,
        selectedKits: (Array.isArray(editStore.selectedKits) && editStore.selectedKits.length > 0)
          ? editStore.selectedKits
          : (orderEditTarget.selectedKits || (orderEditTarget.selectedKit ? [orderEditTarget.selectedKit] : [])),
        packagingIncludes: editStore.packagingIncludes || orderEditTarget.packagingIncludes,
        packagingIncludesQty: editStore.packagingIncludesQty || orderEditTarget.packagingIncludesQty,
        kitOrders: normalizeKitOrdersForSave(
          (vals.kitOrders?.length > 0 ? vals.kitOrders : (editStore.kitOrders?.length > 0 ? editStore.kitOrders : (orderEditTarget.kitOrders || []))),
          editStore.productType || orderEditTarget?.productType
        ),
        splitDates: (vals.splitDates || []).map(sd => ({ ...sd, date: sd.date?.format?.('YYYY-MM-DD') || sd.date || undefined })),
        isEmergency: Array.isArray(vals.splitDates) && vals.splitDates.length > 0,
        isUrgent: Array.isArray(vals.splitDates) && vals.splitDates.length > 0,
        deliveryType: Array.isArray(vals.splitDates) && vals.splitDates.length > 0 ? 'Partial' : (orderEditTarget.deliveryType || 'Full'),
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
          paymentProofs: mergedProofs,
          paymentStatus,
          // Rebuild items[] too so edited products + their category reach Operations (which reads items).
          ...(editedProds.length > 0 && {
            products: editedProds,
            items: editedProds.map(p => mapOrderItem(p, updated.kitDisplayUnit || updated.displayUnit || '')),
            total: orderTotal,
            gstAmount: r2(newGstAmount),
          }),
          clientName: updated.hotelName,
          billingName: updated.billingName,
          contactPerson: updated.contactPerson,
          pocDesignation: updated.pocDesignation || undefined,
          clientPhone: updated.phone,
          email: updated.email || undefined,
          alternativeName: updated.alternativeName || undefined,
          alternativeRole: updated.alternativeRole || undefined,
          alternativePhone: updated.alternativePhone || undefined,
          detailedAddress: updated.detailedAddress,
          city: updated.city,
          state: updated.state,
          pincode: updated.pincode,
          gstNumber: updated.gstNumber,
          hotelType: updated.hotelType || undefined,
          rooms: updated.rooms || undefined,
          occupancy: updated.occupancy || undefined,
          location: updated.location || undefined,
          destination: updated.destination || undefined,
          salesPerson: updated.salesPerson || undefined,
          branch: updated.branch || undefined,
          deliveryBy: updated.deliveryBy || undefined,
          transportationBy: updated.transportationBy || undefined,
          forwardingCharge: updated.forwardingCharge != null ? updated.forwardingCharge : undefined,
          forwardingChargeAmount: updated.forwardingChargeAmount != null ? updated.forwardingChargeAmount : undefined,
          kitDisplayUnit: updated.kitDisplayUnit || undefined,
          kitDisplayUnitType: updated.kitDisplayUnitType || undefined,
          kitSize: updated.kitSize || undefined,
          kitSticker: updated.kitSticker || undefined,
          kitLogo: updated.kitLogo || undefined,
          kitPrinting: updated.kitPrinting || undefined,
          kitOverallQty: updated.kitOverallQty || undefined,
          kitPrice: updated.kitPrice || undefined,
          productType: updated.productType || undefined,
          selectedKits: (updated.selectedKits && updated.selectedKits.length > 0) ? updated.selectedKits : undefined,
          packagingIncludes: updated.packagingIncludes || undefined,
          packagingIncludesQty: updated.packagingIncludesQty || undefined,
          kitOrders: updated.kitOrders?.length > 0 ? updated.kitOrders : undefined,
          splitDates: updated.splitDates,
          isEmergency: updated.isEmergency,
          isUrgent: updated.isUrgent,
          deliveryType: updated.deliveryType || undefined,
        };
        await updateSalesOrderMutation(backendPatch).unwrap();
        setOrdersData(prev => prev.map(o => o.key === orderEditTarget.key ? updated : o));
        if (selectedRecord?.key === orderEditTarget.key) setSelectedRecord(updated);
        enqueueSnackbar('Order updated successfully', { variant: 'success' });
        // Sync new paidAmount to the entire lead→quotation→negotiation chain
        if (updated.paidAmount > 0) {
          await syncChainPayment(orderEditTarget, updated.paidAmount, 'order');
        }
        orderEditForm.resetFields();
        setOrderEditPaymentProofs([]);
        setIsOrderEditing(false);
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

  // ── Payment chain helpers ──────────────────────────────────────────────────────
  // Resolve the highest paidAmount visible anywhere in the lead→quot→neg→order chain.
  // Used by the "Add Payment Entry" modal so the balance displayed is always accurate.
  const computeChainPaid = (rec) => {
    if (!rec) return 0;
    const recId    = String(rec._id || rec.key || '');
    const leadId   = String(rec.leadId?._id || rec.leadId || '');
    const leadCode = rec.leadCode || '';
    const quotId   = String(rec.quotationId?._id || rec.quotationId || '');
    const negId    = String(rec.negotiationId?._id || rec.negotiationId || '');
    const amounts  = [Number(rec.paidAmount || 0)];
    const chainLead = leadId
      ? leadsData.find(l => String(l._id || l.key) === leadId)
      : leadCode ? leadsData.find(l => l.leadCode === leadCode) : null;
    if (chainLead) amounts.push(Number(chainLead.paidAmount || 0));
    const chainQuot = quotId
      ? quotationsData.find(q => String(q._id || q.key) === quotId)
      : leadId ? quotationsData.find(q => String(q.leadId?._id || q.leadId) === leadId)
        : leadCode ? quotationsData.find(q => q.leadCode === leadCode) : null;
    if (chainQuot) amounts.push(Number(chainQuot.paidAmount || 0));
    const chainNeg = negId
      ? negotiationsData.find(n => String(n._id || n.key) === negId)
      : quotId ? negotiationsData.find(n => String(n.quotationId?._id || n.quotationId) === quotId)
        : leadId ? negotiationsData.find(n => String(n.leadId?._id || n.leadId) === leadId) : null;
    if (chainNeg) amounts.push(Number(chainNeg.paidAmount || 0));
    const chainOrder = ordersData.find(o => {
      const oLid = String(o.leadId?._id || o.leadId || '');
      return (leadId && oLid === leadId) || (leadCode && o.leadCode === leadCode) ||
             (quotId && String(o.quotationId?._id || o.quotationId) === quotId) ||
             (negId  && String(o.negotiationId?._id || o.negotiationId) === negId) ||
             (recId  && (oLid === recId || o.leadCode === leadCode));
    });
    if (chainOrder) amounts.push(Number(chainOrder.paidAmount || 0));
    return Math.max(0, ...amounts);
  };

  // Propagate a new paidAmount to every linked record in the chain (skipping sourceType).
  // Fires DB mutations and updates local state so all tabs update immediately.
  const syncChainPayment = async (rec, newPaid, sourceType) => {
    if (!rec || !newPaid) return;
    const recId    = String(rec._id || rec.key || '');
    const leadId   = sourceType === 'lead'   ? recId : String(rec.leadId?._id || rec.leadId || '');
    const leadCode = rec.leadCode || '';
    const quotId   = sourceType === 'quotation'   ? recId : String(rec.quotationId?._id || rec.quotationId || '');
    const negId    = sourceType === 'negotiation' ? recId : String(rec.negotiationId?._id || rec.negotiationId || '');
    const patch    = { paidAmount: newPaid, advancePaid: newPaid };

    if (sourceType !== 'lead') {
      const chainLead = leadId
        ? leadsData.find(l => String(l._id || l.key) === leadId)
        : leadCode ? leadsData.find(l => l.leadCode === leadCode) : null;
      if (chainLead && newPaid > Number(chainLead.paidAmount || 0)) {
        await updateLeadMutation({ id: chainLead._id || chainLead.key, ...patch }).unwrap().catch(() => {});
        setLeadsData(prev => prev.map(l => String(l._id || l.key) === String(chainLead._id || chainLead.key) ? { ...l, ...patch } : l));
      }
    }
    if (sourceType !== 'quotation') {
      const chainQuot = quotId
        ? quotationsData.find(q => String(q._id || q.key) === quotId)
        : leadId ? quotationsData.find(q => String(q.leadId?._id || q.leadId) === leadId)
          : leadCode ? quotationsData.find(q => q.leadCode === leadCode) : null;
      if (chainQuot && newPaid > Number(chainQuot.paidAmount || 0)) {
        await updateSalesQuotationMutation({ id: chainQuot._id || chainQuot.key, ...patch }).unwrap().catch(() => {});
        setQuotationsData(prev => prev.map(q => String(q._id || q.key) === String(chainQuot._id || chainQuot.key) ? { ...q, ...patch } : q));
      }
    }
    if (sourceType !== 'negotiation') {
      const chainNeg = negId
        ? negotiationsData.find(n => String(n._id || n.key) === negId)
        : quotId ? negotiationsData.find(n => String(n.quotationId?._id || n.quotationId) === quotId)
          : leadId ? negotiationsData.find(n => String(n.leadId?._id || n.leadId) === leadId) : null;
      if (chainNeg && newPaid > Number(chainNeg.paidAmount || 0)) {
        await updateNegotiationMutation({ id: chainNeg._id || chainNeg.key, ...patch }).unwrap().catch(() => {});
        setNegotiationsData(prev => prev.map(n => String(n._id || n.key) === String(chainNeg._id || chainNeg.key) ? { ...n, ...patch } : n));
      }
    }
    if (sourceType !== 'order') {
      const chainOrder = ordersData.find(o => {
        const oLid = String(o.leadId?._id || o.leadId || '');
        return (leadId && oLid === leadId) || (leadCode && o.leadCode === leadCode) ||
               (quotId && String(o.quotationId?._id || o.quotationId) === quotId) ||
               (negId  && String(o.negotiationId?._id || o.negotiationId) === negId);
      });
      if (chainOrder && newPaid > Number(chainOrder.paidAmount || 0)) {
        await updateSalesOrderMutation({ id: chainOrder._id || chainOrder.key, ...patch }).unwrap().catch(() => {});
        setOrdersData(prev => prev.map(o => String(o._id || o.key) === String(chainOrder._id || chainOrder.key) ? { ...o, ...patch } : o));
      }
    }
  };

  // ── Quick Add Payment Entry — shared handler for lead/quotation/negotiation/order ──
  const openPayEntry = (type, record, opts = {}) => {
    setPayEntryTarget({ type, record, precomputedTotal: opts.precomputedTotal, precomputedPaid: opts.precomputedPaid });
    payEntryForm.resetFields();
    setPayEntryProof(null);
  };

  const savePayEntry = async () => {
    let vals;
    try { vals = await payEntryForm.validateFields(); } catch { return; }
    if (!payEntryProof) {
      enqueueSnackbar('Please upload a payment proof before saving', { variant: 'warning' });
      return;
    }
    setPayEntrySaving(true);
    try {
      const { type, record } = payEntryTarget;
      const newEntry = {
        paymentMethod: vals.paymentMethod,
        paidAmount: Number(vals.paidAmount),
        notes: vals.notes || '',
        paymentDate: vals.paymentDate ? vals.paymentDate.toISOString() : new Date().toISOString(),
        proof: payEntryProof,
        recordedAt: new Date().toISOString(),
      };
      const newCollection = [...(record.paymentCollection || []), newEntry];
      const priorCollectionSum = (record.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const newCollectionSum = newCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      // Include any advance paid outside of paymentCollection (e.g., quotation/order carry-over)
      const extraAdvance = Math.max(0, (Number(record.paidAmount) || Number(record.advancePaid) || 0) - priorCollectionSum);
      const newPaidAmount = newCollectionSum + extraAdvance;
      const recProducts = record.products?.length ? record.products : itemsToProducts(record.items);
      const recEnrichedSave = { ...record, products: recProducts };
      const recTotal = payEntryTarget.precomputedTotal != null
        ? r2(payEntryTarget.precomputedTotal)
        : r2(computeCompositionGrandTotal(recEnrichedSave, kits)) || r2(computeRecordGrandTotal(recEnrichedSave)) || Number(record.totalAmount) || Number(record.total) || 0;
      const newBalance = Math.max(0, recTotal - newPaidAmount);
      const newStatus = recTotal > 0 && newPaidAmount >= recTotal
        ? 'Paid' : newPaidAmount > 0 ? 'Partially Paid' : 'Unpaid';
      const patch = {
        paymentCollection: newCollection,
        paidAmount: newPaidAmount,
        balance: newBalance,
        paymentStatus: newStatus,
        advancePaid: newPaidAmount,
        // Once a Payment Pending order is fully paid, move it into production — same
        // transition the old "Record Payment" quick action used to make.
        ...(type === 'order' && newStatus === 'Paid' && record.status === 'Payment Pending'
          ? { status: 'In Production' } : {}),
      };
      const updated = { ...record, ...patch };
      if (type === 'lead') {
        await updateLeadMutation({ id: record._id || record.key, ...patch }).unwrap();
        setLeadsData(prev => prev.map(l => (l.key === record.key || l._id === record._id) ? { ...l, ...patch } : l));
        if (selectedRecord?._id === record._id || selectedRecord?.key === record.key) setSelectedRecord(updated);
      } else if (type === 'quotation') {
        // newPaymentEntry: explicit signal so the backend can push this exact entry onto
        // the linked Order too — otherwise a quotation payment recorded here never reaches
        // Order.paymentCollection (syncChainPayment below only propagates the paidAmount
        // scalar), so Sales' own Order tab silently under-counts what's actually been paid.
        await updateSalesQuotationMutation({ id: record._id || record.key, ...patch, newPaymentEntry: newEntry }).unwrap();
        setQuotationsData(prev => prev.map(q => (q.key === record.key || q._id === record._id) ? { ...q, ...patch } : q));
        if (selectedRecord?._id === record._id || selectedRecord?.key === record.key) setSelectedRecord(updated);
      } else if (type === 'negotiation') {
        await updateNegotiationMutation({ id: record._id || record.key, ...patch }).unwrap();
        setNegotiationsData(prev => prev.map(n => (n.key === record.key || n._id === record._id) ? { ...n, ...patch } : n));
        if (selectedRecord?._id === record._id || selectedRecord?.key === record.key) setSelectedRecord(updated);
      } else if (type === 'order') {
        await updateSalesOrderMutation({ id: record._id || record.key, ...patch }).unwrap();
        setOrdersData(prev => prev.map(o => (o.key === record.key || o._id === record._id) ? { ...o, ...patch } : o));
        if (selectedRecord?._id === record._id || selectedRecord?.key === record.key) setSelectedRecord(updated);
      }
      // Sync the new paidAmount to all linked records in the chain
      await syncChainPayment(record, newPaidAmount, type);
      enqueueSnackbar('Payment entry added', { variant: 'success' });
      setPayEntryTarget(null);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to save payment entry', { variant: 'error' });
    } finally {
      setPayEntrySaving(false);
    }
  };

  // ── Quick Add Payment Entry modal JSX — rendered from every detail-view return ────
  const renderPayEntryModal = () => {
    if (!payEntryTarget) return (
      <Modal
        title={<Space><DollarOutlined style={{ color: '#B11E6A' }} /><span>Add Payment Entry</span></Space>}
        open={false}
        footer={null}
      />
    );
    const rec = payEntryTarget.record;
    const recProducts = rec.products?.length ? rec.products : itemsToProducts(rec.items || []);
    const recEnriched = { ...rec, products: recProducts };
    const recTotal = payEntryTarget.precomputedTotal != null
      ? r2(payEntryTarget.precomputedTotal)
      : r2(computeCompositionGrandTotal(recEnriched, kits)) || r2(computeRecordGrandTotal(recEnriched)) || Number(rec.totalAmount) || Number(rec.total) || 0;
    const alreadyPaid = payEntryTarget.precomputedPaid != null
      ? r2(payEntryTarget.precomputedPaid)
      : computeChainPaid(rec);
    const balance = Math.max(0, recTotal - alreadyPaid);
    return (
      <Modal
        title={<Space><DollarOutlined style={{ color: '#B11E6A' }} /><span>Add Payment Entry</span></Space>}
        open={!!payEntryTarget}
        onCancel={() => { setPayEntryTarget(null); setPayEntryProof(null); }}
        width={Math.min(460, window.innerWidth - 32)}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setPayEntryTarget(null); setPayEntryProof(null); }}>Cancel</Button>,
          <Button key="save" type="primary" loading={payEntrySaving}
            style={{ background: '#B11E6A', borderColor: '#B11E6A' }}
            onClick={savePayEntry}>
            Save Entry
          </Button>,
        ]}
      >
        {recTotal > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: balance > 0 ? 'rgba(250,140,22,0.06)' : 'rgba(82,196,26,0.06)', borderRadius: 8, border: `1px solid ${balance > 0 ? 'rgba(250,140,22,0.25)' : 'rgba(82,196,26,0.25)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Grand Total</Text>
              <Text strong>₹{recTotal.toLocaleString()}</Text>
            </div>
            {alreadyPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Already Collected</Text>
                <Text strong style={{ color: '#52c41a' }}>₹{alreadyPaid.toLocaleString()}</Text>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <Text style={{ fontSize: 12, fontWeight: 700 }}>Balance Due</Text>
              <Text strong style={{ color: balance > 0 ? '#fa8c16' : '#52c41a' }}>₹{balance.toLocaleString()}</Text>
            </div>
          </div>
        )}
        <Form form={payEntryForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true, message: 'Select method' }]}>
                <Select placeholder="Select method">
                  {COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="paymentDate" label="Payment Date" rules={[{ required: true, message: 'Select date' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={d => d && d > dayjs().endOf('day')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="paidAmount" label="Amount Received (₹)" rules={[{ required: true, message: 'Enter amount' }, { type: 'number', min: 0.01, message: 'Must be > 0', transform: v => Number(v) }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder={balance > 0 ? `e.g. ${balance.toLocaleString()}` : 'e.g. 5000'} />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <Input placeholder="UPI ref, cheque no., etc." />
          </Form.Item>
          <Form.Item label={<span>Payment Proof <span style={{ color: '#ff4d4f' }}>*</span></span>} required>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Upload
                accept="image/*,.pdf"
                showUploadList={false}
                disabled={payEntryProofUploading}
                customRequest={async ({ file, onSuccess, onError }) => {
                  setPayEntryProofUploading(true);
                  const fd = new FormData();
                  fd.append('files', file);
                  try {
                    const res = await uploadFilesMutation({ formData: fd, folder: 'payment-proofs' }).unwrap();
                    const up = res.data?.[0];
                    if (up) {
                      setPayEntryProof({ name: file.name || 'Proof', url: up.url });
                      onSuccess(up, file);
                      enqueueSnackbar('Proof uploaded', { variant: 'success' });
                    } else onError(new Error('Upload failed'));
                  } catch (err) { onError(err); enqueueSnackbar('Upload failed', { variant: 'error' }); }
                  finally { setPayEntryProofUploading(false); }
                }}
              >
                <Button icon={<UploadOutlined />} loading={payEntryProofUploading} style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                  {payEntryProof ? 'Change Proof' : 'Upload Proof'}
                </Button>
              </Upload>
              {payEntryProof && (
                <a href={payEntryProof.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1890ff' }}>
                  <FileTextOutlined />
                  {payEntryProof.name}
                  <span style={{ color: '#52c41a', fontSize: 11 }}>✓ Uploaded</span>
                </a>
              )}
            </div>
            {!payEntryProof && (
              <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 4 }}>Upload proof is required to save entry</div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // ── Order-edit modal display helpers (shared by both modal copies) ───────────────
  // Keys rendered explicitly below or that are structural — everything else on a product is
  // treated as a dynamic inventory attribute (shape, fragrance, bottleType, …) and shown.
  const ORDER_EDIT_SHOWN_KEYS = new Set(['name','itemName','kitType','isKit','kitName','kitId','qty','rate','price','gst','gstPercent','unit','lineTotal','logoType','boxes','packaging','packingMaterial','material','materialCategory','hsnCode','discountPercent','discount','logo','sticker','brand','otherSpecs','size','defaultSize','specs','displayType','itemId','_id','key','amount','rateValue','total']);
  // Read-only specifications strip for a product row in the order edit modal — mirrors the lead
  // detail view so specs entered earlier stay visible (and are preserved) while editing an order.
  const renderOrderEditProductSpecs = (p) => {
    if (!p) return null;
    const chips = [];
    const push = (label, val) => { if (val != null && val !== '') chips.push([label, Array.isArray(val) ? val.join(', ') : String(val)]); };
    push('Brand', p.brand);
    push('Size', p.size);
    push('Packing', p.packingMaterial || p.packaging);
    push('Material', p.materialCategory || p.material);
    if (p.sticker) push('Sticker', p.sticker === 'YES' ? 'Yes' : p.sticker === 'NO' ? 'No' : p.sticker);
    if (p.logo) push('Logo', p.logo === 'YES' ? 'Yes' : 'No');
    Object.entries(p).forEach(([k, v]) => {
      if (ORDER_EDIT_SHOWN_KEYS.has(k)) return;
      if (k === 'productAttributes' || k === 'attachments' || k === 'kitIncludes' || k === 'kitIncludesQty' || k === 'specification') return;
      if (v == null || v === '') return;
      if (typeof v === 'object' && !Array.isArray(v)) return;
      if (Array.isArray(v) && v.length === 0) return;
      push(prettyAttrKeyLead(k), v);
    });
    if (p.productAttributes && typeof p.productAttributes === 'object' && !Array.isArray(p.productAttributes)) {
      Object.entries(p.productAttributes).forEach(([k, v]) => {
        if (v != null && v !== '' && typeof v !== 'object') push(prettyAttrKeyLead(k), v);
      });
    }
    if (p.specification) push('Specification', p.specification);
    if (p.otherSpecs) push('Other', p.otherSpecs);
    if (chips.length === 0 && !(p.isKit || p.kitType)) return null;
    return (
      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>SPECS</Text>
        {(p.isKit || p.kitType) && <Tag color="purple" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>KIT{p.kitName ? `: ${p.kitName}` : ''}</Tag>}
        {chips.map(([l, v], i) => (
          <Tag key={i} style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{l}: {v}</Tag>
        ))}
      </div>
    );
  };
  // Read-only Kit Display Unit details block for the order edit modal — shows every kit detail
  // (display unit, size, sticker, logo, printing, overall qty, kit price/amount) that Add collects.
  const renderOrderEditKitDetails = (order) => {
    if (!order) return null;
    const kitPs = (order.products || []).filter(p => p && (p.isKit || p.kitType));
    const selKitIds = Array.isArray(order.selectedKits) && order.selectedKits.length > 0
      ? order.selectedKits : (order.selectedKit ? [order.selectedKit] : []);
    if (kitPs.length === 0 && selKitIds.length === 0) return null;
    const kitOrders = Array.isArray(order.kitOrders) ? order.kitOrders : [];
    const ids = selKitIds.length > 0 ? selKitIds : [null];
    // Fallback display unit for sample orders that predate explicit kitDisplayUnit — derived
    // from the packaging of the first kit product (mirrors the order-detail view's logic).
    const derivedDU = kitPs.length > 0 ? (kitPs[0].packingMaterial || kitPs[0].packaging || '') : '';
    return (
      <>
        <Divider style={{ margin: '4px 0 12px', fontSize: 12, color: '#722ed1', borderColor: 'rgba(114,46,209,0.2)' }}>
          <Space><GiftOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1', fontWeight: 600 }}>Kit Details</span></Space>
        </Divider>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {ids.map((kId, idx) => {
            const kitDef = kId ? kits.find(k => k._id === kId) : null;
            const kc = (kId && kitOrders.find(o => o.kitId === kId)) || kitOrders[idx] || {};
            const displayUnit = kc.displayUnit || order.kitDisplayUnit || order.displayUnit || derivedDU || '';
            const size = kc.size || order.kitSize || '';
            const sticker = kc.sticker || order.kitSticker || '';
            const logo = kc.logo || order.kitLogo || '';
            const printing = kc.printing || order.kitPrinting || '';
            const overallQty = Number(kc.overallQty || order.kitOverallQty) || 0;
            const kitPrice = Number(kc.kitPrice || order.kitPrice) || 0;
            return (
              <div key={kId || idx} style={{ padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.16)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <GiftOutlined style={{ color: '#722ed1' }} />
                <Text strong style={{ color: '#722ed1', fontSize: 12 }}>{kitDef?.kitName || 'Personalized Kit'}</Text>
                {displayUnit && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{String(displayUnit).replace(/_/g, ' ')}</Tag>}
                {size && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{size}</Tag>}
                {overallQty > 0 && <Tag color="blue" style={{ borderRadius: 12, fontSize: 11 }}>Qty: {overallQty}</Tag>}
                {sticker && <Tag color={sticker === 'YES' ? 'cyan' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Sticker: {sticker === 'YES' ? 'Yes' : 'No'}</Tag>}
                {logo && <Tag color={logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Logo: {logo === 'YES' ? 'Yes' : 'No'}</Tag>}
                {printing && <Tag color={printing === 'YES' ? 'magenta' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Printing: {printing === 'YES' ? 'Yes' : 'No'}</Tag>}
                {kitPrice > 0 && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>Packing Material Price: ₹{kitPrice.toLocaleString()}</Tag>}
                {kitPrice > 0 && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>Kit Amount: ₹{(kitPrice * (overallQty || 1)).toLocaleString()}</Tag>}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Watched values for conditional rendering
  const watchedBillType = Form.useWatch('billType', leadForm);
  const watchedHotelType = Form.useWatch('hotelType', leadForm);
  const watchedLeadType = Form.useWatch('leadType', leadForm);
  const watchedProductType = Form.useWatch('productType', leadForm);
  const watchedSelectedKits = Form.useWatch('selectedKits', leadForm) || [];
  const watchedSingleKit = Form.useWatch('selectedKit', leadForm);
  const watchedKitOrders = Form.useWatch('kitOrders', leadForm) || [];
  const watchedPackagingIncludes = Form.useWatch('packagingIncludes', leadForm) || [];
  const watchedPackagingIncludesQty = Form.useWatch('packagingIncludesQty', leadForm) || {};
  const watchedKitOverallQty = Form.useWatch('kitOverallQty', leadForm);
  const watchedKitPrice = Form.useWatch('kitPrice', leadForm);
  const watchedPriority = Form.useWatch('priority', leadForm);
  const watchedStatus = Form.useWatch('status', leadForm);
  const watchedSoftwareInterest = Form.useWatch('interestedInSoftware', leadForm);
  const watchedOrderProducts = Form.useWatch('products', orderForm);
  const watchedLeadProducts = Form.useWatch('products', leadForm);
  const watchedNegotiationProducts = Form.useWatch('products', negotiationForm);
  const watchedOrderEditSelKits = Form.useWatch('selectedKits', orderEditForm) || [];
  const watchedOrderEditKitOrds = Form.useWatch('kitOrders', orderEditForm) || [];
  const watchedOrderEditProds = Form.useWatch('editProducts', orderEditForm) || [];
  const watchedOrderEditProductType = Form.useWatch('productType', orderEditForm);
  const watchedNegRoundValue = Form.useWatch('useRoundedTotal', negotiationForm);
  const watchedLeadPaymentTerms = Form.useWatch('paymentTerms', leadForm);
  const watchedLeadPaymentCollection = Form.useWatch('paymentCollection', leadForm);
  const watchedLeadForwardingCharge = Form.useWatch('forwardingCharge', leadForm);
  const watchedLeadForwardingAmount = Form.useWatch('forwardingChargeAmount', leadForm);

  // GST state for order-detail view
  const [gstApiData, setGstApiData] = useState(null);
  const [gstApiLoading, setGstApiLoading] = useState(false);
  const [gstApiError, setGstApiError] = useState(null);
  // GST state for Add Lead / Edit Lead form
  const [gstAddApiData, setGstAddApiData] = useState(null);
  const [gstAddApiLoading, setGstAddApiLoading] = useState(false);
  const [gstAddApiError, setGstAddApiError] = useState(null);
  const [expandedPartyKeys, setExpandedPartyKeys] = useState([]);
  const [verifyGstinTrigger] = useLazyVerifyGstinQuery();

  // Fetch GST details for order-detail view (uses backend proxy via gstverify.co.in)
  const fetchGstDetails = async (gstin) => {
    if (!gstin) return;
    setGstApiLoading(true);
    setGstApiData(null);
    setGstApiError(null);
    try {
      const result = await verifyGstinTrigger(gstin.trim().toUpperCase(), false).unwrap();
      setGstApiData(result.data || result);
    } catch (err) {
      const msg = err?.data || err?.error || 'Unable to fetch GST details. Please verify GSTIN manually.';
      setGstApiError(typeof msg === 'string' ? msg : 'Unable to fetch GST details.');
    } finally {
      setGstApiLoading(false);
    }
  };

  // Fetch GST details for Add Lead / Edit Lead form and auto-fill all mappable fields
  const fetchGstDetailsForLead = async (gstin) => {
    const cleaned = (gstin || '').trim().toUpperCase();
    if (!cleaned) { enqueueSnackbar('Please enter a GSTIN first.', { variant: 'warning' }); return; }
    if (cleaned.length !== 15) { enqueueSnackbar('GSTIN must be exactly 15 characters.', { variant: 'warning' }); return; }
    setGstAddApiLoading(true);
    setGstAddApiData(null);
    setGstAddApiError(null);
    try {
      const result = await verifyGstinTrigger(cleaned, false).unwrap();
      // data = normalized, raw = original full API body
      const data = result.data || result;
      const raw  = result.raw || data._raw || {};
      setGstAddApiData(data);

      if (data) {
        // Address object — handle both GST abbreviated fields and readable format
        const addr = data.address || raw.pradr || raw.principalAddress || raw.address || {};

        // Extract each address component trying both formats
        const building  = addr.bnm   || addr.buildingName || addr.building || '';
        const door      = addr.bno   || addr.door         || '';
        const floor     = addr.flno  || addr.floor        || '';
        const street    = addr.st    || addr.street       || '';
        const locality  = addr.loc   || addr.location     || addr.area     || '';
        const district  = addr.dst   || addr.district     || '';
        const stateName = addr.stcd  || addr.state        || data.stj      || '';
        const pincode   = addr.pncd  || addr.pincode      ? String(addr.pncd || addr.pincode) : '';

        // Detailed address = everything except state and pincode (they have separate fields)
        const addrParts = [building, door, floor, street, locality, district].filter(Boolean);
        const detailedAddress = addrParts.join(', ');

        // City field: district is the best city equivalent; fall back to locality
        const city = district || locality || '';

        // Location field: locality/area is the most specific sub-city level
        const location = locality || district || '';

        const fillValues = {};

        // Identity fields
        if (data.lgnm)                                fillValues.billingName = data.lgnm;
        // Hotel name: use trade name only if user hasn't entered one yet
        const existingHotelName = leadForm.getFieldValue('hotelName');
        if (data.tradeNam && !existingHotelName)      fillValues.hotelName = data.tradeNam;

        // Address fields
        if (detailedAddress)                          fillValues.detailedAddress = detailedAddress;
        if (city)                                     fillValues.city = city;
        if (stateName)                                fillValues.state = stateName;
        if (pincode)                                  fillValues.pincode = pincode;
        if (location)                                 fillValues.location = location;

        // Phone / email — NOT part of GST registration data; skip silently

        if (Object.keys(fillValues).length) leadForm.setFieldsValue(fillValues);
      }
      enqueueSnackbar('GST verified — all available fields auto-filled!', { variant: 'success' });
    } catch (err) {
      const msg = err?.data || err?.error || 'Unable to fetch GST details. Check your API key in Integration → GST Verification.';
      setGstAddApiError(typeof msg === 'string' ? msg : 'GST lookup failed.');
      enqueueSnackbar(typeof msg === 'string' ? msg : 'GST lookup failed.', { variant: 'error' });
    } finally {
      setGstAddApiLoading(false);
    }
  };

  const { data: leadsRaw } = useGetLeadsQuery({ page: leadsPage, limit: leadsPageSize, ...(leadStatusFilter ? { status: leadStatusFilter } : {}) });
  const { data: quotationsRaw } = useGetSalesQuotationsQuery();
  const { data: negotiationsRaw } = useGetNegotiationsQuery();
  const { data: ordersRaw } = useGetSalesOrdersQuery({ limit: 500 });
  const { data: singleOrderRaw } = useGetSalesOrderQuery(
    selectedRecord?._id,
    { skip: viewMode !== 'order-detail' || !selectedRecord?._id }
  );
  const { data: complaintsRaw } = useGetComplaintsQuery({
    page: complaintsPage,
    limit: complaintsPageSize,
    ...(complaintStatusFilter ? { status: complaintStatusFilter } : {}),
    ...(complaintSearchText ? { search: complaintSearchText } : {}),
    ...(complaintDateRange ? { startDate: complaintDateRange[0], endDate: complaintDateRange[1] } : {}),
  });
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
  const { data: companySettingsData } = useGetCompanySettingsQuery();
  const invoiceSettings = companySettingsData?.data || {};
  const { data: packingConfigRaw } = useGetPackingConfigQuery();
  const packingConfigAll = packingConfigRaw?.data || [];
  const configDisplayUnitOptions = React.useMemo(
    () => packingConfigAll.filter(c => c.type === 'displayUnit').map(c => ({ value: c.value, label: c.label, tabMapping: c.tabMapping, subtypes: c.subtypes || [] })),
    [packingConfigAll],
  );
  const configPackingMaterialOptions = React.useMemo(
    () => packingConfigAll.filter(c => c.type === 'packingMaterial').map(c => ({ value: c.value, label: c.label })),
    [packingConfigAll],
  );

  const performanceTargets = perfRaw?.data?.targets || [];
  const performanceRewards = perfRaw?.data?.rewards || {};
  const salesPersonOptions = (usersRaw?.data || [])
    .filter((u) => u.fullName && u.department === 'Sales')
    .map((u) => ({ value: u.fullName, label: u.fullName }));
  const kits = kitsRaw?.data || [];
  const kitOptions = kits.map((k) => ({ value: k._id, label: k.kitName }));
  const { data: itemsRaw } = useGetItemsQuery({ limit: 1000 });
  const inventoryItemsRaw = itemsRaw?.data || [];
  const inventoryItems = React.useMemo(() => {
    const nameCount = {};
    inventoryItemsRaw.forEach(i => { nameCount[i.itemName] = (nameCount[i.itemName] || 0) + 1; });
    return inventoryItemsRaw.map(i => ({
      value: i._id,
      label: nameCount[i.itemName] > 1 ? `${i.itemName} (${i.itemCode || ''})` : i.itemName,
      name: i.itemName,
      category: i.category || '',
      currentStock: i.currentStock ?? 0,
      minStock: i.minStock ?? 0,
      unit: i.unit || '',
    }));
  }, [itemsRaw]);

  // When kits are selected in the "Products adding" card, auto-fill all their products
  // and build per-kit order configs (display unit, size, overall qty).
  const applyKitsToForm = (kitIds) => {
    const allKitRows = [];
    const kitPriceById = {};
    const existingKitOrders = leadForm.getFieldValue('kitOrders') || [];
    const productType = leadForm.getFieldValue('productType');

    kitIds.forEach(kitId => {
      const kit = kits.find(k => k._id === kitId);
      if (!kit) return;
      // A kit is Personalized (kit + extra products) or a Separate Kit (as-is). Keep any
      // existing per-kit choice; otherwise default from the Product Selection categories.
      const existingKo = existingKitOrders.find(o => o.kitId === kitId);
      const kitCat = existingKo?.category || defaultKitCategory(productType);
      (kit.products || []).forEach(p => {
        const invItem = inventoryItemsRaw.find(i => i.itemName === p.productName);
        const rate = invItem?.sellingPrice ?? p.sellingPrice ?? p.rate ?? 0;
        allKitRows.push({
          isKit: true,
          kitType: p.productName,
          name: p.productName,
          qty: p.qty,
          rate,
          unit: p.unit || invItem?.unit,
          kitName: kit.kitName,
          kitId,
          category: kitCat,
          packingMaterial: p.packingMaterial || invItem?.packingMaterial || '',
          materialCategory: p.materialCategory || invItem?.materialCategory || '',
          brand: p.brand || invItem?.brand || '',
          gst: p.gstPercent || Number(String(p.gst || '').replace('%', '')) || invItem?.gstPercent || 0,
          hsnCode: p.hsnCode || invItem?.hsnCode || '',
          defaultSize: p.defaultSize || p.size || invItem?.defaultSize || '',
          size: p.defaultSize || p.size || invItem?.defaultSize || '',
          logoType: p.logoType || invItem?.logoType || '',
          sticker: kit.sticker || '',
          logo: kit.logo || '',
          printing: kit.printing || p.printing || '',
        });
        const gstPct = p.gstPercent || Number(String(p.gst || '').replace('%', '')) || invItem?.gstPercent || 0;
        // Seed with the GST-inclusive per-line subtotal so the kit price matches the product SUBTOTALs.
        kitPriceById[kitId] = (kitPriceById[kitId] || 0) + r2((Number(p.qty) || 0) * (Number(rate) || 0) * (1 + (Number(gstPct) || 0) / 100));
      });
    });

    // Per-kit order configs — keep any existing user edits (overallQty, kitPrice override),
    // otherwise seed kitPrice with the computed sum of the kit's product prices.
    const newKitOrders = kitIds.map(kitId => {
      const kit = kits.find(k => k._id === kitId);
      const existing = existingKitOrders.find(o => o.kitId === kitId);
      const computedPrice = r2(kitPriceById[kitId] || 0);
      if (existing) {
        return {
          ...existing,
          category: existing.category || defaultKitCategory(productType),
          kitPrice: existing.kitPrice != null ? existing.kitPrice : computedPrice,
        };
      }
      return {
        kitId,
        category: defaultKitCategory(productType),
        displayUnit: kit?.displayUnit || '',
        size: kit?.size || '',
        overallQty: undefined,
        printing: undefined,
        kitPrice: computedPrice,
      };
    });

    const existing = leadForm.getFieldValue('products') || [];
    const nonKit = existing.filter(p => p && !(p.isKit || p.kitType));
    const totalKitPrice = r2(Object.values(kitPriceById).reduce((s, v) => s + v, 0));
    const currentTopPrice = leadForm.getFieldValue('kitPrice');

    leadForm.setFieldsValue({
      selectedKits: kitIds,
      selectedKit: kitIds[0] || undefined,
      kitDisplayUnit: newKitOrders[0]?.displayUnit || undefined,
      kitSize: newKitOrders[0]?.size || undefined,
      // Seed the shared kit-price with the summed total (only when not already overridden)
      kitPrice: (currentTopPrice == null || currentTopPrice === '') ? totalKitPrice : currentTopPrice,
      kitOrders: newKitOrders,
      products: [...allKitRows, ...nonKit],
    });
  };

  // Per-line subtotal incl. GST — matches the SUBTOTAL shown on each product row
  // (qty × rate × (1 + gst%), rounded per line so the kit price equals the sum the user sees).
  const productLineSubtotal = (p) =>
    r2((Number(p.qty) || 0) * (Number(p.rate) || 0) * (1 + (Number(p.gst) || 0) / 100));

  // Sum of the GST-inclusive subtotals of all kit-flagged product rows currently in the lead form.
  const computeKitPriceSum = () => {
    const prods = leadForm.getFieldValue('products') || [];
    return prods.filter(p => p && (p.isKit || p.kitType))
      .reduce((s, p) => s + productLineSubtotal(p), 0);
  };

  // Sum of the GST-inclusive subtotals of the product rows belonging to one specific kit card.
  const computeKitPriceForKit = (kitId, kitIndex) => {
    const prods = leadForm.getFieldValue('products') || [];
    const selKitsNow = leadForm.getFieldValue('selectedKits') || [];
    const isSingleKit = selKitsNow.length <= 1;
    return prods.filter(p => p && (p.isKit || p.kitType) && (p.kitId === kitId || (isSingleKit && !p.kitId && kitIndex === 0)))
      .reduce((s, p) => s + productLineSubtotal(p), 0);
  };

  // Seed the shared top-level kitPrice from the sum of all kit product subtotals — but ONLY
  // when the user hasn't entered one yet. We must NOT overwrite an existing value: selecting a
  // product specification (or editing any other product field) mutates the products array and
  // re-fires this effect, and force-syncing here was wiping out the user's personalized kit
  // price. Users can re-sync on demand via the "Σ Products" button next to the Kit Price field.
  // Per-kit kitOrders[i].kitPrice is likewise seed-only (it represents the packaging/display
  // unit cost) so it stays separate from the product cost shown in the PRODUCTS row.
  useEffect(() => {
    const prods = leadForm.getFieldValue('products') || [];
    if (!prods.some(p => p && (p.isKit || p.kitType))) return;
    const cur = leadForm.getFieldValue('kitPrice');
    if (cur == null || cur === '') {
      leadForm.setFieldValue('kitPrice', computeKitPriceSum());
    }
  }, [watchedLeadProducts]);


  const [createLeadMutation] = useCreateLeadMutation();
  const [createPartyMutation] = useCreatePartyMutation();
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
  const { data: stickerData } = useGetStickerRequestsQuery();
  const [approveStickerRequest] = useApproveStickerRequestMutation();
  const [approveEmergencySalesHead] = useApproveEmergencySalesHeadMutation();
  const [emergencySalesApprovalOrder, setEmergencySalesApprovalOrder] = useState(null);
  const [approvingEmergencyTaskId, setApprovingEmergencyTaskId] = useState(null);
  const [approvingAllEmergency, setApprovingAllEmergency] = useState(false);
  const { data: emergencyRequestsRaw } = useGetEmergencyRequestsQuery();
  // Group active emergency-dispatch requests by order — an order can hold several
  // products, each raised as its own request, so this must be a list per order key,
  // not the single last-write-wins snapshot Order.emergencyTaskId used to be.
  const emergencyRequestsByOrder = React.useMemo(() => {
    const map = {};
    (emergencyRequestsRaw?.data || []).forEach((t) => {
      const oid = (t.orderId?._id || t.orderId)?.toString();
      if (!oid) return;
      if (!map[oid]) map[oid] = [];
      map[oid].push({
        taskId: t._id,
        taskCode: t.taskCode,
        product: t.product || t.taskName || 'Product',
        reason: t.emergencyReason || '',
        requestedAt: t.emergencyRequestedAt,
        salesApproved: !!t.emergencySalesApproved,
        opsApproved: !!t.emergencyOpsApproved,
        approved: !!t.emergencyApproved,
      });
    });
    return map;
  }, [emergencyRequestsRaw]);

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
      ...i, // preserve all inventory-driven attributes (shape, fragrance, color, bottleType, …)
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
      sticker: normYesNo(i.sticker || i.stickerPrinting),
      brand: i.brand,
      otherSpecs: i.otherSpecs,
      isKit: i.isKit || false,
      kitName: i.kitName || '',
      kitType: i.kitType || '',
    }));

  useEffect(() => {
    if (leadsRaw?.data) setLeadsData((leadsRaw.data).map((l) => {
      const collected = (l.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const backendPaid = Number(l.paidAmount) || Number(l.totalPaid) || 0;
      const paidTotal = collected > 0 ? collected : (backendPaid || Number(l.advancePaid || 0));
      const lProducts = l.products?.length ? l.products : itemsToProducts(l.items);
      const kitAwareTotal = r2(computeRecordGrandTotal({ ...l, products: lProducts }));
      const total = kitAwareTotal > 0 ? kitAwareTotal : Number(l.total || 0);
      const computedStatus = total > 0
        ? (paidTotal >= total ? 'Paid' : paidTotal > 0 ? 'Partially Paid' : 'Unpaid')
        : ((l.paymentProofs || []).length > 0 ? (l.paymentTerms === 'BEFORE_100' ? 'Paid' : 'Partially Paid') : (l.paymentStatus || 'Unpaid'));
      const paymentStatus = (computedStatus !== 'Unpaid') ? computedStatus
        : (l.paymentStatus === 'Paid' || l.paymentStatus === 'Partially Paid') ? l.paymentStatus
        : 'Unpaid';
      return {
        ...l,
        key: l._id,
        leadId: l.leadCode,
        hotelName: l.hotelName,
        status: l.status,
        salesPerson: l.salesPerson,
        createdAt: l.createdAt,
        paymentStatus,
        totalAmount: total,
        paidAmount: paidTotal,
        balance: total - paidTotal,
      };
    }));
  }, [leadsRaw]);
  useEffect(() => {
    if (quotationsRaw?.data) setQuotationsData((quotationsRaw.data).map((q) => {
      const collected = (q.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const backendPaid = Number(q.paidAmount) || Number(q.totalPaid) || 0;
      const paidTotal = collected > 0 ? collected : (backendPaid || Number(q.advancePaid || 0));
      const qProducts = q.products?.length ? q.products : itemsToProducts(q.items);
      // Kit-aware grand total so the table/balance/status match the detail payment panel
      // (kit bucket = kitPrice × overallQty + separate + forwarding); fall back to stored total.
      const kitAwareTotal = r2(computeRecordGrandTotal({ ...q, products: qProducts }));
      const total = kitAwareTotal > 0 ? kitAwareTotal : Number(q.total || 0);
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
        products: qProducts,
        itemCount: (q.products?.length || q.items?.length || 0),
      };
    }));
  }, [quotationsRaw]);
  useEffect(() => {
    if (negotiationsRaw?.data) setNegotiationsData((negotiationsRaw.data).map((n) => {
      const collected = (n.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const backendPaid = Number(n.paidAmount) || Number(n.totalPaid) || 0;
      const paidTotal = collected > 0 ? collected : (backendPaid || Number(n.advancePaid || 0));
      const nProducts = n.products?.length ? n.products : itemsToProducts(n.items);
      // Kit-aware grand total so the table/balance/status match the detail payment panel.
      const kitAwareTotal = r2(computeRecordGrandTotal({ ...n, products: nProducts }));
      const total = kitAwareTotal > 0 ? kitAwareTotal : Number(n.total || 0);
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
        products: nProducts,
        itemCount: (n.products?.length || n.items?.length || 0),
      };
    }));
  }, [negotiationsRaw]);
  useEffect(() => {
    if (ordersRaw?.data) setOrdersData((ordersRaw.data).map((o) => {
      // Fall back to the lead's products when the order has none — handles orders created
      // from a hotel-only lead before products were added to the lead.
      const normalizedProducts = o.products?.length ? o.products
        : (o.items?.length ? itemsToProducts(o.items) : null)
        ?? (o.leadId?.products?.length ? o.leadId.products : null)
        ?? (o.leadId?.items?.length ? itemsToProducts(o.leadId.items) : []);
      const advance = o.advancePaidAmount ?? o.advancePaid ?? (typeof o.advance === 'number' ? o.advance : 0);
      const collectionTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      // paidAmount from backend is the authoritative total collected; use it when collection entries aren't in list response
      const backendPaid = Number(o.paidAmount) || Number(o.totalPaid) || Number(o.amountCollected) || 0;
      // An advance collected at the Lead stage (e.g. bank transfer before conversion) lives only
      // in the Lead's own paymentCollection and is never propagated onto the order — merge it in
      // here too (deduped by recordedAt+paidAmount), the same way the order-detail view does,
      // so this list's Collected/Balance/Payment-status match the detail total instead of
      // under-counting whenever the lead-stage advance wasn't synced onto the order.
      // Prefer the order's own populated leadId (always present, carries paymentCollection) over
      // leadsData — leadsData is fetched via getLeads, which excludes Dispatched/Delivered leads
      // by default for the Leads pipeline view, so a lead disappears from it the moment its order
      // ships, silently dropping its advance from this merge from then on.
      const linkedLeadForPaid = (o.leadId && typeof o.leadId === 'object' && o.leadId.paymentCollection)
        ? o.leadId
        : leadsData.find(l => String(l._id || l.key) === String(o.leadId?._id || o.leadId));
      const leadOnlyEntries = (linkedLeadForPaid?.paymentCollection || []).filter(le =>
        !(o.paymentCollection || []).some(oe => oe.recordedAt === le.recordedAt && Number(oe.paidAmount) === Number(le.paidAmount))
      );
      const mergedCollectionTotal = collectionTotal + leadOnlyEntries.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      // backendPaid (o.paidAmount) is the authoritative total written by saveOrderEdit —
      // it includes both advance and any subsequent collection entries.  Only fall back to
      // mergedCollectionTotal or advance when paidAmount was never explicitly stored, and always
      // take the larger of the two so a lead-stage advance not yet synced onto the order still counts.
      const paidTotal = Math.max(backendPaid, mergedCollectionTotal) > 0
        ? Math.max(backendPaid, mergedCollectionTotal)
        : advance;
      // Compute subtotal from products (qty*rate, always reliable).
      // For GST: prefer per-product % if set; fall back to stored gstAmount (handles converted/legacy orders).
      const subtotal = r2(calcTotal(normalizedProducts));
      const gstFromProducts = r2(calcGstAmount(normalizedProducts));
      const storedGst = Number(o.gstAmount) || 0;
      const effectiveGst = gstFromProducts > 0 ? gstFromProducts : storedGst;
      const rawTotal = subtotal + effectiveGst;
      // Kit-aware grand total — single source of truth shared with the detail views and
      // payment-collection panels: kit bucket = kitPrice × overallQty (GST-inclusive), plus
      // separate products + their GST, plus forwarding. Using it here makes the table total,
      // balance and payment status agree with what Payment Collection shows (raw subtotal+GST
      // under-counts kit orders because it never multiplies by the kit's overall quantity).
      const kitAwareTotal = r2(computeRecordGrandTotal({ ...o, products: normalizedProducts }));
      const total = kitAwareTotal > 0 ? kitAwareTotal : (rawTotal > 0 ? rawTotal : Number(o.total) || 0);
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
        hotelName: o.hotelName || o.clientName,
        status: o.status,
        paymentStatus,
        location: o.location || o.locationCity || o.leadId?.location || o.leadId?.locationCity,
        phone: o.clientPhone || o.phone || o.leadId?.phone,
        email: o.email || o.leadId?.email,
        contactPerson: o.contactPerson || o.leadId?.contactPerson,
        alternativeName: o.alternativeName || o.leadId?.alternativeName,
        alternativeRole: o.alternativeRole || o.leadId?.alternativeRole,
        alternativePhone: o.alternativePhone || o.leadId?.alternativePhone,
        billingName: o.billingName || o.leadId?.billingName || o.clientName,
        gstNumber: o.gstNumber || o.leadId?.gstNumber,
        gstPercent: o.gstPercent ?? o.leadId?.gstPercent,
        salesPerson: o.salesPerson || o.assignedTo?.fullName || o.leadId?.salesPerson,
        detailedAddress: o.detailedAddress || o.leadId?.detailedAddress,
        city: o.city || o.leadId?.city,
        state: o.state || o.leadId?.state,
        pincode: o.pincode || o.leadId?.pincode,
        destination: o.destination || o.leadId?.destination,
        hotelType: o.hotelType || o.leadId?.hotelType,
        rooms: o.rooms ?? o.numRooms ?? o.rowsInHotel ?? o.leadId?.rowsInHotel ?? o.leadId?.numRooms ?? o.leadId?.rooms,
        occupancy: o.occupancy ?? o.generalOccupancy ?? o.leadId?.generalOccupancy ?? o.leadId?.occupancy,
        branch: o.branch || o.leadId?.branch || '',
        pocDesignation: o.pocDesignation || o.leadId?.pocDesignation || '',
        deliveryBy: o.deliveryBy || o.leadId?.deliveryBy,
        transportationBy: o.transportationBy || o.leadId?.transportationBy,
        forwardingCharge: o.forwardingCharge ?? o.leadId?.forwardingCharge,
        forwardingChargeAmount: o.forwardingChargeAmount ?? o.leadId?.forwardingChargeAmount,
        paymentTerms: o.paymentTerms || o.leadId?.paymentTerms,
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
        // Kit fields: prefer order-level (stored by backend), fall back to populated leadId
        kitDisplayUnit: o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '',
        kitSize: o.kitSize || o.leadId?.kitSize || '',
        selectedKit: o.selectedKit || o.leadId?.selectedKit || '',
        selectedKits: (Array.isArray(o.selectedKits) && o.selectedKits.length > 0 ? o.selectedKits : null)
          || (Array.isArray(o.leadId?.selectedKits) && o.leadId.selectedKits.length > 0 ? o.leadId.selectedKits : null)
          || (o.selectedKit ? [o.selectedKit] : []),
        kitOrders: (Array.isArray(o.kitOrders) && o.kitOrders.length > 0 ? o.kitOrders : null)
          || (Array.isArray(o.leadId?.kitOrders) && o.leadId.kitOrders.length > 0 ? o.leadId.kitOrders : null)
          || [],
        packagingIncludes: (Array.isArray(o.packagingIncludes) && o.packagingIncludes.length > 0 ? o.packagingIncludes : null)
          ?? (Array.isArray(o.leadId?.packagingIncludes) && o.leadId.packagingIncludes.length > 0 ? o.leadId.packagingIncludes : null)
          ?? [],
        packagingIncludesQty: (Object.keys(o.packagingIncludesQty || {}).length > 0 ? o.packagingIncludesQty : null)
          ?? (Object.keys(o.leadId?.packagingIncludesQty || {}).length > 0 ? o.leadId.packagingIncludesQty : null)
          ?? {},
        kitSticker: o.kitSticker || o.leadId?.kitSticker,
        kitLogo: o.kitLogo || o.leadId?.kitLogo,
        kitPrinting: o.kitPrinting || o.leadId?.kitPrinting,
        kitPrice: o.kitPrice ?? o.leadId?.kitPrice,
        kitOverallQty: o.kitOverallQty ?? o.leadId?.kitOverallQty,
        productType: o.productType || o.leadId?.productType,
        splitDates: o.splitDates || [],
        isEmergency: o.isEmergency || false,
        isUrgent: o.isUrgent || false,
        // Per-product emergency-dispatch requests for this order (one entry per Task
        // that raised "Emergency Dispatch" in Task Management), most recent first.
        emergencyRequests: emergencyRequestsByOrder[o._id] || [],
        orderCategory: (o.orderCategory === 'SAMPLE' || o.leadId?.leadType === 'SAMPLE') ? 'SAMPLE' : (o.orderCategory || 'ORDER'),
      };
    }));
  }, [ordersRaw, emergencyRequestsByOrder, leadsData]);

  // When a single order is fetched (order-detail view), sync its accurate payment data back
  // into the list state so the table shows the correct status without a full page reload.
  useEffect(() => {
    const full = singleOrderRaw?.data;
    if (!full?._id) return;
    const orderId = full._id;
    // Persist the quotation code from the populated detail response so the
    // Download Quotation button can show the correct QT-... code even from the table row.
    const quotCodeFromDetail = typeof full.quotationId === 'object'
      ? full.quotationId?.quotCode
      : null;
    // leadId is populated in the single-order API — use it as a product source if the order
    // itself has none (hotel-only lead, products added after conversion).
    const leadProds = full.leadId?.products?.length ? full.leadId.products
      : (full.leadId?.items?.length ? itemsToProducts(full.leadId.items) : null);
    const prods = full.products?.length ? full.products
      : (full.items?.length ? itemsToProducts(full.items) : null)
      ?? leadProds ?? [];
    // Merge in any Lead-stage advance not yet propagated onto the order's own
    // paymentCollection — same reasoning as the list-view mapping above (mirrors it here
    // since the single-order detail response doesn't otherwise account for it).
    const leadOnlyEntriesFull = (full.leadId?.paymentCollection || []).filter(le =>
      !(full.paymentCollection || []).some(oe => oe.recordedAt === le.recordedAt && Number(oe.paidAmount) === Number(le.paidAmount))
    );
    const collTotal = (full.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0)
      + leadOnlyEntriesFull.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const adv = Number(full.advancePaidAmount ?? full.advancePaid ?? 0);
    const paidFull = Number(full.paidAmount) || 0;
    const paidTotal = Math.max(paidFull, collTotal) > 0 ? Math.max(paidFull, collTotal) : adv;
    const subtotalFull = r2(calcTotal(prods));
    const gstFromProdsFull = r2(calcGstAmount(prods));
    const storedGstFull = Number(full.gstAmount) || 0;
    const effectiveGstFull = gstFromProdsFull > 0 ? gstFromProdsFull : storedGstFull;
    const rawTotalFull = subtotalFull + effectiveGstFull;
    // Kit-aware grand total (mirrors the list normalization above) so the synced-back
    // balance/status match the payment-collection panels for kit + separate orders.
    const kitAwareFull = r2(computeRecordGrandTotal({ ...full, products: prods }));
    const total = kitAwareFull > 0 ? kitAwareFull : (rawTotalFull > 0 ? rawTotalFull : Number(full.total) || 0);
    const newStatus = paidTotal > 0 && total > 0 ? (paidTotal >= total ? 'Paid' : 'Partially Paid') : undefined;
    const quotCode = full.quotationId?.quotCode || full.quotationCode;
    // Effective kit+product fields from the full order (or its populated lead fallback)
    const fullKitOrders = (full.kitOrders?.length > 0 ? full.kitOrders : null) ?? (full.leadId?.kitOrders?.length > 0 ? full.leadId.kitOrders : null);
    const fullSelectedKits = (full.selectedKits?.length > 0 ? full.selectedKits : null) ?? (full.leadId?.selectedKits?.length > 0 ? full.leadId.selectedKits : null);
    const fullPkgIncludes = (full.packagingIncludes?.length > 0 ? full.packagingIncludes : null) ?? (full.leadId?.packagingIncludes?.length > 0 ? full.leadId.packagingIncludes : null);
    const fullPkgQty = (Object.keys(full.packagingIncludesQty||{}).length > 0 ? full.packagingIncludesQty : null) ?? (Object.keys(full.leadId?.packagingIncludesQty||{}).length > 0 ? full.leadId.packagingIncludesQty : null);
    setOrdersData(prev => prev.map(o => {
      if (o._id !== orderId && o.key !== orderId) return o;
      return {
        ...o,
        ...(quotCodeFromDetail ? { quotCode: quotCodeFromDetail } : {}),
        // Sync product/kit fields from the fully populated single-order response so the
        // detail view always shows complete data even for orders created from hotel-only leads.
        ...(prods.length > 0 ? { products: prods } : {}),
        ...(fullKitOrders ? { kitOrders: fullKitOrders } : {}),
        ...(fullSelectedKits ? { selectedKits: fullSelectedKits } : {}),
        ...(full.productType ? { productType: full.productType } : {}),
        ...(!o.packagingIncludes?.length && fullPkgIncludes ? { packagingIncludes: fullPkgIncludes, packagingIncludesQty: fullPkgQty || {} } : {}),
        ...(paidTotal > 0 ? { paidAmount: paidTotal, balance: Math.max(0, total - paidTotal) } : {}),
        ...(newStatus ? { paymentStatus: newStatus } : {}),
      };
    }));
    if (quotCode && paidTotal > 0) {
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
  // Build Parties tab from the Party collection (Customer type) — independent of leadsData
  // so dispatched/converted leads don't hide hotels from the Parties tab.
  // Enrich each party with phone/location/salesPerson from the most-recent order for that hotel.
  useEffect(() => {
    const parties = (partiesRaw?.data || []).filter(p => !p.type || p.type === 'Customer');
    if (!parties.length) return;
    const orderByHotel = new Map();
    [...ordersData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(o => {
        const k = (o.hotelName || o.clientName || '').toLowerCase().trim();
        if (k && !orderByHotel.has(k)) orderByHotel.set(k, o);
      });
    setCustomersData(parties.map((p) => {
      const o = orderByHotel.get((p.name || '').toLowerCase().trim());
      return {
        ...p,
        key: p._id,
        customerId: `HOTEL-${String(p._id).slice(-5)}`,
        hotelName: p.name,
        location: p.city || o?.location || o?.city || '—',
        phone: p.phone || o?.phone || o?.clientPhone || '—',
        salesPerson: o?.salesPerson || '—',
        createdAt: p.createdAt,
      };
    }));
  }, [partiesRaw, ordersData]);

  useEffect(() => {
    const gstin = selectedRecord?.gstNumber;
    const storedData = selectedRecord?.gstVerifiedData;
    const gstDetailViews = ['order-detail', 'quotation-detail', 'negotiation-detail', 'detail'];
    if (gstDetailViews.includes(viewMode) && gstin) {
      if (storedData) {
        // Use persisted verified data immediately — no live API call needed
        setGstApiData(storedData);
        setGstApiLoading(false);
        setGstApiError(null);
      } else {
        fetchGstDetails(gstin);
      }
    } else {
      setGstApiData(null);
      setGstApiError(null);
    }
  }, [viewMode, selectedRecord?.gstNumber, selectedRecord?.gstVerifiedData]);

  const newLeadDefaults = {
    hotelType: 'OLD', billType: 'GST', forwardingCharge: false, forwardingChargeAmount: 0,
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
    // Products & kit data live in cards that may be collapsed/unmounted during an edit
    // (e.g. when the user jumps straight to the payment section). validateFields() then OMITS
    // them (→ undefined), which would wipe the kits/products already on the lead on every
    // edit/payment-save. Prefer the validated value (authoritative when mounted, and an
    // intentional "clear all" stays as []); fall back to the full form store, then to the
    // record being edited — so saving a payment never deletes the line items (and the grand
    // total keeps its A/B/C buckets).
    const pickArr = (...vals) => {
      for (const v of vals) if (Array.isArray(v)) return v;
      return [];
    };
    const srcProducts = pickArr(values.products, formStore.products, editingLead?.products, selectedRecord?.products);
    const srcKitOrders = pickArr(values.kitOrders, formStore.kitOrders, editingLead?.kitOrders, selectedRecord?.kitOrders);
    const srcSelectedKits = pickArr(values.selectedKits, formStore.selectedKits, editingLead?.selectedKits, selectedRecord?.selectedKits);
    const srcPackagingIncludes = pickArr(values.packagingIncludes, formStore.packagingIncludes, editingLead?.packagingIncludes, selectedRecord?.packagingIncludes);
    const pickKit = (key) => values[key] ?? formStore[key] ?? editingLead?.[key] ?? selectedRecord?.[key];
    const billType = values.billType || formStore.billType || 'GST';
    const detailedAddress = values.detailedAddress || formStore.detailedAddress;
    const city = values.city || formStore.city;
    const state = values.state || formStore.state;
    const pincode = values.pincode || formStore.pincode;
    const gstPhone = values.gstPhone || formStore.gstPhone;
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
      products: tagProductCategories(normalizeProducts(srcProducts), srcKitOrders)
        .map((p) => ({ ...p, attachments: normalizeAttachments(p.attachments) })),
      billType,
      detailedAddress,
      city,
      state,
      pincode,
      gstPhone,
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
      displayUnit: pickKit('kitDisplayUnit') || pickKit('displayUnit'),
      displayUnitTab: (() => {
        const du = pickKit('kitDisplayUnit') || pickKit('displayUnit');
        const cfg = configDisplayUnitOptions.find(o => o.value === du);
        return cfg?.tabMapping || '';
      })(),
      kitDisplayUnitType: pickKit('kitDisplayUnitType') || undefined,
      selectedKits: srcSelectedKits,
      kitSticker: pickKit('kitSticker') || undefined,
      kitLogo: pickKit('kitLogo') || undefined,
      kitPrinting: pickKit('kitPrinting') || undefined,
      kitPrice: pickKit('kitPrice') != null ? Number(pickKit('kitPrice')) : undefined,
      kitOverallQty: Number(pickKit('kitOverallQty')) || undefined,
      kitOrders: normalizeKitOrdersForSave(srcKitOrders, values.productType),
      packagingIncludes: srcPackagingIncludes,
      packagingIncludesQty: values.packagingIncludesQty ?? formStore.packagingIncludesQty ?? editingLead?.packagingIncludesQty ?? selectedRecord?.packagingIncludesQty,
      packingMaterial: values.packingMaterial || '',
      hotelLogoUrl: hotelLogoUrl || undefined,
      paymentProofs: paymentProofFiles.length ? paymentProofFiles : (values.paymentProofs || []),
      paymentCollection: [
        ...(selectedRecord?.paymentCollection || []),
        ...(values.paymentCollection || []).filter(e => e?.paymentMethod).map((e, idx) => {
          // proof is set via setFieldValue (not a Form.Item) so validateFields may omit it;
          // fall back to formStore which always has the full store value.
          const storeEntry = (formStore.paymentCollection || [])[idx];
          return { ...e, proof: e?.proof || storeEntry?.proof, recordedAt: e?.recordedAt || new Date().toISOString() };
        }),
      ],
      paymentStatus: (() => {
        const existingCollSum = (selectedRecord?.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const existingPrior = existingCollSum > 0 ? existingCollSum : (Number(selectedRecord?.paidAmount) || Number(selectedRecord?.advancePaid) || 0);
        const newEntries = (values.paymentCollection || []).filter(e => Number(e.paidAmount) > 0);
        const newSum = newEntries.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const totalPaid = existingPrior + newSum;
        if (totalPaid > 0) {
          const recordTotal = r2(computeCompositionGrandTotal({ ...values, products: srcProducts, kitOrders: srcKitOrders, kitPrice: pickKit('kitPrice'), kitOverallQty: pickKit('kitOverallQty'), packagingIncludes: srcPackagingIncludes, packagingIncludesQty: values.packagingIncludesQty ?? formStore.packagingIncludesQty, forwardingCharge: values.forwardingCharge ?? formStore.forwardingCharge, forwardingChargeAmount: values.forwardingChargeAmount ?? formStore.forwardingChargeAmount }, kits));
          return recordTotal > 0 && totalPaid >= recordTotal ? 'Paid' : 'Partially Paid';
        }
        const proofs = paymentProofFiles.length ? paymentProofFiles : (values.paymentProofs || []);
        if (!proofs.length) return 'Unpaid';
        return values.paymentTerms === 'BEFORE_100' ? 'Paid' : 'Partially Paid';
      })(),
      advancePaid: (() => {
        const existingCollSum = (selectedRecord?.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const existingPrior = existingCollSum > 0 ? existingCollSum : (Number(selectedRecord?.paidAmount) || Number(selectedRecord?.advancePaid) || 0);
        const newSum = (values.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const total = existingPrior + newSum;
        return total || undefined;
      })(),
      paidAmount: (() => {
        const existingCollSum = (selectedRecord?.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const existingPrior = existingCollSum > 0 ? existingCollSum : (Number(selectedRecord?.paidAmount) || Number(selectedRecord?.advancePaid) || 0);
        const newSum = (values.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
        const total = existingPrior + newSum;
        return total || undefined;
      })(),
      priority: Number(values.priority) || 0,
      isPriority: Number(values.priority) > 0,
      priorityNote: values.mentionPriority,
      gstVerifiedData: gstAddApiData || undefined,
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
    if (!requireAccess(lead ? 'edit' : 'add')) return;
    setEditingLead(lead);
    setSelectedRecord(lead);
    setEditingSection(null);
    setGstAddApiData(null);
    setGstAddApiError(null);
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
        gstNumber: undefined,
        detailedAddress: undefined, city: undefined, state: undefined, pincode: undefined,
        status: undefined, quotationNo: undefined, followUpName: undefined, followUpTime: undefined, followUpStep: undefined,
        interestedInSoftware: undefined, previousSoftware: undefined, previousSoftwarePrice: undefined,
        mentionPriority: undefined, notes: undefined,
        selectedKit: undefined, selectedKits: [], kitDisplayUnit: undefined, kitSize: undefined, kitSticker: undefined, kitLogo: undefined, kitOverallQty: undefined, kitOrders: [],
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
        // Use builtPayload (normalized: tagged products, normalized kitOrders, field aliases)
        // instead of raw form `values` so local state is immediately consistent with what was
        // sent to the backend — avoids stale data if the user converts before RTK re-fetch.
        const updated = {
          ...editingLead,
          ...builtPayload,
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
          // Sync kit/product fields from the updated lead into any linked orders that were
          // created before the kit details were added (hotel-only lead scenario). Only fills
          // fields that are missing on the order — never overwrites order-specific data.
          const updLeadId = String(editingLead._id || editingLead.key || '');
          if (updLeadId) {
            setOrdersData(prev => prev.map(o => {
              const oLeadId = String(o.leadId?._id || o.leadId || '');
              if (!oLeadId || oLeadId !== updLeadId) return o;
              return {
                ...o,
                ...(!o.kitOrders?.length && builtPayload.kitOrders?.length ? { kitOrders: builtPayload.kitOrders } : {}),
                ...(!o.selectedKits?.length && builtPayload.selectedKits?.length ? { selectedKits: builtPayload.selectedKits } : {}),
                ...(!o.products?.length && builtPayload.products?.length ? { products: builtPayload.products } : {}),
                ...(!o.packagingIncludes?.length && builtPayload.packagingIncludes?.length
                  ? { packagingIncludes: builtPayload.packagingIncludes, packagingIncludesQty: builtPayload.packagingIncludesQty }
                  : {}),
              };
            }));
          }
          // Sync new paidAmount across the entire chain (quotation/negotiation/order)
          if (builtPayload.paidAmount > 0) {
            await syncChainPayment(editingLead, builtPayload.paidAmount, 'lead');
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
          // Auto-register lead's customer as a Party (upsert — won't duplicate)
          createPartyMutation({
            name: payload.hotelName || payload.billingName,
            phone: payload.phone,
            type: 'Customer',
            gstNumber: payload.gstNumber,
            gstVerifiedData: gstAddApiData || undefined,
            contactPerson: payload.contactPerson,
            city: payload.city,
            state: payload.state,
            pincode: payload.pincode,
            street: payload.detailedAddress,
          }).catch(() => {}); // fire-and-forget, don't block lead save
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
      hotel: ['hotelName', 'branch', 'destination', 'rowsInHotel', 'generalOccupancy', 'hotelType', 'billingName', 'contactPerson', 'pocDesignation', 'phone', 'alternativeRole', 'alternativeName', 'alternativePhone', 'email', 'location', 'salesPerson', 'source', 'priority', 'mentionPriority', 'interestedInSoftware', 'previousSoftware', 'previousSoftwarePrice', 'softwareExpiryDate'],
      billing: ['detailedAddress', 'city', 'state', 'pincode', 'billType', 'gstNumber', 'gstPhone'],
      leadStatus: ['status', 'quotationNo', 'quotationDate', 'followUpDate', 'followUpTime', 'followUpName'],
      leadJourney: ['followUpStep'],
      personalization: ['productType', 'displayUnit', 'selectedKit', 'selectedKits', 'kitDisplayUnit', 'kitDisplayUnitType', 'kitSize', 'kitSticker', 'kitLogo', 'kitPrinting', 'kitPrice', 'kitOverallQty', 'kitOrders', 'products'],
      delivery: ['orderDeliveryDate', 'splitDates', 'forwardingCharge', 'forwardingChargeAmount', 'deliveryBy', 'transportationBy', 'paymentTerms', 'paymentReminderDate', 'creditDueDate', 'paymentProofs', 'paymentCollection'],
      products: ['products', 'selectedKit', 'selectedKits', 'kitDisplayUnit', 'kitDisplayUnitType', 'kitSize', 'kitSticker', 'kitLogo', 'kitPrinting', 'kitLamination', 'kitPrice', 'kitOverallQty', 'kitOrders', 'productType', 'packagingIncludes', 'packagingIncludesQty', 'displayUnitTab', 'displayUnit'],
    };
    try {
      await leadForm.validateFields(fieldsBySection[section]);
    } catch (validationErr) {
      if (validationErr?.errorFields?.length) {
        enqueueSnackbar(`Please fix invalid fields: ${validationErr.errorFields.map(f => f.name?.join?.(' → ') || f.name).slice(0, 3).join(', ')}`, { variant: 'warning' });
      }
      return;
    }
    const rawValues = leadForm.getFieldsValue(fieldsBySection[section]);
    const values = { ...rawValues };
    if (values.rowsInHotel !== undefined) {
      values.numRooms = Number(values.rowsInHotel) || undefined;
    }
    ['followUpDate', 'quotationDate', 'softwareExpiryDate', 'orderDeliveryDate', 'paymentReminderDate', 'creditDueDate'].forEach(f => {
      if (values[f]) values[f] = toStr(values[f]);
    });
    if (values.splitDates) {
      values.splitDates = values.splitDates.map(sd => ({ ...sd, date: toStr(sd.date) }));
    }
    if (section === 'delivery') {
      // Merge existing saved entries with new ones from the form, picking up proof from
      // the full form store (proof is set via setFieldValue, not a registered Form.Item).
      const sectionFormStore = leadForm.getFieldsValue(true);
      const newEntries = (values.paymentCollection || []).filter(e => e?.paymentMethod).map((e, idx) => {
        const storeEntry = (sectionFormStore.paymentCollection || [])[idx];
        return { ...e, proof: e?.proof || storeEntry?.proof, recordedAt: e?.recordedAt || now };
      });
      values.paymentCollection = [...(selectedRecord?.paymentCollection || []), ...newEntries];
      const collectionEntries = values.paymentCollection.filter(e => Number(e.paidAmount) > 0);
      const collectionTotal = collectionEntries.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const recordTotal = r2(computeRecordGrandTotal(selectedRecord));
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
    // Recompute displayUnitTab from packing config when display unit changes during products edit.
    if (section === 'products') {
      const du = values.kitDisplayUnit || values.displayUnit;
      if (du) {
        const cfg = configDisplayUnitOptions.find(o => o.value === du);
        values.displayUnitTab = cfg?.tabMapping || selectedRecord.displayUnitTab || '';
        values.displayUnit = du;
      }
    }
    // Re-stamp category on product rows so inline kit-category flips persist + new rows get tagged.
    if (values.products) {
      values.products = tagProductCategories(normalizeProducts(values.products), values.kitOrders || selectedRecord.kitOrders || []);
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
      // Sync paidAmount across the entire chain when payment section is saved
      if (section === 'delivery' && values.paidAmount > 0) {
        await syncChainPayment(updated, values.paidAmount, 'lead');
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
      hotelType: lead.hotelType, billType: lead.billType, gstNumber: lead.gstNumber,
      salesPerson: lead.salesPerson,
      products: (lead.products || []).map(p => ({ ...p })),
      forwardingCharge: lead.forwardingCharge, forwardingChargeAmount: lead.forwardingChargeAmount || 0,
      deliveryBy: lead.deliveryBy, transportationBy: lead.transportationBy,
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
        items: (lead.products || []).map(p => mapOrderItem(p, lead.kitDisplayUnit || lead.displayUnit || '')),
        products: lead.products || [],
        kitDisplayUnit: lead.kitDisplayUnit || lead.displayUnit || '',
        kitDisplayUnitType: lead.kitDisplayUnitType || undefined,
        displayUnit: lead.displayUnit || lead.kitDisplayUnit || '',
        displayUnitTab: lead.displayUnitTab || '',
        kitSize: lead.kitSize || '',
        kitSticker: lead.kitSticker || undefined,
        kitLogo: lead.kitLogo || undefined,
        kitPrinting: lead.kitPrinting || undefined,
        kitPrice: lead.kitPrice != null ? Number(lead.kitPrice) : undefined,
        kitOverallQty: lead.kitOverallQty != null ? Number(lead.kitOverallQty) : undefined,
        selectedKits: lead.selectedKits || [],
        kitOrders: lead.kitOrders || [],
        productType: lead.productType,
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
        forwardingCharge: lead.forwardingCharge,
        forwardingChargeAmount: lead.forwardingChargeAmount || 0,
        deliveryBy: lead.deliveryBy,
        transportationBy: lead.transportationBy,
        paymentTerms: lead.paymentTerms,
        // Carry emergency / partial-delivery data so it isn't lost on the direct lead→negotiation path
        splitDates: lead.splitDates || [],
        isEmergency: !!lead.isEmergency || !!(lead.splitDates?.length),
        isUrgent: !!lead.isUrgent || !!(lead.splitDates?.length),
      }).unwrap();
      enqueueSnackbar(`${lead.hotelName} converted to Negotiation (${newNeg.nid})`, { variant: 'success' });
      setActiveTab('quotations');
      setViewMode('table');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert to Negotiation', { variant: 'error' });
    }
  };

  const convertLeadToSample = async (lead) => {
    if (!requireAccess('add')) return;
    const validProducts = (lead.products || []).filter(p => p.name);
    if (!validProducts.length) {
      enqueueSnackbar('Please add at least one product before converting to Sample', { variant: 'warning' });
      return;
    }
    try {
      const sampleProducts = validProducts.map(p => ({ ...p, qty: 1, amount: Number(p.rate) || 0 }));
      const subtotal = r2(calcTotal(sampleProducts));
      const gstAmt = r2(calcGstAmount(sampleProducts));
      const payload = {
        clientName: lead.hotelName || lead.billingName,
        clientPartyId: lead.clientPartyId?._id || lead.clientPartyId,
        hotelName: lead.hotelName,
        hotelType: lead.hotelType,
        billingName: lead.billingName,
        location: lead.location,
        clientPhone: lead.phone,
        phone: lead.phone,
        contactPerson: lead.contactPerson,
        salesPerson: lead.salesPerson,
        gstNumber: lead.gstNumber,
        gstPercent: lead.gstPercent,
        billType: lead.billType,
        detailedAddress: lead.detailedAddress,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        products: sampleProducts,
        // Operations reads order.items — map products so sample products show there too
        items: sampleProducts.map(p => mapOrderItem(p, lead.kitDisplayUnit || lead.displayUnit || '')),
        totalAmount: subtotal,
        gstAmount: gstAmt,
        total: subtotal + gstAmt,
        orderCategory: 'SAMPLE',
        status: 'In Production',
        logoRequired: lead.logoRequired,
        logoUrl: lead.logoUrl,
        displayUnit: lead.displayUnit,
        kitDisplayUnit: lead.kitDisplayUnit,
        displayUnitTab: lead.displayUnitTab,
        packingMaterial: lead.packingMaterial,
        selectedKit: lead.selectedKit,
        selectedKits: lead.selectedKits || [],
        kitOrders: lead.kitOrders || [],
        kitSize: lead.kitSize,
        kitSticker: lead.kitSticker || undefined,
        kitLogo: lead.kitLogo || undefined,
        kitPrinting: lead.kitPrinting || undefined,
        kitPrice: lead.kitPrice != null ? Number(lead.kitPrice) : undefined,
        kitOverallQty: lead.kitOverallQty != null ? Number(lead.kitOverallQty) : undefined,
        productType: lead.productType,
        deliveryBy: lead.deliveryBy,
        transportationBy: lead.transportationBy,
        forwardingCharge: lead.forwardingCharge,
        forwardingChargeAmount: lead.forwardingChargeAmount || 0,
        leadId: lead._id || lead.key,
      };
      await createSalesOrderMutation(payload).unwrap();
      enqueueSnackbar('Sample order created! All products set to qty 1.', { variant: 'success' });
      setViewMode('table');
      setActiveTab('orders');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create sample order', { variant: 'error' });
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
        // Collapse-safe: the products/kit cards may be unmounted while editing terms or payment,
        // so validateFields() can omit them. Pull from the full form store, then the record being
        // edited, so an edit never wipes items/kitOrders or zeroes the total. Total is kit-aware
        // (kit bucket + separate + forwarding) so it matches the table/detail.
        const qStore = quotationForm.getFieldsValue(true);
        const pickArrQ = (...vals) => { for (const v of vals) if (Array.isArray(v)) return v; return []; };
        const qProducts = pickArrQ(values.products, qStore.products, editingQuotation.products);
        const qKitOrders = pickArrQ(values.kitOrders, qStore.kitOrders, editingQuotation.kitOrders);
        const qKitAware = r2(computeRecordGrandTotal({ ...editingQuotation, ...values, products: qProducts, kitOrders: qKitOrders }));
        const qTotal = qKitAware > 0 ? qKitAware : (Number(editingQuotation.total || editingQuotation.totalAmount) || total);
        const newRevision = { version: `v${(editingQuotation.revisionHistory?.length || 0) + 1}`, date: now, by: 'Sales Team', note: 'Products / terms updated' };
        const updated = {
          ...editingQuotation,
          ...values,
          products: qProducts,
          kitOrders: qKitOrders,
          totalAmount: qTotal,
          total: qTotal,
          revisionHistory: [...(editingQuotation.revisionHistory || []), newRevision],
        };
        try {
          await updateSalesQuotationMutation({
            id: editingQuotation._id || editingQuotation.key,
            ...values,
            products: qProducts,
            kitOrders: qKitOrders,
            totalAmount: qTotal,
            total: qTotal,
            items: qProducts.map((p) => ({
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
        const itemsTotal = subtotal + gstAmount;
        const src = quotationFromLead || {};
        // Kit details are entered/edited in the quotation form (kitOrders, display unit, kit
        // price, …). validateFields() can omit fields whose cards are collapsed/unmounted, so
        // read the full form store and prefer it over the raw lead — otherwise the quotation
        // shows "only products" with the kit summary missing. pickKitField(): form store → lead.
        const qStore = quotationForm.getFieldsValue(true);
        const pickKitField = (k) => {
          const fv = qStore[k];
          if (fv != null && fv !== '' && !(Array.isArray(fv) && fv.length === 0)) return fv;
          return src[k];
        };
        const kitAwareTotal = r2(computeRecordGrandTotal({
          ...values,
          products: values.products || [],
          kitOrders: normalizeKitOrdersForSave(values.kitOrders || [], values.productType),
          forwardingCharge: values.forwardingCharge,
          forwardingChargeAmount: values.forwardingChargeAmount || 0,
        }));
        const grandTotal = kitAwareTotal > 0 ? kitAwareTotal : itemsTotal;
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
          // Spread the full product FIRST so dynamic specifications (shape, fragrance, size,
          // color, specification, productAttributes, category + kit fields) survive into
          // quotation.items and flow through negotiation → order → Operations. Previously this
          // hand-picked map dropped them, so anything reading order.items (Operations, Parties,
          // Billing) showed no specs even though order.products kept them.
          items: (values.products || []).map((p) => ({
            ...p,
            itemName: p.name || p.itemName,
            unit: p.unit,
            price: Number(p.rate) || 0,
            qty: Number(p.qty) || 0,
            lineTotal: (Number(p.qty) || 0) * (Number(p.rate) || 0),
            attachments: normalizeAttachments(p.attachments),
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
          contactPerson: values.contactPerson || src.contactPerson,
          phone: values.phone || src.phone,
          email: values.email || src.email,
          alternativeName: values.alternativeName || src.alternativeName || src.altName,
          alternativeRole: values.alternativeRole || src.alternativeRole || src.altRole,
          alternativePhone: values.alternativePhone || src.alternativePhone || src.altNumber,
          salesPerson: src.salesPerson || src.assignedTo?.fullName,
          hotelType: values.hotelType || src.hotelType,
          gstNumber: values.gstNumber || src.gstNumber,
          gstPercent: src.gstPercent,
          gstVerifiedData: src.gstVerifiedData || undefined,
          // Order details
          specifications: src.specifications || [],
          logoNeeded: src.logoNeeded,
          logoProducts: src.logoProducts,
          orderDeliveryDate: src.orderDeliveryDate,
          splitDates: src.splitDates || [],
          // Delivery & payment
          forwardingCharge: values.forwardingCharge ?? src.forwardingCharge,
          forwardingChargeAmount: values.forwardingChargeAmount ?? src.forwardingChargeAmount ?? 0,
          deliveryBy: values.deliveryBy || src.deliveryBy,
          transportationBy: values.transportationBy || src.transportationBy,
          paymentTerms: values.paymentTerms || src.paymentTerms,
          // Kit fields carried from the form (user's edits) with fallback to the lead
          productType: pickKitField('productType'),
          selectedKit: pickKitField('selectedKit'),
          selectedKits: pickKitField('selectedKits') || [],
          kitOrders: pickKitField('kitOrders') || [],
          displayUnit: pickKitField('displayUnit') || pickKitField('kitDisplayUnit'),
          kitDisplayUnit: pickKitField('kitDisplayUnit') || pickKitField('displayUnit'),
          kitDisplayUnitType: pickKitField('kitDisplayUnitType'),
          kitSize: pickKitField('kitSize'),
          kitSticker: pickKitField('kitSticker'),
          kitLogo: pickKitField('kitLogo'),
          kitPrinting: pickKitField('kitPrinting'),
          kitLamination: pickKitField('kitLamination'),
          kitOverallQty: pickKitField('kitOverallQty'),
          kitPrice: pickKitField('kitPrice'),
          packagingIncludes: pickKitField('packagingIncludes'),
          packagingIncludesQty: pickKitField('packagingIncludesQty'),
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
  // kitDisplayUnit: order-level display unit (e.g. "ZIPLOCK POUCH") used for kit items that
  // don't carry their own packingMaterial — so they get routed to the correct ops queue.
  const inferLogoType = (p, kitDisplayUnit = '') => {
    // Explicit sticker-printing selection wins over any packaging-type inference,
    // including the kit-level display unit (e.g. ZIPLOCK_POUCH).
    if (p?.sticker === 'YES') return 'Sticker';
    const hay = `${p?.printing || ''} ${p?.packingMaterial || ''} ${p?.materialCategory || ''} ${p?.logoType || ''} ${kitDisplayUnit}`.toLowerCase();
    if (hay.includes('butter') || hay.includes('paper')) return 'Butter Paper';
    if (hay.includes('frosted') || hay.includes('ziplock') || hay.includes('pouch')) return 'Frosted Ziplock';
    if (hay.includes('box')) return 'Box';
    // When sticker is explicitly No, don't infer 'Sticker' from keyword matching — the packing
    // material config tabMapping (resolved in Operations via packingMaterialTab) takes over routing.
    if (p?.sticker !== 'NO' && hay.includes('sticker')) return 'Sticker';
    if (p?.sticker === 'NO') return '';
    return p?.logoType || 'Sticker';
  };

  // Build an order item, carrying the operations/packaging fields the Operations module reads.
  // kitDisplayUnit: the order-level kit display unit (e.g. "ZIPLOCK POUCH"); applied to kit
  // items that don't have their own packingMaterial so Operations routes them correctly.
  const mapOrderItem = (p, kitDisplayUnit = '') => {
    const isKitItem = p.isKit || !!p.kitType;
    const packing = p.packingMaterial || p.packaging || (isKitItem ? kitDisplayUnit : '') || '';
    // Canonical sticker flag: product types use either `sticker` (brush/paste/…) or
    // `stickerPrinting` (soap/shampoo/…). Normalize to the Order enum ('YES'|'NO'|'') so
    // Order validation passes and Operations sticker routing still works (handles legacy
    // lowercase 'yes'/'no' values too).
    const sticker = normYesNo(p.sticker || p.stickerPrinting);
    return {
      ...p, // preserve all inventory-driven attributes (shape, fragrance, color, bottleType, …)
      itemName: p.name || p.kitType || '',
      name: p.name || p.kitType || '',
      // Product selection stores the inventory _id as `inventoryItemId` (see ProductItem's
      // handleProductSelect); `itemId` was never populated from it, so Order.items[].itemId
      // (used for inventory stock deduction on conversion) was always empty.
      itemId: p.inventoryItemId || p.itemId || undefined,
      unit: p.unit,
      price: Number(p.rate) || 0,
      rate: Number(p.rate) || 0,
      qty: Number(p.qty) || 0,
      gst: Number(p.gst) || 0,
      lineTotal: (Number(p.qty) || 0) * (Number(p.rate) || 0),
      logoType: inferLogoType({ ...p, sticker, packingMaterial: packing }, isKitItem ? kitDisplayUnit : ''),
      size: p.size || p.defaultSize || '',
      defaultSize: p.defaultSize || p.size || '',
      boxes: Number(p.boxes) || 0,
      packaging: packing,
      packingMaterial: packing,
      material: p.materialCategory || p.material || '',
      materialCategory: p.materialCategory || p.material || '',
      hsnCode: p.hsnCode || '',
      discountPercent: p.discountPercent,
      logo: p.logo,
      sticker,
      brand: p.brand,
      otherSpecs: p.otherSpecs,
      isKit: p.isKit || false,
      kitId: p.kitId || '',
      kitName: p.kitName || '',
      kitType: p.kitType || '',
      // Order-composition category so Operations can group personalized/separate-kit/separate-product.
      category: p.category || (isKitItem ? ORDER_CATEGORIES.SEPARATE_KIT : ORDER_CATEGORIES.SEPARATE_PRODUCT),
    };
  };

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
          billingName: d.billingName,
          contactPerson: d.contactPerson,
          pocDesignation: d.pocDesignation,
          phone: d.phone,
          email: d.email,
          // Form field is "location", not "locationCity"
          location: d.locationCity || d.location || d.city,
          destination: d.destination,
          gstNumber: d.gstNumber,
          branch: d.branch || branch,
          // Form fields use "alternativeRole/Name/Phone", not "altRole/Name/Number"
          alternativeRole: d.altRole,
          alternativeName: d.altName,
          alternativePhone: d.altNumber,
          generalOccupancy: d.generalOccupancy,
          // Form field is "rowsInHotel", not "numRooms"
          rowsInHotel: d.numRooms || d.rowsInHotel,
          source: d.source,
          // Populate logo from stored Cloudinary URL
          ...(d.hotelLogoUrl ? {
            hotelLogo: [{ uid: '-1', name: 'hotel-logo', status: 'done', url: d.hotelLogoUrl }],
          } : {}),
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
    // Look up the originating lead to carry emergency delivery data
    const qLeadId = String(q.leadId?._id || q.leadId || '');
    const qLead = qLeadId ? leadsData.find(l => String(l.key) === qLeadId || String(l._id) === qLeadId) : null;
    const splitDates = qLead?.splitDates?.length ? qLead.splitDates : (q.splitDates || []);
    const isEmergency = splitDates.length > 0 || !!(qLead?.isEmergency);
    const isUrgent = splitDates.length > 0 || !!(qLead?.isUrgent);
    // Always compute from products so we never double-count GST when q.amount stores
    // the grand total instead of the subtotal.
    const subtotal = calcTotal(q.products) || Number(q.amount) || 0;
    const gstFromProducts = (q.products || []).reduce(
      (s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
    const gstAmount = gstFromProducts > 0
      ? gstFromProducts
      : (Number(q.gstAmount) || Math.max(0, Number(q.totalAmount || q.total) - subtotal) || 0);
    const grandTotal = subtotal + gstAmount;
    // Carry the quotation's collected payment into the order so the Collected/Payment
    // columns reflect what was already paid (previously this was dropped, showing ₹0/Unpaid).
    const carriedCollection = (q.paymentCollection || []).filter(e => e && e.paymentMethod);
    const collectedFromEntries = carriedCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const carriedPaid = collectedFromEntries > 0
      ? collectedFromEntries
      : (Number(q.paidAmount) || Number(q.advancePaid) || 0);
    const carriedStatus = grandTotal > 0 && carriedPaid >= grandTotal
      ? 'Paid'
      : carriedPaid > 0 ? 'Partially Paid' : 'Unpaid';
    return {
      clientName: q.hotelName || q.billingName || q.clientName || 'Client',
      amount: subtotal,
      gstAmount,
      total: grandTotal,
      advancePaid: carriedPaid,
      advancePaidAmount: carriedPaid,
      paidAmount: carriedPaid,
      paymentCollection: carriedCollection,
      paymentStatus: carriedStatus,
      balance: Math.max(0, grandTotal - carriedPaid),
      // Preserve the source links so the order stays connected to its quotation/lead
      quotationId: q.key || q._id,
      leadId: q.leadId,
      type: q.billType === 'GST' ? 'GST' : 'Non-GST',
      billType: q.billType,
      paymentTerms: q.paymentTerms,
      paymentReminderDate: q.paymentReminderDate || q.creditDueDate || undefined,
      status,
      items: (q.products || []).map(p => mapOrderItem(p, q.kitDisplayUnit || q.displayUnit || '')),
      products: q.products || [],
      // Kit / product type info
      productType: q.productType,
      selectedKit: q.selectedKit,
      kitDisplayUnit: q.kitDisplayUnit || q.displayUnit,
      displayUnit: q.kitDisplayUnit || q.displayUnit,
      displayUnitTab: (() => {
        const du = q.kitDisplayUnit || q.displayUnit;
        const cfg = configDisplayUnitOptions.find(o => o.value === du);
        return cfg?.tabMapping || q.displayUnitTab || '';
      })(),
      packingMaterial: q.packingMaterial || '',
      logoRequired: q.logoNeeded || false,
      logoUrl: q.hotelLogoUrl || '',
      kitSize: q.kitSize,
      kitSticker: q.kitSticker || undefined,
      kitLogo: q.kitLogo || undefined,
      kitPrinting: q.kitPrinting || undefined,
      kitPrice: q.kitPrice != null ? Number(q.kitPrice) : undefined,
      kitOverallQty: q.kitOverallQty != null ? Number(q.kitOverallQty) : undefined,
      selectedKits: q.selectedKits || [],
      kitOrders: q.kitOrders || [],
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
      gstVerifiedData: q.gstVerifiedData || undefined,
      detailedAddress: q.detailedAddress,
      city: q.city,
      state: q.state,
      pincode: q.pincode,
      forwardingCharge: q.forwardingCharge,
      forwardingChargeAmount: q.forwardingChargeAmount || 0,
      deliveryBy: q.deliveryBy,
      transportationBy: q.transportationBy,
      // Carry the tentative delivery date through so the order detail can show it
      expectedDeliveryDate: q.orderDeliveryDate || q.expectedDeliveryDate || undefined,
      orderCategory: qLead?.leadType === 'SAMPLE' ? 'SAMPLE' : (q.orderCategory || 'ORDER'),
      // Emergency / partial delivery data from the originating lead
      splitDates,
      isEmergency,
      isUrgent,
      deliveryType: splitDates.length > 0 ? 'Partial' : (q.deliveryType || 'Full'),
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

  const convertOrderToInvoice = async (order) => {
    try {
      await updateSalesOrderStatusMutation({ id: order.key, status: 'Payment Pending' }).unwrap();
      enqueueSnackbar('Invoice generated successfully! Order is now pending payment.', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to generate invoice', { variant: 'error' });
    }
  };

  const convertOrderToSample = async (order) => {
    try {
      const sampleProducts = (order.products || []).filter(Boolean).map(p => ({
        ...p,
        qty: 1,
        amount: Number(p.rate) || 0,
      }));
      const subtotal = r2(calcTotal(sampleProducts));
      const gstAmt = r2(calcGstAmount(sampleProducts));
      const payload = {
        clientName: order.clientName || order.hotelName,
        clientPartyId: order.clientPartyId?._id || order.clientPartyId,
        hotelName: order.hotelName,
        hotelType: order.hotelType,
        billingName: order.billingName,
        location: order.location,
        clientPhone: order.clientPhone || order.phone,
        phone: order.phone || order.clientPhone,
        contactPerson: order.contactPerson,
        salesPerson: order.salesPerson,
        gstNumber: order.gstNumber,
        gstPercent: order.gstPercent,
        billType: order.billType,
        detailedAddress: order.detailedAddress,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        products: sampleProducts,
        // Operations reads order.items — map products so sample products show there too
        items: sampleProducts.map(p => mapOrderItem(p, order.kitDisplayUnit || order.displayUnit || '')),
        totalAmount: subtotal,
        gstAmount: gstAmt,
        total: subtotal + gstAmt,
        orderCategory: 'SAMPLE',
        status: 'In Production',
        logoRequired: order.logoRequired,
        logoUrl: order.logoUrl,
        displayUnit: order.displayUnit,
        kitDisplayUnit: order.kitDisplayUnit,
        displayUnitTab: order.displayUnitTab,
        packingMaterial: order.packingMaterial,
        selectedKit: order.selectedKit,
        selectedKits: order.selectedKits || [],
        kitOrders: order.kitOrders || [],
        kitSize: order.kitSize,
        kitSticker: order.kitSticker || undefined,
        kitLogo: order.kitLogo || undefined,
        kitPrinting: order.kitPrinting || undefined,
        kitPrice: order.kitPrice != null ? Number(order.kitPrice) : undefined,
        kitOverallQty: order.kitOverallQty != null ? Number(order.kitOverallQty) : undefined,
        productType: order.productType,
        deliveryBy: order.deliveryBy,
        transportationBy: order.transportationBy,
        forwardingCharge: order.forwardingCharge,
        forwardingChargeAmount: order.forwardingChargeAmount || 0,
        expectedDeliveryDate: order.expectedDeliveryDate,
      };
      await createSalesOrderMutation(payload).unwrap();
      enqueueSnackbar('Sample order created! All products set to qty 1.', { variant: 'success' });
      setViewMode('table');
      setActiveTab('orders');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create sample order', { variant: 'error' });
    }
  };

  const startOrderFromQuotation = async (q) => {
    const validProducts = (q.products || []).filter(p => p.name && Number(p.qty) > 0);
    if (!validProducts.length) {
      enqueueSnackbar('Please add product details to the quotation before converting to Order', { variant: 'warning' });
      return;
    }
    const qId = String(q.key || q._id || '');
    if (qId) {
      const existingOrder = ordersData.find(o => String(o.quotationId?._id || o.quotationId || '') === qId);
      if (existingOrder) {
        enqueueSnackbar(`Already converted to Order ${existingOrder.oid || existingOrder.orderCode || ''}. Duplicate not allowed.`, { variant: 'warning' });
        return;
      }
      const existingNeg = negotiationsData.find(n => String(n.quotationId?._id || n.quotationId || '') === qId);
      if (existingNeg) {
        enqueueSnackbar(`This quotation is already in Negotiation (${existingNeg.nid || existingNeg.negCode || ''}). Convert to Order from the Negotiations tab.`, { variant: 'info' });
        return;
      }
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
    const newCollection = (values.paymentCollection || []).filter(e => e.paymentMethod).map(e => ({ ...e, recordedAt: e.recordedAt || new Date().toISOString() }));
    const collTotal = newCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
    const advancePaid = collTotal > 0 ? collTotal : (Number(values.advance) || 0);
    const paymentStatus = total > 0 && advancePaid >= total
      ? 'Paid'
      : advancePaid > 0
      ? 'Partially Paid'
      : 'Unpaid';
    const hasPartial = Array.isArray(values.splitDates) && values.splitDates.length > 0;
    const proofMeta = (values.paymentProofs || []).map((f) => ({
      name: f.name || f.originFileObj?.name || 'file',
      url: f.url || f.response?.url || null,
      uid: f.uid,
      size: f.size || f.originFileObj?.size,
    }));
    const payload = {
      clientName: values.hotelName || values.billingName || orderFromQuotation?.hotelName || 'Client',
      hotelName: values.hotelName || orderFromQuotation?.hotelName,
      billingName: values.billingName || orderFromQuotation?.billingName,
      contactPerson: values.contactPerson || orderFromQuotation?.contactPerson,
      clientPhone: values.phone || orderFromQuotation?.phone,
      email: values.email || orderFromQuotation?.email,
      gstNumber: values.gstNumber || orderFromQuotation?.gstNumber,
      location: values.location || orderFromQuotation?.location,
      detailedAddress: values.detailedAddress || orderFromQuotation?.detailedAddress,
      city: values.city || orderFromQuotation?.city,
      state: values.state || orderFromQuotation?.state,
      pincode: values.pincode || orderFromQuotation?.pincode,
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
      items: (values.products || []).map(p => mapOrderItem(p, values.kitDisplayUnit || values.displayUnit || '')),
      products: values.products || [],
      productType: values.productType,
      selectedKit: values.selectedKit,
      selectedKits: values.selectedKits || [],
      // Persist per-kit config so Operations can route EACH kit to its own packaging tab
      // (multi-kit orders) instead of a single order-level display unit.
      kitOrders: normalizeKitOrdersForSave(values.kitOrders || [], values.productType),
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
    if (!requireAccess('add')) return;
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
    const qId = String(q.key || q._id || '');
    if (qId) {
      const existingOrder = ordersData.find(o => String(o.quotationId?._id || o.quotationId || '') === qId);
      if (existingOrder) {
        enqueueSnackbar(`Already converted to Order ${existingOrder.oid || existingOrder.orderCode || ''}. Cannot move to Negotiation again.`, { variant: 'warning' });
        return;
      }
      const existingNeg = negotiationsData.find(n => String(n.quotationId?._id || n.quotationId || '') === qId);
      if (existingNeg) {
        enqueueSnackbar(`Already in Negotiation (${existingNeg.nid || existingNeg.negCode || ''}). Duplicate not allowed.`, { variant: 'info' });
        return;
      }
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
      // Collapse-safe: products/kit cards may be unmounted while editing terms/payment, so
      // validateFields() can omit them. Pull from the form store, then the record being edited,
      // so an edit never wipes items/kitOrders or zeroes the total.
      const nStore = negotiationForm.getFieldsValue(true);
      const pickArrN = (...vals) => { for (const v of vals) if (Array.isArray(v)) return v; return []; };
      const nProducts = pickArrN(values.products, nStore.products, editingNegotiation.products);
      const nKitOrders = pickArrN(values.kitOrders, nStore.kitOrders, editingNegotiation.kitOrders);
      const subtotal = calcTotal(nProducts);
      const gstAmt = calcGstAmount(nProducts);
      const exactTotal = subtotal + gstAmt;
      const roundedTotal = Math.round(exactTotal / 100) * 100;
      const nonKitTotal = values.useRoundedTotal ? roundedTotal : exactTotal;
      // Kit-aware grand total (kit bucket + separate + forwarding) so it matches the table/detail.
      const nKitAware = r2(computeRecordGrandTotal({ ...editingNegotiation, ...values, products: nProducts, kitOrders: nKitOrders }));
      const total = nKitAware > 0 ? nKitAware : nonKitTotal;
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
        products: nProducts,
        kitOrders: nKitOrders,
        total,
        amount: subtotal,
        gstAmount: gstAmt,
        totalAmount: total,
        flowStep: nextStep,
        status: nextStatus,
        rounds: updatedRounds,
        items: nProducts.map(mapOrderItem),
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
    const nId = String(n.key || n._id || '');
    if (nId) {
      const existingOrder = ordersData.find(o => String(o.negotiationId?._id || o.negotiationId || '') === nId);
      if (existingOrder) {
        enqueueSnackbar(`Already converted to Order ${existingOrder.oid || existingOrder.orderCode || ''}. Duplicate not allowed.`, { variant: 'warning' });
        return;
      }
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
    { title: 'Follow Up Note', dataIndex: 'followUpName', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Follow Up Date/Time', dataIndex: 'followUpDate', width: 165,
      render: (v, r) => <Text style={{ fontSize: 13 }}>{v ? `${dayjs(v).format('DD MMM YYYY')}${r.followUpTime ? ' ' + r.followUpTime : ''}` : '—'}</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v] || '#ccc'} style={{ fontSize: 13 }}>{v}</Tag>
    },
    {
      title: 'Amount', dataIndex: 'totalAmount', width: 110, responsive: ['sm'],
      render: (v, r) => {
        const linkedOrder = ordersData.find(o =>
          (o.leadCode && o.leadCode === r.leadId) ||
          (o.leadId && String(o.leadId._id || o.leadId) === String(r.key))
        );
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const displayAmount = compTotal || linkedOrder?.totalAmount || v;
        return displayAmount > 0
          ? <Text strong style={{ fontSize: 13 }}>₹{displayAmount.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: 13 }}>—</Text>;
      },
    },
    {
      title: 'Collected', key: 'leadCollected', width: 110, responsive: ['sm'],
      render: (_, r) => {
        const linkedOrder = ordersData.find(o =>
          (o.leadCode && o.leadCode === r.leadId) ||
          (o.leadId && String(o.leadId._id || o.leadId) === String(r.key))
        );
        const paid = linkedOrder?.paidAmount ?? r.paidAmount;
        return (
          <Text strong style={{ fontSize: 13, color: paid > 0 ? '#52c41a' : textColor }}>
            {paid > 0 ? `₹${paid.toLocaleString()}` : '—'}
          </Text>
        );
      },
    },
    {
      title: 'Payment', key: 'leadPayStatus', width: 140,
      render: (_, r) => {
        const linkedOrder = ordersData.find(o =>
          (o.leadCode && o.leadCode === r.leadId) ||
          (o.leadId && String(o.leadId._id || o.leadId) === String(r.key))
        );
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const totalAmt = compTotal || linkedOrder?.totalAmount || r.totalAmount;
        const paidAmt = linkedOrder?.paidAmount ?? r.paidAmount;
        const balanceAmt = totalAmt > 0 ? Math.max(0, totalAmt - paidAmt) : (linkedOrder?.balance ?? r.balance);
        const payStatus = totalAmt > 0 && paidAmt >= totalAmt ? 'Paid' : paidAmt > 0 ? 'Partially Paid' : (linkedOrder?.paymentStatus || r.paymentStatus);
        if (!totalAmt) return <Tag color="default" style={{ borderRadius: 20, fontSize: 12, fontWeight: 600 }}>No Amount</Tag>;
        const color = payStatus === 'Paid' ? 'success' : payStatus === 'Partially Paid' ? 'warning' : 'error';
        return (
          <Space direction="vertical" size={2}>
            <Tag color={color} style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, margin: 0 }}>{payStatus}</Tag>
            {paidAmt > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>₹{paidAmt.toLocaleString()} / ₹{(totalAmt || 0).toLocaleString()}</Text>
            )}
            {paidAmt > 0 && balanceAmt > 0 && (
              <Text style={{ fontSize: 10, color: '#fa8c16' }}>₹{balanceAmt.toLocaleString()} due</Text>
            )}
          </Space>
        );
      },
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
          {(() => {
            const rowLinkedOrder = ordersData.find(o =>
              (o.leadCode && o.leadCode === r.leadId) ||
              (o.leadId && String(o.leadId._id || o.leadId) === String(r.key))
            );
            return !rowLinkedOrder && (
              <>
                <Tooltip title="Convert to Quotation">
                  <Button size="small" style={{ background: '#B11E6A', color: '#fff', border: 'none', fontSize: 13 }}
                    onClick={(e) => { e.stopPropagation(); startQuotationFromLead(r); }}>→ Quotation</Button>
                </Tooltip>
                <Tooltip title="Convert to Negotiation">
                  <Button size="small" style={{ background: '#722ed1', color: '#fff', border: 'none', fontSize: 13 }}
                    onClick={(e) => { e.stopPropagation(); convertLeadToNegotiation(r); }}>→ Negotiation</Button>
                </Tooltip>
              </>
            );
          })()}
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
  ];

  const negotiationColumns = [
    { title: 'Hotel', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Assigned To', dataIndex: 'salesPerson', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Amount', key: 'negAmt', width: 120, responsive: ['sm'],
      render: (_, r) => {
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const displayAmount = compTotal || r.totalAmount || 0;
        return <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{displayAmount.toLocaleString()}</Text>;
      },
    },
    {
      title: 'Payment Status', key: 'payStatus', width: 150,
      render: (_, r) => {
        const linkedOrder = ordersData.find(o => o.negotiationCode === r.nid || o.hotelName === r.hotelName);
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const effectiveTotal = compTotal || r.totalAmount || linkedOrder?.totalAmount || 0;
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedOrder?.paidAmount || 0);
        const effectiveStatus = effectiveTotal > 0 && effectivePaid >= effectiveTotal ? 'Paid'
          : effectivePaid > 0 ? 'Partially Paid'
          : (r.status && r.status !== 'Unpaid') ? r.status
          : (linkedOrder?.paymentStatus && linkedOrder.paymentStatus !== 'Unpaid') ? linkedOrder.paymentStatus
          : 'Unpaid';
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
          <Tooltip title="Download Quotation">
            <Button size="small" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); handleDownloadDirect(r, `negotiation-${r.nid || 'doc'}.html`); }} />
          </Tooltip>
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
      render: (_, r) => {
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const displayAmount = compTotal || r.totalAmount || calcTotal(r.products);
        return (
          <div>
            <Text style={{ fontSize: 13 }}>{r.itemCount ?? r.products?.length ?? 0} items</Text><br />
            <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{displayAmount.toLocaleString()}</Text>
          </div>
        );
      },
    },
    {
      title: 'Bill', dataIndex: 'billType', width: 90, responsive: ['md'],
      render: (v) => <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 13 }}>{v === 'GST' ? 'GST' : 'Non-GST'}</Tag>,
    },
    {
      title: 'Payment Status', key: 'payStatus', width: 150,
      render: (_, r) => {
        const linkedOrder = ordersData.find(o => o.quotationCode === r.qid || o.hotelName === r.hotelName);
        const compTotal = r2(computeCompositionGrandTotal(r, kits));
        const effectiveTotal = compTotal || r.totalAmount || linkedOrder?.totalAmount || 0;
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedOrder?.paidAmount || 0);
        const effectiveStatus = effectiveTotal > 0 && effectivePaid >= effectiveTotal ? 'Paid'
          : effectivePaid > 0 ? 'Partially Paid'
          : (r.status && r.status !== 'Unpaid') ? r.status
          : (linkedOrder?.paymentStatus && linkedOrder.paymentStatus !== 'Unpaid') ? linkedOrder.paymentStatus
          : 'Unpaid';
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
          <Tooltip title="Download Quotation">
            <Button size="small" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); handleDownloadDirect(r, `quotation-${r.qid || 'doc'}.html`); }} />
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

  // Resolve the quotation a given order was created from (handles populated object or raw id),
  // so quotation-originated orders can fall back to the quotation's collected/payment details.
  const findLinkedQuotation = (r) => {
    if (!r) return null;
    const qid = (r.quotationId && typeof r.quotationId === 'object') ? r.quotationId._id : r.quotationId;
    const qCode = (r.quotationId && typeof r.quotationId === 'object' ? r.quotationId.quotCode : null) || r.quotationCode;
    if (!qid && !qCode) return null;
    return quotationsData.find(q =>
      (qid && String(q.key) === String(qid)) || (qCode && q.qid === qCode)
    ) || null;
  };

  const orderColumns = [
    {
      title: 'Order ID', dataIndex: 'oid', width: 130,
      render: (v, record) => (
        <Space size={2} direction="vertical">
          <Space size={4}>
            {(record.isUrgent || record.isEmergency) && (
              <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />
            )}
            {record.orderCategory === 'SAMPLE' && (
              <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />
            )}
            <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text>
          </Space>
          {(record.isUrgent || record.isEmergency) && (
            <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>Emergency</Tag>
          )}
          {record.orderCategory === 'SAMPLE' && (
            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>Sample</Tag>
          )}
        </Space>
      ),
    },
    { title: 'Hotel', dataIndex: 'hotelName', width: 175, render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Location', dataIndex: 'location', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'GST Number', dataIndex: 'gstNumber', width: 130, render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Amount', dataIndex: 'totalAmount', width: 120, responsive: ['sm'],
      render: (v, r) => {
        const oLinkedLead = r.leadCode
          ? leadsData.find(l => l.leadCode === r.leadCode || l.leadId === r.leadCode)
          : leadsData.find(l => String(l.key) === String(r.leadId?._id || r.leadId));
        const compTotal = r2(computeCompositionGrandTotal(oLinkedLead || r, kits));
        return <Text strong style={{ fontSize: 13 }}>₹{(compTotal || v || 0).toLocaleString()}</Text>;
      },
    },
    {
      title: 'Collected', key: 'collected', width: 110, responsive: ['sm'],
      render: (_, r) => {
        const linkedNeg = negotiationsData.find(n => String(n.key) === String(r.negotiationId));
        const linkedQuot = findLinkedQuotation(r);
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedNeg?.paidAmount || linkedQuot?.paidAmount || 0);
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
        if (r.orderCategory === 'SAMPLE') return <Tag color="default" style={{ borderRadius: 20, fontSize: 12, fontWeight: 600 }}>N/A</Tag>;
        const linkedNeg = negotiationsData.find(n => String(n.key) === String(r.negotiationId));
        const linkedQuot = findLinkedQuotation(r);
        const effectivePaid = r.paidAmount > 0 ? r.paidAmount : (linkedNeg?.paidAmount || linkedQuot?.paidAmount || 0);
        const oLinkedLead = r.leadCode
          ? leadsData.find(l => l.leadCode === r.leadCode || l.leadId === r.leadCode)
          : leadsData.find(l => String(l.key) === String(r.leadId?._id || r.leadId));
        const compTotal = r2(computeCompositionGrandTotal(oLinkedLead || r, kits));
        const effectiveTotal = compTotal || r.totalAmount || 0;
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
            <Button size="small" icon={<DownloadOutlined />} onClick={(e) => { e.stopPropagation(); handleDownloadQuotation(r); }} />
          </Tooltip>
          <Tooltip title="Edit Delivery & Payment">
            <Button size="small" icon={<EditOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A55' }} onClick={(e) => { e.stopPropagation(); openOrderEditModal(r); }} />
          </Tooltip>
          <Tooltip title="Send via WhatsApp">
            <Button size="small" icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => sendViaWhatsApp(r)} />
          </Tooltip>
          {r.status === 'Payment Pending' && (
            <Tooltip title="Record Payment">
              <Button size="small" style={{ background: '#52c41a', color: '#fff', border: 'none', fontSize: 11 }} onClick={() => openPayEntry('order', r)}>
                Record Payment
              </Button>
            </Tooltip>
          )}
          {(() => {
            const reqs = r.emergencyRequests || [];
            if (reqs.length === 0) return null;
            const needsSales = reqs.filter((x) => !x.salesApproved);
            const awaitingOps = reqs.filter((x) => x.salesApproved && !x.opsApproved);
            const allApproved = reqs.every((x) => x.approved);
            if (needsSales.length > 0) {
              return (
                <Tooltip title={`${needsSales.length} product${needsSales.length > 1 ? 's' : ''} awaiting emergency dispatch approval — payment pending. Click to review and approve as Sales Head.`}>
                  <Button
                    size="small"
                    danger
                    icon={<AlertFilled />}
                    style={{ fontWeight: 600 }}
                    onClick={(e) => { e.stopPropagation(); setEmergencySalesApprovalOrder(r); }}
                  >
                    Approve Emergency ({needsSales.length})
                  </Button>
                </Tooltip>
              );
            }
            if (awaitingOps.length > 0) {
              return <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>Awaiting Ops Approval ({awaitingOps.length})</Tag>;
            }
            if (allApproved) {
              return <Tag color="success" style={{ fontSize: 11, margin: 0 }}>Emergency Approved</Tag>;
            }
            return null;
          })()}
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
    { title: 'Complaint ID', dataIndex: 'complaintCode', width: 140, render: (v, r) => <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>{v || `CMP-${(r.key || '').toString().slice(-4)}`}</Text> },
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
    const DetailProductCards = ({ products = [], totalAmount, kitDisplayUnit, kitSize, kitName, selectedKits = [], kitOrders = [], kitSticker, kitLogo, kitPrinting, kitOverallQty, kitPrice, forwardingCharge, forwardingChargeAmount, packagingIncludes, packagingIncludesQty }) => {
      const kitProds = products.filter(p => p && (p.isKit || p.kitType));
      const sepProds = products.filter(p => p && !p.isKit && !p.kitType);
      const effectiveKitName = kitName || (kitProds.length > 0 ? (kitProds[0].kitName || kitProds[0].kitType || null) : null);
      const effectiveDisplayUnit = (kitDisplayUnit || '').replace(/_/g, ' ');
      // Per-kit summary: render one block per selected kit with its order details
      const hasKitSummary = selectedKits.length > 0 || (kitProds.length > 0 && (effectiveKitName || effectiveDisplayUnit || kitSticker || kitLogo || kitPrinting || kitOverallQty || kitPrice));
      // Helper: render a single product card (reused in per-kit sections and flat list)
      const renderDetailProdCard = (p, i) => {
        // Normalize: fields may be top-level OR nested under p.specs (legacy)
        const logo            = p.logo            || p.specs?.logo;
        const _stickerRaw     = p.sticker         || p.stickerPrinting || p.specs?.sticker;
        const sticker         = normYesNo(_stickerRaw) || _stickerRaw;
        const packingMaterial = p.packingMaterial || p.packaging || p.specs?.packingMaterial;
        const materialCategory= p.materialCategory|| p.material  || p.specs?.materialCategory;
        const brand           = p.brand           || p.specs?.brand;
        const otherSpecs      = p.otherSpecs      || p.specs?.otherSpecs;
        const productName     = p.name || p.itemName || p.kitType || '—';
        const SHOWN_ATTR_KEYS = new Set(['name','itemName','kitType','isKit','kitName','qty','rate','price','gst','gstPercent','unit','lineTotal','logoType','boxes','packaging','packingMaterial','material','materialCategory','hsnCode','discountPercent','discount','logo','sticker','stickerPrinting','brand','otherSpecs','size','defaultSize','specs','displayType','itemId','_id','key','amount','rateValue','total']);
        const extraAttrs = Object.entries(p || {}).filter(([k, v]) => {
          if (SHOWN_ATTR_KEYS.has(k)) return false;
          if (k === 'productAttributes' || k === 'attachments' || k === 'kitIncludes' || k === 'kitIncludesQty') return false;
          if (v == null || v === '') return false;
          if (Array.isArray(v)) return v.length > 0 && v.every((x) => x == null || typeof x !== 'object');
          return typeof v !== 'object';
        });
        // Inventory attributes nested under p.productAttributes ({ shape:'Round', fragrance:'Rose', … })
        const prodAttrEntries = (p.productAttributes && typeof p.productAttributes === 'object' && !Array.isArray(p.productAttributes))
          ? Object.entries(p.productAttributes).filter(([, v]) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0))
          : [];
        const pAttachments = (Array.isArray(p.attachments) ? p.attachments : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
        const isKitItem       = p.isKit || !!p.kitType;
        const kitLabel        = p.kitName || p.kitType || '';
        const unitLabel       = p.unit || (isKitItem ? (kitDisplayUnit || '').replace(/_/g, ' ') : '') || '';
        const sizeLabel       = p.size || (isKitItem ? kitSize || '' : '') || '';
        const gstVal          = Number(p.gst) || 0;
        const lineTotal       = r2((p.qty || 0) * (p.rate || 0) * (1 + gstVal / 100));
        const hasSpecs        = logo || sticker || packingMaterial || materialCategory || brand || otherSpecs || unitLabel || sizeLabel || extraAttrs.length || prodAttrEntries.length || pAttachments.length;
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
                  {extraAttrs.map(([k, v]) => (
                    <Col xs={12} sm={8} key={k}>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>{prettyAttrKeyLead(k)}</Text>
                      <Text strong style={{ fontSize: 12 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                    </Col>
                  ))}
                  {prodAttrEntries.map(([k, v]) => (
                    <Col xs={12} sm={8} key={`pa-${k}`}>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 3 }}>{prettyAttrKeyLead(k)}</Text>
                      <Text strong style={{ fontSize: 12 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                    </Col>
                  ))}
                  {otherSpecs && (
                    <Col xs={24} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Other Specifications</Text>
                      <div style={{ padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fa', borderRadius: 8, fontSize: 12, color: isDark ? '#ccc' : '#444' }}>
                        {otherSpecs}
                      </div>
                    </Col>
                  )}
                  {pAttachments.length > 0 && (
                    <Col xs={24} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>Attachments / Files</Text>
                      <AttachmentLinks files={pAttachments} />
                    </Col>
                  )}
                </Row>
              </div>
            )}
          </div>
        );
      };
      return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Per-kit order details summary — shown when kit metadata is available */}
        {hasKitSummary && selectedKits.length > 0 ? (
          selectedKits.map((kitId, idx) => {
            const ko = kitOrders.find(o => o.kitId === kitId) || kitOrders[idx] || {};
            const kitDef = kits.find(k => k._id === kitId);
            const kName = kitDef?.kitName || ko.kitName || effectiveKitName || 'Kit';
            const kDU = (ko.displayUnit || kitDisplayUnit || '').replace(/_/g, ' ');
            const kSize = ko.size || kitSize;
            const kQty = ko.overallQty || kitOverallQty;
            const kPrice = ko.kitPrice || kitPrice;
            const kSticker = ko.sticker || kitSticker;
            const kLogo = ko.logo || kitLogo;
            const kPrinting = ko.printing || kitPrinting;
            const overallQty = Number(kQty) || 0;
            const thisKitProds = products.filter(p => (p.isKit || p.kitType) && (p.kitId === kitId || (!p.kitId && selectedKits.length <= 1 && idx === 0)));
            return (
              <div key={kitId} style={{ padding: '12px 16px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <GiftOutlined style={{ color: '#722ed1' }} />
                  <Text strong style={{ color: '#722ed1', fontSize: 14 }}>Kit: {kName}</Text>
                  {kDU && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{kDU}</Tag>}
                  {kSize && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{kSize}</Tag>}
                  {kQty > 0 && <Tag color="blue" style={{ borderRadius: 12, fontSize: 11 }}>Qty: {kQty} kits</Tag>}
                  {kSticker && <Tag color={kSticker === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Sticker: {kSticker === 'YES' ? 'Yes' : 'No'}</Tag>}
                  {kLogo && <Tag color={kLogo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Logo: {kLogo === 'YES' ? 'Yes' : 'No'}</Tag>}
                  {kPrinting && <Tag color={kPrinting === 'YES' ? 'purple' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Printing: {kPrinting === 'YES' ? 'Yes' : 'No'}</Tag>}
                  {ko.displayUnitType && <Tag color="magenta" style={{ borderRadius: 12, fontSize: 11 }}>{(configDisplayUnitOptions.find(c => c.value === (ko.displayUnit || kitDisplayUnit))?.label || 'Display Unit')} Type: {ko.displayUnitType}</Tag>}
                  {ko.lamination && <Tag color={ko.lamination === 'YES' ? 'gold' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Lamination: {ko.lamination === 'YES' ? 'Yes' : 'No'}</Tag>}
                  {kPrice > 0 && <Tag color="orange" style={{ borderRadius: 12, fontSize: 11 }}>₹{Number(kPrice).toLocaleString()}{kQty > 0 ? ` × ${kQty} = ₹${(Number(kPrice) * kQty).toLocaleString()}` : ''}</Tag>}
                </div>
                {ko.specification && (
                  <div style={{ marginBottom: 8, fontSize: 12 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Specification: </Text>
                    <Text style={{ fontSize: 12 }}>{ko.specification}</Text>
                  </div>
                )}
                {Array.isArray(ko.attachments) && ko.attachments.filter((a) => a && (typeof a === 'string' ? a : a.url)).length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>Kit Files / Attachments</Text>
                    <AttachmentLinks files={ko.attachments} />
                  </div>
                )}
                {thisKitProds.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                    {thisKitProds.map((p, j) => renderDetailProdCard(p, j))}
                  </div>
                )}
                {overallQty > 1 && thisKitProds.length > 0 && (
                  <div style={{ padding: '10px 14px', background: isDark ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.04)', borderRadius: 8, border: '1px solid rgba(24,144,255,0.15)', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#1890ff', display: 'block', marginBottom: 6 }}>TOTAL QUANTITIES ({overallQty} kits)</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {thisKitProds.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <Text type="secondary">{p.name || p.kitType || '—'}</Text>
                          <Text>{p.qty || 0} × {overallQty} = <Text strong style={{ color: '#1890ff' }}>{(Number(p.qty)||0)*overallQty}</Text> pcs</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(ko.kitIncludes) && ko.kitIncludes.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, letterSpacing: 0.5 }}>INCLUDED IN PACKAGING</Text>
                    <Space wrap size={4}>
                      {ko.kitIncludes.map((v, i) => {
                        const id = typeof v === 'object' ? v.id : v;
                        const qty = typeof v === 'object' ? v.qty : null;
                        const kMatch = kits.find(k => k._id === id);
                        const label = kMatch ? kMatch.kitName : id;
                        return <Tag key={i} color={kMatch ? 'purple' : 'orange'} style={{ borderRadius: 10, fontSize: 11 }}>{label}{qty && qty > 1 ? ` ×${qty}` : ''}</Tag>;
                      })}
                    </Space>
                  </div>
                )}
              </div>
            );
          })
        ) : hasKitSummary ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.18)', flexWrap: 'wrap' }}>
              <GiftOutlined style={{ color: '#722ed1' }} />
              {effectiveKitName && <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Kit: {effectiveKitName}</Text>}
              {effectiveDisplayUnit && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{effectiveDisplayUnit}</Tag>}
              {kitSize && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{kitSize}</Tag>}
              {kitOverallQty > 0 && <Tag color="blue" style={{ borderRadius: 12, fontSize: 11 }}>Qty: {kitOverallQty} kits</Tag>}
              {kitSticker && <Tag color={kitSticker === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Sticker: {kitSticker === 'YES' ? 'Yes' : 'No'}</Tag>}
              {kitLogo && <Tag color={kitLogo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Logo: {kitLogo === 'YES' ? 'Yes' : 'No'}</Tag>}
              {kitPrinting && <Tag color={kitPrinting === 'YES' ? 'purple' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Printing: {kitPrinting === 'YES' ? 'Yes' : 'No'}</Tag>}
              {kitPrice > 0 && <Tag color="orange" style={{ borderRadius: 12, fontSize: 11 }}>₹{Number(kitPrice).toLocaleString()}{kitOverallQty > 0 ? ` × ${kitOverallQty} = ₹${(Number(kitPrice) * kitOverallQty).toLocaleString()}` : ''}</Tag>}
            </div>
            {kitProds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kitProds.map((p, j) => renderDetailProdCard(p, j))}
              </div>
            )}
          </>
        ) : null}
        {sepProds.map((p, i) => renderDetailProdCard(p, i))}
        {products.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              ORDER TOTAL — BY CATEGORY ({products.length} product{products.length !== 1 ? 's' : ''})
            </Text>
            <CategoryTotalsBreakdown rec={{ products, kitOrders, forwardingCharge, forwardingChargeAmount, kitPrice, kitOverallQty, packagingIncludes, packagingIncludesQty }} isDark={isDark} kitsData={kits} />
          </div>
        )}
      </div>
      );
    };

    const DetailDeliveryPayment = ({ rec, grandTotal, showPaymentSummary = true }) => {
      const isSample = rec.orderCategory === 'SAMPLE' || rec.leadType === 'SAMPLE';
      const recTotal = r2(Number(grandTotal) || computeCompositionGrandTotal(rec, kits) || computeRecordGrandTotal(rec)) || Number(rec.totalAmount) || 0;
      const recCollected = (rec.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const recPaid = Math.max(recCollected, Number(rec.paidAmount) || Number(rec.advancePaid) || 0);
      const recBalance = Math.max(0, recTotal - recPaid);
      return (
        <>
        <Row gutter={12}>
          <Col xs={24} sm={isSample ? 24 : 12}>
            <div style={{ padding: '14px 16px', background: 'rgba(250,140,22,0.06)', borderRadius: 10, border: '1px solid rgba(250,140,22,0.15)', height: '100%' }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 10, letterSpacing: 0.5 }}>DELIVERY INFO</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Text type="secondary" style={{ fontSize: 12 }}>Delivery By</Text><Text strong>{rec.deliveryBy || '—'}</Text></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><Text type="secondary" style={{ fontSize: 12 }}>Transport Cost Scope</Text><Text strong>{rec.transportationBy || '—'}</Text></div>
              {(rec.orderDeliveryDate || rec.expectedDelivery) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Tentative Date</Text>
                  <Text strong style={{ color: '#fa8c16' }}>
                    {(() => { const d = rec.orderDeliveryDate || rec.expectedDelivery; return dayjs(d).isValid() ? dayjs(d).format('DD MMM YYYY') : String(d).slice(0, 10); })()}
                  </Text>
                </div>
              )}
              <Tag color={rec.forwardingCharge ? 'orange' : 'default'} style={{ borderRadius: 20 }}>
                {rec.forwardingCharge ? `Forwarding: ₹${(rec.forwardingChargeAmount || 0).toLocaleString()}` : 'No Forwarding Charge'}
              </Tag>
            </div>
          </Col>
          {!isSample && (
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
          )}
        </Row>
        {!isSample && showPaymentSummary && recTotal > 0 && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: recBalance > 0 ? 'rgba(250,140,22,0.06)' : 'rgba(82,196,26,0.06)', borderRadius: 10, border: `1px solid ${recBalance > 0 ? 'rgba(250,140,22,0.25)' : 'rgba(82,196,26,0.25)'}` }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, letterSpacing: 0.5 }}>PAYMENT SUMMARY</Text>
            <div style={{ marginBottom: 10 }}>
              <CategoryTotalsBreakdown rec={rec} isDark={isDark} kitsData={kits} />
            </div>
            {recPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Amount Paid</Text>
                <Text strong style={{ color: '#52c41a' }}>₹{recPaid.toLocaleString()}</Text>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <Text style={{ fontSize: 13, fontWeight: 700 }}>Amount to Pay</Text>
              <Text strong style={{ fontSize: 15, color: recBalance > 0 ? '#fa8c16' : '#52c41a' }}>₹{recBalance.toLocaleString()}</Text>
            </div>
          </div>
        )}
        </>
      );
    };

    // ── Quotation detail ───────────────────────────────────────────
    if (viewMode === 'quotation-detail') {
      const q = selectedRecord || {};
      const qLeadId = String(q.leadId?._id || q.leadId || '');
      const qLead = qLeadId ? leadsData.find(l => String(l.key) === qLeadId || String(l._id) === qLeadId) : null;
      const qKitOrders = (Array.isArray(q.kitOrders) && q.kitOrders.length > 0 ? q.kitOrders : null)
        || (Array.isArray(qLead?.kitOrders) && qLead.kitOrders.length > 0 ? qLead.kitOrders : null) || [];
      const qEnriched = {
        ...q,
        kitOrders: qKitOrders,
        kitPrice: q.kitPrice || qLead?.kitPrice,
        kitOverallQty: q.kitOverallQty || qLead?.kitOverallQty,
        paidAmount: computeChainPaid(q),
      };
      const QUOT_STEPS = [
        { title: 'Draft', description: 'Created' },
        { title: 'Sent', description: 'Sent to client' },
        { title: 'Negotiation', description: 'Under review' },
        { title: 'Approved', description: 'Confirmed' },
      ];
      return (
        <>
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('quotations'); }} style={{ borderRadius: 8 }}>Back to Quotations</Button>
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => editExistingQuotation(q)} style={{ borderRadius: 8 }}>Edit Products</Button>
              <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }} onClick={() => handleDownloadDirect(q, `quotation-${q.qid || 'doc'}.html`)}>Download Quotation</Button>
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
              { label: 'Payment Terms', value: PAYMENT_LABELS[q.paymentTerms] || q.paymentTerms || '—', color: '#fa8c16', icon: <CalendarOutlined /> },
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
                {(() => {
                  const qLeadIdCI = String(q.leadId?._id || q.leadId || '');
                  const qLeadCI = qLeadIdCI ? leadsData.find(l => String(l.key) === qLeadIdCI || String(l._id) === qLeadIdCI) : null;
                  const qEmail = q.email || qLeadCI?.email;
                  const qAltName = q.alternativeName || qLeadCI?.altName || qLeadCI?.alternativeName;
                  const qAltRole = q.alternativeRole || qLeadCI?.altRole || qLeadCI?.alternativeRole;
                  const qAltPhone = q.alternativePhone || qLeadCI?.altNumber || qLeadCI?.alternativePhone;
                  const qDest = q.destination || qLeadCI?.destination;
                  const qBranch = q.branch || qLeadCI?.branch;
                  const qRooms = q.rooms || qLeadCI?.rooms;
                  const qOcc = q.occupancy || qLeadCI?.occupancy;
                  return (
                    <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 2 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }}>
                      <Descriptions.Item label="Hotel / Company">{q.hotelName}</Descriptions.Item>
                      <Descriptions.Item label="Billing Name">{q.billingName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Location">{q.location}</Descriptions.Item>
                      <Descriptions.Item label="Contact Person">{q.contactPerson || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Phone"><a href={`tel:${q.phone}`}>{q.phone || '—'}</a></Descriptions.Item>
                      {qEmail && <Descriptions.Item label="Email"><a href={`mailto:${qEmail}`}>{qEmail}</a></Descriptions.Item>}
                      <Descriptions.Item label="Assigned To">{q.salesPerson}</Descriptions.Item>
                      {qDest && <Descriptions.Item label="Destination">{qDest}</Descriptions.Item>}
                      {qBranch && <Descriptions.Item label="Branch">{qBranch}</Descriptions.Item>}
                      {qRooms && <Descriptions.Item label="Rooms">{qRooms}</Descriptions.Item>}
                      {qOcc && <Descriptions.Item label="Occupancy">{qOcc}</Descriptions.Item>}
                      {(q.city || q.state || q.pincode) && (
                        <Descriptions.Item label="City / State / Pincode" span={2}>
                          {[q.city, q.state, q.pincode].filter(Boolean).join(', ')}
                        </Descriptions.Item>
                      )}
                      {q.detailedAddress && <Descriptions.Item label="Detailed Address" span={2}>{q.detailedAddress}</Descriptions.Item>}
                      {q.billType === 'GST' && (
                        <>
                          <Descriptions.Item label="GSTIN"><Text fontFamily="monospace">{q.gstNumber || '—'}</Text></Descriptions.Item>
                          <Descriptions.Item label="GST Rate"><Text style={{ color: '#B11E6A', margin: 0 }}>{q.gstPercent ? `${q.gstPercent}%` : '—'}</Text></Descriptions.Item>
                        </>
                      )}
                      {qAltName && <Descriptions.Item label="Alt. Contact">{qAltName}{qAltRole ? ` (${qAltRole})` : ''}</Descriptions.Item>}
                      {qAltPhone && <Descriptions.Item label="Alt. Phone"><a href={`tel:${qAltPhone}`}>{qAltPhone}</a></Descriptions.Item>}
                    </Descriptions>
                  );
                })()}
              </Card>

              {/* Products adding — kit config summary */}
              {(() => {
                const qLeadIdPA = String(q.leadId?._id || q.leadId || '');
                const qLeadPA = qLeadIdPA ? leadsData.find(l => String(l.key) === qLeadIdPA || String(l._id) === qLeadIdPA) : null;
                const qProdType = q.productType || qLeadPA?.productType;
                const qSelKitsPA = (Array.isArray(q.selectedKits) && q.selectedKits.length > 0 ? q.selectedKits : null)
                  || (Array.isArray(qLeadPA?.selectedKits) && qLeadPA.selectedKits.length > 0 ? qLeadPA.selectedKits : null)
                  || (q.selectedKit ? [q.selectedKit] : (qLeadPA?.selectedKit ? [qLeadPA.selectedKit] : []));
                const qKitDUPA = q.kitDisplayUnit || q.displayUnit || qLeadPA?.kitDisplayUnit || qLeadPA?.displayUnit;
                const qKitNamePA = qSelKitsPA.length > 0 ? qSelKitsPA.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ') : null;
                const qKitPrice = q.kitPrice || qLeadPA?.kitPrice;
                const qKitQty = q.kitOverallQty || qLeadPA?.kitOverallQty;
                const qKitSize = q.kitSize || qLeadPA?.kitSize;
                const qKitSticker = q.kitSticker || qLeadPA?.kitSticker;
                const qKitLogo = q.kitLogo || qLeadPA?.kitLogo;
                const qKitPrinting = q.kitPrinting || qLeadPA?.kitPrinting;
                const qKitBoxType = q.kitDisplayUnitType || (Array.isArray(q.kitOrders) && q.kitOrders[0]?.displayUnitType) || qLeadPA?.kitDisplayUnitType;
                const qKitLamination = q.kitLamination || (Array.isArray(q.kitOrders) && q.kitOrders[0]?.lamination) || qLeadPA?.kitLamination;
                if (!qProdType && qSelKitsPA.length === 0 && !qKitDUPA && !qKitPrice) return null;
                const normYN = v => (v === 'YES' || v === true ? 'Yes' : v === 'NO' || v === false ? 'No' : v || '—');
                return (
                  <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span>Products adding</span></Space>}>
                    <Row gutter={[12, 8]}>
                      {qProdType && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Product Selection</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>
                            {Array.isArray(qProdType) ? qProdType.map(productTypeLabel).join(', ') : productTypeLabel(qProdType)}
                          </Text>
                        </Col>
                      )}
                      {qKitNamePA && <Col xs={24} sm={12}><Text type="secondary" style={{ fontSize: 11 }}>Kit Selected</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{qKitNamePA}</Text></Col>}
                      {qKitDUPA && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Display Unit</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{(qKitDUPA || '').replace(/_/g, ' ')}</Text></Col>}
                      {qKitBoxType && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>{(configDisplayUnitOptions.find(c => c.value === qKitDUPA)?.label || 'Display Unit')} Type</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{qKitBoxType}</Text></Col>}
                      {qKitSize && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Kit Size</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{qKitSize}</Text></Col>}
                      {qKitSticker && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Sticker</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(qKitSticker)}</Text></Col>}
                      {qKitLogo && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Logo</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(qKitLogo)}</Text></Col>}
                      {qKitPrinting && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Printing</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(qKitPrinting)}</Text></Col>}
                      {qKitLamination && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Lamination</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(qKitLamination)}</Text></Col>}
                      {(qKitPrice != null && qKitPrice !== '') && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Packing Material Price (single)</Text><Text strong style={{ fontSize: 13, display: 'block', color: '#722ed1' }}>₹{Number(qKitPrice).toLocaleString()}</Text></Col>}
                      {Number(qKitQty) > 0 && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Overall Qty</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{qKitQty} kit{Number(qKitQty) > 1 ? 's' : ''}</Text></Col>}
                      {(qKitPrice != null && qKitPrice !== '' && Number(qKitQty) > 0) && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Kit Amount</Text><Text strong style={{ fontSize: 13, display: 'block', color: '#B11E6A' }}>₹{(Number(qKitPrice) * Number(qKitQty)).toLocaleString()}</Text></Col>}
                    </Row>
                  </Card>
                );
              })()}

              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Order Details — Products</span></Space>}>
                {(() => {
                  const qLeadId = String(q.leadId?._id || q.leadId || '');
                  const qLead = qLeadId ? leadsData.find(l => String(l.key) === qLeadId || String(l._id) === qLeadId) : null;
                  const qSelKits = (Array.isArray(q.selectedKits) && q.selectedKits.length > 0 ? q.selectedKits : null)
                    || (Array.isArray(qLead?.selectedKits) && qLead.selectedKits.length > 0 ? qLead.selectedKits : null)
                    || (q.selectedKit ? [q.selectedKit] : (qLead?.selectedKit ? [qLead.selectedKit] : []));
                  const qKitOrders = (Array.isArray(q.kitOrders) && q.kitOrders.length > 0 ? q.kitOrders : null)
                    || (Array.isArray(qLead?.kitOrders) && qLead.kitOrders.length > 0 ? qLead.kitOrders : null) || [];
                  const qKitDU = q.kitDisplayUnit || q.displayUnit || qLead?.kitDisplayUnit || qLead?.displayUnit;
                  const qKitName = qSelKits.length > 0 ? qSelKits.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ') : null;
                  return (
                    <DetailProductCards
                      products={q.products}
                      totalAmount={q.totalAmount}
                      kitDisplayUnit={qKitDU}
                      kitSize={q.kitSize || qLead?.kitSize}
                      kitName={qKitName}
                      selectedKits={qSelKits}
                      kitOrders={qKitOrders}
                      kitSticker={q.kitSticker || qLead?.kitSticker}
                      kitLogo={q.kitLogo || qLead?.kitLogo}
                      kitPrinting={q.kitPrinting || qLead?.kitPrinting}
                      kitOverallQty={q.kitOverallQty || qLead?.kitOverallQty}
                      kitPrice={q.kitPrice || qLead?.kitPrice}
                      forwardingCharge={q.forwardingCharge}
                      forwardingChargeAmount={q.forwardingChargeAmount}
                      packagingIncludes={q.packagingIncludes?.length ? q.packagingIncludes : (qLead?.packagingIncludes || [])}
                      packagingIncludesQty={Object.keys(q.packagingIncludesQty||{}).length ? q.packagingIncludesQty : (qLead?.packagingIncludesQty || {})}
                    />
                  );
                })()}
              </Card>

              {/* Urgent / Emergency Deliveries (Partial) — from linked lead */}
              {(() => {
                const qLeadId = String(q.leadId?._id || q.leadId || '');
                const qLead = qLeadId ? leadsData.find(l => String(l.key) === qLeadId || String(l._id) === qLeadId) : null;
                const qSplitDates = (q.splitDates?.length ? q.splitDates : null) || (qLead?.splitDates?.length ? qLead.splitDates : null) || [];
                if (!qSplitDates.length) return null;
                return (
                  <Card
                    style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,77,79,0.3)', boxShadow: '0 2px 12px rgba(255,77,79,0.08)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><AlertFilled style={{ color: '#ff4d4f' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f', fontWeight: 700 }}>Urgent / Emergency Deliveries (Partial)</span></Space>}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {qSplitDates.map((sd, i) => {
                        const productList = (sd.products && sd.products.length > 0)
                          ? sd.products
                          : sd.product ? [{ product: sd.product, qty: sd.qty, notes: sd.note }] : [];
                        return (
                          <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                              <CalendarOutlined style={{ marginRight: 6 }} />
                              {sd.date ? dayjs(sd.date).format('DD MMM YYYY') : '—'}
                            </Text>
                            {productList.length > 0 ? productList.map((p, pi) => (
                              <Row key={pi} gutter={[16, 4]} style={{ marginBottom: pi < productList.length - 1 ? 8 : 0 }}>
                                <Col xs={24} sm={8}><Text type="secondary" style={{ fontSize: 11 }}>Product: </Text><Text strong style={{ fontSize: 13 }}>{p.product || '—'}</Text></Col>
                                <Col xs={24} sm={4}><Text type="secondary" style={{ fontSize: 11 }}>Qty: </Text><Text strong style={{ fontSize: 13 }}>{p.qty || '—'}</Text></Col>
                                <Col xs={24} sm={12}><Text type="secondary" style={{ fontSize: 11 }}>Notes: </Text><Text style={{ fontSize: 13 }}>{p.notes || p.note || '—'}</Text></Col>
                              </Row>
                            )) : <Text type="secondary" style={{ fontSize: 12 }}>No products specified for this date.</Text>}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })()}

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                {(() => {
                  const qLeadId = String(q.leadId?._id || q.leadId || '');
                  const qLead = qLeadId ? leadsData.find(l => String(l.key) === qLeadId || String(l._id) === qLeadId) : null;
                  const qKitOrders = (Array.isArray(q.kitOrders) && q.kitOrders.length > 0 ? q.kitOrders : null)
                    || (Array.isArray(qLead?.kitOrders) && qLead.kitOrders.length > 0 ? qLead.kitOrders : null) || [];
                  const qEnriched = {
                    ...q,
                    kitOrders: qKitOrders,
                    kitPrice: q.kitPrice || qLead?.kitPrice,
                    kitOverallQty: q.kitOverallQty || qLead?.kitOverallQty,
                  };
                  return <DetailDeliveryPayment rec={qEnriched} grandTotal={computeCompositionGrandTotal(qEnriched, kits) || computeRecordGrandTotal(qEnriched)} />;
                })()}
                {(() => {
                  const qLeadForColl = qLeadId ? leadsData.find(l => String(l._id || l.key) === qLeadId) : null;
                  const qQuotColl = q.paymentCollection || [];
                  const qLeadColl = (qLeadForColl?.paymentCollection || []).filter(le =>
                    !qQuotColl.some(qe => qe.recordedAt === le.recordedAt && Number(qe.paidAmount) === Number(le.paidAmount))
                  );
                  const qCombinedColl = [...qQuotColl, ...qLeadColl.map(e => ({ ...e, _fromLead: true }))];
                  if (!qCombinedColl.length) return null;
                  return (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
                        PAYMENT COLLECTION ({qCombinedColl.length} entr{qCombinedColl.length > 1 ? 'ies' : 'y'})
                      </Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {qCombinedColl.map((entry, idx) => (
                          <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div>
                                <Space size={8}>
                                  <DollarOutlined style={{ color: '#B11E6A', fontSize: 13 }} />
                                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                  {entry._fromLead && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="blue">From Lead</Tag>}
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 11 }}>{entry.notes}</Text>}
                                </Space>
                                <div style={{ paddingLeft: 21, marginTop: 3 }}>
                                  {entry.paymentDate && <Text type="secondary" style={{ fontSize: 11 }}>Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}</Text>}
                                  {entry.recordedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>· Recorded {dayjs(entry.recordedAt).format('DD MMM YYYY')}</Text>}
                                </div>
                              </div>
                              <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                            </div>
                            {entry.proof?.url && (
                              <div style={{ marginTop: 5, paddingLeft: 21 }}>
                                <a href={entry.proof.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <FileTextOutlined />{entry.proof.name || 'View Proof'} ↗
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ padding: '6px 10px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{(qCombinedColl.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}</Text>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ marginTop: 12 }}>
                  <Button icon={<PlusOutlined />} size="small" style={{ color: '#B11E6A', borderColor: '#B11E6A55', borderRadius: 8 }} onClick={() => openPayEntry('quotation', qEnriched)}>
                    Add Payment Entry
                  </Button>
                </div>
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

              {/* GST API Details */}
              {q.gstNumber && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <BankOutlined style={{ color: '#722ed1' }} />
                      <span>GST API Details</span>
                      {!gstApiLoading && (
                        <Button size="small" type="text" icon={<HistoryOutlined />} style={{ color: '#722ed1' }} onClick={() => fetchGstDetails(q.gstNumber)}>Refresh</Button>
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
                        <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{q.gstNumber}</Text>
                      </div>
                    </div>
                  )}
                  {gstApiData && !gstApiLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'GSTIN', value: gstApiData.gstin || q.gstNumber, mono: true },
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
                      {gstApiData.address && typeof gstApiData.address === 'object' && (
                        <div style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Registered Address</Text>
                          <Text style={{ fontSize: 12, lineHeight: 1.6, color: textColor }}>
                            {[
                              gstApiData.address.bnm  || gstApiData.address.building,
                              gstApiData.address.bno  || gstApiData.address.door,
                              gstApiData.address.flno || gstApiData.address.floor,
                              gstApiData.address.st   || gstApiData.address.street,
                              gstApiData.address.loc  || gstApiData.address.location,
                              gstApiData.address.dst  || gstApiData.address.district,
                              gstApiData.address.stcd || gstApiData.address.state,
                              gstApiData.address.pncd || gstApiData.address.pincode,
                            ].filter(Boolean).join(', ')}
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                  {!gstApiData && !gstApiLoading && !gstApiError && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>GST details load automatically.<br />Click Refresh to reload.</Text>
                    </div>
                  )}
                </Card>
              )}
            </Col>
          </Row>
        </motion.div>
        {renderPayEntryModal()}
        </>
      );
    }

    // ── Negotiation detail ─────────────────────────────────────────
    if (viewMode === 'negotiation-detail') {
      const n = selectedRecord || {};
      const nLeadId = String(n.leadId?._id || n.leadId || '');
      const nLead = nLeadId ? leadsData.find(l => String(l.key) === nLeadId || String(l._id) === nLeadId) : null;
      const nKitOrders = (Array.isArray(n.kitOrders) && n.kitOrders.length > 0 ? n.kitOrders : null)
        || (Array.isArray(nLead?.kitOrders) && nLead.kitOrders.length > 0 ? nLead.kitOrders : null) || [];
      const nEnriched = {
        ...n,
        kitOrders: nKitOrders,
        kitPrice: n.kitPrice || nLead?.kitPrice,
        kitOverallQty: n.kitOverallQty || nLead?.kitOverallQty,
        paidAmount: computeChainPaid(n),
      };
      const NEG_STEPS = [
        { title: 'Initial', description: 'Quotation reviewed' },
        { title: 'Counter Offer', description: 'Terms proposed' },
        { title: 'Final Terms', description: 'Near agreement' },
        { title: 'Approved', description: 'Deal closed' },
      ];
      return (
        <>
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { setViewMode('table'); setActiveTab('quotations'); }} style={{ borderRadius: 8 }}>Back to Quotations & Negotiations</Button>
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => editNegotiation(n)} style={{ borderRadius: 8, background: '#fa8c16', color: '#fff', border: 'none' }}>Submit Counter Offer</Button>
              <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }} onClick={() => handleDownloadDirect(n, `negotiation-${n.nid || 'doc'}.html`)}>Download Quotation</Button>
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

              {/* Customer Information */}
              {(() => {
                const nLeadIdCI = String(n.leadId?._id || n.leadId || '');
                const nLeadCI = nLeadIdCI ? leadsData.find(l => String(l.key) === nLeadIdCI || String(l._id) === nLeadIdCI) : null;
                const nEmail = n.email || nLeadCI?.email;
                const nAltName = n.alternativeName || nLeadCI?.altName || nLeadCI?.alternativeName;
                const nAltRole = n.alternativeRole || nLeadCI?.altRole || nLeadCI?.alternativeRole;
                const nAltPhone = n.alternativePhone || nLeadCI?.altNumber || nLeadCI?.alternativePhone;
                const nDest = n.destination || nLeadCI?.destination;
                return (
                  <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#1e3799', borderRadius: 2, display: 'inline-block' }} /><BankOutlined style={{ color: '#1e3799' }} /><span>Customer Information</span></Space>}>
                    <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 2 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }}>
                      <Descriptions.Item label="Hotel / Company">{n.hotelName}</Descriptions.Item>
                      <Descriptions.Item label="Billing Name">{n.billingName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Location">{n.location}</Descriptions.Item>
                      <Descriptions.Item label="Contact Person">{n.contactPerson || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Phone"><a href={`tel:${n.phone}`}>{n.phone || '—'}</a></Descriptions.Item>
                      {nEmail && <Descriptions.Item label="Email"><a href={`mailto:${nEmail}`}>{nEmail}</a></Descriptions.Item>}
                      <Descriptions.Item label="Assigned To">{n.salesPerson}</Descriptions.Item>
                      {nDest && <Descriptions.Item label="Destination">{nDest}</Descriptions.Item>}
                      {(n.city || n.state || n.pincode) && (
                        <Descriptions.Item label="City / State / Pincode" span={2}>
                          {[n.city, n.state, n.pincode].filter(Boolean).join(', ')}
                        </Descriptions.Item>
                      )}
                      {n.detailedAddress && <Descriptions.Item label="Detailed Address" span={2}>{n.detailedAddress}</Descriptions.Item>}
                      {n.billType === 'GST' && (
                        <>
                          <Descriptions.Item label="GSTIN"><Text fontFamily="monospace">{n.gstNumber || '—'}</Text></Descriptions.Item>
                          <Descriptions.Item label="GST Rate"><Text style={{ color: '#B11E6A', margin: 0 }}>{n.gstPercent ? `${n.gstPercent}%` : '—'}</Text></Descriptions.Item>
                        </>
                      )}
                      {nAltName && <Descriptions.Item label="Alt. Contact">{nAltName}{nAltRole ? ` (${nAltRole})` : ''}</Descriptions.Item>}
                      {nAltPhone && <Descriptions.Item label="Alt. Phone"><a href={`tel:${nAltPhone}`}>{nAltPhone}</a></Descriptions.Item>}
                    </Descriptions>
                  </Card>
                );
              })()}

              {/* Products adding — kit config summary */}
              {(() => {
                const nLeadIdPA = String(n.leadId?._id || n.leadId || '');
                const nLeadPA = nLeadIdPA ? leadsData.find(l => String(l.key) === nLeadIdPA || String(l._id) === nLeadIdPA) : null;
                const nProdType = n.productType || nLeadPA?.productType;
                const nSelKitsPA = (Array.isArray(n.selectedKits) && n.selectedKits.length > 0 ? n.selectedKits : null)
                  || (Array.isArray(nLeadPA?.selectedKits) && nLeadPA.selectedKits.length > 0 ? nLeadPA.selectedKits : null)
                  || (n.selectedKit ? [n.selectedKit] : (nLeadPA?.selectedKit ? [nLeadPA.selectedKit] : []));
                const nKitDUPA = n.kitDisplayUnit || n.displayUnit || nLeadPA?.kitDisplayUnit || nLeadPA?.displayUnit;
                const nKitNamePA = nSelKitsPA.length > 0 ? nSelKitsPA.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ') : null;
                const nKitPrice = n.kitPrice || nLeadPA?.kitPrice;
                const nKitQty = n.kitOverallQty || nLeadPA?.kitOverallQty;
                const nKitSize = n.kitSize || nLeadPA?.kitSize;
                const nKitSticker = n.kitSticker || nLeadPA?.kitSticker;
                const nKitLogo = n.kitLogo || nLeadPA?.kitLogo;
                const nKitPrinting = n.kitPrinting || nLeadPA?.kitPrinting;
                const nKitBoxType = n.kitDisplayUnitType || (Array.isArray(n.kitOrders) && n.kitOrders[0]?.displayUnitType) || nLeadPA?.kitDisplayUnitType;
                const nKitLamination = n.kitLamination || (Array.isArray(n.kitOrders) && n.kitOrders[0]?.lamination) || nLeadPA?.kitLamination;
                if (!nProdType && nSelKitsPA.length === 0 && !nKitDUPA && !nKitPrice) return null;
                const normYN = v => (v === 'YES' || v === true ? 'Yes' : v === 'NO' || v === false ? 'No' : v || '—');
                return (
                  <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span>Products adding</span></Space>}>
                    <Row gutter={[12, 8]}>
                      {nProdType && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Product Selection</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>
                            {Array.isArray(nProdType) ? nProdType.map(productTypeLabel).join(', ') : productTypeLabel(nProdType)}
                          </Text>
                        </Col>
                      )}
                      {nKitNamePA && <Col xs={24} sm={12}><Text type="secondary" style={{ fontSize: 11 }}>Kit Selected</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{nKitNamePA}</Text></Col>}
                      {nKitDUPA && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Display Unit</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{(nKitDUPA || '').replace(/_/g, ' ')}</Text></Col>}
                      {nKitBoxType && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>{(configDisplayUnitOptions.find(c => c.value === nKitDUPA)?.label || 'Display Unit')} Type</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{nKitBoxType}</Text></Col>}
                      {nKitSize && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Kit Size</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{nKitSize}</Text></Col>}
                      {nKitSticker && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Sticker</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(nKitSticker)}</Text></Col>}
                      {nKitLogo && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Logo</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(nKitLogo)}</Text></Col>}
                      {nKitPrinting && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Printing</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(nKitPrinting)}</Text></Col>}
                      {nKitLamination && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Lamination</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{normYN(nKitLamination)}</Text></Col>}
                      {(nKitPrice != null && nKitPrice !== '') && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Packing Material Price (single)</Text><Text strong style={{ fontSize: 13, display: 'block', color: '#722ed1' }}>₹{Number(nKitPrice).toLocaleString()}</Text></Col>}
                      {Number(nKitQty) > 0 && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Overall Qty</Text><Text strong style={{ fontSize: 13, display: 'block' }}>{nKitQty} kit{Number(nKitQty) > 1 ? 's' : ''}</Text></Col>}
                      {(nKitPrice != null && nKitPrice !== '' && Number(nKitQty) > 0) && <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Kit Amount</Text><Text strong style={{ fontSize: 13, display: 'block', color: '#B11E6A' }}>₹{(Number(nKitPrice) * Number(nKitQty)).toLocaleString()}</Text></Col>}
                    </Row>
                  </Card>
                );
              })()}

              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Agreed Products & Rates</span></Space>}>
                {(() => {
                  const nLeadId = String(n.leadId?._id || n.leadId || '');
                  const nLead = nLeadId ? leadsData.find(l => String(l.key) === nLeadId || String(l._id) === nLeadId) : null;
                  const nSelKits = (Array.isArray(n.selectedKits) && n.selectedKits.length > 0 ? n.selectedKits : null)
                    || (Array.isArray(nLead?.selectedKits) && nLead.selectedKits.length > 0 ? nLead.selectedKits : null)
                    || (n.selectedKit ? [n.selectedKit] : (nLead?.selectedKit ? [nLead.selectedKit] : []));
                  const nKitOrders = (Array.isArray(n.kitOrders) && n.kitOrders.length > 0 ? n.kitOrders : null)
                    || (Array.isArray(nLead?.kitOrders) && nLead.kitOrders.length > 0 ? nLead.kitOrders : null) || [];
                  const nKitDU = n.kitDisplayUnit || n.displayUnit || nLead?.kitDisplayUnit || nLead?.displayUnit;
                  const nKitName = nSelKits.length > 0 ? nSelKits.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ') : null;
                  return (
                    <DetailProductCards
                      products={n.products}
                      totalAmount={n.totalAmount}
                      kitDisplayUnit={nKitDU}
                      kitSize={n.kitSize || nLead?.kitSize}
                      kitName={nKitName}
                      selectedKits={nSelKits}
                      kitOrders={nKitOrders}
                      kitSticker={n.kitSticker || nLead?.kitSticker}
                      kitLogo={n.kitLogo || nLead?.kitLogo}
                      kitPrinting={n.kitPrinting || nLead?.kitPrinting}
                      kitOverallQty={n.kitOverallQty || nLead?.kitOverallQty}
                      kitPrice={n.kitPrice || nLead?.kitPrice}
                      forwardingCharge={n.forwardingCharge}
                      forwardingChargeAmount={n.forwardingChargeAmount}
                      packagingIncludes={n.packagingIncludes?.length ? n.packagingIncludes : (nLead?.packagingIncludes || [])}
                      packagingIncludesQty={Object.keys(n.packagingIncludesQty||{}).length ? n.packagingIncludesQty : (nLead?.packagingIncludesQty || {})}
                    />
                  );
                })()}
              </Card>

              {/* Urgent / Emergency Deliveries (Partial) — from linked lead */}
              {(() => {
                const nLeadId = String(n.leadId?._id || n.leadId || '');
                const nLead = nLeadId ? leadsData.find(l => String(l.key) === nLeadId || String(l._id) === nLeadId) : null;
                const nSplitDates = (n.splitDates?.length ? n.splitDates : null) || (nLead?.splitDates?.length ? nLead.splitDates : null) || [];
                if (!nSplitDates.length) return null;
                return (
                  <Card
                    style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,77,79,0.3)', boxShadow: '0 2px 12px rgba(255,77,79,0.08)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><AlertFilled style={{ color: '#ff4d4f' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f', fontWeight: 700 }}>Urgent / Emergency Deliveries (Partial)</span></Space>}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {nSplitDates.map((sd, i) => {
                        const productList = (sd.products && sd.products.length > 0)
                          ? sd.products
                          : sd.product ? [{ product: sd.product, qty: sd.qty, notes: sd.note }] : [];
                        return (
                          <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                              <CalendarOutlined style={{ marginRight: 6 }} />
                              {sd.date ? dayjs(sd.date).format('DD MMM YYYY') : '—'}
                            </Text>
                            {productList.length > 0 ? productList.map((p, pi) => (
                              <Row key={pi} gutter={[16, 4]} style={{ marginBottom: pi < productList.length - 1 ? 8 : 0 }}>
                                <Col xs={24} sm={8}><Text type="secondary" style={{ fontSize: 11 }}>Product: </Text><Text strong style={{ fontSize: 13 }}>{p.product || '—'}</Text></Col>
                                <Col xs={24} sm={4}><Text type="secondary" style={{ fontSize: 11 }}>Qty: </Text><Text strong style={{ fontSize: 13 }}>{p.qty || '—'}</Text></Col>
                                <Col xs={24} sm={12}><Text type="secondary" style={{ fontSize: 11 }}>Notes: </Text><Text style={{ fontSize: 13 }}>{p.notes || p.note || '—'}</Text></Col>
                              </Row>
                            )) : <Text type="secondary" style={{ fontSize: 12 }}>No products specified for this date.</Text>}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })()}

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                {(() => {
                  const nLeadId = String(n.leadId?._id || n.leadId || '');
                  const nLead = nLeadId ? leadsData.find(l => String(l.key) === nLeadId || String(l._id) === nLeadId) : null;
                  const nKitOrders = (Array.isArray(n.kitOrders) && n.kitOrders.length > 0 ? n.kitOrders : null)
                    || (Array.isArray(nLead?.kitOrders) && nLead.kitOrders.length > 0 ? nLead.kitOrders : null) || [];
                  const nEnriched = {
                    ...n,
                    kitOrders: nKitOrders,
                    kitPrice: n.kitPrice || nLead?.kitPrice,
                    kitOverallQty: n.kitOverallQty || nLead?.kitOverallQty,
                  };
                  return <DetailDeliveryPayment rec={nEnriched} grandTotal={computeCompositionGrandTotal(nEnriched, kits) || computeRecordGrandTotal(nEnriched)} />;
                })()}
                {(() => {
                  const nLeadForColl = nLeadId ? leadsData.find(l => String(l._id || l.key) === nLeadId) : null;
                  const nQuotId = String(n.quotationId?._id || n.quotationId || '');
                  const nQuotForColl = nQuotId ? quotationsData.find(q => String(q._id || q.key) === nQuotId) : null;
                  const nNegColl = n.paymentCollection || [];
                  const linkedEntries = [
                    ...(nLeadForColl?.paymentCollection || []),
                    ...(nQuotForColl?.paymentCollection || []),
                  ].filter(le =>
                    !nNegColl.some(ne => ne.recordedAt === le.recordedAt && Number(ne.paidAmount) === Number(le.paidAmount))
                  );
                  const nCombinedColl = [...nNegColl, ...linkedEntries.map(e => ({ ...e, _fromLinked: true }))];
                  if (!nCombinedColl.length) return null;
                  return (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
                        PAYMENT COLLECTION ({nCombinedColl.length} entr{nCombinedColl.length > 1 ? 'ies' : 'y'})
                      </Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {nCombinedColl.map((entry, idx) => (
                          <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div>
                                <Space size={8}>
                                  <DollarOutlined style={{ color: '#B11E6A', fontSize: 13 }} />
                                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                  {entry._fromLinked && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="blue">From Lead/Quotation</Tag>}
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 11 }}>{entry.notes}</Text>}
                                </Space>
                                <div style={{ paddingLeft: 21, marginTop: 3 }}>
                                  {entry.paymentDate && <Text type="secondary" style={{ fontSize: 11 }}>Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}</Text>}
                                  {entry.recordedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>· Recorded {dayjs(entry.recordedAt).format('DD MMM YYYY')}</Text>}
                                </div>
                              </div>
                              <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                            </div>
                            {entry.proof?.url && (
                              <div style={{ marginTop: 5, paddingLeft: 21 }}>
                                <a href={entry.proof.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <FileTextOutlined />{entry.proof.name || 'View Proof'} ↗
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ padding: '6px 10px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{(nCombinedColl.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}</Text>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ marginTop: 12 }}>
                  <Button icon={<PlusOutlined />} size="small" style={{ color: '#B11E6A', borderColor: '#B11E6A55', borderRadius: 8 }} onClick={() => openPayEntry('negotiation', nEnriched)}>
                    Add Payment Entry
                  </Button>
                </div>
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

              {/* GST API Details */}
              {n.gstNumber && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <BankOutlined style={{ color: '#722ed1' }} />
                      <span>GST API Details</span>
                      {!gstApiLoading && (
                        <Button size="small" type="text" icon={<HistoryOutlined />} style={{ color: '#722ed1' }} onClick={() => fetchGstDetails(n.gstNumber)}>Refresh</Button>
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
                        <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{n.gstNumber}</Text>
                      </div>
                    </div>
                  )}
                  {gstApiData && !gstApiLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'GSTIN', value: gstApiData.gstin || n.gstNumber, mono: true },
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
                      {gstApiData.address && typeof gstApiData.address === 'object' && (
                        <div style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Registered Address</Text>
                          <Text style={{ fontSize: 12, lineHeight: 1.6, color: textColor }}>
                            {[
                              gstApiData.address.bnm  || gstApiData.address.building,
                              gstApiData.address.bno  || gstApiData.address.door,
                              gstApiData.address.flno || gstApiData.address.floor,
                              gstApiData.address.st   || gstApiData.address.street,
                              gstApiData.address.loc  || gstApiData.address.location,
                              gstApiData.address.dst  || gstApiData.address.district,
                              gstApiData.address.stcd || gstApiData.address.state,
                              gstApiData.address.pncd || gstApiData.address.pincode,
                            ].filter(Boolean).join(', ')}
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                  {!gstApiData && !gstApiLoading && !gstApiError && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>GST details load automatically.<br />Click Refresh to reload.</Text>
                    </div>
                  )}
                </Card>
              )}
            </Col>
          </Row>
        </motion.div>
        {renderPayEntryModal()}
        </>
      );
    }

    // ── Order detail ───────────────────────────────────────────────
    if (viewMode === 'order-detail') {
      const base = selectedRecord || {};
      const full = singleOrderRaw?.data || {};
      // Merge list record with populated single-order fetch
      const lead = full.leadId || {};
      // Look up lead in leadsData for emergency fallback (covers old orders that predate
      // the fix that stores splitDates directly on the Order document)
      const orderLeadId = String(lead._id || base.leadId || '');
      const orderLeadFull = orderLeadId ? leadsData.find(l => String(l.key) === orderLeadId || String(l._id) === orderLeadId) : null;
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
        // Expected delivery: prefer the order's own date, else fall back to the tentative
        // delivery date carried from the originating quotation/lead.
        expectedDelivery: base.expectedDelivery
          || (full.expectedDeliveryDate ? String(full.expectedDeliveryDate).slice(0, 10) : null)
          || (full.orderDeliveryDate ? String(full.orderDeliveryDate).slice(0, 10) : null)
          || (lead.orderDeliveryDate ? String(lead.orderDeliveryDate).slice(0, 10) : null),
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
        // Kit display fields — prefer order-level, then populated lead (fallback for orders
        // created before these fields were copied to the Order document)
        hotelName: base.hotelName || full.hotelName || lead.hotelName || base.clientName || full.clientName || '',
        kitDisplayUnit: base.kitDisplayUnit || base.displayUnit || full.kitDisplayUnit || full.displayUnit || lead.kitDisplayUnit || lead.displayUnit || '',
        kitSize: base.kitSize || full.kitSize || lead.kitSize || '',
        selectedKit: base.selectedKit || full.selectedKit || lead.selectedKit || '',
        selectedKits: (Array.isArray(base.selectedKits) && base.selectedKits.length > 0 ? base.selectedKits : null)
          || (Array.isArray(full.selectedKits) && full.selectedKits.length > 0 ? full.selectedKits : null)
          || (Array.isArray(lead?.selectedKits) && lead.selectedKits.length > 0 ? lead.selectedKits : null)
          || (base.selectedKit || full.selectedKit || lead?.selectedKit ? [base.selectedKit || full.selectedKit || lead?.selectedKit] : []),
        kitOrders: (Array.isArray(base.kitOrders) && base.kitOrders.length > 0 ? base.kitOrders : null)
          || (Array.isArray(full.kitOrders) && full.kitOrders.length > 0 ? full.kitOrders : null)
          || (Array.isArray(lead?.kitOrders) && lead.kitOrders.length > 0 ? lead.kitOrders : null)
          || [],
        kitSticker: base.kitSticker || full.kitSticker || lead?.kitSticker,
        kitLogo: base.kitLogo || full.kitLogo || lead?.kitLogo,
        kitPrinting: base.kitPrinting || full.kitPrinting || lead?.kitPrinting,
        kitPrice: base.kitPrice ?? full.kitPrice ?? lead?.kitPrice,
        kitOverallQty: base.kitOverallQty ?? full.kitOverallQty ?? lead?.kitOverallQty,
        productType: base.productType || full.productType || lead?.productType,
        // splitDates: order doc first, then populated lead (backend now includes it),
        // then leadsData lookup (fallback for orders created before the fix)
        splitDates: (full.splitDates?.length ? full.splitDates : null)
          || (base.splitDates?.length ? base.splitDates : null)
          || (lead.splitDates?.length ? lead.splitDates : null)
          || (orderLeadFull?.splitDates?.length ? orderLeadFull.splitDates : null)
          || [],
        isEmergency: !!(full.isEmergency || base.isEmergency || lead.isEmergency || orderLeadFull?.isEmergency || orderLeadFull?.splitDates?.length),
        isUrgent: !!(full.isUrgent || base.isUrgent || lead.isUrgent || orderLeadFull?.isUrgent || orderLeadFull?.splitDates?.length),
        email: base.email || full.email || lead.email,
        alternativeName: base.alternativeName || full.alternativeName || lead.alternativeName || lead.altName,
        alternativeRole: base.alternativeRole || full.alternativeRole || lead.alternativeRole || lead.altRole,
        alternativePhone: base.alternativePhone || full.alternativePhone || lead.alternativePhone || lead.altNumber,
        destination: base.destination || full.destination || lead.destination,
        hotelType: base.hotelType || full.hotelType || lead.hotelType,
        rooms: base.rooms || full.rooms || lead.rooms || lead.numRooms || lead.rowsInHotel,
        occupancy: base.occupancy || full.occupancy || lead.occupancy || lead.generalOccupancy,
        branch: base.branch || full.branch || lead.branch || '',
        pocDesignation: base.pocDesignation || full.pocDesignation || lead.pocDesignation || '',
        // packagingIncludes: order first, then populated lead (covers hotel-only→kit-edit scenario)
        packagingIncludes: (Array.isArray(base.packagingIncludes) && base.packagingIncludes.length > 0 ? base.packagingIncludes : null)
          ?? (Array.isArray(full.packagingIncludes) && full.packagingIncludes.length > 0 ? full.packagingIncludes : null)
          ?? (Array.isArray(lead?.packagingIncludes) && lead.packagingIncludes.length > 0 ? lead.packagingIncludes : null)
          ?? (Array.isArray(orderLeadFull?.packagingIncludes) && orderLeadFull.packagingIncludes.length > 0 ? orderLeadFull.packagingIncludes : null)
          ?? [],
        packagingIncludesQty: (Object.keys(base.packagingIncludesQty || {}).length > 0 ? base.packagingIncludesQty : null)
          ?? (Object.keys(full.packagingIncludesQty || {}).length > 0 ? full.packagingIncludesQty : null)
          ?? (Object.keys(lead?.packagingIncludesQty || {}).length > 0 ? lead.packagingIncludesQty : null)
          ?? (Object.keys(orderLeadFull?.packagingIncludesQty || {}).length > 0 ? orderLeadFull.packagingIncludesQty : null)
          ?? {},
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
      const oSubtotal = r2(calcTotal(o.products));
      const oGstFromProducts = r2(calcGstAmount(o.products));
      // Prefer per-product GST if set; fall back to backend-stored gstAmount (for converted/legacy orders)
      const oBackendGst = Number(full.gstAmount ?? base.gstAmount ?? o.gstAmount) || 0;
      const oGstAmount = oGstFromProducts > 0 ? oGstFromProducts : oBackendGst;
      // Kit-aware grand total (kitPrice × overallQty + separate products + GST + forwarding) so the
      // Payment Summary / To Collect match the product-card total for kit orders.
      const oLeadForTotal = o.leadCode ? leadsData.find(l => l.leadCode === o.leadCode || l.leadId === o.leadCode) : null;
      const oKitOrdersForTotal = (Array.isArray(o.kitOrders) && o.kitOrders.length > 0 ? o.kitOrders : null)
        || (Array.isArray(oLeadForTotal?.kitOrders) && oLeadForTotal.kitOrders.length > 0 ? oLeadForTotal.kitOrders : null) || [];
      const oRecForTotal = {
        ...o,
        kitOrders: oKitOrdersForTotal,
        kitPrice: o.kitPrice || oLeadForTotal?.kitPrice,
        kitOverallQty: o.kitOverallQty || oLeadForTotal?.kitOverallQty,
      };
      const oKitAwareTotal = r2(computeCompositionGrandTotal(oLeadForTotal || oRecForTotal, kits)) || r2(computeRecordGrandTotal(oRecForTotal));
      const oTotal = oKitAwareTotal > 0 ? oKitAwareTotal : (oSubtotal + oGstAmount);
      const oHasKitProducts = (o.products || []).some(p => p && (p.isKit || p.kitType));
      // Enriched rec for CategoryTotalsBreakdown in Payment Summary (uses same data as oKitAwareTotal)
      // Effective paidAmount = max of order's own, linked lead's, and order's collection sum
      // so savePayEntry('order', ...) computes extraAdvance correctly even when the order
      // document hasn't had the lead advance propagated to it yet.
      const oEffectivePaidAmount = Math.max(
        Number(o.paidAmount || 0),
        Number(oLeadForTotal?.paidAmount || 0),
        (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0)
      );
      const oEnrichedForBreakdown = oLeadForTotal ? {
        ...oLeadForTotal,
        paymentCollection: o.paymentCollection,
        paidAmount: oEffectivePaidAmount,
        forwardingCharge: o.forwardingCharge ?? oLeadForTotal.forwardingCharge,
        forwardingChargeAmount: o.forwardingChargeAmount ?? oLeadForTotal.forwardingChargeAmount,
        // Must carry the ORDER's own id so savePayEntry('order', ...) hits the right document.
        // oLeadForTotal spreads the lead's _id/key which would cause "Order not found".
        _id: o._id || o.key,
        key: o.key || o._id,
        leadId: o.leadId,
        leadCode: o.leadCode,
      } : { ...oRecForTotal, paidAmount: oEffectivePaidAmount };
      const detailAdvance = Number(full.advancePaidAmount ?? full.advancePaid ?? base.advance ?? 0);
      // Fall back to the linked negotiation's (or quotation's) paid amount if the order has no payment data yet
      const linkedNegForDetail = negotiationsData.find(n => String(n.key) === String(base.negotiationId || full.negotiationId?._id || full.negotiationId));
      const negFallbackPaid = linkedNegForDetail?.paidAmount || 0;
      const linkedQuotForDetail = findLinkedQuotation({
        quotationId: full.quotationId || base.quotationId,
        quotationCode: o.quotationCode || full.quotationId?.quotCode || base.quotationCode,
      });
      const quotFallbackPaid = linkedQuotForDetail?.paidAmount || 0;
      // Merged payment history: order entries + any lead/quotation/negotiation entries not already present.
      // Dedup by recordedAt + paidAmount so carry-overs don't appear twice.
      // Defined BEFORE detailCollectionTotal so the stat cards use the full merged total.
      const combinedPaymentCollection = (() => {
        const orderColl = o.paymentCollection || [];
        const extra = [
          // `lead` (full.leadId, populated directly on the order response) is always present,
          // unlike oLeadForTotal which comes from leadsData — that list excludes Dispatched/
          // Delivered leads, so it goes stale (and silently drops this lead's advance) the
          // moment the order ships. Include both so nothing is lost either way.
          ...(lead?.paymentCollection || []),
          ...(oLeadForTotal?.paymentCollection || []),
          ...(linkedQuotForDetail?.paymentCollection || []),
          ...(linkedNegForDetail?.paymentCollection || []),
        ].filter(le => !orderColl.some(oe =>
          oe.recordedAt === le.recordedAt && Number(oe.paidAmount) === Number(le.paidAmount)
        ));
        // extra itself can contain duplicates when the same entry is carried on more than
        // one linked source (lead + oLeadForTotal often refer to the same lead) — dedup.
        const seen = new Set();
        const dedupedExtra = extra.filter(le => {
          const k = `${le.recordedAt}|${le.paidAmount}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return [...orderColl, ...dedupedExtra.map(e => ({ ...e, _fromLinked: true }))];
      })();
      // Use the fully merged collection so Collected / To Collect stat cards include
      // payments recorded at the lead, quotation, or negotiation stage.
      const detailCollectionTotal = combinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const totalCollected = detailCollectionTotal > 0
        ? detailCollectionTotal
        : (Number(full.paidAmount) || detailAdvance || Number(base.paidAmount) || negFallbackPaid || quotFallbackPaid || 0);
      const toCollect = Math.max(0, oTotal - totalCollected);
      // Final tentative-delivery fallbacks once the linked records are resolved
      const detailExpectedDelivery = o.expectedDelivery
        || (linkedNegForDetail?.orderDeliveryDate ? String(linkedNegForDetail.orderDeliveryDate).slice(0, 10) : null)
        || (linkedQuotForDetail?.orderDeliveryDate ? String(linkedQuotForDetail.orderDeliveryDate).slice(0, 10) : null)
        || null;
      return (
        <>
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={() => { if (isOrderEditing) { setIsOrderEditing(false); orderEditForm.resetFields(); setOrderEditPaymentProofs([]); } else { setViewMode('table'); setActiveTab('orders'); } }} style={{ borderRadius: 8 }}>{isOrderEditing ? 'Cancel' : 'Back to Orders'}</Button>
            {isOrderEditing ? (
              <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)' }} onClick={saveOrderEdit}>Save Changes</Button>
            ) : (
            <Space wrap>
              <Button icon={<WhatsAppOutlined />} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => sendViaWhatsApp(o)}>WhatsApp</Button>
              <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }} onClick={() => handleDownloadQuotation(o)}>Download Quotation</Button>
              <Button icon={<EditOutlined />} style={{ borderRadius: 8, color: '#B11E6A', borderColor: '#B11E6A55' }} onClick={() => openOrderEditModal(o)}>{o.orderCategory !== 'SAMPLE' ? 'Edit Order' : 'Edit Order'}</Button>
              {o.orderCategory !== 'SAMPLE' && (
                <Popconfirm
                  title="Convert to Sample?"
                  description="Creates a new sample order with all products at qty 1. Your original order stays unchanged."
                  onConfirm={() => convertOrderToSample(o)}
                  okText="Create Sample"
                  cancelText="Cancel"
                  okButtonProps={{ style: { background: '#722ed1', borderColor: '#722ed1' } }}
                >
                  <Button icon={<ExperimentOutlined />} style={{ borderRadius: 8, color: '#722ed1', borderColor: '#722ed155' }}>
                    Convert to Sample
                  </Button>
                </Popconfirm>
              )}
              <Button
                icon={<WarningOutlined />}
                style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8 }}
                onClick={() => openComplaintModal(o)}
              >
                Raise Complaint
              </Button>
            </Space>
            )}
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
                  {o.email && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><MailOutlined style={{ color: '#B11E6A' }} /><a href={`mailto:${o.email}`} style={{ color: 'inherit' }}>{o.email}</a></span>}
                  {o.salesPerson && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><TeamOutlined style={{ color: '#B11E6A' }} />{o.salesPerson}</span>}
                  {o.alternativeName && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><UserOutlined style={{ color: '#888' }} />{o.alternativeName}{o.alternativeRole ? ` (${o.alternativeRole})` : ''}</span>}
                  {o.alternativePhone && <span style={{ color: isDark ? '#ccc' : '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}><PhoneOutlined style={{ color: '#888' }} />{o.alternativePhone}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <Space size={6} align="center">
                  {(o.isUrgent || o.isEmergency) && (
                    <Tag color="error" icon={<AlertFilled />} style={{ borderRadius: 20, fontSize: 12, fontWeight: 700, padding: '2px 10px' }}>
                      Emergency Order
                    </Tag>
                  )}
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 12 }}>{o.oid}</Tag>
                </Space>
                <Tag color={STATUS_COLORS[o.status] || 'blue'} style={{ borderRadius: 20, fontSize: 13, padding: '4px 14px', fontWeight: 600, border: 'none' }}>{o.status}</Tag>
                <Space>
                  <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>{o.billType === 'GST' ? 'GST Bill' : 'Non-GST'}</Tag>
                  {detailExpectedDelivery && <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontSize: 12 }}>Delivery: {detailExpectedDelivery}</Tag>}
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
                {oGstAmount > 0 && !oHasKitProducts && (
                  <div style={{ marginTop: 3 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Without GST: ₹{oSubtotal.toLocaleString()}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 10 }}>GST: ₹{oGstAmount.toLocaleString()}</Text>
                  </div>
                )}
              </Card>
            </Col>
            {o.orderCategory !== 'SAMPLE' && <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CheckOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>Collected</Text></div>
                <Text strong style={{ fontSize: 14, color: '#52c41a', display: 'block' }}>₹{totalCollected.toLocaleString()}</Text>
                {o.advance > 0 && o.paidAmount !== o.advance && (
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>Advance: ₹{(o.advance || 0).toLocaleString()}</Text>
                )}
              </Card>
            </Col>}
            {o.orderCategory !== 'SAMPLE' && <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CalendarOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>To Collect</Text></div>
                <Text strong style={{ fontSize: 14, color: toCollect > 0 ? '#fa8c16' : '#52c41a', display: 'block' }}>₹{toCollect.toLocaleString()}</Text>
              </Card>
            </Col>}
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 12, border: `1px solid ${isDark ? '#333' : '#eee'}`, background: isDark ? '#1E1E2E' : '#fafafa' }} styles={{ body: { padding: '12px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span style={{ color: '#888', fontSize: 15 }}><CarOutlined /></span><Text type="secondary" style={{ fontSize: 11 }}>Expected Delivery</Text></div>
                <Text strong style={{ fontSize: 14, color: textColor, display: 'block' }}>{detailExpectedDelivery || '—'}</Text>
              </Card>
            </Col>
          </Row>

          {/* Order Progress Steps */}
          <Card style={{ borderRadius: 14, marginBottom: 20, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }} styles={{ body: { padding: '16px 24px' } }}>
            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 14 }}>ORDER PROGRESS</Text>
            <Steps current={orderCurrentStep} items={ORDER_STEPS} />
          </Card>

          {/* Sticker Design Approval — shows when sticker requests exist for this order */}
          {(() => {
            const orderStickerReqs = (stickerData?.data || []).filter(
              (sr) => sr.orderId?.orderCode === o.oid || String(sr.orderId?._id || sr.orderId) === String(o.key),
            );
            if (orderStickerReqs.length === 0) return null;
            return (
              <Card
                style={{ borderRadius: 14, marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.10)', background: cardBg }}
                styles={{ body: { padding: '16px 20px' } }}
                title={
                  <Space>
                    <div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} />
                    <PrinterOutlined style={{ color: '#B11E6A' }} />
                    <span style={{ fontWeight: 700 }}>Design &amp; Display Unit Approval</span>
                    <Tag color="warning" style={{ borderRadius: 12 }}>{orderStickerReqs.length} item{orderStickerReqs.length > 1 ? 's' : ''}</Tag>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  {orderStickerReqs.map((sr) => (
                    <div
                      key={sr._id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `1px solid ${sr.status === 'Approved' ? 'rgba(82,196,26,0.3)' : 'rgba(177,30,106,0.2)'}`,
                        background: isDark
                          ? 'rgba(255,255,255,0.03)'
                          : sr.status === 'Approved'
                          ? 'rgba(82,196,26,0.03)'
                          : 'rgba(177,30,106,0.03)',
                      }}
                    >
                      <Row align="middle" gutter={[12, 8]}>
                        <Col flex="auto">
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Space wrap size={6}>
                              <Text strong style={{ color: textColor, fontSize: 13 }}>
                                {sr.kitType || sr.product || '—'}
                              </Text>
                              {sr.kitType && sr.product && sr.product !== 'Kit' && (
                                <Text type="secondary" style={{ fontSize: 11 }}>({sr.product})</Text>
                              )}
                              <Tag color={sr.stickerType === 'Box' ? 'green' : sr.stickerType === 'Frosted Ziplock' ? 'orange' : sr.stickerType === 'Display Unit' ? 'purple' : 'blue'} style={{ borderRadius: 10, fontSize: 11 }}>
                                {sr.stickerType}
                              </Tag>
                              {/* Composition category so a Personalized Kit and a Separate Kit in the
                                  same packaging tab are told apart (each keeps its own approval). */}
                              {(sr.category === 'personalized' || sr.category === 'separate_kit') && (
                                <Tag color={sr.category === 'personalized' ? 'purple' : 'cyan'} style={{ borderRadius: 10, fontSize: 11 }}>
                                  {sr.category === 'personalized' ? 'Personalized Kit' : 'Separate Kit'}
                                </Tag>
                              )}
                              <Tag color={
                                sr.status === 'Approved' ? 'success' :
                                sr.status === 'Waiting for Approval' ? 'warning' :
                                sr.status === 'In Process' || sr.status === 'Printing' ? 'processing' : 'default'
                              } style={{ borderRadius: 10, fontSize: 11 }}>
                                {sr.status}
                              </Tag>
                            </Space>
                            {/* Kit products list — shown for kit-level SRs */}
                            {sr.kitProducts?.length > 0 && (
                              <Space wrap size={3}>
                                <Text type="secondary" style={{ fontSize: 10 }}>Includes:</Text>
                                {sr.kitProducts.map((p, i) => (
                                  <Tag key={i} color="geekblue" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{p}</Tag>
                                ))}
                              </Space>
                            )}
                          </Space>
                        </Col>
                        <Col>
                          <Space wrap size={6}>
                            {/* Design file view */}
                            {sr.designFileUrl ? (
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => window.open(sr.designFileUrl, '_blank')}
                              >
                                View Design
                              </Button>
                            ) : (
                              <Tag color="default" style={{ fontSize: 11 }}>No design yet</Tag>
                            )}

                            {/* Sales approval button or approved tag */}
                            {sr.salesApproved ? (
                              <Tooltip title={`Approved by ${sr.salesApprovedBy?.fullName || 'Sales'} on ${sr.salesApprovedAt ? new Date(sr.salesApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}`}>
                                <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 11, cursor: 'default' }}>
                                  Sales OK · {sr.salesApprovedAt ? new Date(sr.salesApprovedAt).toLocaleDateString('en-IN') : ''}
                                </Tag>
                              </Tooltip>
                            ) : (
                              <Button
                                size="small"
                                icon={<CheckCircleOutlined />}
                                style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff', borderRadius: 6 }}
                                disabled={!sr.designFileUrl && sr.stickerType !== 'Display Unit'}
                                title={(!sr.designFileUrl && sr.stickerType !== 'Display Unit') ? 'Waiting for design upload from Operations team' : 'Approve — Sales sign-off'}
                                onClick={async () => {
                                  try {
                                    const res = await approveStickerRequest({ id: sr._id, role: 'sales' }).unwrap();
                                    enqueueSnackbar(
                                      res?.data?.status === 'Approved'
                                        ? 'Design fully approved — printing can start!'
                                        : 'Sales approval recorded — awaiting Ops Head approval',
                                      { variant: 'success' },
                                    );
                                  } catch (err) {
                                    enqueueSnackbar(err?.data?.message || err?.data || 'Failed to approve design', { variant: 'error' });
                                  }
                                }}
                              >
                                Sales OK
                              </Button>
                            )}

                            {/* Ops approval — read-only in Sales view */}
                            {sr.opsHeadApproved ? (
                              <Tooltip title={`Ops approved by ${sr.opsHeadApprovedBy?.fullName || 'Ops'} on ${sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}`}>
                                <Tag color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 11, cursor: 'default' }}>
                                  Ops OK · {sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleDateString('en-IN') : ''}
                                </Tag>
                              </Tooltip>
                            ) : (
                              <Tag color="warning" style={{ borderRadius: 10, fontSize: 11 }}>Awaiting Ops</Tag>
                            )}
                          </Space>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Space>
              </Card>
            );
          })()}

          {/* Hotel / Company Information — mirrors Lead detail layout */}
          {!isOrderEditing && (
            <Card
              style={{ borderRadius: 14, marginBottom: 20, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
              title={
                <Space>
                  <div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} />
                  <BankOutlined style={{ color: '#B11E6A' }} />
                  <span>Hotel / Company Information</span>
                </Space>
              }
            >
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 3 }} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 13, fontWeight: 500 }} style={{ background: isDark ? 'transparent' : '#fff' }}>
                <Descriptions.Item label="Hotel / Company">{o.hotelName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Billing Name">{o.billingName || '—'}</Descriptions.Item>
                {o.hotelType && (
                  <Descriptions.Item label="Hotel Type">
                    <Tag color={o.hotelType === 'OLD' ? 'blue' : 'green'}>{o.hotelType === 'OLD' ? 'Old Hotel' : 'New Hotel'}</Tag>
                  </Descriptions.Item>
                )}
                {o.branch && <Descriptions.Item label="Branch">{o.branch}</Descriptions.Item>}
                {o.rooms && <Descriptions.Item label="No. of Rooms">{o.rooms}</Descriptions.Item>}
                {o.occupancy && <Descriptions.Item label="Occupancy (%)">{`${o.occupancy}%`}</Descriptions.Item>}
                <Descriptions.Item label="Contact Person">{o.contactPerson || '—'}</Descriptions.Item>
                {o.pocDesignation && <Descriptions.Item label="POC Designation">{o.pocDesignation}</Descriptions.Item>}
                <Descriptions.Item label="Phone">{o.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email">{o.email || '—'}</Descriptions.Item>
                {o.alternativeName && <Descriptions.Item label="Alt. Name">{o.alternativeName}</Descriptions.Item>}
                {o.alternativeRole && <Descriptions.Item label="Alt. Role">{o.alternativeRole}</Descriptions.Item>}
                {o.alternativePhone && <Descriptions.Item label="Alt. Number">{o.alternativePhone}</Descriptions.Item>}
                <Descriptions.Item label="Location / City">{o.location || '—'}</Descriptions.Item>
                {o.destination && <Descriptions.Item label="Destination">{o.destination}</Descriptions.Item>}
                {o.salesPerson && <Descriptions.Item label="Assigned To">{o.salesPerson}</Descriptions.Item>}
                <Descriptions.Item label="Bill Type">
                  <Tag color={o.billType === 'GST' ? 'volcano' : 'default'} style={{ borderRadius: 12, margin: 0 }}>{o.billType === 'GST' ? 'GST Invoice' : 'Non-GST'}</Tag>
                </Descriptions.Item>
                {o.billType === 'GST' && <Descriptions.Item label="GSTIN">{o.gstNumber || '—'}</Descriptions.Item>}
                {o.billType === 'GST' && o.gstPercent && <Descriptions.Item label="GST Rate">{`${o.gstPercent}%`}</Descriptions.Item>}
                {o.city && <Descriptions.Item label="City">{o.city}</Descriptions.Item>}
                {o.state && <Descriptions.Item label="State">{o.state}</Descriptions.Item>}
                {o.pincode && <Descriptions.Item label="Pincode">{o.pincode}</Descriptions.Item>}
                {o.detailedAddress && <Descriptions.Item label="Address" span={3}>{o.detailedAddress}</Descriptions.Item>}
              </Descriptions>
            </Card>
          )}

          {!isOrderEditing && (<Row gutter={20}>
            <Col xs={24} lg={16}>
              {/* ── Products adding — personalized kit summary (mirrors Lead detail) ── */}
              {(() => {
                // Resolve kit fields from the order, falling back to the linked
                // negotiation/quotation/lead so kit details always show (same as Lead view).
                const { pick: oPickPA } = resolveOrderKitSource(o);
                const paProductType = oPickPA('productType');
                const paDisplayUnit = oPickPA('kitDisplayUnit', 'displayUnit');
                const paKitSize = oPickPA('kitSize');
                const paKitSticker = oPickPA('kitSticker');
                const paKitLogo = oPickPA('kitLogo');
                const paKitPrinting = oPickPA('kitPrinting');
                const paKitBoxType = oPickPA('kitDisplayUnitType') || (Array.isArray(o.kitOrders) && o.kitOrders[0]?.displayUnitType) || null;
                const paKitLamination = oPickPA('kitLamination') || (Array.isArray(o.kitOrders) && o.kitOrders[0]?.lamination) || null;
                const paKitPrice = oPickPA('kitPrice') || (Array.isArray(o.kitOrders) && o.kitOrders[0]?.kitPrice) || null;
                const paKitQty = oPickPA('kitOverallQty') || (Array.isArray(o.kitOrders) && o.kitOrders[0]?.overallQty) || null;
                const paProducts = (o.products && o.products.length ? o.products : (o.items && o.items.length ? o.items : oPickPA('products'))) || [];
                const oSelKitIdsPA = (() => {
                  const sk = oPickPA('selectedKits');
                  if (Array.isArray(sk) && sk.length) return sk;
                  const single = oPickPA('selectedKit');
                  return single ? [single] : [];
                })();
                const kitNamePA = oSelKitIdsPA.length > 0
                  ? oSelKitIdsPA.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ')
                  : null;
                const kitPsPA = paProducts.filter(p => p && (p.isKit || p.kitType));
                const isKitTypePA = ptHasKitUI(paProductType);
                const paPackagingIncludes = oPickPA('packagingIncludes') || [];
                const hasKitInfoPA = oSelKitIdsPA.length > 0 || paDisplayUnit || paKitPrice || paKitQty || kitPsPA.length > 0;
                if (!hasKitInfoPA && !paProductType) return null;
                const kitProductsToShowPA = kitPsPA.length > 0
                  ? kitPsPA.map(p => ({
                      productName: p.name || p.kitType || p.itemName || '',
                      displayType: p.displayType || '',
                      qty: p.qty,
                      rate: p.rate || 0,
                      gstPercent: p.gst || p.gstPercent || 0,
                    }))
                  : (oSelKitIdsPA.length > 0
                      ? (kits.find(k => k._id === oSelKitIdsPA[0])?.products || []).map(p => ({
                          productName: p.productName || '',
                          displayType: '',
                          qty: p.qty,
                          rate: p.rate || 0,
                          gstPercent: 0,
                        }))
                      : []);
                const OIR = ({ label, value }) => (
                  <div style={{ padding: '8px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                    <Text strong style={{ fontSize: 13, display: 'block', marginTop: 1 }}>{value || '—'}</Text>
                  </div>
                );
                const oKitOrders = Array.isArray(o.kitOrders) && o.kitOrders.length > 0 ? o.kitOrders : [];
                const normYNv = v => (v === 'YES' || v === true ? 'Yes' : v === 'NO' || v === false ? 'No' : v || '—');
                return (
                  <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span>Products adding</span></Space>}>
                    <Row gutter={[12, 8]}>
                      {paProductType && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Product Selection</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>
                            {Array.isArray(paProductType) ? paProductType.map(productTypeLabel).join(', ') : productTypeLabel(paProductType)}
                          </Text>
                        </Col>
                      )}
                      {kitNamePA && (
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Kit Selected</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{kitNamePA}</Text>
                        </Col>
                      )}
                      {paDisplayUnit && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Display Unit</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{(paDisplayUnit || '').replace(/_/g, ' ')}</Text>
                        </Col>
                      )}
                      {paKitBoxType && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{(configDisplayUnitOptions.find(c => c.value === paDisplayUnit)?.label || 'Display Unit')} Type</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{paKitBoxType}</Text>
                        </Col>
                      )}
                      {paKitSize && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Kit Size</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{paKitSize}</Text>
                        </Col>
                      )}
                      {paKitSticker && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Sticker</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{normYNv(paKitSticker)}</Text>
                        </Col>
                      )}
                      {paKitLogo && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Logo</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{normYNv(paKitLogo)}</Text>
                        </Col>
                      )}
                      {paKitPrinting && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Printing</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{normYNv(paKitPrinting)}</Text>
                        </Col>
                      )}
                      {paKitLamination && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Lamination</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{normYNv(paKitLamination)}</Text>
                        </Col>
                      )}
                      {(paKitPrice != null && paKitPrice !== '') && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Packing Material Price (single)</Text>
                          <Text strong style={{ fontSize: 13, display: 'block', color: '#722ed1' }}>₹{Number(paKitPrice).toLocaleString()}</Text>
                        </Col>
                      )}
                      {Number(paKitQty) > 0 && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Overall Qty</Text>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>{paKitQty} kit{Number(paKitQty) > 1 ? 's' : ''}</Text>
                        </Col>
                      )}
                      {(paKitPrice != null && paKitPrice !== '' && Number(paKitQty) > 0) && (
                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11 }}>Kit Amount</Text>
                          <Text strong style={{ fontSize: 13, display: 'block', color: '#B11E6A' }}>₹{r2(Number(paKitPrice) * Number(paKitQty)).toLocaleString()}</Text>
                        </Col>
                      )}
                    </Row>
                    {/* Per-kit sub-rows — each kit's category + display unit */}
                    {oSelKitIdsPA.length > 0 && oKitOrders.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                          EACH KIT — CATEGORY &amp; DISPLAY UNIT
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {oSelKitIdsPA.map((kitId, ki) => {
                            const ko = oKitOrders.find(k => k.kitId === kitId) || oKitOrders[ki] || {};
                            const kitDef = kits.find(k => k._id === kitId);
                            const kName = kitDef?.kitName || ko.kitName || ko.kitType || `Kit ${ki + 1}`;
                            const kDU = ko.displayUnit;
                            const kCat = ko.category;
                            return (
                              <div key={kitId} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '6px 10px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.12)' }}>
                                <GiftOutlined style={{ color: '#722ed1' }} />
                                <Text strong style={{ fontSize: 12, color: '#722ed1' }}>{kName}</Text>
                                {kCat && <Tag color={kCat === ORDER_CATEGORIES.PERSONALIZED ? 'purple' : 'orange'} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>{kCat === ORDER_CATEGORIES.PERSONALIZED ? 'Personalized' : 'Separate Kit'}</Tag>}
                                {kDU && <Tag color="blue" style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>{(kDU || '').replace(/_/g, ' ')}</Tag>}
                                {ko.size && <Tag style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>{ko.size}</Tag>}
                                {ko.sticker && <Tag color={ko.sticker === 'YES' ? 'cyan' : 'default'} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>Sticker: {normYNv(ko.sticker)}</Tag>}
                                {ko.logo && <Tag color={ko.logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>Logo: {normYNv(ko.logo)}</Tag>}
                                {ko.printing && <Tag color={ko.printing === 'YES' ? 'purple' : 'default'} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>Printing: {normYNv(ko.printing)}</Tag>}
                                {Number(ko.kitPrice) > 0 && <Tag color="orange" style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>₹{Number(ko.kitPrice).toLocaleString()}{Number(ko.overallQty) > 0 ? ` × ${ko.overallQty}` : ''}</Tag>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Packaging includes */}
                    {ptHasPersonalized(paProductType) && paPackagingIncludes.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.2)' }}>
                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', display: 'block', marginBottom: 6, letterSpacing: 0.6 }}>INCLUDED IN KIT PACKAGING</Text>
                        <Space wrap size={4}>
                          {paPackagingIncludes.map((v, i) => {
                            const id = typeof v === 'object' ? v.id : v;
                            const qty = typeof v === 'object' ? v.qty : null;
                            const kMatch = kits.find(k => k._id === id);
                            const label = kMatch ? kMatch.kitName : id;
                            return <Tag key={i} color={kMatch ? 'purple' : 'orange'} style={{ borderRadius: 12, fontSize: 11 }}>{label}{qty && qty > 1 ? ` ×${qty}` : ''}</Tag>;
                          })}
                        </Space>
                      </div>
                    )}
                  </Card>
                );
              })()}

              {/* Products */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Order Products & Specifications</span></Space>}>
                {(() => {
                  const oProductsResolved = (o.products && o.products.length ? o.products : (o.items && o.items.length ? o.items : []));
                  const kitPs = oProductsResolved.filter(p => p && (p.isKit || p.kitType));
                  const derivedKitDU = o.kitDisplayUnit || o.displayUnit ||
                    (kitPs.length > 0 ? (kitPs[0].packingMaterial || kitPs[0].packaging || '') : '');
                  const oSelKitIds = Array.isArray(o.selectedKits) && o.selectedKits.length > 0
                    ? o.selectedKits : (o.selectedKit ? [o.selectedKit] : []);
                  const derivedKitName = oSelKitIds.length > 0
                    ? oSelKitIds.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ')
                    : (kitPs.length > 0 ? (kitPs[0].kitName || kitPs[0].kitType || '') : '');
                  // Fallback to linked lead for kit orders created before kit fields were on orders
                  const oLead = o.leadCode ? leadsData.find(l => l.leadCode === o.leadCode || l.leadId === o.leadCode) : null;
                  const oKitOrders = (Array.isArray(o.kitOrders) && o.kitOrders.length > 0 ? o.kitOrders : null)
                    || (Array.isArray(oLead?.kitOrders) && oLead.kitOrders.length > 0 ? oLead.kitOrders : null) || [];
                  return (
                    <DetailProductCards
                      products={oProductsResolved}
                      totalAmount={o.totalAmount}
                      kitDisplayUnit={derivedKitDU}
                      kitSize={o.kitSize || oLead?.kitSize}
                      kitName={derivedKitName}
                      selectedKits={oSelKitIds.length > 0 ? oSelKitIds : (oLead?.selectedKits || [])}
                      kitOrders={oKitOrders}
                      kitSticker={o.kitSticker || oLead?.kitSticker}
                      kitLogo={o.kitLogo || oLead?.kitLogo}
                      kitPrinting={o.kitPrinting || oLead?.kitPrinting}
                      kitOverallQty={o.kitOverallQty || oLead?.kitOverallQty}
                      kitPrice={o.kitPrice || oLead?.kitPrice}
                      forwardingCharge={o.forwardingCharge}
                      forwardingChargeAmount={o.forwardingChargeAmount}
                      packagingIncludes={o.packagingIncludes?.length ? o.packagingIncludes : (oLead?.packagingIncludes || [])}
                      packagingIncludesQty={Object.keys(o.packagingIncludesQty||{}).length ? o.packagingIncludesQty : (oLead?.packagingIncludesQty || {})}
                    />
                  );
                })()}
              </Card>

              {/* Urgent / Emergency Deliveries (Partial) — only shown for emergency orders */}
              {(o.isUrgent || o.isEmergency || (o.splitDates || []).length > 0) && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,77,79,0.3)', boxShadow: '0 2px 12px rgba(255,77,79,0.08)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><AlertFilled style={{ color: '#ff4d4f' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f', fontWeight: 700 }}>Urgent / Emergency Deliveries (Partial)</span></Space>}
                >
                  {(o.splitDates || []).length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>Emergency order — no partial delivery schedule added yet.</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(o.splitDates || []).map((sd, i) => {
                        // Handle both flat {product, note} and nested {products:[{product,qty,notes}]} formats
                        const productList = (sd.products && sd.products.length > 0)
                          ? sd.products
                          : sd.product
                            ? [{ product: sd.product, qty: sd.qty, notes: sd.note }]
                            : [];
                        return (
                          <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                              <CalendarOutlined style={{ marginRight: 6 }} />
                              {sd.date ? dayjs(sd.date).format('DD MMM YYYY') : '—'}
                            </Text>
                            {productList.length > 0 ? productList.map((p, pi) => (
                              <Row key={pi} gutter={[16, 4]} style={{ marginBottom: pi < productList.length - 1 ? 8 : 0 }}>
                                <Col xs={24} sm={8}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Product: </Text>
                                  <Text strong style={{ fontSize: 13 }}>{p.product || '—'}</Text>
                                </Col>
                                <Col xs={24} sm={4}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Qty: </Text>
                                  <Text strong style={{ fontSize: 13 }}>{p.qty || '—'}</Text>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Notes: </Text>
                                  <Text style={{ fontSize: 13 }}>{p.notes || p.note || '—'}</Text>
                                </Col>
                              </Row>
                            )) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>No products specified for this date.</Text>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* Delivery & Payment */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CarOutlined style={{ color: '#fa8c16' }} /><span>{o.orderCategory !== 'SAMPLE' ? 'Delivery & Payment' : 'Delivery Details'}</span></Space>}>
                <DetailDeliveryPayment rec={o} showPaymentSummary={false} />
              </Card>

              {/* Payment summary — matches Lead detail layout (CategoryTotalsBreakdown + collected + balance) */}
              {o.orderCategory !== 'SAMPLE' && <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><CreditCardOutlined style={{ color: '#52c41a' }} /><span>Payment Summary</span></Space>}>
                <div>
                  <CategoryTotalsBreakdown rec={oEnrichedForBreakdown} isDark={isDark} kitsData={kits} />
                  {!oHasKitProducts && oGstAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                      <span>Without GST</span>
                      <span>₹{oSubtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {totalCollected > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Amount Paid</Text>
                      <Text strong style={{ color: '#52c41a' }}>₹{totalCollected.toLocaleString()}</Text>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#eef0f3'}` }}>
                    <Text style={{ fontSize: 13, fontWeight: 700 }}>Amount to Pay</Text>
                    <Text strong style={{ fontSize: 15, color: toCollect > 0 ? '#fa8c16' : '#52c41a' }}>₹{toCollect.toLocaleString()}</Text>
                  </div>
                  {combinedPaymentCollection.length > 0 && (
                    <div style={{ marginTop: 14, padding: '12px 14px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
                        PAYMENT COLLECTION ({combinedPaymentCollection.length} entr{combinedPaymentCollection.length > 1 ? 'ies' : 'y'})
                      </Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {combinedPaymentCollection.map((entry, idx) => (
                          <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div>
                                <Space size={8}>
                                  <DollarOutlined style={{ color: '#B11E6A', fontSize: 13 }} />
                                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                  {entry._fromLinked && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="blue">From Lead</Tag>}
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 11 }}>{entry.notes}</Text>}
                                </Space>
                                <div style={{ paddingLeft: 21, marginTop: 3 }}>
                                  {entry.paymentDate && <Text type="secondary" style={{ fontSize: 11 }}>Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}</Text>}
                                  {entry.recordedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>· Recorded {dayjs(entry.recordedAt).format('DD MMM YYYY')}</Text>}
                                </div>
                              </div>
                              <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                            </div>
                            {entry.proof?.url && (
                              <div style={{ marginTop: 5, paddingLeft: 21 }}>
                                <a href={entry.proof.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <FileTextOutlined />{entry.proof.name || 'View Proof'} ↗
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ padding: '6px 10px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{(combinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}</Text>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <Button icon={<PlusOutlined />} size="small" style={{ color: '#B11E6A', borderColor: '#B11E6A55', borderRadius: 8 }} onClick={() => openPayEntry('order', oEnrichedForBreakdown)}>
                      Add Payment Entry
                    </Button>
                  </div>
                </div>
              </Card>}

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
                  {/* Uploaded files / payment proofs — pulled from the order itself and from the
                      linked lead, since files are often attached at the lead stage. */}
                  {(() => {
                    const allFiles = [];
                    const pushFiles = (arr, category) => {
                      (arr || []).forEach((f) => {
                        if (!f) return;
                        const url = f.url || f.response?.url || f.secure_url || f.thumbUrl;
                        const fileName = f.name || f.fileName || f.originFileObj?.name;
                        if (url || fileName) allFiles.push({ ...f, url, name: fileName, category });
                      });
                    };
                    const leadObj = (full.leadId && typeof full.leadId === 'object') ? full.leadId : {};
                    pushFiles(full.paymentProofs || base.paymentProofs, 'Payment Proof');
                    pushFiles(full.documents || base.documents, 'Document');
                    pushFiles(full.lrFiles || base.lrFiles, 'LR / Dispatch');
                    pushFiles(leadObj.paymentProofs, 'Payment Proof (Lead)');
                    (full.paymentCollection || base.paymentCollection || []).forEach((entry, ei) => {
                      if (entry?.proof?.url) allFiles.push({ url: entry.proof.url, name: entry.proof.name || `Entry Proof ${ei + 1}`, category: 'Payment Proof' });
                    });
                    const logoUrl = full.hotelLogoUrl || base.hotelLogoUrl || leadObj.hotelLogoUrl;
                    if (logoUrl) allFiles.push({ url: logoUrl, name: 'Hotel Logo', category: 'Logo' });
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
              {o.gstNumber && (
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
                      <Text type="secondary" style={{ fontSize: 12 }}>GST details load automatically.<br />Click Refresh to reload.</Text>
                    </div>
                  )}
                </Card>
              )}
            </Col>
          </Row>)}

          {isOrderEditing && (
            <Form form={orderEditForm} layout="vertical" style={{ marginTop: 8 }}>

              {/* ── Customer Details ── */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><UserOutlined style={{ color: '#B11E6A' }} /><span>Customer Details</span></Space>}>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}><Form.Item label="Hotel / Client Name" name="hotelName"><Input placeholder="e.g. Grand Hotel" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="Billing Name" name="billingName"><Input placeholder="Name on invoice" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="Contact Person" name="contactPerson"><Input placeholder="Contact name" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone number" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="Email" name="email"><Input placeholder="Email address" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="City" name="city"><Input placeholder="City" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="State" name="state"><Input placeholder="State" /></Form.Item></Col>
                  <Col xs={24} sm={12}><Form.Item label="Pincode" name="pincode"><Input placeholder="Pincode" /></Form.Item></Col>
                  <Col xs={24}><Form.Item label="Detailed Address" name="detailedAddress"><Input.TextArea rows={2} placeholder="Street / detailed address" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Alt. Contact Name" name="alternativeName"><Input placeholder="Alternative contact name" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Alt. Contact Role" name="alternativeRole"><Input placeholder="Role / designation" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Alt. Phone" name="alternativePhone"><Input placeholder="Alternative phone" /></Form.Item></Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Hotel Type" name="hotelType">
                      <Select placeholder="Hotel Type" allowClear>
                        <Option value="OLD">Old Hotel</Option>
                        <Option value="NEW">New Hotel</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}><Form.Item label="No. of Rooms" name="rooms"><InputNumber placeholder="50" style={{ width: '100%' }} min={0} /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Occupancy (%)" name="occupancy"><InputNumber placeholder="75" style={{ width: '100%' }} min={0} max={100} /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Location / City" name="location"><Input placeholder="e.g. Coimbatore" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Destination" name="destination"><Input placeholder="e.g. Chennai" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Assigned To (Sales)" name="salesPerson"><Input placeholder="Sales person name" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Branch" name="branch"><Input placeholder="e.g. Main Branch" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="POC Designation" name="pocDesignation"><Input placeholder="GM, Manager" /></Form.Item></Col>
                </Row>
              </Card>

              {/* ── Kit Details (editable) ── */}
              {(() => {
                // Resolve which kits to render per-kit "Order Details" cards for. Prefer the live
                // selectedKits watch (reactive while the user edits the Kit selection). When that's
                // empty (e.g. selectedKits never reached the form, or useWatch hasn't caught up),
                // fall back to the kit ids ALREADY present on the order — derived from kitOrders
                // (whose index the per-kit Form.Items bind to) and from kit products. Without this,
                // a converted order with kitOrders but no selectedKits in the form rendered only the
                // generic fallback card, so the full per-kit "Dental kit — Order Details" card (with
                // Display Unit / Box Type / Size / Sticker / Logo / Printing / Lamination / Qty /
                // Kit Price / Specification) went missing.
                const koKitIds = ((orderEditForm.getFieldValue('kitOrders') || orderEditTarget?.kitOrders || []).map(k => k?.kitId).filter(Boolean));
                const prodKitIds = [...new Set((orderEditForm.getFieldValue('editProducts') || []).filter(p => p?.isKit || p?.kitType).map(p => p?.kitId).filter(Boolean))];
                const targetSelKits = (Array.isArray(orderEditTarget?.selectedKits) && orderEditTarget.selectedKits.length)
                  ? orderEditTarget.selectedKits
                  : (orderEditTarget?.selectedKit ? [orderEditTarget.selectedKit] : []);
                const editKitIds = watchedOrderEditSelKits.length > 0
                  ? watchedOrderEditSelKits
                  : (koKitIds.length ? koKitIds : (targetSelKits.length ? targetSelKits : prodKitIds));
                const hasKitProds = (orderEditForm.getFieldValue('editProducts') || []).some(p => p?.isKit || p?.kitType);
                if (editKitIds.length === 0 && !hasKitProds) return null;
                return (
                  <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                    title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1' }}>Kit Details</span></Space>}>
                    <Row gutter={[12, 0]} style={{ marginBottom: 12 }}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Product Selection" name="productType" style={{ marginBottom: 8 }}>
                          <Select mode="multiple" allowClear placeholder="Select product types" options={PRODUCT_SELECTION_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="Select Kit(s)" name="selectedKits" style={{ marginBottom: 8 }}>
                          <Select mode="multiple" allowClear showSearch optionFilterProp="label"
                            placeholder={kitOptions.length ? 'Select kits to include' : 'No kits configured yet'}
                            options={kitOptions}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* ── EACH KIT — CATEGORY & DISPLAY UNIT (mini-rows, matches lead edit "Products adding") ── */}
                    {editKitIds.length > 0 && (
                      <div style={{ marginTop: 4, marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                          EACH KIT — CATEGORY &amp; DISPLAY UNIT
                        </Text>
                        {editKitIds.map((kitId, kIdx) => {
                          const kDef = kits.find(k => k._id === kitId);
                          return (
                            <Row key={kitId} gutter={12} align="bottom" style={{ marginBottom: 8, padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.15)' }}>
                              <Col xs={24} sm={8}>
                                <Text strong style={{ color: '#722ed1', fontSize: 13 }}><GiftOutlined /> {kDef?.kitName || `Kit ${kIdx + 1}`}</Text>
                              </Col>
                              <Col xs={12} sm={8}>
                                <Form.Item label="Kit Category" name={['kitOrders', kIdx, 'category']} style={{ marginBottom: 0 }}
                                  tooltip="Personalized = part of the outer packaging. Separate Kit = assembled in its own display unit.">
                                  <Select options={[{ value: ORDER_CATEGORIES.PERSONALIZED, label: 'Personalized' }, { value: ORDER_CATEGORIES.SEPARATE_KIT, label: 'Separate Kit' }]} />
                                </Form.Item>
                              </Col>
                              <Col xs={12} sm={8}>
                                <Form.Item label="Display Unit" name={['kitOrders', kIdx, 'displayUnit']} style={{ marginBottom: 0 }}
                                  tooltip="This kit's own packaging — drives which Operations tab it routes to.">
                                  <Select allowClear showSearch optionFilterProp="label" placeholder="Display unit" options={configDisplayUnitOptions} />
                                </Form.Item>
                              </Col>
                            </Row>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Top-level personalized specs (outer packaging) — matches lead edit ── */}
                    {ptHasPersonalizedUI(watchedOrderEditProductType ?? orderEditTarget?.productType) && (<>
                      <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                        <Col xs={12} sm={4}>
                          <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                            <Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions} onChange={() => orderEditForm.setFieldValue('kitDisplayUnitType', undefined)} />
                          </Form.Item>
                        </Col>
                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                          {({ getFieldValue }) => {
                            const du = getFieldValue('kitDisplayUnit');
                            const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                            const subtypes = duCfg?.subtypes || [];
                            if (!subtypes.length) return null;
                            const duLabel = duCfg?.label || 'Display Unit';
                            return (
                              <Col xs={12} sm={4}>
                                <Form.Item label={`${duLabel} Type`} name="kitDisplayUnitType" style={{ marginBottom: 0 }}>
                                  <Select allowClear placeholder={`${duLabel} type`} options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                    onChange={(val) => {
                                      const st = subtypes.find(s => s.value === val);
                                      if (st) {
                                        const patch = {};
                                        if (st.size) patch.kitSize = st.size;
                                        if (st.sticker) patch.kitSticker = st.sticker;
                                        if (st.logo) patch.kitLogo = st.logo;
                                        if (st.printing) patch.kitPrinting = st.printing;
                                        if (st.lamination) patch.kitLamination = st.lamination;
                                        if (st.sellingPrice != null) patch.kitPrice = st.sellingPrice;
                                        orderEditForm.setFieldsValue(patch);
                                      }
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                            );
                          }}
                        </Form.Item>
                        <Col xs={12} sm={4}>
                          <Form.Item label="Size" name="kitSize" style={{ marginBottom: 0 }}>
                            <Input placeholder="e.g. 2.5cm x 2.5cm" />
                          </Form.Item>
                        </Col>
                        <Col xs={8} sm={4}>
                          <Form.Item label="Sticker" name="kitSticker" style={{ marginBottom: 0 }}>
                            <Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                          </Form.Item>
                        </Col>
                        <Col xs={8} sm={4}>
                          <Form.Item label="Logo" name="kitLogo" style={{ marginBottom: 0 }}>
                            <Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                          </Form.Item>
                        </Col>
                        <Col xs={8} sm={4}>
                          <Form.Item label="Printing" name="kitPrinting" style={{ marginBottom: 0 }}>
                            <Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                        {({ getFieldValue }) => {
                          const du = getFieldValue('kitDisplayUnit');
                          const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                          const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                          if (!isBox) return null;
                          return (
                            <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                              <Col xs={12} sm={6}>
                                <Form.Item label="Lamination" name="kitLamination" style={{ marginBottom: 0 }}>
                                  <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                </Form.Item>
                              </Col>
                            </Row>
                          );
                        }}
                      </Form.Item>
                      <Row gutter={16} style={{ marginTop: 10 }} align="bottom">
                        <Col xs={12} sm={5}>
                          <Form.Item label="Overall Qty" name="kitOverallQty" style={{ marginBottom: 0 }} tooltip="Total number of kits ordered.">
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="Total kit count" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={9}>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit || p.kitDisplayUnitType !== c.kitDisplayUnitType}>
                            {({ getFieldValue }) => {
                              const du = getFieldValue('kitDisplayUnit');
                              const duType = getFieldValue('kitDisplayUnitType');
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const st = (duCfg?.subtypes || []).find(s => s.value === duType);
                              const minPrice = st ? (Number(st.purchasePrice) || 0) + (Number(st.marginAmount) || 0) : 0;
                              return (
                                <Form.Item label="Packing Material Price (₹)" name="kitPrice" style={{ marginBottom: 0 }}
                                  rules={minPrice > 0 ? [{ validator: (_, val) => (val != null && Number(val) < minPrice) ? Promise.reject(`Min ₹${minPrice}`) : Promise.resolve() }] : []}>
                                  <InputNumber min={minPrice || 0} style={{ width: '100%' }} placeholder={st?.sellingPrice > 0 ? `Selling: ₹${st.sellingPrice}` : 'Single kit price'} formatter={(v) => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={(v) => (v || '').replace(/[₹,\s]/g, '')} />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={10}>
                          <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                              const single = Number(getFieldValue('kitPrice')) || 0;
                              const qty = Number(getFieldValue('kitOverallQty')) || 1;
                              if (!single) return null;
                              return (
                                <div style={{ padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.06)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.2)' }}>
                                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.6, display: 'block' }}>KIT AMOUNT</Text>
                                  <Text strong style={{ fontSize: 15, color: '#722ed1' }}>₹{(single * qty).toLocaleString()}</Text>
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>₹{single.toLocaleString()} × {qty} kit{qty > 1 ? 's' : ''}</Text>
                                </div>
                              );
                            }}
                          </Form.Item>
                        </Col>
                      </Row>
                    </>)}

                    {/* ── Included in Kit Packaging (top-level packagingIncludes) ── */}
                    {ptHasPersonalized(watchedOrderEditProductType ?? orderEditTarget?.productType) && (() => {
                      const kiOpts = editKitIds.map(id => { const k = kits.find(kk => kk._id === id); return k ? { value: id, label: k.kitName } : null; }).filter(Boolean);
                      const prOpts = (watchedOrderEditProds || []).filter(p => p && !p.isKit && !p.kitType && (p.name || p.itemName)).map(p => ({ value: p.name || p.itemName || '', label: p.name || p.itemName || '—' })).filter((o, i, arr) => arr.findIndex(x => x.value === o.value) === i);
                      const grpOpts = [...(kiOpts.length > 0 ? [{ label: 'Kits', options: kiOpts }] : []), ...(prOpts.length > 0 ? [{ label: 'Separate Products', options: prOpts }] : [])];
                      return (
                        <div style={{ marginTop: 12 }}>
                          <Divider style={{ margin: '8px 0 10px', fontSize: 12, color: '#722ed1', borderColor: 'rgba(114,46,209,0.2)' }}>
                            <Space><AppstoreOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1', fontWeight: 600 }}>Included in Kit Packaging</span></Space>
                          </Divider>
                          <Form.Item name="packagingIncludes" style={{ marginBottom: 6 }} tooltip="Select kits and products packed inside the personalized kit. Remaining quantities go as separate orders.">
                            <Select mode="multiple" allowClear showSearch optionFilterProp="label" placeholder="Select kits / products packed inside the personalized kit" options={grpOpts} />
                          </Form.Item>
                          <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                              const sel = getFieldValue('packagingIncludes') || [];
                              if (!sel.length) return null;
                              const overallQty = Number(getFieldValue('kitOverallQty')) || 1;
                              return (
                                <div style={{ padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.15)' }}>
                                  <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', display: 'block', marginBottom: 6 }}>
                                    QTY INSIDE PERSONALIZED KITS — enter "Per kit" (× {overallQty} kit{overallQty > 1 ? 's' : ''}) or override "Total"
                                  </Text>
                                  {sel.map(id => {
                                    const kMatch = kits.find(k => k._id === id);
                                    const sProd = (watchedOrderEditProds || []).find(p => p && (p.name || p.itemName) === id);
                                    const label = kMatch?.kitName || sProd?.name || sProd?.itemName || id;
                                    const isKit = Boolean(kMatch);
                                    const totalInside = Number(getFieldValue(['packagingIncludesQty', id])) || 1;
                                    const perKitDisplay = (totalInside <= 1 && overallQty > 1) ? undefined : (overallQty > 0 ? r2(totalInside / overallQty) : totalInside);
                                    const standaloneQty = isKit
                                      ? (Number((watchedOrderEditKitOrds || []).find(ko => ko?.kitId === id)?.overallQty) || 0)
                                      : (Number((watchedOrderEditProds || []).find(p => p && (p.name || p.itemName) === id)?.qty) || 0);
                                    const netQty = Math.max(0, standaloneQty - totalInside);
                                    const isOver = standaloneQty > 0 && totalInside > standaloneQty;
                                    return (
                                      <Row key={id} align="middle" gutter={8} style={{ marginBottom: 6 }}>
                                        <Col flex="1">
                                          <Text style={{ fontSize: 12 }}>{label}</Text>
                                          {standaloneQty > 0 && (
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                              Total ordered: {standaloneQty} → In personalized: {totalInside} → Separate: <Text strong style={{ color: isOver ? '#ff4d4f' : '#52c41a' }}>{netQty}</Text>
                                            </Text>
                                          )}
                                          {isOver && <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block' }}>⚠ Over by {totalInside - standaloneQty}</Text>}
                                        </Col>
                                        <Col>
                                          <div style={{ textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 9, display: 'block', lineHeight: 1.1 }}>Per kit</Text>
                                            <InputNumber min={0} size="small" style={{ width: 64 }} placeholder="qty" value={perKitDisplay}
                                              onChange={(v) => { const pk = Number(v) || 0; orderEditForm.setFieldValue(['packagingIncludesQty', id], pk > 0 ? pk * (overallQty || 1) : 1); }}
                                            />
                                          </div>
                                        </Col>
                                        <Col>
                                          <div style={{ textAlign: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 9, display: 'block', lineHeight: 1.1 }}>Total</Text>
                                            <Form.Item name={['packagingIncludesQty', id]} initialValue={1} noStyle>
                                              <InputNumber min={1} size="small" style={{ width: 70 }} />
                                            </Form.Item>
                                          </div>
                                        </Col>
                                      </Row>
                                    );
                                  })}
                                </div>
                              );
                            }}
                          </Form.Item>
                        </div>
                      );
                    })()}

                    {/* ── Per-Kit Order Details (detailed spec forms per kit) ── */}
                    {editKitIds.length > 0 && (
                      <Divider style={{ margin: '12px 0 8px', fontSize: 12, color: '#722ed1', borderColor: 'rgba(114,46,209,0.2)' }}>
                        <Space><GiftOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1', fontWeight: 600 }}>Per-Kit Order Details</span></Space>
                      </Divider>
                    )}
                    {editKitIds.length > 0 ? editKitIds.map((kitId, kitIndex) => {
                      const kitDef = kits.find(k => k._id === kitId);
                      const kitLabel = kitDef?.kitName || 'Personalized Kit';
                      const otherKitOpts = editKitIds.map(id => { const k = kits.find(kk => kk._id === id); return k ? { value: id, label: k.kitName } : null; }).filter(Boolean);
                      const sepProdOptsEdit1 = (watchedOrderEditProds).filter(p => p && !p.isKit && !p.kitType && (p.name || p.itemName)).map(p => ({ value: p.name || p.itemName || '', label: p.name || p.itemName || '—' })).filter(o => o.value);
                      const groupedKitOptsEdit1 = [...(otherKitOpts.length > 0 ? [{ label: 'Kits', options: otherKitOpts }] : []), ...(sepProdOptsEdit1.length > 0 ? [{ label: 'Separate Products', options: sepProdOptsEdit1 }] : [])];
                      const flatKitOptsEdit1 = [...otherKitOpts, ...sepProdOptsEdit1];
                      return (
                        <div key={kitId} style={{ padding: '10px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.16)', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            <GiftOutlined style={{ color: '#722ed1' }} />
                            <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{kitLabel} — Order Details</Text>
                            <Form.Item name={['kitOrders', kitIndex, 'category']} noStyle initialValue={defaultKitCategory(orderEditTarget?.productType)}>
                              <Select size="small" style={{ width: 160 }}
                                options={[
                                  { value: ORDER_CATEGORIES.PERSONALIZED, label: 'Personalized' },
                                  { value: ORDER_CATEGORIES.SEPARATE_KIT, label: 'Separate Kit' },
                                ]}
                              />
                            </Form.Item>
                          </div>
                          <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                          {/* Row 1: Display Unit, Box Type (conditional), Size, Overall Qty, Sticker, Logo, Printing */}
                          <Row gutter={12} style={{ marginBottom: 10 }}>
                            <Col xs={24} sm={5}>
                              <Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 0 }}>
                                <Select allowClear showSearch optionFilterProp="label" placeholder="Display unit" options={configDisplayUnitOptions} onChange={() => orderEditForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)} />
                              </Form.Item>
                            </Col>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit || p.kitOrders?.[kitIndex]?.displayUnitType !== c.kitOrders?.[kitIndex]?.displayUnitType}>
                              {({ getFieldValue }) => {
                                const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                                const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                const subtypes = duCfg?.subtypes || [];
                                if (!subtypes.length) return null;
                                const duLabel = duCfg?.label || 'Display Unit';
                                return (
                                  <Col xs={24} sm={5}>
                                    <Form.Item label={`${duLabel} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder={`${duLabel} type`} options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                        onChange={(val) => {
                                          const st = subtypes.find(s => s.value === val);
                                          if (st) {
                                            const path = (f) => ['kitOrders', kitIndex, f];
                                            if (st.size) orderEditForm.setFieldValue(path('size'), st.size);
                                            if (st.sticker) orderEditForm.setFieldValue(path('sticker'), st.sticker);
                                            if (st.logo) orderEditForm.setFieldValue(path('logo'), st.logo);
                                            if (st.printing) orderEditForm.setFieldValue(path('printing'), st.printing);
                                            if (st.lamination) orderEditForm.setFieldValue(path('lamination'), st.lamination);
                                            if (st.sellingPrice != null) orderEditForm.setFieldValue(path('kitPrice'), st.sellingPrice);
                                          }
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>
                                );
                              }}
                            </Form.Item>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 0 }}>
                                <Input placeholder="e.g. 2.5cm x 2.5cm" />
                              </Form.Item>
                            </Col>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 0 }}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" />
                              </Form.Item>
                            </Col>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                          </Row>
                          {/* Lamination — only when Box display unit selected */}
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                            {({ getFieldValue }) => {
                              const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                              if (!isBox) return null;
                              return (
                                <Row gutter={12} style={{ marginBottom: 10 }}>
                                  <Col xs={12} sm={6}>
                                    <Form.Item label="Lamination" name={['kitOrders', kitIndex, 'lamination']} style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              );
                            }}
                          </Form.Item>
                          {/* Row 2: Kit Price */}
                          <Row gutter={12}>
                            <Col xs={12} sm={6}>
                              <Form.Item label="Packing Material Price (₹)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 0 }}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                              </Form.Item>
                            </Col>
                          </Row>
                          {/* Kit Amount Summary Box — KIT AMT | INCL breakdown | TOTAL KIT PRICE */}
                          <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => {
                              const kPrice = Number(getFieldValue(['kitOrders', kitIndex, 'kitPrice'])) || 0;
                              const kQty = Number(getFieldValue(['kitOrders', kitIndex, 'overallQty'])) || 1;
                              const kAmt = kPrice * kQty;
                              const kIncludes = getFieldValue(['kitOrders', kitIndex, 'kitIncludes']) || [];
                              const kIncludesQty = getFieldValue(['kitOrders', kitIndex, 'kitIncludesQty']) || {};
                              const kSepProds = (watchedOrderEditProds || []).filter(p => p && !p.isKit && !p.kitType);
                              const kIncludedBreakdown = kIncludes.map(id => {
                                const kDefMatch = kits.find(k => k._id === id);
                                const koMatch = kDefMatch ? (watchedOrderEditKitOrds || []).find(ko => ko?.kitId === id) : null;
                                const pMatch = !kDefMatch ? kSepProds.find(pp => (pp.name || pp.itemName) === id) : null;
                                if (!kDefMatch && !pMatch) return null;
                                const incQPK = Number(kIncludesQty[id]) || 1;
                                const totalInc = incQPK * kQty;
                                let unitRate, totalPQ, itemName;
                                if (kDefMatch) {
                                  unitRate = Number(koMatch?.kitPrice) || 0;
                                  totalPQ = Number(koMatch?.overallQty) || 0;
                                  itemName = kDefMatch.kitName || id;
                                } else {
                                  unitRate = (Number(pMatch.rate) || 0) * (1 + (Number(pMatch.gst) || 0) / 100);
                                  totalPQ = Number(pMatch.qty) || 0;
                                  itemName = pMatch.name || pMatch.itemName || id;
                                }
                                const incAmt = r2(totalInc * unitRate);
                                const remQty = Math.max(0, totalPQ - totalInc);
                                const remAmt = r2(remQty * unitRate);
                                const isOver = totalPQ > 0 && totalInc > totalPQ;
                                return { id, name: itemName, isKit: !!kDefMatch, incQPK, totalInc, incAmt, remQty, remAmt, isOver, totalPQ };
                              }).filter(Boolean);
                              const totalIncAmt = kIncludedBreakdown.reduce((s, r) => s + r.incAmt, 0);
                              const totalSepAmt = kIncludedBreakdown.reduce((s, r) => s + r.remAmt, 0);
                              const totalKitPrice = kAmt + totalIncAmt;
                              if (!kPrice && !totalIncAmt) return null;
                              return (
                                <div style={{ marginTop: 10, padding: '8px 14px', background: isDark ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.05)', borderRadius: 10, border: '1px solid rgba(24,144,255,0.18)' }}>
                                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    {kAmt > 0 && (
                                      <div>
                                        <Text style={{ fontSize: 10, fontWeight: 700, color: '#1890ff', letterSpacing: 0.5, display: 'block' }}>KIT AMT</Text>
                                        <Text strong style={{ fontSize: 13, color: '#1890ff' }}>₹{kAmt.toLocaleString()}</Text>
                                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>₹{kPrice.toLocaleString()} × {kQty}</Text>
                                      </div>
                                    )}
                                    {kIncludedBreakdown.map(r => (
                                      <div key={r.id}>
                                        <Text style={{ fontSize: 10, fontWeight: 700, color: '#722ed1', letterSpacing: 0.5, display: 'block' }}>INCL: {r.name}{r.isKit ? ' (Kit)' : ''}</Text>
                                        <Text strong style={{ fontSize: 13, color: '#722ed1' }}>₹{r.incAmt.toLocaleString()}</Text>
                                        {r.totalPQ > 0 ? (
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                            {r.totalPQ} total → <Text strong style={{ color: '#722ed1' }}>{r.totalInc} personalized</Text> + <Text strong style={{ color: r.remQty > 0 ? '#fa8c16' : '#8c8c8c' }}>{r.remQty} separate</Text>
                                            {` (${r.incQPK}×${kQty})`}
                                          </Text>
                                        ) : (
                                          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{r.incQPK}/kit × {kQty} = {r.totalInc}</Text>
                                        )}
                                        {r.isOver && <Text style={{ fontSize: 10, color: '#ff4d4f', display: 'block' }}>⚠ Over-allocated by {r.totalInc - r.totalPQ}</Text>}
                                        {r.remQty > 0 && <Text style={{ fontSize: 10, color: '#fa8c16', display: 'block' }}>Separate price → ₹{r.remAmt.toLocaleString()}</Text>}
                                      </div>
                                    ))}
                                    <div style={{ borderLeft: '2px solid rgba(82,196,26,0.3)', paddingLeft: 12 }}>
                                      <Text style={{ fontSize: 10, fontWeight: 700, color: '#52c41a', letterSpacing: 0.5, display: 'block' }}>TOTAL KIT PRICE</Text>
                                      <Text strong style={{ fontSize: 15, color: '#52c41a' }}>₹{totalKitPrice.toLocaleString()}</Text>
                                      {totalSepAmt > 0 && (
                                        <>
                                          <Text style={{ fontSize: 10, fontWeight: 700, color: '#fa8c16', letterSpacing: 0.5, display: 'block', marginTop: 4 }}>+ SEPARATE PACK</Text>
                                          <Text strong style={{ fontSize: 13, color: '#fa8c16' }}>₹{totalSepAmt.toLocaleString()}</Text>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          </Form.Item>
                          <Form.Item label="Specification / Notes" name={['kitOrders', kitIndex, 'specification']} style={{ marginBottom: 8, marginTop: 10 }}>
                            <Input.TextArea rows={2} placeholder="Kit specification notes, special requirements..." />
                          </Form.Item>
                          {/* Per-kit products & their specifications (read-only, sourced from editProducts) */}
                          {(() => {
                            const allProds = watchedOrderEditProds || [];
                            const kitProds = allProds.filter(p => p && (p.isKit || p.kitType) && (p.kitId === kitId || (!p.kitId && kitIndex === 0)));
                            if (!kitProds.length) return null;
                            return (
                              <div style={{ marginTop: 10 }}>
                                <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#722ed1', display: 'block', marginBottom: 6 }}>
                                  KIT PRODUCTS ({kitProds.length})
                                </Text>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {kitProds.map((p, pi) => {
                                    const pName = p.name || p.itemName || p.kitType || '—';
                                    const pQty = Number(p.qty) || 0;
                                    const pRate = Number(p.rate || p.price) || 0;
                                    const pGst = Number(p.gst || p.gstPercent) || 0;
                                    const lineTotal = r2(pQty * pRate * (1 + pGst / 100));
                                    const specEntries = [
                                      p.logo && ['Logo', p.logo === 'YES' ? 'Yes' : 'No'],
                                      p.sticker && ['Sticker', p.sticker === 'YES' ? 'Yes' : p.sticker],
                                      p.printing && ['Printing', p.printing === 'YES' ? 'Yes' : 'No'],
                                      p.packingMaterial && ['Packing', p.packingMaterial],
                                      p.materialCategory && ['Material', p.materialCategory],
                                      p.brand && ['Brand', p.brand],
                                      p.size && ['Size', p.size],
                                      p.unit && ['Unit', p.unit],
                                      p.otherSpecs && ['Other', p.otherSpecs],
                                    ].filter(Boolean);
                                    const prodAttrEntries = (p.productAttributes && typeof p.productAttributes === 'object' && !Array.isArray(p.productAttributes))
                                      ? Object.entries(p.productAttributes).filter(([, v]) => v != null && v !== '')
                                      : [];
                                    return (
                                      <div key={pi} style={{ border: `1px solid ${isDark ? 'rgba(114,46,209,0.25)' : 'rgba(114,46,209,0.18)'}`, borderRadius: 8, overflow: 'hidden' }}>
                                        <div style={{ background: isDark ? 'rgba(114,46,209,0.12)' : 'rgba(114,46,209,0.06)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#722ed1,#9254de)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{pi + 1}</span>
                                            </div>
                                            <Text strong style={{ fontSize: 13 }}>{pName}</Text>
                                            <Tag color="purple" style={{ fontSize: 10, borderRadius: 4, margin: 0, padding: '0 5px' }}>KIT</Tag>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            {lineTotal > 0 && <Text strong style={{ color: '#722ed1', fontSize: 13 }}>₹{lineTotal.toLocaleString()}</Text>}
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{pQty} pcs × ₹{pRate}{pGst > 0 ? ` +${pGst}% GST` : ''}</Text>
                                          </div>
                                        </div>
                                        {(specEntries.length > 0 || prodAttrEntries.length > 0) && (
                                          <div style={{ padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderTop: `1px dashed ${isDark ? 'rgba(114,46,209,0.15)' : 'rgba(114,46,209,0.12)'}` }}>
                                            <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#888', display: 'block', marginBottom: 6 }}>SPECIFICATIONS</Text>
                                            <Row gutter={[8, 6]}>
                                              {specEntries.map(([k, v]) => (
                                                <Col xs={12} sm={8} key={k}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{k}</Text>
                                                  <Text strong style={{ fontSize: 11 }}>{v}</Text>
                                                </Col>
                                              ))}
                                              {prodAttrEntries.map(([k, v]) => (
                                                <Col xs={12} sm={8} key={`pa-${k}`}>
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{prettyAttrKeyLead(k)}</Text>
                                                  <Text strong style={{ fontSize: 11 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                                                </Col>
                                              ))}
                                            </Row>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.kitPrice !== c.kitOrders?.[kitIndex]?.kitPrice || p.kitOrders?.[kitIndex]?.overallQty !== c.kitOrders?.[kitIndex]?.overallQty}>
                            {({ getFieldValue }) => {
                              const single = Number(getFieldValue(['kitOrders', kitIndex, 'kitPrice'])) || 0;
                              const qty = Number(getFieldValue(['kitOrders', kitIndex, 'overallQty'])) || 0;
                              if (!single || !qty) return null;
                              return <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>Kit Amount: <Text strong style={{ color: '#722ed1' }}>₹{(single * qty).toLocaleString()}</Text> ({single.toLocaleString()} × {qty})</Text>;
                            }}
                          </Form.Item>
                        </div>
                      );
                    }) : null}
                  </Card>
                );
              })()}

              {/* ── Products & Specifications (editable, mirrors Quotation/Negotiation) ── */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#1890ff' }} /><span>Products & Specifications</span></Space>}>
                <ProductHeaders />
                <ProductFormList fieldName="editProducts" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} packingMaterialOptions={configPackingMaterialOptions} />
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const prods = getFieldValue('editProducts') || [];
                    const sepProds = prods.filter(p => p && !p.isKit && !p.kitType);
                    const subtotal = sepProds.reduce((s, p) => s + (Number(p?.qty)||0)*(Number(p?.rate)||0), 0);
                    const gstAmt = sepProds.reduce((s, p) => s + (Number(p?.qty)||0)*(Number(p?.rate)||0)*((Number(p?.gst)||0)/100), 0);
                    const _editRec0 = { ...orderEditTarget, products: prods, kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [], kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice, kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty, packagingIncludes: getFieldValue('packagingIncludes') || orderEditTarget?.packagingIncludes || [] };
                    const total = r2(computeCompositionGrandTotal(_editRec0, kits)) || r2(computeRecordGrandTotal(_editRec0));
                    if (total === 0) return null;
                    const kitPortion = Math.max(0, total - r2(subtotal + gstAmt) - (orderEditTarget?.forwardingCharge ? r2(Number(orderEditTarget?.forwardingChargeAmount)||0) : 0));
                    return (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '6px 10px', background: 'rgba(177,30,106,0.04)', borderRadius: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {kitPortion > 0 && <Text type="secondary" style={{ fontSize: 12 }}>Kit: <strong>₹{kitPortion.toLocaleString()}</strong></Text>}
                        {subtotal > 0 && <Text type="secondary" style={{ fontSize: 12 }}>Separate: <strong>₹{r2(subtotal).toLocaleString()}</strong></Text>}
                        {gstAmt > 0 && <Text type="secondary" style={{ fontSize: 12 }}>GST: <strong>₹{r2(gstAmt).toLocaleString()}</strong></Text>}
                        <Text style={{ fontSize: 13, color: '#B11E6A', fontWeight: 700 }}>Total: ₹{total.toLocaleString()}</Text>
                      </div>
                    );
                  }}
                </Form.Item>
              </Card>

              {/* ── Urgent / Emergency Deliveries (Partial) ── */}
              {orderEditTarget?.orderCategory !== 'SAMPLE' && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,77,79,0.25)', boxShadow: '0 2px 12px rgba(255,77,79,0.08)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f' }}>Urgent / Emergency Deliveries (Partial)</span></Space>}
                >
                  <Form.List name="splitDates">
                    {(fields, { add, remove }) => (
                      <div>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #ff4d4f33' }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={6}>
                                <Form.Item {...rest} name={[name, 'date']} label="Partial Date" style={{ marginBottom: 6 }}>
                                  <DatePicker style={{ width: '100%' }} size="small" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'product']} label="Product" style={{ marginBottom: 6 }}>
                                  <Select
                                    size="small"
                                    placeholder="Select product"
                                    allowClear
                                    onChange={(val) => {
                                      const matched = (Array.isArray(watchedOrderEditProds) ? watchedOrderEditProds : [])
                                        .find(p => (p.name || p.itemName || p.kitType) === val);
                                      if (matched?.qty) orderEditForm.setFieldValue(['splitDates', name, 'qty'], matched.qty);
                                    }}
                                  >
                                    {(Array.isArray(watchedOrderEditProds) ? watchedOrderEditProds : [])
                                      .filter(p => p?.name || p?.itemName || p?.kitType)
                                      .map((p, i) => {
                                        const label = p.name || p.itemName || p.kitType;
                                        return <Option key={i} value={label}>{label}{p.isKit || p.kitType ? ' (Kit)' : ''}</Option>;
                                      })}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={4}>
                                <Form.Item {...rest} name={[name, 'qty']} label="Qty" style={{ marginBottom: 6 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} min={1} placeholder="Qty" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={5}>
                                <Form.Item {...rest} name={[name, 'note']} label="Notes" style={{ marginBottom: 6 }}>
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
              )}

              {/* ── Delivery & Payment ── */}
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CalendarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
                <Form.Item label="Expected Delivery Date" name="expectedDelivery" rules={[{ required: true, message: 'Select delivery date' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={8}><Form.Item label="Delivery By" name="deliveryBy"><SelectWithAdd field="deliveryBy" defaultOptions={[{ value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" /></Form.Item></Col>
                  <Col xs={24} sm={8}><Form.Item label="Transport Cost Scope" name="transportationBy"><SelectWithAdd field="transportationBy" defaultOptions={[{ value: 'CLIENT', label: 'Client' }, { value: 'HNG', label: 'HNG' }]} placeholder="Select or Add" /></Form.Item></Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="forwardingCharge" valuePropName="checked"><Checkbox>Forwarding charge applicable</Checkbox></Form.Item>
                    <Form.Item noStyle shouldUpdate={(p, c) => p.forwardingCharge !== c.forwardingCharge}>
                      {({ getFieldValue }) => getFieldValue('forwardingCharge') ? (
                        <Form.Item label="Forwarding Charge Amount (₹)" name="forwardingChargeAmount">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                        </Form.Item>
                      ) : null}
                    </Form.Item>
                  </Col>
                </Row>
                {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item label="Payment Terms" name="paymentTerms" rules={[{ required: true }]}>
                  <Select onChange={(val) => {
                    const prods = orderEditForm.getFieldValue('editProducts') || [];
                    const _ptRec = { ...orderEditTarget, products: prods, kitOrders: orderEditForm.getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [], kitPrice: orderEditForm.getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice, kitOverallQty: orderEditForm.getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty, packagingIncludes: orderEditForm.getFieldValue('packagingIncludes') || orderEditTarget?.packagingIncludes || [] };
                    const computedTot = r2(computeCompositionGrandTotal(_ptRec, kits)) || r2(computeRecordGrandTotal(_ptRec));
                    const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                    let suggestedAdvance = 0;
                    if (val === 'BEFORE_100') suggestedAdvance = orderTotal;
                    else if (val === 'ON_DISPATCH' || val === '50_ADVANCE_50_AFTER') suggestedAdvance = r2(orderTotal * 0.5);
                    else if (val === 'CREDIT_10_30') suggestedAdvance = 0;
                    orderEditForm.setFieldValue('advance', suggestedAdvance);
                  }}>
                    {PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                  </Select>
                </Form.Item>}
                {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms || prev.editProducts !== cur.editProducts || prev.kitOrders !== cur.kitOrders}>
                  {({ getFieldValue }) => {
                    const pt = getFieldValue('paymentTerms');
                    const prods = getFieldValue('editProducts') || [];
                    const _advRec = { ...orderEditTarget, products: prods, kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [], kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice, kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty, packagingIncludes: getFieldValue('packagingIncludes') || orderEditTarget?.packagingIncludes || [] };
                    const computedTot = r2(computeCompositionGrandTotal(_advRec, kits)) || r2(computeRecordGrandTotal(_advRec));
                    const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                    let adviceText = '';
                    if (pt === 'BEFORE_100') adviceText = `Full payment — expected: ₹${orderTotal.toLocaleString()}`;
                    else if (pt === 'ON_DISPATCH') adviceText = `50% advance — expected: ₹${r2(orderTotal * 0.5).toLocaleString()}`;
                    else if (pt === '50_ADVANCE_50_AFTER') adviceText = `50% advance — expected: ₹${r2(orderTotal * 0.5).toLocaleString()}`;
                    else if (pt === 'CREDIT_10_30') adviceText = 'Credit terms — advance: ₹0';
                    return adviceText ? (<div style={{ marginTop: -10, marginBottom: 12, padding: '6px 10px', background: 'rgba(177,30,106,0.06)', borderRadius: 6, border: '1px solid rgba(177,30,106,0.15)' }}><Text type="secondary" style={{ fontSize: 12, color: '#B11E6A' }}>{adviceText}</Text></div>) : null;
                  }}
                </Form.Item>}
                {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms}>
                  {({ getFieldValue }) => {
                    const pt = getFieldValue('paymentTerms');
                    if (pt === '50_ADVANCE_50_AFTER') return <Form.Item label="Payment Reminder Date" name="paymentReminderDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>;
                    if (pt === 'CREDIT_10_30') return <Form.Item label="Credit Due Date" name="paymentReminderDate" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>;
                    return null;
                  }}
                </Form.Item>}
              </Card>

              {orderEditTarget?.orderCategory !== 'SAMPLE' && (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><DollarOutlined style={{ color: '#52c41a' }} /><span>Payment Collection</span></Space>}>
                  <Form.List name="paymentCollection">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={8}><Form.Item {...rest} name={[name, 'paymentMethod']} label="Method" style={{ marginBottom: 0 }} rules={[{ required: true }]}><Select placeholder="Select method" size="small">{COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}</Select></Form.Item></Col>
                              <Col xs={24} sm={8}><Form.Item {...rest} name={[name, 'paidAmount']} label="Amount (₹)" style={{ marginBottom: 0 }}><InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="e.g. 5000" /></Form.Item></Col>
                              <Col xs={24} sm={6}><Form.Item {...rest} name={[name, 'notes']} label="Notes" style={{ marginBottom: 0 }}><Input size="small" placeholder="Ref / notes" /></Form.Item></Col>
                              <Col xs={24} sm={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}><Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} /></Col>
                            </Row>
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue: gfv }) => {
                                const proof = gfv(['paymentCollection', name, 'proof']);
                                if (!proof?.url) return null;
                                return (
                                  <a href={proof.url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: '#1890ff', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '3px 8px', borderRadius: 6, background: 'rgba(24,144,255,0.06)', border: '1px solid rgba(24,144,255,0.2)' }}>
                                    <FileTextOutlined style={{ fontSize: 11 }} />{proof.name || 'View Proof'} ↗
                                  </a>
                                );
                              }}
                            </Form.Item>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 8 }}>+ Add Payment Entry</Button>
                      </>
                    )}
                  </Form.List>
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const rawColl = getFieldValue('paymentCollection');
                      const collection = Array.isArray(rawColl) ? rawColl : [];
                      const collTotal = collection.reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                      const existingCollTotal = (orderEditTarget?.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                      // Also consider the linked lead / quotation / negotiation paidAmount —
                      // the order may not have carried it over if created before the carry-over fix.
                      const oLeadIdStr = String(orderEditTarget?.leadId?._id || orderEditTarget?.leadId || '');
                      const oLinkedLead = oLeadIdStr ? leadsData.find(l => String(l._id || l.key) === oLeadIdStr || l.leadCode === orderEditTarget?.leadCode) : null;
                      const oLinkedQuot = findLinkedQuotation({ quotationId: orderEditTarget?.quotationId, quotationCode: orderEditTarget?.quotationCode });
                      const oLinkedNeg = orderEditTarget?.negotiationId ? negotiationsData.find(n => String(n._id || n.key) === String(orderEditTarget.negotiationId?._id || orderEditTarget.negotiationId)) : null;
                      const linkedPaid = Number(oLinkedLead?.paidAmount) || Number(oLinkedQuot?.paidAmount) || Number(oLinkedNeg?.paidAmount) || 0;
                      const basePaid = Math.max(Number(orderEditTarget?.paidAmount || 0), linkedPaid);
                      const uncapturedPaid = Math.max(0, basePaid - existingCollTotal);
                      const effectivePaid = collTotal + uncapturedPaid;
                      const prods = getFieldValue('editProducts') || [];
                      const editRec = { ...orderEditTarget, products: prods, kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [], kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice, kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty, packagingIncludes: getFieldValue('packagingIncludes') || orderEditTarget?.packagingIncludes || [], packagingIncludesQty: getFieldValue('packagingIncludesQty') || orderEditTarget?.packagingIncludesQty || {} };
                      const computedTot = r2(computeCompositionGrandTotal(editRec, kits)) || r2(computeRecordGrandTotal(editRec));
                      const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                      const amountToPay = Math.max(0, orderTotal - effectivePaid);
                      const status = orderTotal > 0 && effectivePaid >= orderTotal ? 'Paid' : effectivePaid > 0 ? 'Partially Paid' : 'Unpaid';
                      const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                      const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                      return (
                        <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                            <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                          </div>
                          <div style={{ marginTop: 8 }}><CategoryTotalsBreakdown rec={editRec} isDark={isDark} kitsData={kits} /></div>
                          {effectivePaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><Text type="secondary" style={{ fontSize: 12 }}>Collected</Text><Text strong style={{ fontSize: 13, color: '#52c41a' }}>₹{effectivePaid.toLocaleString()}</Text></div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <Text style={{ fontSize: 12, fontWeight: 700 }}>Amount to Pay</Text>
                            <Text strong style={{ fontSize: 14, color: amountToPay > 0 ? '#fa8c16' : '#52c41a' }}>₹{amountToPay.toLocaleString()}</Text>
                          </div>
                        </div>
                      );
                    }}
                  </Form.Item>
                </Card>
              )}
            </Form>
          )}
        </motion.div>

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
                {complaintOrder ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Order ID</div>
                    <div style={{ padding: '6px 12px', background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ff4d4f' }}>
                      {complaintOrder.oid}
                    </div>
                  </div>
                ) : (
                  <Form.Item label="Order ID" name="orderId" rules={[{ required: true, message: 'Please select an Order ID' }]}>
                    <Select placeholder="Select Order ID" showSearch optionFilterProp="children">
                      {ordersData.map(o => (
                        <Option key={o.oid} value={o.oid}>{o.oid} — {o.hotelName}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
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

        {renderPayEntryModal()}
        </>
      );
    }

    // ── Order edit full page — REMOVED, now inline in order-detail ──
    if (false) {
      const goBack = () => {};
      return (
        <motion.div className="page-container" style={{ paddingBottom: 60 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowRightOutlined rotate={180} />} onClick={goBack} style={{ borderRadius: 8 }}>Back</Button>
            <Button type="primary" size="large" icon={<SaveOutlined />}
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)' }}
              onClick={saveOrderEdit}
            >
              Save Changes
            </Button>
          </div>

          <div style={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 20, border: '2px solid #B11E6A33', boxShadow: '0 4px 20px rgba(177,30,106,0.08)' }}>
            <Text style={{ color: '#B11E6A', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Edit Order</Text>
            <Title level={3} style={{ color: textColor, margin: '4px 0 0', fontWeight: 700 }}>
              {orderEditTarget?.oid || orderEditTarget?.orderCode}
            </Title>
          </div>

          <Form form={orderEditForm} layout="vertical">

            {/* ── Customer Details ── */}
            <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
              title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><UserOutlined style={{ color: '#B11E6A' }} /><span>Customer Details</span></Space>}>
              <Row gutter={[12, 0]}>
                <Col xs={24} sm={12}><Form.Item label="Hotel / Client Name" name="hotelName"><Input placeholder="e.g. Grand Hotel" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Billing Name" name="billingName"><Input placeholder="Name on invoice" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Contact Person" name="contactPerson"><Input placeholder="Contact name" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone number" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="City" name="city"><Input placeholder="City" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="State" name="state"><Input placeholder="State" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Pincode" name="pincode"><Input placeholder="Pincode" /></Form.Item></Col>
                <Col xs={24}><Form.Item label="Detailed Address" name="detailedAddress"><Input.TextArea rows={2} placeholder="Street / detailed address" /></Form.Item></Col>
              </Row>
            </Card>

            {/* ── Kit Details (editable) ── */}
            {(() => {
              const editKitIds = watchedOrderEditSelKits.length > 0 ? watchedOrderEditSelKits : (orderEditTarget?.selectedKit ? [orderEditTarget.selectedKit] : []);
              const hasKitProds = (orderEditForm.getFieldValue('editProducts') || []).some(p => p?.isKit || p?.kitType);
              if (editKitIds.length === 0 && !hasKitProds) return null;
              return (
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1' }}>Kit Details</span></Space>}>
                  {editKitIds.length > 0 ? editKitIds.map((kitId, kitIndex) => {
                    const kitDef = kits.find(k => k._id === kitId);
                    const kitLabel = kitDef?.kitName || 'Personalized Kit';
                    const otherKitOpts2 = editKitIds.map(id => { const k = kits.find(kk => kk._id === id); return k ? { value: id, label: k.kitName } : null; }).filter(Boolean);
                    const sepProdOptsEdit2 = (watchedOrderEditProds).filter(p => p && !p.isKit && !p.kitType && (p.name || p.itemName)).map(p => ({ value: p.name || p.itemName || '', label: p.name || p.itemName || '—' })).filter(o => o.value);
                    const groupedKitOptsEdit2 = [...(otherKitOpts2.length > 0 ? [{ label: 'Kits', options: otherKitOpts2 }] : []), ...(sepProdOptsEdit2.length > 0 ? [{ label: 'Separate Products', options: sepProdOptsEdit2 }] : [])];
                    const flatKitOptsEdit2 = [...otherKitOpts2, ...sepProdOptsEdit2];
                    return (
                      <div key={kitId} style={{ padding: '10px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.16)', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <GiftOutlined style={{ color: '#722ed1' }} />
                          <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{kitLabel}</Text>
                        </div>
                        <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                        <Row gutter={[10, 0]}>
                          <Col xs={24} sm={8}><Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 8 }}>
                            <Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions} onChange={() => orderEditForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)} />
                          </Form.Item></Col>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit || p.kitOrders?.[kitIndex]?.displayUnitType !== c.kitOrders?.[kitIndex]?.displayUnitType}>
                            {({ getFieldValue, setFieldsValue }) => {
                              const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const subtypes = duCfg?.subtypes || [];
                              if (!subtypes.length) return null;
                              const duLabel = duCfg?.label || 'Display Unit';
                              return (
                                <Col xs={24} sm={8}><Form.Item label={`${duLabel} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 8 }}>
                                  <Select allowClear placeholder={`Select ${duLabel} type`} options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                    onChange={(val) => {
                                      const st = subtypes.find(s => s.value === val);
                                      if (st) {
                                        const path = (f) => ['kitOrders', kitIndex, f];
                                        if (st.size) orderEditForm.setFieldValue(path('size'), st.size);
                                        if (st.sticker) orderEditForm.setFieldValue(path('sticker'), st.sticker);
                                        if (st.logo) orderEditForm.setFieldValue(path('logo'), st.logo);
                                        if (st.printing) orderEditForm.setFieldValue(path('printing'), st.printing);
                                        if (st.sellingPrice != null) orderEditForm.setFieldValue(path('kitPrice'), st.sellingPrice);
                                      }
                                    }}
                                  />
                                </Form.Item></Col>
                              );
                            }}
                          </Form.Item>
                          <Col xs={12} sm={4}><Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 8 }}><Input placeholder="e.g. 2.5cm" /></Form.Item></Col>
                          <Col xs={12} sm={4}><Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 8 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                          <Col xs={12} sm={4}><Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 8 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                          <Col xs={12} sm={4}><Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 8 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                        </Row>
                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                          {({ getFieldValue }) => {
                            const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                            const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                            const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                            if (!isBox) return null;
                            return (
                              <Row gutter={[10, 0]} style={{ marginBottom: 0 }}>
                                <Col xs={12} sm={6}><Form.Item label="Lamination" name={['kitOrders', kitIndex, 'lamination']} style={{ marginBottom: 8 }}><Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                              </Row>
                            );
                          }}
                        </Form.Item>
                        <Row gutter={[10, 0]}>
                          <Col xs={12} sm={8}><Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 8 }}><InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" /></Form.Item></Col>
                          <Col xs={12} sm={8}><Form.Item label="Packing Material Price (₹)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 8 }}>
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                          </Form.Item></Col>
                        </Row>
                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.kitPrice !== c.kitOrders?.[kitIndex]?.kitPrice || p.kitOrders?.[kitIndex]?.overallQty !== c.kitOrders?.[kitIndex]?.overallQty}>
                          {({ getFieldValue }) => {
                            const single = Number(getFieldValue(['kitOrders', kitIndex, 'kitPrice'])) || 0;
                            const qty = Number(getFieldValue(['kitOrders', kitIndex, 'overallQty'])) || 0;
                            if (!single || !qty) return null;
                            return <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>Kit Amount: <Text strong style={{ color: '#722ed1' }}>₹{(single * qty).toLocaleString()}</Text> ({single.toLocaleString()} × {qty})</Text>;
                          }}
                        </Form.Item>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: '10px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.16)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <GiftOutlined style={{ color: '#722ed1' }} />
                        <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Personalized Kit</Text>
                      </div>
                      <Row gutter={[10, 0]}>
                        <Col xs={24} sm={8}><Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 8 }}><Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions} /></Form.Item></Col>
                        <Col xs={12} sm={8}><Form.Item label="Size" name="kitSize" style={{ marginBottom: 8 }}><Input placeholder="e.g. 2.5cm" /></Form.Item></Col>
                        <Col xs={12} sm={4}><Form.Item label="Sticker" name="kitSticker" style={{ marginBottom: 8 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                        <Col xs={12} sm={4}><Form.Item label="Logo" name="kitLogo" style={{ marginBottom: 8 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                        <Col xs={12} sm={4}><Form.Item label="Printing" name="kitPrinting" style={{ marginBottom: 8 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                        <Col xs={12} sm={8}><Form.Item label="Overall Qty" name="kitOverallQty" style={{ marginBottom: 8 }}><InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" /></Form.Item></Col>
                        <Col xs={12} sm={8}><Form.Item label="Packing Material Price (₹)" name="kitPrice" style={{ marginBottom: 8 }}>
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="0" formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                        </Form.Item></Col>
                      </Row>
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* ── Products ── */}
            <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
              title={<Space><div style={{ width: 4, height: 20, background: '#B11E6A', borderRadius: 2, display: 'inline-block' }} /><ShoppingCartOutlined style={{ color: '#B11E6A' }} /><span>Products</span></Space>}>
              <Form.List name="editProducts">
                {(fields, { add, remove }) => (
                  <>
                    {(() => {
                      const prodsW = watchedOrderEditProds || [];
                      const isKitRow = (n) => { const p = prodsW[n]; return !!(p && (p.isKit || p.kitType)); };
                      const grpHdr = (label, color) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0' }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, background: color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{label[0]}</span>
                          <Text strong style={{ fontSize: 12, color }}>{label}</Text>
                        </div>
                      );
                      const renderRow = ({ key, name, ...rest }) => (
                      <div key={key} style={{ background: 'rgba(177,30,106,0.02)', border: '1px solid rgba(177,30,106,0.12)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                        <Row gutter={[6, 0]} align="middle">
                          <Col xs={24} sm={8}>
                            <Form.Item {...rest} name={[name, 'name']} label="Product Name" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Name required' }]}>
                              <Input size="small" placeholder="Product name" />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item {...rest} name={[name, 'qty']} label="Qty" style={{ marginBottom: 0 }}>
                              <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item {...rest} name={[name, 'rate']} label="Rate (₹)" style={{ marginBottom: 0 }}>
                              <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item {...rest} name={[name, 'gst']} label="GST %" style={{ marginBottom: 0 }}>
                              <InputNumber size="small" style={{ width: '100%' }} min={0} max={100} placeholder="0" />
                            </Form.Item>
                          </Col>
                          <Col xs={20} sm={3}>
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue }) => {
                                const prods = getFieldValue('editProducts') || [];
                                const p = prods[name] || {};
                                const amt = r2((Number(p.qty) || 0) * (Number(p.rate) || 0) * (1 + (Number(p.gst) || 0) / 100));
                                return <div style={{ paddingTop: 22, fontSize: 12, color: '#B11E6A', fontWeight: 600, textAlign: 'right' }}>₹{amt.toLocaleString()}</div>;
                              }}
                            </Form.Item>
                          </Col>
                          <Col xs={4} sm={1} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                          </Col>
                        </Row>
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) => renderOrderEditProductSpecs((getFieldValue('editProducts') || [])[name])}
                        </Form.Item>
                      </div>
                      );
                      const kitFields = fields.filter(f => isKitRow(f.name));
                      const sepFields = fields.filter(f => !isKitRow(f.name));
                      return (
                        <>
                          {kitFields.length > 0 && grpHdr('Kit Products', '#722ed1')}
                          {kitFields.map(renderRow)}
                          {sepFields.length > 0 && grpHdr('Separate Products', '#B11E6A')}
                          {sepFields.map(renderRow)}
                        </>
                      );
                    })()}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ name: '', qty: 1, rate: 0, gst: 0 })} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 8 }}>
                      + Add Product
                    </Button>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const prods = getFieldValue('editProducts') || [];
                        const sepProds = prods.filter(p => p && !p.isKit && !p.kitType);
                        const subtotal = sepProds.reduce((s, p) => s + (Number(p?.qty) || 0) * (Number(p?.rate) || 0), 0);
                        const gstAmt = sepProds.reduce((s, p) => s + (Number(p?.qty) || 0) * (Number(p?.rate) || 0) * ((Number(p?.gst) || 0) / 100), 0);
                        const total = r2(computeRecordGrandTotal({
                          ...orderEditTarget,
                          products: prods,
                          kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [],
                          kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice,
                          kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty,
                        }));
                        if (total === 0) return null;
                        const kitPortion = Math.max(0, total - r2(subtotal + gstAmt) - (orderEditTarget?.forwardingCharge ? r2(Number(orderEditTarget?.forwardingChargeAmount) || 0) : 0));
                        return (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '6px 10px', background: 'rgba(177,30,106,0.04)', borderRadius: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                            {kitPortion > 0 && <Text type="secondary" style={{ fontSize: 12 }}>Kit: <strong>₹{kitPortion.toLocaleString()}</strong></Text>}
                            {subtotal > 0 && <Text type="secondary" style={{ fontSize: 12 }}>Separate: <strong>₹{r2(subtotal).toLocaleString()}</strong></Text>}
                            {gstAmt > 0 && <Text type="secondary" style={{ fontSize: 12 }}>GST: <strong>₹{r2(gstAmt).toLocaleString()}</strong></Text>}
                            <Text style={{ fontSize: 13, color: '#B11E6A', fontWeight: 700 }}>Total: ₹{total.toLocaleString()}</Text>
                          </div>
                        );
                      }}
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Card>

            {/* ── Delivery & Payment ── */}
            <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
              title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><CalendarOutlined style={{ color: '#fa8c16' }} /><span>Delivery & Payment</span></Space>}>
              <Form.Item label="Expected Delivery Date" name="expectedDelivery" rules={[{ required: true, message: 'Select delivery date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item label="Payment Terms" name="paymentTerms" rules={[{ required: true }]}>
                <Select onChange={(val) => {
                  const prods = orderEditForm.getFieldValue('editProducts') || [];
                  const computedTot = r2(computeRecordGrandTotal({
                    ...orderEditTarget,
                    products: prods,
                    kitOrders: orderEditForm.getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [],
                    kitPrice: orderEditForm.getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice,
                    kitOverallQty: orderEditForm.getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty,
                  }));
                  const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                  let suggestedAdvance = 0;
                  if (val === 'BEFORE_100') suggestedAdvance = orderTotal;
                  else if (val === 'ON_DISPATCH' || val === '50_ADVANCE_50_AFTER') suggestedAdvance = r2(orderTotal * 0.5);
                  else if (val === 'CREDIT_10_30') suggestedAdvance = 0;
                  orderEditForm.setFieldValue('advance', suggestedAdvance);
                }}>
                  {PAYMENT_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>}
              {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms || prev.editProducts !== cur.editProducts || prev.kitOrders !== cur.kitOrders}>
                {({ getFieldValue }) => {
                  const pt = getFieldValue('paymentTerms');
                  const prods = getFieldValue('editProducts') || [];
                  const computedTot = r2(computeRecordGrandTotal({
                    ...orderEditTarget,
                    products: prods,
                    kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [],
                    kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice,
                    kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty,
                  }));
                  const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                  let adviceText = '';
                  if (pt === 'BEFORE_100') adviceText = `Full payment — expected: ₹${orderTotal.toLocaleString()}`;
                  else if (pt === 'ON_DISPATCH') adviceText = `50% advance — expected: ₹${r2(orderTotal * 0.5).toLocaleString()}`;
                  else if (pt === '50_ADVANCE_50_AFTER') adviceText = `50% advance — expected: ₹${r2(orderTotal * 0.5).toLocaleString()}`;
                  else if (pt === 'CREDIT_10_30') adviceText = 'Credit terms — advance: ₹0';
                  return adviceText ? (
                    <div style={{ marginTop: -10, marginBottom: 12, padding: '6px 10px', background: 'rgba(177,30,106,0.06)', borderRadius: 6, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 12, color: '#B11E6A' }}>{adviceText}</Text>
                    </div>
                  ) : null;
                }}
              </Form.Item>}
              {orderEditTarget?.orderCategory !== 'SAMPLE' && <Form.Item noStyle shouldUpdate={(prev, cur) => prev.paymentTerms !== cur.paymentTerms}>
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
              </Form.Item>}
            </Card>

            {orderEditTarget?.orderCategory !== 'SAMPLE' && (
              <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                title={<Space><div style={{ width: 4, height: 20, background: '#52c41a', borderRadius: 2, display: 'inline-block' }} /><DollarOutlined style={{ color: '#52c41a' }} /><span>Payment Collection</span></Space>}>
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
                          <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue: gfv }) => {
                              const proof = gfv(['paymentCollection', name, 'proof']);
                              if (!proof?.url) return null;
                              return (
                                <a href={proof.url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 11, color: '#1890ff', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '3px 8px', borderRadius: 6, background: 'rgba(24,144,255,0.06)', border: '1px solid rgba(24,144,255,0.2)' }}>
                                  <FileTextOutlined style={{ fontSize: 11 }} />{proof.name || 'View Proof'} ↗
                                </a>
                              );
                            }}
                          </Form.Item>
                        </div>
                      ))}
                      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 8 }}>
                        + Add Payment Entry
                      </Button>
                    </>
                  )}
                </Form.List>

                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const rawColl = getFieldValue('paymentCollection');
                    const collection = Array.isArray(rawColl) ? rawColl : [];
                    const collTotal = collection.reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                    const existingCollTotal = (orderEditTarget?.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                    const uncapturedPaid = Math.max(0, Number(orderEditTarget?.paidAmount || 0) - existingCollTotal);
                    const effectivePaid = collTotal + uncapturedPaid;
                    const prods = getFieldValue('editProducts') || [];
                    const editRec2 = { ...orderEditTarget, products: prods, kitOrders: getFieldValue('kitOrders') || orderEditTarget?.kitOrders || [], kitPrice: getFieldValue('kitPrice') ?? orderEditTarget?.kitPrice, kitOverallQty: getFieldValue('kitOverallQty') ?? orderEditTarget?.kitOverallQty, packagingIncludes: getFieldValue('packagingIncludes') || orderEditTarget?.packagingIncludes || [], packagingIncludesQty: getFieldValue('packagingIncludesQty') || orderEditTarget?.packagingIncludesQty || {} };
                    const computedTot = r2(computeCompositionGrandTotal(editRec2, kits)) || r2(computeRecordGrandTotal(editRec2));
                    const orderTotal = computedTot > 0 ? computedTot : (orderEditTarget?.total || orderEditTarget?.totalAmount || 0);
                    const amountToPay = Math.max(0, orderTotal - effectivePaid);
                    const status = orderTotal > 0 && effectivePaid >= orderTotal ? 'Paid' : effectivePaid > 0 ? 'Partially Paid' : 'Unpaid';
                    const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                    const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                    return (
                      <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                          <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <CategoryTotalsBreakdown rec={editRec2} isDark={isDark} kitsData={kits} />
                        </div>
                        {effectivePaid > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Collected</Text>
                            <Text strong style={{ fontSize: 13, color: '#52c41a' }}>₹{effectivePaid.toLocaleString()}</Text>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <Text style={{ fontSize: 12, fontWeight: 700 }}>Amount to Pay</Text>
                          <Text strong style={{ fontSize: 14, color: amountToPay > 0 ? '#fa8c16' : '#52c41a' }}>₹{amountToPay.toLocaleString()}</Text>
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>
              </Card>
            )}
          </Form>
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
                    <Col xs={24} sm={12}><Form.Item label="Contact Person" name="contactPerson"><Input placeholder="Contact name" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone number" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Email" name="email"><Input placeholder="Email address" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true, message: 'Detailed Address is required' }]}><Input.TextArea rows={1} /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Pincode" name="pincode"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Alt. Contact Name" name="alternativeName"><Input placeholder="Alternative contact" /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Alt. Contact Role" name="alternativeRole"><Input placeholder="Role / designation" /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Alt. Phone" name="alternativePhone"><Input placeholder="Alt. phone number" /></Form.Item></Col>
                  </Row>
                </Card>

                {/* ── Products adding — kit config (mirrors Lead form) ── */}
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span>Products adding</span></Space>}>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Product Selection" name="productType" tooltip="Personalized = a kit customized with extra products; Separate Product = individual items.">
                        <Select mode="multiple" allowClear placeholder="Select product types (optional)" options={PRODUCT_SELECTION_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Select Kit(s) to Include" name="selectedKits" tooltip="Pick kits defined in Inventory → Kit.">
                        <Select mode="multiple" allowClear showSearch optionFilterProp="label"
                          placeholder={kitOptions.length ? 'Select kits to include' : 'No kits yet — add in Inventory → Kit'}
                          options={kitOptions}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item noStyle shouldUpdate={(p, c) => JSON.stringify(p.productType) !== JSON.stringify(c.productType)}>
                    {({ getFieldValue }) => {
                      const pt = getFieldValue('productType');
                      if (!ptHasPersonalizedUI(pt)) return null;
                      return (
                        <>
                          <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                                <Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions}
                                  onChange={() => quotationForm.setFieldValue('kitDisplayUnitType', undefined)} />
                              </Form.Item>
                            </Col>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                              {({ getFieldValue: gfv }) => {
                                const du = gfv('kitDisplayUnit');
                                const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                const subtypes = duCfg?.subtypes || [];
                                if (!subtypes.length) return null;
                                const duLabel = duCfg?.label || 'Display Unit';
                                return (
                                  <Col xs={12} sm={4}>
                                    <Form.Item label={`${duLabel} Type`} name="kitDisplayUnitType" style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder={`${duLabel} type`}
                                        options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                        onChange={(val) => {
                                          const st = subtypes.find(s => s.value === val);
                                          if (st) {
                                            const patch = {};
                                            if (st.size) patch.kitSize = st.size;
                                            if (st.sticker) patch.kitSticker = st.sticker;
                                            if (st.logo) patch.kitLogo = st.logo;
                                            if (st.printing) patch.kitPrinting = st.printing;
                                            if (st.lamination) patch.kitLamination = st.lamination;
                                            if (st.sellingPrice != null) patch.kitPrice = st.sellingPrice;
                                            quotationForm.setFieldsValue(patch);
                                          }
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>
                                );
                              }}
                            </Form.Item>
                            <Col xs={12} sm={4}><Form.Item label="Size" name="kitSize" style={{ marginBottom: 0 }}><Input placeholder="e.g. 2.5cm x 2.5cm" /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Sticker" name="kitSticker" style={{ marginBottom: 0 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Logo" name="kitLogo" style={{ marginBottom: 0 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Printing" name="kitPrinting" style={{ marginBottom: 0 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                          </Row>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                            {({ getFieldValue: gfv }) => {
                              const du = gfv('kitDisplayUnit');
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                              if (!isBox) return null;
                              return (
                                <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                                  <Col xs={12} sm={6}>
                                    <Form.Item label="Lamination" name="kitLamination" style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              );
                            }}
                          </Form.Item>
                          <Row gutter={16} style={{ marginTop: 10 }} align="bottom">
                            <Col xs={12} sm={5}>
                              <Form.Item label="Overall Qty" name="kitOverallQty" style={{ marginBottom: 0 }}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={9}>
                              <Form.Item label="Packing Material Price (₹)" name="kitPrice" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Single kit price"
                                  formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                  parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                              </Form.Item>
                            </Col>
                          </Row>
                          {/* Per-kit Order Details blocks */}
                          <Form.Item noStyle shouldUpdate={(p, c) => JSON.stringify(p.selectedKits) !== JSON.stringify(c.selectedKits)}>
                            {({ getFieldValue: gfv }) => {
                              const selKits = gfv('selectedKits') || [];
                              if (!selKits.length) return null;
                              return (
                                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {selKits.map((kitId, kitIndex) => {
                                    const kitDef = kits.find(k => k._id === kitId);
                                    const kitLabel = kitDef?.kitName || 'Kit';
                                    return (
                                      <div key={kitId} style={{ padding: '12px 14px', background: isDark ? 'rgba(114,46,209,0.07)' : 'rgba(114,46,209,0.04)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.18)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                          <GiftOutlined style={{ color: '#722ed1' }} />
                                          <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{kitLabel} — Order Details</Text>
                                        </div>
                                        <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                                        <Row gutter={[8, 8]}>
                                          <Col xs={12} sm={4}>
                                            <Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 0 }}>
                                              <Select allowClear showSearch optionFilterProp="label" placeholder="Display unit" options={configDisplayUnitOptions}
                                                onChange={() => quotationForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)} />
                                            </Form.Item>
                                          </Col>
                                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                                            {({ getFieldValue: gfv2 }) => {
                                              const du2 = gfv2(['kitOrders', kitIndex, 'displayUnit']);
                                              const duCfg2 = configDisplayUnitOptions.find(c => c.value === du2);
                                              const subtypes2 = duCfg2?.subtypes || [];
                                              if (!subtypes2.length) return null;
                                              const duLabel2 = duCfg2?.label || 'Display Unit';
                                              return (
                                                <Col xs={12} sm={4}>
                                                  <Form.Item label={`${duLabel2} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 0 }}>
                                                    <Select allowClear placeholder={`${duLabel2} type`}
                                                      options={subtypes2.map(s => ({ value: s.value, label: s.label }))}
                                                      onChange={(val) => {
                                                        const st2 = subtypes2.find(s => s.value === val);
                                                        if (st2) {
                                                          const p2 = (f) => ['kitOrders', kitIndex, f];
                                                          if (st2.size) quotationForm.setFieldValue(p2('size'), st2.size);
                                                          if (st2.sticker) quotationForm.setFieldValue(p2('sticker'), st2.sticker);
                                                          if (st2.logo) quotationForm.setFieldValue(p2('logo'), st2.logo);
                                                          if (st2.printing) quotationForm.setFieldValue(p2('printing'), st2.printing);
                                                          if (st2.lamination) quotationForm.setFieldValue(p2('lamination'), st2.lamination);
                                                          if (st2.sellingPrice != null) quotationForm.setFieldValue(p2('kitPrice'), st2.sellingPrice);
                                                        }
                                                      }}
                                                    />
                                                  </Form.Item>
                                                </Col>
                                              );
                                            }}
                                          </Form.Item>
                                          <Col xs={12} sm={4}><Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 0 }}><Input placeholder="e.g. 2.5cm" /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                        </Row>
                                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                                          {({ getFieldValue: gfv3 }) => {
                                            const du3 = gfv3(['kitOrders', kitIndex, 'displayUnit']);
                                            const duCfg3 = configDisplayUnitOptions.find(c => c.value === du3);
                                            const isBox3 = duCfg3?.label?.toLowerCase().includes('box') || duCfg3?.tabMapping === 'Box';
                                            if (!isBox3) return null;
                                            return (
                                              <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                                                <Col xs={12} sm={6}><Form.Item label="Lamination" name={['kitOrders', kitIndex, 'lamination']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                              </Row>
                                            );
                                          }}
                                        </Form.Item>
                                        <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
                                          <Col xs={12} sm={5}><Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 0 }}><InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" /></Form.Item></Col>
                                          <Col xs={24} sm={9}><Form.Item label="Packing Material Price (₹)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 0 }}>
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0"
                                              formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                              parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                                          </Form.Item></Col>
                                        </Row>
                                        <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
                                          <Col xs={24}><Form.Item label="Specification / Notes" name={['kitOrders', kitIndex, 'specification']} style={{ marginBottom: 0 }}><Input.TextArea rows={2} placeholder="Kit specification notes..." /></Form.Item></Col>
                                        </Row>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }}
                          </Form.Item>
                        </>
                      );
                    }}
                  </Form.Item>
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Products & Specifications</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} packingMaterialOptions={configPackingMaterialOptions} />
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
                  title={<Space><div style={{ width: 4, height: 20, background: '#1e3799', borderRadius: 2, display: 'inline-block' }} /><BankOutlined style={{ color: '#1e3799' }} /><span>Customer Details</span></Space>}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}><Form.Item label="Contact Person" name="contactPerson"><Input placeholder="Contact name" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone number" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Email" name="email"><Input placeholder="Email address" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Location" name="location"><Input placeholder="Location" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Billing Name" name="billingName"><Input placeholder="Billing name" /></Form.Item></Col>
                  </Row>
                </Card>

                {/* ── Products adding — kit config (mirrors Lead form) ── */}
                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} /><GiftOutlined style={{ color: '#722ed1' }} /><span>Products adding</span></Space>}>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Product Selection" name="productType" tooltip="Personalized = a kit customized with extra products; Separate Product = individual items.">
                        <Select mode="multiple" allowClear placeholder="Select product types (optional)" options={PRODUCT_SELECTION_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Select Kit(s) to Include" name="selectedKits">
                        <Select mode="multiple" allowClear showSearch optionFilterProp="label"
                          placeholder={kitOptions.length ? 'Select kits to include' : 'No kits yet — add in Inventory → Kit'}
                          options={kitOptions}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item noStyle shouldUpdate={(p, c) => JSON.stringify(p.productType) !== JSON.stringify(c.productType)}>
                    {({ getFieldValue }) => {
                      const pt = getFieldValue('productType');
                      if (!ptHasPersonalizedUI(pt)) return null;
                      return (
                        <>
                          <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                                <Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions}
                                  onChange={() => negotiationForm.setFieldValue('kitDisplayUnitType', undefined)} />
                              </Form.Item>
                            </Col>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                              {({ getFieldValue: gfv }) => {
                                const du = gfv('kitDisplayUnit');
                                const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                const subtypes = duCfg?.subtypes || [];
                                if (!subtypes.length) return null;
                                const duLabel = duCfg?.label || 'Display Unit';
                                return (
                                  <Col xs={12} sm={4}>
                                    <Form.Item label={`${duLabel} Type`} name="kitDisplayUnitType" style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder={`${duLabel} type`}
                                        options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                        onChange={(val) => {
                                          const st = subtypes.find(s => s.value === val);
                                          if (st) {
                                            const patch = {};
                                            if (st.size) patch.kitSize = st.size;
                                            if (st.sticker) patch.kitSticker = st.sticker;
                                            if (st.logo) patch.kitLogo = st.logo;
                                            if (st.printing) patch.kitPrinting = st.printing;
                                            if (st.lamination) patch.kitLamination = st.lamination;
                                            if (st.sellingPrice != null) patch.kitPrice = st.sellingPrice;
                                            negotiationForm.setFieldsValue(patch);
                                          }
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>
                                );
                              }}
                            </Form.Item>
                            <Col xs={12} sm={4}><Form.Item label="Size" name="kitSize" style={{ marginBottom: 0 }}><Input placeholder="e.g. 2.5cm x 2.5cm" /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Sticker" name="kitSticker" style={{ marginBottom: 0 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Logo" name="kitLogo" style={{ marginBottom: 0 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                            <Col xs={8} sm={4}><Form.Item label="Printing" name="kitPrinting" style={{ marginBottom: 0 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                          </Row>
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                            {({ getFieldValue: gfv }) => {
                              const du = gfv('kitDisplayUnit');
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                              if (!isBox) return null;
                              return (
                                <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                                  <Col xs={12} sm={6}>
                                    <Form.Item label="Lamination" name="kitLamination" style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              );
                            }}
                          </Form.Item>
                          <Row gutter={16} style={{ marginTop: 10 }} align="bottom">
                            <Col xs={12} sm={5}>
                              <Form.Item label="Overall Qty" name="kitOverallQty" style={{ marginBottom: 0 }}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={9}>
                              <Form.Item label="Packing Material Price (₹)" name="kitPrice" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Single kit price"
                                  formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                  parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                              </Form.Item>
                            </Col>
                          </Row>
                          {/* Per-kit Order Details blocks */}
                          <Form.Item noStyle shouldUpdate={(p, c) => JSON.stringify(p.selectedKits) !== JSON.stringify(c.selectedKits)}>
                            {({ getFieldValue: gfv }) => {
                              const selKits = gfv('selectedKits') || [];
                              if (!selKits.length) return null;
                              return (
                                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {selKits.map((kitId, kitIndex) => {
                                    const kitDef = kits.find(k => k._id === kitId);
                                    const kitLabel = kitDef?.kitName || 'Kit';
                                    return (
                                      <div key={kitId} style={{ padding: '12px 14px', background: isDark ? 'rgba(114,46,209,0.07)' : 'rgba(114,46,209,0.04)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.18)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                          <GiftOutlined style={{ color: '#722ed1' }} />
                                          <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{kitLabel} — Order Details</Text>
                                        </div>
                                        <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                                        <Row gutter={[8, 8]}>
                                          <Col xs={12} sm={4}>
                                            <Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 0 }}>
                                              <Select allowClear showSearch optionFilterProp="label" placeholder="Display unit" options={configDisplayUnitOptions}
                                                onChange={() => negotiationForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)} />
                                            </Form.Item>
                                          </Col>
                                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                                            {({ getFieldValue: gfv2 }) => {
                                              const du2 = gfv2(['kitOrders', kitIndex, 'displayUnit']);
                                              const duCfg2 = configDisplayUnitOptions.find(c => c.value === du2);
                                              const subtypes2 = duCfg2?.subtypes || [];
                                              if (!subtypes2.length) return null;
                                              const duLabel2 = duCfg2?.label || 'Display Unit';
                                              return (
                                                <Col xs={12} sm={4}>
                                                  <Form.Item label={`${duLabel2} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 0 }}>
                                                    <Select allowClear placeholder={`${duLabel2} type`}
                                                      options={subtypes2.map(s => ({ value: s.value, label: s.label }))}
                                                      onChange={(val) => {
                                                        const st2 = subtypes2.find(s => s.value === val);
                                                        if (st2) {
                                                          const p2 = (f) => ['kitOrders', kitIndex, f];
                                                          if (st2.size) negotiationForm.setFieldValue(p2('size'), st2.size);
                                                          if (st2.sticker) negotiationForm.setFieldValue(p2('sticker'), st2.sticker);
                                                          if (st2.logo) negotiationForm.setFieldValue(p2('logo'), st2.logo);
                                                          if (st2.printing) negotiationForm.setFieldValue(p2('printing'), st2.printing);
                                                          if (st2.lamination) negotiationForm.setFieldValue(p2('lamination'), st2.lamination);
                                                          if (st2.sellingPrice != null) negotiationForm.setFieldValue(p2('kitPrice'), st2.sellingPrice);
                                                        }
                                                      }}
                                                    />
                                                  </Form.Item>
                                                </Col>
                                              );
                                            }}
                                          </Form.Item>
                                          <Col xs={12} sm={4}><Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 0 }}><Input placeholder="e.g. 2.5cm" /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                          <Col xs={8} sm={4}><Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                        </Row>
                                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                                          {({ getFieldValue: gfv3 }) => {
                                            const du3 = gfv3(['kitOrders', kitIndex, 'displayUnit']);
                                            const duCfg3 = configDisplayUnitOptions.find(c => c.value === du3);
                                            const isBox3 = duCfg3?.label?.toLowerCase().includes('box') || duCfg3?.tabMapping === 'Box';
                                            if (!isBox3) return null;
                                            return (
                                              <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                                                <Col xs={12} sm={6}><Form.Item label="Lamination" name={['kitOrders', kitIndex, 'lamination']} style={{ marginBottom: 0 }}><Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} /></Form.Item></Col>
                                              </Row>
                                            );
                                          }}
                                        </Form.Item>
                                        <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
                                          <Col xs={12} sm={5}><Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 0 }}><InputNumber min={1} style={{ width: '100%' }} placeholder="Total kits" /></Form.Item></Col>
                                          <Col xs={24} sm={9}><Form.Item label="Packing Material Price (₹)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 0 }}>
                                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0"
                                              formatter={v => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                              parser={v => (v || '').replace(/[₹,\s]/g, '')} />
                                          </Form.Item></Col>
                                        </Row>
                                        <Row gutter={[8, 0]} style={{ marginTop: 8 }}>
                                          <Col xs={24}><Form.Item label="Specification / Notes" name={['kitOrders', kitIndex, 'specification']} style={{ marginBottom: 0 }}><Input.TextArea rows={2} placeholder="Kit specification notes..." /></Form.Item></Col>
                                        </Row>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }}
                          </Form.Item>
                        </>
                      );
                    }}
                  </Form.Item>
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#fa8c16', borderRadius: 2, display: 'inline-block' }} /><span>Products & Revised Rates</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} packingMaterialOptions={configPackingMaterialOptions} />
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
                    <Col xs={24} sm={12}><Form.Item label="Contact Person" name="contactPerson"><Input placeholder="Contact name" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone number" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Email" name="email"><Input placeholder="Email address" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GSTIN" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Location" name="location" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Detailed Address" name="detailedAddress" rules={[{ required: true }]}><Input.TextArea rows={1} /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="City" name="city"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="State" name="state"><Input /></Form.Item></Col>
                    <Col xs={24} sm={8}><Form.Item label="Pincode" name="pincode"><Input /></Form.Item></Col>
                  </Row>
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} /><span>Products & Quantities</span></Space>}>
                  <ProductHeaders />
                  <ProductFormList fieldName="products" showSpecs={true} inventoryItems={inventoryItems} inventoryItemsData={inventoryItemsRaw} kits={kits} packingMaterialOptions={configPackingMaterialOptions} />
                </Card>

                <Card style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span>Urgent / Emergency Deliveries (Partial)</span></Space>}>
                  <Form.List name="splitDates">
                    {(fields, { add, remove }) => (
                      <div>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #ff4d4f33' }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={6}>
                                <Form.Item {...rest} name={[name, 'date']} label="Partial Date" style={{ marginBottom: 6 }}>
                                  <DatePicker style={{ width: '100%' }} size="small" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={7}>
                                <Form.Item {...rest} name={[name, 'product']} label="Product" style={{ marginBottom: 6 }}>
                                  <Select
                                    size="small"
                                    placeholder="Select product"
                                    allowClear
                                    onChange={(val) => {
                                      if (val === '__kit__') {
                                        const kitProds = (Array.isArray(watchedOrderProducts) ? watchedOrderProducts : [])
                                          .filter(p => p?.isKit || p?.kitType);
                                        const qtys = kitProds.map(p => Number(p.qty) || 0).filter(q => q > 0);
                                        if (qtys.length > 0) orderForm.setFieldValue(['splitDates', name, 'qty'], Math.min(...qtys));
                                      } else {
                                        const matched = (Array.isArray(watchedOrderProducts) ? watchedOrderProducts : [])
                                          .find(p => (p.name || p.kitType) === val);
                                        if (matched?.qty) orderForm.setFieldValue(['splitDates', name, 'qty'], matched.qty);
                                      }
                                    }}
                                  >
                                    {(Array.isArray(watchedOrderProducts) ? watchedOrderProducts : []).some(p => p?.isKit || p?.kitType) && (
                                      <Option value="__kit__" style={{ fontWeight: 600, color: '#722ed1' }}>
                                        Kit (All Products)
                                      </Option>
                                    )}
                                    {(Array.isArray(watchedOrderProducts) ? watchedOrderProducts : []).filter(p => p?.name || p?.kitType).map((p, i) => (
                                      <Option key={i} value={p.name || p.kitType}>{p.name || p.kitType}</Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={4}>
                                <Form.Item {...rest} name={[name, 'qty']} label="Qty" style={{ marginBottom: 6 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} min={1} placeholder="Qty" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={5}>
                                <Form.Item {...rest} name={[name, 'note']} label="Notes" style={{ marginBottom: 6 }}>
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
                      else if (val === 'ON_DISPATCH' || val === '50_ADVANCE_50_AFTER') adv = r2(total * 0.5);
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
                      else if (pt === 'ON_DISPATCH') adviceText = `50% advance — expected: ₹${r2(total * 0.5).toLocaleString()}`;
                      else if (pt === '50_ADVANCE_50_AFTER') adviceText = `50% advance — expected: ₹${r2(total * 0.5).toLocaleString()}`;
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

    // Combined payment history for lead: merges lead + linked order + linked quotation + linked
    // negotiation entries so payments recorded in Billing (on quotation or order) also appear here.
    const linkedOrderForLead = !isAddLead && (record._id || record.key)
      ? ordersData.find(o =>
          String(o.leadId?._id || o.leadId) === String(record._id || record.key) ||
          o.leadCode === record.leadCode
        )
      : null;
    const leadCombinedPaymentCollection = (() => {
      const leadId = String(record._id || record.key || '');
      const leadCode = record.leadCode || '';
      const leadColl = record.paymentCollection || [];
      const orderColl = linkedOrderForLead?.paymentCollection || [];
      const linkedQuotForLead = !isAddLead && leadId
        ? quotationsData.find(q =>
            String(q.leadId?._id || q.leadId) === leadId || q.leadCode === leadCode
          )
        : null;
      const linkedNegForLead = !isAddLead && leadId
        ? negotiationsData.find(n =>
            String(n.leadId?._id || n.leadId) === leadId || n.leadCode === leadCode
          )
        : null;
      const quotColl = linkedQuotForLead?.paymentCollection || [];
      const negColl = linkedNegForLead?.paymentCollection || [];
      const extra = [...orderColl, ...quotColl, ...negColl].filter(xe =>
        !leadColl.some(le => le.recordedAt === xe.recordedAt && Number(le.paidAmount) === Number(xe.paidAmount))
      );
      return [...leadColl, ...extra.map(e => ({ ...e, _fromLinked: true }))];
    })();

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
      <>
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
                {record.leadId && !record.customerId && !linkedOrderForLead && (
                  <>
                    <Button icon={<FileTextOutlined />}
                      style={{ background: '#B11E6A', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => startQuotationFromLead(record)}
                    >Convert to Quotation</Button>
                    <Button icon={<ArrowRightOutlined />}
                      style={{ background: '#722ed1', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => convertLeadToNegotiation(record)}
                    >Convert to Negotiation</Button>
                    <Popconfirm
                      title="Convert to Sample?"
                      description="Creates a new sample order with all products at qty 1. The lead stays unchanged."
                      onConfirm={() => convertLeadToSample(record)}
                      okText="Create Sample"
                      cancelText="Cancel"
                      okButtonProps={{ style: { background: '#722ed1', borderColor: '#722ed1' } }}
                    >
                      <Button icon={<ExperimentOutlined />} style={{ borderRadius: 8, color: '#722ed1', borderColor: '#722ed155' }}>
                        Convert to Sample
                      </Button>
                    </Popconfirm>
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
                    <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('hotel'); }} style={{ borderRadius: 6 }}>Edit</Button>
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
                      {record.priority > 0 && (
                        <Descriptions.Item label="Priority Level">
                          <Progress percent={record.priority} size="small" strokeColor="#B11E6A" style={{ maxWidth: 200, display: 'inline-block' }} />
                        </Descriptions.Item>
                      )}
                      {record.priorityNote && <Descriptions.Item label="Priority Note">{record.priorityNote}</Descriptions.Item>}
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
                          onChange={(val) => {
                            if (val !== 'NEW') leadForm.setFieldValue('leadType', undefined);
                            // Clear auto-filled hotel lookup fields when switching hotel type
                            // to prevent stale OLD hotel data appearing for a NEW hotel entry (and vice versa)
                            leadForm.setFieldsValue({
                              hotelName: undefined,
                              billingName: undefined,
                              contactPerson: undefined,
                              pocDesignation: undefined,
                              phone: undefined,
                              email: undefined,
                              location: undefined,
                              destination: undefined,
                              gstNumber: undefined,
                              branch: undefined,
                              alternativeRole: undefined,
                              alternativeName: undefined,
                              alternativePhone: undefined,
                              generalOccupancy: undefined,
                              rowsInHotel: undefined,
                              hotelLogo: [],
                            });
                          }}
                        >
                          <Option value="OLD">Old Hotel</Option>
                          <Option value="NEW">New Hotel</Option>
                        </Select>
                      </Form.Item>
                    </Col>
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
                      <Form.Item label="No. of Rooms" name="rowsInHotel" rules={[{ required: true, message: 'No. of Rooms is required' }]}>
                        <InputNumber placeholder="50" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="General Occupancy (%)" name="generalOccupancy" rules={[{ required: true, message: 'General Occupancy is required' }]}>
                        <InputNumber placeholder="e.g. 75" style={{ width: '100%' }} min={0} max={100} addonAfter="%" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Billing Name" name="billingName" rules={[{ required: true, message: 'Billing Name is required' }]}>
                        <Input placeholder="e.g. HOTEL BLUESTAR" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Contact Person" name="contactPerson" rules={[{ required: true, message: 'Contact Person is required' }]}>
                        <Input placeholder="Reception / Manager" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="POC Designation" name="pocDesignation" rules={[{ required: true, message: 'POC Designation is required' }]}>
                        <Input placeholder="GM, Manager" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Phone is required' }, phoneValidator(true)]}>
                        <PhoneInput placeholder="Phone number" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Role" name="alternativeRole" rules={[{ required: true, message: 'Alternative Role is required' }]}>
                        <SelectWithAdd field="alternativeRole" defaultOptions={ALTERNATIVE_PERSON_OPTIONS} placeholder="Select / Add Role" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Name" name="alternativeName" rules={[{ required: true, message: 'Alternative Name is required' }]}>
                        <Input placeholder="Full Name" prefix={<UserOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Alternative Number" name="alternativePhone" rules={[{ required: true, message: 'Alternative Number is required' }, phoneValidator(false)]}>
                        <PhoneInput placeholder="Alternative number" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={8}>
                      <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Email is required' }, ...emailRules(false)]}>
                        <Input placeholder="Email address" prefix={<MailOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Location / City" name="location" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Coimbatore" prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Form.Item label="Destination" name="destination" rules={[{ required: true, message: 'Destination is required' }]}>
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
                      <Form.Item label="Source" name="source" rules={[{ required: true, message: 'Source is required' }]}>
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
                        <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('billing'); }} style={{ borderRadius: 6 }}>Edit</Button>
                      )
                    )}
                  >
                    {usePerCardEdit && editingSection !== 'billing' ? (
                      <Row gutter={[24, 12]}>
                        {record.leadType !== 'SAMPLE' && <Col xs={24} sm={12}><InfoRow label="Bill Type" value={record.billType === 'GST' ? 'GST Bill' : 'Non-GST'} /></Col>}
                        {record.leadType !== 'SAMPLE' && record.billType === 'GST' && (
                          <Col xs={24} sm={12}><InfoRow label="GSTIN" value={record.gstNumber} /></Col>
                        )}
                        {record.leadType !== 'SAMPLE' && record.billType === 'GST' && record.gstPhone && (
                          <Col xs={24} sm={12}><InfoRow label="Phone Number" value={record.gstPhone} /></Col>
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
                        <Col xs={24} sm={12}>
                          <Form.Item label="Pincode" name="pincode" rules={[{ pattern: /^[0-9]*$/, message: 'Pincode must contain only numbers' }]}>
                            <Input placeholder="Pincode" maxLength={6} inputMode="numeric" />
                          </Form.Item>
                        </Col>
                        {watchedLeadType !== 'SAMPLE' && (
                          <Col xs={24} sm={12}><Form.Item label="Bill Type" name="billType"><Select placeholder="Select Bill Type" allowClear><Option value="GST">GST Bill</Option><Option value="NON_GST">Without GST</Option></Select></Form.Item></Col>
                        )}
                        {watchedLeadType !== 'SAMPLE' && watchedBillType === 'GST' && (
                          <>
                            <Col xs={24} sm={12}>
                              <Form.Item label="GST Number" name="gstNumber">
                                <Input
                                  placeholder="GSTIN (e.g. 27AAACG2115R1ZN)"
                                  maxLength={15}
                                  style={{ textTransform: 'uppercase' }}
                                  suffix={
                                    <Button
                                      size="small"
                                      type="link"
                                      loading={gstAddApiLoading}
                                      onClick={() => fetchGstDetailsForLead(leadForm.getFieldValue('gstNumber'))}
                                      style={{ color: '#B11E6A', padding: '0 4px', fontSize: 12 }}
                                    >
                                      {gstAddApiLoading ? '' : 'Verify'}
                                    </Button>
                                  }
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="Phone Number" name="gstPhone" rules={[phoneValidator(false)]}>
                                <PhoneInput placeholder="Phone number" />
                              </Form.Item>
                            </Col>
                            {/* GST verification result shown below the GST field */}
                            {gstAddApiError && !gstAddApiLoading && (
                              <Col xs={24}>
                                <div style={{ marginTop: -8, marginBottom: 12, padding: '8px 12px', background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 8 }}>
                                  <Text style={{ color: '#ff4d4f', fontSize: 12 }}>{gstAddApiError}</Text>
                                </div>
                              </Col>
                            )}
                            {gstAddApiData && !gstAddApiLoading && (() => {
                              const addr = gstAddApiData.address || {};
                              const building = addr.bnm  || addr.building || '';
                              const door     = addr.bno  || addr.door     || '';
                              const floor    = addr.flno || addr.floor    || '';
                              const street   = addr.st   || addr.street   || '';
                              const locality = addr.loc  || addr.location || '';
                              const district = addr.dst  || addr.district || '';
                              const state    = addr.stcd || addr.state    || gstAddApiData.stj || '';
                              const pincode  = addr.pncd || addr.pincode  ? String(addr.pncd || addr.pincode) : '';
                              const fullAddr = [building, door, floor, street, locality, district, state, pincode].filter(Boolean).join(', ');
                              return (
                                <Col xs={24}>
                                  <div style={{ marginTop: -8, marginBottom: 12, padding: '14px 16px', background: 'rgba(177,30,106,0.04)', border: '1px solid rgba(177,30,106,0.18)', borderRadius: 10 }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                      <Text style={{ color: '#B11E6A', fontWeight: 700, fontSize: 13 }}>GST Verified — Auto-Filled</Text>
                                      {gstAddApiData.sts && (
                                        <Tag color={gstAddApiData.sts === 'Active' ? 'success' : 'error'} style={{ borderRadius: 10, margin: 0 }}>
                                          {gstAddApiData.sts}
                                        </Tag>
                                      )}
                                    </div>

                                    {/* Core GST fields */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 20px', marginBottom: 10 }}>
                                      {[
                                        { label: 'GSTIN',                          value: gstAddApiData.gstin,         mono: true },
                                        { label: 'Legal Name → Billing Name',      value: gstAddApiData.lgnm,          filled: true },
                                        { label: 'Trade Name → Hotel Name',        value: gstAddApiData.tradeNam,      filled: true },
                                        { label: 'Taxpayer Type',                  value: gstAddApiData.ctb },
                                        { label: 'Registration Date',              value: gstAddApiData.rgdt },
                                        { label: 'State → State field',            value: gstAddApiData.stj,           filled: true },
                                        { label: 'e-Invoice Status',               value: gstAddApiData.einvoiceStatus },
                                      ].filter(f => f.value).map((f, i) => (
                                        <div key={i} style={{ borderBottom: '1px solid rgba(177,30,106,0.07)', padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
                                          <Text type="secondary" style={{ fontSize: 10 }}>{f.label}</Text>
                                          <Text style={{ fontSize: 12, fontFamily: f.mono ? 'monospace' : undefined, color: f.mono ? '#B11E6A' : f.filled ? '#389e0d' : undefined, fontWeight: f.filled ? 600 : 400 }}>
                                            {f.value}
                                          </Text>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Address breakdown */}
                                    {fullAddr && (
                                      <div style={{ borderTop: '1px solid rgba(177,30,106,0.1)', paddingTop: 8, marginBottom: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>Registered Address → Detailed Address, City, State, Pincode, Location</Text>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 20px', marginTop: 4 }}>
                                          {[
                                            { label: 'Building',  value: building },
                                            { label: 'Door/Unit', value: door },
                                            { label: 'Floor',     value: floor },
                                            { label: 'Street',    value: street },
                                            { label: 'Locality → Location field', value: locality, filled: true },
                                            { label: 'District → City field',     value: district, filled: true },
                                            { label: 'State',     value: state,    filled: true },
                                            { label: 'PIN Code → Pincode field',  value: pincode,  filled: true },
                                          ].filter(f => f.value).map((f, i) => (
                                            <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(177,30,106,0.05)' }}>
                                              <Text type="secondary" style={{ fontSize: 10 }}>{f.label}: </Text>
                                              <Text style={{ fontSize: 12, color: f.filled ? '#389e0d' : undefined, fontWeight: f.filled ? 600 : 400 }}>
                                                {f.value}
                                              </Text>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Summary note */}
                                    <div style={{ background: 'rgba(56,158,13,0.06)', border: '1px solid rgba(56,158,13,0.2)', borderRadius: 6, padding: '6px 10px' }}>
                                      <Text style={{ fontSize: 11, color: '#389e0d' }}>
                                        Auto-filled: Billing Name, Hotel Name (if empty), Detailed Address, City, State, Pincode, Location.
                                      </Text>
                                      <br />
                                      <Text type="secondary" style={{ fontSize: 10 }}>
                                        Phone &amp; Email are not part of GST registration data — please fill them manually.
                                      </Text>
                                    </div>
                                  </div>
                                </Col>
                              );
                            })()}
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
                        <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('leadStatus'); }} style={{ borderRadius: 6 }}>Edit</Button>
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
                        {record.quotationNo && (
                          <div style={{ padding: '8px 12px', background: isDark ? 'rgba(177,30,106,0.06)' : 'rgba(177,30,106,0.04)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.2)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>QUOTATION REFERENCE</Text>
                            <Space size={16} wrap>
                              <span><Text type="secondary" style={{ fontSize: 11 }}>No: </Text><Text strong style={{ fontSize: 13, color: '#B11E6A' }}>{record.quotationNo}</Text></span>
                              {record.quotationDate && <span><Text type="secondary" style={{ fontSize: 11 }}>Date: </Text><Text strong style={{ fontSize: 13 }}>{dayjs(record.quotationDate).format('DD MMM YYYY')}</Text></span>}
                            </Space>
                          </div>
                        )}
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
                        <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('leadJourney'); }} style={{ borderRadius: 6 }}>Edit</Button>
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

              {/* GST API Details — detail view only, when GSTIN is on the record */}
              {isDetail && record.gstNumber && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                  title={
                    <Space>
                      <div style={{ width: 4, height: 20, background: '#722ed1', borderRadius: 2, display: 'inline-block' }} />
                      <BankOutlined style={{ color: '#722ed1' }} />
                      <span>GST API Details</span>
                      {!gstApiLoading && (
                        <Button size="small" type="text" icon={<HistoryOutlined />} style={{ color: '#722ed1' }} onClick={() => fetchGstDetails(record.gstNumber)}>Refresh</Button>
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
                        <Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{record.gstNumber}</Text>
                      </div>
                    </div>
                  )}
                  {gstApiData && !gstApiLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'GSTIN', value: gstApiData.gstin || record.gstNumber, mono: true },
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
                      {gstApiData.address && typeof gstApiData.address === 'object' && (
                        <div style={{ paddingTop: 8, marginTop: 4, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Registered Address</Text>
                          <Text style={{ fontSize: 12, lineHeight: 1.6, color: textColor }}>
                            {[
                              gstApiData.address.bnm  || gstApiData.address.building,
                              gstApiData.address.bno  || gstApiData.address.door,
                              gstApiData.address.flno || gstApiData.address.floor,
                              gstApiData.address.st   || gstApiData.address.street,
                              gstApiData.address.loc  || gstApiData.address.location,
                              gstApiData.address.dst  || gstApiData.address.district,
                              gstApiData.address.stcd || gstApiData.address.state,
                              gstApiData.address.pncd || gstApiData.address.pincode,
                            ].filter(Boolean).join(', ')}
                          </Text>
                        </div>
                      )}
                    </div>
                  )}
                  {!gstApiData && !gstApiLoading && !gstApiError && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>GST details load automatically.<br />Click Refresh to reload.</Text>
                    </div>
                  )}
                </Card>
              )}

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
                      <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('personalization'); }} style={{ borderRadius: 6 }}>Edit</Button>
                    )
                  )}
                >
                  {usePerCardEdit && editingSection !== 'personalization' ? (() => {
                    const effectiveKitIdsView = Array.isArray(record.selectedKits) && record.selectedKits.length > 0
                      ? record.selectedKits
                      : (record.selectedKit ? [record.selectedKit] : []);
                    const kitName = effectiveKitIdsView.length > 0
                      ? effectiveKitIdsView.map(id => kits.find(k => k._id === id)?.kitName || id).join(', ')
                      : null;
                    const isKitType = ptHasKitUI(record.productType);
                    // Derive kit products: prefer dedicated kitProducts field, fall back to isKit products in
                    // the products array (set by applyKitsToForm), then fall back to the kit definition itself.
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
                      const firstKitDef = effectiveKitIdsView.length > 0 ? kits.find(k => k._id === effectiveKitIdsView[0]) : null;
                      return (firstKitDef?.products || []).map(p => ({
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
                                  ? record.productType.map(productTypeLabel).join(', ')
                                  : productTypeLabel(record.productType))
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
                          {record.kitSticker && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Sticker" value={record.kitSticker === 'YES' ? 'Yes' : 'No'} />
                            </Col>
                          )}
                          {record.kitLogo && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Logo" value={record.kitLogo === 'YES' ? 'Yes' : 'No'} />
                            </Col>
                          )}
                          {record.kitPrinting && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Printing" value={record.kitPrinting === 'YES' ? 'Yes' : 'No'} />
                            </Col>
                          )}
                          {(record.kitPrice != null && record.kitPrice !== '') && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Packing Material Price (single)" value={`₹${Number(record.kitPrice).toLocaleString()}`} />
                            </Col>
                          )}
                          {(Number(record.kitOverallQty) > 0) && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Overall Qty" value={`${Number(record.kitOverallQty)} kit${Number(record.kitOverallQty) > 1 ? 's' : ''}`} />
                            </Col>
                          )}
                          {(record.kitPrice != null && record.kitPrice !== '') && (
                            <Col xs={12} sm={6}>
                              <InfoRow label="Kit Amount" value={`₹${(Number(record.kitPrice) * (Number(record.kitOverallQty) || 1)).toLocaleString()}`} />
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
                    <>
                      {/* Product Selection first, then Kit selector — always visible */}
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Product Selection" name="productType" tooltip="Personalized = a kit customized with extra products; Separate Product = individual items. Kits selected via 'Select Kit(s) to Include' can be marked inside personalized packaging using 'Included in Kit Packaging'.">
                            <Select
                              mode="multiple"
                              allowClear
                              placeholder="Select product types (optional)"
                              options={PRODUCT_SELECTION_OPTIONS}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Select Kit(s) to Include" name="selectedKits" tooltip="Pick kits defined in Inventory → Kit. Their products auto-fill in Order Details below.">
                            <Select
                              mode="multiple"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              placeholder={kitOptions.length ? 'Select kits to include' : 'No kits yet — add in Inventory → Kit'}
                              options={kitOptions}
                              onChange={(vals) => applyKitsToForm(vals || [])}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      {/* Per-kit Category + Display Unit — set at CREATE time so each selected kit can be
                          a Personalized kit OR a Separate Kit with its OWN display unit (e.g. a Dental kit
                          set to Ziplock that is packed inside a personalized Box). Operations routes each
                          kit to its own design tab by these values; the top-level Display Unit below is the
                          personalized OUTER packaging. */}
                      {(watchedSelectedKits || []).length > 0 && (
                        <div style={{ marginTop: 4, marginBottom: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                            EACH KIT — CATEGORY &amp; DISPLAY UNIT
                          </Text>
                          {(watchedSelectedKits || []).map((kitId, kIdx) => {
                            const kDef = kits.find((k) => k._id === kitId);
                            return (
                              <Row key={kitId} gutter={12} align="bottom" style={{ marginBottom: 8, padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.15)' }}>
                                <Col xs={24} sm={8}>
                                  <Text strong style={{ color: '#722ed1', fontSize: 13 }}><GiftOutlined /> {kDef?.kitName || `Kit ${kIdx + 1}`}</Text>
                                  <Form.Item name={['kitOrders', kIdx, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                                </Col>
                                <Col xs={12} sm={8}>
                                  <Form.Item label="Kit Category" name={['kitOrders', kIdx, 'category']} style={{ marginBottom: 0 }}
                                    tooltip="Personalized = part of the personalized outer packaging. Separate Kit = assembled in its own display unit (its own design tab).">
                                    <Select
                                      options={[
                                        { value: ORDER_CATEGORIES.PERSONALIZED, label: 'Personalized' },
                                        { value: ORDER_CATEGORIES.SEPARATE_KIT, label: 'Separate Kit' },
                                      ]}
                                    />
                                  </Form.Item>
                                </Col>
                                <Col xs={12} sm={8}>
                                  <Form.Item label="Display Unit" name={['kitOrders', kIdx, 'displayUnit']} style={{ marginBottom: 0 }}
                                    tooltip="This kit's own packaging — drives which Operations design tab (Box / Ziplock / Butter Paper) it routes to.">
                                    <Select allowClear showSearch optionFilterProp="label" placeholder="Display unit" options={configDisplayUnitOptions} />
                                  </Form.Item>
                                </Col>
                              </Row>
                            );
                          })}
                        </div>
                      )}
                      {/* Kit customization specs — only for Personalized kits (a Separate Kit is bought as-is). */}
                      {ptHasPersonalizedUI(watchedProductType) && (
                        <>
                        {/* Row 1: All 6 kit config fields in one line */}
                        <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                          <Col xs={12} sm={4}>
                            <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                              <Select
                                allowClear showSearch optionFilterProp="label"
                                placeholder="Select display unit"
                                options={configDisplayUnitOptions}
                                onChange={() => leadForm.setFieldValue('kitDisplayUnitType', undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.kitDisplayUnit !== cur.kitDisplayUnit}>
                            {({ getFieldValue, setFieldsValue }) => {
                              const du = getFieldValue('kitDisplayUnit');
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const subtypes = duCfg?.subtypes || [];
                              if (!subtypes.length) return null;
                              const duLabel = duCfg?.label || 'Display Unit';
                              return (
                                <Col xs={12} sm={4}>
                                  <Form.Item label={`${duLabel} Type`} name="kitDisplayUnitType" style={{ marginBottom: 0 }}>
                                    <Select
                                      allowClear placeholder={`${duLabel} type`}
                                      options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                      onChange={(val) => {
                                        const st = subtypes.find(s => s.value === val);
                                        if (st) {
                                          const patch = {};
                                          if (st.size) patch.kitSize = st.size;
                                          if (st.sticker) patch.kitSticker = st.sticker;
                                          if (st.logo) patch.kitLogo = st.logo;
                                          if (st.printing) patch.kitPrinting = st.printing;
                                          if (st.lamination) patch.kitLamination = st.lamination;
                                          if (st.sellingPrice != null) patch.kitPrice = st.sellingPrice;
                                          setFieldsValue(patch);
                                        }
                                      }}
                                    />
                                  </Form.Item>
                                </Col>
                              );
                            }}
                          </Form.Item>
                          <Col xs={12} sm={4}>
                            <Form.Item label="Size" name="kitSize" style={{ marginBottom: 0 }}>
                              <Input placeholder="e.g. 2.5cm x 2.5cm" />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item label="Sticker" name="kitSticker" style={{ marginBottom: 0 }}>
                              <Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item label="Logo" name="kitLogo" style={{ marginBottom: 0 }}>
                              <Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                            </Form.Item>
                          </Col>
                          <Col xs={8} sm={4}>
                            <Form.Item label="Printing" name="kitPrinting" style={{ marginBottom: 0 }}>
                              <Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                            </Form.Item>
                          </Col>
                        </Row>
                        {/* Lamination — shown only for box-type display units */}
                        <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit}>
                          {({ getFieldValue }) => {
                            const du = getFieldValue('kitDisplayUnit');
                            const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                            const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                            if (!isBox) return null;
                            return (
                              <Row gutter={[8, 0]} style={{ marginTop: 4 }}>
                                <Col xs={12} sm={6}>
                                  <Form.Item label="Lamination" name="kitLamination" style={{ marginBottom: 0 }}>
                                    <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                  </Form.Item>
                                </Col>
                              </Row>
                            );
                          }}
                        </Form.Item>
                        {/* Row 2: Qty, Price, Total */}
                        <Row gutter={16} style={{ marginTop: 10 }} align="bottom">
                          <Col xs={12} sm={5}>
                            <Form.Item label="Overall Qty" name="kitOverallQty" style={{ marginBottom: 0 }} tooltip="Total number of kits ordered.">
                              <InputNumber min={1} style={{ width: '100%' }} placeholder="Total kit count" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={9}>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.kitDisplayUnit !== c.kitDisplayUnit || p.kitDisplayUnitType !== c.kitDisplayUnitType}>
                              {({ getFieldValue }) => {
                                const du = getFieldValue('kitDisplayUnit');
                                const duType = getFieldValue('kitDisplayUnitType');
                                const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                const st = (duCfg?.subtypes || []).find(s => s.value === duType);
                                const minPrice = st ? (Number(st.purchasePrice) || 0) + (Number(st.marginAmount) || 0) : 0;
                                return (
                                  <>
                                    <Form.Item label="Packing Material Price (₹) (Included with GST)" name="kitPrice" style={{ marginBottom: 0 }}
                                      tooltip="Auto-filled from packing config selling price. Cannot go below purchase + margin cost. Price is inclusive of GST."
                                      rules={minPrice > 0 ? [{ validator: (_, val) => (val != null && Number(val) < minPrice) ? Promise.reject(`Min ₹${minPrice} (₹${st.purchasePrice||0} purchase + ₹${st.marginAmount||0} margin)`) : Promise.resolve() }] : []}
                                    >
                                      <InputNumber
                                        min={minPrice || 0}
                                        style={{ width: '100%' }}
                                        placeholder={st?.sellingPrice > 0 ? `Selling: ₹${st.sellingPrice}` : 'Single kit price'}
                                        formatter={(v) => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                        parser={(v) => (v || '').replace(/[₹,\s]/g, '')}
                                      />
                                    </Form.Item>
                                    {st && minPrice > 0 && (
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                        Min: ₹{minPrice} (₹{st.purchasePrice||0} purchase + ₹{st.marginAmount||0} margin) | Sell: ₹{st.sellingPrice||0} (Included with GST)
                                      </Text>
                                    )}
                                    {(() => {
                                      const prodSum = computeKitPriceSum();
                                      const curKit = Number(leadForm.getFieldValue('kitPrice') || 0);
                                      return (
                                        <Button type="link" size="small" style={{ padding: 0, marginTop: 2, height: 'auto', fontSize: 12 }} onClick={() => leadForm.setFieldValue('kitPrice', prodSum)}>
                                          Σ Products: ₹{prodSum.toLocaleString()} · Kit ₹{curKit.toLocaleString()} + Products ₹{prodSum.toLocaleString()} = ₹{(curKit + prodSum).toLocaleString()}
                                        </Button>
                                      );
                                    })()}
                                  </>
                                );
                              }}
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={10}>
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue }) => {
                                const formData = {
                                  kitPrice: getFieldValue('kitPrice'),
                                  kitOverallQty: getFieldValue('kitOverallQty'),
                                  packagingIncludes: getFieldValue('packagingIncludes'),
                                  packagingIncludesQty: getFieldValue('packagingIncludesQty'),
                                  kitOrders: getFieldValue('kitOrders'),
                                  products: getFieldValue('products'),
                                };
                                const comp = computePersonalizedComposition(formData, kits);
                                const single = Number(formData.kitPrice) || 0;
                                const qty = Number(formData.kitOverallQty) || 1;
                                const kitAmt = single * qty;
                                return (
                                  <div style={{ padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.06)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.2)' }}>
                                    <div>
                                      <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.6, display: 'block' }}>KIT AMOUNT</Text>
                                      <Text strong style={{ fontSize: 15, color: '#722ed1' }}>₹{kitAmt.toLocaleString()}</Text>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>₹{single.toLocaleString()} × {qty} kit{qty > 1 ? 's' : ''}</Text>
                                    </div>
                                    {comp.ownKitProdsTotal > 0 && (
                                      <>
                                        <div style={{ borderTop: '1px solid rgba(114,46,209,0.15)', margin: '5px 0' }} />
                                        <div>
                                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#B11E6A', letterSpacing: 0.6, display: 'block' }}>PRODUCTS (×{qty})</Text>
                                          <Text strong style={{ fontSize: 15, color: '#B11E6A' }}>₹{comp.ownKitProdsTotal.toLocaleString()}</Text>
                                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>₹{comp.ownKitProdsPerPers.toLocaleString()} per kit × {qty}</Text>
                                        </div>
                                      </>
                                    )}
                                    {(comp.ownKitProdsTotal > 0 || comp.includedKits.length > 0 || comp.includedSepProds.length > 0) && (
                                      <>
                                        <div style={{ borderTop: '1px solid rgba(114,46,209,0.15)', margin: '5px 0' }} />
                                        <div>
                                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#52c41a', letterSpacing: 0.6, display: 'block' }}>TOTAL PERSONALIZED</Text>
                                          <Text strong style={{ fontSize: 17, color: '#52c41a' }}>₹{comp.totalPersonalized.toLocaleString()}</Text>
                                          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>₹{comp.totalPerPersKit.toLocaleString()} per kit × {qty}</Text>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              }}
                            </Form.Item>
                          </Col>
                        </Row>
                        {/* Single "Included in Kit Packaging" section — only when Personalized is selected */}
                        {ptHasPersonalized(watchedProductType) && (() => {
                          const kitOpts = watchedSelectedKits
                            .map(id => { const k = kits.find(kk => kk._id === id); return k ? { value: id, label: k.kitName } : null; })
                            .filter(Boolean);
                          const prodOpts = (watchedLeadProducts || [])
                            .filter(p => p && !p.isKit && !p.kitType && (p.name || p.itemName))
                            .map(p => ({ value: p.name || p.itemName || '', label: p.name || p.itemName || '—' }))
                            .filter((o, i, arr) => arr.findIndex(x => x.value === o.value) === i);
                          const groupedOpts = [
                            ...(kitOpts.length > 0 ? [{ label: 'Kits', options: kitOpts }] : []),
                            ...(prodOpts.length > 0 ? [{ label: 'Separate Products', options: prodOpts }] : []),
                          ];
                          return (
                            <div style={{ marginTop: 12 }}>
                              <Divider style={{ margin: '8px 0 10px', fontSize: 12, color: '#722ed1', borderColor: 'rgba(114,46,209,0.2)' }}>
                                <Space><AppstoreOutlined style={{ color: '#722ed1' }} /><span style={{ color: '#722ed1', fontWeight: 600 }}>Included in Kit Packaging</span></Space>
                              </Divider>
                              <Form.Item name="packagingIncludes" style={{ marginBottom: 6 }} tooltip="Select kits and products packed inside the personalized kit. Remaining quantities go as separate orders.">
                                <Select mode="multiple" allowClear showSearch optionFilterProp="label"
                                  placeholder={groupedOpts.length > 0 ? 'Select kits / products packed inside the personalized kit' : 'Add kits or separate products first'}
                                  options={groupedOpts}
                                />
                              </Form.Item>
                              <Form.Item noStyle shouldUpdate={(p, c) =>
                                JSON.stringify(p.packagingIncludes) !== JSON.stringify(c.packagingIncludes) ||
                                JSON.stringify(p.packagingIncludesQty) !== JSON.stringify(c.packagingIncludesQty) ||
                                p.kitOverallQty !== c.kitOverallQty
                              }>
                                {({ getFieldValue }) => {
                                  const sel = getFieldValue('packagingIncludes') || [];
                                  if (!sel.length) return null;
                                  const overallQty = Number(getFieldValue('kitOverallQty')) || 1;
                                  return (
                                    <div style={{ padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.15)' }}>
                                      <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', display: 'block', marginBottom: 6 }}>
                                        QTY INSIDE PERSONALIZED KITS — enter "Per kit" (× {overallQty} kit{overallQty > 1 ? 's' : ''}) or override "Total"
                                      </Text>
                                      {sel.map(id => {
                                        const kMatch = kits.find(k => k._id === id);
                                        const sProd = (watchedLeadProducts || []).find(p => p && (p.name || p.itemName) === id);
                                        const label = kMatch?.kitName || sProd?.name || sProd?.itemName || id;
                                        const isKit = Boolean(kMatch);
                                        // totalInside = total going into ALL personalized kits combined (persisted source of truth)
                                        const totalInside = Number(getFieldValue(['packagingIncludesQty', id])) || 1;
                                        // perKitDisplay = how many of this item go inside ONE personalized kit (helper that drives the total).
                                        // Blank when the total is still the untouched default so the user can type a fresh per-kit count.
                                        const perKitDisplay = (totalInside <= 1 && overallQty > 1)
                                          ? undefined
                                          : (overallQty > 0 ? r2(totalInside / overallQty) : totalInside);
                                        const standaloneQty = isKit
                                          ? (Number(watchedKitOrders.find(ko => ko?.kitId === id)?.overallQty) || 0)
                                          : (Number((watchedLeadProducts || []).find(p => p && (p.name || p.itemName) === id)?.qty) || 0);
                                        const netQty = Math.max(0, standaloneQty - totalInside);
                                        const isOver = standaloneQty > 0 && totalInside > standaloneQty;
                                        return (
                                          <Row key={id} align="middle" gutter={8} style={{ marginBottom: 6 }}>
                                            <Col flex="1">
                                              <Text style={{ fontSize: 12 }}>{label}</Text>
                                              {standaloneQty > 0 && (
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                                  Total ordered: {standaloneQty} → In personalized: {totalInside} → Separate: <Text strong style={{ color: isOver ? '#ff4d4f' : '#52c41a' }}>{netQty}</Text>
                                                </Text>
                                              )}
                                              {isOver && <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block' }}>⚠ Over by {totalInside - standaloneQty}</Text>}
                                            </Col>
                                            <Col>
                                              <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 9, display: 'block', lineHeight: 1.1 }}>Per kit</Text>
                                                <InputNumber
                                                  min={0}
                                                  size="small"
                                                  style={{ width: 64 }}
                                                  placeholder="qty"
                                                  value={perKitDisplay}
                                                  onChange={(v) => {
                                                    const perKit = Number(v) || 0;
                                                    leadForm.setFieldValue(['packagingIncludesQty', id], perKit > 0 ? perKit * (overallQty || 1) : 1);
                                                  }}
                                                />
                                              </div>
                                            </Col>
                                            <Col>
                                              <div style={{ textAlign: 'center' }}>
                                                <Text type="secondary" style={{ fontSize: 9, display: 'block', lineHeight: 1.1 }}>Total</Text>
                                                <Form.Item name={['packagingIncludesQty', id]} initialValue={1} noStyle>
                                                  <InputNumber min={1} size="small" style={{ width: 70 }} />
                                                </Form.Item>
                                              </div>
                                            </Col>
                                          </Row>
                                        );
                                      })}
                                    </div>
                                  );
                                }}
                              </Form.Item>
                            </div>
                          );
                        })()}
                        </>
                      )}
                    </>
                  )}
                </Card>
              )}

              {/* ── Order Details Products ────────────────────────────── */}
              {showProductsCard && (() => {
                const latestCustomerOrder = (isDetail && record.customerId)
                  ? ordersData.filter(o => o.hotelName === record.hotelName).slice(-1)[0]
                  : null;

                // In detail view the productType Form.Item isn't rendered so Form.useWatch
                // returns undefined; fall back to the record's saved value.
                const effectiveProductType = watchedProductType ?? record.productType;
                const hasKit = ptHasKitUI(effectiveProductType);
                const hasSeparate = ptHasSeparateUI(effectiveProductType);

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
                          <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('products'); }} style={{ borderRadius: 6 }}>Edit</Button>
                        )
                      }
                    >
                      {editingSection === 'products' ? (
                        <>
                        {/* ── Per-kit Order Details (Display Unit, Size, Sticker, Logo, Printing, Price, Includes) ── */}
                        {(() => {
                          // In detail view the selectedKits Form.Item is not rendered, so Form.useWatch
                          // may return [] even when the lead has kit data. Fall back to record directly.
                          const inlineKitIds = (watchedSelectedKits.length > 0 ? watchedSelectedKits : null)
                            || (Array.isArray(record.selectedKits) && record.selectedKits.length > 0 ? record.selectedKits : null)
                            || (record.selectedKit ? [record.selectedKit] : []);
                          const inlineHasKit = ptHasKitUI(record.productType) || inlineKitIds.length > 0;
                          if (!inlineHasKit || inlineKitIds.length === 0) return null;
                          return (
                          <div style={{ marginBottom: 16 }}>
                            {inlineKitIds.map((kitId, kitIndex) => {
                              const kitDefInline = kits.find(k => k._id === kitId);
                              const kitCardNameInline = kitDefInline?.kitName || 'Personalized Kit';
                              // Separate Kit = as-is → hide customization specs; Personalized shows them.
                              const koCatInline = watchedKitOrders[kitIndex]?.category
                                || (record.kitOrders || [])[kitIndex]?.category
                                || defaultKitCategory(record.productType);
                              const showKitCustomInline = koCatInline === ORDER_CATEGORIES.PERSONALIZED;
                              const otherKitOptsInline = inlineKitIds.map(id => {
                                const k = kits.find(kk => kk._id === id);
                                return k ? { value: id, label: k.kitName } : null;
                              }).filter(Boolean);
                              const sepProdOptsInline = (watchedLeadProducts || [])
                                .filter(p => p && !p.isKit && !p.kitType && (p.name || p.itemName))
                                .map(p => ({ value: p.name || p.itemName || '', label: p.name || p.itemName || '—' }))
                                .filter(o => o.value);
                              const groupedOptsInline = [
                                ...(otherKitOptsInline.length > 0 ? [{ label: 'Kits', options: otherKitOptsInline }] : []),
                                ...(sepProdOptsInline.length > 0 ? [{ label: 'Separate Products', options: sepProdOptsInline }] : []),
                              ];
                              const flatOptsInline = [...otherKitOptsInline, ...sepProdOptsInline];
                              return (
                                <div key={kitId} style={{ marginBottom: 12, padding: '12px 16px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.2)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <GiftOutlined style={{ color: '#722ed1' }} />
                                    <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{kitCardNameInline} — Order Details</Text>
                                    {/* Per-kit category: a kit inside a personalized order can itself be a Separate Kit
                                        (e.g. a Dental kit packed inside the personalized Box). This drives whether it
                                        routes to its OWN display-unit tab in Operations (Separate Kit) and is shown
                                        separately from the personalized outer packing. */}
                                    <Form.Item name={['kitOrders', kitIndex, 'category']} noStyle initialValue={koCatInline}>
                                      <Select size="small" style={{ width: 160 }}
                                        options={[
                                          { value: ORDER_CATEGORIES.PERSONALIZED, label: 'Personalized' },
                                          { value: ORDER_CATEGORIES.SEPARATE_KIT, label: 'Separate Kit' },
                                        ]}
                                      />
                                    </Form.Item>
                                  </div>
                                  <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                                  <Row gutter={12} style={{ marginBottom: 10 }}>
                                    <Col xs={24} sm={5}>
                                      <Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 0 }}>
                                        <Select
                                          allowClear showSearch optionFilterProp="label" placeholder="Display unit"
                                          options={configDisplayUnitOptions}
                                          onChange={() => leadForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)}
                                        />
                                      </Form.Item>
                                    </Col>
                                    <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit || p.kitOrders?.[kitIndex]?.displayUnitType !== c.kitOrders?.[kitIndex]?.displayUnitType}>
                                      {({ getFieldValue }) => {
                                        const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                                        const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                        const subtypes = duCfg?.subtypes || [];
                                        if (!subtypes.length) return null;
                                        const duLabel = duCfg?.label || 'Display Unit';
                                        return (
                                          <Col xs={24} sm={5}>
                                            <Form.Item label={`${duLabel} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 0 }}>
                                              <Select
                                                allowClear placeholder={`${duLabel} type`}
                                                options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                                onChange={(val) => {
                                                  const st = subtypes.find(s => s.value === val);
                                                  if (st) {
                                                    if (st.size) leadForm.setFieldValue(['kitOrders', kitIndex, 'size'], st.size);
                                                    if (st.sticker) leadForm.setFieldValue(['kitOrders', kitIndex, 'sticker'], st.sticker);
                                                    if (st.logo) leadForm.setFieldValue(['kitOrders', kitIndex, 'logo'], st.logo);
                                                    if (st.printing) leadForm.setFieldValue(['kitOrders', kitIndex, 'printing'], st.printing);
                                                    if (st.lamination) leadForm.setFieldValue(['kitOrders', kitIndex, 'lamination'], st.lamination);
                                                    if (st.sellingPrice != null) leadForm.setFieldValue(['kitOrders', kitIndex, 'kitPrice'], st.sellingPrice);
                                                  }
                                                }}
                                              />
                                            </Form.Item>
                                          </Col>
                                        );
                                      }}
                                    </Form.Item>
                                    <Col xs={12} sm={4}>
                                      <Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 0 }}>
                                        <Input placeholder="e.g. 2.5cm x 2.5cm" />
                                      </Form.Item>
                                    </Col>
                                    <Col xs={12} sm={4}>
                                      <Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 0 }}>
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                      </Form.Item>
                                    </Col>
                                    <Col xs={12} sm={4}>
                                      <Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 0 }}>
                                        <Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                      </Form.Item>
                                    </Col>
                                    <Col xs={12} sm={4}>
                                      <Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 0 }}>
                                        <Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                      </Form.Item>
                                    </Col>
                                    <Col xs={12} sm={4}>
                                      <Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 0 }}>
                                        <Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                  <Row gutter={12}>
                                    <Col xs={12} sm={6}>
                                      <Form.Item label="Packing Material Price (₹)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 0 }}>
                                        <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} parser={(v) => (v || '').replace(/[₹,\s]/g, '')} />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                  {/* ── Kit total price summary (kit price × qty + included items) ── */}
                                  <Form.Item noStyle shouldUpdate>
                                    {({ getFieldValue }) => {
                                      const kPrice = Number(getFieldValue(['kitOrders', kitIndex, 'kitPrice'])) || 0;
                                      const kQty = Number(getFieldValue(['kitOrders', kitIndex, 'overallQty'])) || 1;
                                      const kAmt = kPrice * kQty;
                                      const kIncludes = getFieldValue(['kitOrders', kitIndex, 'kitIncludes']) || [];
                                      const kIncludesQty = getFieldValue(['kitOrders', kitIndex, 'kitIncludesQty']) || {};
                                      const kSepProds = (watchedLeadProducts || []).filter(p => p && !p.isKit && !p.kitType);
                                      const kIncludedBreakdown = kIncludes.map(id => {
                                        const kDefMatch = kits.find(k => k._id === id);
                                        const koMatch = kDefMatch ? watchedKitOrders.find(ko => ko?.kitId === id) : null;
                                        const pMatch = !kDefMatch ? kSepProds.find(pp => (pp.name || pp.itemName) === id) : null;
                                        if (!kDefMatch && !pMatch) return null;
                                        const incQPK = Number(kIncludesQty[id]) || 1;
                                        const totalInc = incQPK * kQty;
                                        let unitRate, totalPQ, itemName;
                                        if (kDefMatch) {
                                          unitRate = Number(koMatch?.kitPrice) || 0;
                                          totalPQ = Number(koMatch?.overallQty) || 0;
                                          itemName = kDefMatch.kitName || id;
                                        } else {
                                          unitRate = (Number(pMatch.rate)||0) * (1 + (Number(pMatch.gst)||0)/100);
                                          totalPQ = Number(pMatch.qty) || 0;
                                          itemName = pMatch.name || pMatch.itemName || id;
                                        }
                                        const incAmt = r2(totalInc * unitRate);
                                        const remQty = Math.max(0, totalPQ - totalInc);
                                        const remAmt = r2(remQty * unitRate);
                                        const isOver = totalPQ > 0 && totalInc > totalPQ;
                                        return { id, name: itemName, isKit: !!kDefMatch, incQPK, totalInc, incAmt, remQty, remAmt, isOver, totalPQ };
                                      }).filter(Boolean);
                                      const totalIncAmt = kIncludedBreakdown.reduce((s, r) => s + r.incAmt, 0);
                                      const totalSepAmt = kIncludedBreakdown.reduce((s, r) => s + r.remAmt, 0);
                                      const totalKitPrice = kAmt + totalIncAmt;
                                      if (!kPrice && !totalIncAmt) return null;
                                      return (
                                        <div style={{ marginTop: 10, padding: '8px 14px', background: isDark ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.05)', borderRadius: 10, border: '1px solid rgba(24,144,255,0.18)' }}>
                                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            {kAmt > 0 && (
                                              <div>
                                                <Text style={{ fontSize: 10, fontWeight: 700, color: '#1890ff', letterSpacing: 0.5, display: 'block' }}>KIT AMT</Text>
                                                <Text strong style={{ fontSize: 13, color: '#1890ff' }}>₹{kAmt.toLocaleString()}</Text>
                                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>₹{kPrice.toLocaleString()} × {kQty}</Text>
                                              </div>
                                            )}
                                            {kIncludedBreakdown.map(r => (
                                              <div key={r.id}>
                                                <Text style={{ fontSize: 10, fontWeight: 700, color: '#722ed1', letterSpacing: 0.5, display: 'block' }}>INCL: {r.name}{r.isKit ? ' (Kit)' : ''}</Text>
                                                <Text strong style={{ fontSize: 13, color: '#722ed1' }}>₹{r.incAmt.toLocaleString()}</Text>
                                                {r.totalPQ > 0 ? (
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                                                    {r.totalPQ} total → <Text strong style={{ color: '#722ed1' }}>{r.totalInc} personalized</Text> + <Text strong style={{ color: r.remQty > 0 ? '#fa8c16' : '#8c8c8c' }}>{r.remQty} separate</Text>
                                                    {` (${r.incQPK}×${kQty})`}
                                                  </Text>
                                                ) : (
                                                  <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{r.incQPK}/kit × {kQty} = {r.totalInc}</Text>
                                                )}
                                                {r.isOver && <Text style={{ fontSize: 10, color: '#ff4d4f', display: 'block' }}>⚠ Over-allocated by {r.totalInc - r.totalPQ}</Text>}
                                                {r.remQty > 0 && <Text style={{ fontSize: 10, color: '#fa8c16', display: 'block' }}>Separate price → ₹{r.remAmt.toLocaleString()}</Text>}
                                              </div>
                                            ))}
                                            <div style={{ borderLeft: '2px solid rgba(82,196,26,0.3)', paddingLeft: 12 }}>
                                              <Text style={{ fontSize: 10, fontWeight: 700, color: '#52c41a', letterSpacing: 0.5, display: 'block' }}>TOTAL KIT PRICE</Text>
                                              <Text strong style={{ fontSize: 15, color: '#52c41a' }}>₹{totalKitPrice.toLocaleString()}</Text>
                                              {totalSepAmt > 0 && (
                                                <>
                                                  <Text style={{ fontSize: 10, fontWeight: 700, color: '#fa8c16', letterSpacing: 0.5, display: 'block', marginTop: 4 }}>+ SEPARATE PACK</Text>
                                                  <Text strong style={{ fontSize: 13, color: '#fa8c16' }}>₹{totalSepAmt.toLocaleString()}</Text>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  </Form.Item>
                                </div>
                              );
                            })}
                          </div>
                          );
                        })()}
                        {/* ── Inline product edit ── */}
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
                                  packingMaterialOptions={configPackingMaterialOptions}
                                />
                              ))}
                              <Space style={{ width: '100%', marginTop: 8 }} direction="vertical">
                                {hasKit && (
                                  <Button
                                    type="dashed"
                                    onClick={() => {
                                      const defaultKitId = inlineKitIds.length > 0 ? inlineKitIds[0] : undefined;
                                      const defaultKitName = defaultKitId ? kits.find(k => k._id === defaultKitId)?.kitName : undefined;
                                      add({ qty: undefined, rate: undefined, isKit: true, kitId: defaultKitId, kitName: defaultKitName });
                                    }}
                                    icon={<PlusOutlined />}
                                    block
                                    style={{ borderRadius: 10, height: 40, borderColor: '#722ed155', color: '#722ed1' }}
                                  >
                                    Add Kit Product
                                  </Button>
                                )}
                                {(hasSeparate || (!hasKit && !hasSeparate)) && (
                                  <Button
                                    type="dashed"
                                    onClick={() => add({ qty: undefined, rate: undefined, isKit: false })}
                                    icon={<PlusOutlined />}
                                    block
                                    style={{ borderRadius: 10, height: 40 }}
                                  >
                                    Add Product
                                  </Button>
                                )}
                              </Space>
                            </>
                          )}
                        </Form.List>
                        </>
                      ) : (
                      <>
                        {/* Personalization badge */}
                        {record.productType && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: 'rgba(114,46,209,0.06)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.12)' }}>
                            <GiftOutlined style={{ color: '#722ed1' }} />
                            <Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 600 }}>
                              {Array.isArray(record.productType)
                                ? record.productType.map(productTypeLabel).join(' & ')
                                : productTypeLabel(record.productType)}
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
                          const effectiveViewKitIds = Array.isArray(record.selectedKits) && record.selectedKits.length > 0
                            ? record.selectedKits
                            : (record.selectedKit ? [record.selectedKit] : []);
                          const kitNameLabel = effectiveViewKitIds.length > 0
                            ? effectiveViewKitIds.map(id => kits.find(k => k._id === id)?.kitName || 'Kit').join(', ')
                            : (kitProds.length > 0 ? 'Personalized Kit' : null);
                          const renderProductCard = (p, i, globalIndex) => {
                          // Inventory-driven product attributes (shape, fragrance, bottleType, size, …)
                          // not already shown as a dedicated spec above — rendered generically so the
                          // specs entered during lead creation are never hidden in the view.
                          const SHOWN_ATTR_KEYS = new Set(['name','itemName','kitType','isKit','kitName','kitId','qty','rate','price','gst','gstPercent','unit','lineTotal','logoType','boxes','packaging','packingMaterial','material','materialCategory','hsnCode','discountPercent','discount','logo','sticker','brand','otherSpecs','size','defaultSize','specs','displayType','itemId','_id','key','amount','rateValue','total']);
                          const pExtraAttrs = Object.entries(p || {}).filter(([k, v]) => {
                            if (SHOWN_ATTR_KEYS.has(k)) return false;
                            if (k === 'productAttributes' || k === 'attachments' || k === 'kitIncludes' || k === 'kitIncludesQty' || k === 'specification') return false;
                            if (v == null || v === '') return false;
                            if (Array.isArray(v)) return v.length > 0 && v.every((x) => x == null || typeof x !== 'object');
                            return typeof v !== 'object';
                          });
                          const pProdAttrEntries = (p.productAttributes && typeof p.productAttributes === 'object' && !Array.isArray(p.productAttributes))
                            ? Object.entries(p.productAttributes).filter(([, v]) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0))
                            : [];
                          const pAttachments = (Array.isArray(p.attachments) ? p.attachments : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
                          const pSize = p.size || '';
                          const pUnit = p.unit || '';
                          const hasSpecs = p.logo || p.sticker || p.stickerPrinting || p.printing || p.packingMaterial || p.materialCategory || p.brand || p.gst || p.otherSpecs || pSize || pUnit || pExtraAttrs.length > 0 || pProdAttrEntries.length > 0 || pAttachments.length > 0 || p.specification;
                          return (
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
                                    ₹{r2((p.qty || 0) * (p.rate || 0) * (1 + (Number(p.gst) || 0) / 100)).toLocaleString()}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {p.qty || 0} pcs × ₹{p.rate || 0}{(Number(p.gst) || 0) > 0 ? ` +${p.gst}% GST` : ''}
                                  </Text>
                                </div>
                              </div>

                              {/* Specifications — flat fields + dynamic inventory-driven attributes */}
                              {hasSpecs && (
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
                                    {pSize && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Size</Text>
                                        <Text strong style={{ fontSize: 13 }}>{pSize}</Text>
                                      </Col>
                                    )}
                                    {pUnit && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Unit</Text>
                                        <Text strong style={{ fontSize: 13 }}>{pUnit}</Text>
                                      </Col>
                                    )}
                                    {pExtraAttrs.map(([k, v]) => (
                                      <Col xs={12} sm={8} key={k}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{prettyAttrKeyLead(k)}</Text>
                                        <Text strong style={{ fontSize: 13 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                                      </Col>
                                    ))}
                                    {pProdAttrEntries.map(([k, v]) => (
                                      <Col xs={12} sm={8} key={`pa-${k}`}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{prettyAttrKeyLead(k)}</Text>
                                        <Text strong style={{ fontSize: 13 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                                      </Col>
                                    ))}
                                    {p.otherSpecs && (
                                      <Col xs={12} sm={8}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Other Specs</Text>
                                        <Text style={{ fontSize: 13 }}>{p.otherSpecs}</Text>
                                      </Col>
                                    )}
                                    {p.specification && (
                                      <Col xs={24}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Specification</Text>
                                        <Text style={{ fontSize: 13 }}>{p.specification}</Text>
                                      </Col>
                                    )}
                                    {pAttachments.length > 0 && (
                                      <Col xs={24} style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>Attachments / Files</Text>
                                        <AttachmentLinks files={pAttachments} />
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              )}
                            </div>
                          );
                          };
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              {/* Single "Included in Kit Packaging" — shown when Personalized */}
                              {ptHasPersonalized(record.productType) && (() => {
                                const rawPkg = record.packagingIncludes || [];
                                if (!rawPkg.length) return null;
                                return (
                                  <div style={{ padding: '8px 12px', background: isDark ? 'rgba(114,46,209,0.08)' : 'rgba(114,46,209,0.04)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.2)' }}>
                                    <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', display: 'block', marginBottom: 6, letterSpacing: 0.6 }}>INCLUDED IN KIT PACKAGING</Text>
                                    <Space wrap size={4}>
                                      {rawPkg.map((v, i) => {
                                        const id = typeof v === 'object' ? v.id : v;
                                        const qty = typeof v === 'object' ? v.qty : null;
                                        const kMatch = kits.find(k => k._id === id);
                                        const label = kMatch?.kitName || id;
                                        return (
                                          <Tag key={i} color={kMatch ? 'purple' : 'orange'} style={{ borderRadius: 12, fontSize: 11 }}>
                                            {label}{qty && qty > 1 ? ` ×${qty}` : ''}
                                          </Tag>
                                        );
                                      })}
                                    </Space>
                                  </div>
                                );
                              })()}
                              {effectiveViewKitIds.length > 0 ? effectiveViewKitIds.map((kId, kIdx) => {
                                const kitDef = kits.find(k => k._id === kId);
                                const kCfg = (record.kitOrders || []).find(o => o.kitId === kId) || {
                                  displayUnit: record.kitDisplayUnit || record.displayUnit,
                                  size: record.kitSize,
                                  sticker: record.kitSticker,
                                  logo: record.kitLogo,
                                  printing: record.kitPrinting,
                                  overallQty: record.kitOverallQty,
                                  kitPrice: record.kitPrice,
                                };
                                const thisKitProds = kitProds.filter(p => p.kitId === kId || (!p.kitId && kIdx === 0));
                                const overallQty = Number(kCfg.overallQty) || 0;
                                const kitSingle = Number(kCfg.kitPrice) || 0;
                                return (
                                  <div key={kId} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.18)' }}>
                                      <GiftOutlined style={{ color: '#722ed1' }} />
                                      <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Kit: {kitDef?.kitName || kId}</Text>
                                      {kCfg.displayUnit && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{kCfg.displayUnit.replace(/_/g, ' ')}</Tag>}
                                      {kCfg.size && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{kCfg.size}</Tag>}
                                      {overallQty > 0 && <Tag color="blue" style={{ borderRadius: 12, fontSize: 11 }}>Qty: {overallQty}</Tag>}
                                      {kCfg.sticker && <Tag color={kCfg.sticker === 'YES' ? 'cyan' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Sticker: {kCfg.sticker === 'YES' ? 'Yes' : 'No'}</Tag>}
                                      {kCfg.logo && <Tag color={kCfg.logo === 'YES' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Logo: {kCfg.logo === 'YES' ? 'Yes' : 'No'}</Tag>}
                                      {kCfg.printing && <Tag color={kCfg.printing === 'YES' ? 'magenta' : 'default'} style={{ borderRadius: 12, fontSize: 11 }}>Printing: {kCfg.printing === 'YES' ? 'Yes' : 'No'}</Tag>}
                                      {kitSingle > 0 && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>Packing Material Price: ₹{kitSingle.toLocaleString()}</Tag>}
                                      {kitSingle > 0 && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>Kit Amount: ₹{(kitSingle * (overallQty || 1)).toLocaleString()}</Tag>}
                                    </div>
                                    {kCfg.specification && (
                                      <div style={{ padding: '6px 12px', background: isDark ? 'rgba(24,144,255,0.06)' : 'rgba(24,144,255,0.04)', borderRadius: 6, border: '1px dashed rgba(24,144,255,0.25)' }}>
                                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, display: 'block', marginBottom: 3 }}>SPECIFICATION</Text>
                                        <Text style={{ fontSize: 12 }}>{kCfg.specification}</Text>
                                      </div>
                                    )}
                                    {Array.isArray(kCfg.kitIncludes) && kCfg.kitIncludes.length > 0 && (
                                      <div style={{ padding: '6px 12px', background: isDark ? 'rgba(114,46,209,0.06)' : 'rgba(114,46,209,0.03)', borderRadius: 6, border: '1px dashed rgba(114,46,209,0.22)' }}>
                                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, display: 'block', marginBottom: 4 }}>INCLUDED IN PACKAGING</Text>
                                        <Space wrap size={4}>
                                          {kCfg.kitIncludes.map((v, i) => {
                                            const id = typeof v === 'object' ? v.id : v;
                                            const qty = typeof v === 'object' ? v.qty : null;
                                            const kMatch = kits.find(k => k._id === id);
                                            const label = kMatch ? kMatch.kitName : id;
                                            return <Tag key={i} color={kMatch ? 'purple' : 'orange'} style={{ borderRadius: 12, fontSize: 11 }}>{label}{qty && qty > 1 ? ` ×${qty}` : ''}</Tag>;
                                          })}
                                        </Space>
                                      </div>
                                    )}
                                    {Array.isArray(kCfg.attachments) && kCfg.attachments.filter((a) => a && (typeof a === 'string' ? a : a.url)).length > 0 && (
                                      <div style={{ padding: '6px 12px', background: isDark ? 'rgba(24,144,255,0.06)' : 'rgba(24,144,255,0.04)', borderRadius: 6, border: '1px dashed rgba(24,144,255,0.25)' }}>
                                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, display: 'block', marginBottom: 4 }}>KIT FILES / ATTACHMENTS</Text>
                                        <AttachmentLinks files={kCfg.attachments} />
                                      </div>
                                    )}
                                    {thisKitProds.map((p, i) => renderProductCard(p, i, i))}
                                    {overallQty > 1 && thisKitProds.length > 0 && (
                                      <div style={{ padding: '10px 14px', background: isDark ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.04)', borderRadius: 8, border: '1px solid rgba(24,144,255,0.15)' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#1890ff', display: 'block', marginBottom: 6 }}>TOTAL QUANTITIES ({overallQty} kits)</Text>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          {thisKitProds.map((p, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                              <Text type="secondary">{p.name || p.kitType || '—'}</Text>
                                              <Text>{p.qty || 0} × {overallQty} = <Text strong style={{ color: '#1890ff' }}>{(Number(p.qty) || 0) * overallQty}</Text> pcs</Text>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              }) : (
                                kitNameLabel && kitProds.length > 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 8, border: '1px solid rgba(114,46,209,0.18)' }}>
                                    <GiftOutlined style={{ color: '#722ed1' }} />
                                    <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Kit: {kitNameLabel}</Text>
                                    {(record.kitDisplayUnit || record.displayUnit) && <Tag color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{(record.kitDisplayUnit || record.displayUnit || '').replace(/_/g, ' ')}</Tag>}
                                    {record.kitSize && <Tag color="geekblue" style={{ borderRadius: 12, fontSize: 11 }}>{record.kitSize}</Tag>}
                                  </div>
                                )
                              )}
                              {effectiveViewKitIds.length === 0 && kitProds.map((p, i) => renderProductCard(p, i, i))}
                              {sepProds.length > 0 && kitProds.length > 0 && (
                                <div style={{ padding: '6px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5', borderRadius: 6 }}>
                                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>SEPARATE PRODUCTS</Text>
                                </div>
                              )}
                              {sepProds.map((p, i) => renderProductCard(p, i, kitProds.length + i))}
                            </div>
                          );
                        })()}

                        {/* Total footer — split by order-composition category */}
                        {(record.products || []).length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                              TOTAL ORDER VALUE — BY CATEGORY ({(record.products || []).length} product{(record.products || []).length !== 1 ? 's' : ''})
                            </Text>
                            <CategoryTotalsBreakdown rec={record} isDark={isDark} kitsData={kits} />
                          </div>
                        )}
                      </>
                      )}
                    </Card>
                  );
                }

                // EDIT MODE
                // Per-kit fields (kitOrders[i].displayUnit/size/overallQty) and the shared
                // fallback fields (kitDisplayUnit/kitSize) all live OUTSIDE Form.List "products"
                // so they bind to top-level form paths, not products.* paths.
                const effectiveKitIds = watchedSelectedKits.length > 0
                  ? watchedSelectedKits
                  : (watchedSingleKit ? [watchedSingleKit] : []);
                const hasAnyKit = hasKit || effectiveKitIds.length > 0;
                // Per-kit cards render once kits are selected; hide the fallback until then.
                const showFallbackKitCard = false;
                const showSeparateCard = hasSeparate;
                return (
                  <>
                    {/* One Order Details card per selected kit */}
                    {effectiveKitIds.map((kitId, kitIndex) => {
                      const kit = kits.find(k => k._id === kitId);
                      const kitCardName = kit?.kitName || 'Personalized Kit';
                      // A Separate Kit is bought as-is → hide the customization specs (display unit,
                      // size, sticker, logo, printing). Personalized kits show them all.
                      const koCat = watchedKitOrders[kitIndex]?.category || defaultKitCategory(watchedProductType);
                      const showKitCustom = koCat === ORDER_CATEGORIES.PERSONALIZED;
                      return (
                        <Card
                          key={kitId}
                          style={{ borderRadius: 14, marginBottom: 16, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: cardBg }}
                          title={
                            <Space>
                              <div style={{ width: 4, height: 20, background: '#1890ff', borderRadius: 2, display: 'inline-block' }} />
                              <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                              <span>{kitCardName} — Order Details</span>
                            </Space>
                          }
                        >
                          {/* Hidden kitId so the array stays in sync */}
                          <Form.Item name={['kitOrders', kitIndex, 'kitId']} hidden initialValue={kitId}><Input /></Form.Item>
                          {/* Row 1: All 6 kit config fields in one line */}
                          <Row gutter={[8, 8]} align="bottom" style={{ marginBottom: 10 }}>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Display Unit" name={['kitOrders', kitIndex, 'displayUnit']} style={{ marginBottom: 0 }}>
                                <Select
                                  allowClear showSearch optionFilterProp="label" placeholder="Select display unit"
                                  options={configDisplayUnitOptions}
                                  onChange={() => leadForm.setFieldValue(['kitOrders', kitIndex, 'displayUnitType'], undefined)}
                                />
                              </Form.Item>
                            </Col>
                            <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                              {({ getFieldValue }) => {
                                const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                                const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                const subtypes = duCfg?.subtypes || [];
                                if (!subtypes.length) return null;
                                const duLabel = duCfg?.label || 'Display Unit';
                                return (
                                  <Col xs={12} sm={4}>
                                    <Form.Item label={`${duLabel} Type`} name={['kitOrders', kitIndex, 'displayUnitType']} style={{ marginBottom: 0 }}>
                                      <Select
                                        allowClear placeholder={`${duLabel} type`}
                                        options={subtypes.map(s => ({ value: s.value, label: s.label }))}
                                        onChange={(val) => {
                                          const st = subtypes.find(s => s.value === val);
                                          if (st) {
                                            if (st.size) leadForm.setFieldValue(['kitOrders', kitIndex, 'size'], st.size);
                                            if (st.sticker) leadForm.setFieldValue(['kitOrders', kitIndex, 'sticker'], st.sticker);
                                            if (st.logo) leadForm.setFieldValue(['kitOrders', kitIndex, 'logo'], st.logo);
                                            if (st.printing) leadForm.setFieldValue(['kitOrders', kitIndex, 'printing'], st.printing);
                                            if (st.lamination) leadForm.setFieldValue(['kitOrders', kitIndex, 'lamination'], st.lamination);
                                            if (st.sellingPrice != null) leadForm.setFieldValue(['kitOrders', kitIndex, 'kitPrice'], st.sellingPrice);
                                          }
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>
                                );
                              }}
                            </Form.Item>
                            <Col xs={12} sm={4}>
                              <Form.Item label="Size" name={['kitOrders', kitIndex, 'size']} style={{ marginBottom: 0 }}>
                                <Input placeholder="e.g. 2.5cm x 2.5cm" />
                              </Form.Item>
                            </Col>
                            <Col xs={8} sm={4}>
                              <Form.Item label="Sticker" name={['kitOrders', kitIndex, 'sticker']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Sticker?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={8} sm={4}>
                              <Form.Item label="Logo" name={['kitOrders', kitIndex, 'logo']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Logo?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={8} sm={4}>
                              <Form.Item label="Printing" name={['kitOrders', kitIndex, 'printing']} style={{ marginBottom: 0 }}>
                                <Select allowClear placeholder="Printing?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                          </Row>
                          {/* Lamination — shown only for box-type display units */}
                          <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit}>
                            {({ getFieldValue }) => {
                              const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                              const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                              const isBox = duCfg?.label?.toLowerCase().includes('box') || duCfg?.tabMapping === 'Box';
                              if (!isBox) return null;
                              return (
                                <Row gutter={[8, 0]} style={{ marginBottom: 8 }}>
                                  <Col xs={12} sm={6}>
                                    <Form.Item label="Lamination" name={['kitOrders', kitIndex, 'lamination']} style={{ marginBottom: 0 }}>
                                      <Select allowClear placeholder="Lamination?" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              );
                            }}
                          </Form.Item>
                          {/* Row 2: Overall Qty + Kit Price + Total (kit × price + products subtotal) */}
                          <Row gutter={12} align="bottom" style={{ marginBottom: 14 }}>
                            <Col xs={12} sm={5}>
                              <Form.Item label="Overall Qty" name={['kitOrders', kitIndex, 'overallQty']} style={{ marginBottom: 0 }}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="Total qty" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={9}>
                              <Form.Item noStyle shouldUpdate={(p, c) => p.kitOrders?.[kitIndex]?.displayUnit !== c.kitOrders?.[kitIndex]?.displayUnit || p.kitOrders?.[kitIndex]?.displayUnitType !== c.kitOrders?.[kitIndex]?.displayUnitType}>
                                {({ getFieldValue }) => {
                                  const du = getFieldValue(['kitOrders', kitIndex, 'displayUnit']);
                                  const duType = getFieldValue(['kitOrders', kitIndex, 'displayUnitType']);
                                  const duCfg = configDisplayUnitOptions.find(c => c.value === du);
                                  const st = (duCfg?.subtypes || []).find(s => s.value === duType);
                                  const minPrice = st ? (Number(st.purchasePrice) || 0) + (Number(st.marginAmount) || 0) : 0;
                                  return (
                                    <>
                                      <Form.Item label="Packing Material Price (₹) (Included with GST)" name={['kitOrders', kitIndex, 'kitPrice']} style={{ marginBottom: 0 }}
                                        tooltip="Auto-filled from packing config selling price. Cannot go below purchase + margin cost. Price is inclusive of GST."
                                        rules={minPrice > 0 ? [{ validator: (_, val) => (val != null && Number(val) < minPrice) ? Promise.reject(`Min ₹${minPrice} (₹${st.purchasePrice||0} purchase + ₹${st.marginAmount||0} margin)`) : Promise.resolve() }] : []}
                                      >
                                        <InputNumber
                                          min={minPrice || 0}
                                          style={{ width: '100%' }}
                                          placeholder={st?.sellingPrice > 0 ? `Selling: ₹${st.sellingPrice}` : 'Auto-summed — editable'}
                                          formatter={(v) => v != null && v !== '' ? `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                          parser={(v) => (v || '').replace(/[₹,\s]/g, '')}
                                        />
                                      </Form.Item>
                                      {st && minPrice > 0 && (
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                          Min: ₹{minPrice} (₹{st.purchasePrice||0} purchase + ₹{st.marginAmount||0} margin) | Sell: ₹{st.sellingPrice||0} (Included with GST)
                                        </Text>
                                      )}
                                      {(() => {
                                        const prodSum = computeKitPriceForKit(kitId, kitIndex);
                                        const curKitPrice = Number(leadForm.getFieldValue(['kitOrders', kitIndex, 'kitPrice']) || 0);
                                        return (
                                          <Button type="link" size="small" style={{ padding: 0, marginTop: 2, height: 'auto', fontSize: 12 }} onClick={() => leadForm.setFieldValue(['kitOrders', kitIndex, 'kitPrice'], prodSum)}>
                                            Σ Products: ₹{prodSum.toLocaleString()} · Kit ₹{curKitPrice.toLocaleString()} + Products ₹{prodSum.toLocaleString()} = ₹{(curKitPrice + prodSum).toLocaleString()}
                                          </Button>
                                        );
                                      })()}
                                    </>
                                  );
                                }}
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={10}>
                              {(() => {
                                const ko = watchedKitOrders[kitIndex] || {};
                                const single = Number(ko.kitPrice) || 0;
                                const qty = Number(ko.overallQty) || 1;
                                const kitAmt = single * qty;
                                const kitIncludes = ko.kitIncludes || [];
                                const kitIncludesQty = ko.kitIncludesQty || {};
                                const sepProds = (watchedLeadProducts || []).filter(p => p && !p.isKit && !p.kitType);
                                const includedBreakdown = kitIncludes.map(id => {
                                  const kDefMatch = kits.find(k => k._id === id);
                                  const koMatch = kDefMatch ? (watchedKitOrders || []).find(ko => ko?.kitId === id) : null;
                                  const pMatch = !kDefMatch ? sepProds.find(pp => (pp.name || pp.itemName) === id) : null;
                                  if (!kDefMatch && !pMatch) return null;
                                  const incQtyPerKit = Number(kitIncludesQty[id]) || 1;
                                  const totalIncluded = incQtyPerKit * qty;
                                  let unitRate, totalProdQty, itemName;
                                  if (kDefMatch) {
                                    unitRate = Number(koMatch?.kitPrice) || 0;
                                    totalProdQty = Number(koMatch?.overallQty) || 0;
                                    itemName = kDefMatch.kitName || id;
                                  } else {
                                    unitRate = (Number(pMatch.rate) || 0) * (1 + (Number(pMatch.gst) || 0) / 100);
                                    totalProdQty = Number(pMatch.qty) || 0;
                                    itemName = pMatch.name || pMatch.itemName || id;
                                  }
                                  const includedAmt = r2(totalIncluded * unitRate);
                                  const remainingQty = Math.max(0, totalProdQty - totalIncluded);
                                  const remainingAmt = r2(remainingQty * unitRate);
                                  const isOver = totalProdQty > 0 && totalIncluded > totalProdQty;
                                  return { id, name: itemName, isKit: !!kDefMatch, incQtyPerKit, totalIncluded, includedAmt, remainingQty, remainingAmt, isOver, totalProdQty };
                                }).filter(Boolean);
                                const totalIncludedAmt = includedBreakdown.reduce((s, r) => s + r.includedAmt, 0);
                                const totalSeparateAmt = includedBreakdown.reduce((s, r) => s + r.remainingAmt, 0);
                                const totalKitPrice = kitAmt + totalIncludedAmt;
                                const hasIncludes = includedBreakdown.length > 0;
                                return (
                                  <div style={{ padding: '8px 14px', background: isDark ? 'rgba(24,144,255,0.1)' : 'rgba(24,144,255,0.06)', borderRadius: 10, border: '1px solid rgba(24,144,255,0.2)' }}>
                                    <div>
                                      <Text style={{ fontSize: 11, fontWeight: 700, color: '#1890ff', letterSpacing: 0.6, display: 'block' }}>KIT AMOUNT</Text>
                                      <Text strong style={{ fontSize: 15, color: '#1890ff' }}>₹{kitAmt.toLocaleString()}</Text>
                                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>₹{single.toLocaleString()} × {qty} kit{qty > 1 ? 's' : ''}</Text>
                                    </div>
                                    {includedBreakdown.map(r => (
                                      <React.Fragment key={r.id}>
                                        <div style={{ borderTop: '1px solid rgba(24,144,255,0.15)', margin: '5px 0' }} />
                                        <div>
                                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#722ed1', letterSpacing: 0.6, display: 'block' }}>INCL: {r.name}{r.isKit ? ' (Kit)' : ''}</Text>
                                          <Text strong style={{ fontSize: 13, color: '#722ed1' }}>₹{r.includedAmt.toLocaleString()}</Text>
                                          {r.totalProdQty > 0 ? (
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                              {r.totalProdQty} total → <Text strong style={{ color: '#722ed1' }}>{r.totalIncluded} personalized</Text> + <Text strong style={{ color: r.remainingQty > 0 ? '#fa8c16' : '#8c8c8c' }}>{r.remainingQty} separate</Text>
                                              {` (${r.incQtyPerKit}×${qty})`}
                                            </Text>
                                          ) : (
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{r.incQtyPerKit}/kit × {qty} = {r.totalIncluded}</Text>
                                          )}
                                          {r.isOver && <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block' }}>⚠ Over-allocated by {r.totalIncluded - r.totalProdQty}</Text>}
                                          {r.remainingQty > 0 && <Text style={{ fontSize: 11, color: '#fa8c16', display: 'block' }}>Separate price → ₹{r.remainingAmt.toLocaleString()}</Text>}
                                        </div>
                                      </React.Fragment>
                                    ))}
                                    {hasIncludes && (
                                      <>
                                        <div style={{ borderTop: '1px solid rgba(24,144,255,0.15)', margin: '5px 0' }} />
                                        <div>
                                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#52c41a', letterSpacing: 0.6, display: 'block' }}>TOTAL KIT PRICE</Text>
                                          <Text strong style={{ fontSize: 17, color: '#52c41a' }}>₹{totalKitPrice.toLocaleString()}</Text>
                                        </div>
                                      </>
                                    )}
                                    {totalSeparateAmt > 0 && (
                                      <>
                                        <div style={{ borderTop: '1px solid rgba(24,144,255,0.15)', margin: '5px 0' }} />
                                        <div>
                                          <Text style={{ fontSize: 11, fontWeight: 700, color: '#fa8c16', letterSpacing: 0.6, display: 'block' }}>SEPARATE PACK</Text>
                                          <Text strong style={{ fontSize: 14, color: '#fa8c16' }}>₹{totalSeparateAmt.toLocaleString()}</Text>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </Col>
                          </Row>

                          <Form.Item label="Specification" name={['kitOrders', kitIndex, 'specification']} style={{ marginBottom: 10 }}>
                            <Input.TextArea rows={2} placeholder="Kit specifications, customization notes, or packing instructions..." />
                          </Form.Item>

                          <div style={{ marginBottom: 10 }}>
                            <ItemAttachmentsUpload namePath={['kitOrders', kitIndex, 'attachments']} folder="kit-attachments" label="Kit Reference Files / Attachments" />
                          </div>

                          <Form.List name="products">
                            {(fields, { add, remove }) => {
                              const kitFields = fields.filter(f => {
                                const isKit = leadForm.getFieldValue(['products', f.name, 'isKit']);
                                const kitType = leadForm.getFieldValue(['products', f.name, 'kitType']);
                                const fKitId = leadForm.getFieldValue(['products', f.name, 'kitId']);
                                if (!isKit && !kitType) return false;
                                if (fKitId) return fKitId === kitId;
                                return kitIndex === 0; // Untagged kit products go to first kit card
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
                                      packingMaterialOptions={configPackingMaterialOptions}
                                    />
                                  ))}
                                  <Button type="dashed" onClick={() => add({ qty: undefined, rate: undefined, isKit: true, kitId, kitName: kitCardName })} icon={<PlusOutlined />} block
                                    style={{ borderRadius: 10, height: 45, borderDashOffset: 4, marginTop: 8 }}>
                                    Add Kit Product
                                  </Button>
                                  {/* Qty calculation summary — reactive via watchedKitOrders & watchedLeadProducts */}
                                  {(() => {
                                    const overallQty = Number(watchedKitOrders[kitIndex]?.overallQty) || 0;
                                    const thisKitProds = (watchedLeadProducts || []).filter(p =>
                                      p && (p.isKit || p.kitType) && (p.kitId === kitId || (!p.kitId && effectiveKitIds.length <= 1 && kitIndex === 0))
                                    );
                                    if (!overallQty || overallQty <= 1 || thisKitProds.length === 0) return null;
                                    return (
                                      <div style={{ marginTop: 12, padding: '10px 14px', background: isDark ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.04)', borderRadius: 8, border: '1px solid rgba(24,144,255,0.15)' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#1890ff', display: 'block', marginBottom: 6 }}>TOTAL QUANTITIES ({overallQty} kits)</Text>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                          {thisKitProds.map((p, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                              <Text type="secondary">{p.name || p.kitType || '—'}</Text>
                                              <Text>{Number(p.qty) || 0} × {overallQty} = <Text strong style={{ color: '#1890ff' }}>{(Number(p.qty) || 0) * overallQty}</Text> pcs</Text>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </>
                              );
                            }}
                          </Form.List>
                        </Card>
                      );
                    })}

                    {/* Fallback generic kit card — shown when no kits selected and no product type */}
                    {showFallbackKitCard && (
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
                        <Row gutter={12} align="bottom" style={{ marginBottom: 14 }}>
                          <Col xs={24} sm={8}>
                            <Form.Item label="Display Unit" name="kitDisplayUnit" style={{ marginBottom: 0 }}>
                              <Select allowClear showSearch optionFilterProp="label" placeholder="Select display unit" options={configDisplayUnitOptions} />
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
                                    packingMaterialOptions={configPackingMaterialOptions}
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
                                  <div key={field.key}>
                                    <ProductItem
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
                                      packingMaterialOptions={configPackingMaterialOptions}
                                    />
                                    {/* per-product specification + attachments now render inside ProductItem's spec block */}
                                  </div>
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
              {isDetail && (record.isUrgent || record.isEmergency || (record.splitDates || []).length > 0) && (
                <Card
                  style={{ borderRadius: 14, marginBottom: 16, border: '1px solid rgba(255,77,79,0.3)', boxShadow: '0 2px 12px rgba(255,77,79,0.08)', background: cardBg }}
                  title={<Space><div style={{ width: 4, height: 20, background: '#ff4d4f', borderRadius: 2, display: 'inline-block' }} /><AlertFilled style={{ color: '#ff4d4f' }} /><WarningOutlined style={{ color: '#ff4d4f' }} /><span style={{ color: '#ff4d4f', fontWeight: 700 }}>Urgent / Emergency Deliveries (Partial)</span></Space>}
                >
                  {(record.splitDates || []).length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>Emergency order — no partial delivery schedule added yet.</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(record.splitDates || []).map((sd, i) => {
                        const productList = (sd.products && sd.products.length > 0)
                          ? sd.products
                          : sd.product
                            ? [{ product: sd.product, qty: sd.qty, notes: sd.note }]
                            : [];
                        return (
                          <div key={i} style={{ background: isDark ? 'rgba(255,77,79,0.06)' : 'rgba(255,77,79,0.04)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f', display: 'block', marginBottom: 8 }}>
                              <CalendarOutlined style={{ marginRight: 6 }} />
                              {sd.date ? dayjs(sd.date).format('DD MMM YYYY') : '—'}
                            </Text>
                            {productList.length > 0 ? productList.map((p, pi) => (
                              <Row key={pi} gutter={[16, 4]} style={{ marginBottom: pi < productList.length - 1 ? 8 : 0 }}>
                                <Col xs={24} sm={8}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Product: </Text>
                                  <Text strong style={{ fontSize: 13 }}>{p.product || '—'}</Text>
                                </Col>
                                <Col xs={24} sm={4}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Qty: </Text>
                                  <Text strong style={{ fontSize: 13 }}>{p.qty || '—'}</Text>
                                </Col>
                                <Col xs={24} sm={12}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Notes: </Text>
                                  <Text style={{ fontSize: 13 }}>{p.notes || p.note || '—'}</Text>
                                </Col>
                              </Row>
                            )) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>No products specified for this date.</Text>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      <span>{(record.leadType || watchedLeadType) === 'SAMPLE' ? 'Delivery Details' : 'Delivery & Payment Details'}</span>
                    </Space>
                  }
                  extra={usePerCardEdit && (
                    editingSection === 'delivery' ? (
                      <Space size="small">
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => saveSectionEdit('delivery')} style={{ background: '#fa8c16', border: 'none', borderRadius: 6 }}>Save</Button>
                        <Button size="small" onClick={() => setEditingSection(null)} style={{ borderRadius: 6 }}>Cancel</Button>
                      </Space>
                    ) : (
                      <Button size="small" icon={<EditOutlined />} onClick={() => { if (!requireAccess('edit')) return; setEditingSection('delivery'); }} style={{ borderRadius: 6 }}>Edit</Button>
                    )
                  )}
                >
                  {usePerCardEdit && editingSection !== 'delivery' ? (
                    <Row gutter={12}>
                      <Col xs={24} sm={record.leadType === 'SAMPLE' ? 24 : 12}>
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
                          {record.orderDeliveryDate && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Tentative Date</Text>
                              <Text strong style={{ color: '#fa8c16' }}>
                                {dayjs(record.orderDeliveryDate).isValid() ? dayjs(record.orderDeliveryDate).format('DD MMM YYYY') : String(record.orderDeliveryDate).slice(0, 10)}
                              </Text>
                            </div>
                          )}
                          <Tag color={record.forwardingCharge ? 'orange' : 'default'} style={{ borderRadius: 20 }}>
                            {record.forwardingCharge ? `Forwarding: ₹${(record.forwardingChargeAmount || 0).toLocaleString()}` : 'No Forwarding Charge'}
                          </Tag>
                        </div>
                      </Col>
                      {record.leadType !== 'SAMPLE' && <Col xs={24} sm={12}>
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
                          {(() => {
                            const recTotal = computeCompositionGrandTotal(record, kits) || Number(record.totalAmount) || 0;
                            const recCollected = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                            const recPaid = Math.max(recCollected, Number(record.paidAmount) || Number(record.advancePaid) || 0);
                            const recBalance = Math.max(0, recTotal - recPaid);
                            if (recTotal <= 0) return null;
                            return (
                              <div style={{ marginTop: 10, padding: '10px 12px', background: recBalance > 0 ? 'rgba(250,140,22,0.06)' : 'rgba(82,196,26,0.06)', borderRadius: 8, border: `1px solid ${recBalance > 0 ? 'rgba(250,140,22,0.25)' : 'rgba(82,196,26,0.25)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                  <Text type="secondary" style={{ fontSize: 11 }}>Order Total</Text>
                                  <Text strong style={{ fontSize: 12 }}>₹{recTotal.toLocaleString()}</Text>
                                </div>
                                {recPaid > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>Amount Paid</Text>
                                    <Text strong style={{ fontSize: 12, color: '#52c41a' }}>₹{recPaid.toLocaleString()}</Text>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                  <Text style={{ fontSize: 12, fontWeight: 700 }}>Amount to Pay</Text>
                                  <Text strong style={{ fontSize: 14, color: recBalance > 0 ? '#fa8c16' : '#52c41a' }}>₹{recBalance.toLocaleString()}</Text>
                                </div>
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
                      </Col>}
                      {record.leadType !== 'SAMPLE' && leadCombinedPaymentCollection.length > 0 && (
                        <Col xs={24} style={{ marginTop: 12 }}>
                          <div style={{ padding: '14px 16px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                              PAYMENT COLLECTION ({leadCombinedPaymentCollection.length} entr{leadCombinedPaymentCollection.length > 1 ? 'ies' : 'y'})
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {leadCombinedPaymentCollection.map((entry, idx) => (
                                <div key={idx} style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <DollarOutlined style={{ color: '#B11E6A', fontSize: 14 }} />
                                        <Text style={{ fontSize: 13, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                        {entry._fromOrder && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="purple">From Order</Tag>}
                                        {entry.notes && <Text type="secondary" style={{ fontSize: 12 }}>{entry.notes}</Text>}
                                      </div>
                                      <div style={{ paddingLeft: 24, marginTop: 3 }}>
                                        {entry.paymentDate && <Text type="secondary" style={{ fontSize: 11 }}>Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}</Text>}
                                        {entry.recordedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>· Recorded {dayjs(entry.recordedAt).format('DD MMM YYYY')}</Text>}
                                      </div>
                                    </div>
                                    <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                                  </div>
                                  {entry.proof?.url && (
                                    <div style={{ marginTop: 5, paddingLeft: 24 }}>
                                      <a href={entry.proof.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FileTextOutlined />{entry.proof.name || 'View Proof'} ↗
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <div style={{ padding: '8px 12px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                                <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                                  ₹{(leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}
                                </Text>
                              </div>
                            </div>
                          </div>
                        </Col>
                      )}
                      {ptHasPersonalized(record.productType) && (() => {
                        const formData = {
                          kitPrice: record.kitPrice,
                          kitOverallQty: record.kitOverallQty,
                          packagingIncludes: record.packagingIncludes,
                          packagingIncludesQty: record.packagingIncludesQty,
                          kitOrders: record.kitOrders,
                          products: record.products,
                        };
                        const comp = computePersonalizedComposition(formData, kits);
                        if (!comp.includedKits.length && !comp.includedSepProds.length && !comp.separateKits.length) return null;
                        return (
                          <Col xs={24} style={{ marginTop: 12 }}>
                            <div style={{ padding: '14px 16px', background: isDark ? 'rgba(0,0,0,0.15)' : '#f8f9fc', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                              <PersonalizedCompositionPanel comp={comp} isDark={isDark} />
                            </div>
                          </Col>
                        );
                      })()}
                      {record.leadType !== 'SAMPLE' && (record.paymentProofs || []).length > 0 && (
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
                      {record.leadType !== 'SAMPLE' && (
                        <Col xs={24} style={{ marginTop: 14 }}>
                          <Button
                            icon={<PlusOutlined />}
                            size="small"
                            style={{ color: '#B11E6A', borderColor: '#B11E6A55', borderRadius: 8 }}
                            onClick={() => {
                              const viewTotal = computeCompositionGrandTotal(record, kits) || Number(record.totalAmount) || 0;
                              const viewCollected = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                              const viewPaid = Math.max(viewCollected, Number(record.paidAmount) || Number(record.advancePaid) || 0);
                              openPayEntry('lead', record, { precomputedTotal: viewTotal, precomputedPaid: viewPaid });
                            }}
                          >
                            Add Payment Entry
                          </Button>
                        </Col>
                      )}
                    </Row>
                  ) : (
                    <>
                  {/* Previous Payment Records (read-only, shown in edit mode so history is visible) */}
                  {record.leadType !== 'SAMPLE' && leadCombinedPaymentCollection.length > 0 && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', borderRadius: 10, border: '1px solid rgba(177,30,106,0.15)' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5 }}>
                        PAYMENT HISTORY ({leadCombinedPaymentCollection.length} entr{leadCombinedPaymentCollection.length > 1 ? 'ies' : 'y'})
                      </Text>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {leadCombinedPaymentCollection.map((entry, idx) => (
                          <div key={idx} style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.12)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div>
                                <Space size={8}>
                                  <DollarOutlined style={{ color: '#B11E6A', fontSize: 13 }} />
                                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}</Text>
                                  {entry._fromOrder && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="purple">From Order</Tag>}
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 11 }}>{entry.notes}</Text>}
                                </Space>
                                <div style={{ paddingLeft: 21, marginTop: 3 }}>
                                  {entry.paymentDate && <Text type="secondary" style={{ fontSize: 11 }}>Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}</Text>}
                                  {entry.recordedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>· Recorded {dayjs(entry.recordedAt).format('DD MMM YYYY')}</Text>}
                                </div>
                              </div>
                              <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{Number(entry.paidAmount || 0).toLocaleString()}</Text>
                            </div>
                            {entry.proof?.url && (
                              <div style={{ marginTop: 5, paddingLeft: 21 }}>
                                <a href={entry.proof.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <FileTextOutlined />{entry.proof.name || 'View Proof'} ↗
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ padding: '6px 10px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{(leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0)).toLocaleString()}</Text>
                        </div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <Button icon={<PlusOutlined />} size="small" style={{ color: '#B11E6A', borderColor: '#B11E6A55', borderRadius: 8 }} onClick={() => {
                          const effectiveFwd = watchedLeadForwardingCharge ?? record.forwardingCharge;
                          const effectiveFwdAmt = watchedLeadForwardingAmount ?? record.forwardingChargeAmount;
                          // ADD mode: use form watchers (no stored record). EDIT/DETAIL: use record (matches VIEW).
                          const isAddMode = !editingLead && !isDetail;
                          let modalTotal;
                          let enrichedForModal = record;
                          if (isAddMode) {
                            enrichedForModal = {
                              ...record,
                              packagingIncludes: watchedPackagingIncludes?.length > 0 ? watchedPackagingIncludes : (record.packagingIncludes || []),
                              packagingIncludesQty: (watchedPackagingIncludesQty && Object.keys(watchedPackagingIncludesQty || {}).length > 0) ? watchedPackagingIncludesQty : (record.packagingIncludesQty || {}),
                              kitOverallQty: watchedKitOverallQty ?? record.kitOverallQty,
                              kitPrice: watchedKitPrice ?? record.kitPrice,
                              kitOrders: watchedKitOrders?.length > 0 ? watchedKitOrders : (record.kitOrders || []),
                              products: watchedLeadProducts?.length > 0 ? watchedLeadProducts : (record.products || []),
                              forwardingCharge: effectiveFwd,
                              forwardingChargeAmount: effectiveFwdAmt,
                            };
                            modalTotal = computeCompositionGrandTotal(enrichedForModal, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                          } else {
                            modalTotal = computeCompositionGrandTotal(record, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                          }
                          const fromCollection = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                          const existingColl = Math.max(fromCollection, Number(record.paidAmount) || Number(record.advancePaid) || 0);
                          const newColl = (Array.isArray(watchedLeadPaymentCollection) ? watchedLeadPaymentCollection : []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                          openPayEntry('lead', enrichedForModal, { precomputedTotal: modalTotal, precomputedPaid: existingColl + newColl });
                        }}>
                          Add Payment Entry
                        </Button>
                      </div>
                    </div>
                  )}

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
                                            <Select
                                              size="small"
                                              placeholder="Select product"
                                              allowClear
                                              onChange={(val) => {
                                                if (val === '__kit__') {
                                                  const kitProds = (Array.isArray(watchedLeadProducts) ? watchedLeadProducts : [])
                                                    .filter(p => p?.isKit || p?.kitType);
                                                  const qtys = kitProds.map(p => Number(p.qty) || 0).filter(q => q > 0);
                                                  if (qtys.length > 0) leadForm.setFieldValue(['splitDates', dateName, 'products', prodName, 'qty'], Math.min(...qtys));
                                                }
                                              }}
                                            >
                                              {(Array.isArray(watchedLeadProducts) ? watchedLeadProducts : []).some(p => p?.isKit || p?.kitType) && (
                                                <Option value="__kit__" style={{ fontWeight: 600, color: '#722ed1' }}>
                                                  Kit (All Products)
                                                </Option>
                                              )}
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

                  {(watchedLeadType || record.leadType) !== 'SAMPLE' && <DeliveryPaymentFields showUpload />}

                  {(watchedLeadType || record.leadType) !== 'SAMPLE' && <>
                  <Divider style={{ margin: '16px 0 10px', fontSize: 12, color: '#B11E6A', borderColor: 'rgba(177,30,106,0.2)' }}>
                    <Space><DollarOutlined style={{ color: '#B11E6A' }} /><span style={{ color: '#B11E6A', fontWeight: 600 }}>Payment Collection</span></Space>
                  </Divider>
                  {watchedLeadPaymentTerms === 'CREDIT_10_30' && (
                    <div style={{ padding: '8px 12px', background: 'rgba(24,144,255,0.06)', borderRadius: 8, border: '1px solid rgba(24,144,255,0.2)', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, color: '#1890ff' }}>Credit terms selected — no advance required. You can still record any upfront payment below.</Text>
                    </div>
                  )}

                  {/* ── Existing saved payment entries (read-only display) ── */}
                  {leadCombinedPaymentCollection.length > 0 && (() => {
                    const existingTotal = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                    return (
                      <div style={{ marginBottom: 14 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                          PAYMENT HISTORY ({leadCombinedPaymentCollection.length} entr{leadCombinedPaymentCollection.length > 1 ? 'ies' : 'y'})
                        </Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {leadCombinedPaymentCollection.map((entry, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: '1px solid rgba(177,30,106,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Space size={8} wrap>
                                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                                  <Text style={{ fontSize: 13, fontWeight: 600 }}>
                                    {(COLLECTION_METHODS.find(m => m.value === entry.paymentMethod) || {}).label || entry.paymentMethod || '—'}
                                  </Text>
                                  {entry._fromOrder && <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color="purple">From Order</Tag>}
                                  {entry.notes && <Text type="secondary" style={{ fontSize: 12 }}>{entry.notes}</Text>}
                                </Space>
                                <div style={{ paddingLeft: 22, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  {entry.paymentDate ? (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <CalendarOutlined style={{ marginRight: 4, fontSize: 10 }} />
                                      Payment Date: {dayjs(entry.paymentDate).format('DD MMM YYYY')}
                                    </Text>
                                  ) : entry.recordedAt ? (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      <CalendarOutlined style={{ marginRight: 4, fontSize: 10 }} />
                                      {dayjs(entry.recordedAt).format('DD MMM YYYY · hh:mm A')}
                                    </Text>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: 11 }}>Date not recorded</Text>
                                  )}
                                  {entry.proof?.url ? (
                                    <a href={entry.proof.url} target="_blank" rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1890ff' }}>
                                      <FileTextOutlined style={{ fontSize: 11 }} />
                                      {entry.proof.name || 'View Proof'} ↗
                                    </a>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: 11 }}>No proof uploaded</Text>
                                  )}
                                </div>
                              </div>
                              <Text strong style={{ color: '#52c41a', fontSize: 14, whiteSpace: 'nowrap', marginLeft: 12 }}>
                                ₹{Number(entry.paidAmount || 0).toLocaleString()}
                              </Text>
                            </div>
                          ))}
                          <div style={{ padding: '6px 14px', background: 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>
                            <Text strong style={{ color: '#52c41a', fontSize: 13 }}>₹{existingTotal.toLocaleString()}</Text>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Live payment summary: Grand Total / Collected / Balance Due ── */}
                  {(() => {
                    // Use combined collection (lead + linked order) so stat panel shows the true total
                    const fromCollection = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                    // Fall back to normalized paidAmount/advancePaid when paymentCollection is empty
                    // (advance set during quotation/order flow rather than through collection entries).
                    const existingColl = Math.max(fromCollection, Number(record.paidAmount) || Number(record.advancePaid) || 0);
                    const newColl = (Array.isArray(watchedLeadPaymentCollection) ? watchedLeadPaymentCollection : []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                    const totalColl = existingColl + newColl;
                    const effectiveFwd = watchedLeadForwardingCharge ?? record.forwardingCharge;
                    const effectiveFwdAmt = watchedLeadForwardingAmount ?? record.forwardingChargeAmount;
                    // ADD mode: record={} so use live form watchers for grand total.
                    // EDIT mode (editingLead set) or DETAIL mode: use stored record directly —
                    // same as VIEW stat panel — to avoid prepareFormValues normalization drift.
                    const isAddMode = !editingLead && !isDetail;
                    let recordTotal;
                    if (isAddMode) {
                      const totalFormData = {
                        ...record,
                        packagingIncludes: watchedPackagingIncludes.length > 0 ? watchedPackagingIncludes : (record.packagingIncludes || []),
                        packagingIncludesQty: (watchedPackagingIncludesQty && Object.keys(watchedPackagingIncludesQty).length > 0) ? watchedPackagingIncludesQty : (record.packagingIncludesQty || {}),
                        kitOverallQty: watchedKitOverallQty ?? record.kitOverallQty,
                        kitPrice: watchedKitPrice ?? record.kitPrice,
                        kitOrders: watchedKitOrders.length > 0 ? watchedKitOrders : (record.kitOrders || []),
                        products: (watchedLeadProducts?.length > 0) ? watchedLeadProducts : (record.products || []),
                        forwardingCharge: effectiveFwd,
                        forwardingChargeAmount: effectiveFwdAmt,
                      };
                      recordTotal = computeCompositionGrandTotal(totalFormData, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                    } else {
                      recordTotal = computeCompositionGrandTotal(record, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                    }
                    const balance = Math.max(0, recordTotal - totalColl);
                    if (recordTotal === 0) return null;
                    return (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1, padding: '8px 10px', background: isDark ? 'rgba(177,30,106,0.08)' : 'rgba(177,30,106,0.05)', borderRadius: 8, border: '1px solid rgba(177,30,106,0.2)', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block', letterSpacing: 0.4 }}>GRAND TOTAL</Text>
                          <Text strong style={{ fontSize: 14, color: '#B11E6A' }}>₹{recordTotal.toLocaleString()}</Text>
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px', background: isDark ? 'rgba(82,196,26,0.08)' : 'rgba(82,196,26,0.06)', borderRadius: 8, border: '1px solid rgba(82,196,26,0.2)', textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block', letterSpacing: 0.4 }}>COLLECTED</Text>
                          <Text strong style={{ fontSize: 14, color: '#52c41a' }}>₹{totalColl.toLocaleString()}</Text>
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px', background: balance > 0 ? (isDark ? 'rgba(250,140,22,0.08)' : 'rgba(250,140,22,0.06)') : (isDark ? 'rgba(82,196,26,0.08)' : 'rgba(82,196,26,0.06)'), borderRadius: 8, border: `1px solid ${balance > 0 ? 'rgba(250,140,22,0.3)' : 'rgba(82,196,26,0.2)'}`, textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block', letterSpacing: 0.4 }}>BALANCE DUE</Text>
                          <Text strong style={{ fontSize: 14, color: balance > 0 ? '#fa8c16' : '#52c41a' }}>₹{balance.toLocaleString()}</Text>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Form.List for NEW payment entries only ── */}
                  <Form.List name="paymentCollection">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...rest }) => (
                          <div key={key} style={{ background: isDark ? 'rgba(177,30,106,0.05)' : 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                            <Row gutter={[8, 0]} align="middle">
                              <Col xs={24} sm={6}>
                                <Form.Item {...rest} name={[name, 'paymentMethod']} label="Payment Method" style={{ marginBottom: 0 }} rules={[{ required: true, message: 'Select method' }]}>
                                  <Select placeholder="Select method" size="small">
                                    {COLLECTION_METHODS.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={6}>
                                <Form.Item {...rest} name={[name, 'paidAmount']} label="Paid Amount (₹)" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} min={0} placeholder="e.g. 5000" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={5}>
                                <Form.Item {...rest} name={[name, 'notes']} label="Notes" style={{ marginBottom: 0 }}>
                                  <Input size="small" placeholder="e.g. UPI ref no." />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={5} style={{ paddingTop: 22 }}>
                                <Upload
                                  accept="image/*,.pdf"
                                  showUploadList={false}
                                  customRequest={async ({ file, onSuccess, onError }) => {
                                    setLeadPayEntryProofUploadingMap(prev => ({ ...prev, [name]: true }));
                                    const fd = new FormData();
                                    fd.append('files', file);
                                    try {
                                      const res = await uploadFilesMutation({ formData: fd, folder: 'payment-proofs' }).unwrap();
                                      const up = res.data?.[0];
                                      if (up) {
                                        leadForm.setFieldValue(['paymentCollection', name, 'proof'], { name: file.name || 'Proof', url: up.url });
                                        onSuccess(up, file);
                                        enqueueSnackbar('Proof uploaded', { variant: 'success' });
                                      } else onError(new Error('Upload failed'));
                                    } catch (err) { onError(err); enqueueSnackbar('Upload failed', { variant: 'error' }); }
                                    finally { setLeadPayEntryProofUploadingMap(prev => ({ ...prev, [name]: false })); }
                                  }}
                                >
                                  <Button
                                    size="small"
                                    icon={leadPayEntryProofUploadingMap[name] ? <LoadingOutlined /> : <UploadOutlined />}
                                    loading={!!leadPayEntryProofUploadingMap[name]}
                                    style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontSize: 11 }}
                                  >
                                    {leadPayEntryProofUploadingMap[name] ? 'Uploading…' : (watchedLeadPaymentCollection?.[name]?.proof?.url ? 'Change Proof' : 'Upload Proof')}
                                  </Button>
                                </Upload>
                                {watchedLeadPaymentCollection?.[name]?.proof?.url && !leadPayEntryProofUploadingMap[name] && (
                                  <a
                                    href={watchedLeadPaymentCollection[name].proof.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, padding: '3px 7px', borderRadius: 6, background: 'rgba(24,144,255,0.06)', border: '1px solid rgba(24,144,255,0.2)', maxWidth: 160, overflow: 'hidden' }}
                                  >
                                    <FileTextOutlined style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {watchedLeadPaymentCollection[name].proof.name || 'View Proof'}
                                    </span>
                                    <span style={{ flexShrink: 0, color: '#1890ff' }}>↗</span>
                                  </a>
                                )}
                              </Col>
                              <Col xs={4} sm={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          </div>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()} block style={{ borderColor: '#B11E6A55', color: '#B11E6A', marginBottom: 12 }}>
                          + Add New Payment Entry
                        </Button>
                      </>
                    )}
                  </Form.List>

                  {/* Auto-computed payment status (existing + new entries) */}
                  {(() => {
                    const fromCollection2 = leadCombinedPaymentCollection.reduce((s, e) => s + Number(e.paidAmount || 0), 0);
                    const existingColl2 = fromCollection2 > 0 ? fromCollection2 : (Number(record.paidAmount) || Number(record.advancePaid) || 0);
                    const newColl = (Array.isArray(watchedLeadPaymentCollection) ? watchedLeadPaymentCollection : []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
                    const totalColl = existingColl2 + newColl;
                    // ADD mode: record={} → use form watchers. EDIT/DETAIL: use record (matches VIEW).
                    const isAddMode2 = !editingLead && !isDetail;
                    let recordTotal;
                    if (isAddMode2) {
                      const effectiveFwd2 = watchedLeadForwardingCharge ?? record.forwardingCharge;
                      const effectiveFwdAmt2 = watchedLeadForwardingAmount ?? record.forwardingChargeAmount;
                      const totalFormData2 = {
                        ...record,
                        packagingIncludes: watchedPackagingIncludes.length > 0 ? watchedPackagingIncludes : (record.packagingIncludes || []),
                        packagingIncludesQty: (watchedPackagingIncludesQty && Object.keys(watchedPackagingIncludesQty).length > 0) ? watchedPackagingIncludesQty : (record.packagingIncludesQty || {}),
                        kitOverallQty: watchedKitOverallQty ?? record.kitOverallQty,
                        kitPrice: watchedKitPrice ?? record.kitPrice,
                        kitOrders: watchedKitOrders.length > 0 ? watchedKitOrders : (record.kitOrders || []),
                        products: (watchedLeadProducts?.length > 0) ? watchedLeadProducts : (record.products || []),
                        forwardingCharge: effectiveFwd2,
                        forwardingChargeAmount: effectiveFwdAmt2,
                      };
                      recordTotal = computeCompositionGrandTotal(totalFormData2, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                    } else {
                      recordTotal = computeCompositionGrandTotal(record, kits) || Number(record.totalAmount) || Number(record.total) || 0;
                    }
                    const balance = Math.max(0, recordTotal - totalColl);
                    const status = recordTotal > 0 && totalColl >= recordTotal ? 'Paid' : totalColl > 0 ? 'Partially Paid' : 'Unpaid';
                    const color = status === 'Paid' ? '#52c41a' : status === 'Partially Paid' ? '#fa8c16' : '#ff4d4f';
                    const bg = status === 'Paid' ? 'rgba(82,196,26,0.08)' : status === 'Partially Paid' ? 'rgba(250,140,22,0.08)' : 'rgba(255,77,79,0.08)';
                    return (
                      <div style={{ padding: '10px 14px', background: bg, borderRadius: 8, border: `1px solid ${color}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Payment Status</Text>
                        <Space size={12}>
                          {balance > 0 && recordTotal > 0 && (
                            <Text style={{ fontSize: 12, color: '#fa8c16', fontWeight: 600 }}>₹{balance.toLocaleString()} due</Text>
                          )}
                          <Text strong style={{ color, fontSize: 13 }}>{status}</Text>
                        </Space>
                      </div>
                    );
                  })()}
                  </>}
                  {/* ORDER COMPOSITION — full breakdown of personalized vs separate */}
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue }) => {
                      const formData = {
                        kitPrice: getFieldValue('kitPrice'),
                        kitOverallQty: getFieldValue('kitOverallQty'),
                        packagingIncludes: getFieldValue('packagingIncludes'),
                        packagingIncludesQty: getFieldValue('packagingIncludesQty'),
                        kitOrders: getFieldValue('kitOrders'),
                        products: getFieldValue('products'),
                      };
                      const hasPersonalized = ptHasPersonalized(getFieldValue('productType'));
                      if (!hasPersonalized) return null;
                      const comp = computePersonalizedComposition(formData, kits);
                      if (!comp.includedKits.length && !comp.includedSepProds.length && !comp.separateKits.length) return null;
                      return (
                        <Row style={{ marginTop: 12 }}>
                          <Col xs={24}>
                            <div style={{ padding: '14px 16px', background: isDark ? 'rgba(0,0,0,0.15)' : '#f8f9fc', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                              <PersonalizedCompositionPanel comp={comp} isDark={isDark} />
                            </div>
                          </Col>
                        </Row>
                      );
                    }}
                  </Form.Item>
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
                        {(record.leadId && !record.customerId && !linkedOrderForLead) && (
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
          {/* Bottom Save Button */}
          {!isDetail && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(177,30,106,0.15)' }}>
              <Button type="primary" size="large" icon={editingLead ? <SaveOutlined /> : <PlusOutlined />}
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(177,30,106,0.3)', minWidth: 160 }}
                onClick={saveLead}
              >
                {editingLead ? 'Update Record' : (isAddLead ? 'Save Lead' : 'Save Customer')}
              </Button>
            </div>
          )}
        </Form>
        {/* Raise Complaint Modal — handled via shared modal at end of file */}
      </motion.div>
      {renderPayEntryModal()}
    </>
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
                if (!requireAccess('add')) return;
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
        <Tabs onChange={setActiveTab} style={{ padding: '0 16px' }}
          items={filterTabs([
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Select
                      allowClear
                      placeholder="Lead Status"
                      value={leadStatusFilter}
                      onChange={(val) => { setLeadStatusFilter(val); setLeadsPage(1); }}
                      style={{ width: 200, borderRadius: 8 }}
                    >
                      {['Cold', 'Warm', 'Hot', 'Quotation (Sent)', 'Quotation (Not Sent)', 'Negotiation', 'Need manager help', 'Converted', 'Rejected'].map(s => (
                        <Option key={s} value={s}>{s}</Option>
                      ))}
                    </Select>
                    <DatePicker.RangePicker
                      style={{ borderRadius: 8 }}
                      onChange={(dates) => { setLeadDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null); setLeadsPage(1); }}
                      allowClear
                    />
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search hotel, company..."
                      value={leadSearchText}
                      onChange={(e) => { setLeadSearchText(e.target.value); setLeadsPage(1); }}
                      allowClear
                      style={{ width: 220, borderRadius: 8 }}
                    />
                  </div>
                  <Table
                    dataSource={leadsData.filter(r => {
                      const hasOrder = ordersData.some(o =>
                        (o.leadCode && o.leadCode === r.leadId) ||
                        (o.leadId && String(o.leadId._id || o.leadId) === String(r.key))
                      );
                      if (hasOrder) return false;
                      if (leadSearchText) {
                        const q = leadSearchText.toLowerCase();
                        if (!['hotelName', 'location', 'salesPerson'].some(k => (r[k] || '').toLowerCase().includes(q))) return false;
                      }
                      if (leadDateRange) {
                        const d = r.createdAt ? r.createdAt.slice(0, 10) : '';
                        if (d < leadDateRange[0] || d > leadDateRange[1]) return false;
                      }
                      return true;
                    })}
                    columns={leadColumns}
                    pagination={{
                      current: leadsPage,
                      pageSize: leadsPageSize,
                      total: leadsRaw?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setLeadsPage(p); setLeadsPageSize(ps); },
                      size: 'small',
                    }}
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
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
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search lead, party..."
                      allowClear
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 220, borderRadius: 8 }}
                    />
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
                    pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
                    <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
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
                      <DatePicker.RangePicker
                        style={{ borderRadius: 8 }}
                        onChange={(dates) => setQuotDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                        allowClear
                      />
                      <Input
                        prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                        placeholder="Search hotel, company..."
                        value={quotSearchText}
                        onChange={(e) => setQuotSearchText(e.target.value)}
                        allowClear
                        style={{ width: 220, borderRadius: 8 }}
                      />
                    </div>
                  </div>
                  <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                    <SectionDivider title="Current Quotations" />
                    <Table dataSource={quotationsData.filter(r => {
                      if (quotStatusFilter && r.status !== quotStatusFilter) return false;
                      if (quotSearchText) { const q = quotSearchText.toLowerCase(); if (!['hotelName', 'location', 'salesPerson'].some(k => (r[k] || '').toLowerCase().includes(q))) return false; }
                      if (quotDateRange) { const d = r.createdAt ? r.createdAt.slice(0, 10) : ''; if (d < quotDateRange[0] || d > quotDateRange[1]) return false; }
                      return true;
                    })} columns={quotationColumns} pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }} size="small" rowKey="key"
                      scroll={{ x: 'max-content' }} onRow={(record) => ({ onClick: () => openQuotationDetail(record) })} style={{ cursor: 'pointer' }} />
                  </div>
                  <div className="table-responsive" style={{ padding: '0 4px 4px' }}>
                    <SectionDivider title="Negotiations In Progress" />
                    <Table dataSource={negotiationsData.filter(r => {
                      if (quotSearchText) { const q = quotSearchText.toLowerCase(); if (!['hotelName', 'location', 'salesPerson'].some(k => (r[k] || '').toLowerCase().includes(q))) return false; }
                      if (quotDateRange) { const d = r.createdAt ? r.createdAt.slice(0, 10) : ''; if (d < quotDateRange[0] || d > quotDateRange[1]) return false; }
                      return true;
                    })} columns={negotiationColumns} pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }} size="small" rowKey="key"
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
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
                    <DatePicker.RangePicker
                      style={{ borderRadius: 8 }}
                      onChange={(dates) => setOrderDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                      allowClear
                    />
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search hotel, order ID..."
                      value={orderSearchText}
                      onChange={(e) => setOrderSearchText(e.target.value)}
                      allowClear
                      style={{ width: 220, borderRadius: 8 }}
                    />
                  </div>
                  <Table
                    dataSource={[...ordersData.filter(r => {
                      if (orderStatusFilter && r.status !== orderStatusFilter) return false;
                      if (orderSearchText) { const q = orderSearchText.toLowerCase(); if (!['hotelName', 'location', 'oid'].some(k => (r[k] || '').toLowerCase().includes(q))) return false; }
                      if (orderDateRange) { const d = r.createdAt ? r.createdAt.slice(0, 10) : ''; if (d < orderDateRange[0] || d > orderDateRange[1]) return false; }
                      return true;
                    })].sort((a, b) => ((b.isUrgent || b.isEmergency) ? 1 : 0) - ((a.isUrgent || a.isEmergency) ? 1 : 0))}
                    columns={orderColumns}
                    pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
                    pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
                        <ExpandedPartyOrders hotelName={record.hotelName} onView={openOrderDetail} />
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
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Select
                      allowClear
                      placeholder="Complaint Status"
                      value={complaintStatusFilter}
                      onChange={(val) => { setComplaintStatusFilter(val); setComplaintsPage(1); }}
                      style={{ width: 160, borderRadius: 8 }}
                    >
                      <Option value="Open">Open</Option>
                      <Option value="Resolved">Resolved</Option>
                      <Option value="In Progress">In Progress</Option>
                    </Select>
                    <DatePicker.RangePicker
                      style={{ borderRadius: 8 }}
                      onChange={(dates) => { setComplaintDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null); setComplaintsPage(1); }}
                      allowClear
                    />
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search Order ID or Complaint ID..."
                      value={complaintSearchText}
                      onChange={(e) => { setComplaintSearchText(e.target.value); setComplaintsPage(1); }}
                      allowClear
                      style={{ width: 230, borderRadius: 8 }}
                    />
                    <Button
                      icon={<WarningOutlined />}
                      style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8 }}
                      onClick={() => openComplaintModal(null)}
                    >
                      Raise Complaint
                    </Button>
                  </div>
                  <Table
                    dataSource={complaintsData}
                    columns={complaintColumns}
                    pagination={{
                      current: complaintsPage,
                      pageSize: complaintsPageSize,
                      total: complaintsRaw?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setComplaintsPage(p); setComplaintsPageSize(ps); },
                      size: 'small',
                    }}
                    size="small"
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              ),
            },
          ])}
          activeKey={activeKeyFor(activeTab)}
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
              {complaintOrder ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Order ID</div>
                  <div style={{ padding: '6px 12px', background: 'rgba(255,77,79,0.06)', border: '1px solid rgba(255,77,79,0.2)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ff4d4f' }}>
                    {complaintOrder.oid}
                  </div>
                </div>
              ) : (
                <Form.Item label="Order ID" name="orderId" rules={[{ required: true, message: 'Please select an Order ID' }]}>
                  <Select placeholder="Select Order ID" showSearch optionFilterProp="children">
                    {ordersData.map(o => (
                      <Option key={o.oid} value={o.oid}>{o.oid} — {o.hotelName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
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

      {/* ── Emergency Dispatch — Sales Head Approval Modal ────────────────── */}
      <Modal
        title={<Space><AlertFilled style={{ color: '#f5222d' }} /><span>Approve Emergency Dispatch — Sales Head</span></Space>}
        open={!!emergencySalesApprovalOrder}
        onCancel={() => setEmergencySalesApprovalOrder(null)}
        width={Math.min(560, window.innerWidth - 32)}
        footer={[<Button key="cancel" onClick={() => setEmergencySalesApprovalOrder(null)}>Close</Button>]}
      >
        {emergencySalesApprovalOrder && (() => {
          // Re-derive the live row so the list updates in place as each product is
          // approved, instead of freezing on the snapshot taken when the modal opened.
          const liveOrder = ordersData.find((o) => o.key === emergencySalesApprovalOrder.key) || emergencySalesApprovalOrder;
          const requests = liveOrder.emergencyRequests || [];
          const pending = requests.filter((x) => !x.salesApproved);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              <Alert type="error" showIcon
                message="Emergency Dispatch — Payment is Pending"
                description="This order has been completed but payment has NOT been collected. The production team has requested emergency dispatch for one or more products to deliver immediately. As Sales Head, your approval per product is Step 1 of 2 — it authorizes proceeding without full payment and notifies the Operations Head for final approval."
                style={{ borderRadius: 8, whiteSpace: 'pre-wrap' }}
              />
              <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                <Descriptions.Item label="Order ID"><span style={{ color: '#B11E6A', fontWeight: 700 }}>{liveOrder.oid}</span></Descriptions.Item>
                <Descriptions.Item label="Client">{liveOrder.hotelName}</Descriptions.Item>
                <Descriptions.Item label="Total Amount">₹{(liveOrder.totalAmount || 0).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Payment Status"><Tag color="error">{liveOrder.paymentStatus || 'Unpaid'}</Tag></Descriptions.Item>
                <Descriptions.Item label="Sales Person" span={2}>{liveOrder.salesPerson || '—'}</Descriptions.Item>
              </Descriptions>
              {pending.length === 0 ? (
                <Alert type="success" showIcon message="All emergency requests for this order have been approved by Sales." style={{ borderRadius: 8 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Products awaiting your approval ({pending.length})</Text>
                    {pending.length > 1 && (
                      <Button size="small" danger loading={approvingAllEmergency}
                        onClick={async () => {
                          setApprovingAllEmergency(true);
                          try {
                            for (const req of pending) {
                              // eslint-disable-next-line no-await-in-loop
                              await approveEmergencySalesHead(req.taskId).unwrap();
                            }
                            enqueueSnackbar(`Emergency dispatch approved for all ${pending.length} product(s). Ops Head approval is next.`, { variant: 'success' });
                          } catch (err) {
                            enqueueSnackbar(err?.data?.message || 'Some approvals failed — please retry the remaining product(s).', { variant: 'error' });
                          } finally {
                            setApprovingAllEmergency(false);
                          }
                        }}>
                        Approve All
                      </Button>
                    )}
                  </div>
                  {pending.map((req) => (
                    <div key={req.taskId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: '1px solid #ffccc7', background: '#fff2f0', borderRadius: 8, padding: '8px 12px' }}>
                      <div>
                        <Text strong>{req.product}</Text>
                        {req.reason && <div><Text type="secondary" style={{ fontSize: 12 }}>Reason: {req.reason}</Text></div>}
                      </div>
                      <Button size="small" type="primary" danger
                        loading={approvingEmergencyTaskId === req.taskId}
                        onClick={async () => {
                          setApprovingEmergencyTaskId(req.taskId);
                          try {
                            await approveEmergencySalesHead(req.taskId).unwrap();
                            enqueueSnackbar(`Emergency dispatch approved for "${req.product}". Ops Head approval is next.`, { variant: 'success' });
                          } catch (err) {
                            enqueueSnackbar(err?.data?.message || 'Approval failed', { variant: 'error' });
                          } finally {
                            setApprovingEmergencyTaskId(null);
                          }
                        }}>
                        Approve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Alert type="warning" showIcon
                message="What happens after your approval?"
                description="The Operations Head will receive a notification to approve each product in the Operations page. Only after both approvals can that product's dispatch proceed."
                style={{ borderRadius: 8 }}
              />
            </div>
          );
        })()}
      </Modal>

      {/* ── Quick Add Payment Entry Modal ─────────────────────────────────── */}
      {renderPayEntryModal()}

    </div>
  );
}

const ORDER_STATUS_COLORS = {
  'In Production': '#B11E6A', 'Dispatch Ready': '#8a1652',
  'Payment Pending': '#fa8c16', Completed: '#52c41a',
  Dispatched: '#1890ff', Closed: '#aaa', Cancelled: '#ff4d4f',
};

function ExpandedPartyOrders({ hotelName, onView, onEdit }) {
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
          // Kit-aware total: use computeRecordGrandTotal so kitPrice×overallQty is honoured for kit orders
          const kitAwareAmt = r2(computeRecordGrandTotal(order));
          const _subtotal = items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0), 0);
          const _gstFromItems = items.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.price || p.rate) || 0) * ((Number(p.gst) || 0) / 100), 0);
          const _gst = _gstFromItems > 0 ? _gstFromItems : (Number(order.gstAmount) || 0);
          const rawAmt = _subtotal > 0 ? r2(_subtotal + _gst) : 0;
          const amount = kitAwareAmt > 0 ? kitAwareAmt : (rawAmt > 0 ? rawAmt : (Number(order.total) || Number(order.totalAmount) || Number(order.amount) || 0));
          const orderWithKey = { ...order, key: order._id, oid: order.orderCode };
          return (
            <div
              key={order._id || i}
              style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                background: '#fff', borderRadius: 8, padding: '10px 14px',
                border: '1px solid #f0f0f0', fontSize: 13,
                cursor: onView ? 'pointer' : 'default',
              }}
              onClick={() => onView && onView(orderWithKey)}
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
              <Space size={4} style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {onView && (
                  <Tooltip title="View Order">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => onView(orderWithKey)} />
                  </Tooltip>
                )}
                {onEdit && (
                  <Tooltip title="Edit Order">
                    <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(orderWithKey)} />
                  </Tooltip>
                )}
              </Space>
            </div>
          );
        })}
      </div>
    </div>
  );
}
