import React, { useState } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Space, Tabs, Divider, DatePicker, Tag } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const salesMonthData = {
  all: [
    { month: 'Sep', amount: 62000 }, { month: 'Oct', amount: 78000 },
    { month: 'Nov', amount: 71000 }, { month: 'Dec', amount: 95000 },
    { month: 'Jan', amount: 89000 }, { month: 'Feb', amount: 112000 },
  ],
  'Soap 50g': [
    { month: 'Sep', amount: 18000 }, { month: 'Oct', amount: 22000 },
    { month: 'Nov', amount: 19500 }, { month: 'Dec', amount: 28000 },
    { month: 'Jan', amount: 25000 }, { month: 'Feb', amount: 32000 },
  ],
  'Shampoo 30ml': [
    { month: 'Sep', amount: 14000 }, { month: 'Oct', amount: 18000 },
    { month: 'Nov', amount: 16000 }, { month: 'Dec', amount: 21000 },
    { month: 'Jan', amount: 19500 }, { month: 'Feb', amount: 26000 },
  ],
  'Dental Kit': [
    { month: 'Sep', amount: 19000 }, { month: 'Oct', amount: 24000 },
    { month: 'Nov', amount: 22000 }, { month: 'Dec', amount: 31000 },
    { month: 'Jan', amount: 28500 }, { month: 'Feb', amount: 36000 },
  ],
  'Conditioner': [
    { month: 'Sep', amount: 11000 }, { month: 'Oct', amount: 14000 },
    { month: 'Nov', amount: 13500 }, { month: 'Dec', amount: 15000 },
    { month: 'Jan', amount: 16000 }, { month: 'Feb', amount: 18000 },
  ],
};

const purchaseMonthData = {
  all: [
    { month: 'Sep', amount: 38000 }, { month: 'Oct', amount: 47000 },
    { month: 'Nov', amount: 42000 }, { month: 'Dec', amount: 58000 },
    { month: 'Jan', amount: 53000 }, { month: 'Feb', amount: 68000 },
  ],
  'Soap Base (White)': [
    { month: 'Sep', amount: 12000 }, { month: 'Oct', amount: 15000 },
    { month: 'Nov', amount: 13500 }, { month: 'Dec', amount: 18500 },
    { month: 'Jan', amount: 17000 }, { month: 'Feb', amount: 22000 },
  ],
  'Soap Base (Transparent)': [
    { month: 'Sep', amount: 9500 }, { month: 'Oct', amount: 11000 },
    { month: 'Nov', amount: 10000 }, { month: 'Dec', amount: 14000 },
    { month: 'Jan', amount: 12500 }, { month: 'Feb', amount: 16000 },
  ],
  'Shampoo Concentrate': [
    { month: 'Sep', amount: 16500 }, { month: 'Oct', amount: 21000 },
    { month: 'Nov', amount: 18500 }, { month: 'Dec', amount: 25500 },
    { month: 'Jan', amount: 23500 }, { month: 'Feb', amount: 30000 },
  ],
};

const salesRawData = [
  { key: 1, gst_no: '27AAACM9876H1Z4', customer: 'Marriott Mumbai', product: 'Soap 50g', state_code: '27', state_name: 'Maharashtra', inv_no: 'INV-2401', orig_inv_no: 'QT-2401', inv_date: '2024-01-18', inv_value: 45430, total_tax: 6930, taxable: 38500, cgst: 3465, sgst: 3465, igst: 0 },
  { key: 2, gst_no: '07AAACT7654D1Z6', customer: 'Taj Hotels Delhi', product: 'Dental Kit', state_code: '07', state_name: 'Delhi', inv_no: 'INV-2402', orig_inv_no: 'QT-2402', inv_date: '2024-01-17', inv_value: 141600, total_tax: 21600, taxable: 120000, cgst: 0, sgst: 0, igst: 21600 },
  { key: 3, gst_no: '19AAACI5432G1Z1', customer: 'ITC Grand Kolkata', product: 'Shampoo 30ml', state_code: '19', state_name: 'West Bengal', inv_no: 'INV-2403', orig_inv_no: 'QT-2403', inv_date: '2024-01-16', inv_value: 250000, total_tax: 0, taxable: 250000, cgst: 0, sgst: 0, igst: 0 },
  { key: 4, gst_no: '29AAACH3456M1Z7', customer: 'Hyatt Chennai', product: 'Conditioner', state_code: '29', state_name: 'Karnataka', inv_no: 'INV-2404', orig_inv_no: 'QT-2404', inv_date: '2024-02-01', inv_value: 58000, total_tax: 8000, taxable: 50000, cgst: 4000, sgst: 4000, igst: 0 },
];

const purchaseRawData = [
  { key: 1, vendor_gst: '27AABCG1234F1Z5', supplier: 'ChemCo India', product: 'Soap Base (White)', hsn: '34011190', gst_rate: 18, qty: 100, unit_price: 85, state_code: '27', state_name: 'Maharashtra', inv_no: 'PUR-8821', orig_inv_no: 'INV-CHEM-101', inv_date: '2024-05-01', inv_value: 10030, total_tax: 1530, taxable: 8500, cgst: 765, sgst: 765, igst: 0 },
  { key: 2, vendor_gst: '33AABHB5678K1Z2', supplier: 'BioLife Ltd', product: 'Shampoo Concentrate', hsn: '33051010', gst_rate: 18, qty: 200, unit_price: 220, state_code: '33', state_name: 'Tamil Nadu', inv_no: 'PUR-8825', orig_inv_no: 'INV-BIO-452', inv_date: '2024-05-04', inv_value: 51920, total_tax: 7920, taxable: 44000, cgst: 3960, sgst: 3960, igst: 0 },
  { key: 3, vendor_gst: '07AABCP9012E1Z8', supplier: 'PlastiPack', product: 'Soap Base (Transparent)', hsn: '34011920', gst_rate: 18, qty: 150, unit_price: 15, state_code: '07', state_name: 'Delhi', inv_no: 'PUR-8831', orig_inv_no: 'INV-PP-203', inv_date: '2024-05-06', inv_value: 2655, total_tax: 405, taxable: 2250, cgst: 202.5, sgst: 0, igst: 202.5 },
  { key: 4, vendor_gst: '29AABCB1122A1Z3', supplier: 'BoxWorld', product: 'Soap Base (White)', hsn: '34011190', gst_rate: 18, qty: 120, unit_price: 100, state_code: '29', state_name: 'Karnataka', inv_no: 'PUR-8839', orig_inv_no: 'INV-BW-77', inv_date: '2024-05-10', inv_value: 14400, total_tax: 2400, taxable: 12000, cgst: 1200, sgst: 1200, igst: 0 },
];

// P&L monthly data — sales from products, cogs = purchase cost; salesGst/cogsGst for with-GST mode
const plMonthlyData = [
  { month: 'Sep', sales: 62000, salesGst: 11160, cogs: 38000, cogsGst: 6840, grossProfit: 24000, expenses: { rent: 3000, salary: 2500, utilities: 800, transport: 700, marketing: 500, other: 0 } },
  { month: 'Oct', sales: 78000, salesGst: 14040, cogs: 47000, cogsGst: 8460, grossProfit: 31000, expenses: { rent: 3000, salary: 3000, utilities: 900, transport: 600, marketing: 500, other: 500 } },
  { month: 'Nov', sales: 71000, salesGst: 12780, cogs: 42000, cogsGst: 7560, grossProfit: 29000, expenses: { rent: 3000, salary: 2800, utilities: 750, transport: 650, marketing: 500, other: 500 } },
  { month: 'Dec', sales: 95000, salesGst: 17100, cogs: 58000, cogsGst: 10440, grossProfit: 37000, expenses: { rent: 3000, salary: 3200, utilities: 1000, transport: 800, marketing: 500, other: 500 } },
  { month: 'Jan', sales: 89000, salesGst: 16020, cogs: 53000, cogsGst: 9540, grossProfit: 36000, expenses: { rent: 3000, salary: 3000, utilities: 950, transport: 550, marketing: 500, other: 500 } },
  { month: 'Feb', sales: 112000, salesGst: 20160, cogs: 68000, cogsGst: 12240, grossProfit: 44000, expenses: { rent: 3000, salary: 3500, utilities: 1100, transport: 900, marketing: 500, other: 1000 } },
];

const expenseCategoryConfig = [
  { key: 'rent',      label: 'Rent',           color: '#B11E6A' },
  { key: 'salary',    label: 'Salary & Wages', color: '#8a1652' },
  { key: 'utilities', label: 'Utilities',      color: '#C94F8A' },
  { key: 'transport', label: 'Transport',      color: '#D85C9E' },
  { key: 'marketing', label: 'Marketing',      color: '#e8739e' },
  { key: 'other',     label: 'Other',          color: '#6b1240' },
];

const productPLData = [
  { key: 1, product: 'Soap 50g',    sales: 144500, cogs: 89000, grossProfit: 55500, soldQty: 2890, stockQty: 450 },
  { key: 2, product: 'Shampoo 30ml', sales: 107500, cogs: 68000, grossProfit: 39500, soldQty: 3583, stockQty: 280 },
  { key: 3, product: 'Dental Kit',  sales: 161000, cogs: 95000, grossProfit: 66000, soldQty: 2300, stockQty: 120 },
  { key: 4, product: 'Conditioner', sales: 94000,  cogs: 56000, grossProfit: 38000, soldQty: 1880, stockQty: 340 },
];

// Per-product monthly P&L — expenses are proportional to product share of total sales
const plProductMonthlyData = {
  'Soap 50g': [
    { month: 'Sep', sales: 18000, cogs: 11100, grossProfit: 6900 },
    { month: 'Oct', sales: 22000, cogs: 13600, grossProfit: 8400 },
    { month: 'Nov', sales: 19500, cogs: 12000, grossProfit: 7500 },
    { month: 'Dec', sales: 28000, cogs: 17400, grossProfit: 10600 },
    { month: 'Jan', sales: 25000, cogs: 15200, grossProfit: 9800 },
    { month: 'Feb', sales: 32000, cogs: 19500, grossProfit: 12500 },
  ],
  'Shampoo 30ml': [
    { month: 'Sep', sales: 14000, cogs: 8600, grossProfit: 5400 },
    { month: 'Oct', sales: 18000, cogs: 11100, grossProfit: 6900 },
    { month: 'Nov', sales: 16000, cogs: 9800, grossProfit: 6200 },
    { month: 'Dec', sales: 21000, cogs: 13000, grossProfit: 8000 },
    { month: 'Jan', sales: 19500, cogs: 11900, grossProfit: 7600 },
    { month: 'Feb', sales: 26000, cogs: 15900, grossProfit: 10100 },
  ],
  'Dental Kit': [
    { month: 'Sep', sales: 19000, cogs: 11700, grossProfit: 7300 },
    { month: 'Oct', sales: 24000, cogs: 14800, grossProfit: 9200 },
    { month: 'Nov', sales: 22000, cogs: 13500, grossProfit: 8500 },
    { month: 'Dec', sales: 31000, cogs: 19200, grossProfit: 11800 },
    { month: 'Jan', sales: 28500, cogs: 17400, grossProfit: 11100 },
    { month: 'Feb', sales: 36000, cogs: 22000, grossProfit: 14000 },
  ],
  'Conditioner': [
    { month: 'Sep', sales: 11000, cogs: 6800, grossProfit: 4200 },
    { month: 'Oct', sales: 14000, cogs: 8600, grossProfit: 5400 },
    { month: 'Nov', sales: 13500, cogs: 8300, grossProfit: 5200 },
    { month: 'Dec', sales: 15000, cogs: 9300, grossProfit: 5700 },
    { month: 'Jan', sales: 16000, cogs: 9900, grossProfit: 6100 },
    { month: 'Feb', sales: 18000, cogs: 11100, grossProfit: 6900 },
  ],
};

