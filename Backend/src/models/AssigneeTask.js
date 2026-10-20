const mongoose = require('mongoose');
const { ASSIGNEE_TASK_STATUSES } = require('../utils/assigneeTask');

// "Task to Assignee" — a free-text task handed to one or more users from Task Management →
// New Task (Task For = Task to Assignee). Deliberately its own collection, not a Task with a
// flag: every existing Task query (Today's Checklist, Current Task, order dispatch readiness,
// dashboard counts, Task Performance, the 'task' alert group) stays exactly as it was.
//
// One document per assignee — a multi-assignee submission creates one row each, sharing
// `batchId`, so every person updates/closes their own copy (with their own remarks) and the
// 'assignee_task' alert stops for each of them independently.
const assigneeTaskSchema = new mongoose.Schema({
  taskCode: { type: String, unique: true },
  batchId: { type: String, index: true },
  description: { type: String, required: true, trim: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Denormalized at assignment time so the report/alert don't need a join (and still read
  // right if the user is later renamed or removed).
  assigneeName: String,
  assigneeRole: String,
  assigneeDepartment: String,
  // Calendar day picked in the modal, stored as UTC midnight of that day (the app's
  // date-only convention — see utils/assigneeTask.js parseEndDate).
  endDate: Date,
  status: { type: String, enum: ASSIGNEE_TASK_STATUSES, default: 'Open' },
  // Remarks given with the Completed/Closed status — shown in Reports → Assignee Task Report.
  // Cleared if the task is re-opened (the old remarks stay in statusHistory).
  remarks: { type: String, default: '' },
  startedAt: Date,   // first moved to In Progress
  closedAt: Date,    // moved to Completed/Closed
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedByName: String,
  statusHistory: [{
    status: { type: String, enum: ASSIGNEE_TASK_STATUSES },
    remarks: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

assigneeTaskSchema.index({ assignedTo: 1, status: 1 });
assigneeTaskSchema.index({ status: 1, deletedAt: 1 });

module.exports = mongoose.model('AssigneeTask', assigneeTaskSchema);
