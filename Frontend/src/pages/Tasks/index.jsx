import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input, Tabs, Typography, Space,
  Badge, Avatar, Progress, Alert, Descriptions, Divider, Tooltip, Steps,
  DatePicker,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined,
  PlayCircleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined, ShoppingOutlined,
  FileImageOutlined, CheckCircleOutlined, AlertFilled, BulbOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetTasksQuery,
  useGetSuggestedTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useRequestEmergencyDispatchMutation,
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
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery();
  const { data: suggestedData } = useGetSuggestedTasksQuery();
  const suggestedList = suggestedData?.data || [];
  const [createTask] = useCreateTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [requestEmergencyDispatch, { isLoading: requesting }] = useRequestEmergencyDispatchMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const taskList = useMemo(() => (tasksData?.data || []).map((t) => ({
    key: t._id,
    id: t.taskCode,
    type: t.taskType || 'Packing',
    title: t.taskName || '',
    name: t.taskName || t.taskCode,
    order: t.orderId?.orderCode || '—',
    orderId: (typeof t.orderId === 'object' ? t.orderId?._id : t.orderId)?.toString() || null,
    orderItems: t.orderId?.items || [],
    orderStatus: t.orderId?.status || '',
    deliveryDate: t.orderId?.expectedDeliveryDate ? t.orderId.expectedDeliveryDate.slice(0, 10) : null,
    client: t.orderId?.clientName || t.clientName || '—',
    product: t.product || '—',
    assignedTo: t.assignedTo?.fullName || t.assigneeName || '—',
    assignee: t.assignedTo?.fullName || t.assigneeName || '',
    assigneeRole: t.assignedTo?.role || '',
    // Backend stores 'Done'; the UI keys everything off 'Completed'. Normalize for display.
    status: t.status === 'Done' ? 'Completed' : t.status,
    priority: t.priority || (t.isEmergency ? 'High' : 'Normal'),
    isEmergency: t.isEmergency,
    emergencyRequested: t.emergencyRequested || false,
    emergencyReason: t.emergencyReason || '',
    emergencySalesApproved: t.emergencySalesApproved || false,
    emergencyOpsApproved: t.emergencyOpsApproved || false,
    emergencyApproved: t.emergencyApproved || false,
    isSample: t.orderId?.orderCategory === 'SAMPLE' || t.orderId?.leadId?.leadType === 'SAMPLE',
    payment: t.paymentStatus || 'Pending',
    paymentStatus: t.paymentStatus || 'Pending',
    salesPerson: t.assignedTo?.fullName || t.assigneeName || '—',
    // Sample orders need no payment follow-up; only regular completed+unpaid orders do.
    salesFollowup: t.orderId?.orderCategory !== 'SAMPLE' && t.orderId?.leadId?.leadType !== 'SAMPLE' && t.status === 'Done' && (t.paymentStatus || 'Pending') !== 'Paid',
    due: t.dueDate ? t.dueDate.slice(0, 10) : undefined,
    qty: t.qty,
    subTasks: t.subTasks || [],
    description: t.description || '',
    printingType: t.printingType || '',
    startTime: t.startedAt || null,
    endTime: t.completedAt || null,
    createdAt: t.createdAt,
  })), [tasksData]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [mainTab, setMainTab] = useState('current');
  const { filterTabs, activeKeyFor } = useTabAccess('Task Management');
  const { requireAccess } = usePageAccess('Task Management');
  const [view, setView] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // New state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [emergencyDispatchOpen, setEmergencyDispatchOpen] = useState(false);
  const [emergencyTask, setEmergencyTask] = useState(null);
  const [emergencyForm] = Form.useForm();
  const [dispatchVerifyOpen, setDispatchVerifyOpen] = useState(false);
  const [dispatchVerifyData, setDispatchVerifyData] = useState(null);

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
    if (!requireAccess('edit')) return;
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
    emergencyForm.resetFields();
    setEmergencyDispatchOpen(true);
  };

  // Dispatch pre-flight: verify all tasks on the same order are done before navigating.
  const handleDispatchClick = (task) => {
    if (!task.orderId) {
      navigate('/dispatch');
      return;
    }
    const orderTasks = taskList.filter((t) => t.orderId === task.orderId);
    const notDone = orderTasks.filter((t) => t.status !== 'Completed');
    const unassigned = orderTasks.filter((t) => !t.assignee || t.assignee === '—');
    if (notDone.length > 0 || unassigned.length > 0) {
      setDispatchVerifyData({ task, orderTasks, notDone, unassigned });
      setDispatchVerifyOpen(true);
      return;
    }
    navigate('/dispatch');
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
              {r.isSample && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 13 }} />}
              <Button
                type="link"
                style={{ color: isUrgent ? '#ff4d4f' : '#B11E6A', padding: 0, fontWeight: 700 }}
                onClick={() => navigate(`/tasks/${r.key}`)}
              >
                {v}
              </Button>
            </Space>
            {isUrgent && (
              <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Emergency Order</Tag>
            )}
            {r.isSample && (
              <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Sample Order</Tag>
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
        const pending = (r.subTasks || []).find((s) => !s.done);
        if (pending?.label) {
          return (
            <Tooltip title={pending.assigneeName ? `Assigned to: ${pending.assigneeName}` : pending.label}>
              <Tag color="processing" style={{ fontSize: 11, margin: 0 }}>{pending.label}</Tag>
            </Tooltip>
          );
        }
        if (r.name) {
          return <Tag color="default" style={{ fontSize: 11, margin: 0, color: '#666' }}>{r.name}</Tag>;
        }
        return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
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
      render: (v, r) => r.isSample
        ? <Tag color="blue" style={{ fontSize: 11 }}>Sample</Tag>
        : v ? <Tag color={paymentColor[v] || 'default'}>{v}</Tag> : <Text style={{ color: '#999', fontSize: 11 }}>N/A</Text>,
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
          {r.status === 'Completed' && r.orderStatus === 'Dispatched' && (
            <Button size="small" disabled icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default' }}>
              Dispatched ✓
            </Button>
          )}
          {r.status === 'Completed' && r.orderStatus !== 'Dispatched' && (r.isSample || r.paymentStatus === 'Paid') && !r.dispatchStatus && (
            <Button size="small" type="primary" icon={<ShoppingOutlined />}
              style={{ background: '#52c41a', border: 'none' }}
              onClick={(e) => { e.stopPropagation(); handleDispatchClick(r); }}>
              Dispatch
            </Button>
          )}
          {r.status === 'Completed' && !r.isSample && r.paymentStatus && r.paymentStatus !== 'Paid' && !r.dispatchStatus && (
            <Space direction="vertical" size={2}>
              <Tag color="warning" style={{ fontSize: 10 }}>Awaiting Payment</Tag>
              <Button size="small" danger icon={<ExclamationCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); openEmergency(r); }}>
                {r.emergencyRequested ? 'View Emergency' : 'Emergency'}
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!requireAccess('add')) return; setModalOpen(true); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>New Task</Button>
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
                          onClick: () => navigate(`/tasks/${record.key}`),
                          style: {
                            cursor: 'pointer',
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
                                    onClick={() => navigate(`/tasks/${task.key}`)}>
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
                                {task.isSample
                                  ? <Tag color="blue" style={{ fontSize: 10, marginBottom: 6 }}>Sample</Tag>
                                  : task.paymentStatus && <Tag color={paymentColor[task.paymentStatus] || 'default'} style={{ fontSize: 10, marginBottom: 6 }}>{task.paymentStatus}</Tag>
                                }
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
                                  {task.status === 'Completed' && task.orderStatus === 'Dispatched' && (
                                    <Button size="small" disabled icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default', width: '100%' }}>
                                      Dispatched ✓
                                    </Button>
                                  )}
                                  {task.status === 'Completed' && task.orderStatus !== 'Dispatched' && (task.isSample || task.paymentStatus === 'Paid') && !task.dispatchStatus && (
                                    <Button size="small" type="primary" icon={<ShoppingOutlined />} style={{ background: '#52c41a', border: 'none', width: '100%' }}
                                      onClick={(e) => { e.stopPropagation(); handleDispatchClick(task); }}>Dispatch</Button>
                                  )}
                                  {task.status === 'Completed' && !task.isSample && task.paymentStatus && task.paymentStatus !== 'Paid' && !task.dispatchStatus && (
                                    <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={(e) => { e.stopPropagation(); openEmergency(task); }} style={{ width: '100%' }}>
                                      {task.emergencyRequested ? 'View Emergency' : 'Emergency Dispatch'}
                                    </Button>
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
        width={Math.min(860, window.innerWidth - 32)}
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
        {selectedTask && (() => {
          const siblingTasks = selectedTask.orderId
            ? taskList.filter((t) => t.orderId === selectedTask.orderId && t.key !== selectedTask.key)
            : [];
          const pendingCount = siblingTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
          const doneCount = siblingTasks.filter((t) => t.status === 'Completed').length;
          const labelStyle = { fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

              {/* Follow-up alert */}
              {selectedTask.salesFollowup && (
                <Alert type="warning" showIcon icon={<BellOutlined />}
                  message="Sales Follow-up Required"
                  description={`${selectedTask.salesPerson} should contact ${selectedTask.client} to follow up on payment / order status.`}
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Task Information */}
              <div>
                <Text style={labelStyle}>Task Information</Text>
                <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                  <Descriptions.Item label="Task ID"><Text strong>{selectedTask.id}</Text></Descriptions.Item>
                  <Descriptions.Item label="Type"><Tag color={typeColor[selectedTask.type]}>{selectedTask.type}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Priority"><Tag color={priorityColor[selectedTask.priority]}>{selectedTask.priority}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Status"><Tag color={statusColor[selectedTask.status]}>{selectedTask.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Assigned To" span={2}>
                    <Space>
                      <Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />
                      <Text strong>{selectedTask.assignee || 'Unassigned'}</Text>
                      {selectedTask.assigneeRole && <Tag color="default" style={{ fontSize: 11 }}>{selectedTask.assigneeRole}</Tag>}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">{selectedTask.due || '—'}</Descriptions.Item>
                  {selectedTask.printingType && (
                    <Descriptions.Item label="Printing Type">{selectedTask.printingType}</Descriptions.Item>
                  )}
                  {selectedTask.startTime && (
                    <Descriptions.Item label="Started">{new Date(selectedTask.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                  )}
                  {selectedTask.endTime && (
                    <Descriptions.Item label="Completed">{new Date(selectedTask.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                  )}
                  {selectedTask.description && (
                    <Descriptions.Item label="Description" span={2}>{selectedTask.description}</Descriptions.Item>
                  )}
                </Descriptions>
              </div>

              {/* Sub-tasks */}
              {selectedTask.subTasks?.length > 0 && (
                <div>
                  <Text style={labelStyle}>Sub-tasks</Text>
                  <Table
                    dataSource={selectedTask.subTasks.map((s, i) => ({ ...s, key: i }))}
                    pagination={false}
                    size="small"
                    style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task', dataIndex: 'label', render: (v) => <Text strong>{v || '—'}</Text> },
                      { title: 'Qty', dataIndex: 'qty', render: (v) => v ? (v).toLocaleString() : '—' },
                      {
                        title: 'Assigned To', dataIndex: 'assigneeName',
                        render: (v) => v
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                          : <Text type="secondary">Unassigned</Text>,
                      },
                      {
                        title: 'Status', dataIndex: 'done',
                        render: (v) => v
                          ? <Tag color="success" icon={<CheckCircleOutlined />}>Done</Tag>
                          : <Tag color="processing">In Progress</Tag>,
                      },
                    ]}
                  />
                </div>
              )}

              {/* Order Details */}
              {selectedTask.orderId && (
                <div>
                  <Text style={labelStyle}>Order Details</Text>
                  <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                    <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{selectedTask.order}</Text></Descriptions.Item>
                    <Descriptions.Item label="Hotel / Client"><Text strong>{selectedTask.client}</Text></Descriptions.Item>
                    <Descriptions.Item label="Product">{selectedTask.product}</Descriptions.Item>
                    <Descriptions.Item label="Quantity">{(selectedTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
                    {selectedTask.deliveryDate && (
                      <Descriptions.Item label="Expected Delivery">{selectedTask.deliveryDate}</Descriptions.Item>
                    )}
                    {selectedTask.orderStatus && (
                      <Descriptions.Item label="Order Status"><Tag color="processing">{selectedTask.orderStatus}</Tag></Descriptions.Item>
                    )}
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

                  {/* Order items breakdown */}
                  {selectedTask.orderItems?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#888', marginBottom: 4, display: 'block' }}>Products in this order</Text>
                      <Table
                        dataSource={selectedTask.orderItems.map((it, i) => ({ ...it, key: i }))}
                        pagination={false}
                        size="small"
                        style={{ borderRadius: 8, overflow: 'hidden' }}
                        columns={[
                          { title: 'Product', dataIndex: 'itemName', render: (v) => <Text strong>{v || '—'}</Text> },
                          { title: 'Qty', dataIndex: 'qty', render: (v) => v ? (v).toLocaleString() : '—' },
                          { title: 'Logo Type', dataIndex: 'logoType', render: (v) => v ? <Tag>{v}</Tag> : '—' },
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Other tasks on the same order */}
              {siblingTasks.length > 0 && (
                <div>
                  <Space style={{ marginBottom: 8 }}>
                    <Text style={labelStyle}>Other Tasks on this Order</Text>
                    {pendingCount > 0 && <Tag color="warning">{pendingCount} Pending / In Progress</Tag>}
                    {doneCount > 0 && <Tag color="success">{doneCount} Completed</Tag>}
                  </Space>
                  <Table
                    dataSource={siblingTasks.map((t) => ({ ...t, key: t.key }))}
                    pagination={false}
                    size="small"
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Product', dataIndex: 'product', render: (v) => v || '—' },
                      {
                        title: 'Assigned To', dataIndex: 'assignee',
                        render: (v) => v
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                          : <Text type="secondary" style={{ fontSize: 11 }}>Unassigned</Text>,
                      },
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Due', dataIndex: 'due', render: (v) => v || '—' },
                    ]}
                  />
                </div>
              )}

              {/* Phase progress */}
              {selectedTask.orderId && selectedTask.phases && (
                <div>
                  <Space style={{ marginBottom: 8 }}>
                    <Text style={labelStyle}>Phase Progress</Text>
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

              {/* Dispatch blocked notice — skipped for sample orders */}
              {selectedTask.status === 'Completed' && !selectedTask.isSample && selectedTask.paymentStatus && selectedTask.paymentStatus !== 'Paid' && !selectedTask.dispatchStatus && (
                <Alert type="error" showIcon icon={<ExclamationCircleOutlined />}
                  message="Dispatch Blocked — Payment Pending"
                  description={`Payment status: "${selectedTask.paymentStatus}". Dispatch is enabled only after full payment. For emergencies, use Emergency Dispatch — requires Sales Person + Operation Head approval.`}
                  style={{ borderRadius: 8 }}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Dispatch Pre-flight Verification Modal ───────────────────────────── */}
      <Modal
        title={<Space><ExclamationCircleOutlined style={{ color: '#fa8c16' }} /><span>Dispatch Verification</span></Space>}
        open={dispatchVerifyOpen}
        onCancel={() => setDispatchVerifyOpen(false)}
        width={Math.min(620, window.innerWidth - 32)}
        footer={[
          <Button key="close" onClick={() => setDispatchVerifyOpen(false)}>Close</Button>,
        ]}
      >
        {dispatchVerifyData && (() => {
          const { orderTasks, notDone, unassigned } = dispatchVerifyData;
          const allOk = notDone.length === 0 && unassigned.length === 0;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              {allOk ? (
                <Alert type="success" showIcon message="All tasks complete — ready to dispatch." style={{ borderRadius: 8 }} />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Order Not Ready for Dispatch"
                  description={`${notDone.length > 0 ? `${notDone.length} task(s) are not yet completed. ` : ''}${unassigned.length > 0 ? `${unassigned.length} task(s) are unassigned. ` : ''}All tasks must be assigned and completed before dispatching.`}
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Summary row */}
              <Space wrap>
                <Tag color={orderTasks.length > 0 ? 'blue' : 'default'}>{orderTasks.length} total task(s)</Tag>
                <Tag color="success">{orderTasks.filter(t => t.status === 'Completed').length} completed</Tag>
                {notDone.length > 0 && <Tag color="warning">{notDone.length} pending / in progress</Tag>}
                {unassigned.length > 0 && <Tag color="error">{unassigned.length} unassigned</Tag>}
              </Space>

              {/* Pending / In Progress tasks */}
              {notDone.length > 0 && (
                <div>
                  <Text style={{ fontSize: 11, color: '#B11E6A', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Incomplete Tasks
                  </Text>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={notDone.map((t) => ({ ...t, key: t.key }))}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Product', dataIndex: 'product', render: (v) => v || '—' },
                      {
                        title: 'Assigned To', dataIndex: 'assignee',
                        render: (v) => v && v !== '—'
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                          : <Tag color="error" style={{ fontSize: 10 }}>Unassigned</Tag>,
                      },
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v] || 'default'} style={{ fontSize: 11 }}>{v}</Tag> },
                    ]}
                  />
                </div>
              )}

              {/* Unassigned tasks that are already counted above (only show separately if they're somehow "Completed" but unassigned) */}
              {unassigned.filter(t => t.status === 'Completed').length > 0 && (
                <div>
                  <Text style={{ fontSize: 11, color: '#f5222d', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Completed but Unassigned
                  </Text>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={unassigned.filter(t => t.status === 'Completed').map((t) => ({ ...t, key: t.key }))}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#f5222d' }}>{v}</Text> },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Product', dataIndex: 'product', render: (v) => v || '—' },
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag color="success" style={{ fontSize: 11 }}>{v}</Tag> },
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Emergency Dispatch Modal ──────────────────────────────────────────── */}
      <Modal
        title={<Space><ExclamationCircleOutlined style={{ color: '#f5222d' }} /><span>Emergency Dispatch</span></Space>}
        open={emergencyDispatchOpen}
        onCancel={() => setEmergencyDispatchOpen(false)}
        width={Math.min(580, window.innerWidth - 32)}
        footer={[<Button key="close" onClick={() => setEmergencyDispatchOpen(false)}>Close</Button>]}
      >
        {emergencyTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <Alert type="warning" showIcon
              message="Payment Pending — Emergency Dispatch Required"
              description="This order is complete but payment has not been received. Emergency dispatch allows immediate delivery and requires sequential approval: Sales Head first, then Operations Head."
              style={{ borderRadius: 8 }}
            />

            {/* Order summary */}
            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
              <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{emergencyTask.order}</Text></Descriptions.Item>
              <Descriptions.Item label="Client">{emergencyTask.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{emergencyTask.product}</Descriptions.Item>
              <Descriptions.Item label="Qty">{(emergencyTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
              <Descriptions.Item label="Payment Status"><Tag color="warning">{emergencyTask.paymentStatus}</Tag></Descriptions.Item>
              <Descriptions.Item label="Assigned To">{emergencyTask.salesPerson}</Descriptions.Item>
            </Descriptions>

            {!emergencyTask.emergencyRequested ? (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  After submitting, <strong>Sales Head</strong> must approve in the Sales page, then <strong>Operations Head</strong> approves in the Operations page.
                </Text>
                <Form form={emergencyForm} layout="vertical">
                  <Form.Item label="Reason for Emergency Dispatch" name="reason" rules={[{ required: true, message: 'Please provide a reason' }]}>
                    <Input.TextArea rows={3} placeholder="Describe why emergency dispatch is required..." />
                  </Form.Item>
                </Form>
                <Button type="primary" danger loading={requesting}
                  onClick={async () => {
                    try {
                      const values = await emergencyForm.validateFields();
                      await requestEmergencyDispatch({ id: emergencyTask.key, reason: values.reason }).unwrap();
                      enqueueSnackbar('Emergency dispatch requested — awaiting Sales Head approval', { variant: 'success' });
                      setEmergencyDispatchOpen(false);
                      emergencyForm.resetFields();
                    } catch (err) {
                      if (err?.data?.message) enqueueSnackbar(err.data.message, { variant: 'error' });
                    }
                  }}>
                  Request Emergency Dispatch
                </Button>
              </>
            ) : (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Approval Progress</Text>
                {emergencyTask.emergencyReason && (
                  <Alert type="info" showIcon message={`Reason: ${emergencyTask.emergencyReason}`} style={{ borderRadius: 8 }} />
                )}
                <Steps
                  direction="vertical"
                  size="small"
                  current={emergencyTask.emergencyApproved ? 2 : emergencyTask.emergencySalesApproved ? 1 : 0}
                  items={[
                    {
                      title: 'Sales Head Approval',
                      description: emergencyTask.emergencySalesApproved
                        ? 'Approved ✓ — Sales Head has authorized emergency dispatch'
                        : 'Pending — Sales Head must approve in the Sales page',
                      status: emergencyTask.emergencySalesApproved ? 'finish' : 'process',
                    },
                    {
                      title: 'Operations Head Approval',
                      description: emergencyTask.emergencyOpsApproved
                        ? 'Approved ✓ — Ops Head has authorized emergency dispatch'
                        : emergencyTask.emergencySalesApproved
                        ? 'Pending — Ops Head must approve in the Operations page'
                        : 'Locked — awaiting Sales Head approval first',
                      status: emergencyTask.emergencyOpsApproved ? 'finish' : emergencyTask.emergencySalesApproved ? 'process' : 'wait',
                    },
                    {
                      title: 'Emergency Dispatch Authorized',
                      description: emergencyTask.emergencyApproved
                        ? 'Both approvals received — proceed with dispatch immediately'
                        : 'Waiting for both approvals',
                      status: emergencyTask.emergencyApproved ? 'finish' : 'wait',
                    },
                  ]}
                />
                {emergencyTask.emergencyApproved && (
                  <Alert type="success" showIcon message="Emergency dispatch fully approved. Proceed immediately." style={{ borderRadius: 8 }} />
                )}
                {!emergencyTask.emergencyApproved && (
                  <Alert type="info" showIcon
                    message={emergencyTask.emergencySalesApproved ? 'Waiting for Operations Head approval in the Operations page' : 'Waiting for Sales Head approval in the Sales page'}
                    style={{ borderRadius: 8 }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
