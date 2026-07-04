// Shared helpers for the WhatsApp date-driven reminder schedulers
// (follow-up-reminder, payment-due). Both poll their event mapping's
// `sendTime` fresh from the DB every minute via node-cron.

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function isSameLocalDay(d, ref) {
  if (!d) return false;
  const date = new Date(d);
  return date.getFullYear() === ref.getFullYear()
    && date.getMonth() === ref.getMonth()
    && date.getDate() === ref.getDate();
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
