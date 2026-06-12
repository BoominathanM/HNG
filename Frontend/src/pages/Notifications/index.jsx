import React, { useMemo, useState } from 'react';
import {
  Card, List, Tag, Badge, Button, Typography, Space, Tabs, Spin, Empty, Tooltip, Popconfirm,
} from 'antd';
import {
  BellOutlined, DollarOutlined, WarningOutlined, CarOutlined,
  CheckCircleOutlined, ShoppingCartOutlined, ExclamationCircleOutlined,
  BoxPlotOutlined, DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
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
  useDeleteNotificationMutation,
} from '../../store/api/apiSlice';

const { Text } = Typography;

const TYPE_META = {
  payment_due:  { icon: <DollarOutlined />,           color: '#6b1240', label: 'Payment' },
  low_stock:    { icon: <WarningOutlined />,           color: '#C94F8A', label: 'Stock' },
  dispatch:     { icon: <CarOutlined />,               color: '#8a1652', label: 'Dispatch' },
  task:         { icon: <CheckCircleOutlined />,       color: '#D85C9E', label: 'Task' },
  complaint:    { icon: <ExclamationCircleOutlined />, color: '#b85c00', label: 'Complaint' },
  purchase:     { icon: <ShoppingCartOutlined />,      color: '#1a6b3a', label: 'Purchase' },
  order:        { icon: <BoxPlotOutlined />,           color: '#1a4f8a', label: 'Order' },
  system:       { icon: <BellOutlined />,              color: '#888',    label: 'System' },
  // legacy aliases used by stock/payment query tabs
  stock:        { icon: <WarningOutlined />,           color: '#B11E6A', label: 'Stock' },
  payment:      { icon: <DollarOutlined />,            color: '#6b1240', label: 'Payment' },
};

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.system;
}

export default function Notifications() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifData, isLoading: notifLoading, refetch } = useGetNotificationsQuery({ limit: 200 });
  const { data: stockData } = useGetStockAlertsQuery();
  const { data: paymentData } = useGetPaymentAlertsQuery();

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [deleteNotif] = useDeleteNotificationMutation();

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

  const handleDelete = async (id) => {
    try {
      await deleteNotif(id).unwrap();
      enqueueSnackbar('Notification deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete notification', { variant: 'error' });
    }
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  const buildStockList = () =>
    stockAlerts.map((item) => ({
      _id: item._id,
      type: 'low_stock',
      title: item.currentStock === 0 ? 'Out of Stock' : 'Low Stock Alert',
      message: `${item.itemName} — ${item.currentStock}/${item.minStock} ${item.unit || 'units'}`,
      isRead: false,
      isAlert: true,
    }));

  const buildPaymentList = () => [
    ...(paymentAlerts.overdue || []).map((inv) => ({
      _id: inv._id, type: 'payment', title: 'Overdue Invoice',
      message: `${inv.invoiceNumber} — ₹${inv.balanceDue?.toLocaleString()} overdue (${inv.partyId?.name})`,
      isRead: false, isAlert: true,
    })),
    ...(paymentAlerts.dueSoon || []).map((inv) => ({
      _id: inv._id, type: 'payment', title: 'Payment Due Soon',
      message: `${inv.invoiceNumber} — ₹${inv.balanceDue?.toLocaleString()} due soon (${inv.partyId?.name})`,
      isRead: false, isAlert: true,
    })),
  ];

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'dispatch') return notifications.filter((n) => n.type === 'dispatch' || n.type === 'task' || n.type === 'order');
    if (activeTab === 'purchase') return notifications.filter((n) => n.type === 'purchase');
    if (activeTab === 'complaint') return notifications.filter((n) => n.type === 'complaint' || n.type === 'system');
    return notifications;
  }, [notifications, activeTab]);

  const getTabData = () => {
    if (activeTab === 'stock') return buildStockList();
    if (activeTab === 'payment') return buildPaymentList();
    if (activeTab === 'all') return [...notifications, ...buildStockList(), ...buildPaymentList()];
    return filteredNotifications;
  };

  const displayData = getTabData();
  const stockCount = stockAlerts.length;
  const paymentCount = (paymentAlerts.overdue?.length || 0) + (paymentAlerts.dueSoon?.length || 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb
          title={<>Notification Center <Badge count={unread} style={{ background: '#B11E6A', marginLeft: 8 }} /></>}
          items={[{ label: 'Notifications' }]}
          style={{ marginBottom: 0 }}
        />
        <Space>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} size="small" onClick={refetch} />
          </Tooltip>
          <Button size="small" onClick={handleMarkAllRead}>Mark All Read</Button>
        </Space>
      </div>

      <Card
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: '8px 0' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            { key: 'all',       label: `All${unread ? ` (${unread} new)` : ''}` },
            { key: 'stock',     label: `Stock Alerts${stockCount ? ` (${stockCount})` : ''}` },
            { key: 'payment',   label: `Payment${paymentCount ? ` (${paymentCount})` : ''}` },
            { key: 'dispatch',  label: 'Dispatch / Tasks / Orders' },
            { key: 'purchase',  label: 'Purchase' },
            { key: 'complaint', label: 'Sales / Complaints' },
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
              const meta = getMeta(item.type);
              return (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <List.Item
                    style={{
                      padding: '14px 20px',
                      background: !item.isRead ? (isDark ? `${meta.color}12` : `${meta.color}08`) : 'transparent',
                      borderLeft: !item.isRead ? `3px solid ${meta.color}` : '3px solid transparent',
                      cursor: 'pointer',
                    }}
                    actions={!item.isAlert && item._id ? [
                      <Popconfirm
                        key="del"
                        title="Delete this notification?"
                        onConfirm={(e) => { e?.stopPropagation(); handleDelete(item._id); }}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          style={{ color: '#aaa' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>,
                    ] : []}
                    onClick={async () => {
                      if (!item.isRead && item._id && !item.isAlert) {
                        try { await markRead(item._id).unwrap(); } catch { /* silent */ }
                      }
                    }}
                  >
                    <Space align="start" size={14}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `${meta.color}20`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16, color: meta.color, flexShrink: 0,
                      }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong style={{ color: textColor, fontSize: 14 }}>{item.title}</Text>
                          {!item.isRead && (
                            <Tag style={{
                              background: `${meta.color}22`, color: meta.color,
                              border: `1px solid ${meta.color}44`, borderRadius: 10, fontSize: 11, margin: 0,
                            }}>New</Tag>
                          )}
                          <Tag style={{ fontSize: 11, borderRadius: 8, margin: 0 }}>{getMeta(item.type).label}</Tag>
                        </div>
                        <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 13 }}>{item.message}</Text>
                        {item.createdAt && (
                          <Text style={{ color: '#aaa', fontSize: 11, display: 'block', marginTop: 2 }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </Text>
                        )}
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
