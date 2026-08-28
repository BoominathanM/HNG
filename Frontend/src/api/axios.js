import axios from 'axios';

// Resolve API base URL:
// - Explicit VITE_API_URL wins (set per-environment at build time)
// - On localhost dev → backend on port 7007
// - On the production domain → same origin (e.g. https://hngcrm.askeva.io/api)
const isLocalhost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:7007/api' : `${window.location.origin}/api`);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,         
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

// Auto-refresh on 401.
// The backend ROTATES the refresh token on every /auth/refresh call, so a burst
// of parallel 401s (e.g. a dashboard firing many queries at once) must NOT each
// fire their own refresh — the first would rotate the token and invalidate the
// rest, kicking the user back to /login. We serialize through a single shared
// in-flight refresh promise and let every queued request reuse its result.
let refreshPromise = null;

const runRefresh = async (refreshToken) => {
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
  localStorage.setItem('hng_auth', JSON.stringify({
    ...auth,
    token: data.token,
    refreshToken: data.refreshToken,
  }));
  scheduleTokenRefresh(data.token);
  return data.token;
};

// Sliding session: proactively rotate the access token a few minutes before it
// expires instead of waiting for a 401. This is what actually makes "session
// length" a sliding window based on activity — without it, the reactive-on-401
// refresh only ever fires AFTER the token has already died, and the backend
// mirrors the refresh token's expiry closely enough that a fully-dead access
// token often means a fully-dead refresh token too, forcing a real logout even
// for a tab that was open and active the whole time.
const REFRESH_LEAD_MS = 5 * 60 * 1000;

let refreshTimer = null;

const decodeJwtExp = (token) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = JSON.parse(atob(padded));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
};

export const clearScheduledRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

const attemptProactiveRefresh = async () => {
  const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
  if (!auth.refreshToken) return;
  try {
    if (!refreshPromise) {
      refreshPromise = runRefresh(auth.refreshToken).finally(() => { refreshPromise = null; });
    }
    await refreshPromise;
  } catch {
    // Leave it to the reactive 401 path (or its force-logout) to handle a
    // genuinely dead session — a transient failure here shouldn't log anyone out.
  }
};

export const scheduleTokenRefresh = (token) => {
  clearScheduledRefresh();
  const exp = decodeJwtExp(token);
  if (!exp) return;
  const delay = Math.max(exp * 1000 - REFRESH_LEAD_MS - Date.now(), 0);
  refreshTimer = setTimeout(attemptProactiveRefresh, delay);
};

// Background/inactive tabs can have setTimeout throttled by the browser well
// past its intended delay, so also check-and-refresh on tab focus.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
    if (!auth.token) return;
    const exp = decodeJwtExp(auth.token);
    if (exp && Date.now() >= exp * 1000 - REFRESH_LEAD_MS) {
      attemptProactiveRefresh();
    }
  });
}

// Pick up an existing session on page load (hard refresh / new tab).
if (typeof window !== 'undefined') {
  const existingAuth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
  if (existingAuth.token) scheduleTokenRefresh(existingAuth.token);
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Rate-limited (429): the backend always sends `Retry-After` (seconds) on
    // these. Retry once after that delay instead of surfacing a transient cap
    // as a broken request — most 429s here are a momentary burst (e.g. a
    // window-focus refetch storm, or several teammates sharing one office IP)
    // that clears within the window, not a real failure.
    if (error.response?.status === 429 && original && !original._retry429) {
      original._retry429 = true;
      const retryAfterSec = Number(error.response.headers?.['retry-after']);
      const delayMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec * 1000
        : 1500;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 10000)));
      return api(original);
    }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
      if (!auth.refreshToken) return Promise.reject(error);
      try {
        if (!refreshPromise) {
          refreshPromise = runRefresh(auth.refreshToken).finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        // Only force-logout when the server genuinely rejects the refresh token
        // (400 = missing, 401 = invalid/expired). Transient failures — network
        // drop, timeout, or a 5xx — must NOT end the session; keep the user
        // logged in and let the request fail/retry instead.
        const status = refreshErr.response?.status;
        if (status === 400 || status === 401) {
          localStorage.removeItem('hng_auth');
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
