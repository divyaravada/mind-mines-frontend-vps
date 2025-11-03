import { createSlice } from "@reduxjs/toolkit";

const prefersDark =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

function getInitialDark() {
  try {
    const ls =
      typeof localStorage !== "undefined" && localStorage.getItem("theme");
    if (ls === "dark") return true;
    if (ls === "light") return false;
  } catch {}
  // if <html class="dark"> is already applied (SSR/tailwind)
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  )
    return true;
  return !!prefersDark;
}

function applyDarkClass(enabled) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", !!enabled);
}

const initialDark = getInitialDark();
applyDarkClass(initialDark);

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
      applyDarkClass(state.darkMode);
      try {
        localStorage.setItem("theme", state.darkMode ? "dark" : "light");
      } catch {}
    },
    setLangMenuOpen(state, action) {
      state.langMenuOpen = !!action.payload;
    },
    setLegalMenuOpen(state, action) {
      state.legalMenuOpen = !!action.payload;
    },
    setMobileMenuOpen(state, action) {
      state.mobileMenuOpen = !!action.payload;
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
