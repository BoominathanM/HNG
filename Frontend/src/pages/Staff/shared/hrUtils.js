// Shared helpers for the Staff Management pages (data comes from EktaHR via
// the backend's /hrms proxy).
//
// EktaHR field names aren't uniform across endpoints, so every display field
// lists the candidate paths it may arrive under and `pick` takes the first
// non-empty one. Adjust a field's path list here/in the page config if the API
// names it differently — nothing else needs to change.
import dayjs from 'dayjs';

// ── Theme ─────────────────────────────────────────────────────────────────
export const BRAND = '#B11E6A';
export const BRAND_GRADIENT = 'linear-gradient(135deg,#B11E6A,#D85C9E)';
export const ACTIVE_GRADIENT = 'linear-gradient(90deg, #8e1450 0%, #B11E6A 45%, #D85C9E 100%)';

export const surface = (isDark) => ({
  card: isDark ? '#1E1E2E' : '#ffffff',
  head: isDark ? '#24243a' : '#fbf7f9',
  field: isDark ? '#26263a' : '#f7f8fa',
  fieldBorder: isDark ? '#33334a' : '#eef0f3',
  border: isDark ? '#2a2a3e' : '#f0f0f0',
  text: isDark ? '#e0e0e0' : '#1a1a2e',
  muted: isDark ? '#9a9ab0' : '#8c8c8c',
  blank: isDark ? '#1a1a28' : '#f7f7f9',
  shadow: '0 4px 20px rgba(177,30,106,0.06)',
});

// ── Value access ──────────────────────────────────────────────────────────
export const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

export const getPath = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

export const pick = (obj, paths) => {
  if (!obj) return undefined;
  for (const p of [].concat(paths)) {
    const v = getPath(obj, p);
    if (!isBlank(v)) return v;
  }
  return undefined;
};

// Populated refs arrive as objects ({ _id, name }) — reduce them to a label.
export const asText = (v) => {
  if (isBlank(v)) return undefined;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(', ') || undefined;
  if (typeof v === 'object') {
    const named = pick(v, ['name', 'fullName', 'title', 'label', 'templateName', 'shiftName', 'branchName', 'value']);
    if (!isBlank(named)) return String(named);
    const num = pick(v, ['number', 'phone', 'mobile']);
    if (!isBlank(num)) return [pick(v, ['countryCode', 'code']), num].filter(Boolean).join(' ');
    return undefined;
  }
  return String(v);
};

// EktaHR wraps list payloads differently per endpoint
// ([..], { data: [..] }, { data: { docs: [..] } }, …) — find the array.
const LIST_KEYS = ['data', 'docs', 'items', 'records', 'rows', 'results', 'list', 'staff', 'requests', 'documents', 'history', 'attendances', 'balances'];
export const toList = (res, depth = 0) => {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object' || depth > 2) return [];
  for (const k of LIST_KEYS) if (Array.isArray(res[k])) return res[k];
  for (const k of LIST_KEYS) {
    if (res[k] && typeof res[k] === 'object') {
      const inner = toList(res[k], depth + 1);
      if (inner.length) return inner;
    }
  }
  return [];
};

// Single-record payloads: { data: {...} } / { data: { staff: {...} } } / bare object.
export const toRecord = (res) => {
  if (!res || typeof res !== 'object') return null;
  const inner = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res;
  for (const k of ['staff', 'record', 'result']) {
    if (inner[k] && typeof inner[k] === 'object' && !Array.isArray(inner[k])) return inner[k];
  }
  return inner;
};

export const errText = (error) => (typeof error?.data === 'string' && error.data) || 'Could not load data from EktaHR.';

// ── Formatting ────────────────────────────────────────────────────────────
// Objects (e.g. a populated `punchIn: { time, photo }`) aren't dates — callers
// should pick the nested field instead.
const isPlainObject = (v) => v && typeof v === 'object' && !(v instanceof Date);

export const fmtDate = (v, fmt = 'MMM D, YYYY') => {
  if (isBlank(v) || isPlainObject(v)) return undefined;
  const d = dayjs(v);
  return d.isValid() ? d.format(fmt) : String(v);
};

// "03 Oct 2026" or "01 Oct – 03 Oct 2026".
export const fmtDateRange = (from, to) => {
  const a = fmtDate(from, 'DD MMM YYYY');
  const b = fmtDate(to, 'DD MMM YYYY');
  if (!a || !b || a === b) return a || b;
  return dayjs(from).isSame(dayjs(to), 'year') ? `${fmtDate(from, 'DD MMM')} – ${b}` : `${a} – ${b}`;
};

