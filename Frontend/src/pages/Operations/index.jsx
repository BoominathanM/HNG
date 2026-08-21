import React, { useEffect, useMemo, useState } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Popover,
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
  Popconfirm,
} from 'antd';
import {
  AlertFilled,
  BoxPlotOutlined,
  CheckCircleOutlined,
  ContainerOutlined,
  CopyOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileImageOutlined,
  InboxOutlined,
  KeyOutlined,
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
  useUpdateItemPrintingStatusMutation,
  useCreateStickerRequestMutation,
  useUploadStickerDesignMutation,
  useUpdateStickerStatusMutation,
  useReassignStickerRequestMutation,
  useSendToStickerTeamMutation,
  useSendDesignConfirmationWhatsAppMutation,
  useAssignTaskMutation,
  useSetOrderEmergencyMutation,
  useApproveStickerRequestMutation,
  useGetVendorsQuery,
  useGetUsersQuery,
  useGetCompanySettingsQuery,
  useGetPackingConfigQuery,
  useApproveEmergencyOpsHeadMutation,
  useGetEmergencyRequestsQuery,
  useGetHotelDesignsQuery,
  useUploadStickerInvoiceMutation,
  useDecideLrMismatchOpsMutation,
  useGetHiddenQueueRowsQuery,
  useHideQueueRowMutation,
} from '../../store/api/apiSlice';
import {
  buildProductionQueues,
  canAssignTaskFromChecks,
  designColor,
  ORDER_CATEGORY_META,
  designerCredentials,
  FLOW_STAGES,
  getCheckStateMap,
  getEmergencyProductSet,
  getFlowStep,
  getProgressFromChecks,
  inferItemLogoType,
  normYNOps,
  PACKAGING_TYPE_LABELS,
  packTabFromString,
  paymentStatusColor,
  statusPill,
} from './data';

const { Text, Title } = Typography;
const { Option } = Select;

// Derives a queue row's StickerRequest type (Box/Frosted Ziplock/Butter Paper/Wooden
// Brush/Other/Sticker) from its React key's '-box'/'-frosted'/... suffix. Emergency-split
// rows append an extra '-emg'/'-rem' AFTER that suffix (see data.js's makeBoxRow etc.),
// which must be stripped first or every check below fails and silently falls through to
// 'Sticker' — mismatching the row against the wrong StickerRequest doc.
const queueTypeFromKey = (key) => {
  const baseKey = (key || '').replace(/-(emg|rem)$/, '');
  return baseKey.endsWith('-box') ? 'Box'
    : baseKey.endsWith('-frosted') ? 'Frosted Ziplock'
    : baseKey.endsWith('-butter') ? 'Butter Paper'
    : baseKey.endsWith('-wooden_brush') ? 'Wooden Brush'
    : baseKey.endsWith('-other') ? 'Other'
    : 'Sticker';
};

// Maps a queue tab's display label to the URL slug used by /operations/invoices/:type
// (each slug is backed by its own model — StickerInvoice/BoxInvoice/ZiplockInvoice/ButterPaperInvoice).
const INVOICE_TYPE_SLUG = {
  Sticker: 'sticker',
  Box: 'box',
  'Frosted Ziplock': 'ziplock',
  'Butter Paper': 'butter',
  'Wooden Brush': 'wooden_brush',
  Other: 'other',
};

// Inventory "filled" items store their size as a bare number (e.g. "15") with the actual
// unit held separately on item.unit (ml/gram/Litres/Kg) — see Backend/src/models/InventoryItem.js.
// Sizes that already carry their own unit text (e.g. "2.5cm x 2.5cm") are left untouched.
const SIZE_UNIT_LABELS = { ml: 'ml', gram: 'g', g: 'g', Litres: 'L', Kg: 'Kg' };
const formatSizeWithUnit = (size, unit) => {
  const raw = String(size ?? '').trim();
  if (!raw || /[a-zA-Z]/.test(raw)) return raw;
  const unitLabel = SIZE_UNIT_LABELS[unit];
  return unitLabel ? `${raw} ${unitLabel}` : raw;
};

