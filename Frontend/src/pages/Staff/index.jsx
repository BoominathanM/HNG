import React from 'react';
import { Row, Col, Card, Table, Tag, Avatar, Typography, Space, Progress, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;

const staff = [
  { key: 1, name: 'Ramesh Kumar', role: 'Production Lead', dept: 'Production', phone: '+91 98765 43210', shift: 'Morning', attendance: 26, salary: '₹22,000', performance: 92, status: 'Present' },
  { key: 2, name: 'Kavitha S', role: 'Sticker Work', dept: 'Production', phone: '+91 87654 32109', shift: 'Morning', attendance: 24, salary: '₹16,000', performance: 88, status: 'Present' },
  { key: 3, name: 'Meena Devi', role: 'Packing Staff', dept: 'Dispatch', phone: '+91 76543 21098', shift: 'Evening', attendance: 22, salary: '₹14,000', performance: 78, status: 'Absent' },
  { key: 4, name: 'Suresh T', role: 'Quality Check', dept: 'Quality', phone: '+91 65432 10987', shift: 'Morning', attendance: 25, salary: '₹18,000', performance: 85, status: 'Present' },
  { key: 5, name: 'Lakshmi R', role: 'Sales Executive', dept: 'Sales', phone: '+91 54321 09876', shift: 'Morning', attendance: 27, salary: '₹20,000', performance: 95, status: 'Present' },
];

export default function Staff() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

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
    <div className="page-container fade-in">
      <PageBreadcrumb title="Staff Management" items={[{ label: 'Staff Management' }]} />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Staff', val: 32, color: '#B11E6A' },
          { label: 'Present Today', val: 28, color: '#8a1652' },
          { label: 'On Leave', val: 3, color: '#C94F8A' },
          { label: 'Absent', val: 1, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} bodyStyle={{ padding: '16px 8px' }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} bodyStyle={{ padding: 0 }}>
        <div className="table-responsive" style={{ padding: '4px' }}>
          <Table dataSource={staff} columns={columns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
        </div>
      </Card>
    </div>
  );
}
