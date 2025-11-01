// src/features/auth/authSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

function safeDecode(token) {
  try {
    return token ? jwtDecode(token) : null;
  } catch {
    return null;
  }
}

function loadInitialTokens() {
  try {
    const raw = localStorage.getItem("authTokens");
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw);
    return {
      access: parsed.access || null,
      refresh: parsed.refresh || null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

const init = loadInitialTokens();

const initialState = {
  access: init.access,
  refresh: init.refresh,
  user: safeDecode(init.access),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { access, refresh } = action.payload || {};

      // Update Redux
      if (access) state.access = access;
      if (refresh) state.refresh = refresh ?? state.refresh;
      state.user = access ? safeDecode(access) : state.user;

      // Sync localStorage for axios/http and reload survival
      try {
        const prev = JSON.parse(localStorage.getItem("authTokens") || "{}");
        const next = {
          ...prev,
          ...(refresh !== undefined ? { refresh } : {}),
          ...(access !== undefined ? { access } : {}),
        };
        localStorage.setItem("authTokens", JSON.stringify(next));
      } catch {
        // if storage is blocked just ignore
      }
    },

    logout: (state) => {
      state.access = null;
      state.refresh = null;
      state.user = null;
      localStorage.removeItem("authTokens");
    },

    hydrateFromStorage: (state) => {
      const { access, refresh } = loadInitialTokens();
      state.access = access;
      state.refresh = refresh;
      state.user = safeDecode(access);
    },
  },
});

export const { setCredentials, logout, hydrateFromStorage } = authSlice.actions;

export const selectAccessToken = (state) => state.auth?.access || null;
export const selectRefreshToken = (state) => state.auth?.refresh || null;
export const selectUser = (state) => state.auth?.user || null;
export const selectIsAuthenticated = (state) => Boolean(state.auth?.access);

export default authSlice.reducer;
