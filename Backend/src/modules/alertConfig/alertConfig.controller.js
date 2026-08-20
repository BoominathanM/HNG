const AlertConfig = require('../../models/AlertConfig');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.getAlertConfigs = asyncHandler(async (req, res) => {
  const configs = await AlertConfig.find()
    .populate('recipientUserIds', 'fullName role department email mobile status');
  res.status(200).json({ success: true, data: configs });
});

// Upserts by (group, role) — the UI always edits one of the 6 fixed rows,
// never creates/deletes configs directly.
const GRACE_GROUPS = ['low_stock', 'quotation_request'];

exports.saveAlertConfig = asyncHandler(async (req, res, next) => {
  const { group, role, recipientUserIds, startTime, endTime, days, durationMinutes, graceValue, graceUnit, audioUrl, audioPublicId, audioName, isEnabled } = req.body;

  if (!['design', 'sales_approval', 'operations_approval', 'task', 'dispatch_reason', 'lr_payment', 'low_stock', 'quotation_request'].includes(group)) {
    return next(new AppError('Invalid alert group', 400));
  }
  if (group === 'design' && !['Sticker', 'Box', 'Ziplock', 'Butter Paper', 'Wooden Brush', 'Other'].includes(role)) {
    return next(new AppError('Invalid design role', 400));
  }
  if (GRACE_GROUPS.includes(group) && isEnabled && (!Number(graceValue) || Number(graceValue) <= 0)) {
    return next(new AppError('Set a grace period (days/hours) before enabling this alert', 400));
  }
  const normalizedRole = group === 'design' ? role : null;

  const config = await AlertConfig.findOneAndUpdate(
    { group, role: normalizedRole },
    {
      $set: {
        group,
        role: normalizedRole,
        recipientUserIds: recipientUserIds || [],
        startTime: startTime || '09:00',
        endTime: endTime || '18:00',
        days: Array.isArray(days) ? days : [],
        durationMinutes: durationMinutes || 30,
        ...(GRACE_GROUPS.includes(group) ? { graceValue: Number(graceValue) || null, graceUnit: graceUnit === 'hours' ? 'hours' : 'days' } : {}),
        ...(audioUrl !== undefined ? { audioUrl, audioPublicId, audioName } : {}),
        isEnabled: !!isEnabled,
        updatedBy: req.user._id,
      },
      $setOnInsert: { createdBy: req.user._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('recipientUserIds', 'fullName role department email mobile status');

  res.status(200).json({ success: true, data: config });
});

exports.uploadAlertAudio = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an audio file', 400));
  res.status(200).json({
    success: true,
    url: req.file.path,
    public_id: req.file.filename,
    name: req.file.originalname,
  });
});
