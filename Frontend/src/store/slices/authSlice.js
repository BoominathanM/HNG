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
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('hng_auth', JSON.stringify({
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
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

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
