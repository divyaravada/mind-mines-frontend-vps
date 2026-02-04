import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  injectGTM,
  removeGTM,
  deleteAnalyticsCookies,
  setGtagConsent,
} from "../../utils/gtm";

const KEY = "mm_cookie_consent_v1";
const GTM_ID = process.env.REACT_APP_GTM_ID;

const defaultConsent = {
  essential: true,
  analytics: false,
  marketing: false,
  decided: false,
};

const initialState = { open: false, consent: { ...defaultConsent } };

export const initConsent = createAsyncThunk("cookies/init", async () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw)
      return { open: true, consent: { ...defaultConsent, decided: false } };
    const parsed = JSON.parse(raw);
    const safe = {
      essential: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      decided: !!parsed.decided,
    };
    if (typeof window !== "undefined") {
      window.__mmAnalyticsConsent = safe.analytics;
    }
    setGtagConsent({ analytics: safe.analytics, marketing: safe.marketing });
    if (safe.decided && safe.analytics) injectGTM(GTM_ID);
    return { open: false, consent: safe };
  } catch {
    return { open: true, consent: { ...defaultConsent, decided: false } };
  }
});

export const saveConsent = createAsyncThunk("cookies/save", async (consent) => {
  const decided = {
    essential: true,
    analytics: !!consent.analytics,
    marketing: !!consent.marketing,
    decided: true,
  };

  // ✅ global guard for GA helpers
  if (typeof window !== "undefined") {
    window.__mmAnalyticsConsent = decided.analytics;
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(decided));
  } catch {}

  if (decided.analytics) {
    injectGTM(GTM_ID);
  } else {
    removeGTM();
    deleteAnalyticsCookies();
  }
  setGtagConsent({
    analytics: decided.analytics,
    marketing: decided.marketing,
  });
  return decided;
});

const cookiesSlice = createSlice({
  name: "cookies",
  initialState,
  reducers: {
    openManager(state) {
      state.open = true;
    },
    closeManager(state) {
      state.open = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(initConsent.fulfilled, (s, { payload }) => {
      s.open = payload.open;
      s.consent = payload.consent;
    }).addCase(saveConsent.fulfilled, (s, { payload }) => {
      s.consent = payload;
      s.open = false;
    });
  },
});

export const { openManager, closeManager } = cookiesSlice.actions;
export default cookiesSlice.reducer;
