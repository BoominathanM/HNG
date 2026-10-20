const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintCode: { type: String, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  description: { type: String, required: [true, 'Complaint description is required'] },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  clientName: String,
  // Assignee picked on the Raise Complaint form. Name/role are denormalized so the
  // Complaints tab still shows who it was assigned to if the user is later renamed/deleted.
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: String,
  assignedToRole: String,
  // Remarks captured when the complaint is marked Resolved / Closed (latest one wins;
  // every remark is also kept as the statusHistory note).
  resolutionRemarks: String,
  // Audit trail of every status change for per-complaint history.
  statusHistory: [{
    status: String,
    note: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
  }],
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
