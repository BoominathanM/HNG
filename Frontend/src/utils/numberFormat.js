// Shared quantity-display formatting — used anywhere a stock/inventory quantity is rendered
// (Stock Count, Stock Level, Vendor stock badges, qty steppers, Fill Stock previews, etc).
//
// Bulk fill math (Backend inventory.controller.js fillStock) divides by unit-conversion
// factors like 1000, which routinely produces floating-point noise such as
// 0.00999999999999787 instead of 0.01. `toLocaleString` with `maximumFractionDigits` rounds
// that away, adds thousands separators for large stock counts, and — since
// `minimumFractionDigits` is left at its default of 0 — never pads trailing zeros, so a whole
// number still prints as "10000" rather than "10000.000000".
export const formatQty = (n, maxDecimals = 6) =>
  (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: maxDecimals });

// Rupee rate/price display. Purchase cost is stored GST-exclusive — backed out of inclusive bill
// prices (Backend purchase.controller.js toBasePrice) — so it can carry long fractions such as
// 4.256988888. Rounds to at most 2 decimals without padding (25 stays 25), and returns a number
// so callers can still chain .toLocaleString(). Non-numeric input ('' / null / undefined / NaN)
// passes through untouched so each caller's existing fallback still renders as before.
export const formatRate = (n) => {
  if (n == null || n === '') return n;
  const num = Number(n);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : n;
};
