import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

export default function CheckoutReturn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("checking"); // checking | succeeded | processing | failed
  const [message, setMessage] = useState("");
  const [piId, setPiId] = useState("");

  useEffect(() => {
    (async () => {
      const clientSecret = searchParams.get("payment_intent_client_secret");
      const paymentIntentId = searchParams.get("payment_intent");
      setPiId(paymentIntentId || "");

      if (!clientSecret) {
        setStatus("processing");
        setMessage(t("checkout.returnGeneric"));
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setStatus("processing");
        setMessage(t("checkout.returnGeneric"));
        return;
      }

      const { paymentIntent, error } = await stripe.retrievePaymentIntent(
        clientSecret
      );

      if (error) {
        setStatus("failed");
        setMessage(t("checkout.returnError"));
        return;
      }

      switch (paymentIntent.status) {
        case "succeeded":
          setStatus("succeeded");
          setMessage(t("checkout.returnSuccess"));
          break;
        case "processing":
        case "requires_capture":
          setStatus("processing");
          setMessage(t("checkout.returnProcessing"));
          break;
        case "requires_payment_method":
        default:
          setStatus("failed");
          setMessage(t("checkout.returnFailed"));
          break;
      }

      const storedOrderId = sessionStorage.getItem("last_order_id");
      if (storedOrderId && paymentIntent.status !== "requires_payment_method") {
        setTimeout(() => {
          navigate(
            `/checkout/success?order=${encodeURIComponent(storedOrderId)}`
          );
        }, 3000);
      }
    })();
  }, [searchParams, t, navigate]);

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-center bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-8">
          <h1 className="text-2xl font-semibold mb-4">
            {status === "succeeded"
              ? t("checkout.returnTitleSuccess")
              : status === "failed"
              ? t("checkout.returnTitleFailed")
              : t("checkout.returnTitleProcessing")}
          </h1>

          <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>

          {piId && (
            <p className="text-xs text-gray-500 mb-6 break-all">
              {t("checkout.paymentReference", { id: piId })}
            </p>
          )}

          <div className="space-y-3">
            <Link
              to="/account/orders"
              className="block w-full border dark:border-neutral-700 rounded-lg py-2 text-center hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("checkout.viewOrders")}
            </Link>

            <Link
              to="/"
              className="block w-full border dark:border-neutral-700 rounded-lg py-2 text-center hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t("checkout.backHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
