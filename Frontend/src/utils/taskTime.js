// Shared helpers for Task Time Management (config + assign estimate + rating display).

// Convert an entered value in a unit → canonical seconds.
export const unitToSec = (value, unit) => {
  const v = Number(value) || 0;
  if (unit === 'min') return v * 60;
  if (unit === 'hr') return v * 3600;
  return v; // 'sec'
};

// Convert canonical seconds → a value in the requested unit (for re-display in the config form).
export const secToUnit = (sec, unit) => {
  const s = Number(sec) || 0;
  if (unit === 'min') return s / 60;
  if (unit === 'hr') return s / 3600;
  return s;
};

export const UNIT_LABEL = { sec: 'sec', min: 'min', hr: 'hr' };

// Human-readable duration: "1h 23m", "2m 30s", "45s".
export const secToHuman = (sec) => {
  const total = Math.max(0, Math.round(Number(sec) || 0));
  if (total === 0) return '0s';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !h) parts.push(`${s}s`); // omit seconds once we're into hours — keeps it short
  return parts.join(' ') || '0s';
};

// Compact "per unit" label, e.g. "10s/unit", "1.5m/unit".
export const perUnitLabel = (sec) => {
  const s = Number(sec) || 0;
  if (s >= 3600) return `${+(s / 3600).toFixed(2)}h/unit`;
  if (s >= 60) return `${+(s / 60).toFixed(2)}m/unit`;
  return `${+s.toFixed(s < 1 ? 2 : 0)}s/unit`;
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

// Find the per-unit seconds for a task by NAME (then taskType), preferring a
// product-specific override over the global ('') row. Mirrors the backend lookup.
export const perUnitSecFor = (configs = [], { taskName, taskType, product } = {}) => {
  const names = [taskName, taskType].map(norm).filter(Boolean);
  if (names.length === 0) return 0;
  const active = (configs || []).filter((c) => c.active !== false);
  for (const name of names) {
    const rows = active.filter((c) => norm(c.taskName) === name);
    if (rows.length === 0) continue;
    if (product) {
      const specific = rows.find((c) => norm(c.product) === norm(product));
      if (specific) return Number(specific.timePerUnitSec) || 0;
    }
    const global = rows.find((c) => !c.product);
    if (global) return Number(global.timePerUnitSec) || 0;
    return Number(rows[0].timePerUnitSec) || 0;
  }
  return 0;
};

// Estimated total seconds = per-unit × qty. Returns { perUnitSec, estimatedSec, matched }.
export const estimateSecFor = (configs, taskRef, qty) => {
  const perUnitSec = perUnitSecFor(configs, taskRef);
  const q = Number(qty) || 0;
  return { perUnitSec, estimatedSec: perUnitSec * q, matched: perUnitSec > 0 };
};

// Preview of the auto-rating shown in the completion modal. Mirrors the backend
// formula in Backend/src/utils/taskTime.js (the backend value is authoritative).
export const ratingFromDurations = (estSec, actualSec) => {
  const est = Number(estSec) || 0;
  const actual = Number(actualSec) || 0;
  if (est <= 0 || actual <= 0) return { rating: null, ratingReason: '', efficiencyPct: null };
  const ratio = actual / est;
  let rating;
  if (ratio <= 1.0) rating = 5;
  else if (ratio <= 1.1) rating = 4.5;
  else if (ratio <= 1.25) rating = 4;
  else if (ratio <= 1.5) rating = 3;
  else if (ratio <= 2.0) rating = 2;
  else rating = 1;
  const efficiencyPct = Math.round((est / actual) * 100);
  const deltaPct = Math.round(Math.abs(ratio - 1) * 100);
  const ratingReason = ratio <= 1.0
    ? (deltaPct === 0 ? 'Completed exactly on estimate' : `Completed ${deltaPct}% under estimate`)
    : `Completed ${deltaPct}% over estimate`;
  return { rating, ratingReason, efficiencyPct };
};

// Star-rating display helpers (rating itself is computed authoritatively on the backend).
export const ratingColor = (rating) => {
  const r = Number(rating) || 0;
  if (r >= 4.5) return '#52c41a';
  if (r >= 3.5) return '#73d13d';
  if (r >= 2.5) return '#faad14';
  if (r >= 1.5) return '#fa8c16';
  return '#ff4d4f';
};

export const ratingLabel = (rating) => {
  const r = Number(rating) || 0;
  if (r >= 4.5) return 'Excellent';
  if (r >= 3.5) return 'Good';
  if (r >= 2.5) return 'Average';
  if (r >= 1.5) return 'Below average';
  if (r > 0) return 'Poor';
  return 'Not rated';
};
