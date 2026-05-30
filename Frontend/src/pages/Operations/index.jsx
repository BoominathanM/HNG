import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  AlertFilled,
  BoxPlotOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FileImageOutlined,
  InboxOutlined,
  KeyOutlined,
  LockOutlined,
  MessageOutlined,
  PlusOutlined,
  PrinterOutlined,
  SafetyOutlined,
  SearchOutlined,
  SyncOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  UploadOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { enqueueSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetOperationOrdersQuery,
  useGetStickerRequestsQuery,
  useUpdateOperationOrderStatusMutation,
  useCreateStickerRequestMutation,
  useUploadStickerDesignMutation,
  useUpdateStickerStatusMutation,
  useSendToStickerTeamMutation,
  useAssignTaskMutation,
} from '../../store/api/apiSlice';
import {
  buildProductionQueues,
  canAssignTaskFromChecks,
  designColor,
  designerCredentials,
  FLOW_STAGES,
  getCheckStateMap,
  getFlowStep,
  getProgressFromChecks,
  statusPill,
} from './data';

const { Text, Title } = Typography;
const { Option } = Select;

const queueStatuses = [
  'Sent',
  'Design Confirmation',
  'In Process',
  'Dispatch',
  'Received',
  'Pending Approval',
  'Design Change',
];

const flowStageColors = ['default', 'blue', 'gold', 'magenta', 'green', 'success'];
const flowNextActions = {
  0: { label: 'Send To Design', tab: 'design' },
  3: { label: 'Verify Stock', tab: 'overview' },
  4: { label: 'Assign Task', tab: 'tasks' },
};

const statusIcons = {
  Sent: <MessageOutlined />,
  'Design Confirmation': <CheckCircleOutlined />,
  'In Process': <SyncOutlined />,
  Dispatch: <TruckOutlined />,
  Received: <InboxOutlined />,
  'Pending Approval': <SafetyOutlined />,
  'Design Change': <ToolOutlined />,
};

