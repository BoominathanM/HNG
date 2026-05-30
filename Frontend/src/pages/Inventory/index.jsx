import React, { useState, useEffect, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, Progress, Alert, InputNumber, List, message,
  Avatar, Divider, Drawer, Tabs, DatePicker, Upload, Switch, Descriptions,
  Badge, Tooltip, notification,
} from 'antd';
import {
  PlusOutlined, WarningOutlined, CalculatorOutlined, SearchOutlined, CheckOutlined,
  DownloadOutlined, ShoppingOutlined, LeftOutlined, CloseOutlined,
  UserOutlined, InfoCircleOutlined, MinusOutlined,
  EyeOutlined, UploadOutlined, SafetyCertificateOutlined, HistoryOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SwapOutlined,
  ExclamationCircleOutlined, AuditOutlined,
  BellOutlined, BarChartOutlined, ContainerOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';
import {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useAddStockRequestMutation,
  useSellStockRequestMutation,
  useGetStockApprovalsQuery,
  useApproveMovementMutation,
  useRejectMovementMutation,
  useGetStockHistoryQuery,
  useSubmitStockCheckMutation,
  useGetVendorsQuery,
  useCreateVendorMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;


export default function Inventory() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#16161e' : '#fafafa';

  const [viewBillDetail, setViewBillDetail] = useState(null);

  const { data: invData, isLoading: invLoading } = useGetItemsQuery();
  const { data: approvalsData } = useGetStockApprovalsQuery();
  const { data: suppliersData } = useGetVendorsQuery({ type: 'raw_material' });
  const [createItemMutation] = useCreateItemMutation();
  const [updateItemMutation] = useUpdateItemMutation();
  const [deleteItemMutation] = useDeleteItemMutation();
  const [addStockRequest] = useAddStockRequestMutation();
  const [sellStockRequest] = useSellStockRequestMutation();
  const [approveMovement] = useApproveMovementMutation();
  const [rejectMovement] = useRejectMovementMutation();
  const [submitStockCheck] = useSubmitStockCheckMutation();

  const suppliers = suppliersData?.data || [];
  const { data: customersData } = useGetVendorsQuery({ type: 'customer' });
  const [createVendorMutation] = useCreateVendorMutation();
  const vendorsList = useMemo(() => (customersData?.data || []).map((v) => ({
    id: v._id, name: v.name, phone: v.phone, email: v.email, address: v.address,
  })), [customersData]);

  const inventoryList = useMemo(() => (invData?.data || []).map((i) => ({
    key: i._id,
    code: i.itemCode,
    name: i.itemName,
    category: i.category,
    unit: i.unit,
    value: i.purchasePrice,
    defaultSize: i.defaultSize,
    current: i.currentStock,
    min: i.minStock,
    max: i.minStock * 10,
    price: `₹${i.purchasePrice}/${i.unit}`,
    status: i.currentStock === 0 ? 'Out' : i.currentStock < i.minStock ? 'Low' : 'OK',
    hsnCode: i.hsnCode,
  })), [invData]);

  const pendingAdjustments = useMemo(() => (approvalsData?.data || []).map((m) => ({
    key: m._id,
    date: m.createdAt?.slice(0, 10),
    type: m.movementType === 'IN' ? 'Addition' : m.movementType === 'OUT' ? 'Deduction' : 'Adjustment',
    item: m.itemId?.itemName || '—',
    qty: m.qty,
    unit: m.itemId?.unit || '',
    entity: m.referenceType || 'Manual',
    person: 'Staff',
    status: m.approvalStatus,
    notes: m.reason || '',
  })), [approvalsData]);

  /* ── Manual adjustment modal ── */
  const [adjustModal, setAdjustModal] = useState({ open: false, item: null, type: null });
  const [adjustForm] = Form.useForm();

  /* ── Add Item modal ── */
  const [addItemModal, setAddItemModal] = useState(false);
  const [addItemForm] = Form.useForm();

  /* ── Add Stock (Receive Goods) drawer ── */
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [activeItem, setActiveItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm] = Form.useForm();

  /* ── Sell Stock (Issue Goods) drawer ── */
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm] = Form.useForm();
  const [activeIssueItem, setActiveIssueItem] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorForm] = Form.useForm();

  const [extraCategories, setExtraCategories] = useState([]);
  const categories = useMemo(
    () => [...new Set([...inventoryList.map((i) => i.category).filter(Boolean), ...extraCategories])],
    [inventoryList, extraCategories]
  );
  const [newCategoryName, setNewCategoryName] = useState('');

  /* ── Search & Filter ── */
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState(null);
  const [invStatus, setInvStatus] = useState(null);
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalType, setApprovalType] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  /* ── Stock History ── */
  const { data: historyData } = useGetStockHistoryQuery();
  const stockHistory = useMemo(() => (historyData?.data || []).map((m) => ({
    key: m._id,
    date: m.createdAt?.slice(0, 10),
    item: m.itemId?.itemName || '—',
    code: m.itemId?.itemCode || '—',
    action: m.movementType === 'IN' ? 'Stock Added' : m.movementType === 'OUT' ? 'Stock Deducted' : 'Adjustment',
    qty: m.qty,
    unit: m.itemId?.unit || '',
    source: m.referenceType || '—',
    person: 'Admin',
    notes: m.reason || '',
  })), [historyData]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState(null);
  const [historyDateRange, setHistoryDateRange] = useState(null);

  /* ── Item Detail Drawer (row click) ── */
  const [detailItem, setDetailItem] = useState(null);

  /* ── Live Staff Checking ── */
  const [checkSession, setCheckSession] = useState(
    inventoryList.map(i => ({
      key: i.key,
      code: i.code,
      name: i.name,
      unit: i.unit,
      systemCount: i.current,
      physicalCount: i.current,
      missingType: null,
      missingReason: '',
    }))
  );
  const [checkSubmitOpen, setCheckSubmitOpen] = useState(false);
  const [checkNotes, setCheckNotes] = useState('');
  const [checkSubmitted, setCheckSubmitted] = useState(false);

  /* ── Derived ── */
  const filteredInventory = inventoryList.filter((i) => {
    const q = invSearch.toLowerCase();
    const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q) || (i.sellers || []).map(s => (s.name || s)).join(' ').toLowerCase().includes(q);
    const matchCategory = !invCategory || i.category === invCategory;
    const matchStatus = !invStatus || i.status === invStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const filteredApprovals = pendingAdjustments.filter((a) => {
    const q = approvalSearch.toLowerCase();
    const matchSearch = !q || (a.item || '').toLowerCase().includes(q) || (a.person || '').toLowerCase().includes(q);
    const matchType = !approvalType || a.type === approvalType;
    const matchStatus = !approvalStatus || a.status === approvalStatus;
    return matchSearch && matchType && matchStatus;
  });

  const filteredHistory = stockHistory.filter(h => {
    const q = historySearch.toLowerCase();
    const matchSearch = !q || h.item.toLowerCase().includes(q) || (h.code || '').toLowerCase().includes(q) || (h.source || '').toLowerCase().includes(q) || (h.invoiceNo || '').toLowerCase().includes(q);
    const matchAction = !historyActionFilter || h.action === historyActionFilter;
    const matchDate = !historyDateRange || !historyDateRange[0] || !historyDateRange[1] || (
      h.date >= historyDateRange[0].format('YYYY-MM-DD') && h.date <= historyDateRange[1].format('YYYY-MM-DD')
    );
    return matchSearch && matchAction && matchDate;
  });

  const lowStock = inventoryList.filter((i) => i.status === 'Low' || i.status === 'Out');

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.phone || '').includes(supplierSearch)
  );
  const filteredVendors = vendorsList.filter((c) =>
    (c.name || '').toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (c.phone || '').includes(vendorSearch)
  );

  const onCategoryChange = (event) => setNewCategoryName(event.target.value);

  const addCategory = (e) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setExtraCategories((prev) => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const openReceive = (r) => {
    setActiveItem(r);
    setSelectedSupplier(null);
    setSupplierSearch('');
    setShowAddSupplier(false);
    receiveForm.resetFields();
    supplierForm.resetFields();
    setReceiveOpen(true);
  };

  const openIssue = (r) => {
    setActiveIssueItem(r);
    setSelectedVendor(null);
    setVendorSearch('');
    setShowAddVendor(false);
    issueForm.resetFields();
    vendorForm.resetFields();
    setIssueOpen(true);
  };

  const handleSaveSupplier = async () => {
    try {
      const vals = supplierForm.getFieldsValue();
      const result = await createVendorMutation({
        name: vals.sup_name, phone: vals.sup_phone, email: vals.sup_email,
        address: vals.sup_address, type: 'raw_material', taxId: vals.sup_tax, bankDetails: vals.sup_bank,
      }).unwrap();
      setSelectedSupplier({ id: result.data?._id || result._id, name: vals.sup_name, phone: vals.sup_phone, address: vals.sup_address });
      supplierForm.resetFields();
      setShowAddSupplier(false);
      message.success('Supplier added');
    } catch {
      message.error('Failed to add supplier');
    }
  };

  const handleSaveVendor = async () => {
    try {
      const vals = vendorForm.getFieldsValue();
      const result = await createVendorMutation({
        name: vals.cust_name, phone: vals.cust_phone, email: vals.cust_email,
        address: vals.cust_address, type: 'customer', taxId: vals.cust_tax, bankDetails: vals.cust_bank,
      }).unwrap();
      setSelectedVendor({ id: result.data?._id || result._id, name: vals.cust_name, phone: vals.cust_phone, address: vals.cust_address });
      vendorForm.resetFields();
      setShowAddVendor(false);
      message.success('Vendor added');
    } catch {
      message.error('Failed to add vendor');
    }
  };

  const handleSaveItem = async () => {
    try {
      const vals = await addItemForm.validateFields();
      const opening = Number(vals.current) || 0;
      await createItemMutation({
        itemName: vals.name,
        category: vals.category || '',
        unit: vals.unit || 'Pcs',
        defaultSize: vals.default_size || '',
        openingStock: opening,
        currentStock: opening,
        minStock: Number(vals.min) || 0,
        purchasePrice: Number(String(vals.purchase_price ?? '').replace(/[^0-9.]/g, '')) || 0,
        sellingPrice: Number(String(vals.selling_price ?? '').replace(/[^0-9.]/g, '')) || 0,
        hsnCode: vals.hsn || '',
        discountPercent: Number(String(vals.discount ?? '').replace(/[^0-9.]/g, '')) || 0,
      }).unwrap();
      addItemForm.resetFields();
      setAddItemModal(false);
      message.success('Item added');
    } catch (err) {
      if (err?.errorFields) return; // form validation error — fields already highlighted
      message.error(err?.data?.message || err?.data || 'Failed to add item');
    }
  };

  const handleApproveAdjustment = async (adj) => {
    try {
      await approveMovement(adj.key).unwrap();
      message.success('Stock adjustment approved and applied');
    } catch {
      message.error('Failed to approve adjustment');
    }
  };

  const handleRejectAdjustment = async (adj) => {
    try {
      await rejectMovement(adj.key).unwrap();
      message.warning('Adjustment request rejected');
    } catch {
      message.error('Failed to reject adjustment');
    }
  };

  /* ── Submit Live Stock Check ── */
  const handleSubmitCheck = async () => {
    const discrepancies = checkSession.filter(i => i.physicalCount !== i.systemCount);
    const unknownItems = checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown');
    try {
      await submitStockCheck(
        discrepancies.map((item) => ({
          itemId: item.key,
          physicalCount: item.physicalCount,
          systemCount: item.systemCount,
          diff: item.physicalCount - item.systemCount,
          missingType: item.missingType,
          missingReason: item.missingReason,
        }))
      ).unwrap();
      unknownItems.forEach((item) => {
        notification.warning({
          message: 'Unknown Stock Shortage Reported',
          description: `${Math.abs(item.physicalCount - item.systemCount)} ${item.unit} of "${item.name}" is unaccounted. Super Admin and Manager have been notified.`,
          icon: <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />,
          duration: 8,
        });
      });
      setCheckSubmitOpen(false);
      setCheckSubmitted(true);
      message.success(`Stock check submitted. ${discrepancies.length} discrepancies sent for approval.`);
    } catch {
      message.error('Failed to submit stock check');
    }
  };

  /* ── Style helpers ── */
  const sectionCard = {
    borderRadius: 14,
    border: `1px solid ${borderColor}`,
    background: cardBg,
    marginBottom: 12,
    overflow: 'hidden',
  };

  const sectionHeader = (gradient) => ({
    padding: '12px 16px',
    background: gradient || sectionBg,
    borderBottom: `1px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  const saveBtn = (gradient) => ({
    background: gradient,
    border: 'none',
    height: 48,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.8,
  });

  /* ── Entity selector helper ── */
  const renderEntitySelector = ({
    label, icon, search, setSearch, filtered, selected, setSelected,
    showAdd, setShowAdd, addForm, addFormFields, onSave, gradient,
  }) => (
    <div style={sectionCard}>
      <div style={sectionHeader()}>
        {icon}
        <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>{label}</Text>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: `${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}15`, border: `1.5px solid ${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}44` }}>
            <Avatar style={{ background: gradient, flexShrink: 0 }}>{selected.name[0]}</Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{selected.name}</Text>
              <Text style={{ fontSize: 12, color: '#aaa' }}>{[selected.phone, selected.address].filter(Boolean).join(' · ')}</Text>
            </div>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setSelected(null); setSearch(''); setShowAdd(false); }} style={{ color: '#aaa' }} />
          </div>
        ) : (
          <>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder={`Search ${label.toLowerCase()} by name or phone...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowAdd(false); }}
              style={{ borderRadius: 24, height: 42, background: isDark ? '#2a2a3a' : '#f5f5f5', border: 'none' }}
              allowClear
            />
            {!showAdd && (
              <div style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 && <div style={{ padding: '14px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No results found</div>}
                {filtered.map((item) => {
                  const isSel = selected?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setSelected(item); setSearch(''); }}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', gap: 10, background: isSel ? '#B11E6A08' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#B11E6A08'}
                      onMouseLeave={e => e.currentTarget.style.background = isSel ? '#B11E6A08' : 'transparent'}
                    >
                      <Avatar size={34} style={{ background: gradient, flexShrink: 0, fontSize: 13 }}>{item.name[0]}</Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13, color: textColor, display: 'block' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#aaa' }}>{[item.phone, item.address].filter(Boolean).join(' · ')}</Text>
                      </div>
                      {isSel && <CheckOutlined style={{ color: '#B11E6A' }} />}
                    </div>
                  );
                })}
              </div>
            )}
            {!showAdd && (
              <Button icon={<PlusOutlined />} onClick={() => { setShowAdd(true); addForm.resetFields(); }} style={{ marginTop: 10, width: '100%', borderColor: '#B11E6A66', color: '#B11E6A', borderRadius: 8, height: 40, fontWeight: 600, borderStyle: 'dashed' }}>
                Add New {label}
              </Button>
            )}
          </>
        )}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ marginTop: 12, borderRadius: 10, border: `1.5px solid #B11E6A44`, background: isDark ? '#1a0f14' : '#fff8fb', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#B11E6A12', borderBottom: `1px solid #B11E6A22` }}>
                <Text style={{ fontWeight: 700, color: '#B11E6A', fontSize: 13 }}>New {label}</Text>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setShowAdd(false)} style={{ color: '#aaa' }} />
              </div>
              <Form form={addForm} layout="vertical" style={{ padding: '12px 14px 0' }}>
                {addFormFields}
              </Form>
              <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8 }}>
                <Button onClick={() => setShowAdd(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
                <Button type="primary" onClick={onSave} style={{ flex: 2, height: 40, borderRadius: 8, background: gradient, border: 'none', fontWeight: 700 }}>Save {label}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const columns = [
    { title: 'Code', dataIndex: 'code', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
    { title: 'Item Name', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: 'Category', dataIndex: 'category', responsive: ['sm'], render: (v) => <Tag style={{ borderRadius: 20, fontSize: 11, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44' }}>{v}</Tag> },
    { title: 'Unit', dataIndex: 'unit', responsive: ['lg'] },
    {
      title: 'Stock Level', key: 'level',
      render: (_, r) => (
        <div style={{ minWidth: 120 }}>
          <Progress percent={Math.min(100, Math.round((r.current / r.max) * 100))} size="small" strokeColor={r.status === 'OK' ? '#B11E6A' : r.status === 'Low' ? '#C94F8A' : '#8a1652'} showInfo={false} />
          <Text style={{ fontSize: 11, color: '#999' }}>{(r.current ?? 0).toLocaleString()} / {(r.max ?? 0).toLocaleString()} {r.unit}</Text>
        </div>
      ),
    },
    { title: 'Min Req', dataIndex: 'min', responsive: ['lg'], render: (v, r) => `${v} ${r.unit}` },
    {
      title: 'Low Stock Alert', key: 'alert',
      render: (_, r) => r.current <= r.min
        ? <Tag icon={<WarningOutlined />} color="error" style={{ borderRadius: 12 }}>Low Stock</Tag>
        : <Tag color="success" style={{ borderRadius: 12 }}>Healthy</Tag>
    },
    { title: 'Price', dataIndex: 'price', responsive: ['md'] },
    {
      title: 'Vendors', dataIndex: 'sellers', key: 'sellers', responsive: ['lg'],
      render: (v, r) => {
        const list = Array.isArray(v) ? v : (v ? [{ name: v, stock: r.current }] : []);
        if (list.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={4} wrap>
            {list.map((s, i) => {
              const name = s.name || s;
              const stock = s.stock ?? 0;
              return (
                <Tag key={i} style={{ borderRadius: 20, fontSize: 10, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 0, padding: '0 6px 0 8px' }}>
                  <span>{name}</span>
                  <span style={{ background: '#B11E6A', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 9, fontWeight: 700, lineHeight: '16px', marginLeft: 6 }}>{stock} {r.unit}</span>
                </Tag>
              );
            })}
          </Space>
        );
      }
    },
    { title: 'Purchased', dataIndex: 'purchasedDate', responsive: ['lg'] },
    {
      title: 'Status', dataIndex: 'status',
      render: (v) => (
        <Tag style={{ borderRadius: 20, fontWeight: 500, background: v === 'OK' ? '#B11E6A22' : v === 'Low' ? '#C94F8A22' : '#8a165222', color: v === 'OK' ? '#B11E6A' : v === 'Low' ? '#C94F8A' : '#8a1652', border: `1px solid ${v === 'OK' ? '#B11E6A44' : v === 'Low' ? '#C94F8A44' : '#8a165244'}` }}>
          {v === 'Out' ? 'Out of Stock' : v}
        </Tag>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4} wrap>
          <div style={{ display: 'flex', alignItems: 'center', background: isDark ? '#2a2a3e' : '#f0f0f0', borderRadius: 6, padding: '2px', border: `1px solid ${borderColor}` }}>
            <Button size="small" type="text" icon={<MinusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); adjustForm.resetFields(); setAdjustModal({ open: true, item: r, type: 'Deduction' }); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            <Text strong style={{ fontSize: 11, minWidth: 28, textAlign: 'center', color: textColor }}>{r.current}</Text>
            <Button size="small" type="text" icon={<PlusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); adjustForm.resetFields(); setAdjustModal({ open: true, item: r, type: 'Addition' }); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>
          <Button size="small" type="primary" icon={<DownloadOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openReceive(r); }}>Add Stock</Button>
          <Button size="small" icon={<ShoppingOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openIssue(r); }}>Sell Stock</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Inventory" items={[{ label: 'Inventory' }]} style={{ marginBottom: 0 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddItemModal(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add Item</Button>
      </div>

      {lowStock.length > 0 && (
        <Alert type="warning" icon={<WarningOutlined />} showIcon
          message={`${lowStock.length} items below minimum: ${lowStock.map((i) => i.name).join(', ')}`}
          style={{ marginBottom: 20, borderRadius: 10 }} />
      )}

      {/* Stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Items', val: inventoryList.length, color: '#B11E6A' },
          { label: 'OK Stock', val: inventoryList.filter((i) => i.status === 'OK').length, color: '#8a1652' },
          { label: 'Low Stock', val: inventoryList.filter((i) => i.status === 'Low').length, color: '#C94F8A' },
          { label: 'Out of Stock', val: inventoryList.filter((i) => i.status === 'Out').length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card title={<Text strong style={{ color: textColor }}>Stock Levels Overview</Text>}
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '12px 16px 16px' } }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inventoryList.map((i) => ({ name: i.name.split(' ').slice(0, 2).join(' '), current: i.current, min: i.min }))} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <ReTooltip />
                <Bar dataKey="current" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Current Stock" />
                <Bar dataKey="min" fill="#D85C9E" radius={[4, 4, 0, 0]} name="Min Required" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ════════════════════════════════════════
          INVENTORY TABS
      ════════════════════════════════════════ */}
      <Tabs defaultActiveKey="stock" style={{ marginBottom: 20 }}
        items={[
          /* ── Tab 1: Stock Inventory ── */
          {
            key: 'stock',
            label: <Space><ShoppingOutlined />Stock Inventory</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item, code, vendor..." allowClear value={invSearch} onChange={(e) => setInvSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                  <Select allowClear placeholder="Category" value={invCategory} onChange={setInvCategory} style={{ width: 160, borderRadius: 8 }}>
                    {[...new Set(inventoryList.map(i => i.category))].map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                  <Select allowClear placeholder="Stock Status" value={invStatus} onChange={setInvStatus} style={{ width: 150, borderRadius: 8 }}>
                    <Option value="OK">OK</Option>
                    <Option value="Low">Low Stock</Option>
                    <Option value="Out">Out of Stock</Option>
                  </Select>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>Click any row for details</Text>
                </div>
                <div className="table-responsive" style={{ padding: '4px' }}>
                  <Table
                    dataSource={filteredInventory}
                    columns={columns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    onRow={(record) => ({
                      onClick: () => setDetailItem(record),
                      style: { cursor: 'pointer' },
                    })}
                  />
                </div>
              </Card>
            )
          },

          /* ── Tab 2: Approvals ── */
          {
            key: 'approvals',
            label: <Space><SafetyCertificateOutlined /> Approvals <Tag color="orange" style={{ borderRadius: 10, marginLeft: 4 }}>{pendingAdjustments.filter(a => a.status === 'Pending').length}</Tag></Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0, color: textColor }}>Operation Head Approval Center</Title>
                  <Text type="secondary">Review and approve manual stock adjustments (+ / -)</Text>
                </div>
                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item or person..." allowClear value={approvalSearch} onChange={(e) => setApprovalSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                  <Select allowClear placeholder="Type" value={approvalType} onChange={setApprovalType} style={{ width: 140, borderRadius: 8 }}>
                    <Option value="Addition">Addition</Option>
                    <Option value="Deduction">Deduction</Option>
                  </Select>
                  <Select allowClear placeholder="Status" value={approvalStatus} onChange={setApprovalStatus} style={{ width: 140, borderRadius: 8 }}>
                    <Option value="Pending">Pending</Option>
                    <Option value="Approved">Approved</Option>
                    <Option value="Rejected">Rejected</Option>
                  </Select>
                </div>
                <Table
                  size="small"
                  dataSource={filteredApprovals}
                  columns={[
                    { title: 'Date', dataIndex: 'date', key: 'date' },
                    { title: 'Item', dataIndex: 'item', key: 'item', render: (v) => <Text strong>{v}</Text> },
                    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Addition' ? 'success' : 'error'} icon={t === 'Addition' ? <PlusOutlined /> : <MinusOutlined />} style={{ borderRadius: 12 }}>{t}</Tag> },
                    { title: 'Qty', dataIndex: 'qty', key: 'qty', render: (q, r) => <Text strong>{q} {r.unit}</Text> },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (v) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>—</Text> },
                    { title: 'Requested By', dataIndex: 'person', key: 'person' },
                    {
                      title: 'Status', dataIndex: 'status', key: 'status',
                      render: (s) => <Tag color={s === 'Pending' ? 'orange' : s === 'Approved' ? 'success' : 'error'} icon={s === 'Pending' ? <ClockCircleOutlined /> : s === 'Approved' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>{s}</Tag>
                    },
                    {
                      title: 'Action', key: 'action',
                      render: (_, record) => record.status === 'Pending' ? (
                        <Space>
                          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApproveAdjustment(record)} style={{ background: '#52c41a', border: 'none', color: '#fff' }}>Approve</Button>
                          <Button size="small" danger ghost icon={<CloseOutlined />} onClick={() => handleRejectAdjustment(record)}>Reject</Button>
                        </Space>
                      ) : null
                    }
                  ]}
                />
              </Card>
            )
          },

          /* ── Tab 3: Stock History ── */
          {
            key: 'history',
            label: <Space><HistoryOutlined />Stock History</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item, code, source, invoice..." allowClear value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                    <Select allowClear placeholder="Movement Type" value={historyActionFilter} onChange={setHistoryActionFilter} style={{ width: 170 }}>
                      <Option value="Stock Added">Incoming (Stock Added)</Option>
                      <Option value="Stock Deducted">Outgoing (Stock Deducted)</Option>
                      <Option value="Stock Check">Adjustment (Stock Check)</Option>
                    </Select>
                    <DatePicker.RangePicker style={{ width: 280 }} onChange={setHistoryDateRange} />
                  </Space>
                  <Button icon={<DownloadOutlined />} type="primary" style={{ background: '#B11E6A', border: 'none' }}>Export History</Button>
                </div>
                <Table
                  size="small"
                  dataSource={filteredHistory}
                  columns={[
                    { title: 'Date', dataIndex: 'date', key: 'date', render: v => <Text strong>{v}</Text> },
                    { title: 'Code', dataIndex: 'code', key: 'code', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 12 }}>{v}</Text> },
                    { title: 'Item Name', dataIndex: 'item', key: 'item', render: v => <Text strong>{v}</Text> },
                    {
                      title: 'Action', dataIndex: 'action', key: 'action',
                      render: v => <Tag color={v === 'Stock Added' ? 'success' : v === 'Stock Deducted' ? 'error' : 'warning'} style={{ borderRadius: 12 }}>{v}</Tag>
                    },
                    { title: 'Qty', key: 'qty', render: (_, r) => <Text strong style={{ color: r.action === 'Stock Added' ? '#52c41a' : '#ff4d4f' }}>{r.action === 'Stock Added' ? '+' : '-'}{r.qty} {r.unit}</Text> },
                    { title: 'Source / Entity', dataIndex: 'source', key: 'source', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', render: v => v ? <Text style={{ color: '#7c3aed' }}>{v}</Text> : <Text type="secondary">—</Text> },
                    { title: 'Person', dataIndex: 'person', key: 'person' },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: v => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '—' },
                  ]}
                  pagination={{ pageSize: 10, size: 'small' }}
                />
              </Card>
            )
          },

          /* ── Tab 4: Live Staff Checking ── */
          {
            key: 'livecheck',
            label: (
              <Space>
                <AuditOutlined />
                Live Staff Checking
                {checkSession.some(i => i.physicalCount !== i.systemCount) && (
                  <Badge count={checkSession.filter(i => i.physicalCount !== i.systemCount).length} size="small" />
                )}
              </Space>
            ),
            children: (
              <div>
                {/* Info alert */}
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message="Live Stock Checking Instructions"
                  description="Compare physical inventory against system count. Use + / - buttons or enter the actual physical count. For any missing items, select whether the reason is Known or Unknown. Unknown shortages are auto-reported to Super Admin and Manager. Submit when all items are verified."
                  style={{ marginBottom: 16, borderRadius: 10 }}
                />

                {checkSubmitted && (
                  <Alert
                    type="success"
                    showIcon
                    message="Stock Check Submitted Successfully"
                    description="All discrepancies have been forwarded to the Approvals tab. Super Admin and Manager have been notified of any unknown shortages."
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    closable
                    onClose={() => setCheckSubmitted(false)}
                  />
                )}

                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Text strong style={{ color: textColor }}>Physical Count Entry</Text>
                      <Tag color="blue" style={{ borderRadius: 20 }}>Session: {dayjs().format('DD MMM YYYY')}</Tag>
                    </Space>
                    <Button
                      size="small"
                      onClick={() => setCheckSession(inventoryList.map(i => ({ key: i.key, code: i.code, name: i.name, unit: i.unit, systemCount: i.current, physicalCount: i.current, missingType: null, missingReason: '' })))}
                      style={{ borderColor: '#B11E6A44', color: '#B11E6A' }}
                    >
                      Reset All
                    </Button>
                  </div>

                  <Table
                    dataSource={checkSession}
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    columns={[
                      {
                        title: 'Code', dataIndex: 'code', width: 90,
                        render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text>
                      },
                      {
                        title: 'Item Name', dataIndex: 'name', width: 200,
                        render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text>
                      },
                      {
                        title: 'System Count', dataIndex: 'systemCount', width: 120, align: 'center',
                        render: (v, r) => <Text strong style={{ color: '#B11E6A' }}>{v} {r.unit}</Text>
                      },
                      {
                        title: 'Physical Count', width: 180, align: 'center',
                        render: (_, r) => (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Button
                              size="small" type="text"
                              icon={<MinusOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />}
                              onClick={() => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: Math.max(0, i.physicalCount - 1) } : i))}
                              style={{ border: '1px solid #ff4d4f33', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                            <InputNumber
                              value={r.physicalCount}
                              min={0}
                              onChange={v => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: v ?? 0, missingType: (v ?? 0) < i.systemCount ? i.missingType : null, missingReason: (v ?? 0) < i.systemCount ? i.missingReason : '' } : i))}
                              style={{ width: 72, textAlign: 'center' }}
                              size="small"
                              controls={false}
                            />
                            <Button
                              size="small" type="text"
                              icon={<PlusOutlined style={{ fontSize: 11, color: '#52c41a' }} />}
                              onClick={() => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: i.physicalCount + 1 } : i))}
                              style={{ border: '1px solid #52c41a33', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                          </div>
                        )
                      },
                      {
                        title: 'Difference', width: 110, align: 'center',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          return (
                            <Text strong style={{ color: diff < 0 ? '#ff4d4f' : diff > 0 ? '#fa8c16' : '#52c41a', fontSize: 13 }}>
                              {diff > 0 ? '+' : ''}{diff} {r.unit}
                            </Text>
                          );
                        }
                      },
                      {
                        title: 'Status', width: 100, align: 'center',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          if (diff === 0) return <Tag color="success" style={{ borderRadius: 12 }}>Match</Tag>;
                          if (diff < 0) return <Tag color="error" style={{ borderRadius: 12 }}>Missing</Tag>;
                          return <Tag color="warning" style={{ borderRadius: 12 }}>Extra</Tag>;
                        }
                      },
                      {
                        title: 'Missing Reason',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          if (diff >= 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                          return (
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                              <Select
                                placeholder="Select reason type"
                                value={r.missingType}
                                onChange={v => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, missingType: v, missingReason: '' } : i))}
                                style={{ width: 180 }}
                                size="small"
                              >
                                <Option value="known">Known Reason</Option>
                                <Option value="unknown">Unknown</Option>
                              </Select>

                              {r.missingType === 'known' && (
                                <Input.TextArea
                                  placeholder={`Enter reason for ${Math.abs(diff)} ${r.unit} missing...`}
                                  value={r.missingReason}
                                  onChange={e => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, missingReason: e.target.value } : i))}
                                  rows={2}
                                  size="small"
                                  style={{ width: 240, borderRadius: 6 }}
                                />
                              )}

                              {r.missingType === 'unknown' && (
                                <Alert
                                  type="warning"
                                  showIcon
                                  icon={<ExclamationCircleOutlined />}
                                  message={<Text strong style={{ fontSize: 12 }}>Unknown Shortage — Will be Reported</Text>}
                                  description={
                                    <Text style={{ fontSize: 11 }}>
                                      {Math.abs(diff)} {r.unit} of <strong>{r.name}</strong> is unaccounted for.
                                      This will be automatically reported to <strong>Super Admin</strong> and <strong>Manager</strong> upon submission.
                                    </Text>
                                  }
                                  style={{ borderRadius: 6, fontSize: 11 }}
                                />
                              )}
                            </Space>
                          );
                        }
                      },
                    ]}
                  />

                  {/* Summary footer */}
                  <div style={{ padding: '14px 16px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                      <Tag color="error" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount < i.systemCount).length} Missing
                      </Tag>
                      <Tag color="warning" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount > i.systemCount).length} Extra
                      </Tag>
                      <Tag color="success" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount === i.systemCount).length} Matched
                      </Tag>
                      {checkSession.some(i => i.physicalCount < i.systemCount && i.missingType === 'unknown') && (
                        <Tag color="orange" icon={<BellOutlined />} style={{ borderRadius: 20, fontSize: 12 }}>
                          {checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown').length} Unknown — Will Notify Management
                        </Tag>
                      )}
                    </Space>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', height: 40, paddingInline: 24, fontWeight: 700 }}
                      onClick={() => setCheckSubmitOpen(true)}
                      disabled={checkSession.every(i => i.physicalCount === i.systemCount)}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                </Card>
              </div>
            )
          },
        ]}
      />

      {/* ═══════════════════════════════════════
          ITEM DETAIL DRAWER (row click)
      ═══════════════════════════════════════ */}
      <Drawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        width={Math.min(480, window.innerWidth)}
        title={
          detailItem ? (
            <Space>
              <ContainerOutlined style={{ color: '#B11E6A' }} />
              <span style={{ fontWeight: 700, color: textColor }}>{detailItem.name}</span>
              <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600 }}>{detailItem.code}</Tag>
            </Space>
          ) : null
        }
        styles={{ body: { background: isDark ? '#13131f' : '#f4f5f9', padding: 16 } }}
      >
        {detailItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stock progress */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>Stock Level</Text>
              <Progress
                percent={Math.min(100, Math.round((detailItem.current / detailItem.max) * 100))}
                strokeColor={detailItem.status === 'OK' ? '#B11E6A' : detailItem.status === 'Low' ? '#C94F8A' : '#8a1652'}
                size="default"
              />
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Current</Text>
                  <Text strong style={{ fontSize: 20, color: '#B11E6A' }}>{detailItem.current}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{detailItem.unit}</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Min Required</Text>
                  <Text strong style={{ fontSize: 20, color: '#C94F8A' }}>{detailItem.min}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{detailItem.unit}</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Max</Text>
                  <Text strong style={{ fontSize: 20, color: textColor }}>{detailItem.max}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{detailItem.unit}</Text>
                </Col>
              </Row>
            </Card>

            {/* Details */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Item Details</Text>
              <Descriptions column={2} size="small" labelStyle={{ color: '#aaa', fontSize: 12 }} contentStyle={{ fontWeight: 600, fontSize: 13 }}>
                <Descriptions.Item label="Category">{detailItem.category}</Descriptions.Item>
                <Descriptions.Item label="Unit">{detailItem.unit}</Descriptions.Item>
                <Descriptions.Item label="Price">{detailItem.price}</Descriptions.Item>
                <Descriptions.Item label="Default Size">{detailItem.defaultSize || '—'}</Descriptions.Item>
                <Descriptions.Item label="Last Purchase">{detailItem.purchasedDate || '—'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag style={{ borderRadius: 20, fontWeight: 500, background: detailItem.status === 'OK' ? '#B11E6A22' : detailItem.status === 'Low' ? '#C94F8A22' : '#8a165222', color: detailItem.status === 'OK' ? '#B11E6A' : detailItem.status === 'Low' ? '#C94F8A' : '#8a1652', border: 'none' }}>
                    {detailItem.status === 'Out' ? 'Out of Stock' : detailItem.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Suppliers */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Suppliers / Stock Sources</Text>
              {(detailItem.sellers || []).length === 0 && <Text type="secondary" style={{ fontSize: 13 }}>No suppliers linked</Text>}
              {(detailItem.sellers || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: isDark ? '#2a2a3e' : '#f8f8fc', borderRadius: 8, marginBottom: 6 }}>
                  <Text style={{ fontWeight: 600, fontSize: 13, color: textColor }}>{s.name || s}</Text>
                  <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{s.stock ?? 0} {detailItem.unit}</Tag>
                </div>
              ))}
            </Card>

            {/* Recent history for this item */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Recent Stock History</Text>
              {stockHistory.filter(h => h.item === detailItem.name).slice(0, 4).length === 0 && (
                <Text type="secondary" style={{ fontSize: 13 }}>No history yet</Text>
              )}
              {stockHistory.filter(h => h.item === detailItem.name).slice(0, 4).map(h => (
                <div key={h.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <Space>
                    <Tag color={h.action === 'Stock Added' ? 'success' : 'error'} style={{ borderRadius: 12, fontSize: 11 }}>{h.action}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>{h.date}</Text>
                  </Space>
                  <Text strong style={{ color: h.action === 'Stock Added' ? '#52c41a' : '#ff4d4f', fontSize: 13 }}>
                    {h.action === 'Stock Added' ? '+' : '-'}{h.qty} {h.unit}
                  </Text>
                </div>
              ))}
            </Card>

            {/* Quick actions */}
            <Row gutter={10}>
              <Col span={12}>
                <Button block icon={<DownloadOutlined />} type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', height: 42, borderRadius: 10, fontWeight: 700 }} onClick={() => { setDetailItem(null); openReceive(detailItem); }}>
                  Add Stock
                </Button>
              </Col>
              <Col span={12}>
                <Button block icon={<ShoppingOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A', height: 42, borderRadius: 10, fontWeight: 700 }} onClick={() => { setDetailItem(null); openIssue(detailItem); }}>
                  Sell Stock
                </Button>
              </Col>
            </Row>
          </div>
        )}
      </Drawer>

      {/* ═══════════════════════════════════════
          SUBMIT STOCK CHECK CONFIRMATION MODAL
      ═══════════════════════════════════════ */}
      <Modal
        open={checkSubmitOpen}
        onCancel={() => setCheckSubmitOpen(false)}
        title={
          <Space>
            <AuditOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>Confirm Stock Check Submission</span>
          </Space>
        }
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setCheckSubmitOpen(false)}>Cancel</Button>
            <Button type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }} onClick={handleSubmitCheck}>
              Confirm & Submit
            </Button>
          </div>
        }
        width={500}
        centered
      >
        <div style={{ marginTop: 8 }}>
          <div style={{ background: '#B11E6A10', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <Row gutter={16}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Total Items</Text>
                <Text strong style={{ fontSize: 22, color: textColor }}>{checkSession.length}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Discrepancies</Text>
                <Text strong style={{ fontSize: 22, color: '#ff4d4f' }}>{checkSession.filter(i => i.physicalCount !== i.systemCount).length}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Unknown</Text>
                <Text strong style={{ fontSize: 22, color: '#fa8c16' }}>{checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown').length}</Text>
              </Col>
            </Row>
          </div>

          {checkSession.filter(i => i.physicalCount !== i.systemCount).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 8 }}>Items with Discrepancies:</Text>
              {checkSession.filter(i => i.physicalCount !== i.systemCount).map(item => {
                const diff = item.physicalCount - item.systemCount;
                return (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: isDark ? '#2a2a3e' : '#f8f8fc', borderRadius: 8, marginBottom: 6 }}>
                    <Space>
                      <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                      {item.missingType === 'unknown' && <Tag color="warning" style={{ borderRadius: 20, fontSize: 11 }}>Unknown</Tag>}
                      {item.missingType === 'known' && <Tag color="blue" style={{ borderRadius: 20, fontSize: 11 }}>Known</Tag>}
                    </Space>
                    <Text strong style={{ color: diff < 0 ? '#ff4d4f' : '#fa8c16', fontSize: 13 }}>
                      {diff > 0 ? '+' : ''}{diff} {item.unit}
                    </Text>
                  </div>
                );
              })}
            </div>
          )}

          {checkSession.some(i => i.physicalCount < i.systemCount && i.missingType === 'unknown') && (
            <Alert
              type="warning"
              showIcon
              icon={<BellOutlined />}
              message="Management will be notified"
              description="Unknown shortages will trigger automatic notifications to Super Admin and Manager."
              style={{ borderRadius: 8 }}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 13, color: '#aaa', display: 'block', marginBottom: 6 }}>Additional Notes (optional)</Text>
            <Input.TextArea
              value={checkNotes}
              onChange={e => setCheckNotes(e.target.value)}
              placeholder="Any additional notes about this stock check session..."
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════
          MANUAL ADJUSTMENT MODAL (+ / - buttons)
      ═══════════════════════════════════════ */}
      <Modal
        title={
          <Space>
            {adjustModal.type === 'Addition'
              ? <PlusOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              : <MinusOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {adjustModal.type === 'Addition' ? 'Add Stock' : 'Reduce Stock'}
              {adjustModal.item ? ` — ${adjustModal.item.name}` : ''}
            </span>
          </Space>
        }
        open={adjustModal.open}
        onCancel={() => { setAdjustModal({ open: false, item: null, type: null }); adjustForm.resetFields(); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAdjustModal({ open: false, item: null, type: null }); adjustForm.resetFields(); }}>Cancel</Button>
            <Button
              type="primary"
              style={{ background: adjustModal.type === 'Addition' ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : 'linear-gradient(135deg,#8a1652,#B11E6A)', border: 'none' }}
              onClick={async () => {
                try {
                  const vals = await adjustForm.validateFields();
                  if (adjustModal.type === 'Addition') {
                    await addStockRequest({ id: adjustModal.item.key, qty: vals.count, reason: vals.notes || 'Manual adjustment' }).unwrap();
                  } else {
                    await sellStockRequest({ id: adjustModal.item.key, qty: vals.count, reason: vals.notes || 'Manual adjustment' }).unwrap();
                  }
                  message.success('Adjustment request submitted for approval');
                  setAdjustModal({ open: false, item: null, type: null });
                  adjustForm.resetFields();
                } catch {
                  message.error('Failed to submit adjustment');
                }
              }}
            >
              OK
            </Button>
          </div>
        }
        width={420} centered
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={adjustForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label={<Text style={{ fontWeight: 600 }}>{adjustModal.type === 'Addition' ? 'Add Count' : 'Minus Count'}</Text>}
            name="count"
            rules={[{ required: true, message: 'Enter count' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
            style={{ marginBottom: 16 }}
          >
            <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} placeholder={`Enter quantity to ${adjustModal.type === 'Addition' ? 'add' : 'reduce'}`} addonAfter={adjustModal.item?.unit} />
          </Form.Item>
          <Form.Item label={<Text style={{ fontWeight: 600 }}>Notes / Description</Text>} name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="Reason for this adjustment..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          ADD ITEM MODAL
      ═══════════════════════════════════════ */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>Add Inventory Item</span>}
        open={addItemModal}
        onCancel={() => { setAddItemModal(false); addItemForm.resetFields(); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAddItemModal(false); addItemForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleSaveItem} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Item</Button>
          </div>
        }
        width={Math.min(560, window.innerWidth - 24)} centered
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={addItemForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item label="Item Name" name="name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Category" name="category">
                <Select placeholder="Select category"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input placeholder="New category..." value={newCategoryName} onChange={onCategoryChange} onKeyDown={(e) => e.stopPropagation()} style={{ borderRadius: 6 }} />
                        <Button type="text" icon={<PlusOutlined />} onClick={addCategory} style={{ color: '#B11E6A', fontWeight: 600 }}>Add</Button>
                      </Space>
                    </>
                  )}
                  options={categories.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Value" name="value">
                <Input prefix="₹" addonAfter={<Form.Item name="unit" noStyle><Select style={{ width: 80 }} placeholder="Unit"><Option value="Kg">Kg</Option><Option value="Ltr">Ltr</Option><Option value="Pcs">Pcs</Option><Option value="ml">ml</Option><Option value="gram">gram</Option></Select></Form.Item>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Default Size" name="default_size" tooltip="e.g. 2.5cm x 2.5cm">
                <Input placeholder="e.g. 2.5cm x 2.5cm" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}><Form.Item label="Opening Stock" name="current"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item label="Min Stock" name="min"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Purchase Price" name="purchase_price">
                <Input prefix="₹" addonAfter={<Form.Item name="purchase_price_tax" noStyle initialValue="without_gst"><Select style={{ width: 120 }}><Option value="with_gst">With GST</Option><Option value="without_gst">Without GST</Option></Select></Form.Item>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Selling Price" name="selling_price">
                <Input prefix="₹" addonAfter={<Form.Item name="selling_price_tax" noStyle initialValue="without_gst"><Select style={{ width: 120 }}><Option value="with_gst">With GST</Option><Option value="without_gst">Without GST</Option></Select></Form.Item>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}><Form.Item label="GST" name="gst"><Select defaultValue="None"><Option value="None">None</Option><Option value="5%">5%</Option><Option value="12%">12%</Option><Option value="18%">18%</Option><Option value="28%">28%</Option></Select></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item label="HSN" name="hsn"><Input placeholder="Ex: 6704" /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item label="Discount on Sales Price" name="discount"><Input suffix="%" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          ADD STOCK DRAWER (Receive Goods)
      ═══════════════════════════════════════ */}
      <Drawer
        open={receiveOpen}
        onClose={() => { setReceiveOpen(false); setSelectedSupplier(null); setShowAddSupplier(false); receiveForm.resetFields(); supplierForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button type="primary" block style={saveBtn('linear-gradient(135deg,#B11E6A,#D85C9E)')}
            onClick={async () => {
              try {
                const vals = receiveForm.getFieldsValue();
                await addStockRequest({ id: activeItem.key, qty: Number(vals.qty) || 0, vendorName: selectedSupplier?.name || '', reason: vals.comment || '' }).unwrap();
                message.success(`Stock addition request for ${activeItem.name} sent for approval`);
                setReceiveOpen(false);
                setSelectedSupplier(null);
                setShowAddSupplier(false);
                receiveForm.resetFields();
              } catch {
                message.error('Failed to submit stock request');
              }
            }}
          >
            REQUEST APPROVAL FOR ADD STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setReceiveOpen(false)} style={{ color: '#B11E6A', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Add Stock</Text>
            {activeItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Receive Goods</Text>}
          </div>
          {activeItem && <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>{activeItem.code}</Tag>}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeItem && (
            <div style={sectionCard}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DownloadOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{activeItem.name}</Text>
                  <Space size={6} style={{ flexWrap: 'wrap' }}>
                    <Tag style={{ borderRadius: 20, fontSize: 11, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', margin: 0 }}>{activeItem.category}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Current: <strong style={{ color: activeItem.status === 'OK' ? '#B11E6A' : '#C94F8A' }}>{activeItem.current} {activeItem.unit}</strong></Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Min: {activeItem.min} {activeItem.unit}</Text>
                  </Space>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <Progress percent={Math.min(100, Math.round((activeItem.current / activeItem.max) * 100))} size="small" strokeColor={activeItem.status === 'OK' ? '#B11E6A' : '#C94F8A'} showInfo={false} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeItem.max} {activeItem.unit}</Text>
                </div>
              </div>
            </div>
          )}

          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={receiveForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="qty" rules={[{ required: true, message: 'Enter quantity' }]} style={{ marginBottom: 12 }}>
                      <Input type="number" min={0} placeholder="0" suffix={<Space size={4}><Text style={{ color: '#aaa', fontSize: 12 }}>{activeItem?.unit}</Text><CalculatorOutlined style={{ color: '#B11E6A' }} /></Space>} style={{ borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Supply Price</Text>} name="supply_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Arrival Date</Text>} name="date" style={{ marginBottom: 12 }}>
                      <DatePicker style={{ width: '100%', borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Comment</Text>} name="comment" style={{ marginBottom: 12 }}>
                  <Input.TextArea rows={2} placeholder="Optional note..." style={{ borderRadius: 8 }} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Upload Invoice</Text>} name="invoice" style={{ marginBottom: 0 }}>
                      <Upload maxCount={1} beforeUpload={() => false}>
                        <Button icon={<UploadOutlined />} style={{ width: '100%', borderRadius: 8 }}>Invoice File</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Payment Status</Text>} name="is_paid" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" defaultChecked />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
          </div>

          {renderEntitySelector({
            label: 'Supplier',
            icon: <UserOutlined style={{ color: '#B11E6A' }} />,
            search: supplierSearch,
            setSearch: setSupplierSearch,
            filtered: filteredSuppliers,
            selected: selectedSupplier,
            setSelected: setSelectedSupplier,
            showAdd: showAddSupplier,
            setShowAdd: setShowAddSupplier,
            addForm: supplierForm,
            gradient: 'linear-gradient(135deg,#B11E6A,#D85C9E)',
            onSave: handleSaveSupplier,
            addFormFields: (
              <>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="sup_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}><Input placeholder="Supplier name" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="sup_phone" style={{ marginBottom: 10 }}><Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="sup_email" style={{ marginBottom: 10 }}><Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="sup_tax" style={{ marginBottom: 10 }}><Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="sup_address" style={{ marginBottom: 10 }}><Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="sup_bank" style={{ marginBottom: 10 }}><Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="sup_notes" style={{ marginBottom: 10 }}><Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} /></Form.Item>
              </>
            ),
          })}
        </div>
      </Drawer>

      {/* ═══════════════════════════════════════
          SELL STOCK DRAWER (Issue Goods)
      ═══════════════════════════════════════ */}
      <Drawer
        open={issueOpen}
        onClose={() => { setIssueOpen(false); setSelectedVendor(null); setShowAddVendor(false); issueForm.resetFields(); vendorForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button type="primary" block style={saveBtn('linear-gradient(135deg,#8a1652,#B11E6A)')}
            onClick={async () => {
              try {
                const vals = issueForm.getFieldsValue();
                await sellStockRequest({ id: activeIssueItem.key, qty: Number(vals.qty) || 0, vendorName: selectedVendor?.name || '', reason: vals.comment || '' }).unwrap();
                message.success(`Stock deduction request for ${activeIssueItem.name} sent for approval`);
                setIssueOpen(false);
                setSelectedVendor(null);
                setShowAddVendor(false);
                issueForm.resetFields();
              } catch {
                message.error('Failed to submit stock request');
              }
            }}
          >
            REQUEST APPROVAL FOR SELL STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setIssueOpen(false)} style={{ color: '#8a1652', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Sell Stock</Text>
            {activeIssueItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Issue Goods</Text>}
          </div>
          {activeIssueItem && <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165244', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>{activeIssueItem.code}</Tag>}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeIssueItem && (
            <div style={sectionCard}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#8a1652,#B11E6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{activeIssueItem.name}</Text>
                  <Space size={6} style={{ flexWrap: 'wrap' }}>
                    <Tag style={{ borderRadius: 20, fontSize: 11, background: '#8a165222', color: '#8a1652', border: '1px solid #8a165244', margin: 0 }}>{activeIssueItem.category}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Available: <strong style={{ color: activeIssueItem.current === 0 ? '#ff4d4f' : '#8a1652' }}>{activeIssueItem.current} {activeIssueItem.unit}</strong></Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Price: {activeIssueItem.price}</Text>
                  </Space>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <Progress percent={Math.min(100, Math.round((activeIssueItem.current / activeIssueItem.max) * 100))} size="small" strokeColor={activeIssueItem.status === 'OK' ? '#8a1652' : '#C94F8A'} showInfo={false} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeIssueItem.max} {activeIssueItem.unit}</Text>
                </div>
              </div>
            </div>
          )}

          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#8a1652' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={issueForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="qty" rules={[{ required: true, message: 'Enter quantity' }]} style={{ marginBottom: 12 }}>
                      <Input type="number" min={0} placeholder="0" suffix={<Space size={4}><Text style={{ color: '#aaa', fontSize: 12 }}>{activeIssueItem?.unit}</Text><CalculatorOutlined style={{ color: '#8a1652' }} /></Space>} style={{ borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Sell Price</Text>} name="sell_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Departure Date</Text>} name="date" style={{ marginBottom: 12 }}>
                      <DatePicker style={{ width: '100%', borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Comment</Text>} name="comment" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} placeholder="Optional note..." style={{ borderRadius: 8 }} />
                </Form.Item>
              </Form>
            </div>
          </div>

          {renderEntitySelector({
            label: 'Vendor',
            icon: <UserOutlined style={{ color: '#8a1652' }} />,
            search: vendorSearch,
            setSearch: setVendorSearch,
            filtered: filteredVendors,
            selected: selectedVendor,
            setSelected: setSelectedVendor,
            showAdd: showAddVendor,
            setShowAdd: setShowAddVendor,
            addForm: vendorForm,
            gradient: 'linear-gradient(135deg,#8a1652,#B11E6A)',
            onSave: handleSaveVendor,
            addFormFields: (
              <>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="cust_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}><Input placeholder="Vendor name" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="cust_phone" style={{ marginBottom: 10 }}><Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="cust_email" style={{ marginBottom: 10 }}><Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="cust_tax" style={{ marginBottom: 10 }}><Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="cust_address" style={{ marginBottom: 10 }}><Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="cust_bank" style={{ marginBottom: 10 }}><Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="cust_notes" style={{ marginBottom: 10 }}><Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Discount (%)</Text>} name="cust_discount" style={{ marginBottom: 10 }}><InputNumber min={0} max={100} placeholder="0" style={{ width: '100%', borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
              </>
            ),
          })}
        </div>
      </Drawer>

    </div>
  );
}
