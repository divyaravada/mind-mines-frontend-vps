//src/components/StripeSepa.jsx
import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  IbanElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import http from "../services/http";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

function SepaForm({
  lineItems,
  addressPayload,
  total,
  couponCode,
  couponInfo,
  onSuccess,
  setLocalOrderId,
  form,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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

  const pay = async () => {
    setErr("");
    if (!stripe || !elements) return;

    try {
      // 1) Ask backend to create local order + SEPA PaymentIntent
      const res = await http.post("payments/stripe/sepa/create-intent/", {
        items: lineItems,
        payment_method: "sepa_debit",
        ...addressPayload,
        coupon_code: (couponCode || couponInfo?.code || "").trim(),
      });
      const clientSecret = res?.data?.clientSecret;
      const orderId = res?.data?.order_id;
      if (!clientSecret) throw new Error("Missing client secret");

      setLocalOrderId?.(orderId);

      // 2) Confirm SEPA with IBAN + mandate acceptance
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
          // Mandate text is shown by Stripe automatically in the IbanElement flow
        }
      );

      if (error) throw error;
      // For SEPA, status will be 'processing' now. We rely on webhook to mark PAID later.
      if (
        paymentIntent?.status === "processing" ||
        paymentIntent?.status === "succeeded"
      ) {
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
        <IbanElement options={{ supportedCountries: ["SEPA"] }} />
        <p className="text-xs text-gray-600 mt-2">
          By providing your IBAN and confirming this payment, you are
          authorizing MindMines and Stripe, our payment service provider, to
          send instructions to your bank to debit your account in accordance
          with those instructions. You are entitled to a refund from your bank
          under the terms and conditions of your agreement with your bank. A
          refund must be claimed within 8 weeks starting from the date on which
          your account was debited.
        </p>
      </div>
      {err && <div className="text-red-600 text-sm">{String(err)}</div>}
      <button
        onClick={pay}
        disabled={loading || !stripe}
        className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60"
      >
        {loading ? "Processing…" : `Pay by SEPA Direct Debit (${totalLabel})`}
      </button>
    </div>
  );
}

export default function StripeSepa(props) {
  const { active, setActive } = props;
  const cc = (props.addressPayload?.country || "DE").slice(0, 2).toUpperCase();
  const isDE = cc === "DE";
  return (
    <>
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="sepa"
          checked={active && isDE}
          onChange={() => isDE && setActive?.()}
          disabled={!isDE}
        />
        <span className="flex-1">
          Direct Bank Transfer (SEPA){!isDE ? " — DE only" : ""}
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
