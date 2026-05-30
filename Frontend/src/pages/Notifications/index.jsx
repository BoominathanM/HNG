import React, { useMemo, useState } from 'react';
import { Card, List, Tag, Badge, Button, Typography, Space, Tabs, Spin, Empty } from 'antd';
import { BellOutlined, DollarOutlined, WarningOutlined, CarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { enqueueSnackbar } from 'notistack';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetNotificationsQuery,
  useGetStockAlertsQuery,
  useGetPaymentAlertsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../store/api/apiSlice';

const { Text } = Typography;

const TYPE_ICON = {
  payment: <DollarOutlined />,
  low_stock: <WarningOutlined />,
  dispatch: <CarOutlined />,
  task: <CheckCircleOutlined />,
  stock: <WarningOutlined />,
  system: <BellOutlined />,
};
const TYPE_COLOR = { payment: '#6b1240', low_stock: '#C94F8A', dispatch: '#8a1652', task: '#D85C9E', stock: '#B11E6A', system: '#888' };

export default function Notifications() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifData, isLoading: notifLoading } = useGetNotificationsQuery();
  const { data: stockData } = useGetStockAlertsQuery();
  const { data: paymentData } = useGetPaymentAlertsQuery();

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = notifData?.data || [];
  const stockAlerts = stockData?.data || [];
  const paymentAlerts = paymentData?.data || { overdue: [], dueSoon: [] };

  const loading = notifLoading;

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to mark all as read', { variant: 'error' });
    }
  };

  const filteredNotifications = activeTab === 'all' ? notifications
    : notifications.filter((n) => n.type === activeTab || (activeTab === 'dispatch' && n.type === 'task'));

  const unread = notifications.filter((n) => !n.isRead).length;

  const buildStockList = () =>
    stockAlerts.map((item) => ({
      _id: item._id,
      type: 'low_stock',
      title: item.currentStock === 0 ? 'Out of Stock' : 'Low Stock Alert',
      message: `${item.itemName} — ${item.currentStock}/${item.minStock} ${item.unit}`,
      isRead: false,
    }));

  const buildPaymentList = () => [
    ...(paymentAlerts.overdue || []).map((inv) => ({ _id: inv._id, type: 'payment', title: 'Overdue Invoice', message: `${inv.invoiceNumber} — ₹${inv.balanceDue?.toLocaleString()} overdue (${inv.partyId?.name})`, isRead: false })),
    ...(paymentAlerts.dueSoon || []).map((inv) => ({ _id: inv._id, type: 'payment', title: 'Payment Due Soon', message: `${inv.invoiceNumber} — ₹${inv.balanceDue?.toLocaleString()} due soon (${inv.partyId?.name})`, isRead: false })),
  ];

  const getTabData = () => {
    if (activeTab === 'stock') return buildStockList();
    if (activeTab === 'payment') return buildPaymentList();
    if (activeTab === 'all') return [...filteredNotifications, ...buildStockList(), ...buildPaymentList()];
    return filteredNotifications;
  };

  const displayData = getTabData();

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb
          title={<>Notification Center <Badge count={unread} style={{ background: '#B11E6A', marginLeft: 8 }} /></>}
          items={[{ label: 'Notifications' }]}
          style={{ marginBottom: 0 }}
        />
        <Button size="small" onClick={handleMarkAllRead}>Mark All Read</Button>
      </div>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '8px 0' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            { key: 'all', label: 'All Notifications' },
            { key: 'stock', label: `Stock Alerts${stockAlerts.length ? ` (${stockAlerts.length})` : ''}` },
            { key: 'payment', label: 'Payment Updates' },
            { key: 'dispatch', label: 'Dispatch / Tasks' },
          ]}
          style={{ padding: '0 20px' }}
        />
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : displayData.length === 0 ? (
          <Empty description="No notifications" style={{ padding: 40 }} />
        ) : (
          <List
            dataSource={displayData}
            renderItem={(item, i) => {
              const color = TYPE_COLOR[item.type] || '#888';
              const icon = TYPE_ICON[item.type] || <BellOutlined />;
              return (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <List.Item
                    style={{
                      padding: '14px 20px',
                      background: !item.isRead ? (isDark ? `${color}12` : `${color}08`) : 'transparent',
                      borderLeft: !item.isRead ? `3px solid ${color}` : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                    onClick={async () => {
                      if (!item.isRead && item._id) {
                        try {
                          await markRead(item._id).unwrap();
                        } catch {
                          enqueueSnackbar('Failed to mark as read', { variant: 'error' });
                        }
                      }
                    }}
                  >
                    <Space align="start" size={14}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color, flexShrink: 0 }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong style={{ color: textColor, fontSize: 14 }}>{item.title}</Text>
                          {!item.isRead && <Tag style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 10, fontSize: 11, margin: 0 }}>New</Tag>}
                        </div>
                        <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13 }}>{item.message}</Text>
                        {item.createdAt && <Text style={{ color: '#aaa', fontSize: 11, display: 'block', marginTop: 2 }}>{new Date(item.createdAt).toLocaleString()}</Text>}
                      </div>
                    </Space>
                  </List.Item>
                </motion.div>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
