const PackingMaterialConfig = require('../../models/PackingMaterialConfig');

exports.getAll = async (req, res) => {
  try {
    const items = await PackingMaterialConfig.find().sort({ type: 1, label: 1 });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { type, label, value, tabMapping } = req.body;
    const item = await PackingMaterialConfig.create({
      type, label, value,
      tabMapping: tabMapping || null,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Value already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { label, value, tabMapping, type } = req.body;
    const item = await PackingMaterialConfig.findByIdAndUpdate(
      req.params.id,
      { label, value, tabMapping: tabMapping ?? null },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await PackingMaterialConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
