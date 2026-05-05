import React, { useState } from 'react';
import {
  Row, Col, Card, Form, Input, Select, Switch, Button, Typography,
  Tabs, Tag, Space, Avatar, Modal, Checkbox, Badge, Upload, Divider, Table, Collapse, Tooltip, InputNumber
} from 'antd';
import {
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, UploadOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const MODULES = [
  'Dashboard', 'Sales Team', 'Operations', 'Task Management', 'Dispatch Team',
  'Staff Management', 'Inventory', 'Billing', 'Expenses', 'Reports', 'Notifications', 'Settings',
];

const MODULE_PERM_TYPES = {
  Dashboard: ['read'],
  'Sales Team': ['read', 'add', 'edit', 'delete'],
  Operations: ['read', 'add', 'edit', 'delete'],
  'Task Management': ['read', 'add', 'edit', 'delete'],
  'Dispatch Team': ['read', 'add', 'edit', 'delete'],
  'Staff Management': ['read', 'add', 'edit', 'delete'],
  Inventory: ['read', 'add', 'edit', 'delete'],
  Billing: ['read', 'add', 'edit', 'delete'],
  Expenses: ['read', 'add', 'edit', 'delete'],
  Reports: ['read', 'add', 'edit', 'delete'],
  Notifications: ['read'],
  Settings: ['read', 'add', 'edit', 'delete'],
};

const ALL_PERMS = { read: true, add: true, edit: true, delete: true };
const NO_PERMS  = { read: false, add: false, edit: false, delete: false };

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
];

const initUsers = [
  { key: 1, name: 'Arjun Sharma',  email: 'arjun@healngl.com',  role: 'Super Admin',      department: 'Management', status: 'Active',   avatar: 'A', color: '#B11E6A' },
  { key: 2, name: 'Priya Nair',    email: 'priya@healngl.com',  role: 'Sales Manager',    department: 'Sales',      status: 'Active',   avatar: 'P', color: '#8a1652' },
  { key: 3, name: 'Ramesh Kumar',  email: 'ramesh@healngl.com', role: 'Operations Head',  department: 'Operations', status: 'Active',   avatar: 'R', color: '#C94F8A' },
  { key: 4, name: 'Sunita Mehta',  email: 'sunita@healngl.com', role: 'Dispatch Manager', department: 'Dispatch',   status: 'Inactive', avatar: 'S', color: '#D85C9E' },
  { key: 5, name: 'Kavitha S',     email: 'kavitha@healngl.com',role: 'Finance Manager',  department: 'Finance',    status: 'Active',   avatar: 'K', color: '#6b1240' },
];

