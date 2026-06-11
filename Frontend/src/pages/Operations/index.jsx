import React, { useEffect, useMemo, useState } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
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
  ExperimentOutlined,
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
  useSetOrderEmergencyMutation,
  useApproveStickerRequestMutation,
  useGetVendorsQuery,
  useGetUsersQuery,
  useGetCompanySettingsQuery,
} from '../../store/api/apiSlice';
import {
  buildProductionQueues,
  canAssignTaskFromChecks,
  designColor,
  designerCredentials,
  FLOW_STAGES,
  getCheckStateMap,
  getEmergencyProductSet,
  getFlowStep,
  getProgressFromChecks,
  PACKAGING_TYPE_LABELS,
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
  const makeUpload = useCloudinaryUpload();
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const { filterTabs, activeKeyFor } = useTabAccess('Operations');
  const { requireAccess } = usePageAccess('Operations');
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);

  // API-backed state — RTK Query
  const { data: ordersData, isLoading: ordersLoading } = useGetOperationOrdersQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: stickerData } = useGetStickerRequestsQuery();
  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [createStickerRequest] = useCreateStickerRequestMutation();
  const [uploadStickerDesign] = useUploadStickerDesignMutation();
  const [updateStickerStatus] = useUpdateStickerStatusMutation();
  const [sendToStickerTeam] = useSendToStickerTeamMutation();
  const [assignTask] = useAssignTaskMutation();
  const [setOrderEmergency] = useSetOrderEmergencyMutation();
  const [approveStickerRequest] = useApproveStickerRequestMutation();

  const stickerRequests = stickerData?.data || [];

  // Printing vendors from Vendors & Suppliers module (vendorType = 'printing')
  const { data: printingVendorData } = useGetVendorsQuery({ type: 'printing' });

  // Vendor users from Settings (department = Vendors, role = Sticker/Box/Ziplock)
  const { data: usersData } = useGetUsersQuery();
  const vendorUsers = useMemo(() => (usersData?.data || []).filter(
    u => u.department === 'Vendors' && ['Sticker', 'Box', 'Ziplock'].includes(u.role)
  ), [usersData]);

  // Company settings: automation vendor per type
  const { data: companyData } = useGetCompanySettingsQuery();
  const automationVendors = useMemo(() => {
    const raw = companyData?.data?.automationVendors;
    if (!raw) return {};
    return raw instanceof Map ? Object.fromEntries(raw) : raw;
  }, [companyData]);

  const printingVendorsByType = useMemo(() => {
    const suppliers = printingVendorData?.data || [];
    const makeOpts = (supplierType, userRole) => [
      ...suppliers.filter(v => v.supplierType === supplierType).map(v => ({
        value: v._id, label: v.name, optionType: 'supplier',
      })),
      ...vendorUsers.filter(u => u.role === userRole).map(u => ({
        value: u._id, label: `${u.fullName} (${u.role})`, optionType: 'user',
      })),
    ];
    return {
      sticker: makeOpts('Sticker', 'Sticker'),
      box: makeOpts('Box', 'Box'),
      frosted: makeOpts('Ziplock', 'Ziplock'),
    };
  }, [printingVendorData, vendorUsers]);

  const apiOrders = useMemo(() => (ordersData?.data || []).map((o) => ({
    key: o._id, id: o.orderCode || o._id,
    hotelLogo: o.clientName || '—', salesPerson: o.salesPerson || o.assignedTo?.fullName || '—',
    createdAt: o.createdAt, orderType: o.orderType || 'Sticker',
    orderCategory: (o.orderCategory === 'SAMPLE' || o.leadId?.leadType === 'SAMPLE') ? 'SAMPLE' : (o.orderCategory || 'ORDER'),
    clientApproval: o.clientApproval || 'Waiting',
    designStatus: o.designStatus || 'Not Started',
    printingStatus: o.printingStatus || 'Not Started',
    stockStatus: o.stockStatus || 'Not Received',
    operationStage: o.operationStage || '', taskStatus: o.taskStatus || 'Pending',
    assignedEmployee: o.salesPerson || o.assignedTo?.fullName || '', printerSentTotal: o.printerSentTotal || 0,
    printerVerified: o.printerVerified || false, inventoryStock: o.inventoryStock || 0,
    orderReceivedStock: o.orderReceivedStock || 0, notifications: o.notifications || [],
    specsSummary: o.specsSummary || '', paymentTerms: o.paymentTerms || '',
    totalAmount: o.total || 0, advance: o.advancePaid || 0,
    expectedDelivery: o.expectedDeliveryDate || o.leadId?.orderDeliveryDate || null,
    isUrgent: o.isUrgent || o.leadId?.isUrgent || false,
    // Fall back to linked lead's splitDates so emergency products identified on the lead
    // (before order creation) are still reflected in the Operations queue.
    splitDates: (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []),
    // True when any product in this order has an emergency (partial) delivery date in splitDates.
    hasEmergencyProducts: (() => {
      const sds = (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []);
      return sds.some((sd) => (sd.products || []).some((ep) => ep.product) || !!sd.product);
    })(),
    items: o.items || [], readiness: o.readiness || {},
    location: o.location || '', phone: o.clientPhone || '',
    paymentProofs: o.paymentProofs || [],
    // Kit display fields — fall back to the populated leadId fields for orders created
    // before kitDisplayUnit was copied onto the Order document itself.
    kitDisplayUnit: o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '',
    displayUnit: o.displayUnit || o.kitDisplayUnit || o.leadId?.displayUnit || o.leadId?.kitDisplayUnit || '',
    displayUnitTab: o.displayUnitTab || o.leadId?.displayUnitTab || '',
    logoRequired: o.logoRequired || o.leadId?.logoNeeded || false,
    logoUrl: o.logoUrl || o.leadId?.hotelLogoUrl || '',
  })), [ordersData]);

  const [queueSteps, setQueueSteps] = useState({});
  const [dispatchTimes, setDispatchTimes] = useState({}); // orderId → { date, time }

  const checkStates = useMemo(() => getCheckStateMap(apiOrders), [apiOrders]);
  const productionQueues = useMemo(
    () => buildProductionQueues(apiOrders, stickerRequests, queueSteps),
    [apiOrders, stickerRequests, queueSteps],
  );
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

  // Map StickerRequest.status → queue step number
  const stickerStatusToStep = (status) => {
    if (status === 'Waiting for Approval' || status === 'Design Confirmation') return 1;
    if (status === 'Approved') return 2;
    if (status === 'In Process' || status === 'Printing') return 3;
    if (status === 'Dispatch') return 4;
    if (status === 'Received') return 5;
    if (status === 'Done') return 6;
    return 0;
  };
  // Find the StickerRequest document for a production-queue item (match by order + product + queue type)
  const findStickerReq = (item) => {
    const stickerType = item.key?.endsWith('-box') ? 'Box'
      : item.key?.endsWith('-frosted') ? 'Frosted Ziplock'
      : 'Sticker';
    const pLower = (item.product || '').toLowerCase();
    return stickerRequests.find(
      (s) => s.orderId?.orderCode === item.orderId && s.stickerType === stickerType && (s.product || '').toLowerCase() === pLower,
    );
  };
  // Local overrides take priority (immediate post-action feedback);
  // falls back to DB-backed status so approved/printed steps survive page refresh.
  const getQueueStep = (item) => {
    if (queueSteps[item.key] !== undefined) return queueSteps[item.key];
    const sr = findStickerReq(item);
    return sr ? stickerStatusToStep(sr.status) : 0;
  };
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
      const matchSearch = !query || order.id.toLowerCase().includes(query) || order.hotelLogo.toLowerCase().includes(query) || order.specsSummary.toLowerCase().includes(query) || order.items.some((item) => (item.itemName || item.product || '').toLowerCase().includes(query));
      const matchStatus = !orderStatusFilter || (orderStatusFilter === 'urgent' ? order.isUrgent : !order.isUrgent);
      return matchSearch && matchStatus;
    });
    return [...result].sort((a, b) => {
      if (b.hasEmergencyProducts && !a.hasEmergencyProducts) return 1;
      if (a.hasEmergencyProducts && !b.hasEmergencyProducts) return -1;
      if (b.isUrgent && !a.isUrgent) return 1;
      if (a.isUrgent && !b.isUrgent) return -1;
      return 0;
    });
  }, [searchText, orderStatusFilter, apiOrders]);

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
  }, [teamSendType, apiOrders, productionQueues]);

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
        <Space size={2} direction="vertical">
          <Space size={4}>
            {record.hasEmergencyProducts && (
              <AlertFilled style={{ color: '#ff4d4f', fontSize: 14 }} />
            )}
            {record.orderCategory === 'SAMPLE' && (
              <ExperimentOutlined style={{ color: '#722ed1', fontSize: 14 }} />
            )}
            <Text strong style={{ color: '#B11E6A' }}>{value}</Text>
          </Space>
          {record.hasEmergencyProducts && (
            <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Emergency Delivery</Tag>
          )}
          {record.orderCategory === 'SAMPLE' && (
            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Sample Order</Tag>
          )}
        </Space>
      ),
    },
    { title: 'Hotel Name', dataIndex: 'hotelLogo' },
    {
      title: 'Type', dataIndex: 'orderCategory',
      render: (v) => (
        <Tag
          style={{
            borderRadius: 20, fontWeight: 600, fontSize: 11,
            background: v === 'SAMPLE' ? '#722ed115' : '#B11E6A15',
            color: v === 'SAMPLE' ? '#722ed1' : '#B11E6A',
            border: `1px solid ${v === 'SAMPLE' ? '#722ed133' : '#B11E6A33'}`,
          }}
        >
          {v === 'SAMPLE' ? 'Sample' : 'Order'}
        </Tag>
      ),
    },
    {
      title: 'Order Delivery Date',
      dataIndex: 'expectedDelivery',
      render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—',
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
      render: (_, record) => {
        const validStatuses = ['Yet to Receive', 'Received', 'Closed'];
        const displayVal = printingStatuses[record.id] ?? (validStatuses.includes(record.printingStatus) ? record.printingStatus : undefined);
        const dt = dispatchTimes[record.id];
        return (
          <Space direction="vertical" size={2} onClick={(e) => e.stopPropagation()}>
            <Select
              value={displayVal}
              size="small"
              style={{ width: 148 }}
              placeholder="Select"
              onChange={async (val) => {
                setPrintingStatuses((prev) => ({ ...prev, [record.id]: val }));
                try {
                  await updateOrderStatus({ id: record.key, printingStatus: val }).unwrap();
                  enqueueSnackbar(`${record.id} status → ${val}`, { variant: 'success' });
                  if (val === 'Closed') {
                    enqueueSnackbar('Printing closed — opening task assignment', { variant: 'info' });
                    navigate(`/operations/${record.id}?assign=1`);
                  }
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
            {dt && (
              <Text style={{ fontSize: 10, color: '#888' }}>
                Dispatched: {dt.date} {dt.time}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View full operation screen">
            <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/operations/${record.id}`); }} />
          </Tooltip>
          <Tooltip title={record.isUrgent ? 'Unmark emergency' : 'Mark as emergency'}>
            <Button
              size="small"
              icon={<AlertFilled />}
              danger={record.isUrgent}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await setOrderEmergency({ id: record.key, isEmergency: !record.isUrgent }).unwrap();
                  enqueueSnackbar(record.isUrgent ? 'Emergency removed' : 'Marked as emergency', { variant: 'success' });
                } catch { enqueueSnackbar('Failed to update', { variant: 'error' }); }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];


  const queueColumns = (label) => {
    const isStickerTab = label === 'Sticker';
    return [
      {
        title: 'Order',
        dataIndex: 'orderId',
        render: (value, record) => (
          <Space size={2} direction="vertical">
            <Space size={4}>
              {record.isUrgent && (
                <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />
              )}
              {record.orderCategory === 'SAMPLE' && (
                <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />
              )}
              <Text strong style={{ color: '#B11E6A' }}>{value}</Text>
            </Space>
            {record.isUrgent && (
              <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '16px' }}>Emergency Order</Tag>
            )}
            {record.orderCategory === 'SAMPLE' && (
              <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '16px' }}>Sample</Tag>
            )}
          </Space>
        ),
      },
      { title: 'Hotel Name', dataIndex: 'hotelLogo' },
      {
        title: 'Logo',
        key: 'logo',
        width: 80,
        render: (_, record) => record.logoUrl
          ? <a href={record.logoUrl} target="_blank" rel="noreferrer"><img src={record.logoUrl} alt="logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee' }} /></a>
          : record.logoRequired
            ? <Tag color="orange" style={{ fontSize: 10 }}>Logo Req.</Tag>
            : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
      },
      {
        title: 'Product',
        dataIndex: 'product',
        render: (value, record) => (
          <Space size={4} direction="vertical" style={{ gap: 2 }}>
            <Space size={4}>
              {record.isEmergencyProduct && (
                <Tooltip title="Emergency / Partial delivery product — process first">
                  <AlertFilled style={{ color: '#ff4d4f', fontSize: 11 }} />
                </Tooltip>
              )}
              <Text style={record.isEmergencyProduct ? { color: '#ff4d4f', fontWeight: 600 } : {}}>{value}</Text>
            </Space>
            {record.isEmergencyGated && (
              <Tooltip title="Emergency items for this order must be completed first">
                <Tag color="orange" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                  After Emergency Items
                </Tag>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: label === 'Box' ? 'Size / PVK' : 'Size',
        dataIndex: 'size',
        render: (value) => value ? <Tag color="geekblue">{value}</Tag> : '—',
      },
      { title: 'Qty', dataIndex: 'qty', render: (value) => (value || 0).toLocaleString() },
      {
        title: 'Sticker Printing',
        dataIndex: 'stickerPrinting',
        render: (val) => (
          <Tag color={val === 'Yes' ? 'blue' : 'default'}>{val || '—'}</Tag>
        ),
      },
      ...(isStickerTab ? [{
        title: 'After Approval',
        dataIndex: 'packagingType',
        render: (val) => {
          const label = PACKAGING_TYPE_LABELS[val] || val || '—';
          const color = val === 'box' ? 'green' : val === 'frosted' ? 'orange' : 'purple';
          return <Tag color={color}>{label}</Tag>;
        },
      }] : []),
      {
        title: 'Actions',
        key: 'actions',
        width: 320,
        render: (_, record) => {
          if (record.isEmergencyGated) {
            return (
              <Tag
                icon={<LockOutlined />}
                color="orange"
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8 }}
              >
                Locked — complete emergency items first
              </Tag>
            );
          }
          const step = getQueueStep(record);
          const sr = findStickerReq(record);
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
                      {(uploadedFiles[record.key]?.length || sr?.designFileUrl) ? 'Re-upload' : 'Upload Design'}
                    </Button>
                  </Upload>
                  {(uploadedFiles[record.key]?.length > 0 || sr?.designFileUrl) && (
                    <Space size={4}>
                      <Tag color="green" style={{ fontSize: 11 }}>✓ Uploaded</Tag>
                      {sr?.designFileUrl && (
                        <a href={sr.designFileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#B11E6A' }}>View</a>
                      )}
                    </Space>
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
                        const queueType = record.key?.endsWith('-box') ? 'Box'
                          : record.key?.endsWith('-frosted') ? 'Frosted Ziplock'
                          : 'Sticker';
                        const existing = findStickerReq(record);
                        let stickerId;
                        if (existing) {
                          stickerId = existing._id;
                        } else {
                          const created = await createStickerRequest({
                            orderId: ord?.key,
                            hotelLogo: record.hotelLogo,
                            product: record.product,
                            stickerType: queueType,
                            quantity: record.qty,
                            stickerSize: record.size,
                          }).unwrap();
                          stickerId = created.data._id;
                        }
                        await uploadStickerDesign({ id: stickerId, files: uploadedFiles[record.key] || [] }).unwrap();
                        await updateStickerStatus({ id: stickerId, status: 'Waiting for Approval' }).unwrap();
                        advanceStep(record.key, 1);
                        enqueueSnackbar(`Design sent for approval — ${ord?.salesPerson || 'Sales'} & Operations team notified for ${record.orderId}`, { variant: 'info' });
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
                  {(uploadedFiles[record.key]?.length > 0 || sr?.designFileUrl) ? (
                    <Space size={4}>
                      <Tag color="green" style={{ fontSize: 11 }}>✓ Design Uploaded</Tag>
                      {sr?.designFileUrl && (
                        <a href={sr.designFileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#B11E6A' }}>View</a>
                      )}
                    </Space>
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
                  {/* Approval status indicators (read-only — approval is done from Operation detail view) */}
                  {sr?.salesApproved && (
                    <Tooltip title={`Sales approved by ${sr.salesApprovedBy?.fullName || 'Sales'} on ${sr.salesApprovedAt ? new Date(sr.salesApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}`}>
                      <Tag color="green" icon={<CheckCircleOutlined />} style={{ cursor: 'default' }}>
                        Sales ✓ {sr.salesApprovedAt ? new Date(sr.salesApprovedAt).toLocaleDateString('en-IN') : ''}
                      </Tag>
                    </Tooltip>
                  )}
                  {sr?.opsHeadApproved && (
                    <Tooltip title={`Ops approved by ${sr.opsHeadApprovedBy?.fullName || 'Ops'} on ${sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}`}>
                      <Tag color="blue" icon={<CheckCircleOutlined />} style={{ cursor: 'default' }}>
                        Ops ✓ {sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleDateString('en-IN') : ''}
                      </Tag>
                    </Tooltip>
                  )}
                  <Button
                    size="small"
                    icon={<MessageOutlined />}
                    style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    onClick={async () => {
                      const ord = apiOrders.find((o) => o.id === record.orderId);
                      try {
                        await sendToStickerTeam({ id: sr?._id || record.key, orderId: record.orderId, type: teamSendType }).unwrap();
                        enqueueSnackbar(`WhatsApp sent to ${ord?.salesPerson || 'Sales'} & Operations team`, { variant: 'success' });
                      } catch (err) {
                        enqueueSnackbar(err?.data?.message || err?.data || 'Failed to send WhatsApp notification', { variant: 'error' });
                      }
                    }}
                  >
                    WhatsApp
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <Tag color="green">Approved</Tag>
                  {/* Show who approved and when */}
                  {sr && (
                    <Space direction="vertical" size={2}>
                      {sr.salesApproved && (
                        <Text style={{ fontSize: 10, color: '#52c41a' }}>
                          Sales: {sr.salesApprovedBy?.fullName || '—'} · {sr.salesApprovedAt ? new Date(sr.salesApprovedAt).toLocaleDateString('en-IN') : '—'}
                        </Text>
                      )}
                      {sr.opsHeadApproved && (
                        <Text style={{ fontSize: 10, color: '#1677ff' }}>
                          Ops: {sr.opsHeadApprovedBy?.fullName || '—'} · {sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleDateString('en-IN') : '—'}
                        </Text>
                      )}
                    </Space>
                  )}
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                    onClick={async () => {
                      const ord = apiOrders.find((o) => o.id === record.orderId);
                      try {
                        let srId = sr?._id;
                        if (!srId) {
                          // SR never created (design step was skipped) — create it now so the
                          // box/frosted queue can find it after the RTK refetch.
                          const created = await createStickerRequest({
                            orderId: ord?.key,
                            hotelLogo: record.hotelLogo,
                            product: record.product,
                            stickerType: 'Sticker',
                            quantity: record.qty,
                            stickerSize: record.size,
                          }).unwrap();
                          srId = created.data._id;
                        }
                        await updateStickerStatus({ id: srId, status: 'In Process' }).unwrap();
                        advanceStep(record.key, 3);
                        const dest = record.packagingType;
                        if (dest === 'box') {
                          setActiveTab('box');
                          enqueueSnackbar('Printing started — item moved to Box tab', { variant: 'info' });
                        } else if (dest === 'frosted') {
                          setActiveTab('frosted');
                          enqueueSnackbar('Printing started — item moved to Frosted Ziplock tab', { variant: 'info' });
                        }
                      } catch (err) {
                        enqueueSnackbar(err?.data?.message || err?.data || 'Failed to start printing', { variant: 'error' });
                      }
                    }}
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
  };

  const openRequestModal = (type) => {
    if (!requireAccess('add')) return;
    setRequestType(type);
    requestForm.resetFields();
    // Auto-fill the automation vendor for this type
    const autoKey = type === 'Frosted Ziplock' ? 'Ziplock' : type;
    const autoId = automationVendors[autoKey];
    if (autoId) requestForm.setFieldsValue({ vendorId: autoId });
    setRequestOpen(true);
  };

  const handleSubmitRequest = async () => {
    try {
      const vals = await requestForm.validateFields();
      await createStickerRequest({
        orderId: vals.orderId,
        hotelLogo: vals.client || '',
        stickerType: requestType,
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
    // Sort priority:
    //   1. Emergency products from urgent orders (process these FIRST)
    //   2. Other items from urgent orders
    //   3. All other items
    const allActive = rows
      .filter((r) => getQueueStep(r) < 6)
      .sort((a, b) => {
        const aEmg = a.isUrgent && a.isEmergencyProduct;
        const bEmg = b.isUrgent && b.isEmergencyProduct;
        if (bEmg && !aEmg) return 1;
        if (aEmg && !bEmg) return -1;
        if (b.isUrgent && !a.isUrgent) return 1;
        if (a.isUrgent && !b.isUrgent) return -1;
        return 0;
      });
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
              onRow={(record) =>
                record.isEmergencyGated
                  ? { style: { opacity: 0.45, pointerEvents: 'none', background: 'rgba(0,0,0,0.02)' } }
                  : {}
              }
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
                    render: (v) => {
                      const ord = apiOrders.find((o) => o.id === v);
                      return (
                        <Space direction="vertical" size={2}>
                          <Space size={4}>
                            {ord?.isUrgent && <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
                            {ord?.orderCategory === 'SAMPLE' && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
                            <Text strong style={{ color: '#B11E6A' }}>{v}</Text>
                          </Space>
                          {ord?.orderCategory === 'SAMPLE' && (
                            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>Sample Order</Tag>
                          )}
                        </Space>
                      );
                    },
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
        onChange={setActiveTab}
        type="card"
        items={filterTabs([
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
                        style: {
                          cursor: 'pointer',
                          background: record.hasEmergencyProducts ? '#fff2f0' : (record.isUrgent ? '#fffbe6' : undefined),
                        },
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
        ])}
        activeKey={activeKeyFor(activeTab)}
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
          <Form.Item label="Hotel Logo (Upload)" name="logo" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}>
            <Upload.Dragger customRequest={makeUpload('operations/logos')} maxCount={1} accept=".jpg,.jpeg,.png,.pdf,.ai,.svg">
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: '#B11E6A' }} />
              </p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Click or drag logo file here</p>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 0 }}>Supports: JPG, PNG, PDF, AI, SVG</p>
            </Upload.Dragger>
          </Form.Item>
          {/* Vendor / Team Member selection per type */}
          <Form.Item
            label={
              <span>
                Assign to Vendor / Team Member
                {automationVendors[requestType === 'Frosted Ziplock' ? 'Ziplock' : requestType] && (
                  <Tag style={{ marginLeft: 8, borderRadius: 8, background: '#B11E6A', color: '#fff', border: 'none', fontSize: 10 }}>Auto-filled</Tag>
                )}
              </span>
            }
            name="vendorId"
          >
            <Select
              placeholder={`Select ${requestType} vendor or team member`}
              allowClear
              options={(printingVendorsByType[
                requestType === 'Sticker' ? 'sticker'
                : requestType === 'Box' ? 'box'
                : 'frosted'
              ] || []).map(opt => ({
                value: opt.value,
                label: (
                  <span>
                    {opt.label}
                    {opt.optionType === 'user' && (
                      <Tag style={{ marginLeft: 6, borderRadius: 6, fontSize: 10 }} color="blue">Team</Tag>
                    )}
                  </span>
                ),
              }))}
            />
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
                  await updateOrderStatus({ id: ord.key, operationStage: 'Dispatch', stockStatus: 'Dispatched', printingStatus: 'Yet to Receive' }).unwrap();
                  setPrintingStatuses((prev) => ({ ...prev, [ord.id]: 'Yet to Receive' }));
                  setDispatchTimes((prev) => ({ ...prev, [ord.id]: { date: vals.dispatchDate, time: vals.dispatchTime } }));
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
