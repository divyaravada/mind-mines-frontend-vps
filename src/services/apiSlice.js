// src/services/apiSlice.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// CRA-friendly env (no import.meta here)
const RAW = (
  process.env.REACT_APP_API_URL || "https://mindmines.eu/api"
).trim();
export const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

// Attach token
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.access;
    if (token) headers.set("authorization", `Bearer ${token}`);
    headers.set("accept", "application/json");
    return headers;
  },
});

const bareBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set("accept", "application/json");
    return headers;
  },
});

// Auto refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    const refreshToken = api.getState()?.auth?.refresh;
    if (!refreshToken) {
      api.dispatch({ type: "auth/logout" });
      return result;
    }
    const refresh = await bareBaseQuery(
      {
        url: "token/refresh/",
        method: "POST",
        body: { refresh: refreshToken },
      },
      api,
      extraOptions
    );
    if (refresh?.data?.access) {
      api.dispatch({
        type: "auth/setCredentials",
        payload: { access: refresh.data.access, refresh: refreshToken },
      });
      result = await rawBaseQuery(args, api, extraOptions); // retry
    } else {
      api.dispatch({ type: "auth/logout" });
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Account",
    "Addresses",
    "Stones",
    "Products",
    "Reviews",
    "Newsletter",
    "Wishlist",
    "Orders",
  ],
  endpoints: () => ({}),
});
