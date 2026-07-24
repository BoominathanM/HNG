import React, { useState, useMemo } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Typography, Space,
  Descriptions, Alert, Select, Tabs, Divider, Collapse, Upload, InputNumber, DatePicker,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  CarOutlined, CheckCircleOutlined, UploadOutlined, EyeOutlined,
  SearchOutlined, PrinterOutlined, SaveOutlined, EditOutlined,
  InboxOutlined, FilterOutlined, GlobalOutlined,
  ExportOutlined, WalletOutlined, UserOutlined,
  PhoneOutlined, FileTextOutlined, DollarCircleOutlined,
  AlertFilled, ExperimentOutlined, CalendarOutlined,
  GiftOutlined, AppstoreOutlined, ThunderboltFilled,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import { buildDispatchGroupedProducts, summarizeDispatchVerification } from '../../utils/dispatchGrouping';
import {
  useGetDispatchesQuery,
  useGetTodaysDispatchesQuery,
  useGetCompanySettingsQuery,
  useUploadDispatchLRMutation,
  useConfirmDispatchMutation,
  useGetTransportsQuery,
  useGetPickupOrdersQuery,
  useGetTodaysPickupOrdersQuery,
  useUpdatePickupOrderMutation,
  useUpdateTransportStatusMutation,
  useGetStaffQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

// All dispatch orders loaded from API

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Partially Dispatched': '#d97706',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

// Transport data loaded from API


// LR parsing handled by AI scan API

// ── Helpers ──────────────────────────────────────────────────────────────────
const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// Escapes a value for CSV — wraps in quotes (and doubles any inner quotes) whenever
// the field itself could contain a comma, e.g. the combined address string below.
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCSV = (data, filename) => {
  const headers = ['S.No', 'Hotel Name', 'Box Count', 'Transport', 'Address', 'Phone Number', 'I STAY', 'After Dispatch'];
  const rows = data.map((o, i) => {
    const address = [o.shippingAddress, o.shippingCity, o.shippingState, o.shippingPincode]
      .filter((p) => p && p !== '—')
      .join(', ') || o.destination || '';
    return [i + 1, o.client, o.boxes, o.transport, address, o.phone, '', ''];
  });
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// Pickup expenses loaded from API

// ─────────────────────────────────────────────────────────────────────────────
export default function Dispatch() {
  const makeUpload = useCloudinaryUpload();
  const isDark = useSelector((s) => s.theme.isDark);
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('dispatch');
  const { filterTabs, activeKeyFor } = useTabAccess('Dispatch Team');
  const { requireAccess } = usePageAccess('Dispatch Team');
  const [dispatchSubTab, setDispatchSubTab] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState(null);
  const [dispatchPage, setDispatchPage] = useState(1);
  const [dispatchPageSize, setDispatchPageSize] = useState(10);
  const [pickupSearch, setPickupSearch] = useState('');
  const [pickupTakenFilter, setPickupTakenFilter] = useState(null);
  const [pickupPayFilter, setPickupPayFilter] = useState(null);
  const [reimbSearch, setReimbSearch] = useState('');
  const [reimbPayFilter, setReimbPayFilter] = useState(null);
  const [transportSearch, setTransportSearch] = useState('');
  const [transportStatusFilter, setTransportStatusFilter] = useState(null);
  // Date-range filters (each holds null or ['YYYY-MM-DD','YYYY-MM-DD']).
  // dispatchDateRange is shared by the "All Orders" / "Today's Dispatch Order" dispatch
  // sub-tabs (mirrors how searchText/paymentFilter are already shared between them),
  // filtering on order creation date. pickupDateRange is likewise shared by the
  // "Today's Pickup Orders" / "All Orders" pickup sub-tabs, filtering on pickup date.
  const [dispatchDateRange, setDispatchDateRange] = useState(null);
  const [pickupDateRange, setPickupDateRange] = useState(null);
  const [reimbDateRange, setReimbDateRange] = useState(null);
  const [transportDateRange, setTransportDateRange] = useState(null);
  const { data: companySettingsData } = useGetCompanySettingsQuery();
  const companyInfo = useMemo(() => {
    const s = companySettingsData?.data || {};
    return { name: s.companyName || 'Heal N Glow', address: s.address || '', city: s.city || '', state: s.state || '', pincode: s.pincode || '', phone: s.phone || '', gstin: s.gstNumber || '' };
  }, [companySettingsData]);
  const HNG = companyInfo;
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [printEditMode, setPrintEditMode] = useState(false);
  const [printForm] = Form.useForm();
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [aiForm] = Form.useForm();

  // Expanded rows for product panel
  const [expandedRows, setExpandedRows] = useState([]);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  // ── Dispatch orders — RTK Query ─────────────────────────────────────────
  // "Payment Pending" isn't a DispatchRecord.status value (it's a resolved payment
  // state), so it's sent as a separate param so the backend can filter on it correctly.
  const dispatchStatusParams = dispatchStatusFilter === 'Payment Pending'
    ? { paymentStatus: 'Pending' }
    : (dispatchStatusFilter ? { status: dispatchStatusFilter } : {});
  const { data: dispatchData } = useGetDispatchesQuery({ page: dispatchPage, limit: dispatchPageSize, ...dispatchStatusParams });
  const { data: todaysDispatchData } = useGetTodaysDispatchesQuery();
  const [uploadLR] = useUploadDispatchLRMutation();
  const [confirmDispatch] = useConfirmDispatchMutation();

  const normalizeDispatch = (d) => {
    const isSample = d.orderId?.orderCategory === 'SAMPLE' || d.orderId?.leadId?.leadType === 'SAMPLE';
    return {
      key: d._id,
      id: d.orderId?.orderCode || d.dispatchCode,
      client: d.orderId?.clientName || '—',
      product: d.orderId?.product || '—',
      qty: d.orderId?.qty || 0,
      boxes: d.boxes || 0,
      weight: d.weight || '—',
      payment: isSample ? 'N/A' : (d.orderPaymentStatus || 'Pending'),
      // A Confirmed record that's still Partial Dispatch (some rows have pending counts
      // left) reads as "Partially Dispatched" rather than the generic "Ready to Dispatch" —
      // orders that go out fully in one round keep the original 3-state mapping unchanged.
      status: d.status === 'Dispatched'
        ? 'Dispatched'
        : d.status === 'Confirmed'
        ? (d.dispatchType === 'Partial Dispatch' ? 'Partially Dispatched' : 'Ready to Dispatch')
        : 'Packing',
      dispatchType: d.dispatchType || null,
      kitDispatch: d.kitDispatch || [],
      orderCategory: isSample ? 'SAMPLE' : (d.orderId?.orderCategory || 'ORDER'),
      isSample,
      isEmergency: !!(d.orderId?.isEmergency),
      // Set once Sales Head + Ops Head both approve an Emergency Dispatch request
      // (dispatch-despite-pending-payment override) — distinct from isEmergency, which
      // just flags an urgent delivery date on the order.
      emergencyApproved: !!(d.orderId?.emergencyApproved),
      transport: d.transportName || d.lrNumber || '—',
      lrNumber: d.lrNumber,
      trackingUrl: d.trackingUrl,
      invoiceNumber: d.invoiceNumber,
      createdAt: d.createdAt,
      dispatchedAt: d.dispatchedAt,
      deliveryDate: d.orderId?.expectedDeliveryDate || null,
      items: d.items || [],
      // Kit header data + the order's own items — used to group the verification
      // panel into Personalized Kit / Separate Kits / Separate Products (see
      // buildDispatchGroupedProducts).
      kitOrders: d.orderId?.kitOrders || [],
      orderItems: d.orderId?.items || [],
      // Sales' "Select Kit(s) to Include" — separate kit(s)/product(s) packed inside the
      // personalized kit's own box, so buildDispatchGroupedProducts nests them under the
      // Personalized Kit bucket instead of Separate Kit/Product (see dispatchGrouping.js).
      packagingIncludes: d.orderId?.packagingIncludes || [],
      // Customer / address fields (now populated from the order)
      destination: d.orderId?.destination || '—',
      salesPerson: d.orderId?.assignedTo?.fullName || '—',
      contactPerson: d.orderId?.contactPerson || d.orderId?.clientName || '—',
      phone: d.orderId?.clientPhone || d.orderId?.phone || '—',
      email: d.orderId?.email || '—',
      detailedAddress: d.orderId?.detailedAddress || '—',
      city: d.orderId?.city || '—',
      state: d.orderId?.state || '—',
      pincode: d.orderId?.pincode || '—',
      // Shipping address — dispatch labels/manifests use this, falling back to the
      // billing address when no distinct shipping address was captured.
      shippingAddress: d.orderId?.shippingAddress || d.orderId?.detailedAddress || '—',
      shippingCity: d.orderId?.shippingCity || d.orderId?.city || '—',
      shippingState: d.orderId?.shippingState || d.orderId?.state || '—',
      shippingPincode: d.orderId?.shippingPincode || d.orderId?.pincode || '—',
    };
  };

  const dispatchOrders = useMemo(() => (dispatchData?.data || []).map(normalizeDispatch), [dispatchData]);
  const todayDispatchOrders = useMemo(() => (todaysDispatchData?.data || []).map(normalizeDispatch), [todaysDispatchData]);

  // Transport records (real Transport collection, created on LR upload).
  const { data: transportRaw } = useGetTransportsQuery();
  const [updateTransportStatus] = useUpdateTransportStatusMutation();
  const transportData = useMemo(() => {
    const fromApi = (transportRaw?.data || []).map((t) => ({
      key: t._id, lrNumber: t.lrNumber, orderId: t.orderCode, client: t.clientName,
      transport: t.transportCompany || t.lrNumber || '—',
      boxes: t.boxes, weight: t.weight, freight: t.freight,
      trackingUrl: t.trackingUrl,
      dispatchDate: (t.dispatchedAt || '').slice(0, 10),
      status: t.status || 'In Transit',
      // Dispatch details joined in from the linked Order/DispatchRecord (see
      // getTransports) — previously these columns had no data source at all.
      destination: t.orderId?.destination || '—',
      contactPerson: t.orderId?.contactPerson || '—',
      phone: t.orderId?.clientPhone || '—',
      salesPerson: t.orderId?.assignedTo?.fullName || t.orderId?.salesPerson || '—',
      isEmergency: !!t.orderId?.isEmergency,
      emergencyApproved: !!t.orderId?.emergencyApproved,
      payment: t.orderPaymentStatus || 'Pending',
      invoiceNumber: t.dispatchId?.invoiceNumber || '—',
    }));
    if (fromApi.length) return fromApi;
    // Fallback: derive from dispatch records that carry an LR number.
    return dispatchOrders.filter((d) => d.lrNumber).map((d) => ({
      key: d.key, lrNumber: d.lrNumber, orderId: d.id,
      client: d.client, transport: d.transport,
      dispatchDate: d.dispatchedAt?.slice(0, 10),
      status: d.status === 'Dispatched' ? 'In Transit' : 'Delivered',
      destination: d.destination || '—',
      contactPerson: d.contactPerson || '—',
      phone: d.phone || '—',
      salesPerson: d.salesPerson || '—',
      isEmergency: !!d.isEmergency,
      emergencyApproved: !!d.emergencyApproved,
      payment: d.payment || 'Pending',
      invoiceNumber: d.invoiceNumber || '—',
    }));
  }, [transportRaw, dispatchOrders]);

  // ── Pick Up Order tab state — Today's / All Orders, both live from PickupOrder ──
  const { data: pickupOrdersRaw } = useGetPickupOrdersQuery();
  const { data: todaysPickupOrdersRaw } = useGetTodaysPickupOrdersQuery();
  const [updatePickupOrder] = useUpdatePickupOrderMutation();
  const [pickupSubTab, setPickupSubTab] = useState('pickup_orders');

  const normalizePickup = (p) => ({
    key: p._id,
    orderId: p.orderCode || '—',
    client: p.clientName || '—',
    destination: p.destination || '—',
    date: (p.scheduledDate || p.createdAt || '').slice(0, 10),
    pickupEmpName: p.pickupPersonName || p.pickupEmpId?.fullName || '—',
    pickupEmpId: p.pickupEmpId?._id || null,
    taken: !!p.taken,
    takenStatus: p.takenStatus || 'Pending',
    amount: p.amount || 0,
    paymentBy: p.paymentBy || '',
    paymentStatus: p.paymentStatus || 'Unpaid',
    gPayNumber: p.gPayNumber || '',
    proofUrl: p.proofUrl || '',
    reimbursementStatus: p.reimbursementStatus || 'Not Applicable',
    reimbursedAmount: p.reimbursedAmount || 0,
    reimbursementProofUrl: p.reimbursementProofUrl || '',
    paidBy: p.paidBy || '',
    paidDate: (p.paidDate || '').slice(0, 10),
  });

  const allPickupOrders = useMemo(() => (pickupOrdersRaw?.data || []).map(normalizePickup), [pickupOrdersRaw]);
  const todaysPickupOrders = useMemo(() => (todaysPickupOrdersRaw?.data || []).map(normalizePickup), [todaysPickupOrdersRaw]);
  // Reimbursement claims — pickups a Pickup Team member paid for out of pocket
  // (Finance-paid pickups need no reimbursement, so they never appear here).
  const reimbExpenses = useMemo(() => allPickupOrders.filter((r) => r.paymentBy === 'Pickup Team'), [allPickupOrders]);

  // Staff list for the "Pickup Employee Name" selector on the payment modal.
  const { data: pickupStaffRaw } = useGetStaffQuery();
  const pickupStaffOptions = useMemo(() => (pickupStaffRaw?.data || []).map((s) => ({
    value: s._id, label: s.fullName,
  })), [pickupStaffRaw]);

  // ── Taken Status / Payment By modal state ────────────────────────────────
  const [showPickupPayModal, setShowPickupPayModal] = useState(false);
  const [pickupPayTarget, setPickupPayTarget] = useState(null);
  const [pickupPayForm] = Form.useForm();
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedTarget, setReceivedTarget] = useState(null);

  // ── Pickup Status / Payment handlers ──────────────────────────────────────
  const handlePickupStatusChange = async (record, status) => {
    if (!requireAccess('edit')) return;
    const takenStatus = status === 'pickup_dropped' ? 'Pickup Dropped' : 'Taken';
    try {
      await updatePickupOrder({ id: record.key, takenStatus }).unwrap();
    } catch {
      enqueueSnackbar('Failed to update taken status', { variant: 'error' });
      return;
    }
    if (status === 'pickup_dropped') {
      setReceivedTarget(record);
      setShowReceivedModal(true);
    }
  };

  // Finance settles it directly (no form needed — treated as paid immediately).
  // Pickup Team pays out of pocket, so it opens the modal to capture GPay/amount/proof
  // and raises a reimbursement claim for Finance to pay back (full or partial).
  const handlePickupPayByChange = async (record, payBy) => {
    if (!requireAccess('edit')) return;
    if (payBy === 'finance') {
      try {
        await updatePickupOrder({ id: record.key, paymentBy: 'Finance' }).unwrap();
        enqueueSnackbar('Marked as paid by Finance.', { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to update payment', { variant: 'error' });
      }
      return;
    }
    setPickupPayTarget({ ...record, payBy });
    pickupPayForm.resetFields();
    setShowPickupPayModal(true);
  };

  const handlePickupPaySubmit = async (vals) => {
    const fileItem = vals.proof?.fileList?.[0];
    const proofUrl = fileItem?.url || null;
    const staffMember = pickupStaffOptions.find((s) => s.value === vals.pickupEmpId);
    try {
      await updatePickupOrder({
        id: pickupPayTarget.key,
        paymentBy: 'Pickup Team',
        amount: vals.amount,
        pickupEmpId: vals.pickupEmpId,
        pickupPersonName: staffMember?.label || '',
        gPayNumber: vals.gPayNumber,
        ...(proofUrl ? { proofUrl } : {}),
      }).unwrap();
    } catch {
      enqueueSnackbar('Failed to submit payment', { variant: 'error' });
      return;
    }
    enqueueSnackbar('Payment proof submitted — visible in Reimbursement Claims for Finance to process.', { variant: 'success' });
    setShowPickupPayModal(false);
    setPickupPayTarget(null);
    pickupPayForm.resetFields();
  };

  const handlePickupDroppedConfirm = async () => {
    try {
      await updatePickupOrder({ id: receivedTarget.key, takenStatus: 'Pickup Dropped' }).unwrap();
      enqueueSnackbar(`Order ${receivedTarget?.orderId} marked as Pickup Dropped — received order process started.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
    setShowReceivedModal(false);
    setReceivedTarget(null);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openPrintModal = (order) => {
    setSelectedPrintOrder(order);
    printForm.setFieldsValue({
      toName: order.client,
      toContact: order.contactPerson,
      toPhone: order.phone,
      toAddress: order.shippingAddress,
      toCity: order.shippingCity,
      toState: order.shippingState,
      toPincode: order.shippingPincode,
      toLocation: order.address,
      orderRef: order.id,
      boxCount: order.boxes,
      weight: order.weight,
    });
    setPrintEditMode(false);
    setAiParsed(null);
    setPrintModalOpen(true);
  };

  const handlePrint = () => {
    const vals = printForm.getFieldsValue();
    const win = window.open('', '_blank', 'width=480,height=640');
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Label</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; font-size: 13px; color: #111; }
  .label { border: 2px solid #333; padding: 20px; width: 400px; border-radius: 4px; }
  .badge { background: #B11E6A; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 12px; }
  .section-title { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 6px; }
  .name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .line { margin: 2px 0; color: #333; }
  hr { border: none; border-top: 1px dashed #aaa; margin: 14px 0; }
  .order-ref { font-size: 11px; color: #555; margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px; }
  .barcode { font-family: monospace; font-size: 10px; letter-spacing: 4px; color: #333; margin-top: 4px; }
</style></head><body>
<div class="label">
  <div class="badge">HEAL N GLOW — DISPATCH LABEL</div>
  <div class="section-title">From</div>
  <div class="name">${HNG.name}</div>
  <div class="line">${HNG.address}</div>
  <div class="line">${HNG.city}, ${HNG.state} — ${HNG.pincode}</div>
  <div class="line">Ph: ${HNG.phone}</div>
  <div class="line">GSTIN: ${HNG.gstin}</div>
  <hr/>
  <div class="section-title">To</div>
  <div class="name">${vals.toName || ''}</div>
  <div class="line">Attn: ${vals.toContact || ''}</div>
  <div class="line">${vals.toAddress || ''}</div>
  <div class="line">${vals.toCity || ''}, ${vals.toState || ''} — ${vals.toPincode || ''}</div>
  <div class="line">Ph: ${vals.toPhone || ''}</div>
  <div class="order-ref">
    Order Ref: <b>${vals.orderRef || ''}</b> &nbsp;|&nbsp; Boxes: <b>${vals.boxCount || ''}</b> &nbsp;|&nbsp; Weight: <b>${vals.weight || ''}</b>
  </div>
  <div class="barcode">||| ${vals.orderRef || ''} |||</div>
</div>
</body></html>`);
    win.document.close();
    win.print();
  };

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      setAiParsing(false);
      enqueueSnackbar('AI scan complete. Please fill in the LR details manually.', { variant: 'info' });
    }, 1200);
  };

  // ── Product progress expanded row ──────────────────────────────────────────
  // Groups items into Personalized Kit / Separate Kits / Separate Products — same
  // categorization + counts as the Dispatch Detail page's verification table. Read-only
  // here: entering dispatch counts, uploading photos, and confirming all happen on the
  // Dispatch Detail page (this panel is just a progress summary).
  const renderProductPanel = (record) => {
    const { products, groupedProducts } = buildDispatchGroupedProducts({
      items: record.items,
      kitOrders: record.kitOrders,
      orderItems: record.orderItems,
      boxes: record.boxes,
      kitDispatch: record.kitDispatch,
      packagingIncludes: record.packagingIncludes,
    });
    const summary = summarizeDispatchVerification(products);

    const catMeta = {
      personalized: { icon: <GiftOutlined />, bg: '#ede9fe', color: '#5b21b6', label: 'Personalized Kit' },
      separate_kit: { icon: <GiftOutlined />, bg: '#e0f2fe', color: '#0369a1', label: 'Separate Kit' },
      separate_product: { icon: <AppstoreOutlined />, bg: '#fce7f3', color: '#9d174d', label: 'Products' },
    };

    return (
      <div style={{ padding: '12px 24px', background: isDark ? '#161622' : '#fafafa', borderRadius: 8, margin: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontWeight: 600 }}>
            {record.id}
          </Tag>
          <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>— Product Details</Text>
          <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888', marginLeft: 'auto' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
            {summary.overall.dispatched} / {summary.overall.total} dispatched
          </Text>
        </div>
        <Space size={6} wrap style={{ marginBottom: 10 }}>
          {[summary.personalizedKit, summary.separateKit, summary.separateProduct]
            .filter((b) => b.total > 0)
            .map((b) => (
              <Tag key={b.label} style={{ borderRadius: 12, fontSize: 11, background: 'transparent', border: '1px solid #B11E6A33' }}>
                {b.label}: {b.dispatched}/{b.total} ({b.pending} pending)
              </Tag>
            ))}
        </Space>

        <Table
          size="small"
          pagination={false}
          dataSource={groupedProducts}
          rowKey="key"
          style={{ borderRadius: 8, overflow: 'hidden' }}
          columns={[
            {
              title: 'Product / Kit',
              dataIndex: 'name',
              // Pure divider rows (no `bucket`) span the full row. Real dispatchable kit
              // headers (Personalized/Separate Kit, `bucket` set) get their own Progress cell.
              onCell: (row) => (row.type === 'kit_header' && !row.bucket ? { colSpan: 2 } : {}),
              render: (v, row) => {
                if (row.type === 'kit_header') {
                  const cm = catMeta[row.category] || catMeta.separate_kit;
                  return (
                    <div style={{ background: cm.bg, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, margin: '-1px -1px', flexWrap: 'wrap' }}>
                      <span style={{ color: cm.color }}>{cm.icon}</span>
                      <Text strong style={{ color: cm.color, fontSize: 12 }}>{row.kitName}</Text>
                      {row.qty != null && (
                        <Tag style={{ borderRadius: 12, background: `${cm.color}15`, color: cm.color, border: `1px solid ${cm.color}44`, fontSize: 11 }}>
                          {row.qty} kit{row.qty !== 1 ? 's' : ''}
                        </Tag>
                      )}
                      <Tag style={{ borderRadius: 12, fontSize: 10, background: 'transparent', color: cm.color, border: `1px solid ${cm.color}33` }}>
                        {cm.label}
                      </Tag>
                    </div>
                  );
                }
                return (
                  <Space size={4}>
                    {(row.type === 'kit_item' || row.type === 'personalized_item') && (
                      <span style={{ color: '#ccc', fontSize: 13, marginLeft: 8 }}>└</span>
                    )}
                    <Text style={{ fontSize: 12 }}>{v}</Text>
                    {row.perKitQty != null && <Text style={{ fontSize: 10, color: '#bbb' }}>({row.perKitQty}/kit)</Text>}
                    {row.includedFrom && (
                      <Tag style={{ borderRadius: 10, fontSize: 10, background: '#ede9fe', color: '#5b21b6', border: '1px solid #5b21b633' }}>
                        {row.includedFrom}
                      </Tag>
                    )}
                  </Space>
                );
              },
            },
            {
              title: 'Progress', key: 'progress',
              onCell: (row) => (!row.bucket ? { colSpan: 0 } : {}),
              render: (_, row) => {
                if (!row.bucket) return null;
                const total = row.overallQty ?? row.qtyOrdered ?? 0;
                const done = row.dispatchedQty ?? row.qtyDispatched ?? 0;
                const pending = Math.max(0, total - done);
                return (
                  <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 12 }}>{done} / {total}</Text>
                    {pending === 0
                      ? <Tag color="success" style={{ borderRadius: 20, fontSize: 11 }}>Fully Dispatched</Tag>
                      : done > 0
                      ? <Tag color="orange" style={{ borderRadius: 20, fontSize: 11 }}>Partial — {pending} pending</Tag>
                      : <Tag color="default" style={{ borderRadius: 20, fontSize: 11 }}>Pending</Tag>}
                  </Space>
                );
              },
            },
          ]}
        />
      </div>
    );
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const buildColumns = (showTodayActions = false) => {
    const deliveryDateCol = {
      title: (
        <Space size={4}>
          <CalendarOutlined style={{ color: '#B11E6A' }} />
          Delivery Date
        </Space>
      ),
      dataIndex: 'deliveryDate',
      width: 140,
      render: (v) => {
        if (!v) return <Text type="secondary" style={{ fontSize: 13 }}>—</Text>;
        const date = new Date(v);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = date < today;
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13, color: isOverdue ? '#ff4d4f' : '#2e7d32' }}>
              {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
            {isOverdue && <Tag color="red" style={{ fontSize: 10, lineHeight: '14px' }}>Overdue</Tag>}
          </Space>
        );
      },
    };

    const baseCols = [
      {
        title: 'Order', dataIndex: 'id', width: 120,
        render: (v, r) => (
          <Space direction="vertical" size={2}>
            <Space size={4}>
              {r.isEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
              {r.emergencyApproved && <ThunderboltFilled style={{ color: '#fa8c16', fontSize: 13 }} />}
              {r.orderCategory === 'SAMPLE' && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 13 }} />}
              <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text>
            </Space>
            {r.isEmergency && <Tag color="red" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency</Tag>}
            {r.emergencyApproved && <Tag color="orange" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency Dispatch</Tag>}
            {r.orderCategory === 'SAMPLE' && <Tag color="purple" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Sample Order</Tag>}
          </Space>
        ),
      },
      { title: 'Client', dataIndex: 'client', width: 150, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
      { title: 'Destination', dataIndex: 'destination', width: 120, responsive: ['md'], render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
      { title: 'Location', dataIndex: 'city', width: 120, responsive: ['lg'], render: (v, r) => <Text style={{ fontSize: 13 }}>{v && r.state ? `${v}, ${r.state}` : v || r.state || '—'}</Text> },
      { title: 'Created Date', dataIndex: 'createdAt', width: 160, responsive: ['md'], render: (v) => <Text style={{ fontSize: 13 }}>{v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</Text> },
      { title: 'Sales Person', dataIndex: 'salesPerson', width: 115, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
      {
        title: 'Boxes', dataIndex: 'boxes', width: 80, responsive: ['sm'],
        render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ fontSize: 13 }}>{v}</Text></Space>,
      },
      { title: 'Weight', dataIndex: 'weight', width: 90, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
      {
        title: 'Payment', dataIndex: 'payment', width: 115,
        render: (v) => {
          if (v === 'N/A') return <Tag color="default" style={{ borderRadius: 20, fontSize: 13, fontWeight: 600 }}>N/A</Tag>;
          const c = v === 'Paid' ? '#2e7d32' : v === 'Partial' ? '#c77700' : '#B11E6A';
          return <Tag style={{ borderRadius: 20, fontSize: 13, background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{v}</Tag>;
        },
      },
      { title: 'Transport', dataIndex: 'transport', width: 120, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
      {
        title: 'Balance', key: 'balance', width: 170,
        // Pending counts broken down by Personalized Kit / Separate Kit / Separate
        // Product — only the buckets actually present on this order.
        render: (_, r) => {
          const { products } = buildDispatchGroupedProducts({
            items: r.items, kitOrders: r.kitOrders, orderItems: r.orderItems,
            boxes: r.boxes, kitDispatch: r.kitDispatch, packagingIncludes: r.packagingIncludes,
          });
          const summary = summarizeDispatchVerification(products);
          const buckets = [summary.personalizedKit, summary.separateKit, summary.separateProduct].filter((b) => b.total > 0);
          if (buckets.length === 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
          return (
            <Space direction="vertical" size={2}>
              {buckets.map((b) => (
                <Tag key={b.label} color={b.pending === 0 ? 'success' : 'orange'} style={{ borderRadius: 10, fontSize: 11, margin: 0 }}>
                  {b.label}: {b.pending} pending
                </Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: 'Status', dataIndex: 'status', width: 140,
        render: (v) => <Tag style={{ borderRadius: 20, fontWeight: 500, fontSize: 13, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag>,
      },
      {
        title: 'Actions', key: 'actions', width: 110,
        render: (_, r) => (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/dispatch/${r.key}`)} />
            <Button size="small" icon={<PrinterOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }} onClick={() => openPrintModal(r)} />
            {showTodayActions && (
              <Button size="small" icon={<ExportOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }}
                onClick={() => exportCSV([r], `${r.id}-export.csv`)} />
            )}
          </Space>
        ),
      },
    ];

    // Insert Delivery Date column right after Order+Client — shown on both the
    // "All Orders" and "Today's Dispatch Order" dispatch tables.
    baseCols.splice(2, 0, deliveryDateCol);

    return baseCols;
  };

  const transportColumns = [
    {
      title: 'Order', dataIndex: 'orderId', width: 120,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            {r.isEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
            {r.emergencyApproved && <ThunderboltFilled style={{ color: '#fa8c16', fontSize: 13 }} />}
            <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text>
          </Space>
          {r.isEmergency && <Tag color="red" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency</Tag>}
          {r.emergencyApproved && <Tag color="orange" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency Dispatch</Tag>}
        </Space>
      ),
    },
    { title: 'LR Number', dataIndex: 'lrNumber', width: 115, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Invoice No.', dataIndex: 'invoiceNumber', width: 110, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 145, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Contact', key: 'contact', width: 150, responsive: ['lg'],
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{r.contactPerson}</Text>
          {r.phone && r.phone !== '—' && <Text type="secondary" style={{ fontSize: 12 }}>{r.phone}</Text>}
        </Space>
      ),
    },
    { title: 'Destination', dataIndex: 'destination', width: 130, responsive: ['md'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Sales Person', dataIndex: 'salesPerson', width: 120, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Transport Co.', dataIndex: 'transport', width: 135, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Boxes', dataIndex: 'boxes', width: 80, render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> },
    { title: 'Weight', dataIndex: 'weight', width: 95, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Freight', dataIndex: 'freight', width: 95, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Payment', dataIndex: 'payment', width: 100,
      render: v => <Tag color={v === 'Paid' ? 'success' : v === 'Partial' ? 'processing' : 'error'} style={{ fontSize: 12 }}>{v}</Tag>,
    },
    { title: 'Dispatch Date', dataIndex: 'dispatchDate', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Status', dataIndex: 'status', width: 105, render: (v) => <Tag color={v === 'Delivered' ? 'success' : 'processing'} style={{ fontSize: 13 }}>{v}</Tag> },
  ];

  // Shared columns for the "Today's Pickup Orders" and "All Orders" Pick Up Order tables.
  const pickupColumns = [
    { title: 'Date', dataIndex: 'date', width: 95 },
    { title: 'Order ID', dataIndex: 'orderId', width: 100, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'From / Client', dataIndex: 'client', width: 150, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{v}</Text> },
    { title: 'Destination', dataIndex: 'destination', width: 150, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Pickup Employee', key: 'emp', width: 150, render: (_, r) => <Text strong style={{ fontSize: 13 }}>{r.pickupEmpName || '—'}</Text> },
    {
      title: 'Taken Status', key: 'taken', width: 165,
      render: (_, r) => (
        <Select
          size="small"
          value={r.takenStatus === 'Pending' ? undefined : (r.takenStatus === 'Pickup Dropped' ? 'pickup_dropped' : 'taken')}
          placeholder="Select status"
          style={{ width: 152 }}
          onClick={e => e.stopPropagation()}
          onChange={v => handlePickupStatusChange(r, v)}
        >
          <Option value="taken">Taken</Option>
          <Option value="pickup_dropped">Pickup Dropped</Option>
        </Select>
      )
    },
    {
      title: 'Payment By', key: 'paymentBy', width: 185,
      render: (_, r) => {
        if (r.paymentBy) {
          return <Tag color={r.paymentBy === 'Finance' ? 'blue' : 'green'} style={{ borderRadius: 8, fontWeight: 600 }}>{r.paymentBy}</Tag>;
        }
        if (r.paymentStatus === 'Paid') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        return (
          <Select
            size="small"
            placeholder="Select payer"
            style={{ width: 170 }}
            onClick={e => e.stopPropagation()}
            onChange={v => handlePickupPayByChange(r, v)}
          >
            <Option value="finance">Payment by Finance</Option>
            <Option value="pickup_team">Payment by Pickup Team</Option>
          </Select>
        );
      }
    },
    { title: 'Amount', dataIndex: 'amount', width: 100, align: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>&#8377;{v?.toLocaleString()}</Text> },
    { title: 'GPay Number', dataIndex: 'gPayNumber', width: 130, render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text> },
    { title: 'Payment Proof', dataIndex: 'proofUrl', width: 125, render: v => v ? <Button size="small" icon={<FileTextOutlined />} onClick={() => window.open(v, '_blank')} style={{ fontSize: 12, color: '#B11E6A', borderColor: '#B11E6A' }}>View</Button> : <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>Not Uploaded</Tag> },
    {
      title: 'Payment Status', dataIndex: 'paymentStatus', width: 120, align: 'center',
      render: v => <Tag color={v === 'Paid' ? 'success' : 'warning'} style={{ borderRadius: 10, fontWeight: 600, fontSize: 12 }}>{v}</Tag>
    },
  ];

  const reimbursementColumns = [
    { title: 'Date', dataIndex: 'date', width: 95 },
    { title: 'Order ID', dataIndex: 'orderId', width: 100, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'From', dataIndex: 'client', width: 140, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{v}</Text> },
    { title: 'Pickup Employee', key: 'emp', width: 150, render: (_, r) => <Text strong style={{ fontSize: 13 }}>{r.pickupEmpName || '—'}</Text> },
    { title: 'GPay Number', dataIndex: 'gPayNumber', width: 130, render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text> },
    { title: 'Amount', dataIndex: 'amount', width: 100, align: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>&#8377;{v?.toLocaleString()}</Text> },
    { title: 'Payment Proof', dataIndex: 'proofUrl', width: 125, render: v => v ? <Button size="small" icon={<FileTextOutlined />} onClick={() => window.open(v, '_blank')} style={{ fontSize: 12, color: '#B11E6A', borderColor: '#B11E6A' }}>View</Button> : <Tag color="warning" style={{ borderRadius: 8, fontSize: 11 }}>Not Uploaded</Tag> },
    {
      title: 'Reimbursement', key: 'reimb', width: 150, align: 'center',
      render: (_, r) => (
        <div>
          <Tag color={r.reimbursementStatus === 'Paid' ? 'success' : r.reimbursementStatus === 'Partial' ? 'processing' : 'warning'} style={{ borderRadius: 10, fontSize: 12 }}>
            {r.reimbursementStatus}
          </Tag>
          {r.reimbursementStatus !== 'Pending' && <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>&#8377;{r.reimbursedAmount} of &#8377;{r.amount}</Text>}
        </div>
      )
    },
    { title: 'Reimbursed By', dataIndex: 'paidBy', width: 120, render: v => v ? <Tag color="blue" style={{ borderRadius: 8, fontSize: 12 }}>{v}</Tag> : <Text type="secondary" style={{ fontSize: 13 }}>—</Text> },
    { title: 'Finance Proof', dataIndex: 'reimbursementProofUrl', width: 130, render: v => v ? <Button size="small" icon={<FileTextOutlined />} onClick={() => window.open(v, '_blank')} style={{ fontSize: 12, color: '#52c41a', borderColor: '#52c41a' }}>View Proof</Button> : <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>Not Yet Paid</Tag> },
  ];

  const applyFilters = (orders) => orders.filter((o) => {
    const s = !searchText || (o.id || '').toLowerCase().includes(searchText.toLowerCase()) || (o.client || '').toLowerCase().includes(searchText.toLowerCase()) || (o.address || '').toLowerCase().includes(searchText.toLowerCase()) || (o.destination || '').toLowerCase().includes(searchText.toLowerCase());
    const p = paymentFilter === 'All' || o.payment === paymentFilter;
    if (dispatchDateRange) {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : '';
      if (d < dispatchDateRange[0] || d > dispatchDateRange[1]) return false;
    }
    return s && p;
  });

  // Emergency orders surface first wherever dispatch orders are listed — sort is
  // stable, so recency order (already newest-first from the backend) is preserved
  // within the emergency and non-emergency buckets.
  const sortEmergencyFirst = (arr) => [...arr].sort((a, b) => ((b.isEmergency || b.emergencyApproved) ? 1 : 0) - ((a.isEmergency || a.emergencyApproved) ? 1 : 0));

  const filteredOrders = sortEmergencyFirst(applyFilters(dispatchOrders));
  // Today's Dispatch Order — sourced from the backend's dedicated /dispatch/today
  // endpoint, which filters on the order's tentative delivery date (expectedDeliveryDate).
  const todayOrders = sortEmergencyFirst(applyFilters(todayDispatchOrders));

  // Expandable config for all orders table
  const expandable = {
    expandedRowKeys: expandedRows,
    onExpand: (expanded, record) => {
      setExpandedRows(expanded ? [...expandedRows, record.key] : expandedRows.filter(k => k !== record.key));
    },
    expandedRowRender: (record) => renderProductPanel(record),
    rowExpandable: () => true,
  };

  // ── Filters row ───────────────────────────────────────────────────────────
  const filtersRow = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search orders, clients, destinations..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        style={{ flex: 1, minWidth: 200, borderRadius: 8 }}
      />
      <Space wrap>
        <FilterOutlined style={{ color: '#B11E6A' }} />
        <Select value={paymentFilter} onChange={setPaymentFilter} style={{ width: 160, borderRadius: 8 }}>
          <Option value="All">All Payments</Option>
          <Option value="Paid">Paid</Option>
          <Option value="Partial">Partial</Option>
          <Option value="Pending">Pending</Option>
        </Select>
        <Select allowClear placeholder="Status" value={dispatchStatusFilter} onChange={(val) => { setDispatchStatusFilter(val); setDispatchPage(1); }} style={{ width: 180, borderRadius: 8 }}>
          <Option value="Ready to Dispatch">Ready to Dispatch</Option>
          <Option value="Payment Pending">Payment Pending</Option>
          <Option value="Dispatched">Dispatched</Option>
          <Option value="Packing">Packing</Option>
        </Select>
        <DatePicker.RangePicker
          style={{ borderRadius: 8 }}
          onChange={(dates) => setDispatchDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
          allowClear
        />
      </Space>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Dispatch Team" items={[{ label: 'Dispatch Team' }]} />

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          // Counted across the whole dataset (backend `emergencyCount`), not just the
          // current page, since the other page-local counts below don't need to be exact.
          { label: 'Emergency Orders', count: dispatchData?.emergencyCount ?? dispatchOrders.filter(o => o.isEmergency).length, color: '#ff4d4f' },
          { label: 'Emergency Dispatch', count: dispatchOrders.filter(o => o.emergencyApproved).length, color: '#fa8c16' },
          { label: 'Ready to Dispatch', count: dispatchOrders.filter(o => o.status === 'Ready to Dispatch').length, color: '#B11E6A' },
          { label: 'Packing in Progress', count: dispatchOrders.filter(o => o.status === 'Packing').length, color: '#8a1652' },
          { label: 'Dispatched Today', count: dispatchOrders.filter(o => o.status === 'Dispatched').length, color: '#C94F8A' },
          { label: 'Payment Pending', count: dispatchOrders.filter(o => o.payment === 'Pending').length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.count}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Main Tabs */}
      <Tabs onChange={setActiveTab} type="card"
        items={filterTabs([
          {
            key: 'dispatch',
            label: <Space><CarOutlined />Dispatch Orders</Space>,
            children: (
              <Tabs
                activeKey={dispatchSubTab}
                onChange={setDispatchSubTab}
                size="small"
                tabBarStyle={{ marginBottom: 12 }}
                items={[
                  {
                    key: 'all',
                    label: 'All Orders',
                    children: (
                      <div>
                        {filtersRow}
                        <Card
                          title={<Text strong style={{ color: textColor }}>Dispatch Orders</Text>}
                          style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                          styles={{ body: { padding: 0 } }}
                        >
                          <div className="table-responsive" style={{ padding: '4px' }}>
                            <Table
                              dataSource={filteredOrders}
                              columns={buildColumns(false)}
                              expandable={expandable}
                              rowKey="key"
                              pagination={{
                                current: dispatchPage,
                                pageSize: dispatchPageSize,
                                total: dispatchData?.total || 0,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50', '100'],
                                onChange: (p, ps) => { setDispatchPage(p); setDispatchPageSize(ps); },
                                size: 'small',
                              }}
                              size="small"
                              scroll={{ x: 'max-content' }}
                              onRow={(record) => ({
                                onClick: () => navigate(`/dispatch/${record.key}`),
                                style: { cursor: 'pointer' },
                              })}
                            />
                          </div>
                        </Card>
                      </div>
                    ),
                  },
                  {
                    key: 'today',
                    label: (
                      <Space>
                        Today's Dispatch Order
                        <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 11 }}>
                          {todayOrders.length}
                        </Tag>
                      </Space>
                    ),
                    children: (
                      <div>
                        {filtersRow}
                        <Card
                          title={<Space><CalendarOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Orders with Tentative Delivery Date Today</Text></Space>}
                          extra={
                            <Button
                              size="small"
                              icon={<ExportOutlined />}
                              style={{ color: '#B11E6A', borderColor: '#B11E6A' }}
                              onClick={() => exportCSV(todayOrders, `today-dispatch-orders-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`)}
                            >
                              Export All
                            </Button>
                          }
                          style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                          styles={{ body: { padding: 0 } }}
                        >
                          <div className="table-responsive" style={{ padding: '4px' }}>
                            {todayOrders.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '32px', color: isDark ? '#aaa' : '#888' }}>
                                <CarOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block', color: '#B11E6A55' }} />
                                No orders with tentative delivery date today.
                              </div>
                            ) : (
                              <Table
                                dataSource={todayOrders}
                                columns={buildColumns(true)}
                                expandable={expandable}
                                rowKey="key"
                                pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                                size="small"
                                scroll={{ x: 'max-content' }}
                                onRow={(record) => ({
                                  onClick: () => navigate(`/dispatch/${record.key}`),
                                  style: { cursor: 'pointer' },
                                })}
                              />
                            )}
                          </div>
                        </Card>
                      </div>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'pickup',
            label: <Space><CarOutlined />Pick Up Order</Space>,
            children: (
              <div>
                <Tabs
                  activeKey={pickupSubTab}
                  onChange={setPickupSubTab}
                  size="small"
                  tabBarStyle={{ marginBottom: 12 }}
                  items={[
                    {
                      key: 'pickup_orders',
                      label: (
                        <Space>
                          Today's Pickup Orders
                          {todaysPickupOrders.length > 0 && (
                            <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 11 }}>
                              {todaysPickupOrders.length}
                            </Tag>
                          )}
                        </Space>
                      ),
                      children: (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ color: textColor }}>Current Day Pickup Orders</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Pickups whose Expected Delivery Date is today</Text>
                          </div>
                          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order ID, client..." allowClear value={pickupSearch} onChange={(e) => setPickupSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                            <Select allowClear placeholder="Taken Status" value={pickupTakenFilter} onChange={setPickupTakenFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Taken">Taken</Option>
                              <Option value="Pickup Dropped">Pickup Dropped</Option>
                            </Select>
                            <Select allowClear placeholder="Payment Status" value={pickupPayFilter} onChange={setPickupPayFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Paid">Paid</Option>
                              <Option value="Unpaid">Unpaid</Option>
                            </Select>
                            <DatePicker.RangePicker
                              style={{ borderRadius: 8 }}
                              onChange={(dates) => setPickupDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                              allowClear
                            />
                          </div>
                          {(() => {
                            const rows = todaysPickupOrders.filter((r) => {
                              const q = pickupSearch.toLowerCase();
                              const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.client || '').toLowerCase().includes(q);
                              const matchTaken = !pickupTakenFilter || r.takenStatus === pickupTakenFilter;
                              const matchPay = !pickupPayFilter || r.paymentStatus === pickupPayFilter;
                              const matchDate = !pickupDateRange || ((r.date || '') >= pickupDateRange[0] && (r.date || '') <= pickupDateRange[1]);
                              return matchSearch && matchTaken && matchPay && matchDate;
                            });
                            if (todaysPickupOrders.length === 0) return (
                              <div style={{ textAlign: 'center', padding: '40px 0', color: isDark ? '#aaa' : '#888' }}>
                                <CarOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                                <Text type="secondary">No pickup orders for today.</Text>
                              </div>
                            );
                            if (rows.length === 0) return <div style={{ textAlign: 'center', padding: '24px', color: isDark ? '#aaa' : '#888' }}>No results match your filters.</div>;
                            return (
                              <Table
                                size="small"
                                dataSource={rows}
                                rowKey="key"
                                pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                                scroll={{ x: 'max-content' }}
                                columns={pickupColumns}
                              />
                            );
                          })()}
                        </div>
                      ),
                    },
                    {
                      key: 'all_pickup_orders',
                      label: 'All Orders',
                      children: (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ color: textColor }}>All Pickup Orders</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Every pickup job, regardless of Expected Delivery Date</Text>
                          </div>
                          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order ID, client..." allowClear value={pickupSearch} onChange={(e) => setPickupSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                            <Select allowClear placeholder="Taken Status" value={pickupTakenFilter} onChange={setPickupTakenFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Taken">Taken</Option>
                              <Option value="Pickup Dropped">Pickup Dropped</Option>
                            </Select>
                            <Select allowClear placeholder="Payment Status" value={pickupPayFilter} onChange={setPickupPayFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Paid">Paid</Option>
                              <Option value="Unpaid">Unpaid</Option>
                            </Select>
                            <DatePicker.RangePicker
                              style={{ borderRadius: 8 }}
                              onChange={(dates) => setPickupDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                              allowClear
                            />
                          </div>
                          {(() => {
                            const rows = allPickupOrders.filter((r) => {
                              const q = pickupSearch.toLowerCase();
                              const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.client || '').toLowerCase().includes(q);
                              const matchTaken = !pickupTakenFilter || r.takenStatus === pickupTakenFilter;
                              const matchPay = !pickupPayFilter || r.paymentStatus === pickupPayFilter;
                              const matchDate = !pickupDateRange || ((r.date || '') >= pickupDateRange[0] && (r.date || '') <= pickupDateRange[1]);
                              return matchSearch && matchTaken && matchPay && matchDate;
                            });
                            if (allPickupOrders.length === 0) return (
                              <div style={{ textAlign: 'center', padding: '40px 0', color: isDark ? '#aaa' : '#888' }}>
                                <CarOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                                <Text type="secondary">No pickup orders yet.</Text>
                              </div>
                            );
                            if (rows.length === 0) return <div style={{ textAlign: 'center', padding: '24px', color: isDark ? '#aaa' : '#888' }}>No results match your filters.</div>;
                            return (
                              <Table
                                size="small"
                                dataSource={rows}
                                rowKey="key"
                                pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                                scroll={{ x: 'max-content' }}
                                columns={pickupColumns}
                              />
                            );
                          })()}
                        </div>
                      ),
                    },
                    {
                      key: 'reimbursement_claims',
                      label: (
                        <Space>
                          Reimbursement Claims
                          {reimbExpenses.filter(r => r.reimbursementStatus !== 'Paid').length > 0 && (
                            <Tag style={{ borderRadius: 20, background: '#ff4d4f22', color: '#ff4d4f', border: '1px solid #ff4d4f44', fontSize: 10, padding: '0 5px' }}>
                              {reimbExpenses.filter(r => r.reimbursementStatus !== 'Paid').length} Pending
                            </Tag>
                          )}
                        </Space>
                      ),
                      children: (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ color: textColor }}>Reimbursement Claims</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Pickups a Pickup Team member paid for out of pocket — reimbursement status from Finance</Text>
                          </div>
                          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order, client, employee..." allowClear value={reimbSearch} onChange={(e) => setReimbSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                            <Select allowClear placeholder="Reimbursement Status" value={reimbPayFilter} onChange={setReimbPayFilter} style={{ width: 180, borderRadius: 8 }}>
                              <Option value="Pending">Pending</Option>
                              <Option value="Partial">Partial</Option>
                              <Option value="Paid">Paid</Option>
                            </Select>
                            <DatePicker.RangePicker
                              style={{ borderRadius: 8 }}
                              onChange={(dates) => setReimbDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                              allowClear
                            />
                          </div>
                          {reimbExpenses.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: isDark ? '#aaa' : '#888' }}>
                              <WalletOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                              <Text type="secondary">No reimbursement claims yet.</Text>
                            </div>
                          ) : (
                            <Table
                              size="small"
                              dataSource={reimbExpenses.filter((r) => {
                                const q = reimbSearch.toLowerCase();
                                const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.client || '').toLowerCase().includes(q) || (r.pickupEmpName || '').toLowerCase().includes(q);
                                const matchPay = !reimbPayFilter || r.reimbursementStatus === reimbPayFilter;
                                const matchDate = !reimbDateRange || ((r.date || '') >= reimbDateRange[0] && (r.date || '') <= reimbDateRange[1]);
                                return matchSearch && matchPay && matchDate;
                              })}
                              rowKey="key"
                              pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                              scroll={{ x: 'max-content' }}
                              columns={reimbursementColumns}
                            />
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: 'transport',
            label: <Space><GlobalOutlined />Transport</Space>,
            children: (
              <div>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {[
                    { label: 'Total Dispatched', val: transportData.length, color: '#B11E6A' },
                    { label: 'In Transit', val: transportData.filter(t => t.status === 'In Transit').length, color: '#C94F8A' },
                    { label: 'Delivered', val: transportData.filter(t => t.status === 'Delivered').length, color: '#6b1240' },
                  ].map((s) => (
                    <Col xs={8} key={s.label}>
                      <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, textAlign: 'center' }} styles={{ body: { padding: '12px 8px' } }}>
                        <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card
                  title={<Text strong style={{ color: textColor }}>Transport Records</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search LR No, order, client..." allowClear value={transportSearch} onChange={(e) => setTransportSearch(e.target.value)} style={{ width: 250, borderRadius: 8 }} />
                    <Select allowClear placeholder="Status" value={transportStatusFilter} onChange={setTransportStatusFilter} style={{ width: 160, borderRadius: 8 }}>
                      <Option value="In Transit">In Transit</Option>
                      <Option value="Delivered">Delivered</Option>
                    </Select>
                    <DatePicker.RangePicker
                      style={{ borderRadius: 8 }}
                      onChange={(dates) => setTransportDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                      allowClear
                    />
                  </div>
                  <div className="table-responsive" style={{ padding: '4px' }}>
                    <Table
                      dataSource={transportData.filter((t) => {
                        const q = transportSearch.toLowerCase();
                        const matchSearch = !q || (t.lrNumber || '').toLowerCase().includes(q) || (t.orderId || '').toLowerCase().includes(q) || (t.client || '').toLowerCase().includes(q) || (t.transport || '').toLowerCase().includes(q);
                        const matchStatus = !transportStatusFilter || t.status === transportStatusFilter;
                        const matchDate = !transportDateRange || ((t.dispatchDate || '') >= transportDateRange[0] && (t.dispatchDate || '') <= transportDateRange[1]);
                        return matchSearch && matchStatus && matchDate;
                      })}
                      columns={transportColumns}
                      pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                      size="small"
                      scroll={{ x: 'max-content' }}
                    />
                  </div>
                </Card>
              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(activeTab)}
      />

      {/* ── Pickup Payment Modal — Pickup Team pays out of pocket, so this always
           captures amount/GPay/proof to raise a reimbursement claim (Finance's choice
           settles immediately with no form). ── */}
      <Modal
        title={<Space><WalletOutlined style={{ color: '#B11E6A' }} /><span>Pickup Team Payment — Upload Proof</span></Space>}
        open={showPickupPayModal}
        onCancel={() => { setShowPickupPayModal(false); setPickupPayTarget(null); pickupPayForm.resetFields(); }}
        footer={null}
        width={480}
        centered
        destroyOnClose
      >
        {pickupPayTarget && (
          <Form form={pickupPayForm} layout="vertical" onFinish={handlePickupPaySubmit}>
            <div style={{ background: '#fafcff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #e8f4ff' }}>
              <Text strong style={{ display: 'block' }}>{pickupPayTarget.client || '—'}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                Order: {pickupPayTarget.orderId || '—'} &nbsp;·&nbsp; Pickup: {pickupPayTarget.pickupEmpName || '—'}
              </Text>
              <Tag color="green" style={{ marginTop: 6, borderRadius: 8 }}>Payment by Pickup Team</Tag>
            </div>

            <Form.Item label="Amount Paid (₹)" name="amount" initialValue={pickupPayTarget.amount || undefined} rules={[{ required: true, message: 'Enter amount paid' }]}>
              <InputNumber
                prefix="₹"
                style={{ width: '100%' }}
                min={0}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v.replace(/₹\s?|(,*)/g, '')}
                placeholder="0"
              />
            </Form.Item>

            <Form.Item label="Pickup Employee Name" name="pickupEmpId" rules={[{ required: true, message: 'Select the pickup employee' }]}>
              <Select
                showSearch
                placeholder="Select pickup employee"
                style={{ width: '100%' }}
                options={pickupStaffOptions}
                filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <Form.Item label="GPay Number (Pickup employee who paid)" name="gPayNumber" rules={[{ required: true, message: 'Enter GPay / UPI number' }]}>
              <Input prefix={<PhoneOutlined />} placeholder="Enter G Pay / UPI number" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item label="Upload Payment Proof (Payment Screenshot / Receipt)" name="proof" rules={[{ required: true, message: 'Please upload proof' }]}>
              <Upload.Dragger maxCount={1} customRequest={makeUpload('dispatch/proofs')} accept=".pdf,.jpg,.jpeg,.png">
                <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#B11E6A' }} /></p>
                <p className="ant-upload-text" style={{ fontSize: 13 }}>Click or drag payment screenshot / receipt</p>
              </Upload.Dragger>
            </Form.Item>

            <Alert
              type="success"
              showIcon
              style={{ borderRadius: 8, marginBottom: 14, fontSize: 12 }}
              message="This raises a reimbursement claim in Finance team's Reimbursement Expense tab — they'll pay it back in full or in part."
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <Button block onClick={() => { setShowPickupPayModal(false); pickupPayForm.resetFields(); }}>Cancel</Button>
              <Button block type="primary" htmlType="submit" style={{ background: '#B11E6A', border: 'none', fontWeight: 600 }}>
                Submit Payment Proof
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ── Pickup Dropped — Received Confirmation Modal ──────────────────────── */}
      <Modal
        title={<Space><CheckCircleOutlined style={{ color: '#fa8c16' }} /><span>Pickup Dropped — Received Order Process</span></Space>}
        open={showReceivedModal}
        onCancel={() => { setShowReceivedModal(false); setReceivedTarget(null); }}
        onOk={handlePickupDroppedConfirm}
        okText="Confirm — Mark as Received"
        okButtonProps={{ style: { background: '#B11E6A', border: 'none' } }}
        centered
        width={440}
      >
        {receivedTarget && (
          <div>
            <Alert
              type="warning"
              showIcon
              message="Pickup Dropped"
              description={`Order ${receivedTarget.orderId || '—'} from ${receivedTarget.client || '—'} will be marked as Pickup Dropped and the received order process will be initiated.`}
              style={{ borderRadius: 8, marginBottom: 14 }}
            />
            <Text type="secondary" style={{ fontSize: 13 }}>
              The order delivery status will be updated to <Text strong>Received</Text> and will be visible in the tracking view.
            </Text>
          </div>
        )}
      </Modal>

      {/* ── Dispatch Label Modal ──────────────────────────────────────────────── */}
      <Modal
        title={<Space><PrinterOutlined style={{ color: '#B11E6A' }} /><span>Hotel Details Printout — {selectedPrintOrder?.id}</span></Space>}
        open={printModalOpen}
        onCancel={() => setPrintModalOpen(false)}
        width={Math.min(640, window.innerWidth - 32)}
        footer={[
          <Button key="edit" icon={<EditOutlined />} onClick={() => setPrintEditMode(!printEditMode)}>
            {printEditMode ? 'View Preview' : 'Manual Entry'}
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={handlePrint}>
            Print Label
          </Button>,
          <Button key="close" onClick={() => setPrintModalOpen(false)}>Close</Button>,
        ]}
      >
        {selectedPrintOrder && (
          <div>
            <Tabs
              size="small"
              defaultActiveKey="preview"
              items={[
                {
                  key: 'preview',
                  label: 'Label Preview',
                  children: (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                      <div id="dispatch-label" style={{ border: '2px solid #333', borderRadius: 6, padding: 20, width: 380, background: '#fff', color: '#111', fontFamily: 'Arial, sans-serif' }}>
                        <div style={{ background: '#B11E6A', color: '#fff', display: 'inline-block', padding: '2px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, marginBottom: 14, letterSpacing: 1 }}>
                          HEAL N GLOW — DISPATCH LABEL
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 6 }}>From</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{HNG.name}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{HNG.address}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{HNG.city}, {HNG.state} — {HNG.pincode}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>Ph: {HNG.phone}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>GSTIN: {HNG.gstin}</div>
                        </div>
                        <div style={{ borderTop: '1px dashed #aaa', margin: '12px 0' }} />
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#888', fontWeight: 700, marginBottom: 6 }}>To</div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{printForm.getFieldValue('toName') || selectedPrintOrder.client}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>Attn: {printForm.getFieldValue('toContact') || selectedPrintOrder.contactPerson}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>{printForm.getFieldValue('toAddress') || selectedPrintOrder.detailedAddress}</div>
                          <div style={{ fontSize: 12, color: '#444' }}>
                            {printForm.getFieldValue('toCity') || selectedPrintOrder.city},&nbsp;
                            {printForm.getFieldValue('toState') || selectedPrintOrder.state}&nbsp;—&nbsp;
                            {printForm.getFieldValue('toPincode') || selectedPrintOrder.pincode}
                          </div>
                          <div style={{ fontSize: 12, color: '#444' }}>Ph: {printForm.getFieldValue('toPhone') || selectedPrintOrder.phone}</div>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555' }}>
                            <span>Order: <b>{printForm.getFieldValue('orderRef') || selectedPrintOrder.id}</b></span>
                            <span>Boxes: <b>{printForm.getFieldValue('boxCount') || selectedPrintOrder.boxes}</b></span>
                            <span>Wt: <b>{printForm.getFieldValue('weight') || selectedPrintOrder.weight}</b></span>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, color: '#333', marginTop: 6, textAlign: 'center' }}>
                            ||| {selectedPrintOrder.id} |||
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'edit',
                  label: 'Manual Entry',
                  children: (
                    <Form form={printForm} layout="vertical" size="small" style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#B11E6A', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                        To (Recipient Details)
                      </Text>
                      <Row gutter={12}>
                        <Col xs={24} sm={12}><Form.Item label="Hotel / Company Name" name="toName"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Point of Contact" name="toContact"><Input /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item label="Phone Number" name="toPhone"><Input /></Form.Item></Col>
                        <Col xs={24}><Form.Item label="Detailed Address" name="toAddress"><Input.TextArea rows={2} /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="City" name="toCity"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="State" name="toState"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Pincode" name="toPincode"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Location / Area" name="toLocation"><Input /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Box Count" name="boxCount"><Input type="number" prefix={<InboxOutlined />} /></Form.Item></Col>
                        <Col xs={24} sm={8}><Form.Item label="Weight" name="weight"><Input suffix="Kg" /></Form.Item></Col>
                      </Row>
                      <Divider style={{ margin: '8px 0' }} />
                      <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8 }}>From (HNG — fixed)</Text>
                      <Descriptions size="small" column={2} style={{ borderRadius: 8 }}>
                        <Descriptions.Item label="Company">{HNG.name}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{HNG.phone}</Descriptions.Item>
                        <Descriptions.Item label="Address">{HNG.address}, {HNG.city} — {HNG.pincode}</Descriptions.Item>
                        <Descriptions.Item label="GSTIN">{HNG.gstin}</Descriptions.Item>
                      </Descriptions>
                    </Form>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
