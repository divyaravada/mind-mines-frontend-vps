// src/components/StripeInstallments.jsx
import React, { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function InnerInstallments({
  months,
  orderPayload,     // { items, address_line1, ... , coupon_code }
  form,             // { fullName, email, ... }
  setLocalOrderId,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const total = useMemo(() => {
    // let backend be source of truth; this is just a label if you want
    // you can pass a "total" prop from Checkout if you prefer
    return null;
  }, []);

  const startInstallments = async () => {
    setErr("");
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      // 1) create SetupIntent (save mandate)
      const siRes = await http.post("payments/stripe/sepa/create-setup-intent/");
      const clientSecret = siRes?.data?.clientSecret;
      if (!clientSecret) throw new Error("Missing SetupIntent client secret");

      // 2) confirm mandate with IBAN + billing details
      const { setupIntent, error } = await stripe.confirmSepaDebitSetup(
        clientSecret,
        {
          payment_method: {
            sepa_debit: elements.getElement(IbanElement),
            billing_details: {
              name: form?.fullName || "",
              email: form?.email || "",
              address: {
                line1: orderPayload?.address_line1 || "",
                postal_code: orderPayload?.postal_code || "",
                city: orderPayload?.city || "",
                country: (orderPayload?.country || "DE").slice(0, 2).toUpperCase(),
              },
            },
          },
        }
      );
      if (error) throw error;

      const pmId = setupIntent?.payment_method;
      if (!pmId) throw new Error("Payment method not returned from Stripe.");

      // 3) start schedule on backend
      const createRes = await http.post(
        "payments/stripe/sepa/create-installments/",
        {
          ...orderPayload, // items, address, coupon_code
          months,
          payment_method_id: pmId,
        }
      );

      const orderId = createRes?.data?.order_id;
      if (orderId) setLocalOrderId?.(orderId);

      // status will be "processing"; webhook marks "paid" later
      onSuccess?.(orderId);
    } catch (e) {
      setErr(e?.message || "Failed to start SEPA installments.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <IbanElement options={{ supportedCountries: ["SEPA"] }} />
        <p className="text-xs text-gray-600 mt-2">
          By providing your IBAN and confirming, you authorize MindMines and Stripe
          to debit your account monthly. You can request a refund within 8 weeks
          from the debit date per your bank’s terms.
        </p>
      </div>

      {err && <div className="text-red-600 text-sm">{String(err)}</div>}

      <button
        onClick={startInstallments}
        disabled={loading || !stripe}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing…" : `Start ${months}-month plan`}
      </button>
    </div>
  );
}

export default function StripeInstallments(props) {
  return (
    <Elements stripe={stripePromise} options={{ locale: "de" }}>
      <InnerInstallments {...props} />
    </Elements>
  );
}
