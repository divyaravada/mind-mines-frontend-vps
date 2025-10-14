// src/components/StripePayment.jsx
import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");

function Inner({
  method,                   // "card" | "giropay" | "sepa_debit"
  lineItems,
  addressPayload,
  couponCode,
  couponInfo,
  setLocalOrderId,
  onSuccess,
  locale = "de",
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // 1) Create PI to get clientSecret
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setErr("");
        const payload = {
          items: lineItems,
          payment_method: method,
          ...addressPayload,
          coupon_code: (couponCode || couponInfo?.code || "").trim(),
        };
        const r = await http.post("payments/stripe/create-intent/", payload);
        if (!isMounted) return;
        const cs = r?.data?.clientSecret;
        const orderId = r?.data?.order_id;
        if (!cs) throw new Error("Missing client secret");
        setClientSecret(cs);
        setLocalOrderId?.(orderId);
      } catch (e) {
        if (!isMounted) return;
        setErr(e?.response?.data?.detail || e?.message || "Failed to start payment.");
      }
    })();
    return () => { isMounted = false; };
  }, [method, lineItems, addressPayload, couponCode, couponInfo, setLocalOrderId]);

  // 2) Confirm
  const pay = async () => {
    setErr("");
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    try {
      let result;

      if (method === "sepa_debit") {
        // SEPA uses IBAN element + confirmSepaDebitPayment (no elements.submit() needed)
        result = await stripe.confirmSepaDebitPayment(clientSecret, {
          payment_method: {
            sepa_debit: elements.getElement(IbanElement),
            billing_details: {
              name: `${addressPayload?.first_name || ""} ${addressPayload?.last_name || ""}`.trim(),
              email: addressPayload?.email || "",
              address: {
                line1: addressPayload?.address_line1 || "",
                postal_code: addressPayload?.postal_code || "",
                city: addressPayload?.city || "",
                country: (addressPayload?.country || "DE").slice(0, 2).toUpperCase(),
              },
            },
          },
        });
      } else {
        // Payment Element flow (card & giropay):
        // REQUIRED: submit() first, then confirmPayment()
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw submitError;
        }
        result = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            // For redirect-based methods (giropay) Stripe may redirect;
            // for card, it will handle SCA if needed.
            return_url: `${window.location.origin}/checkout/success`,
          },
          // Do not pass payment_method here when using PaymentElement.
        });
      }

      if (result?.error) throw result.error;

      const status = result?.paymentIntent?.status;
      if (method === "sepa_debit") {
        // SEPA is usually "processing" and settles in 2–5 bank days
        if (status === "processing" || status === "succeeded") onSuccess?.();
        else throw new Error(`SEPA status: ${status || "unknown"}`);
      } else if (method === "card") {
        if (status === "succeeded" || status === "requires_capture") onSuccess?.();
        else throw new Error(`Card status: ${status || "unknown"}`);
      } else if (method === "giropay") {
        // giropay is redirect-based; if Stripe didn’t redirect, PI will settle via webhook
        onSuccess?.();
      }
    } catch (e) {
      setErr(e?.message || "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Render proper input */}
      {method === "sepa_debit" ? (
        <div className="border rounded p-3">
          <IbanElement options={{ supportedCountries: ["SEPA"] }} />
          <p className="text-xs text-gray-600 mt-2">
            Bei SEPA-Lastschrift kann die Zahlungsbestätigung 2–5 Bankarbeitstage dauern.
          </p>
        </div>
      ) : (
        // card & giropay via Payment Element
        clientSecret && <PaymentElement />
      )}

      {err && <div className="text-red-600 text-sm">{String(err)}</div>}

      <button
        onClick={pay}
        disabled={loading || !stripe || !elements || !clientSecret}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing…" : "Pay now"}
      </button>
    </div>
  );
}

export default function StripePayment(props) {
  const { locale = "de" } = props;
  const [options, setOptions] = useState({ locale });

  // When we don’t know clientSecret yet, we still mount Elements;
  // once Inner fetches clientSecret, PaymentElement renders.
  useEffect(() => setOptions((o) => ({ ...o, locale })), [locale]);

  return (
    <Elements stripe={stripePromise} options={options}>
      <Inner {...props} />
    </Elements>
  );
}
