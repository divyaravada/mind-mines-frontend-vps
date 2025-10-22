import { api } from "./apiSlice";

export const addressesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listAddresses: build.query({
      query: () => "addresses/",
      transformResponse: (res) => res.results ?? res,
      providesTags: (result) =>
        result
          ? [
              ...result.map((a) => ({ type: "Addresses", id: a.id })),
              { type: "Addresses", id: "LIST" },
            ]
          : [{ type: "Addresses", id: "LIST" }],
    }),
    createAddress: build.mutation({
      query: (body) => ({ url: "addresses/", method: "POST", body }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
    updateAddress: build.mutation({
      query: ({ id, ...body }) => ({
        url: `addresses/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "Addresses", id }],
    }),
    patchAddress: build.mutation({
      query: ({ id, ...body }) => ({
        url: `addresses/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "Addresses", id }],
    }),
    deleteAddress: build.mutation({
      query: (id) => ({ url: `addresses/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
  }),
});

export const {
  useListAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  usePatchAddressMutation,
  useDeleteAddressMutation,
} = addressesApi;
