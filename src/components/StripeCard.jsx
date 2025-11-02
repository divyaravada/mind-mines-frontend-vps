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
import {
  buildOrderPayload,
  buildShippingSnapshot,
  normalizeCountry,
} from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

// -------- inner button / confirm flow --------
function CardInner({
  shippingSnapshot,
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

    // persist last order id for thank-you page
    try {
      const oid = getPendingOrderId?.();
      if (oid) {
        sessionStorage.setItem("last_order_id", String(oid));
      }
    } catch {
      /* ignore */
    }

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/return`,
          payment_method_data: {
            billing_details: {
              name:
                shippingSnapshot.first_name || shippingSnapshot.last_name
                  ? `${shippingSnapshot.first_name || ""} ${
                      shippingSnapshot.last_name || ""
                    }`.trim()
                  : undefined,
              email: customerEmail || undefined,
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

      // Treat succeeded / processing / requires_capture as success state
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing" ||
          paymentIntent.status === "requires_capture")
      ) {
        onSuccess?.();
        return;
      }

      onSuccess?.();
    } catch {
      setErrorMsg(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
    }
  }, [
    stripe,
    elements,
    shippingSnapshot,
    customerEmail,
    getPendingOrderId,
    onSuccess,
    t,
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

// -------- wrapper that calls backend /stripe/create-intent/ --------
export default function StripeCard({
  active,
  setActive,
  form, // checkout form state
  items, // [{id, qty, price, ...}]
  setLocalOrderId,
  getPendingOrderId,
  onSuccess,
  total,
  couponCode,
  customerEmail,
}) {
  const { i18n } = useTranslation();
  const [createIntent] = useStripeCreateIntentMutation();

  // UI state
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  // cache to avoid multiple orders for same cart
  const cachedOrderIdRef = useRef(null);
  const cachedClientSecretRef = useRef(null);
  const lastCartSigRef = useRef(null);

  // only product_id+qty defines cartSig
  const cartSig = useMemo(() => {
    const norm = items.map((it) => ({
      product_id: it.id,
      qty: it.qty,
    }));
    norm.sort((a, b) =>
      a.product_id === b.product_id
        ? a.qty - b.qty
        : a.product_id - b.product_id
    );
    return JSON.stringify(norm);
  }, [items]);

  // Get shipping snapshot once so we can use in billing_details + payload
  const shippingSnapshot = useMemo(() => buildShippingSnapshot(form), [form]);

  useEffect(() => {
    let cancelled = false;
    if (!active) return;

    // Reuse if cart signature is same
    if (
      cachedOrderIdRef.current &&
      cachedClientSecretRef.current &&
      lastCartSigRef.current === cartSig
    ) {
      setClientSecret(cachedClientSecretRef.current);
      setLocalOrderId?.(cachedOrderIdRef.current);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // Step 1: build unified payload
        const payload = buildOrderPayload({
          form,
          items,
          email: (customerEmail || form.email || "").trim(),
          couponCode,
          payment_method: "card",
          extra: {
            idempotency_key: getCheckoutIdem(),
          },
        });

        // Step 2: hit backend /stripe/create-intent/
        const res = await createIntent(payload).unwrap();

        const cs =
          res?.clientSecret ||
          res?.client_secret ||
          res?.data?.clientSecret ||
          res?.data?.client_secret ||
          "";
        const oid = res?.order_id || res?.data?.order_id || null;

        if (!cancelled) {
          setClientSecret(cs);
          setLocalOrderId?.(oid);

          cachedClientSecretRef.current = cs;
          cachedOrderIdRef.current = oid;
          lastCartSigRef.current = cartSig;
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
    cartSig,
    form,
    items,
    createIntent,
    customerEmail,
    couponCode,
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

  // collapsed radio (when not selected)
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

  // expanded content
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
              shippingSnapshot={shippingSnapshot}
              customerEmail={customerEmail || form.email}
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
