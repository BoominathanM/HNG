import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Avatar, Typography, Space, Progress, Badge,
  Tabs, Input, Button, Modal, Form, Select,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  UserOutlined, EditOutlined, TeamOutlined,
  PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetStaffQuery,
  useCreateStaffMutation,
} from '../../store/api/apiSlice';

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

// ── Staff List Tab ────────────────────────────────────────────────────────
function StaffList({ isDark }) {
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const { requireAccess } = usePageAccess('Staff Management');
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: staffData, isLoading: staffLoading } = useGetStaffQuery();
  const [createStaff] = useCreateStaffMutation();

  const staffList = (staffData?.data || []).map((s) => ({
    key: s._id,
    id: s.staffCode,
    name: s.fullName,
    role: s.role,
    dept: s.department,
    team: s.department,
    phone: s.phone,
    salary: s.salary,
    status: s.loginEnabled ? 'Active' : 'Inactive',
    loginEnabled: s.loginEnabled,
    avatar: s.fullName?.[0]?.toUpperCase() || 'S',
    color: '#B11E6A',
  }));

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
    form.validateFields().then(async (vals) => {
      try {
        await createStaff({
          fullName: vals.name,
          role: vals.role,
          department: vals.dept,
          phone: vals.phone,
          salary: vals.salary,
        }).unwrap();
        enqueueSnackbar(`${vals.name} added successfully`, { variant: 'success' });
        form.resetFields();
        setAddOpen(false);
      } catch {
        enqueueSnackbar('Failed to add staff member', { variant: 'error' });
      }
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
    { title: 'Phone', dataIndex: 'phone', responsive: ['md'] },
    { title: 'Salary', dataIndex: 'salary', responsive: ['md'], render: (v) => <Text strong>{v}</Text> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Badge status={v === 'Active' ? 'success' : 'error'} text={v} /> },
  ];

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Staff', val: staffList.length, color: '#B11E6A' },
          { label: 'Active', val: staffList.filter((s) => s.status === 'Active').length, color: '#8a1652' },
          { label: 'Inactive', val: staffList.filter((s) => s.status === 'Inactive').length, color: '#C94F8A' },
          { label: 'Departments', val: DEPARTMENTS.length, color: '#D85C9E' },
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
            onClick={() => { if (!requireAccess('add')) return; setAddOpen(true); }}
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
            <Option value="Active">Active</Option>
            <Option value="Inactive">Inactive</Option>
          </Select>
        </div>
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table
            dataSource={filteredStaff}
            columns={columns}
            pagination={{ pageSize: 10, size: 'small' }}
            size="small"
            loading={staffLoading}
          />
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

// ── Main Component ────────────────────────────────────────────────────────
export default function Staff() {
  const isDark = useSelector((s) => s.theme.isDark);

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="User Management" items={[{ label: 'User Management' }]} />
      <div style={{ marginTop: 4 }}>
        <StaffList isDark={isDark} />
      </div>
    </div>
  );
}
