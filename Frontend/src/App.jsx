import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme, Typography } from 'antd';
import enUS from 'antd/locale/en_US';
import { Provider, useSelector } from 'react-redux';
import { SnackbarProvider } from 'notistack';
import { store } from './store';
import AppLayout from './components/layout/AppLayout';
import { lightTheme, darkTheme } from './styles/theme';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useGetMeQuery } from './store/api/apiSlice';
import './styles/global.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Operations from './pages/Operations';
import OperationDetail from './pages/Operations/OperationDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/Tasks/TaskDetail';
import Dispatch from './pages/Dispatch';
import DispatchDetail from './pages/Dispatch/DispatchDetail';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Expenses from './pages/Expenses';
import Purchase from './pages/Purchase';
import Financial from './pages/Financial';
import PartiesLedger from './pages/PartiesLedger';
import VendorsSuppliers from './pages/VendorsSuppliers';
import WhatsAppIntegration from './pages/Integration/WhatsAppIntegration';
import AIIntegration from './pages/Integration/AIIntegration';

const { Text } = Typography;

function PrivateRoute() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  // Re-fetch the logged-in user's profile on each app load so permission /
  // tab-access changes made by an admin take effect without a re-login.
  // (getMe's onQueryStarted dispatches refreshUser to update the auth state.)
  useGetMeQuery(undefined, { skip: !isAuthenticated, refetchOnMountOrArgChange: true });
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function PermissionRoute({ module, children }) {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  // Super Admin and Admin roles bypass all permission checks
  if (!module || user.role === 'Super Admin' || user.role === 'Admin') return children;
  // Normalize permissions in case they're a Mongoose Map instance
  const rawPerms = user.permissions;
  const perms = rawPerms instanceof Map
    ? Object.fromEntries(rawPerms)
    : (rawPerms && typeof rawPerms === 'object' ? rawPerms : {});
  const perm = perms[module];
  if (perm?.read !== true) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <Text strong style={{ fontSize: 20 }}>Access Restricted</Text>
        <Text type="secondary">You don't have permission to access this page. Contact your administrator.</Text>
      </div>
    );
  }
  return children;
}

function ThemedApp() {
  const isDark = useSelector((s) => s.theme.isDark);

  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? darkTheme.token : lightTheme.token,
      }}
    >
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute />}>
              <Route index element={<PermissionRoute module="Dashboard"><Dashboard /></PermissionRoute>} />
              <Route path="/sales" element={<PermissionRoute module="Sales Team"><Sales /></PermissionRoute>} />
              <Route path="/operations" element={<PermissionRoute module="Operations"><Operations /></PermissionRoute>} />
              <Route path="/operations/:id" element={<PermissionRoute module="Operations"><OperationDetail /></PermissionRoute>} />
              <Route path="/tasks" element={<PermissionRoute module="Task Management"><Tasks /></PermissionRoute>} />
              <Route path="/tasks/:id" element={<PermissionRoute module="Task Management"><TaskDetail /></PermissionRoute>} />
              <Route path="/dispatch" element={<PermissionRoute module="Dispatch Team"><Dispatch /></PermissionRoute>} />
              <Route path="/dispatch/:id" element={<PermissionRoute module="Dispatch Team"><DispatchDetail /></PermissionRoute>} />
              <Route path="/staff" element={<PermissionRoute module="Staff Management"><Staff /></PermissionRoute>} />
              <Route path="/inventory" element={<PermissionRoute module="Inventory"><Inventory /></PermissionRoute>} />
              <Route path="/purchase" element={<PermissionRoute module="Purchase"><Purchase /></PermissionRoute>} />
              <Route path="/billing" element={<PermissionRoute module="Billing"><Billing /></PermissionRoute>} />
              <Route path="/parties-ledger" element={<PermissionRoute module="Parties & Ledger"><PartiesLedger /></PermissionRoute>} />
              <Route path="/vendors-suppliers" element={<PermissionRoute module="Vendors & Suppliers"><VendorsSuppliers /></PermissionRoute>} />
              <Route path="/financial" element={<PermissionRoute module="Financial"><Financial /></PermissionRoute>} />
              <Route path="/expenses" element={<PermissionRoute module="Expenses"><Expenses /></PermissionRoute>} />
              <Route path="/reports" element={<PermissionRoute module="Reports"><Reports /></PermissionRoute>} />
              <Route path="/settings" element={<PermissionRoute module="Settings"><Settings /></PermissionRoute>} />
              <Route path="/notifications" element={<PermissionRoute module="Notifications"><Notifications /></PermissionRoute>} />
              <Route path="/integration/whatsapp" element={<PermissionRoute module="Integration"><WhatsAppIntegration /></PermissionRoute>} />
              <Route path="/integration/ai" element={<PermissionRoute module="Integration"><AIIntegration /></PermissionRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ThemedApp />
      </ErrorBoundary>
    </Provider>
  );
}