// Durations: numbers are minutes ("01:15 hrs"); strings are shown as sent.
export const fmtHrs = (v) => {
  if (isBlank(v) || isPlainObject(v)) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return /^\d{1,2}:\d{2}$/.test(String(v)) ? `${v} hrs` : String(v);
  const mins = Math.round(n);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} hrs`;
};

// EktaHR sends times as "12:11 PM" (and "-" for no punch); ISO and "14:05"
// are handled too.
export const fmtTime = (v) => {
  if (isBlank(v) || isPlainObject(v)) return undefined;
  const str = String(v).trim();
  if (!/\d/.test(str)) return undefined;
  const ampm = str.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (ampm) return `${ampm[1].padStart(2, '0')}:${ampm[2]} ${ampm[3].toUpperCase()}`;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m] = str.split(':').map(Number);
    return dayjs().hour(h).minute(m).format('hh:mm A');
  }
  const d = dayjs(str);
  return d.isValid() ? d.format('hh:mm A') : str;
};

// Bare Mongo ids (e.g. an unpopulated `shiftId`) are never display text.
export const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

export const fmtMoney = (v) => {
  if (isBlank(v)) return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const humanize = (key) => String(key)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

export const boolText = (v) => {
  if (isBlank(v)) return undefined;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (/^(true|yes|y|1)$/i.test(String(v))) return 'Yes';
  if (/^(false|no|n|0)$/i.test(String(v))) return 'No';
  return asText(v);
};

// "10:00 AM – 07:00 PM" from a shift-like object.
export const timeRange = (obj) => {
  const start = fmtTime(pick(obj, ['startTime', 'shiftStartTime', 'start', 'fromTime', 'shiftStart', 'inTime', 'shift.startTime']));
  const end = fmtTime(pick(obj, ['endTime', 'shiftEndTime', 'end', 'toTime', 'shiftEnd', 'outTime', 'shift.endTime']));
  return start && end ? `${start} – ${end}` : start || end;
};

// Salary components arrive either as [{ name, amount }] or as { basic: 10000, … }.
// EktaHR keys salary components by label: { "Basic Salary": { month, year } }.
// Mongo keys can't hold ".", so "(0.75%)" arrives as "(0_75%)".
const componentLabel = (k) => (/\s/.test(k) ? k : humanize(k)).replace(/(\d)_(\d)/g, '$1.$2');

export const toLines = (v) => {
  if (Array.isArray(v)) {
    return v.map((i) => ({
      label: asText(pick(i, ['name', 'label', 'component', 'componentName', 'title', 'head', 'type'])) || '—',
      monthly: Number(pick(i, ['monthly', 'perMonth', 'monthlyAmount', 'month', 'amount', 'value'])) || 0,
      yearly: pick(i, ['yearly', 'perYear', 'annual', 'annualAmount', 'year']),
    }));
  }
  if (v && typeof v === 'object') {
    return Object.entries(v)
      .filter(([, n]) => typeof n === 'number' || typeof n?.month === 'number')
      .map(([k, n]) => (typeof n === 'number'
        ? { label: componentLabel(k), monthly: n }
        : { label: componentLabel(k), monthly: n.month, yearly: n.year }));
  }
  return [];
};

export const sumLines = (lines) => lines.reduce((t, l) => t + (Number(l.monthly) || 0), 0);

const num = (v) => (isBlank(v) || Number.isNaN(Number(v)) ? undefined : Number(v));
// Totals arrive as a number or as { month, year }.
const perMonth = (v) => (v && typeof v === 'object' ? num(v.month) : num(v));

// Earnings/deductions + totals for one salary structure revision or one
// month's salary breakdown. API totals win; otherwise they're derived from the
// lines. Employer PF/ESI sit in earnings (they're part of CTC) but aren't paid
// out, so they're excluded from the derived take-home.
export const salaryFigures = (rec) => {
  let earnings = toLines(pick(rec, ['Earnings', 'earnings', 'earningComponents', 'components.earnings', 'breakdown.earnings', 'fixedPay']));
  let deductions = toLines(pick(rec, ['deductions', 'Deductions', 'deductionComponents', 'components.deductions', 'breakdown.deductions']));
  // (B) / (C) / (D) sections of the CTC — shown only when they have lines.
  const extras = [['(B) VARIABLES', 'Variables'], ['(C) BENEFITS', 'Benefits'], ['(D) ALLOWANCES', 'Allowances']]
    .map(([title, key]) => ({ title, lines: toLines(pick(rec, [key, key.toLowerCase()])) }))
    .filter((x) => x.lines.length);
  if (!earnings.length && !deductions.length) {
    const comps = pick(rec, ['components', 'salaryComponents']);
    if (Array.isArray(comps)) {
      const isDed = (c) => /deduct/i.test(String(pick(c, ['type', 'componentType', 'category']) || ''));
      earnings = toLines(comps.filter((c) => !isDed(c)));
      deductions = toLines(comps.filter(isDed));
    }
  }
  const gross = perMonth(pick(rec, ['grossSalary', 'gross', 'grossMonthly', 'grossEarnings', 'totalEarnings', 'monthlyGross']))
    ?? sumLines(earnings) + extras.reduce((t, x) => t + sumLines(x.lines), 0);
  const totalDeductions = perMonth(pick(rec, ['totalDeductions', 'deductionTotal', 'totalDeduction'])) ?? sumLines(deductions);
  const employerShare = sumLines(earnings.filter((l) => /employer/i.test(l.label)));
  const net = perMonth(pick(rec, ['netSalary', 'netTakeHome', 'netPay', 'takeHome', 'netMonthly', 'netAmount'])) ?? gross - employerShare - totalDeductions;
  const ctcYear = num(pick(rec, ['totalCTC', 'annualCtc', 'ctcAnnual', 'ctcPerYear', 'yearlyCtc', 'totalCtc'])) ?? gross * 12;
  return { earnings, extras, deductions, gross, totalDeductions, net, ctcYear, hasLines: earnings.length + deductions.length > 0 };
};

// Shift-roster schedule → day list. EktaHR returns data.days keyed by date.
export const toScheduleDays = (res) => {
  const days = res?.data?.days;
  return days && typeof days === 'object' && !Array.isArray(days) ? Object.values(days) : toList(res);
};

// A schedule day's shift: "Shift Not Assigned" and "Weekly Off" come back as
// shift names (both with isOff: true), so they're turned into flags.
export const scheduleShift = (d) => {
  if (!d) return null;
  const rawName = asText(pick(d, ['shiftName'])) || '';
  const noShift = /not assigned/i.test(rawName) || /no shift/i.test(asText(pick(d, ['timingLabel'])) || '');
  const weekOff = !noShift && (/week(ly)? ?off/i.test(rawName) || pick(d, ['isWeekOff', 'weekOff', 'isOff']) === true);
  const ref = pick(d, ['shift', 'shiftTemplate', 'assignedShift']);
  return {
    name: noShift || weekOff ? undefined : rawName || asText(ref),
    time: noShift || weekOff ? undefined : timeRange(ref && typeof ref === 'object' ? ref : d),
    noShift,
    weekOff,
    holiday: pick(d, ['isHoliday', 'holiday']) === true,
    holidayName: asText(pick(d, ['holidayName'])),
    source: asText(pick(d, ['source', 'assignmentType'])),
    from: pick(d, ['effectiveFrom', 'fromDate', 'assignedFrom']),
    override: pick(d, ['hasOverride']) === true,
  };
};

// GET /admin/settings/shift-roster/active/{id} → { source, assignment } where
// assignment.shiftTemplateId is the populated shift (null when none).
export const activeShiftOf = (res) => {
  const rec = toRecord(res);
  const assignment = pick(rec, ['assignment']);
  const shift = pick(assignment, ['shiftTemplateId', 'shiftTemplate', 'shift']) || pick(rec, ['shift', 'shiftTemplate']);
  if (!shift || typeof shift !== 'object') return null;
  return {
    name: asText(shift),
    time: timeRange(shift),
    source: asText(pick(assignment, ['assignmentType'])) || asText(pick(rec, ['source'])),
    from: pick(assignment, ['effectiveFrom']),
  };
};

// Group records by their shift → [{ name, time, rows }] (Punch / Fine pages).
export const groupByShift = (rows) => {
  const groups = new Map();
  rows.forEach((r) => {
    const ref = pick(r, ['shift', 'shiftTemplate', 'shiftId', 'assignedShift']);
    const name = asText(pick(r, ['shiftName'])) || (isObjectId(ref) ? undefined : asText(ref)) || 'Unassigned Shift';
    const time = asText(pick(r, ['shiftTime'])) || timeRange(ref && typeof ref === 'object' ? ref : r);
    if (!groups.has(name)) groups.set(name, { name, time, rows: [] });
    groups.get(name).rows.push(r);
  });
  return [...groups.values()];
};

// Download rows as CSV. `columns` = [{ title, value: (row) => string }].
export const downloadCsv = (filename, columns, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => esc(c.title)).join(','), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(','))];
  // Leading BOM so Excel opens the UTF-8 CSV (₹, names) correctly.
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};

export const initials = (name, max = 2) => String(name || '')
  .split(/\s+/).filter(Boolean).slice(0, max).map((w) => w[0].toUpperCase()).join('') || 'S';

// ── Staff ─────────────────────────────────────────────────────────────────
export const STAFF_FIELDS = {
  employeeId: ['employeeId', 'empId', 'employeeCode', 'staffCode'],
  firstName: ['firstName', 'personalInfo.firstName'],
  lastName: ['lastName', 'personalInfo.lastName'],
  fullName: ['fullName', 'name', 'staffName', 'employeeName'],
  designation: ['designation', 'designationName', 'designationId', 'role'],
  department: ['department', 'departmentName', 'departmentId'],
  employmentType: ['employmentType', 'staffType', 'employeeType'],
  email: ['email', 'emailId', 'officialEmail'],
  phone: ['phone', 'phoneNumber', 'mobile', 'mobileNumber'],
  joiningDate: ['joiningDate', 'dateOfJoining', 'doj'],
  photo: ['profilePic', 'profilePhoto', 'profileImage', 'photo', 'photoUrl', 'avatar', 'avatarUrl'],
  status: ['status', 'staffStatus', 'employmentStatus'],
};

export const staffName = (s) => asText(pick(s, STAFF_FIELDS.fullName))
  || [asText(pick(s, STAFF_FIELDS.firstName)), asText(pick(s, STAFF_FIELDS.lastName))].filter(Boolean).join(' ')
  || '—';

export const isStaffActive = (s) => {
  const flag = pick(s, ['isActive', 'active']);
  if (typeof flag === 'boolean') return flag;
  const st = String(asText(pick(s, STAFF_FIELDS.status)) || 'active').toLowerCase();
  return st === 'active';
};

export const normalizeStaff = (s) => ({
  id: s?._id || s?.id,
  employeeId: asText(pick(s, STAFF_FIELDS.employeeId)),
  name: staffName(s),
  designation: asText(pick(s, STAFF_FIELDS.designation)),
  department: asText(pick(s, STAFF_FIELDS.department)),
  employmentType: asText(pick(s, STAFF_FIELDS.employmentType)),
  email: asText(pick(s, STAFF_FIELDS.email)),
  phone: asText(pick(s, STAFF_FIELDS.phone)),
  joiningDate: pick(s, STAFF_FIELDS.joiningDate),
  photo: asText(pick(s, STAFF_FIELDS.photo)),
  active: isStaffActive(s),
});

// ── Status colours ────────────────────────────────────────────────────────
const TYPE_COLORS = { 'full time': '#1677ff', intern: '#722ed1', 'part time': '#13a8a8', contract: '#fa8c16', freelance: '#eb2f96' };
export const typeColor = (t) => TYPE_COLORS[String(t || '').toLowerCase().replace(/[_-]+/g, ' ')] || BRAND;

const STATUS_COLORS = {
  approved: '#52c41a', active: '#52c41a', paid: '#52c41a', present: '#52c41a', completed: '#52c41a', generated: '#52c41a',
  accepted: '#52c41a', processed: '#52c41a', 'on time': '#52c41a', late: '#ff4d4f',
  pending: '#faad14', requested: '#faad14', 'in review': '#faad14', 'approval pending': '#faad14', 'awaiting data': '#8c8c8c',
  'half day': '#fa8c16', leave: '#1677ff', holiday: '#722ed1', 'week off': '#8c8c8c',
  rejected: '#ff4d4f', absent: '#ff4d4f', declined: '#ff4d4f',
  cancelled: '#8c8c8c', deactive: '#8c8c8c', inactive: '#8c8c8c', 'no shift': '#d48806',
};
export const statusColor = (s) => STATUS_COLORS[String(s || '').toLowerCase().replace(/[_-]+/g, ' ')] || '#8c8c8c';
