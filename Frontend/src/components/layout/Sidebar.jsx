import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Badge, Button, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DashboardOutlined, TeamOutlined, ApartmentOutlined, CheckSquareOutlined,
  CarOutlined, UserOutlined, InboxOutlined, DollarOutlined,
  BarChartOutlined, SettingOutlined, BellOutlined, CloseOutlined, RightOutlined, LogoutOutlined,
  ShoppingOutlined, BankOutlined, ApiOutlined, MessageOutlined, RobotOutlined, BookOutlined,
  ContactsOutlined, FileProtectOutlined,
} from '@ant-design/icons';
import { toggleSidebar } from '../../store/slices/themeSlice';
import { useLogoutMutation, useGetCompanySettingsQuery, useGetTasksQuery, useGetNotificationsQuery } from '../../store/api/apiSlice';

const { Sider } = Layout;
const { Text } = Typography;

const DEFAULT_LOGO = '/hng logo new.png';

const ALL_MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', module: 'Dashboard' },
  { key: '/sales', icon: <TeamOutlined />, label: 'Sales Team', module: 'Sales Team' },
  { key: '/operations', icon: <ApartmentOutlined />, label: 'Operations', module: 'Operations' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Task Management', module: 'Task Management' },
  { key: '/dispatch', icon: <CarOutlined />, label: 'Dispatch Team', module: 'Dispatch Team' },
  { key: '/staff', icon: <UserOutlined />, label: 'Staff Management', module: 'Staff Management' },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Inventory', module: 'Inventory' },
  { key: '/purchase', icon: <ShoppingOutlined />, label: 'Purchase', module: 'Purchase' },
  { key: '/vendors-suppliers', icon: <ContactsOutlined />, label: 'Vendors & Suppliers', module: 'Vendors & Suppliers' },
  { key: '/billing', icon: <DollarOutlined />, label: 'Billing', module: 'Billing' },
  { key: '/parties-ledger', icon: <BookOutlined />, label: 'Parties & Ledger', module: 'Parties & Ledger' },
  { key: '/financial', icon: <BankOutlined />, label: 'Financial', module: 'Financial' },
  { key: '/expenses', icon: <DollarOutlined />, label: 'Expenses', module: 'Expenses' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports', module: 'Reports' },
  { key: '/notifications', icon: <BellOutlined />, label: 'Notifications', module: 'Notifications' },
  {
    key: '/integration',
    icon: <ApiOutlined />,
    label: 'Integration',
    module: 'Integration',
    children: [
      { key: '/integration/whatsapp', icon: <MessageOutlined />, label: 'WhatsApp', module: 'Integration' },
      { key: '/integration/ai', icon: <RobotOutlined />, label: 'AI Integration', module: 'Integration' },
      { key: '/integration/gst', icon: <FileProtectOutlined />, label: 'GST Verification', module: 'Integration' },
    ],
  },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings', module: 'Settings' },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const collapsed = useSelector((s) => s.theme.sidebarCollapsed);
  const isDark = useSelector((s) => s.theme.isDark);
  const authUser = useSelector((s) => s.auth.user);
  const [logout] = useLogoutMutation();
  const { data: companyData } = useGetCompanySettingsQuery();
  const companyName = companyData?.data?.companyName || 'Heal N Glow';
  const logoSrc = companyData?.data?.logoUrl || DEFAULT_LOGO;

  // Live badge counts
  const { data: pendingTasksData } = useGetTasksQuery({ status: 'Pending' }, { pollingInterval: 60000 });
  const { data: notifData } = useGetNotificationsQuery({ limit: 10 }, { pollingInterval: 30000 });
  const pendingTaskCount = pendingTasksData?.data?.length || 0;
  const unreadNotifCount = notifData?.unreadCount || 0;

  const getBadge = (key) => {
    if (key === '/tasks') return pendingTaskCount;
    if (key === '/notifications') return unreadNotifCount;
    return 0;
  };

  // Show a sidebar item only when the user has read permission for that module.
  // Matches the deny-by-default logic in PermissionRoute (App.jsx).
  const canView = (module) => {
    if (!authUser) return false;
    if (authUser.role === 'Super Admin' || authUser.role === 'Admin') return true;
    const rawPerms = authUser.permissions;
    const perms = rawPerms instanceof Map
      ? Object.fromEntries(rawPerms)
      : (rawPerms && typeof rawPerms === 'object' ? rawPerms : {});
    return perms[module]?.read === true;
  };

  const menuItems = ALL_MENU_ITEMS.reduce((acc, item) => {
    if (!canView(item.module)) return acc;
    if (item.children) {
      const visibleChildren = item.children.filter(c => canView(c.module));
      if (visibleChildren.length === 0) return acc;
      acc.push({ ...item, children: visibleChildren });
    } else {
      acc.push(item);
    }
    return acc;
  }, []);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // logout mutation clears local auth state even if the API call fails
    }
    navigate('/login', { replace: true });
  };

  const [expandedKeys, setExpandedKeys] = useState(() => {
    const activeParent = ALL_MENU_ITEMS.find(
      (item) => item.children?.some((c) => location.pathname === c.key)
    );
    return new Set(activeParent ? [activeParent.key] : ['/inventory']);
  });

  useEffect(() => {
    const activeParent = ALL_MENU_ITEMS.find((item) =>
      item.children?.some((c) => location.pathname === c.key)
    );
    if (activeParent) {
      setExpandedKeys((prev) => new Set([...prev, activeParent.key]));
    }
  }, [location.pathname]);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const siderStyle = {
    background: isDark ? '#16161e' : '#ffffff',
    borderRight: isDark ? '1px solid #2a2a3a' : '1px solid #f0f0f0',
    boxShadow: '4px 0 16px rgba(0,0,0,0.06)',
    zIndex: 200,
    overflow: 'hidden',
  };

  const renderItem = (item, isChild = false) => {
    const isActive = location.pathname === item.key;
    const hasChildren = !!item.children?.length;
    const isExpanded = expandedKeys.has(item.key);
    const isParentOfActive = item.children?.some((c) => location.pathname === c.key);
    const badgeCount = getBadge(item.key);

    const handleClick = () => {
      if (hasChildren && !collapsed) {
        toggleExpand(item.key);
      } else {
        navigate(item.key);
        onMobileClose?.();
      }
    };

    return (
      <motion.div
        key={item.key}
        whileHover={{ x: collapsed ? 0 : 3 }}
        transition={{ duration: 0.15 }}
      >
        <div
          onClick={handleClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 12,
            padding: collapsed ? '12px 0' : isChild ? '9px 16px 9px 20px' : '10px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            margin: isChild ? '6px 8px' : '2px 8px',
            borderRadius: 10,
            cursor: 'pointer',
            background: isActive
              ? 'linear-gradient(90deg, #8e1450 0%, #B11E6A 45%, #D85C9E 100%)'
              : isParentOfActive && !isActive
              ? isDark ? 'rgba(177,30,106,0.12)' : 'rgba(177,30,106,0.07)'
              : 'transparent',
            boxShadow: isActive ? '0 4px 12px rgba(177,30,106,0.35)' : 'none',
            transition: 'all 0.2s ease',
            position: 'relative',
            borderLeft: isChild && !collapsed
              ? `2px solid ${isActive ? '#D85C9E' : isDark ? '#2a2a3a' : '#f0e0ea'}`
              : 'none',
          }}
          title={collapsed ? item.label : ''}
        >
          {/* Icon */}
          <span style={{
            color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
            fontSize: isChild ? 17 : 20,
            position: 'relative',
            transition: 'color 0.2s',
            flexShrink: 0,
          }}>
            {item.icon}
            {badgeCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -8,
                background: '#ff4d4f', color: '#fff',
                borderRadius: 99, fontSize: 10, fontWeight: 700,
                padding: '0 4px', minWidth: 16, textAlign: 'center',
              }}>{badgeCount > 99 ? '99+' : badgeCount}</span>
            )}
          </span>

          {/* Label */}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
                  fontSize: isChild ? 15 : 15.5,
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  flex: 1,
                  transition: 'color 0.2s',
                }}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Chevron for parent items */}
          {hasChildren && !collapsed && (
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              <RightOutlined />
            </motion.span>
          )}
        </div>

        {/* Children */}
        {hasChildren && !collapsed && (
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="children"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {item.children.map((child) => renderItem(child, true))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* In collapsed mode, render children as flat icons below parent */}
        {hasChildren && collapsed && item.children.map((child) => {
          const childActive = location.pathname === child.key;
          return (
            <div
              key={child.key}
              onClick={() => { navigate(child.key); onMobileClose?.(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 0', margin: '6px 8px', borderRadius: 10, cursor: 'pointer',
                background: childActive
                  ? 'linear-gradient(90deg, #8e1450 0%, #B11E6A 45%, #D85C9E 100%)'
                  : 'transparent',
                boxShadow: childActive ? '0 4px 12px rgba(177,30,106,0.35)' : 'none',
              }}
              title={child.label}
            >
              <span style={{ color: childActive ? '#fff' : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontSize: 17 }}>
                {child.icon}
              </span>
            </div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 199, display: 'block',
          }}
        />
      )}

      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={() => dispatch(toggleSidebar())}
        trigger={null}
        width={260}
        collapsedWidth={72}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) dispatch({ type: 'theme/setSidebarCollapsed', payload: true });
        }}
        style={{
          ...siderStyle,
          height: '100vh',
          position: mobileOpen ? 'fixed' : 'sticky',
          top: 0,
          left: mobileOpen ? 0 : undefined,
        }}
        className={`crm-sidebar${mobileOpen ? ' mobile-open' : ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: collapsed ? '8px' : '8px 12px',
          borderBottom: isDark ? '1px solid #2a2a3a' : '1px solid #f0f0f0',
          position: 'relative',
        }}>
          {mobileOpen && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onMobileClose}
              size="small"
              style={{
                position: 'absolute', top: 8, right: 8,
                color: '#B11E6A',
                background: 'rgba(177,30,106,0.08)',
                borderRadius: 8,
                zIndex: 1,
              }}
            />
          )}
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
              >
                <img
                  src={logoSrc}
                  alt={companyName}
                  onError={(e) => { if (e.target.src !== window.location.origin + DEFAULT_LOGO) e.target.src = DEFAULT_LOGO; }}
                  style={{ height: 90, width: '100%', maxWidth: 210, objectFit: 'contain' }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Tooltip
                  placement="right"
                  title={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 4 }}>
                      <img
                        src={logoSrc}
                        alt={companyName}
                        onError={(e) => { if (e.target.src !== window.location.origin + DEFAULT_LOGO) e.target.src = DEFAULT_LOGO; }}
                        style={{ height: 48, maxWidth: 120, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 4 }}
                      />
                      <span style={{ fontWeight: 600 }}>{companyName}</span>
                    </div>
                  }
                >
                  <img
                    src={logoSrc}
                    alt={companyName}
                    onError={(e) => { if (e.target.src !== window.location.origin + DEFAULT_LOGO) e.target.src = DEFAULT_LOGO; }}
                    style={{ height: 54, width: 54, objectFit: 'contain' }}
                  />
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu */}
        <div style={{ padding: '8px 0', overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0 }}>
          {menuItems.map((item) => renderItem(item))}
        </div>

        {/* Logout Button */}
        <div style={{ 
          flexShrink: 0,
          padding: '16px', 
          borderTop: isDark ? '1px solid #2a2a3a' : '1px solid #f0f0f0',
          width: '100%',
        }}>
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: '#ff4d4f',
              padding: collapsed ? '0' : '0 16px',
            }}
          >
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
        </div>
      </Sider>
    </>
  );
}
