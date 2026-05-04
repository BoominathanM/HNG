import React, { useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input,
  Typography, Space, Badge, Avatar, Progress, Alert, Descriptions, Divider, Tooltip, DatePicker,
} from 'antd';
import {
  PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined,
  PlayCircleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

// ── Data ─────────────────────────────────────────────────────────────────
const initialTasks = [
  {
    key: 1, id: 'TSK-101', type: 'Production', title: 'Produce Soap Batch - ORD-2401',
    orderId: 'ORD-2401', client: 'Hotel Blue Star', salesPerson: 'Priya',
    createdAt: '2024-01-20T10:00:00Z', assignee: 'Ramesh K', priority: 'High',
    status: 'In Progress', startTime: '2024-01-21T09:00:00Z', due: '2024-01-22',
    paymentStatus: 'Paid', salesFollowup: false, dispatchStatus: 'Dispatched',
    product: 'Soap Round 50g', qty: 2000,
    phases: { completed: 4, total: 4 },
    phasesList: [
      { phase: 1, qty: 500, status: 'Delivered', date: '2024-01-22' },
      { phase: 2, qty: 500, status: 'Delivered', date: '2024-01-24' },
      { phase: 3, qty: 500, status: 'Delivered', date: '2024-01-26' },
      { phase: 4, qty: 500, status: 'Delivered', date: '2024-01-28' },
    ],
  },
  {
    key: 2, id: 'TSK-102', type: 'Sticker Work', title: 'Apply stickers - ORD-2402',
    orderId: 'ORD-2402', client: 'Marriott Mumbai', salesPerson: 'Arun',
    createdAt: '2024-01-21T11:30:00Z', assignee: 'Kavitha S', priority: 'Medium',
    status: 'Pending', due: '2024-01-23',
    paymentStatus: 'Pending', salesFollowup: true, dispatchStatus: null,
    product: 'Shampoo 30ml Flip', qty: 3000,
    phases: { completed: 1, total: 4 },
    phasesList: [
      { phase: 1, qty: 750, status: 'Delivered', date: '2024-01-25' },
      { phase: 2, qty: 750, status: 'Pending', date: '' },
      { phase: 3, qty: 750, status: 'Pending', date: '' },
      { phase: 4, qty: 750, status: 'Pending', date: '' },
    ],
  },
  {
    key: 3, id: 'TSK-103', type: 'Packing', title: 'Pack dental kits - ORD-2403',
    orderId: 'ORD-2403', client: 'Taj Hotels Delhi', salesPerson: 'Priya',
    createdAt: '2024-01-22T14:15:00Z', assignee: 'Meena D', priority: 'High',
    status: 'Completed', startTime: '2024-01-23T10:00:00Z', endTime: '2024-01-23T15:30:00Z', due: '2024-01-20',
    paymentStatus: 'Partial', salesFollowup: true, dispatchStatus: null,
    product: 'Dental Kit', qty: 3000,
    phases: { completed: 2, total: 3 },
    phasesList: [
      { phase: 1, qty: 1000, status: 'Delivered', date: '2024-01-23' },
      { phase: 2, qty: 1000, status: 'Delivered', date: '2024-01-24' },
      { phase: 3, qty: 1000, status: 'Pending', date: '' },
    ],
  },
  {
    key: 4, id: 'TSK-104', type: 'Procurement', title: 'Buy Soap Base 500kg',
    orderId: '', client: '', salesPerson: 'N/A',
    createdAt: '2024-01-20T09:00:00Z', assignee: 'Suresh T', priority: 'Urgent',
    status: 'In Progress', startTime: '2024-01-20T10:30:00Z', due: '2024-01-21',
    paymentStatus: null, salesFollowup: false, dispatchStatus: null,
    product: 'Soap Base', qty: 500,
    phases: { completed: 0, total: 1 },
    phasesList: [],
  },
  {
    key: 5, id: 'TSK-105', type: 'Internal', title: 'Quality Check - Batch B-22',
    orderId: '', client: '', salesPerson: 'N/A',
    createdAt: '2024-01-22T10:00:00Z', assignee: 'Ramesh K', priority: 'Low',
    status: 'Pending', due: '2024-01-24',
    paymentStatus: null, salesFollowup: false, dispatchStatus: null,
    product: 'Batch B-22', qty: 0,
    phases: { completed: 0, total: 1 },
    phasesList: [],
  },
];

const typeColor = { Production: '#B11E6A', 'Sticker Work': '#8a1652', Packing: '#C94F8A', Procurement: '#D85C9E', Internal: '#6b1240' };
const priorityColor = { Urgent: '#6b1240', High: '#B11E6A', Medium: '#C94F8A', Low: '#D85C9E' };
const statusColor = { 'In Progress': '#B11E6A', Pending: '#C94F8A', Completed: '#6b1240' };
const paymentColor = { Paid: 'success', Pending: 'warning', Partial: 'orange' };

const kanbanCols = [
  { key: 'Pending', label: 'Pending', color: '#C94F8A' },
  { key: 'In Progress', label: 'In Progress', color: '#B11E6A' },
  { key: 'Completed', label: 'Completed', color: '#6b1240' },
];

// ─────────────────────────────────────────────────────────────────────────
export default function Tasks() {
  const isDark = useSelector((s) => s.theme.isDark);
  const [taskList, setTaskList] = useState(initialTasks);
  const [searchText, setSearchText] = useState('');
  const [view, setView] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // New state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [emergencyDispatchOpen, setEmergencyDispatchOpen] = useState(false);
  const [emergencyTask, setEmergencyTask] = useState(null);
  const [emergencyForm] = Form.useForm();
  const [approvals, setApprovals] = useState({ sales: false, opHead: false });

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleStartTask = (taskId) => {
    setTaskList((prev) => prev.map((t) =>
      t.id === taskId
        ? { ...t, status: 'In Progress', startTime: new Date().toISOString(), salesFollowup: !!t.client }
        : t
    ));
  };

  const handleCompleteTask = (taskId) => {
    setTaskList((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: 'Completed', endTime: new Date().toISOString() } : t
    ));
  };

  const handleFollowupDone = (taskId) => {
    setTaskList((prev) => prev.map((t) => t.id === taskId ? { ...t, salesFollowup: false } : t));
  };

  const openEmergency = (task) => {
    setEmergencyTask(task);
    setApprovals({ sales: false, opHead: false });
    setEmergencyDispatchOpen(true);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Task ID', dataIndex: 'id',
      render: (v, r) => (
        <Button type="link" style={{ color: '#B11E6A', padding: 0, fontWeight: 700 }}
          onClick={() => { setSelectedTask(r); setTaskDetailOpen(true); }}>
          {v}
        </Button>
      ),
    },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ borderRadius: 20 }}>{v}</Tag> },
    { title: 'Title', dataIndex: 'title' },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'],
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'] },
    {
      title: 'Assignee', dataIndex: 'assignee', responsive: ['md'],
      render: (v) => <Space><Avatar size={24} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>,
    },
    { title: 'Priority', dataIndex: 'priority', responsive: ['sm'], render: (v) => <Tag color={priorityColor[v]}>{v}</Tag> },
    {
      title: 'Payment', dataIndex: 'paymentStatus', responsive: ['lg'],
      render: (v) => v ? <Tag color={paymentColor[v] || 'default'}>{v}</Tag> : <Text style={{ color: '#999', fontSize: 11 }}>N/A</Text>,
    },
    {
      title: 'Follow-up', key: 'followup', responsive: ['md'],
      render: (_, r) => r.salesFollowup
        ? (
          <Tooltip title={`${r.salesPerson} must follow up with ${r.client}`}>
            <Tag color="red" icon={<BellOutlined />} style={{ cursor: 'pointer' }}
              onClick={() => handleFollowupDone(r.id)}>
              Required
            </Tag>
          </Tooltip>
        )
        : <Tag color="default" style={{ color: '#999' }}>Done</Tag>,
    },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Due', dataIndex: 'due', responsive: ['lg'] },
    {
      title: 'Action', key: 'action',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {r.status === 'Pending' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />}
              onClick={() => handleStartTask(r.id)} style={{ background: '#1890ff', border: 'none' }}>
              Start
            </Button>
          )}
          {r.status === 'In Progress' && (
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => handleCompleteTask(r.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
              Done
            </Button>
          )}
          {r.status === 'Completed' && r.paymentStatus === 'Paid' && !r.dispatchStatus && (
            <Button size="small" type="primary" icon={<ShoppingOutlined />}
              style={{ background: '#52c41a', border: 'none' }}>
              Dispatch
            </Button>
          )}
          {r.status === 'Completed' && r.paymentStatus && r.paymentStatus !== 'Paid' && !r.dispatchStatus && (
            <Space direction="vertical" size={2}>
              <Tag color="warning" style={{ fontSize: 10 }}>Awaiting Payment</Tag>
              <Button size="small" danger icon={<ExclamationCircleOutlined />}
                onClick={() => openEmergency(r)}>
                Emergency
              </Button>
            </Space>
          )}
          {r.dispatchStatus && <Tag color="success">{r.dispatchStatus}</Tag>}
          {r.startTime && <Text style={{ fontSize: 10, color: '#666' }}>Start: {new Date(r.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
          {r.endTime && <Text style={{ fontSize: 10, color: '#666' }}>End: {new Date(r.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
        </Space>
      ),
    },
  ];

  const followupTasks = taskList.filter((t) => t.salesFollowup);
  const filtered = taskList.filter((t) =>
    !searchText ||
    t.id.toLowerCase().includes(searchText.toLowerCase()) ||
    t.title.toLowerCase().includes(searchText.toLowerCase()) ||
    (t.client && t.client.toLowerCase().includes(searchText.toLowerCase()))
  );

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Task Management" items={[{ label: 'Task Management' }]} style={{ marginBottom: 0 }} />
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search tasks..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} allowClear style={{ width: 200, borderRadius: 8 }} />
          <Button.Group>
            <Button type={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} style={view === 'table' ? { background: '#B11E6A', border: 'none' } : {}}>Table</Button>
            <Button type={view === 'kanban' ? 'primary' : 'default'} onClick={() => setView('kanban')} style={view === 'kanban' ? { background: '#B11E6A', border: 'none' } : {}}>Kanban</Button>
          </Button.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>New Task</Button>
        </Space>
      </div>

      {/* Sales follow-up alert bar */}
      {followupTasks.length > 0 && (
        <Alert
          type="warning" showIcon icon={<BellOutlined />}
          message={`${followupTasks.length} task(s) require Sales Follow-up`}
          description={
            <Space wrap>
              {followupTasks.map((t) => (
                <Tag key={t.id} color="orange">{t.id} — {t.salesPerson} → {t.client}</Tag>
              ))}
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Summary stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {kanbanCols.map((col) => {
          const count = taskList.filter((t) => t.status === col.key).length;
          return (
            <Col xs={8} key={col.key}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${col.color}25 0%, ${col.color}10 100%)`, boxShadow: `0 4px 20px ${col.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                  <Title level={3} style={{ margin: 0, color: col.color }}>{count}</Title>
                  <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{col.label}</Text>
                </Card>
              </motion.div>
            </Col>
          );
        })}
      </Row>

      {/* Table view */}
      {view === 'table' ? (
        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
          <div className="table-responsive" style={{ padding: '4px' }}>
            <Table dataSource={filtered} columns={columns} pagination={{ pageSize: 8, size: 'small' }} size="small" />
          </div>
        </Card>
      ) : (
        /* Kanban view */
        <Row gutter={[16, 16]}>
          {kanbanCols.map((col) => (
            <Col xs={24} md={8} key={col.key}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                    <Text strong>{col.label}</Text>
                    <Badge count={taskList.filter((t) => t.status === col.key).length} style={{ background: col.color }} />
                  </div>
                }
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', minHeight: 400 }}
                styles={{ body: { padding: '8px' } }}
              >
                {filtered.filter((t) => t.status === col.key).map((task) => (
                  <motion.div key={task.id} whileHover={{ y: -2 }}>
                    <Card size="small" style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${col.color}20` }} styles={{ body: { padding: '10px 12px' } }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Button type="link" style={{ padding: 0, color: '#B11E6A', fontWeight: 700, height: 'auto' }}
                          onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}>
                          {task.id}
                        </Button>
                        {task.salesFollowup && (
                          <Tooltip title={`${task.salesPerson} → follow up on ${task.client}`}>
                            <BellOutlined style={{ color: '#fa8c16' }} />
                          </Tooltip>
                        )}
                      </div>
                      <Tag color={typeColor[task.type]} style={{ marginBottom: 6, borderRadius: 20, fontSize: 11 }}>{task.type}</Tag>
                      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{task.title}</Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Space size={4}><Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} /><Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{task.assignee}</Text></Space>
                        <Tag color={priorityColor[task.priority]} style={{ margin: 0, fontSize: 11 }}>{task.priority}</Tag>
                      </div>
                      {task.paymentStatus && <Tag color={paymentColor[task.paymentStatus] || 'default'} style={{ fontSize: 10, marginBottom: 6 }}>{task.paymentStatus}</Tag>}
                      <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 8 }}>
                        {task.status === 'Pending' && (
                          <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartTask(task.id)} style={{ background: '#1890ff', border: 'none', width: '100%' }}>Start</Button>
                        )}
                        {task.status === 'In Progress' && (
                          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteTask(task.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', width: '100%' }}>Done</Button>
                        )}
                        {task.status === 'Completed' && task.paymentStatus === 'Paid' && !task.dispatchStatus && (
                          <Button size="small" type="primary" icon={<ShoppingOutlined />} style={{ background: '#52c41a', border: 'none', width: '100%' }}>Dispatch</Button>
                        )}
                        {task.status === 'Completed' && task.paymentStatus && task.paymentStatus !== 'Paid' && !task.dispatchStatus && (
                          <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={() => openEmergency(task)} style={{ width: '100%' }}>Emergency Dispatch</Button>
                        )}
                        {task.startTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Started: {new Date(task.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                        {task.endTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Ended: {new Date(task.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                      </Space>
                    </Card>
                  </motion.div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── New Task Modal (existing, unchanged) ─────────────────────────────── */}
      <Modal title="Create New Task" open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Task</Button>,
        ]}
        width={Math.min(520, window.innerWidth - 32)}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Task Type" name="type" rules={[{ required: true }]}>
                <Select>{Object.keys(typeColor).map((t) => <Option key={t} value={t}>{t}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Priority" name="priority" rules={[{ required: true }]}>
                <Select>{Object.keys(priorityColor).map((p) => <Option key={p} value={p}>{p}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24}><Form.Item label="Task Title" name="title" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Related Order" name="orderId">
                <Select placeholder="Select Order" allowClear>
                  {['ORD-2401', 'ORD-2402', 'ORD-2403', 'ORD-2404', 'ORD-2406'].map((o) => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Client Name" name="client">
                <Select placeholder="Select Client/Hotel" allowClear>
                  {['Hotel Blue Star', 'Marriott Mumbai', 'Taj Hotels Delhi', 'ITC Grand', 'Hyatt Chennai'].map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Assign To" name="assignee">
                <Select>{['Ramesh K', 'Kavitha S', 'Meena D', 'Suresh T'].map((e) => <Option key={e} value={e}>{e}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}><Form.Item label="Due Date" name="due"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="End Time" name="endTime"><Input type="time" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Description" name="desc"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Task Order Detail Modal ───────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#B11E6A' }} />
            <span>Task Details: {selectedTask?.id}</span>
            <Tag color={statusColor[selectedTask?.status]}>{selectedTask?.status}</Tag>
          </Space>
        }
        open={taskDetailOpen}
        onCancel={() => setTaskDetailOpen(false)}
        width={Math.min(700, window.innerWidth - 32)}
        footer={[
          selectedTask?.salesFollowup && (
            <Button key="followup" icon={<BellOutlined />}
              style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
              onClick={() => { handleFollowupDone(selectedTask.id); setTaskDetailOpen(false); }}>
              Mark Follow-up Done
            </Button>
          ),
          <Button key="close" onClick={() => setTaskDetailOpen(false)}>Close</Button>,
        ].filter(Boolean)}
      >
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

            {/* Follow-up alert */}
            {selectedTask.salesFollowup && (
              <Alert type="warning" showIcon icon={<BellOutlined />}
                message="Sales Follow-up Required"
                description={`${selectedTask.salesPerson} should contact ${selectedTask.client} to follow up on payment / order status.`}
                style={{ borderRadius: 8 }}
              />
            )}

            {/* Task info — no address, no pricing */}
            <div>
              <Text style={{ fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Task Information</Text>
              <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                <Descriptions.Item label="Task ID"><Text strong>{selectedTask.id}</Text></Descriptions.Item>
                <Descriptions.Item label="Type"><Tag color={typeColor[selectedTask.type]}>{selectedTask.type}</Tag></Descriptions.Item>
                <Descriptions.Item label="Priority"><Tag color={priorityColor[selectedTask.priority]}>{selectedTask.priority}</Tag></Descriptions.Item>
                <Descriptions.Item label="Assignee">
                  <Space><Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{selectedTask.assignee}</Space>
                </Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={statusColor[selectedTask.status]}>{selectedTask.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="Due Date">{selectedTask.due}</Descriptions.Item>
                {selectedTask.startTime && (
                  <Descriptions.Item label="Started">{new Date(selectedTask.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                )}
                {selectedTask.endTime && (
                  <Descriptions.Item label="Completed">{new Date(selectedTask.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* Hotel / Order Details — no address, no pricing */}
            {selectedTask.orderId && (
              <div>
                <Text style={{ fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Order Details</Text>
                <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                  <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{selectedTask.orderId}</Text></Descriptions.Item>
                  <Descriptions.Item label="Hotel / Client"><Text strong>{selectedTask.client}</Text></Descriptions.Item>
                  <Descriptions.Item label="Product">{selectedTask.product}</Descriptions.Item>
                  <Descriptions.Item label="Quantity">{selectedTask.qty.toLocaleString()} units</Descriptions.Item>
                  <Descriptions.Item label="Sales Person">{selectedTask.salesPerson}</Descriptions.Item>
                  <Descriptions.Item label="Payment">
                    {selectedTask.paymentStatus
                      ? <Tag color={paymentColor[selectedTask.paymentStatus]}>{selectedTask.paymentStatus}</Tag>
                      : 'N/A'}
                  </Descriptions.Item>
                  {selectedTask.dispatchStatus && (
                    <Descriptions.Item label="Dispatch"><Tag color="success">{selectedTask.dispatchStatus}</Tag></Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            )}

            {/* Phase progress */}
            {selectedTask.orderId && selectedTask.phases && (
              <div>
                <Space style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Phase Progress</Text>
                  <Tag color="#B11E6A">{selectedTask.phases.completed}/{selectedTask.phases.total} Done</Tag>
                </Space>
                <Progress percent={Math.round((selectedTask.phases.completed / selectedTask.phases.total) * 100)} strokeColor="#B11E6A" size="small" style={{ marginBottom: 8 }} />
                {selectedTask.phasesList.length > 0 && (
                  <Table
                    dataSource={selectedTask.phasesList}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Phase', dataIndex: 'phase', render: (v) => <Text strong>Phase {v}</Text> },
                      { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
                      { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'Delivered' ? 'success' : 'processing'}>{s}</Tag> },
                      { title: 'Date', dataIndex: 'date', render: (d) => d || '—' },
                    ]}
                  />
                )}
              </div>
            )}

            {/* Dispatch blocked notice */}
            {selectedTask.status === 'Completed' && selectedTask.paymentStatus && selectedTask.paymentStatus !== 'Paid' && !selectedTask.dispatchStatus && (
              <Alert type="error" showIcon icon={<ExclamationCircleOutlined />}
                message="Dispatch Blocked — Payment Pending"
                description={`Payment status: "${selectedTask.paymentStatus}". Dispatch is enabled only after full payment. For emergencies, use Emergency Dispatch — requires Sales Person + Operation Head approval.`}
                style={{ borderRadius: 8 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* ── Emergency Dispatch Approval Modal ────────────────────────────────── */}
      <Modal
        title={<Space><ExclamationCircleOutlined style={{ color: '#f5222d' }} /><span>Emergency Dispatch Approval</span></Space>}
        open={emergencyDispatchOpen}
        onCancel={() => setEmergencyDispatchOpen(false)}
        width={Math.min(580, window.innerWidth - 32)}
        footer={[
          <Button key="cancel" onClick={() => setEmergencyDispatchOpen(false)}>Cancel</Button>,
          <Button key="submit" type="primary" danger
            disabled={!approvals.sales || !approvals.opHead}
            onClick={() => setEmergencyDispatchOpen(false)}>
            Submit Emergency Dispatch
          </Button>,
        ]}
      >
        {emergencyTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            <Alert type="error" showIcon
              message="Emergency Dispatch bypasses the payment gate"
              description="Both Sales Person and Operation Head must approve before proceeding."
              style={{ borderRadius: 8 }}
            />

            {/* Order summary — no address, no pricing */}
            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
              <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{emergencyTask.orderId}</Text></Descriptions.Item>
              <Descriptions.Item label="Client">{emergencyTask.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{emergencyTask.product}</Descriptions.Item>
              <Descriptions.Item label="Qty">{emergencyTask.qty.toLocaleString()} units</Descriptions.Item>
              <Descriptions.Item label="Payment Status"><Tag color="warning">{emergencyTask.paymentStatus}</Tag></Descriptions.Item>
              <Descriptions.Item label="Sales Person">{emergencyTask.salesPerson}</Descriptions.Item>
            </Descriptions>

            <Form form={emergencyForm} layout="vertical">
              <Form.Item label="Reason for Emergency Dispatch" name="reason" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="Describe why emergency dispatch is required..." />
              </Form.Item>
            </Form>

            <Divider style={{ margin: '0' }} />

            {/* Dual approval */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Approvals Required</Text>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Card size="small" style={{ borderRadius: 8, border: `1px solid ${approvals.sales ? '#52c41a' : '#f0f0f0'}` }} styles={{ body: { padding: '10px 14px' } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} size={28} />
                      <div>
                        <Text strong style={{ display: 'block' }}>Sales Person — {emergencyTask.salesPerson}</Text>
                        <Text style={{ fontSize: 11, color: '#999' }}>Customer relationship & payment accountability</Text>
                      </div>
                    </Space>
                    {approvals.sales
                      ? <Tag color="success">Approved</Tag>
                      : <Button size="small" type="primary" style={{ background: '#1890ff', border: 'none' }} onClick={() => setApprovals((p) => ({ ...p, sales: true }))}>Approve</Button>}
                  </div>
                </Card>

                <Card size="small" style={{ borderRadius: 8, border: `1px solid ${approvals.opHead ? '#52c41a' : '#f0f0f0'}` }} styles={{ body: { padding: '10px 14px' } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar icon={<UserOutlined />} style={{ background: '#B11E6A' }} size={28} />
                      <div>
                        <Text strong style={{ display: 'block' }}>Operation Head</Text>
                        <Text style={{ fontSize: 11, color: '#999' }}>Operations oversight & dispatch authorization</Text>
                      </div>
                    </Space>
                    {approvals.opHead
                      ? <Tag color="success">Approved</Tag>
                      : <Button size="small" type="primary" style={{ background: '#B11E6A', border: 'none' }} onClick={() => setApprovals((p) => ({ ...p, opHead: true }))}>Approve</Button>}
                  </div>
                </Card>
              </Space>

              {(!approvals.sales || !approvals.opHead)
                ? <Alert type="info" showIcon message="Waiting for both approvals to enable dispatch" style={{ marginTop: 12, borderRadius: 8 }} />
                : <Alert type="success" showIcon message="Both approvals received — Emergency dispatch can proceed" style={{ marginTop: 12, borderRadius: 8 }} />
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
