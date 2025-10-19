// src/features/i18n/i18nSlice.js
import { createSlice } from "@reduxjs/toolkit";
import i18n from "../../i18n";

const initialLang =
  (typeof localStorage !== "undefined" && localStorage.getItem("lang")) ||
  (navigator?.language?.startsWith("de") ? "de" : "en");

const i18nSlice = createSlice({
  name: "i18n",
  initialState: { lang: initialLang },
  reducers: {
    setLanguage(state, action) {
      state.lang = action.payload || "en";
      try {
        localStorage.setItem("lang", state.lang);
      } catch {}
      i18n.changeLanguage(state.lang); // keep it unified through Redux
    },
  },
});

export const { setLanguage } = i18nSlice.actions;
export default i18nSlice.reducer;
