import { createSlice } from '@reduxjs/toolkit';

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState: {
    raisedRequests: [
      { key: 1001, item: 'Soap Base (Transparent)', supplier: 'BioLife Ltd', qty: 110, unit: 'Kg', payment_terms: '50% Advance, 50% on Dispatch', date: '2024-05-07', status: 'Pending', quotation_file: 'quotation_biolife_soap_base.pdf' },
      { key: 1002, item: 'Shampoo Bottles (Flip 30ml)', supplier: 'PlastiPack', qty: 800, unit: 'Pcs', payment_terms: '100% Payment', date: '2024-05-08', status: 'Approved', quotation_file: 'quotation_plastipack_bottles.pdf', approval_doc: 'approval_plastipack_bottles.pdf', approval_description: 'Approved for Q2 procurement. Ensure delivery by end of May 2024.' },
      { key: 1003, item: 'Shampoo Concentrate', supplier: 'ChemCo India', qty: 100, unit: 'Ltr', payment_terms: '50% Advance, 50% After Delivery (Max 15 days)', date: '2024-05-06', status: 'Rejected' },
      { key: 1004, item: 'Amber Bottles 100ml', supplier: 'PlastiPack', qty: 600, unit: 'Pcs', payment_terms: '100% Payment', date: '2024-05-09', status: 'Approved', approval_doc: 'approval_amber_bottles_100ml.pdf', approval_description: '50% advance payment cleared. Remaining balance to be settled upon delivery confirmation.' },
    ],
    newProductRequests: [],
    purchaseOrders: [
      {
        key: 'ORDER-2001',
        requestKey: 1002,
        item: 'Shampoo Bottles (Flip 30ml)',
        supplier: 'PlastiPack',
        qty: 800,
        unit: 'Pcs',
        amount: 12800,
        price: 16,
        payment_terms: '100% Payment',
        date: '2024-05-10',
        bill_no: 'PUR-7701',
        inv_no: 'INV-PLT-201',
        status: 'Unpaid',
        paid_amount: 0,
      },
      {
        key: 'ORDER-2002',
        requestKey: 1004,
        item: 'Amber Bottles 100ml',
        supplier: 'PlastiPack',
        qty: 600,
        unit: 'Pcs',
        amount: 9600,
        price: 16,
        payment_terms: '100% Payment',
        date: '2024-05-11',
        bill_no: 'PUR-7702',
        inv_no: 'INV-PLT-202',
        status: 'Partial Paid',
        paid_amount: 4800,
      },
      {
        key: 'ORDER-2003',
        requestKey: 1001,
        item: 'Soap Base (Transparent)',
        supplier: 'BioLife Ltd',
        qty: 110,
        unit: 'Kg',
        amount: 24200,
        price: 220,
        payment_terms: '50% Advance, 50% on Dispatch',
        date: '2024-05-12',
        bill_no: 'PUR-7703',
        inv_no: 'INV-BIO-301',
        status: 'Unpaid',
        paid_amount: 0,
      },
    ],
  },
  reducers: {
    addRaisedRequest(state, action) {
      state.raisedRequests.push({ ...action.payload, status: 'Pending' });
    },
    addNewProductRequest(state, action) {
      const exists = state.newProductRequests.some(
        r => r.productName === action.payload.productName && r.fromOrder === action.payload.fromOrder
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
      action.payload.forEach(req => {
        state.raisedRequests.push({ ...req, key: Date.now() + Math.random(), status: 'Pending' });
      });
    },
    dismissNewProductRequest(state, action) {
      state.newProductRequests = state.newProductRequests.filter(r => r.key !== action.payload);
    },
    updateFinanceStatus(state, action) {
      // action.payload = { key, financeStatus: 'Approved'|'ModifyRequested', financeNote }
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
      if (req) {
        req.financeStatus = action.payload.financeStatus;
        req.financeNote = action.payload.financeNote || '';
        if (action.payload.financeStatus === 'Approved') req.status = 'Approved';
      }
    },
    updateRequestQty(state, action) {
      // action.payload = { key, qty }
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
      if (req) {
        req.qty = action.payload.qty;
        req.status = 'Pending';
        req.financeStatus = '';
        req.financeNote = '';
      }
    },
    addRequestNote(state, action) {
      // action.payload = { key, text, timestamp }
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
      if (req) {
        if (!req.notes) req.notes = [];
        req.notes.push({ text: action.payload.text, timestamp: action.payload.timestamp });
      }
    },
    updateRequestStatus(state, action) {
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
      if (req) {
        req.status = action.payload.status;
        if (action.payload.approval_doc) req.approval_doc = action.payload.approval_doc;
        if (action.payload.approval_description !== undefined) req.approval_description = action.payload.approval_description;
      }
    },
    raiseOrder(state, action) {
      // action.payload = { requestKey, bill_no, inv_no, price, amount, orderDate }
      const req = state.raisedRequests.find(r => r.key === action.payload.requestKey);
      const alreadyExists = state.purchaseOrders.some(o => o.requestKey === action.payload.requestKey);
      if (req && !alreadyExists) {
        state.purchaseOrders.push({
          key: `ORDER-${Date.now()}`,
          requestKey: action.payload.requestKey,
          item: req.item,
          supplier: req.supplier,
          qty: req.qty,
          unit: req.unit,
          amount: action.payload.amount,
          price: action.payload.price,
          payment_terms: req.payment_terms,
          date: action.payload.orderDate || new Date().toISOString().slice(0, 10),
          bill_no: action.payload.bill_no || '',
          inv_no: action.payload.inv_no || '',
          status: 'Unpaid',
          paid_amount: 0,
        });
      }
    },
    updateOrderPaymentStatus(state, action) {
      const order = state.purchaseOrders.find(o => o.key === action.payload.key);
      if (order) {
        order.status = action.payload.status;
        order.paid_amount = action.payload.paid_amount;
        if (action.payload.payment_proof) order.payment_proof = action.payload.payment_proof;
      }
    },
    addOrderNote(state, action) {
      // action.payload = { key, text, timestamp }
      const order = state.purchaseOrders.find(o => o.key === action.payload.key);
      if (order) {
        if (!order.notes) order.notes = [];
        order.notes.push({ text: action.payload.text, timestamp: action.payload.timestamp });
      }
    },
    updateQuotationDetails(state, action) {
      // action.payload = { key, qty, payment_terms, supplier }
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
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

export const { addRaisedRequest, updateRequestStatus, raiseOrder, updateOrderPaymentStatus, addNewProductRequest, addBulkRequests, dismissNewProductRequest, updateFinanceStatus, updateRequestQty, addRequestNote, addOrderNote, updateQuotationDetails } = purchaseSlice.actions;
export default purchaseSlice.reducer;
