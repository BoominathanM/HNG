import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input, Tabs, Typography, Space,
  Badge, Avatar, Progress, Alert, Descriptions, Divider, Tooltip, Steps,
  DatePicker, InputNumber, Rate, Empty,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined,
  PlayCircleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined, ShoppingOutlined,
  FileImageOutlined, CheckCircleOutlined, AlertFilled, BulbOutlined, ExperimentOutlined,
  EditOutlined, DeleteOutlined, FieldTimeOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import { estimateSecFor, secToHuman, perUnitLabel, unitToSec, secToUnit, ratingColor, ratingLabel } from '../../utils/taskTime';
import {
  useGetTasksQuery,
  useGetSuggestedTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useRequestEmergencyDispatchMutation,
  useDeleteTaskMutation,
  useGetUsersQuery,
  useGetSalesOrdersQuery,
  useGetTaskTimeConfigsQuery,
  useCreateTaskTimeConfigMutation,
  useUpdateTaskTimeConfigMutation,
  useDeleteTaskTimeConfigMutation,
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
  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery({ limit: 500 });
  const { data: suggestedData } = useGetSuggestedTasksQuery();
  const suggestedList = suggestedData?.data || [];

  // Orders — drive the New Task modal's Order → Products selectors
  const { data: ordersData } = useGetSalesOrdersQuery({ limit: 500 });
  const ordersList = useMemo(() => ordersData?.data || [], [ordersData]);

  // Users with a role — populate the "Assign To" dropdown
  const { data: usersData } = useGetUsersQuery();
  const assignableUsers = useMemo(
    () => (usersData?.data || []).filter((u) => u.role && u.fullName),
    [usersData],
  );
  const [createTask] = useCreateTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [requestEmergencyDispatch, { isLoading: requesting }] = useRequestEmergencyDispatchMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // ── Time Management config ───────────────────────────────────────────────
  const { data: timeConfigData } = useGetTaskTimeConfigsQuery();
  const timeConfigs = useMemo(() => timeConfigData?.data || [], [timeConfigData]);
  const configTaskNameOptions = useMemo(() => {
    const seen = new Set();
    return timeConfigs.filter((c) => c.taskName && !seen.has(c.taskName) && seen.add(c.taskName))
      .map((c) => ({ value: c.taskName, label: c.taskName }));
  }, [timeConfigs]);
  const [createTimeConfig] = useCreateTaskTimeConfigMutation();
  const [updateTimeConfig] = useUpdateTaskTimeConfigMutation();
  const [deleteTimeConfig] = useDeleteTaskTimeConfigMutation();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm] = Form.useForm();

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
    // Time management
    timePerUnitSec: t.timePerUnitSec ?? null,
    estimatedDurationSec: t.estimatedDurationSec ?? null,
    actualDurationSec: t.actualDurationSec ?? null,
    plannedStartTime: t.plannedStartTime || null,
    plannedEndTime: t.plannedEndTime || null,
    rating: t.rating ?? null,
    ratingReason: t.ratingReason || '',
    efficiencyPct: t.efficiencyPct ?? null,
    feedback: t.feedback || '',
    createdAt: t.createdAt,
  })), [tasksData]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [mainTab, setMainTab] = useState('suggested');
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
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm] = Form.useForm();

  // Group suggestedList: { hotelName: { orderCode: [items] } }
  const hotelGroups = useMemo(() => {
    const map = {};
    suggestedList.forEach((s) => {
      const hotel = s.client || 'Unknown';
      if (!map[hotel]) map[hotel] = {};
      const order = s.orderCode || 'Unknown';
      if (!map[hotel][order]) map[hotel][order] = [];
      map[hotel][order].push(s);
    });
    return map;
  }, [suggestedList]);

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
      // vals.orderId is a real Mongo ObjectId from the orders dropdown.
      const realOrderId = /^[a-f0-9]{24}$/i.test(vals.orderId || '') ? vals.orderId : undefined;
      // Resolve the selected order + product line item (for product name + qty).
      const selectedOrder = ordersList.find((o) => o._id === vals.orderId) || null;
      const productIndex = (vals.productIndex !== undefined && vals.productIndex !== null) ? Number(vals.productIndex) : undefined;
      const selectedItem = productIndex !== undefined ? (selectedOrder?.items || [])[productIndex] : null;
      const productName = selectedItem?.itemName || selectedItem?.product || undefined;
      const qty = Number(selectedItem?.qty) || undefined;
      // vals.assignee holds the selected user's _id — resolve to id + display name
      const assignedUser = assignableUsers.find((u) => u._id === vals.assignee);
      const startDt = dayjs();
      const estimate = estimateSecFor(timeConfigs, { taskName: vals.title }, qty);
      // Sub-tasks from the Task Breakdown by Quantity section (rows with any content).
      const cleanSubTasks = newSubTasks
        .filter((st) => st.description || st.qty || st.assignee)
        .map((st) => {
          const u = assignableUsers.find((x) => x._id === st.assignee);
          return { label: st.description, qty: Number(st.qty) || 0, assignedTo: u?._id, assigneeName: u?.fullName };
        });
      await createTask({
        taskName: vals.title,
        clientName: vals.client || selectedOrder?.clientName,
        assignedTo: assignedUser?._id,
        assigneeName: assignedUser?.fullName,
        orderId: realOrderId,
        product: productName,
        productIndex,
        qty,
        ...(cleanSubTasks.length ? { subTasks: cleanSubTasks } : {}),
        status: 'Pending',
        // Time management — server recomputes from config when available.
        plannedStartTime: startDt.toISOString(),
        ...(estimate.matched ? {
          timePerUnitSec: estimate.perUnitSec,
          estimatedDurationSec: estimate.estimatedSec,
          plannedEndTime: startDt.add(estimate.estimatedSec, 'second').toISOString(),
        } : {}),
      }).unwrap();
      form.resetFields();
      setModalOpen(false);
      enqueueSnackbar('Task created', { variant: 'success' });
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create task', { variant: 'error' });
    }
  };

  // Open the Assign-Task modal pre-filled from a Suggested-Task readiness card.
  // Task details (assignee, priority, due date) are mandatory — no direct assign.
  const handleAssignSuggested = (s) => {
    if (!requireAccess('add')) return;
    setAssignTarget(s);
    assignForm.resetFields();
    assignForm.setFieldsValue({
      title: `Production — ${s.product}`,
      type: 'Production',
      priority: s.isUrgent ? 'Urgent' : undefined,
      // Auto-fetch the start time from the assignment time (now).
      startTime: dayjs(),
    });
    setAssignModalOpen(true);
  };

  // Live estimate for the Assign-Task modal: matches the entered task against the
  // Time Management config and multiplies the per-unit time by the suggestion qty.
  const assignTypeWatch = Form.useWatch('type', assignForm);
  const assignTitleWatch = Form.useWatch('title', assignForm);
  const assignEstimate = useMemo(
    () => estimateSecFor(timeConfigs, { taskName: assignTitleWatch, taskType: assignTypeWatch }, assignTarget?.qty),
    [timeConfigs, assignTitleWatch, assignTypeWatch, assignTarget],
  );

  // ── New Task modal: Order → Products → qty → estimate (mirrors Assign Task) ──
  const newOrderIdWatch = Form.useWatch('orderId', form);
  const newProductIdxWatch = Form.useWatch('productIndex', form);
  const newTitleWatch = Form.useWatch('title', form);
  // The order selected in the New Task modal + its line items (for the Product dropdown).
  const newSelectedOrder = useMemo(
    () => ordersList.find((o) => o._id === newOrderIdWatch) || null,
    [ordersList, newOrderIdWatch],
  );
  const newOrderItems = useMemo(() => newSelectedOrder?.items || [], [newSelectedOrder]);
  const newSelectedItem = (newProductIdxWatch !== undefined && newProductIdxWatch !== null)
    ? newOrderItems[newProductIdxWatch] : null;
  const newTaskQty = Number(newSelectedItem?.qty) || 0;
  const newTaskEstimate = useMemo(
    () => estimateSecFor(timeConfigs, { taskName: newTitleWatch }, newTaskQty),
    [timeConfigs, newTitleWatch, newTaskQty],
  );

  // New Task modal — Task Breakdown by Quantity (mirrors the Operations assign modal).
  const [newSubTasks, setNewSubTasks] = useState([{ id: 1, description: '', qty: '', assignee: '' }]);
  const newTotalAssigned = newSubTasks.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
  const newQtyMet = newTaskQty > 0 && newTotalAssigned >= newTaskQty;
  const addNewSubTask = () => setNewSubTasks((prev) => [...prev, { id: Date.now(), description: '', qty: '', assignee: '' }]);
  const removeNewSubTask = (rid) => setNewSubTasks((prev) => prev.filter((t) => t.id !== rid));
  const updateNewSubTask = (rid, field, value) => setNewSubTasks((prev) => prev.map((t) => (t.id === rid ? { ...t, [field]: value } : t)));

  // Open the New Task modal with the start time pre-filled to now.
  const openNewTaskModal = () => {
    if (!requireAccess('add')) return;
    form.resetFields();
    form.setFieldsValue({ startTime: dayjs() });
    setNewSubTasks([{ id: 1, description: '', qty: '', assignee: '' }]);
    setModalOpen(true);
  };

  // When the order changes, auto-fill client and reset the product + sub-tasks.
  const handleNewOrderChange = (orderId) => {
    const ord = ordersList.find((o) => o._id === orderId);
    form.setFieldsValue({ client: ord?.clientName || '', productIndex: undefined });
    setNewSubTasks([{ id: 1, description: '', qty: '', assignee: '' }]);
  };

  // Submit the Assign-Task modal — validates mandatory fields before creating.
  const handleSubmitAssign = async () => {
    const s = assignTarget;
    if (!s) return;
    try {
      const vals = await assignForm.validateFields();
      const assignedUser = assignableUsers.find((u) => u._id === vals.assignee);
      const startDt = dayjs();
      const estimatedDurationSec = assignEstimate.estimatedSec || undefined;
      await createTask({
        taskName: vals.title,
        taskType: vals.type,
        priority: vals.priority,
        assignedTo: assignedUser?._id,
        assigneeName: assignedUser?.fullName,
        dueDate: vals.due ? vals.due.toISOString() : undefined,
        description: vals.desc,
        orderId: s.orderId,
        product: s.product,
        productIndex: typeof s.id === 'string' ? Number(s.id.split('-').pop()) : undefined,
        qty: s.qty,
        clientName: s.client,
        status: 'Pending',
        isEmergency: vals.priority === 'Urgent',
        // Time management — server recomputes from config when available.
        plannedStartTime: startDt.toISOString(),
        ...(assignEstimate.matched ? {
          timePerUnitSec: assignEstimate.perUnitSec,
          estimatedDurationSec,
          plannedEndTime: startDt.add(estimatedDurationSec, 'second').toISOString(),
        } : {}),
      }).unwrap();
      setAssignModalOpen(false);
      setAssignTarget(null);
      enqueueSnackbar(`Task assigned for ${s.product}`, { variant: 'success' });
    } catch (e) {
      if (e?.errorFields) return;
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign task', { variant: 'error' });
    }
  };

  // ── Time Management config handlers ──────────────────────────────────────
  const openConfigModal = (cfg = null) => {
    if (!requireAccess(cfg ? 'edit' : 'add')) return;
    setEditingConfig(cfg);
    configForm.resetFields();
    if (cfg) {
      configForm.setFieldsValue({
        taskName: cfg.taskName,
        inputValue: cfg.inputValue ?? secToUnit(cfg.timePerUnitSec, cfg.inputUnit || 'min'),
        inputUnit: cfg.inputUnit || 'min',
        notes: cfg.notes || '',
      });
    } else {
      configForm.setFieldsValue({ inputUnit: 'min' });
    }
    setConfigModalOpen(true);
  };

  const saveConfig = async () => {
    let vals;
    try { vals = await configForm.validateFields(); } catch { return; }
    const payload = {
      taskName: vals.taskName.trim(),
      inputValue: Number(vals.inputValue) || 0,
      inputUnit: vals.inputUnit || 'min',
      notes: vals.notes || '',
    };
    try {
      if (editingConfig) {
        await updateTimeConfig({ id: editingConfig._id, ...payload }).unwrap();
        enqueueSnackbar('Time standard updated', { variant: 'success' });
      } else {
        await createTimeConfig(payload).unwrap();
        enqueueSnackbar('Time standard added', { variant: 'success' });
      }
      setConfigModalOpen(false);
      setEditingConfig(null);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to save time standard', { variant: 'error' });
    }
  };

  const removeConfig = (cfg) => {
    if (!requireAccess('delete')) return;
    Modal.confirm({
      title: 'Delete time standard?',
      content: `Remove the configured time for "${cfg.taskName}"? Existing tasks keep their saved estimates.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTimeConfig(cfg._id).unwrap();
          enqueueSnackbar('Time standard deleted', { variant: 'success' });
        } catch (e) {
          enqueueSnackbar(e?.data?.message || e?.data || 'Failed to delete', { variant: 'error' });
        }
      },
    });
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
    {
      title: 'Time / Rating', key: 'timeRating', responsive: ['lg'], width: 150,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {r.estimatedDurationSec > 0 && (
            <Tooltip title="Estimated duration">
              <Tag icon={<FieldTimeOutlined />} color="purple" style={{ fontSize: 11, margin: 0 }}>{secToHuman(r.estimatedDurationSec)}</Tag>
            </Tooltip>
          )}
          {r.status === 'Completed' && r.rating != null && (
            <Tooltip title={r.ratingReason || ratingLabel(r.rating)}>
              <Rate disabled allowHalf value={r.rating} style={{ fontSize: 12, color: ratingColor(r.rating) }} />
            </Tooltip>
          )}
          {!(r.estimatedDurationSec > 0) && !(r.status === 'Completed' && r.rating != null) && (
            <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
          )}
        </Space>
      ),
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewTaskModal} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>New Task</Button>
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

      {/* ── Main Tabs: Current Task | Today's Checklist ─────────────────────── */}
      <Tabs
        onChange={(k) => { setMainTab(k); setSelectedHotel(null); }}
        type="card"
        style={{ marginBottom: 0 }}
        items={filterTabs([
          {
            key: 'suggested',
            label: (
              <Space size={6}>
                <BulbOutlined />
                Today's Checklist
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
                  message="Today's Checklist — Hotel-wise Production"
                  description="Order products grouped by hotel. Click a hotel to see its orders and resource readiness. Items with pending components are shown to help plan the workflow."
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />

                {suggestedList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <BulbOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                    <Text type="secondary">No products awaiting task assignment</Text>
                  </div>
                ) : selectedHotel ? (
                  /* ── Order-wise view for selected hotel ── */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <Button size="small" onClick={() => setSelectedHotel(null)}>← Back to Hotels</Button>
                      <Title level={5} style={{ margin: 0, color: textColor }}>{selectedHotel}</Title>
                    </div>
                    {Object.entries(hotelGroups[selectedHotel] || {}).map(([orderCode, items]) => (
                      <div key={orderCode} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <ShoppingOutlined style={{ color: '#B11E6A' }} />
                          <Text strong style={{ color: textColor }}>{orderCode}</Text>
                          <Badge count={items.length} style={{ background: '#B11E6A' }} />
                          {items.some((i) => i.isUrgent) && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                          {items.every((i) => i.fullyReady) && <Tag color="green" style={{ fontSize: 11 }}>All Ready</Tag>}
                        </div>
                        <Row gutter={[16, 16]}>
                          {items.map((s) => {
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
                          })}
                        </Row>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── Hotel cards view ── */
                  <Row gutter={[16, 16]}>
                    {Object.entries(hotelGroups).map(([hotel, orders]) => {
                      const allItems = Object.values(orders).flat();
                      const readyCount = allItems.filter((i) => i.fullyReady).length;
                      const urgentCount = allItems.filter((i) => i.isUrgent).length;
                      const orderCount = Object.keys(orders).length;
                      return (
                        <Col xs={24} sm={12} md={8} lg={6} key={hotel}>
                          <motion.div whileHover={{ y: -3 }}>
                            <Card
                              hoverable
                              onClick={() => setSelectedHotel(hotel)}
                              style={{ borderRadius: 12, border: '1.5px solid', borderColor: urgentCount > 0 ? '#ff4d4f' : isDark ? '#333' : '#f0e0eb', background: cardBg, cursor: 'pointer' }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Avatar style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', fontSize: 16 }}>
                                  {hotel.charAt(0).toUpperCase()}
                                </Avatar>
                                {urgentCount > 0 && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                              </div>
                              <Text strong style={{ display: 'block', fontSize: 14, color: textColor, marginBottom: 6, lineHeight: '1.3' }}>{hotel}</Text>
                              <Space size={[4, 4]} wrap style={{ marginBottom: 8 }}>
                                <Tag color="blue">{orderCount} order{orderCount !== 1 ? 's' : ''}</Tag>
                                <Tag color="default">{allItems.length} item{allItems.length !== 1 ? 's' : ''}</Tag>
                                {readyCount > 0 && <Tag color="green">{readyCount} ready</Tag>}
                                {allItems.length - readyCount > 0 && <Tag color="orange">{allItems.length - readyCount} pending</Tag>}
                              </Space>
                              <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', marginTop: 4 }}>
                                Click to view orders →
                              </div>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            ),
          },
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
                        pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
            key: 'timeconfig',
            label: (
              <Space size={6}>
                <FieldTimeOutlined />
                Time Management
              </Space>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  icon={<ClockCircleOutlined />}
                  message="Per-Task Time Standards"
                  description="Set how long ONE unit of each task takes (e.g. Sticker placing = 10s, Packing = 1m). When a task is assigned, the estimated duration = this time × quantity. On completion, the actual time is auto-rated against this estimate."
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 16 } }}
                  title={<Text strong style={{ color: textColor }}>Configured Tasks</Text>}
                  extra={(
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openConfigModal()}
                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
                      Add Task Time
                    </Button>
                  )}
                >
                  <Table
                    dataSource={timeConfigs.map((c) => ({ ...c, key: c._id }))}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No task times configured yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    columns={[
                      { title: 'Task Name', dataIndex: 'taskName', render: (v) => <Text strong>{v}</Text> },
                      {
                        title: 'Time / Unit',
                        key: 'time',
                        render: (_, r) => <Tag color="purple">{r.inputValue ?? secToUnit(r.timePerUnitSec, r.inputUnit || 'min')} {r.inputUnit || 'min'}</Tag>,
                      },
                      {
                        title: 'Per Unit (s)', dataIndex: 'timePerUnitSec',
                        render: (v) => <Text type="secondary">{perUnitLabel(v)}</Text>,
                      },
                      {
                        title: 'Example — 100 units', key: 'example',
                        render: (_, r) => <Text type="secondary">{secToHuman((r.timePerUnitSec || 0) * 100)}</Text>,
                      },
                      { title: 'Notes', dataIndex: 'notes', render: (v) => v || <Text type="secondary">—</Text> },
                      {
                        title: 'Action', key: 'action',
                        render: (_, r) => (
                          <Space>
                            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openConfigModal(r)} />
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeConfig(r)} />
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(mainTab)}
      />

      {/* ── New Task Modal (Order → Products → estimate, mirrors Assign Task) ──── */}
      <Modal title="Create New Task" open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleCreateTask} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Task</Button>,
        ]}
        width={Math.min(520, window.innerWidth - 32)}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Task Title" name="title" rules={[{ required: true, message: 'Please select a task title' }]}>
                <Select
                  placeholder="Select task"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  notFoundContent={configTaskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                  options={configTaskNameOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Related Order" name="orderId">
                <Select
                  placeholder="Select Order"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={handleNewOrderChange}
                  notFoundContent={ordersList.length ? 'No match' : 'No orders found'}
                  options={ordersList.map((o) => ({
                    value: o._id,
                    label: `${o.orderCode || 'Order'}${o.clientName ? ` — ${o.clientName}` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="productIndex" extra={!newOrderIdWatch ? 'Select an order first' : undefined}>
                <Select
                  placeholder={newOrderIdWatch ? 'Select product' : 'Select an order first'}
                  allowClear
                  disabled={!newOrderIdWatch}
                  options={newOrderItems.map((it, idx) => ({
                    value: idx,
                    label: `${it.itemName || it.product || `Item ${idx + 1}`}${it.qty ? ` — ${Number(it.qty).toLocaleString()} units` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Client Name" name="client">
                <Input placeholder="Auto-filled from order" readOnly />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Assign To" name="assignee">
                <Select
                  placeholder="Select staff"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  notFoundContent={assignableUsers.length ? 'No match' : 'No users found'}
                  options={assignableUsers.map((u) => ({
                    value: u._id,
                    label: `${u.fullName} — ${u.role}`,
                  }))}
                />
              </Form.Item>
            </Col>
            {newSelectedItem && (
              <Col xs={24}>
                {/* Estimated duration from the Time Management config × the product qty */}
                <Alert
                  type={newTaskEstimate.matched ? 'success' : 'warning'}
                  showIcon
                  icon={<FieldTimeOutlined />}
                  style={{ borderRadius: 8, marginBottom: 4 }}
                  message={newTaskEstimate.matched
                    ? `Estimated duration: ${secToHuman(newTaskEstimate.estimatedSec)}`
                    : 'No time standard configured for this task'}
                  description={newTaskEstimate.matched
                    ? `${perUnitLabel(newTaskEstimate.perUnitSec)} × ${newTaskQty.toLocaleString()} units`
                    : 'Add it under Time Management to auto-calculate the duration and rating.'}
                />
              </Col>
            )}

            {/* Task Breakdown by Quantity (mirrors the Operations Assign Task modal) */}
            {newSelectedItem && (
              <Col xs={24}>
                <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A30' }}>
                  Task Breakdown by Quantity
                </Divider>

                {/* Quantity progress overview */}
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col xs={12}>
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}` }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Required Quantity</Text>
                      <Text strong style={{ fontSize: 15, color: '#B11E6A' }}>{newTaskQty.toLocaleString()} units</Text>
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}` }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Assigned So Far</Text>
                      <Text strong style={{ fontSize: 15, color: newQtyMet ? '#52c41a' : '#faad14' }}>
                        {newTotalAssigned.toLocaleString()} / {newTaskQty.toLocaleString()}
                      </Text>
                    </div>
                  </Col>
                </Row>

                {newTaskQty > 0 && (
                  <Progress
                    percent={Math.min(100, Math.round((newTotalAssigned / newTaskQty) * 100))}
                    strokeColor={newQtyMet ? '#52c41a' : '#B11E6A'}
                    size="small"
                    style={{ marginBottom: 12 }}
                  />
                )}

                {/* Sub-task rows */}
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {newSubTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px', borderRadius: 8,
                        background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                      }}
                    >
                      <div style={{ flex: 2 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Task {idx + 1} — What to do</Text>
                        <Input
                          placeholder="e.g. Fill bottles, Apply sticker, Pack in box"
                          value={task.description}
                          onChange={(e) => updateNewSubTask(task.id, 'description', e.target.value)}
                          style={{ borderRadius: 6 }}
                        />
                      </div>
                      <div style={{ width: 90 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Qty</Text>
                        <InputNumber
                          min={0}
                          max={newTaskQty || undefined}
                          placeholder="0"
                          value={task.qty || undefined}
                          onChange={(val) => updateNewSubTask(task.id, 'qty', val || 0)}
                          style={{ width: '100%', borderRadius: 6 }}
                        />
                      </div>
                      <div style={{ flex: 1.4 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Assign To</Text>
                        <Select
                          placeholder="Select"
                          value={task.assignee || undefined}
                          onChange={(val) => updateNewSubTask(task.id, 'assignee', val)}
                          style={{ width: '100%' }}
                          showSearch
                          optionFilterProp="label"
                          options={assignableUsers.map((u) => ({ value: u._id, label: `${u.fullName} — ${u.role}` }))}
                        />
                      </div>
                      {newSubTasks.length > 1 && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeNewSubTask(task.id)} style={{ marginBottom: 0, flexShrink: 0 }} />
                      )}
                    </div>
                  ))}
                </Space>

                {/* Add Task / completion status */}
                {!newQtyMet ? (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addNewSubTask}
                    style={{ width: '100%', marginTop: 10, borderColor: '#B11E6A', color: '#B11E6A' }}
                  >
                    Add Task{newTaskQty > 0 ? ` — ${Math.max(0, newTaskQty - newTotalAssigned).toLocaleString()} units remaining` : ''}
                  </Button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '8px', color: '#52c41a', fontSize: 12, marginTop: 10 }}>
                    ✓ Full quantity assigned across all sub-tasks
                  </div>
                )}
              </Col>
            )}

          </Row>
        </Form>
      </Modal>

      {/* ── Assign Task Modal (from Today's Checklist) ────────────────────────── */}
      <Modal
        title="Assign Task"
        open={assignModalOpen}
        onCancel={() => { setAssignModalOpen(false); setAssignTarget(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setAssignModalOpen(false); setAssignTarget(null); }}>Cancel</Button>,
          <Button key="assign" type="primary" onClick={handleSubmitAssign} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Assign Task</Button>,
        ]}
        width={Math.min(520, window.innerWidth - 32)}>
        {assignTarget && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            message={`${assignTarget.product}${assignTarget.qty > 0 ? ` — ${Number(assignTarget.qty).toLocaleString()} units` : ''}`}
            description={`${assignTarget.client || 'Unknown'}${assignTarget.orderCode ? ` · ${assignTarget.orderCode}` : ''}`}
          />
        )}
        <Form form={assignForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Task Title" name="title" rules={[{ required: true, message: 'Please select a task title' }]}>
                <Select
                  placeholder="Select task"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  notFoundContent={configTaskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                  options={configTaskNameOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Task Type" name="type" rules={[{ required: true, message: 'Please select a task type' }]}>
                <Select>{Object.keys(typeColor).map((t) => <Option key={t} value={t}>{t}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Priority" name="priority" rules={[{ required: true, message: 'Please select a priority' }]}>
                <Select>{Object.keys(priorityColor).map((p) => <Option key={p} value={p}>{p}</Option>)}</Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Assign To" name="assignee" rules={[{ required: true, message: 'Please select an assignee' }]}>
                <Select
                  placeholder="Select staff"
                  showSearch
                  optionFilterProp="label"
                  notFoundContent={assignableUsers.length ? 'No match' : 'No users found'}
                  options={assignableUsers.map((u) => ({
                    value: u._id,
                    label: `${u.fullName} — ${u.role}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Due Date" name="due" rules={[{ required: true, message: 'Please select a due date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              {/* Estimated duration from the Time Management config × qty */}
              <Alert
                type={assignEstimate.matched ? 'success' : 'warning'}
                showIcon
                icon={<FieldTimeOutlined />}
                style={{ borderRadius: 8, marginBottom: 4 }}
                message={assignEstimate.matched
                  ? `Estimated duration: ${secToHuman(assignEstimate.estimatedSec)}`
                  : 'No time standard configured for this task'}
                description={assignEstimate.matched
                  ? `${perUnitLabel(assignEstimate.perUnitSec)} × ${Number(assignTarget?.qty || 0).toLocaleString()} units`
                  : 'Add it under Time Management to auto-calculate the duration and rating.'}
              />
            </Col>
            <Col xs={24}>
              <Form.Item label="Description" name="desc"><Input.TextArea rows={3} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Time Management Config Modal ──────────────────────────────────────── */}
      <Modal
        title={editingConfig ? 'Edit Task Time' : 'Add Task Time'}
        open={configModalOpen}
        onCancel={() => { setConfigModalOpen(false); setEditingConfig(null); }}
        onOk={saveConfig}
        okText={editingConfig ? 'Save' : 'Add'}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } }}
        width={Math.min(460, window.innerWidth - 32)}
        destroyOnClose
      >
        <Form form={configForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="Task Name"
            name="taskName"
            rules={[{ required: true, message: 'Enter the task name' }]}
            extra="e.g. Sticker placing, Packing, Sealing, Filling, Printing"
          >
            <Input placeholder="Task name" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={14}>
              <Form.Item label="Time per 1 unit" name="inputValue" rules={[{ required: true, message: 'Enter the time' }]}>
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="e.g. 10" />
              </Form.Item>
            </Col>
            <Col xs={10}>
              <Form.Item label="Unit" name="inputUnit" initialValue="min">
                <Select
                  options={[
                    { value: 'ms', label: 'Milliseconds' },
                    { value: 'sec', label: 'Seconds' },
                    { value: 'min', label: 'Minutes' },
                    { value: 'hr', label: 'Hours' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>
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

              {/* Time & Performance */}
              {(selectedTask.estimatedDurationSec > 0 || selectedTask.actualDurationSec > 0 || selectedTask.rating != null) && (
                <div>
                  <Text style={labelStyle}>Time &amp; Performance</Text>
                  <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                    {selectedTask.estimatedDurationSec > 0 && (
                      <Descriptions.Item label="Estimated">{secToHuman(selectedTask.estimatedDurationSec)}</Descriptions.Item>
                    )}
                    {selectedTask.actualDurationSec > 0 && (
                      <Descriptions.Item label="Actual">{secToHuman(selectedTask.actualDurationSec)}</Descriptions.Item>
                    )}
                    {selectedTask.efficiencyPct != null && (
                      <Descriptions.Item label="Efficiency">{selectedTask.efficiencyPct}%</Descriptions.Item>
                    )}
                    {selectedTask.rating != null && (
                      <Descriptions.Item label="Rating">
                        <Space>
                          <Rate disabled allowHalf value={selectedTask.rating} style={{ fontSize: 14, color: ratingColor(selectedTask.rating) }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>{selectedTask.ratingReason || ratingLabel(selectedTask.rating)}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {selectedTask.feedback && (
                      <Descriptions.Item label="Feedback" span={2}>{selectedTask.feedback}</Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              )}

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
