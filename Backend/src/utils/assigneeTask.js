// Shared helpers for "Task to Assignee" tasks (models/AssigneeTask.js) — used by the tasks
// controller, the 'assignee_task' alert branch (utils/alertConfigQueries.js) and Reports →
// Assignee Task Report, so the status/due-date rules can't drift between them.
const { businessParts, businessTodayKey } = require('./businessTime');

const OPEN_STATUSES = ['Open', 'In Progress'];
// Reaching either of these (with remarks) is what stops the assignee's alert.
const CLOSED_STATUSES = ['Completed', 'Closed'];
const ASSIGNEE_TASK_STATUSES = [...OPEN_STATUSES, ...CLOSED_STATUSES];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// End Date is a calendar day — normalize to UTC midnight of that day. A 'YYYY-MM-DD' string
// is taken as-is; any other date value is read as the business-local (IST) day it falls on,
// so a full ISO dayjs value (IST midnight = previous day 18:30Z) doesn't slip back a day.
function parseEndDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const { year, month, day } = businessParts(d);
  return new Date(Date.UTC(year, month, day));
}

const endDateKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const fmtYmd = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};

// Where the task stands against its End Date: Overdue / Due Today / On Track while open,
// On Time / Late once Completed/Closed ('' when it has no end date).
function deadlineState(task, now = new Date()) {
  const due = endDateKey(task.endDate);
  if (!due) return '';
  if (CLOSED_STATUSES.includes(task.status)) {
    const doneKey = businessTodayKey(task.closedAt ? new Date(task.closedAt) : now);
    return doneKey <= due ? 'On Time' : 'Late';
  }
  const today = businessTodayKey(now);
  if (today > due) return 'Overdue';
  if (today === due) return 'Due Today';
  return 'On Track';
}

function alertTitle(task, now = new Date()) {
  const desc = String(task.description || '').replace(/\s+/g, ' ').trim();
  const short = desc.length > 70 ? `${desc.slice(0, 67)}…` : desc;
  const due = endDateKey(task.endDate);
  const state = deadlineState(task, now);
  let dueText = '';
  if (state === 'Overdue') dueText = ` — OVERDUE (was due ${fmtYmd(due)})`;
  else if (state === 'Due Today') dueText = ' — due today';
  else if (due) dueText = ` — due ${fmtYmd(due)}`;
  return `Task from ${task.createdByName || 'Admin'}: ${short || 'Task'}${dueText} (${task.taskCode || 'Task'} · ${task.status})`;
}

module.exports = {
  OPEN_STATUSES,
  CLOSED_STATUSES,
  ASSIGNEE_TASK_STATUSES,
  parseEndDate,
  endDateKey,
  fmtYmd,
  deadlineState,
  alertTitle,
};
