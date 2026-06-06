import { createSlice } from '@reduxjs/toolkit';

const loadAuth = () => {
  try {
    const raw = localStorage.getItem('hng_auth');
    return raw ? JSON.parse(raw) : { user: null, isAuthenticated: false, token: null, refreshToken: null, error: null };
  } catch {
    return { user: null, isAuthenticated: false, token: null, refreshToken: null, error: null };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: { ...loadAuth(), error: null },
  reducers: {
    setUser(state, action) {
      const user = action.payload.user ? { ...action.payload.user } : null;
      // Normalize permissions: Mongoose Map instances serialize to {} in JSON.
      // Convert to plain object here so localStorage stores the actual keys.
      if (user?.permissions instanceof Map) {
        user.permissions = Object.fromEntries(user.permissions);
      }
      if (user?.tabAccess instanceof Map) {
        user.tabAccess = Object.fromEntries(user.tabAccess);
      }
      state.user = user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('hng_auth', JSON.stringify({
        user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
      }));
    },
    // Refresh the logged-in user's profile (e.g. permissions / tabAccess changed
    // by an admin) without touching the existing tokens. Lets access changes
    // take effect on the next app load instead of requiring a re-login.
    refreshUser(state, action) {
      const incoming = action.payload?.user;
      if (!incoming) return;
      const user = { ...incoming };
      if (user.permissions instanceof Map) {
        user.permissions = Object.fromEntries(user.permissions);
      }
      if (user.tabAccess instanceof Map) {
        user.tabAccess = Object.fromEntries(user.tabAccess);
      }
      state.user = user;
      localStorage.setItem('hng_auth', JSON.stringify({
        user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('hng_auth');
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const { setUser, refreshUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
