const mongoose = require('mongoose');

// Counter schema for sequential codes
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

const generateCode = async (prefix) => {
  const counter = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}${String(counter.seq).padStart(4, '0')}`;
};

module.exports = generateCode;
