import React, { useState } from 'react';
import {
  Layout, Button, Badge, Avatar, Dropdown, Typography, Space,
  Drawer, Tag, Popover, List, Spin, Empty, Tooltip,
} from 'antd';
import {
  MenuOutlined, BellOutlined, MoonOutlined, SunOutlined,
  UserOutlined, LogoutOutlined, MailOutlined, PhoneOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
  DollarOutlined, WarningOutlined, CarOutlined, CheckCircleOutlined,
  ShoppingCartOutlined, ExclamationCircleOutlined, BoxPlotOutlined,
  CheckOutlined, DeleteOutlined, ClearOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleTheme, toggleSidebar } from '../../store/slices/themeSlice';
import {
  useLogoutMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
} from '../../store/api/apiSlice';
import { motion } from 'framer-motion';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

const TYPE_META = {
  payment_due:  { icon: <DollarOutlined />,          color: '#6b1240', label: 'Payment' },
  low_stock:    { icon: <WarningOutlined />,          color: '#C94F8A', label: 'Stock' },
  dispatch:     { icon: <CarOutlined />,              color: '#8a1652', label: 'Dispatch' },
  task:         { icon: <CheckCircleOutlined />,      color: '#D85C9E', label: 'Task' },
  complaint:    { icon: <ExclamationCircleOutlined />,color: '#b85c00', label: 'Complaint' },
  purchase:     { icon: <ShoppingCartOutlined />,     color: '#1a6b3a', label: 'Purchase' },
  order:        { icon: <BoxPlotOutlined />,          color: '#1a4f8a', label: 'Order' },
  system:       { icon: <BellOutlined />,             color: '#888',    label: 'System' },
};

