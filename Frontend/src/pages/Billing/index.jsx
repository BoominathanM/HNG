import React, { useState, useEffect, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Drawer, Form, Input, Select,
  Typography, Space, Divider, Avatar, InputNumber, Tabs, Tooltip, Modal, DatePicker, TimePicker, Upload, Switch,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, PrinterOutlined, DownloadOutlined, EyeOutlined,
  CheckCircleOutlined, LeftOutlined, CloseOutlined, UserOutlined,
  SearchOutlined, DeleteOutlined, CalendarOutlined, MinusOutlined,
  ShopOutlined, EnvironmentOutlined, BankOutlined, WhatsAppOutlined,
  FileDoneOutlined, EditOutlined, UploadOutlined, BellOutlined, SafetyCertificateOutlined,
  GiftOutlined, AlertFilled, ExperimentOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import PhoneInput from '../../components/common/PhoneInput';
import { phoneValidator } from '../../utils/validation';
import dayjs from 'dayjs';
import DocumentTemplate, { generatePrintHTML } from '../../components/templates/DocumentTemplate';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetInvoicesQuery,
  useGetQuotationsInProcessQuery,
  useGetBillingPartiesQuery,
  useGetItemsQuery,
  useCreateInvoiceMutation,
  useRecordPaymentMutation,
  useConvertQuotationToInvoiceMutation,
  useCreateBillingPartyMutation,
  useUpdateInvoiceGstMutation,
  useGetBillingPartyLedgerQuery,
  useGetCompanySettingsQuery,
  useGetSalesOrdersQuery,
  useUpdateSalesOrderMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

// All billing data loaded from API
// Round money to 2 decimals (strip float noise) without collapsing genuine paise to whole rupees.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Mirror of Sales/index.jsx itemsToProducts — converts flat items[] to products[] shape.
// Needed when a lead/order only has items (older records) rather than the products[] array.
const itemsToProducts = (items = []) =>
  (items || []).filter(Boolean).map((i) => ({
    ...i,
    name: i.name || i.itemName || '',
    qty: i.qty,
    rate: Number(i.price) || Number(i.rate) || 0,
    gst: i.gst || 0,
    isKit: i.isKit || false,
    kitId: i.kitId || '',
    kitType: i.kitType || '',
    category: i.category || '',
  }));

// Kit-aware grand total — mirrors computeRecordGrandTotal / computeRecordBuckets in Sales/index.jsx.
// Uses products[] + kitOrders[] from the quotation/order document.
// Returns 0 when no composition data is present so callers can fall back to the stored total.
const computeKitAwareTotal = (rec) => {
  const products = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  if (!products.length && !kitOrders.length) return 0;

  const catOf = (p) => {
    if (p.category) return p.category;
    if (p.isKit || p.kitType) return 'separate_kit';
    return 'separate_product';
  };

  // GST-inclusive subtotal of non-kit product rows.
  // Accepts both 'rate' (Sales form field) and 'price' (quotation item schema field).
  const sumProds = (rows) => r2(rows.reduce((s, p) => {
    const qty = Number(p.qty) || 0;
    const rate = Number(p.rate) || Number(p.price) || 0;
    const gst = Number(p.gst) || 0;
    return s + qty * rate + qty * rate * gst / 100;
  }, 0));

  const kitRowsAll = products.filter(p => p.isKit || p.kitType);
  const nonKitProds = products.filter(p => !(p.isKit || p.kitType));
  const persProds = nonKitProds.filter(p => catOf(p) === 'personalized');
  const sepProds = nonKitProds.filter(p => catOf(p) === 'separate_product');

  // Value of one kit order — mirrors Sales kitOrderValue exactly:
  // kitPrice × overallQty when a price is set, else component-row subtotal × overallQty.
  const kitVal = (ko) => {
    const price = Number(ko.kitPrice) || 0;
    const qty = Number(ko.overallQty) || 0;
    if (price > 0) return r2(price * (qty || 1));
    const rows = kitRowsAll.filter(r => r.kitId === ko.kitId);
    const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || Number(p.price) || 0), 0);
    const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || Number(p.price) || 0) * ((Number(p.gst) || 0) / 100), 0);
    return r2((sub + gst) * (qty || 1));
  };

  let personalizedKit = 0, separateKit = 0;
  if (kitOrders.length) {
    kitOrders.forEach(ko => {
      const val = kitVal(ko);
      if ((ko.category || 'separate_kit') === 'personalized') personalizedKit += val;
      else separateKit += val;
    });
  } else if (kitRowsAll.length) {
    // Legacy: no kitOrders array — use top-level kitPrice if set
    const topPrice = Number(rec.kitPrice) || 0;
    const topQty = Number(rec.kitOverallQty) || 0;
    separateKit = topPrice > 0 ? r2(topPrice * (topQty || 1)) : sumProds(kitRowsAll);
  }

  const personalized = r2(personalizedKit + sumProds(persProds));
  const separateProduct = sumProds(sepProds);
  const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
  return r2(personalized + separateKit + separateProduct + fwd);
};

const statusColor = { Paid: '#6b1240', Pending: '#C94F8A', 'Partially Paid': '#B11E6A', Overdue: '#8a1652' };
const quotStatusColor = { 'In Process': '#7c3aed', Paid: '#6b1240', 'Partially Paid': '#B11E6A', Unpaid: '#C94F8A' };

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh',
];

