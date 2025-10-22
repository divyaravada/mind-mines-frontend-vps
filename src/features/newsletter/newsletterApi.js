// src/features/newsletter/newsletterApi.js
import { api } from "../../services/apiSlice";

export const newsletterApi = api.injectEndpoints({
  endpoints: (build) => ({
    subscribeNewsletter: build.mutation({
      query: (email) => ({
        url: "newsletter/subscribe/",
        method: "POST",
        body: { email },
      }),
      invalidatesTags: [{ type: "Newsletter", id: "LIST" }],
    }),
  }),
});

export const { useSubscribeNewsletterMutation } = newsletterApi;