// Month-wise GST ledger — output (sales) and input (purchase) with CGST/SGST/IGST breakdown
const monthlyGstData = [
  { key: 1, month: 'Sep', year: '2024', sales_taxable: 54000, sales_cgst: 3780, sales_sgst: 3780, sales_igst: 3600, sales_total_gst: 11160, pur_taxable: 33000, pur_cgst: 2340, pur_sgst: 2340, pur_igst: 2160, pur_total_gst: 6840 },
  { key: 2, month: 'Oct', year: '2024', sales_taxable: 68000, sales_cgst: 4680, sales_sgst: 4680, sales_igst: 4680, sales_total_gst: 14040, pur_taxable: 42000, pur_cgst: 2880, pur_sgst: 2880, pur_igst: 2700, pur_total_gst: 8460 },
  { key: 3, month: 'Nov', year: '2024', sales_taxable: 61500, sales_cgst: 4230, sales_sgst: 4230, sales_igst: 4320, sales_total_gst: 12780, pur_taxable: 38000, pur_cgst: 2520, pur_sgst: 2520, pur_igst: 2520, pur_total_gst: 7560 },
  { key: 4, month: 'Dec', year: '2024', sales_taxable: 83000, sales_cgst: 5700, sales_sgst: 5700, sales_igst: 5700, sales_total_gst: 17100, pur_taxable: 52000, pur_cgst: 3600, pur_sgst: 3600, pur_igst: 3240, pur_total_gst: 10440 },
  { key: 5, month: 'Jan', year: '2025', sales_taxable: 77000, sales_cgst: 5400, sales_sgst: 5400, sales_igst: 5220, sales_total_gst: 16020, pur_taxable: 47500, pur_cgst: 3240, pur_sgst: 3240, pur_igst: 3060, pur_total_gst: 9540 },
  { key: 6, month: 'Feb', year: '2025', sales_taxable: 98000, sales_cgst: 6840, sales_sgst: 6840, sales_igst: 6480, sales_total_gst: 20160, pur_taxable: 60500, pur_cgst: 4140, pur_sgst: 4140, pur_igst: 3960, pur_total_gst: 12240 },
];

const CHART_COLORS = ['#B11E6A', '#D85C9E', '#8a1652', '#C94F8A', '#e91e8c', '#f06292'];
const statusColor = { Paid: '#52c41a', Pending: '#fa8c16', 'Partially Paid': '#B11E6A', Overdue: '#ff4d4f' };

// Bill-wise P&L — per invoice gross profit calculation
const billPLData = [
  { key: 1, inv_no: 'INV-2401', date: '2024-01-18', client: 'Marriott Mumbai',   product: 'Soap 50g',    sell_taxable: 38500,  gst_collected: 6930,  sell_total: 45430,  cogs: 23700,  input_gst: 4266,  gross_profit: 14800, status: 'Partially Paid' },
  { key: 2, inv_no: 'INV-2402', date: '2024-01-17', client: 'Taj Hotels Delhi',  product: 'Dental Kit',  sell_taxable: 120000, gst_collected: 21600, sell_total: 141600, cogs: 74000,  input_gst: 13320, gross_profit: 46000, status: 'Pending' },
  { key: 3, inv_no: 'INV-2403', date: '2024-01-16', client: 'ITC Grand Kolkata', product: 'Shampoo 30ml', sell_taxable: 250000, gst_collected: 0,     sell_total: 250000, cogs: 155000, input_gst: 0,     gross_profit: 95000, status: 'Paid' },
  { key: 4, inv_no: 'INV-2404', date: '2024-02-01', client: 'Hyatt Chennai',     product: 'Conditioner', sell_taxable: 50000,  gst_collected: 8000,  sell_total: 58000,  cogs: 30900,  input_gst: 5562,  gross_profit: 19100, status: 'Partially Paid' },
  { key: 5, inv_no: 'INV-2405', date: '2024-01-15', client: 'Client Demo',       product: 'Soap 50g',    sell_taxable: 25000,  gst_collected: 4500,  sell_total: 29500,  cogs: 15400,  input_gst: 2772,  gross_profit: 9600,  status: 'Pending' },
];

// Performance data
// Sales Person performance data
const salesPersonData = [
  { key: 1, name: 'Rajan Kumar',   role: 'Senior Sales', orders: 15, revenue: 250000, target: 200000, conversion: 78, complaints: 1, avgDeal: 16667, color: '#B11E6A' },
  { key: 2, name: 'Priya Nair',    role: 'Senior Sales', orders: 12, revenue: 180000, target: 200000, conversion: 72, complaints: 2, avgDeal: 15000, color: '#C94F8A' },
  { key: 3, name: 'Vikram Singh',  role: 'Field Sales',  orders: 11, revenue: 143000, target: 150000, conversion: 70, complaints: 3, avgDeal: 13000, color: '#8a1652' },
  { key: 4, name: 'Arjun Sharma',  role: 'Junior Sales', orders: 9,  revenue: 95000,  target: 120000, conversion: 65, complaints: 0, avgDeal: 10556, color: '#D85C9E' },
  { key: 5, name: 'Sunita Patel',  role: 'Junior Sales', orders: 8,  revenue: 89500,  target: 100000, conversion: 60, complaints: 1, avgDeal: 11188, color: '#e8739e' },
];

// Month-wise revenue per salesperson
const salesPersonMonthlyData = [
  { month: 'Sep', 'Rajan Kumar': 32000, 'Priya Nair': 28000, 'Vikram Singh': 18000, 'Arjun Sharma': 10000, 'Sunita Patel': 9500 },
  { month: 'Oct', 'Rajan Kumar': 41000, 'Priya Nair': 31000, 'Vikram Singh': 22000, 'Arjun Sharma': 13000, 'Sunita Patel': 12000 },
  { month: 'Nov', 'Rajan Kumar': 37000, 'Priya Nair': 27000, 'Vikram Singh': 20000, 'Arjun Sharma': 11500, 'Sunita Patel': 10500 },
  { month: 'Dec', 'Rajan Kumar': 52000, 'Priya Nair': 38000, 'Vikram Singh': 29000, 'Arjun Sharma': 17000, 'Sunita Patel': 15000 },
  { month: 'Jan', 'Rajan Kumar': 46000, 'Priya Nair': 33000, 'Vikram Singh': 26000, 'Arjun Sharma': 15000, 'Sunita Patel': 14000 },
  { month: 'Feb', 'Rajan Kumar': 58000, 'Priya Nair': 42000, 'Vikram Singh': 35000, 'Arjun Sharma': 19500, 'Sunita Patel': 18000 },
];

