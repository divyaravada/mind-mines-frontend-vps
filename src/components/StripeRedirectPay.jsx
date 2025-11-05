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

function Inner({ orderId, method, onSuccess, onError, returnUrl }) {
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
    // For redirect methods, user will likely be redirected; if not, try success.
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
      {method === "klarna" && (
        <p className="text-xs text-gray-500">
          You’ll be redirected to Klarna to complete the payment.
        </p>
      )}
      {method === "giropay" && (
        <p className="text-xs text-gray-500">
          You’ll be redirected to your bank to complete the payment.
        </p>
      )}
    </div>
  );
}

export default function StripeRedirectPay({
  orderId,
  method,
  onSuccess,
  onError,
}) {
  const [createPI, { isLoading }] = useStripeCreateRedirectIntentMutation();
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await createPI({ order_id: orderId, method }).unwrap();
        if (mounted) setClientSecret(res.client_secret || res.clientSecret);
      } catch (e) {
        const msg = e?.data?.detail || e?.error || "Failed to init payment.";
        onError?.(msg);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, method, createPI, onError]);

  if (isLoading || !clientSecret) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-gray-600">
        Preparing {method}…
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/checkout/return`; // ensure this route exists

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
        locale: "de", // or based on i18n
      }}
    >
      <Inner
        orderId={orderId}
        method={method}
        onSuccess={onSuccess}
        onError={onError}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
