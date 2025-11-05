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
    createOrder: build.mutation({
      query: (payload) => ({
        url: "orders/create/",
        method: "POST",
        body: payload,
      }),
      // After a create, the list may be stale (for authed users)
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
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
    updatePaymentStatus: build.mutation({
      query: ({ id, intent_id, payment_status }) => ({
        url: `orders/${id}/payment-status/`,
        method: "POST",
        body: { intent_id, payment_status },
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "Orders", id }],
    }),
    getOrderPublic: build.query({
      query: (id) => `orders/public/${id}/`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useRequestCancelMutation,
  useRequestReturnMutation,
  useUpdatePaymentStatusMutation,
  useGetOrderPublicQuery,
} = ordersApi;
