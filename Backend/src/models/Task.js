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
  clientName: String,
  priority: { type: String, enum: ['Normal', 'Medium', 'High', 'Urgent'], default: 'Normal' },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
  dueDate: Date,
  description: String,
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Done', 'Emergency'],
    default: 'Pending',
  },
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
  // ── Time management ──────────────────────────────────────────────────────
  // Snapshot taken at assign time so later config edits don't rewrite history.
  timePerUnitSec: Number,            // configured time for 1 unit of this task
  estimatedDurationSec: Number,      // timePerUnitSec × qty
  plannedStartTime: Date,            // auto-filled with the assignment time
  plannedEndTime: Date,              // plannedStartTime + estimatedDurationSec
  // Computed on completion from startedAt → completedAt.
  actualDurationSec: Number,
  // Auto rating from actual-vs-estimated time + an optional written note.
  rating: { type: Number, min: 0, max: 5 },
  ratingReason: String,
  efficiencyPct: Number,
  feedback: String,
  isEmergency: { type: Boolean, default: false },
  emergencyRequested: { type: Boolean, default: false },
  emergencyRequestedAt: Date,
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
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
