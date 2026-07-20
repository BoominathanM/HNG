import { store } from '../store';
import { apiSlice } from '../store/api/apiSlice';

// Looks up a hotel/party's outstanding due from its OTHER unpaid invoices (Invoice.balanceDue —
// always the correct, final kit-aware figure, unlike Order.total which isn't reliably kept in
// sync) and returns the shape DocumentTemplate expects on `data.pendingDue`, or null when
// there's nothing pending / not enough info to match. excludeInvoiceId keeps the invoice
// currently being printed/downloaded out of its own "other pending" total.
export async function fetchHotelPendingDue({ clientPartyId, clientName, excludeInvoiceId } = {}) {
  const name = (clientName || '').trim();
  if (!clientPartyId && !name) return null;
  try {
    const params = {};
    if (clientPartyId) params.partyId = clientPartyId;
    if (name) params.clientName = name;
    if (excludeInvoiceId) params.excludeInvoiceId = excludeInvoiceId;
    const result = await store.dispatch(apiSlice.endpoints.getHotelPendingDue.initiate(params)).unwrap();
    const amount = Number(result?.data?.pending) || 0;
    if (amount <= 0) return null;
    return { amount, hotelName: name || result?.data?.hotelName || '' };
  } catch {
    return null;
  }
}
