import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Space, Statistic, Divider, InputNumber, DatePicker } from 'antd';
import { PlusOutlined, DollarOutlined, FilterOutlined, DownloadOutlined, PieChartOutlined, CalendarOutlined, ShoppingCartOutlined, CarOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const EXPENSE_CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Raw Material', color: '#B11E6A', icon: <ShoppingCartOutlined /> },
  { value: 'SHIPPING', label: 'Shipping / Transportation', color: '#1890ff', icon: <CarOutlined /> },
  { value: 'UTILITY', label: 'Utilities (Rent/Elec)', color: '#fa8c16', icon: <AppstoreOutlined /> },
  { value: 'OTHER', label: 'Other Expenses', color: '#722ed1', icon: <PlusOutlined /> },
];

const INITIAL_EXPENSES = [
  { key: 1, date: '2024-05-01', category: 'RAW_MATERIAL', desc: 'Soap Base (White) 500kg', amount: 42500, status: 'Paid', vendor: 'ChemCo India' },
  { key: 2, date: '2024-05-02', category: 'SHIPPING', desc: 'Dispatch to Marriott Mumbai', amount: 3500, status: 'Paid', vendor: 'SafeExpress' },
  { key: 3, date: '2024-05-03', category: 'UTILITY', desc: 'Monthly Office Rent', amount: 25000, status: 'Paid', vendor: 'RealEstates Inc' },
  { key: 4, date: '2024-05-04', category: 'OTHER', desc: 'Office Stationery', amount: 1200, status: 'Paid', vendor: 'Local Mart' },
];

export default function Expenses() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleAddExpense = (values) => {
    const newExpense = {
      key: Date.now(),
      ...values,
      categoryLabel: values.category === 'OTHER' ? values.customCategory : EXPENSE_CATEGORIES.find(c => c.value === values.category)?.label,
      status: 'Paid',
    };
    setExpenses([newExpense, ...expenses]);
    setIsModalOpen(false);
    form.resetFields();
  };

  const chartData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.label,
    value: expenses.filter(e => e.category === cat.value).reduce((acc, curr) => acc + curr.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => <Text style={{ color: textColor }}>{d}</Text>
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, r) => {
        const cat = EXPENSE_CATEGORIES.find(x => x.value === r.category);
        const label = r.category === 'OTHER' ? r.customCategory : cat?.label;
        return <Tag color={cat?.color} style={{ borderRadius: 12, padding: '0 10px' }}>{label}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'desc',
      key: 'desc',
      render: (v) => <Text style={{ color: textColor }}>{v}</Text>
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      render: (v) => <Text style={{ color: textColor }}>{v || '—'}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (a) => <Text strong style={{ color: '#B11E6A' }}>₹{a.toLocaleString()}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color="success" style={{ borderRadius: 12 }}>{s}</Tag>
    }
  ];

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Expense Management" items={[{ label: 'Expenses' }]} style={{ marginBottom: 0 }} />
        <Space>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Add Expense
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Total Expenses (This Month)</Text>}
              value={totalExpense}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#B11E6A', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Highest Category</Text>}
              value="Raw Material"
              valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: 18 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Budget Utilization</Text>}
              value={72}
              suffix="%"
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title={<Space><DollarOutlined /> <Text strong style={{ color: textColor }}>Expense Log</Text></Space>}
            extra={
              <Space>
                <DatePicker size="small" style={{ borderRadius: 6, width: 120 }} />
                <Select defaultValue="all" size="small" style={{ width: 120 }}>
                  <Option value="all">All Categories</Option>
                  {EXPENSE_CATEGORIES.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
                </Select>
              </Space>
            }
            style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: 0 } }}
          >
            <Table 
              dataSource={expenses} 
              columns={columns} 
              size="small" 
              pagination={{ pageSize: 8 }}
              style={{ padding: 4 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={<Space><PieChartOutlined /> <Text strong style={{ color: textColor }}>Distribution</Text></Space>}
            style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chartData.map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={6}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <Text style={{ fontSize: 13, color: textColor }}>{d.name}</Text>
                  </Space>
                  <Text strong style={{ fontSize: 13, color: textColor }}>₹{d.value.toLocaleString()}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Add New Expense"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={400}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleAddExpense} initialValues={{ date: dayjs() }}>
          <Form.Item label="Date" name="date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Category" name="category" rules={[{ required: true }]}>
            <Select placeholder="Select category">
              {EXPENSE_CATEGORIES.map(cat => (
                <Option key={cat.value} value={cat.value}>
                  <Space>{cat.icon} {cat.label}</Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item noStyle dependencies={['category']}>
            {({ getFieldValue }) => getFieldValue('category') === 'OTHER' && (
              <Form.Item label="Custom Category Name" name="customCategory" rules={[{ required: true, message: 'Please specify category' }]}>
                <Input placeholder="e.g. Maintenance, Tax, etc." />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item label="Vendor / Payee" name="vendor">
            <Input placeholder="Who are you paying?" />
          </Form.Item>
          <Form.Item label="Description" name="desc" rules={[{ required: true }]}>
            <Input.TextArea placeholder="What was this for?" rows={2} />
          </Form.Item>
          <Form.Item label="Amount" name="amount" rules={[{ required: true }]}>
            <InputNumber
              prefix="₹"
              style={{ width: '100%' }}
              placeholder="0.00"
              min={0}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\₹\s?|(,*)/g, '')}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
              Save Expense
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
