const crypto = require('crypto');
const mongoose = require('mongoose');
const AssigneeTask = require('../../models/AssigneeTask');
const User = require('../../models/User');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const generateCode = require('../../utils/codeGenerator');
const { notify } = require('../../utils/notify');
const { businessTodayKey } = require('../../utils/businessTime');
const {
  CLOSED_STATUSES, ASSIGNEE_TASK_STATUSES, parseEndDate, endDateKey, fmtYmd,
} = require('../../utils/assigneeTask');

// Same "sees everything" rule as Task Management's getTasks plus the Admin/Management
// departments (alerts.controller.js isAdminOrManagement) — everyone else only sees tasks
// assigned to them or assigned by them.
const seesAllAssigneeTasks = (u) => !!u && (
  u.role === 'Super Admin' || u.role === 'Admin'
  || u.department === 'Admin' || u.department === 'Management'
  || /manager|head/i.test(u.role || '')
);

// Who may change a task's status: its assignee, whoever assigned it, or an admin.
const canUpdateStatus = (u, task) => !!u && (
  String(task.assignedTo?._id || task.assignedTo) === String(u._id)
  || String(task.createdBy?._id || task.createdBy) === String(u._id)
  || u.role === 'Super Admin' || u.role === 'Admin'
  || u.department === 'Admin' || u.department === 'Management'
);

const excerpt = (s, n = 80) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// GET /api/tasks/assignee-tasks?scope=mine|by_me|all&status=
// scope=mine → assigned to me (the header "My Tasks" drawer); by_me → assigned by me.
exports.getAssigneeTasks = asyncHandler(async (req, res) => {
  const filter = { deletedAt: null };
  const me = req.user._id;
  if (req.query.scope === 'mine') filter.assignedTo = me;
  else if (req.query.scope === 'by_me') filter.createdBy = me;
  else if (!seesAllAssigneeTasks(req.user)) filter.$or = [{ assignedTo: me }, { createdBy: me }];
  if (req.query.status && ASSIGNEE_TASK_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const limit = Math.min(parseInt(req.query.limit, 10) || 500, 2000);
  const tasks = await AssigneeTask.find(filter).sort('-createdAt').limit(limit).lean();
  res.status(200).json({ success: true, total: tasks.length, data: tasks });
});

exports.getAssigneeTask = asyncHandler(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Task not found', 404));
  const task = await AssigneeTask.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!task) return next(new AppError('Task not found', 404));
  const me = String(req.user._id);
  if (!seesAllAssigneeTasks(req.user) && String(task.assignedTo) !== me && String(task.createdBy) !== me) {
    return next(new AppError('You do not have access to this task', 403));
  }
  res.status(200).json({ success: true, data: task });
});

