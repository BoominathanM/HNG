import React from 'react';
import { Row, Col, Card, Table, Button, Select, DatePicker, Typography, Space, Tabs } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
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
          <RangePicker style={{ borderRadius: 8 }} />
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

      <Tabs defaultActiveKey="sales">

        {/* ── Sales ── */}
        <TabPane tab="Sales" key="sales">
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Revenue', val: '₹11.2L', color: '#B11E6A', sub: '+14% vs last month' },
              { label: 'Total Orders', val: '67', color: '#8a1652', sub: '+18% vs last month' },
              { label: 'New Clients', val: '21', color: '#C94F8A', sub: '+10% vs last month' },
              { label: 'Avg Order Value', val: '₹16,716', color: '#D85C9E', sub: '-2% vs last month' },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={s.label}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20` }} bodyStyle={{ padding: '16px 14px' }}>
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
                bodyStyle={{ padding: '12px 16px 16px' }}>
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
                bodyStyle={{ padding: '12px 16px' }}>
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
        </TabPane>

        {/* ── Products ── */}
        <TabPane tab="Products" key="products">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title={<Text strong style={{ color: textColor }}>Product Performance</Text>}
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                bodyStyle={{ padding: '12px 16px 16px' }}>
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
                bodyStyle={{ padding: '12px 16px' }}>
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
        </TabPane>

        {/* ── Inventory ── */}
        <TabPane tab="Inventory" key="inventory">
          <Card title={<Text strong style={{ color: textColor }}>Inventory Movement</Text>}
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            bodyStyle={{ padding: '12px 16px 16px' }}>
            <Text style={{ color: '#999' }}>Inventory usage reports will be shown here.</Text>
          </Card>
        </TabPane>

      </Tabs>
    </div>
  );
}
