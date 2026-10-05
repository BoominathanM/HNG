import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../../api/axios';
import { apiSlice } from '../../store/api/apiSlice';

const LOCK_NAME = 'hng-notification-stream';
const CHANNEL_NAME = 'hng-notification-stream';
const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
// A connection that stayed open this long was healthy — reconnect fast after it drops.
const HEALTHY_CONNECTION_MS = 10000;
const REFRESH_DEBOUNCE_MS = 300;

const readToken = () => {
  try {
    return JSON.parse(localStorage.getItem('hng_auth') || '{}').token || null;
  } catch {
    return null;
  }
};

const sleep = (ms, signal) => new Promise((resolve) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
});

// Parses an SSE body into (event, data) calls. Heartbeat comments (": ping") are skipped.
async function readEvents(body, onEvent) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data || event !== 'message') onEvent(event, data);
    }
  }
}

// Holds GET /notifications/stream open, reconnecting with backoff until aborted.
// fetch (not EventSource) so the Bearer token goes in the header, not the URL.
async function runStream(signal, { onNotification, onReconnected }) {
  let backoff = MIN_BACKOFF_MS;
  let connectedBefore = false;
  while (!signal.aborted) {
    const token = readToken();
    let openedAt = null;
    if (token) {
      try {
        const res = await fetch(`${api.defaults.baseURL}/notifications/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          cache: 'no-store',
          signal,
        });
        if (res.ok && res.body) {
          openedAt = Date.now();
          await readEvents(res.body, (event) => {
            if (event === 'ready') {
              // Anything created while we were disconnected never got pushed.
              if (connectedBefore) onReconnected();
              connectedBefore = true;
            } else if (event === 'notification') {
              onNotification();
            }
          });
        }
        // 401 (token mid-rotation) etc. — retry; axios's own refresh updates localStorage.
      } catch {
        // network drop, server restart, or abort — handled by the loop
      }
    }
    if (signal.aborted) return;
    backoff = openedAt && Date.now() - openedAt >= HEALTHY_CONNECTION_MS
      ? MIN_BACKOFF_MS
      : Math.min(backoff * 2, MAX_BACKOFF_MS);
    await sleep(backoff, signal);
  }
}

// Mounted once in AppLayout. Makes the navbar bell (and the Notifications page) update
// the moment the backend creates a notification, instead of on the next 30s poll —
// the poll in Header/NotificationSoundListener stays on as the fallback.
//
// Only ONE tab per browser holds the stream (Web Locks leader); it relays each push to
// the other tabs over a BroadcastChannel. One connection per tab would exhaust the
// browser's 6-connections-per-host limit over HTTP/1.1 and stall every API call.
export default function NotificationStreamListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    // One action can notify the same user several times in a row — coalesce that burst
    // into a single bell refetch (and so a single NotificationSoundListener ring).
    let refreshTimer = null;
    const refresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        dispatch(apiSlice.util.invalidateTags([{ type: 'Notifications', id: 'LIST' }]));
      }, REFRESH_DEBOUNCE_MS);
    };

    const hasLocks = !!navigator.locks?.request;
    // Without Web Locks (e.g. plain-http LAN address) every tab runs its own stream,
    // so relaying would only double each tab's refresh.
    const channel = hasLocks && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    if (channel) channel.onmessage = refresh;

    const onPush = () => { refresh(); channel?.postMessage('changed'); };
    const handlers = { onNotification: onPush, onReconnected: onPush };

    const controller = new AbortController();
    if (hasLocks) {
      navigator.locks
        .request(LOCK_NAME, { signal: controller.signal }, () => runStream(controller.signal, handlers))
        .catch(() => {}); // AbortError when unmounted while still waiting for the lock
    } else {
      runStream(controller.signal, handlers);
    }

    return () => {
      controller.abort();
      channel?.close();
      clearTimeout(refreshTimer);
    };
  }, [dispatch]);

  return null;
}
