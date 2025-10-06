// src/components/StripeInstallments.jsx
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

function InstallmentForm({
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  form,
  total,
  months,
  couponCode,
  couponInfo,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    setErr("");
    if (!stripe || !elements) return;

    try {
      // 1) Ask backend for SetupIntent
      const si = await http.post("payments/stripe/create-setup-intent/");
      const clientSecret = si.data?.clientSecret;
      if (!clientSecret) throw new Error("No client secret.");

      // 2) Confirm setup (save card)
      const { setupIntent, error } = await stripe.confirmCardSetup(
        clientSecret,
        {
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
                  .toUpperCase(),
              },
            },
          },
        }
      );
      if (error) throw error;

      // 3) Create the Stripe schedule + local order for N months
      const res = await http.post("payments/stripe/create-installments/", {
        items: lineItems,
        months,
        payment_method_id: setupIntent.payment_method,
        ...addressPayload,
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      });

      setLocalOrderId?.(res.data.order_id);
      onSuccess?.(res.data.order_id);
    } catch (e) {
      setErr(e?.message || "Failed to start installments.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <button
        onClick={start}
        disabled={loading || !stripe}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading
          ? "Processing..."
          : `Start ${months} × ${(total / months).toFixed(2)} € installments`}
      </button>
    </div>
  );
}

export default function StripeInstallments({
  active,
  setActive,
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  form,
  total,
  months,
}) {
  if (!active)
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value={`card_installments_${months}`}
          onChange={setActive}
        />
        <span className="flex-1">
          Card installments — {months} months (Stripe)
        </span>
        <span className="text-xs">Auto-charge monthly</span>
      </label>
    );

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input type="radio" name="payment" checked readOnly />
        <span className="flex-1">
          Card installments — {months} months (Stripe)
        </span>
        <span className="text-xs">Auto-charge monthly</span>
      </label>
      <div className="border rounded p-3">
        <Elements stripe={stripePromise} options={{ locale: "de" }}>
          <InstallmentForm
            lineItems={lineItems}
            addressPayload={addressPayload}
            setLocalOrderId={setLocalOrderId}
            onSuccess={onSuccess}
            form={form}
            total={total}
            months={months}
          />
        </Elements>
      </div>
    </>
  );
}