function getMeta(type) {
  return TYPE_META[type] || TYPE_META.system;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationDropdown({ notifications, loading, isDark, onMarkRead, onMarkAllRead, onDeleteOne, onDeleteAll, onViewAll, onClose }) {
  const bg = isDark ? '#1E1E2E' : '#fff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subColor = isDark ? '#aaa' : '#666';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.08)';
  const hoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(177,30,106,0.04)';

  return (
    <div style={{ width: 440, maxHeight: 500, display: 'flex', flexDirection: 'column', background: bg, overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
        <Text strong style={{ color: textColor, fontSize: 15 }}>Notifications</Text>
        <Space size={4}>
          <Tooltip title="Mark all as read">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#B11E6A', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={onMarkAllRead}
            >
              Mark all read
            </Button>
          </Tooltip>
          <Tooltip title="Delete all notifications">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              style={{ color: '#cf1322', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
              onClick={onDeleteAll}
            >
              Clear all
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : notifications.length === 0 ? (
          <Empty description="No notifications" style={{ padding: 32 }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              const meta = getMeta(item.type);
              return (
                <List.Item
                  style={{
                    padding: '10px 16px',
                    background: !item.isRead ? (isDark ? `${meta.color}12` : `${meta.color}08`) : 'transparent',
                    borderLeft: !item.isRead ? `3px solid ${meta.color}` : '3px solid transparent',
                    transition: 'background 0.2s',
                    alignItems: 'flex-start',
                  }}
                  className="notif-item"
                >
                  <Space align="start" size={10} style={{ width: '100%', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: `${meta.color}20`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, color: meta.color,
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                        <Text strong style={{ color: textColor, fontSize: 13, lineHeight: 1.3 }}>{item.title}</Text>
                        {!item.isRead && (
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: meta.color, flexShrink: 0, display: 'inline-block',
                          }} />
                        )}
                      </div>
                      <Text style={{ color: subColor, fontSize: 12, display: 'block', lineHeight: 1.4 }}
                        ellipsis={{ tooltip: item.message }}>
                        {item.message}
                      </Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{timeAgo(item.createdAt)}</Text>
                    </div>
                  </Space>
                  {/* Per-item action buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    {!item.isRead && (
                      <Tooltip title="Mark as read">
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckOutlined />}
                          style={{ color: '#B11E6A', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          onClick={(e) => { e.stopPropagation(); onMarkRead(item._id); }}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{ color: '#cf1322', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={(e) => { e.stopPropagation(); onDeleteOne(item._id); }}
                      />
                    </Tooltip>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${borderColor}`, textAlign: 'center', flexShrink: 0 }}>
        <Button
          type="link"
          style={{ color: '#B11E6A', fontWeight: 600, fontSize: 13 }}
          onClick={onViewAll}
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
}

export default function Header({ onMobileMenuOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  const collapsed = useSelector((s) => s.theme.sidebarCollapsed);
  const user = useSelector((s) => s.auth.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logout] = useLogoutMutation();

  const { data: notifData, isLoading: notifLoading } = useGetNotificationsQuery(
    { limit: 10 },
    { pollingInterval: 30000, skip: false }
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [deleteOne] = useDeleteNotificationMutation();
  const [deleteAll] = useDeleteAllNotificationsMutation();

  const notifications = notifData?.data || [];
  const unreadCount = notifData?.unreadCount || 0;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // logout mutation clears local auth state even if the API call fails
    }
    navigate('/login', { replace: true });
  };

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      setProfileOpen(true);
    }
  };

  const handleMarkRead = async (id) => {
    try { await markRead(id).unwrap(); } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try { await markAllRead().unwrap(); } catch { /* silent */ }
  };

  const handleDeleteOne = async (id) => {
    try { await deleteOne(id).unwrap(); } catch { /* silent */ }
  };

  const handleDeleteAll = async () => {
    try { await deleteAll().unwrap(); } catch { /* silent */ }
  };

  const handleViewAll = () => {
    setNotifOpen(false);
    navigate('/notifications');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'My Profile' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ],
    onClick: handleUserMenu,
  };

  const popoverContent = (
    <NotificationDropdown
      notifications={notifications}
      loading={notifLoading}
      isDark={isDark}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      onDeleteOne={handleDeleteOne}
      onDeleteAll={handleDeleteAll}
      onViewAll={handleViewAll}
      onClose={() => setNotifOpen(false)}
    />
  );

  return (
    <AntHeader style={{
      background: isDark ? '#1E1E2E' : '#ffffff',
      padding: '0 16px',
      height: 64,
      minHeight: 64,
      lineHeight: 'normal',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: isDark
        ? '0 1px 0 rgba(255,255,255,0.06)'
        : '0 2px 8px rgba(177,30,106,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 12,
      overflow: 'visible',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => dispatch(toggleSidebar())}
          style={{ color: '#B11E6A', fontSize: 20 }}
          className="desktop-only"
        />
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMobileMenuOpen}
          style={{ color: '#B11E6A', fontSize: 20 }}
          className="mobile-only"
        />
      </div>

      {/* Right */}
      <Space size={8}>
        {/* Theme toggle */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            type="text"
            shape="circle"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => dispatch(toggleTheme())}
            style={{
              color: isDark ? '#faad14' : '#B11E6A',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.06)',
              fontSize: 19,
            }}
          />
        </motion.div>

        {/* Notifications */}
        <Popover
          trigger="click"
          open={notifOpen}
          onOpenChange={setNotifOpen}
          placement="bottomRight"
          arrow={false}
          content={popoverContent}
          overlayInnerStyle={{
            padding: 0,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.6)'
              : '0 8px 32px rgba(177,30,106,0.15)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(177,30,106,0.1)',
          }}
          overlayStyle={{ zIndex: 1050 }}
        >
          <motion.div whileTap={{ scale: 0.9 }} style={{ display: 'inline-flex' }}>
            <Badge
              count={unreadCount}
              size="small"
              style={{ background: '#B11E6A' }}
              overflowCount={99}
            >
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined />}
                style={{
                  color: notifOpen ? '#B11E6A' : (isDark ? '#ccc' : '#555'),
                  background: notifOpen
                    ? 'rgba(177,30,106,0.12)'
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.06)'),
                  fontSize: 19,
                }}
              />
            </Badge>
          </motion.div>
        </Popover>

        {/* User */}
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
            <Avatar
              src={user?.avatarUrl || undefined}
              style={{ background: 'linear-gradient(135deg, #B11E6A, #D85C9E)', fontSize: 16 }}
              icon={<UserOutlined />}
              size={34}
            />
            <div className="user-info-text">
              <Text style={{ color: isDark ? '#fff' : '#1a1a2e', fontSize: 15, fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                {user?.fullName || user?.name}
              </Text>
              <Text style={{ color: '#B11E6A', fontSize: 13 }}>{user?.role}</Text>
            </div>
          </div>
        </Dropdown>
      </Space>

      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .user-info-text { display: none; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>

      {/* Profile Drawer */}
      <Drawer
        title={null}
        placement="right"
        size="default"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        styles={{
          body: { padding: 0, background: isDark ? '#1E1E2E' : '#fff', display: 'flex', flexDirection: 'column' },
          header: { display: 'none' },
          wrapper: { boxShadow: '-4px 0 20px rgba(177,30,106,0.12)' },
        }}
      >
        {/* Drawer Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #B11E6A 0%, #D85C9E 100%)',
          padding: '32px 24px 48px',
          position: 'relative',
        }}>
          <Button
            type="text"
            icon={<span style={{ fontSize: 20, color: '#fff', fontWeight: 300 }}>×</span>}
            onClick={() => setProfileOpen(false)}
            style={{ position: 'absolute', top: 12, right: 12, color: '#fff' }}
          />
          <Avatar
            size={72}
            src={user?.avatarUrl || undefined}
            icon={<UserOutlined />}
            style={{ background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', fontSize: 30 }}
          />
          <Title level={4} style={{ color: '#fff', marginTop: 12, marginBottom: 2 }}>
            {user?.fullName || user?.name || 'Admin User'}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
            {user?.role || 'Super Admin'}
          </Text>
        </div>

        {/* Profile Details */}
        <div style={{ padding: '24px 24px 16px', marginTop: -24 }}>
          <div style={{
            background: isDark ? '#2a2a3e' : '#fff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <Text style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Account Info
            </Text>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MailOutlined style={{ color: '#B11E6A', fontSize: 17 }} />
                </div>
                <div>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 13, display: 'block' }}>Email</Text>
                  <Text style={{ color: isDark ? '#fff' : '#1a1a2e', fontSize: 15, fontWeight: 500 }}>{user?.email || '—'}</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhoneOutlined style={{ color: '#B11E6A', fontSize: 17 }} />
                </div>
                <div>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 13, display: 'block' }}>Phone</Text>
                  <Text style={{ color: isDark ? '#fff' : '#1a1a2e', fontSize: 15, fontWeight: 500 }}>{user?.mobile || user?.phone || '—'}</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(177,30,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserOutlined style={{ color: '#B11E6A', fontSize: 17 }} />
                </div>
                <div>
                  <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 13, display: 'block' }}>Role</Text>
                  <Tag color="magenta" style={{ marginTop: 2, fontSize: 14 }}>{user?.role || 'Super Admin'}</Tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div style={{ padding: '0 24px 24px', marginTop: 'auto' }}>
          <Button
            danger
            block
            icon={<LogoutOutlined />}
            onClick={() => {
              setProfileOpen(false);
              handleLogout();
            }}
            style={{ borderRadius: 8, height: 40 }}
          >
            Logout
          </Button>
        </div>
      </Drawer>
    </AntHeader>
  );
}
