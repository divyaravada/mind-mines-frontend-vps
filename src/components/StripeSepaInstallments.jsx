// src/components/StripeInstallments.jsx
import React, { useState } from "react";
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

const toCents = (n) => Math.round(Number(n || 0) * 100);

const splitInstallments = (total, months) => {
  const m = Number(months ?? 0);
  const t = Number(total ?? 0);

  // Guard: if invalid inputs, return empty array
  if (!Number.isFinite(t) || !Number.isFinite(m) || m <= 0) return [];

  const tc = toCents(t);
  const base = Math.floor(tc / m);
  const rem = tc - base * m;

  const parts = Array(m).fill(base);
  if (rem) parts[m - 1] += rem; // last month absorbs remainder

  // return numbers in euros with 2 decimals
  return parts.map((c) => Number((c / 100).toFixed(2)));
};

const fmtEUR = (n) => {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${Number(n || 0).toFixed(2)} €`;
  }
};

function InnerInstallments({
  months,
  lineItems, // [{ product_id, qty }]
  addressPayload, // { address_line1, postal_code, city, country, phone, ... }
  couponCode,
  couponInfo,
  form, // { fullName, email, ... }
  setLocalOrderId,
  onSuccess,
  total,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const parts = splitInstallments(total, months);

  const perMonthLabel =
    Array.isArray(parts) && parts.length ? fmtEUR(parts[0]) : null;

  const breakdown = Array.isArray(splitInstallments(total, months))
    ? parts
    : [];

  const startInstallments = async () => {
    setErr("");
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      // 1) Create SetupIntent for SEPA mandate
      const siRes = await http.post(
        "payments/stripe/sepa/create-setup-intent/"
      );
      const clientSecret = siRes?.data?.clientSecret;
      if (!clientSecret) throw new Error("Missing SetupIntent client secret");

      // 2) Confirm SEPA mandate
      const { setupIntent, error } = await stripe.confirmSepaDebitSetup(
        clientSecret,
        {
          payment_method: {
            sepa_debit: elements.getElement(IbanElement),
            billing_details: {
              name: form?.fullName || "",
              email: form?.email || "",
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

      const pmId = setupIntent?.payment_method;
      if (!pmId) throw new Error("Payment method not returned from Stripe.");

      // 3) Start the installments schedule on backend
      const payload = {
        items: lineItems, // <-- REQUIRED
        months,
        payment_method_id: pmId, // <-- REQUIRED
        method: "sepa_debit", // optional (defaults to sepa_debit)
        ...addressPayload, // your address fields
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      };

      const createRes = await http.post(
        "payments/stripe/create-installments/",
        payload
      );
      const orderId = createRes?.data?.order_id;
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
        <IbanElement options={{ supportedCountries: ["SEPA"] }} />
        <p className="text-xs text-gray-600 mt-2">
          By providing your IBAN and confirming, you authorize MindMines and
          Stripe to debit your account monthly. You can request a refund within
          8 weeks from the debit date per your bank’s terms.
        </p>
      </div>

      {breakdown.length > 0 && (
        <div className="text-sm text-gray-700">
          {breakdown.map((amt, i) => (
            <span key={i} className="mr-2">
              {i + 1}. {fmtEUR(amt)}
            </span>
          ))}
        </div>
      )}

      {err && <div className="text-red-600 text-sm">{String(err)}</div>}

      <button
        onClick={startInstallments}
        disabled={loading || !stripe}
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

const normalizeCountry = (c) => {
  if (!c) return "DE";
  const s = String(c).trim();
  if (s.length === 2) return s.toUpperCase();
  const map = {
    Germany: "DE",
    Deutschland: "DE",
    Italy: "IT",
    Österreich: "AT",
    Austria: "AT",
    Schweiz: "CH",
    Switzerland: "CH",
  };
  return map[s] || "DE";
};

export default function StripeInstallments(props) {
  const cc = normalizeCountry(props.addressPayload?.country);
  if (cc !== "DE") {
    return (
      <div className="text-sm text-gray-600">
        SEPA installments are available in Germany only.
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise} options={{ locale: "de" }}>
      <InnerInstallments {...props} />
    </Elements>
  );
}
