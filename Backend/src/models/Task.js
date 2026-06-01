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
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
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
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    assigneeName: String,
    done: { type: Boolean, default: false },
  }],
  startedAt: Date,
  completedAt: Date,
  isEmergency: { type: Boolean, default: false },
  emergencyApproved: { type: Boolean, default: false },
  emergencyApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
