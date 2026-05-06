import React, { useState } from 'react';
import { Row, Col, Card, Typography, Tag, Table, Progress, List, Avatar, Badge, Timeline, Select } from 'antd';
import {
  ShoppingCartOutlined, DollarOutlined, CarOutlined, UserOutlined,
  WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, RiseOutlined,
} from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import StatCard from '../../components/common/StatCard';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useSelector } from 'react-redux';

const { Title, Text } = Typography;

const salesData = [
  { month: 'Jan', revenue: 42000, orders: 28 },
  { month: 'Feb', revenue: 58000, orders: 35 },
  { month: 'Mar', revenue: 51000, orders: 30 },
  { month: 'Apr', revenue: 76000, orders: 48 },
  { month: 'May', revenue: 69000, orders: 42 },
  { month: 'Jun', revenue: 89000, orders: 56 },
  { month: 'Jul', revenue: 95000, orders: 61 },
];

const productPerformance = [
  { product: 'Soap 50g', qty: 12400, revenue: 260400 },
  { product: 'Shampoo 30ml', qty: 9800, revenue: 251800 },
  { product: 'Dental Kit', qty: 6200, revenue: 496000 },
  { product: 'Conditioner', qty: 5100, revenue: 204000 },
  { product: 'Soap Kit', qty: 3800, revenue: 190000 },
];

const orderStatusData = [
  { name: 'Completed', value: 45, color: '#6b1240' },
  { name: 'In Progress', value: 30, color: '#B11E6A' },
  { name: 'Pending', value: 15, color: '#D85C9E' },
  { name: 'Dispatched', value: 10, color: '#E8A0C4' },
];

const recentOrders = [
  { key: 1, id: 'ORD-2401', client: 'The Grand Hotel', product: 'Soap - Round 50g', qty: 2000, status: 'In Production', amount: '₹42,000' },
  { key: 2, id: 'ORD-2402', client: 'Marriott Mumbai', product: 'Shampoo 30ml Flip', qty: 1500, status: 'Dispatch Ready', amount: '₹38,500' },
  { key: 3, id: 'ORD-2403', client: 'Taj Hotels', product: 'Dental Kit', qty: 3000, status: 'Payment Pending', amount: '₹1,20,000' },
  { key: 4, id: 'ORD-2404', client: 'ITC Hotels', product: 'Soap + Shampoo Kit', qty: 5000, status: 'Completed', amount: '₹2,50,000' },
  { key: 5, id: 'ORD-2405', client: 'Hyatt Regency', product: 'Conditioner 30ml', qty: 2500, status: 'In Production', amount: '₹67,500' },
];

const lowStockItems = [
  { item: 'Soap Base (White)', current: 45, min: 100, unit: 'Kg' },
  { item: 'Shampoo Bottles (Flip)', current: 200, min: 500, unit: 'Pcs' },
  { item: 'Dental Kit Boxes', current: 80, min: 200, unit: 'Pcs' },
];

const statusColor = {
  'In Production': '#B11E6A',
  'Dispatch Ready': '#8a1652',
  'Payment Pending': '#C94F8A',
  'Completed': '#6b1240',
};

