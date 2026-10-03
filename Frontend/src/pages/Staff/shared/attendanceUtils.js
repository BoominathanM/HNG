// Attendance day model shared by the staff Attendances tab and the
// org-wide Employee Attendance page.
import dayjs from 'dayjs';
import { pick, asText, fmtTime, timeRange, isBlank, isObjectId, scheduleShift } from './hrUtils';

export const DATE_PATHS = ['date', 'attendanceDate', 'day', 'workDate'];
export const dayKey = (v) => (isBlank(v) ? null : dayjs(v).format('YYYY-MM-DD'));
export const norm = (v) => String(v || '').toLowerCase().replace(/[_-]+/g, ' ').trim();

// Status codes shown on each day row. `match` = attendance statuses that light
// the chip; `flag` = chips lit by a fine/overtime amount on the record.
export const CODES = [
  { code: 'P', label: 'Present', match: /^present$/ },
  { code: 'HD', label: 'Half Day', match: /^half ?day$/ },
  { code: 'A', label: 'Absent', match: /absent/ },
  { code: 'F', label: 'Fine', flag: 'fine' },
  { code: 'OT', label: 'Overtime', flag: 'overtime' },
  { code: 'L', label: 'Leave', match: /leave/ },
  { code: 'WO', label: 'Week Off', match: /week ?off|weekly ?off/, wide: true },
];

export const isLit = (c, day) => (c.flag ? day[c.flag] > 0 : c.match.test(norm(day.status)));

const flag = (src, paths) => pick(src, paths) === true;

// `sched` is the shift-roster day (staff tab, see scheduleShift); org-wide
// records (GET /admin/staff/attendance/all-staff) carry shift + day flags
// themselves. Staff-tab records keep punches under `presentDetails`.
export function buildDay(date, rec, sched) {
  let shiftName;
  let shiftTime;
  let weekOff;
  let holiday;
  let noShift = false;
  if (sched) {
    const sh = scheduleShift(sched);
    ({ name: shiftName, time: shiftTime, weekOff, holiday, noShift } = sh);
  } else {
    const shiftRef = pick(rec, ['shift', 'shiftTemplate', 'assignedShift', 'shiftId']);
    shiftName = asText(pick(rec, ['shiftName'])) || (isObjectId(shiftRef) ? undefined : asText(shiftRef));
    shiftTime = timeRange(shiftRef && typeof shiftRef === 'object' ? shiftRef : rec);
    weekOff = flag(rec, ['isWeekOff']);
    holiday = flag(rec, ['isHoliday']);
  }

  const punchIn = fmtTime(pick(rec, ['presentDetails.checkInTime', 'punchIn.time', 'punchInTime', 'checkInTime', 'punchIn', 'checkIn', 'inTime']));
  const punchOut = fmtTime(pick(rec, ['presentDetails.checkOutTime', 'punchOut.time', 'punchOutTime', 'checkOutTime', 'punchOut', 'checkOut', 'outTime']));

  // An un-punched week-off / holiday shows as such, whatever `status` says.
  let status = asText(pick(rec, ['status', 'attendanceStatus', 'dayStatus']));
  if (!punchIn && weekOff) status = 'Week Off';
  else if (!punchIn && holiday) status = 'Holiday';
  if (!status && noShift) status = 'No Shift';
  // A past working day with a shift but no attendance record is what EktaHR
  // auto-marks absent (it's counted in absentCount).
  if (!status && !rec && shiftName && date.isBefore(dayjs(), 'day')) status = 'Absent';

  const late = pick(rec, ['isLate', 'late']);
  const punctuality = asText(pick(rec, ['punctuality', 'arrivalStatus', 'lateStatus']))
    || (late === true ? 'Late' : late === false ? 'On Time' : undefined);

  // Punched-in days wait for admin approval until it's approved.
  const approval = asText(pick(rec, ['approvalStatus', 'punchStatus']));
  const approvalPending = approval
    ? /pending/i.test(approval)
    : (!!punchIn && pick(rec, ['isApproved', 'presentDetails.approved']) === false);

  return {
    date,
    key: date.format('YYYY-MM-DD'),
    rec,
    status,
    punctuality,
    punchIn,
    punchOut,
    fine: Number(pick(rec, ['fineAdjustment.totalFine', 'fineAmount', 'fine', 'totalFine'])) || 0,
    overtime: Number(pick(rec, ['overtimeAdjustment.amount', 'overtimeAmount', 'overtime', 'overtimeMinutes', 'otMinutes'])) || 0,
    approvalPending,
    shiftName,
    shiftTime,
    holidayName: asText(pick(rec, ['holidayName'])) || asText(pick(sched, ['holidayName'])),
    note: asText(pick(rec, ['note', 'notes', 'remarks', 'remark'])),
  };
}
