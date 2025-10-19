// src/features/ui/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const prefersDark =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;

const initialDark =
  (typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")) ||
  (typeof localStorage !== "undefined" &&
    localStorage.getItem("theme") === "dark") ||
  prefersDark;

const initialState = {
  darkMode: initialDark,
  langMenuOpen: false,
  legalMenuOpen: false,
  mobileMenuOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      try {
        localStorage.setItem("theme", state.darkMode ? "dark" : "light");
      } catch {}
    },
    setLangMenuOpen(state, action) {
      state.langMenuOpen = action.payload;
    },
    setLegalMenuOpen(state, action) {
      state.legalMenuOpen = action.payload;
    },
    setMobileMenuOpen(state, action) {
      state.mobileMenuOpen = action.payload;
    },
    closeAllMenus(state) {
      state.langMenuOpen = false;
      state.legalMenuOpen = false;
      state.mobileMenuOpen = false;
    },
  },
});

export const {
  toggleDarkMode,
  setLangMenuOpen,
  setLegalMenuOpen,
  setMobileMenuOpen,
  closeAllMenus,
} = uiSlice.actions;

export default uiSlice.reducer;
