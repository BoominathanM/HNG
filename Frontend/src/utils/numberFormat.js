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
