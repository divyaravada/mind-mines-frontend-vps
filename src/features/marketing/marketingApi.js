// src/features/marketing/marketingApi.js
import { api } from "../../services/apiSlice";
import { getBaseTrackingFields } from "../../lib/session";

export const marketingApi = api.injectEndpoints({
  endpoints: (build) => ({
    trackEvent: build.mutation({
      query: (payload) => ({
        url: "marketing/track/",
        method: "POST",
        body: {
          ...getBaseTrackingFields(),
          ...payload,
        },
      }),
    }),
  }),
});

// Hook for components
export const { useTrackEventMutation } = marketingApi;
