const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const ctrl = require('./whatsapp.controller');

router.use(protect);

router.get('/config',          ctrl.getConfig);
router.get('/credentials',     ctrl.getCredentials);
router.post('/config',         ctrl.saveConfig);
router.post('/test',           ctrl.testConnection);
router.post('/disconnect',     ctrl.disconnect);
router.post('/sync-templates', ctrl.syncTemplates);
router.get('/templates',       ctrl.getTemplates);
router.get('/events',          ctrl.getEvents);
router.get('/event-mappings',  ctrl.getEventMappings);
router.post('/event-mappings', ctrl.saveEventMapping);
router.delete('/event-mappings/:id', ctrl.deleteEventMapping);
router.post('/send',           ctrl.sendMessage);

module.exports = router;
