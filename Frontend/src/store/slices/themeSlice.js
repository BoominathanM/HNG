import { createSlice } from '@reduxjs/toolkit';

const loadTheme = () => {
  try {
    const raw = localStorage.getItem('hng_theme');
    return raw ? JSON.parse(raw) : { isDark: false, sidebarCollapsed: false };
  } catch {
    return { isDark: false, sidebarCollapsed: false };
  }
};

const saved = loadTheme();
document.body.classList.toggle('dark-mode', saved.isDark);

const themeSlice = createSlice({
  name: 'theme',
  initialState: saved,
  reducers: {
    toggleTheme: (state) => {
      state.isDark = !state.isDark;
      document.body.classList.toggle('dark-mode', state.isDark);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const { toggleTheme, toggleSidebar, setSidebarCollapsed } = themeSlice.actions;
export default themeSlice.reducer;
