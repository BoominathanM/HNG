// Central business-timezone clock for every scheduler in the app.
//
// Why this exists: admins configure send times ("08:00"), escalation windows
// ("09:00-18:00") and working-day lists ("Mon-Sat") in the business's own local
// time — India Standard Time. Node's Date.getHours()/.getMinutes()/.getDay()
// read the *server process's* timezone, so on a UTC production host every one of
// those silently shifts by 5h30m: a "08:00" send fires at 13:30 IST, a
// "09:00-18:00" window becomes ~14:30-23:30 IST, and weekday gates land on the
// wrong day. Derive the business-local wall clock from the absolute instant
// instead — that is correct no matter what timezone the server itself runs in
// (UTC in production, IST on a developer laptop, anything).
//
// India has never observed daylight saving, so a fixed +5:30 (330-minute)
// offset is exact and permanent — no tz database needed. If this app is ever
// run for another region, set BUSINESS_TZ_OFFSET_MINUTES (e.g. 0 for UTC,
// -300 for US Eastern standard time).
const RAW_OFFSET = Number(process.env.BUSINESS_TZ_OFFSET_MINUTES);
const BUSINESS_TZ_OFFSET_MINUTES = Number.isFinite(RAW_OFFSET) ? RAW_OFFSET : 330;
const OFFSET_MS = BUSINESS_TZ_OFFSET_MINUTES * 60 * 1000;

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minutesSinceMidnight(hh, mm) {
  return Number(hh) * 60 + Number(mm);
}

// Wall-clock parts of `instant` as seen in the business timezone. The trick:
// shift the absolute epoch by the fixed offset, then read it back with the UTC
// accessors (which ignore the server's own timezone) — the result is the
// business-local hour / minute / weekday / calendar date.
function businessParts(instant = new Date()) {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();  // 0-based
  const day = shifted.getUTCDate();
  return {
    hours,
    minutes,
    hh: String(hours).padStart(2, '0'),
    mm: String(minutes).padStart(2, '0'),
    dayAbbr: DAY_ABBR[shifted.getUTCDay()],
    year,
    month,
    day,
    ymd: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

// `YYYY-MM-DD` string for the business-local calendar day of `instant`. Used as
// the per-day dedup guard key in the reminder schedulers — must stay consistent
// with businessDayRange() below (both keyed on the same business-local date) or
// guards point at the wrong day around midnight and reminders double-send / skip.
function businessTodayKey(instant = new Date()) {
  return businessParts(instant).ymd;
}

// [start, end] Date instants bracketing the business-local calendar day of
// `instant`. Date fields in this app are submitted from the UI as 'YYYY-MM-DD'
// and stored by Mongoose as UTC midnight of that calendar day, so the range is
// built on UTC boundaries of the business-local Y/M/D — a record dated
// "2026-08-27" (=> 2026-08-27T00:00:00.000Z) falls inside the range for the
// business day 2026-08-27. On a server already running in the business timezone
// this is identical to the old `new Date(); setHours(0,0,0,0)` boundaries for
// every real (date-only) value.
function businessDayRange(instant = new Date()) {
  const { year, month, day } = businessParts(instant);
  return {
    todayStart: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    todayEnd: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  };
}

// True when `now` falls inside `config`'s working days AND its
// [startTime, endTime] window, both interpreted in the business timezone.
// `config` = an AlertConfig doc or a WhatsAppEventMapping (same field shape:
// { days: ['Mon',...], startTime: 'HH:mm', endTime: 'HH:mm' }). Output is
// identical to the old server-local check on a server already in that timezone.
// An empty/absent `days` array means "every day" (unchanged behaviour).
function isWithinWindow(config, now = new Date()) {
  const { hours, minutes, dayAbbr } = businessParts(now);
  if (Array.isArray(config.days) && config.days.length && !config.days.includes(dayAbbr)) return false;

  const [startHH, startMM] = (config.startTime || '00:00').split(':');
  const [endHH, endMM] = (config.endTime || '23:59').split(':');
  const nowMinutes = minutesSinceMidnight(hours, minutes);
  return nowMinutes >= minutesSinceMidnight(startHH, startMM)
      && nowMinutes <= minutesSinceMidnight(endHH, endMM);
}

module.exports = {
  BUSINESS_TZ_OFFSET_MINUTES,
  businessParts,
  businessTodayKey,
  businessDayRange,
  minutesSinceMidnight,
  isWithinWindow,
};
