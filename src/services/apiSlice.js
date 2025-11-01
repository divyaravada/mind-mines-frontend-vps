// src/services/apiSlice.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, setCredentials } from "../features/auth/authSlice";

// CRA-friendly env
const RAW = (
  process.env.REACT_APP_API_URL || "https://mindmines.eu/api"
).trim();
export const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

// --- base query that attaches Authorization header if we have access token ---
const authBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.access;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("accept", "application/json");
    return headers;
  },
});

// --- base query WITHOUT Authorization, for refresh flow ---
const anonBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set("accept", "application/json");
    return headers;
  },
});

// --- wrapper to auto-handle 401 and refresh ---
const baseQueryWithReauth = async (args, api, extraOptions) => {
  // 1. try original
  let result = await authBaseQuery(args, api, extraOptions);

  // 2. if 401 -> try refresh
  if (result?.error?.status === 401) {
    const refreshToken = api.getState()?.auth?.refresh;

    if (!refreshToken) {
      api.dispatch(logout());
      return result;
    }

    const refreshResult = await anonBaseQuery(
      {
        url: "token/refresh/",
        method: "POST",
        body: { refresh: refreshToken },
      },
      api,
      extraOptions
    );

    if (refreshResult?.data?.access) {
      // store new access token in Redux
      api.dispatch(
        setCredentials({
          access: refreshResult.data.access,
          refresh: refreshToken,
        })
      );

      // retry the original query with the new token
      result = await authBaseQuery(args, api, extraOptions);
    } else {
      // refresh also failed → force logout
      api.dispatch(logout());
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
