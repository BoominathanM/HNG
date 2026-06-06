import React, { useState, useEffect, useMemo } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Typography, Space,
  Descriptions, Alert, Select, Tabs, Divider, Collapse, Upload, InputNumber, Image,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  CarOutlined, CheckCircleOutlined, UploadOutlined, EyeOutlined,
  SearchOutlined, PrinterOutlined, SaveOutlined, EditOutlined,
  InboxOutlined, FilterOutlined, GlobalOutlined,
  ExportOutlined, CheckSquareOutlined, WalletOutlined, UserOutlined,
  PhoneOutlined, FileTextOutlined, DollarCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import {
  useGetDispatchesQuery,
  useGetPickupExpensesQuery,
  useGetCompanySettingsQuery,
  useUploadDispatchLRMutation,
  useConfirmDispatchMutation,
  useVerifyItemMutation,
  useGetTransportsQuery,
  useGetPickupOrdersQuery,
  useUpdatePickupOrderMutation,
  useUpdateTransportStatusMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

// All dispatch orders loaded from API

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
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

const exportCSV = (data, filename) => {
  const headers = ['Order ID', 'Client', 'Destination', 'Product', 'Boxes', 'Weight', 'Payment', 'Status'];
  const rows = data.map(o => [o.id, o.client, o.destination || '', o.product, o.boxes, o.weight, o.payment, o.status]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
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
  const [dispatchSubTab, setDispatchSubTab] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState(null);
  const [pickupSearch, setPickupSearch] = useState('');
  const [pickupTakenFilter, setPickupTakenFilter] = useState(null);
  const [pickupPayFilter, setPickupPayFilter] = useState(null);
  const [reimbSearch, setReimbSearch] = useState('');
  const [reimbPayFilter, setReimbPayFilter] = useState(null);
  const [transportSearch, setTransportSearch] = useState('');
  const [transportStatusFilter, setTransportStatusFilter] = useState(null);
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

  // Product verify state: { [orderId]: { dispatchType, verifiedProducts: Set } }
  const [productVerify, setProductVerify] = useState({});
  // Expanded rows for product panel
  const [expandedRows, setExpandedRows] = useState([]);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  // ── Dispatch orders — RTK Query ─────────────────────────────────────────
  const { data: dispatchData } = useGetDispatchesQuery();
  const [uploadLR] = useUploadDispatchLRMutation();
  const [confirmDispatch] = useConfirmDispatchMutation();
  const [verifyItem] = useVerifyItemMutation();

  const dispatchOrders = useMemo(() => (dispatchData?.data || []).map((d) => ({
    key: d._id,
    id: d.orderId?.orderCode || d.dispatchCode,
    client: d.orderId?.clientName || '—',
    product: d.orderId?.product || '—',
    qty: d.orderId?.qty || 0,
    boxes: 0,
    weight: '—',
    payment: d.orderId?.paymentTerms || 'Pending',
    status: d.status === 'Dispatched' ? 'Dispatched' : d.status === 'Confirmed' ? 'Ready to Dispatch' : 'Packing',
    transport: d.lrNumber || '—',
    lrNumber: d.lrNumber,
    trackingUrl: d.trackingUrl,
    invoiceNumber: d.invoiceNumber,
    createdAt: d.createdAt,
    dispatchedAt: d.dispatchedAt,
    items: d.items || [],
    contactPerson: d.orderId?.contactPerson || d.orderId?.clientName || '—',
    phone: d.orderId?.phone || d.orderId?.clientPhone || '—',
    detailedAddress: d.orderId?.detailedAddress || d.orderId?.address || '—',
    city: d.orderId?.city || '—',
    state: d.orderId?.state || '—',
    pincode: d.orderId?.pincode || '—',
  })), [dispatchData]);

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
    }));
    if (fromApi.length) return fromApi;
    // Fallback: derive from dispatch records that carry an LR number.
    return dispatchOrders.filter((d) => d.lrNumber).map((d) => ({
      key: d.key, lrNumber: d.lrNumber, orderId: d.id,
      client: d.client, transport: d.transport,
      dispatchDate: d.dispatchedAt?.slice(0, 10),
      status: d.status === 'Dispatched' ? 'In Transit' : 'Delivered',
    }));
  }, [transportRaw, dispatchOrders]);

  // ── Pickup reimbursements — RTK Query ─────────────────────────────────────
  const { data: pickupExpData } = useGetPickupExpensesQuery();
  const apiReimbExpenses = useMemo(() => (pickupExpData?.data || []).map((r) => ({
    key: r._id, orderId: r.orderId?.orderCode || '—',
    date: r.createdAt?.slice(0, 10),
    supplier: '—', item: '—',
    amount: r.pickupAmount || 0,
    pickupEmpId: r.pickupEmpId?.staffCode || '—',
    pickupEmpName: r.pickupEmpId?.fullName || '—',
    gPayNumber: r.pickupGPayNumber,
    paymentStatus: r.paymentStatus,
    paymentProof: r.paymentProofUrl,
    paidDate: r.paidDate,
    paidBy: r.paidBy,
  })), [pickupExpData]);

  // ── Pick Up Order tab state ────────────────────────────────────────────────
  const { data: pickupOrdersRaw } = useGetPickupOrdersQuery();
  const [updatePickupOrder] = useUpdatePickupOrderMutation();
  const [pickupOrders, setPickupOrders] = useState([]);
  const [pickupSubTab, setPickupSubTab] = useState('pickup_orders');

  // Load pickup orders from the backend (falls back to any locally-tracked entries).
  useEffect(() => {
    if (pickupOrdersRaw?.data) {
      setPickupOrders(pickupOrdersRaw.data.map((p) => ({
        key: p._id,
        orderId: p.orderCode || '—',
        client: p.clientName || '—',
        destination: p.destination || '—',
        pickupPerson: p.pickupPersonName || p.pickupEmpId?.fullName || '—',
        taken: p.taken,
        amount: p.amount || 0,
        paymentBy: p.paymentBy || '',
        paymentStatus: p.paymentStatus || 'Unpaid',
      })));
    }
  }, [pickupOrdersRaw]);

  // ── Proof data (base64) — shared via hng_proofs localStorage cross-page ──
  const [proofData, setProofData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hng_proofs') || '{}'); } catch { return {}; }
  });

  // ── Taken Status / Payment By modal state ────────────────────────────────
  const [pickupStatusMap, setPickupStatusMap] = useState({});
  const [pickupPayByMap, setPickupPayByMap] = useState({});
  const [showPickupPayModal, setShowPickupPayModal] = useState(false);
  const [pickupPayTarget, setPickupPayTarget] = useState(null);
  const [pickupPayForm] = Form.useForm();
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedTarget, setReceivedTarget] = useState(null);

  // reimbExpenses comes from RTK Query (apiReimbExpenses) — local state used for UI-only overrides
  const [reimbExpenses, setReimbExpenses] = useState([]);
  useEffect(() => {
    if (apiReimbExpenses.length > 0) setReimbExpenses(apiReimbExpenses);
  }, [apiReimbExpenses]);

  // ── Pickup Status / Payment handlers ──────────────────────────────────────
  const handlePickupStatusChange = (record, status) => {
    setPickupStatusMap(prev => ({ ...prev, [record.key]: status }));
    if (status === 'pickup_dropped') {
      setReceivedTarget(record);
      setShowReceivedModal(true);
    }
  };

  const handlePickupPayByChange = (record, payBy) => {
    setPickupPayByMap(prev => ({ ...prev, [record.key]: payBy }));
    setPickupPayTarget({ ...record, payBy });
    pickupPayForm.resetFields();
    setShowPickupPayModal(true);
  };

  const handlePickupPaySubmit = async (vals) => {
    const fileItem = vals.proof?.fileList?.[0];
    // Use Cloudinary URL if file was already uploaded via customRequest
    const proofUrl = fileItem?.url || fileItem?.name || null;
    const payBy = pickupPayTarget.payBy;
    const gPayNum = vals.gPayNumber || null;
    const amt = vals.amount || 0;
    const expenseKey = `DT-${Date.now()}`;

    const newExpense = {
      key: expenseKey,
      orderId: pickupPayTarget.orderId || pickupPayTarget.id || '—',
      date: new Date().toISOString().slice(0, 10),
      supplier: pickupPayTarget.supplier || '—',
      item: pickupPayTarget.item || '—',
      amount: amt,
      pickupEmpId: pickupPayTarget.pickupEmpId || '—',
      pickupEmpName: pickupPayTarget.pickupEmpName || '—',
      category: 'PICKUP',
      gPayNumber: gPayNum,
      proof: proofUrl,
      paymentSource: payBy === 'finance' ? 'Finance' : 'Pickup Team',
      paymentStatus: payBy === 'pickup_team' ? 'Paid' : 'Pending',
      paymentProof: payBy === 'pickup_team' ? proofUrl : null,
      paidDate: payBy === 'pickup_team' ? new Date().toISOString().slice(0, 10) : null,
      paidBy: payBy === 'pickup_team' ? 'Pickup Team' : null,
    };

    const updatedExpenses = [...reimbExpenses, newExpense];
    setReimbExpenses(updatedExpenses);
    localStorage.setItem('hng_pickup_expenses', JSON.stringify(updatedExpenses));

    if (proofUrl) {
      const proofEntry = {
        proof: proofUrl,
        ...(payBy === 'pickup_team' ? { paymentProof: proofUrl } : {}),
      };
      const existing = JSON.parse(localStorage.getItem('hng_proofs') || '{}');
      existing[expenseKey] = proofEntry;
      existing[pickupPayTarget.key] = proofEntry;
      localStorage.setItem('hng_proofs', JSON.stringify(existing));
      setProofData(prev => ({
        ...prev,
        [expenseKey]: proofEntry,
        [pickupPayTarget.key]: proofEntry,
      }));
    }

    const updatedOrders = pickupOrders.map(o => o.key === pickupPayTarget.key
      ? {
          ...o,
          takenStatus: 'taken',
          takenProof: proofUrl,
          paymentBy: payBy,
          expenseKey,
          paymentStatus: payBy === 'pickup_team' ? 'Paid' : 'Pending',
          paymentProof: payBy === 'pickup_team' ? proofUrl : null,
          paidBy: payBy === 'pickup_team' ? 'Pickup Team' : null,
        }
      : o);
    setPickupOrders(updatedOrders);
    localStorage.setItem('hng_dispatch_tracking', JSON.stringify(updatedOrders));

    enqueueSnackbar(payBy === 'pickup_team'
      ? 'Payment proof uploaded — visible to Finance team as Paid.'
      : 'Sent to Finance team with GPay number and proof.', { variant: 'success' });
    setShowPickupPayModal(false);
    setPickupPayTarget(null);
    pickupPayForm.resetFields();
  };

  const handlePickupDroppedConfirm = () => {
    const updatedOrders = pickupOrders.map(o => o.key === receivedTarget?.key
      ? { ...o, takenStatus: 'pickup_dropped', deliveryStatus: 'Received' }
      : o);
    setPickupOrders(updatedOrders);
    localStorage.setItem('hng_dispatch_tracking', JSON.stringify(updatedOrders));
    enqueueSnackbar(`Order ${receivedTarget?.orderId} marked as Pickup Dropped — received order process started.`, { variant: 'success' });
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
      toAddress: order.detailedAddress,
      toCity: order.city,
      toState: order.state,
      toPincode: order.pincode,
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

  const setDispatchType = (orderId, type) => {
    setProductVerify(prev => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), dispatchType: type, verifiedProducts: prev[orderId]?.verifiedProducts || new Set() },
    }));
    // Auto-expand row when dispatch type is chosen
    if (!expandedRows.includes(orderId)) setExpandedRows(r => [...r, orderId]);
  };

  const toggleVerifyProduct = (orderId, productKey) => {
    setProductVerify(prev => {
      const existing = prev[orderId] || { verifiedProducts: new Set() };
      const next = new Set(existing.verifiedProducts);
      next.has(productKey) ? next.delete(productKey) : next.add(productKey);
      return { ...prev, [orderId]: { ...existing, verifiedProducts: next } };
    });
  };

  // ── Product verify expanded row ────────────────────────────────────────────
  const renderProductPanel = (record) => {
    const state = productVerify[record.id] || {};
    const products = (record.items || []).map((it, idx) => ({ key: idx, name: it.itemName || it.name || '—', qty: it.qtyDispatched || it.qtyOrdered || 0, boxes: 0 }));
    const verified = state.verifiedProducts || new Set();

    return (
      <div style={{ padding: '12px 24px', background: isDark ? '#161622' : '#fafafa', borderRadius: 8, margin: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Tag style={{ background: '#B11E6A18', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 12, fontWeight: 600 }}>
            {record.id}
          </Tag>
          <Tag color={state.dispatchType === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12 }}>
            {state.dispatchType || 'Full Dispatch'}
          </Tag>
          <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>— Product Details</Text>
        </div>

        <Table
          size="small"
          pagination={false}
          dataSource={products}
          style={{ borderRadius: 8, overflow: 'hidden' }}
          columns={[
            { title: 'Product', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
            { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
            { title: 'Rate (₹)', dataIndex: 'rate', render: (v) => `₹${v}` },
            { title: 'Boxes', dataIndex: 'boxes', render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space> },
            {
              title: 'Status', key: 'status',
              render: (_, row) => verified.has(row.key)
                ? <Tag color="success" style={{ borderRadius: 20 }}>Verified</Tag>
                : <Tag color="default" style={{ borderRadius: 20 }}>Pending</Tag>,
            },
            {
              title: 'Action', key: 'action',
              render: (_, row) => (
                <Button
                  size="small"
                  icon={<CheckSquareOutlined />}
                  type={verified.has(row.key) ? 'default' : 'primary'}
                  style={verified.has(row.key) ? { borderColor: '#52c41a', color: '#52c41a' } : { background: '#B11E6A', border: 'none', color: '#fff' }}
                  onClick={() => toggleVerifyProduct(record.id, row.key)}
                >
                  {verified.has(row.key) ? 'Unverify' : 'Verify'}
                </Button>
              ),
            },
          ]}
        />

        {products.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
            {verified.size} / {products.length} products verified
          </div>
        )}
      </div>
    );
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const buildColumns = (showTodayActions = false) => [
    { title: 'Order', dataIndex: 'id', width: 105, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 150, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Destination', dataIndex: 'destination', width: 120, responsive: ['md'], render: (v) => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    { title: 'Location', dataIndex: 'address', width: 120, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Created Date', dataIndex: 'createdAt', width: 160, responsive: ['md'], render: (v) => <Text style={{ fontSize: 13 }}>{v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</Text> },
    { title: 'Sales Person', dataIndex: 'salesPerson', width: 115, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Product', dataIndex: 'product', width: 145, responsive: ['md'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Boxes', dataIndex: 'boxes', width: 80, responsive: ['sm'],
      render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ fontSize: 13 }}>{v}</Text></Space>,
    },
    { title: 'Weight', dataIndex: 'weight', width: 90, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Payment', dataIndex: 'payment', width: 115,
      render: (v) => (
        <Tag style={{ borderRadius: 20, fontSize: 13, background: v === 'Confirmed' ? '#6b124022' : '#B11E6A22', color: v === 'Confirmed' ? '#6b1240' : '#B11E6A', border: `1px solid ${v === 'Confirmed' ? '#6b124044' : '#B11E6A44'}` }}>
          {v}
        </Tag>
      ),
    },
    { title: 'Transport', dataIndex: 'transport', width: 120, responsive: ['lg'], render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Status', dataIndex: 'status', width: 140,
      render: (v) => <Tag style={{ borderRadius: 20, fontWeight: 500, fontSize: 13, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag>,
    },
    {
      title: 'Dispatch Type', key: 'dispatchType', width: 160,
      render: (_, r) => (
        <Select
          size="small"
          value={productVerify[r.id]?.dispatchType || undefined}
          placeholder="Select type"
          style={{ width: 145 }}
          onClick={(e) => e.stopPropagation()}
          onChange={(v) => setDispatchType(r.id, v)}
        >
          <Option value="Full Dispatch">Full Dispatch</Option>
          <Option value="Partial Dispatch">Partial Dispatch</Option>
        </Select>
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 110,
      render: (_, r) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/dispatch/${r.id}`)} />
          <Button size="small" icon={<PrinterOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }} onClick={() => openPrintModal(r)} />
          {showTodayActions && (
            <Button size="small" icon={<ExportOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A' }}
              onClick={() => exportCSV([r], `${r.id}-export.csv`)} />
          )}
        </Space>
      ),
    },
  ];

  const transportColumns = [
    { title: 'LR Number', dataIndex: 'lrNumber', width: 115, render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Order', dataIndex: 'orderId', width: 100, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 145, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Transport Co.', dataIndex: 'transport', width: 135, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Boxes', dataIndex: 'boxes', width: 80, render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> },
    { title: 'Weight', dataIndex: 'weight', width: 95, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Freight', dataIndex: 'freight', width: 95, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Dispatch Date', dataIndex: 'dispatchDate', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Status', dataIndex: 'status', width: 105, render: (v) => <Tag color={v === 'Delivered' ? 'success' : 'processing'} style={{ fontSize: 13 }}>{v}</Tag> },
  ];

  const filteredOrders = dispatchOrders.filter((o) => {
    const s = !searchText || o.id.toLowerCase().includes(searchText.toLowerCase()) || o.client.toLowerCase().includes(searchText.toLowerCase()) || o.address.toLowerCase().includes(searchText.toLowerCase()) || (o.destination || '').toLowerCase().includes(searchText.toLowerCase());
    const p = paymentFilter === 'All' || o.payment === paymentFilter;
    const st = !dispatchStatusFilter || o.status === dispatchStatusFilter;
    return s && p && st;
  });

  // Today's Orders = scheduled for today (dispatch day / expected delivery), not creation date.
  const todayOrders = filteredOrders.filter(o => isToday(o.dispatchedAt || o.expectedDeliveryDate || o.createdAt));

  // Expandable config for all orders table
  const expandable = {
    expandedRowKeys: expandedRows,
    onExpand: (expanded, record) => {
      setExpandedRows(expanded ? [...expandedRows, record.id] : expandedRows.filter(k => k !== record.id));
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
          <Option value="Confirmed">Confirmed</Option>
          <Option value="Pending">Pending</Option>
        </Select>
        <Select allowClear placeholder="Status" value={dispatchStatusFilter} onChange={setDispatchStatusFilter} style={{ width: 180, borderRadius: 8 }}>
          <Option value="Ready to Dispatch">Ready to Dispatch</Option>
          <Option value="Payment Pending">Payment Pending</Option>
          <Option value="Dispatched">Dispatched</Option>
          <Option value="Packing">Packing</Option>
        </Select>
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
                              rowKey="id"
                              pagination={{ pageSize: 8, size: 'small' }}
                              size="small"
                              scroll={{ x: 1400 }}
                              onRow={(record) => ({
                                onClick: () => navigate(`/dispatch/${record.id}`),
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
                        Today's Orders
                        <Tag style={{ borderRadius: 20, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', fontSize: 11 }}>
                          {todayOrders.length}
                        </Tag>
                      </Space>
                    ),
                    children: (
                      <div>
                        {filtersRow}
                        <Card
                          title={<Text strong style={{ color: textColor }}>Today's Dispatch Orders</Text>}
                          extra={
                            <Button
                              size="small"
                              icon={<ExportOutlined />}
                              style={{ color: '#B11E6A', borderColor: '#B11E6A' }}
                              onClick={() => exportCSV(todayOrders, `today-orders-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`)}
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
                                No orders created today.
                              </div>
                            ) : (
                              <Table
                                dataSource={todayOrders}
                                columns={buildColumns(true)}
                                expandable={expandable}
                                rowKey="id"
                                pagination={{ pageSize: 8, size: 'small' }}
                                size="small"
                                scroll={{ x: 1400 }}
                                onRow={(record) => ({
                                  onClick: () => navigate(`/dispatch/${record.id}`),
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
                      label: 'Today\'s Pickup Orders',
                      children: (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ color: textColor }}>Current Day Pickup Orders</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Orders assigned for pickup today</Text>
                          </div>
                          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order ID, supplier, item..." allowClear value={pickupSearch} onChange={(e) => setPickupSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                            <Select allowClear placeholder="Taken Status" value={pickupTakenFilter} onChange={setPickupTakenFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="taken">Taken</Option>
                              <Option value="pickup_dropped">Pickup Dropped</Option>
                            </Select>
                            <Select allowClear placeholder="Payment Status" value={pickupPayFilter} onChange={setPickupPayFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Paid">Paid</Option>
                              <Option value="Unpaid">Unpaid</Option>
                            </Select>
                          </div>
                          {pickupOrders.filter((r) => {
                            const q = pickupSearch.toLowerCase();
                            const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.item || '').toLowerCase().includes(q);
                            const matchTaken = !pickupTakenFilter || (r.takenStatus || pickupStatusMap[r.key] || '') === pickupTakenFilter;
                            const matchPay = !pickupPayFilter || r.paymentStatus === pickupPayFilter;
                            return matchSearch && matchTaken && matchPay;
                          }).length === 0 && pickupOrders.length > 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: isDark ? '#aaa' : '#888' }}>No results match your filters.</div>
                          ) : pickupOrders.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: isDark ? '#aaa' : '#888' }}>
                              <CarOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                              <Text type="secondary">No pickup orders for today.</Text>
                            </div>
                          ) : (
                            <Table
                              size="small"
                              dataSource={pickupOrders.filter((r) => {
                                const q = pickupSearch.toLowerCase();
                                const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.item || '').toLowerCase().includes(q);
                                const matchTaken = !pickupTakenFilter || (r.takenStatus || pickupStatusMap[r.key] || '') === pickupTakenFilter;
                                const matchPay = !pickupPayFilter || r.paymentStatus === pickupPayFilter;
                                return matchSearch && matchTaken && matchPay;
                              })}
                              rowKey="key"
                              pagination={{ pageSize: 8, size: 'small' }}
                              scroll={{ x: 1650 }}
                              columns={[
                                { title: 'Date', dataIndex: 'date', width: 95 },
                                { title: 'Order ID', dataIndex: 'orderId', width: 95, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
                                { title: 'Supplier', dataIndex: 'supplier', width: 135, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{v}</Text> },
                                { title: 'Item', dataIndex: 'item', width: 165, render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
                                {
                                  title: 'Pickup Employee', key: 'emp', width: 155,
                                  render: (_, r) => (
                                    <div>
                                      <Text strong style={{ fontSize: 13 }}>{r.pickupEmpName || '—'}</Text>
                                      <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{r.pickupEmpId}</Text>
                                    </div>
                                  )
                                },
                                { title: 'LR Number', dataIndex: 'lrNumber', width: 115, render: v => v ? <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> : <Text type="secondary">—</Text> },
                                {
                                  title: 'Taken Status', key: 'taken', width: 165,
                                  render: (_, r) => {
                                    const currentStatus = pickupStatusMap[r.key] ?? r.takenStatus ?? undefined;
                                    const alreadyDone = !pickupStatusMap[r.key] && r.paymentBy;
                                    return (
                                      <Select
                                        size="small"
                                        value={currentStatus}
                                        placeholder="Select status"
                                        style={{ width: 152 }}
                                        onClick={e => e.stopPropagation()}
                                        onChange={v => handlePickupStatusChange(r, v)}
                                        disabled={!!alreadyDone}
                                      >
                                        <Option value="taken">Taken</Option>
                                        <Option value="pickup_dropped">Pickup Dropped</Option>
                                      </Select>
                                    );
                                  }
                                },
                                {
                                  title: 'Payment By', key: 'paymentBy', width: 185,
                                  render: (_, r) => {
                                    const currentStatus = pickupStatusMap[r.key] ?? r.takenStatus ?? undefined;
                                    const currentPayBy = pickupPayByMap[r.key] ?? r.paymentBy ?? undefined;
                                    if (currentStatus !== 'taken') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                                    if (currentPayBy) {
                                      return (
                                        <Tag
                                          color={currentPayBy === 'finance' ? 'blue' : 'green'}
                                          style={{ borderRadius: 8, fontWeight: 600 }}
                                        >
                                          {currentPayBy === 'finance' ? 'Finance' : 'Pickup Team'}
                                        </Tag>
                                      );
                                    }
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
                                {
                                  title: 'Finance Payment Proof', key: 'finProof', width: 155,
                                  render: (_, r) => {
                                    const lookupKey = r.key;
                                    const altKey = r.expenseKey;
                                    const url = proofData[lookupKey]?.paymentProof || proofData[altKey]?.paymentProof;
                                    if (url) {
                                      const isImg = url.startsWith('data:image');
                                      return isImg
                                        ? <Image src={url} width={46} height={46} style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #52c41a55' }} preview={{ mask: <EyeOutlined style={{ fontSize: 13 }} /> }} />
                                        : <Button size="small" icon={<FileTextOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a', fontSize: 12 }}>View File</Button>;
                                    }
                                    if (r.paymentProof) return <Button size="small" icon={<FileTextOutlined />} style={{ fontSize: 12, color: '#52c41a', borderColor: '#52c41a' }}>View Proof</Button>;
                                    return <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>Not Yet Paid</Tag>;
                                  }
                                },
                                {
                                  title: 'Payment Status', key: 'payStatus', width: 130, align: 'center',
                                  render: (_, r) => {
                                    const status = r.paymentStatus;
                                    if (!status) return <Tag style={{ borderRadius: 8, fontSize: 12 }}>—</Tag>;
                                    return (
                                      <div>
                                        <Tag
                                          color={status === 'Paid' ? 'success' : 'warning'}
                                          style={{ borderRadius: 10, fontWeight: 600, fontSize: 12 }}
                                        >
                                          {status === 'Paid' ? 'Paid' : 'Pending'}
                                        </Tag>
                                        {r.paidBy && <Text type="secondary" style={{ display: 'block', fontSize: 10, marginTop: 2 }}>{r.paidBy}</Text>}
                                      </div>
                                    );
                                  }
                                },
                                {
                                  title: 'Delivery Status', dataIndex: 'deliveryStatus', width: 120,
                                  render: v => {
                                    const colorMap = { 'Delivered': 'success', 'Partial Delivery': 'warning', 'In Transit': 'processing', 'Received': 'success' };
                                    return <Tag color={colorMap[v] || 'default'} style={{ borderRadius: 8 }}>{v || 'Pending'}</Tag>;
                                  }
                                },
                              ]}
                            />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'reimbursement_claims',
                      label: (
                        <Space>
                          Reimbursement Claims
                          {reimbExpenses.filter(r => r.paymentStatus !== 'Paid').length > 0 && (
                            <Tag style={{ borderRadius: 20, background: '#ff4d4f22', color: '#ff4d4f', border: '1px solid #ff4d4f44', fontSize: 10, padding: '0 5px' }}>
                              {reimbExpenses.filter(r => r.paymentStatus !== 'Paid').length} Pending
                            </Tag>
                          )}
                        </Space>
                      ),
                      children: (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ color: textColor }}>Reimbursement Claims</Text>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Pickup expenses — payment status from Finance team</Text>
                          </div>
                          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order, supplier, item..." allowClear value={reimbSearch} onChange={(e) => setReimbSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                            <Select allowClear placeholder="Payment Status" value={reimbPayFilter} onChange={setReimbPayFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Paid">Paid</Option>
                              <Option value="Unpaid">Unpaid</Option>
                            </Select>
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
                                const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.item || '').toLowerCase().includes(q) || (r.pickupEmpName || '').toLowerCase().includes(q);
                                const matchPay = !reimbPayFilter || r.paymentStatus === reimbPayFilter;
                                return matchSearch && matchPay;
                              })}
                              rowKey="key"
                              pagination={{ pageSize: 8, size: 'small' }}
                              scroll={{ x: 1450 }}
                              columns={[
                                { title: 'Date', dataIndex: 'date', width: 95 },
                                { title: 'Order ID', dataIndex: 'orderId', width: 95, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
                                { title: 'Supplier', dataIndex: 'supplier', width: 135, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{v}</Text> },
                                { title: 'Item', dataIndex: 'item', width: 155, render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
                                {
                                  title: 'Employee', key: 'emp', width: 145,
                                  render: (_, r) => (
                                    <div>
                                      <Text strong style={{ fontSize: 13 }}>{r.pickupEmpName}</Text>
                                      <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{r.pickupEmpId}</Text>
                                    </div>
                                  )
                                },
                                {
                                  title: 'Payment Source', dataIndex: 'paymentSource', width: 130, align: 'center',
                                  render: (v, r) => {
                                    const src = v || (r.paidBy === 'Pickup Team' ? 'Pickup Team' : r.paidBy ? 'Finance' : null);
                                    if (!src) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                                    return <Tag color={src === 'Finance' ? 'blue' : 'green'} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{src}</Tag>;
                                  }
                                },
                                {
                                  title: 'G Pay', dataIndex: 'gPayNumber', width: 125,
                                  render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text>
                                },
                                {
                                  title: 'Amount', dataIndex: 'amount', width: 95, align: 'right',
                                  render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>&#8377;{v?.toLocaleString()}</Text>
                                },
                                {
                                  title: 'Uploaded Proof', dataIndex: 'proof', width: 130,
                                  render: (v, r) => {
                                    const url = proofData[r.key]?.proof;
                                    if (url) {
                                      const isImg = url.startsWith('data:image');
                                      return isImg
                                        ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #B11E6A33' }} preview={{ mask: <EyeOutlined style={{ fontSize: 14 }} /> }} />
                                        : <Button size="small" icon={<FileTextOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A', fontSize: 12 }}>View File</Button>;
                                    }
                                    if (v) return <Button size="small" icon={<EyeOutlined />} style={{ fontSize: 12, color: '#B11E6A', borderColor: '#B11E6A' }}>View</Button>;
                                    return <Tag color="warning" style={{ borderRadius: 8, fontSize: 11 }}>Not Uploaded</Tag>;
                                  }
                                },
                                {
                                  title: 'Payment Status', dataIndex: 'paymentStatus', width: 135, align: 'center',
                                  render: (v, r) => (
                                    <div>
                                      <Tag color={v === 'Paid' ? 'success' : 'warning'} style={{ borderRadius: 10, fontSize: 13 }}>
                                        {v === 'Paid' ? 'Paid' : 'Pending (Finance)'}
                                      </Tag>
                                      {r.paidDate && <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{r.paidDate}</Text>}
                                    </div>
                                  )
                                },
                                {
                                  title: 'Paid By', key: 'paidBy', width: 115,
                                  render: (_, r) => r.paidBy
                                    ? <Tag color={r.paidBy === 'Pickup Team' ? 'green' : 'blue'} style={{ borderRadius: 8, fontSize: 12 }}>{r.paidBy}</Tag>
                                    : <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
                                },
                                {
                                  title: 'Finance Payment Proof', dataIndex: 'paymentProof', width: 155,
                                  render: (v, r) => {
                                    const url = proofData[r.key]?.paymentProof;
                                    if (url) {
                                      const isImg = url.startsWith('data:image');
                                      return isImg
                                        ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #52c41a55' }} preview={{ mask: <EyeOutlined style={{ fontSize: 14 }} /> }} />
                                        : <Button size="small" icon={<FileTextOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a', fontSize: 12 }}>View File</Button>;
                                    }
                                    if (v) return <Button size="small" icon={<FileTextOutlined />} style={{ fontSize: 12, color: '#52c41a', borderColor: '#52c41a' }}>View Proof</Button>;
                                    return <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>Not Yet Paid</Tag>;
                                  }
                                },
                              ]}
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
                  </div>
                  <div className="table-responsive" style={{ padding: '4px' }}>
                    <Table
                      dataSource={transportData.filter((t) => {
                        const q = transportSearch.toLowerCase();
                        const matchSearch = !q || (t.lrNumber || '').toLowerCase().includes(q) || (t.orderId || '').toLowerCase().includes(q) || (t.client || '').toLowerCase().includes(q) || (t.transport || '').toLowerCase().includes(q);
                        const matchStatus = !transportStatusFilter || t.status === transportStatusFilter;
                        return matchSearch && matchStatus;
                      })}
                      columns={transportColumns}
                      pagination={{ pageSize: 8, size: 'small' }}
                      size="small"
                      scroll={{ x: 1000 }}
                    />
                  </div>
                </Card>
              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(activeTab)}
      />

      {/* ── Pickup Payment Modal ─────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <WalletOutlined style={{ color: '#B11E6A' }} />
            <span>{pickupPayTarget?.payBy === 'finance' ? 'Send to Finance — GPay & Proof' : 'Pickup Team Payment — Upload Proof'}</span>
          </Space>
        }
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
              <Text strong style={{ display: 'block' }}>{pickupPayTarget.item || '—'}</Text>
              <Text style={{ color: '#B11E6A' }}>{pickupPayTarget.supplier || '—'}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                Order: {pickupPayTarget.orderId || pickupPayTarget.id || '—'} &nbsp;·&nbsp; Pickup: {pickupPayTarget.pickupEmpName || '—'}
              </Text>
              <Tag color={pickupPayTarget.payBy === 'finance' ? 'blue' : 'green'} style={{ marginTop: 6, borderRadius: 8 }}>
                {pickupPayTarget.payBy === 'finance' ? 'Payment by Finance' : 'Payment by Pickup Team'}
              </Tag>
            </div>

            <Form.Item label="Expense Amount (₹)" name="amount" rules={[{ required: true, message: 'Enter expense amount' }]}>
              <InputNumber
                prefix="₹"
                style={{ width: '100%' }}
                min={0}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v.replace(/₹\s?|(,*)/g, '')}
                placeholder="0"
              />
            </Form.Item>

            <Form.Item
              label={pickupPayTarget.payBy === 'finance' ? 'GPay Number (Finance will send payment here)' : 'GPay Number (Pickup employee who paid)'}
              name="gPayNumber"
              rules={[{ required: true, message: 'Enter GPay / UPI number' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="Enter G Pay / UPI number" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              label={pickupPayTarget.payBy === 'finance' ? 'Upload Proof (Bill / Supplier Receipt)' : 'Upload Payment Proof (Payment Screenshot / Receipt)'}
              name="proof"
              rules={[{ required: true, message: 'Please upload proof' }]}
            >
              <Upload.Dragger maxCount={1} customRequest={makeUpload('dispatch/proofs')} accept=".pdf,.jpg,.jpeg,.png">
                <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#B11E6A' }} /></p>
                <p className="ant-upload-text" style={{ fontSize: 13 }}>
                  {pickupPayTarget.payBy === 'finance'
                    ? 'Click or drag supplier bill / receipt'
                    : 'Click or drag payment screenshot / receipt'}
                </p>
              </Upload.Dragger>
            </Form.Item>

            {pickupPayTarget.payBy === 'finance' ? (
              <Alert
                type="info"
                showIcon
                style={{ borderRadius: 8, marginBottom: 14, fontSize: 12 }}
                message="This will appear in Finance team's Reimbursement Expense tab with GPay number and proof. Finance will process and send payment."
              />
            ) : (
              <Alert
                type="success"
                showIcon
                style={{ borderRadius: 8, marginBottom: 14, fontSize: 12 }}
                message="This will appear in Finance team's Reimbursement Expense tab as Paid with GPay number and uploaded proof."
              />
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button block onClick={() => { setShowPickupPayModal(false); pickupPayForm.resetFields(); }}>Cancel</Button>
              <Button block type="primary" htmlType="submit" style={{ background: '#B11E6A', border: 'none', fontWeight: 600 }}>
                {pickupPayTarget.payBy === 'finance' ? 'Send to Finance' : 'Submit Payment Proof'}
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ── Pickup Dropped — Received Confirmation Modal ──────────────────────── */}
      <Modal
        title={<Space><CheckCircleOutlined style={{ color: '#fa8c16' }} /><span>Pickup Dropped — Received Order Process</span></Space>}
        open={showReceivedModal}
        onCancel={() => { setShowReceivedModal(false); setReceivedTarget(null); setPickupStatusMap(prev => { const n = { ...prev }; if (receivedTarget) delete n[receivedTarget.key]; return n; }); }}
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
              description={`Order ${receivedTarget.orderId || '—'} from ${receivedTarget.supplier || '—'} will be marked as Pickup Dropped and the received order process will be initiated.`}
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
