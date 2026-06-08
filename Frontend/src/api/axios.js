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
  return data.token;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
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
