import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
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
  GiftOutlined,
  MessageOutlined,
  PlusOutlined,
  PrinterOutlined,
  TeamOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
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
  useCreateStickerRequestMutation,
  useUploadStickerDesignMutation,
  useUpdateStickerStatusMutation,
  useGetTasksQuery,
  useGetPackingConfigQuery,
  useGetTaskTimeConfigsQuery,
} from '../../store/api/apiSlice';
import { estimateSecFor, secToHuman, perUnitLabel } from '../../utils/taskTime';
import { computeRecordGrandTotal } from '../../utils/orderCalc';
import {
  buildProductionQueues,
  canAssignTaskFromChecks,
  DESIGN_FLOW,
  designColor,
  FLOW_STAGES,
  getCheckStateMap,
  getFlowStep,
  getProgressFromChecks,
  inferItemLogoType,
  normYNOps,
  ORDER_CATEGORY_META,
  PAYMENT_LABELS,
  packTabFromString,
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
  const [kitPackingForm] = Form.useForm();
  const { data: ordersData, isLoading: ordersLoading } = useGetOperationOrdersQuery({ limit: 500 });
  const { data: stickerData } = useGetStickerRequestsQuery();
  const stickerRequests = stickerData?.data || [];
  const { data: invData } = useGetItemsQuery({ limit: 1000 });
  const { data: printingVendorData } = useGetVendorsQuery({ type: 'printing' });
  const { data: packingConfigRaw } = useGetPackingConfigQuery();
  const { data: timeConfigData } = useGetTaskTimeConfigsQuery();
  const timeConfigs = useMemo(() => timeConfigData?.data || [], [timeConfigData]);
  const configTaskNameOptions = useMemo(() => {
    const seen = new Set();
    return timeConfigs.filter((c) => c.taskName && !seen.has(c.taskName) && seen.add(c.taskName))
      .map((c) => ({ value: c.taskName, label: c.taskName }));
  }, [timeConfigs]);
  // displayUnit name → Operations tab mapping (for per-kit routing).
  const displayUnitTabMap = useMemo(() => {
    const entries = (packingConfigRaw?.data || []).filter((c) => c.type === 'displayUnit');
    return Object.fromEntries(entries.map((c) => [c.value, c.tabMapping || '']));
  }, [packingConfigRaw]);

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
      butter_paper: vendors
        .filter((v) => v.supplierType === 'Butter Paper')
        .map((v) => ({ value: v._id, label: v.name })),
    };
  }, [printingVendorData]);
  const invMap = useMemo(() => {
    const m = {};
    (invData?.data || []).forEach((i) => { m[i.itemName] = i; });
    return m;
  }, [invData]);
  // Resolve the MongoDB _id for this order so the task query uses the correct ObjectId filter.
  const orderMongoId = useMemo(
    () => (ordersData?.data || []).find((o) => o.orderCode === id || o._id === id)?._id || null,
    [ordersData, id]
  );
  // Fetch existing tasks for this order to detect already-assigned products
  const { data: orderTasksData } = useGetTasksQuery({ orderId: orderMongoId }, { skip: !orderMongoId });
  // Set of productIndex values that already have tasks on this order
  const taskedProductIndices = useMemo(() => {
    const tasks = orderTasksData?.data || [];
    const set = new Set();
    tasks.forEach((t) => {
      if (t.productIndex !== undefined && t.productIndex !== null) set.add(t.productIndex);
    });
    return set;
  }, [orderTasksData]);
  // Set of product names (lowercase) that already have tasks (fallback when no productIndex)
  const taskedProductNames = useMemo(() => {
    const tasks = orderTasksData?.data || [];
    return new Set(tasks.filter((t) => t.product).map((t) => (t.product || '').toLowerCase()));
  }, [orderTasksData]);

  // Kit Packing task state
  const kitPackingTask = useMemo(
    () => (orderTasksData?.data || []).find((t) => t.taskType === 'Kit Packing') || null,
    [orderTasksData]
  );
  const productTasks = useMemo(
    () => (orderTasksData?.data || []).filter((t) => t.taskType !== 'Kit Packing'),
    [orderTasksData]
  );
  const allProductTasksDone = useMemo(
    () => productTasks.length > 0 && productTasks.every((t) => t.status === 'Done'),
    [productTasks]
  );

  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [assignTask] = useAssignTaskMutation();
  const [assignTasksPerProduct] = useAssignTasksPerProductMutation();
  const [splitPartialDelivery] = useSplitPartialDeliveryMutation();
  const [saveHotelDesign] = useSaveHotelDesignMutation();
  const [sendToStickerTeam] = useSendToStickerTeamMutation();
  const [approveStickerRequest] = useApproveStickerRequestMutation();
  const [createStickerRequest] = useCreateStickerRequestMutation();
  const [uploadStickerDesign] = useUploadStickerDesignMutation();
  const [updateStickerStatus] = useUpdateStickerStatusMutation();
  // Kit display-unit packaging approval design file (optional)
  const [duDesignFile, setDuDesignFile] = useState(null);

  const allOrders = useMemo(() => (ordersData?.data || []).map((o) => ({
    key: o._id, id: o.orderCode || o._id,
    hotelName: o.clientName || '-',
    hotelLogo: o.clientName || '-', salesPerson: o.salesPerson || o.assignedTo?.fullName || '-',
    createdAt: o.createdAt, orderType: o.orderType || 'Sticker',
    clientApproval: o.clientApproval || 'Waiting',
    designStatus: o.designStatus || 'Not Started',
    printingStatus: o.printingStatus || 'Not Started',
    stockStatus: o.stockStatus || 'Not Received',
    operationStage: o.operationStage || '', taskStatus: o.taskStatus || 'Pending',
    assignedEmployee: o.assignedTo?.fullName || '', printerSentTotal: o.printerSentTotal || 0,
    printerVerified: o.printerVerified || false, inventoryStock: o.inventoryStock || 0,
    orderReceivedStock: o.orderReceivedStock || 0, notifications: o.notifications || [],
    specsSummary: o.specsSummary || '', paymentTerms: o.paymentTerms || o.leadId?.paymentTerms || '',
    paymentReminderDate: o.paymentReminderDate,
    totalAmount: (() => {
      const prods = o.products?.length ? o.products : (o.leadId?.products || []);
      const kitAware = computeRecordGrandTotal({ ...o, products: prods });
      return kitAware > 0 ? kitAware : (Number(o.total) || 0);
    })(),
    advance: o.advancePaidAmount ?? o.advancePaid ?? 0,
    paidAmount: (() => {
      const backendPaid = Number(o.paidAmount) || 0;
      const collTotal = (o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0);
      const adv = o.advancePaidAmount ?? o.advancePaid ?? 0;
      return backendPaid > 0 ? backendPaid : (collTotal > 0 ? collTotal : adv);
    })(),
    // Use the backend-stored balance (updated by Sales payment flow) as authoritative;
    // fall back to null so the render knows to compute it when absent.
    storedBalance: o.balance != null ? Number(o.balance) : null,
    expectedDelivery: o.expectedDeliveryDate
      ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10)
      : o.expectedDelivery
      || (o.leadId?.orderDeliveryDate
        ? new Date(o.leadId.orderDeliveryDate).toISOString().slice(0, 10)
        : null),
    isUrgent: o.isUrgent || o.leadId?.isUrgent || false,
    splitDates: (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []),
    // Fall back to o.products when items is empty (legacy / sample orders that only stored products)
    items: (() => {
      // Per-kit display-unit map (by kitId) so each kit in a multi-kit order routes to its OWN tab.
      const kitOrdersList = ((o.kitOrders?.length ? o.kitOrders : (o.leadId?.kitOrders || [])) || []).filter(Boolean);
      const kitCfgById = Object.fromEntries(kitOrdersList.filter((k) => k.kitId).map((k) => [k.kitId, k]));
      // Enrich each item from the lead-sourced order.products (full kit flag/category/displayUnit/
      // specs) — order.items (from the negotiation) can drop some of those. See index.jsx for detail.
      const leadProducts = (o.products?.length ? o.products : (o.leadId?.products || [])) || [];
      const prodKey = (p) => `${p?.kitId || ''}|${String(p?.name || p?.itemName || '').trim().toLowerCase()}`;
      const productByKey = {};
      leadProducts.forEach((p) => { const k = prodKey(p); if (p && !(k in productByKey)) productByKey[k] = p; });
      const rawItems = (o.items?.length ? o.items : leadProducts);
      // Items packed inside a personalized outer (packagingIncludes) read as Separate Kit/Product.
      const ptArr = Array.isArray(o.productType) ? o.productType : (o.productType ? [o.productType] : []);
      const isPersonalizedOrder = ptArr.includes('personalized') || ptArr.includes('PERSONALIZED_KIT');
      const includesList = (o.packagingIncludes?.length ? o.packagingIncludes : (o.leadId?.packagingIncludes || [])) || [];
      const includeSet = new Set(includesList.map(String));
      return rawItems.map((rawIt, idx) => {
        const prod = (o.items?.length && leadProducts[idx] && prodKey(leadProducts[idx]) === prodKey(rawIt))
          ? leadProducts[idx]
          : (productByKey[prodKey(rawIt)] || {});
        const it = {
          ...prod, ...rawIt,
          isKit: rawIt.isKit || prod.isKit || false,
          kitId: rawIt.kitId || prod.kitId || '',
          kitName: rawIt.kitName || prod.kitName || '',
          kitType: rawIt.kitType || prod.kitType || '',
          category: rawIt.category || prod.category || '',
          displayUnit: rawIt.displayUnit || prod.displayUnit || '',
          size: rawIt.size || prod.size || '',
          sticker: rawIt.sticker || prod.sticker || '',
          printing: rawIt.printing || prod.printing || '',
          packingMaterial: rawIt.packingMaterial || rawIt.packaging || prod.packingMaterial || prod.packaging || '',
        };
        const isKitItem = !!(it.isKit || it.kitType);
        const kitCfg = isKitItem
          ? (kitCfgById[it.kitId] || (kitOrdersList.length === 1 ? kitOrdersList[0] : null))
          : null;
        // Kit items fall back to the kit-level sticker/printing entered in the per-kit Order Details card.
        const sticker = normYNOps(it.sticker || it.stickerPrinting || (isKitItem ? kitCfg?.sticker : ''));
        const printing = normYNOps(it.printing || (isKitItem ? kitCfg?.printing : ''));
        const pmRaw = it.packingMaterial || it.packaging || '';
        const packingMaterialTab = it.packingMaterialTab || packTabFromString(pmRaw);
        // Kit composition category: the per-kit Order Details config (kitOrders[i].category) is the
        // source of truth; the item row's own category can be stale. Computed first because the
        // display-unit fallback below depends on it.
        const isIncludedInPersonalized = isPersonalizedOrder
          && (includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName)));
        const itemCategory = isIncludedInPersonalized
          ? (isKitItem ? 'separate_kit' : 'separate_product')
          : ((isKitItem && kitCfg?.category) ? kitCfg.category : it.category);
        // Per-kit display unit → its own Operations tab. Priority: per-item → per-kit config →
        // order/lead top-level display unit (fallback for ANY kit when no per-kit value exists).
        // Per-kit value is authoritative (multi-kit different display units route independently);
        // the order-level fallback keeps separate kits — whose only display unit is order-level —
        // from dropping out of the design tabs / spec table.
        const orderLevelDU = o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '';
        const itemDisplayUnit = isKitItem
          ? (it.displayUnit || kitCfg?.displayUnit || orderLevelDU || '')
          : (it.displayUnit || '');
        const itemDisplayUnitTab = (isKitItem && itemDisplayUnit)
          ? (it.displayUnitTab || displayUnitTabMap[itemDisplayUnit] || packTabFromString(itemDisplayUnit))
          : (it.displayUnitTab || '');
        const logoType = inferItemLogoType(sticker, printing, pmRaw, packingMaterialTab, it.logoType);
        const logo = normYNOps(it.logo || (isKitItem ? kitCfg?.logo : ''));
        const displayUnitType = it.displayUnitType || (isKitItem ? kitCfg?.displayUnitType : '') || '';
        // Effective Required Qty: a kit line stores its count in `overallQty` (the number of kits),
        // while `qty` is just 1 (one kit unit) — so kit rows must report overallQty, not qty.
        // Separate products keep their own qty. Falls back through item → kit-config → qty.
        const kitOverallQty = isKitItem
          ? (Number(it.overallQty) || Number(kitCfg?.overallQty) || Number(o.kitOverallQty) || 0)
          : 0;
        const requiredQty = isKitItem
          ? (kitOverallQty || Number(it.qty) || 0)
          : (Number(it.qty) || 0);
        return { ...it, itemName: it.itemName || it.name, key: it._id ? String(it._id) : String(idx), sticker, logo, printing, packingMaterialTab, displayUnit: itemDisplayUnit, displayUnitType, displayUnitTab: itemDisplayUnitTab, logoType, category: itemCategory, isIncludedInPersonalized, requiredQty };
      });
    })(),
    readiness: o.readiness || {},
    // Partial-delivery tracking — needed for the partial tag + split modal below.
    qty: o.qty || (o.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0),
    deliveryType: o.deliveryType || '',
    partialQty: o.partialQty || 0,
    balanceQty: o.balanceQty || 0,
    partialDeliveries: o.partialDeliveries || [],
    location: o.location || o.leadId?.location || o.leadId?.locationCity || '',
    phone: o.clientPhone || o.phone || o.leadId?.phone || '',
    email: o.email || o.leadId?.email || '',
    contactPerson: o.contactPerson || o.leadId?.contactPerson || '',
    alternativeName: o.alternativeName || o.leadId?.alternativeName || '',
    alternativeRole: o.alternativeRole || o.leadId?.alternativeRole || '',
    alternativePhone: o.alternativePhone || o.leadId?.alternativePhone || '',
    billingName: o.billingName || o.leadId?.billingName || o.clientName || '',
    gstNumber: o.gstNumber || o.leadId?.gstNumber || '',
    gstPercent: o.gstPercent ?? o.leadId?.gstPercent,
    salesPerson: o.salesPerson || o.assignedTo?.fullName || o.leadId?.salesPerson || '',
    orderCategory: (o.orderCategory === 'SAMPLE' || o.leadId?.leadType === 'SAMPLE') ? 'SAMPLE' : (o.orderCategory || 'ORDER'),
    billType: o.billType || o.type || o.leadId?.billType || 'GST',
    deliveryBy: o.deliveryBy || o.leadId?.deliveryBy || '',
    transportationBy: o.transportationBy || o.leadId?.transportationBy || '',
    forwardingCharge: o.forwardingCharge ?? o.leadId?.forwardingCharge ?? false,
    forwardingChargeAmount: o.forwardingChargeAmount ?? o.leadId?.forwardingChargeAmount ?? 0,
    destination: o.destination || o.leadId?.destination || '',
    hotelType: o.hotelType || o.leadId?.hotelType || '',
    rooms: o.rooms ?? o.leadId?.rooms,
    occupancy: o.occupancy ?? o.leadId?.occupancy,
    city: o.city || o.leadId?.city || '',
    state: o.state || o.leadId?.state || '',
    pincode: o.pincode || o.leadId?.pincode || '',
    detailedAddress: o.detailedAddress || o.leadId?.detailedAddress || '',
    kitDisplayUnit: o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '',
    kitDisplayUnitType: o.kitDisplayUnitType || (Array.isArray(o.kitOrders) && o.kitOrders[0]?.displayUnitType) || o.leadId?.kitDisplayUnitType || (Array.isArray(o.leadId?.kitOrders) && o.leadId?.kitOrders[0]?.displayUnitType) || '',
    kitSticker: o.kitSticker || o.leadId?.kitSticker || '',
    kitLogo: o.kitLogo || o.leadId?.kitLogo || '',
    kitPrinting: o.kitPrinting || o.leadId?.kitPrinting || '',
    kitSize: o.kitSize || o.leadId?.kitSize || '',
    selectedKits: o.selectedKits || o.leadId?.selectedKits || [],
    kitOrders: o.kitOrders || o.leadId?.kitOrders || [],
    displayUnitTab: o.displayUnitTab || o.leadId?.displayUnitTab || '',
    logoRequired: o.logoRequired || o.leadId?.logoNeeded || false,
    logoUrl: o.logoUrl || o.leadId?.hotelLogoUrl || '',
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
  })), [ordersData, displayUnitTabMap]);
  const checkStates = useMemo(() => getCheckStateMap(allOrders), [allOrders]);
  const productionQueues = useMemo(() => buildProductionQueues(allOrders, stickerRequests), [allOrders, stickerRequests]);
  const [taskOptions, setTaskOptions] = useState(['Packing', 'Labeling', 'Filling']);
  const [newTaskValue, setNewTaskValue] = useState('');
  const [printingValues, setPrintingValues] = useState({});
  const [printingVendors, setPrintingVendors] = useState({});
  const [printingStatusValues, setPrintingStatusValues] = useState({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalRecord, setAssignModalRecord] = useState(null);
  const [printingModalOpen, setPrintingModalOpen] = useState(false);
  const [printingModalType, setPrintingModalType] = useState(null);
  const [subTasks, setSubTasks] = useState([]);
  const [taskRequiredQty, setTaskRequiredQty] = useState(0);
  const inputRef = useRef(null);

  const openAssignModal = (record, currentOrder) => {
    setAssignModalRecord(record);
    setTaskRequiredQty(record.requiredQty != null ? record.requiredQty : (record.qty || 0));
    setSubTasks([{ id: Date.now(), description: '', qty: '', assignee: '' }]);
    assignModalForm.setFieldsValue({
      taskName: record.processTask || '',
      taskType: '',
      orderId: currentOrder.id,
      product: record.itemName || record.name || record.product || '',
      printing: printingValues[record.key] || undefined,
      assignee: loggedInUser?.name || currentOrder.assignedEmployee,
      // Auto-fetch the start time from the assignment time (now).
      taskStartTime: dayjs(),
    });
    setAssignModalOpen(true);
  };

  const submitAssignTask = async () => {
    let vals;
    try {
      vals = await assignModalForm.validateFields();
    } catch { return; }

    // Validate sub-task rows: each row must have description and assignee
    const filledSubTasks = subTasks.filter((t) => t.description || t.qty || t.assignee);
    if (filledSubTasks.length === 0) {
      enqueueSnackbar('Please add at least one sub-task with a description and assignee', { variant: 'warning' });
      return;
    }
    const invalidSubTask = filledSubTasks.find((t) => !t.description || !t.assignee);
    if (invalidSubTask) {
      enqueueSnackbar('Each sub-task must have a description and an assignee', { variant: 'warning' });
      return;
    }

    // Resolve numeric productIndex: find this record's position in order.items
    const productIndex = (order?.items || []).findIndex(
      (it) => String(it.key) === String(assignModalRecord?.key)
    );

    const cleanSubTasks = filledSubTasks
      .map((t) => ({ label: t.description, qty: Number(t.qty) || 0, assigneeName: t.assignee }));
    // Planned start/end as full datetimes (today + picked time) for the estimate window.
    const plannedStartTime = vals.taskStartTime ? vals.taskStartTime.toISOString() : dayjs().toISOString();
    const plannedEndTime = vals.taskEndTime ? vals.taskEndTime.toISOString() : undefined;
    const payload = {
      orderId: order?.key || order?._id || id,
      taskName: vals.taskName,
      taskType: vals.taskType,
      product: vals.product,
      productIndex: productIndex >= 0 ? productIndex : undefined,
      printingType: vals.printing,
      qty: taskRequiredQty,
      assigneeName: vals.assignee,
      clientName: order?.hotelName || order?.clientName,
      subTasks: cleanSubTasks,
      status: 'Pending',
      taskStartTime: vals.taskStartTime ? vals.taskStartTime.format('HH:mm') : undefined,
      taskEndTime: vals.taskEndTime ? vals.taskEndTime.format('HH:mm') : undefined,
      // Time management — server recomputes the estimate from config when available.
      plannedStartTime,
      plannedEndTime,
      ...(assignEstimate.matched ? {
        timePerUnitSec: assignEstimate.perUnitSec,
        estimatedDurationSec: assignEstimate.estimatedSec,
      } : {}),
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
      butter_paper: productionQueues.butter,
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
  const isKitOrder = !!(order?.kitDisplayUnit) ||
    (Array.isArray(order?.productType) ? order.productType : (order?.productType ? [order.productType] : []))
      .some(v => ['personalized', 'separate_kit', 'PERSONALIZED_KIT'].includes(v)) ||
    (Array.isArray(order?.selectedKits) && order.selectedKits.length > 0) ||
    (order?.items || []).some(it => it.isKit || it.kitType);

  // Approved designs for this hotel (reuse in future orders).
  const { data: hotelDesignsRaw } = useGetHotelDesignsQuery(
    { hotelName: order?.hotelLogo },
    { skip: !order?.hotelLogo }
  );
  const hotelDesigns = hotelDesignsRaw?.data || [];

  // Build map: lowercase productName → { date, qty } from splitDates.
  // qty is the emergency delivery quantity; if not specified, null means all items of that name are emergency.
  // When product is '__kit__', expands to all kit items proportionally by kit count.
  const emergencyProductMap = useMemo(() => {
    const map = {};

    const expandKit = (kitEmergencyQty, sdDate) => {
      const kitItems = (order?.items || []).filter((it) => it.isKit || it.kitType);
      if (kitItems.length === 0) return;
      if (kitEmergencyQty === null) {
        kitItems.forEach((it) => {
          const key = (it.product || it.itemName || '').toLowerCase();
          if (key && !map[key]) map[key] = { date: sdDate, qty: null };
        });
        return;
      }
      const itemQtys = kitItems.map((it) => Number(it.qty) || 0).filter((q) => q > 0);
      if (itemQtys.length === 0) return;
      const totalKits = Math.min(...itemQtys);
      kitItems.forEach((it) => {
        const key = (it.product || it.itemName || '').toLowerCase();
        if (!key || map[key]) return;
        const itemQty = Number(it.qty) || 0;
        const pQty = Math.min(Math.round((kitEmergencyQty / totalKits) * itemQty), itemQty);
        map[key] = { date: sdDate, qty: pQty };
      });
    };

    (order?.splitDates || []).forEach((sd) => {
      const sdDate = sd.date || null;
      (sd.products || []).forEach((ep) => {
        if (!ep.product) return;
        if (ep.product === '__kit__') {
          expandKit(ep.qty != null ? Number(ep.qty) : null, sdDate);
        } else {
          const key = ep.product.toLowerCase();
          if (!map[key] || (sdDate && sdDate < map[key].date)) {
            map[key] = { date: sdDate, qty: ep.qty != null ? Number(ep.qty) : null };
          }
        }
      });
      if (sd.product) {
        if (sd.product === '__kit__') {
          expandKit(sd.qty != null ? Number(sd.qty) : null, sdDate);
        } else {
          const key = sd.product.toLowerCase();
          if (!map[key] || (sdDate && sdDate < map[key].date)) {
            map[key] = { date: sdDate, qty: sd.qty != null ? Number(sd.qty) : null };
          }
        }
      }
    });
    return map;
  }, [order?.splitDates, order?.items]);

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
      .filter((sr) => {
        const srOrderId = String(sr.orderId?._id || sr.orderId || '');
        return srOrderId === String(order?.key || '') || sr.orderId?.orderCode === id;
      })
      .forEach((sr) => {
        const key = (sr.product || sr.hotelLogo || '').toLowerCase();
        // Plain key (legacy) + category-scoped key, so a product that has SEPARATE approvals for
        // its Separate-Kit row and its Personalized-packing row resolves the correct one by category.
        if (key) { if (!(key in map)) map[key] = sr; map[`${key}|${sr.category || ''}`] = sr; }
      });
    return map;
  }, [stickerRequests, order?.key, id]);
  // Resolve the design/sticker request for a spec-table row, preferring its own category.
  const srForRow = (record) => {
    const name = (record.itemName || record.name || record.product || '').toLowerCase();
    return stickerRequestMap[`${name}|${record.category || ''}`] || stickerRequestMap[name];
  };

  // Kit-level SR list (for SRs where product='Kit'). We keep EVERY kit SR — not just one per
  // display-unit tab — because a Personalized Kit and a Separate Kit can both route to the same
  // tab (e.g. Box) yet each carries its OWN approval (distinct category/kitType). Collapsing by
  // stickerType made the later one overwrite the earlier; resolveKitSR now picks the right one.
  const kitSRList = useMemo(() => {
    return stickerRequests.filter((sr) => {
      const srOrderId = String(sr.orderId?._id || sr.orderId || '');
      return (srOrderId === String(order?.key || '') || sr.orderId?.orderCode === id)
        && (sr.product || '').toLowerCase() === 'kit';
    });
  }, [stickerRequests, order?.key, id]);

  // The outer personalized-packaging approval (category='personalized'). In a MIXED order
  // (personalized outer + separate kits inside), the inner items read as Separate Kit/Product, so
  // NO spec-table row carries category='personalized' — without this the personalized approval would
  // never surface. We pull it out separately and pin it to the first personalized-included row below.
  const personalizedKitSR = useMemo(
    () => kitSRList.find((sr) => (sr.category || '') === 'personalized') || null,
    [kitSRList],
  );
  // First item that is packed inside the personalized outer — the row we attach the personalized
  // approval block to (so it shows once, alongside that row's own Separate-Kit approval).
  const firstPersonalizedRowKey = useMemo(() => {
    const r = (order?.items || []).find((it) => it.isIncludedInPersonalized);
    return r ? String(r.key) : null;
  }, [order?.items]);

  // Kit display-unit packaging approval (one per kit order, stickerType='Display Unit').
  // Distinct from the per-product sticker design approval — this is the final sign-off on
  // the kit's display unit (Box/Ziplock packaging) by both Sales and Operations.
  const displayUnitSR = useMemo(() => {
    return stickerRequests.find((sr) => {
      const srOrderId = String(sr.orderId?._id || sr.orderId || '');
      const matchOrder = srOrderId === String(order?.key || '') || sr.orderId?.orderCode === id;
      return matchOrder && sr.stickerType === 'Display Unit';
    }) || null;
  }, [stickerRequests, order?.key, id]);
  const displayUnitApproved = !!(displayUnitSR?.salesApproved && displayUnitSR?.opsHeadApproved);

  // Send the kit's display unit (Box/Ziplock packaging) for dual Sales + Ops approval.
  // Creates the 'Display Unit' StickerRequest on first send and attaches an optional design file.
  const sendDisplayUnitForApproval = async () => {
    if (!order) return;
    try {
      let srId = displayUnitSR?._id;
      if (!srId) {
        const kitTypeForDU = (order.kitOrders || []).map((ko) => ko.kitName || ko.kitType).filter(Boolean).join(', ')
          || (order.kitDisplayUnit ? `${order.kitDisplayUnit} Kit` : 'Personalized Kit');
        const kitProductsForDU = (order.items || [])
          .filter((it) => it.isKit || it.kitType)
          .map((it) => it.itemName || it.name || '')
          .filter(Boolean);
        const created = await createStickerRequest({
          orderId: order.key,
          hotelLogo: order.hotelLogo || order.clientName,
          product: order.kitDisplayUnit || 'Kit Display Unit',
          stickerType: 'Display Unit',
          quantity: order.qty || 0,
          stickerSize: order.kitSize || order.size || '',
          kitType: kitTypeForDU,
          kitProducts: kitProductsForDU,
        }).unwrap();
        srId = created.data._id;
      }
      if (duDesignFile) {
        await uploadStickerDesign({ id: srId, files: [duDesignFile] }).unwrap();
      }
      await updateStickerStatus({ id: srId, status: 'Waiting for Approval' }).unwrap();
      setDuDesignFile(null);
      enqueueSnackbar('Display unit sent for approval — Sales & Operations team notified', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to send display unit for approval', { variant: 'error' });
    }
  };

  // Annotate every item with isEmergencyProduct / isEmergencyGated flags — mirrors the
  // Sticker/Box queue treatment so Overview shows the same status indicators.
  // When the splitDate specifies a partial qty (emergencyQty < itemQty), the item is split
  // into two rows: an emergency row (qty=emergencyQty) and a remaining row (qty=itemQty-emergencyQty).
  const visibleOrderItems = useMemo(() => {
    const hasEmergency = Object.keys(emergencyProductMap).length > 0;
    return sortedOrderItems.flatMap((item) => {
      const name = (item.product || item.itemName || '').toLowerCase();
      const emergencyInfo = emergencyProductMap[name];
      if (hasEmergency && emergencyInfo) {
        const eQty = emergencyInfo.qty;
        const itemQty = Number(item.qty) || 0;
        if (eQty != null && itemQty > eQty) {
          // Partial emergency: split into emergency qty + remaining qty
          return [
            { ...item, key: `${item.key}-emg`, qty: eQty, requiredQty: eQty, lineTotal: null, isEmergencyProduct: true, isEmergencyGated: false },
            { ...item, key: `${item.key}-rem`, qty: itemQty - eQty, requiredQty: itemQty - eQty, lineTotal: null, isEmergencyProduct: false, isEmergencyGated: !emergencyPhaseDone },
          ];
        }
        return [{ ...item, isEmergencyProduct: true, isEmergencyGated: false }];
      }
      return [{ ...item, isEmergencyProduct: false, isEmergencyGated: hasEmergency && !emergencyPhaseDone }];
    });
  }, [sortedOrderItems, emergencyPhaseDone, emergencyProductMap]);

  // Per-product task fan-out: one task per order line item in a single click.
  const handleAssignAllProducts = async () => {
    if (!order) return;
    try {
      const res = await assignTasksPerProduct({ orderId: order.key, taskType: 'Production' }).unwrap();
      if (res.skippedProducts?.length) {
        enqueueSnackbar(
          `Created ${res.total} task(s). Already assigned (skipped): ${res.skippedProducts.join(', ')}`,
          { variant: 'warning' }
        );
      } else {
        enqueueSnackbar(`Created ${res.total || res.data?.length || 0} product task(s)`, { variant: 'success' });
      }
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign tasks', { variant: 'error' });
    }
  };

  // Partial-delivery split: record a partial qty; the balance becomes a follow-on entry.
  const [kitPackingModalOpen, setKitPackingModalOpen] = useState(false);
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

  const submitKitPackingTask = async () => {
    let vals;
    try { vals = await kitPackingForm.validateFields(); } catch { return; }
    const totalQty = (order?.items || []).reduce((s, it) => s + (it.qty || 0), 0);
    const payload = {
      orderId: order?.key,
      taskName: vals.taskName || `Kit Packing — ${order?.kitDisplayUnit}`,
      taskType: 'Kit Packing',
      product: order?.kitDisplayUnit || 'Kit',
      qty: totalQty,
      assigneeName: vals.assignee,
      clientName: order?.hotelName,
      description: vals.description,
      status: 'Pending',
    };
    try {
      await assignTask(payload).unwrap();
      enqueueSnackbar('Kit Packing task assigned', { variant: 'success' });
      setKitPackingModalOpen(false);
      kitPackingForm.resetFields();
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign Kit Packing task', { variant: 'error' });
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

  // Live estimate for the Assign-Task modal: matches the entered task against the Time
  // Management config and multiplies the per-unit time by the required qty. Declared
  // here (before the early returns below) to satisfy the rules of hooks.
  const assignTaskNameWatch = Form.useWatch('taskName', assignModalForm);
  const assignTaskTypeWatch = Form.useWatch('taskType', assignModalForm);
  const assignEstimate = useMemo(
    () => estimateSecFor(timeConfigs, { taskName: assignTaskNameWatch, taskType: assignTaskTypeWatch }, taskRequiredQty),
    [timeConfigs, assignTaskNameWatch, assignTaskTypeWatch, taskRequiredQty],
  );

  if (ordersLoading) {
    return <div className="page-container"><Text>Loading order…</Text></div>;
  }

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

  // Render saved per-product / per-kit attachments (uploaded in Sales) as image thumbnails
  // or file tags, each linking to its Cloudinary URL.
  const renderAttachmentLinks = (files) => {
    const list = (Array.isArray(files) ? files : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
    if (!list.length) return null;
    return (
      <Space wrap size={6}>
        {list.map((a, i) => {
          const url = typeof a === 'string' ? a : a.url;
          const nm = typeof a === 'string' ? (url.split('/').pop()) : (a.name || `File ${i + 1}`);
          const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(url || '');
          const isPdf = /\.pdf(\?|$)/i.test(url || '');
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer" title={nm} style={{ display: 'inline-block' }}>
              {isImg
                ? <img src={url} alt={nm} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)' }} />
                : <Tag icon={isPdf ? <FilePdfOutlined /> : <FileTextOutlined />} color="blue" style={{ borderRadius: 12, fontSize: 11, margin: 0, cursor: 'pointer' }}>{nm}</Tag>}
            </a>
          );
        })}
      </Space>
    );
  };

  // Resolve the Kit SR for a kit item based on its display-unit tab AND composition category/kit.
  // A Personalized Kit and a Separate Kit can share the same packaging tab (e.g. Box) but each has
  // its own approval — so match the row's category and kit type, not just the tab. Match precedence:
  // tab+category+kitType → tab+category → tab+kitType → tab → any. This keeps both approvals visible
  // side-by-side in the Ops Approval column instead of one replacing the other.
  const resolveKitSR = (record) => {
    if (!(record.isKit || record.kitType)) return null;
    const duTab = record.displayUnitTab || '';
    const st = duTab === 'Ziplock' ? 'Frosted Ziplock' : duTab === 'Butter Paper' ? 'Butter Paper' : 'Box';
    const cat = record.category || '';
    const kt = (record.kitName || record.kitType || '').toLowerCase();
    const sameTab = kitSRList.filter((sr) => (sr.stickerType || 'Box') === st);
    return sameTab.find((sr) => (sr.category || '') === cat && (sr.kitType || '').toLowerCase() === kt)
      || sameTab.find((sr) => (sr.category || '') === cat)
      || sameTab.find((sr) => (sr.kitType || '').toLowerCase() === kt)
      || sameTab[0]
      || null;
  };

  // Renders ONE kit-approval block (kit info + status / Ops-OK button) for the Ops Approval column.
  // Reused for a row's own kit approval AND — in a mixed personalized order — the outer personalized
  // packaging approval, so both can stack in the same cell without one overwriting the other.
  const renderKitApprovalBlock = (sr, { kitTypeName, catLabel, catColor, kitProductsList, isRepresentativeRow }) => {
    const kitInfoBlock = (
      <Space direction="vertical" size={3} style={{ maxWidth: 190 }}>
        <Space size={4} wrap>
          <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, fontWeight: 600, margin: 0 }}>{kitTypeName}</Tag>
          <Tag style={{ background: `${catColor}1a`, color: catColor, border: `1px solid ${catColor}55`, borderRadius: 10, fontSize: 10, fontWeight: 600, margin: 0 }}>{catLabel}</Tag>
        </Space>
        {kitProductsList.length > 0 && (
          <Space wrap size={3}>
            <Text type="secondary" style={{ fontSize: 10 }}>Includes:</Text>
            {kitProductsList.map((p, i) => (
              <Tag key={i} color="geekblue" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{p}</Tag>
            ))}
          </Space>
        )}
      </Space>
    );
    if (!sr) {
      return (
        <Space direction="vertical" size={4}>
          {kitInfoBlock}
          <Tag color="default" style={{ fontSize: 10 }}>
            {isRepresentativeRow ? 'Awaiting design' : 'Covered by kit approval'}
          </Tag>
        </Space>
      );
    }
    if (sr.opsHeadApproved) {
      return (
        <Space direction="vertical" size={4}>
          {kitInfoBlock}
          <Tooltip title={`Ops OK by ${sr.opsHeadApprovedBy?.fullName || 'Ops'} on ${sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'} — applies to all ${kitTypeName} products`}>
            <Tag color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 11, cursor: 'default' }}>
              Ops OK · {sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleDateString('en-IN') : ''}
            </Tag>
          </Tooltip>
          {sr.salesApproved && (
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 10, cursor: 'default' }}>Sales OK</Tag>
          )}
        </Space>
      );
    }
    return (
      <Space direction="vertical" size={4}>
        {kitInfoBlock}
        <Tag color="gold" style={{ fontSize: 10 }}>{sr.status || 'Waiting for Approval'}</Tag>
        {sr.salesApproved && (
          <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, fontSize: 10, cursor: 'default' }}>Sales OK</Tag>
        )}
        {!isRepresentativeRow ? (
          <Tooltip title={`Ops OK on the first kit row approves all ${kitProductsList.length} products in this kit`}>
            <Tag color="default" style={{ fontSize: 10 }}>Covered by kit approval</Tag>
          </Tooltip>
        ) : (
          <Tooltip title={`Approves entire ${catLabel} — ${kitTypeName} (${kitProductsList.length} product${kitProductsList.length !== 1 ? 's' : ''})`}>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff', borderRadius: 6 }}
              onClick={async () => {
                try {
                  const res = await approveStickerRequest({ id: sr._id, role: 'opsHead' }).unwrap();
                  enqueueSnackbar(
                    res?.data?.status === 'Approved'
                      ? `${kitTypeName} fully approved — printing can start!`
                      : `Ops OK recorded for ${kitTypeName} — awaiting Sales approval`,
                    { variant: 'success' },
                  );
                } catch (err) {
                  enqueueSnackbar(err?.data?.message || err?.data || 'Failed to approve', { variant: 'error' });
                }
              }}
            >
              Ops OK ({catLabel})
            </Button>
          </Tooltip>
        )}
      </Space>
    );
  };

  // Renders a single design thumbnail (image popover) or a View link for a design file URL.
  // Reused so the Design column can show BOTH a row's own design AND the outer personalized design.
  const designThumb = (url, isExisting) => {
    if (!url) return <Tag color="default" style={{ fontSize: 11 }}>No design yet</Tag>;
    const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
    if (isImage) {
      return (
        <Popover
          content={
            <div style={{ textAlign: 'center' }}>
              <img src={url} alt="design" style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }} />
              <div style={{ marginTop: 8 }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1890ff' }}>Open full size ↗</a>
              </div>
              {isExisting && (
                <div style={{ marginTop: 6 }}>
                  <Tag color="green" style={{ fontSize: 11 }}>♻ Previously approved design</Tag>
                </div>
              )}
            </div>
          }
          title={isExisting ? 'Existing Approved Design' : 'Uploaded Design'}
          trigger="click"
          placement="left"
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={url}
              alt="design"
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: `1px solid ${isExisting ? '#52c41a' : '#e0d0e8'}`, cursor: 'pointer' }}
            />
            {isExisting && (
              <div style={{ position: 'absolute', top: -4, right: -4, background: '#52c41a', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', border: '1px solid #fff' }}>♻</div>
            )}
          </div>
        </Popover>
      );
    }
    return (
      <Space direction="vertical" size={2}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#B11E6A', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <EyeOutlined style={{ fontSize: 12 }} /> View
        </a>
        {isExisting && <Tag color="green" style={{ fontSize: 10, margin: 0 }}>♻ Existing</Tag>}
      </Space>
    );
  };

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
              <Text strong style={isEmergencyProduct ? { color: '#ff4d4f' } : {}}>{name || '-'}</Text>
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
    {
      // Kit / Product Spec column — shows kit card for kit items; product spec card for
      // separate products (those with no kit). Both use the same visual style so every
      // row in the spec table has a rich, scannable summary.
      title: 'Kit / Spec',
      key: 'kitName',
      render: (_, record) => {
        const yn = (v) => String(v ?? '').trim().toUpperCase() === 'YES';
        const kitName = record.kitName || record.kitType;

        // ── SEPARATE PRODUCT (no kit) ─────────────────────────────────────────
        if (!kitName) {
          const pSize     = record.size || '';
          const pPacking  = record.packingMaterial || record.packaging || '';
          const pMat      = record.materialCategory || record.material || '';
          const pBrand    = record.brand || '';
          const pSticker  = record.sticker || '';
          const pLogo     = record.logo || '';
          const pPrinting = record.printing || '';
          const pSpec     = record.specification || record.specs || '';
          const pOther    = record.otherSpecs || '';
          // Dynamic product attributes (shape, fragrance, colour, etc.)
          const SKIP_PROD = new Set([
            'itemName','name','product','kitType','isKit','kitName','kitId','qty','rate','price',
            'gst','gstPercent','lineTotal','logoType','boxes','packaging','packingMaterial',
            'material','materialCategory','hsnCode','discountPercent','discount','logo','sticker',
            'brand','size','defaultSize','specs','displayType','itemId','_id','key','amount',
            'rateValue','total','inventoryStock','printing','stickerPrinting','isEmergencyProduct',
            'isEmergencyGated','productAttributes','attachments','category','displayUnit',
            'displayUnitType','displayUnitTab','packingMaterialTab','isIncludedInPersonalized',
            'specification','otherSpecs','kitIncludes','kitIncludesQty','isKit',
          ]);
          const recAttrs = (record.productAttributes && typeof record.productAttributes === 'object' && !Array.isArray(record.productAttributes))
            ? Object.entries(record.productAttributes).filter(([k, v]) => !SKIP_PROD.has(k) && v != null && v !== '' && typeof v !== 'object')
            : [];
          const flatAttrs = Object.entries(record).filter(([k, v]) => {
            if (SKIP_PROD.has(k)) return false;
            if (v == null || v === '') return false;
            if (typeof v === 'object') return false;
            return true;
          });
          const mergedAttrs = new Map([...recAttrs, ...flatAttrs]);
          const prettyKey = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
          const hasAny = pSize || pPacking || pMat || pBrand || pSticker || pLogo || pPrinting || pSpec || pOther || mergedAttrs.size > 0;
          if (!hasAny) return <Text type="secondary">—</Text>;
          return (
            <Space direction="vertical" size={3} style={{ minWidth: 130, paddingLeft: 6, borderLeft: '2px solid rgba(24,144,255,0.3)' }}>
              {pSize && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Size:</Text>
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>{pSize}</Tag>
                </Space>
              )}
              {pPacking && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Packing:</Text>
                  <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>{pPacking}</Tag>
                </Space>
              )}
              {pMat && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Material:</Text>
                  <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>{pMat}</Tag>
                </Space>
              )}
              {pBrand && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Brand:</Text>
                  <Tag style={{ fontSize: 10, margin: 0 }}>{pBrand}</Tag>
                </Space>
              )}
              {(pSticker || pLogo || pPrinting) && (
                <Space wrap size={3}>
                  {pSticker && <Tag color={yn(pSticker) ? 'green' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Sticker: {yn(pSticker) ? 'Yes' : 'No'}</Tag>}
                  {pLogo    && <Tag color={yn(pLogo)    ? 'cyan'  : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Logo: {yn(pLogo)    ? 'Yes' : 'No'}</Tag>}
                  {pPrinting && <Tag color={yn(pPrinting) ? 'blue' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Print: {yn(pPrinting) ? 'Yes' : 'No'}</Tag>}
                </Space>
              )}
              {mergedAttrs.size > 0 && (
                <Space wrap size={3}>
                  {[...mergedAttrs.entries()].map(([k, v]) => (
                    <Tag key={k} style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>
                      {prettyKey(k)}: {String(v)}
                    </Tag>
                  ))}
                </Space>
              )}
              {pSpec && (
                <Tooltip title={pSpec}>
                  <Text type="secondary" style={{ fontSize: 10, maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                    📝 {pSpec}
                  </Text>
                </Tooltip>
              )}
              {pOther && (
                <Tooltip title={pOther}>
                  <Text type="secondary" style={{ fontSize: 10, maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                    📎 {pOther}
                  </Text>
                </Tooltip>
              )}
            </Space>
          );
        }

        // ── KIT ITEM ──────────────────────────────────────────────────────────
        const kitOrdersList = order?.kitOrders || [];
        // Find this item's own kit config (match by kitId first, then by name)
        const ownKitCfg = kitOrdersList.find((ko) =>
          (record.kitId && ko.kitId === record.kitId)
          || (!record.kitId && (ko.kitName === kitName || ko.kitType === kitName))
        ) || null;

        // Use ONLY the own kit's displayUnit — do NOT fall back to record.displayUnit
        // because for items inside a personalized order, record.displayUnit carries
        // the outer container's DU (e.g. BOX) rather than the inner kit's own DU.
        const kDU       = ownKitCfg?.displayUnit || '';
        const kDUType   = ownKitCfg?.displayUnitType || '';
        const kSize     = ownKitCfg?.size || '';
        const kQty      = Number(ownKitCfg?.overallQty) || 0;
        const kSpec     = ownKitCfg?.specification || '';
        const kSticker  = ownKitCfg?.sticker || '';
        const kLogo     = ownKitCfg?.logo || '';
        const kPrinting = ownKitCfg?.printing || '';
        const kIncludes = Array.isArray(ownKitCfg?.kitIncludes) ? ownKitCfg.kitIncludes : [];
        const hasKitSpecs = kDU || kSize || kQty || kSticker || kLogo || kPrinting || kIncludes.length || kSpec;

        return (
          <Space direction="vertical" size={4} style={{ minWidth: 130 }}>
            <Tag color="purple" icon={<GiftOutlined />} style={{ margin: 0 }}>{kitName}</Tag>
            {hasKitSpecs && (
              <Space direction="vertical" size={3} style={{ paddingLeft: 6, borderLeft: '2px solid rgba(114,46,209,0.3)', marginTop: 2 }}>
                {kDU && (
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Display Unit:</Text>
                    <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>{String(kDU).replace(/_/g, ' ')}</Tag>
                  </Space>
                )}
                {kDUType && (
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Type:</Text>
                    <Tag color="magenta" style={{ fontSize: 10, margin: 0 }}>{String(kDUType).replace(/_/g, ' ')}</Tag>
                  </Space>
                )}
                {kSize && (
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Size:</Text>
                    <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>{kSize}</Tag>
                  </Space>
                )}
                {kQty > 0 && (
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 10 }}>Kits:</Text>
                    <Text strong style={{ fontSize: 11 }}>{kQty}</Text>
                  </Space>
                )}
                {(kSticker || kLogo || kPrinting) && (
                  <Space wrap size={3}>
                    {kSticker  && <Tag color={yn(kSticker)  ? 'green' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Sticker: {yn(kSticker)  ? 'Yes' : 'No'}</Tag>}
                    {kLogo     && <Tag color={yn(kLogo)     ? 'cyan'  : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Logo: {yn(kLogo)     ? 'Yes' : 'No'}</Tag>}
                    {kPrinting && <Tag color={yn(kPrinting) ? 'blue'  : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Print: {yn(kPrinting) ? 'Yes' : 'No'}</Tag>}
                  </Space>
                )}
                {kIncludes.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 9, display: 'block', marginBottom: 2 }}>Includes:</Text>
                    <Space wrap size={2}>
                      {kIncludes.map((v, i) => {
                        const id  = typeof v === 'object' ? (v.id ?? v) : v;
                        const qty = typeof v === 'object' ? v.qty : null;
                        return <Tag key={i} color="purple" style={{ fontSize: 9, margin: 0, borderRadius: 10 }}>{String(id)}{qty && Number(qty) > 1 ? ` ×${qty}` : ''}</Tag>;
                      })}
                    </Space>
                  </div>
                )}
                {kSpec && (
                  <Tooltip title={kSpec}>
                    <Text type="secondary" style={{ fontSize: 10, maxWidth: 150, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                      📝 {kSpec}
                    </Text>
                  </Tooltip>
                )}
              </Space>
            )}
          </Space>
        );
      },
    },
    {
      // Shown only when this item's kit is packed inside an outer personalized container.
      // IMPORTANT: the outer container (BOX, Ziplock, etc.) is stored at ORDER LEVEL —
      //   order.kitDisplayUnit, order.kitSize, order.kitLogo, order.kitPrinting, etc.
      // It is NOT a kitOrders entry. kitOrders entries are the INNER kits (e.g. Dental Kit
      // whose displayUnit is 'Butter paper pouch', category='personalized' for composition).
      // Looking up kitOrders.find(ko => ko.category==='personalized') would return the inner
      // Dental Kit and leak its 'Butter paper pouch' here — hence the bug. Use order-level only.
      title: 'Personalized Kit',
      key: 'personalizedKit',
      render: (_, record) => {
        if (!record.isIncludedInPersonalized) return <Text type="secondary">—</Text>;

        const yn = (v) => String(v ?? '').trim().toUpperCase() === 'YES';

        // Outer container display unit (e.g. 'BOX', 'Ziplock Pouch') is always order-level
        const pDU       = order?.kitDisplayUnit || '';
        const pDUType   = order?.kitDisplayUnitType
          || (Array.isArray(order?.kitOrders) && order.kitOrders[0]?.displayUnitType)
          || '';
        const pName     = pDU || 'Personalized Kit';
        const pSize     = order?.kitSize || '';
        const pSticker  = order?.kitSticker  || '';
        const pLogo     = order?.kitLogo     || '';
        const pPrinting = order?.kitPrinting || '';

        return (
          <Space direction="vertical" size={4} style={{ minWidth: 150 }}>
            {/* Outer container name — the order-level display unit type (e.g. BOX) */}
            <Tag color="magenta" icon={<GiftOutlined />} style={{ margin: 0 }}>{pName}</Tag>
            <Space direction="vertical" size={3} style={{ paddingLeft: 6, borderLeft: '2px solid rgba(235,47,150,0.3)', marginTop: 2 }}>
              {pDUType && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Type:</Text>
                  <Tag color="magenta" style={{ fontSize: 10, margin: 0 }}>{String(pDUType).replace(/_/g, ' ')}</Tag>
                </Space>
              )}
              {pSize && (
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 10 }}>Size:</Text>
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>{pSize}</Tag>
                </Space>
              )}
              {(pSticker || pLogo || pPrinting) && (
                <Space wrap size={3}>
                  {pSticker  && <Tag color={yn(pSticker)  ? 'green' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Sticker: {yn(pSticker)  ? 'Yes' : 'No'}</Tag>}
                  {pLogo     && <Tag color={yn(pLogo)     ? 'cyan'  : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Logo: {yn(pLogo)     ? 'Yes' : 'No'}</Tag>}
                  {pPrinting && <Tag color={yn(pPrinting) ? 'blue'  : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 10 }}>Print: {yn(pPrinting) ? 'Yes' : 'No'}</Tag>}
                </Space>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      // Composition category — Personalized / Separate Kit / Separate Product. Resolved from the
      // per-kit Order Details config during normalization, so personalized kits read correctly here.
      title: 'Category',
      key: 'category',
      render: (_, record) => {
        const isKitItem = !!(record.isKit || record.kitType);
        const cat = record.category || (isKitItem ? 'separate_kit' : 'separate_product');
        const meta = ORDER_CATEGORY_META[cat] || ORDER_CATEGORY_META.separate_product;
        return (
          <Tag style={{ background: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}55`, borderRadius: 12, fontSize: 11, fontWeight: 600, margin: 0 }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Inventory Stock',
      key: 'inventoryStock',
      align: 'right',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
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
      key: 'requiredQty',
      align: 'right',
      render: (_, record) => {
        // Kit rows report overallQty (the kit count) via requiredQty; products report their qty.
        const value = record.requiredQty != null ? record.requiredQty : (record.qty || 0);
        const name = record.itemName || record.name || record.kitType;
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
      title: 'HSN Code',
      key: 'hsnCode',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
        const inv = invMap[name];
        return record.hsnCode || record.itemId?.hsnCode || inv?.hsnCode || '-';
      },
    },
    {
      title: 'Default Size',
      key: 'defaultSize',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
        const inv = invMap[name];
        const sz = record.defaultSize || record.size || record.itemId?.defaultSize || inv?.defaultSize || inv?.size;
        return sz ? <Tag color="geekblue">{sz}</Tag> : '-';
      },
    },
    {
      title: 'Packing Material',
      key: 'packingMaterial',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
        const inv = invMap[name];
        return record.packingMaterial || record.packaging || record.itemId?.packingMaterial || inv?.packingMaterial || '-';
      },
    },
    {
      title: 'Material Category',
      key: 'materialCategory',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
        const inv = invMap[name];
        return record.materialCategory || record.material || record.itemId?.materialCategory || inv?.materialCategory || '-';
      },
    },
    {
      title: 'Brand',
      key: 'brand',
      render: (_, record) => {
        const name = record.itemName || record.name || record.kitType;
        const inv = invMap[name];
        return record.brand || record.itemId?.brand || inv?.brand || '-';
      },
    },
    {
      title: 'Product Attributes',
      key: 'productAttrs',
      render: (_, record) => {
        // Keys already displayed as dedicated columns OR structural (objects/arrays) — skip here.
        // 'specification' and 'otherSpecs' are kept here so we can render them explicitly below
        // with proper labels instead of tiny unlabeled chips.
        // 'packingMaterialTab' and 'displayUnitTab' are routing fields, not for display.
        // 'unit' is intentionally NOT skipped so it appears as a spec chip.
        const SKIP_KEYS = new Set([
          'itemName','name','kitType','isKit','kitName','kitId','qty','rate','price','gst','gstPercent',
          'lineTotal','logoType','boxes','packaging','packingMaterial','material','materialCategory',
          'hsnCode','discountPercent','discount','logo','sticker','brand','size','defaultSize',
          'specs','displayType','itemId','_id','key','amount','rateValue','total','inventoryStock',
          'printing','stickerPrinting','product','isEmergencyProduct','isEmergencyGated',
          'productAttributes','attachments','category','verified','overallQty','kitPrice','displayUnit',
          // Routing / computed fields — already shown in Display Unit column or not for display
          'packingMaterialTab','displayUnitTab',
          // Rendered as explicit labeled blocks below
          'specification','otherSpecs','kitIncludes','kitIncludesQty',
        ]);
        const attrs = Object.entries(record).filter(([k, v]) => {
          if (SKIP_KEYS.has(k)) return false;
          if (v == null || v === '') return false;
          if (typeof v === 'object') return false; // objects/arrays handled explicitly below
          return true;
        });
        // Inventory item's stored attribute defaults
        const invName = record.itemName || record.name || record.kitType;
        const inv = invMap[invName];
        const invAttrs = inv ? Object.entries(inv.productAttributes || {}).filter(([k, v]) => {
          if (SKIP_KEYS.has(k)) return false;
          return v != null && v !== '' && typeof v !== 'object';
        }) : [];
        // The item's OWN nested productAttributes ({ shape:'Round', fragrance:'Rose', … })
        const recAttrs = (record.productAttributes && typeof record.productAttributes === 'object' && !Array.isArray(record.productAttributes))
          ? Object.entries(record.productAttributes).filter(([k, v]) => !SKIP_KEYS.has(k) && v != null && v !== '' && typeof v !== 'object')
          : [];
        // Merge precedence: order-item flat attrs > its productAttributes > inventory defaults
        const merged = new Map([...invAttrs, ...recAttrs, ...attrs]);
        // Per-product reference files uploaded in Sales
        const atts = (Array.isArray(record.attachments) ? record.attachments : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
        // Explicit fields: kitIncludes, specification, otherSpecs
        const kitIncludesRaw = Array.isArray(record.kitIncludes) ? record.kitIncludes : [];
        const specification = record.specification || '';
        const otherSpecs = record.otherSpecs || '';

        const hasContent = merged.size > 0 || atts.length > 0 || kitIncludesRaw.length > 0 || specification || otherSpecs;
        if (!hasContent) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        const prettyKey = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
        return (
          <Space direction="vertical" size={6} style={{ maxWidth: 260 }}>
            {/* Dynamic key-value chips (includes 'unit' and all product-type-specific attrs) */}
            {merged.size > 0 && (
              <Space wrap size={3}>
                {[...merged.entries()].map(([k, v]) => (
                  <Tag key={k} style={{ fontSize: 10, borderRadius: 4, margin: 0, whiteSpace: 'normal' }}>
                    {prettyKey(k)}: {Array.isArray(v) ? v.join(', ') : String(v)}
                  </Tag>
                ))}
              </Space>
            )}
            {/* Kit includes — what items are packed inside this kit */}
            {kitIncludesRaw.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Included in Kit:</Text>
                <Space wrap size={3}>
                  {kitIncludesRaw.map((v, i) => {
                    const id = typeof v === 'object' ? (v.id ?? v) : v;
                    const qty = typeof v === 'object' ? v.qty : null;
                    return (
                      <Tag key={i} color="purple" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>
                        {String(id)}{qty && Number(qty) > 1 ? ` ×${qty}` : ''}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            )}
            {/* Per-product specification / instructions entered in Sales */}
            {specification && (
              <div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Specification:</Text>
                <Text style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{specification}</Text>
              </div>
            )}
            {/* Other free-text specs */}
            {otherSpecs && (
              <div>
                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Other Specs:</Text>
                <Text style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{otherSpecs}</Text>
              </div>
            )}
            {atts.length > 0 && renderAttachmentLinks(atts)}
          </Space>
        );
      },
    },
    {
      title: 'Printing Status',
      key: 'printingStatus',
      render: (_, record) => {
        const status = printingStatusValues[record.key];
        if (status === 'Closed') {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 6, padding: '2px 10px' }}>
              Closed
            </Tag>
          );
        }
        return (
          <Select
            value={status}
            placeholder="Select status"
            style={{ width: 140 }}
            onChange={(val) => {
              setPrintingStatusValues((prev) => ({ ...prev, [record.key]: val }));
              if (val === 'Closed') {
                openAssignModal(record, order);
              }
            }}
          >
            <Option value="Yet to Receive">Yet to Receive</Option>
            <Option value="Received">Received</Option>
            <Option value="Closed">Closed</Option>
          </Select>
        );
      },
    },
    {
      title: 'Design',
      key: 'design',
      width: 100,
      render: (_, record) => {
        const sr = resolveKitSR(record) || srForRow(record);
        // Fall back to existing hotel design when this order has no uploaded design yet
        const productName = (record.itemName || record.name || record.product || '').toLowerCase();
        const stickerType = record.packingMaterialTab === 'box' ? 'Box'
          : record.packingMaterialTab === 'frosted_ziplock' ? 'Frosted Ziplock'
          : record.packingMaterialTab === 'butter_paper' ? 'Butter Paper'
          : 'Sticker';
        const hdKey = `${(order.hotelLogo || '').toLowerCase()}-${productName}-${stickerType}`;
        const existingHD = hotelDesigns.find((d) =>
          `${(d.hotelName || '').toLowerCase()}-${(d.product || '').toLowerCase()}-${d.type || 'Sticker'}` === hdKey
        );
        const url = sr?.designFileUrl || existingHD?.designFileUrl;
        const isExisting = !sr?.designFileUrl && !!existingHD?.designFileUrl;
        const ownNode = designThumb(url, isExisting);

        // In a MIXED personalized order, also show the outer personalized-kit design (pinned to the
        // first personalized-included row) so BOTH the Separate Kit and Personalized Kit designs show.
        if (personalizedKitSR?.designFileUrl
          && record.isIncludedInPersonalized
          && String(record.key) === String(firstPersonalizedRowKey)
          && personalizedKitSR._id !== sr?._id) {
          return (
            <Space direction="vertical" size={8} style={{ width: '100%' }} split={<div style={{ borderTop: '1px dashed rgba(127,127,127,0.3)', width: '100%' }} />}>
              <Space direction="vertical" size={2}>
                <Tag color="purple" style={{ fontSize: 9, margin: 0, borderRadius: 8 }}>Personalized Kit</Tag>
                {designThumb(personalizedKitSR.designFileUrl, false)}
              </Space>
              <Space direction="vertical" size={2}>
                <Tag color="cyan" style={{ fontSize: 9, margin: 0, borderRadius: 8 }}>
                  {record.category === 'separate_kit' ? 'Separate Kit' : 'This Item'}
                </Tag>
                {ownNode}
              </Space>
            </Space>
          );
        }
        return ownNode;
      },
    },
    {
      title: 'Ops Approval',
      key: 'opsApproval',
      fixed: 'right',
      width: 200,
      render: (_, record) => {
        const isKitItem = !!(record.isKit || record.kitType);
        const sr = resolveKitSR(record) || srForRow(record);

        // The row's OWN approval cell (kit-level or per-product).
        const baseCell = (() => {
          if (isKitItem) {
            // Group by display-unit tab AND composition category AND kit identity — so a Personalized
            // Kit and a Separate Kit sharing the same tab (e.g. Box) each get their OWN representative
            // row + approval, instead of one being swallowed under "covered by kit approval".
            const kitDUTab = record.displayUnitTab || '';
            const recCat = record.category || '';
            const recKit = (record.kitName || record.kitType || '').toLowerCase();
            const kitItemsForSameKit = (order?.items || []).filter(
              (it) => (it.isKit || it.kitType)
                && (it.displayUnitTab || '') === kitDUTab
                && (it.category || '') === recCat
                && (it.kitName || it.kitType || '').toLowerCase() === recKit
            );
            // Composition label (Personalized Kit / Separate Kit) so the same packaging tab is told apart.
            const catLabel = record.category === 'personalized' ? 'Personalized Kit'
              : record.category === 'separate_kit' ? 'Separate Kit'
              : (ORDER_CATEGORY_META[record.category]?.label || 'Kit');
            const kitTypeName = sr?.kitType || record.kitName || record.kitType || catLabel;
            const kitProductsList = sr?.kitProducts?.length
              ? sr.kitProducts
              : kitItemsForSameKit.map((it) => it.itemName || it.name || '').filter(Boolean);
            const firstKitItemOfType = kitItemsForSameKit[0];
            const isRepresentativeRow = !firstKitItemOfType || String(firstKitItemOfType.key) === String(record.key);
            const catColor = ORDER_CATEGORY_META[record.category]?.color || '#7c3aed';
            return renderKitApprovalBlock(sr, { kitTypeName, catLabel, catColor, kitProductsList, isRepresentativeRow });
          }

          // Non-kit products — original behavior unchanged
          if (!sr) return <Tag color="default" style={{ fontSize: 11 }}>No design yet</Tag>;
          if (sr.opsHeadApproved) {
            return (
              <Tooltip title={`Approved by ${sr.opsHeadApprovedBy?.fullName || 'Ops'} on ${sr.opsHeadApprovedAt ? new Date(sr.opsHeadApprovedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}`}>
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
        })();

        // In a MIXED personalized order the outer personalized-packaging approval has no row of its
        // own (inner items read as Separate Kit/Product). Surface it once — pinned to the first
        // personalized-included row — so BOTH the personalized AND the separate-kit approvals show in
        // this column without one replacing the other. Works for kit OR product pin rows.
        if (personalizedKitSR
          && record.isIncludedInPersonalized
          && String(record.key) === String(firstPersonalizedRowKey)
          && personalizedKitSR._id !== sr?._id) {
          const pProducts = personalizedKitSR.kitProducts?.length
            ? personalizedKitSR.kitProducts
            : (order?.items || []).filter((it) => it.isIncludedInPersonalized)
              .map((it) => it.itemName || it.name || '').filter(Boolean);
          const persBlock = renderKitApprovalBlock(personalizedKitSR, {
            kitTypeName: personalizedKitSR.kitType || 'Personalized Kit',
            catLabel: 'Personalized Kit',
            catColor: ORDER_CATEGORY_META.personalized.color,
            kitProductsList: pProducts,
            isRepresentativeRow: true,
          });
          return (
            <Space direction="vertical" size={8} style={{ width: '100%' }} split={<div style={{ borderTop: '1px dashed rgba(127,127,127,0.3)', width: '100%' }} />}>
              {persBlock}
              {baseCell}
            </Space>
          );
        }
        return baseCell;
      },
    },
    {
      title: 'Assign Task',
      key: 'assignTask',
      fixed: 'right',
      width: 140,
      render: (_, record) => {
        const itemIndex = (order?.items || []).findIndex((it) => String(it.key) === String(record.key));
        const alreadyTasked = (itemIndex >= 0 && taskedProductIndices.has(itemIndex))
          || taskedProductNames.has((record.product || record.itemName || record.name || '').toLowerCase());
        return (
          <Space direction="vertical" size={4}>
            {alreadyTasked && (
              <Tag color="green" style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>✓ Task Assigned</Tag>
            )}
            <Button
              type="primary"
              size="small"
              style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
              onClick={() => openAssignModal(record, order)}
            >
              {alreadyTasked ? 'Add Another Task' : 'Assign Task'}
            </Button>
          </Space>
        );
      },
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
          <Button
            icon={<TruckOutlined />}
            onClick={() => {
              setPartialQtyInput(order.partialQty || 0);
              setPartialModalOpen(true);
            }}
            style={{ color: '#fa8c16', borderColor: '#fa8c1655' }}
          >
            {order.deliveryType === 'Partial' ? 'Update Partial Delivery' : 'Split Partial Delivery'}
          </Button>
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
        <div style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Space wrap size={8}>
            <Text style={{ fontSize: 12, color: '#389e0d', fontWeight: 600 }}>
              ♻ {hotelDesigns.length} previously approved design(s) on file for {order.hotelLogo}:
            </Text>
            {hotelDesigns.map((d) => (
              <Space key={d._id} size={4}>
                <Tag color="green" style={{ fontSize: 11, margin: 0 }}>{d.product} ({d.type})</Tag>
                {d.designFileUrl && (
                  <a href={d.designFileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#389e0d' }}>View ↗</a>
                )}
              </Space>
            ))}
            <Text style={{ fontSize: 11, color: '#52c41a' }}>— these will be offered as one-click reuse in the Sticker/Box/Frosted tabs.</Text>
          </Space>
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
                      {PAYMENT_LABELS[order.paymentTerms] || order.paymentTerms || '-'}
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
                  <Text strong style={{ color: textColor }}>{order.deliveryBy || '-'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Transportation By</Text>
                  <Text strong style={{ color: textColor }}>{order.transportationBy || '-'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Forwarding Charge</Text>
                  <Tag color={order.forwardingCharge ? 'orange' : 'default'} style={{ marginTop: 2 }}>
                    {order.forwardingCharge ? 'Applicable' : 'Not Applicable'}
                  </Tag>
                </Col>
              </Row>

              <Row gutter={[16, 10]}>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Expected Delivery</Text>
                  <Text strong style={{ color: textColor }}>
                    {order.expectedDelivery
                      ? new Date(order.expectedDelivery).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                      : '-'}
                  </Text>
                </Col>
              </Row>

              {/* Contact Info */}
              <Row gutter={[16, 10]}>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Contact Person</Text>
                  <Text strong style={{ color: textColor }}>{order.contactPerson || '-'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Phone</Text>
                  <Text strong style={{ color: textColor }}>{order.phone || '-'}</Text>
                </Col>
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Email</Text>
                  <Text strong style={{ color: textColor }}>{order.email || '-'}</Text>
                </Col>
                {order.alternativeName && (
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Alt Contact</Text>
                    <Text strong style={{ color: textColor }}>{order.alternativeName}{order.alternativeRole ? ` (${order.alternativeRole})` : ''}</Text>
                  </Col>
                )}
                {order.alternativePhone && (
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Alt Phone</Text>
                    <Text strong style={{ color: textColor }}>{order.alternativePhone}</Text>
                  </Col>
                )}
                <Col xs={12} sm={8}>
                  <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Location</Text>
                  <Text strong style={{ color: textColor }}>{order.location || '-'}</Text>
                </Col>
                {(order.city || order.state) && (
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>City / State</Text>
                    <Text strong style={{ color: textColor }}>{[order.city, order.state].filter(Boolean).join(', ')}</Text>
                  </Col>
                )}
                {order.destination && (
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Destination</Text>
                    <Text strong style={{ color: textColor }}>{order.destination}</Text>
                  </Col>
                )}
                {order.detailedAddress && (
                  <Col xs={24}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>Detailed Address</Text>
                    <Text strong style={{ color: textColor }}>{order.detailedAddress}</Text>
                  </Col>
                )}
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
                    <Text strong style={{ color: textColor }}>{order.billingName || '-'}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>GST Number</Text>
                    <Text strong style={{ color: textColor }}>{order.gstNumber || '-'}</Text>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Text style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>GST %</Text>
                    <Text strong style={{ color: textColor }}>{order.gstPercent != null ? `${order.gstPercent}%` : '-'}</Text>
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
                    <Text strong style={{ color: textColor }}>{order.salesPerson || '-'}</Text>
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
                {Array.isArray(order.kitOrders) && order.kitOrders.length > 0 && (
                  <Card
                    title={<Space><GiftOutlined style={{ color: '#722ed1' }} /><Text strong style={{ color: '#722ed1' }}>Kit / Display Unit Personalization</Text></Space>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(114,46,209,0.06)' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {order.kitOrders.map((ko, ki) => {
                        const atts = (Array.isArray(ko.attachments) ? ko.attachments : []).filter((a) => a && (typeof a === 'string' ? a : a.url));
                        const inc = Array.isArray(ko.kitIncludes) ? ko.kitIncludes : [];
                        const yn = (v) => String(v ?? '').trim().toUpperCase() === 'YES';
                        return (
                          <div key={ko.kitId || ki} style={{ padding: '12px 14px', background: isDark ? 'rgba(114,46,209,0.1)' : 'rgba(114,46,209,0.05)', borderRadius: 10, border: '1px solid rgba(114,46,209,0.18)' }}>
                            <Space wrap size={6}>
                              <Text strong style={{ color: '#722ed1', fontSize: 13 }}>{ko.kitName || ko.kitType || `Kit ${ki + 1}`}</Text>
                              {ko.displayUnit && <Tag color="purple" style={{ borderRadius: 12 }}>{String(ko.displayUnit).replace(/_/g, ' ')}</Tag>}
                              {ko.size && <Tag color="geekblue" style={{ borderRadius: 12 }}>{ko.size}</Tag>}
                              {Number(ko.overallQty) > 0 && <Tag color="blue" style={{ borderRadius: 12 }}>Qty: {ko.overallQty}</Tag>}
                              {ko.sticker && <Tag color={yn(ko.sticker) ? 'green' : 'default'} style={{ borderRadius: 12 }}>Sticker: {yn(ko.sticker) ? 'Yes' : 'No'}</Tag>}
                              {ko.logo && <Tag color={yn(ko.logo) ? 'cyan' : 'default'} style={{ borderRadius: 12 }}>Logo: {yn(ko.logo) ? 'Yes' : 'No'}</Tag>}
                              {ko.printing && <Tag color={yn(ko.printing) ? 'magenta' : 'default'} style={{ borderRadius: 12 }}>Printing: {yn(ko.printing) ? 'Yes' : 'No'}</Tag>}
                              {Number(ko.kitPrice) > 0 && <Tag color="orange" style={{ borderRadius: 12 }}>₹{Number(ko.kitPrice).toLocaleString()}</Tag>}
                            </Space>
                            {ko.specification && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Specification: </Text>
                                <Text style={{ fontSize: 12 }}>{ko.specification}</Text>
                              </div>
                            )}
                            {inc.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Included in Packaging</Text>
                                <Space wrap size={4}>
                                  {inc.map((v, i) => {
                                    const id = typeof v === 'object' ? v.id : v;
                                    const qty = typeof v === 'object' ? v.qty : null;
                                    return <Tag key={i} color="purple" style={{ borderRadius: 12, fontSize: 11 }}>{String(id)}{qty && qty > 1 ? ` ×${qty}` : ''}</Tag>;
                                  })}
                                </Space>
                              </div>
                            )}
                            {atts.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Kit Files / Attachments</Text>
                                {renderAttachmentLinks(atts)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Space>
                  </Card>
                )}
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
                : printingModalType === 'butter_paper'
                ? 'Butter Paper Team'
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
                  : printingModalType === 'butter_paper'
                  ? 'Butter Paper Team'
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
                  {
                    title: 'Logo', key: 'logo', width: 70,
                    render: (_, r) => r.logoUrl
                      ? <a href={r.logoUrl} target="_blank" rel="noreferrer"><img src={r.logoUrl} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }} /></a>
                      : r.logoRequired ? <Tag color="orange" style={{ fontSize: 10 }}>Logo Req.</Tag> : <Text type="secondary">—</Text>,
                  },
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
                  {
                    title: 'Logo', key: 'logo', width: 70,
                    render: (_, r) => r.logoUrl
                      ? <a href={r.logoUrl} target="_blank" rel="noreferrer"><img src={r.logoUrl} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4, border: '1px solid #eee' }} /></a>
                      : r.logoRequired ? <Tag color="orange" style={{ fontSize: 10 }}>Logo Req.</Tag> : <Text type="secondary">—</Text>,
                  },
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
              <Form.Item label="Task Name" name="taskName" rules={[{ required: true, message: 'Task name is required' }]}>
                <Select
                  placeholder="Select task"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  style={{ borderRadius: 8 }}
                  notFoundContent={configTaskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                  options={configTaskNameOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Task Type" name="taskType" rules={[{ required: true, message: 'Task type is required' }]}>
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
              <Form.Item label="Assign To" name="assignee" rules={[{ required: true, message: 'Please select an assignee' }]}>
                <Select placeholder="Select employee">
                  {[...new Map(allOrders.filter((o) => o.assignedEmployee).map((o) => [o.assignedEmployee, { key: o.key, name: o.assignedEmployee }])).values()].map((emp) => (
                    <Option key={emp.key} value={emp.name}>{emp.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Estimated duration from Time Management config × required qty */}
          <Alert
            type={assignEstimate.matched ? 'success' : 'warning'}
            showIcon
            style={{ borderRadius: 8, marginBottom: 4 }}
            message={assignEstimate.matched
              ? `Estimated duration: ${secToHuman(assignEstimate.estimatedSec)}`
              : 'No time standard configured for this task'}
            description={assignEstimate.matched
              ? `${perUnitLabel(assignEstimate.perUnitSec)} × ${Number(taskRequiredQty || 0).toLocaleString()} units`
              : 'Add it under Task Management → Time Management to auto-calculate the duration and rating.'}
          />

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

      {/* Kit Packing Task Assignment Modal */}
      <Modal
        open={kitPackingModalOpen}
        onCancel={() => { setKitPackingModalOpen(false); kitPackingForm.resetFields(); }}
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#B11E6A' }} />
            <span>Assign Kit Packing Task</span>
            {order?.kitDisplayUnit && <Tag color="purple">{order.kitDisplayUnit}</Tag>}
          </Space>
        }
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={kitPackingForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Task Name" name="taskName">
            <Input placeholder={`Kit Packing — ${order?.kitDisplayUnit || 'Kit'}`} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label="Assign To" name="assignee" rules={[{ required: true, message: 'Please assign to someone' }]}>
            <Select placeholder="Select assignee">
              {[...new Map(
                allOrders.filter((o) => o.assignedEmployee)
                  .map((o) => [o.assignedEmployee, { key: o.key, name: o.assignedEmployee }])
              ).values()].map((emp) => (
                <Option key={emp.key} value={emp.name}>{emp.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Notes" name="description">
            <Input.TextArea rows={2} placeholder="Optional notes for the kit packing task" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Button
              type="primary"
              block
              style={{
                height: 42, borderRadius: 10,
                background: 'linear-gradient(135deg,#B11E6A,#D85C9E)',
                border: 'none', fontWeight: 600,
                boxShadow: '0 4px 15px rgba(177,30,106,0.3)',
              }}
              onClick={submitKitPackingTask}
            >
              Create and Assign Kit Packing Task
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
