// src/features/account/accountApi.js
import { api } from "../../services/apiSlice";

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAccount: build.query({
      query: () => "users/account/",
      providesTags: ["Account"],
      transformResponse: (res) => res,
    }),
    updateAccount: build.mutation({
      // expects a FormData (for avatar upload)
      query: (formData) => ({
        url: "users/account/",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Account"],
    }),
    requestDeletion: build.mutation({
      query: ({ reason }) => ({
        url: "users/account/delete-request/",
        method: "POST",
        body: { reason },
      }),
    }),
  }),
});

export const {
  useGetAccountQuery,
  useUpdateAccountMutation,
  useRequestDeletionMutation,
} = accountApi;
