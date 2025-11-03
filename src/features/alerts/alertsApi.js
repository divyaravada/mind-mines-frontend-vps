import { api } from "../../services/apiSlice";

export const alertsApi = api.injectEndpoints({
  endpoints: (build) => ({
    unsubscribeStockAlert: build.mutation({
      async queryFn(token, _api, _extra, fetchWithBQ) {
        const path = `stock-alerts/unsubscribe/${encodeURIComponent(token)}/`;

        // try POST first (some backends prefer it)
        let res = await fetchWithBQ({ url: path, method: "POST" });

        // fallback to GET for your current backend
        if (
          res.error &&
          (res.error.status === 405 || res.error.status === 404)
        ) {
          res = await fetchWithBQ({ url: path, method: "GET" });
        }
        if (res.error) return { error: res.error };

        const raw = res.data || {};
        const unsubscribed = Boolean(
          raw.unsubscribed ??
            raw.ok ??
            raw.success ??
            raw.inactive ??
            raw.deactivated
        );
        return { data: { unsubscribed } };
      },
    }),
  }),
});

export const { useUnsubscribeStockAlertMutation } = alertsApi;
