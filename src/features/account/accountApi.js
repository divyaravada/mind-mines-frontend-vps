// src/features/account/accountApi.js
import { api } from "../../services/apiSlice";

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAccount: build.query({
      query: () => "dashboard/account/",
      providesTags: ["Account"],
      transformResponse: (res) => res,
    }),
    updateAccount: build.mutation({
      // expects a FormData (for avatar upload)
      query: (formData) => ({
        url: "dashboard/account/",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Account"],
    }),
    requestDeletion: build.mutation({
      query: ({ reason }) => ({
        url: "dashboard/account/delete-request/",
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
