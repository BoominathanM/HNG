const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const permissionSchema = new mongoose.Schema({
  read: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const MODULES = [
  'Dashboard','Sales Team','Operations','Task Management','Dispatch Team',
  'Staff Management','Inventory','Purchase','Billing','Parties & Ledger',
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
    of: permissionSchema,
    default: () => {
      const p = {};
      MODULES.forEach((m) => { p[m] = { read: false, add: false, edit: false, delete: false }; });
      return p;
    },
  },
  // Sales Targets
  targetOldHotel: { type: Number, default: 0 },
  targetNewHotel: { type: Number, default: 0 },
  targetPayment: { type: Number, default: 0 },
  targetSoftware: { type: Number, default: 0 },
  targetPeople: { type: Number, default: 0 },
  rewardQuarter: { type: Number, default: 0 },
  rewardHalf: { type: Number, default: 0 },
  rewardThreeQtr: { type: Number, default: 0 },
  rewardFull: { type: Number, default: 0 },
  refreshToken: { type: String, select: false },
  deletedAt: Date,
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
