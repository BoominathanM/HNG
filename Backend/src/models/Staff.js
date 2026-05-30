const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  staffCode: { type: String, unique: true },
  fullName: { type: String, required: [true, 'Full name is required'], trim: true },
  department: String,
  role: String,
  phone: String,
  salary: Number,
  loginEnabled: { type: Boolean, default: false },
  loginPasswordHash: { type: String, select: false },
  accessDescription: String,
  deletedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

staffSchema.methods.correctPassword = async function (candidate) {
  if (!this.loginPasswordHash) return false;
  return bcrypt.compare(candidate, this.loginPasswordHash);
};

module.exports = mongoose.model('Staff', staffSchema);
