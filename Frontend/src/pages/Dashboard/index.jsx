import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Typography, Tag, Table, Progress, Timeline, Select, Spin } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, CarOutlined, UserOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import StatCard from '../../components/common/StatCard';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useSelector } from 'react-redux';
import {
  useGetKPIsQuery,
  useGetRecentOrdersQuery,
  useGetLowStockQuery,
  useGetRevenueTrendQuery,
  useGetOrderStatusQuery,
  useGetTopProductsQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;

const COLORS = ['#6b1240', '#B11E6A', '#D85C9E', '#E8A0C4'];
const fadeIn = (delay = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } });

export default function Dashboard() {
  const [statsFilter, setStatsFilter] = useState('This Month');
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const { data: kpiRaw, isLoading: kpiLoading } = useGetKPIsQuery(statsFilter);
  const { data: ordersRaw, isLoading: ordersLoading } = useGetRecentOrdersQuery();
  const { data: stockRaw } = useGetLowStockQuery();
  const { data: trendRaw } = useGetRevenueTrendQuery();
  const { data: statusRaw } = useGetOrderStatusQuery();
  const { data: productsRaw } = useGetTopProductsQuery();

  const loading = kpiLoading || ordersLoading;
  const kpis = kpiRaw?.data || {};
  const recentOrders = ordersRaw?.data || [];
  const lowStock = stockRaw?.data || [];
  const revenueTrend = trendRaw?.data || [];
  const orderStatus = statusRaw?.data || [];
  const topProducts = productsRaw?.data || [];

  const statCards = [
    { title: 'Total Orders', value: kpis.totalOrders ?? '—', icon: <ShoppingCartOutlined />, color: '#B11E6A', change: 12 },
    { title: 'Monthly Revenue', value: kpis.monthlyRevenue ? `₹${(kpis.monthlyRevenue / 100000).toFixed(1)}L` : '—', icon: <DollarOutlined />, color: '#8a1652', change: 8 },
    { title: 'Dispatch Ready', value: kpis.dispatchReady ?? '—', icon: <CarOutlined />, color: '#C94F8A', change: -3 },
    { title: 'Active Clients', value: kpis.activeClients ?? '—', icon: <UserOutlined />, color: '#D85C9E', change: 5 },
    { title: 'Total Tasks', value: kpis.totalTasks ?? '—', icon: <CheckCircleOutlined />, color: '#6b1240', change: 8 },
    { title: 'Active Complaints', value: kpis.activeComplaints ?? '—', icon: <WarningOutlined />, color: '#ff4d4f', change: 2 },
    { title: 'Upcoming Reminders', value: kpis.upcomingReminders ?? '—', icon: <ClockCircleOutlined />, color: '#fa8c16', change: 5 },
    { title: "Today's Tasks", value: kpis.todaysTasks ?? '—', icon: <ClockCircleOutlined />, color: '#8a1652', change: 4 },
    { title: 'Pending Tasks', value: kpis.pendingTasks ?? '—', icon: <WarningOutlined />, color: '#C94F8A', change: -2 },
    { title: 'Completed Tasks', value: kpis.completedTasks ?? '—', icon: <CheckCircleOutlined />, color: '#D85C9E', change: 6 },
    { title: 'Pending Invoices', value: kpis.pendingInvoices ?? '—', icon: <FileTextOutlined />, color: '#fa541c', change: undefined },
    { title: 'Low Stock Items', value: kpis.lowStockItems ?? '—', icon: <AlertOutlined />, color: '#fa8c16', change: undefined },
  ];

  const orderColumns = [
    { title: 'Order ID', dataIndex: 'orderCode', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'clientName' },
    { title: 'Product', dataIndex: 'product', responsive: ['md'] },
    { title: 'Qty', dataIndex: 'qty', responsive: ['lg'], render: (v) => v?.toLocaleString() },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag style={{ borderRadius: 20 }} color={v === 'Completed' ? '#6b1240' : v === 'Dispatch Ready' ? '#8a1652' : '#B11E6A'}>{v}</Tag> },
    { title: 'Amount', dataIndex: 'total', render: (v) => <Text strong>₹{v?.toLocaleString()}</Text> },
  ];

  const pieData = orderStatus.map((s, i) => ({ name: s._id, value: s.count, color: COLORS[i % COLORS.length] }));
  const barData = topProducts.map((p) => ({ product: p._id, qty: p.qty, revenue: p.revenue }));

  if (loading) return <div className="page-container fade-in" style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>;

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Dashboard" items={[{ label: 'Dashboard' }]} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Select value={statsFilter} onChange={(v) => setStatsFilter(v)} style={{ width: 140 }}
          options={['Today', 'This Week', 'This Month', 'All Time'].map((v) => ({ value: v, label: v }))}
        />
      </div>

      <Row gutter={[16, 16]} className="stat-cards-row" style={{ marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={6} lg={4} xl={4} key={s.title}>
            <motion.div {...fadeIn(i * 0.08)}><StatCard {...s} /></motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <motion.div {...fadeIn(0.2)}>
            <Card title={<Text strong style={{ color: textColor }}>Revenue & Orders Trend</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: '12px 16px 16px' } }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B11E6A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#B11E6A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="month" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <YAxis tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 8 }}
                    formatter={(v, n) => [n === 'revenue' ? `₹${(v / 1000).toFixed(0)}K` : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                  <Area type="monotone" dataKey="revenue" stroke="#B11E6A" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <motion.div {...fadeIn(0.25)}>
            <Card title={<Text strong style={{ color: textColor }}>Order Status</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: '12px 16px 16px' } }}>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                    {pieData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{d.name} {d.value}</Text>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>No orders yet</div>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <motion.div {...fadeIn(0.3)}>
              <Card title={<Text strong style={{ color: textColor }}>Recent Orders</Text>}
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                styles={{ body: { padding: 0 } }}>
                <Table dataSource={recentOrders} columns={orderColumns} rowKey="_id" pagination={false} size="small" />
              </Card>
            </motion.div>

            {barData.length > 0 && (
              <motion.div {...fadeIn(0.38)}>
                <Card title={<Text strong style={{ color: textColor }}>Top Products — Order Volume</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '8px 16px 16px' } }}>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={barData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a3a' : '#f0f0f0'} vertical={false} />
                      <XAxis dataKey="product" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 10 }} />
                      <Bar dataKey="qty" fill="#B11E6A" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="revenue" fill="#D85C9E" radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </motion.div>
            )}
          </div>
        </Col>

        <Col xs={24} xl={8}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={24}>
              <motion.div {...fadeIn(0.35)}>
                <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><WarningOutlined style={{ color: '#C94F8A' }} /><Text strong style={{ color: textColor }}>Low Stock Alerts</Text></div>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '12px 16px' } }}>
                  {lowStock.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>All items are well stocked</Text>
                  ) : (
                    lowStock.map((item) => (
                      <div key={item._id} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, color: textColor }}>{item.itemName}</Text>
                          <Text style={{ fontSize: 12, color: '#C94F8A', fontWeight: 600 }}>{item.currentStock}/{item.minStock} {item.unit}</Text>
                        </div>
                        <Progress percent={Math.round((item.currentStock / item.minStock) * 100)} showInfo={false}
                          strokeColor={{ '0%': '#8a1652', '100%': '#D85C9E' }} trailColor={isDark ? '#333' : '#f0f0f0'} size="small" />
                      </div>
                    ))
                  )}
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} sm={12} xl={24}>
              <motion.div {...fadeIn(0.4)}>
                <Card title={<Text strong style={{ color: textColor }}>Recent Activity</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '12px 16px' } }}>
                  {recentOrders.slice(0, 4).length === 0 ? (
                    <Text type="secondary">No recent activity</Text>
                  ) : (
                    <Timeline items={recentOrders.slice(0, 4).map((o, i) => ({
                      color: COLORS[i % COLORS.length],
                      children: (
                        <>
                          <Text style={{ fontSize: 13 }}>{o.orderCode} — {o.clientName}</Text>
                          <br />
                          <Text style={{ fontSize: 11, color: '#999' }}>{o.status}</Text>
                        </>
                      ),
                    }))} />
                  )}
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}
