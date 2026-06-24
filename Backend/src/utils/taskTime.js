const TaskTimeConfig = require('../models/TaskTimeConfig');

// Escape a string for safe use inside a RegExp (case-insensitive exact match).
const escapeRx = (s) => String(s || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Resolve the per-unit time (seconds) for a task by NAME, preferring a product-specific
// override, falling back to the global ('') row. taskType is checked as a secondary key
// because the assign modals often carry the task label in taskType (e.g. "Sticker placing").
async function findTimePerUnitSec({ taskName, taskType, product } = {}) {
  const names = [taskName, taskType].filter((n) => n && String(n).trim());
  if (names.length === 0) return 0;

  for (const name of names) {
    const rx = new RegExp(`^${escapeRx(name)}$`, 'i');
    // Prefer a product-specific row when a product is supplied.
    if (product) {
      const specific = await TaskTimeConfig.findOne({ taskName: rx, product, active: true }).lean();
      if (specific) return Number(specific.timePerUnitSec) || 0;
    }
    const global = await TaskTimeConfig.findOne({ taskName: rx, product: '', active: true }).lean();
    if (global) return Number(global.timePerUnitSec) || 0;
    // Any active row for this name (covers product-scoped-only configs).
    const any = await TaskTimeConfig.findOne({ taskName: rx, active: true }).lean();
    if (any) return Number(any.timePerUnitSec) || 0;
  }
  return 0;
}

// Compute the estimated duration for a task from its configured per-unit time × qty.
// Returns { timePerUnitSec, estimatedDurationSec }. Both 0 when no config matches.
async function computeTaskEstimate({ taskName, taskType, product, qty } = {}) {
  const q = Number(qty) || 0;
  const timePerUnitSec = await findTimePerUnitSec({ taskName, taskType, product });
  return { timePerUnitSec, estimatedDurationSec: timePerUnitSec * q };
}

// Auto-rate a completed task by comparing actual time taken vs the estimate.
// Faster-or-on-time = 5★, degrading as the overrun grows. Returns nulls when
// there is no estimate to compare against (rating can't be computed).
function computeRating(estSec, actualSec) {
  const est = Number(estSec) || 0;
  const actual = Number(actualSec) || 0;
  if (est <= 0 || actual <= 0) {
    return { rating: null, ratingReason: '', efficiencyPct: null };
  }
  const ratio = actual / est;
  let rating;
  if (ratio <= 1.0) rating = 5;
  else if (ratio <= 1.1) rating = 4.5;
  else if (ratio <= 1.25) rating = 4;
  else if (ratio <= 1.5) rating = 3;
  else if (ratio <= 2.0) rating = 2;
  else rating = 1;

  // efficiency = estimate / actual × 100 (>100 means finished ahead of estimate).
  const efficiencyPct = Math.round((est / actual) * 100);
  const deltaPct = Math.round(Math.abs(ratio - 1) * 100);
  const ratingReason = ratio <= 1.0
    ? (deltaPct === 0 ? 'Completed exactly on estimate' : `Completed ${deltaPct}% under estimate`)
    : `Completed ${deltaPct}% over estimate`;

  return { rating, ratingReason, efficiencyPct };
}

module.exports = { computeTaskEstimate, findTimePerUnitSec, computeRating };
