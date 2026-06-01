const express = require('express');
const router = express.Router();
const ctrl = require('./sales.controller');
const { protect } = require('../../middleware/auth');

router.use(protect);

// Reminders + hotel lookup
router.get('/reminders', ctrl.getReminders);
router.get('/hotels', ctrl.getHotelNames);
router.get('/hotels/lookup', ctrl.getHotelByName);

// Leads
router.get('/leads', ctrl.getLeads);
router.post('/leads', ctrl.createLead);
router.get('/leads/:id', ctrl.getLead);
router.put('/leads/:id', ctrl.updateLead);
router.delete('/leads/:id', ctrl.deleteLead);
router.patch('/leads/:id/status', ctrl.updateLeadStatus);
router.patch('/leads/:id/assign', ctrl.assignLead);
router.post('/leads/:id/convert-negotiation', ctrl.convertLeadToNegotiation);

// Quotations
router.get('/quotations', ctrl.getQuotations);
router.post('/quotations', ctrl.createQuotation);
router.post('/quotations/:id/convert-negotiation', ctrl.convertToNegotiation);

// Negotiations
router.get('/negotiations', ctrl.getNegotiations);
router.post('/negotiations/:id/convert-order', ctrl.convertToOrder);

// Orders
router.get('/orders', ctrl.getOrders);
router.post('/orders', ctrl.createDirectOrder);
router.get('/orders/:id', ctrl.getOrder);
router.put('/orders/:id', ctrl.updateOrder);
router.patch('/orders/:id/status', ctrl.updateOrderStatus);

// Complaints
router.get('/complaints', ctrl.getComplaints);
router.get('/complaints/history', ctrl.getComplaintHistory);
router.post('/complaints', ctrl.createComplaint);
router.patch('/complaints/:id/status', ctrl.updateComplaintStatus);

module.exports = router;
