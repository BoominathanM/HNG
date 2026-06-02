import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  AlertFilled,
  ArrowLeftOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MessageOutlined,
  PlusOutlined,
  PrinterOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { enqueueSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetOperationOrdersQuery,
  useUpdateOperationOrderStatusMutation,
  useAssignTaskMutation,
  useAssignTasksPerProductMutation,
  useSplitPartialDeliveryMutation,
  useGetHotelDesignsQuery,
  useSaveHotelDesignMutation,
} from '../../store/api/apiSlice';
import {
  buildProductionQueues,
  canAssignTaskFromChecks,
  DESIGN_FLOW,
  designColor,
  FLOW_STAGES,
  getCheckStateMap,
  getFlowStep,
  getProgressFromChecks,
  PAYMENT_LABELS,
  statusPill,
} from './data';

const { Text, Title } = Typography;
const { Option } = Select;

const PRINTING_VENDORS = {
  sticker_printing: [
    { value: 'The Lily', label: 'The Lily' },
    { value: 'PrintZone', label: 'PrintZone' },
    { value: 'StickerWorld', label: 'StickerWorld' },
    { value: 'LabelCraft', label: 'LabelCraft' },
  ],
  box: [
    { value: 'BoxWorld', label: 'BoxWorld' },
    { value: 'PackMaster', label: 'PackMaster' },
    { value: 'CartonKing', label: 'CartonKing' },
  ],
  frosted_ziplock: [
    { value: 'PlastiPack', label: 'PlastiPack' },
    { value: 'ZiplockPro', label: 'ZiplockPro' },
    { value: 'ClearSeal', label: 'ClearSeal' },
  ],
};

