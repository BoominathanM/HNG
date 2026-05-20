import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Avatar, Typography, Space, Progress, Badge,
  Tabs, Input, Button, Switch, Tooltip, Modal, Form, message, Divider, Select,
} from 'antd';
import {
  UserOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined,
  EditOutlined, LockOutlined, UnlockOutlined, TeamOutlined, KeyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, SearchOutlined, FilterOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const DEPARTMENTS = ['Production', 'Dispatch', 'Quality', 'Sales', 'Vendors'];

const ROLES = [
  'Production Lead',
  'Sticker',
  'Box',
  'Ziplock',
  'Quality Check',
  'Sales Executive',
  'Packing Staff',
  'Vendor Manager',
  'Procurement',
];

const teamColor = {
  Sticker: '#B11E6A', Box: '#8a1652', Ziplock: '#C94F8A',
  Production: '#D85C9E', Quality: '#6b1240', Sales: '#722ed1', General: '#aaa',
};

const staff = [
  { key: 1, name: 'Ramesh Kumar', role: 'Production Lead',  team: 'Production', dept: 'Production', phone: '+91 98765 43210', shift: 'Morning', attendance: 26, salary: '₹22,000', performance: 92, status: 'Present' },
  { key: 2, name: 'Kavitha S',    role: 'Sticker Team',     team: 'Sticker',    dept: 'Production', phone: '+91 87654 32109', shift: 'Morning', attendance: 24, salary: '₹16,000', performance: 88, status: 'Present' },
  { key: 3, name: 'Meena Devi',   role: 'Packing Staff',    team: 'General',    dept: 'Dispatch',   phone: '+91 76543 21098', shift: 'Evening', attendance: 22, salary: '₹14,000', performance: 78, status: 'Absent'  },
  { key: 4, name: 'Suresh T',     role: 'Quality Check',    team: 'Quality',    dept: 'Quality',    phone: '+91 65432 10987', shift: 'Morning', attendance: 25, salary: '₹18,000', performance: 85, status: 'Present' },
  { key: 5, name: 'Lakshmi R',    role: 'Sales Executive',  team: 'Sales',      dept: 'Sales',      phone: '+91 54321 09876', shift: 'Morning', attendance: 27, salary: '₹20,000', performance: 95, status: 'Present' },
  { key: 6, name: 'Arjun P',      role: 'Sticker Team',     team: 'Sticker',    dept: 'Production', phone: '+91 99887 12345', shift: 'Morning', attendance: 24, salary: '₹15,000', performance: 82, status: 'Present' },
  { key: 7, name: 'Deepa M',      role: 'Box Team',         team: 'Box',        dept: 'Production', phone: '+91 88776 23456', shift: 'Evening', attendance: 23, salary: '₹15,000', performance: 80, status: 'Present' },
  { key: 8, name: 'Ganesh R',     role: 'Ziplock Team',     team: 'Ziplock',    dept: 'Production', phone: '+91 77665 34567', shift: 'Morning', attendance: 25, salary: '₹15,000', performance: 84, status: 'Present' },
];

const initialRoleLogins = [
  {
    key: 'sticker',
    team: 'Sticker Team',
    color: '#B11E6A',
    username: 'sticker@healnglow.com',
    password: 'HNG@Sticker2024',
    access: 'Production — Sticker Placing Tasks',
    isActive: true,
    members: staff.filter((s) => s.team === 'Sticker'),
  },
  {
    key: 'box',
    team: 'Box Team',
    color: '#8a1652',
    username: 'box@healnglow.com',
    password: 'HNG@Box2024',
    access: 'Production — Box Filling Tasks',
    isActive: true,
    members: staff.filter((s) => s.team === 'Box'),
  },
  {
    key: 'ziplock',
    team: 'Ziplock Team',
    color: '#C94F8A',
    username: 'ziplock@healnglow.com',
    password: 'HNG@Ziplock2024',
    access: 'Production — Ziplock Sealing Tasks',
    isActive: true,
    members: staff.filter((s) => s.team === 'Ziplock'),
  },
];

// ── Staff List Tab ────────────────────────────────────────────────────────
function StaffList({ isDark }) {
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const [staffList, setStaffList] = useState(staff);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const [staffSearch, setStaffSearch] = useState('');
  const [filterDept, setFilterDept] = useState(null);
  const [filterTeam, setFilterTeam] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  const filteredStaff = staffList.filter((s) => {
    const q = staffSearch.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q) || (s.phone || '').includes(q);
    const matchDept = !filterDept || s.dept === filterDept;
    const matchTeam = !filterTeam || s.team === filterTeam;
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchDept && matchTeam && matchStatus;
  });

  const handleAdd = () => {
    form.validateFields().then((vals) => {
      const newStaff = {
        key: staffList.length + 1,
        name: vals.name,
        role: vals.role,
        team: vals.team || vals.dept,
        dept: vals.dept,
        phone: vals.phone || '—',
        shift: vals.shift || 'Morning',
        attendance: 0,
        salary: vals.salary || '—',
        performance: 0,
        status: 'Present',
      };
      setStaffList((prev) => [...prev, newStaff]);
      message.success(`${vals.name} added successfully`);
      form.resetFields();
      setAddOpen(false);
    });
  };

  const columns = [
    {
      title: 'Employee', key: 'emp',
      render: (_, r) => (
        <Space>
          <Avatar style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)' }} icon={<UserOutlined />} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{r.name}</Text>
            <Text style={{ fontSize: 12, color: '#999' }}>{r.role}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Dept', dataIndex: 'dept', responsive: ['sm'], render: (v) => <Tag color="#B11E6A" style={{ borderRadius: 20 }}>{v}</Tag> },
    {
      title: 'Team', dataIndex: 'team',
      render: (v) => <Tag color={teamColor[v] || 'default'} style={{ borderRadius: 20 }}>{v}</Tag>,
    },
    { title: 'Shift', dataIndex: 'shift', responsive: ['md'] },
    { title: 'Attendance', dataIndex: 'attendance', responsive: ['lg'], render: (v) => `${v}/30 days` },
    {
      title: 'Performance', dataIndex: 'performance', responsive: ['lg'],
      render: (v) => (
        <div style={{ minWidth: 100 }}>
          <Progress percent={v} size="small" strokeColor={{ '0%': '#8a1652', '100%': '#D85C9E' }} />
        </div>
      ),
    },
    { title: 'Salary', dataIndex: 'salary', responsive: ['md'], render: (v) => <Text strong>{v}</Text> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Badge status={v === 'Present' ? 'success' : 'error'} text={v} /> },
  ];

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Staff', val: staffList.length, color: '#B11E6A' },
          { label: 'Present Today', val: staffList.filter((s) => s.status === 'Present').length, color: '#8a1652' },
          { label: 'On Leave', val: 3, color: '#C94F8A' },
          { label: 'Absent', val: staffList.filter((s) => s.status === 'Absent').length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: 0 } }}
        extra={
          <Button
            type="primary" icon={<PlusOutlined />} size="small"
            onClick={() => setAddOpen(true)}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, margin: '8px 8px 0 0' }}
          >
            Add Staff
          </Button>
        }
      >
        {/* ── Search & Filter Bar ── */}
        <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
            placeholder="Search name, role, phone..."
            allowClear
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select allowClear placeholder="Department" value={filterDept} onChange={setFilterDept} style={{ width: 150, borderRadius: 8 }}>
            {DEPARTMENTS.map((d) => <Option key={d} value={d}>{d}</Option>)}
          </Select>
          <Select allowClear placeholder="Team" value={filterTeam} onChange={setFilterTeam} style={{ width: 140, borderRadius: 8 }}>
            {Object.keys(teamColor).map((t) => <Option key={t} value={t}>{t}</Option>)}
          </Select>
          <Select allowClear placeholder="Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 130, borderRadius: 8 }}>
            <Option value="Present">Present</Option>
            <Option value="Absent">Absent</Option>
          </Select>
        </div>
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={filteredStaff} columns={columns} pagination={{ pageSize: 10, size: 'small' }} size="small" />
        </div>
      </Card>

      {/* ── Add Staff Modal ─────────────────────────────────── */}
      <Modal
        title={<Space><PlusOutlined style={{ color: '#B11E6A' }} /><span>Add New Staff</span></Space>}
        open={addOpen}
        onCancel={() => { setAddOpen(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setAddOpen(false); form.resetFields(); }}>Cancel</Button>,
          <Button key="add" type="primary" onClick={handleAdd}
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Add Staff
          </Button>,
        ]}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input prefix={<UserOutlined />} placeholder="e.g. Rajesh Kumar" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Department" name="dept" rules={[{ required: true, message: 'Department is required' }]}>
                <Select placeholder="Select Department">
                  {DEPARTMENTS.map((d) => (
                    <Option key={d} value={d}>
                      <Tag color={d === 'Vendors' ? 'volcano' : '#B11E6A'} style={{ borderRadius: 20, margin: 0 }}>{d}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Role is required' }]}>
                <Select placeholder="Select Role">
                  {ROLES.map((r) => (
                    <Option key={r} value={r}>
                      <Tag
                        color={r === 'Sticker' ? '#B11E6A' : r === 'Box' ? '#8a1652' : r === 'Ziplock' ? '#C94F8A' : 'default'}
                        style={{ borderRadius: 20, margin: 0 }}
                      >
                        {r}
                      </Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Team" name="team">
                <Select placeholder="Select Team" allowClear>
                  {Object.keys(teamColor).map((t) => (
                    <Option key={t} value={t}>
                      <Tag color={teamColor[t]} style={{ borderRadius: 20, margin: 0 }}>{t}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Shift" name="shift">
                <Select placeholder="Select Shift" defaultValue="Morning">
                  <Option value="Morning">Morning</Option>
                  <Option value="Evening">Evening</Option>
                  <Option value="Night">Night</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+91 XXXXX XXXXX" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Salary" name="salary">
                <Input placeholder="e.g. ₹15,000" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

// ── Role Login Card ───────────────────────────────────────────────────────
function RoleLoginCard({ role, isDark, onEdit, onToggle }) {
  const [showPwd, setShowPwd] = useState(false);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';

  const copyToClipboard = (val, label) => {
    navigator.clipboard.writeText(val).then(() => message.success(`${label} copied`));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          borderRadius: 16,
          border: `1.5px solid ${role.color}30`,
          background: cardBg,
          boxShadow: `0 4px 24px ${role.color}18`,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Header strip */}
        <div style={{ background: `linear-gradient(135deg, ${role.color} 0%, ${role.color}cc 100%)`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Avatar style={{ background: 'rgba(255,255,255,0.25)' }} icon={<TeamOutlined />} />
            <div>
              <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>{role.team}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{role.access}</Text>
            </div>
          </Space>
          <Tooltip title={role.isActive ? 'Disable Login' : 'Enable Login'}>
            <Switch
              checked={role.isActive}
              onChange={(val) => onToggle(role.key, val)}
              checkedChildren={<UnlockOutlined />}
              unCheckedChildren={<LockOutlined />}
              style={{ background: role.isActive ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}
            />
          </Tooltip>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Status */}
          <div style={{ marginBottom: 14 }}>
            {role.isActive
              ? <Tag color="success" icon={<CheckCircleOutlined />}>Login Active</Tag>
              : <Tag color="error" icon={<CloseCircleOutlined />}>Login Disabled</Tag>
            }
          </div>

          {/* Username */}
          <div style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Username</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                value={role.username}
                readOnly
                size="small"
                prefix={<UserOutlined style={{ color: role.color }} />}
                style={{ borderRadius: 8, flex: 1 }}
              />
              <Tooltip title="Copy username">
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(role.username, 'Username')} style={{ borderColor: role.color, color: role.color }} />
              </Tooltip>
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                value={showPwd ? role.password : '•'.repeat(role.password.length)}
                readOnly
                size="small"
                prefix={<KeyOutlined style={{ color: role.color }} />}
                style={{ borderRadius: 8, flex: 1, fontFamily: showPwd ? 'inherit' : 'monospace' }}
              />
              <Tooltip title={showPwd ? 'Hide password' : 'Show password'}>
                <Button
                  size="small"
                  icon={showPwd ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowPwd((v) => !v)}
                  style={{ borderColor: role.color, color: role.color }}
                />
              </Tooltip>
              <Tooltip title="Copy password">
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(role.password, 'Password')} style={{ borderColor: role.color, color: role.color }} />
              </Tooltip>
            </div>
          </div>

          <Divider style={{ margin: '0 0 14px 0' }} />

          {/* Members */}
          <div style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Team Members ({role.members.length})
            </Text>
            <Space wrap size={6}>
              {role.members.map((m) => (
                <Tooltip key={m.key} title={`${m.role} — ${m.shift} Shift`}>
                  <Tag
                    style={{ borderRadius: 20, border: `1px solid ${role.color}40`, background: `${role.color}10`, color: role.color, cursor: 'default' }}
                    icon={<UserOutlined />}
                  >
                    {m.name}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          </div>

          {/* Edit button */}
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(role)}
            style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}cc)`, border: 'none', borderRadius: 8 }}
          >
            Edit Credentials
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Role Logins Tab ───────────────────────────────────────────────────────
function RoleLogins({ isDark }) {
  const [roleLogins, setRoleLogins] = useState(initialRoleLogins);
  const [editOpen, setEditOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form] = Form.useForm();
  const [roleSearch, setRoleSearch] = useState('');
  const [filterActive, setFilterActive] = useState(null);

  const filteredRoles = roleLogins.filter((r) => {
    const q = roleSearch.toLowerCase();
    const matchSearch = !q || r.team.toLowerCase().includes(q) || r.username.toLowerCase().includes(q);
    const matchActive = filterActive === null || r.isActive === filterActive;
    return matchSearch && matchActive;
  });

  const handleEdit = (role) => {
    setEditRole(role);
    form.setFieldsValue({ username: role.username, password: role.password, access: role.access });
    setEditOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then((vals) => {
      setRoleLogins((prev) =>
        prev.map((r) => r.key === editRole.key ? { ...r, ...vals } : r)
      );
      message.success(`${editRole.team} credentials updated`);
      setEditOpen(false);
    });
  };

  const handleToggle = (key, val) => {
    setRoleLogins((prev) => prev.map((r) => r.key === key ? { ...r, isActive: val } : r));
    const role = roleLogins.find((r) => r.key === key);
    message.info(`${role?.team} login ${val ? 'enabled' : 'disabled'}`);
  };

  return (
    <>
      {/* Header info */}
      <Card
        style={{ borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#B11E6A15,#D85C9E08)', marginBottom: 20 }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <Space>
          <LockOutlined style={{ color: '#B11E6A', fontSize: 18 }} />
          <div>
            <Text strong style={{ display: 'block' }}>Team Role Logins</Text>
            <Text style={{ fontSize: 12, color: '#999' }}>
              Each production team has a shared login account. Toggle access or update credentials below.
            </Text>
          </div>
        </Space>
      </Card>

      {/* ── Search & Filter for Role Logins ── */}
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
          placeholder="Search team or username..."
          allowClear
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          style={{ width: 240, borderRadius: 8 }}
        />
        <Select allowClear placeholder="Status" value={filterActive} onChange={(v) => setFilterActive(v === undefined ? null : v)} style={{ width: 140, borderRadius: 8 }}>
          <Option value={true}>Active</Option>
          <Option value={false}>Disabled</Option>
        </Select>
      </div>

      <Row gutter={[16, 16]}>
        {filteredRoles.map((role) => (
          <Col xs={24} md={8} key={role.key}>
            <RoleLoginCard role={role} isDark={isDark} onEdit={handleEdit} onToggle={handleToggle} />
          </Col>
        ))}
      </Row>

      {/* Edit Credentials Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: editRole?.color }} />
            <span>Edit Credentials — {editRole?.team}</span>
          </Space>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleSave}
            style={{ background: `linear-gradient(135deg, ${editRole?.color}, ${editRole?.color}cc)`, border: 'none' }}>
            Save Changes
          </Button>,
        ]}
        width={420}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Username / Email" name="username" rules={[{ required: true, message: 'Username is required' }]}>
            <Input prefix={<UserOutlined />} placeholder="team@healnglow.com" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
            <Input.Password prefix={<KeyOutlined />} placeholder="Enter new password" />
          </Form.Item>
          <Form.Item label="Access Description" name="access">
            <Input prefix={<TeamOutlined />} placeholder="e.g. Production — Sticker Tasks" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function Staff() {
  const isDark = useSelector((s) => s.theme.isDark);

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="User Management" items={[{ label: 'User Management' }]} />

      <Tabs
        defaultActiveKey="staff"
        style={{ marginTop: 4 }}
        items={[
          {
            key: 'staff',
            label: <Space><UserOutlined />Staff List</Space>,
            children: <StaffList isDark={isDark} />,
          },
          {
            key: 'role_logins',
            label: <Space><KeyOutlined />Role Logins</Space>,
            children: <RoleLogins isDark={isDark} />,
          },
        ]}
      />
    </div>
  );
}
