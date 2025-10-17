import { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import http from "../services/http";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function Inner({ clientSecret, orderId, addressPayload, onSuccess }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState("");

  const pay = useCallback(async () => {
    if (!stripe || !clientSecret) return;
    setProcessing(true);
    setErr("");

    try {
      const origin = window.location.origin;
      const returnUrl = `${origin}/checkout/return?orderId=${orderId}`;

      const { error } = await stripe.confirmGiropayPayment(clientSecret, {
        // giropay supports billing_details.name/email (recommended)
        payment_method_data: {
          billing_details: {
            name:
              [addressPayload?.first_name, addressPayload?.last_name]
                .filter(Boolean)
                .join(" ") || undefined,
            email: addressPayload?.email || undefined,
          },
        },
        return_url: returnUrl, // Stripe will redirect here after bank auth
      });

      if (error) {
        setErr(
          error.message ||
            t("checkout.cardError", { defaultValue: "Payment failed." })
        );
        setProcessing(false);
        return;
      }

      // For redirect methods, we won’t get a success synchronously.
      // After redirect & return, show status in the Return page.
    } catch (e) {
      setErr(t("checkout.cardError", { defaultValue: "Payment failed." }));
      setProcessing(false);
    }
  }, [stripe, clientSecret, orderId, addressPayload, t]);

  return (
    <div className="border rounded p-3 space-y-3">
      <p className="text-sm text-gray-700">
        You’ll be redirected to your bank via giropay to complete the payment.
      </p>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        disabled={!stripe || processing}
        onClick={pay}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {processing
          ? t("checkout.processing", { defaultValue: "Processing..." })
          : "Pay with giropay"}
      </button>
    </div>
  );
}

export default function StripeGiropay({
  active,
  setActive,
  lineItems,
  addressPayload,
  setLocalOrderId,
  total,
  onSuccess,
  country,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  // create the PaymentIntent server-side
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!active) return;
      setLoading(true);
      try {
        const res = await http.post("payments/stripe/giropay/create-intent/", {
          items: lineItems,
          ...addressPayload, // include country=DE so the backend can validate
          country: (addressPayload?.country || "DE").slice(0, 2).toUpperCase(),
        });
        if (!cancelled) {
          setClientSecret(res.data?.clientSecret || "");
          setOrderId(res.data?.order_id || null);
          setLocalOrderId?.(res.data?.order_id);
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
  }, [active, JSON.stringify(lineItems), addressPayload, setLocalOrderId]);

  const appearance = useMemo(() => ({ theme: "stripe" }), []);

  if (!active) {
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="giropay"
          checked={false}
          onChange={() => setActive?.("giropay")}
        />
        <span className="flex-1">giropay (German banks)</span>
      </label>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="giropay"
          checked
          onChange={() => setActive?.("giropay")}
        />
        <span className="flex-1">giropay (German banks)</span>
        <span className="text-xs">Redirect to bank</span>
      </label>

      {loading && (
        <div className="border rounded p-3 mt-2 text-sm text-gray-600">
          Initializing giropay…
        </div>
      )}

      {clientSecret && (
        <div className="mt-2">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance }}
          >
            <Inner
              clientSecret={clientSecret}
              orderId={orderId}
              addressPayload={addressPayload}
              onSuccess={onSuccess}
            />
          </Elements>
        </div>
      )}
    </>
  );
}
