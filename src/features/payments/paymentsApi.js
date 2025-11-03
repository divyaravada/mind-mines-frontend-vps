import { api } from "../../services/apiSlice";

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Stripe immediate: card / klarna / giropay / sofort
    stripeCreateIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/",
        method: "POST",
        body: payload,
      }),
    }),

    // Card installments (authenticated)
    stripeCardInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/card/",
        method: "POST",
        body: payload,
      }),
    }),

    // SEPA one-time
    stripeCreateSepaIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/sepa/",
        method: "POST",
        body: payload,
      }),
    }),

    // SEPA installments (authenticated, DE only)
    stripeSepaInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/sepa/",
        method: "POST",
        body: payload,
      }),
    }),

    // SEPA post confirm: tell backend "Stripe said processing"
    sepaPostConfirm: build.mutation({
      query: ({ order_id, payment_intent_status }) => ({
        url: "payments/sepa-post-confirm/",
        method: "POST",
        body: { order_id, payment_intent_status },
      }),
    }),

    // PayPal create (also covers PayPal Pay Later)
    paypalCreateOrder: build.mutation({
      query: (payload) => ({
        url: "paypal/create-order/",
        method: "POST",
        body: payload,
      }),
    }),

    // PayPal capture after approval
    paypalCaptureOrder: build.mutation({
      query: ({ paypalOrderId, localOrderId }) => ({
        url: `paypal/capture/${encodeURIComponent(paypalOrderId)}/`,
        method: "POST",
        body: { local_order_id: localOrderId },
      }),
    }),
  }),
});

export const {
  useStripeCreateIntentMutation,
  useStripeCardInstallmentsMutation,
  useStripeCreateSepaIntentMutation,
  useStripeSepaInstallmentsMutation,
  useSepaPostConfirmMutation,
  usePaypalCreateOrderMutation,
  usePaypalCaptureOrderMutation,
} = paymentsApi;
