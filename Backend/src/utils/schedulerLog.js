// One consistent, timestamped logger for every cron scheduler so `pm2 logs`
// (or `journalctl -u ...`, `docker logs -f`) after a deploy shows a live,
// readable trace of what each scheduler is doing.
//
// Every line is prefixed with the business-local (IST) date+time and a short
// tag, e.g.  [2026-08-27 09:14 IST] [alert-config] 🔔 FIRED design/Box — ...
//
// SCHEDULER_VERBOSE (default "1" = on): also emit a one-line heartbeat on every
// tick even when a scheduler finds nothing to do — handy right after a deploy to
// confirm all of them are alive and on schedule. Set SCHEDULER_VERBOSE=0 to mute
// those idle heartbeats; real events (fires, sends, warnings, errors) are always
// logged regardless.
const { businessParts } = require('./businessTime');

const rawVerbose = process.env.SCHEDULER_VERBOSE;
const VERBOSE = rawVerbose === undefined ? true : String(rawVerbose) !== '0';

function stamp() {
  const p = businessParts();
  return `${p.ymd} ${p.hh}:${p.mm} IST`;
}

function slog(tag, msg) { console.log(`[${stamp()}] [${tag}] ${msg}`); }
function swarn(tag, msg) { console.warn(`[${stamp()}] [${tag}] ⚠️  ${msg}`); }
function serror(tag, msg) { console.error(`[${stamp()}] [${tag}] ❌ ${msg}`); }

// Heartbeat / idle-tick line — printed only when SCHEDULER_VERBOSE is on.
function sbeat(tag, msg) {
  if (VERBOSE) console.log(`[${stamp()}] [${tag}] ${msg}`);
}

module.exports = { slog, swarn, serror, sbeat, SCHEDULER_VERBOSE: VERBOSE };
