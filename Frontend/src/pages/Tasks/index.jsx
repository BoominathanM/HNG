import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input, Tabs, Typography, Space,
  Badge, Avatar, Progress, Alert, Descriptions, Divider, Tooltip, Steps, Radio,
  DatePicker, InputNumber, Rate, Empty,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined,
  PlayCircleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined, ShoppingOutlined,
  FileImageOutlined, CheckCircleOutlined, AlertFilled, BulbOutlined, ExperimentOutlined,
  EditOutlined, DeleteOutlined, FieldTimeOutlined, RobotOutlined, TeamOutlined,
  InfoCircleOutlined, GiftOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import useTabAccess from '../../hooks/useTabAccess';
import usePageAccess from '../../hooks/usePageAccess';
import { estimateSecFor, secToHuman, perUnitLabel, unitToSec, secToUnit, ratingColor, ratingLabel } from '../../utils/taskTime';
import {
  useGetTasksQuery,
  useGetSuggestedTasksQuery,
  useLazyGetSuggestedTasksInsightQuery,
  useGetLatestTaskInsightQuery,
  useLazyGetOrderDispatchReadinessQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useDispatchTaskOrderMutation,
  useRequestEmergencyDispatchMutation,
  useRequestEmergencyDispatchForOrderMutation,
  useDeleteTaskMutation,
  useGetUsersQuery,
  useGetSalesOrdersQuery,
  useGetTaskTimeConfigsQuery,
  useCreateTaskTimeConfigMutation,
  useUpdateTaskTimeConfigMutation,
  useDeleteTaskTimeConfigMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;


const typeColor = { Production: '#B11E6A', 'Sticker Work': '#8a1652', Packing: '#C94F8A', Procurement: '#D85C9E', Internal: '#6b1240' };
const priorityColor = { Urgent: '#6b1240', High: '#B11E6A', Medium: '#C94F8A', Low: '#D85C9E' };
const statusColor = { 'In Progress': '#B11E6A', Pending: '#C94F8A', Completed: '#6b1240' };
const paymentColor = { Paid: 'success', Pending: 'warning', Partial: 'orange' };

// Once an order has been forwarded to the Dispatch queue (either automatically, when
// all its tasks finish, or manually via the "Dispatch" button here), it must not be
// forwarded again — the order sits as 'Dispatch Ready' until the Dispatch module itself
// confirms it (flips to 'Dispatched'). Both states mean "already sent, don't re-send".
const isAlreadySentToDispatch = (orderStatus) => orderStatus === 'Dispatch Ready' || orderStatus === 'Dispatched';

const kanbanCols = [
  { key: 'Pending', label: 'Pending', color: '#C94F8A' },
  { key: 'In Progress', label: 'In Progress', color: '#B11E6A' },
  { key: 'Completed', label: 'Completed', color: '#6b1240' },
];

// Normalizes a Task Name for grouping — Qty is tracked per distinct task name, not
// summed across different names (e.g. "Filling" and "Packing" each need the full
// required qty independently, they don't split it between them).
const normTaskName = (v) => (v || '').trim().toLowerCase();

// Separate Kit / Personalized Kit composition — mirrors Operations' separateKitGroups/
// personalizedKitGroups memos (OperationDetail.jsx) so Today's Checklist can show the same
// "which products are included" breakdown and offer the same kit packing task assignment,
// without touching the Operations page itself. Takes a raw Order doc (from useGetSalesOrdersQuery,
// same shape OperationDetail reads: order.items / order.kitOrders / order.kitDisplayUnit / order.qty).
function deriveKitGroups(order) {
  if (!order) return { separateKitGroups: [], personalizedKitGroups: [] };

  // Items packed inside a personalized outer bundle (order.packagingIncludes, configured in
  // Sales as "kits and products packed inside the personalized kit") need to be tagged
  // isIncludedInPersonalized so the personalizedKitGroups closure below routes them into the
  // Personalized Kit card instead of leaving them as disconnected standalone checklist cards.
  // This mirrors the derivation OperationDetail.jsx/Operations/index.jsx already do from the
  // same source fields — this page never computed it, so the field read below was always
  // undefined here, and a bundled separate product (e.g. a Comb added alongside a Dental Kit)
  // never made it into "Included in kit", only its own disconnected card further down.
  const ptArr = Array.isArray(order.productType) ? order.productType : (order.productType ? [order.productType] : []);
  const isPersonalizedOrder = ptArr.includes('personalized') || ptArr.includes('PERSONALIZED_KIT');
  const includesList = (order.packagingIncludes?.length ? order.packagingIncludes : (order.leadId?.packagingIncludes || [])) || [];
  const includeSet = new Set(includesList.map(String));
  order = {
    ...order,
    items: (order.items || []).map((it) => {
      const isIncludedInPersonalized = isPersonalizedOrder
        && (includeSet.has(String(it.kitId)) || includeSet.has(String(it.name || it.itemName)));
      // Mirrors Operations' allOrders item-category override (OperationDetail.jsx): a KIT nested
      // inside a personalized outer bundle is functionally a Separate Kit — it has to be
      // assembled/packed on its own before the outer Personalized Kit packing — even though Sales
      // tagged its own item row category as 'personalized' (it was added under the Personalized
      // tab, then also selected into packagingIncludes to be bundled inside the outer kit). Without
      // this override, separateKitGroups below never saw it (category never said 'separate_kit'),
      // so the "pack the inner kit first" gate never applied — only the merged Personalized Kit
      // card ever showed. A plain (non-kit) included product becomes 'separate_product', same as
      // Operations. Items NOT bundled into a personalized outer keep their own stored category.
      const category = isIncludedInPersonalized ? (it.isKit ? 'separate_kit' : 'separate_product') : it.category;
      return { ...it, isIncludedInPersonalized, category };
    }),
  };

  const separateKitGroups = (() => {
    const kitItems = (order.items || []).filter((it) => it.isKit && it.category === 'separate_kit');
    if (kitItems.length === 0) return [];
    // Group ALL sibling rows sharing the same kit identity together — Sales' applyKitsToForm
    // creates ONE order-item row PER kit product (e.g. Brush, Paste), each marked isKit:true
    // and sharing the same kitId/kitName, not one row for the kit with an embedded product
    // list. Deduping to just the first occurrence (as this used to) silently dropped every
    // other component from the breakdown, showing only 1 product (or none) per kit.
    const groups = new Map();
    kitItems.forEach((it) => {
      const gKey = it.kitId || it.kitName || it.kitType || it.name || it.itemName || 'sep_kit';
      if (!groups.has(gKey)) groups.set(gKey, []);
      groups.get(gKey).push(it);
    });
    return Array.from(groups.entries()).map(([gKey, groupItems]) => {
      const it = groupItems[0];
      const itKitNameLow = (it.kitName || it.kitType || '').toLowerCase();
      const ko = (order.kitOrders || []).find((k) =>
        (it.kitId && k.kitId && String(k.kitId) === String(it.kitId))
        || (k.kitName && itKitNameLow && k.kitName.toLowerCase() === itKitNameLow)
        || (k.kitType && itKitNameLow && k.kitType.toLowerCase() === itKitNameLow)
      );
      const overallQty = Number(ko?.overallQty) || Number(it.overallQty) || Number(it.requiredQty) || Number(it.qty) || 0;
      const configIncludes = Array.isArray(ko?.kitIncludes) && ko.kitIncludes.length > 0
        ? ko.kitIncludes
        : (Array.isArray(it.kitIncludes) && it.kitIncludes.length > 0 ? it.kitIncludes : []);
      const derivedItems = (order.items || []).filter((p) => {
        if (p.isKit === true) return false;
        if (p.isIncludedInPersonalized) return false;
        if (it.kitId && p.kitId) return String(p.kitId) === String(it.kitId);
        const pKitRefLow = (p.kitName || p.kitType || '').toLowerCase();
        if (pKitRefLow && itKitNameLow && pKitRefLow === itKitNameLow) return true;
        return p.category === 'separate_kit';
      });
      let kitItems2;
      if (configIncludes.length > 0) {
        kitItems2 = configIncludes.map((inc) => {
          const incId = typeof inc === 'object' ? String(inc.id ?? inc) : String(inc);
          const incQty = typeof inc === 'object' ? (Number(inc.qty) || 1) : 1;
          const matched = (order.items || []).find((p) =>
            !p.isKit && (p.itemName || p.name || '').toLowerCase() === incId.toLowerCase()
          );
          return { id: incId, perKitQty: incQty, ...(matched || {}) };
        });
      } else if (derivedItems.length > 0) {
        kitItems2 = derivedItems.map((p) => {
          const totalQty = Number(p.requiredQty) || Number(p.qty) || 1;
          const perKitQty = overallQty > 0 ? Math.max(1, Math.round(totalQty / overallQty)) : totalQty;
          return { ...p, id: p.itemName || p.name || '', perKitQty };
        });
      } else {
        // No kitIncludes config and no separate isKit:false member rows — the group's own
        // isKit:true sibling rows (Brush, Paste, …) ARE the kit's component products, each
        // already carrying its own per-kit qty.
        kitItems2 = groupItems.map((p) => ({ ...p, id: p.itemName || p.kitType || p.name || '', perKitQty: Number(p.qty) || 1 }));
      }
      const kitIncludes = kitItems2.map((p) => ({ id: p.id || p.itemName || p.name || '', qty: p.perKitQty || 1 }));
      // Kit-level (not per-component) Sticker/Printing — the OUTER Display Unit wrap's own
      // flags, sourced from order.kitOrders (Sales' "Per-Kit Order Details" card), used by
      // kitPrintGate to decide whether this kit's own outer packaging needs a print gate at
      // all. Deliberately NOT falling back to any single component's own it.sticker/it.printing
      // — those are a different, per-product concept (see kitPrintGate's comment).
      return { key: gKey, kitName: it.kitName || it.kitType || 'Separate Kit', kitId: it.kitId || '', kitIncludes, kitItems: kitItems2, overallQty, displayUnit: it.displayUnit || ko?.displayUnit || '', sticker: ko?.sticker || order.kitSticker || '', printing: ko?.printing || order.kitPrinting || '' };
    });
  })();

  const personalizedKitGroups = (() => {
    const personalizedKitItems = (order.items || []).filter((it) => (it.isKit || it.kitType) && it.category === 'personalized');
    const includedItems = (order.items || []).filter((it) => it.isIncludedInPersonalized);
    if (personalizedKitItems.length === 0 && includedItems.length === 0) return [];
    if (includedItems.length > 0) {
      const outerDU = order.kitDisplayUnit || '';
      const kitCount = (order.kitOrders || []).reduce((max, ko) => Math.max(max, Number(ko.overallQty) || 0), 0) || Number(order.qty) || 0;
      const kitItems = includedItems.map((it) => {
        const totalQty = Number(it.requiredQty) || Number(it.qty) || 1;
        const perKitQty = kitCount > 0 ? Math.max(1, Math.round(totalQty / kitCount)) : totalQty;
        return { ...it, id: it.itemName || it.name || '', perKitQty };
      });
      return [{ key: 'personalized', kitName: outerDU || 'Personalized Kit', kitIncludes: kitItems.map((p) => ({ id: p.id, qty: p.perKitQty })), kitItems, overallQty: kitCount, displayUnit: outerDU, sticker: order.kitSticker || '', printing: order.kitPrinting || '' }];
    }
    // Same grouping fix as separateKitGroups above — group sibling isKit:true rows
    // (Brush, Paste, …) sharing the same kit identity, instead of dropping all but the
    // first on a name-only dedup.
    const groups = new Map();
    personalizedKitItems.forEach((it) => {
      const gKey = it.kitId || it.kitName || 'pers_kit';
      if (!groups.has(gKey)) groups.set(gKey, []);
      groups.get(gKey).push(it);
    });
    return Array.from(groups.entries()).map(([gKey, groupItems]) => {
      const it = groupItems[0];
      const itKitNameLow = (it.kitName || it.kitType || '').toLowerCase();
      const ko = (order.kitOrders || []).find((k) =>
        (it.kitId && k.kitId && String(k.kitId) === String(it.kitId))
        || (k.kitName && itKitNameLow && k.kitName.toLowerCase() === itKitNameLow)
        || (k.kitType && itKitNameLow && k.kitType.toLowerCase() === itKitNameLow)
      );
      const overallQty = Number(ko?.overallQty) || Number(it.overallQty) || Number(it.requiredQty) || 0;
      const configIncludes = Array.isArray(ko?.kitIncludes) && ko.kitIncludes.length > 0
        ? ko.kitIncludes
        : (Array.isArray(it.kitIncludes) && it.kitIncludes.length > 0 ? it.kitIncludes : []);
      let kitItems;
      if (configIncludes.length > 0) {
        kitItems = configIncludes.map((inc) => {
          const incId = typeof inc === 'object' ? String(inc.id ?? inc) : String(inc);
          const incQty = typeof inc === 'object' ? (Number(inc.qty) || 1) : 1;
          const matched = (order.items || []).find((p) =>
            !p.isKit && (p.itemName || p.name || '').toLowerCase() === incId.toLowerCase()
          );
          return { id: incId, perKitQty: incQty, ...(matched || {}) };
        });
      } else {
        // No kitIncludes config — the group's own isKit:true sibling rows ARE the kit's
        // component products, each already carrying its own per-kit qty.
        kitItems = groupItems.map((p) => ({ ...p, id: p.itemName || p.kitType || p.name || '', perKitQty: Number(p.qty) || 1 }));
      }
      const kitIncludes = kitItems.map((p) => ({ id: p.id, qty: p.perKitQty || 1 }));
      // See separateKitGroups' comment above — kit-level Sticker/Printing, not per-component.
      return { key: gKey, kitName: it.kitName || it.kitType || 'Personalized Kit', kitId: it.kitId || '', kitIncludes, kitItems, overallQty, displayUnit: it.displayUnit || ko?.displayUnit || '', sticker: ko?.sticker || order.kitSticker || '', printing: ko?.printing || order.kitPrinting || '' };
    });
  })();

  return { separateKitGroups, personalizedKitGroups };
}

// How many of a Kit Packing group's kits are emergency, straight from the order's own
// splitDates — the same '__personalized__' / '__sepkit__:<kitId>' / legacy '__kit__' keys
// Backend/src/modules/tasks/tasks.controller.js's buildEmergencyQtyMap resolves for the
// per-product breakdown. Unlike that per-product map, the raw `qty` on these splitDates
// entries IS already expressed in KIT units (e.g. "10" = 10 of the kits), so no per-product
// proportional split is needed here — just resolve which entry (if any) matches this kit
// group's identity. `null` qty on a matching entry means "all of it is emergency".
function resolveKitEmergencyQty(orderDoc, category, kg) {
  const splitDates = orderDoc?.splitDates || [];
  // Sales' buildEmergencySelectionOptions keys a Separate Kit option off
  // `kitId || kitName || kitType` (falling back when a legacy row has no kitId) — `kg.key`
  // (deriveKitGroups' own group key) already resolves through that same chain, so match on
  // both it and the plain kitId to stay correct whichever one the dropdown actually used.
  const wantedKeys = category === 'personalized'
    ? new Set(['__personalized__', '__kit__'])
    : new Set([`__sepkit__:${kg?.key}`, `__sepkit__:${kg?.kitId}`, '__kit__']);
  for (const sd of splitDates) {
    const entries = [...(sd.products || []), { product: sd.product, qty: sd.qty }];
    for (const e of entries) {
      if (e.product && wantedKeys.has(e.product)) {
        return e.qty != null ? Number(e.qty) : (Number(kg?.overallQty) || 0);
      }
    }
  }
  return 0;
}

// Statuses that count as "printing done" — same enum/wording Order.items[].printingStatus and
// Operations' own Printing Status column already use (Yet to Receive/Received/Closed).
const KIT_DU_READY_STATUSES = ['Received', 'Closed'];

// Stable key for a kit GROUP's own outer packaging (Display Unit), used to store/read its
// printing status on order.printingStatusOverrides — same Map + same updateItemPrintingStatus
// endpoint every per-component printing status already round-trips through (see
// Backend/src/modules/operations/operations.controller.js updateItemPrintingStatus's
// by-product-name fallback), just keyed by a synthetic 'kitdu:<kitId>' product name instead of
// a real item name so it can never collide with an actual product. Mirrored in
// Operations/OperationDetail.jsx so either page can read/set the exact same value.
const kitDisplayUnitKey = (kg) => `kitdu:${String(kg.key || kg.kitId || kg.kitName || '').trim().toLowerCase()}`;

// Printing-status gate for Kit Packing Task Assignment — DISABLED BY REQUEST (2026-07-30):
// the user found this restriction too disruptive across multi-kit orders and asked for it
// removed entirely, with no replacement gate (mirrors the identical change in
// Operations/OperationDetail.jsx's own kitPrintGate). Kept as a function so every call site
// still gets a `{ blocked, ... }` shape unchanged — it just always reports not-blocked now.
// `kitDisplayUnitKey`/`KIT_DU_READY_STATUSES` above are left in place (Operations' status
// controls still track the value), they just no longer disable anything here.
function kitPrintGate() {
  return { blocked: false };
}

// ─────────────────────────────────────────────────────────────────────────
export default function Tasks() {
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);
  // Guaranteed-unique row IDs for Task Breakdown rows — Date.now() alone can collide
  // when "Add Task" fires twice in the same millisecond, which was silently merging
  // two different-named tasks (updates to one row's fields hit both rows at once).
  const subTaskIdRef = useRef(0);
  const nextSubTaskId = () => (subTaskIdRef.current += 1);
  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery({ limit: 500 });
  const { data: suggestedData } = useGetSuggestedTasksQuery();
  const suggestedList = suggestedData?.data || [];
  const [fetchTaskInsight, { isFetching: taskInsightLoading }] = useLazyGetSuggestedTasksInsightQuery();
  // Restores the last persisted "Get AI Insight" run on page load — no AI call, just
  // reads what the last run saved (see getLatestTaskInsight/TaskInsight on the backend).
  const { data: latestInsightData } = useGetLatestTaskInsightQuery();
  // null = nothing manually (re-)generated yet THIS session, so fall back to the last
  // persisted run. Once the user clicks "Get AI Insight" this session's result wins,
  // even though the persisted copy was also just updated to match it.
  const [manualInsight, setManualInsight] = useState(null);
  const [manualProductTasks, setManualProductTasks] = useState(null);
  const taskInsight = manualInsight !== null ? manualInsight : (latestInsightData?.data?.insight ?? null);
  // Per-product AI task recommendations from the last analysis, keyed by
  // `${orderCode}::${product}` (lowercased) — highlights the matching Suggested Tasks
  // chip on that product's own card instead of leaving the recommendation buried in the
  // summary text above.
  const aiProductTasks = manualProductTasks !== null ? manualProductTasks : (latestInsightData?.data?.productTasks ?? {});
  const handleGetTaskInsight = async () => {
    try {
      const res = await fetchTaskInsight().unwrap();
      setManualInsight(res?.data?.insight || '');
      setManualProductTasks(res?.data?.productTasks || {});
    } catch (err) {
      enqueueSnackbar(err?.data?.error || err?.data || 'AI insight failed.', { variant: 'error' });
    }
  };

  // Orders — drive the New Task modal's Order → Products selectors
  const { data: ordersData } = useGetSalesOrdersQuery({ limit: 500 });
  const ordersList = useMemo(() => ordersData?.data || [], [ordersData]);

  // Task Management department staff — populate the "Assign To" dropdown
  const { data: usersData } = useGetUsersQuery();
  const assignableUsers = useMemo(
    () => (usersData?.data || []).filter((u) => u.fullName && u.role && u.department === 'Task Management'),
    [usersData],
  );
  const [createTask] = useCreateTaskMutation();
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [dispatchTaskOrder, { isLoading: dispatching }] = useDispatchTaskOrderMutation();
  const [fetchOrderDispatchReadiness] = useLazyGetOrderDispatchReadinessQuery();
  const [requestEmergencyDispatch, { isLoading: requesting }] = useRequestEmergencyDispatchMutation();
  const [requestEmergencyDispatchForOrder, { isLoading: requestingOrder }] = useRequestEmergencyDispatchForOrderMutation();
  const [deleteTask] = useDeleteTaskMutation();

  // ── Time Management config ───────────────────────────────────────────────
  const { data: timeConfigData } = useGetTaskTimeConfigsQuery();
  const timeConfigs = useMemo(() => timeConfigData?.data || [], [timeConfigData]);
  const configTaskNameOptions = useMemo(() => {
    const seen = new Set();
    return timeConfigs.filter((c) => c.taskName && !seen.has(c.taskName) && seen.add(c.taskName))
      .map((c) => ({ value: c.taskName, label: c.taskName }));
  }, [timeConfigs]);
  // Suggested Tasks (Today's Checklist chips) — instead of dumping every configured task
  // name on every product card, only offer the ones that actually fit THIS product/order
  // spec. Two ways a config becomes relevant:
  //  1. Explicit scope: its `product` field (set in the Time Management modal) matches
  //     this item's product name exactly — an admin override, always wins.
  //  2. General config (product left blank): matched by keyword against the item's own
  //     spec — its product name (covers e.g. "Shampoo Filling" for a Shampoo line item),
  //     whether it's actually routed through the Sticker design queue (a literal sticker
  //     goes on the product itself), whether it needs a print step, and Box/Frosted
  //     Ziplock/Butter Paper/no-design items which are packed rather than stickered.
  //     This is what keeps a Box-routed item like Brush/Paste from suggesting "Sticker
  //     Placing" meant for a Sticker-routed item like Soap, and vice versa.
  // Generic-only task-name words — mirrors the backend's GENERIC_TASK_WORDS
  // (tasks.controller.js relevantTaskNamesFor) so both sides agree on which
  // blank-product configs are true catch-alls vs. product-specific ones.
  const GENERIC_TASK_WORDS = new Set(['pack', 'packing', 'sticker', 'stickering', 'stick', 'sticking', 'label', 'labeling', 'labelling', 'print', 'printing', 'filling', 'fill', 'placing', 'place', 'task']);
  const getRelevantTaskOptions = (item) => {
    const productKey = (item.product || '').toLowerCase();
    const productWords = productKey.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const isStickerRouted = item.designType === 'Sticker';
    const needsPrinting = !!item.needsPrinting;
    // Box / Frosted Ziplock / Butter Paper / no design step at all — these are packed,
    // not stickered directly onto the product.
    const isPackRouted = !isStickerRouted;
    // Suggested Tasks chips reuse the "orderId-productIndex" checklist card id.
    const orderIdStr = item.orderId?.toString ? item.orderId.toString() : item.orderId;
    // item.id is `${orderId}-${idx}` normally, or `${orderId}-${idx}-emg`/`-rem` when the
    // product was split into separate Emergency/Tentative cards (see computeSuggestedTasks'
    // isPartialEmergencySplit) — orderId (a Mongo ObjectId hex string) never contains a
    // hyphen, so the array index is always segment [1], regardless of a trailing suffix.
    // .split('-').pop() would incorrectly return "emg"/"rem" for a split card's id.
    const productIndex = typeof item.id === 'string' ? item.id.split('-')[1] : undefined;
    const requiredQty = Number(item.qty) || 0;

    const seen = new Set();
    const result = [];
    timeConfigs.forEach((c) => {
      if (!c.taskName || c.active === false || seen.has(c.taskName)) return;
      const name = c.taskName.toLowerCase();
      const cfgProduct = (c.product || '').trim().toLowerCase();
      let relevant;
      if (cfgProduct) {
        relevant = cfgProduct === productKey;
      } else {
        const mentionsProduct = productWords.some((w) => name.includes(w));
        // A blank-product config named e.g. "Personalized Kit Packing"/"Personalized Kit
        // Stickering" is a KIT-LEVEL task type (assigned with no productIndex at all, via
        // the Kit Packing Task Assignment card), not a per-product production step — mirrors
        // the backend's relevantTaskNamesFor exclusion. Without it, every such config's
        // generic "pack"/"stick" substring matched every routed product, offering a chip
        // (and, on the backend, requiring coverage) for a task type that can never actually
        // be recorded against this specific product.
        const isKitLevelName = /kit/.test(name);
        // A blank-product config whose name is made ONLY of generic words ("Packing",
        // "Sticker Placing") is a true catch-all and applies to every routed product. But a
        // name like "Paste Packing"/"Brush Packing" carries an extra specific word — it was
        // written for THAT product, not every pack-routed product — so it must fall through
        // to mentionsProduct instead of matching e.g. "Comb" just because it contains "pack".
        const nameWords = name.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
        const isGenericName = nameWords.length > 0 && nameWords.every((w) => GENERIC_TASK_WORDS.has(w));
        const isStickerTask = !isKitLevelName && isGenericName && /stick|label/.test(name);
        const isPrintTask = !isKitLevelName && isGenericName && /print/.test(name);
        const isPackTask = !isKitLevelName && isGenericName && /pack/.test(name);
        relevant = mentionsProduct
          || (isStickerRouted && isStickerTask)
          || (needsPrinting && isPrintTask)
          || (isPackRouted && isPackTask);
      }
      if (!relevant) return;
      seen.add(c.taskName);
      // Already fully assigned under this exact task name — don't keep offering it,
      // but other task names this product still needs stay available.
      const assignedKey = `${orderIdStr}-${productIndex}-${name}`;
      const rawAssigned = assignedQtyByKey.get(assignedKey) || 0;
      // Emergency/Tentative split cards (see computeSuggestedTasks' isPartialEmergencySplit)
      // share this same key since they share the same productIndex — discount whatever's
      // attributable to the sibling card's own qty (item.siblingQty) before comparing, so
      // assigning just the emergency batch doesn't also make the tentative card's identical
      // chip look already-covered (and vice versa).
      const assignedForThisCard = item.siblingQty ? Math.max(0, rawAssigned - item.siblingQty) : rawAssigned;
      const alreadyCovered = requiredQty > 0 && assignedForThisCard >= requiredQty;
      if (!alreadyCovered) result.push({ value: c.taskName, label: c.taskName });
    });
    return result;
  };
  const [createTimeConfig] = useCreateTaskTimeConfigMutation();
  const [updateTimeConfig] = useUpdateTaskTimeConfigMutation();
  const [deleteTimeConfig] = useDeleteTaskTimeConfigMutation();
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm] = Form.useForm();
  // Date-range filter for the Time Management "Configured Tasks" listing table —
  // no due-date-like field is displayed for these records, so this filters on createdAt.
  const [timeConfigDateRange, setTimeConfigDateRange] = useState(null);

  // Sum of qty already assigned per (orderId, productIndex, taskName) — lets the
  // Suggested Tasks chips stop offering a task name once it's already fully covered,
  // while still offering any OTHER task name the product still needs (each task name
  // needs the full qty independently — see normTaskName above).
  const assignedQtyByKey = useMemo(() => {
    const map = new Map();
    (tasksData?.data || []).forEach((t) => {
      const oid = (typeof t.orderId === 'object' ? t.orderId?._id : t.orderId)?.toString();
      if (!oid) return;
      const key = `${oid}-${t.productIndex ?? 'x'}-${(t.taskName || '').trim().toLowerCase()}`;
      map.set(key, (map.get(key) || 0) + (Number(t.qty) || 0));
    });
    return map;
  }, [tasksData]);

  const taskList = useMemo(() => (tasksData?.data || []).map((t) => {
    // Personalized/Separate Kit Packing tasks can carry MULTIPLE assignees
    // (assignedToMany/assigneeNames) — everyone selected shares one task record.
    // Every other task type still has exactly one assignee, so this list is a
    // single-item array for them and renders identically to before.
    const assigneeNameList = (Array.isArray(t.assigneeNames) && t.assigneeNames.length)
      ? t.assigneeNames
      : (Array.isArray(t.assignedToMany) && t.assignedToMany.length)
        ? t.assignedToMany.map((u) => u?.fullName).filter(Boolean)
        : [t.assignedTo?.fullName || t.assigneeName].filter(Boolean);
    return {
    key: t._id,
    id: t.taskCode,
    type: t.taskType || 'Packing',
    title: t.taskName || '',
    name: t.taskName || t.taskCode,
    order: t.orderId?.orderCode || '—',
    orderId: (typeof t.orderId === 'object' ? t.orderId?._id : t.orderId)?.toString() || null,
    orderItems: t.orderId?.items || [],
    orderStatus: t.orderId?.status || '',
    deliveryDate: t.orderId?.expectedDeliveryDate ? t.orderId.expectedDeliveryDate.slice(0, 10) : null,
    client: t.orderId?.clientName || t.clientName || '—',
    product: t.product || '—',
    assignedTo: assigneeNameList.join(', ') || '—',
    assignee: assigneeNameList.join(', ') || '',
    assigneeList: assigneeNameList,
    assigneeRole: t.assignedTo?.role || '',
    // Backend stores 'Done'; the UI keys everything off 'Completed'. Normalize for display.
    status: t.status === 'Done' ? 'Completed' : t.status,
    priority: t.priority || (t.isEmergency ? 'High' : 'Normal'),
    isEmergency: t.isEmergency,
    emergencyRequested: t.emergencyRequested || false,
    emergencyReason: t.emergencyReason || '',
    emergencySalesApproved: t.emergencySalesApproved || false,
    emergencyOpsApproved: t.emergencyOpsApproved || false,
    emergencyApproved: t.emergencyApproved || false,
    isSample: t.orderId?.orderCategory === 'SAMPLE' || t.orderId?.leadId?.leadType === 'SAMPLE',
    payment: t.paymentStatus || 'Pending',
    paymentStatus: t.paymentStatus || 'Pending',
    salesPerson: t.assignedTo?.fullName || t.assigneeName || '—',
    // Sample orders need no payment follow-up; only regular completed+unpaid orders do.
    salesFollowup: t.orderId?.orderCategory !== 'SAMPLE' && t.orderId?.leadId?.leadType !== 'SAMPLE' && t.status === 'Done' && (t.paymentStatus || 'Pending') !== 'Paid',
    due: t.dueDate ? t.dueDate.slice(0, 10) : undefined,
    qty: t.qty,
    subTasks: t.subTasks || [],
    description: t.description || '',
    printingType: t.printingType || '',
    startTime: t.startedAt || null,
    endTime: t.completedAt || null,
    // Time management
    timePerUnitSec: t.timePerUnitSec ?? null,
    estimatedDurationSec: t.estimatedDurationSec ?? null,
    actualDurationSec: t.actualDurationSec ?? null,
    plannedStartTime: t.plannedStartTime || null,
    plannedEndTime: t.plannedEndTime || null,
    rating: t.rating ?? null,
    ratingReason: t.ratingReason || '',
    efficiencyPct: t.efficiencyPct ?? null,
    feedback: t.feedback || '',
    createdAt: t.createdAt,
    };
  }), [tasksData]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  // Date-range filter for the Current Task (order-level) listing table — filters on
  // each order group's Expected Delivery Date, the date field already shown as a column.
  const [currentTaskDateRange, setCurrentTaskDateRange] = useState(null);
  const [mainTab, setMainTab] = useState('suggested');
  const { filterTabs, activeKeyFor } = useTabAccess('Task Management');
  const { requireAccess } = usePageAccess('Task Management');
  const [view, setView] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // New state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [emergencyDispatchOpen, setEmergencyDispatchOpen] = useState(false);
  const [emergencyTask, setEmergencyTask] = useState(null);
  const [emergencyForm] = Form.useForm();
  const [dispatchVerifyOpen, setDispatchVerifyOpen] = useState(false);
  const [dispatchVerifyData, setDispatchVerifyData] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm] = Form.useForm();
  // Task Breakdown by Quantity — lets one Assign Task action split the work across
  // multiple sub-tasks, each with its own assignee (mirrors the New Task modal).
  const [assignSubTasks, setAssignSubTasks] = useState([]);
  const addAssignSubTask = () => setAssignSubTasks((prev) => [...prev, { id: nextSubTaskId(), description: '', qty: '', assignee: '' }]);
  const removeAssignSubTask = (rid) => setAssignSubTasks((prev) => prev.filter((t) => t.id !== rid));
  const updateAssignSubTask = (rid, field, value) => setAssignSubTasks((prev) => prev.map((t) => (t.id === rid ? { ...t, [field]: value } : t)));

  // Kit Packing Task Assignment (Separate Kit / Personalized Kit) — same multi-assignee
  // pattern as Operations' Kit Packing modal (OperationDetail.jsx), surfaced here on
  // Today's Checklist so kit tasks can be assigned without leaving Task Management.
  const [kitPackingModalOpen, setKitPackingModalOpen] = useState(false);
  const [kitPackingModalCategory, setKitPackingModalCategory] = useState(null); // 'separate_kit' | 'personalized'
  const [kitPackingModalKitCfg, setKitPackingModalKitCfg] = useState(null);
  const [kitPackingModalOrder, setKitPackingModalOrder] = useState(null);
  const [kitSubTasks, setKitSubTasks] = useState([]);
  const addKitSubTask = () => setKitSubTasks((prev) => [...prev, { id: nextSubTaskId(), description: '', qty: '', assignees: [] }]);
  const removeKitSubTask = (id) => setKitSubTasks((prev) => prev.filter((t) => t.id !== id));
  const updateKitSubTask = (id, field, value) => setKitSubTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const openKitPackingModal = (kitGroup, category, orderDoc) => {
    if (!requireAccess('add')) return;
    setKitPackingModalCategory(category);
    setKitPackingModalKitCfg(kitGroup);
    setKitPackingModalOrder(orderDoc);
    setKitSubTasks([]);
    setKitPackingModalOpen(true);
  };

  // Existing Separate/Personalized Kit Packing task(s) per order — same "already assigned"
  // detection Operations does per-order (orderTasksData filtered by taskType), computed
  // once here across the full task list so every order card can check it by id.
  // Kept as arrays (not a single task) because "Add Another Task" can create MORE THAN ONE
  // Separate Kit Packing task per order (partial-qty batches) — gating below needs to know
  // every one of them is Done, not just that the first one exists.
  const kitPackingTasksByOrder = useMemo(() => {
    const map = {};
    (tasksData?.data || []).forEach((t) => {
      const oid = (typeof t.orderId === 'object' ? t.orderId?._id : t.orderId)?.toString();
      if (!oid) return;
      if (!map[oid]) map[oid] = { separateTasks: [], personalizedTasks: [] };
      if (t.taskType === 'Separate Kit Packing' || t.taskType === 'Kit Packing') {
        map[oid].separateTasks.push(t);
      } else if (t.taskType === 'Personalized Kit Packing') {
        map[oid].personalizedTasks.push(t);
      }
    });
    return map;
  }, [tasksData]);

  // kitPackingTasksByOrder groups ALL of an order's kit-packing tasks together regardless of
  // WHICH specific kit (e.g. Dental Kit vs Shaving Kit, both packed inside the same
  // Personalized order) they belong to — Task has no kitId field, only `product` (set to the
  // kit group's own kitName at creation, see submitKitPackingTask below). Without this extra
  // per-kit filter, assigning Dental Kit's task would make Shaving Kit's card ALSO show
  // "Add Another Task"/Done, and the Personalized Kit task could unlock before Shaving Kit's
  // own packing was ever assigned. Mirrors the identical fix in Operations/OperationDetail.jsx.
  const separateKitTasksFor = (orderId, kg) => {
    const all = (kitPackingTasksByOrder[String(orderId)] || {}).separateTasks || [];
    return all.filter((t) => (t.product || '').toLowerCase() === (kg?.kitName || '').toLowerCase());
  };
  const personalizedKitTasksFor = (orderId, kg) => {
    const all = (kitPackingTasksByOrder[String(orderId)] || {}).personalizedTasks || [];
    return all.filter((t) => (t.product || '').toLowerCase() === (kg?.kitName || '').toLowerCase());
  };

  const submitKitPackingTask = async () => {
    const kitCfg = kitPackingModalKitCfg;
    const orderDoc = kitPackingModalOrder;
    const isPersonalized = kitPackingModalCategory === 'personalized';
    const taskTypeName = isPersonalized ? 'Personalized Kit Packing' : 'Separate Kit Packing';
    const plannedStartTime = dayjs().toISOString();

    const filledKitSubTasks = kitSubTasks.filter((t) => t.description || t.qty || (t.assignees && t.assignees.length));
    if (filledKitSubTasks.length === 0) {
      enqueueSnackbar('Please add at least one task with a task name and at least one assignee', { variant: 'warning' });
      return;
    }
    const invalidKitSubTask = filledKitSubTasks.find((t) => !t.description || !(t.assignees && t.assignees.length));
    if (invalidKitSubTask) {
      enqueueSnackbar('Each task must have a Task Name and at least one assignee', { variant: 'warning' });
      return;
    }

    const product = kitCfg?.kitName || (isPersonalized ? 'Personalized Kit' : 'Separate Kit');
    const kitReqQty = kitCfg?.overallQty || 0;

    // Multiple assignees on ONE task: everyone selected shares the same task record
    // (mirrors Operations' submitKitPackingTask) so it shows up for every selected user.
    let successCount = 0;
    const rowErrors = [];
    for (const t of filledKitSubTasks) {
      const assigneeUsers = (t.assignees || []).map((aid) => assignableUsers.find((x) => x._id === aid)).filter(Boolean);
      const rowQty = Number(t.qty) || 0;
      const rowEstimate = estimateSecFor(timeConfigs, { taskName: t.description }, rowQty);
      const payload = {
        orderId: orderDoc?._id,
        taskName: t.description,
        taskType: taskTypeName,
        product,
        qty: rowQty,
        requiredQty: kitReqQty,
        assignedTo: assigneeUsers[0]?._id,
        assigneeName: assigneeUsers[0]?.fullName,
        assignedToMany: assigneeUsers.map((u) => u._id),
        assigneeNames: assigneeUsers.map((u) => u.fullName),
        clientName: orderDoc?.clientName,
        status: 'Pending',
        kitCategory: kitPackingModalCategory,
        plannedStartTime,
        ...(rowEstimate.matched ? { estimatedDurationSec: rowEstimate.estimatedSec } : {}),
      };
      try {
        await createTask(payload).unwrap(); // eslint-disable-line no-await-in-loop
        successCount += 1;
      } catch (e) {
        rowErrors.push(`${t.description}: ${e?.data?.message || e?.data || 'failed'}`);
      }
    }
    if (successCount > 0) {
      enqueueSnackbar(`${successCount} ${isPersonalized ? 'Personalized' : 'Separate'} Kit Packing task${successCount > 1 ? 's' : ''} assigned`, { variant: 'success' });
      setKitPackingModalOpen(false);
      setKitPackingModalKitCfg(null);
      setKitPackingModalCategory(null);
      setKitPackingModalOrder(null);
      setKitSubTasks([]);
    }
    if (rowErrors.length > 0) {
      enqueueSnackbar(rowErrors.join(' | '), { variant: 'error' });
    }
  };

  // Rich spec cards for items included in a kit — shows name, qty/kit, type/size/logo/printing.
  // Mirrors OperationDetail.jsx's renderKitProductSpecs so the composition looks identical
  // wherever it's shown.
  const renderKitProductSpecs = (kitItems, tagColor, overallQty) => {
    if (!kitItems?.length) return (
      <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic', display: 'block', marginTop: 6 }}>
        No products configured for this kit.
      </Text>
    );
    const border = tagColor === 'magenta' ? 'rgba(235,47,150,0.2)' : 'rgba(24,144,255,0.2)';
    const kitCount = Number(overallQty) || 0;
    return (
      <div style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#8c8c8c', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Included in 1 Kit ({kitItems.length} item{kitItems.length !== 1 ? 's' : ''})
        </Text>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {kitItems.map((item, i) => {
            const name = item.id || item.itemName || item.name || '';
            const perKitQty = item.perKitQty || item.qty || 1;
            // Actual production quantity needed for THIS product is the per-kit ratio
            // multiplied across every kit in the order (e.g. 1/kit × 10 kits = 10 total) —
            // showing only the per-kit ratio understates what packing staff actually need.
            const totalQty = kitCount > 0 ? perKitQty * kitCount : null;
            const type = item.type || item.variant || item.colour || '';
            const size = item.size || '';
            const logo = item.logo || (item.logoRequired ? 'Yes' : '');
            const printing = item.printing || '';
            const sticker = item.sticker || '';
            const hasSpecs = type || size || logo || printing || sticker;
            return (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${border}`,
                background: isDark ? 'rgba(255,255,255,0.03)' : (i % 2 === 0 ? '#fafafa' : '#fff'),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasSpecs ? 6 : 0 }}>
                  <Text strong style={{ fontSize: 13 }}>{String(name)}</Text>
                  <Space size={4}>
                    {totalQty != null && (
                      <Tag color={tagColor} style={{ margin: 0, fontWeight: 700, textAlign: 'center' }}>{totalQty} total</Tag>
                    )}
                    <Tag style={{ margin: 0, fontWeight: 600, minWidth: 52, textAlign: 'center' }}>× {perKitQty} / kit</Tag>
                  </Space>
                </div>
                {hasSpecs && (
                  <Space wrap size={4}>
                    {type && <Tag style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>Type: {type}</Tag>}
                    {size && <Tag style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>Size: {size}</Tag>}
                    {logo && <Tag color={String(logo).toLowerCase() === 'yes' ? 'green' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>Logo: {logo}</Tag>}
                    {printing && <Tag color={String(printing).toLowerCase() === 'yes' ? 'cyan' : 'default'} style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>Print: {printing}</Tag>}
                    {sticker && String(sticker).toLowerCase() !== 'no' && String(sticker).toLowerCase() !== 'none' && (
                      <Tag color="orange" style={{ fontSize: 10, margin: 0, borderRadius: 6 }}>Sticker: {sticker}</Tag>
                    )}
                  </Space>
                )}
              </div>
            );
          })}
        </Space>
      </div>
    );
  };

  // Group suggestedList: { hotelName: { orderCode: [items] } }
  const hotelGroups = useMemo(() => {
    const map = {};
    suggestedList.forEach((s) => {
      const hotel = s.client || 'Unknown';
      if (!map[hotel]) map[hotel] = {};
      const order = s.orderCode || 'Unknown';
      if (!map[hotel][order]) map[hotel][order] = [];
      map[hotel][order].push(s);
    });

    // An order's individual products drop off suggestedList the moment every one of
    // them is fully task-covered (see computeSuggestedTasks' fullyCovered check) — but
    // that order can still owe a Separate Kit Packing / Personalized Kit Packing task
    // (the outer kit assembly step, tracked separately from per-product tasks). Once the
    // last product suggestion clears, the whole order used to vanish from Today's
    // Checklist with that kit-packing task never surfaced for assignment. Re-add such
    // orders here with a placeholder entry (flagged __kitPlaceholder, filtered out of the
    // per-product card grid below) purely so the Kit Packing Task Assignment card — which
    // reads ordersList/kitPackingTasksByOrder directly, not these items — still renders.
    ordersList.forEach((o) => {
      // Also cover an order already forwarded to Dispatch Ready — dispatchOrder (backend)
      // forwards the whole order once any sibling task completes, without checking that the
      // Kit Packing task itself was ever assigned, so this placeholder needs to survive that
      // status flip too (mirrors computeSuggestedTasks' own widened order-status query).
      if (o.status !== 'In Production' && o.status !== 'Dispatch Ready') return;
      const hotel = o.clientName || 'Unknown';
      const orderCode = o.orderCode || 'Unknown';
      if (map[hotel]?.[orderCode]?.length) return; // already has real product suggestions
      const { separateKitGroups, personalizedKitGroups } = deriveKitGroups(o);
      if (separateKitGroups.length === 0 && personalizedKitGroups.length === 0) return;
      // Per-kit-group check — a placeholder must stay visible if ANY single kit group (e.g.
      // Shaving Kit) still needs assignment/completion, even if a SIBLING kit group (e.g.
      // Dental Kit) is already fully Done. An order-wide "some task somewhere is Done" check
      // would hide the card the moment just one kit finished, stranding the others.
      const separateNeedsAssignment = separateKitGroups.some((kg) => {
        const tasks = separateKitTasksFor(o._id, kg);
        return tasks.length === 0 || !tasks.every((t) => t.status === 'Done');
      });
      const personalizedNeedsAssignment = personalizedKitGroups.some((kg) => personalizedKitTasksFor(o._id, kg).length === 0);
      if (!separateNeedsAssignment && !personalizedNeedsAssignment) return;
      if (!map[hotel]) map[hotel] = {};
      map[hotel][orderCode] = [{
        __kitPlaceholder: true,
        orderId: o._id, orderCode, client: hotel,
        isUrgent: !!(o.isUrgent || o.isEmergency || o.emergencyApproved),
        fullyReady: true, // nothing stock-related is blocking — only kit assembly is left
        orderCreatedAt: o.createdAt,
      }];
    });
    return map;
  }, [suggestedList, ordersList, kitPackingTasksByOrder]);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  // ── Handlers ─────────────────────────────────────────────────────────
  const resolveTaskId = (taskId) => taskList.find((t) => t.id === taskId || t.key === taskId)?.key || taskId;

  const handleStartTask = async (taskId) => {
    try {
      await updateTaskStatus({ id: resolveTaskId(taskId), status: 'In Progress' }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to start task', { variant: 'error' });
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await updateTaskStatus({ id: resolveTaskId(taskId), status: 'Done' }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to complete task', { variant: 'error' });
    }
  };

  const handleFollowupDone = () => {
    enqueueSnackbar('Follow-up marked done', { variant: 'success' });
  };

  // Kanban drag-and-drop: dropping a card into a column transitions its status.
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const colKeyToStatus = { Pending: 'Pending', 'In Progress': 'In Progress', Completed: 'Done' };
  const handleKanbanDrop = async (colKey) => {
    const id = draggedTaskId;
    setDraggedTaskId(null);
    if (!id) return;
    if (!requireAccess('edit')) return;
    const task = taskList.find((t) => t.id === id || t.key === id);
    if (!task || task.status === colKey) return;
    try {
      await updateTaskStatus({ id: task.key, status: colKeyToStatus[colKey] || colKey }).unwrap();
    } catch (err) {
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to move task', { variant: 'error' });
    }
  };

  const handleCreateTask = async () => {
    try {
      const vals = await form.validateFields();
      // vals.orderId is a real Mongo ObjectId from the orders dropdown.
      const realOrderId = /^[a-f0-9]{24}$/i.test(vals.orderId || '') ? vals.orderId : undefined;
      // Resolve the selected order + product line item (for product name + qty).
      const selectedOrder = ordersList.find((o) => o._id === vals.orderId) || null;
      const productIndex = (vals.productIndex !== undefined && vals.productIndex !== null) ? Number(vals.productIndex) : undefined;
      const selectedItem = productIndex !== undefined ? (selectedOrder?.items || [])[productIndex] : null;
      const productName = selectedItem?.itemName || selectedItem?.product || undefined;
      const qty = Number(selectedItem?.qty) || undefined;
      const startDt = dayjs();
      // Sub-tasks from the Task Breakdown by Quantity section (rows with any content).
      const cleanSubTasks = newSubTasks
        .filter((st) => st.description || st.qty || st.assignee)
        .map((st) => {
          const u = assignableUsers.find((x) => x._id === st.assignee);
          return { label: st.description, qty: Number(st.qty) || 0, assignedTo: u?._id, assigneeName: u?.fullName };
        });
      const clientName = vals.client || selectedOrder?.clientName;
      // Each breakdown row with a different Task Name + assignee becomes its OWN task
      // in Task Management (not one task with an embedded breakdown). With no rows,
      // fall back to a single bare task (matches the previous optional-assign behavior).
      const rows = cleanSubTasks.length ? cleanSubTasks : [{ label: productName || 'New Task', qty, assignedTo: undefined, assigneeName: undefined }];
      let successCount = 0;
      const rowErrors = [];
      for (const row of rows) {
        const rowQty = Number(row.qty) || undefined;
        const rowEstimate = estimateSecFor(timeConfigs, { taskName: row.label }, rowQty);
        try {
          await createTask({ // eslint-disable-line no-await-in-loop
            taskName: row.label,
            clientName,
            assignedTo: row.assignedTo,
            assigneeName: row.assigneeName,
            orderId: realOrderId,
            product: productName,
            productIndex,
            qty: rowQty,
            status: 'Pending',
            plannedStartTime: startDt.toISOString(),
            ...(rowEstimate.matched ? {
              estimatedDurationSec: rowEstimate.estimatedSec,
              plannedEndTime: startDt.add(rowEstimate.estimatedSec, 'second').toISOString(),
            } : {}),
          }).unwrap();
          successCount += 1;
        } catch (e) {
          rowErrors.push(`${row.label || 'Task'}: ${e?.data?.message || e?.data || 'failed'}`);
        }
      }
      if (successCount > 0) {
        form.resetFields();
        setModalOpen(false);
        enqueueSnackbar(`${successCount} task${successCount > 1 ? 's' : ''} created`, { variant: 'success' });
      }
      if (rowErrors.length > 0) {
        enqueueSnackbar(rowErrors.join(' | '), { variant: 'error' });
      }
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to create task', { variant: 'error' });
    }
  };

  // Open the Assign-Task modal pre-filled from a Suggested-Task readiness card.
  // Task details (assignee, priority, due date) are mandatory — no direct assign.
  // Mirrors Operations' openAssignModal: just Order ID/Product + Task Breakdown by
  // Quantity — no Priority/Due Date/Description prompts. Priority and start time are
  // derived automatically instead of asked for, same as the Operations flow.
  // presetTaskName: set when opened from a "Suggested Tasks" quick-assign chip (e.g.
  // "Filling") — pre-fills the first breakdown row so the user doesn't retype it.
  const handleAssignSuggested = (s, presetTaskName) => {
    if (!requireAccess('add')) return;
    // Defense in depth for the own-print-gate chip only (it's already disabled in the UI) —
    // every other task for this product must stay assignable even while its Stickering
    // (Sticker-routed) or Packing (Box/Frosted Ziplock/Butter Paper + Printing) chip is
    // blocked on Printing Status, so this only fires for a matching preset name.
    const isOwnPrintGateTaskName = presetTaskName && (/stick|label/i.test(presetTaskName) || /pack|fill/i.test(presetTaskName));
    if (isOwnPrintGateTaskName && s.stickerPrintingReady === false) {
      enqueueSnackbar(`"${presetTaskName}" blocked for "${s.product}" — Printing Status must be Received/Closed first.`, { variant: 'warning' });
      return;
    }
    // Same defense-in-depth, for the pack/fill chip when this product's packing material
    // (box/ziplock/bottle/etc., tracked in Inventory > Material Stocks) is short — already
    // disabled in the UI, this only fires for a pack/fill-named preset.
    const isPackFillTaskName = presetTaskName && /pack|fill/i.test(presetTaskName);
    if (isPackFillTaskName && s.materialStockReady === false) {
      const sf = s.materialShortfall;
      const detail = sf ? ` — ${sf.material}${sf.size ? ` (${sf.size})` : ''}: ${sf.available} available, ${sf.needed} needed.` : '.';
      enqueueSnackbar(`Packing material not available for "${s.product}"${detail}`, { variant: 'warning' });
      return;
    }
    setAssignTarget(s);
    assignForm.resetFields();
    assignForm.setFieldsValue({
      orderId: s.orderCode,
      product: s.product,
      // Auto-fetch the start time from the assignment time (now).
      startTime: dayjs(),
    });
    setAssignSubTasks(presetTaskName ? [{ id: nextSubTaskId(), description: presetTaskName, qty: s.qty || '', assignee: '' }] : []);
    setAssignModalOpen(true);
  };

  // ── New Task modal: Order → Products → qty → estimate (mirrors Assign Task) ──
  const newOrderIdWatch = Form.useWatch('orderId', form);
  const newProductIdxWatch = Form.useWatch('productIndex', form);
  // The order selected in the New Task modal + its line items (for the Product dropdown).
  const newSelectedOrder = useMemo(
    () => ordersList.find((o) => o._id === newOrderIdWatch) || null,
    [ordersList, newOrderIdWatch],
  );
  const newOrderItems = useMemo(() => newSelectedOrder?.items || [], [newSelectedOrder]);
  const newSelectedItem = (newProductIdxWatch !== undefined && newProductIdxWatch !== null)
    ? newOrderItems[newProductIdxWatch] : null;
  const newTaskQty = Number(newSelectedItem?.qty) || 0;

  // New Task modal — Task Breakdown by Quantity (mirrors the Operations assign modal).
  const [newSubTasks, setNewSubTasks] = useState([]);
  const addNewSubTask = () => setNewSubTasks((prev) => [...prev, { id: nextSubTaskId(), description: '', qty: '', assignee: '' }]);
  const removeNewSubTask = (rid) => setNewSubTasks((prev) => prev.filter((t) => t.id !== rid));
  const updateNewSubTask = (rid, field, value) => setNewSubTasks((prev) => prev.map((t) => (t.id === rid ? { ...t, [field]: value } : t)));

  // Open the New Task modal with the start time pre-filled to now.
  const openNewTaskModal = () => {
    if (!requireAccess('add')) return;
    form.resetFields();
    form.setFieldsValue({ startTime: dayjs() });
    setNewSubTasks([]);
    setModalOpen(true);
  };

  // When the order changes, auto-fill client and reset the product + sub-tasks.
  const handleNewOrderChange = (orderId) => {
    const ord = ordersList.find((o) => o._id === orderId);
    form.setFieldsValue({ client: ord?.clientName || '', productIndex: undefined });
    setNewSubTasks([]);
  };

  // Submit the Assign-Task modal — mirrors Operations' submitAssignTask: no Priority/Due
  // Date/Description prompts, just the Task Breakdown rows. Priority is derived from the
  // order's own emergency flag instead of asked for, same as Operations does.
  const handleSubmitAssign = async () => {
    const s = assignTarget;
    if (!s) return;
    try {
      await assignForm.validateFields();
      // No top-level Task Title/Assign To anymore — require at least one filled task below.
      const filledSubTasks = assignSubTasks.filter((st) => st.description || st.qty || st.assignee);
      if (filledSubTasks.length === 0) {
        enqueueSnackbar('Please add at least one task with a task name and assignee', { variant: 'warning' });
        return;
      }
      const invalidSubTask = filledSubTasks.find((st) => !st.description || !st.assignee);
      if (invalidSubTask) {
        enqueueSnackbar('Each task must have a Task Name and an assignee', { variant: 'warning' });
        return;
      }
      const startDt = dayjs();
      const priority = s.isUrgent ? 'Urgent' : 'Medium';
      const cleanSubTasks = filledSubTasks.map((st) => {
        const u = assignableUsers.find((x) => x._id === st.assignee);
        return { label: st.description, qty: Number(st.qty) || 0, assignedTo: u?._id, assigneeName: u?.fullName };
      });
      // s.id is `${orderId}-${idx}` or `${orderId}-${idx}-emg`/`-rem` for a split
      // Emergency/Tentative card — the real order-item index is always segment [1] (see
      // getRelevantTaskOptions' matching comment); .pop() would misread "emg"/"rem" as the
      // index and send productIndex:NaN to the backend.
      const productIndex = typeof s.id === 'string' ? Number(s.id.split('-')[1]) : undefined;
      // Each breakdown row with a different Task Name + assignee becomes its OWN task
      // in Task Management (not one task with an embedded breakdown).
      let successCount = 0;
      const rowErrors = [];
      for (const row of cleanSubTasks) {
        const rowEstimate = estimateSecFor(timeConfigs, { taskName: row.label, taskType: 'Production' }, row.qty);
        try {
          await createTask({ // eslint-disable-line no-await-in-loop
            taskName: row.label,
            taskType: 'Production',
            priority,
            assignedTo: row.assignedTo,
            assigneeName: row.assigneeName,
            orderId: s.orderId,
            product: s.product,
            productIndex,
            qty: row.qty,
            clientName: s.client,
            status: 'Pending',
            isEmergency: s.isUrgent,
            plannedStartTime: startDt.toISOString(),
            ...(rowEstimate.matched ? {
              estimatedDurationSec: rowEstimate.estimatedSec,
              plannedEndTime: startDt.add(rowEstimate.estimatedSec, 'second').toISOString(),
            } : {}),
          }).unwrap();
          successCount += 1;
        } catch (e) {
          rowErrors.push(`${row.label || 'Task'}: ${e?.data?.message || e?.data || 'failed'}`);
        }
      }
      if (successCount > 0) {
        setAssignModalOpen(false);
        setAssignTarget(null);
        enqueueSnackbar(`${successCount} task${successCount > 1 ? 's' : ''} assigned for ${s.product}`, { variant: 'success' });
      }
      if (rowErrors.length > 0) {
        enqueueSnackbar(rowErrors.join(' | '), { variant: 'error' });
      }
    } catch (e) {
      if (e?.errorFields) return;
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to assign task', { variant: 'error' });
    }
  };

  // ── Time Management config handlers ──────────────────────────────────────
  const openConfigModal = (cfg = null) => {
    if (!requireAccess(cfg ? 'edit' : 'add')) return;
    setEditingConfig(cfg);
    configForm.resetFields();
    if (cfg) {
      configForm.setFieldsValue({
        taskName: cfg.taskName,
        product: cfg.product || '',
        inputValue: cfg.inputValue ?? secToUnit(cfg.timePerUnitSec, cfg.inputUnit || 'min'),
        inputUnit: cfg.inputUnit || 'min',
        notes: cfg.notes || '',
      });
    } else {
      configForm.setFieldsValue({ inputUnit: 'min' });
    }
    setConfigModalOpen(true);
  };

  const saveConfig = async () => {
    let vals;
    try { vals = await configForm.validateFields(); } catch { return; }
    const payload = {
      taskName: vals.taskName.trim(),
      product: (vals.product || '').trim(),
      inputValue: Number(vals.inputValue) || 0,
      inputUnit: vals.inputUnit || 'min',
      notes: vals.notes || '',
    };
    try {
      if (editingConfig) {
        await updateTimeConfig({ id: editingConfig._id, ...payload }).unwrap();
        enqueueSnackbar('Time standard updated', { variant: 'success' });
      } else {
        await createTimeConfig(payload).unwrap();
        enqueueSnackbar('Time standard added', { variant: 'success' });
      }
      setConfigModalOpen(false);
      setEditingConfig(null);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to save time standard', { variant: 'error' });
    }
  };

  const removeConfig = (cfg) => {
    if (!requireAccess('delete')) return;
    Modal.confirm({
      title: 'Delete time standard?',
      content: `Remove the configured time for "${cfg.taskName}"? Existing tasks keep their saved estimates.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTimeConfig(cfg._id).unwrap();
          enqueueSnackbar('Time standard deleted', { variant: 'success' });
        } catch (e) {
          enqueueSnackbar(e?.data?.message || e?.data || 'Failed to delete', { variant: 'error' });
        }
      },
    });
  };

  const openEmergency = (task) => {
    setEmergencyTask(task);
    emergencyForm.resetFields();
    setEmergencyDispatchOpen(true);
  };

  // Show dispatch info modal with order/task/payment details.
  const handleDispatchClick = async (task) => {
    const orderTasks = task.orderId ? taskList.filter((t) => t.orderId === task.orderId) : [];
    const notDone = orderTasks.filter((t) => t.status !== 'Completed');
    const unassigned = orderTasks.filter((t) => !t.assignee || t.assignee === '—');
    // missingProducts starts null (still loading) rather than [] — the modal treats null as
    // "not confirmed ready yet" so it can't flash a false green "Ready for Dispatch" for a
    // product that has zero tasks at all, which the notDone/unassigned checks above can't
    // catch on their own (they only ever look at tasks that already exist).
    setDispatchVerifyData({ task, orderTasks, notDone, unassigned, missingProducts: null });
    setDispatchVerifyOpen(true);
    if (task.orderId) {
      try {
        const res = await fetchOrderDispatchReadiness(task.orderId).unwrap();
        setDispatchVerifyData((prev) => (prev && prev.task === task
          ? { ...prev, missingProducts: res?.data?.missingProducts || [] }
          : prev));
      } catch {
        // Readiness preview couldn't be fetched — leave missingProducts null so the modal
        // keeps showing "checking" rather than silently trusting the naive task-only check.
      }
    } else {
      setDispatchVerifyData((prev) => (prev ? { ...prev, missingProducts: [] } : prev));
    }
  };

  // Forward the order linked to the task into the Dispatch queue (Dispatch Ready).
  // Actual "Dispatched" status is only set from within the Dispatch module itself.
  const handleConfirmDispatch = async (task) => {
    try {
      await dispatchTaskOrder(task.key).unwrap();
      enqueueSnackbar(`Order ${task.order || ''} sent to Dispatch`, { variant: 'success' });
      setDispatchVerifyOpen(false);
    } catch (e) {
      enqueueSnackbar(e?.data?.message || e?.data || 'Failed to send order to Dispatch', { variant: 'error' });
    }
  };

  // ── Inventory-based task suggestions ─────────────────────────────────
  const getSuggestedTasks = () => [];

  const getSmartSuggestion = (task) => {
    if (!task.orderId) return { text: 'Internal task — check with supervisor for instructions', alertType: 'info', canStart: true };
    return { text: 'Task is linked to an order — verify inventory and proceed as per production plan.', alertType: 'info', canStart: true };
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Task ID', dataIndex: 'id',
      render: (v, r) => {
        const isUrgent = r.isEmergency || r.priority === 'Urgent';
        return (
          <Space size={2} direction="vertical">
            <Space size={4} align="center">
              {isUrgent && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
              {r.isSample && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 13 }} />}
              <Button
                type="link"
                style={{ color: isUrgent ? '#ff4d4f' : '#B11E6A', padding: 0, fontWeight: 700 }}
                onClick={() => navigate(`/tasks/${r.key}`)}
              >
                {v}
              </Button>
            </Space>
            {isUrgent && (
              <Tag color="error" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Emergency Order</Tag>
            )}
            {r.isSample && (
              <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 6px', lineHeight: '18px' }}>Sample Order</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Logo',
      key: 'logo',
      render: (_, r) => (
        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#B11E6A10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileImageOutlined style={{ color: '#B11E6A' }} />
        </div>
      )
    },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ borderRadius: 20 }}>{v}</Tag> },
    {
      title: 'Title', dataIndex: 'title', width: 220,
      render: (v) => (
        <Tooltip title={v}>
          <Text style={{ display: 'block', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Current Task',
      key: 'suggestedTask',
      render: (_, r) => {
        const pending = (r.subTasks || []).find((s) => !s.done);
        if (pending?.label) {
          return (
            <Tooltip title={pending.assigneeName ? `Assigned to: ${pending.assigneeName}` : pending.label}>
              <Tag color="processing" style={{ fontSize: 11, margin: 0 }}>{pending.label}</Tag>
            </Tooltip>
          );
        }
        if (r.name) {
          return <Tag color="default" style={{ fontSize: 11, margin: 0, color: '#666' }}>{r.name}</Tag>;
        }
        return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
      },
    },
    {
      title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'], width: 180,
      render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Assignee', dataIndex: 'assignee', responsive: ['md'], width: 170,
      render: (v, r) => (r.assigneeList && r.assigneeList.length)
        ? (
          <Space direction="vertical" size={2}>
            {r.assigneeList.map((name, i) => (
              <Space key={i} size={4}><Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{name}</Space>
            ))}
          </Space>
        )
        : <Tag color="default" style={{ color: '#999', fontSize: 11 }}>Unassigned</Tag>,
    },
    { title: 'Priority', dataIndex: 'priority', responsive: ['sm'], render: (v) => <Tag color={priorityColor[v]}>{v}</Tag> },
    {
      title: 'Payment', dataIndex: 'paymentStatus', responsive: ['lg'],
      render: (v, r) => r.isSample
        ? <Tag color="blue" style={{ fontSize: 11 }}>Sample</Tag>
        : v ? <Tag color={paymentColor[v] || 'default'}>{v}</Tag> : <Text style={{ color: '#999', fontSize: 11 }}>N/A</Text>,
    },
    {
      title: 'Time / Rating', key: 'timeRating', responsive: ['lg'], width: 150,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {r.estimatedDurationSec > 0 && (
            <Tooltip title="Estimated duration">
              <Tag icon={<FieldTimeOutlined />} color="purple" style={{ fontSize: 11, margin: 0 }}>{secToHuman(r.estimatedDurationSec)}</Tag>
            </Tooltip>
          )}
          {r.status === 'Completed' && r.rating != null && (
            <Tooltip title={r.ratingReason || ratingLabel(r.rating)}>
              <Rate disabled allowHalf value={r.rating} style={{ fontSize: 12, color: ratingColor(r.rating) }} />
            </Tooltip>
          )}
          {!(r.estimatedDurationSec > 0) && !(r.status === 'Completed' && r.rating != null) && (
            <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
          )}
        </Space>
      ),
    },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Due', dataIndex: 'due', responsive: ['lg'] },
    {
      title: 'Action', key: 'action',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {r.status === 'Pending' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />}
              onClick={(e) => { e.stopPropagation(); handleStartTask(r.id); }} style={{ background: '#1890ff', border: 'none' }}>
              Start
            </Button>
          )}
          {r.status === 'In Progress' && (
            <Space direction="vertical" size={3}>
              <Tag color="processing" icon={<ClockCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>In Process</Tag>
              <Button size="small" type="primary" icon={<CheckOutlined />}
                onClick={(e) => { e.stopPropagation(); handleCompleteTask(r.id); }} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
                Done
              </Button>
            </Space>
          )}
          {r.status === 'Completed' && (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11, margin: 0 }}>Completed</Tag>
          )}
          {r.status !== 'Completed' && r.emergencyApproved && (
            <Tag color="red" icon={<AlertFilled />} style={{ fontSize: 11, margin: 0 }}>Emergency Approved</Tag>
          )}
          {(r.status === 'Completed' || r.emergencyApproved) && r.orderStatus === 'Dispatched' && (
            <Button size="small" disabled icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default' }}>
              Dispatched ✓
            </Button>
          )}
          {(r.status === 'Completed' || r.emergencyApproved) && r.orderStatus === 'Dispatch Ready' && (
            <Button size="small" disabled icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default' }}>
              Sent to Dispatch
            </Button>
          )}
          {(r.status === 'Completed' || r.emergencyApproved) && !isAlreadySentToDispatch(r.orderStatus) && (r.isSample || r.paymentStatus === 'Paid' || r.emergencyApproved) && !r.dispatchStatus && (
            <Button size="small" type="primary" icon={<ShoppingOutlined />}
              style={{ background: '#52c41a', border: 'none' }}
              onClick={(e) => { e.stopPropagation(); handleDispatchClick(r); }}>
              Dispatch
            </Button>
          )}
          {r.status === 'Completed' && !r.isSample && !r.emergencyApproved && !isAlreadySentToDispatch(r.orderStatus) && r.paymentStatus && r.paymentStatus !== 'Paid' && !r.dispatchStatus && (
            <Space direction="vertical" size={2}>
              <Tag color="warning" style={{ fontSize: 10 }}>Awaiting Payment</Tag>
              <Button size="small" danger icon={<ExclamationCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); openEmergency(r); }}>
                {r.emergencyRequested ? 'View Emergency' : 'Emergency'}
              </Button>
            </Space>
          )}
          {r.dispatchStatus && <Tag color="success">{r.dispatchStatus}</Tag>}
          {r.startTime && <Text style={{ fontSize: 10, color: '#666' }}>Start: {new Date(r.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
          {r.endTime && <Text style={{ fontSize: 10, color: '#666' }}>End: {new Date(r.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
        </Space>
      ),
    },
  ];

  const followupTasks = taskList.filter((t) => t.salesFollowup);
  const filtered = taskList.filter((t) => {
    if (!t.assignee) return false; // exclude unassigned from Current Task tab
    const q = (searchText || '').toLowerCase();
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.client && t.client.toLowerCase().includes(q)) || (t.assignee && t.assignee.toLowerCase().includes(q));
    const matchType = !filterType || t.type === filterType;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchType && matchPriority && matchStatus;
  });

  // Current Task tab: one row per order, expandable to reveal every task under it
  // (each of which can itself expand to show its Task Breakdown sub-tasks).
  const groupedByOrder = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      const groupKey = t.orderId || `no-order-${t.key}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          orderId: t.orderId,
          order: t.order,
          client: t.client,
          deliveryDate: t.deliveryDate,
          orderStatus: t.orderStatus,
          tasks: [],
        });
      }
      map.get(groupKey).tasks.push(t);
    });
    return Array.from(map.values()).map((g) => ({
      ...g,
      total: g.tasks.length,
      done: g.tasks.filter((t) => t.status === 'Completed').length,
      inProgress: g.tasks.filter((t) => t.status === 'In Progress').length,
      pending: g.tasks.filter((t) => t.status === 'Pending').length,
      hasEmergency: g.tasks.some((t) => t.isEmergency || t.priority === 'Urgent'),
    }));
  }, [filtered]);

  const orderColumns = [
    {
      title: 'Order ID', dataIndex: 'order',
      render: (v, r) => (
        <Space size={4}>
          {r.hasEmergency && <AlertFilled style={{ color: '#ff4d4f', fontSize: 13 }} />}
          <Text strong style={{ color: '#B11E6A' }}>{v}</Text>
        </Space>
      ),
    },
    { title: 'Client', dataIndex: 'client', render: (v) => v || '—' },
    {
      title: 'Tasks', key: 'taskCount',
      render: (_, r) => <Tag color="blue">{r.total} task{r.total !== 1 ? 's' : ''}</Tag>,
    },
    {
      title: 'Progress', key: 'progress',
      render: (_, r) => (
        <Space size={4} wrap>
          {r.done > 0 && <Tag color="success">{r.done} done</Tag>}
          {r.inProgress > 0 && <Tag color="processing">{r.inProgress} in progress</Tag>}
          {r.pending > 0 && <Tag color="default">{r.pending} pending</Tag>}
        </Space>
      ),
    },
    { title: 'Delivery Date', dataIndex: 'deliveryDate', responsive: ['lg'], render: (v) => v || '—' },
  ];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Task Management" items={[{ label: 'Task Management' }]} style={{ marginBottom: 0 }} />
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search tasks..." value={searchText}
            onChange={(e) => setSearchText(e.target.value)} allowClear style={{ width: 200, borderRadius: 8 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewTaskModal} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>New Task</Button>
        </Space>
      </div>

      {/* Sales follow-up alert bar */}
      {followupTasks.length > 0 && (
        <Alert
          type="warning" showIcon icon={<BellOutlined />}
          message={`${followupTasks.length} task(s) require Sales Follow-up`}
          description={
            <Space wrap>
              {followupTasks.map((t) => (
                <Tag key={t.id} color="orange">{t.id} — {t.salesPerson} → {t.client}</Tag>
              ))}
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Summary stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {kanbanCols.map((col) => {
          const count = taskList.filter((t) => t.status === col.key).length;
          return (
            <Col xs={8} key={col.key}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${col.color}25 0%, ${col.color}10 100%)`, boxShadow: `0 4px 20px ${col.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                  <Title level={3} style={{ margin: 0, color: col.color }}>{count}</Title>
                  <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{col.label}</Text>
                </Card>
              </motion.div>
            </Col>
          );
        })}
      </Row>

      {/* ── Main Tabs: Current Task | Today's Checklist ─────────────────────── */}
      <Tabs
        onChange={(k) => { setMainTab(k); setSelectedHotel(null); }}
        type="card"
        style={{ marginBottom: 0 }}
        items={filterTabs([
          {
            key: 'suggested',
            label: (
              <Space size={6}>
                <BulbOutlined />
                Today's Checklist
                {suggestedList.length > 0 && (
                  <Badge count={suggestedList.length} style={{ background: '#B11E6A' }} />
                )}
              </Space>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  icon={<BulbOutlined />}
                  message={(
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span>Today's Checklist — Hotel-wise Production</span>
                      {suggestedList.length > 0 && (
                        <Button
                          size="small"
                          icon={<RobotOutlined />}
                          loading={taskInsightLoading}
                          onClick={handleGetTaskInsight}
                          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', color: '#fff' }}
                        >
                          {taskInsightLoading ? 'Analysing...' : 'Get AI Insight'}
                        </Button>
                      )}
                    </div>
                  )}
                  description="Order products grouped by hotel — readiness here is based on inventory stock. Emergency orders are prioritized first, then oldest-placed orders. Stock shortages are marked in red."
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />

                {taskInsight && (
                  <div style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#B11E6A18,#D85C9E10)', border: '1.5px solid #B11E6A44' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, color: '#B11E6A', display: 'block', marginBottom: 4 }}>
                          AI Insight — Today's Priorities
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? '#e0e0e0' : '#333', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                          {taskInsight}
                        </Text>
                      </div>
                    </div>
                  </div>
                )}

                {suggestedList.length === 0 && Object.keys(hotelGroups).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <BulbOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
                    <Text type="secondary">No products awaiting task assignment</Text>
                  </div>
                ) : selectedHotel ? (
                  /* ── Order-wise view for selected hotel ── */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <Button size="small" onClick={() => setSelectedHotel(null)}>← Back to Hotels</Button>
                      <Title level={5} style={{ margin: 0, color: textColor }}>{selectedHotel}</Title>
                    </div>
                    {Object.entries(hotelGroups[selectedHotel] || {}).map(([orderCode, items]) => (
                      <div key={orderCode} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <ShoppingOutlined style={{ color: '#B11E6A' }} />
                          <Text strong style={{ color: textColor }}>{orderCode}</Text>
                          <Badge count={items.filter((i) => !i.__kitPlaceholder).length} style={{ background: '#B11E6A' }} />
                          {items.some((i) => i.isUrgent) && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                          {items.every((i) => i.fullyReady) && <Tag color="green" style={{ fontSize: 11 }}>All Ready</Tag>}
                        </div>

                        {/* Kit Packing Task Assignment — Separate Kit / Personalized Kit composition
                            + multi-assignee task assignment, mirroring Operations (OperationDetail.jsx). */}
                        {(() => {
                          const orderIdForGroup = items[0]?.orderId;
                          // Printing status (including the kit's own Display Unit — see kitPrintGate)
                          // is edited only from Operations' Product Specifications table, same as any
                          // other product; this page just reads whatever ordersList already has.
                          const orderDoc = ordersList.find((o) => String(o._id) === String(orderIdForGroup));
                          const { separateKitGroups, personalizedKitGroups } = deriveKitGroups(orderDoc);
                          if (separateKitGroups.length === 0 && personalizedKitGroups.length === 0) return null;
                          // Personalized Kit Packing must not just have SOME Separate Kit task
                          // assigned — EVERY Separate Kit / Kit Assembly group in this order (e.g.
                          // both Dental Kit AND Shaving Kit when an order packs more than one
                          // Separate Kit into the same Personalized Kit) needs its own task(s)
                          // assigned and ALL of them Done, not just whichever kit got a task first.
                          const separateAllDone = separateKitGroups.length === 0 || separateKitGroups.every((kg) => {
                            const tasks = separateKitTasksFor(orderIdForGroup, kg);
                            return tasks.length > 0 && tasks.every((t) => t.status === 'Done');
                          });
                          return (
                            <Card
                              size="small"
                              title={
                                <Space>
                                  <GiftOutlined style={{ color: '#722ed1' }} />
                                  <Text strong style={{ color: '#722ed1', fontSize: 13 }}>Kit Packing Task Assignment</Text>
                                </Space>
                              }
                              style={{ borderRadius: 12, border: 'none', marginBottom: 16, background: cardBg, boxShadow: '0 4px 20px rgba(114,46,209,0.06)' }}
                            >
                              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                                {separateKitGroups.map((kg) => {
                                  const printGate = kitPrintGate(kg, orderDoc, suggestedList);
                                  const kgTasks = separateKitTasksFor(orderIdForGroup, kg);
                                  const kgTask = kgTasks[0] || null;
                                  const kgAllDone = kgTasks.length > 0 && kgTasks.every((t) => t.status === 'Done');
                                  return (
                                  <div
                                    key={kg.key}
                                    style={{ padding: 14, borderRadius: 10, border: `1px solid ${printGate.blocked ? 'rgba(255,77,79,0.4)' : 'rgba(24,144,255,0.25)'}`, background: printGate.blocked ? (isDark ? '#2d1516' : '#fff1f0') : (isDark ? 'rgba(24,144,255,0.07)' : 'rgba(24,144,255,0.04)') }}
                                  >
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                      <Space wrap>
                                        <Tag color="blue" style={{ borderRadius: 12, fontWeight: 600, fontSize: 12 }}>Separate Kit</Tag>
                                        <Text strong style={{ fontSize: 13 }}>{kg.kitName}</Text>
                                        {kg.overallQty > 0 && <Tag color="geekblue">Total: {kg.overallQty} kits</Tag>}
                                        {(() => {
                                          const kEmQty = resolveKitEmergencyQty(orderDoc, 'separate_kit', kg);
                                          if (kEmQty <= 0) return null;
                                          return kEmQty >= kg.overallQty ? (
                                            <Tag color="error" icon={<AlertFilled />}>{kEmQty} kits — Emergency</Tag>
                                          ) : (
                                            <>
                                              <Tag color="error" icon={<AlertFilled />}>{kEmQty} kits Emergency</Tag>
                                              <Tag color="blue">{kg.overallQty - kEmQty} kits Regular</Tag>
                                            </>
                                          );
                                        })()}
                                        {kg.kitItems?.length > 0 && (
                                          <Tag color="blue" style={{ borderRadius: 10 }}>
                                            {kg.kitItems.length} product{kg.kitItems.length !== 1 ? 's' : ''} / kit
                                          </Tag>
                                        )}
                                      </Space>
                                      {renderKitProductSpecs(kg.kitItems, 'blue', kg.overallQty)}
                                      {printGate.blocked && (
                                        <Alert
                                          type="error"
                                          showIcon
                                          message={printGate.displayUnit
                                            ? `Blocked — Kit's own Display Unit Printing Status is "${printGate.status}". Set it to Received/Closed on the order's Product Specifications table in Operations before this kit can be packed.`
                                            : `Blocked — ${printGate.product}'s Printing Status is "${printGate.status || 'not set'}". Needs Received/Closed before this kit can be packed.`}
                                          style={{ borderRadius: 8, fontSize: 12 }}
                                        />
                                      )}
                                      {kgTask && (
                                        <Space wrap>
                                          <Tag color={kgAllDone ? 'green' : 'orange'} icon={<CheckCircleOutlined />} style={{ borderRadius: 8 }}>
                                            {kgAllDone ? 'Separate Kit Packing Done' : 'Separate Kit Task Assigned — Pending'}
                                          </Tag>
                                          <Text type="secondary" style={{ fontSize: 12 }}>{kgTask.taskName}</Text>
                                        </Space>
                                      )}
                                      <Button
                                        size="small"
                                        type="primary"
                                        disabled={printGate.blocked}
                                        icon={<TeamOutlined />}
                                        style={printGate.blocked ? { borderRadius: 8 } : { background: 'linear-gradient(135deg,#1677ff,#69b1ff)', border: 'none', borderRadius: 8 }}
                                        onClick={() => !printGate.blocked && openKitPackingModal(kg, 'separate_kit', orderDoc)}
                                      >
                                        {kgTask ? 'Add Another Task' : 'Assign Separate Kit Task'}
                                      </Button>
                                    </Space>
                                  </div>
                                  );
                                })}

                                {personalizedKitGroups.map((kg) => {
                                  const separateDone = separateAllDone;
                                  const printGate = kitPrintGate(kg, orderDoc, suggestedList);
                                  const kgTasks = personalizedKitTasksFor(orderIdForGroup, kg);
                                  const kgTask = kgTasks[0] || null;
                                  return (
                                    <div
                                      key={kg.key}
                                      style={{
                                        padding: 14, borderRadius: 10,
                                        border: '1px solid rgba(177,30,106,0.25)',
                                        background: isDark ? 'rgba(177,30,106,0.07)' : 'rgba(177,30,106,0.04)',
                                        opacity: separateDone ? 1 : 0.6,
                                      }}
                                    >
                                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                        <Space wrap>
                                          <Tag color="magenta" style={{ borderRadius: 12, fontWeight: 600, fontSize: 12 }}>Personalized Kit</Tag>
                                          <Text strong style={{ fontSize: 13 }}>{kg.kitName}</Text>
                                          {kg.overallQty > 0 && <Tag color="purple">Total: {kg.overallQty} kits</Tag>}
                                          {(() => {
                                            const kEmQty = resolveKitEmergencyQty(orderDoc, 'personalized', kg);
                                            if (kEmQty <= 0) return null;
                                            return kEmQty >= kg.overallQty ? (
                                              <Tag color="error" icon={<AlertFilled />}>{kEmQty} kits — Emergency</Tag>
                                            ) : (
                                              <>
                                                <Tag color="error" icon={<AlertFilled />}>{kEmQty} kits Emergency</Tag>
                                                <Tag color="blue">{kg.overallQty - kEmQty} kits Regular</Tag>
                                              </>
                                            );
                                          })()}
                                          {kg.kitItems?.length > 0 && (
                                            <Tag color="magenta" style={{ borderRadius: 10 }}>
                                              {kg.kitItems.length} product{kg.kitItems.length !== 1 ? 's' : ''} / kit
                                            </Tag>
                                          )}
                                        </Space>
                                        {!separateDone && (
                                          <Alert
                                            type="warning"
                                            showIcon
                                            message="Mark the separate kit packing task(s) as Done before assigning personalized kit tasks."
                                            style={{ borderRadius: 8, fontSize: 12 }}
                                          />
                                        )}
                                        {renderKitProductSpecs(kg.kitItems, 'magenta', kg.overallQty)}
                                        {printGate.blocked && (
                                          <Alert
                                            type="error"
                                            showIcon
                                            message={printGate.displayUnit
                                              ? `Blocked — Kit's own Display Unit Printing Status is "${printGate.status}". Set it to Received/Closed on the order's Product Specifications table in Operations before this kit can be packed.`
                                              : `Blocked — ${printGate.product}'s Printing Status is "${printGate.status || 'not set'}". Needs Received/Closed before this kit can be packed.`}
                                            style={{ borderRadius: 8, fontSize: 12 }}
                                          />
                                        )}
                                        {kgTask && (
                                          <Space wrap>
                                            <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 8 }}>Personalized Kit Task Assigned</Tag>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{kgTask.taskName}</Text>
                                          </Space>
                                        )}
                                        <Button
                                          size="small"
                                          type="primary"
                                          disabled={!separateDone || printGate.blocked}
                                          icon={<TeamOutlined />}
                                          style={separateDone && !printGate.blocked ? { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8 } : { borderRadius: 8 }}
                                          onClick={() => separateDone && !printGate.blocked && openKitPackingModal(kg, 'personalized', orderDoc)}
                                        >
                                          {kgTask ? 'Add Another Task' : 'Assign Personalized Kit Task'}
                                        </Button>
                                      </Space>
                                    </div>
                                  );
                                })}
                              </Space>
                            </Card>
                          );
                        })()}

                        <Row gutter={[16, 16]}>
                          {items.filter((s) => !s.__kitPlaceholder).map((s) => {
                            // Design/printing are hard-gated server-side — every item reaching this
                            // checklist is print/design-complete already, so readiness here is purely
                            // about stock.
                            const readyAlertType = s.stockReady ? 'success' : 'error';
                            const readyText = s.stockReady
                              ? 'All resources ready — safe to assign and start production.'
                              : 'Stock Not Available — insufficient inventory to fully produce this item.';
                            // Own-print gate: a product routed to its own design/packaging destination
                            // (Sticker always, or Box/Frosted Ziplock/Butter Paper whenever this item
                            // also needs Printing — e.g. Soap: Packing Material=Box, Printing=Yes) can't
                            // have its matching Stickering/Packing task assigned until THIS product's
                            // own Printing Status (Operations → Product Specifications table) reaches
                            // Received/Closed. This blocks ONLY the matching suggested-task chip below
                            // (shown with a red border/background) — every other task for the same
                            // product and the general "Assign Task" button stay fully usable.
                            const printGateBlocked = s.stickerPrintingReady === false;
                            // Packing-material gate: a Personalized Kit Packing / Filling task can't be
                            // assigned until this product's own packing material (box/ziplock/bottle/etc.,
                            // tracked in Inventory > Material Stocks) has enough stock. Blocks ONLY the
                            // matching pack/fill chip below — same shape as the Stickering gate above.
                            const materialBlocked = s.materialStockReady === false;
                            return (
                              <Col xs={24} md={12} lg={8} key={s.id}>
                                <motion.div whileHover={{ y: -2 }}>
                                  <Card
                                    style={{
                                      borderRadius: 12,
                                      border: s.stockReady ? 'none' : '1.5px solid #ff4d4f',
                                      background: s.stockReady ? cardBg : (isDark ? '#2d1516' : '#fff1f0'),
                                      boxShadow: s.stockReady ? '0 4px 20px rgba(177,30,106,0.06)' : '0 4px 20px rgba(255,77,79,0.15)',
                                    }}
                                    styles={{ body: { padding: 16 } }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                      <Space size={4} wrap>
                                        {s.isUrgent && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                                        {s.logoType && <Tag color="purple" style={{ fontSize: 11 }}>{s.logoType}</Tag>}
                                      </Space>
                                      <Text style={{ fontSize: 11, color: '#999' }}>{s.orderCode}</Text>
                                    </div>
                                    <Text strong style={{ display: 'block', marginBottom: 4, color: textColor }}>{s.product}</Text>
                                    <Space size={4} wrap style={{ marginBottom: 10 }}>
                                      {/* Per-product emergency count (kit-aware — see backend buildEmergencyQtyMap):
                                          only some kits/products in an order may be marked emergency via splitDates,
                                          so this is a DIFFERENT (and often smaller) number than the order-level
                                          "Emergency" tag above implies. When the product is fully emergency
                                          (emergencyQty >= qty) show one red tag for the full qty; when only part
                                          of it is (a partial splitDate qty), split into Emergency + Regular tags
                                          so the two counts always add up to the product's total qty. */}
                                      {s.isEmergencyProduct && s.emergencyQty > 0 && s.emergencyQty >= s.qty && (
                                        <Tag color="error" icon={<AlertFilled />}>{Number(s.qty).toLocaleString()} units — Emergency</Tag>
                                      )}
                                      {s.isEmergencyProduct && s.emergencyQty > 0 && s.emergencyQty < s.qty && (
                                        <>
                                          <Tag color="error" icon={<AlertFilled />}>{Number(s.emergencyQty).toLocaleString()} Emergency</Tag>
                                          <Tag color="blue">{Number(s.qty - s.emergencyQty).toLocaleString()} Regular</Tag>
                                        </>
                                      )}
                                      {!s.isEmergencyProduct && s.qty > 0 && <Tag color="blue">{Number(s.qty).toLocaleString()} units</Tag>}
                                      {/* Tentative/remaining split card only (see computeSuggestedTasks'
                                          isPartialEmergencySplit) — mirrors Operations' own "After Emergency
                                          Items" tag: informational only, this card is still fully assignable,
                                          it's just a reminder that the emergency batch (its own separate
                                          card, shown first) should be handled/dispatched first. */}
                                      {s.isEmergencyGated && (
                                        <Tooltip title="Emergency batch for this product should be completed and dispatched first">
                                          <Tag color="orange">After Emergency Items</Tag>
                                        </Tooltip>
                                      )}
                                      <Tag color={s.stockReady ? 'green' : 'red'}>
                                        {s.stockReady ? `Stock: ${s.inventoryStock ?? '—'}` : `Stock Not Available${s.inventoryStock != null ? ` (${s.inventoryStock})` : ''}`}
                                      </Tag>
                                    </Space>
                                    <Alert
                                      type="info"
                                      showIcon
                                      icon={<InfoCircleOutlined />}
                                      message="Stock already deducted for this order"
                                      style={{ borderRadius: 8, marginBottom: 8, fontSize: 12 }}
                                    />
                                    <Alert
                                      type={readyAlertType}
                                      showIcon
                                      message={readyText}
                                      style={{ borderRadius: 8, marginBottom: 12, fontSize: 12 }}
                                    />
                                    {materialBlocked && (
                                      <Alert
                                        type="error"
                                        showIcon
                                        message={s.materialShortfall
                                          ? `Packing Material Not Available — ${s.materialShortfall.material}${s.materialShortfall.size ? ` (${s.materialShortfall.size})` : ''}: ${s.materialShortfall.available} available, ${s.materialShortfall.needed} needed.`
                                          : 'Packing Material Not Available for this product.'}
                                        style={{ borderRadius: 8, marginBottom: 12, fontSize: 12 }}
                                      />
                                    )}
                                    {/* Suggested Tasks — quick-assign chips, filtered to only the configured
                                        task names that actually fit THIS product/order spec (see
                                        getRelevantTaskOptions): explicit per-product configs, or general
                                        configs matched by product-name/sticker/print/pack keywords.
                                        When printGateBlocked, the Stickering chip turns red/disabled for
                                        Sticker-routed products, and the pack/fill-named chip turns
                                        red/disabled for Box/Frosted Ziplock/Butter Paper products that
                                        also need Printing — same gate, applied to whichever chip is this
                                        product's own design/packaging step. Pack/fill-named chips also
                                        turn red/disabled when materialBlocked (packing material out of
                                        stock) — every other chip for this product stays clickable. When
                                        the last "Get AI Insight" run recommended task(s) for THIS exact
                                        product (matched via aiProductTasks, keyed by orderCode::product),
                                        that chip is moved first and highlighted gold with a robot icon —
                                        the AI's product-wise call, not just the summary paragraph above. */}
                                    {(() => {
                                      const relevantOptions = s.stockReady ? getRelevantTaskOptions(s) : [];
                                      if (relevantOptions.length === 0) return null;
                                      const aiKey = `${s.orderCode}::${s.product}`.toLowerCase();
                                      const aiTasks = (aiProductTasks[aiKey] || []).map((t) => String(t).toLowerCase());
                                      const sortedOptions = aiTasks.length
                                        ? [...relevantOptions].sort((a, b) => {
                                            const rank = (opt) => {
                                              const i = aiTasks.indexOf(opt.value.toLowerCase());
                                              return i === -1 ? aiTasks.length : i;
                                            };
                                            return rank(a) - rank(b);
                                          })
                                        : relevantOptions;
                                      return (
                                        <div style={{ marginBottom: 12 }}>
                                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Suggested Tasks</Text>
                                          <Space size={4} wrap>
                                            {sortedOptions.map((opt) => {
                                              const isStickerRouted = s.designType === 'Sticker';
                                              const isStickerOption = /stick|label/i.test(opt.value);
                                              const isPackFillOption = /pack|fill/i.test(opt.value);
                                              // Sticker-routed products gate their Stickering-named chip;
                                              // Box/Frosted Ziplock/Butter Paper products that also need
                                              // Printing gate their pack/fill-named chip instead — same
                                              // printGateBlocked flag, different chip depending on routing.
                                              const optStickerBlocked = printGateBlocked && isStickerRouted && isStickerOption;
                                              const optPrintPackBlocked = printGateBlocked && !isStickerRouted && isPackFillOption;
                                              const optMaterialBlocked = materialBlocked && isPackFillOption;
                                              const optBlocked = optStickerBlocked || optPrintPackBlocked || optMaterialBlocked;
                                              const isAiRecommended = !optBlocked && aiTasks.includes(opt.value.toLowerCase());
                                              const tooltipTitle = (optStickerBlocked || optPrintPackBlocked)
                                                ? `Blocked — Printing Status is "${s.itemPrintingStatus || 'not set'}". Needs Received/Closed first.`
                                                : optMaterialBlocked
                                                  ? `Blocked — Packing material not available${s.materialShortfall ? ` (${s.materialShortfall.material}${s.materialShortfall.size ? ` ${s.materialShortfall.size}` : ''}: ${s.materialShortfall.available}/${s.materialShortfall.needed})` : ''}.`
                                                  : (isAiRecommended ? 'AI recommended — from the last "Get AI Insight" analysis' : '');
                                              return (
                                                <Tooltip key={opt.value} title={tooltipTitle}>
                                                  <Tag
                                                    style={{
                                                      cursor: optBlocked ? 'not-allowed' : 'pointer',
                                                      borderRadius: 10,
                                                      borderColor: optBlocked ? '#ff4d4f' : (isAiRecommended ? '#faad14' : '#B11E6A66'),
                                                      background: optBlocked ? (isDark ? '#2d1516' : '#fff1f0') : (isAiRecommended ? (isDark ? '#2b2111' : '#fffbe6') : undefined),
                                                      color: optBlocked ? '#ff4d4f' : (isAiRecommended ? '#ad6800' : '#B11E6A'),
                                                    }}
                                                    onClick={() => !optBlocked && handleAssignSuggested(s, opt.value)}
                                                  >
                                                    {isAiRecommended && <RobotOutlined style={{ marginRight: 4 }} />}+ {opt.label}
                                                  </Tag>
                                                </Tooltip>
                                              );
                                            })}
                                          </Space>
                                        </div>
                                      );
                                    })()}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                      <Button
                                        size="small" type="primary" icon={<UserOutlined />}
                                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                                        onClick={() => handleAssignSuggested(s)}
                                      >
                                        Assign Task
                                      </Button>
                                    </div>
                                  </Card>
                                </motion.div>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── Hotel cards view ── */
                  <Row gutter={[16, 16]}>
                    {Object.entries(hotelGroups).map(([hotel, orders]) => {
                      const allItems = Object.values(orders).flat();
                      // Kit-packing placeholder entries (see hotelGroups above) aren't real
                      // pending products — exclude them from the item/stock counts below, but
                      // keep them in urgentCount so an emergency order waiting only on kit
                      // packing still flags the hotel card red.
                      const realItems = allItems.filter((i) => !i.__kitPlaceholder);
                      const readyCount = realItems.filter((i) => i.fullyReady).length;
                      const urgentCount = allItems.filter((i) => i.isUrgent).length;
                      const orderCount = Object.keys(orders).length;
                      return (
                        <Col xs={24} sm={12} md={8} lg={6} key={hotel}>
                          <motion.div whileHover={{ y: -3 }}>
                            <Card
                              hoverable
                              onClick={() => setSelectedHotel(hotel)}
                              style={{ borderRadius: 12, border: '1.5px solid', borderColor: urgentCount > 0 ? '#ff4d4f' : isDark ? '#333' : '#f0e0eb', background: cardBg, cursor: 'pointer' }}
                              styles={{ body: { padding: 16 } }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Avatar style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', fontSize: 16 }}>
                                  {hotel.charAt(0).toUpperCase()}
                                </Avatar>
                                {urgentCount > 0 && <Tag color="red" style={{ fontSize: 11 }}>Emergency</Tag>}
                              </div>
                              <Text strong style={{ display: 'block', fontSize: 14, color: textColor, marginBottom: 6, lineHeight: '1.3' }}>{hotel}</Text>
                              <Space size={[4, 4]} wrap style={{ marginBottom: 8 }}>
                                <Tag color="blue">{orderCount} order{orderCount !== 1 ? 's' : ''}</Tag>
                                <Tag color="default">{realItems.length} item{realItems.length !== 1 ? 's' : ''}</Tag>
                                {readyCount > 0 && <Tag color="green">{readyCount} stock ready</Tag>}
                                {realItems.length - readyCount > 0 && <Tag color="red">{realItems.length - readyCount} stock short</Tag>}
                              </Space>
                              <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', marginTop: 4 }}>
                                Click to view orders →
                              </div>
                            </Card>
                          </motion.div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            ),
          },
          {
            key: 'current',
            label: 'Current Task',
            children: (
              <div>
                {/* Sub-view toggle + filters row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <Button.Group>
                    <Button type={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} style={view === 'table' ? { background: '#B11E6A', border: 'none' } : {}}>Table</Button>
                    <Button type={view === 'kanban' ? 'primary' : 'default'} onClick={() => setView('kanban')} style={view === 'kanban' ? { background: '#B11E6A', border: 'none' } : {}}>Kanban</Button>
                  </Button.Group>
                  {view === 'table' && (
                    <>
                      <Select allowClear placeholder="Type" value={filterType} onChange={setFilterType} style={{ width: 150, borderRadius: 8 }}>
                        {Object.keys(typeColor).map((t) => <Option key={t} value={t}>{t}</Option>)}
                      </Select>
                      <Select allowClear placeholder="Priority" value={filterPriority} onChange={setFilterPriority} style={{ width: 130, borderRadius: 8 }}>
                        {Object.keys(priorityColor).map((p) => <Option key={p} value={p}>{p}</Option>)}
                      </Select>
                      <Select allowClear placeholder="Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 140, borderRadius: 8 }}>
                        {Object.keys(statusColor).map((s) => <Option key={s} value={s}>{s}</Option>)}
                      </Select>
                      <DatePicker.RangePicker
                        style={{ borderRadius: 8 }}
                        onChange={(dates) => setCurrentTaskDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                        allowClear
                      />
                    </>
                  )}
                </div>

                {/* Table sub-view */}
                {view === 'table' && (
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                    <div className="table-responsive" style={{ padding: '4px' }}>
                      <Table
                        dataSource={groupedByOrder.filter((g) => {
                          if (currentTaskDateRange) {
                            const d = g.deliveryDate || '';
                            if (d < currentTaskDateRange[0] || d > currentTaskDateRange[1]) return false;
                          }
                          return true;
                        })}
                        columns={orderColumns}
                        rowKey="key"
                        pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, size: 'small' }}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        expandable={{
                          expandedRowRender: (group) => (
                            <Table
                              dataSource={group.tasks}
                              columns={columns}
                              rowKey="key"
                              pagination={false}
                              size="small"
                              scroll={{ x: 'max-content' }}
                              expandable={{
                                rowExpandable: (record) => (record.subTasks || []).length > 0,
                                expandedRowRender: (record) => (
                                  <Table
                                    dataSource={record.subTasks.map((s, i) => ({ ...s, key: i }))}
                                    pagination={false}
                                    size="small"
                                    columns={[
                                      { title: 'Task', dataIndex: 'label', render: (v) => <Text strong>{v || '—'}</Text> },
                                      { title: 'Qty', dataIndex: 'qty', render: (v) => v ? Number(v).toLocaleString() : '—' },
                                      {
                                        title: 'Assigned To', dataIndex: 'assigneeName',
                                        render: (v) => v
                                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                                          : <Text type="secondary">Unassigned</Text>,
                                      },
                                      {
                                        title: 'Status', dataIndex: 'done',
                                        render: (v) => v
                                          ? <Tag color="success" icon={<CheckCircleOutlined />}>Done</Tag>
                                          : <Tag color="processing">In Progress</Tag>,
                                      },
                                    ]}
                                  />
                                ),
                              }}
                              onRow={(record) => ({
                                onClick: () => navigate(`/tasks/${record.key}`),
                                style: {
                                  cursor: 'pointer',
                                  background: (record.isEmergency || record.priority === 'Urgent')
                                    ? (isDark ? '#2d1516' : '#fff2f0')
                                    : '',
                                  borderLeft: (record.isEmergency || record.priority === 'Urgent')
                                    ? '3px solid #ff4d4f'
                                    : '',
                                },
                              })}
                            />
                          ),
                        }}
                      />
                    </div>
                  </Card>
                )}

                {/* Kanban sub-view */}
                {view === 'kanban' && (
                  <Row gutter={[16, 16]}>
                    {kanbanCols.map((col) => (
                      <Col xs={24} md={8} key={col.key}>
                        <Card
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleKanbanDrop(col.key)}
                          title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                              <Text strong>{col.label}</Text>
                              <Badge count={taskList.filter((t) => t.status === col.key).length} style={{ background: col.color }} />
                            </div>
                          }
                          style={{ borderRadius: 14, border: draggedTaskId ? `1px dashed ${col.color}` : 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', minHeight: 400 }}
                          styles={{ body: { padding: '8px' } }}
                        >
                          {filtered.filter((t) => t.status === col.key).map((task) => (
                            <motion.div
                              key={task.id}
                              whileHover={{ y: -2 }}
                              draggable
                              onDragStart={() => setDraggedTaskId(task.id)}
                              onDragEnd={() => setDraggedTaskId(null)}
                              style={{ cursor: 'grab' }}
                            >
                              <Card size="small" style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${col.color}20` }} styles={{ body: { padding: '10px 12px' } }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Button type="link" style={{ padding: 0, color: '#B11E6A', fontWeight: 700, height: 'auto' }}
                                    onClick={() => navigate(`/tasks/${task.key}`)}>
                                    {task.id}
                                  </Button>
                                  {task.salesFollowup && (
                                    <Tooltip title={`${task.salesPerson} → follow up on ${task.client}`}>
                                      <BellOutlined style={{ color: '#fa8c16' }} />
                                    </Tooltip>
                                  )}
                                </div>
                                <Tag color={typeColor[task.type]} style={{ marginBottom: 6, borderRadius: 20, fontSize: 11 }}>{task.type}</Tag>
                                <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{task.title}</Text>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <Space size={4}><Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} /><Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{task.assignee}</Text></Space>
                                  <Tag color={priorityColor[task.priority]} style={{ margin: 0, fontSize: 11 }}>{task.priority}</Tag>
                                </div>
                                {task.isSample
                                  ? <Tag color="blue" style={{ fontSize: 10, marginBottom: 6 }}>Sample</Tag>
                                  : task.paymentStatus && <Tag color={paymentColor[task.paymentStatus] || 'default'} style={{ fontSize: 10, marginBottom: 6 }}>{task.paymentStatus}</Tag>
                                }
                                <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 8 }}>
                                  {task.status === 'Pending' && (
                                    <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartTask(task.id)} style={{ background: '#1890ff', border: 'none', width: '100%' }}>Start</Button>
                                  )}
                                  {task.status === 'In Progress' && (
                                    <>
                                      <Tag color="processing" icon={<ClockCircleOutlined />} style={{ fontSize: 11, marginBottom: 4, display: 'block', textAlign: 'center' }}>In Process</Tag>
                                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteTask(task.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', width: '100%' }}>Done</Button>
                                    </>
                                  )}
                                  {task.status === 'Completed' && (
                                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11, marginBottom: 4, display: 'block', textAlign: 'center' }}>Completed</Tag>
                                  )}
                                  {task.status !== 'Completed' && task.emergencyApproved && (
                                    <Tag color="red" icon={<AlertFilled />} style={{ fontSize: 11, marginBottom: 4, display: 'block', textAlign: 'center' }}>Emergency Approved</Tag>
                                  )}
                                  {(task.status === 'Completed' || task.emergencyApproved) && task.orderStatus === 'Dispatched' && (
                                    <Button size="small" disabled icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default', width: '100%' }}>
                                      Dispatched ✓
                                    </Button>
                                  )}
                                  {(task.status === 'Completed' || task.emergencyApproved) && task.orderStatus === 'Dispatch Ready' && (
                                    <Button size="small" disabled icon={<CheckCircleOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44', background: '#52c41a11', cursor: 'default', width: '100%' }}>
                                      Sent to Dispatch
                                    </Button>
                                  )}
                                  {(task.status === 'Completed' || task.emergencyApproved) && !isAlreadySentToDispatch(task.orderStatus) && (task.isSample || task.paymentStatus === 'Paid' || task.emergencyApproved) && !task.dispatchStatus && (
                                    <Button size="small" type="primary" icon={<ShoppingOutlined />} style={{ background: '#52c41a', border: 'none', width: '100%' }}
                                      onClick={(e) => { e.stopPropagation(); handleDispatchClick(task); }}>Dispatch</Button>
                                  )}
                                  {task.status === 'Completed' && !task.isSample && !task.emergencyApproved && task.paymentStatus && task.paymentStatus !== 'Paid' && !task.dispatchStatus && (
                                    <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={(e) => { e.stopPropagation(); openEmergency(task); }} style={{ width: '100%' }}>
                                      {task.emergencyRequested ? 'View Emergency' : 'Emergency Dispatch'}
                                    </Button>
                                  )}
                                  {task.startTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Started: {new Date(task.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                                  {task.endTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Ended: {new Date(task.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                                </Space>
                              </Card>
                            </motion.div>
                          ))}
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            ),
          },
          {
            key: 'timeconfig',
            label: (
              <Space size={6}>
                <FieldTimeOutlined />
                Time Management
              </Space>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  icon={<ClockCircleOutlined />}
                  message="Per-Task Time Standards"
                  description="Set how long ONE unit of each task takes (e.g. Sticker placing = 10s, Packing = 1m). When a task is assigned, the estimated duration = this time × quantity. On completion, the actual time is auto-rated against this estimate."
                  style={{ marginBottom: 16, borderRadius: 8 }}
                />
                <Card
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 16 } }}
                  title={<Text strong style={{ color: textColor }}>Configured Tasks</Text>}
                  extra={(
                    <Space wrap>
                      <DatePicker.RangePicker
                        style={{ borderRadius: 8 }}
                        onChange={(dates) => setTimeConfigDateRange(dates ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null)}
                        allowClear
                      />
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openConfigModal()}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
                        Add Task Time
                      </Button>
                    </Space>
                  )}
                >
                  <Table
                    dataSource={timeConfigs.filter((c) => {
                      if (timeConfigDateRange) {
                        const d = c.createdAt ? c.createdAt.slice(0, 10) : '';
                        if (d < timeConfigDateRange[0] || d > timeConfigDateRange[1]) return false;
                      }
                      return true;
                    }).map((c) => ({ ...c, key: c._id }))}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No task times configured yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    columns={[
                      { title: 'Task Name', dataIndex: 'taskName', render: (v) => <Text strong>{v}</Text> },
                      {
                        title: 'Applies To', dataIndex: 'product',
                        render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary" style={{ fontSize: 12 }}>General</Text>),
                      },
                      {
                        title: 'Time / Unit',
                        key: 'time',
                        render: (_, r) => <Tag color="purple">{r.inputValue ?? secToUnit(r.timePerUnitSec, r.inputUnit || 'min')} {r.inputUnit || 'min'}</Tag>,
                      },
                      {
                        title: 'Per Unit (s)', dataIndex: 'timePerUnitSec',
                        render: (v) => <Text type="secondary">{perUnitLabel(v)}</Text>,
                      },
                      {
                        title: 'Example — 100 units', key: 'example',
                        render: (_, r) => <Text type="secondary">{secToHuman((r.timePerUnitSec || 0) * 100)}</Text>,
                      },
                      { title: 'Notes', dataIndex: 'notes', render: (v) => v || <Text type="secondary">—</Text> },
                      {
                        title: 'Action', key: 'action',
                        render: (_, r) => (
                          <Space>
                            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openConfigModal(r)} />
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeConfig(r)} />
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
        ])}
        activeKey={activeKeyFor(mainTab)}
      />

      {/* ── New Task Modal (Order → Products → estimate, mirrors Assign Task) ──── */}
      <Modal title="Create New Task" open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleCreateTask} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Task</Button>,
        ]}
        width={Math.min(520, window.innerWidth - 32)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Related Order" name="orderId">
                <Select
                  placeholder="Select Order"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  onChange={handleNewOrderChange}
                  notFoundContent={ordersList.length ? 'No match' : 'No orders found'}
                  options={ordersList.map((o) => ({
                    value: o._id,
                    label: `${o.orderCode || 'Order'}${o.clientName ? ` — ${o.clientName}` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="productIndex" extra={!newOrderIdWatch ? 'Select an order first' : undefined}>
                <Select
                  placeholder={newOrderIdWatch ? 'Select product' : 'Select an order first'}
                  allowClear
                  disabled={!newOrderIdWatch}
                  options={newOrderItems.map((it, idx) => ({
                    value: idx,
                    label: `${it.itemName || it.product || `Item ${idx + 1}`}${it.qty ? ` — ${Number(it.qty).toLocaleString()} units` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Client Name" name="client">
                <Input placeholder="Auto-filled from order" readOnly />
              </Form.Item>
            </Col>
            {/* Task Breakdown by Quantity — each task below is independent: its own Task
                Name, its own Qty, and its own duration shown right on its card. Nothing
                here is merged/summed across tasks; "units remaining" is just a qty guide. */}
            {newSelectedItem && (
              <Col xs={24}>
                <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A30' }}>
                  Task Breakdown by Quantity
                </Divider>

                {/* Sub-task rows — horizontal scroll keeps every field readable on narrow modals */}
                <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <Space direction="vertical" style={{ width: '100%', minWidth: 420 }} size={8}>
                  {newSubTasks.map((task, idx) => {
                    const rowEstimate = estimateSecFor(timeConfigs, { taskName: task.description }, Number(task.qty) || 0);
                    const sameNameRows = task.description
                      ? newSubTasks.filter((t) => normTaskName(t.description) === normTaskName(task.description))
                      : [];
                    const groupTotal = sameNameRows.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
                    const otherSameNameTotal = groupTotal - (Number(task.qty) || 0);
                    const groupMax = newTaskQty > 0 ? Math.max(0, newTaskQty - otherSameNameTotal) : undefined;
                    const groupMet = newTaskQty > 0 && groupTotal >= newTaskQty;
                    return (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8,
                        background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ flex: 2, minWidth: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Task {idx + 1} — Task Name</Text>
                          <Select
                            placeholder="Select task"
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            value={task.description || undefined}
                            onChange={(val) => updateNewSubTask(task.id, 'description', val)}
                            style={{ width: '100%' }}
                            notFoundContent={configTaskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                            options={configTaskNameOptions}
                          />
                        </div>
                        <div style={{ width: 90, flexShrink: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Qty</Text>
                          <InputNumber
                            min={0}
                            max={groupMax}
                            placeholder="0"
                            value={task.qty || undefined}
                            onChange={(val) => updateNewSubTask(task.id, 'qty', val || 0)}
                            style={{ width: '100%', borderRadius: 6 }}
                          />
                        </div>
                        <div style={{ flex: 1.4, minWidth: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Assign To</Text>
                          <Select
                            placeholder="Select"
                            value={task.assignee || undefined}
                            onChange={(val) => updateNewSubTask(task.id, 'assignee', val)}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            options={assignableUsers.map((u) => ({ value: u._id, label: `${u.fullName} — ${u.role}` }))}
                          />
                        </div>
                        {newSubTasks.length > 1 && (
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeNewSubTask(task.id)} style={{ marginBottom: 0, flexShrink: 0 }} />
                        )}
                      </div>
                      <Space size={4} wrap>
                        {task.description && Number(task.qty) > 0 && (
                          <Tag
                            color={rowEstimate.matched ? 'purple' : 'default'}
                            style={{ fontSize: 10, margin: 0 }}
                          >
                            {rowEstimate.matched
                              ? `≈ ${secToHuman(rowEstimate.estimatedSec)} (${perUnitLabel(rowEstimate.perUnitSec)} × ${task.qty})`
                              : 'No time standard configured for this task'}
                          </Tag>
                        )}
                        {task.description && newTaskQty > 0 && (
                          <Tag color={groupMet ? 'success' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                            {task.description}: {groupTotal.toLocaleString()} / {newTaskQty.toLocaleString()} units
                          </Tag>
                        )}
                      </Space>
                    </div>
                    );
                  })}
                </Space>
                </div>

                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addNewSubTask}
                  style={{ width: '100%', marginTop: 10, borderColor: '#B11E6A', color: '#B11E6A' }}
                >
                  Add Task
                </Button>
              </Col>
            )}

          </Row>
        </Form>
      </Modal>

      {/* ── Assign Task Modal (from Today's Checklist) — mirrors Operations' Assign Task
            modal: Order ID/Product read-only fields + Task Breakdown by Quantity only,
            no Priority/Due Date/Description prompts. ────────────────────────── */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#B11E6A' }} />
            <span>Assign Task</span>
            {assignTarget?.isUrgent && <Tag color="red">Emergency</Tag>}
          </Space>
        }
        open={assignModalOpen}
        onCancel={() => { setAssignModalOpen(false); setAssignTarget(null); }}
        footer={null}
        width={Math.min(520, window.innerWidth - 32)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}>
        <Form form={assignForm} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Order ID" name="orderId">
                <Input readOnly style={{ borderRadius: 8, background: isDark ? '#2a2a3a' : '#fafafa' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="product">
                <Input readOnly style={{ borderRadius: 8, background: isDark ? '#2a2a3a' : '#fafafa' }} />
              </Form.Item>
            </Col>

            {/* Task Breakdown by Quantity — each task below is independent: its own Task
                Name, its own Qty, and its own duration shown right on its card. Nothing
                here is merged/summed across tasks; "units remaining" is just a qty guide. */}
            {assignTarget?.qty > 0 && (
              <Col xs={24}>
                <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A30' }}>
                  Task Breakdown by Quantity
                </Divider>
                <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <Space direction="vertical" style={{ width: '100%', minWidth: 420 }} size={8}>
                  {/* Task Name lists EVERY configured task name (same full list the "New Task"
                      modal already used), not just the ones guessed "relevant" for this
                      product — the assigner picks the right one directly instead of relying on
                      product-name/keyword matching, which has repeatedly guessed wrong (see
                      GENERIC_TASK_WORDS fix history above). Dispatch readiness
                      (backend isOrderReadyForDispatch) still recognizes a task filed under any
                      name for a product that only needs ONE task type (its single-relevant-name
                      fallback sums Done qty by productIndex regardless of name); only a product
                      needing 2+ distinct task steps needs each one filed under its own matching
                      name for per-step coverage to track correctly. */}
                  {(() => {
                    const taskNameOptions = configTaskNameOptions;
                    return assignSubTasks.map((task, idx) => {
                    const rowEstimate = estimateSecFor(timeConfigs, { taskName: task.description }, Number(task.qty) || 0);
                    const sameNameRows = task.description
                      ? assignSubTasks.filter((t) => normTaskName(t.description) === normTaskName(task.description))
                      : [];
                    const groupTotal = sameNameRows.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
                    const otherSameNameTotal = groupTotal - (Number(task.qty) || 0);
                    const groupMax = assignTarget.qty > 0 ? Math.max(0, assignTarget.qty - otherSameNameTotal) : undefined;
                    const groupMet = assignTarget.qty > 0 && groupTotal >= assignTarget.qty;
                    return (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8,
                        background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ flex: 2, minWidth: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Task {idx + 1} — Task Name</Text>
                          <Select
                            placeholder="Select task"
                            showSearch
                            optionFilterProp="label"
                            allowClear
                            value={task.description || undefined}
                            onChange={(val) => updateAssignSubTask(task.id, 'description', val)}
                            style={{ width: '100%' }}
                            notFoundContent={taskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                            options={taskNameOptions}
                          />
                        </div>
                        <div style={{ width: 90, flexShrink: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Qty</Text>
                          <InputNumber
                            min={0}
                            max={groupMax}
                            placeholder="0"
                            value={task.qty || undefined}
                            onChange={(val) => updateAssignSubTask(task.id, 'qty', val || 0)}
                            style={{ width: '100%', borderRadius: 6 }}
                          />
                        </div>
                        <div style={{ flex: 1.4, minWidth: 0 }}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Assign To</Text>
                          <Select
                            placeholder="Select"
                            value={task.assignee || undefined}
                            onChange={(val) => updateAssignSubTask(task.id, 'assignee', val)}
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            options={assignableUsers.map((u) => ({ value: u._id, label: `${u.fullName} — ${u.role}` }))}
                          />
                        </div>
                        {assignSubTasks.length > 1 && (
                          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeAssignSubTask(task.id)} style={{ marginBottom: 0, flexShrink: 0 }} />
                        )}
                      </div>
                      <Space size={4} wrap>
                        {task.description && Number(task.qty) > 0 && (
                          <Tag
                            color={rowEstimate.matched ? 'purple' : 'default'}
                            style={{ fontSize: 10, margin: 0 }}
                          >
                            {rowEstimate.matched
                              ? `≈ ${secToHuman(rowEstimate.estimatedSec)} (${perUnitLabel(rowEstimate.perUnitSec)} × ${task.qty})`
                              : 'No time standard configured for this task'}
                          </Tag>
                        )}
                        {task.description && assignTarget.qty > 0 && (
                          <Tag color={groupMet ? 'success' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                            {task.description}: {groupTotal.toLocaleString()} / {assignTarget.qty.toLocaleString()} units
                          </Tag>
                        )}
                      </Space>
                    </div>
                    );
                  });
                  })()}
                </Space>
                </div>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addAssignSubTask}
                  style={{ width: '100%', marginTop: 10, borderColor: '#B11E6A', color: '#B11E6A' }}
                >
                  Add Task
                </Button>
              </Col>
            )}
          </Row>

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
              onClick={handleSubmitAssign}
            >
              Create and Assign Task
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Kit Packing Task Assignment Modal (Separate Kit / Personalized Kit) ──
          Mirrors Operations' Kit Packing modal (OperationDetail.jsx): shows the kit's
          product composition, then a Task Breakdown by Quantity where each row's
          "Assign To" is a multi-select — everyone picked shares that one task record. */}
      <Modal
        open={kitPackingModalOpen}
        onCancel={() => {
          setKitPackingModalOpen(false);
          setKitPackingModalKitCfg(null);
          setKitPackingModalCategory(null);
          setKitPackingModalOrder(null);
        }}
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#B11E6A' }} />
            <span>
              {kitPackingModalCategory === 'personalized'
                ? 'Assign Personalized Kit Packing Task'
                : kitPackingModalCategory === 'separate_kit'
                ? 'Assign Separate Kit Packing Task'
                : 'Assign Kit Packing Task'}
            </span>
            {kitPackingModalKitCfg?.kitName && (
              <Tag color={kitPackingModalCategory === 'personalized' ? 'magenta' : 'blue'}>
                {kitPackingModalKitCfg.kitName}
              </Tag>
            )}
          </Space>
        }
        footer={null}
        width={Math.min(680, window.innerWidth - 32)}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
      >
        {/* Kit contents — rich spec cards for each included product */}
        {kitPackingModalKitCfg && (
          <div style={{ marginBottom: 16, marginTop: 8 }}>
            <Space style={{ marginBottom: 6 }} wrap>
              <Text strong style={{ fontSize: 12 }}>
                Included in 1 {kitPackingModalCategory === 'personalized' ? 'Personalized' : 'Separate'} Kit:
              </Text>
              {kitPackingModalKitCfg.overallQty > 0 && (
                <Tag color={kitPackingModalCategory === 'personalized' ? 'magenta' : 'blue'} style={{ margin: 0 }}>
                  {kitPackingModalKitCfg.overallQty} kits total
                </Tag>
              )}
              {kitPackingModalKitCfg.kitItems?.length > 0 && (
                <Tag color={kitPackingModalCategory === 'personalized' ? 'magenta' : 'blue'} style={{ margin: 0 }}>
                  {kitPackingModalKitCfg.kitItems.length} product{kitPackingModalKitCfg.kitItems.length !== 1 ? 's' : ''} / kit
                </Tag>
              )}
            </Space>
            {renderKitProductSpecs(
              kitPackingModalKitCfg.kitItems,
              kitPackingModalCategory === 'personalized' ? 'magenta' : 'blue',
              kitPackingModalKitCfg.overallQty,
            )}
          </div>
        )}

        {/* Task Breakdown by Quantity — each task below is independent: its own Task
            Name, its own Qty, and its own duration shown right on its card. */}
        {(() => {
          const kitReqQty = kitPackingModalKitCfg?.overallQty || 0;
          return (
            <>
              <Divider orientation="left" style={{ fontSize: 13, color: '#B11E6A', borderColor: '#B11E6A30' }}>
                Task Breakdown by Quantity
              </Divider>
              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
              <Space direction="vertical" style={{ width: '100%', minWidth: 460 }} size={8}>
                {kitSubTasks.map((task, idx) => {
                  const rowEstimate = estimateSecFor(timeConfigs, { taskName: task.description }, Number(task.qty) || 0);
                  const sameNameRows = task.description
                    ? kitSubTasks.filter((t) => normTaskName(t.description) === normTaskName(task.description))
                    : [];
                  const groupTotal = sameNameRows.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
                  const otherSameNameTotal = groupTotal - (Number(task.qty) || 0);
                  const groupMax = kitReqQty > 0 ? Math.max(0, kitReqQty - otherSameNameTotal) : undefined;
                  const groupMet = kitReqQty > 0 && groupTotal >= kitReqQty;
                  return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8,
                      background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 2, minWidth: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Task {idx + 1} — Task Name</Text>
                        <Select
                          placeholder="Select task"
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          value={task.description || undefined}
                          onChange={(val) => updateKitSubTask(task.id, 'description', val)}
                          style={{ width: '100%' }}
                          notFoundContent={configTaskNameOptions.length ? 'No match' : 'No tasks configured — add one in Time Management'}
                          options={configTaskNameOptions}
                        />
                      </div>
                      <div style={{ width: 90, flexShrink: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Qty</Text>
                        <InputNumber
                          min={0}
                          max={groupMax}
                          placeholder="0"
                          value={task.qty || undefined}
                          onChange={(val) => updateKitSubTask(task.id, 'qty', val || 0)}
                          style={{ width: '100%', borderRadius: 6 }}
                        />
                      </div>
                      <div style={{ flex: 1.4, minWidth: 0 }}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Assign To</Text>
                        <Select
                          mode="multiple"
                          placeholder="Select one or more"
                          value={task.assignees || []}
                          onChange={(val) => updateKitSubTask(task.id, 'assignees', val)}
                          style={{ width: '100%' }}
                          showSearch
                          optionFilterProp="label"
                          maxTagCount="responsive"
                          options={assignableUsers.map((u) => ({ value: u._id, label: `${u.fullName} — ${u.role}` }))}
                        />
                      </div>
                      {kitSubTasks.length > 1 && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeKitSubTask(task.id)} style={{ marginBottom: 0, flexShrink: 0 }} />
                      )}
                    </div>
                    <Space size={4} wrap>
                      {task.description && Number(task.qty) > 0 && (
                        <Tag
                          color={rowEstimate.matched ? 'purple' : 'default'}
                          style={{ fontSize: 10, margin: 0 }}
                        >
                          {rowEstimate.matched
                            ? `≈ ${secToHuman(rowEstimate.estimatedSec)} (${perUnitLabel(rowEstimate.perUnitSec)} × ${task.qty})`
                            : 'No time standard configured for this task'}
                        </Tag>
                      )}
                      {task.description && kitReqQty > 0 && (
                        <Tag color={groupMet ? 'success' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                          {task.description}: {groupTotal.toLocaleString()} / {kitReqQty.toLocaleString()} units
                        </Tag>
                      )}
                    </Space>
                  </div>
                  );
                })}
              </Space>
              </div>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addKitSubTask}
                style={{ width: '100%', marginTop: 10, borderColor: '#B11E6A', color: '#B11E6A' }}
              >
                Add Task
              </Button>
            </>
          );
        })()}

        <div style={{ marginTop: 16 }}>
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
            Create and Assign {kitPackingModalCategory === 'personalized' ? 'Personalized' : 'Separate'} Kit Packing Task
          </Button>
        </div>
      </Modal>

      {/* ── Time Management Config Modal ──────────────────────────────────────── */}
      <Modal
        title={editingConfig ? 'Edit Task Time' : 'Add Task Time'}
        open={configModalOpen}
        onCancel={() => { setConfigModalOpen(false); setEditingConfig(null); }}
        onOk={saveConfig}
        okText={editingConfig ? 'Save' : 'Add'}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } }}
        width={Math.min(460, window.innerWidth - 32)}
        destroyOnClose
      >
        <Form form={configForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="Task Name"
            name="taskName"
            rules={[{ required: true, message: 'Enter the task name' }]}
            extra="e.g. Sticker placing, Packing, Sealing, Filling, Printing"
          >
            <Input placeholder="Task name" />
          </Form.Item>
          <Form.Item
            label="Applies To (Product)"
            name="product"
            extra="Optional — scope this task to one product (e.g. Shampoo). Leave blank to let it apply generally, wherever its name/keywords fit."
          >
            <Input placeholder="e.g. Shampoo — leave blank for general" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={14}>
              <Form.Item label="Time per 1 unit" name="inputValue" rules={[{ required: true, message: 'Enter the time' }]}>
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="e.g. 10" />
              </Form.Item>
            </Col>
            <Col xs={10}>
              <Form.Item label="Unit" name="inputUnit" initialValue="min">
                <Select
                  options={[
                    { value: 'ms', label: 'Milliseconds' },
                    { value: 'sec', label: 'Seconds' },
                    { value: 'min', label: 'Minutes' },
                    { value: 'hr', label: 'Hours' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Task Order Detail Modal ───────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#B11E6A' }} />
            <span>Task Details: {selectedTask?.id}</span>
            <Tag color={statusColor[selectedTask?.status]}>{selectedTask?.status}</Tag>
          </Space>
        }
        open={taskDetailOpen}
        onCancel={() => setTaskDetailOpen(false)}
        width={Math.min(860, window.innerWidth - 32)}
        footer={[
          selectedTask?.salesFollowup && (
            <Button key="followup" icon={<BellOutlined />}
              style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
              onClick={() => { handleFollowupDone(selectedTask.id); setTaskDetailOpen(false); }}>
              Mark Follow-up Done
            </Button>
          ),
          <Button key="close" onClick={() => setTaskDetailOpen(false)}>Close</Button>,
        ].filter(Boolean)}
      >
        {selectedTask && (() => {
          const siblingTasks = selectedTask.orderId
            ? taskList.filter((t) => t.orderId === selectedTask.orderId && t.key !== selectedTask.key)
            : [];
          const pendingCount = siblingTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
          const doneCount = siblingTasks.filter((t) => t.status === 'Completed').length;
          const labelStyle = { fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

              {/* Follow-up alert */}
              {selectedTask.salesFollowup && (
                <Alert type="warning" showIcon icon={<BellOutlined />}
                  message="Sales Follow-up Required"
                  description={`${selectedTask.salesPerson} should contact ${selectedTask.client} to follow up on payment / order status.`}
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Task Information */}
              <div>
                <Text style={labelStyle}>Task Information</Text>
                <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                  <Descriptions.Item label="Task ID"><Text strong>{selectedTask.id}</Text></Descriptions.Item>
                  <Descriptions.Item label="Type"><Tag color={typeColor[selectedTask.type]}>{selectedTask.type}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Priority"><Tag color={priorityColor[selectedTask.priority]}>{selectedTask.priority}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Status"><Tag color={statusColor[selectedTask.status]}>{selectedTask.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Assigned To" span={2}>
                    {(selectedTask.assigneeList && selectedTask.assigneeList.length)
                      ? (
                        <Space wrap size={[12, 4]}>
                          {selectedTask.assigneeList.map((name, i) => (
                            <Space key={i} size={4}>
                              <Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />
                              <Text strong>{name}</Text>
                              {i === 0 && selectedTask.assigneeRole && <Tag color="default" style={{ fontSize: 11 }}>{selectedTask.assigneeRole}</Tag>}
                            </Space>
                          ))}
                        </Space>
                      )
                      : <Text strong>Unassigned</Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Due Date">{selectedTask.due || '—'}</Descriptions.Item>
                  {selectedTask.printingType && (
                    <Descriptions.Item label="Printing Type">{selectedTask.printingType}</Descriptions.Item>
                  )}
                  {selectedTask.startTime && (
                    <Descriptions.Item label="Started">{new Date(selectedTask.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                  )}
                  {selectedTask.endTime && (
                    <Descriptions.Item label="Completed">{new Date(selectedTask.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Descriptions.Item>
                  )}
                  {selectedTask.description && (
                    <Descriptions.Item label="Description" span={2}>{selectedTask.description}</Descriptions.Item>
                  )}
                </Descriptions>
              </div>

              {/* Time & Performance */}
              {(selectedTask.estimatedDurationSec > 0 || selectedTask.actualDurationSec > 0 || selectedTask.rating != null) && (
                <div>
                  <Text style={labelStyle}>Time &amp; Performance</Text>
                  <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                    {selectedTask.estimatedDurationSec > 0 && (
                      <Descriptions.Item label="Estimated">{secToHuman(selectedTask.estimatedDurationSec)}</Descriptions.Item>
                    )}
                    {selectedTask.actualDurationSec > 0 && (
                      <Descriptions.Item label="Actual">{secToHuman(selectedTask.actualDurationSec)}</Descriptions.Item>
                    )}
                    {selectedTask.efficiencyPct != null && (
                      <Descriptions.Item label="Efficiency">{selectedTask.efficiencyPct}%</Descriptions.Item>
                    )}
                    {selectedTask.rating != null && (
                      <Descriptions.Item label="Rating">
                        <Space>
                          <Rate disabled allowHalf value={selectedTask.rating} style={{ fontSize: 14, color: ratingColor(selectedTask.rating) }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>{selectedTask.ratingReason || ratingLabel(selectedTask.rating)}</Text>
                        </Space>
                      </Descriptions.Item>
                    )}
                    {selectedTask.feedback && (
                      <Descriptions.Item label="Feedback" span={2}>{selectedTask.feedback}</Descriptions.Item>
                    )}
                  </Descriptions>
                </div>
              )}

              {/* Sub-tasks */}
              {selectedTask.subTasks?.length > 0 && (
                <div>
                  <Text style={labelStyle}>Sub-tasks</Text>
                  <Table
                    dataSource={selectedTask.subTasks.map((s, i) => ({ ...s, key: i }))}
                    pagination={false}
                    size="small"
                    style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task', dataIndex: 'label', render: (v) => <Text strong>{v || '—'}</Text> },
                      { title: 'Qty', dataIndex: 'qty', render: (v) => v ? (v).toLocaleString() : '—' },
                      {
                        title: 'Assigned To', dataIndex: 'assigneeName',
                        render: (v) => v
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                          : <Text type="secondary">Unassigned</Text>,
                      },
                      {
                        title: 'Status', dataIndex: 'done',
                        render: (v) => v
                          ? <Tag color="success" icon={<CheckCircleOutlined />}>Done</Tag>
                          : <Tag color="processing">In Progress</Tag>,
                      },
                    ]}
                  />
                </div>
              )}

              {/* Order Details */}
              {selectedTask.orderId && (
                <div>
                  <Text style={labelStyle}>Order Details</Text>
                  <Descriptions bordered size="small" column={2} style={{ marginTop: 8, borderRadius: 8 }}>
                    <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{selectedTask.order}</Text></Descriptions.Item>
                    <Descriptions.Item label="Hotel / Client"><Text strong>{selectedTask.client}</Text></Descriptions.Item>
                    <Descriptions.Item label="Product">{selectedTask.product}</Descriptions.Item>
                    <Descriptions.Item label="Quantity">{(selectedTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
                    {selectedTask.deliveryDate && (
                      <Descriptions.Item label="Expected Delivery">{selectedTask.deliveryDate}</Descriptions.Item>
                    )}
                    {selectedTask.orderStatus && (
                      <Descriptions.Item label="Order Status"><Tag color="processing">{selectedTask.orderStatus}</Tag></Descriptions.Item>
                    )}
                    <Descriptions.Item label="Sales Person">{selectedTask.salesPerson}</Descriptions.Item>
                    <Descriptions.Item label="Payment">
                      {selectedTask.paymentStatus
                        ? <Tag color={paymentColor[selectedTask.paymentStatus]}>{selectedTask.paymentStatus}</Tag>
                        : 'N/A'}
                    </Descriptions.Item>
                    {selectedTask.dispatchStatus && (
                      <Descriptions.Item label="Dispatch"><Tag color="success">{selectedTask.dispatchStatus}</Tag></Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Order items breakdown */}
                  {selectedTask.orderItems?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#888', marginBottom: 4, display: 'block' }}>Products in this order</Text>
                      <Table
                        dataSource={selectedTask.orderItems.map((it, i) => ({ ...it, key: i }))}
                        pagination={false}
                        size="small"
                        style={{ borderRadius: 8, overflow: 'hidden' }}
                        columns={[
                          { title: 'Product', dataIndex: 'itemName', render: (v) => <Text strong>{v || '—'}</Text> },
                          { title: 'Qty', dataIndex: 'qty', render: (v) => v ? (v).toLocaleString() : '—' },
                          { title: 'Logo Type', dataIndex: 'logoType', render: (v) => v ? <Tag>{v}</Tag> : '—' },
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Other tasks on the same order */}
              {siblingTasks.length > 0 && (
                <div>
                  <Space style={{ marginBottom: 8 }}>
                    <Text style={labelStyle}>Other Tasks on this Order</Text>
                    {pendingCount > 0 && <Tag color="warning">{pendingCount} Pending / In Progress</Tag>}
                    {doneCount > 0 && <Tag color="success">{doneCount} Completed</Tag>}
                  </Space>
                  <Table
                    dataSource={siblingTasks.map((t) => ({ ...t, key: t.key }))}
                    pagination={false}
                    size="small"
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Product', dataIndex: 'product', render: (v) => v || '—' },
                      {
                        title: 'Assigned To', dataIndex: 'assignee',
                        render: (v) => v
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                          : <Text type="secondary" style={{ fontSize: 11 }}>Unassigned</Text>,
                      },
                      { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Due', dataIndex: 'due', render: (v) => v || '—' },
                    ]}
                  />
                </div>
              )}

              {/* Phase progress */}
              {selectedTask.orderId && selectedTask.phases && (
                <div>
                  <Space style={{ marginBottom: 8 }}>
                    <Text style={labelStyle}>Phase Progress</Text>
                    <Tag color="#B11E6A">{selectedTask.phases.completed}/{selectedTask.phases.total} Done</Tag>
                  </Space>
                  <Progress percent={Math.round((selectedTask.phases.completed / selectedTask.phases.total) * 100)} strokeColor="#B11E6A" size="small" style={{ marginBottom: 8 }} />
                  {selectedTask.phasesList.length > 0 && (
                    <Table
                      dataSource={selectedTask.phasesList}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: 'Phase', dataIndex: 'phase', render: (v) => <Text strong>Phase {v}</Text> },
                        { title: 'Qty', dataIndex: 'qty', render: (v) => (v ?? 0).toLocaleString() },
                        { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'Delivered' ? 'success' : 'processing'}>{s}</Tag> },
                        { title: 'Date', dataIndex: 'date', render: (d) => d || '—' },
                      ]}
                    />
                  )}
                </div>
              )}

              {/* Dispatch blocked notice — skipped for sample orders, and once Sales+Ops have
                  emergency-approved this order (either this task directly, or a sibling task
                  which already forwarded the whole order to Dispatch) */}
              {selectedTask.status === 'Completed' && !selectedTask.isSample && !selectedTask.emergencyApproved
                && !isAlreadySentToDispatch(selectedTask.orderStatus)
                && selectedTask.paymentStatus && selectedTask.paymentStatus !== 'Paid' && !selectedTask.dispatchStatus && (
                <Alert type="error" showIcon icon={<ExclamationCircleOutlined />}
                  message="Dispatch Blocked — Payment Pending"
                  description={`Payment status: "${selectedTask.paymentStatus}". Dispatch is enabled only after full payment. For emergencies, use Emergency Dispatch — requires Sales Person + Operation Head approval.`}
                  style={{ borderRadius: 8 }}
                />
              )}
              {selectedTask.status === 'Completed' && !selectedTask.isSample
                && (selectedTask.emergencyApproved || isAlreadySentToDispatch(selectedTask.orderStatus))
                && selectedTask.paymentStatus && selectedTask.paymentStatus !== 'Paid' && (
                <Alert type="warning" showIcon icon={<AlertFilled />}
                  message="Emergency-Approved — Dispatch Allowed With Payment Pending"
                  description="Sales Head and Ops Head both approved this emergency dispatch. Payment is not yet fully collected — follow up separately."
                  style={{ borderRadius: 8 }}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Dispatch Info Modal ───────────────────────────────────────────────── */}
      <Modal
        title={<Space><ShoppingOutlined style={{ color: '#52c41a' }} /><span>Dispatch Status</span></Space>}
        open={dispatchVerifyOpen}
        onCancel={() => setDispatchVerifyOpen(false)}
        width={Math.min(640, window.innerWidth - 32)}
        footer={(() => {
          const t = dispatchVerifyData?.task;
          // Task completion/assignment is informational only here — it does not block
          // forwarding to Dispatch (see backend dispatchOrder). The only real gate left
          // is payment (bypassed for sample orders / approved Emergency Dispatch).
          const ready = dispatchVerifyData
            && (t?.isSample || t?.paymentStatus === 'Paid' || t?.emergencyApproved)
            && !isAlreadySentToDispatch(t?.orderStatus);
          return [
            <Button key="close" onClick={() => setDispatchVerifyOpen(false)}>Close</Button>,
            ready && (
              <Button
                key="dispatch"
                type="primary"
                icon={<ShoppingOutlined />}
                loading={dispatching}
                onClick={() => handleConfirmDispatch(t)}
                style={{ background: '#52c41a', border: 'none' }}
              >
                Send to Dispatch
              </Button>
            ),
          ].filter(Boolean);
        })()}
      >
        {dispatchVerifyData && (() => {
          const { task, orderTasks, notDone, unassigned, missingProducts } = dispatchVerifyData;
          const completedCount = orderTasks.filter((t) => t.status === 'Completed').length;
          // null = readiness preview still loading — used only for the informational
          // Task Completion panel below; task/product completion no longer gates
          // forwarding to Dispatch (see backend dispatchOrder / buildDispatchGroupedProducts,
          // which enforces per-product assignment on the Dispatch page itself instead).
          const checkingMissing = missingProducts === null;
          const isPaid = task.paymentStatus === 'Paid';
          const isSample = task.isSample;
          const isEmergencyApproved = task.emergencyApproved;
          const readyToDispatch = isPaid || isSample || isEmergencyApproved;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

              {isEmergencyApproved && (
                <Alert
                  type="info"
                  showIcon
                  icon={<AlertFilled />}
                  message="Emergency Dispatch Approved"
                  description="Sales Head and Operations Head have both approved an emergency dispatch for this task — the usual all-tasks-done and full-payment requirements are bypassed."
                  style={{ borderRadius: 8 }}
                />
              )}

              {isAlreadySentToDispatch(task.orderStatus) && (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={task.orderStatus === 'Dispatched' ? 'Already Dispatched' : 'Already Sent to Dispatch'}
                  description={task.orderStatus === 'Dispatched'
                    ? 'This order has already been dispatched.'
                    : 'This order has already been forwarded to the Dispatch queue. Complete the remaining steps from the Dispatch module.'}
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Overall dispatch readiness — payment (or sample/emergency) is the only
                  gate here; task completion is shown further below for reference only. */}
              {!isAlreadySentToDispatch(task.orderStatus) && (readyToDispatch ? (
                <Alert
                  type="success"
                  showIcon
                  message="Ready for Dispatch"
                  description={isEmergencyApproved
                    ? 'This task is covered by an approved Emergency Dispatch. You may proceed with dispatch.'
                    : `${isSample ? 'This is a sample order.' : 'Payment is confirmed.'} You may proceed with dispatch. Task completion below is for reference — per-product packing assignment is verified on the Dispatch page.`}
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Payment Pending"
                  description={`Payment status is "${task.paymentStatus}". Dispatch requires full payment or an approved Emergency Dispatch.`}
                  style={{ borderRadius: 8 }}
                />
              ))}

              {/* Order & payment summary */}
              <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                <Descriptions.Item label="Order ID">
                  <Text strong style={{ color: '#B11E6A' }}>{task.order || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Client">
                  <Text strong>{task.client || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Product">{task.product || '—'}</Descriptions.Item>
                <Descriptions.Item label="Qty">{(task.qty ?? 0).toLocaleString()} units</Descriptions.Item>
                <Descriptions.Item label="Payment Status">
                  <Tag color={paymentColor[task.paymentStatus] || 'default'}>{task.paymentStatus || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Order Type">
                  {isSample ? <Tag color="purple">Sample</Tag> : <Tag color="default">Regular</Tag>}
                </Descriptions.Item>
                {task.deliveryDate && (
                  <Descriptions.Item label="Expected Delivery" span={2}>{task.deliveryDate}</Descriptions.Item>
                )}
              </Descriptions>

              {/* Task completion summary */}
              <div>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                  Task Completion — Order {task.order}
                </Text>
                <Space wrap style={{ marginBottom: 10 }}>
                  <Tag color="blue">{orderTasks.length} total task(s)</Tag>
                  <Tag color={completedCount === orderTasks.length ? 'success' : 'warning'}>{completedCount} completed</Tag>
                  {notDone.length > 0 && <Tag color="error">{notDone.length} incomplete</Tag>}
                  {unassigned.length > 0 && <Tag color="orange">{unassigned.length} unassigned</Tag>}
                  {checkingMissing && <Tag color="processing">checking products…</Tag>}
                  {!checkingMissing && missingProducts.length > 0 && (
                    <Tag color="error">{missingProducts.length} product(s) without any task</Tag>
                  )}
                </Space>

                {!checkingMissing && missingProducts.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ borderRadius: 8, marginBottom: 10 }}
                    message="Product(s) with no completed task (informational — does not block dispatch)"
                    description={missingProducts.map((p) => p.product).join(', ')}
                  />
                )}

                {orderTasks.length > 0 && (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={orderTasks.map((t) => ({ ...t, key: t.key }))}
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A', fontSize: 12 }}>{v}</Text> },
                      { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                      { title: 'Product', dataIndex: 'product', render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
                      {
                        title: 'Assigned To', dataIndex: 'assignee',
                        render: (v) => (v && v !== '—')
                          ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} /><Text style={{ fontSize: 12 }}>{v}</Text></Space>
                          : <Tag color="error" style={{ fontSize: 10 }}>Unassigned</Tag>,
                      },
                      {
                        title: 'Status', dataIndex: 'status',
                        render: (v) => <Tag color={v === 'Completed' ? 'success' : v === 'In Progress' ? 'processing' : 'default'} style={{ fontSize: 11 }}>{v}</Tag>,
                      },
                    ]}
                  />
                )}
              </div>

              {/* What to do next */}
              {!readyToDispatch && (
                <Alert
                  type="info"
                  showIcon
                  message="What to do next"
                  description={
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 18, fontSize: 13 }}>
                      <li>Collect full payment or raise an Emergency Dispatch request.</li>
                    </ul>
                  }
                  style={{ borderRadius: 8 }}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      {/* ── Emergency Dispatch Modal ──────────────────────────────────────────── */}
      <Modal
        title={<Space><ExclamationCircleOutlined style={{ color: '#f5222d' }} /><span>Emergency Dispatch</span></Space>}
        open={emergencyDispatchOpen}
        onCancel={() => setEmergencyDispatchOpen(false)}
        width={Math.min(580, window.innerWidth - 32)}
        footer={[<Button key="close" onClick={() => setEmergencyDispatchOpen(false)}>Close</Button>]}
      >
        {emergencyTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            <Alert type="warning" showIcon
              message="Payment Pending — Emergency Dispatch Required"
              description="This order is complete but payment has not been received. Emergency dispatch allows immediate delivery and requires sequential approval: Sales Head first, then Operations Head."
              style={{ borderRadius: 8 }}
            />

            {/* Order summary */}
            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
              <Descriptions.Item label="Order ID"><Text strong style={{ color: '#B11E6A' }}>{emergencyTask.order}</Text></Descriptions.Item>
              <Descriptions.Item label="Client">{emergencyTask.client}</Descriptions.Item>
              <Descriptions.Item label="Product">{emergencyTask.product}</Descriptions.Item>
              <Descriptions.Item label="Qty">{(emergencyTask.qty ?? 0).toLocaleString()} units</Descriptions.Item>
              <Descriptions.Item label="Payment Status"><Tag color="warning">{emergencyTask.paymentStatus}</Tag></Descriptions.Item>
              <Descriptions.Item label="Assigned To">{emergencyTask.salesPerson}</Descriptions.Item>
            </Descriptions>

            {!emergencyTask.emergencyRequested ? (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  After submitting, <strong>Sales Head</strong> must approve in the Sales page, then <strong>Operations Head</strong> approves in the Operations page.
                </Text>
                <Form form={emergencyForm} layout="vertical" initialValues={{ scope: 'task' }}>
                  <Form.Item label="Apply Emergency Dispatch To" name="scope">
                    <Radio.Group>
                      <Space direction="vertical">
                        <Radio value="task">This product/kit only — {emergencyTask.product}</Radio>
                        <Radio value="order">
                          Full order — all {taskList.filter((t) => t.orderId === emergencyTask.orderId).length || 1} product/kit task(s) on Order {emergencyTask.order}
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="Reason for Emergency Dispatch" name="reason" rules={[{ required: true, message: 'Please provide a reason' }]}>
                    <Input.TextArea rows={3} placeholder="Describe why emergency dispatch is required..." />
                  </Form.Item>
                </Form>
                <Button type="primary" danger loading={requesting || requestingOrder}
                  onClick={async () => {
                    try {
                      const values = await emergencyForm.validateFields();
                      if (values.scope === 'order' && emergencyTask.orderId) {
                        const result = await requestEmergencyDispatchForOrder({ orderId: emergencyTask.orderId, reason: values.reason }).unwrap();
                        enqueueSnackbar(`Emergency dispatch requested for ${result?.data?.length || 'all'} task(s) on this order — awaiting Sales Head approval`, { variant: 'success' });
                      } else {
                        await requestEmergencyDispatch({ id: emergencyTask.key, reason: values.reason }).unwrap();
                        enqueueSnackbar('Emergency dispatch requested — awaiting Sales Head approval', { variant: 'success' });
                      }
                      setEmergencyDispatchOpen(false);
                      emergencyForm.resetFields();
                    } catch (err) {
                      if (err?.data?.message) enqueueSnackbar(err.data.message, { variant: 'error' });
                    }
                  }}>
                  Request Emergency Dispatch
                </Button>
              </>
            ) : (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Approval Progress</Text>
                {emergencyTask.emergencyReason && (
                  <Alert type="info" showIcon message={`Reason: ${emergencyTask.emergencyReason}`} style={{ borderRadius: 8 }} />
                )}
                <Steps
                  direction="vertical"
                  size="small"
                  current={emergencyTask.emergencyApproved ? 2 : emergencyTask.emergencySalesApproved ? 1 : 0}
                  items={[
                    {
                      title: 'Sales Head Approval',
                      description: emergencyTask.emergencySalesApproved
                        ? 'Approved ✓ — Sales Head has authorized emergency dispatch'
                        : 'Pending — Sales Head must approve in the Sales page',
                      status: emergencyTask.emergencySalesApproved ? 'finish' : 'process',
                    },
                    {
                      title: 'Operations Head Approval',
                      description: emergencyTask.emergencyOpsApproved
                        ? 'Approved ✓ — Ops Head has authorized emergency dispatch'
                        : emergencyTask.emergencySalesApproved
                        ? 'Pending — Ops Head must approve in the Operations page'
                        : 'Locked — awaiting Sales Head approval first',
                      status: emergencyTask.emergencyOpsApproved ? 'finish' : emergencyTask.emergencySalesApproved ? 'process' : 'wait',
                    },
                    {
                      title: 'Emergency Dispatch Authorized',
                      description: emergencyTask.emergencyApproved
                        ? 'Both approvals received — proceed with dispatch immediately'
                        : 'Waiting for both approvals',
                      status: emergencyTask.emergencyApproved ? 'finish' : 'wait',
                    },
                  ]}
                />
                {emergencyTask.emergencyApproved && (
                  <Alert type="success" showIcon message="Emergency dispatch fully approved. Proceed immediately." style={{ borderRadius: 8 }} />
                )}
                {!emergencyTask.emergencyApproved && (
                  <Alert type="info" showIcon
                    message={emergencyTask.emergencySalesApproved ? 'Waiting for Operations Head approval in the Operations page' : 'Waiting for Sales Head approval in the Sales page'}
                    style={{ borderRadius: 8 }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
