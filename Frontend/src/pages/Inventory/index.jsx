import React, { useState, useEffect, useMemo } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Input, Select,
  Typography, Space, Progress, Alert, InputNumber, List,
  Avatar, Divider, Drawer, Tabs, DatePicker, Upload, Switch, Descriptions,
  Badge, Tooltip,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, WarningOutlined, CalculatorOutlined, SearchOutlined, CheckOutlined,
  DownloadOutlined, ShoppingOutlined, LeftOutlined, CloseOutlined, EditOutlined,
  UserOutlined, InfoCircleOutlined, MinusOutlined,
  EyeOutlined, UploadOutlined, SafetyCertificateOutlined, HistoryOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SwapOutlined,
  ExclamationCircleOutlined, AuditOutlined,
  BellOutlined, BarChartOutlined, ContainerOutlined,
  SettingOutlined, DeleteOutlined, TagOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import dayjs from 'dayjs';
import {
  useGetItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useAddStockRequestMutation,
  useSellStockRequestMutation,
  useGetStockApprovalsQuery,
  useApproveMovementMutation,
  useRejectMovementMutation,
  useGetStockHistoryQuery,
  useSubmitStockCheckMutation,
  useGetVendorsQuery,
  useCreateVendorMutation,
  useGetKitsQuery,
  useCreateKitMutation,
  useUpdateKitMutation,
  useDeleteKitMutation,
  useGetPackingConfigQuery,
  useCreatePackingConfigMutation,
  useUpdatePackingConfigMutation,
  useDeletePackingConfigMutation,
  useGetMaterialStocksQuery,
  useCreateMaterialStockMutation,
  useUpdateMaterialStockMutation,
  useDeleteMaterialStockMutation,
  useUploadMaterialStockInvoiceMutation,
} from '../../store/api/apiSlice';
import SelectWithAdd from '../../components/common/SelectWithAdd';
import PhoneInput from '../../components/common/PhoneInput';
import VendorBankFields from '../../components/common/VendorBankFields';
import { emailRules, phoneValidator } from '../../utils/validation';
import { downloadFile } from '../../utils/fileDownload';

const { Title, Text } = Typography;
const { Option } = Select;


const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const KIT_PACKING = [{ value: 'Box', label: 'Box' }, { value: 'Butter paper pouch', label: 'Butter paper pouch' }];
const SOAP_SHAPES = [{ value: 'Square', label: 'Square' }, { value: 'Round', label: 'Round' }];
const BOTTLE_TYPES = [{ value: 'Fliptop bottle', label: 'Fliptop bottle' }, { value: 'Screw type', label: 'Screw type' }];
const CAP_TYPES = [{ value: 'Golden cap', label: 'Golden cap' }, { value: 'Normal cap', label: 'Normal cap' }];
const BRUSH_TYPES = [{ value: 'Wooden', label: 'Wooden' }, { value: 'Plastic', label: 'Plastic' }];
const SIZES_SOAP = ['15', '20', '30'].map(v => ({ value: v, label: `${v}g` }));
const SIZES_LIQUID = ['15', '20', '25', '30'].map(v => ({ value: v, label: `${v}ml` }));
const PASTE_BRANDS = ['Promise', 'Meswak', 'Anchor', 'Colgate'].map(v => ({ value: v, label: v }));
const BRUSH_BRANDS = ['Promise', 'Anchor', 'Pristin'].map(v => ({ value: v, label: v }));

// usePackingConfig: true → options are populated at render time from the packing config state
const PRODUCT_FIELD_DEFS = {
  soap: [
    { key: 'shape', label: 'Shape', field: 'soap_shape', options: SOAP_SHAPES },
    { key: 'size', label: 'Sizes (gram)', field: 'soap_size', options: SIZES_SOAP, mode: 'multiple' },
    { key: 'stickerShape', label: 'Sticker Shape', field: 'soap_stickerShape', options: SOAP_SHAPES },
    { key: 'fragrance', label: 'Fragrance', field: 'soap_fragrance', options: [], mode: 'multiple' },
    { key: 'color', label: 'Color', field: 'soap_color', options: [], mode: 'multiple' },
    { key: 'packingMaterial', label: 'Packing Material', field: 'soap_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'soap_stickerPrinting', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'soap_printing', options: YES_NO },
  ],
  shampoo: [
    { key: 'bottleType', label: 'Bottle Type', field: 'shampoo_bottleType', options: BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'shampoo_capType', options: CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'shampoo_size', options: SIZES_LIQUID, mode: 'multiple' },
    { key: 'fragrance', label: 'Fragrance', field: 'shampoo_fragrance', options: [], mode: 'multiple' },
    { key: 'color', label: 'Color', field: 'shampoo_color', options: [], mode: 'multiple' },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'shampoo_stickerPrinting', options: YES_NO },
  ],
  moisturizer: [
    { key: 'bottleType', label: 'Bottle Type', field: 'moisturizer_bottleType', options: BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'moisturizer_capType', options: CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'moisturizer_size', options: SIZES_LIQUID, mode: 'multiple' },
    { key: 'fragrance', label: 'Fragrance', field: 'moisturizer_fragrance', options: [], mode: 'multiple' },
    { key: 'color', label: 'Color', field: 'moisturizer_color', options: [], mode: 'multiple' },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'moisturizer_stickerPrinting', options: YES_NO },
  ],
  shower_gel: [
    { key: 'bottleType', label: 'Bottle Type', field: 'shower_gel_bottleType', options: BOTTLE_TYPES },
    { key: 'capType', label: 'Cap Type', field: 'shower_gel_capType', options: CAP_TYPES },
    { key: 'size', label: 'Sizes (ml)', field: 'shower_gel_size', options: SIZES_LIQUID, mode: 'multiple' },
    { key: 'fragrance', label: 'Fragrance', field: 'shower_gel_fragrance', options: [], mode: 'multiple' },
    { key: 'color', label: 'Color', field: 'shower_gel_color', options: [], mode: 'multiple' },
    { key: 'stickerPrinting', label: 'Sticker Printing', field: 'shower_gel_stickerPrinting', options: YES_NO },
  ],
  brush: [
    { key: 'brushType', label: 'Brush Type', field: 'brush_brushType', options: BRUSH_TYPES },
    { key: 'brand', label: 'Brand', field: 'brush_brand', options: BRUSH_BRANDS, mode: 'multiple' },
    { key: 'packingMaterial', label: 'Packing Material', field: 'brush_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'brush_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'brush_printing', options: YES_NO },
  ],
  paste: [
    { key: 'brand', label: 'Brand', field: 'paste_brand', options: PASTE_BRANDS, mode: 'multiple' },
    { key: 'size', label: 'Sizes (gram)', field: 'paste_size', options: SIZES_SOAP, mode: 'multiple' },
    { key: 'packingMaterial', label: 'Packing Material', field: 'paste_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'paste_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'paste_printing', options: YES_NO },
  ],
  razor: [
    { key: 'brand', label: 'Brand', field: 'razor_brand', options: [{ value: 'Gillette', label: 'Gillette' }, { value: 'darco', label: 'darco' }, { value: 'glide', label: 'glide' }], mode: 'multiple' },
    { key: 'packingMaterial', label: 'Packing Material', field: 'razor_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'razor_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'razor_printing', options: YES_NO },
  ],
  gel: [
    { key: 'brand', label: 'Brand', field: 'gel_brand', options: [{ value: 'oxylife', label: 'oxylife' }, { value: 'eliven', label: 'eliven' }], mode: 'multiple' },
    { key: 'packingMaterial', label: 'Packing Material', field: 'gel_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'gel_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'gel_printing', options: YES_NO },
  ],
  vanity_item: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'vanity_item_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'vanity_item_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'vanity_item_printing', options: YES_NO },
  ],
  med_kit: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'medkit_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'medkit_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'medkit_printing', options: YES_NO },
  ],
  sewing: [
    { key: 'packingMaterial', label: 'Packing Material', field: 'sewing_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
    { key: 'sticker', label: 'Sticker', field: 'sewing_sticker', options: YES_NO },
    { key: 'printing', label: 'Printing', field: 'sewing_printing', options: YES_NO },
  ],
};

// Generic attribute fields shown when the item name doesn't match any known product type.
const GENERIC_PRODUCT_FIELD_DEFS = [
  { key: 'fragrance', label: 'Fragrance', field: 'generic_fragrance', options: [], mode: 'multiple' },
  { key: 'material', label: 'Material', field: 'generic_material', options: [], mode: 'multiple' },
  { key: 'brand', label: 'Brand', field: 'generic_brand', options: [], mode: 'multiple' },
  { key: 'size', label: 'Size', field: 'generic_size', options: [] },
  { key: 'color', label: 'Color', field: 'generic_color', options: [], mode: 'multiple' },
  { key: 'packingMaterial', label: 'Packing Material', field: 'generic_packingMaterial', usePackingConfig: true, options: [], mode: 'multiple' },
  { key: 'sticker', label: 'Sticker', field: 'generic_sticker', options: YES_NO },
  { key: 'logo', label: 'Logo', field: 'generic_logo', options: YES_NO },
  { key: 'printing', label: 'Printing', field: 'generic_printing', options: YES_NO },
];

const getProductTypeKey = (name) => {
  const n = (name || '').toLowerCase().trim();
  if (n.includes('soap')) return 'soap';
  if (n.includes('shampoo')) return 'shampoo';
  if (n.includes('moisturizer') || n.includes('moisturiser')) return 'moisturizer';
  if (n.includes('shower gel') || n.includes('showergel') || n.includes('shower_gel')) return 'shower_gel';
  if (n.includes('razor')) return 'razor';
  if (n.includes('shower') && n.includes('gel')) return 'shower_gel';
  if (n.includes('gel')) return 'gel';
  if (n.includes('brush')) return 'brush';
  if (n.includes('paste')) return 'paste';
  if (n.includes('medkit') || n.includes('med kit')) return 'med_kit';
  if (n.includes('sweing') || n.includes('sewing')) return 'sewing';
  if (n.includes('vanitykit') || n.includes('vanity kit') || n.includes('vanity')) return 'vanity_item';
  return null;
};

