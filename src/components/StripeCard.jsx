// src/components/StripeCard.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useStripeCreateIntentMutation } from "../features/payments/paymentsApi";

export default function StripeCard({ orderId, onSuccess, onError }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [createIntent, { isLoading }] = useStripeCreateIntentMutation();
  const [clientSecret, setClientSecret] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await createIntent({ order_id: orderId }).unwrap();
        if (mounted) setClientSecret(res.client_secret);
      } catch (e) {
        const msg =
          e?.data?.detail || e?.error || t("checkout.stripe.initFailed");
        onError?.(msg);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, createIntent, onError]);

  const pay = async () => {
    if (!stripe || !elements || !clientSecret) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setBusy(true);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    setBusy(false);

    if (result.error) {
      onError?.(result.error.message || t("checkout.stripe.paymentFailed"));
      return;
    }
    if (result.paymentIntent?.status === "succeeded") {
      onSuccess?.(orderId);
    } else {
      onError?.(t("checkout.stripe.incomplete"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <CardElement options={{ hidePostalCode: true }} />
      </div>

      <button
        type="button"
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={isLoading || busy || !stripe || !elements || !clientSecret}
        onClick={pay}
      >
        {busy ? t("checkout.stripe.processing") : t("checkout.stripe.payCard")}
      </button>
    </div>
  );
}