const columns = [
  { title: 'Order ID', dataIndex: 'id', key: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
  { title: 'Client', dataIndex: 'client', key: 'client' },
  { title: 'Product', dataIndex: 'product', key: 'product', responsive: ['md'] },
  { title: 'Qty', dataIndex: 'qty', key: 'qty', responsive: ['lg'], render: (v) => v.toLocaleString() },
  {
    title: 'Status', dataIndex: 'status', key: 'status',
    render: (v) => <Tag color={statusColor[v]} style={{ borderRadius: 20, fontWeight: 500 }}>{v}</Tag>
  },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <Text strong>{v}</Text> },
];

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function Dashboard() {
  const [statsFilter, setStatsFilter] = useState('This Month');
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Dashboard" items={[{ label: 'Dashboard' }]} />

      {/* Stat Cards */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Select 
          value={statsFilter} 
          onChange={setStatsFilter} 
          style={{ width: 140 }}
          options={[
            { value: 'Today', label: 'Today' },
            { value: 'This Week', label: 'This Week' },
            { value: 'This Month', label: 'This Month' },
            { value: 'All Time', label: 'All Time' },
          ]}
        />
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Orders', value: '1,248', icon: <ShoppingCartOutlined />, color: '#B11E6A', change: 12 },
          { title: 'Monthly Revenue', value: '₹9.5L', icon: <DollarOutlined />, color: '#8a1652', change: 8 },
          { title: 'Dispatch Ready', value: '34', icon: <CarOutlined />, color: '#C94F8A', change: -3 },
          { title: 'Active Clients', value: '187', icon: <UserOutlined />, color: '#D85C9E', change: 5 },
          { title: 'Total Tasks', value: '142', icon: <CheckCircleOutlined />, color: '#6b1240', change: 8 },
          { title: 'Active Complaints', value: '12', icon: <WarningOutlined />, color: '#ff4d4f', change: 2 },
          { title: 'Upcoming Reminders', value: '25', icon: <ClockCircleOutlined />, color: '#fa8c16', change: 5 },
          { title: "Today's Tasks", value: '28', icon: <ClockCircleOutlined />, color: '#8a1652', change: 4 },
          { title: 'Pending Tasks', value: '15', icon: <WarningOutlined />, color: '#C94F8A', change: -2 },
          { title: 'Completed Tasks', value: '99', icon: <CheckCircleOutlined />, color: '#D85C9E', change: 6 },
        ].map((s, i) => (
          <Col xs={12} sm={12} md={8} lg={4} xl={4} style={{ flex: '1 1 18%', maxWidth: '20%' }} key={s.title}>
            <motion.div {...fadeIn(i * 0.08)}>
              <StatCard {...s} />
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <motion.div {...fadeIn(0.2)}>
            <Card
              title={<Text strong style={{ color: textColor }}>Revenue & Orders Trend</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B11E6A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#B11E6A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="month" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <YAxis tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 8 }}
                    formatter={(v, n) => [n === 'revenue' ? `₹${(v/1000).toFixed(0)}K` : v, n === 'revenue' ? 'Revenue' : 'Orders']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#B11E6A" strokeWidth={2.5} fill="url(#revenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <motion.div {...fadeIn(0.25)}>
            <Card
              title={<Text strong style={{ color: textColor }}>Order Status</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: '12px 16px 16px' } }}
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={3} dataKey="value">
                    {orderStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {orderStatusData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                    <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{d.name} {d.value}%</Text>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Orders + Product Bar Chart */}
        <Col xs={24} xl={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <motion.div {...fadeIn(0.3)}>
              <Card
                title={<Text strong style={{ color: textColor }}>Recent Orders</Text>}
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                styles={{ body: { padding: 0 } }}
              >
                <div className="table-responsive">
                  <Table
                    dataSource={recentOrders}
                    columns={columns}
                    pagination={false}
                    size="small"
                    style={{ background: 'transparent' }}
                  />
                </div>
              </Card>
            </motion.div>

            {/* Product Performance Bar Chart */}
            <motion.div {...fadeIn(0.38)}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Text strong style={{ color: textColor }}>Top Products — Order Volume</Text>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#B11E6A' }} />
                        <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Qty (Pcs)</Text>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#D85C9E' }} />
                        <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Revenue (₹)</Text>
                      </div>
                    </div>
                  </div>
                }
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                styles={{ body: { padding: '8px 16px 16px' } }}
              >
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={productPerformance} margin={{ top: 4, right: 0, left: -10, bottom: 0 }} barGap={4}>
                    <defs>
                      <linearGradient id="barQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#B11E6A" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8e1450" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="barRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D85C9E" stopOpacity={1} />
                        <stop offset="100%" stopColor="#C94F8A" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a3a' : '#f0f0f0'} vertical={false} />
                    <XAxis
                      dataKey="product"
                      tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="qty"
                      tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="rev"
                      orientation="right"
                      tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? '#1E1E2E' : '#fff',
                        border: '1px solid #B11E6A22',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(177,30,106,0.12)',
                      }}
                      formatter={(value, name) =>
                        name === 'qty'
                          ? [value.toLocaleString() + ' Pcs', 'Qty']
                          : ['₹' + value.toLocaleString(), 'Revenue']
                      }
                    />
                    <Bar yAxisId="qty" dataKey="qty" fill="url(#barQty)" radius={[6, 6, 0, 0]} maxBarSize={36} name="qty" />
                    <Bar yAxisId="rev" dataKey="revenue" fill="url(#barRev)" radius={[6, 6, 0, 0]} maxBarSize={36} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </div>
        </Col>

        {/* Right panels */}
        <Col xs={24} xl={8}>
          <Row gutter={[16, 16]}>
            {/* Low Stock */}
            <Col xs={24} sm={12} xl={24}>
              <motion.div {...fadeIn(0.35)}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WarningOutlined style={{ color: '#C94F8A' }} />
                      <Text strong style={{ color: textColor }}>Low Stock Alerts</Text>
                    </div>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  {lowStockItems.map((item) => (
                    <div key={item.item} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: textColor }}>{item.item}</Text>
                        <Text style={{ fontSize: 12, color: '#C94F8A', fontWeight: 600 }}>
                          {item.current}/{item.min} {item.unit}
                        </Text>
                      </div>
                      <Progress
                        percent={Math.round((item.current / item.min) * 100)}
                        showInfo={false}
                        strokeColor={{ '0%': '#8a1652', '100%': '#D85C9E' }}
                        trailColor={isDark ? '#333' : '#f0f0f0'}
                        size="small"
                      />
                    </div>
                  ))}
                </Card>
              </motion.div>
            </Col>

            {/* Recent Activity */}
            <Col xs={24} sm={12} xl={24}>
              <motion.div {...fadeIn(0.4)}>
                <Card
                  title={<Text strong style={{ color: textColor }}>Recent Activity</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  <Timeline
                    items={[
                      { color: '#6b1240', children: <><Text style={{ fontSize: 13 }}>ORD-2404 Completed</Text><br /><Text style={{ fontSize: 11, color: '#999' }}>2 mins ago</Text></> },
                      { color: '#B11E6A', children: <><Text style={{ fontSize: 13 }}>New Order: Marriott Mumbai</Text><br /><Text style={{ fontSize: 11, color: '#999' }}>15 mins ago</Text></> },
                      { color: '#D85C9E', children: <><Text style={{ fontSize: 13 }}>Low stock: Soap Base</Text><br /><Text style={{ fontSize: 11, color: '#999' }}>1 hr ago</Text></> },
                      { color: '#C94F8A', children: <><Text style={{ fontSize: 13 }}>Payment received: Taj Hotels</Text><br /><Text style={{ fontSize: 11, color: '#999' }}>3 hrs ago</Text></> },
                    ]}
                  />
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}
