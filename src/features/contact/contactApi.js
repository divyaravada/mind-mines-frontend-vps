// src/features/contact/contactApi.js
// RTK Query endpoints for the "Contact us" form
import { api } from "../../services/apiSlice";

export const contactApi = api.injectEndpoints({
  endpoints: (build) => ({
    sendContact: build.mutation({
      async queryFn(payload, _api, _extra, fetchWithBQ) {
        const res = await fetchWithBQ({
          url: "contact/",
          method: "POST",
          body: {
            name: payload.name,
            email: payload.email,
            message: payload.message,
          },
        });
        if (res.error) return { error: res.error };
        return { data: { ok: true, ...(res.data || {}) } };
      },
    }),
  }),
});

export const { useSendContactMutation } = contactApi;