export default function Operations() {
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);

  // API-backed state — RTK Query
  const { data: ordersData, isLoading: ordersLoading } = useGetOperationOrdersQuery();
  const { data: stickerData } = useGetStickerRequestsQuery();
  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [createStickerRequest] = useCreateStickerRequestMutation();
  const [uploadStickerDesign] = useUploadStickerDesignMutation();
  const [updateStickerStatus] = useUpdateStickerStatusMutation();
  const [sendToStickerTeam] = useSendToStickerTeamMutation();
  const [assignTask] = useAssignTaskMutation();

  const stickerRequests = stickerData?.data || [];

  const apiOrders = useMemo(() => (ordersData?.data || []).map((o) => ({
    key: o._id, id: o.orderCode || o._id,
    hotelLogo: o.clientName || '—', salesPerson: o.assignedTo?.fullName || '—',
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
    totalAmount: o.total || 0, advance: o.advancePaid || 0,
    expectedDelivery: o.expectedDelivery, isUrgent: o.isUrgent || false,
    items: o.items || [], readiness: o.readiness || {},
    location: o.location || '', phone: o.clientPhone || '',
    paymentProofs: o.paymentProofs || [],
  })), [ordersData]);

  const checkStates = useMemo(() => getCheckStateMap(apiOrders), [apiOrders]);
  const productionQueues = useMemo(() => buildProductionQueues(apiOrders), [apiOrders]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [requestType, setRequestType] = useState('Sticker');
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [requestForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [correctionForm] = Form.useForm();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [dispatchForm] = Form.useForm();
  const [receiveForm] = Form.useForm();
  const [teamSendOpen, setTeamSendOpen] = useState(false);
  const [teamSendType, setTeamSendType] = useState('Sticker');

  const [queueSteps, setQueueSteps] = useState({});

  const getQueueStep = (item) => queueSteps[item.key] ?? 0;
  const advanceStep = (itemKey, nextStep) => setQueueSteps((prev) => ({ ...prev, [itemKey]: nextStep }));

  const [printingStatuses, setPrintingStatuses] = useState({});

  const [uploadedFiles, setUploadedFiles] = useState({});

  const handleUpload = (itemKey, fileList) => {
    setUploadedFiles((prev) => ({ ...prev, [itemKey]: fileList }));
  };

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const mutedBg = isDark ? '#161622' : '#faf8fb';
  const textColor = isDark ? '#ececf1' : '#1a1a2e';

  const filteredOrders = useMemo(() => {
    const result = apiOrders.filter((order) => {
      const query = searchText.trim().toLowerCase();
      const matchSearch = !query || order.id.toLowerCase().includes(query) || order.hotelLogo.toLowerCase().includes(query) || order.specsSummary.toLowerCase().includes(query) || order.items.some((item) => item.product.toLowerCase().includes(query));
      const matchStatus = !orderStatusFilter || (orderStatusFilter === 'urgent' ? order.isUrgent : !order.isUrgent);
      return matchSearch && matchStatus;
    });
    return [...result].sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  }, [searchText, orderStatusFilter]);

  const teamSendItems = useMemo(() => {
    const queueMap = {
      Sticker: productionQueues.sticker,
      Box: productionQueues.box,
      'Frosted Ziplock': productionQueues.frosted,
    };
    const items = (queueMap[teamSendType] || []).map((item) => ({
      ...item,
      isUrgent: apiOrders.find((o) => o.id === item.orderId)?.isUrgent || false,
    }));
    return items.sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  }, [teamSendType]);

  const stats = [
    {
      label: 'Order Pending',
      value: apiOrders.filter((order) => !canAssignTaskFromChecks(checkStates[order.id])).length,
      color: '#C94F8A',
    },
    {
      label: 'Sticker Delivery',
      value: productionQueues.sticker.filter((item) => item.sent > 0 && !item.verified).length,
      color: '#B11E6A',
    },
    {
      label: 'Approval Waiting',
      value: apiOrders.filter((order) => order.designStatus === 'Pending Approval').length,
      color: '#8a1652',
    },
    {
      label: 'Box',
      value: productionQueues.box.length,
      color: '#6b1240',
    },
    {
      label: 'Frosted',
      value: productionQueues.frosted.length,
      color: '#aa3f72',
    },
    {
      label: 'Ready To Process',
      value: apiOrders.filter((order) => canAssignTaskFromChecks(checkStates[order.id])).length,
      color: '#1677ff',
    },
  ];

  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      render: (value, record) => (
        <Space size={4}>
          {record.isUrgent && (
            <Tooltip title="Urgent / Emergency Deliveries (Partial)">
              <AlertFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
            </Tooltip>
          )}
          <Text strong style={{ color: '#B11E6A' }}>{value}</Text>
        </Space>
      ),
    },
    { title: 'Hotel Name', dataIndex: 'hotelLogo' },
    {
      title: 'Order Delivery Date',
      dataIndex: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
      responsive: ['md'],
    },
    { title: 'Assigned To', dataIndex: 'assignedEmployee', responsive: ['lg'] },
    {
      title: 'Process',
      key: 'progress',
      render: (_, record) => {
        const percent = getProgressFromChecks(checkStates[record.id]);
        const ready = canAssignTaskFromChecks(checkStates[record.id]);
        return (
          <Space direction="vertical" size={2} style={{ width: 180 }}>
            <Progress percent={percent} size="small" strokeColor="#B11E6A" status={ready ? 'success' : 'active'} />
            <Text style={{ fontSize: 11 }}>{ready ? 'Assignment unlocked' : record.operationStage}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Printing Status',
      key: 'printingStatus',
      render: (_, record) => (
        <Select
          value={printingStatuses[record.id]}
          size="small"
          style={{ width: 148 }}
          placeholder="Select"
          onClick={(e) => e.stopPropagation()}
          onChange={async (val) => {
            setPrintingStatuses((prev) => ({ ...prev, [record.id]: val }));
            try {
              await updateOrderStatus({ id: record.key, printingStatus: val }).unwrap();
              enqueueSnackbar(`${record.id} status → ${val}`, { variant: 'success' });
            } catch (err) {
              enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update printing status', { variant: 'error' });
            }
          }}
          options={[
            { value: 'Yet to Receive', label: <Tag color="orange" style={{ margin: 0 }}>Yet to Receive</Tag> },
            { value: 'Received', label: <Tag color="blue" style={{ margin: 0 }}>Received</Tag> },
            { value: 'Closed', label: <Tag color="success" style={{ margin: 0 }}>Closed</Tag> },
          ]}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Tooltip title="View full operation screen">
          <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/operations/${record.id}`); }} />
        </Tooltip>
      ),
    },
  ];


  const designColumns = [
    {
      title: 'Order',
      dataIndex: 'orderId',
      render: (value) => <Text strong style={{ color: '#B11E6A' }}>{value}</Text>,
    },
    { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Shared Through', dataIndex: 'channel' },
    { title: 'Designer', dataIndex: 'designer' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Tag color={designColor[value] || 'default'}>{value}</Tag>,
    },
    { title: 'Correction / Note', dataIndex: 'correction' },
    {
      title: 'Actions',
      key: 'designActions',
      render: (_, record) => (
        <Space wrap size={4}>
          <Button
            size="small"
            icon={<MessageOutlined />}
            style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
            onClick={async () => {
              try {
                await sendToStickerTeam({ id: record._id || record.key, type: record.type }).unwrap();
                enqueueSnackbar(`Design for ${record.orderId} sent via WhatsApp to customer and ${apiOrders.find((o) => o.id === record.orderId)?.salesPerson || 'sales person'}`, { variant: 'success' });
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to send design', { variant: 'error' });
              }
            }}
          >
            Send
          </Button>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            onClick={async () => {
              try {
                await updateStickerStatus({ id: record._id || record.key, status: 'Approved' }).unwrap();
                enqueueSnackbar(`${record.orderId} approved — printing can start now`, { variant: 'success' });
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to approve design', { variant: 'error' });
              }
            }}
          >
            Approve
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={async () => {
              try {
                await updateStickerStatus({ id: record._id || record.key, status: 'In Process' }).unwrap();
                enqueueSnackbar(`Printing order raised for ${record.orderId}`, { variant: 'info' });
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to raise printing order', { variant: 'error' });
              }
            }}
          >
            Print
          </Button>
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={() => {
              setSelectedQueueItem(record);
              setCorrections(record.correction ? [record.correction] : []);
              setCorrectionOpen(true);
            }}
          >
            Correction
          </Button>
        </Space>
      ),
    },
  ];

  const renderDesignTable = (type) => (
    <Card
      title={<Text strong style={{ color: textColor }}>{type} Designing Queue</Text>}
      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
      styles={{ body: { padding: 0 } }}
    >
      <div className="table-responsive" style={{ padding: 4 }}>
        <Table 
          dataSource={stickerRequests.filter(item => item.type === type)} 
          columns={designColumns} 
          pagination={false} 
          size="small" 
        />
      </div>
    </Card>
  );

  const queueColumns = (label) => [
    {
      title: 'Order',
      dataIndex: 'orderId',
      render: (value) => (
        <Space size={4}>
          {apiOrders.find((o) => o.id === value)?.isUrgent && (
            <Tooltip title="Urgent / Emergency Deliveries (Partial)">
              <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />
            </Tooltip>
          )}
          <Text strong style={{ color: '#B11E6A' }}>{value}</Text>
        </Space>
      ),
    },
    { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
    { title: 'Product', dataIndex: 'product' },
    {
      title: label === 'Box' ? 'Size / PVK' : 'Size',
      dataIndex: 'size',
      render: (value) => <Tag color="geekblue">{value}</Tag>,
    },
    { title: 'Qty', dataIndex: 'qty', render: (value) => value.toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => {
        const step = getQueueStep(record);
        return (
          <Space wrap size={4}>
            {step === 0 && (
              <>
                <Tag color="blue">Designing</Tag>
                <Upload
                  beforeUpload={() => false}
                  fileList={uploadedFiles[record.key] || []}
                  onChange={({ fileList }) => handleUpload(record.key, fileList)}
                  maxCount={1}
                  accept="image/*,.pdf"
                  showUploadList={false}
                >
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}
                  >
                    {uploadedFiles[record.key]?.length ? 'Re-upload' : 'Upload Design'}
                  </Button>
                </Upload>
                {uploadedFiles[record.key]?.length > 0 && (
                  <Tag color="green" style={{ fontSize: 11 }}>✓ Uploaded</Tag>
                )}
                <Button
                  size="small"
                  type="primary"
                  style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                  disabled={!uploadedFiles[record.key]?.length}
                  title={!uploadedFiles[record.key]?.length ? 'Upload design first' : ''}
                  onClick={async () => {
                    const ord = apiOrders.find((o) => o.id === record.orderId);
                    try {
                      await uploadStickerDesign({
                        id: record._id || record.key,
                        orderId: record.orderId,
                        files: uploadedFiles[record.key] || [],
                      }).unwrap();
                      advanceStep(record.key, 1);
                      enqueueSnackbar(`WhatsApp sent to ${ord?.salesPerson || 'Sales'} & Operations team for ${record.orderId}`, { variant: 'info' });
                    } catch (err) {
                      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to send design for approval', { variant: 'error' });
                    }
                  }}
                >
                  Send for Approval
                </Button>
              </>
            )}
            {step === 1 && (
              <>
                <Tag color="gold">Waiting for Approval</Tag>
                {uploadedFiles[record.key]?.length > 0 ? (
                  <Tag color="green" style={{ fontSize: 11 }}>✓ Design Uploaded</Tag>
                ) : (
                  <Upload
                    beforeUpload={() => false}
                    fileList={[]}
                    onChange={({ fileList }) => handleUpload(record.key, fileList)}
                    maxCount={1}
                    accept="image/*,.pdf"
                    showUploadList={false}
                  >
                    <Button size="small" icon={<UploadOutlined />} danger>Upload Design *</Button>
                  </Upload>
                )}
                <Button
                  size="small"
                  icon={<MessageOutlined />}
                  style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                  onClick={async () => {
                    const ord = apiOrders.find((o) => o.id === record.orderId);
                    try {
                      await sendToStickerTeam({ id: record._id || record.key, orderId: record.orderId, type: teamSendType }).unwrap();
                      enqueueSnackbar(`WhatsApp sent to ${ord?.salesPerson || 'Sales'} & Operations team`, { variant: 'success' });
                    } catch (err) {
                      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to send WhatsApp notification', { variant: 'error' });
                    }
                  }}
                >
                  WhatsApp
                </Button>
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                  disabled={!uploadedFiles[record.key]?.length}
                  title={!uploadedFiles[record.key]?.length ? 'Upload design file first' : ''}
                  onClick={() => {
                    if (!uploadedFiles[record.key]?.length) {
                      enqueueSnackbar('Please upload the design file before approving', { variant: 'error' });
                      return;
                    }
                    advanceStep(record.key, 2);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Tag color="green">Approved</Tag>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                  onClick={() => advanceStep(record.key, 3)}
                >
                  Print
                </Button>
              </>
            )}
            {step === 3 && (
              <>
                <Tag color="magenta">Printing</Tag>
                <Button
                  size="small"
                  icon={<TruckOutlined />}
                  style={{ background: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
                  onClick={() => {
                    setSelectedQueueItem(record);
                    dispatchForm.setFieldsValue({
                      orderId: record.orderId,
                      dispatchDate: new Date().toLocaleDateString('en-IN'),
                      dispatchTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    });
                    setDispatchOpen(true);
                  }}
                >
                  Dispatch to Operation
                </Button>
              </>
            )}
            {step === 4 && (
              <Tag color="purple" icon={<TruckOutlined />}>Dispatched to Operation</Tag>
            )}
            {step === 5 && (
              <Tag color="blue" icon={<InboxOutlined />}>Received</Tag>
            )}
            {step === 6 && (
              <Tag color="success" icon={<CheckCircleOutlined />}>Closed</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  const openRequestModal = (type) => {
    setRequestType(type);
    requestForm.resetFields();
    setRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    try {
      const vals = await requestForm.validateFields();
      await createStickerRequest({
        orderId: vals.orderId,
        hotelLogo: vals.client || '',
        stickerType: requestType === 'Box' ? 'Box' : 'Product',
        quantity: Number(vals.qty) || 0,
        stickerSize: vals.size || '',
      }).unwrap();
      requestForm.resetFields();
      setRequestOpen(false);
      enqueueSnackbar(`${requestType} request submitted`, { variant: 'success' });
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to submit request', { variant: 'error' });
    }
  };

  const renderQueueCard = (type, rows, label) => {
    const allActive = rows.filter((r) => getQueueStep(r) < 6);
    const closedRows = rows.filter((r) => getQueueStep(r) === 6);
    const activeRows = allActive.filter((r) => {
      const q = queueSearch.toLowerCase();
      const matchSearch = !q || (r.orderId || '').toLowerCase().includes(q) || (r.hotelLogo || '').toLowerCase().includes(q) || (r.product || '').toLowerCase().includes(q);
      const matchStatus = !queueStatusFilter || (r.status || '') === queueStatusFilter;
      return matchSearch && matchStatus;
    });
    return (
      <div>
        {renderQueueSummary(allActive)}
        <Card
          title={<Text strong style={{ color: textColor }}>{label}</Text>}
          extra={
            <Space>
              <Button
                icon={<AlertFilled />}
                type="primary"
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                onClick={() => { setTeamSendType(type); setTeamSendOpen(true); }}
              >
                Send to {type} Team
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => openRequestModal(type)}>
                New {type} Request
              </Button>
            </Space>
          }
          style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order, hotel, product..." allowClear value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} style={{ width: 230, borderRadius: 8 }} />
            <Select allowClear placeholder="Queue Status" value={queueStatusFilter} onChange={setQueueStatusFilter} style={{ width: 170, borderRadius: 8 }}>
              {queueStatuses.map((s) => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </div>
          <div className="table-responsive" style={{ padding: 4 }}>
            <Table
              dataSource={activeRows}
              columns={queueColumns(type)}
              pagination={type === 'Sticker' ? { pageSize: 5, size: 'small' } : false}
              size="small"
            />
          </div>
        </Card>
        {closedRows.length > 0 && (
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong style={{ color: textColor }}>Closed Orders</Text>
                <Tag color="success">{closedRows.length}</Tag>
              </Space>
            }
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginTop: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <div className="table-responsive" style={{ padding: 4 }}>
              <Table
                dataSource={closedRows}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Order',
                    dataIndex: 'orderId',
                    render: (v) => (
                      <Space size={4}>
                        {apiOrders.find((o) => o.id === v)?.isUrgent && (
                          <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />
                        )}
                        <Text strong style={{ color: '#B11E6A' }}>{v}</Text>
                      </Space>
                    ),
                  },
                  { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Status', key: 'closedStatus', render: () => <Tag color="success" icon={<CheckCircleOutlined />}>Closed</Tag> },
                ]}
              />
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderQueueSummary = (rows) => {
    const countByStatus = Object.fromEntries(queueStatuses.map((status) => [status, 0]));
    rows.forEach((row) => {
      if (countByStatus[row.status] !== undefined) countByStatus[row.status] += 1;
    });
    return (
      <div style={{ marginBottom: 24, overflowX: 'auto', padding: '4px 0' }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 900 }}>
          {queueStatuses.map((status) => (
            <Card
              key={status}
              size="small"
              style={{
                flex: 1,
                borderRadius: 12,
                border: 'none',
                background: cardBg,
                boxShadow: '0 2px 10px rgba(177,30,106,0.05)',
                minWidth: 120,
              }}
              styles={{ body: { padding: '12px 8px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 8, 
                  background: `${designColor[status] || '#B11E6A'}15`,
                  color: designColor[status] || '#B11E6A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16
                }}>
                  {statusIcons[status] || <TagsOutlined />}
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, lineHeight: 1, color: textColor }}>
                    {countByStatus[status]}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {status}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Operations" items={[{ label: 'Operations' }]} />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((item, index) => (
          <Col xs={12} sm={8} md={4} key={item.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card
                style={{
                  borderRadius: 12,
                  border: 'none',
                  background: `linear-gradient(135deg, ${item.color}22 0%, ${item.color}10 100%)`,
                  boxShadow: `0 4px 20px ${item.color}20`,
                  textAlign: 'center',
                }}
                styles={{ body: { padding: '16px 12px' } }}
              >
                <Title level={2} style={{ margin: 0, color: item.color }}>{item.value}</Title>
                <Text style={{ fontSize: 11, color: isDark ? '#bdbdc7' : '#666' }}>{item.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'orders',
            label: <Space><ToolOutlined />Order Management</Space>,
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  title={<Text strong style={{ color: textColor }}>Order Approval Queue</Text>}
                  extra={
                    <Space wrap>
                      <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search order, hotel logo, product"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 240, borderRadius: 8 }}
                      />
                      <Select allowClear placeholder="Priority" value={orderStatusFilter} onChange={setOrderStatusFilter} style={{ width: 140, borderRadius: 8 }}>
                        <Option value="urgent">Urgent</Option>
                        <Option value="normal">Normal</Option>
                      </Select>
                    </Space>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table
                      dataSource={filteredOrders}
                      columns={orderColumns}
                      pagination={{ pageSize: 6, size: 'small' }}
                      size="small"
                      onRow={(record) => ({
                        onClick: () => navigate(`/operations/${record.id}`),
                        style: { cursor: 'pointer', background: record.isUrgent ? '#fff2f0' : undefined }
                      })}
                    />
                  </div>
                </Card>
              </Space>
            ),
          },
          {
            key: 'sticker',
            label: <Space><TagsOutlined />Sticker Printing</Space>,
            children: renderQueueCard('Sticker', productionQueues.sticker, 'Sticker Queue'),
          },
          {
            key: 'box',
            label: <Space><BoxPlotOutlined />Box</Space>,
            children: renderQueueCard('Box', productionQueues.box, 'Box Manufacturing Queue'),
          },
          {
            key: 'frosted',
            label: <Space><InboxOutlined />Frosted Ziplock</Space>,
            children: renderQueueCard('Frosted Ziplock', productionQueues.frosted, 'Frosted Ziplock Queue'),
          },
        ]}
      />

      <Modal
        title={`New ${requestType} Request`}
        open={requestOpen}
        onCancel={() => setRequestOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRequestOpen(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleSubmitRequest} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Submit Request
          </Button>,
        ]}
        width={620}
      >
        <Form form={requestForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Order ID" name="orderId" rules={[{ required: true }]}>
                <Select placeholder="Select Order">
                  {apiOrders.map((order) => <Option key={order.key} value={order.key}>{order.id}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Hotel Logo" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select Hotel Logo">
                  {apiOrders.map((order) => <Option key={order.hotelLogo} value={order.hotelLogo}>{order.hotelLogo}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="product">
                <Select placeholder="Select Product">
                  {apiOrders.flatMap((order) => order.items).map((item) => <Option key={item.key} value={item.product}>{item.product}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Quantity" name="qty">
                <Input placeholder="Enter quantity" suffix="units" />
              </Form.Item>
            </Col>
            {requestType === 'Sticker' && (
              <Col xs={24} sm={12}>
                <Form.Item label="Sticker Size" name="size">
                  <Input placeholder="2cm x 3cm" />
                </Form.Item>
              </Col>
            )}
            {requestType === 'Box' && (
              <>
                <Col xs={24} sm={12}>
                  <Form.Item label="Box Size" name="size">
                    <Input placeholder="10cm x 8cm x 5cm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Material" name="material">
                    <Select defaultValue="PVC">
                      <Option value="PVC">PVC</Option>
                      <Option value="Paper Box">Paper Box</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
          <Form.Item label="Hotel Logo (Upload)" name="logo">
            <Upload.Dragger beforeUpload={() => false} maxCount={1} accept=".jpg,.jpeg,.png,.pdf,.ai,.svg">
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: '#B11E6A' }} />
              </p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Click or drag logo file here</p>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 0 }}>Supports: JPG, PNG, PDF, AI, SVG</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="Special Instructions" name="instruction">
            <Input.TextArea rows={4} placeholder="Any special instructions for design team..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${selectedQueueItem ? `${selectedQueueItem.orderId} ` : ''}Assigning`}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Save Assignment
          </Button>,
        ]}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="Order ID" name="orderId">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Product" name="product">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Assign To" name="assignee">
            <Select placeholder="Select employee">
              {apiOrders.map((o) => o.assignedEmployee).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((name) => <Option key={name} value={name}>{name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Assigning Note" name="note">
            <Input.TextArea rows={3} placeholder="Assign sticker / box / ziplock work to employee" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${selectedQueueItem ? `${selectedQueueItem.orderId} ` : ''}Verification`}
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setVerifyOpen(false)}>Cancel</Button>,
          <Button key="verify" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Verify Update
          </Button>,
        ]}
      >
        <Form form={verifyForm} layout="vertical">
          <Form.Item label="Order ID" name="orderId">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Printer Sent Qty" name="sentQty">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Verified Qty" name="verifiedQty">
            <Input />
          </Form.Item>
          <Form.Item label="Verification Note" name="note">
            <Input.TextArea rows={3} placeholder="Sticker / box / ziplock received and checked by operations" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`Design Correction: ${selectedQueueItem?.orderId}`}
        open={correctionOpen}
        onCancel={() => setCorrectionOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCorrectionOpen(false)}>Cancel</Button>,
          <Button 
            key="save" 
            type="primary" 
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={() => {
              enqueueSnackbar('Corrections updated', { variant: 'success' });
              setCorrectionOpen(false);
            }}
          >
            Update Corrections
          </Button>,
        ]}
        width={700}
      >
        <div style={{ marginBottom: 24, padding: 16, background: mutedBg, borderRadius: 12, textAlign: 'center', border: '1px dashed #B11E6A44' }}>
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <FileImageOutlined style={{ fontSize: 48, color: '#B11E6A44' }} />
            <Text type="secondary" style={{ marginTop: 8 }}>Design Preview Placeholder</Text>
            <Text style={{ fontSize: 11, color: '#999' }}>Mark areas on the design to specify corrections</Text>
          </div>
        </div>

        <Divider orientation="left">Marked Areas & Corrections</Divider>
        
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          {corrections.map((item, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: 8, borderRadius: 8, border: '1px solid #B11E6A22' }}
              extra={<Button type="text" danger size="small" onClick={() => setCorrections(corrections.filter((_, i) => i !== index))}>Remove Area</Button>}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="magenta">Area {index + 1}</Tag>
                <Text>{item}</Text>
              </Space>
            </Card>
          ))}
          {corrections.length === 0 && <Text type="secondary">No corrections marked yet.</Text>}
        </div>

        <Form layout="vertical" onFinish={(values) => {
          if (values.newCorrection) {
            setCorrections([...corrections, values.newCorrection]);
            correctionForm.resetFields();
          }
        }} form={correctionForm}>
          <Form.Item label="Add New Correction / Mark Area" name="newCorrection">
            <Input.TextArea 
              rows={2} 
              placeholder="Describe the change needed (e.g., 'Increase logo size', 'Change font to Roboto')" 
            />
          </Form.Item>
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => correctionForm.submit()}>
            Add Correction Area
          </Button>
        </Form>
      </Modal>
      <Modal
        title={`Dispatch Material: ${selectedQueueItem?.orderId}`}
        open={dispatchOpen}
        onCancel={() => setDispatchOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDispatchOpen(false)}>Cancel</Button>,
          <Button 
            key="dispatch" 
            type="primary" 
            style={{ background: 'linear-gradient(135deg,#1677ff,#4096ff)', border: 'none' }}
            onClick={async () => {
              const vals = dispatchForm.getFieldsValue();
              const ord = apiOrders.find((o) => o.id === selectedQueueItem?.orderId);
              try {
                if (ord) {
                  await updateOrderStatus({ id: ord.key, operationStage: 'Dispatch', stockStatus: 'Dispatched' }).unwrap();
                }
                setSelectedQueueItem((prev) => ({ ...prev, dispatchDate: vals.dispatchDate, dispatchTime: vals.dispatchTime }));
                if (selectedQueueItem) advanceStep(selectedQueueItem.key, 4);
                enqueueSnackbar(`Dispatched to Operations at ${vals.dispatchTime}`, { variant: 'success' });
                setDispatchOpen(false);
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to dispatch material', { variant: 'error' });
              }
            }}
          >
            Confirm Dispatch
          </Button>,
        ]}
      >
        <Form form={dispatchForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Dispatch Date" name="dispatchDate">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Dispatch Time" name="dispatchTime">
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>* Notifying operation team about the dispatch...</Text>
        </Form>
      </Modal>

      <Modal
        title={`Receive Material: ${selectedQueueItem?.orderId}`}
        open={receiveOpen}
        onCancel={() => setReceiveOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setReceiveOpen(false)}>Cancel</Button>,
          <Button
            key="receive"
            type="primary"
            style={{ background: 'linear-gradient(135deg,#faad14,#ffc53d)', border: 'none' }}
            onClick={async () => {
              const vals = receiveForm.getFieldsValue();
              const ord = apiOrders.find((o) => o.id === selectedQueueItem?.orderId);
              try {
                if (ord) {
                  await updateOrderStatus({ id: ord.key, stockStatus: 'Received' }).unwrap();
                }
                setSelectedQueueItem((prev) => ({ ...prev, arrivalDate: vals.arrivalDate }));
                enqueueSnackbar(`Stock Received with Arrival Date: ${vals.arrivalDate}`, { variant: 'success' });
                setReceiveOpen(false);
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to mark as received', { variant: 'error' });
              }
            }}
          >
            Mark as Received
          </Button>,
        ]}
      >
        <Form form={receiveForm} layout="vertical">
          <Form.Item label="Arrival Date" name="arrivalDate">
            <Input placeholder="DD/MM/YYYY" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>* Stock will be updated with "Received" status.</Text>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <AlertFilled style={{ color: '#ff4d4f' }} />
            <span>Send to {teamSendType} Team</span>
            <Tag color="default">{teamSendItems.length} Total</Tag>
            {teamSendItems.filter((i) => i.isUrgent).length > 0 && (
              <Tag color="error">{teamSendItems.filter((i) => i.isUrgent).length} Urgent</Tag>
            )}
          </Space>
        }
        open={teamSendOpen}
        onCancel={() => setTeamSendOpen(false)}
        width={820}
        footer={[
          <Button key="cancel" onClick={() => setTeamSendOpen(false)}>Cancel</Button>,
          <Button
            key="send"
            type="primary"
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={async () => {
              try {
                await sendToStickerTeam({
                  type: teamSendType,
                  items: teamSendItems.map((i) => i.key),
                }).unwrap();
                enqueueSnackbar(`${teamSendItems.length} item(s) sent to ${teamSendType} Team`, { variant: 'success' });
                setTeamSendOpen(false);
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || `Failed to send to ${teamSendType} Team`, { variant: 'error' });
              }
            }}
          >
            Send All to {teamSendType} Team
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {teamSendItems.filter((i) => i.isUrgent).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 12px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                <AlertFilled style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>Urgent / Emergency Deliveries (Partial)</Text>
                <Tag color="error">{teamSendItems.filter((i) => i.isUrgent).length}</Tag>
              </div>
              <Table
                dataSource={teamSendItems.filter((i) => i.isUrgent)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Status', key: 'status', render: () => <Tag icon={<AlertFilled />} color="error">Emergency</Tag> },
                ]}
              />
            </div>
          )}
          {teamSendItems.filter((i) => !i.isUrgent).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong>Pending Orders</Text>
                <Tag>{teamSendItems.filter((i) => !i.isUrgent).length}</Tag>
              </div>
              <Table
                dataSource={teamSendItems.filter((i) => !i.isUrgent)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Status', key: 'status', render: () => <Tag color="default">Pending</Tag> },
                ]}
              />
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
}
