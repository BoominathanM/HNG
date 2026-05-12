import React from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Space, Tabs, Divider, DatePicker } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const salesTrend = [
  { month: 'Sep', revenue: 62000, orders: 38, clients: 12 },
  { month: 'Oct', revenue: 78000, orders: 45, clients: 15 },
  { month: 'Nov', revenue: 71000, orders: 42, clients: 13 },
  { month: 'Dec', revenue: 95000, orders: 58, clients: 18 },
  { month: 'Jan', revenue: 89000, orders: 54, clients: 16 },
  { month: 'Feb', revenue: 112000, orders: 67, clients: 21 },
];

const topClients = [
  { key: 1, client: 'ITC Hotels', orders: 24, revenue: '₹6,40,000', growth: '+18%' },
  { key: 2, client: 'Marriott India', orders: 18, revenue: '₹4,20,000', growth: '+12%' },
  { key: 3, client: 'Taj Hotels', orders: 15, revenue: '₹3,80,000', growth: '+22%' },
  { key: 4, client: 'Hyatt', orders: 12, revenue: '₹2,95,000', growth: '+8%' },
];

const productPerf = [
  { product: 'Soap 50g', qty: 45000, revenue: '₹9.45L', margin: '32%' },
  { product: 'Shampoo 30ml', qty: 32000, revenue: '₹8.2L', margin: '28%' },
  { product: 'Dental Kit', qty: 18000, revenue: '₹14.4L', margin: '38%' },
  { product: 'Conditioner', qty: 12000, revenue: '₹4.8L', margin: '25%' },
];

