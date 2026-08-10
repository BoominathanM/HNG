import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import purchaseReducer from './slices/purchaseSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    purchase: purchaseReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

// Enables refetchOnFocus/refetchOnReconnect (declared in apiSlice) by attaching the
// window focus/online listeners RTK Query needs to act on them.
setupListeners(store.dispatch);

// NOTE: 'hng_auth' is intentionally NOT persisted here. authSlice's own reducers
// (setUser/refreshUser/logout) already persist it on the actions that actually
// change it. Silent token refresh (Frontend/src/api/axios.js) also writes fresh
// tokens straight to localStorage without touching Redux. A blanket subscribe
// like this one fires on every RTK Query action and would re-serialize the
// (stale) in-memory auth.token/refreshToken over the top of that refresh,
// resurrecting an already-rotated refresh token and forcing a spurious logout
// on the next silent-refresh attempt.
store.subscribe(() => {
  const { theme } = store.getState();
  localStorage.setItem('hng_theme', JSON.stringify(theme));
});
