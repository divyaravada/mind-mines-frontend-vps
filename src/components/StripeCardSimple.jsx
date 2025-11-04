// src/components/StripeCardSimple.jsx
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function PayForm({ orderId, billing, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const confirm = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/return`,
        payment_method_data: {
          billing_details: {
            name: billing.name || undefined,
            email: billing.email || undefined,
            address: {
              line1: billing.line1 || undefined,
              line2: billing.line2 || undefined,
              postal_code: billing.postal_code || undefined,
              city: billing.city || undefined,
              country: billing.country || undefined,
            },
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || "Payment failed.");
      setProcessing(false);
      return;
    }

    // ping backend (webhook is still source of truth)
    if (paymentIntent && orderId) {
      fetch(`/api/orders/${orderId}/payment-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          intent_id: paymentIntent.id,
          payment_status: paymentIntent.status,
        }),
      }).catch(() => {});
    }

    onSuccess?.(orderId);
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
        onClick={confirm}
        disabled={!stripe || !elements || processing}
      >
        {processing ? "Processing…" : "Pay securely"}
      </button>
    </div>
  );
}

export default function StripeCardSimple({ orderPayload, onSuccess }) {
  // 🧠 Hooks must be at top-level, always called
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  const billing = useMemo(() => {
    const s = orderPayload?.shipping || {};
    return {
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
      email: orderPayload?.email || "",
      line1: s.line1 || "",
      line2: s.line2 || "",
      postal_code: s.postal_code || "",
      city: s.city || "",
      country: (s.country || "DE").toUpperCase(),
    };
  }, [orderPayload]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      // If payload incomplete, clear state and exit gracefully
      if (
        !orderPayload?.email ||
        !Array.isArray(orderPayload?.items) ||
        orderPayload.items.length === 0 ||
        !orderPayload?.shipping
      ) {
        setClientSecret("");
        setOrderId(null);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/stripe/create-intent/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: orderPayload.email,
            payment_method: "card",
            items: orderPayload.items,
            shipping: orderPayload.shipping,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Init failed");
        if (active) {
          setClientSecret(data.clientSecret);
          setOrderId(data.order_id);
        }
      } catch (e) {
        console.error(e);
        if (active) {
          setClientSecret("");
          setOrderId(null);
        }
        alert(e.message || "Failed to initialize payment.");
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [orderPayload]);

  // Render states (no hooks below this point)
  if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    return <div className="text-red-600">Missing Stripe publishable key.</div>;
  }
  if (loading) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-gray-600">
        Initializing…
      </div>
    );
  }
  if (!clientSecret) {
    // No form until we have a clientSecret
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm orderId={orderId} billing={billing} onSuccess={onSuccess} />
    </Elements>
  );
}
