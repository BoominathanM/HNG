import React, { useState, useMemo, useEffect } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, InputNumber, Upload, Typography, Space,
  Steps, Descriptions, Alert, Tag, Checkbox,
  Table, Divider, Spin, Image, Modal, Select,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import html2pdf from 'html2pdf.js';
import {
  CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined, FileDoneOutlined, CheckSquareOutlined,
  LinkOutlined, BellOutlined, CarOutlined, WhatsAppOutlined, ExclamationCircleOutlined,
  LoadingOutlined, GiftOutlined, AppstoreOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetDispatchQuery,
  useConfirmDispatchMutation,
  useUploadDispatchLRMutation,
  useSaveAsDraftMutation,
  useUploadBoxPhotosMutation,
  useUploadItemBoxPhotosMutation,
  useUploadKitBoxPhotosMutation,
  useGetInvoicesQuery,
  useGetCompanySettingsQuery,
  useGetKitsQuery,
  useUploadFilesMutation,
  useScanDispatchLRMutation,
  useReportTransportMismatchMutation,
  useRequestLrMismatchApprovalMutation,
  useRequestInvoiceMismatchApprovalMutation,
} from '../../store/api/apiSlice';
import { buildDocComposition, computePersonalizedComposition } from '../../utils/docComposition';
import { computeRecordGrandTotal } from '../../utils/orderCalc';
import { fetchHotelPendingDue } from '../../utils/pendingDue';
import { generatePrintHTML } from '../../components/templates/DocumentTemplate';
import { buildDispatchGroupedProducts, summarizeDispatchVerification, getRowPendingQty } from '../../utils/dispatchGrouping';

const { Title, Text } = Typography;

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Per-row cap on Open/Closed box photos in the Product Details table (Kit/Product rows) —
// dispatchers select several images at once (Upload's `multiple`), so this also bounds how
// many of a batch selection get accepted once the row is already near the limit.
const MAX_ROW_BOX_PHOTOS = 5;

// Case/whitespace/punctuation-insensitive compare used for the transport-name mismatch
// check — AI-scanned and manually-entered names rarely match byte-for-byte (e.g. "VRL
// Logistics" vs "VRL Logistics Pvt. Ltd.").
const normalizeForCompare = (s) => (s || '').toString().trim().toLowerCase().replace(/[.,]/g, '');

