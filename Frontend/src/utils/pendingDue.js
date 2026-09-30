import { store } from '../store';
import { apiSlice } from '../store/api/apiSlice';

// Looks up a hotel/party's outstanding due from its OTHER sales orders (orders only — leads,
// negotiations and quotations never count; see getHotelPendingDue in parties.controller.js) and
// returns the shape DocumentTemplate expects on `data.pendingDue`, or null when there's nothing
// pending / not enough info to match. The exclude* ids name the document being printed so its
// own order never shows as its own "other pending": excludeOrderId directly, excludeInvoiceId
// (→ that invoice's order), excludeQuotationId / excludeNegotiationId (→ the order converted from it).
export async function fetchHotelPendingDue({
  clientPartyId, clientName, excludeInvoiceId, excludeOrderId, excludeQuotationId, excludeNegotiationId,
} = {}) {
  const name = (clientName || '').trim();
  if (!clientPartyId && !name) return null;
  try {
    const params = {};
    if (clientPartyId) params.partyId = clientPartyId;
    if (name) params.clientName = name;
    if (excludeInvoiceId) params.excludeInvoiceId = excludeInvoiceId;
    if (excludeOrderId) params.excludeOrderId = excludeOrderId;
    if (excludeQuotationId) params.excludeQuotationId = excludeQuotationId;
    if (excludeNegotiationId) params.excludeNegotiationId = excludeNegotiationId;
    // Always a fresh figure — a payment recorded since the last print must show up. Without
    // forceRefetch/subscribe:false the first result stayed cached (and subscribed) for the session.
    const result = await store.dispatch(
      apiSlice.endpoints.getHotelPendingDue.initiate(params, { subscribe: false, forceRefetch: true })
    ).unwrap();
    const amount = Number(result?.data?.pending) || 0;
    if (amount <= 0) return null;
    return { amount, hotelName: name || result?.data?.hotelName || '' };
  } catch {
    return null;
  }
}
