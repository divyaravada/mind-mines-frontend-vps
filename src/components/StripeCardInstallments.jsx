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

function pickErr(e, fallback) {
  return (
    e?.data?.detail ||
    e?.data?.error ||
    e?.error ||
    (typeof e === "string" ? e : "") ||
    fallback
  );
}

/** Step 1: Save a card with a SetupIntent (works for guests + users) */
function SaveCardStep({ email, onSaved, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSI, { isLoading: siLoading }] =
    useStripeCreateSetupIntentMutation();
  const [cs, setCs] = useState("");
  const [saving, setSaving] = useState(false);

  async function initSI() {
    if (!email) {
      onError?.("Please enter your email first.");
      return;
    }
    try {
      const res = await createSI({ email: email.trim() }).unwrap();
      const secret = res?.client_secret || res?.clientSecret || "";
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
          disabled={siLoading}
        >
          {siLoading ? "Preparing…" : "Add card for installments"}
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
  setActive, // kept for compatibility (not used)
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
  const [serverSchedule, setServerSchedule] = useState(null);

  const monthsSafe = useMemo(() => {
    const m = Number(months);
    return [3, 6, 9].includes(m) ? m : 3;
  }, [months]);

  async function startPlan(pmId) {
    setErrorMsg("");

    // quick guards so we fail early with a helpful message
    if (!Array.isArray(items) || items.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }
    const email = (form?.email || "").trim();
    if (!email) {
      setErrorMsg("Please enter your email first.");
      return;
    }

    try {
      const payload = buildOrderPayload({
        form,
        items,
        email,
        couponCode,
        payment_method: "card_installments",
        installments_months: monthsSafe,
        extra: {
          // Send BOTH to satisfy your serializer/view
          months: monthsSafe,
          payment_method_id: pmId,
        },
      });

      const res = await createPlan(payload).unwrap();
      const orderId = res?.order_id ?? res?.data?.order_id ?? null;
      if (!orderId) throw new Error("Order not created.");

      // Capture server schedule to show the exact plan we also emailed
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

      {/* CardElement does NOT require a clientSecret on Elements (only PaymentElement does) */}
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
                // allow switching card if needed
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
