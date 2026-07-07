import { createSlice } from '@reduxjs/toolkit';

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState: {
    raisedRequests: [],
    newProductRequests: [],
    purchaseOrders: [],
  },
  reducers: {
    setRaisedRequests(state, action) {
      state.raisedRequests = action.payload;
    },
    setPurchaseOrders(state, action) {
      state.purchaseOrders = action.payload;
    },
    addRaisedRequest(state, action) {
      state.raisedRequests.push({ ...action.payload, status: 'Pending' });
    },
    addNewProductRequest(state, action) {
      const exists = state.newProductRequests.some(
        (r) => r.productName === action.payload.productName && r.fromOrder === action.payload.fromOrder
      );
      if (!exists) {
        state.newProductRequests.push({
          key: Date.now() + Math.random(),
          ...action.payload,
          status: 'New',
          date: new Date().toISOString().slice(0, 10),
        });
      }
    },
    addBulkRequests(state, action) {
      action.payload.forEach((req) => {
        state.raisedRequests.push({ ...req, key: Date.now() + Math.random(), status: 'Pending', requestType: 'bulk' });
      });
    },
    dismissNewProductRequest(state, action) {
      state.newProductRequests = state.newProductRequests.filter((r) => r.key !== action.payload);
    },
    updateRequestQty(state, action) {
      const req = state.raisedRequests.find((r) => r.key === action.payload.key);
      if (req) {
        req.qty = action.payload.qty;
        req.status = 'Pending';
        req.financeStatus = '';
        req.financeNote = '';
      }
    },
    addRequestNote(state, action) {
      const req = state.raisedRequests.find((r) => r.key === action.payload.key);
      if (req) {
        if (!req.notes) req.notes = [];
        req.notes.push({ text: action.payload.text, timestamp: action.payload.timestamp });
      }
    },
    updateRequestStatus(state, action) {
      const req = state.raisedRequests.find((r) => r.key === action.payload.key);
      if (req) {
        req.status = action.payload.status;
        if (action.payload.approval_doc) req.approval_doc = action.payload.approval_doc;
        if (action.payload.approval_description !== undefined) req.approval_description = action.payload.approval_description;
      }
    },
    updateQuotationDetails(state, action) {
      const req = state.raisedRequests.find((r) => r.key === action.payload.key);
      if (req) {
        if (action.payload.qty !== undefined) req.qty = action.payload.qty;
        if (action.payload.payment_terms !== undefined) req.payment_terms = action.payload.payment_terms;
        if (action.payload.supplier !== undefined) req.supplier = action.payload.supplier;
        req.status = 'Pending';
        req.financeStatus = '';
        req.financeNote = '';
      }
    },
  },
});

export const {
  setRaisedRequests,
  setPurchaseOrders,
  addRaisedRequest,
  updateRequestStatus,
  addNewProductRequest,
  addBulkRequests,
  dismissNewProductRequest,
  updateRequestQty,
  addRequestNote,
  updateQuotationDetails,
} = purchaseSlice.actions;

export default purchaseSlice.reducer;
