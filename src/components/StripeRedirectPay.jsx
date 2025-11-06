// src/components/StripeRedirectPay.jsx
import React, { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useStripeCreateRedirectIntentMutation } from "../features/payments/paymentsApi";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function Inner({
  orderId,
  method,
  orderPayload,
  onSuccess,
  onError,
  returnUrl,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setConfirming(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    setConfirming(false);

    if (error) {
      onError?.(error.message || "Payment failed.");
      return;
    }
    // Usually a redirect follows; if not, fall back:
    onSuccess?.(orderId);
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <PaymentElement />
      </div>
      <button
        type="button"
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        onClick={onPay}
        disabled={!stripe || !elements || confirming}
      >
        {confirming
          ? "Redirecting…"
          : `Pay with ${method === "klarna" ? "Klarna" : "giropay"}`}
      </button>
      <p className="text-xs text-gray-500">
        You’ll be redirected to {method === "klarna" ? "Klarna" : "your bank"}{" "}
        to complete the payment.
      </p>
    </div>
  );
}

export default function StripeRedirectPay({
  orderId,
  method,
  orderPayload,
  onSuccess,
  onError,
}) {
  const [createPI, { isLoading }] = useStripeCreateRedirectIntentMutation();
  const [clientSecret, setClientSecret] = useState("");
  const [effectiveOrderId, setEffectiveOrderId] = useState(orderId || null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // If we already have orderId, use it; else send full payload (JIT create)
        const base = { method };
        const body = effectiveOrderId
          ? { ...base, order_id: effectiveOrderId }
          : { ...base, ...orderPayload }; // must include email, items, shipping, coupon etc.

        const res = await createPI(body).unwrap();
        if (!mounted) return;

        setClientSecret(res.client_secret || res.clientSecret);
        if (!effectiveOrderId) setEffectiveOrderId(res.order_id);
      } catch (e) {
        const msg = e?.data?.detail || e?.error || "Failed to init payment.";
        onError?.(msg);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [method]);

  if (isLoading || !clientSecret) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-gray-600">
        Preparing {method}…
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/checkout/return`;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" }, locale: "de" }}
    >
      <Inner
        orderId={effectiveOrderId}
        method={method}
        orderPayload={orderPayload}
        onSuccess={onSuccess}
        onError={onError}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
