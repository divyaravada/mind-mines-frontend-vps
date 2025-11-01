// src/components/StripeCard.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import { getCheckoutIdem } from "../utils/idempotency";
import { useStripeCreateIntentMutation } from "../features/payments/paymentsApi";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function CardInner({
  addressPayload,
  customerEmail,
  onSuccess,
  totalFormatted,
  getPendingOrderId,
}) {
  const { t } = useTranslation();
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

    // save last order id (for thank-you page) before leaving page for redirect methods
    try {
      const oid = getPendingOrderId?.();
      if (oid) {
        sessionStorage.setItem("last_order_id", String(oid));
      }
    } catch {}

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // this is REQUIRED for Klarna / Giropay / Sofort redirect
          return_url: `${window.location.origin}/checkout/return`,
          payment_method_data: {
            billing_details: {
              name: addressPayload?.first_name
                ? `${addressPayload.first_name} ${
                    addressPayload.last_name || ""
                  }`.trim()
                : undefined,
              email: customerEmail || addressPayload?.email || undefined,
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

      // If we didn't get redirected (pure card), handle success inline
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing" ||
          paymentIntent.status === "requires_capture")
      ) {
        onSuccess?.();
        return;
      }

      // fallback
      onSuccess?.();
    } catch {
      setErrorMsg(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
    }
  }, [
    stripe,
    elements,
    addressPayload,
    onSuccess,
    t,
    customerEmail,
    getPendingOrderId,
  ]);

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
              defaultValue: "Pay securely — {{total}}",
              total: totalFormatted,
            })}
      </button>
    </div>
  );
}

export default function StripeCard({
  active,
  setActive,
  backendItems,
  addressPayload,
  setLocalOrderId,
  getPendingOrderId,
  onSuccess,
  total,
  couponCode,
  couponInfo,
  customerEmail,
}) {
  const { i18n } = useTranslation();
  const [createIntent] = useStripeCreateIntentMutation();

  // local state we actually render
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  // cache so we don't create multiple Orders for tiny state changes
  const cachedOrderIdRef = useRef(null);
  const cachedClientSecretRef = useRef(null);

  // snapshot key to know if cart actually changed
  // If cart or total really changes, we DO want a new PI
  const snapshotKey = JSON.stringify({
    items: backendItems,
    total,
  });

  const lastSnapshotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // only run if user selected this method
    if (!active) return;

    // RULE:
    // - If we already created an order+PI for THIS cart snapshot, reuse it.
    if (
      lastSnapshotRef.current === snapshotKey &&
      cachedClientSecretRef.current &&
      cachedOrderIdRef.current
    ) {
      setClientSecret(cachedClientSecretRef.current);
      setLocalOrderId?.(cachedOrderIdRef.current);
      return;
    }

    // otherwise we need to create a new order + PI
    (async () => {
      setLoading(true);
      try {
        const normalizeCountry = (c) => {
          if (!c) return "DE";
          const up = ("" + c).trim();
          if (up.length === 2) return up.toUpperCase();
          const map = { Germany: "DE", Deutschland: "DE" };
          return map[up] || "DE";
        };

        const res = await createIntent({
          items: backendItems,
          payment_method: "card",
          ...addressPayload,
          country: normalizeCountry(addressPayload?.country),
          coupon_code: (couponCode || couponInfo?.code || "").trim(),
          email: (customerEmail || addressPayload?.email || "").trim(),
          idempotency_key: getCheckoutIdem(),
        }).unwrap();

        // normalize response
        const cs =
          res?.clientSecret ||
          res?.client_secret ||
          res?.data?.clientSecret ||
          res?.data?.client_secret ||
          "";
        const oid = res?.order_id || res?.data?.order_id || null;

        if (!cancelled) {
          // update live state
          setClientSecret(cs);
          setLocalOrderId?.(oid);

          // update cache
          cachedClientSecretRef.current = cs;
          cachedOrderIdRef.current = oid;
          lastSnapshotRef.current = snapshotKey;
        }
      } catch (e) {
        if (!cancelled) {
          setClientSecret("");
          const msg =
            e?.data?.detail ||
            e?.data?.error ||
            "Failed to initialize payment.";
          alert(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    active,
    snapshotKey, // only recreate intent if cart/total truly changed
    addressPayload,
    couponCode,
    couponInfo,
    customerEmail,
    createIntent,
    setLocalOrderId,
  ]);

  const appearance = useMemo(() => ({ theme: "stripe" }), []);
  const totalFormatted = useMemo(() => {
    try {
      return new Intl.NumberFormat(i18n.language || "en", {
        style: "currency",
        currency: "EUR",
      }).format(total);
    } catch {
      return `${Number(total || 0).toFixed(2)} €`;
    }
  }, [i18n.language, total]);

  // collapsed view (not active yet)
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
        <span className="flex-1">Card / Klarna / Giropay (Stripe)</span>
      </label>
    );
  }

  // expanded view
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
        <span className="flex-1">Card / Klarna / Giropay (Stripe)</span>
        <span className="text-xs">Visa · Mastercard · etc.</span>
      </label>

      {loading && (
        <div className="border rounded p-3 mt-2 text-sm text-gray-600">
          Initializing secure payment form…
        </div>
      )}

      {clientSecret && (
        <div className="mt-2">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
              locale: i18n.language?.startsWith("de") ? "de" : "en",
            }}
          >
            <CardInner
              addressPayload={addressPayload}
              customerEmail={customerEmail || addressPayload?.email}
              onSuccess={onSuccess}
              totalFormatted={totalFormatted}
              getPendingOrderId={() => cachedOrderIdRef.current}
            />
          </Elements>
        </div>
      )}
    </>
  );
}
