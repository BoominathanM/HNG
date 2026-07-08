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
    'WhatsApp', 'WhatsAppTemplates', 'WhatsAppEvents', 'WhatsAppMappings',
    'GstConfig', 'TaskTimeConfig',
    'MaterialStocks',
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
    getVendorLedger: builder.query({
      query: (id) => ({ url: `/vendors/${id}/ledger` }),
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
      invalidatesTags: ['Purchase', 'Financial'],
    }),
    raiseRequest: builder.mutation({
      query: (data) => ({ url: '/purchase/requests', method: 'post', data }),
      invalidatesTags: ['Purchase', 'Financial'],
    }),
    uploadQuotationFile: builder.mutation({
      query: ({ id, formData }) => ({ url: `/purchase/requests/${id}/upload-quotation`, method: 'post', data: formData }),
      invalidatesTags: ['Purchase', 'Financial'],
    }),
    updatePurchaseRequestDetails: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/purchase/requests/${id}/update-details`, method: 'patch', data }),
      invalidatesTags: ['Purchase', 'Financial', 'PurchaseOrders'],
    }),
    addPurchaseNote: builder.mutation({
      query: ({ id, text }) => ({ url: `/purchase/requests/${id}/notes`, method: 'patch', data: { text } }),
      invalidatesTags: ['Purchase', 'Financial'],
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
      invalidatesTags: ['LocalPurchases', 'LocalPurchaseExpenses'],
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
      // Invalidate both the list queries (generic tag) and this specific getDispatch(id)
      // cache entry (id-tagged) — without the id tag, a change made on one page (list's
      // expand panel vs. the Detail page) never refreshes the other.
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
    }),
    uploadInvoice: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/upload-invoice`, method: 'post', data: formData }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
    }),
    confirmDispatch: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/confirm`, method: 'post', data: formData }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }, 'Leads', 'Orders', 'Tasks'],
    }),
    uploadDispatchLR: builder.mutation({
      query: ({ id, formData, ...data }) => ({ url: `/dispatch/${id}/lr`, method: 'patch', data: formData || data }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
    }),
    verifyItem: builder.mutation({
      query: ({ id, itemId, formData, verified }) => ({
        url: `/dispatch/${id}/items/${itemId}/verify`,
        method: 'patch',
        data: formData || (verified !== undefined ? { verified } : undefined),
      }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
    }),
    verifyInvoice: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/dispatch/${id}/verify-invoice`, method: 'post', data }),
    }),
    uploadBoxPhotos: builder.mutation({
      query: ({ id, formData }) => ({ url: `/dispatch/${id}/box-photos`, method: 'post', data: formData }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
    }),
    addBoxPhotoUrl: builder.mutation({
      query: ({ id, type, url }) => ({ url: `/dispatch/${id}/box-photo-url`, method: 'patch', data: { type, url } }),
      invalidatesTags: (result, error, { id }) => ['Dispatch', { type: 'Dispatch', id }],
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
    getTodaysPickupOrders: builder.query({
      query: () => ({ url: '/dispatch/pickups/today' }),
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
      query: ({ items, notes }) => ({ url: '/inventory/stock-check', method: 'post', data: { items, notes } }),
      invalidatesTags: ['Inventory', 'StockApprovals', 'StockHistory'],
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
    // Material Stocks (packing materials purchased & stored)
    getMaterialStocks: builder.query({
      query: (params) => ({ url: '/inventory/material-stocks', params }),
      providesTags: ['MaterialStocks'],
    }),
    createMaterialStock: builder.mutation({
      query: (data) => ({ url: '/inventory/material-stocks', method: 'post', data }),
      invalidatesTags: ['MaterialStocks'],
    }),
    updateMaterialStock: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/material-stocks/${id}`, method: 'put', data }),
      invalidatesTags: ['MaterialStocks'],
    }),
    deleteMaterialStock: builder.mutation({
      query: (id) => ({ url: `/inventory/material-stocks/${id}`, method: 'delete' }),
      invalidatesTags: ['MaterialStocks'],
    }),
    uploadMaterialStockInvoice: builder.mutation({
      query: ({ id, formData }) => ({ url: `/inventory/material-stocks/${id}/upload-invoice`, method: 'post', data: formData }),
      invalidatesTags: ['MaterialStocks'],
    }),

    // Packing Material Config
    getPackingConfig: builder.query({
      query: () => ({ url: '/inventory/packing-config' }),
      providesTags: ['PackingConfig'],
    }),
    createPackingConfig: builder.mutation({
      query: (data) => ({ url: '/inventory/packing-config', method: 'post', data }),
      invalidatesTags: ['PackingConfig'],
    }),
    updatePackingConfig: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/inventory/packing-config/${id}`, method: 'put', data }),
      invalidatesTags: ['PackingConfig'],
    }),
    deletePackingConfig: builder.mutation({
      query: (id) => ({ url: `/inventory/packing-config/${id}`, method: 'delete' }),
      invalidatesTags: ['PackingConfig'],
    }),

    // ── Financial ────────────────────────────────────────────────────────────
    getPendingRequests: builder.query({
      query: (params) => ({ url: '/financial/requests', params }),
      providesTags: ['Financial'],
    }),
    approveFinancialRequest: builder.mutation({
      query: (id) => ({ url: `/financial/requests/${id}/approve`, method: 'patch' }),
      invalidatesTags: ['Financial', 'Purchase', 'PurchaseOrders'],
    }),
    batchApproveRequests: builder.mutation({
      query: (batchId) => ({ url: `/financial/requests/batch/${batchId}/approve`, method: 'patch' }),
      invalidatesTags: ['Financial', 'Purchase', 'PurchaseOrders'],
    }),
    rejectFinancialRequest: builder.mutation({
      query: ({ id, reason }) => ({ url: `/financial/requests/${id}/reject`, method: 'patch', data: { reason } }),
      invalidatesTags: ['Financial', 'Purchase'],
    }),
    updateFinancialQuotation: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/financial/requests/${id}/quotation`, method: 'put', data }),
      invalidatesTags: ['Financial'],
    }),
    requestQuotationModification: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/financial/requests/${id}/request-modification`, method: 'patch', data }),
      invalidatesTags: ['Financial', 'Purchase'],
    }),
    payPurchaseOrder: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/pay/${id}`, method: 'post', data: formData }),
      invalidatesTags: ['Financial', 'PurchaseOrders'],
    }),
    updateOrderAmount: builder.mutation({
      query: ({ id, amount }) => ({ url: `/financial/orders/${id}/amount`, method: 'patch', data: { amount } }),
      invalidatesTags: ['Financial', 'PurchaseOrders'],
    }),
    getExpensePayments: builder.query({
      query: (params) => ({ url: '/financial/expense-payments', params }),
      providesTags: ['ExpensePayments'],
    }),
    payExpense: builder.mutation({
      query: ({ id, formData }) => ({ url: `/financial/expense-payments/${id}/pay`, method: 'post', data: formData }),
      invalidatesTags: (result, error, { id }) => ['ExpensePayments', 'Expenses', { type: 'Expenses', id }],
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
      invalidatesTags: ['LocalPurchaseExpenses', 'Expenses', 'LocalPurchases'],
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
      // Backend also writes payment updates onto the linked Order (see sales.controller
      // updateQuotation) — invalidate Orders/Operations so Sales/Operations refetch too.
      invalidatesTags: ['Quotations', 'Orders', 'Operations'],
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
      invalidatesTags: ['Orders', 'Leads', 'Quotations', 'Negotiations'],
    }),
    updateSalesOrder: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sales/orders/${id}`, method: 'put', data }),
      invalidatesTags: ['Orders', 'Operations'],
    }),
    updateSalesOrderStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/sales/orders/${id}/status`, method: 'patch', data: { status } }),
      invalidatesTags: ['Orders', 'Leads'],
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
      // Can carry an orderId that this recalculates payment status for (see billing.controller
      // createInvoice) — invalidate Orders/Operations so Sales/Operations refetch too.
      invalidatesTags: ['Invoices', 'BillingParties', 'Orders', 'Operations'],
    }),
    updateInvoiceGst: builder.mutation({
      query: ({ id, gstAmount }) => ({ url: `/billing/invoices/${id}/gst`, method: 'patch', data: { gstAmount } }),
      invalidatesTags: ['Invoices'],
    }),
    recordPayment: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/billing/invoices/${id}/payment`, method: 'post', data }),
      // Backend also writes this payment onto the linked Order (see billing.controller
      // recordPayment) — invalidate Orders/Operations so Sales/Operations refetch too.
      invalidatesTags: ['Invoices', 'BillingParties', 'Orders', 'Operations'],
    }),
    getInvoicePayments: builder.query({
      query: (id) => ({ url: `/billing/invoices/${id}/payments` }),
      providesTags: (result, error, id) => [{ type: 'Invoices', id: `${id}-payments` }],
    }),
    convertQuotationToInvoice: builder.mutation({
      query: (data) => ({ url: '/billing/invoices/convert-quotation', method: 'post', data }),
      // Backend also syncs the linked order's tasks with the freshly-resolved payment
      // status (see billing.controller convertQuotationToInvoice → syncOrderTasksPayment) —
      // invalidate Orders/Operations so Sales/Operations refetch instead of showing the
      // payment status cached from before this invoice existed.
      invalidatesTags: ['Invoices', 'BillingParties', 'Quotations', 'Orders', 'Operations'],
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
    getExpenseById: builder.query({
      query: (id) => ({ url: `/expenses/${id}` }),
      providesTags: (result, error, id) => [{ type: 'Expenses', id }],
    }),
    recordExpensePayment: builder.mutation({
      query: ({ id, formData }) => ({ url: `/expenses/${id}/pay`, method: 'post', data: formData }),
      invalidatesTags: (result, error, { id }) => ['Expenses', { type: 'Expenses', id }],
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
    getEmergencyRequests: builder.query({
      query: () => ({ url: '/tasks/emergency-requests' }),
      providesTags: ['Tasks'],
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
      query: ({ id, status, feedback }) => ({ url: `/tasks/${id}/status`, method: 'patch', data: { status, ...(feedback !== undefined ? { feedback } : {}) } }),
      invalidatesTags: ['Tasks'],
    }),
    approveEmergency: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}/approve-emergency`, method: 'patch' }),
      invalidatesTags: ['Tasks'],
    }),
    dispatchTaskOrder: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}/dispatch`, method: 'patch' }),
      invalidatesTags: ['Tasks', 'Orders', 'Operations', 'Dispatch'],
    }),
    requestEmergencyDispatch: builder.mutation({
      query: ({ id, reason }) => ({ url: `/tasks/${id}/request-emergency`, method: 'patch', data: { reason } }),
      invalidatesTags: ['Tasks', 'Operations', 'Orders'],
    }),
    // "Full Order" scope — flags every task/product under the order at once, instead
    // of just the one task the Emergency Dispatch modal was opened from.
    requestEmergencyDispatchForOrder: builder.mutation({
      query: ({ orderId, reason }) => ({ url: `/tasks/order/${orderId}/request-emergency`, method: 'patch', data: { reason } }),
      invalidatesTags: ['Tasks', 'Operations', 'Orders'],
    }),
    approveEmergencySalesHead: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}/approve-emergency/sales`, method: 'patch' }),
      invalidatesTags: ['Tasks', 'Operations', 'Orders'],
    }),
    approveEmergencyOpsHead: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}/approve-emergency/ops`, method: 'patch' }),
      // Ops approval auto-forwards the order to Dispatch server-side, so the Dispatch
      // module's list must be invalidated here too, not just Tasks/Operations/Orders.
      invalidatesTags: ['Tasks', 'Operations', 'Orders', 'Dispatch'],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}`, method: 'delete' }),
      invalidatesTags: ['Tasks'],
    }),
    // ── Task Time Management config ────────────────────────────────────────────
    getTaskTimeConfigs: builder.query({
      query: () => ({ url: '/tasks/time-config' }),
      providesTags: ['TaskTimeConfig'],
    }),
    createTaskTimeConfig: builder.mutation({
      query: (data) => ({ url: '/tasks/time-config', method: 'post', data }),
      invalidatesTags: ['TaskTimeConfig'],
    }),
    updateTaskTimeConfig: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/tasks/time-config/${id}`, method: 'put', data }),
      invalidatesTags: ['TaskTimeConfig'],
    }),
    deleteTaskTimeConfig: builder.mutation({
      query: (id) => ({ url: `/tasks/time-config/${id}`, method: 'delete' }),
      invalidatesTags: ['TaskTimeConfig'],
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
    updateItemPrintingStatus: builder.mutation({
      query: ({ orderId, itemKey, printingStatus }) => ({
        url: `/operations/orders/${orderId}/items/${itemKey}/printing-status`,
        method: 'patch',
        data: { printingStatus },
      }),
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
    uploadStickerInvoice: builder.mutation({
      query: ({ id, formData }) => ({ url: `/operations/stickers/${id}/upload-invoice`, method: 'post', data: formData }),
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
    deleteAllNotifications: builder.mutation({
      query: () => ({ url: '/notifications/all', method: 'delete' }),
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
    getPublicBranding: builder.query({
      query: () => ({ url: '/settings/public-branding' }),
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
    uploadSignature: builder.mutation({
      query: (formData) => ({ url: '/settings/company/signature', method: 'post', data: formData }),
      invalidatesTags: ['Settings'],
    }),
    uploadQrCode: builder.mutation({
      query: (formData) => ({ url: '/settings/company/qrcode', method: 'post', data: formData }),
      invalidatesTags: ['Settings'],
    }),
    getUsers: builder.query({
      query: (params) => ({ url: '/settings/users', params }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (data) => ({ url: '/settings/users', method: 'post', data }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/settings/users/${id}`, method: 'put', data }),
      // Also refresh Auth so editing the logged-in user (e.g. their profile photo)
      // updates the header/profile drawer without a re-login (getMe refetches).
      invalidatesTags: ['Users', 'Auth'],
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
      // Refresh the archive AND every module list a restored record could belong
      // to, so it immediately reappears in its original place without a reload.
      invalidatesTags: [
        'DeletedRecords',
        'Parties', 'BillingParties', 'PartyLedger',
        'Leads', 'Sales', 'Orders', 'Quotations',
        'Inventory', 'Kits', 'Vendors', 'Staff', 'Users',
      ],
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
    createParty: builder.mutation({
      query: (data) => ({ url: '/parties', method: 'post', data }),
      invalidatesTags: ['Parties'],
    }),
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

    // ── WhatsApp ────────────────────────────────────────────────────────────
    getWhatsAppConfig: builder.query({
      query: () => ({ url: '/whatsapp/config' }),
      providesTags: ['WhatsApp'],
    }),
    getWhatsAppCredentials: builder.query({
      query: () => ({ url: '/whatsapp/credentials' }),
      providesTags: ['WhatsApp'],
    }),
    saveWhatsAppConfig: builder.mutation({
      query: (data) => ({ url: '/whatsapp/config', method: 'post', data }),
      invalidatesTags: ['WhatsApp', 'WhatsAppTemplates'],
    }),
    testWhatsAppConnection: builder.mutation({
      query: (data) => ({ url: '/whatsapp/test', method: 'post', data }),
      invalidatesTags: ['WhatsApp', 'WhatsAppTemplates'],
    }),
    disconnectWhatsApp: builder.mutation({
      query: () => ({ url: '/whatsapp/disconnect', method: 'post' }),
      invalidatesTags: ['WhatsApp', 'WhatsAppTemplates', 'WhatsAppEvents', 'WhatsAppMappings'],
    }),
    syncWhatsAppTemplates: builder.mutation({
      query: () => ({ url: '/whatsapp/sync-templates', method: 'post' }),
      invalidatesTags: ['WhatsAppTemplates'],
    }),
    getWhatsAppTemplates: builder.query({
      query: (params) => ({ url: '/whatsapp/templates', params }),
      providesTags: ['WhatsAppTemplates'],
    }),
    getWhatsAppEvents: builder.query({
      query: () => ({ url: '/whatsapp/events' }),
      providesTags: ['WhatsAppEvents'],
    }),
    getWhatsAppEventMappings: builder.query({
      query: () => ({ url: '/whatsapp/event-mappings' }),
      providesTags: ['WhatsAppMappings'],
    }),
    saveWhatsAppEventMapping: builder.mutation({
      query: (data) => ({ url: '/whatsapp/event-mappings', method: 'post', data }),
      invalidatesTags: ['WhatsAppMappings', 'WhatsAppTemplates'],
    }),
    deleteWhatsAppEventMapping: builder.mutation({
      query: (id) => ({ url: `/whatsapp/event-mappings/${id}`, method: 'delete' }),
      invalidatesTags: ['WhatsAppMappings', 'WhatsAppTemplates'],
    }),
    sendWhatsAppMessage: builder.mutation({
      query: (data) => ({ url: '/whatsapp/send', method: 'post', data }),
    }),

    // ── GST Integration ──────────────────────────────────────────────────────
    getGstConfig: builder.query({
      query: () => ({ url: '/settings/gst-config' }),
      providesTags: ['GstConfig'],
    }),
    getGstCredentials: builder.query({
      query: () => ({ url: '/settings/gst-config/credentials' }),
      providesTags: ['GstConfig'],
    }),
    updateGstConfig: builder.mutation({
      query: (data) => ({ url: '/settings/gst-config', method: 'put', data }),
      invalidatesTags: ['GstConfig'],
    }),
    deleteGstConfig: builder.mutation({
      query: () => ({ url: '/settings/gst-config', method: 'delete' }),
      invalidatesTags: ['GstConfig'],
    }),
    testGstConnection: builder.mutation({
      query: (data) => ({ url: '/settings/gst-config/test', method: 'post', data }),
    }),
    verifyGstin: builder.query({
      query: (gstin) => ({ url: `/settings/gst/verify/${encodeURIComponent(gstin)}` }),
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
  useGetVendorLedgerQuery,
  useUpdateVendorStatusMutation,
  useGenerateAiSummaryMutation,
  // Purchase
  useGetRequestsQuery,
  useCreateBulkRequestMutation,
  useRaiseRequestMutation,
  useUploadQuotationFileMutation,
  useUpdatePurchaseRequestDetailsMutation,
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
  useAddBoxPhotoUrlMutation,
  useGetTodaysDispatchesQuery,
  useGetTransportsQuery,
  useUpdateTransportStatusMutation,
  useGetPickupOrdersQuery,
  useGetTodaysPickupOrdersQuery,
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
  // Packing Config
  useGetPackingConfigQuery,
  useCreatePackingConfigMutation,
  useUpdatePackingConfigMutation,
  useDeletePackingConfigMutation,
  // Material Stocks
  useGetMaterialStocksQuery,
  useCreateMaterialStockMutation,
  useUpdateMaterialStockMutation,
  useDeleteMaterialStockMutation,
  useUploadMaterialStockInvoiceMutation,
  // Financial
  useGetPendingRequestsQuery,
  useApproveFinancialRequestMutation,
  useBatchApproveRequestsMutation,
  useRejectFinancialRequestMutation,
  useUpdateFinancialQuotationMutation,
  useRequestQuotationModificationMutation,
  usePayPurchaseOrderMutation,
  useUpdateOrderAmountMutation,
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
  useGetInvoicePaymentsQuery,
  useConvertQuotationToInvoiceMutation,
  useGetQuotationsInProcessQuery,
  // Expenses
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseHistoryQuery,
  useGetExpenseByIdQuery,
  useRecordExpensePaymentMutation,
  // Tasks
  useGetTasksQuery,
  useGetTaskQuery,
  useGetEmergencyRequestsQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useApproveEmergencyMutation,
  useDispatchTaskOrderMutation,
  useRequestEmergencyDispatchMutation,
  useRequestEmergencyDispatchForOrderMutation,
  useApproveEmergencySalesHeadMutation,
  useApproveEmergencyOpsHeadMutation,
  useDeleteTaskMutation,
  useGetTaskTimeConfigsQuery,
  useCreateTaskTimeConfigMutation,
  useUpdateTaskTimeConfigMutation,
  useDeleteTaskTimeConfigMutation,
  // Operations
  useGetOperationOrdersQuery,
  useGetTodaysOrdersQuery,
  useGetTodaysDispatchQuery,
  useUpdateOperationOrderStatusMutation,
  useUpdateItemPrintingStatusMutation,
  useAssignTaskMutation,
  useGetStickerRequestsQuery,
  useCreateStickerRequestMutation,
  useUploadStickerDesignMutation,
  useUpdateStickerStatusMutation,
  useUploadStickerInvoiceMutation,
  useSendToStickerTeamMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetStockAlertsQuery,
  useGetPaymentAlertsQuery,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  // Settings
  useGetCountryCodesQuery,
  useGetCompanySettingsQuery,
  useGetPublicBrandingQuery,
  useUpdateCompanySettingsMutation,
  useUploadLogoMutation,
  useUploadSignatureMutation,
  useUploadQrCodeMutation,
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
  useCreatePartyMutation,
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
  // WhatsApp
  useGetWhatsAppConfigQuery,
  useGetWhatsAppCredentialsQuery,
  useSaveWhatsAppConfigMutation,
  useTestWhatsAppConnectionMutation,
  useDisconnectWhatsAppMutation,
  useSyncWhatsAppTemplatesMutation,
  useGetWhatsAppTemplatesQuery,
  useGetWhatsAppEventsQuery,
  useGetWhatsAppEventMappingsQuery,
  useSaveWhatsAppEventMappingMutation,
  useDeleteWhatsAppEventMappingMutation,
  useSendWhatsAppMessageMutation,
  // GST Integration
  useGetGstConfigQuery,
  useGetGstCredentialsQuery,
  useLazyGetGstCredentialsQuery,
  useUpdateGstConfigMutation,
  useDeleteGstConfigMutation,
  useTestGstConnectionMutation,
  useVerifyGstinQuery,
  useLazyVerifyGstinQuery,
} = apiSlice;
