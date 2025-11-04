import { useEffect, useMemo, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import {
  buildOrderPayload,
  buildShippingSnapshot,
  normalizeCountry,
} from "../utils/orderPayload";
import { getCheckoutIdem } from "../utils/idempotency";
import { useStripeCreateIntentMutation } from "../features/payments/paymentsApi";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function InnerPay({
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

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      const oid = getPendingOrderId?.();
      if (oid) sessionStorage.setItem("last_order_id", String(oid));
    } catch {}

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/return`,
          payment_method_data: {
            billing_details: {
              name: `${shippingSnapshot.first_name || ""} ${
                shippingSnapshot.last_name || ""
              }`.trim(),
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
          error.message || t("checkout.cardError", "Payment failed.")
        );
        setProcessing(false);
        return;
      }

      if (
        paymentIntent &&
        ["succeeded", "processing", "requires_capture"].includes(
          paymentIntent.status
        )
      ) {
        onSuccess?.();
        return;
      }

      onSuccess?.();
    } catch {
      setErrorMsg(t("checkout.cardError", "Payment failed."));
      setProcessing(false);
    }
  };

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
          ? t("checkout.processing", "Processing…")
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
  form,
  items,
  couponCode,
  total,
  customerEmail,
  setLocalOrderId,
  getPendingOrderId,
  onSuccess,
}) {
  const { i18n } = useTranslation();
  const [createIntent] = useStripeCreateIntentMutation();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const cachedOrderIdRef = useRef(null);
  const cachedClientSecretRef = useRef(null);
  const lastCartSigRef = useRef(null);

  const cartSig = useMemo(() => {
    const norm = items.map((it) => ({ product_id: it.id, qty: it.qty }));
    norm.sort((a, b) =>
      a.product_id === b.product_id
        ? a.qty - b.qty
        : a.product_id - b.product_id
    );
    return JSON.stringify(norm);
  }, [items]);

  const shippingSnapshot = useMemo(() => buildShippingSnapshot(form), [form]);

  useEffect(() => {
    let cancelled = false;
    if (!active) return;

    if (
      cachedOrderIdRef.current &&
      cachedClientSecretRef.current &&
      lastCartSigRef.current === cartSig
    ) {
      setClientSecret(cachedClientSecretRef.current);
      setLocalOrderId?.(cachedOrderIdRef.current);
      return;
    }

    if (Number(total) <= 0) {
      setClientSecret("");
      setLocalOrderId?.(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const payload = buildOrderPayload({
          form,
          items,
          email: (customerEmail || form.email || "").trim(),
          couponCode,
          payment_method: "card", // server can switch to klarna/sofort/giropay later
          extra: { idempotency_key: getCheckoutIdem(cartSig) },
        });

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
          alert(
            e?.data?.detail || e?.data?.error || "Failed to initialize payment."
          );
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
    items,
    couponCode,
    customerEmail,
    total,
    createIntent,
    form,
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
        <span className="flex-1">
          Card / Klarna / Giropay / Sofort (Stripe)
        </span>
      </label>
    );
  }
  if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    console.error("Missing REACT_APP_STRIPE_PUBLISHABLE_KEY");
  }
  if (!stripePromise) {
    return (
      <div className="border rounded p-3 mt-2 text-sm text-red-600">
        Payment temporarily unavailable. Please reload or try again later.
      </div>
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
        <span className="flex-1">
          Card / Klarna / Giropay / Sofort (Stripe)
        </span>
        <span className="text-xs">Visa · Mastercard · etc.</span>
      </label>

      {loading && (
        <div className="border rounded p-3 mt-2 text-sm text-gray-600">
          Initializing secure payment form…
        </div>
      )}

      {clientSecret && stripePromise && (
        <div className="mt-2">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
              locale: i18n.language?.startsWith("de") ? "de" : "en",
            }}
          >
            <InnerPay
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
