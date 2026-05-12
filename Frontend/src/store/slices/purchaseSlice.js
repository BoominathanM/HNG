import { createSlice } from '@reduxjs/toolkit';

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState: {
    raisedRequests: [
      { key: 1001, item: 'Soap Base (Transparent)', supplier: 'BioLife Ltd', qty: 110, unit: 'Kg', payment_terms: '50% Advance, 50% on Dispatch', date: '2024-05-07', status: 'Pending' },
      { key: 1002, item: 'Shampoo Bottles (Flip 30ml)', supplier: 'PlastiPack', qty: 800, unit: 'Pcs', payment_terms: '100% Payment', date: '2024-05-08', status: 'Approved' },
      { key: 1003, item: 'Shampoo Concentrate', supplier: 'ChemCo India', qty: 100, unit: 'Ltr', payment_terms: '50% Advance, 50% After Delivery (Max 15 days)', date: '2024-05-06', status: 'Rejected' },
      { key: 1004, item: 'Amber Bottles 100ml', supplier: 'PlastiPack', qty: 600, unit: 'Pcs', payment_terms: '100% Payment', date: '2024-05-09', status: 'Approved' },
    ],
    purchaseOrders: [
      {
        key: 'ORDER-2001',
        requestKey: 9999,
        item: 'Dental Kit Boxes',
        supplier: 'BoxWorld',
        qty: 500,
        unit: 'Pcs',
        amount: 6000,
        price: 12,
        payment_terms: '100% Payment',
        date: '2024-05-05',
        bill_no: 'PUR-7701',
        inv_no: 'INV-BOX-201',
        status: 'Unpaid',
        paid_amount: 0,
      },
      {
        key: 'ORDER-2002',
        requestKey: 9998,
        item: 'Soap Base (White)',
        supplier: 'ChemCo India',
        qty: 200,
        unit: 'Kg',
        amount: 17000,
        price: 85,
        payment_terms: '50% Advance, 50% on Dispatch',
        date: '2024-05-03',
        bill_no: 'PUR-7699',
        inv_no: 'INV-CHEM-099',
        status: 'Partial Paid',
        paid_amount: 8500,
      },
    ],
  },
  reducers: {
    addRaisedRequest(state, action) {
      state.raisedRequests.push({ ...action.payload, status: 'Pending' });
    },
    updateRequestStatus(state, action) {
      const req = state.raisedRequests.find(r => r.key === action.payload.key);
      if (req) req.status = action.payload.status;
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
      }
    },
  },
});

export const { addRaisedRequest, updateRequestStatus, raiseOrder, updateOrderPaymentStatus } = purchaseSlice.actions;
export default purchaseSlice.reducer;
