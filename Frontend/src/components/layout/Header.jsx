import React, { useState } from 'react';
import { Layout, Button, Badge, Avatar, Dropdown, Typography, Space, Drawer, Tag } from 'antd';
import {
  MenuOutlined, BellOutlined, MoonOutlined, SunOutlined,
  UserOutlined, LogoutOutlined, MailOutlined, PhoneOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleTheme, toggleSidebar } from '../../store/slices/themeSlice';
import { useLogoutMutation } from '../../store/api/apiSlice';
import { motion } from 'framer-motion';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

export default function Header({ onMobileMenuOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  const collapsed = useSelector((s) => s.theme.sidebarCollapsed);
  const user = useSelector((s) => s.auth.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logout] = useLogoutMutation();

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

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'My Profile' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ],
    onClick: handleUserMenu,
  };

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
        {/* Desktop collapse */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => dispatch(toggleSidebar())}
          style={{ color: '#B11E6A', fontSize: 20 }}
          className="desktop-only"
        />
        {/* Mobile hamburger */}
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
        <Badge count={3} size="small">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined />}
            style={{
              color: '#B11E6A',
              background: 'rgba(177,30,106,0.06)',
              fontSize: 19,
            }}
          />
        </Badge>

        {/* User */}
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
            <Avatar
              style={{ background: 'linear-gradient(135deg, #B11E6A, #D85C9E)', fontSize: 16 }}
              icon={<UserOutlined />}
              size={34}
            />
            <div className="user-info-text">
              <Text style={{ color: isDark ? '#fff' : '#1a1a2e', fontSize: 15, fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                {user?.name}
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
            icon={<UserOutlined />}
            style={{ background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', fontSize: 30 }}
          />
          <Title level={4} style={{ color: '#fff', marginTop: 12, marginBottom: 2 }}>
            {user?.name || 'Admin User'}
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
                  <Text style={{ color: isDark ? '#fff' : '#1a1a2e', fontSize: 15, fontWeight: 500 }}>{user?.phone || '—'}</Text>
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
