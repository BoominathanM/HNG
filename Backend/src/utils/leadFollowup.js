// Shared Lead follow-up logic — used by the Settings → Alert Configuration 'lead_followup'
// group (utils/alertConfigQueries.js) AND the Reports → Lead Follow-up Report
// (modules/reports/reports.controller.js getLeadFollowupReport), so "when is a follow-up
// due" and "who gets rung for it" are computed identically in both places.
const Order = require('../models/Order');
const User = require('../models/User');
const { businessParts, BUSINESS_TZ_OFFSET_MINUTES } = require('./businessTime');

const OFFSET_MS = BUSINESS_TZ_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A lead in one of these statuses has nothing left to follow up.
const CLOSED_LEAD_STATUSES = ['Converted', 'Rejected', 'Dispatched', 'Delivered'];

// An overdue follow-up keeps ringing until it's rescheduled / the lead is closed / the user
// Stops it — but only for this long past its time, so stale follow-ups nobody updated (and the
// backlog of old leads the moment an admin first enables the alert) age out on their own.
const FOLLOWUP_ALERT_CAP_DAYS = 7;

// Every field the alert + report read off a Lead.
const LEAD_FOLLOWUP_SELECT = 'leadCode hotelName category status contactPerson phone salesPerson assignedTo createdBy followUpDate followUpTime followUpName followupDate followupTime createdAt';

// The Lead form keeps two copies of the follow-up: followUpDate/followUpTime (written by both
// the full lead save and the Lead Status card's per-card Save) and the legacy
// followupDate/followupTime (full save only — the per-card Save never touches it, so it goes
// stale). Read the camelCase pair whenever the lead has it at all (null = cleared); the
// legacy pair only for leads that predate it.
function followupFields(lead) {
  const hasNew = Object.prototype.hasOwnProperty.call(lead, 'followUpDate')
    || Object.prototype.hasOwnProperty.call(lead, 'followUpTime');
  return hasNew
    ? { date: lead.followUpDate || null, time: lead.followUpTime || '' }
    : { date: lead.followupDate || null, time: lead.followupTime || '' };
}

// 'HH:mm' (the form's <input type="time">) → { hh, mm }; also tolerates '3:30 PM'.
function parseTime(time) {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?/i.exec(String(time || '').trim());
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = (m[3] || '').toLowerCase();
  if (ap.startsWith('p') && hh < 12) hh += 12;
  if (ap.startsWith('a') && hh === 12) hh = 0;
  if (hh > 23 || mm > 59) return null;
  return { hh, mm };
}

// The follow-up's absolute instant: its calendar date + time read as BUSINESS-local (IST)
// wall-clock time, whatever timezone the server runs in. The date is stored either as UTC
// midnight ('YYYY-MM-DD' submit) or IST midnight (full ISO submit) — businessParts() maps both
// to the same IST calendar day. No time set → 00:00 IST that day, so it rings as soon as the
// alert window opens on the follow-up day.
function followupSchedule(lead) {
  const { date, time } = followupFields(lead);
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const { year, month, day, ymd } = businessParts(d);
  const t = parseTime(time);
  const dueAt = new Date(Date.UTC(year, month, day, t ? t.hh : 0, t ? t.mm : 0) - OFFSET_MS);
  return { dueAt, ymd, hasTime: !!t, time: t ? `${String(t.hh).padStart(2, '0')}:${String(t.mm).padStart(2, '0')}` : '' };
}

// "05 Oct 15:30" (or "05 Oct" when no time was set) in business-local time.
function fmtFollowup(schedule) {
  if (!schedule) return '';
  const p = businessParts(new Date(schedule.dueAt.getTime()));
  const date = `${String(p.day).padStart(2, '0')} ${MONTHS[p.month]}`;
  return schedule.hasTime ? `${date} ${schedule.time}` : date;
}

// Mongo pre-filter for leads whose follow-up date falls in [from, to] — on either copy of
// the field (see followupFields). Padded a day each side for the UTC/IST-midnight storage
// difference; callers recompute the exact instant with followupSchedule() afterwards.
function followupDateFilter(from, to) {
  const range = {};
  if (from) range.$gte = new Date(from.getTime() - DAY_MS);
  if (to) range.$lte = new Date(to.getTime() + DAY_MS);
  const cond = Object.keys(range).length ? range : { $ne: null };
  return { $or: [{ followUpDate: cond }, { followupDate: cond }] };
}

// Lead ids (as strings) that already have a live Order — the Leads tab hides those (it
// cross-references Order.leadId / Order.leadCode), so their follow-up is done with too.
async function leadIdsWithOrders(leads) {
  if (!leads.length) return new Set();
  const ids = leads.map((l) => l._id);
  const codes = leads.map((l) => l.leadCode).filter(Boolean);
  const orders = await Order.find({
    deletedAt: null,
    $or: [{ leadId: { $in: ids } }, ...(codes.length ? [{ leadCode: { $in: codes } }] : [])],
  }).select('leadId leadCode').lean();
  const byCode = new Map(leads.filter((l) => l.leadCode).map((l) => [l.leadCode, String(l._id)]));
  const out = new Set();
  orders.forEach((o) => {
    if (o.leadId) out.add(String(o.leadId));
    if (o.leadCode && byCode.has(o.leadCode)) out.add(byCode.get(o.leadCode));
  });
  return out;
}

// Who a lead's follow-up alert rings: the lead's assigned sales person — assignedTo, else the
// "Assign Lead To" name stored in salesPerson — falling back to whoever created the lead when
// neither is set (or the one set is an inactive user). Returns Map(leadId → { userId, name, basis }).
async function resolveFollowupRecipients(leads) {
  const ids = new Set();
  const names = new Set();
  leads.forEach((l) => {
    if (l.assignedTo) ids.add(String(l.assignedTo._id || l.assignedTo));
    if (l.createdBy) ids.add(String(l.createdBy._id || l.createdBy));
    if (l.salesPerson && String(l.salesPerson).trim()) names.add(String(l.salesPerson).trim());
  });
  const users = (ids.size || names.size)
    ? await User.find({
      $or: [{ _id: { $in: [...ids] } }, { fullName: { $in: [...names] } }],
    }).select('fullName status').lean()
    : [];
  const isActive = (u) => u && u.status !== 'Inactive';
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const byName = new Map();
  users.forEach((u) => { if (isActive(u) && u.fullName && !byName.has(u.fullName)) byName.set(u.fullName, u); });

  const out = new Map();
  leads.forEach((l) => {
    const assigned = l.assignedTo ? byId.get(String(l.assignedTo._id || l.assignedTo)) : null;
    const named = l.salesPerson ? byName.get(String(l.salesPerson).trim()) : null;
    const creator = l.createdBy ? byId.get(String(l.createdBy._id || l.createdBy)) : null;
    let pick = null;
    if (isActive(assigned)) pick = { user: assigned, basis: 'Assigned To' };
    else if (isActive(named)) pick = { user: named, basis: 'Assigned To' };
    else if (isActive(creator)) pick = { user: creator, basis: 'Created By' };
    out.set(String(l._id), pick
      ? { userId: pick.user._id, name: pick.user.fullName || '', basis: pick.basis }
      : { userId: null, name: '', basis: '' });
  });
  return out;
}

module.exports = {
  CLOSED_LEAD_STATUSES,
  FOLLOWUP_ALERT_CAP_DAYS,
  LEAD_FOLLOWUP_SELECT,
  followupFields,
  followupSchedule,
  fmtFollowup,
  followupDateFilter,
  leadIdsWithOrders,
  resolveFollowupRecipients,
};
