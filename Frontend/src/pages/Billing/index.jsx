import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Drawer, Form, Input, Select,
  Typography, Space, Divider, Avatar, InputNumber, Tabs, Tooltip, Modal, DatePicker, TimePicker, Upload, message, Switch,
} from 'antd';
import {
  PlusOutlined, PrinterOutlined, DownloadOutlined, EyeOutlined,
  CheckCircleOutlined, LeftOutlined, CloseOutlined, UserOutlined,
  SearchOutlined, DeleteOutlined, CalendarOutlined, MinusOutlined,
  ShopOutlined, EnvironmentOutlined, BankOutlined, WhatsAppOutlined,
  FileDoneOutlined, EditOutlined, UploadOutlined, BellOutlined, SafetyCertificateOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';
import DocumentTemplate, { generatePrintHTML } from '../../components/templates/DocumentTemplate';

const { Title, Text } = Typography;
const { Option } = Select;

const initialInvoices = [
  { key: 1, inv: 'INV-2401', client: 'Marriott Mumbai', order: 'ORD-2402', date: '2024-01-18 10:30 AM', amount: 38500, gst: 6930, total: 45430, advance: 19250, balance: 26180, type: 'GST', status: 'Partially Paid' },
  { key: 2, inv: 'INV-2402', client: 'Taj Hotels Delhi', order: 'ORD-2403', date: '2024-01-17 02:45 PM', amount: 120000, gst: 21600, total: 141600, advance: 60000, balance: 81600, type: 'GST', status: 'Pending' },
  { key: 3, inv: 'INV-2403', client: 'ITC Grand Kolkata', order: 'ORD-2404', date: '2024-01-16 11:15 AM', amount: 250000, gst: 0, total: 250000, advance: 250000, balance: 0, type: 'Non-GST', status: 'Paid' },
  { key: 4, inv: 'INV-2404', client: 'The Grand Hotel', order: 'ORD-2401', date: '2024-01-10 09:20 AM', amount: 42000, gst: 7560, total: 49560, advance: 21000, balance: 28560, type: 'GST', status: 'Partially Paid' },
  { key: 5, inv: 'INV-2389', client: 'Client Demo', order: 'ORD-2389', date: '2023-11-20 04:30 PM', amount: 25000, gst: 4500, total: 29500, advance: 17000, balance: 12500, previousBalance: 0, type: 'GST', status: 'Overdue' },
  { key: 6, inv: 'INV-2405', client: 'Client Demo', order: 'ORD-2405', date: '2024-01-15 12:00 PM', amount: 50000, gst: 9000, total: 59000, advance: 10000, balance: 49000, previousBalance: 12500, type: 'GST', status: 'Pending' },
];

const statusColor = { Paid: '#6b1240', Pending: '#C94F8A', 'Partially Paid': '#B11E6A', Overdue: '#8a1652' };

const initialQuotations = [
  { key: 1, quot: 'QT-2401', client: 'Marriott Mumbai', order: 'ORD-2402', date: '2024-01-18 10:30 AM', amount: 38500, gst: 6930, total: 45430, advance: 19250, balance: 26180, type: 'GST', status: 'In Process' },
  { key: 2, quot: 'QT-2402', client: 'Taj Hotels Delhi', order: 'ORD-2403', date: '2024-01-17 02:45 PM', amount: 120000, gst: 21600, total: 141600, advance: 0, balance: 141600, type: 'GST', status: 'Unpaid' },
  { key: 3, quot: 'QT-2403', client: 'ITC Grand Kolkata', order: 'ORD-2404', date: '2024-01-16 11:15 AM', amount: 250000, gst: 0, total: 250000, advance: 250000, balance: 0, type: 'Non-GST', status: 'Paid' },
  { key: 4, quot: 'QT-2404', client: 'The Grand Hotel', order: 'ORD-2401', date: '2024-01-10 09:20 AM', amount: 42000, gst: 7560, total: 49560, advance: 21000, balance: 28560, type: 'GST', status: 'Partially Paid' },
  { key: 5, quot: 'QT-2405', client: 'Client Demo', order: 'ORD-2389', date: '2023-11-20 04:30 PM', amount: 25000, gst: 4500, total: 29500, advance: 0, balance: 29500, type: 'GST', status: 'Unpaid' },
  { key: 6, quot: 'QT-2406', client: 'Hotel Blue Star', order: 'ORD-2406', date: '2024-01-15 12:00 PM', amount: 50000, gst: 9000, total: 59000, advance: 10000, balance: 49000, type: 'GST', status: 'In Process' },
];

const quotStatusColor = { 'In Process': '#7c3aed', Paid: '#6b1240', 'Partially Paid': '#B11E6A', Unpaid: '#C94F8A' };

const partiesList = [
  { key: 1, name: '3R GREEN CORPORATION', phone: '7417157859', type: 'Supplier', balance: 0 },
  { key: 2, name: 'A1 TRAVELS AND SPEED PARCEL SERVICE', phone: '9443021991', type: 'Customer', balance: 0 },
  { key: 3, name: 'ABC COMPUTERS', phone: '9842117951', type: 'Supplier', balance: 76 },
  { key: 4, name: 'Abirami Royal', type: 'Customer', balance: 0 },
  { key: 5, name: 'ABM Home Stay', type: 'Customer', balance: 0 },
  { key: 6, name: 'ADITYA HERITAGE HOMES', type: 'Customer', balance: 0 },
  { key: 7, name: 'Client Demo', type: 'Customer', balance: 12500, phone: '9876543210' },
];

const itemsList = [
  { key: 1, name: 'KUTRALAM (2 SOAP 15G, 2 BRUSH, 1 PASTE, 1 COMB, 2 SHAMPOO, 1 OIL)', price: 30, unit: 'PCS', stock: -1.0, initials: 'K', color: '#B11E6A' },
  { key: 2, name: 'Morning Kit TTDC', price: 20, unit: 'PCS', stock: -2.0, initials: 'M', color: '#8a1652' },
  { key: 3, name: 'Soap (L) 15 gram', price: 3.65, unit: 'PCS', stock: 5.0, initials: 'S', color: '#C94F8A' },
];

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

  // Data state (mutable)
  const [invoiceList, setInvoiceList] = useState(initialInvoices);
  const [quotationList, setQuotationList] = useState(initialQuotations);
  const [activeTab, setActiveTab] = useState('order-in-process');

  // View invoice / quotation
  const [viewModal, setViewModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [viewDocType, setViewDocType] = useState('invoice');
  const [ledgerEntries, setLedgerEntries] = useState([
    { key: 1,  date: '2024-01-18', client: 'Marriott Mumbai',    type: 'Invoice',     doc: 'INV-2401', debit: 45430,  credit: 0,     balance: 45430  },
    { key: 2,  date: '2024-01-20', client: 'Marriott Mumbai',    type: 'Payment',     doc: 'REC-3001', debit: 0,      credit: 19250, balance: 26180  },
    { key: 3,  date: '2024-01-17', client: 'Taj Hotels Delhi',   type: 'Invoice',     doc: 'INV-2402', debit: 141600, credit: 0,     balance: 141600 },
    { key: 4,  date: '2024-01-19', client: 'Taj Hotels Delhi',   type: 'Payment',     doc: 'REC-3002', debit: 0,      credit: 60000, balance: 81600  },
    { key: 5,  date: '2024-01-16', client: 'ITC Grand Kolkata',  type: 'Invoice',     doc: 'INV-2403', debit: 250000, credit: 0,     balance: 250000 },
    { key: 6,  date: '2024-01-18', client: 'ITC Grand Kolkata',  type: 'Payment',     doc: 'REC-3003', debit: 0,      credit: 250000,balance: 0      },
    { key: 7,  date: '2024-01-10', client: 'The Grand Hotel',    type: 'Invoice',     doc: 'INV-2404', debit: 49560,  credit: 0,     balance: 49560  },
    { key: 8,  date: '2024-01-12', client: 'The Grand Hotel',    type: 'Payment',     doc: 'REC-3004', debit: 0,      credit: 21000, balance: 28560  },
    { key: 9,  date: '2023-11-20', client: 'Client Demo',        type: 'Invoice',     doc: 'INV-2389', debit: 29500,  credit: 0,     balance: 29500  },
    { key: 10, date: '2023-11-25', client: 'Client Demo',        type: 'Payment',     doc: 'REC-3005', debit: 0,      credit: 17000, balance: 12500  },
    { key: 11, date: '2024-01-15', client: 'Client Demo',        type: 'Invoice',     doc: 'INV-2405', debit: 59000,  credit: 0,     balance: 61500  },
    { key: 12, date: '2024-01-16', client: 'Client Demo',        type: 'Payment',     doc: 'REC-3006', debit: 0,      credit: 10000, balance: 61500  },
    { key: 13, date: '2024-05-01', client: 'Hotel Blue Star',    type: 'Invoice',     doc: 'INV-1001', debit: 25000,  credit: 0,     balance: 25000  },
    { key: 14, date: '2024-05-02', client: 'Hotel Blue Star',    type: 'Payment',     doc: 'REC-2041', debit: 0,      credit: 15000, balance: 10000  },
    { key: 15, date: '2024-05-03', client: 'Hotel Blue Star',    type: 'Credit Note', doc: 'CN-501',   debit: 0,      credit: 2000,  balance: 8000   },
  ]);

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
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(null);
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

  const subtotal = invoiceItems.reduce((s, i) => s + i.price * i.qty, 0);
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

  const handleSaveParty = () => {
    const vals = partyForm.getFieldsValue();
    const newParty = {
      key: Date.now(),
      name: vals.partyName || 'New Party',
      phone: vals.phone || '',
      type: partyType === 'customer' ? 'Customer' : 'Supplier',
      balance: parseFloat(vals.openingBal || 0),
    };
    handleSelectParty(newParty);
    partyForm.resetFields();
    billingForm.resetFields();
    setShowBillingAddr(false);
  };

  const handleSave = () => {
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

  const handleSavePayment = () => {
    const lastBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
    const paid = (payAmount || 0) - (payDiscount || 0);
    const newBalance = Math.max(0, lastBalance - paid);
    const newEntry = {
      key: Date.now(),
      date: dayjs().format('YYYY-MM-DD'),
      client: payParty?.name || '',
      type: 'Payment',
      doc: `REC-${paymentRefNum}`,
      debit: 0,
      credit: paid,
      balance: newBalance,
    };
    setLedgerEntries(prev => [...prev, newEntry]);
    message.success(`Payment of ₹${payAmount.toLocaleString()} recorded successfully`);
    setRecordPayOpen(false);
  };

  const openConvertModal = (quot) => {
    const prevInvs = invoiceList.filter(inv => inv.client === quot.client && inv.balance > 0);
    const prevDue = prevInvs.reduce((sum, inv) => sum + inv.balance, 0);
    setConvertQuot(quot);
    setConvertAmt(quot.total);
    setConvertPreviousDue(prevDue);
    setConvertPrevInvoices(prevInvs);
    setConvertOpen(true);
  };

  const handleConvertConfirm = () => {
    if (!convertQuot) return;
    const amt = convertAmt || convertQuot.total;
    const proportion = convertQuot.total > 0 ? amt / convertQuot.total : 1;
    const currentBalance = Math.max(0, amt - Math.round(convertQuot.advance * proportion));
    const newInv = {
      key: Date.now(),
      inv: `INV-${convertQuot.quot.replace('QT-', '')}`,
      client: convertQuot.client,
      order: convertQuot.order,
      date: convertQuot.date,
      amount: Math.round(convertQuot.amount * proportion),
      gst: Math.round(convertQuot.gst * proportion),
      total: amt,
      advance: Math.round(convertQuot.advance * proportion),
      balance: currentBalance + convertPreviousDue,
      previousBalance: convertPreviousDue,
      type: convertQuot.type,
      status: Math.round(convertQuot.advance * proportion) >= amt ? 'Paid' : convertQuot.advance > 0 ? 'Partially Paid' : 'Pending',
    };
    setInvoiceList(prev => [...prev, newInv]);
    if (amt >= convertQuot.total) {
      setQuotationList(prev => prev.filter(q => q.key !== convertQuot.key));
    } else {
      setQuotationList(prev => prev.map(q =>
        q.key === convertQuot.key ? { ...q, total: q.total - amt, balance: Math.max(0, q.balance - amt) } : q
      ));
    }
    setActiveTab('invoices');
    setConvertOpen(false);
    message.success(`${convertQuot.quot} converted to ${newInv.inv} and moved to Invoices`);
  };

  const openGstEdit = (inv) => {
    setGstEditInv(inv);
    setGstEditValue(inv.gst);
    setGstEditOpen(true);
  };

  const handleSaveGst = () => {
    const newGst = gstEditValue || 0;
    setInvoiceList(prev => prev.map(inv => {
      if (inv.key !== gstEditInv.key) return inv;
      const newTotal = inv.amount + newGst;
      const newBalance = Math.max(0, newTotal - inv.advance);
      return { ...inv, gst: newGst, total: newTotal, balance: newBalance };
    }));
    message.success('GST updated successfully');
    setGstEditOpen(false);
  };

  const handlePrintDocument = (docType, data) => {
    const html = generatePrintHTML(docType, data);
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
    { title: 'Order', dataIndex: 'order', width: 115, render: (v) => <Text style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
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
          <Tooltip title="WhatsApp"><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} onClick={() => message.success('Invoice shared on WhatsApp')} /></Tooltip>
          <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument('invoice', r)} /></Tooltip>
          <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} onClick={() => handlePrintDocument('invoice', r)} /></Tooltip>
          {r.balance > 0 && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', fontSize: 12 }} onClick={() => openRecordPay(r)}>Record Manually</Button>
              <Button size="small" icon={<CalendarOutlined />} onClick={() => message.success('Reminder sent to client')} style={{ color: '#fa8c16', fontSize: 12 }}>Reminder</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const makeQuotationColumns = (tabType) => [
    { title: 'Quotation #', dataIndex: 'quot', width: 120, fixed: 'left', render: (v) => <Text strong style={{ color: '#7c3aed', fontSize: 13 }}>{v}</Text> },
    { title: 'Date', dataIndex: 'date', width: 155, render: (v) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 165, render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Order', dataIndex: 'order', width: 115, render: (v) => <Text style={{ color: '#7c3aed', fontSize: 13 }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600 }}>₹{v.toLocaleString()}</Text> },
    { title: 'Advance', dataIndex: 'advance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: '#8a1652' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Balance', dataIndex: 'balance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? '#B11E6A' : '#52c41a' }}>₹{v.toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${quotStatusColor[v]}22`, color: quotStatusColor[v], border: `1px solid ${quotStatusColor[v]}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      width: tabType === 'in-process' ? 420 : 190,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4} wrap>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedInv({ ...r, inv: r.quot }); setViewDocType('quotation'); setViewModal(true); }} /></Tooltip>
          <Tooltip title="WhatsApp"><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} onClick={() => message.success('Quotation shared on WhatsApp')} /></Tooltip>
          <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument('quotation', r)} /></Tooltip>
          <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} onClick={() => handlePrintDocument('quotation', r)} /></Tooltip>
          {tabType === 'in-process' && (
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
          {tabType === 'in-process' && (r.status === 'Paid' || r.status === 'Partially Paid') && (
            <Button size="small" icon={<BellOutlined />} style={{ color: '#fa8c16', borderColor: '#fa8c1644', fontSize: 12 }} onClick={() => { setReminderQuot(r); setReminderDate(null); setReminderTime(null); setReminderMode('WhatsApp'); setReminderOpen(true); }}>
              Set Reminder
            </Button>
          )}
          {tabType === 'in-process' && r.status === 'Paid' && (
            <>
              <Button size="small" icon={<EyeOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff44', fontSize: 12 }} onClick={() => { setProofQuot(r); setProofOpen(true); }}>View Proof</Button>
              <Button size="small" icon={<SafetyCertificateOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', fontSize: 12 }} onClick={() => { setVerifyQuot(r); setVerifierName(''); setVerifyOpen(true); }}>Verify</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const totalRevenue = invoiceList.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoiceList.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoiceList.reduce((s, i) => s + i.balance, 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Billing" items={[{ label: 'Billing' }]} style={{ marginBottom: 0 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced', val: `₹${(totalRevenue / 100000).toFixed(2)}L`, color: '#B11E6A' },
          { label: 'Paid', val: `₹${(totalPaid / 1000).toFixed(0)}K`, color: '#8a1652' },
          { label: 'TO COLLECT', val: `₹${(totalPending / 1000).toFixed(0)}K`, color: '#C94F8A' },
          { label: 'Total Quotation', val: '₹4.2L', color: '#D85C9E', sub: 'Non-converted' },
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
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setQuotStatusFilter('all'); }}
        items={[
          {
            key: 'order-in-process',
            label: 'Order in Process',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(124,58,237,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${borderColor}` }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search quotation, client..." allowClear value={quotSearch} onChange={(e) => setQuotSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                  <Select
                    value={quotStatusFilter}
                    onChange={setQuotStatusFilter}
                    size="small"
                    style={{ width: 180 }}
                  >
                    <Option value="all">All</Option>
                    <Option value="Paid">Paid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                  </Select>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={quotationList
                      .filter(q => ['Paid', 'Partially Paid'].includes(q.status))
                      .filter(q => quotStatusFilter === 'all' || q.status === quotStatusFilter)
                      .filter(q => !quotSearch || (q.quot || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.client || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.order || '').toLowerCase().includes(quotSearch.toLowerCase()))}
                    columns={makeQuotationColumns('in-process')}
                    pagination={{ pageSize: 8, size: 'small' }}
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
                  <Select allowClear placeholder="Status" value={invoiceStatusFilter} onChange={setInvoiceStatusFilter} style={{ width: 170, borderRadius: 8 }}>
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
                      const matchSearch = !q || (inv.inv || '').toLowerCase().includes(q) || (inv.client || '').toLowerCase().includes(q) || (inv.order || '').toLowerCase().includes(q);
                      const matchStatus = !invoiceStatusFilter || inv.status === invoiceStatusFilter;
                      return matchSearch && matchStatus;
                    })}
                    columns={columns}
                    pagination={{ pageSize: 8, size: 'small' }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* ───────────── VIEW QUOTATION / INVOICE ───────────── */}
      <Modal
        open={viewModal}
        onCancel={() => setViewModal(false)}
        footer={null}
        width={Math.min(860, window.innerWidth - 32)}
        styles={{ body: { padding: '16px 12px', background: isDark ? '#1a1a2a' : '#f4f5f9', maxHeight: '85vh', overflowY: 'auto' } }}
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
          <DocumentTemplate type={viewDocType} data={selectedInv} />
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
                          <Form.Item label={<Text style={{ fontSize: 13 }}>Contact Number</Text>} name="phone" style={{ marginBottom: 0 }}>
                            <Input placeholder="9876543210" style={{ borderRadius: 8, height: 40 }} />
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
                onClick={() => message.info('Select unpaid invoice to link')}
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
            <FileDoneOutlined style={{ color: '#7c3aed' }} />
            <span style={{ fontWeight: 700 }}>Convert Quotation to Invoice</span>
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
            {/* Quotation info */}
            <div style={{ background: '#7c3aed10', border: '1px solid #7c3aed33', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Quotation</Text>
                <Text strong style={{ color: '#7c3aed' }}>{convertQuot.quot}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                <Text strong>{convertQuot.client}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Quotation Amount</Text>
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
                    Remaining ₹{(convertQuot.total - convertAmt).toLocaleString()} will stay in the quotation
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
                  if (!reminderDate) { message.warning('Please select a reminder date'); return; }
                  message.success(`Reminder scheduled for ${reminderDate.format('DD MMM YYYY')} via ${reminderMode}`);
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
                  if (!verifierName.trim()) { message.warning('Please enter verifier name'); return; }
                  message.success(`Payment verified by ${verifierName}`);
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
