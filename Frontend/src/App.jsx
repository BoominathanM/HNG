import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import enUS from 'antd/locale/en_US';
import { Provider, useSelector } from 'react-redux';
import { SnackbarProvider } from 'notistack';
import { store } from './store';
import AppLayout from './components/layout/AppLayout';
import { lightTheme, darkTheme } from './styles/theme';
import ErrorBoundary from './components/common/ErrorBoundary';
import './styles/global.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Operations from './pages/Operations';
import OperationDetail from './pages/Operations/OperationDetail';
import Tasks from './pages/Tasks';
import Dispatch from './pages/Dispatch';
import DispatchDetail from './pages/Dispatch/DispatchDetail';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Expenses from './pages/Expenses';

function PrivateRoute() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
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
              <Route index element={<Dashboard />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/operations/:id" element={<OperationDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/dispatch" element={<Dispatch />} />
              <Route path="/dispatch/:id" element={<DispatchDetail />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
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
