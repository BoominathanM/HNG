import React, { useState, useRef, useEffect } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, DatePicker, Upload, message, InputNumber, Divider, List, Descriptions, Tabs, Avatar, Switch, Tooltip, Badge, notification, Popover
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, ShoppingOutlined, SearchOutlined,
  UploadOutlined, EyeOutlined, EditOutlined, FileTextOutlined, WarningOutlined, InfoCircleOutlined, WhatsAppOutlined,
  TeamOutlined, ContactsOutlined, DollarOutlined, LeftOutlined, CheckOutlined, UserOutlined, CameraOutlined, SafetyCertificateOutlined,
  ThunderboltOutlined, RobotOutlined, MessageOutlined, BellOutlined, CloseOutlined, ClockCircleOutlined, ReloadOutlined, SaveOutlined, TruckOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addRaisedRequest, raiseOrder, addBulkRequests, dismissNewProductRequest, updateFinanceStatus, updateRequestQty, addRequestNote, updateQuotationDetails } from '../../store/slices/purchaseSlice';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const inventory = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', category: 'Raw Material', unit: 'Kg', current: 450, min: 100, max: 1000, price: 'â‚¹85/Kg', status: 'OK', seller: 'ChemCo India', purchasedDate: '2024-01-15' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', category: 'Raw Material', unit: 'Kg', current: 45, min: 100, max: 500, price: 'â‚¹95/Kg', status: 'Low', seller: 'BioLife Ltd', purchasedDate: '2024-01-10' },
  { key: 3, code: 'PK-001', name: 'Shampoo Bottles (Flip 30ml)', category: 'Packaging', unit: 'Pcs', current: 200, min: 500, max: 5000, price: 'â‚¹4.5/Pc', status: 'Low', seller: 'PlastiPack', purchasedDate: '2024-01-05' },
  { key: 4, code: 'PK-002', name: 'Dental Kit Boxes', category: 'Packaging', unit: 'Pcs', current: 850, min: 200, max: 2000, price: 'â‚¹12/Pc', status: 'OK', seller: 'BoxWorld', purchasedDate: '2024-01-12' },
  { key: 5, code: 'ST-001', name: 'Custom Stickers (Hotel Brand)', category: 'Sticker', unit: 'Pcs', current: 3000, min: 500, max: 10000, price: 'â‚¹1.2/Pc', status: 'OK', seller: 'PrintFast', purchasedDate: '2024-01-18' },
  { key: 6, code: 'RM-003', name: 'Shampoo Concentrate', category: 'Raw Material', unit: 'Ltr', current: 0, min: 50, max: 500, price: 'â‚¹220/Ltr', status: 'Out', seller: 'ChemCo India', purchasedDate: '2023-12-20' },
];

const suppliersList = [
  { id: 1, name: 'ChemCo India', phone: '+91 98765 43210', email: 'info@chemco.in', address: 'Mumbai, MH', bank: 'HDFC Bank â€" A/C 50100123456789 | IFSC HDFC0001234' },
  { id: 2, name: 'BioLife Ltd', phone: '+91 87654 32109', email: 'contact@biolife.in', address: 'Chennai, TN', bank: 'SBI â€" A/C 30112345678 | IFSC SBIN0001234' },
  { id: 3, name: 'PlastiPack', phone: '+91 76543 21098', email: 'sales@plastipack.com', address: 'Delhi, DL', bank: 'ICICI â€" A/C 007601234567 | IFSC ICIC0000076' },
  { id: 4, name: 'BoxWorld', phone: '+91 65432 10987', email: 'info@boxworld.in', address: 'Bengaluru, KA', bank: 'Axis Bank â€" A/C 912010012345678 | IFSC UTIB0000001' },
];

const vendorsList = [
  { id: 1, name: 'Marriott Mumbai',   phone: '+91 22 6651 1234', email: 'purchase@marriott.in',    address: 'Mumbai, MH',  whatsapp: '912266511234', totalPaid: 95000,  pending: 25000 },
  { id: 2, name: 'Taj Hotels Delhi',  phone: '+91 11 6600 7777', email: 'orders@tajhotels.in',     address: 'Delhi, DL',   whatsapp: '911166007777', totalPaid: 60000,  pending: 81600 },
  { id: 3, name: 'ITC Grand Kolkata', phone: '+91 33 2288 9999', email: 'supply@itchotels.in',     address: 'Kolkata, WB', whatsapp: '913322889999', totalPaid: 250000, pending: 0     },
  { id: 4, name: 'Hyatt Chennai',     phone: '+91 44 6150 1234', email: 'procurement@hyatt.in',   address: 'Chennai, TN', whatsapp: '914461501234', totalPaid: 42000,  pending: 18000 },
];

