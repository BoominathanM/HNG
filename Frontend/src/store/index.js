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

store.subscribe(() => {
  const { auth, theme } = store.getState();
  if (auth.isAuthenticated) {
    localStorage.setItem('hng_auth', JSON.stringify(auth));
  }
  localStorage.setItem('hng_theme', JSON.stringify(theme));
});
