import React, { useState, useMemo, useEffect } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, InputNumber, Upload, Typography, Space,
  Steps, Descriptions, Alert, Tag, Checkbox,
  Select, Table, Divider, Spin,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined, FileDoneOutlined, CheckSquareOutlined,
  LinkOutlined, BellOutlined, CarOutlined, WhatsAppOutlined, EditOutlined,
  LoadingOutlined, GiftOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetDispatchQuery,
  useConfirmDispatchMutation,
  useUploadDispatchLRMutation,
  useVerifyItemMutation,
  useSaveAsDraftMutation,
  useUploadBoxPhotosMutation,
  useGetInvoicesQuery,
  useGetCompanySettingsQuery,
  useGetKitsQuery,
} from '../../store/api/apiSlice';
import { buildDocComposition } from '../../utils/docComposition';
import { generatePrintHTML } from '../../components/templates/DocumentTemplate';

const { Title, Text } = Typography;
const { Option } = Select;

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

const stepIndex = (status) => {
  if (status === 'Dispatched') return 3;
  if (status === 'Ready to Dispatch') return 2;
  if (status === 'Payment Pending') return 1;
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchDetail() {
  const makeUpload = useCloudinaryUpload();
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const { data: dispatchData, isLoading: dispatchLoading, isFetching: dispatchFetching } = useGetDispatchQuery(id, { skip: !id });
  const [confirmDispatch] = useConfirmDispatchMutation();
  const [uploadLR] = useUploadDispatchLRMutation();
  const [verifyItem] = useVerifyItemMutation();
  const [saveAsDraft] = useSaveAsDraftMutation();
  const [uploadBoxPhotos] = useUploadBoxPhotosMutation();

  // Derive orderId from raw dispatch data (before `order` useMemo is computed)
  const dispatchRaw = dispatchData?.data;
  const dispatchOrderId = dispatchRaw?.orderId && typeof dispatchRaw.orderId === 'object'
    ? String(dispatchRaw.orderId._id)
    : dispatchRaw?.orderId ? String(dispatchRaw.orderId) : null;

  const { data: orderInvoicesData } = useGetInvoicesQuery(
    { orderId: dispatchOrderId, limit: 5 },
    { skip: !dispatchOrderId }
  );
  const { data: companySettingsData } = useGetCompanySettingsQuery();
  const { data: kitsRaw } = useGetKitsQuery();
  const kits = kitsRaw?.data || [];
  const invoiceSettings = companySettingsData?.data || {};

  // customRequest for box photo Upload components.
  // Uploads directly to POST /dispatch/:id/box-photos (Cloudinary + DB save in one step).
  const makeBoxUpload = (type) => async ({ file, onSuccess, onError }) => {
    const fd = new FormData();
    fd.append('photos', file);
    fd.append('type', type);
    try {
      const result = await uploadBoxPhotos({ id, formData: fd }).unwrap();
      const photos = type === 'close' ? result.data?.closeBoxPhotos : result.data?.openBoxPhotos;
      const url = (photos || []).slice(-1)[0] || '';
      file.url = url;
      file.thumbUrl = url;
      onSuccess(result.data, file);
      if (type === 'open') setOpenBoxCount(result.data?.openBoxPhotos?.length || 0);
      else setCloseBoxCount(result.data?.closeBoxPhotos?.length || 0);
      enqueueSnackbar(`${type === 'close' ? 'Closed' : 'Open'} box photo saved`, { variant: 'success' });
    } catch {
      onError(new Error('Upload failed'));
      enqueueSnackbar(`${type === 'close' ? 'Closed' : 'Open'} box photo upload failed`, { variant: 'error' });
    }
  };

  const handlePrintInvoice = () => {
    const rawInvoices = orderInvoicesData?.data || [];
    if (rawInvoices.length === 0) {
      enqueueSnackbar('No invoice found for this order. Please create one from the Billing page.', { variant: 'warning' });
      return;
    }
    const inv = rawInvoices[0];
    const halfGst = Math.round((inv.gstAmount || 0) / 2 * 100) / 100;

    // Extract linked order (populated by API) for kit composition data
    const linkedOrder = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const srcProds = linkedOrder?.products?.length
      ? linkedOrder.products
      : (linkedOrder?.items?.length ? linkedOrder.items : []);
    const srcKitOrders = linkedOrder?.kitOrders || [];

    // Pre-built personalized composition (outer packaging folded into Section A's total,
    // included kits/products broken out, remaining in B/C) so the printed invoice matches the
    // Billing invoice exactly. Null when there is no personalized packaging → flat fallback.
    const composition = buildDocComposition({
      products: linkedOrder?.products || [],
      kitOrders: srcKitOrders,
      kitPrice: linkedOrder?.kitPrice,
      kitOverallQty: linkedOrder?.kitOverallQty,
      packagingIncludes: linkedOrder?.packagingIncludes || [],
      packagingIncludesQty: linkedOrder?.packagingIncludesQty || {},
    }, kits);
    const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const invoiceData = {
      inv: inv.invoiceNumber,
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : '—',
      type: inv.invoiceType || 'GST',
      total: inv.total || 0,
      gst: composition ? composition.gst : (inv.gstAmount || 0),
      taxableAmount: composition ? composition.taxable : (inv.subtotal || 0),
      cgst: composition ? r2(composition.gst / 2) : halfGst,
      sgst: composition ? r2(composition.gst / 2) : halfGst,
      composition,
      // Use boolean+amount pattern matching DocumentTemplate expectations
      forwardingCharge: order?.forwardingCharge || false,
      forwardingChargeAmount: order?.forwardingChargeAmount || 0,
      customer: {
        name: inv.partyId?.name || order?.client || '—',
        mobile: inv.partyId?.phone || order?.phone || '',
        gstin: inv.partyId?.gstNumber || '',
        address: inv.partyId?.address || order?.detailedAddress || '',
        city: [order?.city, order?.state, order?.pincode].filter(Boolean).join(', ') || inv.partyId?.city || '',
        pan: inv.partyId?.pan || '',
        placeOfSupply: order?.state || inv.partyId?.state || 'Tamil Nadu',
      },
      items: (inv.items || []).filter(Boolean).map(i => ({
        name: i.itemName,
        unit: i.unit,
        rate: i.price || 0,
        qty: i.qty || 0,
        taxRate: i.taxRate || 0,
        taxAmt: i.taxAmt || 0,
        amount: i.lineTotal ?? ((i.price || 0) * (i.qty || 0)),
      })),
      // Kit composition — DocumentTemplate's computeDocSections picks these up and
      // renders the category-aware A/B/C sections matching the Billing invoice format.
      products: srcProds,
      kitOrders: srcKitOrders,
    };
    const html = generatePrintHTML('invoice', invoiceData, invoiceSettings);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const order = useMemo(() => {
    const d = dispatchData?.data;
    if (!d) return null;
    // getDispatch populates `orderId` as a nested object — read order context from there.
    // The order carries the real customer/address fields; the lead is a fallback for any
    // that weren't denormalized onto the order at conversion time.
    const o = (d.orderId && typeof d.orderId === 'object') ? d.orderId : {};
    const lead = (o.leadId && typeof o.leadId === 'object') ? o.leadId : {};
    // Resolve dispatch line items, then derive a product summary + total qty from them
    // (the order's top-level product/qty are often empty for kit/multi-item orders).
    const lineItems = (d.items && d.items.length ? d.items : (o.items || []));
    const itemNames = lineItems.map((it) => it.product || it.itemName || it.name).filter(Boolean);
    const derivedProduct = o.product || lead.products?.map((p) => p.productName || p.itemName || p.name).filter(Boolean).join(', ') || itemNames.join(', ') || '';
    const derivedQty = o.qty || lineItems.reduce((sum, it) => sum + (Number(it.qty || it.qtyOrdered) || 0), 0) || 0;
    // Sample orders bypass payment — no payment is expected for samples.
    const isSample = o.orderCategory === 'SAMPLE' || lead.leadType === 'SAMPLE';
    // Credit orders are dispatched before payment — payment is due after delivery.
    const isCredit = o.paymentTerms === 'CREDIT_10_30';
    // orderPaymentStatus resolved live from invoices (mirrors Dispatch list logic).
    const livePayStatus = d.orderPaymentStatus || 'Pending';
    // Payment is "Confirmed" for dispatch purposes once the order balance is cleared, or credit terms apply.
    const basePaymentConfirmed = isSample || isCredit || livePayStatus === 'Paid' || (o.balance != null && o.balance <= 0) || o.status === 'Completed';
    return {
      key: d._id, id: o.orderCode || d.orderCode || d._id,
      orderObjectId: o._id || d.orderId,
      client: o.clientName || lead.hotelName || '—', contactPerson: o.contactPerson || lead.contactPerson || '—',
      phone: o.clientPhone || lead.phone || '', email: o.email || o.clientEmail || lead.email || '',
      product: derivedProduct, qty: derivedQty,
      boxes: d.boxes || 0, weight: d.weight || '',
      basePaymentConfirmed,
      isCredit,
      creditDueDate: o.paymentReminderDate || o.creditDueDate || null,
      payment: isCredit ? 'Credit' : (isSample ? 'N/A' : (livePayStatus === 'Paid' ? 'Confirmed' : livePayStatus === 'Partial' ? 'Partial' : (basePaymentConfirmed ? 'Confirmed' : 'Pending'))),
      destination: o.destination || lead.destination || '',
      detailedAddress: o.detailedAddress || lead.detailedAddress || lead.address || '',
      city: o.city || lead.city || '', state: o.state || lead.state || '', pincode: o.pincode || lead.pincode || '',
      transport: d.transportName || '', status: d.status || '',
      salesPerson: o.assignedTo?.fullName || o.salesPerson || lead.salesPerson || '',
      isSample,
      forwardingCharge: o.forwardingCharge || false,
      forwardingChargeAmount: o.forwardingChargeAmount || 0,
      total: o.total || 0,
      // dispatch line items (these carry _id for per-product verification)
      items: (d.items && d.items.length ? d.items : (o.items || [])),
      kitOrders: o.kitOrders || [],
      // Stored verification photos
      openBoxPhotos: d.openBoxPhotos || [],
      closeBoxPhotos: d.closeBoxPhotos || [],
      // Stored LR / tracking details
      storedTransportName: d.transportName || '',
      storedWeight: d.weight || '',
      storedBoxes: d.boxes || 0,
      storedDispatchType: d.dispatchType || null,
      storedInvoiceNumber: d.invoiceNumber || '',
      storedInvoiceDate: d.invoiceDate || null,
      storedLrNumber: d.lrNumber || '',
      storedTrackingUrl: d.trackingUrl || '',
      storedLrDate: d.lrDate || '',
      storedFromCity: d.fromCity || '',
      storedToCity: d.toCity || '',
      storedFreight: d.freight || '',
      storedPackages: d.packages || '',
      storedEstimatedDelivery: d.estimatedDelivery || '',
      storedLrFileUrl: d.lrFileUrl || '',
    };
  }, [dispatchData]);

  const [form] = Form.useForm();
  const [lrForm] = Form.useForm();
  const [trackingForm] = Form.useForm();

  // Live-watch form fields so the Order Details table reflects values as the user types.
  const liveTransport = Form.useWatch('transport', form);
  const liveWeight = Form.useWatch('weight', form);
  const liveBoxes = Form.useWatch('boxes', form);
  const liveTrackingUrl = Form.useWatch('trackingUrl', trackingForm);

  // Forwarding charge — editable at dispatch time; if raised above original, payment is pending.
  const [localFwdAmount, setLocalFwdAmount] = useState(null); // null = not yet initialised
  // Track if we've already initialised the form from stored data (avoids re-setting on every re-render).
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialise once order data arrives
  useEffect(() => {
    if (order && localFwdAmount === null) {
      setLocalFwdAmount(order.forwardingChargeAmount || 0);
    }
  }, [order, localFwdAmount]);

  // Pre-populate form + state from stored dispatch data on first load.
  useEffect(() => {
    if (!order || formInitialized) return;
    setFormInitialized(true);

    // Main dispatch verification form
    form.setFieldsValue({
      transport: order.storedTransportName || (order.transport !== '—' ? order.transport : ''),
      weight: order.storedWeight || (order.weight !== '—' ? order.weight : ''),
      boxes: order.storedBoxes || order.boxes || 0,
      dispatchType: order.storedDispatchType || undefined,
      invoiceNumber: order.storedInvoiceNumber || '',
    });

    // Sync dispatchType state so the product verification table shows
    if (order.storedDispatchType) {
      setDispatchType(order.storedDispatchType);
    }

    // Dispatched status
    if (order.status === 'Confirmed' || order.status === 'Dispatched') {
      setDispatched(true);
    }

    // Box photo counts from stored arrays
    if (order.openBoxPhotos.length > 0) setOpenBoxCount(order.openBoxPhotos.length);
    if (order.closeBoxPhotos.length > 0) setCloseBoxCount(order.closeBoxPhotos.length);

    // Pre-populate LR/tracking forms from stored data
    if (order.storedLrNumber || order.storedTrackingUrl || order.storedLrDate) {
      lrForm.setFieldsValue({
        lrNumber: order.storedLrNumber,
        lrDate: order.storedLrDate,
        transportName: order.storedTransportName,
        fromCity: order.storedFromCity,
        toCity: order.storedToCity,
        weight: order.storedWeight,
        freight: order.storedFreight,
        packages: order.storedPackages,
        estimatedDelivery: order.storedEstimatedDelivery,
      });
      trackingForm.setFieldsValue({
        trackingUrl: order.storedTrackingUrl,
        trackingLR: order.storedLrNumber,
      });
      // Show AI parsed summary section if we have stored LR data
      if (order.storedLrNumber || order.storedLrDate) {
        setAiParsed({
          lrNumber: order.storedLrNumber,
          lrDate: order.storedLrDate,
          transportName: order.storedTransportName,
          fromCity: order.storedFromCity,
          toCity: order.storedToCity,
          weight: order.storedWeight,
          freight: order.storedFreight,
          packages: order.storedPackages,
          estimatedDelivery: order.storedEstimatedDelivery,
        });
      }
    }

    // Finished dispatch state
    if (order.status === 'Dispatched' && order.storedLrNumber) {
      setFinishedDispatch(true);
    }

    // Show stored LR file in the upload component
    if (order.storedLrFileUrl) {
      setLrFileList([{
        uid: 'lr-stored',
        name: 'Lorry Receipt',
        status: 'done',
        url: order.storedLrFileUrl,
      }]);
    }
  }, [order, formInitialized, form, lrForm, trackingForm]);

  // Effective forwarding amount (may be overridden by dispatcher)
  const effectiveFwdAmount = localFwdAmount ?? (order?.forwardingChargeAmount || 0);
  // Payment is pending if base payment isn't confirmed OR if dispatcher raised the forwarding charge.
  // Credit orders bypass both checks — the full amount (including any forwarding charge) is on credit.
  const fwdAmountRaised = order && !order.isCredit && effectiveFwdAmount > (order.forwardingChargeAmount || 0);
  const paymentConfirmed = order?.isCredit || (!fwdAmountRaised && (order?.basePaymentConfirmed || false));

  // Dispatch verification state
  const [dispatchType, setDispatchType] = useState(null);
  const [verifiedProducts, setVerifiedProducts] = useState(new Set());
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyAuto, setNotifyAuto] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  // Box photo upload tracking (uploaded immediately via handleBoxPhotoUpload)
  const [openBoxCount, setOpenBoxCount] = useState(0);
  const [closeBoxCount, setCloseBoxCount] = useState(0);

  // Post-dispatch state (lorry receipt section)
  const [lrFileList, setLrFileList] = useState([]);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [lrEditMode, setLrEditMode] = useState(false);
  const [finishedDispatch, setFinishedDispatch] = useState(false);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#161622' : '#fafbff';

  const toggleVerify = async (productKey, itemId) => {
    const willVerify = !verifiedProducts.has(productKey);
    setVerifiedProducts(prev => {
      const next = new Set(prev);
      next.has(productKey) ? next.delete(productKey) : next.add(productKey);
      return next;
    });
    // Persist verification to the backend (only when marking verified and we have a real item id)
    if (willVerify && itemId) {
      try {
        await verifyItem({ id, itemId }).unwrap();
      } catch {
        enqueueSnackbar('Failed to persist verification', { variant: 'error' });
      }
    }
  };

  const handlePrintDispatchDetails = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Details — ${order.id}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; font-size: 13px; color: #111; }
  h2 { color: #B11E6A; margin-bottom: 4px; }
  .badge { background: #B11E6A; color: #fff; display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
</style></head><body>
<div class="badge">HEAL N GLOW — DISPATCH DETAILS</div>
<h2>${order.id} — ${order.client}</h2>
<table>
  <tr><th>Client</th><td>${order.client}</td><th>Contact</th><td>${order.contactPerson}</td></tr>
  <tr><th>Phone</th><td>${order.phone}</td><th>Email</th><td>${order.email}</td></tr>
  <tr><th>Destination</th><td>${order.destination || '—'}</td><th>Address</th><td>${order.detailedAddress}, ${order.city}, ${order.state} — ${order.pincode}</td></tr>
  <tr><th>Product</th><td>${order.product || '—'}</td><th>Weight</th><td>${order.weight || '—'}</td></tr>
  <tr><th>Transport</th><td>${order.transport || '—'}</td><th>Sales Person</th><td>${order.salesPerson || '—'}</td></tr>
  <tr><th>Payment</th><td>${order.payment}</td><th>Status</th><td>${order.status}</td></tr>
</table>
</body></html>`);
    win.document.close();
    win.print();
  };

  const handleConfirmDispatch = async () => {
    enqueueSnackbar('Confirming dispatch...', { variant: 'info' });
    try {
      const formData = new FormData();
      const vals = form.getFieldsValue();
      formData.append('transport', vals.transport || order.storedTransportName || order.transport || '');
      formData.append('boxes', vals.boxes ?? order.storedBoxes ?? order.boxes ?? 0);
      formData.append('weight', vals.weight ?? order.storedWeight ?? order.weight ?? '');
      formData.append('dispatchType', vals.dispatchType || dispatchType || 'Full Dispatch');
      formData.append('invoiceNumber', vals.invoiceNumber || '');
      if (vals.invoiceDate) formData.append('invoiceDate', vals.invoiceDate.format ? vals.invoiceDate.format('YYYY-MM-DD') : vals.invoiceDate);
      // Backend reads autoNotify / sendWhatsapp (FormData sends them as strings).
      formData.append('autoNotify', notifyAuto);
      formData.append('sendWhatsapp', notifyWhatsApp);
      // Attach the invoice file if one was selected (confirm route accepts upload.single('invoice')).
      const invoiceFile = vals.invoiceFile?.[0]?.originFileObj || vals.invoiceFile?.file?.originFileObj;
      if (invoiceFile) formData.append('invoice', invoiceFile);
      await confirmDispatch({ id, formData }).unwrap();
      setDispatched(true);
      const notifyParts = [notifyAuto && 'Sales & Customer', notifyWhatsApp && 'WhatsApp'].filter(Boolean).join(', ');
      enqueueSnackbar(`Dispatch confirmed! Notifications sent via: ${notifyParts || 'none'}.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to confirm dispatch.', { variant: 'error' });
    }
  };

  const handleSaveDraft = async () => {
    try {
      const vals = form.getFieldsValue();
      const lrVals = lrForm.getFieldsValue();
      const trackVals = trackingForm.getFieldsValue();
      const lrFileUrl = lrFileList?.[0]?.url || lrFileList?.[0]?.response?.url || undefined;
      await saveAsDraft({
        id,
        dispatchType: vals.dispatchType || dispatchType || undefined,
        invoiceNumber: vals.invoiceNumber || undefined,
        invoiceDate: vals.invoiceDate?.format ? vals.invoiceDate.format('YYYY-MM-DD') : vals.invoiceDate,
        transportName: lrVals.transportName || vals.transport || undefined,
        weight: lrVals.weight || vals.weight || undefined,
        boxes: vals.boxes ?? undefined,
        autoNotify: notifyAuto,
        sendWhatsapp: notifyWhatsApp,
        // Lorry Receipt + Tracking section — persist so it survives a reload even
        // before "Finished Dispatch" is clicked.
        lrNumber: lrVals.lrNumber || trackVals.trackingLR || undefined,
        trackingUrl: trackVals.trackingUrl || undefined,
        lrFileUrl,
        lrDate: lrVals.lrDate || undefined,
        fromCity: lrVals.fromCity || undefined,
        toCity: lrVals.toCity || undefined,
        freight: lrVals.freight || undefined,
        packages: lrVals.packages || undefined,
        estimatedDelivery: lrVals.estimatedDelivery || undefined,
      }).unwrap();
      enqueueSnackbar('Saved as draft', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save draft', { variant: 'error' });
    }
  };

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      const parsed = { lrNumber: '', lrDate: '', transportName: '', fromCity: 'Coimbatore', toCity: '', weight: '', freight: '', packages: '', estimatedDelivery: '' };
      setAiParsed(parsed);
      lrForm.setFieldsValue(parsed);
      setAiParsing(false);
      setLrEditMode(true);
      enqueueSnackbar('AI extracted lorry receipt details. Review and confirm below.', { variant: 'success' });
    }, 1800);
  };

  const handleFinishedDispatch = async () => {
    enqueueSnackbar('Sending notifications...', { variant: 'info' });
    try {
      const lrVals = lrForm.getFieldsValue();
      const trackVals = trackingForm.getFieldsValue();
      // The LR file is already on Cloudinary (uploaded via customRequest / makeUpload).
      // Pass the stored URL directly — no need to re-upload.
      const lrFileUrl = lrFileList?.[0]?.url || lrFileList?.[0]?.response?.url || '';
      const payload = {
        id,
        lrNumber: lrVals.lrNumber || trackVals.trackingLR || '',
        trackingUrl: trackVals.trackingUrl || '',
        lrFileUrl,
        lrDate: lrVals.lrDate || '',
        transportName: lrVals.transportName || '',
        packages: lrVals.packages || '',
        fromCity: lrVals.fromCity || '',
        toCity: lrVals.toCity || '',
        weight: lrVals.weight || '',
        freight: lrVals.freight || '',
        estimatedDelivery: lrVals.estimatedDelivery || '',
      };
      await uploadLR(payload).unwrap();
      setFinishedDispatch(true);
      enqueueSnackbar(`Dispatch Finished! Notifications sent to Sales (${order.salesPerson}) and Customer (${order.client}) via WhatsApp.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to finish dispatch.', { variant: 'error' });
    }
  };

  if (dispatchLoading || dispatchFetching) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#B11E6A' }} spin />} tip="Loading dispatch details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <Alert type="error" message={`Dispatch record "${id}" not found.`} showIcon style={{ borderRadius: 8 }} />
        <Button style={{ marginTop: 12 }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')}>Back to Dispatch</Button>
      </div>
    );
  }

  // Build kit-grouped product rows for the verification table.
  // `products` = verifiable units (personalized kit headers count as ONE unit; separate items are individual).
  // `groupedProducts` = all display rows including kit header + child item rows.
  const buildGroupedProducts = () => {
    const rawItems = (order?.items || []).filter(it => !it.isKit);
    const kitOrdersList = order?.kitOrders || [];
    const hasKitMeta = rawItems.some(it => it.kitId || it.kitType);
    const orderBoxes = order?.boxes || 0;

    const toRow = (item, i, type = 'product', extra = {}) => ({
      key: item._id || `${type}_${i}`,
      itemId: item._id,
      name: item.product || item.name || item.itemName,
      boxes: item.boxes || 0,
      verified: item.verified,
      type,
      ...extra,
    });

    if (!kitOrdersList.length && !hasKitMeta) {
      const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: orderBoxes }));
      return { products: flat, groupedProducts: flat };
    }

    const rows = [];
    const verifiable = [];

    if (kitOrdersList.length > 0) {
      kitOrdersList.forEach((ko, ki) => {
        const kitId = String(ko.kitId || '');
        const kitName = ko.kitName || ko.kitType || `Kit ${ki + 1}`;
        const overallQty = Number(ko.overallQty) || 0;
        const isPersonalized = (ko.category || 'separate_kit') === 'personalized';
        const headerKey = `_kh_${kitId || ki}`;

        const headerRow = {
          key: headerKey,
          type: 'kit_header',
          kitName,
          qty: overallQty,
          // Personalized kits use the order-level box count; others use 0 as placeholder
          boxes: isPersonalized ? orderBoxes : 0,
          category: ko.category || 'separate_kit',
          isPersonalized,
          verified: false,
        };
        rows.push(headerRow);
        // Personalized kit = ONE verifiable unit at kit level (not per-item)
        if (isPersonalized) verifiable.push(headerRow);

        const kitItems = hasKitMeta
          ? rawItems.filter(it => {
              if (kitId && it.kitId) return String(it.kitId) === kitId;
              const refLow = (it.kitType || it.kitName || '').toLowerCase();
              const koLow = (ko.kitName || ko.kitType || '').toLowerCase();
              return refLow && koLow && refLow === koLow;
            })
          : (kitOrdersList.length === 1 ? rawItems : []);

        kitItems.forEach((item, ii) => {
          const totalQty = Number(item.qty) || 0;
          const perKitQty = overallQty > 0 ? Math.round(totalQty / overallQty) : null;
          // Personalized items are display-only — verification handled at kit header level
          const itemType = isPersonalized ? 'personalized_item' : 'kit_item';
          const row = toRow(item, ii, itemType, { perKitQty, boxes: item.boxes || 0 });
          rows.push(row);
          if (!isPersonalized) verifiable.push(row);
        });
      });

      const usedKitIds = new Set(kitOrdersList.map(ko => String(ko.kitId)).filter(Boolean));
      const sepItems = rawItems.filter(it => {
        if (it.kitId && usedKitIds.has(String(it.kitId))) return false;
        if (hasKitMeta && (it.kitType || it.kitName)) return false;
        if (!hasKitMeta && kitOrdersList.length === 1) return false;
        return true;
      });
      if (sepItems.length > 0) {
        rows.push({ key: '_sep_hdr', type: 'kit_header', kitName: 'Separate Products', qty: null, boxes: 0, category: 'separate_product' });
        sepItems.forEach((item, i) => {
          const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes });
          rows.push(row);
          verifiable.push(row);
        });
      }
    } else {
      const kitGroups = {};
      const kitGroupOrder = [];
      rawItems.forEach(it => {
        const gKey = String(it.kitId || it.kitType || '');
        if (gKey) {
          if (!kitGroups[gKey]) { kitGroups[gKey] = { items: [], name: it.kitType || it.kitName || gKey }; kitGroupOrder.push(gKey); }
          kitGroups[gKey].items.push(it);
        }
      });
      kitGroupOrder.forEach(gKey => {
        const grp = kitGroups[gKey];
        rows.push({ key: `_kh_${gKey}`, type: 'kit_header', kitName: grp.name, qty: null, boxes: 0, category: 'separate_kit' });
        grp.items.forEach((item, ii) => { const row = toRow(item, ii, 'kit_item'); rows.push(row); verifiable.push(row); });
      });
      rawItems.filter(it => !it.kitId && !it.kitType).forEach((item, i) => {
        const row = toRow(item, i, 'product', { boxes: item.boxes || orderBoxes });
        rows.push(row);
        verifiable.push(row);
      });
    }

    if (verifiable.length === 0) {
      const flat = rawItems.map((item, i) => toRow(item, i, 'product', { boxes: orderBoxes }));
      return { products: flat, groupedProducts: flat };
    }

    return { products: verifiable, groupedProducts: rows };
  };
  const { products, groupedProducts } = buildGroupedProducts();

  // Doc: every product must be verified before dispatch can be confirmed.
  const allProductsVerified = products.length > 0 && products.every((p) => verifiedProducts.has(p.key) || p.verified);
  const lrUploaded = lrFileList.length > 0;

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')} style={{ flexShrink: 0 }}>Back</Button>
        <PageBreadcrumb
          title={`Dispatch: ${order.id}`}
          items={[{ label: 'Dispatch', link: '/dispatch' }, { label: order.id }]}
        />
        {dispatched && (
          <Tag color="success" style={{ borderRadius: 20, fontSize: 12, padding: '2px 12px' }}>
            <CheckCircleOutlined /> Dispatched
          </Tag>
        )}
      </div>

      {order.isSample && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="info" showIcon
            message="Sample Order — Payment Bypassed"
            description="This is a sample order. No payment is required before dispatch."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}
      {order.isCredit && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="info" showIcon
            message="Credit Order — Dispatch Allowed"
            description={order.creditDueDate
              ? `Payment due by ${new Date(order.creditDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Ensure payment is collected before the due date.`
              : 'Credit terms applied. Set a credit due date on the order to track payment.'}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}
      {!order.isSample && !order.isCredit && !paymentConfirmed && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="error" showIcon
            message="Dispatch Blocked — Payment Not Confirmed"
            description={fwdAmountRaised
              ? `Forwarding charge raised to ₹${effectiveFwdAmount.toLocaleString()} — collect the additional ₹${(effectiveFwdAmount - (order.forwardingChargeAmount || 0)).toLocaleString()} before dispatching.`
              : 'This order cannot be dispatched until full payment is received.'}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}

      <Row gutter={[16, 16]}>
        {/* ── Left: Order Details ─────────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Order Details</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Descriptions bordered size="small" column={1} labelStyle={{ width: 130 }}>
                <Descriptions.Item label="Order ID">
                  <Text strong style={{ color: '#B11E6A' }}>{order.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Client"><Text strong>{order.client}</Text></Descriptions.Item>
                <Descriptions.Item label="Contact Person">{order.contactPerson}</Descriptions.Item>
                <Descriptions.Item label="Phone">
                  <a href={`tel:${order.phone}`} style={{ color: '#B11E6A' }}>{order.phone}</a>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{order.email}</Descriptions.Item>
                <Descriptions.Item label="Destination">
                  <Space size={4}><EnvironmentOutlined style={{ color: '#B11E6A' }} /><Text strong>{order.destination || '—'}</Text></Space>
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <Space align="start">
                    <EnvironmentOutlined style={{ color: '#B11E6A', marginTop: 2 }} />
                    <span>{order.detailedAddress},<br />{order.city}, {order.state} — {order.pincode}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Product">{order.product || '—'}</Descriptions.Item>
                <Descriptions.Item label="Weight">
                  {liveWeight || order.weight
                    ? <Text strong>{liveWeight || order.weight}</Text>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Boxes">
                  {(liveBoxes != null && liveBoxes !== '') || order.boxes
                    ? <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong>{liveBoxes ?? order.boxes ?? 0}</Text></Space>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Transport">
                  {liveTransport || order.transport
                    ? <Text strong>{liveTransport || order.transport}</Text>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Sales Person">{order.salesPerson}</Descriptions.Item>
                <Descriptions.Item label="Payment">
                  {order.isSample
                    ? <Tag color="default">N/A (Sample)</Tag>
                    : order.isCredit
                    ? <Tag color="blue">Credit{order.creditDueDate ? ` — Due ${new Date(order.creditDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}</Tag>
                    : <Tag color={paymentConfirmed ? 'success' : 'error'}>{paymentConfirmed ? 'Confirmed' : 'Pending'}</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag style={{ borderRadius: 20, background: `${statusColor[order.status]}22`, color: statusColor[order.status], border: `1px solid ${statusColor[order.status]}44` }}>
                    {order.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 20, padding: '12px 0', borderTop: `1px solid ${borderColor}` }}>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Dispatch Progress</Text>
                <Steps size="small" current={dispatched ? 3 : stepIndex(order.status)}
                  items={[
                    { title: 'Packing' },
                    { title: order.isSample ? 'Payment (N/A)' : 'Payment' },
                    { title: 'Verified' },
                    { title: 'Dispatched' },
                  ]}
                />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* ── Right: Dispatch Verification ────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Dispatch Verification</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Form form={form} layout="vertical" size="small">
                {/* Row 1: Transport, Weight, Boxes, Dispatch Type */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Transport Name" name="transport">
                      <Input placeholder="e.g. Fast Cargo" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="Weight (Verify)" name="weight">
                      <Input placeholder="kg" suffix="kg" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="Boxes" name="boxes">
                      <InputNumber min={0} placeholder="0" style={{ width: '100%' }} prefix={<InboxOutlined style={{ color: '#B11E6A' }} />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Dispatch Type" name="dispatchType">
                      <Select
                        placeholder="Select dispatch type"
                        onChange={(v) => { setDispatchType(v); setVerifiedProducts(new Set()); }}
                      >
                        <Option value="Full Dispatch">Full Dispatch</Option>
                        <Option value="Partial Dispatch">Partial Dispatch</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Forwarding Charge — shown if applicable on this order */}
                {order.forwardingCharge && (
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={
                          <span>
                            Forwarding Charge (₹)
                            {fwdAmountRaised && (
                              <Tag color="error" style={{ marginLeft: 8, fontSize: 10 }}>Payment Pending</Tag>
                            )}
                          </span>
                        }
                        style={{ marginBottom: 16 }}
                      >
                        <InputNumber
                          min={0}
                          value={effectiveFwdAmount}
                          onChange={(v) => setLocalFwdAmount(v ?? 0)}
                          style={{ width: '100%' }}
                          prefix="₹"
                          addonAfter={
                            order.forwardingChargeAmount > 0 && (
                              <span style={{ fontSize: 11, color: '#999' }}>
                                Original: ₹{order.forwardingChargeAmount.toLocaleString()}
                              </span>
                            )
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* Product Details table — shows when dispatch type selected */}
                {dispatchType && (
                  <div style={{ marginBottom: 16, border: `1px solid #B11E6A33`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}>
                        <InboxOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>Product Details — {order.id}</Text>
                        <Tag color={dispatchType === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12, fontSize: 11 }}>
                          {dispatchType}
                        </Tag>
                      </Space>
                      <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                        {verifiedProducts.size} / {products.length} verified
                      </Text>
                    </div>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={groupedProducts}
                      style={{ borderRadius: 0 }}
                      columns={[
                        {
                          title: 'Product / Kit',
                          dataIndex: 'name',
                          // kit_header and personalized_item both span all 4 columns
                          onCell: (row) => {
                            if (row.type === 'kit_header' || row.type === 'personalized_item') return { colSpan: 4 };
                            return {};
                          },
                          render: (v, row) => {
                            if (row.type === 'kit_header') {
                              const catMeta = {
                                personalized:     { icon: <GiftOutlined />, bg: '#ede9fe', color: '#5b21b6', label: 'Personalized Kit' },
                                separate_kit:     { icon: <GiftOutlined />, bg: '#e0f2fe', color: '#0369a1', label: 'Separate Kit' },
                                separate_product: { icon: <AppstoreOutlined />, bg: '#fce7f3', color: '#9d174d', label: 'Products' },
                              };
                              const cm = catMeta[row.category] || catMeta.separate_kit;
                              return (
                                <div style={{ background: cm.bg, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, margin: '-1px -1px' }}>
                                  <span style={{ color: cm.color }}>{cm.icon}</span>
                                  <Text strong style={{ color: cm.color, fontSize: 12 }}>{row.kitName}</Text>
                                  {row.qty != null && (
                                    <Tag style={{ borderRadius: 12, background: `${cm.color}15`, color: cm.color, border: `1px solid ${cm.color}44`, fontSize: 11 }}>
                                      {row.qty} kit{row.qty !== 1 ? 's' : ''}
                                    </Tag>
                                  )}
                                  <Tag style={{ borderRadius: 12, fontSize: 10, background: 'transparent', color: cm.color, border: `1px solid ${cm.color}33` }}>
                                    {cm.label}
                                  </Tag>
                                  {/* Personalized kit: show boxes + single verify inline in the header */}
                                  {row.isPersonalized && (
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Space size={4}>
                                        <InboxOutlined style={{ color: cm.color }} />
                                        <Text style={{ color: cm.color, fontSize: 12 }}>{row.boxes} box{row.boxes !== 1 ? 'es' : ''}</Text>
                                      </Space>
                                      {verifiedProducts.has(row.key) ? (
                                        <Button size="small" icon={<CheckSquareOutlined />}
                                          style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                          onClick={() => toggleVerify(row.key, null)}
                                        >Unverify</Button>
                                      ) : (
                                        <Button size="small" icon={<CheckSquareOutlined />}
                                          style={{ background: '#B11E6A', border: 'none', color: '#fff' }}
                                          onClick={() => toggleVerify(row.key, null)}
                                        >Verify Kit</Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            // personalized_item or kit_item or product
                            return (
                              <Space size={4}>
                                {(row.type === 'kit_item' || row.type === 'personalized_item') && (
                                  <span style={{ color: '#ccc', fontSize: 13, marginLeft: 8 }}>└</span>
                                )}
                                <Text style={{ fontSize: 12, color: row.type === 'personalized_item' ? '#888' : 'inherit' }}>{v}</Text>
                                {row.perKitQty != null && (
                                  <Text style={{ fontSize: 10, color: '#bbb' }}>({row.perKitQty}/kit)</Text>
                                )}
                              </Space>
                            );
                          },
                        },
                        {
                          title: 'Boxes', dataIndex: 'boxes',
                          onCell: (row) => {
                            if (row.type === 'kit_header') return { colSpan: 0 };
                            if (row.type === 'personalized_item') return { colSpan: 0 };
                            return {};
                          },
                          render: (v, row) => row.type === 'kit_header' || row.type === 'personalized_item' ? null : (
                            <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space>
                          ),
                        },
                        {
                          title: 'Status', key: 'status',
                          onCell: (row) => {
                            if (row.type === 'kit_header') return { colSpan: 0 };
                            if (row.type === 'personalized_item') return { colSpan: 0 };
                            return {};
                          },
                          render: (_, row) => (row.type === 'kit_header' || row.type === 'personalized_item') ? null : (
                            verifiedProducts.has(row.key)
                              ? <Tag color="success" style={{ borderRadius: 20 }}>Verified</Tag>
                              : <Tag color="default" style={{ borderRadius: 20 }}>Pending</Tag>
                          ),
                        },
                        {
                          title: 'Action', key: 'action',
                          onCell: (row) => {
                            if (row.type === 'kit_header') return { colSpan: 0 };
                            if (row.type === 'personalized_item') return { colSpan: 0 };
                            return {};
                          },
                          render: (_, row) => (row.type === 'kit_header' || row.type === 'personalized_item') ? null : (
                            <Button size="small" icon={<CheckSquareOutlined />}
                              style={verifiedProducts.has(row.key) ? { borderColor: '#52c41a', color: '#52c41a' } : { background: '#B11E6A', border: 'none', color: '#fff' }}
                              onClick={() => toggleVerify(row.key, row.itemId)}
                            >
                              {verifiedProducts.has(row.key) ? 'Unverify' : 'Verify'}
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Box Photos (multiple, uploaded immediately — both are mandatory) */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Open Box Photos</span>}
                      validateStatus={openBoxCount === 0 ? 'error' : 'success'}
                      help={openBoxCount === 0 ? 'At least one open-box photo is required' : `${openBoxCount} photo(s) uploaded`}
                    >
                      <Upload
                        listType="picture"
                        multiple
                        customRequest={makeBoxUpload('open')}
                        accept="image/*"
                        defaultFileList={(order?.openBoxPhotos || []).map((url, i) => ({
                          uid: `open-stored-${i}`,
                          name: `Open photo ${i + 1}`,
                          status: 'done',
                          url,
                        }))}
                      >
                        <Button icon={<CameraOutlined />} block>Open Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Closed Box Photos</span>}
                      validateStatus={closeBoxCount === 0 ? 'error' : 'success'}
                      help={closeBoxCount === 0 ? 'At least one closed-box photo is required' : `${closeBoxCount} photo(s) uploaded`}
                    >
                      <Upload
                        listType="picture"
                        multiple
                        customRequest={makeBoxUpload('close')}
                        accept="image/*"
                        defaultFileList={(order?.closeBoxPhotos || []).map((url, i) => ({
                          uid: `close-stored-${i}`,
                          name: `Closed photo ${i + 1}`,
                          status: 'done',
                          url,
                        }))}
                      >
                        <Button icon={<CameraOutlined />} block>Close Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Print Invoice */}
                <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FileDoneOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Invoice</Text>
                    {orderInvoicesData?.data?.length > 0 && (
                      <Tag color="success" style={{ marginLeft: 4, borderRadius: 12, fontSize: 11 }}>
                        {orderInvoicesData.data[0].invoiceNumber}
                      </Tag>
                    )}
                  </div>
                  <Button
                    icon={<PrinterOutlined />}
                    block
                    onClick={handlePrintInvoice}
                    style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontWeight: 600 }}
                  >
                    Print Invoice
                  </Button>
                  {!orderInvoicesData?.data?.length && (
                    <Text style={{ fontSize: 11, color: '#aaa', display: 'block', marginTop: 6 }}>
                      No invoice linked yet — create one from the Billing page first.
                    </Text>
                  )}
                </div>

                {/* Notify Options */}
                <div style={{ background: isDark ? '#161622' : '#fffaf8', border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <Text strong style={{ color: textColor, fontSize: 13, display: 'block', marginBottom: 10 }}>
                    <BellOutlined style={{ color: '#B11E6A', marginRight: 6 }} />Notify on Dispatch
                  </Text>
                  <Space direction="vertical" size={8}>
                    <Checkbox checked={notifyAuto} onChange={(e) => setNotifyAuto(e.target.checked)} style={{ color: textColor }}>
                      Auto-notify Sales person &amp; Customer
                    </Checkbox>
                    <Checkbox checked={notifyWhatsApp} onChange={(e) => setNotifyWhatsApp(e.target.checked)} style={{ color: textColor }}>
                      <WhatsAppOutlined style={{ color: '#25D366', marginRight: 4 }} />Send WhatsApp notification
                    </Checkbox>
                  </Space>
                </div>
              </Form>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Button icon={<PrinterOutlined />} onClick={handlePrintDispatchDetails}>
                  Print Dispatch Details
                </Button>
                <Button icon={<SaveOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }} onClick={handleSaveDraft}>
                  Save as Draft
                </Button>
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  disabled={!paymentConfirmed || dispatched || !allProductsVerified || openBoxCount === 0 || closeBoxCount === 0}
                  style={{ background: (paymentConfirmed && !dispatched && allProductsVerified && openBoxCount > 0 && closeBoxCount > 0) ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none' }}
                  onClick={handleConfirmDispatch}
                >
                  {dispatched ? 'Dispatched ✓' : 'Confirm Dispatch'}
                </Button>
              </div>

              {/* ════════════════════════════════════════════════════════════
                  POST-DISPATCH SECTION — Lorry Receipt + Tracking
                  Shown always; prominently after Confirm Dispatch
              ═══════════════════════════════════════════════════════════════ */}
              <Divider style={{ margin: '20px 0 16px' }}>
                <Text style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>
                  After Dispatch — Lorry Receipt &amp; Tracking
                </Text>
              </Divider>

              {/* Lorry Receipt Upload */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A33`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <UploadOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Lorry Receipt (Manual Upload)</Text>
                  {lrUploaded && <Tag color="success" style={{ borderRadius: 12 }}>Uploaded</Tag>}
                </div>

                <Upload
                  listType="picture"
                  fileList={lrFileList}
                  maxCount={3}
                  customRequest={makeUpload('dispatch/lr')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={({ fileList }) => {
                    setLrFileList(fileList);
                    if (fileList.length > 0 && !aiParsed) {
                      enqueueSnackbar('Lorry receipt uploaded. Click "AI Parse Receipt" to extract details automatically.', { variant: 'info' });
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />} block style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                    Upload Lorry Receipt (PDF / Image)
                  </Button>
                </Upload>

                {/* AI Parse — shown once receipt is uploaded */}
                {lrUploaded && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Space>
                        <ThunderboltOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>AI Receipt Parser</Text>
                        <Tag color="purple" style={{ fontSize: 10 }}>Auto-extract details</Tag>
                      </Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        loading={aiParsing}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                        onClick={handleAIParse}
                      >
                        {aiParsing ? 'Parsing…' : 'AI Parse Receipt'}
                      </Button>
                    </div>

                    {/* Extracted / Editable Fields */}
                    {aiParsed && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                            <CheckCircleOutlined style={{ marginRight: 4 }} />AI extracted details — review &amp; edit if needed
                          </Text>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setLrEditMode(!lrEditMode)}
                            style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}
                          >
                            {lrEditMode ? 'View Summary' : 'Edit Details'}
                          </Button>
                        </div>

                        <Form form={lrForm} layout="vertical" size="small">
                          {lrEditMode ? (
                            <Row gutter={12}>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Number" name="lrNumber">
                                  <Input placeholder="e.g. LR-78921" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Date" name="lrDate">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Transport Name" name="transportName">
                                  <Input placeholder="e.g. Fast Cargo Pvt Ltd" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="No. of Packages" name="packages">
                                  <Input placeholder="30" prefix={<InboxOutlined />} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="From City" name="fromCity">
                                  <Input placeholder="Coimbatore" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="To City" name="toCity">
                                  <Input placeholder="Mumbai" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Weight" name="weight">
                                  <Input placeholder="45.5 Kg" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Freight Amount" name="freight">
                                  <Input placeholder="₹2,100" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Estimated Delivery" name="estimatedDelivery">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                            </Row>
                          ) : (
                            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                              <Descriptions.Item label="LR Number"><Text strong style={{ color: '#B11E6A' }}>{aiParsed.lrNumber}</Text></Descriptions.Item>
                              <Descriptions.Item label="LR Date">{aiParsed.lrDate}</Descriptions.Item>
                              <Descriptions.Item label="Transport">{aiParsed.transportName}</Descriptions.Item>
                              <Descriptions.Item label="Packages"><Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} />{aiParsed.packages}</Space></Descriptions.Item>
                              <Descriptions.Item label="From → To">{aiParsed.fromCity} → {aiParsed.toCity}</Descriptions.Item>
                              <Descriptions.Item label="Weight">{aiParsed.weight}</Descriptions.Item>
                              <Descriptions.Item label="Freight">{aiParsed.freight}</Descriptions.Item>
                              <Descriptions.Item label="Est. Delivery">{aiParsed.estimatedDelivery}</Descriptions.Item>
                            </Descriptions>
                          )}
                        </Form>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Tracking via Lorry Service */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <LinkOutlined style={{ color: '#B11E6A', fontSize: 15 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Tracking via Lorry Service</Text>
                </div>
                <Form form={trackingForm} layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <Form.Item label="Tracking URL (from lorry service web app)" name="trackingUrl" style={{ marginBottom: 8 }}>
                        <Input
                          placeholder="https://fastcargo.in/track/LR-78921"
                          prefix={<LinkOutlined style={{ color: '#B11E6A' }} />}
                          addonAfter={
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, color: '#B11E6A' }}
                              onClick={() => {
                                if (liveTrackingUrl) window.open(liveTrackingUrl, '_blank');
                              }}
                            >
                              Open
                            </Button>
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item label="LR / Tracking Number" name="trackingLR" style={{ marginBottom: 8 }}>
                        <Input placeholder="e.g. LR-78921" defaultValue={aiParsed?.lrNumber || ''} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>

              {/* ── Finished Dispatch ── */}
              <div style={{ background: finishedDispatch ? '#52c41a15' : isDark ? '#1a1a2a' : '#fff9fb', border: `1.5px solid ${finishedDispatch ? '#52c41a44' : '#B11E6A44'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <Text strong style={{ color: textColor, fontSize: 13 }}>
                    <BellOutlined style={{ color: finishedDispatch ? '#52c41a' : '#B11E6A', marginRight: 6 }} />
                    Finished Dispatch — Final Notification
                  </Text>
                  <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
                    Clicking this will notify <strong>{order.salesPerson}</strong> (Sales) and <strong>{order.client}</strong> (Customer) that the order has been dispatched and is on the way.
                  </div>
                </div>
                {finishedDispatch ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a', fontWeight: 600 }}>
                    <CheckCircleOutlined />
                    Notifications sent to Sales ({order.salesPerson}) &amp; Customer ({order.client})
                  </div>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<WhatsAppOutlined />}
                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
                    onClick={handleFinishedDispatch}
                  >
                    Finished Dispatch — Notify Sales &amp; Customer
                  </Button>
                )}
              </div>

            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
