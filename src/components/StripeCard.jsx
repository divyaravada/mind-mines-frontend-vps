// src/components/StripeCard.jsx
import React, { useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = (() => {
  const pk = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";
  if (!pk) {
    console.warn(
      "REACT_APP_STRIPE_PUBLISHABLE_KEY is empty. Stripe will not initialize."
    );
    return null;
  }
  return loadStripe(pk);
})();

function CardForm({
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  form,
  total,
  couponCode,
  couponInfo,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const localOrderIdRef = useRef(null);

  const totalLabel = useMemo(() => {
    const n = Number.isFinite(total) ? total : 0;
    try {
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(n);
    } catch {
      return `${n.toFixed(2)} €`;
    }
  }, [total]);

  const pay = async () => {
    setError("");
    if (!stripe || !elements) return;

    try {
      // 1) Ask backend to create local order + PaymentIntent
      const res = await http.post("payments/stripe/create-intent/", {
        items: lineItems,
        payment_method: "card",
        ...addressPayload,
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      });
      const clientSecret = res?.data?.clientSecret || "";
      const createdOrderId = res?.data?.order_id || null;

      if (!clientSecret) {
        throw new Error("Missing client secret from backend.");
      }
      localOrderIdRef.current = createdOrderId;
      if (setLocalOrderId) setLocalOrderId(createdOrderId);

      if (clientSecret.startsWith("seti_")) {
        // Defensive: wrong intent type
        console.warn(
          "Received a SetupIntent secret for a payment flow — backend should return a PaymentIntent."
        );
      }

      // 2) Confirm on client (handles 3DS automatically)
      const { paymentIntent, error: stripeErr } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: form?.fullName || "",
              email: form?.email || "",
              phone: form?.telephone || "",
              address: {
                line1: addressPayload?.address_line1 || "",
                postal_code: addressPayload?.postal_code || "",
                city: addressPayload?.city || "",
                country: (addressPayload?.country || "DE")
                  .slice(0, 2)
                  .toUpperCase(), // e.g., DE
              },
            },
          },
        });

      if (clientSecret?.startsWith("seti_")) {
        console.warn(
          "Received a SetupIntent secret for a payment flow — check your endpoint!"
        );
      }

      if (stripeErr) {
        setError(stripeErr.message || "Card confirmation failed.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // 3) (Optional) finalize on the server if you added a finalize endpoint
        try {
          await http.post("payments/stripe/finalize/", {
            order_id: localOrderIdRef.current,
            payment_intent_id: paymentIntent.id,
          });
        } catch {
          console.log(error);
        }

        // 4) Let parent know
        if (onSuccess) onSuccess(localOrderIdRef.current);
      } else {
        throw new Error(
          `Payment not completed. Status: ${paymentIntent?.status || "unknown"}`
        );
      }
    } catch (e) {
      setError(e?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button
        onClick={pay}
        disabled={loading || !stripe}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing..." : `Pay ${totalLabel}`}
      </button>
    </div>
  );
}

export default function StripeCard({
  active,
  setActive,
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  form,
  total,
}) {
  if (!active)
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input type="radio" name="payment" value="card" onChange={setActive} />
        <span className="flex-1">Credit Card (Stripe)</span>
        <span className="text-xs">Secure — 3D Secure</span>
      </label>
    );
  if (!stripePromise) {
    return (
      <>
        <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
          <input type="radio" name="payment" value="card" checked readOnly />
          <span className="flex-1">Credit / Debit Card (Stripe)</span>
          <span className="text-xs">Secure — 3D Secure</span>
        </label>
        <div className="border rounded p-3 text-red-600 text-sm">
          Stripe publishable key is missing. Set
          <code> REACT_APP_STRIPE_PUBLISHABLE_KEY</code> and rebuild.
        </div>
      </>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="card"
          checked
          onChange={() => {}}
        />
        <span className="flex-1">Credit Card (Stripe)</span>
        <span className="text-xs">Secure — 3D Secure</span>
      </label>
      <div className="border rounded p-3">
        <Elements stripe={stripePromise} options={{ locale: "de" }}>
          <CardForm
            lineItems={lineItems}
            addressPayload={addressPayload}
            setLocalOrderId={setLocalOrderId}
            onSuccess={onSuccess}
            form={form}
            total={total}
          />
        </Elements>
      </div>
    </>
  );
}
