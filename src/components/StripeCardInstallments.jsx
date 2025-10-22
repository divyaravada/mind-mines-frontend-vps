// src/components/StripeCardInstallments.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function Inner({
  months,
  lineItems,
  addressPayload,
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

  const handleStartPlan = useCallback(async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      // 1) Confirm SetupIntent to get a reusable card PaymentMethod
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: addressPayload?.first_name
                ? `${addressPayload.first_name} ${
                    addressPayload.last_name || ""
                  }`.trim()
                : undefined,
              address: {
                line1: addressPayload?.address_line1 || undefined,
                line2: addressPayload?.address_line2 || undefined,
                postal_code: addressPayload?.postal_code || undefined,
                city: addressPayload?.city || undefined,
                country: (addressPayload?.country || "DE")
                  .slice(0, 2)
                  .toUpperCase(),
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

      if (!setupIntent || !setupIntent.payment_method) {
        setErrorMsg(
          t("checkout.cardError", { defaultValue: "Could not save card." })
        );
        setProcessing(false);
        return;
      }

      const payment_method_id = setupIntent.payment_method;

      // 2) Create the subscription schedule (installments) on your backend using CARD
      const res = await http.post("stripe/installments/card/", {
        months,
        method: "card",
        payment_method_id,
        items: lineItems,
        ...addressPayload,
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      });

      setLocalOrderId?.(res.data?.order_id);
      onSuccess?.(); // you’ll transition to “Order placed” UI; webhook will send invoice emails per charge
    } catch (e) {
      setErrorMsg(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
      return;
    }
  }, [
    stripe,
    elements,
    addressPayload,
    months,
    lineItems,
    couponCode,
    couponInfo,
    onSuccess,
    setLocalOrderId,
    t,
  ]);

  return (
    <div className="border rounded p-3 space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        disabled={!stripe || !elements || processing}
        onClick={handleStartPlan}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {processing
          ? t("checkout.processing", { defaultValue: "Processing..." })
          : t("checkout.startPlan", {
              defaultValue: "Start card plan — {{total}}",
              total: totalFormatted,
            })}
      </button>
    </div>
  );
}

export default function StripeCardInstallments({
  active,
  setActive,
  months,
  lineItems,
  addressPayload,
  setLocalOrderId,
  onSuccess,
  total,
  couponCode,
  couponInfo,
  locale = "en",
}) {
  const { i18n } = useTranslation();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  // Create a CARD SetupIntent when this section becomes active
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!active) return;
      setLoading(true);
      try {
        const res = await http.post("stripe/setup-intent/card/", {});
        if (!cancelled) setClientSecret(res.data?.clientSecret || "");
      } catch {
        if (!cancelled) setClientSecret("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const appearance = useMemo(() => ({ theme: "stripe" }), []);
  const totalFormatted = new Intl.NumberFormat(i18n.language || "en", {
    style: "currency",
    currency: "EUR",
  }).format(total);

  if (!active) {
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-2">
        <input
          type="radio"
          name={`installments_${months}`}
          checked={false}
          onChange={() => setActive?.(`card_installments_${months}`)}
        />
        <span className="flex-1">Card installments ({months} months)</span>
      </label>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-2">
        <input
          type="radio"
          name={`installments_${months}`}
          checked
          onChange={() => setActive?.(`card_installments_${months}`)}
        />
        <span className="flex-1">Card installments ({months} months)</span>
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
              clientSecret, // this is a SETUP INTENT client secret
              appearance,
              locale: i18n.language === "de" ? "de" : "en",
            }}
          >
            <Inner
              months={months}
              lineItems={lineItems}
              addressPayload={addressPayload}
              couponCode={couponCode}
              couponInfo={couponInfo}
              setLocalOrderId={setLocalOrderId}
              onSuccess={onSuccess}
              totalFormatted={totalFormatted}
            />
          </Elements>
        </div>
      )}
    </>
  );
}
