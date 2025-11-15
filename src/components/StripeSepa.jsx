//src/components/StripeSepa.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";
import {
  useStripeCreateSepaIntentMutation,
  useSepaPostConfirmMutation,
} from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

const pickErr = (e, fb) =>
  e?.data?.detail ||
  e?.data?.error ||
  e?.error ||
  (typeof e === "string" ? e : "") ||
  fb;

function SepaInner({ orderId, onSuccess }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [postConfirm] = useSepaPostConfirmMutation();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setErr("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        setErr(error.message || t("checkout.sepa.paymentFailed"));
        setLoading(false);
        return;
      }
      const status = paymentIntent?.status || "processing";
      await postConfirm({
        order_id: orderId,
        payment_intent_status: status,
      }).unwrap();
      onSuccess?.(orderId);
    } catch {
      setErr(t("checkout.sepa.paymentError"));
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 mt-2 space-y-3 bg-white dark:bg-marbleblack">
      <PaymentElement />
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        disabled={!stripe || !elements || loading}
        onClick={handleConfirm}
        className="w-full py-3 rounded-lg font-semibold text-sm
                   bg-backnewswhite text-marblewhite hover:opacity-90
                   disabled:opacity-60"
      >
        {loading ? t("checkout.sepa.processing") : t("checkout.sepa.authorize")}
      </button>
      <p className="text-xs text-gray-600 dark:text-gray-300">
        {t("checkout.sepa.notice")}
      </p>
    </div>
  );
}

export default function StripeSepa({
  active,
  setActive,
  form,
  items,
  couponCode,
  total,
  customerEmail,
  onSuccess,
  setLocalOrderId,
}) {
  const { t, i18n } = useTranslation();
  const [createSepaIntent] = useStripeCreateSepaIntentMutation();
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loadingInit, setLoadingInit] = useState(false);
  const [initErr, setInitErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!active) return;
    if (Number(total) <= 0) {
      setInitErr(t("checkout.sepa.cartZero"));
      return;
    }
    (async () => {
      setLoadingInit(true);
      setInitErr("");
      try {
        const payload = buildOrderPayload({
          form,
          items,
          email: (customerEmail || form.email || "").trim(),
          couponCode,
          payment_method: "sepa_debit",
        });
        const res = await createSepaIntent(payload).unwrap();
        const cs = res?.clientSecret || res?.client_secret || "";
        const oid = res?.order_id || null;
        if (!cs || !oid) throw new Error(t("checkout.sepa.initFailed"));
        if (!cancelled) {
          setClientSecret(cs);
          setOrderId(oid);
          setLocalOrderId?.(oid);
        }
      } catch (e) {
        if (!cancelled) setInitErr(pickErr(e, t("checkout.sepa.initFailed")));
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    active,
    total,
    form,
    items,
    couponCode,
    customerEmail,
    createSepaIntent,
    setLocalOrderId,
    t,
  ]);

  const isDark = document.documentElement.classList.contains("dark");
  const appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#855513",
      colorText: isDark ? "#e5e7eb" : "#1f2937",
      colorBackground: isDark ? "#17160f" : "#f8fcfe",
    },
  };

  if (!active) {
    return (
      <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 bg-white dark:bg-marbleblack">
        <input
          type="radio"
          name="payment"
          value="sepa_debit"
          checked={false}
          onChange={() => setActive?.("sepa_debit")}
        />
        <span className="flex-1">{t("checkout.sepa.radioLabel")}</span>
      </label>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 bg-white dark:bg-marbleblack">
        <input
          type="radio"
          name="payment"
          value="sepa_debit"
          checked
          onChange={() => setActive?.("sepa_debit")}
        />
        <span className="flex-1">{t("checkout.sepa.radioLabel")}</span>
      </label>

      {loadingInit && (
        <div className="border rounded-lg p-3 mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-marbleblack">
          {t("checkout.sepa.preparing")}
        </div>
      )}

      {initErr && (
        <div className="border rounded-lg p-3 mt-2 text-sm text-red-600 bg-white dark:bg-marbleblack">
          {initErr}
        </div>
      )}

      {clientSecret && orderId && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance,
            locale: i18n.language?.startsWith("de") ? "de" : "en",
          }}
        >
          <SepaInner orderId={orderId} onSuccess={onSuccess} />
        </Elements>
      )}
    </>
  );
}