export default function OperationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const loggedInUser = useSelector((state) => state.auth.user);
  const [taskForm] = Form.useForm();
  const [assignModalForm] = Form.useForm();
  const { data: ordersData } = useGetOperationOrdersQuery();
  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [assignTask] = useAssignTaskMutation();
  const [assignTasksPerProduct] = useAssignTasksPerProductMutation();
  const [splitPartialDelivery] = useSplitPartialDeliveryMutation();
  const [saveHotelDesign] = useSaveHotelDesignMutation();

  const allOrders = useMemo(() => (ordersData?.data || []).map((o) => ({
    key: o._id, id: o.orderCode || o._id,
    hotelName: o.clientName || '—',
    hotelLogo: o.clientName || '—', salesPerson: o.salesPerson || o.assignedTo?.fullName || '—',
    createdAt: o.createdAt, orderType: o.orderType || 'Sticker',
    clientApproval: o.clientApproval || 'Waiting',
    designStatus: o.designStatus || 'Not Started',
    printingStatus: o.printingStatus || 'Not Started',
    stockStatus: o.stockStatus || 'Not Received',
    operationStage: o.operationStage || '', taskStatus: o.taskStatus || 'Pending',
    assignedEmployee: o.assignedTo?.fullName || '', printerSentTotal: o.printerSentTotal || 0,
    printerVerified: o.printerVerified || false, inventoryStock: o.inventoryStock || 0,
    orderReceivedStock: o.orderReceivedStock || 0, notifications: o.notifications || [],
    specsSummary: o.specsSummary || '', paymentTerms: o.paymentTerms || '',
    paymentReminderDate: o.paymentReminderDate,
    totalAmount: o.total || 0, advance: o.advancePaidAmount ?? o.advancePaid ?? 0,
    expectedDelivery: o.expectedDeliveryDate
      ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10)
      : o.expectedDelivery,
    isUrgent: o.isUrgent || false,
    items: o.items || [], readiness: o.readiness || {},
    location: o.location || '', phone: o.clientPhone || o.phone || '',
    contactPerson: o.contactPerson || '',
    billingName: o.billingName || o.clientName || '',
    gstNumber: o.gstNumber || '',
    gstPercent: o.gstPercent,
    deliveryBy: o.deliveryBy || '',
    transportationBy: o.transportationBy || '',
    forwardingCharge: o.forwardingCharge || false,
    paymentProofs: o.paymentProofs || [],
  })), [ordersData]);
  const checkStates = useMemo(() => getCheckStateMap(allOrders), [allOrders]);
  const productionQueues = useMemo(() => buildProductionQueues(allOrders), [allOrders]);
  const [taskOptions, setTaskOptions] = useState(['Packing', 'Labeling', 'Filling']);
  const [newTaskValue, setNewTaskValue] = useState('');
  const [printingValues, setPrintingValues] = useState({});
  const [printingVendors, setPrintingVendors] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalRecord, setAssignModalRecord] = useState(null);
  const [printingModalOpen, setPrintingModalOpen] = useState(false);
  const [printingModalType, setPrintingModalType] = useState(null);
  const [subTasks, setSubTasks] = useState([]);
  const [taskRequiredQty, setTaskRequiredQty] = useState(0);
  const inputRef = useRef(null);

  const openAssignModal = (record, currentOrder) => {
    setAssignModalRecord(record);
    setTaskRequiredQty(record.qty || 0);
    setSubTasks([{ id: Date.now(), description: '', qty: '', assignee: '' }]);
    assignModalForm.setFieldsValue({
      taskName: record.processTask || '',
      taskType: '',
      orderId: currentOrder.id,
      product: record.product,
      printing: printingValues[record.key] || undefined,
      assignee: loggedInUser?.name || currentOrder.assignedEmployee,
    });
    setAssignModalOpen(true);
  };

  const submitAssignTask = async () => {
    let vals;
    try {
      vals = await assignModalForm.validateFields();
    } catch { return; }
    const cleanSubTasks = subTasks
      .filter((t) => t.description || t.qty || t.assignee)
      .map((t) => ({ label: t.description, qty: Number(t.qty) || 0, assigneeName: t.assignee }));
    const payload = {
      orderId: order?.key || order?._id || id,
      taskName: vals.taskName,
      taskType: vals.taskType,
      product: vals.product,
      printingType: vals.printing,
      qty: taskRequiredQty,
      assigneeName: vals.assignee,
      clientName: order?.hotelName || order?.clientName,
      subTasks: cleanSubTasks,
      status: 'Pending',
    };
    try {
      await assignTask(payload).unwrap();
      enqueueSnackbar('Task created and assigned', { variant: 'success' });
      setAssignModalOpen(false);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign task', { variant: 'error' });
    }
  };

  const addSubTask = () => {
    setSubTasks((prev) => [...prev, { id: Date.now(), description: '', qty: '', assignee: '' }]);
  };

  const removeSubTask = (id) => {
    setSubTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateSubTask = (id, field, value) => {
    setSubTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const addTaskOption = (e) => {
    e.preventDefault();
    if (newTaskValue && !taskOptions.includes(newTaskValue)) {
      setTaskOptions([...taskOptions, newTaskValue]);
      setNewTaskValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const activeTabFromQuery = useMemo(() => new URLSearchParams(location.search).get('tab') || 'overview', [location.search]);
  const [activeTab, setActiveTab] = useState(activeTabFromQuery);

  const printingTeamItems = useMemo(() => {
    const queueMap = {
      sticker_printing: productionQueues.sticker,
      box: productionQueues.box,
      frosted_ziplock: productionQueues.frosted,
    };
    const items = (queueMap[printingModalType] || []).map((item) => ({
      ...item,
      isUrgent: allOrders.find((o) => o.id === item.orderId)?.isUrgent || false,
    }));
    return items.sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  }, [printingModalType]);

  const order = allOrders.find((item) => item.id === id);
  const assignedEmployee = order ? { key: order.key, name: order.assignedEmployee } : null;

  // Approved designs for this hotel (reuse in future orders).
  const { data: hotelDesignsRaw } = useGetHotelDesignsQuery(
    { hotelName: order?.hotelLogo },
    { skip: !order?.hotelLogo }
  );
  const hotelDesigns = hotelDesignsRaw?.data || [];

  // Per-product task fan-out: one task per order line item in a single click.
  const handleAssignAllProducts = async () => {
    if (!order) return;
    try {
      const res = await assignTasksPerProduct({ orderId: order.key, taskType: 'Production' }).unwrap();
      enqueueSnackbar(`Created ${res.total || res.data?.length || 0} product task(s)`, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign tasks', { variant: 'error' });
    }
  };

  // Partial-delivery split: record a partial qty; the balance becomes a follow-on entry.
  const [partialModalOpen, setPartialModalOpen] = useState(false);
  const [partialQtyInput, setPartialQtyInput] = useState(0);
  const handlePartialSplit = async () => {
    if (!order) return;
    try {
      await splitPartialDelivery({ id: order.key, partialQty: Number(partialQtyInput) || 0 }).unwrap();
      enqueueSnackbar('Partial delivery recorded — balance tracked separately', { variant: 'success' });
      setPartialModalOpen(false);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to split delivery', { variant: 'error' });
    }
  };

  // Save the current order's design as an approved hotel design for reuse.
  const handleSaveDesign = async (product, type) => {
    if (!order) return;
    try {
      await saveHotelDesign({ hotelName: order.hotelLogo, product, type: type || 'Sticker' }).unwrap();
      enqueueSnackbar('Design saved for reuse on this hotel', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(e?.data || 'Failed to save design', { variant: 'error' });
    }
  };

  // Printing-status "Closed" redirect lands here with ?assign=1 — auto-open the Assign Task modal.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('assign') === '1' && order && !assignModalOpen) {
      const firstItem = (order.items || [])[0];
      if (firstItem) {
        openAssignModal(
          { product: firstItem.itemName || firstItem.product, qty: firstItem.qty, key: 0, processTask: '' },
          order
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, order?.id]);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const mutedBg = isDark ? '#161622' : '#faf8fb';
  const textColor = isDark ? '#ececf1' : '#1a1a2e';

  if (!order) {
    return (
      <div className="page-container">
        <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>{`Operation order "${id}" not found.`}</Text>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations')}>
          Back to Operations
        </Button>
      </div>
    );
  }

  const checks = checkStates[order.id];
  const readyToAssign = canAssignTaskFromChecks(checks);
  const progressPercent = getProgressFromChecks(checks);

  const productColumns = [
    { title: 'Product', dataIndex: 'product' },
    { title: 'Print Type', dataIndex: 'logoType', render: (value) => <Tag color="purple">{value}</Tag> },
    {
      title: 'Inventory Stock',
      dataIndex: 'inventoryStock',
      align: 'right',
      render: (stock, record) => {
        const enough = (stock ?? 0) >= record.qty;
        return (
          <Text strong style={{ color: enough ? '#389e0d' : '#cf1322' }}>
            {(stock ?? 0).toLocaleString()}
          </Text>
        );
      },
    },
    {
      title: 'Required Qty',
      dataIndex: 'qty',
      align: 'right',
      render: (value, record) => {
        const enough = (record.inventoryStock ?? 0) >= value;
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            <Text strong>{value.toLocaleString()}</Text>
            {!enough && (
              <Tag color="error" style={{ fontSize: 10, margin: 0 }}>
                Short {(value - (record.inventoryStock ?? 0)).toLocaleString()}
              </Tag>
            )}
          </Space>
        );
      },
    },
    { title: 'Default Size', dataIndex: 'size', render: (value) => <Tag color="geekblue">{value}</Tag> },
    { title: 'Packaging', dataIndex: 'packaging' },
    { title: 'Material', dataIndex: 'material' },
    {
      title: 'Printing',
      key: 'printing',
      render: (_, record) => (
        <Select
          value={printingValues[record.key]}
          onChange={(val) => {
            setPrintingValues((prev) => ({ ...prev, [record.key]: val }));
            setPrintingVendors((prev) => ({ ...prev, [record.key]: undefined }));
            setPrintingModalType(val);
            setPrintingModalOpen(true);
          }}
          placeholder="Select"
          style={{ width: 160 }}
        >
          <Option value="sticker_printing">Sticker Printing</Option>
          <Option value="box">Box</Option>
          <Option value="frosted_ziplock">Frosted Ziplock</Option>
        </Select>
      ),
    },
    {
      title: 'Printing Vendor',
      key: 'printingVendor',
      render: (_, record) => {
        const printType = printingValues[record.key];
        const vendors = printType ? (PRINTING_VENDORS[printType] || []) : [];
        return (
          <Select
            value={printingVendors[record.key]}
            onChange={(val) => setPrintingVendors((prev) => ({ ...prev, [record.key]: val }))}
            placeholder={printType ? 'Select vendor' : '—'}
            disabled={!printType}
            style={{ width: 150 }}
            options={vendors}
          />
        );
      },
    },
    {
      title: 'Assign Task',
      key: 'assignTask',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
          onClick={() => openAssignModal(record, order)}
        >
          Assign Task
        </Button>
      ),
    },
  ];

  const checklist = [
    ['designRequired', 'Design required based on product specs'],
    ['pdfReady', 'Logo PDF ready'],
    ['designSent', 'Design sent to design team'],
    ['clientApproved', 'Client approved after correction'],
    ['printingStarted', 'Printing / manufacturing started'],
    ['stockReceived', 'Sticker / box / ziplock stock received'],
    ['operationApproved', 'Operation team approved process start'],
    ['alertInventory', 'Bulk order preparation sent to inventory'],
    ['alertPrinter', 'Printer reminder enabled'],
    ['startBottleFilling', 'Bottle filling started before sticker receipt'],
  ];

  const onCheck = (key, checked) => {
    setCheckStates((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        [key]: checked,
      },
    }));
  };

  const totalAssignedQty = subTasks.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
  const qtyMet = taskRequiredQty > 0 && totalAssignedQty >= taskRequiredQty;

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations')}>Back</Button>
        <PageBreadcrumb
          title={`Operation: ${order.id}`}
          items={[{ label: 'Operations', link: '/operations' }, { label: order.id }]}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<TeamOutlined />} onClick={handleAssignAllProducts} style={{ color: '#B11E6A', borderColor: '#B11E6A55' }}>
            Assign Tasks (All Products)
          </Button>
          <Button onClick={() => { setPartialQtyInput(0); setPartialModalOpen(true); }} style={{ color: '#1677ff', borderColor: '#1677ff55' }}>
            Partial Delivery Split
          </Button>
        </div>
      </div>

      {order.deliveryType === 'Partial' && (order.balanceQty > 0 || order.partialQty > 0) && (
        <Tag color="orange" style={{ marginBottom: 8 }}>
          Partial: {order.partialQty || 0} now · Balance {order.balanceQty || 0} (same order ID)
        </Tag>
      )}

      {hotelDesigns.length > 0 && (
        <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Text style={{ fontSize: 12, color: '#389e0d' }}>
            ♻ {hotelDesigns.length} approved design(s) on file for {order.hotelLogo} — reusable for this order.
          </Text>
        </div>
      )}

      <Modal
        title="Partial Delivery Split"
        open={partialModalOpen}
        onCancel={() => setPartialModalOpen(false)}
        onOk={handlePartialSplit}
        okText="Record Partial"
      >
        <Text style={{ display: 'block', marginBottom: 8 }}>
          Total order qty: {order.qty || (order.items || []).reduce((s, it) => s + (it.qty || 0), 0)}
        </Text>
        <Text style={{ display: 'block', marginBottom: 8 }}>Enter the quantity being delivered now. The balance is tracked as a follow-on entry under the same order ID.</Text>
        <InputNumber min={0} value={partialQtyInput} onChange={setPartialQtyInput} style={{ width: '100%' }} placeholder="Partial quantity" />
      </Modal>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {order.isUrgent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                  <AlertFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
                  <Text strong style={{ color: '#ff4d4f', fontSize: 12 }}>Urgent / Emergency Deliveries (Partial)</Text>
                </div>
              )}
              <div style={{ width: 80, height: 80, borderRadius: 16, background: '#B11E6A12', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #B11E6A30' }}>
                <FileImageOutlined style={{ fontSize: 34, color: '#B11E6A' }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Hotel Logo</Text>
                <Title level={3} style={{ margin: '4px 0 0', color: textColor }}>{order.hotelLogo}</Title>
              </div>
              <Space wrap>
                <Tag color={designColor[order.designStatus] || 'default'}>{order.designStatus}</Tag>
                <Tag color={statusPill[order.printingStatus] || 'default'}>{order.printingStatus}</Tag>
                <Tag color={statusPill[order.stockStatus] || 'default'}>{order.stockStatus}</Tag>
                <Tag color={order.taskStatus === 'Full' ? 'green' : order.taskStatus === 'Partial' ? 'orange' : 'default'}>
                  {order.taskStatus} Task
                </Tag>
              </Space>
              <Text style={{ fontSize: 12 }}>{order.operationStage}</Text>
              <Space wrap>
                <Button icon={<FilePdfOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Logo PDF</Button>
                <Button icon={<MessageOutlined />}>Send To Customer</Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
            title={
              <Space>
                <CreditCardOutlined style={{ color: '#B11E6A' }} />
                <Text strong style={{ color: textColor }}>Payment & Delivery Terms</Text>
              </Space>
            }
          >
            <Space direction="vertical" size={18} style={{ width: '100%' }}>

              {/* Payment Terms */}
              <div>
                <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                  Payment Terms
                </Text>
                <Space wrap>
                  <Tag color="blue" style={{ fontSize: 13, padding: '4px 14px', borderRadius: 20 }}>
                    {PAYMENT_LABELS[order.paymentTerms] || order.paymentTerms || '—'}
                  </Tag>
                  {order.paymentTerms === '50_ADVANCE_50_AFTER' && order.paymentReminderDate && (
                    <Tag color="orange" style={{ fontSize: 12 }}>
                      Reminder: {new Date(order.paymentReminderDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </Tag>
                  )}
                </Space>
              </div>

              {/* Delivery & Forwarding */}
              <Row gutter={[16, 10]}>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Delivery By</Text>
                  <Text strong style={{ color: textColor }}>{order.deliveryBy || '—'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Transportation By</Text>
                  <Text strong style={{ color: textColor }}>{order.transportationBy || '—'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Forwarding Charge</Text>
                  <Tag color={order.forwardingCharge ? 'orange' : 'default'} style={{ marginTop: 2 }}>
                    {order.forwardingCharge ? 'Applicable' : 'Not Applicable'}
                  </Tag>
                </Col>
              </Row>

              {/* Financial Summary */}
              <Row gutter={[16, 10]}>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Total Amount</Text>
                  <Text strong style={{ color: '#B11E6A', fontSize: 16 }}>₹{(order.totalAmount ?? 0).toLocaleString()}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Advance Paid</Text>
                  <Text strong style={{ color: '#52c41a', fontSize: 16 }}>₹{(order.advance ?? 0).toLocaleString()}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Expected Delivery</Text>
                  <Text strong style={{ color: textColor }}>
                    {order.expectedDelivery
                      ? new Date(order.expectedDelivery).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                      : '—'}
                  </Text>
                </Col>
              </Row>

              {/* Contact Info */}
              <Row gutter={[16, 10]}>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Contact Person</Text>
                  <Text strong style={{ color: textColor }}>{order.contactPerson || '—'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Phone</Text>
                  <Text strong style={{ color: textColor }}>{order.phone || '—'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Location</Text>
                  <Text strong style={{ color: textColor }}>{order.location || '—'}</Text>
                </Col>
              </Row>

              {/* Payment Proofs */}
              <div>
                <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 10 }}>
                  Payment Proof {order.paymentProofs?.length > 0 && `(${order.paymentProofs.length} file${order.paymentProofs.length > 1 ? 's' : ''})`}
                </Text>
                {(order.paymentProofs || []).length > 0 ? (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {order.paymentProofs.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
                        }}
                      >
                        <Space size={8}>
                          <FileTextOutlined style={{ color: '#B11E6A', fontSize: 14 }} />
                          <Text style={{ fontSize: 12 }}>{file.name || `Proof ${idx + 1}`}</Text>
                          {file.size && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              ({(file.size / 1024).toFixed(0)} KB)
                            </Text>
                          )}
                        </Space>
                        <Space size={6}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => window.open(file.url || '#', '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            type="primary"
                            style={{ background: '#B11E6A', borderColor: '#B11E6A' }}
                            href={file.url || '#'}
                            download={file.name}
                          >
                            Download
                          </Button>
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <div style={{ padding: '12px 16px', borderRadius: 8, border: '1px dashed #d9d9d9', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>No payment proof attached</Text>
                  </div>
                )}
              </div>

              {/* Operation Readiness */}
              <div>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Operation Readiness
                </Text>
                <Progress percent={progressPercent} strokeColor="#B11E6A" status={readyToAssign ? 'success' : 'active'} />
              </div>

            </Space>
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 16 }}>
        <Steps
          current={getFlowStep(order)}
          size="small"
          items={FLOW_STAGES.map((stage, i) => ({ title: stage, key: i }))}
        />
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  title={
                    <Space>
                      <Text strong style={{ color: textColor }}>Product Specifications</Text>
                      <Tag color="purple" icon={<FileImageOutlined />}>{order.hotelLogo}</Tag>
                    </Space>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table dataSource={order.items} columns={productColumns} pagination={false} size="small" />
                  </div>
                </Card>

              </Space>
            ),
          },

        ]}
      />
      <Modal
        title={
          <Space>
            <PrinterOutlined style={{ color: '#B11E6A' }} />
            <span>
              Send to{' '}
              {printingModalType === 'sticker_printing'
                ? 'Sticker Team'
                : printingModalType === 'box'
                ? 'Box Team'
                : printingModalType === 'frosted_ziplock'
                ? 'Ziplock Team'
                : 'Team'}
            </span>
            <Tag color="default">{printingTeamItems.length} Total</Tag>
            {printingTeamItems.filter((i) => i.isUrgent).length > 0 && (
              <Tag color="error">{printingTeamItems.filter((i) => i.isUrgent).length} Urgent</Tag>
            )}
          </Space>
        }
        open={printingModalOpen}
        onCancel={() => setPrintingModalOpen(false)}
        width={820}
        footer={[
          <Button key="cancel" onClick={() => setPrintingModalOpen(false)}>Close</Button>,
          <Button
            key="send"
            type="primary"
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={() => {
              const teamLabel =
                printingModalType === 'sticker_printing'
                  ? 'Sticker Team'
                  : printingModalType === 'box'
                  ? 'Box Team'
                  : 'Ziplock Team';
              enqueueSnackbar(`Confirmed: ${printingTeamItems.length} item(s) sent to ${teamLabel}`, { variant: 'success' });
              setPrintingModalOpen(false);
            }}
          >
            Confirm Send
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {printingTeamItems.filter((i) => i.isUrgent).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 12px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                <AlertFilled style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>Urgent / Emergency Deliveries (Partial)</Text>
                <Tag color="error">{printingTeamItems.filter((i) => i.isUrgent).length}</Tag>
              </div>
              <Table
                dataSource={printingTeamItems.filter((i) => i.isUrgent)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Status', key: 'urgentStatus', render: () => <Tag icon={<AlertFilled />} color="error">Emergency</Tag> },
                ]}
              />
            </div>
          )}
          {printingTeamItems.filter((i) => !i.isUrgent).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong>Pending Orders</Text>
                <Tag>{printingTeamItems.filter((i) => !i.isUrgent).length}</Tag>
              </div>
              <Table
                dataSource={printingTeamItems.filter((i) => !i.isUrgent)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Status', key: 'pendingStatus', render: () => <Tag color="default">Pending</Tag> },
                ]}
              />
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        title={
          <Space>
            <TeamOutlined style={{ color: '#B11E6A' }} />
            <span>Assign Task</span>
            {assignModalRecord && (
              <Tag color="purple">{assignModalRecord.product}</Tag>
            )}
          </Space>
        }
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form form={assignModalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Task Name" name="taskName">
                <Input placeholder="e.g. Box filling / sticker placing" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Task Type" name="taskType">
                <Select
                  placeholder="Select or add task type"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          placeholder="Add new task"
                          ref={inputRef}
                          value={newTaskValue}
                          onChange={(e) => setNewTaskValue(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          style={{ width: 120 }}
                        />
                        <Button type="text" icon={<PlusOutlined />} onClick={addTaskOption}>
                          Add
                        </Button>
                      </Space>
                    </>
                  )}
                >
                  {taskOptions.map((item) => (
                    <Option key={item} value={item.toLowerCase()}>{item}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Order ID" name="orderId">
                <Input readOnly style={{ borderRadius: 8, background: mutedBg }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Product" name="product">
                <Input readOnly style={{ borderRadius: 8, background: mutedBg }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Printing" name="printing">
                <Select placeholder="Select printing type">
                  <Option value="sticker_printing">Sticker Printing</Option>
                  <Option value="box">Box</Option>
                  <Option value="frosted_ziplock">Frosted Ziplock</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Assign To" name="assignee">
                <Select>
                  {[...new Map(allOrders.filter((o) => o.assignedEmployee).map((o) => [o.assignedEmployee, { key: o.key, name: o.assignedEmployee }])).values()].map((emp) => (
                    <Option key={emp.key} value={emp.name}>{emp.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Task Breakdown by Quantity */}
          <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A30' }}>
            Task Breakdown by Quantity
          </Divider>

          {/* Quantity progress overview */}
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col xs={12}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: mutedBg, border: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Required Quantity</Text>
                <Text strong style={{ fontSize: 15, color: '#B11E6A' }}>
                  {taskRequiredQty.toLocaleString()} units
                </Text>
              </div>
            </Col>
            <Col xs={12}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: mutedBg, border: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Assigned So Far</Text>
                <Text strong style={{ fontSize: 15, color: qtyMet ? '#52c41a' : '#faad14' }}>
                  {totalAssignedQty.toLocaleString()} / {taskRequiredQty.toLocaleString()}
                </Text>
              </div>
            </Col>
          </Row>

          {taskRequiredQty > 0 && (
            <Progress
              percent={Math.min(100, Math.round((totalAssignedQty / taskRequiredQty) * 100))}
              strokeColor={qtyMet ? '#52c41a' : '#B11E6A'}
              size="small"
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Sub-task rows */}
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {subTasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-end',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: isDark ? '#161622' : '#fafafa',
                  border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                }}
              >
                <div style={{ flex: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                    Task {idx + 1} — What to do
                  </Text>
                  <Input
                    placeholder="e.g. Fill bottles, Apply sticker, Pack in box"
                    value={task.description}
                    onChange={(e) => updateSubTask(task.id, 'description', e.target.value)}
                    style={{ borderRadius: 6 }}
                  />
                </div>
                <div style={{ width: 90 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Qty</Text>
                  <InputNumber
                    min={0}
                    max={taskRequiredQty || undefined}
                    placeholder="0"
                    value={task.qty || undefined}
                    onChange={(val) => updateSubTask(task.id, 'qty', val || 0)}
                    style={{ width: '100%', borderRadius: 6 }}
                  />
                </div>
                <div style={{ flex: 1.2 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Assign To</Text>
                  <Select
                    placeholder="Select"
                    value={task.assignee || undefined}
                    onChange={(val) => updateSubTask(task.id, 'assignee', val)}
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    {[...new Map(allOrders.filter((o) => o.assignedEmployee).map((o) => [o.assignedEmployee, { key: o.key, name: o.assignedEmployee }])).values()].map((emp) => (
                      <Option key={emp.key} value={emp.name}>{emp.name}</Option>
                    ))}
                  </Select>
                </div>
                {subTasks.length > 1 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeSubTask(task.id)}
                    style={{ marginBottom: 0, flexShrink: 0 }}
                  />
                )}
              </div>
            ))}
          </Space>

          {/* Add Task / completion status */}
          {!qtyMet ? (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addSubTask}
              style={{ width: '100%', marginTop: 10, borderColor: '#B11E6A', color: '#B11E6A' }}
            >
              Add Task{taskRequiredQty > 0 ? ` — ${(taskRequiredQty - totalAssignedQty).toLocaleString()} units remaining` : ''}
            </Button>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px', color: '#52c41a', fontSize: 12, marginTop: 10 }}>
              ✓ Full quantity assigned across all sub-tasks
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Button
              type="primary"
              block
              style={{
                height: 42,
                borderRadius: 10,
                background: 'linear-gradient(135deg,#B11E6A,#D85C9E)',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 15px rgba(177,30,106,0.3)',
              }}
              onClick={submitAssignTask}
            >
              Create and Assign Task
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
