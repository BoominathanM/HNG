import React, { useState, useEffect, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Drawer, Form, Input, Select,
  Typography, Space, Divider, InputNumber, Tabs, Tooltip, Modal, DatePicker, TimePicker, Upload, Checkbox, Radio,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PrinterOutlined, DownloadOutlined, EyeOutlined,
  CheckCircleOutlined, LeftOutlined, UserOutlined,
  SearchOutlined, CalendarOutlined, WhatsAppOutlined,
  FileDoneOutlined, EditOutlined, BellOutlined, SafetyCertificateOutlined,
  AlertFilled, ExperimentOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import DocumentTemplate, { generatePrintHTML } from '../../components/templates/DocumentTemplate';
import { buildDocComposition, computePersonalizedComposition } from '../../utils/docComposition';
import { fetchHotelPendingDue } from '../../utils/pendingDue';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import {
  useGetInvoicesQuery,
  useGetQuotationsInProcessQuery,
  useGetBillingPartiesQuery,
  useCreateInvoiceMutation,
  useRecordPaymentMutation,
  useGetInvoicePaymentsQuery,
  useConvertQuotationToInvoiceMutation,
  useUpdateInvoiceGstMutation,
  useGetBillingPartyLedgerQuery,
  useGetCompanySettingsQuery,
  useGetSalesOrdersQuery,
  useUpdateSalesOrderMutation,
  useUpdateSalesQuotationMutation,
  useGetKitsQuery,
  useUpdateLeadMutation,
  useGetLeadsQuery,
  useUpdateNegotiationMutation,
  useGetNegotiationsQuery,
  useGetWhatsAppEventMappingsQuery,
  useSendWhatsAppMessageMutation,
  useUploadFilesMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

// All billing data loaded from API
// Round money to 2 decimals (strip float noise) without collapsing genuine paise to whole rupees.
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Mirror of Sales/index.jsx itemsToProducts — converts flat items[] to products[] shape.
// Needed when a lead/order only has items (older records) rather than the products[] array.
const itemsToProducts = (items = []) =>
  (items || []).filter(Boolean).map((i) => ({
    ...i,
    name: i.name || i.itemName || '',
    qty: i.qty,
    rate: Number(i.price) || Number(i.rate) || 0,
    gst: i.gst || 0,
    isKit: i.isKit || false,
    kitId: i.kitId || '',
    kitType: i.kitType || '',
    category: i.category || '',
  }));

const rowCategory = (p, kitOrders = []) => {
  if (!p) return 'separate_product';
  if (p.category) return p.category;
  if (p.isKit || p.kitType) {
    const ko = (kitOrders || []).find(o => o && o.kitId && String(o.kitId) === String(p.kitId));
    return ko?.category || 'separate_kit';
  }
  return 'separate_product';
};

// Kit-aware grand total — mirrors computeRecordGrandTotal / computeRecordBuckets in Sales/index.jsx.
// Uses products[] + kitOrders[] from the quotation/order document.
// Returns 0 when no composition data is present so callers can fall back to the stored total.
const computeKitAwareTotal = (rec) => {
  const products = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  if (!products.length && !kitOrders.length) return 0;

  const catOf = (p) => rowCategory(p, kitOrders);

  // GST-inclusive subtotal of non-kit product rows.
  // Accepts both 'rate' (Sales form field) and 'price' (quotation item schema field).
  const sumProds = (rows) => r2(rows.reduce((s, p) => {
    const qty = Number(p.qty) || 0;
    const rate = Number(p.rate) || Number(p.price) || 0;
    const gst = Number(p.gst) || 0;
    return s + qty * rate + qty * rate * gst / 100;
  }, 0));

  const kitRowsAll = products.filter(p => p.isKit || p.kitType);
  const nonKitProds = products.filter(p => !(p.isKit || p.kitType));
  const persProds = nonKitProds.filter(p => catOf(p) === 'personalized');
  const sepProds = nonKitProds.filter(p => catOf(p) === 'separate_product');

  // Value of one kit order — mirrors Sales kitOrderValue exactly:
  // kitPrice × overallQty when a price is set, else component-row subtotal × overallQty.
  const kitVal = (ko) => {
    const price = Number(ko.kitPrice) || 0;
    const qty = Number(ko.overallQty) || 0;
    if (price > 0) return r2(price * (qty || 1));
    const rows = kitRowsAll.filter(r => String(r.kitId || '') === String(ko.kitId || ''));
    const sub = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || Number(p.price) || 0), 0);
    const gst = rows.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate) || Number(p.price) || 0) * ((Number(p.gst) || 0) / 100), 0);
    return r2((sub + gst) * (qty || 1));
  };

  let personalizedKit = 0, separateKit = 0;
  if (kitOrders.length) {
    kitOrders.forEach(ko => {
      const val = kitVal(ko);
      if ((ko.category || 'separate_kit') === 'personalized') personalizedKit += val;
      else separateKit += val;
    });
  } else if (kitRowsAll.length) {
    // Legacy: no kitOrders array — use top-level kitPrice if set
    const topPrice = Number(rec.kitPrice) || 0;
    const topQty = Number(rec.kitOverallQty) || 0;
    separateKit = topPrice > 0 ? r2(topPrice * (topQty || 1)) : sumProds(kitRowsAll);
  }

  const personalized = r2(personalizedKit + sumProds(persProds));
  const separateProduct = sumProds(sepProds);
  const fwd = rec.forwardingCharge ? r2(Number(rec.forwardingChargeAmount) || 0) : 0;
  // Courier/shipping charge and round off recorded via Record Payment In — both are extra
  // amounts owed on top of the order, entered per-payment rather than stored on the record.
  const courier = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
  const roundOffTotal = r2((rec.paymentCollection || []).reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
  return r2(personalized + separateKit + separateProduct + fwd + courier + roundOffTotal);
};

function computeCompositionGrandTotal(formData = {}, kitsData = []) {
  if ((formData.packagingIncludes || []).length > 0 && kitsData.length > 0) {
    const comp = computePersonalizedComposition(formData, kitsData);
    const fwd = formData.forwardingCharge ? r2(Number(formData.forwardingChargeAmount) || 0) : 0;
    const courier = r2((formData.paymentCollection || []).reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    const roundOffTotal = r2((formData.paymentCollection || []).reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
    const separateKit = comp.separateKits.reduce((s, sk) => s + (sk.remainingValue || 0), 0);
    const separateProduct = comp.sepProdsList.reduce((s, sp) => s + (sp.remainingValue || 0), 0);
    return r2(comp.totalPersonalized + separateKit + separateProduct + fwd + courier + roundOffTotal);
  }
  return computeKitAwareTotal(formData);
}

const computeKitTaxable = (rec) => {
  const products = (rec.products || []).filter(Boolean);
  const kitOrders = (rec.kitOrders || []).filter(Boolean);
  const productTaxable = products.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate || p.price) || 0), 0);
  const productGst = products.reduce((s, p) => s + (Number(p.qty) || 0) * (Number(p.rate || p.price) || 0) * ((Number(p.gst || p.taxRate) || 0) / 100), 0);
  if (!kitOrders.length) return { taxable: r2(productTaxable), gst: r2(productGst) };
  // For kits priced as a flat bundle (kitPrice set, no per-component pricing), the GST
  // baked into that price must be split out here too — otherwise a kit-priced order with
  // un-itemized components ends up with gst:0 (from productGst above) even though
  // pricedKitTaxable below correctly strips tax out of kitPrice, so CGST/SGST silently
  // don't show on the invoice despite the order being taxable.
  let pricedKitTaxable = 0, pricedKitGst = 0;
  kitOrders.forEach((ko) => {
    const price = Number(ko.kitPrice) || 0;
    const qty = Number(ko.overallQty || ko.qty) || 1;
    if (price <= 0) return;
    const gstPct = Number(ko.gst || ko.gstPercent || ko.taxRate) || 0;
    const taxable = gstPct > 0 ? price / (1 + gstPct / 100) : price;
    pricedKitTaxable += taxable * qty;
    pricedKitGst += (price - taxable) * qty;
  });
  // taxable picks whichever base is larger (itemized components vs flat kit price) to avoid
  // double-counting; gst must follow the SAME base so it stays consistent with taxable.
  const useKitPricing = pricedKitTaxable > productTaxable;
  return {
    taxable: r2(useKitPricing ? pricedKitTaxable : productTaxable),
    gst: r2(useKitPricing ? pricedKitGst : productGst),
  };
};

