import { api } from "../../services/apiSlice";

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    stripeCreateIntent: build.mutation({
      query: (body) => ({
        url: "stripe/create-intent/",
        method: "POST",
        body,
      }),
    }),
    stripeCreateSetupIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/setup-intent/",
        method: "POST",
        body: payload, // { email?: string }
      }),
    }),
    stripeCardInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/card/",
        method: "POST",
        body: payload,
      }),
    }),
    stripeCreateSepaIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/sepa/",
        method: "POST",
        body: payload,
      }),
    }),
    stripeSepaInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/sepa/",
        method: "POST",
        body: payload,
      }),
    }),
    sepaPostConfirm: build.mutation({
      query: ({ order_id, payment_intent_status }) => ({
        url: "payments/sepa-post-confirm/",
        method: "POST",
        body: { order_id, payment_intent_status },
      }),
    }),
    paypalCreateOrder: build.mutation({
      query: (payload) => ({
        url: "paypal/create-order/",
        method: "POST",
        body: payload,
      }),
    }),
    paypalCaptureOrder: build.mutation({
      query: ({ paypalOrderId, localOrderId }) => ({
        url: `paypal/capture/${encodeURIComponent(paypalOrderId)}/`,
        method: "POST",
        body: { local_order_id: localOrderId },
      }),
    }),
    stripeCreateRedirectIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/redirect/",
        method: "POST",
        body: payload, // { order_id, method: "klarna" | "giropay" }
      }),
    }),
  }),
});

export const {
  useStripeCreateIntentMutation,
  useStripeCreateSetupIntentMutation,
  useStripeCardInstallmentsMutation,
  useStripeCreateSepaIntentMutation,
  useStripeSepaInstallmentsMutation,
  useSepaPostConfirmMutation,
  usePaypalCreateOrderMutation,
  usePaypalCaptureOrderMutation,
  useStripeCreateRedirectIntentMutation,
} = paymentsApi;
