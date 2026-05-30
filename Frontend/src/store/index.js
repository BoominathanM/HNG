import { configureStore } from '@reduxjs/toolkit';
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

store.subscribe(() => {
  const { auth, theme } = store.getState();
  if (auth.isAuthenticated) {
    localStorage.setItem('hng_auth', JSON.stringify(auth));
  }
  localStorage.setItem('hng_theme', JSON.stringify(theme));
});