const exportToExcel = (headers, rows, filename) => {
  const bom = '﻿';
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#333' : '#f0f0f0';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tickColor = isDark ? '#aaa' : '#666';

  const [purchaseReportSearch, setPurchaseReportSearch] = useState('');
  const [salesReportSearch, setSalesReportSearch] = useState('');
  const [salesProductFilter, setSalesProductFilter] = useState(null);
  const [purchaseProductFilter, setPurchaseProductFilter] = useState(null);
  const [salesDateRange, setSalesDateRange] = useState(null);
  const [purchaseDateRange, setPurchaseDateRange] = useState(null);
  const [purchaseGstTab, setPurchaseGstTab] = useState('with_gst');

  // Auditor Tax Report state
  const [auditorSubTab, setAuditorSubTab] = useState('sales');
  const [auditorGstFilter, setAuditorGstFilter] = useState('all');
  const [auditorSearch, setAuditorSearch] = useState('');

  // Monthly GST Report state
  const [gstMonthFilter, setGstMonthFilter] = useState('all');
  const [gstViewMode, setGstViewMode] = useState('combined');

  // P&L state
  const [plSelectedMonth, setPlSelectedMonth] = useState('all');
  const [plDateRange, setPlDateRange] = useState(null);
  const [plSelectedExpenses, setPlSelectedExpenses] = useState(['rent', 'salary', 'utilities', 'transport', 'marketing', 'other']);
  const [plProductFilter, setPlProductFilter] = useState(null);
  const [plGstMode, setPlGstMode] = useState('excl');

  // Bill-wise P&L state
  const [billPlSearch, setBillPlSearch] = useState('');
  const [billPlProductFilter, setBillPlProductFilter] = useState(null);

  // Performance state
  const [perfTab, setPerfTab] = useState('leaderboard');

  const salesChartData = salesProductFilter ? (salesMonthData[salesProductFilter] || salesMonthData.all) : salesMonthData.all;
  const purchaseChartData = purchaseProductFilter ? (purchaseMonthData[purchaseProductFilter] || purchaseMonthData.all) : purchaseMonthData.all;

  const filteredSalesData = salesRawData.filter(r => {
    const q = salesReportSearch.toLowerCase();
    const matchSearch = !q || (r.customer || '').toLowerCase().includes(q) || (r.inv_no || '').toLowerCase().includes(q) || (r.product || '').toLowerCase().includes(q);
    const matchProduct = !salesProductFilter || r.product === salesProductFilter;
    return matchSearch && matchProduct;
  });

  const filteredPurchaseData = purchaseRawData.filter(r => {
    const q = purchaseReportSearch.toLowerCase();
    const matchSearch = !q || (r.supplier || '').toLowerCase().includes(q) || (r.inv_no || '').toLowerCase().includes(q) || (r.product || '').toLowerCase().includes(q);
    const matchProduct = !purchaseProductFilter || r.product === purchaseProductFilter;
    return matchSearch && matchProduct;
  });

  const salesTotal = filteredSalesData.reduce((s, r) => s + r.inv_value, 0);
  const purchaseTotal = filteredPurchaseData.reduce((s, r) => s + r.inv_value, 0);

  // P&L computed values — product-aware
  const plBaseData = (() => {
    if (plProductFilter && plProductMonthlyData[plProductFilter]) {
      // Attach proportional expenses from the all-products monthly row
      return plProductMonthlyData[plProductFilter].map(pd => {
        const allRow = plMonthlyData.find(d => d.month === pd.month);
        if (!allRow) return { ...pd, expenses: { rent: 0, salary: 0, utilities: 0, transport: 0, marketing: 0, other: 0 } };
        const ratio = allRow.sales > 0 ? pd.sales / allRow.sales : 0;
        const expenses = Object.fromEntries(
          Object.entries(allRow.expenses).map(([k, v]) => [k, Math.round(v * ratio)])
        );
        return { ...pd, expenses };
      });
    }
    return plMonthlyData;
  })();

  const plFilteredData = plSelectedMonth === 'all' ? plBaseData : plBaseData.filter(d => d.month === plSelectedMonth);

  const totalSalesExcl = plFilteredData.reduce((s, d) => s + d.sales, 0);
  const totalSalesGst  = plFilteredData.reduce((s, d) => s + (d.salesGst || 0), 0);
  const totalCogsExcl  = plFilteredData.reduce((s, d) => s + d.cogs, 0);
  const totalCogsGst   = plFilteredData.reduce((s, d) => s + (d.cogsGst || 0), 0);
  const totalGrossProfitExcl = plFilteredData.reduce((s, d) => s + d.grossProfit, 0);

  const totalSales      = plGstMode === 'incl' ? totalSalesExcl + totalSalesGst : totalSalesExcl;
  const totalCogs       = plGstMode === 'incl' ? totalCogsExcl + totalCogsGst   : totalCogsExcl;
  const totalGrossProfit = plGstMode === 'incl' ? totalSales - totalCogs         : totalGrossProfitExcl;
  const totalExpenses = plFilteredData.reduce((s, d) =>
    s + plSelectedExpenses.reduce((sum, cat) => sum + (d.expenses[cat] || 0), 0), 0
  );
  const totalNetProfit = totalGrossProfit - totalExpenses;
  const netGstPayable  = totalSalesGst - totalCogsGst;

  const plChartData = plFilteredData.map(d => ({
    month: d.month,
    sales: d.sales,
    grossProfit: d.grossProfit,
    totalExpenses: plSelectedExpenses.reduce((sum, cat) => sum + (d.expenses[cat] || 0), 0),
    netProfit: d.grossProfit - plSelectedExpenses.reduce((sum, cat) => sum + (d.expenses[cat] || 0), 0),
  }));

  const expensePieData = expenseCategoryConfig
    .filter(c => plSelectedExpenses.includes(c.key))
    .map(c => ({
      name: c.label,
      value: plFilteredData.reduce((sum, d) => sum + (d.expenses[c.key] || 0), 0),
      color: c.color,
    }))
    .filter(d => d.value > 0);

  // Product-specific monthly breakdown (for detail view when a product is selected)
  const selectedProductMonthly = plProductFilter
    ? plBaseData.map(d => ({ ...d, netProfit: d.grossProfit - plSelectedExpenses.reduce((s, cat) => s + (d.expenses[cat] || 0), 0) }))
    : null;

  // Product distribution for sales pie
  const salesByProduct = Object.entries(
    filteredSalesData.reduce((acc, r) => {
      acc[r.product] = (acc[r.product] || 0) + r.inv_value;
      return acc;
    }, {})
  ).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  // Supplier distribution for purchase pie
  const purchaseBySupplier = Object.entries(
    filteredPurchaseData.reduce((acc, r) => {
      acc[r.supplier] = (acc[r.supplier] || 0) + r.inv_value;
      return acc;
    }, {})
  ).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Reports & Analytics" items={[{ label: 'Reports & Analytics' }]} style={{ marginBottom: 0 }} />
        <Space wrap>
          <div style={{ display: 'flex', alignItems: 'center', background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5', padding: '4px 8px', borderRadius: 8, border: `1px solid ${isDark ? '#333' : '#f0f0f0'}` }}>
            <DatePicker.RangePicker bordered={false} style={{ width: 260, background: 'transparent' }} />
          </div>
          <Select defaultValue="month" style={{ width: 120, borderRadius: 8 }}>
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
            <Option value="quarter">Quarter</Option>
            <Option value="year">Year</Option>
          </Select>
          <Button icon={<FileExcelOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>Excel</Button>
          <Button icon={<FilePdfOutlined />} style={{ color: '#8a1652', borderColor: '#8a165244' }}>PDF</Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="sales_report"
        items={[
          /* ─────────── SALES REPORT ─────────── */
          {
            key: 'sales_report',
            label: 'Sales Report',
            children: (
              <div>
                <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                  <Space wrap style={{ width: '100%' }}>
                    <FilterOutlined style={{ color: '#B11E6A' }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Filter by:</Text>
                    <Select allowClear placeholder="Select Product" value={salesProductFilter} onChange={setSalesProductFilter} style={{ width: 200 }}>
                      {['Soap 50g', 'Shampoo 30ml', 'Dental Kit', 'Conditioner'].map(p => (
                        <Option key={p} value={p}>{p}</Option>
                      ))}
                    </Select>
                    <DatePicker.RangePicker style={{ width: 260 }} onChange={setSalesDateRange} />
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search customer, invoice..." allowClear value={salesReportSearch} onChange={(e) => setSalesReportSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      style={{ color: '#52c41a', borderColor: '#52c41a44' }}
                      onClick={() => {
                        const headers = ['GSTIN/UIN', 'Customer Name', 'State Code', 'Place of Supply', 'Invoice No', 'Original Invoice No', 'Invoice Date', 'Invoice Value', 'Taxable Value', 'Total Tax (%)', 'Total Tax Amount', 'Central Tax (CGST)', 'State/UT Tax (SGST)', 'Integrated Tax (IGST)', 'Cess'];
                        const rows = filteredSalesData.map(r => [
                          r.gst_no, r.customer, r.state_code, r.state_name,
                          r.inv_no, r.orig_inv_no, r.inv_date, r.inv_value,
                          r.taxable, r.total_tax > 0 ? ((r.total_tax / r.taxable) * 100).toFixed(0) + '%' : '0%',
                          r.total_tax, r.cgst, r.sgst, r.igst, 0,
                        ]);
                        exportToExcel(headers, rows, 'Auditor_Tax_Report.csv');
                      }}
                    >Excel</Button>
                    <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                  </Space>
                </Card>

                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} lg={16}>
                    <Card
                      title={
                        <Space>
                          <Text strong style={{ color: textColor }}>Month-wise Sales Revenue</Text>
                          {salesProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{salesProductFilter}</Tag>}
                        </Space>
                      }
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}
                    >
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={salesChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                          <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                          <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                          <Bar dataKey="amount" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Sales Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }} styles={{ body: { padding: '16px' } }}>
                      <Text strong style={{ color: textColor, display: 'block', marginBottom: 12 }}>Sales by Product</Text>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={salesByProduct} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={false}>
                            {salesByProduct.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                        {salesByProduct.map(e => (
                          <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space size={6}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                              <Text style={{ fontSize: 11, color: textColor }}>{e.name}</Text>
                            </Space>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>₹{e.value.toLocaleString()}</Text>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Title level={5} style={{ color: textColor, margin: 0 }}>Sales Report (GST Format)</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>{filteredSalesData.length} records • Total: <Text strong style={{ color: '#B11E6A' }}>₹{salesTotal.toLocaleString()}</Text></Text>
                  </div>
                  <Table
                    size="small"
                    scroll={{ x: 1400 }}
                    dataSource={filteredSalesData}
                    columns={[
                      { title: 'GST No', dataIndex: 'gst_no', key: 'gst_no', width: 160, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Customer Name', dataIndex: 'customer', key: 'customer', width: 150, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Product', dataIndex: 'product', key: 'product', width: 140, render: v => <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165233', borderRadius: 20 }}>{v}</Tag> },
                      { title: 'State Code', dataIndex: 'state_code', key: 'state_code', width: 90, align: 'center' },
                      { title: 'State Name', dataIndex: 'state_name', key: 'state_name', width: 130 },
                      { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                      { title: 'Original Inv No', dataIndex: 'orig_inv_no', key: 'orig_inv_no', width: 130, render: v => <Text style={{ color: '#7c3aed' }}>{v}</Text> },
                      { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110 },
                      { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, render: v => <Text strong>₹{v.toLocaleString()}</Text> },
                      { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 100, render: v => <Text style={{ color: '#fa8c16' }}>₹{v.toLocaleString()}</Text> },
                      { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text>₹{v.toLocaleString()}</Text> },
                      { title: 'CGST', dataIndex: 'cgst', key: 'cgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                      { title: 'SGST', dataIndex: 'sgst', key: 'sgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                      { title: 'IGST', dataIndex: 'igst', key: 'igst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    ]}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </div>
            ),
          },

          /* ─────────── PURCHASE REPORT ─────────── */
          {
            key: 'purchase_report',
            label: 'Purchase Report',
            children: (
              <div>
                <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                  <Space wrap style={{ width: '100%' }}>
                    <FilterOutlined style={{ color: '#B11E6A' }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Filter by:</Text>
                    <Select allowClear placeholder="Select Product" value={purchaseProductFilter} onChange={setPurchaseProductFilter} style={{ width: 200 }}>
                      {['Soap Base (White)', 'Soap Base (Transparent)', 'Shampoo Concentrate'].map(p => (
                        <Option key={p} value={p}>{p}</Option>
                      ))}
                    </Select>
                    <DatePicker.RangePicker style={{ width: 260 }} onChange={setPurchaseDateRange} />
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search supplier, invoice..." allowClear value={purchaseReportSearch} onChange={(e) => setPurchaseReportSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                    <Button
                      icon={<FileExcelOutlined />}
                      style={{ color: '#52c41a', borderColor: '#52c41a44' }}
                      onClick={() => {
                        const headers = ['Vendor GSTIN', 'Supplier Name', 'Product', 'HSN Code', 'GST Rate (%)', 'Qty', 'Unit Price', 'State Code', 'Place of Supply', 'Invoice No', 'Original Invoice No', 'Invoice Date', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Invoice Value'];
                        const rows = filteredPurchaseData.map(r => [
                          r.vendor_gst, r.supplier, r.product, r.hsn, r.gst_rate,
                          r.qty, r.unit_price, r.state_code, r.state_name,
                          r.inv_no, r.orig_inv_no, r.inv_date,
                          r.taxable, r.cgst, r.sgst, r.igst, r.total_tax, r.inv_value,
                        ]);
                        exportToExcel(headers, rows, 'Purchase_GST_Report.csv');
                      }}
                    >Excel</Button>
                    <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                  </Space>
                </Card>

                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} lg={16}>
                    <Card
                      title={
                        <Space>
                          <Text strong style={{ color: textColor }}>Month-wise Purchase Spending</Text>
                          {purchaseProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{purchaseProductFilter}</Tag>}
                        </Space>
                      }
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}
                    >
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={purchaseChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                          <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                          <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Amount Spent']} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                          <Bar dataKey="amount" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Purchase Amount" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }} styles={{ body: { padding: '16px' } }}>
                      <Text strong style={{ color: textColor, display: 'block', marginBottom: 12 }}>Purchase by Supplier</Text>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={purchaseBySupplier} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={false}>
                            {purchaseBySupplier.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                        {purchaseBySupplier.map(e => (
                          <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space size={6}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                              <Text style={{ fontSize: 11, color: textColor }}>{e.name}</Text>
                            </Space>
                            <Text style={{ fontSize: 11, fontWeight: 600 }}>₹{e.value.toLocaleString()}</Text>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* GST / Without GST sub-tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {[['with_gst', 'With GST'], ['without_gst', 'Without GST']].map(([k, lbl]) => (
                    <button key={k} type="button" onClick={() => setPurchaseGstTab(k)} style={{
                      padding: '6px 20px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                      border: `1.5px solid ${purchaseGstTab === k ? '#B11E6A' : borderColor}`,
                      background: purchaseGstTab === k ? '#B11E6A18' : 'transparent',
                      color: purchaseGstTab === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
                    }}>{lbl}</button>
                  ))}
                </div>

                {purchaseGstTab === 'with_gst' && (() => {
                  const gstData = filteredPurchaseData.filter(r => r.total_tax > 0);
                  const productGstSummary = Object.values(
                    gstData.reduce((acc, r) => {
                      if (!acc[r.product]) acc[r.product] = { product: r.product, hsn: r.hsn, gst_rate: r.gst_rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0, inv_value: 0, count: 0 };
                      acc[r.product].taxable += r.taxable;
                      acc[r.product].cgst += r.cgst;
                      acc[r.product].sgst += r.sgst;
                      acc[r.product].igst += r.igst;
                      acc[r.product].total_tax += r.total_tax;
                      acc[r.product].inv_value += r.inv_value;
                      acc[r.product].count += 1;
                      return acc;
                    }, {})
                  );
                  return (
                    <>
                      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                        {[
                          { label: 'Total Taxable Value', value: gstData.reduce((s, r) => s + r.taxable, 0), color: '#B11E6A' },
                          { label: 'Total CGST Paid', value: gstData.reduce((s, r) => s + r.cgst, 0), color: '#fa8c16' },
                          { label: 'Total SGST Paid', value: gstData.reduce((s, r) => s + r.sgst, 0), color: '#7c3aed' },
                          { label: 'Total Tax (Input Credit)', value: gstData.reduce((s, r) => s + r.total_tax, 0), color: '#52c41a' },
                        ].map((s, i) => (
                          <Col xs={12} sm={6} key={s.label}>
                            <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                              <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>₹{s.value.toLocaleString()}</div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 14 }} styles={{ body: { padding: 16 } }}>
                        <Title level={5} style={{ color: textColor, margin: '0 0 12px 0' }}>Product-wise GST Summary</Title>
                        <Table
                          size="small"
                          scroll={{ x: 900 }}
                          dataSource={productGstSummary.map((r, i) => ({ ...r, key: i }))}
                          pagination={false}
                          columns={[
                            { title: 'Product', dataIndex: 'product', key: 'product', width: 180, render: v => <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20 }}>{v}</Tag> },
                            { title: 'HSN Code', dataIndex: 'hsn', key: 'hsn', width: 100, align: 'center', render: v => <Text style={{ fontFamily: 'monospace', color: '#7c3aed', fontSize: 12 }}>{v}</Text> },
                            { title: 'GST Rate', dataIndex: 'gst_rate', key: 'gst_rate', width: 90, align: 'center', render: v => <Tag style={{ background: '#fa8c1615', color: '#fa8c16', border: '1px solid #fa8c1633', borderRadius: 20, fontSize: 11 }}>{v}%</Tag> },
                            { title: 'Invoices', dataIndex: 'count', key: 'count', width: 80, align: 'center', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 130, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'CGST', dataIndex: 'cgst', key: 'cgst', width: 100, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'SGST', dataIndex: 'sgst', key: 'sgst', width: 100, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'IGST', dataIndex: 'igst', key: 'igst', width: 100, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 110, render: v => <Text strong style={{ color: '#52c41a', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, fixed: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                          ]}
                          summary={(data) => {
                            const t = (k) => data.reduce((s, r) => s + r[k], 0);
                            return (
                              <Table.Summary.Row style={{ fontWeight: 700, background: isDark ? '#2a1a2e' : '#fdf5fa' }}>
                                <Table.Summary.Cell colSpan={4}><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{t('taxable').toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#fa8c16', fontSize: 12 }}>₹{t('cgst').toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{t('sgst').toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#1890ff', fontSize: 12 }}>₹{t('igst').toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#52c41a', fontSize: 12 }}>₹{t('total_tax').toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{t('inv_value').toLocaleString()}</Text></Table.Summary.Cell>
                              </Table.Summary.Row>
                            );
                          }}
                        />
                      </Card>
                      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <Title level={5} style={{ color: textColor, margin: 0 }}>Purchase Report — With GST (Invoice-wise)</Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>{gstData.length} records</Text>
                        </div>
                        <Table
                          size="small"
                          scroll={{ x: 1800 }}
                          dataSource={gstData}
                          columns={[
                            { title: 'Vendor GSTIN', dataIndex: 'vendor_gst', key: 'vendor_gst', width: 160, fixed: 'left', render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'Product', dataIndex: 'product', key: 'product', width: 160, render: v => <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20 }}>{v}</Tag> },
                            { title: 'HSN', dataIndex: 'hsn', key: 'hsn', width: 100, align: 'center', render: v => <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#7c3aed' }}>{v}</Text> },
                            { title: 'GST%', dataIndex: 'gst_rate', key: 'gst_rate', width: 70, align: 'center', render: v => <Tag style={{ background: '#fa8c1615', color: '#fa8c16', border: '1px solid #fa8c1633', borderRadius: 20, fontSize: 11 }}>{v}%</Tag> },
                            { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                            { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110 },
                            { title: 'State', dataIndex: 'state_name', key: 'state_name', width: 120 },
                            { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'CGST', dataIndex: 'cgst', key: 'cgst', width: 90, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'SGST', dataIndex: 'sgst', key: 'sgst', width: 90, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'IGST', dataIndex: 'igst', key: 'igst', width: 90, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 100, render: v => <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, fixed: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                          ]}
                          pagination={{ pageSize: 10 }}
                        />
                      </Card>
                    </>
                  );
                })()}

                {purchaseGstTab === 'without_gst' && (() => {
                  const noGstData = filteredPurchaseData.filter(r => r.total_tax === 0);
                  return (
                    <>
                      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                        {[
                          { label: 'GST-Exempt Invoices', value: noGstData.length, color: '#B11E6A', isCount: true },
                          { label: 'Total Invoice Value', value: noGstData.reduce((s, r) => s + r.inv_value, 0), color: '#8a1652' },
                          { label: 'Total Taxable Value', value: noGstData.reduce((s, r) => s + r.taxable, 0), color: '#C94F8A' },
                          { label: 'GST Savings', value: noGstData.reduce((s, r) => s + r.taxable, 0) * 0.18, color: '#52c41a' },
                        ].map((s, i) => (
                          <Col xs={12} sm={6} key={s.label}>
                            <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                              <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.isCount ? s.value : `₹${s.value.toLocaleString()}`}</div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <Title level={5} style={{ color: textColor, margin: 0 }}>Purchase Report — Without GST (Exempt/Zero-rated)</Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>{noGstData.length} records</Text>
                        </div>
                        {noGstData.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 13 }}>No GST-exempt purchases found</div>
                        ) : (
                          <Table
                            size="small"
                            scroll={{ x: 1400 }}
                            dataSource={noGstData}
                            columns={[
                              { title: 'Vendor GSTIN', dataIndex: 'vendor_gst', key: 'vendor_gst', width: 160, fixed: 'left', render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                              { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                              { title: 'Product', dataIndex: 'product', key: 'product', width: 160, render: v => <Tag style={{ background: '#52c41a15', color: '#52c41a', border: '1px solid #52c41a33', borderRadius: 20 }}>{v}</Tag> },
                              { title: 'HSN', dataIndex: 'hsn', key: 'hsn', width: 100, align: 'center', render: v => <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#7c3aed' }}>{v}</Text> },
                              { title: 'GST%', dataIndex: 'gst_rate', key: 'gst_rate', width: 70, align: 'center', render: v => <Tag style={{ background: '#52c41a15', color: '#52c41a', border: '1px solid #52c41a33', borderRadius: 20, fontSize: 11 }}>Exempt</Tag> },
                              { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70, align: 'center', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                              { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', width: 100, render: v => <Text style={{ fontSize: 12 }}>₹{v?.toLocaleString()}</Text> },
                              { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                              { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110 },
                              { title: 'State', dataIndex: 'state_name', key: 'state_name', width: 120 },
                              { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                              { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, fixed: 'right', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            ]}
                            pagination={{ pageSize: 10 }}
                          />
                        )}
                      </Card>
                    </>
                  );
                })()}
              </div>
            ),
          },

          /* ─────────── PROFIT & LOSS ─────────── */
          {
            key: 'pl',
            label: 'Profit & Loss',
            children: (
              <div>
                {/* Filter Bar */}
                <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <Space wrap>
                      <FilterOutlined style={{ color: '#B11E6A' }} />
                      <Select
                        allowClear
                        placeholder="All Products"
                        value={plProductFilter}
                        onChange={v => { setPlProductFilter(v || null); }}
                        style={{ width: 160 }}
                      >
                        {['Soap 50g', 'Shampoo 30ml', 'Dental Kit', 'Conditioner'].map(p => (
                          <Option key={p} value={p}>{p}</Option>
                        ))}
                      </Select>
                      <Select value={plSelectedMonth} onChange={setPlSelectedMonth} style={{ width: 140 }}>
                        <Option value="all">All Months</Option>
                        {['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'].map(m => <Option key={m} value={m}>{m}</Option>)}
                      </Select>
                      <DatePicker.RangePicker onChange={setPlDateRange} style={{ width: 250 }} />
                      {(plProductFilter || plSelectedMonth !== 'all') && (
                        <Button
                          size="small"
                          onClick={() => { setPlProductFilter(null); setPlSelectedMonth('all'); setPlDateRange(null); }}
                          style={{ color: '#ff4d4f', borderColor: '#ff4d4f44', borderRadius: 20, fontSize: 12 }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </Space>
                    <Space>
                      <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
                      <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                      <Button icon={<DownloadOutlined />} type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Download Report</Button>
                    </Space>
                  </div>
                  {(plProductFilter || plSelectedMonth !== 'all') && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, color: '#888' }}>Active filters:</Text>
                      {plProductFilter && <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20 }}>{plProductFilter}</Tag>}
                      {plSelectedMonth !== 'all' && <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165233', borderRadius: 20 }}>{plSelectedMonth}</Tag>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>GST Mode:</Text>
                    {[{ key: 'excl', label: 'Excl. GST' }, { key: 'incl', label: 'Incl. GST' }].map(m => (
                      <div
                        key={m.key}
                        onClick={() => setPlGstMode(m.key)}
                        style={{
                          padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                          border: `1.5px solid ${plGstMode === m.key ? '#B11E6A' : borderColor}`,
                          background: plGstMode === m.key ? '#B11E6A18' : 'transparent',
                          color: plGstMode === m.key ? '#B11E6A' : isDark ? '#aaa' : '#666',
                        }}
                      >{m.label}</div>
                    ))}
                    {plGstMode === 'incl' && (
                      <Tag style={{ background: '#fa8c1615', color: '#fa8c16', border: '1px solid #fa8c1633', borderRadius: 20, fontSize: 11 }}>
                        Shows gross amounts incl. GST
                      </Tag>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>Deduct Expenses:</Text>
                    {expenseCategoryConfig.map(cat => {
                      const isSelected = plSelectedExpenses.includes(cat.key);
                      return (
                        <div
                          key={cat.key}
                          onClick={() => setPlSelectedExpenses(prev =>
                            isSelected ? prev.filter(k => k !== cat.key) : [...prev, cat.key]
                          )}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            cursor: 'pointer',
                            border: `1.5px solid ${isSelected ? cat.color : borderColor}`,
                            background: isSelected ? `${cat.color}18` : 'transparent',
                            color: isSelected ? cat.color : isDark ? '#aaa' : '#666',
                            fontSize: 12,
                            fontWeight: 600,
                            transition: 'all 0.15s',
                          }}
                        >
                          {cat.label}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Summary Cards */}
                <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                  {[
                    { label: 'Total Sales',   value: totalSales,       color: '#B11E6A', sub: 'Revenue from products' },
                    { label: 'Cost of Goods', value: totalCogs,        color: '#8a1652', sub: 'Purchase cost (COGS)' },
                    { label: 'Gross Profit',  value: totalGrossProfit, color: '#C94F8A', sub: `Margin: ${totalSales ? ((totalGrossProfit / totalSales) * 100).toFixed(1) : 0}%` },
                    { label: 'Net Profit',    value: totalNetProfit,   color: '#6b1240', sub: `After ₹${totalExpenses.toLocaleString()} expenses` },
                  ].map((s, i) => (
                    <Col xs={12} sm={6} key={s.label}>
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${s.color}22 0%,${s.color}08 100%)`, border: `1px solid ${s.color}22` }} styles={{ body: { padding: '14px 16px' } }}>
                          <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>₹{s.value.toLocaleString()}</div>
                          <Text style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</Text>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>

                {/* Monthly P&L Bar Chart + Expense Pie */}
                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} lg={16}>
                    <Card
                      title={
                        <Space>
                          <Text strong style={{ color: textColor }}>Monthly Gross Profit vs Net Profit</Text>
                          {plProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{plProductFilter}</Tag>}
                        </Space>
                      }
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}
                    >
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={plChartData} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                          <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                          <Tooltip formatter={(v, name) => [`₹${v.toLocaleString()}`, name]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                          <Legend />
                          <Bar dataKey="grossProfit"   fill="#B11E6A" name="Gross Profit" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="totalExpenses" fill="#C94F8A" name="Expenses"     radius={[4, 4, 0, 0]} />
                          <Bar dataKey="netProfit"     fill="#6b1240" name="Net Profit"   radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card
                      title={<Text strong style={{ color: textColor }}>Expense Breakdown</Text>}
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}
                    >
                      {expensePieData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                                {expensePieData.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            {expensePieData.map(e => (
                              <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space size={6}>
                                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: e.color }} />
                                  <Text style={{ fontSize: 12, color: textColor }}>{e.name}</Text>
                                </Space>
                                <Text style={{ fontSize: 12, fontWeight: 600 }}>₹{e.value.toLocaleString()}</Text>
                              </div>
                            ))}
                            <Divider style={{ margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, fontWeight: 700 }}>Total</Text>
                              <Text style={{ fontSize: 12, fontWeight: 700, color: '#B11E6A' }}>₹{totalExpenses.toLocaleString()}</Text>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 13 }}>No expense categories selected</div>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* P&L Statement + Monthly Trend Line */}
                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          <Text strong style={{ color: textColor }}>Profit & Loss Statement</Text>
                          {plProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{plProductFilter}</Tag>}
                        </Space>
                      }
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {plGstMode === 'incl' ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <Text>Gross Revenue (Incl. GST)</Text>
                              <Text strong style={{ color: '#B11E6A' }}>₹{totalSales.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 14 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>  Taxable Sales</Text>
                              <Text style={{ fontSize: 12 }}>₹{totalSalesExcl.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 14 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>  GST Collected</Text>
                              <Text style={{ fontSize: 12, color: '#fa8c16' }}>₹{totalSalesGst.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <Text>Gross Purchase Cost (Incl. GST)</Text>
                              <Text strong style={{ color: '#8a1652' }}>- ₹{totalCogs.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 14 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>  Taxable COGS</Text>
                              <Text style={{ fontSize: 12 }}>₹{totalCogsExcl.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 14 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>  Input Tax Credit</Text>
                              <Text style={{ fontSize: 12, color: '#52c41a' }}>- ₹{totalCogsGst.toLocaleString()}</Text>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <Text>Total Sales Revenue</Text>
                              <Text strong style={{ color: '#B11E6A' }}>₹{totalSales.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                              <Text>Cost of Goods Sold (COGS)</Text>
                              <Text strong style={{ color: '#8a1652' }}>- ₹{totalCogs.toLocaleString()}</Text>
                            </div>
                          </>
                        )}
                        <Divider style={{ margin: '2px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#B11E6A10', borderRadius: 8, border: '1px solid #B11E6A33' }}>
                          <Text strong style={{ fontSize: 14 }}>Gross Profit</Text>
                          <Text strong style={{ color: '#B11E6A', fontSize: 15 }}>₹{totalGrossProfit.toLocaleString()}</Text>
                        </div>
                        <Text style={{ fontSize: 11, color: '#aaa', paddingLeft: 2 }}>Less: Operating Expenses</Text>
                        {expenseCategoryConfig.filter(c => plSelectedExpenses.includes(c.key)).map(cat => {
                          const catTotal = plFilteredData.reduce((sum, d) => sum + (d.expenses[cat.key] || 0), 0);
                          return catTotal > 0 ? (
                            <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 4 }}>
                              <Space size={6}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color }} />
                                <Text type="secondary" style={{ fontSize: 13 }}>{cat.label}</Text>
                              </Space>
                              <Text style={{ color: '#8a1652', fontSize: 13 }}>- ₹{catTotal.toLocaleString()}</Text>
                            </div>
                          ) : null;
                        })}
                        <Divider style={{ margin: '2px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#6b124012', borderRadius: 10, border: '2px solid #6b124044' }}>
                          <Title level={4} style={{ margin: 0, color: '#6b1240' }}>Net Profit</Title>
                          <Title level={4} style={{ margin: 0, color: '#6b1240' }}>₹{totalNetProfit.toLocaleString()}</Title>
                        </div>
                        {totalSales > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 2px' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Net Profit Margin</Text>
                            <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontWeight: 700 }}>
                              {((totalNetProfit / (plGstMode === 'incl' ? totalSalesExcl : totalSales)) * 100).toFixed(1)}%
                            </Tag>
                          </div>
                        )}
                        {plGstMode === 'incl' && netGstPayable > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#fa8c1610', border: '1px solid #fa8c1633', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: '#fa8c16', fontWeight: 600 }}>Net GST Payable (to Govt.)</Text>
                            <Text style={{ fontSize: 12, color: '#fa8c16', fontWeight: 700 }}>₹{netGstPayable.toLocaleString()}</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          <Text strong style={{ color: textColor }}>Monthly Profit Trend</Text>
                          {plProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{plProductFilter}</Tag>}
                        </Space>
                      }
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}
                    >
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={plChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                          <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                          <Tooltip formatter={(v, name) => [`₹${v.toLocaleString()}`, name]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                          <Legend />
                          <Line type="monotone" dataKey="grossProfit"   stroke="#B11E6A" strokeWidth={2.5} dot={{ fill: '#B11E6A', r: 4 }} name="Gross Profit" />
                          <Line type="monotone" dataKey="netProfit"     stroke="#6b1240" strokeWidth={2.5} dot={{ fill: '#6b1240', r: 4 }} name="Net Profit" />
                          <Line type="monotone" dataKey="totalExpenses" stroke="#C94F8A" strokeWidth={2}   strokeDasharray="5 5" dot={{ fill: '#C94F8A', r: 3 }} name="Expenses" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>

                {/* Product-wise P&L */}
                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Space>
                        <Text strong style={{ color: textColor }}>
                          {plProductFilter ? `${plProductFilter} — Monthly P&L Breakdown` : 'Product-wise Profit & Loss'}
                        </Text>
                        {plProductFilter && <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{plProductFilter}</Tag>}
                      </Space>
                      <Button icon={<DownloadOutlined />} size="small" style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>Download</Button>
                    </div>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 14 }}
                  styles={{ body: { padding: '0 16px 16px' } }}
                >
                  {plProductFilter && selectedProductMonthly ? (
                    /* ── Single-product monthly detail ── */
                    <Row gutter={[14, 14]} style={{ paddingTop: 4 }}>
                      <Col xs={24} lg={16}>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={selectedProductMonthly} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v, n) => [`₹${v.toLocaleString()}`, n]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                            <Legend />
                            <Bar dataKey="sales"       fill="#D85C9E" name="Sales"        radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cogs"        fill="#8a1652" name="COGS"         radius={[4, 4, 0, 0]} />
                            <Bar dataKey="grossProfit" fill="#B11E6A" name="Gross Profit" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="netProfit"   fill="#6b1240" name="Net Profit"   radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Col>
                      <Col xs={24} lg={8}>
                        <Table
                          size="small"
                          dataSource={selectedProductMonthly}
                          pagination={false}
                          rowKey="month"
                          columns={[
                            { title: 'Month', dataIndex: 'month', key: 'month', render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                            { title: 'Sales',    dataIndex: 'sales',       key: 'sales',       render: v => <Text style={{ fontSize: 12, color: '#D85C9E', fontWeight: 600 }}>₹{(v / 1000).toFixed(1)}K</Text> },
                            { title: 'Gross P.', dataIndex: 'grossProfit', key: 'grossProfit', render: v => <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 700 }}>₹{(v / 1000).toFixed(1)}K</Text> },
                            { title: 'Net P.',   dataIndex: 'netProfit',   key: 'netProfit',   render: v => <Text style={{ fontSize: 12, color: '#6b1240',  fontWeight: 700 }}>₹{(v / 1000).toFixed(1)}K</Text> },
                          ]}
                          summary={(data) => {
                            const tS = data.reduce((s, r) => s + r.sales, 0);
                            const tG = data.reduce((s, r) => s + r.grossProfit, 0);
                            const tN = data.reduce((s, r) => s + r.netProfit, 0);
                            return (
                              <Table.Summary.Row>
                                <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#D85C9E', fontSize: 12 }}>₹{(tS / 1000).toFixed(1)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{(tG / 1000).toFixed(1)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#6b1240',  fontSize: 12 }}>₹{(tN / 1000).toFixed(1)}K</Text></Table.Summary.Cell>
                              </Table.Summary.Row>
                            );
                          }}
                        />
                      </Col>
                    </Row>
                  ) : (
                    /* ── All-products comparison ── */
                    <Row gutter={[14, 14]} style={{ paddingTop: 4 }}>
                      <Col xs={24} lg={14}>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={productPLData} layout="vertical" barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                            <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                            <YAxis type="category" dataKey="product" tick={{ fill: tickColor, fontSize: 11 }} width={90} />
                            <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                            <Legend />
                            <Bar dataKey="sales"       fill="#D85C9E" name="Sales"        radius={[0, 4, 4, 0]} />
                            <Bar dataKey="cogs"        fill="#8a1652" name="COGS"         radius={[0, 4, 4, 0]} />
                            <Bar dataKey="grossProfit" fill="#B11E6A" name="Gross Profit" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Col>
                      <Col xs={24} lg={10}>
                        <Table
                          size="small"
                          dataSource={productPLData}
                          pagination={false}
                          rowClassName={(r) => r.product === plProductFilter ? 'ant-table-row-selected' : ''}
                          onRow={(r) => ({
                            onClick: () => setPlProductFilter(plProductFilter === r.product ? null : r.product),
                            style: {
                              cursor: 'pointer',
                              opacity: plProductFilter && r.product !== plProductFilter ? 0.45 : 1,
                              background: r.product === plProductFilter ? '#B11E6A08' : undefined,
                              transition: 'opacity 0.2s',
                            },
                          })}
                          columns={[
                            { title: 'Product', dataIndex: 'product', key: 'product', render: (v, r) => <Text style={{ fontSize: 12, fontWeight: 700, color: r.product === plProductFilter ? '#B11E6A' : textColor }}>{v}</Text> },
                            { title: 'Sold Qty', dataIndex: 'soldQty', key: 'soldQty', align: 'center', render: v => <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v?.toLocaleString()}</Tag> },
                            { title: 'Stock Qty', dataIndex: 'stockQty', key: 'stockQty', align: 'center', render: v => <Tag style={{ background: v < 200 ? '#ff4d4f15' : '#52c41a15', color: v < 200 ? '#ff4d4f' : '#52c41a', border: `1px solid ${v < 200 ? '#ff4d4f33' : '#52c41a33'}`, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v?.toLocaleString()}</Tag> },
                            { title: 'Sales',    dataIndex: 'sales',       key: 'sales',       render: v => <Text style={{ fontSize: 12, color: '#D85C9E', fontWeight: 600 }}>₹{(v / 1000).toFixed(0)}K</Text> },
                            { title: 'Gross P.', dataIndex: 'grossProfit', key: 'grossProfit', render: v => <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 700 }}>₹{(v / 1000).toFixed(0)}K</Text> },
                            {
                              title: 'Margin', key: 'margin',
                              render: (_, r) => {
                                const m = ((r.grossProfit / r.sales) * 100).toFixed(1);
                                return <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{m}%</Tag>;
                              },
                            },
                          ]}
                          summary={(data) => {
                            const tS  = data.reduce((s, r) => s + r.sales, 0);
                            const tG  = data.reduce((s, r) => s + r.grossProfit, 0);
                            const tSq = data.reduce((s, r) => s + (r.soldQty || 0), 0);
                            return (
                              <Table.Summary.Row>
                                <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={1}><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{tSq.toLocaleString()}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={2}><Text style={{ fontSize: 11, color: '#aaa' }}>—</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={3}><Text strong style={{ color: '#D85C9E', fontSize: 12 }}>₹{(tS / 1000).toFixed(0)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={4}><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{(tG / 1000).toFixed(0)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={5}>
                                  <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                                    {((tG / tS) * 100).toFixed(1)}%
                                  </Tag>
                                </Table.Summary.Cell>
                              </Table.Summary.Row>
                            );
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6, textAlign: 'center' }}>
                          Click a row to filter all charts by that product
                        </Text>
                      </Col>
                    </Row>
                  )}
                </Card>
              </div>
            ),
          },

          /* ─────────── BILL-WISE P&L ─────────── */
          {
            key: 'bill_pl',
            label: 'Bill-wise P&L',
            children: (() => {
              const filtered = billPLData.filter(r => {
                const q = billPlSearch.toLowerCase();
                const matchSearch = !q || r.inv_no.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || r.product.toLowerCase().includes(q);
                const matchProd = !billPlProductFilter || r.product === billPlProductFilter;
                return matchSearch && matchProd;
              });
              const totSell = filtered.reduce((s, r) => s + r.sell_taxable, 0);
              const totGst  = filtered.reduce((s, r) => s + r.gst_collected, 0);
              const totCogs = filtered.reduce((s, r) => s + r.cogs, 0);
              const totGP   = filtered.reduce((s, r) => s + r.gross_profit, 0);
              const avgMargin = totSell > 0 ? ((totGP / totSell) * 100).toFixed(1) : 0;
              return (
                <div>
                  {/* Summary cards */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                    {[
                      { label: 'Total Taxable Sales', value: totSell,   color: '#B11E6A', sub: `${filtered.length} bills` },
                      { label: 'GST Collected',        value: totGst,    color: '#fa8c16', sub: 'Output tax' },
                      { label: 'Total COGS',           value: totCogs,   color: '#8a1652', sub: 'Purchase cost' },
                      { label: 'Gross Profit',         value: totGP,     color: '#52c41a', sub: `Avg margin: ${avgMargin}%` },
                    ].map((s, i) => (
                      <Col xs={12} sm={6} key={s.label}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                          <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '14px 16px' } }}>
                            <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                            <div style={{ fontSize: 19, fontWeight: 800, color: s.color }}>₹{s.value.toLocaleString()}</div>
                            <Text style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</Text>
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>

                  {/* Filter bar */}
                  <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                    <Space wrap>
                      <FilterOutlined style={{ color: '#B11E6A' }} />
                      <Select allowClear placeholder="All Products" value={billPlProductFilter} onChange={setBillPlProductFilter} style={{ width: 180 }}>
                        {['Soap 50g', 'Shampoo 30ml', 'Dental Kit', 'Conditioner'].map(p => <Option key={p} value={p}>{p}</Option>)}
                      </Select>
                      <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search invoice, client..." allowClear value={billPlSearch} onChange={e => setBillPlSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                      <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
                      <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                    </Space>
                  </Card>

                  {/* Bill-wise P&L chart */}
                  <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                    <Col xs={24} lg={16}>
                      <Card title={<Text strong style={{ color: textColor }}>Bill-wise Gross Profit</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={filtered} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="inv_no" tick={{ fill: tickColor, fontSize: 11 }} />
                            <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v, n) => [`₹${v.toLocaleString()}`, n]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                            <Legend />
                            <Bar dataKey="sell_taxable" name="Taxable Sales" fill="#D85C9E" radius={[4,4,0,0]} />
                            <Bar dataKey="cogs"         name="COGS"          fill="#8a1652" radius={[4,4,0,0]} />
                            <Bar dataKey="gross_profit" name="Gross Profit"  fill="#B11E6A" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                      <Card title={<Text strong style={{ color: textColor }}>Profit by Client</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }} styles={{ body: { padding: '16px' } }}>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={filtered.map((r, i) => ({ name: r.client, value: r.gross_profit, color: CHART_COLORS[i % CHART_COLORS.length] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                              {filtered.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                          {filtered.map((r, i) => (
                            <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space size={6}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <Text style={{ fontSize: 11, color: textColor }} ellipsis>{r.client}</Text>
                              </Space>
                              <Text style={{ fontSize: 11, fontWeight: 700, color: '#B11E6A' }}>₹{(r.gross_profit/1000).toFixed(1)}K</Text>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* Bill-wise P&L table */}
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Title level={5} style={{ color: textColor, margin: 0 }}>Bill-wise Profit & Loss Statement</Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>{filtered.length} bills • Avg Margin: <Text strong style={{ color: '#B11E6A' }}>{avgMargin}%</Text></Text>
                    </div>
                    <Table
                      size="small"
                      scroll={{ x: 1200 }}
                      dataSource={filtered}
                      columns={[
                        { title: 'Invoice #', dataIndex: 'inv_no', key: 'inv_no', width: 110, fixed: 'left', render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
                        { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Client', dataIndex: 'client', key: 'client', width: 160, render: v => <Text style={{ fontSize: 12, fontWeight: 600 }}>{v}</Text> },
                        { title: 'Product', dataIndex: 'product', key: 'product', width: 130, render: v => <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165233', borderRadius: 20 }}>{v}</Tag> },
                        { title: 'Taxable Sales', dataIndex: 'sell_taxable', key: 'sell_taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                        { title: 'GST Collected', dataIndex: 'gst_collected', key: 'gst_collected', width: 120, render: v => <Text style={{ fontSize: 12, color: '#fa8c16' }}>₹{v.toLocaleString()}</Text> },
                        { title: 'Total Bill', dataIndex: 'sell_total', key: 'sell_total', width: 110, render: v => <Text strong style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                        { title: 'COGS', dataIndex: 'cogs', key: 'cogs', width: 110, render: v => <Text style={{ fontSize: 12, color: '#8a1652' }}>₹{v.toLocaleString()}</Text> },
                        { title: 'Input GST', dataIndex: 'input_gst', key: 'input_gst', width: 100, render: v => <Text style={{ fontSize: 12, color: '#52c41a' }}>₹{v.toLocaleString()}</Text> },
                        {
                          title: 'Gross Profit', dataIndex: 'gross_profit', key: 'gross_profit', width: 120, fixed: 'right',
                          render: v => <Text strong style={{ fontSize: 12, color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>₹{v.toLocaleString()}</Text>,
                        },
                        {
                          title: 'Margin %', key: 'margin', width: 90, fixed: 'right',
                          render: (_, r) => {
                            const m = r.sell_taxable > 0 ? ((r.gross_profit / r.sell_taxable) * 100).toFixed(1) : 0;
                            return <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{m}%</Tag>;
                          },
                        },
                        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: v => <Tag style={{ borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColor[v] || '#888'}22`, color: statusColor[v] || '#888', border: `1px solid ${statusColor[v] || '#888'}44` }}>{v}</Tag> },
                      ]}
                      summary={(data) => {
                        const tS = data.reduce((s, r) => s + r.sell_taxable, 0);
                        const tG = data.reduce((s, r) => s + r.gst_collected, 0);
                        const tC = data.reduce((s, r) => s + r.cogs, 0);
                        const tP = data.reduce((s, r) => s + r.gross_profit, 0);
                        return (
                          <Table.Summary.Row style={{ fontWeight: 700 }}>
                            <Table.Summary.Cell colSpan={4}><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{tS.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ color: '#fa8c16', fontSize: 12 }}>₹{tG.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{(tS + tG).toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ color: '#8a1652', fontSize: 12 }}>₹{tC.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell />
                            <Table.Summary.Cell><Text strong style={{ color: '#52c41a', fontSize: 12 }}>₹{tP.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell>
                              <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                                {tS > 0 ? ((tP / tS) * 100).toFixed(1) : 0}%
                              </Tag>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell />
                          </Table.Summary.Row>
                        );
                      }}
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                </div>
              );
            })(),
          },

          /* ─────────── SALESPERSON PERFORMANCE REPORT ─────────── */
          {
            key: 'performance',
            label: 'Performance',
            children: (() => {
              const topPerformer = [...salesPersonData].sort((a, b) => b.revenue - a.revenue)[0];
              const teamRevenue  = salesPersonData.reduce((s, p) => s + p.revenue, 0);
              const teamOrders   = salesPersonData.reduce((s, p) => s + p.orders, 0);
              const avgTarget    = salesPersonData.reduce((s, p) => s + Math.round((p.revenue / p.target) * 100), 0) / salesPersonData.length;
              const totalComplaints = salesPersonData.reduce((s, p) => s + p.complaints, 0);
              return (
                <div>
                  {/* KPI summary row */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                    {[
                      { label: 'Top Performer',      value: topPerformer.name.split(' ')[0], color: '#B11E6A', sub: `₹${(topPerformer.revenue/1000).toFixed(0)}K revenue` },
                      { label: 'Team Revenue',        value: `₹${(teamRevenue/100000).toFixed(2)}L`, color: '#C94F8A', sub: `${teamOrders} total orders` },
                      { label: 'Avg Target Achieved', value: `${avgTarget.toFixed(0)}%`,      color: avgTarget >= 100 ? '#52c41a' : '#fa8c16', sub: 'Across all sales persons' },
                      { label: 'Total Complaints',    value: totalComplaints,                  color: totalComplaints > 5 ? '#ff4d4f' : '#52c41a', sub: 'Assigned to team' },
                    ].map((s, i) => (
                      <Col xs={12} sm={6} key={s.label}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                          <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '14px 16px' } }}>
                            <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <Text style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</Text>
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>

                  {/* Sub-tab selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[['leaderboard', 'Leaderboard'], ['target', 'Target vs Achievement'], ['monthly', 'Monthly Trend']].map(([k, lbl]) => (
                      <button key={k} type="button" onClick={() => setPerfTab(k)} style={{
                        padding: '6px 18px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                        border: `1.5px solid ${perfTab === k ? '#B11E6A' : borderColor}`,
                        background: perfTab === k ? '#B11E6A18' : 'transparent',
                        color: perfTab === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
                      }}>{lbl}</button>
                    ))}
                  </div>

                  {/* ── Leaderboard ── */}
                  {perfTab === 'leaderboard' && (
                    <Row gutter={[14, 14]}>
                      <Col xs={24} lg={14}>
                        <Card title={<Text strong style={{ color: textColor }}>Revenue Leaderboard</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
                          <ResponsiveContainer width="100%" height={270}>
                            <BarChart data={[...salesPersonData].sort((a, b) => b.revenue - a.revenue)} layout="vertical" barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                              <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                              <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} width={100} />
                              <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                              <Bar dataKey="revenue" name="Revenue" radius={[0,4,4,0]}>
                                {[...salesPersonData].sort((a, b) => b.revenue - a.revenue).map((p, idx) => (
                                  <Cell key={idx} fill={p.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      <Col xs={24} lg={10}>
                        <Card title={<Text strong style={{ color: textColor }}>Sales Person Details</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                          <Table
                            size="small"
                            dataSource={[...salesPersonData].sort((a, b) => b.revenue - a.revenue)}
                            pagination={false}
                            rowKey="key"
                            columns={[
                              {
                                title: '#', key: 'rank', width: 32, align: 'center',
                                render: (_, __, idx) => (
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: idx === 0 ? '#faad14' : idx === 1 ? '#aaa' : idx === 2 ? '#cd7f32' : '#f0f0f0', color: idx < 3 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{idx + 1}</div>
                                ),
                              },
                              { title: 'Name', dataIndex: 'name', key: 'name', render: (v, r) => <div><Text style={{ fontSize: 12, fontWeight: 700 }}>{v}</Text><br /><Text style={{ fontSize: 10, color: '#aaa' }}>{r.role}</Text></div> },
                              { title: 'Orders', dataIndex: 'orders', key: 'orders', align: 'center', width: 55, render: v => <Text style={{ fontSize: 12, fontWeight: 600 }}>{v}</Text> },
                              { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', width: 85, render: (v, r) => <Text style={{ fontSize: 12, fontWeight: 700, color: r.color }}>₹{(v/1000).toFixed(0)}K</Text> },
                              { title: 'Conv.', dataIndex: 'conversion', key: 'conversion', align: 'center', width: 55, render: v => <Tag style={{ background: v >= 70 ? '#52c41a15' : '#fa8c1615', color: v >= 70 ? '#52c41a' : '#fa8c16', border: `1px solid ${v >= 70 ? '#52c41a33' : '#fa8c1633'}`, borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{v}%</Tag> },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* ── Target vs Achievement ── */}
                  {perfTab === 'target' && (
                    <Row gutter={[14, 14]}>
                      <Col xs={24} lg={15}>
                        <Card title={<Text strong style={{ color: textColor }}>Target vs Revenue Achieved</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={salesPersonData} barGap={6}>
                              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                              <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => v.split(' ')[0]} />
                              <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                              <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                              <Legend />
                              <Bar dataKey="target"  name="Target"   fill={isDark ? '#444' : '#e0e0e0'} radius={[4,4,0,0]} />
                              <Bar dataKey="revenue" name="Achieved" radius={[4,4,0,0]}>
                                {salesPersonData.map((p, idx) => <Cell key={idx} fill={p.revenue >= p.target ? '#52c41a' : '#B11E6A'} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      <Col xs={24} lg={9}>
                        <Card title={<Text strong style={{ color: textColor }}>Achievement Summary</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                          <Table
                            size="small"
                            dataSource={salesPersonData}
                            pagination={false}
                            rowKey="key"
                            columns={[
                              { title: 'Sales Person', dataIndex: 'name', key: 'name', render: v => <Text style={{ fontSize: 12, fontWeight: 600 }}>{v.split(' ')[0]}</Text> },
                              { title: 'Target', dataIndex: 'target', key: 'target', width: 80, render: v => <Text style={{ fontSize: 12, color: '#888' }}>₹{(v/1000).toFixed(0)}K</Text> },
                              { title: 'Achieved', dataIndex: 'revenue', key: 'revenue', width: 85, render: (v, r) => <Text style={{ fontSize: 12, fontWeight: 700, color: v >= r.target ? '#52c41a' : '#B11E6A' }}>₹{(v/1000).toFixed(0)}K</Text> },
                              {
                                title: '% Hit', key: 'hit', width: 65, align: 'center',
                                render: (_, r) => {
                                  const pct = Math.round((r.revenue / r.target) * 100);
                                  return <Tag style={{ background: pct >= 100 ? '#52c41a15' : pct >= 80 ? '#fa8c1615' : '#ff4d4f15', color: pct >= 100 ? '#52c41a' : pct >= 80 ? '#fa8c16' : '#ff4d4f', border: `1px solid ${pct >= 100 ? '#52c41a33' : pct >= 80 ? '#fa8c1633' : '#ff4d4f33'}`, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{pct}%</Tag>;
                                },
                              },
                              { title: 'Compl.', dataIndex: 'complaints', key: 'complaints', align: 'center', width: 60, render: v => <Tag style={{ background: v === 0 ? '#52c41a15' : v > 2 ? '#ff4d4f15' : '#fa8c1615', color: v === 0 ? '#52c41a' : v > 2 ? '#ff4d4f' : '#fa8c16', border: `1px solid ${v === 0 ? '#52c41a33' : v > 2 ? '#ff4d4f33' : '#fa8c1633'}`, borderRadius: 20, fontSize: 11 }}>{v}</Tag> },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}

                  {/* ── Monthly Trend ── */}
                  {perfTab === 'monthly' && (
                    <Row gutter={[14, 14]}>
                      <Col xs={24} lg={16}>
                        <Card title={<Text strong style={{ color: textColor }}>Month-wise Revenue per Sales Person</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={salesPersonMonthlyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                              <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                              <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                              <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                              <Legend />
                              {salesPersonData.map(p => (
                                <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={2} dot={{ fill: p.color, r: 3 }} name={p.name.split(' ')[0]} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      <Col xs={24} lg={8}>
                        <Card title={<Text strong style={{ color: textColor }}>Latest Month (Feb)</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }} styles={{ body: { padding: 0 } }}>
                          <Table
                            size="small"
                            dataSource={salesPersonData.map(p => ({ ...p, febRevenue: salesPersonMonthlyData[salesPersonMonthlyData.length - 1][p.name] || 0 }))}
                            pagination={false}
                            rowKey="key"
                            columns={[
                              { title: 'Name', dataIndex: 'name', key: 'name', render: (v, r) => <Text style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{v.split(' ')[0]}</Text> },
                              { title: 'Feb Rev.', dataIndex: 'febRevenue', key: 'febRevenue', width: 85, render: v => <Text style={{ fontSize: 12, fontWeight: 600 }}>₹{(v/1000).toFixed(0)}K</Text> },
                              {
                                title: 'vs Jan', key: 'mom', width: 70, align: 'center',
                                render: (_, r) => {
                                  const jan = salesPersonMonthlyData[salesPersonMonthlyData.length - 2][r.name] || 0;
                                  const feb = salesPersonMonthlyData[salesPersonMonthlyData.length - 1][r.name] || 0;
                                  const diff = jan > 0 ? (((feb - jan) / jan) * 100).toFixed(0) : 0;
                                  return <Tag style={{ background: diff >= 0 ? '#52c41a15' : '#ff4d4f15', color: diff >= 0 ? '#52c41a' : '#ff4d4f', border: `1px solid ${diff >= 0 ? '#52c41a33' : '#ff4d4f33'}`, borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{diff >= 0 ? '+' : ''}{diff}%</Tag>;
                                },
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  )}
                </div>
              );
            })(),
          },
          /* ─────────── MONTHLY GST REPORT ─────────── */
          {
            key: 'monthly_gst',
            label: 'Monthly GST',
            children: (() => {
              const filteredGst = gstMonthFilter === 'all'
                ? monthlyGstData
                : monthlyGstData.filter(r => r.month === gstMonthFilter);

              const totSalesTaxable = filteredGst.reduce((s, r) => s + r.sales_taxable, 0);
              const totSalesCgst    = filteredGst.reduce((s, r) => s + r.sales_cgst, 0);
              const totSalesSgst    = filteredGst.reduce((s, r) => s + r.sales_sgst, 0);
              const totSalesIgst    = filteredGst.reduce((s, r) => s + r.sales_igst, 0);
              const totOutputGst    = filteredGst.reduce((s, r) => s + r.sales_total_gst, 0);
              const totPurTaxable   = filteredGst.reduce((s, r) => s + r.pur_taxable, 0);
              const totPurCgst      = filteredGst.reduce((s, r) => s + r.pur_cgst, 0);
              const totPurSgst      = filteredGst.reduce((s, r) => s + r.pur_sgst, 0);
              const totPurIgst      = filteredGst.reduce((s, r) => s + r.pur_igst, 0);
              const totInputGst     = filteredGst.reduce((s, r) => s + r.pur_total_gst, 0);
              const netGstPayable   = totOutputGst - totInputGst;

              const chartData = filteredGst.map(r => ({
                month: r.month,
                'Output GST (Sales)': r.sales_total_gst,
                'Input GST / ITC (Purchase)': r.pur_total_gst,
                'Net Payable': r.sales_total_gst - r.pur_total_gst,
              }));

              return (
                <div>
                  {/* Filter bar */}
                  <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <Space wrap>
                        <FilterOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor, fontSize: 13 }}>Month:</Text>
                        <Select value={gstMonthFilter} onChange={setGstMonthFilter} style={{ width: 130 }}>
                          <Option value="all">All Months</Option>
                          {monthlyGstData.map(r => (
                            <Option key={r.month} value={r.month}>{r.month} {r.year}</Option>
                          ))}
                        </Select>
                        <Text strong style={{ color: textColor, fontSize: 13 }}>View:</Text>
                        {[['combined', 'Combined'], ['sales', 'Sales Only'], ['purchase', 'Purchase Only']].map(([k, lbl]) => (
                          <div key={k} onClick={() => setGstViewMode(k)} style={{
                            padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            border: `1.5px solid ${gstViewMode === k ? '#B11E6A' : borderColor}`,
                            background: gstViewMode === k ? '#B11E6A18' : 'transparent',
                            color: gstViewMode === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
                          }}>{lbl}</div>
                        ))}
                      </Space>
                      <Button
                        icon={<FileExcelOutlined />}
                        style={{ color: '#52c41a', borderColor: '#52c41a44' }}
                        onClick={() => {
                          const headers = ['Month', 'Year', 'Sales Taxable (₹)', 'Sales CGST (₹)', 'Sales SGST (₹)', 'Sales IGST (₹)', 'Total Output GST (₹)', 'Purchase Taxable (₹)', 'Purchase CGST (₹)', 'Purchase SGST (₹)', 'Purchase IGST (₹)', 'Total Input GST/ITC (₹)', 'Net GST Payable (₹)'];
                          const rows = filteredGst.map(r => [
                            r.month, r.year,
                            r.sales_taxable, r.sales_cgst, r.sales_sgst, r.sales_igst, r.sales_total_gst,
                            r.pur_taxable, r.pur_cgst, r.pur_sgst, r.pur_igst, r.pur_total_gst,
                            r.sales_total_gst - r.pur_total_gst,
                          ]);
                          exportToExcel(headers, rows, 'Monthly_GST_Report.csv');
                        }}
                      >Excel</Button>
                    </div>
                  </Card>

                  {/* KPI cards */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                    {[
                      { label: 'Total Sales Taxable Value', value: totSalesTaxable, color: '#B11E6A', sub: 'Output base' },
                      { label: 'Total Output GST (Sales)', value: totOutputGst, color: '#fa8c16', sub: `CGST ₹${totSalesCgst.toLocaleString()} + SGST ₹${totSalesSgst.toLocaleString()} + IGST ₹${totSalesIgst.toLocaleString()}` },
                      { label: 'Total Purchase Taxable Value', value: totPurTaxable, color: '#8a1652', sub: 'Input base' },
                      { label: 'Total Input GST / ITC (Purchase)', value: totInputGst, color: '#7c3aed', sub: `CGST ₹${totPurCgst.toLocaleString()} + SGST ₹${totPurSgst.toLocaleString()} + IGST ₹${totPurIgst.toLocaleString()}` },
                      { label: 'Net GST Payable', value: netGstPayable, color: netGstPayable > 0 ? '#ff4d4f' : '#52c41a', sub: netGstPayable > 0 ? 'Amount due to govt.' : 'Credit / No liability' },
                    ].map((s, i) => (
                      <Col xs={12} sm={8} lg={24 / 5} key={s.label}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                          <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                            <Text style={{ fontSize: 10, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 3 }}>{s.label}</Text>
                            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>₹{s.value.toLocaleString()}</div>
                            <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>

                  {/* Bar Chart — Output vs Input vs Net */}
                  <Card
                    title={<Text strong style={{ color: textColor }}>Month-wise GST: Output vs Input vs Net Payable</Text>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 14 }}
                    styles={{ body: { padding: '12px 16px 16px' } }}
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v, n) => [`₹${v.toLocaleString()}`, n]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                        <Legend />
                        {(gstViewMode === 'combined' || gstViewMode === 'sales') && (
                          <Bar dataKey="Output GST (Sales)" fill="#B11E6A" radius={[4, 4, 0, 0]} />
                        )}
                        {(gstViewMode === 'combined' || gstViewMode === 'purchase') && (
                          <Bar dataKey="Input GST / ITC (Purchase)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        )}
                        {gstViewMode === 'combined' && (
                          <Bar dataKey="Net Payable" fill="#fa8c16" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Line chart — GST trend */}
                  <Card
                    title={<Text strong style={{ color: textColor }}>GST Trend Line</Text>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 14 }}
                    styles={{ body: { padding: '12px 16px 16px' } }}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v, n) => [`₹${v.toLocaleString()}`, n]} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                        <Legend />
                        {(gstViewMode === 'combined' || gstViewMode === 'sales') && (
                          <Line type="monotone" dataKey="Output GST (Sales)" stroke="#B11E6A" strokeWidth={2.5} dot={{ fill: '#B11E6A', r: 4 }} />
                        )}
                        {(gstViewMode === 'combined' || gstViewMode === 'purchase') && (
                          <Line type="monotone" dataKey="Input GST / ITC (Purchase)" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} />
                        )}
                        {gstViewMode === 'combined' && (
                          <Line type="monotone" dataKey="Net Payable" stroke="#fa8c16" strokeWidth={2.5} strokeDasharray="5 4" dot={{ fill: '#fa8c16', r: 4 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Monthly GST table */}
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                    <Title level={5} style={{ color: textColor, margin: '0 0 14px 0' }}>Month-wise GST Records</Title>
                    <Table
                      size="small"
                      bordered
                      scroll={{ x: 1600 }}
                      dataSource={filteredGst}
                      rowKey="key"
                      pagination={false}
                      columns={[
                        { title: 'Month', key: 'month', width: 90, fixed: 'left', render: (_, r) => <Text strong style={{ fontSize: 12 }}>{r.month} {r.year}</Text> },

                        ...(gstViewMode !== 'purchase' ? [{
                          title: 'Sales (Output GST)',
                          children: [
                            { title: 'Taxable Value', dataIndex: 'sales_taxable', key: 'sales_taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'CGST', dataIndex: 'sales_cgst', key: 'sales_cgst', width: 95, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'SGST', dataIndex: 'sales_sgst', key: 'sales_sgst', width: 95, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'IGST', dataIndex: 'sales_igst', key: 'sales_igst', width: 95, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Total Output', dataIndex: 'sales_total_gst', key: 'sales_total_gst', width: 110, render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                          ],
                        }] : []),

                        ...(gstViewMode !== 'sales' ? [{
                          title: 'Purchase (Input GST / ITC)',
                          children: [
                            { title: 'Taxable Value', dataIndex: 'pur_taxable', key: 'pur_taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'CGST', dataIndex: 'pur_cgst', key: 'pur_cgst', width: 95, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'SGST', dataIndex: 'pur_sgst', key: 'pur_sgst', width: 95, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'IGST', dataIndex: 'pur_igst', key: 'pur_igst', width: 95, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                            { title: 'Total Input', dataIndex: 'pur_total_gst', key: 'pur_total_gst', width: 110, render: v => <Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                          ],
                        }] : []),

                        ...(gstViewMode === 'combined' ? [{
                          title: 'Net GST Payable', key: 'net', width: 120, fixed: 'right',
                          render: (_, r) => {
                            const net = r.sales_total_gst - r.pur_total_gst;
                            return <Text strong style={{ color: net > 0 ? '#ff4d4f' : '#52c41a', fontSize: 12 }}>₹{net.toLocaleString()}</Text>;
                          },
                        }] : []),
                      ]}
                      summary={(data) => {
                        const tST = data.reduce((s, r) => s + r.sales_taxable, 0);
                        const tSC = data.reduce((s, r) => s + r.sales_cgst, 0);
                        const tSS = data.reduce((s, r) => s + r.sales_sgst, 0);
                        const tSI = data.reduce((s, r) => s + r.sales_igst, 0);
                        const tSOG = data.reduce((s, r) => s + r.sales_total_gst, 0);
                        const tPT = data.reduce((s, r) => s + r.pur_taxable, 0);
                        const tPC = data.reduce((s, r) => s + r.pur_cgst, 0);
                        const tPS = data.reduce((s, r) => s + r.pur_sgst, 0);
                        const tPI = data.reduce((s, r) => s + r.pur_igst, 0);
                        const tPIG = data.reduce((s, r) => s + r.pur_total_gst, 0);
                        const net = tSOG - tPIG;
                        return (
                          <Table.Summary.Row style={{ fontWeight: 700, background: isDark ? '#2a1a2e' : '#fdf5fa' }}>
                            <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                            {gstViewMode !== 'purchase' && <>
                              <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{tST.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#fa8c16', fontSize: 12 }}>₹{tSC.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{tSS.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#1890ff', fontSize: 12 }}>₹{tSI.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{tSOG.toLocaleString()}</Text></Table.Summary.Cell>
                            </>}
                            {gstViewMode !== 'sales' && <>
                              <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{tPT.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#fa8c16', fontSize: 12 }}>₹{tPC.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{tPS.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#1890ff', fontSize: 12 }}>₹{tPI.toLocaleString()}</Text></Table.Summary.Cell>
                              <Table.Summary.Cell><Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{tPIG.toLocaleString()}</Text></Table.Summary.Cell>
                            </>}
                            {gstViewMode === 'combined' && (
                              <Table.Summary.Cell>
                                <Text strong style={{ color: net > 0 ? '#ff4d4f' : '#52c41a', fontSize: 12 }}>₹{net.toLocaleString()}</Text>
                              </Table.Summary.Cell>
                            )}
                          </Table.Summary.Row>
                        );
                      }}
                    />
                  </Card>
                </div>
              );
            })(),
          },

          /* ─────────── AUDITOR TAX REPORT ─────────── */
          {
            key: 'auditor_tax',
            label: 'Auditor Tax Report',
            children: (() => {
              const salesGstData = salesRawData.filter(r => {
                const matchGst = auditorGstFilter === 'all' ? true : auditorGstFilter === 'with_gst' ? r.total_tax > 0 : r.total_tax === 0;
                const q = auditorSearch.toLowerCase();
                const matchSearch = !q || r.customer.toLowerCase().includes(q) || r.inv_no.toLowerCase().includes(q) || r.gst_no.toLowerCase().includes(q);
                return matchGst && matchSearch;
              });
              const purchaseGstData = purchaseRawData.filter(r => {
                const matchGst = auditorGstFilter === 'all' ? true : auditorGstFilter === 'with_gst' ? r.total_tax > 0 : r.total_tax === 0;
                const q = auditorSearch.toLowerCase();
                const matchSearch = !q || r.supplier.toLowerCase().includes(q) || r.inv_no.toLowerCase().includes(q) || r.vendor_gst.toLowerCase().includes(q);
                return matchGst && matchSearch;
              });

              const activeData = auditorSubTab === 'sales' ? salesGstData : purchaseGstData;
              const totalTaxable = activeData.reduce((s, r) => s + r.taxable, 0);
              const totalCgst    = activeData.reduce((s, r) => s + r.cgst, 0);
              const totalSgst    = activeData.reduce((s, r) => s + r.sgst, 0);
              const totalIgst    = activeData.reduce((s, r) => s + r.igst, 0);
              const totalTax     = activeData.reduce((s, r) => s + r.total_tax, 0);
              const totalValue   = activeData.reduce((s, r) => s + r.inv_value, 0);

              const salesColumns = [
                { title: 'S.No', key: 'sno', width: 55, align: 'center', fixed: 'left', render: (_, __, i) => <Text style={{ fontSize: 12 }}>{i + 1}</Text> },
                { title: 'GSTIN / UIN', dataIndex: 'gst_no', key: 'gst_no', width: 160, render: v => <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c3aed' }}>{v}</Text> },
                { title: 'Receiver Name', dataIndex: 'customer', key: 'customer', width: 160, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
                { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, render: v => <Text strong style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                { title: 'Place of Supply', key: 'pos', width: 150, render: (_, r) => <Text style={{ fontSize: 12 }}>{r.state_code} - {r.state_name}</Text> },
                { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                {
                  title: 'Central Tax',
                  children: [
                    { title: 'Rate (%)', key: 'cgst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.cgst > 0 ? ((r.cgst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'cgst', key: 'cgst', width: 110, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                {
                  title: 'State/UT Tax',
                  children: [
                    { title: 'Rate (%)', key: 'sgst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.sgst > 0 ? ((r.sgst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'sgst', key: 'sgst', width: 110, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                {
                  title: 'Integrated Tax',
                  children: [
                    { title: 'Rate (%)', key: 'igst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.igst > 0 ? ((r.igst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'igst', key: 'igst', width: 110, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                { title: 'Cess Amount', key: 'cess', width: 100, align: 'center', render: () => <Text style={{ fontSize: 12 }}>₹0</Text> },
                { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 110, fixed: 'right', render: v => <Text strong style={{ color: v > 0 ? '#52c41a' : '#aaa', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
              ];

              const purchaseColumns = [
                { title: 'S.No', key: 'sno', width: 55, align: 'center', fixed: 'left', render: (_, __, i) => <Text style={{ fontSize: 12 }}>{i + 1}</Text> },
                { title: 'Vendor GSTIN', dataIndex: 'vendor_gst', key: 'vendor_gst', width: 160, render: v => <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c3aed' }}>{v}</Text> },
                { title: 'Supplier Name', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Product', dataIndex: 'product', key: 'product', width: 160, render: v => <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20 }}>{v}</Tag> },
                { title: 'HSN Code', dataIndex: 'hsn', key: 'hsn', width: 100, align: 'center', render: v => <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#7c3aed' }}>{v}</Text> },
                { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
                { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 120, render: v => <Text strong style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                { title: 'Place of Supply', key: 'pos', width: 150, render: (_, r) => <Text style={{ fontSize: 12 }}>{r.state_code} - {r.state_name}</Text> },
                { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text style={{ fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                {
                  title: 'Central Tax',
                  children: [
                    { title: 'Rate (%)', key: 'cgst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.cgst > 0 ? ((r.cgst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'cgst', key: 'cgst', width: 110, render: v => <Text style={{ color: '#fa8c16', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                {
                  title: 'State/UT Tax',
                  children: [
                    { title: 'Rate (%)', key: 'sgst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.sgst > 0 ? ((r.sgst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'sgst', key: 'sgst', width: 110, render: v => <Text style={{ color: '#7c3aed', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                {
                  title: 'Integrated Tax',
                  children: [
                    { title: 'Rate (%)', key: 'igst_rate', width: 80, align: 'center', render: (_, r) => <Text style={{ fontSize: 11 }}>{r.igst > 0 ? ((r.igst / r.taxable) * 100).toFixed(0) : 0}%</Text> },
                    { title: 'Amount (₹)', dataIndex: 'igst', key: 'igst', width: 110, render: v => <Text style={{ color: '#1890ff', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
                  ],
                },
                { title: 'Cess Amount', key: 'cess', width: 100, align: 'center', render: () => <Text style={{ fontSize: 12 }}>₹0</Text> },
                { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 110, fixed: 'right', render: v => <Text strong style={{ color: v > 0 ? '#52c41a' : '#aaa', fontSize: 12 }}>₹{v.toLocaleString()}</Text> },
              ];

              return (
                <div>
                  {/* Sub-tab toggle: Sales / Purchase */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    {[['sales', 'Sales Tax (Output GST)'], ['purchase', 'Purchase Tax (Input GST)']].map(([k, lbl]) => (
                      <button key={k} type="button" onClick={() => { setAuditorSubTab(k); setAuditorSearch(''); }} style={{
                        padding: '7px 20px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                        border: `1.5px solid ${auditorSubTab === k ? '#B11E6A' : borderColor}`,
                        background: auditorSubTab === k ? 'linear-gradient(135deg,#B11E6A22,#D85C9E18)' : 'transparent',
                        color: auditorSubTab === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
                      }}>{lbl}</button>
                    ))}
                  </div>

                  {/* Filter & Search bar */}
                  <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <Space wrap>
                        <FilterOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor, fontSize: 13 }}>GST Filter:</Text>
                        {[['all', 'All'], ['with_gst', 'With GST'], ['without_gst', 'Without GST']].map(([k, lbl]) => (
                          <div key={k} onClick={() => setAuditorGstFilter(k)} style={{
                            padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            border: `1.5px solid ${auditorGstFilter === k ? '#B11E6A' : borderColor}`,
                            background: auditorGstFilter === k ? '#B11E6A18' : 'transparent',
                            color: auditorGstFilter === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
                          }}>{lbl}</div>
                        ))}
                        <Input
                          prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
                          placeholder={auditorSubTab === 'sales' ? 'Search customer, invoice, GSTIN…' : 'Search supplier, invoice, GSTIN…'}
                          allowClear
                          value={auditorSearch}
                          onChange={e => setAuditorSearch(e.target.value)}
                          style={{ width: 240, borderRadius: 8 }}
                        />
                      </Space>
                      <Space>
                        <Button
                          icon={<FileExcelOutlined />}
                          style={{ color: '#52c41a', borderColor: '#52c41a44' }}
                          onClick={() => {
                            if (auditorSubTab === 'sales') {
                              const headers = ['S.No', 'GSTIN/UIN', 'Receiver Name', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'Taxable Value', 'Central Tax Rate (%)', 'Central Tax (₹)', 'State/UT Tax Rate (%)', 'State/UT Tax (₹)', 'Integrated Tax Rate (%)', 'Integrated Tax (₹)', 'Cess (₹)', 'Total Tax (₹)'];
                              const rows = salesGstData.map((r, i) => [
                                i + 1, r.gst_no, r.customer, r.inv_no, r.inv_date, r.inv_value,
                                `${r.state_code} - ${r.state_name}`, r.taxable,
                                r.cgst > 0 ? ((r.cgst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.cgst,
                                r.sgst > 0 ? ((r.sgst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.sgst,
                                r.igst > 0 ? ((r.igst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.igst,
                                0, r.total_tax,
                              ]);
                              exportToExcel(headers, rows, 'Auditor_Sales_Tax_Report.csv');
                            } else {
                              const headers = ['S.No', 'Vendor GSTIN', 'Supplier Name', 'Product', 'HSN Code', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'Taxable Value', 'Central Tax Rate (%)', 'Central Tax (₹)', 'State/UT Tax Rate (%)', 'State/UT Tax (₹)', 'Integrated Tax Rate (%)', 'Integrated Tax (₹)', 'Cess (₹)', 'Total Tax (₹)'];
                              const rows = purchaseGstData.map((r, i) => [
                                i + 1, r.vendor_gst, r.supplier, r.product, r.hsn, r.inv_no, r.inv_date, r.inv_value,
                                `${r.state_code} - ${r.state_name}`, r.taxable,
                                r.cgst > 0 ? ((r.cgst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.cgst,
                                r.sgst > 0 ? ((r.sgst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.sgst,
                                r.igst > 0 ? ((r.igst / r.taxable) * 100).toFixed(0) + '%' : '0%', r.igst,
                                0, r.total_tax,
                              ]);
                              exportToExcel(headers, rows, 'Auditor_Purchase_Tax_Report.csv');
                            }
                          }}
                        >Excel</Button>
                        <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                      </Space>
                    </div>
                  </Card>

                  {/* Summary KPI cards */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
                    {[
                      { label: 'Total Taxable Value', value: `₹${totalTaxable.toLocaleString()}`, color: '#B11E6A', sub: `${activeData.length} invoices` },
                      { label: 'Central Tax (CGST)', value: `₹${totalCgst.toLocaleString()}`, color: '#fa8c16', sub: 'Intra-state' },
                      { label: 'State/UT Tax (SGST)', value: `₹${totalSgst.toLocaleString()}`, color: '#7c3aed', sub: 'Intra-state' },
                      { label: 'Integrated Tax (IGST)', value: `₹${totalIgst.toLocaleString()}`, color: '#1890ff', sub: 'Inter-state' },
                      { label: 'Total Tax Amount', value: `₹${totalTax.toLocaleString()}`, color: '#52c41a', sub: 'CGST + SGST + IGST' },
                      { label: 'Total Invoice Value', value: `₹${totalValue.toLocaleString()}`, color: '#8a1652', sub: 'Taxable + Tax' },
                    ].map((s, i) => (
                      <Col xs={12} sm={8} lg={4} key={s.label}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                            <Text style={{ fontSize: 10, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 3 }}>{s.label}</Text>
                            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                          </Card>
                        </motion.div>
                      </Col>
                    ))}
                  </Row>

                  {/* GST breakdown bar chart */}
                  <Card
                    title={<Text strong style={{ color: textColor }}>{auditorSubTab === 'sales' ? 'Output GST Breakdown (Sales)' : 'Input GST Breakdown (Purchase)'}</Text>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 14 }}
                    styles={{ body: { padding: '12px 16px 16px' } }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={activeData.map(r => ({
                        name: auditorSubTab === 'sales' ? r.inv_no : r.inv_no,
                        CGST: r.cgst, SGST: r.sgst, IGST: r.igst,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} />
                        <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="CGST" fill="#fa8c16" name="Central Tax (CGST)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="SGST" fill="#7c3aed" name="State Tax (SGST)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="IGST" fill="#1890ff" name="Integrated Tax (IGST)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Auditor Tax Table */}
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Title level={5} style={{ color: textColor, margin: 0 }}>
                        {auditorSubTab === 'sales' ? 'Auditor Tax Report — Sales (Output GST)' : 'Auditor Tax Report — Purchase (Input GST)'}
                        {auditorGstFilter !== 'all' && (
                          <Tag style={{ marginLeft: 10, background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20, fontSize: 11 }}>
                            {auditorGstFilter === 'with_gst' ? 'With GST' : 'Without GST'}
                          </Tag>
                        )}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>{activeData.length} records</Text>
                    </div>
                    <Table
                      size="small"
                      bordered
                      scroll={{ x: 2200 }}
                      dataSource={auditorSubTab === 'sales' ? salesGstData : purchaseGstData}
                      columns={auditorSubTab === 'sales' ? salesColumns : purchaseColumns}
                      rowKey="key"
                      pagination={{ pageSize: 15, showSizeChanger: true }}
                      summary={(data) => {
                        const tTaxable = data.reduce((s, r) => s + r.taxable, 0);
                        const tCgst    = data.reduce((s, r) => s + r.cgst, 0);
                        const tSgst    = data.reduce((s, r) => s + r.sgst, 0);
                        const tIgst    = data.reduce((s, r) => s + r.igst, 0);
                        const tTax     = data.reduce((s, r) => s + r.total_tax, 0);
                        return (
                          <Table.Summary.Row style={{ fontWeight: 700, background: isDark ? '#2a1a2e' : '#fdf5fa' }}>
                            <Table.Summary.Cell colSpan={auditorSubTab === 'sales' ? 7 : 9}>
                              <Text strong style={{ fontSize: 12 }}>Grand Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>₹{tTaxable.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell />
                            <Table.Summary.Cell><Text strong style={{ color: '#fa8c16', fontSize: 12 }}>₹{tCgst.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell />
                            <Table.Summary.Cell><Text strong style={{ color: '#7c3aed', fontSize: 12 }}>₹{tSgst.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell />
                            <Table.Summary.Cell><Text strong style={{ color: '#1890ff', fontSize: 12 }}>₹{tIgst.toLocaleString()}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text style={{ fontSize: 12 }}>₹0</Text></Table.Summary.Cell>
                            <Table.Summary.Cell><Text strong style={{ color: '#52c41a', fontSize: 12 }}>₹{tTax.toLocaleString()}</Text></Table.Summary.Cell>
                          </Table.Summary.Row>
                        );
                      }}
                    />
                  </Card>
                </div>
              );
            })(),
          },
        ]}
      />
    </div>
  );
}
