// src/app/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import uiReducer from "../features/ui/uiSlice";
import i18nReducer from "../features/i18n/i18nSlice";
import cartReducer from "../features/cart/cartSlice";
import cookiesReducer from "../features/cookies/cookieSlice";
import { api } from "../services/apiSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    ui: uiReducer,
    i18n: i18nReducer,
    cart: cartReducer,
    cookies: cookiesReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: false,
    }).concat(api.middleware),
  devTools: process.env.NODE_ENV !== "production",
});
