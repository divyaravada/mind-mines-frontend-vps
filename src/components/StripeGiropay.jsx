import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useStripe, Elements } from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");

function InnerGiropay({ lineItems, addressPayload, couponCode, couponInfo, form, onSuccess, setLocalOrderId }) {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const startGiropay = async () => {
    setErr("");
    if (!stripe) return;

    try {
      setLoading(true);

      // 1) Ask backend to make local order + PaymentIntent
      const res = await http.post("payments/stripe/giropay/create-intent/", {
        items: lineItems,
        payment_method: "giropay",
        ...addressPayload,
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      });

      const clientSecret = res?.data?.clientSecret;
      const orderId = res?.data?.order_id;
      if (!clientSecret) throw new Error("Missing client secret");

      setLocalOrderId?.(orderId);

      // 2) Confirm giropay: this redirects user to their bank
      const { error } = await stripe.confirmGiropayPayment(clientSecret, {
        payment_method: {
          billing_details: {
            name: form?.fullName || "",
            email: form?.email || "",
          },
        },
        return_url: `${window.location.origin}/checkout/success?order=${orderId}`,
      });

      if (error) {
        // If we get an immediate error before redirect
        throw error;
      }
      // On success, Stripe will redirect → we land on /checkout/success
    } catch (e) {
      setErr(e?.message || "Giropay payment failed.");
      setLoading(false);
    }
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <p className="text-sm text-gray-600">
        Pay via giropay (redirect to your bank). You must have a German bank account.
      </p>
      {err && <div className="text-red-600 text-sm">{String(err)}</div>}
      <button
        onClick={startGiropay}
        disabled={loading || !stripe}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Pay with giropay"}
      </button>
    </div>
  );
}

export default function StripeGiropay(props) {
  const stripeProps = {
    ...props,
  };
  return (
    <Elements stripe={stripePromise} options={{ locale: "de" }}>
      <InnerGiropay {...stripeProps} />
    </Elements>
  );
}
