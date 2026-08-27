const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseRequest = require('../models/PurchaseRequest');
const generateCode = require('./codeGenerator');

// A batch's PurchaseOrder is consolidated into ONE document keyed by batchId.
// Legacy/lone requests (no batchId) get a synthesized, globally-unique
// `SOLO-<requestId>` key backfilled onto the request — never match on a bare
// null/absent batchId, since that would match every legacy order at once and
// silently fold unrelated approvals together.
async function resolveBatchKey(request) {
  if (request.batchId) return request.batchId;
  const soloKey = `SOLO-${request._id}`;
  request.batchId = soloKey;
  await request.save({ validateBeforeSave: false });
  return soloKey;
}

const norm = (s) => (s || '').toString().trim().toLowerCase();

// Builds a batch PurchaseOrder's `items[]` from a set of PurchaseRequests, MERGED
// so each physical InventoryItem appears exactly once — keyed by itemId, falling
// back to a normalized itemName for legacy free-text requests. Two requests for
// the same item (batched together, or the same item added twice to a Bulk
// Request) therefore become ONE order line with the summed qty/amount instead of
// two lines that would each credit stock again when the order is received.
function buildMergedItems(requests) {
  const byKey = new Map();
  const items = [];
  for (const r of requests) {
    const key = r.itemId ? String(r.itemId) : `name:${norm(r.itemName)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + (Number(r.qty) || 0);
      if (r.amount != null) existing.amount = (Number(existing.amount) || 0) + Number(r.amount);
      if (!existing.requestIds.some((id) => String(id) === String(r._id))) existing.requestIds.push(r._id);
      continue;
    }
    const entry = {
      requestId: r._id,
      requestIds: [r._id],
      itemId: r.itemId,
      itemName: r.itemName,
      qty: Number(r.qty) || 0,
      unit: r.unit,
      amount: r.amount != null ? Number(r.amount) : undefined,
    };
    byKey.set(key, entry);
    items.push(entry);
  }
  return items;
}

// Re-syncs a batch's PurchaseOrder to the CURRENT state of its Approved requests:
// rebuilds items[] (merged by item — see buildMergedItems), recomputes the order
// total, and mirrors a single-item order's qty/unit/paymentTerms 1:1. Called right
// after approval (from upsertOrderForApprovedRequest) AND whenever a request's
// amount/qty is corrected after it was already approved (Financial's "Edit
// Request" — updateQuotationDetails; a quotation re-upload). Idempotent — safe to
// call any number of times, in any order, without double-counting.
async function syncOrderItemFromRequest(request) {
  const batchKey = await resolveBatchKey(request);
  const order = await PurchaseOrder.findOne({ batchId: batchKey })
    || await PurchaseOrder.findOne({ requestId: request._id }); // safety net: orders created before the batchId migration
  if (!order) return null;

  const approved = await PurchaseRequest.find({ batchId: batchKey, status: 'Approved' });
  // Include the triggering request even if the caller hasn't flipped its status to
  // Approved yet in this same cycle (it's what this sync is being run for).
  if (!approved.some((r) => String(r._id) === String(request._id))) approved.push(request);

  const merged = buildMergedItems(approved);
  if (!merged.length) return order; // nothing approved yet — leave the order untouched
  order.items = merged;

  // Quotation-stage GST split carried up from the batch's Approved requests. A batch shares
  // ONE scanned quotation whose whole-document GST is stamped onto every child request (same
  // as gstAmount), so the representative value is the max across requests — NOT the sum, which
  // would multiply it by the batch size. Reports read this as the Input-GST source until the
  // goods invoice is scanned at receiving; explodePurchaseOrderItems treats the order as
  // inter-state only when igst is the sole non-zero bucket.
  const maxGst = (k) => approved.reduce((m, r) => Math.max(m, Number(r[k]) || 0), 0);
  order.cgstAmount = maxGst('cgstAmount');
  order.sgstAmount = maxGst('sgstAmount');
  order.igstAmount = maxGst('igstAmount');
  order.gstAmount = maxGst('gstAmount') || (order.cgstAmount + order.sgstAmount + order.igstAmount);

  // Single-item orders (solo requests, or the only distinct item in a batch) mirror
  // the request 1:1. Multi-item batch totals are the SUM of every merged line's
  // amount — recomputed here so the order total never sticks at a stale per-item value.
  if (merged.length === 1) {
    const only = merged[0];
    order.itemId = only.itemId;
    order.itemName = only.itemName;
    order.qty = only.qty;
    order.unit = only.unit;
    order.paymentTerms = request.paymentTerms;
    if (only.amount != null) order.amount = only.amount;
  } else {
    order.amount = merged.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  }
  await order.save({ validateBeforeSave: false });
  return order;
}

async function upsertOrderForApprovedRequest(request, userId) {
  const batchKey = await resolveBatchKey(request);
  const existing = await PurchaseOrder.findOne({ batchId: batchKey });
  if (existing) return syncOrderItemFromRequest(request);

  const poCode = await generateCode('PO');
  await PurchaseOrder.create({
    poCode,
    requestId: request._id,
    vendorId: request.vendorId,
    itemId: request.itemId,
    itemName: request.itemName,
    qty: request.qty,
    unit: request.unit,
    paymentTerms: request.paymentTerms,
    batchId: batchKey,
    amount: request.amount,
    items: [{
      requestId: request._id,
      requestIds: [request._id],
      itemId: request.itemId,
      itemName: request.itemName,
      qty: request.qty,
      unit: request.unit,
      amount: request.amount,
    }],
    createdBy: userId,
  });
  // Fold in any sibling in the same batch that's already Approved (batchApprove
  // processes requests one by one; a re-approval) so the fresh order isn't missing
  // lines, and its items[] goes through the same merge-by-item path as every other.
  return syncOrderItemFromRequest(request);
}

module.exports = { resolveBatchKey, syncOrderItemFromRequest, upsertOrderForApprovedRequest };
