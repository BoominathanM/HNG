const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MODULES = [
  'Dashboard','Sales Team','Operations','Task Management','Dispatch Team',
  'Staff Management','Inventory','Purchase','Vendors & Suppliers','Billing','Parties & Ledger',
  'Financial','Expenses','Reports','Notifications','Integration','Settings',
];

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: [true, 'Full name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  mobile: { type: String, trim: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  department: { type: String, trim: true },
  role: { type: String, trim: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  avatarUrl: String,
  permissions: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => {
      const p = {};
      MODULES.forEach((m) => { p[m] = { read: false, add: false, edit: false, delete: false }; });
      return p;
    },
  },
  tabAccess: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Sales Targets
  targetOldHotel: { type: Number, default: 0 },
  targetNewHotel: { type: Number, default: 0 },
  targetPayment: { type: Number, default: 0 },
  targetSoftware: { type: Number, default: 0 },
  targetPeople: { type: Number, default: 0 },
  overallTarget: { type: Number, default: 0 },
  // Reward milestone names (1/4, 1/2, 3/4, Full) — stored as text labels per the doc
  rewardQuarter: { type: String, default: '', trim: true },
  rewardHalf: { type: String, default: '', trim: true },
  rewardThreeQtr: { type: String, default: '', trim: true },
  rewardFull: { type: String, default: '', trim: true },
  refreshToken: { type: String, select: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.getPermission = function (module) {
  return this.permissions?.get(module) || { read: false, add: false, edit: false, delete: false };
};

module.exports = mongoose.model('User', userSchema);
