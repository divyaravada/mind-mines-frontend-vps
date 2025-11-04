// components/StripeCardSimple.jsx
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

function PayForm({ clientSecret, orderId, billing, onSuccess }) {
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

    // Echo to backend (optional; webhook is source of truth)
    if (paymentIntent) {
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

    onSuccess?.();
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && (
        <div className="text-sm text-red-600 whitespace-pre-wrap">
          {errorMsg}
        </div>
      )}
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
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const billing = useMemo(() => {
    const s = orderPayload?.shipping || {};
    return {
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
      email: (orderPayload?.email || "").trim(),
      line1: (s.line1 || "").trim(),
      line2: (s.line2 || "").trim(),
      postal_code: (s.postal_code || "").trim(),
      city: (s.city || "").trim(),
      country: (s.country || "DE").toUpperCase(),
    };
  }, [orderPayload]);

  // FRONTEND validation before calling backend
  const missing = useMemo(() => {
    const req = [];
    if (!billing.email) req.push("email");
    if (!billing.line1) req.push("shipping.line1");
    if (!billing.postal_code) req.push("shipping.postal_code");
    if (!billing.city) req.push("shipping.city");
    if (!billing.country) req.push("shipping.country");
    const s = orderPayload?.shipping || {};
    if (!s.first_name) req.push("shipping.first_name");
    if (!s.last_name) req.push("shipping.last_name");
    if (
      !Array.isArray(orderPayload?.items) ||
      orderPayload.items.length === 0
    ) {
      req.push("items");
    }
    return req;
  }, [billing, orderPayload]);

  useEffect(() => {
    let active = true;

    // Don’t hit backend until required fields are present
    if (missing.length > 0) {
      setClientSecret("");
      setOrderId(null);
      setLocalError(`Please fill required fields:\n• ${missing.join("\n• ")}`);
      return () => {
        active = false;
      };
    }

    setLocalError("");
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/stripe/create-intent/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: orderPayload.email,
            payment_method: orderPayload.payment_method || "card",
            coupon_code: orderPayload.coupon_code || "",
            idempotency_key: orderPayload.idempotency_key || "",
            items: orderPayload.items,
            shipping: orderPayload.shipping,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Show DRF field errors clearly
          let msg = data?.detail || "Init failed";
          if (data?.errors && typeof data.errors === "object") {
            const lines = [];
            const flatten = (obj, prefix = "") => {
              Object.entries(obj).forEach(([k, v]) => {
                const key = prefix ? `${prefix}.${k}` : k;
                if (Array.isArray(v)) lines.push(`${key}: ${v.join(", ")}`);
                else if (v && typeof v === "object") flatten(v, key);
                else lines.push(`${key}: ${String(v)}`);
              });
            };
            flatten(data.errors);
            if (lines.length) msg += `\n\n${lines.join("\n")}`;
          }
          throw new Error(msg);
        }

        if (active) {
          setClientSecret(
            data.clientSecret ||
              data.client_secret ||
              data?.data?.clientSecret ||
              data?.data?.client_secret ||
              ""
          );
          setOrderId(data.order_id || data?.data?.order_id || null);
        }
      } catch (e) {
        console.error("Stripe init error — response:", e);
        if (active) {
          setClientSecret("");
          setOrderId(null);
          setLocalError(e?.message || "Failed to initialize payment.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [orderPayload, missing]);

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
  if (localError) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-amber-700 bg-amber-50 whitespace-pre-wrap">
        {localError}
      </div>
    );
  }
  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm
        clientSecret={clientSecret}
        orderId={orderId}
        billing={billing}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