// Matches StickerRequest.status (Backend/src/models/StickerRequest.js) — row.status now
// comes straight from the matching StickerRequest (see buildProductionQueues in ./data),
// so these buckets must line up with that enum or every count below silently reads 0.
const queueStatuses = [
  'Pending',
  'Waiting for Approval',
  'Design Confirmation',
  'Approved',
  'In Process',
  'Printing',
  'Dispatch',
  'Received',
  'Design Change',
  'Done',
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
  const currentUser = useSelector((state) => state.auth.user);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const { filterTabs, activeKeyFor } = useTabAccess('Operations');
  const { requireAccess } = usePageAccess('Operations');
  const [stickerSearch, setStickerSearch] = useState('');
  const [boxSearch, setBoxSearch] = useState('');
  const [frostedSearch, setFrostedSearch] = useState('');
  const [butterSearch, setButterSearch] = useState('');
  const [woodenBrushSearch, setWoodenBrushSearch] = useState('');
  const [otherSearch, setOtherSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);
  // Date-range filters — each Table listing real records gets its own, independent state.
  const [orderMgmtDateRange, setOrderMgmtDateRange] = useState(null);
  const [stickerDateRange, setStickerDateRange] = useState(null);
  const [boxDateRange, setBoxDateRange] = useState(null);
  const [frostedDateRange, setFrostedDateRange] = useState(null);
  const [butterDateRange, setButterDateRange] = useState(null);
  const [woodenBrushDateRange, setWoodenBrushDateRange] = useState(null);
  const [otherDateRange, setOtherDateRange] = useState(null);

  // API-backed state — RTK Query
  const { data: ordersData, isLoading: ordersLoading } = useGetOperationOrdersQuery({ limit: 500 }, { refetchOnMountOrArgChange: true });
  const { data: stickerData } = useGetStickerRequestsQuery();
  const [updateOrderStatus] = useUpdateOperationOrderStatusMutation();
  const [updateItemPrintingStatus] = useUpdateItemPrintingStatusMutation();
  const [createStickerRequest] = useCreateStickerRequestMutation();
  const [uploadStickerDesign] = useUploadStickerDesignMutation();
  const [uploadStickerInvoice] = useUploadStickerInvoiceMutation();
  const [updateStickerStatus] = useUpdateStickerStatusMutation();
  const [reassignStickerRequest] = useReassignStickerRequestMutation();
  const [sendToStickerTeam] = useSendToStickerTeamMutation();
  const [sendDesignConfirmationWhatsApp] = useSendDesignConfirmationWhatsAppMutation();
  const [assignTask] = useAssignTaskMutation();
  const [setOrderEmergency] = useSetOrderEmergencyMutation();
  const [approveStickerRequest] = useApproveStickerRequestMutation();
  const [approveEmergencyOpsHead] = useApproveEmergencyOpsHeadMutation();
  const [emergencyOpsApprovalOrder, setEmergencyOpsApprovalOrder] = useState(null);
  const [approvingEmergencyTaskId, setApprovingEmergencyTaskId] = useState(null);
  const [approvingAllEmergency, setApprovingAllEmergency] = useState(false);
  const [decideLrMismatchOps] = useDecideLrMismatchOpsMutation();
  const [lrMismatchOpsOrder, setLrMismatchOpsOrder] = useState(null);
  const [decidingLrMismatchOps, setDecidingLrMismatchOps] = useState(false);
  const { data: emergencyRequestsRaw } = useGetEmergencyRequestsQuery();
  // Queue row visibility (Sticker/Box/Ziplock/Butter Paper/Wooden Brush/Other tabs) —
  // Admin/Management-only removal of a single row from one packaging queue tab, without
  // touching the underlying Order. Restorable from Settings > Deleted Records.
  const { data: hiddenQueueRowsData } = useGetHiddenQueueRowsQuery();
  const [hideQueueRow] = useHideQueueRowMutation();
  const hiddenQueueRowKeys = useMemo(
    () => new Set((hiddenQueueRowsData?.data || []).map((r) => `${r.orderId}:${r.rowKey}`)),
    [hiddenQueueRowsData],
  );
  const isAdminDept = currentUser?.department === 'Admin' || currentUser?.department === 'Management' || currentUser?.role === 'Super Admin';
  const handleHideQueueRow = async (row, tab) => {
    try {
      const ord = apiOrders.find((o) => o.id === row.orderId);
      await hideQueueRow({
        orderId: ord?.key || row.orderId,
        rowKey: row.key,
        tab,
        orderCode: row.orderId,
        product: row.product,
        qty: row.qty,
      }).unwrap();
      enqueueSnackbar(`Removed from ${tab} queue — visible in Deleted Records`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to remove row', { variant: 'error' });
    }
  };
  // Group active emergency-dispatch requests by order — one entry per product/Task
  // that raised "Emergency Dispatch" in Task Management (see Sales/index.jsx for the
  // matching map — an order can have several products each with their own request).
  const emergencyRequestsByOrder = useMemo(() => {
    const map = {};
    (emergencyRequestsRaw?.data || []).forEach((t) => {
      const oid = (t.orderId?._id || t.orderId)?.toString();
      if (!oid) return;
      if (!map[oid]) map[oid] = [];
      map[oid].push({
        taskId: t._id,
        taskCode: t.taskCode,
        product: t.product || t.taskName || 'Product',
        reason: t.emergencyReason || '',
        requestedAt: t.emergencyRequestedAt,
        salesApproved: !!t.emergencySalesApproved,
        opsApproved: !!t.emergencyOpsApproved,
        approved: !!t.emergencyApproved,
      });
    });
    return map;
  }, [emergencyRequestsRaw]);

  const stickerRequests = stickerData?.data || [];

  // All hotel designs (previously approved across all orders) — used to bypass re-approval
  const { data: hotelDesignsRaw } = useGetHotelDesignsQuery();
  const hotelDesigns = hotelDesignsRaw?.data || [];
  // Map: `${hotelName.toLowerCase()}-${product.toLowerCase()}-${type}` → design record
  const hotelDesignMap = useMemo(() => {
    const map = {};
    hotelDesigns.forEach((d) => {
      const key = `${(d.hotelName || '').toLowerCase()}-${(d.product || '').toLowerCase()}-${d.type || 'Sticker'}`;
      if (!map[key]) map[key] = d;
    });
    return map;
  }, [hotelDesigns]);
  // Find existing approved hotel design for a queue row
  const findHotelDesign = (record) => {
    const stickerType = queueTypeFromKey(record.key);
    const key = `${(record.hotelLogo || '').toLowerCase()}-${(record.product || '').toLowerCase()}-${stickerType}`;
    return hotelDesignMap[key] || null;
  };

  // Printing vendors from Vendors & Suppliers module (vendorType = 'printing')
  const { data: printingVendorData } = useGetVendorsQuery({ type: 'printing' });

  // Vendor users from Settings (department = Vendors, role = Sticker/Box/Ziplock)
  const { data: usersData } = useGetUsersQuery({ limit: 1000 });
  const vendorUsers = useMemo(() => (usersData?.data || []).filter(
    u => u.department === 'Vendors' && ['Sticker', 'Box', 'Ziplock', 'Butter Paper', 'Wooden Brush', 'Other'].includes(u.role)
  ), [usersData]);

  // Packing config: resolve packingMaterial → Operations tab mapping
  const { data: packingConfigRaw } = useGetPackingConfigQuery();
  const packingMaterialTabMap = useMemo(() => {
    const entries = (packingConfigRaw?.data || []).filter(c => c.type === 'packingMaterial');
    return Object.fromEntries(entries.map(c => [c.value, c.tabMapping || '']));
  }, [packingConfigRaw]);
  // Packing config: resolve displayUnit name → Operations tab mapping (for kit routing)
  const displayUnitTabMap = useMemo(() => {
    const entries = (packingConfigRaw?.data || []).filter(c => c.type === 'displayUnit');
    return Object.fromEntries(entries.map(c => [c.value, c.tabMapping || '']));
  }, [packingConfigRaw]);

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
      butter: makeOpts('Butter Paper', 'Butter Paper'),
      wooden_brush: makeOpts('Wooden Brush', 'Wooden Brush'),
      other: makeOpts('Other', 'Other'),
    };
  }, [printingVendorData, vendorUsers]);

  const apiOrders = useMemo(() => (ordersData?.data || []).map((o) => ({
    key: o._id, id: o.orderCode || o._id,
    hotelLogo: o.clientName || '—',
    createdAt: o.createdAt, orderType: o.orderType || 'Sticker',
    orderCategory: (o.orderCategory === 'SAMPLE' || o.leadId?.leadType === 'SAMPLE') ? 'SAMPLE' : (o.orderCategory || 'ORDER'),
    clientApproval: o.clientApproval || 'Waiting',
    designStatus: o.designStatus || 'Not Started',
    printingStatus: o.printingStatus || 'Not Started',
    stockStatus: o.stockStatus || 'Not Received',
    operationStage: o.operationStage || '', taskStatus: o.taskStatus || 'Pending',
    assignedEmployee: o.salesPerson || o.assignedTo?.fullName || o.leadId?.salesPerson || '', printerSentTotal: o.printerSentTotal || 0,
    printerVerified: o.printerVerified || false, inventoryStock: o.inventoryStock || 0,
    orderReceivedStock: o.orderReceivedStock || 0, notifications: o.notifications || [],
    specsSummary: o.specsSummary || '',
    paymentTerms: o.paymentTerms || o.leadId?.paymentTerms || '',
    // Live Paid/Partial/Pending resolved backend-side from invoices/order payment
    // collection — the same source Sales/Billing/Task Management read, so this
    // always matches those modules instead of a locally-recomputed value.
    paymentStatus: o.paymentStatus || 'Pending',
    totalAmount: o.total || 0, advance: o.advancePaid || 0,
    expectedDelivery: o.expectedDeliveryDate || o.leadId?.orderDeliveryDate || null,
    isUrgent: o.isUrgent || o.leadId?.isUrgent || false,
    // Per-product emergency-dispatch requests for this order — one entry per Task
    // that raised "Emergency Dispatch" in Task Management, most recent first.
    emergencyRequests: emergencyRequestsByOrder[o._id] || [],
    // Dispatch LR mismatch on fields OTHER than Weight/Transport Name (Packages/Boxes,
    // Destination) — needs a reason + BOTH Sales and Operations to approve. This
    // captures the Operations side; see Actions column + modal below.
    lrMismatchStatus: o.dispatchLrMismatchStatus || 'none',
    lrMismatchReason: o.dispatchLrMismatchReason || '',
    lrMismatchFields: o.dispatchLrMismatchFields || [],
    lrMismatchSalesApproved: !!o.dispatchLrMismatchSalesApproved,
    lrMismatchOpsApproved: !!o.dispatchLrMismatchOpsApproved,
    // Fall back to linked lead's splitDates so emergency products identified on the lead
    // (before order creation) are still reflected in the Operations queue.
    splitDates: (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []),
    // True when any product in this order has an emergency (partial) delivery date in splitDates.
    hasEmergencyProducts: (() => {
      const sds = (o.splitDates && o.splitDates.length > 0) ? o.splitDates : (o.leadId?.splitDates || []);
      return sds.some((sd) => (sd.products || []).some((ep) => ep.product) || !!sd.product);
    })(),
    // Contact & billing — order doc first, then populated lead fallback
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
    billType: o.billType || o.type || o.leadId?.billType || 'GST',
    salesPerson: o.salesPerson || o.assignedTo?.fullName || o.leadId?.salesPerson || '',
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
    // Fall back to o.products when items is empty (legacy / sample orders that only stored products)
    items: (() => {
      // Per-kit display-unit map (by kitId). An order can hold MULTIPLE kits, each with its own
      // display unit (e.g. dental=Ziplock, shaving=Box, bath=Pouch). Source from the order's own
      // kitOrders first, then the populated lead's kitOrders, so each kit routes to its OWN tab.
      const kitOrdersList = ((o.kitOrders?.length ? o.kitOrders : (o.leadId?.kitOrders || [])) || []).filter(Boolean);
      const kitCfgById = Object.fromEntries(kitOrdersList.filter(k => k.kitId).map(k => [k.kitId, k]));
      // Lead-sourced product list: at conversion the FULL lead products are copied onto the order
      // (kit flag, kitId/kitName, composition category, display unit, specs) — but order.items can
      // come from the negotiation and lose some of those (e.g. isKit/category). So when reading
      // order.items, enrich each row from the matching order.products / lead products entry. This
      // pulls back ALL the detail captured in the lead so Operations shows & clusters it correctly.
      const leadProducts = (o.products?.length ? o.products : (o.leadId?.products || [])) || [];
      const prodKey = (p) => `${p?.kitId || ''}|${String(p?.name || p?.itemName || '').trim().toLowerCase()}`;
      const productByKey = {};
      leadProducts.forEach((p) => { const k = prodKey(p); if (p && !(k in productByKey)) productByKey[k] = p; });
      const rawItems = (o.items?.length ? o.items : leadProducts);
      // Personalized order + what's packed inside its outer unit (packagingIncludes). An included
      // kit/product is a SEPARATE thing packed inside the personalized box, so its OWN row reads as
      // Separate Kit / Separate Product (the personalized OUTER packing appears as a synthesized
      // personalized copy in the queue). This is why "Select Kit → add a kit inside personalized"
      // must surface that kit as a Separate Kit, not just as Personalized.
      const ptArr = Array.isArray(o.productType) ? o.productType : (o.productType ? [o.productType] : []);
      const isPersonalizedOrder = ptArr.includes('personalized') || ptArr.includes('PERSONALIZED_KIT');
      const includesList = (o.packagingIncludes?.length ? o.packagingIncludes : (o.leadId?.packagingIncludes || [])) || [];
      const includeSet = new Set(includesList.map(String));
      return rawItems.map((rawItem, itemIdx) => {
        // Prefer the index-aligned product (items derive from products), else match by kitId+name.
        const prod = (o.items?.length && leadProducts[itemIdx] && prodKey(leadProducts[itemIdx]) === prodKey(rawItem))
          ? leadProducts[itemIdx]
          : (productByKey[prodKey(rawItem)] || {});
        // Field-level enrichment: keep the item's own value when present, else take the lead product's.
        const item = {
          ...prod, ...rawItem,
          isKit: rawItem.isKit || prod.isKit || false,
          kitId: rawItem.kitId || prod.kitId || '',
          kitName: rawItem.kitName || prod.kitName || '',
          kitType: rawItem.kitType || prod.kitType || '',
          category: rawItem.category || prod.category || '',
          displayUnit: rawItem.displayUnit || prod.displayUnit || '',
          size: rawItem.size || prod.size || '',
          stickerSize: rawItem.stickerSize || prod.stickerSize || '',
          sticker: rawItem.sticker || prod.sticker || '',
          logo: rawItem.logo || prod.logo || '',
          printing: rawItem.printing || prod.printing || '',
          packingMaterial: rawItem.packingMaterial || rawItem.packaging || prod.packingMaterial || prod.packaging || '',
        };
        const isKitItem = !!(item.isKit || item.kitType);
        // Resolve this kit's own config: match by kitId, else (single-kit order) the lone entry.
        const kitCfg = isKitItem
          ? (kitCfgById[item.kitId] || (kitOrdersList.length === 1 ? kitOrdersList[0] : null))
          : null;
        // Normalize sticker/logo/printing: old DB rows may store lowercase 'yes'/'no';
        // the Sticker-queue checks (item.sticker === 'YES') require uppercase.
        // For kit items, fall back to the kit-level value (entered in the per-kit
        // Order Details card) so a Sticker=Yes kit still goes through the Print tab first.
        const sticker = normYNOps(item.sticker || item.stickerPrinting || (isKitItem ? kitCfg?.sticker : ''));
        const logo = normYNOps(item.logo || (isKitItem ? kitCfg?.logo : ''));
        const printing = normYNOps(item.printing || (isKitItem ? kitCfg?.printing : ''));
        const displayUnitType = item.displayUnitType || (isKitItem ? kitCfg?.displayUnitType : '') || '';
        const lamination = normYNOps(item.lamination || (isKitItem ? kitCfg?.lamination : ''));
        const pmRaw = item.packingMaterial || item.packaging || '';
        // A Brush product whose own "Brush Type" spec (_BRUSH_TYPES in Sales/index.jsx) is
        // "Wooden" always routes to the Wooden Brush tab — regardless of whatever packing
        // material was ALSO selected for it (Box/Ziplock/etc.) — since wooden brushes go
        // through their own production pipeline. Highest priority: overrides the config lookup.
        const isWoodenBrushProduct = String(item.brushType || '').trim().toLowerCase() === 'wooden';
        // Config lookup first; string-match fallback for items without a config entry
        // (e.g. orders from before packing config was set up, or unregistered material names).
        const packingMaterialTab = isWoodenBrushProduct
          ? 'Wooden Brush'
          : (packingMaterialTabMap[pmRaw] || item.packingMaterialTab || packTabFromString(pmRaw));
        // Composition category. An item packed INSIDE a personalized outer (packagingIncludes) is a
        // Separate Kit / Separate Product inside the box → its OWN row reads as that (the personalized
        // outer packing is the synthesized personalized copy). Otherwise the per-kit Order Details
        // config (kitOrders[i].category) is the source of truth; the item's own category can be stale.
        // `packagingIncludes` can list the personalized kit's OWN kitId (e.g. ORD-260005: the
        // Dental Kit's id sits in packagingIncludes alongside Soap/Comb, meaning "the kit itself
        // goes in the outer Box") — that self-reference must NOT be read as "this kit's own
        // components were pulled in from being separately ordered". Without the guard below,
        // Paste/Brush (the kit's own personalized components) matched `includeSet.has(item.kitId)`
        // on their OWN kit id and got reclassified as Separate Kit, which then made the emergency
        // split (Operations/data.js's getEmergencyProductQtyMap) treat them as a bundled foreign
        // item instead of true kit components.
        const isIncludedInPersonalized = isPersonalizedOrder
          && !(isKitItem && kitCfg?.category === 'personalized')
          && (includeSet.has(String(item.kitId)) || includeSet.has(String(item.name || item.itemName)));
        const itemCategory = isIncludedInPersonalized
          ? (isKitItem ? 'separate_kit' : 'separate_product')
          : ((isKitItem && kitCfg?.category) ? kitCfg.category : item.category);
        // Per-kit display unit → resolved Operations tab. Resolution priority for a kit item:
        //   1. item.displayUnit (per-item)
        //   2. kitCfg.displayUnit (per-kit Order Details card / kit inventory default)
        //   3. order/lead top-level display unit — fallback for ANY kit (personalized AND
        //      separate/dental/shaving/bath) when no per-kit value was captured.
        // The per-kit value (2) is authoritative, so a multi-kit order where each kit carries its
        // OWN display unit (e.g. personalized=Box, dental=Ziplock) still routes each kit to its own
        // tab. The order-level fallback (3) only applies when a kit has NO per-kit value at all —
        // covering separate kits whose only display unit is the order-level one (their inventory
        // kit has no displayUnit). Without this, separate kits silently drop out of the design tabs.
        const orderLevelDU = o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '';
        const itemDisplayUnit = isKitItem
          ? (item.displayUnit || kitCfg?.displayUnit || orderLevelDU || '')
          : (item.displayUnit || '');
        const itemDisplayUnitTab = (isKitItem && itemDisplayUnit)
          ? (item.displayUnitTab || displayUnitTabMap[itemDisplayUnit] || packTabFromString(itemDisplayUnit))
          : (item.displayUnitTab || '');
        // Infer logoType for items saved before mapOrderItem computed it — ensures Box/Frosted
        // queue gates (which check logoType or packingMaterialTab) route old items correctly.
        const logoType = inferItemLogoType(sticker, printing, pmRaw, packingMaterialTab, item.logoType);
        return {
          ...item,
          itemName: item.itemName || item.name,
          sticker,
          logo,
          printing,
          packingMaterialTab,
          displayUnit: itemDisplayUnit,
          displayUnitType,
          displayUnitTab: itemDisplayUnitTab,
          lamination,
          logoType,
          category: itemCategory,
        };
      });
    })(),
    readiness: o.readiness || {},
    // ─── Partial-delivery tracking (deliveryType Full/Partial + qty split) ───
    // Carried through so the Operations list, queues and detail view reflect a
    // partial delivery. Without these the partial badge/tag can never render.
    qty: o.qty || (o.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0),
    deliveryType: o.deliveryType || '',
    partialQty: o.partialQty || 0,
    balanceQty: o.balanceQty || 0,
    partialDeliveries: o.partialDeliveries || [],
    paymentProofs: o.paymentProofs || [],
    // Carried onto the mapped order so the productionQueues dual-step (which runs on apiOrders,
    // NOT the raw order) can detect a personalized order and what's packed inside it. Without
    // these the personalized-packing copies are never generated (the leadId object is not on the
    // mapped order). Fall back to the populated lead like the other kit fields.
    productType: o.productType || o.leadId?.productType || [],
    packagingIncludes: (o.packagingIncludes?.length ? o.packagingIncludes : (o.leadId?.packagingIncludes || [])) || [],
    // NOTE: packagingIncludesQty (how much of a bundled Separate Product/Kit is actually
    // packed inside the personalized kit) was missing here entirely — getEmergencyProductQtyMap's
    // bundledQtyFor read `order.packagingIncludesQty` but this mapped order never carried it,
    // so it was always `{}`, making every bundled item's emergency split resolve to 0 regardless
    // of how correct bundledQtyFor's own lookup logic was.
    packagingIncludesQty: (o.packagingIncludesQty && Object.keys(o.packagingIncludesQty).length ? o.packagingIncludesQty : (o.leadId?.packagingIncludesQty || {})) || {},
    kitOrders: (o.kitOrders?.length ? o.kitOrders : (o.leadId?.kitOrders || [])) || [],
    kitOverallQty: o.kitOverallQty ?? o.leadId?.kitOverallQty ?? 0,
    // Kit display fields — fall back to the populated leadId fields for orders created
    // before kitDisplayUnit was copied onto the Order document itself.
    kitDisplayUnit: o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '',
    displayUnit: o.displayUnit || o.kitDisplayUnit || o.leadId?.displayUnit || o.leadId?.kitDisplayUnit || '',
    displayUnitTab: (() => {
      // Use stored value first; fall back to a live packing-config lookup so orders
      // saved before displayUnitTab was written still route to the correct tab.
      const stored = o.displayUnitTab || o.leadId?.displayUnitTab;
      if (stored) return stored;
      const du = o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '';
      return displayUnitTabMap[du] || '';
    })(),
    logoRequired: o.logoRequired || o.leadId?.logoNeeded || false,
    logoUrl: o.logoUrl || o.leadId?.hotelLogoUrl || '',
  })), [ordersData, packingMaterialTabMap, displayUnitTabMap, emergencyRequestsByOrder]);

  const [queueSteps, setQueueSteps] = useState({});
  const [dispatchTimes, setDispatchTimes] = useState({}); // orderId → { date, time }

  const checkStates = useMemo(() => getCheckStateMap(apiOrders), [apiOrders]);
  const productionQueues = useMemo(() => {
    // ─── Dual-step display for PERSONALIZED orders ───────────────────────────────
    // A personalized kit is an OUTER unit (e.g. a Box) that physically contains other kits and
    // products (listed in packagingIncludes). The real production flow has TWO steps for those
    // contents, e.g. a Dental kit set to Ziplock that goes inside a personalized Box:
    //   1. assemble the dental kit in ITS OWN display-unit tab (Ziplock) — category Separate Kit
    //   2. pack the assembled kit (+ any included products) into the personalized outer unit —
    //      shown in the PERSONALIZED display-unit tab (Box), category Personalized
    // The per-item normalization above already routes each kit to its own tab (step 1). Here we
    // synthesize a "personalized packing" copy of each INCLUDED item so it ALSO appears in the
    // personalized outer tab (step 2) — but only when that outer tab differs from the item's own
    // tab, so we never duplicate a row within the same tab.
    const queueOrders = apiOrders.map((o) => {
      const ptArr = Array.isArray(o.productType) ? o.productType : (o.productType ? [o.productType] : []);
      const isPersonalizedOrder = ptArr.includes('personalized') || ptArr.includes('PERSONALIZED_KIT');
      const persDU = o.kitDisplayUnit || o.displayUnit || o.leadId?.kitDisplayUnit || o.leadId?.displayUnit || '';
      const persTab = persDU ? (displayUnitTabMap[persDU] || packTabFromString(persDU)) : '';
      const includes = (o.packagingIncludes?.length ? o.packagingIncludes : (o.leadId?.packagingIncludes || [])) || [];
      if (!isPersonalizedOrder || !persTab || !includes.length) return o;
      const includeSet = new Set(includes.map(String));
      const persCopies = (o.items || [])
        // Emit a "personalized packing" copy for every INCLUDED item that is not ALREADY personalized
        // (i.e. Separate Kit / Separate Product packed inside the personalized outer). The copy is
        // independent of the tab — so when the separate kit and the personalized outer share the SAME
        // display unit (both Box, or both Ziplock), the SAME tab shows TWO rows for the same order:
        // the item once as its own category (e.g. Separate Kit) AND once as Personalized. When they
        // differ, the two rows land in their two tabs. Already-personalized items ARE the personalized
        // row via normal routing, so they are not copied (no duplicate personalized row).
        .filter((it) => (includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName)))
          && it.category !== 'personalized')
        .map((it) => ({
          // Force isKit so the queue routes this copy by its display-unit tab (the personalized
          // outer unit) regardless of whether the included item is itself a kit or a product.
          // underlyingIsKit preserves the item's REAL kind (before the isKit override) so
          // mustPrintBeforePackaging (data.js) can still gate a bundled STANDALONE product with
          // its own sticker=YES behind its sticker step, instead of letting the forced isKit
          // exempt it and show it in the packaging tab at the same time it's in the Sticker tab.
          ...it,
          isKit: true,
          underlyingIsKit: !!(it.isKit || it.kitType),
          category: 'personalized',
          displayUnit: persDU,
          displayUnitTab: persTab,
          isPersonalizedPacking: true,
        }));
      return persCopies.length ? { ...o, items: [...o.items, ...persCopies] } : o;
    });
    return buildProductionQueues(queueOrders, stickerRequests, queueSteps);
  }, [apiOrders, stickerRequests, queueSteps, displayUnitTabMap]);
  const [orderMgmtInnerTab, setOrderMgmtInnerTab] = useState('order');

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

  // Map StickerRequest.status → queue step number
  const stickerStatusToStep = (status) => {
    // Rejected by Sales/Ops — back to step 0 (Designing) for rework and re-send.
    if (status === 'Design Change') return 0;
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
    const stickerType = queueTypeFromKey(item.key);
    const pLower = (item.product || '').toLowerCase();
    const cat = item.category || '';
    const matches = stickerRequests.filter(
      (s) => s.orderId?.orderCode === item.orderId && s.stickerType === stickerType && (s.product || '').toLowerCase() === pLower,
    );
    // Category-scoped approval: when the same product shows twice in one tab (once as Separate Kit,
    // once as Personalized), each row gets its OWN approval. Prefer the request with the matching
    // category; fall back to a legacy request that has no category (orders created before this).
    return matches.find((s) => (s.category || '') === cat) || matches.find((s) => !s.category);
  };

  // Vendor Team Members (Sticker/Box/Ziplock/Butter Paper role, department 'Vendors')
  // only see queue rows routed to them for that type — mirrors the backend's
  // StickerRequest.vendorId scoping on getStickerRequests. Everyone else (Admin/Sales/
  // Ops Head/etc.) sees every row, unchanged.
  const getVisibleQueueRows = (type, rows) => {
    const autoKeyForType = type === 'Frosted Ziplock' ? 'Ziplock' : type;
    const isMyVendorRole = currentUser?.department === 'Vendors' && currentUser?.role === autoKeyForType;
    if (!isMyVendorRole) return rows;
    return rows.filter((r) => {
      const sr = findStickerReq(r);
      // No request anywhere for this row yet — a brand-new, unclaimed row: show it
      // only to whoever is currently the Auto vendor for this type, since that's who
      // it'll be routed to once actioned.
      if (!sr) return automationVendors[autoKeyForType] === currentUser._id;
      // Backend marks a request routed to a different teammate this way (redacted,
      // no vendorId exposed) — it's no longer mine to see, even if I'm still the
      // type's Auto default; a request that's mine or legacy-unassigned comes through
      // in full and is always visible.
      return !sr.assignedElsewhere;
    });
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
  const [invoiceFiles, setInvoiceFiles] = useState({});
  const [sendingDesignConfirmation, setSendingDesignConfirmation] = useState({});
  const [invoiceUploading, setInvoiceUploading] = useState({});

  // Design uploads (Sticker/Box/Frosted Ziplock/Butter Paper) must be PDF only — the
  // WhatsApp "Design Confirmation" send attaches this file as a document, which the
  // Design Confirmation template is configured to expect as a PDF.
  const handleUpload = (itemKey, fileList) => {
    const invalid = fileList.some((f) => {
      const file = f.originFileObj || f;
      const isPdfType = file?.type ? file.type === 'application/pdf' : true;
      const isPdfName = /\.pdf$/i.test(f.name || '');
      return !(isPdfType && isPdfName);
    });
    if (invalid) {
      enqueueSnackbar('Only PDF files are allowed for the design upload', { variant: 'error' });
      return;
    }
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
      let matchDate = true;
      if (orderMgmtDateRange) {
        const d = order.createdAt ? order.createdAt.slice(0, 10) : '';
        matchDate = d >= orderMgmtDateRange[0] && d <= orderMgmtDateRange[1];
      }
      return matchSearch && matchStatus && matchDate;
    });
    return [...result].sort((a, b) => {
      if (b.hasEmergencyProducts && !a.hasEmergencyProducts) return 1;
      if (a.hasEmergencyProducts && !b.hasEmergencyProducts) return -1;
      if (b.isUrgent && !a.isUrgent) return 1;
      if (a.isUrgent && !b.isUrgent) return -1;
      return 0;
    });
  }, [searchText, orderStatusFilter, orderMgmtDateRange, apiOrders]);

  const stats = [
    {
      label: 'Order Pending',
      value: apiOrders.filter((order) => !canAssignTaskFromChecks(checkStates[order.id])).length,
      color: '#C94F8A',
    },
    {
      label: 'Sticker Delivery',
      value: getVisibleQueueRows('Sticker', productionQueues.sticker).filter((item) => item.sent > 0 && !item.verified).length,
      color: '#B11E6A',
    },
    {
      label: 'Approval Waiting',
      value: stickerRequests.filter((s) => s.status === 'Waiting for Approval').length,
      color: '#8a1652',
    },
    {
      label: 'Box',
      value: getVisibleQueueRows('Box', productionQueues.box).length,
      color: '#6b1240',
    },
    {
      label: 'Frosted',
      value: getVisibleQueueRows('Frosted Ziplock', productionQueues.frosted).length,
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
          {record.deliveryType === 'Partial' && (
            <Tooltip title={`Partial delivery — ${record.partialQty || 0} now · balance ${record.balanceQty || 0} tracked under the same order ID`}>
              <Tag color="orange" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>
                Partial: {record.partialQty || 0} / bal {record.balanceQty || 0}
              </Tag>
            </Tooltip>
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
      title: 'Payment',
      dataIndex: 'paymentStatus',
      render: (value, record) => record.orderCategory === 'SAMPLE'
        ? <Text type="secondary">—</Text>
        : <Tag color={paymentStatusColor[value] || 'default'}>{value || 'Pending'}</Tag>,
      responsive: ['md'],
    },
    {
      title: 'Order Delivery Date',
      dataIndex: 'expectedDelivery',
      render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—',
      responsive: ['md'],
    },
    { title: 'Assigned To', dataIndex: 'assignedEmployee', responsive: ['lg'] },
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
          {(() => {
            const reqs = record.emergencyRequests || [];
            if (reqs.length === 0) return null;
            const readyForOps = reqs.filter((x) => x.salesApproved && !x.opsApproved);
            const awaitingSales = reqs.filter((x) => !x.salesApproved);
            const allApproved = reqs.every((x) => x.approved);
            if (readyForOps.length > 0) {
              return (
                <Tooltip title={`${readyForOps.length} product${readyForOps.length > 1 ? 's' : ''} approved by Sales Head. Click to review and approve as Operations Head.`}>
                  <Button
                    size="small"
                    danger
                    icon={<AlertFilled />}
                    style={{ fontWeight: 600 }}
                    onClick={(e) => { e.stopPropagation(); setEmergencyOpsApprovalOrder(record); }}
                  >
                    Approve Emergency ({readyForOps.length})
                  </Button>
                </Tooltip>
              );
            }
            if (awaitingSales.length > 0) {
              return (
                <Tooltip title="Emergency dispatch requested — awaiting Sales Head approval first">
                  <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>Awaiting Sales ({awaitingSales.length})</Tag>
                </Tooltip>
              );
            }
            if (allApproved) {
              return <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Emergency Approved</Tag>;
            }
            return null;
          })()}
          {record.lrMismatchStatus === 'pending' && !record.lrMismatchOpsApproved && (
            <Tooltip title={`The dispatch lorry receipt's ${(record.lrMismatchFields || []).join(' / ') || 'details'} don't match what was entered — Sales approval is also required. Click to review.`}>
              <Button
                size="small"
                danger
                icon={<AlertFilled />}
                style={{ fontWeight: 600 }}
                onClick={(e) => { e.stopPropagation(); setLrMismatchOpsOrder(record); }}
              >
                LR Mismatch — Review
              </Button>
            </Tooltip>
          )}
          {record.lrMismatchStatus === 'pending' && record.lrMismatchOpsApproved && !record.lrMismatchSalesApproved && (
            <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>LR Mismatch: Awaiting Sales</Tag>
          )}
          {record.lrMismatchStatus === 'approved' && (
            <Tag color="success" style={{ fontSize: 10, margin: 0 }}>LR Mismatch Approved</Tag>
          )}
          {record.lrMismatchStatus === 'rejected' && (
            <Tag color="error" style={{ fontSize: 10, margin: 0 }}>LR Mismatch Rejected</Tag>
          )}
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
        render: (value, record) => {
          const ord = apiOrders.find((o) => o.id === record.orderId);
          const isPartial = ord?.deliveryType === 'Partial';
          return (
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
              {isPartial && (
                <Tooltip title={`Partial delivery — produce ${ord.partialQty || 0} now · balance ${ord.balanceQty || 0} follows under the same order ID`}>
                  <Tag color="orange" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '16px' }}>
                    Partial: {ord.partialQty || 0} / bal {ord.balanceQty || 0}
                  </Tag>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
      { title: 'Hotel Name', dataIndex: 'hotelLogo' },
      {
        title: 'Logo',
        key: 'logo',
        width: 80,
        render: (_, record) => {
          if (record.isKitChild) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
          const ord = apiOrders.find((o) => o.id === record.orderId);
          const url = record.logoUrl || ord?.logoUrl;
          if (!url) {
            return record.logoRequired
              ? <Tag color="orange" style={{ fontSize: 10 }}>Logo Req.</Tag>
              : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
          }
          const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
          if (isImage) {
            return (
              <Popover
                content={
                  <div style={{ textAlign: 'center' }}>
                    <img src={url} alt="logo" style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }} />
                    <div style={{ marginTop: 8 }}>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1890ff' }}>Open full size ↗</a>
                    </div>
                  </div>
                }
                title="Hotel Logo"
                trigger="click"
                placement="left"
              >
                <img
                  src={url}
                  alt="logo"
                  style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #e0d0e8', cursor: 'pointer' }}
                />
              </Popover>
            );
          }
          return (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#B11E6A', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <EyeOutlined style={{ fontSize: 12 }} /> View
            </a>
          );
        },
      },
      {
        title: 'Product',
        dataIndex: 'product',
        render: (value, record) => {
          if (record.isKitParent) {
            const count = record.children?.length || 0;
            return (
              <Space size={4}>
                <Tag color="blue" style={{ fontWeight: 600, margin: 0 }}>Kit</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>{count} Product{count !== 1 ? 's' : ''}</Text>
              </Space>
            );
          }
          return (
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
          );
        },
      },
      {
        title: 'Category',
        dataIndex: 'category',
        width: 130,
        render: (value) => {
          const meta = ORDER_CATEGORY_META[value] || ORDER_CATEGORY_META.separate_product;
          return <Tag style={{ background: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}55`, borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{meta.label}</Tag>;
        },
      },
      {
        title: label === 'Box' ? 'Size / PVK' : 'Size',
        dataIndex: 'size',
        render: (value, record) => {
          const display = formatSizeWithUnit(value, record.unit);
          if (record.isKitChild) return display ? <Text type="secondary" style={{ fontSize: 11 }}>{display}</Text> : <Text type="secondary">—</Text>;
          return display ? <Tag color="geekblue">{display}</Tag> : '—';
        },
      },
      {
        title: 'Sticker Size',
        dataIndex: 'stickerSize',
        render: (value, record) => {
          if (record.isKitChild) return value ? <Text type="secondary" style={{ fontSize: 11 }}>{value}</Text> : <Text type="secondary">—</Text>;
          return value ? <Tag color="magenta">{value}</Tag> : '—';
        },
      },
      ...(label !== 'Sticker' ? [{
        title: label === 'Box' ? 'Box Type' : label === 'Butter Paper' ? 'Butter Paper Type'
          : label === 'Wooden Brush' ? 'Wooden Brush Type' : label === 'Other' ? 'Other Type' : 'Ziplock Type',
        key: 'displayUnitType',
        render: (_, record) => {
          if (record.isKitChild) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
          // A personalized kit's individual-packing step (dual-step routing — see makeBoxRow/
          // makeFrostedRow/makeButterRow in data.js) can land this row in a tab that differs from
          // the kit's OWN display unit — e.g. a Butter-Paper kit's Paste/Brush still needs an
          // individual Box-packing step. record.displayUnitType always carries the kit's REAL
          // display-unit subtype (e.g. "transparent"), so only label it as this tab's type when
          // the kit's display unit actually matches this tab — otherwise it isn't a Box/Ziplock/
          // Butter Paper type at all and showing it here mislabels it.
          const tabCanonical = label === 'Frosted Ziplock' ? 'Ziplock' : label;
          if (record.displayUnit && packTabFromString(record.displayUnit) !== tabCanonical) {
            return <Text type="secondary">—</Text>;
          }
          return record.displayUnitType ? <Tag color="purple">{record.displayUnitType}</Tag> : <Text type="secondary">—</Text>;
        },
      }] : []),
      ...(label === 'Box' ? [{
        title: 'Lamination',
        key: 'lamination',
        render: (_, record) => {
          if (record.isKitChild) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
          const val = (record.lamination || '').toUpperCase();
          if (!val) return <Text type="secondary">—</Text>;
          return <Tag color={val === 'YES' ? 'green' : 'default'}>{val === 'YES' ? 'Yes' : 'No'}</Tag>;
        },
      }] : []),
      {
        title: 'Qty',
        dataIndex: 'qty',
        render: (value, record) => {
          if (record.isKitParent) {
            return (
              <Space direction="vertical" size={0}>
                <Text strong>{(value || 0).toLocaleString()}</Text>
                <Text type="secondary" style={{ fontSize: 10 }}>total</Text>
              </Space>
            );
          }
          return (value || 0).toLocaleString();
        },
      },
      ...(isStickerTab ? [{
        title: 'Sticker Printing',
        dataIndex: 'stickerPrinting',
        render: (val, record) => {
          if (record.isKitChild) return <Text type="secondary">—</Text>;
          return <Tag color={val === 'Yes' ? 'blue' : 'default'}>{val || '—'}</Tag>;
        },
      }] : []),
      ...(isStickerTab ? [{
        title: 'After Approval',
        dataIndex: 'packagingType',
        render: (val) => {
          const label = PACKAGING_TYPE_LABELS[val] || val || '—';
          const color = val === 'box' ? 'green' : val === 'frosted' ? 'orange' : val === 'butter' ? 'gold' : 'purple';
          return <Tag color={color}>{label}</Tag>;
        },
      }] : []),
      {
        title: 'Design',
        key: 'design',
        width: 100,
        render: (_, record) => {
          // Kit children (display-unit assembly) share the parent's single upload — show — here.
          // Individually-packed products are standalone rows (no isKitChild) and keep their own design.
          if (record.isKitChild) return <Text type="secondary">—</Text>;
          const sr = findStickerReq(record);
          const url = sr?.designFileUrl || findHotelDesign(record)?.designFileUrl;
          const isExisting = !sr?.designFileUrl && !!findHotelDesign(record)?.designFileUrl;
          if (!url) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
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
            <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#B11E6A', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <EyeOutlined style={{ fontSize: 12 }} /> View
              </a>
              {isExisting && <Tag color="green" style={{ fontSize: 10, margin: 0 }}>♻ Existing</Tag>}
            </Space>
          );
        },
      },
      {
        title: 'Printing Supplier',
        key: 'vendor',
        width: 150,
        render: (_, record) => {
          if (record.isKitChild) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
          const sr = findStickerReq(record);
          // Role values on the User are 'Ziplock', not the StickerRequest's 'Frosted Ziplock'.
          const roleForLabel = label === 'Frosted Ziplock' ? 'Ziplock' : label;
          const options = vendorUsers
            .filter(u => u.role === roleForLabel)
            .map(u => ({ value: u._id, label: u.fullName }));
          // Before any request exists yet, show who it WOULD auto-route to (Vendors &
          // Suppliers > Vendor Team Members "Auto" pick) so the name/switch is visible
          // from the first Pending row, not only after an action creates the request.
          const currentVendorId = sr
            ? (sr.vendorId?._id || sr.vendorId || undefined)
            : (automationVendors[roleForLabel] || undefined);
          return (
            <Select
              size="small"
              style={{ width: 140 }}
              placeholder="Unassigned"
              allowClear
              // Design Vendor team members (Sticker/Box/Ziplock/etc.) can see who a
              // request is routed to but must not reroute it themselves — only
              // Admin/Ops control printing-supplier assignment. Same department
              // check used elsewhere in this file (see `isAdminDept`, line ~208).
              disabled={currentUser?.department === 'Vendors'}
              value={currentVendorId}
              options={options}
              onChange={async (val) => {
                try {
                  if (sr?._id) {
                    await reassignStickerRequest({ id: sr._id, vendorId: val || null }).unwrap();
                  } else {
                    // No StickerRequest yet — create it now with the chosen supplier so the
                    // order is fully moved to them from the start, not just once actioned.
                    const ord = apiOrders.find((o) => o.id === record.orderId);
                    await createStickerRequest({
                      orderId: ord?.key,
                      hotelLogo: record.hotelLogo,
                      product: record.product,
                      category: record.category || '',
                      stickerType: label,
                      quantity: record.qty,
                      stickerSize: record.stickerSize || record.size,
                      vendorId: val || null,
                    }).unwrap();
                  }
                  enqueueSnackbar('Printing supplier reassigned — existing design & approval stay attached', { variant: 'success' });
                } catch (err) {
                  enqueueSnackbar(err?.data?.message || 'Failed to reassign printing supplier', { variant: 'error' });
                }
              }}
            />
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 320,
        render: (_, record) => {
          // Kit children (display-unit assembly) share the parent's single common upload —
          // no separate action buttons. Individually-packed products are standalone rows
          // (no isKitChild flag) and render their own full upload/approval flow below.
          if (record.isKitChild) {
            return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
          }
          const step = getQueueStep(record);
          const sr = findStickerReq(record);
          const existingHotelDesign = findHotelDesign(record);
          // Kit context: derive kit type name and products list for kit parent rows
          const kitTypeName = record.isKitParent
            ? (record.category === 'personalized' ? 'Personalized Kit'
              : (record.children?.[0]?.kitName || record.children?.[0]?.kitType || 'Separate Kit'))
            : '';
          const kitProductsList = record.isKitParent
            ? (record.children || []).map((c) => c.product || c.itemName || '').filter(Boolean)
            : [];
          return (
            <Space wrap size={4}>
              {step === 0 && (
                <>
                  {/* Rejection notice — shown when Sales/Ops sent this design back for rework.
                      Cleared automatically once "Send for Approval" is clicked again below. */}
                  {(sr?.salesRejected || sr?.opsHeadRejected) && (
                    <Alert
                      type="error"
                      showIcon
                      style={{ width: '100%', marginBottom: 4, padding: '4px 8px', fontSize: 11 }}
                      message={
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          {sr.salesRejected && (
                            <Text style={{ fontSize: 11 }}>
                              <b>Sales rejected</b> ({sr.salesRejectedBy?.fullName || 'Sales'}): {sr.salesRejectReason || 'No reason given'}
                            </Text>
                          )}
                          {sr.opsHeadRejected && (
                            <Text style={{ fontSize: 11 }}>
                              <b>Ops rejected</b> ({sr.opsHeadRejectedBy?.fullName || 'Ops'}): {sr.opsHeadRejectReason || 'No reason given'}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  )}
                  {/* Kit type + products label for kit parent rows */}
                  {record.isKitParent && kitTypeName && (
                    <Space direction="vertical" size={3} style={{ width: '100%', marginBottom: 4 }}>
                      <Space size={4}>
                        <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{kitTypeName}</Tag>
                        <Text type="secondary" style={{ fontSize: 10 }}>Design approval covers all kit products</Text>
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
                  )}
                  {/* If a previously approved design exists for this hotel+product, offer one-click reuse */}
                  {existingHotelDesign && !sr && (
                    <Tooltip title={`Previously approved design from a past order — click to use it directly without re-approval`}>
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff', borderRadius: 6 }}
                        onClick={async () => {
                          const ord = apiOrders.find((o) => o.id === record.orderId);
                          const queueType = queueTypeFromKey(record.key);
                          try {
                            await createStickerRequest({
                              orderId: ord?.key,
                              hotelLogo: record.hotelLogo,
                              product: record.product,
                              category: record.category || '',
                              stickerType: queueType,
                              quantity: record.qty,
                              stickerSize: record.stickerSize || record.size,
                              designFileUrl: existingHotelDesign.designFileUrl,
                              status: 'Approved',
                              salesApproved: true,
                              salesApprovedAt: new Date(),
                              opsHeadApproved: true,
                              opsHeadApprovedAt: new Date(),
                              ...(kitTypeName && { kitType: kitTypeName }),
                              ...(kitProductsList.length && { kitProducts: kitProductsList }),
                            }).unwrap();
                            advanceStep(record.key, 2);
                            enqueueSnackbar(`Existing design applied — ${kitTypeName || record.product} marked Approved`, { variant: 'success' });
                          } catch (err) {
                            enqueueSnackbar(err?.data?.message || err?.data || 'Failed to apply existing design', { variant: 'error' });
                          }
                        }}
                      >
                        ♻ Use Existing Design
                      </Button>
                    </Tooltip>
                  )}
                  <Tag color={existingHotelDesign && !sr ? 'default' : 'blue'}>{existingHotelDesign && !sr ? 'Or Upload New' : 'Designing'}</Tag>
                  <Upload
                    beforeUpload={() => false}
                    fileList={uploadedFiles[record.key] || []}
                    onChange={({ fileList }) => handleUpload(record.key, fileList)}
                    maxCount={1}
                    accept=".pdf"
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
                        const queueType = queueTypeFromKey(record.key);
                        const existing = findStickerReq(record);
                        let stickerId;
                        if (existing) {
                          stickerId = existing._id;
                        } else {
                          const created = await createStickerRequest({
                            orderId: ord?.key,
                            hotelLogo: record.hotelLogo,
                            product: record.product,
                            // Category so a product shown twice in one tab (Separate Kit + Personalized)
                            // is approved separately per category.
                            category: record.category || '',
                            stickerType: queueType,
                            quantity: record.qty,
                            stickerSize: record.stickerSize || record.size,
                            ...(kitTypeName && { kitType: kitTypeName }),
                            ...(kitProductsList.length && { kitProducts: kitProductsList }),
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
                  {/* Kit type + products for kit parent rows */}
                  {(record.isKitParent && (sr?.kitType || kitTypeName)) && (
                    <Space direction="vertical" size={3} style={{ width: '100%', marginBottom: 4 }}>
                      <Space size={4}>
                        <Tag color="purple" style={{ borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{sr?.kitType || kitTypeName}</Tag>
                        <Text type="secondary" style={{ fontSize: 10 }}>Approval covers all kit products</Text>
                      </Space>
                      {((sr?.kitProducts?.length > 0) || kitProductsList.length > 0) && (
                        <Space wrap size={3}>
                          <Text type="secondary" style={{ fontSize: 10 }}>Includes:</Text>
                          {(sr?.kitProducts?.length > 0 ? sr.kitProducts : kitProductsList).map((p, i) => (
                            <Tag key={i} color="geekblue" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>{p}</Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  )}
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
                      accept=".pdf"
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
                    loading={!!sendingDesignConfirmation[record.key]}
                    onClick={async () => {
                      const ord = apiOrders.find((o) => o.id === record.orderId);
                      try {
                        // Existing internal "sent to team" bookkeeping (dispatchedToOps flag) — unchanged.
                        await sendToStickerTeam({ id: sr?._id || record.key, orderId: record.orderId, type: label }).unwrap();
                        // Real customer/sales-person WhatsApp send via the "Design Confirmation" event.
                        if (sr?._id) {
                          setSendingDesignConfirmation((prev) => ({ ...prev, [record.key]: true }));
                          try {
                            const res = await sendDesignConfirmationWhatsApp({ id: sr._id }).unwrap();
                            enqueueSnackbar(res?.message || `WhatsApp sent to ${ord?.salesPerson || 'Sales'} & Customer`, { variant: 'success' });
                          } catch (waErr) {
                            enqueueSnackbar(waErr?.data?.message || waErr?.data || 'Failed to send WhatsApp message', { variant: 'error' });
                          } finally {
                            setSendingDesignConfirmation((prev) => ({ ...prev, [record.key]: false }));
                          }
                        } else {
                          enqueueSnackbar(`WhatsApp sent to ${ord?.salesPerson || 'Sales'} & Operations team`, { variant: 'success' });
                        }
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
                            category: record.category || '',
                            stickerType: 'Sticker',
                            quantity: record.qty,
                            stickerSize: record.stickerSize || record.size,
                          }).unwrap();
                          srId = created.data._id;
                        }
                        await updateStickerStatus({ id: srId, status: 'In Process' }).unwrap();
                        if (ord?.key) {
                          updateItemPrintingStatus({ orderId: ord.key, itemKey: record.key, printingStatus: 'Printing', product: record.product }).catch(() => {});
                        }
                        advanceStep(record.key, 3);
                        const dest = record.packagingType;
                        if (dest === 'box') {
                          setActiveTab('box');
                          enqueueSnackbar('Printing started — item moved to Box tab', { variant: 'info' });
                        } else if (dest === 'frosted') {
                          setActiveTab('frosted');
                          enqueueSnackbar('Printing started — item moved to Frosted Ziplock tab', { variant: 'info' });
                        } else if (dest === 'butter') {
                          setActiveTab('butter_paper');
                          enqueueSnackbar('Printing started — item moved to Butter Paper tab', { variant: 'info' });
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
                  {/* Upload invoice from print vendor */}
                  <Upload
                    beforeUpload={() => false}
                    fileList={invoiceFiles[record.key] || []}
                    onChange={({ fileList }) => setInvoiceFiles(prev => ({ ...prev, [record.key]: fileList }))}
                    maxCount={1}
                    accept=".jpg,.jpeg,.png,.pdf"
                    showUploadList={false}
                    disabled={!!invoiceUploading[record.key]}
                  >
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      style={{ borderColor: '#722ed155', color: '#722ed1' }}
                      disabled={!!invoiceUploading[record.key]}
                    >
                      {sr?.invoiceFile?.url ? 'Re-upload Invoice' : 'Upload Invoice'}
                    </Button>
                  </Upload>
                  {invoiceFiles[record.key]?.length > 0 && (
                    <Button
                      size="small"
                      type="primary"
                      loading={!!invoiceUploading[record.key]}
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                      onClick={async () => {
                        if (!sr?._id) { enqueueSnackbar('No sticker request found to attach invoice', { variant: 'warning' }); return; }
                        const f = invoiceFiles[record.key]?.[0]?.originFileObj || invoiceFiles[record.key]?.[0];
                        if (!f) return;
                        setInvoiceUploading(prev => ({ ...prev, [record.key]: true }));
                        try {
                          const fd = new FormData();
                          fd.append('invoice', f);
                          await uploadStickerInvoice({ id: sr._id, formData: fd }).unwrap();
                          setInvoiceFiles(prev => ({ ...prev, [record.key]: [] }));
                          enqueueSnackbar(
                            sr?.invoiceFile?.url
                              ? 'Invoice re-uploaded successfully'
                              : 'Invoice uploaded successfully',
                            { variant: 'success' }
                          );
                        } catch (err) {
                          enqueueSnackbar(err?.data?.message || 'Invoice upload failed', { variant: 'error' });
                        } finally {
                          setInvoiceUploading(prev => ({ ...prev, [record.key]: false }));
                        }
                      }}
                    >
                      {sr?.invoiceFile?.url ? 'Re-send Invoice' : 'Send Invoice'}
                    </Button>
                  )}
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
      // Admin/Management-department-only (or Super Admin role): removes this row from
      // THIS queue tab only — the underlying Order/items are untouched. Restorable from
      // Settings > Deleted Records.
      ...(isAdminDept ? [{
        title: '', key: 'delete', width: 50,
        render: (_, record) => (
          <Popconfirm
            title="Remove this row from the queue?"
            description={`It will disappear from the ${label} queue only and can be restored from Settings → Deleted Records.`}
            onConfirm={(e) => { e?.stopPropagation?.(); handleHideQueueRow(record, label); }}
            onCancel={(e) => e?.stopPropagation?.()}
            okText="Remove" okButtonProps={{ danger: true }} cancelText="Cancel"
          >
            <Tooltip title="Remove from queue">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Tooltip>
          </Popconfirm>
        ),
      }] : []),
    ];
  };

  const openRequestModal = (type) => {
    if (!requireAccess('add')) return;
    setRequestType(type);
    requestForm.resetFields();
    // Auto-fill the automation vendor for this type
    const autoKey = type === 'Frosted Ziplock' ? 'Ziplock' : type;
    // 'Wooden Brush'/'Other' automation-vendor keys are the same string as `type`, so the
    // ternary above already resolves them correctly — no additional branch needed.
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
        vendorId: vals.vendorId || undefined,
      }).unwrap();
      requestForm.resetFields();
      setRequestOpen(false);
      enqueueSnackbar(`${requestType} request submitted`, { variant: 'success' });
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to submit request', { variant: 'error' });
    }
  };

  const renderQueueCard = (type, rows, label, search, setSearch, dateRange, setDateRange) => {
    const visibleRows = getVisibleQueueRows(type, rows);
    // Sort priority:
    //   1. Emergency products from urgent orders (process these FIRST)
    //   2. Other items from urgent orders
    //   3. All other items
    const allActive = visibleRows
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
    // Rows carry no date field of their own — resolve "when this happened" via the parent
    // order's createdAt so the date-range filter below can apply to both active and closed rows.
    const rowDateStr = (r) => {
      const ord = apiOrders.find((o) => o.id === r.orderId);
      return ord?.createdAt ? ord.createdAt.slice(0, 10) : '';
    };
    const matchesDateRange = (r) => {
      if (!dateRange) return true;
      const d = rowDateStr(r);
      return d >= dateRange[0] && d <= dateRange[1];
    };
    // A row is hidden (Admin/Management "delete from this queue") if its order's real _id
    // + row key pair is in the archive fetched via getHiddenQueueRows. Row objects carry the
    // order CODE as `orderId`, so resolve the real _id through apiOrders the same way it was
    // stored when the row was hidden.
    const isRowHidden = (r) => {
      const ord = apiOrders.find((o) => o.id === r.orderId);
      return hiddenQueueRowKeys.has(`${ord?.key || r.orderId}:${r.key}`);
    };
    const closedRows = visibleRows.filter((r) => getQueueStep(r) === 6).filter(matchesDateRange);
    const activeRows = allActive.filter((r) => {
      const q = (search || '').toLowerCase();
      return !q || (r.orderId || '').toLowerCase().includes(q) || (r.hotelLogo || '').toLowerCase().includes(q) || (r.product || '').toLowerCase().includes(q);
    }).filter(matchesDateRange).filter((r) => !isRowHidden(r));

    // For Box/Frosted tabs: group only true kit orders (kitDisplayUnit set) under one
    // shared parent row. Non-kit orders with multiple products stay as individual rows.
    let tableSource = activeRows;
    if (type !== 'Sticker') {
      const typeKey = type === 'Box' ? 'box' : type === 'Butter Paper' ? 'butter'
        : type === 'Wooden Brush' ? 'wooden_brush' : type === 'Other' ? 'other' : 'frosted';
      const orderMap = new Map();
      activeRows.forEach((row) => {
        // Group by order, composition category, AND which specific kit (kitId, falling back to
        // kitName for legacy rows without one) — so a Separate Kit group and the Personalized
        // (outer-packing) group of the SAME order render as distinct kit blocks in this tab, AND
        // two DIFFERENT kits sharing the same category+tab (e.g. two Separate Kits both routed to
        // Box) get their OWN parent row/approval instead of merging into one shared one. Without
        // the kit identity segment, sending a single kit's design for approval silently covered
        // every other same-category kit in the order too (whichever kit's name `group[0]` happened
        // to be), since they'd all collapse into one 'kit parent' row sharing one StickerRequest.
        const gkey = `${row.orderId}|${row.category || ''}|${row.kitId || row.kitName || ''}`;
        if (!orderMap.has(gkey)) orderMap.set(gkey, []);
        orderMap.get(gkey).push(row);
      });
      tableSource = [];
      orderMap.forEach((group) => {
        const orderId = group[0].orderId;
        const order = apiOrders.find((o) => o.id === orderId);
        const isKitOrder = !!(order?.kitDisplayUnit);
        // Group under a kit parent ONLY when items are here for KIT ASSEMBLY — i.e. the
        // order's display unit matches this tab's packaging type. When products land in this
        // tab via their own individual packingMaterialTab (not the kit display unit), show
        // each product as a standalone row with its own upload — no shared parent row.
        // Match by the display unit NAME too, so kit orders whose display unit has no
        // packing-config tabMapping (displayUnitTab unresolved) still group like Box does.
        const duNameLc = (order?.kitDisplayUnit || order?.displayUnit || '').toLowerCase();
        const displayUnitMatchesTab =
          (typeKey === 'box' && (order?.displayUnitTab === 'Box' || duNameLc.includes('box'))) ||
          (typeKey === 'frosted' && (order?.displayUnitTab === 'Ziplock' || (!duNameLc.includes('butter') && (duNameLc.includes('ziplock') || duNameLc.includes('frosted') || duNameLc.includes('pouch'))))) ||
          (typeKey === 'butter' && (order?.displayUnitTab === 'Butter Paper' || duNameLc.includes('butter'))) ||
          (typeKey === 'wooden_brush' && (order?.displayUnitTab === 'Wooden Brush' || duNameLc.includes('wooden') || duNameLc.includes('brush'))) ||
          (typeKey === 'other' && order?.displayUnitTab === 'Other');
        // Row-based fallback: group when every row in this tab for this order is a KIT row whose
        // destination IS this tab. Handles multi-kit orders where each kit routes by its OWN
        // display unit (so the order-level display unit may not match this tab).
        const groupAllKitForThisTab = group.length > 1 && group.every((r) => r.isKit && r.packagingType === typeKey);
        const shouldGroupAsKit = (isKitOrder && displayUnitMatchesTab) || groupAllKitForThisTab;
        if (!shouldGroupAsKit || group.length === 1) {
          // Non-kit, single-product, or individual-packing kit items: shown individually.
          // For kit orders with kit size, apply that size to each row.
          group.forEach((row) => {
            const rowToShow = (isKitOrder && order?.kitSize) ? { ...row, size: order.kitSize } : row;
            tableSource.push(rowToShow);
          });
        } else {
          // Kit assembly: one shared parent row (display unit upload) with per-product children.
          // Key suffix must still literally END in -box/-frosted/-butter — several spots in this
          // file (findStickerReq and the design/print onClick handlers) match on
          // item.key?.endsWith('-box') etc. — so the kit identity segment goes
          // BEFORE the '-kit-<type>' tail, not after, so that suffix check keeps working. It
          // keeps two different kits sharing this category+tab from colliding on the same
          // React key / parent row (and, more importantly, from colliding in downstream
          // per-key step/queue tracking that would otherwise treat them as the same row).
          const first = group[0];
          const kitIdentity = first.kitId || first.kitName || '';
          tableSource.push({
            key: `${orderId}-${first.category || 'kit'}${kitIdentity ? `-${kitIdentity}` : ''}-kit-${typeKey}`,
            orderId,
            orderCategory: first.orderCategory,
            hotelLogo: first.hotelLogo,
            logoRequired: first.logoRequired,
            logoUrl: first.logoUrl,
            isUrgent: first.isUrgent,
            isEmergencyProduct: group.some((r) => r.isEmergencyProduct),
            isEmergencyGated: group.every((r) => r.isEmergencyGated),
            qty: (() => {
              const cat = first.category || '';
              // Show kit assembly count, not the sum of per-product quantities inside the kit.
              // Match by kitOrders FIRST (covers personalized too — an order can hold several
              // personalized kits, each with its own overallQty) so two personalized kits with
              // DIFFERENT quantities each report their own count instead of both showing the
              // order-level total. Separate kits (dental/shaving/bath/etc.) already relied on this
              // same per-kit filter — without the kitId/kitName check, two different kits sharing a
              // tab would each report the OTHER kit's qty added in.
              const kos = order?.kitOrders || [];
              if (kos.length) {
                const tabLabel = typeKey === 'box' ? 'Box' : typeKey === 'frosted' ? 'Ziplock'
                  : typeKey === 'wooden_brush' ? 'Wooden Brush' : typeKey === 'other' ? 'Other' : 'Butter Paper';
                const matching = kos.filter((ko) => {
                  const du = ko.displayUnit || '';
                  const tab = displayUnitTabMap[du] || packTabFromString(du);
                  if (tab !== tabLabel) return false;
                  if (!kitIdentity) return true;
                  return String(ko.kitId || '') === String(first.kitId || '') || (ko.kitName || '') === (first.kitName || '');
                });
                if (matching.length) return matching.reduce((s, ko) => s + (Number(ko.overallQty) || 0), 0);
              }
              // Personalized outer packing step, legacy order with no matching per-kit entry:
              // fall back to the top-level kit count.
              if (cat === 'personalized' && order?.kitOverallQty) return Number(order.kitOverallQty);
              // Fallback for non-kit or data-missing cases.
              return group.reduce((sum, r) => sum + Number(r.qty || 0), 0);
            })(),
            product: 'Kit',
            category: first.category,
            kitId: first.kitId || '',
            kitName: first.kitName || '',
            size: order?.kitSize || null,
            stickerPrinting: first.stickerPrinting,
            packagingType: first.packagingType,
            displayUnit: first.displayUnit || '',
            displayUnitType: first.displayUnitType || '',
            lamination: first.lamination || '',
            sticker: first.sticker || '',
            printing: first.printing || '',
            packingMaterial: first.packingMaterial || '',
            isKitParent: true,
            children: group.map((r) => ({ ...r, isKitChild: true })),
          });
        }
      });
    }

    // Final display order:
    //   1. Every row belonging to an EMERGENCY ORDER floats to the top TOGETHER (isUrgent is an
    //      order-level flag carried by every row/kit of that order) — not just the one row/kit
    //      that happens to carry the flagged emergency product. Box/Ziplock/Butter split a single
    //      order into separate category groups (personalized / separate kit / separate product);
    //      keying only off the per-item isEmergencyProduct flag left the order's OTHER groups
    //      behind, so part of the order stayed below the fold. isUrgent fixes that.
    //   2. Within an emergency order's own rows, the row/kit carrying the actual flagged
    //      emergency product(s) still leads.
    //   3. Then newest order first (descending by date — apiOrders is already sorted -createdAt
    //      by the backend, so ascending orderRank = newest first).
    //   4. Then order-composition category (personalized → separate kit → separate product), so
    //      each category reads as a group within the same order.
    const CATEGORY_ORDER = { personalized: 0, separate_kit: 1, separate_product: 2 };
    const orderRank = new Map(apiOrders.map((o, idx) => [o.id, idx]));
    tableSource = [...tableSource].sort((a, b) => {
      const aUrgent = a.isUrgent ? 1 : 0;
      const bUrgent = b.isUrgent ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      const aEmg = a.isEmergencyProduct ? 1 : 0;
      const bEmg = b.isEmergencyProduct ? 1 : 0;
      if (aEmg !== bEmg) return bEmg - aEmg;
      const ra = orderRank.has(a.orderId) ? orderRank.get(a.orderId) : Number.MAX_SAFE_INTEGER;
      const rb = orderRank.has(b.orderId) ? orderRank.get(b.orderId) : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      const ca = CATEGORY_ORDER[a.category] ?? 3;
      const cb = CATEGORY_ORDER[b.category] ?? 3;
      return ca - cb;
    }).filter((r) => !isRowHidden(r));

    return (
      <div>
        {renderQueueSummary(allActive)}
        <Card
          title={<Text strong style={{ color: textColor }}>{label}</Text>}
          extra={
            <Space>
              <Button
                icon={<UploadOutlined />}
                type="primary"
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                onClick={() => navigate(`/operations/invoices/${INVOICE_TYPE_SLUG[type] || 'sticker'}`)}
              >
                Upload Invoice
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => openRequestModal(type)}>
                New {type} Request
              </Button>
            </Space>
          }
          style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search order, hotel, product..." allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 230, borderRadius: 8 }} />
            <DatePicker.RangePicker
              style={{ borderRadius: 8 }}
              onChange={(dates) => setDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
              allowClear
            />
          </div>
          <div className="table-responsive" style={{ padding: 4 }}>
            <Table
              dataSource={tableSource}
              columns={queueColumns(type)}
              // Kit parent rows carry a `children` array (used for the "Includes" summary tags
              // and product count elsewhere) but that must never render as AntD's built-in nested
              // rows — the kit parent row's Actions/Product columns already summarize the included
              // products, so a per-product breakdown underneath is redundant clutter.
              expandable={{ childrenColumnName: '__kitChildrenNotExpandable' }}
              pagination={type === 'Sticker' ? { showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' } : false}
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
                      <DatePicker.RangePicker
                        style={{ borderRadius: 8 }}
                        onChange={(dates) => setOrderMgmtDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                        allowClear
                      />
                    </Space>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: '0 0 8px 0' } }}
                >
                  <Tabs
                    activeKey={orderMgmtInnerTab}
                    onChange={setOrderMgmtInnerTab}
                    size="small"
                    style={{ padding: '0 12px' }}
                    items={[
                      {
                        key: 'order',
                        label: (
                          <Space size={4}>
                            <ToolOutlined />
                            Orders
                            <Tag color="pink" style={{ margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
                              {filteredOrders.filter((o) => o.orderCategory !== 'SAMPLE').length}
                            </Tag>
                          </Space>
                        ),
                        children: (
                          <div className="table-responsive" style={{ padding: 4 }}>
                            <Table
                              dataSource={filteredOrders.filter((o) => o.orderCategory !== 'SAMPLE')}
                              columns={orderColumns}
                              pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
                        ),
                      },
                      {
                        key: 'sample',
                        label: (
                          <Space size={4}>
                            <ExperimentOutlined />
                            Samples
                            <Tag color="purple" style={{ margin: 0, fontSize: 10, padding: '0 5px', lineHeight: '16px' }}>
                              {filteredOrders.filter((o) => o.orderCategory === 'SAMPLE').length}
                            </Tag>
                          </Space>
                        ),
                        children: (
                          <div className="table-responsive" style={{ padding: 4 }}>
                            <Table
                              dataSource={filteredOrders.filter((o) => o.orderCategory === 'SAMPLE')}
                              columns={orderColumns}
                              pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
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
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'sticker',
            label: <Space><TagsOutlined />Sticker Printing</Space>,
            children: renderQueueCard('Sticker', productionQueues.sticker, 'Sticker Queue', stickerSearch, setStickerSearch, stickerDateRange, setStickerDateRange),
          },
          {
            key: 'box',
            label: <Space><BoxPlotOutlined />Box</Space>,
            children: renderQueueCard('Box', productionQueues.box, 'Box Manufacturing Queue', boxSearch, setBoxSearch, boxDateRange, setBoxDateRange),
          },
          {
            key: 'frosted',
            label: <Space><InboxOutlined />Frosted Ziplock</Space>,
            children: renderQueueCard('Frosted Ziplock', productionQueues.frosted, 'Frosted Ziplock Queue', frostedSearch, setFrostedSearch, frostedDateRange, setFrostedDateRange),
          },
          {
            key: 'butter_paper',
            label: <Space><ContainerOutlined />Butter Paper</Space>,
            children: renderQueueCard('Butter Paper', productionQueues.butter, 'Butter Paper Queue', butterSearch, setButterSearch, butterDateRange, setButterDateRange),
          },
          {
            key: 'wooden_brush',
            label: <Space><BoxPlotOutlined />Wooden Brush</Space>,
            children: renderQueueCard('Wooden Brush', productionQueues.wooden_brush, 'Wooden Brush Queue', woodenBrushSearch, setWoodenBrushSearch, woodenBrushDateRange, setWoodenBrushDateRange),
          },
          {
            key: 'other',
            label: <Space><ContainerOutlined />Other</Space>,
            children: renderQueueCard('Other', productionQueues.other, 'Other Queue', otherSearch, setOtherSearch, otherDateRange, setOtherDateRange),
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
                : requestType === 'Butter Paper' ? 'butter'
                : requestType === 'Wooden Brush' ? 'wooden_brush'
                : requestType === 'Other' ? 'other'
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
                  if (selectedQueueItem) {
                    updateItemPrintingStatus({ orderId: ord.key, itemKey: selectedQueueItem.key, printingStatus: 'Yet to Receive', product: selectedQueueItem.product }).catch(() => {});
                  }
                }
                // Persist dispatch on the StickerRequest so the step survives page refresh.
                // findStickerReq uses the key suffix (-box/-frosted/-butter) to find the right SR type.
                const sr = findStickerReq(selectedQueueItem);
                if (sr?._id) {
                  await updateStickerStatus({ id: sr._id, status: 'Dispatch' }).unwrap();
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

      {/* ── Emergency Dispatch — Ops Head Approval Modal ──────────────────── */}
      <Modal
        title={<Space><AlertFilled style={{ color: '#f5222d' }} /><span>Approve Emergency Dispatch — Operations Head</span></Space>}
        open={!!emergencyOpsApprovalOrder}
        onCancel={() => setEmergencyOpsApprovalOrder(null)}
        width={Math.min(560, window.innerWidth - 32)}
        footer={[<Button key="cancel" onClick={() => setEmergencyOpsApprovalOrder(null)}>Close</Button>]}
      >
        {emergencyOpsApprovalOrder && (() => {
          // Re-derive the live row so the list updates in place as each product is
          // approved, instead of freezing on the snapshot taken when the modal opened.
          const liveOrder = apiOrders.find((o) => o.key === emergencyOpsApprovalOrder.key) || emergencyOpsApprovalOrder;
          const requests = liveOrder.emergencyRequests || [];
          const pending = requests.filter((x) => x.salesApproved && !x.opsApproved);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              <Alert type="error" showIcon
                message="Emergency Dispatch — Payment Pending — Final Approval Required"
                description="This order is complete but payment has NOT been collected. The Sales Head has already approved emergency dispatch for one or more products. As Operations Head, your approval per product is the final step — it authorizes the dispatch team to proceed with delivery immediately despite the pending payment."
                style={{ borderRadius: 8, whiteSpace: 'pre-wrap' }}
              />
              <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                <Descriptions.Item label="Order ID"><span style={{ color: '#B11E6A', fontWeight: 700 }}>{liveOrder.id}</span></Descriptions.Item>
                <Descriptions.Item label="Client">{liveOrder.hotelLogo}</Descriptions.Item>
                <Descriptions.Item label="Total Amount">₹{(liveOrder.totalAmount || 0).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Payment Status"><Tag color="error">Pending</Tag></Descriptions.Item>
              </Descriptions>
              {pending.length === 0 ? (
                <Alert type="success" showIcon message="All Sales-approved emergency requests for this order have been approved by Operations." style={{ borderRadius: 8 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Products awaiting your approval ({pending.length})</Text>
                    {pending.length > 1 && (
                      <Button size="small" danger loading={approvingAllEmergency}
                        onClick={async () => {
                          setApprovingAllEmergency(true);
                          try {
                            for (const req of pending) {
                              // eslint-disable-next-line no-await-in-loop
                              await approveEmergencyOpsHead(req.taskId).unwrap();
                            }
                            enqueueSnackbar(`Emergency dispatch fully approved for all ${pending.length} product(s). Dispatch team has been notified.`, { variant: 'success' });
                          } catch (err) {
                            enqueueSnackbar(err?.data?.message || 'Some approvals failed — please retry the remaining product(s).', { variant: 'error' });
                          } finally {
                            setApprovingAllEmergency(false);
                          }
                        }}>
                        Approve All
                      </Button>
                    )}
                  </div>
                  {pending.map((req) => (
                    <div key={req.taskId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, border: '1px solid #ffccc7', background: '#fff2f0', borderRadius: 8, padding: '8px 12px' }}>
                      <div>
                        <Text strong>{req.product}</Text>
                        {req.reason && <div><Text type="secondary" style={{ fontSize: 12 }}>Reason: {req.reason}</Text></div>}
                      </div>
                      <Button size="small" type="primary" danger
                        loading={approvingEmergencyTaskId === req.taskId}
                        onClick={async () => {
                          setApprovingEmergencyTaskId(req.taskId);
                          try {
                            await approveEmergencyOpsHead(req.taskId).unwrap();
                            enqueueSnackbar(`Emergency dispatch fully approved for "${req.product}". Dispatch team has been notified.`, { variant: 'success' });
                          } catch (err) {
                            enqueueSnackbar(err?.data?.message || 'Approval failed', { variant: 'error' });
                          } finally {
                            setApprovingEmergencyTaskId(null);
                          }
                        }}>
                        Approve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Alert type="success" showIcon
                message="Sales Head Approval: Received ✓"
                description="The Sales Head has reviewed and approved these emergency dispatch requests. Your approval per product completes its authorization."
                style={{ borderRadius: 8 }}
              />
              <Alert type="warning" showIcon
                message="What happens after your approval?"
                description="The dispatch team will receive an immediate notification per approved product to proceed with delivery. This action cannot be undone."
                style={{ borderRadius: 8 }}
              />
            </div>
          );
        })()}
      </Modal>

      {/* ── Dispatch LR Mismatch (Packages/Destination) — Operations Approval Modal ── */}
      <Modal
        title={<Space><AlertFilled style={{ color: '#f5222d' }} /><span>LR Mismatch — Operations Review (Dual Approval)</span></Space>}
        open={!!lrMismatchOpsOrder}
        onCancel={() => setLrMismatchOpsOrder(null)}
        width={Math.min(560, window.innerWidth - 32)}
        footer={[<Button key="cancel" onClick={() => setLrMismatchOpsOrder(null)}>Close</Button>]}
      >
        {lrMismatchOpsOrder && (() => {
          const liveOrder = apiOrders.find((o) => o.key === lrMismatchOpsOrder.key) || lrMismatchOpsOrder;
          const isPending = liveOrder.lrMismatchStatus === 'pending';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              <Alert type="error" showIcon
                message={`${(liveOrder.lrMismatchFields || []).join(' & ') || 'Lorry Receipt'} Mismatch — Dual Approval Required`}
                description="The dispatch team scanned the lorry receipt via AI and one or more fields (other than Weight/Transport Name) disagree with what was entered manually. Both Sales AND Operations must approve before the dispatcher can proceed — a reject from either side blocks it."
                style={{ borderRadius: 8, whiteSpace: 'pre-wrap' }}
              />
              <Descriptions bordered size="small" column={1} style={{ borderRadius: 8 }}>
                <Descriptions.Item label="Order ID"><span style={{ color: '#B11E6A', fontWeight: 700 }}>{liveOrder.id}</span></Descriptions.Item>
                <Descriptions.Item label="Client">{liveOrder.hotelLogo}</Descriptions.Item>
                <Descriptions.Item label="Mismatched Fields">{(liveOrder.lrMismatchFields || []).join(', ') || '—'}</Descriptions.Item>
                <Descriptions.Item label="Reason Given">{liveOrder.lrMismatchReason || '—'}</Descriptions.Item>
                <Descriptions.Item label="Sales Approval">
                  {liveOrder.lrMismatchSalesApproved ? <Tag color="success">Approved ✓</Tag> : <Tag color="orange">Pending</Tag>}
                </Descriptions.Item>
              </Descriptions>
              {isPending ? (
                <Space>
                  <Button
                    type="primary"
                    loading={decidingLrMismatchOps}
                    onClick={async () => {
                      setDecidingLrMismatchOps(true);
                      try {
                        const res = await decideLrMismatchOps({ id: liveOrder.key, decision: 'approved' }).unwrap();
                        enqueueSnackbar(
                          res?.data?.dispatchLrMismatchStatus === 'approved'
                            ? 'LR mismatch fully approved — dispatch may proceed.'
                            : 'Operations approval recorded — awaiting Sales approval.',
                          { variant: 'success' },
                        );
                        setLrMismatchOpsOrder(null);
                      } catch (err) {
                        enqueueSnackbar(err?.data?.message || 'Failed to approve', { variant: 'error' });
                      } finally {
                        setDecidingLrMismatchOps(false);
                      }
                    }}>
                    Approve
                  </Button>
                  <Button
                    danger
                    loading={decidingLrMismatchOps}
                    onClick={async () => {
                      setDecidingLrMismatchOps(true);
                      try {
                        await decideLrMismatchOps({ id: liveOrder.key, decision: 'rejected' }).unwrap();
                        enqueueSnackbar('LR mismatch rejected.', { variant: 'success' });
                        setLrMismatchOpsOrder(null);
                      } catch (err) {
                        enqueueSnackbar(err?.data?.message || 'Failed to reject', { variant: 'error' });
                      } finally {
                        setDecidingLrMismatchOps(false);
                      }
                    }}>
                    Reject
                  </Button>
                </Space>
              ) : (
                <Alert
                  type={liveOrder.lrMismatchStatus === 'approved' ? 'success' : 'warning'}
                  showIcon
                  message={`Already ${liveOrder.lrMismatchStatus}`}
                  style={{ borderRadius: 8 }}
                />
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
