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

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const auth = JSON.parse(localStorage.getItem('hng_auth') || '{}');
        if (auth.refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: auth.refreshToken });
          const newAuth = { ...auth, token: data.token, refreshToken: data.refreshToken };
          localStorage.setItem('hng_auth', JSON.stringify(newAuth));
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('hng_auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
