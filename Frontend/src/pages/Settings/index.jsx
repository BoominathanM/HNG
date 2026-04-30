import React, { useState } from 'react';
import {
  Row, Col, Card, Form, Input, Select, Switch, Button, Typography,
  Tabs, Tag, Space, Avatar, Modal, Checkbox, Badge, Upload, Divider, Table,
} from 'antd';
import {
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, UploadOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const MODULES = [
  'Dashboard', 'Sales', 'Operations', 'Tasks', 'Dispatch',
  'Staff', 'Inventory', 'Billing', 'Reports', 'Notifications', 'Settings',
];

const ALL_PERMS = { view: true, create: true, edit: true, delete: true };
const NO_PERMS  = { view: false, create: false, edit: false, delete: false };

const buildPerms = (mods, overrides = {}) =>
  Object.fromEntries(MODULES.map(m => [m, mods.includes(m) ? { ...ALL_PERMS, ...overrides[m] } : { ...NO_PERMS, ...overrides[m] }]));

const initRoles = [
  { key: 1, role: 'Super Admin',      color: '#B11E6A', users: 1, status: 'Active',
    perms: buildPerms(MODULES) },
  { key: 2, role: 'Sales Manager',    color: '#8a1652', users: 3, status: 'Active',
    perms: buildPerms(['Dashboard','Sales','Reports'], { Sales: { view:true,create:true,edit:true,delete:false }, Reports: { view:true,create:false,edit:false,delete:false } }) },
  { key: 3, role: 'Operations Head',  color: '#C94F8A', users: 2, status: 'Active',
    perms: buildPerms(['Dashboard','Operations','Tasks','Inventory'], { Inventory: { view:true,create:true,edit:true,delete:false } }) },
  { key: 4, role: 'Dispatch Manager', color: '#D85C9E', users: 2, status: 'Active',
    perms: buildPerms(['Dashboard','Dispatch']) },
  { key: 5, role: 'Finance Manager',  color: '#6b1240', users: 1, status: 'Active',
    perms: buildPerms(['Dashboard','Billing','Reports']) },
];

const initUsers = [
  { key: 1, name: 'Arjun Sharma',  email: 'arjun@healngl.com',  role: 'Super Admin',      status: 'Active',   avatar: 'A', color: '#B11E6A' },
  { key: 2, name: 'Priya Nair',    email: 'priya@healngl.com',  role: 'Sales Manager',    status: 'Active',   avatar: 'P', color: '#8a1652' },
  { key: 3, name: 'Ramesh Kumar',  email: 'ramesh@healngl.com', role: 'Operations Head',  status: 'Active',   avatar: 'R', color: '#C94F8A' },
  { key: 4, name: 'Sunita Mehta',  email: 'sunita@healngl.com', role: 'Dispatch Manager', status: 'Inactive', avatar: 'S', color: '#D85C9E' },
  { key: 5, name: 'Kavitha S',     email: 'kavitha@healngl.com',role: 'Finance Manager',  status: 'Active',   avatar: 'K', color: '#6b1240' },
];

export default function Settings() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg     = isDark ? '#1E1E2E' : '#ffffff';
  const textColor  = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor= isDark ? '#2a2a3a' : '#f0f0f0';
  const subBg      = isDark ? '#2a2a3a' : '#fafafa';

  // Roles
  const [roles, setRoles]         = useState(initRoles);
  const [editRole, setEditRole]   = useState(null);   // role being edited in modal
  const [permDraft, setPermDraft] = useState(null);   // draft perms while editing
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Users
  const [users, setUsers]       = useState(initUsers);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm] = Form.useForm();

  // Logo
  const [logoUrl, setLogoUrl] = useState('/hng logo new.png');

  const openEditRole = (role) => {
    setEditRole(role);
    setPermDraft(JSON.parse(JSON.stringify(role.perms)));
  };

  const togglePerm = (module, perm) => {
    setPermDraft(prev => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] },
    }));
  };

  const toggleAllModule = (module) => {
    const all = Object.values(permDraft[module]).every(Boolean);
    setPermDraft(prev => ({
      ...prev,
      [module]: { view: !all, create: !all, edit: !all, delete: !all },
    }));
  };

  const saveRolePerms = () => {
    setRoles(prev => prev.map(r => r.key === editRole.key ? { ...r, perms: permDraft } : r));
    setEditRole(null);
    setPermDraft(null);
  };

  const addRole = () => {
    if (!newRoleName.trim()) return;
    const newRole = {
      key: Date.now(), role: newRoleName.trim(), color: '#B11E6A',
      users: 0, status: 'Active', perms: buildPerms([]),
    };
    setRoles(prev => [...prev, newRole]);
    setNewRoleName('');
    setAddRoleOpen(false);
  };

  const removeRole = (key) => setRoles(prev => prev.filter(r => r.key !== key));

  const addUser = () => {
    userForm.validateFields().then(vals => {
      const role = roles.find(r => r.role === vals.role);
      setUsers(prev => [...prev, {
        key: Date.now(), name: vals.name, email: vals.email,
        role: vals.role, status: vals.status || 'Active',
        avatar: vals.name[0].toUpperCase(), color: role?.color || '#B11E6A',
      }]);
      userForm.resetFields();
      setAddUserOpen(false);
    });
  };

  const removeUser = (key) => setUsers(prev => prev.filter(u => u.key !== key));

  const permCount = (role) => MODULES.filter(m => role.perms[m].view).length;

  const saveFooter = (onCancel) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: `1px solid ${borderColor}`, marginTop: 8 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
    </div>
  );

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Settings" items={[{ label: 'Settings' }]} />

      <Tabs defaultActiveKey="general">

        {/* ─── GENERAL ─── */}
        <TabPane tab="General" key="general">

          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Form layout="vertical">
              {/* Logo Upload */}
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
                      beforeUpload={(file) => {
                        const reader = new FileReader();
                        reader.onload = (e) => setLogoUrl(e.target.result);
                        reader.readAsDataURL(file);
                        return false;
                      }}
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
                <Col xs={24} sm={12}><Form.Item label="Company Name"><Input defaultValue="Heal N Glow" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="GST Number"><Input defaultValue="29ABCDE1234F1Z5" /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Primary Currency"><Select defaultValue="INR"><Option value="INR">₹ Indian Rupee</Option></Select></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item label="Date Format"><Select defaultValue="DD/MM/YYYY"><Option value="DD/MM/YYYY">DD/MM/YYYY</Option><Option value="MM/DD/YYYY">MM/DD/YYYY</Option></Select></Form.Item></Col>
                <Col xs={24}><Form.Item label="Business Address"><Input.TextArea rows={3} defaultValue="123, Industrial Area, Bengaluru - 560001, Karnataka" /></Form.Item></Col>
              </Row>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16 }}>
                <Button>Cancel</Button>
                <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Settings</Button>
              </div>
            </Form>
          </Card>
        </TabPane>

        {/* ─── USER MANAGEMENT ─── */}
        <TabPane tab="User Management" key="users">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add User</Button>
          </div>
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={users}
              rowKey="key"
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
                  width: 48,
                  render: (_, user) => (
                    <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeUser(user.key)} style={{ color: '#ff4d4f' }} />
                  ),
                },
              ]}
            />
          </Card>

          {/* Add User Modal */}
          <Modal
            open={addUserOpen}
            onCancel={() => { setAddUserOpen(false); userForm.resetFields(); }}
            footer={null}
            width={Math.min(480, window.innerWidth - 24)}
            centered
            title="Add New User"
          >
            <Form form={userForm} layout="vertical" style={{ marginTop: 8 }}>
              <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="Ex: Anjali Sharma" style={{ borderRadius: 8, height: 44 }} />
              </Form.Item>
              <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                <Input placeholder="Ex: anjali@healngl.com" style={{ borderRadius: 8, height: 44 }} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item label="Assign Role" name="role" rules={[{ required: true, message: 'Required' }]}>
                    <Select placeholder="Select role" style={{ width: '100%' }}>
                      {roles.map(r => <Option key={r.key} value={r.role}>{r.role}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item label="Status" name="status" initialValue="Active">
                    <Select>
                      <Option value="Active">Active</Option>
                      <Option value="Inactive">Inactive</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Temporary Password" name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}>
                <Input.Password placeholder="Set initial password" style={{ borderRadius: 8, height: 44 }} />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 14 }}>
                <Button onClick={() => { setAddUserOpen(false); userForm.resetFields(); }}>Cancel</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={addUser} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add User</Button>
              </div>
            </Form>
          </Modal>
        </TabPane>

        {/* ─── ROLES & PERMISSIONS ─── */}
        <TabPane tab="Roles & Permissions" key="roles">
          <Row gutter={[16, 16]}>
            {roles.map((role) => (
              <Col xs={24} sm={12} lg={8} key={role.key}>
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: `0 4px 20px ${role.color}18` }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  {/* Role header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${role.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserOutlined style={{ color: role.color, fontSize: 18 }} />
                      </div>
                      <div>
                        <Text strong style={{ color: textColor, fontSize: 14 }}>{role.role}</Text>
                        <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>{role.users} user{role.users !== 1 ? 's' : ''}</Text>
                      </div>
                    </div>
                    <Space size={4}>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditRole(role)} style={{ color: role.color }} />
                      {role.role !== 'Super Admin' && (
                        <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => removeRole(role.key)} style={{ color: '#ff4d4f' }} />
                      )}
                    </Space>
                  </div>

                  {/* Module access pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {MODULES.map(m => (
                      role.perms[m].view
                        ? <Tag key={m} style={{ borderRadius: 20, fontSize: 11, background: `${role.color}18`, color: role.color, border: `1px solid ${role.color}33`, margin: 0 }}>{m}</Tag>
                        : null
                    ))}
                  </div>

                  {/* Stats bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: 10 }}>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>{permCount(role)}/{MODULES.length} modules</Text>
                    <Tag color={role.status === 'Active' ? 'green' : 'default'} style={{ borderRadius: 12, fontSize: 11, margin: 0 }}>{role.status}</Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Edit Permissions Modal */}
          <Modal
            open={!!editRole}
            onCancel={() => { setEditRole(null); setPermDraft(null); }}
            footer={null}
            width={Math.min(760, window.innerWidth - 24)}
            centered
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${editRole?.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserOutlined style={{ color: editRole?.color }} />
                </div>
                <Text strong style={{ fontSize: 16 }}>{editRole?.role} — Permissions</Text>
              </div>
            }
          >
            {permDraft && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: subBg }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: textColor, borderBottom: `1px solid ${borderColor}` }}>Module</th>
                        {['view', 'create', 'edit', 'delete'].map(p => (
                          <th key={p} style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: textColor, textTransform: 'capitalize', borderBottom: `1px solid ${borderColor}` }}>{p}</th>
                        ))}
                        <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: textColor, borderBottom: `1px solid ${borderColor}` }}>All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod, i) => {
                        const allOn = Object.values(permDraft[mod]).every(Boolean);
                        return (
                          <tr key={mod} style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? '#ffffff08' : '#fafafa') }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: textColor, borderBottom: `1px solid ${borderColor}` }}>{mod}</td>
                            {['view', 'create', 'edit', 'delete'].map(perm => (
                              <td key={perm} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
                                <Checkbox
                                  checked={permDraft[mod][perm]}
                                  onChange={() => togglePerm(mod, perm)}
                                  style={{ '--ant-primary-color': '#B11E6A' }}
                                />
                              </td>
                            ))}
                            <td style={{ textAlign: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
                              <Switch
                                size="small"
                                checked={allOn}
                                onChange={() => toggleAllModule(mod)}
                                style={{ background: allOn ? '#B11E6A' : undefined }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, marginTop: 8, borderTop: `1px solid ${borderColor}` }}>
                  <Button onClick={() => { setEditRole(null); setPermDraft(null); }}>Cancel</Button>
                  <Button type="primary" icon={<SaveOutlined />} onClick={saveRolePerms} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save Permissions</Button>
                </div>
              </>
            )}
          </Modal>

          {/* Add Role Modal */}
          <Modal
            open={addRoleOpen}
            onCancel={() => { setAddRoleOpen(false); setNewRoleName(''); }}
            footer={null}
            width={400}
            centered
            title="Add New Role"
          >
            <Form layout="vertical" style={{ marginTop: 8 }}>
              <Form.Item label="Role Name" required>
                <Input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Ex: HR Manager" style={{ borderRadius: 8, height: 44 }} />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button onClick={() => { setAddRoleOpen(false); setNewRoleName(''); }}>Cancel</Button>
                <Button type="primary" onClick={addRole} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Role</Button>
              </div>
            </Form>
          </Modal>
        </TabPane>

        {/* ─── NOTIFICATIONS ─── */}
        <TabPane tab="Notifications" key="notifications">
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
                  <Switch defaultChecked={n.default} style={{ background: n.default ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 8 }}>
                <Button>Cancel</Button>
                <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
              </div>
            </Form>
          </Card>
        </TabPane>

        {/* ─── GST & TAX ─── */}
        <TabPane tab="GST & Tax" key="gst">
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Form layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Default GST Rate">
                    <Select defaultValue="18">
                      <Option value="5">5%</Option>
                      <Option value="12">12%</Option>
                      <Option value="18">18%</Option>
                      <Option value="28">28%</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="CGST"><Input defaultValue="9%" /></Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="SGST"><Input defaultValue="9%" /></Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="IGST (Interstate)"><Input defaultValue="18%" /></Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="HSN Code (Default)"><Input placeholder="Ex: 3401" /></Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Tax Invoice Prefix"><Input defaultValue="INV-" /></Form.Item>
                </Col>
              </Row>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 4 }}>
                <Button>Cancel</Button>
                <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
              </div>
            </Form>
          </Card>
        </TabPane>

      </Tabs>
    </div>
  );
}
