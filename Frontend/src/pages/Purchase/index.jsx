import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, DatePicker, Upload, message, InputNumber, Divider, List, Descriptions, Tabs, Avatar, Switch
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, ShoppingOutlined, SearchOutlined,
  UploadOutlined, EyeOutlined, EditOutlined, FileTextOutlined, WarningOutlined, InfoCircleOutlined, WhatsAppOutlined,
  TeamOutlined, ContactsOutlined, DollarOutlined, LeftOutlined, CheckOutlined, UserOutlined, CameraOutlined, SafetyCertificateOutlined,
  ThunderboltOutlined, RobotOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

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

const INVENTORY_DATA = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', current: 450, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', current: 45, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 3, code: 'PK-010', name: 'Amber Bottles 100ml', current: 120, min: 500, unit: 'Pcs', category: 'Packaging' },
  { key: 4, code: 'PK-012', name: 'Flip Top Caps', current: 800, min: 1000, unit: 'Pcs', category: 'Packaging' },
];

export default function Purchase() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [suppliers, setSuppliers] = useState(suppliersList);
  const [vendors, setVendors] = useState(vendorsList);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddInventoryPurchaseModal, setShowAddInventoryPurchaseModal] = useState(false);
  const [inventoryPurchaseForm] = Form.useForm();
  const [viewBillDetail, setViewBillDetail] = useState(null);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [supplierDateRange, setSupplierDateRange] = useState(null);
  const [vendorDateRange, setVendorDateRange] = useState(null);

  const [supplierForm] = Form.useForm();
  const [vendorForm] = Form.useForm();

  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseForm] = Form.useForm();

  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateType, setUpdateType] = useState('supplier'); // 'supplier' or 'vendor'
  const [statusForm] = Form.useForm();
  const [currentStatus, setCurrentStatus] = useState('');

  /* ── History material search ── */
  const [supplierHistorySearch, setSupplierHistorySearch] = useState('');
  const [vendorHistorySearch, setVendorHistorySearch] = useState('');

  /* ── AI scan state ── */
  const [supplierScanLoading, setSupplierScanLoading] = useState(false);
  const [vendorScanLoading, setVendorScanLoading] = useState(false);
  const [inventoryPurchaseScanLoading, setInventoryPurchaseScanLoading] = useState(false);
  const [supplierScannedFile, setSupplierScannedFile] = useState(null);
  const [vendorScannedFile, setVendorScannedFile] = useState(null);
  const [inventoryPurchaseScannedFile, setInventoryPurchaseScannedFile] = useState(null);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.phone.includes(supplierSearch)
  );

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.phone.includes(vendorSearch)
  );

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
    supplierForm.resetFields();
    setShowAddSupplierModal(false);
    message.success('Supplier added successfully');
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
    vendorForm.resetFields();
    setShowAddVendorModal(false);
    message.success('Vendor added successfully');
  };

  const purchases = [
    {
      key: 1,
      date: '2024-05-01',
      bill_no: 'PUR-8821',
      inv_no: 'INV-CHEM-101',
      items: [
        { name: 'Soap Base (White)', qty: '100 Kg', price: '₹85', total: '₹8,500' },
      ],
      entity: 'ChemCo India',
      amount: '₹8,500',
      status: 'Paid',
      req_status: 'Confirmed'
    },
    {
      key: 2,
      date: '2024-05-04',
      bill_no: 'PUR-8825',
      inv_no: 'INV-BIO-452',
      items: [
        { name: 'Shampoo Concentrate', qty: '200 Ltr', price: '₹220', total: '₹44,000' }
      ],
      entity: 'BioLife Ltd',
      amount: '₹44,000',
      status: 'Unpaid',
      req_status: 'Pending'
    },
  ];

  const handleOpenRequest = (product) => {
    setSelectedProduct(product);
    const suggestQty = product.min > product.current ? (product.min - product.current) * 2 : product.min;
    purchaseForm.setFieldsValue({
      product: product.name,
      qty: suggestQty,
      unit: product.unit
    });
    setShowAddPurchaseModal(true);
  };

  const handleRaiseRequest = (values) => {
    message.success(`Purchase request for ${values.product} raised successfully`);
    setShowAddPurchaseModal(false);
    purchaseForm.resetFields();
    setSelectedProduct(null);
  };

  const handleSupplierAIScan = () => {
    if (!supplierScannedFile) { message.warning('Please upload a document first'); return; }
    setSupplierScanLoading(true);
    setTimeout(() => {
      supplierForm.setFieldsValue({
        sup_name: 'Global Chem Supplies Pvt. Ltd.',
        sup_phone: '+91 98001 23456',
        sup_email: 'contact@globalchem.in',
        sup_tax: '27AABCG1234F1Z5',
        sup_address: 'Andheri East, Mumbai, MH 400069',
        sup_bank: 'HDFC Bank — A/C 50100123456789 | IFSC HDFC0001234',
        sup_notes: 'Preferred supplier for chemical raw materials. NET-30 payment terms.',
      });
      setSupplierScanLoading(false);
      message.success('AI extracted supplier details from the document!');
    }, 2200);
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

  const handleInventoryPurchaseAIScan = () => {
    if (!inventoryPurchaseScannedFile) { message.warning('Please upload an invoice first'); return; }
    setInventoryPurchaseScanLoading(true);
    setTimeout(() => {
      inventoryPurchaseForm.setFieldsValue({
        amount: 12500,
        qty: 150,
        date: dayjs(),
      });
      setInventoryPurchaseScanLoading(false);
      message.success('AI extracted invoice details successfully!');
    }, 2200);
  };

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Purchase Module" items={[{ label: 'Purchase' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <Tabs
              defaultActiveKey="stock_status"
              items={[
                {
                  key: 'stock_status',
                  label: <Space><WarningOutlined /> Stock Status & Raise Request</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Inventory Stock Availability</Title>
                        <Text type="secondary">Raise purchase requests directly for low stock products</Text>
                      </div>
                      <Table
                        size="small"
                        dataSource={INVENTORY_DATA}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: 'Item Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
                          { title: 'Category', dataIndex: 'category', key: 'category' },
                          { title: 'Current Stock', dataIndex: 'current', key: 'current', render: (v, r) => <Text style={{ color: v <= r.min ? '#ff4d4f' : 'inherit' }}>{v} {r.unit}</Text> },
                          { title: 'Min. Required', dataIndex: 'min', key: 'min', render: (v, r) => `${v} ${r.unit}` },
                          {
                            title: 'Status',
                            key: 'status',
                            render: (_, r) => (
                              <Tag color={r.current <= r.min ? 'error' : 'success'} style={{ borderRadius: 12 }}>
                                {r.current <= r.min ? 'Low Stock' : 'Healthy'}
                              </Tag>
                            )
                          },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, r) => (
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                style={{
                                  background: r.current <= r.min ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0',
                                  border: 'none',
                                  color: r.current <= r.min ? '#fff' : '#888'
                                }}
                                onClick={() => handleOpenRequest(r)}
                              >
                                Raise Request
                              </Button>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: 'suppliers',
                  label: <Space><TeamOutlined />Suppliers</Space>,
                  children: (
                    <div className="fade-in" style={{ marginTop: 12 }}>
                      {viewSupplier ? (() => {
                        const supplierHistoryRaw = [
                          { key: 1, date: '2024-05-01', bill_no: 'BILL-1001', inv_no: 'INV-A101', items: [{ name: 'Soap Base (White)', qty: '100 Kg', price: '₹85/Kg', total: '₹8,500' }, { name: 'Glycerin', qty: '10 Kg', price: '₹120/Kg', total: '₹1,200' }], status: 'Received' },
                          { key: 2, date: '2024-04-15', bill_no: 'BILL-982', inv_no: 'INV-B452', items: [{ name: 'Shampoo Concentrate', qty: '50 Ltr', price: '₹220/Ltr', total: '₹11,000' }], status: 'Received' },
                        ];
                        const filteredSupplierHistory = supplierHistorySearch
                          ? supplierHistoryRaw.filter(r => r.items.some(i => i.name.toLowerCase().includes(supplierHistorySearch.toLowerCase())))
                          : supplierHistoryRaw;
                        return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <Space>
                              <Button icon={<LeftOutlined />} onClick={() => { setViewSupplier(null); setSupplierHistorySearch(''); }}>Back to Suppliers</Button>
                              <Input
                                prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                                placeholder="Search by material..."
                                value={supplierHistorySearch}
                                onChange={e => setSupplierHistorySearch(e.target.value)}
                                allowClear
                                style={{ width: 240, borderRadius: 8 }}
                                suffix={supplierHistorySearch ? <Text style={{ fontSize: 11, color: '#B11E6A' }}>{filteredSupplierHistory.length}</Text> : null}
                              />
                            </Space>
                            <Title level={4} style={{ margin: 0, color: '#B11E6A' }}>{viewSupplier.name} - Purchase History</Title>
                          </div>
                          <Table
                            size="small"
                            dataSource={filteredSupplierHistory}
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
                                        setUpdateType('supplier');
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <Title level={5} style={{ margin: 0, color: textColor }}>Supplier Management</Title>
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
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'vendors',
                  label: <Space><ContactsOutlined />Vendors</Space>,
                  children: (
                    <div className="fade-in" style={{ marginTop: 12 }}>
                      {viewVendor ? (() => {
                        const vendorHistoryRaw = [
                          { key: 1, date: '2024-05-02', bill_no: 'SAL-2001', inv_no: 'INV-X99', items: [{ name: 'Dental Kit Boxes', qty: '50 Pcs', price: '₹15/Pc', total: '₹750' }, { name: 'Soap Bars', qty: '20 Pcs', price: '₹10/Pc', total: '₹200' }], status: 'Dispatched' },
                          { key: 2, date: '2024-04-20', bill_no: 'SAL-1980', inv_no: 'INV-X85', items: [{ name: 'Custom Stickers', qty: '1000 Pcs', price: '₹2/Pc', total: '₹2,000' }], status: 'Delivered' },
                        ];
                        const filteredVendorHistory = vendorHistorySearch
                          ? vendorHistoryRaw.filter(r => r.items.some(i => i.name.toLowerCase().includes(vendorHistorySearch.toLowerCase())))
                          : vendorHistoryRaw;
                        return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <Space>
                              <Button icon={<LeftOutlined />} onClick={() => { setViewVendor(null); setVendorHistorySearch(''); }}>Back to Vendors</Button>
                              <Input
                                prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                                placeholder="Search by product..."
                                value={vendorHistorySearch}
                                onChange={e => setVendorHistorySearch(e.target.value)}
                                allowClear
                                style={{ width: 240, borderRadius: 8 }}
                                suffix={vendorHistorySearch ? <Text style={{ fontSize: 11, color: '#B11E6A' }}>{filteredVendorHistory.length}</Text> : null}
                              />
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
                                        setUpdateType('vendor');
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'purchases',
                  label: <Space><DollarOutlined />Inventory Purchase</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Inventory Purchase Management</Title>
                        <Space>
                          <DatePicker.RangePicker style={{ width: 280 }} />
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddInventoryPurchaseModal(true)} style={{ background: '#B11E6A', border: 'none' }}>Add Purchase</Button>
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
                    </div>
                  )
                },
                {
                  key: 'history',
                  label: <Space><FileTextOutlined /> Purchase Order History</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Order History</Title>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                      </div>
                      <Table
                        size="small"
                        dataSource={purchases}
                        columns={[
                          { title: 'Date', dataIndex: 'date', key: 'date' },
                          {
                            title: 'Bill / Inv No', key: 'nos', render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Text size="small" type="secondary">{r.bill_no}</Text>
                                <Text size="small" style={{ color: '#B11E6A', fontSize: 11 }}>{r.inv_no}</Text>
                              </Space>
                            )
                          },
                          { title: 'Items', key: 'items', render: (_, r) => r.items.map(i => i.name).join(', ') },
                          { title: 'Supplier', dataIndex: 'entity', key: 'entity', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Total Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong>{v}</Text> },
                          { title: 'Status', dataIndex: 'req_status', key: 'status', render: (v) => <Tag color={v === 'Confirmed' ? 'success' : 'processing'}>{v}</Tag> },
                          {
                            title: 'Actions', key: 'actions',
                            render: () => <Button size="small" type="text" icon={<EyeOutlined />} />
                          }
                        ]}
                      />
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Raise Purchase Order Request</Text>}
        open={showAddPurchaseModal}
        onCancel={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); }}
        footer={null}
        width={700}
        centered
      >
        <Form form={purchaseForm} layout="vertical" onFinish={handleRaiseRequest} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Product" name="product" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplier" rules={[{ required: true }]}>
                <Select placeholder="Select supplier">
                  <Option value="ChemCo India">ChemCo India</Option>
                  <Option value="BioLife Ltd">BioLife Ltd</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {selectedProduct && (
            <div style={{ padding: '12px 16px', background: selectedProduct.current <= selectedProduct.min ? '#fffbe6' : '#e6f7ff', border: `1px solid ${selectedProduct.current <= selectedProduct.min ? '#ffe58f' : '#91d5ff'}`, marginBottom: 20, borderRadius: 8, display: 'flex', gap: 12 }}>
              <div style={{ color: selectedProduct.current <= selectedProduct.min ? '#856404' : '#0050b3', fontSize: 18 }}><InfoCircleOutlined /></div>
              <Descriptions size="small" column={3} title="Stock Status">
                <Descriptions.Item label="Current Stock"><Text strong>{selectedProduct.current} {selectedProduct.unit}</Text></Descriptions.Item>
                <Descriptions.Item label="Min. Required"><Text type="danger">{selectedProduct.min} {selectedProduct.unit}</Text></Descriptions.Item>
                <Descriptions.Item label="Gap"><Text strong style={{ color: '#ff4d4f' }}>{selectedProduct.min - selectedProduct.current} {selectedProduct.unit}</Text></Descriptions.Item>
              </Descriptions>
            </div>
          )}

          <Divider orientation="left" style={{ margin: '12px 0' }}>Order Details</Divider>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Payment Terms" name="payment_terms" rules={[{ required: true }]}>
                <Select placeholder="Select payment terms">
                  <Option value="100% Payment">100% Payment</Option>
                  <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                  <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Quantity" name="qty" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Unit" name="unit">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Bill No" name="bill_no" rules={[{ required: true }]}>
                <Input placeholder="PUR-XXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Invoice No" name="inv_no">
                <Input placeholder="INV-XXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Order Date" name="date" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Unit Price" name="price" rules={[{ required: true }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Total Amount" name="amount" rules={[{ required: true }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Invoice Attachment" name="invoice">
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
                      price: 83.33,
                      date: dayjs(),
                      bill_no: 'PUR-' + Math.floor(Math.random() * 9000 + 1000)
                    });
                    message.success('AI extracted details successfully!');
                  });
                }}
                style={{ borderColor: '#B11E6A', color: '#B11E6A' }}
              >
                Scan Invoice with AI
              </Button>
            </Space>
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button
              icon={<WhatsAppOutlined />}
              onClick={() => {
                const values = purchaseForm.getFieldsValue();
                if (!values.product || !values.supplier) {
                  message.warning('Please select product and supplier first');
                  return;
                }
                const msg = `Hello, I would like to request a quotation for: ${values.product}. Quantity: ${values.qty || 'N/A'}. Payment Terms: ${values.payment_terms || 'TBD'}. Please advise.`;
                window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              style={{ flex: 1, height: 40, borderRadius: 8, borderColor: '#25D366', color: '#25D366' }}
            >
              Ask Quotation
            </Button>
            <Button onClick={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); }} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}>Raise Request</Button>
          </div>
        </Form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Supplier</Text>}
        open={showAddSupplierModal}
        onCancel={() => { setShowAddSupplierModal(false); supplierForm.resetFields(); setSupplierScannedFile(null); }}
        footer={null}
        width={540}
        centered
      >
        {/* AI Scan Invoice Section */}
        <div style={{ marginTop: 16, marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Invoice / Document with AI</Text>
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a business card, GST certificate, or invoice — AI will auto-fill the fields below</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Upload
              maxCount={1}
              beforeUpload={(file) => { setSupplierScannedFile(file); return false; }}
              onRemove={() => setSupplierScannedFile(null)}
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ flex: 1 }}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>
                {supplierScannedFile ? supplierScannedFile.name : 'Upload Document'}
              </Button>
            </Upload>
            <Button
              icon={<ThunderboltOutlined />}
              loading={supplierScanLoading}
              onClick={handleSupplierAIScan}
              style={{ borderRadius: 8, background: supplierScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: supplierScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {supplierScanLoading ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </div>
        </div>

        <Form form={supplierForm} layout="vertical" onFinish={handleSaveSupplier}>
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

      {/* Add Vendor Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Vendor</Text>}
        open={showAddVendorModal}
        onCancel={() => { setShowAddVendorModal(false); vendorForm.resetFields(); setVendorScannedFile(null); }}
        footer={null}
        width={540}
        centered
      >
        {/* AI Scan Invoice Section */}
        <div style={{ marginTop: 16, marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Invoice / Document with AI</Text>
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a business card, GST certificate, or invoice — AI will auto-fill the fields below</Text>
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
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>
                {vendorScannedFile ? vendorScannedFile.name : 'Upload Document'}
              </Button>
            </Upload>
            <Button
              icon={<ThunderboltOutlined />}
              loading={vendorScanLoading}
              onClick={handleVendorAIScan}
              style={{ borderRadius: 8, background: vendorScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: vendorScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {vendorScanLoading ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </div>
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

      {/* Add Inventory Purchase Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add New Purchase Expense</Text>}
        open={showAddInventoryPurchaseModal}
        onCancel={() => { setShowAddInventoryPurchaseModal(false); inventoryPurchaseForm.resetFields(); setInventoryPurchaseScannedFile(null); }}
        footer={null}
        width={540}
        centered
      >
        {/* AI Scan Invoice Section — same design as Supplier / Vendor modals */}
        <div style={{ marginTop: 16, marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <div>
              <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Invoice with AI</Text>
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload an invoice or receipt — AI will auto-fill quantity, amount & date</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Upload
              maxCount={1}
              beforeUpload={(file) => { setInventoryPurchaseScannedFile(file); return false; }}
              onRemove={() => setInventoryPurchaseScannedFile(null)}
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ flex: 1 }}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>
                {inventoryPurchaseScannedFile ? inventoryPurchaseScannedFile.name : 'Upload Invoice'}
              </Button>
            </Upload>
            <Button
              icon={<ThunderboltOutlined />}
              loading={inventoryPurchaseScanLoading}
              onClick={handleInventoryPurchaseAIScan}
              style={{ borderRadius: 8, background: inventoryPurchaseScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: inventoryPurchaseScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {inventoryPurchaseScanLoading ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </div>
        </div>

        <Form form={inventoryPurchaseForm} layout="vertical">
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
          <Form.Item label="Payment Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" defaultChecked />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <Button onClick={() => setShowAddInventoryPurchaseModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" onClick={() => { message.success('Purchase recorded'); setShowAddInventoryPurchaseModal(false); }} style={{ flex: 2, height: 40, borderRadius: 8, background: '#B11E6A', border: 'none', fontWeight: 700 }}>Record Purchase</Button>
          </div>
        </Form>
      </Modal>

      {/* AI Bill Detail Modal */}
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

      {/* Update Status Modal */}
      <Modal
        title={
          <Space>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B11E6A' }}>
              <SafetyCertificateOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>Update Order Status</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedOrder?.bill_no} - {updateType === 'supplier' ? 'Purchase' : 'Sales'}</Text>
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
              {updateType === 'supplier' ? (
                <>
                  <Option value="Ordered">Ordered</Option>
                  <Option value="In Transit">In Transit</Option>
                  <Option value="Received">Received</Option>
                </>
              ) : (
                <>
                  <Option value="Processing">Processing</Option>
                  <Option value="Dispatched">Dispatched</Option>
                  <Option value="Delivered">Delivered</Option>
                </>
              )}
            </Select>
          </Form.Item>

          {updateType === 'vendor' && currentStatus === 'Dispatched' && (
            <Form.Item
              label="Bill of Transport (LR/Bilty)"
              name="transport_proof"
              rules={[{ required: true, message: 'Please upload transport bill' }]}
              extra="Upload PDF or Image of transport bill"
            >
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon">
                  <FileTextOutlined style={{ color: '#B11E6A' }} />
                </p>
                <p className="ant-upload-text">Click or drag transport bill to upload</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          {updateType === 'vendor' && currentStatus === 'Delivered' && (
            <Form.Item
              label="Delivery Proof (Signed Acknowledgment)"
              name="delivery_proof"
              rules={[{ required: true, message: 'Please upload delivery proof' }]}
              extra="Upload photo of signed delivery note"
            >
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon">
                  <CameraOutlined style={{ color: '#B11E6A' }} />
                </p>
                <p className="ant-upload-text">Upload Signed Delivery Note</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          {updateType === 'supplier' && currentStatus === 'Received' && (
            <Form.Item
              label="Photo of Received Goods"
              name="received_photo"
              rules={[{ required: true, message: 'Please upload photo of goods' }]}
              extra="Capture or upload photo of the received items"
            >
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon">
                  <CameraOutlined style={{ color: '#B11E6A' }} />
                </p>
                <p className="ant-upload-text">Capture/Upload Photo of Goods</p>
              </Upload.Dragger>
            </Form.Item>
          )}

          <Form.Item label="Remarks/Notes" name="remarks">
            <Input.TextArea rows={3} placeholder="Add any additional details..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setShowUpdateStatusModal(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: '#B11E6A', border: 'none', fontWeight: 700 }}>
              Update Status & Save Proofs
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
