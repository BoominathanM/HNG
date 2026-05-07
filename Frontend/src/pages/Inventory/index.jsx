import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, Progress, Alert, InputNumber, List, message,
  Avatar, Divider, Drawer, Tabs, DatePicker, Upload, Switch, Descriptions
} from 'antd';
import {
  PlusOutlined, WarningOutlined, CalculatorOutlined, SearchOutlined, CheckOutlined,
  DownloadOutlined, ShoppingOutlined, LeftOutlined, CloseOutlined,
  UserOutlined, InfoCircleOutlined, MinusOutlined, FileTextOutlined,
  TeamOutlined, ContactsOutlined, EyeOutlined, EditOutlined, UploadOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const inventory = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', category: 'Raw Material', unit: 'Kg', current: 450, min: 100, max: 1000, price: '₹85/Kg', status: 'OK', seller: 'ChemCo India', purchasedDate: '2024-01-15' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', category: 'Raw Material', unit: 'Kg', current: 45, min: 100, max: 500, price: '₹95/Kg', status: 'Low', seller: 'BioLife Ltd', purchasedDate: '2024-01-10' },
  { key: 3, code: 'PK-001', name: 'Shampoo Bottles (Flip 30ml)', category: 'Packaging', unit: 'Pcs', current: 200, min: 500, max: 5000, price: '₹4.5/Pc', status: 'Low', seller: 'PlastiPack', purchasedDate: '2024-01-05' },
  { key: 4, code: 'PK-002', name: 'Dental Kit Boxes', category: 'Packaging', unit: 'Pcs', current: 850, min: 200, max: 2000, price: '₹12/Pc', status: 'OK', seller: 'BoxWorld', purchasedDate: '2024-01-12' },
  { key: 5, code: 'ST-001', name: 'Custom Stickers (Hotel Brand)', category: 'Sticker', unit: 'Pcs', current: 3000, min: 500, max: 10000, price: '₹1.2/Pc', status: 'OK', seller: 'PrintFast', purchasedDate: '2024-01-18' },
  { key: 6, code: 'RM-003', name: 'Shampoo Concentrate', category: 'Raw Material', unit: 'Ltr', current: 0, min: 50, max: 500, price: '₹220/Ltr', status: 'Out', seller: 'ChemCo India', purchasedDate: '2023-12-20' },
];

const stockChartData = inventory.map((i) => ({
  name: i.name.split(' ').slice(0, 2).join(' '),
  current: i.current,
  min: i.min,
}));

const suppliersList = [
  { id: 1, name: 'ChemCo India', phone: '+91 98765 43210', email: 'info@chemco.in', address: 'Mumbai, MH' },
  { id: 2, name: 'BioLife Ltd', phone: '+91 87654 32109', email: 'contact@biolife.in', address: 'Chennai, TN' },
  { id: 3, name: 'PlastiPack', phone: '+91 76543 21098', email: 'sales@plastipack.com', address: 'Delhi, DL' },
  { id: 4, name: 'BoxWorld', phone: '+91 65432 10987', email: 'info@boxworld.in', address: 'Bengaluru, KA' },
];

const vendorsList = [
  { id: 1, name: 'Marriott Mumbai', phone: '+91 22 6651 1234', email: 'purchase@marriott.in', address: 'Mumbai, MH', whatsapp: '912266511234' },
  { id: 2, name: 'Taj Hotels Delhi', phone: '+91 11 6600 7777', email: 'orders@tajhotels.in', address: 'Delhi, DL', whatsapp: '911166007777' },
  { id: 3, name: 'ITC Grand Kolkata', phone: '+91 33 2288 9999', email: 'supply@itchotels.in', address: 'Kolkata, WB', whatsapp: '913322889999' },
  { id: 4, name: 'Hyatt Chennai', phone: '+91 44 6150 1234', email: 'procurement@hyatt.in', address: 'Chennai, TN', whatsapp: '914461501234' },
];

