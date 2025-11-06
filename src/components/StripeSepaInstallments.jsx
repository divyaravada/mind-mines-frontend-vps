// src/components/StripeSepaInstallments.jsx
import React, { useState, useMemo } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  useStripeSepaInstallmentsMutation,
  useStripeCreateSepaSetupIntentMutation,
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

/**
 * Step 1 (if needed): Save a SEPA mandate (IBAN) to get a payment_method_id
 */
function SaveSepaMandate({ email, onSaved, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSI, { isLoading }] = useStripeCreateSepaSetupIntentMutation();
  const [cs, setCs] = useState("");

  async function initSetupIntent() {
    try {
      const r = await createSI({ email }).unwrap();
      setCs(r.client_secret || r.clientSecret);
    } catch (e) {
      onError?.(pickErr(e, "Failed to prepare SEPA mandate."));
    }
  }

  async function saveMandate() {
    if (!stripe || !elements || !cs) return;
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      clientSecret: cs,
    });
    if (error) return onError?.(error.message || "SEPA setup failed.");
    const pm = setupIntent?.payment_method;
    if (!pm) return onError?.("No payment method returned.");
    onSaved?.(pm);
  }

  return (
    <div className="space-y-3">
      {!cs ? (
        <button
          className="px-3 py-2 rounded bg-gray-900 text-white text-sm"
          onClick={initSetupIntent}
          disabled={isLoading}
        >
          {isLoading ? "Vorbereiten..." : "SEPA-Mandat hinzufügen"}
        </button>
      ) : (
        <>
          <div className="border rounded p-3 bg-white">
            <PaymentElement />
          </div>
          <button
            className="px-3 py-2 rounded bg-gray-900 text-white text-sm"
            onClick={saveMandate}
          >
            Mandat speichern
          </button>
        </>
      )}
      <p className="text-xs text-gray-500">
        Dein IBAN wird sicher bei Stripe gespeichert. Nur für diese Bestellung
        verwendet.
      </p>
    </div>
  );
}

/**
 * Step 2: Start SEPA installment plan
 */
export default function StripeSepaInstallments({
  active,
  setActive,
  months,
  form,
  items,
  couponCode,
  paymentMethodId, // optional (if user already has a saved mandate)
  countryCode,
  setLocalOrderId,
  onSuccess,
}) {
  const [startSepaPlan, { isLoading }] = useStripeSepaInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");
  const [localPM, setLocalPM] = useState(paymentMethodId || null);

  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

  async function handleStart() {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: (form.email || "").trim(),
        couponCode,
        payment_method: "sepa_installments",
        extra: {
          months: monthsSafe,
          installments_months: monthsSafe, // ensures serializer validation passes
          payment_method_id: localPM,
          country: countryCode || "DE",
        },
      });

      const res = await startSepaPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");

      setLocalOrderId?.(orderId);
      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(pickErr(e, "Failed to start SEPA plan."));
    }
  }

  if (!active) {
    return (
      <div className="border rounded p-3 mt-3">
        <div className="text-sm text-gray-600">
          0% Finanzierung (SEPA Lastschrift) — {monthsSafe} Monate
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-3 bg-gray-50">
      <div className="text-sm font-medium">
        SEPA Ratenzahlung ({monthsSafe} Monate) — monatliche Abbuchung.
      </div>
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

      <Elements
        stripe={stripePromise}
        options={{ appearance: { theme: "stripe" }, locale: "de" }}
      >
        {!localPM ? (
          <SaveSepaMandate
            email={(form.email || "").trim()}
            onSaved={(pm) => setLocalPM(pm)}
            onError={(m) => setErrorMsg(m)}
          />
        ) : (
          <button
            disabled={isLoading}
            onClick={handleStart}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
          >
            {isLoading ? "Starte..." : "Ratenzahlung starten"}
          </button>
        )}
      </Elements>
    </div>
  );
}
