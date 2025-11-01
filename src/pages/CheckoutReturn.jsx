// src/pages/CheckoutReturn.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Spinner } from "../components/Spinner"; // if you don't have Spinner just remove and show text
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

export default function CheckoutReturn() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("checking"); // "checking" | "succeeded" | "processing" | "failed"
  const [message, setMessage] = useState("");
  const [piId, setPiId] = useState("");

  useEffect(() => {
    (async () => {
      const clientSecret = searchParams.get("payment_intent_client_secret");
      const paymentIntentId = searchParams.get("payment_intent");
      setPiId(paymentIntentId || "");

      // safety: if no client secret, we just fallback to generic thank you
      if (!clientSecret) {
        setStatus("processing");
        setMessage(
          t("checkout.returnGeneric", {
            defaultValue:
              "Thank you. Your payment is being processed. You will receive an email shortly.",
          })
        );
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setStatus("processing");
        setMessage(
          t("checkout.returnGeneric", {
            defaultValue:
              "Thank you. Your payment is being processed. You will receive an email shortly.",
          })
        );
        return;
      }

      // Ask Stripe what happened
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(
        clientSecret
      );

      if (error) {
        setStatus("failed");
        setMessage(
          t("checkout.returnError", {
            defaultValue:
              "We couldn't verify the payment. Please check your email or contact support.",
          })
        );
        return;
      }

      // Interpret Stripe status
      switch (paymentIntent.status) {
        case "succeeded":
          setStatus("succeeded");
          setMessage(
            t("checkout.returnSuccess", {
              defaultValue:
                "Payment successful 🎉 Your order has been received.",
            })
          );
          break;
        case "processing":
        case "requires_capture":
          setStatus("processing");
          setMessage(
            t("checkout.returnProcessing", {
              defaultValue:
                "Thank you 🙌 Your payment is processing. You will receive a confirmation email soon.",
            })
          );
          break;
        case "requires_payment_method":
        default:
          setStatus("failed");
          setMessage(
            t("checkout.returnFailed", {
              defaultValue:
                "Payment failed or was canceled. You can try again.",
            })
          );
          break;
      }

      // Optional auto-forward to success/orders after a short delay
      // We'll try to show the user their order if we still have it.
      // We stored last order id in sessionStorage (we'll do that next step).
      const storedOrderId = sessionStorage.getItem("last_order_id");
      if (storedOrderId && paymentIntent.status !== "requires_payment_method") {
        // redirect to success page with order param
        setTimeout(() => {
          navigate(
            `/checkout/success?order=${encodeURIComponent(storedOrderId)}`
          );
        }, 3000);
      }
    })();
  }, [searchParams, t, navigate]);

  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center">
      <h1 className="text-2xl font-semibold mb-4">
        {status === "succeeded"
          ? t("checkout.returnTitleSuccess", {
              defaultValue: "Thank you for your order!",
            })
          : status === "failed"
          ? t("checkout.returnTitleFailed", {
              defaultValue: "Payment issue",
            })
          : t("checkout.returnTitleProcessing", {
              defaultValue: "Processing payment…",
            })}
      </h1>

      <p className="text-gray-700 mb-6">{message}</p>

      {piId && (
        <p className="text-xs text-gray-500 mb-6 break-all">
          Payment reference: {piId}
        </p>
      )}

      <div className="space-y-3">
        <Link
          to="/account/orders"
          className="block w-full border rounded py-2 text-center hover:bg-gray-50"
        >
          {t("checkout.viewOrders", {
            defaultValue: "View my orders",
          })}
        </Link>

        <Link
          to="/"
          className="block w-full border rounded py-2 text-center hover:bg-gray-50"
        >
          {t("checkout.backHome", { defaultValue: "Back to Home" })}
        </Link>
      </div>
    </div>
  );
}
