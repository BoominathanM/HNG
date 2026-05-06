import React, { useState } from 'react';
import { Card, List, Tag, Badge, Button, Typography, Space, Tabs } from 'antd';
import { BellOutlined, DollarOutlined, WarningOutlined, CarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;

const notifications = [
  { id: 1, type: 'payment', icon: <DollarOutlined />, color: '#6b1240', title: 'Payment Received', message: 'Advance payment of ₹60,000 received for ORD-2403 (Taj Hotels)', time: '5 mins ago', read: false },
  { id: 2, type: 'stock', icon: <WarningOutlined />, color: '#C94F8A', title: 'Low Stock Alert', message: 'Soap Base (Transparent) stock at 45 Kg — below minimum of 100 Kg', time: '32 mins ago', read: false },
  { id: 3, type: 'dispatch', icon: <CarOutlined />, color: '#8a1652', title: 'Dispatch Ready', message: 'Order ORD-2402 is ready for dispatch — payment confirmed', time: '1 hr ago', read: false },
  { id: 4, type: 'payment', icon: <DollarOutlined />, color: '#B11E6A', title: 'Payment Reminder', message: 'Outstanding ₹81,600 for INV-2402 (Taj Hotels) — due in 2 days', time: '2 hrs ago', read: true },
  { id: 5, type: 'task', icon: <CheckCircleOutlined />, color: '#D85C9E', title: 'Task Completed', message: 'Packing task TSK-103 completed by Meena Devi for ORD-2403', time: '3 hrs ago', read: true },
  { id: 6, type: 'stock', icon: <WarningOutlined />, color: '#B11E6A', title: 'Out of Stock', message: 'Shampoo Concentrate is out of stock — reorder required immediately', time: '5 hrs ago', read: true },
];

export default function Notifications() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const [activeTab, setActiveTab] = useState('all');

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab || (activeTab === 'dispatch' && n.type === 'task'));

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb
          title={<>Notification Center <Badge count={unread} style={{ background: '#B11E6A', marginLeft: 8 }} /></>}
          items={[{ label: 'Notifications' }]}
          style={{ marginBottom: 0 }}
        />
        <Button size="small">Mark All Read</Button>
      </div>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '8px 0' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            { key: 'all', label: 'All Notifications' },
            { key: 'stock', label: 'Stock Alerts' },
            { key: 'payment', label: 'Payment Updates' },
            { key: 'dispatch', label: 'Dispatch / Tasks' },
          ]}
          style={{ padding: '0 20px' }}
        />
        <List
          dataSource={filteredNotifications}
          renderItem={(item, i) => {
            // In a real app, we'd filter based on active tab.
            // For this UI demo, we'll show based on some logic if needed,
            // but the user just asked for tabs.
            return (
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <List.Item
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${isDark ? '#333' : '#f5f5f5'}`,
                    background: !item.read ? `${item.color}08` : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `${item.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, color: item.color,
                      }}>
                        {item.icon}
                      </div>
                    }
                    title={
                      <Space size={8}>
                        <Text strong style={{ color: textColor }}>{item.title}</Text>
                        {!item.read && <Badge dot style={{ background: '#B11E6A' }} />}
                      </Space>
                    }
                    description={
                      <div>
                        <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 13 }}>{item.message}</Text>
                        <br />
                        <Text style={{ color: '#999', fontSize: 11 }}>{item.time}</Text>
                      </div>
                    }
                  />
                </List.Item>
              </motion.div>
            );
          }}
        />
      </Card>
    </div>
  );
}