export default function Reports() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tickColor = isDark ? '#aaa' : '#666';

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
        defaultActiveKey="sales"
        items={[
          {
            key: 'sales',
            label: 'Sales',
            children: (
              <>
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                  {[
                    { label: 'Total Revenue', val: '₹11.2L', color: '#B11E6A', sub: '+14% vs last month' },
                    { label: 'Total Orders', val: '67', color: '#8a1652', sub: '+18% vs last month' },
                    { label: 'New Clients', val: '21', color: '#C94F8A', sub: '+10% vs last month' },
                    { label: 'Avg Order Value', val: '₹16,716', color: '#D85C9E', sub: '-2% vs last month' },
                  ].map((s, i) => (
                    <Col xs={12} sm={6} key={s.label}>
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20` }} styles={{ body: { padding: '16px 14px' } }}>
                          <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                          <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', display: 'block' }}>{s.label}</Text>
                          <Text style={{ fontSize: 11, color: s.color }}>{s.sub}</Text>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={16}>
                    <Card title={<Text strong style={{ color: textColor }}>Revenue Trend</Text>}
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px 16px' } }}>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={salesTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                          <YAxis tick={{ fill: tickColor, fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#B11E6A" strokeWidth={2.5} dot={{ r: 4 }} name="Revenue (₹)" />
                          <Line type="monotone" dataKey="orders" stroke="#D85C9E" strokeWidth={2} dot={{ r: 3 }} name="Orders" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card title={<Text strong style={{ color: textColor }}>Top Clients</Text>}
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                      styles={{ body: { padding: '12px 16px' } }}>
                      <Table
                        dataSource={topClients}
                        columns={[
                          { title: 'Client', dataIndex: 'client', render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
                          { title: 'Revenue', dataIndex: 'revenue', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                          { title: 'Growth', dataIndex: 'growth', render: (v) => <Text style={{ color: '#8a1652', fontWeight: 600 }}>{v}</Text> },
                        ]}
                        pagination={false} size="small"
                      />
                    </Card>
                  </Col>
                </Row>
              </>
            ),
          },
          {
            key: 'products',
            label: 'Products',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title={<Text strong style={{ color: textColor }}>Product Performance</Text>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                    styles={{ body: { padding: '12px 16px 16px' } }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={productPerf}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="product" tick={{ fill: tickColor, fontSize: 11 }} />
                        <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Qty (Pcs)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title={<Text strong style={{ color: textColor }}>Product Summary</Text>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                    styles={{ body: { padding: '12px 16px' } }}>
                    <Table
                      dataSource={productPerf.map((p, i) => ({ ...p, key: i }))}
                      columns={[
                        { title: 'Product', dataIndex: 'product', render: (v) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Revenue', dataIndex: 'revenue', render: (v) => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                        { title: 'Margin', dataIndex: 'margin', render: (v) => <Text style={{ color: '#8a1652', fontWeight: 600 }}>{v}</Text> },
                      ]}
                      pagination={false} size="small"
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'gst',
            label: 'GST Report',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Title level={5} style={{ color: textColor }}>GST Sales Summary</Title>
                  <Button icon={<DownloadOutlined />} type="primary" size="small" style={{ background: '#B11E6A', border: 'none' }}>Download GSTR-1</Button>
                </div>
                <Table
                  size="small"
                  dataSource={[
                    { key: 1, type: 'GST Sales (18%)', taxable: '₹4,50,000', cgst: '₹40,500', sgst: '₹40,500', igst: '₹0', total: '₹5,31,000' },
                    { key: 2, type: 'GST Sales (12%)', taxable: '₹1,20,000', cgst: '₹7,200', sgst: '₹7,200', igst: '₹0', total: '₹1,34,400' },
                    { key: 3, type: 'Non-GST Sales', taxable: '₹85,000', cgst: '—', sgst: '—', igst: '—', total: '₹85,000' },
                  ]}
                  columns={[
                    { title: 'Tax Type', dataIndex: 'type', key: 'type' },
                    { title: 'Taxable Val', dataIndex: 'taxable', key: 'taxable' },
                    { title: 'CGST', dataIndex: 'cgst', key: 'cgst' },
                    { title: 'SGST', dataIndex: 'sgst', key: 'sgst' },
                    { title: 'IGST', dataIndex: 'igst', key: 'igst' },
                    { title: 'Total Amount', dataIndex: 'total', key: 'total', render: (v) => <Text strong>{v}</Text> },
                  ]}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'purchase_report',
            label: 'Purchase Report',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Title level={5} style={{ color: textColor }}>Purchase Report (GST Format)</Title>
                  <Space>
                    <DatePicker.RangePicker style={{ width: 260 }} />
                    <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
                    <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                  </Space>
                </div>
                <Table
                  size="small"
                  scroll={{ x: 1400 }}
                  dataSource={[
                    { key: 1, vendor_gst: '27AABCG1234F1Z5', supplier: 'ChemCo India', state_code: '27', state_name: 'Maharashtra', inv_no: 'PUR-8821', orig_inv_no: 'INV-CHEM-101', inv_date: '2024-05-01', inv_value: 10030, total_tax: 1530, taxable: 8500, cgst: 765, sgst: 765, igst: 0 },
                    { key: 2, vendor_gst: '33AABHB5678K1Z2', supplier: 'BioLife Ltd', state_code: '33', state_name: 'Tamil Nadu', inv_no: 'PUR-8825', orig_inv_no: 'INV-BIO-452', inv_date: '2024-05-04', inv_value: 51920, total_tax: 7920, taxable: 44000, cgst: 3960, sgst: 3960, igst: 0 },
                    { key: 3, vendor_gst: '07AABCP9012E1Z8', supplier: 'PlastiPack', state_code: '07', state_name: 'Delhi', inv_no: 'PUR-8831', orig_inv_no: 'INV-PP-203', inv_date: '2024-05-06', inv_value: 2655, total_tax: 405, taxable: 2250, cgst: 202.5, sgst: 0, igst: 202.5 },
                  ]}
                  columns={[
                    { title: 'Vendor GST No', dataIndex: 'vendor_gst', key: 'vendor_gst', width: 160, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'Supplier Name', dataIndex: 'supplier', key: 'supplier', width: 140, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'State Code', dataIndex: 'state_code', key: 'state_code', width: 90, align: 'center' },
                    { title: 'State Name', dataIndex: 'state_name', key: 'state_name', width: 120 },
                    { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                    { title: 'Original Inv No', dataIndex: 'orig_inv_no', key: 'orig_inv_no', width: 130, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                    { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110 },
                    { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 110, render: v => <Text strong>₹{v.toLocaleString()}</Text> },
                    { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 100, render: v => <Text style={{ color: '#fa8c16' }}>₹{v.toLocaleString()}</Text> },
                    { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'CGST', dataIndex: 'cgst', key: 'cgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'SGST', dataIndex: 'sgst', key: 'sgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'IGST', dataIndex: 'igst', key: 'igst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'sales_report',
            label: 'Sales Report',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Title level={5} style={{ color: textColor }}>Sales Report (GST Format)</Title>
                  <Space>
                    <DatePicker.RangePicker style={{ width: 260 }} />
                    <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }}>Excel</Button>
                    <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}>PDF</Button>
                  </Space>
                </div>
                <Table
                  size="small"
                  scroll={{ x: 1400 }}
                  dataSource={[
                    { key: 1, gst_no: '27AAACM9876H1Z4', customer: 'Marriott Mumbai', state_code: '27', state_name: 'Maharashtra', inv_no: 'INV-2401', orig_inv_no: 'QT-2401', inv_date: '2024-01-18', inv_value: 45430, total_tax: 6930, taxable: 38500, cgst: 3465, sgst: 3465, igst: 0 },
                    { key: 2, gst_no: '07AAACT7654D1Z6', customer: 'Taj Hotels Delhi', state_code: '07', state_name: 'Delhi', inv_no: 'INV-2402', orig_inv_no: 'QT-2402', inv_date: '2024-01-17', inv_value: 141600, total_tax: 21600, taxable: 120000, cgst: 0, sgst: 0, igst: 21600 },
                    { key: 3, gst_no: '19AAACI5432G1Z1', customer: 'ITC Grand Kolkata', state_code: '19', state_name: 'West Bengal', inv_no: 'INV-2403', orig_inv_no: 'QT-2403', inv_date: '2024-01-16', inv_value: 250000, total_tax: 0, taxable: 250000, cgst: 0, sgst: 0, igst: 0 },
                  ]}
                  columns={[
                    { title: 'GST No', dataIndex: 'gst_no', key: 'gst_no', width: 160, render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'Customer Name', dataIndex: 'customer', key: 'customer', width: 150, render: v => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                    { title: 'State Code', dataIndex: 'state_code', key: 'state_code', width: 90, align: 'center' },
                    { title: 'State Name', dataIndex: 'state_name', key: 'state_name', width: 130 },
                    { title: 'Invoice No', dataIndex: 'inv_no', key: 'inv_no', width: 110, render: v => <Text style={{ color: '#B11E6A' }}>{v}</Text> },
                    { title: 'Original Inv No', dataIndex: 'orig_inv_no', key: 'orig_inv_no', width: 130, render: v => <Text style={{ color: '#7c3aed' }}>{v}</Text> },
                    { title: 'Invoice Date', dataIndex: 'inv_date', key: 'inv_date', width: 110 },
                    { title: 'Invoice Value', dataIndex: 'inv_value', key: 'inv_value', width: 110, render: v => <Text strong>₹{v.toLocaleString()}</Text> },
                    { title: 'Total Tax', dataIndex: 'total_tax', key: 'total_tax', width: 100, render: v => <Text style={{ color: '#fa8c16' }}>₹{v.toLocaleString()}</Text> },
                    { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', width: 120, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'CGST', dataIndex: 'cgst', key: 'cgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'SGST', dataIndex: 'sgst', key: 'sgst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                    { title: 'IGST', dataIndex: 'igst', key: 'igst', width: 90, render: v => <Text>₹{v.toLocaleString()}</Text> },
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'pl',
            label: 'Profit & Loss',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="Revenue & Expenses" style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text>Total Sales (Net)</Text><Text strong style={{ color: '#52c41a' }}>₹11,20,000</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text>Cost of Goods Sold (COGS)</Text><Text strong style={{ color: '#ff4d4f' }}>- ₹6,40,000</Text></div>
                      <Divider style={{ margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text strong>Gross Profit</Text><Text strong style={{ color: '#B11E6A' }}>₹4,80,000</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 12 }}><Text type="secondary">Operating Expenses</Text><Text style={{ color: '#ff4d4f' }}>- ₹1,20,000</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 12 }}><Text type="secondary">Shipping & Logistics</Text><Text style={{ color: '#ff4d4f' }}>- ₹35,000</Text></div>
                      <Divider style={{ margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(177,30,106,0.05)', padding: '8px 12px', borderRadius: 8 }}><Title level={4} style={{ margin: 0, color: '#B11E6A' }}>Net Profit</Title><Title level={4} style={{ margin: 0, color: '#52c41a' }}>₹3,25,000</Title></div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Branch Comparison" style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={[
                        { branch: 'Coimbatore', revenue: 650000, profit: 180000 },
                        { branch: 'Chennai', revenue: 470000, profit: 145000 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="branch" tick={{ fill: tickColor }} />
                        <YAxis tick={{ fill: tickColor }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#B11E6A" name="Revenue" />
                        <Bar dataKey="profit" fill="#52c41a" name="Profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}
