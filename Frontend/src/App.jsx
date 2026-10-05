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
import { canViewModule, canViewTab, firstAccessiblePath, firstSubmodulePath } from './utils/access';
import './styles/global.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Operations from './pages/Operations';
import OperationDetail from './pages/Operations/OperationDetail';
import PackagingInvoices from './pages/Operations/PackagingInvoices';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/Tasks/TaskDetail';
import Dispatch from './pages/Dispatch';
import DispatchDetail from './pages/Dispatch/DispatchDetail';
import StaffList from './pages/Staff/StaffList';
import StaffDetail from './pages/Staff/StaffDetail';
import StaffAttendance from './pages/Staff/Attendance';
import StaffOvertime from './pages/Staff/Overtime';
import StaffPayroll from './pages/Staff/Payroll';
import StaffIncentive from './pages/Staff/Incentive';
import LeaveApprovals from './pages/Staff/approvals/LeaveApprovals';
import PermissionApprovals from './pages/Staff/approvals/PermissionApprovals';
import PunchApprovals from './pages/Staff/approvals/PunchApprovals';
import FineApprovals from './pages/Staff/approvals/FineApprovals';
import ReimbursementApprovals from './pages/Staff/approvals/ReimbursementApprovals';
import PayslipApprovals from './pages/Staff/approvals/PayslipApprovals';
import GeoDashboard from './pages/HrmsGeo/Dashboard';
import GeoCustomers from './pages/HrmsGeo/Customers';
import GeoCustomerDetail from './pages/HrmsGeo/CustomerDetail';
import GeoTravelAllowance from './pages/HrmsGeo/TravelAllowance';
import GeoTasks from './pages/HrmsGeo/Tasks';
import GeoTracking from './pages/HrmsGeo/Tracking';
import GeoTrackingDetail from './pages/HrmsGeo/TrackingDetail';
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
import GSTIntegration from './pages/Integration/GSTIntegration';

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

// `tab` (optional) additionally requires that sub-tab's Settings > Users "Tab
// Access" grant — used by the Staff Management sub-module routes.
function PermissionRoute({ module, tab, children }) {
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
  if (perm?.read !== true || (tab && !canViewTab(user, module, tab))) return <AccessRestricted />;
  return children;
}

function AccessRestricted() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🔒</span>
      <Text strong style={{ fontSize: 20 }}>Access Restricted</Text>
      <Text type="secondary">You don't have permission to access this page. Contact your administrator.</Text>
    </div>
  );
}

// Index route ("/"). If the user can't read Dashboard but has access to another
// module, redirect there instead of showing the "Access Restricted" screen — so
// a refresh on "/" behaves the same as the post-login landing.
function HomeRoute() {
  const user = useSelector((s) => s.auth.user);
  if (canViewModule(user, 'Dashboard')) return <Dashboard />;
  const dest = firstAccessiblePath(user);
  if (dest && dest !== '/') return <Navigate to={dest} replace />;
  // No other accessible module — fall through to the restricted screen.
  return (
    <PermissionRoute module="Dashboard">
      <Dashboard />
    </PermissionRoute>
  );
}

