// src/features/addresses/addressApi.js
import { api } from "../../services/apiSlice";

export const addressApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query({
      query: () => "dashboard/addresses/",
      providesTags: (res) => {
        const list = res?.results ?? res ?? [];
        return Array.isArray(list)
          ? [
              ...list.map((a) => ({ type: "Addresses", id: a.id })),
              { type: "Addresses", id: "LIST" },
            ]
          : [{ type: "Addresses", id: "LIST" }];
      },
      transformResponse: (res) => res?.results ?? res ?? [],
    }),
    createAddress: build.mutation({
      query: (payload) => ({
        url: "dashboard/addresses/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
    updateAddress: build.mutation({
      query: ({ id, ...payload }) => ({
        url: `dashboard/addresses/${id}/`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Addresses", id: arg.id },
        { type: "Addresses", id: "LIST" },
      ],
    }),
    deleteAddress: build.mutation({
      query: (id) => ({
        url: `dashboard/addresses/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Addresses", id },
        { type: "Addresses", id: "LIST" },
      ],
    }),
    makeDefaultAddress: build.mutation({
      query: (id) => ({
        url: `dashboard/addresses/${id}/`,
        method: "PATCH",
        body: { is_default: true },
      }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useMakeDefaultAddressMutation,
} = addressApi;
