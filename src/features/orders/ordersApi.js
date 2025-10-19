// src/features/orders/ordersApi.js
import { api } from "../../services/apiSlice";

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({
      query: () => "dashboard/orders/",
      transformResponse: (res) =>
        Array.isArray(res) ? res : res?.results ?? [],
      providesTags: (list) =>
        Array.isArray(list)
          ? [
              ...list.map((o) => ({ type: "Orders", id: o.id })),
              { type: "Orders", id: "LIST" },
            ]
          : [{ type: "Orders", id: "LIST" }],
    }),
    getOrder: build.query({
      query: (id) => `dashboard/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Orders", id }],
    }),
    guestLookup: build.mutation({
      query: ({ email, number }) => ({
        url: "guest-lookup/",
        method: "POST",
        data: { email, number },
      }),
      transformResponse: (res) => res, // shape already fine
    }),
  }),
});

export const { useGetOrdersQuery, useGetOrderQuery, useGuestLookupMutation } =
  ordersApi;
