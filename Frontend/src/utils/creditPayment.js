// "Credit (10days to 1 month)" — the Lead/Order "Payment Terms" value (PAYMENT_OPTIONS in
// pages/Sales/index.jsx). Credit orders are dispatched before payment is collected (payment
// falls due after delivery), so they skip the paid-before-dispatch gate in Task Management →
// Send to Dispatch and on the Dispatch page, the same way sample orders do — no Emergency
// Dispatch approval needed. Mirrors isCreditOrder in Backend/src/modules/tasks/tasks.controller.js.
export const CREDIT_PAYMENT_TERM = 'CREDIT_10_30';

// Pass payment terms in priority order (e.g. the order's own, then its lead's) — the first one
// that's set decides, so an order whose terms were edited off Credit isn't overridden by its lead.
export const isCreditTerms = (...terms) => terms.find(Boolean) === CREDIT_PAYMENT_TERM;

// Payment status with a "(Credit Payment)" reference suffix for credit orders, e.g.
// "Unpaid (Credit Payment)". Display only — the status value itself (Unpaid / Pending /
// Partial…) is unchanged everywhere it drives logic, and the suffix drops once fully Paid.
export const creditPayLabel = (status, isCredit) => (
  isCredit && status && status !== 'Paid' && status !== 'N/A' ? `${status} (Credit Payment)` : status
);
