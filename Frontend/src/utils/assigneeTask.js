import dayjs from 'dayjs';

// "Task to Assignee" helpers — mirrors Backend/src/utils/assigneeTask.js.
export const ASSIGNEE_TASK_STATUSES = ['Open', 'In Progress', 'Completed', 'Closed'];
// Reaching either of these (with remarks) is what stops the assignee's alert.
export const ASSIGNEE_CLOSED_STATUSES = ['Completed', 'Closed'];
export const isAssigneeTaskClosed = (status) => ASSIGNEE_CLOSED_STATUSES.includes(status);

export const assigneeStatusColor = {
  Open: '#fa8c16',
  'In Progress': '#1890ff',
  Completed: '#52c41a',
  Closed: '#8c8c8c',
};

export const deadlineColor = {
  Overdue: '#ff4d4f',
  'Due Today': '#fa8c16',
  'On Track': '#1890ff',
  'On Time': '#52c41a',
  Late: '#ff4d4f',
};

// End Date is stored as UTC midnight of the picked day — read the calendar day straight off
// the ISO string so it never shifts a day in the browser's timezone.
export const endDateKey = (d) => (d ? String(d).slice(0, 10) : '');
export const fmtEndDate = (d) => {
  const k = endDateKey(d);
  return k ? dayjs(k).format('DD MMM YYYY') : '—';
};

// Overdue / Due Today / On Track while open; On Time / Late once Completed/Closed.
export const assigneeDeadline = (task) => {
  const due = endDateKey(task?.endDate);
  if (!due) return '';
  if (isAssigneeTaskClosed(task.status)) {
    const doneKey = dayjs(task.closedAt || undefined).format('YYYY-MM-DD');
    return doneKey <= due ? 'On Time' : 'Late';
  }
  const today = dayjs().format('YYYY-MM-DD');
  if (today > due) return 'Overdue';
  if (today === due) return 'Due Today';
  return 'On Track';
};

// Same rule as the backend's canUpdateStatus: the assignee, whoever assigned it, or an admin.
export const canUpdateAssigneeTask = (user, task) => !!user && !!task && (
  String(task.assignedTo?._id || task.assignedTo) === String(user._id)
  || String(task.createdBy?._id || task.createdBy) === String(user._id)
  || user.role === 'Super Admin' || user.role === 'Admin'
  || user.department === 'Admin' || user.department === 'Management'
);

export const pillStyle = (color) => ({
  background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: 20, fontWeight: 700, fontSize: 11, margin: 0,
});