export default function Billing() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const sectionBg = isDark ? '#16161e' : '#fafafa';
  const inputBg = isDark ? '#1a1a2a' : '#fff';

  // Pagination state must come before the query that uses them
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(null);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize, setInvoicesPageSize] = useState(10);

  // Data — RTK Query
  const { data: invoicesData } = useGetInvoicesQuery({ page: invoicesPage, limit: invoicesPageSize, ...(invoiceStatusFilter ? { status: invoiceStatusFilter } : {}) });
  const { data: quotationsData } = useGetQuotationsInProcessQuery();
  const { data: partiesData } = useGetBillingPartiesQuery();
  const { data: invItemsData } = useGetItemsQuery({ limit: 1000 });
  const { data: companySettingsData } = useGetCompanySettingsQuery();
  const { data: salesOrdersRaw } = useGetSalesOrdersQuery({ limit: 200 });
  const invoiceSettings = companySettingsData?.data || {};
  const [createInvoiceMutation] = useCreateInvoiceMutation();
  const [recordPaymentMutation] = useRecordPaymentMutation();
  const [convertQuotationMutation] = useConvertQuotationToInvoiceMutation();
  const [createBillingPartyMutation] = useCreateBillingPartyMutation();
  const [updateInvoiceGstMutation] = useUpdateInvoiceGstMutation();
  const [updateSalesOrderMutation] = useUpdateSalesOrderMutation();

  // Map each lead id → its converted sales order (the order carries the resolved kitPrice
  // that produces the "Amount to Pay" Sales shows; the lead's kitPrice is often stale).
  // Used by BOTH invoiceList and quotationList so the two render identically.
  const orderByLead = useMemo(() => {
    const m = {};
    (salesOrdersRaw?.data || []).forEach((o) => {
      const lid = o.leadId && typeof o.leadId === 'object' ? o.leadId._id : o.leadId;
      if (lid) m[String(lid)] = o;
    });
    return m;
  }, [salesOrdersRaw]);

  const invoiceList = useMemo(() => (invoicesData?.data || []).map((inv) => {
    const halfGst = r2((inv.gstAmount || 0) / 2);
    // orderId is populated with products/kitOrders and a nested leadId (with full lead fields)
    const linkedOrder = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const linkedLead = linkedOrder?.leadId && typeof linkedOrder.leadId === 'object' ? linkedOrder.leadId : null;
    // Resolve the SAME full sales order the quotation tab uses (richest kitOrders/items),
    // via leadId → orderByLead; fall back to the invoice's own populated orderId.
    const leadId = linkedLead?._id || linkedOrder?.leadId;
    const fullOrder = (leadId && orderByLead[String(leadId)]) || linkedOrder;
    // The ORDER is the source of truth for the billed "Amount to Pay" (its kitOrders carry
    // the resolved kitPrice; the lead's kitPrice is often stale). Fall back to lead, then invoice.
    const fwdSrc = fullOrder || linkedLead;
    const fwdEnabled = !!(fwdSrc?.forwardingCharge ?? linkedLead?.forwardingCharge);
    const fwdAmt = fwdEnabled ? r2(Number(fwdSrc?.forwardingChargeAmount ?? linkedLead?.forwardingChargeAmount) || 0) : 0;
    // Kit composition (identical resolution to quotationList): order products → order items → lead
    const srcProds = fullOrder?.products?.length
      ? fullOrder.products
      : (fullOrder?.items?.length
          ? itemsToProducts(fullOrder.items)
          : (linkedLead?.products?.length
              ? linkedLead.products
              : itemsToProducts(linkedLead?.items?.length ? linkedLead.items : (inv.items || []))));
    const srcKitOrders = fullOrder?.kitOrders?.length ? fullOrder.kitOrders : (linkedLead?.kitOrders || []);
    const srcRec = (srcProds.length || srcKitOrders.length)
      ? { products: srcProds, kitOrders: srcKitOrders, forwardingCharge: fwdEnabled, forwardingChargeAmount: fwdAmt }
      : null;
    const kitTotal = srcRec ? computeKitAwareTotal(srcRec) : 0;
    // Chain: kitAwareTotal > order.total > lead.total > invoice.total
    const invTotal = r2(kitTotal > 0 ? kitTotal : (Number(fullOrder?.total) || Number(linkedLead?.total) || Number(inv.total) || 0));
    const invPaid = r2(Number(inv.advanceAmount) || 0);
    const invBalance = r2(Math.max(0, invTotal - invPaid));
    const invStatus = invTotal > 0
      ? (invPaid >= invTotal ? 'Paid' : invPaid > 0 ? 'Partially Paid' : 'Unpaid')
      : (inv.status || 'Unpaid');
    return {
      key: inv._id,
      inv: inv.invoiceNumber,
      client: inv.partyId?.name || '—',
      partyPhone: inv.partyId?.phone || '',
      partyGst: inv.partyId?.gstNumber || '',
      order: linkedOrder?.orderCode || '—',
      orderCategory: (linkedOrder?.orderCategory === 'SAMPLE' || linkedLead?.leadType === 'SAMPLE') ? 'SAMPLE' : (linkedOrder?.orderCategory || 'ORDER'),
      isEmergency: !!(linkedOrder?.isEmergency),
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : '—',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleString() : '—',
      amount: inv.subtotal,
      gst: inv.gstAmount,
      gstPercent: inv.gstPercent,
      total: invTotal,
      advance: invPaid,
      balance: invBalance,
      previousBalance: inv.previousBalance || 0,
      type: inv.invoiceType,
      status: invStatus,
      note: inv.note || '',
      isComplementary: inv.isComplementary,
      complementaryNote: inv.complementaryNote || '',
      // DocumentTemplate summary fields
      taxableAmount: inv.subtotal || 0,
      cgst: halfGst,
      sgst: halfGst,
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      // DocumentTemplate customer block
      customer: {
        name: inv.partyId?.name || '—',
        mobile: inv.partyId?.phone || '',
        gstin: inv.partyId?.gstNumber || '',
        address: inv.partyId?.address || '',
        city: inv.partyId?.city || '',
        pan: inv.partyId?.pan || '',
        placeOfSupply: inv.partyId?.state || 'Tamil Nadu',
      },
      items: (inv.items || []).filter(Boolean).map(i => ({
        key: i._id || i.itemId,
        name: i.itemName,
        unit: i.unit,
        rate: i.price || 0,
        qty: i.qty || 0,
        taxRate: i.taxRate || 0,
        taxAmt: i.taxAmt || 0,
        amount: i.lineTotal ?? ((i.price || 0) * (i.qty || 0)),
      })),
      // Kit composition for category-aware document rendering — order is source of truth
      products: srcProds,
      kitOrders: srcKitOrders,
    };
  }), [invoicesData, orderByLead]);

  const quotationList = useMemo(() => (quotationsData?.data || []).map((q) => {
    const halfGst = r2((q.gstAmount || 0) / 2);
    // leadId is now populated — prefer lead's hotel name over stored clientName
    const lead = q.leadId && typeof q.leadId === 'object' ? q.leadId : null;
    const leadId = lead?._id || (typeof q.leadId === 'string' ? q.leadId : null);
    const linkedOrder = leadId ? orderByLead[String(leadId)] : null;
    const clientDisplay = lead?.hotelName || q.clientName || '—';
    // Order is source of truth for the billed total (resolved kitPrice) → lead → quotation
    const fwdSrc = linkedOrder || lead;
    const fwdEnabled = !!(fwdSrc?.forwardingCharge ?? lead?.forwardingCharge ?? q.forwardingCharge);
    const fwdAmt = fwdEnabled ? r2(Number(fwdSrc?.forwardingChargeAmount ?? lead?.forwardingChargeAmount ?? q.forwardingChargeAmount) || 0) : 0;
    // Products: order's items → lead's products → quotation items
    const lProds = linkedOrder?.products?.length
      ? linkedOrder.products
      : (linkedOrder?.items?.length
          ? itemsToProducts(linkedOrder.items)
          : (lead?.products?.length
              ? lead.products
              : itemsToProducts(lead?.items?.length ? lead.items : (q.items || []))));
    const lKitOrders = linkedOrder?.kitOrders?.length ? linkedOrder.kitOrders : (lead?.kitOrders || q.kitOrders || []);
    const sourceRec = { products: lProds, kitOrders: lKitOrders, forwardingCharge: fwdEnabled, forwardingChargeAmount: fwdAmt };
    const kitTotal = computeKitAwareTotal(sourceRec);
    // Chain: kitAwareTotal > order.total > lead.total > q.total (stale snapshot)
    const total = r2(kitTotal > 0 ? kitTotal : (Number(linkedOrder?.total) || Number(lead?.total) || Number(q.total) || 0));
    // paymentCollection from lead is authoritative (Sales reads the same source)
    const leadColl = r2((lead?.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0));
    const quotColl = r2((q.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0));
    const collTotal = leadColl || quotColl;
    const paid = r2(collTotal || Number(q.advancePaid) || 0);
    const balance = r2(Math.max(0, total - paid));
    const qStatus = total > 0
      ? (r2(paid) >= r2(total) ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid')
      : (q.status || 'Unpaid');
    return {
      key: q._id,
      docType: 'Quotation',
      quot: q.quotCode,
      client: clientDisplay,
      order: q.orderId?.orderCode || '—',
      orderCategory: (lead?.leadType === 'SAMPLE') ? 'SAMPLE' : 'ORDER',
      isEmergency: false,
      date: q.quoteDate ? new Date(q.quoteDate).toLocaleString() : '—',
      amount: q.amount,
      gst: q.gstAmount,
      total,
      advance: paid,
      balance,
      type: q.type,
      status: qStatus,
      note: q.note || '',
      taxableAmount: q.amount || 0,
      cgst: halfGst,
      sgst: halfGst,
      // Boolean flag + amount (matches Order model pattern; DocumentTemplate understands both)
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      customer: {
        name: clientDisplay,
        mobile: lead?.phone || '',
        gstin: lead?.gstNumber || '',
        address: '',
        city: lead?.locationCity || '',
        pan: '',
        placeOfSupply: 'Tamil Nadu',
      },
      items: (q.items || []).filter(Boolean).map(i => ({
        key: i._id || i.itemId,
        name: i.itemName,
        unit: i.unit,
        rate: i.price || 0,
        qty: i.qty || 0,
        taxRate: i.taxRate || 0,
        taxAmt: i.taxAmt || 0,
        amount: i.lineTotal ?? ((i.price || 0) * (i.qty || 0)),
      })),
      // Kit composition data for category-aware document rendering — order is source of truth
      products: lProds,
      kitOrders: lKitOrders,
    };
  }), [quotationsData, orderByLead]);

  const partiesList = useMemo(() => (partiesData?.data || []).map((p) => ({
    key: p._id,
    name: p.name,
    phone: p.phone || '',
    type: p.type,
    balance: p.runningBalance || 0,
    openingBalance: p.openingBalance || 0,
    openingBalDir: p.openingBalDir,
    gstNumber: p.gstNumber,
    panNumber: p.panNumber,
    creditPeriod: p.creditPeriod,
    creditLimit: p.creditLimit,
    category: p.category,
    contactPerson: p.contactPerson,
    dob: p.dob,
    street: p.street,
    state: p.state,
    pincode: p.pincode,
    city: p.city,
  })), [partiesData]);

  const itemsList = useMemo(() => (invItemsData?.data || []).map((i) => ({
    key: i._id,
    name: i.itemName,
    price: i.sellingPrice || i.purchasePrice,
    unit: i.unit,
    stock: i.currentStock,
    initials: i.itemName?.[0]?.toUpperCase() || 'I',
    color: '#B11E6A',
  })), [invItemsData]);

  const salesOrdersList = useMemo(() => (salesOrdersRaw?.data || []).map((o) => {
    const rawItems = (o.items || []).map(i => ({
      name: i.itemName || i.name || '',
      qty: Number(i.qty) || 0,
      unit: i.unit || 'PCS',
      rate: Number(i.price || i.rate) || 0,
      gst: Number(i.gst) || 0,
    }));
    const subtotal = r2(rawItems.reduce((s, i) => s + i.qty * i.rate, 0));
    const gstFromItems = r2(rawItems.reduce((s, i) => s + i.qty * i.rate * i.gst / 100, 0));
    const effectiveGst = gstFromItems > 0 ? gstFromItems : (Number(o.gstAmount) || 0);
    const fwdEnabled = !!o.forwardingCharge;
    const fwdAmt = fwdEnabled ? r2(Number(o.forwardingChargeAmount) || 0) : 0;
    // Kit-aware total takes priority; fall back to stored o.total then item-computed
    const kitTotal = computeKitAwareTotal(o);
    const total = r2(kitTotal > 0 ? kitTotal : (Number(o.total) || (subtotal + effectiveGst + fwdAmt)));
    const collTotal = r2((o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0));
    const paid = r2(collTotal || Number(o.paidAmount) || Number(o.advancePaid) || Number(o.advancePaidAmount) || 0);
    const balance = Math.max(0, total - paid);
    const halfGst = r2(effectiveGst / 2);
    const status = total > 0
      ? (paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid')
      : (o.paymentStatus || 'Unpaid');
    const taxAmt = rawItems.map(i => {
      const ta = r2(i.qty * i.rate * i.gst / 100);
      return { name: i.name, qty: i.qty, unit: i.unit, rate: i.rate, taxRate: i.gst, taxAmt: ta, amount: i.qty * i.rate + ta };
    });
    return {
      key: o._id,
      docType: 'Order',
      // Use 'quot' so the shared column (dataIndex: 'quot') renders the order code
      quot: o.orderCode,
      inv: o.orderCode,
      client: o.clientName || o.clientPartyId?.name || '—',
      order: '',
      orderCategory: o.orderCategory || 'ORDER',
      isEmergency: o.isEmergency || false,
      date: o.createdAt ? dayjs(o.createdAt).format('DD/MM/YYYY') : '—',
      amount: subtotal,
      gst: effectiveGst,
      total,
      // Use 'advance' so the shared "Advance" column shows the paid amount for orders
      advance: paid,
      balance,
      type: o.billType === 'NON_GST' ? 'Non-GST' : (o.type || 'GST'),
      status,
      taxableAmount: subtotal,
      cgst: halfGst,
      sgst: halfGst,
      // Boolean + amount (DocumentTemplate understands this pattern)
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      customer: {
        name: o.billingName || o.clientName || '—',
        address: o.detailedAddress || '',
        city: [o.city, o.state, o.pincode].filter(Boolean).join(', '),
        mobile: o.clientPhone || o.phone || '',
        gstin: o.gstNumber || '',
        pan: '',
        placeOfSupply: o.state || 'Tamil Nadu',
      },
      items: taxAmt,
      paymentCollection: o.paymentCollection || [],
      // Kit composition data for category-aware document rendering
      products: o.products || [],
      kitOrders: o.kitOrders || [],
    };
  }), [salesOrdersRaw]);

  const [activeTab, setActiveTab] = useState('quotation-in-process');
  const { filterTabs, activeKeyFor } = useTabAccess('Billing');
  const { requireAccess } = usePageAccess('Billing');

  // View invoice / quotation
  const [viewModal, setViewModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [viewDocType, setViewDocType] = useState('invoice');
  const [ledgerEntries, setLedgerEntries] = useState([]);

  // Parties & Ledgers tab state
  const [viewBillingPartyLedger, setViewBillingPartyLedger] = useState(null);
  const [billingPartiesSearch, setBillingPartiesSearch] = useState('');

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
  const [gstPercent, setGstPercent] = useState(18);
  const [noteText, setNoteText] = useState('');
  const [advanceAmt, setAdvanceAmt] = useState(0);

  // Complementary order
  const [isComplementary, setIsComplementary] = useState(false);
  const [complementaryNote, setComplementaryNote] = useState('');

  // Record Payment In
  const [recordPayOpen, setRecordPayOpen] = useState(false);
  const [recordPayInv, setRecordPayInv] = useState(null);
  const [payParty, setPayParty] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [payBankAccount, setPayBankAccount] = useState(null);
  const [payUpiRef, setPayUpiRef] = useState('');
  const [payCardLast4, setPayCardLast4] = useState('');
  const [payTransactionRef, setPayTransactionRef] = useState('');
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payChequeBank, setPayChequeBank] = useState('');
  const [payChequeDate, setPayChequeDate] = useState(null);
  const [quotStatusFilter, setQuotStatusFilter] = useState('all');
  const [quotSearch, setQuotSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState(null);
  const [payNote, setPayNote] = useState('');
  const [payNoteVisible, setPayNoteVisible] = useState(false);
  const [payDiscountVisible, setPayDiscountVisible] = useState(false);
  const [payDiscount, setPayDiscount] = useState(0);
  const [paymentRefNum] = useState('176');
  const [payLinkedInvoices, setPayLinkedInvoices] = useState([]);

  // Convert to Invoice modal (partial conversion)
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertQuot, setConvertQuot] = useState(null);
  const [convertAmt, setConvertAmt] = useState(0);
  const [convertPreviousDue, setConvertPreviousDue] = useState(0);
  const [convertPrevInvoices, setConvertPrevInvoices] = useState([]);
  const [convertDocType, setConvertDocType] = useState('quotation'); // 'quotation' | 'order'

  // View proof modal (Paid quotation)
  const [proofOpen, setProofOpen] = useState(false);
  const [proofQuot, setProofQuot] = useState(null);

  // Reminder modal (Paid / Partially Paid)
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderQuot, setReminderQuot] = useState(null);
  const [reminderDate, setReminderDate] = useState(null);
  const [reminderTime, setReminderTime] = useState(null);
  const [reminderMode, setReminderMode] = useState('WhatsApp');

  // Verify payment modal (Paid quotation)
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyQuot, setVerifyQuot] = useState(null);
  const [verifierName, setVerifierName] = useState('');

  // Edit GST modal (Invoices tab)
  const [gstEditOpen, setGstEditOpen] = useState(false);
  const [gstEditInv, setGstEditInv] = useState(null);
  const [gstEditValue, setGstEditValue] = useState(0);

  const filteredParties = partiesList.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.phone || '').includes(partySearch)
  );

  const filteredItems = itemsList.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const billingPartiesData = Object.values(
    invoiceList.reduce((acc, inv) => {
      if (!acc[inv.client]) {
        acc[inv.client] = { key: inv.client, name: inv.client, type: 'Customer', totalSales: 0, received: 0, pending: 0 };
      }
      acc[inv.client].totalSales += inv.total;
      acc[inv.client].received += inv.advance;
      acc[inv.client].pending += inv.balance;
      return acc;
    }, {})
  );

  const subtotal = invoiceItems.filter(Boolean).reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
  const gstAmt = invoiceType === 'GST' ? subtotal * (gstPercent / 100) : 0;
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

  const handleSaveParty = async () => {
    const vals = partyForm.getFieldsValue();
    if (!vals.partyName) { enqueueSnackbar('Party name is required', { variant: 'error' }); return; }
    const catMap = { vip: 'VIP', regular: 'Regular', wholesale: 'Wholesale' };
    try {
      const res = await createBillingPartyMutation({
        name: vals.partyName,
        phone: vals.phone || '',
        type: partyType === 'supplier' ? 'Supplier' : 'Customer',
        gstNumber: vals.gst || '',
        panNumber: vals.pan || '',
        openingBalance: parseFloat(vals.openingBal) || 0,
        openingBalDir: openingBalType,
        creditPeriod: Number(vals.creditPeriod) || 7,
        creditLimit: vals.creditLimit != null && vals.creditLimit !== '' ? Number(vals.creditLimit) : undefined,
        category: catMap[vals.category] || '',
        contactPerson: vals.contactPerson || '',
        street: vals.street || '',
        state: vals.state || '',
        pincode: vals.pincode || '',
        city: vals.city || '',
        ...(vals.dob ? { dob: vals.dob.format ? vals.dob.format('YYYY-MM-DD') : vals.dob } : {}),
      }).unwrap();
      const created = res.data || res;
      handleSelectParty({ ...created, key: created._id, balance: created.openingBalance || 0 });
      partyForm.resetFields();
      billingForm.resetFields();
      setShowBillingAddr(false);
      enqueueSnackbar('Party created', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create party', { variant: 'error' });
    }
  };

  const handleSave = async () => {
    const partyId = selectedParty?.key || selectedParty?._id;
    if (!partyId) { enqueueSnackbar('Please select a party', { variant: 'error' }); return; }
    if (!isComplementary && invoiceItems.length === 0) {
      enqueueSnackbar('Please add at least one item', { variant: 'error' }); return;
    }
    const isObjectId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ''));
    const payload = {
      partyId,
      invoiceType,
      invoiceDate: invoiceDate ? invoiceDate.toISOString() : undefined,
      dueDate: showDueDate && dueDate ? dueDate.toISOString() : undefined,
      subtotal,
      gstPercent: invoiceType === 'GST' ? gstPercent : 0,
      gstAmount: gstAmt,
      total,
      advanceAmount: advanceAmt || 0,
      note: noteText || '',
      isComplementary,
      complementaryNote: isComplementary ? complementaryNote : '',
      items: invoiceItems.map((i) => ({
        itemName: i.name,
        unit: i.unit,
        price: i.price,
        qty: i.qty,
        ...(isObjectId(i.key) ? { itemId: i.key } : {}),
      })),
    };
    try {
      await createInvoiceMutation(payload).unwrap();
      enqueueSnackbar('Invoice created', { variant: 'success' });
      setDrawerOpen(false);
      setInvoiceItems([]);
      setSelectedParty(null);
      setNoteText('');
      setAdvanceAmt(0);
      setShowPartySearch(false);
      setShowCreateParty(false);
      setShowItemSearch(false);
      setIsComplementary(false);
      setComplementaryNote('');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create invoice', { variant: 'error' });
    }
  };

  const bankAccounts = ['HDFC Bank - ****1234', 'SBI Bank - ****5678', 'Axis Bank - ****9012'];

  const openRecordPay = (inv) => {
    const party = partiesList.find(p => p.name === inv.client) || { name: inv.client, balance: inv.balance };
    setRecordPayInv(inv);
    setPayParty(party);
    setPayAmount(inv.balance);
    setPayLinkedInvoices([inv]);
    setPayMode('Cash');
    setPayBankAccount(null);
    setPayUpiRef('');
    setPayCardLast4('');
    setPayTransactionRef('');
    setPayChequeNo('');
    setPayChequeBank('');
    setPayChequeDate(null);
    setPayDiscount(0);
    setPayNote('');
    setPayNoteVisible(false);
    setPayDiscountVisible(false);
    setRecordPayOpen(true);
  };

  const handleSavePayment = async () => {
    if (!recordPayInv?.key) { enqueueSnackbar('No invoice selected', { variant: 'error' }); return; }
    try {
      if (recordPayInv.docType === 'Order') {
        const net = (Number(payAmount) || 0) - (Number(payDiscount) || 0);
        const existing = recordPayInv.paymentCollection || [];
        const newPaid = existing.reduce((s, e) => s + Number(e.paidAmount || 0), 0) + net;
        const newBalance = Math.max(0, (recordPayInv.total || 0) - newPaid);
        await updateSalesOrderMutation({
          id: recordPayInv.key,
          paidAmount: newPaid,
          balance: newBalance,
          paymentCollection: [
            ...existing,
            { paidAmount: net, paymentMode: payMode || 'Cash', note: payNote || '', date: new Date().toISOString() },
          ],
        }).unwrap();
      } else {
        await recordPaymentMutation({
          id: recordPayInv.key,
          amount: Number(payAmount) || 0,
          discount: Number(payDiscount) || 0,
          paymentMode: payMode === 'Net Banking' ? 'Bank Transfer' : (payMode || 'Cash'),
          note: payNote || '',
          ...(payBankAccount ? { bankAccount: payBankAccount } : {}),
          ...(payUpiRef ? { upiReference: payUpiRef } : {}),
          ...(payCardLast4 ? { cardLast4: payCardLast4 } : {}),
          ...(payTransactionRef ? { transactionRef: payTransactionRef } : {}),
          ...(payChequeNo ? { chequeNumber: payChequeNo } : {}),
          ...(payChequeBank ? { chequeBank: payChequeBank } : {}),
          ...(payChequeDate ? { chequeDate: payChequeDate.format ? payChequeDate.format('YYYY-MM-DD') : payChequeDate } : {}),
          ...(payParty?.key ? { partyId: payParty.key } : {}),
        }).unwrap();
      }
      enqueueSnackbar(`Payment of ₹${(payAmount || 0).toLocaleString()} recorded successfully`, { variant: 'success' });
      setRecordPayOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to record payment', { variant: 'error' });
    }
  };

  const openConvertModal = (doc, docType = 'quotation') => {
    const prevInvs = invoiceList.filter(inv => inv.client === doc.client && inv.balance > 0);
    const prevDue = prevInvs.reduce((sum, inv) => sum + inv.balance, 0);
    setConvertDocType(docType);
    setConvertQuot(doc);
    setConvertAmt(doc.total);
    setConvertPreviousDue(prevDue);
    setConvertPrevInvoices(prevInvs);
    setConvertOpen(true);
  };

  const handleConvertConfirm = async () => {
    if (!requireAccess('edit')) return;
    if (!convertQuot) return;
    const amt = convertAmt || convertQuot.total;
    const party = partiesList.find(p => p.name === convertQuot.client);
    if (!party?.key) {
      enqueueSnackbar(`Create a billing party named "${convertQuot.client}" before converting`, { variant: 'error' });
      return;
    }
    try {
      if (convertDocType === 'order') {
        await createInvoiceMutation({
          partyId: party.key,
          invoiceType: convertQuot.type || 'GST',
          subtotal: convertQuot.amount || 0,
          gstAmount: convertQuot.gst || 0,
          total: amt,
          advanceAmount: convertQuot.advance || 0,
          orderId: convertQuot.key,
          items: (convertQuot.items || []).map(i => ({
            itemName: i.name,
            unit: i.unit || 'PCS',
            price: i.rate || 0,
            qty: i.qty || 0,
          })),
        }).unwrap();
        enqueueSnackbar(`${convertQuot.quot} converted to invoice and moved to Invoices`, { variant: 'success' });
      } else {
        await convertQuotationMutation({
          quotationId: convertQuot.key,
          partyId: party.key,
          amount: amt,
          includePreviousDue: convertPreviousDue > 0,
        }).unwrap();
        enqueueSnackbar(`${convertQuot.quot} converted to invoice and moved to Invoices`, { variant: 'success' });
      }
      setActiveTab('invoices');
      setConvertOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert', { variant: 'error' });
    }
  };

  const openGstEdit = (inv) => {
    setGstEditInv(inv);
    setGstEditValue(inv.gst);
    setGstEditOpen(true);
  };

  const handleSaveGst = async () => {
    const newGst = gstEditValue || 0;
    if (!gstEditInv?.key) { enqueueSnackbar('No invoice selected', { variant: 'error' }); return; }
    try {
      await updateInvoiceGstMutation({ id: gstEditInv.key, gstAmount: newGst }).unwrap();
      enqueueSnackbar('GST updated successfully', { variant: 'success' });
      setGstEditOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update GST', { variant: 'error' });
    }
  };

  const handlePrintDocument = (docType, data) => {
    const html = generatePrintHTML(docType, data, invoiceSettings);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
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

  const colText = (v) => <Text style={{ fontSize: 13 }}>{v}</Text>;
  const colMoney = (v, color) => <Text style={{ fontSize: 13, fontWeight: 600, color: color || 'inherit' }}>₹{v.toLocaleString()}</Text>;

  const columns = [
    { title: 'Invoice #', dataIndex: 'inv', width: 120, fixed: 'left', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Date', dataIndex: 'date', width: 155, render: (v) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 165, render: colText },
    {
      title: 'Order', dataIndex: 'order', width: 130,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            {r.isEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
            {r.orderCategory === 'SAMPLE' && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
            <Text style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text>
          </Space>
          {r.isEmergency && <Tag color="red" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency</Tag>}
          {r.orderCategory === 'SAMPLE' && <Tag color="purple" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Sample Order</Tag>}
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 115, render: (v) => colMoney(v) },
    { title: 'Advance', dataIndex: 'advance', width: 115, render: (v) => colMoney(v, '#8a1652') },
    {
      title: 'Balance', dataIndex: 'balance', width: 130,
      render: (v, r) => (
        <div>
          {colMoney(v, v > 0 ? '#B11E6A' : '#52c41a')}
          {r.previousBalance > 0 && (
            <Tooltip title={`Includes ₹${r.previousBalance.toLocaleString()} previous outstanding`}>
              <div style={{ fontSize: 10, color: '#ff4d4f', marginTop: 1, cursor: 'help' }}>
                Prev: ₹{r.previousBalance.toLocaleString()} ⚠
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 125, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 320, fixed: 'right',
      render: (_, r) => (
        <Space size={4} wrap>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedInv(r); setViewDocType('invoice'); setViewModal(true); }} /></Tooltip>
          <Tooltip title="Edit GST"><Button size="small" icon={<EditOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }} onClick={() => openGstEdit(r)} /></Tooltip>
          <Tooltip title="WhatsApp"><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} onClick={() => enqueueSnackbar('Invoice shared on WhatsApp', { variant: 'success' })} /></Tooltip>
          <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument('invoice', r)} /></Tooltip>
          <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} onClick={() => handlePrintDocument('invoice', r)} /></Tooltip>
          {r.balance > 0 && r.orderCategory !== 'SAMPLE' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', fontSize: 12 }} onClick={() => openRecordPay(r)}>Record Manually</Button>
              <Button size="small" icon={<CalendarOutlined />} onClick={() => enqueueSnackbar('Reminder sent to client', { variant: 'success' })} style={{ color: '#fa8c16', fontSize: 12 }}>Reminder</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const makeQuotationColumns = (tabType) => [
    {
      title: 'Reference #', dataIndex: 'quot', width: 150, fixed: 'left',
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: r.docType === 'Order' ? '#B11E6A' : '#7c3aed', fontSize: 13 }}>{v}</Text>
          <Tag style={{ fontSize: 10, borderRadius: 20, padding: '0 6px', lineHeight: '16px',
            background: r.docType === 'Order' ? '#B11E6A15' : '#7c3aed15',
            color: r.docType === 'Order' ? '#B11E6A' : '#7c3aed',
            border: `1px solid ${r.docType === 'Order' ? '#B11E6A44' : '#7c3aed44'}` }}
          >{r.docType === 'Order' ? 'Order' : 'Quotation'}</Tag>
        </Space>
      ),
    },
    { title: 'Date', dataIndex: 'date', width: 155, render: (v) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 165, render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Order', dataIndex: 'order', width: 130,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            {r.isEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
            {r.orderCategory === 'SAMPLE' && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
            <Text style={{ color: '#7c3aed', fontSize: 13 }}>{v}</Text>
          </Space>
          {r.isEmergency && <Tag color="red" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency</Tag>}
          {r.orderCategory === 'SAMPLE' && <Tag color="purple" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Sample Order</Tag>}
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600 }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Paid', dataIndex: 'advance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: '#8a1652' }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Balance', dataIndex: 'balance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? '#B11E6A' : '#52c41a' }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${quotStatusColor[v] || '#aaa'}22`, color: quotStatusColor[v] || '#888', border: `1px solid ${quotStatusColor[v] || '#aaa'}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      width: tabType === 'in-process' ? 500 : 190,
      fixed: 'right',
      render: (_, r) => {
        const isOrder = r.docType === 'Order';
        const docType = isOrder ? 'invoice' : 'quotation';
        return (
          <Space size={4} wrap>
            <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedInv({ ...r, inv: r.quot }); setViewDocType(docType); setViewModal(true); }} /></Tooltip>
            <Tooltip title="WhatsApp"><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} onClick={() => enqueueSnackbar(isOrder ? 'Invoice shared on WhatsApp' : 'Quotation shared on WhatsApp', { variant: 'success' })} /></Tooltip>
            <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument(docType, r)} /></Tooltip>
            <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} onClick={() => handlePrintDocument(docType, r)} /></Tooltip>
            {/* Quotation-specific actions */}
            {tabType === 'in-process' && !isOrder && (
              <Button
                size="small"
                type="primary"
                icon={<FileDoneOutlined />}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', fontSize: 12 }}
                onClick={() => openConvertModal(r)}
              >
                Convert to Invoice
              </Button>
            )}
            {tabType === 'in-process' && !isOrder && (r.status === 'Paid' || r.status === 'Partially Paid') && (
              <Button size="small" icon={<BellOutlined />} style={{ color: '#fa8c16', borderColor: '#fa8c1644', fontSize: 12 }} onClick={() => { setReminderQuot(r); setReminderDate(null); setReminderTime(null); setReminderMode('WhatsApp'); setReminderOpen(true); }}>
                Set Reminder
              </Button>
            )}
            {tabType === 'in-process' && !isOrder && r.status === 'Paid' && (
              <>
                <Button size="small" icon={<EyeOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff44', fontSize: 12 }} onClick={() => { setProofQuot(r); setProofOpen(true); }}>View Proof</Button>
                <Button size="small" icon={<SafetyCertificateOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', fontSize: 12 }} onClick={() => { setVerifyQuot(r); setVerifierName(''); setVerifyOpen(true); }}>Verify</Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const totalRevenue = invoiceList.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoiceList.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoiceList.reduce((s, i) => s + i.balance, 0);
  const totalQuotation = quotationList.reduce((s, q) => s + (q.total || 0), 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Billing" items={[{ label: 'Billing' }]} style={{ marginBottom: 0 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!requireAccess('add')) return; setDrawerOpen(true); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced', val: `₹${(totalRevenue / 100000).toFixed(2)}L`, color: '#B11E6A' },
          { label: 'Paid', val: `₹${(totalPaid / 1000).toFixed(0)}K`, color: '#8a1652' },
          { label: 'TO COLLECT', val: `₹${(totalPending / 1000).toFixed(0)}K`, color: '#C94F8A' },
          { label: 'Total Quotation', val: totalQuotation >= 100000 ? `₹${(totalQuotation / 100000).toFixed(2)}L` : `₹${(totalQuotation / 1000).toFixed(0)}K`, color: '#D85C9E', sub: 'Non-converted' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
                {s.sub && <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Tabs
        onChange={(k) => { setActiveTab(k); setQuotStatusFilter('all'); }}
        items={filterTabs([
          {
            key: 'quotation-in-process',
            label: 'Quotation in Process',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(124,58,237,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${borderColor}` }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search reference, client..." allowClear value={quotSearch} onChange={(e) => setQuotSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                  <Select value={quotStatusFilter} onChange={setQuotStatusFilter} size="small" style={{ width: 180 }}>
                    <Option value="all">All</Option>
                    <Option value="In Process">In Process</Option>
                    <Option value="Paid">Paid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                  </Select>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={quotationList
                      .filter(q => quotStatusFilter === 'all' || q.status === quotStatusFilter)
                      .filter(q => !quotSearch || (q.quot || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.client || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.order || '').toLowerCase().includes(quotSearch.toLowerCase()))}
                    columns={makeQuotationColumns('in-process')}
                    pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'invoices',
            label: 'Invoices',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search invoice, client, order..." allowClear value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                  <Select allowClear placeholder="Status" value={invoiceStatusFilter} onChange={(val) => { setInvoiceStatusFilter(val); setInvoicesPage(1); }} style={{ width: 170, borderRadius: 8 }}>
                    <Option value="Paid">Paid</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                    <Option value="Overdue">Overdue</Option>
                  </Select>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={invoiceList.filter((inv) => {
                      const q = invoiceSearch.toLowerCase();
                      return !q || (inv.inv || '').toLowerCase().includes(q) || (inv.client || '').toLowerCase().includes(q) || (inv.order || '').toLowerCase().includes(q);
                    })}
                    columns={columns}
                    pagination={{
                      current: invoicesPage,
                      pageSize: invoicesPageSize,
                      total: invoicesData?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setInvoicesPage(p); setInvoicesPageSize(ps); },
                      size: 'small',
                    }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </Card>
            ),
          },
        ])}
        activeKey={activeKeyFor(activeTab)}
      />

      {/* ───────────── VIEW QUOTATION / INVOICE ───────────── */}
      <Modal
        open={viewModal}
        onCancel={() => setViewModal(false)}
        footer={null}
        width={Math.min(860, window.innerWidth - 32)}
        styles={{ body: { padding: '16px 12px', background: isDark ? '#1a1a2a' : '#f4f5f9' } }}
        title={
          <Space>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {viewDocType === 'quotation' ? `Quotation: ${selectedInv?.inv}` : `Invoice: ${selectedInv?.inv}`}
            </span>
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintDocument(viewDocType, selectedInv || {})}
            >
              Print
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              type="primary"
              style={{ background: 'linear-gradient(135deg,#2d5016,#4a7c24)', border: 'none' }}
              onClick={() => handlePrintDocument(viewDocType, selectedInv || {})}
            >
              PDF
            </Button>
          </Space>
        }
      >
        {selectedInv && (
          <DocumentTemplate type={viewDocType} data={selectedInv} settings={invoiceSettings} />
        )}
      </Modal>

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
                  <Input
                    type="date"
                    value={invoiceDate ? invoiceDate.format('YYYY-MM-DD') : ''}
                    onChange={(e) => {
                      const d = dayjs(e.target.value);
                      setInvoiceDate(d);
                      if (dueDays !== 'custom') setDueDate(d.add(parseInt(dueDays), 'day'));
                    }}
                    style={{ width: '100%', borderRadius: 8, height: 42 }}
                  />
                </Col>
              </Row>

              {showDueDate && (
                <div>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>Due Date</Text>
                  <Row gutter={8}>
                    <Col flex={1}>
                      <Input
                        type="date"
                        value={dueDate ? dueDate.format('YYYY-MM-DD') : ''}
                        onChange={(e) => { setDueDate(dayjs(e.target.value)); setDueDays('custom'); }}
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
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Contact Number</Text>} name="phone" style={{ marginBottom: 0 }} rules={[phoneValidator(false)]}>
                            <PhoneInput placeholder="Contact number" />
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
                            <DatePicker style={{ width: '100%', borderRadius: 8, height: 40 }} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Space>
                    {[['GST', 'GST'], ['Non-GST', 'Non-GST']].map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => setInvoiceType(val)} style={pill(invoiceType === val)}>{lbl}</button>
                    ))}
                  </Space>
                  {invoiceType === 'GST' && (
                    <InputNumber
                      prefix="GST %"
                      min={0}
                      max={100}
                      value={gstPercent}
                      onChange={(v) => setGstPercent(v || 0)}
                      style={{ borderRadius: 8, width: 110 }}
                    />
                  )}
                </div>
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

              {/* ── Complementary Order toggle ── */}
              <div style={{
                borderRadius: 10,
                border: `1.5px solid ${isComplementary ? '#52c41a55' : borderColor}`,
                background: isComplementary ? (isDark ? '#0a200a' : '#f6ffed') : (isDark ? '#1a1a2a' : '#fafafa'),
                padding: '12px 14px',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space size={8}>
                    <GiftOutlined style={{ color: isComplementary ? '#52c41a' : '#aaa', fontSize: 15 }} />
                    <div>
                      <Text style={{ fontWeight: 700, color: isComplementary ? '#52c41a' : textColor, fontSize: 13, display: 'block' }}>
                        Complementary Order
                      </Text>
                      <Text style={{ fontSize: 11, color: '#aaa' }}>
                        Mark as free — for complaint resolution or goodwill
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={isComplementary}
                    onChange={setIsComplementary}
                    style={{ background: isComplementary ? '#52c41a' : undefined }}
                  />
                </div>
                <AnimatePresence>
                  {isComplementary && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 12, color: '#52c41a', display: 'block', marginBottom: 5, fontWeight: 600 }}>
                          Complaint Reference / Reason
                        </Text>
                        <Input.TextArea
                          placeholder="e.g. Replacing damaged goods from order ORD-2401, complaint ref #C-102..."
                          value={complementaryNote}
                          onChange={(e) => setComplementaryNote(e.target.value)}
                          rows={2}
                          style={{ borderRadius: 8, borderColor: '#52c41a55' }}
                        />
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#52c41a10', border: '1px solid #52c41a33' }}>
                          <Space size={6}>
                            <GiftOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                            <Text style={{ fontSize: 11, color: '#52c41a', fontWeight: 600 }}>
                              This order will be recorded as ₹0 — no charge to client
                            </Text>
                          </Space>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    <Text style={{ color: isDark ? '#aaa' : '#666' }}>GST ({gstPercent}%)</Text>
                    <Text style={{ fontWeight: 600, color: textColor }}>₹{gstAmt.toFixed(2)}</Text>
                  </div>
                )}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 700, fontSize: 15, color: textColor }}>Total</Text>
                  {isComplementary ? (
                    <Space size={6}>
                      <Tag style={{ background: '#52c41a15', color: '#52c41a', border: '1px solid #52c41a33', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        <GiftOutlined /> Complementary
                      </Tag>
                      <Text style={{ fontWeight: 800, fontSize: 16, color: '#52c41a' }}>₹0.00</Text>
                    </Space>
                  ) : (
                    <Text style={{ fontWeight: 800, fontSize: 16, color: '#B11E6A' }}>₹{total.toFixed(2)}</Text>
                  )}
                </div>
                <Divider style={{ margin: '4px 0' }} />
                {!isComplementary && (
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
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: isComplementary ? '#52c41a10' : balanceDue > 0 ? '#B11E6A10' : '#52c41a10', border: `1.5px solid ${isComplementary ? '#52c41a44' : balanceDue > 0 ? '#B11E6A44' : '#52c41a44'}`, marginTop: 4 }}>
                  <Text style={{ fontWeight: 700, color: isComplementary ? '#52c41a' : balanceDue > 0 ? '#B11E6A' : '#52c41a', fontSize: 14 }}>
                    {isComplementary ? 'Complementary — No Charge' : 'Current Bill Balance'}
                  </Text>
                  <Text style={{ fontWeight: 800, color: isComplementary ? '#52c41a' : balanceDue > 0 ? '#B11E6A' : '#52c41a', fontSize: 16 }}>
                    {isComplementary ? '₹0.00' : `₹${balanceDue.toFixed(2)}`}
                  </Text>
                </div>
                {selectedParty && selectedParty.balance > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', borderRadius: 10, background: '#ff4d4f10', border: `1.5px solid #ff4d4f44`, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#ff4d4f', fontSize: 12 }}>Existing Overdue</Text>
                      <Text style={{ color: '#ff4d4f', fontSize: 12 }}>₹{selectedParty.balance.toFixed(2)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: 700, color: '#ff4d4f', fontSize: 14 }}>Total Pending Balance</Text>
                      <Text style={{ fontWeight: 800, color: '#ff4d4f', fontSize: 16 }}>₹{(balanceDue + selectedParty.balance).toFixed(2)}</Text>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </Drawer>

      {/* ───────────── RECORD PAYMENT IN DRAWER ───────────── */}
      <Drawer
        open={recordPayOpen}
        onClose={() => setRecordPayOpen(false)}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{
          body: { padding: 0, background: isDark ? '#f0f0f5' : '#f5f5f8', display: 'flex', flexDirection: 'column' },
          header: { display: 'none' },
          footer: { padding: 0, border: 'none' },
        }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fff', borderTop: '1px solid #e8e8e8' }}>
            <div>
              <Text style={{ fontSize: 13, color: '#666' }}>New Party Balance</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: 700, color: '#e53935' }}>
                  ₹{((payParty?.balance || 0) + (payAmount || 0) - (payDiscount || 0)).toLocaleString()}
                </Text>
                <span style={{ color: '#e53935', fontWeight: 700 }}>↑</span>
              </div>
            </div>
            <Button
              type="primary"
              onClick={handleSavePayment}
              style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', height: 48, paddingInline: 40, borderRadius: 10, fontSize: 16, fontWeight: 700 }}
            >
              Save
            </Button>
          </div>
        }
      >
        {/* ── Sticky header ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button type="text" icon={<LeftOutlined style={{ color: '#3730a3' }} />} onClick={() => setRecordPayOpen(false)} style={{ padding: 0, height: 'auto' }} />
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', flex: 1 }}>Record Payment In</Text>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── Payment ref header ── */}
          <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ebebeb' }}>
            <div>
              <Text style={{ color: '#3730a3', fontWeight: 600, fontSize: 14 }}>Received Payment #{paymentRefNum}</Text>
              <div>
                <Text style={{ color: '#888', fontSize: 13 }}>{dayjs().format('D MMM YYYY')}</Text>
              </div>
            </div>
            <Button size="small" icon={<EditOutlined />} style={{ borderRadius: 20, color: '#555', borderColor: '#ccc', fontSize: 13 }}>EDIT</Button>
          </div>

          {/* ── Party Name ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
                PARTY NAME <span style={{ color: '#e53935' }}>*</span>
              </Text>
              <Text style={{ fontSize: 13, color: '#555' }}>
                Current Balance:{' '}
                <span style={{ color: '#e53935', fontWeight: 700 }}>₹{(payParty?.balance || 0).toLocaleString()}</span>
                <span style={{ color: '#e53935', fontWeight: 700 }}> ↑</span>
              </Text>
            </div>
            <Select
              value={payParty?.name}
              onChange={(val) => setPayParty(partiesList.find(p => p.name === val) || { name: val, balance: 0 })}
              style={{ width: '100%', height: 50 }}
              suffixIcon={<span style={{ color: '#aaa' }}>▼</span>}
              placeholder="Select Party"
            >
              {partiesList.map(p => (
                <Option key={p.key} value={p.name}>
                  <Space><UserOutlined style={{ color: '#aaa' }} />{p.name}</Space>
                </Option>
              ))}
            </Select>
          </div>

          {/* ── Amount ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
                AMOUNT <span style={{ color: '#e53935' }}>*</span>
              </Text>
            </div>
            <InputNumber
              prefix={<Text style={{ color: '#555', fontSize: 16, marginRight: 4 }}>₹</Text>}
              value={payAmount}
              onChange={(v) => setPayAmount(v || 0)}
              min={0}
              style={{ width: '100%', height: 50, borderRadius: 8, fontSize: 18 }}
              controls={false}
            />
            {!payDiscountVisible ? (
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <Text
                  style={{ color: '#3730a3', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setPayDiscountVisible(true)}
                >
                  + Add Payment In Discount
                </Text>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Discount Amount</Text>
                <InputNumber
                  prefix="₹"
                  value={payDiscount}
                  onChange={(v) => setPayDiscount(v || 0)}
                  min={0}
                  max={payAmount}
                  style={{ width: '100%', borderRadius: 8 }}
                  controls={false}
                />
              </div>
            )}
          </div>

          {/* ── Invoice ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Invoice</Text>
              <Text
                style={{ color: '#3730a3', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                onClick={() => enqueueSnackbar('Select unpaid invoice to link', { variant: 'info' })}
              >
                + Add Unpaid Invoice
              </Text>
            </div>
            {payLinkedInvoices.map((inv) => {
              const settled = Math.min(payAmount - (payDiscount || 0), inv.balance);
              return (
                <div key={inv.key} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Text style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>#{inv.inv || inv.key}</Text>
                      <div>
                        <Text style={{ fontSize: 12, color: '#888' }}>
                          Inv Amt: {inv.balance.toLocaleString()} • {dayjs(inv.date?.split(' ')[0] || undefined).format('D MMM YYYY')}
                        </Text>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 15, color: '#1a1a2e' }}>₹ {inv.balance.toLocaleString()}</Text>
                      <div>
                        <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                          ₹{settled.toLocaleString()} Settled <CheckCircleOutlined />
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Payment Mode ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', display: 'block', marginBottom: 10 }}>Payment Mode</Text>
            <Select
              value={payMode}
              onChange={(v) => { setPayMode(v); setPayBankAccount(null); setPayUpiRef(''); setPayCardLast4(''); setPayTransactionRef(''); setPayChequeNo(''); setPayChequeBank(''); setPayChequeDate(null); }}
              style={{ width: '100%', height: 44, marginBottom: 12 }}
            >
              {['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Cheque'].map(m => (
                <Option key={m} value={m}>{m}</Option>
              ))}
            </Select>
            {payMode === 'UPI' && (
              <div>
                <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>UPI Reference / Transaction ID <span style={{ color: '#e53935' }}>*</span></Text>
                <Input
                  placeholder="Enter UPI reference number"
                  value={payUpiRef}
                  onChange={(e) => setPayUpiRef(e.target.value)}
                  style={{ borderRadius: 8, height: 40 }}
                />
              </div>
            )}
            {payMode === 'Card' && (
              <Row gutter={12}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Card Last 4 Digits <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="e.g. 4321"
                    maxLength={4}
                    value={payCardLast4}
                    onChange={(e) => setPayCardLast4(e.target.value.replace(/\D/g, ''))}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Auth / Reference Code</Text>
                  <Input
                    placeholder="Auth code"
                    value={payTransactionRef}
                    onChange={(e) => setPayTransactionRef(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
              </Row>
            )}
            {(payMode === 'Net Banking' || payMode === 'Bank Transfer') && (
              <Row gutter={12}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Transaction Reference No. <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="UTR / Reference No."
                    value={payTransactionRef}
                    onChange={(e) => setPayTransactionRef(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Account <span style={{ color: '#e53935' }}>*</span></Text>
                  <Select
                    placeholder="Select Bank Account"
                    value={payBankAccount}
                    onChange={(v) => setPayBankAccount(v)}
                    style={{ width: '100%', height: 40 }}
                  >
                    {bankAccounts.map(b => <Option key={b} value={b}>{b}</Option>)}
                  </Select>
                </Col>
              </Row>
            )}
            {payMode === 'Cheque' && (
              <Row gutter={[12, 10]}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Cheque Number <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="Enter cheque number"
                    value={payChequeNo}
                    onChange={(e) => setPayChequeNo(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Name <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="e.g. HDFC Bank"
                    value={payChequeBank}
                    onChange={(e) => setPayChequeBank(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Cheque Date <span style={{ color: '#e53935' }}>*</span></Text>
                  <DatePicker
                    value={payChequeDate}
                    onChange={(d) => setPayChequeDate(d)}
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Account</Text>
                  <Select
                    placeholder="Select Bank Account"
                    value={payBankAccount}
                    onChange={(v) => setPayBankAccount(v)}
                    style={{ width: '100%', height: 40 }}
                  >
                    {bankAccounts.map(b => <Option key={b} value={b}>{b}</Option>)}
                  </Select>
                </Col>
              </Row>
            )}
          </div>

          {/* ── Note ── */}
          <div style={{ background: '#fff', padding: '12px 16px', minHeight: 56 }}>
            {!payNoteVisible ? (
              <div style={{ textAlign: 'right' }}>
                <Text
                  style={{ color: '#3730a3', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setPayNoteVisible(true)}
                >
                  + Note
                </Text>
              </div>
            ) : (
              <div>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Note</Text>
                <Input.TextArea
                  placeholder="Add a note..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  rows={3}
                  style={{ borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* ───────────── CONVERT TO INVOICE MODAL (partial conversion) ───────────── */}
      <Modal
        title={
          <Space>
            <FileDoneOutlined style={{ color: convertDocType === 'order' ? '#B11E6A' : '#7c3aed' }} />
            <span style={{ fontWeight: 700 }}>
              Convert {convertDocType === 'order' ? 'Order' : 'Quotation'} to Invoice
            </span>
          </Space>
        }
        open={convertOpen}
        onCancel={() => setConvertOpen(false)}
        footer={null}
        width={460}
        centered
      >
        {convertQuot && (
          <div style={{ marginTop: 8 }}>
            {/* Source doc info */}
            <div style={{
              background: convertDocType === 'order' ? '#B11E6A10' : '#7c3aed10',
              border: `1px solid ${convertDocType === 'order' ? '#B11E6A33' : '#7c3aed33'}`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{convertDocType === 'order' ? 'Order' : 'Quotation'}</Text>
                <Text strong style={{ color: convertDocType === 'order' ? '#B11E6A' : '#7c3aed' }}>{convertQuot.quot}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                <Text strong>{convertQuot.client}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{convertDocType === 'order' ? 'Order' : 'Quotation'} Amount</Text>
                <Text strong style={{ color: '#B11E6A' }}>₹{convertQuot.total.toLocaleString()}</Text>
              </div>
            </div>

            {/* Previous due section */}
            {convertPreviousDue > 0 && (
              <div style={{ background: '#ff4d4f10', border: '1.5px solid #ff4d4f44', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />
                  <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>Previous Outstanding Balance</Text>
                </div>
                {convertPrevInvoices.map(inv => (
                  <div key={inv.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', borderBottom: '1px solid #ff4d4f20' }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {inv.inv} <Tag style={{ fontSize: 10, background: '#ff4d4f15', color: '#ff4d4f', border: 'none', borderRadius: 20 }}>{inv.status}</Tag>
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f' }}>₹{inv.balance.toLocaleString()}</Text>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 }}>
                  <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>Total Previous Due</Text>
                  <Text strong style={{ fontSize: 14, color: '#ff4d4f' }}>₹{convertPreviousDue.toLocaleString()}</Text>
                </div>
              </div>
            )}

            <Form layout="vertical">
              <Form.Item
                label={<Text strong>Amount to Convert to Invoice</Text>}
                help="Enter the full amount or a partial amount to convert"
              >
                <InputNumber
                  prefix="₹"
                  value={convertAmt}
                  onChange={(v) => setConvertAmt(v || 0)}
                  min={1}
                  max={convertQuot.total}
                  style={{ width: '100%', height: 44 }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/\₹\s?|(,*)/g, '')}
                />
              </Form.Item>
              {convertAmt < convertQuot.total && convertAmt > 0 && (
                <div style={{ background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#d46b08' }}>
                    Remaining ₹{(convertQuot.total - convertAmt).toLocaleString()} will stay in the {convertDocType === 'order' ? 'order' : 'quotation'}
                  </Text>
                </div>
              )}
            </Form>

            {/* Invoice total summary */}
            <div style={{ background: isDark ? '#1a0f14' : '#fdf5f9', border: `1px solid #B11E6A33`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>Current Invoice Amount</Text>
                <Text strong>₹{(convertAmt || 0).toLocaleString()}</Text>
              </div>
              {convertPreviousDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#ff4d4f' }}>+ Previous Outstanding</Text>
                  <Text strong style={{ color: '#ff4d4f' }}>₹{convertPreviousDue.toLocaleString()}</Text>
                </div>
              )}
              <Divider style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 14 }}>Total Balance on Invoice</Text>
                <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>
                  ₹{((convertAmt || 0) + convertPreviousDue).toLocaleString()}
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setConvertOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', fontWeight: 700 }}
                onClick={handleConvertConfirm}
              >
                Confirm & Convert
              </Button>
            </div>
            <Divider style={{ margin: '14px 0 10px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>or</Text>
            </Divider>
            <Button
              block
              icon={<CheckCircleOutlined />}
              style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', color: '#fff', fontWeight: 700, height: 40, borderRadius: 8 }}
              onClick={() => {
                setConvertOpen(false);
                openRecordPay({ ...convertQuot, inv: convertQuot.quot });
              }}
            >
              Record Manually
            </Button>
          </div>
        )}
      </Modal>

      {/* ───────────── VIEW PROOF MODAL (Paid Quotation) ───────────── */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 700 }}>View Payment Proof</span>
          </Space>
        }
        open={proofOpen}
        onCancel={() => setProofOpen(false)}
        footer={null}
        width={440}
        centered
      >
        {proofQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#1890ff10', border: '1px solid #1890ff33', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#1890ff' }}>{proofQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Client: </Text>
              <Text strong>{proofQuot.client}</Text>
            </div>
            <div style={{ textAlign: 'center', padding: '24px 0', background: '#f8f9ff', borderRadius: 10, border: '1px dashed #1890ff44' }}>
              <EyeOutlined style={{ fontSize: 36, color: '#1890ff', display: 'block', marginBottom: 10 }} />
              <Text style={{ color: '#555', fontSize: 13 }}>No proof uploaded yet for this quotation.</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Proof will appear here once uploaded by the team.</Text>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button block onClick={() => setProofOpen(false)} style={{ height: 40, borderRadius: 8 }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── SET REMINDER MODAL (Paid / Partially Paid) ───────────── */}
      <Modal
        title={
          <Space>
            <BellOutlined style={{ color: '#fa8c16' }} />
            <span style={{ fontWeight: 700 }}>Set Automatic Reminder</span>
          </Space>
        }
        open={reminderOpen}
        onCancel={() => setReminderOpen(false)}
        footer={null}
        width={440}
        centered
      >
        {reminderQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#fa8c16' }}>{reminderQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Client: </Text>
              <Text strong>{reminderQuot.client}</Text>
            </div>
            <Form layout="vertical">
              <Form.Item label="Reminder Date" required>
                <DatePicker
                  style={{ width: '100%' }}
                  value={reminderDate}
                  onChange={setReminderDate}
                  disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                />
              </Form.Item>
              <Form.Item label="Reminder Time">
                <TimePicker
                  style={{ width: '100%' }}
                  value={reminderTime}
                  onChange={setReminderTime}
                  format="HH:mm"
                  use12Hours
                />
              </Form.Item>
              <Form.Item label="Send Reminder Via">
                <Select value={reminderMode} onChange={setReminderMode} style={{ width: '100%' }}>
                  <Option value="WhatsApp">WhatsApp</Option>
                  <Option value="SMS">SMS</Option>
                  <Option value="Email">Email</Option>
                  <Option value="All">All Channels</Option>
                </Select>
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setReminderOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#fa8c16,#d46b08)', border: 'none', fontWeight: 700 }}
                onClick={() => {
                  if (!reminderDate) { enqueueSnackbar('Please select a reminder date', { variant: 'warning' }); return; }
                  enqueueSnackbar(`Reminder scheduled for ${reminderDate.format('DD MMM YYYY')} via ${reminderMode}`, { variant: 'success' });
                  setReminderOpen(false);
                }}
              >
                Schedule Reminder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── EDIT GST MODAL (Invoices tab) ───────────── */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>Edit GST — {gstEditInv?.inv}</span>
          </Space>
        }
        open={gstEditOpen}
        onCancel={() => setGstEditOpen(false)}
        footer={null}
        width={420}
        centered
      >
        {gstEditInv && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#B11E6A10', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Invoice</Text>
                <Text strong style={{ color: '#B11E6A' }}>{gstEditInv.inv}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                <Text strong>{gstEditInv.client}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Base Amount</Text>
                <Text strong>₹{gstEditInv.amount.toLocaleString()}</Text>
              </div>
            </div>
            <Form layout="vertical">
              <Form.Item label={<Text strong>GST Amount <span style={{ color: '#ff4d4f' }}>*</span></Text>}>
                <InputNumber
                  prefix="₹"
                  value={gstEditValue}
                  onChange={(v) => setGstEditValue(v || 0)}
                  min={0}
                  style={{ width: '100%', height: 44 }}
                  controls={false}
                  autoFocus
                />
              </Form.Item>
            </Form>
            <div style={{ background: isDark ? '#1a0f14' : '#fdf5f9', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>Base Amount</Text>
                <Text strong>₹{gstEditInv.amount.toLocaleString()}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>GST</Text>
                <Text strong style={{ color: '#B11E6A' }}>₹{(gstEditValue || 0).toLocaleString()}</Text>
              </div>
              <Divider style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 14 }}>New Total</Text>
                <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>
                  ₹{(gstEditInv.amount + (gstEditValue || 0)).toLocaleString()}
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setGstEditOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
                onClick={handleSaveGst}
              >
                Save GST
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── VERIFY PAYMENT MODAL (Paid Quotation) ───────────── */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontWeight: 700 }}>Manual Payment Verification</span>
          </Space>
        }
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        footer={null}
        width={420}
        centered
      >
        {verifyQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#52c41a10', border: '1px solid #52c41a33', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#52c41a' }}>{verifyQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Amount: </Text>
              <Text strong>₹{verifyQuot.total.toLocaleString()}</Text>
            </div>
            <Form layout="vertical">
              <Form.Item label={<Text strong>Verified By <span style={{ color: '#ff4d4f' }}>*</span></Text>}>
                <Input
                  placeholder="Enter verifier's name"
                  value={verifierName}
                  onChange={e => setVerifierName(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
              <Form.Item label="Verification Date">
                <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} />
              </Form.Item>
              <Form.Item label="Verification Remarks">
                <Input.TextArea rows={2} placeholder="Optional remarks..." />
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setVerifyOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#52c41a,#389e0d)', border: 'none', fontWeight: 700 }}
                onClick={() => {
                  if (!verifierName.trim()) { enqueueSnackbar('Please enter verifier name', { variant: 'warning' }); return; }
                  enqueueSnackbar(`Payment verified by ${verifierName}`, { variant: 'success' });
                  setVerifyOpen(false);
                }}
              >
                Mark as Verified
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
