import React, { useState, useMemo } from 'react'; // useEffect intentionally removed — data from RTK Query
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import {
  Row, Col, Card, Table, Tag, Button, Typography, Space, Select, Tabs, Statistic, Divider, 
  Modal, Descriptions, Upload, InputNumber, Form, Input, Badge, Tooltip, Alert, 
  Image,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  WhatsAppOutlined, ShopOutlined, CheckCircleOutlined, CloseCircleOutlined, WalletOutlined,
  ContainerOutlined, ArrowUpOutlined, ClockCircleOutlined, EyeOutlined, UploadOutlined, DollarCircleOutlined, AuditOutlined, FileTextOutlined,
  SearchOutlined, MessageOutlined, EditOutlined,
  CarOutlined, UserOutlined, PhoneOutlined, SendOutlined, ShoppingOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetPendingRequestsQuery,
  useApproveFinancialRequestMutation,
  useBatchApproveRequestsMutation,
  useRejectFinancialRequestMutation,
  useUpdateFinancialQuotationMutation,
  useRequestQuotationModificationMutation,
  usePayPurchaseOrderMutation,
  useGetExpensePaymentsQuery,
  usePayExpenseMutation,
  useGetPickupExpensesQuery,
  usePayPickupExpenseMutation,
  useGetLocalPurchaseExpensesQuery,
  usePayLocalPurchaseExpenseMutation,
  useAddPurchaseNoteMutation,
  useGetVendorsQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;


export default function Financial() {
  const makeUpload = useCloudinaryUpload();
  const { filterTabs } = useTabAccess('Financial');
  const { requireAccess } = usePageAccess('Financial');
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  // Pagination / filter state (must be declared before RTK Query hooks that use them)
  const [purchaseReqStatusFilter, setPurchaseReqStatusFilter] = useState(null);
  const [reqPage, setReqPage] = useState(1);
  const [reqPageSize, setReqPageSize] = useState(10);
  const [expStatusFilter, setExpStatusFilter] = useState(null);
  const [expPage, setExpPage] = useState(1);
  const [expPageSize, setExpPageSize] = useState(10);
  const [pickupPayFilter, setPickupPayFilter] = useState(null);
  const [pickupPage, setPickupPage] = useState(1);
  const [pickupPageSize, setPickupPageSize] = useState(10);
  const [localExpPayFilter, setLocalExpPayFilter] = useState(null);
  const [localExpPage, setLocalExpPage] = useState(1);
  const [localExpPageSize, setLocalExpPageSize] = useState(10);

  // RTK Query data
  const { data: pendingReqData } = useGetPendingRequestsQuery({ page: reqPage, limit: reqPageSize, ...(purchaseReqStatusFilter ? { status: purchaseReqStatusFilter } : {}) });
  const [approveReq] = useApproveFinancialRequestMutation();
  const [batchApproveReqs] = useBatchApproveRequestsMutation();
  const [rejectReq] = useRejectFinancialRequestMutation();
  const [updateQuotation] = useUpdateFinancialQuotationMutation();
  const [requestModification] = useRequestQuotationModificationMutation();
  const [payOrder] = usePayPurchaseOrderMutation();
  const { data: expensePaymentsData } = useGetExpensePaymentsQuery({ page: expPage, limit: expPageSize, ...(expStatusFilter ? { status: expStatusFilter } : {}) });
  const [payExpense] = usePayExpenseMutation();
  const { data: pickupExpData } = useGetPickupExpensesQuery({ page: pickupPage, limit: pickupPageSize, ...(pickupPayFilter ? { paymentStatus: pickupPayFilter } : {}) });
  const [payPickup] = usePayPickupExpenseMutation();
  const { data: localPurchaseExpData } = useGetLocalPurchaseExpensesQuery({ page: localExpPage, limit: localExpPageSize, ...(localExpPayFilter ? { paymentStatus: localExpPayFilter } : {}) });
  const [payLocalPurchase] = usePayLocalPurchaseExpenseMutation();
  const [addPurchaseNote] = useAddPurchaseNoteMutation();
  const { data: vendorData } = useGetVendorsQuery();

  const raisedRequests = useMemo(() => (pendingReqData?.data || []).map((r) => ({
    ...r,
    key: r._id,
    item: r.itemId?.itemName || r.itemName,
    supplier: r.vendorId?.name || '—',
    qty: r.qty,
    unit: r.unit,
    payment_terms: r.paymentTerms,
    date: r.createdAt?.slice(0, 10),
    notes: r.notes || [],
    quotation_file_url: r.quotationFileUrl || null,
    quotation_file: r.quotationFileUrl ? r.quotationFileUrl.split('/').pop() : null,
    quotationFiles: r.quotationFiles || [],
    finance_note: r.financeNote || '',
    batchId: r.batchId || null,
    requestType: r.requestType || 'individual',
  })), [pendingReqData]);

  const purchaseOrders = useMemo(() => raisedRequests
    .filter((r) => r.linkedOrder)
    .map((r) => {
      const o = r.linkedOrder;
      return {
        ...o,
        key: o._id,
        requestKey: r._id,
        item: r.item,
        supplier: r.supplier,
        unit: r.unit,
        vendor: r.vendorId || null,
        // Normalize backend (camelCase) → field names the table/Details modal read
        bill_no: o.billNo || o.poCode || '—',
        inv_no: o.invNo || '—',
        status: o.paymentStatus || 'Unpaid',
        payment_terms: o.paymentTerms || r.payment_terms,
        date: (o.createdAt || r.createdAt)?.slice(0, 10),
        amount: o.amount || 0,
        paid_amount: o.paidAmount || 0,
        notes: o.notes || [],
      };
    }), [raisedRequests]);

  const [viewRequest, setViewRequest] = useState(null);
  const [viewQuotationFile, setViewQuotationFile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [paymentForm] = Form.useForm();

  /* ── Notes: Quotation Requests table (uses Redux raisedRequests.notes) ── */
  const [openReqNotes, setOpenReqNotes] = useState(null);
  const [reqNoteInput, setReqNoteInput] = useState('');

  /* ── Bulk-batch grouping: rows sharing a batchId collapse into one expandable parent row ── */
  const [openBulkBatches, setOpenBulkBatches] = useState([]);

  /* ── Notes: Purchase Payments table (Redux purchaseOrders.notes) ── */
  const [openOrderNotes, setOpenOrderNotes] = useState(null);
  const [orderNoteInput, setOrderNoteInput] = useState({});

  /* ── Edit Quotation modal (Finance can edit & resend) ── */
  const [showEditReqModal, setShowEditReqModal] = useState(false);
  const [editReqTarget, setEditReqTarget] = useState(null);
  const [editReqForm] = Form.useForm();

  /* ── Reject reason modal — so Purchase sees why a request was rejected ── */
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReasonTarget, setRejectReasonTarget] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const handleAddReqNote = async (key) => {
    const text = reqNoteInput.trim();
    if (!text) return;
    try {
      await addPurchaseNote({ id: key, text }).unwrap();
      enqueueSnackbar('Note added', { variant: 'success' });
    } catch { /* silent */ }
    setReqNoteInput('');
  };

  const handleAddOrderNote = (orderKey) => {
    setOrderNoteInput(prev => ({ ...prev, [orderKey]: '' }));
  };

  /* Finance sends a quotation back to Purchase for corrections → status becomes "Modification" */
  const handleReRequest = async (key) => {
    const text = reqNoteInput.trim();
    if (!text) {
      enqueueSnackbar('Please describe the corrections / details needed.', { variant: 'warning' });
      return;
    }
    try {
      await requestModification({ id: key, note: text }).unwrap();
      enqueueSnackbar('Quotation sent back for modification.', { variant: 'success' });
      setReqNoteInput('');
      setOpenReqNotes(null);
    } catch {
      enqueueSnackbar('Failed to send back for modification.', { variant: 'error' });
    }
  };


  const [proofData] = useState({});

  // ── Reimbursement Expense tab — from RTK Query ──
  const reimbursementExpenses = useMemo(() => (pickupExpData?.data || []).map((r) => ({
    key: r._id,
    orderId: r.orderId?.orderCode || '—',
    date: r.createdAt?.slice(0, 10),
    supplier: '—',
    item: '—',
    amount: r.pickupAmount || 0,
    pickupEmpId: r.pickupEmpId?.staffCode || '—',
    pickupEmpName: r.pickupEmpId?.fullName || '—',
    gPayNumber: r.pickupGPayNumber,
    paymentStatus: r.paymentStatus || 'Unpaid',
    paymentProof: r.paymentProofUrl,
    paidDate: r.paidDate,
    paidBy: r.paidBy,
  })), [pickupExpData]);

  const [showReimbPaymentModal, setShowReimbPaymentModal] = useState(false);
  const [reimbPayTarget, setReimbPayTarget] = useState(null);
  const [reimbPayForm] = Form.useForm();

  // ── Local Purchase Expense sub-tab — from RTK Query ──
  const localPurchaseExpenses = useMemo(() => (localPurchaseExpData?.data || []).map((lp) => ({
    key: lp._id,
    date: lp.createdAt?.slice(0, 10),
    invoiceNo: lp.invoiceNo,
    invoiceFile: lp.invoiceFileUrl,
    vendorName: lp.vendorName,
    vendorPhone: lp.vendorPhone,
    items: lp.items || [],
    totalAmount: lp.totalAmount,
    paymentType: lp.paymentType,
    paymentStatus: lp.paymentStatus,
    paymentProof: lp.paymentProofUrl,
    gPayNumber: lp.gPayNumber,
    paidDate: lp.paidDate,
    paidBy: lp.paidBy,
    paidAmount: lp.paidAmount || 0,
    balance: Math.max(0, (lp.totalAmount || 0) - (lp.paidAmount || 0)),
  })), [localPurchaseExpData]);

  const [showLocalPaymentModal, setShowLocalPaymentModal] = useState(false);
  const [localPayTarget, setLocalPayTarget] = useState(null);
  const [localPayForm] = Form.useForm();

  const handleLocalPayment = async (vals) => {
    try {
      const fd = new FormData();
      fd.append('paid_by', vals.paid_by || 'Finance Team');
      fd.append('amount', vals.amount ?? localPayTarget.balance ?? localPayTarget.totalAmount);
      const localProofFile = Array.isArray(vals.payment_proof) ? vals.payment_proof[0] : vals.payment_proof?.fileList?.[0];
      if (localProofFile?.url) {
        fd.append('proofUrl', localProofFile.url);
      } else if (localProofFile?.originFileObj) {
        fd.append('proof', localProofFile.originFileObj);
      }
      await payLocalPurchase({ id: localPayTarget.key, formData: fd }).unwrap();
      enqueueSnackbar('Local purchase payment processed!', { variant: 'success' });
    } catch { enqueueSnackbar('Payment failed', { variant: 'error' }); }
    setShowLocalPaymentModal(false);
    setLocalPayTarget(null);
    localPayForm.resetFields();
  };

  const handleReimbPayment = async (vals) => {
    try {
      const fd = new FormData();
      fd.append('paid_by', vals.paid_by || 'Finance Team');
      const reimbProofFile = Array.isArray(vals.payment_proof) ? vals.payment_proof[0] : vals.payment_proof?.fileList?.[0];
      if (reimbProofFile?.url) {
        fd.append('proofUrl', reimbProofFile.url);
      } else if (reimbProofFile?.originFileObj) {
        fd.append('proof', reimbProofFile.originFileObj);
      }
      await payPickup({ id: reimbPayTarget.key, formData: fd }).unwrap();
      enqueueSnackbar('Reimbursement payment recorded!', { variant: 'success' });
    } catch { enqueueSnackbar('Payment failed', { variant: 'error' }); }
    setShowReimbPaymentModal(false);
    setReimbPayTarget(null);
    reimbPayForm.resetFields();
  };

  // ── Filter state ──
  const [purchaseReqSearch, setPurchaseReqSearch] = useState('');
  const [expSearch, setExpSearch] = useState('');
  const [pickupSearch, setPickupSearch] = useState('');
  const [localExpSearch, setLocalExpSearch] = useState('');

  const [partiesSearch, setPartiesSearch] = useState('');
  const [viewPartyLedger, setViewPartyLedger] = useState(null);
  const [partiesData, setPartiesData] = useState([]);
  const [partyLedgerData, setPartyLedgerData] = useState([]);
  // Real vendor lookup by name — used as a fallback wherever a request/order's
  // vendorId wasn't populated (e.g. pre-migration data), so Phone/Email/Address/Bank
  // still resolve instead of always showing "—".
  const suppliersData = useMemo(() => {
    const map = {};
    (vendorData?.data || []).forEach((v) => {
      map[v.name] = { id: v._id, name: v.name, phone: v.phone, email: v.email, address: v.address, bankDetails: v.bankDetails };
    });
    return map;
  }, [vendorData]);

  // ── Expense Payments — from RTK Query ──
  const expenseRequests = useMemo(() => (expensePaymentsData?.data || []).map((e) => ({
    key: e._id, date: e.expenseDate?.slice(0, 10),
    category: e.category, customCategory: e.customCategory, desc: e.description,
    amount: e.amount, paid_amount: e.paidAmount || 0, status: e.paymentStatus,
    vendor: e.vendorPayee, bill_no: e.expenseCode,
    proofUrl: e.proofUrl,
  })), [expensePaymentsData]);

  const EXPENSE_CATEGORY_META = {
    'Raw Material':               { color: '#B11E6A' },
    'Shipping / Transportation':  { color: '#1890ff' },
    'Utility':                    { color: '#fa8c16' },
    'Utilities (Rent/Elec)':      { color: '#fa8c16' },
    'Other':                      { color: '#722ed1' },
    'Purchase':                   { color: '#52c41a' },
  };

  const handleProcessPayment = async (values) => {
    const paidAmt = values.amount_paid || selectedForPayment.amount;
    const alreadyPaid = selectedForPayment.paid_amount || 0;
    const totalPaid = alreadyPaid + paidAmt;
    const finalStatus = totalPaid >= selectedForPayment.amount ? 'Paid' : 'Partially Paid';
    try {
      const fd = new FormData();
      fd.append('amountPaid', paidAmt);
      fd.append('status', finalStatus);
      const proofFile = values.proof?.fileList?.[0];
      if (proofFile?.url) fd.append('proofUrl', proofFile.url);
      else if (proofFile?.originFileObj) fd.append('proof', proofFile.originFileObj);

      if (selectedForPayment.bill_no?.startsWith('EXP')) {
        await payExpense({ id: selectedForPayment.key, formData: fd }).unwrap();
      } else {
        await payOrder({ id: selectedForPayment.key, formData: fd }).unwrap();
      }
      enqueueSnackbar(`Payment of ₹${paidAmt.toLocaleString()} processed. Status: ${finalStatus}`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Payment failed', { variant: 'error' });
    }
    setShowPaymentModal(false);
    setSelectedForPayment(null);
    paymentForm.resetFields();
  };

  const getStatusColor = (status) => {
    if (status === 'Paid') return 'success';
    if (status === 'Partially Paid' || status === 'Partial Paid') return 'warning';
    return 'error';
  };

  // Collapse quotation requests that share a batchId (raised via Bulk Purchase) into one expandable parent row
  const groupRequestsByBatch = (items) => {
    const batchMap = {};
    const singles = [];
    items.forEach((it) => {
      if (it.batchId) {
        if (!batchMap[it.batchId]) batchMap[it.batchId] = [];
        batchMap[it.batchId].push(it);
      } else {
        singles.push(it);
      }
    });
    const rows = [];
    Object.values(batchMap).forEach((batchItems) => {
      if (batchItems.length > 1) {
        const first = batchItems[0];
        const statuses = batchItems.map(b => b.status);
        const status = statuses.every(s => s === 'Approved') ? 'Approved'
          : statuses.some(s => s === 'Rejected') ? 'Rejected'
          : statuses.some(s => s === 'Modification') ? 'Modification'
          : 'Pending';
        rows.push({
          key: `batch-${first.batchId}`,
          isBatchGroup: true,
          item: `${batchItems.length} Products`,
          supplier: first.supplier,
          payment_terms: first.payment_terms,
          date: first.date,
          status,
          notes: [],
          batchId: first.batchId,
          batchItems,
        });
      } else {
        rows.push(batchItems[0]);
      }
    });
    rows.push(...singles);
    return rows;
  };

  // A batch's PurchaseOrder is consolidated into ONE document (batchId) — resolve it
  // that way first so a batch-group row (and every sibling in it) all show the same
  // order instead of only the first-approved sibling's requestKey matching.
  const findOrderForRequest = (r) => purchaseOrders.find(o =>
    (r.batchId && o.batchId === r.batchId) || o.requestKey === r.key
  );

  // Shows every quotation file uploaded (including re-uploads) and every partial/full
  // payment recorded against the linked order — satisfies "if I have multiple paid and
  // uploads I need to display all if I click row".
  const renderPaymentAndFilesPanel = (order, quotationFiles) => (
    <Row gutter={16} style={{ marginTop: 12 }}>
      <Col xs={24} md={12}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#722ed1', display: 'block', marginBottom: 8 }}>
          <FileTextOutlined style={{ marginRight: 4 }} />Quotation Files
        </Text>
        {(!quotationFiles || quotationFiles.length === 0) && <Text type="secondary" style={{ fontSize: 11 }}>No files uploaded yet.</Text>}
        {(quotationFiles || []).slice().reverse().map((f, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <Button size="small" type="link" icon={<FileTextOutlined />} onClick={() => window.open(f.url, '_blank')} style={{ padding: 0, fontSize: 12, height: 'auto' }}>
              {f.itemName ? `${f.itemName} — ` : ''}{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : `File ${i + 1}`}
            </Button>
          </div>
        ))}
      </Col>
      <Col xs={24} md={12}>
        <Text style={{ fontSize: 12, fontWeight: 600, color: '#52c41a', display: 'block', marginBottom: 8 }}>
          <DollarCircleOutlined style={{ marginRight: 4 }} />Payment History
        </Text>
        {(!order?.paymentHistory || order.paymentHistory.length === 0) && <Text type="secondary" style={{ fontSize: 11 }}>No payments recorded yet.</Text>}
        {(order?.paymentHistory || []).slice().reverse().map((p, i) => (
          <div key={i} style={{ padding: '5px 10px', marginBottom: 5, borderRadius: 6, background: isDark ? '#0d2010' : '#f6ffed', border: `1px solid ${isDark ? '#1a3a20' : '#b7eb8f'}` }}>
            <Text strong style={{ fontSize: 12, color: '#52c41a' }}>₹{(p.amount || 0).toLocaleString()}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}> — {p.paidBy || 'Finance Team'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 10 }}>{p.paidDate ? new Date(p.paidDate).toLocaleString() : ''}</Text>
          </div>
        ))}
      </Col>
    </Row>
  );

  const pendingRequests = raisedRequests.filter(r => r.status === 'Pending').length;
  const stats = [
    { label: 'Pending Approvals', value: pendingRequests, color: '#B11E6A', icon: <ClockCircleOutlined /> },
    { label: 'Unpaid Orders', value: purchaseOrders.filter(r => r.status === 'Unpaid').length, color: '#1890ff', icon: <ShopOutlined /> },
    { label: 'Unpaid Expenses', value: expenseRequests.filter(r => r.status === 'Unpaid').length, color: '#fa8c16', icon: <WalletOutlined /> },
    { label: 'Total Paid (MTD)', value: `₹${purchaseOrders.filter(r => r.status === 'Paid').reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}`, color: '#52c41a', icon: <ArrowUpOutlined /> },
  ];


  const expenseColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Bill No', dataIndex: 'bill_no', width: 120, render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Category', key: 'category', width: 160,
      render: (_, r) => {
        const label = r.category === 'Other' && r.customCategory ? r.customCategory : (r.category || '—');
        const meta = EXPENSE_CATEGORY_META[r.category] || { color: '#722ed1' };
        return <Tag color={meta.color} style={{ borderRadius: 10, padding: '0 10px', fontSize: 12 }}>{label}</Tag>;
      }
    },
    { title: 'Description', dataIndex: 'desc', key: 'desc', render: v => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{v.toLocaleString()}</Text> },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={getStatusColor(r.status)} style={{ fontSize: 12, borderRadius: 8, margin: 0 }}>{r.status || 'Unpaid'}</Tag>
          {r.paid_amount > 0 && r.status !== 'Paid' && (
            <Text type="secondary" style={{ fontSize: 11 }}>Paid: ₹{r.paid_amount.toLocaleString()} / ₹{r.amount.toLocaleString()}</Text>
          )}
        </Space>
      )
    },
    {
      title: 'Actions', key: 'actions', width: 115,
      render: (_, r) => r.status === 'Paid' ? (
        <Tag color="success" style={{ borderRadius: 8, fontSize: 12 }}>Paid</Tag>
      ) : (
        <Button size="small" type="primary" icon={<DollarCircleOutlined />} onClick={() => { if (!requireAccess('edit')) return; setSelectedForPayment(r); setShowPaymentModal(true); }} style={{ background: '#B11E6A', border: 'none', fontSize: 13 }}>Pay Now</Button>
      )
    }
  ];

  const reqColumns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date', width: 95,
      render: v => <Text type="secondary">{v}</Text>
    },
    {
      title: 'Item & Supplier', key: 'item_sup', width: 190,
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Space size={4} align="center">
            <Text strong>{r.item}</Text>
            {r.isBatchGroup && (
              <Tag color="blue" style={{ borderRadius: 10, fontSize: 10, margin: 0, padding: '0 6px' }}>
                Bulk ×{r.batchItems.length}
              </Tag>
            )}
          </Space>
          <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{r.supplier}</Text>
        </Space>
      )
    },
    {
      title: 'Qty', key: 'qty', width: 80, align: 'center',
      render: (_, r) => r.isBatchGroup ? (
        <Text type="secondary" style={{ fontSize: 12 }}>{r.batchItems.length} items</Text>
      ) : (
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
        const order = findOrderForRequest(r);
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
        const order = findOrderForRequest(r);
        if (!order) return <Text type="secondary">—</Text>;
        return <Text strong style={{ color: '#B11E6A' }}>₹{order.amount?.toLocaleString()}</Text>;
      }
    },
    {
      title: 'Pay Status', key: 'payment_status', width: 110, align: 'center',
      render: (_, r) => {
        const order = findOrderForRequest(r);
        if (!order) return <Text type="secondary">—</Text>;
        return <Tag color={getStatusColor(order.status)} style={{ borderRadius: 10, margin: 0 }}>{order.status}</Tag>;
      }
    },
    {
      title: 'Quotation Status', dataIndex: 'status', key: 'status', width: 120, align: 'center',
      render: v => {
        const colorMap = { Approved: 'success', Rejected: 'error', Pending: 'processing', Modification: 'warning' };
        return <Tag color={colorMap[v]} style={{ borderRadius: 12, margin: 0 }}>{v}</Tag>;
      }
    },
    {
      title: 'Actions', key: 'actions', width: 220, fixed: 'right',
      render: (_, r) => {
        if (r.isBatchGroup) {
          const groupOrder = findOrderForRequest(r);
          return (
            <Space wrap size={[4, 4]}>
              <Text type="secondary" style={{ fontSize: 11 }}>Expand to view {r.batchItems.length} items</Text>
              {groupOrder && (
                <>
                  <Button size="small" icon={<EyeOutlined />} onClick={() => setViewRequest(groupOrder)} style={{ fontSize: 11 }}>Details</Button>
                  {groupOrder.status !== 'Paid' && (
                    <Button size="small" type="primary" icon={<DollarCircleOutlined />}
                      onClick={() => { if (!requireAccess('edit')) return; setSelectedForPayment(groupOrder); setShowPaymentModal(true); }}
                      style={{ background: '#B11E6A', border: 'none', fontSize: 11 }}>Pay Now</Button>
                  )}
                </>
              )}
            </Space>
          );
        }
        const noteCount = (r.notes || []).length;
        const noteBtn = (
          <Badge count={noteCount} size="small" offset={[-2, 2]}>
            <Button size="small" icon={<MessageOutlined />}
              onClick={() => { setOpenReqNotes(openReqNotes === r.key ? null : r.key); setReqNoteInput(''); }}
              style={{ color: openReqNotes === r.key ? '#fff' : '#B11E6A', background: openReqNotes === r.key ? '#B11E6A' : 'transparent', borderColor: '#B11E6A55' }}
            >Re-Request Quotation</Button>
          </Badge>
        );
        const order = findOrderForRequest(r);
        return (
          <Space wrap size={[4, 4]}>
            {(r.quotationFiles?.length > 0 || r.quotation_file) && (
              <Button size="small" icon={<FileTextOutlined />} onClick={() => setViewQuotationFile(r)}
                style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>
                File{r.quotationFiles?.length > 1 ? ` (${r.quotationFiles.length})` : ''}
              </Button>
            )}
            {r.status === 'Pending' && (() => {
              const batchPendingCount = r.batchId
                ? raisedRequests.filter(req => req.batchId === r.batchId && req.status === 'Pending').length
                : 0;
              return (
                <>
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                    onClick={async () => {
                      try { await approveReq(r.key).unwrap(); enqueueSnackbar('Approved', { variant: 'success' }); }
                      catch { enqueueSnackbar('Approval failed', { variant: 'error' }); }
                    }}
                    style={{ background: '#52c41a', border: 'none' }}>Approve</Button>
                  {batchPendingCount > 1 && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                      onClick={async () => {
                        try {
                          await batchApproveReqs(r.batchId).unwrap();
                          enqueueSnackbar(`All ${batchPendingCount} items in this batch approved`, { variant: 'success' });
                        } catch { enqueueSnackbar('Batch approval failed', { variant: 'error' }); }
                      }}
                      style={{ background: 'linear-gradient(135deg,#52c41a,#389e0d)', border: 'none', fontWeight: 600 }}>
                      Approve All ({batchPendingCount})
                    </Button>
                  )}
                  <Button size="small" danger icon={<CloseCircleOutlined />}
                    onClick={() => { setRejectReasonTarget(r); setRejectReasonInput(''); setShowRejectReasonModal(true); }}
                  >Reject</Button>
                </>
              );
            })()}
            {order && (
              <>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setViewRequest(order)}
                  style={{ fontSize: 11 }}>Details</Button>
                {order.status !== 'Paid' && (
                  <Button size="small" type="primary" icon={<DollarCircleOutlined />}
                    onClick={() => { if (!requireAccess('edit')) return; setSelectedForPayment(order); setShowPaymentModal(true); }}
                    style={{ background: '#B11E6A', border: 'none', fontSize: 11 }}>Pay Now</Button>
                )}
              </>
            )}
            {(r.status === 'Pending' || r.status === 'Modification') && (
              <Button size="small" icon={<EditOutlined />}
                onClick={() => {
                  setEditReqTarget(r);
                  editReqForm.setFieldsValue({ qty: r.qty, payment_terms: r.payment_terms, amount: r.amount ?? null });
                  setShowEditReqModal(true);
                }}
                style={{ borderColor: '#722ed1', color: '#722ed1' }}
              >Edit</Button>
            )}
            {r.status !== 'Approved' && noteBtn}
          </Space>
        );
      }
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
          items={filterTabs([
            {
              key: 'purchase_requests',
              label: <Space><AuditOutlined /> Quotation Requests</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0, color: textColor }}>Quotation Requests — Approve / Reject</Title>
                    <Text type="secondary">Review quotation requests raised by the procurement team and approve or reject them</Text>
                  </div>
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search item, supplier..."
                      allowClear
                      value={purchaseReqSearch}
                      onChange={(e) => setPurchaseReqSearch(e.target.value)}
                      style={{ width: 220, borderRadius: 8 }}
                    />
                    <Select
                      allowClear
                      placeholder="Quotation Status"
                      value={purchaseReqStatusFilter}
                      onChange={(val) => { setPurchaseReqStatusFilter(val); setReqPage(1); }}
                      style={{ width: 170, borderRadius: 8 }}
                    >
                      <Option value="Pending">Pending</Option>
                      <Option value="Approved">Approved</Option>
                      <Option value="Rejected">Rejected</Option>
                      <Option value="Modification">Modification</Option>
                    </Select>
                  </div>
                  <Table
                    size="small"
                    dataSource={groupRequestsByBatch(raisedRequests.filter((r) => {
                      const q = purchaseReqSearch.toLowerCase();
                      return !q || (r.item || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q);
                    }))}
                    pagination={{
                      current: reqPage,
                      pageSize: reqPageSize,
                      total: pendingReqData?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setReqPage(p); setReqPageSize(ps); },
                      size: 'small',
                    }}
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'No quotation requests yet.' }}
                    expandable={{
                      expandedRowKeys: [...(openReqNotes ? [openReqNotes] : []), ...openBulkBatches],
                      onExpand: (expanded, record) => {
                        if (!record.isBatchGroup) return;
                        setOpenBulkBatches(prev => expanded ? [...prev, record.key] : prev.filter(k => k !== record.key));
                      },
                      // Every row must stay expandable (individual rows are expanded programmatically
                      // via the "Re-Request Quotation" notes button setting openReqNotes, not by clicking
                      // an arrow) — only the arrow itself is hidden for non-batch rows.
                      rowExpandable: () => true,
                      expandIcon: ({ expanded, onExpand, record }) => record.isBatchGroup ? (
                        <span onClick={(e) => onExpand(record, e)} style={{ cursor: 'pointer' }}>
                          {expanded ? '−' : '+'}
                        </span>
                      ) : null,
                      expandedRowRender: (r) => {
                        if (r.isBatchGroup) {
                          const groupOrder = findOrderForRequest(r);
                          // Every item in the batch may have its own uploaded quotation file(s) —
                          // aggregate across all of them (not just the first) so none go missing.
                          const groupFiles = (r.batchItems || []).flatMap((it) =>
                            (it.quotationFiles || []).map((f) => ({ ...f, itemName: it.item }))
                          );
                          return (
                            <div style={{ padding: '8px 16px', background: isDark ? '#16192a' : '#fafcff', borderRadius: 8, margin: '4px 0' }}>
                              {renderPaymentAndFilesPanel(groupOrder, groupFiles)}
                              <Divider style={{ margin: '12px 0' }} />
                              <Table
                                size="small"
                                dataSource={r.batchItems}
                                rowKey="key"
                                pagination={false}
                                columns={reqColumns}
                                scroll={{ x: 'max-content' }}
                              />
                            </div>
                          );
                        }
                        const notes = r.notes || [];
                        const linkedOrder = findOrderForRequest(r);
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
                                {r.status === 'Pending' && (
                                  <Button size="small" icon={<EditOutlined />} onClick={() => handleReRequest(r.key)}
                                    style={{ marginTop: 8, width: '100%', borderColor: '#fa8c16', color: '#fa8c16', borderRadius: 6 }}>
                                    Send Back for Modification
                                  </Button>
                                )}
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
                            {(linkedOrder || (r.quotationFiles || []).length > 0) && (
                              <>
                                <Divider style={{ margin: '12px 0' }} />
                                {renderPaymentAndFilesPanel(linkedOrder, r.quotationFiles)}
                              </>
                            )}
                          </div>
                        );
                      },
                    }}
                    columns={reqColumns}
                  />
                </div>
              )
            },
            {
              key: 'expenses',
              label: <Space><ContainerOutlined /> Expense Payments</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Input
                      prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                      placeholder="Search description, bill no, vendor..."
                      allowClear
                      value={expSearch}
                      onChange={(e) => setExpSearch(e.target.value)}
                      style={{ width: 260, borderRadius: 8 }}
                    />
                    <Select
                      allowClear
                      placeholder="Payment Status"
                      value={expStatusFilter}
                      onChange={(val) => { setExpStatusFilter(val); setExpPage(1); }}
                      style={{ width: 160, borderRadius: 8 }}
                    >
                      <Option value="Unpaid">Unpaid</Option>
                      <Option value="Paid">Paid</Option>
                      <Option value="Partial Paid">Partial Paid</Option>
                    </Select>
                  </div>
                  <Table
                    size="small"
                    dataSource={expenseRequests.filter((e) => {
                      const q = expSearch.toLowerCase();
                      return !q || (e.desc || '').toLowerCase().includes(q) || (e.bill_no || '').toLowerCase().includes(q) || (e.vendor || '').toLowerCase().includes(q);
                    })}
                    columns={expenseColumns}
                    pagination={{
                      current: expPage,
                      pageSize: expPageSize,
                      total: expensePaymentsData?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setExpPage(p); setExpPageSize(ps); },
                      size: 'small',
                    }}
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              )
            },
            {
              key: 'reimbursement',
              label: <Space><WalletOutlined /> Reimbursement Expense</Space>,
              children: (
                <div style={{ marginTop: 12 }}>
                  <Tabs
                    defaultActiveKey="pickup_expense"
                    type="card"
                    items={[
                      {
                        key: 'pickup_expense',
                        label: <Space><CarOutlined />Pickup Expense</Space>,
                        children: (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ marginBottom: 12 }}>
                              <Title level={5} style={{ margin: 0, color: textColor }}>Pickup Expense Reimbursement</Title>
                              <Text type="secondary">Pickup employee expenses from dispatch order taken workflow — review and process payments</Text>
                            </div>
                            <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <Input
                                prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                                placeholder="Search order, supplier, employee..."
                                allowClear
                                value={pickupSearch}
                                onChange={(e) => setPickupSearch(e.target.value)}
                                style={{ width: 250, borderRadius: 8 }}
                              />
                              <Select
                                allowClear
                                placeholder="Payment Status"
                                value={pickupPayFilter}
                                onChange={(val) => { setPickupPayFilter(val); setPickupPage(1); }}
                                style={{ width: 160, borderRadius: 8 }}
                              >
                                <Option value="Paid">Paid</Option>
                                <Option value="Unpaid">Unpaid</Option>
                              </Select>
                            </div>
                            {reimbursementExpenses.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <WalletOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                                <Text type="secondary">No pickup reimbursement expenses yet.</Text>
                              </div>
                            ) : (
                              <Table
                                size="small"
                                dataSource={reimbursementExpenses.filter((r) => {
                                  const q = pickupSearch.toLowerCase();
                                  return !q || (r.orderId || '').toLowerCase().includes(q) || (r.supplier || '').toLowerCase().includes(q) || (r.item || '').toLowerCase().includes(q) || (r.pickupEmpName || '').toLowerCase().includes(q);
                                })}
                                rowKey="key"
                                pagination={{
                                  current: pickupPage,
                                  pageSize: pickupPageSize,
                                  total: pickupExpData?.total || 0,
                                  showSizeChanger: true,
                                  pageSizeOptions: ['10', '20', '50', '100'],
                                  onChange: (p, ps) => { setPickupPage(p); setPickupPageSize(ps); },
                                  size: 'small',
                                }}
                                scroll={{ x: 'max-content' }}
                                columns={[
                                  { title: 'Date', dataIndex: 'date', key: 'date', width: 95 },
                                  { title: 'Order ID', dataIndex: 'orderId', key: 'orderId', width: 90, render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                                  { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 130, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                                  { title: 'Item', dataIndex: 'item', key: 'item', width: 160, render: v => <Text strong>{v}</Text> },
                                  { title: 'Category', dataIndex: 'category', key: 'category', width: 90, render: v => <Tag color="blue" style={{ borderRadius: 8, fontSize: 13 }}>{v}</Tag> },
                                  {
                                    title: 'Payment Source', dataIndex: 'paymentSource', key: 'paymentSource', width: 130, align: 'center',
                                    render: (v, r) => {
                                      const src = v || (r.paidBy === 'Pickup Team' ? 'Pickup Team' : r.paidBy ? 'Finance' : null);
                                      if (!src) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                                      return <Tag color={src === 'Finance' ? 'blue' : 'green'} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{src}</Tag>;
                                    }
                                  },
                                  {
                                    title: 'Pickup Employee', key: 'employee', width: 165,
                                    render: (_, r) => (
                                      <Space direction="vertical" size={0}>
                                        <Space size={4}><UserOutlined style={{ color: '#B11E6A', fontSize: 13 }} /><Text strong style={{ fontSize: 13 }}>{r.pickupEmpName}</Text></Space>
                                        <Text type="secondary" style={{ fontSize: 11 }}>{r.pickupEmpId}</Text>
                                      </Space>
                                    )
                                  },
                                  { title: 'G Pay Number', dataIndex: 'gPayNumber', key: 'gpay', width: 135, render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text> },
                                  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 105, align: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>&#8377;{v?.toLocaleString()}</Text> },
                                  {
                                    title: 'Uploaded Proof', dataIndex: 'proof', key: 'proof', width: 130,
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
                                    title: 'Payment Status', dataIndex: 'paymentStatus', key: 'pay_status', width: 125, align: 'center',
                                    render: (v, r) => (
                                      <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
                                        <Tag color={v === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 10, margin: 0, fontSize: 13 }}>{v || 'Unpaid'}</Tag>
                                        {r.paidDate && <Text type="secondary" style={{ fontSize: 11 }}>{r.paidDate}</Text>}
                                      </Space>
                                    )
                                  },
                                  {
                                    title: 'Paid By', dataIndex: 'paidBy', key: 'paidBy', width: 120, align: 'center',
                                    render: v => v
                                      ? <Tag color={v === 'Pickup Team' ? 'green' : 'blue'} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{v}</Tag>
                                      : <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
                                  },
                                  {
                                    title: 'Finance Payment Proof', dataIndex: 'paymentProof', key: 'pay_proof', width: 155,
                                    render: (v, r) => {
                                      const url = proofData[r.key]?.paymentProof;
                                      if (url) {
                                        const isImg = url.startsWith('data:image');
                                        return isImg
                                          ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6, border: '2px solid #52c41a55' }} preview={{ mask: <EyeOutlined style={{ fontSize: 14 }} /> }} />
                                          : <Button size="small" icon={<FileTextOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a', fontSize: 12 }}>View File</Button>;
                                      }
                                      if (v) return <Button size="small" icon={<FileTextOutlined />} onClick={() => window.open(v, '_blank')} style={{ fontSize: 12, color: '#52c41a', borderColor: '#52c41a' }}>View Proof</Button>;
                                      return <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>Not Yet Uploaded</Tag>;
                                    }
                                  },
                                  {
                                    title: 'Actions', key: 'actions', fixed: 'right', width: 115,
                                    render: (_, r) => r.paymentStatus === 'Paid' ? (
                                      <Tag color="success" style={{ borderRadius: 8, fontSize: 13 }}>Paid</Tag>
                                    ) : (
                                      <Button size="small" type="primary" icon={<DollarCircleOutlined />} style={{ background: '#B11E6A', border: 'none', fontSize: 13 }} onClick={() => { if (!requireAccess('edit')) return; setReimbPayTarget(r); setShowReimbPaymentModal(true); }}>
                                        Pay Now
                                      </Button>
                                    )
                                  },
                                ]}
                              />
                            )}
                          </div>
                        )
                      },
                      {
                        key: 'local_purchase_expense',
                        label: <Space><ShoppingOutlined />Local Purchase Expense</Space>,
                        children: (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ marginBottom: 12 }}>
                              <Title level={5} style={{ margin: 0, color: textColor }}>Local Purchase Payments</Title>
                              <Text type="secondary">Local purchases from vendors — review and process credit payments, upload proof</Text>
                            </div>
                            <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                              <Input
                                prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                                placeholder="Search vendor, invoice, item..."
                                allowClear
                                value={localExpSearch}
                                onChange={(e) => setLocalExpSearch(e.target.value)}
                                style={{ width: 240, borderRadius: 8 }}
                              />
                              <Select
                                allowClear
                                placeholder="Payment Status"
                                value={localExpPayFilter}
                                onChange={(val) => { setLocalExpPayFilter(val); setLocalExpPage(1); }}
                                style={{ width: 160, borderRadius: 8 }}
                              >
                                <Option value="Paid">Paid</Option>
                                <Option value="Partially Paid">Partially Paid</Option>
                                <Option value="Pending">Pending</Option>
                              </Select>
                            </div>
                            {localPurchaseExpenses.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <ShoppingOutlined style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#B11E6A55' }} />
                                <Text type="secondary">No local purchase expenses yet.</Text>
                              </div>
                            ) : (
                              <Table
                                size="small"
                                dataSource={localPurchaseExpenses.filter((lp) => {
                                  const q = localExpSearch.toLowerCase();
                                  return !q || (lp.vendorName || '').toLowerCase().includes(q) || (lp.invoiceNo || '').toLowerCase().includes(q) || (lp.items || []).some(i => (i.name || '').toLowerCase().includes(q));
                                })}
                                rowKey="key"
                                pagination={{
                                  current: localExpPage,
                                  pageSize: localExpPageSize,
                                  total: localPurchaseExpData?.total || 0,
                                  showSizeChanger: true,
                                  pageSizeOptions: ['10', '20', '50', '100'],
                                  onChange: (p, ps) => { setLocalExpPage(p); setLocalExpPageSize(ps); },
                                  size: 'small',
                                }}
                                scroll={{ x: 'max-content' }}
                                columns={[
                                  { title: 'Date', dataIndex: 'date', key: 'date', width: 95 },
                                  { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 145, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{v}</Text> },
                                  {
                                    title: 'Invoice File', dataIndex: 'invoiceFile', key: 'invoiceFile', width: 115,
                                    render: v => v ? <Button size="small" icon={<FileTextOutlined />} style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A' }} onClick={() => window.open(v, '_blank')}>Open</Button> : <Tag color="default" style={{ fontSize: 12 }}>None</Tag>
                                  },
                                  { title: 'Vendor', dataIndex: 'vendorName', key: 'vendorName', width: 155, render: v => <Text style={{ fontWeight: 600, fontSize: 13 }}>{v}</Text> },
                                  { title: 'Vendor Phone', dataIndex: 'vendorPhone', key: 'vendorPhone', width: 135, render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text> },
                                  {
                                    title: 'Items', key: 'items', width: 185,
                                    render: (_, r) => (r.items || []).map((it, i) => (
                                      <div key={i}><Text strong style={{ fontSize: 13 }}>{it.name}</Text><Text type="secondary" style={{ fontSize: 12 }}> — {it.qty} {it.unit}</Text></div>
                                    ))
                                  },
                                  { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', width: 105, align: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>₹{v?.toLocaleString()}</Text> },
                                  { title: 'Balance', dataIndex: 'balance', key: 'balance', width: 105, align: 'right', render: v => v > 0 ? <Text strong style={{ color: '#fa8c16', fontSize: 13 }}>₹{v?.toLocaleString()}</Text> : <Text type="secondary">—</Text> },
                                  { title: 'Payment Type', dataIndex: 'paymentType', key: 'paymentType', width: 115, align: 'center', render: v => <Tag color={v === 'instant' ? 'green' : 'orange'} style={{ borderRadius: 8, fontSize: 13 }}>{v === 'instant' ? 'Instant' : 'Credit'}</Tag> },
                                  {
                                    title: 'GPay Number', dataIndex: 'gPayNumber', key: 'gPayNumber', width: 135,
                                    render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#52c41a' }} /><Text style={{ fontSize: 13 }}>{v}</Text></Space> : <Text type="secondary">—</Text>
                                  },
                                  {
                                    title: 'Payment Status', dataIndex: 'paymentStatus', key: 'paymentStatus', width: 125, align: 'center',
                                    render: (v, r) => (
                                      <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
                                        <Tag color={v === 'Paid' ? 'success' : v === 'Partially Paid' ? 'warning' : 'error'} style={{ borderRadius: 10, margin: 0, fontSize: 13 }}>{v || 'Pending'}</Tag>
                                        {r.paidDate && <Text type="secondary" style={{ fontSize: 11 }}>{r.paidDate}</Text>}
                                      </Space>
                                    )
                                  },
                                  {
                                    title: 'Payment Proof', dataIndex: 'paymentProof', key: 'paymentProof', width: 125,
                                    render: v => v ? <Button size="small" icon={<CheckCircleOutlined />} onClick={() => window.open(v, '_blank')} style={{ fontSize: 13, color: '#52c41a', borderColor: '#52c41a' }}>View Proof</Button> : <Text type="secondary" style={{ fontSize: 13 }}>—</Text>
                                  },
                                  {
                                    title: 'Actions', key: 'actions', fixed: 'right', width: 115,
                                    render: (_, r) => r.paymentStatus === 'Paid' ? (
                                      <Tag color="success" style={{ borderRadius: 8, fontSize: 13 }}>Paid</Tag>
                                    ) : (
                                      <Button size="small" type="primary" icon={<DollarCircleOutlined />} style={{ background: '#B11E6A', border: 'none', fontSize: 13 }} onClick={() => { if (!requireAccess('edit')) return; setLocalPayTarget(r); setShowLocalPaymentModal(true); }}>
                                        {r.paymentStatus === 'Partially Paid' ? 'Pay Balance' : 'Pay Now'}
                                      </Button>
                                    )
                                  },
                                ]}
                              />
                            )}
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )
            }
          ])}
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
              <Col span={24}>
                <Form.Item label="Quoted Amount (₹)" name="amount">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="Correct the quoted amount if needed" />
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
                  editReqForm.validateFields().then(async (vals) => {
                    try {
                      await updateQuotation({ id: editReqTarget.key, qty: vals.qty, paymentTerms: vals.payment_terms, amount: vals.amount }).unwrap();
                      enqueueSnackbar('Quotation details updated.', { variant: 'success' });
                    } catch { enqueueSnackbar('Update failed', { variant: 'error' }); }
                    setShowEditReqModal(false); editReqForm.resetFields();
                  });
                }}>Save Only</Button>
              <Button type="primary" style={{ flex: 2, height: 40, borderRadius: 8, background: '#25D366', border: 'none', fontWeight: 700 }}
                icon={<WhatsAppOutlined />}
                onClick={() => {
                  editReqForm.validateFields().then(async (vals) => {
                    try {
                      await updateQuotation({ id: editReqTarget.key, qty: vals.qty, paymentTerms: vals.payment_terms, amount: vals.amount }).unwrap();
                    } catch { /* silent */ }
                    const phone = (editReqTarget.vendorId?.phone || suppliersData[editReqTarget.supplier]?.phone || '').replace(/\D/g, '');
                    const latestNote = (editReqTarget.notes || []).at(-1);
                    const msg = `*Updated Quotation Request*\n\n*Item:* ${editReqTarget.item}\n*Quantity:* ${vals.qty} ${editReqTarget.unit}\n*Payment Terms:* ${vals.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nKindly provide an updated quotation at the earliest.`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    enqueueSnackbar('Updated quotation sent via WhatsApp!', { variant: 'success' });
                    setShowEditReqModal(false); editReqForm.resetFields();
                  });
                }}>Save & Send via WhatsApp</Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Reject Reason Modal — reason is passed to Purchase so they know why & can re-request */}
      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <Text strong style={{ fontSize: 15 }}>Reject Request</Text>
          </Space>
        }
        open={showRejectReasonModal}
        onCancel={() => { setShowRejectReasonModal(false); setRejectReasonTarget(null); setRejectReasonInput(''); }}
        footer={null}
        width={420}
        centered
      >
        {rejectReasonTarget && (
          <>
            <Text style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
              Rejecting <Text strong>{rejectReasonTarget.item}</Text> ({rejectReasonTarget.qty} {rejectReasonTarget.unit}) from <Text strong>{rejectReasonTarget.supplier}</Text>.
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Reason for rejection (shown to Purchase, e.g. price too high, wrong vendor)..."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button style={{ flex: 1 }} onClick={() => { setShowRejectReasonModal(false); setRejectReasonTarget(null); setRejectReasonInput(''); }}>Cancel</Button>
              <Button
                danger
                type="primary"
                style={{ flex: 2 }}
                onClick={async () => {
                  try {
                    await rejectReq({ id: rejectReasonTarget.key, reason: rejectReasonInput.trim() }).unwrap();
                    enqueueSnackbar('Rejected', { variant: 'warning' });
                    setShowRejectReasonModal(false);
                    setRejectReasonTarget(null);
                    setRejectReasonInput('');
                  } catch { enqueueSnackbar('Rejection failed', { variant: 'error' }); }
                }}
              >
                Confirm Reject
              </Button>
            </div>
          </>
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
          <Form form={paymentForm} layout="vertical" onFinish={handleProcessPayment} initialValues={{ amount_paid: selectedForPayment.amount - (selectedForPayment.paid_amount || 0) }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Payee">{selectedForPayment.item || selectedForPayment.desc}</Descriptions.Item>
              <Descriptions.Item label="Total Amount Due"><Text strong style={{ color: '#B11E6A', fontSize: 18 }}>₹{selectedForPayment.amount.toLocaleString()}</Text></Descriptions.Item>
              <Descriptions.Item label="Paid Till Now">₹{(selectedForPayment.paid_amount || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Balance Remaining"><Text strong style={{ color: '#fa8c16' }}>₹{(selectedForPayment.amount - (selectedForPayment.paid_amount || 0)).toLocaleString()}</Text></Descriptions.Item>
            </Descriptions>

            <Row gutter={12} style={{ marginTop: 20 }}>
              <Col span={14}>
                <Form.Item
                  label="Enter Amount to Pay Now"
                  name="amount_paid"
                  rules={[
                    { required: true, message: 'Please enter amount' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const balance = selectedForPayment.amount - (selectedForPayment.paid_amount || 0);
                        if (!value || value <= 0) return Promise.reject('Amount must be greater than 0');
                        if (value > balance) return Promise.reject(`Cannot exceed balance ₹${balance.toLocaleString()}`);
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <InputNumber
                    prefix="₹"
                    style={{ width: '100%' }}
                    placeholder="0.00"
                    min={1}
                    max={selectedForPayment.amount - (selectedForPayment.paid_amount || 0)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\₹\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item label="Payment Status (Auto)">
                  <Form.Item noStyle dependencies={['amount_paid']}>
                    {({ getFieldValue }) => {
                      const entered = getFieldValue('amount_paid') || 0;
                      const alreadyPaid = selectedForPayment.paid_amount || 0;
                      const isFullyPaid = (alreadyPaid + entered) >= selectedForPayment.amount;
                      return (
                        <Tag
                          color={isFullyPaid ? 'success' : 'warning'}
                          style={{ borderRadius: 10, padding: '4px 14px', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'center', display: 'block' }}
                        >
                          {isFullyPaid ? 'Paid' : 'Partially Paid'}
                        </Tag>
                      );
                    }}
                  </Form.Item>
                </Form.Item>
              </Col>
            </Row>

            {selectedForPayment?.proofUrl && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                  Expense Proof (submitted during expense entry)
                </Text>
                <div style={{ border: `1px solid ${isDark ? '#2a2a3a' : '#B11E6A33'}`, borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto', background: isDark ? '#16192a' : '#fafcff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(selectedForPayment.proofUrl) ? (
                    <Image
                      src={selectedForPayment.proofUrl}
                      style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6 }}
                      preview={{ mask: <EyeOutlined style={{ fontSize: 14 }} /> }}
                    />
                  ) : (
                    <Button icon={<FileTextOutlined />} onClick={() => window.open(selectedForPayment.proofUrl, '_blank')} style={{ color: '#B11E6A', borderColor: '#B11E6A' }}>
                      View Expense Proof Document
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Form.Item label="Upload Payment Proof (Receipt/Screenshot)" name="proof">
              <Upload.Dragger
                style={{ background: isDark ? '#1a1a2e' : '#fafafa' }}
                maxCount={1}
                customRequest={makeUpload('financial/proofs')}
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
              disabled={!(viewQuotationFile?.quotationFiles?.length > 0 || viewQuotationFile?.quotation_file_url)}
              style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              onClick={() => {
                const files = viewQuotationFile?.quotationFiles || [];
                const url = files.length > 0 ? files[files.length - 1].url : viewQuotationFile?.quotation_file_url;
                if (!url) return;
                window.open(url, '_blank');
              }}
            >
              Open Latest File
            </Button>
          </div>
        }
        width={500}
        centered
      >
        {viewQuotationFile && (
          <div style={{ marginTop: 16 }}>
            {/* All uploaded quotation files — every re-request/re-submit is kept, not just the latest */}
            <div style={{ borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A12,#D85C9E08)', border: '1.5px solid #B11E6A33', marginBottom: 16, padding: '12px 16px' }}>
              <Text strong style={{ color: '#B11E6A', fontSize: 12, display: 'block', marginBottom: 8 }}>
                <FileTextOutlined style={{ marginRight: 6 }} />
                Uploaded Quotation Files{viewQuotationFile.quotationFiles?.length > 1 ? ` (${viewQuotationFile.quotationFiles.length})` : ''}
              </Text>
              {(!viewQuotationFile.quotationFiles || viewQuotationFile.quotationFiles.length === 0) && (
                <Text type="secondary" style={{ fontSize: 12 }}>No file uploaded</Text>
              )}
              {(viewQuotationFile.quotationFiles || []).slice().reverse().map((f, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` : 'none' }}>
                  <FileTextOutlined style={{ color: '#B11E6A' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#B11E6A' : textColor }}>
                      {i === 0 && arr.length > 1 ? 'Latest — ' : ''}{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : `File ${arr.length - i}`}
                    </Text>
                  </div>
                  <Button size="small" type="link" onClick={() => window.open(f.url, '_blank')} style={{ padding: 0, fontWeight: 600 }}>
                    View
                  </Button>
                </div>
              ))}
            </div>

            {/* Request summary */}
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Item" span={2}><Text strong>{viewQuotationFile.item}</Text></Descriptions.Item>
              <Descriptions.Item label="Supplier"><Text style={{ color: '#B11E6A', fontWeight: 600 }}>{viewQuotationFile.supplier}</Text></Descriptions.Item>
              <Descriptions.Item label="Qty"><Text strong>{viewQuotationFile.qty} {viewQuotationFile.unit}</Text></Descriptions.Item>
              <Descriptions.Item label="Payment Terms" span={2}><Text style={{ fontSize: 11 }}>{viewQuotationFile.payment_terms}</Text></Descriptions.Item>
              <Descriptions.Item label="Date">{viewQuotationFile.date}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={{ Approved: 'success', Rejected: 'error', Modification: 'warning', Pending: 'processing' }[viewQuotationFile.status] || 'processing'} style={{ borderRadius: 10 }}>
                  {viewQuotationFile.status}
                </Tag>
              </Descriptions.Item>
              {viewQuotationFile.finance_note && (
                <Descriptions.Item label="Finance Note" span={2}><Text type="warning">{viewQuotationFile.finance_note}</Text></Descriptions.Item>
              )}
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
          const sup = viewRequest.vendor || suppliersData[viewRequest.supplier] || null;
          const bank = sup?.bankDetails || sup?.bank;
          const bankText = bank
            ? (typeof bank === 'string' ? bank : [bank.bankName, bank.accountNo, bank.ifsc].filter(Boolean).join(' · '))
            : '—';
          return (
            <div style={{ marginTop: 16 }}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Date">{viewRequest.date || '—'}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={getStatusColor(viewRequest.status)}>{viewRequest.status || 'Unpaid'}</Tag></Descriptions.Item>
                <Descriptions.Item label="Item" span={2}><Text strong>{viewRequest.item || viewRequest.itemName || '—'}</Text></Descriptions.Item>
                <Descriptions.Item label="Qty">{viewRequest.qty} {viewRequest.unit}</Descriptions.Item>
                <Descriptions.Item label="Amount"><Text strong style={{ color: '#B11E6A' }}>₹{(viewRequest.amount || 0).toLocaleString()}</Text></Descriptions.Item>
                <Descriptions.Item label="Bill / PO No">{viewRequest.bill_no || '—'}</Descriptions.Item>
                <Descriptions.Item label="Invoice No">{viewRequest.inv_no || '—'}</Descriptions.Item>
                <Descriptions.Item label="Payment Terms" span={2}>{viewRequest.payment_terms || 'N/A'}</Descriptions.Item>
              </Descriptions>
              {viewRequest.supplier && (
                <>
                  <Divider orientation="left" style={{ marginTop: 16 }}>Supplier / Vendor Details</Divider>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Name"><Text strong style={{ color: '#B11E6A' }}>{sup?.name || viewRequest.supplier}</Text></Descriptions.Item>
                    <Descriptions.Item label="Phone">{sup?.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{sup?.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Address" span={2}>{sup?.address || '—'}</Descriptions.Item>
                  </Descriptions>
                  <Divider orientation="left" style={{ marginTop: 16 }}>Bank Details</Divider>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Bank / A/C">{bankText}</Descriptions.Item>
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

      {/* ── Reimbursement Payment Modal ── */}
      <Modal
        title={<Space><WalletOutlined style={{ color: '#B11E6A' }} /><Text strong>Process Reimbursement Payment</Text></Space>}
        open={showReimbPaymentModal}
        onCancel={() => { setShowReimbPaymentModal(false); setReimbPayTarget(null); reimbPayForm.resetFields(); }}
        footer={null}
        width={500}
        centered
      >
        {reimbPayTarget && (
          <Form form={reimbPayForm} layout="vertical" onFinish={handleReimbPayment}>
            <div style={{ background: isDark ? '#1a1a2e' : '#fafcff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#e8f4ff'}` }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>{reimbPayTarget.item}</Text>
              <Text style={{ color: '#B11E6A' }}>{reimbPayTarget.supplier}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Order: {reimbPayTarget.orderId} · Pickup: {reimbPayTarget.pickupEmpName} ({reimbPayTarget.pickupEmpId})</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Category: {reimbPayTarget.category} · Amount: &#8377;{reimbPayTarget.amount?.toLocaleString()}</Text>
              {reimbPayTarget.gPayNumber && (
                <Text style={{ display: 'block', fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                  G Pay: {reimbPayTarget.gPayNumber}
                </Text>
              )}
            </div>
            <Form.Item label="Paid By" name="paid_by" initialValue="Finance Team">
              <Input placeholder="Finance team member name" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item
              label="Upload Payment Proof"
              name="payment_proof"
              valuePropName="fileList"
              getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
              rules={[{ required: true, message: 'Please upload payment proof' }]}
            >
              <Upload maxCount={1} customRequest={makeUpload('financial/proofs')} accept=".pdf,.jpg,.jpeg,.png">
                <Button icon={<UploadOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Upload Proof (PDF / Image)</Button>
              </Upload>
            </Form.Item>
            <div style={{ padding: '10px 12px', background: isDark ? '#1e2235' : '#f0f7ff', borderRadius: 8, border: `1px solid ${isDark ? '#2a3040' : '#bae0ff'}`, marginBottom: 14, fontSize: 12 }}>
              <SendOutlined style={{ color: '#1890ff', marginRight: 6 }} />
              After submission, payment status will be updated in <Text strong>Dispatch Order Tracking</Text> and <Text strong>Dispatch Pick Up Order</Text> pages.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button block onClick={() => { setShowReimbPaymentModal(false); reimbPayForm.resetFields(); }}>Cancel</Button>
              <Button block type="primary" htmlType="submit" style={{ background: '#B11E6A', border: 'none' }}>Confirm Payment Done</Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ── Local Purchase Payment Modal ── */}
      <Modal
        title={<Space><ShoppingOutlined style={{ color: '#B11E6A' }} /><Text strong>Process Local Purchase Payment</Text></Space>}
        open={showLocalPaymentModal}
        onCancel={() => { setShowLocalPaymentModal(false); setLocalPayTarget(null); localPayForm.resetFields(); }}
        footer={null}
        width={500}
        centered
      >
        {localPayTarget && (
          <Form form={localPayForm} layout="vertical" onFinish={handleLocalPayment}>
            <div style={{ background: isDark ? '#1a1a2e' : '#fafcff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#e8f4ff'}` }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>{localPayTarget.invoiceNo}</Text>
              <Text style={{ color: '#B11E6A' }}>{localPayTarget.vendorName}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Date: {localPayTarget.date} · Payment Type: {localPayTarget.paymentType === 'credit' ? 'Credit' : 'Instant'}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Total Amount: ₹{localPayTarget.totalAmount?.toLocaleString()}</Text>
              {localPayTarget.paidAmount > 0 && (
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Already Paid: ₹{localPayTarget.paidAmount.toLocaleString()} · Balance: ₹{localPayTarget.balance.toLocaleString()}</Text>
              )}
              {(localPayTarget.items || []).map((item, i) => (
                <Text key={i} style={{ display: 'block', fontSize: 11, color: '#888' }}>• {item.name} — {item.qty} {item.unit}</Text>
              ))}
              {localPayTarget.gPayNumber && (
                <Text style={{ display: 'block', fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                  <PhoneOutlined style={{ marginRight: 4 }} />GPay: {localPayTarget.gPayNumber}
                </Text>
              )}
            </div>
            <Form.Item
              label="Amount to Pay"
              name="amount"
              initialValue={localPayTarget.balance ?? localPayTarget.totalAmount}
              tooltip="Pay the full balance, or a lesser amount to record a partial payment"
              rules={[{ required: true, message: 'Enter the amount being paid' }]}
            >
              <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8 }} min={0} max={localPayTarget.balance ?? localPayTarget.totalAmount} />
            </Form.Item>
            <Form.Item label="Paid By" name="paid_by" initialValue="Finance Team">
              <Input placeholder="Finance team member name" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item
              label="Upload Payment Proof"
              name="payment_proof"
              valuePropName="fileList"
              getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
              rules={[{ required: true, message: 'Please upload payment proof' }]}
            >
              <Upload maxCount={1} customRequest={makeUpload('financial/proofs')} accept=".pdf,.jpg,.jpeg,.png">
                <Button icon={<UploadOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Upload Proof (PDF / Image)</Button>
              </Upload>
            </Form.Item>
            <div style={{ padding: '10px 12px', background: isDark ? '#1e2235' : '#f6fff8', borderRadius: 8, border: `1px solid #52c41a33`, marginBottom: 14, fontSize: 12 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
              A partial payment sets status to <Text strong>Partially Paid</Text>; paying the full balance sets it to <Text strong>Paid</Text>. Status and proof update in the <Text strong>Local Purchase</Text> tab in Purchase page.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button block onClick={() => { setShowLocalPaymentModal(false); localPayForm.resetFields(); }}>Cancel</Button>
              <Button block type="primary" htmlType="submit" style={{ background: '#B11E6A', border: 'none' }}>Confirm Payment Done</Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
