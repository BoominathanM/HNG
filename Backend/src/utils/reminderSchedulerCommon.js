// Shared helpers for the WhatsApp date-driven reminder schedulers
// (follow-up-reminder, payment-due, order-delivery, purchase-payment, …). Both
// poll their event mapping's `sendTime` fresh from the DB every minute via
// node-cron.
const { businessParts, businessTodayKey } = require('./businessTime');

// Business-local calendar date ("YYYY-MM-DD"). MUST match the day boundaries
// each scheduler builds its today/todayEnd query range from (now via
// businessDayRange() in businessTime.js) — if this and those boundaries were
// keyed on different timezones, guard keys would point at the wrong day for part
// of every day (the gap = the offset between them), causing reminders to
// double-send or silently skip right around midnight.
function todayKey() {
  return businessTodayKey();
}

// Formats a stored date value (submitted from the UI as 'YYYY-MM-DD', stored as
// UTC midnight) for display inside the WhatsApp message body. Read in the
// business timezone so the day never slips for values that carry a stray time
// component; identical to the old local read for plain date-only values.
function formatDate(d) {
  if (!d) return '';
  const { day, month, year } = businessParts(new Date(d));
  return `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`;
}

function isSameLocalDay(d, ref) {
  if (!d) return false;
  const a = businessParts(new Date(d));
  const b = businessParts(new Date(ref));
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

// Builds a "did we already send this key today" guard backed by an in-memory Set.
function createDailyGuard() {
  const sentToday = new Set();
  return {
    has(key) {
      return sentToday.has(key);
    },
    mark(key) {
      sentToday.add(key);
    },
    purgeStale(today) {
      for (const key of sentToday) {
        if (!key.endsWith(`:${today}`)) sentToday.delete(key);
      }
    },
  };
}

module.exports = { todayKey, formatDate, isSameLocalDay, createDailyGuard };
