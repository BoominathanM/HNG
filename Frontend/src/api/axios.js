import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
