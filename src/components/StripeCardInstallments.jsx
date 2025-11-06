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
import InstallmentsSchedulePreview from "./InstallmentsSchedulePreview";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);
const pickErr = (e, fb) =>
  e?.data?.detail ||
  e?.data?.error ||
  e?.error ||
  (typeof e === "string" ? e : "") ||
  fb;

function SaveCardStep({ email, onSaved, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSI, { isLoading }] = useStripeCreateSetupIntentMutation();
  const [cs, setCs] = useState("");
  const [saving, setSaving] = useState(false);

  async function initSI() {
    try {
      const r = await createSI({ email: (email || "").trim() }).unwrap();
      const secret = r?.client_secret || r?.clientSecret || "";
      if (!secret) throw new Error("No client_secret returned.");
      setCs(secret);
    } catch (e) {
      onError?.(pickErr(e, "Failed to prepare card."));
    }
  }

  async function saveCard() {
    if (!stripe || !elements || !cs) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(cs, {
        payment_method: {
          card,
          billing_details: { email: email || undefined },
        },
      });
      if (error) throw new Error(error.message || "Failed to save card.");
      const pm = setupIntent?.payment_method;
      if (!pm) throw new Error("No payment method returned.");
      onSaved?.(pm);
    } catch (e) {
      onError?.(pickErr(e, "Failed to save card."));
    } finally {
      setSaving(false);
    }
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
            disabled={saving}
          >
            {saving ? "Saving…" : "Save card"}
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
  months,
  form,
  items,
  couponCode,
  paymentMethodId,
  setLocalOrderId,
  onSuccess,
}) {
  const [createPlan, { isLoading }] = useStripeCardInstallmentsMutation();
  const [errorMsg, setErrorMsg] = useState("");
  const [localPM, setLocalPM] = useState(paymentMethodId || null);
  const [serverSchedule, setServerSchedule] = useState(null);
  const monthsSafe = useMemo(
    () => ([3, 6, 9].includes(Number(months)) ? Number(months) : 3),
    [months]
  );

  async function startPlan(pmId) {
    setErrorMsg("");
    try {
      const payload = buildOrderPayload({
        form,
        items,
        email: (form?.email || "").trim(),
        couponCode,
        payment_method: "card_installments",
        installments_months: monthsSafe,
        extra: { months: monthsSafe, payment_method_id: pmId },
      });
      const res = await createPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");
      setServerSchedule({
        months: res?.months,
        amounts: res?.amounts,
        dates: res?.dates,
      });
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
      {serverSchedule && (
        <InstallmentsSchedulePreview
          months={serverSchedule.months}
          total={null}
          serverSchedule={serverSchedule}
        />
      )}
      <Elements
        stripe={stripePromise}
        options={{ appearance: { theme: "stripe" }, locale: "de" }}
      >
        {!localPM ? (
          <SaveCardStep
            email={(form?.email || "").trim()}
            onSaved={(pm) => setLocalPM(pm)}
            onError={(m) => setErrorMsg(m)}
          />
        ) : (
          <div className="flex items-center gap-3">
            <button
              disabled={isLoading}
              onClick={() => startPlan(localPM)}
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60"
            >
              {isLoading ? "Starting…" : "Start installments"}
            </button>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => {
                setLocalPM(null);
                setServerSchedule(null);
              }}
            >
              Use a different card
            </button>
          </div>
        )}
      </Elements>
    </div>
  );
}