// "/staff", "/staff/approvals", "/hrms-geo" → the first sub-module of `module`
// under that path this user may open.
function SubmoduleHome({ module = 'Staff Management', prefix }) {
  const user = useSelector((s) => s.auth.user);
  const dest = firstSubmodulePath(user, module, prefix);
  return dest ? <Navigate to={dest} replace /> : <AccessRestricted />;
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
              <Route index element={<HomeRoute />} />
              <Route path="/sales" element={<PermissionRoute module="Sales Team"><Sales /></PermissionRoute>} />
              <Route path="/operations" element={<PermissionRoute module="Operations"><Operations /></PermissionRoute>} />
              <Route path="/operations/invoices/:type" element={<PermissionRoute module="Operations"><PackagingInvoices /></PermissionRoute>} />
              <Route path="/operations/:id" element={<PermissionRoute module="Operations"><OperationDetail /></PermissionRoute>} />
              <Route path="/tasks" element={<PermissionRoute module="Task Management"><Tasks /></PermissionRoute>} />
              <Route path="/tasks/:id" element={<PermissionRoute module="Task Management"><TaskDetail /></PermissionRoute>} />
              <Route path="/dispatch" element={<PermissionRoute module="Dispatch Team"><Dispatch /></PermissionRoute>} />
              <Route path="/dispatch/:id" element={<PermissionRoute module="Dispatch Team"><DispatchDetail /></PermissionRoute>} />
              <Route path="/staff" element={<SubmoduleHome />} />
              <Route path="/staff/list" element={<PermissionRoute module="Staff Management" tab="staff_list"><StaffList /></PermissionRoute>} />
              <Route path="/staff/list/:id" element={<PermissionRoute module="Staff Management" tab="staff_list"><StaffDetail /></PermissionRoute>} />
              <Route path="/staff/attendance" element={<PermissionRoute module="Staff Management" tab="attendance"><StaffAttendance /></PermissionRoute>} />
              <Route path="/staff/overtime" element={<PermissionRoute module="Staff Management" tab="overtime"><StaffOvertime /></PermissionRoute>} />
              <Route path="/staff/payroll" element={<PermissionRoute module="Staff Management" tab="payroll"><StaffPayroll /></PermissionRoute>} />
              <Route path="/staff/incentive" element={<PermissionRoute module="Staff Management" tab="incentive"><StaffIncentive /></PermissionRoute>} />
              <Route path="/staff/approvals" element={<SubmoduleHome prefix="/staff/approvals/" />} />
              <Route path="/staff/approvals/leave" element={<PermissionRoute module="Staff Management" tab="approvals_leave"><LeaveApprovals /></PermissionRoute>} />
              <Route path="/staff/approvals/permission" element={<PermissionRoute module="Staff Management" tab="approvals_permission"><PermissionApprovals /></PermissionRoute>} />
              <Route path="/staff/approvals/punch" element={<PermissionRoute module="Staff Management" tab="approvals_punch"><PunchApprovals /></PermissionRoute>} />
              <Route path="/staff/approvals/fine" element={<PermissionRoute module="Staff Management" tab="approvals_fine"><FineApprovals /></PermissionRoute>} />
              <Route path="/staff/approvals/reimbursement" element={<PermissionRoute module="Staff Management" tab="approvals_reimbursement"><ReimbursementApprovals /></PermissionRoute>} />
              <Route path="/staff/approvals/payslip" element={<PermissionRoute module="Staff Management" tab="approvals_payslip"><PayslipApprovals /></PermissionRoute>} />
              <Route path="/hrms-geo" element={<SubmoduleHome module="HRMS Geo" />} />
              <Route path="/hrms-geo/dashboard" element={<PermissionRoute module="HRMS Geo" tab="dashboard"><GeoDashboard /></PermissionRoute>} />
              <Route path="/hrms-geo/customer" element={<PermissionRoute module="HRMS Geo" tab="customer"><GeoCustomers /></PermissionRoute>} />
              <Route path="/hrms-geo/customer/:id" element={<PermissionRoute module="HRMS Geo" tab="customer"><GeoCustomerDetail /></PermissionRoute>} />
              <Route path="/hrms-geo/travel-allowance" element={<PermissionRoute module="HRMS Geo" tab="travel_allowance"><GeoTravelAllowance /></PermissionRoute>} />
              <Route path="/hrms-geo/tasks" element={<PermissionRoute module="HRMS Geo" tab="tasks"><GeoTasks /></PermissionRoute>} />
              <Route path="/hrms-geo/tracking" element={<PermissionRoute module="HRMS Geo" tab="tracking"><GeoTracking /></PermissionRoute>} />
              <Route path="/hrms-geo/tracking/:staffId" element={<PermissionRoute module="HRMS Geo" tab="tracking"><GeoTrackingDetail /></PermissionRoute>} />
              <Route path="/inventory" element={<PermissionRoute module="Inventory"><Inventory /></PermissionRoute>} />
              <Route path="/purchase" element={<PermissionRoute module="Purchase"><Purchase /></PermissionRoute>} />
              <Route path="/billing" element={<PermissionRoute module="Billing"><Billing /></PermissionRoute>} />
              <Route path="/parties-ledger" element={<PermissionRoute module="Ledgers"><PartiesLedger /></PermissionRoute>} />
              <Route path="/vendors-suppliers" element={<PermissionRoute module="Vendors & Suppliers"><VendorsSuppliers /></PermissionRoute>} />
              <Route path="/financial" element={<PermissionRoute module="Financial"><Financial /></PermissionRoute>} />
              <Route path="/expenses" element={<PermissionRoute module="Expenses"><Expenses /></PermissionRoute>} />
              <Route path="/reports" element={<PermissionRoute module="Reports"><Reports /></PermissionRoute>} />
              <Route path="/settings" element={<PermissionRoute module="Settings"><Settings /></PermissionRoute>} />
              <Route path="/notifications" element={<PermissionRoute module="Notifications"><Notifications /></PermissionRoute>} />
              <Route path="/integration/whatsapp" element={<PermissionRoute module="Integration"><WhatsAppIntegration /></PermissionRoute>} />
              <Route path="/integration/ai" element={<PermissionRoute module="Integration"><AIIntegration /></PermissionRoute>} />
              <Route path="/integration/gst" element={<PermissionRoute module="Integration"><GSTIntegration /></PermissionRoute>} />
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
