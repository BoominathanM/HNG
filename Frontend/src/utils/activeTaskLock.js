// One person works one task at a time — mirrors the backend guard in
// Backend/src/modules/tasks/tasks.controller.js (findActiveTaskConflict) so Start/Resume can
// be disabled up front instead of failing on click. Paused tasks don't hold the slot. The
// backend stays authoritative: a busy co-assignee whose other task isn't in this user's
// task list is still caught there.

const idOf = (u) => String(u?._id || u || '');

// Same assignee set the backend's taskRecipients() uses: every shared assignee
// (Personalized/Separate Kit Packing), else the single assignedTo.
export const taskAssigneeIds = (t) => {
  const many = Array.isArray(t?.assignedToMany) ? t.assignedToMany.map(idOf).filter(Boolean) : [];
  return many.length ? many : [idOf(t?.assignedTo)].filter(Boolean);
};

// userId → { taskId, taskCode, name } for every task currently In Progress (raw API tasks).
export function buildActiveTaskMap(tasks = []) {
  const map = new Map();
  tasks.forEach((t) => {
    if (t?.status !== 'In Progress' || t.deletedAt) return;
    const people = (Array.isArray(t.assignedToMany) && t.assignedToMany.length)
      ? t.assignedToMany.map((u, i) => ({ id: idOf(u), name: u?.fullName || t.assigneeNames?.[i] || '' }))
      : [{ id: idOf(t.assignedTo), name: t.assignedTo?.fullName || t.assigneeName || '' }];
    people.forEach(({ id, name }) => {
      if (id && !map.has(id)) map.set(id, { taskId: String(t._id), taskCode: t.taskCode, name });
    });
  });
  return map;
}

// The other In Progress task blocking this one from Start/Resume, or null. An unassigned
// task falls back to the current user, same as the backend.
export function findStartBlocker({ taskId, status, assigneeIds = [] }, activeMap, currentUserId) {
  if (status !== 'Pending' && status !== 'Paused') return null;
  const me = currentUserId ? String(currentUserId) : '';
  const ids = assigneeIds.filter(Boolean).map(String);
  for (const uid of (ids.length ? ids : [me].filter(Boolean))) {
    const hit = activeMap.get(uid);
    if (hit && hit.taskId !== String(taskId)) return { ...hit, isMe: uid === me };
  }
  return null;
}

export const startBlockerMessage = (b) => (b.isMe
  ? `You already have ${b.taskCode} in progress — pause or complete it before starting another task`
  : `${b.name || 'The assignee'} is already working on ${b.taskCode} — it must be paused or completed first`);