// POST /api/tasks/assignee-tasks — body { assigneeIds: [userId], description, endDate }.
// Creates one AssigneeTask per assignee (shared batchId) and notifies each of them.
exports.createAssigneeTasks = asyncHandler(async (req, res, next) => {
  const description = String(req.body.description || '').trim();
  const ids = [...new Set((Array.isArray(req.body.assigneeIds) ? req.body.assigneeIds : []).map(String))];
  if (!ids.length) return next(new AppError('Select at least one assignee', 400));
  if (ids.some((id) => !mongoose.isValidObjectId(id))) return next(new AppError('Invalid assignee', 400));
  if (!description) return next(new AppError('Description is required', 400));
  const endDate = parseEndDate(req.body.endDate);
  if (!endDate) return next(new AppError('End Date is required', 400));
  if (endDateKey(endDate) < businessTodayKey()) return next(new AppError('End Date cannot be in the past', 400));

  // $ne rather than 'Active' so users created before the status field existed still match.
  const users = await User.find({ _id: { $in: ids }, deletedAt: null, status: { $ne: 'Inactive' } })
    .select('fullName role department').lean();
  if (users.length !== ids.length) {
    return next(new AppError('One or more selected assignees are inactive or no longer exist', 400));
  }
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const batchId = crypto.randomUUID();
  const now = new Date();
  const byName = req.user.fullName || '';
  const created = [];
  for (const id of ids) {
    const u = userById.get(id);
    const taskCode = await generateCode('ATK'); // eslint-disable-line no-await-in-loop
    const task = await AssigneeTask.create({ // eslint-disable-line no-await-in-loop
      taskCode,
      batchId,
      description,
      assignedTo: u._id,
      assigneeName: u.fullName,
      assigneeRole: u.role,
      assigneeDepartment: u.department,
      endDate,
      status: 'Open',
      statusHistory: [{ status: 'Open', remarks: '', at: now, by: req.user._id, byName }],
      createdBy: req.user._id,
      createdByName: byName,
    });
    created.push(task);
  }

  const due = fmtYmd(endDateKey(endDate));
  created.forEach((t) => {
    notify({
      userId: t.assignedTo,
      type: 'task',
      title: 'New Task Assigned to You',
      message: `${byName || 'Admin'} assigned you ${t.taskCode}: "${excerpt(description)}" — end date ${due}. Update it from My Tasks (top bar).`,
      link: '/tasks',
      data: { assigneeTaskId: t._id },
    }).catch(() => {});
  });

  res.status(201).json({ success: true, data: created });
});

// PATCH /api/tasks/assignee-tasks/:id/status — body { status, remarks }.
// Remarks are mandatory for Completed/Closed; reaching either one drops the task out of the
// 'assignee_task' alert's pending set, which stops the assignee's ringing on the next poll.
exports.updateAssigneeTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const remarks = String(req.body.remarks || '').trim();
  if (!ASSIGNEE_TASK_STATUSES.includes(status)) return next(new AppError('Invalid status', 400));
  if (CLOSED_STATUSES.includes(status) && !remarks) {
    return next(new AppError(`Remarks are required to mark the task ${status}`, 400));
  }
  if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Task not found', 404));
  const task = await AssigneeTask.findOne({ _id: req.params.id, deletedAt: null });
  if (!task) return next(new AppError('Task not found', 404));
  if (!canUpdateStatus(req.user, task)) {
    return next(new AppError('Only the assignee, the person who assigned it, or an admin can update this task', 403));
  }
  if (task.status === status && !remarks) return next(new AppError(`Task is already ${status}`, 400));

  const now = new Date();
  const byName = req.user.fullName || '';
  const prevStatus = task.status;
  task.status = status;
  if (status === 'In Progress' && !task.startedAt) task.startedAt = now;
  if (CLOSED_STATUSES.includes(status)) {
    task.remarks = remarks;
    task.closedAt = now;
    task.closedBy = req.user._id;
    task.closedByName = byName;
  } else if (CLOSED_STATUSES.includes(prevStatus)) {
    // Re-opened — the alert rings again, and the old closing remarks live on in statusHistory.
    task.remarks = '';
    task.closedAt = null;
    task.closedBy = null;
    task.closedByName = '';
  }
  task.statusHistory.push({ status, remarks, at: now, by: req.user._id, byName });
  await task.save();

  // Tell the other side: the assigner when the assignee moves it, the assignee when the
  // assigner/an admin does.
  const actorIsAssignee = String(task.assignedTo) === String(req.user._id);
  const recipient = actorIsAssignee ? task.createdBy : task.assignedTo;
  if (recipient && String(recipient) !== String(req.user._id)) {
    notify({
      userId: recipient,
      type: 'task',
      title: `Task ${status}`,
      message: `${byName || 'User'} marked ${task.taskCode} ("${excerpt(task.description, 60)}") as ${status}${remarks ? ` — Remarks: ${excerpt(remarks, 120)}` : ''}`,
      link: '/tasks',
      data: { assigneeTaskId: task._id },
    }).catch(() => {});
  }

  res.status(200).json({ success: true, data: task });
});
