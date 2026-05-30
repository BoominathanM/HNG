const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskCode: { type: String, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  taskType: String,
  taskName: String,
  product: String,
  printingType: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Done', 'Emergency'],
    default: 'Pending',
  },
  startedAt: Date,
  completedAt: Date,
  isEmergency: { type: Boolean, default: false },
  emergencyApproved: { type: Boolean, default: false },
  emergencyApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
