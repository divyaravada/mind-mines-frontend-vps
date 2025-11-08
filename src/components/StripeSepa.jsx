import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  useStripeCreateSepaIntentMutation,
  useSepaPostConfirmMutation,
} from "../features/payments/paymentsApi";
import { buildOrderPayload } from "../utils/orderPayload";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function pickErr(e, fallback) {
  return (
    e?.data?.detail ||
    e?.data?.error ||
    e?.error ||
    (typeof e === "string" ? e : "") ||
    fallback
  );
}

function SepaInner({ orderId, clientSecret, onSuccess }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [postConfirm] = useSepaPostConfirmMutation();
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
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
    } catch (e) {
      setErr(t("checkout.sepa.paymentError"));
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 mt-2 space-y-3">
      <PaymentElement />
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        disabled={!stripe || !elements || loading}
        onClick={handleConfirm}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60 text-sm"
      >
        {loading ? t("checkout.sepa.processing") : t("checkout.sepa.authorize")}
      </button>
      <p className="text-xs text-gray-500">
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
  const { t } = useTranslation();
  const [createSepaIntent] = useStripeCreateSepaIntentMutation();

  const radioLabel = t("checkout.sepa.radioLabel");
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
        const cs =
          res?.clientSecret ||
          res?.client_secret ||
          res?.data?.clientSecret ||
          res?.data?.client_secret ||
          "";
        const oid = res?.order_id || res?.data?.order_id || null;

        if (!cs || !oid) throw new Error("Incomplete Stripe init.");

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
  ]);

  if (!active) {
    return (
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="sepa_debit"
          checked={false}
          onChange={() => setActive?.("sepa_debit")}
        />
        <span className="flex-1">{radioLabel}</span>
      </label>
    );
  }

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="sepa_debit"
          checked
          onChange={() => setActive?.("sepa_debit")}
        />
        <span className="flex-1">{radioLabel}</span>
      </label>

      {loadingInit && (
        <div className="border rounded p-3 mt-2 text-sm text-gray-600">
          {t("checkout.sepa.preparing")}
        </div>
      )}

      {initErr && (
        <div className="border rounded p-3 mt-2 text-sm text-red-600">
          {initErr}
        </div>
      )}

      {clientSecret && orderId && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "stripe" },
            locale: "de",
          }}
        >
          <SepaInner
            clientSecret={clientSecret}
            orderId={orderId}
            onSuccess={onSuccess}
          />
        </Elements>
      )}
    </>
  );
}

