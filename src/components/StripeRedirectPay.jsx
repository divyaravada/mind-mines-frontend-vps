// src/components/StripeRedirectPay.jsx
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";
import { useStripeCreateRedirectIntentMutation } from "../features/payments/paymentsApi";

function Inner({ orderId, method, onSuccess, onError, returnUrl }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const label = method === "klarna" ? "Klarna" : "giropay";

  const onPay = async () => {
    if (!stripe || !elements) return;
    setConfirming(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    setConfirming(false);
    if (error)
      return onError?.(error.message || t("checkout.redirect.paymentFailed"));
    onSuccess?.(orderId);
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-3 bg-white dark:bg-marbleblack">
        <PaymentElement />
      </div>

      <button
        type="button"
        onClick={onPay}
        disabled={!stripe || !elements || confirming}
        className="w-full px-4 py-3 rounded-lg font-semibold
                   bg-backnewswhite text-marblewhite
                   hover:opacity-90 disabled:opacity-50"
      >
        {confirming
          ? t("checkout.redirect.redirecting")
          : t("checkout.redirect.payWith", { method: label })}
      </button>

      <p className="text-xs text-gray-600 dark:text-gray-300">
        {t("checkout.redirect.note", { brand: label })}
      </p>
    </div>
  );
}

export default function StripeRedirectPay({
  orderId,
  method,
  orderPayload,
  onSuccess,
  onError,
}) {
  const { t, i18n } = useTranslation();
  const [createPI, { isLoading }] = useStripeCreateRedirectIntentMutation();
  const [clientSecret, setClientSecret] = useState("");
  const [effectiveOrderId, setEffectiveOrderId] = useState(orderId || null);
  const orderIdRef = useRef(orderId || null);

  useEffect(() => {
    orderIdRef.current = orderId || null;
    setEffectiveOrderId(orderId || null);
    setClientSecret("");
  }, [orderId]);

  useEffect(() => {
    if (!method) return;
    let mounted = true;
    (async () => {
      try {
        setClientSecret("");
        const base = { method };
        const payload = orderIdRef.current
          ? { ...base, order_id: orderIdRef.current }
          : { ...base, ...(orderPayload || {}) };
        const res = await createPI(payload).unwrap();
        if (!mounted) return;

        setClientSecret(res.client_secret || res.clientSecret || "");
        if (!orderIdRef.current && res.order_id) {
          orderIdRef.current = res.order_id;
          setEffectiveOrderId(res.order_id);
        }
      } catch (e) {
        onError?.(
          e?.data?.detail || e?.error || t("checkout.redirect.initFailed")
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [method, orderPayload, createPI, onError]);

  if (isLoading || !clientSecret) {
    return (
      <div className="border rounded-lg p-3 mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-marbleblack">
        {t("checkout.redirect.preparing")}
      </div>
    );
  }

  const returnUrl = `${window.location.origin}/checkout/return`;
  const isDark = document.documentElement.classList.contains("dark");
  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#ec8b0b",
      colorText: isDark ? "#e5e7eb" : "#1f2937",
      colorBackground: isDark ? "#17160f" : "#f8fcfe",
    },
  };

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: i18n.language?.startsWith("de") ? "de" : "en",
      }}
    >
      <Inner
        orderId={effectiveOrderId}
        method={method}
        onSuccess={onSuccess}
        onError={onError}
        returnUrl={returnUrl}
      />
    </Elements>
  );
}
