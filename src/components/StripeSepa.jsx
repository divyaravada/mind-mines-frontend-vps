// src/components/StripeSepa.jsx
import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getCheckoutIdem } from "../utils/idempotency";
import { useStripeCreateSepaIntentMutation } from "../features/payments/paymentsApi";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function SepaForm({
  backendItems,
  addressPayload,
  total,
  couponCode,
  couponInfo,
  onSuccess,
  setLocalOrderId,
  form,
  customerEmail,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [createSepaIntent] = useStripeCreateSepaIntentMutation();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [ibanComplete, setIbanComplete] = useState(false);
  const [ibanError, setIbanError] = useState("");

  const totalLabel = useMemo(() => {
    const n = Number(total || 0);
    try {
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(n);
    } catch {
      return `${n.toFixed(2)} €`;
    }
  }, [total]);

  const hasMinimalBilling = () => {
    const requiredFields = [
      form?.fullName,
      form?.email,
      addressPayload?.address_line1,
      addressPayload?.postal_code,
      addressPayload?.city,
      addressPayload?.country,
    ];
    return requiredFields.every((v) => (v || "").toString().trim().length > 0);
  };

  const pay = async () => {
    setErr("");
    if (!stripe || !elements) return;
    if (loading) return;
    if (!ibanComplete) {
      setErr("Please enter a valid IBAN.");
      return;
    }
    if (!hasMinimalBilling()) {
      setErr("Please fill delivery/contact details first.");
      return;
    }

    setLoading(true);
    try {
      // 1) create local order + SEPA PaymentIntent (pending)
      const res = await createSepaIntent({
        items: backendItems,
        payment_method: "sepa_debit",
        ...addressPayload,
        email: (customerEmail || form?.email || "").trim(),
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
        idempotency_key: getCheckoutIdem(),
      }).unwrap();

      const clientSecret =
        res.clientSecret ||
        res.client_secret ||
        res.data?.clientSecret ||
        res.data?.client_secret ||
        null;

      const orderId = res.order_id || res.data?.order_id || null;

      if (!clientSecret) throw new Error("Missing client secret from server.");
      setLocalOrderId?.(orderId);

      // 2) confirm SEPA mandate & payment
      const { error, paymentIntent } = await stripe.confirmSepaDebitPayment(
        clientSecret,
        {
          payment_method: {
            sepa_debit: elements.getElement(IbanElement),
            billing_details: {
              name: form?.fullName || "",
              email: form?.email || "",
              address: {
                line1: addressPayload?.address_line1 || "",
                postal_code: addressPayload?.postal_code || "",
                city: addressPayload?.city || "",
                country: (addressPayload?.country || "DE")
                  .slice(0, 2)
                  .toUpperCase(),
              },
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "SEPA payment failed.");
      }

      if (
        paymentIntent?.status === "processing" ||
        paymentIntent?.status === "succeeded"
      ) {
        try {
          await fetch("/api/payments/sepa-post-confirm/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderId,
              payment_intent_status: paymentIntent.status,
            }),
          });
        } catch (postErr) {
          console.warn("sepa-post-confirm failed", postErr);
        }
        onSuccess?.(orderId);
      } else {
        throw new Error(`SEPA status: ${paymentIntent?.status || "unknown"}`);
      }
    } catch (e) {
      setErr(e?.message || "SEPA payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border rounded p-3">
        <IbanElement
          options={{ supportedCountries: ["SEPA"] }}
          onChange={(event) => {
            setIbanComplete(event.complete === true);
            if (event.error && event.error.message) {
              setIbanError(event.error.message);
            } else {
              setIbanError("");
            }
          }}
        />
        <p className="text-xs text-gray-600 mt-2">
          By providing your IBAN and confirming this payment, you authorize
          MindMines and Stripe to debit your account in accordance with SEPA
          rules. You can request a refund within 8 weeks from the debit date.
        </p>
      </div>

      {ibanError && <div className="text-red-600 text-sm">{ibanError}</div>}
      {err && !ibanError && (
        <div className="text-red-600 text-sm">{String(err)}</div>
      )}

      <button
        onClick={pay}
        disabled={loading || !stripe || !ibanComplete || !hasMinimalBilling()}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing…" : `Pay by SEPA Direct Debit (${totalLabel})`}
      </button>
    </div>
  );
}

export default function StripeSepa(props) {
  const { active, addressPayload } = props;
  const cc = (addressPayload?.country || "DE").slice(0, 2).toUpperCase();
  const isDE = cc === "DE";

  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <span className="flex-1">
          Direct Bank Debit (SEPA){!isDE ? " — DE only" : ""}
        </span>
        <span className="text-xs">IBAN/BIC</span>
      </label>

      {active && isDE && (
        <div className="border rounded p-3">
          <Elements stripe={stripePromise} options={{ locale: "de" }}>
            <SepaForm {...props} />
          </Elements>
        </div>
      )}
    </>
  );
}
