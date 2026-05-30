import React, { useState, useRef, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, DatePicker, Upload, message, InputNumber, Divider, List, Tabs, Descriptions
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, SearchOutlined, UploadOutlined,
  EyeOutlined, FileTextOutlined, ContactsOutlined, TeamOutlined,
  LeftOutlined, CheckOutlined, ThunderboltOutlined, RobotOutlined,
  CameraOutlined, SafetyCertificateOutlined, ShoppingOutlined,
  WalletOutlined, WarningOutlined, ShopOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';
import {
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetVendorHistoryQuery,
  useUpdateVendorStatusMutation,
  useGenerateAiSummaryMutation,
  useCreateExpenseMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;


const exportToCSV = (headers, rows, filename) => {
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function VendorsSuppliers() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  /* ── Vendors state — RTK Query ── */
  const { data: vendorData, isLoading: vendorsLoading } = useGetVendorsQuery({ type: 'raw_material' });
  const { data: printingData } = useGetVendorsQuery({ type: 'printing' });
  const [createVendor] = useCreateVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();
  const [deleteVendorMutation] = useDeleteVendorMutation();
  const [updateVendorStatus] = useUpdateVendorStatusMutation();
  const [generateAiSummary] = useGenerateAiSummaryMutation();
  const [createExpense] = useCreateExpenseMutation();

  const [viewVendor, setViewVendor] = useState(null);
  const { data: vendorHistoryData } = useGetVendorHistoryQuery(viewVendor?.id, { skip: !viewVendor?.id });
  const vendorHistoryRaw = useMemo(() => (vendorHistoryData?.data || []).map((h) => ({
    key: h._id,
    date: h.date?.slice(0, 10) || h.createdAt?.slice(0, 10),
    bill_no: h.billNo || '—',
    inv_no: h.invNo || '—',
    items: (h.items || []).map((i) => ({ name: i.name, qty: `${i.qty} ${i.unit || ''}`, price: i.price ? `₹${i.price}` : '—', total: i.total ? `₹${i.total}` : '—' })),
    status: h.status || '—',
  })), [vendorHistoryData]);

  const vendors = useMemo(() => (vendorData?.data || []).map((v) => ({
    id: v._id,
    key: v._id,
    name: v.name,
    phone: v.phone,
    email: v.email,
    address: v.address,
    taxId: v.taxId,
    bankDetails: v.bankDetails,
    discountPercent: v.discountPercent,
    status: v.status,
    aiSummary: v.aiSummary,
    totalPaid: 0,
    pending: 0,
  })), [vendorData]);

  const printingSuppliers = useMemo(() => (printingData?.data || []).map((v) => ({
    key: v._id,
    type: v.supplierType || 'Box',
    name: v.name,
    phone: v.phone,
    email: v.email,
    taxId: v.taxId,
    address: v.address,
    bank: v.bankDetails,
  })), [printingData]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [vendorDateRange, setVendorDateRange] = useState(null);
  const [vendorHistorySearch, setVendorHistorySearch] = useState('');
  const [vendorForm] = Form.useForm();
  const [vendorScanLoading, setVendorScanLoading] = useState(false);
  const [vendorScannedFile, setVendorScannedFile] = useState(null);

  /* ── View bill detail ── */
  const [viewBillDetail, setViewBillDetail] = useState(null);

  /* ── Update status modal ── */
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateType] = useState('vendor');
  const [currentStatus, setCurrentStatus] = useState('');
  const [statusForm] = Form.useForm();

  /* ── Vendor bill scan ── */
  const [showVendorBillScanModal, setShowVendorBillScanModal] = useState(false);
  const [vendorBillFile, setVendorBillFile] = useState(null);
  const [vendorBillScanLoading, setVendorBillScanLoading] = useState(false);
  const [vendorBillForm] = Form.useForm();
  const [purchaseExpenses, setPurchaseExpenses] = useState([]);

  /* ── Printing Suppliers state (loaded from API above) ── */
  const [printingSearch, setPrintingSearch] = useState('');
  const [printingTypeFilter, setPrintingTypeFilter] = useState('all');
  const [viewPrintingSupplier, setViewPrintingSupplier] = useState(null);
  const [showAddPrintingSupplierModal, setShowAddPrintingSupplierModal] = useState(false);
  const [printingSupplierForm] = Form.useForm();

  /* ── Camera capture ── */
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraSetFile, setCameraSetFile] = useState(null);
  const cameraVideoRef = useRef(null);

  const openCameraCapture = async (setFileFn) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      message.warning('Camera not available on this device or browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setCameraSetFile(() => setFileFn);
      setShowCameraModal(true);
    } catch {
      message.error('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (cameraSetFile) cameraSetFile(file);
      message.success('Document captured successfully');
      closeCameraCapture();
    }, 'image/jpeg', 0.92);
  };

  const closeCameraCapture = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setShowCameraModal(false);
    setCameraSetFile(null);
  };

  /* ── Computed ── */
  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.phone.includes(vendorSearch)
  );

  /* ── Handlers ── */
  const handleSaveVendor = () => {
    const vals = vendorForm.getFieldsValue();
    const newVendor = {
      id: Date.now(),
      name: vals.cust_name || 'New Vendor',
      phone: vals.cust_phone || '',
      email: vals.cust_email || '',
      address: vals.cust_address || '',
      totalPaid: 0,
      pending: 0,
    };
    setVendors([...vendors, newVendor]);
    vendorForm.resetFields();
    setShowAddVendorModal(false);
    message.success('Vendor added successfully');
  };

  const handleVendorAIScan = () => {
    if (!vendorScannedFile) { message.warning('Please upload a document first'); return; }
    setVendorScanLoading(true);
    setTimeout(() => {
      vendorForm.setFieldsValue({
        cust_name: 'Hilton Hotels & Resorts',
        cust_phone: '+91 20 6720 0000',
        cust_email: 'procurement@hilton.in',
        cust_tax: '27AABHH5678K1Z2',
        cust_address: 'Koregaon Park, Pune, MH 411001',
        cust_bank: 'ICICI Bank — A/C 007601234567 | IFSC ICIC0000076',
        cust_notes: 'Premium hotel chain. Monthly billing cycle.',
        cust_discount: 8,
      });
      setVendorScanLoading(false);
      message.success('AI extracted vendor details from the document!');
    }, 2200);
  };

  const handleAddPrintingSupplier = (vals) => {
    const newSup = {
      key: 'PRN-' + Date.now(),
      type: vals.type,
      name: vals.name,
      phone: vals.phone || '',
      email: vals.email || '',
      taxId: vals.taxId || '',
      address: vals.address || '',
      bank: vals.bank || '',
      notes: vals.notes || '',
      orders: [],
    };
    setPrintingSuppliers(prev => [...prev, newSup]);
    printingSupplierForm.resetFields();
    setShowAddPrintingSupplierModal(false);
    message.success('Printing supplier added successfully');
  };


  const totalPaid = vendors.reduce((s, v) => s + (v.totalPaid || 0), 0);
  const totalPending = vendors.reduce((s, v) => s + (v.pending || 0), 0);

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Vendors & Suppliers" items={[{ label: 'Vendors & Suppliers' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Vendors', value: vendors.length, icon: <ShopOutlined />, sub: 'Registered vendor accounts' },
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, icon: <WalletOutlined />, sub: 'Cumulative payments made' },
          { label: 'Total Pending', value: `₹${totalPending.toLocaleString()}`, icon: <WarningOutlined />, sub: `${vendors.filter(v => v.pending > 0).length} vendors with dues` },
          { label: 'Printing Suppliers', value: printingSuppliers.length, icon: <TeamOutlined />, sub: 'Sticker, box & ziplock' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#B11E6A15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#B11E6A', fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                    <Text strong style={{ color: '#B11E6A', fontSize: 18 }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '16px 20px 20px' } }}
          >
            <Tabs
              defaultActiveKey="vendors"
              items={[
                {
                  key: 'vendors',
                  label: <Space><ContactsOutlined />Vendors</Space>,
                  children: (
                    <div className="fade-in" style={{ marginTop: 16 }}>
                      {viewVendor ? (() => {
                        const filteredVendorHistory = vendorHistorySearch
                          ? vendorHistoryRaw.filter(r => r.items.some(i => i.name.toLowerCase().includes(vendorHistorySearch.toLowerCase())))
                          : vendorHistoryRaw;
                        return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                              <Space>
                                <Button icon={<LeftOutlined />} onClick={() => { setViewVendor(null); setVendorHistorySearch(''); }}>Back to Vendors</Button>
                                <Input
                                  prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                                  placeholder="Search by product..."
                                  value={vendorHistorySearch}
                                  onChange={e => setVendorHistorySearch(e.target.value)}
                                  allowClear
                                  style={{ width: 200, borderRadius: 8 }}
                                  suffix={vendorHistorySearch ? <Text style={{ fontSize: 11, color: '#B11E6A' }}>{filteredVendorHistory.length}</Text> : null}
                                />
                                <DatePicker.RangePicker style={{ width: 250 }} placeholder={['From Date', 'To Date']} />
                              </Space>
                              <Title level={4} style={{ margin: 0, color: '#B11E6A' }}>{viewVendor.name} - Detailed History</Title>
                            </div>
                            <Table
                              size="small"
                              dataSource={filteredVendorHistory}
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
                                    <Space>
                                      <Button
                                        size="small"
                                        type="primary"
                                        icon={<FileTextOutlined />}
                                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }}
                                        onClick={() => setViewBillDetail(record)}
                                      >
                                        AI Details
                                      </Button>
                                      <Button
                                        size="small"
                                        icon={<CheckOutlined />}
                                        onClick={() => {
                                          setSelectedOrder(record);
                                          setCurrentStatus(record.status);
                                          statusForm.setFieldsValue({ status: record.status });
                                          setShowUpdateStatusModal(true);
                                        }}
                                      >
                                        Update
                                      </Button>
                                    </Space>
                                  )
                                },
                              ]}
                            />
                          </div>
                        );
                      })() : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <Title level={5} style={{ margin: 0, color: textColor }}>Vendor Management</Title>
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
                              <Button
                                icon={<DownloadOutlined />}
                                onClick={() => exportToCSV(
                                  ['Vendor Name', 'Phone', 'Email', 'Address', 'Total Paid (₹)', 'Pending (₹)'],
                                  filteredVendors.map(v => [v.name, v.phone, v.email, v.address, v.totalPaid, v.pending]),
                                  'vendors.csv'
                                )}
                              >Export</Button>
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
                              { title: 'Total Paid', dataIndex: 'totalPaid', key: 'totalPaid', render: v => <Text style={{ color: '#52c41a', fontWeight: 600 }}>₹{v.toLocaleString()}</Text> },
                              { title: 'Pending', dataIndex: 'pending', key: 'pending', render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>₹{v.toLocaleString()}</Text> },
                              {
                                title: 'Action', key: 'action',
                                render: (_, r) => (
                                  <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setViewVendor(r)} style={{ color: '#B11E6A' }}>View History</Button>
                                )
                              }
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'printing_suppliers',
                  label: <Space><TeamOutlined />Printing Suppliers</Space>,
                  children: (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: textColor }}>Printing Suppliers</Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>Manage sticker, box and ziplock suppliers</Text>
                        </div>
                        <Space wrap>
                          <Input
                            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                            placeholder="Search supplier..."
                            allowClear
                            value={printingSearch}
                            onChange={(e) => setPrintingSearch(e.target.value)}
                            style={{ width: 200, borderRadius: 8 }}
                          />
                          <Select
                            value={printingTypeFilter}
                            onChange={setPrintingTypeFilter}
                            style={{ width: 150, height: 36 }}
                            options={[
                              { value: 'all', label: 'All Types' },
                              { value: 'Sticker', label: 'Sticker' },
                              { value: 'Box', label: 'Box' },
                              { value: 'Ziplock', label: 'Ziplock' },
                            ]}
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                            onClick={() => setShowAddPrintingSupplierModal(true)}
                          >
                            Add Supplier
                          </Button>
                        </Space>
                      </div>

                      <Table
                        size="small"
                        dataSource={printingSuppliers.filter(s => {
                          const q = printingSearch.toLowerCase();
                          const matchSearch = !q || (s.name || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
                          const matchType = printingTypeFilter === 'all' || s.type === printingTypeFilter;
                          return matchSearch && matchType;
                        })}
                        rowKey="key"
                        scroll={{ x: 900 }}
                        onRow={(record) => ({ onClick: () => setViewPrintingSupplier(record), style: { cursor: 'pointer' } })}
                        columns={[
                          {
                            title: 'Type', dataIndex: 'type', width: 100,
                            render: (v) => (
                              <Tag color={v === 'Sticker' ? 'blue' : v === 'Box' ? 'green' : 'orange'} style={{ borderRadius: 10, fontWeight: 600 }}>{v}</Tag>
                            ),
                          },
                          { title: 'Name', dataIndex: 'name', width: 180, render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                          { title: 'Phone', dataIndex: 'phone', width: 145, render: v => <Text>{v || '—'}</Text> },
                          { title: 'Email', dataIndex: 'email', width: 200, render: v => <Text>{v || '—'}</Text> },
                          { title: 'Tax ID (GST/PAN)', dataIndex: 'taxId', width: 155, render: v => <Text>{v || '—'}</Text> },
                          { title: 'Address', dataIndex: 'address', width: 160, render: v => <Text>{v || '—'}</Text> },
                          {
                            title: 'Orders', key: 'orders', width: 80,
                            render: (_, r) => (
                              <Tag color="geekblue" style={{ borderRadius: 10, fontWeight: 600, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setViewPrintingSupplier(r); }}>
                                {r.orders?.length || 0}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </div>
                  )
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ──────── Printing Supplier Orders Modal ──────── */}
      <Modal
        open={!!viewPrintingSupplier}
        onCancel={() => setViewPrintingSupplier(null)}
        footer={null}
        width={680}
        centered
        title={
          viewPrintingSupplier && (
            <Space>
              <Tag color={viewPrintingSupplier.type === 'Sticker' ? 'blue' : viewPrintingSupplier.type === 'Box' ? 'green' : 'orange'} style={{ borderRadius: 10, fontWeight: 700 }}>{viewPrintingSupplier.type}</Tag>
              <Text strong style={{ fontSize: 16 }}>{viewPrintingSupplier.name}</Text>
            </Space>
          )
        }
      >
        {viewPrintingSupplier && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div><Text type="secondary" style={{ fontSize: 12 }}>Phone</Text><br /><Text strong>{viewPrintingSupplier.phone || '—'}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 12 }}>Email</Text><br /><Text strong>{viewPrintingSupplier.email || '—'}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 12 }}>Tax ID</Text><br /><Text strong>{viewPrintingSupplier.taxId || '—'}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 12 }}>Address</Text><br /><Text strong>{viewPrintingSupplier.address || '—'}</Text></div>
            </div>
            {viewPrintingSupplier.bank && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: isDark ? '#1a1a2e' : '#f8f8f8', fontSize: 12 }}>
                <Text type="secondary">Bank: </Text><Text>{viewPrintingSupplier.bank}</Text>
              </div>
            )}
            <Text strong style={{ color: '#B11E6A', display: 'block', marginBottom: 10 }}>
              Orders Given ({viewPrintingSupplier.orders?.length || 0})
            </Text>
            <Table
              size="small"
              dataSource={viewPrintingSupplier.orders || []}
              rowKey="key"
              pagination={false}
              columns={[
                { title: 'Order ID', dataIndex: 'key', width: 100, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
                { title: 'Date', dataIndex: 'date', width: 100 },
                { title: 'Item', dataIndex: 'item', ellipsis: true },
                { title: 'Qty', dataIndex: 'qty', width: 70, render: (v, r) => `${v} ${r.unit}` },
                { title: 'Amount', dataIndex: 'amount', width: 90, render: v => <Text strong>₹{v?.toLocaleString()}</Text> },
                { title: 'Status', dataIndex: 'status', width: 100, render: v => <Tag color={v === 'Delivered' ? 'success' : v === 'In Transit' ? 'processing' : 'warning'} style={{ borderRadius: 10, fontSize: 11 }}>{v}</Tag> },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* ──────── Add Printing Supplier Modal ──────── */}
      <Modal
        open={showAddPrintingSupplierModal}
        onCancel={() => { setShowAddPrintingSupplierModal(false); printingSupplierForm.resetFields(); }}
        footer={null}
        width={500}
        centered
        title={<Text strong style={{ fontSize: 16 }}>Add Printing Supplier</Text>}
      >
        <Form form={printingSupplierForm} layout="vertical" onFinish={handleAddPrintingSupplier} style={{ marginTop: 12 }}>
          <Form.Item label="Supplier Type" name="type" rules={[{ required: true, message: 'Select type' }]}>
            <Select placeholder="Select type" style={{ height: 40 }}>
              <Option value="Sticker">Sticker</Option>
              <Option value="Box">Box</Option>
              <Option value="Ziplock">Ziplock</Option>
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={14}>
              <Form.Item label={<span>Name <span style={{ color: '#ff4d4f' }}>*</span></span>} name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Supplier name" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+91..." style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="Email" name="email">
                <Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Tax ID (GST/PAN)" name="taxId">
                <Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address">
            <Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Form.Item label="Bank Details" name="bank">
            <Input placeholder="Account / IFSC" style={{ borderRadius: 8, height: 40 }} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea placeholder="Any additional info..." rows={3} style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => { setShowAddPrintingSupplierModal(false); printingSupplierForm.resetFields(); }}>Cancel</Button>
            <Button htmlType="submit" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Supplier</Button>
          </div>
        </Form>
      </Modal>

      {/* ──────── Add Vendor Modal ──────── */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Vendor</Text>}
        open={showAddVendorModal}
        onCancel={() => { setShowAddVendorModal(false); vendorForm.resetFields(); setVendorScannedFile(null); }}
        footer={null}
        width={540}
        centered
      >
        <div style={{ marginTop: 16, marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Invoice / Document with AI</Text>
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera — AI will auto-fill the fields below</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Upload
              maxCount={1}
              beforeUpload={(file) => { setVendorScannedFile(file); return false; }}
              onRemove={() => setVendorScannedFile(null)}
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ flex: 1 }}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>Upload</Button>
            </Upload>
            <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setVendorScannedFile)} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', whiteSpace: 'nowrap' }}>Scan</Button>
            <Button
              icon={<ThunderboltOutlined />}
              loading={vendorScanLoading}
              onClick={handleVendorAIScan}
              style={{ borderRadius: 8, background: vendorScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: vendorScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {vendorScanLoading ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </div>
          {vendorScannedFile && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#B11E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileTextOutlined /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{vendorScannedFile.name}</Text>
            </div>
          )}
        </div>

        <Form form={vendorForm} layout="vertical" onFinish={handleSaveVendor}>
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

      {/* ──────── Scan & Record Vendor Bill Modal ──────── */}
      <Modal
        title={
          <Space>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>Scan & Record Vendor Bill</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>AI extracts details — create as Purchase Expense</Text>
            </div>
          </Space>
        }
        open={showVendorBillScanModal}
        onCancel={() => { setShowVendorBillScanModal(false); vendorBillForm.resetFields(); setVendorBillFile(null); }}
        footer={null}
        width={560}
        centered
      >
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Upload
                maxCount={1}
                beforeUpload={(file) => { setVendorBillFile(file); return false; }}
                onRemove={() => setVendorBillFile(null)}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ flex: 1 }}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>Upload Bill</Button>
              </Upload>
              <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setVendorBillFile)} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A' }}>Capture</Button>
              <Button
                icon={<ThunderboltOutlined />}
                style={{ borderRadius: 8, background: vendorBillFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: vendorBillFile ? '#fff' : '#bbb', fontWeight: 700 }}
                onClick={() => {
                  if (!vendorBillFile) { message.warning('Please upload or capture a bill first'); return; }
                  message.info('AI bill scanning will be available once the backend endpoint is ready');
                }}
              >
                Scan with AI
              </Button>
            </div>
            {vendorBillFile && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#B11E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileTextOutlined /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{vendorBillFile.name}</Text>
              </div>
            )}
          </div>

          <Form form={vendorBillForm} layout="vertical">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Purchase Date" name="date" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Invoice Number" name="invoice_no" rules={[{ required: true }]}>
                  <Input placeholder="INV-XXXX" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item label="Supplier" name="supplier" rules={[{ required: true }]}>
                  <Input placeholder="Supplier name" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item label="Quantity" name="qty">
                  <Input placeholder="e.g. 100 Kg" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Total Amount (₹)" name="total_amount" rules={[{ required: true }]}>
                  <InputNumber prefix="₹" style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Paid Status" name="paid_status" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Paid">Paid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                    <Option value="Unpaid">Unpaid</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowVendorBillScanModal(false); vendorBillForm.resetFields(); setVendorBillFile(null); }}>Cancel</Button>
            <Button
              type="primary"
              style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              onClick={async () => {
                try {
                  const values = await vendorBillForm.validateFields();
                  await createExpense({
                    date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                    invoiceNo: values.invoice_no,
                    vendorName: values.supplier,
                    qty: values.qty || '',
                    paidStatus: values.paid_status,
                    totalAmount: values.total_amount,
                    category: 'Purchase',
                  }).unwrap();
                  message.success('Bill recorded as Purchase Expense');
                  setShowVendorBillScanModal(false);
                  vendorBillForm.resetFields();
                  setVendorBillFile(null);
                } catch {
                  message.error('Failed to record expense');
                }
              }}
            >
              Create Purchase Expense
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──────── AI Bill Details Modal ──────── */}
      <Modal
        title={
          <Space>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 18 }} />
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
                <Descriptions.Item label="Vendor">{viewVendor?.name}</Descriptions.Item>
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

      {/* ──────── Update Status Modal ──────── */}
      <Modal
        title={
          <Space>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B11E6A' }}>
              <SafetyCertificateOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>Update Order Status</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedOrder?.bill_no} - Sales</Text>
            </div>
          </Space>
        }
        open={showUpdateStatusModal}
        onCancel={() => { setShowUpdateStatusModal(false); statusForm.resetFields(); }}
        footer={null}
        width={450}
        centered
      >
        <Form
          form={statusForm}
          layout="vertical"
          style={{ marginTop: 20 }}
          onValuesChange={(changed) => {
            if (changed.status) setCurrentStatus(changed.status);
          }}
          onFinish={() => {
            message.success('Status updated successfully with proofs');
            setShowUpdateStatusModal(false);
            statusForm.resetFields();
          }}
        >
          <Form.Item label="Order Status" name="status" rules={[{ required: true }]}>
            <Select style={{ height: 40 }}>
              <Option value="Processing">Processing</Option>
              <Option value="Dispatched">Dispatched</Option>
              <Option value="Delivered">Delivered</Option>
            </Select>
          </Form.Item>

          {currentStatus === 'Dispatched' && (
            <Form.Item
              label="Bill of Transport (LR/Bilty)"
              name="transport_proof"
              rules={[{ required: true, message: 'Please upload transport bill' }]}
              extra="Upload PDF or Image of transport bill"
            >
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon"><FileTextOutlined style={{ color: '#B11E6A' }} /></p>
                <p className="ant-upload-text">Click or drag transport bill to upload</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          {currentStatus === 'Delivered' && (
            <Form.Item
              label="Delivery Proof (Signed Acknowledgment)"
              name="delivery_proof"
              rules={[{ required: true, message: 'Please upload delivery proof' }]}
              extra="Upload photo of signed delivery note"
            >
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: '#B11E6A' }} /></p>
                <p className="ant-upload-text">Upload Signed Delivery Note</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setShowUpdateStatusModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}>Update Status</Button>
          </div>
        </Form>
      </Modal>

      {/* ──────── Camera Capture Modal ──────── */}
      <Modal
        title={
          <Space>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Scan Document</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Point camera at the document and tap Capture</div>
            </div>
          </Space>
        }
        open={showCameraModal}
        onCancel={closeCameraCapture}
        footer={null}
        width={480}
        centered
        destroyOnClose
        afterOpenChange={(open) => {
          if (open && cameraStream && cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = cameraStream;
            cameraVideoRef.current.play().catch(() => {});
          }
        }}
      >
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16, position: 'relative', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d4f', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
            <Text style={{ color: '#fff', fontSize: 11 }}>Live</Text>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={closeCameraCapture} style={{ flex: 1, height: 42, borderRadius: 10 }}>Cancel</Button>
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={capturePhoto}
            style={{ flex: 2, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700, fontSize: 14 }}
          >
            Capture Photo
          </Button>
        </div>
      </Modal>
    </div>
  );
}
