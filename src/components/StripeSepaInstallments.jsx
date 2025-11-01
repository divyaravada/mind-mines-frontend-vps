// src/components/StripeInstallments.jsx
import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

import {
  useStripeCreateSepaSetupIntentMutation,
  useStripeSepaCreateInstallmentsMutation,
} from "../features/payments/paymentsApi";

import {
  buildOrderPayload,
  buildShippingSnapshot,
  normalizeCountry,
} from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

const toCents = (n) => Math.round(Number(n || 0) * 100);

const splitInstallments = (total, months) => {
  const m = Number(months ?? 0);
  const t = Number(total ?? 0);
  if (!Number.isFinite(t) || !Number.isFinite(m) || m <= 0) return [];
  const tc = toCents(t);
  const base = Math.floor(tc / m);
  const rem = tc - base * m;
  const parts = Array(m).fill(base);
  if (rem) parts[m - 1] += rem;
  return parts.map((c) => Number((c / 100).toFixed(2)));
};

const fmtEUR = (n) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    n
  );

function InnerInstallments({
  months,
  form,
  items,
  couponCode,
  total,
  setLocalOrderId,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSetup] = useStripeCreateSepaSetupIntentMutation();
  const [startSchedule] = useStripeSepaCreateInstallmentsMutation();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ibanComplete, setIbanComplete] = useState(false);
  const [ibanError, setIbanError] = useState("");

  const shippingSnapshot = useMemo(() => buildShippingSnapshot(form), [form]);

  const parts = splitInstallments(total, months);
  const perMonthLabel =
    Array.isArray(parts) && parts.length ? fmtEUR(parts[0]) : null;
  const breakdown = Array.isArray(parts) ? parts : [];

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

  const startInstallments = async () => {
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
      // 1) Create a SetupIntent for SEPA mandate
      const si = await createSetup({}).unwrap();
      const clientSecret =
        si?.clientSecret || si?.client_secret || si?.data?.clientSecret || "";
      if (!clientSecret) {
        throw new Error("Missing SetupIntent client secret");
      }

      // 2) Confirm mandate with Stripe to get a reusable payment method
      const { setupIntent, error } = await stripe.confirmSepaDebitSetup(
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
        throw new Error(error.message || "SEPA setup for installments failed.");
      }

      const pmId = setupIntent?.payment_method;
      if (!pmId) {
        throw new Error("Payment method not returned from Stripe.");
      }

      // 3) Ask backend to create installments schedule + order
      const payload = buildOrderPayload({
        form,
        items,
        email: (form.email || "").trim(),
        couponCode,
        payment_method: "sepa_installments",
        extra: {
          months,
          payment_method_id: pmId,
        },
      });

      const res = await startSchedule(payload).unwrap();
      const orderId = res?.order_id;
      if (orderId) setLocalOrderId?.(orderId);

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
          By providing your IBAN and confirming, you authorize MindMines and
          Stripe to debit your account monthly. You can request a refund within
          8 weeks from the debit date per your bank’s terms.
        </p>
      </div>

      {ibanError && <div className="text-red-600 text-sm">{ibanError}</div>}
      {err && !ibanError && (
        <div className="text-red-600 text-sm">{String(err)}</div>
      )}

      {breakdown.length > 0 && (
        <div className="text-sm text-gray-700">
          {breakdown.map((amt, i) => (
            <span key={i} className="mr-2">
              {i + 1}. {fmtEUR(amt)}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={startInstallments}
        disabled={loading || !stripe || !ibanComplete || !hasMinimalBilling()}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading
          ? "Processing…"
          : `Start ${months}-month plan${
              perMonthLabel ? ` — ${perMonthLabel}/mo` : ""
            }`}
      </button>
    </div>
  );
}

export default function StripeInstallments({
  months,
  form,
  items,
  couponCode,
  total,
  setLocalOrderId,
  onSuccess,
}) {
  const cc = normalizeCountry(form?.country);
  if (cc !== "DE") {
    return (
      <div className="text-sm text-gray-600">
        SEPA installments are available in Germany only.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ locale: "de" }}>
      <InnerInstallments
        months={months}
        form={form}
        items={items}
        couponCode={couponCode}
        total={total}
        setLocalOrderId={setLocalOrderId}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
