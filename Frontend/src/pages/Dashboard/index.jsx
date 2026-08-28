import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Typography, Tag, Table, Progress, Timeline, Select, Spin } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, CarOutlined, UserOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, AlertOutlined, TeamOutlined, ShoppingOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar, ComposedChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import StatCard from '../../components/common/StatCard';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { formatQty } from '../../utils/numberFormat';
import { useSelector } from 'react-redux';
import {
  useGetKPIsQuery,
  useGetRecentOrdersQuery,
  useGetLowStockQuery,
  useGetRevenueTrendQuery,
  useGetOrderStatusQuery,
  useGetTopProductsQuery,
  useGetTaskStatusQuery,
  useGetDispatchesQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;

const COLORS = ['#6b1240', '#B11E6A', '#D85C9E', '#E8A0C4'];
// Single primary-color family (shades of the app's colorPrimary #B11E6A) — used for every stat card.
const PRIMARY_SHADES = ['#6b1240', '#8a1652', '#B11E6A', '#C94F8A', '#D85C9E', '#E8A0C4'];
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
  const { data: taskStatusRaw } = useGetTaskStatusQuery();
  const { data: dispatchesRaw } = useGetDispatchesQuery({ limit: 1000 });

  const loading = kpiLoading || ordersLoading;
  const kpis = kpiRaw?.data || {};
  const recentOrders = ordersRaw?.data || [];
  const lowStock = stockRaw?.data || [];
  const revenueTrend = trendRaw?.data || [];
  const orderStatus = statusRaw?.data || [];
  const topProducts = productsRaw?.data || [];
  const taskStatus = taskStatusRaw?.data || [];

  const statCards = [
    { title: 'Total Orders', value: kpis.totalOrders ?? '—', icon: <ShoppingCartOutlined />, change: 12 },
    { title: 'Monthly Revenue', value: kpis.monthlyRevenue ? `₹${(kpis.monthlyRevenue / 100000).toFixed(1)}L` : '—', icon: <DollarOutlined />, change: 8 },
    { title: 'GST Amount', value: kpis.gstAmount ? `₹${kpis.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—', icon: <FileTextOutlined />, change: undefined },
    { title: 'Dispatch Ready', value: kpis.dispatchReady ?? '—', icon: <CarOutlined />, change: -3 },
    { title: 'Active Clients', value: kpis.activeClients ?? '—', icon: <UserOutlined />, change: 5 },
    { title: 'Total Tasks', value: kpis.totalTasks ?? '—', icon: <CheckCircleOutlined />, change: 8 },
    { title: 'Active Complaints', value: kpis.activeComplaints ?? '—', icon: <WarningOutlined />, change: 2 },
    { title: 'Upcoming Reminders', value: kpis.upcomingReminders ?? '—', icon: <ClockCircleOutlined />, change: 5 },
    { title: "Today's Tasks", value: kpis.todaysTasks ?? '—', icon: <ClockCircleOutlined />, change: 4 },
    { title: 'Pending Tasks', value: kpis.pendingTasks ?? '—', icon: <WarningOutlined />, change: -2 },
    { title: 'Completed Tasks', value: kpis.completedTasks ?? '—', icon: <CheckCircleOutlined />, change: 6 },
    { title: 'Pending Invoices', value: kpis.pendingInvoices ?? '—', icon: <FileTextOutlined />, change: undefined },
    { title: 'Low Stock Items', value: kpis.lowStockItems ?? '—', icon: <AlertOutlined />, change: undefined },
    { title: 'Total Leads', value: kpis.totalLeads ?? '—', icon: <TeamOutlined />, change: 6 },
    { title: 'Pending Purchase Orders', value: kpis.pendingPurchaseOrders ?? '—', icon: <ShoppingOutlined />, change: undefined },
  ].map((c, i) => ({ ...c, color: PRIMARY_SHADES[i % PRIMARY_SHADES.length] }));

  const orderColumns = [
    { title: 'Order ID', dataIndex: 'orderCode', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'clientName' },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag style={{ borderRadius: 20 }} color={v === 'Completed' ? '#6b1240' : v === 'Dispatch Ready' ? '#8a1652' : '#B11E6A'}>{v}</Tag> },
    { title: 'Amount', dataIndex: 'total', render: (v) => <Text strong>₹{v?.toLocaleString()}</Text> },
  ];

  // Dispatch volume over the last 8 months, split by status — rendered as a
  // composed line + area + bar chart. Aggregated client-side by dispatchedAt
  // (fallback createdAt).
  const dispatchTrend = useMemo(() => {
    const list = dispatchesRaw?.data || [];
    const now = dayjs();
    const buckets = [];
    for (let i = 7; i >= 0; i -= 1) {
      const m = now.subtract(i, 'month');
      buckets.push({ key: m.format('YYYY-MM'), month: m.format('MMM'), Packing: 0, Confirmed: 0, Dispatched: 0, total: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    list.forEach((d) => {
      const raw = d.dispatchedAt || d.createdAt;
      if (!raw) return;
      const k = dayjs(raw).format('YYYY-MM');
      if (!(k in idx)) return;
      const s = d.status === 'Dispatched' ? 'Dispatched' : d.status === 'Confirmed' ? 'Confirmed' : 'Packing';
      buckets[idx[k]][s] += 1;
      buckets[idx[k]].total += 1;
    });
    return buckets;
  }, [dispatchesRaw]);

  const pieData = orderStatus.map((s, i) => ({ name: s._id, value: s.count, color: COLORS[i % COLORS.length] }));
  const barData = topProducts.map((p) => ({ product: p._id, qty: p.qty, revenue: p.revenue }));
  const taskStatusData = taskStatus.map((s, i) => ({ name: s._id || 'Unknown', value: s.count, color: COLORS[i % COLORS.length] }));

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
          <Col xs={12} sm={8} md={8} lg={6} xl={5} xxl={5} key={s.title}>
            <motion.div {...fadeIn(i * 0.06)}><StatCard {...s} /></motion.div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} align="stretch" style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <motion.div {...fadeIn(0.2)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Revenue & Orders Trend</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: '12px 16px 16px' } }}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend} stackOffset="none">
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B11E6A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#B11E6A" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="ord" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D85C9E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D85C9E" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                  <XAxis dataKey="month" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <YAxis tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 8 }}
                    formatter={(v, n) => [n === 'Revenue' ? `₹${(v / 1000).toFixed(0)}K` : v, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stackId="1" stroke="#B11E6A" strokeWidth={2} fill="url(#rev)" />
                  <Area type="monotone" dataKey="orders" name="Orders" stackId="1" stroke="#D85C9E" strokeWidth={2} fill="url(#ord)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <motion.div {...fadeIn(0.25)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Order Status</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
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

      {/* Row: Recent Orders | Low Stock Alerts */}
      <Row gutter={[16, 16]} align="stretch" style={{ marginBottom: 16 }}>
        <Col xs={24} xl={16}>
          <motion.div {...fadeIn(0.3)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Recent Orders</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: 0, maxHeight: 340, overflow: 'auto' } }}>
              <Table dataSource={recentOrders} columns={orderColumns} rowKey="_id" pagination={false} size="small" />
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} xl={8}>
          <motion.div {...fadeIn(0.35)} style={{ height: '100%' }}>
            <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><WarningOutlined style={{ color: '#C94F8A' }} /><Text strong style={{ color: textColor }}>Low Stock Alerts</Text></div>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: '12px 16px', maxHeight: 340, overflowY: 'auto' } }}>
              {lowStock.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>All items are well stocked</Text>
              ) : (
                lowStock.map((item) => (
                  <div key={item._id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: textColor }}>{item.itemName}</Text>
                      <Text style={{ fontSize: 12, color: '#C94F8A', fontWeight: 600 }}>{formatQty(item.currentStock)}/{formatQty(item.minStock)} {item.unit}</Text>
                    </div>
                    <Progress percent={Math.round((item.currentStock / item.minStock) * 100)} showInfo={false}
                      strokeColor={{ '0%': '#8a1652', '100%': '#D85C9E' }} trailColor={isDark ? '#333' : '#f0f0f0'} size="small" />
                  </div>
                ))
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Row: Top Products | Recent Activity */}
      <Row gutter={[16, 16]} align="stretch" style={{ marginBottom: 16 }}>
        <Col xs={24} xl={16}>
          <motion.div {...fadeIn(0.38)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Top Products — Order Volume</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: '8px 16px 16px' } }}>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2a2a3a' : '#f0f0f0'} vertical={false} />
                    <XAxis dataKey="product" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="qty" name="Qty" stackId="a" fill="#B11E6A" maxBarSize={44} />
                    <Bar dataKey="revenue" name="Revenue" stackId="a" fill="#D85C9E" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#aaa' }}>No product data yet</div>
              )}
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} xl={8}>
          <motion.div {...fadeIn(0.4)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Recent Activity</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
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

      {/* Row: Dispatch Trend | Task Status */}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16}>
          <motion.div {...fadeIn(0.42)} style={{ height: '100%' }}>
            <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CarOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Dispatch Trend — Last 8 Months</Text></div>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: '12px 16px 16px' } }}>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={dispatchTrend}>
                  <defs>
                    <linearGradient id="dispArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B11E6A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B11E6A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: isDark ? '#aaa' : '#666', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', border: '1px solid #B11E6A22', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#B11E6A" strokeWidth={1.5} fill="url(#dispArea)" />
                  <Bar dataKey="Dispatched" name="Dispatched" barSize={24} fill="#6b1240" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="Confirmed" name="Confirmed" stroke="#D85C9E" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} xl={8}>
          <motion.div {...fadeIn(0.45)} style={{ height: '100%' }}>
            <Card title={<Text strong style={{ color: textColor }}>Task Status</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
              styles={{ body: { padding: '12px 16px 16px' } }}>
              {taskStatusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart
                      data={taskStatusData}
                      cx="50%" cy="50%"
                      innerRadius="20%" outerRadius="100%"
                      startAngle={90} endAngle={-270}
                    >
                      <RadialBar dataKey="value" background cornerRadius={4}>
                        {taskStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </RadialBar>
                      <Tooltip formatter={(v) => [`${v}`, 'Tasks']} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                    {taskStatusData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{d.name} {d.value}</Text>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>No tasks yet</div>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
