// src/features/alerts/alertsApi.js
import { api } from "../../services/apiSlice";

export const alertsApi = api.injectEndpoints({
  endpoints: (build) => ({
    unsubscribeStockAlert: build.mutation({
      query: (token) => ({
        url: `stock-alerts/unsubscribe/${encodeURIComponent(token)}/`,
        method: "GET", // backend supports GET to deactivate
      }),
    }),
  }),
});

export const { useUnsubscribeStockAlertMutation } = alertsApi;
