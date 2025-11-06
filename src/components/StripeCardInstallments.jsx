// src/components/StripeCardInstallments.jsx
import React, { useMemo, useState } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  useStripeCreateSetupIntentMutation,
  useStripeCardInstallmentsMutation,
} from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function pickErr(e, fallback) {
  return (
    e?.data?.detail ||
    e?.data?.error ||
    e?.error ||
    (typeof e === "string" ? e : "") ||
    fallback
  );
}

function SaveCardStep({ email, onSaved, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSI, { isLoading }] = useStripeCreateSetupIntentMutation();
  const [cs, setCs] = useState("");

  async function initSI() {
    try {
      const res = await createSI({ email }).unwrap();
      setCs(res.client_secret || res.clientSecret);
    } catch (e) {
      onError?.(pickErr(e, "Failed to prepare card."));
    }
  }

  async function saveCard() {
    if (!stripe || !elements || !cs) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    const { error, setupIntent } = await stripe.confirmCardSetup(cs, {
      payment_method: { card },
    });
    if (error) {
      onError?.(error.message || "Failed to save card.");
      return;
    }
    const pm = setupIntent?.payment_method;
    if (!pm) {
      onError?.("No payment method returned.");
      return;
    }
    onSaved?.(pm);
  }

  return (
    <div className="space-y-2">
      {!cs ? (
        <button
          className="px-3 py-2 rounded bg-gray-900 text-white text-sm"
          onClick={initSI}
          disabled={isLoading}
        >
          {isLoading ? "Preparing…" : "Add card for installments"}
        </button>
      ) : (
        <>
          <div className="border rounded p-3">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
          <button
            className="px-3 py-2 rounded bg-gray-900 text-white text-sm"
            onClick={saveCard}
          >
            Save card
          </button>
        </>
      )}
      <p className="text-xs text-gray-500">
        We’ll store your card with Stripe to charge monthly.
      </p>
    </div>
  );
}

export default function StripeCardInstallments({
  active,
  setActive,
  months,
  form,
  items,
  couponCode,
  paymentMethodId, // may be null
  setLocalOrderId,
  onSuccess,
}) {
  const [createPlan, { isLoading }] = useStripeCardInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");
  const [localPM, setLocalPM] = useState(paymentMethodId || null);

  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

  async function startPlan(pmId) {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: (form.email || "").trim(),
        couponCode,
        payment_method: "card_installments",
        extra: {
          // send BOTH to satisfy serializer/view
          months: monthsSafe,
          installments_months: monthsSafe,
          payment_method_id: pmId,
        },
      });

      const res = await createPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");

      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to start installments."));
    }
  }

  if (!active) {
    return (
      <div className="border rounded p-3 mt-4">
        <div className="text-sm text-gray-600">
          0% financing with card ({monthsSafe} months)
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-3">
      <div className="text-sm">
        Confirm card-based installments ({monthsSafe} months).
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

      <Elements
        stripe={stripePromise}
        options={{ appearance: { theme: "stripe" }, locale: "de" }}
      >
        {!localPM ? (
          <SaveCardStep
            email={(form.email || "").trim()}
            onSaved={(pm) => setLocalPM(pm)}
            onError={(m) => setErrorMsg(m)}
          />
        ) : (
          <button
            disabled={isLoading}
            onClick={() => startPlan(localPM)}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
          >
            {isLoading ? "Starting…" : "Start installments"}
          </button>
        )}
      </Elements>
    </div>
  );
}
