const Notification = require('../models/Notification');

/**
 * Real-time push for the navbar bell (Server-Sent Events).
 *
 * Each logged-in browser holds one GET /api/notifications/stream connection. When a
 * Notification is created for a user, every stream that user has open gets an
 * `event: notification` so the frontend re-fetches the bell immediately instead of
 * waiting for its 30s poll (which stays on as the fallback).
 *
 * Two sources feed publish(), deduped by notification _id:
 *  - in-process: utils/notify.js calls publish() right after Notification.create
 *  - MongoDB change stream on the notifications collection: catches inserts made by
 *    any OTHER backend process sharing the DB (PM2 cluster workers, the dev server
 *    on the same Atlas DB), whose in-process publish can't reach streams held here.
 *
 * Only the notification id is pushed — the client fetches the content through the
 * normal authenticated GET /notifications.
 */

const HEARTBEAT_MS = 25000; // under nginx's default 60s proxy_read_timeout
const MAX_STREAMS_PER_USER = 10;
const DEDUPE_TTL_MS = 5 * 60 * 1000;
const CHANGE_STREAM_RETRY_MS = 30000;

const clients = new Map(); // userId -> Set<res>
const recentlySent = new Map(); // notificationId -> sentAt
let changeStream = null;
let stopped = false;

function send(res, chunk) {
  if (res.writableEnded || res.destroyed) return;
  res.write(chunk);
  if (typeof res.flush === 'function') res.flush();
}

function writeEvent(res, event, data) {
  send(res, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function subscribe(req, res) {
  const userId = String(req.user._id);

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    // no-transform keeps the compression() middleware from buffering the stream.
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // nginx otherwise buffers the proxied response and events arrive in bursts.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  if (req.socket) req.socket.setNoDelay(true);

  let set = clients.get(userId);
  if (!set) {
    set = new Set();
    clients.set(userId, set);
  }
  // Bound per-user connections — drop the oldest (Set keeps insertion order).
  while (set.size >= MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value;
    set.delete(oldest);
    oldest.end();
  }
  set.add(res);

  writeEvent(res, 'ready', {});
  const heartbeat = setInterval(() => send(res, ': ping\n\n'), HEARTBEAT_MS);

  // A write racing a dropped socket must not surface as an unhandled 'error'.
  res.on('error', () => {});
  // res (not req) 'close' — it fires when the client disconnects or we end() it.
  res.on('close', () => {
    clearInterval(heartbeat);
    const s = clients.get(userId);
    if (!s) return;
    s.delete(res);
    if (!s.size) clients.delete(userId);
  });
}

// Never throws — callers run it right after the Notification is saved, and a push
// failure must not turn that already-successful save into an error.
function publish(notification) {
  try {
    if (!notification || !notification._id || !notification.userId) return;
    const id = String(notification._id);
    if (recentlySent.has(id)) return;

    const now = Date.now();
    recentlySent.set(id, now);
    if (recentlySent.size > 500) {
      for (const [key, at] of recentlySent) {
        if (now - at > DEDUPE_TTL_MS) recentlySent.delete(key);
      }
    }

    const set = clients.get(String(notification.userId));
    if (!set) return;
    for (const res of set) writeEvent(res, 'notification', { id });
  } catch (err) {
    console.error('[notificationStream] publish failed:', err.message);
  }
}

function isUnsupported(err) {
  // 40573: change streams need a replica set (e.g. a local standalone mongod).
  return err && (err.code === 40573 || /only supported on replica sets/i.test(err.message || ''));
}

function startChangeStream() {
  if (stopped || changeStream) return;
  let cs;
  try {
    cs = Notification.watch([
      { $match: { operationType: 'insert' } },
      { $project: { 'fullDocument._id': 1, 'fullDocument.userId': 1 } },
    ]);
  } catch (err) {
    console.error('[notificationStream] change stream failed to start:', err.message);
    setTimeout(startChangeStream, CHANGE_STREAM_RETRY_MS);
    return;
  }
  changeStream = cs;

  cs.on('change', (ev) => publish(ev.fullDocument));
  cs.on('error', (err) => {
    if (cs !== changeStream) return; // already replaced/stopped
    changeStream = null;
    cs.close().catch(() => {});
    if (isUnsupported(err)) {
      console.warn('[notificationStream] change streams unsupported on this MongoDB — in-process push only.');
      return;
    }
    console.error('[notificationStream] change stream error, retrying:', err.message);
    setTimeout(startChangeStream, CHANGE_STREAM_RETRY_MS);
  });
  // The driver can also close the stream without an error (e.g. after a long Atlas
  // outage) — reopen it, unless we closed it ourselves (error path / shutdown).
  cs.on('close', () => {
    if (cs !== changeStream || stopped) return;
    changeStream = null;
    setTimeout(startChangeStream, CHANGE_STREAM_RETRY_MS);
  });
}

// Open SSE connections would otherwise keep server.close() from ever finishing.
function closeAll() {
  stopped = true;
  if (changeStream) changeStream.close().catch(() => {});
  changeStream = null;
  // destroy, not end(): an ended stream leaves the keep-alive socket open and
  // server.close() then waits on it. Clients just see a drop and reconnect.
  for (const set of clients.values()) {
    for (const res of set) res.destroy();
  }
  clients.clear();
}

module.exports = { subscribe, publish, startChangeStream, closeAll };
