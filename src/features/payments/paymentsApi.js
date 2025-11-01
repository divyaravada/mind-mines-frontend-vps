// src/features/payments/paymentsApi.js
import { api } from "../../services/apiSlice";

export const paymentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ---------- PayPal ----------
    // Body must include the same checkout data you’d send to Stripe:
    // {
    //   email,
    //   coupon_code,
    //   shipping: { first_name, last_name, line1, ... },
    //   items: [{ product_id, qty }, ...],
    //   payment_method: "paypal"
    // }
    paypalCreateOrder: build.mutation({
      query: (payload) => ({
        url: "paypal/create-order/",
        method: "POST",
        body: payload,
      }),
    }),

    // orderIds:
    //   paypalOrderId = PayPal's order.id
    //   localOrderId  = the order_id we got from paypalCreateOrder
    paypalCaptureOrder: build.mutation({
      query: ({ paypalOrderId, localOrderId }) => ({
        url: `paypal/capture/${encodeURIComponent(paypalOrderId)}/`,
        method: "POST",
        body: localOrderId ? { local_order_id: localOrderId } : {},
      }),
    }),

    // ---------- Stripe one-shot (card / klarna / giropay) ----------
    // payload shape same as paypalCreateOrder but with payment_method = "card" or "klarna" etc.
    // backend will override payment_method if Klarna/Giropay is actually used.
    stripeCreateIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/card",
        method: "POST",
        body: payload,
      }),
    }),

    // Save a card for later/off-session
    stripeCreateCardSetupIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/setup-intent/card/",
        method: "POST",
        body: payload || {},
      }),
    }),

    // Save SEPA mandate for later/off-session
    stripeCreateSepaSetupIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/setup-intent/sepa/",
        method: "POST",
        body: payload || {},
      }),
    }),

    // ---------- Stripe SEPA one-off ----------
    // same payload shape as stripeCreateIntent, but payment_method "sepa_debit"
    stripeCreateSepaIntent: build.mutation({
      query: (payload) => ({
        url: "stripe/create-intent/sepa/",
        method: "POST",
        body: payload,
      }),
    }),

    // Tell backend “Stripe confirmed SEPA, order is now processing”
    sepaPostConfirm: build.mutation({
      query: ({ order_id, payment_intent_status }) => ({
        url: "sepa/post-confirm/",
        method: "POST",
        body: {
          order_id,
          payment_intent_status,
        },
      }),
    }),

    // ---------- Stripe installments (SEPA in DE only) ----------
    // payload must include:
    // {
    //   months: 3|6|9,
    //   country: "DE",
    //   payment_method_id: "...", // saved SEPA PM
    //   email,
    //   items: [...],
    //   shipping: {...},
    //   coupon_code,
    //   payment_method: "sepa_debit"
    // }
    stripeSepaCreateInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/sepa/",
        method: "POST",
        body: payload,
      }),
    }),

    // ---------- Stripe installments (card) ----------
    // payload:
    // {
    //   months: 3|6|9,
    //   payment_method_id: "...", // saved card PM
    //   email,
    //   items: [...],
    //   shipping: {...},
    //   coupon_code,
    //   payment_method: "card_installments"
    // }
    stripeCardCreateInstallments: build.mutation({
      query: (payload) => ({
        url: "stripe/installments/card/",
        method: "POST",
        body: payload,
      }),
    }),
    updatePaymentStatus: build.mutation({
      query: ({ orderId, status }) => ({
        url: `orders/${orderId}/payment-status/`,
        method: "POST",
        body: { status }, // e.g. "paid", "processing", "failed"
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
  useSepaPostConfirmMutation,
  useStripeSepaCreateInstallmentsMutation,
  useStripeCardCreateInstallmentsMutation,
  useUpdatePaymentStatusMutation,
} = paymentsApi;
