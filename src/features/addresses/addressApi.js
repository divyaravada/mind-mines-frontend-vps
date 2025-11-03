import { api } from "../../services/apiSlice";

const toArray = (res) =>
  Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];

export const addressApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query({
      query: () => "addresses/",
      transformResponse: toArray,
      providesTags: (list) =>
        list?.length
          ? [
              ...list.map((a) => ({ type: "Addresses", id: a.id })),
              { type: "Addresses", id: "LIST" },
            ]
          : [{ type: "Addresses", id: "LIST" }],
    }),
    createAddress: build.mutation({
      query: (payload) => ({
        url: "addresses/",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
    updateAddress: build.mutation({
      query: ({ id, ...payload }) => ({
        url: `addresses/${id}/`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Addresses", id },
        { type: "Addresses", id: "LIST" },
      ],
    }),
    patchAddress: build.mutation({
      query: ({ id, ...payload }) => ({
        url: `addresses/${id}/`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Addresses", id },
        { type: "Addresses", id: "LIST" },
      ],
    }),
    deleteAddress: build.mutation({
      query: (id) => ({
        url: `addresses/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
    makeDefaultAddress: build.mutation({
      query: (id) => ({
        url: `addresses/${id}/set-default/`,
        method: "POST",
        body: {},
      }),
      invalidatesTags: [{ type: "Addresses", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  usePatchAddressMutation,
  useDeleteAddressMutation,
  useMakeDefaultAddressMutation,
} = addressApi;
