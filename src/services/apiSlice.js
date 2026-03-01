import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE } from "./config";
import { isPrerender } from "../utils/isPrerender";

// tiny in-memory gate so multiple 401s don't stampede the refresh endpoint
let refreshPromise = null;

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

const baseQueryWithReauth = async (args, api, extra) => {
  if (isPrerender) {
    return { data: null };
  }
  // First try normally
  let result = await rawBaseQuery(args, api, extra);

  if (result?.error?.status !== 401) return result;

  // No refresh token → log out and return
  const refreshToken = api.getState()?.auth?.refresh;
  if (!refreshToken) {
    api.dispatch({ type: "auth/logout" });
    return result;
  }

  // Only one refresh request at a time
  if (!refreshPromise) {
    refreshPromise = bareBaseQuery(
      {
        url: "token/refresh/",
        method: "POST",
        body: { refresh: refreshToken },
      },
      api,
      extra,
    ).finally(() => {
      refreshPromise = null;
    });
  }

  const refreshRes = await refreshPromise;

  if (refreshRes?.data?.access) {
    api.dispatch({
      type: "auth/setCredentials",
      payload: { access: refreshRes.data.access, refresh: refreshToken },
    });
    // Retry original request with new access token
    result = await rawBaseQuery(args, api, extra);
  } else {
    // hard logout if refresh fails or is invalid
    api.dispatch({ type: "auth/logout" });
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
    "Cart",
    "Products",
    "Reviews",
    "Wishlist",
    "Orders",
    "Promos",
    "Newsletter",
  ],
  endpoints: () => ({}),
});
