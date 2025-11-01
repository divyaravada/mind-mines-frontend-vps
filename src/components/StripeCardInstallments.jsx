// src/components/StripeCardInstallments.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import {
  useStripeCardCreateInstallmentsMutation,
  useStripeCreateCardSetupIntentMutation,
} from "../features/payments/paymentsApi";
import {
  buildOrderPayload,
  buildShippingSnapshot,
  normalizeCountry,
} from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function Inner({
  months,
  form,
  items,
  couponCode,
  setLocalOrderId,
  onSuccess,
  totalFormatted,
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [createCardInstallments] = useStripeCardCreateInstallmentsMutation();

  const shippingSnapshot = useMemo(() => buildShippingSnapshot(form), [form]);

  const handleStartPlan = useCallback(async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    // 1. Save card as a reusable method via SetupIntent
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name:
                shippingSnapshot.first_name || shippingSnapshot.last_name
                  ? `${shippingSnapshot.first_name || ""} ${
                      shippingSnapshot.last_name || ""
                    }`.trim()
                  : undefined,
              address: {
                line1: shippingSnapshot.line1 || undefined,
                line2: shippingSnapshot.line2 || undefined,
                postal_code: shippingSnapshot.postal_code || undefined,
                city: shippingSnapshot.city || undefined,
                country: normalizeCountry(shippingSnapshot.country),
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

      // 2. Tell backend to create an installments plan / order
      const payload = buildOrderPayload({
        form,
        items,
        email: (form.email || "").trim(),
        couponCode,
        payment_method: "card_installments",
        extra: {
          months,
          payment_method_id,
        },
      });

      const res = await createCardInstallments(payload).unwrap();

      const orderId = res?.order_id;
      if (orderId) setLocalOrderId?.(orderId);

      onSuccess?.(orderId);
    } catch (e) {
      setErrorMsg(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
      return;
    }
  }, [
    stripe,
    elements,
    shippingSnapshot,
    form,
    items,
    couponCode,
    months,
    createCardInstallments,
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
  form,
  items,
  setLocalOrderId,
  onSuccess,
  total,
  couponCode,
}) {
  const { i18n } = useTranslation();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  // We'll request a SetupIntent client_secret (for card, not SEPA) when active
  const [createSetup] = useStripeCreateCardSetupIntentMutation();

  useEffect(() => {
    let cancelled = false;
    if (!active) return;
    setLoading(true);
    (async () => {
      try {
        const res = await createSetup({}).unwrap();
        if (!cancelled) {
          setClientSecret(
            res?.data?.clientSecret ||
              res?.clientSecret ||
              res?.client_secret ||
              ""
          );
        }
      } catch {
        if (!cancelled) setClientSecret("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, createSetup]);

  const appearance = useMemo(() => ({ theme: "stripe" }), []);
  const totalFormatted = useMemo(() => {
    return new Intl.NumberFormat(i18n.language || "en", {
      style: "currency",
      currency: "EUR",
    }).format(total);
  }, [i18n.language, total]);

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
              clientSecret, // SetupIntent client_secret
              appearance,
              locale: i18n.language === "de" ? "de" : "en",
            }}
          >
            <Inner
              months={months}
              form={form}
              items={items}
              couponCode={couponCode}
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
