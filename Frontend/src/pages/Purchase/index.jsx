import React, { useState, useRef, useEffect } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, DatePicker, Upload, message, InputNumber, Divider, List, Descriptions, Tabs, Avatar, Switch, Tooltip, Badge, notification, Popover, Dropdown, Checkbox, Alert
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, ShoppingOutlined, SearchOutlined,
  UploadOutlined, EyeOutlined, EditOutlined, FileTextOutlined, WarningOutlined, InfoCircleOutlined, WhatsAppOutlined,
  TeamOutlined, ContactsOutlined, DollarOutlined, LeftOutlined, CheckOutlined, UserOutlined, CameraOutlined, SafetyCertificateOutlined,
  ThunderboltOutlined, RobotOutlined, MessageOutlined, BellOutlined, CloseOutlined, ClockCircleOutlined, ReloadOutlined, SaveOutlined, TruckOutlined, CheckCircleOutlined,
  MoreOutlined, MinusOutlined, QrcodeOutlined, ExclamationCircleOutlined, PhoneOutlined, CarOutlined, SyncOutlined, SendOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addRaisedRequest, raiseOrder, addBulkRequests, dismissNewProductRequest, updateFinanceStatus, updateRequestQty, addRequestNote, updateQuotationDetails } from '../../store/slices/purchaseSlice';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const inventory = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', category: 'Raw Material', unit: 'Kg', current: 450, min: 100, max: 1000, price: '₹85/Kg', status: 'OK', sellers: ['ChemCo India', 'BioLife Ltd'], purchasedDate: '2024-01-15' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', category: 'Raw Material', unit: 'Kg', current: 45, min: 100, max: 500, price: '₹95/Kg', status: 'Low', sellers: ['BioLife Ltd'], purchasedDate: '2024-01-10' },
  { key: 3, code: 'PK-001', name: 'Shampoo Bottles (Flip 30ml)', category: 'Packaging', unit: 'Pcs', current: 200, min: 500, max: 5000, price: '₹4.5/Pc', status: 'Low', sellers: ['PlastiPack'], purchasedDate: '2024-01-05' },
  { key: 4, code: 'PK-002', name: 'Dental Kit Boxes', category: 'Packaging', unit: 'Pcs', current: 850, min: 200, max: 2000, price: '₹12/Pc', status: 'OK', sellers: ['BoxWorld', 'PlastiPack'], purchasedDate: '2024-01-12' },
  { key: 5, code: 'ST-001', name: 'Custom Stickers (Hotel Brand)', category: 'Sticker', unit: 'Pcs', current: 3000, min: 500, max: 10000, price: '₹1.2/Pc', status: 'OK', sellers: ['PrintFast'], purchasedDate: '2024-01-18' },
  { key: 6, code: 'RM-003', name: 'Shampoo Concentrate', category: 'Raw Material', unit: 'Ltr', current: 0, min: 50, max: 500, price: '₹220/Ltr', status: 'Out', sellers: ['ChemCo India'], purchasedDate: '2023-12-20' },
];

const suppliersList = [
  { id: 1, name: 'ChemCo India', phone: '+91 98765 43210', email: 'info@chemco.in', address: 'Mumbai, MH', bank: 'HDFC Bank — A/C 50100123456789 | IFSC HDFC0001234' },
  { id: 2, name: 'BioLife Ltd', phone: '+91 87654 32109', email: 'contact@biolife.in', address: 'Chennai, TN', bank: 'SBI — A/C 30112345678 | IFSC SBIN0001234' },
  { id: 3, name: 'PlastiPack', phone: '+91 76543 21098', email: 'sales@plastipack.com', address: 'Delhi, DL', bank: 'ICICI — A/C 007601234567 | IFSC ICIC0000076' },
  { id: 4, name: 'BoxWorld', phone: '+91 65432 10987', email: 'info@boxworld.in', address: 'Bengaluru, KA', bank: 'Axis Bank — A/C 912010012345678 | IFSC UTIB0000001' },
];

const vendorsList = [
  { id: 1, name: 'Marriott Mumbai',   phone: '+91 22 6651 1234', email: 'purchase@marriott.in',    address: 'Mumbai, MH',  whatsapp: '912266511234', totalPaid: 95000,  pending: 25000 },
  { id: 2, name: 'Taj Hotels Delhi',  phone: '+91 11 6600 7777', email: 'orders@tajhotels.in',     address: 'Delhi, DL',   whatsapp: '911166007777', totalPaid: 60000,  pending: 81600 },
  { id: 3, name: 'ITC Grand Kolkata', phone: '+91 33 2288 9999', email: 'supply@itchotels.in',     address: 'Kolkata, WB', whatsapp: '913322889999', totalPaid: 250000, pending: 0     },
  { id: 4, name: 'Hyatt Chennai',     phone: '+91 44 6150 1234', email: 'procurement@hyatt.in',   address: 'Chennai, TN', whatsapp: '914461501234', totalPaid: 42000,  pending: 18000 },
];

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

const INVENTORY_DATA = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', current: 450, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', current: 45, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 3, code: 'PK-010', name: 'Amber Bottles 100ml', current: 120, min: 500, unit: 'Pcs', category: 'Packaging' },
  { key: 4, code: 'PK-012', name: 'Flip Top Caps', current: 800, min: 1000, unit: 'Pcs', category: 'Packaging' },
];

// ── Dispatch Order Tracking mock data ────────────────────────────────────────
const initDispatchTrackingOrders = [
  { key: 'DT-001', orderId: 'PO-2501', date: '2024-05-20', supplier: 'ChemCo India', item: 'Soap Base (White)', qty: 500, unit: 'Kg', amount: 42500, lrNumber: 'LR-78921', lorryNo: 'TN-09-AB-1234', transportCompany: 'Fast Cargo Pvt Ltd', lrCopyFile: 'LR_78921_ChemCo.pdf', expectedDelivery: '2024-05-28', pickupEmpId: 'EMP-101', pickupEmpName: 'Ramesh Kumar', paymentStatus: 'Unpaid', takenStatus: null, takenProof: null, gPayNumber: null, receivedStatus: null, paymentProof: null, deliveryStatus: 'In Transit' },
  { key: 'DT-002', orderId: 'PO-2502', date: '2024-05-18', supplier: 'BioLife Ltd', item: 'Shampoo Concentrate', qty: 200, unit: 'Ltr', amount: 44000, lrNumber: 'LR-78915', lorryNo: 'KA-05-CD-5678', transportCompany: 'Blue Dart Logistics', lrCopyFile: 'LR_78915_BioLife.pdf', expectedDelivery: '2024-05-23', pickupEmpId: 'EMP-102', pickupEmpName: 'Suresh Babu', paymentStatus: 'Paid', takenStatus: 'taken', takenProof: 'proof_biolife.jpg', gPayNumber: '9876543210', receivedStatus: 'received', paymentProof: 'payment_biolife.pdf', deliveryStatus: 'Delivered' },
  { key: 'DT-003', orderId: 'PO-2503', date: '2024-05-22', supplier: 'PlastiPack', item: 'Shampoo Bottles (Flip 30ml)', qty: 5000, unit: 'Pcs', amount: 22500, lrNumber: 'LR-78930', lorryNo: 'DL-01-EF-9012', transportCompany: 'VRL Logistics', lrCopyFile: null, expectedDelivery: '2024-05-30', pickupEmpId: 'EMP-101', pickupEmpName: 'Ramesh Kumar', paymentStatus: 'Unpaid', takenStatus: null, takenProof: null, gPayNumber: null, receivedStatus: null, paymentProof: null, deliveryStatus: 'In Transit' },
  { key: 'DT-004', orderId: 'PO-2504', date: '2024-05-15', supplier: 'BoxWorld', item: 'Dental Kit Boxes', qty: 1000, unit: 'Pcs', amount: 12000, lrNumber: 'LR-78900', lorryNo: 'KA-09-GH-3456', transportCompany: 'DTDC Express', lrCopyFile: 'LR_78900_BoxWorld.pdf', expectedDelivery: '2024-05-20', pickupEmpId: 'EMP-103', pickupEmpName: 'Vijay Anand', paymentStatus: 'Unpaid', takenStatus: 'taken', takenProof: 'proof_boxworld.jpg', gPayNumber: '8765432109', receivedStatus: 'partial', paymentProof: null, deliveryStatus: 'Partial Delivery', missingItems: [{ key: 1, name: 'Dental Kit Boxes', ordered: 1000, received: 780, missing: 220 }], partialMissedBy: 'supplier', partialVendorAction: 'new_order', actionTakenStatus: null },
];

const MOCK_INVOICE_PRODUCTS = {
  'ChemCo India': [{ key: 1, name: 'Soap Base (White)', hsn: '3401', gst: '18%', originalQty: 500, unit: 'Kg', rate: 85, amount: 42500 }],
  'BioLife Ltd': [{ key: 1, name: 'Shampoo Concentrate', hsn: '3305', gst: '12%', originalQty: 200, unit: 'Ltr', rate: 220, amount: 44000 }],
  'PlastiPack': [
    { key: 1, name: 'Shampoo Bottles (Flip 30ml)', hsn: '3923', gst: '12%', originalQty: 3000, unit: 'Pcs', rate: 4.5, amount: 13500 },
    { key: 2, name: 'Flip Top Caps', hsn: '3923', gst: '12%', originalQty: 2000, unit: 'Pcs', rate: 4.5, amount: 9000 },
  ],
  'BoxWorld': [{ key: 1, name: 'Dental Kit Boxes', hsn: '4819', gst: '18%', originalQty: 1000, unit: 'Pcs', rate: 12, amount: 12000 }],
};

// ── Local Purchase mock data ─────────────────────────────────────────────────
const initLocalPurchases = [
  { key: 'LP-001', date: '2024-05-10', invoiceNo: 'INV-LOCAL-001', invoiceFile: 'invoice_local_001.pdf', vendorName: 'Marriott Mumbai', vendorPhone: '+91 22 6651 1234', items: [{ name: 'Cleaning Supplies', qty: 50, unit: 'Pcs', amount: 5000 }], totalAmount: 5000, paymentType: 'credit', paymentStatus: 'Pending', paymentProof: null, gPayNumber: null, gPayProof: null },
  { key: 'LP-002', date: '2024-05-12', invoiceNo: 'INV-LOCAL-002', invoiceFile: 'invoice_local_002.jpg', vendorName: 'Taj Hotels Delhi', vendorPhone: '+91 11 6600 7777', items: [{ name: 'Paper Towels', qty: 200, unit: 'Rolls', amount: 8000 }, { name: 'Liquid Soap', qty: 50, unit: 'Ltr', amount: 6000 }], totalAmount: 14000, paymentType: 'instant', paymentStatus: 'Paid', paymentProof: 'gpay_proof_LP002.jpg', gPayNumber: '9876543210', gPayProof: 'gpay_proof_LP002.jpg' },
  { key: 'LP-003', date: '2024-05-15', invoiceNo: 'INV-LOCAL-003', invoiceFile: null, vendorName: 'ITC Grand Kolkata', vendorPhone: '+91 33 2288 9999', items: [{ name: 'Housekeeping Kit', qty: 100, unit: 'Kits', amount: 15000 }], totalAmount: 15000, paymentType: 'credit', paymentStatus: 'Pending', paymentProof: null, gPayNumber: null, gPayProof: null },
];

// ── Vendor / Supplier complaint history mock data ────────────────────────────
const vendorComplaintsData = {
  'ChemCo India': [
    { id: 1, date: '2024-04-10', issue: 'Late delivery — 5 days delay on Soap Base order', severity: 'high', status: 'Open' },
    { id: 2, date: '2024-03-22', issue: 'Wrong quantity supplied — 450 Kg received instead of 500 Kg', severity: 'medium', status: 'Resolved' },
  ],
  'BioLife Ltd': [
    { id: 1, date: '2024-03-15', issue: 'Product quality mismatch — Shampoo Concentrate below spec', severity: 'high', status: 'Open' },
  ],
  'PlastiPack': [
    { id: 1, date: '2024-04-05', issue: 'Packaging damaged on arrival — 200 Pcs unusable', severity: 'medium', status: 'Resolved' },
    { id: 2, date: '2024-05-01', issue: 'Delivery delayed by 3 days without prior notice', severity: 'low', status: 'Open' },
  ],
  'Marriott Mumbai': [
    { id: 1, date: '2024-04-20', issue: 'Invoice amount mismatch — ₹500 overcharged on last order', severity: 'medium', status: 'Open' },
  ],
  'Taj Hotels Delhi': [
    { id: 1, date: '2024-03-10', issue: 'Items not delivered as per purchase order — Paper Towels missing', severity: 'high', status: 'Open' },
    { id: 2, date: '2024-02-28', issue: 'Payment receipt not provided after payment', severity: 'low', status: 'Resolved' },
  ],
};

// ── Printing Suppliers mock data ─────────────────────────────────────────────
const initPrintingSuppliers = [
  {
    key: 'PRN-001', type: 'Sticker', name: 'PrintFast Solutions', phone: '+91 98765 11111',
    email: 'info@printfast.in', taxId: 'GST29ABC123D1Z5', address: 'Mumbai, MH',
    bank: 'HDFC Bank — A/C 50100111111 | IFSC HDFC0001234', notes: 'Reliable sticker supplier',
    orders: [
      { key: 'PO-S001', date: '2024-05-01', item: 'Custom Stickers (Hotel Brand)', qty: 5000, unit: 'Pcs', amount: 6000, status: 'Delivered' },
      { key: 'PO-S002', date: '2024-05-12', item: 'Logo Stickers (Mini)', qty: 2000, unit: 'Pcs', amount: 2400, status: 'In Transit' },
    ],
  },
  {
    key: 'PRN-002', type: 'Box', name: 'BoxWorld Printers', phone: '+91 87654 22222',
    email: 'orders@boxworld.in', taxId: 'GST27XYZ456E2Z8', address: 'Bengaluru, KA',
    bank: 'Axis Bank — A/C 912010099999 | IFSC UTIB0000002', notes: 'Bulk box supplier',
    orders: [
      { key: 'PO-B001', date: '2024-04-20', item: 'Dental Kit Boxes', qty: 1000, unit: 'Pcs', amount: 12000, status: 'Delivered' },
      { key: 'PO-B002', date: '2024-05-08', item: 'Soap Gift Boxes', qty: 500, unit: 'Pcs', amount: 7500, status: 'Pending' },
    ],
  },
  {
    key: 'PRN-003', type: 'Ziplock', name: 'ZipSeal Industries', phone: '+91 76543 33333',
    email: 'sales@zipseal.in', taxId: 'GST24MNO789F3Z1', address: 'Delhi, DL',
    bank: 'SBI — A/C 30199887766 | IFSC SBIN0002345', notes: 'Ziplock bag manufacturer',
    orders: [
      { key: 'PO-Z001', date: '2024-05-05', item: 'Ziplock Bags (Small)', qty: 10000, unit: 'Pcs', amount: 5000, status: 'Delivered' },
      { key: 'PO-Z002', date: '2024-05-15', item: 'Ziplock Bags (Large)', qty: 5000, unit: 'Pcs', amount: 4000, status: 'In Transit' },
    ],
  },
];

