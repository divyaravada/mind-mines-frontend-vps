// src/components/StripeSepa.jsx
import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import { getCheckoutIdem } from "../utils/idempotency";
import { useStripeCreateSepaIntentMutation } from "../features/payments/paymentsApi";
import {
  buildOrderPayload,
  buildShippingSnapshot,
  normalizeCountry,
} from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function SepaForm({
  form,
  items,
  total,
  couponCode,
  onSuccess,
  setLocalOrderId,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSepaIntent] = useStripeCreateSepaIntentMutation();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [ibanComplete, setIbanComplete] = useState(false);
  const [ibanError, setIbanError] = useState("");

  const totalLabel = useMemo(() => {
    const n = Number(total || 0);
    try {
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(n);
    } catch {
      return `${n.toFixed(2)} €`;
    }
  }, [total]);

  const shippingSnapshot = useMemo(() => buildShippingSnapshot(form), [form]);

  const hasMinimalBilling = () => {
    const required = [
      form?.fullName,
      form?.email,
      shippingSnapshot.line1,
      shippingSnapshot.postal_code,
      shippingSnapshot.city,
      shippingSnapshot.country,
    ];
    return required.every((v) => (v || "").toString().trim().length > 0);
  };

  const pay = async () => {
    setErr("");
    if (!stripe || !elements) return;
    if (loading) return;
    if (!ibanComplete) {
      setErr("Please enter a valid IBAN.");
      return;
    }
    if (!hasMinimalBilling()) {
      setErr("Please fill delivery/contact details first.");
      return;
    }

    setLoading(true);
    try {
      // 1) Ask backend to create local Order + Stripe PaymentIntent for SEPA
      const payload = buildOrderPayload({
        form,
        items,
        email: (form.email || "").trim(),
        couponCode,
        payment_method: "sepa_debit",
        extra: {
          idempotency_key: getCheckoutIdem(),
        },
      });

      const res = await createSepaIntent(payload).unwrap();

      const clientSecret =
        res.clientSecret ||
        res.client_secret ||
        res.data?.clientSecret ||
        res.data?.client_secret ||
        null;

      const orderId = res.order_id || res.data?.order_id || null;

      if (!clientSecret) throw new Error("Missing client secret from server.");
      setLocalOrderId?.(orderId);

      // 2) Confirm mandate + payment with Stripe
      const { error, paymentIntent } = await stripe.confirmSepaDebitPayment(
        clientSecret,
        {
          payment_method: {
            sepa_debit: elements.getElement(IbanElement),
            billing_details: {
              name: form?.fullName || "",
              email: form?.email || "",
              address: {
                line1: shippingSnapshot.line1 || "",
                postal_code: shippingSnapshot.postal_code || "",
                city: shippingSnapshot.city || "",
                country: normalizeCountry(shippingSnapshot.country),
              },
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "SEPA payment failed.");
      }

      if (
        paymentIntent?.status === "processing" ||
        paymentIntent?.status === "succeeded"
      ) {
        // optional post-confirm hook you had
        try {
          await fetch("/api/payments/sepa-post-confirm/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderId,
              payment_intent_status: paymentIntent.status,
            }),
          });
        } catch (postErr) {
          console.warn("sepa-post-confirm failed", postErr);
        }

        onSuccess?.(orderId);
      } else {
        throw new Error(`SEPA status: ${paymentIntent?.status || "unknown"}`);
      }
    } catch (e) {
      setErr(e?.message || "SEPA payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <IbanElement
          options={{ supportedCountries: ["SEPA"] }}
          onChange={(event) => {
            setIbanComplete(event.complete === true);
            if (event.error && event.error.message) {
              setIbanError(event.error.message);
            } else {
              setIbanError("");
            }
          }}
        />
        <p className="text-xs text-gray-600 mt-2">
          By providing your IBAN and confirming this payment, you authorize
          MindMines and Stripe to debit your account in accordance with SEPA
          rules. You can request a refund within 8 weeks from the debit date.
        </p>
      </div>

      {ibanError && <div className="text-red-600 text-sm">{ibanError}</div>}
      {err && !ibanError && (
        <div className="text-red-600 text-sm">{String(err)}</div>
      )}

      <button
        onClick={pay}
        disabled={loading || !stripe || !ibanComplete || !hasMinimalBilling()}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing…" : `Pay by SEPA Direct Debit (${totalLabel})`}
      </button>
    </div>
  );
}

export default function StripeSepa({
  active,
  form,
  items,
  total,
  couponCode,
  setLocalOrderId,
  onSuccess,
}) {
  const cc = normalizeCountry(form?.country || "DE");
  const isDE = cc === "DE";

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <span className="flex-1">
          Direct Bank Debit (SEPA){!isDE ? " — DE only" : ""}
        </span>
        <span className="text-xs">IBAN/BIC</span>
      </label>

      {active && isDE && (
        <div className="border rounded p-3">
          <Elements stripe={stripePromise} options={{ locale: "de" }}>
            <SepaForm
              form={form}
              items={items}
              total={total}
              couponCode={couponCode}
              onSuccess={onSuccess}
              setLocalOrderId={setLocalOrderId}
            />
          </Elements>
        </div>
      )}
    </>
  );
}
