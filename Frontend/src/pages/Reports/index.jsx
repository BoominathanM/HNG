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
  { key: 1, vendor_gst: '27AABCG1234F1Z5', supplier: 'ChemCo India', product: 'Soap Base (White)', state_code: '27', state_name: 'Maharashtra', inv_no: 'PUR-8821', orig_inv_no: 'INV-CHEM-101', inv_date: '2024-05-01', inv_value: 10030, total_tax: 1530, taxable: 8500, cgst: 765, sgst: 765, igst: 0 },
  { key: 2, vendor_gst: '33AABHB5678K1Z2', supplier: 'BioLife Ltd', product: 'Shampoo Concentrate', state_code: '33', state_name: 'Tamil Nadu', inv_no: 'PUR-8825', orig_inv_no: 'INV-BIO-452', inv_date: '2024-05-04', inv_value: 51920, total_tax: 7920, taxable: 44000, cgst: 3960, sgst: 3960, igst: 0 },
  { key: 3, vendor_gst: '07AABCP9012E1Z8', supplier: 'PlastiPack', product: 'Soap Base (Transparent)', state_code: '07', state_name: 'Delhi', inv_no: 'PUR-8831', orig_inv_no: 'INV-PP-203', inv_date: '2024-05-06', inv_value: 2655, total_tax: 405, taxable: 2250, cgst: 202.5, sgst: 0, igst: 202.5 },
  { key: 4, vendor_gst: '29AABCB1122A1Z3', supplier: 'BoxWorld', product: 'Soap Base (White)', state_code: '29', state_name: 'Karnataka', inv_no: 'PUR-8839', orig_inv_no: 'INV-BW-77', inv_date: '2024-05-10', inv_value: 14400, total_tax: 2400, taxable: 12000, cgst: 1200, sgst: 1200, igst: 0 },
];

// P&L monthly data — sales from products, cogs = purchase cost
const plMonthlyData = [
  { month: 'Sep', sales: 62000, cogs: 38000, grossProfit: 24000, expenses: { rent: 3000, salary: 2500, utilities: 800, transport: 700, marketing: 500, other: 0 } },
  { month: 'Oct', sales: 78000, cogs: 47000, grossProfit: 31000, expenses: { rent: 3000, salary: 3000, utilities: 900, transport: 600, marketing: 500, other: 500 } },
  { month: 'Nov', sales: 71000, cogs: 42000, grossProfit: 29000, expenses: { rent: 3000, salary: 2800, utilities: 750, transport: 650, marketing: 500, other: 500 } },
  { month: 'Dec', sales: 95000, cogs: 58000, grossProfit: 37000, expenses: { rent: 3000, salary: 3200, utilities: 1000, transport: 800, marketing: 500, other: 500 } },
  { month: 'Jan', sales: 89000, cogs: 53000, grossProfit: 36000, expenses: { rent: 3000, salary: 3000, utilities: 950, transport: 550, marketing: 500, other: 500 } },
  { month: 'Feb', sales: 112000, cogs: 68000, grossProfit: 44000, expenses: { rent: 3000, salary: 3500, utilities: 1100, transport: 900, marketing: 500, other: 1000 } },
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
  { key: 1, product: 'Soap 50g', sales: 144500, cogs: 89000, grossProfit: 55500 },
  { key: 2, product: 'Shampoo 30ml', sales: 107500, cogs: 68000, grossProfit: 39500 },
  { key: 3, product: 'Dental Kit', sales: 161000, cogs: 95000, grossProfit: 66000 },
  { key: 4, product: 'Conditioner', sales: 94000, cogs: 56000, grossProfit: 38000 },
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

const CHART_COLORS = ['#B11E6A', '#D85C9E', '#8a1652', '#C94F8A', '#e91e8c', '#f06292'];

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

  // P&L state
  const [plSelectedMonth, setPlSelectedMonth] = useState('all');
  const [plDateRange, setPlDateRange] = useState(null);
  const [plSelectedExpenses, setPlSelectedExpenses] = useState(['rent', 'salary', 'utilities', 'transport', 'marketing', 'other']);
  const [plProductFilter, setPlProductFilter] = useState(null);

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

  const totalSales = plFilteredData.reduce((s, d) => s + d.sales, 0);
  const totalCogs = plFilteredData.reduce((s, d) => s + d.cogs, 0);
  const totalGrossProfit = plFilteredData.reduce((s, d) => s + d.grossProfit, 0);
  const totalExpenses = plFilteredData.reduce((s, d) =>
    s + plSelectedExpenses.reduce((sum, cat) => sum + (d.expenses[cat] || 0), 0), 0
  );
  const totalNetProfit = totalGrossProfit - totalExpenses;

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
                    <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
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
                    <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
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

                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Title level={5} style={{ color: textColor, margin: 0 }}>Purchase Report (GST Format)</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>{filteredPurchaseData.length} records • Total: <Text strong style={{ color: '#B11E6A' }}>₹{purchaseTotal.toLocaleString()}</Text></Text>
                  </div>
                  <Table
                    size="small"
                    scroll={{ x: 1400 }}
                    dataSource={filteredPurchaseData}
                    columns={[
                      { title: 'Vendor GST No', dataIndex: 'vendor_gst', key: 'vendor_gst', width: 160, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Supplier Name', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: 'Product', dataIndex: 'product', key: 'product', width: 160, render: v => <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', borderRadius: 20 }}>{v}</Tag> },
                      { title: 'State Code', dataIndex: 'state_code', key: 'state_code', width: 90, align: 'center' },
                      { title: 'State Name', dataIndex: 'state_name', key: 'state_name', width: 120 },
                      { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                      { title: 'Original Inv No', dataIndex: 'orig_inv_no', key: 'orig_inv_no', width: 130, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                          <Text>Total Sales Revenue</Text>
                          <Text strong style={{ color: '#B11E6A' }}>₹{totalSales.toLocaleString()}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                          <Text>Cost of Goods Sold (COGS)</Text>
                          <Text strong style={{ color: '#8a1652' }}>- ₹{totalCogs.toLocaleString()}</Text>
                        </div>
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
                              {((totalNetProfit / totalSales) * 100).toFixed(1)}%
                            </Tag>
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
                            const tS = data.reduce((s, r) => s + r.sales, 0);
                            const tG = data.reduce((s, r) => s + r.grossProfit, 0);
                            return (
                              <Table.Summary.Row>
                                <Table.Summary.Cell><Text strong style={{ fontSize: 12 }}>Total</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#D85C9E', fontSize: 12 }}>₹{(tS / 1000).toFixed(0)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell><Text strong style={{ color: '#B11E6A', fontSize: 12 }}>₹{(tG / 1000).toFixed(0)}K</Text></Table.Summary.Cell>
                                <Table.Summary.Cell>
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
        ]}
      />
    </div>
  );
}