export default function Purchase() {
  const isDark = useSelector((s) => s.theme.isDark);
  const dispatch = useDispatch();
  const raisedRequests = useSelector((s) => s.purchase.raisedRequests);
  const purchaseOrders = useSelector((s) => s.purchase.purchaseOrders);
  const newProductRequests = useSelector((s) => s.purchase.newProductRequests);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [suppliers, setSuppliers] = useState(suppliersList);
  const [vendors, setVendors] = useState(vendorsList);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [supplierDateRange, setSupplierDateRange] = useState(null);

  const [supplierForm] = Form.useForm();

  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseForm] = Form.useForm();

  const [showRequestOrderModal, setShowRequestOrderModal] = useState(false);
  const [selectedApprovedRequest, setSelectedApprovedRequest] = useState(null);
  const [viewApprovalDoc, setViewApprovalDoc] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [requestOrderForm] = Form.useForm();
  const [requestOrderScanLoading, setRequestOrderScanLoading] = useState(false);
  const [requestOrderScannedFile, setRequestOrderScannedFile] = useState(null);

  /* â"€â"€ History material search â"€â"€ */
  const [supplierHistorySearch, setSupplierHistorySearch] = useState('');

  /* â"€â"€ AI scan state â"€â"€ */
  const [supplierScanLoading, setSupplierScanLoading] = useState(false);
  const [supplierScannedFile, setSupplierScannedFile] = useState(null);
  const [quotationFile, setQuotationFile] = useState(null);
  const [quotationScanLoading, setQuotationScanLoading] = useState(false);

  /* â"€â"€ Raise Request modal (separate from Ask Quotation) â"€â"€ */
  const [showRaiseRequestModal, setShowRaiseRequestModal] = useState(false);
  const [raiseRequestProduct, setRaiseRequestProduct] = useState(null);
  const [raiseRequestSupplier, setRaiseRequestSupplier] = useState(null);
  const [raiseRequestFile, setRaiseRequestFile] = useState(null);
  const [raiseRequestScanLoading, setRaiseRequestScanLoading] = useState(false);
  const [raiseRequestPaymentTerms, setRaiseRequestPaymentTerms] = useState('');
  const [raiseRequestForm] = Form.useForm();

  /* â"€â"€ WhatsApp sent tracking for stock status flow (key 1 pre-seeded for demo) â"€â"€ */
  const [whatsappSentItems, setWhatsappSentItems] = useState(new Set([1]));

  /* â"€â"€ Place Order modal â"€â"€ */
  const [showPlaceOrderModal, setShowPlaceOrderModal] = useState(false);
  const [selectedPlaceOrderItem, setSelectedPlaceOrderItem] = useState(null);
  const [selectedPlaceOrderReq, setSelectedPlaceOrderReq] = useState(null);

  /* â"€â"€ Request Order payment terms watch â"€â"€ */
  const [requestOrderPaymentTerms, setRequestOrderPaymentTerms] = useState('');

  /* â"€â"€ Payment type (Immediate / Credit) in Request Order â"€â"€ */
  const [orderPaymentType, setOrderPaymentType] = useState('Immediate');

  /* â"€â"€ Bulk Purchase modal â"€â"€ */
  const [showBulkPurchaseModal, setShowBulkPurchaseModal] = useState(false);
  const [bulkSupplierName, setBulkSupplierName] = useState('');
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkPayTerms, setBulkPayTerms] = useState('');
  const [bulkQuotationAsked, setBulkQuotationAsked] = useState(false);
  const [bulkRaiseFile, setBulkRaiseFile] = useState(null);
  const [bulkRaiseScanLoading, setBulkRaiseScanLoading] = useState(false);

  /* â"€â"€ WhatsApp reminder tracking (30-min intervals per inventory item key) â"€â"€ */
  const reminderIntervalsRef = useRef({});
  const [reminderCounts, setReminderCounts] = useState({});   // { itemKey: count }
  const [activeReminders, setActiveReminders] = useState(new Set()); // item keys with active reminders

  /* â"€â"€ Inventory item notes (stock_status tab) â"€â"€ */
  const [invItemNotes, setInvItemNotes] = useState({});    // { itemKey: [{text, ts}] }
  const [invNoteInput, setInvNoteInput] = useState({});    // { itemKey: string }
  const [openInvNotes, setOpenInvNotes] = useState(null);  // itemKey whose notes panel is open

  /* â"€â"€ Raised-request notes â"€â"€ */
  const [openReqNotes, setOpenReqNotes] = useState(null);  // requestKey
  const [reqNoteInput, setReqNoteInput] = useState('');

  /* â"€â"€ Inline qty edit for raised requests â"€â"€ */
  const [editingReqKey, setEditingReqKey] = useState(null);
  const [editQtyValue, setEditQtyValue] = useState(1);

  /* â"€â"€ Finance status mock modal (demo: allow setting finance status) â"€â"€ */
  const [showFinanceStatusModal, setShowFinanceStatusModal] = useState(false);
  const [financeStatusTarget, setFinanceStatusTarget] = useState(null);
  const [financeNoteInput, setFinanceNoteInput] = useState('');
  const [financeDecision, setFinanceDecision] = useState('');

  /* â"€â"€ Track keys whose qty was recently edited (show Re-request button) â"€â"€ */
  const [recentlyEditedKeys, setRecentlyEditedKeys] = useState(new Set());

  /* â"€â"€ Edit Quotation modal (general edit + resend) â"€â"€ */
  const [showEditQuotationModal, setShowEditQuotationModal] = useState(false);
  const [editQuotationTarget, setEditQuotationTarget] = useState(null);
  const [editReqForm] = Form.useForm();

  /* â"€â"€ Multi-select extra products for Ask Quotation modal â"€â"€ */
  const [quotationExtraProducts, setQuotationExtraProducts] = useState([]);
  const [quotationExtraQtys, setQuotationExtraQtys] = useState({});

  /* â"€â"€ Multi-select extra products for Raise Request modal â"€â"€ */
  const [raiseRequestExtraProducts, setRaiseRequestExtraProducts] = useState([]);
  const [raiseRequestExtraQtys, setRaiseRequestExtraQtys] = useState({});
  const [orderCreditDate, setOrderCreditDate] = useState(null);
  const [placeOrderFiftyDate, setPlaceOrderFiftyDate] = useState(null);

  /* â"€â"€ LR Tracking modal â"€â"€ */
  const [showLRModal, setShowLRModal] = useState(false);
  const [lrOrder, setLrOrder] = useState(null);
  const [lrNumber, setLrNumber] = useState('');
  const [lrReminderDate, setLrReminderDate] = useState(null);

  /* LR Upload column (stock_status table) */
  const [lrData, setLrData] = useState({});
  const [showLRUploadModal, setShowLRUploadModal] = useState(false);
  const [lrUploadTarget, setLrUploadTarget] = useState(null);
  const [lrUploadForm] = Form.useForm();

  /* â"€â"€ "Verified by" for received orders â"€â"€ */
  const [verifiedByName, setVerifiedByName] = useState('');

  /* ── Quotation Comparison tab ── */
  const [quotCompareFiles, setQuotCompareFiles] = useState([]);
  const [quotCompareLoading, setQuotCompareLoading] = useState(false);
  const [quotCompareResult, setQuotCompareResult] = useState(null);

  /* ── Dispatch Order Tracking tab state ── */
  const [dispatchTrackingOrders, setDispatchTrackingOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hng_dispatch_tracking') || 'null') || initDispatchTrackingOrders; } catch { return initDispatchTrackingOrders; }
  });
  useEffect(() => { localStorage.setItem('hng_dispatch_tracking', JSON.stringify(dispatchTrackingOrders)); }, [dispatchTrackingOrders]);

  const [showTakenModal, setShowTakenModal] = useState(false);
  const [takenTarget, setTakenTarget] = useState(null);
  const [takenForm] = Form.useForm();

  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [receivedTarget, setReceivedTarget] = useState(null);
  const [invoiceScanLoading, setInvoiceScanLoading] = useState(false);
  const [invoiceScanned, setInvoiceScanned] = useState(false);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [productQtys, setProductQtys] = useState({});
  const [productNotes, setProductNotes] = useState({});
  const [partialReceived, setPartialReceived] = useState(false);
  const [missedBy, setMissedBy] = useState(null);
  const [vendorMissedAction, setVendorMissedAction] = useState(null);
  const [customActionOptions, setCustomActionOptions] = useState(['Completely Received']);
  const [newActionInput, setNewActionInput] = useState('');
  const [prevOrdersDelivered, setPrevOrdersDelivered] = useState(null);
  const [viewLRCopyModal, setViewLRCopyModal] = useState(null);

  /* ── Place Order — LR copy reminder after send ── */
  const [showPlaceOrderSuccess, setShowPlaceOrderSuccess] = useState(false);
  const [lrCopyReminderChecked, setLrCopyReminderChecked] = useState(false);
  const [lrCopyReminderCount, setLrCopyReminderCount] = useState(0);
  const lrCopyReminderRef = useRef(null);

  const closePlaceOrderModal = () => {
    if (lrCopyReminderRef.current) { clearInterval(lrCopyReminderRef.current); lrCopyReminderRef.current = null; }
    setShowPlaceOrderModal(false);
    setSelectedPlaceOrderItem(null);
    setSelectedPlaceOrderReq(null);
    setPlaceOrderFiftyDate(null);
    setShowPlaceOrderSuccess(false);
    setLrCopyReminderChecked(false);
    setLrCopyReminderCount(0);
  };

  const toggleLrCopyReminder = (checked) => {
    setLrCopyReminderChecked(checked);
    if (checked) {
      setLrCopyReminderCount(0);
      lrCopyReminderRef.current = setInterval(() => {
        setLrCopyReminderCount(c => c + 1);
        notification.warning({
          message: 'LR Copy Pending',
          description: `Please collect the LR copy from the purchase team for the order placed with ${selectedPlaceOrderReq?.supplier || 'supplier'}.`,
          placement: 'topRight',
          duration: 10,
          key: 'lr-copy-reminder',
        });
      }, 30 * 60 * 1000);
      message.info('30-minute LR copy reminder is now active.', 4);
    } else {
      if (lrCopyReminderRef.current) { clearInterval(lrCopyReminderRef.current); lrCopyReminderRef.current = null; }
    }
  };

  const openReceivedModal = (record) => {
    setReceivedTarget(record);
    setInvoiceScanned(false);
    setInvoiceProducts([]);
    setProductQtys({});
    setProductNotes({});
    setPartialReceived(false);
    setMissedBy(null);
    setVendorMissedAction(null);
    setPrevOrdersDelivered(null);
    setShowReceivedModal(true);
  };

  const handleInvoiceScan = () => {
    if (!receivedTarget) return;
    setInvoiceScanLoading(true);
    setTimeout(() => {
      const products = MOCK_INVOICE_PRODUCTS[receivedTarget.supplier] || [{ key: 1, name: receivedTarget.item, hsn: '3401', gst: '18%', originalQty: receivedTarget.qty, unit: receivedTarget.unit, rate: Math.round(receivedTarget.amount / receivedTarget.qty), amount: receivedTarget.amount }];
      setInvoiceProducts(products);
      const qtys = {};
      products.forEach(p => { qtys[p.key] = p.originalQty; });
      setProductQtys(qtys);
      setInvoiceScanned(true);
      setInvoiceScanLoading(false);
      message.success('Invoice scanned — products fetched successfully!');
    }, 1800);
  };

  const getMissingItems = () => invoiceProducts.filter(p => (productQtys[p.key] || 0) < p.originalQty)
    .map(p => ({ ...p, receivedQty: productQtys[p.key] || 0, missingQty: p.originalQty - (productQtys[p.key] || 0) }));

  const handleConfirmReceived = () => {
    if (!receivedTarget) return;
    const missing = getMissingItems();
    const isPartial = missing.length > 0;
    const newStatus = isPartial ? 'partial' : 'received';
    const newDelivery = isPartial ? 'Partial Delivery' : 'Delivered';
    setDispatchTrackingOrders(prev => prev.map(o => o.key === receivedTarget.key ? {
      ...o,
      receivedStatus: newStatus,
      deliveryStatus: newDelivery,
      missingItems: missing.length > 0 ? missing.map(m => ({ key: m.key, name: m.name, ordered: m.originalQty, received: m.receivedQty, missing: m.missingQty })) : [],
      partialVendorAction: vendorMissedAction,
      partialMissedBy: missedBy,
    } : o));
    message.success(missing.length > 0 ? 'Partial delivery recorded!' : 'Order marked as Received!');
    setShowReceivedModal(false);
    setReceivedTarget(null);
  };

  /* ── Purchase Expense tab state ── */
  const [purchaseExpenses, setPurchaseExpenses] = useState([
    { key: 1, date: '2024-05-01', invoice_no: 'INV-CHEM-101', supplier: 'ChemCo India', qty: '100 Kg', paid_status: 'Paid', paid_amount: 8500, total_amount: 8500, remaining: 0 },
    { key: 2, date: '2024-05-04', invoice_no: 'INV-BIO-452', supplier: 'BioLife Ltd', qty: '200 Ltr', paid_status: 'Partially Paid', paid_amount: 22000, total_amount: 44000, remaining: 22000 },
    { key: 3, date: '2024-05-06', invoice_no: 'INV-PP-203', supplier: 'PlastiPack', qty: '500 Pcs', paid_status: 'Unpaid', paid_amount: 0, total_amount: 2250, remaining: 2250 },
  ]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseScanFile, setExpenseScanFile] = useState(null);
  const [expenseScanLoading, setExpenseScanLoading] = useState(false);
  const [expenseForm] = Form.useForm();

  /* ── Search & Filter state (per-tab) ── */
  const [stockSearch, setStockSearch] = useState('');
  const [stockReqStatusFilter, setStockReqStatusFilter] = useState(null);
  const [dtSearch, setDtSearch] = useState('');
  const [dtDeliveryFilter, setDtDeliveryFilter] = useState(null);
  const [dtPayFilter, setDtPayFilter] = useState(null);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePaidFilter, setExpensePaidFilter] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [localPayFilter, setLocalPayFilter] = useState(null);

  /* ── Local Purchase tab state ── */
  const [localPurchases, setLocalPurchases] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hng_local_purchases') || 'null') || initLocalPurchases; } catch { return initLocalPurchases; }
  });
  const [showAddLocalPurchaseModal, setShowAddLocalPurchaseModal] = useState(false);
  const [localPurchaseForm] = Form.useForm();
  const [localPurchasePaymentType, setLocalPurchasePaymentType] = useState('credit');
  const [localPurchasePaidBy, setLocalPurchasePaidBy] = useState('');
  const [localPurchaseScanLoading, setLocalPurchaseScanLoading] = useState(false);
  const [localPurchaseInvoiceFile, setLocalPurchaseInvoiceFile] = useState(null);
  const [localPurchaseScannedDetails, setLocalPurchaseScannedDetails] = useState(null);
  const [localPurchaseNewVendorDetected, setLocalPurchaseNewVendorDetected] = useState(false);
  const localPurchaseNotifyRef = useRef({});
  const [localPurchaseDetailView, setLocalPurchaseDetailView] = useState(null);

  /* ── Inline Add Supplier / Vendor from dropdown ── */
  const [showAddSupplierInlineModal, setShowAddSupplierInlineModal] = useState(false);
  const [addSupplierInlineForm] = Form.useForm();
  const [showAddVendorInlineModal, setShowAddVendorInlineModal] = useState(false);
  const [addVendorInlineForm] = Form.useForm();
  const [inlineDropdownContext, setInlineDropdownContext] = useState(''); // which dropdown triggered it

  /* â"€â"€ Camera capture (shared across all scan sections) â"€â"€ */
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

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.phone.includes(supplierSearch)
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

  const purchases = [
    {
      key: 1,
      date: '2024-05-01',
      bill_no: 'PUR-8821',
      inv_no: 'INV-CHEM-101',
      invoice_file: 'INV-CHEM-101.pdf',
      items: [
        { name: 'Soap Base (White)', qty: '100 Kg', price: '₹85/Kg', total: '₹8,500' },
      ],
      entity: 'ChemCo India',
      amount: '₹8,500',
      paid_status: 'Paid',
      paid_amount: 8500,
      remaining: 0,
      status: 'Paid',
      req_status: 'Confirmed'
    },
    {
      key: 2,
      date: '2024-05-04',
      bill_no: 'PUR-8825',
      inv_no: 'INV-BIO-452',
      invoice_file: 'INV-BIO-452.pdf',
      items: [
        { name: 'Shampoo Concentrate', qty: '200 Ltr', price: '₹220/Ltr', total: '₹44,000' }
      ],
      entity: 'BioLife Ltd',
      amount: '₹44,000',
      paid_status: 'Partially Paid',
      paid_amount: 22000,
      remaining: 22000,
      status: 'Unpaid',
      req_status: 'Pending'
    },
    {
      key: 3,
      date: '2024-05-06',
      bill_no: 'PUR-8830',
      inv_no: 'INV-PP-203',
      invoice_file: null,
      items: [
        { name: 'Shampoo Bottles (Flip 30ml)', qty: '500 Pcs', price: '₹4.5/Pc', total: '₹2,250' },
        { name: 'Flip Top Caps', qty: '500 Pcs', price: '₹2/Pc', total: '₹1,000' },
      ],
      entity: 'PlastiPack',
      amount: '₹3,250',
      paid_status: 'Unpaid',
      paid_amount: 0,
      remaining: 3250,
      status: 'Unpaid',
      req_status: 'Confirmed'
    },
    {
      key: 4,
      date: '2024-05-08',
      bill_no: 'PUR-8835',
      inv_no: 'INV-BW-101',
      invoice_file: 'INV-BW-101.jpg',
      items: [
        { name: 'Dental Kit Boxes', qty: '1000 Pcs', price: '₹12/Pc', total: '₹12,000' },
      ],
      entity: 'BoxWorld',
      amount: '₹12,000',
      paid_status: 'Paid',
      paid_amount: 12000,
      remaining: 0,
      status: 'Paid',
      req_status: 'Confirmed'
    },
  ];

  const handleOpenRequest = (product) => {
    setSelectedProduct(product);
    setSelectedSupplier(null);
    setQuotationExtraProducts([]);
    setQuotationExtraQtys({});
    const suggestQty = product.min > product.current ? (product.min - product.current) * 2 : product.min;
    purchaseForm.setFieldsValue({
      product: product.name,
      product_code: product.code || '',
      qty: suggestQty,
      unit: product.unit
    });
    setShowAddPurchaseModal(true);
  };

  const handleRaiseRequest = (values) => {
    const newRequest = {
      key: Date.now(),
      item: values.product,
      supplier: values.supplier,
      qty: values.qty,
      unit: values.unit || (selectedProduct?.unit || ''),
      payment_terms: values.payment_terms,
      date: dayjs().format('YYYY-MM-DD'),
    };
    dispatch(addRaisedRequest(newRequest));
    message.success(`Purchase request for ${values.product} raised — pending financial approval`);
    setShowAddPurchaseModal(false);
    purchaseForm.resetFields();
    setSelectedProduct(null);
  };

  const handleRequestOrder = (values) => {
    dispatch(raiseOrder({
      requestKey: selectedApprovedRequest.key,
      bill_no: values.bill_no,
      inv_no: values.inv_no || '',
      price: values.unit_price,
      amount: values.total_amount,
      orderDate: values.order_date ? values.order_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    }));
    message.success(`Order for ${selectedApprovedRequest.item} submitted to Financial for payment`);
    setShowRequestOrderModal(false);
    requestOrderForm.resetFields();
    setSelectedApprovedRequest(null);
    setRequestOrderScannedFile(null);
  };

  const handleRequestOrderAIScan = () => {
    if (!requestOrderScannedFile) { message.warning('Please upload an invoice first'); return; }
    setRequestOrderScanLoading(true);
    setTimeout(() => {
      const suggestedPrice = selectedApprovedRequest ? Math.floor(Math.random() * 100 + 50) : 85;
      requestOrderForm.setFieldsValue({
        bill_no: 'PUR-' + Math.floor(Math.random() * 9000 + 1000),
        inv_no: 'INV-' + Math.floor(Math.random() * 9000 + 1000),
        unit_price: suggestedPrice,
        total_amount: selectedApprovedRequest ? suggestedPrice * selectedApprovedRequest.qty : 9500,
        order_date: dayjs(),
      });
      setRequestOrderScanLoading(false);
      message.success('AI extracted invoice details successfully!');
    }, 2200);
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

  const handleQuotationAI = () => {
    if (!quotationFile) { message.warning('Please upload a quotation file first'); return; }
    setQuotationScanLoading(true);
    setTimeout(() => {
      const vals = purchaseForm.getFieldsValue();
      if (!vals.product || !vals.supplier) {
        setQuotationScanLoading(false);
        message.warning('Please select product and supplier first');
        return;
      }
      const newRequest = {
        key: Date.now(),
        item: vals.product,
        supplier: vals.supplier,
        qty: vals.qty || 0,
        unit: vals.unit || (selectedProduct?.unit || ''),
        payment_terms: 'From Quotation',
        date: dayjs().format('YYYY-MM-DD'),
        quotation_file: quotationFile.name,
      };
      dispatch(addRaisedRequest(newRequest));
      setQuotationScanLoading(false);
      message.success('Quotation scanned by AI and sent to Financial Quotation Requests!');
      setShowAddPurchaseModal(false);
      purchaseForm.resetFields();
      setSelectedProduct(null);
      setSelectedSupplier(null);
      setQuotationFile(null);
    }, 2200);
  };

  const handleOpenRaiseRequest = (product) => {
    setRaiseRequestProduct(product);
    setRaiseRequestSupplier(null);
    setRaiseRequestFile(null);
    setRaiseRequestPaymentTerms('');
    setRaiseRequestExtraProducts([]);
    setRaiseRequestExtraQtys({});
    const suggestQty = product.min > product.current ? (product.min - product.current) * 2 : product.min;
    raiseRequestForm.resetFields();
    raiseRequestForm.setFieldsValue({ product: product.name, product_code: product.code || '', qty: suggestQty, unit: product.unit });
    setShowRaiseRequestModal(true);
  };

  const handleRaiseRequestAIScan = () => {
    if (!raiseRequestFile) { message.warning('Please upload the quotation file first'); return; }
    setRaiseRequestScanLoading(true);
    setTimeout(() => {
      const suggestQty = raiseRequestProduct
        ? (raiseRequestProduct.min > raiseRequestProduct.current ? (raiseRequestProduct.min - raiseRequestProduct.current) * 2 : raiseRequestProduct.min)
        : 0;
      raiseRequestForm.setFieldsValue({ payment_terms: '100% Payment', qty: suggestQty });
      setRaiseRequestPaymentTerms('100% Payment');
      setRaiseRequestScanLoading(false);
      message.success('AI extracted details from the quotation file!');
    }, 2000);
  };

  const handleRaiseRequestSubmit = () => {
    raiseRequestForm.validateFields().then((values) => {
      if (!raiseRequestFile) { message.warning('Please upload a quotation file to raise a request'); return; }
      // Main product request
      dispatch(addRaisedRequest({
        key: Date.now(),
        item: values.product,
        supplier: values.supplier,
        qty: values.qty || 0,
        unit: values.unit || (raiseRequestProduct?.unit || ''),
        payment_terms: values.payment_terms || 'From Quotation',
        date: dayjs().format('YYYY-MM-DD'),
        quotation_file: raiseRequestFile.name,
      }));
      // Additional selected products
      raiseRequestExtraProducts.forEach(productName => {
        const invItem = inventory.find(i => i.name === productName);
        dispatch(addRaisedRequest({
          key: Date.now() + Math.random(),
          item: productName,
          supplier: values.supplier,
          qty: raiseRequestExtraQtys[productName] || invItem?.min || 1,
          unit: invItem?.unit || 'Pcs',
          payment_terms: values.payment_terms || 'From Quotation',
          date: dayjs().format('YYYY-MM-DD'),
          quotation_file: raiseRequestFile.name,
        }));
      });
      const totalCount = 1 + raiseRequestExtraProducts.length;
      message.success(`${totalCount} request(s) sent to Financial Quotation!`);
      setShowRaiseRequestModal(false);
      raiseRequestForm.resetFields();
      setRaiseRequestProduct(null);
      setRaiseRequestSupplier(null);
      setRaiseRequestFile(null);
      setRaiseRequestPaymentTerms('');
      setRaiseRequestExtraProducts([]);
      setRaiseRequestExtraQtys({});
    });
  };

  /* ── Local Purchase handlers ── */
  const handleLocalPurchaseInvoiceScan = () => {
    if (!localPurchaseInvoiceFile) { message.warning('Please upload an invoice first'); return; }
    setLocalPurchaseScanLoading(true);
    setTimeout(() => {
      const mockVendorNames = ['Marriott Mumbai', 'Taj Hotels Delhi', 'ITC Grand Kolkata', 'Hyatt Chennai'];
      const isKnownVendor = Math.random() > 0.3;
      const vendorName = isKnownVendor ? mockVendorNames[Math.floor(Math.random() * mockVendorNames.length)] : 'New Vendor Pvt. Ltd.';
      const knownVendor = vendors.find(v => v.name === vendorName);
      const scanned = {
        invoiceNo: 'INV-' + Math.floor(Math.random() * 90000 + 10000),
        vendorName,
        vendorPhone: knownVendor?.phone || '+91 99000 ' + Math.floor(Math.random() * 89999 + 10000),
        vendorAddress: knownVendor?.address || 'New City, India',
        vendorGST: '27AAB' + Math.random().toString(36).substring(2, 7).toUpperCase() + '1Z5',
        items: [
          { name: 'Office Supplies', qty: 20, unit: 'Pcs', amount: 3000 },
          { name: 'Cleaning Materials', qty: 10, unit: 'Kg', amount: 2500 },
        ],
        totalAmount: 5500,
        isNewVendor: !knownVendor,
      };
      setLocalPurchaseScannedDetails(scanned);
      setLocalPurchaseNewVendorDetected(!knownVendor);
      localPurchaseForm.setFieldsValue({
        invoiceNo: scanned.invoiceNo,
        vendorName: scanned.vendorName,
        vendorPhone: scanned.vendorPhone,
        totalAmount: scanned.totalAmount,
      });
      setLocalPurchaseScanLoading(false);
      message.success(!knownVendor
        ? 'AI scanned invoice — New vendor detected! Review and add to vendors list.'
        : 'AI scanned invoice — vendor matched in existing vendors list.');
    }, 2000);
  };

  const handleAddLocalPurchase = (values) => {
    const newLP = {
      key: 'LP-' + Date.now(),
      date: dayjs().format('YYYY-MM-DD'),
      invoiceNo: values.invoiceNo || localPurchaseScannedDetails?.invoiceNo || 'INV-' + Date.now(),
      invoiceFile: localPurchaseInvoiceFile?.name || null,
      vendorName: values.vendorName || localPurchaseScannedDetails?.vendorName || '',
      vendorPhone: values.vendorPhone || localPurchaseScannedDetails?.vendorPhone || '',
      items: localPurchaseScannedDetails?.items || [{ name: values.itemName || 'Item', qty: values.qty || 1, unit: values.unit || 'Pcs', amount: values.totalAmount || 0 }],
      totalAmount: values.totalAmount || localPurchaseScannedDetails?.totalAmount || 0,
      paymentType: values.paymentType || 'credit',
      paymentStatus: values.paymentType === 'instant' ? 'Paid' : 'Pending',
      paymentProof: values.paymentType === 'instant' ? (values.proof?.fileList?.[0]?.name || null) : null,
      gPayNumber: values.paymentType === 'instant' ? (values.gPayNumber || null) : null,
      paidBy: values.paymentType === 'instant' ? (values.paidBy || '') : null,
      paymentProofFile: values.paymentType === 'instant' ? (values.paymentProofFile?.fileList?.[0]?.name || null) : null,
    };

    if (localPurchaseNewVendorDetected && values.addToVendors) {
      const newVendor = {
        id: Date.now(),
        name: newLP.vendorName,
        phone: newLP.vendorPhone,
        email: '',
        address: localPurchaseScannedDetails?.vendorAddress || '',
        totalPaid: 0,
        pending: newLP.paymentStatus === 'Pending' ? newLP.totalAmount : 0,
      };
      setVendors(prev => [...prev, newVendor]);
      message.success('New vendor added to vendors list!');
    }

    if (newLP.paymentType === 'credit') {
      // Notify financial team every 30 minutes
      const intervalId = setInterval(() => {
        notification.info({
          message: 'Local Purchase Pending Payment',
          description: `Local purchase ${newLP.invoiceNo} from ${newLP.vendorName} of ₹${newLP.totalAmount.toLocaleString()} is pending. Please process payment.`,
          placement: 'topRight',
          duration: 8,
        });
      }, 30 * 60 * 1000);
      localPurchaseNotifyRef.current[newLP.key] = intervalId;
      // Save to localStorage for Financial page
      const pending = JSON.parse(localStorage.getItem('hng_local_purchase_pending') || '[]');
      localStorage.setItem('hng_local_purchase_pending', JSON.stringify([...pending, newLP]));
      message.info('Credit purchase created — financial team will be notified every 30 minutes.', 5);
    }

    const updated = [...localPurchases, newLP];
    setLocalPurchases(updated);
    localStorage.setItem('hng_local_purchases', JSON.stringify(updated));
    setShowAddLocalPurchaseModal(false);
    localPurchaseForm.resetFields();
    setLocalPurchaseInvoiceFile(null);
    setLocalPurchaseScannedDetails(null);
    setLocalPurchaseNewVendorDetected(false);
    setLocalPurchasePaymentType('credit');
    setLocalPurchasePaidBy('');
    message.success('Local purchase recorded successfully!');
  };

  const handleAddSupplierInline = () => {
    addSupplierInlineForm.validateFields().then(vals => {
      const newSup = { id: Date.now(), name: vals.name, phone: vals.phone || '', email: vals.email || '', address: vals.address || '', bank: vals.bank || '' };
      setSuppliers(prev => [...prev, newSup]);
      setShowAddSupplierInlineModal(false);
      addSupplierInlineForm.resetFields();
      message.success(`Supplier "${vals.name}" added!`);
    });
  };

  const handleAddVendorInline = () => {
    addVendorInlineForm.validateFields().then(vals => {
      const newVend = { id: Date.now(), name: vals.name, phone: vals.phone || '', email: vals.email || '', address: vals.address || '', totalPaid: 0, pending: 0 };
      setVendors(prev => [...prev, newVend]);
      setShowAddVendorInlineModal(false);
      addVendorInlineForm.resetFields();
      message.success(`Vendor "${vals.name}" added!`);
    });
  };

  const handleBulkSupplierSelect = (supplierName) => {
    setBulkSupplierName(supplierName);
    setBulkQuotationAsked(false);
    setBulkRaiseFile(null);
    const supplierItems = inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.seller === supplierName);
    const otherLowStock = inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.seller !== supplierName);
    const allItems = [...supplierItems, ...otherLowStock];
    setBulkItems(allItems.map(i => ({
      invKey: i.key,
      name: i.name,
      unit: i.unit,
      category: i.category || 'Other',
      currentStock: i.current,
      minStock: i.min,
      status: i.status,
      fromSupplier: i.seller === supplierName,
      selected: i.seller === supplierName,
      qty: i.min > i.current ? Math.max((i.min - i.current) * 2, i.min) : i.min,
    })));
  };

  const handleBulkAskQuotation = () => {
    const selected = bulkItems.filter(i => i.selected && i.qty > 0);
    if (selected.length === 0) { message.warning('Select at least one product'); return; }
    if (!bulkSupplierName) { message.warning('Select a supplier first'); return; }
    if (!bulkPayTerms) { message.warning('Select payment terms'); return; }
    const supplierInfo = suppliers.find(s => s.name === bulkSupplierName);
    if (supplierInfo?.phone) {
      const itemLines = selected.map(i => `• ${i.name} — Qty: ${i.qty} ${i.unit}`).join('\n');
      const waMsg = `Hello ${bulkSupplierName},\n\nWe would like to request a quotation for the following items:\n\n${itemLines}\n\nPayment Terms: ${bulkPayTerms}\n\nKindly share your best prices at the earliest convenience.\n\nThank you.`;
      const phone = supplierInfo.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
    }
    setBulkQuotationAsked(true);
    message.success('Quotation request sent to supplier via WhatsApp!');
  };

  const handleBulkRaiseRequest = () => {
    if (!bulkRaiseFile) { message.warning('Please upload the quotation file received from the supplier'); return; }
    const selected = bulkItems.filter(i => i.selected && i.qty > 0);
    if (selected.length === 0) { message.warning('Select at least one product'); return; }
    if (!bulkSupplierName) { message.warning('Select a supplier first'); return; }
    if (!bulkPayTerms) { message.warning('Select payment terms'); return; }
    dispatch(addBulkRequests(selected.map(item => ({
      item: item.name,
      supplier: bulkSupplierName,
      qty: item.qty,
      unit: item.unit,
      category: item.category || 'Other',
      payment_terms: bulkPayTerms,
      date: dayjs().format('YYYY-MM-DD'),
      quotation_file: bulkRaiseFile.name,
    }))));
    message.success(`${selected.length} bulk purchase request(s) raised — sent to Financial for approval!`);
    setShowBulkPurchaseModal(false);
    setBulkSupplierName('');
    setBulkItems([]);
    setBulkPayTerms('');
    setBulkQuotationAsked(false);
    setBulkRaiseFile(null);
  };

  // â"€â"€ WhatsApp reminder helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const startQuotationReminder = (itemKey, itemName, supplierName) => {
    // Clear any existing reminder for this item
    if (reminderIntervalsRef.current[itemKey]) {
      clearInterval(reminderIntervalsRef.current[itemKey]);
    }
    setReminderCounts(prev => ({ ...prev, [itemKey]: 0 }));
    setActiveReminders(prev => new Set([...prev, itemKey]));

    const intervalId = setInterval(() => {
      setReminderCounts(prev => {
        const newCount = (prev[itemKey] || 0) + 1;
        notification.warning({
          message: 'Quotation Reminder',
          description: `Follow up with supplier for "${itemName}" quotation. This is reminder #${newCount}.`,
          icon: <BellOutlined style={{ color: '#fa8c16' }} />,
          duration: 8,
          key: `reminder_${itemKey}`,
        });
        return { ...prev, [itemKey]: newCount };
      });
    }, 30 * 60 * 1000); // 30 minutes

    reminderIntervalsRef.current[itemKey] = intervalId;
  };

  const stopQuotationReminder = (itemKey) => {
    if (reminderIntervalsRef.current[itemKey]) {
      clearInterval(reminderIntervalsRef.current[itemKey]);
      delete reminderIntervalsRef.current[itemKey];
    }
    setActiveReminders(prev => { const s = new Set(prev); s.delete(itemKey); return s; });
    setReminderCounts(prev => { const n = { ...prev }; delete n[itemKey]; return n; });
  };

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => { Object.values(reminderIntervalsRef.current).forEach(clearInterval); };
  }, []);

  // â"€â"€ Add inventory-item note helper â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleAddInvNote = (itemKey) => {
    const text = (invNoteInput[itemKey] || '').trim();
    if (!text) return;
    const ts = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    setInvItemNotes(prev => ({
      ...prev,
      [itemKey]: [...(prev[itemKey] || []), { text, ts }],
    }));
    setInvNoteInput(prev => ({ ...prev, [itemKey]: '' }));
  };

  // â"€â"€ Add raised-request note helper â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleAddReqNote = (requestKey) => {
    const text = reqNoteInput.trim();
    if (!text) return;
    const ts = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    dispatch(addRequestNote({ key: requestKey, text, timestamp: ts }));
    setReqNoteInput('');
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
                  label: <Space><WarningOutlined /> Quotation & Raise Request</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      {/* â"€â"€ New Product Requests from Sales â"€â"€ */}
                      {newProductRequests.length > 0 && (
                        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px solid #fa8c1666', background: isDark ? '#1a1500' : '#fffbe6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                            <Space>
                              <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                              <Text strong style={{ color: '#d46b08', fontSize: 13 }}>New Product Requests from Sales</Text>
                              <Tag color="warning" style={{ borderRadius: 10 }}>{newProductRequests.length} New</Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 11 }}>Sales team listed new products — raise purchase requests below</Text>
                          </div>
                          <Table
                            size="small"
                            dataSource={newProductRequests}
                            pagination={false}
                            rowKey="key"
                            scroll={{ x: 900 }}
                            columns={[
                              { title: 'Product Name', dataIndex: 'productName', key: 'productName', width: 180, render: v => <Text strong style={{ color: '#d46b08', fontSize: 13 }}>{v}</Text> },
                              { title: 'Qty (from Sales)', dataIndex: 'qty', key: 'qty', render: (v) => v || '—' },
                              { title: 'Hotel / Customer', dataIndex: 'hotelName', key: 'hotelName', render: v => v || '—' },
                              { title: 'Sales Person', dataIndex: 'salesPerson', key: 'salesPerson', render: v => v || '—' },
                              { title: 'Quotation Ref', dataIndex: 'fromOrder', key: 'fromOrder', render: v => <Text style={{ color: '#B11E6A', fontSize: 11 }}>{v}</Text> },
                              { title: 'Date', dataIndex: 'date', key: 'date' },
                              {
                                title: 'Action', key: 'action',
                                render: (_, r) => (
                                  <Space>
                                    <Button
                                      size="small"
                                      type="primary"
                                      icon={<PlusOutlined />}
                                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                                      onClick={() => {
                                        const fakeProduct = { key: r.key, name: r.productName, unit: 'Pcs', current: 0, min: r.qty || 1 };
                                        handleOpenRaiseRequest(fakeProduct);
                                        dispatch(dismissNewProductRequest(r.key));
                                      }}
                                    >
                                      Raise Request
                                    </Button>
                                    <Button size="small" danger onClick={() => dispatch(dismissNewProductRequest(r.key))}>Dismiss</Button>
                                  </Space>
                                )
                              }
                            ]}
                          />
                        </div>
                      )}

                      {/* â"€â"€ Stock Availability Header with Bulk Purchase button â"€â"€ */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: textColor }}>Inventory Stock Availability</Title>
                          <Text type="secondary">Raise purchase requests directly for low stock products</Text>
                        </div>
                        <Button
                          type="primary"
                          icon={<ShoppingOutlined />}
                          onClick={() => { setBulkSupplierName(''); setBulkItems([]); setBulkPayTerms(''); setShowBulkPurchaseModal(true); }}
                          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                        >
                          Bulk Purchase Request
                        </Button>
                      </div>
                      <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item, category..." allowClear value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} style={{ width: 230, borderRadius: 8 }} />
                        <Select allowClear placeholder="Quotation Status" value={stockReqStatusFilter} onChange={setStockReqStatusFilter} style={{ width: 180, borderRadius: 8 }}>
                          <Option value="Pending">Pending</Option>
                          <Option value="Approved">Approved</Option>
                          <Option value="Rejected">Rejected</Option>
                        </Select>
                      </div>
                      <Table
                        size="small"
                        dataSource={INVENTORY_DATA.filter((inv) => {
                          const q = stockSearch.toLowerCase();
                          const matchSearch = !q || (inv.name || '').toLowerCase().includes(q) || (inv.category || '').toLowerCase().includes(q) || (inv.code || '').toLowerCase().includes(q);
                          const linkedReq = raisedRequests.find(req => req.item === inv.name);
                          const matchStatus = !stockReqStatusFilter || (linkedReq?.status || '') === stockReqStatusFilter;
                          return matchSearch && matchStatus;
                        })}
                        pagination={{ pageSize: 5 }}
                        rowKey="key"
                        scroll={{ x: 1200 }}
                        expandable={{
                          expandedRowKeys: openInvNotes ? [openInvNotes] : [],
                          onExpand: () => {},
                          showExpandColumn: false,
                          expandedRowRender: (r) => {
                            const linkedReq = raisedRequests.find(req => req.item === r.name);
                            if (linkedReq) {
                              // 2-way shared notes with Financial page (stored in Redux)
                              const reqNotes = linkedReq.notes || [];
                              return (
                                <div style={{ padding: '12px 16px', background: isDark ? '#16192a' : '#fafcff', borderRadius: 8 }}>
                                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#B11E6A', display: 'block', marginBottom: 4 }}>
                                    <MessageOutlined style={{ marginRight: 4 }} />Shared Notes — {r.name}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                                    Notes added here are visible to the Financial team and vice versa.
                                  </Text>
                                  {reqNotes.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>No notes yet. Add one below.</Text>}
                                  {reqNotes.map((n, i) => (
                                    <div key={i} style={{ padding: '6px 10px', marginBottom: 6, borderRadius: 6, background: isDark ? '#1e2235' : '#f0f4ff', border: `1px solid ${isDark ? '#2a2d40' : '#d6e4ff'}` }}>
                                      <Text style={{ fontSize: 12 }}>{n.text}</Text>
                                      <br />
                                      <Text type="secondary" style={{ fontSize: 10 }}><ClockCircleOutlined style={{ marginRight: 3 }} />{n.timestamp}</Text>
                                    </div>
                                  ))}
                                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <Input
                                      size="small"
                                      placeholder="Add a shared note (visible to Finance)..."
                                      value={reqNoteInput}
                                      onChange={e => setReqNoteInput(e.target.value)}
                                      onPressEnter={() => handleAddReqNote(linkedReq.key)}
                                      style={{ flex: 1, borderRadius: 6 }}
                                    />
                                    <Button size="small" type="primary" onClick={() => handleAddReqNote(linkedReq.key)}
                                      style={{ background: '#B11E6A', border: 'none', borderRadius: 6 }}>Add</Button>
                                  </div>
                                </div>
                              );
                            }
                            // Local inventory notes (no linked request yet)
                            const notes = invItemNotes[r.key] || [];
                            return (
                              <div style={{ padding: '10px 16px', background: isDark ? '#16192a' : '#fafcff', borderRadius: 8 }}>
                                <Text style={{ fontSize: 12, fontWeight: 600, color: '#B11E6A', display: 'block', marginBottom: 8 }}>
                                  <MessageOutlined style={{ marginRight: 4 }} />Notes for {r.name}
                                </Text>
                                {notes.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>No notes yet. Add one below.</Text>}
                                {notes.map((n, i) => (
                                  <div key={i} style={{ padding: '6px 10px', marginBottom: 6, borderRadius: 6, background: isDark ? '#1e2235' : '#f0f4ff', border: `1px solid ${isDark ? '#2a2d40' : '#d6e4ff'}` }}>
                                    <Text style={{ fontSize: 12 }}>{n.text}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 10 }}><ClockCircleOutlined style={{ marginRight: 3 }} />{n.ts}</Text>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                  <Input
                                    size="small"
                                    placeholder="Add a note..."
                                    value={invNoteInput[r.key] || ''}
                                    onChange={e => setInvNoteInput(prev => ({ ...prev, [r.key]: e.target.value }))}
                                    onPressEnter={() => handleAddInvNote(r.key)}
                                    style={{ flex: 1, borderRadius: 6 }}
                                  />
                                  <Button size="small" type="primary" onClick={() => handleAddInvNote(r.key)}
                                    style={{ background: '#B11E6A', border: 'none', borderRadius: 6 }}>Add</Button>
                                </div>
                              </div>
                            );
                          },
                        }}
                        columns={[
                          { title: 'Item Name', dataIndex: 'name', key: 'name', render: (v) => <Text strong>{v}</Text> },
                          { title: 'Category', dataIndex: 'category', key: 'category' },
                          { title: 'Current Stock', dataIndex: 'current', key: 'current', render: (v, r) => <Text style={{ color: v <= r.min ? '#ff4d4f' : 'inherit' }}>{v} {r.unit}</Text> },
                          { title: 'Min. Required', dataIndex: 'min', key: 'min', render: (v, r) => `${v} ${r.unit}` },
                          {
                            title: 'Supplier', key: 'supplier',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              if (!req?.supplier) return <Text type="secondary">—</Text>;
                              return <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}>{req.supplier}</Text>;
                            }
                          },
                          {
                            title: 'Payment Terms', key: 'payment_terms',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              if (!req?.payment_terms) return <Text type="secondary">—</Text>;
                              return <Text style={{ fontSize: 13 }}>{req.payment_terms}</Text>;
                            }
                          },
                          {
                            title: 'Payment Doc', key: 'payment_doc',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              const linkedOrder = req ? purchaseOrders.find(o => o.requestKey === req.key) : null;
                              const paymentDoc = linkedOrder?.payment_proof;
                              if (!paymentDoc) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              return (
                                <Button size="small" icon={<FileTextOutlined />}
                                  onClick={() => setViewApprovalDoc({ ...req, payment_doc: paymentDoc })}
                                  style={{ color: '#52c41a', borderColor: '#52c41a', fontWeight: 600, fontSize: 11, background: 'transparent' }}>
                                  View File
                                </Button>
                              );
                            }
                          },
                          {
                            title: 'Quotation Status',
                            key: 'req_status',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              if (!req) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              const colorMap = { Approved: 'success', Rejected: 'error', Pending: 'processing' };
                              return <Tag color={colorMap[req.status]} style={{ borderRadius: 12 }}>{req.status}</Tag>;
                            }
                          },
                          {
                            title: 'Finance Status',
                            key: 'finance_status',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              if (!req?.financeStatus) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              if (req.financeStatus === 'Approved') return <Tag color="success" style={{ borderRadius: 12 }}>Approved</Tag>;
                              if (req.financeStatus === 'ModifyRequested') return (
                                <Tooltip title={req.financeNote || 'Modify requested by finance'}>
                                  <Tag color="warning" style={{ borderRadius: 12, cursor: 'pointer' }}>Modify Requested</Tag>
                                </Tooltip>
                              );
                              return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                            }
                          },
                          {
                            title: 'Upload LR Copies',
                            key: 'lr_copies',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              const linkedOrder = req ? purchaseOrders.find(o => o.requestKey === req.key) : null;
                              if (!linkedOrder) return <Text type="secondary">—</Text>;
                              const lr = lrData[linkedOrder.key];
                              if (lr) {
                                return (
                                  <Space direction="vertical" size={2}>
                                    <Tag color={lr.paidStatus === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 8, margin: 0 }}>
                                      {lr.paidStatus === 'Paid' ? <CheckCircleOutlined style={{ marginRight: 3 }} /> : null}{lr.paidStatus}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>LR: <Text strong style={{ fontSize: 11 }}>{lr.lrNumber}</Text></Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>Delivery: {lr.deliveryDate}</Text>
                                    <Button size="small" icon={<EditOutlined />}
                                      onClick={() => { setLrUploadTarget({ order: linkedOrder, itemName: r.name }); lrUploadForm.setFieldsValue({ lr_number: lr.lrNumber, delivery_date: dayjs(lr.deliveryDate), paid_status: lr.paidStatus }); setShowLRUploadModal(true); }}
                                      style={{ fontSize: 11, height: 22, padding: '0 8px' }}>Edit</Button>
                                  </Space>
                                );
                              }
                              return (
                                <Button size="small" icon={<UploadOutlined />}
                                  onClick={() => { setLrUploadTarget({ order: linkedOrder, itemName: r.name }); lrUploadForm.resetFields(); setShowLRUploadModal(true); }}
                                  style={{ borderColor: '#1890ff', color: '#1890ff' }}>
                                  Upload
                                </Button>
                              );
                            }
                          },
                          {
                            title: 'Action',
                            key: 'action',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              const orderAlreadyRaised = purchaseOrders.some(o => o.requestKey === req?.key);
                              const hasReminder = activeReminders.has(r.key);
                              const reminderCount = reminderCounts[r.key] || 0;
                              const noteCount = req ? (req.notes || []).length : (invItemNotes[r.key] || []).length;
                              const noteBtn = (
                                <Badge count={noteCount} size="small" offset={[-2, 2]}>
                                  <Button
                                    size="small"
                                    icon={<MessageOutlined />}
                                    onClick={() => setOpenInvNotes(openInvNotes === r.key ? null : r.key)}
                                    style={{ color: openInvNotes === r.key ? '#fff' : '#B11E6A', background: openInvNotes === r.key ? '#B11E6A' : 'transparent', borderColor: '#B11E6A55' }}
                                  >{req ? 'Modify' : ''}</Button>
                                </Badge>
                              );

                              // Direct WA Ask Quotation button (uses raised request supplier details)
                              const buildReqWABtn = (label = 'Ask Quotation') => {
                                if (!req) return null;
                                const sup = suppliersList.find(s => s.name === req.supplier);
                                const phone = sup ? sup.phone.replace(/\D/g, '') : '';
                                const latestNote = (req.notes || []).at(-1);
                                const msg = `*Quotation Follow-up*\n\n*Item:* ${req.item}\n*Quantity:* ${req.qty} ${req.unit}\n*Payment Terms:* ${req.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nPlease provide a quotation at the earliest.`;
                                return (
                                  <Button size="small" icon={<WhatsAppOutlined />}
                                    style={{ borderColor: '#25D366', color: '#25D366', fontWeight: 600 }}
                                    onClick={() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')}>
                                    {label}
                                  </Button>
                                );
                              };

                              if (orderAlreadyRaised) return <Space>{noteCount > 0 ? buildReqWABtn() : null}{noteBtn}</Space>;

                              if (req?.status === 'Approved') return (
                                <Space wrap size={4}>
                                  <Button
                                    size="small"
                                    type="primary"
                                    icon={<ShoppingOutlined />}
                                    onClick={() => { setSelectedPlaceOrderReq(req); setSelectedPlaceOrderItem(r); setShowPlaceOrderModal(true); }}
                                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                                  >
                                    Place Order
                                  </Button>
                                  <Button
                                    size="small"
                                    type="primary"
                                    icon={<DollarOutlined />}
                                    onClick={() => { setSelectedApprovedRequest(req); setShowRequestOrderModal(true); }}
                                    style={{ background: 'linear-gradient(135deg,#52c41a,#389e0d)', border: 'none', fontWeight: 600 }}
                                  >
                                    Payment Request
                                  </Button>
                                  {noteCount > 0 ? buildReqWABtn() : null}
                                  {noteBtn}
                                </Space>
                              );

                              // Pending: always show Ask Quotation so purchase team can follow up
                              // after raising request or after Finance edits and resets to Pending
                              if (req?.status === 'Pending') return <Space>{buildReqWABtn()}{noteBtn}</Space>;

                              if (whatsappSentItems.has(r.key)) return (
                                <Space direction="vertical" size={4}>
                                  {hasReminder && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, background: '#fff7e6', border: '1px solid #ffd591' }}>
                                      <BellOutlined style={{ color: '#fa8c16', fontSize: 11 }} />
                                      <Text style={{ fontSize: 10, color: '#d46b08' }}>Reminder{reminderCount > 0 ? ` Ã—${reminderCount}` : ' active'}</Text>
                                      <Button type="text" size="small" icon={<CloseOutlined style={{ fontSize: 9 }} />}
                                        style={{ padding: '0 2px', height: 14, minWidth: 14, color: '#888' }}
                                        onClick={() => stopQuotationReminder(r.key)} />
                                    </div>
                                  )}
                                  <Space>
                                    <Button size="small" type="primary" icon={<PlusOutlined />}
                                      onClick={() => { handleOpenRaiseRequest(r); stopQuotationReminder(r.key); }}
                                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}>
                                      Raise Request
                                    </Button>
                                    {noteBtn}
                                  </Space>
                                </Space>
                              );

                              return (
                                <Space>
                                  <Button size="small" icon={<WhatsAppOutlined />} onClick={() => handleOpenRequest(r)}
                                    style={{ borderColor: '#25D366', color: '#25D366', fontWeight: 600 }}>
                                    Ask Quotation
                                  </Button>
                                  {noteBtn}
                                </Space>
                              );
                            }
                          }
                        ]}
                      />

                      {/* ── Bulk Purchase Requests Table (category-separated) ── */}
                      {(() => {
                        const bulkReqs = raisedRequests.filter(r => r.requestType === 'bulk');
                        if (bulkReqs.length === 0) return null;

                        // Group by category
                        const categoryMap = {};
                        bulkReqs.forEach(req => {
                          const cat = req.category || 'Other';
                          if (!categoryMap[cat]) categoryMap[cat] = [];
                          categoryMap[cat].push(req);
                        });

                        const bulkTableColumns = [
                          {
                            title: 'Item', dataIndex: 'item', key: 'item', width: 180,
                            render: v => <Text strong>{v}</Text>
                          },
                          {
                            title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 140,
                            render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text>
                          },
                          {
                            title: 'Qty', key: 'qty', width: 90,
                            render: (_, r) => <Text strong>{r.qty} {r.unit}</Text>
                          },
                          {
                            title: 'Payment Terms', dataIndex: 'payment_terms', key: 'payment_terms', width: 200,
                            render: v => <Text style={{ fontSize: 12 }}>{v || '—'}</Text>
                          },
                          {
                            title: 'Date', dataIndex: 'date', key: 'date', width: 100,
                            render: v => <Text style={{ fontSize: 12 }}>{v}</Text>
                          },
                          {
                            title: 'Quotation Status', key: 'status', width: 120,
                            render: (_, r) => {
                              const colorMap = { Approved: 'success', Rejected: 'error', Pending: 'processing' };
                              return <Tag color={colorMap[r.status] || 'default'} style={{ borderRadius: 12 }}>{r.status}</Tag>;
                            }
                          },
                          {
                            title: 'Finance Status', key: 'finance_status', width: 130,
                            render: (_, r) => {
                              if (!r.financeStatus) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              if (r.financeStatus === 'Approved') return <Tag color="success" style={{ borderRadius: 12 }}>Approved</Tag>;
                              if (r.financeStatus === 'ModifyRequested') return (
                                <Tooltip title={r.financeNote || 'Modify requested by finance'}>
                                  <Tag color="warning" style={{ borderRadius: 12, cursor: 'pointer' }}>Modify Requested</Tag>
                                </Tooltip>
                              );
                              return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                            }
                          },
                          {
                            title: 'Quotation File', key: 'quotation_file', width: 130,
                            render: (_, r) => r.quotation_file
                              ? <Space size={4}><FileTextOutlined style={{ color: '#B11E6A' }} /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{r.quotation_file}</Text></Space>
                              : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                          },
                          {
                            title: 'Action', key: 'action', fixed: 'right', width: 200,
                            render: (_, r) => {
                              const orderAlreadyRaised = purchaseOrders.some(o => o.requestKey === r.key);
                              if (orderAlreadyRaised) return <Tag color="success" style={{ borderRadius: 10 }}>Order Placed</Tag>;

                              if (r.status === 'Approved') return (
                                <Space wrap size={4}>
                                  <Button
                                    size="small"
                                    type="primary"
                                    icon={<ShoppingOutlined />}
                                    onClick={() => {
                                      setSelectedPlaceOrderReq(r);
                                      setSelectedPlaceOrderItem({ name: r.item, unit: r.unit, key: r.key });
                                      setShowPlaceOrderModal(true);
                                    }}
                                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                                  >
                                    Place Order
                                  </Button>
                                  <Button
                                    size="small"
                                    type="primary"
                                    icon={<DollarOutlined />}
                                    onClick={() => { setSelectedApprovedRequest(r); setShowRequestOrderModal(true); }}
                                    style={{ background: 'linear-gradient(135deg,#52c41a,#389e0d)', border: 'none', fontWeight: 600 }}
                                  >
                                    Payment Request
                                  </Button>
                                </Space>
                              );

                              if (r.status === 'Pending') {
                                const sup = suppliersList.find(s => s.name === r.supplier);
                                const phone = sup ? sup.phone.replace(/\D/g, '') : '';
                                const latestNote = (r.notes || []).at(-1);
                                const msg = `*Bulk Order Follow-up*\n\n*Item:* ${r.item}\n*Quantity:* ${r.qty} ${r.unit}\n*Payment Terms:* ${r.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nKindly share the quotation at the earliest.`;
                                return (
                                  <Button
                                    size="small"
                                    icon={<WhatsAppOutlined />}
                                    style={{ borderColor: '#25D366', color: '#25D366', fontWeight: 600 }}
                                    onClick={() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')}
                                  >
                                    Ask Quotation
                                  </Button>
                                );
                              }

                              return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                            }
                          }
                        ];

                        return (
                          <div style={{ marginTop: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                              <div>
                                <Title level={5} style={{ margin: 0, color: textColor }}>Bulk Purchase Requests</Title>
                                <Text type="secondary">Requests raised via Bulk Purchase — grouped by category</Text>
                              </div>
                              <Tag color="pink" style={{ borderRadius: 10, fontWeight: 600, fontSize: 12 }}>{bulkReqs.length} Total</Tag>
                            </div>
                            {Object.entries(categoryMap).map(([cat, items]) => (
                              <div key={cat} style={{ marginBottom: 20 }}>
                                <div style={{
                                  padding: '8px 14px',
                                  background: isDark ? 'linear-gradient(135deg,#2a0d1a,#1a0f1e)' : 'linear-gradient(135deg,#fff0f6,#fce4f0)',
                                  borderRadius: '10px 10px 0 0',
                                  borderBottom: '2px solid #B11E6A',
                                  display: 'flex', alignItems: 'center', gap: 10
                                }}>
                                  <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{cat}</Text>
                                  <Tag color="magenta" style={{ borderRadius: 10, margin: 0, fontSize: 11 }}>
                                    {items.length} item{items.length > 1 ? 's' : ''}
                                  </Tag>
                                  <Tag color={items.some(i => i.status === 'Approved') ? 'success' : items.some(i => i.status === 'Rejected') ? 'error' : 'processing'} style={{ borderRadius: 10, margin: 0, fontSize: 11 }}>
                                    {items.some(i => i.status === 'Approved') ? 'Approved' : items.some(i => i.status === 'Rejected') ? 'Rejected' : 'Pending'}
                                  </Tag>
                                </div>
                                <Table
                                  size="small"
                                  dataSource={items}
                                  rowKey="key"
                                  pagination={false}
                                  scroll={{ x: 1100 }}
                                  columns={bulkTableColumns}
                                  style={{
                                    border: `1px solid ${isDark ? '#2a2d40' : '#f0d4e4'}`,
                                    borderTop: 'none',
                                    borderRadius: '0 0 10px 10px',
                                    overflow: 'hidden'
                                  }}
                                  locale={{ emptyText: 'No bulk requests in this category.' }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )
                },
                {
                  key: 'order_tracking',
                  label: <Space><TruckOutlined />Dispatch Order Tracking</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: textColor }}>Dispatch Order Tracking</Title>
                          <Text type="secondary">Track dispatch orders — LR details, pickup proof, payment status, and delivery confirmation</Text>
                        </div>
                      </div>
                      <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order ID, supplier, item..." allowClear value={dtSearch} onChange={(e) => setDtSearch(e.target.value)} style={{ width: 250, borderRadius: 8 }} />
                        <Select allowClear placeholder="Delivery Status" value={dtDeliveryFilter} onChange={setDtDeliveryFilter} style={{ width: 170, borderRadius: 8 }}>
                          <Option value="In Transit">In Transit</Option>
                          <Option value="Delivered">Delivered</Option>
                          <Option value="Partial Delivery">Partial Delivery</Option>
                        </Select>
                        <Select allowClear placeholder="Payment Status" value={dtPayFilter} onChange={setDtPayFilter} style={{ width: 160, borderRadius: 8 }}>
                          <Option value="Paid">Paid</Option>
                          <Option value="Unpaid">Unpaid</Option>
                        </Select>
                      </div>
                      <Table
                        size="small"
                        dataSource={dispatchTrackingOrders.filter((o) => {
                          const q = dtSearch.toLowerCase();
                          const matchSearch = !q || (o.orderId || '').toLowerCase().includes(q) || (o.supplier || '').toLowerCase().includes(q) || (o.item || '').toLowerCase().includes(q);
                          const matchDelivery = !dtDeliveryFilter || o.deliveryStatus === dtDeliveryFilter;
                          const matchPay = !dtPayFilter || o.paymentStatus === dtPayFilter;
                          return matchSearch && matchDelivery && matchPay;
                        })}
                        rowKey="key"
                        pagination={{ pageSize: 8 }}
                        scroll={{ x: 1400 }}
                        locale={{ emptyText: 'No dispatch tracking orders yet.' }}
                        columns={[
                          { title: 'Date', dataIndex: 'date', key: 'date', width: 95 },
                          {
                            title: 'Order ID', dataIndex: 'orderId', key: 'orderId', width: 90,
                            render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text>
                          },
                          { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 130, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Item', dataIndex: 'item', key: 'item', width: 160, render: v => <Text strong>{v}</Text> },
                          {
                            title: 'Qty / Amt', key: 'qty_amt', width: 110,
                            render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Text strong>{r.qty} {r.unit}</Text>
                                <Text style={{ color: '#B11E6A', fontSize: 11 }}>&#8377;{r.amount?.toLocaleString()}</Text>
                              </Space>
                            )
                          },
                          {
                            title: 'LR Number & Lorry', key: 'lr_lorry', width: 180,
                            render: (_, r) => r.lrNumber ? (
                              <Space direction="vertical" size={1}>
                                <Text strong style={{ color: '#1890ff', fontSize: 12 }}>{r.lrNumber}</Text>
                                <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#555' }}><CarOutlined style={{ marginRight: 3 }} />{r.lorryNo}</Text>
                                <Text style={{ fontSize: 10, color: isDark ? '#888' : '#888' }}>{r.transportCompany}</Text>
                              </Space>
                            ) : <Tag color="default" style={{ borderRadius: 8 }}>Not Assigned</Tag>
                          },
                          {
                            title: 'Expected Delivery', key: 'expected_del', width: 120,
                            render: (_, r) => {
                              if (!r.expectedDelivery) return <Text type="secondary">—</Text>;
                              const days = dayjs(r.expectedDelivery).diff(dayjs(), 'day');
                              const color = days < 0 ? '#ff4d4f' : days <= 2 ? '#fa8c16' : '#52c41a';
                              return (
                                <Space direction="vertical" size={0}>
                                  <Text strong style={{ color, fontSize: 11 }}>{r.expectedDelivery}</Text>
                                  <Text style={{ fontSize: 10, color }}>
                                    {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
                                  </Text>
                                </Space>
                              );
                            }
                          },
                          {
                            title: 'LR Copy', key: 'lr_copy', width: 100,
                            render: (_, r) => r.lrCopyFile ? (
                              <Button size="small" icon={<FileTextOutlined />}
                                style={{ color: '#1890ff', borderColor: '#1890ff', fontSize: 11 }}
                                onClick={() => setViewLRCopyModal(r)}>
                                View File
                              </Button>
                            ) : <Text type="secondary" style={{ fontSize: 11 }}>No file</Text>
                          },
                          {
                            title: 'Payment Status', key: 'payment_status', width: 110, align: 'center',
                            render: (_, r) => {
                              const status = r.paymentStatus || 'Unpaid';
                              return <Tag color={status === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 10, margin: 0 }}>{status}</Tag>;
                            }
                          },
                          {
                            title: 'Payment Proof', key: 'payment_proof', width: 130, align: 'center',
                            render: (_, r) => r.paymentProof ? (
                              <Button size="small" icon={<EyeOutlined />}
                                style={{ color: '#52c41a', borderColor: '#52c41a', fontSize: 11 }}
                                onClick={() => message.info('Viewing payment proof: ' + r.paymentProof)}>
                                View Proof
                              </Button>
                            ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                          },
                          {
                            title: 'Delivery Status', key: 'delivery_status', width: 120, align: 'center',
                            render: (_, r) => {
                              const statusColorMap = { 'Delivered': 'success', 'Partial Delivery': 'warning', 'In Transit': 'processing' };
                              return <Tag color={statusColorMap[r.deliveryStatus] || 'default'} style={{ borderRadius: 10 }}>{r.deliveryStatus || 'Pending'}</Tag>;
                            }
                          },
                          {
                            title: 'Action', key: 'action', fixed: 'right', width: 100,
                            render: (_, r) => {
                              const menuItems = [
                                {
                                  key: 'taken',
                                  label: (
                                    <Space>
                                      <CarOutlined style={{ color: '#B11E6A' }} />
                                      <span>Taken</span>
                                      {r.takenStatus === 'taken' && <Tag color="success" style={{ borderRadius: 8, margin: 0, fontSize: 10 }}>Done</Tag>}
                                    </Space>
                                  ),
                                  onClick: () => { setTakenTarget(r); takenForm.setFieldsValue({ gpay_number: r.gPayNumber || '' }); setShowTakenModal(true); }
                                },
                                {
                                  key: 'received',
                                  label: (
                                    <Space>
                                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                      <span>Received Order</span>
                                      {r.receivedStatus && <Tag color={r.receivedStatus === 'partial' ? 'warning' : 'success'} style={{ borderRadius: 8, margin: 0, fontSize: 10 }}>{r.receivedStatus === 'partial' ? 'Partial' : 'Done'}</Tag>}
                                    </Space>
                                  ),
                                  onClick: () => openReceivedModal(r)
                                },
                              ];
                              return (
                                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                                  <Button size="small" icon={<MoreOutlined />} style={{ borderRadius: 6 }}>More</Button>
                                </Dropdown>
                              );
                            }
                          },
                        ]}
                      />

                      {/* ── Missing / Short-Received Orders ── */}
                      {(() => {
                        const missingOrders = dispatchTrackingOrders.filter(o => o.missingItems && o.missingItems.length > 0);
                        if (missingOrders.length === 0) return null;
                        return (
                          <div style={{ marginTop: 28 }}>
                            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <Space align="center">
                                  <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
                                  <Title level={5} style={{ margin: 0, color: '#fa8c16' }}>Missing / Short-Received Orders</Title>
                                  <Tag color="warning" style={{ borderRadius: 10, fontWeight: 600 }}>{missingOrders.length} order{missingOrders.length > 1 ? 's' : ''}</Tag>
                                </Space>
                                <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>Orders with items that were not fully received — partial delivery recorded</Text>
                              </div>
                              <Button
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() => exportToCSV(
                                  ['Order ID', 'Date', 'Supplier', 'Item', 'Qty', 'Unit', 'Amount (₹)', 'Missing Items', 'Delivery Status', 'Missed By', 'Action Taken', 'Status'],
                                  missingOrders.map(o => [
                                    o.orderId, o.date, o.supplier, o.item, o.qty, o.unit, o.amount,
                                    `${o.missingItems?.length || 0} item(s)`,
                                    o.deliveryStatus,
                                    o.partialMissedBy === 'supplier' ? 'Vendor' : o.partialMissedBy === 'lorry' ? 'Lorry' : '',
                                    o.actionTakenStatus || '',
                                    !o.actionTakenStatus ? 'Pending' : o.actionTakenStatus,
                                  ]),
                                  'missed_orders.csv'
                                )}
                              >Export</Button>
                            </div>
                            <Table
                              size="small"
                              dataSource={missingOrders}
                              rowKey="key"
                              pagination={false}
                              scroll={{ x: 1200 }}
                              style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #fa8c1633' }}
                              expandable={{
                                expandedRowRender: (record) => (
                                  <div style={{ padding: '10px 16px', background: isDark ? '#1a1200' : '#fffbe6', borderRadius: 8 }}>
                                    <Text strong style={{ color: '#fa8c16', display: 'block', marginBottom: 8, fontSize: 12 }}>
                                      <ExclamationCircleOutlined style={{ marginRight: 6 }} />Missing Items Detail — {record.orderId}
                                    </Text>
                                    <Table
                                      size="small"
                                      dataSource={record.missingItems}
                                      rowKey="key"
                                      pagination={false}
                                      style={{ borderRadius: 8, border: '1px solid #fa8c1644' }}
                                      columns={[
                                        { title: 'Item Name', dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
                                        { title: 'Ordered Qty', dataIndex: 'ordered', key: 'ordered', align: 'center', render: v => <Text>{v}</Text> },
                                        { title: 'Received Qty', dataIndex: 'received', key: 'received', align: 'center', render: v => <Text style={{ color: '#52c41a' }}>{v}</Text> },
                                        { title: 'Missing Qty', dataIndex: 'missing', key: 'missing', align: 'center', render: v => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
                                      ]}
                                    />
                                  </div>
                                ),
                                defaultExpandAllRows: true,
                              }}
                              columns={[
                                { title: 'Order ID', dataIndex: 'orderId', key: 'orderId', width: 100, render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                                { title: 'Date', dataIndex: 'date', key: 'date', width: 95 },
                                { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                                { title: 'Item', dataIndex: 'item', key: 'item', width: 180, render: v => <Text strong>{v}</Text> },
                                {
                                  title: 'Qty / Amount', key: 'qty_amt', width: 120,
                                  render: (_, r) => (
                                    <Space direction="vertical" size={0}>
                                      <Text strong>{r.qty} {r.unit}</Text>
                                      <Text style={{ color: '#B11E6A', fontSize: 11 }}>&#8377;{r.amount?.toLocaleString()}</Text>
                                    </Space>
                                  )
                                },
                                {
                                  title: 'Missing Items', key: 'missing_count', width: 120, align: 'center',
                                  render: (_, r) => (
                                    <Tag color="error" style={{ borderRadius: 10, fontWeight: 600 }}>
                                      {r.missingItems?.length || 0} item{(r.missingItems?.length || 0) !== 1 ? 's' : ''} missing
                                    </Tag>
                                  )
                                },
                                {
                                  title: 'Delivery Status', dataIndex: 'deliveryStatus', key: 'delivery_status', width: 130, align: 'center',
                                  render: v => <Tag color="warning" style={{ borderRadius: 10 }}>{v}</Tag>
                                },
                                {
                                  title: 'Missed By', key: 'missed_by', width: 120,
                                  render: (_, r) => r.partialMissedBy ? (
                                    <Tag color={r.partialMissedBy === 'supplier' ? 'red' : 'orange'} style={{ borderRadius: 8 }}>
                                      {r.partialMissedBy === 'supplier' ? 'Vendor' : 'Lorry'}
                                    </Tag>
                                  ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                                },
                                {
                                  title: 'Action Taken', key: 'vendor_action', width: 190,
                                  render: (_, r) => (
                                    <Select
                                      size="small"
                                      placeholder="Select action"
                                      value={r.actionTakenStatus || undefined}
                                      style={{ width: '100%', minWidth: 165 }}
                                      onChange={(val) => setDispatchTrackingOrders(prev => prev.map(o => o.key === r.key ? { ...o, actionTakenStatus: val } : o))}
                                      dropdownRender={menu => (
                                        <>
                                          {menu}
                                          <Divider style={{ margin: '6px 0' }} />
                                          <Space style={{ padding: '0 8px 6px' }}>
                                            <Input
                                              placeholder="Custom action"
                                              size="small"
                                              value={newActionInput}
                                              onChange={e => setNewActionInput(e.target.value)}
                                              onKeyDown={e => e.stopPropagation()}
                                              style={{ width: 120 }}
                                            />
                                            <Button
                                              type="text"
                                              icon={<PlusOutlined />}
                                              size="small"
                                              onClick={() => {
                                                const trimmed = newActionInput.trim();
                                                if (trimmed && !customActionOptions.includes(trimmed)) {
                                                  setCustomActionOptions(prev => [...prev, trimmed]);
                                                  setNewActionInput('');
                                                }
                                              }}
                                            >Add</Button>
                                          </Space>
                                        </>
                                      )}
                                      options={customActionOptions.map(opt => ({ value: opt, label: opt }))}
                                    />
                                  )
                                },
                                {
                                  title: 'Status', key: 'action_status', width: 150, align: 'center',
                                  render: (_, r) => {
                                    if (!r.actionTakenStatus) return <Tag color="warning" style={{ borderRadius: 8 }}>Pending</Tag>;
                                    if (r.actionTakenStatus === 'Completely Received') return <Tag color="success" style={{ borderRadius: 8, fontWeight: 600 }}>Completely Received</Tag>;
                                    return <Tag color="blue" style={{ borderRadius: 8 }}>{r.actionTakenStatus}</Tag>;
                                  }
                                },
                              ]}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )
                },
                {
                  key: 'local_purchase',
                  label: <Space><ShoppingOutlined />Local Purchase</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      {localPurchaseDetailView ? (
                        /* ── Detail View ── */
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <Space>
                              <Button icon={<LeftOutlined />} onClick={() => setLocalPurchaseDetailView(null)}>Back to List</Button>
                              <Text strong style={{ color: '#B11E6A', fontSize: 15 }}>Local Purchase — {localPurchaseDetailView.invoiceNo}</Text>
                            </Space>
                            <Tag color={localPurchaseDetailView.paymentStatus === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                              {localPurchaseDetailView.paymentStatus}
                            </Tag>
                          </div>
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <Card size="small" style={{ borderRadius: 10, background: isDark ? '#16192a' : '#fafbff', border: `1px solid ${isDark ? '#2a2d40' : '#e8eeff'}` }}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#B11E6A' }}>Vendor Details</Text>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>Vendor Name: </Text><Text strong>{localPurchaseDetailView.vendorName}</Text></div>
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>Phone: </Text><Text>{localPurchaseDetailView.vendorPhone}</Text></div>
                                </div>
                              </Card>
                            </Col>
                            <Col xs={24} md={12}>
                              <Card size="small" style={{ borderRadius: 10, background: isDark ? '#16192a' : '#fafbff', border: `1px solid ${isDark ? '#2a2d40' : '#e8eeff'}` }}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#B11E6A' }}>Payment Details</Text>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>Type: </Text><Tag color={localPurchaseDetailView.paymentType === 'instant' ? 'green' : 'orange'}>{localPurchaseDetailView.paymentType === 'instant' ? 'Instant' : 'Credit'}</Tag></div>
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>Status: </Text><Tag color={localPurchaseDetailView.paymentStatus === 'Paid' ? 'success' : 'error'}>{localPurchaseDetailView.paymentStatus}</Tag></div>
                                  {localPurchaseDetailView.gPayNumber && <div><Text type="secondary" style={{ fontSize: 12 }}>GPay: </Text><Text>{localPurchaseDetailView.gPayNumber}</Text></div>}
                                  <div><Text type="secondary" style={{ fontSize: 12 }}>Total: </Text><Text strong style={{ color: '#B11E6A' }}>₹{localPurchaseDetailView.totalAmount?.toLocaleString()}</Text></div>
                                </div>
                              </Card>
                            </Col>
                            <Col xs={24}>
                              <Card size="small" style={{ borderRadius: 10, background: isDark ? '#16192a' : '#fafbff', border: `1px solid ${isDark ? '#2a2d40' : '#e8eeff'}` }}>
                                <Text strong style={{ display: 'block', marginBottom: 10, color: '#B11E6A' }}>Items</Text>
                                <Table
                                  size="small"
                                  dataSource={localPurchaseDetailView.items || []}
                                  pagination={false}
                                  columns={[
                                    { title: 'Item', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
                                    { title: 'Qty', dataIndex: 'qty' },
                                    { title: 'Unit', dataIndex: 'unit' },
                                    { title: 'Amount', dataIndex: 'amount', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>₹{v?.toLocaleString()}</Text> },
                                  ]}
                                />
                              </Card>
                            </Col>
                            {localPurchaseDetailView.invoiceFile && (
                              <Col xs={24}>
                                <Card size="small" style={{ borderRadius: 10 }}>
                                  <Space>
                                    <FileTextOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                                    <Text strong>Invoice File: </Text>
                                    <Button type="link" style={{ color: '#1890ff', padding: 0 }}
                                      onClick={() => window.open(URL.createObjectURL(new Blob([], { type: 'application/pdf' })), '_blank')}
                                    >{localPurchaseDetailView.invoiceFile}</Button>
                                  </Space>
                                </Card>
                              </Col>
                            )}
                            {localPurchaseDetailView.paymentProof && (
                              <Col xs={24}>
                                <Card size="small" style={{ borderRadius: 10 }}>
                                  <Space>
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                                    <Text strong>Payment Proof: </Text>
                                    <Button type="link" style={{ color: '#52c41a', padding: 0 }}
                                      onClick={() => message.info('Opening payment proof: ' + localPurchaseDetailView.paymentProof)}
                                    >{localPurchaseDetailView.paymentProof}</Button>
                                  </Space>
                                </Card>
                              </Col>
                            )}
                          </Row>
                        </div>
                      ) : (
                        /* ── List View ── */
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <div>
                              <Title level={5} style={{ margin: 0, color: textColor }}>Local Purchase Records</Title>
                              <Text type="secondary">Local purchases made directly from vendors — track invoices, payment type and status</Text>
                            </div>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
                              onClick={() => {
                                localPurchaseForm.resetFields();
                                setLocalPurchaseInvoiceFile(null);
                                setLocalPurchaseScannedDetails(null);
                                setLocalPurchaseNewVendorDetected(false);
                                setLocalPurchasePaymentType('credit');
                                setShowAddLocalPurchaseModal(true);
                              }}
                            >
                              Add Local Purchase
                            </Button>
                          </div>
                          <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search vendor, invoice..." allowClear value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} style={{ width: 230, borderRadius: 8 }} />
                            <Select allowClear placeholder="Payment Status" value={localPayFilter} onChange={setLocalPayFilter} style={{ width: 160, borderRadius: 8 }}>
                              <Option value="Paid">Paid</Option>
                              <Option value="Pending">Pending</Option>
                            </Select>
                          </div>
                          <Table
                            size="small"
                            dataSource={localPurchases.filter((lp) => {
                              const q = localSearch.toLowerCase();
                              const matchSearch = !q || (lp.vendorName || '').toLowerCase().includes(q) || (lp.invoiceNo || '').toLowerCase().includes(q) || (lp.items || []).some(i => (i.name || '').toLowerCase().includes(q));
                              const matchPay = !localPayFilter || lp.paymentStatus === localPayFilter;
                              return matchSearch && matchPay;
                            })}
                            rowKey="key"
                            pagination={{ pageSize: 8 }}
                            scroll={{ x: 1200 }}
                            onRow={r => ({ onClick: () => setLocalPurchaseDetailView(r), style: { cursor: 'pointer' } })}
                            columns={[
                              { title: 'Date', dataIndex: 'date', key: 'date', width: 95 },
                              {
                                title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140,
                                render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text>
                              },
                              {
                                title: 'Invoice', dataIndex: 'invoiceFile', key: 'invoiceFile', width: 110,
                                render: v => v ? (
                                  <Button
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    style={{ color: '#1890ff', borderColor: '#1890ff', fontSize: 11 }}
                                    onClick={e => { e.stopPropagation(); window.open('#', '_blank'); }}
                                  >View</Button>
                                ) : <Tag color="default" style={{ borderRadius: 8, fontSize: 10 }}>No File</Tag>
                              },
                              { title: 'Vendor', dataIndex: 'vendorName', key: 'vendorName', width: 150, render: v => <Text style={{ fontWeight: 600 }}>{v}</Text> },
                              {
                                title: 'Items', key: 'items', width: 200,
                                render: (_, r) => (
                                  <div>
                                    {(r.items || []).map((item, idx) => (
                                      <div key={idx} style={{ fontSize: 11 }}>
                                        <Text strong>{item.name}</Text>
                                        <Text type="secondary"> — {item.qty} {item.unit}</Text>
                                      </div>
                                    ))}
                                  </div>
                                )
                              },
                              {
                                title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, align: 'right',
                                render: v => <Text strong style={{ color: '#B11E6A' }}>₹{v?.toLocaleString()}</Text>
                              },
                              {
                                title: 'Payment Type', dataIndex: 'paymentType', key: 'paymentType', width: 110, align: 'center',
                                render: v => <Tag color={v === 'instant' ? 'green' : 'orange'} style={{ borderRadius: 8 }}>{v === 'instant' ? 'Instant' : 'Credit'}</Tag>
                              },
                              {
                                title: 'Payment Status', dataIndex: 'paymentStatus', key: 'paymentStatus', width: 120, align: 'center',
                                render: v => <Tag color={v === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 10 }}>{v}</Tag>
                              },
                              {
                                title: 'Payment Proof', dataIndex: 'paymentProof', key: 'paymentProof', width: 120,
                                render: v => v ? (
                                  <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a', fontSize: 11 }}>View Proof</Button>
                                ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                              },
                              {
                                title: 'Action', key: 'action', fixed: 'right', width: 70,
                                render: (_, r) => <Button size="small" type="link" icon={<EyeOutlined />} onClick={e => { e.stopPropagation(); setLocalPurchaseDetailView(r); }} style={{ color: '#B11E6A' }}>View</Button>
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'history',
                  label: <Space><FileTextOutlined /> Purchase Order History</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: textColor }}>Purchase Order History</Title>
                          <Text type="secondary">Complete purchase order history with invoices, items, quantities and payment status</Text>
                        </div>
                        <Button icon={<DownloadOutlined />}>Export</Button>
                      </div>
                      <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <Input
                          prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                          placeholder="Search supplier, invoice..."
                          allowClear
                          value={expenseSearch}
                          onChange={(e) => setExpenseSearch(e.target.value)}
                          style={{ width: 230, borderRadius: 8 }}
                        />
                        <Select
                          allowClear
                          placeholder="Paid Status"
                          value={expensePaidFilter}
                          onChange={setExpensePaidFilter}
                          style={{ width: 160, borderRadius: 8 }}
                        >
                          <Option value="Paid">Paid</Option>
                          <Option value="Partially Paid">Partially Paid</Option>
                          <Option value="Unpaid">Unpaid</Option>
                        </Select>
                      </div>
                      <Table
                        size="small"
                        dataSource={purchases.filter((p) => {
                          const q = expenseSearch.toLowerCase();
                          const matchSearch = !q || (p.entity || '').toLowerCase().includes(q) || (p.inv_no || '').toLowerCase().includes(q) || (p.bill_no || '').toLowerCase().includes(q) || (p.items || []).some(i => (i.name || '').toLowerCase().includes(q));
                          const matchPaid = !expensePaidFilter || (p.paid_status || 'Unpaid') === expensePaidFilter;
                          return matchSearch && matchPaid;
                        })}
                        rowKey="key"
                        scroll={{ x: 1400 }}
                        expandable={{
                          expandedRowRender: (record) => (
                            <div style={{ padding: '12px 16px', background: isDark ? '#16192a' : '#fafcff', borderRadius: 8, margin: '4px 0' }}>
                              <Row gutter={[16, 12]}>
                                <Col xs={24} md={12}>
                                  <Text strong style={{ color: '#B11E6A', display: 'block', marginBottom: 8 }}>Order Details</Text>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Purchase Date: </Text><Text strong>{record.date}</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Bill No: </Text><Text strong>{record.bill_no}</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Invoice No: </Text><Text style={{ color: '#B11E6A', fontWeight: 600 }}>{record.inv_no}</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Supplier: </Text><Text strong>{record.entity}</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Total Amount: </Text><Text strong style={{ color: '#B11E6A' }}>{record.amount}</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Paid Status: </Text>
                                      <Tag color={record.paid_status === 'Paid' ? 'success' : record.paid_status === 'Partially Paid' ? 'warning' : 'error'} style={{ borderRadius: 8 }}>
                                        {record.paid_status || 'Unpaid'}
                                      </Tag>
                                    </div>
                                  </div>
                                </Col>
                                <Col xs={24} md={12}>
                                  <Text strong style={{ color: '#B11E6A', display: 'block', marginBottom: 8 }}>Items & Quantities</Text>
                                  <Table
                                    size="small"
                                    dataSource={record.items}
                                    pagination={false}
                                    columns={[
                                      { title: 'Item Name', dataIndex: 'name', render: v => <Text strong>{v}</Text> },
                                      { title: 'Quantity', dataIndex: 'qty' },
                                      { title: 'Unit Price', dataIndex: 'price' },
                                      { title: 'Total', dataIndex: 'total', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                                    ]}
                                  />
                                </Col>
                              </Row>
                            </div>
                          ),
                        }}
                        columns={[
                          { title: 'Purchase Date', dataIndex: 'date', key: 'date', width: 100, render: v => <Text strong>{v}</Text> },
                          {
                            title: 'Invoice No', key: 'inv', width: 140,
                            render: (_, r) => (
                              <Button
                                type="link"
                                style={{ color: '#B11E6A', padding: 0, fontWeight: 700 }}
                                onClick={() => window.open('#', '_blank')}
                                title="Click to open invoice"
                              >{r.inv_no}</Button>
                            )
                          },
                          {
                            title: 'Invoice File', key: 'inv_file', width: 110,
                            render: (_, r) => r.invoice_file ? (
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                style={{ color: '#1890ff', borderColor: '#1890ff', fontSize: 11 }}
                                onClick={() => window.open('#', '_blank')}
                              >Open</Button>
                            ) : <Tag color="default" style={{ borderRadius: 8, fontSize: 10 }}>No File</Tag>
                          },
                          {
                            title: 'Items', key: 'items', width: 200,
                            render: (_, r) => (
                              <div>
                                {r.items.map((item, idx) => (
                                  <div key={idx} style={{ fontSize: 11, marginBottom: 2 }}>
                                    <Text strong>{item.name}</Text>
                                    <Text type="secondary"> — {item.qty}</Text>
                                  </div>
                                ))}
                              </div>
                            )
                          },
                          { title: 'Supplier', dataIndex: 'entity', key: 'entity', width: 130, render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Total Amount', dataIndex: 'amount', key: 'amount', width: 110, render: (v) => <Text strong>{v}</Text> },
                          {
                            title: 'Paid Status', key: 'paid_status', width: 140,
                            render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Tag
                                  color={r.paid_status === 'Paid' ? 'success' : r.paid_status === 'Partially Paid' ? 'warning' : 'error'}
                                  style={{ borderRadius: 10 }}
                                >{r.paid_status || 'Unpaid'}</Tag>
                                {r.paid_amount > 0 && <Text style={{ fontSize: 10, color: '#52c41a' }}>Paid: ₹{r.paid_amount?.toLocaleString()}</Text>}
                                {r.remaining > 0 && <Text style={{ fontSize: 10, color: '#ff4d4f' }}>Due: ₹{r.remaining?.toLocaleString()}</Text>}
                              </Space>
                            )
                          },
                          { title: 'Order Status', dataIndex: 'req_status', key: 'status', width: 110, render: (v) => <Tag color={v === 'Confirmed' ? 'success' : 'processing'}>{v}</Tag> },
                          {
                            title: 'Actions', key: 'actions', fixed: 'right', width: 120,
                            render: (_, r) => (
                              <Space>
                                <Button size="small" type="link" icon={<EyeOutlined />} style={{ color: '#B11E6A' }}>View</Button>
                                {r.paid_status !== 'Paid' && (
                                  <Button size="small" icon={<UploadOutlined />} style={{ color: '#1890ff', fontSize: 11 }}>Proof</Button>
                                )}
                              </Space>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: 'quotation_comparison',
                  label: <Space><RobotOutlined />Quotation Comparison</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <Title level={5} style={{ margin: 0, color: isDark ? '#e0e0e0' : '#1a1a2e' }}>AI Quotation Comparison</Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>Upload multiple supplier quotation files and let AI suggest the best option</Text>
                        </div>
                        {quotCompareFiles.length > 0 && (
                          <Button
                            danger
                            size="small"
                            onClick={() => { setQuotCompareFiles([]); setQuotCompareResult(null); }}
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Upload Area */}
                      <Upload.Dragger
                        multiple
                        beforeUpload={(file) => {
                          setQuotCompareFiles(prev => [...prev, file]);
                          setQuotCompareResult(null);
                          return false;
                        }}
                        onRemove={(file) => {
                          setQuotCompareFiles(prev => prev.filter(f => f.uid !== file.uid));
                          setQuotCompareResult(null);
                        }}
                        fileList={quotCompareFiles}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
                        style={{ borderRadius: 12, marginBottom: 16, background: isDark ? '#1a1a2a' : '#fafcff', borderColor: '#B11E6A66' }}
                      >
                        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                          <UploadOutlined style={{ fontSize: 36, color: '#B11E6A', marginBottom: 10, display: 'block' }} />
                          <Text strong style={{ fontSize: 14, color: isDark ? '#e0e0e0' : '#1a1a2e', display: 'block', marginBottom: 4 }}>
                            Click or drag quotation files here
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Supports PDF, JPG, PNG, DOC, XLSX — upload 2 or more quotations to compare
                          </Text>
                        </div>
                      </Upload.Dragger>

                      {/* File count indicator */}
                      {quotCompareFiles.length > 0 && (
                        <div style={{ marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: isDark ? '#1a1a2a' : '#f0f4ff', border: '1px solid #B11E6A33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <Space>
                            <FileTextOutlined style={{ color: '#B11E6A' }} />
                            <Text style={{ fontSize: 13 }}>
                              <span style={{ fontWeight: 700, color: '#B11E6A' }}>{quotCompareFiles.length}</span> quotation{quotCompareFiles.length > 1 ? 's' : ''} uploaded
                              {quotCompareFiles.length < 2 && (
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>(upload at least 2 to compare)</Text>
                              )}
                            </Text>
                          </Space>
                          <Button
                            type="primary"
                            icon={<RobotOutlined />}
                            disabled={quotCompareFiles.length < 2}
                            loading={quotCompareLoading}
                            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                            onClick={() => {
                              setQuotCompareLoading(true);
                              setQuotCompareResult(null);
                              setTimeout(() => {
                                const mockSuppliers = quotCompareFiles.map((f, i) => {
                                  const prices = [48500, 43200, 51000, 39800, 46700];
                                  const deliveries = ['7 days', '10 days', '5 days', '14 days', '8 days'];
                                  const qualities = ['Premium', 'Standard', 'Premium', 'Economy', 'Standard'];
                                  const terms = ['30% advance, 70% on delivery', '50% advance, 50% on delivery', 'Full payment in advance', '100% credit (30 days)', '40% advance, 60% credit'];
                                  const scores = [82, 91, 74, 78, 85];
                                  return {
                                    name: f.name.replace(/\.[^/.]+$/, ''),
                                    price: prices[i % prices.length],
                                    delivery: deliveries[i % deliveries.length],
                                    quality: qualities[i % qualities.length],
                                    terms: terms[i % terms.length],
                                    score: scores[i % scores.length],
                                  };
                                });
                                const best = mockSuppliers.reduce((a, b) => a.score > b.score ? a : b);
                                setQuotCompareResult({ suppliers: mockSuppliers, best });
                                setQuotCompareLoading(false);
                              }, 2200);
                            }}
                          >
                            {quotCompareLoading ? 'Analysing...' : 'Compare with AI'}
                          </Button>
                        </div>
                      )}

                      {/* AI Results */}
                      {quotCompareResult && (
                        <div>
                          {/* Best Recommendation Banner */}
                          <div style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A18,#D85C9E10)', border: '1.5px solid #B11E6A44' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <RobotOutlined style={{ color: '#fff', fontSize: 18 }} />
                              </div>
                              <div>
                                <Text strong style={{ fontSize: 14, color: '#B11E6A', display: 'block', marginBottom: 4 }}>
                                  AI Recommendation
                                </Text>
                                <Text style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#333', lineHeight: 1.6 }}>
                                  Based on price, delivery time, quality, and payment terms, <Text strong style={{ color: '#B11E6A' }}>{quotCompareResult.best.name}</Text> is the best quotation with an overall score of <Text strong style={{ color: '#B11E6A' }}>{quotCompareResult.best.score}/100</Text>. It offers the optimal balance of cost-efficiency and reliability.
                                </Text>
                              </div>
                            </div>
                          </div>

                          {/* Comparison Table */}
                          <Table
                            size="small"
                            rowKey="name"
                            dataSource={quotCompareResult.suppliers}
                            scroll={{ x: 700 }}
                            pagination={false}
                            rowClassName={(r) => r.name === quotCompareResult.best.name ? 'ant-table-row-selected' : ''}
                            columns={[
                              {
                                title: 'Quotation', dataIndex: 'name', width: 180,
                                render: (v, r) => (
                                  <Space>
                                    <Text strong style={{ color: r.name === quotCompareResult.best.name ? '#B11E6A' : isDark ? '#e0e0e0' : '#1a1a2e', fontSize: 13 }}>{v}</Text>
                                    {r.name === quotCompareResult.best.name && <Tag color="#B11E6A" style={{ borderRadius: 10, fontSize: 11 }}>Best</Tag>}
                                  </Space>
                                ),
                              },
                              {
                                title: 'Price', dataIndex: 'price', width: 110,
                                render: (v, r) => {
                                  const min = Math.min(...quotCompareResult.suppliers.map(s => s.price));
                                  return <Text strong style={{ color: v === min ? '#52c41a' : isDark ? '#e0e0e0' : '#333' }}>₹{v.toLocaleString()}</Text>;
                                },
                                sorter: (a, b) => a.price - b.price,
                              },
                              {
                                title: 'Delivery', dataIndex: 'delivery', width: 100,
                                render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text>,
                              },
                              {
                                title: 'Quality', dataIndex: 'quality', width: 100,
                                render: (v) => <Tag color={v === 'Premium' ? 'gold' : v === 'Standard' ? 'blue' : 'default'} style={{ borderRadius: 10 }}>{v}</Tag>,
                              },
                              {
                                title: 'Payment Terms', dataIndex: 'terms', width: 220,
                                render: (v) => <Text style={{ fontSize: 12, color: isDark ? '#bbb' : '#555' }}>{v}</Text>,
                              },
                              {
                                title: 'AI Score', dataIndex: 'score', width: 90,
                                render: (v, r) => (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? '#333' : '#f0f0f0', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${v}%`, borderRadius: 3, background: r.name === quotCompareResult.best.name ? 'linear-gradient(90deg,#B11E6A,#D85C9E)' : 'linear-gradient(90deg,#3730a3,#6366f1)' }} />
                                    </div>
                                    <Text strong style={{ fontSize: 12, color: r.name === quotCompareResult.best.name ? '#B11E6A' : isDark ? '#e0e0e0' : '#333', minWidth: 28 }}>{v}</Text>
                                  </div>
                                ),
                                sorter: (a, b) => a.score - b.score,
                                defaultSortOrder: 'descend',
                              },
                            ]}
                          />

                          {/* Actions */}
                          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <Button
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 600 }}
                              onClick={() => message.success(`${quotCompareResult.best.name} selected as the preferred quotation`)}
                            >
                              Select Best Quotation
                            </Button>
                            <Button
                              icon={<WhatsAppOutlined />}
                              style={{ color: '#25D366', borderColor: '#25D36644', fontWeight: 600 }}
                              onClick={() => message.success('Comparison report shared via WhatsApp')}
                            >
                              Share Report
                            </Button>
                            <Button
                              icon={<DownloadOutlined />}
                              onClick={() => message.info('Downloading comparison report...')}
                            >
                              Download Report
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {quotCompareFiles.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: isDark ? '#888' : '#aaa' }}>
                          <RobotOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block', opacity: 0.4 }} />
                          <Text type="secondary" style={{ fontSize: 14 }}>Upload 2 or more quotation files to start AI comparison</Text>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ──────── Add Local Purchase Modal ──────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Add Local Purchase</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Scan invoice → AI fetches details → Choose payment type</div>
            </div>
          </div>
        }
        open={showAddLocalPurchaseModal}
        onCancel={() => { setShowAddLocalPurchaseModal(false); localPurchaseForm.resetFields(); setLocalPurchaseInvoiceFile(null); setLocalPurchaseScannedDetails(null); setLocalPurchaseNewVendorDetected(false); setLocalPurchasePaymentType('credit'); setLocalPurchasePaidBy(''); }}
        footer={null}
        width={580}
        centered
      >
        <Form form={localPurchaseForm} layout="vertical" onFinish={handleAddLocalPurchase} style={{ marginTop: 8 }}>

          {/* Invoice Scan Section */}
          <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
              </div>
              <div>
                <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Invoice with AI</Text>
                <Text style={{ fontSize: 11, color: '#aaa' }}>Upload invoice — AI will extract vendor, items, and amount</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Upload
                maxCount={1}
                beforeUpload={file => { setLocalPurchaseInvoiceFile(file); return false; }}
                onRemove={() => setLocalPurchaseInvoiceFile(null)}
                accept=".pdf,.jpg,.jpeg,.png"
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A' }}>Upload Invoice</Button>
              </Upload>
              <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setLocalPurchaseInvoiceFile)} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A' }}>Scan</Button>
              <Button
                icon={<ThunderboltOutlined />}
                loading={localPurchaseScanLoading}
                onClick={handleLocalPurchaseInvoiceScan}
                style={{ borderRadius: 8, background: localPurchaseInvoiceFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: localPurchaseInvoiceFile ? '#fff' : '#bbb', fontWeight: 700 }}
              >
                {localPurchaseScanLoading ? 'Scanning...' : 'Fetch with AI'}
              </Button>
            </div>
          </div>

          {/* Scanned Vendor Details */}
          {localPurchaseScannedDetails && (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: isDark ? '#0f1a0f' : '#f6fff8', border: '1px solid #52c41a33' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space size={4}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text style={{ fontWeight: 700, color: '#52c41a', fontSize: 13 }}>Vendor Detected</Text>
                  {localPurchaseNewVendorDetected ? (
                    <Tag color="orange" style={{ borderRadius: 8 }}>New Vendor</Tag>
                  ) : (
                    <Tag color="success" style={{ borderRadius: 8 }}>Existing Vendor</Tag>
                  )}
                </Space>
              </div>
              <Row gutter={8}>
                {[
                  { label: 'Vendor Name', val: localPurchaseScannedDetails.vendorName },
                  { label: 'Phone', val: localPurchaseScannedDetails.vendorPhone },
                  { label: 'Address', val: localPurchaseScannedDetails.vendorAddress },
                  { label: 'Total Amount', val: `₹${localPurchaseScannedDetails.totalAmount?.toLocaleString()}` },
                ].map((d, i) => (
                  <Col xs={12} key={i} style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, color: '#888', display: 'block' }}>{d.label}</Text>
                    <Text strong style={{ fontSize: 12 }}>{d.val}</Text>
                  </Col>
                ))}
              </Row>
              {localPurchaseScannedDetails.items?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>Items Detected:</Text>
                  {localPurchaseScannedDetails.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '2px 0' }}>
                      <Text strong>{item.name}</Text><Text type="secondary"> — {item.qty} {item.unit} × ₹{item.amount?.toLocaleString()}</Text>
                    </div>
                  ))}
                </div>
              )}
              {localPurchaseNewVendorDetected && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: isDark ? '#1a1500' : '#fffbe6', border: '1px solid #fa8c1644' }}>
                  <Space>
                    <WarningOutlined style={{ color: '#fa8c16' }} />
                    <Text style={{ fontSize: 12, color: '#d46b08' }}>New vendor detected — add to vendors list?</Text>
                  </Space>
                  <Form.Item name="addToVendors" valuePropName="checked" style={{ margin: '8px 0 0' }}>
                    <Checkbox>Yes, add "{localPurchaseScannedDetails.vendorName}" to Vendors List</Checkbox>
                  </Form.Item>
                </div>
              )}
            </div>
          )}

          {/* Manual fields if not scanned */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Invoice Number" name="invoiceNo" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="INV-XXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Vendor Name" name="vendorName" rules={[{ required: true, message: 'Required' }]}>
                <Select
                  placeholder="Select or type vendor"
                  showSearch
                  optionFilterProp="children"
                  dropdownRender={menu => (
                    <>
                      {menu}
                      <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                        <Button type="link" icon={<PlusOutlined />} style={{ color: '#B11E6A', padding: 0, fontWeight: 600 }}
                          onClick={() => { setInlineDropdownContext('local_purchase'); setShowAddVendorInlineModal(true); }}>
                          Add New Vendor
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {vendors.map(v => <Option key={v.id} value={v.name}>{v.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Vendor Phone" name="vendorPhone">
                <Input placeholder="+91 00000 00000" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Total Amount (₹)" name="totalAmount" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber prefix="₹" style={{ width: '100%' }} min={0} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          {/* Payment Type */}
          <Form.Item label="Payment Type" name="paymentType" initialValue="credit" rules={[{ required: true }]}>
            <Select
              onChange={val => setLocalPurchasePaymentType(val)}
            >
              <Option value="credit">
                <Space><ClockCircleOutlined style={{ color: '#fa8c16' }} /><span>Credit (Pay Later)</span></Space>
              </Option>
              <Option value="instant">
                <Space><ThunderboltOutlined style={{ color: '#52c41a' }} /><span>Instant (Pay Now)</span></Space>
              </Option>
            </Select>
          </Form.Item>

          {localPurchasePaymentType === 'credit' && (
            <Alert
              message="Credit Payment — Pending"
              description="Payment will be set as Pending. Financial team will be notified every 30 minutes until payment is processed."
              type="warning"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          {localPurchasePaymentType === 'instant' && (
            <div style={{ padding: '14px 16px', borderRadius: 10, background: isDark ? '#0a1a10' : '#f6fff8', border: '1px solid #52c41a33', marginBottom: 16 }}>
              <Text style={{ fontWeight: 700, color: '#52c41a', display: 'block', marginBottom: 14, fontSize: 13 }}>
                <ThunderboltOutlined style={{ marginRight: 6 }} />Instant Payment Details
              </Text>
              {/* Paid By selection */}
              <Form.Item label={<Text strong style={{ fontSize: 12 }}>Paid By</Text>} name="paidBy" rules={[{ required: true, message: 'Select who made the payment' }]} style={{ marginBottom: 12 }}>
                <Select
                  placeholder="Select who paid..."
                  style={{ borderRadius: 8 }}
                  onChange={val => setLocalPurchasePaidBy(val)}
                >
                  <Option value="purchase_person">Purchase Person</Option>
                  <Option value="finance_team">Finance Team</Option>
                </Select>
              </Form.Item>

              {localPurchasePaidBy === 'purchase_person' && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12, borderRadius: 8 }}
                  message={<Text strong style={{ fontSize: 12 }}>Goes to Reimbursement Expense</Text>}
                  description={<Text style={{ fontSize: 11 }}>This payment will be recorded as a Purchase Person expense and sent to the Reimbursement Expense section for approval and settlement.</Text>}
                />
              )}
              {localPurchasePaidBy === 'finance_team' && (
                <Alert
                  type="success"
                  showIcon
                  style={{ marginBottom: 12, borderRadius: 8 }}
                  message={<Text strong style={{ fontSize: 12 }}>Goes to Finance Team</Text>}
                  description={<Text style={{ fontSize: 11 }}>This payment will be recorded as a Finance Team expense and logged in the Finance section for tracking.</Text>}
                />
              )}

              <Form.Item label="GPay / UPI Number" name="gPayNumber" rules={[{ required: true, message: 'Enter GPay number for instant payment' }]} style={{ marginBottom: 12 }}>
                <Input placeholder="GPay / UPI Number" prefix={<PhoneOutlined style={{ color: '#52c41a' }} />} />
              </Form.Item>

              {/* Upload Payment Proof — shown for both paid-by options */}
              {(localPurchasePaidBy === 'purchase_person' || localPurchasePaidBy === 'finance_team') && (
                <Form.Item
                  label={
                    <Space size={4}>
                      <UploadOutlined style={{ color: '#52c41a' }} />
                      <Text strong style={{ fontSize: 12 }}>
                        Upload Payment Proof {localPurchasePaidBy === 'purchase_person' ? '(Reimbursement)' : '(Finance Team)'}
                      </Text>
                    </Space>
                  }
                  name="paymentProofFile"
                  style={{ marginBottom: 0 }}
                >
                  <Upload.Dragger maxCount={1} beforeUpload={() => false} accept=".jpg,.jpeg,.png,.pdf" style={{ borderRadius: 8 }}>
                    <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#52c41a', fontSize: 20 }} /></p>
                    <p className="ant-upload-text" style={{ fontSize: 12 }}>
                      {localPurchasePaidBy === 'purchase_person' ? 'Upload receipt / bill for reimbursement claim' : 'Upload GPay / UPI / bank payment screenshot'}
                    </p>
                    <p className="ant-upload-hint" style={{ fontSize: 10 }}>JPG, PNG, or PDF accepted</p>
                  </Upload.Dragger>
                </Form.Item>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowAddLocalPurchaseModal(false); localPurchaseForm.resetFields(); setLocalPurchaseInvoiceFile(null); setLocalPurchaseScannedDetails(null); setLocalPurchaseNewVendorDetected(false); setLocalPurchasePaymentType('credit'); setLocalPurchasePaidBy(''); }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
            >
              Save Local Purchase
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ──────── Inline Add Supplier Modal ──────── */}
      <Modal
        title={<Space><PlusOutlined style={{ color: '#B11E6A' }} /><Text strong>Add New Supplier</Text></Space>}
        open={showAddSupplierInlineModal}
        onCancel={() => { setShowAddSupplierInlineModal(false); addSupplierInlineForm.resetFields(); }}
        footer={null}
        width={440}
        centered
      >
        <Form form={addSupplierInlineForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Supplier Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Company / Supplier name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phone / WhatsApp" name="phone" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="+91 00000 00000" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Email" name="email">
                <Input placeholder="email@supplier.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="City / Address" name="address">
                <Input placeholder="City, State" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="GST / Tax ID" name="tax">
            <Input placeholder="GSTIN" />
          </Form.Item>
          <Form.Item label="Bank Details" name="bank">
            <Input.TextArea rows={2} placeholder="Bank, A/C, IFSC" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowAddSupplierInlineModal(false); addSupplierInlineForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }} onClick={handleAddSupplierInline}>
              Add Supplier
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ──────── Inline Add Vendor Modal ──────── */}
      <Modal
        title={<Space><PlusOutlined style={{ color: '#1890ff' }} /><Text strong>Add New Vendor</Text></Space>}
        open={showAddVendorInlineModal}
        onCancel={() => { setShowAddVendorInlineModal(false); addVendorInlineForm.resetFields(); }}
        footer={null}
        width={440}
        centered
      >
        <Form form={addVendorInlineForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Vendor / Hotel Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Hotel / Vendor name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Phone / WhatsApp" name="phone" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="+91 00000 00000" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Email" name="email">
                <Input placeholder="email@vendor.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="City / Address" name="address">
                <Input placeholder="City, State" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="GST / Tax ID" name="tax">
            <Input placeholder="GSTIN" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowAddVendorInlineModal(false); addVendorInlineForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" style={{ flex: 2, background: 'linear-gradient(135deg,#1890ff,#096dd9)', border: 'none', fontWeight: 700 }} onClick={handleAddVendorInline}>
              Add Vendor
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Ask Quotation Modal — WhatsApp only */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WhatsAppOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>Ask Quotation</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Send quotation request to supplier via WhatsApp</div>
            </div>
          </div>
        }
        open={showAddPurchaseModal}
        onCancel={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); setSelectedSupplier(null); }}
        footer={null}
        width={520}
        centered
      >
        <Form form={purchaseForm} layout="vertical" style={{ marginTop: 4 }}>

          {/* Product & Supplier */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Product Code" name="product_code" style={{ marginBottom: 12 }}>
                  <Input disabled style={{ borderRadius: 8, background: isDark ? '#1e2235' : '#fff', fontWeight: 700, color: '#B11E6A' }} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item label="Product" name="product" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                  <Input disabled style={{ borderRadius: 8, background: isDark ? '#1e2235' : '#fff' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Select a supplier' }]} style={{ marginBottom: 0 }}>
                  <Select
                    placeholder="Select supplier"
                    style={{ borderRadius: 8 }}
                    onChange={(val) => {
                      if (val === '__add_new__') {
                        setInlineDropdownContext('quotation');
                        setShowAddSupplierInlineModal(true);
                        purchaseForm.setFieldValue('supplier', undefined);
                        return;
                      }
                      setSelectedSupplier(suppliers.find(s => s.name === val) || null);
                    }}
                    dropdownRender={menu => (
                      <>
                        {menu}
                        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            style={{ color: '#B11E6A', padding: 0, fontWeight: 600 }}
                            onClick={() => { setInlineDropdownContext('quotation'); setShowAddSupplierInlineModal(true); }}
                          >
                            Add New Supplier
                          </Button>
                        </div>
                      </>
                    )}
                  >
                    {suppliers.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Supplier Contact */}
          {selectedSupplier && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: `1px solid #25D36633` }}>
              <div style={{ background: 'linear-gradient(135deg,#25D36618,#128C7E10)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <WhatsAppOutlined style={{ color: '#25D366', fontSize: 13 }} />
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#25D366' }}>Supplier Contact</Text>
              </div>
              <div style={{ display: 'flex', padding: '10px 14px', gap: 0, background: isDark ? '#0a1a10' : '#f6fff8' }}>
                {[
                  { label: 'Phone / WhatsApp', value: selectedSupplier.phone },
                  { label: 'Email', value: selectedSupplier.email },
                  { label: 'Address', value: selectedSupplier.address },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, borderRight: i < 2 ? `1px solid ${isDark ? '#1a3a20' : '#d9f7e3'}` : 'none', padding: '0 10px', paddingLeft: i === 0 ? 0 : 10 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textColor, wordBreak: 'break-word' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status */}
          {selectedProduct && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: `1px solid ${selectedProduct.current <= selectedProduct.min ? '#ffe58f' : '#91d5ff'}` }}>
              <div style={{ background: selectedProduct.current <= selectedProduct.min ? '#fffbe6' : '#e6f7ff', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <InfoCircleOutlined style={{ color: selectedProduct.current <= selectedProduct.min ? '#d48806' : '#0050b3', fontSize: 13 }} />
                <Text style={{ fontSize: 12, fontWeight: 600, color: selectedProduct.current <= selectedProduct.min ? '#ad6800' : '#003a8c' }}>Stock Status</Text>
                <Tag color={selectedProduct.current <= selectedProduct.min ? 'warning' : 'processing'} style={{ marginLeft: 'auto', borderRadius: 10, fontSize: 11 }}>
                  {selectedProduct.current <= selectedProduct.min ? 'Low Stock' : 'Healthy'}
                </Tag>
              </div>
              <div style={{ display: 'flex', padding: '12px 14px', gap: 0 }}>
                {[
                  { label: 'Current Stock', value: `${selectedProduct.current} ${selectedProduct.unit}`, color: selectedProduct.current <= selectedProduct.min ? '#ff4d4f' : '#52c41a' },
                  { label: 'Min. Required', value: `${selectedProduct.min} ${selectedProduct.unit}`, color: '#fa8c16' },
                  { label: 'Shortfall', value: selectedProduct.current < selectedProduct.min ? `${selectedProduct.min - selectedProduct.current} ${selectedProduct.unit}` : 'None', color: selectedProduct.current < selectedProduct.min ? '#ff4d4f' : '#52c41a' },
                ].map((stat, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` : 'none', padding: '0 8px' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{stat.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item label="Quantity to Request" name="qty" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                  <InputNumber style={{ width: '100%', borderRadius: 8 }} placeholder="0" min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Unit" name="unit" style={{ marginBottom: 0 }}>
                  <Input disabled style={{ borderRadius: 8, textAlign: 'center' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Multi-select additional low-stock products */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: textColor, display: 'block', marginBottom: 8 }}>
              Also include in this quotation request: <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>(optional — select more low-stock items)</Text>
            </Text>
            <Select
              mode="multiple"
              placeholder="Select additional products..."
              style={{ width: '100%', borderRadius: 8 }}
              value={quotationExtraProducts}
              onChange={(vals) => {
                setQuotationExtraProducts(vals);
                const newQtys = { ...quotationExtraQtys };
                vals.forEach(v => { if (!newQtys[v]) { const inv = inventory.find(i => i.name === v); newQtys[v] = inv ? Math.max(inv.min - inv.current, inv.min) : 1; } });
                setQuotationExtraQtys(newQtys);
              }}
              optionLabelProp="label"
            >
              {inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.name !== selectedProduct?.name).map(i => (
                <Option key={i.key} value={i.name} label={i.name}>
                  <Space>
                    <Tag color={i.status === 'Out' ? 'error' : 'warning'} style={{ fontSize: 10, margin: 0 }}>{i.status}</Tag>
                    <Text>{i.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>({i.current}/{i.min} {i.unit})</Text>
                  </Space>
                </Option>
              ))}
            </Select>
            {quotationExtraProducts.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {quotationExtraProducts.map(productName => {
                  const inv = inventory.find(i => i.name === productName);
                  return (
                    <Row key={productName} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                      <Col flex="auto"><Text style={{ fontSize: 12 }}>{productName}</Text></Col>
                      <Col style={{ width: 120 }}>
                        <InputNumber
                          size="small"
                          min={1}
                          value={quotationExtraQtys[productName]}
                          onChange={v => setQuotationExtraQtys(prev => ({ ...prev, [productName]: v }))}
                          addonAfter={<Text style={{ fontSize: 11 }}>{inv?.unit || 'Pcs'}</Text>}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => { setShowAddPurchaseModal(false); purchaseForm.resetFields(); setSelectedProduct(null); setSelectedSupplier(null); setQuotationExtraProducts([]); setQuotationExtraQtys({}); }} style={{ flex: 1, height: 44, borderRadius: 10 }}>Cancel</Button>
            <Button
              block
              icon={<WhatsAppOutlined />}
              onClick={() => {
                const values = purchaseForm.getFieldsValue();
                if (!values.supplier) { message.warning('Please select a supplier first'); return; }
                const mainLine = `â€¢ *${values.product}* — Qty: ${values.qty || 'N/A'} ${values.unit || ''}`;
                const extraLines = quotationExtraProducts.map(p => {
                  const inv = inventory.find(i => i.name === p);
                  return `â€¢ *${p}* — Qty: ${quotationExtraQtys[p] || 'N/A'} ${inv?.unit || 'Pcs'}`;
                });
                const allLines = [mainLine, ...extraLines].join('\n');
                const msg = `Hello, I would like to request a quotation for the following items:\n\n${allLines}\n\nPlease advise on pricing and availability.`;
                const phone = selectedSupplier ? selectedSupplier.phone.replace(/\D/g, '') : '';
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                if (selectedProduct?.key) {
                  setWhatsappSentItems(prev => new Set(prev).add(selectedProduct.key));
                  // Start 30-min reminder until quotation received
                  startQuotationReminder(selectedProduct.key, selectedProduct.name, values.supplier);
                  message.info('30-minute quotation reminders started. You will be reminded until quotation is received.', 5);
                }
                setShowAddPurchaseModal(false);
                purchaseForm.resetFields();
                setSelectedProduct(null);
                setSelectedSupplier(null);
                setQuotationExtraProducts([]);
                setQuotationExtraQtys({});
              }}
              style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14 }}
            >
              Send via WhatsApp
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Raise Request Modal — upload quotation doc + AI + send to Financial */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UploadOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>Raise Request</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Upload received quotation â†' AI extracts details â†' Send to Financial</div>
            </div>
          </div>
        }
        open={showRaiseRequestModal}
        onCancel={() => { setShowRaiseRequestModal(false); raiseRequestForm.resetFields(); setRaiseRequestProduct(null); setRaiseRequestSupplier(null); setRaiseRequestFile(null); setRaiseRequestPaymentTerms(''); }}
        footer={null}
        width={560}
        centered
      >
        <Form form={raiseRequestForm} layout="vertical" style={{ marginTop: 4 }}>

          {/* Product info banner */}
          {raiseRequestProduct && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: isDark ? '#1a0f14' : '#fff8fb', border: '1px solid #B11E6A33', marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShoppingOutlined style={{ color: '#fff', fontSize: 16 }} />
              </div>
              <div style={{ flex: 1 }}>
                <Space size={8} align="center" style={{ marginBottom: 2 }}>
                  {raiseRequestProduct.code && (
                    <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 700, fontSize: 11, margin: 0 }}>
                      {raiseRequestProduct.code}
                    </Tag>
                  )}
                  <Text strong style={{ color: textColor, fontSize: 14 }}>{raiseRequestProduct.name}</Text>
                </Space>
                <Space size={12} style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: raiseRequestProduct.current <= raiseRequestProduct.min ? '#ff4d4f' : '#52c41a' }}>
                    Stock: {raiseRequestProduct.current} {raiseRequestProduct.unit}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#fa8c16' }}>Min: {raiseRequestProduct.min} {raiseRequestProduct.unit}</Text>
                  <Tag color={raiseRequestProduct.current <= raiseRequestProduct.min ? 'error' : 'success'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                    {raiseRequestProduct.current <= raiseRequestProduct.min ? 'Low Stock' : 'Healthy'}
                  </Tag>
                </Space>
              </div>
              <Form.Item name="product" hidden><Input /></Form.Item>
              <Form.Item name="product_code" hidden><Input /></Form.Item>
              <Form.Item name="unit" hidden><Input /></Form.Item>
            </div>
          )}

          {/* Supplier */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Select a supplier' }]} style={{ marginBottom: 0 }}>
              <Select
                placeholder="Select supplier"
                style={{ borderRadius: 8 }}
                onChange={(val) => {
                  if (val === '__add_new__') {
                    setInlineDropdownContext('raise_request');
                    setShowAddSupplierInlineModal(true);
                    raiseRequestForm.setFieldValue('supplier', undefined);
                    return;
                  }
                  setRaiseRequestSupplier(suppliers.find(s => s.name === val) || null);
                }}
                dropdownRender={menu => (
                  <>
                    {menu}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        style={{ color: '#B11E6A', padding: 0, fontWeight: 600 }}
                        onClick={() => { setInlineDropdownContext('raise_request'); setShowAddSupplierInlineModal(true); }}
                      >
                        Add New Supplier
                      </Button>
                    </div>
                  </>
                )}
              >
                {suppliers.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
              </Select>
            </Form.Item>
            {raiseRequestSupplier && (
              <div style={{ marginTop: 10, display: 'flex', gap: 0 }}>
                {[
                  { label: 'Phone', value: raiseRequestSupplier.phone },
                  { label: 'Email', value: raiseRequestSupplier.email },
                  { label: 'Address', value: raiseRequestSupplier.address },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, borderRight: i < 2 ? `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` : 'none', padding: '0 10px', paddingLeft: i === 0 ? 0 : 10 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: textColor, wordBreak: 'break-word' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Quotation File + AI Scan */}
          <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
              </div>
              <div>
                <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Upload Received Quotation</Text>
                <Text style={{ fontSize: 11, color: '#aaa' }}>Upload quotation file — AI will auto-fill payment terms & quantity</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Upload
                maxCount={1}
                beforeUpload={(file) => { setRaiseRequestFile(file); return false; }}
                onRemove={() => setRaiseRequestFile(null)}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ flex: 1 }}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>
                  {raiseRequestFile ? raiseRequestFile.name : 'Upload Quotation File'}
                </Button>
              </Upload>
              <Button
                icon={<ThunderboltOutlined />}
                loading={raiseRequestScanLoading}
                onClick={handleRaiseRequestAIScan}
                style={{ borderRadius: 8, background: raiseRequestFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: raiseRequestFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                {raiseRequestScanLoading ? 'Scanning...' : 'Scan with AI'}
              </Button>
            </div>
            {raiseRequestFile && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#B11E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileTextOutlined /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{raiseRequestFile.name}</Text>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item label="Quantity" name="qty" rules={[{ required: true, message: 'Required' }]} style={{ marginBottom: 0 }}>
                  <InputNumber style={{ width: '100%', borderRadius: 8 }} placeholder="0" min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Unit" name="unit_display" style={{ marginBottom: 0 }}>
                  <Input value={raiseRequestProduct?.unit} disabled style={{ borderRadius: 8, textAlign: 'center' }} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Payment Terms */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Form.Item label="Payment Terms" name="payment_terms" rules={[{ required: true, message: 'Select payment terms' }]} style={{ marginBottom: 0 }}>
              <Select placeholder="Select payment terms" onChange={(val) => setRaiseRequestPaymentTerms(val)}>
                <Option value="100% Payment">100% Payment</Option>
                <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
                <Option value="From Quotation">From Quotation</Option>
              </Select>
            </Form.Item>
            {(raiseRequestPaymentTerms === '50% Advance, 50% on Dispatch' || raiseRequestPaymentTerms === '50% Advance, 50% After Delivery (Max 15 days)') && (
              <Form.Item
                label={<span style={{ color: '#B11E6A', fontWeight: 600 }}>Second Payment Reminder Date</span>}
                name="payment_reminder_date"
                rules={[{ required: true, message: 'Select reminder date for 2nd payment' }]}
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="Pick reminder date for 2nd payment" disabledDate={(d) => d && d.isBefore(dayjs(), 'day')} />
              </Form.Item>
            )}
          </div>

          {/* Previous complaints banner for selected supplier */}
          {raiseRequestSupplier && (() => {
            const complaints = vendorComplaintsData[raiseRequestSupplier.name] || [];
            const open = complaints.filter(c => c.status === 'Open');
            if (!open.length) return null;
            return (
              <Alert
                style={{ marginBottom: 14, borderRadius: 10 }}
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={<Text strong style={{ fontSize: 12 }}>Pending Complaints — {raiseRequestSupplier.name}</Text>}
                description={
                  <div style={{ marginTop: 4 }}>
                    {open.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                        <Tag color={c.severity === 'high' ? 'error' : c.severity === 'medium' ? 'warning' : 'default'} style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>{c.severity.toUpperCase()}</Tag>
                        <Text style={{ fontSize: 11 }}>{c.issue} <Text type="secondary" style={{ fontSize: 10 }}>({c.date})</Text></Text>
                      </div>
                    ))}
                  </div>
                }
              />
            );
          })()}

          {/* Complaint / Issue Notes */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ExclamationCircleOutlined style={{ color: '#fa8c16', fontSize: 13 }} />
              <Text style={{ fontSize: 12, fontWeight: 600, color: textColor }}>Complaint / Issue Notes</Text>
              <Tag color="default" style={{ fontSize: 10, marginLeft: 'auto' }}>Optional</Tag>
            </div>
            <Form.Item name="complaint_notes" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={2}
                placeholder="Log any complaints or issues from previous orders with this supplier (e.g. late delivery, quality issues, wrong quantity)..."
                style={{ borderRadius: 8, fontSize: 12 }}
              />
            </Form.Item>
          </div>

          {/* Multi-select additional products */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: textColor, display: 'block', marginBottom: 8 }}>
              Also raise request for: <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>(optional — select more low-stock items for same supplier)</Text>
            </Text>
            <Select
              mode="multiple"
              placeholder="Select additional low-stock products..."
              style={{ width: '100%', borderRadius: 8 }}
              value={raiseRequestExtraProducts}
              onChange={(vals) => {
                setRaiseRequestExtraProducts(vals);
                const newQtys = { ...raiseRequestExtraQtys };
                vals.forEach(v => { if (!newQtys[v]) { const inv = inventory.find(i => i.name === v); newQtys[v] = inv ? Math.max(inv.min - inv.current, inv.min) : 1; } });
                setRaiseRequestExtraQtys(newQtys);
              }}
              optionLabelProp="label"
            >
              {inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.name !== raiseRequestProduct?.name).map(i => (
                <Option key={i.key} value={i.name} label={i.name}>
                  <Space>
                    <Tag color={i.status === 'Out' ? 'error' : 'warning'} style={{ fontSize: 10, margin: 0 }}>{i.status}</Tag>
                    <Text>{i.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>({i.current}/{i.min} {i.unit})</Text>
                  </Space>
                </Option>
              ))}
            </Select>
            {raiseRequestExtraProducts.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {raiseRequestExtraProducts.map(productName => {
                  const inv = inventory.find(i => i.name === productName);
                  return (
                    <Row key={productName} gutter={8} align="middle" style={{ marginBottom: 6 }}>
                      <Col flex="auto"><Text style={{ fontSize: 12 }}>{productName}</Text></Col>
                      <Col style={{ width: 130 }}>
                        <InputNumber
                          size="small"
                          min={1}
                          value={raiseRequestExtraQtys[productName]}
                          onChange={v => setRaiseRequestExtraQtys(prev => ({ ...prev, [productName]: v }))}
                          addonAfter={<Text style={{ fontSize: 11 }}>{inv?.unit || 'Pcs'}</Text>}
                          style={{ width: '100%' }}
                        />
                      </Col>
                    </Row>
                  );
                })}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {raiseRequestExtraProducts.length + 1} total request(s) will be raised
                </Text>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => { setShowRaiseRequestModal(false); raiseRequestForm.resetFields(); setRaiseRequestProduct(null); setRaiseRequestSupplier(null); setRaiseRequestFile(null); setRaiseRequestPaymentTerms(''); setRaiseRequestExtraProducts([]); setRaiseRequestExtraQtys({}); }}
              style={{ flex: 1, height: 44, borderRadius: 10 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleRaiseRequestSubmit}
              style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700, fontSize: 14 }}
            >
              Raise Request to Financial
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Payment Request Modal — order details filled after financial approval */}
      <Modal
        title={
          <Space>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>Payment Request</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>Fill in order details to submit to Financial for payment</Text>
            </div>
          </Space>
        }
        open={showRequestOrderModal}
        onCancel={() => { setShowRequestOrderModal(false); requestOrderForm.resetFields(); setSelectedApprovedRequest(null); setRequestOrderScannedFile(null); }}
        footer={null}
        width={600}
        centered
      >
        {selectedApprovedRequest && (
          <>
            {/* Request summary */}
            <div style={{ padding: '12px 16px', background: isDark ? '#0d2010' : '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, marginTop: 16, marginBottom: 20 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>APPROVED REQUEST SUMMARY</Text>
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>ITEM</Text>
                  <div><Text strong>{selectedApprovedRequest.item}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>SUPPLIER</Text>
                  <div><Text strong style={{ color: '#B11E6A' }}>{selectedApprovedRequest.supplier}</Text></div>
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>QUANTITY</Text>
                  <div><Text strong>{selectedApprovedRequest.qty} {selectedApprovedRequest.unit}</Text></div>
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>PAYMENT TERMS</Text>
                  <div><Text strong style={{ fontSize: 11 }}>{selectedApprovedRequest.payment_terms}</Text></div>
                </Col>
              </Row>
            </div>

            {/* Supplier Contact Details */}
            {(() => {
              const sup = suppliers.find(s => s.name === selectedApprovedRequest.supplier);
              if (!sup) return null;
              return (
                <div style={{ padding: '12px 16px', background: isDark ? '#120b0e' : '#fff8fb', border: '1px solid #B11E6A33', borderRadius: 8, marginBottom: 20 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>SUPPLIER CONTACT</Text>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: 11 }}>PHONE / WHATSAPP</Text>
                      <div>
                        <WhatsAppOutlined style={{ color: '#25D366', fontSize: 12, marginRight: 4 }} />
                        <Text strong style={{ fontSize: 12 }}>{sup.phone}</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: 11 }}>EMAIL</Text>
                      <div><Text style={{ fontSize: 12, color: '#B11E6A' }}>{sup.email}</Text></div>
                    </Col>
                    <Col span={8}>
                      <Text type="secondary" style={{ fontSize: 11 }}>ADDRESS</Text>
                      <div><Text style={{ fontSize: 12 }}>{sup.address}</Text></div>
                    </Col>
                  </Row>
                </div>
              );
            })()}

            {/* AI Scan Invoice */}
            <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
                </div>
                <div>
                  <Text style={{ fontWeight: 700, color: '#B11E6A', display: 'block', fontSize: 13 }}>Scan Supplier Invoice with AI</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera — AI will auto-fill order details below</Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Upload
                  maxCount={1}
                  beforeUpload={(file) => { setRequestOrderScannedFile(file); return false; }}
                  onRemove={() => setRequestOrderScannedFile(null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ flex: 1 }}
                >
                  <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>Upload</Button>
                </Upload>
                <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setRequestOrderScannedFile)} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', whiteSpace: 'nowrap' }}>Scan</Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={requestOrderScanLoading}
                  onClick={handleRequestOrderAIScan}
                  style={{ borderRadius: 8, background: requestOrderScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: requestOrderScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {requestOrderScanLoading ? 'Scanning...' : 'Scan with AI'}
                </Button>
              </div>
              {requestOrderScannedFile && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#B11E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileTextOutlined /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{requestOrderScannedFile.name}</Text>
                </div>
              )}
            </div>

            <Form
              form={requestOrderForm}
              layout="vertical"
              onFinish={handleRequestOrder}
              onValuesChange={(changed) => {
                if (changed.payment_terms !== undefined) setRequestOrderPaymentTerms(changed.payment_terms);
              }}
            >
              {/* Payment Type: Immediate or Credit */}
              <Form.Item label={<Text strong>Payment Type <span style={{ color: '#ff4d4f' }}>*</span></Text>} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['Immediate', '#1890ff'], ['Credit', '#fa8c16']].map(([type, color]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderPaymentType(type)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: `2px solid ${orderPaymentType === type ? color : '#e0e0e0'}`,
                        background: orderPaymentType === type ? `${color}15` : 'transparent',
                        color: orderPaymentType === type ? color : '#888',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      {type === 'Immediate' ? 'âš¡ Immediate Payment' : 'ðŸ"… Credit Payment'}
                    </button>
                  ))}
                </div>
                {orderPaymentType === 'Immediate' && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#1890ff10', border: '1px solid #1890ff33', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#096dd9' }}>Payment will be done immediately after order is placed. Upload proof after payment.</Text>
                  </div>
                )}
                {orderPaymentType === 'Credit' && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ padding: '8px 12px', background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#d46b08' }}>Finance team will be notified on the selected due date to process payment.</Text>
                    </div>
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="Select credit payment due date"
                      value={orderCreditDate}
                      onChange={setOrderCreditDate}
                      disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                    />
                  </div>
                )}
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Bill No" name="bill_no" rules={[{ required: true, message: 'Bill number is required' }]}>
                    <Input placeholder="PUR-XXXX" style={{ borderRadius: 8 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Invoice No" name="inv_no">
                    <Input placeholder="INV-XXXX" style={{ borderRadius: 8 }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Payment Terms" name="payment_terms" rules={[{ required: true, message: 'Select payment terms' }]}>
                <Select
                  placeholder="Select payment terms"
                  onChange={(val) => setRequestOrderPaymentTerms(val)}
                >
                  <Option value="100% Payment">100% Payment</Option>
                  <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                  <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
                </Select>
              </Form.Item>
              {(requestOrderPaymentTerms === '50% Advance, 50% on Dispatch' || requestOrderPaymentTerms === '50% Advance, 50% After Delivery (Max 15 days)') && (
                <Form.Item
                  label={<span style={{ color: '#B11E6A', fontWeight: 600 }}>Second Payment Reminder Date</span>}
                  name="reminder_date"
                  rules={[{ required: true, message: 'Select a reminder date for the second payment' }]}
                >
                  <DatePicker
                    style={{ width: '100%', borderRadius: 8 }}
                    placeholder="Pick reminder date for 2nd payment"
                    disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
                  />
                </Form.Item>
              )}
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label="Order Date" name="order_date" rules={[{ required: true, message: 'Select order date' }]} initialValue={dayjs()}>
                    <DatePicker style={{ width: '100%', borderRadius: 8 }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Unit Price (₹)" name="unit_price" rules={[{ required: true, message: 'Enter unit price' }]}>
                    <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Total Amount (₹)" name="total_amount" rules={[{ required: true, message: 'Enter total amount' }]}>
                    <InputNumber prefix="₹" style={{ width: '100%' }} placeholder="0.00" min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button onClick={() => { setShowRequestOrderModal(false); requestOrderForm.resetFields(); setSelectedApprovedRequest(null); setRequestOrderScannedFile(null); setRequestOrderPaymentTerms(''); }} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
                <Button type="primary" htmlType="submit" style={{ flex: 2, height: 40, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}>
                  Submit to Financial
                </Button>
              </div>
            </Form>
          </>
        )}
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
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera — AI will auto-fill the fields below</Text>
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
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', width: '100%' }}>Upload</Button>
            </Upload>
            <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setSupplierScannedFile)} style={{ borderRadius: 8, borderColor: '#B11E6A66', color: '#B11E6A', whiteSpace: 'nowrap' }}>Scan</Button>
            <Button
              icon={<ThunderboltOutlined />}
              loading={supplierScanLoading}
              onClick={handleSupplierAIScan}
              style={{ borderRadius: 8, background: supplierScannedFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: supplierScannedFile ? '#fff' : '#bbb', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {supplierScanLoading ? 'Scanning...' : 'Scan with AI'}
            </Button>
          </div>
          {supplierScannedFile && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#B11E6A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileTextOutlined /><Text style={{ fontSize: 11, color: '#B11E6A' }}>{supplierScannedFile.name}</Text>
            </div>
          )}
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

      {/* Add Purchase Expense Modal */}
      <Modal
        title={<Text strong style={{ fontSize: 16 }}>Add Purchase Expense</Text>}
        open={showAddExpenseModal}
        onCancel={() => { setShowAddExpenseModal(false); expenseForm.resetFields(); setExpenseScanFile(null); }}
        footer={null}
        width={480}
        centered
      >
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, border: '1.5px dashed #B11E6A66', background: isDark ? '#1a0f14' : '#fff8fb' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Upload maxCount={1} beforeUpload={(f) => { setExpenseScanFile(f); return false; }} onRemove={() => setExpenseScanFile(null)} accept=".pdf,.jpg,.png" style={{ flex: 1 }}>
                <Button icon={<UploadOutlined />} style={{ borderRadius: 8, borderColor: '#B11E6A55', color: '#B11E6A', width: '100%' }}>Upload Invoice / PDF</Button>
              </Upload>
              <Button icon={<CameraOutlined />} onClick={() => openCameraCapture(setExpenseScanFile)} style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>Capture</Button>
              <Button
                icon={<ThunderboltOutlined />}
                loading={expenseScanLoading}
                style={{ background: expenseScanFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: expenseScanFile ? '#fff' : '#bbb', fontWeight: 700 }}
                onClick={() => {
                  if (!expenseScanFile) { message.warning('Upload file first'); return; }
                  setExpenseScanLoading(true);
                  setTimeout(() => {
                    expenseForm.setFieldsValue({ date: dayjs(), invoice_no: 'INV-' + Math.floor(Math.random() * 9000 + 1000), supplier: 'ChemCo India', qty: '50 Kg', total_amount: 4250, paid_status: 'Unpaid' });
                    setExpenseScanLoading(false);
                    message.success('AI extracted expense details!');
                  }, 2000);
                }}
              >
                {expenseScanLoading ? 'Scanning...' : 'Scan'}
              </Button>
            </div>
          </div>
          <Form form={expenseForm} layout="vertical">
            <Row gutter={12}>
              <Col span={12}><Form.Item label="Purchase Date" name="date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Invoice No" name="invoice_no" rules={[{ required: true }]}><Input placeholder="INV-XXXX" /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={14}><Form.Item label="Supplier" name="supplier" rules={[{ required: true }]}><Select placeholder="Select supplier">{suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}</Select></Form.Item></Col>
              <Col span={10}><Form.Item label="Quantity" name="qty"><Input placeholder="e.g. 100 Kg" /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><Form.Item label="Total Amount (₹)" name="total_amount" rules={[{ required: true }]}><InputNumber prefix="₹" style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Paid Status" name="paid_status" rules={[{ required: true }]}><Select><Option value="Paid">Paid</Option><Option value="Partially Paid">Partially Paid</Option><Option value="Unpaid">Unpaid</Option></Select></Form.Item></Col>
            </Row>
          </Form>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowAddExpenseModal(false); expenseForm.resetFields(); setExpenseScanFile(null); }}>Cancel</Button>
            <Button type="primary" style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              onClick={() => {
                expenseForm.validateFields().then(values => {
                  const newExp = { key: Date.now(), date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'), invoice_no: values.invoice_no, supplier: values.supplier, qty: values.qty || '—', paid_status: values.paid_status, paid_amount: values.paid_status === 'Paid' ? values.total_amount : 0, total_amount: values.total_amount, remaining: values.paid_status === 'Paid' ? 0 : values.total_amount };
                  setPurchaseExpenses(prev => [newExp, ...prev]);
                  message.success('Purchase expense added');
                  setShowAddExpenseModal(false);
                  expenseForm.resetFields();
                  setExpenseScanFile(null);
                });
              }}
            >Save Expense</Button>
          </div>
        </div>
      </Modal>

      {/* Shared Camera Capture Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 17 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Scan Document</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Point camera at the document and tap Capture</div>
            </div>
          </div>
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

      {/* Place Order Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>Place Order</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Review order & supplier details, then send order via WhatsApp</div>
            </div>
          </div>
        }
        open={showPlaceOrderModal}
        onCancel={closePlaceOrderModal}
        footer={null}
        width={540}
        centered
      >
        {selectedPlaceOrderReq && (() => {
          const sup = suppliersList.find(s => s.name === selectedPlaceOrderReq.supplier);
          const complaints = vendorComplaintsData[selectedPlaceOrderReq.supplier] || [];
          const openComplaints = complaints.filter(c => c.status === 'Open');

          if (showPlaceOrderSuccess) {
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <CheckCircleOutlined style={{ color: '#fff', fontSize: 28 }} />
                  </div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>Order Sent Successfully!</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Order placed with <Text strong style={{ color: '#B11E6A' }}>{selectedPlaceOrderReq.supplier}</Text> via WhatsApp.</Text>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                {/* LR Copy Reminder */}
                <div style={{ padding: '14px 16px', borderRadius: 10, background: isDark ? '#1a1408' : '#fffbe6', border: `1px solid ${lrCopyReminderChecked ? '#faad14' : '#ffe58f'}`, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <BellOutlined style={{ color: '#fa8c16', fontSize: 18, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', color: '#ad6800', marginBottom: 4, fontSize: 13 }}>LR Copy Reminder</Text>
                      <Text style={{ fontSize: 12, color: '#614700', display: 'block', marginBottom: 10 }}>
                        Enable 30-minute reminders to follow up and collect the LR (Lorry Receipt) copy from the purchase team.
                      </Text>
                      <Checkbox
                        checked={lrCopyReminderChecked}
                        onChange={e => toggleLrCopyReminder(e.target.checked)}
                        style={{ fontWeight: 600, color: '#ad6800' }}
                      >
                        Remind me every 30 min to get LR copy
                      </Checkbox>
                      {lrCopyReminderChecked && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: '#fa8c1620' }}>
                          <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 12 }} />
                          <Text style={{ fontSize: 11, color: '#ad6800' }}>
                            Reminder is active{lrCopyReminderCount > 0 ? ` — fired ${lrCopyReminderCount} time${lrCopyReminderCount > 1 ? 's' : ''}` : ' — first alert in 30 min'}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  block
                  type="primary"
                  style={{ height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700, fontSize: 14 }}
                  onClick={closePlaceOrderModal}
                >
                  Done
                </Button>
              </div>
            );
          }

          return (
            <div style={{ marginTop: 8 }}>
              {/* Previous complaints banner */}
              {openComplaints.length > 0 && (
                <Alert
                  style={{ marginBottom: 14, borderRadius: 10 }}
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  message={<Text strong style={{ fontSize: 13 }}>Pending Complaints for {selectedPlaceOrderReq.supplier}</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#614700', display: 'block', marginBottom: 6 }}>
                        There are <Text strong>{openComplaints.length}</Text> unresolved issue(s) from previous orders. Review before placing a new order:
                      </Text>
                      {openComplaints.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                          <Tag color={c.severity === 'high' ? 'error' : c.severity === 'medium' ? 'warning' : 'default'} style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>
                            {c.severity.toUpperCase()}
                          </Tag>
                          <Text style={{ fontSize: 11 }}>{c.issue} <Text type="secondary" style={{ fontSize: 10 }}>({c.date})</Text></Text>
                        </div>
                      ))}
                    </div>
                  }
                />
              )}
              {/* Order Details */}
              <div style={{ padding: '12px 16px', background: isDark ? '#0d2010' : '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 10, marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>ORDER DETAILS</Text>
                <Row gutter={[12, 8]}>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>ITEM</Text>
                    <div><Text strong>{selectedPlaceOrderReq.item}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>SUPPLIER</Text>
                    <div><Text strong style={{ color: '#B11E6A' }}>{selectedPlaceOrderReq.supplier}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>QUANTITY</Text>
                    <div><Text strong>{selectedPlaceOrderReq.qty} {selectedPlaceOrderReq.unit}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>PAYMENT TERMS</Text>
                    <div><Text strong style={{ fontSize: 11 }}>{selectedPlaceOrderReq.payment_terms}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 11 }}>REQUEST DATE</Text>
                    <div><Text strong>{selectedPlaceOrderReq.date}</Text></div>
                  </Col>
                </Row>
              </div>

              {/* 50% Payment date picker */}
              {selectedPlaceOrderReq.payment_terms?.includes('50%') && (
                <div style={{ padding: '12px 16px', background: isDark ? '#1a0f14' : '#fff8fb', border: '1px solid #B11E6A33', borderRadius: 10, marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, color: '#B11E6A', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    SECOND PAYMENT REMINDER DATE
                  </Text>
                  <DatePicker
                    style={{ width: '100%', borderRadius: 8 }}
                    value={placeOrderFiftyDate}
                    onChange={setPlaceOrderFiftyDate}
                    placeholder="Select reminder date for 2nd payment"
                    disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                  />
                </div>
              )}

              {/* Supplier / Vendor Details */}
              {sup && (
                <div style={{ padding: '12px 16px', background: isDark ? '#120b0e' : '#fff8fb', border: '1px solid #B11E6A33', borderRadius: 10, marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>SUPPLIER / VENDOR DETAILS</Text>
                  <Row gutter={[12, 8]}>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>PHONE / WHATSAPP</Text>
                      <div>
                        <WhatsAppOutlined style={{ color: '#25D366', fontSize: 12, marginRight: 4 }} />
                        <Text strong style={{ fontSize: 12 }}>{sup.phone}</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>EMAIL</Text>
                      <div><Text style={{ fontSize: 12, color: '#B11E6A' }}>{sup.email}</Text></div>
                    </Col>
                    <Col span={24}>
                      <Text type="secondary" style={{ fontSize: 11 }}>ADDRESS</Text>
                      <div><Text style={{ fontSize: 12 }}>{sup.address}</Text></div>
                    </Col>
                    {sup.bank && (
                      <Col span={24}>
                        <Text type="secondary" style={{ fontSize: 11 }}>BANK DETAILS</Text>
                        <div style={{ padding: '6px 10px', background: isDark ? '#1a1a2e' : '#fafafa', borderRadius: 6, border: `1px solid ${isDark ? '#2a2d40' : '#e8e8e8'}`, marginTop: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: 600 }}>{sup.bank}</Text>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              )}

              {/* Send via WhatsApp */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={closePlaceOrderModal} style={{ flex: 1, height: 44, borderRadius: 10 }}>
                  Cancel
                </Button>
                <Button
                  icon={<WhatsAppOutlined />}
                  style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14 }}
                  onClick={() => {
                    const reminderLine = placeOrderFiftyDate ? `\n*2nd Payment Due:* ${placeOrderFiftyDate.format('DD-MM-YYYY')}` : '';
                    const msg = `*Purchase Order*\n\n*Item:* ${selectedPlaceOrderReq.item}\n*Quantity:* ${selectedPlaceOrderReq.qty} ${selectedPlaceOrderReq.unit}\n*Payment Terms:* ${selectedPlaceOrderReq.payment_terms}${reminderLine}\n*Date:* ${selectedPlaceOrderReq.date}\n\nKindly confirm the order and advise on delivery timeline.`;
                    const phone = sup ? sup.phone.replace(/\D/g, '') : '';
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    setShowPlaceOrderSuccess(true);
                  }}
                >
                  Send Order via WhatsApp
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* â"€â"€ Bulk Purchase Request Modal â"€â"€ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>Bulk Purchase Request</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>Select supplier â†' pick low-stock products â†' raise multiple requests at once</div>
            </div>
          </div>
        }
        open={showBulkPurchaseModal}
        onCancel={() => { setShowBulkPurchaseModal(false); setBulkSupplierName(''); setBulkItems([]); setBulkPayTerms(''); setBulkQuotationAsked(false); setBulkRaiseFile(null); }}
        footer={null}
        width={640}
        centered
      >
        <div style={{ marginTop: 4 }}>
          {/* Step 1: Supplier Selection */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 8 }}>
              Step 1 — Select Supplier
            </Text>
            <Select
              placeholder="Select supplier name..."
              style={{ width: '100%', borderRadius: 8 }}
              value={bulkSupplierName || undefined}
              onChange={val => {
                if (val === '__add_new__') {
                  setInlineDropdownContext('bulk');
                  setShowAddSupplierInlineModal(true);
                  return;
                }
                handleBulkSupplierSelect(val);
              }}
              showSearch
              optionFilterProp="children"
              dropdownRender={menu => (
                <>
                  {menu}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                    <Button type="link" icon={<PlusOutlined />} style={{ color: '#B11E6A', padding: 0, fontWeight: 600 }}
                      onClick={() => { setInlineDropdownContext('bulk'); setShowAddSupplierInlineModal(true); }}>
                      Add New Supplier
                    </Button>
                  </div>
                </>
              )}
            >
              {suppliers.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
            </Select>
            {bulkSupplierName && (() => {
              const sup = suppliers.find(s => s.name === bulkSupplierName);
              if (!sup) return null;
              return (
                <div style={{ marginTop: 10, display: 'flex', gap: 0 }}>
                  {[{ label: 'Phone', value: sup.phone }, { label: 'Email', value: sup.email }, { label: 'Address', value: sup.address }].map((item, i) => (
                    <div key={i} style={{ flex: 1, borderRight: i < 2 ? `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` : 'none', padding: '0 10px', paddingLeft: i === 0 ? 0 : 10 }}>
                      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: textColor, wordBreak: 'break-word' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Step 2: Product Selection (only shown after supplier is selected) */}
          {bulkItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 10 }}>
                Step 2 — Select Products & Quantities
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                  (Showing low-stock items — supplier's products pre-selected)
                </Text>
              </Text>
              <div style={{ maxHeight: 280, overflowY: 'auto', border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}`, borderRadius: 10 }}>
                {bulkItems.map((item, idx) => (
                  <div
                    key={item.invKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < bulkItems.length - 1 ? `1px solid ${isDark ? '#2a2d40' : '#f5f5f5'}` : 'none',
                      background: item.selected ? (isDark ? '#1a0f14' : '#fff8fb') : (isDark ? '#16192a' : '#fafafa'),
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => {
                      setBulkItems(prev => prev.map((bi, i) => i === idx ? { ...bi, selected: !bi.selected } : bi));
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', accentColor: '#B11E6A', width: 16, height: 16 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                        <Tag color={item.status === 'Out' ? 'error' : 'warning'} style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>{item.status}</Tag>
                        {item.fromSupplier && <Tag color="purple" style={{ fontSize: 10, borderRadius: 8, margin: 0 }}>This Supplier</Tag>}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>Stock: {item.currentStock} / Min: {item.minStock} {item.unit}</Text>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <InputNumber
                        size="small"
                        min={1}
                        value={item.qty}
                        disabled={!item.selected}
                        onChange={v => setBulkItems(prev => prev.map((bi, i) => i === idx ? { ...bi, qty: v } : bi))}
                        addonAfter={<Text style={{ fontSize: 11 }}>{item.unit}</Text>}
                        style={{ width: 130 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {bulkItems.filter(i => i.selected).length} of {bulkItems.length} products selected
                </Text>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0, fontSize: 11, color: '#B11E6A' }}
                  onClick={() => setBulkItems(prev => prev.map(i => ({ ...i, selected: true })))}
                >Select All</Button>
                <Button
                  size="small"
                  type="link"
                  style={{ padding: 0, fontSize: 11, color: '#888' }}
                  onClick={() => setBulkItems(prev => prev.map(i => ({ ...i, selected: false })))}
                >Clear</Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Terms */}
          {bulkItems.length > 0 && (
            <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Step 3 — Payment Terms</Text>
              <Select
                placeholder="Select payment terms..."
                style={{ width: '100%' }}
                value={bulkPayTerms || undefined}
                onChange={setBulkPayTerms}
              >
                <Option value="100% Payment">100% Payment</Option>
                <Option value="50% Advance, 50% on Dispatch">50% Advance, 50% on Dispatch</Option>
                <Option value="50% Advance, 50% After Delivery (Max 15 days)">50% Advance, 50% After Delivery (Max 15 days)</Option>
              </Select>
            </div>
          )}

          {/* Summary */}
          {bulkItems.filter(i => i.selected).length > 0 && (
            <div style={{ padding: '12px 14px', background: isDark ? '#0d1a1a' : '#f0fff4', border: '1px solid #52c41a44', borderRadius: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: '#389e0d' }}>
                {bulkItems.filter(i => i.selected).length} purchase request(s) will be raised for {bulkSupplierName}:
              </Text>
              <div style={{ marginTop: 6 }}>
                {bulkItems.filter(i => i.selected).map(i => (
                  <div key={i.invKey} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <Text style={{ fontSize: 12 }}>{i.name}</Text>
                    <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 600 }}>{i.qty} {i.unit}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Action Flow — Ask Quotation → Raise Request */}
          {bulkItems.filter(i => i.selected).length > 0 && bulkPayTerms && (
            <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 10 }}>Step 4 — Action</Text>
              {!bulkQuotationAsked ? (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                    First, send a WhatsApp quotation request to the supplier. Once you receive the quotation, upload it and raise the formal request to Finance.
                  </Text>
                  <Button
                    icon={<WhatsAppOutlined />}
                    onClick={handleBulkAskQuotation}
                    style={{ width: '100%', height: 40, borderColor: '#25D366', color: '#25D366', fontWeight: 600, borderRadius: 8, fontSize: 13 }}
                  >
                    Ask Quotation via WhatsApp
                  </Button>
                </div>
              ) : (
                <div>
                  <Alert
                    type="success"
                    message="Quotation request sent via WhatsApp"
                    description="Upload the received quotation document to raise the formal request."
                    showIcon
                    style={{ marginBottom: 12, borderRadius: 8 }}
                  />
                  <div style={{ marginBottom: 10 }}>
                    <Upload
                      maxCount={1}
                      beforeUpload={(file) => { setBulkRaiseFile(file); return false; }}
                      onRemove={() => setBulkRaiseFile(null)}
                      accept=".pdf,.jpg,.jpeg,.png"
                      fileList={bulkRaiseFile ? [{ uid: '1', name: bulkRaiseFile.name, status: 'done' }] : []}
                    >
                      <Button icon={<UploadOutlined />} style={{ borderRadius: 8, width: '100%', marginBottom: 8 }}>
                        {bulkRaiseFile ? `✓ ${bulkRaiseFile.name}` : 'Upload Received Quotation Document'}
                      </Button>
                    </Upload>
                    {bulkRaiseFile && (
                      <Button
                        icon={<RobotOutlined />}
                        loading={bulkRaiseScanLoading}
                        onClick={() => {
                          setBulkRaiseScanLoading(true);
                          setTimeout(() => { setBulkRaiseScanLoading(false); message.success('AI extracted details from quotation!'); }, 2000);
                        }}
                        style={{ width: '100%', borderRadius: 8, borderColor: '#722ed1', color: '#722ed1', marginBottom: 8 }}
                      >
                        Scan with AI
                      </Button>
                    )}
                  </div>
                  <Button
                    size="small"
                    icon={<WhatsAppOutlined />}
                    onClick={handleBulkAskQuotation}
                    style={{ borderColor: '#25D366', color: '#25D366', fontSize: 11 }}
                  >
                    Re-ask / Follow-up
                  </Button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => { setShowBulkPurchaseModal(false); setBulkSupplierName(''); setBulkItems([]); setBulkPayTerms(''); setBulkQuotationAsked(false); setBulkRaiseFile(null); }}
              style={{ flex: 1, height: 44, borderRadius: 10 }}
            >Cancel</Button>
            <Button
              type="primary"
              disabled={!bulkQuotationAsked || !bulkRaiseFile || bulkItems.filter(i => i.selected).length === 0 || !bulkPayTerms}
              onClick={handleBulkRaiseRequest}
              style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700, fontSize: 14 }}
            >
              Raise {bulkItems.filter(i => i.selected).length || ''} Request(s) to Financial
            </Button>
          </div>
        </div>
      </Modal>

      {/* LR Upload Modal */}
      <Modal
        title={<Space><TruckOutlined style={{ color: '#1890ff' }} /><Text strong style={{ fontSize: 15 }}>Upload LR Copy</Text></Space>}
        open={showLRUploadModal}
        onCancel={() => { setShowLRUploadModal(false); setLrUploadTarget(null); lrUploadForm.resetFields(); }}
        footer={null}
        width={460}
        centered
        destroyOnClose
      >
        {lrUploadTarget && (
          <Form form={lrUploadForm} layout="vertical" style={{ marginTop: 8 }}
            onFinish={(vals) => {
              const deliveryDate = vals.delivery_date ? vals.delivery_date.format('YYYY-MM-DD') : '';
              const fileName = vals.lr_file?.fileList?.[0]?.name || '';
              const entry = { lrNumber: vals.lr_number, deliveryDate, fileName, paidStatus: vals.paid_status };
              setLrData(prev => ({ ...prev, [lrUploadTarget.order.key]: entry }));
              if (vals.paid_status === 'Not Paid') {
                notification.warning({
                  message: 'Finance Alert — Payment Pending',
                  description: `LR uploaded for ${lrUploadTarget.order.item}. Payment is Not Paid. Finance team will be notified on receiving date (${deliveryDate}).`,
                  duration: 8,
                  icon: <BellOutlined style={{ color: '#fa8c16' }} />,
                });
              } else {
                message.success('LR copy uploaded. Payment marked as Paid.');
              }
              setShowLRUploadModal(false);
              setLrUploadTarget(null);
              lrUploadForm.resetFields();
            }}
          >
            <div style={{ marginBottom: 14, padding: '10px 14px', background: isDark ? '#16192a' : '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>ORDER</Text>
              <div><Text strong style={{ fontSize: 14 }}>{lrUploadTarget.order.item}</Text></div>
              <Text type="secondary" style={{ fontSize: 11 }}>Supplier: <Text strong style={{ color: '#B11E6A' }}>{lrUploadTarget.order.supplier}</Text> · Bill: {lrUploadTarget.order.bill_no}</Text>
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="LR Number" name="lr_number" rules={[{ required: true, message: 'Enter LR number' }]}>
                  <Input placeholder="e.g. LR-20240501-001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Expected Delivery Date" name="delivery_date" rules={[{ required: true, message: 'Select date' }]}>
                  <DatePicker style={{ width: '100%' }} disabledDate={d => d && d.isBefore(dayjs(), 'day')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Payment Status" name="paid_status" rules={[{ required: true, message: 'Select status' }]}>
              <Select placeholder="Mark as Paid or Not Paid">
                <Option value="Paid">Paid</Option>
                <Option value="Not Paid">Not Paid — Finance will be notified on delivery date</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Upload LR Copy" name="lr_file">
              <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: isDark ? '#1a1a2e' : '#fafafa', borderRadius: 8 }}>
                <p className="ant-upload-drag-icon"><FileTextOutlined style={{ color: '#1890ff' }} /></p>
                <p className="ant-upload-text">Click or drag LR document to upload</p>
                <p className="ant-upload-hint">PDF or Image of Lorry Receipt / Bilty</p>
              </Upload.Dragger>
            </Form.Item>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Button style={{ flex: 1, height: 40, borderRadius: 8 }} onClick={() => { setShowLRUploadModal(false); lrUploadForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<UploadOutlined />}
                style={{ flex: 2, height: 40, borderRadius: 8, background: '#1890ff', border: 'none', fontWeight: 700 }}>
                Save LR Copy
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Edit Quotation & Resend Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#722ed1' }} />
            <Text strong style={{ fontSize: 15 }}>Edit Quotation & Resend</Text>
          </Space>
        }
        open={showEditQuotationModal}
        onCancel={() => { setShowEditQuotationModal(false); setEditQuotationTarget(null); editReqForm.resetFields(); }}
        footer={null}
        width={480}
        centered
        destroyOnClose
      >
        {editQuotationTarget && (
          <Form form={editReqForm} layout="vertical" style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: isDark ? '#16192a' : '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>ITEM</Text>
              <div><Text strong style={{ fontSize: 14 }}>{editQuotationTarget.item}</Text></div>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>Supplier: <Text strong style={{ color: '#B11E6A' }}>{editQuotationTarget.supplier}</Text></Text>
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Quantity" name="qty" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} addonAfter={editQuotationTarget.unit} />
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
            </Row>
            {(editQuotationTarget.notes || []).length > 0 && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: isDark ? '#1e2235' : '#f0f4ff', borderRadius: 8, border: '1px solid #d6e4ff' }}>
                <Text style={{ fontSize: 11, color: '#722ed1', fontWeight: 600 }}>Latest Note:</Text>
                <Text style={{ fontSize: 12, display: 'block' }}>{(editQuotationTarget.notes || []).at(-1)?.text}</Text>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button style={{ flex: 1, height: 40, borderRadius: 8 }} onClick={() => { setShowEditQuotationModal(false); editReqForm.resetFields(); }}>Cancel</Button>
              <Button style={{ flex: 1, height: 40, borderRadius: 8, borderColor: '#722ed1', color: '#722ed1' }}
                onClick={() => {
                  editReqForm.validateFields().then(vals => {
                    dispatch(updateQuotationDetails({ key: editQuotationTarget.key, qty: vals.qty, payment_terms: vals.payment_terms }));
                    message.success('Quotation details updated.');
                    setShowEditQuotationModal(false);
                    editReqForm.resetFields();
                  });
                }}>Save Only</Button>
              <Button type="primary" style={{ flex: 2, height: 40, borderRadius: 8, background: '#25D366', border: 'none', fontWeight: 700 }}
                icon={<WhatsAppOutlined />}
                onClick={() => {
                  editReqForm.validateFields().then(vals => {
                    dispatch(updateQuotationDetails({ key: editQuotationTarget.key, qty: vals.qty, payment_terms: vals.payment_terms }));
                    const sup = suppliersList.find(s => s.name === editQuotationTarget.supplier);
                    const phone = sup ? sup.phone.replace(/\D/g, '') : '';
                    const latestNote = (editQuotationTarget.notes || []).at(-1);
                    const msg = `*Updated Quotation Request*\n\n*Item:* ${editQuotationTarget.item}\n*Quantity:* ${vals.qty} ${editQuotationTarget.unit}\n*Payment Terms:* ${vals.payment_terms}${latestNote ? `\n\nNote: ${latestNote.text}` : ''}\n\nKindly provide an updated quotation at the earliest.`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    message.success('Updated quotation sent via WhatsApp!');
                    setShowEditQuotationModal(false);
                    editReqForm.resetFields();
                  });
                }}>Save & Send via WhatsApp</Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Finance Status Demo Modal */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#722ed1' }} />
            <Text strong style={{ fontSize: 15 }}>Finance: Set Approval Status</Text>
          </Space>
        }
        open={showFinanceStatusModal}
        onCancel={() => { setShowFinanceStatusModal(false); setFinanceStatusTarget(null); setFinanceNoteInput(''); setFinanceDecision(''); }}
        footer={null}
        width={480}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16, padding: '8px 12px', background: isDark ? '#1a0a2a' : '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              This simulates Finance team approval actions on purchase requests.
            </Text>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>Select Request:</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Choose a request..."
              value={financeStatusTarget || undefined}
              onChange={v => setFinanceStatusTarget(v)}
              options={raisedRequests
                .filter(r => r.status !== 'Rejected' && !purchaseOrders.some(o => o.requestKey === r.key))
                .map(r => ({ value: r.key, label: `${r.item} — ${r.supplier} (${r.qty} ${r.unit})` }))}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>Finance Decision:</Text>
            <Select
              style={{ width: '100%', marginTop: 6 }}
              placeholder="Select decision..."
              value={financeDecision || undefined}
              onChange={v => setFinanceDecision(v)}
              options={[
                { value: 'Approved', label: 'âœ…  Approved — proceed with order' },
                { value: 'ModifyRequested', label: 'âš ï¸  Modify Requested — quantity needs revision' },
              ]}
            />
          </div>
          {financeDecision === 'ModifyRequested' && (
            <div style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: 600 }}>Modify Note <Text type="danger">(required)</Text>:</Text>
              <Input.TextArea
                rows={3}
                placeholder="Explain what needs to be modified (e.g. reduce quantity to 50 units)..."
                value={financeNoteInput}
                onChange={e => setFinanceNoteInput(e.target.value)}
                style={{ marginTop: 6, borderRadius: 8 }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              onClick={() => { setShowFinanceStatusModal(false); setFinanceStatusTarget(null); setFinanceNoteInput(''); setFinanceDecision(''); }}
              style={{ flex: 1, height: 40, borderRadius: 8 }}
            >Cancel</Button>
            <Button
              type="primary"
              disabled={!financeStatusTarget || !financeDecision || (financeDecision === 'ModifyRequested' && !financeNoteInput.trim())}
              onClick={() => {
                dispatch(updateFinanceStatus({
                  key: financeStatusTarget,
                  financeStatus: financeDecision,
                  financeNote: financeNoteInput.trim(),
                }));
                message.success(financeDecision === 'Approved' ? 'Request approved by Finance!' : 'Modify note sent to Purchase team!');
                setShowFinanceStatusModal(false);
                setFinanceStatusTarget(null);
                setFinanceNoteInput('');
                setFinanceDecision('');
              }}
              style={{ flex: 2, height: 40, borderRadius: 8, background: financeDecision === 'Approved' ? '#52c41a' : '#fa8c16', border: 'none', fontWeight: 700 }}
            >
              {financeDecision === 'Approved' ? 'Approve Request' : financeDecision === 'ModifyRequested' ? 'Send Modify Note' : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Document View Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ fontSize: 16 }}>Payment Document</Text>
          </Space>
        }
        open={!!viewApprovalDoc}
        onCancel={() => setViewApprovalDoc(null)}
        footer={[
          <Button key="close" onClick={() => setViewApprovalDoc(null)}>Close</Button>
        ]}
        width={480}
        centered
      >
        {viewApprovalDoc && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Request</Text>
              <Text strong style={{ display: 'block', marginTop: 2 }}>{viewApprovalDoc.item}</Text>
              <Text style={{ fontSize: 12, color: '#B11E6A' }}>Supplier: {viewApprovalDoc.supplier} Â· Qty: {viewApprovalDoc.qty} {viewApprovalDoc.unit}</Text>
            </div>

            {viewApprovalDoc.payment_doc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#52c41a12,#52c41a08)', border: '1.5px solid #52c41a44', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#52c41a,#73d13d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ color: '#52c41a', fontSize: 13, display: 'block', wordBreak: 'break-all' }}>{viewApprovalDoc.payment_doc}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>Uploaded as payment proof</Text>
                </div>
                <Button size="small" icon={<DownloadOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Download</Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#aaa', fontSize: 13 }}>No payment document attached</div>
            )}
          </div>
        )}
      </Modal>

      {/* ── LR Copy View Modal ── */}
      <Modal
        title={<Space><FileTextOutlined style={{ color: '#1890ff' }} /><Text strong>LR Copy</Text></Space>}
        open={!!viewLRCopyModal}
        onCancel={() => setViewLRCopyModal(null)}
        footer={[<Button key="close" onClick={() => setViewLRCopyModal(null)}>Close</Button>]}
        width={460}
        centered
      >
        {viewLRCopyModal && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#1890ff12,#1890ff08)', border: '1.5px solid #1890ff33', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#1890ff,#40a9ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ color: '#1890ff', fontSize: 13, display: 'block' }}>{viewLRCopyModal.lrCopyFile}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>LR {viewLRCopyModal.lrNumber} · {viewLRCopyModal.transportCompany}</Text>
              </div>
              <Button size="small" icon={<DownloadOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff' }}>Download</Button>
            </div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="LR Number"><Text strong style={{ color: '#1890ff' }}>{viewLRCopyModal.lrNumber}</Text></Descriptions.Item>
              <Descriptions.Item label="Lorry No"><Text strong>{viewLRCopyModal.lorryNo}</Text></Descriptions.Item>
              <Descriptions.Item label="Transport Co." span={2}>{viewLRCopyModal.transportCompany}</Descriptions.Item>
              <Descriptions.Item label="Supplier">{viewLRCopyModal.supplier}</Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">{viewLRCopyModal.expectedDelivery}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* ── Taken Modal ── */}
      <Modal
        title={<Space><CarOutlined style={{ color: '#B11E6A' }} /><Text strong>Mark as Taken — Upload Proof</Text></Space>}
        open={showTakenModal}
        onCancel={() => { setShowTakenModal(false); setTakenTarget(null); takenForm.resetFields(); }}
        footer={null}
        width={480}
        centered
      >
        {takenTarget && (
          <Form form={takenForm} layout="vertical" onFinish={(vals) => {
            const proofFile = vals.pickup_proof?.fileList?.[0]?.name || (takenTarget.takenProof || null);
            setDispatchTrackingOrders(prev => prev.map(o => o.key === takenTarget.key ? {
              ...o, takenStatus: 'taken', takenProof: proofFile, gPayNumber: vals.gpay_number || null
            } : o));
            // Notify dispatch & financial pages via localStorage
            const pickupList = JSON.parse(localStorage.getItem('hng_pickup_expenses') || '[]');
            const exists = pickupList.find(x => x.orderId === takenTarget.orderId);
            if (!exists) {
              pickupList.push({
                key: takenTarget.key, orderId: takenTarget.orderId, date: new Date().toISOString().slice(0, 10),
                supplier: takenTarget.supplier, item: takenTarget.item, amount: takenTarget.amount,
                pickupEmpId: takenTarget.pickupEmpId, pickupEmpName: takenTarget.pickupEmpName,
                category: 'PICKUP', gPayNumber: vals.gpay_number || null, proof: proofFile,
                paymentStatus: 'Unpaid',
              });
              localStorage.setItem('hng_pickup_expenses', JSON.stringify(pickupList));
            }
            message.success('Marked as Taken successfully!');
            setShowTakenModal(false);
            setTakenTarget(null);
            takenForm.resetFields();
          }}>
            <div style={{ background: isDark ? '#1a1a2e' : '#fafcff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#e8f4ff'}` }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>{takenTarget.item}</Text>
              <Text style={{ color: '#B11E6A' }}>{takenTarget.supplier}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Order: {takenTarget.orderId} · LR: {takenTarget.lrNumber}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Pickup: {takenTarget.pickupEmpName} ({takenTarget.pickupEmpId})</Text>
            </div>
            <Form.Item label="Pickup Person Payment — Upload Proof" name="pickup_proof">
              <Upload maxCount={1} beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png">
                <Button icon={<UploadOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Upload Proof (PDF / Image)</Button>
              </Upload>
            </Form.Item>
            {takenTarget.takenProof && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#52c41a10', border: '1px solid #52c41a33', borderRadius: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: '#52c41a' }}>Already uploaded: {takenTarget.takenProof}</Text>
              </div>
            )}
            <Form.Item label="G Pay Number" name="gpay_number" rules={[{ required: true, message: 'Enter G Pay number' }]}>
              <Input prefix={<PhoneOutlined />} placeholder="Enter G Pay number for payment" style={{ borderRadius: 8 }} maxLength={15} />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button block onClick={() => { setShowTakenModal(false); takenForm.resetFields(); }}>Cancel</Button>
              <Button block type="primary" htmlType="submit" style={{ background: '#B11E6A', border: 'none' }}>Confirm Taken</Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* ── Received Order Modal ── */}
      <Modal
        title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><Text strong>Received Order — Invoice Verification</Text></Space>}
        open={showReceivedModal}
        onCancel={() => { setShowReceivedModal(false); setReceivedTarget(null); }}
        footer={null}
        width={760}
        centered
        style={{ top: 20 }}
      >
        {receivedTarget && (
          <div>
            {/* Order info */}
            <div style={{ background: isDark ? '#1a1a2e' : '#fafcff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#e8f4ff'}` }}>
              <Space wrap>
                <Text strong style={{ color: '#B11E6A' }}>{receivedTarget.orderId}</Text>
                <Text strong>{receivedTarget.item}</Text>
                <Text type="secondary">{receivedTarget.supplier}</Text>
                <Text type="secondary">LR: {receivedTarget.lrNumber} · {receivedTarget.lorryNo}</Text>
              </Space>
            </div>

            {/* Previous orders delivered check */}
            {dispatchTrackingOrders.filter(o => o.supplier === receivedTarget.supplier && o.receivedStatus === 'partial' && o.key !== receivedTarget.key).length > 0 && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 12, borderRadius: 8 }}
                message={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 13 }}>Pending Partial Deliveries from {receivedTarget.supplier}</Text>
                    {dispatchTrackingOrders.filter(o => o.supplier === receivedTarget.supplier && o.receivedStatus === 'partial' && o.key !== receivedTarget.key).map(o => (
                      <Text key={o.key} style={{ fontSize: 12 }}>· {o.orderId} — {o.item} (Partial)</Text>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <Text style={{ fontSize: 12 }}>Are all previous orders from this vendor delivered/received?</Text>
                      <Select size="small" placeholder="Select" value={prevOrdersDelivered} onChange={setPrevOrdersDelivered} style={{ width: 80 }}>
                        <Option value="yes">Yes</Option>
                        <Option value="no">No</Option>
                      </Select>
                      {prevOrdersDelivered === 'yes' && <Tag color="success" style={{ borderRadius: 8 }}>All Good</Tag>}
                      {prevOrdersDelivered === 'no' && <Tag color="warning" style={{ borderRadius: 8 }}>Partial Pending</Tag>}
                    </div>
                  </Space>
                }
              />
            )}

            {/* Invoice upload + scan */}
            <div style={{ background: isDark ? '#161622' : '#f8f9ff', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px dashed ${isDark ? '#3a3a5a' : '#d6e4ff'}` }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Invoice Upload & Scan</Text>
              <Space wrap>
                <Upload maxCount={1} beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png">
                  <Button icon={<UploadOutlined />} style={{ borderColor: '#1890ff', color: '#1890ff' }}>Upload Invoice</Button>
                </Upload>
                <Button icon={<QrcodeOutlined />} style={{ borderColor: '#722ed1', color: '#722ed1' }} onClick={() => openCameraCapture(() => {})} >
                  Scan Invoice
                </Button>
                <Button
                  type="primary"
                  icon={invoiceScanLoading ? <SyncOutlined spin /> : <ThunderboltOutlined />}
                  loading={invoiceScanLoading}
                  onClick={handleInvoiceScan}
                  style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                >
                  {invoiceScanned ? 'Re-Scan Invoice' : 'AI Scan & Fetch Products'}
                </Button>
              </Space>
            </div>

            {/* Products table */}
            {invoiceScanned && invoiceProducts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>Products from Invoice — {invoiceProducts.length} item(s)</Text>
                  <Text style={{ fontSize: 12, color: getMissingItems().length > 0 ? '#fa8c16' : '#52c41a' }}>
                    {getMissingItems().length > 0 ? `${getMissingItems().length} item(s) with shortfall` : 'All items fully received'}
                  </Text>
                </div>
                <Table
                  size="small"
                  dataSource={invoiceProducts}
                  rowKey="key"
                  pagination={false}
                  columns={[
                    { title: 'Product', dataIndex: 'name', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'HSN', dataIndex: 'hsn', width: 70, render: v => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    { title: 'GST', dataIndex: 'gst', width: 60, render: v => <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>{v}</Tag> },
                    { title: 'Ordered', dataIndex: 'originalQty', width: 80, render: (v, r) => <Text>{v} {r.unit}</Text> },
                    {
                      title: 'Received Qty', key: 'received_qty', width: 130,
                      render: (_, r) => (
                        <Space size={4}>
                          <Button
                            size="small" icon={<MinusOutlined />}
                            style={{ width: 24, height: 24, padding: 0, minWidth: 24, borderRadius: 4, borderColor: (productQtys[r.key] || 0) <= 0 ? '#d9d9d9' : '#ff4d4f', color: (productQtys[r.key] || 0) <= 0 ? '#d9d9d9' : '#ff4d4f' }}
                            disabled={(productQtys[r.key] || 0) <= 0}
                            onClick={() => setProductQtys(prev => ({ ...prev, [r.key]: Math.max(0, (prev[r.key] || r.originalQty) - 1) }))}
                          />
                          <InputNumber
                            size="small"
                            min={0} max={r.originalQty}
                            value={productQtys[r.key] ?? r.originalQty}
                            onChange={v => setProductQtys(prev => ({ ...prev, [r.key]: v || 0 }))}
                            style={{ width: 60, textAlign: 'center' }}
                          />
                          <Button
                            size="small" icon={<PlusOutlined />}
                            style={{ width: 24, height: 24, padding: 0, minWidth: 24, borderRadius: 4, borderColor: (productQtys[r.key] || 0) >= r.originalQty ? '#d9d9d9' : '#52c41a', color: (productQtys[r.key] || 0) >= r.originalQty ? '#d9d9d9' : '#52c41a' }}
                            disabled={(productQtys[r.key] || 0) >= r.originalQty}
                            onClick={() => setProductQtys(prev => ({ ...prev, [r.key]: Math.min(r.originalQty, (prev[r.key] || r.originalQty) + 1) }))}
                          />
                        </Space>
                      )
                    },
                    {
                      title: 'Status / Notes', key: 'notes', width: 180,
                      render: (_, r) => {
                        const received = productQtys[r.key] ?? r.originalQty;
                        const isFull = received >= r.originalQty;
                        return (
                          <Space direction="vertical" size={3} style={{ width: '100%' }}>
                            <Tag color={isFull ? 'success' : 'warning'} style={{ borderRadius: 8, fontSize: 10 }}>
                              {isFull ? 'Full' : `Missing ${r.originalQty - received}`}
                            </Tag>
                            {!isFull && (
                              <Input
                                size="small"
                                placeholder="Reason for shortfall..."
                                value={productNotes[r.key] || ''}
                                onChange={e => setProductNotes(prev => ({ ...prev, [r.key]: e.target.value }))}
                                style={{ fontSize: 11, borderRadius: 6 }}
                              />
                            )}
                          </Space>
                        );
                      }
                    },
                  ]}
                />

                {/* Total summary */}
                <div style={{ marginTop: 10, padding: '8px 12px', background: isDark ? '#1e2235' : '#f0f7ff', borderRadius: 8, border: `1px solid ${isDark ? '#2a3040' : '#bae0ff'}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 12 }}>Total Items: <Text strong>{invoiceProducts.length}</Text></Text>
                  <Text style={{ fontSize: 12 }}>Total Qty Ordered: <Text strong>{invoiceProducts.reduce((s, p) => s + p.originalQty, 0)}</Text></Text>
                  <Text style={{ fontSize: 12 }}>Total Received: <Text strong style={{ color: '#52c41a' }}>{invoiceProducts.reduce((s, p) => s + (productQtys[p.key] ?? p.originalQty), 0)}</Text></Text>
                  {getMissingItems().length > 0 && <Text style={{ fontSize: 12 }}>Missing: <Text strong style={{ color: '#fa8c16' }}>{getMissingItems().reduce((s, m) => s + m.missingQty, 0)}</Text></Text>}
                </div>
              </div>
            )}

            {/* Missing items summary */}
            {invoiceScanned && getMissingItems().length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8, color: '#fa8c16', fontSize: 13 }}>
                  <ExclamationCircleOutlined style={{ marginRight: 6 }} />Missing Items Summary
                </Text>
                <Table
                  size="small"
                  dataSource={getMissingItems()}
                  rowKey="key"
                  pagination={false}
                  style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #fa8c1633' }}
                  columns={[
                    { title: 'Item', dataIndex: 'name', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'Ordered', dataIndex: 'originalQty' },
                    { title: 'Received', dataIndex: 'receivedQty', render: v => <Text style={{ color: '#52c41a' }}>{v}</Text> },
                    { title: 'Missing', dataIndex: 'missingQty', render: v => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
                    {
                      title: 'Reason', key: 'reason',
                      render: (_, r) => <Text type="secondary" style={{ fontSize: 11 }}>{productNotes[r.key] || '—'}</Text>
                    },
                  ]}
                />

                {/* Partial received section */}
                <div style={{ marginTop: 10, padding: '12px 14px', background: isDark ? '#1e1a10' : '#fffbe6', borderRadius: 8, border: '1px solid #fa8c1633' }}>
                  <Checkbox
                    checked={partialReceived}
                    onChange={e => { setPartialReceived(e.target.checked); if (!e.target.checked) { setMissedBy(null); setVendorMissedAction(null); } }}
                    style={{ fontWeight: 600, marginBottom: partialReceived ? 10 : 0 }}
                  >
                    Partially Received
                  </Checkbox>
                  {partialReceived && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 12, marginRight: 8 }}>Missed by:</Text>
                        <Select size="small" placeholder="Select cause" value={missedBy} onChange={v => { setMissedBy(v); setVendorMissedAction(null); }} style={{ width: 140 }}>
                          <Option value="vendor">Vendor</Option>
                          <Option value="lorry">Lorry</Option>
                        </Select>
                      </div>
                      {missedBy === 'vendor' && (
                        <div style={{ padding: '10px 12px', background: isDark ? '#1e2235' : '#f0f4ff', borderRadius: 8, border: `1px solid ${isDark ? '#2a3040' : '#d6e4ff'}` }}>
                          <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Vendor Responsibility — Choose action for missing items:</Text>
                          <Select
                            size="small"
                            placeholder="Select vendor action"
                            value={vendorMissedAction}
                            onChange={setVendorMissedAction}
                            style={{ width: '100%', marginBottom: 6 }}
                          >
                            <Option value="new_order">Send Immediately as a New Order</Option>
                            <Option value="attach_upcoming">Attach with Upcoming Order</Option>
                          </Select>
                          {vendorMissedAction && (
                            <Alert
                              type="info"
                              showIcon
                              style={{ borderRadius: 6, fontSize: 11 }}
                              message={vendorMissedAction === 'new_order'
                                ? `Dispatch team will be reminded to raise a new order for missing items from ${receivedTarget.supplier}.`
                                : `Missing items will be attached to the next order from ${receivedTarget.supplier}. Dispatch team will be notified.`}
                            />
                          )}
                        </div>
                      )}
                      {missedBy === 'lorry' && (
                        <div style={{ padding: '10px 12px', background: isDark ? '#1a1022' : '#f9f0ff', borderRadius: 8, border: `1px solid ${isDark ? '#3a1a5a' : '#d3adf7'}` }}>
                          <Space>
                            <SyncOutlined style={{ color: '#722ed1' }} />
                            <Text style={{ fontSize: 12 }}>Lorry Responsibility — The order will be <Text strong style={{ color: '#722ed1' }}>reopened and restarted</Text> from the order stage. The same delivery process will continue for the partial order.</Text>
                          </Space>
                          <div style={{ marginTop: 6, padding: '6px 10px', background: '#722ed120', borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, color: '#722ed1' }}>Status will be set to: <Text strong>Partial Delivery — Restarted</Text></Text>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirm button */}
            {invoiceScanned && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button block onClick={() => { setShowReceivedModal(false); setReceivedTarget(null); }}>Cancel</Button>
                <Button
                  block type="primary"
                  style={{ background: getMissingItems().length > 0 ? '#fa8c16' : '#52c41a', border: 'none' }}
                  onClick={handleConfirmReceived}
                >
                  {getMissingItems().length > 0 ? 'Confirm Partial Receipt' : 'Confirm Full Receipt'}
                </Button>
              </div>
            )}
            {!invoiceScanned && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: isDark ? '#aaa' : '#888', fontSize: 13 }}>
                <QrcodeOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#B11E6A55' }} />
                Upload invoice or use AI Scan to fetch product details
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
