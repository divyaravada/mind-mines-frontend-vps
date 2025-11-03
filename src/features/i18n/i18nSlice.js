import { createSlice } from "@reduxjs/toolkit";
import i18n from "../../i18n";

function getInitialLang() {
  try {
    const ls =
      typeof localStorage !== "undefined" && localStorage.getItem("lang");
    if (ls) return ls;
  } catch {}
  const nav =
    typeof navigator !== "undefined"
      ? navigator.language || navigator.userLanguage
      : "en";
  return String(nav).toLowerCase().startsWith("de") ? "de" : "en";
}

const initialLang = getInitialLang();

const i18nSlice = createSlice({
  name: "i18n",
  initialState: { lang: initialLang },
  reducers: {
    setLanguage(state, action) {
      const next = action.payload || "en";
      state.lang = next;

      // persist
      try {
        localStorage.setItem("lang", next);
      } catch {}

      // swap i18n
      i18n.changeLanguage(next);

      // keep <html lang="..."> synced for a11y/SEO
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", next);
      }
    },
  },
});

// one-time sync on module load (in case SSR set a different lang)
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("lang", initialLang);
}

export const { setLanguage } = i18nSlice.actions;
export default i18nSlice.reducer;
