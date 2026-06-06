import React, { useState, useEffect } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import {
  Row, Col, Card, Form, Input, Select, Switch, Button, Typography,
  Tabs, Tag, Space, Avatar, Modal, Checkbox, Badge, Upload, Divider, Table, Collapse, Tooltip, InputNumber, Empty, Spin
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, UploadOutlined, CheckOutlined, CloseOutlined,
  FileTextOutlined, BgColorsOutlined, FontColorsOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import { MODULE_TAB_DEFS } from '../../constants/moduleTabs';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdatePermissionsMutation,
  useGetDeletedRecordsQuery,
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useUploadLogoMutation,
  useRestoreRecordMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const MODULES = [
  'Dashboard', 'Sales Team', 'Operations', 'Task Management', 'Dispatch Team',
  'Staff Management', 'Inventory', 'Purchase', 'Vendors & Suppliers', 'Billing', 'Parties & Ledger',
  'Financial', 'Expenses', 'Reports', 'Notifications', 'Integration', 'Settings',
];

const MODULE_PERM_TYPES = {
  Dashboard: ['read'],
  'Sales Team': ['read', 'add', 'edit', 'delete'],
  Operations: ['read', 'add', 'edit', 'delete'],
  'Task Management': ['read', 'add', 'edit', 'delete'],
  'Dispatch Team': ['read', 'add', 'edit', 'delete'],
  'Staff Management': ['read', 'add', 'edit', 'delete'],
  Inventory: ['read', 'add', 'edit', 'delete'],
  Purchase: ['read', 'add', 'edit', 'delete'],
  'Vendors & Suppliers': ['read', 'add', 'edit', 'delete'],
  Billing: ['read', 'add', 'edit', 'delete'],
  'Parties & Ledger': ['read', 'add', 'edit', 'delete'],
  Financial: ['read', 'add', 'edit', 'delete'],
  Expenses: ['read', 'add', 'edit', 'delete'],
  Reports: ['read'],
  Notifications: ['read'],
  Integration: ['read', 'add', 'edit', 'delete'],
  Settings: ['read', 'add', 'edit', 'delete'],
};

// Per-module sub-tabs for the "Tab Access" checkboxes. Sourced from the shared
// definition so the keys stored here match what each page's <Tabs> actually
// renders (and what useTabAccess() enforces).
const MODULE_TABS = MODULE_TAB_DEFS;

const VENDOR_ROLES = ['Sticker', 'Box', 'Ziplock'];

const ALL_PERMS = { read: true, add: true, edit: true, delete: true };
const NO_PERMS  = { read: false, add: false, edit: false, delete: false };

const INVOICE_THEMES = [
  { key: 'classic',      name: 'Classic',      desc: 'Clean & minimal',       headerBg: '#ffffff', headerText: '#1a1a2e', accent: '#1a1a2e',  border: '#e0e0e0' },
  { key: 'brand',        name: 'Brand Pink',   desc: 'Company brand color',   headerBg: '#B11E6A', headerText: '#ffffff', accent: '#B11E6A',  border: '#B11E6A33' },
  { key: 'professional', name: 'Professional', desc: 'Dark executive style',  headerBg: '#1a1a2e', headerText: '#ffffff', accent: '#1a1a2e',  border: '#1a1a2e33' },
  { key: 'ocean',        name: 'Ocean Blue',   desc: 'Corporate blue look',   headerBg: '#1e3a5f', headerText: '#ffffff', accent: '#1e3a5f',  border: '#1e3a5f33' },
  { key: 'forest',       name: 'Forest',       desc: 'Trustworthy green',     headerBg: '#1a4731', headerText: '#ffffff', accent: '#1a4731',  border: '#1a473133' },
  { key: 'minimal',      name: 'Minimal',      desc: 'Light & airy layout',   headerBg: '#f5f5f5', headerText: '#555555', accent: '#888888',  border: '#eeeeee' },
];

const INVOICE_FONTS = [
  { key: 'Inter',              name: 'Inter',           sample: 'Aa' },
  { key: 'Roboto',             name: 'Roboto',          sample: 'Aa' },
  { key: 'Poppins',            name: 'Poppins',         sample: 'Aa' },
  { key: "'Open Sans'",        name: 'Open Sans',       sample: 'Aa' },
  { key: 'Montserrat',         name: 'Montserrat',      sample: 'Aa' },
  { key: "'Playfair Display'", name: 'Playfair',        sample: 'Aa' },
  { key: "'Times New Roman'",  name: 'Times New Roman', sample: 'Aa' },
  { key: 'Arial',              name: 'Arial',           sample: 'Aa' },
];

const GST_OPTIONS = [
  { value: 'none',      label: 'None',           desc: 'Do not show any tax on invoice' },
  { value: 'cgst',      label: 'CGST Only',      desc: 'Central GST — intra-state (half rate)' },
  { value: 'sgst',      label: 'SGST Only',      desc: 'State GST — intra-state (half rate)' },
  { value: 'cgst_sgst', label: 'CGST + SGST',    desc: 'Both components for intra-state' },
  { value: 'igst',      label: 'IGST Only',      desc: 'Integrated GST for inter-state' },
  { value: 'all',       label: 'All Components', desc: 'CGST + SGST + IGST (show all)' },
];

const buildPerms = (mods, overrides = {}) =>
  Object.fromEntries(MODULES.map(m => [m, mods.includes(m) ? { ...ALL_PERMS, ...overrides[m] } : { ...NO_PERMS, ...overrides[m] }]));

const initRoles = [
  { key: 1, role: 'Super Admin',      color: '#B11E6A', users: 1, status: 'Active',
    perms: buildPerms(MODULES) },
  { key: 2, role: 'Sales Manager',    color: '#8a1652', users: 3, status: 'Active',
    perms: buildPerms(['Dashboard','Sales Team','Reports'], { 'Sales Team': { read:true,add:true,edit:true,delete:false }, Reports: { read:true,add:false,edit:false,delete:false } }) },
  { key: 3, role: 'Operations Head',  color: '#C94F8A', users: 2, status: 'Active',
    perms: buildPerms(['Dashboard','Operations','Task Management','Inventory'], { Inventory: { read:true,add:true,edit:true,delete:false } }) },
  { key: 4, role: 'Dispatch Manager', color: '#D85C9E', users: 2, status: 'Active',
    perms: buildPerms(['Dashboard','Dispatch Team']) },
  { key: 5, role: 'Finance Manager',  color: '#6b1240', users: 1, status: 'Active',
    perms: buildPerms(['Dashboard','Billing','Reports']) },
  { key: 6, role: 'Sticker',          color: '#B11E6A', users: 0, status: 'Active',
    perms: buildPerms(['Dashboard','Task Management']) },
  { key: 7, role: 'Box',              color: '#8a1652', users: 0, status: 'Active',
    perms: buildPerms(['Dashboard','Task Management']) },
  { key: 8, role: 'Ziplock',          color: '#C94F8A', users: 0, status: 'Active',
    perms: buildPerms(['Dashboard','Task Management']) },
];


export default function Settings() {
  const makeUpload = useCloudinaryUpload();
  const { filterTabs } = useTabAccess('Settings');
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg     = isDark ? '#1E1E2E' : '#ffffff';
  const textColor  = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor= isDark ? '#2a2a3a' : '#f0f0f0';
  const subBg      = isDark ? '#2a2a3a' : '#fafafa';

  // Roles
  const [roles, setRoles]       = useState(initRoles);
  const [newRole, setNewRole]   = useState('');

  // Departments
  const [departments, setDepartments] = useState(['Sales', 'Marketing', 'Operations', 'Dispatch', 'Finance', 'Vendors']);
  const [newDept, setNewDept]         = useState('');

  // Users — RTK Query
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
  const [createUserMutation] = useCreateUserMutation();
  const [updateUserMutation] = useUpdateUserMutation();
  const [deleteUserMutation] = useDeleteUserMutation();
  const [updatePermissionsMutation] = useUpdatePermissionsMutation();

  const users = (usersData?.data || []).map((u) => ({
    key: u._id,
    name: u.fullName,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    department: u.department,
    status: u.status,
    avatar: u.fullName?.[0]?.toUpperCase() || 'U',
    color: '#B11E6A',
    perms: u.permissions
      ? (u.permissions instanceof Map || Array.isArray(u.permissions)
          ? Object.fromEntries(u.permissions)
          : u.permissions)
      : {},
    tabAccess: u.tabAccess || {},
    targets: {
      oldHotel: u.targetOldHotel,
      newHotel: u.targetNewHotel,
      payment: u.targetPayment,
      software: u.targetSoftware,
      people: u.targetPeople,
      rewards: { q1: u.rewardQuarter, q2: u.rewardHalf, q3: u.rewardThreeQtr, full: u.rewardFull },
    },
  }));

  const [addUserOpen, setAddUserOpen] = useState(false);

  // Deleted records — RTK Query
  const { data: deletedData } = useGetDeletedRecordsQuery();
  const [restoreRecordMutation] = useRestoreRecordMutation();
  const deletedRecordsFromApi = (deletedData?.data?.records || []).map((p) => ({
    key: p._id,
    module: p.module,
    name: p.name,
    type: p.type,
    deletedBy: p.deletedBy || 'System',
    deletedAt: p.deletedAt,
  }));

  // Company settings — RTK Query
  const { data: companyData } = useGetCompanySettingsQuery();
  const [updateCompanyMutation] = useUpdateCompanySettingsMutation();
  const [uploadLogoMutation] = useUploadLogoMutation();

  // Form instances for the General + GST tabs (so their Save buttons can persist)
  const [generalForm] = Form.useForm();
  const [gstForm] = Form.useForm();
  const [notifPrefs, setNotifPrefs] = useState({ pay: true, stock: true, dispatch: true, task: true, wa: false, email: false });

  useEffect(() => {
    const s = companyData?.data;
    if (s) {
      if (s.logoUrl) setLogoUrl(s.logoUrl);
      if (s.invoiceTheme) setInvoiceTheme(s.invoiceTheme);
      if (s.invoiceFontStyle) setInvoiceFont(s.invoiceFontStyle);
      if (s.invoiceTerms) setInvoiceTerms(s.invoiceTerms);
      if (s.invoiceFooter) setInvoiceFooter(s.invoiceFooter);
      if (s.gstComponent) setInvoiceGstConfig(s.gstComponent);
      if (s.notifPrefs) setNotifPrefs((p) => ({ ...p, ...s.notifPrefs }));
      if (s.invoiceToggles) {
        const t = s.invoiceToggles instanceof Map ? Object.fromEntries(s.invoiceToggles) : s.invoiceToggles;
        if (t.gstin !== undefined) setInvoiceShowGstin(t.gstin);
        if (t.hsn !== undefined) setInvoiceShowHsn(t.hsn);
        if (t.taxRate !== undefined) setInvoiceShowTaxRate(t.taxRate);
        if (t.logo !== undefined) setInvoiceShowLogo(t.logo);
        if (t.bank !== undefined) setInvoiceShowBank(t.bank);
        if (t.terms !== undefined) setInvoiceShowTerms(t.terms);
        if (t.sign !== undefined) setInvoiceShowSign(t.sign);
      }
      generalForm.setFieldsValue({
        companyName: s.companyName,
        gstNumber: s.gstNumber,
        currency: s.currency || 'INR',
        dateFormat: s.dateFormat || 'DD/MM/YYYY',
        address: s.address,
      });
      gstForm.setFieldsValue({
        defaultGst: String(s.defaultGst || '18'),
        cgst: s.cgst || '9%',
        sgst: s.sgst || '9%',
        igst: s.igst || '18%',
        hsnCode: s.hsnCode || '',
        invoicePrefix: s.invoicePrefix || 'INV-',
      });
    }
  }, [companyData, generalForm, gstForm]);

  // ─── Save handlers (persist via updateCompanySettings) ───
  const persistCompany = async (patch, label) => {
    try {
      await updateCompanyMutation(patch).unwrap();
      enqueueSnackbar(label || 'Settings saved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data || 'Failed to save settings', { variant: 'error' });
    }
  };

  const saveGeneral = () => generalForm.validateFields().then((v) => persistCompany(v, 'General settings saved'));
  const saveGst = () => gstForm.validateFields().then((v) => persistCompany(v, 'GST & Tax settings saved'));
  const saveNotifications = () => persistCompany({ notifPrefs }, 'Notification settings saved');
  const saveInvoiceSettings = () => persistCompany({
    invoiceTheme,
    invoiceFontStyle: invoiceFont,
    gstComponent: invoiceGstConfig,
    invoiceTerms,
    invoiceFooter,
    invoiceToggles: {
      gstin: invoiceShowGstin, hsn: invoiceShowHsn, taxRate: invoiceShowTaxRate,
      logo: invoiceShowLogo, bank: invoiceShowBank, terms: invoiceShowTerms, sign: invoiceShowSign,
    },
  }, 'Invoice settings saved');

  const handleLogoUpload = async (file) => {
    // Local preview immediately, then persist to the server.
    const reader = new FileReader();
    reader.onload = (e) => setLogoUrl(e.target.result);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await uploadLogoMutation(fd).unwrap();
      if (res?.logoUrl) setLogoUrl(res.logoUrl);
      enqueueSnackbar('Logo uploaded', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data || 'Logo upload failed', { variant: 'error' });
    }
    return false;
  };

  const [editingUser, setEditingUser] = useState(null);
  const [userProfilePhotoUrl, setUserProfilePhotoUrl] = useState(null);
  const [userForm] = Form.useForm();
  const watchedDept = Form.useWatch('department', userForm);
  const watchedOldHotel = Form.useWatch('targetOldHotel', userForm) || 0;
  const watchedNewHotel = Form.useWatch('targetNewHotel', userForm) || 0;
  const watchedPayment = Form.useWatch('targetPayment', userForm) || 0;
  const watchedSoftware = Form.useWatch('targetSoftware', userForm) || 0;
  const computedOverallTarget = watchedOldHotel + watchedNewHotel + watchedPayment + watchedSoftware;

  // Logo
  const [logoUrl, setLogoUrl] = useState('/hng logo new.png');

  // Invoice Settings
  const [invoiceTheme, setInvoiceTheme]             = useState('classic');
  const [invoiceFont, setInvoiceFont]               = useState('Inter');
  const [invoiceGstConfig, setInvoiceGstConfig]     = useState('cgst_sgst');
  const [invoiceShowGstin, setInvoiceShowGstin]     = useState(true);
  const [invoiceShowHsn, setInvoiceShowHsn]         = useState(true);
  const [invoiceShowTaxRate, setInvoiceShowTaxRate] = useState(true);
  const [invoiceShowLogo, setInvoiceShowLogo]       = useState(true);
  const [invoiceShowBank, setInvoiceShowBank]       = useState(true);
  const [invoiceShowTerms, setInvoiceShowTerms]     = useState(true);
  const [invoiceShowSign, setInvoiceShowSign]       = useState(false);
  const [invoiceFooter, setInvoiceFooter]           = useState('Thank you for your business!');
  const [invoiceTerms, setInvoiceTerms]             = useState(
    '1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. Payment should be made within the due date mentioned on the invoice.\n4. Interest @ 18% p.a. will be charged on overdue payments.\n5. E. & O.E.'
  );

  const deletedRecords = deletedRecordsFromApi;
  const [deletedSearch, setDeletedSearch] = useState('');
  const [deletedModuleFilter, setDeletedModuleFilter] = useState('all');

  const addRole = (e) => {
    e.preventDefault();
    if (newRole && !roles.some(r => r.role === newRole)) {
      setRoles([...roles, { 
        key: Date.now(), 
        role: newRole, 
        color: '#B11E6A', 
        users: 0, 
        status: 'Active', 
        perms: buildPerms(['Dashboard']) // Default perms
      }]);
      setNewRole('');
    }
  };

  const addDept = (e) => {
    e.preventDefault();
    if (newDept && !departments.includes(newDept)) {
      setDepartments([...departments, newDept]);
      setNewDept('');
    }
  };

  const editUser = (user) => {
    setUserProfilePhotoUrl(null);
    setEditingUser(user);
    setAddUserOpen(true);
  };

  // Populate the user form AFTER the modal (and its Form) has mounted.
  // Calling setFieldsValue before the Form is connected (the modal is lazily
  // rendered) silently drops the values — including page & tab access — so the
  // edit form would open blank. Running it in an effect keyed on the open state
  // guarantees the form is connected when we write to it.
  useEffect(() => {
    if (!addUserOpen) return;
    if (editingUser) {
      userForm.setFieldsValue({
        name: editingUser.name,
        email: editingUser.email,
        mobile: editingUser.mobile,
        role: editingUser.role,
        department: editingUser.department,
        status: editingUser.status,
        targetOldHotel: editingUser.targets?.oldHotel,
        targetNewHotel: editingUser.targets?.newHotel,
        targetPayment: editingUser.targets?.payment,
        targetSoftware: editingUser.targets?.software,
        targetPeople: editingUser.targets?.people,
        reward14: editingUser.targets?.rewards?.q1,
        reward12: editingUser.targets?.rewards?.q2,
        reward34: editingUser.targets?.rewards?.q3,
        rewardFull: editingUser.targets?.rewards?.full,
        perms: editingUser.perms || {},
        tabAccess: editingUser.tabAccess || {},
      });
    } else {
      userForm.resetFields();
    }
  }, [addUserOpen, editingUser, userForm]);

  const addUser = () => {
    userForm.validateFields().then(async (vals) => {
      // perms & tabAccess live inside a lazy Collapse: validateFields() only
      // returns values for module panels that were expanded (mounted). Pull the
      // full store (incl. values set on edit but never expanded) so saving never
      // wipes permissions for modules the admin didn't open.
      const allValues = userForm.getFieldsValue(true);
      const payload = {
        fullName: vals.name,
        email: vals.email,
        mobile: vals.mobile,
        role: vals.role,
        status: vals.status || 'Active',
        department: vals.department,
        password: vals.password,
        targetOldHotel: vals.targetOldHotel,
        targetNewHotel: vals.targetNewHotel,
        targetPayment: vals.targetPayment,
        targetSoftware: vals.targetSoftware,
        targetPeople: vals.targetPeople,
        rewardQuarter: vals.reward14,
        rewardHalf: vals.reward12,
        rewardThreeQtr: vals.reward34,
        rewardFull: vals.rewardFull,
        permissions: allValues.perms || vals.perms || {},
        tabAccess: allValues.tabAccess || vals.tabAccess || {},
        ...(userProfilePhotoUrl ? { avatarUrl: userProfilePhotoUrl } : {}),
      };
      try {
        if (editingUser) {
          await updateUserMutation({ id: editingUser.key, ...payload }).unwrap();
          enqueueSnackbar('User updated', { variant: 'success' });
        } else {
          await createUserMutation(payload).unwrap();
          enqueueSnackbar('User created', { variant: 'success' });
        }
        // RTK Query invalidates the Users tag and refetches automatically.
      } catch (e) {
        enqueueSnackbar(e?.data || 'Failed to save user', { variant: 'error' });
        return;
      }
      userForm.resetFields();
      setEditingUser(null);
      setUserProfilePhotoUrl(null);
      setAddUserOpen(false);
    });
  };

  const removeUser = async (key) => {
    try {
      await deleteUserMutation(key).unwrap();
      enqueueSnackbar('User deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete user', { variant: 'error' });
    }
  };

  const saveFooter = (onCancel) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${borderColor}`, marginTop: 8 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
    </div>
  );

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Settings" items={[{ label: 'Settings' }]} />

      <Tabs
        defaultActiveKey="general"
        items={filterTabs([
          {
            key: 'general',
            label: 'General',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                <Form layout="vertical" form={generalForm}>
                  <Form.Item label={<Text strong style={{ color: textColor }}>Company Logo</Text>} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ width: 100, height: 100, borderRadius: 12, border: `2px dashed ${isDark ? '#444' : '#ddd'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: subBg }}>
                        {logoUrl
                          ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <UserOutlined style={{ fontSize: 32, color: '#ccc' }} />}
                      </div>
                      <div>
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={handleLogoUpload}
                        >
                          <Button icon={<UploadOutlined />} style={{ marginBottom: 8, display: 'block', color: '#B11E6A', borderColor: '#B11E6A55' }}>Upload Logo</Button>
                        </Upload>
                        <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>PNG, JPG up to 2MB</Text>
                        <Text style={{ fontSize: 12, color: '#aaa' }}>Recommended: 200×200px</Text>
                      </div>
                    </div>
                  </Form.Item>
                  <Divider style={{ margin: '4px 0 20px' }} />
                  <Row gutter={16}>
                    <Col xs={24} sm={12}><Form.Item label="Company Name" name="companyName"><Input placeholder="Company name" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="GST Number" name="gstNumber"><Input placeholder="GST number" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Primary Currency" name="currency"><Select><Option value="INR">₹ Indian Rupee</Option><Option value="USD">$ US Dollar</Option></Select></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Date Format" name="dateFormat"><Select><Option value="DD/MM/YYYY">DD/MM/YYYY</Option><Option value="MM/DD/YYYY">MM/DD/YYYY</Option></Select></Form.Item></Col>
                    <Col xs={24}><Form.Item label="Business Address" name="address"><Input.TextArea rows={3} placeholder="Business address" /></Form.Item></Col>
                  </Row>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16 }}>
                    <Button onClick={() => generalForm.resetFields()}>Cancel</Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveGeneral} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Settings</Button>
                  </div>
                </Form>
              </Card>
            ),
          },
          {
            key: 'users',
            label: 'User Management',
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); setUserProfilePhotoUrl(null); setAddUserOpen(true); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add User</Button>
                </div>
                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={users}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    style={{ borderRadius: 14, overflow: 'hidden' }}
                    columns={[
                      {
                        title: 'User',
                        key: 'user',
                        render: (_, user) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar size={36} style={{ background: `linear-gradient(135deg,${user.color},${user.color}99)`, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{user.avatar}</Avatar>
                            <div>
                              <Text strong style={{ color: textColor, display: 'block', fontSize: 14 }}>{user.name}</Text>
                              <Text style={{ fontSize: 12, color: '#aaa' }}>{user.email}</Text>
                            </div>
                          </div>
                        ),
                      },
                      {
                        title: 'Department',
                        dataIndex: 'department',
                        key: 'department',
                        render: (dept) => <Text style={{ fontSize: 13, color: textColor }}>{dept || '-'}</Text>,
                      },
                      {
                        title: 'Role',
                        dataIndex: 'role',
                        key: 'role',
                        render: (role) => {
                          const color = roles.find(r => r.role === role)?.color || '#B11E6A';
                          return <Tag style={{ borderRadius: 20, fontSize: 11, background: `${color}18`, color, border: `1px solid ${color}33`, margin: 0 }}>{role}</Tag>;
                        },
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => <Badge status={status === 'Active' ? 'success' : 'default'} text={<Text style={{ fontSize: 13, color: textColor }}>{status}</Text>} />,
                      },
                      {
                        title: '',
                        key: 'actions',
                        width: 80,
                        render: (_, user) => (
                          <Space>
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => editUser(user)} style={{ color: '#B11E6A' }} />
                            <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeUser(user.key)} style={{ color: '#ff4d4f' }} />
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>

                <Modal
                  open={addUserOpen}
                  onCancel={() => { setAddUserOpen(false); setEditingUser(null); userForm.resetFields(); setUserProfilePhotoUrl(null); }}
                  footer={null}
                  width={Math.min(760, window.innerWidth - 24)}
                  centered
                  style={{ top: 20 }}
                  title={<Text strong style={{ fontSize: 18 }}>{editingUser ? 'Edit User' : 'Add New User'}</Text>}
                >
                  <div style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: 10, paddingBottom: 10 }}>
                    <Form form={userForm} layout="vertical" style={{ marginTop: 16 }}>
                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="Enter full name" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                            <Input placeholder="Enter email" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} sm={8}>
                          <Form.Item label="Mobile" name="mobile" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="Enter mobile number" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Form.Item label="Department" name="department" rules={[{ required: true, message: 'Required' }]}>
                            <Select 
                              placeholder="Select Dept" 
                              style={{ width: '100%', height: 40 }}
                              dropdownRender={(menu) => (
                                <div style={{ padding: '4px 0' }}>
                                  {menu}
                                  <Divider style={{ margin: '4px 0' }} />
                                  <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
                                    <Input
                                      placeholder="New Dept"
                                      value={newDept}
                                      size="small"
                                      onChange={(e) => setNewDept(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      style={{ flex: 1 }}
                                    />
                                    <Button type="text" size="small" icon={<PlusOutlined />} onClick={addDept} style={{ color: '#B11E6A' }}>
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              )}
                            >
                              {departments.map(d => <Option key={d} value={d}>{d}</Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Required' }]}>
                            <Select
                              placeholder="Select role"
                              style={{ width: '100%', height: 40 }}
                              dropdownRender={(menu) => (
                                <div style={{ padding: '4px 0' }}>
                                  {menu}
                                  <Divider style={{ margin: '4px 0' }} />
                                  <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
                                    <Input
                                      placeholder="New Role"
                                      value={newRole}
                                      size="small"
                                      onChange={(e) => setNewRole(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      style={{ flex: 1 }}
                                    />
                                    <Button type="text" size="small" icon={<PlusOutlined />} onClick={addRole} style={{ color: '#B11E6A' }}>
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              )}
                            >
                              {(watchedDept === 'Vendors'
                                ? roles.filter(r => VENDOR_ROLES.includes(r.role))
                                : roles.filter(r => !VENDOR_ROLES.includes(r.role))
                              ).map(r => <Option key={r.key} value={r.role}>{r.role}</Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      {(watchedDept === 'Sales' || watchedDept === 'Marketing') && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: subBg, padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #B11E6A22' }}>
                          <Text strong style={{ color: '#B11E6A', display: 'block', marginBottom: 12 }}>Performance Targets & Rewards</Text>
                          <Row gutter={16}>
                            <Col xs={24} sm={12}>
                              <Form.Item label="Old Hotel Sales Target (₹)" name="targetOldHotel">
                                <InputNumber prefix="₹" style={{ width: '100%', height: 40, borderRadius: 8 }} placeholder="500,000" min={0} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="New Hotel Sales Target (₹)" name="targetNewHotel">
                                <InputNumber prefix="₹" style={{ width: '100%', height: 40, borderRadius: 8 }} placeholder="1,000,000" min={0} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="Payment Target (₹)" name="targetPayment">
                                <InputNumber prefix="₹" style={{ width: '100%', height: 40, borderRadius: 8 }} placeholder="800,000" min={0} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="Software Target — New (₹)" name="targetSoftware">
                                <InputNumber prefix="₹" style={{ width: '100%', height: 40, borderRadius: 8 }} placeholder="200,000" min={0} />
                              </Form.Item>
                            </Col>
                          </Row>

                          {/* Overall computed target */}
                          <div style={{ background: '#B11E6A12', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #B11E6A33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>Overall Target (Auto-Computed)</Text>
                            <Text strong style={{ fontSize: 20, color: '#B11E6A' }}>₹{computedOverallTarget.toLocaleString()}</Text>
                          </div>

                          {watchedDept === 'Sales' && (
                            <Form.Item label="Target People (Leads/Parties)" name="targetPeople" style={{ marginBottom: 12 }}>
                              <InputNumber style={{ width: '100%', height: 40, borderRadius: 8 }} placeholder="50" min={0} />
                            </Form.Item>
                          )}

                          <Divider style={{ margin: '8px 0 16px' }} />
                          <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Price Rewards based on Target Completion milestones:</Text>
                          <Row gutter={12}>
                            <Col xs={12} sm={6}><Form.Item label="1/4 Target Reward" name="reward14"><Input placeholder="Reward Name" size="small" /></Form.Item></Col>
                            <Col xs={12} sm={6}><Form.Item label="1/2 Target Reward" name="reward12"><Input placeholder="Reward Name" size="small" /></Form.Item></Col>
                            <Col xs={12} sm={6}><Form.Item label="3/4 Target Reward" name="reward34"><Input placeholder="Reward Name" size="small" /></Form.Item></Col>
                            <Col xs={12} sm={6}><Form.Item label="Full Target Reward" name="rewardFull"><Input placeholder="Reward Name" size="small" /></Form.Item></Col>
                          </Row>
                        </motion.div>
                      )}

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Password" name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}>
                            <Input.Password placeholder="Min 6 characters" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Confirm Password" name="confirm" rules={[{ required: true, message: 'Required' }]}>
                            <Input.Password placeholder="Confirm password" style={{ borderRadius: 8, height: 40 }} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Status" name="status" initialValue="Active" rules={[{ required: true, message: 'Required' }]}>
                            <Select style={{ height: 40 }}>
                              <Option value="Active">Active</Option>
                              <Option value="Inactive">Inactive</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Profile Photo">
                            <Upload
                              showUploadList={false}
                              customRequest={makeUpload('settings/profiles')}
                              onChange={(info) => {
                                if (info.file.status === 'done' && info.file.url) {
                                  setUserProfilePhotoUrl(info.file.url);
                                  enqueueSnackbar('Photo uploaded', { variant: 'success' });
                                }
                              }}
                            >
                              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, width: '100%', height: 40 }}>
                                {userProfilePhotoUrl ? 'Photo Uploaded ✓' : 'Upload Image'}
                              </Button>
                            </Upload>
                          </Form.Item>
                        </Col>
                      </Row>

                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Page &amp; Tab Access Permissions</Text>
                        <Collapse
                          ghost
                          expandIconPosition="end"
                          style={{ background: subBg, borderRadius: 8, border: `1px solid ${borderColor}` }}
                          items={MODULES.map(mod => ({
                            key: mod,
                            label: <Text strong style={{ fontSize: 13 }}>{mod}</Text>,
                            children: (
                              <div>
                                {/* Page-level CRUD permissions */}
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                  {MODULE_PERM_TYPES[mod].includes('read') && (
                                    <Form.Item name={['perms', mod, 'read']} valuePropName="checked" style={{ margin: 0 }}>
                                      <Checkbox>Read</Checkbox>
                                    </Form.Item>
                                  )}
                                  {MODULE_PERM_TYPES[mod].includes('add') && (
                                    <Form.Item name={['perms', mod, 'add']} valuePropName="checked" style={{ margin: 0 }}>
                                      <Checkbox>Add</Checkbox>
                                    </Form.Item>
                                  )}
                                  {MODULE_PERM_TYPES[mod].includes('edit') && (
                                    <Form.Item name={['perms', mod, 'edit']} valuePropName="checked" style={{ margin: 0 }}>
                                      <Checkbox>Edit</Checkbox>
                                    </Form.Item>
                                  )}
                                  {MODULE_PERM_TYPES[mod].includes('delete') && (
                                    <Form.Item name={['perms', mod, 'delete']} valuePropName="checked" style={{ margin: 0 }}>
                                      <Checkbox>Delete</Checkbox>
                                    </Form.Item>
                                  )}
                                </div>
                                {/* Tab-level access */}
                                {MODULE_TABS[mod]?.length > 0 && (
                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${borderColor}` }}>
                                    <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Tab Access:</Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                      {MODULE_TABS[mod].map(tab => (
                                        <Form.Item key={tab.key} name={['tabAccess', mod, tab.key]} valuePropName="checked" style={{ margin: 0 }}>
                                          <Checkbox style={{ fontSize: 12 }}>{tab.label}</Checkbox>
                                        </Form.Item>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ),
                          }))}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: `1px solid ${borderColor}`, paddingTop: 16 }}>
                        <Button onClick={() => { setAddUserOpen(false); setEditingUser(null); userForm.resetFields(); }} style={{ borderRadius: 8 }}>Cancel</Button>
                        <Button type="primary" onClick={addUser} style={{ background: '#b91c1c', border: 'none', borderRadius: 8 }}>{editingUser ? 'Save Changes' : 'Add User'}</Button>
                      </div>
                    </Form>
                  </div>
                </Modal>
              </>
            ),
          },
          {
            key: 'notifications',
            label: 'Notifications',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                <Form layout="vertical">
                  {[
                    { label: 'Payment Reminders',    desc: 'Alert when invoices are overdue or due soon', key: 'pay',      default: true  },
                    { label: 'Low Stock Alerts',     desc: 'Notify when inventory falls below minimum',   key: 'stock',    default: true  },
                    { label: 'Dispatch Reminders',   desc: 'Remind team when orders are ready to ship',   key: 'dispatch', default: true  },
                    { label: 'Task Notifications',   desc: 'Updates when tasks are assigned or completed', key: 'task',    default: true  },
                    { label: 'WhatsApp Notifications', desc: 'Send alerts via WhatsApp Business',         key: 'wa',      default: false },
                    { label: 'Email Notifications',  desc: 'Send daily summary emails to managers',       key: 'email',   default: false },
                  ].map((n, i) => (
                    <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 5 ? `1px solid ${borderColor}` : 'none' }}>
                      <div>
                        <Text strong style={{ color: textColor, display: 'block', fontSize: 14 }}>{n.label}</Text>
                        <Text style={{ fontSize: 12, color: '#aaa' }}>{n.desc}</Text>
                      </div>
                      <Switch checked={notifPrefs[n.key]} onChange={(v) => setNotifPrefs((p) => ({ ...p, [n.key]: v }))} style={{ background: notifPrefs[n.key] ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 8 }}>
                    <Button>Cancel</Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveNotifications} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
                  </div>
                </Form>
              </Card>
            ),
          },
          {
            key: 'gst',
            label: 'GST & Tax',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                <Form layout="vertical" form={gstForm}>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Default GST Rate" name="defaultGst">
                        <Select>
                          <Option value="5">5%</Option>
                          <Option value="12">12%</Option>
                          <Option value="18">18%</Option>
                          <Option value="28">28%</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}><Form.Item label="CGST" name="cgst"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="SGST" name="sgst"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="IGST (Interstate)" name="igst"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="HSN Code (Default)" name="hsnCode"><Input placeholder="Ex: 3401" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Tax Invoice Prefix" name="invoicePrefix"><Input /></Form.Item></Col>
                  </Row>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 4 }}>
                    <Button onClick={() => gstForm.resetFields()}>Cancel</Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={saveGst} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
                  </div>
                </Form>
              </Card>
            ),
          },
          {
            key: 'invoice_settings',
            label: <Space><FileTextOutlined />Invoice Settings</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* ── Theme ── */}
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  title={
                    <Space>
                      <BgColorsOutlined style={{ color: '#B11E6A' }} />
                      <Text strong style={{ color: textColor }}>Invoice Theme</Text>
                    </Space>
                  }
                >
                  <Text style={{ fontSize: 13, color: '#aaa', display: 'block', marginBottom: 16 }}>
                    Select the visual style for your generated invoices
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {INVOICE_THEMES.map(theme => {
                      const selected = invoiceTheme === theme.key;
                      return (
                        <div
                          key={theme.key}
                          onClick={() => setInvoiceTheme(theme.key)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: 12,
                            border: selected ? '2px solid #B11E6A' : `2px solid ${borderColor}`,
                            overflow: 'hidden',
                            width: 148,
                            flexShrink: 0,
                            transition: 'all 0.2s',
                            boxShadow: selected ? '0 4px 16px rgba(177,30,106,0.22)' : '0 2px 8px rgba(0,0,0,0.06)',
                            background: '#fff',
                          }}
                        >
                          {/* Mini invoice header */}
                          <div style={{ background: theme.headerBg, padding: '8px 10px', borderBottom: `1px solid ${theme.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ width: 32, height: 5, background: theme.headerText, borderRadius: 3, opacity: 0.85, marginBottom: 3 }} />
                                <div style={{ width: 22, height: 3, background: theme.headerText, borderRadius: 2, opacity: 0.45 }} />
                              </div>
                              <div style={{ width: 22, height: 22, borderRadius: 4, background: `${theme.headerText}22` }} />
                            </div>
                          </div>
                          {/* Mini invoice body */}
                          <div style={{ padding: '8px 10px', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <div style={{ width: 38, height: 3, background: '#e8e8e8', borderRadius: 2 }} />
                              <div style={{ width: 22, height: 3, background: theme.accent, borderRadius: 2, opacity: 0.65 }} />
                            </div>
                            {[36, 48, 28].map((w, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <div style={{ width: w, height: 2.5, background: '#f0f0f0', borderRadius: 2 }} />
                                <div style={{ width: 18, height: 2.5, background: '#f0f0f0', borderRadius: 2 }} />
                              </div>
                            ))}
                            <div style={{ borderTop: `1px solid ${theme.accent}33`, marginTop: 6, paddingTop: 5, display: 'flex', justifyContent: 'flex-end' }}>
                              <div style={{ width: 38, height: 5, background: theme.accent, borderRadius: 3, opacity: 0.75 }} />
                            </div>
                          </div>
                          {/* Label */}
                          <div style={{ padding: '6px 10px', background: isDark ? '#1a1a2e' : '#fafafa', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text style={{ fontSize: 12, fontWeight: 600, color: selected ? '#B11E6A' : textColor, display: 'block', lineHeight: 1.3 }}>{theme.name}</Text>
                              <Text style={{ fontSize: 10, color: '#aaa' }}>{theme.desc}</Text>
                            </div>
                            {selected && <CheckOutlined style={{ fontSize: 11, color: '#B11E6A' }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* ── Font ── */}
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  title={
                    <Space>
                      <FontColorsOutlined style={{ color: '#B11E6A' }} />
                      <Text strong style={{ color: textColor }}>Invoice Font</Text>
                    </Space>
                  }
                >
                  <Text style={{ fontSize: 13, color: '#aaa', display: 'block', marginBottom: 16 }}>
                    Choose the typeface used across your invoice
                  </Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {INVOICE_FONTS.map(font => {
                      const selected = invoiceFont === font.key;
                      return (
                        <div
                          key={font.key}
                          onClick={() => setInvoiceFont(font.key)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: 10,
                            border: selected ? '2px solid #B11E6A' : `2px solid ${borderColor}`,
                            padding: '10px 16px',
                            minWidth: 100,
                            textAlign: 'center',
                            background: selected ? '#B11E6A08' : cardBg,
                            transition: 'all 0.2s',
                            boxShadow: selected ? '0 2px 10px rgba(177,30,106,0.18)' : 'none',
                          }}
                        >
                          <div style={{ fontFamily: font.key, fontSize: 24, fontWeight: 500, color: selected ? '#B11E6A' : textColor, lineHeight: 1 }}>{font.sample}</div>
                          <Text style={{ fontSize: 11, color: selected ? '#B11E6A' : '#aaa', display: 'block', marginTop: 4, fontWeight: selected ? 600 : 400 }}>{font.name}</Text>
                        </div>
                      );
                    })}
                  </div>
                  {/* Live preview */}
                  <div style={{ marginTop: 18, background: subBg, borderRadius: 10, padding: '14px 18px', border: `1px solid ${borderColor}` }}>
                    <Text style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 8 }}>Preview</Text>
                    <div style={{ fontFamily: invoiceFont, color: textColor }}>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Tax Invoice #INV-0042</div>
                      <div style={{ fontSize: 13, color: '#888' }}>Heal N Glow &nbsp;·&nbsp; 29ABCDE1234F1Z5 &nbsp;·&nbsp; 26 May 2026</div>
                      <div style={{ fontSize: 12, marginTop: 8, color: '#aaa' }}>Product description — Qty × Rate = Amount</div>
                    </div>
                  </div>
                </Card>

                {/* ── GST ── */}
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  title={
                    <Space>
                      <span style={{ fontSize: 16 }}>%</span>
                      <Text strong style={{ color: textColor }}>GST & Tax Display</Text>
                    </Space>
                  }
                >
                  <Text style={{ fontSize: 13, color: '#aaa', display: 'block', marginBottom: 20 }}>
                    Configure which tax components appear on the printed invoice
                  </Text>

                  {/* Tax component selection */}
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ color: textColor, display: 'block', marginBottom: 12, fontSize: 13 }}>Tax Components on Invoice</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {GST_OPTIONS.map(opt => {
                        const selected = invoiceGstConfig === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => setInvoiceGstConfig(opt.value)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: '12px 16px',
                              borderRadius: 10,
                              border: selected ? '1.5px solid #B11E6A' : `1.5px solid ${borderColor}`,
                              background: selected ? '#B11E6A08' : subBg,
                              transition: 'all 0.18s',
                            }}
                          >
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: `2px solid ${selected ? '#B11E6A' : '#bbb'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.18s',
                            }}>
                              {selected && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#B11E6A' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <Text strong style={{ fontSize: 13, color: selected ? '#B11E6A' : textColor }}>{opt.label}</Text>
                              <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>{opt.desc}</Text>
                            </div>
                            {opt.value !== 'none' && (
                              <div style={{ display: 'flex', gap: 5 }}>
                                {opt.value === 'cgst_sgst' && <>
                                  <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>CGST</Tag>
                                  <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>SGST</Tag>
                                </>}
                                {opt.value === 'cgst' && <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>CGST</Tag>}
                                {opt.value === 'sgst' && <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>SGST</Tag>}
                                {opt.value === 'igst' && <Tag style={{ borderRadius: 8, background: '#1e3a5f18', color: '#1e3a5f', border: '1px solid #1e3a5f33', fontSize: 11, margin: 0 }}>IGST</Tag>}
                                {opt.value === 'all' && <>
                                  <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>CGST</Tag>
                                  <Tag style={{ borderRadius: 8, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 11, margin: 0 }}>SGST</Tag>
                                  <Tag style={{ borderRadius: 8, background: '#1e3a5f18', color: '#1e3a5f', border: '1px solid #1e3a5f33', fontSize: 11, margin: 0 }}>IGST</Tag>
                                </>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Divider style={{ margin: '0 0 20px' }} />

                  {/* Tax detail toggles */}
                  <Text strong style={{ color: textColor, display: 'block', marginBottom: 14, fontSize: 13 }}>Tax Detail Options</Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: 'Show GSTIN on Invoice',        desc: 'Print your GST registration number',        val: invoiceShowGstin,  set: setInvoiceShowGstin },
                      { label: 'Show HSN / SAC Code per Item', desc: 'Display HSN/SAC code alongside each product', val: invoiceShowHsn,    set: setInvoiceShowHsn },
                      { label: 'Show Tax Rate per Line Item',  desc: 'Print applicable GST % next to each row',    val: invoiceShowTaxRate,set: setInvoiceShowTaxRate },
                    ].map((item, i, arr) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                        <div>
                          <Text strong style={{ color: textColor, display: 'block', fontSize: 13 }}>{item.label}</Text>
                          <Text style={{ fontSize: 12, color: '#aaa' }}>{item.desc}</Text>
                        </div>
                        <Switch checked={item.val} onChange={item.set} style={{ background: item.val ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                      </div>
                    ))}
                  </div>
                </Card>

                {/* ── Invoice Display Options ── */}
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  title={<Text strong style={{ color: textColor }}>Invoice Display Options</Text>}
                >
                  {/* Show Company Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderColor}` }}>
                    <div>
                      <Text strong style={{ color: textColor, display: 'block', fontSize: 13 }}>Show Company Logo</Text>
                      <Text style={{ fontSize: 12, color: '#aaa' }}>Print the logo at the top of every invoice</Text>
                    </div>
                    <Switch checked={invoiceShowLogo} onChange={setInvoiceShowLogo} style={{ background: invoiceShowLogo ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                  </div>

                  {/* Show Bank Details */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${borderColor}` }}>
                    <div>
                      <Text strong style={{ color: textColor, display: 'block', fontSize: 13 }}>Show Bank Details</Text>
                      <Text style={{ fontSize: 12, color: '#aaa' }}>Include bank account info for payment</Text>
                    </div>
                    <Switch checked={invoiceShowBank} onChange={setInvoiceShowBank} style={{ background: invoiceShowBank ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                  </div>

                  {/* Terms & Conditions — toggle + editable textarea */}
                  <div style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                      <div>
                        <Text strong style={{ color: textColor, display: 'block', fontSize: 13 }}>Show Terms & Conditions</Text>
                        <Text style={{ fontSize: 12, color: '#aaa' }}>Print T&C text at the bottom of the invoice</Text>
                      </div>
                      <Switch checked={invoiceShowTerms} onChange={setInvoiceShowTerms} style={{ background: invoiceShowTerms ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                    </div>
                    {invoiceShowTerms && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', paddingBottom: 16 }}
                      >
                        <div style={{ background: subBg, borderRadius: 10, padding: 14, border: `1px solid ${borderColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 12, color: '#B11E6A' }}>Terms & Conditions Text</Text>
                            <Text style={{ fontSize: 11, color: '#aaa' }}>Displayed on every invoice footer</Text>
                          </div>
                          <Input.TextArea
                            value={invoiceTerms}
                            onChange={e => setInvoiceTerms(e.target.value)}
                            rows={6}
                            placeholder={`1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. Payment should be made within the due date.`}
                            showCount
                            maxLength={1000}
                            style={{
                              borderRadius: 8,
                              fontSize: 13,
                              lineHeight: 1.7,
                              resize: 'vertical',
                            }}
                          />
                          <Text style={{ fontSize: 11, color: '#aaa', display: 'block', marginTop: 8 }}>
                            Tip: Start each clause on a new line (e.g. 1. First clause, 2. Second clause…)
                          </Text>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Show Signature Field */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                    <div>
                      <Text strong style={{ color: textColor, display: 'block', fontSize: 13 }}>Show Signature Field</Text>
                      <Text style={{ fontSize: 12, color: '#aaa' }}>Add authorised signatory line at footer</Text>
                    </div>
                    <Switch checked={invoiceShowSign} onChange={setInvoiceShowSign} style={{ background: invoiceShowSign ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                  </div>

                  <Divider style={{ margin: '4px 0 16px' }} />
                  <Form layout="vertical">
                    <Form.Item label={<Text strong style={{ color: textColor }}>Invoice Footer Note</Text>} style={{ marginBottom: 0 }}>
                      <Input
                        value={invoiceFooter}
                        onChange={e => setInvoiceFooter(e.target.value)}
                        placeholder="e.g. Thank you for your business!"
                        maxLength={120}
                        showCount
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Form>
                </Card>

                {/* Save */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button>Cancel</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={saveInvoiceSettings} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
                    Save Invoice Settings
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: 'deleted_records',
            label: <Space><DeleteOutlined />Deleted Records</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>All records that have been deleted from the system (Super Admin only)</Text>
                  <Space wrap>
                    <Input
                      prefix={<span>🔍</span>}
                      placeholder="Search deleted records..."
                      value={deletedSearch}
                      onChange={e => setDeletedSearch(e.target.value)}
                      style={{ width: 220, borderRadius: 8 }}
                      allowClear
                    />
                    <Select value={deletedModuleFilter} onChange={setDeletedModuleFilter} style={{ width: 180 }}>
                      <Option value="all">All Modules</Option>
                      <Option value="Parties & Ledger">Parties & Ledger</Option>
                      <Option value="Sales Team">Sales Team</Option>
                      <Option value="Inventory">Inventory</Option>
                      <Option value="Vendors">Vendors</Option>
                      <Option value="Staff Management">Staff Management</Option>
                      <Option value="Settings">Settings</Option>
                    </Select>
                  </Space>
                </div>
                {deletedRecords.length === 0 ? (
                  <Empty description="No deleted records found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table
                    size="small"
                    dataSource={deletedRecords.filter(r =>
                      (deletedModuleFilter === 'all' || r.module === deletedModuleFilter) &&
                      (!deletedSearch || r.name.toLowerCase().includes(deletedSearch.toLowerCase()) || r.module.toLowerCase().includes(deletedSearch.toLowerCase()))
                    )}
                    rowKey="key"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Module', dataIndex: 'module', width: 160,
                        render: v => <Tag style={{ borderRadius: 10, background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', fontSize: 12 }}>{v}</Tag>
                      },
                      {
                        title: 'Record Name', dataIndex: 'name',
                        render: v => <Text strong style={{ color: textColor, fontSize: 13 }}>{v}</Text>
                      },
                      {
                        title: 'Type', dataIndex: 'type', width: 120,
                        render: v => <Tag color="default" style={{ borderRadius: 10, fontSize: 12 }}>{v}</Tag>
                      },
                      {
                        title: 'Deleted By', dataIndex: 'deletedBy', width: 140,
                        render: v => <Text style={{ fontSize: 13, color: '#888' }}>{v}</Text>
                      },
                      {
                        title: 'Deleted At', dataIndex: 'deletedAt', width: 160,
                        render: v => <Text style={{ fontSize: 13, color: '#888' }}>{new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                      },
                      {
                        title: 'Actions', key: 'actions', width: 80,
                        render: (_, r) => (
                          <Tooltip title="Restore Record">
                            <Button
                              size="small"
                              type="link"
                              style={{ color: '#52c41a', padding: '0 4px', fontSize: 13 }}
                              onClick={async () => {
                                try {
                                  await restoreRecordMutation({ type: r.type, id: r.key }).unwrap();
                                  enqueueSnackbar(`${r.name} restored`, { variant: 'success' });
                                } catch { enqueueSnackbar('Restore failed', { variant: 'error' }); }
                              }}
                            >
                              Restore
                            </Button>
                          </Tooltip>
                        )
                      },
                    ]}
                  />
                )}
              </Card>
            ),
          },
        ])}
      />
    </div>
  );
}