export default function Settings() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg     = isDark ? '#1E1E2E' : '#ffffff';
  const textColor  = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor= isDark ? '#2a2a3a' : '#f0f0f0';
  const subBg      = isDark ? '#2a2a3a' : '#fafafa';

  // Roles
  const [roles, setRoles]       = useState(initRoles);
  const [newRole, setNewRole]   = useState('');

  // Departments
  const [departments, setDepartments] = useState(['Sales', 'Marketing', 'Operations', 'Dispatch', 'Finance']);
  const [newDept, setNewDept]         = useState('');

  // Users
  const [users, setUsers]       = useState(initUsers);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();
  const watchedDept = Form.useWatch('department', userForm);
  const watchedOldHotel = Form.useWatch('targetOldHotel', userForm) || 0;
  const watchedNewHotel = Form.useWatch('targetNewHotel', userForm) || 0;
  const watchedPayment = Form.useWatch('targetPayment', userForm) || 0;
  const watchedSoftware = Form.useWatch('targetSoftware', userForm) || 0;
  const computedOverallTarget = watchedOldHotel + watchedNewHotel + watchedPayment + watchedSoftware;

  // Logo
  const [logoUrl, setLogoUrl] = useState('/hng logo new.png');

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
    setEditingUser(user);
    userForm.setFieldsValue({
      ...user,
      targetOldHotel: user.targets?.oldHotel,
      targetNewHotel: user.targets?.newHotel,
      targetPayment: user.targets?.payment,
      targetSoftware: user.targets?.software,
      targetPeople: user.targets?.people,
      reward14: user.targets?.rewards?.q1,
      reward12: user.targets?.rewards?.q2,
      reward34: user.targets?.rewards?.q3,
      rewardFull: user.targets?.rewards?.full,
      perms: user.perms,
    });
    setAddUserOpen(true);
  };

  const addUser = () => {
    userForm.validateFields().then(vals => {
      const role = roles.find(r => r.role === vals.role);
      const userData = {
        name: vals.name, email: vals.email,
        role: vals.role, status: vals.status || 'Active',
        department: vals.department,
        targets: {
          oldHotel: vals.targetOldHotel,
          newHotel: vals.targetNewHotel,
          payment: vals.targetPayment,
          software: vals.targetSoftware,
          overall: (vals.targetOldHotel || 0) + (vals.targetNewHotel || 0) + (vals.targetPayment || 0) + (vals.targetSoftware || 0),
          people: vals.targetPeople,
          rewards: {
            q1: vals.reward14,
            q2: vals.reward12,
            q3: vals.reward34,
            full: vals.rewardFull,
          }
        },
        perms: vals.perms,
        avatar: vals.name[0].toUpperCase(), 
        color: role?.color || '#B11E6A',
      };

      if (editingUser) {
        setUsers(prev => prev.map(u => u.key === editingUser.key ? { ...u, ...userData, key: u.key } : u));
      } else {
        setUsers(prev => [...prev, { ...userData, key: Date.now() }]);
      }

      userForm.resetFields();
      setEditingUser(null);
      setAddUserOpen(false);
    });
  };

  const removeUser = (key) => setUsers(prev => prev.filter(u => u.key !== key));

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
        items={[
          {
            key: 'general',
            label: 'General',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                <Form layout="vertical">
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
            ),
          },
          {
            key: 'users',
            label: 'User Management',
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add User</Button>
                </div>
                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
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
                  onCancel={() => { setAddUserOpen(false); setEditingUser(null); userForm.resetFields(); }}
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
                              {roles.map(r => <Option key={r.key} value={r.role}>{r.role}</Option>)}
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
                            <Upload showUploadList={false} beforeUpload={() => false}>
                              <Button icon={<UploadOutlined />} style={{ borderRadius: 8, width: '100%', height: 40 }}>Upload Image</Button>
                            </Upload>
                          </Form.Item>
                        </Col>
                      </Row>

                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Page Access Permissions</Text>
                        <Collapse
                          ghost
                          expandIconPosition="end"
                          style={{ background: subBg, borderRadius: 8, border: `1px solid ${borderColor}` }}
                          items={MODULES.map(mod => ({
                            key: mod,
                            label: <Text strong>{mod}</Text>,
                            children: (
                              <div style={{ display: 'flex', gap: 32 }}>
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
                      <Switch defaultChecked={n.default} style={{ background: n.default ? '#B11E6A' : undefined, flexShrink: 0, marginLeft: 16 }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 8 }}>
                    <Button>Cancel</Button>
                    <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
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
                    <Col xs={24} sm={12}><Form.Item label="CGST"><Input defaultValue="9%" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="SGST"><Input defaultValue="9%" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="IGST (Interstate)"><Input defaultValue="18%" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="HSN Code (Default)"><Input placeholder="Ex: 3401" /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label="Tax Invoice Prefix"><Input defaultValue="INV-" /></Form.Item></Col>
                  </Row>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${borderColor}`, paddingTop: 16, marginTop: 4 }}>
                    <Button>Cancel</Button>
                    <Button type="primary" icon={<SaveOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Save</Button>
                  </div>
                </Form>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