export default function Inventory() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#16161e' : '#fafafa';

  const [suppliers, setSuppliers] = useState(suppliersList);
  const [vendors, setVendors] = useState(vendorsList);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [purchaseForm] = Form.useForm();
  const [viewBillDetail, setViewBillDetail] = useState(null);

  /* ── Add Item modal (no sub-modals, keep as modal) ── */
  const [addItemModal, setAddItemModal] = useState(false);
  const [addItemForm] = Form.useForm();

  /* ── Receive Goods (Add Stock) drawer ── */
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [activeItem, setActiveItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm] = Form.useForm();

  /* ── Issue Goods (Sell Stock) drawer ── */
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm] = Form.useForm();
  const [activeIssueItem, setActiveIssueItem] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorForm] = Form.useForm();

  const [categories, setCategories] = useState(['Chemicals', 'Ready Stock']);
  const [newCategoryName, setNewCategoryName] = useState('');

  const onCategoryChange = (event) => {
    setNewCategoryName(event.target.value);
  };

  const addCategory = (e) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const lowStock = inventory.filter((i) => i.status === 'Low' || i.status === 'Out');

  const [supplierFilter, setSupplierFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [supplierDateRange, setSupplierDateRange] = useState(null);
  const [vendorDateRange, setVendorDateRange] = useState(null);

  const filteredSuppliers = suppliersList.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.phone.includes(supplierSearch)
  );
  const filteredVendors = vendorsList.filter((c) =>
    c.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    c.phone.includes(vendorSearch)
  );

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

  const handleSaveSupplier = () => {
    const vals = supplierForm.getFieldsValue();
    const newSupplier = {
      id: Date.now(),
      name: vals.sup_name || 'New Supplier',
      phone: vals.sup_phone || '',
      email: vals.sup_email || '',
      address: vals.sup_address || '',
    };
    setSuppliers([...suppliers, newSupplier]);
    setSelectedSupplier(newSupplier);
    supplierForm.resetFields();
    setShowAddSupplier(false);
    setShowAddSupplierModal(false);
  };

  const handleSaveVendor = () => {
    const vals = vendorForm.getFieldsValue();
    const newVendor = {
      id: Date.now(),
      name: vals.cust_name || 'New Vendor',
      phone: vals.cust_phone || '',
      email: vals.cust_email || '',
      address: vals.cust_address || '',
    };
    setVendors([...vendors, newVendor]);
    setSelectedVendor(newVendor);
    vendorForm.resetFields();
    setShowAddVendor(false);
    setShowAddVendorModal(false);
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

  /* ── Reusable: inline entity selector (supplier or customer) ── */
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
        {/* Selected entity card */}
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: `${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}15`, border: `1.5px solid ${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}44` }}>
            <Avatar style={{ background: gradient, flexShrink: 0 }}>{selected.name[0]}</Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{selected.name}</Text>
              <Text style={{ fontSize: 12, color: '#aaa' }}>{[selected.phone, selected.address].filter(Boolean).join(' · ')}</Text>
            </div>
            <Button
              type="text" size="small" icon={<CloseOutlined />}
              onClick={() => { setSelected(null); setSearch(''); setShowAdd(false); }}
              style={{ color: '#aaa' }}
            />
          </div>
        ) : (
          <>
            {/* Search */}
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder={`Search ${label.toLowerCase()} by name or phone...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowAdd(false); }}
              style={{ borderRadius: 24, height: 42, background: isDark ? '#2a2a3a' : '#f5f5f5', border: 'none' }}
              allowClear
            />

            {/* Results list */}
            {!showAdd && (
              <div style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 && (
                  <div style={{ padding: '14px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No results found</div>
                )}
                {filtered.map((item) => {
                  const isSel = selected?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setSelected(item); setSearch(''); }}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', gap: 10, transition: 'background 0.1s', background: isSel ? '#B11E6A08' : 'transparent' }}
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

            {/* Add new toggle */}
            {!showAdd && (
              <Button
                icon={<PlusOutlined />}
                onClick={() => { setShowAdd(true); addForm.resetFields(); }}
                style={{ marginTop: 10, width: '100%', borderColor: '#B11E6A66', color: '#B11E6A', borderRadius: 8, height: 40, fontWeight: 600, borderStyle: 'dashed' }}
              >
                Add New {label}
              </Button>
            )}
          </>
        )}

        {/* Inline add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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
                <Button
                  type="primary" onClick={onSave}
                  style={{ flex: 2, height: 40, borderRadius: 8, background: gradient, border: 'none', fontWeight: 700 }}
                >
                  Save {label}
                </Button>
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
          <Progress percent={Math.min(100, Math.round((r.current / r.max) * 100))} size="small"
            strokeColor={r.status === 'OK' ? '#B11E6A' : r.status === 'Low' ? '#C94F8A' : '#8a1652'} showInfo={false} />
          <Text style={{ fontSize: 11, color: '#999' }}>{(r.current ?? 0).toLocaleString()} / {(r.max ?? 0).toLocaleString()} {r.unit}</Text>
        </div>
      ),
    },
    { title: 'Min Req', dataIndex: 'min', responsive: ['lg'], render: (v, r) => `${v} ${r.unit}` },
    {
      title: 'Low Stock Alert', key: 'alert',
      render: (_, r) => r.current <= r.min ? (
        <Tag icon={<WarningOutlined />} color="error" style={{ borderRadius: 12 }}>Low Stock</Tag>
      ) : (
        <Tag color="success" style={{ borderRadius: 12 }}>Healthy</Tag>
      )
    },
    { title: 'Price', dataIndex: 'price', responsive: ['md'] },
    { title: 'Vendor', dataIndex: 'seller', responsive: ['lg'] },
    { title: 'Purchased', dataIndex: 'purchasedDate', responsive: ['lg'] },
    {
      title: 'Status', dataIndex: 'status',
      render: (v) => (
        <Tag style={{
          borderRadius: 20, fontWeight: 500,
          background: v === 'OK' ? '#B11E6A22' : v === 'Low' ? '#C94F8A22' : '#8a165222',
          color: v === 'OK' ? '#B11E6A' : v === 'Low' ? '#C94F8A' : '#8a1652',
          border: `1px solid ${v === 'OK' ? '#B11E6A44' : v === 'Low' ? '#C94F8A44' : '#8a165244'}`,
        }}>
          {v === 'Out' ? 'Out of Stock' : v}
        </Tag>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4} wrap>
          <div style={{ display: 'flex', alignItems: 'center', background: isDark ? '#2a2a3e' : '#f0f0f0', borderRadius: 6, padding: '2px', border: `1px solid ${borderColor}` }}>
            <Button size="small" type="text" icon={<MinusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); message.info('Manual decrement'); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            <Text strong style={{ fontSize: 11, minWidth: 28, textAlign: 'center', color: textColor }}>{r.current}</Text>
            <Button size="small" type="text" icon={<PlusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); message.info('Manual increment'); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>
          <Button
            size="small" type="primary"
            icon={<DownloadOutlined />}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }}
            onClick={() => openReceive(r)}
          >
            Add Stock
          </Button>
          <Button
            size="small"
            icon={<ShoppingOutlined />}
            style={{ borderColor: '#B11E6A', color: '#B11E6A', fontSize: 11 }}
            onClick={() => openIssue(r)}
          >
            Sell Stock
          </Button>
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
          { label: 'Total Items', val: inventory.length, color: '#B11E6A' },
          { label: 'OK Stock', val: inventory.filter((i) => i.status === 'OK').length, color: '#8a1652' },
          { label: 'Low Stock', val: inventory.filter((i) => i.status === 'Low').length, color: '#C94F8A' },
          { label: 'Out of Stock', val: inventory.filter((i) => i.status === 'Out').length, color: '#D85C9E' },
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
              <BarChart data={stockChartData} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <Tooltip />
                <Bar dataKey="current" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Current Stock" />
                <Bar dataKey="min" fill="#D85C9E" radius={[4, 4, 0, 0]} name="Min Required" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Inventory Tabs */}
      <Tabs defaultActiveKey="stock" style={{ marginBottom: 20 }}
        items={[
          {
            key: 'stock',
            label: <Space><ShoppingOutlined />Stock Inventory</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div className="table-responsive" style={{ padding: '4px' }}>
                  <Table dataSource={inventory} columns={columns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
                </div>
              </Card>
            )
          },
          {
            key: 'suppliers',
            label: <Space><TeamOutlined />Suppliers</Space>,
            children: (
              <div className="fade-in">
                {viewSupplier ? (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <Button icon={<LeftOutlined />} onClick={() => setViewSupplier(null)}>Back to Suppliers</Button>
                      <Title level={4} style={{ margin: 0, color: '#B11E6A' }}>{viewSupplier.name} - Purchase History</Title>
                    </div>
                    <Table
                      size="small"
                      dataSource={[
                        {
                          key: 1,
                          date: '2024-05-01',
                          bill_no: 'BILL-1001',
                          inv_no: 'INV-A101',
                          items: [
                            { name: 'Soap Base (White)', qty: '100 Kg', price: '₹85/Kg', total: '₹8,500' },
                            { name: 'Glycerin', qty: '10 Kg', price: '₹120/Kg', total: '₹1,200' }
                          ],
                          status: 'Received'
                        },
                        {
                          key: 2,
                          date: '2024-04-15',
                          bill_no: 'BILL-982',
                          inv_no: 'INV-B452',
                          items: [
                            { name: 'Shampoo Concentrate', qty: '50 Ltr', price: '₹220/Ltr', total: '₹11,000' }
                          ],
                          status: 'Received'
                        },
                      ]}
                      columns={[
                        { title: 'Date', dataIndex: 'date', key: 'date' },
                        { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no', render: v => <Text strong>{v}</Text> },
                        { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                        {
                          title: 'Materials & Quantities',
                          key: 'items',
                          render: (_, record) => (
                            <List
                              size="small"
                              dataSource={record.items}
                              renderItem={item => (
                                <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                  <Space split={<Divider type="vertical" />}>
                                    <Text strong>{item.name}</Text>
                                    <Text>{item.qty}</Text>
                                    <Text type="secondary">{item.price}</Text>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          )
                        },
                        {
                          title: 'Total Amount',
                          key: 'total',
                          render: (_, r) => {
                            const total = r.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[₹,]/g, '')), 0);
                            return <Text strong>₹{total.toLocaleString()}</Text>;
                          }
                        },
                        { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color="green">{v}</Tag> },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, record) => (
                            <Button
                              size="small"
                              type="primary"
                              icon={<FileTextOutlined />}
                              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }}
                              onClick={() => setViewBillDetail(record)}
                            >
                              AI Details
                            </Button>
                          )
                        },
                      ]}
                    />
                  </Card>
                ) : (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <Title level={5} style={{ margin: 0 }}>Supplier Management</Title>
                      <Space wrap>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search supplier..."
                          value={supplierSearch}
                          onChange={e => setSupplierSearch(e.target.value)}
                          style={{ width: 200 }}
                        />
                        <DatePicker.RangePicker
                          value={supplierDateRange}
                          onChange={setSupplierDateRange}
                          style={{ width: 260 }}
                        />
                        <Select value={supplierFilter} onChange={setSupplierFilter} style={{ width: 140 }}>
                          <Option value="all">All Time</Option>
                          <Option value="this_week">This Week</Option>
                          <Option value="this_month">This Month</Option>
                          <Option value="last_3_months">Last 3 Months</Option>
                          <Option value="last_6_months">Last 6 Months</Option>
                          <Option value="last_year">Last Year</Option>
                        </Select>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddSupplierModal(true)} style={{ background: '#B11E6A', border: 'none' }}>Add Supplier</Button>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      dataSource={filteredSuppliers}
                      columns={[
                        { title: 'Supplier Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
                        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                        { title: 'Email', dataIndex: 'email', key: 'email' },
                        { title: 'Address', dataIndex: 'address', key: 'address' },
                        {
                          title: 'Action', key: 'action',
                          render: (_, r) => (
                            <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setViewSupplier(r)} style={{ color: '#B11E6A' }}>View History</Button>
                          )
                        }
                      ]}
                    />
                  </Card>
                )}
              </div>
            )
          },
          {
            key: 'vendors',
            label: <Space><ContactsOutlined />Vendors</Space>,
            children: (
              <div className="fade-in">
                {viewVendor ? (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <Button icon={<LeftOutlined />} onClick={() => setViewVendor(null)}>Back to Vendors</Button>
                      <Title level={4} style={{ margin: 0, color: '#B11E6A' }}>{viewVendor.name} - Detailed History</Title>
                    </div>
                    <Table
                      size="small"
                      dataSource={[
                        {
                          key: 1,
                          date: '2024-05-02',
                          bill_no: 'SAL-2001',
                          inv_no: 'INV-X99',
                          items: [
                            { name: 'Dental Kit Boxes', qty: '50 Pcs', price: '₹15/Pc', total: '₹750' },
                            { name: 'Soap Bars', qty: '20 Pcs', price: '₹10/Pc', total: '₹200' }
                          ],
                          status: 'Dispatched'
                        },
                        {
                          key: 2,
                          date: '2024-04-20',
                          bill_no: 'SAL-1980',
                          inv_no: 'INV-X85',
                          items: [
                            { name: 'Custom Stickers', qty: '1000 Pcs', price: '₹2/Pc', total: '₹2,000' }
                          ],
                          status: 'Delivered'
                        },
                      ]}
                      columns={[
                        { title: 'Date', dataIndex: 'date', key: 'date' },
                        { title: 'Bill No', dataIndex: 'bill_no', key: 'bill_no', render: v => <Text strong>{v}</Text> },
                        { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                        {
                          title: 'Products & Quantities',
                          key: 'items',
                          render: (_, record) => (
                            <List
                              size="small"
                              dataSource={record.items}
                              renderItem={item => (
                                <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                  <Space split={<Divider type="vertical" />}>
                                    <Text strong>{item.name}</Text>
                                    <Text>{item.qty}</Text>
                                    <Text type="secondary">{item.price}</Text>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          )
                        },
                        {
                          title: 'Total Amount',
                          key: 'total',
                          render: (_, r) => {
                            const total = r.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[₹,]/g, '')), 0);
                            return <Text strong>₹{total.toLocaleString()}</Text>;
                          }
                        },
                        { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color="blue">{v}</Tag> },
                        {
                          title: 'Actions',
                          key: 'actions',
                          render: (_, record) => (
                            <Button
                              size="small"
                              type="primary"
                              icon={<FileTextOutlined />}
                              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }}
                              onClick={() => setViewBillDetail(record)}
                            >
                              AI Details
                            </Button>
                          )
                        },
                      ]}
                    />
                  </Card>
                ) : (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <Title level={5} style={{ margin: 0 }}>Vendor Management</Title>
                      <Space wrap>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search vendor..."
                          value={vendorSearch}
                          onChange={e => setVendorSearch(e.target.value)}
                          style={{ width: 200 }}
                        />
                        <DatePicker.RangePicker
                          value={vendorDateRange}
                          onChange={setVendorDateRange}
                          style={{ width: 260 }}
                        />
                        <Select value={vendorFilter} onChange={setVendorFilter} style={{ width: 140 }}>
                          <Option value="all">All Time</Option>
                          <Option value="this_week">This Week</Option>
                          <Option value="this_month">This Month</Option>
                          <Option value="last_3_months">Last 3 Months</Option>
                          <Option value="last_6_months">Last 6 Months</Option>
                          <Option value="last_year">Last Year</Option>
                        </Select>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddVendorModal(true)} style={{ background: '#B11E6A', border: 'none' }}>Add Vendor</Button>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      dataSource={filteredVendors}
                      columns={[
                        { title: 'Vendor Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
                        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
                        { title: 'Email', dataIndex: 'email', key: 'email' },
                        { title: 'Address', dataIndex: 'address', key: 'address' },
                        {
                          title: 'Action', key: 'action',
                          render: (_, r) => (
                            <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setViewVendor(r)} style={{ color: '#B11E6A' }}>View Details</Button>
                          )
                        }
                      ]}
                    />
                  </Card>
                )}
              </div>
            )
          },
          {
            key: 'purchases',
            label: <Space><DollarOutlined />Inventory Purchase</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                  <Title level={5} style={{ margin: 0 }}>Inventory Purchase Management</Title>
                  <Space>
                    <DatePicker.RangePicker style={{ width: 280 }} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddPurchaseModal(true)} style={{ background: '#B11E6A', border: 'none' }}>Add Purchase</Button>
                    <Button icon={<DownloadOutlined />}>Export</Button>
                  </Space>
                </div>
                <Table
                  size="small"
                  dataSource={[
                    { key: 1, date: '2024-05-01', item: 'Soap Base (White)', qty: '100 Kg', entity: 'ChemCo India', amount: '₹8,500', status: 'Paid', invoice: 'INV-101' },
                    { key: 4, date: '2024-05-04', item: 'Shampoo Concentrate', qty: '200 Ltr', entity: 'BioLife Ltd', amount: '₹44,000', status: 'Unpaid', invoice: 'INV-104' },
                  ]}
                  columns={[
                    { title: 'Purchase Date', dataIndex: 'date', key: 'date', render: (v) => <Text strong>{v}</Text> },
                    { title: 'Product', dataIndex: 'item', key: 'item' },
                    { title: 'Quantity', dataIndex: 'qty', key: 'qty' },
                    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                    { title: 'Supplier', dataIndex: 'entity', key: 'entity', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                    {
                      title: 'Payment', dataIndex: 'status', key: 'payment_status',
                      render: (v) => (
                        <Space size={4}>
                          <Switch size="small" checked={v === 'Paid'} onChange={() => message.success('Status updated')} />
                          <Tag color={v === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 12 }}>{v}</Tag>
                        </Space>
                      )
                    },
                    {
                      title: 'Invoice', dataIndex: 'invoice', key: 'invoice',
                      render: (v) => <Button type="link" size="small" icon={<FileTextOutlined />}>{v}</Button>
                    },
                    {
                      title: 'Actions', key: 'actions',
                      render: () => (
                        <Space>
                          <Button size="small" type="text" icon={<EyeOutlined />} />
                          <Button size="small" type="text" icon={<EditOutlined />} />
                          <Button size="small" type="text" icon={<UploadOutlined />} title="Upload Invoice" />
                        </Space>
                      )
                    },
                  ]}
                />
              </Card>
            )
          },
          {
            key: 'documents',
            label: <Space><FileTextOutlined />Stock Documents</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                  <Space>
                    <Select defaultValue="all" style={{ width: 180 }}>
                      <Option value="all">All Movements</Option>
                      <Option value="incoming">Incoming Stocks</Option>
                      <Option value="outgoing">Outgoing Stocks</Option>
                      <Option value="adjustment">Stock Taken (Adj)</Option>
                    </Select>
                    <DatePicker.RangePicker style={{ width: 280 }} />
                  </Space>
                  <Button icon={<DownloadOutlined />} type="primary" style={{ background: '#B11E6A', border: 'none' }}>Download Report</Button>
                </div>
                <Table
                  size="small"
                  dataSource={[
                    { key: 1, date: '2024-05-01', type: 'Incoming', item: 'Soap Base (White)', qty: '+100 Kg', entity: 'ChemCo India', person: 'Admin' },
                    { key: 2, date: '2024-05-02', type: 'Outgoing', item: 'Dental Kit Boxes', qty: '-50 Pcs', entity: 'Marriott Mumbai', person: 'Priya' },
                    { key: 3, date: '2024-05-03', type: 'Stock Taken', item: 'Shampoo Bottles', qty: '-2 Pcs', entity: 'Internal Audit', person: 'Admin' },
                    { key: 4, date: '2024-05-04', type: 'Incoming', item: 'Shampoo Concentrate', qty: '+200 Ltr', entity: 'BioLife Ltd', person: 'Admin' },
                  ]}
                  columns={[
                    { title: 'Arrival/Departure Date', dataIndex: 'date', key: 'date', render: (v) => <Text strong>{v}</Text> },
                    { title: 'Movement Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Incoming' ? 'success' : t === 'Outgoing' ? 'processing' : 'warning'} style={{ borderRadius: 12 }}>{t}</Tag> },
                    { title: 'Stock Item', dataIndex: 'item', key: 'item' },
                    { title: 'Quantity', dataIndex: 'qty', key: 'qty', render: (q) => <Text strong style={{ color: q.startsWith('+') ? '#52c41a' : '#ff4d4f' }}>{q}</Text> },
                    { title: 'Supplier / Customer Name', dataIndex: 'entity', key: 'entity', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                    { title: 'Handled By', dataIndex: 'person', key: 'person' },
                  ]}
                />
              </Card>
            )
          }
        ]}
      />

      {/* ═══════════════════════════════════════
          ADD ITEM MODAL (simple, no sub-modals)
      ═══════════════════════════════════════ */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>Add Inventory Item</span>}
        open={addItemModal}
        onCancel={() => { setAddItemModal(false); addItemForm.resetFields(); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAddItemModal(false); addItemForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Item</Button>
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
                <Select
                  placeholder="Select category"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          placeholder="New category..."
                          value={newCategoryName}
                          onChange={onCategoryChange}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{ borderRadius: 6 }}
                        />
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={addCategory}
                          style={{ color: '#B11E6A', fontWeight: 600 }}
                        >
                          Add
                        </Button>
                      </Space>
                    </>
                  )}
                  options={categories.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}><Form.Item label="Unit" name="unit"><Select><Option value="Kg">Kg</Option><Option value="Ltr">Ltr</Option><Option value="Pcs">Pcs</Option><Option value="ml">ml</Option><Option value="gram">gram</Option></Select></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item label="Opening Stock" name="current"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item label="Min Stock" name="min"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>

            <Col xs={24} sm={12}>
              <Form.Item label="Purchase Price" name="purchase_price">
                <Input prefix="₹" addonAfter={
                  <Form.Item name="purchase_price_tax" noStyle initialValue="without_gst">
                    <Select style={{ width: 120 }}>
                      <Option value="with_gst">With GST</Option>
                      <Option value="without_gst">Without GST</Option>
                    </Select>
                  </Form.Item>
                } />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Selling Price" name="selling_price">
                <Input prefix="₹" addonAfter={
                  <Form.Item name="selling_price_tax" noStyle initialValue="without_gst">
                    <Select style={{ width: 120 }}>
                      <Option value="with_gst">With GST</Option>
                      <Option value="without_gst">Without GST</Option>
                    </Select>
                  </Form.Item>
                } />
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
          — all inline, no sub-modals
      ═══════════════════════════════════════ */}
      <Drawer
        open={receiveOpen}
        onClose={() => { setReceiveOpen(false); setSelectedSupplier(null); setShowAddSupplier(false); receiveForm.resetFields(); supplierForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button
            type="primary" block
            style={saveBtn('linear-gradient(135deg,#B11E6A,#D85C9E)')}
            onClick={() => { setReceiveOpen(false); setSelectedSupplier(null); setShowAddSupplier(false); receiveForm.resetFields(); supplierForm.resetFields(); }}
          >
            CONFIRM ADD STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setReceiveOpen(false)} style={{ color: '#B11E6A', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Add Stock</Text>
            {activeItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Receive Goods</Text>}
          </div>
          {activeItem && (
            <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>
              {activeItem.code}
            </Tag>
          )}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Section 1: Item Summary */}
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
              {/* Stock bar */}
              <div style={{ padding: '0 16px 12px' }}>
                <Progress
                  percent={Math.min(100, Math.round((activeItem.current / activeItem.max) * 100))}
                  size="small"
                  strokeColor={activeItem.status === 'OK' ? '#B11E6A' : '#C94F8A'}
                  showInfo={false}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeItem.max} {activeItem.unit}</Text>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Transaction Details */}
          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={receiveForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>}
                      name="qty"
                      rules={[{ required: true, message: 'Enter quantity' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input
                        type="number" min={0} placeholder="0"
                        suffix={
                          <Space size={4}>
                            <Text style={{ color: '#aaa', fontSize: 12 }}>{activeItem?.unit}</Text>
                            <CalculatorOutlined style={{ color: '#B11E6A' }} />
                          </Space>
                        }
                        style={{ borderRadius: 8, height: 42 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Supply Price</Text>} name="supply_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={<Text style={{ fontSize: 13 }}>Arrival Date</Text>}
                      name="date"
                      style={{ marginBottom: 12 }}
                    >
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

          {/* Section 3: Supplier — fully inline */}
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
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="sup_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}>
                      <Input placeholder="Supplier name" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="sup_phone" style={{ marginBottom: 10 }}>
                      <Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="sup_email" style={{ marginBottom: 10 }}>
                      <Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="sup_tax" style={{ marginBottom: 10 }}>
                      <Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="sup_address" style={{ marginBottom: 10 }}>
                  <Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} />
                </Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="sup_bank" style={{ marginBottom: 10 }}>
                  <Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} />
                </Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="sup_notes" style={{ marginBottom: 10 }}>
                  <Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} />
                </Form.Item>
              </>
            ),
          })}

        </div>
      </Drawer>

      {/* ═══════════════════════════════════════
          SELL STOCK DRAWER (Issue Goods)
          — all inline, no sub-modals
      ═══════════════════════════════════════ */}
      <Drawer
        open={issueOpen}
        onClose={() => { setIssueOpen(false); setSelectedVendor(null); setShowAddVendor(false); issueForm.resetFields(); vendorForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button
            type="primary" block
            style={saveBtn('linear-gradient(135deg,#8a1652,#B11E6A)')}
            onClick={() => { setIssueOpen(false); setSelectedVendor(null); setShowAddVendor(false); issueForm.resetFields(); vendorForm.resetFields(); }}
          >
            CONFIRM SELL STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setIssueOpen(false)} style={{ color: '#8a1652', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Sell Stock</Text>
            {activeIssueItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Issue Goods</Text>}
          </div>
          {activeIssueItem && (
            <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165244', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>
              {activeIssueItem.code}
            </Tag>
          )}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Section 1: Item Summary */}
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
                    <Text style={{ fontSize: 12, color: '#aaa' }}>
                      Available: <strong style={{ color: activeIssueItem.current === 0 ? '#ff4d4f' : '#8a1652' }}>{activeIssueItem.current} {activeIssueItem.unit}</strong>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Price: {activeIssueItem.price}</Text>
                  </Space>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <Progress
                  percent={Math.min(100, Math.round((activeIssueItem.current / activeIssueItem.max) * 100))}
                  size="small"
                  strokeColor={activeIssueItem.status === 'OK' ? '#8a1652' : '#C94F8A'}
                  showInfo={false}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeIssueItem.max} {activeIssueItem.unit}</Text>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Transaction Details */}
          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#8a1652' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={issueForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>}
                      name="qty"
                      rules={[{ required: true, message: 'Enter quantity' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input
                        type="number" min={0} placeholder="0"
                        suffix={
                          <Space size={4}>
                            <Text style={{ color: '#aaa', fontSize: 12 }}>{activeIssueItem?.unit}</Text>
                            <CalculatorOutlined style={{ color: '#8a1652' }} />
                          </Space>
                        }
                        style={{ borderRadius: 8, height: 42 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Sell Price</Text>} name="sell_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={<Text style={{ fontSize: 13 }}>Departure Date</Text>}
                      name="date"
                      style={{ marginBottom: 12 }}
                    >
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

          {/* Section 3: Vendor — fully inline */}
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
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="cust_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}>
                      <Input placeholder="Vendor name" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="cust_phone" style={{ marginBottom: 10 }}>
                      <Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="cust_email" style={{ marginBottom: 10 }}>
                      <Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="cust_tax" style={{ marginBottom: 10 }}>
                      <Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="cust_address" style={{ marginBottom: 10 }}>
                  <Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} />
                </Form.Item>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="cust_bank" style={{ marginBottom: 10 }}>
                  <Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} />
                </Form.Item>
                <Row gutter={10}>
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="cust_notes" style={{ marginBottom: 10 }}>
                      <Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Discount (%)</Text>} name="cust_discount" style={{ marginBottom: 10 }}>
                      <InputNumber min={0} max={100} placeholder="0" style={{ width: '100%', borderRadius: 8, height: 40 }} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ),
          })}

        </div>
      </Drawer>

      {/* Add Supplier Modal (for Suppliers Tab) */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Supplier</Text>}
        open={showAddSupplierModal}
        onCancel={() => { setShowAddSupplierModal(false); supplierForm.resetFields(); }}
        footer={null}
        width={520}
        centered
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleSaveSupplier} style={{ marginTop: 16 }}>
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="sup_name" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                <Input placeholder="Supplier name" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="sup_phone" style={{ marginBottom: 12 }}>
                <Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="sup_email" style={{ marginBottom: 12 }}>
                <Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="sup_tax" style={{ marginBottom: 12 }}>
                <Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="sup_address" style={{ marginBottom: 12 }}>
            <Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="sup_bank" style={{ marginBottom: 12 }}>
            <Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="sup_notes" style={{ marginBottom: 12 }}>
            <Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setShowAddSupplierModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: '#B11E6A', border: 'none', fontWeight: 700 }}>Save Supplier</Button>
          </div>
        </Form>
      </Modal>

      {/* Add Vendor Modal (for Vendors Tab) */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Vendor</Text>}
        open={showAddVendorModal}
        onCancel={() => { setShowAddVendorModal(false); vendorForm.resetFields(); }}
        footer={null}
        width={520}
        centered
      >
        <Form form={vendorForm} layout="vertical" onFinish={handleSaveVendor} style={{ marginTop: 16 }}>
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="cust_name" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                <Input placeholder="Vendor name" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="cust_phone" style={{ marginBottom: 12 }}>
                <Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="cust_email" style={{ marginBottom: 12 }}>
                <Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="cust_tax" style={{ marginBottom: 12 }}>
                <Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="cust_address" style={{ marginBottom: 12 }}>
            <Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Form.Item label={<Text style={{ fontSize: 13 }}>Bank Details</Text>} name="cust_bank" style={{ marginBottom: 12 }}>
            <Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Row gutter={10}>
            <Col span={14}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="cust_notes" style={{ marginBottom: 12 }}>
                <Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label={<Text style={{ fontSize: 13 }}>Discount (%)</Text>} name="cust_discount" style={{ marginBottom: 12 }}>
                <InputNumber min={0} max={100} placeholder="0" style={{ width: '100%', borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setShowAddVendorModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: '#B11E6A', border: 'none', fontWeight: 700 }}>Save Vendor</Button>
          </div>
        </Form>
      </Modal>
      {/* Add Purchase Expense Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Purchase Expense</Text>}
        open={showAddPurchaseModal}
        onCancel={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); }}
        footer={null}
        width={540}
        centered
      >
        <Form form={purchaseForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Select Product" name="product" rules={[{ required: true }]}>
                <Select placeholder="Select item">
                  {inventory.map(i => <Option key={i.code} value={i.name}>{i.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplier" rules={[{ required: true }]}>
                <Select placeholder="Select supplier">
                  {suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Quantity" name="qty" rules={[{ required: true }]}>
                <Input placeholder="0" suffix="Unit" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Total Amount" name="amount" rules={[{ required: true }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Invoice Details" name="invoice">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload maxCount={1} beforeUpload={() => false}>
                <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Upload Invoice File</Button>
              </Upload>
              <Button
                block
                icon={<EyeOutlined />}
                onClick={() => {
                  message.loading('AI Scanning invoice...', 2).then(() => {
                    purchaseForm.setFieldsValue({
                      amount: 12500,
                      qty: 150,
                      date: dayjs()
                    });
                    message.success('AI successfully fetched details from invoice!');
                  });
                }}
                style={{ borderColor: '#B11E6A', color: '#B11E6A' }}
              >
                Scan Invoice with AI
              </Button>
            </Space>
          </Form.Item>
          <Form.Item label="Payment Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" defaultChecked />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setShowAddPurchaseModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => { message.success('Purchase recorded'); setShowAddPurchaseModal(false); }} style={{ flex: 2, height: 40, borderRadius: 8, background: '#B11E6A', border: 'none', fontWeight: 700 }}>Record Purchase</Button>
          </div>
        </Form>
      </Modal>
      <Modal
        title={
          <Space>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B11E6A' }}>
              <FileTextOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>AI Converted Bill Details</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Extracted from original document via AI Scanning</Text>
            </div>
          </Space>
        }
        open={!!viewBillDetail}
        onCancel={() => setViewBillDetail(null)}
        footer={[
          <Button key="close" onClick={() => setViewBillDetail(null)}>Close</Button>,
          <Button key="print" type="primary" icon={<DownloadOutlined />} style={{ background: '#B11E6A', border: 'none' }}>Download AI Summary</Button>
        ]}
        width={900}
        centered
      >
        {viewBillDetail && (
          <Row gutter={24}>
            <Col span={12}>
              <Divider orientation="left" style={{ marginTop: 0 }}>Extracted Metadata</Divider>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Bill Number"><Text strong>{viewBillDetail.bill_no}</Text></Descriptions.Item>
                <Descriptions.Item label="Invoice Date">{viewBillDetail.date}</Descriptions.Item>
                <Descriptions.Item label="Vendor/Supplier">{viewSupplier?.name || viewVendor?.name}</Descriptions.Item>
                <Descriptions.Item label="Tax Amount">₹{(parseInt(viewBillDetail.items[0].total.replace(/[₹,]/g, '')) * 0.18).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Total Amount"><Text strong style={{ color: '#B11E6A', fontSize: 16 }}>{viewBillDetail.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[₹,]/g, '')), 0).toLocaleString()} (INR)</Text></Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">AI Extracted Items</Divider>
              <Table
                size="small"
                pagination={false}
                dataSource={viewBillDetail.items}
                columns={[
                  { title: 'Item', dataIndex: 'name', key: 'name' },
                  { title: 'Qty', dataIndex: 'qty', key: 'qty' },
                  { title: 'Price', dataIndex: 'price', key: 'price' },
                  { title: 'Total', dataIndex: 'total', key: 'total', render: v => <Text strong>{v}</Text> }
                ]}
              />
            </Col>
            <Col span={12}>
              <Divider orientation="left" style={{ marginTop: 0 }}>Original Document Preview</Divider>
              <Card
                styles={{ body: { padding: 8 } }}
                style={{ background: '#f5f5f5', textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                <div style={{ padding: 20 }}>
                  <ShoppingOutlined style={{ fontSize: 64, color: '#ccc', marginBottom: 16 }} />
                  <br />
                  <Text type="secondary">Preview of {viewBillDetail.inv_no}.pdf</Text>
                  <br />
                  <Button type="link" icon={<EyeOutlined />}>View Full Image</Button>
                </div>
              </Card>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Tag color="green">AI Confidence Score: 98.4%</Tag>
              </div>
            </Col>
          </Row>
        )}
      </Modal>
      <Modal
        title={
          <Space>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B11E6A' }}>
              <FileTextOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>AI Converted Bill Details</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Extracted from original document via AI Scanning</Text>
            </div>
          </Space>
        }
        open={!!viewBillDetail}
        onCancel={() => setViewBillDetail(null)}
        footer={[
          <Button key="close" onClick={() => setViewBillDetail(null)}>Close</Button>,
          <Button key="print" type="primary" icon={<DownloadOutlined />} style={{ background: '#B11E6A', border: 'none' }}>Download AI Summary</Button>
        ]}
        width={900}
        centered
      >
        {viewBillDetail && (
          <Row gutter={24}>
            <Col span={12}>
              <Divider orientation="left" style={{ marginTop: 0 }}>Extracted Metadata</Divider>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Bill Number"><Text strong>{viewBillDetail.bill_no}</Text></Descriptions.Item>
                <Descriptions.Item label="Invoice Date">{viewBillDetail.date}</Descriptions.Item>
                <Descriptions.Item label="Vendor/Supplier">{viewSupplier?.name || viewVendor?.name}</Descriptions.Item>
                <Descriptions.Item label="Tax Amount">₹{(parseInt(viewBillDetail.items[0].total.replace(/[₹,]/g, '')) * 0.18).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Total Amount"><Text strong style={{ color: '#B11E6A', fontSize: 16 }}>{viewBillDetail.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[₹,]/g, '')), 0).toLocaleString()} (INR)</Text></Descriptions.Item>
              </Descriptions>

              <Divider orientation="left">AI Extracted Items</Divider>
              <Table
                size="small"
                pagination={false}
                dataSource={viewBillDetail.items}
                columns={[
                  { title: 'Item', dataIndex: 'name', key: 'name' },
                  { title: 'Qty', dataIndex: 'qty', key: 'qty' },
                  { title: 'Price', dataIndex: 'price', key: 'price' },
                  { title: 'Total', dataIndex: 'total', key: 'total', render: v => <Text strong>{v}</Text> }
                ]}
              />
            </Col>
            <Col span={12}>
              <Divider orientation="left" style={{ marginTop: 0 }}>Original Document Preview</Divider>
              <Card
                styles={{ body: { padding: 8 } }}
                style={{ background: '#f5f5f5', textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                <div style={{ padding: 20 }}>
                  <ShoppingOutlined style={{ fontSize: 64, color: '#ccc', marginBottom: 16 }} />
                  <br />
                  <Text type="secondary">Preview of {viewBillDetail.inv_no}.pdf</Text>
                  <br />
                  <Button type="link" icon={<EyeOutlined />}>View Full Image</Button>
                </div>
              </Card>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Tag color="green">AI Confidence Score: 98.4%</Tag>
              </div>
            </Col>
          </Row>
        )}
      </Modal>
    </div>
  );
}
