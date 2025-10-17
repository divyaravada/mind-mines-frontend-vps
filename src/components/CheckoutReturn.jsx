import { useEffect, useState } from "react";
import { useStripe } from "@stripe/react-stripe-js";

export default function CheckoutReturn() {
  const stripe = useStripe();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    (async () => {
      const clientSecret = new URLSearchParams(window.location.search).get(
        "payment_intent_client_secret"
      );
      if (!stripe || !clientSecret) return;

      const { paymentIntent } = await stripe.retrievePaymentIntent(
        clientSecret
      );
      setStatus(paymentIntent?.status || "unknown");
    })();
  }, [stripe]);

  if (status === "loading") return <div>Checking payment status…</div>;
  if (status === "succeeded") return <div>Payment successful! 🎉</div>;
  if (status === "processing") return <div>Payment processing…</div>;
  if (status === "requires_payment_method")
    return <div>Payment failed, please try another method.</div>;
  return <div>Status: {status}</div>;
}
