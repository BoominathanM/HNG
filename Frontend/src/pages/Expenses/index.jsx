import React, { useState, useMemo } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import dayjs from 'dayjs';
import { Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Space, Statistic, Divider, InputNumber, DatePicker, Upload, Tabs, Image, Empty, Spin } from 'antd';
import { enqueueSnackbar } from 'notistack';
import { PlusOutlined, DollarOutlined, FilterOutlined, DownloadOutlined, PieChartOutlined, CalendarOutlined, ShoppingCartOutlined, CarOutlined, AppstoreOutlined, UploadOutlined, EyeOutlined, ShoppingOutlined, SearchOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseByIdQuery,
  useRecordExpensePaymentMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const EXPENSE_CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Raw Material', color: '#B11E6A', icon: <ShoppingCartOutlined /> },
  { value: 'SHIPPING', label: 'Shipping / Transportation', color: '#1890ff', icon: <CarOutlined /> },
  { value: 'UTILITY', label: 'Utilities (Rent/Elec)', color: '#fa8c16', icon: <AppstoreOutlined /> },
  { value: 'OTHER', label: 'Other Expenses', color: '#722ed1', icon: <PlusOutlined /> },
];

// Maps stored DB labels (old and new) → EXPENSE_CATEGORIES value
const CATEGORY_VALUE_MAP = {
  'Raw Material': 'RAW_MATERIAL',
  'Shipping / Transportation': 'SHIPPING',
  'Utility': 'UTILITY',
  'Utilities (Rent/Elec)': 'UTILITY',
  'Other': 'OTHER',
  'Purchase': 'PURCHASE',
  'Rent': 'OTHER',
  'Salary & Wages': 'OTHER',
  'Marketing': 'OTHER',
};


