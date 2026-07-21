import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import AlertListener from '../alerts/AlertListener';

const { Content } = Layout;

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = useSelector((s) => s.theme.isDark);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: isDark ? '#121212' : '#F8F9FC' }}>
      <AlertListener />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Layout style={{ background: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />
        <Content style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: isDark ? '#121212' : '#F8F9FC',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