// Convert a camelCase / snake_case product-attribute key into a readable label
// (e.g. "stickerShape" → "Sticker Shape", "bottleType" → "Bottle Type").
const prettyAttrKey = (k) =>
  String(k || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

// Normalize a productAttributes object into [label, value] entries, skipping empties.
const attrEntries = (attrs) =>
  Object.entries(attrs || {}).filter(
    ([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0),
  );


// Export an array of plain rows to a CSV file. Headers are derived from the
// scalar (non-object) keys of the rows so it adapts to whatever shape the data has.
const exportRowsToCSV = (rows, filename) => {
  if (!rows || rows.length === 0) return false;
  const skip = new Set(['key', '_id', '__v']);
  const headers = Object.keys(rows[0]).filter(
    (k) => !skip.has(k) && rows.every((r) => r[k] == null || typeof r[k] !== 'object'),
  );
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

export default function Inventory() {
  const makeUpload = useCloudinaryUpload();
  const isDark = useSelector((s) => s.theme.isDark);
  const authUser = useSelector((s) => s.auth.user);
  const isSuperOrAdmin = authUser?.role === 'Super Admin' || authUser?.role === 'Admin';
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#16161e' : '#fafafa';

  const [viewBillDetail, setViewBillDetail] = useState(null);

  const { data: invData, isLoading: invLoading } = useGetItemsQuery({ limit: 1000 });
  const { data: approvalsData } = useGetStockApprovalsQuery();
  const { data: suppliersData } = useGetVendorsQuery({ type: 'raw_material' });
  const [createItemMutation] = useCreateItemMutation();
  const [updateItemMutation] = useUpdateItemMutation();
  const [deleteItemMutation] = useDeleteItemMutation();
  const [addStockRequest] = useAddStockRequestMutation();
  const [sellStockRequest] = useSellStockRequestMutation();
  const [approveMovement] = useApproveMovementMutation();
  const [rejectMovement] = useRejectMovementMutation();
  const [submitStockCheck] = useSubmitStockCheckMutation();

  const suppliers = useMemo(() => suppliersData?.data || [], [suppliersData]);
  const { data: customersData } = useGetVendorsQuery({ type: 'customer' });
  const [createVendorMutation] = useCreateVendorMutation();
  const vendorsList = useMemo(() => (customersData?.data || []).map((v) => ({
    id: v._id, name: v.name, phone: v.phone, email: v.email, address: v.address,
  })), [customersData]);

  const inventoryList = useMemo(() => (invData?.data || []).map((i) => ({
    key: i._id,
    code: i.itemCode,
    name: i.itemName,
    category: i.category,
    unit: i.unit,
    unitValue: i.unitValue,
    value: i.purchasePrice,
    marginAmount: i.marginAmount,
    sellingPrice: i.sellingPrice,
    defaultSize: i.defaultSize,
    current: i.currentStock,
    min: i.minStock,
    max: i.minStock * 10,
    price: `₹${i.purchasePrice}/${i.unit}`,
    status: i.currentStock === 0 ? 'Out' : i.currentStock < i.minStock ? 'Low' : 'OK',
    hsnCode: i.hsnCode,
    gstPercent: i.gstPercent || 0,
    discountPercent: i.discountPercent,
    packingMaterial: i.packingMaterial,
    materialCategory: i.materialCategory,
    brand: i.brand,
    productAttributes: i.productAttributes || {},
    vendorId: i.vendorId?._id || i.vendorId || undefined,
    vendorName: i.vendorId?.name || '',
    purchaseBatches: i.purchaseBatches || [],
    // One row per vendor this product has ever been bought from, with the qty still remaining
    // from that vendor's batches — so buying the same product from a different vendor shows up
    // here instead of overwriting the previous vendor's stock.
    sellers: (() => {
      const batches = (i.purchaseBatches || []).filter((b) => b.remainingQty > 0);
      if (batches.length === 0) {
        return i.vendorId?.name ? [{ name: i.vendorId.name, stock: i.currentStock }] : [];
      }
      const byVendor = {};
      batches.forEach((b) => {
        const key = b.vendorName || 'Unknown vendor';
        byVendor[key] = (byVendor[key] || 0) + (b.remainingQty || 0);
      });
      return Object.entries(byVendor).map(([name, stock]) => ({ name, stock }));
    })(),
  })), [invData]);

  // Lookup product attributes by item name — used to surface attributes for kit
  // products (kit rows store a snapshot without attributes, so we resolve them live).
  const invAttrsByName = useMemo(() => {
    const map = {};
    inventoryList.forEach((i) => { if (i.name) map[i.name] = i.productAttributes || {}; });
    return map;
  }, [inventoryList]);

  const dupeInventoryNames = useMemo(() => {
    const nameCount = {};
    inventoryList.forEach(i => { nameCount[i.name] = (nameCount[i.name] || 0) + 1; });
    return new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1));
  }, [inventoryList]);

  const pendingAdjustments = useMemo(() => (approvalsData?.data || []).map((m) => ({
    key: m._id,
    date: m.createdAt?.slice(0, 10),
    type: m.movementType === 'IN' ? 'Addition' : m.movementType === 'OUT' ? 'Deduction'
      : (m.qtyAfter >= m.qtyBefore ? 'Adjustment (Add)' : 'Adjustment (Deduct)'),
    item: m.itemId?.itemName || '—',
    qty: m.qty,
    unit: m.itemId?.unit || '',
    entity: m.referenceType || 'Manual',
    person: m.createdBy?.fullName || 'Staff',
    status: m.approvalStatus,
    notes: [m.reason, m.notes].filter(Boolean).join(' — '),
  })), [approvalsData]);

  /* ── Manual adjustment modal ── */
  const [adjustModal, setAdjustModal] = useState({ open: false, item: null, type: null });
  const [adjustForm] = Form.useForm();

  /* ── Add / Edit Item modal ── */
  const [addItemModal, setAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [addItemForm] = Form.useForm();

  /* ── Kits ── */
  const { data: kitsData } = useGetKitsQuery();
  const [createKitMutation] = useCreateKitMutation();
  const [updateKitMutation] = useUpdateKitMutation();
  const [deleteKitMutation] = useDeleteKitMutation();
  const kitsList = useMemo(() => (kitsData?.data || []).map((k) => ({
    key: k._id,
    _id: k._id,
    kitCode: k.kitCode,
    kitName: k.kitName,
    displayUnit: k.displayUnit,
    size: k.size,
    products: k.products || [],
    kitAttributes: k.kitAttributes || {},
  })), [kitsData]);
  const [kitModal, setKitModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [kitForm] = Form.useForm();

  const openAddKit = (kit = null) => {
    if (!requireAccess(kit ? 'edit' : 'add')) return;
    setEditingKit(kit);
    setKitModal(true);
  };

  const initKitForm = (kit) => {
    kitForm.resetFields();
    if (kit) {
      kitForm.setFieldsValue({
        kitName: kit.kitName,
        size: kit.size,
        kitAttrs: kit.kitAttributes || {},
        products: kit.products?.length
          ? kit.products.map(p => ({
              ...p,
              productName: inventoryList.find(i => i.name === p.productName)?.key || p.productName,
            }))
          : [{ productName: '', qty: 1, gst: 'None' }],
      });
    } else {
      kitForm.setFieldsValue({ products: [{ productName: '', qty: 1, gst: 'None' }] });
    }
  };

  const handleSaveKit = async () => {
    try {
      const vals = await kitForm.validateFields();
      const payload = {
        kitName: vals.kitName,
        size: vals.size || '',
        kitAttributes: vals.kitAttrs || {},
        products: (vals.products || []).filter((p) => p && p.productName).map((p) => {
          const resolvedName = inventoryList.find(i => i.key === p.productName)?.name || p.productName;
          return {
            productName: resolvedName,
            category: p.category || '',
            qty: Number(p.qty) || 1,
            unit: p.unit || '',
            defaultSize: p.defaultSize || '',
            purchasePrice: Number(String(p.purchasePrice ?? '').replace(/[^0-9.]/g, '')) || 0,
            sellingPrice: Number(String(p.sellingPrice ?? '').replace(/[^0-9.]/g, '')) || 0,
            gst: p.gst || '',
            hsnCode: p.hsnCode || '',
            discountPercent: Number(String(p.discountPercent ?? '').replace(/[^0-9.]/g, '')) || 0,
            packingMaterial: p.packingMaterial || '',
            materialCategory: p.materialCategory || '',
            brand: p.brand || '',
            rate: Number(String(p.purchasePrice ?? '').replace(/[^0-9.]/g, '')) || 0,
          };
        }),
      };
      if (editingKit) {
        await updateKitMutation({ id: editingKit._id, ...payload }).unwrap();
        enqueueSnackbar('Kit updated', { variant: 'success' });
      } else {
        await createKitMutation(payload).unwrap();
        enqueueSnackbar('Kit added', { variant: 'success' });
      }
      setKitModal(false);
      setEditingKit(null);
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to save kit', { variant: 'error' });
    }
  };

  const handleDeleteKit = async (kit) => {
    if (!requireAccess('delete')) return;
    try {
      await deleteKitMutation(kit._id).unwrap();
      enqueueSnackbar('Kit deleted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to delete kit', { variant: 'error' });
    }
  };

  /* ── Add Stock (Receive Goods) drawer ── */
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm] = Form.useForm();
  const [activeItem, setActiveItem] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm] = Form.useForm();

  /* ── Sell Stock (Issue Goods) drawer ── */
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm] = Form.useForm();
  const [activeIssueItem, setActiveIssueItem] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorForm] = Form.useForm();

  const [extraCategories, setExtraCategories] = useState([]);
  const categories = useMemo(
    () => [...new Set([...inventoryList.map((i) => i.category).filter(Boolean), ...extraCategories])],
    [inventoryList, extraCategories]
  );
  const [newCategoryName, setNewCategoryName] = useState('');

  /* ── Search & Filter ── */
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState(null);
  const [invStatus, setInvStatus] = useState(null);
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalType, setApprovalType] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  /* ── Stock History ── */
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const { data: historyData } = useGetStockHistoryQuery({ page: historyPage, limit: historyPageSize });
  const stockHistory = useMemo(() => (historyData?.data || []).map((m) => ({
    key: m._id,
    date: m.createdAt?.slice(0, 10),
    item: m.itemId?.itemName || '—',
    code: m.itemId?.itemCode || '—',
    action: m.movementType === 'IN' ? 'Stock Added' : m.movementType === 'OUT' ? 'Stock Deducted'
      : (m.qtyAfter >= m.qtyBefore ? 'Adjustment (Add)' : 'Adjustment (Deduct)'),
    qty: m.qty,
    unit: m.itemId?.unit || '',
    vendor: m.vendorId?.name || m.vendorName || '—',
    source: m.referenceType || '—',
    person: 'Admin',
    notes: m.reason || '',
  })), [historyData]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState(null);
  const [historyDateRange, setHistoryDateRange] = useState(null);

  /* ── Packing Material Config ── */
  const { data: packingConfigData } = useGetPackingConfigQuery();
  const [createPackingConfig] = useCreatePackingConfigMutation();
  const [updatePackingConfig] = useUpdatePackingConfigMutation();
  const [deletePackingConfig] = useDeletePackingConfigMutation();
  const packingConfigList = useMemo(() => (packingConfigData?.data || []), [packingConfigData]);
  const displayUnits = useMemo(() => packingConfigList.filter(c => c.type === 'displayUnit'), [packingConfigList]);
  const packingMaterials = useMemo(() => packingConfigList.filter(c => c.type === 'packingMaterial'), [packingConfigList]);
  const [packingConfigModal, setPackingConfigModal] = useState(false);
  const [packingConfigType, setPackingConfigType] = useState('displayUnit');
  const [editingPackingConfig, setEditingPackingConfig] = useState(null);
  const [packingConfigForm] = Form.useForm();

  const openPackingConfigModal = (type, item = null) => {
    if (!requireAccess(item ? 'edit' : 'add')) return;
    setPackingConfigType(type);
    setEditingPackingConfig(item);
    setPackingConfigModal(true);
    packingConfigForm.resetFields();
    if (item) packingConfigForm.setFieldsValue({ label: item.label, value: item.value, tabMapping: item.tabMapping, subtypes: item.subtypes || [] });
  };

  const handleSavePackingConfig = async () => {
    try {
      const values = await packingConfigForm.validateFields();
      // Auto-generate value for each subtype from its label
      if (values.subtypes) {
        values.subtypes = values.subtypes.map(s => ({
          ...s,
          value: s.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        }));
      }
      if (editingPackingConfig) {
        await updatePackingConfig({ id: editingPackingConfig._id, type: packingConfigType, ...values }).unwrap();
        enqueueSnackbar('Updated successfully', { variant: 'success' });
      } else {
        await createPackingConfig({ type: packingConfigType, ...values }).unwrap();
        enqueueSnackbar('Added successfully', { variant: 'success' });
      }
      setPackingConfigModal(false);
      setEditingPackingConfig(null);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || 'Failed to save', { variant: 'error' });
    }
  };

  const handleDeletePackingConfig = async (id) => {
    if (!requireAccess('delete')) return;
    try {
      await deletePackingConfig(id).unwrap();
      enqueueSnackbar('Deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Delete failed', { variant: 'error' });
    }
  };

  /* ── Material Stocks ── */
  const { data: materialStocksData, refetch: refetchMaterialStocks } = useGetMaterialStocksQuery();
  const [createMaterialStock] = useCreateMaterialStockMutation();
  const [updateMaterialStock] = useUpdateMaterialStockMutation();
  const [deleteMaterialStock] = useDeleteMaterialStockMutation();
  const [uploadMaterialStockInvoice] = useUploadMaterialStockInvoiceMutation();
  const materialStocksList = useMemo(() => materialStocksData?.data || [], [materialStocksData]);
  const [materialStockModal, setMaterialStockModal] = useState(false);
  const [editingMaterialStock, setEditingMaterialStock] = useState(null);
  const [materialStockForm] = Form.useForm();
  const [materialStockSearch, setMaterialStockSearch] = useState('');
  const [materialStockInvoiceUploading, setMaterialStockInvoiceUploading] = useState(false);
  const [materialStockInvoiceFile, setMaterialStockInvoiceFile] = useState(null);
  const makeUploadMs = useCloudinaryUpload();

  const filteredMaterialStocks = useMemo(() => {
    const q = materialStockSearch.toLowerCase();
    return materialStocksList.filter(s =>
      !q || s.packingMaterial.toLowerCase().includes(q) || (s.size || '').toLowerCase().includes(q) || (s.vendor || '').toLowerCase().includes(q)
    );
  }, [materialStocksList, materialStockSearch]);

  // Vendor dropdown for the "Add Purchase" (Material Stock) modal — same raw-material
  // vendor list used on the Inventory Add Item form. Keeps the currently-edited record's
  // vendor selectable even if it doesn't match an existing vendor name (legacy free-text entries).
  const materialStockVendorOptions = useMemo(() => {
    const opts = suppliers.map((v) => ({ label: v.name, value: v.name }));
    const currentVendor = editingMaterialStock?.vendor;
    if (currentVendor && !opts.some((o) => o.value === currentVendor)) {
      opts.push({ label: currentVendor, value: currentVendor });
    }
    return opts;
  }, [suppliers, editingMaterialStock]);

  const openMaterialStockModal = (item = null) => {
    if (!requireAccess(item ? 'edit' : 'add')) return;
    setEditingMaterialStock(item);
    setMaterialStockInvoiceFile(null);
    materialStockForm.resetFields();
    if (item) {
      materialStockForm.setFieldsValue({
        packingMaterial: item.packingMaterial,
        size: item.size,
        stockCount: item.stockCount,
        purchaseDate: item.purchaseDate ? dayjs(item.purchaseDate) : null,
        vendor: item.vendor,
        notes: item.notes,
      });
    }
    setMaterialStockModal(true);
  };

  const handleSaveMaterialStock = async () => {
    try {
      const values = await materialStockForm.validateFields();
      const payload = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : undefined,
      };
      let saved;
      if (editingMaterialStock) {
        saved = await updateMaterialStock({ id: editingMaterialStock._id, ...payload }).unwrap();
        enqueueSnackbar('Material stock updated', { variant: 'success' });
      } else {
        saved = await createMaterialStock(payload).unwrap();
        enqueueSnackbar('Material stock added', { variant: 'success' });
      }
      // Upload invoice if a file was selected
      if (materialStockInvoiceFile) {
        setMaterialStockInvoiceUploading(true);
        try {
          const fd = new FormData();
          const f = materialStockInvoiceFile?.originFileObj || materialStockInvoiceFile;
          if (f) {
            fd.append('invoice', f);
            await uploadMaterialStockInvoice({ id: saved?.data?._id || editingMaterialStock?._id, formData: fd }).unwrap();
          }
        } catch { /* file upload failure is non-critical */ }
        setMaterialStockInvoiceUploading(false);
      }
      setMaterialStockModal(false);
      setEditingMaterialStock(null);
      setMaterialStockInvoiceFile(null);
    } catch (e) {
      if (e?.errorFields) return;
      enqueueSnackbar(e?.data?.message || 'Failed to save material stock', { variant: 'error' });
    }
  };

  const handleDeleteMaterialStock = async (id) => {
    if (!requireAccess('delete')) return;
    try {
      await deleteMaterialStock(id).unwrap();
      enqueueSnackbar('Material stock deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Delete failed', { variant: 'error' });
    }
  };

  /* ── Active tab ── */
  const [activeInvTab, setActiveInvTab] = useState('stock');
  const { filterTabs, activeKeyFor } = useTabAccess('Inventory');
  const { requireAccess } = usePageAccess('Inventory');

  /* ── Dynamic product attribute fields (Add Item modal) ── */
  const watchedItemName = Form.useWatch('name', addItemForm);
  const productTypeKey = useMemo(() => getProductTypeKey(watchedItemName), [watchedItemName]);
  const productFieldDefs = PRODUCT_FIELD_DEFS[productTypeKey] || [];

  /* ── Category & Kit expand ── */
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedKit, setExpandedKit] = useState(null);

  /* ── Item Detail Drawer (row click) ── */
  const [detailItem, setDetailItem] = useState(null);

  /* ── Live Staff Checking ── */
  const [checkSession, setCheckSession] = useState([]);
  const [checkSubmitOpen, setCheckSubmitOpen] = useState(false);
  const [checkNotes, setCheckNotes] = useState('');
  const [checkSubmitted, setCheckSubmitted] = useState(false);

  // Checked-record log (Known + Unknown reasons) — Super Admin / Admin only.
  const { data: checkHistoryData } = useGetStockHistoryQuery({ type: 'CHECK', limit: 50 }, { skip: !isSuperOrAdmin });
  const checkHistoryList = useMemo(() => (checkHistoryData?.data || []).map((m) => ({
    key: m._id,
    item: m.itemId?.itemName || '—',
    unit: m.itemId?.unit || '',
    qty: m.qty,
    reasonType: m.reasonType || '—',
    reason: m.reason || '—',
    notes: m.notes || '',
    checkedBy: m.createdBy?.fullName || '—',
    date: m.createdAt ? dayjs(m.createdAt).format('DD MMM YYYY') : '—',
    time: m.createdAt ? dayjs(m.createdAt).format('hh:mm A') : '—',
    approvalStatus: m.approvalStatus,
  })), [checkHistoryData]);

  // Populate checkSession once inventory data loads from RTK Query (useState runs before data arrives).
  // On subsequent loads (e.g. after an approval), refresh systemCount while preserving the user's
  // already-entered physicalCount values so an in-progress session isn't wiped out.
  useEffect(() => {
    if (inventoryList.length === 0) return;
    setCheckSession(prev => {
      if (prev.length === 0) {
        return inventoryList.map(i => ({
          key: i.key, code: i.code, name: i.name, unit: i.unit,
          systemCount: i.current, physicalCount: i.current,
          missingType: null, missingReason: '',
        }));
      }
      // Merge: keep user-entered counts, update system counts & add any new items
      return inventoryList.map(i => {
        const existing = prev.find(p => p.key === i.key);
        if (existing) return { ...existing, code: i.code, name: i.name, unit: i.unit, systemCount: i.current };
        return { key: i.key, code: i.code, name: i.name, unit: i.unit, systemCount: i.current, physicalCount: i.current, missingType: null, missingReason: '' };
      });
    });
  }, [inventoryList]);

  /* ── Derived ── */
  const filteredInventory = inventoryList.filter((i) => {
    const q = invSearch.toLowerCase();
    const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q) || (i.sellers || []).map(s => (s.name || s)).join(' ').toLowerCase().includes(q);
    const matchCategory = !invCategory || i.category === invCategory;
    const matchStatus = !invStatus || i.status === invStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const filteredApprovals = pendingAdjustments.filter((a) => {
    const q = approvalSearch.toLowerCase();
    const matchSearch = !q || (a.item || '').toLowerCase().includes(q) || (a.person || '').toLowerCase().includes(q);
    const matchType = !approvalType || a.type === approvalType;
    const matchStatus = !approvalStatus || a.status === approvalStatus;
    return matchSearch && matchType && matchStatus;
  });

  const filteredHistory = stockHistory.filter(h => {
    const q = historySearch.toLowerCase();
    const matchSearch = !q || h.item.toLowerCase().includes(q) || (h.code || '').toLowerCase().includes(q) || (h.source || '').toLowerCase().includes(q) || (h.invoiceNo || '').toLowerCase().includes(q) || (h.vendor || '').toLowerCase().includes(q);
    const matchAction = !historyActionFilter || h.action === historyActionFilter;
    const matchDate = !historyDateRange || !historyDateRange[0] || !historyDateRange[1] || (
      h.date >= historyDateRange[0].format('YYYY-MM-DD') && h.date <= historyDateRange[1].format('YYYY-MM-DD')
    );
    return matchSearch && matchAction && matchDate;
  });

  const lowStock = inventoryList.filter((i) => i.status === 'Low' || i.status === 'Out');

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || '').toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.phone || '').includes(supplierSearch)
  );
  const filteredVendors = vendorsList.filter((c) =>
    (c.name || '').toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (c.phone || '').includes(vendorSearch)
  );

  const onCategoryChange = (event) => setNewCategoryName(event.target.value);

  const addCategory = (e) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setExtraCategories((prev) => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const openReceive = (r) => {
    if (!requireAccess('add')) return;
    setActiveItem(r);
    setSelectedSupplier(null);
    setSupplierSearch('');
    setShowAddSupplier(false);
    receiveForm.resetFields();
    supplierForm.resetFields();
    setReceiveOpen(true);
  };

  const openIssue = (r) => {
    if (!requireAccess('add')) return;
    setActiveIssueItem(r);
    setSelectedVendor(null);
    setVendorSearch('');
    setShowAddVendor(false);
    issueForm.resetFields();
    vendorForm.resetFields();
    setIssueOpen(true);
  };

  const handleSaveSupplier = async () => {
    try {
      const vals = supplierForm.getFieldsValue();
      const result = await createVendorMutation({
        name: vals.sup_name, phone: vals.sup_phone, email: vals.sup_email,
        address: vals.sup_address, vendorType: 'raw_material', taxId: vals.sup_tax, bankDetails: vals.bankDetails || {},
      }).unwrap();
      setSelectedSupplier({ id: result.data?._id || result._id, name: vals.sup_name, phone: vals.sup_phone, address: vals.sup_address });
      supplierForm.resetFields();
      setShowAddSupplier(false);
      enqueueSnackbar('Supplier added', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to add supplier', { variant: 'error' });
    }
  };

  const handleSaveVendor = async () => {
    try {
      const vals = vendorForm.getFieldsValue();
      const result = await createVendorMutation({
        name: vals.cust_name, phone: vals.cust_phone, email: vals.cust_email,
        address: vals.cust_address, type: 'customer', taxId: vals.cust_tax, bankDetails: vals.bankDetails || {},
      }).unwrap();
      setSelectedVendor({ id: result.data?._id || result._id, name: vals.cust_name, phone: vals.cust_phone, address: vals.cust_address });
      vendorForm.resetFields();
      setShowAddVendor(false);
      enqueueSnackbar('Vendor added', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to add vendor', { variant: 'error' });
    }
  };

  const handleSaveItem = async () => {
    try {
      const vals = await addItemForm.validateFields();
      // Strip undefined/null so stale keys from a previously-selected product type
      // don't overwrite attributes the user never intended to clear.
      const rawAttrs = vals.productAttrs || {};
      const cleanAttrs = Object.fromEntries(
        Object.entries(rawAttrs).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
      );
      const payload = {
        itemName: vals.name,
        category: vals.category || '',
        unit: vals.unit || 'Pcs',
        minStock: Number(vals.min) || 0,
        purchasePrice: Number(String(vals.purchase_price ?? '').replace(/[^0-9.]/g, '')) || 0,
        marginAmount: Number(String(vals.margin_amount ?? '').replace(/[^0-9.]/g, '')) || 0,
        sellingPrice: Number(String(vals.selling_price ?? '').replace(/[^0-9.]/g, '')) || 0,
        gstPercent: Number(vals.gstPercent) || 0,
        hsnCode: vals.hsn || '',
        vendorId: vals.vendorId || null,
        purchaseDate: vals.purchaseDate ? vals.purchaseDate.toISOString() : new Date().toISOString(),
        productAttributes: cleanAttrs,
      };
      if (editingItem) {
        await updateItemMutation({ id: editingItem.key, ...payload, addStockQty: Number(vals.addStockQty) || 0 }).unwrap();
        enqueueSnackbar(Number(vals.addStockQty) > 0 ? `Item updated — ${vals.addStockQty} units added to stock` : 'Item updated', { variant: 'success' });
      } else {
        const opening = Number(vals.current) || 0;
        await createItemMutation({ ...payload, openingStock: opening, currentStock: opening }).unwrap();
        enqueueSnackbar('Item added', { variant: 'success' });
      }
      addItemForm.resetFields();
      setEditingItem(null);
      setAddItemModal(false);
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to save item', { variant: 'error' });
    }
  };

  const handleApproveAdjustment = async (adj) => {
    try {
      await approveMovement(adj.key).unwrap();
      enqueueSnackbar('Stock adjustment approved and applied', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to approve adjustment', { variant: 'error' });
    }
  };

  const handleRejectAdjustment = async (adj) => {
    try {
      await rejectMovement(adj.key).unwrap();
      enqueueSnackbar('Adjustment request rejected', { variant: 'warning' });
    } catch {
      enqueueSnackbar('Failed to reject adjustment', { variant: 'error' });
    }
  };

  /* ── Submit Live Stock Check ── */
  const handleSubmitCheck = async () => {
    const discrepancies = checkSession.filter(i => i.physicalCount !== i.systemCount);
    const unknownItems = checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown');
    try {
      await submitStockCheck({
        items: discrepancies.map((item) => ({
          itemId: item.key,
          actualCount: item.physicalCount,
          reasonType: item.missingType === 'unknown' ? 'Unknown' : item.missingType === 'known' ? 'Known' : undefined,
          reason: item.missingReason,
        })),
        notes: checkNotes,
      }).unwrap();
      unknownItems.forEach((item) => {
        enqueueSnackbar(
          ['Unknown Stock Shortage Reported', `${Math.abs(item.physicalCount - item.systemCount)} ${item.unit} of "${item.name}" is unaccounted. Super Admin and Manager have been notified.`].filter(Boolean).join(' — '),
          { variant: 'warning' }
        );
      });
      setCheckSubmitOpen(false);
      setCheckSubmitted(true);
      setCheckNotes('');
      enqueueSnackbar(`Stock check submitted. ${discrepancies.length} discrepancies sent for approval.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to submit stock check', { variant: 'error' });
    }
  };

  /* ── Style helpers ── */
  const sectionCard = {
    borderRadius: 14,
    border: `1px solid ${borderColor}`,
    background: cardBg,
    marginBottom: 12,
    overflow: 'hidden',
  };

  const sectionHeader = (gradient) => ({
    padding: '12px 16px',
    background: gradient || sectionBg,
    borderBottom: `1px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  const saveBtn = (gradient) => ({
    background: gradient,
    border: 'none',
    height: 48,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.8,
  });

  /* ── Entity selector helper ── */
  const renderEntitySelector = ({
    label, icon, search, setSearch, filtered, selected, setSelected,
    showAdd, setShowAdd, addForm, addFormFields, onSave, gradient,
  }) => (
    <div style={sectionCard}>
      <div style={sectionHeader()}>
        {icon}
        <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>{label}</Text>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: `${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}15`, border: `1.5px solid ${gradient.split(',')[1]?.trim().slice(0, 7) || '#B11E6A'}44` }}>
            <Avatar style={{ background: gradient, flexShrink: 0 }}>{selected.name[0]}</Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{selected.name}</Text>
              <Text style={{ fontSize: 12, color: '#aaa' }}>{[selected.phone, selected.address].filter(Boolean).join(' · ')}</Text>
            </div>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setSelected(null); setSearch(''); setShowAdd(false); }} style={{ color: '#aaa' }} />
          </div>
        ) : (
          <>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder={`Search ${label.toLowerCase()} by name or phone...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowAdd(false); }}
              style={{ borderRadius: 24, height: 42, background: isDark ? '#2a2a3a' : '#f5f5f5', border: 'none' }}
              allowClear
            />
            {!showAdd && (
              <div style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${borderColor}`, background: cardBg, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 && <div style={{ padding: '14px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>No results found</div>}
                {filtered.map((item) => {
                  const isSel = selected?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setSelected(item); setSearch(''); }}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', gap: 10, background: isSel ? '#B11E6A08' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#B11E6A08'}
                      onMouseLeave={e => e.currentTarget.style.background = isSel ? '#B11E6A08' : 'transparent'}
                    >
                      <Avatar size={34} style={{ background: gradient, flexShrink: 0, fontSize: 13 }}>{item.name[0]}</Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13, color: textColor, display: 'block' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: '#aaa' }}>{[item.phone, item.address].filter(Boolean).join(' · ')}</Text>
                      </div>
                      {isSel && <CheckOutlined style={{ color: '#B11E6A' }} />}
                    </div>
                  );
                })}
              </div>
            )}
            {!showAdd && (
              <Button icon={<PlusOutlined />} onClick={() => { setShowAdd(true); addForm.resetFields(); }} style={{ marginTop: 10, width: '100%', borderColor: '#B11E6A66', color: '#B11E6A', borderRadius: 8, height: 40, fontWeight: 600, borderStyle: 'dashed' }}>
                Add New {label}
              </Button>
            )}
          </>
        )}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ marginTop: 12, borderRadius: 10, border: `1.5px solid #B11E6A44`, background: isDark ? '#1a0f14' : '#fff8fb', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#B11E6A12', borderBottom: `1px solid #B11E6A22` }}>
                <Text style={{ fontWeight: 700, color: '#B11E6A', fontSize: 13 }}>New {label}</Text>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setShowAdd(false)} style={{ color: '#aaa' }} />
              </div>
              <Form form={addForm} layout="vertical" style={{ padding: '12px 14px 0' }}>
                {addFormFields}
              </Form>
              <div style={{ padding: '10px 14px 14px', display: 'flex', gap: 8 }}>
                <Button onClick={() => setShowAdd(false)} style={{ flex: 1, height: 40, borderRadius: 8 }}>Cancel</Button>
                <Button type="primary" onClick={onSave} style={{ flex: 2, height: 40, borderRadius: 8, background: gradient, border: 'none', fontWeight: 700 }}>Save {label}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Render a productAttributes object as compact key:value tags.
  const renderAttrTags = (attrs, maxWidth = 240) => {
    const entries = attrEntries(attrs);
    if (entries.length === 0) return <Text type="secondary">—</Text>;
    return (
      <Space size={4} wrap style={{ maxWidth }}>
        {entries.map(([k, v]) => (
          <Tag key={k} style={{ borderRadius: 10, fontSize: 10, background: '#B11E6A10', color: '#B11E6A', border: '1px solid #B11E6A30', margin: 0 }}>
            <span style={{ opacity: 0.75 }}>{prettyAttrKey(k)}:</span> {Array.isArray(v) ? v.join(', ') : String(v)}
          </Tag>
        ))}
      </Space>
    );
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
    { title: 'Item Name', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
    { title: 'Category', dataIndex: 'category', responsive: ['sm'], render: (v) => <Tag style={{ borderRadius: 20, fontSize: 11, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44' }}>{v}</Tag> },
    { title: 'Value', key: 'value', responsive: ['lg'], render: (_, r) => r.unitValue ? `${r.unitValue} ${r.unit}` : (r.unit || '—') },
    { title: 'Product Spec', key: 'productSpec', responsive: ['lg'], render: (_, r) => renderAttrTags(r.productAttributes, 220) },
    {
      title: 'Stock Level', key: 'level',
      render: (_, r) => (
        <div style={{ minWidth: 80 }}>
          <Text strong style={{ fontSize: 14, color: r.status === 'Out' ? '#8a1652' : r.status === 'Low' ? '#C94F8A' : '#B11E6A' }}>
            {(r.current ?? 0).toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>units</Text>
        </div>
      ),
    },
    { title: 'Min Req', dataIndex: 'min', responsive: ['lg'], render: (v) => `${v} units` },
    {
      title: 'Low Stock Alert', key: 'alert',
      render: (_, r) => r.current <= r.min
        ? <Tag icon={<WarningOutlined />} color="error" style={{ borderRadius: 12 }}>Low Stock</Tag>
        : <Tag color="success" style={{ borderRadius: 12 }}>Healthy</Tag>
    },
    { title: 'Price', dataIndex: 'price', responsive: ['md'] },
    { title: 'GST', dataIndex: 'gstPercent', responsive: ['md'], render: (v) => v > 0 ? <Tag style={{ borderRadius: 12, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33' }}>{v}%</Tag> : <Text type="secondary">—</Text> },
    {
      title: 'Vendors', dataIndex: 'sellers', key: 'sellers', responsive: ['lg'],
      render: (v, r) => {
        const list = Array.isArray(v) ? v : (v ? [{ name: v, stock: r.current }] : []);
        if (list.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={4} wrap>
            {list.map((s, i) => {
              const name = s.name || s;
              const stock = s.stock ?? 0;
              return (
                <Tag key={i} style={{ borderRadius: 20, fontSize: 10, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 0, padding: '0 6px 0 8px' }}>
                  <span>{name}</span>
                  <span style={{ background: '#B11E6A', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 9, fontWeight: 700, lineHeight: '16px', marginLeft: 6 }}>{stock} units</span>
                </Tag>
              );
            })}
          </Space>
        );
      }
    },
    { title: 'Purchased', dataIndex: 'purchasedDate', responsive: ['lg'] },
    {
      title: 'Status', dataIndex: 'status',
      render: (v) => (
        <Tag style={{ borderRadius: 20, fontWeight: 500, background: v === 'OK' ? '#B11E6A22' : v === 'Low' ? '#C94F8A22' : '#8a165222', color: v === 'OK' ? '#B11E6A' : v === 'Low' ? '#C94F8A' : '#8a1652', border: `1px solid ${v === 'OK' ? '#B11E6A44' : v === 'Low' ? '#C94F8A44' : '#8a165244'}` }}>
          {v === 'Out' ? 'Out of Stock' : v}
        </Tag>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (
        <Space size={4} wrap>
          <div style={{ display: 'flex', alignItems: 'center', background: isDark ? '#2a2a3e' : '#f0f0f0', borderRadius: 6, padding: '2px', border: `1px solid ${borderColor}` }}>
            <Button size="small" type="text" icon={<MinusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); if (!requireAccess('edit')) return; adjustForm.resetFields(); setAdjustModal({ open: true, item: r, type: 'Deduction' }); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            <Text strong style={{ fontSize: 11, minWidth: 28, textAlign: 'center', color: textColor }}>{r.current}</Text>
            <Button size="small" type="text" icon={<PlusOutlined style={{ fontSize: 10, color: '#B11E6A' }} />} onClick={(e) => { e.stopPropagation(); if (!requireAccess('edit')) return; adjustForm.resetFields(); setAdjustModal({ open: true, item: r, type: 'Addition' }); }} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>
          <Button size="small" icon={<EditOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); if (!requireAccess('edit')) return; setEditingItem(r); addItemForm.setFieldsValue({ name: r.name, category: r.category, unit: r.unit, min: r.min, purchase_price: r.value, margin_amount: r.marginAmount, selling_price: r.sellingPrice, gstPercent: r.gstPercent, hsn: r.hsnCode, vendorId: r.vendorId, purchaseDate: dayjs(), addStockQty: undefined, productAttrs: r.productAttributes || {} }); setAddItemModal(true); }}>Edit</Button>
          {/* Add Stock / Sell Stock — hidden per request
          <Button size="small" type="primary" icon={<DownloadOutlined />} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openReceive(r); }}>Add Stock</Button>
          <Button size="small" icon={<ShoppingOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openIssue(r); }}>Sell Stock</Button>
          */}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Inventory" items={[{ label: 'Inventory' }]} style={{ marginBottom: 0 }} />
        {activeInvTab !== 'kit' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!requireAccess('add')) return; setAddItemModal(true); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Add Item</Button>
        )}
      </div>

      {lowStock.length > 0 && (
        <Alert type="warning" icon={<WarningOutlined />} showIcon
          message={`${lowStock.length} items below minimum: ${lowStock.map((i) => i.name).join(', ')}`}
          style={{ marginBottom: 20, borderRadius: 10 }} />
      )}

      {/* Stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Items', val: inventoryList.length, color: '#B11E6A' },
          { label: 'OK Stock', val: inventoryList.filter((i) => i.status === 'OK').length, color: '#8a1652' },
          { label: 'Low Stock', val: inventoryList.filter((i) => i.status === 'Low').length, color: '#C94F8A' },
          { label: 'Out of Stock', val: inventoryList.filter((i) => i.status === 'Out').length, color: '#D85C9E' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, boxShadow: `0 4px 20px ${s.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={2} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card title={<Text strong style={{ color: textColor }}>Stock Levels Overview</Text>}
            style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
            styles={{ body: { padding: '12px 16px 16px' } }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inventoryList.map((i) => ({ name: i.name.split(' ').slice(0, 2).join(' '), current: i.current, min: i.min }))} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#f0f0f0'} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                <ReTooltip />
                <Bar dataKey="current" fill="#B11E6A" radius={[4, 4, 0, 0]} name="Current Stock" />
                <Bar dataKey="min" fill="#D85C9E" radius={[4, 4, 0, 0]} name="Min Required" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ════════════════════════════════════════
          INVENTORY TABS
      ════════════════════════════════════════ */}
      <Tabs onChange={setActiveInvTab} style={{ marginBottom: 20 }}
        items={filterTabs([
          /* ── Tab 1: Stock Inventory ── */
          {
            key: 'stock',
            label: <Space><ShoppingOutlined />Stock Inventory</Space>,
            children: (() => {
              // Group filtered items by category
              const grouped = categories.reduce((acc, cat) => {
                const items = filteredInventory.filter(i => i.category === cat);
                if (items.length > 0) acc[cat] = items;
                return acc;
              }, {});
              // Also include items with no category or category not in list
              const uncategorized = filteredInventory.filter(i => !i.category || !categories.includes(i.category));
              if (uncategorized.length > 0) grouped['Uncategorized'] = uncategorized;

              const allGroupKeys = Object.keys(grouped);

              return (
                <div>
                  {/* Search & filter bar */}
                  <div style={{ padding: '10px 0 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item, code..." allowClear value={invSearch} onChange={(e) => { setInvSearch(e.target.value); setExpandedCategory(null); }} style={{ width: 240, borderRadius: 8 }} />
                    <Select allowClear placeholder="Stock Status" value={invStatus} onChange={setInvStatus} style={{ width: 150, borderRadius: 8 }}>
                      <Option value="OK">OK</Option>
                      <Option value="Low">Low Stock</Option>
                      <Option value="Out">Out of Stock</Option>
                    </Select>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>Click a category to expand</Text>
                  </div>

                  {allGroupKeys.length === 0 && (
                    <Card style={{ borderRadius: 14, border: 'none', background: cardBg, textAlign: 'center', padding: 32 }}>
                      <Text type="secondary">No items found</Text>
                    </Card>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {allGroupKeys.map((cat) => {
                      const items = grouped[cat];
                      const okCount = items.filter(i => i.status === 'OK').length;
                      const lowCount = items.filter(i => i.status === 'Low').length;
                      const outCount = items.filter(i => i.status === 'Out').length;
                      const isExpanded = expandedCategory === cat || (invSearch && items.length > 0);

                      return (
                        <div key={cat} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isExpanded ? '#B11E6A44' : borderColor}`, background: cardBg, boxShadow: isExpanded ? '0 4px 20px rgba(177,30,106,0.10)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                          {/* Category header — click to expand */}
                          <div
                            onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                            style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: isExpanded ? (isDark ? 'rgba(177,30,106,0.12)' : 'rgba(177,30,106,0.05)') : 'transparent', borderBottom: isExpanded ? `1px solid ${borderColor}` : 'none', transition: 'background 0.2s' }}
                          >
                            {/* Category icon circle */}
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <ShoppingOutlined style={{ color: '#fff', fontSize: 18 }} />
                            </div>

                            <div style={{ flex: 1 }}>
                              <Text strong style={{ fontSize: 15, color: textColor, display: 'block' }}>{cat}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
                            </div>

                            {/* Status chips */}
                            <Space wrap size={6}>
                              {okCount > 0 && <Tag style={{ borderRadius: 20, fontSize: 11, background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33', margin: 0 }}>OK: {okCount}</Tag>}
                              {lowCount > 0 && <Tag style={{ borderRadius: 20, fontSize: 11, background: '#fa8c1615', color: '#fa8c16', border: '1px solid #fa8c1633', margin: 0 }} icon={<WarningOutlined />}>Low: {lowCount}</Tag>}
                              {outCount > 0 && <Tag style={{ borderRadius: 20, fontSize: 11, background: '#ff4d4f15', color: '#ff4d4f', border: '1px solid #ff4d4f33', margin: 0 }}>Out: {outCount}</Tag>}
                            </Space>

                            {/* Expand chevron */}
                            <div style={{ fontSize: 16, color: '#B11E6A', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</div>
                          </div>

                          {/* Expanded items table */}
                          {isExpanded && (
                            <div className="table-responsive" style={{ padding: '4px' }}>
                              <Table
                                dataSource={items}
                                columns={columns}
                                pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                                size="small"
                                onRow={(record) => ({
                                  onClick: () => setDetailItem(record),
                                  style: { cursor: 'pointer' },
                                })}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })(),
          },

          /* ── Tab 2: Approvals ── */
          {
            key: 'approvals',
            label: <Space><SafetyCertificateOutlined /> Approvals <Tag color="orange" style={{ borderRadius: 10, marginLeft: 4 }}>{pendingAdjustments.filter(a => a.status === 'Pending').length}</Tag></Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0, color: textColor }}>Operation Head Approval Center</Title>
                  <Text type="secondary">Review and approve manual stock adjustments (+ / -)</Text>
                </div>
                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item or person..." allowClear value={approvalSearch} onChange={(e) => setApprovalSearch(e.target.value)} style={{ width: 220, borderRadius: 8 }} />
                  <Select allowClear placeholder="Type" value={approvalType} onChange={setApprovalType} style={{ width: 140, borderRadius: 8 }}>
                    <Option value="Addition">Addition</Option>
                    <Option value="Deduction">Deduction</Option>
                  </Select>
                  <Select allowClear placeholder="Status" value={approvalStatus} onChange={setApprovalStatus} style={{ width: 140, borderRadius: 8 }}>
                    <Option value="Pending">Pending</Option>
                    <Option value="Approved">Approved</Option>
                    <Option value="Rejected">Rejected</Option>
                  </Select>
                </div>
                <Table
                  size="small"
                  dataSource={filteredApprovals}
                  columns={[
                    { title: 'Date', dataIndex: 'date', key: 'date' },
                    { title: 'Item', dataIndex: 'item', key: 'item', render: (v) => <Text strong>{v}</Text> },
                    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'Addition' ? 'success' : 'error'} icon={t === 'Addition' ? <PlusOutlined /> : <MinusOutlined />} style={{ borderRadius: 12 }}>{t}</Tag> },
                    { title: 'Qty', dataIndex: 'qty', key: 'qty', render: (q) => <Text strong>{q} units</Text> },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (v) => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>—</Text> },
                    { title: 'Requested By', dataIndex: 'person', key: 'person' },
                    {
                      title: 'Status', dataIndex: 'status', key: 'status',
                      render: (s) => <Tag color={s === 'Pending' ? 'orange' : s === 'Approved' ? 'success' : 'error'} icon={s === 'Pending' ? <ClockCircleOutlined /> : s === 'Approved' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>{s}</Tag>
                    },
                    {
                      title: 'Action', key: 'action',
                      render: (_, record) => record.status === 'Pending' ? (
                        <Space>
                          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApproveAdjustment(record)} style={{ background: '#52c41a', border: 'none', color: '#fff' }}>Approve</Button>
                          <Button size="small" danger ghost icon={<CloseOutlined />} onClick={() => handleRejectAdjustment(record)}>Reject</Button>
                        </Space>
                      ) : null
                    }
                  ]}
                  pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                />
              </Card>
            )
          },

          /* ── Tab 3: Stock History ── */
          {
            key: 'history',
            label: <Space><HistoryOutlined />Stock History</Space>,
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Space wrap>
                    <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search item, code, source, invoice..." allowClear value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                    <Select allowClear placeholder="Movement Type" value={historyActionFilter} onChange={setHistoryActionFilter} style={{ width: 170 }}>
                      <Option value="Stock Added">Incoming (Stock Added)</Option>
                      <Option value="Stock Deducted">Outgoing (Stock Deducted)</Option>
                      <Option value="Stock Check">Adjustment (Stock Check)</Option>
                    </Select>
                    <DatePicker.RangePicker style={{ width: 280 }} onChange={setHistoryDateRange} />
                  </Space>
                  <Button
                    icon={<DownloadOutlined />}
                    type="primary"
                    style={{ background: '#B11E6A', border: 'none' }}
                    onClick={() => {
                      if (exportRowsToCSV(filteredHistory, `stock-history-${dayjs().format('YYYY-MM-DD')}.csv`)) {
                        enqueueSnackbar(`Exported ${filteredHistory.length} history record(s) to CSV`, { variant: 'success' });
                      } else {
                        enqueueSnackbar('No history records to export', { variant: 'warning' });
                      }
                    }}
                  >
                    Export History
                  </Button>
                </div>
                <Table
                  size="small"
                  dataSource={filteredHistory}
                  columns={[
                    { title: 'Date', dataIndex: 'date', key: 'date', render: v => <Text strong>{v}</Text> },
                    { title: 'Code', dataIndex: 'code', key: 'code', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600, fontSize: 12 }}>{v}</Text> },
                    { title: 'Item Name', dataIndex: 'item', key: 'item', render: v => <Text strong>{v}</Text> },
                    {
                      title: 'Action', dataIndex: 'action', key: 'action',
                      render: v => <Tag color={v === 'Stock Added' ? 'success' : v === 'Stock Deducted' ? 'error' : 'warning'} style={{ borderRadius: 12 }}>{v}</Tag>
                    },
                    { title: 'Qty', key: 'qty', render: (_, r) => <Text strong style={{ color: r.action === 'Stock Added' ? '#52c41a' : '#ff4d4f' }}>{r.action === 'Stock Added' ? '+' : '-'}{r.qty} units</Text> },
                    { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: v => v && v !== '—' ? <Tag color="geekblue" style={{ borderRadius: 10 }}>{v}</Tag> : <Text type="secondary">—</Text> },
                    { title: 'Source / Entity', dataIndex: 'source', key: 'source', render: v => <Text style={{ color: '#B11E6A', fontWeight: 600 }}>{v}</Text> },
                    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', render: v => v ? <Text style={{ color: '#7c3aed' }}>{v}</Text> : <Text type="secondary">—</Text> },
                    { title: 'Person', dataIndex: 'person', key: 'person' },
                    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: v => v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : '—' },
                  ]}
                  pagination={{
                    current: historyPage,
                    pageSize: historyPageSize,
                    total: historyData?.total || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    size: 'small',
                    onChange: (p, ps) => { setHistoryPage(p); setHistoryPageSize(ps); },
                  }}
                />
              </Card>
            )
          },

          /* ── Tab 4: Live Staff Checking ── */
          {
            key: 'livecheck',
            label: (
              <Space>
                <AuditOutlined />
                Live Staff Checking
                {checkSession.some(i => i.physicalCount !== i.systemCount) && (
                  <Badge count={checkSession.filter(i => i.physicalCount !== i.systemCount).length} size="small" />
                )}
              </Space>
            ),
            children: (
              <div>
                {/* Info alert */}
                <Alert
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  message="Live Stock Checking Instructions"
                  description="Compare physical inventory against system count. Use + / - buttons or enter the actual physical count. For any missing items, select whether the reason is Known or Unknown. Unknown shortages are auto-reported to Super Admin and Manager. Submit when all items are verified."
                  style={{ marginBottom: 16, borderRadius: 10 }}
                />

                {checkSubmitted && (
                  <Alert
                    type="success"
                    showIcon
                    message="Stock Check Submitted Successfully"
                    description="All discrepancies have been forwarded to the Approvals tab. Super Admin and Manager have been notified of any unknown shortages."
                    style={{ marginBottom: 16, borderRadius: 10 }}
                    closable
                    onClose={() => setCheckSubmitted(false)}
                  />
                )}

                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Text strong style={{ color: textColor }}>Physical Count Entry</Text>
                      <Tag color="blue" style={{ borderRadius: 20 }}>Session: {dayjs().format('DD MMM YYYY')}</Tag>
                    </Space>
                    <Button
                      size="small"
                      onClick={() => setCheckSession(inventoryList.map(i => ({ key: i.key, code: i.code, name: i.name, unit: i.unit, systemCount: i.current, physicalCount: i.current, missingType: null, missingReason: '' })))}
                      style={{ borderColor: '#B11E6A44', color: '#B11E6A' }}
                    >
                      Reset All
                    </Button>
                  </div>

                  <Table
                    dataSource={checkSession}
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Code', dataIndex: 'code', width: 90,
                        render: v => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text>
                      },
                      {
                        title: 'Item Name', dataIndex: 'name', width: 200,
                        render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text>
                      },
                      {
                        title: 'System Count', dataIndex: 'systemCount', width: 120, align: 'center',
                        render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v} units</Text>
                      },
                      {
                        title: 'Physical Count', width: 180, align: 'center',
                        render: (_, r) => (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Button
                              size="small" type="text"
                              icon={<MinusOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />}
                              onClick={() => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: Math.max(0, i.physicalCount - 1) } : i))}
                              style={{ border: '1px solid #ff4d4f33', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                            <InputNumber
                              value={r.physicalCount}
                              min={0}
                              onChange={v => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: v ?? 0, missingType: (v ?? 0) < i.systemCount ? i.missingType : null, missingReason: (v ?? 0) < i.systemCount ? i.missingReason : '' } : i))}
                              style={{ width: 72, textAlign: 'center' }}
                              size="small"
                              controls={false}
                            />
                            <Button
                              size="small" type="text"
                              icon={<PlusOutlined style={{ fontSize: 11, color: '#52c41a' }} />}
                              onClick={() => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, physicalCount: i.physicalCount + 1 } : i))}
                              style={{ border: '1px solid #52c41a33', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            />
                          </div>
                        )
                      },
                      {
                        title: 'Difference', width: 110, align: 'center',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          return (
                            <Text strong style={{ color: diff < 0 ? '#ff4d4f' : diff > 0 ? '#fa8c16' : '#52c41a', fontSize: 13 }}>
                              {diff > 0 ? '+' : ''}{diff} units
                            </Text>
                          );
                        }
                      },
                      {
                        title: 'Status', width: 100, align: 'center',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          if (diff === 0) return <Tag color="success" style={{ borderRadius: 12 }}>Match</Tag>;
                          if (diff < 0) return <Tag color="error" style={{ borderRadius: 12 }}>Missing</Tag>;
                          return <Tag color="warning" style={{ borderRadius: 12 }}>Extra</Tag>;
                        }
                      },
                      {
                        title: 'Missing Reason',
                        render: (_, r) => {
                          const diff = r.physicalCount - r.systemCount;
                          if (diff >= 0) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                          return (
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                              <Select
                                placeholder="Select reason type"
                                value={r.missingType}
                                onChange={v => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, missingType: v, missingReason: '' } : i))}
                                style={{ width: 180 }}
                                size="small"
                              >
                                <Option value="known">Known Reason</Option>
                                <Option value="unknown">Unknown</Option>
                              </Select>

                              {r.missingType === 'known' && (
                                <Input.TextArea
                                  placeholder={`Enter reason for ${Math.abs(diff)} units missing...`}
                                  value={r.missingReason}
                                  onChange={e => setCheckSession(prev => prev.map(i => i.key === r.key ? { ...i, missingReason: e.target.value } : i))}
                                  rows={2}
                                  size="small"
                                  style={{ width: 240, borderRadius: 6 }}
                                />
                              )}

                              {r.missingType === 'unknown' && (
                                <Alert
                                  type="warning"
                                  showIcon
                                  icon={<ExclamationCircleOutlined />}
                                  message={<Text strong style={{ fontSize: 12 }}>Unknown Shortage — Will be Reported</Text>}
                                  description={
                                    <Text style={{ fontSize: 11 }}>
                                      {Math.abs(diff)} units of <strong>{r.name}</strong> is unaccounted for.
                                      This will be automatically reported to <strong>Super Admin</strong> and <strong>Manager</strong> upon submission.
                                    </Text>
                                  }
                                  style={{ borderRadius: 6, fontSize: 11 }}
                                />
                              )}
                            </Space>
                          );
                        }
                      },
                    ]}
                  />

                  {/* Summary footer */}
                  <div style={{ padding: '14px 16px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                      <Tag color="error" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount < i.systemCount).length} Missing
                      </Tag>
                      <Tag color="warning" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount > i.systemCount).length} Extra
                      </Tag>
                      <Tag color="success" style={{ borderRadius: 20, fontSize: 12 }}>
                        {checkSession.filter(i => i.physicalCount === i.systemCount).length} Matched
                      </Tag>
                      {checkSession.some(i => i.physicalCount < i.systemCount && i.missingType === 'unknown') && (
                        <Tag color="orange" icon={<BellOutlined />} style={{ borderRadius: 20, fontSize: 12 }}>
                          {checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown').length} Unknown — Will Notify Management
                        </Tag>
                      )}
                    </Space>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', height: 40, paddingInline: 24, fontWeight: 700 }}
                      onClick={() => setCheckSubmitOpen(true)}
                      disabled={checkSession.every(i => i.physicalCount === i.systemCount)}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                </Card>

                {/* Checked records log — Super Admin / Admin only */}
                {isSuperOrAdmin && (
                  <Card
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginTop: 16 }}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
                      <Space>
                        <SafetyCertificateOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>Stock Check Log — Known &amp; Unknown Reasons</Text>
                        <Tag color="purple" style={{ borderRadius: 20 }}>Super Admin / Admin only</Tag>
                      </Space>
                    </div>
                    <Table
                      dataSource={checkHistoryList}
                      size="small"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                      columns={[
                        { title: 'Item', dataIndex: 'item', render: v => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
                        { title: 'Qty', dataIndex: 'qty', align: 'center', render: (v, r) => `${v} ${r.unit}` },
                        {
                          title: 'Reason Type', dataIndex: 'reasonType', align: 'center',
                          render: v => v === 'Unknown'
                            ? <Tag color="error" style={{ borderRadius: 12 }}>Unknown</Tag>
                            : v === 'Known'
                              ? <Tag color="success" style={{ borderRadius: 12 }}>Known</Tag>
                              : <Text type="secondary">—</Text>
                        },
                        {
                          title: 'Reason', dataIndex: 'reason',
                          render: (v, r) => (
                            <Space direction="vertical" size={0}>
                              <Text style={{ fontSize: 13 }}>{v}</Text>
                              {r.notes && <Text type="secondary" style={{ fontSize: 11 }}>Note: {r.notes}</Text>}
                            </Space>
                          )
                        },
                        { title: 'Checked By', dataIndex: 'checkedBy', render: v => <Space size={4}><UserOutlined style={{ fontSize: 12 }} />{v}</Space> },
                        { title: 'Date', dataIndex: 'date' },
                        { title: 'Time', dataIndex: 'time' },
                        {
                          title: 'Approval', dataIndex: 'approvalStatus', align: 'center',
                          render: v => (
                            <Tag color={v === 'Approved' ? 'success' : v === 'Rejected' ? 'error' : 'warning'} style={{ borderRadius: 12 }}>{v}</Tag>
                          )
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            )
          },
          /* ── Tab: Kit ── */
          {
            key: 'kit',
            label: <Space><ContainerOutlined />Kit</Space>,
            children: (
              <div>
                {/* Kit tab header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <Space>
                    <Text strong style={{ color: textColor, fontSize: 15 }}>Kits</Text>
                    <Tag color="magenta" style={{ borderRadius: 20 }}>{kitsList.length}</Tag>
                  </Space>
                  <Button type="primary" icon={<PlusOutlined />}
                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                    onClick={() => openAddKit(null)}>
                    Add Kit
                  </Button>
                </div>

                {kitsList.length === 0 && (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, textAlign: 'center', padding: 40 }}>
                    <ContainerOutlined style={{ fontSize: 40, color: '#D85C9E', marginBottom: 12 }} />
                    <div><Text type="secondary">No kits yet. Click "Add Kit" to create one.</Text></div>
                  </Card>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kitsList.map((kit) => {
                    const isKitExpanded = expandedKit === kit._id;
                    return (
                      <div key={kit._id} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isKitExpanded ? '#B11E6A44' : borderColor}`, background: cardBg, boxShadow: isKitExpanded ? '0 4px 20px rgba(177,30,106,0.10)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                        {/* Kit card header — click to expand */}
                        <div
                          onClick={() => setExpandedKit(isKitExpanded ? null : kit._id)}
                          style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: isKitExpanded ? (isDark ? 'rgba(177,30,106,0.12)' : 'rgba(177,30,106,0.05)') : 'transparent', borderBottom: isKitExpanded ? `1px solid ${borderColor}` : 'none', transition: 'background 0.2s' }}
                        >
                          {/* Kit icon */}
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ContainerOutlined style={{ color: '#fff', fontSize: 18 }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Space align="center" size={8}>
                              <Text strong style={{ fontSize: 15, color: textColor }}>{kit.kitName}</Text>
                              {kit.kitCode && <Tag style={{ borderRadius: 20, fontSize: 10, background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A33' }}>{kit.kitCode}</Tag>}
                            </Space>
                            <div style={{ marginTop: 2 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {(kit.products || []).length} product{(kit.products || []).length !== 1 ? 's' : ''}
                                {kit.displayUnit ? ` · ${kit.displayUnit.replace(/_/g, ' ')}` : ''}
                                {kit.size ? ` · ${kit.size}` : ''}
                              </Text>
                            </div>
                          </div>

                          {/* Product count chip */}
                          <Tag style={{ borderRadius: 20, fontSize: 12, background: '#B11E6A12', color: '#B11E6A', border: '1px solid #B11E6A33', padding: '2px 12px' }}>
                            {(kit.products || []).length} items
                          </Tag>

                          {/* Actions */}
                          <Space onClick={(e) => e.stopPropagation()}>
                            <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#B11E6A' }} onClick={() => openAddKit(kit)} />
                            <Button type="text" size="small" danger icon={<CloseOutlined />} onClick={() => handleDeleteKit(kit)} />
                          </Space>

                          {/* Chevron */}
                          <div style={{ fontSize: 16, color: '#B11E6A', transform: isKitExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</div>
                        </div>

                        {/* Expanded: kit products table */}
                        {isKitExpanded && (
                          <div style={{ padding: '12px 16px 16px' }}>
                            {(kit.products || []).length === 0 ? (
                              <Text type="secondary" style={{ fontSize: 13 }}>No products in this kit yet.</Text>
                            ) : (
                              <Table
                                dataSource={(kit.products || []).map((p, i) => ({ key: i, ...p }))}
                                size="small"
                                pagination={false}
                                columns={[
                                  {
                                    title: '#', key: 'idx', width: 40,
                                    render: (_, __, i) => (
                                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{i + 1}</Text>
                                      </div>
                                    ),
                                  },
                                  { title: 'Product Name', dataIndex: 'productName', render: v => <Text strong style={{ color: textColor }}>{v}</Text> },
                                  { title: 'Qty', dataIndex: 'qty', width: 80, render: v => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                                  { title: 'Rate (₹)', key: 'rate', width: 100, render: (_, p) => { const v = p.purchasePrice ?? p.rate; return v != null && v !== 0 ? `₹${Number(v).toLocaleString()}` : '—'; } },
                                  { title: 'Unit', dataIndex: 'unit', width: 80, render: v => v || '—' },
                                  { title: 'Product Spec', key: 'spec', render: (_, p) => renderAttrTags(p.productAttributes && Object.keys(p.productAttributes).length ? p.productAttributes : invAttrsByName[p.productName], 220) },
                                ]}
                                style={{ borderRadius: 10, overflow: 'hidden' }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          },

          /* ── Tab: Material Stocks ── */
          {
            key: 'material_stocks',
            label: <Space><ContainerOutlined />Material Stocks</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card
                  style={{ borderRadius: 14, border: `1px solid ${borderColor}`, background: cardBg }}
                  styles={{ body: { padding: '16px 20px' } }}
                  title={
                    <Space>
                      <ContainerOutlined style={{ color: '#B11E6A' }} />
                      <Text strong style={{ color: textColor }}>Packing Material Stocks</Text>
                      <Tag color="geekblue" style={{ borderRadius: 20 }}>{filteredMaterialStocks.length}</Tag>
                    </Space>
                  }
                  extra={
                    <Space size={8}>
                      <Input
                        placeholder="Search material, size, vendor…"
                        prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                        value={materialStockSearch}
                        onChange={e => setMaterialStockSearch(e.target.value)}
                        allowClear
                        style={{ width: 220, borderRadius: 8, height: 34 }}
                      />
                      <Button
                        type="primary" icon={<PlusOutlined />}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8 }}
                        onClick={() => openMaterialStockModal()}
                      >
                        Add Purchase
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    size="small"
                    dataSource={filteredMaterialStocks.map(s => ({ ...s, key: s._id }))}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    columns={[
                      {
                        title: 'Packing Material',
                        dataIndex: 'packingMaterial',
                        render: v => <Text strong style={{ color: textColor }}>{v}</Text>,
                      },
                      {
                        title: 'Size',
                        dataIndex: 'size',
                        render: v => v ? <Tag color="geekblue" style={{ borderRadius: 10 }}>{v}</Tag> : <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Stock Count',
                        dataIndex: 'stockCount',
                        align: 'right',
                        render: v => <Text strong style={{ color: v === 0 ? '#ff4d4f' : '#389e0d', fontSize: 14 }}>{v ?? 0}</Text>,
                      },
                      {
                        title: 'Purchase Date',
                        dataIndex: 'purchaseDate',
                        render: v => v ? dayjs(v).format('DD MMM YYYY') : '—',
                      },
                      {
                        title: 'Vendor',
                        dataIndex: 'vendor',
                        render: v => v || <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Invoice',
                        dataIndex: 'invoiceFile',
                        render: (inv) => {
                          if (!inv?.url) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                          return (
                            <Button
                              type="link"
                              size="small"
                              icon={<DownloadOutlined style={{ fontSize: 12 }} />}
                              style={{ fontSize: 12, color: '#1890ff', padding: 0, height: 'auto' }}
                              onClick={() => downloadFile(inv.url, inv.name || 'invoice')}
                            >
                              Save
                            </Button>
                          );
                        },
                      },
                      {
                        title: 'Action', key: 'action', width: 90,
                        render: (_, row) => (
                          <Space size={6}>
                            <Button size="small" icon={<EditOutlined />} onClick={() => openMaterialStockModal(row)} />
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteMaterialStock(row._id)} />
                          </Space>
                        ),
                      },
                    ]}
                  />
                  {filteredMaterialStocks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Text type="secondary">No material stocks found. Click "Add Purchase" to record a new packing material purchase.</Text>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },

          /* ── Tab: Packing Material Configuration ── */
          {
            key: 'packing_config',
            label: <Space><SettingOutlined />Packing Config</Space>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Display Units */}
                <Card
                  style={{ borderRadius: 14, border: `1px solid ${borderColor}`, background: cardBg }}
                  styles={{ body: { padding: '16px 20px' } }}
                  title={
                    <Space>
                      <TagOutlined style={{ color: '#B11E6A' }} />
                      <Text strong style={{ color: textColor }}>Display Units</Text>
                      <Tag color="geekblue" style={{ borderRadius: 20 }}>{displayUnits.length}</Tag>
                    </Space>
                  }
                  extra={
                    <Button
                      type="primary" size="small" icon={<PlusOutlined />}
                      style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                      onClick={() => openPackingConfigModal('displayUnit')}
                    >
                      Add Display Unit
                    </Button>
                  }
                >
                  <Table
                    size="small"
                    dataSource={displayUnits.map(d => ({ ...d, key: d._id }))}
                    pagination={false}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    expandable={{
                      expandedRowRender: row => (
                        <div style={{ padding: '8px 12px' }}>
                          {(row.subtypes || []).length === 0 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>No types configured for this display unit.</Text>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {(row.subtypes || []).map((s, i) => (
                                <div key={i} style={{ background: 'rgba(177,30,106,0.04)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 8, padding: '6px 12px', minWidth: 180 }}>
                                  <Text strong style={{ fontSize: 12, color: '#B11E6A', display: 'block' }}>{s.label}{s.size ? <Text type="secondary" style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>({s.size})</Text> : null}</Text>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                    {s.sticker && <Tag color={s.sticker === 'YES' ? 'green' : 'red'} style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>Sticker: {s.sticker}</Tag>}
                                    {s.logo && <Tag color={s.logo === 'YES' ? 'green' : 'red'} style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>Logo: {s.logo}</Tag>}
                                    {s.printing && <Tag color={s.printing === 'YES' ? 'green' : 'red'} style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>Printing: {s.printing}</Tag>}
                                    {s.lamination && <Tag color={s.lamination === 'YES' ? 'blue' : 'default'} style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>Lamination: {s.lamination}</Tag>}
                                  </div>
                                  <div style={{ marginTop: 4, fontSize: 11, color: '#555' }}>
                                    Purchase: <b>₹{s.purchasePrice || 0}</b> &nbsp;|&nbsp; Margin: <b>₹{s.marginAmount || 0}</b> &nbsp;|&nbsp; Selling: <b style={{ color: '#722ed1' }}>₹{s.sellingPrice || 0}</b>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ),
                      rowExpandable: () => true,
                    }}
                    columns={[
                      { title: 'Label', dataIndex: 'label', render: v => <Text strong style={{ color: textColor }}>{v}</Text> },
                      { title: 'Value', dataIndex: 'value', render: v => <Tag style={{ borderRadius: 12 }}>{v}</Tag> },
                      {
                        title: 'Operations Tab',
                        dataIndex: 'tabMapping',
                        render: v => v
                          ? <Tag color={v === 'Box' ? 'blue' : v === 'Ziplock' ? 'cyan' : v === 'Butter Paper' ? 'gold' : 'purple'} style={{ borderRadius: 12 }}>{v}</Tag>
                          : <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Types',
                        dataIndex: 'subtypes',
                        render: v => <Tag color="geekblue" style={{ borderRadius: 10 }}>{(v || []).length} type{(v || []).length !== 1 ? 's' : ''}</Tag>,
                      },
                      {
                        title: 'Action', key: 'action', width: 100,
                        render: (_, row) => (
                          <Space size={6}>
                            <Button size="small" icon={<EditOutlined />} onClick={() => openPackingConfigModal('displayUnit', row)} />
                            <Button
                              size="small" danger icon={<DeleteOutlined />}
                              onClick={() => handleDeletePackingConfig(row._id)}
                            />
                          </Space>
                        ),
                      },
                    ]}
                  />
                  {displayUnits.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <Text type="secondary">No display units configured. Click "Add Display Unit" to start.</Text>
                    </div>
                  )}
                </Card>


              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(activeInvTab)}
      />

      {/* ═══════════════════════════════════════
          MATERIAL STOCK ADD / EDIT MODAL
      ═══════════════════════════════════════ */}
      <Modal
        open={materialStockModal}
        title={
          <Space>
            <ContainerOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>{editingMaterialStock ? 'Edit Material Stock' : 'Add Packing Material Purchase'}</span>
          </Space>
        }
        onCancel={() => { setMaterialStockModal(false); setEditingMaterialStock(null); setMaterialStockInvoiceFile(null); }}
        onOk={handleSaveMaterialStock}
        okText={editingMaterialStock ? 'Update' : 'Add'}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }, loading: materialStockInvoiceUploading }}
        width={520}
        destroyOnClose
      >
        <Form form={materialStockForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item label="Packing Material" name="packingMaterial" rules={[{ required: true, message: 'Enter material name' }]}>
                <Input placeholder="e.g. Bottles, Boxes, Pouches, Caps…" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Size" name="size">
                <Input placeholder="e.g. 100ml, 30×20cm" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Stock Count" name="stockCount" rules={[{ required: true, message: 'Enter stock count' }]}>
                <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%', borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Vendor / Supplier" name="vendor">
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Select vendor / supplier"
              style={{ borderRadius: 8 }}
              options={materialStockVendorOptions}
              notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No vendors yet — add one in Vendors & Suppliers</span>}
            />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional notes…" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item label="Upload Invoice (optional)">
            <Upload
              maxCount={1}
              accept=".jpg,.jpeg,.png,.pdf,.svg"
              beforeUpload={(file) => { setMaterialStockInvoiceFile(file); return false; }}
              onRemove={() => setMaterialStockInvoiceFile(null)}
              fileList={materialStockInvoiceFile ? [materialStockInvoiceFile] : []}
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Choose Invoice File</Button>
            </Upload>
            {editingMaterialStock?.invoiceFile?.url && !materialStockInvoiceFile && (
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Current invoice: </Text>
                <Button type="link" size="small" icon={<DownloadOutlined style={{ fontSize: 12 }} />}
                  style={{ fontSize: 12, padding: 0, height: 'auto' }}
                  onClick={() => downloadFile(editingMaterialStock.invoiceFile.url, editingMaterialStock.invoiceFile.name || 'invoice')}>
                  Save
                </Button>
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          PACKING CONFIG ADD / EDIT MODAL
      ═══════════════════════════════════════ */}
      <Modal
        open={packingConfigModal}
        title={
          <Space>
            <SettingOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>
              {editingPackingConfig ? 'Edit' : 'Add'} Display Unit
            </span>
          </Space>
        }
        onCancel={() => { setPackingConfigModal(false); setEditingPackingConfig(null); }}
        onOk={handleSavePackingConfig}
        okText={editingPackingConfig ? 'Update' : 'Add'}
        width={660}
        okButtonProps={{ style: { background: '#B11E6A', border: 'none' } }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}
      >
        <Form form={packingConfigForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item label="Label" name="label" rules={[{ required: true, message: 'Label is required' }]}>
                <Input placeholder="e.g. Box" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Value" name="value" rules={[{ required: true, message: 'Value is required' }]}>
                <Input placeholder="e.g. BOX" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Operations Tab Mapping"
            name="tabMapping"
            tooltip="Which Operations tab orders using this display unit appear in"
          >
            <Select allowClear placeholder="Select tab (optional)">
              <Option value="Sticker">Sticker</Option>
              <Option value="Box">Box</Option>
              <Option value="Ziplock">Ziplock (Frosted)</Option>
              <Option value="Butter Paper">Butter Paper</Option>
            </Select>
          </Form.Item>

          <Divider style={{ margin: '8px 0 12px' }}>
            <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 600 }}>Types & Pricing</Text>
          </Divider>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 10 }}>
            Add sub-types for this display unit (e.g. "Small Box", "Large Box") with their sticker/logo/printing options and pricing.
          </Text>

          <Form.List name="subtypes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ background: 'rgba(177,30,106,0.03)', border: '1px solid rgba(177,30,106,0.15)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                    <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                      <Col flex="1">
                        <Form.Item name={[name, 'label']} rules={[{ required: true, message: 'Type label required' }]} style={{ marginBottom: 0 }}>
                          <Input size="small" placeholder="Type label (e.g. Small Box)" style={{ fontWeight: 600 }} />
                        </Form.Item>
                      </Col>
                      <Col xs={10} sm={8}>
                        <Form.Item name={[name, 'size']} style={{ marginBottom: 0 }}>
                          <Input size="small" placeholder="Size (e.g. 2.5×2.5cm)" />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Button type="text" danger size="small" icon={<MinusOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                    <Form.Item noStyle shouldUpdate={(p, c) => p.label !== c.label || p.tabMapping !== c.tabMapping}>
                      {({ getFieldValue }) => {
                        const lbl = getFieldValue('label') || '';
                        const tab = getFieldValue('tabMapping');
                        const isBox = lbl.toLowerCase().includes('box') || tab === 'Box';
                        const colSpan = isBox ? 6 : 8;
                        return (
                          <Row gutter={8}>
                            <Col xs={colSpan}>
                              <Form.Item name={[name, 'sticker']} label="Sticker" style={{ marginBottom: 6 }}>
                                <Select size="small" allowClear placeholder="—" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={colSpan}>
                              <Form.Item name={[name, 'logo']} label="Logo" style={{ marginBottom: 6 }}>
                                <Select size="small" allowClear placeholder="—" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={colSpan}>
                              <Form.Item name={[name, 'printing']} label="Printing" style={{ marginBottom: 6 }}>
                                <Select size="small" allowClear placeholder="—" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                              </Form.Item>
                            </Col>
                            {isBox && (
                              <Col xs={6}>
                                <Form.Item name={[name, 'lamination']} label="Lamination" style={{ marginBottom: 6 }}>
                                  <Select size="small" allowClear placeholder="—" options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} />
                                </Form.Item>
                              </Col>
                            )}
                          </Row>
                        );
                      }}
                    </Form.Item>
                    <Row gutter={8}>
                      <Col xs={8}>
                        <Form.Item name={[name, 'purchasePrice']} label="Purchase Price (₹)" style={{ marginBottom: 0 }}>
                          <InputNumber size="small" min={0} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item name={[name, 'marginAmount']} label="Margin Amount (₹)" style={{ marginBottom: 0 }}>
                          <InputNumber size="small" min={0} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col xs={8}>
                        <Form.Item name={[name, 'sellingPrice']} label="Selling Price (₹)" style={{ marginBottom: 0 }}>
                          <InputNumber size="small" min={0} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button
                  type="dashed" size="small" icon={<PlusOutlined />}
                  onClick={() => add({ label: '', sticker: '', logo: '', printing: '', lamination: '', purchasePrice: 0, marginAmount: 0, sellingPrice: 0 })}
                  block
                  style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}
                >
                  Add Type
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          KIT ADD / EDIT MODAL
      ═══════════════════════════════════════ */}
      <Modal
        open={kitModal}
        title={editingKit ? 'Edit Kit' : 'Add Kit'}
        onCancel={() => { setKitModal(false); setEditingKit(null); }}
        onOk={handleSaveKit}
        okText={editingKit ? 'Update Kit' : 'Add Kit'}
        width={Math.min(780, window.innerWidth - 24)}
        okButtonProps={{ style: { background: '#B11E6A', border: 'none' } }}
        styles={{ body: { padding: '16px 24px' } }}
        afterOpenChange={(open) => { if (open) initKitForm(editingKit); }}
      >
        <Form form={kitForm} layout="vertical">
          {/* Kit header fields */}
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item label="Kit Name" name="kitName" rules={[{ required: true, message: 'Kit name required' }]}>
                <Input placeholder="e.g. Dental Kit A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Size" name="size">
                <Input placeholder="e.g. 2.5cm x 2.5cm" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '4px 0 12px' }}>Products in this Kit</Divider>

          {/* Product cards — same fields as Add Item */}
          <Form.List name="products">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, idx) => (
                  <div
                    key={field.key}
                    style={{ marginBottom: 14, border: '1px solid rgba(177,30,106,0.15)', borderRadius: 12, overflow: 'hidden', background: isDark ? '#1a1a2e' : '#fff' }}
                  >
                    {/* Product card header */}
                    <div style={{ background: isDark ? 'rgba(177,30,106,0.10)' : 'rgba(177,30,106,0.04)', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(177,30,106,0.10)' }}>
                      <Space>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{idx + 1}</Text>
                        </div>
                        <Text strong style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#1a1a2e' }}>Product {idx + 1}</Text>
                      </Space>
                      <Button type="text" danger size="small" icon={<MinusOutlined />} onClick={() => remove(field.name)} />
                    </div>

                    {/* Visible: Product Name + Qty only. All detail fields hidden but preserved in form state for the save payload. */}
                    <div style={{ padding: '12px 14px' }}>
                      <Row gutter={[12, 0]} align="bottom">
                        <Col xs={16} sm={18}>
                          <Form.Item {...field} label="Product Name" name={[field.name, 'productName']} rules={[{ required: true, message: 'Required' }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="Select from inventory"
                              style={{ width: '100%' }}
                              options={inventoryList.map((i) => ({
                                value: i.key,
                                label: dupeInventoryNames.has(i.name) ? `${i.name} (${i.code || ''})` : i.name,
                              }))}
                              onChange={(selectedKey) => {
                                const item = inventoryList.find((i) => i.key === selectedKey);
                                if (!item) return;
                                kitForm.setFields([
                                  { name: ['products', field.name, 'category'], value: item.category || '' },
                                  { name: ['products', field.name, 'unit'], value: item.unit || '' },
                                  { name: ['products', field.name, 'defaultSize'], value: item.defaultSize || '' },
                                  { name: ['products', field.name, 'purchasePrice'], value: item.value || '' },
                                  { name: ['products', field.name, 'sellingPrice'], value: item.sellingPrice || '' },
                                  { name: ['products', field.name, 'hsnCode'], value: item.hsnCode || '' },
                                  { name: ['products', field.name, 'gst'], value: item.gstPercent > 0 ? `${item.gstPercent}%` : 'None' },
                                  { name: ['products', field.name, 'discountPercent'], value: item.discountPercent || '' },
                                  { name: ['products', field.name, 'packingMaterial'], value: item.packingMaterial || '' },
                                  { name: ['products', field.name, 'materialCategory'], value: item.materialCategory || '' },
                                  { name: ['products', field.name, 'brand'], value: item.brand || '' },
                                ]);
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={8} sm={6}>
                          <Form.Item {...field} label="Qty" name={[field.name, 'qty']}>
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
                          </Form.Item>
                        </Col>
                      </Row>

                      {/* Hidden fields — auto-filled from inventory selection, sent in save payload */}
                      <Form.Item {...field} name={[field.name, 'category']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'unit']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'defaultSize']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'purchasePrice']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'sellingPrice']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'hsnCode']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'gst']} hidden initialValue="None"><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'discountPercent']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'packingMaterial']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'materialCategory']} hidden><Input /></Form.Item>
                      <Form.Item {...field} name={[field.name, 'brand']} hidden><Input /></Form.Item>
                    </div>
                  </div>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ productName: '', qty: 1, gst: 'None' })}
                  style={{ borderRadius: 10, height: 44, borderColor: '#B11E6A66', color: '#B11E6A', marginTop: 4 }}
                >
                  Add Product to Kit
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          ITEM DETAIL DRAWER (row click)
      ═══════════════════════════════════════ */}
      <Drawer
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        width={Math.min(480, window.innerWidth)}
        title={
          detailItem ? (
            <Space>
              <ContainerOutlined style={{ color: '#B11E6A' }} />
              <span style={{ fontWeight: 700, color: textColor }}>{detailItem.name}</span>
              <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600 }}>{detailItem.code}</Tag>
            </Space>
          ) : null
        }
        styles={{ body: { background: isDark ? '#13131f' : '#f4f5f9', padding: 16 } }}
      >
        {detailItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stock summary */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Row gutter={16}>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Current Stock</Text>
                  <Text strong style={{ fontSize: 26, color: '#B11E6A' }}>{detailItem.current}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{detailItem.unit}</Text>
                </Col>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Min Required</Text>
                  <Text strong style={{ fontSize: 26, color: '#C94F8A' }}>{detailItem.min}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{detailItem.unit}</Text>
                </Col>
              </Row>
            </Card>

            {/* Details */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Item Details</Text>
              <Descriptions column={2} size="small" labelStyle={{ color: '#aaa', fontSize: 12 }} contentStyle={{ fontWeight: 600, fontSize: 13 }}>
                <Descriptions.Item label="Category">{detailItem.category || '—'}</Descriptions.Item>
                <Descriptions.Item label="Unit">{detailItem.unit || '—'}</Descriptions.Item>
                <Descriptions.Item label="Purchase Price">{detailItem.price || '—'}</Descriptions.Item>
                <Descriptions.Item label="Selling Price">{detailItem.sellingPrice != null ? `₹${Number(detailItem.sellingPrice).toLocaleString()}` : '—'}</Descriptions.Item>
                <Descriptions.Item label="Default Size">{detailItem.defaultSize || '—'}</Descriptions.Item>
                <Descriptions.Item label="HSN Code">{detailItem.hsnCode || '—'}</Descriptions.Item>
                <Descriptions.Item label="GST %">{detailItem.gstPercent > 0 ? `${detailItem.gstPercent}%` : '—'}</Descriptions.Item>
                <Descriptions.Item label="Discount">{detailItem.discountPercent != null && detailItem.discountPercent > 0 ? `${detailItem.discountPercent}%` : '—'}</Descriptions.Item>
                <Descriptions.Item label="Brand">{detailItem.brand || '—'}</Descriptions.Item>
                <Descriptions.Item label="Packing Material">{detailItem.packingMaterial || '—'}</Descriptions.Item>
                <Descriptions.Item label="Material Category">{detailItem.materialCategory || '—'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag style={{ borderRadius: 20, fontWeight: 500, background: detailItem.status === 'OK' ? '#B11E6A22' : detailItem.status === 'Low' ? '#C94F8A22' : '#8a165222', color: detailItem.status === 'OK' ? '#B11E6A' : detailItem.status === 'Low' ? '#C94F8A' : '#8a1652', border: 'none' }}>
                    {detailItem.status === 'Out' ? 'Out of Stock' : detailItem.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
              {attrEntries(detailItem.productAttributes).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <Text strong style={{ color: textColor, display: 'block', marginBottom: 8, fontSize: 13 }}>Product Attributes</Text>
                  {renderAttrTags(detailItem.productAttributes, '100%')}
                </div>
              )}
            </Card>

            {/* Suppliers */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Suppliers / Stock Sources</Text>
              {(detailItem.sellers || []).length === 0 && <Text type="secondary" style={{ fontSize: 13 }}>No suppliers linked</Text>}
              {(detailItem.sellers || []).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: isDark ? '#2a2a3e' : '#f8f8fc', borderRadius: 8, marginBottom: 6 }}>
                  <Text style={{ fontWeight: 600, fontSize: 13, color: textColor }}>{s.name || s}</Text>
                  <Tag style={{ background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20 }}>{s.stock ?? 0} {detailItem.unit}</Tag>
                </div>
              ))}
            </Card>

            {/* Recent history for this item */}
            <Card style={sectionCard} styles={{ body: { padding: '14px 16px' } }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 10 }}>Recent Stock History</Text>
              {stockHistory.filter(h => h.item === detailItem.name).slice(0, 4).length === 0 && (
                <Text type="secondary" style={{ fontSize: 13 }}>No history yet</Text>
              )}
              {stockHistory.filter(h => h.item === detailItem.name).slice(0, 4).map(h => (
                <div key={h.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${borderColor}` }}>
                  <Space>
                    <Tag color={h.action === 'Stock Added' ? 'success' : 'error'} style={{ borderRadius: 12, fontSize: 11 }}>{h.action}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>{h.date}</Text>
                  </Space>
                  <Text strong style={{ color: h.action === 'Stock Added' ? '#52c41a' : '#ff4d4f', fontSize: 13 }}>
                    {h.action === 'Stock Added' ? '+' : '-'}{h.qty} units
                  </Text>
                </div>
              ))}
            </Card>

            {/* Quick actions — Add Stock / Sell Stock hidden per request
            <Row gutter={10}>
              <Col span={12}>
                <Button block icon={<DownloadOutlined />} type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', height: 42, borderRadius: 10, fontWeight: 700 }} onClick={() => { setDetailItem(null); openReceive(detailItem); }}>
                  Add Stock
                </Button>
              </Col>
              <Col span={12}>
                <Button block icon={<ShoppingOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A', height: 42, borderRadius: 10, fontWeight: 700 }} onClick={() => { setDetailItem(null); openIssue(detailItem); }}>
                  Sell Stock
                </Button>
              </Col>
            </Row>
            */}
          </div>
        )}
      </Drawer>

      {/* ═══════════════════════════════════════
          SUBMIT STOCK CHECK CONFIRMATION MODAL
      ═══════════════════════════════════════ */}
      <Modal
        open={checkSubmitOpen}
        onCancel={() => setCheckSubmitOpen(false)}
        title={
          <Space>
            <AuditOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>Confirm Stock Check Submission</span>
          </Space>
        }
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setCheckSubmitOpen(false)}>Cancel</Button>
            <Button type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }} onClick={handleSubmitCheck}>
              Confirm & Submit
            </Button>
          </div>
        }
        width={500}
        centered
      >
        <div style={{ marginTop: 8 }}>
          <div style={{ background: '#B11E6A10', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <Row gutter={16}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Total Items</Text>
                <Text strong style={{ fontSize: 22, color: textColor }}>{checkSession.length}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Discrepancies</Text>
                <Text strong style={{ fontSize: 22, color: '#ff4d4f' }}>{checkSession.filter(i => i.physicalCount !== i.systemCount).length}</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 12, color: '#aaa', display: 'block' }}>Unknown</Text>
                <Text strong style={{ fontSize: 22, color: '#fa8c16' }}>{checkSession.filter(i => i.physicalCount < i.systemCount && i.missingType === 'unknown').length}</Text>
              </Col>
            </Row>
          </div>

          {checkSession.filter(i => i.physicalCount !== i.systemCount).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Text strong style={{ color: textColor, display: 'block', marginBottom: 8 }}>Items with Discrepancies:</Text>
              {checkSession.filter(i => i.physicalCount !== i.systemCount).map(item => {
                const diff = item.physicalCount - item.systemCount;
                return (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: isDark ? '#2a2a3e' : '#f8f8fc', borderRadius: 8, marginBottom: 6 }}>
                    <Space>
                      <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                      {item.missingType === 'unknown' && <Tag color="warning" style={{ borderRadius: 20, fontSize: 11 }}>Unknown</Tag>}
                      {item.missingType === 'known' && <Tag color="blue" style={{ borderRadius: 20, fontSize: 11 }}>Known</Tag>}
                    </Space>
                    <Text strong style={{ color: diff < 0 ? '#ff4d4f' : '#fa8c16', fontSize: 13 }}>
                      {diff > 0 ? '+' : ''}{diff} {item.unit}
                    </Text>
                  </div>
                );
              })}
            </div>
          )}

          {checkSession.some(i => i.physicalCount < i.systemCount && i.missingType === 'unknown') && (
            <Alert
              type="warning"
              showIcon
              icon={<BellOutlined />}
              message="Management will be notified"
              description="Unknown shortages will trigger automatic notifications to Super Admin and Manager."
              style={{ borderRadius: 8 }}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 13, color: '#aaa', display: 'block', marginBottom: 6 }}>Additional Notes (optional)</Text>
            <Input.TextArea
              value={checkNotes}
              onChange={e => setCheckNotes(e.target.value)}
              placeholder="Any additional notes about this stock check session..."
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════
          MANUAL ADJUSTMENT MODAL (+ / - buttons)
      ═══════════════════════════════════════ */}
      <Modal
        title={
          <Space>
            {adjustModal.type === 'Addition'
              ? <PlusOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              : <MinusOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />}
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {adjustModal.type === 'Addition' ? 'Add Stock' : 'Reduce Stock'}
              {adjustModal.item ? ` — ${adjustModal.item.name}` : ''}
            </span>
          </Space>
        }
        open={adjustModal.open}
        onCancel={() => { setAdjustModal({ open: false, item: null, type: null }); adjustForm.resetFields(); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAdjustModal({ open: false, item: null, type: null }); adjustForm.resetFields(); }}>Cancel</Button>
            <Button
              type="primary"
              style={{ background: adjustModal.type === 'Addition' ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : 'linear-gradient(135deg,#8a1652,#B11E6A)', border: 'none' }}
              onClick={async () => {
                try {
                  const vals = await adjustForm.validateFields();
                  if (adjustModal.type === 'Addition') {
                    await addStockRequest({ id: adjustModal.item.key, qty: vals.count, reason: vals.notes || 'Manual adjustment' }).unwrap();
                  } else {
                    await sellStockRequest({ id: adjustModal.item.key, qty: vals.count, reason: vals.notes || 'Manual adjustment' }).unwrap();
                  }
                  enqueueSnackbar('Adjustment request submitted for approval', { variant: 'success' });
                  setAdjustModal({ open: false, item: null, type: null });
                  adjustForm.resetFields();
                } catch {
                  enqueueSnackbar('Failed to submit adjustment', { variant: 'error' });
                }
              }}
            >
              OK
            </Button>
          </div>
        }
        width={420} centered
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={adjustForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label={<Text style={{ fontWeight: 600 }}>{adjustModal.type === 'Addition' ? 'Add Count' : 'Minus Count'}</Text>}
            name="count"
            rules={[{ required: true, message: 'Enter count' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
            style={{ marginBottom: 16 }}
          >
            <InputNumber min={1} style={{ width: '100%', borderRadius: 8 }} placeholder={`Enter quantity to ${adjustModal.type === 'Addition' ? 'add' : 'reduce'}`} addonAfter="units" />
          </Form.Item>
          <Form.Item label={<Text style={{ fontWeight: 600 }}>Notes / Description</Text>} name="notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="Reason for this adjustment..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          ADD ITEM MODAL
      ═══════════════════════════════════════ */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</span>}
        open={addItemModal}
        onCancel={() => { setAddItemModal(false); setEditingItem(null); addItemForm.resetFields(); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setAddItemModal(false); setEditingItem(null); addItemForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleSaveItem} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>{editingItem ? 'Update Item' : 'Save Item'}</Button>
          </div>
        }
        width={Math.min(560, window.innerWidth - 24)} centered
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form
          form={addItemForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onValuesChange={(changed) => {
            // Selling Price auto-fills to Purchase Price + Limitations (margin_amount) whenever either changes,
            // so it can never start below the floor. The validator below blocks manual reductions.
            if ('purchase_price' in changed || 'margin_amount' in changed) {
              const pp = Number(String(addItemForm.getFieldValue('purchase_price') ?? '').replace(/[^0-9.]/g, '')) || 0;
              const mm = Number(String(addItemForm.getFieldValue('margin_amount') ?? '').replace(/[^0-9.]/g, '')) || 0;
              addItemForm.setFieldValue('selling_price', String(pp + mm));
              addItemForm.validateFields(['selling_price']).catch(() => {});
            }
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={editingItem ? 12 : 24}>
              <Form.Item label="Vendor" name="vendorId" tooltip="Which vendor this batch of stock was purchased from.">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select vendor / supplier"
                  options={suppliers.map((v) => ({ label: v.name, value: v._id }))}
                  notFoundContent={<span style={{ fontSize: 12, color: '#aaa' }}>No vendors yet — add one in Vendors & Suppliers</span>}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Purchase Date" name="purchaseDate" initialValue={dayjs()} tooltip="Defaults to today — edit if this stock was actually bought on an earlier date. Used to decide which vendor's stock gets used up first.">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item label="Item Name" name="name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Category" name="category">
                <SelectWithAdd
                  field="inventoryCategory"
                  defaultOptions={categories.map((item) => ({ label: item, value: item }))}
                  placeholder="Select / Add category"
                />
              </Form.Item>
            </Col>
            {!editingItem && <Col xs={24} sm={8}><Form.Item label="Opening Stock" name="current"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>}
            {editingItem && (
              <Col xs={24} sm={8}>
                <Form.Item label="Add Stock (Qty)" name="addStockQty" tooltip="Bought more of this same product? Enter the quantity here — it's added on top of the current stock as a new purchase batch under the Vendor + Purchase Date selected above.">
                  <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={8}><Form.Item label="Min Stock" name="min"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Purchase Price" name="purchase_price">
                <Input prefix="₹" addonAfter={<Form.Item name="purchase_price_tax" noStyle initialValue="without_gst"><Select style={{ width: 120 }}><Option value="with_gst">With GST</Option><Option value="without_gst">Without GST</Option></Select></Form.Item>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Limitations" name="margin_amount" tooltip="Minimum amount that must be added on top of Purchase Price when setting the Selling Price.">
                <Input prefix="₹" placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Selling Price"
                name="selling_price"
                tooltip="Auto-calculated as Purchase Price + Limitations. Cannot be reduced below that floor."
                extra={<Text style={{ fontSize: 11, color: '#999' }}>= Purchase Price + Limitations</Text>}
                rules={[{
                  validator: (_, val) => {
                    const pp = Number(String(addItemForm.getFieldValue('purchase_price') ?? '').replace(/[^0-9.]/g, '')) || 0;
                    const mm = Number(String(addItemForm.getFieldValue('margin_amount') ?? '').replace(/[^0-9.]/g, '')) || 0;
                    const sp = Number(String(val ?? '').replace(/[^0-9.]/g, '')) || 0;
                    const floor = pp + mm;
                    if (sp < floor) return Promise.reject(new Error(`Cannot be below ₹${floor} (Purchase + Limitations)`));
                    return Promise.resolve();
                  },
                }]}
              >
                <Input prefix="₹" addonAfter={<Form.Item name="selling_price_tax" noStyle initialValue="without_gst"><Select style={{ width: 120 }}><Option value="with_gst">With GST</Option><Option value="without_gst">Without GST</Option></Select></Form.Item>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="GST %" name="gstPercent" tooltip="GST percentage applied to this product. Orders/leads auto-fill this value when the product is selected.">
                <Select allowClear placeholder="Select GST %">
                  <Option value={0}>None (0%)</Option>
                  <Option value={5}>5%</Option>
                  <Option value={12}>12%</Option>
                  <Option value={18}>18%</Option>
                  <Option value={28}>28%</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}><Form.Item label="HSN" name="hsn"><Input placeholder="Ex: 6704" /></Form.Item></Col>
          </Row>

          {/* ── Dynamic product-type attributes ── */}
          {(() => {
            const activeDefs = productFieldDefs.length > 0 ? productFieldDefs : GENERIC_PRODUCT_FIELD_DEFS;
            return (
              <>
                <Divider style={{ margin: '4px 0 12px' }}>
                  <Text style={{ fontSize: 12, color: '#B11E6A', fontWeight: 600 }}>Product Attributes</Text>
                </Divider>
                <Row gutter={16}>
                  {activeDefs.map((fd) => {
                    // Persist user-added dropdown values per item name (not just per product type),
                    // so values you add while editing a specific item are remembered for that item.
                    // Falls back to the type-level field until an item name is entered.
                    const nameKey = String(watchedItemName || '').trim().toLowerCase();
                    const scopedField = nameKey ? `item__${nameKey}__${fd.key}` : fd.field;
                    return (
                    <Col xs={24} sm={12} key={fd.key}>
                      <Form.Item label={fd.label} name={['productAttrs', fd.key]}>
                        <SelectWithAdd
                          field={scopedField}
                          mode={fd.mode}
                          defaultOptions={fd.usePackingConfig ? packingMaterials.map(c => ({ value: c.value, label: c.label })) : fd.options}
                          placeholder={`Select / Add ${fd.label.toLowerCase()}`}
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                    );
                  })}
                </Row>
              </>
            );
          })()}
        </Form>
      </Modal>

      {/* ═══════════════════════════════════════
          ADD STOCK DRAWER (Receive Goods) — hidden per request
      <Drawer
        open={receiveOpen}
        onClose={() => { setReceiveOpen(false); setSelectedSupplier(null); setShowAddSupplier(false); receiveForm.resetFields(); supplierForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button type="primary" block style={saveBtn('linear-gradient(135deg,#B11E6A,#D85C9E)')}
            onClick={async () => {
              try {
                const vals = receiveForm.getFieldsValue();
                await addStockRequest({ id: activeItem.key, qty: Number(vals.qty) || 0, vendorName: selectedSupplier?.name || '', reason: vals.comment || '' }).unwrap();
                enqueueSnackbar(`Stock addition request for ${activeItem.name} sent for approval`, { variant: 'success' });
                setReceiveOpen(false);
                setSelectedSupplier(null);
                setShowAddSupplier(false);
                receiveForm.resetFields();
              } catch {
                enqueueSnackbar('Failed to submit stock request', { variant: 'error' });
              }
            }}
          >
            REQUEST APPROVAL FOR ADD STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setReceiveOpen(false)} style={{ color: '#B11E6A', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Add Stock</Text>
            {activeItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Receive Goods</Text>}
          </div>
          {activeItem && <Tag style={{ background: '#B11E6A15', color: '#B11E6A', border: '1px solid #B11E6A44', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>{activeItem.code}</Tag>}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeItem && (
            <div style={sectionCard}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DownloadOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{activeItem.name}</Text>
                  <Space size={6} style={{ flexWrap: 'wrap' }}>
                    <Tag style={{ borderRadius: 20, fontSize: 11, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44', margin: 0 }}>{activeItem.category}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Current: <strong style={{ color: activeItem.status === 'OK' ? '#B11E6A' : '#C94F8A' }}>{activeItem.current} units</strong></Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Min: {activeItem.min} units</Text>
                  </Space>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <Progress percent={Math.min(100, Math.round((activeItem.current / activeItem.max) * 100))} size="small" strokeColor={activeItem.status === 'OK' ? '#B11E6A' : '#C94F8A'} showInfo={false} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeItem.max} units</Text>
                </div>
              </div>
            </div>
          )}

          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#B11E6A' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={receiveForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="qty" rules={[{ required: true, message: 'Enter quantity' }]} style={{ marginBottom: 12 }}>
                      <Input type="number" min={0} placeholder="0" suffix={<Space size={4}><Text style={{ color: '#aaa', fontSize: 12 }}>{activeItem?.unit}</Text><CalculatorOutlined style={{ color: '#B11E6A' }} /></Space>} style={{ borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Supply Price</Text>} name="supply_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Arrival Date</Text>} name="date" style={{ marginBottom: 12 }}>
                      <DatePicker style={{ width: '100%', borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Comment</Text>} name="comment" style={{ marginBottom: 12 }}>
                  <Input.TextArea rows={2} placeholder="Optional note..." style={{ borderRadius: 8 }} />
                </Form.Item>
                <Row gutter={12}>
                  <Col span={14}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Upload Invoice</Text>} name="invoice" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList} style={{ marginBottom: 0 }}>
                      <Upload maxCount={1} customRequest={makeUpload('inventory/invoices')}>
                        <Button icon={<UploadOutlined />} style={{ width: '100%', borderRadius: 8 }}>Invoice File</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Payment Status</Text>} name="is_paid" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Switch checkedChildren="Paid" unCheckedChildren="Unpaid" defaultChecked />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
          </div>

          {renderEntitySelector({
            label: 'Supplier',
            icon: <UserOutlined style={{ color: '#B11E6A' }} />,
            search: supplierSearch,
            setSearch: setSupplierSearch,
            filtered: filteredSuppliers,
            selected: selectedSupplier,
            setSelected: setSelectedSupplier,
            showAdd: showAddSupplier,
            setShowAdd: setShowAddSupplier,
            addForm: supplierForm,
            gradient: 'linear-gradient(135deg,#B11E6A,#D85C9E)',
            onSave: handleSaveSupplier,
            addFormFields: (
              <>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="sup_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}><Input placeholder="Supplier name" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="sup_phone" style={{ marginBottom: 10 }} rules={[phoneValidator(false)]}><PhoneInput placeholder="Phone number" /></Form.Item></Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="sup_email" style={{ marginBottom: 10 }} rules={emailRules(false)}><Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="sup_tax" style={{ marginBottom: 10 }}><Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="sup_address" style={{ marginBottom: 10 }}><Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <VendorBankFields form={supplierForm} namePrefix="bankDetails" labelSize={13} />
                <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="sup_notes" style={{ marginBottom: 10 }}><Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} /></Form.Item>
              </>
            ),
          })}
        </div>
      </Drawer>
      ═══════════════════════════════════════ */}

      {/* ═══════════════════════════════════════
          SELL STOCK DRAWER (Issue Goods) — hidden per request
      <Drawer
        open={issueOpen}
        onClose={() => { setIssueOpen(false); setSelectedVendor(null); setShowAddVendor(false); issueForm.resetFields(); vendorForm.resetFields(); }}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{ body: { padding: 0, background: isDark ? '#13131f' : '#f4f5f9' }, header: { display: 'none' } }}
        footer={
          <Button type="primary" block style={saveBtn('linear-gradient(135deg,#8a1652,#B11E6A)')}
            onClick={async () => {
              try {
                const vals = issueForm.getFieldsValue();
                await sellStockRequest({ id: activeIssueItem.key, qty: Number(vals.qty) || 0, vendorName: selectedVendor?.name || '', reason: vals.comment || '' }).unwrap();
                enqueueSnackbar(`Stock deduction request for ${activeIssueItem.name} sent for approval`, { variant: 'success' });
                setIssueOpen(false);
                setSelectedVendor(null);
                setShowAddVendor(false);
                issueForm.resetFields();
              } catch {
                enqueueSnackbar('Failed to submit stock request', { variant: 'error' });
              }
            }}
          >
            REQUEST APPROVAL FOR SELL STOCK
          </Button>
        }
        footerStyle={{ padding: '12px 16px', background: cardBg, borderTop: `1px solid ${borderColor}` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => setIssueOpen(false)} style={{ color: '#8a1652', padding: 0, height: 'auto' }} />
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 700, color: textColor, display: 'block', lineHeight: 1.2 }}>Sell Stock</Text>
            {activeIssueItem && <Text style={{ fontSize: 12, color: '#aaa' }}>Issue Goods</Text>}
          </div>
          {activeIssueItem && <Tag style={{ background: '#8a165215', color: '#8a1652', border: '1px solid #8a165244', borderRadius: 20, fontWeight: 600, fontSize: 11 }}>{activeIssueItem.code}</Tag>}
        </div>

        <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeIssueItem && (
            <div style={sectionCard}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#8a1652,#B11E6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingOutlined style={{ color: '#fff', fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: 700, color: textColor, display: 'block', fontSize: 14 }}>{activeIssueItem.name}</Text>
                  <Space size={6} style={{ flexWrap: 'wrap' }}>
                    <Tag style={{ borderRadius: 20, fontSize: 11, background: '#8a165222', color: '#8a1652', border: '1px solid #8a165244', margin: 0 }}>{activeIssueItem.category}</Tag>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Available: <strong style={{ color: activeIssueItem.current === 0 ? '#ff4d4f' : '#8a1652' }}>{activeIssueItem.current} units</strong></Text>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>Price: {activeIssueItem.price}</Text>
                  </Space>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <Progress percent={Math.min(100, Math.round((activeIssueItem.current / activeIssueItem.max) * 100))} size="small" strokeColor={activeIssueItem.status === 'OK' ? '#8a1652' : '#C94F8A'} showInfo={false} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>Max: {activeIssueItem.max} units</Text>
                </div>
              </div>
            </div>
          )}

          <div style={sectionCard}>
            <div style={sectionHeader()}>
              <InfoCircleOutlined style={{ color: '#8a1652' }} />
              <Text style={{ fontWeight: 700, color: textColor, fontSize: 14 }}>Transaction Details</Text>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <Form form={issueForm} layout="vertical">
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Quantity <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="qty" rules={[{ required: true, message: 'Enter quantity' }]} style={{ marginBottom: 12 }}>
                      <Input type="number" min={0} placeholder="0" suffix={<Space size={4}><Text style={{ color: '#aaa', fontSize: 12 }}>{activeIssueItem?.unit}</Text><CalculatorOutlined style={{ color: '#8a1652' }} /></Space>} style={{ borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Sell Price</Text>} name="sell_price" style={{ marginBottom: 12 }}>
                      <InputNumber prefix="₹" style={{ width: '100%', borderRadius: 8, height: 42, paddingTop: 4 }} placeholder="0.00" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label={<Text style={{ fontSize: 13 }}>Departure Date</Text>} name="date" style={{ marginBottom: 12 }}>
                      <DatePicker style={{ width: '100%', borderRadius: 8, height: 42 }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Comment</Text>} name="comment" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={2} placeholder="Optional note..." style={{ borderRadius: 8 }} />
                </Form.Item>
              </Form>
            </div>
          </div>

          {renderEntitySelector({
            label: 'Vendor',
            icon: <UserOutlined style={{ color: '#8a1652' }} />,
            search: vendorSearch,
            setSearch: setVendorSearch,
            filtered: filteredVendors,
            selected: selectedVendor,
            setSelected: setSelectedVendor,
            showAdd: showAddVendor,
            setShowAdd: setShowAddVendor,
            addForm: vendorForm,
            gradient: 'linear-gradient(135deg,#8a1652,#B11E6A)',
            onSave: handleSaveVendor,
            addFormFields: (
              <>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Name <span style={{ color: '#ff4d4f' }}>*</span></Text>} name="cust_name" rules={[{ required: true }]} style={{ marginBottom: 10 }}><Input placeholder="Vendor name" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Phone</Text>} name="cust_phone" style={{ marginBottom: 10 }} rules={[phoneValidator(false)]}><PhoneInput placeholder="Phone number" /></Form.Item></Col>
                </Row>
                <Row gutter={10}>
                  <Col span={14}><Form.Item label={<Text style={{ fontSize: 13 }}>Email</Text>} name="cust_email" style={{ marginBottom: 10 }} rules={emailRules(false)}><Input placeholder="email@example.com" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                  <Col span={10}><Form.Item label={<Text style={{ fontSize: 13 }}>Tax ID (GST/PAN)</Text>} name="cust_tax" style={{ marginBottom: 10 }}><Input placeholder="GST / PAN" style={{ borderRadius: 8, height: 40 }} /></Form.Item></Col>
                </Row>
                <Form.Item label={<Text style={{ fontSize: 13 }}>Address</Text>} name="cust_address" style={{ marginBottom: 10 }}><Input placeholder="City, State" style={{ borderRadius: 8, height: 40 }} /></Form.Item>
                <VendorBankFields form={vendorForm} namePrefix="bankDetails" labelSize={13} />
                <Form.Item label={<Text style={{ fontSize: 13 }}>Notes</Text>} name="cust_notes" style={{ marginBottom: 10 }}><Input.TextArea rows={2} placeholder="Any additional info..." style={{ borderRadius: 8 }} /></Form.Item>
              </>
            ),
          })}
        </div>
      </Drawer>
      */}

    </div>
  );
}
