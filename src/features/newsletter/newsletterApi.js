import { api } from "../../services/apiSlice";

export const newsletterApi = api.injectEndpoints({
  endpoints: (build) => ({
    subscribeNewsletter: build.mutation({
      query: ({ email, language }) => ({
        url: "newsletter/subscribe/",
        method: "POST",
        body: { email, language },
      }),
      invalidatesTags: [{ type: "Newsletter", id: "LIST" }],
    }),
  }),
});

export const { useSubscribeNewsletterMutation } = newsletterApi;
