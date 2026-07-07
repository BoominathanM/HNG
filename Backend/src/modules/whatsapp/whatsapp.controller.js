const WhatsAppConfig = require('../../models/WhatsAppConfig');
const WhatsAppTemplate = require('../../models/WhatsAppTemplate');
const WhatsAppEvent = require('../../models/WhatsAppEvent');
const WhatsAppEventMapping = require('../../models/WhatsAppEventMapping');
const { encrypt, decrypt } = require('../../utils/encryption');
const {
  DEFAULT_BACKEND_URL,
  ensureAccountVerificationEvent,
  ensureDefaultWhatsAppEvents,
  normalizeUrl,
  sendMessage: sendMessageService,
  syncTemplatesFromConfig,
  syncTemplatesByStoredConfig,
  testWhatsAppConnection,
} = require('../../services/whatsAppService');

function mapConfigResponse(config) {
  return {
    id: config._id,
    backendUrl: config.backendUrl,
    isEnabled: config.isEnabled,
    isConnected: config.isConnected,
    connectionError: config.connectionError,
    lastVerifiedAt: config.lastVerifiedAt,
    lastSyncedAt: config.lastSyncedAt,
    lastSyncCount: config.lastSyncCount,
    syncStatus: config.syncStatus,
    sendTemplatePath: config.sendTemplatePath || '',
    lastTemplatesListEndpoint: config.lastTemplatesListEndpoint || '',
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

// GET /api/whatsapp/config
exports.getConfig = async (req, res, next) => {
  try {
    const config = await WhatsAppConfig.findOne();
    res.status(200).json({ success: true, data: config ? mapConfigResponse(config) : null });
  } catch (err) { next(err); }
};

// GET /api/whatsapp/credentials  (decrypted token for pre-fill)
exports.getCredentials = async (req, res, next) => {
  try {
    const config = await WhatsAppConfig.findOne().select('+apiToken');
    if (!config) {
      return res.status(200).json({ success: true, data: { backendUrl: DEFAULT_BACKEND_URL, apiToken: '' } });
    }
    res.status(200).json({
      success: true,
      data: { backendUrl: config.backendUrl || DEFAULT_BACKEND_URL, apiToken: decrypt(config.apiToken) },
    });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/config
exports.saveConfig = async (req, res, next) => {
  try {
    const { backendUrl, apiToken, sendTemplatePath } = req.body;
    if (!backendUrl || !apiToken) {
      return res.status(400).json({ success: false, message: 'Backend URL and API token are required', data: null });
    }

    const update = {
      backendUrl: normalizeUrl(backendUrl),
      apiToken: encrypt(apiToken),
      isEnabled: true,
      updatedBy: req.user?._id || null,
    };
    if (sendTemplatePath !== undefined) update.sendTemplatePath = String(sendTemplatePath || '').trim();

    let config = await WhatsAppConfig.findOne();
    if (!config) {
      config = await WhatsAppConfig.create({ ...update, createdBy: req.user?._id || null });
    } else {
      Object.assign(config, update);
      await config.save();
    }

    const fresh = await WhatsAppConfig.findById(config._id).select('+apiToken');
    const syncResult = await syncTemplatesFromConfig(fresh);

    res.status(200).json({
      success: true,
      message: syncResult.success
        ? `Configuration saved and ${syncResult.synced} templates synced`
        : 'Configuration saved successfully',
      data: { ...mapConfigResponse(await WhatsAppConfig.findById(config._id)), sync: syncResult },
    });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/test
exports.testConnection = async (req, res, next) => {
  try {
    const stored = await WhatsAppConfig.findOne().select('+apiToken');
    const backendUrl = req.body.backendUrl || stored?.backendUrl || DEFAULT_BACKEND_URL;
    const apiToken = req.body.apiToken || (stored?.apiToken ? decrypt(stored.apiToken) : '');

    if (!apiToken) {
      return res.status(400).json({ success: false, message: 'API token is required', data: null });
    }

    const result = await testWhatsAppConnection({ backendUrl, apiToken });

    if (stored) {
      stored.isConnected = Boolean(result.success);
      stored.lastVerifiedAt = new Date();
      stored.connectionError = result.success ? '' : (result.error || 'Connection failed');
      if (result.success && result.endpoint) stored.lastTemplatesListEndpoint = result.endpoint;
      await stored.save();
    }

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Connection failed', data: null });
    }

    let syncResult = null;
    if (stored) syncResult = await syncTemplatesByStoredConfig();

    res.status(200).json({
      success: true,
      message: 'Connection successful',
      data: { templateCount: result.templateCount, endpoint: result.endpoint, sync: syncResult },
    });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/disconnect
exports.disconnect = async (req, res, next) => {
  try {
    await Promise.all([
      WhatsAppConfig.deleteMany({}),
      WhatsAppTemplate.deleteMany({}),
      WhatsAppEventMapping.deleteMany({}),
    ]);
    res.status(200).json({
      success: true,
      message: 'WhatsApp integration disconnected. All saved configuration and templates removed.',
      data: null,
    });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/sync-templates
exports.syncTemplates = async (req, res, next) => {
  try {
    const result = await syncTemplatesByStoredConfig();
    if (!result.success) {
      return res.status(result.skipped ? 400 : 500).json({ success: false, message: result.error || 'Sync failed', data: null });
    }
    res.status(200).json({
      success: true,
      message: `Successfully synced ${result.synced} templates`,
      data: { synced: result.synced, endpoint: result.endpoint },
    });
  } catch (err) { next(err); }
};

// GET /api/whatsapp/templates
exports.getTemplates = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(5000, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [templates, total, mappings] = await Promise.all([
      WhatsAppTemplate.find().sort({ lastSyncedAt: -1, name: 1 }).skip(skip).limit(limit).lean(),
      WhatsAppTemplate.countDocuments(),
      WhatsAppEventMapping.find().populate('eventId', 'label').lean(),
    ]);

    const mappedByTemplate = mappings.reduce((acc, m) => {
      const key = String(m.templateId);
      if (!acc[key]) acc[key] = [];
      if (m.eventId?.label) acc[key].push(m.eventId.label);
      return acc;
    }, {});

    const data = templates.map((t) => ({ ...t, mappedEvents: mappedByTemplate[String(t._id)] || [] }));

    res.status(200).json({
      success: true,
      data: { templates: data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
};

// Explicit allow-list of events with a live trigger wired up somewhere in the
// backend (schedulers or on-demand sends) — kept separate from DEFAULT_EVENTS so a
// future placeholder event added there without a real trigger can't silently appear
// in the mapping UI and let users create mappings that never fire. account-verification
// is intentionally excluded — it has no live trigger yet.
const ENABLED_EVENT_KEYS = ['follow-up-reminder', 'payment-due', 'billing-invoice', 'dispatch-notify', 'order-delivery-reminder', 'local-purchase-credit-due', 'stock-checking', 'bulk-purchase-request', 'purchase-ask-quotation', 'purchase-payment-reminder', 'separate-purchase-payment-reminder'];

// These events escalate on a start/end time window + delay (see
// localPurchaseCreditDueScheduler.js) instead of the once-a-day `sendTime` used by
// the other date-driven reminders, so `sendTime` is meaningless for them and is
// stripped out rather than defaulted.
const ESCALATION_EVENT_KEYS = ['local-purchase-credit-due'];

// GET /api/whatsapp/events
exports.getEvents = async (req, res, next) => {
  try {
    await ensureDefaultWhatsAppEvents();
    await ensureAccountVerificationEvent();
    const events = await WhatsAppEvent
      .find({ isActive: true, key: { $in: ENABLED_EVENT_KEYS } })
      .sort({ label: 1 })
      .lean();
    res.status(200).json({ success: true, data: events });
  } catch (err) { next(err); }
};

// GET /api/whatsapp/event-mappings
exports.getEventMappings = async (req, res, next) => {
  try {
    const mappings = await WhatsAppEventMapping.find()
      .populate('eventId', 'label key availableFields')
      .populate('templateId', 'name language status variables category components rawPayload')
      .populate('recipientUserIds', 'fullName mobile department role status')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: mappings });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/event-mappings  (create or update)
exports.saveEventMapping = async (req, res, next) => {
  try {
    const { id, eventId, templateId, isEnabled, variables, sendTime, recipientUserIds, startTime, endTime, delayMinutes, days } = req.body;
    if (!eventId || !templateId) {
      return res.status(400).json({ success: false, message: 'Event and template are required', data: null });
    }

    const [event, template] = await Promise.all([
      WhatsAppEvent.findById(eventId),
      WhatsAppTemplate.findById(templateId),
    ]);
    if (!event || !template) {
      return res.status(404).json({ success: false, message: 'Event or template not found', data: null });
    }

    const cleanVars = Array.isArray(variables)
      ? variables.filter((v) => v?.templateVariable && v?.eventField).map((v) => ({
          templateVariable: v.templateVariable,
          eventField: v.eventField,
        }))
      : [];

    const isEscalation = ESCALATION_EVENT_KEYS.includes(event.key);
    const timePattern = /^\d{2}:\d{2}$/;
    const escalationFields = {
      recipientUserIds: Array.isArray(recipientUserIds) ? recipientUserIds : [],
      startTime: timePattern.test(startTime || '') ? startTime : undefined,
      endTime: timePattern.test(endTime || '') ? endTime : undefined,
      delayMinutes: Number(delayMinutes) > 0 ? Number(delayMinutes) : undefined,
      days: Array.isArray(days) ? days : [],
    };

    let mapping;
    if (id) {
      const setFields = { eventId, templateId, isEnabled: isEnabled !== false, variables: cleanVars, ...escalationFields, updatedBy: req.user?._id || null };
      const update = isEscalation
        ? { $set: setFields, $unset: { sendTime: '' } }
        : { $set: { ...setFields, sendTime: /^\d{2}:\d{2}$/.test(sendTime || '') ? sendTime : '08:00' } };
      mapping = await WhatsAppEventMapping.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true }
      )
        .populate('eventId', 'label key availableFields')
        .populate('templateId', 'name language status variables category components rawPayload')
        .populate('recipientUserIds', 'fullName mobile department role status')
        .lean();
    } else {
      const cleanSendTime = /^\d{2}:\d{2}$/.test(sendTime || '') ? sendTime : '08:00';
      const created = await WhatsAppEventMapping.create({
        eventId, templateId, isEnabled: isEnabled !== false, variables: cleanVars, ...(isEscalation ? {} : { sendTime: cleanSendTime }), ...escalationFields,
        createdBy: req.user?._id || null, updatedBy: req.user?._id || null,
      });
      mapping = await WhatsAppEventMapping.findById(created._id)
        .populate('eventId', 'label key availableFields')
        .populate('templateId', 'name language status variables category components rawPayload')
        .populate('recipientUserIds', 'fullName mobile department role status')
        .lean();
    }

    res.status(200).json({
      success: true,
      message: id ? 'Event mapping updated' : 'Event mapping created',
      data: mapping,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ success: false, message: 'A mapping already exists for this event', data: null });
    }
    next(err);
  }
};

// DELETE /api/whatsapp/event-mappings/:id
exports.deleteEventMapping = async (req, res, next) => {
  try {
    const mapping = await WhatsAppEventMapping.findById(req.params.id);
    if (!mapping) return res.status(404).json({ success: false, message: 'Event mapping not found', data: null });
    await WhatsAppEventMapping.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Event mapping deleted', data: null });
  } catch (err) { next(err); }
};

// POST /api/whatsapp/send
exports.sendMessage = async (req, res, next) => {
  try {
    const { to, templateName, language, parameters, components, documentUrl, documentFilename } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ success: false, message: 'Recipient phone (to) and templateName are required', data: null });
    }
    const result = await sendMessageService({
      to, templateName,
      language: language || 'en',
      parameters: parameters || {},
      components: components || null,
      documentUrl: documentUrl || '',
      documentFilename: documentFilename || '',
    });
    if (!result.success) {
      const status = result.statusCode === 401 || result.statusCode === 403 ? result.statusCode : 400;
      return res.status(status).json({
        success: false,
        message: result.error || 'Failed to send message',
        data: { sentPayload: result.sentPayload || null, rawResponse: result.rawResponse || null },
      });
    }
    res.status(200).json({ success: true, message: 'WhatsApp message sent successfully', data: { messageId: result.messageId ?? null } });
  } catch (err) { next(err); }
};

