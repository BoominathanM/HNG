import React, { useState, useMemo, useEffect } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, InputNumber, Upload, Typography, Space,
  Steps, Descriptions, Alert, Tag, Checkbox,
  Select, Table, Divider, Spin, Image,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import html2pdf from 'html2pdf.js';
import {
  CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined, FileDoneOutlined, CheckSquareOutlined,
  LinkOutlined, BellOutlined, CarOutlined, WhatsAppOutlined, EditOutlined,
  LoadingOutlined, GiftOutlined, AppstoreOutlined, CheckCircleFilled,
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
  useUploadItemBoxPhotosMutation,
  useGetInvoicesQuery,
  useGetCompanySettingsQuery,
  useGetKitsQuery,
  useUploadFilesMutation,
} from '../../store/api/apiSlice';
import { buildDocComposition } from '../../utils/docComposition';
import { fetchHotelPendingDue } from '../../utils/pendingDue';
import { generatePrintHTML } from '../../components/templates/DocumentTemplate';
import { buildDispatchGroupedProducts, summarizeDispatchVerification } from '../../utils/dispatchGrouping';

const { Title, Text } = Typography;
const { Option } = Select;

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

// Takes the DispatchRecord's own status enum (Draft/Confirmed/Dispatched) — 'Confirmed'
// covers both a Partial Dispatch checkpoint and the real Full Dispatch confirm, but either
// way it means payment + verification already happened, so it maps to "Verified" (step 2).
const stepIndex = (status) => {
  if (status === 'Dispatched') return 3;
  if (status === 'Confirmed') return 2;
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchDetail() {
  const makeUpload = useCloudinaryUpload();
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const { data: dispatchData, isLoading: dispatchLoading } = useGetDispatchQuery(id, { skip: !id });
  const [confirmDispatch] = useConfirmDispatchMutation();
  const [uploadLR] = useUploadDispatchLRMutation();
  const [verifyItem] = useVerifyItemMutation();
  const [saveAsDraft] = useSaveAsDraftMutation();
  const [uploadBoxPhotos] = useUploadBoxPhotosMutation();
  const [uploadItemBoxPhotos] = useUploadItemBoxPhotosMutation();
  const [uploadFilesMutation] = useUploadFilesMutation();

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

  // Tracks which upload buttons are mid-request (keyed by "order-open" / "order-close"
  // for the common section, "<itemId>-open" / "<itemId>-close" for per-item rows) so
  // the button icon can swap to a spinner while uploading.
  const [uploadingKeys, setUploadingKeys] = useState(() => new Set());
  const startUploading = (key) => setUploadingKeys((prev) => new Set(prev).add(key));
  const stopUploading = (key) => setUploadingKeys((prev) => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });

  // customRequest for the order-level "All Closed Box Photos" Upload component.
  // Uploads directly to POST /dispatch/:id/box-photos (Cloudinary + DB save in one step).
  const makeBoxUpload = () => async ({ file, onSuccess, onError }) => {
    const key = 'order-close';
    startUploading(key);
    const fd = new FormData();
    fd.append('photos', file);
    fd.append('type', 'close');
    try {
      const result = await uploadBoxPhotos({ id, formData: fd }).unwrap();
      const photos = result.data?.closeBoxPhotos;
      const url = (photos || []).slice(-1)[0] || '';
      file.url = url;
      file.thumbUrl = url;
      onSuccess(result.data, file);
      setCloseBoxCount(photos?.length || 0);
      enqueueSnackbar('Closed box photo saved', { variant: 'success' });
    } catch {
      onError(new Error('Upload failed'));
      enqueueSnackbar('Closed box photo upload failed', { variant: 'error' });
    } finally {
      stopUploading(key);
    }
  };

  // Per-product open/closed box photo upload — required before that product can be
  // verified. Relies on the Dispatch cache invalidation to refetch, so the row's
  // openBoxPhotos/closeBoxPhotos (threaded through dispatchGrouping's toRow) update
  // reactively — no local counter state needed.
  const makeItemBoxUpload = (itemId, type) => async ({ file, onSuccess, onError }) => {
    const key = `${itemId}-${type}`;
    startUploading(key);
    const fd = new FormData();
    fd.append('photos', file);
    fd.append('type', type);
    try {
      const result = await uploadItemBoxPhotos({ id, itemId, formData: fd }).unwrap();
      onSuccess(result.data, file);
      enqueueSnackbar(`${type === 'close' ? 'Closed' : 'Open'} box photo saved`, { variant: 'success' });
    } catch {
      onError(new Error('Upload failed'));
      enqueueSnackbar(`${type === 'close' ? 'Closed' : 'Open'} box photo upload failed`, { variant: 'error' });
    } finally {
      stopUploading(key);
    }
  };

  // Shared by Print Invoice and the WhatsApp "Dispatch Notify" send — builds the same
  // invoice data shape DocumentTemplate expects from the Billing invoice linked to this order.
  // filterVerified=true (the default — used everywhere except the explicit "Full Invoice"
  // button once fully dispatched) drops any product/kit line whose dispatch item isn't
  // verified, so the printed invoice only ever shows what's actually been checked and boxed.
  const buildInvoiceData = async (inv, filterVerified = true) => {
    const halfGst = Math.round((inv.gstAmount || 0) / 2 * 100) / 100;

    // Extract linked order (populated by API) for kit composition data
    const linkedOrder = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    let srcProds = linkedOrder?.products?.length
      ? linkedOrder.products
      : (linkedOrder?.items?.length ? linkedOrder.items : []);
    let srcKitOrders = linkedOrder?.kitOrders || [];

    if (filterVerified) {
      // dispatch items (order.items) line up positionally with the order's own
      // products/items array — same fallback convention dispatchGrouping.js and the
      // emergency-badge lookup below already rely on — so verified state at index i
      // applies to srcProds[i].
      const dispatchItemsList = order?.items || [];
      const verifiedIndexSet = new Set(
        dispatchItemsList
          .map((it, i) => (it?._id && (verifiedProducts.has(it._id) || it.verified) ? i : -1))
          .filter((i) => i >= 0)
      );
      const filteredProds = srcProds.filter((_, i) => verifiedIndexSet.has(i));
      srcKitOrders = srcKitOrders.filter((ko) => !ko.kitId || filteredProds.some((p) => String(p.kitId) === String(ko.kitId)));
      srcProds = filteredProds;
    }

    // Pre-built personalized composition (outer packaging folded into Section A's total,
    // included kits/products broken out, remaining in B/C) so the printed invoice matches the
    // Billing invoice exactly. Null when there is no personalized packaging → flat fallback.
    const composition = buildDocComposition({
      products: srcProds,
      kitOrders: srcKitOrders,
      kitPrice: linkedOrder?.kitPrice,
      kitOverallQty: linkedOrder?.kitOverallQty,
      packagingIncludes: linkedOrder?.packagingIncludes || [],
      packagingIncludesQty: linkedOrder?.packagingIncludesQty || {},
    }, kits);
    const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const customerName = inv.partyId?.name || order?.client || '—';
    const pendingDue = await fetchHotelPendingDue({
      clientPartyId: inv.partyId?._id,
      clientName: customerName,
      excludeInvoiceId: inv._id,
    });

    return {
      inv: inv.invoiceNumber,
      pendingDue,
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
  };

  // filterVerified=true → "Print Invoice" / "Print Combined Invoice" (only verified
  // products so far). filterVerified=false → "Print Full Invoice" (every order item,
  // available once fully dispatched, regardless of verification).
  const handlePrintInvoice = async (filterVerified = true) => {
    const rawInvoices = orderInvoicesData?.data || [];
    if (rawInvoices.length === 0) {
      enqueueSnackbar('No invoice found for this order. Please create one from the Billing page.', { variant: 'warning' });
      return;
    }
    const invoiceData = await buildInvoiceData(rawInvoices[0], filterVerified);
    const html = generatePrintHTML('invoice', invoiceData, invoiceSettings);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  // Rasterizes the same invoice markup used for print into a real PDF Blob (html2pdf =
  // html2canvas + jsPDF) so it can be uploaded and attached to the "Dispatch Notify"
  // WhatsApp message — mirrors Billing's handleSendInvoiceWhatsApp.
  const generateInvoicePdfBlob = async (invoiceData) => {
    const html = generatePrintHTML('invoice', invoiceData, invoiceSettings);
    const docEl = new DOMParser().parseFromString(html, 'text/html').querySelector('.doc');
    const container = document.createElement('div');
    container.appendChild(docEl);
    document.body.appendChild(container);
    try {
      return await html2pdf()
        .from(container)
        .set({
          margin: 5,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .outputPdf('blob');
    } finally {
      document.body.removeChild(container);
    }
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
    // Set once both Sales Head and Ops Head approve the Emergency Dispatch request
    // (Task/tasks.controller approveEmergencyOps) — an explicit dispatch-despite-pending-payment
    // override, so it must unblock this gate the same as a cleared balance would.
    const emergencyApproved = !!o.emergencyApproved;
    // Whether the balance is actually cleared, independent of the emergency override below —
    // used to tell the "really paid" case apart from "dispatch allowed despite pending payment".
    const reallyPaymentConfirmed = isSample || isCredit || livePayStatus === 'Paid' || (o.balance != null && o.balance <= 0) || o.status === 'Completed';
    // Payment is "Confirmed" for dispatch purposes once the order balance is cleared, credit terms apply, or Sales+Ops emergency-approved it.
    const basePaymentConfirmed = reallyPaymentConfirmed || emergencyApproved;
    return {
      key: d._id, id: o.orderCode || d.orderCode || d._id,
      orderObjectId: o._id || d.orderId,
      client: o.clientName || lead.hotelName || '—', contactPerson: o.contactPerson || lead.contactPerson || '—',
      phone: o.clientPhone || lead.phone || '', email: o.email || o.clientEmail || lead.email || '',
      product: derivedProduct, qty: derivedQty,
      boxes: d.boxes || 0, weight: d.weight || '',
      basePaymentConfirmed,
      emergencyApproved,
      reallyPaymentConfirmed,
      isCredit,
      creditDueDate: o.paymentReminderDate || o.creditDueDate || null,
      payment: isCredit ? 'Credit' : (isSample ? 'N/A' : (livePayStatus === 'Paid' ? 'Confirmed' : livePayStatus === 'Partial' ? 'Partial' : (emergencyApproved ? 'Emergency Approved' : (basePaymentConfirmed ? 'Confirmed' : 'Pending')))),
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
      // Order's own items — kept separately (even when dispatch items exist) so the
      // grouping util can recover kit metadata for dispatch records created before
      // kit fields were copied onto DispatchRecord.items.
      orderRawItems: o.items || [],
      kitOrders: o.kitOrders || [],
      // Emergency split — same source Operations reads (splitDates), used here to badge
      // which product/kit rows are emergency and to gate the Partial → Full dispatch flow.
      isEmergency: !!(o.isEmergency || lead.isEmergency),
      splitDates: o.splitDates || lead.splitDates || [],
      // A personalized kit's own count (e.g. "25 kits") — the split-date option "Kit (All
      // Products)" is stored as product '__kit__' and its qty is measured against THIS, not
      // against the kit's individual component item quantities (those are per-kit amounts).
      kitOverallQty: o.kitOverallQty || 0,
      storedPartialDispatchConfirmed: !!d.partialDispatchConfirmed,
      storedPartialDispatchAt: d.partialDispatchAt || null,
      storedPartialTransportName: d.partialTransportName || '',
      storedPartialWeight: d.partialWeight || '',
      storedPartialBoxes: d.partialBoxes || 0,
      // Stored verification photos
      openBoxPhotos: d.openBoxPhotos || [],
      closeBoxPhotos: d.closeBoxPhotos || [],
      // Stored LR / tracking details
      storedTransportName: d.transportName || '',
      storedWeight: d.weight || '',
      storedBoxes: d.boxes || 0,
      storedDispatchType: d.dispatchType || null,
      // The backend only ever sets DispatchRecord.status to 'Confirmed' — both for the
      // Partial Dispatch checkpoint AND the real Full Dispatch confirm — so `status` alone
      // can't tell the two apart. `dispatchedAt` is only ever set on the real Full Dispatch
      // path (never on the partial checkpoint's early-return), so it's the only reliable
      // "actually fully dispatched" signal.
      dispatchedAt: d.dispatchedAt || null,
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

  // Emergency split, keyed per target (lowercase product name, or the literal '__kit__'
  // Sales uses for its "Kit (All Products)" split-date option) → { emergencyQty, totalQty }.
  // Summed directly from order.splitDates with no clamping, so it always matches exactly
  // what's entered in the "Urgent / Emergency Deliveries (Partial)" card on the Order
  // (Sales/index.jsx) — that card is the source of truth for these numbers, not the item
  // verification table. '__kit__' is measured against the personalized kit's OWN overall
  // qty (order.kitOverallQty, e.g. "25 kits"), never against its component items' qty —
  // Paste/Brush carry a PER-KIT quantity (e.g. 1 each), not the kit's own count, so summing
  // them instead of using kitOverallQty previously produced the wrong total.
  const emergencyByTarget = useMemo(() => {
    const map = new Map();
    const itemQtyByName = new Map();
    (order?.orderRawItems || []).forEach((it) => {
      const key = (it.product || it.itemName || '').toLowerCase();
      if (key) itemQtyByName.set(key, (itemQtyByName.get(key) || 0) + (Number(it.qty) || 0));
    });
    (order?.splitDates || []).forEach((sd) => {
      const productList = (sd.products && sd.products.length > 0)
        ? sd.products
        : (sd.product ? [{ product: sd.product, qty: sd.qty }] : []);
      productList.forEach((p) => {
        if (!p.product) return;
        const key = p.product.toLowerCase();
        const existing = map.get(key) || {
          emergencyQty: 0,
          totalQty: key === '__kit__' ? (order?.kitOverallQty || 0) : (itemQtyByName.get(key) || 0),
        };
        existing.emergencyQty += Number(p.qty) || 0;
        map.set(key, existing);
      });
    });
    return map;
  }, [order]);

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

    // A prior Partial Dispatch checkpoint was already confirmed — force the next round
    // to Full Dispatch and keep the Confirm button active for it.
    if (order.storedPartialDispatchConfirmed) {
      setPartialConfirmed(true);
      setDispatchType('Full Dispatch');
      form.setFieldsValue({ dispatchType: 'Full Dispatch' });
    }

    // Dispatched status — `dispatchedAt` (not `status`) is the reliable signal: `status`
    // reads 'Confirmed' for both the Partial Dispatch checkpoint and the real Full Dispatch
    // confirm, so gating on it here previously locked the Confirm button forever right after
    // a Partial Dispatch checkpoint, before the dispatcher ever got to do the Full round.
    if (order.dispatchedAt || order.status === 'Dispatched') {
      setDispatched(true);
    }

    // Box photo counts from stored arrays
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
  // Single checkbox: when checked, a "Dispatch Notify" WhatsApp message (with the invoice
  // attached) is sent to both the order's sales person and the customer on confirm.
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  // True once the emergency/first portion has been confirmed as Partial Dispatch — the
  // Confirm button stays active (not `dispatched`) so the remaining items can go out as
  // a second, final Full Dispatch confirm.
  const [partialConfirmed, setPartialConfirmed] = useState(false);

  // Box photo upload tracking (uploaded immediately via handleBoxPhotoUpload).
  // Only closed-box photos are collected at the order level (see "All Closed Box
  // Photos" below) — open-box evidence is captured per-item in the table above.
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

  // A row reads as verified if this session toggled it OR the backend already has it
  // stored (row.verified, persisted by a previous verifyItem call) — without this
  // fallback, verified products flip back to "Pending" on every reload/revisit even
  // though the DB still has them marked verified.
  const isRowVerified = (row) => verifiedProducts.has(row.key) || !!row.verified;

  // Every verifiable row (Personalized Kit component, Separate Kit component, or
  // Separate Product) must have at least one open-box and one closed-box photo on
  // file before it can be verified — unverifying is always allowed, no photo needed.
  const toggleVerify = async (row) => {
    const productKey = row.key;
    const alreadyVerified = isRowVerified(row);
    const willVerify = !alreadyVerified;
    if (willVerify) {
      const hasOpen = (row.openBoxPhotos?.length || 0) > 0;
      const hasClose = (row.closeBoxPhotos?.length || 0) > 0;
      if (!hasOpen || !hasClose) {
        enqueueSnackbar('Upload at least one open-box and one closed-box photo for this product before verifying.', { variant: 'warning' });
        return;
      }
    }
    setVerifiedProducts(prev => {
      const next = new Set(prev);
      if (alreadyVerified) next.delete(productKey); else next.add(productKey);
      return next;
    });
    const itemIds = (row.childItemIds && row.childItemIds.length) ? row.childItemIds : (row.itemId ? [row.itemId] : []);
    if (itemIds.length) {
      try {
        // Sequential, not Promise.all: each verifyItem call reads-then-saves the whole
        // dispatch document, so firing them concurrently lets a later save's stale copy
        // overwrite an earlier item's verified flag.
        for (const itemId of itemIds) {
          await verifyItem({ id, itemId, verified: willVerify }).unwrap();
        }
      } catch {
        enqueueSnackbar(`Failed to persist ${willVerify ? 'verification' : 'unverify'}`, { variant: 'error' });
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
      // WhatsApp checkbox is on: the "Dispatch Notify" template requires a document
      // header, so generate the Billing invoice as a PDF and upload it first — the
      // resulting URL rides along on the confirm request as invoiceDocumentUrl.
      let invoiceDocumentUrl = '';
      let invoiceDocumentFilename = '';
      if (notifyWhatsApp) {
        const rawInvoices = orderInvoicesData?.data || [];
        if (rawInvoices.length === 0) {
          enqueueSnackbar('No invoice found for this order — create one in Billing first, or uncheck the WhatsApp notify option.', { variant: 'warning' });
        } else {
          try {
            const invoiceData = await buildInvoiceData(rawInvoices[0]);
            const pdfBlob = await generateInvoicePdfBlob(invoiceData);
            invoiceDocumentFilename = `invoice-${rawInvoices[0].invoiceNumber || order.id}.pdf`;
            const fd = new FormData();
            fd.append('files', new File([pdfBlob], invoiceDocumentFilename, { type: 'application/pdf' }));
            const uploadRes = await uploadFilesMutation({ formData: fd, folder: 'invoices' }).unwrap();
            invoiceDocumentUrl = uploadRes?.data?.[0]?.url || '';
          } catch {
            enqueueSnackbar('Could not prepare the invoice PDF — WhatsApp notification will be skipped.', { variant: 'warning' });
          }
        }
      }

      const formData = new FormData();
      const vals = form.getFieldsValue();
      formData.append('transport', vals.transport || order.storedTransportName || order.transport || '');
      formData.append('boxes', vals.boxes ?? order.storedBoxes ?? order.boxes ?? 0);
      formData.append('weight', vals.weight ?? order.storedWeight ?? order.weight ?? '');
      formData.append('dispatchType', vals.dispatchType || dispatchType || 'Full Dispatch');
      formData.append('invoiceNumber', vals.invoiceNumber || '');
      // Persist a forwarding-charge override raised here — otherwise the edit only
      // lives in local state and reverts to the original amount on reload.
      if (order.forwardingCharge) formData.append('forwardingChargeAmount', effectiveFwdAmount);
      if (vals.invoiceDate) formData.append('invoiceDate', vals.invoiceDate.format ? vals.invoiceDate.format('YYYY-MM-DD') : vals.invoiceDate);
      // Backend reads sendWhatsapp (FormData sends it as a string) — single checkbox now
      // governs whether the "Dispatch Notify" WhatsApp message goes out. It only actually
      // sends when an invoice document URL was successfully prepared above.
      formData.append('sendWhatsapp', notifyWhatsApp && !!invoiceDocumentUrl);
      if (invoiceDocumentUrl) {
        formData.append('invoiceDocumentUrl', invoiceDocumentUrl);
        formData.append('invoiceDocumentFilename', invoiceDocumentFilename);
      }
      // Attach the invoice file if one was selected (confirm route accepts upload.single('invoice')).
      const invoiceFile = vals.invoiceFile?.[0]?.originFileObj || vals.invoiceFile?.file?.originFileObj;
      if (invoiceFile) formData.append('invoice', invoiceFile);
      const result = await confirmDispatch({ id, formData }).unwrap();
      if (result?.partial) {
        // Emergency/first portion only — keep the button active and switch to Full
        // Dispatch so the next confirm finalizes the remaining items.
        setPartialConfirmed(true);
        setDispatchType('Full Dispatch');
        form.setFieldsValue({ dispatchType: 'Full Dispatch' });
        enqueueSnackbar('Partial Dispatch confirmed for the emergency items. Confirm the remaining items as Full Dispatch once ready.', { variant: 'success' });
      } else {
        setDispatched(true);
        enqueueSnackbar(
          notifyWhatsApp && invoiceDocumentUrl
            ? 'Dispatch confirmed! WhatsApp notification sent to Sales & Customer.'
            : 'Dispatch confirmed! WhatsApp notification skipped.',
          { variant: 'success' }
        );
      }
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
        // Persist a forwarding-charge override raised here — otherwise the edit only
        // lives in local state and reverts to the original amount on reload.
        forwardingChargeAmount: order.forwardingCharge ? effectiveFwdAmount : undefined,
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

  // Only the genuine first load (no cached data yet) shows the full-page spinner.
  // isFetching also goes true on every background refetch after a verify/unverify/
  // upload (tag invalidation) — gating on that too would flash the whole page blank
  // on every action even though the already-loaded data is still valid to show.
  if (dispatchLoading && !dispatchData) {
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

  // Kit-grouped product rows for the verification table (Personalized Kit / Separate
  // Kits / Separate Products), shared with the Dispatch list's expand-row panel.
  // `products` = verifiable units (personalized kit headers count as ONE unit; separate items are individual).
  // `groupedProducts` = all display rows including kit header + child item rows.
  const { products, groupedProducts } = buildDispatchGroupedProducts({
    items: order?.items,
    kitOrders: order?.kitOrders,
    orderItems: order?.orderRawItems,
    boxes: order?.boxes,
  });
  const verifySummary = summarizeDispatchVerification(products, isRowVerified);

  // Per-item name/qty lookup used to badge each product/kit row with its emergency count.
  // Dispatch items get a fresh _id at creation (not copied from the order item), so they
  // can't be matched to order.orderRawItems by id — only by array position, same fallback
  // pattern buildDispatchGroupedProducts already uses to recover kit metadata.
  const itemNameById = new Map();
  const itemQtyById = new Map();
  (order?.items || []).forEach((it, i) => {
    if (!it?._id) return;
    const fallback = (order?.orderRawItems || [])[i] || {};
    const key = String(it._id);
    itemNameById.set(key, it.product || it.itemName || fallback.product || fallback.itemName || fallback.name || '');
    itemQtyById.set(key, Number(it.qty ?? it.qtyOrdered ?? fallback.qty) || 0);
  });

  // Resolves a product/kit row's emergency qty against order.splitDates. A personalized
  // kit header IS the '__kit__' target itself (matched directly, never by summing its
  // Paste/Brush child items — those carry a per-kit qty, not the kit's own count). Any
  // other row (separate kit/product) is matched by its own product name. Returns null
  // when the row has no emergency portion.
  const getRowEmergency = (row) => {
    if (emergencyByTarget.size === 0) return null;
    if (row.type === 'kit_header' && row.isPersonalized) {
      const info = emergencyByTarget.get('__kit__');
      return info && info.emergencyQty > 0 ? info : null;
    }
    const childIds = row.type === 'kit_header' ? (row.childItemIds || []) : (row.itemId ? [row.itemId] : []);
    if (childIds.length === 0) return null;
    let emergencyQty = 0;
    let totalQty = 0;
    let matched = false;
    const seenNames = new Set();
    childIds.forEach((itemId) => {
      const name = (itemNameById.get(String(itemId)) || '').toLowerCase();
      if (!name || seenNames.has(name)) return;
      seenNames.add(name);
      const info = emergencyByTarget.get(name);
      if (info) { matched = true; emergencyQty += info.emergencyQty; totalQty += info.totalQty; }
    });
    return matched ? { emergencyQty, totalQty } : null;
  };

  // Doc: every product must be verified before dispatch can be confirmed.
  const allProductsVerified = products.length > 0 && products.every((p) => verifiedProducts.has(p.key) || p.verified);

  // Partial Dispatch only ships the emergency-flagged items, so it only needs those
  // verified — not the whole order. Full Dispatch (first-time, or the second/final
  // confirm after a partial round) still needs every product verified.
  const emergencyProducts = products.filter((p) => !!getRowEmergency(p));
  const allEmergencyVerified = emergencyProducts.length > 0
    && emergencyProducts.every((p) => verifiedProducts.has(p.key) || p.verified);
  const isPartialRound = dispatchType === 'Partial Dispatch' && !partialConfirmed;
  const verificationGateSatisfied = (isPartialRound && emergencyProducts.length > 0)
    ? allEmergencyVerified
    : allProductsVerified;

  // Exact emergency count for the page-level banner — summed directly from
  // emergencyByTarget (i.e. straight from order.splitDates, each target's total already
  // resolved to kitOverallQty for '__kit__' or the matching item's own qty otherwise) rather
  // than reconstructed from matched rows, so it can never under/over-count relative to what
  // the "Urgent / Emergency Deliveries (Partial)" card on the Order shows.
  let emergencyTotals = { emergencyQty: 0, totalQty: 0 };
  emergencyByTarget.forEach((v) => {
    emergencyTotals.emergencyQty += v.emergencyQty;
    emergencyTotals.totalQty += v.totalQty;
  });

  const lrUploaded = lrFileList.length > 0;

  // Transport / Weight / Boxes must be entered before dispatch can be confirmed — for
  // both Partial and Full Dispatch — same as the open/close box photo requirement below.
  const transportFilled = !!String(liveTransport ?? order.storedTransportName ?? '').trim();
  const weightFilled = !!String(liveWeight ?? order.storedWeight ?? '').trim();
  const boxesFilled = Number(liveBoxes ?? order.storedBoxes ?? order.boxes ?? 0) > 0;

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

      {emergencyTotals.emergencyQty > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="error" showIcon
            message="Emergency Order"
            description={`${emergencyTotals.emergencyQty} of ${emergencyTotals.totalQty} unit${emergencyTotals.totalQty !== 1 ? 's' : ''} in this order ${emergencyTotals.emergencyQty !== 1 ? 'are' : 'is'} emergency — dispatch ${emergencyTotals.emergencyQty !== 1 ? 'these' : 'this'} first as Partial Dispatch; the remaining ${emergencyTotals.totalQty - emergencyTotals.emergencyQty} unit${(emergencyTotals.totalQty - emergencyTotals.emergencyQty) !== 1 ? 's' : ''} go out later as Full Dispatch.`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}
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
      {!order.isSample && !order.isCredit && order.emergencyApproved && !order.reallyPaymentConfirmed && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="warning" showIcon
            message="Emergency-Approved — Dispatch Allowed With Payment Pending"
            description="Sales Head and Ops Head both approved this emergency dispatch. Payment is not yet fully collected — follow up separately."
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
                    : order.emergencyApproved && !order.reallyPaymentConfirmed
                    ? <Tag color="warning">Emergency Approved</Tag>
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
                    <Form.Item
                      label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Transport Name</span>}
                      name="transport"
                      validateStatus={transportFilled ? 'success' : 'error'}
                      help={transportFilled ? undefined : 'Required before dispatch can be confirmed'}
                    >
                      <Input placeholder="e.g. Fast Cargo" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item
                      label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Weight (Verify)</span>}
                      name="weight"
                      validateStatus={weightFilled ? 'success' : 'error'}
                      help={weightFilled ? undefined : 'Required'}
                    >
                      <Input placeholder="kg" suffix="kg" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item
                      label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>Boxes</span>}
                      name="boxes"
                      validateStatus={boxesFilled ? 'success' : 'error'}
                      help={boxesFilled ? undefined : 'Required'}
                    >
                      <InputNumber min={0} placeholder="0" style={{ width: '100%' }} prefix={<InboxOutlined style={{ color: '#B11E6A' }} />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Dispatch Type"
                      name="dispatchType"
                      extra={partialConfirmed && !dispatched
                        ? <Text style={{ fontSize: 11, color: '#ff4d4f' }}>Partial Dispatch already confirmed — send the remaining items as Full Dispatch.</Text>
                        : undefined}
                    >
                      <Select
                        placeholder="Select dispatch type"
                        // Locked to Full Dispatch once a Partial Dispatch checkpoint has been
                        // confirmed — the only thing left to do is send the remaining items.
                        disabled={partialConfirmed}
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
                          // Locked in once the dispatch is confirmed — shouldn't change after
                          // it's been finalized.
                          disabled={dispatched}
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
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <Space size={8}>
                          <InboxOutlined style={{ color: '#B11E6A' }} />
                          <Text strong style={{ color: textColor }}>Product Details — {order.id}</Text>
                          <Tag color={dispatchType === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12, fontSize: 11 }}>
                            {dispatchType}
                          </Tag>
                        </Space>
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                          {verifySummary.overall.verified} / {verifySummary.overall.total} verified
                        </Text>
                      </div>
                      <Space size={6} wrap style={{ marginTop: 8 }}>
                        {[verifySummary.personalizedKit, verifySummary.separateKit, verifySummary.separateProduct]
                          .filter((b) => b.total > 0)
                          .map((b) => (
                            <Tag key={b.label} style={{ borderRadius: 12, fontSize: 11, background: 'transparent', border: '1px solid #B11E6A33', color: textColor }}>
                              {b.label}: {b.verified}/{b.total}
                            </Tag>
                          ))}
                      </Space>
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
                          // Every kit header (Personalized or Separate) is a divider row only —
                          // each component item underneath (personalized_item / kit_item) is
                          // individually verified and gets its own Status/Photos/Action cells.
                          onCell: (row) => (row.type === 'kit_header' ? { colSpan: 4 } : {}),
                          render: (v, row) => {
                            const emergencyInfo = getRowEmergency(row);
                            const emergencyBadge = emergencyInfo && (
                              <Tag color="red" style={{ borderRadius: 12, fontSize: 10 }}>
                                Emergency: {emergencyInfo.emergencyQty}{emergencyInfo.totalQty ? `/${emergencyInfo.totalQty}` : ''}
                              </Tag>
                            );
                            if (row.type === 'kit_header') {
                              const catMeta = {
                                personalized:     { icon: <GiftOutlined />, bg: '#ede9fe', color: '#5b21b6', label: 'Personalized Kit' },
                                separate_kit:     { icon: <GiftOutlined />, bg: '#e0f2fe', color: '#0369a1', label: 'Separate Kit' },
                                separate_product: { icon: <AppstoreOutlined />, bg: '#fce7f3', color: '#9d174d', label: 'Products' },
                              };
                              const cm = catMeta[row.category] || catMeta.separate_kit;
                              return (
                                <div style={{ background: cm.bg, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, margin: '-1px -1px', flexWrap: 'wrap' }}>
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
                                  {emergencyBadge}
                                </div>
                              );
                            }
                            // personalized_item or kit_item or product
                            return (
                              <Space size={4} wrap>
                                {(row.type === 'kit_item' || row.type === 'personalized_item') && (
                                  <span style={{ color: '#ccc', fontSize: 13, marginLeft: 8 }}>└</span>
                                )}
                                <Text style={{ fontSize: 12 }}>{v}</Text>
                                {row.perKitQty != null && (
                                  <Text style={{ fontSize: 10, color: '#bbb' }}>({row.perKitQty}/kit)</Text>
                                )}
                                {emergencyBadge}
                              </Space>
                            );
                          },
                        },
                        {
                          title: 'Status', key: 'status',
                          onCell: (row) => (row.type === 'kit_header' ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (row.type === 'kit_header') return null;
                            return isRowVerified(row)
                              ? <Tag color="success" style={{ borderRadius: 20 }}>Verified</Tag>
                              : <Tag color="default" style={{ borderRadius: 20 }}>Pending</Tag>;
                          },
                        },
                        {
                          title: 'Open / Closed Box Photos', key: 'photos',
                          onCell: (row) => (row.type === 'kit_header' ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (row.type === 'kit_header') return null;
                            const openPhotos = row.openBoxPhotos || [];
                            const closePhotos = row.closeBoxPhotos || [];
                            const openCount = openPhotos.length;
                            const closeCount = closePhotos.length;
                            const thumb = (photos, color) => photos.length > 0 && (
                              <span style={{ position: 'relative', display: 'inline-flex', width: 28, height: 28 }}>
                                <Image
                                  src={photos[photos.length - 1]}
                                  width={28}
                                  height={28}
                                  style={{ objectFit: 'cover', borderRadius: 4, border: `1px solid ${color}` }}
                                  preview={{ src: photos[photos.length - 1] }}
                                />
                                <CheckCircleFilled
                                  style={{
                                    position: 'absolute', bottom: -4, right: -4,
                                    color, background: '#fff', borderRadius: '50%', fontSize: 12,
                                  }}
                                />
                              </span>
                            );
                            const openUploading = uploadingKeys.has(`${row.itemId}-open`);
                            const closeUploading = uploadingKeys.has(`${row.itemId}-close`);
                            return (
                              <Space size={4}>
                                <Upload
                                  showUploadList={false}
                                  accept="image/*"
                                  disabled={openCount >= 1 || openUploading}
                                  customRequest={makeItemBoxUpload(row.itemId, 'open')}
                                >
                                  <Button size="small" icon={openUploading ? <LoadingOutlined spin /> : <CameraOutlined />}
                                    style={openCount > 0 ? { borderColor: '#52c41a', color: '#52c41a' } : undefined}
                                  >
                                    Open
                                  </Button>
                                </Upload>
                                {thumb(openPhotos, '#52c41a')}
                                <Upload
                                  showUploadList={false}
                                  accept="image/*"
                                  disabled={closeCount >= 1 || closeUploading}
                                  customRequest={makeItemBoxUpload(row.itemId, 'close')}
                                >
                                  <Button size="small" icon={closeUploading ? <LoadingOutlined spin /> : <CameraOutlined />}
                                    style={closeCount > 0 ? { borderColor: '#52c41a', color: '#52c41a' } : undefined}
                                  >
                                    Closed
                                  </Button>
                                </Upload>
                                {thumb(closePhotos, '#1677ff')}
                              </Space>
                            );
                          },
                        },
                        {
                          title: 'Action', key: 'action',
                          onCell: (row) => (row.type === 'kit_header' ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (row.type === 'kit_header') return null;
                            const verified = isRowVerified(row);
                            const hasPhotos = (row.openBoxPhotos?.length || 0) > 0 && (row.closeBoxPhotos?.length || 0) > 0;
                            return (
                              <Button size="small" icon={<CheckSquareOutlined />}
                                disabled={!verified && !hasPhotos}
                                title={!verified && !hasPhotos ? 'Upload open & closed box photos first' : undefined}
                                style={verified ? { borderColor: '#52c41a', color: '#52c41a' } : { background: '#B11E6A', border: 'none', color: '#fff' }}
                                onClick={() => toggleVerify(row)}
                              >
                                {verified ? 'Unverify' : 'Verify'}
                              </Button>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Partial Dispatch — persisted snapshot, shown once confirmed so the
                    transport/weight/boxes captured AT THAT CHECKPOINT stay visible even
                    after a later Full Dispatch confirm overwrites the live fields above. */}
                {(order.storedPartialDispatchConfirmed || partialConfirmed) && (
                  <div style={{ background: '#fa8c1615', border: '1px solid #fa8c1644', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <Space size={8} style={{ marginBottom: 10 }}>
                      <CheckCircleOutlined style={{ color: '#fa8c16' }} />
                      <Text strong style={{ color: textColor, fontSize: 13 }}>Partial Dispatch — Confirmed</Text>
                      {order.storedPartialDispatchAt && (
                        <Text style={{ fontSize: 11, color: '#999' }}>
                          on {new Date(order.storedPartialDispatchAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Text>
                      )}
                    </Space>
                    <Descriptions bordered size="small" column={3} style={{ borderRadius: 8 }}>
                      <Descriptions.Item label="Transport">{order.storedPartialTransportName || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Weight">{order.storedPartialWeight || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Boxes">{order.storedPartialBoxes || 0}</Descriptions.Item>
                    </Descriptions>
                    <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginTop: 8 }}>
                      Closed box photos uploaded so far: {closeBoxCount}.
                    </Text>
                  </div>
                )}

                {/* All Closed Box Photos — order-level closed-box evidence, up to 5,
                    uploaded immediately. Open box photos are no longer collected here
                    (only via the per-item Open/Closed buttons in the table above), so
                    only closeBoxCount gates Confirm Dispatch below. */}
                <Form.Item
                  label={<span><span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>All Closed Box Photos</span>}
                  validateStatus={closeBoxCount === 0 ? 'error' : 'success'}
                  help={closeBoxCount === 0 ? 'At least one closed-box photo is required' : `${closeBoxCount} photo(s) uploaded`}
                >
                  <Upload
                    showUploadList={false}
                    accept="image/*"
                    disabled={closeBoxCount >= 5 || uploadingKeys.has('order-close')}
                    customRequest={makeBoxUpload()}
                  >
                    <Button icon={uploadingKeys.has('order-close') ? <LoadingOutlined spin /> : <CameraOutlined />}>
                      Upload Closed Box Photo ({closeBoxCount}/5)
                    </Button>
                  </Upload>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {(order?.closeBoxPhotos || []).map((url, i) => (
                      <span key={`close-${i}`} style={{ position: 'relative', display: 'inline-flex' }}>
                        <Image
                          src={url}
                          width={64}
                          height={64}
                          style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #1677ff' }}
                        />
                        <CheckCircleFilled
                          style={{
                            position: 'absolute', bottom: -4, right: -4,
                            color: '#1677ff', background: '#fff', borderRadius: '50%', fontSize: 16,
                          }}
                        />
                      </span>
                    ))}
                    {closeBoxCount === 0 && (
                      <Text style={{ fontSize: 12, color: '#999' }}>No closed box photos uploaded yet.</Text>
                    )}
                  </div>
                </Form.Item>

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
                  {dispatched ? (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      <Button
                        icon={<PrinterOutlined />}
                        block
                        onClick={() => handlePrintInvoice(true)}
                        style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontWeight: 600 }}
                      >
                        Print Combined Invoice (Verified Only)
                      </Button>
                      <Button
                        icon={<PrinterOutlined />}
                        block
                        onClick={() => handlePrintInvoice(false)}
                        style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontWeight: 600 }}
                      >
                        Print Full Invoice (All Items)
                      </Button>
                    </Space>
                  ) : (
                    <Button
                      icon={<PrinterOutlined />}
                      block
                      onClick={() => handlePrintInvoice(true)}
                      style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontWeight: 600 }}
                    >
                      Print Invoice (Verified Only)
                    </Button>
                  )}
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
                  <Checkbox checked={notifyWhatsApp} onChange={(e) => setNotifyWhatsApp(e.target.checked)} style={{ color: textColor }}>
                    <WhatsAppOutlined style={{ color: '#25D366', marginRight: 4 }} />
                    Send WhatsApp notification to Sales person &amp; Customer (with invoice attached)
                  </Checkbox>
                </div>
              </Form>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {isPartialRound && emergencyProducts.length > 0 && !allEmergencyVerified && (
                  <Text style={{ fontSize: 12, color: '#ff4d4f', marginRight: 'auto' }}>
                    Verify the emergency-flagged item(s) above to enable Confirm Partial Dispatch.
                  </Text>
                )}
                {(!transportFilled || !weightFilled || !boxesFilled) && (
                  <Text style={{ fontSize: 12, color: '#ff4d4f', marginRight: 'auto' }}>
                    Enter Transport Name, Weight and Boxes above to enable dispatch confirmation.
                  </Text>
                )}
                <Button icon={<PrinterOutlined />} onClick={handlePrintDispatchDetails}>
                  Print Dispatch Details
                </Button>
                <Button icon={<SaveOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }} onClick={handleSaveDraft}>
                  Save as Draft
                </Button>
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  disabled={!paymentConfirmed || dispatched || !verificationGateSatisfied || closeBoxCount === 0 || !transportFilled || !weightFilled || !boxesFilled}
                  style={{ background: (paymentConfirmed && !dispatched && verificationGateSatisfied && closeBoxCount > 0 && transportFilled && weightFilled && boxesFilled) ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none' }}
                  onClick={handleConfirmDispatch}
                >
                  {dispatched
                    ? 'Dispatched ✓'
                    : partialConfirmed
                    ? 'Confirm Full Dispatch'
                    : dispatchType === 'Partial Dispatch'
                    ? 'Confirm Partial Dispatch'
                    : 'Confirm Dispatch'}
                </Button>
              </div>

              {/* Full Dispatch — persisted snapshot, shown once the order is fully
                  dispatched so the final transport/weight/boxes + box-photo evidence
                  stay visible on every later visit to this page, same as the Partial
                  Dispatch summary above. */}
              {dispatched && (
                <div style={{ background: '#52c41a15', border: '1px solid #52c41a44', borderRadius: 10, padding: 14, marginTop: 16 }}>
                  <Space size={8} style={{ marginBottom: 10 }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Full Dispatch — Confirmed</Text>
                  </Space>
                  <Descriptions bordered size="small" column={3} style={{ borderRadius: 8 }}>
                    <Descriptions.Item label="Transport">{order.storedTransportName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Weight">{order.storedWeight || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Boxes">{order.storedBoxes || 0}</Descriptions.Item>
                  </Descriptions>
                  <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginTop: 8 }}>
                    Closed box photos on file: {closeBoxCount}.
                  </Text>
                </div>
              )}

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
                  {!dispatched && !finishedDispatch && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#fa8c16' }}>
                      Confirm Dispatch above first to enable this step.
                    </div>
                  )}
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
                    disabled={!dispatched}
                    style={{ background: dispatched ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
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