const sumPaid = (...sources) => {
  // Take the MAX across ALL sources (collection sum and stored paidAmount) so a payment
  // recorded in Sales (only on the lead) is reflected even if the order/quotation collection
  // still shows the old lower amount.
  let maxPaid = 0;
  for (const src of sources) {
    if (!src) continue;
    const coll = (src.paymentCollection || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
    const stored = Number(src.paidAmount) || Number(src.totalPaid) || Number(src.amountCollected) || Number(src.advancePaidAmount) || Number(src.advancePaid) || Number(src.advanceAmount) || 0;
    maxPaid = Math.max(maxPaid, coll, stored);
  }
  return r2(maxPaid);
};

const statusColor = { Paid: '#6b1240', Pending: '#C94F8A', 'Partially Paid': '#B11E6A', Overdue: '#8a1652' };
const quotStatusColor = { 'In Process': '#7c3aed', Paid: '#6b1240', 'Partially Paid': '#B11E6A', Unpaid: '#C94F8A' };

export default function Billing() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'Unknown User';
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  // Pagination state must come before the query that uses them
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(null);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize, setInvoicesPageSize] = useState(10);

  // Data — RTK Query
  const { data: invoicesData } = useGetInvoicesQuery({ page: invoicesPage, limit: invoicesPageSize, ...(invoiceStatusFilter ? { status: invoiceStatusFilter } : {}) });
  const { data: quotationsData } = useGetQuotationsInProcessQuery();
  const { data: partiesData } = useGetBillingPartiesQuery();
  const { data: companySettingsData } = useGetCompanySettingsQuery();
  const { data: salesOrdersRaw } = useGetSalesOrdersQuery({ limit: 1000 });
  const { data: kitsRaw } = useGetKitsQuery();
  const { data: leadsRaw } = useGetLeadsQuery({ limit: 1000 });
  const { data: negotiationsRaw } = useGetNegotiationsQuery({ limit: 1000 });
  const { data: whatsAppMappingsData } = useGetWhatsAppEventMappingsQuery();
  const kits = kitsRaw?.data || [];
  const invoiceSettings = companySettingsData?.data || {};
  const [sendWhatsAppMessageMutation] = useSendWhatsAppMessageMutation();
  const [uploadFilesMutation] = useUploadFilesMutation();
  const [whatsAppSendingKey, setWhatsAppSendingKey] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [createInvoiceMutation] = useCreateInvoiceMutation();
  const [recordPaymentMutation] = useRecordPaymentMutation();
  const [convertQuotationMutation] = useConvertQuotationToInvoiceMutation();
  const [updateInvoiceGstMutation] = useUpdateInvoiceGstMutation();
  const [updateSalesOrderMutation] = useUpdateSalesOrderMutation();
  const [updateSalesQuotationMutation] = useUpdateSalesQuotationMutation();
  const [updateLeadMutation] = useUpdateLeadMutation();
  const [updateNegotiationMutation] = useUpdateNegotiationMutation();

  // Map each lead id → its converted sales order (the order carries the resolved kitPrice
  // that produces the "Amount to Pay" Sales shows; the lead's kitPrice is often stale).
  // Used by BOTH invoiceList and quotationList so the two render identically.
  const orderByLead = useMemo(() => {
    const m = {};
    (salesOrdersRaw?.data || []).forEach((o) => {
      const lid = o.leadId && typeof o.leadId === 'object' ? o.leadId._id : o.leadId;
      if (lid) m[String(lid)] = o;
    });
    return m;
  }, [salesOrdersRaw]);

  const invoiceList = useMemo(() => (invoicesData?.data || []).map((inv) => {
    const halfGst = r2((inv.gstAmount || 0) / 2);
    // orderId is populated with products/kitOrders and a nested leadId (with full lead fields)
    const linkedOrder = inv.orderId && typeof inv.orderId === 'object' ? inv.orderId : null;
    const linkedLead = linkedOrder?.leadId && typeof linkedOrder.leadId === 'object' ? linkedOrder.leadId : null;
    const linkedQuotation = inv.quotationId && typeof inv.quotationId === 'object' ? inv.quotationId : null;
    const quotationLead = linkedQuotation?.leadId && typeof linkedQuotation.leadId === 'object' ? linkedQuotation.leadId : null;
    // Resolve the SAME full sales order the quotation tab uses (richest kitOrders/items),
    // via leadId → orderByLead; fall back to the invoice's own populated orderId.
    const leadId = linkedLead?._id || linkedOrder?.leadId || quotationLead?._id || linkedQuotation?.leadId;
    const fullOrder = (leadId && orderByLead[String(leadId)]) || linkedOrder;
    // The ORDER is the source of truth for the billed "Amount to Pay" (its kitOrders carry
    // the resolved kitPrice; the lead's kitPrice is often stale). Fall back to lead, then invoice.
    const fwdSrc = fullOrder || linkedLead || linkedQuotation || quotationLead;
    const fwdEnabled = !!(fwdSrc?.forwardingCharge ?? linkedLead?.forwardingCharge ?? quotationLead?.forwardingCharge);
    const fwdAmt = fwdEnabled ? r2(Number(fwdSrc?.forwardingChargeAmount ?? linkedLead?.forwardingChargeAmount ?? quotationLead?.forwardingChargeAmount) || 0) : 0;
    // Kit composition (identical resolution to quotationList): order products → order items → lead
    const srcProds = fullOrder?.products?.length
      ? fullOrder.products
      : (fullOrder?.items?.length
          ? itemsToProducts(fullOrder.items)
          : (linkedLead?.products?.length
              ? linkedLead.products
              : (quotationLead?.products?.length
                  ? quotationLead.products
                  : (linkedQuotation?.products?.length
                      ? linkedQuotation.products
                      : itemsToProducts(linkedLead?.items?.length ? linkedLead.items : (quotationLead?.items?.length ? quotationLead.items : (linkedQuotation?.items?.length ? linkedQuotation.items : (inv.items || []))))))));
    const srcKitOrders = fullOrder?.kitOrders?.length ? fullOrder.kitOrders : (linkedLead?.kitOrders?.length ? linkedLead.kitOrders : (quotationLead?.kitOrders?.length ? quotationLead.kitOrders : (linkedQuotation?.kitOrders || [])));
    const srcRec = (srcProds.length || srcKitOrders.length)
      ? {
          products: srcProds,
          kitOrders: srcKitOrders,
          kitPrice: fullOrder?.kitPrice ?? linkedLead?.kitPrice ?? quotationLead?.kitPrice ?? linkedQuotation?.kitPrice,
          kitOverallQty: fullOrder?.kitOverallQty ?? linkedLead?.kitOverallQty ?? quotationLead?.kitOverallQty ?? linkedQuotation?.kitOverallQty,
          packagingIncludes: fullOrder?.packagingIncludes || linkedLead?.packagingIncludes || quotationLead?.packagingIncludes || linkedQuotation?.packagingIncludes || [],
          packagingIncludesQty: fullOrder?.packagingIncludesQty || linkedLead?.packagingIncludesQty || quotationLead?.packagingIncludesQty || linkedQuotation?.packagingIncludesQty || {},
          forwardingCharge: fwdEnabled,
          forwardingChargeAmount: fwdAmt,
          // Order is where Invoice-path payments push their paymentCollection entry (see
          // syncOrderPaymentCollection in recordPayment) — courier charges live here.
          paymentCollection: fullOrder?.paymentCollection || linkedLead?.paymentCollection || quotationLead?.paymentCollection || linkedQuotation?.paymentCollection || [],
        }
      : null;
    const kitTotal = srcRec ? computeCompositionGrandTotal(srcRec, kits) : 0;
    const composition = srcRec ? buildDocComposition(srcRec, kits) : null;
    const kitMoney = composition
      ? { taxable: composition.taxable, gst: composition.gst }
      : (srcRec ? computeKitTaxable(srcRec) : { taxable: 0, gst: 0 });
    // Chain: kitAwareTotal > order.total > lead.total > invoice.total
    const invTotal = r2(kitTotal > 0 ? kitTotal : (Number(fullOrder?.total) || Number(linkedLead?.total) || Number(quotationLead?.total) || Number(linkedQuotation?.total) || Number(inv.total) || 0));
    // Courier Charge / Round Off totals recorded via Record Payment In — surfaced separately
    // (below Forwarding Charge) on the invoice document view, on top of already being folded
    // into invTotal above via computeCompositionGrandTotal.
    const pcForCharges = srcRec?.paymentCollection || [];
    const courierChargeTotal = r2(pcForCharges.reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    const roundOffTotal = r2(pcForCharges.reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
    const invPaid = sumPaid(fullOrder, linkedLead, quotationLead, linkedQuotation, inv);
    const invBalance = r2(Math.max(0, invTotal - invPaid));
    const invStatus = invTotal > 0
      ? (invPaid >= invTotal ? 'Paid' : invPaid > 0 ? 'Partially Paid' : 'Unpaid')
      : (inv.status || 'Unpaid');
    return {
      key: inv._id,
      // Link IDs — required by syncBillingChain to propagate payments to Sales records
      leadId: linkedLead?._id || quotationLead?._id || linkedOrder?.leadId || null,
      leadCode: linkedLead?.leadCode || quotationLead?.leadCode || '',
      orderId: fullOrder?._id || linkedOrder?._id || (typeof inv.orderId === 'string' ? inv.orderId : null),
      quotationId: linkedQuotation?._id || (typeof inv.quotationId === 'string' ? inv.quotationId : null),
      negotiationId: linkedOrder?.negotiationId || linkedLead?.negotiationId || null,
      inv: inv.invoiceNumber,
      client: inv.partyId?.name || '—',
      partyPhone: inv.partyId?.phone || '',
      partyGst: inv.partyId?.gstNumber || '',
      order: fullOrder?.orderCode || linkedOrder?.orderCode || '—',
      orderCategory: (fullOrder?.orderCategory === 'SAMPLE' || linkedLead?.leadType === 'SAMPLE' || quotationLead?.leadType === 'SAMPLE') ? 'SAMPLE' : (fullOrder?.orderCategory || linkedOrder?.orderCategory || 'ORDER'),
      isEmergency: !!(fullOrder?.isEmergency || linkedOrder?.isEmergency),
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : '—',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleString() : '—',
      amount: kitMoney.taxable || inv.subtotal,
      gst: kitMoney.gst || inv.gstAmount,
      gstPercent: inv.gstPercent,
      total: invTotal,
      advance: invPaid,
      balance: invBalance,
      previousBalance: inv.previousBalance || 0,
      type: inv.invoiceType,
      status: invStatus,
      note: inv.note || '',
      isComplementary: inv.isComplementary,
      complementaryNote: inv.complementaryNote || '',
      // DocumentTemplate summary fields
      taxableAmount: kitMoney.taxable || inv.subtotal || 0,
      cgst: kitMoney.gst ? r2(kitMoney.gst / 2) : halfGst,
      sgst: kitMoney.gst ? r2(kitMoney.gst / 2) : halfGst,
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      // Shown below Forwarding Charge on the invoice document (DocumentTemplate) when > 0
      courierCharge: courierChargeTotal,
      roundOff: roundOffTotal,
      // DocumentTemplate customer block — detailed address from the order/lead (richest source),
      // falling back to the billing party.
      customer: {
        name: inv.partyId?.name || '—',
        mobile: inv.partyId?.phone || fullOrder?.clientPhone || linkedLead?.phone || quotationLead?.phone || '',
        gstin: inv.partyId?.gstNumber || fullOrder?.gstNumber || linkedLead?.gstNumber || '',
        address: fullOrder?.detailedAddress || linkedLead?.detailedAddress || linkedLead?.address || quotationLead?.detailedAddress || inv.partyId?.address || '',
        city: [fullOrder?.city || linkedLead?.city || quotationLead?.city, fullOrder?.state || linkedLead?.state || quotationLead?.state, fullOrder?.pincode || linkedLead?.pincode || quotationLead?.pincode].filter(Boolean).join(', ') || inv.partyId?.city || '',
        pan: inv.partyId?.pan || inv.partyId?.panNumber || '',
        placeOfSupply: fullOrder?.state || linkedLead?.state || quotationLead?.state || inv.partyId?.state || 'Tamil Nadu',
      },
      items: (inv.items || []).filter(Boolean).map(i => ({
        key: i._id || i.itemId,
        name: i.itemName,
        unit: i.unit,
        rate: i.price || 0,
        qty: i.qty || 0,
        taxRate: i.taxRate || 0,
        taxAmt: i.taxAmt || 0,
        amount: i.lineTotal ?? ((i.price || 0) * (i.qty || 0)),
      })),
      // Kit composition for category-aware document rendering — order is source of truth
      products: srcProds,
      kitOrders: srcKitOrders,
      // Pre-computed personalized composition (outer packaging + included kits/products in
      // Section A, remaining in B/C) — DocumentTemplate renders this verbatim when present.
      composition,
    };
  }), [invoicesData, orderByLead, kits]);

  const quotationList = useMemo(() => (quotationsData?.data || []).map((q) => {
    const halfGst = r2((q.gstAmount || 0) / 2);
    // leadId is now populated — prefer lead's hotel name over stored clientName
    const lead = q.leadId && typeof q.leadId === 'object' ? q.leadId : null;
    const leadId = lead?._id || (typeof q.leadId === 'string' ? q.leadId : null);
    const linkedOrder = leadId ? orderByLead[String(leadId)] : null;
    const clientDisplay = lead?.hotelName || q.clientName || '—';
    // Order is source of truth for the billed total (resolved kitPrice) → lead → quotation
    const fwdSrc = linkedOrder || lead;
    const fwdEnabled = !!(fwdSrc?.forwardingCharge ?? lead?.forwardingCharge ?? q.forwardingCharge);
    const fwdAmt = fwdEnabled ? r2(Number(fwdSrc?.forwardingChargeAmount ?? lead?.forwardingChargeAmount ?? q.forwardingChargeAmount) || 0) : 0;
    // Products: order's items → lead's products → quotation items
    const lProds = linkedOrder?.products?.length
      ? linkedOrder.products
      : (linkedOrder?.items?.length
          ? itemsToProducts(linkedOrder.items)
          : (lead?.products?.length
              ? lead.products
              : itemsToProducts(lead?.items?.length ? lead.items : (q.items || []))));
    const lKitOrders = linkedOrder?.kitOrders?.length ? linkedOrder.kitOrders : (lead?.kitOrders || q.kitOrders || []);
    const sourceRec = {
      products: lProds,
      kitOrders: lKitOrders,
      kitPrice: linkedOrder?.kitPrice ?? lead?.kitPrice ?? q.kitPrice,
      kitOverallQty: linkedOrder?.kitOverallQty ?? lead?.kitOverallQty ?? q.kitOverallQty,
      packagingIncludes: linkedOrder?.packagingIncludes || lead?.packagingIncludes || q.packagingIncludes || [],
      packagingIncludesQty: linkedOrder?.packagingIncludesQty || lead?.packagingIncludesQty || q.packagingIncludesQty || {},
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      // Courier charges recorded via Record Payment In live wherever the payment was saved.
      paymentCollection: linkedOrder?.paymentCollection || lead?.paymentCollection || q.paymentCollection || [],
    };
    const kitTotal = computeCompositionGrandTotal(sourceRec, kits);
    const composition = buildDocComposition(sourceRec, kits);
    const kitMoney = composition ? { taxable: composition.taxable, gst: composition.gst } : computeKitTaxable(sourceRec);
    // Chain: kitAwareTotal > order.total > lead.total > q.total (stale snapshot)
    const total = r2(kitTotal > 0 ? kitTotal : (Number(linkedOrder?.total) || Number(lead?.total) || Number(q.total) || 0));
    // paymentCollection from lead is authoritative (Sales reads the same source)
    const paid = sumPaid(linkedOrder, lead, q);
    const balance = r2(Math.max(0, total - paid));
    // Authoritative payment collection — pick the source whose recorded payments are most
    // complete (matches `paid = sumPaid(...)`) so a manually-recorded payment ACCUMULATES on
    // top of prior ones instead of overwriting them when saved back to the quotation/order.
    const collSum = (c) => (c || []).reduce((s, e) => s + Number(e?.paidAmount || 0), 0);
    const paymentCollection = [linkedOrder, lead, q]
      .filter(Boolean)
      .map((src) => src.paymentCollection || [])
      .reduce((best, c) => (collSum(c) > collSum(best) ? c : best), []);
    // Shown below Forwarding Charge on the quotation document (DocumentTemplate) when > 0
    const courierChargeTotal = r2(paymentCollection.reduce((s, e) => s + (Number(e?.courierCharge) || 0), 0));
    const roundOffTotal = r2(paymentCollection.reduce((s, e) => s + (Number(e?.roundOff) || 0), 0));
    const qStatus = total > 0
      ? (r2(paid) >= r2(total) ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid')
      : (q.status || 'Unpaid');
    return {
      key: q._id,
      orderId: linkedOrder?._id,
      docType: 'Quotation',
      // Link IDs — required by syncBillingChain to propagate payment to Sales records
      leadId: q.leadId,
      leadCode: q.leadCode || '',
      quot: q.quotCode,
      client: clientDisplay,
      order: q.orderId?.orderCode || '—',
      orderCategory: (lead?.leadType === 'SAMPLE') ? 'SAMPLE' : 'ORDER',
      isEmergency: false,
      date: q.quoteDate ? new Date(q.quoteDate).toLocaleString() : '—',
      expectedDeliveryDate: (() => {
        const d = q.orderDeliveryDate || lead?.orderDeliveryDate || linkedOrder?.expectedDeliveryDate;
        return d && dayjs(d).isValid() ? dayjs(d).format('DD/MM/YYYY') : '';
      })(),
      amount: kitMoney.taxable || q.amount,
      gst: kitMoney.gst || q.gstAmount,
      total,
      advance: paid,
      balance,
      type: q.type,
      status: qStatus,
      // Carried so handleSavePayment accumulates new manual payments instead of wiping prior ones
      paymentCollection,
      note: q.note || '',
      taxableAmount: kitMoney.taxable || q.amount || 0,
      cgst: kitMoney.gst ? r2(kitMoney.gst / 2) : halfGst,
      sgst: kitMoney.gst ? r2(kitMoney.gst / 2) : halfGst,
      // Boolean flag + amount (matches Order model pattern; DocumentTemplate understands both)
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      courierCharge: courierChargeTotal,
      roundOff: roundOffTotal,
      customer: {
        name: clientDisplay,
        mobile: lead?.phone || '',
        gstin: lead?.gstNumber || '',
        // Detailed address for Bill To / Ship To — prefer lead's full address, fall back to city
        address: lead?.detailedAddress || lead?.address || '',
        city: [lead?.city, lead?.state, lead?.pincode].filter(Boolean).join(', ') || lead?.locationCity || '',
        pan: '',
        placeOfSupply: lead?.state || 'Tamil Nadu',
      },
      items: (q.items || []).filter(Boolean).map(i => ({
        key: i._id || i.itemId,
        name: i.itemName,
        unit: i.unit,
        rate: i.price || 0,
        qty: i.qty || 0,
        taxRate: i.taxRate || 0,
        taxAmt: i.taxAmt || 0,
        amount: i.lineTotal ?? ((i.price || 0) * (i.qty || 0)),
      })),
      // Kit composition data for category-aware document rendering — order is source of truth
      products: lProds,
      kitOrders: lKitOrders,
      composition,
    };
  }), [quotationsData, orderByLead, kits]);

  const partiesList = useMemo(() => (partiesData?.data || []).map((p) => ({
    key: p._id,
    name: p.name,
    phone: p.phone || '',
    type: p.type,
    balance: p.runningBalance || 0,
    openingBalance: p.openingBalance || 0,
    openingBalDir: p.openingBalDir,
    gstNumber: p.gstNumber,
    panNumber: p.panNumber,
    creditPeriod: p.creditPeriod,
    creditLimit: p.creditLimit,
    category: p.category,
    contactPerson: p.contactPerson,
    dob: p.dob,
    street: p.street,
    state: p.state,
    pincode: p.pincode,
    city: p.city,
  })), [partiesData]);

  const salesOrdersList = useMemo(() => (salesOrdersRaw?.data || []).map((o) => {
    const rawItems = (o.items || []).map(i => ({
      name: i.itemName || i.name || '',
      qty: Number(i.qty) || 0,
      unit: i.unit || 'PCS',
      rate: Number(i.price || i.rate) || 0,
      gst: Number(i.gst) || 0,
    }));
    const subtotal = r2(rawItems.reduce((s, i) => s + i.qty * i.rate, 0));
    const gstFromItems = r2(rawItems.reduce((s, i) => s + i.qty * i.rate * i.gst / 100, 0));
    const effectiveGst = gstFromItems > 0 ? gstFromItems : (Number(o.gstAmount) || 0);
    const fwdEnabled = !!o.forwardingCharge;
    const fwdAmt = fwdEnabled ? r2(Number(o.forwardingChargeAmount) || 0) : 0;
    // Kit-aware total takes priority; fall back to stored o.total then item-computed
    const kitTotal = computeCompositionGrandTotal(o, kits);
    const composition = buildDocComposition(o, kits);
    const total = r2(kitTotal > 0 ? kitTotal : (Number(o.total) || (subtotal + effectiveGst + fwdAmt)));
    const collTotal = r2((o.paymentCollection || []).reduce((s, e) => s + Number(e.paidAmount || 0), 0));
    // Use MAX so a paidAmount synced from Sales (which only updates the scalar, not the collection)
    // still shows correctly even when the order collection only has the older entries.
    const storedPaid = Number(o.paidAmount) || Number(o.advancePaid) || Number(o.advancePaidAmount) || 0;
    const paid = r2(Math.max(collTotal, storedPaid));
    const balance = Math.max(0, total - paid);
    const halfGst = r2(effectiveGst / 2);
    const status = total > 0
      ? (paid >= total ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid')
      : (o.paymentStatus || 'Unpaid');
    const taxAmt = rawItems.map(i => {
      const ta = r2(i.qty * i.rate * i.gst / 100);
      return { name: i.name, qty: i.qty, unit: i.unit, rate: i.rate, taxRate: i.gst, taxAmt: ta, amount: i.qty * i.rate + ta };
    });
    return {
      key: o._id,
      docType: 'Order',
      // Link IDs — required by syncBillingChain to propagate payment to Sales records
      leadId: o.leadId,
      leadCode: o.leadCode || '',
      quotationId: o.quotationId,
      negotiationId: o.negotiationId,
      // Use 'quot' so the shared column (dataIndex: 'quot') renders the order code
      quot: o.orderCode,
      inv: o.orderCode,
      client: o.clientName || o.clientPartyId?.name || '—',
      order: '',
      orderCategory: o.orderCategory || 'ORDER',
      isEmergency: o.isEmergency || false,
      date: o.createdAt ? dayjs(o.createdAt).format('DD/MM/YYYY') : '—',
      amount: subtotal,
      gst: effectiveGst,
      total,
      // Use 'advance' so the shared "Advance" column shows the paid amount for orders
      advance: paid,
      balance,
      type: o.billType === 'NON_GST' ? 'Non-GST' : (o.type || 'GST'),
      status,
      taxableAmount: composition ? composition.taxable : subtotal,
      cgst: composition ? r2(composition.gst / 2) : halfGst,
      sgst: composition ? r2(composition.gst / 2) : halfGst,
      // Boolean + amount (DocumentTemplate understands this pattern)
      forwardingCharge: fwdEnabled,
      forwardingChargeAmount: fwdAmt,
      customer: {
        name: o.billingName || o.clientName || '—',
        address: o.detailedAddress || '',
        city: [o.city, o.state, o.pincode].filter(Boolean).join(', '),
        mobile: o.clientPhone || o.phone || '',
        gstin: o.gstNumber || '',
        pan: '',
        placeOfSupply: o.state || 'Tamil Nadu',
      },
      items: taxAmt,
      paymentCollection: o.paymentCollection || [],
      // Kit composition data for category-aware document rendering
      products: o.products || [],
      kitOrders: o.kitOrders || [],
      composition,
    };
  }), [salesOrdersRaw, kits]);

  const [activeTab, setActiveTab] = useState('quotation-in-process');
  const { filterTabs, activeKeyFor } = useTabAccess('Billing');
  const { requireAccess } = usePageAccess('Billing');

  // View invoice / quotation
  const [viewModal, setViewModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [viewDocType, setViewDocType] = useState('invoice');
  const [ledgerEntries, setLedgerEntries] = useState([]);

  // Parties & Ledgers tab state
  const [viewBillingPartyLedger, setViewBillingPartyLedger] = useState(null);
  const [billingPartiesSearch, setBillingPartiesSearch] = useState('');

  // Record Payment In
  const [recordPayOpen, setRecordPayOpen] = useState(false);
  const [recordPayInv, setRecordPayInv] = useState(null);
  const [payParty, setPayParty] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [payBankAccount, setPayBankAccount] = useState(null);
  const [payUpiRef, setPayUpiRef] = useState('');
  const [payCardLast4, setPayCardLast4] = useState('');
  const [payTransactionRef, setPayTransactionRef] = useState('');
  const [payChequeNo, setPayChequeNo] = useState('');
  const [payChequeBank, setPayChequeBank] = useState('');
  const [payChequeDate, setPayChequeDate] = useState(null);
  const [quotStatusFilter, setQuotStatusFilter] = useState('all');
  const [quotSearch, setQuotSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState(null);
  const [payNote, setPayNote] = useState('');
  const [payNoteVisible, setPayNoteVisible] = useState(false);
  const [payCourierVisible, setPayCourierVisible] = useState(false);
  const [payCourierAmount, setPayCourierAmount] = useState(0);
  const [payRoundOffVisible, setPayRoundOffVisible] = useState(false);
  const [payRoundOffAmount, setPayRoundOffAmount] = useState(0);
  const [payRoundOffType, setPayRoundOffType] = useState('addition'); // 'addition' | 'discount'
  // Signed round-off value: Addition grows the payable total, Discount shrinks it.
  // Kept signed so every downstream sum (net payable, invoice total, saved entry) can
  // keep doing plain addition without knowing about the Addition/Discount choice.
  const signedRoundOff = (payRoundOffType === 'discount' ? -1 : 1) * (Number(payRoundOffAmount) || 0);
  const [paymentRefNum] = useState('176');
  const [payLinkedInvoices, setPayLinkedInvoices] = useState([]);

  // Payment History / audit-trail modal (opened by clicking a row in Quotation-in-Process / Invoices tables)
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [paymentHistoryRecord, setPaymentHistoryRecord] = useState(null);
  const { data: invoicePaymentsData } = useGetInvoicePaymentsQuery(paymentHistoryRecord?.key, {
    skip: !paymentHistoryOpen || paymentHistoryRecord?.docType !== 'Invoice' || !paymentHistoryRecord?.key,
  });

  // Convert to Invoice modal (partial conversion)
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertQuot, setConvertQuot] = useState(null);
  const [convertAmt, setConvertAmt] = useState(0);
  const [convertPreviousDue, setConvertPreviousDue] = useState(0);
  const [convertPrevInvoices, setConvertPrevInvoices] = useState([]);
  const [convertDocType, setConvertDocType] = useState('quotation'); // 'quotation' | 'order'

  // View proof modal (Paid quotation)
  const [proofOpen, setProofOpen] = useState(false);
  const [proofQuot, setProofQuot] = useState(null);

  // Reminder modal (Paid / Partially Paid)
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderQuot, setReminderQuot] = useState(null);
  const [reminderDate, setReminderDate] = useState(null);
  const [reminderTime, setReminderTime] = useState(null);
  const [reminderMode, setReminderMode] = useState('WhatsApp');

  // Verify payment modal (Paid quotation)
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyQuot, setVerifyQuot] = useState(null);
  const [verifierName, setVerifierName] = useState('');

  // Edit GST modal (Invoices tab)
  const [gstEditOpen, setGstEditOpen] = useState(false);
  const [gstEditInv, setGstEditInv] = useState(null);
  const [gstEditValue, setGstEditValue] = useState(0);

  const billingPartiesData = Object.values(
    invoiceList.reduce((acc, inv) => {
      if (!acc[inv.client]) {
        acc[inv.client] = { key: inv.client, name: inv.client, type: 'Customer', totalSales: 0, received: 0, pending: 0 };
      }
      acc[inv.client].totalSales += inv.total;
      acc[inv.client].received += inv.advance;
      acc[inv.client].pending += inv.balance;
      return acc;
    }, {})
  );

  const bankAccounts = ['HDFC Bank - ****1234', 'SBI Bank - ****5678', 'Axis Bank - ****9012'];

  const openRecordPay = (inv) => {
    const party = partiesList.find(p => p.name === inv.client) || { name: inv.client, balance: inv.balance };
    setRecordPayInv(inv);
    setPayParty(party);
    setPayAmount(inv.balance);
    setPayLinkedInvoices([inv]);
    setPayMode('Cash');
    setPayBankAccount(null);
    setPayUpiRef('');
    setPayCardLast4('');
    setPayTransactionRef('');
    setPayChequeNo('');
    setPayChequeBank('');
    setPayChequeDate(null);
    setPayNote('');
    setPayNoteVisible(false);
    setPayCourierVisible(false);
    setPayCourierAmount(0);
    setPayRoundOffVisible(false);
    setPayRoundOffAmount(0);
    setPayRoundOffType('addition');
    setRecordPayOpen(true);
  };

  // Net amount actually credited toward the invoice/quotation balance:
  // + courier/shipping charge collected on top of the amount
  // + round off (the paise-level gap the business forgives — counts as paid)
  const computeNetPayable = () =>
    r2(
      (Number(payAmount) || 0)
      + (payCourierVisible ? Number(payCourierAmount) || 0 : 0)
      + (payRoundOffVisible ? signedRoundOff : 0)
    );

  // Propagate a new paidAmount to every linked record in the lead→quotation→negotiation→order chain.
  // Also appends a paymentCollection entry to the linked ORDER so Sales' combinedPaymentCollection
  // shows the Billing payment without requiring a full page refresh.
  // skipOrderSync: pass true when the backend has already written the order-side payment
  // itself (recordPayment / updateQuotation both do this now) — avoids double-appending
  // the same paymentCollection entry to the order from both sides.
  const syncBillingChain = async (sourceDoc, newPaid, paymentEntry, skipOrderSync = false) => {
    if (!newPaid) return;
    const scalarPatch = { paidAmount: newPaid, advancePaid: newPaid };
    const allLeads = leadsRaw?.data || [];
    const allQuots = quotationsData?.data || [];
    const allNegs = negotiationsRaw?.data || [];
    const allOrders = salesOrdersRaw?.data || [];

    // Resolve IDs from source document
    const leadId   = String(sourceDoc.leadId?._id || sourceDoc.leadId || '');
    const leadCode = sourceDoc.leadCode || '';
    const quotId   = String(sourceDoc.quotationId?._id || sourceDoc.quotationId || '');
    const negId    = String(sourceDoc.negotiationId?._id || sourceDoc.negotiationId || '');
    const orderId  = String(sourceDoc.orderId?._id || sourceDoc.orderId || sourceDoc._id || sourceDoc.key || '');

    const syncIfHigher = async (record, mutFn, extraPatch) => {
      if (!record) return;
      const recId = String(record._id || record.key || record.id || '');
      if (!recId || recId === String(sourceDoc._id || sourceDoc.key || '')) return;
      if (newPaid > Number(record.paidAmount || 0)) {
        await mutFn({ id: recId, ...scalarPatch, ...(extraPatch || {}) }).unwrap().catch(() => {});
      }
    };

    // Sync scalar paidAmount to lead
    const chainLead = leadId
      ? allLeads.find(l => String(l._id || l.key) === leadId)
      : leadCode ? allLeads.find(l => l.leadCode === leadCode) : null;
    await syncIfHigher(chainLead, updateLeadMutation);

    // Sync scalar paidAmount to quotation
    const chainQuot = quotId
      ? allQuots.find(q => String(q._id || q.key) === quotId)
      : leadId ? allQuots.find(q => String(q.leadId?._id || q.leadId) === leadId)
        : leadCode ? allQuots.find(q => q.leadCode === leadCode) : null;
    await syncIfHigher(chainQuot, updateSalesQuotationMutation);

    // Sync scalar paidAmount to negotiation
    const chainNeg = negId
      ? allNegs.find(n => String(n._id || n.key) === negId)
      : quotId ? allNegs.find(n => String(n.quotationId?._id || n.quotationId) === quotId)
        : leadId ? allNegs.find(n => String(n.leadId?._id || n.leadId) === leadId) : null;
    await syncIfHigher(chainNeg, updateNegotiationMutation);

    // Sync to order (only when source is quotation/invoice, not order itself, and the
    // backend hasn't already written this payment onto the order)
    if (sourceDoc.docType !== 'Order' && !skipOrderSync) {
      const chainOrder = allOrders.find(o => {
        const oLid = String(o.leadId?._id || o.leadId || '');
        const oId  = String(o._id || o.key || '');
        return oId === orderId ||
               (leadId && oLid === leadId) || (leadCode && o.leadCode === leadCode) ||
               (quotId && String(o.quotationId?._id || o.quotationId) === quotId) ||
               (negId  && String(o.negotiationId?._id || o.negotiationId) === negId);
      });
      // Also append the paymentCollection entry to the order so Sales shows it immediately
      const orderEntry = paymentEntry || null;
      const orderExtraPatch = orderEntry && chainOrder
        ? { paymentCollection: [...(chainOrder.paymentCollection || []), orderEntry] }
        : {};
      await syncIfHigher(chainOrder, updateSalesOrderMutation, orderExtraPatch);
    }
  };

  const handleSavePayment = async () => {
    if (!recordPayInv?.key) { enqueueSnackbar('No invoice selected', { variant: 'error' }); return; }
    const courierCharge = payCourierVisible ? Number(payCourierAmount) || 0 : 0;
    const roundOff = payRoundOffVisible ? signedRoundOff : 0;
    const newEntry = {
      paidAmount: computeNetPayable(),
      baseAmount: Number(payAmount) || 0,
      courierCharge,
      roundOff,
      paymentMode: payMode || 'Cash',
      paymentMethod: payMode || 'Cash',
      note: payNote || '',
      notes: payNote || '',
      paymentDate: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      date: new Date().toISOString(),
      recordedBy: currentUser?._id || currentUser?.id,
      recordedByName: currentUserName,
    };
    const net = newEntry.paidAmount;
    try {
      if (recordPayInv.docType === 'Order') {
        // Direct order payment (record on Sales Order)
        const existing = recordPayInv.paymentCollection || [];
        const newPaid = existing.reduce((s, e) => s + Number(e.paidAmount || 0), 0) + net;
        const newBalance = Math.max(0, (recordPayInv.total || 0) - newPaid);
        const newStatus = (recordPayInv.total || 0) > 0 && newPaid >= (recordPayInv.total || 0) ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid';
        await updateSalesOrderMutation({
          id: recordPayInv.key,
          paidAmount: newPaid,
          advancePaid: newPaid,
          balance: newBalance,
          paymentStatus: newStatus,
          paymentCollection: [...existing, newEntry],
        }).unwrap();
        // Pass newEntry so syncBillingChain can also add it to the linked order's collection
        await syncBillingChain(recordPayInv, newPaid, newEntry);
      } else if (recordPayInv.docType === 'Quotation') {
        // Quotation payment — record directly on the quotation.
        // Base the new total on the actual prior paid (collection sum OR the already-paid
        // `advance` synced from the linked order/lead) so we never wipe earlier payments.
        const existing = recordPayInv.paymentCollection || [];
        const priorPaid = Math.max(
          existing.reduce((s, e) => s + Number(e.paidAmount || 0), 0),
          Number(recordPayInv.advance || recordPayInv.paidAmount || 0)
        );
        const newPaid = priorPaid + net;
        const newBalance = Math.max(0, (recordPayInv.total || 0) - newPaid);
        const newStatus = (recordPayInv.total || 0) > 0 && newPaid >= (recordPayInv.total || 0) ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid';
        await updateSalesQuotationMutation({
          id: recordPayInv.key,
          paidAmount: newPaid,
          advancePaid: newPaid,
          balance: newBalance,
          status: newStatus,
          paymentCollection: [...existing, newEntry],
          // Explicit out-of-band signal so the backend can push this exact entry onto
          // the linked Order without having to diff `existing` — `existing` here may
          // have been borrowed from the order/lead's own history (see `sumPaid` above),
          // so it isn't reliably the quotation's stored array and can't be diffed.
          newPaymentEntry: newEntry,
        }).unwrap();
        // Order sync now happens server-side in updateQuotation (using newPaymentEntry
        // above) — only propagate the scalar paidAmount up to lead/negotiation here.
        await syncBillingChain(recordPayInv, newPaid, newEntry, true);
      } else {
        // Invoice payment (formal invoice via Billing module)
        await recordPaymentMutation({
          id: recordPayInv.key,
          amount: Number(payAmount) || 0,
          courierCharge,
          roundOff,
          paymentMode: payMode === 'Net Banking' ? 'Bank Transfer' : (payMode || 'Cash'),
          note: payNote || '',
          ...(payBankAccount ? { bankAccount: payBankAccount } : {}),
          ...(payUpiRef ? { upiReference: payUpiRef } : {}),
          ...(payCardLast4 ? { cardLast4: payCardLast4 } : {}),
          ...(payTransactionRef ? { transactionRef: payTransactionRef } : {}),
          ...(payChequeNo ? { chequeNumber: payChequeNo } : {}),
          ...(payChequeBank ? { chequeBank: payChequeBank } : {}),
          ...(payChequeDate ? { chequeDate: payChequeDate.format ? payChequeDate.format('YYYY-MM-DD') : payChequeDate } : {}),
          ...(payParty?.key ? { partyId: payParty.key } : {}),
        }).unwrap();
        // Sync to linked Sales records — use advance (= total paid so far) as the base.
        // Order sync now happens server-side in recordPayment itself — only propagate
        // the scalar paidAmount up to lead/quotation/negotiation here.
        if (recordPayInv.orderId || recordPayInv.quotationId || recordPayInv.leadId) {
          // recordPayInv.advance = invPaid (total paid before this payment)
          const existingPaid = Number(recordPayInv.advance || recordPayInv.paidAmount || 0);
          const newPaid = existingPaid + net;
          await syncBillingChain(recordPayInv, newPaid, newEntry, true);
        }
      }
      enqueueSnackbar(`Payment of ₹${net.toLocaleString()} recorded successfully`, { variant: 'success' });
      setRecordPayOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to record payment', { variant: 'error' });
    }
  };

  const openConvertModal = (doc, docType = 'quotation') => {
    const prevInvs = invoiceList.filter(inv => inv.client === doc.client && inv.balance > 0);
    const prevDue = prevInvs.reduce((sum, inv) => sum + inv.balance, 0);
    setConvertDocType(docType);
    setConvertQuot(doc);
    setConvertAmt(doc.total);
    setConvertPreviousDue(prevDue);
    setConvertPrevInvoices(prevInvs);
    setConvertOpen(true);
  };

  const handleConvertConfirm = async () => {
    if (!requireAccess('edit')) return;
    if (!convertQuot) return;
    const amt = convertAmt || convertQuot.total;
    const party = partiesList.find(p => p.name === convertQuot.client);
    if (!party?.key) {
      enqueueSnackbar(`Create a billing party named "${convertQuot.client}" before converting`, { variant: 'error' });
      return;
    }
    try {
      if (convertDocType === 'order') {
        await createInvoiceMutation({
          partyId: party.key,
          invoiceType: convertQuot.type || 'GST',
          subtotal: convertQuot.amount || 0,
          gstAmount: convertQuot.gst || 0,
          total: amt,
          advanceAmount: convertQuot.advance || 0,
          orderId: convertQuot.key,
          items: (convertQuot.items || []).map(i => ({
            itemName: i.name,
            unit: i.unit || 'PCS',
            price: i.rate || 0,
            qty: i.qty || 0,
          })),
        }).unwrap();
        enqueueSnackbar(`${convertQuot.quot} converted to invoice and moved to Invoices`, { variant: 'success' });
      } else {
        await convertQuotationMutation({
          quotationId: convertQuot.key,
          partyId: party.key,
          orderId: convertQuot.orderId,
          amount: amt,
          // Kit-aware taxable/GST split (same values already shown on screen for this row) —
          // without these the backend falls back to the quotation's raw, non-kit-aware
          // amount/gstAmount, which under-counts taxable value for kit orders.
          subtotal: convertQuot.amount || 0,
          gstAmount: convertQuot.gst || 0,
          includePreviousDue: convertPreviousDue > 0,
        }).unwrap();
        enqueueSnackbar(`${convertQuot.quot} converted to invoice and moved to Invoices`, { variant: 'success' });
      }
      setActiveTab('invoices');
      setConvertOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to convert', { variant: 'error' });
    }
  };

  const openGstEdit = (inv) => {
    setGstEditInv(inv);
    setGstEditValue(inv.gst);
    setGstEditOpen(true);
  };

  const handleSaveGst = async () => {
    const newGst = gstEditValue || 0;
    if (!gstEditInv?.key) { enqueueSnackbar('No invoice selected', { variant: 'error' }); return; }
    try {
      await updateInvoiceGstMutation({ id: gstEditInv.key, gstAmount: newGst }).unwrap();
      enqueueSnackbar('GST updated successfully', { variant: 'success' });
      setGstEditOpen(false);
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update GST', { variant: 'error' });
    }
  };

  // Enriches document data with the hotel's outstanding due from its OTHER unpaid invoices (if
  // any) before rendering — shared by Print/Download/View so the "Pending Amount" line is
  // consistent everywhere a document is generated from this page. `key` is the real Invoice
  // document id only for invoiceList rows (no `docType`) — quotationList/salesOrdersList rows
  // are Quotation/Order docs, not invoices, so nothing is excluded for those (there's no
  // invoice of their own yet to exclude).
  const withPendingDue = async (data) => {
    const clientName = data?.customer?.name || data?.client;
    if (!clientName || clientName === '—') return data;
    const excludeInvoiceId = !data?.docType ? data?.key : undefined;
    const pendingDue = await fetchHotelPendingDue({ clientName, excludeInvoiceId });
    return pendingDue ? { ...data, pendingDue } : data;
  };

  const handlePrintDocument = async (docType, data) => {
    const enriched = await withPendingDue(data);
    const html = generatePrintHTML(docType, enriched, invoiceSettings);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  // Renders the same invoice/quotation markup used for print/download and rasterizes it to a
  // real PDF Blob (html2pdf = html2canvas + jsPDF under the hood). html2pdf deep-clones whatever
  // element is passed to `.from()` into its own hidden rendering container — cloning carries
  // inline styles with it, so `position:fixed` here would make the clone escape to that fixed
  // viewport position too and render as a blank page. Let html2pdf's own overlay do the hiding;
  // this node is only briefly present in the live DOM.
  const generateDocumentPdfBlob = async (docType, data) => {
    const enrichedData = await withPendingDue(data);
    const html = generatePrintHTML(docType, enrichedData, invoiceSettings);
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

  // Directly downloads the document as a real PDF file (no print-preview window in between).
  const handleDownloadDocument = async (docType, data) => {
    const rowKey = data?.key || data?.inv || data?.quot;
    setDownloadingKey(rowKey);
    try {
      const pdfBlob = await generateDocumentPdfBlob(docType, data);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${docType === 'quotation' ? 'quotation' : 'invoice'}-${data?.quot || data?.inv || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to generate PDF', { variant: 'error' });
    } finally {
      setDownloadingKey(null);
    }
  };

  // Sends the invoice/quotation document to the customer's WhatsApp number using the
  // "Billing Invoice" event mapping configured in Integrations → WhatsApp → Event Mapping.
  const handleSendInvoiceWhatsApp = async (docType, record) => {
    const phone = record?.customer?.mobile || record?.partyPhone || '';
    if (!phone) {
      enqueueSnackbar('No phone number on file for this customer', { variant: 'warning' });
      return;
    }

    const mapping = (whatsAppMappingsData?.data || []).find(
      (m) => m.eventId?.key === 'billing-invoice' && m.isEnabled !== false && m.templateId?.name
    );
    if (!mapping) {
      enqueueSnackbar('Set up the "Billing Invoice" WhatsApp template first (Integrations → WhatsApp → Event Mapping)', { variant: 'warning' });
      return;
    }

    const rowKey = record?.key || record?.inv || record?.quot;
    setWhatsAppSendingKey(rowKey);
    try {
      const docNumber = record?.inv || record?.quot || '';
      const pdfBlob = await generateDocumentPdfBlob(docType, record);
      const filename = `${docType}-${docNumber || 'document'}.pdf`;

      const formData = new FormData();
      formData.append('files', new File([pdfBlob], filename, { type: 'application/pdf' }));
      const uploadRes = await uploadFilesMutation({ formData, folder: 'invoices' }).unwrap();
      const documentUrl = uploadRes?.data?.[0]?.url;
      if (!documentUrl) throw new Error('File upload did not return a URL');

      const fieldValues = {
        customerName: record?.client || record?.customer?.name || '',
        invoiceNumber: docNumber,
        amount: `Rs. ${(record?.total || 0).toLocaleString()}`,
        balance: `Rs. ${(record?.balance || 0).toLocaleString()}`,
        dueDate: record?.dueDate && record.dueDate !== '—' ? record.dueDate : '',
        orderCode: record?.order || '',
        companyName: invoiceSettings?.companyName || 'HNG',
      };
      const parameters = {};
      (mapping.variables || []).forEach((v) => {
        if (v.templateVariable && v.eventField) parameters[v.templateVariable] = fieldValues[v.eventField] ?? '';
      });

      const res = await sendWhatsAppMessageMutation({
        to: phone,
        templateName: mapping.templateId.name,
        language: mapping.templateId.language || 'en',
        parameters,
        documentUrl,
        documentFilename: filename,
      }).unwrap();

      enqueueSnackbar(res?.message || `${docType === 'quotation' ? 'Quotation' : 'Invoice'} shared on WhatsApp`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || err?.message || 'Failed to send WhatsApp message', { variant: 'error' });
    } finally {
      setWhatsAppSendingKey(null);
    }
  };

  const colText = (v) => <Text style={{ fontSize: 13 }}>{v}</Text>;
  const colMoney = (v, color) => <Text style={{ fontSize: 13, fontWeight: 600, color: color || 'inherit' }}>₹{v.toLocaleString()}</Text>;

  const columns = [
    { title: 'Invoice #', dataIndex: 'inv', width: 120, fixed: 'left', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text> },
    { title: 'Date', dataIndex: 'date', width: 155, render: (v) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 165, render: colText },
    {
      title: 'Order', dataIndex: 'order', width: 130,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Space size={4}>
            {r.isEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
            {r.orderCategory === 'SAMPLE' && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 12 }} />}
            <Text style={{ color: '#B11E6A', fontSize: 13 }}>{v}</Text>
          </Space>
          {r.isEmergency && <Tag color="red" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Emergency</Tag>}
          {r.orderCategory === 'SAMPLE' && <Tag color="purple" style={{ fontSize: 11, lineHeight: '16px', marginBottom: 0 }}>Sample Order</Tag>}
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, background: '#B11E6A22', color: '#B11E6A', border: '1px solid #B11E6A44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 115, render: (v) => colMoney(v) },
    { title: 'Advance', dataIndex: 'advance', width: 115, render: (v) => colMoney(v, '#8a1652') },
    {
      title: 'Balance', dataIndex: 'balance', width: 130,
      render: (v, r) => (
        <div>
          {colMoney(v, v > 0 ? '#B11E6A' : '#52c41a')}
          {r.previousBalance > 0 && (
            <Tooltip title={`Includes ₹${r.previousBalance.toLocaleString()} previous outstanding`}>
              <div style={{ fontSize: 10, color: '#ff4d4f', marginTop: 1, cursor: 'help' }}>
                Prev: ₹{r.previousBalance.toLocaleString()} ⚠
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 125, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${statusColor[v]}22`, color: statusColor[v], border: `1px solid ${statusColor[v]}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 320, fixed: 'right',
      render: (_, r) => (
        <Space size={4} wrap onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={async () => { setSelectedInv(r); setViewDocType('invoice'); setViewModal(true); setSelectedInv(await withPendingDue(r)); }} /></Tooltip>
          <Tooltip title="Edit GST"><Button size="small" icon={<EditOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }} onClick={() => openGstEdit(r)} /></Tooltip>
          <Tooltip title="Send invoice on WhatsApp"><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} loading={whatsAppSendingKey === r.key} onClick={() => handleSendInvoiceWhatsApp('invoice', r)} /></Tooltip>
          <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument('invoice', r)} /></Tooltip>
          <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} loading={downloadingKey === r.key} onClick={() => handleDownloadDocument('invoice', r)} /></Tooltip>
          {r.balance > 0 && r.orderCategory !== 'SAMPLE' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', fontSize: 12 }} onClick={() => openRecordPay(r)}>Record Manually</Button>
              <Button size="small" icon={<CalendarOutlined />} onClick={() => enqueueSnackbar('Reminder sent to client', { variant: 'success' })} style={{ color: '#fa8c16', fontSize: 12 }}>Reminder</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const makeQuotationColumns = (tabType) => [
    {
      title: 'Reference #', dataIndex: 'quot', width: 150, fixed: 'left',
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: r.docType === 'Order' ? '#B11E6A' : '#7c3aed', fontSize: 13 }}>{v}</Text>
          <Tag style={{ fontSize: 10, borderRadius: 20, padding: '0 6px', lineHeight: '16px',
            background: r.docType === 'Order' ? '#B11E6A15' : '#7c3aed15',
            color: r.docType === 'Order' ? '#B11E6A' : '#7c3aed',
            border: `1px solid ${r.docType === 'Order' ? '#B11E6A44' : '#7c3aed44'}` }}
          >{r.docType === 'Order' ? 'Order' : 'Quotation'}</Tag>
        </Space>
      ),
    },
    { title: 'Date', dataIndex: 'date', width: 155, render: (v) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{v}</Text> },
    { title: 'Client', dataIndex: 'client', width: 165, render: (v) => <Text style={{ fontSize: 13 }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', width: 90, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed44' }}>{v}</Tag> },
    { title: 'Total', dataIndex: 'total', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600 }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Paid', dataIndex: 'advance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: '#8a1652' }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Balance', dataIndex: 'balance', width: 115, render: (v) => <Text style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? '#B11E6A' : '#52c41a' }}>₹{(v || 0).toLocaleString()}</Text> },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <Tag style={{ borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${quotStatusColor[v] || '#aaa'}22`, color: quotStatusColor[v] || '#888', border: `1px solid ${quotStatusColor[v] || '#aaa'}44` }}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      width: tabType === 'in-process' ? 500 : 190,
      fixed: 'right',
      render: (_, r) => {
        const isOrder = r.docType === 'Order';
        const docType = isOrder ? 'invoice' : 'quotation';
        return (
          <Space size={4} wrap onClick={(e) => e.stopPropagation()}>
            <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={async () => { const base = { ...r, inv: r.quot }; setSelectedInv(base); setViewDocType(docType); setViewModal(true); setSelectedInv(await withPendingDue(base)); }} /></Tooltip>
            <Tooltip title={isOrder ? 'Send invoice on WhatsApp' : 'Send quotation on WhatsApp'}><Button size="small" icon={<WhatsAppOutlined />} style={{ color: '#25D366' }} loading={whatsAppSendingKey === r.key} onClick={() => handleSendInvoiceWhatsApp(docType, r)} /></Tooltip>
            <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintDocument(docType, r)} /></Tooltip>
            <Tooltip title="Download"><Button size="small" icon={<DownloadOutlined />} loading={downloadingKey === r.key} onClick={() => handleDownloadDocument(docType, r)} /></Tooltip>
            {/* Quotation-specific actions */}
            {tabType === 'in-process' && !isOrder && (
              <Button
                size="small"
                type="primary"
                icon={<FileDoneOutlined />}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', fontSize: 12 }}
                onClick={() => openConvertModal(r)}
              >
                Convert to Invoice
              </Button>
            )}
            {tabType === 'in-process' && !isOrder && (r.status === 'Paid' || r.status === 'Partially Paid') && (
              <Button size="small" icon={<BellOutlined />} style={{ color: '#fa8c16', borderColor: '#fa8c1644', fontSize: 12 }} onClick={() => { setReminderQuot(r); setReminderDate(null); setReminderTime(null); setReminderMode('WhatsApp'); setReminderOpen(true); }}>
                Set Reminder
              </Button>
            )}
            {tabType === 'in-process' && !isOrder && r.status === 'Paid' && (
              <>
                <Button size="small" icon={<EyeOutlined />} style={{ color: '#1890ff', borderColor: '#1890ff44', fontSize: 12 }} onClick={() => { setProofQuot(r); setProofOpen(true); }}>View Proof</Button>
                <Button size="small" icon={<SafetyCertificateOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', fontSize: 12 }} onClick={() => { setVerifyQuot(r); setVerifierName(''); setVerifyOpen(true); }}>Verify</Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const totalRevenue = invoiceList.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoiceList.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoiceList.reduce((s, i) => s + i.balance, 0);
  const totalQuotation = quotationList.reduce((s, q) => s + (q.total || 0), 0);

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Billing" items={[{ label: 'Billing' }]} style={{ marginBottom: 0 }} />
      </div>

      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced', val: `₹${(totalRevenue / 100000).toFixed(2)}L`, color: '#B11E6A' },
          { label: 'Paid', val: `₹${(totalPaid / 1000).toFixed(0)}K`, color: '#8a1652' },
          { label: 'TO COLLECT', val: `₹${(totalPending / 1000).toFixed(0)}K`, color: '#C94F8A' },
          { label: 'Total Quotation', val: totalQuotation >= 100000 ? `₹${(totalQuotation / 100000).toFixed(2)}L` : `₹${(totalQuotation / 1000).toFixed(0)}K`, color: '#D85C9E', sub: 'Non-converted' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${s.color}25 0%, ${s.color}10 100%)`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                <Title level={3} style={{ margin: 0, color: s.color }}>{s.val}</Title>
                <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{s.label}</Text>
                {s.sub && <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Tabs
        activeKey={activeKeyFor(activeTab)}
        onChange={(k) => { setActiveTab(k); setQuotStatusFilter('all'); }}
        items={filterTabs([
          {
            key: 'quotation-in-process',
            label: 'Quotation in Process',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(124,58,237,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${borderColor}` }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search reference, client..." allowClear value={quotSearch} onChange={(e) => setQuotSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                  <Select value={quotStatusFilter} onChange={setQuotStatusFilter} size="small" style={{ width: 180 }}>
                    <Option value="all">All</Option>
                    <Option value="In Process">In Process</Option>
                    <Option value="Paid">Paid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                  </Select>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={quotationList
                      .filter(q => quotStatusFilter === 'all' || q.status === quotStatusFilter)
                      .filter(q => !quotSearch || (q.quot || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.client || '').toLowerCase().includes(quotSearch.toLowerCase()) || (q.order || '').toLowerCase().includes(quotSearch.toLowerCase()))}
                    columns={makeQuotationColumns('in-process')}
                    pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ fontSize: 13 }}
                    onRow={(r) => ({
                      onClick: () => { setPaymentHistoryRecord(r); setPaymentHistoryOpen(true); },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'invoices',
            label: 'Invoices',
            children: (
              <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '10px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
                  <Input prefix={<SearchOutlined style={{ color: '#B11E6A' }} />} placeholder="Search invoice, client, order..." allowClear value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} />
                  <Select allowClear placeholder="Status" value={invoiceStatusFilter} onChange={(val) => { setInvoiceStatusFilter(val); setInvoicesPage(1); }} style={{ width: 170, borderRadius: 8 }}>
                    <Option value="Paid">Paid</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                    <Option value="Overdue">Overdue</Option>
                  </Select>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Table
                    dataSource={invoiceList.filter((inv) => {
                      const q = invoiceSearch.toLowerCase();
                      return !q || (inv.inv || '').toLowerCase().includes(q) || (inv.client || '').toLowerCase().includes(q) || (inv.order || '').toLowerCase().includes(q);
                    })}
                    columns={columns}
                    pagination={{
                      current: invoicesPage,
                      pageSize: invoicesPageSize,
                      total: invoicesData?.total || 0,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: (p, ps) => { setInvoicesPage(p); setInvoicesPageSize(ps); },
                      size: 'small',
                    }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    style={{ fontSize: 13 }}
                    onRow={(r) => ({
                      onClick: () => { setPaymentHistoryRecord({ ...r, docType: r.docType || 'Invoice' }); setPaymentHistoryOpen(true); },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </div>
              </Card>
            ),
          },
        ])}
        activeKey={activeKeyFor(activeTab)}
      />

      {/* ───────────── VIEW QUOTATION / INVOICE ───────────── */}
      <Modal
        open={viewModal}
        onCancel={() => setViewModal(false)}
        footer={null}
        width={Math.min(860, window.innerWidth - 32)}
        styles={{ body: { padding: '16px 12px', background: isDark ? '#1a1a2a' : '#f4f5f9' } }}
        title={
          <Space>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {viewDocType === 'quotation' ? `Quotation: ${selectedInv?.inv}` : `Invoice: ${selectedInv?.inv}`}
            </span>
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintDocument(viewDocType, selectedInv || {})}
            >
              Print
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              type="primary"
              style={{ background: 'linear-gradient(135deg,#2d5016,#4a7c24)', border: 'none' }}
              loading={!!selectedInv && downloadingKey === (selectedInv?.key || selectedInv?.inv || selectedInv?.quot)}
              onClick={() => handleDownloadDocument(viewDocType, selectedInv || {})}
            >
              PDF
            </Button>
          </Space>
        }
      >
        {selectedInv && (
          <DocumentTemplate type={viewDocType} data={selectedInv} settings={invoiceSettings} />
        )}
      </Modal>

      {/* ───────────── RECORD PAYMENT IN DRAWER ───────────── */}
      <Drawer
        open={recordPayOpen}
        onClose={() => setRecordPayOpen(false)}
        width={Math.min(520, window.innerWidth)}
        closable={false}
        styles={{
          body: { padding: 0, background: isDark ? '#f0f0f5' : '#f5f5f8', display: 'flex', flexDirection: 'column' },
          header: { display: 'none' },
          footer: { padding: 0, border: 'none' },
        }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fff', borderTop: '1px solid #e8e8e8' }}>
            <div>
              <Text style={{ fontSize: 13, color: '#666' }}>New Party Balance</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: 700, color: '#e53935' }}>
                  ₹{((payParty?.balance || 0) + computeNetPayable()).toLocaleString()}
                </Text>
                <span style={{ color: '#e53935', fontWeight: 700 }}>↑</span>
              </div>
            </div>
            <Button
              type="primary"
              onClick={handleSavePayment}
              style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', height: 48, paddingInline: 40, borderRadius: 10, fontSize: 16, fontWeight: 700 }}
            >
              Save
            </Button>
          </div>
        }
      >
        {/* ── Sticky header ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button type="text" icon={<LeftOutlined style={{ color: '#3730a3' }} />} onClick={() => setRecordPayOpen(false)} style={{ padding: 0, height: 'auto' }} />
            <Text style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', flex: 1 }}>Record Payment In</Text>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── Payment ref header ── */}
          <div style={{ background: '#fff', padding: '14px 16px', borderBottom: '1px solid #ebebeb' }}>
            <Text style={{ color: '#3730a3', fontWeight: 600, fontSize: 14 }}>Received Payment #{paymentRefNum}</Text>
            <div>
              <Text style={{ color: '#888', fontSize: 13 }}>{dayjs().format('D MMM YYYY')}</Text>
            </div>
          </div>

          {/* ── Party Name ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
                PARTY NAME <span style={{ color: '#e53935' }}>*</span>
              </Text>
              <Text style={{ fontSize: 13, color: '#555' }}>
                Current Balance:{' '}
                <span style={{ color: '#e53935', fontWeight: 700 }}>₹{(payParty?.balance || 0).toLocaleString()}</span>
                <span style={{ color: '#e53935', fontWeight: 700 }}> ↑</span>
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', height: 50, borderRadius: 8, background: '#f5f5f5', border: '1px solid #e0e0e0' }}>
              <UserOutlined style={{ color: '#aaa' }} />
              <Text style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{payParty?.name || '—'}</Text>
            </div>
          </div>

          {/* ── Amount ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#333', letterSpacing: 0.5 }}>
                AMOUNT <span style={{ color: '#e53935' }}>*</span>
              </Text>
            </div>
            <InputNumber
              prefix={<Text style={{ color: '#555', fontSize: 16, marginRight: 4 }}>₹</Text>}
              value={payAmount}
              onChange={(v) => setPayAmount(v || 0)}
              min={0}
              style={{ width: '100%', height: 50, borderRadius: 8, fontSize: 18 }}
              controls={false}
            />
            <Divider style={{ margin: '14px 0' }} />

            {/* ── Courier Charge ── */}
            <div style={{ marginBottom: payCourierVisible ? 10 : 0 }}>
              <Checkbox
                checked={payCourierVisible}
                onChange={(e) => { setPayCourierVisible(e.target.checked); if (!e.target.checked) setPayCourierAmount(0); }}
              >
                <Text style={{ fontSize: 13, fontWeight: 500 }}>Courier Charge</Text>
              </Checkbox>
              {payCourierVisible && (
                <div style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Courier / Shipping Amount</Text>
                  <InputNumber
                    prefix="₹"
                    value={payCourierAmount}
                    onChange={(v) => setPayCourierAmount(v || 0)}
                    min={0}
                    style={{ width: '100%', borderRadius: 8 }}
                    controls={false}
                  />
                </div>
              )}
            </div>

            {/* ── Round Off ── */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Checkbox
                  checked={payRoundOffVisible}
                  onChange={(e) => { setPayRoundOffVisible(e.target.checked); if (!e.target.checked) { setPayRoundOffAmount(0); setPayRoundOffType('addition'); } }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 500 }}>Round Off</Text>
                </Checkbox>
                {payRoundOffVisible && (
                  <Radio.Group
                    value={payRoundOffType}
                    onChange={(e) => setPayRoundOffType(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    size="small"
                  >
                    <Radio.Button value="addition">Addition</Radio.Button>
                    <Radio.Button value="discount">Discount</Radio.Button>
                  </Radio.Group>
                )}
              </div>
              {payRoundOffVisible && (
                <div style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Round Off Amount</Text>
                  <InputNumber
                    prefix="₹"
                    value={payRoundOffAmount}
                    onChange={(v) => setPayRoundOffAmount(v ?? 0)}
                    step={0.1}
                    precision={2}
                    min={0}
                    style={{ width: '100%', borderRadius: 8 }}
                    controls={false}
                  />
                  <Text style={{ fontSize: 12, color: payRoundOffType === 'discount' ? '#e53935' : '#16a34a', display: 'block', marginTop: 4 }}>
                    {payRoundOffType === 'discount'
                      ? `− ₹${(Number(payRoundOffAmount) || 0).toLocaleString()} will be subtracted from the total`
                      : `+ ₹${(Number(payRoundOffAmount) || 0).toLocaleString()} will be added to the total`}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* ── Invoice ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Invoice</Text>
            </div>
            {payLinkedInvoices.map((inv) => {
              // Courier charge AND round off both raise the invoice's own total before the
              // payment is credited (mirrors backend recordPayment: invoice.total +=
              // courierCharge + roundOff), so the preview here must grow the payable balance
              // by both — otherwise ticking either box doesn't move the Settled figure,
              // and it drifts from the New Party Balance total below (which already
              // includes both via computeNetPayable()).
              const courier = payCourierVisible ? Number(payCourierAmount) || 0 : 0;
              const roundOffAmt = payRoundOffVisible ? signedRoundOff : 0;
              const invBalanceWithExtras = r2(inv.balance + courier + roundOffAmt);
              const settled = Math.min(computeNetPayable(), invBalanceWithExtras);
              return (
                <div key={inv.key} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Text style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>#{inv.inv || inv.key}</Text>
                      <div>
                        <Text style={{ fontSize: 12, color: '#888' }}>
                          Inv Amt: {invBalanceWithExtras.toLocaleString()} • {dayjs(inv.date?.split(' ')[0] || undefined).format('D MMM YYYY')}
                        </Text>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 15, color: '#1a1a2e' }}>₹ {invBalanceWithExtras.toLocaleString()}</Text>
                      <div>
                        <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                          ₹{settled.toLocaleString()} Settled <CheckCircleOutlined />
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Payment Mode ── */}
          <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #ebebeb' }}>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', display: 'block', marginBottom: 10 }}>Payment Mode</Text>
            <Select
              value={payMode}
              onChange={(v) => { setPayMode(v); setPayBankAccount(null); setPayUpiRef(''); setPayCardLast4(''); setPayTransactionRef(''); setPayChequeNo(''); setPayChequeBank(''); setPayChequeDate(null); }}
              style={{ width: '100%', height: 44, marginBottom: 12 }}
            >
              {['Cash', 'UPI', 'Card', 'Net Banking', 'Bank Transfer', 'Cheque'].map(m => (
                <Option key={m} value={m}>{m}</Option>
              ))}
            </Select>
            {payMode === 'UPI' && (
              <div>
                <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>UPI Reference / Transaction ID <span style={{ color: '#e53935' }}>*</span></Text>
                <Input
                  placeholder="Enter UPI reference number"
                  value={payUpiRef}
                  onChange={(e) => setPayUpiRef(e.target.value)}
                  style={{ borderRadius: 8, height: 40 }}
                />
              </div>
            )}
            {payMode === 'Card' && (
              <Row gutter={12}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Card Last 4 Digits <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="e.g. 4321"
                    maxLength={4}
                    value={payCardLast4}
                    onChange={(e) => setPayCardLast4(e.target.value.replace(/\D/g, ''))}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Auth / Reference Code</Text>
                  <Input
                    placeholder="Auth code"
                    value={payTransactionRef}
                    onChange={(e) => setPayTransactionRef(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
              </Row>
            )}
            {(payMode === 'Net Banking' || payMode === 'Bank Transfer') && (
              <Row gutter={12}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Transaction Reference No. <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="UTR / Reference No."
                    value={payTransactionRef}
                    onChange={(e) => setPayTransactionRef(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Account <span style={{ color: '#e53935' }}>*</span></Text>
                  <Select
                    placeholder="Select Bank Account"
                    value={payBankAccount}
                    onChange={(v) => setPayBankAccount(v)}
                    style={{ width: '100%', height: 40 }}
                  >
                    {bankAccounts.map(b => <Option key={b} value={b}>{b}</Option>)}
                  </Select>
                </Col>
              </Row>
            )}
            {payMode === 'Cheque' && (
              <Row gutter={[12, 10]}>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Cheque Number <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="Enter cheque number"
                    value={payChequeNo}
                    onChange={(e) => setPayChequeNo(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Name <span style={{ color: '#e53935' }}>*</span></Text>
                  <Input
                    placeholder="e.g. HDFC Bank"
                    value={payChequeBank}
                    onChange={(e) => setPayChequeBank(e.target.value)}
                    style={{ borderRadius: 8, height: 40 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Cheque Date <span style={{ color: '#e53935' }}>*</span></Text>
                  <DatePicker
                    value={payChequeDate}
                    onChange={(d) => setPayChequeDate(d)}
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>Bank Account</Text>
                  <Select
                    placeholder="Select Bank Account"
                    value={payBankAccount}
                    onChange={(v) => setPayBankAccount(v)}
                    style={{ width: '100%', height: 40 }}
                  >
                    {bankAccounts.map(b => <Option key={b} value={b}>{b}</Option>)}
                  </Select>
                </Col>
              </Row>
            )}
          </div>

          {/* ── Note ── */}
          <div style={{ background: '#fff', padding: '12px 16px', minHeight: 56 }}>
            {!payNoteVisible ? (
              <div style={{ textAlign: 'right' }}>
                <Text
                  style={{ color: '#3730a3', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setPayNoteVisible(true)}
                >
                  + Note
                </Text>
              </div>
            ) : (
              <div>
                <Text style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Note</Text>
                <Input.TextArea
                  placeholder="Add a note..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  rows={3}
                  style={{ borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* ───────────── PAYMENT HISTORY / AUDIT TRAIL MODAL (row click) ───────────── */}
      <Modal
        title={
          <Space>
            <HistoryOutlined style={{ color: '#3730a3' }} />
            <span style={{ fontWeight: 700 }}>Payment History — #{paymentHistoryRecord?.inv || paymentHistoryRecord?.quot}</span>
          </Space>
        }
        open={paymentHistoryOpen}
        onCancel={() => setPaymentHistoryOpen(false)}
        footer={null}
        width={720}
        centered
      >
        {(() => {
          if (!paymentHistoryRecord) return null;
          const isFormalInvoice = paymentHistoryRecord.docType === 'Invoice';
          const entries = isFormalInvoice
            ? (invoicePaymentsData?.data || []).map((p) => ({
                key: p._id,
                when: p.paymentDate || p.createdAt,
                mode: p.paymentMode,
                amount: p.amount,
                courierCharge: p.courierCharge,
                roundOff: p.roundOff,
                net: p.netAmount,
                by: p.createdBy?.fullName || p.createdBy?.name || p.createdBy?.email || '—',
                note: p.note,
              }))
            : (paymentHistoryRecord.paymentCollection || []).map((e, idx) => ({
                key: idx,
                when: e.paymentDate || e.recordedAt || e.date,
                mode: e.paymentMode || e.paymentMethod,
                amount: e.baseAmount != null ? e.baseAmount : e.paidAmount,
                courierCharge: e.courierCharge,
                roundOff: e.roundOff,
                net: e.paidAmount,
                by: e.recordedByName || '—',
                note: e.note || e.notes,
              }));
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text type="secondary">Client: <Text strong>{paymentHistoryRecord.client}</Text></Text>
                <Text type="secondary">Balance: <Text strong style={{ color: paymentHistoryRecord.balance > 0 ? '#B11E6A' : '#52c41a' }}>₹{(paymentHistoryRecord.balance || 0).toLocaleString()}</Text></Text>
              </div>
              <Table
                dataSource={entries}
                size="small"
                pagination={false}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'No payments recorded yet' }}
                columns={[
                  { title: 'Date & Time', dataIndex: 'when', width: 160, render: (v) => v ? dayjs(v).format('D MMM YYYY, h:mm A') : '—' },
                  { title: 'Mode', dataIndex: 'mode', width: 100 },
                  { title: 'Amount', dataIndex: 'amount', width: 100, render: (v) => v != null ? `₹${Number(v).toLocaleString()}` : '—' },
                  { title: 'Courier Charge', dataIndex: 'courierCharge', width: 120, render: (v) => v ? `₹${Number(v).toLocaleString()}` : '—' },
                  { title: 'Round Off', dataIndex: 'roundOff', width: 100, render: (v) => v ? `${Number(v) < 0 ? '− ' : ''}₹${Math.abs(Number(v)).toLocaleString()}` : '—' },
                  { title: 'Net Paid', dataIndex: 'net', width: 110, render: (v) => <Text strong style={{ color: '#16a34a' }}>₹{Number(v || 0).toLocaleString()}</Text> },
                  { title: 'Recorded By', dataIndex: 'by', width: 150, render: (v) => <Space size={4}><UserOutlined style={{ color: '#aaa' }} />{v}</Space> },
                  { title: 'Note', dataIndex: 'note', width: 150, render: (v) => v || '—' },
                ]}
              />
            </>
          );
        })()}
      </Modal>

      {/* ───────────── CONVERT TO INVOICE MODAL (partial conversion) ───────────── */}
      <Modal
        title={
          <Space>
            <FileDoneOutlined style={{ color: convertDocType === 'order' ? '#B11E6A' : '#7c3aed' }} />
            <span style={{ fontWeight: 700 }}>
              Convert {convertDocType === 'order' ? 'Order' : 'Quotation'} to Invoice
            </span>
          </Space>
        }
        open={convertOpen}
        onCancel={() => setConvertOpen(false)}
        footer={null}
        width={460}
        centered
      >
        {convertQuot && (
          <div style={{ marginTop: 8 }}>
            {/* Source doc info */}
            <div style={{
              background: convertDocType === 'order' ? '#B11E6A10' : '#7c3aed10',
              border: `1px solid ${convertDocType === 'order' ? '#B11E6A33' : '#7c3aed33'}`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{convertDocType === 'order' ? 'Order' : 'Quotation'}</Text>
                <Text strong style={{ color: convertDocType === 'order' ? '#B11E6A' : '#7c3aed' }}>{convertQuot.quot}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                <Text strong>{convertQuot.client}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{convertDocType === 'order' ? 'Order' : 'Quotation'} Amount</Text>
                <Text strong style={{ color: '#B11E6A' }}>₹{convertQuot.total.toLocaleString()}</Text>
              </div>
            </div>

            {/* Previous due section */}
            {convertPreviousDue > 0 && (
              <div style={{ background: '#ff4d4f10', border: '1.5px solid #ff4d4f44', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />
                  <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>Previous Outstanding Balance</Text>
                </div>
                {convertPrevInvoices.map(inv => (
                  <div key={inv.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', borderBottom: '1px solid #ff4d4f20' }}>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {inv.inv} <Tag style={{ fontSize: 10, background: '#ff4d4f15', color: '#ff4d4f', border: 'none', borderRadius: 20 }}>{inv.status}</Tag>
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f' }}>₹{inv.balance.toLocaleString()}</Text>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 }}>
                  <Text strong style={{ fontSize: 13, color: '#ff4d4f' }}>Total Previous Due</Text>
                  <Text strong style={{ fontSize: 14, color: '#ff4d4f' }}>₹{convertPreviousDue.toLocaleString()}</Text>
                </div>
              </div>
            )}

            <Form layout="vertical">
              <Form.Item
                label={<Text strong>Amount to Convert to Invoice</Text>}
                help="Enter the full amount or a partial amount to convert"
              >
                <InputNumber
                  prefix="₹"
                  value={convertAmt}
                  onChange={(v) => setConvertAmt(v || 0)}
                  min={1}
                  max={convertQuot.total}
                  style={{ width: '100%', height: 44 }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/\₹\s?|(,*)/g, '')}
                />
              </Form.Item>
              {convertAmt < convertQuot.total && convertAmt > 0 && (
                <div style={{ background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: '#d46b08' }}>
                    Remaining ₹{(convertQuot.total - convertAmt).toLocaleString()} will stay in the {convertDocType === 'order' ? 'order' : 'quotation'}
                  </Text>
                </div>
              )}
            </Form>

            {/* Invoice total summary */}
            <div style={{ background: isDark ? '#1a0f14' : '#fdf5f9', border: `1px solid #B11E6A33`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>Current Invoice Amount</Text>
                <Text strong>₹{(convertAmt || 0).toLocaleString()}</Text>
              </div>
              {convertPreviousDue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#ff4d4f' }}>+ Previous Outstanding</Text>
                  <Text strong style={{ color: '#ff4d4f' }}>₹{convertPreviousDue.toLocaleString()}</Text>
                </div>
              )}
              <Divider style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 14 }}>Total Balance on Invoice</Text>
                <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>
                  ₹{((convertAmt || 0) + convertPreviousDue).toLocaleString()}
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setConvertOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', border: 'none', fontWeight: 700 }}
                onClick={handleConvertConfirm}
              >
                Confirm & Convert
              </Button>
            </div>
            <Divider style={{ margin: '14px 0 10px' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>or</Text>
            </Divider>
            <Button
              block
              icon={<CheckCircleOutlined />}
              style={{ background: 'linear-gradient(135deg,#3730a3,#6366f1)', border: 'none', color: '#fff', fontWeight: 700, height: 40, borderRadius: 8 }}
              onClick={() => {
                setConvertOpen(false);
                openRecordPay({ ...convertQuot, inv: convertQuot.quot });
              }}
            >
              Record Manually
            </Button>
          </div>
        )}
      </Modal>

      {/* ───────────── VIEW PROOF MODAL (Paid Quotation) ───────────── */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span style={{ fontWeight: 700 }}>View Payment Proof</span>
          </Space>
        }
        open={proofOpen}
        onCancel={() => setProofOpen(false)}
        footer={null}
        width={440}
        centered
      >
        {proofQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#1890ff10', border: '1px solid #1890ff33', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#1890ff' }}>{proofQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Client: </Text>
              <Text strong>{proofQuot.client}</Text>
            </div>
            <div style={{ textAlign: 'center', padding: '24px 0', background: '#f8f9ff', borderRadius: 10, border: '1px dashed #1890ff44' }}>
              <EyeOutlined style={{ fontSize: 36, color: '#1890ff', display: 'block', marginBottom: 10 }} />
              <Text style={{ color: '#555', fontSize: 13 }}>No proof uploaded yet for this quotation.</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Proof will appear here once uploaded by the team.</Text>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Button block onClick={() => setProofOpen(false)} style={{ height: 40, borderRadius: 8 }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── SET REMINDER MODAL (Paid / Partially Paid) ───────────── */}
      <Modal
        title={
          <Space>
            <BellOutlined style={{ color: '#fa8c16' }} />
            <span style={{ fontWeight: 700 }}>Set Automatic Reminder</span>
          </Space>
        }
        open={reminderOpen}
        onCancel={() => setReminderOpen(false)}
        footer={null}
        width={440}
        centered
      >
        {reminderQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#fa8c1610', border: '1px solid #fa8c1633', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#fa8c16' }}>{reminderQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Client: </Text>
              <Text strong>{reminderQuot.client}</Text>
            </div>
            <Form layout="vertical">
              <Form.Item label="Reminder Date" required>
                <DatePicker
                  style={{ width: '100%' }}
                  value={reminderDate}
                  onChange={setReminderDate}
                  disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                />
              </Form.Item>
              <Form.Item label="Reminder Time">
                <TimePicker
                  style={{ width: '100%' }}
                  value={reminderTime}
                  onChange={setReminderTime}
                  format="HH:mm"
                  use12Hours
                />
              </Form.Item>
              <Form.Item label="Send Reminder Via">
                <Select value={reminderMode} onChange={setReminderMode} style={{ width: '100%' }}>
                  <Option value="WhatsApp">WhatsApp</Option>
                  <Option value="SMS">SMS</Option>
                  <Option value="Email">Email</Option>
                  <Option value="All">All Channels</Option>
                </Select>
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setReminderOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#fa8c16,#d46b08)', border: 'none', fontWeight: 700 }}
                onClick={() => {
                  if (!reminderDate) { enqueueSnackbar('Please select a reminder date', { variant: 'warning' }); return; }
                  enqueueSnackbar(`Reminder scheduled for ${reminderDate.format('DD MMM YYYY')} via ${reminderMode}`, { variant: 'success' });
                  setReminderOpen(false);
                }}
              >
                Schedule Reminder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── EDIT GST MODAL (Invoices tab) ───────────── */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#B11E6A' }} />
            <span style={{ fontWeight: 700 }}>Edit GST — {gstEditInv?.inv}</span>
          </Space>
        }
        open={gstEditOpen}
        onCancel={() => setGstEditOpen(false)}
        footer={null}
        width={420}
        centered
      >
        {gstEditInv && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#B11E6A10', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Invoice</Text>
                <Text strong style={{ color: '#B11E6A' }}>{gstEditInv.inv}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Client</Text>
                <Text strong>{gstEditInv.client}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Base Amount</Text>
                <Text strong>₹{gstEditInv.amount.toLocaleString()}</Text>
              </div>
            </div>
            <Form layout="vertical">
              <Form.Item label={<Text strong>GST Amount <span style={{ color: '#ff4d4f' }}>*</span></Text>}>
                <InputNumber
                  prefix="₹"
                  value={gstEditValue}
                  onChange={(v) => setGstEditValue(v || 0)}
                  min={0}
                  style={{ width: '100%', height: 44 }}
                  controls={false}
                  autoFocus
                />
              </Form.Item>
            </Form>
            <div style={{ background: isDark ? '#1a0f14' : '#fdf5f9', border: '1px solid #B11E6A33', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>Base Amount</Text>
                <Text strong>₹{gstEditInv.amount.toLocaleString()}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#888' }}>GST</Text>
                <Text strong style={{ color: '#B11E6A' }}>₹{(gstEditValue || 0).toLocaleString()}</Text>
              </div>
              <Divider style={{ margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 14 }}>New Total</Text>
                <Text strong style={{ fontSize: 16, color: '#B11E6A' }}>
                  ₹{(gstEditInv.amount + (gstEditValue || 0)).toLocaleString()}
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setGstEditOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontWeight: 700 }}
                onClick={handleSaveGst}
              >
                Save GST
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────────── VERIFY PAYMENT MODAL (Paid Quotation) ───────────── */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontWeight: 700 }}>Manual Payment Verification</span>
          </Space>
        }
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        footer={null}
        width={420}
        centered
      >
        {verifyQuot && (
          <div style={{ marginTop: 8 }}>
            <div style={{ background: '#52c41a10', border: '1px solid #52c41a33', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Quotation: </Text>
              <Text strong style={{ color: '#52c41a' }}>{verifyQuot.quot}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>Amount: </Text>
              <Text strong>₹{verifyQuot.total.toLocaleString()}</Text>
            </div>
            <Form layout="vertical">
              <Form.Item label={<Text strong>Verified By <span style={{ color: '#ff4d4f' }}>*</span></Text>}>
                <Input
                  placeholder="Enter verifier's name"
                  value={verifierName}
                  onChange={e => setVerifierName(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
              <Form.Item label="Verification Date">
                <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} />
              </Form.Item>
              <Form.Item label="Verification Remarks">
                <Input.TextArea rows={2} placeholder="Optional remarks..." />
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button style={{ flex: 1 }} onClick={() => setVerifyOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                style={{ flex: 2, background: 'linear-gradient(135deg,#52c41a,#389e0d)', border: 'none', fontWeight: 700 }}
                onClick={() => {
                  if (!verifierName.trim()) { enqueueSnackbar('Please enter verifier name', { variant: 'warning' }); return; }
                  enqueueSnackbar(`Payment verified by ${verifierName}`, { variant: 'success' });
                  setVerifyOpen(false);
                }}
              >
                Mark as Verified
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