const INVENTORY_DATA = [
  { key: 1, code: 'RM-001', name: 'Soap Base (White)', current: 450, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 2, code: 'RM-002', name: 'Soap Base (Transparent)', current: 45, min: 100, unit: 'Kg', category: 'Raw Materials' },
  { key: 3, code: 'PK-010', name: 'Amber Bottles 100ml', current: 120, min: 500, unit: 'Pcs', category: 'Packaging' },
  { key: 4, code: 'PK-012', name: 'Flip Top Caps', current: 800, min: 1000, unit: 'Pcs', category: 'Packaging' },
];

export default function Purchase() {
  const isDark = useSelector((s) => s.theme.isDark);
  const dispatch = useDispatch();
  const raisedRequests = useSelector((s) => s.purchase.raisedRequests);
  const purchaseOrders = useSelector((s) => s.purchase.purchaseOrders);
  const newProductRequests = useSelector((s) => s.purchase.newProductRequests);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [suppliers, setSuppliers] = useState(suppliersList);
  const [vendors, setVendors] = useState(vendorsList);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
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

  const [showRequestOrderModal, setShowRequestOrderModal] = useState(false);
  const [selectedApprovedRequest, setSelectedApprovedRequest] = useState(null);
  const [viewApprovalDoc, setViewApprovalDoc] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [requestOrderForm] = Form.useForm();
  const [requestOrderScanLoading, setRequestOrderScanLoading] = useState(false);
  const [requestOrderScannedFile, setRequestOrderScannedFile] = useState(null);

  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateType, setUpdateType] = useState('supplier'); // 'supplier' or 'vendor'
  const [statusForm] = Form.useForm();
  const [currentStatus, setCurrentStatus] = useState('');

  /* â"€â"€ History material search â"€â"€ */
  const [supplierHistorySearch, setSupplierHistorySearch] = useState('');
  const [vendorHistorySearch, setVendorHistorySearch] = useState('');

  /* â"€â"€ AI scan state â"€â"€ */
  const [supplierScanLoading, setSupplierScanLoading] = useState(false);
  const [vendorScanLoading, setVendorScanLoading] = useState(false);
  const [supplierScannedFile, setSupplierScannedFile] = useState(null);
  const [vendorScannedFile, setVendorScannedFile] = useState(null);
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

  /* â"€â"€ Purchase Expense tab state â"€â"€ */
  const [purchaseExpenses, setPurchaseExpenses] = useState([
    { key: 1, date: '2024-05-01', invoice_no: 'INV-CHEM-101', supplier: 'ChemCo India', qty: '100 Kg', paid_status: 'Paid', paid_amount: 8500, total_amount: 8500, remaining: 0 },
    { key: 2, date: '2024-05-04', invoice_no: 'INV-BIO-452', supplier: 'BioLife Ltd', qty: '200 Ltr', paid_status: 'Partially Paid', paid_amount: 22000, total_amount: 44000, remaining: 22000 },
    { key: 3, date: '2024-05-06', invoice_no: 'INV-PP-203', supplier: 'PlastiPack', qty: '500 Pcs', paid_status: 'Unpaid', paid_amount: 0, total_amount: 2250, remaining: 2250 },
  ]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseScanFile, setExpenseScanFile] = useState(null);
  const [expenseScanLoading, setExpenseScanLoading] = useState(false);
  const [expenseForm] = Form.useForm();

  /* â"€â"€ Vendor bill scan state (scan & record vendor bill â†' purchase expense) â"€â"€ */
  const [showVendorBillScanModal, setShowVendorBillScanModal] = useState(false);
  const [vendorBillFile, setVendorBillFile] = useState(null);
  const [vendorBillScanLoading, setVendorBillScanLoading] = useState(false);
  const [vendorBillForm] = Form.useForm();

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
        { name: 'Soap Base (White)', qty: '100 Kg', price: 'â‚¹85', total: 'â‚¹8,500' },
      ],
      entity: 'ChemCo India',
      amount: 'â‚¹8,500',
      status: 'Paid',
      req_status: 'Confirmed'
    },
    {
      key: 2,
      date: '2024-05-04',
      bill_no: 'PUR-8825',
      inv_no: 'INV-BIO-452',
      items: [
        { name: 'Shampoo Concentrate', qty: '200 Ltr', price: 'â‚¹220', total: 'â‚¹44,000' }
      ],
      entity: 'BioLife Ltd',
      amount: 'â‚¹44,000',
      status: 'Unpaid',
      req_status: 'Pending'
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
    message.success(`Purchase request for ${values.product} raised â€" pending financial approval`);
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
        sup_bank: 'HDFC Bank â€" A/C 50100123456789 | IFSC HDFC0001234',
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
        cust_bank: 'ICICI Bank â€" A/C 007601234567 | IFSC ICIC0000076',
        cust_notes: 'Premium hotel chain. Monthly billing cycle.',
        cust_discount: 8,
      });
      setVendorScanLoading(false);
      message.success('AI extracted vendor details from the document!');
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
    raiseRequestForm.setFieldsValue({ product: product.name, qty: suggestQty, unit: product.unit });
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

  const handleBulkSupplierSelect = (supplierName) => {
    setBulkSupplierName(supplierName);
    const supplierItems = inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.seller === supplierName);
    const otherLowStock = inventory.filter(i => (i.status === 'Low' || i.status === 'Out') && i.seller !== supplierName);
    const allItems = [...supplierItems, ...otherLowStock];
    setBulkItems(allItems.map(i => ({
      invKey: i.key,
      name: i.name,
      unit: i.unit,
      currentStock: i.current,
      minStock: i.min,
      status: i.status,
      fromSupplier: i.seller === supplierName,
      selected: i.seller === supplierName,
      qty: i.min > i.current ? Math.max((i.min - i.current) * 2, i.min) : i.min,
    })));
  };

  const handleBulkPurchaseSubmit = () => {
    const selected = bulkItems.filter(i => i.selected && i.qty > 0);
    if (selected.length === 0) { message.warning('Select at least one product'); return; }
    if (!bulkSupplierName) { message.warning('Select a supplier first'); return; }
    if (!bulkPayTerms) { message.warning('Select payment terms'); return; }
    dispatch(addBulkRequests(selected.map(item => ({
      item: item.name,
      supplier: bulkSupplierName,
      qty: item.qty,
      unit: item.unit,
      payment_terms: bulkPayTerms,
      date: dayjs().format('YYYY-MM-DD'),
    }))));
    message.success(`${selected.length} bulk purchase request(s) raised successfully!`);
    setShowBulkPurchaseModal(false);
    setBulkSupplierName('');
    setBulkItems([]);
    setBulkPayTerms('');
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
                            <Text type="secondary" style={{ fontSize: 11 }}>Sales team listed new products â€" raise purchase requests below</Text>
                          </div>
                          <Table
                            size="small"
                            dataSource={newProductRequests}
                            pagination={false}
                            rowKey="key"
                            columns={[
                              { title: 'Product Name', dataIndex: 'productName', key: 'productName', render: v => <Text strong style={{ color: '#d46b08' }}>{v}</Text> },
                              { title: 'Qty (from Sales)', dataIndex: 'qty', key: 'qty', render: (v) => v || 'â€"' },
                              { title: 'Hotel / Customer', dataIndex: 'hotelName', key: 'hotelName', render: v => v || 'â€"' },
                              { title: 'Sales Person', dataIndex: 'salesPerson', key: 'salesPerson', render: v => v || 'â€"' },
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
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
                      <Table
                        size="small"
                        dataSource={INVENTORY_DATA}
                        pagination={{ pageSize: 5 }}
                        rowKey="key"
                        expandable={{
                          expandedRowKeys: openInvNotes ? [openInvNotes] : [],
                          onExpand: () => {},
                          showExpandColumn: false,
                          expandedRowRender: (r) => {
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
                              if (!req?.supplier) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              return <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 12 }}>{req.supplier}</Text>;
                            }
                          },
                          {
                            title: 'Payment Terms', key: 'payment_terms',
                            render: (_, r) => {
                              const req = raisedRequests.find(req => req.item === r.name);
                              if (!req?.payment_terms) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                              return <Text style={{ fontSize: 11 }}>{req.payment_terms}</Text>;
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
                              const noteCount = (invItemNotes[r.key] || []).length;
                              const noteBtn = (
                                <Badge count={noteCount} size="small" offset={[-2, 2]}>
                                  <Button
                                    size="small"
                                    icon={<MessageOutlined />}
                                    onClick={() => setOpenInvNotes(openInvNotes === r.key ? null : r.key)}
                                    style={{ color: openInvNotes === r.key ? '#fff' : '#B11E6A', background: openInvNotes === r.key ? '#B11E6A' : 'transparent', borderColor: '#B11E6A55' }}
                                  />
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
                    </div>
                  )
                },
                {
                  key: 'order_tracking',
                  label: <Space><TruckOutlined />Order Tracking</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Order Tracking</Title>
                        <Text type="secondary">Track purchase orders by LR number and expected delivery date</Text>
                      </div>
                      <Table
                        size="small"
                        dataSource={purchaseOrders.map(o => ({ ...o, lr: lrData[o.key] || null }))}
                        rowKey="key"
                        pagination={{ pageSize: 8 }}
                        locale={{ emptyText: 'No orders yet. Orders will appear here once raised from the Purchase module.' }}
                        columns={[
                          { title: 'Order Date', dataIndex: 'date', key: 'date' },
                          {
                            title: 'Bill / Inv No', key: 'nos',
                            render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Text strong>{r.bill_no}</Text>
                                <Text style={{ color: '#B11E6A', fontSize: 11 }}>{r.inv_no}</Text>
                              </Space>
                            )
                          },
                          { title: 'Item', dataIndex: 'item', key: 'item', render: v => <Text strong>{v}</Text> },
                          { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Qty', key: 'qty', render: (_, r) => `${r.qty} ${r.unit}` },
                          { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => <Text strong style={{ color: '#B11E6A' }}>₹{v?.toLocaleString()}</Text> },
                          {
                            title: 'LR Number', key: 'lr_number',
                            render: (_, r) => r.lr
                              ? <Text strong style={{ color: '#1890ff' }}>{r.lr.lrNumber}</Text>
                              : <Tag color="default" style={{ borderRadius: 8 }}>Not Uploaded</Tag>
                          },
                          {
                            title: 'Expected Delivery', key: 'delivery',
                            render: (_, r) => {
                              if (!r.lr?.deliveryDate) return <Text type="secondary">—</Text>;
                              const days = dayjs(r.lr.deliveryDate).diff(dayjs(), 'day');
                              const color = days < 0 ? '#ff4d4f' : days <= 2 ? '#fa8c16' : '#52c41a';
                              return (
                                <Space direction="vertical" size={0}>
                                  <Text strong style={{ color }}>{r.lr.deliveryDate}</Text>
                                  <Text style={{ fontSize: 11, color }}>
                                    {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d remaining`}
                                  </Text>
                                </Space>
                              );
                            }
                          },
                          {
                            title: 'Pay Status', key: 'pay_status',
                            render: (_, r) => {
                              if (!r.lr) return <Text type="secondary">—</Text>;
                              return <Tag color={r.lr.paidStatus === 'Paid' ? 'success' : 'error'} style={{ borderRadius: 10 }}>{r.lr.paidStatus}</Tag>;
                            }
                          },
                          {
                            title: 'LR Copy', key: 'lr_copy',
                            render: (_, r) => {
                              if (!r.lr) return <Text type="secondary">—</Text>;
                              return (
                                <Space direction="vertical" size={2}>
                                  {r.lr.fileName
                                    ? <Button size="small" icon={<FileTextOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff' }}>View</Button>
                                    : <Text type="secondary" style={{ fontSize: 11 }}>No file</Text>
                                  }
                                </Space>
                              );
                            }
                          },
                        ]}
                      />
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
                          { key: 1, date: '2024-05-02', bill_no: 'SAL-2001', inv_no: 'INV-X99', items: [{ name: 'Dental Kit Boxes', qty: '50 Pcs', price: 'â‚¹15/Pc', total: 'â‚¹750' }, { name: 'Soap Bars', qty: '20 Pcs', price: 'â‚¹10/Pc', total: 'â‚¹200' }], status: 'Dispatched' },
                          { key: 2, date: '2024-04-20', bill_no: 'SAL-1980', inv_no: 'INV-X85', items: [{ name: 'Custom Stickers', qty: '1000 Pcs', price: 'â‚¹2/Pc', total: 'â‚¹2,000' }], status: 'Delivered' },
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
                                  const total = r.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[â‚¹,]/g, '')), 0);
                                  return <Text strong>â‚¹{total.toLocaleString()}</Text>;
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
                              { title: 'Total Paid', dataIndex: 'totalPaid', key: 'totalPaid', render: v => <Text style={{ color: '#52c41a', fontWeight: 600 }}>â‚¹{v.toLocaleString()}</Text> },
                              { title: 'Pending', dataIndex: 'pending', key: 'pending', render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>â‚¹{v.toLocaleString()}</Text> },
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
                  key: 'purchase_expense',
                  label: <Space><DollarOutlined /> Purchase Expense</Space>,
                  children: (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <Title level={5} style={{ margin: 0, color: textColor }}>Purchase Expenses</Title>
                        <Space wrap>
                          <Button
                            icon={<CameraOutlined />}
                            style={{ borderColor: '#B11E6A66', color: '#B11E6A' }}
                            onClick={() => { setVendorBillFile(null); vendorBillForm.resetFields(); setShowVendorBillScanModal(true); }}
                          >
                            Scan & Record Bill
                          </Button>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                            onClick={() => { setExpenseScanFile(null); expenseForm.resetFields(); setShowAddExpenseModal(true); }}
                          >
                            Add Expense
                          </Button>
                          <Button icon={<DownloadOutlined />}>Export</Button>
                        </Space>
                      </div>
                      <Table
                        size="small"
                        dataSource={purchaseExpenses}
                        pagination={{ pageSize: 8 }}
                        columns={[
                          { title: 'Purchase Date', dataIndex: 'date', key: 'date', render: v => <Text strong>{v}</Text> },
                          { title: 'Invoice Number', dataIndex: 'invoice_no', key: 'invoice_no', render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                          { title: 'Quantity', dataIndex: 'qty', key: 'qty' },
                          { title: 'Supplier Name', dataIndex: 'supplier', key: 'supplier', render: v => <Text style={{ fontWeight: 600 }}>{v}</Text> },
                          {
                            title: 'Paid Status',
                            key: 'paid_status',
                            render: (_, r) => (
                              <Space direction="vertical" size={0}>
                                <Tag
                                  color={r.paid_status === 'Paid' ? 'success' : r.paid_status === 'Partially Paid' ? 'warning' : 'error'}
                                  style={{ borderRadius: 10 }}
                                >
                                  {r.paid_status}
                                </Tag>
                                {r.paid_amount > 0 && (
                                  <Text style={{ fontSize: 11, color: '#52c41a' }}>Paid: â‚¹{r.paid_amount.toLocaleString()}</Text>
                                )}
                                {r.remaining > 0 && (
                                  <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Remaining: â‚¹{r.remaining.toLocaleString()}</Text>
                                )}
                              </Space>
                            )
                          },
                          { title: 'Total', key: 'total', render: (_, r) => <Text strong style={{ color: '#B11E6A' }}>â‚¹{r.total_amount.toLocaleString()}</Text> },
                          {
                            title: 'Actions', key: 'actions',
                            render: (_, r) => (
                              <Space>
                                <Button size="small" icon={<EyeOutlined />} />
                                {r.paid_status !== 'Paid' && (
                                  <Button size="small" icon={<UploadOutlined />} style={{ color: '#1890ff', fontWeight: 600 }}>Payment Proof</Button>
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

      {/* Ask Quotation Modal â€" WhatsApp only */}
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
              <Col span={12}>
                <Form.Item label="Product" name="product" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                  <Input disabled style={{ borderRadius: 8, background: isDark ? '#1e2235' : '#fff' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Select a supplier' }]} style={{ marginBottom: 0 }}>
                  <Select
                    placeholder="Select supplier"
                    style={{ borderRadius: 8 }}
                    onChange={(val) => setSelectedSupplier(suppliers.find(s => s.name === val) || null)}
                  >
                    {suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
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
              Also include in this quotation request: <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>(optional â€" select more low-stock items)</Text>
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
                const mainLine = `â€¢ *${values.product}* â€" Qty: ${values.qty || 'N/A'} ${values.unit || ''}`;
                const extraLines = quotationExtraProducts.map(p => {
                  const inv = inventory.find(i => i.name === p);
                  return `â€¢ *${p}* â€" Qty: ${quotationExtraQtys[p] || 'N/A'} ${inv?.unit || 'Pcs'}`;
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

      {/* Raise Request Modal â€" upload quotation doc + AI + send to Financial */}
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
                <Text strong style={{ color: textColor, display: 'block', fontSize: 14 }}>{raiseRequestProduct.name}</Text>
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
              <Form.Item name="unit" hidden><Input /></Form.Item>
            </div>
          )}

          {/* Supplier */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: 'Select a supplier' }]} style={{ marginBottom: 0 }}>
              <Select
                placeholder="Select supplier"
                style={{ borderRadius: 8 }}
                onChange={(val) => setRaiseRequestSupplier(suppliers.find(s => s.name === val) || null)}
              >
                {suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
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
                <Text style={{ fontSize: 11, color: '#aaa' }}>Upload quotation file â€" AI will auto-fill payment terms & quantity</Text>
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

          {/* Multi-select additional products */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: textColor, display: 'block', marginBottom: 8 }}>
              Also raise request for: <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>(optional â€" select more low-stock items for same supplier)</Text>
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

      {/* Payment Request Modal â€" order details filled after financial approval */}
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
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera â€" AI will auto-fill order details below</Text>
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
                  <Form.Item label="Unit Price (â‚¹)" name="unit_price" rules={[{ required: true, message: 'Enter unit price' }]}>
                    <InputNumber prefix="â‚¹" style={{ width: '100%' }} placeholder="0.00" min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Total Amount (â‚¹)" name="total_amount" rules={[{ required: true, message: 'Enter total amount' }]}>
                    <InputNumber prefix="â‚¹" style={{ width: '100%' }} placeholder="0.00" min={0} />
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
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera â€" AI will auto-fill the fields below</Text>
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
              <Text style={{ fontSize: 11, color: '#aaa' }}>Upload a file or tap Scan to use camera â€" AI will auto-fill the fields below</Text>
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


      {/* Scan & Record Vendor Bill Modal */}
      <Modal
        title={
          <Space>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>Scan & Record Vendor Bill</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>AI extracts details â€" create as Purchase Expense</Text>
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
          {/* Scan section */}
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
                loading={vendorBillScanLoading}
                style={{ borderRadius: 8, background: vendorBillFile ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : '#f0f0f0', border: 'none', color: vendorBillFile ? '#fff' : '#bbb', fontWeight: 700 }}
                onClick={() => {
                  if (!vendorBillFile) { message.warning('Please upload or capture a bill first'); return; }
                  setVendorBillScanLoading(true);
                  setTimeout(() => {
                    vendorBillForm.setFieldsValue({
                      date: dayjs(),
                      invoice_no: 'INV-' + Math.floor(Math.random() * 9000 + 1000),
                      supplier: 'ChemCo India',
                      qty: '100 Kg',
                      total_amount: 8500,
                      paid_status: 'Unpaid',
                    });
                    setVendorBillScanLoading(false);
                    message.success('AI extracted bill details successfully!');
                  }, 2000);
                }}
              >
                {vendorBillScanLoading ? 'Scanning...' : 'Scan with AI'}
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
                <Form.Item label="Supplier Name" name="supplier" rules={[{ required: true }]}>
                  <Select placeholder="Select supplier">
                    {suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
                  </Select>
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
                <Form.Item label="Total Amount (â‚¹)" name="total_amount" rules={[{ required: true }]}>
                  <InputNumber prefix="â‚¹" style={{ width: '100%' }} min={0} />
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
              onClick={() => {
                vendorBillForm.validateFields().then(values => {
                  const newExp = {
                    key: Date.now(),
                    date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                    invoice_no: values.invoice_no,
                    supplier: values.supplier,
                    qty: values.qty || 'â€"',
                    paid_status: values.paid_status,
                    paid_amount: values.paid_status === 'Paid' ? values.total_amount : 0,
                    total_amount: values.total_amount,
                    remaining: values.paid_status === 'Paid' ? 0 : values.total_amount,
                  };
                  setPurchaseExpenses(prev => [newExp, ...prev]);
                  message.success('Bill recorded as Purchase Expense');
                  setShowVendorBillScanModal(false);
                  vendorBillForm.resetFields();
                  setVendorBillFile(null);
                });
              }}
            >
              Create Purchase Expense
            </Button>
          </div>
        </div>
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
              <Col span={12}><Form.Item label="Total Amount (â‚¹)" name="total_amount" rules={[{ required: true }]}><InputNumber prefix="â‚¹" style={{ width: '100%' }} min={0} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Paid Status" name="paid_status" rules={[{ required: true }]}><Select><Option value="Paid">Paid</Option><Option value="Partially Paid">Partially Paid</Option><Option value="Unpaid">Unpaid</Option></Select></Form.Item></Col>
            </Row>
          </Form>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button style={{ flex: 1 }} onClick={() => { setShowAddExpenseModal(false); expenseForm.resetFields(); setExpenseScanFile(null); }}>Cancel</Button>
            <Button type="primary" style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
              onClick={() => {
                expenseForm.validateFields().then(values => {
                  const newExp = { key: Date.now(), date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'), invoice_no: values.invoice_no, supplier: values.supplier, qty: values.qty || 'â€"', paid_status: values.paid_status, paid_amount: values.paid_status === 'Paid' ? values.total_amount : 0, total_amount: values.total_amount, remaining: values.paid_status === 'Paid' ? 0 : values.total_amount };
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
                <Descriptions.Item label="Tax Amount">â‚¹{(parseInt(viewBillDetail.items[0].total.replace(/[â‚¹,]/g, '')) * 0.18).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Total Amount"><Text strong style={{ color: '#B11E6A', fontSize: 16 }}>{viewBillDetail.items.reduce((sum, i) => sum + parseInt(i.total.replace(/[â‚¹,]/g, '')), 0).toLocaleString()} (INR)</Text></Descriptions.Item>
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

          {updateType === 'supplier' && currentStatus === 'In Transit' && (
            <>
              <Form.Item
                label={<Text strong>LR Number (Lorry Receipt / Bilty) <span style={{ color: '#ff4d4f' }}>*</span></Text>}
                name="lr_number"
                rules={[{ required: true, message: 'LR number is required for tracking' }]}
                extra="Enter LR number to enable shipment tracking and reminders"
              >
                <Input placeholder="e.g. LR-20240501-001" style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item
                label="Expected Delivery Date"
                name="expected_delivery"
                rules={[{ required: true, message: 'Select expected delivery date' }]}
              >
                <DatePicker
                  style={{ width: '100%', borderRadius: 8 }}
                  disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                  placeholder="When should the order arrive?"
                />
              </Form.Item>
              <div style={{ padding: '8px 12px', background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#d46b08' }}>Reminders will be sent to the purchase team based on the LR and expected delivery date.</Text>
              </div>
              <Form.Item
                label="Upload LR / Transport Bill"
                name="lr_document"
                extra="Upload PDF or Image of the Lorry Receipt"
              >
                <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                  <p className="ant-upload-drag-icon"><FileTextOutlined style={{ color: '#B11E6A' }} /></p>
                  <p className="ant-upload-text">Click or drag LR document to upload</p>
                </Upload.Dragger>
              </Form.Item>
            </>
          )}
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
            <>
              <Form.Item
                label={<Text strong>Verified By <span style={{ color: '#ff4d4f' }}>*</span></Text>}
                name="verified_by"
                rules={[{ required: true, message: 'Please enter verifier name' }]}
              >
                <Input
                  placeholder="Enter name of person verifying the goods"
                  style={{ borderRadius: 8 }}
                  value={verifiedByName}
                  onChange={e => setVerifiedByName(e.target.value)}
                />
              </Form.Item>
              <Form.Item
                label="Upload Supplier Invoice (for auto stock update)"
                name="supplier_invoice"
                rules={[{ required: true, message: 'Please upload supplier invoice' }]}
                extra="Stock will auto-update from this invoice after verification"
              >
                <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                  <p className="ant-upload-drag-icon">
                    <FileTextOutlined style={{ color: '#B11E6A' }} />
                  </p>
                  <p className="ant-upload-text">Upload Supplier Invoice (PDF / Image)</p>
                  <p className="ant-upload-hint" style={{ fontSize: 11 }}>Stock will be auto-fetched from this invoice</p>
                </Upload.Dragger>
              </Form.Item>
              <Form.Item
                label="Photo of Received Goods"
                name="received_photo"
                extra="Capture or upload photo of the received items"
              >
                <Upload.Dragger maxCount={1} beforeUpload={() => false} style={{ background: '#fafafa', borderRadius: 8 }}>
                  <p className="ant-upload-drag-icon">
                    <CameraOutlined style={{ color: '#B11E6A' }} />
                  </p>
                  <p className="ant-upload-text">Capture/Upload Photo of Goods</p>
                </Upload.Dragger>
              </Form.Item>
            </>
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
        onCancel={() => { setShowPlaceOrderModal(false); setSelectedPlaceOrderItem(null); setSelectedPlaceOrderReq(null); }}
        footer={null}
        width={540}
        centered
      >
        {selectedPlaceOrderReq && (() => {
          const sup = suppliersList.find(s => s.name === selectedPlaceOrderReq.supplier);
          return (
            <div style={{ marginTop: 8 }}>
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
                <Button
                  onClick={() => { setShowPlaceOrderModal(false); setSelectedPlaceOrderItem(null); setSelectedPlaceOrderReq(null); }}
                  style={{ flex: 1, height: 44, borderRadius: 10 }}
                >
                  Cancel
                </Button>
                <Button
                  icon={<WhatsAppOutlined />}
                  style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14 }}
                  onClick={() => {
                    const msg = `*Purchase Order*\n\n*Item:* ${selectedPlaceOrderReq.item}\n*Quantity:* ${selectedPlaceOrderReq.qty} ${selectedPlaceOrderReq.unit}\n*Payment Terms:* ${selectedPlaceOrderReq.payment_terms}\n*Date:* ${selectedPlaceOrderReq.date}\n\nKindly confirm the order and advise on delivery timeline.`;
                    const phone = sup ? sup.phone.replace(/\D/g, '') : '';
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                    message.success('Order sent via WhatsApp');
                    setShowPlaceOrderModal(false);
                    setSelectedPlaceOrderItem(null);
                    setSelectedPlaceOrderReq(null);
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
        onCancel={() => { setShowBulkPurchaseModal(false); setBulkSupplierName(''); setBulkItems([]); setBulkPayTerms(''); }}
        footer={null}
        width={640}
        centered
      >
        <div style={{ marginTop: 4 }}>
          {/* Step 1: Supplier Selection */}
          <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: `1px solid ${isDark ? '#2a2d40' : '#f0f0f0'}` }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 8 }}>
              Step 1 â€" Select Supplier
            </Text>
            <Select
              placeholder="Select supplier name..."
              style={{ width: '100%', borderRadius: 8 }}
              value={bulkSupplierName || undefined}
              onChange={handleBulkSupplierSelect}
              showSearch
              optionFilterProp="children"
            >
              {suppliersList.map(s => <Option key={s.id} value={s.name}>{s.name}</Option>)}
            </Select>
            {bulkSupplierName && (() => {
              const sup = suppliersList.find(s => s.name === bulkSupplierName);
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
                Step 2 â€" Select Products & Quantities
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                  (Showing low-stock items â€" supplier's products pre-selected)
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
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A', display: 'block', marginBottom: 8 }}>Step 3 â€" Payment Terms</Text>
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

          {/* Summary & Submit */}
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

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => { setShowBulkPurchaseModal(false); setBulkSupplierName(''); setBulkItems([]); setBulkPayTerms(''); }}
              style={{ flex: 1, height: 44, borderRadius: 10 }}
            >Cancel</Button>
            <Button
              type="primary"
              disabled={bulkItems.filter(i => i.selected).length === 0 || !bulkPayTerms}
              onClick={handleBulkPurchaseSubmit}
              style={{ flex: 2, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700, fontSize: 14 }}
            >
              Raise {bulkItems.filter(i => i.selected).length || ''} Purchase Request(s)
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
                .map(r => ({ value: r.key, label: `${r.item} â€" ${r.supplier} (${r.qty} ${r.unit})` }))}
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
                { value: 'Approved', label: 'âœ…  Approved â€" proceed with order' },
                { value: 'ModifyRequested', label: 'âš ï¸  Modify Requested â€" quantity needs revision' },
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
    </div>
  );
}