export default function Expenses() {
  const makeUpload = useCloudinaryUpload();
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth?.user);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: expData, isLoading: expLoading } = useGetExpensesQuery();
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  // Detail + payment state
  const [detailExpenseId, setDetailExpenseId] = useState(null);
  const [payVisible, setPayVisible] = useState(false);
  const [payForm] = Form.useForm();

  const { data: detailData, isFetching: detailFetching } = useGetExpenseByIdQuery(
    detailExpenseId,
    { skip: !detailExpenseId }
  );
  const [recordExpensePayment, { isLoading: payLoading }] = useRecordExpensePaymentMutation();
  const detailExpense = detailData?.data;

  const expenses = useMemo(() => (expData?.data || []).map((e) => ({
    key: e._id,
    date: e.expenseDate?.slice(0, 10),
    category: CATEGORY_VALUE_MAP[e.category] || 'OTHER',
    customCategory: e.customCategory,
    desc: e.description,
    amount: e.amount,
    status: e.paymentStatus,
    vendor: e.vendorPayee,
    expenseCode: e.expenseCode,
    source: e.expenseSource || 'manual',
    proofUrl: e.proofUrl,
    paidBy: e.paidBy,
    paidDate: e.paidDate?.slice(0, 10),
  })), [expData]);

  const { filterTabs } = useTabAccess('Expenses');
  const { requireAccess } = usePageAccess('Expenses');

  const handleExport = () => {
    const rows = applyExpFilter(allExpenses);
    if (!rows.length) { enqueueSnackbar('No data to export', { variant: 'warning' }); return; }
    const headers = ['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Status'];
    const csv = [
      headers.join(','),
      ...rows.map(r => {
        const cat = EXPENSE_CATEGORIES.find(x => x.value === r.category);
        const catLabel = r.category === 'OTHER' ? (r.customCategory || 'Other') : (cat?.label || r.category);
        return [
          r.date || '',
          `"${catLabel}"`,
          `"${(r.desc || '').replace(/"/g, '""')}"`,
          `"${(r.vendor || '').replace(/"/g, '""')}"`,
          r.amount || 0,
          r.status || '',
        ].join(',');
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Search & Filter state ── */
  const [expSearch, setExpSearch] = useState('');
  const [expCategory, setExpCategory] = useState('all');
  const [expStatus, setExpStatus] = useState(null);
  const [expenseDateRange, setExpenseDateRange] = useState(null);

  // Combined expense list for "All Expenses" tab
  const allExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  const applyExpFilter = (list) => list.filter((e) => {
    const q = expSearch.toLowerCase();
    const matchSearch = !q || (e.desc || '').toLowerCase().includes(q) || (e.vendor || '').toLowerCase().includes(q) || (e.invoice_no || '').toLowerCase().includes(q);
    const matchCategory = expCategory === 'all' || e.category === expCategory;
    const matchStatus = !expStatus || e.status === expStatus;
    let matchDateRange = true;
    if (expenseDateRange) {
      const d = e.date || '';
      matchDateRange = d >= expenseDateRange[0] && d <= expenseDateRange[1];
    }
    return matchSearch && matchCategory && matchStatus && matchDateRange;
  });

  const handleAddExpense = async (values) => {
    try {
      const formData = new FormData();
      formData.append('expenseDate', values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
      formData.append('category', values.category === 'OTHER' ? 'Other' : (EXPENSE_CATEGORIES.find(c => c.value === values.category)?.label || values.category));
      if (values.category === 'OTHER' && values.customCategory) formData.append('customCategory', values.customCategory);
      formData.append('description', values.desc);
      formData.append('amount', values.amount);
      if (values.vendor) formData.append('vendorPayee', values.vendor);
      const expProofFile = values.proof?.fileList?.[0];
      if (expProofFile?.url) {
        formData.append('proofUrl', expProofFile.url);
      } else if (expProofFile?.originFileObj) {
        formData.append('proof', expProofFile.originFileObj);
      }
      await createExpense(formData).unwrap();
      enqueueSnackbar('Expense added successfully', { variant: 'success' });
      setIsModalOpen(false);
      form.resetFields();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to add expense', { variant: 'error' });
    }
  };

  const handleRecordPayment = async (values) => {
    try {
      const formData = new FormData();
      formData.append('amountPaid', values.amountPaid);
      if (values.paidBy) formData.append('paidBy', values.paidBy);
      if (values.note) formData.append('note', values.note);
      const proofFile = values.proof?.fileList?.[0];
      if (proofFile?.url) formData.append('proofUrl', proofFile.url);
      await recordExpensePayment({ id: detailExpenseId, formData }).unwrap();
      enqueueSnackbar('Payment recorded successfully', { variant: 'success' });
      payForm.resetFields();
      setPayVisible(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to record payment', { variant: 'error' });
    }
  };

  const chartData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.label,
    value: expenses.filter(e => e.category === cat.value).reduce((acc, curr) => acc + curr.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const makeExpenseColumns = (showSource = false) => [
    { title: 'Date', dataIndex: 'date', key: 'date', render: d => <Text style={{ color: textColor }}>{d}</Text> },
    {
      title: 'Category', key: 'category',
      render: (_, r) => {
        if (r.category === 'PURCHASE') return <Tag color="#B11E6A" style={{ borderRadius: 12, padding: '0 10px' }}>Purchase</Tag>;
        const cat = EXPENSE_CATEGORIES.find(x => x.value === r.category);
        const label = r.category === 'OTHER' ? r.customCategory : cat?.label;
        return <Tag color={cat?.color} style={{ borderRadius: 12, padding: '0 10px' }}>{label}</Tag>;
      }
    },
    { title: 'Description', dataIndex: 'desc', key: 'desc', render: v => <Text style={{ color: textColor }}>{v}</Text> },
    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: v => <Text style={{ color: textColor }}>{v || '—'}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: a => <Text strong style={{ color: '#B11E6A' }}>₹{a.toLocaleString()}</Text> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: s => <Tag color={s === 'Paid' ? 'success' : s === 'Partially Paid' ? 'warning' : 'error'} style={{ borderRadius: 12 }}>{s}</Tag>
    },
    {
      title: 'Proof', key: 'proof', width: 80, align: 'center',
      render: (_, r) => {
        if (!r.proofUrl) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        if (/\.(jpg|jpeg|png|gif|webp)/i.test(r.proofUrl)) {
          return (
            <Image
              src={r.proofUrl}
              width={36}
              height={36}
              style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #B11E6A33' }}
              preview={{ mask: <EyeOutlined style={{ fontSize: 12 }} /> }}
            />
          );
        }
        return (
          <Button size="small" icon={<EyeOutlined />} type="link" style={{ color: '#B11E6A', padding: 0 }} onClick={() => window.open(r.proofUrl, '_blank')}>View</Button>
        );
      }
    },
    {
      title: 'Action', key: 'action', width: 80, align: 'center',
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          type="link"
          style={{ color: '#B11E6A', padding: 0 }}
          onClick={() => setDetailExpenseId(r.key)}
        >
          View
        </Button>
      )
    },
  ];


  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const highestCategory = useMemo(() => {
    const totals = {};
    expenses.forEach(e => {
      const label = e.category === 'OTHER' ? (e.customCategory || 'Other') : (EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category);
      totals[label] = (totals[label] || 0) + e.amount;
    });
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [expenses]);

  const pendingAmount = expenses
    .filter(e => e.status !== 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Expense Management" items={[{ label: 'Expenses' }]} style={{ marginBottom: 0 }} />
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!requireAccess('add')) return; setIsModalOpen(true); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
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
              value={highestCategory || '—'}
              valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: 18 }}
              prefix={highestCategory ? <ShoppingCartOutlined /> : null}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Statistic
              title={<Text type="secondary">Pending / Unpaid</Text>}
              value={pendingAmount}
              precision={2}
              prefix="₹"
              valueStyle={{ color: pendingAmount > 0 ? '#fa8c16' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={<Space><DollarOutlined /> <Text strong style={{ color: textColor }}>Expense Log</Text></Space>}
            style={{ borderRadius: 14, background: cardBg, border: 'none', boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '0 0 8px' } }}
          >
            <Tabs
              defaultActiveKey="all"
              size="small"
              style={{ padding: '0 16px' }}
              tabBarExtraContent={
                <Space wrap>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search desc, vendor..." allowClear size="small" value={expSearch} onChange={(e) => setExpSearch(e.target.value)} style={{ width: 200, borderRadius: 6 }} />
                  <Select value={expCategory} onChange={setExpCategory} size="small" style={{ width: 140 }}>
                    <Option value="all">All Categories</Option>
                    {EXPENSE_CATEGORIES.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
                  </Select>
                  <Select allowClear placeholder="Status" value={expStatus} onChange={setExpStatus} size="small" style={{ width: 130 }}>
                    <Option value="Paid">Paid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                    <Option value="Unpaid">Unpaid</Option>
                  </Select>
                  <DatePicker.RangePicker
                    size="small"
                    style={{ borderRadius: 8 }}
                    onChange={(dates) => setExpenseDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                    allowClear
                  />
                </Space>
              }
              items={filterTabs([
                {
                  key: 'all',
                  label: `All Expenses (${applyExpFilter(allExpenses).length})`,
                  children: (
                    <Table
                      dataSource={applyExpFilter(allExpenses)}
                      columns={makeExpenseColumns(true)}
                      size="small"
                      pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
                      style={{ padding: 4 }}
                    />
                  ),
                },
              ])}
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

      {/* Expense Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#B11E6A' }} />
            <Text strong style={{ fontSize: 15 }}>Expense Detail</Text>
            {detailExpense && <Tag color="#B11E6A" style={{ borderRadius: 10 }}>{detailExpense.expenseCode}</Tag>}
          </Space>
        }
        open={!!detailExpenseId}
        onCancel={() => { setDetailExpenseId(null); setPayVisible(false); payForm.resetFields(); }}
        footer={null}
        width={740}
        centered
        destroyOnClose
      >
        {detailFetching ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : detailExpense ? (
          <div>
            {/* Summary Grid */}
            <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
              {[
                { label: 'Date', value: detailExpense.expenseDate?.slice(0, 10) },
                { label: 'Vendor / Payee', value: detailExpense.vendorPayee || '—' },
                { label: 'Category', value: detailExpense.category + (detailExpense.customCategory ? ` (${detailExpense.customCategory})` : '') },
                { label: 'Total Amount', value: `₹${(detailExpense.amount || 0).toLocaleString()}`, color: '#B11E6A' },
                { label: 'Amount Paid', value: `₹${(detailExpense.paidAmount || 0).toLocaleString()}`, color: '#52c41a' },
                { label: 'Remaining', value: `₹${Math.max(0, (detailExpense.amount || 0) - (detailExpense.paidAmount || 0)).toLocaleString()}`, color: ((detailExpense.amount || 0) - (detailExpense.paidAmount || 0)) > 0 ? '#fa541c' : '#52c41a' },
              ].map(item => (
                <Col xs={12} sm={8} key={item.label}>
                  <div style={{ background: isDark ? '#2a2a3e' : '#fafafa', borderRadius: 8, padding: '8px 12px', border: isDark ? '1px solid #3a3a5e' : '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                    <Text strong style={{ color: item.color || textColor, fontSize: 13 }}>{item.value}</Text>
                  </div>
                </Col>
              ))}
            </Row>
            <Space style={{ marginBottom: 4 }}>
              <Tag color={detailExpense.paymentStatus === 'Paid' ? 'success' : detailExpense.paymentStatus?.includes('Partial') ? 'warning' : 'error'} style={{ borderRadius: 10 }}>
                {detailExpense.paymentStatus}
              </Tag>
              <Tag color="default" style={{ borderRadius: 10, textTransform: 'capitalize' }}>
                Source: {detailExpense.expenseSource}
              </Tag>
            </Space>

            <Divider style={{ margin: '14px 0 10px' }} orientation="left" orientationMargin={0}>
              <Text strong style={{ fontSize: 13, color: textColor }}>Payment History ({(detailExpense.paymentHistory || []).length})</Text>
            </Divider>

            {(detailExpense.paymentHistory || []).length === 0 ? (
              <Empty description="No payments recorded yet" style={{ padding: '16px 0' }} />
            ) : (
              <Table
                size="small"
                dataSource={(detailExpense.paymentHistory || []).map((p, i) => ({ key: i, ...p }))}
                pagination={false}
                columns={[
                  { title: '#', key: 'no', width: 36, render: (_, __, i) => <Text type="secondary" style={{ fontSize: 12 }}>#{i + 1}</Text> },
                  { title: 'Date', dataIndex: 'paidDate', key: 'paidDate', width: 100, render: d => d?.slice(0, 10) || '—' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 110, align: 'right', render: a => <Text strong style={{ color: '#52c41a' }}>₹{(a || 0).toLocaleString()}</Text> },
                  { title: 'Paid By', dataIndex: 'paidBy', key: 'paidBy', render: v => v || '—' },
                  { title: 'Note', dataIndex: 'note', key: 'note', ellipsis: true, render: v => v || '—' },
                  {
                    title: 'Proof', dataIndex: 'proofUrl', key: 'proof', width: 70, align: 'center',
                    render: v => {
                      if (!v) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                      if (/\.(jpg|jpeg|png|gif|webp)/i.test(v)) {
                        return <Image src={v} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #B11E6A33' }} preview={{ mask: <EyeOutlined style={{ fontSize: 10 }} /> }} />;
                      }
                      return <Button type="link" size="small" icon={<EyeOutlined />} style={{ color: '#B11E6A', padding: 0 }} onClick={() => window.open(v, '_blank')}>View</Button>;
                    }
                  },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2} />
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong style={{ color: '#52c41a' }}>
                        ₹{(detailExpense.paymentHistory || []).reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={3}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Total paid</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            )}

            {detailExpense.paymentStatus !== 'Paid' && (
              <div style={{ marginTop: 14, textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => { payForm.setFieldsValue({ paidBy: currentUser?.fullName || '' }); setPayVisible(true); }}
                  style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8 }}
                >
                  Record Payment
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            <Text strong>Record Payment</Text>
            {detailExpense && <Tag color="#B11E6A" style={{ borderRadius: 10 }}>{detailExpense.expenseCode}</Tag>}
          </Space>
        }
        open={payVisible}
        onCancel={() => { setPayVisible(false); payForm.resetFields(); }}
        footer={null}
        width={420}
        centered
        zIndex={1100}
        destroyOnClose
      >
        <Form form={payForm} layout="vertical" onFinish={handleRecordPayment} style={{ marginTop: 8 }}>
          <Form.Item
            label="Amount Paid (₹)"
            name="amountPaid"
            rules={[
              { required: true, message: 'Enter amount paid' },
              { type: 'number', min: 0.01, message: 'Must be greater than 0' },
              () => ({
                validator(_, val) {
                  const remaining = (detailExpense?.amount || 0) - (detailExpense?.paidAmount || 0);
                  if (!val || val <= remaining + 0.01) return Promise.resolve();
                  return Promise.reject(new Error(`Cannot exceed remaining: ₹${remaining.toLocaleString()}`));
                },
              }),
            ]}
          >
            <InputNumber
              prefix="₹"
              style={{ width: '100%' }}
              min={0.01}
              max={Math.max(0.01, (detailExpense?.amount || 0) - (detailExpense?.paidAmount || 0))}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/[₹,]/g, '')}
            />
          </Form.Item>
          <Form.Item label="Paid By" name="paidBy">
            <Input placeholder="Name of person paying" />
          </Form.Item>
          <Form.Item label="Note / Reference" name="note">
            <Input placeholder="Bank transfer ID, cheque no., etc. (optional)" />
          </Form.Item>
          <Form.Item label="Upload Payment Proof" name="proof">
            <Upload maxCount={1} listType="picture" customRequest={makeUpload('expenses')}>
              <Button icon={<UploadOutlined />} style={{ width: '100%', borderRadius: 8 }}>Select File</Button>
            </Upload>
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button onClick={() => { setPayVisible(false); payForm.resetFields(); }} style={{ flex: 1 }}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={payLoading}
              style={{ flex: 2, background: 'linear-gradient(135deg,#52c41a,#73d13d)', border: 'none', borderRadius: 8 }}
            >
              Confirm Payment
            </Button>
          </div>
        </Form>
      </Modal>

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
          <Form.Item label="Upload Proof / Receipt" name="proof">
            <Upload maxCount={1} listType="picture" customRequest={makeUpload('expenses')}>
              <Button icon={<UploadOutlined />} style={{ width: '100%', borderRadius: 8 }}>Select File</Button>
            </Upload>
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
