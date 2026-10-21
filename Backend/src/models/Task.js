const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskCode: { type: String, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  taskType: String,
  taskName: String,
  product: String,
  productIndex: Number, // links task to a specific order line item (per-product tasks)
  printingType: String,
  qty: Number,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigneeName: String,
  // Multi-assignee support — Personalized Kit / Separate Kit packing tasks only
  // (OperationDetail.jsx Kit Packing modal). `assignedTo`/`assigneeName` above still
  // hold the first selected user for code that expects a single assignee; these two
  // carry the full list so every selected user sees the task and Task Management can
  // display them all.
  assignedToMany: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assigneeNames: [String],
  clientName: String,
  priority: { type: String, enum: ['Normal', 'Medium', 'High', 'Urgent'], default: 'Normal' },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  dueDate: Date,
  description: String,
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Paused', 'Done', 'Emergency'],
    default: 'Pending',
  },
  // Exact record of what this task deducted from Inventory/Material Stock at assignment
  // time (see utils/taskQuantity.js's deductStockForTask), so deleteTask can credit the
  // exact same units back rather than re-deriving an amount to reverse.
  stockDeductions: [{
    pool: { type: String, enum: ['inventory', 'materialStock'] },
    refId: mongoose.Schema.Types.ObjectId, // InventoryItem or MaterialStock _id
    qtyDeducted: Number,
    productIndex: Number, // which order.items[] row's deductedQty/materialDeductedQty this came from
  }],
  // sub-task breakdown by quantity (Assign Task modal)
  subTasks: [{
    label: String,
    qty: Number,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigneeName: String,
    done: { type: Boolean, default: false },
  }],
  startedAt: Date,
  completedAt: Date,
  // ── Pause/Resume tracking ────────────────────────────────────────────────
  // Set while status === 'Paused' (when the current pause span began); folded into
  // pausedDurationSec and cleared on Resume/Done so actualDurationSec below can
  // exclude time spent paused.
  lastPausedAt: Date,
  pausedDurationSec: { type: Number, default: 0 },
  // Full Start/Pause/Resume/Completion history with timestamps, for detailed task
  // tracking (Task Detail's Timeline). Supports multiple pause/resume cycles per task.
  timeline: [{
    // 'Switch' = admin moved the rest of an In Progress/Paused task to another assignee
    // (see tasks.controller switchInProgressTask) — closes this task's clock like Completion.
    event: { type: String, enum: ['Start', 'Pause', 'Resume', 'Completion', 'Switch'] },
    at: Date,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
  }],
  // ── Time management ──────────────────────────────────────────────────────
  // Snapshot taken at assign time so later config edits don't rewrite history.
  timePerUnitSec: Number,            // configured time for 1 unit of this task
  estimatedDurationSec: Number,      // timePerUnitSec × qty
  plannedStartTime: Date,            // auto-filled with the assignment time
  plannedEndTime: Date,              // plannedStartTime + estimatedDurationSec
  // Computed on completion from startedAt → completedAt, minus pausedDurationSec.
  actualDurationSec: Number,
  // Auto rating from actual-vs-estimated time + an optional written note.
  rating: { type: Number, min: 0, max: 5 },
  ratingReason: String,
  efficiencyPct: Number,
  feedback: String,
  isEmergency: { type: Boolean, default: false },
  emergencyRequested: { type: Boolean, default: false },
  emergencyRequestedAt: Date,
  emergencyRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyReason: String,
  emergencySalesApproved: { type: Boolean, default: false },
  emergencySalesApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencySalesApprovedAt: Date,
  emergencyOpsApproved: { type: Boolean, default: false },
  emergencyOpsApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyOpsApprovedAt: Date,
  emergencyApproved: { type: Boolean, default: false },
  emergencyApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyApprovedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Full history of admin "Switch assignee" actions (Task Management > Reassign column),
  // for the Reports > Switch Report tab. Separate from the live assignedTo/assigneeName
  // fields above so past switches remain visible after a later reassignment overwrites them.
  switchHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromName: String,
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toName: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    at: { type: Date, default: Date.now },
    // Mid-task switches only (stage 'In Progress') — older/pre-start entries leave these
    // unset. completedQty stayed on this task; remainingQty moved to newTaskCode.
    stage: { type: String, enum: ['Pending', 'In Progress'] },
    totalQty: Number,
    completedQty: Number,
    remainingQty: Number,
    newTaskCode: String,
  }],
  // ── Mid-task switch (Task Management > Reassign column, In Progress/Paused task) ──
  // The task is split in two: this one keeps the units the outgoing assignee finished
  // (qty reduced to completedQty, closed as Done, rated on that portion), and a new
  // Pending task carries the remainingQty for the incoming assignee. Total qty across both
  // equals the original, so every qty-sum consumer (dispatch readiness, checklist, Ops
  // cards, overflow guard, stock) keeps working unchanged.
  switchedOut: { type: Boolean, default: false },
  originalQty: Number, // qty before the split, on the switched-out task
  switchedToTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  switchedToTaskCode: String,
  switchedFromTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  switchedFromTaskCode: String,
  // Soft-delete (Admin department only, via Task Management > Current Task) — mirrors
  // the same deletedAt/deletedBy convention as User/Vendor/Lead/etc. so this task
  // surfaces in Settings > Deleted Records and can be restored from there.
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
