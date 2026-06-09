import { createApi } from '@reduxjs/toolkit/query/react';
import api from '../../api/axios';
import { setUser, refreshUser, logout as logoutAction } from '../slices/authSlice';

const axiosBaseQuery = () => async ({ url, method = 'get', data, params }) => {
  try {
    const result = await api({ url, method, data, params });
    return { data: result.data };
  } catch (err) {
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data?.error || err.message,
      },
    };
  }
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Auth', 'Staff', 'Claims',
    'Vendors', 'Purchase', 'PurchaseOrders', 'LocalPurchases', 'PurchaseHistory',
    'Dispatch', 'Inventory', 'StockApprovals', 'StockHistory',
    'Financial', 'ExpensePayments', 'PickupExpenses', 'LocalPurchaseExpenses',
    'Sales', 'Leads', 'Quotations', 'Negotiations', 'Orders', 'Complaints',
    'Billing', 'BillingParties', 'Invoices',
    'Reports', 'Notifications', 'Settings', 'Users', 'DeletedRecords',
    'Parties', 'PartyLedger', 'Expenses', 'Tasks', 'Operations', 'Stickers',
    'Dashboard', 'Kits', 'Options',
    'Reminders', 'Transport', 'Pickups', 'HotelDesigns', 'SuggestedTasks',
  ],
  endpoints: (builder) => ({

    // ── Auth ────────────────────────────────────────────────────────────────
    login: builder.mutation({
      query: (credentials) => ({ url: '/auth/login', method: 'post', data: credentials }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser({
            user: data.data?.user,
            token: data.token,
            refreshToken: data.refreshToken,
          }));
        } catch {}
      },
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'post' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => {});
        dispatch(logoutAction());
        dispatch(apiSlice.util.resetApiState());
      },
    }),
    getMe: builder.query({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['Auth'],
      // Keep the logged-in user's permissions/tabAccess in sync with the server
      // (e.g. after an admin edits their access) without requiring a re-login.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.data?.user) dispatch(refreshUser({ user: data.data.user }));
        } catch {}
      },
    }),
    changePassword: builder.mutation({
      query: (data) => ({ url: '/auth/change-password', method: 'patch', data }),
    }),

    // ── Dashboard ───────────────────────────────────────────────────────────
    getKPIs: builder.query({
      query: (filter = 'This Month') => ({ url: '/dashboard/kpis', params: { filter } }),
      providesTags: ['Dashboard'],
    }),
    getRecentOrders: builder.query({
      query: () => ({ url: '/dashboard/recent-orders' }),
      providesTags: ['Dashboard'],
    }),
    getLowStock: builder.query({
      query: () => ({ url: '/dashboard/low-stock' }),
      providesTags: ['Dashboard', 'Inventory'],
    }),
    getRevenueTrend: builder.query({
      query: () => ({ url: '/dashboard/revenue-trend' }),
      providesTags: ['Dashboard'],
    }),
    getOrderStatus: builder.query({
      query: () => ({ url: '/dashboard/order-status' }),
      providesTags: ['Dashboard'],
    }),
    getTopProducts: builder.query({
      query: () => ({ url: '/dashboard/top-products' }),
      providesTags: ['Dashboard'],
    }),

    // ── Staff ───────────────────────────────────────────────────────────────
    getStaff: builder.query({
      query: () => ({ url: '/staff' }),
      providesTags: ['Staff'],
    }),
    getStaffMember: builder.query({
      query: (id) => ({ url: `/staff/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Staff', id }],
    }),
    createStaff: builder.mutation({
      query: (data) => ({ url: '/staff', method: 'post', data }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/staff/${id}`, method: 'put', data }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({ url: `/staff/${id}`, method: 'delete' }),
      invalidatesTags: ['Staff'],
    }),
    updateCredentials: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/staff/${id}/credentials`, method: 'patch', data }),
    }),
    toggleLogin: builder.mutation({
      query: ({ id, loginEnabled }) => ({ url: `/staff/${id}/toggle-login`, method: 'patch', data: { loginEnabled } }),
      invalidatesTags: ['Staff'],
    }),
    getClaims: builder.query({
      query: (params) => ({ url: '/staff/claims', params }),
      providesTags: ['Claims'],
    }),
    createClaim: builder.mutation({
      query: (data) => ({ url: '/staff/claims', method: 'post', data }),
      invalidatesTags: ['Claims'],
    }),
    updateClaimStatus: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/staff/claims/${id}/status`, method: 'patch', data }),
      invalidatesTags: ['Claims'],
    }),

    // ── Vendors ─────────────────────────────────────────────────────────────
    getVendors: builder.query({
      query: (params) => ({ url: '/vendors', params }),
      providesTags: ['Vendors'],
    }),
    getVendor: builder.query({
      query: (id) => ({ url: `/vendors/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Vendors', id }],
    }),
    createVendor: builder.mutation({
      query: (data) => ({ url: '/vendors', method: 'post', data }),
      invalidatesTags: ['Vendors'],
    }),
    updateVendor: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/vendors/${id}`, method: 'put', data }),
      invalidatesTags: ['Vendors'],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({ url: `/vendors/${id}`, method: 'delete' }),
      invalidatesTags: ['Vendors'],
    }),
    getVendorHistory: builder.query({
      query: (id) => ({ url: `/vendors/${id}/history` }),
      providesTags: (result, error, id) => [{ type: 'Vendors', id }],
    }),
    updateVendorStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/vendors/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Vendors'],
    }),
    generateAiSummary: builder.mutation({
      query: (id) => ({ url: `/vendors/${id}/ai-summary`, method: 'post' }),
      invalidatesTags: (result, error, id) => [{ type: 'Vendors', id }],
    }),

    // ── Purchase ────────────────────────────────────────────────────────────
    getRequests: builder.query({
      query: (params) => ({ url: '/purchase/requests', params }),
      providesTags: ['Purchase'],
    }),
    createBulkRequest: builder.mutation({
      query: (data) => ({ url: '/purchase/requests/bulk', method: 'post', data }),
      invalidatesTags: ['Purchase'],
    }),
    raiseRequest: builder.mutation({
      query: (data) => ({ url: '/purchase/requests', method: 'post', data }),
      invalidatesTags: ['Purchase'],
    }),
    uploadQuotationFile: builder.mutation({
      query: ({ id, formData }) => ({ url: `/purchase/requests/${id}/upload-quotation`, method: 'post', data: formData }),
      invalidatesTags: ['Purchase'],
    }),
    addPurchaseNote: builder.mutation({
      query: ({ id, text }) => ({ url: `/purchase/requests/${id}/notes`, method: 'patch', data: { text } }),
      invalidatesTags: ['Purchase'],
    }),
    getPurchaseOrders: builder.query({
      query: (params) => ({ url: '/purchase/orders', params }),
      providesTags: ['PurchaseOrders'],
    }),
    receiveOrder: builder.mutation({
      query: ({ id, formData }) => ({ url: `/purchase/orders/${id}/receive`, method: 'post', data: formData }),
      invalidatesTags: ['PurchaseOrders', 'Inventory'],
    }),
    uploadPurchaseLR: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/purchase/orders/${id}/lr`, method: 'patch', data }),
      invalidatesTags: ['PurchaseOrders'],
    }),
    getLocalPurchases: builder.query({
      query: () => ({ url: '/purchase/local' }),
      providesTags: ['LocalPurchases'],
    }),
    createLocalPurchase: builder.mutation({
      query: (formData) => ({ url: '/purchase/local', method: 'post', data: formData }),
      invalidatesTags: ['LocalPurchases'],
    }),
    getLocalPurchase: builder.query({
      query: (id) => ({ url: `/purchase/local/${id}` }),
      providesTags: (result, error, id) => [{ type: 'LocalPurchases', id }],
    }),
    getPurchaseHistory: builder.query({
      query: () => ({ url: '/purchase/history' }),
      providesTags: ['PurchaseHistory'],
    }),

    // ── Dispatch ─────────────────────────────────────────────────────────────
    getDispatches: builder.query({
      query: (params) => ({ url: '/dispatch', params }),
      providesTags: ['Dispatch'],
    }),
    getDispatch: builder.query({
      query: (id) => ({ url: `/dispatch/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Dispatch', id }],
    }),
    createDispatch: builder.mutation({
      query: (data) => ({ url: '/dispatch', method: 'post', data }),
      invalidatesTags: ['Dispatch'],
    }),
    saveAsDraft: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/dispatch/${id}/draft`, method: 'patch', data }),
      invalidatesTags: ['Dispatch'],
    }),
    uploadInvoice: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/upload-invoice`, method: 'post', data: formData }),
      invalidatesTags: ['Dispatch'],
    }),
    confirmDispatch: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/confirm`, method: 'post', data: formData }),
      invalidatesTags: ['Dispatch'],
    }),
    uploadDispatchLR: builder.mutation({
      query: ({ id, formData, ...data }) => ({ url: `/dispatch/${id}/lr`, method: 'patch', data: formData || data }),
      invalidatesTags: ['Dispatch'],
    }),
    verifyItem: builder.mutation({
      query: ({ id, itemId, formData }) => ({ url: `/dispatch/${id}/items/${itemId}/verify`, method: 'patch', data: formData }),
      invalidatesTags: ['Dispatch'],
    }),
    verifyInvoice: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/dispatch/${id}/verify-invoice`, method: 'post', data }),
    }),
    uploadBoxPhotos: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/box-photos`, method: 'post', data: formData }),
      invalidatesTags: ['Dispatch'],
    }),
    getTodaysDispatches: builder.query({
      query: () => ({ url: '/dispatch/today' }),
      providesTags: ['Dispatch'],
    }),
    getTransports: builder.query({
      query: () => ({ url: '/dispatch/transports' }),
      providesTags: ['Transport'],
    }),
    updateTransportStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/dispatch/transports/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Transport'],
    }),
    getPickupOrders: builder.query({
      query: () => ({ url: '/dispatch/pickups' }),
      providesTags: ['Pickups'],
    }),
    createPickupOrder: builder.mutation({
      query: (data) => ({ url: '/dispatch/pickups', method: 'post', data }),
      invalidatesTags: ['Pickups'],
    }),
    updatePickupOrder: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/dispatch/pickups/${id}`, method: 'patch', data }),
      invalidatesTags: ['Pickups'],
    }),

    // ── Inventory ────────────────────────────────────────────────────────────
    getItems: builder.query({
      query: (params) => ({ url: '/inventory', params }),
      providesTags: ['Inventory'],
    }),
    getItem: builder.query({
      query: (id) => ({ url: `/inventory/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Inventory', id }],
    }),
    createItem: builder.mutation({
      query: (data) => ({ url: '/inventory', method: 'post', data }),
      invalidatesTags: ['Inventory'],
    }),
    updateItem: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/${id}`, method: 'put', data }),
      invalidatesTags: ['Inventory'],
    }),
    deleteItem: builder.mutation({
      query: (id) => ({ url: `/inventory/${id}`, method: 'delete' }),
      invalidatesTags: ['Inventory'],
    }),
    sellStockRequest: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/${id}/sell-request`, method: 'post', data }),
      invalidatesTags: ['Inventory', 'StockApprovals'],
    }),
    addStockRequest: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/${id}/add-request`, method: 'post', data }),
      invalidatesTags: ['Inventory', 'StockApprovals'],
    }),
    getStockApprovals: builder.query({
      query: () => ({ url: '/inventory/approvals' }),
      providesTags: ['StockApprovals'],
    }),
    approveMovement: builder.mutation({
      query: (id) => ({ url: `/inventory/approvals/${id}/approve`, method: 'patch' }),
      invalidatesTags: ['StockApprovals', 'Inventory'],
    }),
    rejectMovement: builder.mutation({
      query: (id) => ({ url: `/inventory/approvals/${id}/reject`, method: 'patch' }),
      invalidatesTags: ['StockApprovals'],
    }),
    getStockHistory: builder.query({
      query: (params) => ({ url: '/inventory/history', params }),
      providesTags: ['StockHistory'],
    }),
    submitStockCheck: builder.mutation({
      query: (items) => ({ url: '/inventory/stock-check', method: 'post', data: { items } }),
      invalidatesTags: ['Inventory'],
    }),
    // Kits
    getKits: builder.query({
      query: (params) => ({ url: '/inventory/kits', params }),
      providesTags: ['Kits'],
    }),
    createKit: builder.mutation({
      query: (data) => ({ url: '/inventory/kits', method: 'post', data }),
      invalidatesTags: ['Kits'],
    }),
    updateKit: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/kits/${id}`, method: 'put', data }),
      invalidatesTags: ['Kits'],
    }),
    deleteKit: builder.mutation({
      query: (id) => ({ url: `/inventory/kits/${id}`, method: 'delete' }),
      invalidatesTags: ['Kits'],
    }),

    // ── Financial ────────────────────────────────────────────────────────────
    getPendingRequests: builder.query({
      query: (params) => ({ url: '/financial/requests', params }),
      providesTags: ['Financial'],
    }),
    approveFinancialRequest: builder.mutation({
      query: (id) => ({ url: `/financial/requests/${id}/approve`, method: 'patch' }),
      invalidatesTags: ['Financial', 'Purchase'],
    }),
    rejectFinancialRequest: builder.mutation({
      query: ({ id, reason }) => ({ url: `/financial/requests/${id}/reject`, method: 'patch', data: { reason } }),
      invalidatesTags: ['Financial'],
    }),
    updateFinancialQuotation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/financial/requests/${id}/quotation`, method: 'put', data }),
      invalidatesTags: ['Financial'],
    }),
    payPurchaseOrder: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/pay/${id}`, method: 'post', data: formData }),
      invalidatesTags: ['Financial', 'PurchaseOrders'],
    }),
    getExpensePayments: builder.query({
      query: (params) => ({ url: '/financial/expense-payments', params }),
      providesTags: ['ExpensePayments'],
    }),
    payExpense: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/expense-payments/${id}/pay`, method: 'post', data: formData }),
      invalidatesTags: ['ExpensePayments'],
    }),
    getPickupExpenses: builder.query({
      query: (params) => ({ url: '/financial/reimbursements/pickup', params }),
      providesTags: ['PickupExpenses'],
    }),
    payPickupExpense: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/reimbursements/pickup/${id}/pay`, method: 'post', data: formData }),
      invalidatesTags: ['PickupExpenses', 'Expenses'],
    }),
    getLocalPurchaseExpenses: builder.query({
      query: (params) => ({ url: '/financial/reimbursements/local-purchase', params }),
      providesTags: ['LocalPurchaseExpenses'],
    }),
    payLocalPurchaseExpense: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/reimbursements/local-purchase/${id}/pay`, method: 'post', data: formData }),
      invalidatesTags: ['LocalPurchaseExpenses', 'Expenses'],
    }),

    // ── Sales ────────────────────────────────────────────────────────────────
    getLeads: builder.query({
      query: (params) => ({ url: '/sales/leads', params }),
      providesTags: ['Leads'],
    }),
    getLead: builder.query({
      query: (id) => ({ url: `/sales/leads/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Leads', id }],
    }),
    createLead: builder.mutation({
      query: (data) => ({ url: '/sales/leads', method: 'post', data }),
      invalidatesTags: ['Leads'],
    }),
    updateLead: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/leads/${id}`, method: 'put', data }),
      invalidatesTags: ['Leads'],
    }),
    deleteLead: builder.mutation({
      query: (id) => ({ url: `/sales/leads/${id}`, method: 'delete' }),
      invalidatesTags: ['Leads'],
    }),
    updateLeadStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/sales/leads/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Leads'],
    }),
    assignLead: builder.mutation({
      query: ({ id, assignedTo }) => ({ url: `/sales/leads/${id}/assign`, method: 'patch', data: { assignedTo } }),
      invalidatesTags: ['Leads'],
    }),
    getSalesQuotations: builder.query({
      query: (params) => ({ url: '/sales/quotations', params }),
      providesTags: ['Quotations'],
    }),
    createSalesQuotation: builder.mutation({
      query: (data) => ({ url: '/sales/quotations', method: 'post', data }),
      invalidatesTags: ['Quotations', 'Leads'],
    }),
    updateSalesQuotation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/quotations/${id}`, method: 'put', data }),
      invalidatesTags: ['Quotations'],
    }),
    convertToNegotiation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/quotations/${id}/convert-negotiation`, method: 'post', data }),
      invalidatesTags: ['Quotations', 'Negotiations', 'Leads'],
    }),
    convertLeadToNegotiation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/leads/${id}/convert-negotiation`, method: 'post', data }),
      invalidatesTags: ['Leads', 'Negotiations'],
    }),
    getNegotiations: builder.query({
      query: (params) => ({ url: '/sales/negotiations', params }),
      providesTags: ['Negotiations'],
    }),
    updateNegotiation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/negotiations/${id}`, method: 'put', data }),
      invalidatesTags: ['Negotiations'],
    }),
    convertToOrder: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/negotiations/${id}/convert-order`, method: 'post', data }),
      invalidatesTags: ['Negotiations', 'Orders', 'Leads', 'Quotations'],
    }),
    getSalesOrders: builder.query({
      query: (params) => ({ url: '/sales/orders', params }),
      providesTags: ['Orders'],
    }),
    getOrdersByHotelName: builder.query({
      query: (name) => ({ url: '/sales/orders/by-hotel', params: { name } }),
      providesTags: (result, error, name) => [{ type: 'Orders', id: `hotel-${name}` }],
    }),
    getSalesOrder: builder.query({
      query: (id) => ({ url: `/sales/orders/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Orders', id }],
    }),
    createSalesOrder: builder.mutation({
      query: (data) => ({ url: '/sales/orders', method: 'post', data }),
      invalidatesTags: ['Orders', 'Leads'],
    }),
    updateSalesOrder: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/orders/${id}`, method: 'put', data }),
      invalidatesTags: ['Orders', 'Operations'],
    }),
    updateSalesOrderStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/sales/orders/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Orders'],
    }),
    getComplaints: builder.query({
      query: (params) => ({ url: '/sales/complaints', params }),
      providesTags: ['Complaints'],
    }),
    createComplaint: builder.mutation({
      query: (data) => ({ url: '/sales/complaints', method: 'post', data }),
      invalidatesTags: ['Complaints'],
    }),
    updateComplaintStatus: builder.mutation({
      query: ({ id, status, note }) => ({ url: `/sales/complaints/${id}/status`, method: 'patch', data: { status, note } }),
      invalidatesTags: ['Complaints'],
    }),
    getComplaintHistory: builder.query({
      query: (clientName) => ({ url: '/sales/complaints/history', params: { clientName } }),
      providesTags: ['Complaints'],
    }),
    getReminders: builder.query({
      query: () => ({ url: '/sales/reminders' }),
      providesTags: ['Reminders'],
    }),
    getHotelNames: builder.query({
      query: () => ({ url: '/sales/hotels' }),
      providesTags: ['Leads'],
    }),
    lookupHotel: builder.query({
      query: ({ name, branch }) => ({ url: '/sales/hotels/lookup', params: { name, branch } }),
    }),
    uploadFiles: builder.mutation({
      query: ({ formData, folder }) => ({
        url: `/sales/upload${folder ? `?folder=${folder}` : ''}`,
        method: 'post',
        data: formData,
      }),
    }),
    deleteFile: builder.mutation({
      query: (publicId) => ({ url: '/sales/upload', method: 'delete', data: { publicId } }),
    }),

    // ── Billing ──────────────────────────────────────────────────────────────
    getBillingParties: builder.query({
      query: (params) => ({ url: '/billing/parties', params }),
      providesTags: ['BillingParties'],
    }),
    createBillingParty: builder.mutation({
      query: (data) => ({ url: '/billing/parties', method: 'post', data }),
      invalidatesTags: ['BillingParties'],
    }),
    updateBillingParty: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/billing/parties/${id}`, method: 'put', data }),
      invalidatesTags: ['BillingParties'],
    }),
    deleteBillingParty: builder.mutation({
      query: (id) => ({ url: `/billing/parties/${id}`, method: 'delete' }),
      invalidatesTags: ['BillingParties'],
    }),
    getBillingPartyLedger: builder.query({
      query: (id) => ({ url: `/billing/parties/${id}/ledger` }),
      providesTags: (result, error, id) => [{ type: 'BillingParties', id }],
    }),
    getInvoices: builder.query({
      query: (params) => ({ url: '/billing/invoices', params }),
      providesTags: ['Invoices'],
    }),
    getInvoice: builder.query({
      query: (id) => ({ url: `/billing/invoices/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Invoices', id }],
    }),
    createInvoice: builder.mutation({
      query: (data) => ({ url: '/billing/invoices', method: 'post', data }),
      invalidatesTags: ['Invoices', 'BillingParties'],
    }),
    updateInvoiceGst: builder.mutation({
      query: ({ id, gstAmount }) => ({ url: `/billing/invoices/${id}/gst`, method: 'patch', data: { gstAmount } }),
      invalidatesTags: ['Invoices'],
    }),
    recordPayment: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/billing/invoices/${id}/payment`, method: 'post', data }),
      invalidatesTags: ['Invoices', 'BillingParties'],
    }),
    convertQuotationToInvoice: builder.mutation({
      query: (data) => ({ url: '/billing/invoices/convert-quotation', method: 'post', data }),
      invalidatesTags: ['Invoices', 'BillingParties'],
    }),
    getQuotationsInProcess: builder.query({
      query: () => ({ url: '/billing/quotations-in-process' }),
      providesTags: ['Quotations'],
    }),

    // ── Expenses ─────────────────────────────────────────────────────────────
    getExpenses: builder.query({
      query: (params) => ({ url: '/expenses', params }),
      providesTags: ['Expenses'],
    }),
    createExpense: builder.mutation({
      query: (formData) => ({ url: '/expenses', method: 'post', data: formData }),
      invalidatesTags: ['Expenses'],
    }),
    updateExpense: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/expenses/${id}`, method: 'put', data }),
      invalidatesTags: ['Expenses'],
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({ url: `/expenses/${id}`, method: 'delete' }),
      invalidatesTags: ['Expenses'],
    }),
    getExpenseHistory: builder.query({
      query: (params) => ({ url: '/expenses/history', params }),
      providesTags: ['Expenses'],
    }),

    // ── Tasks ────────────────────────────────────────────────────────────────
    getTasks: builder.query({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: ['Tasks'],
    }),
    getSuggestedTasks: builder.query({
      query: () => ({ url: '/tasks/suggested' }),
      providesTags: ['SuggestedTasks', 'Tasks', 'Inventory'],
    }),
    getTask: builder.query({
      query: (id) => ({ url: `/tasks/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Tasks', id }],
    }),
    createTask: builder.mutation({
      query: (data) => ({ url: '/tasks', method: 'post', data }),
      invalidatesTags: ['Tasks'],
    }),
    updateTaskStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/tasks/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Tasks'],
    }),
    approveEmergency: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}/approve-emergency`, method: 'patch' }),
      invalidatesTags: ['Tasks'],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}`, method: 'delete' }),
      invalidatesTags: ['Tasks'],
    }),

    // ── Operations ───────────────────────────────────────────────────────────
    getOperationOrders: builder.query({
      query: (params) => ({ url: '/operations/orders', params }),
      providesTags: ['Operations'],
    }),
    getTodaysOrders: builder.query({
      query: () => ({ url: '/operations/orders/today' }),
      providesTags: ['Operations'],
    }),
    getTodaysDispatch: builder.query({
      query: () => ({ url: '/operations/orders/today-dispatch' }),
      providesTags: ['Operations'],
    }),
    updateOperationOrderStatus: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/operations/orders/${id}/status`, method: 'patch', data }),
      invalidatesTags: ['Operations', 'Tasks'],
    }),
    assignTask: builder.mutation({
      query: ({ orderId, ...data }) => ({ url: `/operations/orders/${orderId}/assign-task`, method: 'post', data }),
      invalidatesTags: ['Operations', 'Tasks'],
    }),
    assignTasksPerProduct: builder.mutation({
      query: ({ orderId, ...data }) => ({ url: `/operations/orders/${orderId}/assign-tasks-per-product`, method: 'post', data }),
      invalidatesTags: ['Operations', 'Tasks'],
    }),
    setOrderEmergency: builder.mutation({
      query: ({ id, isEmergency }) => ({ url: `/operations/orders/${id}/emergency`, method: 'patch', data: { isEmergency } }),
      invalidatesTags: ['Operations'],
    }),
    splitPartialDelivery: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/operations/orders/${id}/partial-split`, method: 'post', data }),
      invalidatesTags: ['Operations'],
    }),
    getHotelDesigns: builder.query({
      query: (params) => ({ url: '/operations/hotel-designs', params }),
      providesTags: ['HotelDesigns'],
    }),
    saveHotelDesign: builder.mutation({
      query: (data) => ({ url: '/operations/hotel-designs', method: 'post', data }),
      invalidatesTags: ['HotelDesigns'],
    }),
    approveStickerRequest: builder.mutation({
      query: ({ id, role }) => ({ url: `/operations/stickers/${id}/approve`, method: 'patch', data: { role } }),
      invalidatesTags: ['Stickers'],
    }),
    getStickerRequests: builder.query({
      query: (params) => ({ url: '/operations/stickers', params }),
      providesTags: ['Stickers'],
    }),
    createStickerRequest: builder.mutation({
      query: (data) => ({ url: '/operations/stickers', method: 'post', data }),
      invalidatesTags: ['Stickers'],
    }),
    uploadStickerDesign: builder.mutation({
      // Tolerant of either { id, formData } or { id, files } (antd fileList).
      query: ({ id, formData, files }) => {
        let data = formData;
        if (!data && files?.length) {
          data = new FormData();
          const f = files[0]?.originFileObj || files[0];
          if (f) data.append('design', f);
        }
        return { url: `/operations/stickers/${id}/upload-design`, method: 'post', data };
      },
      invalidatesTags: ['Stickers'],
    }),
    updateStickerStatus: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/operations/stickers/${id}/status`, method: 'patch', data }),
      invalidatesTags: ['Stickers'],
    }),
    sendToStickerTeam: builder.mutation({
      // Accept an array, { ids }, { items:[{id|_id}] }, or { id } and normalize to an id array.
      query: (arg) => {
        let ids = [];
        if (Array.isArray(arg)) ids = arg;
        else if (arg?.ids) ids = arg.ids;
        else if (arg?.items) ids = arg.items.map((i) => i.id || i._id || i.key).filter(Boolean);
        else if (arg?.id) ids = [arg.id];
        return { url: '/operations/stickers/send-to-team', method: 'post', data: { ids } };
      },
      invalidatesTags: ['Stickers'],
    }),

    // ── Notifications ────────────────────────────────────────────────────────
    getNotifications: builder.query({
      query: (params) => ({ url: '/notifications', params }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'patch' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/mark-all-read', method: 'patch' }),
      invalidatesTags: ['Notifications'],
    }),
    getStockAlerts: builder.query({
      query: () => ({ url: '/notifications/stock-alerts' }),
      providesTags: ['Notifications', 'Inventory'],
    }),
    getPaymentAlerts: builder.query({
      query: () => ({ url: '/notifications/payment-alerts' }),
      providesTags: ['Notifications', 'Invoices'],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}`, method: 'delete' }),
      invalidatesTags: ['Notifications'],
    }),

    // ── Settings ─────────────────────────────────────────────────────────────
    getCountryCodes: builder.query({
      query: () => ({ url: '/settings/country-codes' }),
    }),
    getCompanySettings: builder.query({
      query: () => ({ url: '/settings/company' }),
      providesTags: ['Settings'],
    }),
    updateCompanySettings: builder.mutation({
      query: (data) => ({ url: '/settings/company', method: 'put', data }),
      invalidatesTags: ['Settings'],
    }),
    uploadLogo: builder.mutation({
      query: (formData) => ({ url: '/settings/company/logo', method: 'post', data: formData }),
      invalidatesTags: ['Settings'],
    }),
    getUsers: builder.query({
      query: () => ({ url: '/settings/users' }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (data) => ({ url: '/settings/users', method: 'post', data }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/settings/users/${id}`, method: 'put', data }),
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({ url: `/settings/users/${id}`, method: 'delete' }),
      invalidatesTags: ['Users'],
    }),
    updatePermissions: builder.mutation({
      query: ({ id, permissions }) => ({ url: `/settings/users/${id}/permissions`, method: 'put', data: { permissions } }),
      invalidatesTags: ['Users'],
    }),
    getDeletedRecords: builder.query({
      query: () => ({ url: '/settings/deleted-records' }),
      providesTags: ['DeletedRecords'],
    }),
    restoreRecord: builder.mutation({
      query: ({ type, id }) => ({ url: `/settings/deleted-records/${type}/${id}/restore`, method: 'post' }),
      invalidatesTags: ['DeletedRecords'],
    }),
    // Dropdown options (user-added select values)
    getOptions: builder.query({
      query: (params) => ({ url: '/settings/options', params }),
      providesTags: ['Options'],
    }),
    createOption: builder.mutation({
      query: (data) => ({ url: '/settings/options', method: 'post', data }),
      invalidatesTags: ['Options'],
    }),

    // ── Parties & Ledger ─────────────────────────────────────────────────────
    getParties: builder.query({
      query: (params) => ({ url: '/parties', params }),
      providesTags: ['Parties'],
    }),
    getPartyLedger: builder.query({
      query: (id) => ({ url: `/parties/${id}/ledger` }),
      providesTags: (result, error, id) => [{ type: 'PartyLedger', id }],
    }),
    getPartyOrders: builder.query({
      query: (id) => ({ url: `/parties/${id}/orders` }),
      providesTags: (result, error, id) => [{ type: 'PartyOrders', id }],
    }),
    deleteParty: builder.mutation({
      query: (id) => ({ url: `/parties/${id}`, method: 'delete' }),
      invalidatesTags: ['Parties'],
    }),
    getCustomersLedger: builder.query({
      query: () => ({ url: '/parties/customers-ledger' }),
      providesTags: ['Parties'],
    }),
    getVendorsLedger: builder.query({
      query: () => ({ url: '/parties/vendors-ledger' }),
      providesTags: ['Parties'],
    }),

    // ── Reports ──────────────────────────────────────────────────────────────
    getSalesReport: builder.query({
      query: (params) => ({ url: '/reports/sales', params }),
      providesTags: ['Reports'],
    }),
    getPurchaseReport: builder.query({
      query: (params) => ({ url: '/reports/purchase', params }),
      providesTags: ['Reports'],
    }),
    getProfitLoss: builder.query({
      query: (params) => ({ url: '/reports/profit-loss', params }),
      providesTags: ['Reports'],
    }),
    getBillPL: builder.query({
      query: (params) => ({ url: '/reports/bill-wise-pl', params }),
      providesTags: ['Reports'],
    }),
    getMonthlyGst: builder.query({
      query: (params) => ({ url: '/reports/monthly-gst', params }),
      providesTags: ['Reports'],
    }),
    getAuditorTax: builder.query({
      query: (params) => ({ url: '/reports/auditor-tax', params }),
      providesTags: ['Reports'],
    }),
    getMyPerformance: builder.query({
      query: (params) => ({ url: '/reports/my-performance', params }),
      providesTags: ['Reports'],
    }),
    getPerformance: builder.query({
      query: (params) => ({ url: '/reports/performance', params }),
      providesTags: ['Reports'],
    }),
  }),
});

export const {
  // Auth
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useChangePasswordMutation,
  // Dashboard
  useGetKPIsQuery,
  useGetRecentOrdersQuery,
  useGetLowStockQuery,
  useGetRevenueTrendQuery,
  useGetOrderStatusQuery,
  useGetTopProductsQuery,
  // Staff
  useGetStaffQuery,
  useGetStaffMemberQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useUpdateCredentialsMutation,
  useToggleLoginMutation,
  useGetClaimsQuery,
  useCreateClaimMutation,
  useUpdateClaimStatusMutation,
  // Vendors
  useGetVendorsQuery,
  useGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetVendorHistoryQuery,
  useUpdateVendorStatusMutation,
  useGenerateAiSummaryMutation,
  // Purchase
  useGetRequestsQuery,
  useCreateBulkRequestMutation,
  useRaiseRequestMutation,
  useUploadQuotationFileMutation,
  useAddPurchaseNoteMutation,
  useGetPurchaseOrdersQuery,
  useReceiveOrderMutation,
  useUploadPurchaseLRMutation,
  useGetLocalPurchasesQuery,
  useCreateLocalPurchaseMutation,
  useGetLocalPurchaseQuery,
  useGetPurchaseHistoryQuery,
  // Dispatch
  useGetDispatchesQuery,
  useGetDispatchQuery,
  useCreateDispatchMutation,
  useSaveAsDraftMutation,
  useUploadInvoiceMutation,
  useConfirmDispatchMutation,
  useVerifyInvoiceMutation,
  useUploadBoxPhotosMutation,
  useGetTodaysDispatchesQuery,
  useGetTransportsQuery,
  useUpdateTransportStatusMutation,
  useGetPickupOrdersQuery,
  useCreatePickupOrderMutation,
  useUpdatePickupOrderMutation,
  useGetComplaintHistoryQuery,
  useGetRemindersQuery,
  useGetHotelNamesQuery,
  useLazyLookupHotelQuery,
  useGetSuggestedTasksQuery,
  useAssignTasksPerProductMutation,
  useSetOrderEmergencyMutation,
  useSplitPartialDeliveryMutation,
  useGetHotelDesignsQuery,
  useSaveHotelDesignMutation,
  useApproveStickerRequestMutation,
  useUploadDispatchLRMutation,
  useVerifyItemMutation,
  // Inventory
  useGetItemsQuery,
  useGetItemQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useSellStockRequestMutation,
  useAddStockRequestMutation,
  useGetStockApprovalsQuery,
  useApproveMovementMutation,
  useRejectMovementMutation,
  useGetStockHistoryQuery,
  useSubmitStockCheckMutation,
  useGetKitsQuery,
  useCreateKitMutation,
  useUpdateKitMutation,
  useDeleteKitMutation,
  // Financial
  useGetPendingRequestsQuery,
  useApproveFinancialRequestMutation,
  useRejectFinancialRequestMutation,
  useUpdateFinancialQuotationMutation,
  usePayPurchaseOrderMutation,
  useGetExpensePaymentsQuery,
  usePayExpenseMutation,
  useGetPickupExpensesQuery,
  usePayPickupExpenseMutation,
  useGetLocalPurchaseExpensesQuery,
  usePayLocalPurchaseExpenseMutation,
  // Sales
  useGetLeadsQuery,
  useGetLeadQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useUpdateLeadStatusMutation,
  useAssignLeadMutation,
  useGetSalesQuotationsQuery,
  useCreateSalesQuotationMutation,
  useUpdateSalesQuotationMutation,
  useConvertToNegotiationMutation,
  useConvertLeadToNegotiationMutation,
  useGetNegotiationsQuery,
  useUpdateNegotiationMutation,
  useConvertToOrderMutation,
  useGetSalesOrdersQuery,
  useGetOrdersByHotelNameQuery,
  useGetSalesOrderQuery,
  useCreateSalesOrderMutation,
  useUpdateSalesOrderMutation,
  useUpdateSalesOrderStatusMutation,
  useGetComplaintsQuery,
  useCreateComplaintMutation,
  useUpdateComplaintStatusMutation,
  // Billing
  useGetBillingPartiesQuery,
  useCreateBillingPartyMutation,
  useUpdateBillingPartyMutation,
  useDeleteBillingPartyMutation,
  useGetBillingPartyLedgerQuery,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceGstMutation,
  useRecordPaymentMutation,
  useConvertQuotationToInvoiceMutation,
  useGetQuotationsInProcessQuery,
  // Expenses
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseHistoryQuery,
  // Tasks
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useApproveEmergencyMutation,
  useDeleteTaskMutation,
  // Operations
  useGetOperationOrdersQuery,
  useGetTodaysOrdersQuery,
  useGetTodaysDispatchQuery,
  useUpdateOperationOrderStatusMutation,
  useAssignTaskMutation,
  useGetStickerRequestsQuery,
  useCreateStickerRequestMutation,
  useUploadStickerDesignMutation,
  useUpdateStickerStatusMutation,
  useSendToStickerTeamMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetStockAlertsQuery,
  useGetPaymentAlertsQuery,
  useDeleteNotificationMutation,
  // Settings
  useGetCountryCodesQuery,
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useUploadLogoMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdatePermissionsMutation,
  useGetDeletedRecordsQuery,
  useRestoreRecordMutation,
  useGetOptionsQuery,
  useCreateOptionMutation,
  // Parties
  useGetPartiesQuery,
  useGetPartyLedgerQuery,
  useGetPartyOrdersQuery,
  useDeletePartyMutation,
  useGetCustomersLedgerQuery,
  useGetVendorsLedgerQuery,
  // Reports
  useGetSalesReportQuery,
  useGetPurchaseReportQuery,
  useGetProfitLossQuery,
  useGetBillPLQuery,
  useGetMonthlyGstQuery,
  useGetAuditorTaxQuery,
  useGetMyPerformanceQuery,
  useGetPerformanceQuery,
  useUploadFilesMutation,
  useDeleteFileMutation,
} = apiSlice;
