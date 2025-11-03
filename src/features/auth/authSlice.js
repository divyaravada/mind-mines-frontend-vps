import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const LS_KEY = "authTokens";

const safeDecode = (token) => {
  try {
    return token ? jwtDecode(token) : null;
  } catch {
    return null;
  }
};

const loadInitialTokens = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw);
    return { access: parsed.access || null, refresh: parsed.refresh || null };
  } catch {
    return { access: null, refresh: null };
  }
};

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
      if (access) {
        state.access = access;
        state.user = safeDecode(access);
      }
      if (refresh !== undefined) state.refresh = refresh ?? null;
      try {
        const prev = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        const next = {
          ...prev,
          ...(refresh !== undefined ? { refresh } : {}),
          ...(access ? { access } : {}),
        };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    logout: (state) => {
      state.access = null;
      state.refresh = null;
      state.user = null;
      localStorage.removeItem(LS_KEY);
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

export const selectAccessToken = (s) => s.auth?.access || null;
export const selectRefreshToken = (s) => s.auth?.refresh || null;
export const selectUser = (s) => s.auth?.user || null;
export const selectIsAuthenticated = (s) => Boolean(s.auth?.access);

export default authSlice.reducer;
