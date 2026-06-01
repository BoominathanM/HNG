const Notification = require('../models/Notification');

/**
 * Central notification service.
 *
 * Persists an in-app Notification and (when WhatsApp is requested) dispatches the
 * message through the configured provider. Real WhatsApp delivery is plugged in via
 * `sendWhatsApp` below — set WHATSAPP_API_URL / WHATSAPP_API_TOKEN in the env and the
 * payload is POSTed to the provider; otherwise it is recorded/logged so the flow stays
 * functional in development.
 */

async function sendWhatsApp({ to, message }) {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!url || !token || !to) {
    // No provider configured (or no recipient) — record intent without failing the flow.
    console.log(`[whatsapp:dev] → ${to || 'n/a'}: ${message}`);
    return { delivered: false, provider: 'none' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, type: 'text', text: { body: message } }),
    });
    return { delivered: res.ok, provider: 'whatsapp', status: res.status };
  } catch (err) {
    console.error('[whatsapp] send failed:', err.message);
    return { delivered: false, provider: 'whatsapp', error: err.message };
  }
}

/**
 * Create an in-app notification and optionally fan out via WhatsApp.
 * @param {Object} opts
 * @param {ObjectId} [opts.userId] recipient user (in-app)
 * @param {string}   opts.type   one of Notification enum
 * @param {string}   [opts.title]
 * @param {string}   opts.message
 * @param {string}   [opts.link]
 * @param {Object}   [opts.data]
 * @param {boolean}  [opts.whatsapp] also send WhatsApp
 * @param {string}   [opts.phone]    WhatsApp recipient number
 */
async function notify(opts = {}) {
  const { userId, type = 'system', title, message, link, data, whatsapp, phone } = opts;
  let record = null;
  try {
    record = await Notification.create({ userId, type, title, message, link, data });
  } catch (err) {
    console.error('[notify] persist failed:', err.message);
  }
  let wa = null;
  if (whatsapp) wa = await sendWhatsApp({ to: phone, message: message || title });
  return { record, whatsapp: wa };
}

/** Convenience: notify multiple recipients (e.g. sales person + customer). */
async function notifyMany(list = []) {
  return Promise.all(list.map((o) => notify(o)));
}

module.exports = { notify, notifyMany, sendWhatsApp };