// Kit-aware grand total for a (possibly dispatch-filtered) products/kitOrders set —
// mirrors Billing's computeCompositionGrandTotal (Billing/index.jsx) exactly, so the
// Dispatch-printed invoice total is computed the same way Billing computes its own
// live total instead of trusting the Invoice document's frozen `total` snapshot, which
// is what caused the two printed totals to drift apart after an order edit.
function computeCompositionGrandTotal(rec = {}, kitsData = [], bundleScaleRatio = 1) {
  if ((rec.packagingIncludes || []).length > 0 && kitsData.length > 0) {
    const comp = computePersonalizedComposition(rec, kitsData, bundleScaleRatio);
    const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
    const courier = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    const roundOffTotal = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
    const separateKit = comp.separateKits.reduce((s, sk) => s + (sk.remainingValue || 0), 0);
    const separateProduct = comp.sepProdsList.reduce((s, sp) => s + (sp.remainingValue || 0), 0);
    return r2(comp.totalPersonalized + separateKit + separateProduct + fwd + courier + roundOffTotal);
  }
  const products = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  if (!products.length && !kitOrders.length) return 0;
  return computeRecordGrandTotal(rec);
}

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
  const [saveAsDraft] = useSaveAsDraftMutation();
  const [uploadBoxPhotos] = useUploadBoxPhotosMutation();
  const [uploadItemBoxPhotos] = useUploadItemBoxPhotosMutation();
  const [uploadKitBoxPhotos] = useUploadKitBoxPhotosMutation();
  const [uploadFilesMutation] = useUploadFilesMutation();
  const [scanDispatchLR] = useScanDispatchLRMutation();
  const [reportTransportMismatch] = useReportTransportMismatchMutation();
  const [requestLrMismatchApproval] = useRequestLrMismatchApprovalMutation();
  const [requestInvoiceMismatchApproval] = useRequestInvoiceMismatchApprovalMutation();

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

  // Per-product open/closed box photo upload (Separate Product rows only — kits use
  // makeKitBoxUpload below). Relies on the Dispatch cache invalidation to refetch, so the
  // row's openBoxPhotos/closeBoxPhotos (threaded through dispatchGrouping's toRow) update
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

  // Kit-level open/closed box photo upload — Personalized Kit / Separate Kit are
  // dispatched (and photographed) as ONE unit, so this is called once per kit, not once
  // per component. `kitDispatchId` is the DispatchRecord.kitDispatch subdoc _id.
  const makeKitBoxUpload = (kitDispatchId, type) => async ({ file, onSuccess, onError }) => {
    const key = `kit-${kitDispatchId}-${type}`;
    startUploading(key);
    const fd = new FormData();
    fd.append('photos', file);
    fd.append('type', type);
    try {
      const result = await uploadKitBoxPhotos({ id, kitDispatchId, formData: fd }).unwrap();
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
  // button once fully dispatched) drops any product/kit line that hasn't actually been
  // dispatched yet, scaled by count (see effectiveKitOverallQty/effectivePackagingIncludes
  // below), so the printed invoice's product/kit + count based total is computed the exact
  // same way (buildDocComposition/computeCompositionGrandTotal) as the Billing invoice.
  // roundOnly=true (used by "Print Current Dispatch Invoice") additionally drops each row's
  // ALREADY-CONFIRMED qty from earlier rounds, leaving only what's typed into "Dispatch Now"
  // on THIS visit — see dispatchedOrPendingQtyForKit/Item below, the only two places
  // `confirmed` is read. Has no effect unless filterVerified is also true.
  const buildInvoiceData = async (inv, filterVerified = true, roundOnly = false) => {
    const halfGst = Math.round((inv.gstAmount || 0) / 2 * 100) / 100;

    // Extract linked order (populated by API) for kit composition data
    const linkedOrder = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    let srcProds = linkedOrder?.products?.length
      ? linkedOrder.products
      : (linkedOrder?.items?.length ? linkedOrder.items : []);
    let srcKitOrders = linkedOrder?.kitOrders || [];

    // Built unconditionally (not just inside the filterVerified branch below) — also needed
    // further down to scale the personalized kit's OWN overall qty and its packagingIncludes,
    // which otherwise bypass the products/kitOrders filtering entirely (see comment below).
    const kitDispatchByKitId = new Map((order?.kitDispatch || []).map((kd) => [String(kd.kitId), kd]));
    // This round's not-yet-confirmed "Dispatch Now" counts, keyed the same way as the
    // verification table rows (see `products` above). Print Invoice can be opened BEFORE
    // Confirm Partial/Full Dispatch runs — at that point qtyDispatched/kitDispatch.dispatchedQty
    // are still whatever the PREVIOUS round left them (0 for a brand-new order), so filtering on
    // those alone made the very first Print Invoice preview drop every row and fall back to the
    // frozen, un-composed invoice.items (blank Per Kit/Overall Qty, 0% tax). Folding in the
    // pending counts lets the preview show exactly what's about to go out.
    const kitDispatchNowByKitId = new Map(
      (products || []).filter((p) => p.type === 'kit_header' && p.kitId).map((p) => [String(p.kitId), dispatchNowCounts[p.key] || 0])
    );
    const productDispatchNowByItemId = new Map(
      (products || []).filter((p) => p.type === 'product' && p.itemId).map((p) => [String(p.itemId), dispatchNowCounts[p.key] || 0])
    );
    // Confirmed-so-far (previous rounds) PLUS this round's not-yet-confirmed "Dispatch Now"
    // entry — not an either/or choice between the two. A kit already partially confirmed in
    // an earlier round (e.g. 3 of 10) with a NEW count entered for this round (e.g. 2 more)
    // must resolve to 5, not silently drop the 2 just because something was already
    // confirmed — that under-count is what made the invoice preview (and, below, the
    // per-round invoice snapshot) ignore whatever was typed for a second/third partial round.
    const dispatchedOrPendingQtyForKit = (kitId) => {
      const kd = kitId ? kitDispatchByKitId.get(String(kitId)) : null;
      const confirmed = roundOnly ? 0 : (kd?.dispatchedQty || 0);
      return confirmed + (kitDispatchNowByKitId.get(String(kitId)) || 0);
    };
    const isKitDispatched = (kitId) => dispatchedOrPendingQtyForKit(kitId) > 0;
    // Same confirmed + pending resolution as dispatchedOrPendingQtyForKit above, but for a
    // single (non-kit) DispatchRecord item.
    const dispatchedOrPendingQtyForItem = (it) => {
      if (!it) return 0;
      const confirmed = roundOnly ? 0 : (it.qtyDispatched || 0);
      return confirmed + (productDispatchNowByItemId.get(String(it._id)) || 0);
    };

    // Name-keyed lookup of DispatchRecord.items (order.items) → its own dispatched-qty
    // tracking. `srcProds` prefers Order.products, while order.items is seeded from
    // Order.items (see forwardOrderToDispatch) — two INDEPENDENTLY built arrays that are
    // NOT guaranteed to share the same length or ordering (Order.items is remapped from
    // req.body.items/products at conversion time, Order.products is copied as-is), so a
    // product's dispatched state must be resolved by identity (kit id, or product name)
    // rather than by matching array position — matching by index silently paired the
    // wrong dispatched flag to the wrong product whenever the two arrays diverged, which
    // is what dropped an entire category (kit or product) from the dispatched-only
    // invoice and skewed the per-kit rate/GST split for whichever rows survived by mistake.
    const dispatchItemsList = order?.items || [];
    const dispatchItemByName = new Map(
      dispatchItemsList
        .map((it, i) => {
          const fallback = (order?.orderRawItems || [])[i] || {};
          const nm = (it.product || it.itemName || fallback.product || fallback.itemName || fallback.name || '').toLowerCase();
          return [nm, it];
        })
        .filter(([nm]) => nm)
    );
    const isNamedItemDispatched = (nm) => dispatchedOrPendingQtyForItem(dispatchItemByName.get(String(nm || '').toLowerCase())) > 0;

    // Personalized kit's own kitOrders entry (if any). Needed both to resolve its own
    // dispatched-or-pending qty AND to know which kit/product ids are referenced in
    // packagingIncludes (bundled INSIDE the personalized kit's box) — those bundled rows
    // have NO independent Dispatch Now tracking of their own (dispatchGrouping.js folds
    // them into the personalized kit's children, never giving them their own header/row),
    // so their dispatched status has to follow the PERSONALIZED kit's own progress instead
    // of a (nonexistent) independent kitDispatch/qtyDispatched entry for themselves.
    // Same legacy-field gap as the Emergency Order banner (order.kitOverallQty is 0 for
    // orders saved with kitOrders instead of the old single-kit field) — prefer the
    // personalized kitOrders entry's own overallQty before falling back.
    const personalizedKo = (linkedOrder?.kitOrders || []).find((ko) => ko && (ko.category || 'separate_kit') === 'personalized');
    const fullPersQty = Number(personalizedKo?.overallQty) || Number(linkedOrder?.kitOverallQty) || 0;
    const isPersonalizedDispatched = isKitDispatched(personalizedKo?.kitId);
    const includedIdSet = new Set((() => {
      const piRaw = linkedOrder?.packagingIncludes || [];
      return (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null)
        ? piRaw.map((p) => String(p.id))
        : piRaw.map((id) => String(id));
    })());

    // How much of the Personalized Kit itself is actually being dispatched this round vs
    // the order's full personalized count — everything bundled inside it (kits AND
    // standalone products referenced in packagingIncludes) scales down by this same ratio.
    // e.g. 15 of the order's 20 personalized kits shipping now means only 15 (not the full
    // 20) of whatever's bundled inside each one goes out with them.
    const scaledPersQty = filterVerified ? dispatchedOrPendingQtyForKit(personalizedKo?.kitId) : fullPersQty;
    const bundleScaleRatio = filterVerified && fullPersQty > 0 ? (scaledPersQty / fullPersQty) : 1;
    const scaleByBundleRatio = (q) => Math.max(0, Math.round((Number(q) || 0) * bundleScaleRatio));

    if (filterVerified) {
      // A row bundled inside the Personalized Kit (its id/name is listed in
      // packagingIncludes) rides on the PERSONALIZED kit's own dispatch status when it has
      // no independent tracking of its own; it's also kept if it DOES have independent
      // progress (kitDispatch for a kit, qtyDispatched/Dispatch Now for a standalone item).
      const isProductDispatched = (p) => {
        const nm = p.name || p.itemName || '';
        const ownDispatched = p.kitId ? isKitDispatched(p.kitId) : isNamedItemDispatched(nm);
        const bundled = (p.kitId && includedIdSet.has(String(p.kitId))) || (nm && includedIdSet.has(nm));
        return ownDispatched || (bundled && isPersonalizedDispatched);
      };
      // A partial dispatch must bill only the qty actually going out THIS round, not the
      // order's full qty — e.g. a Separate Kit ordered at 10 units with "Dispatch Now" = 5
      // must price at unit rate × 5, the same way the Personalized kit's own overall qty
      // is already scaled via effectiveKitOverallQty below (mirrors Billing's per-unit rate,
      // just against the dispatched count instead of the full order count).
      const filteredProds = srcProds.filter(isProductDispatched).map((p) => {
        // Kit COMPONENT rows (p.kitId set) carry a PER-KIT quantity, not a total — scaling
        // the kit CONTAINER's overallQty below already scales their displayed total qty.
        if (p.kitId) return p;
        const nm = p.name || p.itemName || '';
        const ownDispatchQty = dispatchedOrPendingQtyForItem(dispatchItemByName.get(nm.toLowerCase()));
        if (ownDispatchQty > 0) return { ...p, qty: ownDispatchQty };
        // No independent dispatch tracking of its own (fully bundled into the Personalized
        // Kit) — scale its base qty by the same ratio as the bundled/consumed count below,
        // so a partial personalized round doesn't leave a phantom "remaining" balance.
        if (nm && includedIdSet.has(nm) && bundleScaleRatio !== 1) return { ...p, qty: scaleByBundleRatio(p.qty) };
        return p;
      });
      srcKitOrders = srcKitOrders
        .filter((ko) => {
          if (!ko.kitId) return true;
          const bundled = includedIdSet.has(String(ko.kitId));
          return isKitDispatched(ko.kitId) || (bundled && isPersonalizedDispatched);
        })
        .map((ko) => {
          // The Personalized bundle's own count is scaled separately via
          // effectiveKitOverallQty just below — leave its kitOrders entry untouched here.
          if (!ko.kitId || (ko.category || 'separate_kit') === 'personalized') return ko;
          const ownDispatchQty = dispatchedOrPendingQtyForKit(ko.kitId);
          if (ownDispatchQty > 0) return { ...ko, overallQty: ownDispatchQty };
          if (includedIdSet.has(String(ko.kitId)) && bundleScaleRatio !== 1) {
            return { ...ko, overallQty: scaleByBundleRatio(ko.overallQty) };
          }
          return ko;
        });
      srcProds = filteredProds;
    }

    // The personalized kit's OWN overall qty (kitOverallQty) and its packagingIncludes list
    // feed computePersonalizedComposition's "outer packaging" and "included kit/product" totals
    // DIRECTLY — independent of the products/kitOrders arrays just filtered above — so without
    // scaling these too, the dispatched-only invoice kept showing the FULL personalized-kit qty
    // (and everything packed inside it) even when only part (or none) of it had been dispatched.
    let effectiveKitOverallQty = scaledPersQty;
    let effectivePackagingIncludes = linkedOrder?.packagingIncludes || [];
    if (filterVerified) {
      // packagingIncludes can reference either a kit id or a (separate) product name — any
      // id/name listed here rides on the Personalized kit's own dispatch status (it has no
      // independent tracking of its own once bundled), same as isProductDispatched above.
      const isIncludedTargetDispatched = (idOrName) => isKitDispatched(idOrName) || isNamedItemDispatched(idOrName) || isPersonalizedDispatched;
      const piRaw = linkedOrder?.packagingIncludes || [];
      effectivePackagingIncludes = (piRaw.length && typeof piRaw[0] === 'object' && piRaw[0] !== null)
        ? piRaw.filter((p) => isIncludedTargetDispatched(p.id))
        : piRaw.filter((pid) => isIncludedTargetDispatched(pid));
    }

    // Shared composition input — reused for both the display composition (below) and the
    // live grand total (next), so both are always computed from the exact same item set.
    const compositionRec = {
      products: srcProds,
      kitOrders: srcKitOrders,
      kitPrice: linkedOrder?.kitPrice,
      kitOverallQty: effectiveKitOverallQty,
      packagingIncludes: effectivePackagingIncludes,
      packagingIncludesQty: linkedOrder?.packagingIncludesQty || {},
      forwardingCharge: order?.forwardingCharge || false,
      forwardingChargeAmount: order?.forwardingChargeAmount || 0,
      paymentCollection: linkedOrder?.paymentCollection || [],
    };

    // Pre-built personalized composition (outer packaging folded into Section A's total,
    // included kits/products broken out, remaining in B/C) so the printed invoice matches the
    // Billing invoice exactly. Null when there is no personalized packaging → flat fallback.
    // bundleScaleRatio proportionally scales every bundled kit/product's consumed qty to
    // match how much of the Personalized Kit is actually going out this round (1 = no
    // scaling, e.g. for the Print Full Invoice / Billing's own always-full-order total).
    const composition = buildDocComposition(compositionRec, kits, bundleScaleRatio);
    // Live kit-aware grand total for this exact item set — mirrors Billing's own total
    // calculation instead of trusting Invoice.total, which is frozen at invoice-creation
    // time and drifts once kit prices are edited or (for the dispatched-only print) once
    // only a subset of the order's items are actually going out. Falls back to the stored
    // invoice total only when there's no product/kit data to compute from at all.
    const liveTotal = computeCompositionGrandTotal(compositionRec, kits, bundleScaleRatio);

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
      total: liveTotal > 0 ? liveTotal : (inv.total || 0),
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

  // filterVerified=true → "Print Invoice" / "Print Combined Invoice" (only products/kits
  // actually dispatched so far). filterVerified=false → "Print Full Invoice" (every order
  // item, available once fully dispatched, regardless of progress).
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

  // "Print Current Dispatch Invoice" — shows ONLY the products/kits + qty being entered into
  // "Dispatch Now" on THIS visit (current time), excluding anything already confirmed in
  // earlier rounds. Reuses the exact same invoice template/composition math as the other two
  // buttons (via buildInvoiceData's roundOnly flag) so it can't drift from their totals; those
  // two buttons and their behavior are untouched.
  const handlePrintCurrentDispatchInvoice = async () => {
    if (totalDispatchNow === 0) {
      enqueueSnackbar('Enter a Dispatch Now count for at least one row before printing this round\'s invoice.', { variant: 'warning' });
      return;
    }
    const rawInvoices = orderInvoicesData?.data || [];
    if (rawInvoices.length === 0) {
      enqueueSnackbar('No invoice found for this order. Please create one from the Billing page.', { variant: 'warning' });
      return;
    }
    const invoiceData = await buildInvoiceData(rawInvoices[0], true, true);
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
      // Secondary/landline contacts aren't denormalized onto the order — only the lead
      // carries them (altNumber = alternative/secondary, landlineNumber = landline).
      secondaryPhone: lead.altNumber || '',
      landlineNumber: lead.landlineNumber || '',
      product: derivedProduct, qty: derivedQty,
      boxes: d.boxes || 0, weight: d.weight || '',
      basePaymentConfirmed,
      emergencyApproved,
      reallyPaymentConfirmed,
      // Dual-approval (Sales + Operations) for LR fields other than Weight/Transport
      // Name — e.g. Packages/Boxes or Destination scanned off the lorry receipt not
      // matching what was manually entered. See requestLrMismatchApproval below.
      lrMismatchStatus: o.dispatchLrMismatchStatus || 'none',
      lrMismatchReason: o.dispatchLrMismatchReason || '',
      lrMismatchFields: o.dispatchLrMismatchFields || [],
      lrMismatchSalesApproved: !!o.dispatchLrMismatchSalesApproved,
      lrMismatchOpsApproved: !!o.dispatchLrMismatchOpsApproved,
      // General invoice/LR mismatch reason (single Sales-only approval) — replaces the
      // old self-service "Edit Details" toggle. See requestInvoiceMismatchApproval below.
      invoiceMismatchStatus: o.dispatchInvoiceMismatchStatus || 'none',
      invoiceMismatchReason: o.dispatchInvoiceMismatchReason || '',
      invoiceMismatchDecisionNote: o.dispatchInvoiceMismatchDecisionNote || '',
      invoiceMismatchAwaitingReupload: !!o.dispatchInvoiceMismatchAwaitingReupload,
      isCredit,
      creditDueDate: o.paymentReminderDate || o.creditDueDate || null,
      payment: isCredit ? 'Credit' : (isSample ? 'N/A' : (livePayStatus === 'Paid' ? 'Confirmed' : livePayStatus === 'Partial' ? 'Partial' : (emergencyApproved ? 'Emergency Approved' : (basePaymentConfirmed ? 'Confirmed' : 'Pending')))),
      destination: o.destination || lead.destination || '',
      expectedDeliveryDate: o.expectedDeliveryDate || lead.expectedDeliveryDate || null,
      detailedAddress: o.detailedAddress || lead.detailedAddress || lead.address || '',
      city: o.city || lead.city || '', state: o.state || lead.state || '', pincode: o.pincode || lead.pincode || '',
      // Shipping address — falls back to the billing address when no distinct shipping
      // address was captured, so older orders/leads render unchanged.
      shippingAddress: o.shippingAddress || o.detailedAddress || lead.shippingAddress || lead.detailedAddress || lead.address || '',
      shippingCity: o.shippingCity || o.city || lead.shippingCity || lead.city || '',
      shippingState: o.shippingState || o.state || lead.shippingState || lead.state || '',
      shippingPincode: o.shippingPincode || o.pincode || lead.shippingPincode || lead.pincode || '',
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
      // Sales' "Select Kit(s) to Include" physical packing instruction — which separate
      // kit(s)/product(s) are packed inside the personalized kit's own box. Consumed by
      // dispatchGrouping.js to nest those under the Personalized Kit header instead of
      // showing them as their own Separate Kit/Product row.
      packagingIncludes: o.packagingIncludes || [],
      // How much of each packagingIncludes-listed row is actually packed inside the
      // personalized kit (vs. the rest shipping as its own standalone Separate
      // Kit/Product) — see emergencyByTarget below, which needs this to avoid marking a
      // bundled item's FULL order qty emergency when only its bundled portion is.
      packagingIncludesQty: o.packagingIncludesQty || {},
      // Per-kit dispatch progress (overallQty/dispatchedQty/photos per kit, dispatched
      // as one unit) — see dispatchGrouping.js.
      kitDispatch: d.kitDispatch || [],
      // Order-level packing Tasks (productIndex/taskType/assignedTo) — lets the
      // verification table below disable rows nobody's been assigned to pack yet.
      tasks: d.tasks || [],
      // Emergency split — same source Operations reads (splitDates), used here to badge
      // which product/kit rows are emergency and to gate the Partial → Full dispatch flow.
      isEmergency: !!(o.isEmergency || lead.isEmergency),
      splitDates: o.splitDates || lead.splitDates || [],
      // A personalized kit's own count (e.g. "25 kits") — the split-date option "Kit (All
      // Products)" is stored as product '__kit__' and its qty is measured against THIS, not
      // against the kit's individual component item quantities (those are per-kit amounts).
      // Prefer the matching kitOrders entry's overallQty (current multi-kit source of truth,
      // same pattern deductInventoryForOrder/computeRecordBuckets use) and only fall back to
      // the legacy order-level kitOverallQty field for pre-kitOrders records — reading
      // o.kitOverallQty alone left this at 0 for every order saved with kitOrders instead,
      // which is what made the Emergency Order banner show "N of 0 units".
      kitOverallQty: (() => {
        const kitOrdersList = Array.isArray(o.kitOrders) ? o.kitOrders : [];
        const personalizedKo = kitOrdersList.find((ko) => ko && ko.category === 'personalized') || kitOrdersList[0];
        return Number(personalizedKo?.overallQty) || Number(o.kitOverallQty) || 0;
      })(),
      storedPartialDispatchConfirmed: !!d.partialDispatchConfirmed,
      storedPartialDispatchAt: d.partialDispatchAt || null,
      // Whether the CURRENT round (partial or full) already had its Finished Dispatch
      // (LR/notify) step done — server resets this on every fresh confirm round.
      storedLastRoundFinished: !!d.lastRoundFinished,
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
      // Full trail of every confirm round that actually dispatched something — each entry
      // is frozen at the time it happened (transport/weight/boxes for THAT round), unlike
      // the top-level transportName/weight/boxes fields which get overwritten each round.
      dispatchHistory: d.dispatchHistory || [],
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

  // Emergency split, keyed per target (lowercase product name, the literal '__kit__'
  // composite key for the Personalized Kit header, or `__sepkit__:<kitId>` for a standalone
  // Separate Kit header) → { emergencyQty, totalQty }. '__kit__' is measured against the
  // personalized kit's OWN overall qty (order.kitOverallQty, e.g. "25 kits"), never against
  // its component items' qty — Paste/Brush carry a PER-KIT quantity (e.g. 1 each), not the
  // kit's own count.
  //
  // Sales' emergency dropdown (buildEmergencySelectionOptions, Sales/index.jsx) saves
  // '__personalized__' / '__sepkit__:<kitId>' as the splitDate's product value (the legacy
  // '__kit__' sentinel is only still interpreted for records saved before that rename). Both
  // are EXPANDED here into their real component/bundled-row entries too (Paste/Brush, and
  // any Separate Product/Kit partially packed into the personalized kit via
  // packagingIncludes) so each of THOSE rows also gets the right badge, not just the kit
  // header. A bundled row's contribution is capped at packagingIncludesQty (the bundled
  // portion) rather than its full order qty — a Separate Product ordered at 20 with only 5
  // packed into the kit must show 5, not 20, as emergency purely because the kit bundling
  // it is fully emergency (mirrors the Operations/data.js getEmergencyProductQtyMap fix for
  // the same bug). `map.topLevelKeys` marks which entries are RAW splitDates targets (as
  // opposed to ones produced by this expansion) so the page-level emergency-units banner
  // below can sum only those — otherwise a kit header and the components it expands into
  // would double-count the same physical units.
  const emergencyByTarget = useMemo(() => {
    const map = new Map();
    const topLevelKeys = new Set();
    const rawItems = order?.orderRawItems || [];

    const kitCfgById = new Map((order?.kitOrders || []).filter((k) => k?.kitId).map((k) => [String(k.kitId), k]));
    const includeSet = new Set((order?.packagingIncludes || []).map(String));
    const piQty = order?.packagingIncludesQty || {};
    const isBundled = (it) => includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName || it.product));
    const bundledQtyFor = (it) => {
      const key = it.kitId ? String(it.kitId) : String(it.name || it.itemName || it.product);
      return includeSet.has(key) ? (Number(piQty[key]) || 0) : null;
    };
    const resolveKitCount = (it) => Number(kitCfgById.get(String(it.kitId))?.overallQty) || Number(order?.kitOverallQty) || 0;
    const effectiveQty = (it) => {
      if (!(it.isKit || it.kitType)) return Number(it.qty) || 0;
      const perUnit = Number(it.qty) || 0;
      const count = resolveKitCount(it);
      return count > 0 ? perUnit * count : (Number(it.overallQty) || perUnit || 0);
    };

    // Name -> TRUE total qty (not the per-kit ratio a kit component's own `.qty` stores) —
    // must use effectiveQty here, or a component like Brush (2/kit) shows totalQty=2 instead
    // of its real 10-of-10-kits total, making its informational badge read as "5 of 2".
    const itemQtyByName = new Map();
    rawItems.forEach((it) => {
      const key = (it.product || it.itemName || it.name || '').toLowerCase();
      if (key) itemQtyByName.set(key, (itemQtyByName.get(key) || 0) + effectiveQty(it));
    });

    const addToMap = (key, qty, total) => {
      const existing = map.get(key) || { emergencyQty: 0, totalQty: total };
      existing.emergencyQty += Number(qty) || 0;
      map.set(key, existing);
    };

    const expandGroup = (items, groupTotalQty, kitEmergencyQty, qtyResolver) => {
      const resolveQty = qtyResolver || effectiveQty;
      if (!items.length || !groupTotalQty || kitEmergencyQty == null) return;
      items.forEach((it) => {
        const key = (it.product || it.itemName || it.name || '').toLowerCase();
        if (!key) return;
        const itemQty = resolveQty(it);
        const qty = Math.min(Math.round((kitEmergencyQty / groupTotalQty) * itemQty), itemQty);
        addToMap(key, qty, itemQtyByName.get(key) || itemQty);
      });
    };

    const expandPersonalized = (kitEmergencyQty) => {
      topLevelKeys.add('__kit__');
      addToMap('__kit__', kitEmergencyQty, order?.kitOverallQty || 0);
      const items = rawItems.filter((it) => it.category === 'personalized' || isBundled(it));
      const kitItems = items.filter((it) => it.isKit || it.kitType);
      const groupTotalQty = kitItems.length ? Math.max(...kitItems.map(resolveKitCount)) : (Number(order?.kitOverallQty) || 0);
      const qtyResolver = (it) => {
        if (it.category !== 'personalized') {
          const bundled = bundledQtyFor(it);
          if (bundled != null) return bundled;
        }
        return effectiveQty(it);
      };
      expandGroup(items, groupTotalQty, kitEmergencyQty, qtyResolver);
    };

    const expandSeparateKit = (kitKey, kitEmergencyQty) => {
      const items = rawItems.filter((it) => !isBundled(it) && String(it.kitId || it.kitName || it.kitType) === kitKey);
      const groupTotalQty = items.length ? Math.max(...items.map(resolveKitCount)) : 0;
      topLevelKeys.add(`__sepkit__:${kitKey}`);
      addToMap(`__sepkit__:${kitKey}`, kitEmergencyQty, groupTotalQty);
      expandGroup(items, groupTotalQty, kitEmergencyQty);
    };

    const handleEntry = (product, qty) => {
      if (!product) return;
      if (product === '__kit__' || product === '__personalized__') { expandPersonalized(qty); return; }
      if (typeof product === 'string' && product.startsWith('__sepkit__:')) {
        expandSeparateKit(product.slice('__sepkit__:'.length), qty);
        return;
      }
      const key = product.toLowerCase();
      topLevelKeys.add(key);
      addToMap(key, qty, itemQtyByName.get(key) || 0);
    };

    (order?.splitDates || []).forEach((sd) => {
      const productList = (sd.products && sd.products.length > 0)
        ? sd.products
        : (sd.product ? [{ product: sd.product, qty: sd.qty }] : []);
      productList.forEach((p) => handleEntry(p.product, p.qty != null ? Number(p.qty) : null));
    });
    map.topLevelKeys = topLevelKeys;
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
      invoiceNumber: order.storedInvoiceNumber || '',
    });

    // A prior Partial Dispatch checkpoint was already confirmed — keep the Confirm
    // button active so the remaining pending counts can go out as the final round.
    if (order.storedPartialDispatchConfirmed) {
      setPartialConfirmed(true);
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
          trackingUrl: order.storedTrackingUrl,
        });
      }
    }

    // Finished dispatch state — lastRoundFinished tracks whether the CURRENT round
    // (partial or full) already had its LR/notify step done; a fresh confirm round
    // resets it server-side, so this always reflects only the latest round.
    if (order.storedLastRoundFinished) {
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

  // Dispatch verification state — how many units of each dispatchable row (kit header or
  // separate-product row) the dispatcher is sending THIS round, keyed by row key. Reset
  // after each confirm so the next round starts from the freshly-refetched pending counts.
  const [dispatchNowCounts, setDispatchNowCounts] = useState({});
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
  const [finishedDispatch, setFinishedDispatch] = useState(false);
  const [lrMismatchReasonInput, setLrMismatchReasonInput] = useState('');
  const [submittingLrMismatch, setSubmittingLrMismatch] = useState(false);
  const [showInvoiceMismatchBox, setShowInvoiceMismatchBox] = useState(false);
  const [invoiceMismatchReasonInput, setInvoiceMismatchReasonInput] = useState('');
  const [submittingInvoiceMismatch, setSubmittingInvoiceMismatch] = useState(false);
  // Which contact number(s) to include on the printed Dispatch Details — defaults to
  // Primary only so existing prints stay unchanged unless the user opts into more.
  const [printContactTypes, setPrintContactTypes] = useState(['primary']);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#161622' : '#fafbff';

  // How many units of `row` are entered to go out this round, clamped to its pending qty.
  const setDispatchNow = (row, value) => {
    const pending = getRowPendingQty(row);
    const clamped = Math.max(0, Math.min(Number(value) || 0, pending));
    setDispatchNowCounts((prev) => ({ ...prev, [row.key]: clamped }));
  };

  const handlePrintDispatchDetails = () => {
    if (!order) return;
    // Before dispatch is confirmed, Transport/Weight only live in the form (liveTransport/
    // liveWeight) — order.transport/order.weight stay blank until the confirm submit
    // persists them to the DispatchRecord. Mirror the same fallback the on-page
    // Descriptions above already use so the print reflects what's currently entered.
    const printTransport = liveTransport || order.storedTransportName || order.transport || '—';
    const printWeight = liveWeight || order.storedWeight || order.weight || '—';
    // Build the Phone cell from whichever contact number(s) the user picked in the
    // Contact Numbers dropdown — falls back to Primary alone if nothing resolved.
    const contactOptions = [
      { key: 'primary', label: 'Primary', value: order.phone },
      { key: 'secondary', label: 'Secondary', value: order.secondaryPhone },
      { key: 'landline', label: 'Landline', value: order.landlineNumber },
    ];
    const selectedContacts = contactOptions.filter((c) => printContactTypes.includes(c.key));
    const printPhone = selectedContacts.length
      ? selectedContacts.map((c) => `${c.label}: ${c.value || '—'}`).join('<br/>')
      : (order.phone || '—');
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
  <tr><th>Phone</th><td>${printPhone}</td><th>Email</th><td>${order.email}</td></tr>
  <tr><th>Destination</th><td>${order.destination || '—'}</td><th>Expected Delivery</th><td>${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td></tr>
  <tr><th>Address</th><td colspan="3">${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} — ${order.shippingPincode}</td></tr>
  <tr><th>Product</th><td>${order.product || '—'}</td><th>Weight</th><td>${printWeight}</td></tr>
  <tr><th>Transport</th><td>${printTransport}</td><th>Sales Person</th><td>${order.salesPerson || '—'}</td></tr>
  <tr><th>Payment</th><td>${order.payment}</td><th>Status</th><td>${order.status}</td></tr>
</table>
</body></html>`);
    win.document.close();
    win.print();
  };

  const executeConfirmDispatch = async () => {
    enqueueSnackbar('Confirming dispatch...', { variant: 'info' });
    try {
      // The real invoice number/date live on the Billing invoice already linked to this
      // order (shown as the green tag next to "Invoice" below) — there's no separate
      // "Invoice Number" input on this form, so pull it from there rather than a form
      // field that doesn't exist (which used to silently send '' and left the Transport
      // tab's Invoice No. column blank for every dispatch).
      const rawInvoices = orderInvoicesData?.data || [];
      const linkedInvoice = rawInvoices[0];

      // This round's billed invoice value — unit rate × the qty actually being dispatched
      // NOW (the same kit/GST-aware composition Print Invoice uses), computed here so the
      // backend can store it on the DispatchRecord.dispatchHistory entry it's about to
      // create for this round, instead of only ever knowing the order's final total. When
      // this round completes the order, also compute the FULL (unfiltered) order total so
      // the backend can reconcile the linked Invoice's stored total to match Billing exactly.
      let roundInvoiceSnapshot = null;
      let finalInvoiceSnapshot = null;
      if (linkedInvoice) {
        try {
          roundInvoiceSnapshot = await buildInvoiceData(linkedInvoice, true);
          if (willFullyComplete) {
            finalInvoiceSnapshot = await buildInvoiceData(linkedInvoice, false);
          }
        } catch {
          // Best-effort — a snapshot failure must not block the confirm itself.
        }
      }

      // WhatsApp checkbox is on: the "Dispatch Notify" template requires a document
      // header, so generate the Billing invoice as a PDF and upload it first — the
      // resulting URL rides along on the confirm request as invoiceDocumentUrl.
      let invoiceDocumentUrl = '';
      let invoiceDocumentFilename = '';
      if (notifyWhatsApp) {
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
      // Counts entered this round for each dispatchable row — kits (dispatched as one
      // unit) and separate products. The backend clamps/recomputes everything itself and
      // decides Full vs Partial from actual progress, not this label.
      const kitCounts = products
        .filter((p) => p.type === 'kit_header' && p.kitDispatchId)
        .map((p) => ({ id: p.kitDispatchId, dispatchNow: dispatchNowCounts[p.key] || 0 }))
        .filter((c) => c.dispatchNow > 0);
      const productCounts = products
        .filter((p) => p.type === 'product' && p.itemId)
        .map((p) => ({ id: p.itemId, dispatchNow: dispatchNowCounts[p.key] || 0 }))
        .filter((c) => c.dispatchNow > 0);
      formData.append('kitCounts', JSON.stringify(kitCounts));
      formData.append('productCounts', JSON.stringify(productCounts));
      formData.append('dispatchType', willFullyComplete ? 'Full Dispatch' : 'Partial Dispatch');
      formData.append('invoiceNumber', linkedInvoice?.invoiceNumber || order.storedInvoiceNumber || '');
      // Persist a forwarding-charge override raised here — otherwise the edit only
      // lives in local state and reverts to the original amount on reload.
      if (order.forwardingCharge) formData.append('forwardingChargeAmount', effectiveFwdAmount);
      if (linkedInvoice?.invoiceDate) formData.append('invoiceDate', new Date(linkedInvoice.invoiceDate).toISOString().slice(0, 10));
      if (roundInvoiceSnapshot) {
        formData.append('invoiceSubtotal', roundInvoiceSnapshot.taxableAmount || 0);
        formData.append('invoiceGst', roundInvoiceSnapshot.gst || 0);
        formData.append('invoiceTotal', roundInvoiceSnapshot.total || 0);
      }
      if (finalInvoiceSnapshot) {
        formData.append('finalInvoiceSubtotal', finalInvoiceSnapshot.taxableAmount || 0);
        formData.append('finalInvoiceGst', finalInvoiceSnapshot.gst || 0);
        formData.append('finalInvoiceTotal', finalInvoiceSnapshot.total || 0);
      }
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
      setDispatchNowCounts({});
      // A brand-new round was just confirmed (partial or full) — it needs its own
      // Finished Dispatch (LR/notify) step, even if a previous round already did theirs.
      setFinishedDispatch(false);
      if (result?.partial) {
        // This round didn't cover everything — keep the button active so the
        // remaining pending counts can go out as a later, final confirm.
        setPartialConfirmed(true);
        enqueueSnackbar('Partial Dispatch confirmed. You can now send the Partial Finished notification below, or continue confirming the remaining items.', { variant: 'success' });
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

  // Both partial and full dispatch go through this confirmation gate before
  // executeConfirmDispatch actually fires the mutation — dispatching is hard to undo
  // (stock/tasks/notifications all follow it), so the dispatcher gets one explicit
  // "are you sure" listing exactly what's going out this round.
  const handleConfirmDispatch = () => {
    const isFull = willFullyComplete;
    Modal.confirm({
      title: isFull ? 'Confirm Full Dispatch' : 'Confirm Partial Dispatch',
      icon: <CarOutlined style={{ color: '#B11E6A' }} />,
      width: 480,
      content: (
        <div>
          <Text>
            {isFull
              ? 'This will dispatch the remaining quantity and mark the order fully dispatched.'
              : 'This will dispatch only part of the order — the rest stays pending for a later round.'}
          </Text>
          <div style={{ marginTop: 12, background: 'rgba(177,30,106,0.06)', borderRadius: 8, padding: '8px 12px' }}>
            {rowsBeingDispatchedNow.map((p) => (
              <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                <span>{p.name || p.kitName || 'Item'}</span>
                <strong>{dispatchNowCounts[p.key] || 0}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(177,30,106,0.15)' }}>
              <span>Total this round</span>
              <span>{totalDispatchNow}</span>
            </div>
          </div>
        </div>
      ),
      okText: isFull ? 'Confirm Full Dispatch' : 'Confirm Partial Dispatch',
      okButtonProps: { style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } },
      cancelText: 'Cancel',
      onOk: executeConfirmDispatch,
    });
  };

  const handleSaveDraft = async () => {
    try {
      const vals = form.getFieldsValue();
      const lrVals = lrForm.getFieldsValue();
      const trackVals = trackingForm.getFieldsValue();
      const lrFileUrl = lrFileList?.[0]?.url || lrFileList?.[0]?.response?.url || undefined;
      // Same reasoning as handleConfirmDispatch — there's no "Invoice Number" form field,
      // so pull it from the Billing invoice already linked to this order.
      const linkedInvoice = orderInvoicesData?.data?.[0];
      await saveAsDraft({
        id,
        dispatchType: order.storedDispatchType || undefined,
        invoiceNumber: linkedInvoice?.invoiceNumber || order.storedInvoiceNumber || undefined,
        invoiceDate: linkedInvoice?.invoiceDate ? new Date(linkedInvoice.invoiceDate).toISOString().slice(0, 10) : undefined,
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

  const handleAIParse = async () => {
    const lrFile = lrFileList?.[0];
    const fileUrl = lrFile?.url || lrFile?.response?.url;
    if (!fileUrl) {
      enqueueSnackbar('Upload a lorry receipt first.', { variant: 'warning' });
      return;
    }
    setAiParsing(true);
    try {
      const res = await scanDispatchLR({
        id,
        fileUrl,
        mimetype: lrFile.type || lrFile.originFileObj?.type,
        originalName: lrFile.name,
      }).unwrap();
      const parsed = res?.data || {};
      setAiParsed(parsed);
      lrForm.setFieldsValue(parsed);

      // Mirror the extracted LR number / tracking URL into the "Tracking via Lorry
      // Service" fields below, without clobbering anything already typed there.
      const trackVals = trackingForm.getFieldsValue();
      const trackingLR = parsed.lrNumber || trackVals.trackingLR || '';
      const trackingUrl = parsed.trackingUrl || trackVals.trackingUrl || '';
      trackingForm.setFieldsValue({ trackingLR, trackingUrl });

      // Transport name is the only LR field that requires sales sign-off on mismatch —
      // weight is intentionally not verified. Flag the order and notify the assigned
      // sales person so they can approve/reject from the Sales Orders tab; this never
      // blocks the dispatch flow either way.
      const expectedTransport = liveTransport || order.storedTransportName || order.transport || '';
      const scannedTransport = parsed.transportName || '';
      const expectedTransportNorm = normalizeForCompare(expectedTransport);
      const scannedTransportNorm = normalizeForCompare(scannedTransport);
      if (expectedTransportNorm && scannedTransportNorm
        && !scannedTransportNorm.includes(expectedTransportNorm)
        && !expectedTransportNorm.includes(scannedTransportNorm)) {
        try {
          await reportTransportMismatch({ id, expectedTransportName: expectedTransport, scannedTransportName: scannedTransport }).unwrap();
          enqueueSnackbar('Transport name mismatch detected — Sales has been notified to review.', { variant: 'warning' });
        } catch {
          // Non-critical — a failed notification shouldn't block reviewing the LR.
        }
      }

      // Persist right away so a page refresh — before "Save as Draft" or "Finished
      // Dispatch" is clicked — never loses what the AI just extracted.
      try {
        await saveAsDraft({
          id,
          lrNumber: trackingLR || undefined,
          trackingUrl: trackingUrl || undefined,
          lrFileUrl: fileUrl,
          lrDate: parsed.lrDate || undefined,
          transportName: parsed.transportName || undefined,
          fromCity: parsed.fromCity || undefined,
          toCity: parsed.toCity || undefined,
          weight: parsed.weight || undefined,
          freight: parsed.freight || undefined,
          packages: parsed.packages || undefined,
          estimatedDelivery: parsed.estimatedDelivery || undefined,
        }).unwrap();
        enqueueSnackbar('AI extracted lorry receipt details and saved. Review and confirm below.', { variant: 'success' });
      } catch {
        enqueueSnackbar('AI extracted lorry receipt details, but auto-save failed — click "Save as Draft" so they survive a refresh.', { variant: 'warning' });
      }
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'AI extraction failed. You can still fill details in manually.', { variant: 'error' });
    } finally {
      setAiParsing(false);
    }
  };

  // Fields other than Weight/Transport Name (Packages/Boxes, Destination) disagreeing
  // with the scanned LR require a reason + dual (Sales + Operations) sign-off before
  // Finished Dispatch is allowed — see otherFieldsMismatch/otherMismatchBlocked above.
  const handleRequestLrMismatchApproval = async () => {
    if (!lrMismatchReasonInput.trim()) {
      enqueueSnackbar('Enter a reason for the mismatch before requesting approval.', { variant: 'warning' });
      return;
    }
    setSubmittingLrMismatch(true);
    try {
      await requestLrMismatchApproval({
        id,
        reason: lrMismatchReasonInput.trim(),
        fields: otherMismatchFieldLabels,
        details: otherMismatchDetails,
      }).unwrap();
      enqueueSnackbar('Approval requested from Sales and Operations.', { variant: 'success' });
      setLrMismatchReasonInput('');
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to request approval.', { variant: 'error' });
    } finally {
      setSubmittingLrMismatch(false);
    }
  };

  // General invoice/LR mismatch — free-text reason for anything wrong with the scanned
  // invoice that doesn't fit the specific Transport/Packages/Destination checks above.
  // Sent only to this order's own assigned sales person; single approval unblocks the
  // Upload/AI-Parse controls again so the corrected invoice can be re-uploaded.
  const handleRequestInvoiceMismatchApproval = async () => {
    if (!invoiceMismatchReasonInput.trim()) {
      enqueueSnackbar('Enter a reason for the mismatch before sending to Sales.', { variant: 'warning' });
      return;
    }
    setSubmittingInvoiceMismatch(true);
    try {
      await requestInvoiceMismatchApproval({ id, reason: invoiceMismatchReasonInput.trim() }).unwrap();
      enqueueSnackbar(`Sent to ${order.salesPerson || 'Sales'} for approval.`, { variant: 'success' });
      setInvoiceMismatchReasonInput('');
      setShowInvoiceMismatchBox(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to send for approval.', { variant: 'error' });
    } finally {
      setSubmittingInvoiceMismatch(false);
    }
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
      const res = await uploadLR(payload).unwrap();
      setFinishedDispatch(true);
      const finishLabel = res?.finishedType || (dispatched ? 'Fully Finished' : 'Partial Finished');
      enqueueSnackbar(`${finishLabel}! Notifications sent to Sales (${order.salesPerson}) and Customer (${order.client}) via WhatsApp.`, { variant: 'success' });
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
  // `products` = dispatchable units — a Personalized/Separate Kit header counts as ONE
  // unit (one count, one photo pair); Separate Products are individual.
  // `groupedProducts` = all display rows including kit header + child item rows.
  const { products, groupedProducts } = buildDispatchGroupedProducts({
    items: order?.items,
    kitOrders: order?.kitOrders,
    orderItems: order?.orderRawItems,
    boxes: order?.boxes,
    kitDispatch: order?.kitDispatch,
    packagingIncludes: order?.packagingIncludes,
    packagingIncludesQty: order?.packagingIncludesQty,
    tasks: order?.tasks,
  });
  const verifySummary = summarizeDispatchVerification(products);

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

  // Emergency badges are informational only now — the dispatcher decides what count to
  // send each round via "Dispatch Now", not gated on which items are emergency-flagged.
  const emergencyProducts = products.filter((p) => !!getRowEmergency(p));

  // Gate: must be dispatching something this round, and every row being dispatched must
  // have its open+closed box photo(s) on file. No requirement on rows NOT being sent this
  // round — that's the "no restriction" behavior: partial rounds only need what's going out.
  const rowsBeingDispatchedNow = products.filter((p) => (dispatchNowCounts[p.key] || 0) > 0);
  const totalDispatchNow = rowsBeingDispatchedNow.reduce((s, p) => s + (dispatchNowCounts[p.key] || 0), 0);
  const dispatchingRowsHavePhotos = rowsBeingDispatchedNow.every((p) => (p.openBoxPhotos?.length || 0) > 0 && (p.closeBoxPhotos?.length || 0) > 0);
  const verificationGateSatisfied = totalDispatchNow > 0 && dispatchingRowsHavePhotos;

  // Whether this round's counts, added to what's already been dispatched, close out
  // every row — purely for display (the backend recomputes this authoritatively).
  const willFullyComplete = products.every((p) => (dispatchNowCounts[p.key] || 0) >= getRowPendingQty(p));

  // Exact emergency count for the page-level banner — summed directly from the RAW
  // splitDates targets only (emergencyByTarget.topLevelKeys), each target's total already
  // resolved to kitOverallQty for '__kit__'/'__personalized__' or the matching item's own
  // qty otherwise, so it can never under/over-count relative to what the "Urgent / Emergency
  // Deliveries (Partial)" card on the Order shows. emergencyByTarget also contains entries
  // produced by EXPANDING a kit target into its components/bundled rows (for per-row
  // badges) — summing those too would double-count the same physical units.
  let emergencyTotals = { emergencyQty: 0, totalQty: 0 };
  (emergencyByTarget.topLevelKeys || []).forEach((key) => {
    const v = emergencyByTarget.get(key);
    if (!v) return;
    emergencyTotals.emergencyQty += v.emergencyQty;
    emergencyTotals.totalQty += v.totalQty;
  });

  const lrUploaded = lrFileList.length > 0;

  // Cross-check the AI-parsed transport receipt's destination (toCity) against the
  // order/lead's own destination + shipping address — a mismatch usually means the
  // transporter shipped to (or the receipt was misread for) the wrong city, so it's
  // flagged loudly rather than silently trusting the AI extraction.
  const normalizeLoc = (s) => (s || '').toString().trim().toLowerCase().replace(/[.,]/g, '');
  const aiToCity = normalizeLoc(aiParsed?.toCity);
  const destinationCandidates = [order.destination, order.shippingCity, order.shippingState]
    .map(normalizeLoc)
    .filter(Boolean);
  const destinationMatch = (!aiToCity || destinationCandidates.length === 0)
    ? null
    : destinationCandidates.some((c) => c.includes(aiToCity) || aiToCity.includes(c));
  const orderDestinationLabel = order.destination
    || [order.shippingCity, order.shippingState].filter(Boolean).join(', ')
    || '—';

  // Cross-check the AI-parsed receipt's package count and weight against what was
  // manually entered in the Dispatch Verification form above — same intent as the
  // destination check: a mismatch usually means a typo (manual) or a misread (AI),
  // so it's flagged for review rather than silently trusted either way.
  const parseNumeric = (s) => {
    const m = String(s ?? '').match(/[\d,]+\.?\d*/);
    return m ? Number(m[0].replace(/,/g, '')) : null;
  };
  const aiPackagesNum = parseNumeric(aiParsed?.packages);
  const manualBoxesNum = parseNumeric(liveBoxes ?? order.storedBoxes ?? order.boxes);
  const boxesMatch = (aiPackagesNum == null || manualBoxesNum == null)
    ? null
    : aiPackagesNum === manualBoxesNum;

  // Weight is intentionally not cross-checked against the AI-scanned receipt — only
  // Transport Name requires verification (see below); a weight mismatch is no longer
  // flagged here.

  // Cross-check the AI-parsed receipt's transport name against what was manually entered.
  // A mismatch here doesn't block dispatch — it's flagged to the assigned sales person
  // (via reportTransportMismatch in handleAIParse) for approve/reject from the Sales
  // Orders tab.
  const aiTransportNorm = normalizeForCompare(aiParsed?.transportName);
  const manualTransportNorm = normalizeForCompare(liveTransport ?? order.storedTransportName ?? order.transport);
  const transportMatch = (!aiTransportNorm || !manualTransportNorm)
    ? null
    : (aiTransportNorm.includes(manualTransportNorm) || manualTransportNorm.includes(aiTransportNorm));

  // Any AI-scanned LR field OTHER than Weight/Transport Name (currently: Packages/Boxes,
  // Destination) that disagrees with what was manually entered requires a reason plus
  // BOTH Sales and Operations sign-off before Finished Dispatch is allowed — see
  // requestLrMismatchApproval / the "LR Mismatch Approval" card below. Re-uploading a
  // corrected LR that rescans clean clears this without needing any approval at all.
  const otherMismatchDetails = {};
  const otherMismatchFieldLabels = [];
  if (boxesMatch === false) {
    otherMismatchFieldLabels.push('Packages/Boxes');
    otherMismatchDetails.packages = { expected: manualBoxesNum, scanned: aiPackagesNum };
  }
  if (destinationMatch === false) {
    otherMismatchFieldLabels.push('Destination');
    otherMismatchDetails.destination = { expected: orderDestinationLabel, scanned: aiParsed?.toCity || '' };
  }
  const otherFieldsMismatch = otherMismatchFieldLabels.length > 0;
  const lrMismatchApproved = order.lrMismatchStatus === 'approved';
  const otherMismatchBlocked = otherFieldsMismatch && !lrMismatchApproved;

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
                <Descriptions.Item label="Expected Delivery">
                  {order.expectedDeliveryDate ? (
                    <Tag color={new Date(order.expectedDeliveryDate) < new Date().setHours(0, 0, 0, 0) ? 'red' : 'green'} style={{ fontWeight: 600 }}>
                      {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Tag>
                  ) : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <Space align="start">
                    <EnvironmentOutlined style={{ color: '#B11E6A', marginTop: 2 }} />
                    <span>{order.shippingAddress},<br />{order.shippingCity}, {order.shippingState} — {order.shippingPincode}</span>
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
                {partialConfirmed && !dispatched && (
                  <Text style={{ fontSize: 11, color: '#ff4d4f', display: 'block', marginBottom: 12 }}>
                    A Partial Dispatch checkpoint is already confirmed — enter the remaining counts below to finish this order.
                  </Text>
                )}

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

                {/* Product Details table — Personalized Kit / Separate Kit dispatch as ONE
                    unit (one count, one open/close photo pair); Separate Products are
                    dispatched — and photographed — individually. */}
                {products.length > 0 && (
                  <div style={{ marginBottom: 16, border: `1px solid #B11E6A33`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <Space size={8}>
                          <InboxOutlined style={{ color: '#B11E6A' }} />
                          <Text strong style={{ color: textColor }}>Product Details — {order.id}</Text>
                          <Tag color={verifySummary.overall.pending === 0 ? 'blue' : (willFullyComplete ? 'blue' : 'orange')} style={{ borderRadius: 12, fontSize: 11 }}>
                            {verifySummary.overall.pending === 0 && totalDispatchNow === 0
                              ? 'Fully Dispatched'
                              : (willFullyComplete ? 'Full Dispatch' : 'Partial Dispatch')}
                          </Tag>
                        </Space>
                        <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                          {verifySummary.overall.dispatched} / {verifySummary.overall.total} dispatched
                        </Text>
                      </div>
                      <Space size={6} wrap style={{ marginTop: 8 }}>
                        {[verifySummary.personalizedKit, verifySummary.separateKit, verifySummary.separateProduct]
                          .filter((b) => b.total > 0)
                          .map((b) => (
                            <Tag key={b.label} style={{ borderRadius: 12, fontSize: 11, background: 'transparent', border: '1px solid #B11E6A33', color: textColor }}>
                              {b.label}: {b.dispatched}/{b.total} ({b.pending} pending)
                            </Tag>
                          ))}
                      </Space>
                    </div>
                    {groupedProducts.some((r) => r.type === 'kit_header' && r.bucket && r.assigned === false) && (
                      <Alert
                        type="error"
                        showIcon
                        style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
                        message="Cannot dispatch — not every product has a packing task assigned yet"
                        description={groupedProducts
                          .filter((r) => r.type === 'kit_header' && r.bucket && r.assigned === false)
                          .map((r) => `${r.kitName}: ${r.unassignedNames?.length ? r.unassignedNames.join(', ') : 'no task assigned'}`)
                          .join(' • ')}
                      />
                    )}
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={groupedProducts}
                      style={{ borderRadius: 0 }}
                      // Rows with no assigned packing Task yet (row.assigned === false, set
                      // by buildDispatchGroupedProducts) render disabled — greyed out and
                      // inert — until Operations assigns someone to pack them.
                      onRow={(row) => (row.assigned === false ? { style: { opacity: 0.45, pointerEvents: 'none' } } : {})}
                      columns={[
                        {
                          title: 'Product / Kit',
                          dataIndex: 'name',
                          // Pure divider rows ("Separate Products" synthetic header, or a
                          // legacy no-kitOrders header) span the full row. Real dispatchable
                          // kit headers (row.bucket set) get their own Ordered/Dispatch Now/
                          // Photos cells like any other dispatchable row.
                          onCell: (row) => (row.type === 'kit_header' && !row.bucket ? { colSpan: 4 } : {}),
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
                                  {row.bucket && row.assigned === false && (
                                    <Tag color="error" style={{ borderRadius: 12, fontSize: 10 }}>
                                      {row.unassignedNames?.length
                                        ? `Not Assigned: ${row.unassignedNames.join(', ')}`
                                        : 'Task Not Assigned'}
                                    </Tag>
                                  )}
                                  {emergencyBadge}
                                </div>
                              );
                            }
                            // personalized_item or kit_item (display-only component rows) or product
                            return (
                              <Space size={4} wrap>
                                {(row.type === 'kit_item' || row.type === 'personalized_item') && (
                                  <span style={{ color: '#ccc', fontSize: 13, marginLeft: 8 }}>└</span>
                                )}
                                <Text style={{ fontSize: 12 }}>{v}</Text>
                                {row.perKitQty != null && (
                                  <Text style={{ fontSize: 10, color: '#bbb' }}>({row.perKitQty}/kit)</Text>
                                )}
                                {row.includedFrom && (
                                  <Tag style={{ borderRadius: 10, fontSize: 10, background: '#ede9fe', color: '#5b21b6', border: '1px solid #5b21b633' }}>
                                    {row.includedFrom}
                                  </Tag>
                                )}
                                {(row.bucket === 'separateProduct' || row.type === 'kit_item' || row.type === 'personalized_item') && row.assigned === false && (
                                  <Tag color="error" style={{ borderRadius: 10, fontSize: 10 }}>
                                    Not Assigned
                                  </Tag>
                                )}
                                {emergencyBadge}
                              </Space>
                            );
                          },
                        },
                        {
                          title: 'Ordered / Dispatched / Pending', key: 'progress',
                          onCell: (row) => (!row.bucket ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (!row.bucket) return null;
                            const total = row.overallQty ?? row.qtyOrdered ?? 0;
                            const done = row.dispatchedQty ?? row.qtyDispatched ?? 0;
                            const pending = getRowPendingQty(row);
                            return (
                              <Space direction="vertical" size={0}>
                                <Text style={{ fontSize: 12 }}>{done} / {total}</Text>
                                {pending === 0
                                  ? <Tag color="success" style={{ borderRadius: 20, fontSize: 11 }}>Fully Dispatched</Tag>
                                  : done > 0
                                  ? <Tag color="orange" style={{ borderRadius: 20, fontSize: 11 }}>Partial — {pending} pending</Tag>
                                  : <Tag color="default" style={{ borderRadius: 20, fontSize: 11 }}>Pending</Tag>}
                              </Space>
                            );
                          },
                        },
                        {
                          title: 'Dispatch Now', key: 'dispatchNow',
                          onCell: (row) => (!row.bucket ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (!row.bucket) return null;
                            const pending = getRowPendingQty(row);
                            return (
                              <InputNumber
                                size="small"
                                min={0}
                                max={pending}
                                value={dispatchNowCounts[row.key] || 0}
                                onChange={(v) => setDispatchNow(row, v)}
                                disabled={dispatched || pending === 0 || row.assigned === false}
                                style={{ width: 90 }}
                              />
                            );
                          },
                        },
                        {
                          title: 'Open / Closed Box Photos', key: 'photos',
                          onCell: (row) => (!row.bucket ? { colSpan: 0 } : {}),
                          render: (_, row) => {
                            if (!row.bucket) return null;
                            const isKitRow = row.type === 'kit_header';
                            const uploadFn = isKitRow ? makeKitBoxUpload(row.kitDispatchId, 'open') : makeItemBoxUpload(row.itemId, 'open');
                            const uploadFnClose = isKitRow ? makeKitBoxUpload(row.kitDispatchId, 'close') : makeItemBoxUpload(row.itemId, 'close');
                            const uploadKey = isKitRow ? `kit-${row.kitDispatchId}` : row.itemId;
                            const openPhotos = row.openBoxPhotos || [];
                            const closePhotos = row.closeBoxPhotos || [];
                            const openCount = openPhotos.length;
                            const closeCount = closePhotos.length;
                            // Shows every uploaded photo (not just the most recent) so the
                            // dispatcher can confirm all of them were captured, not only the
                            // last one — each thumbnail opens its own preview on click.
                            const thumb = (photos, color) => photos.length > 0 && (
                              <Space size={4} wrap>
                                {photos.map((url, i) => (
                                  <span key={`${url}-${i}`} style={{ position: 'relative', display: 'inline-flex', width: 28, height: 28 }}>
                                    <Image
                                      src={url}
                                      width={28}
                                      height={28}
                                      style={{ objectFit: 'cover', borderRadius: 4, border: `1px solid ${color}` }}
                                      preview={{ src: url }}
                                    />
                                    <CheckCircleFilled
                                      style={{
                                        position: 'absolute', bottom: -4, right: -4,
                                        color, background: '#fff', borderRadius: '50%', fontSize: 12,
                                      }}
                                    />
                                  </span>
                                ))}
                              </Space>
                            );
                            const openUploading = uploadingKeys.has(`${uploadKey}-open`);
                            const closeUploading = uploadingKeys.has(`${uploadKey}-close`);
                            const noKitTarget = isKitRow && !row.kitDispatchId;
                            // Selecting several files at once (Upload's `multiple`) fires
                            // beforeUpload synchronously for each file in the batch before any
                            // upload completes, so openCount/closeCount (only refreshed after a
                            // request resolves) can't by itself stop a single oversized batch
                            // from exceeding the cap — these per-render counters do, ticking
                            // down as each file in the batch is accepted.
                            let openRemaining = MAX_ROW_BOX_PHOTOS - openCount;
                            let closeRemaining = MAX_ROW_BOX_PHOTOS - closeCount;
                            const guardBeforeUpload = (getRemaining, setRemaining, label) => () => {
                              if (getRemaining() <= 0) {
                                enqueueSnackbar(`Up to ${MAX_ROW_BOX_PHOTOS} ${label} box photos allowed`, { variant: 'warning' });
                                return Upload.LIST_IGNORE;
                              }
                              setRemaining(getRemaining() - 1);
                              return true;
                            };
                            return (
                              <Space size={4} wrap>
                                <Upload
                                  showUploadList={false}
                                  accept="image/*"
                                  multiple
                                  beforeUpload={guardBeforeUpload(() => openRemaining, (v) => { openRemaining = v; }, 'open')}
                                  disabled={openCount >= MAX_ROW_BOX_PHOTOS || openUploading || noKitTarget || dispatched || row.assigned === false}
                                  customRequest={uploadFn}
                                >
                                  <Button size="small" icon={openUploading ? <LoadingOutlined spin /> : <CameraOutlined />}
                                    style={openCount > 0 ? { borderColor: '#52c41a', color: '#52c41a' } : undefined}
                                  >
                                    Open ({openCount}/{MAX_ROW_BOX_PHOTOS})
                                  </Button>
                                </Upload>
                                {thumb(openPhotos, '#52c41a')}
                                <Upload
                                  showUploadList={false}
                                  accept="image/*"
                                  multiple
                                  beforeUpload={guardBeforeUpload(() => closeRemaining, (v) => { closeRemaining = v; }, 'closed')}
                                  disabled={closeCount >= MAX_ROW_BOX_PHOTOS || closeUploading || noKitTarget || dispatched || row.assigned === false}
                                  customRequest={uploadFnClose}
                                >
                                  <Button size="small" icon={closeUploading ? <LoadingOutlined spin /> : <CameraOutlined />}
                                    style={closeCount > 0 ? { borderColor: '#52c41a', color: '#52c41a' } : undefined}
                                  >
                                    Closed ({closeCount}/{MAX_ROW_BOX_PHOTOS})
                                  </Button>
                                </Upload>
                                {thumb(closePhotos, '#1677ff')}
                              </Space>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Row: Transport, Weight, Boxes — moved below the Product Details table
                    (above Dispatch History) so the dispatcher fills these in only after
                    reviewing what's actually being dispatched. Dispatch Type is computed
                    from the per-row dispatch counts above, not a manual choice. */}
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
                </Row>

                {/* Dispatch History — every confirm round that actually sent something,
                    oldest→each round frozen at the time it happened (unlike the live
                    transportName/weight/boxes fields above, which get overwritten each
                    round). This is what lets a 1000-unit order split across many partial
                    rounds (e.g. 500 now, 500 later) be traced round by round, and is the
                    audit trail behind the Ordered/Dispatched/Pending numbers above. */}
                {order.dispatchHistory.length > 0 && (
                  <div style={{ marginBottom: 16, border: `1px solid #B11E6A33`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px' }}>
                      <Space size={8}>
                        <FileDoneOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>Dispatch History</Text>
                        <Tag style={{ borderRadius: 12, fontSize: 11 }}>{order.dispatchHistory.length} round{order.dispatchHistory.length !== 1 ? 's' : ''}</Tag>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      pagination={false}
                      rowKey={(r, i) => `${r.date}-${i}`}
                      dataSource={[...order.dispatchHistory].reverse()}
                      style={{ borderRadius: 0 }}
                      scroll={{ y: 360 }}
                      columns={[
                        {
                          title: 'Date', dataIndex: 'date', width: 150,
                          render: (v) => <Text style={{ fontSize: 12 }}>{v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</Text>,
                        },
                        {
                          title: 'Type', dataIndex: 'dispatchType', width: 110,
                          render: (v) => <Tag color={v === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12, fontSize: 11 }}>{v || '—'}</Tag>,
                        },
                        {
                          title: 'Dispatched', key: 'dispatched', width: 260,
                          render: (_, r) => {
                            // Round-trip thumbnails — openBoxPhotos/closeBoxPhotos here are a
                            // snapshot taken when THIS round was confirmed (see confirmDispatch),
                            // so they show exactly what evidence existed for this round even after
                            // later rounds add more photos to the live item/kit record. Every photo
                            // is shown (not just the last few) with visible gaps between thumbnails.
                            const roundThumbs = (photos, color) => (photos || []).length > 0 && (
                              <Space size={6} wrap style={{ marginTop: 2 }}>
                                {photos.map((url, i) => (
                                  <Image
                                    key={`${url}-${i}`}
                                    src={url}
                                    width={26}
                                    height={26}
                                    style={{ objectFit: 'cover', borderRadius: 4, border: `1px solid ${color}` }}
                                    preview={{ src: url }}
                                  />
                                ))}
                              </Space>
                            );
                            const photoGroup = (label, photos, color) => (photos || []).length > 0 && (
                              <div>
                                <Text style={{ fontSize: 10, color, display: 'block', marginBottom: 2 }}>{label} ({photos.length})</Text>
                                {roundThumbs(photos, color)}
                              </div>
                            );
                            return (
                              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                {(r.kits || []).map((k, i) => (
                                  <div key={`k-${i}`}>
                                    <Text style={{ fontSize: 12 }}>
                                      {k.category === 'personalized' ? 'Personalized Kit' : 'Separate Kit'} — {k.kitName}: <b>{k.dispatchedQty}</b>
                                    </Text>
                                    <Space size={16} wrap style={{ marginTop: 4 }}>
                                      {photoGroup('Open', k.openBoxPhotos, '#52c41a')}
                                      {photoGroup('Closed', k.closeBoxPhotos, '#1677ff')}
                                    </Space>
                                  </div>
                                ))}
                                {(r.products || []).map((p, i) => (
                                  <div key={`p-${i}`}>
                                    <Text style={{ fontSize: 12 }}>
                                      Product — {p.itemName}: <b>{p.dispatchedQty}</b>
                                    </Text>
                                    <Space size={16} wrap style={{ marginTop: 4 }}>
                                      {photoGroup('Open', p.openBoxPhotos, '#52c41a')}
                                      {photoGroup('Closed', p.closeBoxPhotos, '#1677ff')}
                                    </Space>
                                  </div>
                                ))}
                                {!(r.kits?.length || r.products?.length) && <Text type="secondary" style={{ fontSize: 12 }}>—</Text>}
                              </Space>
                            );
                          },
                        },
                        { title: 'Transport', dataIndex: 'transportName', width: 120, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
                        { title: 'Weight', dataIndex: 'weight', width: 90, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
                        { title: 'Boxes', dataIndex: 'boxes', width: 70, render: (v) => <Text style={{ fontSize: 12 }}>{v ?? '—'}</Text> },
                        { title: 'Confirmed By', dataIndex: 'confirmedByName', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
                        {
                          // finishedType/lrNumber are stamped by the "Finished Dispatch" LR/notify
                          // step (see uploadLR) onto whichever round was the latest at that time —
                          // so this shows whether/when THIS round's shipment actually went out.
                          title: 'Finished', key: 'finished', width: 150,
                          render: (_, r) => r.finishedType ? (
                            <Space direction="vertical" size={0}>
                              <Tag color={r.finishedType === 'Fully Finished' ? 'green' : 'gold'} style={{ borderRadius: 12, fontSize: 11 }}>{r.finishedType}</Tag>
                              {r.lrNumber && <Text style={{ fontSize: 11, color: '#999' }}>LR: {r.lrNumber}</Text>}
                            </Space>
                          ) : <Tag style={{ borderRadius: 12, fontSize: 11 }}>Not sent yet</Tag>,
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

                {/* All Closed Box Photos — order-level closed-box evidence, up to 20,
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
                    disabled={closeBoxCount >= 20 || uploadingKeys.has('order-close')}
                    beforeUpload={(file) => {
                      if (file.size > 5 * 1024 * 1024) {
                        enqueueSnackbar('Photo must be under 5 MB', { variant: 'error' });
                        return Upload.LIST_IGNORE;
                      }
                      return true;
                    }}
                    customRequest={makeBoxUpload()}
                  >
                    <Button icon={uploadingKeys.has('order-close') ? <LoadingOutlined spin /> : <CameraOutlined />}>
                      Upload Closed Box Photo ({closeBoxCount}/20)
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
                        Print Combined Invoice (Dispatched Only)
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
                      Print Invoice (Dispatched Only)
                    </Button>
                  )}
                  {/* Print Current Dispatch Invoice — this round's "Dispatch Now" qty only,
                      excluding anything already confirmed in earlier rounds. Independent of
                      the two buttons above, which are unchanged. */}
                  <Button
                    icon={<PrinterOutlined />}
                    block
                    disabled={totalDispatchNow === 0}
                    onClick={handlePrintCurrentDispatchInvoice}
                    style={{ borderColor: '#B11E6A55', color: '#B11E6A', fontWeight: 600, marginTop: 8 }}
                  >
                    Print Current Dispatch Invoice (This Round)
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
                  <Checkbox checked={notifyWhatsApp} onChange={(e) => setNotifyWhatsApp(e.target.checked)} style={{ color: textColor }}>
                    <WhatsAppOutlined style={{ color: '#25D366', marginRight: 4 }} />
                    Send WhatsApp notification to Sales person &amp; Customer (with invoice attached)
                  </Checkbox>
                </div>
              </Form>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {!dispatched && totalDispatchNow === 0 && (
                  <Text style={{ fontSize: 12, color: '#ff4d4f', marginRight: 'auto' }}>
                    Enter a Dispatch Now count for at least one row above.
                  </Text>
                )}
                {!dispatched && totalDispatchNow > 0 && !dispatchingRowsHavePhotos && (
                  <Text style={{ fontSize: 12, color: '#ff4d4f', marginRight: 'auto' }}>
                    Upload open &amp; closed box photos for everything you're dispatching this round.
                  </Text>
                )}
                {(!transportFilled || !weightFilled || !boxesFilled) && (
                  <Text style={{ fontSize: 12, color: '#ff4d4f', marginRight: 'auto' }}>
                    Enter Transport Name, Weight and Boxes above to enable dispatch confirmation.
                  </Text>
                )}
                <Select
                  mode="multiple"
                  value={printContactTypes}
                  onChange={setPrintContactTypes}
                  placeholder="Contact numbers to print"
                  style={{ minWidth: 220 }}
                  options={[
                    { label: 'Primary Contact', value: 'primary' },
                    { label: 'Secondary Contact', value: 'secondary' },
                    { label: 'Landline Contact', value: 'landline' },
                  ]}
                />
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
                    : willFullyComplete
                    ? (partialConfirmed ? 'Confirm Full Dispatch' : 'Confirm Dispatch')
                    : 'Confirm Partial Dispatch'}
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
                  disabled={order.invoiceMismatchStatus === 'pending'}
                  customRequest={makeUpload('dispatch/lr')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={({ fileList }) => {
                    setLrFileList(fileList);
                    if (fileList.length > 0 && !aiParsed) {
                      enqueueSnackbar('Lorry receipt uploaded. Click "AI Parse Receipt" to extract details automatically.', { variant: 'info' });
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />} block disabled={order.invoiceMismatchStatus === 'pending'} style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                    {order.invoiceMismatchAwaitingReupload ? 'Re-upload Corrected Lorry Receipt (PDF / Image)' : 'Upload Lorry Receipt (PDF / Image)'}
                  </Button>
                </Upload>
                {order.invoiceMismatchStatus === 'pending' && (
                  <Text style={{ fontSize: 11, color: '#fa8c16', display: 'block', marginTop: 6 }}>
                    Upload is disabled while your reported mismatch is awaiting Sales approval.
                  </Text>
                )}

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
                        disabled={order.invoiceMismatchStatus === 'pending'}
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
                            <CheckCircleOutlined style={{ marginRight: 4 }} />AI extracted details — review below
                          </Text>
                          {order.invoiceMismatchStatus === 'none' ? (
                            <Button
                              size="small"
                              danger={showInvoiceMismatchBox}
                              icon={<ExclamationCircleOutlined />}
                              onClick={() => setShowInvoiceMismatchBox((v) => !v)}
                              style={!showInvoiceMismatchBox ? { borderColor: '#B11E6A55', color: '#B11E6A' } : undefined}
                            >
                              {showInvoiceMismatchBox ? 'Cancel' : 'Report Mismatch'}
                            </Button>
                          ) : (
                            <Tag
                              color={order.invoiceMismatchStatus === 'pending' ? 'gold' : order.invoiceMismatchStatus === 'approved' ? 'success' : 'error'}
                              style={{ margin: 0, borderRadius: 12 }}
                            >
                              {order.invoiceMismatchStatus === 'pending' && 'Mismatch — Awaiting Sales'}
                              {order.invoiceMismatchStatus === 'approved' && (order.invoiceMismatchAwaitingReupload ? 'Approved — Reupload Invoice' : 'Mismatch Approved')}
                              {order.invoiceMismatchStatus === 'rejected' && 'Mismatch Rejected'}
                            </Tag>
                          )}
                        </div>

                        {/* Invoice Mismatch — general-purpose reason field for anything
                            wrong with the scanned invoice, sent to this order's own sales
                            person (single approval). Replaces the old "Edit Details"
                            self-fix toggle — the dispatcher can no longer silently correct
                            AI-scanned fields; they must flag it and get sign-off instead. */}
                        {(showInvoiceMismatchBox || order.invoiceMismatchStatus === 'pending' || order.invoiceMismatchStatus === 'rejected' || order.invoiceMismatchAwaitingReupload) && (
                          <div style={{ marginBottom: 12, border: '1.5px solid #B11E6A55', borderRadius: 8, padding: 12, background: isDark ? '#241522' : '#fff5fa' }}>
                            <Text strong style={{ fontSize: 13, color: '#B11E6A' }}>Invoice Mismatch — Sales Review</Text>
                            <div style={{ marginTop: 4, marginBottom: 10, fontSize: 12, color: isDark ? '#ccc' : '#666' }}>
                              Found something wrong with the scanned invoice/lorry receipt? Describe it below and send it to {order.salesPerson || 'the assigned sales person'} for approval — once approved, you can re-upload the corrected invoice and continue.
                            </div>

                            {order.invoiceMismatchStatus === 'pending' && (
                              <Alert
                                type="warning"
                                showIcon
                                style={{ marginBottom: 10, borderRadius: 8 }}
                                message="Awaiting Sales approval"
                                description={`Reason given: "${order.invoiceMismatchReason}"`}
                              />
                            )}
                            {order.invoiceMismatchStatus === 'approved' && order.invoiceMismatchAwaitingReupload && (
                              <Alert
                                type="success"
                                showIcon
                                style={{ marginBottom: 10, borderRadius: 8 }}
                                message="Approved — re-upload the corrected invoice"
                                description="Sales approved the reported mismatch. Upload the correct lorry receipt/invoice above and run AI Parse again to continue the dispatch flow."
                              />
                            )}
                            {order.invoiceMismatchStatus === 'rejected' && (
                              <Alert
                                type="error"
                                showIcon
                                style={{ marginBottom: 10, borderRadius: 8 }}
                                message="Rejected by Sales"
                                description={order.invoiceMismatchDecisionNote ? `Note: "${order.invoiceMismatchDecisionNote}"` : 'Enter a new reason below to request approval again, or upload a corrected invoice.'}
                              />
                            )}

                            {(order.invoiceMismatchStatus === 'none' || order.invoiceMismatchStatus === 'rejected') && (
                              <>
                                <Input.TextArea
                                  rows={2}
                                  placeholder="Describe the mismatch (required)"
                                  value={invoiceMismatchReasonInput}
                                  onChange={(e) => setInvoiceMismatchReasonInput(e.target.value)}
                                  style={{ marginBottom: 8 }}
                                />
                                <Button
                                  danger
                                  size="small"
                                  loading={submittingInvoiceMismatch}
                                  onClick={handleRequestInvoiceMismatchApproval}
                                >
                                  {order.invoiceMismatchStatus === 'rejected' ? 'Resend to Sales' : 'Send to Sales'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {destinationMatch === false && (
                          <Alert
                            type="error"
                            showIcon
                            message="Destination Mismatch — Verify Before Dispatch"
                            description={`The lorry receipt's destination ("${aiParsed.toCity}") does not match this order's destination/shipping address ("${orderDestinationLabel}"). Confirm the transporter is shipping to the correct city before proceeding.`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}
                        {destinationMatch === true && (
                          <Alert
                            type="success"
                            showIcon
                            message="Destination Verified"
                            description={`Lorry receipt destination ("${aiParsed.toCity}") matches the order's destination/shipping address ("${orderDestinationLabel}").`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}

                        {boxesMatch === false && (
                          <Alert
                            type="error"
                            showIcon
                            message="Box Count Mismatch — Verify Before Dispatch"
                            description={`The lorry receipt lists ${aiParsed.packages} package(s), but ${manualBoxesNum} box(es) were entered manually above. Confirm the correct count before proceeding.`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}
                        {boxesMatch === true && (
                          <Alert
                            type="success"
                            showIcon
                            message="Box Count Verified"
                            description={`Lorry receipt package count (${aiParsed.packages}) matches the manually entered boxes (${manualBoxesNum}).`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}

                        {transportMatch === false && (
                          <Alert
                            type="error"
                            showIcon
                            message="Transport Name Mismatch — Sales Notified"
                            description={`The lorry receipt's transport name ("${aiParsed.transportName}") does not match what was entered manually ("${liveTransport || order.storedTransportName || order.transport || '—'}"). The assigned sales person has been notified and can approve or reject this from the Sales Orders tab.`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}
                        {transportMatch === true && (
                          <Alert
                            type="success"
                            showIcon
                            message="Transport Name Verified"
                            description={`Lorry receipt transport name ("${aiParsed.transportName}") matches the manually entered transport ("${liveTransport || order.storedTransportName || order.transport || '—'}").`}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                          />
                        )}

                        {otherFieldsMismatch && (
                          <div style={{ marginBottom: 12, border: '1.5px solid #ff4d4f55', borderRadius: 8, padding: 12, background: isDark ? '#2a1418' : '#fff2f0' }}>
                            <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>
                              {otherMismatchFieldLabels.join(' & ')} Mismatch — Sales &amp; Operations Approval Required
                            </Text>
                            <div style={{ marginTop: 4, marginBottom: 10, fontSize: 12, color: isDark ? '#ccc' : '#666' }}>
                              The lorry receipt disagrees with what was entered manually. Finished Dispatch stays blocked until you either re-upload a corrected LR that scans clean, or give a reason and get approval from BOTH Sales and Operations.
                            </div>

                            {order.lrMismatchStatus === 'approved' ? (
                              <Alert type="success" showIcon message="Approved by Sales &amp; Operations — you may proceed with Finished Dispatch." style={{ borderRadius: 8 }} />
                            ) : (
                              <>
                                {order.lrMismatchStatus === 'pending' && (
                                  <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 10, borderRadius: 8 }}
                                    message="Awaiting approval"
                                    description={
                                      <div>
                                        <div>Reason given: "{order.lrMismatchReason}"</div>
                                        <div style={{ marginTop: 4 }}>
                                          Sales: {order.lrMismatchSalesApproved ? <Text type="success">Approved ✓</Text> : <Text type="secondary">Pending</Text>}
                                          {' · '}
                                          Operations: {order.lrMismatchOpsApproved ? <Text type="success">Approved ✓</Text> : <Text type="secondary">Pending</Text>}
                                        </div>
                                      </div>
                                    }
                                  />
                                )}
                                {order.lrMismatchStatus === 'rejected' && (
                                  <Alert
                                    type="error"
                                    showIcon
                                    style={{ marginBottom: 10, borderRadius: 8 }}
                                    message="Rejected"
                                    description="Sales or Operations rejected this mismatch. Re-upload the correct LR copy, or enter a new reason below to request approval again."
                                  />
                                )}
                                <Input.TextArea
                                  rows={2}
                                  placeholder="Reason for the mismatch (required to request approval)"
                                  value={lrMismatchReasonInput}
                                  onChange={(e) => setLrMismatchReasonInput(e.target.value)}
                                  style={{ marginBottom: 8 }}
                                />
                                <Button
                                  danger
                                  size="small"
                                  loading={submittingLrMismatch}
                                  onClick={handleRequestLrMismatchApproval}
                                >
                                  {order.lrMismatchStatus === 'pending' ? 'Resend Approval Request' : 'Request Approval (Sales & Operations)'}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        <Form form={lrForm} layout="vertical" size="small">
                          <Row gutter={[10, 10]}>
                            {[
                                { label: 'LR Number', value: aiParsed.lrNumber, icon: <FileDoneOutlined />, highlight: true },
                                { label: 'LR Date', value: aiParsed.lrDate, icon: <CheckSquareOutlined /> },
                                {
                                  label: 'Transport',
                                  value: aiParsed.transportName,
                                  icon: <CarOutlined />,
                                  mismatch: transportMatch === false,
                                  matched: transportMatch === true,
                                },
                                {
                                  label: 'Packages',
                                  value: aiParsed.packages,
                                  icon: <InboxOutlined />,
                                  mismatch: boxesMatch === false,
                                  matched: boxesMatch === true,
                                },
                                {
                                  label: 'From → To',
                                  value: [aiParsed.fromCity, aiParsed.toCity].filter(Boolean).join(' → '),
                                  icon: <EnvironmentOutlined />,
                                  mismatch: destinationMatch === false,
                                  matched: destinationMatch === true,
                                },
                                { label: 'Weight', value: aiParsed.weight, icon: <AppstoreOutlined /> },
                                { label: 'Freight', value: aiParsed.freight, icon: <ThunderboltOutlined /> },
                                { label: 'Est. Delivery', value: aiParsed.estimatedDelivery, icon: <CheckCircleOutlined /> },
                                { label: 'Tracking URL', value: aiParsed.trackingUrl, icon: <LinkOutlined /> },
                              ].map((f) => (
                                <Col xs={12} sm={8} md={6} key={f.label}>
                                  <Card
                                    size="small"
                                    bodyStyle={{ padding: '8px 10px' }}
                                    style={{
                                      borderRadius: 8,
                                      height: '100%',
                                      borderColor: f.mismatch ? '#ff4d4f' : f.matched ? '#52c41a' : '#B11E6A22',
                                      borderWidth: (f.mismatch || f.matched) ? 2 : 1,
                                    }}
                                  >
                                    <Space size={4} style={{ color: '#999', fontSize: 11 }}>
                                      {f.icon}
                                      <span>{f.label}</span>
                                      {f.mismatch && <Text style={{ fontSize: 10, color: '#ff4d4f', fontWeight: 700 }}>MISMATCH</Text>}
                                      {f.matched && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />}
                                    </Space>
                                    <div
                                      style={{
                                        marginTop: 2,
                                        fontSize: 13,
                                        fontWeight: (f.highlight || f.mismatch) ? 700 : 500,
                                        color: f.mismatch ? '#ff4d4f' : f.highlight ? '#B11E6A' : textColor,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={f.value || ''}
                                    >
                                      {f.value || '—'}
                                    </div>
                                  </Card>
                                </Col>
                              ))}
                          </Row>
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
                        <Input placeholder="e.g. LR-78921" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>

              {/* ── Finished Dispatch ── enabled after EITHER a Partial Dispatch checkpoint
                  or the real Full Dispatch confirm, since each round needs its own LR/notify
                  step — label and copy switch to reflect which one this round actually is. */}
              {(() => {
                const invoiceMismatchBlocked = order.invoiceMismatchStatus === 'pending' || order.invoiceMismatchAwaitingReupload;
                const canFinish = (dispatched || partialConfirmed) && !otherMismatchBlocked && !invoiceMismatchBlocked;
                const finishLabel = dispatched ? 'Fully Finished' : 'Partial Finished';
                return (
                  <div style={{ background: finishedDispatch ? '#52c41a15' : isDark ? '#1a1a2a' : '#fff9fb', border: `1.5px solid ${finishedDispatch ? '#52c41a44' : '#B11E6A44'}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ marginBottom: 10 }}>
                      <Text strong style={{ color: textColor, fontSize: 13 }}>
                        <BellOutlined style={{ color: finishedDispatch ? '#52c41a' : '#B11E6A', marginRight: 6 }} />
                        {finishLabel} — Final Notification
                      </Text>
                      <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
                        Clicking this will notify <strong>{order.salesPerson}</strong> (Sales) and <strong>{order.client}</strong> (Customer) that {dispatched ? 'the order has been dispatched and is on the way' : 'this partial shipment has gone out'}.
                      </div>
                      {!(dispatched || partialConfirmed) && !finishedDispatch && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#fa8c16' }}>
                          Confirm Dispatch above first to enable this step.
                        </div>
                      )}
                      {(dispatched || partialConfirmed) && otherMismatchBlocked && !finishedDispatch && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#ff4d4f' }}>
                          Blocked by an unresolved {otherMismatchFieldLabels.join(' / ')} mismatch above — get Sales &amp; Operations approval, or re-upload a corrected LR.
                        </div>
                      )}
                      {(dispatched || partialConfirmed) && invoiceMismatchBlocked && !finishedDispatch && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#ff4d4f' }}>
                          {order.invoiceMismatchStatus === 'pending'
                            ? 'Blocked — waiting for Sales to review the reported invoice mismatch above.'
                            : 'Blocked — re-upload the corrected invoice above to continue.'}
                        </div>
                      )}
                    </div>
                    {finishedDispatch ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a', fontWeight: 600 }}>
                        <CheckCircleOutlined />
                        {finishLabel} — notifications sent to Sales ({order.salesPerson}) &amp; Customer ({order.client})
                      </div>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={<WhatsAppOutlined />}
                        disabled={!canFinish}
                        style={{ background: canFinish ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
                        onClick={handleFinishedDispatch}
                      >
                        {finishLabel} — Notify Sales &amp; Customer
                      </Button>
                    )}
                  </div>
                );
              })()}

            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
