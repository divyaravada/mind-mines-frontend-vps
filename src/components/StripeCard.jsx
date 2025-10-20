// src/components/StripeCard.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import http from "../services/http";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function CardInner({
  clientSecret,
  locale,
  lineItems,
  addressPayload,
  customerEmail,
  couponCode,
  couponInfo,
  setLocalOrderId,
  onSuccess,
  totalFormatted,
}) {
  const { t, i18n } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePay = useCallback(async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    const normalizeCountry = (c) => {
      if (!c) return "DE";
      const up = ("" + c).trim();
      if (up.length === 2) return up.toUpperCase();
      const map = { Germany: "DE", Deutschland: "DE" };
      return map[up] || "DE";
    };

    try {
      // confirm the payment (handles 3DS automatically; returns when completed or no redirect)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // You can set a return_url if you prefer full redirect flow:
          // return_url: `${window.location.origin}/checkout/return`,
          payment_method_data: {
            billing_details: {
              name: addressPayload?.first_name
                ? `${addressPayload.first_name} ${
                    addressPayload.last_name || ""
                  }`.trim()
                : undefined,
              email: customerEmail || addressPayload?.email || undefined, // email usually captured earlier; optional here
              address: {
                line1: addressPayload?.address_line1 || undefined,
                line2: addressPayload?.address_line2 || undefined,
                postal_code: addressPayload?.postal_code || undefined,
                city: addressPayload?.city || undefined,
                country: normalizeCountry(addressPayload?.country),
              },
            },
          },
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMsg(
          error.message ||
            t("checkout.cardError", { defaultValue: "Payment failed." })
        );
        setProcessing(false);
        return;
      }

      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "requires_capture")
      ) {
        onSuccess?.();
        return;
      }

      // Other interim statuses: processing, requires_action (handled by Payment Element), etc.
      onSuccess?.();
    } catch (e) {
      setErrorMsg(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
    }
  }, [stripe, elements, addressPayload, onSuccess, t]);

  return (
    <div className="border rounded p-3 space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        disabled={!stripe || !elements || processing}
        onClick={handlePay}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {processing
          ? t("checkout.processing", { defaultValue: "Processing..." })
          : t("checkout.payCard", {
              defaultValue: "Pay by card — {{total}}",
              total: totalFormatted,
            })}
      </button>
    </div>
  );
}

export default function StripeCard({
  active,
  setActive,
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  total,
  couponCode,
  couponInfo,
  locale = "en",
  customerEmail,
}) {
  const { i18n } = useTranslation();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  // Create the PaymentIntent when section becomes active (or total changes)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!active) return;
      setLoading(true);
      try {
        const normalizeCountry = (c) => {
          if (!c) return "DE";
          const up = ("" + c).trim();
          if (up.length === 2) return up.toUpperCase();
          // very small map for common names you use
          const map = { Germany: "DE", Deutschland: "DE" };
          return map[up] || "DE";
        };
        const res = await http.post("payments/stripe/create-intent/", {
          email: customerEmail || addressPayload?.email,
          items: lineItems,
          payment_method: "card",
          ...addressPayload,
          country: normalizeCountry(addressPayload?.country),
          coupon_code: (couponCode || couponInfo?.code || "").trim(),
        });
        if (!cancelled) {
          setClientSecret(res.data?.clientSecret || "");
          setLocalOrderId?.(res.data?.order_id);
        }
      } catch (e) {
        if (!cancelled) {
          setClientSecret("");
          console.error("Create intent failed", e?.response?.data || e);
          // optionally show a toast/banner with e.response.data.detail or validation errors
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
    // re-create only when toggled active, items/total change, or coupon changes
  }, [
    active,
    JSON.stringify(lineItems),
    total,
    couponCode,
    couponInfo,
    addressPayload,
    setLocalOrderId,
  ]);

  const appearance = useMemo(() => ({ theme: "stripe" }), []);
  if (!active) {
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="card"
          checked={false}
          onChange={() => setActive?.("card")}
        />
        <span className="flex-1">Credit / Debit card</span>
      </label>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="card"
          checked
          onChange={() => setActive?.("card")}
        />
        <span className="flex-1">Credit / Debit card</span>
        <span className="text-xs">Visa · Mastercard · Amex</span>
      </label>

      {loading && (
        <div className="border rounded p-3 mt-2 text-sm text-gray-600">
          Initializing secure card form…
        </div>
      )}

      {clientSecret && (
        <div className="mt-2">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
              locale: "de" === locale ? "de" : "en",
            }}
          >
            <CardInner
              clientSecret={clientSecret}
              locale={i18n.language}
              lineItems={lineItems}
              addressPayload={addressPayload}
              customerEmail={customerEmail || addressPayload?.email}
              couponCode={couponCode}
              couponInfo={couponInfo}
              setLocalOrderId={setLocalOrderId}
              onSuccess={onSuccess}
              totalFormatted={new Intl.NumberFormat(i18n.language || "en", {
                style: "currency",
                currency: "EUR",
              }).format(total)}
            />
          </Elements>
        </div>
      )}
    </>
  );
}
