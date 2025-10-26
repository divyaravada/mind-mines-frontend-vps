// src/features/payments/paymentsApi.js
import { api } from "../../services/apiSlice";

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ---------- PayPal ----------
    paypalCreateOrder: build.mutation({
      query: (payload) => ({
        url: "paypal/create-order/",
        method: "POST",
        body: payload, // e.g. { cart, shipping, ... }
      }),
    }),
    paypalCaptureOrder: build.mutation({
      query: (orderId) => ({
        url: `paypal/capture/${encodeURIComponent(orderId)}/`,
        method: "POST",
        body: {}, // or pass anything required by the view
      }),
    }),

    // ---------- Stripe ----------
    stripeCreateIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/",
        method: "POST",
        body: payload, // { amount, currency, cart, ... }
      }),
    }),
    stripeCreateCardSetupIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/setup-intent/card/",
        method: "POST",
        body: payload || {},
      }),
    }),
    stripeCreateSepaSetupIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/setup-intent/sepa/",
        method: "POST",
        body: payload || {},
      }),
    }),
    stripeCreateSepaIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/sepa/",
        method: "POST",
        body: payload,
      }),
    }),
    stripeSepaCreateInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/sepa/",
        method: "POST",
        body: payload, // { order_id, months, mandate, ... }
      }),
    }),
    stripeCardCreateInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/card/",
        method: "POST",
        body: payload, // { months, method: 'card', payment_method_id, items, ...address, coupon_code? }
      }),
    }),

    // Webhook is server-side only; no frontend endpoint.

    // ---------- Bank transfer ----------
    bankTransferCreateOrder: build.mutation({
      query: (payload) => ({
        url: "bank-transfer/create-order/",
        method: "POST",
        body: payload, // e.g. { cart, address, ... }
      }),
    }),
  }),
});

export const {
  usePaypalCreateOrderMutation,
  usePaypalCaptureOrderMutation,
  useStripeCreateIntentMutation,
  useStripeCreateCardSetupIntentMutation,
  useStripeCreateSepaSetupIntentMutation,
  useStripeCreateSepaIntentMutation,
  useStripeSepaCreateInstallmentsMutation,
  useStripeCardCreateInstallmentsMutation,
  useBankTransferCreateOrderMutation,
} = paymentsApi;
