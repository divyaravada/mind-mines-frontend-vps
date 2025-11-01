// src/features/orders/ordersApi.js
import { api } from "../../services/apiSlice";

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({
      query: () => "orders/",
      transformResponse: (res) =>
        Array.isArray(res) ? res : res?.results ?? [],
      providesTags: (list) =>
        list?.length
          ? [
              ...list.map((o) => ({ type: "Orders", id: o.id })),
              { type: "Orders", id: "LIST" },
            ]
          : [{ type: "Orders", id: "LIST" }],
    }),

    getOrder: build.query({
      query: (id) => `orders/${id}/`,
      providesTags: (_res, _err, id) => [{ type: "Orders", id }],
    }),

    requestCancel: build.mutation({
      query: ({ id, message }) => ({
        url: `orders/${id}/cancel-request/`,
        method: "POST",
        body: { message: message || "" },
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
      ],
    }),

    requestReturn: build.mutation({
      query: ({ id, message, files }) => {
        const fd = new FormData();
        fd.append("message", message || "");
        (files || []).forEach((f) => fd.append("files", f));
        return {
          url: `orders/${id}/request-return/`,
          method: "POST",
          body: fd,
        };
      },
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Orders", id },
        { type: "Orders", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useRequestCancelMutation,
  useRequestReturnMutation,
} = ordersApi;
