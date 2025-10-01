import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function CardForm({
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  form,
  total,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setError("");
    if (!stripe || !elements) return;

    try {
      // 1) Ask backend to create local order + PaymentIntent
      const res = await http.post("payments/stripe/create-intent/", {
        items: lineItems,
        payment_method: "card",
        ...addressPayload,
      });
      const clientSecret = res.data.clientSecret;
      setLocalOrderId?.(res.data.order_id);

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
                country: (addressPayload?.country || "Germany")
                  .slice(0, 2)
                  .toUpperCase(), // e.g., DE
              },
            },
          },
        });

      if (stripeErr) {
        setError(stripeErr.message || "Card confirmation failed.");
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess?.(res.data.order_id);
      } else {
        setError(
          "Payment not completed. Status: " +
            (paymentIntent?.status || "unknown")
        );
      }
    } catch (e) {
      setError("Payment failed. Please try again.");
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
        {loading ? "Processing..." : `Pay ${total.toFixed(2)} €`}
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
