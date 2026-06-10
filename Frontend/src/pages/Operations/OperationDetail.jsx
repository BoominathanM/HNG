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
  Tooltip,
  Typography,
} from 'antd';
import {
  AlertFilled,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
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
  useGetStickerRequestsQuery,
  useUpdateOperationOrderStatusMutation,
  useAssignTaskMutation,
  useAssignTasksPerProductMutation,
  useSplitPartialDeliveryMutation,
  useGetHotelDesignsQuery,
  useSaveHotelDesignMutation,
  useGetItemsQuery,
  useGetVendorsQuery,
  useSendToStickerTeamMutation,
  useApproveStickerRequestMutation,
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

// Printing vendors are loaded dynamically from Vendors & Suppliers (vendorType='printing').
// supplierType 'Sticker' → sticker_printing, 'Box' → box, 'Ziplock' → frosted_ziplock.

export default function OperationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const loggedInUser = useSelector((state) => state.auth.user);
  const [taskForm] = Form.useForm();
  const [assignModalForm] = Form.useForm();
  const { data: ordersData } = useGetOperationOrdersQuery();
  const { data: stickerData } = useGetStickerRequestsQuery();
  const stickerRequests = stickerData?.data || [];
  const { data: invData } = useGetItemsQuery();
  const { data: printingVendorData } = useGetVendorsQuery({ type: 'printing' });

  // Build { sticker_printing: [...], box: [...], frosted_ziplock: [...] } from live vendor data.
  const PRINTING_VENDORS = useMemo(() => {
    const vendors = printingVendorData?.data || [];
    return {
      sticker_printing: vendors
        .filter((v) => v.supplierType === 'Sticker')
        .map((v) => ({ value: v._id, label: v.name })),
      box: vendors
        .filter((v) => v.supplierType === 'Box')
        .map((v) => ({ value: v._id, label: v.name })),
      frosted_ziplock: vendors
        .filter((v) => v.supplierType === 'Ziplock')
        .map((v) => ({ value: v._id, label: v.name })),
    };
  }, [printingVendorData]);
  const invMap = useMemo(() => {
    const m = {};
    (invData?.data || []).forEach((i) => { m[i.itemName] = i; });
    return m;
  }, [invData]);
  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [assignTask] = useAssignTaskMutation();
  const [assignTasksPerProduct] = useAssignTasksPerProductMutation();
  const [splitPartialDelivery] = useSplitPartialDeliveryMutation();
  const [saveHotelDesign] = useSaveHotelDesignMutation();
  const [sendToStickerTeam] = useSendToStickerTeamMutation();
  const [approveStickerRequest] = useApproveStickerRequestMutation();

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
    totalAmount: o.total || 0,
    advance: o.advancePaidAmount ?? o.advancePaid ?? 0,
    paidAmount: (() => {
      const backendPaid = Number(o.paidAmount) || 0;
      const collTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const adv = o.advancePaidAmount ?? o.advancePaid ?? 0;
      return backendPaid > 0 ? backendPaid : (collTotal > 0 ? collTotal : adv);
    })(),
    expectedDelivery: o.expectedDeliveryDate
      ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10)
      : o.expectedDelivery
      || (o.leadId?.orderDeliveryDate
        ? new Date(o.leadId.orderDeliveryDate).toISOString().slice(0, 10)
        : null),
    isUrgent: o.isUrgent || o.leadId?.isUrgent || false,
    splitDates: (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []),
    items: (o.items || []).map((it, idx) => ({ ...it, key: it._id ? String(it._id) : String(idx) })),
    readiness: o.readiness || {},
    location: o.location || '', phone: o.clientPhone || o.phone || '',
    contactPerson: o.contactPerson || '',
    billingName: o.billingName || o.clientName || '',
    gstNumber: o.gstNumber || '',
    gstPercent: o.gstPercent,
    salesPerson: o.salesPerson || o.assignedTo?.fullName || '',
    orderCategory: (o.orderCategory === 'SAMPLE' || o.leadId?.leadType === 'SAMPLE') ? 'SAMPLE' : (o.orderCategory || 'ORDER'),
    billType: o.billType || o.type || 'GST',
    deliveryBy: o.deliveryBy || '',
    transportationBy: o.transportationBy || '',
    forwardingCharge: o.forwardingCharge || false,
    paymentProofs: (() => {
      const seen = new Set();
      const logoEntry = o.leadId?.hotelLogoUrl
        ? [{ url: o.leadId.hotelLogoUrl, name: 'Hotel Logo (Lead)' }]
        : [];
      return [
        ...(o.paymentProofs || []),
        ...(o.leadId?.paymentProofs || []),
        ...logoEntry,
      ].filter((p) => {
        if (!p || (!p.url && !p.name)) return false;
        const key = p.url || p.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })(),
  })), [ordersData]);
  const checkStates = useMemo(() => getCheckStateMap(allOrders), [allOrders]);
  const productionQueues = useMemo(() => buildProductionQueues(allOrders, stickerRequests), [allOrders, stickerRequests]);
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
      product: record.itemName || record.name || record.product || '',
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
    const currentOrder = allOrders.find((o) => o.id === id);
    const splitDates = currentOrder?.splitDates || [];
    // Build set of lowercase emergency product names from splitDates (both formats)
    const emergencyProducts = new Set();
    splitDates.forEach((sd) => {
      (sd.products || []).forEach((ep) => { if (ep.product) emergencyProducts.add(ep.product.toLowerCase()); });
      if (sd.product) emergencyProducts.add(sd.product.toLowerCase());
    });
    // Include ALL products from this order (not just emergency) so sticker/box/ziplock teams see full order
    const items = (queueMap[printingModalType] || [])
      .filter((item) => item.orderId === id)
      .map((item) => ({
        ...item,
        isUrgent: currentOrder?.isUrgent || false,
        isEmergencyProduct: emergencyProducts.has((item.product || '').toLowerCase()),
      }));
    return items.sort((a, b) => (b.isEmergencyProduct ? 1 : 0) - (a.isEmergencyProduct ? 1 : 0));
  }, [printingModalType, id, allOrders, productionQueues]);

  const order = allOrders.find((item) => item.id === id);
  const assignedEmployee = order ? { key: order.key, name: order.assignedEmployee } : null;

  // Approved designs for this hotel (reuse in future orders).
  const { data: hotelDesignsRaw } = useGetHotelDesignsQuery(
    { hotelName: order?.hotelLogo },
    { skip: !order?.hotelLogo }
  );
  const hotelDesigns = hotelDesignsRaw?.data || [];

  // Build map: lowercase productName → { date, qty } from splitDates.
  // qty is the emergency delivery quantity; if not specified, null means all items of that name are emergency.
  // When qty is present, only the order item whose qty matches is flagged as emergency.
  const emergencyProductMap = useMemo(() => {
    const map = {};
    (order?.splitDates || []).forEach((sd) => {
      const sdDate = sd.date || null;
      (sd.products || []).forEach((ep) => {
        const key = ep.product?.toLowerCase();
        if (key && (!map[key] || (sdDate && sdDate < map[key].date))) {
          map[key] = { date: sdDate, qty: ep.qty != null ? Number(ep.qty) : null };
        }
      });
      const key = sd.product?.toLowerCase();
      if (key && (!map[key] || (sdDate && sdDate < map[key].date))) {
        map[key] = { date: sdDate, qty: sd.qty != null ? Number(sd.qty) : null };
      }
    });
    return map;
  }, [order?.splitDates]);

  // Sort items: emergency products first (by emergency date), then regular products
  const sortedOrderItems = useMemo(() => {
    const items = order?.items || [];
    if (!order?.splitDates?.length) return items;
    return [...items].sort((a, b) => {
      const aName = (a.product || a.itemName || '').toLowerCase();
      const bName = (b.product || b.itemName || '').toLowerCase();
      const aDate = emergencyProductMap[aName];
      const bDate = emergencyProductMap[bName];
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      if (aDate && bDate) return new Date(aDate) - new Date(bDate);
      return 0;
    });
  }, [order?.items, order?.splitDates, emergencyProductMap]);

  // Determine if the emergency phase for this order is complete.
  // Phase is done only when queue items exist for this order AND none are still gated.
  // If there are no queue items (products have no sticker/box/frosted printing), the phase
  // is NOT done — emergency products still need to be processed first.
  const emergencyPhaseDone = useMemo(() => {
    if (Object.keys(emergencyProductMap).length === 0) return true;
    const allQueues = [
      ...productionQueues.sticker,
      ...productionQueues.box,
      ...productionQueues.frosted,
    ].filter((item) => item.orderId === id);
    if (allQueues.length === 0) return false;
    return !allQueues.some((item) => item.isEmergencyGated);
  }, [emergencyProductMap, productionQueues, id]);

  // Map product name (lowercase) → sticker request for this order.
  const stickerRequestMap = useMemo(() => {
    const map = {};
    stickerRequests
      .filter((sr) => sr.orderId === order?.key || sr.orderId === id)
      .forEach((sr) => {
        const key = (sr.product || sr.hotelLogo || '').toLowerCase();
        if (key) map[key] = sr;
      });
    return map;
  }, [stickerRequests, order?.key, id]);

  // Annotate every item with isEmergencyProduct / isEmergencyGated flags — mirrors the
  // Sticker/Box queue treatment so Overview shows the same status indicators.
  // When the splitDate specifies a qty, only the item whose qty matches is flagged; this
  // prevents the full-order item from being shown as emergency when only a partial qty is urgent.
  const visibleOrderItems = useMemo(() => {
    const hasEmergency = Object.keys(emergencyProductMap).length > 0;
    return sortedOrderItems.map((item) => {
      const name = (item.product || item.itemName || '').toLowerCase();
      const emergencyInfo = emergencyProductMap[name];
      let isEmergencyProduct = false;
      if (hasEmergency && emergencyInfo) {
        if (emergencyInfo.qty != null) {
          isEmergencyProduct = Number(item.qty) === emergencyInfo.qty;
        } else {
          isEmergencyProduct = true;
        }
      }
      const isEmergencyGated = hasEmergency && !isEmergencyProduct && !emergencyPhaseDone;
      return { ...item, isEmergencyProduct, isEmergencyGated };
    });
  }, [sortedOrderItems, emergencyPhaseDone, emergencyProductMap]);

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

  const handleDownloadFile = async (url, filename) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
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
          { itemName: firstItem.itemName || firstItem.name || firstItem.product, qty: firstItem.qty, key: 0, processTask: '' },
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
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        const name = record.itemName || record.name || record.product;
        const isEmergencyProduct = record.isEmergencyProduct;
        const isEmergencyGated = record.isEmergencyGated;
        const emergencyDate = isEmergencyProduct ? emergencyProductMap[(name || '').toLowerCase()]?.date : null;
        return (
          <Space direction="vertical" size={2} style={{ gap: 2 }}>
            <Space size={6}>
              {isEmergencyProduct && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
              <Text strong style={isEmergencyProduct ? { color: '#ff4d4f' } : {}}>{name || '—'}</Text>
            </Space>
            {isEmergencyProduct && emergencyDate && (
              <Space size={4}>
                <Tag color="error" icon={<AlertFilled />} style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '16px' }}>Emergency</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(emergencyDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </Text>
              </Space>
            )}
            {isEmergencyGated && (
              <Tag color="orange" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                After Emergency Items
              </Tag>
            )}
          </Space>
        );
      },
    },
    { title: 'Print Type', dataIndex: 'logoType', render: (value) => value ? <Tag color="purple">{value}</Tag> : '—' },
    {
      title: 'Inventory Stock',
      key: 'inventoryStock',
      align: 'right',
      render: (_, record) => {
        const name = record.itemName || record.name;
        const liveStock = record.itemId?.currentStock ?? invMap[name]?.currentStock ?? record.inventoryStock ?? 0;
        const enough = liveStock >= (record.qty || 0);
        return (
          <Text strong style={{ color: enough ? '#389e0d' : '#cf1322' }}>
            {liveStock.toLocaleString()}
          </Text>
        );
      },
    },
    {
      title: 'Required Qty',
      dataIndex: 'qty',
      align: 'right',
      render: (value, record) => {
        const name = record.itemName || record.name;
        const liveStock = record.itemId?.currentStock ?? invMap[name]?.currentStock ?? record.inventoryStock ?? 0;
        const enough = liveStock >= (value || 0);
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            <Text strong>{(value || 0).toLocaleString()}</Text>
            {!enough && (
              <Tag color="error" style={{ fontSize: 10, margin: 0 }}>
                Short {Math.max(0, (value || 0) - liveStock).toLocaleString()}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Selling Price',
      key: 'sellingPrice',
      align: 'right',
      render: (_, record) => {
        const name = record.itemName || record.name;
        const sp = record.price || record.rate || record.itemId?.sellingPrice || invMap[name]?.sellingPrice;
        return sp ? <Text>₹{Number(sp).toLocaleString()}</Text> : '—';
      },
    },
    {
      title: 'Value',
      key: 'value',
      align: 'right',
      render: (_, record) => {
        const val = record.lineTotal || (record.qty || 0) * (record.price || record.rate || 0);
        return val ? <Text strong style={{ color: '#B11E6A' }}>₹{Number(val).toLocaleString()}</Text> : '—';
      },
    },
    {
      title: 'GST %',
      key: 'gst',
      align: 'center',
      render: (_, record) => {
        const gst = record.gst ?? order?.gstPercent;
        return gst != null ? <Tag color="blue">{gst}%</Tag> : '—';
      },
    },
    {
      title: 'HSN Code',
      key: 'hsnCode',
      render: (_, record) => {
        const name = record.itemName || record.name;
        return record.hsnCode || record.itemId?.hsnCode || invMap[name]?.hsnCode || '—';
      },
    },
    {
      title: 'Default Size',
      key: 'defaultSize',
      render: (_, record) => {
        const name = record.itemName || record.name;
        const sz = record.size || record.itemId?.defaultSize || invMap[name]?.defaultSize;
        return sz ? <Tag color="geekblue">{sz}</Tag> : '—';
      },
    },
    {
      title: 'Packing Material',
      key: 'packingMaterial',
      render: (_, record) => {
        const name = record.itemName || record.name;
        return record.packingMaterial || record.packaging || record.itemId?.packingMaterial || invMap[name]?.packingMaterial || '—';
      },
    },
    {
      title: 'Material Category',
      key: 'materialCategory',
      render: (_, record) => {
        const name = record.itemName || record.name;
        return record.materialCategory || record.material || record.itemId?.materialCategory || invMap[name]?.materialCategory || '—';
      },
    },
    {
      title: 'Brand',
      key: 'brand',
      render: (_, record) => {
        const name = record.itemName || record.name;
        return record.brand || record.itemId?.brand || invMap[name]?.brand || '—';
      },
    },
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
      title: 'Ops Approval',
      key: 'opsApproval',
      render: (_, record) => {
        const name = (record.product || record.itemName || record.name || '').toLowerCase();
        const sr = stickerRequestMap[name];
        if (!sr) return <Tag color="default" style={{ fontSize: 11 }}>No design yet</Tag>;
        if (sr.opsHeadApproved) {
          return (
            <Tooltip title={`Approved by ${sr.opsHeadApprovedBy?.fullName || 'Ops'} on ${sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}`}>
              <Tag color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 11, cursor: 'default' }}>
                Ops OK · {sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleDateString('en-IN') : ''}
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff', borderRadius: 6 }}
            onClick={async () => {
              try {
                const res = await approveStickerRequest({ id: sr._id, role: 'opsHead' }).unwrap();
                enqueueSnackbar(
                  res?.data?.status === 'Approved'
                    ? 'Design fully approved — printing can start!'
                    : 'Ops Head approval recorded — awaiting Sales approval',
                  { variant: 'success' },
                );
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || 'Failed to approve', { variant: 'error' });
              }
            }}
          >
            Ops OK
          </Button>
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
                <Text strong style={{ color: textColor }}>{order.orderCategory === 'SAMPLE' ? 'Delivery Terms' : 'Payment & Delivery Terms'}</Text>
              </Space>
            }
          >
            <Space direction="vertical" size={18} style={{ width: '100%' }}>

              {/* Payment Terms — hidden for sample orders */}
              {order.orderCategory !== 'SAMPLE' && (
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
              )}

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

              {/* Financial Summary — hidden for sample orders */}
              {order.orderCategory !== 'SAMPLE' && (
                <>
                  <Row gutter={[16, 10]}>
                    <Col xs={12} sm={8}>
                      <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Total Amount</Text>
                      <Text strong style={{ color: '#B11E6A', fontSize: 16 }}>₹{(order.totalAmount ?? 0).toLocaleString()}</Text>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Amount Paid</Text>
                      <Text strong style={{ color: '#52c41a', fontSize: 16 }}>₹{(order.paidAmount ?? order.advance ?? 0).toLocaleString()}</Text>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Balance Due</Text>
                      <Text strong style={{ color: Math.max(0, (order.totalAmount ?? 0) - (order.paidAmount ?? order.advance ?? 0)) > 0 ? '#fa8c16' : '#52c41a', fontSize: 16 }}>
                        ₹{Math.max(0, (order.totalAmount ?? 0) - (order.paidAmount ?? order.advance ?? 0)).toLocaleString()}
                      </Text>
                    </Col>
                  </Row>
                  <Row gutter={[16, 10]}>
                    <Col xs={12} sm={8}>
                      <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Advance Paid</Text>
                      <Text strong style={{ color: '#52c41a' }}>₹{(order.advance ?? 0).toLocaleString()}</Text>
                    </Col>
                  </Row>
                </>
              )}
              <Row gutter={[16, 10]}>
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

              {/* Payment Proofs — hidden for sample orders */}
              {order.orderCategory !== 'SAMPLE' && <div>
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
                            onClick={() => handleDownloadFile(file.url, file.name)}
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
              </div>}

              {/* Order Info */}
              <div>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Order Info
                </Text>
                <Row gutter={[16, 10]}>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Billing Name</Text>
                    <Text strong style={{ color: textColor }}>{order.billingName || '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>GST Number</Text>
                    <Text strong style={{ color: textColor }}>{order.gstNumber || '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>GST %</Text>
                    <Text strong style={{ color: textColor }}>{order.gstPercent != null ? `${order.gstPercent}%` : '—'}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Bill Type</Text>
                    <Tag color={order.billType === 'GST' || order.billType === 'GST' ? 'blue' : 'default'} style={{ marginTop: 2 }}>
                      {order.billType === 'NON_GST' ? 'Non-GST' : order.billType || 'GST'}
                    </Tag>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Category</Text>
                    <Tag color={order.orderCategory === 'SAMPLE' ? 'orange' : 'green'} style={{ marginTop: 2 }}>
                      {order.orderCategory || 'ORDER'}
                    </Tag>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Sales Person</Text>
                    <Text strong style={{ color: textColor }}>{order.salesPerson || '—'}</Text>
                  </Col>
                </Row>
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
                      {order.orderCategory === 'SAMPLE' && (
                        <Tag color="purple" icon={<ExperimentOutlined />} style={{ fontWeight: 600 }}>Sample Order</Tag>
                      )}
                    </Space>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  {order.orderCategory === 'SAMPLE' && (
                    <div style={{ padding: '8px 16px', background: 'rgba(114,46,209,0.06)', borderBottom: '1px solid rgba(114,46,209,0.2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <ExperimentOutlined style={{ color: '#722ed1' }} />
                      <Text style={{ fontSize: 12, color: '#722ed1', fontWeight: 600 }}>
                        Sample Order — no billing or dispatch will be generated.
                      </Text>
                    </div>
                  )}
                  {!emergencyPhaseDone && visibleOrderItems.some(i => i.isEmergencyProduct) && (
                    <div style={{ padding: '8px 16px', background: 'rgba(255,77,79,0.06)', borderBottom: '1px solid rgba(255,77,79,0.2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <AlertFilled style={{ color: '#ff4d4f' }} />
                      <Text style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>
                        Process emergency products first.
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Remaining products are queued — they will be unlocked after emergency items are completed.
                      </Text>
                    </div>
                  )}
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table
                      dataSource={visibleOrderItems}
                      rowKey={(r, idx) => r.key || r._id || String(idx)}
                      columns={productColumns}
                      pagination={false}
                      size="small"
                      scroll={{ x: 'max-content' }}
                      onRow={(record) => {
                        if (record.isEmergencyProduct) {
                          return { style: { background: 'rgba(255,77,79,0.07)', borderLeft: '3px solid #ff4d4f' } };
                        }
                        if (record.isEmergencyGated) {
                          return { style: { opacity: 0.45, pointerEvents: 'none', background: 'rgba(0,0,0,0.02)', cursor: 'not-allowed' } };
                        }
                        return {};
                      }}
                    />
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
            onClick={async () => {
              const teamLabel =
                printingModalType === 'sticker_printing'
                  ? 'Sticker Team'
                  : printingModalType === 'box'
                  ? 'Box Team'
                  : 'Ziplock Team';
              try {
                await sendToStickerTeam({
                  type: printingModalType,
                  items: printingTeamItems.map((i) => i.key),
                }).unwrap();
                enqueueSnackbar(`${printingTeamItems.length} item(s) sent to ${teamLabel}`, { variant: 'success' });
                setPrintingModalOpen(false);
              } catch (err) {
                enqueueSnackbar(err?.data?.message || err?.data || `Failed to send to ${teamLabel}`, { variant: 'error' });
              }
            }}
          >
            Confirm Send
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {printingTeamItems.length === 0 && (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
              No products queued for this order yet
            </Text>
          )}
          {printingTeamItems.filter((i) => i.isEmergencyProduct).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 12px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                <AlertFilled style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>Emergency Products</Text>
                <Tag color="error">{printingTeamItems.filter((i) => i.isEmergencyProduct).length}</Tag>
              </div>
              <Table
                dataSource={printingTeamItems.filter((i) => i.isEmergencyProduct)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Priority', key: 'urgentStatus', render: () => <Tag icon={<AlertFilled />} color="error">Emergency</Tag> },
                ]}
              />
            </div>
          )}
          {printingTeamItems.filter((i) => !i.isEmergencyProduct).length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong>Regular Products</Text>
                <Tag>{printingTeamItems.filter((i) => !i.isEmergencyProduct).length}</Tag>
              </div>
              <Table
                dataSource={printingTeamItems.filter((i) => !i.isEmergencyProduct)}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Order', dataIndex: 'orderId', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                  { title: 'Hotel', dataIndex: 'hotelLogo' },
                  { title: 'Product', dataIndex: 'product' },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => (v || 0).toLocaleString() },
                  { title: 'Priority', key: 'pendingStatus', render: () => <Tag color="default">Regular</Tag> },
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
