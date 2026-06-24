const TaskTimeConfig = require('../../models/TaskTimeConfig');

// Convert an entered value+unit to canonical seconds.
const toSeconds = (value, unit) => {
  const v = Number(value) || 0;
  if (unit === 'min') return v * 60;
  if (unit === 'hr') return v * 3600;
  return v; // 'sec'
};

exports.getAll = async (req, res) => {
  try {
    const items = await TaskTimeConfig.find().sort({ taskName: 1, product: 1 });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { taskName, product, inputValue, inputUnit, notes, active } = req.body;
    const item = await TaskTimeConfig.create({
      taskName,
      product: product || '',
      inputValue: Number(inputValue) || 0,
      inputUnit: inputUnit || 'min',
      timePerUnitSec: toSeconds(inputValue, inputUnit),
      notes: notes || '',
      active: active !== false,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A time standard for this task already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { taskName, product, inputValue, inputUnit, notes, active } = req.body;
    const item = await TaskTimeConfig.findByIdAndUpdate(
      req.params.id,
      {
        taskName,
        product: product || '',
        inputValue: Number(inputValue) || 0,
        inputUnit: inputUnit || 'min',
        timePerUnitSec: toSeconds(inputValue, inputUnit),
        notes: notes || '',
        ...(active !== undefined ? { active } : {}),
      },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'A time standard for this task already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await TaskTimeConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
