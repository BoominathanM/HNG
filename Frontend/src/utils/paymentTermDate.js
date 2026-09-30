import dayjs from 'dayjs';

// Label printed next to the Quotation/Invoice date — the same "Payment Date" for every Lead
// "Payment Terms" option; only the date itself varies by term (see resolvePaymentTermDate).
export const PAYMENT_TERM_DATE_LABEL = 'Payment Date';

// Lead "Payment Terms" options that carry a payment date (PAYMENT_OPTIONS in pages/Sales/index.jsx).
const PAYMENT_TERMS_WITH_DATE = new Set(['BEFORE_100', 'ON_DISPATCH', '50_ADVANCE_50_AFTER', 'CREDIT_10_30']);

const asObj = (v) => (v && typeof v === 'object' ? v : null);
const fmt = (d) => (d && dayjs(d).isValid() ? dayjs(d).format('DD/MM/YYYY') : '');

// Resolves the "Payment Date" shown beside the Quotation/Invoice date on DocumentTemplate
// (replaces the old Expected Delivery Date), driven by the Payment Terms chosen on the Lead:
//   100% Payment               → the lead's created date
//   50% Adv / 50% on Dispatch  → the lead's Payment Reminder Date
//   50% Adv / 50% on Delivery  → the lead's Payment Reminder Date (50% balance)
//   Credit                     → the lead's Credit Due Date
// All three non-100% terms store their date in `paymentReminderDate` (`creditDueDate` is the
// legacy field). `sources` are the linked records in priority order (order → lead → quotation);
// the first one carrying paymentTerms decides the term, and the date comes from the first source
// on that same term that has one. Returns the fields to spread into the document data, or {}
// when there's nothing to show (sample orders, no payment terms, or no date captured).
export function resolvePaymentTermDate({ sources = [], lead = null, isSample = false } = {}) {
  if (isSample) return {};
  const recs = sources.map(asObj).filter(Boolean);
  const term = recs.map((r) => r.paymentTerms).find(Boolean);
  if (!PAYMENT_TERMS_WITH_DATE.has(term)) return {};
  let date = '';
  if (term === 'BEFORE_100') {
    date = fmt(asObj(lead)?.createdAt);
  } else {
    const src = recs.find((r) => (!r.paymentTerms || r.paymentTerms === term) && (r.paymentReminderDate || r.creditDueDate));
    date = fmt(src && (src.paymentReminderDate || src.creditDueDate));
  }
  return date ? { paymentTermDateLabel: PAYMENT_TERM_DATE_LABEL, paymentTermDate: date } : {};
}
