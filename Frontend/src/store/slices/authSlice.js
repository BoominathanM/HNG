import { createSlice } from '@reduxjs/toolkit';

const loadAuth = () => {
  try {
    const raw = localStorage.getItem('hng_auth');
    return raw ? JSON.parse(raw) : { user: null, isAuthenticated: false };
  } catch {
    return { user: null, isAuthenticated: false };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuth(),
  reducers: {
    setUser: (state, action) => { state.user = action.payload; state.isAuthenticated = true; },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('hng_auth');
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
