// components/StripeCardSimple.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import { useStripeCreateIntentMutation } from "../features/payments/paymentsApi";
import { useUpdatePaymentStatusMutation } from "../features/orders/ordersApi";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function PayForm({
  clientSecret,
  orderId,
  billing,
  onSuccess,
  onStatusUpdate,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const confirm = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/return`,
        payment_method_data: {
          billing_details: {
            name: billing.name || undefined,
            email: billing.email || undefined,
            address: {
              line1: billing.line1 || undefined,
              line2: billing.line2 || undefined,
              postal_code: billing.postal_code || undefined,
              city: billing.city || undefined,
              country: billing.country || undefined,
            },
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message || t("checkout.paymentFailed"));
      setProcessing(false);
      return;
    }

    // Optional echo to backend (webhook is the source of truth).
    if (paymentIntent && orderId) {
      onStatusUpdate?.({
        orderId,
        intentId: paymentIntent.id,
        status: paymentIntent.status,
      });
    }

    onSuccess?.();
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}
      <button
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
        onClick={confirm}
        disabled={!stripe || !elements || processing}
      >
        {processing
          ? t("checkout.processingPayment")
          : t("checkout.paySecurely")}
      </button>
    </div>
  );
}

export default function StripeCardSimple({ orderPayload, onSuccess, onInit }) {
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [createIntent] = useStripeCreateIntentMutation();
  const [updatePaymentStatus] = useUpdatePaymentStatusMutation();

  const handleStatusUpdate = useCallback(
    async ({ orderId: id, intentId, status }) => {
      if (!id || !intentId) return;
      try {
        await updatePaymentStatus({
          id,
          intent_id: intentId,
          payment_status: status,
        }).unwrap();
      } catch {
        /* no-op: webhook remains source of truth */
      }
    },
    [updatePaymentStatus]
  );

  // Guard: don’t try init without the minimum
  const hasMinimum =
    orderPayload &&
    orderPayload.email &&
    Array.isArray(orderPayload.items) &&
    orderPayload.items.length > 0 &&
    orderPayload.shipping &&
    orderPayload.shipping.first_name !== undefined;

  const billing = useMemo(() => {
    const s = orderPayload?.shipping || {};
    return {
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim(),
      email: orderPayload?.email || "",
      line1: s.line1 || "",
      line2: s.line2 || "",
      postal_code: s.postal_code || "",
      city: s.city || "",
      country: (s.country || "DE").toUpperCase(),
    };
  }, [orderPayload]);

  useEffect(() => {
    let active = true;
    if (!hasMinimum) {
      setClientSecret("");
      setOrderId(null);
      return undefined;
    }

    (async () => {
      setLoading(true);
      try {
        const data = await createIntent({
          email: orderPayload.email,
          payment_method: orderPayload.payment_method || "card",
          coupon_code: orderPayload.coupon_code || "",
          idempotency_key: orderPayload.idempotency_key || "",
          items: orderPayload.items,
          shipping: orderPayload.shipping,
        }).unwrap();

        if (active) {
          setClientSecret(data?.clientSecret || data?.client_secret || "");
          setOrderId(data?.order_id || null);
          if (typeof onInit === "function" && data?.order_id) {
            onInit(data.order_id);
          }
        }
      } catch (err) {
        console.error("Stripe init error:", err);
        if (active) {
          setClientSecret("");
          setOrderId(null);
        }
        const detail =
          err?.data?.detail ||
          (typeof err?.error === "string" ? err.error : null) ||
          (typeof err?.message === "string" ? err.message : null) ||
          t("checkout.initFailed");
        let message = detail;
        const errors = err?.data?.errors;
        if (errors && typeof errors === "object") {
          const lines = Object.entries(errors).map(([k, v]) => {
            const text = Array.isArray(v) ? v.join(", ") : String(v);
            return `${k}: ${text}`;
          });
          message = `${detail}\n\n${lines.join("\n")}`;
        }
        alert(message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [createIntent, hasMinimum, onInit, orderPayload, t]);

  if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    return <div className="text-red-600">{t("checkout.missingKey")}</div>;
  }
  if (!hasMinimum) return null;
  if (loading) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-gray-600">
        {t("checkout.initializingPayment")}
      </div>
    );
  }
  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <PayForm
        clientSecret={clientSecret}
        orderId={orderId}
        billing={billing}
        onSuccess={onSuccess}
        onStatusUpdate={handleStatusUpdate}
      />
    </Elements>
  );
}
