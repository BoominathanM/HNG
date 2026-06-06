import React, { useState, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input, Tabs, Typography, Space, 
  Badge, Avatar, Progress, Alert, Descriptions, Divider, Tooltip, 
  DatePicker,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined,
  PlayCircleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined, ShoppingOutlined,
  FileImageOutlined, CheckCircleOutlined, AlertFilled, BulbOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import {
  useGetTasksQuery,
  useGetSuggestedTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useApproveEmergencyMutation,
  useDeleteTaskMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;


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
  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery();
  const { data: suggestedData } = useGetSuggestedTasksQuery();
  const suggestedList = suggestedData?.data || [];
  const [createTask] = useCreateTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [approveEmergency] = useApproveEmergencyMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const taskList = useMemo(() => (tasksData?.data || []).map((t) => ({
    key: t._id,
    id: t.taskCode,
    type: t.taskType || 'Packing',
    name: t.taskName || t.taskCode,
    order: t.orderId?.orderCode || '—',
    client: t.orderId?.clientName || t.clientName || '—',
    product: t.product || '—',
    assignedTo: t.assignedTo?.fullName || t.assigneeName || '—',
    assignee: t.assignedTo?.fullName || t.assigneeName || '',
    // Backend stores 'Done'; the UI keys everything off 'Completed'. Normalize for display.
    status: t.status === 'Done' ? 'Completed' : t.status,
    priority: t.priority || (t.isEmergency ? 'High' : 'Normal'),
    isEmergency: t.isEmergency,
    payment: t.paymentStatus || 'Pending',
    paymentStatus: t.paymentStatus || 'Pending',
    salesPerson: t.assignedTo?.fullName || t.assigneeName || '—',
    // Needs sales follow-up: work done but payment not yet collected.
    salesFollowup: t.status === 'Done' && (t.paymentStatus || 'Pending') !== 'Paid',
    due: t.dueDate ? t.dueDate.slice(0, 10) : undefined,
    qty: t.qty,
    subTasks: t.subTasks || [],
    createdAt: t.createdAt,
  })), [tasksData]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [mainTab, setMainTab] = useState('current');
  const { filterTabs, activeKeyFor } = useTabAccess('Task Management');
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
  const resolveTaskId = (taskId) => taskList.find((t) => t.id === taskId || t.key === taskId)?.key || taskId;

  const handleStartTask = async (taskId) => {
    try {
      await updateTaskStatus({ id: resolveTaskId(taskId), status: 'In Progress' }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to start task', { variant: 'error' });
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await updateTaskStatus({ id: resolveTaskId(taskId), status: 'Done' }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to complete task', { variant: 'error' });
    }
  };

  const handleFollowupDone = () => {
    enqueueSnackbar('Follow-up marked done', { variant: 'success' });
  };

  // Kanban drag-and-drop: dropping a card into a column transitions its status.
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const colKeyToStatus = { Pending: 'Pending', 'In Progress': 'In Progress', Completed: 'Done' };
  const handleKanbanDrop = async (colKey) => {
    const id = draggedTaskId;
    setDraggedTaskId(null);
    if (!id) return;
    const task = taskList.find((t) => t.id === id || t.key === id);
    if (!task || task.status === colKey) return;
    try {
      await updateTaskStatus({ id: task.key, status: colKeyToStatus[colKey] || colKey }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to move task', { variant: 'error' });
    }
  };

  const handleCreateTask = async () => {
    try {
      const vals = await form.validateFields();
      // Only forward orderId if it's a real Mongo ObjectId (the mock ORD-xxxx codes are not).
      const realOrderId = /^[a-f0-9]{24}$/i.test(vals.orderId || '') ? vals.orderId : undefined;
      await createTask({
        taskName: vals.title,
        taskType: vals.type,
        priority: vals.priority,
        clientName: vals.client,
        assigneeName: vals.assignee,
        dueDate: vals.due ? vals.due.toISOString() : undefined,
        description: vals.desc || vals.description,
        orderId: realOrderId,
        status: 'Pending',
        isEmergency: vals.priority === 'Urgent',
      }).unwrap();
      form.resetFields();
      setModalOpen(false);
      enqueueSnackbar('Task created', { variant: 'success' });
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create task', { variant: 'error' });
    }
  };

  // Assign a task directly from a Suggested-Task readiness card.
  const handleAssignSuggested = async (s) => {
    try {
      await createTask({
        taskName: `Production — ${s.product}`,
        taskType: 'Production',
        orderId: s.orderId,
        product: s.product,
        productIndex: typeof s.id === 'string' ? Number(s.id.split('-').pop()) : undefined,
        qty: s.qty,
        clientName: s.client,
        status: 'Pending',
      }).unwrap();
      enqueueSnackbar(`Task created for ${s.product}`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to create task', { variant: 'error' });
    }
  };

  const openEmergency = (task) => {
    setEmergencyTask(task);
    setApprovals({ sales: false, opHead: false });
    setEmergencyDispatchOpen(true);
  };

  const handleEmergencySubmit = async () => {
    if (!approvals.sales || !approvals.opHead) return;
    const id = emergencyTask?.key || emergencyTask?.id;
    try {
      await approveEmergency(id).unwrap();
      enqueueSnackbar('Emergency dispatch approved and submitted', { variant: 'success' });
      setEmergencyDispatchOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to submit emergency dispatch', { variant: 'error' });
    }
  };

  // ── Inventory-based task suggestions ─────────────────────────────────
  const getSuggestedTasks = () => [];

  const getSmartSuggestion = (task) => {
    if (!task.orderId) return { text: 'Internal task — check with supervisor for instructions', alertType: 'info', canStart: true };
    return { text: 'Task is linked to an order — verify inventory and proceed as per production plan.', alertType: 'info', canStart: true };
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Task ID', dataIndex: 'id',
      render: (v, r) => {
        const isUrgent = r.isEmergency || r.priority === 'Urgent';
        return (
          <Space size={2} direction="vertical">
            <Space size={4} align="center">
              {isUrgent && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
              <Button
                type="link"
                style={{ color: isUrgent ? '#ff4d4f' : '#B11E6A', padding: 0, fontWeight: 700 }}
                onClick={() => { setSelectedTask(r); setTaskDetailOpen(true); }}
              >
                {v}
              </Button>
            </Space>
            {isUrgent && (
              <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Emergency Order</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Logo',
      key: 'logo',
      render: (_, r) => (
        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#B11E6A10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileImageOutlined style={{ color: '#B11E6A' }} />
        </div>
      )
    },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ borderRadius: 20 }}>{v}</Tag> },
    {
      title: 'Title', dataIndex: 'title', width: 220,
      render: (v) => (
        <Tooltip title={v}>
          <Text style={{ display: 'block', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Current Task',
      key: 'suggestedTask',
      render: (_, r) => {
        const suggestions = getSuggestedTasks(r);
        if (!suggestions.length) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        const s = suggestions[0];
        return (
          <Tooltip title={s.isLow ? `${s.product} — short by ${s.short.toLocaleString()} units` : s.product}>
            <Tag
              color={s.isLow ? 'error' : 'processing'}
              icon={s.isLow ? <ExclamationCircleOutlined /> : undefined}
              style={{ fontSize: 11, margin: 0 }}
            >
              {s.label}{s.isLow ? ` (−${s.short.toLocaleString()})` : ''}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'], width: 180,
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Assignee', dataIndex: 'assignee', responsive: ['md'], width: 170,
      render: (v) => v
        ? <Space><Avatar size={24} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
        : <Tag color="default" style={{ color: '#999', fontSize: 11 }}>Unassigned</Tag>,
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
            <Space direction="vertical" size={3}>
              <Tag color="processing" icon={<ClockCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>In Process</Tag>
              <Button size="small" type="primary" icon={<CheckOutlined />}
                onClick={() => handleCompleteTask(r.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
                Done
              </Button>
            </Space>
          )}
          {r.status === 'Completed' && (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>Completed</Tag>
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
  const filtered = taskList.filter((t) => {
    if (!t.assignee) return false; // exclude unassigned from Current Task tab
    const q = (searchText || '').toLowerCase();
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.client && t.client.toLowerCase().includes(q)) || (t.assignee && t.assignee.toLowerCase().includes(q));
    const matchType = !filterType || t.type === filterType;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchType && matchPriority && matchStatus;
  });

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Task Management" items={[{ label: 'Task Management' }]} style={{ marginBottom: 0 }} />
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search tasks..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} allowClear style={{ width: 200, borderRadius: 8 }} />
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

      {/* ── Main Tabs: Current Task | Suggested Task ─────────────────────────── */}
      <Tabs
        onChange={setMainTab}
        type="card"
        style={{ marginBottom: 0 }}
        items={filterTabs([
          {
            key: 'current',
            label: 'Current Task',
            children: (
              <div>
                {/* Sub-view toggle + filters row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <Button.Group>
                    <Button type={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} style={view === 'table' ? { background: '#B11E6A', border: 'none' } : {}}>Table</Button>
                    <Button type={view === 'kanban' ? 'primary' : 'default'} onClick={() => setView('kanban')} style={view === 'kanban' ? { background: '#B11E6A', border: 'none' } : {}}>Kanban</Button>
                  </Button.Group>
                  {view === 'table' && (
                    <>
                      <Select allowClear placeholder="Type" value={filterType} onChange={setFilterType} style={{ width: 150, borderRadius: 8 }}>
                        {Object.keys(typeColor).map((t) => <Option key={t} value={t}>{t}</Option>)}
                      </Select>
                      <Select allowClear placeholder="Priority" value={filterPriority} onChange={setFilterPriority} style={{ width: 130, borderRadius: 8 }}>
                        {Object.keys(priorityColor).map((p) => <Option key={p} value={p}>{p}</Option>)}
                      </Select>
                      <Select allowClear placeholder="Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 140, borderRadius: 8 }}>
                        {Object.keys(statusColor).map((s) => <Option key={s} value={s}>{s}</Option>)}
                      </Select>
                    </>
                  )}
                </div>

                {/* Table sub-view */}
                {view === 'table' && (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                    <div className="table-responsive" style={{ padding: '4px' }}>
                      <Table
                        dataSource={filtered}
                        columns={columns}
                        pagination={{ pageSize: 8, size: 'small' }}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        onRow={(record) => ({
                          style: {
                            background: (record.isEmergency || record.priority === 'Urgent')
                              ? (isDark ? '#2d1516' : '#fff2f0')
                              : '',
                            borderLeft: (record.isEmergency || record.priority === 'Urgent')
                              ? '3px solid #ff4d4f'
                              : '',
                          },
                        })}
                      />
                    </div>
                  </Card>
                )}

                {/* Kanban sub-view */}
                {view === 'kanban' && (
                  <Row gutter={[16, 16]}>
                    {kanbanCols.map((col) => (
                      <Col xs={24} md={8} key={col.key}>
                        <Card
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleKanbanDrop(col.key)}
                          title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                              <Text strong>{col.label}</Text>
                              <Badge count={taskList.filter((t) => t.status === col.key).length} style={{ background: col.color }} />
                            </div>
                          }
                          style={{ borderRadius: 14, border: draggedTaskId ? `1px dashed ${col.color}` : 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', minHeight: 400 }}
                          styles={{ body: { padding: '8px' } }}
                        >
                          {filtered.filter((t) => t.status === col.key).map((task) => (
                            <motion.div
                              key={task.id}
                              whileHover={{ y: -2 }}
                              draggable
                              onDragStart={() => setDraggedTaskId(task.id)}
                              onDragEnd={() => setDraggedTaskId(null)}
                              style={{ cursor: 'grab' }}
                            >
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
                                    <>
                                      <Tag color="processing" icon={<ClockCircleOutlined />} style={{ fontSize: 11, marginBottom: 4, display: 'block', textAlign: 'center' }}>In Process</Tag>
                                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteTask(task.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', width: '100%' }}>Done</Button>
                                    </>
                                  )}
                                  {task.status === 'Completed' && (
                                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11, marginBottom: 4, display: 'block', textAlign: 'center' }}>Completed</Tag>
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
              </div>
            ),
          },
          {
            key: 'suggested',
            label: (
              <Space size={6}>
                <BulbOutlined />
                Suggested Task
                {suggestedList.length > 0 && (
                  <Badge count={suggestedList.length} style={{ background: '#B11E6A' }} />
                )}
              </Space>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  icon={<BulbOutlined />}
                  message="Suggested Tasks — Resource Readiness"
                  description="Order products ready (or partially ready) for production. Readiness is computed from inventory stock, packaging and sticker/printing status. Items with pending components are still shown to help plan the workflow."
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
                <Row gutter={[16, 16]}>
                  {suggestedList.length === 0 ? (
                    <Col xs={24}>
                      <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <BulbOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                        <Text type="secondary">No products awaiting task assignment</Text>
                      </div>
                    </Col>
                  ) : (
                    suggestedList.map((s) => {
                      const readyAlertType = s.fullyReady ? 'success' : 'warning';
                      const readyText = s.fullyReady
                        ? 'All resources ready — safe to assign and start production.'
                        : `Ready to plan. Pending: ${s.pending.join(', ')}.`;
                      return (
                        <Col xs={24} md={12} lg={8} key={s.id}>
                          <motion.div whileHover={{ y: -2 }}>
                            <Card
                              style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Space size={4} wrap>
                                  {s.isUrgent && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                                  {s.logoType && <Tag color="purple" style={{ fontSize: 11 }}>{s.logoType}</Tag>}
                                </Space>
                                <Text style={{ fontSize: 11, color: '#999' }}>{s.orderCode}</Text>
                              </div>
                              <Text strong style={{ display: 'block', marginBottom: 4, color: textColor }}>{s.product}</Text>
                              <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', display: 'block', marginBottom: 8 }}>
                                {s.client}
                              </Text>
                              <Space size={4} wrap style={{ marginBottom: 10 }}>
                                {s.qty > 0 && <Tag color="blue">{Number(s.qty).toLocaleString()} units</Tag>}
                                <Tag color={s.stockReady ? 'green' : 'red'}>Stock {s.inventoryStock}</Tag>
                                <Tag color={s.stickerReady ? 'green' : 'orange'}>Sticker {s.stickerReady ? '✓' : '⏳'}</Tag>
                                <Tag color={s.printingReady ? 'green' : 'orange'}>Print {s.printingReady ? '✓' : '⏳'}</Tag>
                              </Space>
                              <Alert
                                type={readyAlertType}
                                showIcon
                                message={readyText}
                                style={{ borderRadius: 8, marginBottom: 12, fontSize: 12 }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Button
                                  size="small" type="primary" icon={<UserOutlined />}
                                  style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                                  onClick={() => handleAssignSuggested(s)}
                                >
                                  Assign Task
                                </Button>
                              </div>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })
                  )}
                </Row>
              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(mainTab)}
      />

      {/* ── New Task Modal (existing, unchanged) ─────────────────────────────── */}
      <Modal title="Create New Task" open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleCreateTask} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Task</Button>,
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
                  <Descriptions.Item label="Quantity">{(selectedTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
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
                      { title: 'Qty', dataIndex: 'qty', render: (v) => (v ?? 0).toLocaleString() },
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
            onClick={handleEmergencySubmit}>
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
              <Descriptions.Item label="Qty">{(emergencyTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
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
