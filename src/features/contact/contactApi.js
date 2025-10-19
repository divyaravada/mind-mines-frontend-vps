// src/features/contact/contactApi.js
// RTK Query endpoints for the "Contact us" form
import { api } from "../../services/apiSlice";

export const contactApi = api.injectEndpoints({
  endpoints: (build) => ({
    sendContact: build.mutation({
      query: ({ name, email, message }) => ({
        url: "contact/",
        method: "POST",
        body: { name, email, message },
      }),
    }),
  }),
});

export const { useSendContactMutation } = contactApi;
